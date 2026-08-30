/**
 * ------------------------------------------------------------------
 * HomeHeader
 * ------------------------------------------------------------------
 * Top row of the Customer Home screen.
 *
 *   [ucwithtext brand]                          [🔔•]  [avatar]
 *
 * Brand rendering — asset-padding workaround
 * -----------------------------------------
 * `src/assets/icons/ucwithtext.png` is a 2376×2091 canvas whose
 * VISIBLE content lives in rows 651–1776 only (the top ~651px and
 * bottom ~315px are transparent padding baked into the asset).
 *
 * If we render that asset with `resizeMode: 'contain'` in a
 * wide box, `contain` respects the CANVAS aspect (~1.14:1, nearly
 * square), so the logo shrinks and gets horizontally centred with
 * empty space on the left — it no longer aligns to the greeting
 * below, and it looks tiny.
 *
 * The fix is a clip-window:
 *   - Outer `<View>` is the visible box (110×52), with
 *     `overflow: 'hidden'`.
 *   - Inner `<Image>` renders at the FULL canvas aspect
 *     (110 × 97 = 110 × round(110 × 2091/2376)).
 *   - `marginTop: -30` pushes the transparent-top strip above the
 *     clip window (30 ≈ 651 × 110/2376 = 30.14).
 *   - The visible box now shows just the logo, flush left,
 *     filling top-to-bottom.
 *
 * If the source PNG is ever re-exported with the transparent
 * top/bottom trimmed off, drop the wrapper and go back to a plain
 * `<Image resizeMode="contain">` with the same 110×52 dims.
 * ------------------------------------------------------------------ */

import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing } from '@theme';

type Props = {
  displayName: string;
  /** Reserved — used once user-uploaded avatars land. */
  userId: string;
  /** Unread count for the bell badge. `0` hides the badge. */
  unreadCount: number;
  onNotificationsPress: () => void;
  onProfilePress: () => void;
};

const MAX_BADGE = 99;
const fmtBadge = (n: number): string =>
  n > MAX_BADGE ? `${MAX_BADGE}+` : String(n);

export const HomeHeader: React.FC<Props> = ({
  displayName,
  unreadCount,
  onNotificationsPress,
  onProfilePress,
}) => {
  const showBadge = unreadCount > 0;

  return (
    <View style={styles.row}>
      {/* Brand wordmark — tap-inert. See file header for clip math. */}
      <View style={styles.brandClip}>
        <Image
          source={require('@assets/icons/ucwithtext.png')}
          style={styles.brandImage}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="Urban Cruise"
        />
      </View>

      {/* Actions cluster */}
      <View style={styles.actions}>
        <Pressable
          onPress={onNotificationsPress}
          accessibilityRole="button"
          accessibilityLabel={
            showBadge ? `Notifications, ${unreadCount} unread` : 'Notifications'
          }
          hitSlop={6}
          style={({ pressed }) => [styles.bellChip, pressed && styles.pressed]}
        >
          <Bell size={22} color={Colors.textPrimary} strokeWidth={2} />
          {showBadge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{fmtBadge(unreadCount)}</Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          onPress={onProfilePress}
          accessibilityRole="button"
          accessibilityLabel={`Profile, ${displayName}`}
          hitSlop={4}
          style={({ pressed }) => [
            styles.avatarWrap,
            pressed && styles.pressed,
          ]}
        >
          <Image
            source={require('@assets/images/default-avatar.png')}
            style={styles.avatar}
            resizeMode="cover"
          />
          {/* Presence dot — static for v1, wired to real signal later. */}
          <View style={styles.onlineDot} />
        </Pressable>
      </View>
    </View>
  );
};

/* ---------------- Styles ---------------- */

const AVATAR = 40;
const CHIP = 40;

/* Brand clip-window numbers (see file header for derivation).
 * Keep these three in sync if you resize the logo:
 *
 *   BRAND_W          — visible width the box occupies in the header
 *   IMG_H            — full scaled canvas height = BRAND_W × (2091/2376)
 *   TOP_TRIM         — negative offset to hide the transparent top
 *                       band = round(651 × BRAND_W / 2376)
 *
 * The visible box height (BRAND_H) is derived — it's the scaled
 * content height ≈ BRAND_W × (1125/2376). Anything larger will
 * expose transparent padding.
 */
const BRAND_W = 110;
const IMG_H = 97; // 110 × 2091 / 2376
const TOP_TRIM = 30; // 651 × 110 / 2376 (rounded)
const BRAND_H = 52; // ≈ 1125 × 110 / 2376

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
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

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },

  bellChip: {
    width: CHIP,
    height: CHIP,
    borderRadius: CHIP / 2,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  badgeText: {
    color: Colors.textInverse,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },

  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: Colors.surfaceMuted,
    ...Shadows.xs,
  },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 11,
    height: 11,
    borderRadius: Radius.circle,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.background,
  },

  pressed: { opacity: 0.6 },
});
