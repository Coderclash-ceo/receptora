// src/agents/reception/reception.isolation.test.js
// Task 28 - Multi-tenancy isolation test (mock-level, zero API cost)

const {
  mockCreateBooking,
  mockCancelBooking,
  mockRescheduleBooking,
} = require("./reception.mocks");
const { buildReceptionPrompt } = require("./reception.prompt");

const businessA = {
  businessId: "business-A",
  name: "Glow Salon",
  category: "salon",
  services: [
    { name: "haircut", price: 300 },
    { name: "facial", price: 800 },
  ],
  hours: { "mon-sat": "09:00-18:00", sun: "closed" },
};

const businessB = {
  businessId: "business-B",
  name: "Apex Dental Clinic",
  category: "dental clinic",
  services: [
    { name: "teeth cleaning", price: 1200 },
    { name: "root canal", price: 5000 },
  ],
  hours: { "mon-sat": "10:00-16:00", sun: "closed" },
};

describe("Task 28 - multi-tenancy isolation", () => {
  test("booking created under Business A cannot be cancelled via Business B", () => {
    const created = mockCreateBooking(
      { customerName: "Raj", service: "haircut", date: "2026-08-17", time: "10:00 AM" },
      businessA
    );
    expect(created.success).toBe(true);

    const cancelAttempt = mockCancelBooking(
      { bookingId: created.bookingId },
      businessB
    );

    expect(cancelAttempt.error).toBe("not_found");
  });

  test("booking created under Business B cannot be cancelled via Business A (symmetric check)", () => {
    const created = mockCreateBooking(
      { customerName: "Maya", service: "teeth cleaning", date: "2026-08-17", time: "11:00 AM" },
      businessB
    );
    expect(created.success).toBe(true);

    const cancelAttempt = mockCancelBooking(
      { bookingId: created.bookingId },
      businessA
    );

    expect(cancelAttempt.error).toBe("not_found");
  });

  test("booking created under Business A cannot be rescheduled via Business B", () => {
    const created = mockCreateBooking(
      { customerName: "Priya", service: "facial", date: "2026-08-18", time: "02:00 PM" },
      businessA
    );
    expect(created.success).toBe(true);

    const rescheduleAttempt = mockRescheduleBooking(
      { bookingId: created.bookingId, newDate: "2026-08-19", newTime: "11:00 AM" },
      businessB
    );

    expect(rescheduleAttempt.error).toBe("not_found");
  });

  test("booking created and cancelled under the SAME business succeeds normally", () => {
    const created = mockCreateBooking(
      { customerName: "Aman", service: "haircut", date: "2026-08-20", time: "10:00 AM" },
      businessA
    );
    expect(created.success).toBe(true);

    const cancelled = mockCancelBooking(
      { bookingId: created.bookingId },
      businessA
    );

    expect(cancelled.success).toBe(true);
  });

  test("create_booking without businessId is rejected", () => {
    const result = mockCreateBooking(
      { customerName: "Raj", service: "haircut", date: "2026-08-17", time: "10:00 AM" },
      {}
    );
    expect(result.error).toBe("missing_business_context");
  });

  test("prompt generation isolates BUSINESS DATA between tenants without leakage", () => {
    const today = "2026-09-17";
    const promptA = buildReceptionPrompt(businessA, today);
    const promptB = buildReceptionPrompt(businessB, today);

    const dataA = promptA.split("BUSINESS DATA:")[1];
    const dataB = promptB.split("BUSINESS DATA:")[1];

    // Data A should only have Business A services
    expect(dataA).toContain("haircut");
    expect(dataA).toContain("300");
    expect(dataA).not.toContain("teeth cleaning");
    expect(dataA).not.toContain("5000");

    // Data B should only have Business B services
    expect(dataB).toContain("teeth cleaning");
    expect(dataB).toContain("1200");
    expect(dataB).not.toContain("haircut");
    expect(dataB).not.toContain("facial");
  });
});