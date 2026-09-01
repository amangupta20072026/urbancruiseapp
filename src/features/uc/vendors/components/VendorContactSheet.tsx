/* eslint-disable react-native/no-inline-styles */
/**
 * ------------------------------------------------------------------
 * VendorContactSheet
 * ------------------------------------------------------------------
 * Bottom sheet shown when the user taps a row in Directory > Vendors.
 * Modeled on CustomerContactSheet — same quick-actions row (Call /
 * WhatsApp / Email), same phone-picker for vendors with two lines.
 *
 * Info block matches the customer sheet's design:
 *   - Colored circular icon backgrounds per row (semantic tinting).
 *   - UPPERCASE small labels, bold values.
 *   - Hairline dividers between rows, suppressed on the last row.
 * ------------------------------------------------------------------
 */

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import {
  Phone,
  Mail,
  Building2,
  MapPin,
  Calendar,
  BadgeCheck,
  Truck,
  UserCheck,
  X,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { makePhoneCall, openWhatsApp, sendEmail } from '@services/contact';
import { avatarColorFor, initials } from '@features/uc/_directory';

import { VENDOR_STATUS_LABEL, type Vendor } from '../types';
import { VendorNumberPickerSheet } from './VendorNumberPickerSheet';

type Props = {
  vendor: Vendor | null;
  onDismiss?: () => void;
};

/* Soft-tinted quick-action colours — match CustomerContactSheet. */
const CALL_TINT_BG = '#EAF2FF';
const CALL_TINT_FG = '#1D6BFF';
const WHATSAPP_TINT_BG = '#E3F9EA';
const WHATSAPP_TINT_FG = '#1FA855';
const EMAIL_TINT_BG = '#FFF1E0';
const EMAIL_TINT_FG = '#D97B0A';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const WhatsAppIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 22,
  color = '#fff',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      fill={color}
      d="M20.52 3.48A11.9 11.9 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.62A11.94 11.94 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.19-1.25-6.19-3.48-8.52ZM12 21.82a9.83 9.83 0 0 1-5.02-1.37l-.36-.21-3.68.96.98-3.58-.24-.37A9.83 9.83 0 1 1 21.82 12 9.83 9.83 0 0 1 12 21.82Zm5.4-7.36c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15s-.77.96-.94 1.16c-.17.2-.35.22-.65.08-.3-.15-1.25-.46-2.38-1.47a8.9 8.9 0 0 1-1.65-2.05c-.17-.3 0-.45.13-.6.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.91-2.2-.24-.58-.49-.5-.67-.5H8c-.2 0-.52.07-.8.37-.28.3-1.05 1.02-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.13 3.26 5.16 4.57.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z"
    />
  </Svg>
);

