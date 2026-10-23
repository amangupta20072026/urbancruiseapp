/**
 * ------------------------------------------------------------------
 * applyOtpTextChange — how a text change maps to the OTP digits
 * ------------------------------------------------------------------
 * The OTP boxes are drawn over one hidden TextInput with no native
 * maxLength (so typing into a full code reaches JS). Given the
 * previous digits, the input's new raw text and the caret position
 * BEFORE the change, returns the new digits and, when the caret must
 * be placed explicitly, its new position.
 *
 *   - A whole code inserted (paste / iOS autofill) into existing
 *     digits replaces them.
 *   - Typing into a full code overwrites the digit after the caret.
 *   - Anything else (typing, backspace, replacing a selected digit)
 *     is taken as is.
 * Non-digits are dropped and the result is capped at `length`.
 *
 * Pure function: unit-tested in __tests__/otpInput.test.ts.
 * ------------------------------------------------------------------
 */

export type OtpTextChange = {
  digits: string;
  /** Caret to set explicitly, or null to leave the native caret. */
  caret: number | null;
};

export function applyOtpTextChange(
  prev: string,
  text: string,
  caretBefore: number,
  length: number,
): OtpTextChange {
  const added = text.length - prev.length;
  let next: string;
  let caret: number | null = null;

  if (added >= length) {
    next = text.slice(caretBefore, caretBefore + added);
  } else if (text.length > length && added > 0) {
    next =
      text.slice(0, caretBefore + added) + text.slice(caretBefore + added * 2);
    caret = caretBefore + added;
  } else {
    next = text;
  }

  const digits = next.replace(/\D/g, '').slice(0, length);
  return {
    digits,
    caret: caret === null ? null : Math.min(caret, digits.length),
  };
}
