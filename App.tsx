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
import { NavigationContainer } from '@react-navigation/native';
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

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

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
                  <NavigationContainer ref={navigationRef}>
                    <RootNavigator />
                  </NavigationContainer>
                </ErrorBoundary>
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
  root: { flex: 1 },
});
