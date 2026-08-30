import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Filter, ChevronLeft } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@theme';

type Props = {
  onBack: () => void;
  onFilter: () => void;
  filterBadgeCount?: number;
};

export const CustomerListHeader: React.FC<Props> = ({
  onBack,
  onFilter,
  filterBadgeCount,
}) => (
  <View>
    <View style={styles.row}>
      <View style={styles.titleRow}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
          <ChevronLeft
            size={26}
            color={Colors.textPrimary}
            strokeWidth={2.25}
          />
        </Pressable>
        <Text style={styles.title}>Customers</Text>
      </View>
      <Pressable onPress={onFilter} hitSlop={12} style={styles.filterBtn}>
        <Filter size={18} color={Colors.iconPrimary} />
        {filterBadgeCount && filterBadgeCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{filterBadgeCount}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
    <Text style={styles.subtitle}>Manage and view registered customers.</Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    marginLeft: -Spacing.xs,
    marginRight: Spacing.xs,
    padding: Spacing.xs,
  },
  title: {
    ...Typography.h1,
    fontSize: 26,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  filterBtn: {
    padding: Spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
});