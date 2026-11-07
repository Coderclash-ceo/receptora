// src/agents/revenue/revenue.agent.test.js
jest.mock("../../services/llm.service", () => ({
  callAgent: jest.fn(),
}));

const { callAgent } = require("../../services/llm.service");
const { runRevenueAgent } = require("./revenue.agent");

describe("Revenue Agent - businessId guard and core logic", () => {
  beforeEach(() => {
    callAgent.mockClear();
  });

  test("returns missing_business_context error when business is missing", async () => {
    const result = await runRevenueAgent(null);
    expect(result).toEqual({ error: "missing_business_context" });
  });

  test("returns missing_business_context error when businessId is missing", async () => {
    const result = await runRevenueAgent({ name: "Test Salon" });
    expect(result).toEqual({ error: "missing_business_context" });
  });

  test("returns an alert when callAgent succeeds", async () => {
    callAgent.mockResolvedValue({
      ok: true,
      response: {
        content: [{ type: "text", text: "Thursday afternoons are underbooked - consider a promo." }],
      },
    });

    const result = await runRevenueAgent({ businessId: "business-A", name: "Test Salon" });
    expect(result.alert).toBe("Thursday afternoons are underbooked - consider a promo.");
  });

  test("returns error when callAgent fails", async () => {
    callAgent.mockResolvedValue({ ok: false, error: "network_error" });

    const result = await runRevenueAgent({ businessId: "business-B", name: "Test Salon" });
    expect(result).toEqual({ error: "network_error" });
  });

  test("skips re-alerting the same gap pattern within a session", async () => {
    callAgent.mockResolvedValue({
      ok: true,
      response: {
        content: [{ type: "text", text: "Alert message" }],
      },
    });

    const business = { businessId: "business-C", name: "Test Salon" };
    await runRevenueAgent(business); // first call, should alert
    const secondResult = await runRevenueAgent(business); // second call, same gaps, should skip

    expect(secondResult).toEqual({ skipped: "already_alerted_this_session" });
  });
});