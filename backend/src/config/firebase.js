const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

// Supports two modes:
// - Local dev: GOOGLE_APPLICATION_CREDENTIALS points to a real file path
// - Staging/production (Render/Railway): GOOGLE_APPLICATION_CREDENTIALS_JSON
//   holds the same file's contents, base64-encoded, since there's no local
//   filesystem to read a path from there.
let serviceAccount;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  const decoded = Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, "base64").toString("utf8");
  serviceAccount = JSON.parse(decoded);
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

let app, db, auth;
if (serviceAccount) {
  app = initializeApp({
    credential: cert(serviceAccount),
  });
  db = getFirestore(app);
  auth = getAuth(app);
} else {
  db = null;
  auth = null;
  app = null;
}

module.exports = { app, db, auth };