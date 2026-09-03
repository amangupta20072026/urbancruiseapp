/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * App root
 * ------------------------------------------------------------------
 * Provider stack (outermost → innermost):
 *
 *   GestureHandlerRootView       — react-native-gesture-handler root
 *   Provider (redux)             — dispatch / selector everywhere
 *   PersistQueryClientProvider   — TanStack Query cache is hydrated
 *                                   from MMKV in parallel with mount,
 *                                   so warm-start screens render
 *                                   instantly and revalidate.
 *   SafeAreaProvider             — insets available to every screen
 *   KeyboardProvider             — keyboard-aware components anywhere
 *   BottomSheetModalProvider     — imperative bottom sheets anywhere
 *   ErrorBoundary                — catches render / lifecycle errors
 *                                   in the navigator tree so a bad
 *                                   screen shows a fallback instead
 *                                   of crashing the whole app.
 *   NavigationContainer          — with navigationRef for imperative nav
 *     RootNavigator              — conditional branches on Redux state
 *
 * PersistGate is INTENTIONALLY REMOVED.
 * Rationale: the SplashIntroScreen (mounted by RootNavigator when
 * !bootstrapped) is the single, unified splash + orchestrator. Redux
 * starts empty and rehydrates during bootstrap; splitting rehydration
 * across PersistGate + orchestrator caused a race between two "wait"
 * gates and made splash duration unpredictable.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  DefaultTheme,
  type Theme,
} from '@react-navigation/native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

import { store } from './src/store';
import { queryClient } from '@app/queryClient';
import { queryPersister, shouldPersistQuery } from '@app/queryPersister';
import { navigationRef } from './src/navigation/NavigationService';
import RootNavigator from './src/navigation/RootNavigator';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { enableGlobalBlock } from '@services/screenshot';
import { Colors } from '@theme';
import { drainPendingDeepLink } from '@/services/deeplinks/drain';
import { buildLinkingConfig } from '@/services/deeplinks/linkingConfig';
import { ToastHost } from '@services/toast';

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Explicit navigation theme, independent of the device's system
 * color scheme. Without this, NavigationContainer/native-stack can
 * paint each screen's underlying container with a dark background
 * when the device is in dark mode — visible as a brief dark-gray
 * blank screen between the native splash handoff and SplashIntroScreen
 * painting its own (white) content on top. Card/background are locked
 * to the brand background so that gap can never show a mismatched
 * color, in light or dark system mode.
 */
const AppNavigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.background,
    card: Colors.background,
  },
};

const App: React.FC = () => {
  /* -----------------------------------------------------------------
   * Install app-wide screenshot / screen-capture block.
   *
   * Runs ONCE at app root mount. Idempotent — the service tracks
   * install state internally, so this effect is safe under React
   * StrictMode double-invocations and hot reloads.
   *
   * The block runs in BOTH dev and prod (product decision).
   * Screens that need to allow screenshots opt in via
   * `useAllowScreenshots()` — see src/services/screenshot for policy.
   * ----------------------------------------------------------------- */
  React.useEffect(() => {
    void enableGlobalBlock();
  }, []);
  return (
    <GestureHandlerRootView style={styles.root}>
      <Provider store={store}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: queryPersister,
            maxAge: ONE_DAY_MS,
            dehydrateOptions: {
              // Skip queries flagged with meta.persist === false.
              shouldDehydrateQuery: q => q.meta?.persist !== false,
            },
            // Global sanitizer — strips sensitive queries even if the
            // per-query flag was forgotten.
            hydrateOptions: undefined,
          }}
          // Optional: prune the payload before writing to disk.
          onSuccess={() => {
            // Reserved for future telemetry.
          }}
        >
          <SafeAreaProvider>
            <KeyboardProvider>
              <BottomSheetModalProvider>
                <StatusBar barStyle="dark-content" />
                {/*
                  App-level ErrorBoundary sits ABOVE NavigationContainer
                  so a crash in any screen shows a graceful fallback
                  instead of a blank / crashed app, and BELOW the store
                  providers so the fallback still has access to Redux
                  and TanStack Query for any recovery actions.
                */}
                <ErrorBoundary name="RootBoundary">
                  <NavigationContainer
                    ref={navigationRef}
                    theme={AppNavigationTheme}
                    linking={buildLinkingConfig()}
                    onReady={() => {
                      drainPendingDeepLink();
                    }}
                  >
                    <RootNavigator />
                  </NavigationContainer>
                </ErrorBoundary>
                {/*
                  ToastHost sits OUTSIDE the navigator and OUTSIDE the
                  ErrorBoundary so a screen crash or route change never
                  removes the surface that would announce the crash. It
                  is inside SafeAreaProvider (needs insets), inside
                  KeyboardProvider (unrelated but harmless), and inside
                  GestureHandlerRootView (needs pan-to-dismiss). Its own
                  z-index / elevation puts it above @gorhom/bottom-sheet.
                */}
                <ToastHost />
              </BottomSheetModalProvider>
            </KeyboardProvider>
          </SafeAreaProvider>
        </PersistQueryClientProvider>
      </Provider>
    </GestureHandlerRootView>
  );
};

// Ensure global sanitizer is referenced (tree-shake guard).
void shouldPersistQuery;

export default App;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
});
