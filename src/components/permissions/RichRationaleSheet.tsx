/**
 * ------------------------------------------------------------------
 * RichRationaleSheet
 * ------------------------------------------------------------------
 * Rich pre-prompt sheet — used when a capability's rationale carries
 * `benefits`. Currently only `notifications` opts in.
 *
 * Design intent (matches Urban Cruise brand + minimalist product):
 *   - Small hero: bell in green circle + red badge
 *   - Title only (no subtitle prose)
 *   - Up to 4 one-line labelled benefits with lucide icons
 *   - Primary CTA + "Not now" text link (not a button)
 *   - Hard cap at 60% of screen; content naturally fits in ~42–48%
 *
 * Same imperative contract as PermissionSheet, so PermissionSheetHost
 * can hold both refs and route without special casing decision routing.
 * ------------------------------------------------------------------
 */

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import {
  Bell,
  Calendar,
  DollarSign,
  MessageSquare,
  Shield,
  type LucideIcon,
} from 'lucide-react-native';

import type { BenefitIcon, RationaleCopy } from '@rbac/capabilities';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

import type {
  PermissionSheetDecision,
  PermissionSheetRef,
} from './PermissionSheet';

/* -----------------------------------------------------------------
 * Icon registry
 *
 * String key → lucide component. Keeps capabilities.ts free of UI
 * imports and makes it a compile-time error to introduce an icon
 * that the sheet doesn't know how to render.
 * ----------------------------------------------------------------- */
const ICONS: Record<BenefitIcon, LucideIcon> = {
  calendar: Calendar,
  dollar: DollarSign,
  message: MessageSquare,
  bell: Bell,
  shield: Shield,
};

/* -----------------------------------------------------------------
 * Hard 60% cap on any device
 *
 * Content is small enough that dynamic sizing settles well below
 * this. maxDynamicContentSize acts as a ceiling — sheet grows to
 * fit content, never past 60% of the window.
 * ----------------------------------------------------------------- */
const MAX_SHEET_HEIGHT = Dimensions.get('window').height * 0.6;

type Props = {
  copy: RationaleCopy | null;
  onDecision: (choice: PermissionSheetDecision) => void;
  onFullyDismissed: () => void;
};

const RichRationaleSheet = forwardRef<PermissionSheetRef, Props>(
  ({ copy, onDecision, onFullyDismissed }, ref) => {
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
          opacity={0.42}
          pressBehavior="close"
        />
      ),
      [],
    );

    const benefits = useMemo(() => copy?.benefits ?? [], [copy]);

    /* -----------------------------------------------------------------
     * BottomSheetModal is always mounted so its ref stays attached
     * when PermissionSheetHost synchronously calls .present() after
     * setCopy. Content inside is gated on `copy` — same pattern as
     * PermissionSheet's fix, for the same reason.
     * ----------------------------------------------------------------- */
    return (
      <BottomSheetModal
        ref={sheetRef}
        enablePanDownToClose
        enableDynamicSizing
        maxDynamicContentSize={MAX_SHEET_HEIGHT}
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
            { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.sm },
          ]}
        >
          {copy && (
            <>
              {/* Hero — bell + red badge */}
              <View style={styles.hero}>
                <View style={styles.heroInner}>
                  <Bell size={26} color={Colors.primaryDark} strokeWidth={2} />
                </View>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>1</Text>
                </View>
              </View>

              {/* Title */}
              <Text style={styles.title} accessibilityRole="header">
                {copy.title}
              </Text>

              {/* Benefits — icon + one-line label */}
              <View style={styles.benefits}>
                {benefits.map(b => {
                  const Icon = ICONS[b.icon];
                  return (
                    <View key={b.label} style={styles.benefitRow}>
                      <View style={styles.benefitIcon}>
                        <Icon
                          size={16}
                          color={Colors.primaryDark}
                          strokeWidth={2.2}
                        />
                      </View>
                      <Text style={styles.benefitLabel}>{b.label}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Primary CTA */}
              <Pressable
                onPress={() => onDecision('continue')}
                accessibilityRole="button"
                accessibilityLabel={copy.cta}
                style={({ pressed }) => [
                  styles.ctaPrimary,
                  pressed && styles.ctaPrimaryPressed,
                ]}
              >
                <Bell
                  size={17}
                  color={Colors.buttonPrimaryText}
                  strokeWidth={2.4}
                />
                <Text style={styles.ctaPrimaryText}>{copy.cta}</Text>
              </Pressable>

              {/* Secondary — "Not now" text link */}
              <Pressable
                onPress={() => onDecision('dismiss')}
                accessibilityRole="button"
                accessibilityLabel="Not now"
                style={({ pressed }) => [
                  styles.ctaSecondary,
                  pressed && styles.ctaSecondaryPressed,
                ]}
              >
                <Text style={styles.ctaSecondaryText}>Not now</Text>
              </Pressable>
            </>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
RichRationaleSheet.displayName = 'RichRationaleSheet';

export default RichRationaleSheet;

/* -----------------------------------------------------------------
 * Styles — token-driven, matches PermissionSheet's language.
 * ----------------------------------------------------------------- */

const HERO_SIZE = 64;
const HERO_INNER_TINT = '#E8F5E9'; // primary at ~8% — matches preview

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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },

  /* Hero */
  hero: {
    position: 'relative',
    width: HERO_SIZE,
    height: HERO_SIZE,
    alignSelf: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  heroInner: {
    width: HERO_SIZE,
    height: HERO_SIZE,
    borderRadius: HERO_SIZE / 2,
    backgroundColor: HERO_INNER_TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
    paddingHorizontal: 4,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },

  /* Title */
  title: {
    ...(Typography.h3 ?? Typography.subtitle),
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },

  /* Benefits */
  benefits: {
    marginBottom: Spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: HERO_INNER_TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },

  /* Primary CTA */
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    ...Shadows.md,
  },
  ctaPrimaryPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  ctaPrimaryText: {
    ...Typography.button,
    color: Colors.buttonPrimaryText,
    fontSize: 15,
    fontWeight: '700',
  },

  /* Secondary — text link, not a button */
  ctaSecondary: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    marginTop: 2,
  },
  ctaSecondaryPressed: {
    opacity: 0.6,
  },
  ctaSecondaryText: {
    ...Typography.button,
    color: Colors.primaryDark,
    fontSize: 14,
    fontWeight: '600',
  },
});
