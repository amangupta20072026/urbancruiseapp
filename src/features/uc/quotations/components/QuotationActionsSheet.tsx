/**
 * ------------------------------------------------------------------
 * QuotationActionsSheet — kebab (⋮) menu for a UC quotation card
 * ------------------------------------------------------------------
 * Actions:
 *   - Open quotation   → navigate (deferred until the sheet is gone)
 *   - Call customer    → system dialer
 *   - WhatsApp         → WhatsApp chat with a prefilled greeting
 *   - Copy quote ID    → clipboard + toast
 *
 * Navigation is deferred to `onDismiss` (same invariant as MoreSheet
 * and CustomerContactSheet): the destination screen must not mount
 * while the sheet is still animating out.
 *
 * Content-sized (dynamic sizing) — four rows never need a scroll.
 * ------------------------------------------------------------------
 */

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import Clipboard from '@react-native-clipboard/clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Copy,
  FileText,
  MessageCircle,
  Phone,
  type LucideIcon,
} from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';
import { makePhoneCall, openWhatsApp } from '@services/contact';
import { toast } from '@services/toast';

import { UC_QUOTATION_STATUS_LABEL, type UcQuotationListItem } from '../types';
import { STATUS_TONE } from '../utils/format';

type Props = {
  quotation: UcQuotationListItem | null;
  /** Called after the sheet has fully closed with "Open quotation" chosen. */
  onOpenQuotation: (q: UcQuotationListItem) => void;
  onDismiss?: () => void;
};

export const QuotationActionsSheet = forwardRef<BottomSheetModal, Props>(
  ({ quotation, onOpenQuotation, onDismiss }, ref) => {
    const sheetRef = useRef<BottomSheetModal>(null);
    useImperativeHandle(ref, () => sheetRef.current as BottomSheetModal, []);
    const insets = useSafeAreaInsets();

    const pendingOpenRef = useRef(false);

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

    const close = useCallback(() => sheetRef.current?.dismiss(), []);

    const handleDismiss = useCallback(() => {
      const shouldOpen = pendingOpenRef.current;
      pendingOpenRef.current = false;
      const target = quotation;
      onDismiss?.();
      if (shouldOpen && target) {
        requestAnimationFrame(() => onOpenQuotation(target));
      }
    }, [quotation, onDismiss, onOpenQuotation]);

    const handleOpen = useCallback(() => {
      pendingOpenRef.current = true;
      close();
    }, [close]);

    const handleCall = useCallback(async () => {
      if (!quotation) return;
      close();
      const r = await makePhoneCall(quotation.customerPhone);
      if (!r.ok) Alert.alert('Cannot place call', 'Dialer unavailable.');
    }, [quotation, close]);

    const handleWhatsApp = useCallback(async () => {
      if (!quotation) return;
      close();
      const firstName = quotation.customerName.split(' ')[0];
      const r = await openWhatsApp(
        quotation.customerPhone,
        `Hi ${firstName}, this is Urban Cruise regarding your quotation #${quotation.quotationNumber}.`,
      );
      if (!r.ok)
        Alert.alert('WhatsApp unavailable', 'Could not open WhatsApp.');
    }, [quotation, close]);

    const handleCopy = useCallback(() => {
      if (!quotation) return;
      Clipboard.setString(quotation.quotationNumber);
      close();
      toast.success('Quotation ID copied', {
        description: `#${quotation.quotationNumber}`,
      });
    }, [quotation, close]);

    const tone = quotation ? STATUS_TONE[quotation.status] : null;

    return (
      <BottomSheetModal
        ref={sheetRef}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheetBg}
        onDismiss={handleDismiss}
        enablePanDownToClose
      >
        <BottomSheetView
          style={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, Spacing.lg) },
          ]}
        >
          {quotation && tone ? (
            <>
              <View style={styles.header}>
                <View style={styles.headerText}>
                  <Text style={styles.title} numberOfLines={1}>
                    #{quotation.quotationNumber}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {quotation.customerName}
                  </Text>
                </View>
                <View style={[styles.pill, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.pillText, { color: tone.fg }]}>
                    {UC_QUOTATION_STATUS_LABEL[quotation.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.list}>
                <ActionRow
                  Icon={FileText}
                  label="Open quotation"
                  fg={Colors.primaryDark}
                  bg={Colors.primaryTint}
                  onPress={handleOpen}
                />
                <ActionRow
                  Icon={Phone}
                  label="Call customer"
                  hint={quotation.customerPhone}
                  fg={Colors.info}
                  bg={Colors.infoTint}
                  onPress={handleCall}
                />
                <ActionRow
                  Icon={MessageCircle}
                  label="WhatsApp customer"
                  fg={Colors.success}
                  bg={Colors.successTint}
                  onPress={handleWhatsApp}
                />
                <ActionRow
                  Icon={Copy}
                  label="Copy quotation ID"
                  fg={Colors.secondaryDark}
                  bg={Colors.secondaryTint}
                  onPress={handleCopy}
                />
              </View>
            </>
          ) : null}
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

QuotationActionsSheet.displayName = 'QuotationActionsSheet';

/* ================================================================
 * Row
 * ================================================================ */

const ActionRow: React.FC<{
  Icon: LucideIcon;
  label: string;
  hint?: string;
  fg: string;
  bg: string;
  onPress: () => void;
}> = ({ Icon, label, hint, fg, bg, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <View style={[styles.rowIcon, { backgroundColor: bg }]}>
      <Icon size={18} color={fg} strokeWidth={2} />
    </View>
    <Text style={styles.rowLabel}>{label}</Text>
    {hint ? (
      <Text style={styles.rowHint} numberOfLines={1}>
        {hint}
      </Text>
    ) : null}
  </Pressable>
);

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  handle: { backgroundColor: Colors.border, width: 44 },
  sheetBg: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    gap: Spacing.lg,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerText: { flex: 1, gap: 2 },
  title: {
    ...Typography.title,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  pillText: {
    ...Typography.label,
    fontWeight: '600',
  },

  list: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  rowPressed: { backgroundColor: Colors.backgroundSecondary },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  rowHint: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    maxWidth: '45%',
  },
});
