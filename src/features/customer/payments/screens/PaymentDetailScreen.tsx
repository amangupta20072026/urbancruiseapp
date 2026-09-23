/**
 * ------------------------------------------------------------------
 * PaymentDetailScreen — STACK SCREEN (customer)
 * ------------------------------------------------------------------
 * Route: `PaymentDetail` under CustomerStackParamList, param
 * `{ paymentId }`.
 *
 * ENTRY POINT:
 *   PaymentsScreen (tab) → card tap.
 *
 * ONE SCREEN, THREE VARIANTS:
 *   The paid / pending / failed states share the same skeleton
 *   (header → booking summary → status timeline → payment summary
 *   → context banner → bottom CTAs). Status drives:
 *     · timeline row 3 icon + colour + label
 *     · timeline row 3 inline banner (failed / pending only)
 *     · timeline row 4 (Invoice Available vs Not Available copy)
 *     · summary row labels (Total Paid vs Total Amount, Paid On vs
 *       Due Since vs Attempted On)
 *     · summary amount colour
 *     · bottom informational banner (green lock / blue info / red alert)
 *     · bottom CTA pair (View + Download Invoice / Pay Now + View
 *       Booking / Contact Support + Download Failure Receipt)
 *
 *   The config-driven approach keeps the JSX flat and, more
 *   importantly, avoids three near-identical screen files that
 *   would drift apart at every design tweak. See STATUS_CONFIG
 *   below.
 *
 * INVALID / STALE paymentId:
 *   Renders an inline not-found body with a Go Back button rather
 *   than auto-popping. Same rationale as GiveFeedbackScreen — an
 *   auto-pop with no context reads as a crash.
 *
 * PLATFORM NOTES:
 *   - Clipboard: `@react-native-clipboard/clipboard` isn't a
 *     dependency (see ReferralsScreen header). The Transaction ID
 *     copy button flips its icon to a check for 1.5s so the user
 *     gets feedback; when the module lands, drop the toast + write
 *     to Clipboard here in `onCopyTxn`.
 *   - Downloads: the invoice / receipt CTAs are TODO stubs. Wire to
 *     `endpoints.customer.payments.invoiceFile(id)` /
 *     `endpoints.customer.payments.failureReceipt(id)` +
 *     react-native-file-viewer once the PDF pipeline is decided.
 *
 * DATA:
 *   Local mock via `getCustomerPaymentDetail(id)`. Swap for
 *   `useQuery({ queryKey: queryKeys.customer.payments.detail(id) })`
 *   when the endpoint ships — the render below reads a plain
 *   `CustomerPaymentDetail`, so nothing here needs to change.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ColorValue,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Copy,
  Download,
  FileText,
  Headphones,
  Info,
  Lock,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { toast } from '@services/toast';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import type { CustomerStackParamList } from '@navigation/types';

import type { PaymentStatus } from '../types';
import { getCustomerPaymentDetail } from '../mocks';

/* ================================================================
 * Formatting helpers
 * ================================================================ */

/** Indian grouping, two-decimal-free — "₹18,500". */
function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/** "15 Sept 2026" — matches the mock's short-month style with a
 *  trailing dot on the abbreviated month. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** "10:00 AM" (locale hour cycle). */
function formatTime(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    .toUpperCase();
}

/** "15 Sept 2026 · 09:15 AM" — timeline row subtitle. */
function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

/* ================================================================
 * Status → visual config
 *
 * The screen's status-dependent bits (labels, colours, icons,
 * timeline copy, banner copy, CTAs) all live in one place. Each
 * status is one row in the map — no cascading if/else chains buried
 * in JSX. Adding a fourth status (e.g. 'refunded') is a single new
 * entry plus a type-union widening in `types.ts`; the render stays
 * untouched.
 * ================================================================ */

type StatusConfig = {
  /* Timeline row 3 — the payment event */
  eventLabel: string;
  eventIcon: LucideIcon;
  eventFg: string;
  eventBg: string;

  /* Timeline row 3 — inline banner directly under the event row.
     Null on `paid` (nothing to add there). */
  inlineBanner: null | {
    title: string;
    body: string;
    fg: string;
    bg: string;
    border: string;
    Icon: LucideIcon;
  };

  /* Timeline row 4 — invoice availability */
  invoiceLabel: string;
  invoiceBody: string;

  /* Payment Summary */
  amountLabel: string;
  amountFg: string;
  timestampLabel: string;

  /* Bottom informational banner */
  footerBanner: {
    title: string;
    body: string;
    fg: string;
    bg: string;
    Icon: LucideIcon;
  };
};

