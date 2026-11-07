// src/agents/reception/reception.calendar.test.js

jest.mock("../../services/calendar.service", () => ({
  listAvailableSlots: jest.fn(),
  createCalendarBooking: jest.fn(),
  cancelCalendarBooking: jest.fn(),
  rescheduleCalendarBooking: jest.fn(),
}), { virtual: true });

const {
  checkAvailability,
  createBooking,
  cancelBooking,
  rescheduleBooking,
  to24Hour,
  to12Hour,
  parseDate,
} = require("./reception.calendar");

const {
  listAvailableSlots,
  createCalendarBooking,
  cancelCalendarBooking,
  rescheduleCalendarBooking,
} = require("../../services/calendar.service");

describe("Date and Time Conversion Helpers", () => {
  describe("to24Hour", () => {
    test("converts normal AM time", () => {
      expect(to24Hour("10:00 AM")).toBe("10:00");
      expect(to24Hour("09:30 AM")).toBe("09:30");
      expect(to24Hour("9:30 AM")).toBe("09:30");
    });

    test("converts normal PM time", () => {
      expect(to24Hour("02:00 PM")).toBe("14:00");
      expect(to24Hour("2:00 PM")).toBe("14:00");
      expect(to24Hour("05:45 PM")).toBe("17:45");
    });

    test("converts 12:00 AM (midnight) to 00:00", () => {
      expect(to24Hour("12:00 AM")).toBe("00:00");
      expect(to24Hour("12:30 AM")).toBe("00:30");
    });

    test("converts 12:00 PM (noon) to 12:00", () => {
      expect(to24Hour("12:00 PM")).toBe("12:00");
      expect(to24Hour("12:45 PM")).toBe("12:45");
    });

    test("handles already 24-hour time strings", () => {
      expect(to24Hour("14:00")).toBe("14:00");
      expect(to24Hour("00:00")).toBe("00:00");
      expect(to24Hour("09:15")).toBe("09:15");
    });

    test("returns null for invalid time inputs", () => {
      expect(to24Hour("")).toBeNull();
      expect(to24Hour(null)).toBeNull();
      expect(to24Hour("invalid")).toBeNull();
      expect(to24Hour("25:00")).toBeNull();
    });
  });

  describe("to12Hour", () => {
    test("converts 24h to 12h AM/PM", () => {
      expect(to12Hour("10:00")).toBe("10:00 AM");
      expect(to12Hour("14:00")).toBe("02:00 PM");
      expect(to12Hour("16:30")).toBe("04:30 PM");
      expect(to12Hour("00:00")).toBe("12:00 AM");
      expect(to12Hour("12:00")).toBe("12:00 PM");
    });

    test("preserves existing 12h AM/PM strings", () => {
      expect(to12Hour("02:00 PM")).toBe("02:00 PM");
      expect(to12Hour("10:00 AM")).toBe("10:00 AM");
    });

    test("returns null for invalid inputs", () => {
      expect(to12Hour("")).toBeNull();
      expect(to12Hour(null)).toBeNull();
      expect(to12Hour("invalid")).toBeNull();
    });
  });

  describe("parseDate", () => {
    test("parses YYYY-MM-DD string into a valid Date object without timezone shift", () => {
      const dt = parseDate("2026-09-20");
      expect(dt instanceof Date).toBe(true);
      expect(dt.getFullYear()).toBe(2026);
      expect(dt.getMonth()).toBe(8); // September is 8 (0-indexed)
      expect(dt.getDate()).toBe(20);
    });

    test("returns existing Date instance directly", () => {
      const original = new Date(2026, 8, 20);
      expect(parseDate(original)).toBe(original);
    });

    test("returns null for invalid date input", () => {
      expect(parseDate("")).toBeNull();
      expect(parseDate(null)).toBeNull();
      expect(parseDate("not-a-date")).toBeNull();
    });
  });
});

describe("checkAvailability Adapter", () => {
  beforeEach(() => {
    listAvailableSlots.mockClear();
  });

  test("valid date/service calls M2 listAvailableSlots and converts 24h slots to 12h", async () => {
    listAvailableSlots.mockResolvedValue(["10:00", "14:00", "16:30"]);

    const business = { businessId: "biz-123", name: "Glow Salon" };
    const result = await checkAvailability({ service: "haircut", date: "2026-09-20" }, business);

    expect(listAvailableSlots).toHaveBeenCalledWith("biz-123", "haircut", expect.any(Date));
    expect(result).toEqual({
      slots: ["10:00 AM", "02:00 PM", "04:30 PM"],
    });
  });

  test("handles closed day when M2 returns empty array", async () => {
    listAvailableSlots.mockResolvedValue([]);

    const business = { businessId: "biz-123" };
    const result = await checkAvailability({ service: "haircut", date: "2026-09-20" }, business);

    expect(result).toEqual({ slots: [] });
  });

  test("returns missing_business_context when business or businessId is missing", async () => {
    const resultNoBiz = await checkAvailability({ service: "haircut", date: "2026-09-20" }, null);
    expect(resultNoBiz).toEqual({ error: "missing_business_context" });

    const resultNoBizId = await checkAvailability({ service: "haircut", date: "2026-09-20" }, {});
    expect(resultNoBizId).toEqual({ error: "missing_business_context" });
  });

  test("returns empty slots when service or date is omitted", async () => {
    const business = { businessId: "biz-123" };
    expect(await checkAvailability({ service: "" }, business)).toEqual({ slots: [] });
    expect(await checkAvailability({ date: "" }, business)).toEqual({ slots: [] });
  });

  test("returns empty slots gracefully when M2 service throws error", async () => {
    listAvailableSlots.mockRejectedValue(new Error("Google Calendar API 503"));

    const business = { businessId: "biz-123" };
    const result = await checkAvailability({ service: "haircut", date: "2026-09-20" }, business);

    expect(result).toEqual({ slots: [] });
  });
});

