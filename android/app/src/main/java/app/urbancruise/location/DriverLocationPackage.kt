/*
 * ------------------------------------------------------------------
 * DriverLocationPackage
 * ------------------------------------------------------------------
 * Standard ReactPackage that registers DriverLocationModule with the
 * React Native bridge. Registered from MainApplication.kt alongside
 * SplashReadyPackage — see the packageList.add(...) block there.
 * ------------------------------------------------------------------
 */

package app.urbancruise.location

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class DriverLocationPackage : ReactPackage {

    override fun createNativeModules(
        reactContext: ReactApplicationContext,
    ): List<NativeModule> = listOf(DriverLocationModule(reactContext))

    override fun createViewManagers(
        reactContext: ReactApplicationContext,
    ): List<ViewManager<*, *>> = emptyList()
}