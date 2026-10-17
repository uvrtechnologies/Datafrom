const { parsePhoneNumberFromString } = require('libphonenumber-js');

/**
 * Phone-number normalization / validation.
 *
 * All mobile numbers that identify an account are stored in E.164 form
 * (e.g. "+919876543210") so that every equivalent representation of the same
 * number ("9876543210", "098765 43210", "+91 98765-43210") maps to one value
 * and the MongoDB unique index can never be bypassed by formatting.
 *
 * Numbers written without a country code are interpreted using
 * DEFAULT_PHONE_COUNTRY (defaults to IN / +91), which matches the existing
 * application. Numbers written with an explicit "+" country code are never
 * reinterpreted, so international numbers stay correct.
 */

const DEFAULT_COUNTRY = String(process.env.DEFAULT_PHONE_COUNTRY || 'IN').toUpperCase();

function normalizeMobile(raw, defaultCountry = DEFAULT_COUNTRY) {
  const input = String(raw == null ? '' : raw).trim();
  if (!input) {
    return { valid: false, reason: 'required', e164: null, country: null };
  }

  // Explicit international input ("+91 ..." / "0044 ...") — never reinterpret.
  const international = /^(\+|00)/.test(input);
  const candidate = international ? input.replace(/^00/, '+') : input;

  let parsed = parsePhoneNumberFromString(candidate, international ? undefined : defaultCountry);
  if (!parsed && !international) {
    // Fall back to a strict international parse (covers "+..." pasted with spaces).
    parsed = parsePhoneNumberFromString(`+${candidate.replace(/\D/g, '')}`);
  }
  if (!parsed) {
    return { valid: false, reason: 'unparseable', e164: null, country: null };
  }
  if (!parsed.isValid()) {
    return { valid: false, reason: 'invalid', e164: null, country: parsed.country || null };
  }

  return {
    valid: true,
    reason: null,
    e164: parsed.number,
    country: parsed.country || null,
    countryCallingCode: parsed.countryCallingCode,
    nationalNumber: parsed.nationalNumber,
  };
}

/** Returns the E.164 value, or null when the number is invalid. */
function toE164(raw, defaultCountry = DEFAULT_COUNTRY) {
  const result = normalizeMobile(raw, defaultCountry);
  return result.valid ? result.e164 : null;
}

/** Indian 10-digit form ("9876543210") for display; null for other countries. */
function toIndianNational(raw) {
  const result = normalizeMobile(raw, 'IN');
  if (!result.valid || result.country !== 'IN') return null;
  return result.nationalNumber;
}

module.exports = { normalizeMobile, toE164, toIndianNational, DEFAULT_COUNTRY };
