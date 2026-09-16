/**
 * ------------------------------------------------------------------
 * BookingDetailScreen (Customer)
 * ------------------------------------------------------------------
 * Opens from any "View Details" tap on a BookingCard (or a deep-link
 * on the BookingDetail route).
 *
 * TWO RENDER PATHS
 * ------------------------------------------------------------------
 * `detail.status === 'completed'` → `CompletedDetail` — the rich
 * post-trip surface (see mock in the ticket): trip-completed banner,
 * booking-info card with inline Book Again, tracker-in-a-card, a
 * combined Vehicle+Driver card with Call/Message affordances, a
 * two-column Rate/Invoice row, and a sticky "Book Again for This
 * Route" CTA.
 *
 * Any other status → `GenericDetail` — the simpler status-agnostic
 * view (summary card with tracker inside, then Vehicle and Driver
 * sections). This exists so a stale deep-link into 'upcoming' /
 * 'ongoing' / 'cancelled' still renders something coherent even
 * though those flows are not the primary spec.
 *
 * The two paths deliberately do NOT share layout code — the
 * completed screen is a designed post-trip surface with celebratory
 * language and cross-sell affordances, and shoe-horning both flavours
 * into one branchy component would make the file painful to change
 * later. Shared bits (data hydration, formatting, contact actions)
 * live in the outer component and its helper functions.
 *
 * WHY subcomponents are LOCAL to this file
 * ------------------------------------------------------------------
 * Every card / row / button here is only meaningful in the context
 * of a booking detail screen. Promoting them to `components/` would
 * add files with zero external consumers. If a future screen needs
 * the same "info card with inline right-slot CTA" shape, extract
 * the specific card then — not preemptively.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Bus,
  Calendar,
  CarFront,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Phone,
  RotateCw,
  Star,
  Users,
  XCircle,
} from 'lucide-react-native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { makePhoneCall, openWhatsApp } from '@services/contact';
import type { CustomerStackParamList } from '@navigation/types';

import type {
  BookingPaymentStatus,
  BookingStatus,
  CustomerBookingDetail,
} from '../types';
import { getCustomerBookingDetail } from '../mocks';
import { BookingProgressTracker } from '../components/BookingProgressTracker';

type Nav = NativeStackNavigationProp<CustomerStackParamList, 'BookingDetail'>;
type Route = RouteProp<CustomerStackParamList, 'BookingDetail'>;

/* ================================================================
 * Local palette extras
 * ================================================================
 * The Rate-Your-Trip tile is soft purple, the Invoice tile is soft
 * blue. Neither tone exists in @theme/colors today, and they only
 * live on this screen — hard-coded here with the same escape hatch
 * QuotationDetailScreen uses. Hoist into the palette if a second
 * consumer appears.
 * ================================================================ */
const PURPLE_TINT = '#F3EEFF';
const PURPLE_FG = '#7C3AED';
const BLUE_TINT = '#EFF6FF';
const BLUE_FG = '#2563EB';

/* ================================================================
 * Status → header pill + subtitle
 * ================================================================ */

type IconComp = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}>;

type StatusVisual = {
  label: string;
  fg: string;
  bg: string;
  Icon: IconComp | null;
  subtitle: string;
};

const STATUS_VISUAL: Record<BookingStatus, StatusVisual> = {
  upcoming: {
    label: 'Upcoming',
    fg: Colors.primary,
    bg: Colors.primaryTint,
    Icon: null,
    subtitle: 'Your trip is confirmed',
  },
  ongoing: {
    label: 'Ongoing',
    fg: Colors.info,
    bg: Colors.infoTint,
    Icon: null,
    subtitle: 'Your trip is in progress',
  },
  completed: {
    label: 'Completed',
    fg: Colors.primary,
    bg: Colors.primaryTint,
    Icon: CheckCircle2,
    subtitle: 'Your trip has been completed',
  },
  cancelled: {
    label: 'Cancelled',
    fg: Colors.error,
    bg: Colors.errorTint,
    Icon: XCircle,
    subtitle: 'This booking was cancelled',
  },
};

/* ================================================================
 * Formatting helpers
 * ================================================================ */

/** "2026-09-05" → "05 Sept 2026". */
function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** "2026-09-05" → "Friday". */
function formatWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'long' });
}

/** ₹12,000 — Indian grouping. */
function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/** Two-letter initials for the driver avatar fallback. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}

/** "10 Adults, 2 Children" — omits the Children clause when zero. */
function formatPassengerBreakdown(a: number, c: number): string {
  const bits = [`${a} ${a === 1 ? 'Adult' : 'Adults'}`];
  if (c > 0) bits.push(`${c} ${c === 1 ? 'Child' : 'Children'}`);
  return bits.join(', ');
}

const PAYMENT_STATUS_COLOR: Record<BookingPaymentStatus, string> = {
  paid: Colors.primary,
  partial: Colors.warning,
  unpaid: Colors.error,
};

const PAYMENT_STATUS_LABEL: Record<BookingPaymentStatus, string> = {
  paid: 'Paid',
  partial: 'Partial',
  unpaid: 'Unpaid',
};

/* ================================================================
 * Contact-action wiring
 * ================================================================
 * Fire-and-forget: the contact service surfaces its own toasts on
 * failure. We swallow the rejection so React doesn't log an
 * unhandled-promise warning. */
function callDriver(phone: string | null | undefined): void {
  if (!phone) return;
  makePhoneCall(phone).catch(() => {
    /* contactService already toasted */
  });
}

function messageDriver(phone: string | null | undefined): void {
  if (!phone) return;
  // "Message" wires to WhatsApp — the app's messaging surface. If a
  // dedicated in-app chat lands later, swap this call site only.
  openWhatsApp(phone).catch(() => {
    /* contactService already toasted */
  });
}

/* ================================================================
 * Screen
 * ================================================================ */

const BookingDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const detail = useMemo<CustomerBookingDetail | null>(
    () => getCustomerBookingDetail(route.params.bookingId),
    [route.params.bookingId],
  );

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleBookAgain = useCallback(() => {
    // Pre-filling the route on the RequestQuotation screen is a
    // params expansion on that route — same TODO the list card
    // holds. For now: launch the empty form so the user has a
    // working path forward, matching the list card's behaviour.
    navigation.navigate('RequestQuotation');
  }, [navigation]);

  const handleGiveFeedback = useCallback(() => {
    if (!detail) return;
    navigation.navigate('Feedback', { bookingId: detail.id });
  }, [navigation, detail]);

  const handleViewInvoice = useCallback(() => {
    if (!detail) return;
    navigation.navigate('GstInvoice', { bookingId: detail.id });
  }, [navigation, detail]);

  /* -------- Not-found guard -------- */
  if (!detail) {
    return (
      <SafeScreen edges={['top']} backgroundColor={Colors.background}>
        <View style={styles.headerWrap}>
          <ScreenHeader title="Booking Details" onBack={handleBack} />
        </View>
        <View style={styles.notFoundWrap}>
          <Text style={styles.notFoundTitle}>Booking not found</Text>
          <Text style={styles.notFoundSubtitle}>
            This booking may have been removed or is no longer available.
          </Text>
        </View>
      </SafeScreen>
    );
  }

  return detail.status === 'completed' ? (
    <CompletedDetail
      detail={detail}
      onBack={handleBack}
      onBookAgain={handleBookAgain}
      onGiveFeedback={handleGiveFeedback}
      onViewInvoice={handleViewInvoice}
    />
  ) : (
    <GenericDetail detail={detail} onBack={handleBack} />
  );
};

export default BookingDetailScreen;

/* ================================================================
 * CompletedDetail — post-trip design (Image 1)
 * ================================================================ */

type CompletedProps = {
  detail: CustomerBookingDetail;
  onBack: () => void;
  onBookAgain: () => void;
  onGiveFeedback: () => void;
  onViewInvoice: () => void;
};

