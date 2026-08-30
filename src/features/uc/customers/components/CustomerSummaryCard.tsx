/**
 * ------------------------------------------------------------------
 * CustomerSummaryCard
 * ------------------------------------------------------------------
 * Sticky header for CustomerHistoryScreen. Shows *whose* history
 * the user is looking at without stealing scroll room from the
 * trip list below.
 *
 * Layout:
 *
 *   ┌───────────────────────────────────────────────────────────┐
 *   │  [KM]  Karan Mehta                     ⚙ ⚙ ⚙              │
 *   │        +91 1499895284                Call WA  Email       │
 *   │        Corporate · Company                                │
 *   └───────────────────────────────────────────────────────────┘
 *
 * Behaviour:
 *   - Tap Call / WhatsApp → opens NumberPickerSheet if the two
 *     phones differ, otherwise dials the shared number directly.
 *     (Same rule as CustomerContactSheet — reuses NumberPickerSheet.)
 *   - Tap Email → opens the mail composer with a pre-filled subject.
 *   - No "View history" button here — this component IS on the
 *     history screen already.
 *
 * Made sticky by the parent screen via FlashList's stickyHeaderIndices
 * — this component doesn't know or care that it's sticky.
 * ------------------------------------------------------------------ */

import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Phone, Mail } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { makePhoneCall, openWhatsApp, sendEmail } from '@services/contact';

import {
  CUSTOMER_CATEGORY_LABEL,
  CUSTOMER_SUBTYPE_LABEL,
  type Customer,
} from '../types';
import { avatarColorFor, initials } from '../utils/avatar';
import { NumberPickerSheet } from './NumberPickerSheet';

type Props = {
  customer: Customer;
};

/* Soft-tinted quick-action colours — same palette as the contact sheet
 * so the two surfaces feel like one system. */
const CALL_TINT_BG = '#E7F7EC';
const CALL_TINT_FG = '#049856';
const WHATSAPP_TINT_BG = '#E3F9EA';
const WHATSAPP_TINT_FG = '#1FA855';
const EMAIL_TINT_BG = '#FFF1E0';
const EMAIL_TINT_FG = '#D97B0A';

/* Real WhatsApp brand mark (same SVG used in CustomerContactSheet). */
const WhatsAppIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 18,
  color = '#fff',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      fill={color}
      d="M20.52 3.48A11.9 11.9 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.62A11.94 11.94 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.19-1.25-6.19-3.48-8.52ZM12 21.82a9.83 9.83 0 0 1-5.02-1.37l-.36-.21-3.68.96.98-3.58-.24-.37A9.83 9.83 0 1 1 21.82 12 9.83 9.83 0 0 1 12 21.82Zm5.4-7.36c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15s-.77.96-.94 1.16c-.17.2-.35.22-.65.08-.3-.15-1.25-.46-2.38-1.47a8.9 8.9 0 0 1-1.65-2.05c-.17-.3 0-.45.13-.6.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.91-2.2-.24-.58-.49-.5-.67-.5H8c-.2 0-.52.07-.8.37-.28.3-1.05 1.02-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.13 3.26 5.16 4.57.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z"
    />
  </Svg>
);

