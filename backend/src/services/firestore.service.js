const { db } = require("../config/firebase");

function assertBusinessId(businessId) {
  if (!businessId) {
    throw new Error("businessId is required and must not be falsy");
  }
}

async function getDoc(collection, businessId, docId) {
  assertBusinessId(businessId);
  const ref = docId
    ? db.collection("businesses").doc(businessId).collection(collection).doc(docId)
    : db.collection(collection).doc(businessId);
  const snap = await ref.get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function setDoc(collection, businessId, docId, data) {
  assertBusinessId(businessId);
  const ref = docId
    ? db.collection("businesses").doc(businessId).collection(collection).doc(docId)
    : db.collection(collection).doc(businessId);
  await ref.set(data, { merge: true });
  return { id: docId || businessId, ...data };
}

async function queryCollection(collection, businessId, filters = []) {
  assertBusinessId(businessId);
  let ref = db.collection("businesses").doc(businessId).collection(collection);
  filters.forEach(([field, op, value]) => {
    ref = ref.where(field, op, value);
  });
  const snap = await ref.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getInactiveCustomers(businessId, minDays, maxDays) {
  assertBusinessId(businessId);
  const cutoffMin = new Date(Date.now() - maxDays * 86400000).toISOString();
  const cutoffMax = new Date(Date.now() - minDays * 86400000).toISOString();
  return queryCollection("customers", businessId, [
    ["lastVisit", ">=", cutoffMin],
    ["lastVisit", "<=", cutoffMax],
  ]);
}

async function getBusinessStatsRaw(businessId) {
  assertBusinessId(businessId);
  const bookings = await queryCollection("bookings", businessId);
  const customers = await queryCollection("customers", businessId);
  return { bookings, customers };
}

async function writeBooking(businessId, booking) {
  assertBusinessId(businessId);
  const id = booking.id || db.collection("businesses").doc(businessId).collection("bookings").doc().id;
  return setDoc("bookings", businessId, id, booking);
}


async function findBusinessByWhatsappNumber(whatsappNumber) {
  if (!db || !whatsappNumber) return null;
  let snap = await db.collection("businesses")
    .where("whatsappNumber", "==", whatsappNumber)
    .limit(1)
    .get();

  if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

  snap = await db.collection("businesses")
    .where("phone", "==", whatsappNumber)
    .limit(1)
    .get();

  if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

  const cleanTarget = String(whatsappNumber).replace(/\D/g, "");
  if (cleanTarget) {
    const all = await db.collection("businesses").get();
    for (const doc of all.docs) {
      const data = doc.data();
      const num1 = String(data.whatsappNumber || "").replace(/\D/g, "");
      const num2 = String(data.phone || "").replace(/\D/g, "");
      if (
        (num1 && (num1 === cleanTarget || num1.endsWith(cleanTarget) || cleanTarget.endsWith(num1))) ||
        (num2 && (num2 === cleanTarget || num2.endsWith(cleanTarget) || cleanTarget.endsWith(num2)))
      ) {
        return { id: doc.id, ...data };
      }
    }
  }

  return null;
}

async function findBusinessByPhoneNumberId(phoneNumberId) {
  if (!db || !phoneNumberId) return null;
  const cleanId = String(phoneNumberId).trim();
  let snap = await db.collection("businesses")
    .where("whatsappPhoneNumberId", "==", cleanId)
    .limit(1)
    .get();

  if (!snap.empty) {
    const id = snap.docs[0].id === "just-look" ? "test-business-1" : snap.docs[0].id;
    return { id, ...snap.docs[0].data() };
  }

  snap = await db.collection("businesses")
    .where("phoneId", "==", cleanId)
    .limit(1)
    .get();

  if (!snap.empty) {
    const id = snap.docs[0].id === "just-look" ? "test-business-1" : snap.docs[0].id;
    return { id, ...snap.docs[0].data() };
  }
  return null;
}
async function findBusinessByInstagramAccountId(instagramAccountId) {
  if (!db || !instagramAccountId) return null;
  const cleanId = String(instagramAccountId).trim();
  let snap = await db.collection("businesses")
    .where("instagramAccountId", "==", cleanId)
    .limit(1)
    .get();

  if (!snap.empty) {
    const id = snap.docs[0].id === "just-look" ? "test-business-1" : snap.docs[0].id;
    return { id, ...snap.docs[0].data() };
  }

  // Also match by handle (e.g. @justlook_salon or @nudgeos29)
  const cleanHandle = cleanId.startsWith("@") ? cleanId : `@${cleanId}`;
  snap = await db.collection("businesses")
    .where("instagram", "==", cleanHandle)
    .limit(1)
    .get();

  if (!snap.empty) {
    const id = snap.docs[0].id === "just-look" ? "test-business-1" : snap.docs[0].id;
    return { id, ...snap.docs[0].data() };
  }

  // Default fallback for Just Look Salon
  const fallback = await db.collection("businesses").doc("test-business-1").get();
  if (fallback.exists) {
    return { id: "test-business-1", ...fallback.data() };
  }

  return null;
}

async function appendMessage(businessId, conversationId, message) {
  assertBusinessId(businessId);
  const entry = {
    role: message.role,
    text: message.text || "",
    timestamp: message.timestamp || new Date().toISOString(),
    ...(message.mediaType ? { mediaType: message.mediaType } : {}),
    ...(message.mediaUrl ? { mediaUrl: message.mediaUrl } : {}),
  };

  const ref = db.collection("businesses").doc(businessId).collection("conversations").doc(conversationId);
  const snap = await ref.get();

  const existing = snap.exists ? snap.data().messages || [] : [];
  const updated = [...existing, entry];

  const channel = conversationId.startsWith("ig_") ? "instagram" : "whatsapp";
  await ref.set({
    messages: updated,
    lastMessage: entry.text,
    updatedAt: entry.timestamp,
    channel,
  }, { merge: true });
  return entry;
}

async function getConversation(businessId, conversationId) {
  assertBusinessId(businessId);
  const doc = await getDoc("conversations", businessId, conversationId);
  return doc?.messages || [];
}

async function getAllBusinesses() {
  const snap = await db.collection("businesses").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function saveRevenueAlert(businessId, message) {
  assertBusinessId(businessId);
  const alertId = `rev_alert_${Date.now()}`;
  const data = {
    businessId,
    message,
    type: "revenue",
    createdAt: new Date().toISOString(),
  };
  return setDoc("insights", businessId, alertId, data);
}

async function logRetentionSend(businessId, customerIdOrData, maybeMessageText) {
  assertBusinessId(businessId);
  const logId = `ret_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let customerId, messageText, sentAt;
  if (typeof customerIdOrData === "object" && customerIdOrData !== null) {
    customerId = customerIdOrData.customerId || "unknown";
    messageText = customerIdOrData.message || customerIdOrData.messageText || "";
    sentAt = customerIdOrData.sentAt || new Date().toISOString();
  } else {
    customerId = customerIdOrData || "unknown";
    messageText = maybeMessageText || "";
    sentAt = new Date().toISOString();
  }
  const data = {
    businessId,
    customerId,
    messageText,
    sentAt,
  };
  return setDoc("retentionLog", businessId, logId, data);
}

module.exports = {
  getDoc,
  setDoc,
  queryCollection,
  getInactiveCustomers,
  getBusinessStatsRaw,
  writeBooking,
  findBusinessByWhatsappNumber,
  findBusinessByPhoneNumberId,
  findBusinessByInstagramAccountId,
  assertBusinessId,
  appendMessage,
  getConversation,
  getAllBusinesses,
  saveRevenueAlert,
  logRetentionSend,
};