// src/scheduler/cron.test.js

jest.mock("../services/firestore.service", () => ({
  getAllBusinesses: jest.fn(),
  saveRevenueAlert: jest.fn(),
  logRetentionSend: jest.fn(),
}));

jest.mock("../agents/retention/retention.agent", () => ({
  runRetentionAgent: jest.fn(),
}));

jest.mock("../agents/revenue/revenue.agent", () => ({
  runRevenueAgent: jest.fn(),
}));

const { runRetentionJob, runRevenueJob } = require("./cron");
const { getAllBusinesses, logRetentionSend, saveRevenueAlert } = require("../services/firestore.service");
const { runRetentionAgent } = require("../agents/retention/retention.agent");
const { runRevenueAgent } = require("../agents/revenue/revenue.agent");

describe("Cron Scheduler - Job execution and deduplication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("runRetentionJob", () => {
    test("does not double-log retention sends when already logged by retention.agent", async () => {
      getAllBusinesses.mockResolvedValue([{ id: "biz-1" }]);
      runRetentionAgent.mockResolvedValue([
        { customerId: "cust-1", sent: true, logged: true, messageText: "We miss you!" },
      ]);

      await runRetentionJob();

      expect(runRetentionAgent).toHaveBeenCalledWith("biz-1");
      expect(logRetentionSend).not.toHaveBeenCalled();
    });

    test("logs retention send if agent sent message but did not log it", async () => {
      getAllBusinesses.mockResolvedValue([{ id: "biz-1" }]);
      runRetentionAgent.mockResolvedValue([
        { customerId: "cust-2", sent: true, logged: false, messageText: "Hello from salon" },
      ]);

      await runRetentionJob();

      expect(runRetentionAgent).toHaveBeenCalledWith("biz-1");
      expect(logRetentionSend).toHaveBeenCalledWith("biz-1", "cust-2", "Hello from salon");
    });

    test("does not log if message was not sent", async () => {
      getAllBusinesses.mockResolvedValue([{ id: "biz-1" }]);
      runRetentionAgent.mockResolvedValue([
        { customerId: "cust-3", sent: false, skipped: "already_sent_this_session" },
      ]);

      await runRetentionJob();

      expect(logRetentionSend).not.toHaveBeenCalled();
    });
  });

  describe("runRevenueJob", () => {
    test("saves revenue alert when agent generates alert", async () => {
      getAllBusinesses.mockResolvedValue([{ id: "biz-1" }]);
      runRevenueAgent.mockResolvedValue({ alertText: "Thursday 14:00-17:00 underbooked" });

      await runRevenueJob();

      expect(runRevenueAgent).toHaveBeenCalledWith("biz-1");
      expect(saveRevenueAlert).toHaveBeenCalledWith("biz-1", "Thursday 14:00-17:00 underbooked");
    });
  });
});

