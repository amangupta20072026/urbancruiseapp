/**
 * ------------------------------------------------------------------
 * TripDetailsCard — the merged "Trip Details" card on Booking Details
 * ------------------------------------------------------------------
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ [📍] Trip Details                          [✈ One Way]   │
 *   │ Trip ID                                   [idAction]     │
 *   │ TR-2026-735204 📋                                        │
 *   │ ──────────────────────────────────────────────────────── │
 *   │ TRAVEL DATES                                             │
 *   │ ┌ Start ─────────── ┄┄ [3 Days] ┄┄ ─────────── End ┐     │
 *   │ │ 15 Sept 2026                        17 Sept 2026 │     │
 *   │ └──────────────────────────────────────────────────┘     │
 *   │ 🕐 09:00 AM    👥 20 Passengers                          │
 *   │   (Pickup & Drop: 🕐 Onward 10:30 AM  🕐 Return 04:00 PM) │
 *   │ ──────────────────────────────────────────────────────── │
 *   │ TRAVEL ITINERARY                              ⤳ 3 stops  │
 *   │ ●┄┄┄┄┄┄┄┄┄┄┄┄●┄┄┄┄┄┄┄┄┄┄┄┄●   ← scrolls sideways         │
 *   │ Delhi         Agra         Jaipur                        │
 *   │ IGI Airport…  Agra Fort…   Jaipur Rly…                   │
 *   │ ──────────────────────────────────────────────────────── │
 *   │ {tracker}                                                │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Shared by every status layout in BookingDetailScreen. What differs
 * per status is passed in:
 *   - `tracker`   — the progress tracker (normal / ongoing / cancelled)
 *   - `idAction`  — optional element beside the Trip ID (Completed's
 *                   "Book Again" button)
 *
 * Pickup & Drop trips are two one-way legs booked together — X → Z,
 * the customer stays at Z without the vehicle, then Z → X on
 * `endDate`. The stay stop gets a "Stay · N nights" tag and the meta
 * row shows both leg times (onward `pickupTime`, `returnPickupTime`).
 *
 * The Trip ID is deliberately plain text (small grey label + bold id
 * + copy icon), matching how Quotation ID and Booking ID read on
 * their cards.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  BedDouble,
  Check,
  Clock,
  Copy,
  MapPin,
  Route,
  Users,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { getTripTypeOption } from '@features/customer/quotations';

import type { CustomerBookingDetail } from '../types';

/* ================================================================
 * Helpers
 * ================================================================ */

const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-09-15" → UTC midnight, so day maths ignores the device TZ. */
function isoDayToUtc(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** "2026-09-15" → "15 Sept 2026". */
function formatTripDate(iso: string): string {
  return new Date(isoDayToUtc(iso)).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Nights between two ISO days: 24 → 26 Oct is 2. */
function nightsBetween(startIso: string, endIso: string): number {
  return Math.max(
    0,
    Math.round((isoDayToUtc(endIso) - isoDayToUtc(startIso)) / DAY_MS),
  );
}

/** Inclusive day count: 15 → 17 Sept is "3 Days", same day is "1 Day". */
function formatDuration(startIso: string, endIso: string): string {
  const days =
    Math.max(
      0,
      Math.round((isoDayToUtc(endIso) - isoDayToUtc(startIso)) / DAY_MS),
    ) + 1;
  return `${days} ${days === 1 ? 'Day' : 'Days'}`;
}

/* ================================================================
 * Small pieces
 * ================================================================ */

/**
 * Dashed line drawn as a row of short segments. React Native's
 * `borderStyle: 'dashed'` is unreliable on a single border side on
 * Android, so the dashes are real Views clipped by the container.
 *
 * The dashes sit in an ABSOLUTELY positioned row so they never add to
 * the line's measured width — otherwise, inside the horizontal
 * itinerary ScrollView, ~320 px of dashes would widen the first stop
 * and push the others off-screen.
 */
const DASHES = Array.from({ length: 60 }, (_, i) => i);

const DashedLine: React.FC<{ color: string }> = ({ color }) => (
  <View style={styles.dashedLine} pointerEvents="none">
    <View style={styles.dashRow}>
      {DASHES.map(i => (
        <View key={i} style={[styles.dash, { backgroundColor: color }]} />
      ))}
    </View>
  </View>
);

/** Trip ID value with a copy button (Clipboard + flash-checkmark). */
const CopyableTripId: React.FC<{ value: string }> = ({ value }) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const onCopy = useCallback(() => {
    Clipboard.setString(value);
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
  }, [value]);

  return (
    <View style={styles.idValueRow}>
      <Text style={styles.idValue} numberOfLines={1}>
        {value}
      </Text>
      <Pressable
        onPress={onCopy}
        hitSlop={10}
        style={({ pressed }) => [styles.copyBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Copy trip ID ${value}`}
      >
        {copied ? (
          <Check size={15} color={Colors.success} strokeWidth={2.75} />
        ) : (
          <Copy size={15} color={Colors.textSecondary} strokeWidth={2} />
        )}
      </Pressable>
      {copied ? <Text style={styles.copiedText}>Copied</Text> : null}
    </View>
  );
};

/* ================================================================
 * TripDetailsCard
 * ================================================================ */

type Props = {
  detail: CustomerBookingDetail;
  /** Progress tracker shown at the bottom of the card. */
  tracker: React.ReactNode;
  /** Optional element on the right of the Trip ID (e.g. Book Again). */
  idAction?: React.ReactNode;
};

export const TripDetailsCard: React.FC<Props> = ({
  detail,
  tracker,
  idAction,
}) => {
  const { Icon: TripTypeIcon, label: tripTypeLabel } = getTripTypeOption(
    detail.tripType,
  );
  const stops = detail.itinerary;
  const lastIndex = stops.length - 1;
  const stayNights = nightsBetween(detail.travelDate, detail.endDate);
  const returnTime = detail.returnPickupTime;

  return (
    <View style={styles.card}>
      {/* ── Header: icon + title + trip-type badge ── */}
      <View style={styles.headerRow}>
        <View style={styles.iconTile}>
          <MapPin size={18} color={Colors.primary} strokeWidth={2.25} />
        </View>
        <Text style={styles.headerTitle}>Trip Details</Text>
        <View style={styles.tripTypeBadge}>
          <TripTypeIcon
            size={13}
            color={Colors.primaryDark}
            strokeWidth={2.5}
          />
          <Text style={styles.tripTypeBadgeText} numberOfLines={1}>
            {tripTypeLabel}
          </Text>
        </View>
      </View>

      {/* ── Trip ID (plain label + bold id + copy) ── */}
      <View style={styles.idRow}>
        <View style={styles.idBlock}>
          <Text style={styles.smallLabel}>Trip ID</Text>
          <CopyableTripId value={detail.tripNumber} />
        </View>
        {idAction}
      </View>

      <View style={styles.divider} />

      {/* ── Travel dates: start → end ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Travel Dates</Text>
        <View style={styles.datesPanel}>
          <View style={styles.dateCol}>
            <Text style={styles.dateCaption}>Start</Text>
            <Text style={styles.dateValue} numberOfLines={1}>
              {formatTripDate(detail.travelDate)}
            </Text>
          </View>
          <View style={styles.durationCol}>
            <DashedLine color={Colors.primaryLight} />
            <View style={styles.durationPill}>
              <Text style={styles.durationText}>
                {formatDuration(detail.travelDate, detail.endDate)}
              </Text>
            </View>
            <DashedLine color={Colors.primaryLight} />
          </View>
          <View style={[styles.dateCol, styles.dateColEnd]}>
            <Text style={styles.dateCaption}>End</Text>
            <Text style={styles.dateValue} numberOfLines={1}>
              {formatTripDate(detail.endDate)}
            </Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          {returnTime ? (
            <>
              <View style={styles.metaItem}>
                <Clock size={15} color={Colors.textSecondary} strokeWidth={2} />
                <Text style={styles.metaText}>
                  <Text style={styles.metaPrefix}>Onward </Text>
                  {detail.pickupTime}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Clock size={15} color={Colors.textSecondary} strokeWidth={2} />
                <Text style={styles.metaText}>
                  <Text style={styles.metaPrefix}>Return </Text>
                  {returnTime}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.metaItem}>
              <Clock size={15} color={Colors.textSecondary} strokeWidth={2} />
              <Text style={styles.metaText}>{detail.pickupTime}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Users size={15} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.metaText}>{detail.passengers} Passengers</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* ── Full travel itinerary (scrolls sideways) ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeadRow}>
          <Text style={styles.sectionLabel}>Travel Itinerary</Text>
          <View style={styles.metaItem}>
            <Route size={14} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.stopCount}>
              {stops.length} {stops.length === 1 ? 'stop' : 'stops'}
            </Text>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.stopsScroller}
          contentContainerStyle={styles.stopsContent}
        >
          {stops.map((stop, i) => {
            const isLast = i === lastIndex;
            return (
              <View
                key={`${stop.city}-${i}`}
                style={styles.stopCol}
                accessible
                accessibilityLabel={`Stop ${i + 1}: ${stop.city}${
                  stop.place ? `, ${stop.place}` : ''
                }${stop.stay ? `, stay ${stayNights} nights` : ''}`}
              >
                <View style={styles.stopDotRow}>
                  <View
                    style={[styles.stopHalo, isLast && styles.stopHaloLast]}
                  >
                    <View
                      style={[styles.stopDot, isLast && styles.stopDotLast]}
                    />
                  </View>
                  {!isLast ? (
                    <View style={styles.stopConnector}>
                      <DashedLine color={Colors.primaryLight} />
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[styles.stopCity, isLast && styles.stopCityLast]}
                  numberOfLines={1}
                >
                  {stop.city}
                </Text>
                {stop.place ? (
                  <Text style={styles.stopPlace} numberOfLines={2}>
                    {stop.place}
                  </Text>
                ) : null}
                {stop.stay && stayNights > 0 ? (
                  <View style={styles.stayTag}>
                    <BedDouble size={12} color={STAY_FG} strokeWidth={2.25} />
                    <Text style={styles.stayTagText}>
                      Stay · {stayNights}{' '}
                      {stayNights === 1 ? 'night' : 'nights'}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.divider} />

      {tracker}
    </View>
  );
};

/* ================================================================
 * Styles
 * ================================================================ */

const HALO = 20;
const DOT = 12;
/** Stay tag colours — blue, so it reads apart from the green route. */
const STAY_BG = '#EFF6FF';
const STAY_FG = '#1D4ED8';

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
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  pressed: {
    opacity: 0.6,
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 20,
  },
  tripTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 130,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryTint,
  },
  tripTypeBadgeText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.primaryDark,
  },

  /* Trip ID */
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  idBlock: {
    flex: 1,
    gap: 2,
  },
  smallLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    includeFontPadding: false,
  },
  idValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  idValue: {
    flexShrink: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  copyBtn: {
    padding: 2,
  },
  copiedText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: '600',
  },

  /* Sections */
  section: {
    gap: 10,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  /* Travel dates */
  datesPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    backgroundColor: '#F6FBF7',
    borderWidth: 1,
    borderColor: '#E3F2E6',
  },
  dateCol: {
    gap: 2,
    flexShrink: 1,
  },
  dateColEnd: {
    alignItems: 'flex-end',
  },
  dateCaption: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  dateValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 15,
  },
  durationCol: {
    flex: 1,
    minWidth: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  durationText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 18,
    rowGap: Spacing.sm,
    paddingHorizontal: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  metaPrefix: {
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  stopCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  /* Dashed line */
  dashedLine: {
    flex: 1,
    height: 2,
    overflow: 'hidden',
  },
  dashRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    gap: 3,
  },
  dash: {
    width: 5,
    height: 2,
    borderRadius: 1,
  },

  /* Itinerary */
  stopsScroller: {
    // Bleed to the card edges so stops scroll under the padding.
    marginHorizontal: -Spacing.md,
  },
  stopsContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
  },
  stopCol: {
    // 3 stops × 96 + padding fits a 360 dp phone; more stops scroll.
    flexGrow: 1,
    flexBasis: 96,
    minWidth: 96,
    gap: 6,
  },
  stopDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: HALO,
  },
  stopHalo: {
    width: HALO,
    height: HALO,
    borderRadius: HALO / 2,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopHaloLast: {
    backgroundColor: Colors.errorTint,
  },
  stopDot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: Colors.primary,
  },
  stopDotLast: {
    backgroundColor: Colors.error,
  },
  stopConnector: {
    flex: 1,
    flexDirection: 'row',
    marginHorizontal: 6,
  },
  stopCity: {
    ...Typography.bodySmall,
    color: Colors.primaryDark,
    fontWeight: '700',
    paddingRight: Spacing.sm,
  },
  stopCityLast: {
    color: Colors.error,
  },
  stopPlace: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 16,
    paddingRight: 10,
  },
  stayTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: STAY_BG,
  },
  stayTagText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: STAY_FG,
  },
});