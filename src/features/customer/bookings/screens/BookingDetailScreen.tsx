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
 * post-trip surface (see mock in the ticket): trip-completed banner
 * with the Rate Your Trip card right under it, booking-info card with inline Book Again, tracker-in-a-card, the
 * shared Vehicle Details + Driver Details cards (no Call Driver),
 * and a sticky "Book Again for This Route" CTA. No Invoice card.
 *
 * Any other status → `GenericDetail` — the simpler status-agnostic
 * view (summary card with tracker inside, then the shared Vehicle
 * Details + Driver Details cards). This exists so a stale deep-link into 'upcoming' /
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
 * SHARED CARDS
 * ------------------------------------------------------------------
 * Every status uses the same `VehicleDetailsCard` and
 * `DriverDetailsCard` (in `../components`). Upcoming / Ongoing show
 * the Call Driver button; Completed / Cancelled pass
 * `showCall={false}`.
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
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  CalendarClock,
  CalendarX,
  Car,
  Check,
  CheckCircle2,
  CircleDot,
  Clock,
  FileText,
  Headphones,
  Lock,
  IndianRupee,
  Info,
  MapPin,
  Navigation,
  PenSquare,
  RotateCw,
  Star,
  X,
  XCircle,
} from 'lucide-react-native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import type { CustomerStackParamList } from '@navigation/types';
import {
  NeedChangesSheet,
  NeedHelpSheet,
  STANDARD_EXECUTIVE,
} from '@features/customer/quotations';

import type {
  BookingPaymentStatus,
  BookingStatus,
  CustomerBookingDetail,
} from '../types';
import { getCustomerBookingDetail } from '../mocks';
import { BookingProgressTracker } from '../components/BookingProgressTracker';
import { VehicleDetailsCard } from '../components/VehicleDetailsCard';
import { DriverDetailsCard } from '../components/DriverDetailsCard';
import { TripDetailsCard } from '../components/TripDetailsCard';
import {
  BookingNotesCard,
  BookingOtherChargesCard,
} from '../components/BookingTermsCards';

type Nav = NativeStackNavigationProp<CustomerStackParamList, 'BookingDetail'>;
type Route = RouteProp<CustomerStackParamList, 'BookingDetail'>;

/* ================================================================
 * Local palette extras
 * ================================================================
 * PURPLE_FG is the Rate Your Trip star; the soft blue is the Rate
 * Your Trip and Need Help card backgrounds. Neither tone exists in
 * @theme/colors today, and they only
 * live on this screen — hard-coded here with the same escape hatch
 * QuotationDetailScreen uses. Hoist into the palette if a second
 * consumer appears.
 * ================================================================ */
const PURPLE_FG = '#7C3AED';
const BLUE_TINT = '#EFF6FF';
const BLUE_FG = '#2563EB';

/** Outer diameter for the cancelled-tracker's dots — matches the
 *  `DOT` constant in BookingProgressTracker so the two trackers line
 *  up visually if they ever appear near each other. */
const TRACKER_DOT = 20;
/** Matches BookingProgressTracker — fits "10 Aug 2026" on one line. */
const TRACKER_STEP_COL_WIDTH = 72;

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

/** ₹12,000 — Indian grouping. */
function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/** ISO timestamp → "12 Aug 2026, 02:15 PM" — used by the Cancellation
 *  Details card. */
/** Tracker sub-label: "12 Aug 2026\n02:15 PM" (date over time). */
function formatTrackerDateTime(iso: string): string {
  const time = new Date(iso)
    .toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    .toUpperCase();
  return `${formatLongDate(iso)}\n${time}`;
}

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

const PAYMENT_STATUS_LABEL: Record<BookingPaymentStatus, string> = {
  paid: 'Paid',
  partial: 'Partial',
  unpaid: 'Unpaid',
};

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
    return <OngoingDetail detail={detail} onBack={handleBack} />;
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
};

