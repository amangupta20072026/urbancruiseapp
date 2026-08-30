/**
 * ------------------------------------------------------------------
 * RequestQuotationCard
 * ------------------------------------------------------------------
 * Hero card shown when the customer has NO active quotation AND no
 * upcoming trip — i.e. the fresh / idle state.
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │  ┌──┐   Plan your next journey                       │
 *   │  │📄│   Tell us your travel plan and our team will   │
 *   │  └──┘   prepare the best options for you.            │
 *   │                                                      │
 *   │              [ Request a Quotation ]                 │
 *   └──────────────────────────────────────────────────────┘
 *
 * CTA is a full-width row below the copy so the button has a proper
 * hit target and the copy has room to breathe.
 * ------------------------------------------------------------------ */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FileSearch } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

type Props = {
  onRequestPress: () => void;
};

export const RequestQuotationCard: React.FC<Props> = ({ onRequestPress }) => (
  <View style={styles.card}>
    <View style={styles.top}>
      <View style={styles.iconWrap}>
        <FileSearch size={24} color={Colors.primary} strokeWidth={2} />
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          Plan your next journey
        </Text>
        <Text style={styles.subtitle}>
          Tell us your travel plan and our team will prepare the best options
          for you.
        </Text>
      </View>
    </View>

    <Pressable
      onPress={onRequestPress}
      accessibilityRole="button"
      accessibilityLabel="Request a quotation"
      style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
    >
      <Text style={styles.ctaText}>Request a Quotation</Text>
    </Pressable>
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
    backgroundColor: '#EEF7EF',
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

  cta: {
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '800',
  },
  pressed: { opacity: 0.7 },
});