describe("createBooking Adapter", () => {
  beforeEach(() => {
    createCalendarBooking.mockClear();
  });

  test("successful booking translates M2 ok:true into Reception success:true with bookingId", async () => {
    createCalendarBooking.mockResolvedValue({
      ok: true,
      bookingId: "booking_179000",
      googleEventId: "gevent_abc",
    });

    const business = { businessId: "biz-123" };
    const result = await createBooking(
      { customerName: "Raj", service: "haircut", date: "2026-09-20", time: "02:00 PM" },
      business
    );

    expect(createCalendarBooking).toHaveBeenCalledWith(
      "biz-123",
      expect.objectContaining({
        customerName: "Raj",
        service: "haircut",
        time: "14:00",
        date: expect.any(Date),
      })
    );
    expect(result).toEqual({
      success: true,
      bookingId: "booking_179000",
      googleEventId: "gevent_abc",
    });
  });

  test("translates 12:00 AM and 12:00 PM correctly during booking creation", async () => {
    createCalendarBooking.mockResolvedValue({ ok: true, bookingId: "b-1" });

    const business = { businessId: "biz-123" };
    await createBooking({ customerName: "A", service: "s", date: "2026-09-20", time: "12:00 AM" }, business);
    expect(createCalendarBooking).toHaveBeenLastCalledWith("biz-123", expect.objectContaining({ time: "00:00" }));

    await createBooking({ customerName: "A", service: "s", date: "2026-09-20", time: "12:00 PM" }, business);
    expect(createCalendarBooking).toHaveBeenLastCalledWith("biz-123", expect.objectContaining({ time: "12:00" }));
  });

  test("handles M2 { ok: false, reason } by returning error object without lying to LLM", async () => {
    createCalendarBooking.mockResolvedValue({
      ok: false,
      reason: "Requested slot overlaps with an existing booking",
    });

    const business = { businessId: "biz-123" };
    const result = await createBooking(
      { customerName: "Priya", service: "facial", date: "2026-09-20", time: "03:00 PM" },
      business
    );

    expect(result).toEqual({
      error: "Requested slot overlaps with an existing booking",
    });
  });

  test("handles M2 exception gracefully and returns booking_failed", async () => {
    createCalendarBooking.mockRejectedValue(new Error("Firestore write failed"));

    const business = { businessId: "biz-123" };
    const result = await createBooking(
      { customerName: "Kunal", service: "haircut", date: "2026-09-20", time: "11:00 AM" },
      business
    );

    expect(result.error).toBe("booking_failed");
    expect(result.details).toBe("Firestore write failed");
  });

  test("validates required fields before calling M2", async () => {
    const business = { businessId: "biz-123" };
    expect(await createBooking({ service: "haircut" }, business)).toEqual({ error: "missing_fields" });
    expect(await createBooking({ customerName: "Raj", service: "haircut" }, business)).toEqual({ error: "missing_fields" });
    expect(createCalendarBooking).not.toHaveBeenCalled();
  });

  test("validates missing business context", async () => {
    const result = await createBooking(
      { customerName: "Raj", service: "haircut", date: "2026-09-20", time: "10:00 AM" },
      null
    );
    expect(result).toEqual({ error: "missing_business_context" });
  });
});

describe("cancelBooking Adapter", () => {
  beforeEach(() => {
    cancelCalendarBooking.mockClear();
  });

  test("successful cancellation returns success:true", async () => {
    cancelCalendarBooking.mockResolvedValue(true);

    const business = { businessId: "biz-123" };
    const result = await cancelBooking({ bookingId: "b-1" }, business);

    expect(cancelCalendarBooking).toHaveBeenCalledWith("biz-123", "b-1");
    expect(result).toEqual({ success: true });
  });

  test("returns not_found when M2 throws booking not found", async () => {
    cancelCalendarBooking.mockRejectedValue(new Error("Booking not found: b-999"));

    const business = { businessId: "biz-123" };
    const result = await cancelBooking({ bookingId: "b-999" }, business);

    expect(result.error).toBe("not_found");
  });

  test("validates missing bookingId or business context", async () => {
    expect(await cancelBooking({}, { businessId: "biz-123" })).toEqual({ error: "missing_fields" });
    expect(await cancelBooking({ bookingId: "b-1" }, {})).toEqual({ error: "missing_business_context" });
    expect(cancelCalendarBooking).not.toHaveBeenCalled();
  });
});

