import { auth } from "../firebase";

const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (isLocal ? "http://localhost:3000" : "https://nudge-os-github.onrender.com")
).replace(/\/$/, "");

// Proactive keep-warm ping for Render cloud micro-instance cold starts
if (typeof window !== "undefined" && API_BASE_URL.includes("onrender.com")) {
  try {
    fetch(`${API_BASE_URL}/health`, { method: "GET", mode: "no-cors" }).catch(() => {});
  } catch (_) {}
}

export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Normalized unwrappers for verified backend shapes
 */
export function normalizeResponse(path, json) {
  if (!json || typeof json !== "object") return json;

  // Bookings endpoint: { bookings: [...] }
  if (path.startsWith("/api/bookings") && Array.isArray(json.bookings)) {
    return json.bookings;
  }

  // Customers endpoint: { customers: [...] }
  if (path.startsWith("/api/customers") && Array.isArray(json.customers)) {
    return json.customers;
  }

  // Conversations list: { items: [...], total, hasMore, nextCursor }
  if (path === "/api/conversations" && Array.isArray(json.items)) {
    return json;
  }

  // Single conversation: { conversation: { ... } }
  if (path.startsWith("/api/conversations/") && json.conversation) {
    return json.conversation;
  }

  // Single booking: { booking: { ... } }
  if (path.startsWith("/api/bookings/") && json.booking) {
    return json.booking;
  }

  // Single customer: { customer: { ... } }
  if (path.startsWith("/api/customers/") && json.customer) {
    return json.customer;
  }

  // Settings: { business: { ... } }
  if (path.startsWith("/api/settings") && json.business) {
    return json.business;
  }

  return json;
}

/**
 * Intelligent presentation fallback for demo resilience when backend server is unreachable
 */
function getOfflineDemoFallback(endpoint, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  if (method === "GET") {
    if (endpoint === "/api/insights" || endpoint.startsWith("/api/insights?")) {
      return {
        totalBookingsThisMonth: 8,
        busiestHour: "16:00",
        atRiskCustomerCount: 3,
        headline: "8 bookings recorded this month with peak demand at 16:00 and 3 customers at risk.",
        revenueThisMonth: 3450,
      };
    }
    if (endpoint.startsWith("/api/bookings")) {
      return {
        bookings: [
          { id: "b_1", customerName: "Aarav Sharma", service: "haircut", date: "2026-10-29", time: "11:00", status: "confirmed", price: 300, phone: "+91 98765 43211" },
          { id: "b_2", customerName: "Priya Patel", service: "facial", date: "2026-10-29", time: "14:00", status: "confirmed", price: 600, phone: "+91 98765 43212" },
          { id: "b_3", customerName: "Rohan Mehta", service: "beard trim", date: "2026-10-30", time: "16:00", status: "confirmed", price: 150, phone: "+91 98765 43213" },
          { id: "b_4", customerName: "Neha Gupta", service: "hair color", date: "2026-10-31", time: "17:00", status: "confirmed", price: 900, phone: "+91 98765 43214" },
        ],
      };
    }
    if (endpoint.startsWith("/api/customers")) {
      return {
        customers: [
          { id: "cust_001", name: "Test Customer", phone: "919999999999", lastVisit: "2026-08-18", lastService: "haircut", tags: ["vip"] },
          { id: "cust_002", name: "Aarav Sharma", phone: "919876543211", lastVisit: "2026-09-04", lastService: "haircut", tags: ["regular"] },
          { id: "cust_003", name: "Priya Patel", phone: "919876543212", lastVisit: "2026-09-05", lastService: "facial", tags: ["regular"] },
          { id: "cust_004", name: "Rohan Mehta", phone: "919876543213", lastVisit: "2026-09-28", lastService: "beard trim", tags: ["new"] },
          { id: "cust_005", name: "Neha Gupta", phone: "919876543214", lastVisit: "2026-09-23", lastService: "hair color", tags: ["vip"] },
        ],
      };
    }
    if (endpoint === "/api/conversations") {
      return {
        items: [
          {
            id: "918369297980",
            customerName: "Kashyap Makwana",
            channel: "whatsapp",
            phone: "+91 83692 97980",
            totalMessages: 6,
            lastMessage: { role: "assistant", text: "Confirmed! Your booking is set for tomorrow at 4:00 PM.", timestamp: new Date().toISOString() },
          },
        ],
        total: 1,
        hasMore: false,
        nextCursor: null,
      };
    }
    if (endpoint.startsWith("/api/conversations/")) {
      return {
        conversation: {
          id: endpoint.replace("/api/conversations/", ""),
          channel: "whatsapp",
          messages: [
            { role: "user", text: "Hi, I'd like to book an appointment for tomorrow.", timestamp: new Date(Date.now() - 3600000).toISOString() },
            { role: "assistant", text: "Hello! We would love to book that for you. What time and service do you prefer?", timestamp: new Date(Date.now() - 3500000).toISOString() },
          ],
        },
      };
    }
    if (endpoint.startsWith("/api/settings")) {
      return {
        business: {
          id: "test-business-1",
          name: "Just Look Salon & Spa",
          ownerName: "Study Purpose",
          category: "Salon & Spa",
          city: "New York",
          whatsappNumber: "+1 (555) 664-1838",
          phone: "+1 (555) 664-1838",
          phoneId: "1171981929341103",
          whatsappToken: "EAAWCo9UbFqsBSlfqrjhrZAaN9c0ReHgMUc6KAF5cgdkChNqtroQZC6o33pZBR6bWawSqZBt4zDjQQETZAzRXgq8442G1QfAJElsypZBgnUW5lM9533RoOZAHa1p82itixou8Kg2adpKM5HHN9A0KaLHbsYVZBTMUjHHJUz4lMI6ncNpwZBbEkdcXfeOhBSkptlAZDZD",
          hours: { mon: "10:00-21:00", tue: "10:00-21:00", wed: "10:00-21:00", thu: "10:00-21:00", fri: "10:00-21:00", sat: "10:00-21:00", sun: "11:00-19:00" },
          services: [
            { name: "haircut", displayName: "Classic Precision Haircut", price: 300, durationMin: 30 },
            { name: "beard trim", displayName: "Beard Shaping & Styling", price: 150, durationMin: 15 },
            { name: "facial", displayName: "Radiance Herbal Facial", price: 600, durationMin: 45 },
          ],
        },
      };
    }
  }

  if (method === "POST") {
    if (endpoint.includes("/nudge")) {
      return {
        ok: true,
        customerId: "cust_002",
        customerName: "Aarav Sharma",
        phone: "919876543211",
        message: "Hi Aarav! We've missed having you at Just Look Salon. Reply here to book your next slot and enjoy our priority styling.",
        sentAt: new Date().toISOString(),
      };
    }
    if (endpoint.includes("/campaign")) {
      return {
        success: true,
        promoCode: "SAVE15",
        discount: 15,
        dispatchedCount: 3,
      };
    }
    if (endpoint.includes("/messages")) {
      return {
        message: { role: "assistant", text: "Message saved to salon inbox", timestamp: new Date().toISOString() },
        liveDelivery: { ok: false, error: "missing_whatsapp_token" },
      };
    }
  }

  return undefined;
}

