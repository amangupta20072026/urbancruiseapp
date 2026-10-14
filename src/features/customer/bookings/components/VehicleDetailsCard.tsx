/**
 * ------------------------------------------------------------------
 * VehicleDetailsCard — the "Vehicle Details" card on Booking Details
 * ------------------------------------------------------------------
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ [🚐] Vehicle Details                                  ›  │
 *   │                                                          │
 *   │ Force Urbania                     ┌──────────────────┐   │
 *   │ [ROYAL]                           │   vehicle photo  │   │
 *   │ [DL 3C AB 7788]  (once assigned)  └──────────────────┘   │
 *   │ ┌──────────────────────────────────────────────────────┐ │
 *   │ │   (💺)        │     (❄)        │      (⛽)          │ │
 *   │ │ 17 Seater     │     AC         │     Diesel         │ │
 *   │ │ Seating Cap.  │ Air Condition. │    Fuel Type       │ │
 *   │ └──────────────────────────────────────────────────────┘ │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Shared by the Upcoming and Ongoing layouts in BookingDetailScreen.
 *
 * - Tier badge comes from `vehicleOption.tier` and is hidden when
 *   the option is unknown.
 * - Registration plate shows only once a specific vehicle is
 *   assigned (`vehiclePlate` is null while upcoming).
 * - Spec cells drop out when their value is unknown (no seater /
 *   no fuel); AC always shows, as "AC" or "Non-AC".
 * - The chevron (and press feedback) appears only when `onPress` is
 *   passed, so the card never advertises a destination that
 *   doesn't exist yet.
 * - `image` defaults to a placeholder image until real vehicle photos
 *   come from the backend; pass `{ uri }` then. The photo sits in a
 *   fixed 112×64 box (`contain`), so any aspect ratio fits.
 * ------------------------------------------------------------------
 */

import React, { type ComponentType } from 'react';
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Armchair,
  Bus,
  ChevronRight,
  Fuel,
  Snowflake,
  type LucideProps,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

import type { CustomerBookingDetail } from '../types';

// Temporary: the shared placeholder used across the app until real
// vehicle photos come from the backend.
const PLACEHOLDER_VEHICLE_IMG: ImageSourcePropType = require('@assets/images/service-car.png');

/* ================================================================
 * Tier badge colours
 * ================================================================ */

type TierVisual = { fg: string; bg: string };

const TIER_VISUAL: Record<string, TierVisual> = {
  economy: { fg: Colors.textSecondary, bg: Colors.surfaceMuted },
  premium: { fg: Colors.completed, bg: Colors.completedTint },
  royal: { fg: Colors.royal, bg: Colors.royalTint },
  'royal vip': { fg: Colors.secondaryDark, bg: Colors.secondaryTint },
};

const DEFAULT_TIER_VISUAL: TierVisual = {
  fg: Colors.primaryDark,
  bg: Colors.primaryTint,
};

function tierVisual(tier: string): TierVisual {
  return TIER_VISUAL[tier.trim().toLowerCase()] ?? DEFAULT_TIER_VISUAL;
}

/* ================================================================
 * Component
 * ================================================================ */

type VehicleDetailsCardProps = {
  detail: Pick<
    CustomerBookingDetail,
    | 'vehicleModel'
    | 'vehicleType'
    | 'seater'
    | 'hasAC'
    | 'vehicleFuel'
    | 'vehiclePlate'
    | 'vehicleOption'
  >;
  /** Vehicle photo. Defaults to the placeholder image. */
  image?: ImageSourcePropType;
  /** Makes the card tappable and shows the chevron. */
  onPress?: () => void;
};

type SpecCell = {
  key: string;
  Icon: ComponentType<LucideProps>;
  value: string;
  label: string;
  muted?: boolean;
};

export const VehicleDetailsCard: React.FC<VehicleDetailsCardProps> = ({
  detail,
  image = PLACEHOLDER_VEHICLE_IMG,
  onPress,
}) => {
  const name = detail.vehicleModel ?? detail.vehicleType;
  const tier = detail.vehicleOption?.tier ?? null;
  const tierColors = tier ? tierVisual(tier) : null;

  const specs: SpecCell[] = [];
  if (detail.seater) {
    specs.push({
      key: 'seats',
      Icon: Armchair,
      value: `${detail.seater} Seater`,
      label: 'Seating Capacity',
    });
  }
  specs.push({
    key: 'ac',
    Icon: Snowflake,
    value: detail.hasAC ? 'AC' : 'Non-AC',
    label: 'Air Conditioning',
    muted: !detail.hasAC,
  });
  if (detail.vehicleFuel) {
    specs.push({
      key: 'fuel',
      Icon: Fuel,
      value: detail.vehicleFuel,
      label: 'Fuel Type',
    });
  }

  const content = (
    <>
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View style={styles.headerIconTile}>
          <Bus size={18} color={Colors.primary} strokeWidth={2.25} />
        </View>
        <Text style={styles.headerTitle}>Vehicle Details</Text>
        {onPress ? (
          <ChevronRight
            size={20}
            color={Colors.textSecondary}
            strokeWidth={2.25}
          />
        ) : null}
      </View>

      {/* ── Name / tier / plate + photo ── */}
      <View style={styles.heroRow}>
        <View style={styles.heroTextCol}>
          <Text style={styles.vehicleName} numberOfLines={2}>
            {name}
          </Text>
          {tier && tierColors ? (
            <View
              style={[styles.tierBadge, { backgroundColor: tierColors.bg }]}
            >
              <Text style={[styles.tierBadgeText, { color: tierColors.fg }]}>
                {tier.toUpperCase()}
              </Text>
            </View>
          ) : null}
          {detail.vehiclePlate ? (
            <View style={styles.plateChip}>
              <Text style={styles.plateChipText}>{detail.vehiclePlate}</Text>
            </View>
          ) : null}
        </View>
        <Image
          source={image}
          style={styles.vehicleImage}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessible={false}
        />
      </View>

      {/* ── Spec strip ── */}
      <View style={styles.specStrip}>
        {specs.map((spec, i) => (
          <React.Fragment key={spec.key}>
            {i > 0 ? <View style={styles.specDivider} /> : null}
            <View
              style={styles.specCell}
              accessible
              accessibilityLabel={`${spec.label}: ${spec.value}`}
            >
              <View style={styles.specIconCircle}>
                <spec.Icon
                  size={18}
                  color={spec.muted ? Colors.textTertiary : Colors.primaryDark}
                  strokeWidth={2}
                />
              </View>
              <Text style={styles.specValue} numberOfLines={1}>
                {spec.value}
              </Text>
              <Text style={styles.specLabel} numberOfLines={2}>
                {spec.label}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Vehicle details, ${name}`}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.card}>{content}</View>;
};

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

  /* Header */
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

  /* Hero */
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroTextCol: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 6,
  },
  vehicleName: {
    ...Typography.title,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 24,
  },
  tierBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  tierBadgeText: {
    ...Typography.caption,
    fontWeight: '800',
    letterSpacing: 0.6,
    includeFontPadding: false,
  },
  plateChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  plateChipText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  vehicleImage: {
    width: 112,
    height: 64,
  },

  /* Spec strip */
  specStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundSecondary,
  },
  specDivider: {
    width: 1,
    marginVertical: Spacing.xs,
    backgroundColor: Colors.border,
  },
  specCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  specIconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  specValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
  },
  specLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    marginTop: 1,
  },
});