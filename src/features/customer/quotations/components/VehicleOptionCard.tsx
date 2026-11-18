/**
 * ------------------------------------------------------------------
 * VehicleOptionCard  — one row of "Choose Your Vehicle"
 * ------------------------------------------------------------------
 * Each card can be collapsed or expanded. It starts COLLAPSED.
 *
 * Collapsed (tap anywhere on it, or "View all", to expand):
 *
 *   ┌───────────────────────────────────────────────┐
 *   │ [TIER] [★ Most popular]     ₹17,000  View all ⌄│
 *   │ Model (✓)                per vehicle           │
 *   │ 13 seats                                       │
 *   └───────────────────────────────────────────────┘
 *
 * Expanded (exactly the full card, with "Collapse ⌃" at the bottom):
 *
 *   ┌───────────────────────────────────────────────┐
 *   │(1)┌──────┐ [TIER]              [★ Most popular]│
 *   │   │ img  │ Model                               │
 *   │   └──────┘ description (max 3 lines)           │
 *   │ 🪑 13 Seats │ ❄ A/C │ ♫ BT Music │ 🛋 Sofa/Bed  │
 *   │ [ actions slot, e.g. ▶ Watch Video | ⇄ Compare ] │
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
 * Quantity and selection are owned by ChooseVehicleSection. The only
 * state here is `expanded`, which is purely visual: collapsing a card
 * keeps its quantity and selection, and a selected card that is
 * collapsed still shows the selected border and the ✓.
 *
 * ANIMATION:
 *   - Expand / collapse: the card's height animates (layout
 *     transition on the card itself, so the cards below it slide
 *     smoothly too) and the new content fades in.
 *   - Select: a ✓ in the tier colour pops in (spring) beside the
 *     model name, in both the collapsed and expanded card.
 *   Reanimated follows the phone's Reduce Motion setting by itself.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  LinearTransition,
  ZoomIn,
} from 'react-native-reanimated';
import {
  AppWindow,
  Armchair,
  Bus,
  Check,
  ChevronDown,
  ChevronUp,
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

export type TierPalette = { solid: string; tint: string; wash: string };

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

/** Exported so the tier tabs use exactly the same colours. */
export const TIER_PALETTE: Readonly<Record<VehicleTierKey, TierPalette>> = {
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
  /**
   * Optional row rendered between the spec row and the price footer
   * (the brochure "Watch Video / Compare" row on pending quotations).
   * Kept as a slot so this card stays unaware of brochures.
   */
  actions?: React.ReactNode;
};

