/**
 * ------------------------------------------------------------------
 * PaymentDetailSheet — bottom-sheet payment details (customer)
 * ------------------------------------------------------------------
 * Replaces the former standalone PaymentDetailScreen. Presented from
 * PaymentsScreen when the user taps a payment card.
 *
 * LAYOUT (top → bottom, per the product mockup):
 *
 *   ┌─────────────────────────────────────────────┐
 *   │  Payment Details                          × │  ← pinned header
 *   ├─────────────────────────────────────────────┤
 *   │              ┌──┐                            │
 *   │              │✓ │                            │
 *   │              └──┘                            │
 *   │        Payment Successful                    │  ← status hero
 *   │  Your payment has been completed…            │
 *   │                                              │
 *   │  ┌───────────────────────────────────────┐   │
 *   │  │        Amount Paid                    │   │
 *   │  │        ₹18,500                        │   │  ← amount card
 *   │  │  Rupees Eighteen Thousand … Only      │   │
 *   │  └───────────────────────────────────────┘   │
 *   │                                              │
 *   │  Payment Summary                             │
 *   │  Payment Method              UPI (Google Pay)│
 *   │  Payment ID              pay_8f7d2e91f3   ⧉  │  ← copy rows
 *   │  Transaction ID     UC20260915094512      ⧉  │
 *   │  Paid On            15 Sept 2026 · 09:15 AM  │
 *   │                                              │
 *   │  🔒  This payment was processed securely …   │  ← security banner
 *   │                                              │
 *   │  [ ⬇ Download Receipt ] [ ⤴ Share Receipt ]  │  ← paid CTAs
 *   │                Close                         │  ← text CTA
 *   └─────────────────────────────────────────────┘
 *
 * WHY A SHEET, NOT A STACK SCREEN:
 *   The prior PaymentDetailScreen was a full-stack push. Product
 *   decided the payment detail is a lightweight lookup — read the
 *   IDs, copy one, dismiss — and doesn't warrant a nav push with its
 *   own history entry. Reads the same DTO, renders the same content,
 *   but lives inside a sheet so the payments list stays behind it and
 *   the back-swipe simply drops the sheet instead of navigating.
 *
 * THREE STATE VARIANTS:
 *   paid    — the mockup. Everything above renders.
 *   pending — status hero switches to "Payment Pending" copy, amount
 *             card renders in warning tint with the DUE amount, the
 *             Payment ID / Transaction ID rows render "—" (nothing
 *             has been charged), the security banner switches to an
 *             informational one, receipt CTAs are hidden, a Pay Now
 *             primary appears in their place.
 *   failed  — status hero switches to "Payment Failed" copy, amount
 *             card renders in error tint with the ATTEMPTED amount,
 *             attempted-instrument / txn rows render when present,
 *             an error banner surfaces the failure reason, and the
 *             sole CTA is a Contact Support primary button (product
 *             removed the Retry Payment button — recovery goes
 *             through the support channel, not an in-sheet retry).
 *
 * IMPERATIVE HANDLE:
 *   forwardRef<BottomSheetModal, Props> + useImperativeHandle so
 *   PaymentsScreen can `sheetRef.current?.present()` on card tap and
 *   `dismiss()` from anywhere inside the sheet. Matches the pattern
 *   used by NeedChangesSheet / ContinueToBookingSheet in the
 *   quotations feature — one convention across the app.
 *
 * DATA LOOKUP:
 *   The sheet takes a `paymentId` and reads the mock detail lazily on
 *   present. When /customer/payments/:id ships, replace the
 *   `getCustomerPaymentDetail(id)` call with a `useQuery` on
 *   presentation. The render below reads a plain
 *   `CustomerPaymentDetail`, so nothing else changes.
 *
 * CLIPBOARD:
 *   `@react-native-clipboard/clipboard` writes the value; the icon
 *   flips to a check for 1500ms as immediate visual feedback in
 *   addition to a toast. Same pattern the old detail screen used.
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
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Headphones,
  Info,
  Lock,
  Share2,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

import { getCustomerPaymentDetail } from '../mocks';
import type { CustomerPaymentDetail, PaymentStatus } from '../types';

/* ================================================================
 * Props
 * ================================================================ */

