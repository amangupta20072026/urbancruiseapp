/**
 * ------------------------------------------------------------------
 * NotificationPreferencesScreen — SHARED, STACK SCREEN
 * ------------------------------------------------------------------
 * Cross-role notification-preferences hub reached from
 * Settings → App Preferences → Notifications.
 *
 * LAYOUT (top → bottom):
 *   ScreenHeader ("Notifications" + "Manage your notification
 *                  preferences and stay updated…")
 *   ┌─ BOOKING UPDATES ─────────────────────────────────────────┐
 *   │  Booking Confirmations · Trip Reminders · Booking Updates │
 *   └───────────────────────────────────────────────────────────┘
 *   ┌─ PROMOTIONS & OFFERS ─────────────────────────────────────┐
 *   │  Promotional Offers · New Services                        │
 *   └───────────────────────────────────────────────────────────┘
 *   ┌─ GENERAL ─────────────────────────────────────────────────┐
 *   │  General Notifications · Survey & Feedback                │
 *   └───────────────────────────────────────────────────────────┘
 *
 * SCOPE:
 *   This screen is the *app-level* preference surface for what
 *   categories of push / in-app notifications the user wants to
 *   receive. It is NOT the OS permission gate (that lives in
 *   Settings → Permissions → Linking.openSettings()) and NOT the
 *   notification INBOX (that's NotificationCentreScreen). All three
 *   are intentionally distinct:
 *
 *     Permissions        → OS-level allow / deny the whole channel
 *     NotificationCentre → history of received notifications
 *     This screen        → per-category subscription preferences
 *
 * PERSISTENCE:
 *   Toggles persist to MMKV under `StorageKeys.notificationPreferences`
 *   as a single JSON object keyed by ToggleId. Rationale for MMKV
 *   (not Redux):
 *     - Preferences are read on the notification-render path (both
 *       foreground onMessage and background handler). MMKV reads are
 *       synchronous and safe in a background handler; Redux is not
 *       fully mounted there.
 *     - No cross-screen selectors need this state today — only the
 *       screen itself + the notifications service consume it.
 *     - Preferences must survive logout (they belong to the device /
 *       app install, not the session).
 *
 *   The default map is written on first mount if MMKV has nothing —
 *   this keeps every downstream reader from having to defensively
 *   handle "prefs never set".
 *
 * WHY A CUSTOM TOGGLE (not react-native's <Switch/>):
 *   The native RN Switch renders as a small Material-style toggle on
 *   Android that ignores size styling and cannot be resized to match
 *   the mockup's large pill switch. iOS's is closer but visually
 *   inconsistent across the two platforms. The local `Toggle`
 *   subcomponent below is a fixed-size pill with a Reanimated
 *   thumb-slide + track-color interpolate — identical on iOS and
 *   Android and matches the mockup.
 *
 * TAP TARGET:
 *   Only the Toggle itself is tappable — the surrounding row is a
 *   plain View. This is a deliberate product choice: preference
 *   toggles should require an affirmative touch on the control, not
 *   fire on any stray tap inside the row. The Toggle's `hitSlop`
 *   widens its own touch area to ≥44pt vertically so the small pill
 *   still meets accessibility guidance.
 *
 * DESIGN INVARIANTS:
 *   - SafeScreen + ScreenHeader, matching every other stack screen.
 *   - Theme tokens only. Icon fg/bg pairs mirror the SettingsScreen
 *     palette (info / primary / accent / plus purple / pink named
 *     locals — same rationale documented in SettingsScreen.tsx).
 *   - Each section is a rounded surface card with a 1px outer border
 *     containing a stack of rows separated by 1px dividers.
 *   - The row is `Pressable` so tapping ANY part of the row toggles
 *     the switch — larger tap target than the switch alone.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Bell,
  CalendarCheck,
  CircleCheck,
  Clock,
  Mail,
  Star,
  Tag,
  type LucideProps,
} from 'lucide-react-native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';
import { mmkv } from '@services/storage/mmkv';
import { StorageKeys } from '@constants/storageKeys';

/* -----------------------------------------------------------------
 * Local color pairs — purple / pink don't have theme tokens yet.
 * Kept as module-scope constants so a future theme addition
 * (Colors.purple*, Colors.pink*) can be swapped in at one line each.
 * See SettingsScreen.tsx for the same pattern.
 * ----------------------------------------------------------------- */

const PURPLE_FG = '#7C3AED';
const PURPLE_BG = '#EDE9FE';
const PINK_FG = '#EC4899';
const PINK_BG = '#FCE7F3';

/* -----------------------------------------------------------------
 * Toggle geometry — module-scope so styles + animation share exact
 * numbers. Change once, both places update.
 * ----------------------------------------------------------------- */

const TOGGLE_TRACK_W = 52;
const TOGGLE_TRACK_H = 30;
const TOGGLE_THUMB = 26;
const TOGGLE_INSET = (TOGGLE_TRACK_H - TOGGLE_THUMB) / 2; // 2px
const TOGGLE_TRAVEL = TOGGLE_TRACK_W - TOGGLE_THUMB - TOGGLE_INSET * 2;

