/* eslint-disable react-native/no-inline-styles */
/**
 * ------------------------------------------------------------------
 * RoleSelectionSheet
 * ------------------------------------------------------------------
 * Bottom sheet that lets the user swap their role without leaving
 * the login screen. Tentative state is internal — the parent only
 * hears about a role change via onConfirm, which fires when the
 * user taps Done. Cancelling (backdrop tap, ×, swipe down) does
 * not commit.
 *
 * Requires <BottomSheetModalProvider> somewhere above in the tree
 * (see App.tsx).
 *
 * Usage:
 *   const ref = useRef<RoleSelectionSheetRef>(null);
 *   ref.current?.present();
 *   <RoleSelectionSheet
 *     ref={ref}
 *     currentRole={role}
 *     onConfirm={(r) => dispatch(selectRole(r))}
 *   />
 * ------------------------------------------------------------------
 */

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import Svg, { Path } from 'react-native-svg';

import {
  Colors,
  Dimensions,
  Radius,
  Shadows,
  Spacing,
  Typography,
} from '../../theme';
import type { UserRole } from '../../store/slices/appSlice';
import { ROLES, withAlpha } from './config';
import RoleCard from './RoleCard';

export type RoleSelectionSheetRef = {
  present: () => void;
  dismiss: () => void;
};

type Props = {
  currentRole: UserRole | null;
  onConfirm: (role: UserRole) => void;
};

/* -----------------------------------------------------------------
 * Close icon
 * ----------------------------------------------------------------- */

const CloseIcon: React.FC<{ color: string; size: number }> = ({
  color,
  size,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 6L18 18M18 6L6 18"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
    />
  </Svg>
);

/* -----------------------------------------------------------------
 * Sheet
 * ----------------------------------------------------------------- */

const RoleSelectionSheet = forwardRef<RoleSelectionSheetRef, Props>(
  ({ currentRole, onConfirm }, ref) => {
    const insets = useSafeAreaInsets();
    const sheetRef = useRef<BottomSheetModal>(null);
    const [tentative, setTentative] = useState<UserRole | null>(currentRole);

    useImperativeHandle(
      ref,
      () => ({
        present: () => {
          // Reset tentative to current every time the sheet opens,
          // so cancelling and re-opening doesn't leak stale drafts.
          setTentative(currentRole);
          sheetRef.current?.present();
        },
        dismiss: () => sheetRef.current?.dismiss(),
      }),
      [currentRole],
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.4}
          pressBehavior="close"
        />
      ),
      [],
    );

    const handleSelect = useCallback((id: UserRole) => {
      setTentative(id);
    }, []);

    const handleDone = useCallback(() => {
      if (!tentative) return;
      onConfirm(tentative);
      sheetRef.current?.dismiss();
    }, [tentative, onConfirm]);

    const handleClose = useCallback(() => {
      sheetRef.current?.dismiss();
    }, []);

    const canConfirm = tentative !== null;

    return (
      <BottomSheetModal
        ref={sheetRef}
        enablePanDownToClose
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.background}
      >
        <BottomSheetView
          style={[
            styles.container,
            {
              paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.md,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} accessibilityRole="header">
                Select your role
              </Text>
              <Text style={styles.subtitle}>
                Choose how you'll use Urban Cruise
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close role selection"
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && styles.closeBtnPressed,
              ]}
            >
              <CloseIcon color={Colors.white} size={16} />
            </Pressable>
          </View>

          {/* Role list */}
          <View style={styles.list} accessibilityRole="radiogroup">
            {ROLES.map(role => (
              <RoleCard
                key={role.id}
                role={role}
                selected={tentative === role.id}
                onPress={handleSelect}
              />
            ))}
          </View>

          {/* Done */}
          <Pressable
            onPress={handleDone}
            disabled={!canConfirm}
            accessibilityRole="button"
            accessibilityLabel="Confirm role"
            accessibilityState={{ disabled: !canConfirm }}
            style={({ pressed }) => [
              styles.cta,
              !canConfirm && styles.ctaDisabled,
              pressed && canConfirm && styles.ctaPressed,
            ]}
          >
            <Text
              style={[styles.ctaText, !canConfirm && styles.ctaTextDisabled]}
            >
              Done
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
RoleSelectionSheet.displayName = 'RoleSelectionSheet';

export default RoleSelectionSheet;

/* -----------------------------------------------------------------
 * Styles
 * ----------------------------------------------------------------- */

const styles = StyleSheet.create({
  background: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl ?? 20,
    borderTopRightRadius: Radius.xl ?? 20,
  },
  handleIndicator: {
    backgroundColor: withAlpha(Colors.border, 0.9),
    width: 40,
  },
  container: {
    paddingHorizontal: Dimensions.screenHorizontalPadding,
    paddingTop: Spacing.sm,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  title: {
    ...(Typography.h3 ?? Typography.subtitle),
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 20,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.circle,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPressed: {
    opacity: 0.7,
  },

  /* List */
  list: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },

  /* CTA */
  cta: {
    height: Dimensions.buttonHeightLarge,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  ctaDisabled: {
    backgroundColor: Colors.buttonDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  ctaText: {
    ...Typography.button,
    color: Colors.buttonPrimaryText,
    fontSize: 22,
  },
  ctaTextDisabled: {
    color: Colors.textInverse,
  },
});
