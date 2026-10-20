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
 *   - Layout: chosen by the profile, never by the role here:
 *       'list'     — centred avatar + name, one list of rows
 *                    (customers, staff, drivers);
 *       'sections' — SectionedContactContent (vendors).
 *     Both have the red × close button.
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
  User,
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
import { SectionedContactContent } from './SectionedContactContent';
import {
  CancelButton,
  CloseButton,
  QuickActions,
  type ContactActions,
} from './contactVisuals';
import type {
  ContactField,
  ContactFieldKind,
  ContactMetaIcon,
  ContactProfile,
  DirectoryContact,
  ListContactProfile,
} from './types';

type Props = {
  /** The record to show; null while nothing is selected. */
  contact: DirectoryContact | null;
  /** Fires after the close animation completes. */
  onDismiss?: () => void;
};

type PhoneAction = 'call' | 'whatsapp';

/* ------------------------------------------------------------------ */
/* Visual tokens (list layout)                                        */
/* ------------------------------------------------------------------ */

/** Icon + tint per info-row kind (list layout). */
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
            {profile?.layout === 'sections' ? (
              <SectionedContactContent
                profile={profile}
                onCall={handleCall}
                onWhatsApp={handleWhatsApp}
                onEmail={handleEmail}
                onClose={close}
              />
            ) : profile?.layout === 'list' ? (
              <ListContactContent
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
/* List layout (customers, staff, drivers)                            */
/* ------------------------------------------------------------------ */

type ListContentProps = ContactActions & {
  profile: ListContactProfile;
  /** Present only when the role supports history (customers). */
  onViewHistory?: () => void;
};

const ListContactContent: React.FC<ListContentProps> = ({
  profile,
  onCall,
  onWhatsApp,
  onEmail,
  onClose,
  onViewHistory,
}) => {
  const avatar = avatarColorFor(profile.id);
  const lastIndex = profile.fields.length - 1;

  return (
    <View>
      <CloseButton onPress={onClose} />

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
          // Up to 2 lines, like the title.
          <Text style={styles.subtitle} numberOfLines={2}>
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

      <QuickActions
        variant="plain"
        hasPhone={profile.phones.length > 0}
        hasEmail={profile.email !== null}
        onCall={onCall}
        onWhatsApp={onWhatsApp}
        onEmail={onEmail}
      />

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

      <CancelButton onPress={onClose} />
    </View>
  );
};

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
});
