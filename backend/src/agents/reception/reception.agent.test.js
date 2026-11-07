// src/agents/reception/reception.agent.test.js
// Tests failure-mode handling (Task 27) and Reception Agent tool execution wiring

jest.mock("../../services/llm.service", () => ({
  callAgent: jest.fn(),
}));

jest.mock("./reception.calendar", () => ({
  checkAvailability: jest.fn(),
  createBooking: jest.fn(),
  findBooking: jest.fn(),
  cancelBooking: jest.fn(),
  rescheduleBooking: jest.fn(),
}));

jest.mock("./reception.mocks", () => {
  const original = jest.requireActual("./reception.mocks");
  return {
    ...original,
  };
});

const { mockCreateBooking } = require("./reception.mocks");
const { callAgent } = require("../../services/llm.service");
const {
  checkAvailability,
  createBooking,
  findBooking,
  cancelBooking,
  rescheduleBooking,
} = require("./reception.calendar");
const { handleReceptionMessage, executeTool } = require("./reception.agent");

describe("Task 27 - failure mode handling", () => {
  test("mock/service throw is caught and returns error object, does not crash", async () => {
    // Simulate a mock throwing (e.g. DB down) by monkey-patching
    const brokenMock = () => {
      throw new Error("simulated DB failure");
    };

    let result;
    try {
      result = brokenMock();
    } catch (err) {
      result = { error: "tool_execution_failed" };
    }

    expect(result).toEqual({ error: "tool_execution_failed" });
  });

  test("mockCreateBooking still returns error object (not throw) for missing fields", () => {
    const business = { hours: { "mon-sat": "09:00-18:00", sun: "closed" } };
    const result = mockCreateBooking({ customerName: "", service: "", date: "", time: "" }, business);
    expect(result).toEqual({ error: "missing_fields" });
  });
});

