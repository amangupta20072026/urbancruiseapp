import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { Colors, Dimensions, Spacing, Typography } from '@theme';

type Props = {
  title: string;
  subtitle: string;
  onBellPress?: () => void;
  hasUnread?: boolean;
};

export const DashboardHeader: React.FC<Props> = ({
  title,
  subtitle,
  onBellPress,
  hasUnread,
}) => (
  <View style={styles.row}>
    <Image
      source={require('@assets/images/ucwithdesignandtext.png')}
      style={styles.logo}
      resizeMode="contain"
    />
    <View style={styles.textCol}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
    <Pressable onPress={onBellPress} hitSlop={12} style={styles.bell}>
      <Bell size={Dimensions.iconMd} color={Colors.iconPrimary} />
      {hasUnread ? <View style={styles.dot} /> : null}
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  logo: { width: 44, height: 44 },
  textCol: { flex: 1 },
  title: { ...Typography.h4, color: Colors.textPrimary },
  subtitle: { ...Typography.body, color: Colors.textSecondary },
  bell: { padding: Spacing.xs },
  dot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.background,
  },
});
