// src/agents/retention/retention.agent.test.js
jest.mock("../../services/llm.service", () => ({
  callAgent: jest.fn(),
}));
jest.mock("../../services/firestore.service", () => ({
  getInactiveCustomers: jest.fn(),
  logRetentionSend: jest.fn(),
}), { virtual: true });
jest.mock("../../services/whatsapp.service", () => ({
  sendMessage: jest.fn(),
}), { virtual: true });

const { callAgent } = require("../../services/llm.service");
const { getInactiveCustomers, logRetentionSend } = require("../../services/firestore.service");
const { sendMessage } = require("../../services/whatsapp.service");
const { runRetentionAgent, alreadySentThisSession } = require("./retention.agent");

describe("Retention Agent - businessId guard and core logic", () => {
  beforeEach(() => {
    callAgent.mockClear();
    getInactiveCustomers.mockClear();
    logRetentionSend.mockClear();
    sendMessage.mockClear();
  });

  test("returns missing_business_context error when business is missing", async () => {
    const result = await runRetentionAgent(null);
    expect(result).toEqual([{ error: "missing_business_context" }]);
  });

  test("returns missing_business_context error when businessId is missing", async () => {
    const result = await runRetentionAgent({ name: "Test Salon" });
    expect(result).toEqual([{ error: "missing_business_context" }]);
  });

  test("drafts a message for each inactive customer", async () => {
    getInactiveCustomers.mockResolvedValue([
      { id: "cust-1", name: "Raj", lastService: "haircut" },
    ]);
    callAgent.mockResolvedValue({
      ok: true,
      response: {
        content: [{ type: "text", text: "Hi Raj, we miss you!" }],
      },
    });

    const result = await runRetentionAgent({ businessId: "business-X", name: "Test Salon" });
    expect(result[0].customerId).toBe("cust-1");
    expect(result[0].message).toBe("Hi Raj, we miss you!");
    expect(sendMessage).not.toHaveBeenCalled();
  });

  test("skips a customer already messaged this session", async () => {
    getInactiveCustomers.mockResolvedValue([
      { id: "cust-2", name: "Priya", lastService: "facial" },
    ]);
    callAgent.mockResolvedValue({
      ok: true,
      response: {
        content: [{ type: "text", text: "Hi Priya, we miss you!" }],
      },
    });

    const business = { businessId: "business-Y", name: "Test Salon" };
    await runRetentionAgent(business); // first call, should draft
    const secondResult = await runRetentionAgent(business); // second call, same customer, should skip

    expect(secondResult[0].skipped).toBe("already_sent_this_session");
  });

  test("sends WhatsApp message and logs when customer phone is provided", async () => {
    getInactiveCustomers.mockResolvedValue([
      { id: "cust-3", name: "Kunal", phone: "919876543210", lastService: "massage" },
    ]);
    callAgent.mockResolvedValue({
      ok: true,
      response: {
        content: [{ type: "text", text: "Hi Kunal, we miss you at Test Salon!" }],
      },
    });
    sendMessage.mockResolvedValue({ ok: true, id: "wamid.msg-123" });
    logRetentionSend.mockResolvedValue({ ok: true });

    const business = { businessId: "business-Z", name: "Test Salon" };
    const result = await runRetentionAgent(business);

    expect(result[0].customerId).toBe("cust-3");
    expect(result[0].sent).toBe(true);
    expect(result[0].messageId).toBe("wamid.msg-123");
    expect(sendMessage).toHaveBeenCalledWith("919876543210", "Hi Kunal, we miss you at Test Salon!");
    expect(logRetentionSend).toHaveBeenCalledWith(
      "business-Z",
      expect.objectContaining({
        customerId: "cust-3",
        message: "Hi Kunal, we miss you at Test Salon!",
      })
    );
  });

  test("handles sendMessage failure gracefully without throwing", async () => {
    getInactiveCustomers.mockResolvedValue([
      { id: "cust-4", name: "Deepa", phone: "919999999999", lastService: "pedicure" },
    ]);
    callAgent.mockResolvedValue({
      ok: true,
      response: {
        content: [{ type: "text", text: "Hi Deepa, come visit us again!" }],
      },
    });
    sendMessage.mockResolvedValue({ ok: false, error: "Meta API rate limit" });

    const business = { businessId: "business-W", name: "Test Salon" };
    const result = await runRetentionAgent(business);

    expect(result[0].customerId).toBe("cust-4");
    expect(result[0].sent).toBe(false);
    expect(result[0].sendError).toBe("Meta API rate limit");
  });

  test("respects draftOnly option even when customer has phone", async () => {
    getInactiveCustomers.mockResolvedValue([
      { id: "cust-5", name: "Sneha", phone: "918888888888", lastService: "manicure" },
    ]);
    callAgent.mockResolvedValue({
      ok: true,
      response: {
        content: [{ type: "text", text: "Hi Sneha, we miss you!" }],
      },
    });

    const business = { businessId: "business-V", name: "Test Salon" };
    const result = await runRetentionAgent(business, { draftOnly: true });

    expect(result[0].customerId).toBe("cust-5");
    expect(result[0].message).toBe("Hi Sneha, we miss you!");
    expect(sendMessage).not.toHaveBeenCalled();
  });
});