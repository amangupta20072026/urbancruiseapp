package app.urbancruise

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  companion object {
    // Flipped true by SplashReadyModule.markReady(), called from JS once
    // SplashIntroScreen has mounted (and painted a matching frame).
    // Volatile: read on the UI thread inside setKeepOnScreenCondition,
    // written from the JS/native-module thread.
    @Volatile
    var isAppReady: Boolean = false

    // Hard ceiling. If JS never calls markReady() — crash before mount,
    // bundle load failure, native module fails to link on some OEM
    // build — the splash must NOT hang forever. Worst case the user
    // sees the splash a bit too long instead of a frozen app.
    private const val SPLASH_TIMEOUT_MS = 6_000L
  }

  override fun getMainComponentName(): String = "Urban Cruise"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    val splashScreen = installSplashScreen()
    // Keep the native splash up until JS explicitly signals readiness.
    // This removes the black-frame gap: previously the system dismissed
    // the splash on the first drawn frame, which happens before Hermes
    // has even mounted React — now it stays until SplashIntroScreen has
    // actually painted, so the native -> JS handoff is seamless.
    splashScreen.setKeepOnScreenCondition { !isAppReady }

    // Failsafe: force-dismiss after SPLASH_TIMEOUT_MS regardless of
    // whether JS ever called markReady(). Never let this screen become
    // a permanent dead end.
    Handler(Looper.getMainLooper()).postDelayed({
      isAppReady = true
    }, SPLASH_TIMEOUT_MS)

    supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
    super.onCreate(savedInstanceState)
  }

}