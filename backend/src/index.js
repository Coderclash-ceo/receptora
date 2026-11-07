require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { startScheduler } = require("./scheduler/cron");

const app = express();
app.use(cors());
app.use(express.json());
// Catch malformed JSON bodies before they reach any route
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    console.error("[server] malformed JSON body received:", err.message);
    return res.sendStatus(400);
  }
  next(err);
});

app.get("/health", (req, res) => res.json({ ok: true, service: "receptora-backend" }));
app.use("/", require("./webhooks/whatsapp.webhook"));
app.use("/", require("./webhooks/instagram.webhook"));
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/bookings", require("./routes/bookings.routes"));
app.use("/api/customers", require("./routes/customers.routes"));
app.use("/api/settings", require("./routes/settings.routes"));
app.use("/api/insights", require("./routes/insights.routes"));
app.use("/api/conversations", require("./routes/conversations.routes"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[server] listening on ${PORT}`);
  startScheduler();
});