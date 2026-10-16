/**
 * ------------------------------------------------------------------
 * VehicleOptionCard  — one row of "Choose Your Vehicle"
 * ------------------------------------------------------------------
 * Layout (all content always visible — no accordion):
 *
 *   ┌───────────────────────────────────────────────┐
 *   │(1)┌──────┐ [TIER]              [★ Most popular]│
 *   │   │ img  │ Model                               │
 *   │   └──────┘ description (max 3 lines)           │
 *   │ 🪑 13 Seats │ ❄ A/C │ ♫ BT Music │ 🛋 Sofa/Bed  │
 *   │ ₹17,000          [ − 2 + ]  [ ✓ Selected ]     │
 *   │ per vehicle                                    │
 *   └───────────────────────────────────────────────┘
 *
 * The spec row sits full-width under the image row (not beside the
 * image) so four chips fit on a 360dp phone.
 *
 * COLOUR RULE:
 *   - The tier pill always uses the tier's colour (green for
 *     Economy/Premium, royal purple for Royal/Royal VIP).
 *   - Every other accent (index badge, image wash, price, border,
 *     selected button) is brand green, and switches to the tier
 *     colour only when this card is selected. So at most one purple
 *     card is ever on screen, and it's the one the customer picked.
 *
 * Stateless: quantity and selection are owned by ChooseVehicleSection.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AppWindow,
  Armchair,
  Bus,
  Check,
  Minus,
  Music,
  Plus,
  PlugZap,
  Snowflake,
  Sofa,
  Star,
  Tv,
  type LucideIcon,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import {
  DEFAULT_MAX_VEHICLE_QUANTITY,
  VEHICLE_TIER_LABELS,
  type VehicleAmenityKind,
  type VehicleOption,
  type VehicleTierKey,
} from '../vehicleTierOptions';

/* ================================================================
 * Tier palette
 * ================================================================ */

type TierPalette = { solid: string; tint: string; wash: string };

const GREEN: TierPalette = {
  solid: Colors.primaryDark,
  tint: Colors.primaryTint,
  wash: Colors.primaryWash,
};

const ROYAL: TierPalette = {
  solid: Colors.royal,
  tint: Colors.royalTint,
  wash: Colors.royalWash,
};

const TIER_PALETTE: Readonly<Record<VehicleTierKey, TierPalette>> = {
  economy: GREEN,
  premium: GREEN,
  royal: ROYAL,
  royal_vip: ROYAL,
};

const AMENITY_ICON: Readonly<Record<VehicleAmenityKind, LucideIcon>> = {
  ac: Snowflake,
  music: Music,
  charging: PlugZap,
  sofa_bed: Sofa,
  tv: Tv,
  panoramic: AppWindow,
};

/** Spec row shows Seats + this many amenities. See VehicleOption.amenities. */
const MAX_AMENITY_CHIPS = 3;

function formatAmount(rupees: number): string {
  return `₹${rupees.toLocaleString('en-IN')}`;
}

/* ================================================================
 * Component
 * ================================================================ */

export type VehicleOptionCardProps = {
  option: VehicleOption;
  /** 1-based position in the list, shown in the corner badge. */
  index: number;
  selected: boolean;
  quantity: number;
  onChangeQuantity: (next: number) => void;
  onSelect: () => void;
};

