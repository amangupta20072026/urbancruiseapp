package app.urbancruise.callerid

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.text.TextUtils
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.annotation.DrawableRes
import androidx.annotation.RequiresApi
import androidx.core.content.ContextCompat
import app.urbancruise.R

/**
 * The Truecaller-style card drawn over the incoming-call screen
 * (design "A", approved 24 Nov 2026; four kinds added 24 Nov 2026).
 *
 *   ┌──────────────────────────────────────────┐
 *   │▓▓ [UC] Urban Cruise         [◆ Kind]  ✕ ▓│  header in the kind's colour
 *   │▓▓                                        ▓│
 *   │  (RS)                                     │  avatar overlaps header
 *   │  Ramesh Sharma  [Inactive]                │  name + server tag
 *   │  Sharma Travels Pvt Ltd                   │  subtitle (vendor / driver)
 *   │  ☎ +91 98100 12345                        │  the calling number
 *   │  [⌖ Mumbai]                               │  chips by kind
 *   │───────────────────────────────────────────│
 *   │  ✓ Identified by Urban Cruise  Tap to close│
 *   └──────────────────────────────────────────┘
 *
 * Kind colours (CallerIdText.kindStyle): customer green, vendor orange,
 * driver blue, UC staff purple. Customer type chip: Corporate blue,
 * Agent purple, Personal green. Anything missing hides its line or chip.
 *
 * Needs "Display over other apps" (Settings.canDrawOverlays). The caller
 * (CallerIdScreeningService) checks that and falls back to a notification.
 *
 * WHEN IT CLOSES
 *   - a tap anywhere on the card (product decision: tap only closes);
 *   - the call is answered, declined or ends. Detected without any phone
 *     permission by watching AudioManager's mode: RINGTONE while ringing,
 *     IN_CALL once answered, NORMAL when it stops ringing. Some phones
 *     never report RINGTONE, so the card also closes after MAX_SHOW_MS.
 *
 * Built in code (no layout XML) so the whole feature lives in this
 * package. Colours match the app theme (src/theme/colors.ts); the card
 * is always light, whatever the phone's dark-mode setting.
 */
object CallerIdOverlay {

  private const val TAG = "UCCallerId"

  /** Hard cap: a ring rarely lasts longer than this. */
  private const val MAX_SHOW_MS = 60_000L
  private const val POLL_MS = 500L

  // src/theme/colors.ts
  /** The footer tick, always brand green. */
  private val BRAND = Color.parseColor("#2E7D32") // primaryDark
  /** "Inactive" tag: errorTint / error text. */
  private val BADGE_BG = Color.parseColor("#FEE2E2")
  private val BADGE_FG = Color.parseColor("#B91C1C")
  private val ON_BRAND_SOFT = Color.argb(56, 255, 255, 255) // white 22%
  private val TEXT_PRIMARY = Color.parseColor("#111827")
  private val TEXT_SECONDARY = Color.parseColor("#6B7280")
  private val TEXT_TERTIARY = Color.parseColor("#9CA3AF")
  private val NEUTRAL_CHIP_BG = Color.parseColor("#F3F4F6")
  private val NEUTRAL_CHIP_FG = Color.parseColor("#4B5563")
  private val BORDER = Color.parseColor("#E5E7EB")

  private val main = Handler(Looper.getMainLooper())
  private var shown: View? = null
  private var shownAt = 0L
  private var sawRinging = false

  /**
   * Shows the card for [entry], calling from [phoneE164] (the number that
   * is ringing now, shown in full under the name). Replaces a card already
   * on screen. Main thread. TYPE_APPLICATION_OVERLAY needs Android 8; caller ID itself
   * needs Android 10, so the only caller (the screening service) is above it.
   */
  @RequiresApi(Build.VERSION_CODES.O)
  fun show(context: Context, entry: CallerIdStore.Entry, phoneE164: String) {
    dismiss(context)
    val app = context.applicationContext
    val wm = app.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    val view = buildCard(app, entry, phoneE164)
    view.setOnClickListener { dismiss(app) }

    val params =
        WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                // Never takes focus or keys; touches outside the card go
                // to the call screen, so Answer / Decline still work.
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT,
            )
            .apply {
              gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
              // Below the call banner / number at the top, well above the
              // Answer / Decline buttons at the bottom of the call screen.
              y = (app.resources.displayMetrics.heightPixels * 0.18f).toInt()
            }