export const CustomerSummaryCard: React.FC<Props> = ({ customer }) => {
  const avatar = avatarColorFor(customer.id);

  /* -------- Phone-number picker (same pattern as CustomerContactSheet) ------ */

  const [phoneAction, setPhoneAction] = useState<'call' | 'whatsapp' | null>(
    null,
  );

  const dialNumber = useCallback(async (phone: string) => {
    const r = await makePhoneCall(phone);
    if (!r.ok) Alert.alert('Cannot place call', 'Dialer unavailable.');
  }, []);

  const whatsappNumber = useCallback(
    async (phone: string) => {
      const r = await openWhatsApp(
        phone,
        `Hi ${customer.name.split(' ')[0]}, this is Urban Cruise.`,
      );
      if (!r.ok)
        Alert.alert('WhatsApp unavailable', 'Could not open WhatsApp.');
    },
    [customer.name],
  );

  const handleCall = useCallback(() => {
    if (customer.phoneIndia === customer.phoneGlobal) {
      dialNumber(customer.phoneIndia);
      return;
    }
    setPhoneAction('call');
  }, [customer, dialNumber]);

  const handleWhatsApp = useCallback(() => {
    if (customer.phoneIndia === customer.phoneGlobal) {
      whatsappNumber(customer.phoneIndia);
      return;
    }
    setPhoneAction('whatsapp');
  }, [customer, whatsappNumber]);

  const handleEmail = useCallback(async () => {
    const r = await sendEmail({
      to: customer.email,
      subject: 'Urban Cruise — Follow up',
      body: `Hi ${customer.name.split(' ')[0]},\n\n`,
    });
    if (!r.ok) Alert.alert('Email unavailable', 'No email app configured.');
  }, [customer]);

  const handlePickerSelect = useCallback(
    (phone: string) => {
      const action = phoneAction;
      setPhoneAction(null);
      if (action === 'call') dialNumber(phone);
      else if (action === 'whatsapp') whatsappNumber(phone);
    },
    [phoneAction, dialNumber, whatsappNumber],
  );

  const handlePickerCancel = useCallback(() => {
    setPhoneAction(null);
  }, []);

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
          <Text style={[styles.avatarText, { color: avatar.fg }]}>
            {initials(customer.name)}
          </Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {customer.name}
          </Text>
          <Text style={styles.phone} numberOfLines={1}>
            {customer.phoneIndia}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {CUSTOMER_CATEGORY_LABEL[customer.category]} ·{' '}
            {CUSTOMER_SUBTYPE_LABEL[customer.customerType]}
          </Text>
        </View>

        <View style={styles.actions}>
          <QuickAction
            label="Call"
            bg={CALL_TINT_BG}
            fg={CALL_TINT_FG}
            onPress={handleCall}
            icon={<Phone size={16} color={CALL_TINT_FG} strokeWidth={2.2} />}
          />
          <QuickAction
            label="WhatsApp"
            bg={WHATSAPP_TINT_BG}
            fg={WHATSAPP_TINT_FG}
            onPress={handleWhatsApp}
            icon={<WhatsAppIcon size={16} color={WHATSAPP_TINT_FG} />}
          />
          <QuickAction
            label="Email"
            bg={EMAIL_TINT_BG}
            fg={EMAIL_TINT_FG}
            onPress={handleEmail}
            icon={<Mail size={16} color={EMAIL_TINT_FG} strokeWidth={2.2} />}
          />
        </View>
      </View>

      <NumberPickerSheet
        visible={phoneAction !== null}
        title={
          phoneAction === 'call'
            ? `Call ${customer.name}`
            : phoneAction === 'whatsapp'
            ? `WhatsApp ${customer.name}`
            : ''
        }
        phoneIndia={customer.phoneIndia}
        phoneGlobal={customer.phoneGlobal}
        onSelect={handlePickerSelect}
        onCancel={handlePickerCancel}
      />
    </View>
  );
};

/* ---------------- Sub-components ---------------- */

const QuickAction: React.FC<{
  label: string;
  icon: React.ReactNode;
  bg: string;
  fg: string;
  onPress: () => void;
}> = ({ label, icon, bg, fg, onPress }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={({ pressed }) => [styles.quickWrap, pressed && styles.quickPressed]}
  >
    <View style={[styles.quickCircle, { backgroundColor: bg }]}>{icon}</View>
    <Text style={[styles.quickLabel, { color: fg }]} numberOfLines={1}>
      {label}
    </Text>
  </Pressable>
);

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  /* Wrap gives the sticky-headered card a solid background — otherwise
   * the FlashList rows would show through when they scroll under it. */
  wrap: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    ...Shadows.xs,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.body,
    fontWeight: '700',
    fontSize: 16,
  },

  body: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  phone: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  meta: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 1,
  },

  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickWrap: {
    alignItems: 'center',
    gap: 2,
  },
  quickPressed: {
    opacity: 0.7,
  },
  quickCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    ...Typography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
});
