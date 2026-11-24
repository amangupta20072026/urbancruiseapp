package app.urbancruise.callerid

import android.graphics.Color
import androidx.annotation.DrawableRes
import app.urbancruise.R

/**
 * Text and colours shown on the caller-ID card and notification, in one
 * place so both always say the same thing.
 */
object CallerIdText {

  /** How a customer type looks on the card's type chip. */
  data class TypeStyle(
      val label: String,
      @DrawableRes val icon: Int,
      val background: Int,
      val foreground: Int,
  )

  /**
   * Same labels as the app's CUSTOMER_CATEGORY_LABEL
   * (src/features/uc/customers/types.ts). Colours from src/theme/colors.ts
   * (product decision, 24 Nov 2026): Corporate blue, Agent purple,
   * Personal green.
   */
  fun typeStyle(type: String?): TypeStyle? =
      when (type) {
        "corporate" ->
            TypeStyle(
                "Corporate",
                R.drawable.ic_caller_id_building,
                Color.parseColor("#DBEAFE"), // completedTint
                Color.parseColor("#1D4ED8"),
            )
        "agent" ->
            TypeStyle(
                "Agent",
                R.drawable.ic_caller_id_briefcase,
                Color.parseColor("#F3E8FF"), // royalTint
                Color.parseColor("#7E22CE"),
            )
        "personal" ->
            TypeStyle(
                "Personal",
                R.drawable.ic_caller_id_person,
                Color.parseColor("#E7F7EC"), // primaryTint
                Color.parseColor("#2E7D32"), // primaryDark
            )
        else -> null
      }

  /** The city, or null when there is none. The server already sends null for 'Unknown'. */
  fun city(entry: CallerIdStore.Entry): String? = entry.city?.trim()?.ifEmpty { null }

  /**
   * One line for the notification: "Corporate · Mumbai", "Personal",
   * "Mumbai", or null when there is neither.
   */
  fun details(entry: CallerIdStore.Entry): String? {
    val parts = listOfNotNull(typeStyle(entry.type)?.label, city(entry))
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
