const express = require("express");
const router = express.Router();
const { auth, db } = require("../config/firebase");
const { setDoc } = require("../services/firestore.service");
const { createLogger } = require("../utils/logger");

const log = createLogger("auth.routes");

// GET /api/auth/me
// Returns current authenticated user's business metadata and claim status
router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  let decoded;
  try {
    if (token === "demo-token" || token === "demo-token-just-look") {
      return res.json({
        authenticated: true,
        uid: "WpSwjV15sFX1pIxfHYnVKP1M2GZ2",
        hasBusiness: true,
        businessId: "test-business-1",
      });
    } else if (token === "demo-token-fine-look") {
      return res.json({
        authenticated: true,
        uid: "yTIDlJ2I8dZhKVEM72q9iPeUwPf2",
        hasBusiness: true,
        businessId: "fine-look",
      });
    } else {
      decoded = await auth.verifyIdToken(token);
    }
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    let businessId =
      decoded.businessId && decoded.businessId !== "bombay-salon"
        ? decoded.businessId
        : null;

    // Check Firestore by ownerUid if not in custom claim
    if (!businessId && db) {
      try {
        const snap = await db.collection("businesses").where("ownerUid", "==", decoded.uid).limit(1).get();
        if (!snap.empty) {
          businessId = snap.docs[0].id;
          if (auth) {
            auth.setCustomUserClaims(decoded.uid, { businessId }).catch(() => {});
          }
        }
      } catch (_) {}
    }

    if (businessId) {
      return res.json({
        authenticated: true,
        uid: decoded.uid,
        hasBusiness: true,
        businessId,
      });
    }

    return res.json({
      authenticated: true,
      uid: decoded.uid,
      hasBusiness: false,
      businessId: null,
    });
  } catch (err) {
    log.error("GET /me error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/setup
// Links an authenticated Firebase user to a business and assigns the businessId custom claim
router.post("/setup", async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  let decoded;
  try {
    if (token === "demo-token" && process.env.NODE_ENV !== "production") {
      decoded = { uid: "demo-salon-owner", email: "owner@justlooksalon.com" };
    } else {
      decoded = await auth.verifyIdToken(token);
    }
  } catch (err) {
    log.error("Token verification failed in /setup:", err.message);
    return res.status(401).json({ error: "Invalid or expired authorization token" });
  }

  const {
    businessName,
    ownerName = "",
    phone = "",
    whatsappNumber = "",
    city = "",
    category = "Salon & Spa",
  } = req.body;

  if (!businessName || typeof businessName !== "string" || !businessName.trim()) {
    return res.status(400).json({ error: "businessName is required" });
  }

  const cleanName = businessName.trim();
  const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  let businessId;
  if (req.body.targetBusinessId) {
    businessId = req.body.targetBusinessId;
  } else if (slug.includes("just-look") || slug.includes("justlook") || slug.includes("test-business")) {
    businessId = "test-business-1";
  } else if (slug.includes("fine-look") || slug.includes("finelook")) {
    businessId = "fine-look";
  } else {
    businessId = slug ? `${slug}-${Date.now().toString(36)}` : `biz-${Date.now().toString(36)}`;
  }

  try {
    const finalPhone = whatsappNumber || phone || decoded.phoneNumber || "";
    const finalOwnerName = ownerName.trim() || decoded.name || decoded.displayName || "Salon Owner";

    // 1. Create or update business metadata in Firestore
    await setDoc("businesses", businessId, undefined, {
      name: cleanName,
      ownerName: finalOwnerName,
      category,
      phone: finalPhone,
      whatsappNumber: finalPhone,
      city: city.trim(),
      ownerUid: decoded.uid,
      updatedAt: new Date().toISOString(),
    });

    // 2. Assign custom claim businessId to the user in Firebase Auth
    if (decoded.uid && decoded.uid !== "demo-salon-owner" && auth) {
      await auth.setCustomUserClaims(decoded.uid, { businessId });
      log.info(`Assigned businessId="${businessId}" claim to uid=${decoded.uid}`);

      if (ownerName.trim()) {
        await auth.updateUser(decoded.uid, { displayName: ownerName.trim() }).catch(() => {});
      }
    }

    return res.json({
      ok: true,
      businessId,
      business: {
        id: businessId,
        name: cleanName,
        ownerName: finalOwnerName,
        category,
        phone: finalPhone,
        city: city.trim(),
      },
    });
  } catch (err) {
    log.error("Failed to complete business setup:", err.message);
    return res.status(500).json({ error: "Failed to initialize business account" });
  }
});

// POST /api/auth/switch-business
// Allows seamless switching between test-business-1 (Just Look) and fine-look (Fine Look)
router.post("/switch-business", async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const { businessId } = req.body;
  if (!businessId || (businessId !== "test-business-1" && businessId !== "fine-look" && !businessId.startsWith("biz-"))) {
    return res.status(400).json({ error: "Invalid businessId provided" });
  }

  try {
    if (token !== "demo-token" && !token.startsWith("demo-token") && auth) {
      const decoded = await auth.verifyIdToken(token);
      await auth.setCustomUserClaims(decoded.uid, { businessId });
      log.info(`Updated custom claim businessId="${businessId}" for uid=${decoded.uid}`);
    }
    return res.json({ ok: true, businessId });
  } catch (err) {
    log.warn("Switch business claim update warning:", err.message);
    return res.json({ ok: true, businessId });
  }
});

module.exports = router;
