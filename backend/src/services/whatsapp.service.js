// src/services/whatsapp.service.js
// WhatsApp Cloud API messaging service (Meta Cloud API)

const BASE = (phoneId) =>
  `https://graph.facebook.com/v20.0/${phoneId || process.env.WHATSAPP_PHONE_NUMBER_ID || ""}/messages`;

function getFetch() {
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch;
  }
  return require("node-fetch");
}

async function sendMessage(to, text, options = {}) {
  if (!to || !text) {
    return { ok: false, error: "missing_destination_or_text" };
  }

  const cleanTo = String(to).replace(/\D/g, "");
  const phoneId = options.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const token = options.token || process.env.WHATSAPP_TOKEN;

  if (!token) {
    console.warn(`[whatsapp.service] Cannot dispatch live message to ${cleanTo}: No Meta WHATSAPP_TOKEN configured.`);
    return {
      ok: false,
      error: "missing_whatsapp_token",
      message: "Meta Graph API Access Token (WHATSAPP_TOKEN) is not set. Please provide your Meta token in settings or .env to deliver to real phone numbers.",
    };
  }

  const fetchFn = getFetch();

  try {
    const url = BASE(phoneId);
    console.log(`[whatsapp.service] Dispatching WhatsApp message to ${cleanTo} via Meta Phone ID ${phoneId}...`);

    const res = await fetchFn(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleanTo,
        type: "text",
        text: { body: text },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[whatsapp.service] Meta Cloud API send failed:", JSON.stringify(data));
      return { ok: false, error: data };
    }

    console.log(`[whatsapp.service] Successfully delivered WhatsApp message to ${cleanTo}! Message ID:`, data.messages?.[0]?.id);
    return { ok: true, id: data.messages?.[0]?.id };
  } catch (err) {
    console.error("[whatsapp.service] network/service error:", err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendMessage };
