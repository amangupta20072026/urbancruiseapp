/**
 * ------------------------------------------------------------------
 * Section bodies — what a TourSectionSheet shows, by section kind
 * ------------------------------------------------------------------
 *   itinerary  timeline: dot, connector, day label, title, detail
 *   list       marked list: tick (green), cross (red) or dot
 *   pricing    label / amount rows, optional note, and a standing
 *              "indicative" disclaimer
 *   text       one paragraph
 *   (empty)    "Details coming soon" + the section's emptyText, or
 *              the app's default line
 *
 * Content is printed exactly as the catalog sends it. Pricing in
 * particular is never parsed or formatted: "₹24,500 onwards" and
 * "₹24,500" are both just strings.
 * ------------------------------------------------------------------ */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CircleCheck, CircleX, Clock } from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';
import type {
  SpiritualTourInfoSection,
  SpiritualTourItineraryDay,
  SpiritualTourPrice,
} from '../types';

/* ---------------- Empty ---------------- */

const DEFAULT_EMPTY_TEXT =
  'Talk to a travel advisor for the details of this tour.';

/** True when the section has nothing to show yet. */
export function isSectionEmpty(section: SpiritualTourInfoSection): boolean {
  switch (section.kind) {
    case 'itinerary':
      return section.days.length === 0;
    case 'list':
      return section.items.length === 0;
    case 'pricing':
      return section.rows.length === 0;
    case 'text':
      return section.body === null;
  }
}

export const SectionEmpty: React.FC<{ text: string | null }> = ({ text }) => (
  <View style={styles.empty}>
    <Clock size={28} color={Colors.textSecondary} strokeWidth={2} />
    <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.4}>
      Details coming soon
    </Text>
    <Text style={styles.emptyText} maxFontSizeMultiplier={1.5}>
      {text ?? DEFAULT_EMPTY_TEXT}
    </Text>
  </View>
);

/* ---------------- Itinerary ---------------- */

export const ItineraryBody: React.FC<{
  days: readonly SpiritualTourItineraryDay[];
}> = ({ days }) => (
  <View>
    {days.map((day, index) => {
      const isLast = index === days.length - 1;

      return (
        <View key={`${day.dayLabel}-${index}`} style={styles.dayRow}>
          {/* Marker column: dot, then a connector to the next day. */}
          <View style={styles.markerColumn}>
            <View style={styles.dot} />
            {isLast ? null : <View style={styles.connector} />}
          </View>

          <View style={[styles.dayCopy, isLast && styles.dayCopyLast]}>
            <Text style={styles.dayLabel}>{day.dayLabel}</Text>
            <Text style={styles.dayTitle} maxFontSizeMultiplier={1.6}>
              {day.title}
            </Text>
            {day.detail ? (
              <Text style={styles.dayDetail} maxFontSizeMultiplier={1.6}>
                {day.detail}
              </Text>
            ) : null}
          </View>
        </View>
      );
    })}
  </View>
);

/* ---------------- List ---------------- */

export const ListBody: React.FC<{
  items: readonly string[];
  marker: 'check' | 'cross' | 'dot';
}> = ({ items, marker }) => (
  <View style={styles.list}>
    {items.map((item, index) => (
      <View key={`${item}-${index}`} style={styles.listRow}>
        <View
          style={styles.markWrap}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {marker === 'check' ? (
            <CircleCheck size={20} color={Colors.success} strokeWidth={2.2} />
          ) : marker === 'cross' ? (
            <CircleX size={20} color={Colors.error} strokeWidth={2.2} />
          ) : (
            <View style={styles.bullet} />
          )}
        </View>
        <Text style={styles.listItem} maxFontSizeMultiplier={1.6}>
          {item}
        </Text>
      </View>
    ))}
  </View>
);

/* ---------------- Pricing ---------------- */

