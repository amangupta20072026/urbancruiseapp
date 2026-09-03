/**
 * ------------------------------------------------------------------
 * PermissionSheet
 * ------------------------------------------------------------------
 * Bottom sheet used by PermissionService for all three flows:
 *
 *   'rationale'  — soft explanation shown BEFORE any OS prompt.
 *                  Primary CTA continues to the OS prompt.
 *                  Dismiss returns { status: 'denied', canRetry: true }.
 *
 *   'prominent'  — Play-Store-compliant location disclosure shown
 *                  BEFORE the OS background-location prompt. Renders
 *                  a compliance badge and identical copy to what's
 *                  been reviewed against Play policy.
 *
 *   'blocked'    — recovery UI shown when the perm has been
 *                  permanently denied. Primary CTA opens Settings.
 *
 * Owns NO business logic — decisions bubble up to PermissionSheetHost
 * via `onDecision`. Dismissal via backdrop/pan is handled at the
 * BottomSheetModal level by `onDismiss` in the host, not here.
 *
 * Layout mirrors RoleSelectionSheet — same handle, backdrop opacity,
 * safe-area handling, and CTA styling.
 * ------------------------------------------------------------------
 */

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { MapPin, Settings2 } from 'lucide-react-native';

import type { RationaleCopy } from '@rbac/capabilities';
import {
  Colors,
  Dimensions,
  Radius,
  Shadows,
  Spacing,
  Typography,
} from '@theme';

export type PermissionSheetMode = 'rationale' | 'prominent' | 'blocked';

/** Discriminated union — matches the sheetHandlers return types. */
export type PermissionSheetDecision =
  | 'continue' /* rationale / prominent primary CTA */
  | 'openSettings' /* blocked primary CTA */
  | 'dismiss'; /* secondary CTA / backdrop / pan */

export type PermissionSheetRef = {
  present: () => void;
  dismiss: () => void;
};

type Props = {
  mode: PermissionSheetMode;
  copy: RationaleCopy | null;
  onDecision: (choice: PermissionSheetDecision) => void;
  onFullyDismissed: () => void;
};

/* -----------------------------------------------------------------
 * Sheet
 * ----------------------------------------------------------------- */

const PermissionSheet = forwardRef<PermissionSheetRef, Props>(
  ({ mode, copy, onDecision, onFullyDismissed }, ref) => {
    const insets = useSafeAreaInsets();
    const sheetRef = useRef<BottomSheetModal>(null);

    useImperativeHandle(
      ref,
      () => ({
        present: () => sheetRef.current?.present(),
        dismiss: () => sheetRef.current?.dismiss(),
      }),
      [],
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={mode === 'prominent' ? 0.55 : 0.4}
          // Backdrop tap resolves as 'dismiss' via onDismiss in the host.
          pressBehavior="close"
        />
      ),
      [mode],
    );

    // Nothing to render before we have copy — the host presents only
    // after setting copy, but this guards against a race under fast
    // hot-reloads.
    if (!copy) return null;

    const isBlocked = mode === 'blocked';
    const isProminent = mode === 'prominent';

    const primaryLabel = isBlocked ? 'Open Settings' : copy.cta;
    const primaryChoice: PermissionSheetDecision = isBlocked
      ? 'openSettings'
      : 'continue';

    return (
      <BottomSheetModal
        ref={sheetRef}
        enablePanDownToClose
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        onDismiss={onFullyDismissed}
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.background}
      >
        <BottomSheetView
          accessibilityViewIsModal
          importantForAccessibility="yes"
          style={[
            styles.container,
            {
              paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.md,
            },
          ]}
        >
          {/* Prominent-disclosure compliance badge — always visible in
              that mode so a Play reviewer watching the demo video can
              spot the disclosure at a glance. */}
          {isProminent && (
            <View
              style={styles.badge}
              accessibilityRole="text"
              accessibilityLiveRegion="polite"
            >
              <MapPin size={14} color={Colors.warning} />
              <Text style={styles.badgeText}>Required for driver trips</Text>
            </View>
          )}

          {/* Icon + title row */}
          <View style={styles.header}>
            {isBlocked ? (
              <View style={styles.iconChip}>
                <Settings2 size={20} color={Colors.textPrimary} />
              </View>
            ) : null}
            <Text style={styles.title} accessibilityRole="header">
              {copy.title}
            </Text>
          </View>

          {/* Body */}
          <Text style={styles.body}>{copy.body}</Text>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={() => onDecision('dismiss')}
              accessibilityRole="button"
              accessibilityLabel="Not now"
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.secondaryBtnPressed,
              ]}
            >
              <Text style={styles.secondaryText}>Not now</Text>
            </Pressable>

            <Pressable
              onPress={() => onDecision(primaryChoice)}
              accessibilityRole="button"
              accessibilityLabel={primaryLabel}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
              ]}
            >
              <Text style={styles.primaryText}>{primaryLabel}</Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
PermissionSheet.displayName = 'PermissionSheet';

export default PermissionSheet;

/* -----------------------------------------------------------------
 * Styles — token-driven, matches RoleSelectionSheet's language.
 * ----------------------------------------------------------------- */

const styles = StyleSheet.create({
  background: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  handleIndicator: {
    backgroundColor: Colors.border,
    width: 40,
  },
  container: {
    paddingHorizontal: Dimensions.screenHorizontalPadding,
    paddingTop: Spacing.sm,
  },

  /* Prominent disclosure badge */
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: '#FEF3C7', // subtle warning-tinted background
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  badgeText: {
    ...Typography.bodySmall,
    color: Colors.warning,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.2,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...(Typography.h3 ?? Typography.subtitle),
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 20,
    flex: 1,
    flexShrink: 1,
  },

  /* Body */
  body: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },

  /* Actions */
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  secondaryBtn: {
    flex: 1,
    height: Dimensions.buttonHeightLarge,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  secondaryBtnPressed: {
    backgroundColor: Colors.surfaceVariant,
  },
  secondaryText: {
    ...Typography.button,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  primaryBtn: {
    flex: 1.4,
    height: Dimensions.buttonHeightLarge,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  primaryBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  primaryText: {
    ...Typography.button,
    color: Colors.buttonPrimaryText,
    fontSize: 16,
    fontWeight: '700',
  },
});
