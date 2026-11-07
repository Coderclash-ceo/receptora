import { describe, it, expect } from "vitest";
import { normalizeResponse } from "./client";

describe("api/client normalizeResponse", () => {
  it("unwraps bookings from { bookings: [...] }", () => {
    const raw = {
      bookings: [
        { id: "b1", date: "2026-10-12", time: "14:00", customerName: "Aisha" },
        { id: "b2", date: "2026-10-12", time: "15:00", customerName: "Rahul" },
      ],
    };
    const unwrapped = normalizeResponse("/api/bookings", raw);
    expect(Array.isArray(unwrapped)).toBe(true);
    expect(unwrapped.length).toBe(2);
    expect(unwrapped[0].customerName).toBe("Aisha");
  });

  it("unwraps single booking from { booking: { ... } }", () => {
    const raw = {
      booking: { id: "b1", date: "2026-10-12", time: "14:00", service: "Haircut" },
    };
    const unwrapped = normalizeResponse("/api/bookings/b1", raw);
    expect(unwrapped.id).toBe("b1");
    expect(unwrapped.service).toBe("Haircut");
  });

  it("unwraps customers from { customers: [...] }", () => {
    const raw = {
      customers: [
        { id: "c1", name: "Pooja", phone: "+919876543210" },
      ],
    };
    const unwrapped = normalizeResponse("/api/customers", raw);
    expect(Array.isArray(unwrapped)).toBe(true);
    expect(unwrapped[0].name).toBe("Pooja");
  });

  it("retains paginated structure for conversations list", () => {
    const raw = {
      items: [{ id: "conv-1", lastMessage: { text: "Hello" } }],
      total: 1,
      hasMore: false,
      nextCursor: null,
    };
    const result = normalizeResponse("/api/conversations", raw);
    expect(result.items.length).toBe(1);
    expect(result.total).toBe(1);
    expect(result.hasMore).toBe(false);
  });

  it("unwraps conversation thread from { conversation: { ... } }", () => {
    const raw = {
      conversation: {
        id: "conv-1",
        messages: [{ role: "user", text: "Can I book tomorrow?" }],
      },
    };
    const result = normalizeResponse("/api/conversations/conv-1", raw);
    expect(result.id).toBe("conv-1");
    expect(result.messages.length).toBe(1);
  });

  it("unwraps business profile from { business: { ... } }", () => {
    const raw = {
      business: { id: "biz-1", name: "Just Look Salon" },
    };
    const result = normalizeResponse("/api/settings", raw);
    expect(result.name).toBe("Just Look Salon");
  });
});
