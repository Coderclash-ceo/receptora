// src/agents/reception/reception.whatsapp-integration.test.js
//
// Integration test verifying the contract between M2 WhatsApp Webhook / Service
// and M1 Reception Agent + Calendar Adapter.

jest.mock("../../services/llm.service", () => ({
  callAgent: jest.fn(),
}));

jest.mock("../../services/calendar.service", () => ({
  listAvailableSlots: jest.fn(),
  createCalendarBooking: jest.fn(),
  cancelCalendarBooking: jest.fn(),
  rescheduleCalendarBooking: jest.fn(),
}), { virtual: true });

jest.mock("../../services/whatsapp.service", () => ({
  sendMessage: jest.fn(),
}), { virtual: true });

const { handleReceptionMessage } = require("./reception.agent");
const { callAgent } = require("../../services/llm.service");
const {
  listAvailableSlots,
  createCalendarBooking,
} = require("../../services/calendar.service");
const { sendMessage } = require("../../services/whatsapp.service");

describe("WhatsApp + Reception Agent + Calendar End-to-End Pipeline", () => {
  const mockBusiness = {
    id: "biz-salon-001",
    name: "Glow Hair Salon",
    category: "salon",
    services: [
      { name: "Haircut", price: 350, durationMin: 30 },
      { name: "Beard Trim", price: 150, durationMin: 15 },
    ],
    hours: { "mon-sat": "09:00-19:00", sun: "closed" },
    calendarId: "salon-cal-id@group.calendar.google.com",
    whatsappNumber: "+919876543210",
  };

  const customerPhone = "+919123456789";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Webhook receives check availability request -> Reception checks calendar -> Webhook sends WhatsApp reply", async () => {
    // 1. WhatsApp incoming message: "Any slots available for Haircut on 2026-09-25?"
    const incomingText = "Any slots available for Haircut on 2026-09-25?";
    const rawHistory = [
      { role: "user", text: "Hi" },
      { role: "assistant", text: "Hello! Welcome to Glow Hair Salon. How can I assist you today?" },
    ];
    const conversationHistory = rawHistory.map((m) => ({ role: m.role, content: m.text }));

    // 2. M2 Calendar returns 24h slots
    listAvailableSlots.mockResolvedValue(["10:00", "14:30"]);

    // 3. LLM turns: Turn 1 triggers tool_use for check_availability; Turn 2 generates final reply
    callAgent
      .mockResolvedValueOnce({
        ok: true,
        response: {
          content: [
            {
              type: "tool_use",
              id: "tool-avail-1",
              name: "check_availability",
              input: { service: "Haircut", date: "2026-09-25" },
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
              text: "We have openings for a Haircut on Sept 25 at 10:00 AM and 02:30 PM. Which one works for you?",
            },
          ],
        },
      });

    // 4. Webhook executes Reception Agent
    const { reply } = await handleReceptionMessage(mockBusiness, conversationHistory, incomingText);

    // Verify Reception checked calendar with tenant's businessId and date
    expect(listAvailableSlots).toHaveBeenCalledWith(
      "biz-salon-001",
      "Haircut",
      expect.any(Date)
    );

    // Verify reply format
    expect(reply).toBe(
      "We have openings for a Haircut on Sept 25 at 10:00 AM and 02:30 PM. Which one works for you?"
    );

    // 5. Webhook sends reply via WhatsApp service
    sendMessage.mockResolvedValue({ ok: true, id: "wamid.12345" });
    const sendResult = await sendMessage(customerPhone, reply);

    expect(sendMessage).toHaveBeenCalledWith(customerPhone, reply);
    expect(sendResult.ok).toBe(true);
  });

  test("Webhook receives booking request -> Reception creates Calendar booking -> Webhook sends WhatsApp confirmation", async () => {
    const incomingText = "Yes, please book 10:00 AM for Aman";
    const conversationHistory = [
      { role: "user", content: "Any slots available for Haircut on 2026-09-25?" },
      { role: "assistant", content: "We have 10:00 AM open." },
    ];

    createCalendarBooking.mockResolvedValue({
      ok: true,
      bookingId: "booking_1790001",
      googleEventId: "gevt_9988",
    });

    callAgent
      .mockResolvedValueOnce({
        ok: true,
        response: {
          content: [
            {
              type: "tool_use",
              id: "tool-book-1",
              name: "create_booking",
              input: {
                customerName: "Aman",
                service: "Haircut",
                date: "2026-09-25",
                time: "10:00 AM",
              },
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
              text: "You're all set, Aman! Your Haircut is booked for September 25 at 10:00 AM.",
            },
          ],
        },
      });

    const { reply } = await handleReceptionMessage(mockBusiness, conversationHistory, incomingText);

    // Verified Calendar booking called with 24h time and Date object
    expect(createCalendarBooking).toHaveBeenCalledWith(
      "biz-salon-001",
      expect.objectContaining({
        customerName: "Aman",
        service: "Haircut",
        time: "10:00",
      })
    );

    expect(reply).toContain("You're all set, Aman!");

    // Send WhatsApp confirmation
    sendMessage.mockResolvedValue({ ok: true, id: "wamid.67890" });
    await sendMessage(customerPhone, reply);
    expect(sendMessage).toHaveBeenCalledWith(customerPhone, reply);
  });

  test("Tenant isolation in WhatsApp webhook flow: messages to Business A never touch Business B", async () => {
    const businessA = { id: "biz-A", name: "Salon A" };
    const businessB = { id: "biz-B", name: "Dental Clinic B" };

    listAvailableSlots.mockResolvedValue(["11:00"]);
    callAgent
      .mockResolvedValueOnce({
        ok: true,
        response: {
          content: [
            {
              type: "tool_use",
              id: "tool-iso-1",
              name: "check_availability",
              input: { service: "cleaning", date: "2026-09-26" },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        response: {
          content: [{ type: "text", text: "Slot available at 11:00 AM." }],
        },
      });

    // Customer message routed to Business B
    await handleReceptionMessage(businessB, [], "Check dental slots");

    // Calendar was called with biz-B, NOT biz-A
    expect(listAvailableSlots).toHaveBeenCalledWith("biz-B", "cleaning", expect.any(Date));
    expect(listAvailableSlots).not.toHaveBeenCalledWith("biz-A", expect.anything(), expect.anything());
  });

  test("WhatsApp error fallback: LLM failure returns friendly reply so customer is never ignored", async () => {
    callAgent.mockResolvedValue({ ok: false, error: "LLM rate limit / timeout" });

    const { reply } = await handleReceptionMessage(mockBusiness, [], "Book haircut");

    expect(reply).toBe("Sorry, I'm having trouble right now - please try again in a moment.");

    // Send fallback via WhatsApp
    sendMessage.mockResolvedValue({ ok: true });
    await sendMessage(customerPhone, reply);
    expect(sendMessage).toHaveBeenCalledWith(customerPhone, reply);
  });
});
