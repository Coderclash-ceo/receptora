const { findBusinessByPhoneNumberId, findBusinessByWhatsappNumber } = require("../services/firestore.service");

async function resolveBusinessId(phoneNumberId, displayPhoneNumber) {
  let resolvedId = null;

  if (phoneNumberId) {
    const business = await findBusinessByPhoneNumberId(phoneNumberId);
    if (business) resolvedId = business.id;
  }

  if (!resolvedId && displayPhoneNumber) {
    const business = await findBusinessByWhatsappNumber(displayPhoneNumber);
    if (business) resolvedId = business.id;
  }

  // Canonical alias: map just-look to test-business-1
  if (resolvedId === "just-look") {
    resolvedId = "test-business-1";
  }

  if (resolvedId) {
    return { found: true, businessId: resolvedId };
  }

  return { found: false, businessId: null };
}

module.exports = { resolveBusinessId };