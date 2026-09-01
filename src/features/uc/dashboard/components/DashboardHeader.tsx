import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@theme';

/**
 * DashboardHeader — matches the reference mock:
 *   [logo]  URBAN CRUISE                       [🔔]  [avatar]
 *           VEHICLE RENTAL SERVICE
 *
 * Logo & avatar reuse existing assets shipped in src/assets/images.
 */
type Props = {
  onBellPress?: () => void;
  onAvatarPress?: () => void;
  hasUnread?: boolean;
};

export const DashboardHeader: React.FC<Props> = ({
  onBellPress,
  onAvatarPress,
  hasUnread,
}) => (
  <View style={styles.row}>
    <Image
      source={require('@assets/images/ucwithdesignandtext.png')}
      style={styles.logo}
      resizeMode="contain"
    />
    <View style={styles.brandCol}>
      <Text style={styles.brand}>URBAN CRUISE</Text>
      <Text style={styles.brandSub}>VEHICLE RENTAL SERVICE</Text>
    </View>

    <Pressable
      onPress={onBellPress}
      hitSlop={12}
      style={styles.bellWrap}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
    >
      <View style={styles.bellCircle}>
        <Bell size={18} color={Colors.textPrimary} />
      </View>
      {hasUnread ? <View style={styles.dot} /> : null}
    </Pressable>

    <Pressable
      onPress={onAvatarPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Profile"
    >
      <View style={styles.avatarWrap}>
        <Image
          source={require('@assets/images/default-avatar.png')}
          style={styles.avatar}
        />
        <View style={styles.avatarPresence} />
      </View>
    </Pressable>
  </View>
);

const AVATAR = 36;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  logo: {
    width: 34,
    height: 34,
  },
  brandCol: {
    flex: 1,
    marginLeft: 2,
  },
  brand: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginTop: 1,
  },

  bellWrap: {
    padding: 2,
  },
  bellCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.error,
    borderWidth: 2,
    borderColor: Colors.background,
  },

  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: Colors.borderLight,
  },
  avatarPresence: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: Colors.background,
  },
});
