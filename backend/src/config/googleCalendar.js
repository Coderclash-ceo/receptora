const { google } = require("googleapis");

// Same dual-mode pattern as config/firebase.js — see that file's comment.
let authConfig;
if (process.env.GOOGLE_CALENDAR_KEY_JSON) {
  const decoded = Buffer.from(process.env.GOOGLE_CALENDAR_KEY_JSON, "base64").toString("utf8");
  authConfig = { credentials: JSON.parse(decoded) };
} else if (process.env.GOOGLE_CALENDAR_KEY_PATH) {
  authConfig = { keyFile: process.env.GOOGLE_CALENDAR_KEY_PATH };
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  const decoded = Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, "base64").toString("utf8");
  authConfig = { credentials: JSON.parse(decoded) };
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  authConfig = { keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS };
} else {
  authConfig = {};
}

const auth = new google.auth.GoogleAuth({
  ...authConfig,
  scopes: ["https://www.googleapis.com/auth/calendar"],
});

const calendar = google.calendar({ version: "v3", auth });

module.exports = { calendar };