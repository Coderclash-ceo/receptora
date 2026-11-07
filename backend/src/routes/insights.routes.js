const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const { runInsightAgent } = require("../agents/insight/insight.agent");
const { createLogger } = require("../utils/logger");

const log = createLogger("insights.routes");

// SINGLE-INSTANCE ONLY: In a multi-instance production environment,
// this in-memory cache should be replaced with a distributed store like Redis.
const cache = new Map(); // businessId -> { report, cachedAt }
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL

router.use(authMiddleware);

// GET /api/insights
router.get("/", async (req, res) => {
  try {
    const { businessId } = req;
    const forceRefresh = req.query.refresh === "true";
    const now = Date.now();

    if (!forceRefresh && cache.has(businessId)) {
      const entry = cache.get(businessId);
      if (now - entry.cachedAt < CACHE_TTL_MS) {
        log.info(`Serving cached insights for business ${businessId}`);
        return res.json(entry.report);
      }
    }

    log.info(`Generating fresh insights for business ${businessId}`);
    const report = await runInsightAgent(businessId);

    // Validate required keys before responding or caching
    const requiredKeys = ["totalBookingsThisMonth", "busiestHour", "atRiskCustomerCount", "headline"];
    for (const key of requiredKeys) {
      if (report[key] === undefined || report[key] === null) {
        log.error(`Malformed insight report for ${businessId}: missing '${key}'`);
        return res.status(502).json({ error: `Insight report missing required field: ${key}` });
      }
    }

    cache.set(businessId, { report, cachedAt: now });
    return res.json(report);
  } catch (err) {
    log.error("GET / error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/insights/campaign - Launch Revenue Agent promo campaign to at-risk clients
router.post("/campaign", async (req, res) => {
  try {
    const { promoCode = "SAVE15", discount = 15, message: customMessage } = req.body || {};
    const { getInactiveCustomers, appendMessage, setDoc, logRetentionSend, queryCollection, getDoc } = require("../services/firestore.service");

    const business = await getDoc("businesses", req.businessId);
    const salonName = business?.name || "our salon";

    // Target inactive customers (>25 days)
    let targets = await getInactiveCustomers(req.businessId, 25, 120);
    if (!targets || targets.length === 0) {
      const allCust = await queryCollection("customers", req.businessId);
      targets = allCust.slice(0, 3);
    }

    const promoText = customMessage || `Special offer from ${salonName}! Book your slot this Thursday 2:00 PM – 5:00 PM with code ${promoCode} to get ${discount}% OFF your service! Reply here to claim your spot ✨`;

    const dispatched = [];
    for (const customer of targets) {
      const convId = (customer.phone && customer.phone.replace(/[^0-9]/g, "")) || customer.id;
      await appendMessage(req.businessId, convId, {
        role: "assistant",
        text: `[Revenue Promo: ${promoCode}] ${promoText}`,
      });
      await setDoc("conversations", req.businessId, convId, {
        customerName: customer.name,
        channel: "whatsapp",
        lastUpdated: new Date().toISOString(),
      });
      await logRetentionSend(req.businessId, customer.id, promoText);
      dispatched.push({ id: customer.id, name: customer.name, phone: customer.phone });
    }

    return res.json({
      success: true,
      promoCode,
      dispatchedCount: dispatched.length,
      dispatchedCustomers: dispatched,
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    log.error("POST /campaign error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

