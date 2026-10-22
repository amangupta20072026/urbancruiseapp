package app.urbancruise.auth

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import androidx.core.content.ContextCompat
import androidx.core.os.BundleCompat
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.auth.api.phone.SmsRetriever
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status

/**
 * SMS User Consent API: when the OTP SMS arrives, Android asks the user
 * once for permission to read that ONE message. No SMS permission and no
 * change to the SMS text are needed.
 * https://developers.google.com/identity/sms-retriever/user-consent/request
 *
 * JS: NativeModules.SmsUserConsent
 *   start(): Promise<string | null>
 *     Starts listening (Google's window is 5 minutes). Resolves with the
 *     full message text once the user taps Allow, or `null` when they
 *     deny, the window times out, it fails, stop() is called, or a newer
 *     start() replaces it. JS extracts the code from the text.
 *   stop(): void
 *
 * Best-effort: any failure resolves `null` and the user types the code.
 */
class SmsUserConsentModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  private val lock = Any()

  // All guarded by [lock].
  private var pending: Promise? = null
  private var receiver: BroadcastReceiver? = null
  /** Bumped on every start(); late callbacks from older starts are ignored. */
  private var generation = 0

  private val activityListener =
      object : BaseActivityEventListener() {
        override fun onActivityResult(
            activity: Activity,
            requestCode: Int,
            resultCode: Int,
            data: Intent?,
        ) {
          if (requestCode != REQUEST_CODE) return
          val message =
              if (resultCode == Activity.RESULT_OK) {
                data?.getStringExtra(SmsRetriever.EXTRA_SMS_MESSAGE)
              } else {
                null // user tapped Deny
              }
          finish(currentGeneration(), message)
        }
      }

  init {
    reactContext.addActivityEventListener(activityListener)
  }

  override fun getName(): String = NAME

  @ReactMethod
  fun start(promise: Promise) {
    val gen: Int
    val superseded: Promise?
    synchronized(lock) {
      generation += 1
      gen = generation
      superseded = pending
      pending = promise
      registerReceiverLocked()
    }
    superseded?.resolve(null)

    try {
      // null = accept the code from any sender. Our DLT sender is an
      // alphanumeric header (e.g. CP-URCRUZ-T), not a phone number.
      SmsRetriever.getClient(reactApplicationContext)
          .startSmsUserConsent(null)
          .addOnFailureListener { finish(gen, null) }
    } catch (_: Exception) {
      finish(gen, null)
    }
  }

  @ReactMethod
  fun stop() {
    finish(currentGeneration(), null)
  }

  private fun currentGeneration(): Int = synchronized(lock) { generation }

  /** Ends the current listen if it is still generation [gen]. */
  private fun finish(gen: Int, message: String?) {
    val promise: Promise?
    synchronized(lock) {
      if (gen != generation) return
      promise = pending
      pending = null
      unregisterReceiverLocked()
    }
    promise?.resolve(message)
  }

  private fun registerReceiverLocked() {
    if (receiver != null) return
    val newReceiver =
        object : BroadcastReceiver() {
          override fun onReceive(context: Context, intent: Intent) {
            if (intent.action != SmsRetriever.SMS_RETRIEVED_ACTION) return
            val extras = intent.extras ?: return
            val status =
                BundleCompat.getParcelable(extras, SmsRetriever.EXTRA_STATUS, Status::class.java)
            when (status?.statusCode) {
              CommonStatusCodes.SUCCESS -> {
                val consentIntent =
                    BundleCompat.getParcelable(
                        extras,
                        SmsRetriever.EXTRA_CONSENT_INTENT,
                        Intent::class.java,
                    )
                showConsent(currentGeneration(), consentIntent)
              }
              CommonStatusCodes.TIMEOUT -> finish(currentGeneration(), null)
              else -> Unit
            }
          }
        }
    // Exported because the broadcast comes from Google Play services
    // (another app); Android 14+ requires the flag. SEND_PERMISSION
    // ensures only Play services can deliver it.
    ContextCompat.registerReceiver(
        reactApplicationContext,
        newReceiver,
        IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION),
        SmsRetriever.SEND_PERMISSION,
        null,
        ContextCompat.RECEIVER_EXPORTED,
    )
    receiver = newReceiver
  }

  private fun unregisterReceiverLocked() {
    val current = receiver ?: return
    receiver = null
    try {
      reactApplicationContext.unregisterReceiver(current)
    } catch (_: IllegalArgumentException) {
      // Already unregistered.
    }
  }

  private fun showConsent(gen: Int, consentIntent: Intent?) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null || consentIntent == null || !isTrustedConsentIntent(consentIntent)) {
      finish(gen, null)
      return
    }
    try {
      activity.startActivityForResult(consentIntent, REQUEST_CODE)
    } catch (_: Exception) {
      finish(gen, null)
    }
  }

  /**
   * Defense in depth against intent redirection: only launch the consent
   * screen if it belongs to Google Play services and grants no URI access.
   */
  private fun isTrustedConsentIntent(intent: Intent): Boolean {
    val grantFlags =
        Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
    if (intent.flags and grantFlags != 0) return false
    return intent.component?.packageName == GMS_PACKAGE
  }

  override fun invalidate() {
    reactApplicationContext.removeActivityEventListener(activityListener)
    finish(currentGeneration(), null)
    super.invalidate()
  }

  companion object {
    const val NAME = "SmsUserConsent"

    // Below 0xFFFF: FragmentActivity only accepts 16-bit request codes.
    private const val REQUEST_CODE = 4212

    private const val GMS_PACKAGE = "com.google.android.gms"
  }
}