/**
 * Central authenticated request function
 * Attaches Authorization: Bearer <Firebase ID token>
 * Attaches x-business-id: <active business ID>
 * Retries on 401 with force-refreshed token once before signing out
 */
export async function apiRequest(endpoint, options = {}) {
  // Ensure Firebase restores auth state from storage before firing
  if (auth && typeof auth.authStateReady === "function") {
    try {
      await auth.authStateReady();
    } catch (_) {}
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  // Determine active business ID
  const activeBusinessId =
    options.businessId ||
    (typeof localStorage !== "undefined" && localStorage.getItem("nudgeos_active_business_id")) ||
    (typeof localStorage !== "undefined" && JSON.parse(localStorage.getItem("nudgeos_demo_user") || "null")?.businessId) ||
    (typeof sessionStorage !== "undefined" && JSON.parse(sessionStorage.getItem("nudgeos_demo_user") || "null")?.businessId) ||
    "test-business-1";

  if (activeBusinessId) {
    headers.set("x-business-id", activeBusinessId);
  }

  // Attach fresh Firebase Auth ID token
  if (auth?.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers.set("Authorization", `Bearer ${token}`);
    } catch (err) {
      console.error("[api] Failed to get ID token:", err);
    }
  } else if (!headers.has("Authorization")) {
    const demoUser =
      (typeof localStorage !== "undefined" && JSON.parse(localStorage.getItem("nudgeos_demo_user") || "null")) ||
      (typeof sessionStorage !== "undefined" && JSON.parse(sessionStorage.getItem("nudgeos_demo_user") || "null")) ||
      null;
    const fallbackToken = demoUser?.token || (activeBusinessId === "fine-look" ? "demo-token-fine-look" : "demo-token");
    headers.set("Authorization", `Bearer ${fallbackToken}`);
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (netErr) {
    const fallback = getOfflineDemoFallback(endpoint, options);
    if (fallback !== undefined) {
      console.warn(`[api] Backend unreachable (${netErr.message}). Using presentation fallback for ${endpoint}`);
      return normalizeResponse(endpoint, fallback);
    }
    throw new ApiError(`Network error: ${netErr.message || "Failed to connect to backend server"}`, 0);
  }

  // Handle 401 Unauthorized: Attempt token force refresh once, or fallback to demo token
  if (response.status === 401 && !options._retried) {
    if (auth?.currentUser) {
      try {
        const refreshedToken = await auth.currentUser.getIdToken(true);
        headers.set("Authorization", `Bearer ${refreshedToken}`);
        return apiRequest(endpoint, { ...options, _retried: true, headers });
      } catch (refreshErr) {
        console.warn("[api] Token refresh failed:", refreshErr);
      }
    }
    // Local presentation fallback: retry with demo-token
    if (typeof window !== "undefined" && window.location.hostname === "localhost") {
      headers.set("Authorization", `Bearer ${activeBusinessId === "fine-look" ? "demo-token-fine-look" : "demo-token"}`);
      return apiRequest(endpoint, { ...options, _retried: true, headers });
    }
  }

  let responseData = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      responseData = await response.json();
    } catch (_) {
      responseData = null;
    }
  } else {
    responseData = await response.text();
  }

  if (!response.ok) {
    const errorMsg =
      responseData?.error ||
      responseData?.message ||
      `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status, responseData);
  }

  return normalizeResponse(endpoint, responseData);
}

export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: "GET" }),
  post: (endpoint, body, options) =>
    apiRequest(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: (endpoint, body, options) =>
    apiRequest(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: (endpoint, body, options) =>
    apiRequest(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (endpoint, options) => apiRequest(endpoint, { ...options, method: "DELETE" }),
};
