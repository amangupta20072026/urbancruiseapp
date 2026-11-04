/**
 * ------------------------------------------------------------------
 * UC dashboard salutation — devotional greeting (UC role ONLY)
 * ------------------------------------------------------------------
 * Replaces "Good morning / evening" on the UC dashboard (product rule;
 * Customer, Vendor and Driver keep their own greeting).
 *
 * The BACKEND sends the greeting TEXT itself in GET /uc/dashboard →
 * greeting.salutation (e.g. "Jai Mata Di", "Jai Shree Ram",
 * "Om Namah Shivaya"), so it can be changed or a new one added from
 * the backend at any time — NO app update needed. One at a time.
 *
 * The app only tidies the text before showing it:
 *   - not a string / empty after tidying → DEFAULT_UC_SALUTATION
 *   - control characters removed, runs of spaces made single, trimmed
 *   - longer than MAX_SALUTATION_LENGTH characters → cut, ending in "…"
 *     (the greeting line is one line on the dashboard)
 * ------------------------------------------------------------------
 */

/** Shown when the backend sends nothing usable. */
export const DEFAULT_UC_SALUTATION = 'Jai Mata Di';

/** Longest salutation shown, in characters (before ", Name"). */
export const MAX_SALUTATION_LENGTH = 40;

/** Control and invisible formatting characters (newlines, tabs, RTL marks…). */
const CONTROL_CHARS =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2066-\u2069]/g;

/** The salutation text to show for whatever the backend sent. */
export function salutationText(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_UC_SALUTATION;
  const tidy = value.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim();
  if (!tidy) return DEFAULT_UC_SALUTATION;
  const chars = Array.from(tidy); // counts emoji / Devanagari safely
  return chars.length > MAX_SALUTATION_LENGTH
    ? `${chars
        .slice(0, MAX_SALUTATION_LENGTH - 1)
        .join('')
        .trimEnd()}…`
    : tidy;
}

/** "Jai Mata Di, Admin"; a blank name gives just "Jai Mata Di". */
export function ucGreetingLine(
  salutation: unknown,
  name: string | undefined,
): string {
  const text = salutationText(salutation);
  const trimmed = name?.trim();
  return trimmed ? `${text}, ${trimmed}` : text;
}
