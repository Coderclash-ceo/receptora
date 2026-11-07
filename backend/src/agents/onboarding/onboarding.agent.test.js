// src/agents/onboarding/onboarding.agent.test.js
jest.mock("../../services/llm.service", () => ({
  callAgent: jest.fn(),
}));

const { callAgent } = require("../../services/llm.service");
const { runOnboardingAgent, ONBOARDING_PROMPT } = require("./onboarding.agent");

describe("Onboarding Agent - structured extraction", () => {
  beforeEach(() => {
    callAgent.mockClear();
  });

  test("returns missing_input when rawText is empty or not a string", async () => {
    expect(await runOnboardingAgent(null)).toEqual({ error: "missing_input" });
    expect(await runOnboardingAgent("")).toEqual({ error: "missing_input" });
    expect(await runOnboardingAgent("   ")).toEqual({ error: "missing_input" });
    expect(await runOnboardingAgent(123)).toEqual({ error: "missing_input" });
  });

  test("successfully parses clean business description into structured 7-day schema", async () => {
    const mockOutput = {
      services: [
        { name: "Haircut", price: 350 },
        { name: "Beard Trim", price: 150 },
      ],
      hours: {
        mon: "10:00 AM - 8:00 PM",
        tue: "10:00 AM - 8:00 PM",
        wed: "10:00 AM - 8:00 PM",
        thu: "10:00 AM - 8:00 PM",
        fri: "10:00 AM - 8:00 PM",
        sat: "10:00 AM - 8:00 PM",
        sun: "closed",
      },
    };

    callAgent.mockResolvedValue({
      ok: true,
      response: {
        content: [{ type: "text", text: JSON.stringify(mockOutput) }],
      },
    });

    const result = await runOnboardingAgent("We are Glow Salon. Haircut 350, Beard Trim 150. Mon-Sat 10am-8pm, Sunday closed.");

    expect(result).toEqual(mockOutput);
    expect(callAgent).toHaveBeenCalledWith(
      ONBOARDING_PROMPT,
      [],
      [{ role: "user", content: "We are Glow Salon. Haircut 350, Beard Trim 150. Mon-Sat 10am-8pm, Sunday closed." }]
    );
  });

  test("handles missing prices/hours correctly with null values", async () => {
    const mockOutput = {
      services: [
        { name: "Bridal Makeup", price: null },
      ],
      hours: {
        mon: null,
        tue: null,
        wed: null,
        thu: null,
        fri: null,
        sat: null,
        sun: null,
      },
    };

    callAgent.mockResolvedValue({
      ok: true,
      response: {
        content: [{ type: "text", text: JSON.stringify(mockOutput) }],
      },
    });

    const result = await runOnboardingAgent("We do Bridal Makeup, call for prices.");
    expect(result.services[0].price).toBeNull();
    expect(result.hours.mon).toBeNull();
  });

  test("handles malformed JSON from LLM gracefully", async () => {
    callAgent.mockResolvedValue({
      ok: true,
      response: {
        content: [{ type: "text", text: "Here is your JSON: { invalid json ... }" }],
      },
    });

    const result = await runOnboardingAgent("Some business info");
    expect(result.error).toBe("invalid_json");
    expect(result.raw).toBe("Here is your JSON: { invalid json ... }");
  });

  test("handles LLM API error gracefully", async () => {
    callAgent.mockResolvedValue({
      ok: false,
      error: "Rate limit exceeded",
    });

    const result = await runOnboardingAgent("Some business info");
    expect(result).toEqual({ error: "Rate limit exceeded" });
  });

  test("handles missing text block in response gracefully", async () => {
    callAgent.mockResolvedValue({
      ok: true,
      response: {
        content: [],
      },
    });

    const result = await runOnboardingAgent("Some business info");
    expect(result).toEqual({ error: "no_text_response" });
  });
});
