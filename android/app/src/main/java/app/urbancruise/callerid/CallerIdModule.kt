package app.urbancruise.callerid

import android.Manifest
import android.app.Activity
import android.app.role.RoleManager
import android.content.pm.PackageManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicReference

/**
 * Caller ID bridge for React Native (UC staff only; JS decides who calls it).
 *
 * JS: src/native/callerId.ts
 *   getStatus()                       → { supported, roleHeld, canDrawOverlays,
 *                                         notificationsEnabled, contactsGranted,
 *                                         count, version, syncedAt }
 *   requestRole()                     → boolean (Android's "caller ID app" dialog)
 *   openOverlaySettings()             → opens "Display over other apps"
 *   openNotificationSettings()        → opens this app's notification settings
 *   replaceAll(version, json, at)     → rows written
 *   markChecked(at)                   → server said "no change"
 *   clear()                           → deletes the list (logout / revoked)
 *
 * Database work runs on a single background thread, never the JS thread.
 * Caller ID needs Android 10 (API 29) for ROLE_CALL_SCREENING; below that
 * `supported` is false and the app hides the feature.
 */
class CallerIdModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  private val executor: ExecutorService = Executors.newSingleThreadExecutor()
  private val pendingRole = AtomicReference<Promise?>(null)

  private val activityListener =
      object : BaseActivityEventListener() {
        override fun onActivityResult(
            activity: Activity,
            requestCode: Int,
            resultCode: Int,
            data: Intent?,
        ) {
          if (requestCode != REQUEST_ROLE) return
          val promise = pendingRole.getAndSet(null) ?: return
          promise.resolve(isRoleHeld())
        }
      }

  init {
    reactContext.addActivityEventListener(activityListener)
  }

  override fun getName(): String = NAME

  private fun isSupported(): Boolean = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q

  /**
   * Each RoleManager use checks the SDK level in the same function, so
   * Android lint (NewApi, fatal in release builds) can see the guard.
   */
  private fun isRoleHeld(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return false
    val rm = reactApplicationContext.getSystemService(RoleManager::class.java) ?: return false
    return rm.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING) &&
        rm.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)
  }

  @ReactMethod
  fun getStatus(promise: Promise) {
    executor.execute {
      try {
        val status = CallerIdStore.get(reactApplicationContext).status()
        val map =
            Arguments.createMap().apply {
              putBoolean("supported", isSupported())
              putBoolean("roleHeld", isRoleHeld())
              putBoolean("canDrawOverlays", Settings.canDrawOverlays(reactApplicationContext))
              putBoolean(
                  "notificationsEnabled",
                  CallerIdNotifier.canNotify(reactApplicationContext),
              )
              // READ_CONTACTS: without it Android never passes calls from
              // saved contacts to the screening service. Requested from JS
              // (PermissionService capability `callerIdContacts`).
              putBoolean(
                  "contactsGranted",
                  reactApplicationContext.checkSelfPermission(Manifest.permission.READ_CONTACTS) ==
                      PackageManager.PERMISSION_GRANTED,
              )
              putInt("count", status.count)
              if (status.version != null) putString("version", status.version)
              else putNull("version")
              if (status.syncedAt != null) putString("syncedAt", status.syncedAt)
              else putNull("syncedAt")
            }
        promise.resolve(map)
      } catch (e: Exception) {
        promise.reject("CALLER_ID_STATUS", e)
      }
    }
  }

  @ReactMethod
  fun requestRole(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      promise.resolve(false)
      return
    }
    val rm = reactApplicationContext.getSystemService(RoleManager::class.java)
    if (rm == null || !rm.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING)) {
      promise.resolve(false)
      return
    }
    if (rm.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)) {
      promise.resolve(true)
      return
    }
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.resolve(false)
      return
    }
    if (!pendingRole.compareAndSet(null, promise)) {
      // A dialog is already open.
      promise.resolve(false)
      return
    }
    try {
      activity.startActivityForResult(
          rm.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING),
          REQUEST_ROLE,
      )
    } catch (e: Exception) {
      Log.w(TAG, "Role dialog not shown", e)
      pendingRole.compareAndSet(promise, null)
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun openOverlaySettings(promise: Promise) {
    val pkg = reactApplicationContext.packageName
    val intent =
        Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$pkg"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    promise.resolve(startSafely(intent) || openAppDetails())
  }

  @ReactMethod
  fun openNotificationSettings(promise: Promise) {
    val intent =
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, reactApplicationContext.packageName)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    promise.resolve(startSafely(intent) || openAppDetails())
  }

  @ReactMethod
  fun replaceAll(version: String, entriesJson: String, syncedAt: String, promise: Promise) {
    executor.execute {
      try {
        val written =
            CallerIdStore.get(reactApplicationContext).replaceAll(version, entriesJson, syncedAt)
        Log.i(TAG, "Caller ID list replaced: $written numbers")
        promise.resolve(written)
      } catch (e: Exception) {
        Log.w(TAG, "Caller ID list not replaced; previous list kept", e)
        promise.reject("CALLER_ID_REPLACE", e)
      }
    }
  }

  @ReactMethod
  fun markChecked(syncedAt: String, promise: Promise) {
    executor.execute {
      try {
        CallerIdStore.get(reactApplicationContext).markChecked(syncedAt)
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("CALLER_ID_MARK", e)
      }
    }
  }

  @ReactMethod
  fun clear(promise: Promise) {
    executor.execute {
      try {
        CallerIdStore.get(reactApplicationContext).clear()
        Log.i(TAG, "Caller ID list cleared")
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("CALLER_ID_CLEAR", e)
      }
    }
  }

  /** Fallback for phones that hide the specific settings page. */
  private fun openAppDetails(): Boolean {
    val intent =
        Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:${reactApplicationContext.packageName}"),
            )
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return startSafely(intent)
  }

  private fun startSafely(intent: Intent): Boolean =
      try {
        reactApplicationContext.startActivity(intent)
        true
      } catch (e: Exception) {
        Log.w(TAG, "Settings page not opened: ${intent.action}", e)
        false
      }

  override fun invalidate() {
    reactApplicationContext.removeActivityEventListener(activityListener)
    pendingRole.getAndSet(null)?.resolve(false)
    executor.shutdown()
    super.invalidate()
  }

  companion object {
    const val NAME = "CallerId"
    private const val TAG = "UCCallerId"
    // Below 0xFFFF: FragmentActivity only accepts 16-bit request codes.
    private const val REQUEST_ROLE = 4212
  }
}