const STATUS_CONFIG: Record<PaymentStatus, StatusConfig> = {
  paid: {
    eventLabel: 'Payment Received',
    eventIcon: CheckCircle2,
    eventFg: Colors.primary,
    eventBg: Colors.primaryTint,
    inlineBanner: null,
    invoiceLabel: 'Invoice Available',
    invoiceBody: 'You can now view or download your invoice.',
    amountLabel: 'Total Paid',
    amountFg: Colors.primary,
    timestampLabel: 'Paid On',
    footerBanner: {
      title: 'Secure Payment',
      body: 'Your transaction is protected with 256-bit SSL encryption. Your payment information is safe and secure.',
      fg: Colors.primary,
      bg: Colors.primaryTint,
      Icon: Lock,
    },
  },
  pending: {
    eventLabel: 'Payment Pending',
    eventIcon: Clock,
    eventFg: Colors.accent,
    eventBg: Colors.accentTint,
    inlineBanner: {
      title: 'Your trip is completed.',
      body: 'Please complete the payment to generate your invoice.',
      fg: Colors.accent,
      bg: Colors.accentTint,
      border: Colors.accent,
      Icon: Clock,
    },
    invoiceLabel: 'Invoice Not Available',
    invoiceBody: 'Complete the payment to generate your invoice.',
    amountLabel: 'Total Amount',
    amountFg: Colors.accent,
    timestampLabel: 'Due Since',
    footerBanner: {
      title: 'Payment Pending',
      body: 'Please complete the payment to confirm your booking and generate the invoice.',
      fg: Colors.info,
      bg: Colors.infoTint,
      Icon: Info,
    },
  },
  failed: {
    eventLabel: 'Payment Failed',
    eventIcon: XCircle,
    eventFg: Colors.error,
    eventBg: Colors.errorTint,
    inlineBanner: {
      title: 'Your payment could not be completed.',
      body: 'No amount has been deducted from your account.',
      fg: Colors.error,
      bg: Colors.errorTint,
      border: Colors.error,
      Icon: AlertCircle,
    },
    invoiceLabel: 'Invoice Not Available',
    invoiceBody: 'Payment was not successful, so invoice cannot be generated.',
    amountLabel: 'Total Amount',
    amountFg: Colors.textPrimary,
    timestampLabel: 'Attempted On',
    footerBanner: {
      title: 'Payment Failed',
      body: 'Your payment could not be completed due to a technical issue with the payment provider. No amount has been deducted from your account. You can contact our support team if you need further assistance.',
      fg: Colors.error,
      bg: Colors.errorTint,
      Icon: AlertCircle,
    },
  },
};

/** Header pill (top-right of the booking summary card). */
const PILL: Record<PaymentStatus, { label: string; fg: string; bg: string }> = {
  paid: { label: 'Paid', fg: Colors.primary, bg: Colors.primaryTint },
  pending: { label: 'Pending', fg: Colors.accent, bg: Colors.accentTint },
  failed: { label: 'Failed', fg: Colors.error, bg: Colors.errorTint },
};

/* ================================================================
 * Types
 * ================================================================ */

type Route = RouteProp<CustomerStackParamList, 'PaymentDetail'>;
type Nav = NativeStackNavigationProp<CustomerStackParamList, 'PaymentDetail'>;

/* ================================================================
 * Screen
 * ================================================================ */

const PaymentDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { paymentId } = route.params;

  const payment = useMemo(
    () => getCustomerPaymentDetail(paymentId),
    [paymentId],
  );

  /* Copy-button "just tapped" affordance. See screen header re: no
   * clipboard native module. */
  const [copied, setCopied] = useState(false);

  const onCopyTxn = useCallback(() => {
    if (!payment?.transactionId) return;
    Clipboard.setString(payment.transactionId);
    setCopied(true);
    toast.info('Transaction ID copied');
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [payment?.transactionId]);

  /* -------- Status-specific CTA handlers -------- */

  const onPayNow = useCallback(() => {
    if (!payment) return;
    navigation.navigate('PayBalance', { bookingId: payment.bookingId });
  }, [navigation, payment]);

  const onViewBooking = useCallback(() => {
    if (!payment) return;
    navigation.navigate('BookingDetail', { bookingId: payment.bookingId });
  }, [navigation, payment]);

  const onViewInvoice = useCallback(() => {
    if (!payment) return;
    // Same route the booking detail's GST-invoice CTA uses; the target
    // screen picks the payment entry via the shared booking id.
    navigation.navigate('GstInvoice', { bookingId: payment.bookingId });
  }, [navigation, payment]);

  const onDownloadInvoice = useCallback(() => {
    // TODO(fs): fetch endpoints.customer.payments.invoiceFile(paymentId)
    // and hand to react-native-file-viewer.
    toast.info('Invoice download coming soon');
  }, []);

  const onContactSupport = useCallback(() => {
    navigation.navigate('HelpSupport');
  }, [navigation]);

  const onDownloadFailureReceipt = useCallback(() => {
    // TODO(fs): endpoints.customer.payments.failureReceipt(paymentId).
    toast.info('Receipt download coming soon');
  }, []);

  /* -------- Invalid paymentId -------- */

  if (!payment) {
    return (
      <SafeScreen edges={['top']} backgroundColor={Colors.backgroundSecondary}>
        <View style={styles.headerWrap}>
          <ScreenHeader
            title="Payment Details"
            onBack={() => navigation.goBack()}
          />
        </View>
        <View style={styles.notFoundBody}>
          <Text style={styles.notFoundTitle}>Payment not found</Text>
          <Text style={styles.notFoundSubtitle}>
            We couldn't find this payment. It may have been removed or the link
            is out of date.
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryBtnText}>Go back</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  const cfg = STATUS_CONFIG[payment.status];
  const pill = PILL[payment.status];

  /* -------- Render -------- */

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.backgroundSecondary}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Payment Details"
          onBack={() => navigation.goBack()}
        />
      </View>

      <ScrollView
        style={styles.scrollBg}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Booking summary card ─────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              <View style={styles.routeRow}>
                <Text style={styles.routeText}>{payment.from}</Text>
                <ArrowRight
                  size={16}
                  color={Colors.textSecondary}
                  strokeWidth={2.5}
                />
                <Text style={styles.routeText}>{payment.to}</Text>
              </View>
              <View style={styles.metaLine}>
                <Calendar
                  size={12}
                  color={Colors.textSecondary}
                  strokeWidth={2}
                />
                <Text style={styles.metaText}>
                  {formatDate(payment.travelDate)} · {payment.pickupTime}
                </Text>
              </View>
              <View style={styles.metaLine}>
                <Users size={12} color={Colors.textSecondary} strokeWidth={2} />
                <Text style={styles.metaText}>
                  {payment.passengers} Passengers
                </Text>
              </View>
            </View>

            <View style={styles.summaryRight}>
              <Text style={styles.idLabel}>Booking ID</Text>
              <Text style={styles.idValue}>{payment.bookingNumber}</Text>
              <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                <Text style={[styles.pillText, { color: pill.fg }]}>
                  {pill.label}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Status timeline ──────────────────────────────────── */}
        <View style={styles.card}>
          <TimelineStep
            Icon={CheckCircle2}
            fg={Colors.primary}
            bg={Colors.primaryTint}
            title="Booking Confirmed"
            subtitle={formatDateTime(payment.bookingConfirmedAt)}
            connector={payment.tripCompletedAt !== null || true}
          />

          {payment.tripCompletedAt ? (
            <TimelineStep
              Icon={CheckCircle2}
              fg={Colors.primary}
              bg={Colors.primaryTint}
              title="Trip Completed"
              subtitle={formatDateTime(payment.tripCompletedAt)}
              connector
            />
          ) : null}

          {/* Payment event — icon/label/colour swap by status. Inline
              banner (failed/pending) sits directly below the row so it
              reads as belonging to this step. */}
          <TimelineStep
            Icon={cfg.eventIcon}
            fg={cfg.eventFg}
            bg={cfg.eventBg}
            title={cfg.eventLabel}
            subtitle={formatDateTime(payment.paymentEventAt)}
            connector
          >
            {cfg.inlineBanner ? (
              <View
                style={[
                  styles.inlineBanner,
                  {
                    backgroundColor: cfg.inlineBanner.bg,
                    borderLeftColor: cfg.inlineBanner.border,
                  },
                ]}
              >
                <View style={styles.inlineBannerHeader}>
                  <cfg.inlineBanner.Icon
                    size={14}
                    color={cfg.inlineBanner.fg}
                    strokeWidth={2.5}
                  />
                  <Text
                    style={[
                      styles.inlineBannerTitle,
                      { color: cfg.inlineBanner.fg },
                    ]}
                  >
                    {cfg.inlineBanner.title}
                  </Text>
                </View>
                <Text style={styles.inlineBannerBody}>
                  {cfg.inlineBanner.body}
                </Text>
              </View>
            ) : null}
          </TimelineStep>

          {/* Invoice step — always shown but the copy shifts. The dot
              is intentionally an outline circle (Colors.border) for
              all three states because until the invoice actually
              exists this is a future step, not a completed one. */}
          <TimelineStep
            Icon={Circle}
            fg={Colors.textTertiary}
            bg={Colors.surfaceVariant}
            title={cfg.invoiceLabel}
            subtitle={cfg.invoiceBody}
            connector={false}
            muted
          />
        </View>

        {/* ── Payment Summary ──────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>

          <SummaryRow
            label={cfg.amountLabel}
            value={formatRupees(payment.amount)}
            valueColor={cfg.amountFg}
            valueBold
          />

          <SummaryRow
            label="Payment Method"
            value={payment.paymentMethod ?? 'Not Paid Yet'}
          />

          <SummaryRow
            label="Transaction ID"
            value={payment.transactionId ?? '-'}
            trailing={
              payment.transactionId ? (
                <Pressable
                  onPress={onCopyTxn}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Copy transaction ID"
                >
                  {copied ? (
                    <Check size={14} color={Colors.primary} strokeWidth={2.5} />
                  ) : (
                    <Copy
                      size={14}
                      color={Colors.textSecondary}
                      strokeWidth={2}
                    />
                  )}
                </Pressable>
              ) : null
            }
          />

          <SummaryRow
            label={cfg.timestampLabel}
            value={formatDateTime(payment.paymentEventAt)}
            isLast
          />
        </View>

        {/* ── Footer banner ────────────────────────────────────── */}
        <View
          style={[
            styles.footerBanner,
            { backgroundColor: cfg.footerBanner.bg },
          ]}
        >
          <View style={styles.footerBannerIcon}>
            <cfg.footerBanner.Icon
              size={20}
              color={cfg.footerBanner.fg}
              strokeWidth={2.25}
            />
          </View>
          <View style={styles.footerBannerText}>
            <Text
              style={[styles.footerBannerTitle, { color: cfg.footerBanner.fg }]}
            >
              {cfg.footerBanner.title}
            </Text>
            <Text style={styles.footerBannerBody}>{cfg.footerBanner.body}</Text>
          </View>
        </View>

        {/* ── Bottom CTAs ─────────────────────────────────────── */}
        {payment.status === 'paid' ? (
          <View style={styles.ctaGroup}>
            <PrimaryButton
              label="View Invoice"
              Icon={FileText}
              onPress={onViewInvoice}
            />
            <SecondaryButton
              label="Download Invoice"
              Icon={Download}
              onPress={onDownloadInvoice}
            />
          </View>
        ) : payment.status === 'pending' ? (
          <View style={styles.ctaGroup}>
            <PrimaryButton label="Pay Now" onPress={onPayNow} />
            <SecondaryButton
              label="View Booking Details"
              Icon={FileText}
              onPress={onViewBooking}
            />
          </View>
        ) : (
          <View style={styles.ctaGroup}>
            {/* Failed uses two neutral outlined buttons — neither is a
                "green success" gesture, so we don't render a primary. */}
            <NeutralButton
              label="Contact Support"
              Icon={Headphones}
              onPress={onContactSupport}
            />
            <NeutralButton
              label="Download Payment Failure Receipt"
              Icon={Download}
              onPress={onDownloadFailureReceipt}
            />
          </View>
        )}
      </ScrollView>
    </SafeScreen>
  );
};