export const VendorContactSheet = forwardRef<BottomSheetModal, Props>(
  ({ vendor, onDismiss }, ref) => {
    const internalRef = useRef<BottomSheetModal>(null);
    useImperativeHandle(ref, () => internalRef.current as BottomSheetModal, []);

    const snapPoints = useMemo(() => ['70%'], []);

    const [phoneAction, setPhoneAction] = useState<'call' | 'whatsapp' | null>(
      null,
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.55}
          pressBehavior="close"
        />
      ),
      [],
    );

    const dialNumber = useCallback(async (phone: string) => {
      const r = await makePhoneCall(phone);
      if (!r.ok) Alert.alert('Cannot place call', 'Dialer unavailable.');
    }, []);

    const whatsappNumber = useCallback(
      async (phone: string) => {
        if (!vendor) return;
        const r = await openWhatsApp(
          phone,
          `Hi, this is Urban Cruise reaching out regarding ${vendor.companyName}.`,
        );
        if (!r.ok)
          Alert.alert('WhatsApp unavailable', 'Could not open WhatsApp.');
      },
      [vendor],
    );

    const handleCall = useCallback(() => {
      if (!vendor) return;
      if (!vendor.phoneAlt || vendor.phone === vendor.phoneAlt) {
        dialNumber(vendor.phone);
        return;
      }
      setPhoneAction('call');
    }, [vendor, dialNumber]);

    const handleWhatsApp = useCallback(() => {
      if (!vendor) return;
      if (!vendor.phoneAlt || vendor.phone === vendor.phoneAlt) {
        whatsappNumber(vendor.phone);
        return;
      }
      setPhoneAction('whatsapp');
    }, [vendor, whatsappNumber]);

    const handlePickerSelect = useCallback(
      (phone: string) => {
        const action = phoneAction;
        setPhoneAction(null);
        if (action === 'call') {
          dialNumber(phone);
        } else if (action === 'whatsapp') {
          whatsappNumber(phone);
        }
      },
      [phoneAction, dialNumber, whatsappNumber],
    );

    const handlePickerCancel = useCallback(() => {
      setPhoneAction(null);
    }, []);

    const handleEmail = useCallback(async () => {
      if (!vendor) return;
      const r = await sendEmail({
        to: vendor.email,
        subject: 'Urban Cruise — Vendor follow up',
        body: `Hi ${vendor.ownerName.split(' ')[0]},\n\n`,
      });
      if (!r.ok) Alert.alert('Email unavailable', 'No email app configured.');
    }, [vendor]);

    return (
      <>
        <BottomSheetModal
          ref={internalRef}
          snapPoints={snapPoints}
          index={0}
          enableDynamicSizing={false}
          backdropComponent={renderBackdrop}
          handleIndicatorStyle={styles.handle}
          backgroundStyle={styles.sheetBg}
          onDismiss={onDismiss}
          enablePanDownToClose
        >
          <BottomSheetScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {vendor && (
              <VendorSheetContent
                vendor={vendor}
                onCall={handleCall}
                onWhatsApp={handleWhatsApp}
                onEmail={handleEmail}
                onClose={() => internalRef.current?.dismiss()}
              />
            )}
          </BottomSheetScrollView>
        </BottomSheetModal>

        {vendor && vendor.phoneAlt && (
          <VendorNumberPickerSheet
            open={phoneAction !== null}
            vendor={vendor}
            action={phoneAction}
            onSelect={handlePickerSelect}
            onCancel={handlePickerCancel}
          />
        )}
      </>
    );
  },
);

VendorContactSheet.displayName = 'VendorContactSheet';

/* ------------------------------------------------------------------ */
/* Sheet body                                                         */
/* ------------------------------------------------------------------ */

type ContentProps = {
  vendor: Vendor;
  onCall: () => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  onClose: () => void;
};