const CompletedDetail: React.FC<CompletedProps> = ({
  detail,
  onBack,
  onBookAgain,
  onGiveFeedback,
  onViewInvoice,
}) => {
  const status = STATUS_VISUAL.completed;

  return (
    <SafeScreen edges={['top', 'bottom']} backgroundColor={Colors.background}>
      {/* Header — back chevron + title with subtitle + status pill */}
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Booking Details"
          subtitle={status.subtitle}
          onBack={onBack}
          rightSlot={
            <View style={[styles.headerPill, { backgroundColor: status.bg }]}>
              {status.Icon ? (
                <status.Icon size={14} color={status.fg} strokeWidth={2.5} />
              ) : null}
              <Text style={[styles.headerPillText, { color: status.fg }]}>
                {status.label}
              </Text>
            </View>
          }
        />
      </View>

      <ScrollView
        style={styles.scrollBg}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Trip-completed celebratory banner ── */}
        <View style={styles.completedBanner}>
          <View style={styles.completedBadge}>
            <View style={styles.completedBadgeCheck}>
              <CheckCircle2
                size={30}
                color={Colors.textOnPrimary}
                strokeWidth={2.5}
                fill={Colors.primary}
              />
            </View>
          </View>
          <View style={styles.completedTextCol}>
            <Text style={styles.completedTitle}>Trip Completed!</Text>
            <Text style={styles.completedBody}>
              Thank you for travelling with Urban Cruise. We hope you had a
              great journey.
            </Text>
          </View>
        </View>

        {/* ── Booking info card ──
            Head row = calendar tile + booking-id block + inline
            Book Again outline button. A divider separates the head
            from the route + meta block. */}
        <View style={styles.card}>
          <View style={styles.bookingHeadRow}>
            <View style={styles.idTile}>
              <Calendar size={22} color={Colors.primary} strokeWidth={2.25} />
            </View>
            <View style={styles.idBody}>
              <Text style={styles.idLabel}>Booking ID</Text>
              <Text style={styles.idValue}>{detail.bookingNumber}</Text>
            </View>
            <Pressable
              onPress={onBookAgain}
              style={({ pressed }) => [
                styles.bookAgainSmall,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Book again"
            >
              <RotateCw size={14} color={Colors.primary} strokeWidth={2.5} />
              <Text style={styles.bookAgainSmallText}>Book Again</Text>
            </Pressable>
          </View>

          <View style={styles.divider} />

          <View style={styles.routeRow}>
            <Text style={styles.routeText} numberOfLines={1}>
              {detail.from}
            </Text>
            <Text style={styles.routeArrow}>→</Text>
            <Text style={styles.routeText} numberOfLines={1}>
              {detail.to}
            </Text>
          </View>

          {/* Meta triplet — date · time · passengers. Each cell has a
              small primary label and a muted sub-line ("(Friday)",
              "Departure", "(10 Adults, 2 Children)"). Columns are
              evenly weighted so labels align to the same baselines. */}
          <View style={styles.metaRowLarge}>
            <MetaCell
              Icon={Calendar}
              primary={formatLongDate(detail.travelDate)}
              secondary={`(${formatWeekday(detail.travelDate)})`}
            />
            <MetaCell
              Icon={Clock}
              primary={detail.pickupTime}
              secondary="Departure"
            />
            <MetaCell
              Icon={Users}
              primary={`${detail.passengers} Passengers`}
              secondary={
                detail.passengerBreakdown
                  ? `(${formatPassengerBreakdown(
                      detail.passengerBreakdown.adults,
                      detail.passengerBreakdown.children,
                    )})`
                  : undefined
              }
            />
          </View>
        </View>

        {/* ── Tracker card — dedicated card in this view ── */}
        <View style={styles.card}>
          <BookingProgressTracker
            currentStep={detail.progressStep}
            subLabels={detail.timeline}
            labelOverrides={{ started: 'Trip Started' }}
          />
        </View>

        {/* ── Vehicle & Driver combined card ── */}
        <View style={styles.card}>
          <View style={styles.sectionHeadingRow}>
            <View style={styles.sectionIconTile}>
              <CarFront size={18} color={Colors.primary} strokeWidth={2.25} />
            </View>
            <Text style={styles.sectionHeadingText}>Vehicle &amp; Driver</Text>
          </View>

          {/* Vehicle row — image tile + name/attrs/plate. Image is
              a lucide glyph until real vehicle photos ship (see the
              same note on BookingCard's vehicle tile). */}
          <View style={styles.vehicleRow}>
            <View style={styles.vehiclePhotoTile}>
              <Bus size={36} color={Colors.primary} strokeWidth={1.75} />
            </View>
            <View style={styles.vehicleBody}>
              <Text style={styles.vehicleName}>
                {detail.vehicleModel ?? detail.vehicleType}
              </Text>
              <Text style={styles.vehicleSub}>
                {[
                  detail.seater
                    ? `${detail.seater} Seater`
                    : detail.vehicleType,
                  detail.hasAC ? 'AC' : null,
                  detail.vehicleFuel,
                ]
                  .filter(Boolean)
                  .join(' | ')}
              </Text>
              {detail.vehiclePlate ? (
                <View style={styles.plateRow}>
                  <View style={styles.plateChip}>
                    <View style={styles.plateChipInner} />
                  </View>
                  <Text style={styles.vehiclePlate}>{detail.vehiclePlate}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Driver row — only when assigned. Divider above is only
              painted when there's a driver row to separate. */}
          {detail.driver ? (
            <>
              <View style={styles.divider} />
              <View style={styles.driverRow}>
                {detail.driver.avatarUrl ? (
                  <Image
                    source={{ uri: detail.driver.avatarUrl }}
                    style={styles.driverAvatar}
                  />
                ) : (
                  <View
                    style={[styles.driverAvatar, styles.driverAvatarFallback]}
                  >
                    <Text style={styles.driverInitials}>
                      {initialsOf(detail.driver.name)}
                    </Text>
                  </View>
                )}
                <View style={styles.driverBody}>
                  <Text style={styles.driverName}>{detail.driver.name}</Text>
                  {detail.driver.rating !== null ? (
                    <View style={styles.ratingRow}>
                      <Star
                        size={14}
                        color={Colors.warning}
                        fill={Colors.warning}
                        strokeWidth={2}
                      />
                      <Text style={styles.ratingText}>
                        {detail.driver.rating.toFixed(1)}
                        {detail.driver.tripsCompleted !== null ? (
                          <Text style={styles.ratingMuted}>
                            {' '}
                            ({detail.driver.tripsCompleted} trips)
                          </Text>
                        ) : null}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.driverActions}>
                  <ContactPillButton
                    Icon={Phone}
                    label="Call"
                    onPress={() => callDriver(detail.driver?.phoneE164)}
                    disabled={!detail.driver.phoneE164}
                  />
                  <ContactPillButton
                    Icon={MessageSquare}
                    label="Message"
                    onPress={() => messageDriver(detail.driver?.phoneE164)}
                    disabled={!detail.driver.phoneE164}
                  />
                </View>
              </View>
            </>
          ) : null}
        </View>

        {/* ── Rate + Invoice — two-column row ──
            Both cards stretch to equal height via alignItems:
            'stretch' on the row and flex:1 on each cell. */}
        <View style={styles.dualRow}>
          <View style={[styles.dualCard, { backgroundColor: PURPLE_TINT }]}>
            <View style={styles.dualHeadRow}>
              <View
                style={[
                  styles.dualIconTile,
                  { backgroundColor: Colors.surface },
                ]}
              >
                <Star size={16} color={PURPLE_FG} strokeWidth={2.25} />
              </View>
              <Text style={styles.dualTitle}>Rate Your Trip</Text>
            </View>
            <Text style={styles.dualBody}>
              Share your experience and help us serve you better.
            </Text>
            <View style={styles.dualSpacer} />
            <Pressable
              onPress={onGiveFeedback}
              style={({ pressed }) => [
                styles.dualOutlineBtn,
                { borderColor: Colors.primary },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Give feedback"
            >
              <Text
                style={[styles.dualOutlineBtnText, { color: Colors.primary }]}
              >
                Give Feedback
              </Text>
            </Pressable>
          </View>

          <View style={[styles.dualCard, { backgroundColor: BLUE_TINT }]}>
            <View style={styles.dualHeadRow}>
              <View
                style={[
                  styles.dualIconTile,
                  { backgroundColor: Colors.surface },
                ]}
              >
                <FileText size={16} color={BLUE_FG} strokeWidth={2.25} />
              </View>
              <Text style={styles.dualTitle}>Invoice &amp; Payment</Text>
            </View>
            <InvoiceRow
              label="Total Amount"
              value={formatRupees(detail.totalAmount)}
              valueBold
            />
            <InvoiceRow
              label="Payment Status"
              value={
                detail.payment
                  ? PAYMENT_STATUS_LABEL[detail.payment.status]
                  : '—'
              }
              valueColor={
                detail.payment
                  ? PAYMENT_STATUS_COLOR[detail.payment.status]
                  : Colors.textSecondary
              }
            />
            <InvoiceRow
              label="Payment Method"
              value={detail.payment?.method ?? '—'}
            />
            <View style={styles.dualSpacer} />
            <Pressable
              onPress={onViewInvoice}
              style={({ pressed }) => [
                styles.dualOutlineBtn,
                { borderColor: BLUE_FG },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="View invoice"
            >
              <FileText size={14} color={BLUE_FG} strokeWidth={2.5} />
              <Text style={[styles.dualOutlineBtnText, { color: BLUE_FG }]}>
                View Invoice
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky bottom CTA ── */}
      <View style={styles.stickyBar}>
        <Pressable
          onPress={onBookAgain}
          style={({ pressed }) => [
            styles.primaryCta,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Book again"
        >
          <RotateCw size={18} color={Colors.textOnPrimary} strokeWidth={2.5} />
          <Text style={styles.primaryCtaText}>Book Again</Text>
        </Pressable>
      </View>
    </SafeScreen>
  );
};

/* ================================================================
 * GenericDetail — status-agnostic fallback for non-completed
 * ================================================================ */

type GenericProps = {
  detail: CustomerBookingDetail;
  onBack: () => void;
};

const GenericDetail: React.FC<GenericProps> = ({ detail, onBack }) => {
  const status = STATUS_VISUAL[detail.status];

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Booking Details"
          subtitle={status.subtitle}
          onBack={onBack}
          rightSlot={
            <View style={[styles.headerPill, { backgroundColor: status.bg }]}>
              {status.Icon ? (
                <status.Icon size={14} color={status.fg} strokeWidth={2.5} />
              ) : null}
              <Text style={[styles.headerPillText, { color: status.fg }]}>
                {status.label}
              </Text>
            </View>
          }
        />
      </View>

      <ScrollView
        style={styles.scrollBg}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.idRow}>
            <View style={styles.idTile}>
              <Calendar size={22} color={Colors.primary} strokeWidth={2.25} />
            </View>
            <View style={styles.idBody}>
              <Text style={styles.idLabel}>Booking ID</Text>
              <Text style={styles.idValue}>{detail.bookingNumber}</Text>
            </View>
          </View>
          <View style={styles.routeRow}>
            <Text style={styles.routeText} numberOfLines={1}>
              {detail.from}
            </Text>
            <Text style={styles.routeArrow}>→</Text>
            <Text style={styles.routeText} numberOfLines={1}>
              {detail.to}
            </Text>
          </View>
          <View style={styles.metaRowSimple}>
            <View style={styles.metaItem}>
              <Calendar
                size={14}
                color={Colors.textSecondary}
                strokeWidth={2}
              />
              <Text style={styles.metaText}>
                {formatLongDate(detail.travelDate)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Clock size={14} color={Colors.textSecondary} strokeWidth={2} />
              <Text style={styles.metaText}>{detail.pickupTime}</Text>
            </View>
            <View style={styles.metaItem}>
              <Users size={14} color={Colors.textSecondary} strokeWidth={2} />
              <Text style={styles.metaText}>
                {detail.passengers} Passengers
              </Text>
            </View>
          </View>
          <View style={styles.trackerDivider} />
          <BookingProgressTracker
            currentStep={detail.progressStep}
            subLabels={detail.timeline}
          />
        </View>

        <Text style={styles.plainSectionHeading}>Vehicle</Text>
        <View style={styles.card}>
          <View style={styles.vehicleRow}>
            <View style={styles.vehiclePhotoTile}>
              <Bus size={30} color={Colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.vehicleBody}>
              <Text style={styles.vehicleName}>
                {detail.vehicleModel ?? detail.vehicleType}
              </Text>
              <Text style={styles.vehicleSub}>
                {[
                  detail.seater
                    ? `${detail.seater} Seater`
                    : detail.vehicleType,
                  detail.hasAC ? 'AC' : null,
                  detail.vehicleFuel,
                ]
                  .filter(Boolean)
                  .join(' | ')}
              </Text>
              {detail.vehiclePlate ? (
                <Text style={styles.vehiclePlate}>{detail.vehiclePlate}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {detail.driver ? (
          <>
            <Text style={styles.plainSectionHeading}>Driver</Text>
            <View style={styles.card}>
              <View style={styles.driverRow}>
                {detail.driver.avatarUrl ? (
                  <Image
                    source={{ uri: detail.driver.avatarUrl }}
                    style={styles.driverAvatar}
                  />
                ) : (
                  <View
                    style={[styles.driverAvatar, styles.driverAvatarFallback]}
                  >
                    <Text style={styles.driverInitials}>
                      {initialsOf(detail.driver.name)}
                    </Text>
                  </View>
                )}
                <View style={styles.driverBody}>
                  <Text style={styles.driverName}>{detail.driver.name}</Text>
                  {detail.driver.rating !== null ? (
                    <View style={styles.ratingRow}>
                      <Star
                        size={14}
                        color={Colors.warning}
                        fill={Colors.warning}
                        strokeWidth={2}
                      />
                      <Text style={styles.ratingText}>
                        {detail.driver.rating.toFixed(1)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeScreen>
  );
};

/* ================================================================
 * Local reusable sub-components
 * ================================================================ */

const MetaCell: React.FC<{
  Icon: IconComp;
  primary: string;
  secondary?: string;
}> = ({ Icon, primary, secondary }) => (
  <View style={styles.metaCell}>
    <View style={styles.metaCellHead}>
      <Icon size={14} color={Colors.textSecondary} strokeWidth={2} />
      <Text style={styles.metaCellPrimary} numberOfLines={1}>
        {primary}
      </Text>
    </View>
    {secondary ? (
      <Text style={styles.metaCellSecondary} numberOfLines={1}>
        {secondary}
      </Text>
    ) : null}
  </View>
);

const ContactPillButton: React.FC<{
  Icon: IconComp;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}> = ({ Icon, label, onPress, disabled }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      styles.contactBtnCol,
      pressed && !disabled && styles.pressed,
      disabled && styles.disabled,
    ]}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled: !!disabled }}
  >
    <View style={styles.contactBtnTile}>
      <Icon size={18} color={Colors.primary} strokeWidth={2.25} />
    </View>
    <Text style={styles.contactBtnLabel}>{label}</Text>
  </Pressable>
);

const InvoiceRow: React.FC<{
  label: string;
  value: string;
  valueBold?: boolean;
  valueColor?: string;
}> = ({ label, value, valueBold, valueColor }) => (
  <View style={styles.invoiceRow}>
    <Text style={styles.invoiceLabel}>{label}</Text>
    <Text
      style={[
        styles.invoiceValue,
        valueBold && styles.invoiceValueBold,
        valueColor ? { color: valueColor } : null,
      ]}
    >
      {value}
    </Text>
  </View>
);

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  /* Header */
  headerWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  headerPillText: {
    ...Typography.caption,
    fontWeight: '700',
    includeFontPadding: false,
  },

  /* Scroll */
  scrollBg: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxxl,
    gap: Spacing.md,
  },

  /* Card shell */
  card: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.md,
    ...Shadows.xs,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },

  /* ── Completed banner ── */
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryTint,
    borderWidth: 1,
    borderColor: Colors.primaryTint,
  },
  completedBadge: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadgeCheck: {
    width: 54,
    height: 54,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedTextCol: {
    flex: 1,
    gap: 2,
  },
  completedTitle: {
    ...Typography.subtitle,
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 22,
  },
  completedBody: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  /* ── Booking head row (calendar tile + id + Book Again pill) ── */
  bookingHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  idTile: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idBody: {
    flex: 1,
    gap: 2,
  },
  idLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    includeFontPadding: false,
  },
  idValue: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 22,
  },
  bookAgainSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 34,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  bookAgainSmallText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    includeFontPadding: false,
  },

  /* ── Route line ── */
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  routeText: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 24,
    lineHeight: 28,
    flexShrink: 1,
  },
  routeArrow: {
    ...Typography.subtitle,
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 22,
    lineHeight: 26,
  },

  /* ── Meta triplet (rich, for completed) ── */
  metaRowLarge: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metaCell: {
    flex: 1,
    gap: 2,
  },
  metaCellHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaCellPrimary: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '700',
    flexShrink: 1,
    includeFontPadding: false,
  },
  metaCellSecondary: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginLeft: 19, // aligns under the primary text (icon + gap)
    includeFontPadding: false,
  },

  /* ── Meta row (simple, for generic) ── */
  metaRowSimple: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
    includeFontPadding: false,
  },

  /* Generic: divider above tracker */
  trackerDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginTop: 2,
  },

  /* ── Vehicle & Driver section heading ── */
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionIconTile: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeadingText: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 20,
  },

  /* Generic: plain accent heading between cards */
  plainSectionHeading: {
    ...Typography.subtitle,
    color: Colors.info,
    fontWeight: '800',
    marginTop: Spacing.sm,
  },

  /* ── Vehicle row ── */
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  vehiclePhotoTile: {
    width: 96,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleBody: {
    flex: 1,
    gap: 3,
  },
  vehicleName: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 22,
  },
  vehicleSub: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  plateChip: {
    width: 16,
    height: 12,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: Colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateChipInner: {
    width: 8,
    height: 1.5,
    backgroundColor: Colors.textSecondary,
  },
  vehiclePlate: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* ── Driver row ── */
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.circle,
    backgroundColor: Colors.surfaceMuted,
  },
  driverAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInitials: {
    ...Typography.subtitle,
    color: Colors.textSecondary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  driverBody: {
    flex: 1,
    gap: 2,
  },
  driverName: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 17,
    lineHeight: 22,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    ...Typography.bodySmall,
    color: Colors.warning,
    fontWeight: '800',
  },
  ratingMuted: {
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  /* Driver contact actions */
  driverActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  contactBtnCol: {
    alignItems: 'center',
    gap: 3,
  },
  contactBtnTile: {
    width: 40,
    height: 40,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBtnLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    includeFontPadding: false,
  },

  /* ── Rate + Invoice dual row ── */
  dualRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'stretch',
  },
  dualCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 6,
  },
  dualHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  dualIconTile: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dualTitle: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '800',
    flexShrink: 1,
  },
  dualBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  dualSpacer: {
    flex: 1,
    minHeight: Spacing.sm,
  },
  dualOutlineBtn: {
    height: 38,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dualOutlineBtnText: {
    ...Typography.caption,
    fontWeight: '800',
  },

  /* Invoice rows */
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  invoiceValue: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  invoiceValueBold: {
    ...Typography.bodySmall,
    fontWeight: '800',
  },

  /* ── Sticky bottom bar ── */
  stickyBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  primaryCta: {
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  primaryCtaText: {
    ...Typography.subtitle,
    color: Colors.textOnPrimary,
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 20,
  },

  /* ── Not found ── */
  notFoundWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xs,
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

  /* Interaction states */
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
});
