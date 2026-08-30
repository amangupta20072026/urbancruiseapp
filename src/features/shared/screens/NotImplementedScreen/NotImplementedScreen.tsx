/**
 * ------------------------------------------------------------------
 * NoImplementedScreen — Placeholder for registered-but-unbuilt routes
 * ------------------------------------------------------------------
 * Registered as the `component` for every route that exists in a
 * ParamList but does not yet have a real screen file. This turns
 * "type says the route exists / runtime says it doesn't" — a class
 * of silent-failure bug — into an obvious in-app placeholder that
 * respects goBack and shows the developer what params arrived.
 *
 * SWAP PROCEDURE:
 *   When the real screen lands, delete this placeholder from its
 *   role navigator and register the real component in its place.
 *   No changes to callers of `navigate('MyRoute', ...)` needed.
 *
 * ROBUSTNESS NOTES:
 *   - `canGoBack()` guarded — hides the Back affordance when the
 *     placeholder is (e.g.) the root of a stack, so we don't render
 *     a button that does nothing.
 *   - DEV-only params dump uses `try/catch` inside JSON.stringify so
 *     a route with a circular params object can't crash the
 *     placeholder itself (that would be the exact bug this file
 *     exists to prevent).
 *   - Self-contained styling — no dependency on Header component or
 *     any shared UI beyond theme tokens. If a screen crash somehow
 *     escapes ErrorBoundary and we route back here as recovery, this
 *     screen must not itself pull in an unstable dependency chain.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing, Typography } from '@theme';

const NotImplementedScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const canGoBack = navigation.canGoBack();

  // Safe params serialisation — guarded against circular references
  // so the placeholder itself is never the source of a crash.
  const paramsPreview = React.useMemo(() => {
    if (!__DEV__ || !route.params) return null;
    try {
      return JSON.stringify(route.params, null, 2);
    } catch {
      return '(unserialisable params — likely a circular reference)';
    }
  }, [route.params]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {canGoBack ? (
        <View style={styles.topBar}>
          <Pressable
            onPress={navigation.goBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.content}>
        <Text style={styles.icon} accessibilityElementsHidden>
          🚧
        </Text>
        <Text style={styles.title} accessibilityRole="header">
          Under construction
        </Text>
        <View style={styles.routeChip}>
          <Text style={styles.routeChipText}>{route.name}</Text>
        </View>
        <Text style={styles.description}>
          This screen isn't implemented yet. The route is wired up so navigation
          to it works — the real UI will land in a future release.
        </Text>

        {paramsPreview !== null ? (
          <ScrollView
            style={styles.paramsBox}
            contentContainerStyle={styles.paramsContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.paramsLabel}>DEV: route params</Text>
            <Text style={styles.paramsBody}>{paramsPreview}</Text>
          </ScrollView>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

export default NotImplementedScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  back: {
    alignSelf: 'flex-start',
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  backText: {
    ...Typography.label,
    color: Colors.primary,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.55,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 56,
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  routeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Radius.pill,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  routeChipText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontFamily: undefined,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    maxWidth: 320,
  },
  paramsBox: {
    maxHeight: 200,
    width: '100%',
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  paramsContent: {
    paddingBottom: Spacing.sm,
  },
  paramsLabel: {
    ...Typography.caption,
    color: Colors.warning,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  paramsBody: {
    fontSize: 11,
    lineHeight: 15,
    color: Colors.textPrimary,
  },
});
