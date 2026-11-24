package app.urbancruise.callerid

/**
 * Text shown on the caller-ID card and notification, in one place so
 * both always say the same thing.
 */
object CallerIdText {

  /** Same labels as the app's CUSTOMER_CATEGORY_LABEL (uc/customers/types.ts). */
  private fun typeLabel(type: String?): String? =
      when (type) {
        "personal" -> "Personal"
        "corporate" -> "Corporate"
        "agent" -> "Agent"
        else -> null
      }

  /**
   * "Corporate · Mumbai", "Personal", "Mumbai", or null when there is
   * neither. The server already sends null for an 'Unknown' city.
   */
  fun details(entry: CallerIdStore.Entry): String? {
    val parts = listOfNotNull(typeLabel(entry.type), entry.city?.trim()?.ifEmpty { null })
    return if (parts.isEmpty()) null else parts.joinToString(" · ")
  }

  /** "Rahul Mehta" → "RM", "Acme" → "A". */
  fun initials(name: String): String {
    val words = name.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
    val first = words.firstOrNull()?.firstOrNull()
    val last = if (words.size > 1) words.last().firstOrNull() else null
    return listOfNotNull(first, last).joinToString("").uppercase()
  }
}
