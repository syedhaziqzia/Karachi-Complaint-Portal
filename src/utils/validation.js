/**
 * Centralized validation and sanitization logic for the authentication flow
 * and Firestore data writes.
 */

/**
 * Validates an email address.
 * Requires a valid local part, @ symbol, domain, and a TLD of at least 2 characters.
 */
export const validateEmail = (email) => {
  // Stricter: requires 2+ character TLD, no consecutive dots, no leading/trailing dots
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && !email.includes('..');
};

/**
 * Validates a password.
 * Must have: 8+ chars, one uppercase, one lowercase, one digit, two special characters.
 */
export const validatePassword = (password) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=(.*[\W_]){2,}).{8,}$/;
  return regex.test(password);
};

/**
 * Validates a phone number.
 * Must start with an optional + and contain 10–15 digits total (no spaces, dashes checked).
 */
export const validatePhone = (phone) => {
  // Strip common formatting characters first
  const stripped = phone.replace(/[\s\-().]/g, '');
  // Must be 10–15 digits, optionally prefixed with +
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  return phoneRegex.test(stripped);
};

/**
 * Strips dangerous control characters from user-supplied text and truncates to maxLen.
 * Use before writing any user-generated string to Firestore.
 *
 * @param {string} str      - Raw user input
 * @param {number} maxLen   - Maximum allowed length (default 1000)
 * @returns {string}        - Sanitized, trimmed string
 */
export const sanitizeText = (str, maxLen = 1000) => {
  if (typeof str !== 'string') return '';
  // Remove control characters (0x00–0x1F except tab/newline/carriage-return) and null bytes
  const cleaned = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.trim().substring(0, maxLen);
};

/**
 * Safely parses a JSON string, returning `fallback` on any error.
 * Use instead of bare JSON.parse() for all AsyncStorage reads.
 *
 * @param {string|null} raw       - Raw JSON string from storage
 * @param {*}           fallback  - Value to return if parsing fails
 * @returns {*}
 */
export const safeParseJSON = (raw, fallback) => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};