export default PaymentDetailScreen;

/* ================================================================
 * Sub-components
 * ================================================================ */

/**
 * One row of the vertical status timeline. The connector line to the
 * NEXT step is drawn on this row (not the next) so the last step is
 * easy to render — it just passes `connector={false}`.
 *
 * `children` slot hosts the inline banner (failed/pending). It sits
 * inside the text column so the connector line stays vertical.
 */
const TimelineStep: React.FC<{
  Icon: LucideIcon;
  fg: string;
  bg: string;
  title: string;
  subtitle: string;
  connector: boolean;
  /** Grey out title + subtitle for "future/not-yet" steps. */
  muted?: boolean;
  children?: React.ReactNode;
}> = ({ Icon, fg, bg, title, subtitle, connector, muted, children }) => (
  <View style={styles.timelineRow}>
    <View style={styles.timelineDotCol}>
      <View style={[styles.timelineDot, { backgroundColor: bg }]}>
        <Icon size={16} color={fg} strokeWidth={2.5} />
      </View>
      {connector ? <View style={styles.timelineConnector} /> : null}
    </View>
    <View style={styles.timelineTextCol}>
      <Text
        style={[styles.timelineTitle, muted && { color: Colors.textSecondary }]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.timelineSubtitle,
          muted && { color: Colors.textTertiary },
        ]}
      >
        {subtitle}
      </Text>
      {children}
    </View>
  </View>
);

