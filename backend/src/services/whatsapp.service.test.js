// src/services/whatsapp.service.test.js

describe("WhatsApp Service - sendMessage", () => {
  const originalEnv = process.env;
  let originalFetch;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      WHATSAPP_PHONE_NUMBER_ID: "test-phone-id-123",
      WHATSAPP_TOKEN: "test-token-xyz",
    };
    originalFetch = global.fetch;
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test("returns error if destination phone or text is missing", async () => {
    const { sendMessage } = require("./whatsapp.service");

    const resNoTo = await sendMessage("", "Hello");
    expect(resNoTo).toEqual({ ok: false, error: "missing_destination_or_text" });

    const resNoText = await sendMessage("919876543210", "");
    expect(resNoText).toEqual({ ok: false, error: "missing_destination_or_text" });
  });

  test("sends message successfully via Meta Graph API", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        messaging_product: "whatsapp",
        contacts: [{ input: "919876543210", wa_id: "919876543210" }],
        messages: [{ id: "wamid.HBgLMTIzNDU2" }],
      }),
    });

    const { sendMessage } = require("./whatsapp.service");
    const result = await sendMessage("919876543210", "Hi Raj, your haircut is booked!");

    expect(result).toEqual({ ok: true, id: "wamid.HBgLMTIzNDU2" });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://graph.facebook.com/v20.0/test-phone-id-123/messages",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer test-token-xyz",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: "919876543210",
          type: "text",
          text: { body: "Hi Raj, your haircut is booked!" },
        }),
      })
    );
  });

  test("handles Meta API error response gracefully", async () => {
    const errorPayload = {
      error: {
        message: "Invalid OAuth access token",
        type: "OAuthException",
        code: 190,
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => errorPayload,
    });

    const { sendMessage } = require("./whatsapp.service");
    const result = await sendMessage("919876543210", "Test message");

    expect(result).toEqual({ ok: false, error: errorPayload });
  });

  test("handles network exception gracefully", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network timeout"));

    const { sendMessage } = require("./whatsapp.service");
    const result = await sendMessage("919876543210", "Test message");

    expect(result).toEqual({ ok: false, error: "Network timeout" });
  });
});
