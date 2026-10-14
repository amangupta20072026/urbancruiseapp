/**
 * ------------------------------------------------------------------
 * DriverDetailsCard — the "Driver Details" card on Booking Details
 * ------------------------------------------------------------------
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ [👤] Driver Details                                      │
 *   │ (RK) Rajesh Kumar                       [📞 Call Driver] │
 *   │      ★ 4.8 (320 trips)                                   │
 *   │ ──────────────────────────────────────────────────────── │
 *   │   ( 🛞 )      |    ( 🛡 )       |    ( 👤 )             │
 *   │  Experienced  |    Verified     |   Polite &             │
 *   │    Driver     | by Urban Cruise |  Professional          │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Shared by every status layout in BookingDetailScreen.
 *
 * - `showCall` — the Call Driver button. On for Upcoming / Ongoing;
 *   off once the trip is over (Completed / Cancelled). The button is
 *   also disabled when the driver has no phone number.
 * - `pendingText` — shown instead of the driver row while no driver
 *   is assigned. Each status passes its own wording.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Phone, ShieldCheck, Star, User, UserCheck } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { makePhoneCall } from '@services/contact';

import type { BookingDriver } from '../types';

/* ================================================================
 * Helpers
 * ================================================================ */

/** Two-letter initials for the avatar fallback. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}

/** Fire-and-forget: the contact service shows its own error toast. */
function callDriver(phone: string | null): void {
  if (!phone) return;
  makePhoneCall(phone).catch(() => {
    /* contactService already toasted */
  });
}

/* ================================================================
 * Trust badges
 * ================================================================ */

/** Steering-wheel glyph — lucide has none, so it's drawn with the
 *  same react-native-svg primitives and stroke style as lucide icons. */
const SteeringWheel: React.FC<{ size?: number; color?: string }> = ({
  size = 18,
  color = Colors.primary,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Circle cx={12} cy={12} r={10} />
    <Circle cx={12} cy={12} r={2} />
    <Path d="M2 12h8" />
    <Path d="M14 12h8" />
    <Path d="M12 14v8" />
  </Svg>
);

const DRIVER_BADGES: readonly { key: string; label: string }[] = [
  { key: 'experienced', label: 'Experienced\nDriver' },
  { key: 'verified', label: 'Verified\nby Urban Cruise' },
  { key: 'polite', label: 'Polite &\nProfessional' },
];

const DriverBadgeIcon: React.FC<{ badge: string }> = ({ badge }) => {
  if (badge === 'experienced') {
    return <SteeringWheel size={22} color={Colors.primary} />;
  }
  if (badge === 'verified') {
    return <ShieldCheck size={22} color={Colors.primary} strokeWidth={2} />;
  }
  return <UserCheck size={22} color={Colors.primary} strokeWidth={2} />;
};

const DriverBadges: React.FC = () => (
  <View style={styles.badgeRow}>
    {DRIVER_BADGES.map((b, i) => (
      <React.Fragment key={b.key}>
        {i > 0 ? <View style={styles.badgeDivider} /> : null}
        <View
          style={styles.badge}
          accessible
          accessibilityLabel={b.label.replace('\n', ' ')}
        >
          <View style={styles.badgeIcon}>
            <DriverBadgeIcon badge={b.key} />
          </View>
          <Text style={styles.badgeText}>{b.label}</Text>
        </View>
      </React.Fragment>
    ))}
  </View>
);

/* ================================================================
 * Component
 * ================================================================ */

type DriverDetailsCardProps = {
  driver: BookingDriver | null;
  /** Show the Call Driver button. Default true. */
  showCall?: boolean;
  /** Text shown while no driver is assigned. */
  pendingText?: string;
};

export const DriverDetailsCard: React.FC<DriverDetailsCardProps> = ({
  driver,
  showCall = true,
  pendingText = 'Driver assignment pending.',
}) => (
  <View style={styles.card}>
    <View style={styles.headerRow}>
      <View style={styles.headerIconTile}>
        <User size={18} color={Colors.primary} strokeWidth={2.25} />
      </View>
      <Text style={styles.headerTitle}>Driver Details</Text>
    </View>

    {driver ? (
      <>
        <View style={styles.driverRow}>
          {driver.avatarUrl ? (
            <Image source={{ uri: driver.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.initials}>{initialsOf(driver.name)}</Text>
            </View>
          )}
          <View style={styles.driverBody}>
            <Text style={styles.driverName} numberOfLines={1}>
              {driver.name}
            </Text>
            {driver.rating !== null ? (
              <View style={styles.ratingRow}>
                <Star
                  size={12}
                  color={Colors.warning}
                  fill={Colors.warning}
                  strokeWidth={2}
                />
                <Text style={styles.ratingText}>
                  {driver.rating.toFixed(1)}
                  {driver.tripsCompleted !== null ? (
                    <Text style={styles.ratingMuted}>
                      {' '}
                      ({driver.tripsCompleted} trips)
                    </Text>
                  ) : null}
                </Text>
              </View>
            ) : null}
          </View>
          {showCall ? (
            <Pressable
              onPress={() => callDriver(driver.phoneE164)}
              disabled={!driver.phoneE164}
              hitSlop={6}
              style={({ pressed }) => [
                styles.callChip,
                pressed && styles.pressed,
                !driver.phoneE164 && styles.disabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Call driver"
              accessibilityState={{ disabled: !driver.phoneE164 }}
            >
              <Phone size={13} color={Colors.textOnPrimary} strokeWidth={2.5} />
              <Text style={styles.callChipText}>Call Driver</Text>
            </Pressable>
          ) : null}
        </View>
        <DriverBadges />
      </>
    ) : (
      <Text style={styles.pendingText}>{pendingText}</Text>
    )}
  </View>
);

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.md,
    ...Shadows.xs,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },

  /* Header — same as VehicleDetailsCard */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIconTile: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.subtitle,
    flex: 1,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 20,
  },

  /* Driver row */
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.circle,
    backgroundColor: Colors.surfaceMuted,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...Typography.subtitle,
    color: Colors.textSecondary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  driverBody: {
    flex: 1,
    gap: 2,
  },
  driverName: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    ...Typography.caption,
    color: Colors.warning,
    fontWeight: '800',
  },
  ratingMuted: {
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  callChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryDark,
  },
  callChipText: {
    ...Typography.caption,
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },
  pendingText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 16,
  },

  /* Trust badges */
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  badge: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: 4,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDivider: {
    width: 1,
    marginVertical: 4,
    backgroundColor: Colors.border,
  },
  badgeText: {
    ...Typography.caption,
    lineHeight: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
});
