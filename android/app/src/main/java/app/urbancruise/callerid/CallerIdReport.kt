package app.urbancruise.callerid

import android.os.Build
import android.util.Log
import com.google.firebase.crashlytics.FirebaseCrashlytics

/**
 * Sends caller-ID errors to Crashlytics as NON-FATAL reports, so a card
 * that fails on some phone brand shows up in the Firebase console
 * (Crashlytics › Non-fatals) instead of only in the phone's log.
 *
 * PRIVACY: never pass a phone number, a name or any other caller data.
 * Only the place it failed ([where]) and the exception. Reports carry the
 * phone's maker / model / Android version (added by Crashlytics itself),
 * which is what we need to find brand-specific problems.
 *
 * Reporting must never break caller ID: every call is wrapped, and a
 * failure to report is only logged.
 */
object CallerIdReport {

  private const val TAG = "UCCallerId"

  /** Where a report came from; shows as the `caller_id_where` key. */
  object Where {
    const val SCREENING = "screening"
    const val OVERLAY_SHOW = "overlay_show"
    const val OVERLAY_REMOVE = "overlay_remove"
    const val NOTIFICATION = "notification"
    const val STATUS = "status"
    const val ROLE_DIALOG = "role_dialog"
    const val LIST_REPLACE = "list_replace"
    const val LIST_MARK = "list_mark"
    const val LIST_CLEAR = "list_clear"
  }

  /** Logs [error] locally and records it as a Crashlytics non-fatal. */
  fun error(where: String, error: Throwable) {
    Log.w(TAG, "Caller ID error at $where", error)
    try {
      FirebaseCrashlytics.getInstance().apply {
        setCustomKey("caller_id_where", where)
        setCustomKey("caller_id_sdk", Build.VERSION.SDK_INT)
        recordException(error)
      }
    } catch (t: Throwable) {
      Log.w(TAG, "Crashlytics report failed", t)
    }
  }
}
