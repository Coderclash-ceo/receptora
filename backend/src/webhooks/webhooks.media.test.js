// src/webhooks/webhooks.media.test.js
// Tests WhatsApp and Instagram webhook handling of media messages (images, voice notes)

jest.mock("../services/llm.service", () => ({
  callAgent: jest.fn(),
}));

jest.mock("../services/firestore.service", () => ({
  getDoc: jest.fn(),
  appendMessage: jest.fn(),
  getConversation: jest.fn(),
  findBusinessByPhoneNumberId: jest.fn(),
  findBusinessByInstagramAccountId: jest.fn(),
}));

jest.mock("../services/whatsapp.service", () => ({
  sendMessage: jest.fn(),
}));

jest.mock("../services/instagram.service", () => ({
  sendMessage: jest.fn(),
}));

jest.mock("../middleware/tenantResolver", () => ({
  resolveBusinessId: jest.fn(),
}));

const { callAgent } = require("../services/llm.service");
const { getDoc, appendMessage, getConversation, findBusinessByInstagramAccountId } = require("../services/firestore.service");
const { sendMessage: sendWhatsAppMessage } = require("../services/whatsapp.service");
const { sendMessage: sendInstagramMessage } = require("../services/instagram.service");
const { resolveBusinessId } = require("../middleware/tenantResolver");

// Import express to create a test harness
const express = require("express");
const request = require("node-fetch"); // or simple mock handler test
const whatsappRouter = require("./whatsapp.webhook");
const instagramRouter = require("./instagram.webhook");

describe("Media Message Webhooks (WhatsApp & Instagram)", () => {
  const mockBusiness = {
    id: "test-business-1",
    name: "Just Look Salon",
    whatsappPhoneNumberId: "1171981929341103",
    whatsappToken: "mock-wa-token",
    instagramAccountId: "17841443859190444",
    instagramToken: "mock-ig-token",
    services: [
      { name: "Haircut", price: 300 },
      { name: "Hair Color", price: 900 },
    ],
    hours: { "mon-sat": "09:00-20:00", sun: "closed" },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getDoc.mockResolvedValue(mockBusiness);
    getConversation.mockResolvedValue([]);
    appendMessage.mockResolvedValue({ role: "user", text: "ok" });
    resolveBusinessId.mockResolvedValue({ found: true, businessId: "test-business-1" });
    findBusinessByInstagramAccountId.mockResolvedValue(mockBusiness);
    sendWhatsAppMessage.mockResolvedValue({ ok: true, id: "wamid.123" });
    sendInstagramMessage.mockResolvedValue({ ok: true, id: "mid.123" });
    callAgent.mockResolvedValue({
      ok: true,
      response: {
        content: [{ type: "text", text: "Thank you for the reference! Our stylists will love creating this look for you." }],
      },
    });
  });

  test("WhatsApp Image Webhook processes photo message and replies via AI", async () => {
    const app = express();
    app.use(express.json());
    app.use("/", whatsappRouter);

    const server = app.listen(0);
    const port = server.address().port;

    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "1171981929341103", display_phone_number: "15556641838" },
                messages: [
                  {
                    from: "918369297980",
                    id: "wamid.photo.123",
                    type: "image",
                    image: {
                      caption: "Can you do this balayage on Saturday?",
                      mime_type: "image/jpeg",
                      id: "media_img_999",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const res = await request(`http://localhost:${port}/webhook/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);

    // Wait for async processing
    await new Promise((r) => setTimeout(r, 100));

    // Verify appendMessage was called with mediaType image
    expect(appendMessage).toHaveBeenCalledWith(
      "test-business-1",
      "918369297980",
      expect.objectContaining({
        role: "user",
        mediaType: "image",
        text: expect.stringContaining("balayage"),
      })
    );

    // Verify outbound WhatsApp reply was dispatched
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      "918369297980",
      expect.stringContaining("Thank you"),
      expect.any(Object)
    );

    server.close();
  });

  test("WhatsApp Audio/Voice Webhook processes voice note and replies via AI", async () => {
    const app = express();
    app.use(express.json());
    app.use("/", whatsappRouter);

    const server = app.listen(0);
    const port = server.address().port;

    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "1171981929341103", display_phone_number: "15556641838" },
                messages: [
                  {
                    from: "918369297980",
                    id: "wamid.voice.123",
                    type: "audio",
                    audio: {
                      mime_type: "audio/ogg",
                      id: "media_audio_999",
                      voice: true,
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const res = await request(`http://localhost:${port}/webhook/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 100));

    expect(appendMessage).toHaveBeenCalledWith(
      "test-business-1",
      "918369297980",
      expect.objectContaining({
        role: "user",
        mediaType: "audio",
        text: expect.stringContaining("Voice Note"),
      })
    );

    server.close();
  });

  test("Instagram Image Webhook processes photo DM and replies via AI", async () => {
    const app = express();
    app.use(express.json());
    app.use("/", instagramRouter);

    const server = app.listen(0);
    const port = server.address().port;

    const payload = {
      object: "instagram",
      entry: [
        {
          id: "17841443859190444",
          messaging: [
            {
              sender: { id: "ig_user_456" },
              recipient: { id: "17841443859190444" },
              message: {
                mid: "m_ig_photo_1",
                text: "Love this style, can I get it?",
                attachments: [
                  {
                    type: "image",
                    payload: { url: "https://lookaside.fbsbx.com/ig_photo.jpg" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const res = await request(`http://localhost:${port}/webhook/instagram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 100));

    expect(appendMessage).toHaveBeenCalledWith(
      "test-business-1",
      "ig_ig_user_456",
      expect.objectContaining({
        role: "user",
        mediaType: "image",
        mediaUrl: "https://lookaside.fbsbx.com/ig_photo.jpg",
      })
    );

    expect(sendInstagramMessage).toHaveBeenCalledWith(
      "17841443859190444",
      "ig_user_456",
      expect.stringContaining("Thank you"),
      expect.any(Object)
    );

    server.close();
  });
});
