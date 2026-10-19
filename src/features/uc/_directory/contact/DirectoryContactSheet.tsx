/**
 * ------------------------------------------------------------------
 * DirectoryContactSheet — ONE contact sheet for every directory role
 * ------------------------------------------------------------------
 * Replaces CustomerContactSheet, VendorContactSheet,
 * StaffContactSheet and DriverContactSheet (and the two duplicate
 * number pickers). Every role now gets the same layout and behaviour;
 * only the data differs, and all of that lives in profiles.ts.
 *
 * Product decisions (fixed):
 *   - Layout: centred avatar + name, red × close button.
 *   - Closing: ONLY via × or Cancel. Swipe-down and backdrop taps are
 *     disabled, and the Android back press is swallowed while open.
 *   - Number picker: a separate sheet (PhoneNumberPickerSheet).
 *   - "View Full History": customers only.
 *
 * Why the back handler is needed: BottomSheetModalProvider sits above
 * NavigationContainer (App.tsx), so the sheet renders in a portal
 * outside the navigator. Without the listener a back press pops the
 * screen underneath while the sheet stays on top. `isOpenRef` (a ref,
 * so no re-render per animation frame) limits this to while the sheet
 * is open. The picker is an RN Modal, which receives back first, so
 * back still closes the picker.
 *
 * Usage:
 *   const ref = useRef<BottomSheetModal>(null);
 *   const [contact, setContact] = useState<DirectoryContact | null>(null);
 *   // on row press:
 *   setContact({ kind: 'vendor', data: vendor }); ref.current?.present();
 *   <DirectoryContactSheet ref={ref} contact={contact} onDismiss={…} />
 * ------------------------------------------------------------------
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import {
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Truck,
  User,
  UserCheck,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { makePhoneCall, openWhatsApp, sendEmail } from '@services/contact';
import type { UcStackParamList } from '@navigation/types';

import { avatarColorFor, initials } from '../../customers/utils/avatar';
import { toContactProfile } from './profiles';
import { PhoneNumberPickerSheet } from './PhoneNumberPickerSheet';
import type {
  ContactField,
  ContactFieldKind,
  ContactMetaIcon,
  ContactProfile,
  DirectoryContact,
} from './types';

type Props = {
  /** The record to show; null while nothing is selected. */
  contact: DirectoryContact | null;
  /** Fires after the close animation completes. */
  onDismiss?: () => void;
};

type PhoneAction = 'call' | 'whatsapp';

/* ------------------------------------------------------------------ */
/* Visual tokens (carried over from the customer sheet)               */
/* ------------------------------------------------------------------ */

const CLOSE_BG = '#FF5A5F';

const CALL_TINT = { bg: '#EAF2FF', fg: '#1D6BFF' };
const WHATSAPP_TINT = { bg: '#E3F9EA', fg: '#1FA855' };
const EMAIL_TINT = { bg: '#FFF1E0', fg: '#D97B0A' };

/** Icon + tint per info-row kind. One table, all roles. */
const FIELD_STYLE: Record<
  ContactFieldKind,
  { Icon: LucideIcon; bg: string; fg: string }
> = {
  type: { Icon: User, bg: '#EEF2FF', fg: '#4F46E5' },
  company: { Icon: Building2, bg: '#FFF7E6', fg: '#B45309' },
  phone: { Icon: Phone, bg: '#E7F7EC', fg: Colors.primary },
  email: { Icon: Mail, bg: '#FFF1E0', fg: '#FB8C00' },
  location: { Icon: MapPin, bg: '#EDF2FF', fg: '#3B82F6' },
  taxId: { Icon: BadgeCheck, bg: '#F1F3F5', fg: Colors.textSecondary },
  trips: { Icon: Briefcase, bg: '#E7F7EC', fg: Colors.success },
  vehicles: { Icon: Truck, bg: '#EEF2FF', fg: '#4F46E5' },
  drivers: { Icon: UserCheck, bg: '#E7F7EC', fg: Colors.success },
  license: { Icon: CreditCard, bg: '#EEF2FF', fg: '#4F46E5' },
  date: { Icon: Calendar, bg: '#F1F3F5', fg: Colors.textSecondary },
};

const META_ICON: Record<ContactMetaIcon, LucideIcon> = {
  status: BadgeCheck,
  role: ShieldCheck,
  company: Building2,
};

/* ------------------------------------------------------------------ */
/* Sheet                                                              */
/* ------------------------------------------------------------------ */

