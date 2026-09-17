/**
 * ------------------------------------------------------------------
 * QuotationDetailScreen (Customer)
 * ------------------------------------------------------------------
 * Opens from a "View" tap on any QuotationCard in the Quotations tab
 * (or from a deep-link). Shows the full priced quotation and gives
 * the customer the actions relevant to its current lifecycle state.
 *
 * LAYOUT (top → bottom, all inside a scroll container above a
 * sticky bottom action bar):
 *
 *   [← Quotation Details            [ ✓ Accepted / … / ⊗ Expired ]]
 *   [  Review your quotation and proceed                         ]
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ 📄  Quotation ID QU10257     [ status confirmation box ]  │
 *   │      Created on 10 Aug 2026                              │
 *   └──────────────────────────────────────────────────────────┘
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ 📍 Trip Details                                          │
 *   │  ● Delhi ───── ● Agra ───── ● Jaipur                      │
 *   │  (address)     (address)    (address)                    │
 *   │  ─────────────────────────                                │
 *   │  📅 Travel Date …          👥 Passengers …               │
 *   └──────────────────────────────────────────────────────────┘
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ 🚌 Vehicle Details                                       │
 *   │  [img]  Tempo Traveller                                  │
 *   │         20 Seater · Diesel · AC · Luggage                │
 *   └──────────────────────────────────────────────────────────┘
 *
 *   ┌ 📄 Total Amount ──────────────────────────── ₹35,200 ┐
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ ₹ Important Charges                  All amounts in ₹   │
 *   │  ┌────────────────────────────────┐                       │
 *   │  │ ✓ Included in Package (green)  │  ← list w/ checks    │
 *   │  └────────────────────────────────┘                       │
 *   │  ┌────────────────────────────────┐                       │
 *   │  │ • Paid by Customer (orange)    │  ← label + note      │
 *   │  └────────────────────────────────┘                       │
 *   └──────────────────────────────────────────────────────────┘
 *
 *   ┌─── accent band ─────────────────────────────────────────┐
 *   │  [🛣 Extra KM Charges]    [🌙 Driver Night Charges]     │
 *   │   tier → rate table         time window → rate table    │
 *   └─────────────────────────────────────────────────────────┘
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ 📄 Terms & Conditions                                    │
 *   │  ✓ KM counted from pickup point …                         │
 *   │  ✓ Local city trips not included …                        │
 *   │  ✓ AC OFF intermittently on hills …                       │
 *   │  ✓ …                                                       │
 *   └──────────────────────────────────────────────────────────┘
 *
 *   [ Need Changes ]     [ Confirm & Continue / etc ]   ← sticky
 *   🔒 Your data is secure and 100% safe with Urban Cruise
 *
 * ------------------------------------------------------------------
 * STATUS BRANCHING
 * ------------------------------------------------------------------
 * A single component tree renders three flavours, keyed off
 * `detail.status`. The body contains no status confirmation banners;
 * the status is represented only by the header pill and the CTA flow.
 * Pending acceptance opens the existing confirmation bottom sheet.
 *
 *   1. The header status pill.
 *   2. The sticky bottom bar CTAs:
 *
 *      - pending  → [Need Changes]  [Confirm & Continue]
 *          "Confirm & Continue" is the accept action.
 *      - accepted → [Need Changes]  [Continue to Booking]
 *          Right CTA relabelled; acceptance is done, so it flows
 *          the customer forward. "Need Changes" is kept because a
 *          customer can still request post-accept edits until the
 *          booking is issued (a real product decision from the
 *          request-modification flow that lives elsewhere).
 *      - expired  → [ Request New Quotation ] (full-width)
 *          Nothing else is actionable on an expired record; the
 *          Need Changes CTA doesn't make sense on a dead quote.
 *
 * All other sections (trip, vehicle, total, terms) render
 * identically regardless of status — the data is the same, only
 * the affordances change.
 *
 * ------------------------------------------------------------------
 * WHY subcomponents are LOCAL to this file
 * ------------------------------------------------------------------
 * The meta card, trip timeline, vehicle card, total bar, terms
 * grid and bottom bar are only meaningful in the context of this
 * screen. Extracting them to `components/` would create six new
 * files with zero external consumers. If any get reused later
 * (say, in a shared "Quotation summary" preview), hoist them
 * out at that point — YAGNI until then.
 *
 * ------------------------------------------------------------------
 * TODO(nav):
 *   - "Need Changes"        → ModificationRequest (ghost route)
 *   - "Confirm & Continue"  → opens the existing confirmation sheet;
 *                              the sheet currently shows a success toast
 *                              because the accept API is not connected yet.
 *   - "Continue to Booking" → BookingDetail (ghost) for the booking
 *                              that came from this quotation.
 *   - "Request New"         → RequestQuotation, pre-filling route
 *                              and passenger info from this record.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
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
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  FileText,
  IndianRupee,
  Mail,
  MessageCircle,
  Lock,
  MapPin,
  Milestone,
  Moon,
  PenSquare,
  Phone,
  RefreshCw,
  Users,
  XCircle,
} from 'lucide-react-native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { makePhoneCall, openWhatsApp, sendEmail } from '@services/contact';
import type { CustomerStackParamList } from '@navigation/types';

import type {
  CustomerQuotationDetail,
  QuotationStatus,
  TripType,
} from '../types';
import { getCustomerQuotationDetail } from '../mocks';
import { getTripTypeOption } from '../tripTypeOptions';
import {
  VEHICLE_TIER_OPTIONS,
  type VehicleTierKey,
  type VehicleTierOption,
} from '../vehicleTierOptions';
import { NeedChangesSheet } from '../components/NeedChangesSheet';
import { ContinueToBookingSheet } from '../components/ContinueToBookingSheet';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

type Nav = NativeStackNavigationProp<CustomerStackParamList, 'QuotationDetail'>;
type Route = RouteProp<CustomerStackParamList, 'QuotationDetail'>;

/* ================================================================
 * Palette extras
 * ================================================================
 * The design's night-charge tile is purple, but there's no purple
 * token in `@theme/colors`. Hard-coded here with a note — hoist
 * into the palette if a second consumer appears.
 * ================================================================ */
const PURPLE_FG = '#8B5CF6';
const PURPLE_TINT = '#EDE9FE';

/* ================================================================
 * Advisor contact-action tints
 * ================================================================
 * Kept in sync with the UC Directory customer contact modal
 * (src/features/uc/customers/components/CustomerContactSheet.tsx)
 * so contact affordances read the same everywhere in the app:
 *   Call     → blue tint
 *   WhatsApp → green (already the app's success/brand tone)
 *   Email    → warm orange tint
 * If a third consumer appears, hoist these into @theme/colors.
 * ================================================================ */
