const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isNonEmptyString(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

// For optional fields: missing/null is fine, otherwise it must be text.
function isOptionalString(value, maxLength) {
  if (value === undefined || value === null) return true;
  return typeof value === 'string' && value.length <= maxLength;
}

function isValidEmail(value) {
  return typeof value === 'string' && value.length <= 254 && EMAIL_PATTERN.test(value.trim());
}

// bcrypt only uses the first 72 bytes of a password, so longer ones are rejected.
function isStrongPassword(value) {
  return typeof value === 'string' &&
    value.length >= 8 &&
    value.length <= 72 &&
    /[A-Za-z]/.test(value) &&
    /[0-9]/.test(value);
}

// Accepts YYYY-MM-DD and rejects impossible dates such as 2026-02-30.
function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !isNaN(date) && date.toISOString().startsWith(value);
}

// Turns "5" or 5 into the number 5. Anything that is not a positive whole number gives null.
function toId(value) {
  if (!/^[1-9][0-9]*$/.test(String(value))) return null;
  return Number(value);
}

// For PUT requests: use the new value if it was sent, otherwise keep the stored one.
function mergeUpdate(existing, body, fields) {
  const result = {};
  for (const field of fields) {
    result[field] = body[field] !== undefined ? body[field] : existing[field];
  }
  return result;
}

module.exports = {
  isNonEmptyString,
  isOptionalString,
  isValidEmail,
  isStrongPassword,
  isValidDate,
  toId,
  mergeUpdate
};
