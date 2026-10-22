package app.urbancruise.auth

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.auth.api.identity.GetPhoneNumberHintIntentRequest
import com.google.android.gms.auth.api.identity.Identity
import java.util.concurrent.atomic.AtomicReference

/**
 * Shows Google's Phone Number Hint sheet: the SIM-based phone numbers on
 * this device, so the user can pick one instead of typing it.
 * https://developer.android.com/identity/phone-number-hint
 *
 * No permission and no Google account needed. Best-effort: every failure
 * (no SIM, Play services unavailable, user cancelled, no activity)
 * resolves `null` so the user simply types the number.
 *
 * JS: NativeModules.PhoneNumberHint.request(): Promise<string | null>
 * The returned number is as Google gives it (e.g. "+919812345678");
 * JS normalises it.
 */
class PhoneNumberHintModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  /** The caller waiting for the sheet's result. One sheet at a time. */
  private val pending = AtomicReference<Promise?>(null)

  private val activityListener =
      object : BaseActivityEventListener() {
        override fun onActivityResult(
            activity: Activity,
            requestCode: Int,
            resultCode: Int,
            data: Intent?,
        ) {
          if (requestCode != REQUEST_CODE) return
          val promise = pending.getAndSet(null) ?: return
          if (resultCode != Activity.RESULT_OK || data == null) {
            promise.resolve(null) // cancelled / "None of the above"
            return
          }
          try {
            promise.resolve(Identity.getSignInClient(activity).getPhoneNumberFromIntent(data))
          } catch (_: Exception) {
            promise.resolve(null)
          }
        }
      }

  init {
    reactContext.addActivityEventListener(activityListener)
  }

  override fun getName(): String = NAME

  @ReactMethod
  fun request(promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.resolve(null)
      return
    }
    // A sheet is already open: don't open a second one.
    if (!pending.compareAndSet(null, promise)) {
      promise.resolve(null)
      return
    }

    val request = GetPhoneNumberHintIntentRequest.builder().build()
    Identity.getSignInClient(activity)
        .getPhoneNumberHintIntent(request)
        .addOnSuccessListener { pendingIntent ->
          try {
            activity.startIntentSenderForResult(
                pendingIntent.intentSender,
                REQUEST_CODE,
                null,
                0,
                0,
                0,
            )
          } catch (_: Exception) {
            settle(promise)
          }
        }
        .addOnFailureListener { settle(promise) }
  }

  /** Resolves `null` for [promise] if it is still the pending one. */
  private fun settle(promise: Promise) {
    if (pending.compareAndSet(promise, null)) promise.resolve(null)
  }

  override fun invalidate() {
    reactApplicationContext.removeActivityEventListener(activityListener)
    pending.getAndSet(null)?.resolve(null)
    super.invalidate()
  }

  companion object {
    const val NAME = "PhoneNumberHint"

    // Below 0xFFFF: FragmentActivity only accepts 16-bit request codes.
    private const val REQUEST_CODE = 4211
  }
}