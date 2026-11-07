// src/agents/reception/reception.real-services.js
//
// Adapter layer between the agent's expected shape (12h AM/PM times,
// YYYY-MM-DD date strings, business object) and M2's real
// calendar.service.js (24h HH:MM times, Date objects, businessId string).
//
// Swap into reception.agent.js by changing the import from
// "./reception.mocks" to "./reception.real-services" once
// M2's Calendar credentials are available locally.

function to24Hour(time12h) {
  const [time, modifier] = time12h.split(" ");
  let [hours, minutes] = time.split(":");
  if (hours === "12") hours = "00";
  if (modifier === "PM") hours = parseInt(hours, 10) + 12;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function to12Hour(time24h) {
  let [hours, minutes] = time24h.split(":").map(Number);
  const modifier = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${modifier}`;
}

function dateStringToObj(dateStr) {
  return new Date(dateStr + "T00:00:00");
}

async function realCheckAvailability({ service, date }, business) {
  if (!business || !business.businessId) {
    return { error: "missing_business_context" };
  }
  const { listAvailableSlots } = require("../../services/calendar.service");
  try {
    const dateObj = dateStringToObj(date);
    const slots24h = await listAvailableSlots(business.businessId, service, dateObj);
    return slots24h.map(to12Hour);
  } catch (err) {
    console.error("[real-services] check_availability failed:", err.message);
    return [];
  }
}

async function realCreateBooking({ customerName, service, date, time }, business) {
  if (!customerName || !service || !date || !time) {
    return { error: "missing_fields" };
  }
  if (!business || !business.businessId) {
    return { error: "missing_business_context" };
  }
  const { createCalendarBooking } = require("../../services/calendar.service");
  try {
    const dateObj = dateStringToObj(date);
    const time24 = to24Hour(time);
    const result = await createCalendarBooking(business.businessId, {
      customerName,
      service,
      date: dateObj,
      time: time24,
    });
    return { success: true, bookingId: result.bookingId };
  } catch (err) {
    console.error("[real-services] create_booking failed:", err.message);
    return { error: "booking_failed", details: err.message };
  }
}

async function realFindBooking({ customerName, roughDate, service }, business) {
  if (!customerName) {
    return { error: "missing_fields" };
  }
  if (!business || !business.businessId) {
    return { error: "missing_business_context" };
  }
  const { queryCollection } = require("../../services/firestore.service");
  try {
    const matches = await queryCollection("bookings", business.businessId, [
      ["customerName", "==", customerName],
    ]);
    if (matches.length === 0) {
      return { error: "not_found" };
    }
    if (matches.length > 1) {
      return { error: "multiple_matches" };
    }
    const booking = matches[0];
    return {
      bookingId: booking.id,
      matchedService: booking.service,
      matchedDate: booking.date,
    };
  } catch (err) {
    console.error("[real-services] find_booking failed:", err.message);
    return { error: "lookup_failed", details: err.message };
  }
}

async function realCancelBooking({ bookingId }, business) {
  if (!bookingId) {
    return { error: "missing_fields" };
  }
  if (!business || !business.businessId) {
    return { error: "missing_business_context" };
  }
  const { cancelCalendarBooking } = require("../../services/calendar.service");
  try {
    await cancelCalendarBooking(business.businessId, bookingId);
    return { success: true };
  } catch (err) {
    console.error("[real-services] cancel_booking failed:", err.message);
    return { error: "cancel_failed", details: err.message };
  }
}

async function realRescheduleBooking({ bookingId, newDate, newTime }, business) {
  if (!bookingId || !newDate || !newTime) {
    return { error: "missing_fields" };
  }
  if (!business || !business.businessId) {
    return { error: "missing_business_context" };
  }
  const { rescheduleCalendarBooking } = require("../../services/calendar.service");
  try {
    const dateObj = dateStringToObj(newDate);
    const time24 = to24Hour(newTime);
    await rescheduleCalendarBooking(business.businessId, bookingId, {
      date: dateObj,
      time: time24,
    });
    return { success: true, newDate, newTime };
  } catch (err) {
    console.error("[real-services] reschedule_booking failed:", err.message);
    return { error: "reschedule_failed", details: err.message };
  }
}

module.exports = {
  realCheckAvailability,
  realCreateBooking,
  realFindBooking,
  realCancelBooking,
  realRescheduleBooking,
  to24Hour,
  to12Hour,
};