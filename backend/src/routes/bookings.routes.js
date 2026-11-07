const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const { queryCollection, getDoc, setDoc } = require("../services/firestore.service");
const { createLogger } = require("../utils/logger");

const log = createLogger("bookings.routes");

router.use(authMiddleware);

// GET /api/bookings
router.get("/", async (req, res) => {
  try {
    const bookings = await queryCollection("bookings", req.businessId);
    return res.json({ bookings });
  } catch (err) {
    log.error("GET / error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/bookings/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await getDoc("bookings", req.businessId, id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    return res.json({ booking });
  } catch (err) {
    log.error("GET /:id error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/bookings - Create new booking
router.post("/", async (req, res) => {
  try {
    const { customerName, service, date, time, price, status, notes } = req.body;
    if (!customerName || !service || !date) {
      return res.status(400).json({ error: "customerName, service, and date are required" });
    }
    const id = `booking_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newBooking = {
      id,
      customerName,
      service,
      date,
      time: time || "11:00",
      price: Number(price) || 0,
      status: status || "confirmed",
      notes: notes || "",
      createdAt: new Date().toISOString(),
    };
    const saved = await setDoc("bookings", req.businessId, id, newBooking);
    return res.status(201).json({ booking: saved });
  } catch (err) {
    log.error("POST / error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH / PUT /api/bookings/:id - Update booking status or details
const handleBookingUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const existing = await getDoc("bookings", req.businessId, id);
    if (!existing) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const updated = await setDoc("bookings", req.businessId, id, {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    return res.json({ booking: updated });
  } catch (err) {
    log.error("Update /:id error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

router.patch("/:id", handleBookingUpdate);
router.put("/:id", handleBookingUpdate);

module.exports = router;