const SummaryRow: React.FC<{
  label: string;
  value: string;
  valueColor?: ColorValue;
  valueBold?: boolean;
  trailing?: React.ReactNode;
  isLast?: boolean;
}> = ({ label, value, valueColor, valueBold, trailing, isLast }) => (
  <View style={[styles.summaryLine, !isLast && styles.summaryLineDivider]}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <View style={styles.summaryValueWrap}>
      <Text
        style={[
          styles.summaryValue,
          valueColor ? { color: valueColor } : null,
          valueBold && styles.summaryValueBold,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
      {trailing}
    </View>
  </View>
);

const PrimaryButton: React.FC<{
  label: string;
  Icon?: LucideIcon;
  onPress: () => void;
}> = ({ label, Icon, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    {Icon ? (
      <Icon size={16} color={Colors.textOnPrimary} strokeWidth={2.25} />
    ) : null}
    <Text style={styles.primaryBtnText}>{label}</Text>
  </Pressable>
);

const SecondaryButton: React.FC<{
  label: string;
  Icon?: LucideIcon;
  onPress: () => void;
}> = ({ label, Icon, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    {Icon ? <Icon size={16} color={Colors.primary} strokeWidth={2.25} /> : null}
    <Text style={styles.secondaryBtnText}>{label}</Text>
  </Pressable>
);

/**
 * Neutral (grey-outlined) button used for the failed variant's two
 * CTAs. Neither Contact Support nor Download Failure Receipt is a
 * "success" gesture, so they don't take the brand-green outline
 * — that would misread as "everything is fine, tap here".
 */
const NeutralButton: React.FC<{
  label: string;
  Icon?: LucideIcon;
  onPress: () => void;
}> = ({ label, Icon, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.neutralBtn, pressed && styles.pressed]}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    {Icon ? (
      <Icon size={16} color={Colors.textPrimary} strokeWidth={2.25} />
    ) : null}
    <Text style={styles.neutralBtnText}>{label}</Text>
  </Pressable>
);

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },

  scrollBg: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.section,
    gap: Spacing.md,
  },

  /* Card container — every content block sits inside one */
  card: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.md,
    ...Shadows.xs,
  },

  /* Booking summary */
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  summaryLeft: {
    flex: 1,
    gap: 4,
  },
  summaryRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeText: {
    ...Typography.h5,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    includeFontPadding: false,
  },
  idLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    includeFontPadding: false,
  },
  idValue: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '800',
    includeFontPadding: false,
  },
  pill: {
    marginTop: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  pillText: {
    ...Typography.caption,
    fontWeight: '700',
    includeFontPadding: false,
  },

  /* Timeline */
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  timelineDotCol: {
    alignItems: 'center',
    width: 32,
  },
  timelineDot: {
    width: 30,
    height: 30,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineConnector: {
    flex: 1,
    width: 2,
    minHeight: 24,
    marginTop: 4,
    marginBottom: -Spacing.xs,
    backgroundColor: Colors.borderLight,
  },
  timelineTextCol: {
    flex: 1,
    paddingBottom: Spacing.md,
    gap: 2,
  },
  timelineTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  timelineSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    includeFontPadding: false,
  },

  /* Inline banner (failed/pending) inside the timeline text column */
  inlineBanner: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    borderLeftWidth: 3,
    gap: 4,
  },
  inlineBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineBannerTitle: {
    ...Typography.bodySmall,
    fontWeight: '700',
    includeFontPadding: false,
  },
  inlineBannerBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  /* Payment summary */
  sectionTitle: {
    ...Typography.h5,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  summaryLineDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  summaryLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
    flexShrink: 0,
  },
  summaryValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
    justifyContent: 'flex-end',
  },
  summaryValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
  },
  summaryValueBold: {
    ...Typography.h5,
    fontWeight: '800',
  },

  /* Footer informational banner */
  footerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  footerBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.circle,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBannerText: {
    flex: 1,
    gap: 2,
  },
  footerBannerTitle: {
    ...Typography.body,
    fontWeight: '800',
  },
  footerBannerBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  /* Bottom CTA group */
  ctaGroup: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  primaryBtn: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    ...Shadows.sm,
  },
  primaryBtnText: {
    ...Typography.button,
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  secondaryBtnText: {
    ...Typography.button,
    color: Colors.primary,
    fontWeight: '700',
  },
  neutralBtn: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  neutralBtnText: {
    ...Typography.button,
    color: Colors.textPrimary,
    fontWeight: '700',
  },

  /* Not-found body */
  notFoundBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  notFoundTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  notFoundSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.85,
  },
});