type Props = {
  /**
   * The payment to render. `null` is a valid resting state — the
   * caller sets this to the tapped payment id right before calling
   * `present()`, and can leave it null the rest of the time so the
   * sheet doesn't hold onto a stale record.
   */
  paymentId: string | null;

  /** Fired when the user taps "Download Receipt" on a paid payment. */
  onDownloadReceipt?: (payment: CustomerPaymentDetail) => void;

  /** Fired when the user taps "Share Receipt" on a paid payment. */
  onShareReceipt?: (payment: CustomerPaymentDetail) => void;

  /** Fired when the user taps "Pay Now" on a pending payment. */
  onPayNow?: (payment: CustomerPaymentDetail) => void;

  /** Fired when the user taps "Contact Support" on a failed payment. */
  onContactSupport?: (payment: CustomerPaymentDetail) => void;
};

/* ================================================================
 * Sheet configuration
 * ================================================================ */

/**
 * A single dynamic snap point. `enableDynamicSizing` lets the sheet
 * size itself to the content — the paid variant is tall, the pending
 * variant is short, and we don't want either to feel forced.
 * `'90%'` is the ceiling on very tall content so the drag handle is
 * always reachable without a second flick.
 */
const SNAP_POINTS = ['90%'];

/* ================================================================
 * Formatting helpers
 * ================================================================ */

/** Indian grouping, no decimals — "₹18,500". */
function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/** "15 Sept 2026". */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** "09:15 AM". */
function formatTime(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    .toUpperCase();
}

/** "15 Sept 2026 · 09:15 AM". */
function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

/**
 * Rupees → English words, Indian numbering (lakh/crore). Used for the
 * "Rupees Eighteen Thousand Five Hundred Only" caption under the big
 * amount. Handles integers up to 99,99,99,999.
 *
 * Kept private to this file — the format is very specific to a
 * receipt-style caption and has no other caller today. If a second
 * caller shows up, promote to a shared money utility.
 */