export const DirectoryContactSheet = forwardRef<BottomSheetModal, Props>(
  ({ contact, onDismiss }, ref) => {
    const internalRef = useRef<BottomSheetModal>(null);
    useImperativeHandle(ref, () => internalRef.current as BottomSheetModal, []);

    const navigation =
      useNavigation<NativeStackNavigationProp<UcStackParamList>>();

    /* Fixed 75% snap with dynamic sizing off: the sheet never grows
     * to full screen; longer content scrolls inside. */
    const snapPoints = useMemo(() => ['75%'], []);

    const profile = useMemo<ContactProfile | null>(
      () => (contact ? toContactProfile(contact) : null),
      [contact],
    );

    /* Customer id captured at tap time; navigated to after the sheet
     * has fully closed (see handleSheetDismiss). */
    const pendingHistoryRef = useRef<string | null>(null);

    /* Which action the number picker is choosing for (null = closed). */
    const [phoneAction, setPhoneAction] = useState<PhoneAction | null>(null);

    /* Blocks a second launch while one is still resolving (a fast
     * double tap would otherwise open the dialer twice). */
    const launchingRef = useRef(false);

    /* ---------------- Strict closing ---------------- */

    const isOpenRef = useRef(false);

    const handleSheetChange = useCallback((index: number) => {
      isOpenRef.current = index >= 0;
    }, []);

    useEffect(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => isOpenRef.current,
      );
      return () => subscription.remove();
    }, []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.55}
          // Tapping outside does NOT close — only × and Cancel do.
          pressBehavior="none"
        />
      ),
      [],
    );

    const close = useCallback(() => {
      internalRef.current?.dismiss();
    }, []);

    /* ---------------- Contact actions ---------------- */

    const runLaunch = useCallback(
      async (launch: () => Promise<{ ok: boolean }>, onFail: () => void) => {
        if (launchingRef.current) return;
        launchingRef.current = true;
        try {
          const result = await launch();
          if (!result.ok) onFail();
        } catch {
          onFail();
        } finally {
          launchingRef.current = false;
        }
      },
      [],
    );

    const performPhoneAction = useCallback(
      (action: PhoneAction, phone: string) => {
        if (!profile) return;
        if (action === 'call') {
          runLaunch(
            () => makePhoneCall(phone),
            () => Alert.alert('Cannot place call', 'Dialer unavailable.'),
          );
        } else {
          const message = profile.whatsAppMessage;
          runLaunch(
            () => openWhatsApp(phone, message),
            () =>
              Alert.alert('WhatsApp unavailable', 'Could not open WhatsApp.'),
          );
        }
      },
      [profile, runLaunch],
    );

    /* One number → act directly. Two or more → open the picker. */
    const requestPhoneAction = useCallback(
      (action: PhoneAction) => {
        if (!profile) return;
        const [only, ...rest] = profile.phones;
        if (!only) return;
        if (rest.length === 0) {
          performPhoneAction(action, only.value);
          return;
        }
        setPhoneAction(action);
      },
      [profile, performPhoneAction],
    );

    const handleCall = useCallback(
      () => requestPhoneAction('call'),
      [requestPhoneAction],
    );

    const handleWhatsApp = useCallback(
      () => requestPhoneAction('whatsapp'),
      [requestPhoneAction],
    );

    const handleEmail = useCallback(() => {
      if (!profile?.email) return;
      const payload = {
        to: profile.email,
        subject: profile.emailSubject,
        body: profile.emailBody,
      };
      runLaunch(
        () => sendEmail(payload),
        () => Alert.alert('Email unavailable', 'No email app configured.'),
      );
    }, [profile, runLaunch]);

    const handlePickerSelect = useCallback(
      (phone: string) => {
        const action = phoneAction;
        setPhoneAction(null);
        if (action) performPhoneAction(action, phone);
      },
      [phoneAction, performPhoneAction],
    );

    const handlePickerCancel = useCallback(() => setPhoneAction(null), []);

    /* ---------------- History (customers only) ---------------- */

    const customerId = contact?.kind === 'customer' ? contact.data.id : null;

    const handleViewHistory = useMemo(
      () =>
        customerId
          ? () => {
              pendingHistoryRef.current = customerId;
              internalRef.current?.dismiss();
            }
          : undefined,
      [customerId],
    );

    /* Runs once the close animation completes. Navigating here (one
     * frame later) avoids the destination mounting behind a sheet
     * that is still animating out. */
    const handleSheetDismiss = useCallback(() => {
      isOpenRef.current = false;
      setPhoneAction(null);
      onDismiss?.();

      const pendingCustomerId = pendingHistoryRef.current;
      pendingHistoryRef.current = null;
      if (pendingCustomerId) {
        requestAnimationFrame(() => {
          navigation.navigate('CustomerDetail', {
            customerId: pendingCustomerId,
          });
        });
      }
    }, [onDismiss, navigation]);

    const pickerTitle = profile
      ? `${phoneAction === 'whatsapp' ? 'WhatsApp' : 'Call'} ${profile.title}`
      : '';

    return (
      <>
        <BottomSheetModal
          ref={internalRef}
          snapPoints={snapPoints}
          index={0}
          enableDynamicSizing={false}
          enablePanDownToClose={false}
          backdropComponent={renderBackdrop}
          handleIndicatorStyle={styles.handle}
          backgroundStyle={styles.sheetBg}
          onChange={handleSheetChange}
          onDismiss={handleSheetDismiss}
        >
          <BottomSheetScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {profile ? (
              <ContactContent
                profile={profile}
                onCall={handleCall}
                onWhatsApp={handleWhatsApp}
                onEmail={handleEmail}
                onClose={close}
                onViewHistory={handleViewHistory}
              />
            ) : null}
          </BottomSheetScrollView>
        </BottomSheetModal>

        <PhoneNumberPickerSheet
          visible={phoneAction !== null && (profile?.phones.length ?? 0) > 1}
          title={pickerTitle}
          options={profile?.phones ?? []}
          onSelect={handlePickerSelect}
          onCancel={handlePickerCancel}
        />
      </>
    );
  },
);

