const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const { queryCollection, getDoc, appendMessage, setDoc } = require("../services/firestore.service");
const { createLogger } = require("../utils/logger");

const log = createLogger("conversations.routes");

router.use(authMiddleware);

// GET /api/conversations
// Paginated list view: trims history to last message + total count
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const cursor = parseInt(req.query.cursor, 10);
    const page = parseInt(req.query.page, 10) || 1;
    const offset = !isNaN(cursor) ? Math.max(cursor, 0) : (Math.max(page, 1) - 1) * limit;

    const rawConversations = await queryCollection("conversations", req.businessId);
    const customers = await queryCollection("customers", req.businessId);
    const custMap = new Map();
    for (const c of customers) {
      if (c.phone) custMap.set(c.phone.replace(/[^0-9]/g, ""), c);
      if (c.id) custMap.set(c.id, c);
    }

    // Transform and trim each conversation for list view (filtering out any instagram threads)
    const formatted = rawConversations
      .filter((conv) => !conv.id.startsWith("ig_") && conv.channel !== "instagram")
      .map((conv) => {
        const messages = Array.isArray(conv.messages) ? conv.messages : [];
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const { messages: _, ...restDoc } = conv;

        const cleanId = (conv.id || "").replace(/[^0-9]/g, "");
        const matchedCust = custMap.get(conv.id) || custMap.get(cleanId);
        const customerName = conv.customerName || matchedCust?.name || `Client ${conv.id}`;
        const channel = "whatsapp";

        return {
          ...restDoc,
          id: conv.id,
          customerName,
          channel,
          phone: matchedCust?.phone || (cleanId ? `+${cleanId}` : conv.phone || null),
          lastMessage,
          totalMessages: messages.length,
        };
      });

    // Sort by most recent activity descending
    formatted.sort((a, b) => {
      const timeA = a.lastMessage?.timestamp
        ? new Date(a.lastMessage.timestamp).getTime()
        : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
      const timeB = b.lastMessage?.timestamp
        ? new Date(b.lastMessage.timestamp).getTime()
        : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
      return timeB - timeA;
    });

    // Paginate in memory
    const pageItems = formatted.slice(offset, offset + limit);
    const hasMore = offset + limit < formatted.length;
    const nextCursor = hasMore ? offset + limit : null;

    return res.json({
      items: pageItems,
      hasMore,
      nextCursor,
      total: formatted.length,
    });
  } catch (err) {
    log.error("GET / error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/conversations/:id
// Returns full conversation history for a specific conversation ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await getDoc("conversations", req.businessId, id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    return res.json({ conversation });
  } catch (err) {
    log.error("GET /:id error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/conversations/:id/messages
// Appends a new message (from owner or AI) to the conversation and dispatches over WhatsApp
router.post("/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const { text, role = "assistant" } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Message text is required" });
    }
    const messageEntry = await appendMessage(req.businessId, id, { role, text });

    // Live Dispatch to customer's actual WhatsApp phone
    let liveDelivery = null;
    if (role === "assistant" || role === "owner" || role === "admin") {
      const cleanPhone = id.replace(/\D/g, "");
      if (cleanPhone.length >= 10) {
        try {
          const business = await getDoc("businesses", req.businessId);
          const { sendMessage } = require("../services/whatsapp.service");
          liveDelivery = await sendMessage(cleanPhone, text, {
            phoneNumberId: business?.whatsappPhoneNumberId || business?.phoneId,
            token: business?.whatsappToken,
          });
          log.info("Live WhatsApp dispatch result to", cleanPhone, ":", liveDelivery);
        } catch (sendErr) {
          log.error("Live WhatsApp dispatch error:", sendErr.message);
          liveDelivery = { ok: false, error: sendErr.message };
        }
      }
    }

    return res.status(201).json({ message: messageEntry, liveDelivery });
  } catch (err) {
    log.error("POST /:id/messages error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/conversations/:id/suggestions
// Generates 3 dynamic, context-aware reply suggestions tailored to the actual chat
router.post("/:id/suggestions", async (req, res) => {
  try {
    const { id } = req.params;
    const convDoc = await getDoc("conversations", req.businessId, id);
    const messages = convDoc?.messages || [];

    if (messages.length === 0) {
      return res.json({
        suggestions: [
          "Hello! Welcome to our salon. How may we assist you today?",
          "Would you like to explore our services and prices?",
          "Are you looking to book an appointment for today or this weekend?",
        ],
      });
    }

    const userMessages = messages.filter((m) => m.role === "user");
    const lastUserMessage = userMessages[userMessages.length - 1]?.text || "";

    // 1. Try Gemini LLM for precise contextual awareness
    try {
      const { callAgent } = require("../services/llm.service");
      const systemPrompt = `You are an AI assistant for a salon receptionist. Given the conversation history, generate exactly 3 short, polite, contextual reply options (each max 10 words) that directly address the client's latest message: "${lastUserMessage}".
Respond ONLY with a valid JSON array of 3 strings. Example: ["Yes, 2:00 PM Saturday is open!", "Checking calendar for you...", "Would you like our senior stylist?"]`;

      const llmRes = await callAgent(systemPrompt, [], [
        { role: "user", content: `Recent messages: ${JSON.stringify(messages.slice(-4))}` },
      ]);

      if (llmRes.ok) {
        const textBlock = llmRes.response?.content?.find((b) => b.type === "text");
        if (textBlock?.text) {
          const clean = textBlock.text.trim().replace(/^```json/, "").replace(/```$/, "").trim();
          const parsed = JSON.parse(clean);
          if (Array.isArray(parsed) && parsed.length >= 2) {
            return res.json({ suggestions: parsed.slice(0, 3) });
          }
        }
      }
    } catch (llmErr) {
      log.warn("LLM suggestion generation fallback:", llmErr.message);
    }

    // 2. Intelligent heuristics tailored to last message
    const lower = lastUserMessage.toLowerCase();
    let suggestions = [];

    if (lower.includes("saturday") || lower.includes("tomorrow") || lower.includes("pm") || lower.includes("am") || lower.includes("slot") || lower.includes("time") || lower.includes("2:00") || lower.includes("4:00")) {
      suggestions = [
        "Yes, that slot is open! May I confirm your booking?",
        "Checking our stylists for that time right now...",
        "All reserved for you! Looking forward to your visit ✨",
      ];
    } else if (lower.includes("price") || lower.includes("cost") || lower.includes("how much") || lower.includes("rate") || lower.includes("menu")) {
      suggestions = [
        "Our pricing includes deep conditioning & styling.",
        "Here are our package rates and current promotions.",
        "Would you like me to book a complimentary consultation?",
      ];
    } else if (lower.includes("thank") || lower.includes("great") || lower.includes("awesome") || lower.includes("ok")) {
      suggestions = [
        "You're very welcome! See you at the salon ✨",
        "Happy to help! Let us know if anything changes.",
        "We can't wait to pamper you!",
      ];
    } else {
      suggestions = [
        "I'd love to help you with that! Which date suits you best?",
        "We have several slots open this week. Would you like morning or afternoon?",
        "Let me check our senior stylist's availability for you.",
      ];
    }

    return res.json({ suggestions });
  } catch (err) {
    log.error("POST /:id/suggestions error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
