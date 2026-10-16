/**
 * ------------------------------------------------------------------
 * QuotationTripCard — the "Trip Details" card on Quotation Details
 * ------------------------------------------------------------------
 * Same design language as the booking `TripDetailsCard`, so a
 * quotation and the booking it turns into read the same way:
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ [📍] Trip Details                          [✈ One Way]   │
 *   │ Passengers                                               │
 *   │ 👥 2 Passengers                                          │
 *   │ Trip starts                                  Trip ends   │
 *   │ 5 Oct 2026 · 09:00 AM            7 Oct 2026 · 08:30 PM   │
 *   │ 📍 Rajiv Gandhi                  📍 Rajiv Gandhi          │
 *   │    International Airport      International Airport   │
 *   │ ──────────────────────────────────────────────────────── │
 *   │ TRAVEL DATES                                             │
 *   │ ┌ Start ─────────── ┄┄ [5 Days] ┄┄ ─────────── End ┐     │
 *   │ │ 10 Sept 2026                        14 Sept 2026 │     │
 *   │ │            (Pickup & Drop only) 🛏 + 3 rest days  │     │
 *   │ └──────────────────────────────────────────────────┘     │
 *   │ ──────────────────────────────────────────────────────── │
 *   │ TRAVEL ITINERARY                              ⤳ 3 stops  │
 *   │ ●┄┄┄┄┄┄┄┄┄┄┄┄●┄┄┄┄┄┄┄┄┄┄┄┄●   ← scrolls sideways         │
 *   │ Bangalore     Mysore       Ooty                          │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Differences from the booking card:
 *   - No Trip ID — a quotation has no trip yet. Passengers take that
 *     row, shown as a total only (no adult / child split).
 *   - Under the passengers count, a start / end row: when + where
 *     the trip starts (left, brand green) and ends (right, red —
 *     the same colours as the first and last itinerary dots). The
 *     place is the first / last stop's address, always shown in
 *     full — it wraps onto as many lines as it needs. The two halves
 *     stay equal width; a longer address just makes its side taller.
 *   - No progress tracker — that is booking-only.
 *   - The day pill shows the quoted `days` (billed days). For pickup
 *     & drop that excludes rest days, which show as a small note
 *     under the pill (see utils/duration.ts).
 *
 * Each stop shows only its city; the address stays in the data and
 * is read out by screen readers, so 3 stops fit across the card and
 * 4+ scroll sideways with a peek of the next stop.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useState } from 'react';
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BedDouble, MapPin, Route, Users } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { getTripTypeOption } from '../tripTypeOptions';
import { formatDays, formatRestDays, hasRestDays } from '../utils/duration';
import type { CustomerQuotationDetail } from '../types';

/* ================================================================
 * Helpers
 * ================================================================ */

