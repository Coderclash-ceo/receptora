const {
  timeStringToDate,
  formatRFC3339,
  formatTimeInTimezone,
  getDateString,
  parseHoursForDay,
  createEvent,
  rescheduleEvent,
  cancelEvent,
  listAvailableSlots,
  createCalendarBooking,
  cancelCalendarBooking,
  rescheduleCalendarBooking,
} = require("./calendar.service");

// Mock dependencies
jest.mock("../config/googleCalendar", () => ({
  calendar: {
    events: {
      insert: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      list: jest.fn(),
    },
  },
}));

jest.mock("./firestore.service", () => ({
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));

const { calendar } = require("../config/googleCalendar");
const { getDoc, setDoc } = require("./firestore.service");

describe("calendar.service - Timezone & Booking Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Timezone formatting and parsing (Asia/Kolkata +05:30)", () => {
    test("timeStringToDate parses date string and time into an IST timestamp (+05:30)", () => {
      const dt = timeStringToDate("2026-10-03", "16:00");
      // 16:00 IST is 10:30 UTC
      expect(dt.toISOString()).toBe("2026-10-03T10:30:00.000Z");
    });

    test("timeStringToDate parses Date instance and time into an IST timestamp", () => {
      const baseDate = new Date(2026, 9, 3);
      const dt = timeStringToDate(baseDate, "16:00");
      expect(dt.toISOString()).toBe("2026-10-03T10:30:00.000Z");
    });

    test("formatRFC3339 outputs exact RFC3339 string with +05:30 offset", () => {
      const dt = timeStringToDate("2026-10-03", "16:00");
      const rfc = formatRFC3339(dt);
      expect(rfc).toBe("2026-10-03T16:00:00+05:30");
    });

    test("formatTimeInTimezone outputs correct 24h HH:MM in Asia/Kolkata", () => {
      // 10:30 UTC is 16:00 IST
      const dt = new Date("2026-10-03T10:30:00.000Z");
      expect(formatTimeInTimezone(dt)).toBe("16:00");
    });

    test("getDateString extracts YYYY-MM-DD reliably from string or Date", () => {
      expect(getDateString("2026-10-03")).toBe("2026-10-03");
      expect(getDateString(new Date("2026-10-03T10:30:00.000Z"))).toBe("2026-10-03");
    });

    test("parseHoursForDay identifies day and hours in IST", () => {
      const hours = { "mon-sat": "10:00-20:00", sun: "closed" };
      // 2026-10-03 is Saturday
      expect(parseHoursForDay(hours, "2026-10-03")).toBe("10:00-20:00");
      // 2026-10-04 is Sunday
      expect(parseHoursForDay(hours, "2026-10-04")).toBeNull();
    });
  });

  describe("createEvent & rescheduleEvent - Prevention of 5h30m shift in Google Calendar", () => {
    test("createEvent sends RFC3339 dateTime with +05:30 offset, not UTC 'Z'", async () => {
      calendar.events.insert.mockResolvedValue({ data: { id: "evt_123" } });

      const startTime = timeStringToDate("2026-10-03", "16:00");
      const endTime = new Date(startTime.getTime() + 30 * 60000);

      const res = await createEvent("cal_test_123", {
        summary: "haircut - Kashyap makwana",
        startTime,
        endTime,
        description: "Booked via NudgeOS",
      });

      expect(res.id).toBe("evt_123");
      expect(calendar.events.insert).toHaveBeenCalledWith({
        calendarId: "cal_test_123",
        requestBody: {
          summary: "haircut - Kashyap makwana",
          description: "Booked via NudgeOS",
          start: {
            dateTime: "2026-10-03T16:00:00+05:30",
            timeZone: "Asia/Kolkata",
          },
          end: {
            dateTime: "2026-10-03T16:30:00+05:30",
            timeZone: "Asia/Kolkata",
          },
        },
      });
    });

    test("rescheduleEvent sends RFC3339 dateTime with +05:30 offset", async () => {
      calendar.events.patch.mockResolvedValue({ data: { id: "evt_123" } });

      const newStartTime = timeStringToDate("2026-10-04", "11:00");
      const newEndTime = new Date(newStartTime.getTime() + 45 * 60000);

      await rescheduleEvent("cal_test_123", "evt_123", { newStartTime, newEndTime });

      expect(calendar.events.patch).toHaveBeenCalledWith({
        calendarId: "cal_test_123",
        eventId: "evt_123",
        requestBody: {
          start: {
            dateTime: "2026-10-04T11:00:00+05:30",
            timeZone: "Asia/Kolkata",
          },
          end: {
            dateTime: "2026-10-04T11:45:00+05:30",
            timeZone: "Asia/Kolkata",
          },
        },
      });
    });

    test("cancelEvent calls calendar.events.delete", async () => {
      calendar.events.delete.mockResolvedValue({});
      const result = await cancelEvent("cal_test_123", "evt_123");
      expect(result).toBe(true);
      expect(calendar.events.delete).toHaveBeenCalledWith({
        calendarId: "cal_test_123",
        eventId: "evt_123",
      });
    });
  });

  describe("listAvailableSlots", () => {
    const mockBusiness = {
      calendarId: "cal_123",
      hours: { "mon-sat": "10:00-12:00", sun: "closed" },
      services: [{ name: "haircut", durationMin: 30 }],
    };

    test("generates slots within business hours when calendar is free", async () => {
      getDoc.mockResolvedValue(mockBusiness);
      calendar.events.list.mockResolvedValue({ data: { items: [] } });

      const slots = await listAvailableSlots("biz_1", "haircut", "2026-10-03");
      expect(slots).toEqual(["10:00", "10:30", "11:00", "11:30"]);
    });

    test("excludes busy slots occupied by existing calendar events", async () => {
      getDoc.mockResolvedValue(mockBusiness);
      calendar.events.list.mockResolvedValue({
        data: {
          items: [
            {
              start: { dateTime: "2026-10-03T10:30:00+05:30" },
              end: { dateTime: "2026-10-03T11:00:00+05:30" },
            },
          ],
        },
      });

      const slots = await listAvailableSlots("biz_1", "haircut", "2026-10-03");
      expect(slots).toEqual(["10:00", "11:00", "11:30"]);
    });

    test("returns empty array when business is closed on requested date", async () => {
      getDoc.mockResolvedValue(mockBusiness);
      const slots = await listAvailableSlots("biz_1", "haircut", "2026-10-04"); // Sunday
      expect(slots).toEqual([]);
    });
  });

  describe("createCalendarBooking end-to-end", () => {
    const mockBusiness = {
      calendarId: "cal_123",
      hours: { "mon-sat": "10:00-20:00", sun: "closed" },
      services: [{ name: "haircut", durationMin: 30 }],
    };

    test("successfully creates appointment at requested 16:00 IST and saves to Firestore", async () => {
      getDoc.mockResolvedValue(mockBusiness);
      calendar.events.list.mockResolvedValue({ data: { items: [] } });
      calendar.events.insert.mockResolvedValue({ data: { id: "google_evt_456" } });
      setDoc.mockResolvedValue({});

      const result = await createCalendarBooking("biz_1", {
        customerName: "Kashyap makwana",
        service: "haircut",
        date: "2026-10-03",
        time: "16:00",
      });

      expect(result.ok).toBe(true);
      expect(result.googleEventId).toBe("google_evt_456");
      expect(result.bookingId).toBeDefined();

      // Ensure calendar event start was 16:00+05:30
      expect(calendar.events.insert).toHaveBeenCalledWith({
        calendarId: "cal_123",
        requestBody: expect.objectContaining({
          start: {
            dateTime: "2026-10-03T16:00:00+05:30",
            timeZone: "Asia/Kolkata",
          },
          end: {
            dateTime: "2026-10-03T16:30:00+05:30",
            timeZone: "Asia/Kolkata",
          },
        }),
      });

      // Ensure Firestore document was saved with 16:00
      expect(setDoc).toHaveBeenCalledWith(
        "bookings",
        "biz_1",
        expect.any(String),
        expect.objectContaining({
          customerName: "Kashyap makwana",
          service: "haircut",
          date: "2026-10-03",
          time: "16:00",
          googleEventId: "google_evt_456",
        })
      );
    });

    test("rejects slot when outside business hours", async () => {
      getDoc.mockResolvedValue(mockBusiness);

      const result = await createCalendarBooking("biz_1", {
        customerName: "Kashyap makwana",
        service: "haircut",
        date: "2026-10-03",
        time: "21:00", // After 20:00 close
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("Requested slot is outside business hours");
    });

    test("rejects slot when overlapping with an existing event", async () => {
      getDoc.mockResolvedValue(mockBusiness);
      calendar.events.list.mockResolvedValue({
        data: {
          items: [
            {
              start: { dateTime: "2026-10-03T16:00:00+05:30" },
              end: { dateTime: "2026-10-03T16:30:00+05:30" },
            },
          ],
        },
      });

      const result = await createCalendarBooking("biz_1", {
        customerName: "John Doe",
        service: "haircut",
        date: "2026-10-03",
        time: "16:00",
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("Requested slot overlaps with an existing booking");
    });
  });

  describe("cancelCalendarBooking & rescheduleCalendarBooking", () => {
    const mockBusiness = {
      calendarId: "cal_123",
      services: [{ name: "haircut", durationMin: 30 }],
    };
    const mockBooking = {
      customerName: "Kashyap makwana",
      service: "haircut",
      date: "2026-10-03",
      time: "16:00",
      googleEventId: "google_evt_456",
    };

    test("cancelCalendarBooking deletes event from Google Calendar", async () => {
      getDoc
        .mockResolvedValueOnce(mockBusiness)
        .mockResolvedValueOnce(mockBooking);
      calendar.events.delete.mockResolvedValue({});

      const result = await cancelCalendarBooking("biz_1", "booking_123");
      expect(result).toBe(true);
      expect(calendar.events.delete).toHaveBeenCalledWith({
        calendarId: "cal_123",
        eventId: "google_evt_456",
      });
    });

    test("rescheduleCalendarBooking patches Google Calendar event and updates Firestore", async () => {
      getDoc
        .mockResolvedValueOnce(mockBusiness)
        .mockResolvedValueOnce(mockBooking);
      calendar.events.patch.mockResolvedValue({ data: { id: "google_evt_456" } });
      setDoc.mockResolvedValue({});

      const result = await rescheduleCalendarBooking("biz_1", "booking_123", {
        date: "2026-10-05",
        time: "17:00",
      });

      expect(result).toBe(true);
      expect(calendar.events.patch).toHaveBeenCalledWith({
        calendarId: "cal_123",
        eventId: "google_evt_456",
        requestBody: {
          start: {
            dateTime: "2026-10-05T17:00:00+05:30",
            timeZone: "Asia/Kolkata",
          },
          end: {
            dateTime: "2026-10-05T17:30:00+05:30",
            timeZone: "Asia/Kolkata",
          },
        },
      });
      expect(setDoc).toHaveBeenCalledWith(
        "bookings",
        "biz_1",
        "booking_123",
        expect.objectContaining({
          date: "2026-10-05",
          time: "17:00",
        })
      );
    });
  });
});
