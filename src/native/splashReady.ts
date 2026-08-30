/**
 * ------------------------------------------------------------------
 * splashReady — JS side of the native splash handoff
 * ------------------------------------------------------------------
 * Call markAppReady() once SplashIntroScreen has mounted (i.e. once
 * the JS splash content is on screen and visually matches the native
 * launch theme). This tells the native SplashScreen API it's safe to
 * dismiss — see MainActivity.kt's setKeepOnScreenCondition.
 *
 * Safe to call multiple times / on iOS (no-op there — the native
 * LaunchScreen storyboard is replaced by the first RN frame under
 * standard UIKit behavior and doesn't need this gate).
 * ------------------------------------------------------------------
 */

import { NativeModules, Platform } from 'react-native';

const { SplashReady } = NativeModules as {
  SplashReady?: { markReady: () => void };
};

export function markAppReady(): void {
  if (Platform.OS !== 'android') return;

  try {
    SplashReady?.markReady();
  } catch {
    // Never let a missing/failed native module take down cold start.
  }
}
