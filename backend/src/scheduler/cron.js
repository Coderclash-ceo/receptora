const cron = require("node-cron");
const { createLogger } = require("../utils/logger");
const { getAllBusinesses, saveRevenueAlert, logRetentionSend } = require("../services/firestore.service");
const { runRetentionAgent } = require("../agents/retention/retention.agent");
const { runRevenueAgent } = require("../agents/revenue/revenue.agent");

const log = createLogger("cron");

const USE_TEST_SCHEDULE = process.env.CRON_TEST_MODE === "true";

// --- Daily Revenue Agent Job (9:00 AM IST) ---
async function runRevenueJob() {
  log.info("Starting 9:00 AM Revenue Agent job...");
  try {
    const businesses = await getAllBusinesses();
    for (const business of businesses) {
      try {
        log.info(`Running Revenue Agent for business: ${business.id}`);
        const res = await runRevenueAgent(business.id);
        const alertText = res?.alertText || res?.alert || res?.message;

        if (alertText) {
          await saveRevenueAlert(business.id, alertText);
          log.info(`Saved revenue alert for business ${business.id}: "${alertText}"`);
        } else {
          log.info(`No revenue alert generated for business ${business.id}`);
        }
      } catch (bizErr) {
        log.error(`Revenue Agent failed for business ${business.id}:`, bizErr.message);
      }
    }
  } catch (err) {
    log.error("Error fetching businesses for Revenue Agent job:", err.message);
  }
}

// --- Daily Retention Agent Job (10:00 AM IST) ---
async function runRetentionJob() {
  log.info("Starting 10:00 AM Retention Agent job...");
  try {
    const businesses = await getAllBusinesses();
    for (const business of businesses) {
      try {
        log.info(`Running Retention Agent for business: ${business.id}`);
        const res = await runRetentionAgent(business.id);
        const sentItems = res?.messagesSent || res?.sentMessages || (Array.isArray(res) ? res : []);

        for (const item of sentItems) {
          // Prevent double-logging: retention.agent logs directly upon successful WhatsApp dispatch.
          // Only log here if the message was sent and not already logged by the agent.
          if (item.sent === true) {
            if (!item.logged) {
              await logRetentionSend(business.id, item.customerId || "unknown", item.messageText || item.message || "");
              item.logged = true;
              log.info(`Logged retention send for business ${business.id}, customer ${item.customerId}`);
            } else {
              log.info(`Retention send for customer ${item.customerId} already recorded by retention agent; skipped duplicate log.`);
            }
          }
        }
      } catch (bizErr) {
        log.error(`Retention Agent failed for business ${business.id}:`, bizErr.message);
      }
    }
  } catch (err) {
    log.error("Error fetching businesses for Retention Agent job:", err.message);
  }
}

function startScheduler() {
  if (USE_TEST_SCHEDULE) {
    log.info("running in TEST mode - jobs execute every minute");
    cron.schedule(
      "* * * * *",
      () => {
        runRevenueJob().catch((err) => log.error("Test Revenue Job error:", err.message));
        runRetentionJob().catch((err) => log.error("Test Retention Job error:", err.message));
      },
      { timezone: "Asia/Kolkata" }
    );
  } else {
    log.info("running in PRODUCTION mode - 9:00 AM & 10:00 AM IST jobs scheduled");
    // 9:00 AM IST - Revenue Agent
    cron.schedule(
      "0 9 * * *",
      () => {
        runRevenueJob().catch((err) => log.error("Revenue Job error:", err.message));
      },
      { timezone: "Asia/Kolkata" }
    );

    // 10:00 AM IST - Retention Agent
    cron.schedule(
      "0 10 * * *",
      () => {
        runRetentionJob().catch((err) => log.error("Retention Job error:", err.message));
      },
      { timezone: "Asia/Kolkata" }
    );
  }
}

module.exports = { startScheduler, runRevenueJob, runRetentionJob };
