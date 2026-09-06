# ─────────────────────────────────────────────────────────────────────────────
# UrbanCruise — production ProGuard / R8 rules
# applicationId / namespace: app.urbancruise
# React Native: 0.86.2 (Hermes, New Architecture, Nitro/Worklets/Reanimated 4)
#
# GUIDING PRINCIPLE
# Modern RN native modules ship their own consumer-proguard-rules.pro inside
# their AAR. Those rules are merged into the app build automatically — you do
# NOT duplicate them here. This file only contains rules that consumer rules
# cannot provide, plus rules explicitly required by libraries whose official
# docs call them out for the *app* project.
#
# Every non-boilerplate rule below is followed by a comment citing the
# official source it came from. Verify by opening that URL.
# ─────────────────────────────────────────────────────────────────────────────


# =============================================================================
# 1. APP CODE — required for reflection-instantiated components
# =============================================================================
# Rationale:
#   - AndroidManifest.xml declares <service android:name=
#     "app.urbancruise.location.DriverLocationForegroundService" />.
#     The OS resolves that class by name via reflection at startService(); if
#     R8 renames it, startService() throws ClassNotFoundException at runtime.
#   - React Native instantiates ReactPackage / NativeModule / TurboModule
#     subclasses via reflection (SplashReadyPackage, DriverLocationPackage,
#     DriverLocationModule, SplashReadyModule). All live under this namespace.
#   - BuildConfig is generated in this namespace and read reflectively by
#     react-native-config to expose .env values at runtime.
#     Source: https://github.com/lugg/react-native-config#problems-with-proguard
-keep class app.urbancruise.** { *; }
-keep class app.urbancruise.BuildConfig { *; }


# =============================================================================
# 2. FIREBASE CRASHLYTICS — readable stack traces
# =============================================================================
# Source (official Firebase docs):
#   https://firebase.google.com/docs/crashlytics/android/get-deobfuscated-reports
# Section "Required configuration when using R8, ProGuard, and DexGuard".
# Without these, Crashlytics cannot map obfuscated frames back to source lines
# even after mapping-file upload.
-keepattributes SourceFile,LineNumberTable          # file names + line numbers
-keep public class * extends java.lang.Exception    # custom exception types
# Extra defence — hides original .kt/.java file paths but keeps line numbers
# so the Crashlytics dashboard still resolves them (paired with a mapping).
-renamesourcefileattribute SourceFile


# =============================================================================
# 3. REACT NATIVE FIREBASE — defensive keeps for the bridge classes
# =============================================================================
# The AAR ships consumer rules, but the maintainers explicitly note in the
# open issue below that testing minified builds is hard and the historical
# guidance is to keep all io.invertase.* classes. These lines are cheap and
# eliminate a whole category of "why is FCM silently broken in release?"
# Source: https://github.com/invertase/react-native-firebase/issues/8157
#         https://github.com/invertase/react-native-firebase/issues/3770
-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.firebase.**


# =============================================================================
# 4. REACT NATIVE REANIMATED / WORKLETS
# =============================================================================
# Reanimated 4 splits into com.swmansion.reanimated + com.swmansion.worklets.
# The AARs ship consumer rules for the New Architecture path, but Software
# Mansion's own discussion thread — where a regression made a release build
# crash without these two lines — documents them as the recommended set:
# Source: https://github.com/software-mansion/react-native-reanimated/discussions/3939
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }


# =============================================================================
# 5. REACT NATIVE PDF — pdfium + AndroidPdfViewer runtime classes
# =============================================================================
# react-native-pdf loads native PDF rendering through pdfium-android and
# barteksc/AndroidPdfViewer. Both call into their own classes via JNI /
# reflection paths that R8 can't see statically. Same runtime keep set is
# the one distributed by the JSI fork of the same library, which documents
# it explicitly as required for R8 release builds.
# Source: https://github.com/126punith/react-native-pdf-jsi#proguard--r8-configuration-android-release-builds
-keep class org.wonday.pdf.** { *; }
-keep class io.legere.pdfiumandroid.** { *; }
-keep class com.github.barteksc.pdfviewer.** { *; }


# =============================================================================
# 6. STANDARD ATTRIBUTES FOR REFLECTION-BASED SERIALIZATION
# =============================================================================
# Zod runs in JS, axios does not use Java-side reflection, and there is no
# Retrofit / Gson in the dependency graph — so full annotation keeps aren't
# strictly required. These are kept because:
#   - Firebase Crashlytics recommends *Annotation* (see #2 above),
#   - Kotlin coroutines / Notifee use annotations for suspend metadata,
#   - Generic signatures matter for anything Kotlin-reflected.
# Cost: a few KB in the DEX. Benefit: rules out a whole category of subtle
# release-only failures. This is the canonical "safe attribute set" used by
# the Firebase quickstart, Retrofit README, and Guardsquare's own guidance.
# Source: https://firebase.google.com/docs/crashlytics/android/get-deobfuscated-reports
#         https://www.guardsquare.com/blog/firebase-crashlytics-proguard
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod
-keepattributes Exceptions


# =============================================================================
# 7. HERMES / OKIO / OKHTTP — housekeeping "dontwarn"s
# =============================================================================
# React Native's own consumer rules (facebook/react-native @ v0.87.1
# packages/react-native/ReactAndroid/proguard-rules.pro) already include
# -dontwarn okio.**, -dontwarn org.codehaus.mojo.animal_sniffer, etc., so we
# don't repeat them here. This block is only for warnings not covered by
# RN's shipped rules that AGP 8+ / R8 full-mode occasionally surfaces on
# transitive JSR305-annotated deps.
# Source: verified against the RN 0.87.1 source proguard-rules.pro at
#         https://fossies.org/linux/react-native/packages/react-native/ReactAndroid/proguard-rules.pro
-dontwarn javax.annotation.**
-dontwarn org.jetbrains.annotations.**
-dontwarn kotlin.Unit


# ─────────────────────────────────────────────────────────────────────────────
# END OF FILE
# If you add a new native module later, prefer editing this file only after
# checking whether the module's own AAR already ships consumer rules
# (unzip <lib>.aar → look for proguard.txt or consumer-proguard-rules.pro).
# ─────────────────────────────────────────────────────────────────────────────