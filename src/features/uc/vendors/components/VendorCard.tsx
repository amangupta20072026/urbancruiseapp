import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Building2, ChevronRight, MapPin, Truck } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { avatarColorFor, initials } from '@features/uc/_directory';

import type { Vendor } from '../types';
import { VENDOR_STATUS_LABEL } from '../types';

type Props = { vendor: Vendor; onPress: (v: Vendor) => void };

const STATUS_COLOUR: Record<
  Vendor['status'],
  { bg: string; fg: string }
> = {
  active: { bg: '#E7F7EC', fg: '#049856' },
  pending: { bg: '#FEF3C7', fg: '#B45309' },
  suspended: { bg: '#FEE2E2', fg: '#B91C1C' },
};

export const VendorCard: React.FC<Props> = ({ vendor, onPress }) => {
  const c = avatarColorFor(vendor.id);
  const statusPalette = STATUS_COLOUR[vendor.status];

  return (
    <Pressable
      onPress={() => onPress(vendor)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Vendor ${vendor.companyName}. Tap to open contact actions.`}
    >
      <View style={[styles.avatar, { backgroundColor: c.bg }]}>
        <Text style={[styles.avatarText, { color: c.fg }]}>
          {initials(vendor.companyName)}
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {vendor.companyName}
          </Text>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: statusPalette.bg },
            ]}
          >
            <Text style={[styles.statusText, { color: statusPalette.fg }]}>
              {VENDOR_STATUS_LABEL[vendor.status]}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Building2 size={13} color={Colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>
            {vendor.ownerName}
          </Text>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.footerLeft}>
            <MapPin size={13} color={Colors.textSecondary} />
            <Text style={styles.footerText} numberOfLines={1}>
              {vendor.city}
            </Text>
          </View>

          <View style={styles.sep} />

          <View style={styles.footerRight}>
            <Truck size={13} color={Colors.success} />
            <Text style={styles.fleetText} numberOfLines={1}>
              {vendor.vehicleCount} vehicles
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
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  statusText: {
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
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  fleetText: {
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
