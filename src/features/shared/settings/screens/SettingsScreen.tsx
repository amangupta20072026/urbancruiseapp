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
 *   │  Personal Information · Saved Payment Methods (customer)  │
 *   │  Business Details · Payout Account (vendor)               │
 *   │  Licence & Documents (driver)                             │
 *   └───────────────────────────────────────────────────────────┘
 *   ┌─ App Preferences ─────────────────────────────────────────┐
 *   │  Notifications · Language · Appearance · Permissions      │
 *   └───────────────────────────────────────────────────────────┘
 *   ┌─ Support & Legal ─────────────────────────────────────────┐
 *   │  Terms & Conditions · About · Help & Support ·            │
 *   │  Delete Account (not UC)                                  │
 *   └───────────────────────────────────────────────────────────┘
 *   [ Logout ]                        ← red-tinted full-width CTA
 *
 * ROLES:
 *   One screen for every role. WHICH cards a role sees, and in which
 *   groups, is pure data in `../settingsMenu.ts`; cards that open a
 *   shared screen are shown only if SCREEN_ACCESS
 *   (src/rbac/screenAccess.ts) grants it to the role. This file only
 *   renders the sections and decides what a tap does (`handleRow`).
 *
 * WHAT EACH CARD DOES (roles in brackets):
 *     Personal Information   → Profile                    [all]
 *     Saved Payment Methods  → toast, not built yet       [customer]
 *     Business Details       → toast, not built yet       [vendor]
 *     Payout Account         → toast, not built yet       [vendor]
 *     Licence & Documents    → toast, not built yet       [driver]
 *     Notifications          → NotificationPreferences    [all: opens
 *                              for customer; "Coming soon" toast for
 *                              roles without the screen yet]
 *     Language               → toast (i18n not built)     [all]
 *     Appearance             → toast (dark mode not built)[all]
 *     Permissions            → Linking.openSettings()     [all]
 *     Terms & Conditions     → open termsUrl (AppConfig)  [all]
 *     About Urban Cruise     → AboutUrbanCruise           [all]
 *     Help & Support         → HelpSupport                [customer, vendor, driver]
 *     Contact Support        → Support                    [uc]
 *     Delete Account         → toast, not built yet       [customer,
 *                                                          vendor, driver]
 *     Logout                 → useLogout() with confirm   [all]
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

import React, { useCallback, useMemo } from 'react';
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
import { ChevronRight, LogOut } from 'lucide-react-native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';
import { toast } from '@services/toast';
import { useAppSelector } from '@store/hooks';
import { useLogout } from '@features/auth/hooks';
import { navigateOrComingSoon } from '@navigation/NavigationService';
import { notifyComingSoon } from '@services/comingSoon';

import {
  buildSettingsSections,
  type SettingsRow,
  type SettingsRowId,
} from '../settingsMenu';

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

  /* -------- Cards for this role --------
   *
   * Which cards show, and in which groups, is pure data in
   * ../settingsMenu.ts (access comes from SCREEN_ACCESS). The role
   * comes from the server-issued session, never from user input. */
  const role = useAppSelector(s => s.app.userRole);
  const sections = useMemo(
    () => buildSettingsSections(role, { appVersion: DeviceInfo.getVersion() }),
    [role],
  );

  /* -------- Handlers -------- */

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const handleRow = useCallback(
    (id: SettingsRowId) => {
      switch (id) {
        case 'personalInfo':
          // Shared screen; roles that don't register it yet get the
          // standard "Coming soon" toast instead of a silent no-op.
          navigateOrComingSoon('profile', 'Profile');
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
            // Server config hasn't published the URL yet.
            notifyComingSoon('termsAndConditions');
            return;
          }
          void Linking.openURL(termsUrl).catch(() => {
            toast.error("Couldn't open the page", {
              description: 'Please try again in a moment.',
            });
          });
          return;

        case 'aboutApp':
          // Full "About Urban Cruise" screen — logo, version + build,
          // tagline, About / Services / Mission / Why Choose Us /
          // Contact and a Legal Information entry that opens
          // legal.termsUrl. Registered in Customer + UC navigators.
          navigateOrComingSoon('aboutApp', 'AboutUrbanCruise');
          return;

        case 'contactSupport':
          // UC's direct contact screen (they have no help hub).
          navigateOrComingSoon('helpSupport', 'Support');
          return;

        case 'helpSupport':
          // Hub screen shipped in the previous change — reachable from
          // both the More sheet's "Help & Support" tile and here.
          navigateOrComingSoon('helpSupport', 'HelpSupport');
          return;

        case 'businessDetails':
          notifyComingSoon('vendor.businessDetails');
          return;

        case 'payoutAccount':
          notifyComingSoon('vendor.payouts');
          return;

        case 'licenceDocuments':
          notifyComingSoon('driver.documents');
          return;

        case 'notifications':
          // Notification preference screen — per-channel toggles. Its
          // categories are customer ones today, so only the customer
          // navigator registers it (SCREEN_ACCESS); other roles get
          // the "Coming soon" toast from navigateOrComingSoon.
          navigateOrComingSoon(
            'notificationPreferences',
            'NotificationPreferences',
          );
          return;

        case 'savedPayments':
        case 'language':
        case 'appearance':
        case 'deleteAccount':
          // TODO(nav): route each of these to its dedicated screen
          // when it lands — the switch is the ONE spot to change.
          notifyComingSoon('settingsOption');
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
        {sections.map(section => (
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

const RowItem: React.FC<{ row: SettingsRow; onPress: () => void }> = ({
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
