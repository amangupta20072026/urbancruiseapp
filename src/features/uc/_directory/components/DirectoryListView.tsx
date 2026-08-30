/**
 * ------------------------------------------------------------------
 * DirectoryListView<T> — Shared list body
 * ------------------------------------------------------------------
 * Wraps a FlashList with pull-to-refresh, infinite scroll, empty
 * state, and error view. Every Directory tab (customers, vendors,
 * staff, drivers) renders this same component with:
 *   - its own DirectoryListState<T>  (from its own hook)
 *   - its own renderItem              (its own Card)
 *   - its own empty-state copy
 *
 * Why extract this: three of the four tabs would otherwise duplicate
 * ~40 lines of identical FlashList/RefreshControl/EmptyState wiring.
 * The one place where tabs actually differ (row layout, contact
 * sheet) stays in each domain — this file has no per-domain code.
 * ------------------------------------------------------------------
 */

import React, { useCallback } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';

import { Colors, Spacing } from '@theme';
import { EmptyState, ErrorView } from '@shared/components';

import { ListFooterLoader } from './ListFooterLoader';
import { ListMeta } from './ListMeta';
import type { DirectoryListState } from '../types';

type Props<T> = {
  /** Any hook-return object matching the shared shape. */
  state: DirectoryListState<T>;
  /** Row renderer — usually the domain's <XxxCard />. */
  renderItem: ListRenderItem<T>;
  /** Stable key extractor — usually `item => item.id`. */
  keyExtractor: (item: T) => string;
  /** Empty-state copy — domain-specific. */
  emptyTitle: string;
  emptyMessage: string;
  /** Optional word used in ListMeta ("Showing X of Y <label>"). */
  countLabel: string;
};

/**
 * Generic list body. `T` is inferred from `state`.
 *
 * Note: FlashList doesn't need `estimatedItemSize` in v2 (auto-sized),
 * so the wrapper stays domain-agnostic.
 */
export function DirectoryListView<T>({
  state,
  renderItem,
  keyExtractor,
  emptyTitle,
  emptyMessage,
  countLabel,
}: Props<T>): React.ReactElement {
  const {
    data,
    total,
    isLoading,
    isRefreshing,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
    refresh,
  } = state;

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (error) {
    return <ErrorView onRetry={refetch} />;
  }

  if (!isLoading && data.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <View style={styles.container}>
      {!isLoading && data.length > 0 && (
        <View style={styles.metaWrap}>
          <ListMeta
            loadedCount={data.length}
            total={total}
            label={countLabel}
          />
        </View>
      )}
      <FlashList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={Colors.primary}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          <ListFooterLoader
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={!!hasNextPage}
            hasItems={data.length > 0}
            label={countLabel}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  metaWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
});