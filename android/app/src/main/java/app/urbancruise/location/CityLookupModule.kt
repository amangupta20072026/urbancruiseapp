package app.urbancruise.location

import android.location.Address
import android.location.Geocoder
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.IOException
import java.util.Locale
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * City name for a coordinate, using Android's built-in Geocoder
 * (no API key, no paid service).
 * https://developer.android.com/reference/android/location/Geocoder
 *
 * Best-effort: every failure resolves `null` so the user types the city.
 * Failures include: no geocoder backend on the device (Geocoder.isPresent()
 * is false, e.g. no Google Play services), no network, no result, or a
 * result without a locality. The reason is logged under the tag
 * "UCCityLookup" (adb logcat -s UCCityLookup).
 *
 * Only Address.locality is returned. Other fields (district, state) are
 * not cities, so they are never used as a fallback.
 *
 * Names are requested in English for India (en-IN) so they match the
 * spelling the CRM uses ("Delhi", not "दिल्ली").
 *
 * JS: NativeModules.CityLookup.fromCoordinates(lat, lng): Promise<string | null>
 */
class CityLookupModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  /** Runs the blocking pre-API-33 Geocoder call off the JS thread. */
  private val executor: ExecutorService = Executors.newSingleThreadExecutor()

  override fun getName(): String = NAME

  @ReactMethod
  fun fromCoordinates(latitude: Double, longitude: Double, promise: Promise) {
    if (!isValidCoordinate(latitude, longitude)) {
      Log.w(TAG, "Rejected invalid coordinate")
      promise.resolve(null)
      return
    }
    if (!Geocoder.isPresent()) {
      Log.i(TAG, "No geocoder backend on this device")
      promise.resolve(null)
      return
    }

    val geocoder = Geocoder(reactApplicationContext, LOCALE_EN_IN)
    // The listener API and the executor path can each fail late; settle once.
    val settled = AtomicBoolean(false)
    val settle: (String?) -> Unit = { city ->
      if (settled.compareAndSet(false, true)) promise.resolve(city)
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      geocoder.getFromLocation(
          latitude,
          longitude,
          MAX_RESULTS,
          object : Geocoder.GeocodeListener {
            override fun onGeocode(addresses: MutableList<Address>) {
              settle(cityFrom(addresses))
            }

            override fun onError(errorMessage: String?) {
              Log.w(TAG, "Geocoder error: $errorMessage")
              settle(null)
            }
          },
      )
      return
    }

    executor.execute {
      try {
        @Suppress("DEPRECATION")
        val addresses = geocoder.getFromLocation(latitude, longitude, MAX_RESULTS)
        settle(cityFrom(addresses))
      } catch (e: IOException) {
        // Thrown when the network or the geocoder service is unavailable.
        Log.w(TAG, "Geocoder unavailable", e)
        settle(null)
      } catch (e: IllegalArgumentException) {
        Log.w(TAG, "Geocoder rejected the coordinate", e)
        settle(null)
      }
    }
  }

  override fun invalidate() {
    executor.shutdownNow()
    super.invalidate()
  }

  private fun cityFrom(addresses: List<Address>?): String? {
    val city = addresses?.firstOrNull()?.locality?.trim()
    if (city.isNullOrEmpty()) {
      Log.i(TAG, "No locality in the geocoder result")
      return null
    }
    return city
  }

  private fun isValidCoordinate(latitude: Double, longitude: Double): Boolean =
      latitude.isFinite() &&
          longitude.isFinite() &&
          latitude in -90.0..90.0 &&
          longitude in -180.0..180.0

  companion object {
    const val NAME = "CityLookup"
    private const val TAG = "UCCityLookup"
    private const val MAX_RESULTS = 1
    private val LOCALE_EN_IN: Locale = Locale.Builder().setLanguage("en").setRegion("IN").build()
  }
}