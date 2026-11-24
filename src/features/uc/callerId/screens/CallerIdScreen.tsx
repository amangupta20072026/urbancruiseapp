/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * CallerIdScreen — Settings › Caller ID (UC staff, Android 10+)
 * ------------------------------------------------------------------
 *   ┌ Caller ID ───────────────────────────────┐
 *   │ [✓ Caller ID is on · 12,211 numbers]     │  status banner
 *   │ SETUP                                    │
 *   │  Caller ID app            On / Turn on › │  ROLE_CALL_SCREENING
 *   │  Display over other apps  On / Turn on › │  overlay card
 *   │  Notifications            On / Turn on › │  locked-phone backup
 *   │ CUSTOMER LIST                            │
 *   │  Last synced              Today, 7:45 pm │
 *   │  Updates when you open the app           │
 *   │ [ ⟳ Sync now ]                           │
 *   └──────────────────────────────────────────┘
 *
 * Every value is read from the phone (useCallerIdStatus) and re-read
 * when the user comes back from an Android settings page.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react-native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';
import { toast } from '@services/toast';
import { callerIdNative } from '@/native/callerId';

import { useCallerIdStatus } from '../hooks/useCallerIdStatus';
import { syncCallerId } from '../sync';
import { turnOnCallerId } from '../turnOn';

/* ------------------------------------------------------------------ */
/* Formatting                                                         */
/* ------------------------------------------------------------------ */

const countFormat = new Intl.NumberFormat('en-IN');

/** "Today, 7:45 pm", "Yesterday, 9:10 am", "21 Nov, 6:02 pm", "Never". */
function formatSyncedAt(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never';
  const time = d
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
    .toLowerCase();
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
  if (d.toDateString() === yesterday.toDateString())
    return `Yesterday, ${time}`;
  const day = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${day}, ${time}`;
}

/* ------------------------------------------------------------------ */
/* Screen                                                             */
/* ------------------------------------------------------------------ */

const CallerIdScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { status } = useCallerIdStatus();
  const [syncing, setSyncing] = useState(false);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const handleSyncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    const result = await syncCallerId({ force: true });
    setSyncing(false);
    switch (result) {
      case 'updated':
        toast.success('Customer list updated');
        return;
      case 'unchanged':
        toast.success('Customer list is up to date');
        return;
      case 'revoked':
        toast.error('Caller ID is not available for your account', {
          description: 'Please contact HR or your manager.',
        });
        return;
      case 'off':
        toast.info('Turn on caller ID first');
        return;
      case 'failed':
        toast.error("Couldn't update the customer list", {
          description: 'Check your internet connection and try again.',
        });
        return;
      default:
        return;
    }
  }, [syncing]);

  if (!status) {
    return (
      <SafeScreen edges={['top']} backgroundColor={Colors.backgroundSecondary}>
        <View style={styles.headerWrap}>
          <ScreenHeader title="Caller ID" onBack={handleBack} />
        </View>
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeScreen>
    );
  }

  const isOn = status.roleHeld;
  const bannerTitle = isOn ? 'Caller ID is on' : 'Caller ID is off';
  const bannerText = isOn
    ? status.count > 0
      ? `${countFormat.format(status.count)} customer numbers on this phone`
      : 'Getting the customer list…'
    : 'Turn it on to see who is calling';

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.backgroundSecondary}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Caller ID"
          subtitle="See which customer is calling you"
          onBack={handleBack}
        />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, Spacing.lg) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner */}
        <View
          style={[styles.banner, isOn ? styles.bannerOn : styles.bannerOff]}
        >
          {isOn ? (
            <ShieldCheck
              size={22}
              color={Colors.primaryDark}
              strokeWidth={2.25}
            />
          ) : (
            <ShieldAlert
              size={22}
              color={Colors.pendingDark}
              strokeWidth={2.25}
            />
          )}
          <View style={styles.flex}>
            <Text
              style={[
                styles.bannerTitle,
                { color: isOn ? Colors.primaryDark : Colors.pendingDark },
              ]}
            >
              {bannerTitle}
            </Text>
            <Text style={styles.bannerText}>{bannerText}</Text>
          </View>
        </View>

        {/* Setup */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Setup</Text>
          <View style={styles.card}>
            <SetupRow
              title="Caller ID app"
              hint="Lets Urban Cruise check incoming calls"
              on={status.roleHeld}
              onTurnOn={() => void turnOnCallerId()}
            />
            <View style={styles.divider} />
            <SetupRow
              title="Display over other apps"
              hint="Shows the customer card on the call screen"
              on={status.canDrawOverlays}
              onTurnOn={() => void callerIdNative.openOverlaySettings()}
            />
            <View style={styles.divider} />
            <SetupRow
              title="Notifications"
              hint="Shows the customer when the phone is locked"
              on={status.notificationsEnabled}
              onTurnOn={() => void callerIdNative.openNotificationSettings()}
            />
          </View>
        </View>

        {/* Customer list */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Customer list</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowTitle}>Last synced</Text>
              <Text style={styles.rowValue}>
                {isOn ? formatSyncedAt(status.syncedAt) : '—'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowHint}>
                Updates when you open the app. Customers saved in your phone's
                contacts show your contact name instead.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => void handleSyncNow()}
            disabled={!isOn || syncing}
            style={({ pressed }) => [
              styles.syncBtn,
              (!isOn || syncing) && styles.disabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Sync now"
            accessibilityState={{ disabled: !isOn || syncing, busy: syncing }}
          >
            {syncing ? (
              <ActivityIndicator size="small" color={Colors.primaryDark} />
            ) : (
              <RefreshCw
                size={18}
                color={Colors.primaryDark}
                strokeWidth={2.25}
              />
            )}
            <Text style={styles.syncBtnText}>
              {syncing ? 'Syncing…' : 'Sync now'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeScreen>
  );
};

export default CallerIdScreen;

/* ------------------------------------------------------------------ */
/* Rows                                                               */
/* ------------------------------------------------------------------ */

const SetupRow: React.FC<{
  title: string;
  hint: string;
  on: boolean;
  onTurnOn: () => void;
}> = ({ title, hint, on, onTurnOn }) => {
  const content = (
    <>
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      {on ? (
        <Text style={styles.onText}>On</Text>
      ) : (
        <Text style={styles.turnOnText}>Turn on ›</Text>
      )}
    </>
  );

  if (on) {
    return (
      <View style={styles.row} accessibilityLabel={`${title}: on`}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onTurnOn}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${title}: off. Turn on`}
    >
      {content}
    </Pressable>
  );
};

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  bannerOn: { backgroundColor: Colors.primaryTint },
  bannerOff: { backgroundColor: Colors.warningTint },
  bannerTitle: {
    ...Typography.label,
    fontWeight: '700',
  },
  bannerText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  sectionBlock: { gap: Spacing.sm },
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
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  rowHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rowValue: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginLeft: 'auto',
  },
  onText: {
    ...Typography.label,
    color: Colors.success,
    fontWeight: '700',
  },
  turnOnText: {
    ...Typography.label,
    color: Colors.error,
    fontWeight: '700',
  },

  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  syncBtnText: {
    ...Typography.button,
    color: Colors.primaryDark,
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
});
