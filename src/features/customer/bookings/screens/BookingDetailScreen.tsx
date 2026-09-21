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

import React, { useCallback, useMemo, useRef } from 'react';
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
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  Bus,
  Calendar,
  CalendarClock,
  CalendarX,
  Car,
  CarFront,
  Check,
  CheckCircle2,
  CircleDot,
  Clock,
  FileText,
  Headphones,
  IndianRupee,
  Info,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  RotateCw,
  Star,
  Users,
  X,
  XCircle,
} from 'lucide-react-native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { makePhoneCall, openWhatsApp } from '@services/contact';
import { toast } from '@services/toast';
import type { CustomerStackParamList } from '@navigation/types';
import {
  NeedHelpSheet,
  STANDARD_EXECUTIVE,
  getTripTypeOption,
} from '@features/customer/quotations';
import type { TripType } from '@features/customer/quotations';

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

/** Outer diameter for the cancelled-tracker's dots — matches the
 *  `DOT` constant in BookingProgressTracker so the two trackers line
 *  up visually if they ever appear near each other. */
const TRACKER_DOT = 20;

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
    Icon: Clock,
    subtitle: 'Your trip is upcoming',
  },
  ongoing: {
    label: 'Ongoing',
    fg: Colors.info,
    bg: Colors.infoTint,
    Icon: CircleDot,
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

/** ISO timestamp → "12 Aug 2026, 02:15 PM" — used by the Cancellation
 *  Details card. */
function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
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

  const handleTrackVehicle = useCallback(() => {
    // Live tracking screen is a ghost destination today. Rather
    // than leaving Track Vehicle as a silent no-op (which feels
    // broken to the user), surface a "coming soon" toast so the
    // tap has feedback. Replace this with
    // `navigation.navigate('TripLive', { tripId: tripIdFrom(detail.id, '01') })`
    // once the TripLive route lands — same TODO as onTrackVehicle
    // in BookingsScreen.tsx.
    toast.info('Live tracking coming soon', {
      description: "We're rolling this out shortly.",
    });
  }, []);

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

  if (detail.status === 'completed') {
    return (
      <CompletedDetail
        detail={detail}
        onBack={handleBack}
        onBookAgain={handleBookAgain}
        onGiveFeedback={handleGiveFeedback}
        onViewInvoice={handleViewInvoice}
      />
    );
  }

  if (detail.status === 'cancelled') {
    return (
      <CancelledDetail
        detail={detail}
        onBack={handleBack}
        onBookAgain={handleBookAgain}
      />
    );
  }

  if (detail.status === 'upcoming') {
    return <UpcomingDetail detail={detail} onBack={handleBack} />;
  }

  if (detail.status === 'ongoing') {
    return (
      <OngoingDetail
        detail={detail}
        onBack={handleBack}
        onTrackVehicle={handleTrackVehicle}
      />
    );
  }

  return <GenericDetail detail={detail} onBack={handleBack} />;
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

  /* Bottom-sheet ref for the "Need Help?" contact sheet. Same pattern
     as OngoingDetail / CancelledDetail — mounted once inside SafeScreen,
     presented imperatively when the user taps Contact Support. */
  const needHelpRef = useRef<BottomSheetModal>(null);

  const openNeedHelp = useCallback(() => {
    needHelpRef.current?.present();
  }, []);

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
          {/* Card top-right marker — labels the whole card as the
              trip's at-a-glance details (id + route + timeline).
              Merged with the tracker below so the two related
              blocks read as one section. */}
          <TripDetailsHeader tripType={detail.tripType} />

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

          {/* Tracker lives INSIDE the same card, separated by a
              hairline divider — id/route/meta above, timeline below,
              read together as one "trip details" surface. */}
          <View style={styles.trackerDivider} />
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

        {/* ── Need Help support card ── */}
        <View style={styles.helpCard}>
          <View style={styles.helpIconTile}>
            <Headphones size={20} color={BLUE_FG} strokeWidth={2.25} />
          </View>
          <View style={styles.helpTextCol}>
            <Text style={styles.helpTitle}>Need Help?</Text>
            <Text style={styles.helpBody}>
              Contact our support team for any queries.
            </Text>
          </View>
          <Pressable
            onPress={openNeedHelp}
            style={({ pressed }) => [
              styles.contactSupportBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Contact support"
          >
            <Text style={styles.contactSupportBtnText}>Contact Support</Text>
          </Pressable>
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

      {/* Need Help bottom sheet — mounted once, presented imperatively
          via `needHelpRef` from the Need Help card's Contact Support
          button. Portaled to the app-root BottomSheetModalProvider
          (App.tsx), so it sits above the sticky bar without extra
          z-index plumbing. */}
      <NeedHelpSheet
        ref={needHelpRef}
        executive={STANDARD_EXECUTIVE}
        contextRef={detail.bookingNumber}
      />
    </SafeScreen>
  );
};

/* ================================================================
 * CancelledDetail — post-cancellation design
 * ================================================================
 * Mirrors CompletedDetail's card rhythm (banner → info card → tracker
 * card → details card → CTA) but in the cancelled palette: a red
 * "Booking Cancelled" banner instead of the green celebratory one, a
 * dedicated cancelled-flavoured tracker (Booked → Cancelled → Trip
 * Starts → Completed, with the back half greyed out), a Cancellation
 * Details card in place of Vehicle & Driver, and a Need Help support
 * card in place of the Rate/Invoice row. The sticky Book Again CTA is
 * kept — cancelling doesn't end the relationship, it's the fastest
 * way back into a fresh booking for the same route.
 * ================================================================ */

type CancelledProps = {
  detail: CustomerBookingDetail;
  onBack: () => void;
  onBookAgain: () => void;
};

const CancelledDetail: React.FC<CancelledProps> = ({
  detail,
  onBack,
  onBookAgain,
}) => {
  const status = STATUS_VISUAL.cancelled;
  const cancellation = detail.cancellation;

  /* Bottom-sheet ref for the "Need Help?" contact sheet. Same
     pattern as OngoingDetail — mounted once inside SafeScreen,
     presented imperatively when the user taps Contact Support. */
  const needHelpRef = useRef<BottomSheetModal>(null);

  const openNeedHelp = useCallback(() => {
    needHelpRef.current?.present();
  }, []);

  return (
    <SafeScreen edges={['top', 'bottom']} backgroundColor={Colors.background}>
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
        {/* ── Booking-cancelled banner ── */}
        <View style={styles.cancelledBanner}>
          <View style={styles.cancelledBadge}>
            <View style={styles.cancelledBadgeIcon}>
              <CalendarX
                size={26}
                color={Colors.textOnPrimary}
                strokeWidth={2.25}
              />
            </View>
          </View>
          <View style={styles.completedTextCol}>
            <Text style={styles.cancelledTitle}>Booking Cancelled</Text>
            <Text style={styles.cancelledBody}>
              {cancellation
                ? `This booking was cancelled on ${formatLongDate(
                    cancellation.cancelledAt,
                  )}.`
                : 'This booking was cancelled.'}
              {cancellation ? `\nReason: ${cancellation.reason}` : null}
            </Text>
          </View>
        </View>

        {/* ── Trip Details card (booking info + cancelled tracker) ── */}
        <View style={styles.card}>
          <TripDetailsHeader tripType={detail.tripType} />

          <View style={styles.idRow}>
            <View style={styles.idTile}>
              <Calendar size={22} color={Colors.primary} strokeWidth={2.25} />
            </View>
            <View style={styles.idBody}>
              <Text style={styles.idLabel}>Booking ID</Text>
              <Text style={styles.idValue}>{detail.bookingNumber}</Text>
            </View>
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

          {/* Cancelled-flavoured tracker, folded into the same card
              so booking info + timeline read as one section. */}
          <View style={styles.trackerDivider} />
          <CancelledProgressTracker
            bookedDate={detail.timeline.booked}
            cancelledDate={
              cancellation ? formatLongDate(cancellation.cancelledAt) : null
            }
          />
        </View>

        {/* ── Cancellation Details card ── */}
        {cancellation ? (
          <View style={styles.cancelDetailsCard}>
            <View style={styles.sectionHeadingRow}>
              <View style={styles.cancelIconTile}>
                <FileText size={18} color={Colors.error} strokeWidth={2.25} />
              </View>
              <Text
                style={[styles.sectionHeadingText, { color: Colors.error }]}
              >
                Cancellation Details
              </Text>
            </View>

            <CancelDetailRow
              label="Cancelled On"
              value={formatDateTime(cancellation.cancelledAt)}
            />
            <CancelDetailRow label="Reason" value={cancellation.reason} />
            <CancelDetailRow
              label="Cancelled By"
              value={cancellation.cancelledBy}
            />
            <CancelDetailRow
              label="Refund Amount"
              value={formatRupees(cancellation.refundAmount)}
              note={cancellation.refundNote}
            />
            <CancelDetailRow
              label="Payment Status"
              value={
                detail.payment
                  ? PAYMENT_STATUS_LABEL[detail.payment.status]
                  : '—'
              }
            />
          </View>
        ) : null}

        {/* ── Need Help support card ── */}
        <View style={styles.helpCard}>
          <View style={styles.helpIconTile}>
            <Headphones size={20} color={BLUE_FG} strokeWidth={2.25} />
          </View>
          <View style={styles.helpTextCol}>
            <Text style={styles.helpTitle}>Need Help?</Text>
            <Text style={styles.helpBody}>
              Contact our support team for any queries.
            </Text>
          </View>
          <Pressable
            onPress={openNeedHelp}
            style={({ pressed }) => [
              styles.contactSupportBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Contact support"
          >
            <Text style={styles.contactSupportBtnText}>Contact Support</Text>
          </Pressable>
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

      {/* Need Help bottom sheet — mounted once, presented imperatively
          via `needHelpRef` from the Need Help card's Contact Support
          button. Portaled to the app-root BottomSheetModalProvider
          (App.tsx), so it sits above the sticky bar without extra
          z-index plumbing. */}
      <NeedHelpSheet
        ref={needHelpRef}
        executive={STANDARD_EXECUTIVE}
        contextRef={detail.bookingNumber}
      />
    </SafeScreen>
  );
};

/* -------- CancelledProgressTracker --------------------------------
 * Purpose-built 4-dot tracker for the cancelled flow: Booked (done,
 * green check) → Cancelled (red X, the terminal step for this
 * booking) → Trip Starts / Completed (both permanently pending/gray,
 * since the trip never happens). Kept separate from the shared
 * `BookingProgressTracker` rather than overloading it — that
 * component's step vocabulary and "done/current/pending" cursor model
 * are built around the happy path (booked→confirmed→started→
 * completed) and don't have a slot for a step that replaces
 * "Confirmed" and permanently halts the timeline. */
const CancelledProgressTracker: React.FC<{
  bookedDate: string | undefined;
  cancelledDate: string | null;
}> = ({ bookedDate, cancelledDate }) => (
  <View style={styles.row}>
    <View style={styles.stepCol}>
      <View style={styles.dotDone}>
        <Check size={12} color={Colors.textOnPrimary} strokeWidth={3} />
      </View>
      <Text style={styles.label}>Booked</Text>
      {bookedDate ? <Text style={styles.sub}>{bookedDate}</Text> : null}
    </View>
    <View style={[styles.connector, styles.connectorDone]} />

    <View style={styles.stepCol}>
      <View style={styles.dotCancelled}>
        <X size={12} color={Colors.textOnPrimary} strokeWidth={3} />
      </View>
      <Text style={[styles.label, { color: Colors.error }]}>Cancelled</Text>
      {cancelledDate ? (
        <Text style={[styles.sub, { color: Colors.error }]}>
          {cancelledDate}
        </Text>
      ) : null}
    </View>
    <View style={styles.connector} />

    <View style={styles.stepCol}>
      <View style={styles.dotPending} />
      <Text style={[styles.label, styles.labelPending]}>Trip Starts</Text>
      <Text style={[styles.sub, styles.subPending]}>-</Text>
    </View>
    <View style={styles.connector} />

    <View style={styles.stepCol}>
      <View style={styles.dotPending} />
      <Text style={[styles.label, styles.labelPending]}>Completed</Text>
      <Text style={[styles.sub, styles.subPending]}>-</Text>
    </View>
  </View>
);

const CancelDetailRow: React.FC<{
  label: string;
  value: string;
  note?: string | null;
}> = ({ label, value, note }) => (
  <View style={styles.cancelDetailRow}>
    <Text style={styles.cancelDetailLabel}>{label}</Text>
    <View style={styles.cancelDetailValueCol}>
      <Text style={styles.cancelDetailValue}>{value}</Text>
      {note ? (
        <View style={styles.cancelDetailNoteRow}>
          <Info size={12} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.cancelDetailNote}>{note}</Text>
        </View>
      ) : null}
    </View>
  </View>
);

/* ================================================================
 * UpcomingDetail — pre-trip design
 * ================================================================
 * Mirrors the same card rhythm as CompletedDetail/CancelledDetail:
 * status banner → booking info card → tracker card → Trip
 * Information (pickup/drop) → Vehicle + Driver as two side-by-side
 * cards → Fare Details (advance/remaining split) → a sticky Book
 * Again CTA. Kept as its own component rather than
 * folding into GenericDetail for the same reason CompletedDetail and
 * CancelledDetail are separate: this is a fully designed surface
 * with its own section set (pickup/drop, side-by-side vehicle+driver,
 * advance/remaining fare split) that doesn't share layout with the
 * generic fallback.
 * ================================================================ */

type UpcomingProps = {
  detail: CustomerBookingDetail;
  onBack: () => void;
};

const UpcomingDetail: React.FC<UpcomingProps> = ({ detail, onBack }) => {
  const status = STATUS_VISUAL.upcoming;

  /* Bottom-sheet ref for the "Need Help?" contact sheet. Same pattern
     as OngoingDetail / CancelledDetail — mounted once inside SafeScreen,
     presented imperatively when the user taps Contact Support. */
  const needHelpRef = useRef<BottomSheetModal>(null);

  const openNeedHelp = useCallback(() => {
    needHelpRef.current?.present();
  }, []);

  return (
    <SafeScreen edges={['top', 'bottom']} backgroundColor={Colors.background}>
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
        {/* ── Trip-confirmed banner ── */}
        <View style={styles.completedBanner}>
          <View style={styles.completedBadge}>
            <View style={styles.completedBadgeCheck}>
              <CalendarClock
                size={26}
                color={Colors.textOnPrimary}
                strokeWidth={2.25}
              />
            </View>
          </View>
          <View style={styles.completedTextCol}>
            <Text style={styles.completedTitle}>Your trip is confirmed!</Text>
            <Text style={styles.completedBody}>
              Your vehicle and driver will be ready for your journey. We look
              forward to serving you.
            </Text>
          </View>
        </View>

        {/* ── Trip Details card (booking info + progress tracker) ── */}
        <View style={styles.card}>
          <TripDetailsHeader tripType={detail.tripType} />

          <View style={styles.idRow}>
            <View style={styles.idTile}>
              <Calendar size={22} color={Colors.primary} strokeWidth={2.25} />
            </View>
            <View style={styles.idBody}>
              <Text style={styles.idLabel}>Booking ID</Text>
              <Text style={styles.idValue}>{detail.bookingNumber}</Text>
            </View>
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

          {/* Tracker folded into the same card. */}
          <View style={styles.trackerDivider} />
          <BookingProgressTracker
            currentStep={detail.progressStep}
            subLabels={detail.timeline}
          />
        </View>

        {/* ── Trip Information card ── */}
        {detail.pickupLocation || detail.dropLocation ? (
          <View style={styles.card}>
            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionIconTile}>
                <MapPin size={18} color={Colors.primary} strokeWidth={2.25} />
              </View>
              <Text style={styles.sectionHeadingText}>Trip Information</Text>
            </View>

            <View style={styles.tripInfoRow}>
              <View style={styles.tripInfoRail}>
                <View style={styles.tripInfoDotPickup} />
                <View style={styles.tripInfoRailLine} />
                <View style={styles.tripInfoDotDrop} />
              </View>
              <View style={styles.tripInfoTextCol}>
                <View style={styles.tripInfoStop}>
                  <Text style={styles.tripInfoLabel}>Pickup Location</Text>
                  <Text style={styles.tripInfoValue}>
                    {detail.pickupLocation ?? '—'}
                  </Text>
                </View>
                <View style={styles.tripInfoStop}>
                  <Text style={styles.tripInfoLabel}>Drop Location</Text>
                  <Text style={styles.tripInfoValue}>
                    {detail.dropLocation ?? '—'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* ── Vehicle + Driver — side-by-side cards ── */}
        <View style={styles.sideBySideRow}>
          <View style={[styles.card, styles.sideBySideCard]}>
            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionIconTile}>
                <CarFront size={16} color={Colors.primary} strokeWidth={2.25} />
              </View>
              <Text style={styles.sideBySideHeading}>Vehicle Details</Text>
            </View>
            <View style={styles.vehiclePhotoTileWide}>
              <Bus size={32} color={Colors.primary} strokeWidth={1.75} />
            </View>
            <Text style={styles.vehicleName}>
              {detail.vehicleModel ?? detail.vehicleType}
            </Text>
            <View style={styles.vehicleAttrList}>
              {[
                detail.seater ? `${detail.seater} Seater` : detail.vehicleType,
                detail.hasAC ? 'AC' : null,
                detail.vehicleFuel,
              ]
                .filter(Boolean)
                .map(attr => (
                  <Text key={attr} style={styles.vehicleAttrItem}>
                    {attr}
                  </Text>
                ))}
            </View>
          </View>

          <View style={[styles.card, styles.sideBySideCard]}>
            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionIconTile}>
                <Users size={16} color={Colors.primary} strokeWidth={2.25} />
              </View>
              <Text style={styles.sideBySideHeading}>Driver Details</Text>
            </View>
            {detail.driver ? (
              <>
                <View style={styles.driverRowCompact}>
                  {detail.driver.avatarUrl ? (
                    <Image
                      source={{ uri: detail.driver.avatarUrl }}
                      style={styles.driverAvatarSmall}
                    />
                  ) : (
                    <View
                      style={[
                        styles.driverAvatarSmall,
                        styles.driverAvatarFallback,
                      ]}
                    >
                      <Text style={styles.driverInitials}>
                        {initialsOf(detail.driver.name)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.driverBody}>
                    <Text style={styles.driverNameSmall} numberOfLines={1}>
                      {detail.driver.name}
                    </Text>
                    {detail.driver.rating !== null ? (
                      <View style={styles.ratingRow}>
                        <Star
                          size={12}
                          color={Colors.warning}
                          fill={Colors.warning}
                          strokeWidth={2}
                        />
                        <Text style={styles.ratingTextSmall}>
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
                </View>
                <Pressable
                  onPress={() => callDriver(detail.driver?.phoneE164)}
                  disabled={!detail.driver.phoneE164}
                  style={({ pressed }) => [
                    styles.callDriverBtn,
                    pressed && styles.pressed,
                    !detail.driver?.phoneE164 && styles.disabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Call driver"
                >
                  <Phone size={14} color={Colors.primary} strokeWidth={2.5} />
                  <Text style={styles.callDriverBtnText}>Call Driver</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.driverPendingText}>
                Driver will be assigned closer to your trip date.
              </Text>
            )}
          </View>
        </View>

        {/* ── Fare Details card ── */}
        <View style={styles.card}>
          <View style={styles.sectionHeadingRow}>
            <View style={styles.sectionIconTile}>
              <IndianRupee
                size={18}
                color={Colors.primary}
                strokeWidth={2.25}
              />
            </View>
            <Text style={styles.sectionHeadingText}>Fare Details</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.fareRow}>
            <View style={styles.fareCell}>
              <Text style={styles.fareCellLabel}>Total Amount</Text>
              <Text style={styles.fareCellValue}>
                {formatRupees(detail.totalAmount)}
              </Text>
            </View>
            {detail.fareBreakdown ? (
              <>
                <View style={styles.fareCell}>
                  <Text style={styles.fareCellLabel}>
                    Advance Paid ({detail.fareBreakdown.advancePercent}%)
                  </Text>
                  <Text style={styles.fareCellValue}>
                    {formatRupees(detail.fareBreakdown.advancePaid)}
                  </Text>
                </View>
                <View style={styles.fareCell}>
                  <Text style={styles.fareCellLabel}>Remaining Amount</Text>
                  <View style={styles.fareRemainingRow}>
                    <Text style={styles.fareCellValue}>
                      {formatRupees(detail.fareBreakdown.remainingAmount)}
                    </Text>
                    {detail.fareBreakdown.remainingNote ? (
                      <View style={styles.payLaterChip}>
                        <Text style={styles.payLaterChipText}>
                          {detail.fareBreakdown.remainingNote}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </View>

        {/* ── Need Help support card ── */}
        <View style={styles.helpCard}>
          <View style={styles.helpIconTile}>
            <Headphones size={20} color={BLUE_FG} strokeWidth={2.25} />
          </View>
          <View style={styles.helpTextCol}>
            <Text style={styles.helpTitle}>Need Help?</Text>
            <Text style={styles.helpBody}>
              Contact our support team for any queries.
            </Text>
          </View>
          <Pressable
            onPress={openNeedHelp}
            style={({ pressed }) => [
              styles.contactSupportBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Contact support"
          >
            <Text style={styles.contactSupportBtnText}>Contact Support</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Need Help bottom sheet — mounted once, presented imperatively
          via `needHelpRef` from the Need Help card's Contact Support
          button. Portaled to the app-root BottomSheetModalProvider
          (App.tsx). */}
      <NeedHelpSheet
        ref={needHelpRef}
        executive={STANDARD_EXECUTIVE}
        contextRef={detail.bookingNumber}
      />
    </SafeScreen>
  );
};

/* ================================================================
 * OngoingDetail — mid-trip design
 * ================================================================
 * Rendered while the booking is `status === 'ongoing'` — the driver
 * has picked up the party and the vehicle is en route. Layout rhythm
 * mirrors UpcomingDetail so returning users don't have to relearn
 * where to look, but the surface is retuned for a trip in motion:
 *
 *   Blue "in progress" banner (replaces the confirmation banner)
 *   Booking info card                        [reused from upcoming]
 *   Tracker card                             [reused, `started` step]
 *   Trip Information (pickup/drop)           [reused, guarded]
 *   Live Location card                       [ongoing-only]
 *     — Header with green "Live" pill
 *     — Map placeholder (real map SDK not wired yet — see notes)
 *     — Overlay ETA badge + "En route to X" chip
 *   Vehicle + Driver side-by-side            [reused from upcoming]
 *   Need Help support card (green variant)   [ongoing-only]
 *   Sticky "Track Vehicle" primary CTA       [ongoing-only]
 *
 * The Fare Details block from UpcomingDetail is intentionally
 * dropped: the balance question is either already settled by the
 * time the trip is rolling, or it's a post-trip conversation. Mid-
 * trip the surface should be about "where's my car, who's driving,
 * and how do I reach them" — not accounting.
 *
 * Live map is rendered as a stylised placeholder View for now. The
 * real integration hangs off `detail.liveTracking` (etaLabel /
 * remainingLabel / routeSummary) so swapping in a real map view
 * later is a purely additive change — the surrounding chrome and
 * the ETA / route chip already read from that field.
 * ================================================================ */

type OngoingProps = {
  detail: CustomerBookingDetail;
  onBack: () => void;
  onTrackVehicle: () => void;
};

const OngoingDetail: React.FC<OngoingProps> = ({
  detail,
  onBack,
  onTrackVehicle,
}) => {
  const status = STATUS_VISUAL.ongoing;
  const live = detail.liveTracking;

  /* Bottom-sheet ref for the "Need Help?" contact sheet. Mounted
     once inside SafeScreen, presented imperatively when the user
     taps Contact Support on the Need Help card. */
  const needHelpRef = useRef<BottomSheetModal>(null);

  const openNeedHelp = useCallback(() => {
    needHelpRef.current?.present();
  }, []);

  return (
    <SafeScreen edges={['top', 'bottom']} backgroundColor={Colors.background}>
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
        {/* ── In-progress banner ── */}
        <View style={styles.progressBanner}>
          <View style={styles.progressBadge}>
            <View style={styles.progressBadgeIcon}>
              <Car size={26} color={Colors.textOnPrimary} strokeWidth={2.25} />
            </View>
          </View>
          <View style={styles.completedTextCol}>
            <Text style={styles.progressTitle}>Your trip is in progress</Text>
            <Text style={styles.completedBody}>
              We hope you're having a safe and comfortable journey with Urban
              Cruise.
            </Text>
          </View>
        </View>

        {/* ── Trip Details card (booking info + progress tracker) ── */}
        <View style={styles.card}>
          <TripDetailsHeader tripType={detail.tripType} />

          <View style={styles.idRow}>
            <View style={styles.idTile}>
              <Calendar size={22} color={Colors.primary} strokeWidth={2.25} />
            </View>
            <View style={styles.idBody}>
              <Text style={styles.idLabel}>Booking ID</Text>
              <Text style={styles.idValue}>{detail.bookingNumber}</Text>
            </View>
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

          {/* Tracker folded into the same card — the ongoing view
              still renders the "started" step as done (see
              renderCurrentAs) because the live-location card below
              is the true current-state UI. */}
          <View style={styles.trackerDivider} />
          <BookingProgressTracker
            currentStep={detail.progressStep}
            subLabels={detail.timeline}
            renderCurrentAs="done"
            labelOverrides={{ started: 'Trip Started' }}
          />
        </View>

        {/* ── Live Location card ── */}
        {live ? (
          <View style={styles.card}>
            <View style={styles.liveHeadRow}>
              <View style={styles.liveHeadLeft}>
                <View style={styles.sectionIconTile}>
                  <MapPin size={18} color={Colors.primary} strokeWidth={2.25} />
                </View>
                <View style={styles.liveHeadTextCol}>
                  <Text style={styles.sectionHeadingText}>Live Location</Text>
                  <Text style={styles.liveHeadSubtitle}>
                    Track your vehicle in real-time
                  </Text>
                </View>
              </View>
              <View style={styles.livePill}>
                <View style={styles.livePillDot} />
                <Text style={styles.livePillText}>Live</Text>
              </View>
            </View>

            {/*
              Placeholder map surface. Rendered as a styled View so
              the design stays intact without an actual maps SDK
              integration; the ETA card + route chip overlay real
              telemetry values via `detail.liveTracking` when the
              map component lands.
            */}
            <View style={styles.liveMapPlaceholder}>
              <View style={styles.liveMapCenterIcon}>
                <Navigation size={40} color={Colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.liveRouteChip}>
                <Text style={styles.liveRouteChipText}>
                  {live.routeSummary}
                </Text>
              </View>
              <View style={styles.liveEtaCard}>
                <View style={styles.liveEtaHeadRow}>
                  <Clock
                    size={14}
                    color={Colors.textSecondary}
                    strokeWidth={2.25}
                  />
                  <Text style={styles.liveEtaLabel}>Estimated Arrival</Text>
                </View>
                <Text style={styles.liveEtaTime}>{live.etaLabel}</Text>
                <Text style={styles.liveEtaRemaining}>
                  ({live.remainingLabel})
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* ── Trip Information card ── */}
        {detail.pickupLocation || detail.dropLocation ? (
          <View style={styles.card}>
            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionIconTile}>
                <MapPin size={18} color={Colors.primary} strokeWidth={2.25} />
              </View>
              <Text style={styles.sectionHeadingText}>Trip Information</Text>
            </View>

            <View style={styles.tripInfoRow}>
              <View style={styles.tripInfoRail}>
                <View style={styles.tripInfoDotPickup} />
                <View style={styles.tripInfoRailLine} />
                <View style={styles.tripInfoDotDrop} />
              </View>
              <View style={styles.tripInfoTextCol}>
                <View style={styles.tripInfoStop}>
                  <Text style={styles.tripInfoLabel}>Pickup Location</Text>
                  <Text style={styles.tripInfoValue}>
                    {detail.pickupLocation ?? '—'}
                  </Text>
                </View>
                <View style={styles.tripInfoStop}>
                  <Text style={styles.tripInfoLabel}>Drop Location</Text>
                  <Text style={styles.tripInfoValue}>
                    {detail.dropLocation ?? '—'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* ── Vehicle + Driver — side-by-side cards (reused shell) ── */}
        <View style={styles.sideBySideRow}>
          <View style={[styles.card, styles.sideBySideCard]}>
            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionIconTile}>
                <CarFront size={16} color={Colors.primary} strokeWidth={2.25} />
              </View>
              <Text style={styles.sideBySideHeading}>Vehicle Details</Text>
            </View>
            <View style={styles.vehiclePhotoTileWide}>
              <Bus size={32} color={Colors.primary} strokeWidth={1.75} />
            </View>
            <Text style={styles.vehicleName}>
              {detail.vehicleModel ?? detail.vehicleType}
            </Text>
            <View style={styles.vehicleAttrList}>
              {[
                detail.seater ? `${detail.seater} Seater` : detail.vehicleType,
                detail.hasAC ? 'AC' : null,
                detail.vehicleFuel,
              ]
                .filter(Boolean)
                .map(attr => (
                  <Text key={attr} style={styles.vehicleAttrItem}>
                    {attr}
                  </Text>
                ))}
            </View>
            {detail.vehiclePlate ? (
              <View style={styles.vehiclePlateChip}>
                <Text style={styles.vehiclePlateChipText}>
                  {detail.vehiclePlate}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.card, styles.sideBySideCard]}>
            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionIconTile}>
                <Users size={16} color={Colors.primary} strokeWidth={2.25} />
              </View>
              <Text style={styles.sideBySideHeading}>Driver Details</Text>
            </View>
            {detail.driver ? (
              <>
                <View style={styles.driverRowCompact}>
                  {detail.driver.avatarUrl ? (
                    <Image
                      source={{ uri: detail.driver.avatarUrl }}
                      style={styles.driverAvatarSmall}
                    />
                  ) : (
                    <View
                      style={[
                        styles.driverAvatarSmall,
                        styles.driverAvatarFallback,
                      ]}
                    >
                      <Text style={styles.driverInitials}>
                        {initialsOf(detail.driver.name)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.driverBody}>
                    <Text style={styles.driverNameSmall} numberOfLines={1}>
                      {detail.driver.name}
                    </Text>
                    {detail.driver.rating !== null ? (
                      <View style={styles.ratingRow}>
                        <Star
                          size={12}
                          color={Colors.warning}
                          fill={Colors.warning}
                          strokeWidth={2}
                        />
                        <Text style={styles.ratingTextSmall}>
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
                </View>
                <Pressable
                  onPress={() => callDriver(detail.driver?.phoneE164)}
                  disabled={!detail.driver.phoneE164}
                  style={({ pressed }) => [
                    styles.callDriverBtn,
                    pressed && styles.pressed,
                    !detail.driver?.phoneE164 && styles.disabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Call driver"
                >
                  <Phone size={14} color={Colors.primary} strokeWidth={2.5} />
                  <Text style={styles.callDriverBtnText}>Call Driver</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.driverPendingText}>
                Driver assignment pending.
              </Text>
            )}
          </View>
        </View>

        {/* ── Need Help support card ── */}
        <View style={styles.helpCard}>
          <View style={styles.helpIconTile}>
            <Headphones size={20} color={BLUE_FG} strokeWidth={2.25} />
          </View>
          <View style={styles.helpTextCol}>
            <Text style={styles.helpTitle}>Need Help?</Text>
            <Text style={styles.helpBody}>
              Contact our support team for any queries.
            </Text>
          </View>
          <Pressable
            onPress={openNeedHelp}
            style={({ pressed }) => [
              styles.contactSupportBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Contact support"
          >
            <Text style={styles.contactSupportBtnText}>Contact Support</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ── Sticky bottom CTA bar: Track Vehicle (primary, full-width) ── */}
      <View style={styles.stickyBar}>
        <Pressable
          onPress={onTrackVehicle}
          style={({ pressed }) => [
            styles.primaryCta,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Track vehicle"
        >
          <Navigation
            size={18}
            color={Colors.textOnPrimary}
            strokeWidth={2.5}
          />
          <Text style={styles.primaryCtaText}>Track Vehicle</Text>
        </Pressable>
      </View>

      {/* Need Help bottom sheet — mounted once, presented imperatively
          via `needHelpRef` from the Need Help card's Contact Support
          button. Portaled to the app-root BottomSheetModalProvider
          (App.tsx), so it sits above the sticky bar without extra
          z-index plumbing. */}
      <NeedHelpSheet
        ref={needHelpRef}
        executive={STANDARD_EXECUTIVE}
        contextRef={detail.bookingNumber}
      />
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
          <TripDetailsHeader tripType={detail.tripType} />
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

/**
 * TripDetailsHeader — icon + "Trip Details" title on the left, a
 * read-only trip-type badge (One Way / Round Trip / Pickup & Drop)
 * on the right. Mirrors the header used on the QuotationDetailScreen
 * Trip Details card so the same section reads identically across
 * both screens. First child of every merged summary+tracker card
 * across the five status-specific detail layouts below — nothing
 * else in the card changes.
 */
const TripDetailsHeader: React.FC<{ tripType: TripType }> = ({ tripType }) => {
  const { Icon, label } = getTripTypeOption(tripType);
  return (
    <View style={styles.tripDetailsHeaderRow}>
      <View style={styles.sectionIconTile}>
        <MapPin size={18} color={Colors.primary} strokeWidth={2.25} />
      </View>
      <Text style={[styles.sectionHeadingText, styles.tripDetailsTitleGrow]}>
        Trip Details
      </Text>
      <View style={styles.tripTypeBadge}>
        <Icon size={13} color={Colors.primaryDark} strokeWidth={2.5} />
        <Text style={styles.tripTypeBadgeText} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
};

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

  /* ── Trip Details card header (icon + title + trip-type badge) ──
     Placed as the FIRST child of the merged summary+tracker card.
     Icon + "Trip Details" sit at the top-left (reusing the same
     icon-tile + heading pair as the other card headings below); the
     trip-type badge sits at the top-right. Mirrors the header on the
     QuotationDetailScreen Trip Details card. */
  tripDetailsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tripDetailsTitleGrow: {
    flex: 1,
  },
  tripTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 130,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryTint,
  },
  tripTypeBadgeText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.primaryDark,
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

  /* ── Cancelled banner ── */
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.errorTint,
    borderWidth: 1,
    borderColor: Colors.errorTint,
  },
  cancelledBadge: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelledBadgeIcon: {
    width: 54,
    height: 54,
    borderRadius: Radius.circle,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelledTitle: {
    ...Typography.subtitle,
    color: Colors.error,
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 22,
  },
  cancelledBody: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  /* ── Cancelled-flavoured tracker (mirrors BookingProgressTracker's
   *    internal layout so the two visually match) ── */
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  stepCol: {
    alignItems: 'center',
    gap: 3,
    width: 60,
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginTop: TRACKER_DOT / 2 - 1,
    marginHorizontal: -20,
  },
  connectorDone: {
    backgroundColor: Colors.primary,
  },
  dotDone: {
    width: TRACKER_DOT,
    height: TRACKER_DOT,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCancelled: {
    width: TRACKER_DOT,
    height: TRACKER_DOT,
    borderRadius: Radius.circle,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPending: {
    width: TRACKER_DOT,
    height: TRACKER_DOT,
    borderRadius: Radius.circle,
    backgroundColor: Colors.border,
  },
  label: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  labelPending: {
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sub: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
    includeFontPadding: false,
  },
  subPending: {
    color: Colors.textTertiary,
  },

  /* ── Cancellation Details card ── */
  cancelDetailsCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.errorTint,
    gap: Spacing.sm,
  },
  cancelIconTile: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  cancelDetailLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  cancelDetailValueCol: {
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 1,
  },
  cancelDetailValue: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '700',
    textAlign: 'right',
  },
  cancelDetailNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cancelDetailNote: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  /* ── Need Help support card ── */
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: BLUE_TINT,
  },
  helpIconTile: {
    width: 40,
    height: 40,
    borderRadius: Radius.circle,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpTextCol: {
    flex: 1,
    gap: 2,
  },
  helpTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 15,
  },
  helpBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  contactSupportBtn: {
    height: 38,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: BLUE_FG,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactSupportBtnText: {
    ...Typography.caption,
    color: BLUE_FG,
    fontWeight: '800',
    includeFontPadding: false,
  },

  /* ── Trip Information (pickup/drop) card ── */
  tripInfoRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  tripInfoRail: {
    width: 16,
    alignItems: 'center',
    paddingTop: 4,
  },
  tripInfoDotPickup: {
    width: 12,
    height: 12,
    borderRadius: Radius.circle,
    borderWidth: 2.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  tripInfoRailLine: {
    flex: 1,
    width: 2,
    minHeight: 28,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  tripInfoDotDrop: {
    width: 12,
    height: 12,
    borderRadius: Radius.circle,
    backgroundColor: Colors.info,
  },
  tripInfoTextCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  tripInfoStop: {
    gap: 2,
  },
  tripInfoLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  tripInfoValue: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '800',
  },

  /* ── Vehicle + Driver side-by-side cards ── */
  sideBySideRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'stretch',
  },
  sideBySideCard: {
    flex: 1,
  },
  sideBySideHeading: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '800',
    flexShrink: 1,
  },
  vehiclePhotoTileWide: {
    height: 64,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleAttrList: {
    gap: 3,
  },
  vehicleAttrItem: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  driverRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  driverAvatarSmall: {
    width: 44,
    height: 44,
    borderRadius: Radius.circle,
    backgroundColor: Colors.surfaceMuted,
  },
  driverNameSmall: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  ratingTextSmall: {
    ...Typography.caption,
    color: Colors.warning,
    fontWeight: '800',
  },
  callDriverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  callDriverBtnText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '800',
    includeFontPadding: false,
  },
  driverPendingText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 16,
  },

  /* ── Fare Details card ── */
  fareRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  fareCell: {
    flex: 1,
    gap: 4,
  },
  fareCellLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  fareCellValue: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  fareRemainingRow: {
    gap: 4,
  },
  payLaterChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: BLUE_TINT,
  },
  payLaterChipText: {
    ...Typography.caption,
    fontSize: 10,
    color: BLUE_FG,
    fontWeight: '700',
    includeFontPadding: false,
  },

  /* ── Upcoming sticky bar: Book Again (primary, full-width) ── */
  stickyRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'stretch',
  },
  ctaHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  bookAgainWide: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    gap: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookAgainWideTitle: {
    ...Typography.bodySmall,
    color: Colors.textOnPrimary,
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 18,
    includeFontPadding: false,
  },
  bookAgainWideSubtitle: {
    ...Typography.caption,
    color: Colors.textOnPrimary,
    fontWeight: '500',
    fontSize: 11,
    lineHeight: 14,
    opacity: 0.9,
    includeFontPadding: false,
  },

  /* =============================================================
   * Ongoing screen — dedicated styles
   * =============================================================
   * Only styles NOT reusable from the completed/upcoming/cancelled
   * variants live here. Everything shared (card, tracker, side-by-
   * side vehicle/driver, pickup/drop, sticky primary CTA) is
   * reused directly. */

  /* ── "Your trip is in progress" banner (blue tint) ── */
  progressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: BLUE_TINT,
    borderWidth: 1,
    borderColor: BLUE_TINT,
  },
  progressBadge: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBadgeIcon: {
    width: 54,
    height: 54,
    borderRadius: Radius.circle,
    backgroundColor: BLUE_FG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTitle: {
    ...Typography.subtitle,
    color: BLUE_FG,
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 22,
  },

  /* ── Live Location card ── */
  liveHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  liveHeadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  liveHeadTextCol: {
    flex: 1,
    gap: 2,
  },
  liveHeadSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    includeFontPadding: false,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryTint,
  },
  livePillDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primary,
  },
  livePillText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '800',
    includeFontPadding: false,
  },
  liveMapPlaceholder: {
    /* Real map SDK is not wired for this build — the surface is
       rendered as a light muted rectangle so the surrounding chrome
       (ETA card, route chip) sits in the right layout. Swap the
       inner icon for a MapView later. */
    height: 200,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryTint,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  liveMapCenterIcon: {
    opacity: 0.55,
  },
  liveRouteChip: {
    position: 'absolute',
    top: Spacing.md,
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    ...Shadows.xs,
  },
  liveRouteChipText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
    includeFontPadding: false,
  },
  liveEtaCard: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
    gap: 2,
    minWidth: 130,
  },
  liveEtaHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveEtaLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    fontSize: 10,
    lineHeight: 12,
    includeFontPadding: false,
  },
  liveEtaTime: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 22,
    includeFontPadding: false,
  },
  liveEtaRemaining: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    fontSize: 10,
    lineHeight: 12,
    includeFontPadding: false,
  },

  /* ── Vehicle plate chip (bottom of the vehicle card) ── */
  vehiclePlateChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  vehiclePlateChipText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
});
