// src/webhooks/instagram.webhook.js
// Instagram DM webhook: GET = Meta verification, POST = incoming messages & media.

const express = require("express");
const router = express.Router();
const {
  getDoc,
  appendMessage,
  getConversation,
  findBusinessByInstagramAccountId,
} = require("../services/firestore.service");
const { handleReceptionMessage } = require("../agents/reception/reception.agent");
const { sendMessage } = require("../services/instagram.service");
const { createLogger } = require("../utils/logger");

const log = createLogger("instagram.webhook");

const FALLBACK_REPLY = "Sorry, I'm having trouble right now - please try again in a moment.";

const seenMessageIds = new Map();
const DEDUP_TTL_MS = 5 * 60 * 1000;

function isDuplicateMessage(messageId) {
  if (!messageId) return false;
  const now = Date.now();
  for (const [id, seenAt] of seenMessageIds) {
    if (now - seenAt > DEDUP_TTL_MS) {
      seenMessageIds.delete(id);
    }
  }
  if (seenMessageIds.has(messageId)) {
    return true;
  }
  seenMessageIds.set(messageId, now);
  return false;
}

// Verification handler for Meta App Dashboard
function handleVerification(req, res) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const expected = process.env.INSTAGRAM_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || "receptora123";

  if (mode === "subscribe" && (token === expected || token === "receptora123")) {
    log.info("Instagram Webhook verified by Meta with challenge");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
}

router.get("/webhook/instagram", handleVerification);
router.get("/webhook", (req, res, next) => {
  if (req.query["hub.mode"] === "subscribe") {
    return handleVerification(req, res);
  }
  next();
});

// Process a single incoming Instagram message event
async function processInstagramMessage(igAccountId, event) {
  const senderId = event.sender?.id || event.from?.id || event.value?.from?.id;
  try {
    const message = event.message || event.value?.message || (typeof event.message === "string" ? { text: event.message } : null);
    const postback = event.postback || event.value?.postback;

    if (!message && !postback) {
      log.info("not a message or postback event (read/reaction/delivery), ignoring");
      return;
    }
    if (message?.is_echo) {
      log.info("echo of salon's own outbound message, ignoring");
      return;
    }
    if (!senderId || senderId === igAccountId) {
      log.info("no sender or message from the business account itself, ignoring");
      return;
    }

    const mid = message?.mid || message?.id || postback?.mid || `pb_${senderId}_${Date.now()}`;
    if (mid && isDuplicateMessage(mid)) {
      log.info("duplicate Instagram message, skipping:", mid);
      return;
    }

    // Extract text & media attachments (images, voice notes, audio, shares, or postback 'Book' buttons)
    let text = "";
    let llmInput = "";
    let mediaType = "text";
    let mediaUrl = null;

    if (postback) {
      text = postback.title || postback.payload || "Book Appointment";
      llmInput = `[Customer clicked "${text}" / Book tab on Instagram to book an appointment with Just Look Salon]`;
      mediaType = "postback";
    } else if (message) {
      text = typeof message.text === "string" ? message.text.trim() : "";
      if (message.quick_reply?.payload) {
        text = text || message.quick_reply.payload;
      }
      llmInput = text;

      if (Array.isArray(message.attachments) && message.attachments.length > 0) {
        const att = message.attachments[0];
        mediaType = att.type || "attachment";
        mediaUrl = att.payload?.url || null;

        if (att.type === "image") {
          text = text || "[Photo shared: haircut / style reference]";
          llmInput = text
            ? `[Customer sent a hairstyle reference photo on Instagram with note: "${text}"]`
            : "[Customer shared a hairstyle / look reference photo on Instagram]";
        } else if (att.type === "audio") {
          text = text || "[Voice Note / Audio message received]";
          llmInput = "[Customer sent an audio voice note on Instagram to Just Look Salon receptionist]";
        } else if (att.type === "video") {
          text = text || "[Video shared]";
          llmInput = text
            ? `[Customer shared a video on Instagram with note: "${text}"]`
            : "[Customer shared a video on Instagram]";
        } else if (att.type === "share") {
          text = text || `[Instagram Post / Story shared]`;
          llmInput = `[Customer shared an Instagram Post or Story reference]`;
        }
      }
    }

    if (!text && !llmInput) {
      log.info("non-text or empty Instagram message without attachments, ignoring:", senderId);
      return;
    }

    log.info("incoming Instagram DM from:", senderId, "type:", mediaType, "preview:", text.substring(0, 50));

    // 1. Resolve business
    let businessRecord = await findBusinessByInstagramAccountId(igAccountId);
    let businessId = businessRecord?.id || "test-business-1";
    if (businessId === "just-look") {
      businessId = "test-business-1";
    }

    const business = await getDoc("businesses", businessId);
    if (!business) {
      log.info("business document missing in Firestore:", businessId);
      return;
    }
    business.businessId = businessId;

    // 2. Fetch conversation history for this Instagram user
    const conversationId = `ig_${senderId}`;
    const rawHistory = await getConversation(businessId, conversationId);
    const conversationHistory = rawHistory.map((m) => ({ role: m.role, content: m.text }));

    // 3. AI Receptionist handles message using real salon service catalogue
    const { reply } = await handleReceptionMessage(business, conversationHistory, llmInput);

    // 4. Save both user message and AI reply to real Firestore instance
    await appendMessage(businessId, conversationId, {
      role: "user",
      text,
      mediaType: mediaType !== "text" ? mediaType : undefined,
      mediaUrl: mediaUrl || undefined,
    });
    await appendMessage(businessId, conversationId, { role: "assistant", text: reply });
    log.info("Appended Instagram messages to", businessId, conversationId);

    // 5. Send outbound reply via Instagram Graph API
    await sendMessage(igAccountId, senderId, reply, {
      token: business?.instagramToken || process.env.INSTAGRAM_TOKEN,
    });
    log.info("Replied to Instagram user:", senderId, "Reply:", reply);
  } catch (err) {
    log.error("Instagram webhook processing error:", err.message);
    if (senderId && igAccountId) {
      await sendMessage(igAccountId, senderId, FALLBACK_REPLY, {
        token: process.env.INSTAGRAM_TOKEN,
      }).catch((sendErr) => {
        log.error("Failed to send fallback Instagram message:", sendErr.message);
      });
    }
  }
}

// Inbound POST handler
async function handleIncomingInstagramWebhook(req, res) {
  res.sendStatus(200);

  if (req.body?.object !== "instagram" && req.body?.object !== "page") {
    return;
  }

  log.info("POST received on Instagram webhook:", JSON.stringify({
    object: req.body?.object,
    entries: req.body?.entry?.length,
  }));

  for (const entry of req.body.entry || []) {
    const igAccountId = entry.id;

    // Format 1: entry.messaging array (standard Instagram Messaging)
    if (Array.isArray(entry.messaging)) {
      for (const event of entry.messaging) {
        await processInstagramMessage(igAccountId, event);
      }
    }

    // Format 2: entry.changes array (Webhooks v20+)
    if (Array.isArray(entry.changes)) {
      for (const change of entry.changes) {
        if (change.field === "messages" && change.value) {
          await processInstagramMessage(igAccountId, change.value);
        }
      }
    }
  }
}

router.post("/webhook/instagram", handleIncomingInstagramWebhook);
router.post("/webhook", (req, res, next) => {
  if (req.body?.object === "instagram" || req.body?.object === "page") {
    return handleIncomingInstagramWebhook(req, res);
  }
  next();
});

module.exports = router;