/** "2026-09-10" → UTC midnight, so the date ignores the device TZ. */
function isoDayToUtc(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** "2026-09-10" → "10 Sept 2026". */
function formatTripDate(iso: string): string {
  return new Date(isoDayToUtc(iso)).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatPassengerTotal(adults: number, children: number): string {
  const total = adults + children;
  return `${total} ${total === 1 ? 'Passenger' : 'Passengers'}`;
}

/* ================================================================
 * DashedLine
 * ================================================================
 * Row of short segments. RN's `borderStyle: 'dashed'` is unreliable
 * on a single side on Android. The dashes sit in an absolutely
 * positioned row so they never add to the measured width (inside the
 * horizontal itinerary ScrollView they would otherwise widen the
 * first stop and push the others off-screen).
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

/* ================================================================
 * TripPoint — one half of the start / end row
 * ================================================================
 * Caption, then date · time in the accent colour, then a pin + the
 * full place name, wrapping onto extra lines when needed (the pin
 * stays on the first line). Each half takes an equal share of the
 * row, so a long address on one side never squeezes the other.
 */
const TripPoint: React.FC<{
  caption: string;
  when: string;
  place: string;
  color: string;
  alignEnd?: boolean;
  accessibilityLabel: string;
}> = ({ caption, when, place, color, alignEnd, accessibilityLabel }) => (
  <View
    style={[styles.tripPoint, alignEnd && styles.tripPointEnd]}
    accessible
    accessibilityLabel={accessibilityLabel}
  >
    <Text style={styles.smallLabel}>{caption}</Text>
    {/* Shrinks slightly rather than cut the time off on narrow phones. */}
    <Text
      style={[styles.tripPointWhen, { color }]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.85}
    >
      {when}
    </Text>
    <View style={styles.tripPointPlaceRow}>
      <View style={styles.tripPointPin}>
        <MapPin size={12} color={Colors.textSecondary} strokeWidth={2} />
      </View>
      <Text
        style={[styles.tripPointPlace, alignEnd && styles.tripPointPlaceEnd]}
      >
        {place}
      </Text>
    </View>
  </View>
);

/* ================================================================
 * QuotationTripCard
 * ================================================================ */

type Props = {
  detail: CustomerQuotationDetail;
};

export const QuotationTripCard: React.FC<Props> = ({ detail }) => {
  const { Icon: TripTypeIcon, label: tripTypeLabel } = getTripTypeOption(
    detail.tripType,
  );
  const stops = detail.stopDetails;
  const lastIndex = stops.length - 1;
  const passengerTotal = formatPassengerTotal(detail.adults, detail.children);
  const pickupWhen = `${formatTripDate(detail.travelDateStart)} · ${
    detail.pickupTime
  }`;
  const pickupPlace = stops[0]?.address ?? '';
  const dropWhen = `${formatTripDate(detail.travelDateEnd)} · ${
    detail.dropTime
  }`;
  const dropPlace = stops[lastIndex]?.address ?? '';

  /* Stop column width comes from the scroller's measured width, never
     from the text inside it, so a long city can't stretch its column.
     Up to 3 stops share the card evenly; with more, 3 fit plus a peek
     of the next one so it's clear the row scrolls. */
  const [scrollerWidth, setScrollerWidth] = useState(0);
  const onScrollerLayout = useCallback((e: LayoutChangeEvent) => {
    setScrollerWidth(e.nativeEvent.layout.width);
  }, []);
  const visibleStops = stops.length <= 3 ? stops.length : 3.4;
  const stopWidth = scrollerWidth
    ? Math.max(
        MIN_STOP_WIDTH,
        (scrollerWidth - Spacing.md * 2) / Math.max(visibleStops, 1),
      )
    : MIN_STOP_WIDTH;

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

      {/* ── Passengers, then trip start (left) · trip end (right) ── */}
      <View style={styles.peopleAndTimes}>
        <View style={styles.passengersBlock} accessible>
          <Text style={styles.smallLabel}>Passengers</Text>
          <View style={styles.passengersRow}>
            <Users size={16} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.passengersText} numberOfLines={1}>
              {passengerTotal}
            </Text>
          </View>
        </View>

        <View style={styles.startEndRow}>
          <TripPoint
            caption="Trip starts"
            when={pickupWhen}
            place={pickupPlace}
            color={Colors.primaryDark}
            accessibilityLabel={`Trip starts ${pickupWhen}, ${pickupPlace}`}
          />
          <TripPoint
            caption="Trip ends"
            when={dropWhen}
            place={dropPlace}
            color={Colors.error}
            alignEnd
            accessibilityLabel={`Trip ends ${dropWhen}, ${dropPlace}`}
          />
        </View>
      </View>

      <View style={styles.divider} />

      {/* ── Travel dates: start → end ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Travel Dates</Text>
        <View style={styles.datesPanel}>
          <View style={styles.dateCol}>
            <Text style={styles.dateCaption}>Start</Text>
            <Text style={styles.dateValue} numberOfLines={1}>
              {formatTripDate(detail.travelDateStart)}
            </Text>
          </View>
          <View style={styles.durationCol}>
            <View style={styles.durationLine}>
              <DashedLine color={Colors.primaryLight} />
              <View style={styles.durationPill}>
                <Text style={styles.durationText}>
                  {formatDays(detail.days)}
                </Text>
              </View>
              <DashedLine color={Colors.primaryLight} />
            </View>
            {hasRestDays(detail.restDays) ? (
              <View style={styles.restRow}>
                <BedDouble
                  size={12}
                  color={Colors.textSecondary}
                  strokeWidth={2}
                />
                <Text style={styles.restText} numberOfLines={1}>
                  + {formatRestDays(detail.restDays).toLowerCase()}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.dateCol, styles.dateColEnd]}>
            <Text style={styles.dateCaption}>End</Text>
            <Text style={styles.dateValue} numberOfLines={1}>
              {formatTripDate(detail.travelDateEnd)}
            </Text>
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
          onLayout={onScrollerLayout}
        >
          {stops.map((stop, i) => {
            const isLast = i === lastIndex;
            return (
              <View
                key={`${stop.city}-${i}`}
                style={[styles.stopCol, { width: stopWidth }]}
                accessible
                accessibilityLabel={`Stop ${i + 1}: ${stop.city}, ${
                  stop.address
                }`}
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
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

/* ================================================================
 * Styles — values mirror the booking TripDetailsCard
 * ================================================================ */

const HALO = 20;
/** Narrowest a stop column gets (very small screens). */
const MIN_STOP_WIDTH = 88;
const DOT = 12;

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

  /* Passengers + start / end */
  peopleAndTimes: {
    gap: 10,
  },
  passengersBlock: {
    gap: 2,
  },
  smallLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    includeFontPadding: false,
  },
  startEndRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  tripPoint: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  tripPointEnd: {
    alignItems: 'flex-end',
  },
  tripPointWhen: {
    ...Typography.bodySmall,
    fontWeight: '800',
  },
  tripPointPlaceRow: {
    flexDirection: 'row',
    // Pin sits on the first line of a wrapped address.
    alignItems: 'flex-start',
    gap: 3,
    maxWidth: '100%',
  },
  tripPointPlace: {
    flexShrink: 1,
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  tripPointPlaceEnd: {
    textAlign: 'right',
  },
  tripPointPin: {
    // Centre the 12 px pin on the first text line.
    marginTop: 2,
  },

  passengersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  passengersText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
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
    alignItems: 'center',
    gap: 4,
  },
  durationLine: {
    alignSelf: 'stretch',
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
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  restText: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
  },
  stopCol: {
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
});
