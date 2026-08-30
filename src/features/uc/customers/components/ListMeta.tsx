import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '@theme';

type Props = {
  loadedCount: number;
  total: number;
};

/**
 * Replaces the old "Page X of Y" footer text as the scale indicator.
 * Sits above the list instead of below it, since with infinite
 * scroll there's no fixed bottom to anchor a count to.
 */
export const ListMeta: React.FC<Props> = ({ loadedCount, total }) => (
  <View style={styles.row}>
    <Text style={styles.text}>
      Showing {loadedCount.toLocaleString('en-IN')} of{' '}
      {total.toLocaleString('en-IN')} customers
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
