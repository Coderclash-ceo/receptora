const { auth, db } = require("../config/firebase");

// DESIGN NOTE: businessId is read from:
// 1. Client's explicitly selected active salon header ("x-business-id")
// 2. Firebase Auth user's custom claims (claims.businessId)
// 3. Fallback to Firestore businesses collection matching ownerUid
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const requestedBusinessId = req.headers["x-business-id"] || null;

  // Development/presentation bypass for demo tokens
  if (process.env.NODE_ENV !== "production") {
    if (token === "demo-token" || token === "demo-token-just-look" || token === "demo-token-fine-look") {
      req.businessId = requestedBusinessId || (token === "demo-token-fine-look" ? "fine-look" : "test-business-1");
      req.ownerUid = req.businessId === "fine-look" ? "yTIDlJ2I8dZhKVEM72q9iPeUwPf2" : "WpSwjV15sFX1pIxfHYnVKP1M2GZ2";
      return next();
    }
  }

  try {
    const decoded = await auth.verifyIdToken(token);

    // 1. Allow explicit active business header for multi-salon owners
    let resolvedBusinessId = null;
    if (requestedBusinessId && (requestedBusinessId === "test-business-1" || requestedBusinessId === "fine-look" || requestedBusinessId.startsWith("biz-"))) {
      resolvedBusinessId = requestedBusinessId;
    } else if (decoded.businessId && decoded.businessId !== "bombay-salon") {
      resolvedBusinessId = decoded.businessId;
    }

    // 2. If claim not yet on token, check Firestore by ownerUid
    if (!resolvedBusinessId && db) {
      try {
        const snap = await db.collection("businesses").where("ownerUid", "==", decoded.uid).limit(1).get();
        if (!snap.empty) {
          resolvedBusinessId = snap.docs[0].id;
          if (auth) {
            auth.setCustomUserClaims(decoded.uid, { businessId: resolvedBusinessId }).catch(() => {});
          }
        }
      } catch (_) {}
    }

    if (!resolvedBusinessId) {
      resolvedBusinessId = "test-business-1"; // Safe default for valid users
    }

    req.businessId = resolvedBusinessId;
    req.ownerUid = decoded.uid;
    return next();
  } catch (err) {
    console.warn("[authMiddleware] token verification error:", err.message);

    // Development & presentation resilience: If token expired, decode payload rather than bricking the UI
    if (process.env.NODE_ENV !== "production") {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
          req.businessId = requestedBusinessId || payload.businessId || "test-business-1";
          req.ownerUid = payload.user_id || payload.sub || "demo-uid";
          return next();
        }
      } catch (_) {}
    }

    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { authMiddleware };
