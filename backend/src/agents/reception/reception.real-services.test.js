// src/agents/reception/reception.real-services.test.js
jest.mock("../../services/calendar.service", () => ({
  listAvailableSlots: jest.fn(),
  createCalendarBooking: jest.fn(),
  cancelCalendarBooking: jest.fn(),
  rescheduleCalendarBooking: jest.fn(),
}), { virtual: true });

jest.mock("../../services/firestore.service", () => ({
  queryCollection: jest.fn(),
}), { virtual: true });

const {
  realCheckAvailability,
  realCreateBooking,
  realFindBooking,
  realCancelBooking,
  realRescheduleBooking,
  to24Hour,
  to12Hour,
} = require("./reception.real-services");

const { listAvailableSlots, createCalendarBooking, cancelCalendarBooking, rescheduleCalendarBooking } = require("../../services/calendar.service");
const { queryCollection } = require("../../services/firestore.service");

describe("Time conversion helpers", () => {
  test("to24Hour converts correctly", () => {
    expect(to24Hour("03:00 PM")).toBe("15:00");
    expect(to24Hour("10:00 AM")).toBe("10:00");
    expect(to24Hour("12:00 PM")).toBe("12:00");
    expect(to24Hour("12:00 AM")).toBe("00:00");
  });

  test("to12Hour converts correctly", () => {
    expect(to12Hour("15:00")).toBe("03:00 PM");
    expect(to12Hour("10:00")).toBe("10:00 AM");
    expect(to12Hour("00:00")).toBe("12:00 AM");
  });
});

describe("realCheckAvailability", () => {
  test("returns missing_business_context when businessId is missing", async () => {
    const result = await realCheckAvailability({ service: "haircut", date: "2026-09-20" }, {});
    expect(result).toEqual({ error: "missing_business_context" });
  });

  test("converts 24h slots from Calendar service into 12h format", async () => {
    listAvailableSlots.mockResolvedValue(["10:00", "14:00"]);
    const result = await realCheckAvailability(
      { service: "haircut", date: "2026-09-20" },
      { businessId: "biz-1" }
    );
    expect(result).toEqual(["10:00 AM", "02:00 PM"]);
  });

  test("returns empty array if Calendar service throws", async () => {
    listAvailableSlots.mockRejectedValue(new Error("Business not found"));
    const result = await realCheckAvailability(
      { service: "haircut", date: "2026-09-20" },
      { businessId: "biz-999" }
    );
    expect(result).toEqual([]);
  });
});

describe("realCreateBooking", () => {
  test("returns missing_fields when data is incomplete", async () => {
    const result = await realCreateBooking({ customerName: "Raj" }, { businessId: "biz-1" });
    expect(result).toEqual({ error: "missing_fields" });
  });

  test("converts time to 24h before calling Calendar service", async () => {
    createCalendarBooking.mockResolvedValue({ bookingId: "b-1", googleEventId: "g-1" });
    const result = await realCreateBooking(
      { customerName: "Raj", service: "haircut", date: "2026-09-20", time: "03:00 PM" },
      { businessId: "biz-1" }
    );
    expect(createCalendarBooking).toHaveBeenCalledWith("biz-1", expect.objectContaining({ time: "15:00" }));
    expect(result).toEqual({ success: true, bookingId: "b-1" });
  });
});

describe("realFindBooking", () => {
  test("returns not_found when no bookings match", async () => {
    queryCollection.mockResolvedValue([]);
    const result = await realFindBooking({ customerName: "Ghost" }, { businessId: "biz-1" });
    expect(result).toEqual({ error: "not_found" });
  });

  test("returns multiple_matches when more than one booking matches", async () => {
    queryCollection.mockResolvedValue([{ id: "b-1" }, { id: "b-2" }]);
    const result = await realFindBooking({ customerName: "Raj" }, { businessId: "biz-1" });
    expect(result).toEqual({ error: "multiple_matches" });
  });

  test("returns the single matching booking", async () => {
    queryCollection.mockResolvedValue([{ id: "b-1", service: "haircut", date: "2026-09-20" }]);
    const result = await realFindBooking({ customerName: "Raj" }, { businessId: "biz-1" });
    expect(result).toEqual({ bookingId: "b-1", matchedService: "haircut", matchedDate: "2026-09-20" });
  });
});

describe("realCancelBooking", () => {
  test("returns missing_fields when bookingId is missing", async () => {
    const result = await realCancelBooking({}, { businessId: "biz-1" });
    expect(result).toEqual({ error: "missing_fields" });
  });

  test("succeeds when Calendar service cancels correctly", async () => {
    cancelCalendarBooking.mockResolvedValue(true);
    const result = await realCancelBooking({ bookingId: "b-1" }, { businessId: "biz-1" });
    expect(result).toEqual({ success: true });
  });
});

describe("realRescheduleBooking", () => {
  test("returns missing_fields when data is incomplete", async () => {
    const result = await realRescheduleBooking({ bookingId: "b-1" }, { businessId: "biz-1" });
    expect(result).toEqual({ error: "missing_fields" });
  });

  test("succeeds and converts time before calling Calendar service", async () => {
    rescheduleCalendarBooking.mockResolvedValue(true);
    const result = await realRescheduleBooking(
      { bookingId: "b-1", newDate: "2026-09-21", newTime: "05:00 PM" },
      { businessId: "biz-1" }
    );
    expect(rescheduleCalendarBooking).toHaveBeenCalledWith(
      "biz-1", "b-1", expect.objectContaining({ time: "17:00" })
    );
    expect(result).toEqual({ success: true, newDate: "2026-09-21", newTime: "05:00 PM" });
  });
});