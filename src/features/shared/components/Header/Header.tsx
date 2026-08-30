import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing } from '@theme';

type ActionItem = {
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
};

type Props = {
  title: string;
  showBack?: boolean;
  left?: React.ReactNode;
  actions?: ActionItem[];
};

export const Header: React.FC<Props> = ({
  title,
  showBack,
  left,
  actions = [],
}) => {
  const navigation = useNavigation();

  const renderLeft = () => {
    if (left) return left;
    if (showBack && navigation.canGoBack()) {
      return (
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.iconBtn}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
      );
    }
    return <View style={styles.iconPlaceholder} />;
  };

  return (
    <View style={styles.container}>
      <View style={styles.side}>{renderLeft()}</View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.side}>
        {actions.length === 0 ? (
          <View style={styles.iconPlaceholder} />
        ) : (
          <View style={styles.actionsRow}>
            {actions.map((a, i) => (
              <Pressable
                key={i}
                onPress={a.onPress}
                hitSlop={12}
                style={styles.iconBtn}
                accessibilityLabel={a.accessibilityLabel}
                accessibilityRole="button"
              >
                {a.icon}
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  side: { minWidth: 40, alignItems: 'center', justifyContent: 'center' },
  title: {
    flex: 1,
    textAlign: 'center',
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholder: { width: 40, height: 40 },
  backChevron: {
    fontSize: 32,
    lineHeight: 34,
    color: Colors.textPrimary,
    fontWeight: '300',
    marginTop: -2,
  },
  actionsRow: { flexDirection: 'row' },
});