describe("rescheduleBooking Adapter", () => {
  beforeEach(() => {
    rescheduleCalendarBooking.mockClear();
  });

  test("successful reschedule converts date and time and returns success:true", async () => {
    rescheduleCalendarBooking.mockResolvedValue(true);

    const business = { businessId: "biz-123" };
    const result = await rescheduleBooking(
      { bookingId: "b-1", newDate: "2026-09-22", newTime: "04:30 PM" },
      business
    );

    expect(rescheduleCalendarBooking).toHaveBeenCalledWith(
      "biz-123",
      "b-1",
      expect.objectContaining({
        date: expect.any(Date),
        time: "16:30",
      })
    );
    expect(result).toEqual({
      success: true,
      newDate: "2026-09-22",
      newTime: "04:30 PM",
    });
  });

  test("handles reschedule exception gracefully", async () => {
    rescheduleCalendarBooking.mockRejectedValue(new Error("Booking not found: b-999"));

    const business = { businessId: "biz-123" };
    const result = await rescheduleBooking(
      { bookingId: "b-999", newDate: "2026-09-22", newTime: "04:30 PM" },
      business
    );

    expect(result.error).toBe("reschedule_failed");
    expect(result.details).toContain("Booking not found");
  });

  test("validates missing fields or business context", async () => {
    const business = { businessId: "biz-123" };
    expect(await rescheduleBooking({ bookingId: "b-1" }, business)).toEqual({ error: "missing_fields" });
    expect(await rescheduleBooking({ bookingId: "b-1", newDate: "2026-09-22" }, business)).toEqual({ error: "missing_fields" });
    expect(await rescheduleBooking({ bookingId: "b-1", newDate: "2026-09-22", newTime: "10:00 AM" }, null)).toEqual({ error: "missing_business_context" });
    expect(rescheduleCalendarBooking).not.toHaveBeenCalled();
  });
});

describe("Multi-Tenancy Isolation via Adapter", () => {
  test("always forwards business.businessId to M2 service methods", async () => {
    listAvailableSlots.mockResolvedValue(["10:00"]);
    createCalendarBooking.mockResolvedValue({ ok: true, bookingId: "b-A" });
    cancelCalendarBooking.mockResolvedValue(true);
    rescheduleCalendarBooking.mockResolvedValue(true);

    const businessA = { businessId: "tenant-salon-A" };
    const businessB = { businessId: "tenant-clinic-B" };

    // Availability scoped to tenant A
    await checkAvailability({ service: "haircut", date: "2026-09-20" }, businessA);
    expect(listAvailableSlots).toHaveBeenLastCalledWith("tenant-salon-A", "haircut", expect.any(Date));

    // Create booking scoped to tenant B
    await createBooking({ customerName: "Raj", service: "cleaning", date: "2026-09-20", time: "10:00 AM" }, businessB);
    expect(createCalendarBooking).toHaveBeenLastCalledWith("tenant-clinic-B", expect.any(Object));

    // Cancel scoped to tenant A
    await cancelBooking({ bookingId: "b-A" }, businessA);
    expect(cancelCalendarBooking).toHaveBeenLastCalledWith("tenant-salon-A", "b-A");

    // Reschedule scoped to tenant B
    await rescheduleBooking({ bookingId: "b-B", newDate: "2026-09-21", newTime: "11:00 AM" }, businessB);
    expect(rescheduleCalendarBooking).toHaveBeenLastCalledWith("tenant-clinic-B", "b-B", expect.any(Object));
  });

  test("supports Firestore doc format where businessId is present as business.id", async () => {
    listAvailableSlots.mockResolvedValue(["14:00"]);
    createCalendarBooking.mockResolvedValue({ ok: true, bookingId: "b-firestore" });

    const firestoreBizDoc = { id: "firestore-doc-tenant" };

    const avail = await checkAvailability({ service: "haircut", date: "2026-09-20" }, firestoreBizDoc);
    expect(avail).toEqual({ slots: ["02:00 PM"] });
    expect(listAvailableSlots).toHaveBeenLastCalledWith("firestore-doc-tenant", "haircut", expect.any(Date));

    const booking = await createBooking(
      { customerName: "Priya", service: "haircut", date: "2026-09-20", time: "02:00 PM" },
      firestoreBizDoc
    );
    expect(booking).toEqual({ success: true, bookingId: "b-firestore" });
    expect(createCalendarBooking).toHaveBeenLastCalledWith("firestore-doc-tenant", expect.any(Object));
  });
});
