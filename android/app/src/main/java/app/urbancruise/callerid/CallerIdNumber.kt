package app.urbancruise.callerid

/**
 * The ONE phone-number rule for caller ID, in Kotlin.
 *
 * MUST match the backend's toE164() in
 *   urbancruiseappbackend/src/modules/uc/caller_id/phone.ts
 * The server turns every customer number into E.164 ('+919812345678')
 * with those rules; this turns the incoming caller's number into E.164
 * with the same rules, so the two meet in the local database. Change one,
 * change the other, or calls stop matching.
 *
 * A number that cannot be read with certainty returns null and is never
 * looked up: caller ID must never guess.
 */
object CallerIdNumber {

  private const val INDIA_CC = "91"
  private const val MIN_INTL_DIGITS = 8
  private const val MAX_INTL_DIGITS = 15

  /** 10-digit Indian national number: mobiles 6-9, landlines 2-5. */
  private val INDIAN_NATIONAL = Regex("^[2-9]\\d{9}$")

  /**
   *   +<digits>         international as written (an Indian one is checked)
   *   00<digits>        international dialling prefix, same as '+'
   *   91 + 10 digits    Indian, country code without '+'
   *   0 + 10 digits     Indian, trunk prefix
   *   10 digits         Indian national number
   */
  fun toE164(raw: String?): String? {
    val trimmed = raw?.trim().orEmpty()
    if (trimmed.isEmpty()) return null

    val hasPlus = trimmed.startsWith("+")
    val digits = trimmed.filter { it in '0'..'9' }
    if (digits.isEmpty()) return null

    if (hasPlus) return international(digits)
    if (digits.startsWith("00")) return international(digits.substring(2))

    if (digits.length == 12 && digits.startsWith(INDIA_CC)) return indian(digits.substring(2))
    if (digits.length == 11 && digits.startsWith("0")) return indian(digits.substring(1))
    if (digits.length == 10) return indian(digits)

    return null
  }

  private fun indian(national: String): String? =
      if (INDIAN_NATIONAL.matches(national)) "+$INDIA_CC$national" else null

  private fun international(digits: String): String? {
    if (digits.startsWith(INDIA_CC)) {
      // '+91…' must be a valid Indian number, not just any digits.
      return if (digits.length == 12) indian(digits.substring(2)) else null
    }
    if (digits.startsWith("0")) return null
    if (digits.length < MIN_INTL_DIGITS || digits.length > MAX_INTL_DIGITS) return null
    return "+$digits"
  }
}
