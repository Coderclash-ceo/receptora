// src/agents/onboarding/onboarding.agent.js

const { callAgent } = require("../../services/llm.service");

const ONBOARDING_PROMPT = `Extract structured business information from the text provided.

Respond with ONLY valid JSON, no other text, in exactly this shape:

{
  "services": [{ "name": string, "price": number|null }],
  "hours": {
    "mon": string|null,
    "tue": string|null,
    "wed": string|null,
    "thu": string|null,
    "fri": string|null,
    "sat": string|null,
    "sun": string|null
  }
}

Each day's value should be the hours (e.g. "10:00 AM - 8:00 PM") or
"closed" if that day is explicitly closed. If a range like "Mon-Fri" is
given, apply the same hours to each individual day - never group days
into a single field, since some days may have exceptions (e.g. "open
daily except Tuesday" means every day gets the same hours EXCEPT tue,
which gets "closed").

If a field cannot be determined, use null.
Never invent a price or hour that isn't stated or clearly implied.`;

async function runOnboardingAgent(rawText) {
  if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
    return { error: "missing_input" };
  }

  const result = await callAgent(
    ONBOARDING_PROMPT,
    [],
    [{ role: "user", content: rawText }]
  );

  if (!result.ok) {
    return { error: result.error };
  }

  const text = result.response.content.find(
    (b) => b.type === "text"
  );

  if (!text) {
    return { error: "no_text_response" };
  }

  try {
    const cleaned = text.text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    return {
      error: "invalid_json",
      raw: text.text
    };
  }
}

// Synchronous heuristic extractor for POST /api/settings/onboard Express route
function extract(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return { name: null, services: [], hours: null };
  }

  const text = rawText.toLowerCase();

  // 1. Extract Business Name
  let name = "Salon Business";
  const nameMatch =
    rawText.match(/(?:welcome to|parlor hai|parlor|studio|salon|spa|is)\s+([A-Z][A-Za-z0-9\s]{2,25})/i) ||
    rawText.match(/^([A-Z][A-Za-z0-9\s]{2,25})\./);
  if (nameMatch && nameMatch[1]) {
    name = nameMatch[1].trim();
  }

  // 2. Extract Services
  const services = [];
  const knownKeywords = [
    "haircut",
    "facial",
    "hair color",
    "color",
    "manicure",
    "pedicure",
    "beard trim",
    "trim",
    "massage",
    "spa",
    "cleanup",
  ];

  for (const kw of knownKeywords) {
    if (text.includes(kw)) {
      const pattern = new RegExp(`${kw}[^\\d]*(\\d{2,5})[^\\d]*(\\d{1,3})\\s*(?:min|mins|minutes)?`, "i");
      const match = text.match(pattern);
      if (match) {
        services.push({
          name: kw,
          price: parseInt(match[1], 10),
          durationMin: parseInt(match[2], 10),
        });
      } else {
        const priceMatch = text.match(new RegExp(`${kw}[^\\d]*(\\d{2,5})`, "i"));
        if (priceMatch) {
          services.push({
            name: kw,
            price: parseInt(priceMatch[1], 10),
            durationMin: 30,
          });
        }
      }
    }
  }

  // 3. Extract Hours (individual per-day keys)
  const hours = {};
  if (text.includes("mon-sat") || text.includes("monday to saturday")) {
    hours["mon"] = "10:00-20:00";
    hours["tue"] = "10:00-20:00";
    hours["wed"] = "10:00-20:00";
    hours["thu"] = "10:00-20:00";
    hours["fri"] = "10:00-20:00";
    hours["sat"] = "10:00-20:00";
    hours["sun"] = "closed";
  } else if (text.includes("mon-fri") || text.includes("monday to friday")) {
    hours["mon"] = "10:00-19:00";
    hours["tue"] = "10:00-19:00";
    hours["wed"] = "10:00-19:00";
    hours["thu"] = "10:00-19:00";
    hours["fri"] = "10:00-19:00";
    hours["sat"] = text.includes("sat") ? "11:00-17:00" : "closed";
    hours["sun"] = text.includes("sun") ? "11:00-17:00" : "closed";
  } else {
    hours["mon"] = "10:00-20:00";
    hours["tue"] = "10:00-20:00";
    hours["wed"] = "10:00-20:00";
    hours["thu"] = "10:00-20:00";
    hours["fri"] = "10:00-20:00";
    hours["sat"] = "10:00-20:00";
    hours["sun"] = "closed";
  }

  // If garbage text with no services or business context, return empty/invalid shape
  if (services.length === 0 && !text.includes("salon") && !text.includes("parlor") && !text.includes("spa")) {
    return { name: null, services: null, hours: null };
  }

  return { name, services, hours };
}

module.exports = { runOnboardingAgent, ONBOARDING_PROMPT, extract };