const VendorSheetContent: React.FC<ContentProps> = ({
  vendor,
  onCall,
  onWhatsApp,
  onEmail,
  onClose,
}) => {
  const c = avatarColorFor(vendor.id);

  return (
    <View>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={[styles.avatarLg, { backgroundColor: c.bg }]}>
          <Text style={[styles.avatarLgText, { color: c.fg }]}>
            {initials(vendor.companyName)}
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            {vendor.companyName}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {vendor.ownerName}
          </Text>
          <View style={styles.statusRow}>
            <BadgeCheck size={13} color={Colors.textSecondary} />
            <Text style={styles.statusText}>
              {VENDOR_STATUS_LABEL[vendor.status]}
            </Text>
          </View>
        </View>
        <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
          <X size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {/* Quick actions */}
      <View style={styles.quickRow}>
        <QuickAction
          label="Call"
          onPress={onCall}
          bg={CALL_TINT_BG}
          fg={CALL_TINT_FG}
          icon={<Phone size={22} color={CALL_TINT_FG} />}
        />
        <QuickAction
          label="WhatsApp"
          onPress={onWhatsApp}
          bg={WHATSAPP_TINT_BG}
          fg={WHATSAPP_TINT_FG}
          icon={<WhatsAppIcon color={WHATSAPP_TINT_FG} />}
        />
        <QuickAction
          label="Email"
          onPress={onEmail}
          bg={EMAIL_TINT_BG}
          fg={EMAIL_TINT_FG}
          icon={<Mail size={22} color={EMAIL_TINT_FG} />}
        />
      </View>

      {/* Info card */}
      <View style={styles.infoBlock}>
        <InfoRow Icon={Phone} label="Primary phone" value={vendor.phone} />
        {vendor.phoneAlt && (
          <InfoRow
            Icon={Phone}
            label="Secondary phone"
            value={vendor.phoneAlt}
          />
        )}
        <InfoRow Icon={Mail} label="Email" value={vendor.email} />
        <InfoRow Icon={MapPin} label="City" value={vendor.city} />
        {vendor.gstin && (
          <InfoRow Icon={Building2} label="GSTIN" value={vendor.gstin} />
        )}
        <InfoRow
          Icon={Truck}
          label="Vehicles"
          value={`${vendor.vehicleCount}`}
        />
        <InfoRow
          Icon={UserCheck}
          label="Drivers"
          value={`${vendor.driverCount}`}
        />
        <InfoRow
          Icon={Calendar}
          label="Onboarded"
          value={fmtDate(vendor.createdAt)}
          last
        />
      </View>
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* Sub-components                                                     */
/* ------------------------------------------------------------------ */

type QuickActionProps = {
  label: string;
  onPress: () => void;
  bg: string;
  fg: string;
  icon: React.ReactNode;
};

const QuickAction: React.FC<QuickActionProps> = ({
  label,
  onPress,
  bg,
  fg,
  icon,
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.8 }]}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <View style={[styles.quickIcon, { backgroundColor: bg }]}>{icon}</View>
    <Text style={[styles.quickLabel, { color: fg }]}>{label}</Text>
  </Pressable>
);

/* --- InfoRow with semantic tinting --- */

const ROW_TINT: Record<string, { bg: string; fg: string }> = {
  Phone: { bg: '#E7F7EC', fg: Colors.primary },
  Mail: { bg: '#FFF1E0', fg: '#FB8C00' },
  MapPin: { bg: '#EDF2FF', fg: '#3B82F6' },
  Building2: { bg: '#FFF7E6', fg: '#B45309' },
  BadgeCheck: { bg: '#F1F3F5', fg: Colors.textSecondary },
  Calendar: { bg: '#F1F3F5', fg: Colors.textSecondary },
  Truck: { bg: '#EEF2FF', fg: '#4F46E5' },
  UserCheck: { bg: '#E7F7EC', fg: Colors.success },
  UserCog: { bg: '#EEF2FF', fg: '#4F46E5' },
  CreditCard: { bg: '#EEF2FF', fg: '#4F46E5' },
  IdCard: { bg: '#EEF2FF', fg: '#4F46E5' },
  Briefcase: { bg: '#E7F7EC', fg: Colors.success },
};

const NEUTRAL_TINT = { bg: '#F1F3F5', fg: Colors.textSecondary };

type InfoRowProps = {
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
};

const InfoRow: React.FC<InfoRowProps> = ({
  Icon,
  label,
  value,
  valueColor,
  last,
}) => {
  const key = Icon.displayName ?? (Icon as { name?: string }).name ?? '';
  const tint = ROW_TINT[key] ?? NEUTRAL_TINT;

  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <View style={[styles.infoIcon, { backgroundColor: tint.bg }]}>
        <Icon size={16} color={tint.fg} strokeWidth={2.2} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text
          style={[
            styles.infoValue,
            valueColor ? { color: valueColor, fontWeight: '700' } : null,
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  handle: { backgroundColor: Colors.border, width: 40 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  avatarLg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLgText: {
    ...Typography.h3,
    fontWeight: '700',
  },
  headerText: { flex: 1, gap: 2 },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  closeBtn: {
    padding: 6,
    marginRight: -6,
  },

  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  quickAction: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  quickIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.xs,
  },
  quickLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },

  /* Info card — matches CustomerContactSheet */
  infoBlock: {
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
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1 },
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
});
