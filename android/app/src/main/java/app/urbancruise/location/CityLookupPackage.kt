package app.urbancruise.location

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/** Registers CityLookup: city name from coordinates (customer onboarding). */
class CityLookupPackage : ReactPackage {

  override fun createNativeModules(
      reactContext: ReactApplicationContext,
  ): List<NativeModule> = listOf(CityLookupModule(reactContext))

  override fun createViewManagers(
      reactContext: ReactApplicationContext,
  ): List<ViewManager<*, *>> = emptyList()
}