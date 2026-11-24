package app.urbancruise.callerid

import android.app.KeyguardManager
import android.content.Context
import android.os.Build
import android.provider.Settings
import android.telecom.Call
import android.telecom.CallScreeningService
import android.util.Log
import androidx.annotation.RequiresApi

/**
 * Android calls this for every incoming call once the user has chosen
 * Urban Cruise as the caller-ID app (RoleManager.ROLE_CALL_SCREENING,
 * requested by CallerIdModule.requestRole).
 * https://developer.android.com/reference/android/telecom/CallScreeningService
 *
 * RULES
 *   - Identification only: EVERY call is allowed, never blocked, silenced
 *     or hidden from the call log.
 *   - Local lookup only, no network: it must answer Android within five
 *     seconds, and a SQLite primary-key lookup takes milliseconds.
 *   - Identifies customers, vendors, drivers and UC staff (one list,
 *     CallerIdStore). Exact match only (E.164, same rule as the server). No match, an
 *     unreadable or hidden number → nothing is shown.
 *   - Any error is swallowed and the call still goes through.
 *
 * WHAT ANDROID DOESN'T SEND HERE
 *   Private / unknown / payphone numbers. Numbers saved in the phone's
 *   contacts are sent ONLY while the app holds READ_CONTACTS ("Saved
 *   contacts" on the Caller ID screen); without it those calls show no
 *   card. The app never reads the contacts themselves.
 *
 * Works when the app is closed or removed from recents: Android starts
 * this service on its own. React Native is not involved.
 */
@RequiresApi(Build.VERSION_CODES.Q)
class CallerIdScreeningService : CallScreeningService() {

  override fun onScreenCall(callDetails: Call.Details) {
    try {
      identify(callDetails)
    } catch (e: Exception) {
      Log.w(TAG, "Caller ID failed; call allowed", e)
    } finally {
      // Always allow: default CallResponse = don't block, don't silence.
      respondToCall(callDetails, CallResponse.Builder().build())
    }
  }

  private fun identify(details: Call.Details) {
    if (details.callDirection != Call.Details.DIRECTION_INCOMING) return

    val raw = details.handle?.schemeSpecificPart ?: return
    val phone = CallerIdNumber.toE164(raw) ?: return
    val entry = CallerIdStore.get(this).lookup(phone) ?: return

    // Logged without the number or name.
    Log.i(TAG, "Known ${entry.kind} calling")
    present(this, entry, phone)
  }

  /**
   * Overlay card when the phone is unlocked and "Display over other apps"
   * is on; otherwise the backup notification.
   */
  private fun present(context: Context, entry: CallerIdStore.Entry, phoneE164: String) {
    val keyguard = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
    val locked = keyguard.isKeyguardLocked
    if (!locked && Settings.canDrawOverlays(context)) {
      CallerIdOverlay.show(context, entry, phoneE164)
    } else {
      CallerIdNotifier.show(context, entry, phoneE164)
    }
  }

  companion object {
    private const val TAG = "UCCallerId"
  }
}
