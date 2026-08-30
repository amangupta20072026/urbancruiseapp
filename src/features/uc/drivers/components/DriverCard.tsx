import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BadgeCheck,
  Briefcase,
  Building2,
  ChevronRight,
  MapPin,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { avatarColorFor, initials } from '@features/uc/_directory';

import { DRIVER_VERIFICATION_LABEL, type Driver } from '../types';

type Props = { driver: Driver; onPress: (d: Driver) => void };

const VERIFICATION_COLOUR: Record<
  Driver['verification'],
  { bg: string; fg: string }
> = {
  verified: { bg: '#E7F7EC', fg: '#049856' },
  pending: { bg: '#FEF3C7', fg: '#B45309' },
  rejected: { bg: '#FEE2E2', fg: '#B91C1C' },
};

export const DriverCard: React.FC<Props> = ({ driver, onPress }) => {
  const c = avatarColorFor(driver.id);
  const vp = VERIFICATION_COLOUR[driver.verification];

  return (
    <Pressable
      onPress={() => onPress(driver)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Driver ${driver.name}. Tap for contact actions.`}
    >
      <View style={[styles.avatar, { backgroundColor: c.bg }]}>
        <Text style={[styles.avatarText, { color: c.fg }]}>
          {initials(driver.name)}
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {driver.name}
          </Text>
          <View style={[styles.pill, { backgroundColor: vp.bg }]}>
            <BadgeCheck size={11} color={vp.fg} />
            <Text style={[styles.pillText, { color: vp.fg }]}>
              {DRIVER_VERIFICATION_LABEL[driver.verification]}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Building2 size={13} color={Colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>
            {driver.vendorName}
          </Text>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.footerLeft}>
            <MapPin size={13} color={Colors.textSecondary} />
            <Text style={styles.footerText} numberOfLines={1}>
              {driver.city}
            </Text>
          </View>

          <View style={styles.sep} />

          <View style={styles.footerRight}>
            <Briefcase size={13} color={Colors.success} />
            <Text style={styles.tripsText} numberOfLines={1}>
              {driver.completedTrips} trips
            </Text>
          </View>
        </View>
      </View>

      <ChevronRight size={20} color={Colors.textTertiary} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm + 4,
    marginBottom: Spacing.md,
    ...Shadows.xs,
  },
  pressed: { opacity: 0.85 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.body, fontWeight: '700' },
  body: { flex: 1, gap: 4 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  name: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  pillText: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  tripsText: {
    ...Typography.bodySmall,
    color: Colors.success,
    fontWeight: '600',
  },
  sep: {
    width: 1,
    height: 12,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
});
