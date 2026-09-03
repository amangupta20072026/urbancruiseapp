/*
 * ---------------------------------------------------------------------------
 * DriverLocationModule
 * ---------------------------------------------------------------------------
 *
 * React Native bridge for the Android driver location foreground service.
 *
 * Exposes:
 *
 *   startTracking()
 *   stopTracking()
 *   isLocationEnabled()
 *
 * Location collection itself remains in JavaScript via
 * react-native-geolocation-service.
 *
 * ---------------------------------------------------------------------------
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

    override fun getName(): String {
        return NAME
    }

    /**
     * Start the Android location foreground service.
     */
    @ReactMethod
    fun startTracking(promise: Promise) {
        try {
            DriverLocationForegroundService.start(
                reactContext,
            )

            promise.resolve(null)
        } catch (throwable: Throwable) {
            promise.reject(
                ERR_START,
                throwable.message
                    ?: "Failed to start driver location foreground service",
                throwable,
            )
        }
    }

    /**
     * Stop the Android location foreground service.
     *
     * This operation is intentionally idempotent:
     *
     *   - service running  -> service stops
     *   - service already stopped -> no failure
     *
     * JavaScript is responsible for stopping watchPosition() separately.
     */
    @ReactMethod
    fun stopTracking(promise: Promise) {
        try {
            DriverLocationForegroundService.stop(
                reactContext,
            )

            promise.resolve(null)
        } catch (throwable: Throwable) {
            promise.reject(
                ERR_STOP,
                throwable.message
                    ?: "Failed to stop driver location foreground service",
                throwable,
            )
        }
    }

    /**
     * Returns whether Android's device-level Location Services master switch
     * is enabled.
     *
     * This is NOT the same as checking runtime location permission.
     */
    @ReactMethod
    fun isLocationEnabled(promise: Promise) {
        try {
            val locationManager =
                reactContext.getSystemService(
                    Context.LOCATION_SERVICE,
                ) as LocationManager

            val enabled =
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    /*
                     * Android 9+ authoritative master-switch API.
                     */
                    locationManager.isLocationEnabled
                } else {
                    /*
                     * Android 7–8 fallback.
                     */
                    @Suppress("DEPRECATION")
                    (
                        locationManager.isProviderEnabled(
                            LocationManager.GPS_PROVIDER,
                        ) ||
                            locationManager.isProviderEnabled(
                                LocationManager.NETWORK_PROVIDER,
                            )
                    )
                }

            promise.resolve(enabled)
        } catch (throwable: Throwable) {
            promise.reject(
                ERR_LOCATION_CHECK,
                throwable.message
                    ?: "Failed to read Location Services state",
                throwable,
            )
        }
    }

    companion object {

        const val NAME =
            "DriverLocationModule"

        private const val ERR_START =
            "E_DRIVER_FGS_START"

        private const val ERR_STOP =
            "E_DRIVER_FGS_STOP"

        private const val ERR_LOCATION_CHECK =
            "E_LOCATION_ENABLED_CHECK"
    }
}