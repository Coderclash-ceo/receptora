// src/agents/reception/reception.agent.js

const { callAgent } = require("../../services/llm.service");
const { buildReceptionPrompt } = require("./reception.prompt");
const { receptionTools } = require("./reception.tools");
const {
  checkAvailability,
  createBooking,
  findBooking,
  cancelBooking,
  rescheduleBooking,
} = require("./reception.calendar");

function buildMessageWindow(fullHistory, incomingMessage, maxTurns = 10) {
  const recent = fullHistory.slice(-maxTurns);
  return [...recent, { role: "user", content: incomingMessage }];
}

async function executeTool(name, input, business) {
  if (name === "check_availability") {
    return await checkAvailability(input, business);
  }
  if (name === "create_booking") {
    const payload = business?.customerPhone ? { ...input, customerPhone: business.customerPhone } : input;
    return await createBooking(payload, business);
  }
  if (name === "find_booking") {
    const payload = business?.customerPhone ? { ...input, customerPhone: business.customerPhone } : input;
    return await findBooking(payload, business);
  }
  if (name === "cancel_booking") {
    return await cancelBooking(input, business);
  }
  if (name === "reschedule_booking") {
    return await rescheduleBooking(input, business);
  }
  return { error: "unknown_tool" };
}

async function handleReceptionMessage(business, conversationHistory, incomingMessage, options = {}) {
  const customerPhone = options.customerPhone || business?.customerPhone;
  const normalizedBusiness = {
    ...business,
    businessId: business?.businessId || business?.id,
    ...(customerPhone ? { customerPhone } : {}),
  };

  const todayDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const systemPrompt = buildReceptionPrompt(normalizedBusiness, todayDate);
  const messages = buildMessageWindow(conversationHistory, incomingMessage);
  let conversation = [...messages];
  let currentResult = await callAgent(systemPrompt, receptionTools, conversation);
  if (!currentResult.ok) {
    return { reply: "Sorry, I'm having trouble right now - please try again in a moment." };
  }

  const MAX_TOOL_TURNS = 3;
  let turns = 0;

  while (turns < MAX_TOOL_TURNS) {
    const toolUseBlock = currentResult.response?.content?.find((b) => b.type === "tool_use");
    if (!toolUseBlock) {
      break;
    }

    turns++;
    let toolResult;
    try {
      toolResult = await executeTool(toolUseBlock.name, toolUseBlock.input, normalizedBusiness);
    } catch (err) {
      console.error("[reception.agent] executeTool failed:", err.message);
      toolResult = { error: "tool_execution_failed" };
    }

    conversation = [
      ...conversation,
      { role: "assistant", content: currentResult.response.content },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUseBlock.id,
            name: toolUseBlock.name,
            content: JSON.stringify(toolResult),
          },
        ],
      },
    ];

    currentResult = await callAgent(systemPrompt, receptionTools, conversation);
    if (!currentResult.ok) {
      return { reply: "Sorry, I'm having trouble right now - please try again in a moment." };
    }
  }

  const textBlock = currentResult.response?.content?.find((b) => b.type === "text");
  return { reply: textBlock && textBlock.text ? textBlock.text : "I've checked the details. How would you like to proceed?" };
}

module.exports = { handleReceptionMessage, executeTool };
