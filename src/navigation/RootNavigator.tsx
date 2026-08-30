/**
 * ------------------------------------------------------------------
 * RootNavigator
 * ------------------------------------------------------------------
 * Single stack, conditional groups — React Navigation v7's officially
 * recommended auth-flow pattern. Rendering exactly one group at a time
 * guarantees:
 *   - Users cannot gesture back into a stack they shouldn't be in.
 *   - Role transitions can't race with in-flight animations.
 *   - Fade animations between groups look intentional.
 *
 * Branch selection ladder (top wins):
 *
 *   !bootstrapped                    → SplashIntro (bootstrap runs in parallel)
 *   !hasSeenOnboardingThisSession    → OnboardingFlow (shows EVERY launch)
 *   !isAuthenticated                 → AuthFlow
 *   userRole === 'customer'          → CustomerFlow  (lazy)
 *   userRole === 'vendor'            → VendorFlow    (lazy)
 *   userRole === 'driver'            → DriverFlow    (lazy)
 *   userRole === 'uc'                → UcFlow        (lazy)
 *   (fallback — auth glitch)         → AuthFlow
 *
 * ONBOARDING BEHAVIOR:
 *   `hasSeenOnboardingThisSession` is a session-only flag. Every cold
 *   start it resets to false, so onboarding shows on every launch —
 *   regardless of login status. Tapping Skip / Get Started flips it
 *   to true for the current session only.
 *
 * ROLE-NAVIGATOR LAZY LOADING (performance):
 *   Each user sees exactly one role navigator per session. Loading
 *   all four eagerly at app start (the previous behaviour) meant a
 *   customer paid the JS evaluation cost of Vendor + Driver + UC
 *   navigator modules — and every screen, hook, chart, and mock
 *   they transitively import — for no user benefit.
 *
 *   Each role navigator is now wrapped in `React.lazy()`, which
 *   defers the module's evaluation until React tries to render it
 *   (i.e. until that specific branch of the conditional above is
 *   selected). On Metro's default config the underlying dynamic
 *   `import()` resolves via a synchronous `require`, so the Suspense
 *   fallback typically resolves within the same render tick — users
 *   don't see a flash.
 *
 *   The fallback is intentionally a blank matched-background View,
 *   not the splash screen, because SplashIntroScreen has bootstrap
 *   side-effects that must not fire again on a role swap.
 *
 *   Why per-flow Suspense wrappers instead of one over the whole
 *   Stack.Navigator: independent boundaries mean a hypothetical load
 *   hiccup in one role can't affect another; and each wrapper is a
 *   stable component reference, so React Navigation doesn't churn
 *   on re-mounts between renders of RootNavigator.
 *
 *   SplashIntro / Onboarding / Auth stay eager — they're on the
 *   critical path for cold-start UI and the wrong side of the
 *   latency trade-off for lazy loading.
 * ------------------------------------------------------------------
 */

import React, { Suspense, lazy } from 'react';
import { StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashIntroScreen from '../features/auth/SplashIntroScreen';
import OnboardingNavigator from './OnboardingNavigator';
import AuthNavigator from './AuthNavigator';

import { Colors } from '@theme';
import { useAppSelector } from '../store/hooks';
import type { RootStackParamList } from './types';

/* =================================================================
 * Lazy role navigators
 *
 * `React.lazy(() => import('./X'))` defers evaluation of module X
 * until the first render that references its component. Because
 * only one role navigator is ever rendered per session, this saves
 * the JS-evaluation cost of the three unused ones on cold start.
 *
 * Kept at module scope so identity is stable across RootNavigator
 * re-renders. React Navigation compares component references for
 * mount/unmount decisions; instability here would defeat both this
 * optimisation and correct navigation behaviour.
 * ================================================================= */

const LazyCustomerNavigator = lazy(() => import('./CustomerNavigator'));
const LazyVendorNavigator = lazy(() => import('./VendorNavigator'));
const LazyDriverNavigator = lazy(() => import('./DriverNavigator'));
const LazyUcNavigator = lazy(() => import('./UcNavigator'));

/* =================================================================
 * Suspense fallback — minimal by design
 *
 * A matched-background View, no spinner, no logo. On Metro's
 * default configuration the lazy module resolves via a synchronous
 * require and React reconciles the real navigator in the same tick,
 * so this fallback is effectively invisible in practice. It exists
 * as a safety net for future code-split or chunked-bundle setups
 * where the load is genuinely async.
 * ================================================================= */

const LazyRoleFallback: React.FC = () => <View style={styles.lazyFallback} />;

/* =================================================================
 * Suspense-wrapped role flow components
 *
 * Each wrapper is a stable module-level component so `<Stack.Screen
 * component={CustomerFlow}>` receives a consistent identity across
 * RootNavigator re-renders. React Navigation's screen mount/unmount
 * lifecycle depends on that stability.
 * ================================================================= */

const CustomerFlow: React.FC = () => (
  <Suspense fallback={<LazyRoleFallback />}>
    <LazyCustomerNavigator />
  </Suspense>
);
const VendorFlow: React.FC = () => (
  <Suspense fallback={<LazyRoleFallback />}>
    <LazyVendorNavigator />
  </Suspense>
);
const DriverFlow: React.FC = () => (
  <Suspense fallback={<LazyRoleFallback />}>
    <LazyDriverNavigator />
  </Suspense>
);
const UcFlow: React.FC = () => (
  <Suspense fallback={<LazyRoleFallback />}>
    <LazyUcNavigator />
  </Suspense>
);

/* =================================================================
 * RootNavigator
 * ================================================================= */

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const bootstrapped = useAppSelector(s => s.app.bootstrapped);
  const hasSeenOnboardingThisSession = useAppSelector(
    s => s.app.hasSeenOnboardingThisSession,
  );
  const isAuthenticated = useAppSelector(s => s.app.isAuthenticated);
  const userRole = useAppSelector(s => s.app.userRole);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        gestureEnabled: false,
      }}
    >
      {!bootstrapped ? (
        <Stack.Screen name="SplashIntro" component={SplashIntroScreen} />
      ) : !hasSeenOnboardingThisSession ? (
        <Stack.Screen name="OnboardingFlow" component={OnboardingNavigator} />
      ) : !isAuthenticated ? (
        <Stack.Screen name="AuthFlow" component={AuthNavigator} />
      ) : userRole === 'customer' ? (
        <Stack.Screen name="CustomerFlow" component={CustomerFlow} />
      ) : userRole === 'vendor' ? (
        <Stack.Screen name="VendorFlow" component={VendorFlow} />
      ) : userRole === 'driver' ? (
        <Stack.Screen name="DriverFlow" component={DriverFlow} />
      ) : userRole === 'uc' ? (
        <Stack.Screen name="UcFlow" component={UcFlow} />
      ) : (
        // Defensive: authenticated but no role. Route back to auth.
        <Stack.Screen name="AuthFlow" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;

const styles = StyleSheet.create({
  lazyFallback: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
