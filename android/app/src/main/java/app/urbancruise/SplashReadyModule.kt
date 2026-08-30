package app.urbancruise

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Bridges the app's cold-start readiness signal from JS to the native
 * splash's setKeepOnScreenCondition (see MainActivity.kt).
 *
 * Deliberately tiny — this is the entire "no bootsplash library"
 * production pattern: one flag, one method, no dependency, no APK size
 * cost.
 */
class SplashReadyModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "SplashReady"

  @ReactMethod
  fun markReady() {
    MainActivity.isAppReady = true
  }
}