// src/services/instagram.service.js
// Sends text replies to Instagram users via Instagram Graph API.

const GRAPH_BASE = () =>
  process.env.INSTAGRAM_GRAPH_BASE || "https://graph.instagram.com/v21.0";

const MAX_BYTES = 1000; // Instagram message limit

function getFetch() {
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch;
  }
  return require("node-fetch");
}

function fitToLimit(text) {
  if (Buffer.byteLength(text, "utf8") <= MAX_BYTES) return text;
  let cut = text;
  while (Buffer.byteLength(cut + "...", "utf8") > MAX_BYTES) {
    cut = cut.slice(0, -1);
  }
  return cut + "...";
}

// igBusinessId = Instagram Business Account ID (e.g. 17841443859190444)
// recipientId  = Customer's Instagram-scoped ID (IGSID) or username
async function sendMessage(igBusinessId, recipientId, text, options = {}) {
  if (!recipientId || !text) {
    return { ok: false, error: "missing_recipient_or_text" };
  }

  const accountId = igBusinessId || options.igAccountId || "17841443859190444";
  const token = options.token || process.env.INSTAGRAM_TOKEN || process.env.META_TOKEN;

  if (!token) {
    console.log(`[instagram.service] Instagram token not configured in environment. Message saved to Firestore inbox: "${text.substring(0, 40)}..."`);
    return {
      ok: false,
      error: "missing_instagram_token",
      status: "recorded_inbox",
      message: "Meta Instagram Token is not set. Reply saved to Firestore salon inbox.",
    };
  }

  const fetchFn = getFetch();
  const endpoints = [
    `https://graph.facebook.com/v21.0/${accountId}/messages`,
    `https://graph.facebook.com/v21.0/me/messages`,
    `https://graph.instagram.com/v21.0/${accountId}/messages`,
    `https://graph.instagram.com/v21.0/me/messages`,
  ];

  let lastData = null;
  for (const url of endpoints) {
    try {
      const res = await fetchFn(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: fitToLimit(text) },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        console.log(`[instagram.service] Delivered Instagram reply to ${recipientId} via ${url}! ID:`, data.message_id || data.id);
        return { ok: true, id: data.message_id || data.id };
      }
      lastData = data;
      if (data?.error?.code === 190) {
        console.error("[instagram.service] Meta Token expired or invalid (OAuth code 190):", data.error.message);
        return { ok: false, error: data };
      }
    } catch (err) {
      console.warn(`[instagram.service] Attempt to ${url} failed:`, err.message);
    }
  }

  console.error("[instagram.service] Meta Graph API dispatch failed across all endpoints:", lastData);
  return { ok: false, error: lastData };
}

module.exports = { sendMessage };