const CALL_TINT_BG = '#EAF2FF';
const CALL_TINT_FG = '#1D6BFF';
const EMAIL_TINT_BG = '#FFF1E0';
const EMAIL_TINT_FG = '#D97B0A';

/* ================================================================
 * Formatting helpers
 * ================================================================ */

/** "2026-08-12" / ISO → "12 Aug 2026". */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(rupees: number): string {
  return `₹${rupees.toLocaleString('en-IN')}`;
}

function formatPassengers(adults: number, children: number): string {
  const parts: string[] = [];
  parts.push(`${adults} ${adults === 1 ? 'Adult' : 'Adults'}`);
  if (children > 0) {
    parts.push(`${children} ${children === 1 ? 'Child' : 'Children'}`);
  }
  return parts.join(', ');
}

/* ================================================================
 * Status visual mappings
 * ================================================================ */

type StatusVisual = {
  label: string;
  fg: string;
  bg: string;
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
};

const STATUS_VISUAL: Record<QuotationStatus, StatusVisual> = {
  pending: {
    label: 'Pending',
    fg: Colors.warning,
    bg: Colors.warningTint,
    Icon: Clock,
  },
  accepted: {
    label: 'Accepted',
    fg: Colors.success,
    bg: Colors.successTint,
    Icon: CheckCircle2,
  },
  expired: {
    label: 'Expired',
    fg: Colors.error,
    bg: Colors.errorTint,
    Icon: XCircle,
  },
};

/* ================================================================
 * Screen
 * ================================================================ */

const QuotationDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const detail = useMemo(
    () => getCustomerQuotationDetail(route.params.quotationId),
    [route.params.quotationId],
  );

  /* -------- Sheet refs --------
   *
   * Two ref-driven bottom sheets: one for "Need Changes" and one
   * for "Continue to Booking". Both are mounted (but hidden) at
   * the bottom of the tree; the CTAs imperatively `.present()`
   * them. This is the same pattern used across the UC feature
   * (CustomerFilterSheet, VendorContactSheet, etc.) — see
   * `@gorhom/bottom-sheet`'s docs for the rationale over the
   * declarative visible-prop approach. */
  const needChangesRef = useRef<BottomSheetModal>(null);
  const confirmationRef = useRef<BottomSheetModal>(null);

  /* -------- Selection state --------
   *
   * Which vehicle tier the customer has committed to in the pending
   * picker. Held HERE (not inside `ChooseVehicleSection`) so the
   * sticky `BottomBar` can gate its "Accept & Continue" CTA on it —
   * a customer shouldn't be able to accept a quotation before they
   * have chosen a vehicle.
   *
   * Ignored for `accepted` / `expired` quotations, which don't
   * render the picker at all (the vehicle is already locked in
   * server-side). */
  const [selectedTierKey, setSelectedTierKey] = useState<VehicleTierKey | null>(
    null,
  );

  const acceptDisabled =
    detail?.status === 'pending' && selectedTierKey === null;

  /* -------- Handlers -------- */

  const onNeedChanges = useCallback(() => {
    needChangesRef.current?.present();
  }, []);

  const onConfirmAccept = useCallback(() => {
    // Belt-and-braces guard. `BottomBar` also refuses to fire this
    // when `acceptDisabled` is true (the Pressable is disabled and
    // won't dispatch), but keep the callback defensive so any
    // future caller (deep link, sheet result, unit test) can't
    // sneak past.
    if (acceptDisabled) return;
    // TODO(api): replace the sheet's local success toast with the
    // quotation-accept API mutation when the backend is available.
    confirmationRef.current?.present();
  }, [acceptDisabled]);

  const onContinueToBooking = useCallback(() => {
    if (!detail) return;
    confirmationRef.current?.present();
  }, [detail]);

  const onRequestNew = useCallback(() => {
    navigation.navigate('RequestQuotation');
  }, [navigation]);

  /* -------- Render -------- */

  if (!detail) {
    /* Defensive not-found. Fires when a deep-link references a
       quotation id that's not in the mock fixture (or, in prod,
       been purged from the customer's record). Keep the message
       actionable — going back is the only reasonable next step. */
    return (
      <SafeScreen edges={['top']} backgroundColor={Colors.background}>
        <View style={styles.headerBlock}>
          <ScreenHeader
            title="Quotation Details"
            onBack={() => navigation.goBack()}
          />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>Quotation not found</Text>
          <Text style={styles.notFoundSubtitle}>
            This quotation link is no longer valid.
          </Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      <View style={styles.headerBlock}>
        <ScreenHeader
          title="Quotation Details"
          subtitle="Review your quotation and proceed"
          onBack={() => navigation.goBack()}
          rightSlot={<StatusPill status={detail.status} />}
        />
      </View>

      <ScrollView
        style={styles.scrollBg}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <MetaCard detail={detail} />
        <TripCard detail={detail} />
        {detail.status === 'pending' ? (
          <ChooseVehicleSection
            selectedKey={selectedTierKey}
            onSelect={setSelectedTierKey}
          />
        ) : (
          <VehicleCard detail={detail} />
        )}
        <AdvanceToBookCard
          amount={detail.amount}
          advanceAmount={detail.advanceAmount}
        />
        <TermsCard detail={detail} />
      </ScrollView>

      <BottomBar
        status={detail.status}
        acceptDisabled={acceptDisabled}
        onNeedChanges={onNeedChanges}
        onConfirmAccept={onConfirmAccept}
        onContinueToBooking={onContinueToBooking}
        onRequestNew={onRequestNew}
      />

      {/* Bottom sheets — mounted once, presented imperatively via
          the refs above. Both are portaled to the app-root
          BottomSheetModalProvider (App.tsx), so their z-order sits
          above the sticky BottomBar without any extra plumbing.
          Kept inside SafeScreen for the same reason every other
          screen-owned sheet is — the sheet needs the screen's
          contextual data (executive, advance amount) at render
          time, and the parent tree is short enough to remount
          cheaply if the quotation id changes. */}
      <NeedChangesSheet
        ref={needChangesRef}
        executive={detail.travelExecutive}
        onGoToBookings={() =>
          navigation.navigate('CustomerTabs', { screen: 'Bookings' })
        }
        onBackToHome={() =>
          navigation.navigate('CustomerTabs', { screen: 'Home' })
        }
      />
      <ContinueToBookingSheet
        ref={confirmationRef}
        mode={detail.status === 'pending' ? 'accept' : 'booking'}
        summary={{
          quotationNumber: detail.quotationNumber,
          travelDateStart: detail.travelDateStart,
          travelDateEnd: detail.travelDateEnd,
          nights: detail.nights,
          days: detail.days,
          adults: detail.adults,
          children: detail.children,
          amount: detail.amount,
          trip: detail.stops.join(' → '),
        }}
      />
    </SafeScreen>
  );
};