    try {
      wm.addView(view, params)
      shown = view
      shownAt = SystemClock.elapsedRealtime()
      sawRinging = false
      main.postDelayed(watcher(app), POLL_MS)
    } catch (e: Exception) {
      // Permission revoked between the check and now, or the OS refused.
      Log.w(TAG, "Overlay not shown", e)
      shown = null
    }
  }

  /** Removes the card if it is on screen. Safe to call any time. */
  fun dismiss(context: Context) {
    main.removeCallbacksAndMessages(null)
    val view = shown ?: return
    shown = null
    try {
      val wm = context.applicationContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager
      wm.removeViewImmediate(view)
    } catch (e: Exception) {
      Log.w(TAG, "Overlay remove failed", e)
    }
  }

  private fun watcher(context: Context): Runnable =
      object : Runnable {
        override fun run() {
          if (shown == null) return
          val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
          val mode = audio.mode
          val elapsed = SystemClock.elapsedRealtime() - shownAt
          val answered =
              mode == AudioManager.MODE_IN_CALL || mode == AudioManager.MODE_IN_COMMUNICATION
          if (mode == AudioManager.MODE_RINGTONE) sawRinging = true
          val stoppedRinging = sawRinging && mode == AudioManager.MODE_NORMAL
          if (answered || stoppedRinging || elapsed >= MAX_SHOW_MS) {
            dismiss(context)
            return
          }
          main.postDelayed(this, POLL_MS)
        }
      }

  /* ---------------------------------------------------------------- */
  /* Layout                                                           */
  /* ---------------------------------------------------------------- */

  private fun buildCard(context: Context, entry: CallerIdStore.Entry, phoneE164: String): View {
    val ui = Ui(context)
    val kind = CallerIdText.kindStyle(entry.kind)
    val phone = CallerIdText.formatPhone(phoneE164)

    // Vertical room so the card's shadow isn't cut off.
    val outer = FrameLayout(context).apply { setPadding(ui.dp(12), ui.dp(8), ui.dp(12), ui.dp(16)) }

    val card =
        LinearLayout(context).apply {
          orientation = LinearLayout.VERTICAL
          background = ui.rounded(Color.WHITE, ui.dp(20), stroke = BORDER)
          elevation = ui.dp(12).toFloat()
          // Clips the coloured header to the card's rounded corners.
          clipToOutline = true
          contentDescription =
              listOfNotNull(
                      "Urban Cruise ${kind.callingLabel.lowercase()} calling",
                      entry.name,
                      phone,
                      CallerIdText.details(entry),
                  )
                  .joinToString(". ")
        }

    card.addView(header(ui, kind))
    card.addView(body(ui, entry, kind, phone), ui.matchWrap().apply { topMargin = -ui.dp(30) })
    card.addView(
        View(context).apply { setBackgroundColor(BORDER) },
        LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, ui.dp(1)),
    )
    card.addView(footer(ui))

    outer.addView(card)
    return outer
  }

  /** Coloured band: [UC] Urban Cruise ........ [icon Kind] ✕ */
  private fun header(ui: Ui, kind: CallerIdText.KindStyle): View {
    val row =
        LinearLayout(ui.context).apply {
          orientation = LinearLayout.HORIZONTAL
          gravity = Gravity.CENTER_VERTICAL
          setBackgroundColor(kind.header)
          // Tall bottom padding: the avatar sits over this part.
          setPadding(ui.dp(14), ui.dp(12), ui.dp(12), ui.dp(40))
        }

    val badge =
        ui.text("UC", 11f, Color.WHITE, bold = true).apply {
          background = ui.rounded(ON_BRAND_SOFT, ui.dp(6))
          setPadding(ui.dp(6), ui.dp(2), ui.dp(6), ui.dp(2))
        }
    val brand = ui.text("Urban Cruise", 14f, Color.WHITE, bold = true)
    val pill =
        ui.text(kind.label, 11f, Color.WHITE, bold = true).apply {
          background = ui.rounded(ON_BRAND_SOFT, ui.dp(12))
          setPadding(ui.dp(8), ui.dp(3), ui.dp(10), ui.dp(3))
          ui.startIcon(this, kind.icon, Color.WHITE, 12)
        }
    val close =
        ImageView(ui.context).apply {
          setImageDrawable(ui.icon(R.drawable.ic_caller_id_close, Color.WHITE, 20))
          importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }

    row.addView(badge)
    row.addView(brand, ui.wrap().apply { marginStart = ui.dp(8) })
    row.addView(View(ui.context), LinearLayout.LayoutParams(0, 1, 1f))
    row.addView(pill)
    row.addView(close, LinearLayout.LayoutParams(ui.dp(20), ui.dp(20)).apply { marginStart = ui.dp(12) })
    return row
  }

  /**
   * Avatar overlapping the header, the name (+ tag), the subtitle, the
   * number, then the chips:
   *   customer  [type] [⌖ city]
   *   vendor    [⌖ city]                  subtitle = company
   *   driver    [⌖ city]                  subtitle = "Driver · vendor"
   *   staff     [▣ department] [⌖ branch]
   */
  private fun body(
      ui: Ui,
      entry: CallerIdStore.Entry,
      kind: CallerIdText.KindStyle,
      phone: String,
  ): View {
    val col =
        LinearLayout(ui.context).apply {
          orientation = LinearLayout.VERTICAL
          setPadding(ui.dp(16), 0, ui.dp(16), ui.dp(14))
        }

    // White ring around a tinted circle with the initials.
    val ring =
        FrameLayout(ui.context).apply {
          background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(Color.WHITE)
          }
          setPadding(ui.dp(3), ui.dp(3), ui.dp(3), ui.dp(3))
        }
    val avatar =
        ui.text(CallerIdText.initials(entry.name), 20f, kind.foreground, bold = true).apply {
          gravity = Gravity.CENTER
          background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(kind.tint)
          }
        }
    ring.addView(avatar, FrameLayout.LayoutParams(ui.dp(56), ui.dp(56)))
    col.addView(ring, LinearLayout.LayoutParams(ui.dp(62), ui.dp(62)))

    // Name, with the server's tag (e.g. "Inactive") right after it.
    val nameRow =
        LinearLayout(ui.context).apply {
          orientation = LinearLayout.HORIZONTAL
          gravity = Gravity.CENTER_VERTICAL
        }
    val name =
        ui.text(entry.name, 21f, TEXT_PRIMARY, bold = true).apply {
          maxLines = 2
          ellipsize = TextUtils.TruncateAt.END
          // Leaves room for the tag on the same line.
          maxWidth = ui.screenWidth() - ui.dp(150)
        }
    nameRow.addView(name)
    entry.badge?.trim()?.ifEmpty { null }?.let { tag ->
      nameRow.addView(
          ui.text(tag, 11f, BADGE_FG, bold = true).apply {
            background = ui.rounded(BADGE_BG, ui.dp(8))
            setPadding(ui.dp(7), ui.dp(3), ui.dp(7), ui.dp(3))
          },
          ui.wrap().apply { marginStart = ui.dp(8) },
      )
    }
    col.addView(nameRow, ui.matchWrap().apply { topMargin = ui.dp(8) })

    // Vendor company / "Driver · vendor".
    entry.subtitle?.trim()?.ifEmpty { null }?.let { sub ->
      col.addView(
          ui.text(sub, 14f, TEXT_SECONDARY).apply {
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
          },
          ui.matchWrap().apply { topMargin = ui.dp(3) },
      )
    }

    // The number that is calling, in full (product decision, 24 Nov 2026).
    val number =
        ui.text(phone, 14f, TEXT_SECONDARY).apply {
          letterSpacing = 0.02f
          ui.startIcon(this, R.drawable.ic_stat_caller_id, TEXT_SECONDARY, 14)
        }
    col.addView(number, ui.matchWrap().apply { topMargin = ui.dp(4) })

    val chips = chipsFor(ui, entry, kind)
    if (chips.isNotEmpty()) {
      val row =
          LinearLayout(ui.context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
          }
      chips.forEachIndexed { i, chip ->
        // Two long chips must still fit on one line.
        chip.maxWidth = (ui.screenWidth() - ui.dp(80)) / 2
        row.addView(chip, ui.wrap().apply { if (i > 0) marginStart = ui.dp(8) })
      }
      col.addView(row, ui.matchWrap().apply { topMargin = ui.dp(10) })
    }
    return col
  }

  private fun chipsFor(
      ui: Ui,
      entry: CallerIdStore.Entry,
      kind: CallerIdText.KindStyle,
  ): List<TextView> {
    val city = CallerIdText.city(entry)
    val cityChip =
        city?.let { ui.chip(it, R.drawable.ic_caller_id_pin, NEUTRAL_CHIP_BG, NEUTRAL_CHIP_FG) }
    return when (entry.kind) {
      "customer" -> {
        val type = CallerIdText.typeStyle(entry.type)
        listOfNotNull(
            type?.let { ui.chip(it.label, it.icon, it.background, it.foreground) },
            cityChip,
        )
      }
      "staff" ->
          listOfNotNull(
              entry.department?.trim()?.ifEmpty { null }?.let {
                ui.chip(it, R.drawable.ic_caller_id_briefcase, kind.tint, kind.foreground)
              },
              entry.branch?.trim()?.ifEmpty { null }?.let {
                ui.chip(it, R.drawable.ic_caller_id_pin, NEUTRAL_CHIP_BG, NEUTRAL_CHIP_FG)
              },
          )
      else -> listOfNotNull(cityChip)
    }
  }

  /** ✓ Identified by Urban Cruise ............ Tap to close */
  private fun footer(ui: Ui): View {
    val row =
        LinearLayout(ui.context).apply {
          orientation = LinearLayout.HORIZONTAL
          gravity = Gravity.CENTER_VERTICAL
          setPadding(ui.dp(16), ui.dp(9), ui.dp(16), ui.dp(10))
        }
    val identified =
        ui.text("Identified by Urban Cruise", 11f, TEXT_SECONDARY).apply {
          ui.startIcon(this, R.drawable.ic_caller_id_shield, BRAND, 13)
        }
    row.addView(identified)
    row.addView(View(ui.context), LinearLayout.LayoutParams(0, 1, 1f))
    row.addView(ui.text("Tap to close", 11f, TEXT_TERTIARY))
    return row
  }

  /** Small view helpers for this card. */
  private class Ui(val context: Context) {

    fun dp(v: Int): Int =
        TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                v.toFloat(),
                context.resources.displayMetrics,
            )
            .toInt()

    fun screenWidth(): Int = context.resources.displayMetrics.widthPixels

    fun wrap() =
        LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT,
        )

    fun matchWrap() =
        LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT,
        )

    fun rounded(color: Int, radius: Int, stroke: Int? = null): GradientDrawable =
        GradientDrawable().apply {
          setColor(color)
          cornerRadius = radius.toFloat()
          if (stroke != null) setStroke(dp(1), stroke)
        }

    fun text(value: String, sizeSp: Float, color: Int, bold: Boolean = false): TextView =
        TextView(context).apply {
          text = value
          setTextColor(color)
          setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
          typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
          includeFontPadding = false
        }

    /** A vector icon from res/drawable, tinted and sized in dp. */
    fun icon(@DrawableRes res: Int, color: Int, sizeDp: Int): Drawable? =
        ContextCompat.getDrawable(context, res)?.mutate()?.apply {
          setTint(color)
          setBounds(0, 0, dp(sizeDp), dp(sizeDp))
        }

    fun startIcon(view: TextView, @DrawableRes res: Int, color: Int, sizeDp: Int) {
      view.setCompoundDrawablesRelative(icon(res, color, sizeDp), null, null, null)
      view.compoundDrawablePadding = dp(4)
    }

    /** Rounded chip: [icon label]. */
    fun chip(label: String, @DrawableRes iconRes: Int, bg: Int, fg: Int): TextView =
        text(label, 12f, fg, bold = true).apply {
          background = rounded(bg, dp(14))
          setPadding(dp(10), dp(6), dp(12), dp(6))
          maxLines = 1
          ellipsize = TextUtils.TruncateAt.END
          startIcon(this, iconRes, fg, 14)
        }
  }
}
