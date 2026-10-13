/**
 * ------------------------------------------------------------------
 * BookingTermsCards — "Notes" + "Other Charges (if applicable)"
 * ------------------------------------------------------------------
 * Two cards shown after Fare Details on the upcoming-booking detail
 * screen. Content comes from the booking (`detail.notes`,
 * `detail.otherCharges`); it's static mock data until the backend
 * sends it.
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
 *   │ (₹20/km (Option 1–3)) (₹26/km (Option 4)) …         │
 *   └─────────────────────────────────────────────────────┘
 *
 * Each charge carries a status chip so the customer can tell at a
 * glance what's already paid for:
 *   Included      → green   (part of the quoted fare)
 *   Not included  → red     (pay the driver directly)
 *   Extra         → amber   (only if the trip goes beyond plan)
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CircleCheck, ClipboardList, ReceiptText } from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';

import type { BookingCharge, BookingChargeStatus } from '../types';

/* ================================================================
 * Palette — two soft, distinct card surfaces
 * ================================================================ */

/** Notes: soft green. */
const NOTES_BG = '#F3FAF4';
const NOTES_BORDER = '#DCEFE0';

/** Other Charges: warm amber / cream. */
const CHARGES_BG = '#FFF8EC';
const CHARGES_BORDER = '#F6E2BC';
const CHARGES_DIVIDER = '#F1DDB6';
const CHARGES_FG = '#C2410C'; // deep orange — 4.6:1 on the cream bg
const CHARGES_ICON_BG = '#FFE9CC';

const STATUS_META: Record<
  BookingChargeStatus,
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
 * Notes card
 * ================================================================ */

export const BookingNotesCard: React.FC<{ notes: readonly string[] }> = ({
  notes,
}) => {
  if (notes.length === 0) return null;
  return (
    <View style={[styles.card, styles.notesCard]}>
      <View style={styles.headRow}>
        <View style={[styles.iconTile, styles.notesIconTile]}>
          <ClipboardList
            size={18}
            color={Colors.primaryDark}
            strokeWidth={2.25}
          />
        </View>
        <Text style={[styles.title, styles.notesTitle]}>Notes</Text>
      </View>

      <View style={styles.notesList}>
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
      </View>
    </View>
  );
};

/* ================================================================
 * Other Charges card
 * ================================================================ */

const ChargeRow: React.FC<{ charge: BookingCharge; isFirst: boolean }> = ({
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
      {charge.rates.length > 0 ? (
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

export const BookingOtherChargesCard: React.FC<{
  charges: readonly BookingCharge[];
}> = ({ charges }) => {
  if (charges.length === 0) return null;
  return (
    <View style={[styles.card, styles.chargesCard]}>
      <View style={styles.headRow}>
        <View style={[styles.iconTile, styles.chargesIconTile]}>
          <ReceiptText size={18} color={CHARGES_FG} strokeWidth={2.25} />
        </View>
        <Text style={[styles.title, styles.chargesTitle]}>
          Other Charges <Text style={styles.titleNote}>(if applicable)</Text>
        </Text>
      </View>

      <View>
        {charges.map((charge, i) => (
          <ChargeRow key={charge.label} charge={charge} isFirst={i === 0} />
        ))}
      </View>
    </View>
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
    gap: Spacing.md,
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
    borderColor: NOTES_BORDER,
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
  rateChipText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});