export const PricingBody: React.FC<{
  rows: readonly SpiritualTourPrice[];
  note: string | null;
}> = ({ rows, note }) => (
  <View>
    <View style={styles.priceRows}>
      {rows.map((row, index) => (
        <View
          key={`${row.label}-${index}`}
          style={[styles.priceRow, index > 0 && styles.priceRowDivided]}
          accessible
          accessibilityLabel={`${row.label}, ${row.amount}`}
        >
          <View style={styles.priceCopy}>
            <Text style={styles.priceLabel} maxFontSizeMultiplier={1.5}>
              {row.label}
            </Text>
            {row.note ? <Text style={styles.priceNote}>{row.note}</Text> : null}
          </View>
          <Text style={styles.amount} maxFontSizeMultiplier={1.4}>
            {row.amount}
          </Text>
        </View>
      ))}
    </View>

    {note ? <Text style={styles.pricingNote}>{note}</Text> : null}

    {/* A price read as a quote and then changed at booking ends in a
        complaint, so the sheet always says who confirms the figure. */}
    <Text style={styles.disclaimer}>
      These figures are indicative. Your final price depends on dates, group
      size and vehicle, and is confirmed by our team on your quotation.
    </Text>
  </View>
);

/* ---------------- Text ---------------- */

export const TextBody: React.FC<{ body: string }> = ({ body }) => (
  <Text style={styles.text} maxFontSizeMultiplier={1.6}>
    {body}
  </Text>
);

/* ---------------- Any section ---------------- */

export const SectionBody: React.FC<{ section: SpiritualTourInfoSection }> = ({
  section,
}) => {
  if (isSectionEmpty(section)) {
    return <SectionEmpty text={section.emptyText} />;
  }

  switch (section.kind) {
    case 'itinerary':
      return <ItineraryBody days={section.days} />;
    case 'list':
      return <ListBody items={section.items} marker={section.marker} />;
    case 'pricing':
      return <PricingBody rows={section.rows} note={section.note} />;
    case 'text':
      return section.body ? <TextBody body={section.body} /> : null;
  }
};

const styles = StyleSheet.create({
  /* Empty */
  empty: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.subtitle,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptyText: {
    ...Typography.bodySmall,
    lineHeight: 20,
    textAlign: 'center',
    color: Colors.textSecondary,
  },

  /* Itinerary */
  dayRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  markerColumn: {
    alignItems: 'center',
    width: 16,
  },
  dot: {
    width: 12,
    height: 12,
    marginTop: Spacing.xs,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primaryDark,
  },
  connector: {
    flex: 1,
    width: 2,
    marginTop: Spacing.xs,
    backgroundColor: Colors.primaryLight,
  },
  dayCopy: {
    flex: 1,
    paddingBottom: Spacing.xl,
    gap: Spacing.xxs,
  },
  dayCopyLast: {
    paddingBottom: 0,
  },
  dayLabel: {
    ...Typography.caption,
    fontSize: 12,
    letterSpacing: 0.4,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  dayTitle: {
    ...Typography.subtitle,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dayDetail: {
    ...Typography.bodySmall,
    marginTop: Spacing.xxs,
    lineHeight: 20,
    color: Colors.textSecondary,
  },

  /* List */
  list: {
    gap: Spacing.md,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  markWrap: {
    width: 20,
    height: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bullet: {
    width: 7,
    height: 7,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primaryDark,
  },
  listItem: {
    ...Typography.body,
    flex: 1,
    lineHeight: 21,
    color: Colors.textPrimary,
  },

  /* Pricing */
  priceRows: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryWash,
    overflow: 'hidden',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  priceRowDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.primaryLight,
  },
  priceCopy: {
    flex: 1,
  },
  priceLabel: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  priceNote: {
    ...Typography.caption,
    marginTop: Spacing.xxs,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  amount: {
    ...Typography.title,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  pricingNote: {
    ...Typography.bodySmall,
    marginTop: Spacing.md,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  disclaimer: {
    ...Typography.caption,
    marginTop: Spacing.md,
    lineHeight: 17,
    color: Colors.textTertiary,
  },

  /* Text */
  text: {
    ...Typography.body,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
});
