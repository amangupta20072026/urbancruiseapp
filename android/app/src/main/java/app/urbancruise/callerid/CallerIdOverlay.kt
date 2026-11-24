package app.urbancruise.callerid

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.annotation.RequiresApi

/**
 * The Truecaller-style card drawn over the incoming-call screen.
 *
 *   ┌──────────────────────────────────────┐
 *   │ [Urban Cruise customer]           ✕  │
 *   │ (RM)  Rahul Mehta                    │
 *   │       Corporate · Mumbai             │
 *   └──────────────────────────────────────┘
 *
 * Needs "Display over other apps" (Settings.canDrawOverlays). The caller
 * (CallerIdPresenter) checks that and falls back to a notification.
 *
 * WHEN IT CLOSES
 *   - a tap anywhere on the card (product decision: tap only closes);
 *   - the call is answered, declined or ends. Detected without any phone
 *     permission by watching AudioManager's mode: RINGTONE while ringing,
 *     IN_CALL once answered, NORMAL when it stops ringing. Some phones
 *     never report RINGTONE, so the card also closes after MAX_SHOW_MS.
 *
 * Built in code (no XML) so the whole feature lives in this package.
 * Colours match the app theme (src/theme/colors.ts).
 */
object CallerIdOverlay {

  private const val TAG = "UCCallerId"

  /** Hard cap: a ring rarely lasts longer than this. */
  private const val MAX_SHOW_MS = 60_000L
  private const val POLL_MS = 500L

  // src/theme/colors.ts
  private val PRIMARY_DARK = Color.parseColor("#2E7D32")
  private val PRIMARY_TINT = Color.parseColor("#E7F7EC")
  private val TEXT_PRIMARY = Color.parseColor("#111827")
  private val TEXT_SECONDARY = Color.parseColor("#6B7280")
  private val TEXT_TERTIARY = Color.parseColor("#9CA3AF")
  private val BORDER = Color.parseColor("#E5E7EB")

  private val main = Handler(Looper.getMainLooper())
  private var shown: View? = null
  private var shownAt = 0L
  private var sawRinging = false

  /**
   * Shows the card for [entry]. Replaces a card already on screen. Main
   * thread. TYPE_APPLICATION_OVERLAY needs Android 8; caller ID itself
   * needs Android 10, so the only caller (the screening service) is above it.
   */
  @RequiresApi(Build.VERSION_CODES.O)
  fun show(context: Context, entry: CallerIdStore.Entry) {
    dismiss(context)
    val app = context.applicationContext
    val wm = app.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    val view = buildCard(app, entry)
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
              // Below the number at the top of most call screens, well
              // above the Answer / Decline buttons.
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

  private fun buildCard(context: Context, entry: CallerIdStore.Entry): View {
    fun dp(v: Int): Int =
        TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                v.toFloat(),
                context.resources.displayMetrics,
            )
            .toInt()

    val outer = FrameLayout(context).apply { setPadding(dp(16), 0, dp(16), 0) }

    val card =
        LinearLayout(context).apply {
          orientation = LinearLayout.VERTICAL
          setPadding(dp(14), dp(12), dp(14), dp(14))
          background =
              GradientDrawable().apply {
                setColor(Color.WHITE)
                cornerRadius = dp(16).toFloat()
                setStroke(dp(1), BORDER)
              }
          elevation = dp(8).toFloat()
          contentDescription =
              "Urban Cruise customer calling: ${entry.name}. ${CallerIdText.details(entry) ?: ""}"
        }

    // Row 1: pill + close mark
    val top =
        LinearLayout(context).apply {
          orientation = LinearLayout.HORIZONTAL
          gravity = Gravity.CENTER_VERTICAL
        }
    val pill =
        TextView(context).apply {
          text = "Urban Cruise customer"
          setTextColor(PRIMARY_DARK)
          setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
          typeface = Typeface.DEFAULT_BOLD
          setPadding(dp(8), dp(3), dp(8), dp(3))
          background =
              GradientDrawable().apply {
                setColor(PRIMARY_TINT)
                cornerRadius = dp(8).toFloat()
              }
        }
    val spacer = View(context)
    val close =
        TextView(context).apply {
          text = "✕"
          setTextColor(TEXT_TERTIARY)
          setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
          setPadding(dp(8), dp(2), dp(2), dp(2))
          importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }
    top.addView(pill)
    top.addView(spacer, LinearLayout.LayoutParams(0, 1, 1f))
    top.addView(close)

    // Row 2: initials avatar + name / details
    val body =
        LinearLayout(context).apply {
          orientation = LinearLayout.HORIZONTAL
          gravity = Gravity.CENTER_VERTICAL
        }
    val avatar =
        TextView(context).apply {
          text = CallerIdText.initials(entry.name)
          gravity = Gravity.CENTER
          setTextColor(PRIMARY_DARK)
          setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
          typeface = Typeface.DEFAULT_BOLD
          background =
              GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(PRIMARY_TINT)
              }
        }
    val texts = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
    val name =
        TextView(context).apply {
          text = entry.name
          setTextColor(TEXT_PRIMARY)
          setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
          typeface = Typeface.DEFAULT_BOLD
          maxLines = 2
        }
    texts.addView(name)
    CallerIdText.details(entry)?.let { line ->
      texts.addView(
          TextView(context).apply {
            text = line
            setTextColor(TEXT_SECONDARY)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            setPadding(0, dp(2), 0, 0)
          },
      )
    }
    body.addView(avatar, LinearLayout.LayoutParams(dp(48), dp(48)))
    body.addView(
        texts,
        LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
          marginStart = dp(12)
        },
    )

    card.addView(top)
    card.addView(
        body,
        LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT,
            )
            .apply { topMargin = dp(12) },
    )
    outer.addView(card)
    return outer
  }
}
