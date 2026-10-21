/**
 * ------------------------------------------------------------------
 * Phone masking + full-number search
 * ------------------------------------------------------------------
 * DISPLAY ONLY. The stored number is never changed: Call and WhatsApp
 * must keep using the raw value. Masking hides digits on screen and
 * from screen readers; it is not a security boundary, because the API
 * still returns full numbers to the app.
 *
 * Masking rule: hide the first 5 digits after the country code.
 *   '+91 8882347948'  → '+91 ***** 47948'
 *   '+918882347948'   → '+91 ***** 47948'
 *   '8882347948'      → '+91 ***** 47948'   (bare Indian mobile)
 *   '+1 415 555 1003' → '+1 ***** 51003'
 *
 * How the country code is found:
 *   - '+91…' is India. E.164 country codes are prefix-free, so no
 *     other country code starts with 91.
 *   - '91' + 10 digits, or a bare valid Indian mobile, is India.
 *   - Otherwise '+' followed by 1–3 digits and then a separator
 *     (space, dash, dot) gives the code, e.g. '+1 415…', '+44-20…'.
 *   - Anything else ('+14155551003', landlines, '00…' prefixes): the
 *     code can't be known without a numbering-plan table, so only
 *     the last 5 digits are shown ('***** 51003'). This hides MORE
 *     than the rule asks, never less.
 *
 * Search rule: a phone matches only when the query is the complete
 * number, so partial digits can't reveal the hidden part.
 * ------------------------------------------------------------------
 */

const MASK = '*****';
const MASKED_DIGITS = 5;
const VISIBLE_TAIL = 5;
const MIN_SEARCH_DIGITS = 10;

const INDIA_CC = '91';
const INDIAN_MOBILE = /^[6-9]\d{9}$/;
/** '+' then a 1–3 digit country code followed by a separator. */
const SEPARATED_CC = /^\+\s*(\d{1,3})[\s\-.]/;
/** Characters allowed in a query that is meant as a phone number. */
const PHONE_QUERY = /^[+\d\s().-]+$/;

const digitsOf = (v: string): string => v.replace(/\D/g, '');

type ParsedPhone = {
  /** Country code without '+', or null when it can't be known. */
  cc: string | null;
  /** Digits after the country code (all digits when cc is null). */
  national: string;
};

function parsePhone(value: string): ParsedPhone {
  const digits = digitsOf(value);

  if (value.startsWith('+')) {
    if (digits.startsWith(INDIA_CC)) {
      return { cc: INDIA_CC, national: digits.slice(INDIA_CC.length) };
    }
    const m = SEPARATED_CC.exec(value);
    if (m) {
      const cc = m[1];
      return { cc, national: digits.slice(cc.length) };
    }
    return { cc: null, national: digits };
  }

  if (digits.length === 12 && digits.startsWith(INDIA_CC)) {
    return { cc: INDIA_CC, national: digits.slice(INDIA_CC.length) };
  }
  if (INDIAN_MOBILE.test(digits)) {
    return { cc: INDIA_CC, national: digits };
  }
  return { cc: null, national: digits };
}

/** Hides the first 5 digits; a number of 5 or fewer digits is fully hidden. */
function maskLeading(national: string): string {
  if (national.length <= MASKED_DIGITS) return '*'.repeat(national.length);
  return `${MASK} ${national.slice(MASKED_DIGITS)}`;
}

/** Shows only the last 5 digits; 5 or fewer digits are fully hidden. */
function maskAllButTail(digits: string): string {
  if (digits.length <= VISIBLE_TAIL) return '*'.repeat(digits.length);
  return `${MASK} ${digits.slice(-VISIBLE_TAIL)}`;
}

/**
 * Masked display form of a phone number (see the rules above).
 * null / undefined / blank → ''. A value with no digits (e.g. '—')
 * is returned trimmed, since there is nothing to hide.
 */
export function maskPhone(raw: string | null | undefined): string {
  const value = (raw ?? '').trim();
  if (!value) return '';
  const digits = digitsOf(value);
  if (!digits) return value;

  const { cc, national } = parsePhone(value);
  if (cc === null) return maskAllButTail(digits);
  if (!national) return `+${cc}`;
  return `+${cc} ${maskLeading(national)}`;
}

/**
 * True only when `query` is the complete number: the national number
 * (e.g. '8882347948') or the number with its country code
 * (e.g. '+91 8882347948', '918882347948'). Spaces, dashes, brackets
 * and '+' in the query are ignored. Partial numbers never match.
 */
export function phoneMatchesQuery(
  phone: string | null | undefined,
  query: string,
): boolean {
  const value = (phone ?? '').trim();
  const q = query.trim();
  if (!value || !PHONE_QUERY.test(q)) return false;

  const qDigits = digitsOf(q);
  if (qDigits.length < MIN_SEARCH_DIGITS) return false;

  if (qDigits === digitsOf(value)) return true;
  const { national } = parsePhone(value);
  return national.length > 0 && qDigits === national;
}