DirectoryContactSheet.displayName = 'DirectoryContactSheet';

/* ------------------------------------------------------------------ */
/* Content                                                            */
/* ------------------------------------------------------------------ */

type ContentProps = {
  profile: ContactProfile;
  onCall: () => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  onClose: () => void;
  /** Present only when the role supports history (customers). */
  onViewHistory?: () => void;
};

const ContactContent: React.FC<ContentProps> = ({
  profile,
  onCall,
  onWhatsApp,
  onEmail,
  onClose,
  onViewHistory,
}) => {
  const avatar = avatarColorFor(profile.id);
  const hasPhone = profile.phones.length > 0;
  const hasEmail = profile.email !== null;
  const lastIndex = profile.fields.length - 1;

  return (
    <View>
      <Pressable
        onPress={onClose}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={({ pressed }) => [
          styles.closeBtn,
          pressed && styles.closePressed,
        ]}
      >
        <X size={16} color={Colors.textInverse} strokeWidth={2.5} />
      </Pressable>

      {/* Identity */}
      <View style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
          <Text style={[styles.avatarText, { color: avatar.fg }]}>
            {initials(profile.title)}
          </Text>
        </View>
        <Text style={styles.name} numberOfLines={2} accessibilityRole="header">
          {profile.title}
        </Text>
        {profile.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {profile.subtitle}
          </Text>
        ) : null}
        {profile.meta.map(m => {
          const MetaIcon = META_ICON[m.icon];
          return (
            <View key={m.key} style={styles.metaRow}>
              <MetaIcon size={13} color={Colors.textSecondary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {m.text}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Quick actions */}
      <View style={styles.quickRow}>
        <QuickAction
          label="Call"
          tint={CALL_TINT}
          onPress={onCall}
          disabled={!hasPhone}
          disabledHint="No phone number on file"
          icon={<Phone size={22} color={CALL_TINT.fg} strokeWidth={2.2} />}
        />
        <QuickAction
          label="WhatsApp"
          tint={WHATSAPP_TINT}
          onPress={onWhatsApp}
          disabled={!hasPhone}
          disabledHint="No phone number on file"
          icon={<WhatsAppIcon size={22} color={WHATSAPP_TINT.fg} />}
        />
        <QuickAction
          label="Email"
          tint={EMAIL_TINT}
          onPress={onEmail}
          disabled={!hasEmail}
          disabledHint="No email address on file"
          icon={<Mail size={22} color={EMAIL_TINT.fg} strokeWidth={2.2} />}
        />
      </View>

      {/* Info card */}
      <View style={styles.infoCard}>
        {profile.fields.map((field, i) => (
          <InfoRow key={field.key} field={field} last={i === lastIndex} />
        ))}
      </View>

      {onViewHistory ? (
        <Pressable
          onPress={onViewHistory}
          accessibilityRole="button"
          accessibilityLabel="View full history"
          style={({ pressed }) => [
            styles.historyBtn,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.historyBtnText}>View Full History</Text>
          <ChevronRight
            size={18}
            color={Colors.textInverse}
            strokeWidth={2.4}
          />
        </Pressable>
      ) : null}

      {/* Cancel — one of only two ways to close (with ×). */}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Cancel and close"
        style={({ pressed }) => [
          styles.cancelBtn,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* Sub-components                                                     */
/* ------------------------------------------------------------------ */

const QuickAction: React.FC<{
  label: string;
  icon: React.ReactNode;
  tint: { bg: string; fg: string };
  onPress: () => void;
  disabled: boolean;
  /** Read by screen readers when the action is disabled. */
  disabledHint: string;
}> = ({ label, icon, tint, onPress, disabled, disabledHint }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled }}
    accessibilityHint={disabled ? disabledHint : undefined}
    style={({ pressed }) => [
      styles.quickWrap,
      pressed && !disabled && styles.quickPressed,
      disabled && styles.quickDisabled,
    ]}
  >
    <View style={[styles.quickCircle, { backgroundColor: tint.bg }]}>
      {icon}
    </View>
    <Text style={[styles.quickLabel, { color: tint.fg }]}>{label}</Text>
  </Pressable>
);

const InfoRow: React.FC<{ field: ContactField; last: boolean }> = ({
  field,
  last,
}) => {
  const { Icon, bg, fg } = FIELD_STYLE[field.kind];
  return (
    <View
      style={[styles.infoRow, last && styles.infoRowLast]}
      accessible
      accessibilityLabel={`${field.label}: ${field.value}`}
    >
      <View style={[styles.infoIcon, { backgroundColor: bg }]}>
        <Icon size={16} color={fg} strokeWidth={2.2} />
      </View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{field.label}</Text>
        <Text
          style={[
            styles.infoValue,
            field.emphasis && styles.infoValueEmphasis,
            field.emphasis && { color: fg },
          ]}
          numberOfLines={1}
        >
          {field.value}
        </Text>
      </View>
    </View>
  );
};

/** WhatsApp brand glyph (lucide has no brand icons). */
const WhatsAppIcon: React.FC<{ size: number; color: string }> = ({
  size,
  color,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      fill={color}
      d="M20.52 3.48A11.9 11.9 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.62A11.94 11.94 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.19-1.25-6.19-3.48-8.52ZM12 21.82a9.83 9.83 0 0 1-5.02-1.37l-.36-.21-3.68.96.98-3.58-.24-.37A9.83 9.83 0 1 1 21.82 12 9.83 9.83 0 0 1 12 21.82Zm5.4-7.36c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15s-.77.96-.94 1.16c-.17.2-.35.22-.65.08-.3-.15-1.25-.46-2.38-1.47a8.9 8.9 0 0 1-1.65-2.05c-.17-.3 0-.45.13-.6.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.91-2.2-.24-.58-.49-.5-.67-.5H8c-.2 0-.52.07-.8.37-.28.3-1.05 1.02-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.13 3.26 5.16 4.57.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z"
    />
  </Svg>
);

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  handle: { backgroundColor: Colors.border, width: 44 },
  sheetBg: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  scrollContent: { paddingBottom: Spacing.xxl },

  closeBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CLOSE_BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    ...Shadows.xs,
  },
  closePressed: { transform: [{ scale: 0.94 }], opacity: 0.9 },

  /* Identity */
  identity: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.xs,
  },
  avatarText: { ...Typography.h2, fontWeight: '800', fontSize: 30 },
  name: {
    ...Typography.h4,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 2,
    maxWidth: '100%',
  },
  metaText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flexShrink: 1,
  },

  /* Quick actions */
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  quickWrap: { alignItems: 'center', gap: 8 },
  quickPressed: { transform: [{ scale: 0.96 }] },
  quickDisabled: { opacity: 0.4 },
  quickCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { ...Typography.caption, fontWeight: '700', fontSize: 12 },

  /* Info card */
  infoCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    ...Shadows.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextWrap: { flex: 1 },
  infoLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginTop: 1,
  },
  infoValueEmphasis: { fontWeight: '700' },

  /* Footer */
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    ...Shadows.xs,
  },
  historyBtnText: {
    ...Typography.body,
    color: Colors.textInverse,
    fontWeight: '700',
    fontSize: 16,
  },
  buttonPressed: { opacity: 0.85 },
  cancelBtn: {
    alignSelf: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  cancelText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '700',
  },
});