export const VehicleOptionCard: React.FC<VehicleOptionCardProps> = React.memo(
  ({
    option,
    index,
    selected,
    quantity,
    onChangeQuantity,
    onSelect,
    actions,
  }) => {
    const tierPalette = TIER_PALETTE[option.tier];
    // Accent for everything except the tier pill — see COLOUR RULE.
    const accent = selected ? tierPalette : GREEN;
    const tierLabel = VEHICLE_TIER_LABELS[option.tier];
    const maxQty = option.maxQuantity ?? DEFAULT_MAX_VEHICLE_QUANTITY;
    const vehicleName = `${tierLabel} ${option.model}`;

    const [expanded, setExpanded] = useState(false);
    const expand = useCallback(() => setExpanded(true), []);
    const collapse = useCallback(() => setExpanded(false), []);

    const cardStyle = [
      styles.card,
      !expanded && styles.cardCollapsed,
      selected && {
        borderColor: accent.solid,
        backgroundColor: accent.wash,
      },
    ];

    return (
      // The layout transition animates this card's height change on
      // expand / collapse, and moves the cards below it smoothly.
      <Animated.View layout={LinearTransition.duration(240)} style={cardStyle}>
        {expanded ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.body}>
            {/* ── Top: image + identity ─────────────────────── */}
            <View style={styles.topRow}>
              <View>
                <View
                  style={[styles.imageWrap, { backgroundColor: accent.tint }]}
                >
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
                  <TierPill label={tierLabel} color={tierPalette.solid} />
                  {option.popular ? (
                    <PopularBadge color={tierPalette.solid} />
                  ) : null}
                </View>
                <View style={styles.modelRow}>
                  <Text style={styles.model} numberOfLines={1}>
                    {option.model}
                  </Text>
                  {selected ? <SelectedTick color={accent.solid} /> : null}
                </View>
                <Text style={styles.description}>{option.description}</Text>
              </View>
            </View>

            {/* ── Spec row ──────────────────────────────────── */}
            <View style={styles.specRow}>
              <SpecChip Icon={Armchair} label={`${option.seats} Seats`} />
              {option.amenities.slice(0, MAX_AMENITY_CHIPS).map(a => (
                <React.Fragment key={a.kind}>
                  <View style={styles.specDivider} />
                  <SpecChip Icon={AMENITY_ICON[a.kind]} label={a.label} />
                </React.Fragment>
              ))}
            </View>

            {actions ?? null}

            {/* ── Footer: price · quantity · select ─────────── */}
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
                vehicleName={vehicleName}
              />

              <Pressable
                onPress={onSelect}
                style={({ pressed }) => [
                  styles.selectBtn,
                  {
                    backgroundColor: selected ? accent.solid : Colors.secondary,
                  },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={
                  selected
                    ? `${vehicleName} selected, ${quantity} vehicle${
                        quantity > 1 ? 's' : ''
                      }`
                    : `Select ${vehicleName}`
                }
              >
                {selected ? (
                  <Check
                    size={15}
                    color={Colors.textOnPrimary}
                    strokeWidth={3}
                  />
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

            {/* ── Collapse ──────────────────────────────────── */}
            <Pressable
              onPress={collapse}
              hitSlop={6}
              style={({ pressed }) => [
                styles.toggle,
                styles.collapseBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ expanded: true }}
              accessibilityLabel={`Collapse ${vehicleName}`}
            >
              <Text style={styles.toggleText}>Collapse</Text>
              <ChevronUp
                size={16}
                color={Colors.primaryDark}
                strokeWidth={2.5}
              />
            </Pressable>
          </Animated.View>
        ) : (
          /* ── Collapsed: tier · name · seats · price · View all ── */
          <Animated.View entering={FadeIn.duration(200)}>
            <Pressable
              onPress={expand}
              style={({ pressed }) => [
                styles.collapsedRow,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ expanded: false, selected }}
              accessibilityLabel={`${vehicleName}, ${
                option.seats
              } seats, ${formatAmount(option.pricePerVehicle)} per vehicle${
                selected ? ', selected' : ''
              }. View all details`}
            >
              <View style={styles.collapsedIdentity}>
                <View style={styles.collapsedPillRow}>
                  <TierPill label={tierLabel} color={tierPalette.solid} />
                  {option.popular ? (
                    <PopularBadge color={tierPalette.solid} />
                  ) : null}
                </View>
                <View style={styles.modelRow}>
                  <Text style={styles.modelCollapsed} numberOfLines={1}>
                    {option.model}
                  </Text>
                  {selected ? <SelectedTick color={accent.solid} /> : null}
                </View>
                <Text style={styles.seatsText}>{option.seats} seats</Text>
              </View>

              <View style={styles.collapsedPrice}>
                <Text
                  style={[styles.collapsedPriceText, { color: accent.solid }]}
                  numberOfLines={1}
                >
                  {formatAmount(option.pricePerVehicle)}
                </Text>
                <Text style={styles.priceUnit}>per vehicle</Text>
              </View>

              <View style={styles.toggle}>
                <Text style={styles.toggleText}>View all</Text>
                <ChevronDown
                  size={16}
                  color={Colors.primaryDark}
                  strokeWidth={2.5}
                />
              </View>
            </Pressable>
          </Animated.View>
        )}
      </Animated.View>
    );
  },
);
VehicleOptionCard.displayName = 'VehicleOptionCard';

/* ================================================================
 * Sub-components
 * ================================================================ */

const TierPill: React.FC<{ label: string; color: string }> = ({
  label,
  color,
}) => (
  <View style={[styles.tierPill, { backgroundColor: color }]}>
    <Text style={styles.tierPillText}>{label}</Text>
  </View>
);

const PopularBadge: React.FC<{ color: string }> = ({ color }) => (
  <View style={[styles.popularBadge, { backgroundColor: color }]}>
    <Star size={11} color={Colors.textOnPrimary} fill={Colors.textOnPrimary} />
    <Text style={styles.popularText}>Most popular</Text>
  </View>
);

/**
 * The ✓ beside the model name. Mounted only while selected, so the
 * spring "pop" plays each time the customer selects this vehicle.
 */
const SelectedTick: React.FC<{ color: string }> = ({ color }) => (
  <Animated.View
    entering={ZoomIn.springify().damping(11).stiffness(220)}
    style={[styles.tick, { backgroundColor: color }]}
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  >
    <Check size={11} color={Colors.textOnPrimary} strokeWidth={3.2} />
  </Animated.View>
);

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
    ...Shadows.xs,
  },
  cardCollapsed: {
    paddingVertical: Spacing.sm + 2,
  },
  body: {
    gap: Spacing.md,
  },
  pressed: {
    opacity: 0.75,
  },

  /* Collapsed */
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  collapsedIdentity: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  collapsedPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  modelCollapsed: {
    ...Typography.subtitle,
    flexShrink: 1,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  seatsText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  collapsedPrice: {
    alignItems: 'flex-end',
  },
  collapsedPriceText: {
    ...Typography.subtitle,
    fontWeight: '800',
  },

  /* View all / Collapse toggle */
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  collapseBtn: {
    alignSelf: 'center',
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
  },
  toggleText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.primaryDark,
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
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  model: {
    ...Typography.subtitle,
    flexShrink: 1,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  tick: {
    width: 18,
    height: 18,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
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