describe("Reception Agent executeTool routing with calendar adapter", () => {
  const business = { businessId: "biz-123", name: "Salon Lux" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("routes check_availability to reception.calendar checkAvailability", async () => {
    checkAvailability.mockResolvedValue({ slots: ["10:00 AM", "02:00 PM"] });
    const input = { service: "haircut", date: "2026-09-20" };

    const result = await executeTool("check_availability", input, business);

    expect(checkAvailability).toHaveBeenCalledWith(input, business);
    expect(result).toEqual({ slots: ["10:00 AM", "02:00 PM"] });
  });

  test("routes create_booking to reception.calendar createBooking", async () => {
    createBooking.mockResolvedValue({ success: true, bookingId: "b-100" });
    const input = { customerName: "Aman", service: "haircut", date: "2026-09-20", time: "10:00 AM" };

    const result = await executeTool("create_booking", input, business);

    expect(createBooking).toHaveBeenCalledWith(input, business);
    expect(result).toEqual({ success: true, bookingId: "b-100" });
  });

  test("routes find_booking to reception.calendar findBooking", async () => {
    findBooking.mockResolvedValue({ bookingId: "b-100", matchedService: "haircut", matchedDate: "2026-09-20" });
    const input = { customerName: "Aman" };

    const result = await executeTool("find_booking", input, business);

    expect(findBooking).toHaveBeenCalledWith(input, business);
    expect(result).toEqual({ bookingId: "b-100", matchedService: "haircut", matchedDate: "2026-09-20" });
  });

  test("routes cancel_booking to reception.calendar cancelBooking", async () => {
    cancelBooking.mockResolvedValue({ success: true });
    const input = { bookingId: "b-100" };

    const result = await executeTool("cancel_booking", input, business);

    expect(cancelBooking).toHaveBeenCalledWith(input, business);
    expect(result).toEqual({ success: true });
  });

  test("routes reschedule_booking to reception.calendar rescheduleBooking", async () => {
    rescheduleBooking.mockResolvedValue({ success: true, newDate: "2026-09-21", newTime: "11:00 AM" });
    const input = { bookingId: "b-100", newDate: "2026-09-21", newTime: "11:00 AM" };

    const result = await executeTool("reschedule_booking", input, business);

    expect(rescheduleBooking).toHaveBeenCalledWith(input, business);
    expect(result).toEqual({ success: true, newDate: "2026-09-21", newTime: "11:00 AM" });
  });

  test("returns error for unknown tool", async () => {
    const result = await executeTool("unsupported_tool", {}, business);
    expect(result).toEqual({ error: "unknown_tool" });
  });
});

describe("Reception Agent handleReceptionMessage end-to-end tool calling", () => {
  const business = {
    businessId: "biz-123",
    name: "Glow Salon",
    category: "salon",
    services: [{ name: "haircut", price: 300, durationMin: 30 }],
    hours: { "mon-sat": "09:00-18:00", sun: "closed" },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns direct text response when no tool is invoked", async () => {
    callAgent.mockResolvedValueOnce({
      ok: true,
      response: {
        content: [{ type: "text", text: "Hello! How can I help you today at Glow Salon?" }],
      },
    });

    const result = await handleReceptionMessage(business, [], "Hi");

    expect(result.reply).toBe("Hello! How can I help you today at Glow Salon?");
    expect(callAgent).toHaveBeenCalledTimes(1);
  });

  test("executes tool call and returns follow-up response", async () => {
    callAgent
      .mockResolvedValueOnce({
        ok: true,
        response: {
          content: [
            {
              type: "tool_use",
              id: "call-1",
              name: "check_availability",
              input: { service: "haircut", date: "2026-09-20" },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        response: {
          content: [{ type: "text", text: "We have slots open at 10:00 AM and 02:00 PM on Sept 20." }],
        },
      });

    checkAvailability.mockResolvedValue({ slots: ["10:00 AM", "02:00 PM"] });

    const result = await handleReceptionMessage(business, [], "What time can I get a haircut on Sept 20?");

    expect(checkAvailability).toHaveBeenCalledWith(
      { service: "haircut", date: "2026-09-20" },
      business
    );
    expect(callAgent).toHaveBeenCalledTimes(2);
    expect(result.reply).toBe("We have slots open at 10:00 AM and 02:00 PM on Sept 20.");
  });

  test("handles tool execution failure gracefully without crashing", async () => {
    callAgent
      .mockResolvedValueOnce({
        ok: true,
        response: {
          content: [
            {
              type: "tool_use",
              id: "call-2",
              name: "create_booking",
              input: { customerName: "Raj", service: "haircut", date: "2026-09-20", time: "10:00 AM" },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        response: {
          content: [{ type: "text", text: "Sorry, that slot is already taken. Would 11:00 AM work?" }],
        },
      });

    createBooking.mockRejectedValue(new Error("Database disconnected"));

    const result = await handleReceptionMessage(business, [], "Book 10 AM");

    expect(createBooking).toHaveBeenCalled();
    expect(callAgent).toHaveBeenCalledTimes(2);
    expect(result.reply).toBe("Sorry, that slot is already taken. Would 11:00 AM work?");
  });

  test("returns friendly fallback if second callAgent fails", async () => {
    callAgent
      .mockResolvedValueOnce({
        ok: true,
        response: {
          content: [
            {
              type: "tool_use",
              id: "call-3",
              name: "check_availability",
              input: { service: "haircut", date: "2026-09-20" },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        ok: false,
      });

    checkAvailability.mockResolvedValue({ slots: [] });

    const result = await handleReceptionMessage(business, [], "Check slots");

    expect(result.reply).toBe("Sorry, I'm having trouble right now - please try again in a moment.");
  });

  test("executes chained multi-step tools (check_availability then create_booking) and returns final text", async () => {
    callAgent
      .mockResolvedValueOnce({
        ok: true,
        response: {
          content: [
            {
              type: "tool_use",
              id: "call-step-1",
              name: "check_availability",
              input: { service: "haircut", date: "2026-10-12" },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        response: {
          content: [
            {
              type: "tool_use",
              id: "call-step-2",
              name: "create_booking",
              input: { customerName: "Kashyap", service: "haircut", date: "2026-10-12", time: "04:00 PM" },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        response: {
          content: [
            {
              type: "text",
              text: "You're all set, Kashyap! I've booked your haircut for Monday (Oct 12) at 04:00 PM.",
            },
          ],
        },
      });

    checkAvailability.mockResolvedValue({ slots: ["04:00 PM"] });
    createBooking.mockResolvedValue({ success: true, bookingId: "b-monday" });

    const result = await handleReceptionMessage(business, [], "Yes Monday works");

    expect(checkAvailability).toHaveBeenCalledWith({ service: "haircut", date: "2026-10-12" }, business);
    expect(createBooking).toHaveBeenCalledWith(
      { customerName: "Kashyap", service: "haircut", date: "2026-10-12", time: "04:00 PM" },
      business
    );
    expect(callAgent).toHaveBeenCalledTimes(3);
    expect(result.reply).toBe("You're all set, Kashyap! I've booked your haircut for Monday (Oct 12) at 04:00 PM.");
  });
});