package app.urbancruise.auth

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/** Registers the login helpers: SIM number picker and SMS OTP consent. */
class OtpAutofillPackage : ReactPackage {

  override fun createNativeModules(
      reactContext: ReactApplicationContext,
  ): List<NativeModule> =
      listOf(PhoneNumberHintModule(reactContext), SmsUserConsentModule(reactContext))

  override fun createViewManagers(
      reactContext: ReactApplicationContext,
  ): List<ViewManager<*, *>> = emptyList()
}