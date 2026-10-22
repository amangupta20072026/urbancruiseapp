/**
 * Finds the one-time code in an SMS: the first run of exactly `length`
 * digits that is not part of a longer number. For our template
 * ("Your Urban Cruise login OTP is 468460. It is valid for 10 minutes…")
 * this returns "468460" and ignores the "10".
 */
export function extractOtp(message: string, length: number): string | null {
  const pattern = new RegExp(`(?:^|\\D)(\\d{${length}})(?=\\D|$)`);
  const match = pattern.exec(message);
  return match ? match[1] : null;
}
