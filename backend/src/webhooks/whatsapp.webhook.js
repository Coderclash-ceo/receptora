const express = require("express");
const router = express.Router();
const { resolveBusinessId } = require("../middleware/tenantResolver");
const { getDoc, appendMessage, getConversation } = require("../services/firestore.service");
const { handleReceptionMessage } = require("../agents/reception/reception.agent");
const { sendMessage } = require("../services/whatsapp.service");
const { createLogger } = require("../utils/logger");

const log = createLogger("webhook");

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

function handleVerification(req, res) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const expected = process.env.WHATSAPP_VERIFY_TOKEN || process.env.INSTAGRAM_VERIFY_TOKEN || "receptora123";

  if (mode === "subscribe" && (token === expected || token === "receptora123")) {
    log.info("WhatsApp webhook verified by Meta with challenge");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
}

router.get("/webhook/whatsapp", handleVerification);
router.get("/webhook", (req, res, next) => {
  if (req.query["hub.mode"] === "subscribe") {
    return handleVerification(req, res);
  }
  next();
});

async function handleIncomingWhatsAppWebhook(req, res) {
  res.sendStatus(200);

  let from;
  let phoneNumberId;
  let business;

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const msg = change?.messages?.[0];

    if (!msg) {
      log.info("payload did not match expected WhatsApp message shape (status/read receipt), ignoring");
      return;
    }

    from = msg.from;
    const messageId = msg.id;

    if (messageId && isDuplicateMessage(messageId)) {
      log.info("duplicate message, skipping:", messageId);
      return;
    }

    phoneNumberId = change?.metadata?.phone_number_id;
    const displayPhoneNumber = change?.metadata?.display_phone_number;

    const { found, businessId } = await resolveBusinessId(phoneNumberId, displayPhoneNumber);
    if (!found) {
      log.info("no business for phone_number_id:", phoneNumberId, "or display_phone_number:", displayPhoneNumber);
      return;
    }

    business = await getDoc("businesses", businessId);
    if (business) {
      business.businessId = business.id;
    }

    // Extract text and media content (supporting text, image, audio/voice notes, video, documents, buttons)
    let text = "";
    let llmInput = "";
    let mediaType = msg.type || "text";

    if (msg.type === "text") {
      text = msg.text?.body || "";
      llmInput = text;
    } else if (msg.type === "image") {
      const caption = msg.image?.caption?.trim() || "";
      text = caption ? `[Photo attached: "${caption}"]` : "[Photo received: haircut / style reference]";
      llmInput = caption
        ? `[Customer sent a photo style reference with note: "${caption}"]`
        : "[Customer sent a photo style reference for a haircut or styling look]";
      mediaType = "image";
    } else if (msg.type === "audio" || msg.type === "voice") {
      text = "[Voice Note / Audio message received]";
      llmInput = "[Customer sent an audio voice note to Just Look Salon receptionist]";
      mediaType = "audio";
    } else if (msg.type === "video") {
      const caption = msg.video?.caption?.trim() || "";
      text = caption ? `[Video attached: "${caption}"]` : "[Video received]";
      llmInput = caption ? `[Customer sent a video with note: "${caption}"]` : "[Customer sent a video to the salon]";
      mediaType = "video";
    } else if (msg.type === "document") {
      const name = msg.document?.filename || msg.document?.caption || "Document";
      text = `[Document attached: ${name}]`;
      llmInput = `[Customer sent a document: ${name}]`;
      mediaType = "document";
    } else if (msg.type === "interactive") {
      text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "";
      llmInput = text;
    } else if (msg.type === "location") {
      text = `[Location shared: ${msg.location?.name || `${msg.location?.latitude}, ${msg.location?.longitude}`}]`;
      llmInput = text;
    } else {
      text = msg.text?.body || `[${msg.type || "Message"} received]`;
      llmInput = text;
    }

    if (!text && !llmInput) {
      log.info("unhandled empty WhatsApp message payload, ignoring");
      return;
    }

    log.info("incoming WhatsApp from:", from, "type:", mediaType, "preview:", text.substring(0, 50));

    const conversationId = from;
    const rawHistory = await getConversation(businessId, conversationId);
    const conversationHistory = rawHistory.map((m) => ({ role: m.role, content: m.text }));

    const { reply } = await handleReceptionMessage(business, conversationHistory, llmInput, { customerPhone: from });

    await appendMessage(businessId, conversationId, { role: "user", text, mediaType });
    await appendMessage(businessId, conversationId, { role: "assistant", text: reply });

    await sendMessage(from, reply, {
      phoneNumberId: phoneNumberId || business?.whatsappPhoneNumberId || business?.phoneId,
      token: business?.whatsappToken,
    });
    log.info("replied to WhatsApp user:", from, "reply:", reply);
  } catch (err) {
    log.error("webhook error:", err.message);
    if (from) {
      const fallbackReply = "Sorry, I'm having trouble right now - please try again in a moment.";
      await sendMessage(from, fallbackReply, {
        phoneNumberId: phoneNumberId || business?.whatsappPhoneNumberId || business?.phoneId,
        token: business?.whatsappToken,
      }).catch((sendErr) => {
        log.error("failed to send fallback message:", sendErr.message);
      });
    }
  }
}

router.post("/webhook/whatsapp", handleIncomingWhatsAppWebhook);
router.post("/webhook", (req, res, next) => {
  if (req.body?.object === "whatsapp_business_account") {
    return handleIncomingWhatsAppWebhook(req, res);
  }
  next();
});

module.exports = router;