import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '@theme';

type Props = {
  loadedCount: number;
  total: number;
  /** Entity noun for the phrase — "customers", "vendors", etc. */
  label: string;
};

/**
 * "Showing X of Y <label>" row shown above every Directory tab's
 * FlashList. Generalised from the customers-specific ListMeta so all
 * four tabs share one component.
 */
export const ListMeta: React.FC<Props> = ({ loadedCount, total, label }) => (
  <View style={styles.row}>
    <Text style={styles.text}>
      Showing {loadedCount.toLocaleString('en-IN')} of{' '}
      {total.toLocaleString('en-IN')} {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    paddingBottom: Spacing.xs,
  },
  text: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
});
