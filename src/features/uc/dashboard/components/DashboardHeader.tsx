import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { Colors, Spacing } from '@theme';

/**
 * DashboardHeader — matches the reference mock:
 *   [logo+wordmark image]                       [🔔]  [avatar]
 *
 * Logo — asset-padding workaround
 * --------------------------------
 * Uses `src/assets/icons/ucwithtext.png` — the SAME asset and
 * clip-window technique as the Customer Home header
 * (`features/customer/home/components/HomeHeader.tsx`), so the two
 * screens render an identical brand mark.
 *
 * The asset is a 2376×2091 canvas whose visible content (icon +
 * "Urban Cruise" wordmark) lives in rows 651–1776 only — the top
 * ~651px and bottom ~315px are transparent padding. A plain
 * `resizeMode="contain"` box would shrink-and-centre the whole
 * canvas, making the logo tiny with dead space around it.
 *
 * Fix — clip-window (identical math to HomeHeader):
 *   - Outer `<View>` is the visible box (110×60), `overflow: 'hidden'`.
 *   - Inner `<Image>` renders the full canvas aspect
 *     (110 × round(110 × 2091/2376) = 110 × 97).
 *   - `marginTop: -27` pushes the transparent top strip mostly above
 *     the clip window.
 *
 * Breathing-room fix (was: text looked "cut off" at the bottom):
 *   A perfectly tight crop shows the wordmark flush against the box
 *   edges — the source art has no built-in margin around the text,
 *   so an exact crop reads as clipped even though no pixel data is
 *   lost. Backing the window off by 4px on each side (top trim
 *   30→27, window height 52→60) reveals a sliver of the asset's own
 *   transparent padding, which reads as a normal margin. Both
 *   offsets stay inside the available padding, so nothing outside
 *   the canvas is exposed. See HomeHeader.tsx for the full derivation.
 *
 * `resizeMethod="scale"` (Android) forces bilinear scaling instead of
 * the default sample-then-scale path, which otherwise banded/
 * over-saturated the gradient when downscaling this asset's native
 * 2376×2091 canvas ~22x down to a ~110px header chip.
 *
 * The "VEHICLE RENTAL SERVICE" tagline was removed — logo only now.
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
    <View style={styles.brandClip}>
      <Image
        source={require('@assets/icons/ucwithtext.png')}
        style={styles.brandImage}
        resizeMode="contain"
        resizeMethod="scale"
        accessibilityRole="image"
        accessibilityLabel="Urban Cruise"
      />
    </View>

    <View style={styles.spacer} />

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
const BRAND_W = 110;
const IMG_H = 97;
const TOP_TRIM = 27;
const BRAND_H = 60;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  brandClip: {
    width: BRAND_W,
    height: BRAND_H,
    overflow: 'hidden',
  },
  brandImage: {
    width: BRAND_W,
    height: IMG_H,
    marginTop: -TOP_TRIM,
  },
  spacer: {
    flex: 1,
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
