const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const { setDoc, getDoc } = require("../services/firestore.service");
const { createLogger } = require("../utils/logger");

const log = createLogger("settings.routes");

const { runOnboardingAgent, extract } = require("../agents/onboarding/onboarding.agent");

router.use(authMiddleware);

// GET /api/settings
router.get("/", async (req, res) => {
  try {
    const business = await getDoc("businesses", req.businessId);
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }
    return res.json({ business });
  } catch (err) {
    log.error("GET / error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/settings
router.put("/", async (req, res) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== "object") {
      return res.status(400).json({ error: "Invalid updates body" });
    }
    const saved = await setDoc("businesses", req.businessId, undefined, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    return res.json({ business: saved });
  } catch (err) {
    log.error("PUT / error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/onboard", async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || typeof rawText !== "string") {
      return res.status(400).json({ error: "rawText (string) is required in the request body" });
    }

    let extracted = await runOnboardingAgent(rawText);
    if (!extracted || extracted.error || !Array.isArray(extracted.services) || extracted.services.length === 0) {
      log.warn("runOnboardingAgent returned error or empty, falling back to extract()", extracted?.error);
      extracted = extract(rawText);
    }

    // Basic shape validation before writing — per Chapter 10.3's contract
    if (!Array.isArray(extracted.services) || extracted.services.length === 0) {
      return res.status(422).json({ error: "Extraction failed: services must be a non-empty array" });
    }
    if (typeof extracted.hours !== "object" || extracted.hours === null || Array.isArray(extracted.hours)) {
      return res.status(422).json({ error: "Extraction failed: hours must be an object" });
    }

    // Ensure durationMin is stored for calendar service (defaults safely to 30)
    const servicesWithDuration = extracted.services.map((s) => ({
      name: s.name,
      price: s.price,
      durationMin: s.durationMin || 30,
      ...(s.category ? { category: s.category } : {}),
      ...(s.description ? { description: s.description } : {}),
    }));

    const saved = await setDoc("businesses", req.businessId, undefined, {
      ...(extracted.name ? { name: extracted.name } : {}),
      services: servicesWithDuration,
      hours: extracted.hours,
    });

    return res.json({ business: saved });
  } catch (err) {
    log.error("POST /onboard error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;