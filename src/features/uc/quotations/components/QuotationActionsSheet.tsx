/**
 * ------------------------------------------------------------------
 * QuotationActionsSheet — kebab (⋮) menu for a UC quotation card
 * ------------------------------------------------------------------
 *
 *   ┌──────────────────────────────────────────────┐
 *   │                    ────                      │
 *   │ #QU-2026-563698                 [Accepted]   │
 *   │ Rahul Sharma                                 │
 *   │ 📞 +91 98765 43210                            │
 *   │ ✉ rahul.sharma@example.com   (if on file)    │
 *   │ ┌────────┐ ┌──────────┐ ┌────────┐           │
 *   │ │   📞   │ │    🟢    │ │   ✉    │           │
 *   │ │  Call  │ │ WhatsApp │ │ Email  │           │
 *   │ └────────┘ └──────────┘ └────────┘           │
 *   └──────────────────────────────────────────────┘
 *
 * Actions: Call, WhatsApp, and Email ONLY when the quotation has a
 * customer email (`customerEmail`). With no email the row shows two
 * cards that share the width.
 *
 * The action row is the shared `QuickActions` ('card' variant) from
 * the directory contact sheets, so Call / WhatsApp / Email look the
 * same everywhere in the UC app.
 *
 * Each action closes the sheet, then opens the dialer / WhatsApp /
 * mail app. A ref blocks a second launch while one is resolving
 * (a fast double tap would otherwise open the app twice).
 *
 * Content-sized (dynamic sizing): never needs a scroll.
 * ------------------------------------------------------------------
 */

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Phone } from 'lucide-react-native';

import { Colors, FontWeight, Radius, Spacing, Typography } from '@theme';
import { makePhoneCall, openWhatsApp, sendEmail } from '@services/contact';
import { QuickActions } from '@features/uc/_directory';

import { UC_QUOTATION_STATUS_LABEL, type UcQuotationListItem } from '../types';
import { STATUS_TONE } from '../utils/format';

type Props = {
  quotation: UcQuotationListItem | null;
  onDismiss?: () => void;
};

type LaunchResult = { ok: boolean };

/** Trimmed email, or null when missing / blank. */
function emailOf(q: UcQuotationListItem): string | null {
  const email = q.customerEmail?.trim();
  return email ? email : null;
}

export const QuotationActionsSheet = forwardRef<BottomSheetModal, Props>(
  ({ quotation, onDismiss }, ref) => {
    const sheetRef = useRef<BottomSheetModal>(null);
    useImperativeHandle(ref, () => sheetRef.current as BottomSheetModal, []);
    const insets = useSafeAreaInsets();

    /* Blocks a second launch while one is still resolving. */
    const launchingRef = useRef(false);

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

    const runLaunch = useCallback(
      async (launch: () => Promise<LaunchResult>, onFail: () => void) => {
        if (launchingRef.current) return;
        launchingRef.current = true;
        close();
        try {
          const result = await launch();
          if (!result.ok) onFail();
        } catch {
          onFail();
        } finally {
          launchingRef.current = false;
        }
      },
      [close],
    );

    const handleCall = useCallback(() => {
      if (!quotation) return;
      const phone = quotation.customerPhone;
      runLaunch(
        () => makePhoneCall(phone),
        () => Alert.alert('Cannot place call', 'Dialer unavailable.'),
      );
    }, [quotation, runLaunch]);

    const handleWhatsApp = useCallback(() => {
      if (!quotation) return;
      const phone = quotation.customerPhone;
      const firstName = quotation.customerName.split(' ')[0];
      const message = `Hi ${firstName}, this is Urban Cruise regarding your quotation #${quotation.quotationNumber}.`;
      runLaunch(
        () => openWhatsApp(phone, message),
        () => Alert.alert('WhatsApp unavailable', 'Could not open WhatsApp.'),
      );
    }, [quotation, runLaunch]);

    const handleEmail = useCallback(() => {
      if (!quotation) return;
      const to = emailOf(quotation);
      if (!to) return;
      const firstName = quotation.customerName.split(' ')[0];
      const payload = {
        to,
        subject: `Your Urban Cruise quotation #${quotation.quotationNumber}`,
        body: `Hi ${firstName},\n\nThis is Urban Cruise regarding your quotation #${quotation.quotationNumber}.\n\n`,
      };
      runLaunch(
        () => sendEmail(payload),
        () => Alert.alert('Email unavailable', 'No email app configured.'),
      );
    }, [quotation, runLaunch]);

    const tone = quotation ? STATUS_TONE[quotation.status] : null;
    const email = quotation ? emailOf(quotation) : null;
    const hasPhone = !!quotation && quotation.customerPhone.trim().length > 0;

    return (
      <BottomSheetModal
        ref={sheetRef}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheetBg}
        onDismiss={onDismiss}
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
              {/* Quotation + customer */}
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <Text
                    style={styles.title}
                    numberOfLines={1}
                    accessibilityRole="header"
                  >
                    #{quotation.quotationNumber}
                  </Text>
                  <View style={[styles.pill, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.pillText, { color: tone.fg }]}>
                      {UC_QUOTATION_STATUS_LABEL[quotation.status]}
                    </Text>
                  </View>
                </View>

                <Text style={styles.customerName} numberOfLines={1}>
                  {quotation.customerName}
                </Text>

                {hasPhone ? (
                  <View style={styles.detailRow}>
                    <Phone
                      size={14}
                      color={Colors.textSecondary}
                      strokeWidth={2}
                    />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {quotation.customerPhone}
                    </Text>
                  </View>
                ) : null}

                {email ? (
                  <View style={styles.detailRow}>
                    <Mail
                      size={14}
                      color={Colors.textSecondary}
                      strokeWidth={2}
                    />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {email}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Call / WhatsApp / Email (only when on file) */}
              <QuickActions
                variant="card"
                hasPhone={hasPhone}
                hasEmail={email !== null}
                hideUnavailableEmail
                onCall={handleCall}
                onWhatsApp={handleWhatsApp}
                onEmail={handleEmail}
              />
            </>
          ) : null}
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

QuotationActionsSheet.displayName = 'QuotationActionsSheet';

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
  /* No horizontal padding: QuickActions brings its own (Spacing.lg),
   * so the header uses the same inset to line up with the cards. */
  content: {
    paddingTop: Spacing.xs,
  },

  header: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  title: {
    ...Typography.title,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
    flex: 1,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  pillText: {
    ...Typography.label,
    fontWeight: FontWeight.semiBold,
  },
  customerName: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: FontWeight.semiBold,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + Spacing.xxs,
  },
  detailText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
});
