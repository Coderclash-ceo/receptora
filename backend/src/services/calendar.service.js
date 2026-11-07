const { calendar } = require("../config/googleCalendar");
const { getDoc, setDoc } = require("./firestore.service");

const DEFAULT_TIMEZONE = "Asia/Kolkata";
const DEFAULT_OFFSET = "+05:30";

function getDateString(dateInput, timeZone = DEFAULT_TIMEZONE) {
  if (typeof dateInput === "string") {
    const match = dateInput.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(dateInput);
  }
  return null;
}

function formatRFC3339(date, timeZone = DEFAULT_TIMEZONE, offset = DEFAULT_OFFSET) {
  if (typeof date === "string" && date.includes("T")) return date;
  const d = date instanceof Date ? date : new Date(date);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}${offset}`;
}

function formatTimeInTimezone(date, timeZone = DEFAULT_TIMEZONE) {
  const d = date instanceof Date ? date : new Date(date);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const hh = parts.find((p) => p.type === "hour")?.value;
  const mm = parts.find((p) => p.type === "minute")?.value;
  return `${hh}:${mm}`;
}

function getDayNameInTimezone(date, timeZone = DEFAULT_TIMEZONE) {
  let dateObj = date;
  if (typeof date === "string") {
    const match = date.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      dateObj = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00${DEFAULT_OFFSET}`);
    } else {
      dateObj = new Date(date);
    }
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(dateObj).toLowerCase();
}

async function listEvents(calendarId, timeMin, timeMax) {
  const timeMinIso = timeMin instanceof Date ? timeMin.toISOString() : new Date(timeMin).toISOString();
  const timeMaxIso = timeMax instanceof Date ? timeMax.toISOString() : new Date(timeMax).toISOString();

  const res = await calendar.events.list({
    calendarId,
    timeMin: timeMinIso,
    timeMax: timeMaxIso,
    singleEvents: true,
    orderBy: "startTime",
  });

  return res.data.items || [];
}

// Parses "10:00-20:00" into { open: "10:00", close: "20:00" }, or null if closed
function parseHoursForDay(hoursObj, date) {
  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dayKey = getDayNameInTimezone(date);
  const todayIdx = dayNames.indexOf(dayKey);

  // Find a matching key — supports both single-day keys (e.g. "sun")
  // and range keys (e.g. "mon-sat")
  for (const key of Object.keys(hoursObj)) {
    const value = hoursObj[key];
    if (key === dayKey) {
      return value === "closed" ? null : value;
    }
    if (key.includes("-")) {
      const [start, end] = key.split("-");
      const startIdx = dayNames.indexOf(start);
      const endIdx = dayNames.indexOf(end);
      if (startIdx === -1 || endIdx === -1) continue;

      const inRange =
        startIdx <= endIdx
          ? todayIdx >= startIdx && todayIdx <= endIdx
          : todayIdx >= startIdx || todayIdx <= endIdx; // wraps around week

      if (inRange) {
        return value === "closed" ? null : value;
      }
    }
  }
  return null; // no matching hours entry = treat as closed
}

function timeStringToDate(baseDate, timeStr, timeZone = DEFAULT_TIMEZONE, offset = DEFAULT_OFFSET) {
  const dateStr = getDateString(baseDate, timeZone);
  const [hours, minutes] = timeStr.split(":").map(Number);
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return new Date(`${dateStr}T${hh}:${mm}:00${offset}`);
}

async function getCalendarGaps(calendarId, date, openTime, closeTime) {
  const dayStart = timeStringToDate(date, openTime);
  const dayEnd = timeStringToDate(date, closeTime);

  const events = await listEvents(calendarId, dayStart, dayEnd);

  const busy = events
    .filter((e) => e.start?.dateTime && e.end?.dateTime)
    .map((e) => ({
      start: new Date(e.start.dateTime),
      end: new Date(e.end.dateTime),
    }))
    .sort((a, b) => a.start - b.start);

  const gaps = [];
  let cursor = dayStart;

  for (const b of busy) {
    if (b.start > cursor) {
      gaps.push({ start: new Date(cursor), end: new Date(b.start) });
    }
    if (b.end > cursor) {
      cursor = b.end;
    }
  }

  if (cursor < dayEnd) {
    gaps.push({ start: new Date(cursor), end: new Date(dayEnd) });
  }

  return gaps;
}

async function listAvailableSlots(businessId, service, date) {
  const business = await getDoc("businesses", businessId);
  if (!business) throw new Error(`Business not found: ${businessId}`);

  const { calendarId, hours, services } = business;
  if (!calendarId) throw new Error(`Business ${businessId} has no calendarId set`);

  const hoursForDay = parseHoursForDay(hours, date);
  if (!hoursForDay) return []; // closed that day

  const [openTime, closeTime] = hoursForDay.split("-");

  const serviceInfo = (services || []).find((s) => s.name === service);
  if (!serviceInfo) throw new Error(`Service not found: ${service}`);
  const durationMin = serviceInfo.durationMin || 30;

  const gaps = await getCalendarGaps(calendarId, date, openTime, closeTime);

  const slots = [];
  for (const gap of gaps) {
    let slotStart = new Date(gap.start);
    while (true) {
      const slotEnd = new Date(slotStart.getTime() + durationMin * 60000);
      if (slotEnd > gap.end) break;

      slots.push(formatTimeInTimezone(slotStart));

      slotStart = slotEnd;
    }
  }

  return slots;
}