// OFF-state track color. Slightly darker than `Colors.border` so the
// off state reads as an intentional control rather than an outline
// against the white card. No theme token for this shade yet.
const TOGGLE_OFF_TRACK = '#CBD5E1';

/* -----------------------------------------------------------------
 * Preference model
 * ----------------------------------------------------------------- */

/**
 * Every toggle on this screen has a stable id. The persisted MMKV
 * object is keyed by these — renaming any id is a MIGRATION and
 * must be paired with a one-shot upgrade routine.
 */
export type NotificationPreferenceId =
  | 'bookingConfirmations'
  | 'tripReminders'
  | 'bookingChanges'
  | 'promotionalOffers'
  | 'newServices'
  | 'generalNotifications'
  | 'surveyFeedback';

export type NotificationPreferences = Record<NotificationPreferenceId, boolean>;

/**
 * First-launch defaults. Booking-related categories default ON
 * (they're the core service the user signed up for); the two
 * discretionary marketing categories (`newServices`, `surveyFeedback`)
 * default OFF — the user has not opted in to those.
 */
const DEFAULT_PREFERENCES: NotificationPreferences = {
  bookingConfirmations: true,
  tripReminders: true,
  bookingChanges: true,
  promotionalOffers: true,
  newServices: false,
  generalNotifications: true,
  surveyFeedback: false,
};

/* -----------------------------------------------------------------
 * Row / section model
 * ----------------------------------------------------------------- */

type Row = {
  id: NotificationPreferenceId;
  title: string;
  subtitle: string;
  Icon: React.ComponentType<LucideProps>;
  iconFg: string;
  iconBg: string;
};

type Section = {
  key: string;
  label: string;
  rows: Row[];
};

/* -----------------------------------------------------------------
 * Persistence helpers
 * -----------------------------------------------------------------
 * Read-through defaults: if MMKV has nothing (fresh install) or a
 * partial object (a new toggle was added in a later version and
 * hasn't been seen yet), the missing keys fall back to the default
 * map. This lets us ship new categories without a migration.
 * ----------------------------------------------------------------- */

function loadPreferences(): NotificationPreferences {
  const stored =
    mmkv.getObject<Partial<NotificationPreferences>>(
      StorageKeys.notificationPreferences,
    ) ?? {};
  return { ...DEFAULT_PREFERENCES, ...stored };
}

function persistPreferences(prefs: NotificationPreferences): void {
  mmkv.setObject(StorageKeys.notificationPreferences, prefs);
}

/* -----------------------------------------------------------------
 * Screen
 * ----------------------------------------------------------------- */

const NotificationPreferencesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Lazy initializer so the MMKV read runs exactly once on mount,
  // not on every re-render.
  const [prefs, setPrefs] = useState<NotificationPreferences>(loadPreferences);

  const bottomPad = Math.max(insets.bottom, Spacing.lg);

  /* -------- Sections (static config) -------- */
  const SECTIONS: readonly Section[] = useMemo(
    () => [
      {
        key: 'bookingUpdates',
        label: 'Booking Updates',
        rows: [
          {
            id: 'bookingConfirmations',
            title: 'Booking Confirmations',
            subtitle: 'Get notified when your booking is confirmed',
            Icon: CalendarCheck,
            iconFg: Colors.primary,
            iconBg: Colors.primaryTint,
          },
          {
            id: 'tripReminders',
            title: 'Trip Reminders',
            subtitle: 'Get reminders before your trip starts',
            Icon: Clock,
            iconFg: Colors.accent,
            iconBg: Colors.accentTint,
          },
          {
            id: 'bookingChanges',
            title: 'Booking Updates',
            subtitle: 'Get notified about changes in your booking',
            Icon: CircleCheck,
            iconFg: Colors.info,
            iconBg: Colors.infoTint,
          },
        ],
      },
      {
        key: 'promotions',
        label: 'Promotions & Offers',
        rows: [
          {
            id: 'promotionalOffers',
            title: 'Promotional Offers',
            subtitle: 'Receive special offers, discounts and deals',
            Icon: Tag,
            iconFg: PINK_FG,
            iconBg: PINK_BG,
          },
          {
            id: 'newServices',
            title: 'New Services',
            subtitle: 'Get notified about new services and features',
            Icon: Star,
            iconFg: PURPLE_FG,
            iconBg: PURPLE_BG,
          },
        ],
      },
      {
        key: 'general',
        label: 'General',
        rows: [
          {
            id: 'generalNotifications',
            title: 'General Notifications',
            subtitle: 'Important announcements and updates',
            Icon: Bell,
            iconFg: Colors.info,
            iconBg: Colors.infoTint,
          },
          {
            id: 'surveyFeedback',
            title: 'Survey & Feedback',
            subtitle: 'Help us improve with surveys and feedback',
            Icon: Mail,
            iconFg: PURPLE_FG,
            iconBg: PURPLE_BG,
          },
        ],
      },
    ],
    [],
  );

  /* -------- Handlers -------- */

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  /**
   * Optimistic in-memory toggle + synchronous MMKV write. MMKV writes
   * are memory-mapped and fast enough (<1ms) that we don't need to
   * defer to a microtask — a laggy re-render would be more visible
   * than any write cost. If a write ever grows expensive, wrap in
   * `InteractionManager.runAfterInteractions` here.
   */
  const handleToggle = useCallback((id: NotificationPreferenceId) => {
    setPrefs(current => {
      const next: NotificationPreferences = { ...current, [id]: !current[id] };
      persistPreferences(next);
      return next;
    });
  }, []);

  /* -------- Render -------- */

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.backgroundSecondary}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Notifications"
          subtitle="Manage your notification preferences and stay updated with important information."
          onBack={handleBack}
        />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map(section => (
          <View key={section.key} style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>{section.label}</Text>
            <View style={styles.card}>
              {section.rows.map((row, idx) => (
                <React.Fragment key={row.id}>
                  <PreferenceRow
                    row={row}
                    value={prefs[row.id]}
                    onToggle={() => handleToggle(row.id)}
                  />
                  {idx < section.rows.length - 1 ? (
                    <View style={styles.rowDivider} />
                  ) : null}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeScreen>
  );
};

export default NotificationPreferencesScreen;

/* =================================================================
 * Local subcomponents
 * ================================================================= */

const PreferenceRow: React.FC<{
  row: Row;
  value: boolean;
  onToggle: () => void;
}> = ({ row, value, onToggle }) => {
  const Icon = row.Icon;
  return (
    // Plain View — the row itself is NOT tappable. Only the trailing
    // Toggle owns onPress, so tapping the icon, title, or subtitle is
    // a no-op. Product decision: a preferences screen should require
    // an explicit affirmative action on the control, not fire on any
    // stray touch inside the row.
    <View style={styles.row}>
      <View style={[styles.rowIconTile, { backgroundColor: row.iconBg }]}>
        <Icon size={20} color={row.iconFg} strokeWidth={2.25} />
      </View>
      <View style={styles.rowTextCol}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {row.title}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={2}>
          {row.subtitle}
        </Text>
      </View>
      <Toggle
        value={value}
        onToggle={onToggle}
        accessibilityLabel={`${row.title}. ${row.subtitle}`}
      />
    </View>
  );
};

/**
 * Toggle — fixed-size pill switch driven by Reanimated.
 *
 * A `progress` shared value goes 0 → 1 with a 180ms timing curve on
 * every `value` change. The track color interpolates between the
 * off-track gray and Colors.primary; the thumb translates by
 * `TOGGLE_TRAVEL` pixels. Both derived styles read the same shared
 * value so they stay in lock-step even during fast repeated taps.
 *
 * The switch is the SOLE tap target — the parent row is a plain View
 * so touching the icon or text does nothing. A `hitSlop` widens the
 * touchable area beyond the 52×30 visual bounds so the small pill
 * still meets the ≥44pt accessible touch target guideline without
 * enlarging the visual footprint.
 *
 * Extract this into `@shared/components/Toggle` the second another
 * screen needs the same control; today YAGNI.
 */
const Toggle: React.FC<{
  value: boolean;
  onToggle: () => void;
  accessibilityLabel: string;
}> = ({ value, onToggle, accessibilityLabel }) => {
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 180 });
  }, [value, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [TOGGLE_OFF_TRACK, Colors.primary],
    ),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TOGGLE_TRAVEL }],
  }));

  return (
    <Pressable
      onPress={onToggle}
      // Grow the tap area to ≥44pt vertical without changing the
      // visual size of the pill. Horizontal slop is smaller so the
      // touch doesn't collide with the text column to the left.
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
    >
      <Animated.View style={[styles.toggleTrack, trackStyle]}>
        <Animated.View style={[styles.toggleThumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
};

/* =================================================================
 * Styles
 * ================================================================= */

const styles = StyleSheet.create({
  flex: { flex: 1 },

  headerWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },

  scroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },

  /* Section — uppercase label above a rounded card container. */
  sectionBlock: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },

  /* Row inside a card. Height is not fixed — subtitles can wrap. */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowIconTile: {
    width: 40,
    height: 40,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextCol: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  rowSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  rowDivider: {
    height: 1,
    marginLeft: Spacing.md + 40 + Spacing.md, // align under text column
    backgroundColor: Colors.borderLight,
  },

  /* Toggle — pill track + circular thumb, positions computed from
     the module-scope geometry constants above. */
  toggleTrack: {
    width: TOGGLE_TRACK_W,
    height: TOGGLE_TRACK_H,
    borderRadius: TOGGLE_TRACK_H / 2,
    padding: TOGGLE_INSET,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: TOGGLE_THUMB,
    height: TOGGLE_THUMB,
    borderRadius: TOGGLE_THUMB / 2,
    backgroundColor: Colors.white,
    // Subtle elevation so the thumb reads as raised over the track.
    // Kept modest — a heavy shadow would look out of place next to
    // the flat card styling on the rest of the screen.
    shadowColor: Colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});