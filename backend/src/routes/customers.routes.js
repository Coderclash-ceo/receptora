const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const { queryCollection, getDoc, setDoc, logRetentionSend, appendMessage } = require("../services/firestore.service");
const { callAgent } = require("../services/llm.service");
const { createLogger } = require("../utils/logger");

const log = createLogger("customers.routes");

router.use(authMiddleware);

// GET /api/customers
router.get("/", async (req, res) => {
  try {
    const customers = await queryCollection("customers", req.businessId);
    return res.json({ customers });
  } catch (err) {
    log.error("GET / error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/customers/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await getDoc("customers", req.businessId, id);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    return res.json({ customer });
  } catch (err) {
    log.error("GET /:id error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/customers - Add a new customer
router.post("/", async (req, res) => {
  try {
    const { name, phone, tags, notes, lastService } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "Name and phone are required" });
    }
    const id = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newCustomer = {
      id,
      name,
      phone,
      lastVisit: new Date().toISOString().slice(0, 10),
      lastService: lastService || "Haircut",
      tags: Array.isArray(tags) ? tags : ["regular"],
      notes: notes || "",
      createdAt: new Date().toISOString(),
    };
    const saved = await setDoc("customers", req.businessId, id, newCustomer);
    return res.status(201).json({ customer: saved });
  } catch (err) {
    log.error("POST / error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/customers/:id/nudge - Trigger retention agent win-back nudge
router.post("/:id/nudge", async (req, res) => {
  try {
    const { id } = req.params;
    const { customMessage } = req.body || {};
    const customer = await getDoc("customers", req.businessId, id);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const business = await getDoc("businesses", req.businessId);
    const salonName = business?.name || "our salon";

    let finalMessage = customMessage;

    if (!finalMessage) {
      try {
        const prompt = `You write a warm, friendly, short WhatsApp win-back message (max 2 sentences) for a salon client named ${customer.name} who hasn't visited recently. Their last service was ${customer.lastService || "a grooming session"}. Business: ${salonName}. Do not use hashtags or formal email phrasing.`;
        const result = await callAgent(prompt, [], [{ role: "user", content: "Generate message" }]);
        if (result.ok) {
          const textBlock = result.response?.content?.find((b) => b.type === "text");
          if (textBlock?.text) {
            finalMessage = textBlock.text;
          }
        }
      } catch (llmErr) {
        log.warn("LLM retention draft failed, using fallback template:", llmErr.message);
      }

      if (!finalMessage) {
        finalMessage = `Hi ${customer.name}! We've missed having you at ${salonName}. It's been a few weeks since your last ${customer.lastService || "visit"} — reply here to book your next appointment! ✨`;
      }
    }

    // Log the retention nudge send
    await logRetentionSend(req.businessId, id, finalMessage);

    // Also record in customer's WhatsApp conversation thread so it appears in Messages
    try {
      const convId = (customer.phone && customer.phone.replace(/[^0-9]/g, "")) || id;
      await appendMessage(req.businessId, convId, {
        role: "assistant",
        text: `[Retention Win-Back] ${finalMessage}`,
      });
      await setDoc("conversations", req.businessId, convId, {
        customerName: customer.name,
        channel: "whatsapp",
        lastUpdated: new Date().toISOString(),
      });
    } catch (convErr) {
      log.warn("Could not append nudge to conversation:", convErr.message);
    }

    // Live WhatsApp dispatch
    let liveDelivery = null;
    if (customer.phone) {
      const cleanPhone = customer.phone.replace(/\D/g, "");
      if (cleanPhone.length >= 10) {
        try {
          const { sendMessage } = require("../services/whatsapp.service");
          liveDelivery = await sendMessage(cleanPhone, finalMessage, {
            phoneNumberId: business?.whatsappPhoneNumberId || business?.phoneId,
            token: business?.whatsappToken,
          });
          log.info("Live retention nudge WhatsApp dispatch result:", liveDelivery);
        } catch (sendErr) {
          log.error("Live retention nudge dispatch error:", sendErr.message);
          liveDelivery = { ok: false, error: sendErr.message };
        }
      }
    }

    return res.json({
      success: true,
      customerId: id,
      customerName: customer.name,
      phone: customer.phone,
      message: finalMessage,
      liveDelivery,
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    log.error("POST /:id/nudge error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;