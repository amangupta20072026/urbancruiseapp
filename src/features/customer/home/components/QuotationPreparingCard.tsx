/**
 * ------------------------------------------------------------------
 * QuotationPreparingCard
 * ------------------------------------------------------------------
 * Hero card shown when the customer has an active quotation whose
 * status is `in_progress` — i.e. we've accepted their request and
 * the ops team is preparing options, but there's nothing to review
 * yet.
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │  ┌──┐   Your quotation is being prepared            │
 *   │  │ ⌛│   Our team is working on your travel options. │
 *   │  └──┘                                                │
 *   │              [ • • •  loading strip ]                │
 *   └──────────────────────────────────────────────────────┘
 *
 * No CTA — there's nothing actionable for the user yet. Setting an
 * "in progress" affordance would be a dark pattern (they'd tap
 * expecting content and see nothing new). A subtle animated dot
 * strip communicates "we're on it" instead.
 * ------------------------------------------------------------------ */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Clock } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

export const QuotationPreparingCard: React.FC = () => (
  <View
    style={styles.card}
    accessibilityRole="summary"
    accessibilityLabel="Your quotation is being prepared"
  >
    <View style={styles.top}>
      <View style={styles.iconWrap}>
        <Clock size={24} color={Colors.warning} strokeWidth={2} />
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          Your quotation is being prepared
        </Text>
        <Text style={styles.subtitle}>
          Our team is working on your travel options.
        </Text>
      </View>
    </View>

    {/* Progress affordance — three pulsing dots via opacity variation.
        Kept static (no Animated) for now; upgrade to Reanimated when
        we standardise on a shimmer pattern for the app. */}
    <View style={styles.dots}>
      <View style={[styles.dot, styles.dotStrong]} />
      <View style={[styles.dot, styles.dotMedium]} />
      <View style={[styles.dot, styles.dotSoft]} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.lg,
    ...Shadows.xs,
  },

  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },

  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.circle,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  dots: {
    flexDirection: 'row',
    gap: 6,
    alignSelf: 'center',
    paddingVertical: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
  },
  dotStrong: { opacity: 1 },
  dotMedium: { opacity: 0.55 },
  dotSoft: { opacity: 0.25 },
});
