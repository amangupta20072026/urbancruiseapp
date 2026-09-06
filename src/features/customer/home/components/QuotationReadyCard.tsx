/**
 * ------------------------------------------------------------------
 * QuotationReadyCard
 * ------------------------------------------------------------------
 * Primary hero card on the Home screen when the customer has an
 * active quotation:
 *
 *   ┌────────────────────────────────────────────────────────┐
 *   │  [QUOTATION READY]                                      │
 *   │  Your quotation is ready!                               │
 *   │  Prepared by Urban Cruise team                          │
 *   │                                                          │
 *   │  Delhi → Jaipur                                          │
 *   │  📅 12 May 2026 · 3 Options                             │
 *   │  [ Review Quotation  › ]                                │
 *   └────────────────────────────────────────────────────────┘
 *
 * The two content states (`ready` vs `in_progress`) share layout and
 * differ only in copy + CTA affordance. Splitting them into two
 * components would triple the surface area for a subtle variation.
 * ------------------------------------------------------------------ */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, ChevronRight, ArrowRight } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { QUOTATION_STATUS_LABEL, type QuotationSummary } from '../types';

type Props = {
  quotation: QuotationSummary;
  onReviewPress: () => void;
};

/* ------------------------------------------------------------------ */
/* Formatters                                                         */
/* ------------------------------------------------------------------ */

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export const QuotationReadyCard: React.FC<Props> = ({
  quotation,
  onReviewPress,
}) => {
  const isReady = quotation.status === 'ready';

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        {/* Status chip */}
        <View
          style={[
            styles.chip,
            isReady ? styles.chipReady : styles.chipInProgress,
          ]}
        >
          <Text
            style={[
              styles.chipText,
              isReady ? styles.chipTextReady : styles.chipTextInProgress,
            ]}
          >
            {QUOTATION_STATUS_LABEL[quotation.status].toUpperCase()}
          </Text>
        </View>

        {/* Headline */}
        <Text style={styles.headline} numberOfLines={2}>
          {isReady
            ? 'Your quotation is ready!'
            : 'Your quotation is being prepared'}
        </Text>
        <Text style={styles.subheadline} numberOfLines={1}>
          Prepared by Urban Cruise team
        </Text>

        {/* Route */}
        <View style={styles.routeRow}>
          <Text style={styles.city} numberOfLines={1}>
            {quotation.fromCity}
          </Text>
          <View style={styles.arrowWrap}>
            <ArrowRight size={16} color={Colors.success} strokeWidth={2.4} />
          </View>
          <Text style={styles.city} numberOfLines={1}>
            {quotation.toCity}
          </Text>
        </View>

        {/* Meta strip */}
        <View style={styles.metaRow}>
          <Calendar size={14} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.metaText} numberOfLines={1}>
            {fmtDate(quotation.travelDate)}
          </Text>
          <View style={styles.metaDot} />
          <Text style={styles.metaText} numberOfLines={1}>
            {quotation.optionsCount} Options
          </Text>
        </View>

        {/* CTA */}
        <Pressable
          onPress={onReviewPress}
          accessibilityRole="button"
          accessibilityLabel={
            isReady ? 'Review quotation' : 'View quotation progress'
          }
          disabled={!isReady}
          style={({ pressed }) => [
            styles.cta,
            !isReady && styles.ctaDisabled,
            pressed && isReady && styles.ctaPressed,
          ]}
        >
          <Text style={styles.ctaText}>
            {isReady ? 'Review Quotation' : 'In Progress'}
          </Text>
          {isReady ? (
            <ChevronRight
              size={18}
              color={Colors.textOnPrimary}
              strokeWidth={2.4}
            />
          ) : null}
        </Pressable>
      </View>
    </View>
  );
};

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    backgroundColor: '#F1F7F1', // soft primary tint background
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.xs,
  },
  content: {
    padding: Spacing.md,
  },

  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: Spacing.sm,
  },
  chipReady: { backgroundColor: '#DCFCE7' },
  chipInProgress: { backgroundColor: '#FEF3C7' },
  chipText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  chipTextReady: { color: Colors.success },
  chipTextInProgress: { color: Colors.warning },

  headline: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  subheadline: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.md,
  },

  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  city: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  arrowWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.lg,
  },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textTertiary,
    marginHorizontal: 2,
  },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    ...Shadows.xs,
  },
  ctaDisabled: {
    backgroundColor: Colors.buttonDisabled,
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    ...Typography.body,
    color: Colors.textOnPrimary,
    fontWeight: '800',
    fontSize: 15,
  },
});
