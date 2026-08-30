import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '@theme';

type Props = {
  /** Currently fetching the next batch. */
  isFetchingNextPage: boolean;
  /** No more batches left to fetch. */
  hasNextPage: boolean;
  /** List has at least one item loaded (hides the "end" message on empty lists). */
  hasItems: boolean;
};

/**
 * Footer for the infinite-scroll customer list. Replaces the old
 * Previous/Next "Page X of Y" control — at 1,00,000+ rows, paging by
 * number stops being useful navigation, so the list just keeps
 * loading the next batch as the user scrolls, and this footer only
 * ever communicates loading state, never a page count.
 */
export const ListFooterLoader: React.FC<Props> = ({
  isFetchingNextPage,
  hasNextPage,
  hasItems,
}) => {
  if (isFetchingNextPage) {
    return (
      <View style={styles.row}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.text}>Loading more customers…</Text>
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
