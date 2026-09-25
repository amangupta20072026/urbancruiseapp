/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * SettingsScreen — SHARED, STACK SCREEN
 * ------------------------------------------------------------------
 * Cross-role settings hub reached from every role's More sheet
 * (Customer / Vendor / Driver / UC — the "Settings" tile in the
 * Account group).
 *
 * LAYOUT (top → bottom):
 *   ScreenHeader ("Settings" + "Manage your account and app preferences")
 *   ┌─ Account Settings ────────────────────────────────────────┐
 *   │  Personal Information · Saved Payment Methods             │
 *   └───────────────────────────────────────────────────────────┘
 *   ┌─ App Preferences ─────────────────────────────────────────┐
 *   │  Notifications · Language · Appearance · Permissions      │
 *   └───────────────────────────────────────────────────────────┘
 *   ┌─ Support & Legal ─────────────────────────────────────────┐
 *   │  Terms & Conditions · About · Help & Support ·            │
 *   │  Delete Account                                           │
 *   └───────────────────────────────────────────────────────────┘
 *   [ Logout ]                        ← red-tinted full-width CTA
 *
 * REGISTRATION:
 *   The `Settings` route is registered in UC ✅ and Customer ✅
 *   navigators today. Vendor / Driver stacks do NOT register it yet
 *   — see the SHARED-SCREEN REGISTRATION STATUS block in
 *   `useMoreActions.ts` for the status matrix and the ComingSoon
 *   pattern to follow when wiring the other two roles.
 *
 * BEHAVIOR / WIRING STATUS:
 *   Some rows land on real destinations today; the rest toast
 *   "coming soon" with an inline TODO. The mapping is intentionally
 *   in ONE place (`handleRow`) so a future PR that ships e.g. a
 *   Language screen only changes one line.
 *
 *     Personal Information     → Profile               (registered)
 *     Saved Payment Methods    → toast (no route)
 *     Notifications            → toast (no PREFERENCES route yet;
 *                                       NotificationCentre is the
 *                                       inbox, not the settings)
 *     Language                 → toast (i18n not built)
 *     Appearance               → toast (dark-mode toggle not built)
 *     Permissions              → Linking.openSettings()  ✅ real
 *     Terms & Conditions       → open termsUrl (AppConfig)  ✅ real
 *     About Urban Cruise       → in-place Alert with app version  ✅
 *     Help & Support           → HelpSupport             ✅ (this PR)
 *     Delete Account           → toast (no account-delete flow yet)
 *     Logout                   → useLogout() with confirm Alert  ✅
 *
 * DESIGN INVARIANTS:
 *   - SafeScreen + ScreenHeader, matching every other stack screen.
 *   - Theme tokens only. Icon foreground colors reuse theme tokens
 *     (Colors.info / primary / accent / error / etc.), each paired
 *     1:1 with its `*Tint` background token. Purple (Language,
 *     Terms & Conditions, Notifications) uses a named local pair —
 *     same rationale documented in HelpSupportScreen.tsx.
 *   - Each section is a rounded surface card containing a stack of
 *     rows separated by 1px dividers. The card has an outer 1px
 *     border for definition on the light-tint background — no
 *     shadows here (matches mockup's flat card style).
 * ------------------------------------------------------------------
 */

import React, { useCallback } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import DeviceInfo from 'react-native-device-info';
import {
  Bell,
  Palette,
  CreditCard,
  ChevronRight,
  FileText,
  HelpCircle,
  Info,
  Languages,
  LogOut,
  Shield,
  Trash2,
  User,
  type LucideProps,
} from 'lucide-react-native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';
import { toast } from '@services/toast';
import { useAppSelector } from '@store/hooks';
import { useLogout } from '@features/auth/hooks';
import { navigate } from '@navigation/NavigationService';

/* -----------------------------------------------------------------
 * Local color pairs — purple / pink don't have theme tokens yet.
 * Kept as named module-scope constants so a future theme addition
 * (Colors.purple*, Colors.pink*) can be swapped in at one line each.
 * See HelpSupportScreen.tsx for the same pattern.
 * ----------------------------------------------------------------- */

const PURPLE_FG = '#7C3AED';
const PURPLE_BG = '#EDE9FE';
const PINK_FG = '#EC4899';
const PINK_BG = '#FCE7F3';

/* -----------------------------------------------------------------
 * Row / section model
 * ----------------------------------------------------------------- */

/**
 * Every navigable item on this screen has a stable id. `handleRow`
 * routes on this id — so wiring a new destination is a one-line
 * switch update and never touches the row JSX.
 */
type RowId =
  | 'personalInfo'
  | 'savedPayments'
  | 'notifications'
  | 'language'
  | 'appearance'
  | 'permissions'
  | 'termsConditions'
  | 'aboutApp'
  | 'helpSupport'
  | 'deleteAccount';

type Row = {
  id: RowId;
  title: string;
  subtitle: string;
  Icon: React.ComponentType<LucideProps>;
  iconFg: string;
  iconBg: string;
  /**
   * When true, the row's title renders in error red — used by the
   * "Delete Account" row so the destructive intent is unmistakable.
   */
  destructive?: boolean;
};

type Section = {
  key: string;
  label: string;
  rows: Row[];
};

/* -----------------------------------------------------------------
 * Screen
 * ----------------------------------------------------------------- */

const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Terms URL comes from remote AppConfig (Ops-owned); the empty-
  // string fallback triggers a graceful toast on tap rather than a
  // dud `Linking.openURL('')`.
  const termsUrl = useAppSelector(s => s.app.appConfig?.legal.termsUrl ?? '');

  const { logout, isPending: loggingOut } = useLogout();

  // Bottom pad accommodates the sticky Logout CTA + the home indicator.
  const bottomPad = Math.max(insets.bottom, Spacing.lg);

  /* -------- Sections (static config) --------
   *
   * Declared inside the component so the icon fg/bg pairs read
   * against Colors in scope; the array is stable for a given render
   * because every value is a token or a module-scope constant. */
  const SECTIONS: readonly Section[] = [
    {
      key: 'account',
      label: 'Account Settings',
      rows: [
        {
          id: 'personalInfo',
          title: 'Personal Information',
          subtitle: 'Name, mobile number, email, date of birth',
          Icon: User,
          iconFg: Colors.info,
          iconBg: Colors.infoTint,
        },
        {
          id: 'savedPayments',
          title: 'Saved Payment Methods',
          subtitle: 'Cards, UPI, wallets',
          Icon: CreditCard,
          iconFg: Colors.accent,
          iconBg: Colors.accentTint,
        },
      ],
    },
    {
      key: 'preferences',
      label: 'App Preferences',
      rows: [
        {
          id: 'notifications',
          title: 'Notifications',
          subtitle: 'Manage your notification preferences',
          Icon: Bell,
          iconFg: PURPLE_FG,
          iconBg: PURPLE_BG,
        },
        {
          id: 'language',
          title: 'Language',
          // Placeholder value — swap for the current selection once
          // i18n lands (right-aligned trailing text also nice-to-have).
          subtitle: 'English',
          Icon: Languages,
          iconFg: Colors.primary,
          iconBg: Colors.primaryTint,
        },
        {
          id: 'appearance',
          title: 'Appearance',
          subtitle: 'Light mode / Dark mode / System default',
          Icon: Palette,
          iconFg: PINK_FG,
          iconBg: PINK_BG,
        },
        {
          id: 'permissions',
          title: 'Permissions',
          subtitle: 'Camera, location, notifications and more',
          Icon: Shield,
          iconFg: Colors.info,
          iconBg: Colors.infoTint,
        },
      ],
    },
    {
      key: 'supportLegal',
      label: 'Support & Legal',
      rows: [
        {
          id: 'termsConditions',
          title: 'Terms & Conditions',
          subtitle: 'Read our terms and policies',
          Icon: FileText,
          iconFg: PURPLE_FG,
          iconBg: PURPLE_BG,
        },
        {
          id: 'aboutApp',
          title: 'About Urban Cruise',
          subtitle: `App version ${DeviceInfo.getVersion()}`,
          Icon: Info,
          iconFg: Colors.accent,
          iconBg: Colors.accentTint,
        },
        {
          id: 'helpSupport',
          title: 'Help & Support',
          subtitle: 'Get help, FAQs and contact us',
          Icon: HelpCircle,
          iconFg: Colors.info,
          iconBg: Colors.infoTint,
        },
        {
          id: 'deleteAccount',
          title: 'Delete Account',
          subtitle: 'Permanently delete your account and data',
          Icon: Trash2,
          iconFg: Colors.error,
          iconBg: Colors.errorTint,
          destructive: true,
        },
      ],
    },
  ];

  /* -------- Handlers -------- */

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const handleRow = useCallback(
    (id: RowId) => {
      switch (id) {
        case 'personalInfo':
          // Profile is registered as a ComingSoon in Customer / UC;
          // routing there anyway means when the real Profile screen
          // lands this row starts working with no code change.
          navigate('Profile');
          return;

        case 'permissions':
          // Deep-links to the OS Settings page for this app, where
          // the user can toggle every permission the app requests —
          // camera, location, notifications, photos, background
          // activity, etc. Runtime prompt flows are owned by the
          // permissions service; this row only surfaces the entry
          // point to the system-owned settings surface, which is
          // authoritative and the only place a granted permission
          // can be revoked.
          void Linking.openSettings().catch(() => {
            toast.error("Couldn't open Settings", {
              description: 'Please open Settings from your device manually.',
            });
          });
          return;

        case 'termsConditions':
          if (!termsUrl) {
            toast.info('Coming soon', {
              description: 'Terms & Conditions will be available shortly.',
            });
            return;
          }
          void Linking.openURL(termsUrl).catch(() => {
            toast.error("Couldn't open the page", {
              description: 'Please try again in a moment.',
            });
          });
          return;

        case 'aboutApp':
          Alert.alert(
            'About Urban Cruise',
            `Version ${DeviceInfo.getVersion()} (${DeviceInfo.getBuildNumber()})\n\nYour Journey. Our Priority.`,
            [{ text: 'OK' }],
          );
          return;

        case 'helpSupport':
          // Hub screen shipped in the previous change — reachable from
          // both the More sheet's "Help & Support" tile and here.
          navigate('HelpSupport');
          return;

        case 'savedPayments':
        case 'notifications':
        case 'language':
        case 'appearance':
        case 'deleteAccount':
          // TODO(nav): route each of these to its dedicated screen
          // when it lands — the switch is the ONE spot to change.
          toast.info('Coming soon', {
            description: 'This setting will be available shortly.',
          });
          return;

        default: {
          const _exhaustive: never = id;
          void _exhaustive;
        }
      }
    },
    [termsUrl],
  );

  const handleLogout = useCallback(() => {
    // Unlike the More-sheet Logout tile (which fires immediately —
    // taps in a sheet are already an intentional two-step action),
    // the Settings screen shows a full-width prominent CTA. A
    // confirm Alert prevents an accidental swipe-and-tap from
    // wiping the session.
    Alert.alert(
      'Log out?',
      'You will need to sign in again to use Urban Cruise.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => {
            // Same fire-and-forget shape as MoreSheet's Logout tile.
            // See `useLogout` for the six-step teardown sequence.
            void logout();
          },
        },
      ],
    );
  }, [logout]);

  /* -------- Render -------- */

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.backgroundSecondary}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Settings"
          subtitle="Manage your account and app preferences"
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
                  <RowItem row={row} onPress={() => handleRow(row.id)} />
                  {idx < section.rows.length - 1 ? (
                    <View style={styles.rowDivider} />
                  ) : null}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        {/* Bottom Logout — red-tinted full-width button. Not sticky:
            keeps parity with the mockup and avoids covering the last
            row on short screens when the keyboard is up. */}
        <Pressable
          onPress={handleLogout}
          disabled={loggingOut}
          style={({ pressed }) => [
            styles.logoutBtn,
            pressed && styles.pressed,
            loggingOut && styles.logoutBtnDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Log out"
          accessibilityState={{ disabled: loggingOut }}
        >
          <LogOut size={20} color={Colors.error} strokeWidth={2.25} />
          <Text style={styles.logoutBtnText}>
            {loggingOut ? 'Logging out…' : 'Logout'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeScreen>
  );
};

export default SettingsScreen;

/* =================================================================
 * Local subcomponents
 * ================================================================= */

const RowItem: React.FC<{ row: Row; onPress: () => void }> = ({
  row,
  onPress,
}) => {
  const Icon = row.Icon;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${row.title}. ${row.subtitle}`}
    >
      <View style={[styles.rowIconTile, { backgroundColor: row.iconBg }]}>
        <Icon size={20} color={row.iconFg} strokeWidth={2.25} />
      </View>
      <View style={styles.rowTextCol}>
        <Text
          style={[
            styles.rowTitle,
            row.destructive && styles.rowTitleDestructive,
          ]}
          numberOfLines={1}
        >
          {row.title}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={2}>
          {row.subtitle}
        </Text>
      </View>
      <ChevronRight size={20} color={Colors.textTertiary} strokeWidth={2.25} />
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
  rowTitleDestructive: {
    color: Colors.error,
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

  /* Logout CTA — full-width red-tinted, red icon + red label. */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: Colors.errorTint,
    marginTop: Spacing.sm,
  },
  logoutBtnDisabled: {
    opacity: 0.6,
  },
  logoutBtnText: {
    ...Typography.body,
    color: Colors.error,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.85,
  },
});
