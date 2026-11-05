/**
 * ------------------------------------------------------------------
 * VehicleStatusCard — vehicle counts by status (Vendor dashboard)
 * ------------------------------------------------------------------
 *   Vehicle Status                                   View All >
 *   ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────
 *   │(🚗) 28   >│ │(🚘) 4    >│ │(🔧) 2    >│ │(⚠) 1
 *   │    On Trip│ │  Upcoming │ │  Under    │ │ Inact
 *   │           │ │           │ │  Service  │ │
 *   └───────────┘ └───────────┘ └───────────┘ └──────
 *        ← scrolls sideways when the tiles don't fit →
 *
 * Tiles follow VEHICLE_STATUS_KEYS order; a status the server didn't
 * send (or sent with a bad count) is hidden (orderVehicleStatus).
 * Each tile and "View All" call their handlers; the screen decides
 * where they go.
 *
 * Colours (all @theme): tile wash + border from the *Wash tokens, icon
 * on its *Tint circle, count and label in text colours.
 *   On Trip       green   success  / primaryTint   / greenWash
 *   Upcoming      blue    completed/ completedTint / blueWash
 *   Under Service orange  accent   / accentTint    / orangeWash
 *   Inactive      red     error    / errorTint     / redWash
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Car,
  CarFront,
  ChevronRight,
  TriangleAlert,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

import type { VehicleStatusCount, VehicleStatusKey } from '../types';

/** Fits "Under Service" on at most two lines at default text size. */
const TILE_WIDTH = 150;

const STATUS_VISUAL: Readonly<
  Record<
    VehicleStatusKey,
    {
      label: string;
      Icon: LucideIcon;
      fg: string;
      iconBg: string;
      wash: string;
      border: string;
    }
  >
> = {
  on_trip: {
    label: 'On Trip',
    Icon: Car,
    fg: Colors.success,
    iconBg: Colors.primaryTint,
    wash: Colors.greenWash,
    border: Colors.greenWashBorder,
  },
  upcoming: {
    label: 'Upcoming',
    Icon: CarFront,
    fg: Colors.completed,
    iconBg: Colors.completedTint,
    wash: Colors.blueWash,
    border: Colors.blueWashBorder,
  },
  under_service: {
    label: 'Under Service',
    Icon: Wrench,
    fg: Colors.accent,
    iconBg: Colors.accentTint,
    wash: Colors.orangeWash,
    border: Colors.orangeWashBorder,
  },
  inactive: {
    label: 'Inactive',
    Icon: TriangleAlert,
    fg: Colors.error,
    iconBg: Colors.errorTint,
    wash: Colors.redWash,
    border: Colors.redWashBorder,
  },
};

type Props = {
  /** Already ordered and checked (orderVehicleStatus). */
  items: readonly VehicleStatusCount[];
  onViewAll: () => void;
  onPressStatus: (key: VehicleStatusKey) => void;
};

export const VehicleStatusCard: React.FC<Props> = ({
  items,
  onViewAll,
  onPressStatus,
}) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <Text style={styles.title} accessibilityRole="header">
        Vehicle Status
      </Text>
      <Pressable
        onPress={onViewAll}
        hitSlop={10}
        style={({ pressed }) => [styles.viewAll, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="View all vehicles"
      >
        <Text style={styles.viewAllText}>View All</Text>
        <ChevronRight size={16} color={Colors.primaryDark} strokeWidth={2.5} />
      </Pressable>
    </View>

    {items.length === 0 ? (
      <Text style={styles.empty}>No vehicle status available.</Text>
    ) : (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tiles}
      >
        {items.map(item => {
          const v = STATUS_VISUAL[item.key];
          const Icon = v.Icon;
          return (
            <Pressable
              key={item.key}
              onPress={() => onPressStatus(item.key)}
              style={({ pressed }) => [
                styles.tile,
                { backgroundColor: v.wash, borderColor: v.border },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${v.label}: ${item.count} ${
                item.count === 1 ? 'vehicle' : 'vehicles'
              }`}
            >
              <View style={[styles.iconCircle, { backgroundColor: v.iconBg }]}>
                <Icon size={18} color={v.fg} strokeWidth={2.2} />
              </View>
              <View style={styles.tileText}>
                <Text style={styles.count} numberOfLines={1}>
                  {item.count}
                </Text>
                <Text style={styles.label} numberOfLines={2}>
                  {v.label}
                </Text>
              </View>
              <ChevronRight
                size={16}
                color={Colors.textTertiary}
                strokeWidth={2.2}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    )}
  </View>
);

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.title,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  /* primaryDark on white: 5.1:1 (primary would be 2.8:1). */
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: {
    ...Typography.body,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  pressed: { opacity: 0.7 },
  empty: {
    ...Typography.body,
    color: Colors.textSecondary,
    paddingVertical: Spacing.md,
    textAlign: 'center',
  },
  tiles: { gap: Spacing.sm },
  tile: {
    width: TILE_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { flex: 1, minWidth: 0 },
  count: {
    ...Typography.title,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});