async function createEvent(calendarId, { summary, startTime, endTime, description }) {
  const startDateTime = startTime instanceof Date ? formatRFC3339(startTime) : startTime;
  const endDateTime = endTime instanceof Date ? formatRFC3339(endTime) : endTime;

  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary,
      description,
      start: { dateTime: startDateTime, timeZone: DEFAULT_TIMEZONE },
      end: { dateTime: endDateTime, timeZone: DEFAULT_TIMEZONE },
    },
  });
  return res.data; // includes .id
}

async function cancelEvent(calendarId, eventId) {
  await calendar.events.delete({ calendarId, eventId });
  return true;
}

async function rescheduleEvent(calendarId, eventId, { newStartTime, newEndTime }) {
  const startDateTime = newStartTime instanceof Date ? formatRFC3339(newStartTime) : newStartTime;
  const endDateTime = newEndTime instanceof Date ? formatRFC3339(newEndTime) : newEndTime;

  const res = await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: {
      start: { dateTime: startDateTime, timeZone: DEFAULT_TIMEZONE },
      end: { dateTime: endDateTime, timeZone: DEFAULT_TIMEZONE },
    },
  });
  return res.data;
}

async function createCalendarBooking(businessId, { customerName, service, date, time, phone, customerPhone }) {
  const business = await getDoc("businesses", businessId);
  if (!business) throw new Error(`Business not found: ${businessId}`);
  const { calendarId, hours, services } = business;

  const serviceInfo = (services || []).find((s) => s.name && s.name.toLowerCase() === service.toLowerCase());
  if (!serviceInfo) throw new Error(`Service not found: ${service}`);

  const hoursForDay = parseHoursForDay(hours || {}, date);
  if (!hoursForDay) {
    return { ok: false, reason: "Business is closed on the selected date" };
  }

  const [openTime, closeTime] = hoursForDay.split("-");
  const openStart = timeStringToDate(date, openTime);
  const openEnd = timeStringToDate(date, closeTime);

  const startTime = timeStringToDate(date, time);
  const durationMin = serviceInfo.durationMin || 30;
  const endTime = new Date(startTime.getTime() + durationMin * 60000);

  if (startTime < openStart || endTime > openEnd) {
    return { ok: false, reason: "Requested slot is outside business hours" };
  }

  try {
    // Check overlap with existing events
    if (calendarId) {
      const existingEvents = await listEvents(calendarId, openStart, openEnd);
      const isOverlapping = existingEvents.some((e) => {
        if (e.status === "cancelled") return false;
        if (!e.start?.dateTime || !e.end?.dateTime) return false;
        const eStart = new Date(e.start.dateTime);
        const eEnd = new Date(e.end.dateTime);
        return eStart < endTime && eEnd > startTime;
      });

      if (isOverlapping) {
        return { ok: false, reason: "Requested slot overlaps with an existing booking" };
      }
    }

    const event = await createEvent(calendarId, {
      summary: `${service} - ${customerName}`,
      description: `Booked via NudgeOS for ${customerName}`,
      startTime,
      endTime,
    });

    const bookingId = `booking_${Date.now()}`;
    const dateStr = getDateString(date);
    const clientPhone = phone || customerPhone || "";
    await setDoc("bookings", businessId, bookingId, {
      customerName,
      service,
      date: dateStr,
      time,
      phone: clientPhone,
      customerPhone: clientPhone,
      googleEventId: event.id,
      status: "confirmed",
      price: serviceInfo.price || 0,
      createdAt: new Date().toISOString(),
    });

    return { ok: true, bookingId, googleEventId: event.id };
  } catch (err) {
    console.error("[calendar.service] Calendar API error:", err.message);
    return { ok: false, reason: "Calendar service is currently unavailable. Please try again later." };
  }
}

async function cancelCalendarBooking(businessId, bookingId) {
  const business = await getDoc("businesses", businessId);
  if (!business) throw new Error(`Business not found: ${businessId}`);
  const { calendarId } = business;

  const booking = await getDoc("bookings", businessId, bookingId);
  if (!booking) throw new Error(`Booking not found: ${bookingId}`);

  if (calendarId && booking.googleEventId) {
    try {
      await cancelEvent(calendarId, booking.googleEventId);
    } catch (e) {
      console.warn("[calendar.service] Google Calendar cancel event warning:", e.message);
    }
  }

  await setDoc("bookings", businessId, bookingId, {
    ...booking,
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
  });
  return true;
}

async function rescheduleCalendarBooking(businessId, bookingId, { date, time }) {
  const business = await getDoc("businesses", businessId);
  if (!business) throw new Error(`Business not found: ${businessId}`);
  const { calendarId, services } = business;

  const booking = await getDoc("bookings", businessId, bookingId);
  if (!booking) throw new Error(`Booking not found: ${bookingId}`);

  const serviceInfo = (services || []).find((s) => s.name === booking.service);
  if (!serviceInfo) throw new Error(`Service not found: ${booking.service}`);

  const newStartTime = timeStringToDate(date, time);
  const durationMin = serviceInfo.durationMin || 30;
  const newEndTime = new Date(newStartTime.getTime() + durationMin * 60000);

  await rescheduleEvent(calendarId, booking.googleEventId, { newStartTime, newEndTime });

  const dateStr = getDateString(date);
  await setDoc("bookings", businessId, bookingId, {
    ...booking,
    date: dateStr,
    time,
  });

  return true;
}

module.exports = {
  listEvents,
  getCalendarGaps,
  listAvailableSlots,
  createEvent,
  cancelEvent,
  rescheduleEvent,
  createCalendarBooking,
  cancelCalendarBooking,
  rescheduleCalendarBooking,
  timeStringToDate,
  formatRFC3339,
  formatTimeInTimezone,
  getDateString,
  parseHoursForDay,
};