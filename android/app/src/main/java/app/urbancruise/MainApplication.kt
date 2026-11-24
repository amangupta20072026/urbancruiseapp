package app.urbancruise

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

import com.facebook.react.common.assets.ReactFontManager

import app.urbancruise.auth.OtpAutofillPackage
import app.urbancruise.callerid.CallerIdPackage
import app.urbancruise.location.CityLookupPackage
import app.urbancruise.location.DriverLocationPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          add(SplashReadyPackage())
          // Driver trip-tracking foreground service bridge.
          // See android/app/src/main/java/app/urbancruise/location/.
          add(DriverLocationPackage())
          // Login: SIM phone-number picker + SMS OTP consent.
          // See android/app/src/main/java/app/urbancruise/auth/.
          add(OtpAutofillPackage())
          // Onboarding: city name from coordinates via the built-in Geocoder.
          // See android/app/src/main/java/app/urbancruise/location/.
          add(CityLookupPackage())
          // UC staff caller ID: local customer list + role / overlay helpers.
          // See android/app/src/main/java/app/urbancruise/callerid/.
          add(CallerIdPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    ReactFontManager.getInstance().addCustomFont(this, "audiowide", R.font.audiowide)
    loadReactNative(this)
  }
}