export const VehicleOptionCard: React.FC<VehicleOptionCardProps> = React.memo(
  ({ option, index, selected, quantity, onChangeQuantity, onSelect }) => {
    const tierPalette = TIER_PALETTE[option.tier];
    // Accent for everything except the tier pill — see COLOUR RULE.
    const accent = selected ? tierPalette : GREEN;
    const tierLabel = VEHICLE_TIER_LABELS[option.tier];
    const maxQty = option.maxQuantity ?? DEFAULT_MAX_VEHICLE_QUANTITY;

    return (
      <View
        style={[
          styles.card,
          selected && {
            borderColor: accent.solid,
            backgroundColor: accent.wash,
          },
        ]}
      >
        {/* ── Top: image + identity ─────────────────────────── */}
        <View style={styles.topRow}>
          <View>
            <View style={[styles.imageWrap, { backgroundColor: accent.tint }]}>
              {option.image ? (
                <Image
                  source={option.image}
                  style={styles.image}
                  resizeMode="contain"
                />
              ) : (
                <Bus size={28} color={accent.solid} strokeWidth={1.75} />
              )}
            </View>
            <View
              style={[styles.indexBadge, { backgroundColor: accent.solid }]}
            >
              <Text style={styles.indexText}>{index}</Text>
            </View>
          </View>

          <View style={styles.identity}>
            <View style={styles.pillRow}>
              <View
                style={[
                  styles.tierPill,
                  { backgroundColor: tierPalette.solid },
                ]}
              >
                <Text style={styles.tierPillText}>{tierLabel}</Text>
              </View>
              {option.popular ? (
                <View
                  style={[
                    styles.popularBadge,
                    { backgroundColor: tierPalette.solid },
                  ]}
                >
                  <Star
                    size={11}
                    color={Colors.textOnPrimary}
                    fill={Colors.textOnPrimary}
                  />
                  <Text style={styles.popularText}>Most popular</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.model} numberOfLines={1}>
              {option.model}
            </Text>
            <Text style={styles.description}>{option.description}</Text>
          </View>
        </View>

        {/* ── Spec row ──────────────────────────────────────── */}
        <View style={styles.specRow}>
          <SpecChip Icon={Armchair} label={`${option.seats} Seats`} />
          {option.amenities.slice(0, MAX_AMENITY_CHIPS).map(a => (
            <React.Fragment key={a.kind}>
              <View style={styles.specDivider} />
              <SpecChip Icon={AMENITY_ICON[a.kind]} label={a.label} />
            </React.Fragment>
          ))}
        </View>

        {/* ── Footer: price · quantity · select ─────────────── */}
        <View style={styles.footer}>
          <View style={styles.priceBlock}>
            <Text
              style={[styles.price, { color: accent.solid }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatAmount(option.pricePerVehicle)}
            </Text>
            <Text style={styles.priceUnit}>per vehicle</Text>
          </View>

          <QuantityStepper
            value={quantity}
            min={1}
            max={maxQty}
            onChange={onChangeQuantity}
            vehicleName={`${tierLabel} ${option.model}`}
          />

          <Pressable
            onPress={onSelect}
            style={({ pressed }) => [
              styles.selectBtn,
              { backgroundColor: selected ? accent.solid : Colors.secondary },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={
              selected
                ? `${tierLabel} ${option.model} selected, ${quantity} vehicle${
                    quantity > 1 ? 's' : ''
                  }`
                : `Select ${tierLabel} ${option.model}`
            }
          >
            {selected ? (
              <Check size={15} color={Colors.textOnPrimary} strokeWidth={3} />
            ) : null}
            <Text
              style={[
                styles.selectText,
                !selected && styles.selectTextUnselected,
              ]}
            >
              {selected ? 'Selected' : 'Select'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  },
);
VehicleOptionCard.displayName = 'VehicleOptionCard';

/* ================================================================
 * Sub-components
 * ================================================================ */

const SpecChip: React.FC<{ Icon: LucideIcon; label: string }> = ({
  Icon,
  label,
}) => (
  <View style={styles.specChip}>
    <Icon size={15} color={Colors.textSecondary} strokeWidth={2} />
    <Text style={styles.specText} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const QuantityStepper: React.FC<{
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  vehicleName: string;
}> = ({ value, min, max, onChange, vehicleName }) => {
  const canDec = value > min;
  const canInc = value < max;
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => canDec && onChange(value - 1)}
        disabled={!canDec}
        hitSlop={6}
        style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canDec }}
        accessibilityLabel={`Fewer ${vehicleName} vehicles`}
      >
        <Minus
          size={16}
          color={canDec ? Colors.textPrimary : Colors.textDisabled}
          strokeWidth={2.5}
        />
      </Pressable>
      <Text
        style={styles.stepValue}
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${value} vehicle${value > 1 ? 's' : ''}`}
      >
        {value}
      </Text>
      <Pressable
        onPress={() => canInc && onChange(value + 1)}
        disabled={!canInc}
        hitSlop={6}
        style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canInc }}
        accessibilityLabel={`More ${vehicleName} vehicles`}
      >
        <Plus
          size={16}
          color={canInc ? Colors.textPrimary : Colors.textDisabled}
          strokeWidth={2.5}
        />
      </Pressable>
    </View>
  );
};

/* ================================================================
 * Styles
 * ================================================================ */

const IMAGE_W = 92;
const IMAGE_H = 76;

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.xs,
  },
  pressed: {
    opacity: 0.75,
  },

  /* Top row */
  topRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  imageWrap: {
    width: IMAGE_W,
    height: IMAGE_H,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: IMAGE_W - Spacing.sm,
    height: IMAGE_H - Spacing.sm,
  },
  indexBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    ...Typography.caption,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    color: Colors.textOnPrimary,
    includeFontPadding: false,
  },
  identity: {
    flex: 1,
    gap: 3,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tierPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  tierPillText: {
    ...Typography.caption,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: Colors.textOnPrimary,
    includeFontPadding: false,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  popularText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textOnPrimary,
    includeFontPadding: false,
  },
  model: {
    ...Typography.subtitle,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  description: {
    ...Typography.caption,
    fontSize: 11.5,
    lineHeight: 16,
    color: Colors.textSecondary,
  },

  /* Spec row */
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.backgroundSecondary,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  specText: {
    ...Typography.caption,
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  specDivider: {
    width: 1,
    height: 14,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  priceBlock: {
    flex: 1,
    minWidth: 0,
  },
  price: {
    ...Typography.title,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
  },
  priceUnit: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.pill,
    backgroundColor: Colors.backgroundTertiary,
    paddingHorizontal: 2,
  },
  stepBtn: {
    width: 30,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    ...Typography.body,
    minWidth: 18,
    textAlign: 'center',
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 92,
    height: 38,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  selectText: {
    ...Typography.label,
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
  // Unselected button sits on Colors.secondary (gold). White text on
  // gold is ~2:1 contrast (fails WCAG), so use dark text instead.
  selectTextUnselected: {
    color: Colors.textPrimary,
  },
});