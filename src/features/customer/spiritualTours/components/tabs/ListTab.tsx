/**
 * ListTab — the shared body of Inclusions and Exclusions.
 *
 * NO DESIGN EXISTS FOR EITHER TAB. They are the same shape — a
 * heading and a marked list — so they are one component with the
 * mark and tint passed in, rather than two files that would drift
 * apart. Inclusions tick in green, exclusions cross in red.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, XCircle } from 'lucide-react-native';

import { Colors, Spacing, Typography } from '@theme';
import { SectionHeading, TabEmpty } from './TabPieces';

type Props = {
  items: string[];
  variant: 'included' | 'excluded';
};

const CONFIG = {
  included: {
    heading: "What's Included",
    empty: 'The list of inclusions is being prepared.',
    color: Colors.success,
  },
  excluded: {
    heading: "What's Not Included",
    empty: 'The list of exclusions is being prepared.',
    color: Colors.error,
  },
} as const;

export const ListTab: React.FC<Props> = ({ items, variant }) => {
  const config = CONFIG[variant];
  const Mark = variant === 'included' ? CheckCircle2 : XCircle;

  if (items.length === 0) return <TabEmpty message={config.empty} />;

  return (
    <View>
      <SectionHeading title={config.heading} />

      <View style={styles.list}>
        {items.map(item => (
          <View key={item} style={styles.row}>
            <Mark size={20} color={config.color} strokeWidth={2.2} />
            <Text style={styles.item} maxFontSizeMultiplier={1.6}>
              {item}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  item: {
    ...Typography.body,
    flex: 1,
    lineHeight: 21,
    color: Colors.textPrimary,
  },
});
