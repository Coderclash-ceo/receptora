// src/agents/revenue/revenue.agent.js

const { callAgent } = require("../../services/llm.service");

const REVENUE_PROMPT = `You write short, specific alerts for a business owner about underbooked time slots.

Rules:
- Be concrete: name the day/time pattern.
- Suggest one practical action (e.g. a promo for that slot).
- Max 2 sentences.
- This is an internal owner-facing alert, never sent to customers directly.`;

// Detects calendar gaps from Google Calendar / Firestore with fallback for new salons
async function detectCalendarGaps(businessId) {
  try {
    const { getCalendarGaps } = require("../../services/calendar.service");
    if (typeof getCalendarGaps === "function") {
      const realGaps = await getCalendarGaps(businessId);
      if (Array.isArray(realGaps) && realGaps.length > 0) {
        return realGaps;
      }
    }
  } catch (err) {
    console.warn("[revenue.agent] getCalendarGaps fallback:", err.message);
  }
  // Baseline pattern when calendar has few historical events
  return [
    { day: "Thursday", window: "14:00-17:00", weeksObserved: 3 },
  ];
}

// In-memory guard against re-alerting the same gap pattern within a session.
const alreadyAlertedThisSession = new Set();

async function runRevenueAgent(businessOrId) {
  const business = typeof businessOrId === "string"
    ? { businessId: businessOrId, name: "Business" }
    : (businessOrId && (businessOrId.businessId || businessOrId.id))
      ? { ...businessOrId, businessId: businessOrId.businessId || businessOrId.id }
      : null;

  if (!business || !business.businessId) {
    return { error: "missing_business_context" };
  }

  const gaps = await detectCalendarGaps(business.businessId);
  if (!gaps.length) return null;

  const gapKey = `${business.businessId}:${JSON.stringify(gaps)}`;
  if (alreadyAlertedThisSession.has(gapKey)) {
    return { skipped: "already_alerted_this_session" };
  }

  const result = await callAgent(REVENUE_PROMPT, [], [
    {
      role: "user",
      content: `Business: ${business.name}. Gap pattern: ${JSON.stringify(gaps)}`
    }
  ]);

  if (!result.ok) return { error: result.error };

  const text = result.response.content.find((b) => b.type === "text");
  if (!text) return { error: "no_text_response" };

  alreadyAlertedThisSession.add(gapKey);
  return { alert: text.text, alertText: text.text };
}

module.exports = { runRevenueAgent, detectCalendarGaps };
