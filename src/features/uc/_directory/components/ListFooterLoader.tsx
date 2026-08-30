import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '@theme';

type Props = {
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  hasItems: boolean;
  /** Entity noun for the loading message — "customers", "vendors", etc. */
  label: string;
};

/**
 * Infinite-scroll footer. Renders a spinner while loading, an
 * end-of-list message when there are no more pages, and nothing
 * otherwise. Generalised from the customers-specific version so all
 * four Directory tabs share one component.
 */
export const ListFooterLoader: React.FC<Props> = ({
  isFetchingNextPage,
  hasNextPage,
  hasItems,
  label,
}) => {
  if (isFetchingNextPage) {
    return (
      <View style={styles.row}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.text}>Loading more {label}…</Text>
      </View>
    );
  }

  if (!hasNextPage && hasItems) {
    return (
      <View style={styles.row}>
        <Text style={styles.endText}>You&apos;ve reached the end</Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  text: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  endText: {
    ...Typography.body,
    color: Colors.textMuted,
  },
});
