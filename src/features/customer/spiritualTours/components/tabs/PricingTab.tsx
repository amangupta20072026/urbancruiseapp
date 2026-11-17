/**
 * PricingTab — indicative prices.
 *
 * NO DESIGN EXISTS FOR THIS TAB, and no prices exist in the catalog
 * either: none were in any mockup, and inventing figures for real
 * money would be the worst mistake available on this screen. So the
 * tab ships empty, and the layout below is what appears once ops
 * fills `pricing` in.
 *
 * `amount` is printed exactly as ops writes it, currency symbol and
 * all. The app does no arithmetic, no formatting and no conversion:
 * a tour priced "₹24,500 onwards" and one priced "₹24,500" are both
 * just strings, and a number type here would quietly forbid the
 * first.
 *
 * The standing note under the rows is not optional copy. A price a
 * customer reads as a quote, and then finds changed at booking, is
 * the kind of thing that ends in a complaint — so the screen says
 * plainly that the team confirms the final figure.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';
import { SectionHeading, TabEmpty } from './TabPieces';
import type { SpiritualTourPrice } from '../../types';

type Props = {
  pricing: SpiritualTourPrice[];
  note: string | null;
};

export const PricingTab: React.FC<Props> = ({ pricing, note }) => {
  if (pricing.length === 0) {
    return (
      <TabEmpty message="Pricing for this journey is prepared for each group." />
    );
  }

  return (
    <View>
      <SectionHeading title="Indicative Pricing" />

      <View style={styles.rows}>
        {pricing.map(row => (
          <View
            key={row.label}
            style={styles.row}
            accessible
            accessibilityLabel={`${row.label}, ${row.amount}`}
          >
            <View style={styles.rowCopy}>
              <Text style={styles.label} maxFontSizeMultiplier={1.5}>
                {row.label}
              </Text>
              {row.note ? <Text style={styles.rowNote}>{row.note}</Text> : null}
            </View>

            <Text style={styles.amount} maxFontSizeMultiplier={1.4}>
              {row.amount}
            </Text>
          </View>
        ))}
      </View>

      {note ? <Text style={styles.note}>{note}</Text> : null}

      <Text style={styles.disclaimer}>
        These figures are indicative. Your final price depends on dates, group
        size and vehicle, and is confirmed by our team on your quotation.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  rows: {
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryWash,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.primaryLight,
  },
  rowCopy: {
    flex: 1,
  },
  label: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  rowNote: {
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
  note: {
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
});
