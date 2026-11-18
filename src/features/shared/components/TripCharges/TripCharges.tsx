/**
 * ------------------------------------------------------------------
 * TripCharges — "Notes" + "Other Charges (if applicable)"
 * ------------------------------------------------------------------
 * Two cards describing what the fare covers and what the customer
 * still owes the driver. Shared by BOTH ends of the funnel:
 *
 *   Quotation Details — after the vehicle section
 *   Booking Details   — after "Fare Details"
 *
 * One component on purpose. These are the same commercial terms seen
 * twice, so a customer who reads them on the quotation must see the
 * identical wording and layout on the booking they confirm. Content
 * comes from the screen (`detail.notes`, `detail.otherCharges`); it's
 * static mock data until the backend sends it.
 *
 *   ┌ (📋) Notes ─────────────────────────── soft green ┐
 *   │ ✓ Pricing includes vehicle cost, fuel cost, …     │
 *   │ ✓ KM will be counted from pickup point to …       │
 *   └───────────────────────────────────────────────────┘
 *
 *   ┌ (🧾) Other Charges  (if applicable) ──── warm amber ┐
 *   │ Toll Charges                          [Included]    │
 *   │ Already included in the cost.                       │
 *   │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
 *   │ Extra Charge above 1800 km                [Extra]   │
 *   │ [ ₹26/km ]  For your vehicle                        │
 *   │             Option 4 · Royal · 17 Seat Tempo Trav…  │
 *   └─────────────────────────────────────────────────────┘
 *
 * Each charge carries a status chip so the customer can tell at a
 * glance what's already paid for:
 *   Included      → green   (part of the quoted fare)
 *   Not included  → red     (pay the driver directly)
 *   Extra         → amber   (only if the trip goes beyond plan)
 *
 * Vehicle-specific charges (`forVehicle` set, e.g. extra km above
 * 1800) show ONLY the booked vehicle option's rate, as one large
 * chip, with the option named beside it.
 *
 * VIEW ALL / COLLAPSE (same pattern as the vehicle cards)
 *   Both cards start COLLAPSED, showing only their header with a
 *   count, and expand on their own:
 *
 *   ┌ (📋) Notes · 5 points                     View all ⌄ ┐
 *   └──────────────────────────────────────────────────────┘
 *   ┌ (🧾) Other Charges · 4 items              View all ⌄ ┐
 *   └──────────────────────────────────────────────────────┘
 *
 *   Tapping anywhere on the header (or "View all") expands the card;
 *   "Collapse ⌃" folds it again. Expanded, Other Charges shows
 *   "(if applicable)" in place of the count. The card's height
 *   animates (layout transition) and the content fades in, so a card
 *   below it slides rather than jumps. Reanimated follows the phone's
 *   Reduce Motion setting by itself.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import {
  ChevronDown,
  ChevronUp,
  CircleCheck,
  ClipboardList,
  ReceiptText,
} from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';

import type { TripCharge, TripChargeStatus } from './types';

/* ================================================================
 * Palette — two soft, distinct card surfaces
 * ================================================================ */

/** Notes: soft purple — same as the Rate Your Trip card (PURPLE_TINT in
 *  BookingDetailScreen). */
const NOTES_BG = '#F3EEFF';

/** Other Charges: warm amber / cream. */
const CHARGES_BG = '#FFF8EC';
const CHARGES_BORDER = '#F6E2BC';
const CHARGES_DIVIDER = '#F1DDB6';
const CHARGES_FG = '#C2410C'; // deep orange — 4.6:1 on the cream bg
const CHARGES_ICON_BG = '#FFE9CC';

const STATUS_META: Record<
  TripChargeStatus,
  { label: string; bg: string; fg: string }
> = {
  included: {
    label: 'Included',
    bg: Colors.primaryTint,
    fg: Colors.primaryDark,
  },
  not_included: {
    label: 'Not included',
    bg: Colors.errorTint,
    fg: '#B91C1C',
  },
  extra: { label: 'Extra', bg: '#FEF3C7', fg: '#92400E' },
};

/* ================================================================
 * Collapsible shell — shared by both cards
 * ================================================================ */

/** "5 points", "1 item". */
function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "View all ⌄" / "Collapse ⌃" — green, like the vehicle cards. */
const ToggleLabel: React.FC<{ expanded: boolean }> = ({ expanded }) => (
  <View style={styles.toggle}>
    <Text style={styles.toggleText}>{expanded ? 'Collapse' : 'View all'}</Text>
    {expanded ? (
      <ChevronUp size={16} color={Colors.primaryDark} strokeWidth={2.5} />
    ) : (
      <ChevronDown size={16} color={Colors.primaryDark} strokeWidth={2.5} />
    )}
  </View>
);

/** Starts collapsed; returns the state and its toggle. */
function useExpanded(): [boolean, () => void] {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded(prev => !prev), []);
  return [expanded, toggle];
}

/* ================================================================
 * Notes card
 * ================================================================ */

