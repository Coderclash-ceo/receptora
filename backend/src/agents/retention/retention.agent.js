// src/agents/retention/retention.agent.js

const { callAgent } = require("../../services/llm.service");

const RETENTION_PROMPT = `You write short, warm WhatsApp win-back messages for a local service business.

Rules:
- Mention the customer's name and their last service if known.
- No discount promises unless explicitly told to include one.
- One short paragraph, no more than 3 sentences.
- Do not sound like a mass marketing blast - make it feel personal.`;

// In-memory guard against duplicate sends within the same run/session.
// Session-level in-memory guard against repeat sends within the same execution run.
const alreadySentThisSession = new Set();

async function runRetentionAgent(businessOrId, options = {}) {
  const business = typeof businessOrId === "string"
    ? { businessId: businessOrId, name: "Business" }
    : (businessOrId && (businessOrId.businessId || businessOrId.id))
      ? { ...businessOrId, businessId: businessOrId.businessId || businessOrId.id }
      : null;

  if (!business || !business.businessId) {
    return [{ error: "missing_business_context" }];
  }

  const { getInactiveCustomers } = require("../../services/firestore.service");
  const minDays = options.minDays !== undefined ? options.minDays : 25;
  const maxDays = options.maxDays !== undefined ? options.maxDays : 90;
  const customers = await getInactiveCustomers(business.businessId, minDays, maxDays);
  const drafts = [];

  for (const customer of customers) {
    const sessionKey = `${business.businessId}:${customer.id}`;
    if (alreadySentThisSession.has(sessionKey)) {
      drafts.push({ customerId: customer.id, message: null, messageText: null, skipped: "already_sent_this_session" });
      continue;
    }

    const result = await callAgent(RETENTION_PROMPT, [], [
      {
        role: "user",
        content: `Customer: ${customer.name}, last service: ${customer.lastService || "unknown"}, business: ${business.name}`
      }
    ]);

    if (result.ok) {
      const text = result.response.content.find((b) => b.type === "text");
      const message = text ? text.text : null;
      const entry = { customerId: customer.id, message, messageText: message };

      // Dispatch message when customer has phone number and draftOnly is not requested
      // Dispatches message when customer has phone number and draftOnly is not requested
      if (customer.phone && message && !options.draftOnly) {
        try {
          const { sendMessage } = require("../../services/whatsapp.service");
          if (typeof sendMessage === "function") {
            const sendResult = await sendMessage(customer.phone, message);
            entry.sent = sendResult.ok === true;
            if (sendResult.id) entry.messageId = sendResult.id;
            if (sendResult.error) entry.sendError = sendResult.error;
          }
        } catch (err) {
          console.error("[retention.agent] sendMessage failed:", err.message);
          entry.sent = false;
          entry.sendError = err.message;
        }

        // Record send in Firestore retention logs
        try {
          const firestoreService = require("../../services/firestore.service");
          if (typeof firestoreService.logRetentionSend === "function") {
            await firestoreService.logRetentionSend(business.businessId, {
              customerId: customer.id,
              message,
              sentAt: new Date().toISOString(),
            });
            entry.logged = true;
          }
        } catch (err) {
          console.error("[retention.agent] logRetentionSend failed:", err.message);
          entry.logged = false;
        }
      }

      drafts.push(entry);
      alreadySentThisSession.add(sessionKey);
    } else {
      drafts.push({ customerId: customer.id, message: null, error: result.error });
    }
  }

  return drafts;
}

module.exports = { runRetentionAgent, alreadySentThisSession };