const CompletedDetail: React.FC<CompletedProps> = ({
  detail,
  onBack,
  onBookAgain,
  onGiveFeedback,
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
                fill={Colors.secondaryDark}
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

        {/* ── Rate Your Trip — right under the Trip Completed banner,
            when the user is most likely to rate. Full-width row: icon,
            text, Give Feedback button. Soft blue background. ── */}
        <View style={styles.rateCard}>
          <View style={styles.rateIconTile}>
            <Star size={20} color={PURPLE_FG} strokeWidth={2.25} />
          </View>
          <View style={styles.rateTextCol}>
            <Text style={styles.rateTitle}>Rate Your Trip</Text>
            <Text style={styles.rateBody}>
              Share your experience and help us serve you better.
            </Text>
          </View>
          <Pressable
            onPress={onGiveFeedback}
            hitSlop={4}
            style={({ pressed }) => [styles.rateBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Give feedback"
          >
            <Text style={styles.rateBtnText}>Give Feedback</Text>
          </Pressable>
        </View>

        {/* ── Trip Details card (shared TripDetailsCard) ──
            The tracker shows the past-tense "Trip Started" label; Book
            Again lives only in the sticky bar at the bottom. */}
        <TripDetailsCard
          detail={detail}
          tracker={
            <BookingProgressTracker
              currentStep={detail.progressStep}
              subLabels={detail.timeline}
              labelOverrides={{ started: 'Trip Started' }}
            />
          }
        />

        {/* ── Vehicle + Driver — same cards as every status. The trip
            is over, so no Call Driver button. ── */}
        <View style={styles.detailStack}>
          <VehicleDetailsCard detail={detail} />
          {detail.driver ? (
            <DriverDetailsCard driver={detail.driver} showCall={false} />
          ) : null}
        </View>

        {/* ── Notes + Other Charges (from the booking; static for now) ── */}
        <BookingNotesCard notes={detail.notes} />
        <BookingOtherChargesCard charges={detail.otherCharges} />

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
 * Details card, and a Need Help support card. The shared Vehicle Details / Driver Details
 * cards show only if they were assigned before cancelling (vehicle
 * = a plate is set), without the Call Driver button. The sticky Book Again CTA is
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

        {/* ── Trip Details card + cancelled tracker ── */}
        <TripDetailsCard
          detail={detail}
          tracker={
            <CancelledProgressTracker
              bookedDate={detail.timeline.booked}
              cancelledDate={
                cancellation
                  ? formatTrackerDateTime(cancellation.cancelledAt)
                  : null
              }
            />
          }
        />

        {/* ── Vehicle + Driver — only what was assigned before the
            cancellation (a plate means a specific vehicle was). No
            Call Driver: the trip won't happen. ── */}
        {detail.vehiclePlate || detail.driver ? (
          <View style={styles.detailStack}>
            {detail.vehiclePlate ? (
              <VehicleDetailsCard detail={detail} />
            ) : null}
            {detail.driver ? (
              <DriverDetailsCard driver={detail.driver} showCall={false} />
            ) : null}
          </View>
        ) : null}

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
 * cards → Fare Details (advance/remaining split) → Notes → Other
 * Charges (if applicable) → a sticky bottom
 * bar with two equal actions: "Need Changes" (opens the shared
 * Request Changes sheet from Quotations) and "Need Help" (opens the
 * shared Need Help sheet). Kept as its own component rather than
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

  const navigation = useNavigation<Nav>();

  /* Two bottom sheets, both reused as-is from Quotations and mounted
     once inside SafeScreen, presented imperatively from the sticky
     bottom bar:
       - Need Changes → NeedChangesSheet ("Request Changes")
       - Need Help    → NeedHelpSheet (call / WhatsApp / email) */
  const needChangesRef = useRef<BottomSheetModal>(null);
  const needHelpRef = useRef<BottomSheetModal>(null);

  const openNeedChanges = useCallback(() => {
    needChangesRef.current?.present();
  }, []);

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

        {/* ── Trip Details card (shared TripDetailsCard) ── */}
        <TripDetailsCard
          detail={detail}
          tracker={
            <BookingProgressTracker
              currentStep={detail.progressStep}
              subLabels={detail.timeline}
            />
          }
        />

        {/* ── Vehicle + Driver — stacked full-width cards ── */}
        <View style={styles.detailStack}>
          <VehicleDetailsCard detail={detail} />

          <DriverDetailsCard
            driver={detail.driver}
            pendingText="Driver will be assigned closer to your trip date."
          />
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

        {/* ── Notes + Other Charges (from the booking; static for now) ── */}
        <BookingNotesCard notes={detail.notes} />
        <BookingOtherChargesCard charges={detail.otherCharges} />
      </ScrollView>

      {/* ── Sticky bottom bar: Need Changes · Need Help ── */}
      <View style={styles.actionBar}>
        <View style={styles.actionRow}>
          <Pressable
            onPress={openNeedChanges}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.needChangesBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Need changes"
            accessibilityHint="Request changes to this booking"
          >
            <PenSquare size={18} color={Colors.accent} strokeWidth={2.25} />
            <View style={styles.actionBody}>
              <Text style={styles.actionTitle}>Need Changes</Text>
              <Text style={styles.actionSubtitle} numberOfLines={1}>
                Request changes to this booking
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={openNeedHelp}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.needHelpBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Need help"
            accessibilityHint="Contact our support team"
          >
            <Headphones size={18} color={BLUE_FG} strokeWidth={2.25} />
            <View style={styles.actionBody}>
              <Text style={styles.actionTitle}>Need Help</Text>
              <Text style={styles.actionSubtitle} numberOfLines={1}>
                Talk to our support team
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.trustRow}>
          <Lock size={12} color={Colors.textTertiary} strokeWidth={2} />
          <Text style={styles.trustText}>
            Your data is secure and 100% safe with Urban Cruise
          </Text>
        </View>
      </View>

      {/* Both sheets portal to the app-root BottomSheetModalProvider
          (App.tsx); same props as on QuotationDetailScreen. */}
      <NeedChangesSheet
        ref={needChangesRef}
        executive={STANDARD_EXECUTIVE}
        onGoToQuotations={() =>
          navigation.navigate('CustomerTabs', { screen: 'Quotations' })
        }
        onBackToHome={() =>
          navigation.navigate('CustomerTabs', { screen: 'Home' })
        }
      />
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
 *   Trip Details card + tracker              [shared TripDetailsCard]
 *   Live Location card                       [ongoing-only]
 *     — Header with green "Live" pill
 *     — Map placeholder (real map SDK not wired yet — see notes)
 *     — Overlay ETA badge + "En route to X" chip
 *   Vehicle + Driver side-by-side            [reused from upcoming]
 *   Notes + Other Charges                    [shared BookingTermsCards]
 *   Need Help support card (green variant)   [ongoing-only]
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
};

const OngoingDetail: React.FC<OngoingProps> = ({ detail, onBack }) => {
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

        {/* ── Trip Details card (shared TripDetailsCard) ── */}
        <TripDetailsCard
          detail={detail}
          tracker={
            <BookingProgressTracker
              currentStep={detail.progressStep}
              subLabels={detail.timeline}
              renderCurrentAs="done"
              labelOverrides={{ started: 'Trip Started' }}
            />
          }
        />

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

        {/* ── Vehicle + Driver — stacked full-width cards (reused shell) ── */}
        <View style={styles.detailStack}>
          <VehicleDetailsCard detail={detail} />

          <DriverDetailsCard
            driver={detail.driver}
            pendingText="Driver assignment pending."
          />
        </View>

        {/* ── Notes + Other Charges (from the booking; static for now) ── */}
        <BookingNotesCard notes={detail.notes} />
        <BookingOtherChargesCard charges={detail.otherCharges} />

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
        <TripDetailsCard
          detail={detail}
          tracker={
            <BookingProgressTracker
              currentStep={detail.progressStep}
              subLabels={detail.timeline}
            />
          }
        />

        <View style={styles.detailStack}>
          <VehicleDetailsCard detail={detail} />
          <DriverDetailsCard driver={detail.driver} />
        </View>
      </ScrollView>
    </SafeScreen>
  );
};

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

  /* ── Upcoming sticky bottom bar (Need Changes · Need Help) ──
     Mirrors QuotationDetailScreen's bottom bar: two equal outline
     buttons with a title + one-line subtitle, then the trust line. */
  actionBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 52,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    backgroundColor: Colors.surface,
  },
  needChangesBtn: {
    borderColor: Colors.accent,
  },
  needHelpBtn: {
    borderColor: BLUE_FG,
  },
  actionBody: {
    flex: 1,
  },
  actionTitle: {
    ...Typography.bodySmall,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  actionSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trustText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontWeight: '500',
  },

  /* ── Welcome banner (Upcoming "Your trip is confirmed!" and
     Completed "Trip Completed!") — brand secondary (gold) so it
     stands apart from the green Trip Details card below. ── */
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.secondaryTint,
    borderWidth: 1,
    borderColor: Colors.secondaryLight,
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
    backgroundColor: Colors.secondaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedTextCol: {
    flex: 1,
    gap: 2,
  },
  completedTitle: {
    ...Typography.subtitle,
    color: Colors.secondaryDark,
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 22,
  },
  completedBody: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  /* ── Section heading (icon tile + title) ── */
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

  /* ── Rate Your Trip (completed) ── */
  rateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: BLUE_TINT,
  },
  rateIconTile: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateTextCol: {
    flex: 1,
    gap: 2,
  },
  rateTitle: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  rateBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  rateBtn: {
    height: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateBtnText: {
    ...Typography.caption,
    color: Colors.primaryDark,
    fontWeight: '700',
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
    width: TRACKER_STEP_COL_WIDTH,
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginTop: TRACKER_DOT / 2 - 1,
    marginHorizontal: -(TRACKER_STEP_COL_WIDTH / 2 - TRACKER_DOT / 2),
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

  /* Vehicle + Driver: two full-width cards stacked vertically
     (they were side by side, which squeezed the driver badges). */
  detailStack: {
    gap: Spacing.md,
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
});