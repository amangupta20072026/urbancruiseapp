/**
 * VendorHomeScreen — STUB
 * Proves auth round-trips. Real Vendor tabs come later.
 */

import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Colors,
  Dimensions,
  Radius,
  Spacing,
  Typography,
} from '../../theme';
import { useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/appSlice';

const VendorHomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const handleLogout = useCallback(() => dispatch(logout()), [dispatch]);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, Spacing.xl),
          paddingBottom: Math.max(insets.bottom, Spacing.xl),
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Signed in</Text>
        <Text style={styles.title}>Vendor Home</Text>
        <Text style={styles.description}>
          Bottom tabs will live here: Dashboard, Bookings, Fleet, Drivers, Profile.
        </Text>
      </View>
      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Log out"
      >
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
};

export default VendorHomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Dimensions.screenHorizontalPadding,
    justifyContent: 'space-between',
  },
  content: { flex: 1, justifyContent: 'center' },
  eyebrow: {
    ...Typography.label,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: { ...Typography.h1, color: Colors.textPrimary, marginTop: Spacing.sm },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
  },
  logout: {
    height: Dimensions.buttonHeight,
    backgroundColor: Colors.buttonSecondary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoutText: { ...Typography.button, color: Colors.buttonSecondaryText },
  pressed: { opacity: 0.7 },
});