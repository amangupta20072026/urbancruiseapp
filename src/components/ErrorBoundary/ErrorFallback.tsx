/**
 * ------------------------------------------------------------------
 * ErrorFallback — Default UI for the app-level ErrorBoundary
 * ------------------------------------------------------------------
 * Rendered when the ErrorBoundary catches. Designed to be robust:
 *
 *   - Does NOT depend on NavigationContainer — navigation may be the
 *     thing that crashed. Uses safe-area-context directly (which
 *     sits above navigation in the provider stack).
 *   - Does NOT depend on any React Navigation hook.
 *   - Uses only theme tokens that exist today — no invented colors.
 *
 * In development it exposes error.name, error.message, and the stack
 * inside a scrollable box so the developer can debug in-place. In
 * production those details are hidden and only the friendly UI shows.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

type Props = {
  error: Error;
  onReset: () => void;
};

export const ErrorFallback: React.FC<Props> = ({ error, onReset }) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.icon} accessibilityElementsHidden>
          ⚠️
        </Text>

        <Text style={styles.title} accessibilityRole="header">
          Something went wrong
        </Text>

        <Text style={styles.description}>
          The app hit an unexpected error. You can retry, or close and reopen
          the app if the issue persists.
        </Text>

        {__DEV__ ? (
          <ScrollView
            style={styles.devBox}
            contentContainerStyle={styles.devContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.devTitle}>DEV: {error.name || 'Error'}</Text>
            <Text style={styles.devMessage}>
              {error.message || '(no message)'}
            </Text>
            {error.stack ? (
              <Text style={styles.devStack}>{error.stack}</Text>
            ) : null}
          </ScrollView>
        ) : null}

        <Pressable
          onPress={onReset}
          accessibilityRole="button"
          accessibilityLabel="Retry"
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  devBox: {
    maxHeight: 220,
    width: '100%',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  devContent: {
    paddingBottom: Spacing.sm,
  },
  devTitle: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  devMessage: {
    ...Typography.caption,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  devStack: {
    fontSize: 10,
    lineHeight: 14,
    color: Colors.textTertiary,
  },
  button: {
    minWidth: 200,
    height: 48,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  buttonText: {
    ...Typography.button,
    color: Colors.buttonPrimaryText,
  },
});
