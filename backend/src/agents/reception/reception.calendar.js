// src/agents/reception/reception.calendar.js
// Reception Calendar Adapter Layer
// Adapts between Reception Agent tool calling schemas and calendar.service.js

function to24Hour(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const trimmed = timeStr.trim();

  // If already in 24-hour format: HH:MM or H:MM
  const match24 = trimmed.match(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/);
  if (match24) {
    const hh = match24[1].padStart(2, "0");
    const mm = match24[2];
    return `${hh}:${mm}`;
  }

  // 12-hour format: HH:MM AM/PM or H:MM AM/PM
  const match12 = trimmed.match(/^([0-1]?[0-9]):([0-5][0-9])\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const modifier = match12[3].toUpperCase();

    if (hours === 12) {
      hours = modifier === "PM" ? 12 : 0;
    } else if (modifier === "PM") {
      hours += 12;
    }

    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }

  return null;
}

function to12Hour(time24h) {
  if (!time24h || typeof time24h !== "string") return null;
  const trimmed = time24h.trim();

  // If already in 12-hour format
  if (/AM|PM/i.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const modifier = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${String(hours).padStart(2, "0")}:${minutes} ${modifier}`;
}

function parseDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  if (typeof dateInput === "string") {
    const match = dateInput.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10) - 1;
      const d = parseInt(match[3], 10);
      const dt = new Date(y, m, d);
      return isNaN(dt.getTime()) ? null : dt;
    }
    const dt = new Date(dateInput);
    return isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

function getCalendarService() {
  return require("../../services/calendar.service");
}

async function checkAvailability({ service, date } = {}, business) {
  if (!service || !date) {
    return { slots: [] };
  }
  const businessId = business && (business.businessId || business.id);
  if (!businessId) {
    return { error: "missing_business_context" };
  }

  const dateObj = parseDate(date);
  if (!dateObj) {
    return { slots: [] };
  }

  try {
    const { listAvailableSlots } = getCalendarService();
    const slots24h = await listAvailableSlots(businessId, service, dateObj);
    const slots = (slots24h || []).map(to12Hour).filter(Boolean);
    return { slots };
  } catch (err) {
    console.error("[reception.calendar] check_availability failed:", err.message);
    return { slots: [] };
  }
}

async function createBooking({ customerName, service, date, time, customerPhone, phone } = {}, business) {
  if (!customerName || !service || !date || !time) {
    return { error: "missing_fields" };
  }
  const businessId = business && (business.businessId || business.id);
  if (!businessId) {
    return { error: "missing_business_context" };
  }

  const time24 = to24Hour(time);
  if (!time24) {
    return { error: "invalid_time_format" };
  }

  const dateObj = parseDate(date);
  if (!dateObj) {
    return { error: "invalid_date_format" };
  }

  const clientPhone = phone || customerPhone || business?.customerPhone || "";

  try {
    const { createCalendarBooking } = getCalendarService();
    const result = await createCalendarBooking(businessId, {
      customerName,
      service,
      date: dateObj,
      time: time24,
      phone: clientPhone,
      customerPhone: clientPhone,
    });

    if (result && result.ok === false) {
      return { error: result.reason || "booking_failed" };
    }

    if (result && (result.ok || result.success || result.bookingId)) {
      const response = {
        success: true,
        bookingId: result.bookingId,
      };
      if (result.googleEventId) {
        response.googleEventId = result.googleEventId;
      }
      return response;
    }

    return { error: "booking_failed" };
  } catch (err) {
    console.error("[reception.calendar] create_booking failed:", err.message);
    return { error: "booking_failed", details: err.message };
  }
}

async function findBooking({ customerName, roughDate, service, customerPhone } = {}, business) {
  if (!customerName && !customerPhone) {
    return { error: "missing_fields" };
  }
  const businessId = business && (business.businessId || business.id);
  if (!businessId) {
    return { error: "missing_business_context" };
  }

  try {
    const { queryCollection } = require("../../services/firestore.service");
    const allBookings = await queryCollection("bookings", businessId);
    const activeBookings = (allBookings || []).filter((b) => b.status !== "cancelled");

    const normName = (customerName || "").trim().toLowerCase();
    const normPhone = (customerPhone || business?.customerPhone || "").replace(/\D/g, "");

    const matched = activeBookings.filter((b) => {
      const bName = (b.customerName || "").trim().toLowerCase();
      const bPhone = (b.customerPhone || b.phone || "").replace(/\D/g, "");

      const nameMatch = normName && (bName.includes(normName) || normName.includes(bName));
      const phoneMatch = normPhone && bPhone && (bPhone.includes(normPhone) || normPhone.includes(bPhone));

      return Boolean(nameMatch || phoneMatch);
    });

    if (matched.length === 0) {
      return { error: "not_found", message: "No active booking found for this customer." };
    }

    if (matched.length === 1) {
      const b = matched[0];
      return {
        bookingId: b.id,
        matchedService: b.service,
        matchedDate: b.date,
        matchedTime: b.time,
        customerName: b.customerName,
      };
    }

    return {
      multiple_matches: true,
      matches: matched.map((b) => ({
        bookingId: b.id,
        service: b.service,
        date: b.date,
        time: b.time,
      })),
    };
  } catch (err) {
    console.error("[reception.calendar] find_booking error:", err.message);
    return { error: "lookup_failed", details: err.message };
  }
}

async function cancelBooking({ bookingId } = {}, business) {
  if (!bookingId) {
    return { error: "missing_fields" };
  }
  const businessId = business && (business.businessId || business.id);
  if (!businessId) {
    return { error: "missing_business_context" };
  }

  try {
    const { cancelCalendarBooking } = getCalendarService();
    await cancelCalendarBooking(businessId, bookingId);
    return { success: true };
  } catch (err) {
    console.error("[reception.calendar] cancel_booking failed:", err.message);
    return { error: "not_found", details: err.message };
  }
}

async function rescheduleBooking({ bookingId, newDate, newTime } = {}, business) {
  if (!bookingId || !newDate || !newTime) {
    return { error: "missing_fields" };
  }
  const businessId = business && (business.businessId || business.id);
  if (!businessId) {
    return { error: "missing_business_context" };
  }

  const dateObj = parseDate(newDate);
  if (!dateObj) {
    return { error: "invalid_date_format" };
  }

  const time24 = to24Hour(newTime);
  if (!time24) {
    return { error: "invalid_time_format" };
  }

  try {
    const { rescheduleCalendarBooking } = getCalendarService();
    await rescheduleCalendarBooking(businessId, bookingId, {
      date: dateObj,
      time: time24,
    });
    return { success: true, newDate, newTime };
  } catch (err) {
    console.error("[reception.calendar] reschedule_booking failed:", err.message);
    return { error: "reschedule_failed", details: err.message };
  }
}

module.exports = {
  checkAvailability,
  createBooking,
  findBooking,
  cancelBooking,
  rescheduleBooking,
  to24Hour,
  to12Hour,
  parseDate,
};
