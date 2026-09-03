/*
 * ------------------------------------------------------------------
 * DriverLocationModule
 * ------------------------------------------------------------------
 * React Native NativeModule that exposes the FGS start / stop
 * operations to JavaScript, plus a Location Services (GPS master
 * switch) state query.
 *
 * Kept minimal — the actual location watching happens in JS via
 * react-native-geolocation-service. This module handles ONLY:
 *   - startTracking()      → start the FGS
 *   - stopTracking()       → stop the FGS
 *   - isLocationEnabled()  → is the device's Location Services
 *                            master switch ON? (not the app perm,
 *                            not the trip state — the system toggle)
 *
 * The last method exists because react-native-geolocation-service
 * intentionally does NOT expose a provider-status API — the library
 * assumes callers have already checked. So we ask LocationManager
 * directly. On API 28+ we use `isLocationEnabled` (the master switch
 * added in Android 9); on 24–27 we fall back to querying providers.
 *
 * JS API mirror:
 *   NativeModules.DriverLocationModule.startTracking(): Promise<void>
 *   NativeModules.DriverLocationModule.stopTracking(): Promise<void>
 *   NativeModules.DriverLocationModule.isLocationEnabled(): Promise<boolean>
 * ------------------------------------------------------------------
 */

package app.urbancruise.location

import android.content.Context
import android.location.LocationManager
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DriverLocationModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = NAME

    @ReactMethod
    fun startTracking(promise: Promise) {
        try {
            DriverLocationForegroundService.start(reactContext)
            promise.resolve(null)
        } catch (throwable: Throwable) {
            promise.reject(ERR_START, throwable.message ?: "Failed to start FGS", throwable)
        }
    }

    @ReactMethod
    fun stopTracking(promise: Promise) {
        try {
            DriverLocationForegroundService.stop(reactContext)
            promise.resolve(null)
        } catch (throwable: Throwable) {
            promise.reject(ERR_STOP, throwable.message ?: "Failed to stop FGS", throwable)
        }
    }

    /**
     * True if the device's Location Services (GPS master switch) is ON.
     *
     * Distinct from app-level location permission — a user can grant
     * ACCESS_FINE_LOCATION and still have the master switch off, in
     * which case no fixes arrive. Callers use this to render a
     * "Turn on location" banner deep-linking to the system settings.
     */
    @ReactMethod
    fun isLocationEnabled(promise: Promise) {
        try {
            val lm = reactContext
                .getSystemService(Context.LOCATION_SERVICE) as LocationManager
            val enabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                // Android 9+ — the authoritative master-switch API.
                lm.isLocationEnabled
            } else {
                // Fallback for API 24–27: consider Location Services
                // "on" if any provider is enabled. The master switch
                // as a distinct concept didn't exist pre-Android 9.
                @Suppress("DEPRECATION")
                (
                    lm.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                        lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
                    )
            }
            promise.resolve(enabled)
        } catch (throwable: Throwable) {
            promise.reject(
                ERR_LOCATION_CHECK,
                throwable.message ?: "Failed to read Location Services state",
                throwable,
            )
        }
    }

    companion object {
        const val NAME = "DriverLocationModule"
        private const val ERR_START = "E_DRIVER_FGS_START"
        private const val ERR_STOP = "E_DRIVER_FGS_STOP"
        private const val ERR_LOCATION_CHECK = "E_LOCATION_ENABLED_CHECK"
    }
}