function rupeesToWords(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return '';
  const rupees = Math.floor(amount);
  if (rupees === 0) return 'Rupees Zero Only';

  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  const twoDigits = (n: number): string => {
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o === 0 ? tens[t] : `${tens[t]} ${ones[o]}`;
  };

  const threeDigits = (n: number): string => {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    const parts: string[] = [];
    if (h > 0) parts.push(`${ones[h]} Hundred`);
    if (rest > 0) parts.push(twoDigits(rest));
    return parts.join(' ');
  };

  /* Indian numbering: split into crore, lakh, thousand, hundred-and-
     below groups. Each non-empty group prints its number-name plus
     the scale label (except the final group). */
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const remainder = rupees % 1000;

  const parts: string[] = [];
  if (crore > 0) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh > 0) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${twoDigits(thousand)} Thousand`);
  if (remainder > 0) parts.push(threeDigits(remainder));

  return `Rupees ${parts.join(' ')} Only`;
}

/* ================================================================
 * Status → visual config
 *
 * Same config-driven approach the prior PaymentDetailScreen used —
 * one row per status, no cascading conditionals buried inside the
 * render. Adding a 'refunded' status later is one row here plus a
 * type-union widening in `types.ts`.
 * ================================================================ */

type StatusConfig = {
  /* Hero title + subtitle (top of sheet) */
  title: string;
  subtitle: string;

  /* Hero icon (large circle) */
  heroIcon: LucideIcon;
  heroFg: string;
  heroBg: string;

  /* Amount card tint */
  amountLabel: string;
  amountFg: string;
  amountBg: string;

  /* Security / status banner at the bottom of the summary */
  banner: {
    Icon: LucideIcon;
    fg: string;
    bg: string;
    title: string;
    body: string;
  };
};

const STATUS_CONFIG: Record<PaymentStatus, StatusConfig> = {
  paid: {
    title: 'Payment Successful',
    subtitle: 'Your payment has been completed successfully.',
    heroIcon: Check,
    heroFg: Colors.textOnPrimary,
    heroBg: Colors.primary,
    amountLabel: 'Amount Paid',
    amountFg: Colors.primary,
    amountBg: Colors.primaryTint,
    banner: {
      Icon: Lock,
      fg: Colors.primary,
      bg: Colors.primaryTint,
      title:
        'This payment was processed securely using an encrypted connection.',
      body: 'Your payment information is safe with us.',
    },
  },
  pending: {
    title: 'Payment Pending',
    subtitle: 'Complete the payment to confirm your booking.',
    heroIcon: Clock,
    heroFg: Colors.textOnPrimary,
    heroBg: Colors.warning,
    amountLabel: 'Amount Due',
    amountFg: Colors.warning,
    amountBg: Colors.warningTint,
    banner: {
      Icon: Info,
      fg: Colors.info,
      bg: Colors.infoTint,
      title: 'Payment is awaiting confirmation.',
      body: 'Complete the payment before the due window closes to avoid cancellation.',
    },
  },
  failed: {
    title: 'Payment Failed',
    subtitle: 'The payment could not be completed. Please try again.',
    heroIcon: XCircle,
    heroFg: Colors.textOnPrimary,
    heroBg: Colors.error,
    amountLabel: 'Amount Attempted',
    amountFg: Colors.error,
    amountBg: Colors.errorTint,
    banner: {
      Icon: AlertCircle,
      fg: Colors.error,
      bg: Colors.errorTint,
      title: 'The last payment attempt did not go through.',
      body: 'No amount was debited. Contact support if you need help completing the payment.',
    },
  },
};

/* ================================================================
 * Sheet
 * ================================================================ */

export const PaymentDetailSheet = forwardRef<BottomSheetModal, Props>(
  (
    {
      paymentId,
      onDownloadReceipt,
      onShareReceipt,
      onPayNow,
      onContactSupport,
    },
    ref,
  ) => {
    const internalRef = useRef<BottomSheetModal>(null);
    useImperativeHandle(ref, () => internalRef.current as BottomSheetModal, []);

    /* -------- Data -------- *
     *
     * The lookup is memoised on `paymentId` so a re-render triggered by
     * the copy-feedback timers (see below) doesn't re-scan the mock
     * fixture. When the endpoint ships, swap this for a `useQuery`
     * that suspends until `paymentId` is non-null. */
    const payment = useMemo<CustomerPaymentDetail | null>(
      () => (paymentId ? getCustomerPaymentDetail(paymentId) : null),
      [paymentId],
    );

    /* -------- Copy-feedback timers -------- *
     *
     * Two separate flags so tapping "copy" on Payment ID doesn't flash
     * the tick on Transaction ID (and vice versa). Timers are cleaned
     * up on unmount to avoid setState-on-unmounted warnings if the
     * sheet is dismissed mid-flash. */
    const [copiedPaymentId, setCopiedPaymentId] = useState(false);
    const [copiedTxnId, setCopiedTxnId] = useState(false);
    const paymentIdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );
    const txnIdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    React.useEffect(
      () => () => {
        if (paymentIdTimerRef.current) clearTimeout(paymentIdTimerRef.current);
        if (txnIdTimerRef.current) clearTimeout(txnIdTimerRef.current);
      },
      [],
    );

    const dismiss = useCallback(() => {
      internalRef.current?.dismiss();
    }, []);

    /* -------- Hardware back (Android) -------- *
     *
     * `BottomSheetModalProvider` is mounted above `NavigationContainer`
     * in App.tsx, so this sheet renders into a portal that sits outside
     * the navigator's screen tree. That means the navigator's default
     * hardware-back handling (pop the focused screen) runs untouched
     * while the sheet is open — the screen behind the sheet pops while
     * the sheet itself just keeps floating on top.
     *
     * `isOpenRef` mirrors the sheet's open/closed state (updated from
     * `onChange`, which BottomSheetModal fires with the current snap
     * index — a ref, not state, so this doesn't cause re-renders on
     * every animation frame). While the sheet is open, the listener
     * below swallows the back press entirely (`return true`, no other
     * effect) so neither the background screen navigates nor the sheet
     * moves — dismissal is only ever explicit, via the × icon or the
     * "Close" text button. */
    const isOpenRef = useRef(false);

    const handleSheetChange = useCallback((index: number) => {
      isOpenRef.current = index >= 0;
    }, []);

    useEffect(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          if (isOpenRef.current) {
            // Consume the event — intentionally do NOT dismiss here.
            // Closing is explicit-only (× icon / Close button).
            return true;
          }
          return false;
        },
      );
      return () => subscription.remove();
    }, []);

    /* -------- Copy handlers -------- */

    const onCopyPaymentId = useCallback(() => {
      if (!payment) return;
      Clipboard.setString(payment.id);
      setCopiedPaymentId(true);
      if (paymentIdTimerRef.current) clearTimeout(paymentIdTimerRef.current);
      paymentIdTimerRef.current = setTimeout(
        () => setCopiedPaymentId(false),
        1500,
      );
    }, [payment]);

    const onCopyTxnId = useCallback(() => {
      if (!payment?.transactionId) return;
      Clipboard.setString(payment.transactionId);
      setCopiedTxnId(true);
      if (txnIdTimerRef.current) clearTimeout(txnIdTimerRef.current);
      txnIdTimerRef.current = setTimeout(() => setCopiedTxnId(false), 1500);
    }, [payment]);

    /* -------- CTA handlers (dismiss-then-delegate) -------- *
     *
     * All CTAs dismiss the sheet first, then delegate to the parent
     * callback. Dismissing before firing the callback means the parent
     * can start a navigation push without racing the sheet's own
     * dismissal animation (which would otherwise cover the pushed
     * screen for a beat). */

    const handleDownloadReceipt = useCallback(() => {
      if (!payment) return;
      dismiss();
      onDownloadReceipt?.(payment);
    }, [payment, dismiss, onDownloadReceipt]);

    const handleShareReceipt = useCallback(() => {
      if (!payment) return;
      dismiss();
      onShareReceipt?.(payment);
    }, [payment, dismiss, onShareReceipt]);

    const handlePayNow = useCallback(() => {
      if (!payment) return;
      dismiss();
      onPayNow?.(payment);
    }, [payment, dismiss, onPayNow]);

    const handleContactSupport = useCallback(() => {
      if (!payment) return;
      dismiss();
      onContactSupport?.(payment);
    }, [payment, dismiss, onContactSupport]);

    /* -------- Backdrop -------- *
     *
     * Same opacity + press-to-close behaviour as the other sheets in
     * this codebase (NeedChangesSheet, ContinueToBookingSheet) so all
     * sheets feel like one thing. */
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

    /* -------- Render -------- */

    /* Guard: if the sheet was presented for an unknown id (stale ref
       after a mock fixture change, or an id that dropped out of the
       query cache) render an inline not-found body instead of
       crashing. Never expected in production, but the payments list
       and the sheet are lightly coupled so guarding cheaply is
       correct. */
    if (!payment) {
      return (
        <BottomSheetModal
          ref={internalRef}
          snapPoints={SNAP_POINTS}
          index={0}
          onChange={handleSheetChange}
          backdropComponent={renderBackdrop}
          handleIndicatorStyle={styles.handle}
          backgroundStyle={styles.sheetBg}
          enablePanDownToClose
          enableDynamicSizing={false}
        >
          <View style={styles.pinnedHeader}>
            <Text style={styles.headerTitle}>Payment Details</Text>
            <Pressable
              onPress={dismiss}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && styles.pressed,
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={22} color={Colors.textPrimary} strokeWidth={2.25} />
            </Pressable>
          </View>
          <View style={styles.notFoundBody}>
            <Text style={styles.notFoundTitle}>Payment not found</Text>
            <Text style={styles.notFoundSubtitle}>
              We couldn't find this payment. It may have been removed or the
              link is out of date.
            </Text>
          </View>
        </BottomSheetModal>
      );
    }

    const config = STATUS_CONFIG[payment.status];
    const HeroIcon = config.heroIcon;
    const BannerIcon = config.banner.Icon;

    return (
      <BottomSheetModal
        ref={internalRef}
        snapPoints={SNAP_POINTS}
        index={0}
        onChange={handleSheetChange}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheetBg}
        enablePanDownToClose
        enableDynamicSizing={false}
      >
        {/* Pinned header — stays visible while the body scrolls, so the
            X button and the "Payment Details" title are always
            reachable regardless of scroll position. */}
        <View style={styles.pinnedHeader}>
          <Text style={styles.headerTitle}>Payment Details</Text>
          <Pressable
            onPress={dismiss}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && styles.pressed,
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={22} color={Colors.textPrimary} strokeWidth={2.25} />
          </Pressable>
        </View>

        <BottomSheetScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero — status icon + title + subtitle ── */}
          <View style={styles.hero}>
            <View
              style={[styles.heroIconWrap, { backgroundColor: config.heroBg }]}
            >
              <HeroIcon size={28} color={config.heroFg} strokeWidth={3} />
            </View>
            <Text style={[styles.heroTitle, { color: config.amountFg }]}>
              {config.title}
            </Text>
            <Text style={styles.heroSubtitle}>{config.subtitle}</Text>
          </View>

          {/* ── Amount card ── */}
          <View
            style={[styles.amountCard, { backgroundColor: config.amountBg }]}
          >
            <Text style={styles.amountLabel}>{config.amountLabel}</Text>
            <Text style={[styles.amountValue, { color: config.amountFg }]}>
              {formatRupees(payment.amount)}
            </Text>
            <Text style={styles.amountWords}>
              {rupeesToWords(payment.amount)}
            </Text>
          </View>

          {/* ── Payment Summary — labelled rows ── *
           *
           * Rows are rendered by a small inline component so the JSX
           * stays declarative (see SummaryRow below). The dividers are
           * drawn by the row's own bottomBorder, so we don't have to
           * scatter Views between every pair. */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Payment Summary</Text>

            <SummaryRow
              label="Payment Method"
              value={payment.paymentMethod ?? '—'}
            />

            <SummaryRow
              label="Payment ID"
              value={payment.id}
              copy={{
                onPress: onCopyPaymentId,
                copied: copiedPaymentId,
                accessibilityLabel: 'Copy Payment ID',
              }}
              valueEmphasis
            />

            <SummaryRow
              label="Transaction ID"
              value={payment.transactionId ?? '—'}
              copy={
                payment.transactionId
                  ? {
                      onPress: onCopyTxnId,
                      copied: copiedTxnId,
                      accessibilityLabel: 'Copy Transaction ID',
                    }
                  : undefined
              }
              valueEmphasis={!!payment.transactionId}
            />

            <SummaryRow
              label={
                payment.status === 'paid'
                  ? 'Paid On'
                  : payment.status === 'pending'
                  ? 'Due Since'
                  : 'Attempted On'
              }
              value={formatDateTime(payment.paymentEventAt)}
              isLast
            />
          </View>

          {/* ── Status banner (security / info / error) ── */}
          <View style={[styles.banner, { backgroundColor: config.banner.bg }]}>
            <View
              style={[
                styles.bannerIconWrap,
                { backgroundColor: config.banner.fg },
              ]}
            >
              <BannerIcon
                size={16}
                color={Colors.textOnPrimary}
                strokeWidth={2.5}
              />
            </View>
            <View style={styles.bannerTextCol}>
              <Text style={[styles.bannerTitle, { color: config.banner.fg }]}>
                {config.banner.title}
              </Text>
              <Text style={styles.bannerBody}>{config.banner.body}</Text>
            </View>
          </View>

          {/* ── Bottom CTAs (state-dependent) ── */}
          {payment.status === 'paid' ? (
            <View style={styles.ctaRow}>
              <Pressable
                onPress={handleDownloadReceipt}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  styles.ctaRowItem,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Download receipt"
              >
                <Download
                  size={18}
                  color={Colors.textOnPrimary}
                  strokeWidth={2.25}
                />
                <Text style={styles.primaryBtnText}>Download Receipt</Text>
              </Pressable>

              <Pressable
                onPress={handleShareReceipt}
                style={({ pressed }) => [
                  styles.outlineBtn,
                  styles.ctaRowItem,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Share receipt"
              >
                <Share2 size={18} color={Colors.primary} strokeWidth={2.25} />
                <Text style={styles.outlineBtnText}>Share Receipt</Text>
              </Pressable>
            </View>
          ) : payment.status === 'pending' ? (
            <Pressable
              onPress={handlePayNow}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Pay now"
            >
              <Text style={styles.primaryBtnText}>Pay Now</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleContactSupport}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Contact support"
            >
              <Headphones
                size={18}
                color={Colors.textOnPrimary}
                strokeWidth={2.25}
              />
              <Text style={styles.primaryBtnText}>Contact Support</Text>
            </Pressable>
          )}

          <Pressable
            onPress={dismiss}
            style={({ pressed }) => [
              styles.textCloseBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Close payment details"
          >
            <Text style={styles.textCloseLabel}>Close</Text>
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

PaymentDetailSheet.displayName = 'PaymentDetailSheet';

/* ================================================================
 * SummaryRow
 *
 * One label/value row inside the Payment Summary card. Extracted as
 * its own component so the six rows in the render are a straight
 * declarative list — no per-row divider Views, no ternary noise.
 *
 * The optional `copy` prop turns the value into a copyable field with
 * a trailing tick/copy icon that flips for 1500ms after tapping.
 * ================================================================ */

type SummaryRowProps = {
  label: string;
  value: string;
  /**
   * When present, renders a copy button after the value. `copied`
   * flips the icon glyph (tick vs copy) for the parent-owned window.
   */
  copy?: {
    onPress: () => void;
    copied: boolean;
    accessibilityLabel: string;
  };
  /**
   * True when this row is the last inside its section — suppresses
   * the bottom border so the section doesn't have a trailing hairline
   * under the final row.
   */
  isLast?: boolean;
  /**
   * When true, the value renders in the "monospaced-feeling" bold
   * primary style used for IDs. Regular values use a slightly lighter
   * weight so IDs read as scannable and other values recede.
   */
  valueEmphasis?: boolean;
};

const SummaryRow: React.FC<SummaryRowProps> = ({
  label,
  value,
  copy,
  isLast,
  valueEmphasis,
}) => (
  <View style={[styles.row, !isLast && styles.rowDivider]}>
    <Text style={styles.rowLabel}>{label}</Text>
    <View style={styles.rowValueWrap}>
      <Text
        style={[styles.rowValue, valueEmphasis && styles.rowValueEmphasis]}
        numberOfLines={1}
      >
        {value}
      </Text>
      {copy ? (
        <Pressable
          onPress={copy.onPress}
          style={({ pressed }) => [styles.copyBtn, pressed && styles.pressed]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={copy.accessibilityLabel}
        >
          {copy.copied ? (
            <CheckCircle2 size={18} color={Colors.primary} strokeWidth={2.25} />
          ) : (
            <Copy size={18} color={Colors.primary} strokeWidth={2.25} />
          )}
        </Pressable>
      ) : null}
    </View>
  </View>
);

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  /* Sheet chrome — mirrors NeedChangesSheet / ContinueToBookingSheet
     so all app sheets share the same background + handle. */
  sheetBg: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  handle: {
    backgroundColor: Colors.border,
    width: 40,
    height: 4,
  },

  /* Pinned header */
  pinnedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    ...Typography.h5,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },

  /* Scrollable body */
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },

  /* Hero */
  hero: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  heroTitle: {
    ...Typography.h4,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },

  /* Amount card */
  amountCard: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    gap: Spacing.xs,
  },
  amountLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  amountValue: {
    ...Typography.h2,
    fontWeight: '800',
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
  amountWords: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },

  /* Payment Summary */
  summarySection: {
    gap: 0,
  },
  summaryTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  rowLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  rowValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 1,
  },
  rowValue: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
  rowValueEmphasis: {
    color: Colors.primary,
    fontWeight: '700',
  },
  copyBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Banner */
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  bannerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bannerTextCol: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  bannerBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  /* CTAs */
  /* Wrapper for the paid-state two-button row (Download + Share).
     `flexDirection: row` + `flex: 1` on each child splits the width
     50/50; the `gap` prevents the buttons from touching. */
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  ctaRowItem: {
    flex: 1,
    /* Tighten internal gap so the icon + label pair still fits when
       the button is only half the sheet width on a narrow device. */
    gap: 6,
    paddingHorizontal: 4,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    ...Shadows.xs,
  },
  primaryBtnText: {
    ...Typography.body,
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  outlineBtnText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '700',
  },
  textCloseBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    marginTop: Spacing.xs,
  },
  textCloseLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  /* Not-found body — reachable only for stale ids */
  notFoundBody: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  notFoundTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  notFoundSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.85,
  },
});
