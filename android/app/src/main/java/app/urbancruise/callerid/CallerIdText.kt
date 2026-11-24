package app.urbancruise.callerid

import android.graphics.Color
import androidx.annotation.DrawableRes
import app.urbancruise.R

/**
 * Text and colours shown on the caller-ID card and notification, in one
 * place so both always say the same thing.
 */
object CallerIdText {

  /** How each kind of caller looks (product decision, 24 Nov 2026). */
  data class KindStyle(
      /** Header pill: "Customer", "Vendor", "Driver", "UC Staff". */
      val label: String,
      /** Notification title: "Vendor calling: …". */
      val callingLabel: String,
      @DrawableRes val icon: Int,
      /** Header band colour. */
      val header: Int,
      /** Avatar circle background. */
      val tint: Int,
      /** Avatar initials colour. */
      val foreground: Int,
  )

  /** How a customer type looks on the card's type chip. */
  data class TypeStyle(
      val label: String,
      @DrawableRes val icon: Int,
      val background: Int,
      val foreground: Int,
  )

  /**
   * Customer green, vendor orange, driver blue, UC staff purple. Colours
   * from src/theme/colors.ts where the theme has them.
   */
  fun kindStyle(kind: String): KindStyle =
      when (kind) {
        "vendor" ->
            KindStyle(
                "Vendor",
                "Vendor",
                R.drawable.ic_caller_id_store,
                Color.parseColor("#C2410C"),
                Color.parseColor("#FFEDD5"),
                Color.parseColor("#C2410C"),
            )
        "driver" ->
            KindStyle(
                "Driver",
                "Driver",
                R.drawable.ic_caller_id_car,
                Color.parseColor("#1D4ED8"),
                Color.parseColor("#DBEAFE"), // completedTint
                Color.parseColor("#1D4ED8"),
            )
        "staff" ->
            KindStyle(
                "UC Staff",
                "UC staff",
                R.drawable.ic_caller_id_staff,
                Color.parseColor("#7E22CE"),
                Color.parseColor("#F3E8FF"), // royalTint
                Color.parseColor("#7E22CE"),
            )
        else ->
            KindStyle(
                "Customer",
                "Customer",
                R.drawable.ic_caller_id_shield,
                Color.parseColor("#2E7D32"), // primaryDark
                Color.parseColor("#E7F7EC"), // primaryTint
                Color.parseColor("#2E7D32"),
            )
      }

  /**
   * Customer type chip. Same labels as the app's CUSTOMER_CATEGORY_LABEL
   * (src/features/uc/customers/types.ts): Corporate blue, Agent purple,
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

  private fun clean(v: String?): String? = v?.trim()?.ifEmpty { null }

  /** The city, or null. The server already sends null for 'Unknown'. */
  fun city(entry: CallerIdStore.Entry): String? = clean(entry.city)

  /**
   * The notification's second line after the number, by kind:
   *   customer  "Corporate · Delhi"
   *   vendor    "Sharma Travels · Mumbai · Inactive"
   *   driver    "Driver · Sharma Travels · Pune"
   *   staff     "Sales · Tele-Sales · Mumbai Office"
   * null when there is nothing to add.
   */
  fun details(entry: CallerIdStore.Entry): String? {
    val parts =
        when (entry.kind) {
          "customer" -> listOf(typeStyle(entry.type)?.label, city(entry))
          "staff" -> listOf(clean(entry.department), clean(entry.branch))
          else -> listOf(clean(entry.subtitle), city(entry))
        } + clean(entry.badge)
    val present = parts.filterNotNull()
    return if (present.isEmpty()) null else present.joinToString(" · ")
  }

  /**
   * The calling number for the card: '+918604485702' → "+91 86044 85702".
   * Non-Indian numbers are shown as received (E.164).
   */
  fun formatPhone(phoneE164: String): String =
      if (phoneE164.length == 13 && phoneE164.startsWith("+91")) {
        "+91 ${phoneE164.substring(3, 8)} ${phoneE164.substring(8)}"
      } else {
        phoneE164
      }

  /** "Rahul Mehta" → "RM", "Acme" → "A". */
  fun initials(name: String): String {
    val words = name.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
    val first = words.firstOrNull()?.firstOrNull()
    val last = if (words.size > 1) words.last().firstOrNull() else null
    return listOfNotNull(first, last).joinToString("").uppercase()
  }
}