export default QuotationDetailScreen;

/* ================================================================
 * StatusPill  — reused in the header's rightSlot and as an inline
 *              chip elsewhere if needed. Same colour system as the
 *              QuotationCard pill; separate component so the
 *              header slot doesn't need to know about the mapping.
 * ================================================================ */

const StatusPill: React.FC<{ status: QuotationStatus }> = ({ status }) => {
  const v = STATUS_VISUAL[status];
  const { Icon } = v;
  return (
    <View style={[styles.statusPill, { backgroundColor: v.bg }]}>
      <Icon size={14} color={v.fg} strokeWidth={2.5} />
      <Text style={[styles.statusPillText, { color: v.fg }]}>{v.label}</Text>
    </View>
  );
};

/* ================================================================
 * MetaCard  — QU id + created-at, plus a status-specific
 *             confirmation/notice box on the right.
 * ================================================================ */

const MetaCard: React.FC<{ detail: CustomerQuotationDetail }> = ({
  detail,
}) => {
  const executive = detail.travelExecutive;

  const handleCall = useCallback(() => {
    makePhoneCall(executive.phoneE164).catch(() => {
      // The contact service handles the failure path.
    });
  }, [executive.phoneE164]);

  const handleWhatsApp = useCallback(() => {
    openWhatsApp(
      executive.phoneE164,
      `Hi ${executive.name}, I have a question about quotation ${detail.quotationNumber}.`,
    ).catch(() => {
      // The contact service handles the failure path.
    });
  }, [executive.name, executive.phoneE164, detail.quotationNumber]);

  const handleEmail = useCallback(() => {
    if (!executive.email) return;

    sendEmail({
      to: executive.email,
      subject: `Quotation ${detail.quotationNumber} - Urban Cruise`,
      body: `Hi ${executive.name},\n\nI have a question regarding quotation ${detail.quotationNumber}.\n\nThanks.`,
    }).catch(() => {
      // The contact service handles the failure path.
    });
  }, [executive.email, executive.name, detail.quotationNumber]);

  return (
    <>
      <View style={styles.advisorCard}>
        <View style={styles.advisorTopRow}>
          <View style={styles.advisorProfile}>
            <Image
              source={require('@assets/images/default-avatar.png')}
              style={styles.advisorAvatar}
              resizeMode="cover"
            />

            <View style={styles.advisorIdentity}>
              <Text style={styles.advisorEyebrow}>Your Travel Advisor</Text>
              <Text style={styles.advisorName}>{executive.name}</Text>
              <Text style={styles.advisorRole}>{executive.role}</Text>
            </View>
          </View>

          <View style={styles.advisorContactActions}>
            <Pressable
              onPress={handleCall}
              style={({ pressed }) => [
                styles.advisorContactButton,
                styles.advisorContactButtonCall,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Call ${executive.name}`}
              hitSlop={6}
            >
              <Phone size={22} color={CALL_TINT_FG} strokeWidth={2.5} />
            </Pressable>

            <Pressable
              onPress={handleWhatsApp}
              style={({ pressed }) => [
                styles.advisorContactButton,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Contact ${executive.name} on WhatsApp`}
              hitSlop={6}
            >
              <MessageCircle
                size={22}
                color={Colors.primary}
                strokeWidth={2.5}
              />
            </Pressable>

            <Pressable
              onPress={handleEmail}
              disabled={!executive.email}
              style={({ pressed }) => [
                styles.advisorContactButton,
                styles.advisorContactButtonEmail,
                !executive.email && styles.advisorContactButtonDisabled,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Email ${executive.name}`}
              accessibilityState={{ disabled: !executive.email }}
              hitSlop={6}
            >
              <Mail
                size={22}
                color={executive.email ? EMAIL_TINT_FG : Colors.textTertiary}
                strokeWidth={2.5}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.advisorMessageBox}>
          <View style={styles.advisorMessageIcon}>
            <MessageCircle
              size={24}
              color={Colors.primary}
              strokeWidth={2.25}
            />
          </View>
          <View style={styles.advisorMessageBody}>
            <Text style={styles.advisorMessageTitle}>
              This quotation has been prepared for you.
            </Text>
            <Text style={styles.advisorMessageSubtitle}>
              Feel free to reach out for any queries or changes.
            </Text>
          </View>
        </View>
      </View>
    </>
  );
};

/* ================================================================
 * TripCard  — trip icon header, horizontal stop timeline, then
 *             a two-column travel-date / passengers row.
 * ================================================================ */

const TripCard: React.FC<{ detail: CustomerQuotationDetail }> = ({
  detail,
}) => {
  return (
    <View style={styles.card}>
      <SectionHeader
        icon={<MapPin size={18} color={Colors.primary} strokeWidth={2} />}
        iconBg={Colors.primaryTint}
        title="Trip Details"
        rightSlot={<TripTypeBadge tripType={detail.tripType} />}
      />

      <StopTimeline detail={detail} />

      <View style={styles.divider} />

      <View style={styles.tripFactsRow}>
        <View style={styles.tripFactCell}>
          <Calendar size={18} color={Colors.textSecondary} strokeWidth={2} />
          <View style={styles.tripFactBody}>
            <Text style={styles.factLabel}>Travel Date</Text>
            <Text style={styles.factValue}>
              {formatDate(detail.travelDateStart)} –{' '}
              {formatDate(detail.travelDateEnd)}
            </Text>
            <Text style={styles.factSubtle}>
              ({detail.nights} {detail.nights === 1 ? 'Night' : 'Nights'} /{' '}
              {detail.days} {detail.days === 1 ? 'Day' : 'Days'})
            </Text>
          </View>
        </View>

        <View style={styles.tripFactDivider} />

        <View style={styles.tripFactCell}>
          <Users size={18} color={Colors.textSecondary} strokeWidth={2} />
          <View style={styles.tripFactBody}>
            <Text style={styles.factLabel}>Passengers</Text>
            <Text style={styles.factValue}>
              {formatPassengers(detail.adults, detail.children)}
            </Text>
            <Text style={styles.factSubtle}>
              ({detail.adults + detail.children}{' '}
              {detail.adults + detail.children === 1
                ? 'Passenger'
                : 'Passengers'}
              )
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

/**
 * Horizontal stop timeline. Each stop is a column with a coloured
 * dot on top, city underneath, address below. Each column carries its
 * own trailing connector line to the right of the dot (except the last
 * column), so the dots and the line share a single row and stay
 * vertically aligned regardless of column width.
 *
 * COLOUR RULE:
 *   - Last stop dot → red (destination)
 *   - Every other  → green (origin / intermediate)
 *   The list card doesn't visualise stop role at all; the detail
 *   screen does, so a distinct red endpoint reads immediately.
 *
 * LAYOUT NOTE:
 *   Each column is `flex: 1` so up to ~4 stops fit on a phone.
 *   For >4 stops the columns get uncomfortably narrow — if that
 *   becomes real, switch to a vertical timeline here.
 */
const StopTimeline: React.FC<{ detail: CustomerQuotationDetail }> = ({
  detail,
}) => {
  const stops = detail.stopDetails;
  return (
    <View style={styles.timeline}>
      {stops.map((stop, i) => {
        const isLast = i === stops.length - 1;
        const accent = isLast ? Colors.error : Colors.primary;
        const accentTint = isLast ? Colors.errorTint : Colors.primaryTint;
        return (
          <View key={`${stop.city}-${i}`} style={styles.stopCol}>
            <View style={styles.stopDotRow}>
              <View style={[styles.dotRing, { backgroundColor: accentTint }]}>
                <View style={[styles.dot, { backgroundColor: accent }]} />
              </View>
              {isLast ? null : (
                <View
                  style={[
                    styles.connector,
                    { borderColor: Colors.primaryLight },
                  ]}
                />
              )}
            </View>
            <Text
              style={[styles.stopCity, { color: accent }]}
              numberOfLines={1}
            >
              {stop.city}
            </Text>
            <Text style={styles.stopAddress} numberOfLines={2}>
              {stop.address}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

/* ================================================================
 * VehicleCard  — the vehicle-details block shown when a quotation
 *                is `accepted` or `expired` (the vehicle is locked
 *                in and there's exactly one to display).
 *
 * Uses the same FAQ-style accordion pattern as ChooseVehicleSection
 * below, so all three quotation states share one design language.
 * With only one item there's no "close the other" work to do — the
 * header just toggles open/closed on tap.
 *
 * Collapsed by default (matches the FAQ contract the customer sees
 * elsewhere in the app): a compact header shows a thumbnail, the
 * vehicle name, and a one-line summary like "7 Seater · Diesel · AC"
 * so the customer can identify the vehicle without opening; tapping
 * reveals the larger hero image and the full amenity checklist.
 * ================================================================ */

const VehicleCard: React.FC<{ detail: CustomerQuotationDetail }> = ({
  detail,
}) => {
  const v = detail.vehicle;
  const [expanded, setExpanded] = useState(false);

  const onToggle = useCallback(() => {
    setExpanded(e => !e);
  }, []);

  // Compact summary line for the collapsed header — mirrors what the
  // customer would see on a booking-confirmation SMS.
  const summary = useMemo(() => {
    const parts: string[] = [`${v.seater} Seater`, v.fuel];
    if (v.ac) parts.push('AC');
    return parts.join(' · ');
  }, [v.seater, v.fuel, v.ac]);

  // Amenity checklist shown once expanded. Kept as strings (rather
  // than a discriminated union of icon+label) because the checklist
  // is uniformly "green-check + text" — a heavier abstraction would
  // just add ceremony without buying anything.
  const features = useMemo(() => {
    const items: string[] = [`${v.seater} Seater`, `${v.fuel} Fuel`];
    if (v.ac) items.push('Air Conditioning');
    if (v.hasLuggageSpace) items.push('Luggage Space');
    return items;
  }, [v.seater, v.fuel, v.ac, v.hasLuggageSpace]);

  return (
    <View style={styles.card}>
      <SectionHeader
        icon={<Bus size={18} color={Colors.primary} strokeWidth={2} />}
        iconBg={Colors.primaryTint}
        title="Vehicle Details"
      />

      <View
        style={[
          styles.vehicleAccordion,
          expanded && styles.vehicleAccordionOpen,
        ]}
      >
        <Pressable
          onPress={onToggle}
          style={({ pressed }) => [
            styles.vehicleAccordionHeader,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${v.name}, ${
            expanded ? 'collapse' : 'expand'
          } details`}
        >
          <Image
            source={v.image}
            style={styles.vehicleThumb}
            resizeMode="cover"
          />
          <View style={styles.vehicleAccordionHeaderText}>
            <Text style={styles.vehicleAccordionName} numberOfLines={1}>
              {v.name}
            </Text>
            <Text style={styles.vehicleAccordionSummary} numberOfLines={1}>
              {summary}
            </Text>
          </View>
          {expanded ? (
            <ChevronUp size={20} color={Colors.textSecondary} strokeWidth={2} />
          ) : (
            <ChevronDown
              size={20}
              color={Colors.textSecondary}
              strokeWidth={2}
            />
          )}
        </Pressable>

        {expanded ? (
          <View style={styles.vehicleAccordionBody}>
            <Image
              source={v.image}
              style={styles.vehicleHero}
              resizeMode="cover"
            />
            <View style={styles.vehicleFeatureList}>
              {features.map(feature => (
                <View key={feature} style={styles.vehicleFeatureRow}>
                  <CheckCircle2
                    size={16}
                    color={Colors.primary}
                    strokeWidth={2.5}
                  />
                  <Text style={styles.vehicleFeatureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
};

/* ================================================================
 * ChooseVehicleSection  — "Choose Your Vehicle" accordion, shown
 *                         instead of the plain VehicleCard while a
 *                         quotation is `pending` (the vehicle isn't
 *                         locked in yet). Behaves like an FAQ list:
 *                         each tier's feature checklist is hidden
 *                         by default; tapping a tier's header
 *                         expands it and collapses whichever other
 *                         tier was open, via a single `expandedKey`
 *                         state held here (not per-card), which is
 *                         what makes it "only one open at a time"
 *                         instead of independent toggles.
 *
 *                         `selectedKey` is separate from
 *                         `expandedKey` on purpose — expanding a
 *                         tier to read its features shouldn't
 *                         silently select it; the customer commits
 *                         via the "Select" button.
 * ================================================================ */

const ChooseVehicleSection: React.FC<{
  selectedKey: VehicleTierKey | null;
  onSelect: (key: VehicleTierKey) => void;
}> = ({ selectedKey, onSelect }) => {
  // `expandedKey` remains local — only the section cares which card
  // is open. `selectedKey` is lifted to the screen so the sticky
  // BottomBar can disable the "Accept & Continue" CTA until the
  // customer commits to a vehicle. See `acceptDisabled` in
  // QuotationDetailScreen.
  const [expandedKey, setExpandedKey] = useState<VehicleTierKey | null>(null);

  const onToggle = useCallback((key: VehicleTierKey) => {
    setExpandedKey(prev => (prev === key ? null : key));
  }, []);

  return (
    <View style={styles.card}>
      <SectionHeader
        icon={<Bus size={18} color={Colors.primary} strokeWidth={2} />}
        iconBg={Colors.primaryTint}
        title="Choose Your Vehicle"
      />
      <Text style={styles.chooseVehicleSubtitle}>
        Select the vehicle that best suits your journey
      </Text>

      <View style={styles.tierList}>
        {VEHICLE_TIER_OPTIONS.map(option => (
          <VehicleTierCard
            key={option.key}
            option={option}
            expanded={expandedKey === option.key}
            selected={selectedKey === option.key}
            onToggle={() => onToggle(option.key)}
            onSelect={() => onSelect(option.key)}
          />
        ))}
      </View>
    </View>
  );
};

const VehicleTierCard: React.FC<{
  option: VehicleTierOption;
  expanded: boolean;
  selected: boolean;
  onToggle: () => void;
  onSelect: () => void;
}> = ({ option, expanded, selected, onToggle, onSelect }) => {
  return (
    <View style={[styles.tierCard, selected && styles.tierCardSelected]}>
      {option.popular ? (
        <View style={styles.tierPopularBadge}>
          <Text style={styles.tierPopularText}>MOST POPULAR</Text>
        </View>
      ) : null}

      {/* Header — the only always-visible part; tapping it toggles
          the feature checklist below (FAQ-style, one open at a
          time — see ChooseVehicleSection).

          The bus chip on the left mirrors VehicleCard's collapsed
          header, so the pending Choose-Your-Vehicle list and the
          accepted/expired locked-in card read as one design system
          rather than two unrelated components. */}
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.tierHeader, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${option.name}, ${
          expanded ? 'collapse' : 'expand'
        } features`}
      >
        {option.image ? (
          <Image
            source={option.image}
            style={styles.tierThumb}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.tierIconChip}>
            <Bus size={18} color={Colors.primary} strokeWidth={2} />
          </View>
        )}
        <View style={styles.tierHeaderText}>
          <Text style={styles.tierName}>{option.name}</Text>
          <Text style={styles.tierMeta} numberOfLines={1}>
            {option.seater} Seat · {option.type}
          </Text>
        </View>
        {expanded ? (
          <ChevronUp size={20} color={Colors.textSecondary} strokeWidth={2} />
        ) : (
          <ChevronDown size={20} color={Colors.textSecondary} strokeWidth={2} />
        )}
      </Pressable>

      {expanded ? (
        <View style={styles.tierFeatures}>
          {option.features.map(feature => (
            <View key={feature} style={styles.tierFeatureRow}>
              <CheckCircle2
                size={16}
                color={Colors.primary}
                strokeWidth={2.5}
              />
              <Text style={styles.tierFeatureText}>{feature}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.tierFooter}>
        <Text style={styles.tierPrice}>{formatAmount(option.price)}</Text>
        <Pressable
          onPress={onSelect}
          style={({ pressed }) => [
            styles.tierSelectBtn,
            selected && styles.tierSelectBtnActive,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            selected ? `${option.name} selected` : `Select ${option.name}`
          }
        >
          {selected ? (
            <CheckCircle2
              size={15}
              color={Colors.textOnPrimary}
              strokeWidth={2.5}
            />
          ) : null}
          <Text
            style={[
              styles.tierSelectBtnText,
              selected && styles.tierSelectBtnTextActive,
            ]}
          >
            {selected ? 'Selected' : 'Select'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

/* ================================================================
 * TermsCard  — three sibling cards making up the "Important Charges
 *              + Terms" block.
 * ================================================================
 * Rendered as a Fragment (three cards, not one) so the parent's
 * scroll gap handles spacing consistently with every other section.
 *
 *   1. Important Charges — one card, two colour-coded sub-groups:
 *      "Included in Package" (green) and "Paid by Customer" (orange).
 *      Ops wants both lists visible at a glance so the customer
 *      can't miss anything they'll owe the driver directly.
 *
 *   2. Extra KM + Night Charges — two small tabular callouts sitting
 *      side-by-side inside an accent-tinted band. Kept as their
 *      own row because ops flagged these two as the most-forgotten
 *      items, and side-by-side they still fit in a phone viewport.
 *
 *   3. Terms & Conditions — one card, checklist of miscellaneous
 *      rules that don't belong to a specific charge (KM
 *      measurement, hills caveats, availability disclaimer).
 * ================================================================ */

const TermsCard: React.FC<{ detail: CustomerQuotationDetail }> = ({
  detail,
}) => {
  const c = detail.chargesBreakdown;
  return (
    <>
      {/* ── Important Charges card ── */}
      <View style={styles.card}>
        <SectionHeader
          icon={
            <IndianRupee size={18} color={Colors.success} strokeWidth={2} />
          }
          iconBg={Colors.successTint}
          title="Important Charges"
          rightSlot={
            <Text style={styles.chargesAllInInr}>All amounts in ₹</Text>
          }
        />

        {/* Included in Package */}
        <View style={styles.chargesGroup}>
          <View
            style={[
              styles.chargesGroupHeader,
              { backgroundColor: Colors.successTint },
            ]}
          >
            <Text
              style={[styles.chargesGroupHeaderText, { color: Colors.success }]}
            >
              Included in Package{' '}
              <Text style={styles.chargesGroupHeaderSub}>
                (All amounts included in total price)
              </Text>
            </Text>
          </View>
          <View style={styles.chargesListPadded}>
            {c.included.map(item => (
              <View key={item} style={styles.chargesItemRow}>
                <CheckCircle2
                  size={16}
                  color={Colors.success}
                  strokeWidth={2.25}
                />
                <Text style={styles.chargesItemText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Paid by Customer */}
        <View style={styles.chargesGroup}>
          <View
            style={[
              styles.chargesGroupHeader,
              { backgroundColor: Colors.accentTint },
            ]}
          >
            <Text
              style={[styles.chargesGroupHeaderText, { color: Colors.accent }]}
            >
              Paid by Customer{' '}
              <Text style={styles.chargesGroupHeaderSub}>
                (Not Included in Package)
              </Text>
            </Text>
          </View>
          <View style={styles.chargesListPadded}>
            {c.paidByCustomer.map(row => (
              <View key={row.label} style={styles.chargesPayRow}>
                <View style={styles.chargesPayRowLeft}>
                  <View style={styles.chargesBullet} />
                  <Text style={styles.chargesItemText}>{row.label}</Text>
                </View>
                <Text style={styles.chargesPayNote}>{row.note}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── Extra KM + Night Charges (accent-tinted band) ── */}
      <View style={styles.calloutBand}>
        {/* Extra KM */}
        <View style={styles.calloutCard}>
          <View style={styles.calloutHeadRow}>
            <View
              style={[
                styles.calloutIcon,
                { backgroundColor: Colors.accentTint },
              ]}
            >
              <Milestone size={16} color={Colors.accent} strokeWidth={2.25} />
            </View>
            <View style={styles.calloutHeadTextCol}>
              <Text style={styles.calloutTitle}>Extra KM Charges</Text>
              <Text style={styles.calloutSubtitle}>
                ({c.extraKm.afterKmLabel})
              </Text>
            </View>
          </View>
          <View style={styles.calloutRows}>
            {c.extraKm.tiers.map(tier => (
              <View key={tier.label} style={styles.calloutRow}>
                <Text style={styles.calloutRowLabel}>{tier.label}</Text>
                <Text style={styles.calloutRowValue}>{tier.rateLabel}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Driver Night Charges */}
        <View style={styles.calloutCard}>
          <View style={styles.calloutHeadRow}>
            <View
              style={[styles.calloutIcon, { backgroundColor: PURPLE_TINT }]}
            >
              <Moon size={16} color={PURPLE_FG} strokeWidth={2.25} />
            </View>
            <View style={styles.calloutHeadTextCol}>
              <Text style={styles.calloutTitle}>Driver Night Charges</Text>
            </View>
          </View>
          <View style={styles.calloutRows}>
            {c.nightCharges.map(item => (
              <View key={item.label} style={styles.calloutRow}>
                <Text style={styles.calloutRowLabel} numberOfLines={2}>
                  {item.label}
                </Text>
                <Text style={styles.calloutRowValue}>{item.rateLabel}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── Terms & Conditions card ── */}
      <View style={styles.card}>
        <SectionHeader
          icon={<FileText size={18} color={Colors.info} strokeWidth={2} />}
          iconBg={Colors.infoTint}
          title="Terms & Conditions"
        />
        <View style={styles.chargesList}>
          {c.termsAndConditions.map(text => (
            <View key={text} style={styles.chargesItemRow}>
              <CheckCircle2
                size={16}
                color={Colors.success}
                strokeWidth={2.25}
              />
              <Text style={styles.chargesItemText}>{text}</Text>
            </View>
          ))}
        </View>
      </View>
    </>
  );
};

/* ================================================================
 * SectionHeader  — icon-tile + title pair used at the top of the
 *                  Trip / Vehicle / Terms cards.
 * ================================================================ */

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  rightSlot?: React.ReactNode;
}> = ({ icon, iconBg, title, rightSlot }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionIcon, { backgroundColor: iconBg }]}>
      {icon}
    </View>
    <Text style={[styles.sectionTitle, styles.sectionTitleGrow]}>{title}</Text>
    {rightSlot}
  </View>
);

/* ================================================================
 * TripTypeBadge  — read-only chip on the Trip Details header
 *                  showing the service category (One Way / Round
 *                  Trip / Pickup & Drop). Shares icon + label with
 *                  the RequestQuotation picker via `tripTypeOptions`
 *                  so the same trip concept reads identically
 *                  wherever it appears.
 * ================================================================ */

const TripTypeBadge: React.FC<{ tripType: TripType }> = ({ tripType }) => {
  const { Icon, label } = getTripTypeOption(tripType);
  return (
    <View style={styles.tripTypeBadge}>
      <Icon size={13} color={Colors.primaryDark} strokeWidth={2.5} />
      <Text style={styles.tripTypeBadgeText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

/* ================================================================
 * BottomBar  — sticky action row + trust caption. Layout differs
 *              by status; see the file header for the CTA matrix.
 * ================================================================ */

const BottomBar: React.FC<{
  status: QuotationStatus;
  /**
   * When true, the primary "Accept & Continue" CTA renders in its
   * disabled treatment and won't fire. Only meaningful for
   * `status === 'pending'` — that's the only state where the CTA
   * depends on the customer having picked a vehicle from the tier
   * list. `accepted` ignores this (the CTA is "Continue to Booking"
   * and never gated); `expired` doesn't render the primary CTA at
   * all.
   */
  acceptDisabled: boolean;
  onNeedChanges: () => void;
  onConfirmAccept: () => void;
  onContinueToBooking: () => void;
  onRequestNew: () => void;
}> = ({
  status,
  acceptDisabled,
  onNeedChanges,
  onConfirmAccept,
  onContinueToBooking,
  onRequestNew,
}) => {
  // Only the pending flow can hit the disabled treatment (see prop
  // doc above). `accepted` uses `onContinueToBooking`, which has no
  // preconditions.
  const isDisabled = status === 'pending' && acceptDisabled;

  return (
    <View style={styles.bottomBar}>
      <View style={styles.bottomActions}>
        {status === 'expired' ? (
          <Pressable
            onPress={onRequestNew}
            style={({ pressed }) => [
              styles.requestNewBtn,
              pressed && styles.requestNewBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Request a new quotation"
          >
            <View style={styles.requestNewIconWrap}>
              <RefreshCw
                size={18}
                color={Colors.textOnPrimary}
                strokeWidth={2.5}
              />
            </View>
            <View style={styles.requestNewBody}>
              <Text style={styles.requestNewTitle}>Request New Quotation</Text>
              <Text style={styles.requestNewSubtitle} numberOfLines={1}>
                Get a fresh quote for this trip
              </Text>
            </View>
            <ChevronRight
              size={20}
              color={Colors.textOnPrimary}
              strokeWidth={2.5}
            />
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={onNeedChanges}
              style={({ pressed }) => [
                styles.needChangesBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Request changes to this quotation"
            >
              <PenSquare size={18} color={Colors.accent} strokeWidth={2.25} />
              <View style={styles.needChangesBody}>
                <Text style={styles.needChangesTitle}>Need Changes</Text>
                <Text style={styles.needChangesSubtitle} numberOfLines={1}>
                  Request changes to this quotation
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={
                status === 'accepted' ? onContinueToBooking : onConfirmAccept
              }
              disabled={isDisabled}
              style={({ pressed }) => [
                styles.primaryBtn,
                isDisabled && styles.primaryBtnDisabled,
                pressed && !isDisabled && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: isDisabled }}
              accessibilityLabel={
                status === 'accepted'
                  ? 'Continue to booking'
                  : isDisabled
                  ? 'Select a vehicle to continue'
                  : 'Confirm and accept this quotation'
              }
              accessibilityHint={
                isDisabled
                  ? 'Choose a vehicle from the list above to enable this button'
                  : undefined
              }
            >
              <CheckCircle2
                size={22}
                color={isDisabled ? Colors.textInverse : Colors.textOnPrimary}
                strokeWidth={2.25}
              />
              <View style={styles.primaryBtnBody}>
                <Text
                  style={[
                    styles.primaryBtnText,
                    isDisabled && styles.primaryBtnTextDisabled,
                  ]}
                >
                  {status === 'accepted'
                    ? 'Continue to Booking'
                    : 'Accept & Continue'}
                </Text>
                <Text
                  style={[
                    styles.primaryBtnSubtitle,
                    isDisabled && styles.primaryBtnSubtitleDisabled,
                  ]}
                  numberOfLines={1}
                >
                  {status === 'accepted'
                    ? 'Proceed to book This Trip'
                    : isDisabled
                    ? 'Select a vehicle to continue'
                    : 'Proceed with this quotation'}
                </Text>
              </View>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.trustRow}>
        <Lock size={12} color={Colors.textTertiary} strokeWidth={2} />
        <Text style={styles.trustText}>
          Your data is secure and 100% safe with Urban Cruise
        </Text>
      </View>
    </View>
  );
};

/* ================================================================
 * AdvanceToBookCard  — orange-tint info card (lives in the scroll
 *                      content, between Vehicle Details and Terms)
 *                      showing the upfront amount due to lock the
 *                      booking. Read-only — no press handler, no
 *                      navigation affordance — this is a fact
 *                      about the quotation, not an action; paying
 *                      the advance happens via the CTA below.
 *                      Percentage is derived from the record
 *                      (advanceAmount / amount) rather than hard-
 *                      coded, so it stays correct if ops ever tunes
 *                      the advance fraction per quotation.
 * ================================================================ */

const AdvanceToBookCard: React.FC<{
  amount: number;
  advanceAmount: number;
}> = ({ amount, advanceAmount }) => {
  const percent = amount > 0 ? Math.round((advanceAmount / amount) * 100) : 0;

  return (
    <View style={styles.advanceBar}>
      <View style={styles.advanceIconTile}>
        <Calendar size={20} color={Colors.accent} strokeWidth={2.25} />
      </View>
      <View style={styles.advanceBody}>
        <Text style={styles.advanceTitle}>Advance to Book</Text>
        <Text style={styles.advanceSubtitle}>
          Please pay {percent}% to confirm your booking
        </Text>
      </View>
      <View style={styles.advanceRight}>
        <Text style={styles.advanceRightLabel}>
          Advance Amount ({percent}%)
        </Text>
        <Text style={styles.advanceRightAmount}>
          {formatAmount(advanceAmount)}
        </Text>
      </View>
    </View>
  );
};

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  headerBlock: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
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

  /* Card shell (shared across meta / trip / vehicle / terms) */
  card: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },

  /* Section header (icon tile + title) */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...Typography.subtitle,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  sectionTitleGrow: {
    flex: 1,
  },

  /* Trip type badge — SectionHeader rightSlot on the Trip Details
     card, showing One Way / Round Trip / Pickup & Drop. */
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

  /* Icon tile — square variant used on the meta card */
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Status pill (header rightSlot) */
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  statusPillText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    includeFontPadding: false,
  },

  /* Travel advisor card */
  advisorCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  advisorTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  advisorProfile: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  advisorAvatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.circle,
    backgroundColor: Colors.surfaceMuted,
  },
  advisorIdentity: {
    flex: 1,
    minWidth: 0,
  },
  advisorEyebrow: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 1,
  },
  advisorName: {
    ...Typography.subtitle,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  advisorRole: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  advisorContactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  advisorContactButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    // Default (WhatsApp) tint. Call + Email override with their own
    // background via advisorContactButtonCall / advisorContactButtonEmail
    // to match the UC Directory customer contact modal palette.
    backgroundColor: Colors.primaryTint,
  },
  advisorContactButtonCall: {
    backgroundColor: CALL_TINT_BG,
  },
  advisorContactButtonEmail: {
    backgroundColor: EMAIL_TINT_BG,
  },
  advisorContactButtonDisabled: {
    opacity: 0.55,
  },
  advisorMessageBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.successTint,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  advisorMessageIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryTint,
  },
  advisorMessageBody: {
    flex: 1,
    minWidth: 0,
  },
  advisorMessageTitle: {
    ...Typography.bodySmall,
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  advisorMessageSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },

  /* Trip timeline */
  timeline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.xs,
  },
  stopCol: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  stopDotRow: {
    height: 18,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotRing: {
    width: 18,
    height: 18,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: Radius.circle,
  },
  connector: {
    flex: 1,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    marginLeft: 4,
    marginRight: 4,
  },
  stopCity: {
    ...Typography.bodySmall,
    fontWeight: '800',
  },
  stopAddress: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  /* Divider inside cards */
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },

  /* Trip facts (date + passengers) */
  tripFactsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
  },
  tripFactCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  tripFactBody: {
    flex: 1,
  },
  tripFactDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
  },
  factLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  factValue: {
    ...Typography.bodySmall,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  factSubtle: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontWeight: '500',
    marginTop: 2,
  },

  /* ================================================================
   * Vehicle Details — unified design language across all 3 states
   * ================================================================
   * The same visual DNA drives BOTH:
   *   - the single locked-in vehicle card shown when the quotation
   *     is `accepted` / `expired` (VehicleCard), and
   *   - each of the 4 tier options shown when it's `pending`
   *     (VehicleTierCard).
   *
   * Common:
   *   - Card container: 1px borderLight, Radius.md, surface bg,
   *     subtle Shadows.xs elevation so cards lift slightly off the
   *     section background.
   *   - Header: image / icon chip on left, name + one-line summary
   *     in the middle, chevron on the right, generous vertical
   *     padding so the tap target is comfortable.
   *   - Body: feature checklist using CheckCircle2 in brand primary
   *     with `Colors.primaryTint` accents where the design calls
   *     for a background wash.
   * ================================================================ */

  /* ── Vehicle Details (single locked-in vehicle — accepted / expired) */
  vehicleAccordion: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    ...Shadows.xs,
  },
  vehicleAccordionOpen: {
    // Subtle brand accent while expanded — reinforces that the row
    // is active without competing with the status pill in the top
    // navbar for attention.
    borderColor: Colors.primaryLight,
  },
  vehicleAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  vehicleThumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceMuted,
  },
  vehicleAccordionHeaderText: {
    flex: 1,
    gap: 2,
  },
  vehicleAccordionName: {
    ...Typography.subtitle,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  vehicleAccordionSummary: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  vehicleAccordionBody: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.md,
  },
  vehicleHero: {
    width: '100%',
    height: 150,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    marginTop: Spacing.md,
  },
  vehicleFeatureList: {
    gap: 8,
  },
  vehicleFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicleFeatureText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '500',
  },

  /* ── Choose Your Vehicle — accordion (pending quotations only) */
  chooseVehicleSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  tierList: {
    gap: Spacing.sm,
  },
  tierCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    ...Shadows.xs,
  },
  tierCardSelected: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
    // Faint brand wash so the picked tier is unmistakable at a
    // glance without needing to read the button label.
    backgroundColor: Colors.primaryTint,
  },
  tierPopularBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderBottomRightRadius: Radius.sm,
  },
  tierPopularText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textOnPrimary,
    letterSpacing: 0.4,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  tierIconChip: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Same slot dimensions as `vehicleThumb` above so the pending
  // tier cards and the locked-in VehicleCard read as one design.
  // Falls back to `tierIconChip` when a tier ships without an image.
  tierThumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceMuted,
  },
  tierHeaderText: {
    flex: 1,
    gap: 2,
  },
  tierName: {
    ...Typography.subtitle,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  tierMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  tierFeatures: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 8,
  },
  tierFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierFeatureText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  tierFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  tierPrice: {
    ...Typography.subtitle,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  tierSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  tierSelectBtnActive: {
    backgroundColor: Colors.primary,
  },
  tierSelectBtnText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.primary,
  },
  tierSelectBtnTextActive: {
    color: Colors.textOnPrimary,
  },

  /* ── Important Charges card ── */
  chargesAllInInr: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    includeFontPadding: false,
  },
  chargesGroup: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  chargesGroupHeader: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  chargesGroupHeaderText: {
    ...Typography.bodySmall,
    fontWeight: '800',
    includeFontPadding: false,
  },
  /* Nested inside the header — inherits color but goes muted-weight,
     rendering "(All amounts included in total price)" as a
     parenthetical after the colored title in the same line. */
  chargesGroupHeaderSub: {
    fontWeight: '500',
    fontSize: 11,
  },
  chargesListPadded: {
    padding: Spacing.md,
    gap: 10,
  },
  chargesList: {
    gap: 10,
    marginTop: 4,
  },
  chargesItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  chargesItemText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    includeFontPadding: false,
  },
  /* Right column of "Paid by Customer" — label + per-item note.
     The note wraps to two lines on narrow screens; using a fixed
     ~40% max width keeps the split legible without truncation. */
  chargesPayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  chargesPayRowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    flex: 1,
  },
  chargesBullet: {
    width: 6,
    height: 6,
    borderRadius: Radius.circle,
    backgroundColor: Colors.textSecondary,
    marginTop: 7, // vertical-align with the first text line
  },
  chargesPayNote: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'right',
    maxWidth: '45%',
    includeFontPadding: false,
  },

  /* ── Extra KM + Night Charges band ── */
  calloutBand: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.accentTint,
    gap: Spacing.sm,
  },
  calloutCard: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
    ...Shadows.xs,
  },
  calloutHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  calloutIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutHeadTextCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 4,
  },
  calloutTitle: {
    ...Typography.subtitle,
    color: Colors.accent,
    fontWeight: '800',
    fontSize: 15,
    includeFontPadding: false,
  },
  calloutSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    includeFontPadding: false,
  },
  calloutRows: {
    gap: 6,
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  calloutRowLabel: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    includeFontPadding: false,
  },
  calloutRowValue: {
    ...Typography.bodySmall,
    color: Colors.accent,
    fontWeight: '800',
    textAlign: 'right',
    includeFontPadding: false,
  },

  /* Advance-to-book card (scrollable content, between Vehicle
     Details and Terms — read-only, no press state) */
  advanceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.accentTint,
  },
  advanceIconTile: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  advanceBody: {
    flex: 1,
    gap: 2,
  },
  advanceTitle: {
    ...Typography.bodySmall,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  advanceSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  advanceRight: {
    alignItems: 'flex-end',
  },
  advanceRightLabel: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.accent,
  },
  advanceRightAmount: {
    ...Typography.subtitle,
    fontWeight: '800',
    color: Colors.accent,
    marginTop: 1,
  },

  /* Bottom action bar */
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  needChangesBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: Colors.surface,
  },
  needChangesBody: {
    flex: 1,
  },
  needChangesTitle: {
    ...Typography.bodySmall,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  needChangesSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  primaryBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  // Disabled treatment: uses the brand disabled-button token so the
  // CTA is clearly inactive (not just a duller green). White text +
  // icon retained for contrast on the mid-grey fill. The pressed
  // opacity dim is intentionally not applied while disabled — press
  // feedback on a non-actionable control is misleading.
  primaryBtnDisabled: {
    backgroundColor: Colors.buttonDisabled,
  },
  primaryBtnTextDisabled: {
    color: Colors.textInverse,
    opacity: 0.85,
  },
  primaryBtnSubtitleDisabled: {
    color: Colors.textInverse,
    opacity: 0.75,
  },
  fullWidth: {
    flex: 1,
    justifyContent: 'center',
  },
  primaryBtnBody: {
    flex: 1,
  },
  primaryBtnText: {
    ...Typography.bodySmall,
    fontWeight: '800',
    color: Colors.textOnPrimary,
  },
  primaryBtnSubtitle: {
    ...Typography.caption,
    color: Colors.textOnPrimary,
    fontWeight: '500',
    opacity: 0.9,
    marginTop: 1,
  },

  /* Expired state — single full-width CTA. Gets its own treatment
   * (icon badge + title/subtitle + trailing chevron) since it's the
   * only action on screen and deserves more visual weight than the
   * paired pending/accepted buttons. */
  requestNewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    ...Shadows.sm,
  },
  requestNewBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  requestNewIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.circle,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestNewBody: {
    flex: 1,
  },
  requestNewTitle: {
    ...Typography.bodySmall,
    fontWeight: '800',
    fontSize: 16,
    color: Colors.textOnPrimary,
  },
  requestNewSubtitle: {
    ...Typography.caption,
    color: Colors.textOnPrimary,
    fontWeight: '500',
    opacity: 0.85,
    marginTop: 1,
  },

  /* Trust row */
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

  /* Not-found */
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xs,
  },
  notFoundTitle: {
    ...Typography.subtitle,
    fontWeight: '700',
    color: Colors.textPrimary,
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