export const TripNotesCard: React.FC<{ notes: readonly string[] }> = ({
  notes,
}) => {
  const [expanded, toggle] = useExpanded();
  if (notes.length === 0) return null;

  const count = countLabel(notes.length, 'point', 'points');

  return (
    <Animated.View
      layout={LinearTransition.duration(240)}
      style={[styles.card, styles.notesCard]}
    >
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [styles.headRow, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Notes, ${count}. ${
          expanded ? 'Collapse' : 'View all'
        }`}
      >
        <View style={[styles.iconTile, styles.notesIconTile]}>
          <ClipboardList
            size={18}
            color={Colors.primaryDark}
            strokeWidth={2.25}
          />
        </View>
        <Text style={[styles.title, styles.notesTitle]} numberOfLines={1}>
          Notes
          {expanded ? null : (
            <Text style={styles.titleNote}>{`  ·  ${count}`}</Text>
          )}
        </Text>
        <ToggleLabel expanded={expanded} />
      </Pressable>

      {expanded ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[styles.body, styles.notesList]}
        >
          {notes.map(note => (
            <View key={note} style={styles.noteRow}>
              <CircleCheck
                size={16}
                color={Colors.primary}
                strokeWidth={2.25}
                style={styles.noteIcon}
              />
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ))}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
};

/* ================================================================
 * Other Charges card
 * ================================================================ */

const ChargeRow: React.FC<{ charge: TripCharge; isFirst: boolean }> = ({
  charge,
  isFirst,
}) => {
  const status = STATUS_META[charge.status];
  return (
    <View style={[styles.chargeRow, !isFirst && styles.chargeRowDivided]}>
      <View style={styles.chargeHead}>
        <Text style={styles.chargeLabel}>{charge.label}</Text>
        <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusChipText, { color: status.fg }]}>
            {status.label}
          </Text>
        </View>
      </View>
      {charge.detail ? (
        <Text style={styles.chargeDetail}>{charge.detail}</Text>
      ) : null}
      {charge.forVehicle && charge.rates[0] ? (
        <View style={styles.vehicleRateRow}>
          <View style={styles.vehicleRateChip}>
            <Text style={styles.vehicleRateText}>{charge.rates[0]}</Text>
          </View>
          <View style={styles.vehicleRateInfo}>
            <Text style={styles.vehicleRateCaption}>For your vehicle</Text>
            <Text style={styles.vehicleRateName} numberOfLines={2}>
              {charge.forVehicle}
            </Text>
          </View>
        </View>
      ) : charge.rates.length > 0 ? (
        <View style={styles.rateList}>
          {charge.rates.map(rate => (
            <View key={rate} style={styles.rateChip}>
              <Text style={styles.rateChipText}>{rate}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

export const OtherChargesCard: React.FC<{
  charges: readonly TripCharge[];
}> = ({ charges }) => {
  const [expanded, toggle] = useExpanded();
  if (charges.length === 0) return null;

  const count = countLabel(charges.length, 'item', 'items');

  return (
    <Animated.View
      layout={LinearTransition.duration(240)}
      style={[styles.card, styles.chargesCard]}
    >
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [styles.headRow, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Other charges, ${count}. ${
          expanded ? 'Collapse' : 'View all'
        }`}
      >
        <View style={[styles.iconTile, styles.chargesIconTile]}>
          <ReceiptText size={18} color={CHARGES_FG} strokeWidth={2.25} />
        </View>
        <Text style={[styles.title, styles.chargesTitle]} numberOfLines={1}>
          Other Charges{' '}
          <Text style={styles.titleNote}>
            {expanded ? '(if applicable)' : `·  ${count}`}
          </Text>
        </Text>
        <ToggleLabel expanded={expanded} />
      </Pressable>

      {expanded ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.body}>
          {charges.map((charge, i) => (
            <ChargeRow key={charge.label} charge={charge} isFirst={i === 0} />
          ))}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
};

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  /* Expanded content sits this far under the header. */
  body: {
    marginTop: Spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  toggleText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    ...Typography.subtitle,
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 20,
  },
  titleNote: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  /* Notes */
  notesCard: {
    backgroundColor: NOTES_BG,
    borderColor: Colors.borderLight,
  },
  notesIconTile: {
    backgroundColor: Colors.surface,
  },
  notesTitle: {
    color: Colors.primaryDark,
  },
  notesList: {
    gap: 10,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  noteIcon: {
    marginTop: 2,
  },
  noteText: {
    flex: 1,
    ...Typography.bodySmall,
    lineHeight: 20,
    color: Colors.textPrimary,
  },

  /* Other Charges */
  chargesCard: {
    backgroundColor: CHARGES_BG,
    borderColor: CHARGES_BORDER,
  },
  chargesIconTile: {
    backgroundColor: CHARGES_ICON_BG,
  },
  chargesTitle: {
    color: CHARGES_FG,
  },
  chargeRow: {
    gap: 6,
    paddingVertical: 10,
  },
  chargeRowDivided: {
    borderTopWidth: 1,
    borderTopColor: CHARGES_DIVIDER,
  },
  chargeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chargeLabel: {
    flex: 1,
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  chargeDetail: {
    ...Typography.caption,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  statusChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  statusChipText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  rateList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rateChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: CHARGES_BORDER,
  },
  vehicleRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vehicleRateChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: '#FDBA74',
  },
  vehicleRateText: {
    ...Typography.body,
    fontSize: 16,
    fontWeight: '800',
    color: CHARGES_FG,
  },
  vehicleRateInfo: {
    flex: 1,
    gap: 1,
  },
  vehicleRateCaption: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  vehicleRateName: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  rateChipText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});
