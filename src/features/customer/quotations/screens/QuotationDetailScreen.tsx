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
 *   │ 📄 Terms & Conditions                                    │
 *   │  [ info banner ]                                          │
 *   │  ┌───┐ ┌───┐ ┌───┐ ┌───┐                                 │
 *   │  │ ₹ │ │ P │ │ 🛣 │ │ 🌙│  <- 4-tile grid                │
 *   │  └───┘ └───┘ └───┘ └───┘                                 │
 *   └──────────────────────────────────────────────────────────┘
 *
 *   [ Need Changes ]     [ Confirm & Continue / etc ]   ← sticky
 *   🔒 Your data is secure and 100% safe with Urban Cruise
 *
 * ------------------------------------------------------------------
 * STATUS BRANCHING
 * ------------------------------------------------------------------
 * A single component tree renders three flavours, keyed off
 * `detail.status`. The differences are limited to two places:
 *
 *   1. The confirmation box on the meta card (green success box on
 *      accepted, amber pending banner, red expired banner).
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
 *   - "Confirm & Continue"  → accept flow (backend mutation) + then
 *                              route into the booking or payment
 *                              screen once those land.
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
  ChevronUp,
  Clock,
  FileText,
  IndianRupee,
  Info,
  Lock,
  MapPin,
  Milestone,
  Moon,
  ParkingSquare,
  PenSquare,
  RefreshCw,
  Users,
  XCircle,
} from 'lucide-react-native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import type { CustomerStackParamList } from '@navigation/types';

import type {
  CustomerQuotationDetail,
  QuotationStatus,
  QuotationTerm,
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

/** ISO → "10 Aug 2026 at 02:30 PM". Used on the meta card. */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = d
    .toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    .toUpperCase();
  return `${date} at ${time}`;
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
  const bookingRef = useRef<BottomSheetModal>(null);

  /* -------- Handlers -------- */

  const onNeedChanges = useCallback(() => {
    needChangesRef.current?.present();
  }, []);

  const onConfirmAccept = useCallback(() => {
    // TODO(nav): fire the accept mutation, then route into the
    // resulting booking / payment screen. Placeholder for now.
  }, []);

  const onContinueToBooking = useCallback(() => {
    if (!detail) return;
    bookingRef.current?.present();
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
          <ChooseVehicleSection />
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
      />
      <ContinueToBookingSheet
        ref={bookingRef}
        summary={{
          quotationNumber: detail.quotationNumber,
          travelDateStart: detail.travelDateStart,
          travelDateEnd: detail.travelDateEnd,
          nights: detail.nights,
          days: detail.days,
          adults: detail.adults,
          children: detail.children,
          amount: detail.amount,
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
  return (
    <View style={styles.card}>
      <View style={styles.metaRow}>
        <View style={styles.iconTile}>
          <FileText size={22} color={Colors.primary} strokeWidth={2} />
        </View>
        <View style={styles.metaTextCol}>
          <Text style={styles.metaLabel}>Quotation ID</Text>
          <Text style={styles.metaValue}>{detail.quotationNumber}</Text>
          <Text style={styles.metaSubtle}>
            Created on {formatDateTime(detail.createdAt)}
          </Text>
        </View>

        {/* Status-specific info box. Kept in the same row so the
            card presents "who you are" (left) + "where you are in
            the lifecycle" (right) side by side. On narrow screens
            it wraps below the meta column via `flexWrap` on the
            row style. */}
        <StatusNotice detail={detail} />
      </View>
    </View>
  );
};

const StatusNotice: React.FC<{ detail: CustomerQuotationDetail }> = ({
  detail,
}) => {
  const v = STATUS_VISUAL[detail.status];
  const { Icon } = v;

  const { title, body } = statusNoticeCopy(detail);

  return (
    <View style={[styles.notice, { backgroundColor: v.bg }]}>
      <View style={styles.noticeHeader}>
        <Icon size={16} color={v.fg} strokeWidth={2.5} />
        <Text style={[styles.noticeTitle, { color: v.fg }]}>{title}</Text>
      </View>
      <Text style={styles.noticeBody}>{body}</Text>
    </View>
  );
};

/**
 * Copy generator kept as a pure function so it's easy to unit-test
 * (and so the caller stays a plain JSX tree). One switch per state
 * with fallbacks that don't crash even if a timestamp is missing —
 * timestamps SHOULD be present per invariant, but defensiveness
 * here costs nothing.
 */
function statusNoticeCopy(detail: CustomerQuotationDetail): {
  title: string;
  body: string;
} {
  switch (detail.status) {
    case 'accepted':
      return {
        title: 'Quotation Accepted',
        body: detail.acceptedAt
          ? `You have accepted this quotation on ${formatDateTime(
              detail.acceptedAt,
            )}`
          : 'You have accepted this quotation.',
      };
    case 'pending':
      return {
        title: 'Awaiting Your Review',
        body: detail.expiresAt
          ? `Please review and accept before ${formatDateTime(
              detail.expiresAt,
            )}.`
          : 'Please review and accept this quotation.',
      };
    case 'expired':
      return {
        title: 'Quotation Expired',
        body: detail.expiresAt
          ? `This quotation expired on ${formatDateTime(
              detail.expiresAt,
            )}. Request a fresh one to continue.`
          : 'This quotation has expired. Request a fresh one to continue.',
      };
  }
}

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
 * VehicleCard  — vehicle image on the left, name + spec grid right.
 * ================================================================ */

const VehicleCard: React.FC<{ detail: CustomerQuotationDetail }> = ({
  detail,
}) => {
  const v = detail.vehicle;
  return (
    <View style={styles.card}>
      <SectionHeader
        icon={<Bus size={18} color={Colors.primary} strokeWidth={2} />}
        iconBg={Colors.primaryTint}
        title="Vehicle Details"
      />

      <View style={styles.vehicleRow}>
        <Image
          source={v.image}
          style={styles.vehicleImage}
          resizeMode="cover"
        />
        <View style={styles.vehicleBody}>
          <Text style={styles.vehicleName}>{v.name}</Text>
          <View style={styles.specGrid}>
            <SpecItem label={`${v.seater} Seater`} />
            <SpecItem label={v.fuel} />
            {v.ac ? <SpecItem label="AC" /> : null}
            {v.hasLuggageSpace ? <SpecItem label="Luggage Space" /> : null}
          </View>
        </View>
      </View>
    </View>
  );
};

const SpecItem: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.specItem}>
    <Text style={styles.specLabel}>{label}</Text>
  </View>
);

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

const ChooseVehicleSection: React.FC = () => {
  const [expandedKey, setExpandedKey] = useState<VehicleTierKey | null>(null);
  const [selectedKey, setSelectedKey] = useState<VehicleTierKey | null>(null);

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
            onSelect={() => setSelectedKey(option.key)}
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
          time — see ChooseVehicleSection). */}
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.tierHeader, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${option.name}, ${
          expanded ? 'collapse' : 'expand'
        } features`}
      >
        <View style={styles.tierHeaderText}>
          <Text style={styles.tierName}>{option.name}</Text>
          <Text style={styles.tierMeta}>
            {option.seater} Seat &nbsp;|&nbsp; {option.type}
          </Text>
        </View>
        {expanded ? (
          <ChevronUp size={18} color={Colors.textSecondary} strokeWidth={2} />
        ) : (
          <ChevronDown size={18} color={Colors.textSecondary} strokeWidth={2} />
        )}
      </Pressable>

      {expanded ? (
        <View style={styles.tierFeatures}>
          {option.features.map(feature => (
            <View key={feature} style={styles.tierFeatureRow}>
              <CheckCircle2
                size={14}
                color={Colors.success}
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
 * TermsCard  — inclusions banner + 4-tile grid of charge callouts.
 * ================================================================ */

const TermsCard: React.FC<{ detail: CustomerQuotationDetail }> = ({
  detail,
}) => {
  return (
    <View style={styles.card}>
      <SectionHeader
        icon={<FileText size={18} color={Colors.info} strokeWidth={2} />}
        iconBg={Colors.infoTint}
        title="Terms & Conditions"
      />

      <View style={styles.inclusionsBanner}>
        <Info size={16} color={Colors.info} strokeWidth={2} />
        <View style={styles.inclusionsBody}>
          <Text style={styles.inclusionsText}>{detail.priceIncludes}</Text>
          <View style={styles.inclusionsSep} />
          <Text style={styles.inclusionsText}>{detail.priceExtra}</Text>
        </View>
      </View>

      <View style={styles.termsGrid}>
        {detail.terms.map(term => (
          <TermTile key={term.variant} term={term} />
        ))}
      </View>
    </View>
  );
};

/**
 * A single term tile. Icon + colour per `variant` — kept in a
 * lookup so a caller doesn't need to know about lucide or hex
 * codes. When ops wants to add a fifth variant, extend
 * `QuotationTerm.variant` and add the row here (TS will fail the
 * missing key).
 */
const TERM_VISUAL: Record<
  QuotationTerm['variant'],
  {
    fg: string;
    bg: string;
    Icon: React.ComponentType<{
      size?: number;
      color?: string;
      strokeWidth?: number;
    }>;
  }
> = {
  toll: { fg: Colors.success, bg: Colors.successTint, Icon: IndianRupee },
  parking: { fg: Colors.accent, bg: Colors.accentTint, Icon: ParkingSquare },
  extra_km: { fg: Colors.info, bg: Colors.infoTint, Icon: Milestone },
  night: { fg: PURPLE_FG, bg: PURPLE_TINT, Icon: Moon },
};

const TermTile: React.FC<{ term: QuotationTerm }> = ({ term }) => {
  const v = TERM_VISUAL[term.variant];
  const { Icon } = v;
  return (
    <View style={styles.termTile}>
      <View style={[styles.termIconBg, { backgroundColor: v.bg }]}>
        <Icon size={18} color={v.fg} strokeWidth={2.25} />
      </View>
      <Text style={styles.termTitle} numberOfLines={2}>
        {term.title}
      </Text>
      {term.lines.map((line, i) => (
        <Text
          key={i}
          style={i === 0 ? styles.termLinePrimary : styles.termLineSecondary}
          numberOfLines={2}
        >
          {line}
        </Text>
      ))}
    </View>
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
  onNeedChanges: () => void;
  onConfirmAccept: () => void;
  onContinueToBooking: () => void;
  onRequestNew: () => void;
}> = ({
  status,
  onNeedChanges,
  onConfirmAccept,
  onContinueToBooking,
  onRequestNew,
}) => {
  return (
    <View style={styles.bottomBar}>
      <View style={styles.bottomActions}>
        {status === 'expired' ? (
          <Pressable
            onPress={onRequestNew}
            style={({ pressed }) => [
              styles.primaryBtn,
              styles.fullWidth,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Request a new quotation"
          >
            <RefreshCw
              size={18}
              color={Colors.textOnPrimary}
              strokeWidth={2.25}
            />
            <Text style={styles.primaryBtnText}>Request New Quotation</Text>
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
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                status === 'accepted'
                  ? 'Continue to booking'
                  : 'Confirm and accept this quotation'
              }
            >
              <CheckCircle2
                size={22}
                color={Colors.textOnPrimary}
                strokeWidth={2.25}
              />
              <View style={styles.primaryBtnBody}>
                <Text style={styles.primaryBtnText}>
                  {status === 'accepted'
                    ? 'Continue to Booking'
                    : 'Confirm & Continue'}
                </Text>
                <Text style={styles.primaryBtnSubtitle} numberOfLines={1}>
                  {status === 'accepted'
                    ? 'Proceed with this quotation'
                    : 'I have reviewed and accept this quotation'}
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

  /* Meta card row */
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  metaTextCol: {
    flex: 1,
    minWidth: 140,
    gap: 2,
  },
  metaLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  metaValue: {
    ...Typography.subtitle,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  metaSubtle: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontWeight: '500',
  },

  /* Status notice box (right side of meta card) */
  notice: {
    flex: 1,
    minWidth: 200,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    gap: 4,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noticeTitle: {
    ...Typography.bodySmall,
    fontWeight: '800',
  },
  noticeBody: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '500',
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

  /* Vehicle */
  vehicleRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  vehicleImage: {
    width: 130,
    height: 90,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  vehicleBody: {
    flex: 1,
    gap: Spacing.sm,
  },
  vehicleName: {
    ...Typography.subtitle,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  specItem: {
    minWidth: '46%',
    paddingVertical: 2,
  },
  specLabel: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  /* Choose Your Vehicle — accordion (pending quotations only) */
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
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  tierCardSelected: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  tierHeaderText: {
    flex: 1,
    gap: 2,
  },
  tierName: {
    ...Typography.bodySmall,
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
    gap: 6,
  },
  tierFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tierFeatureText: {
    ...Typography.caption,
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

  /* Terms — inclusions banner */
  inclusionsBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.infoTint,
    marginBottom: Spacing.md,
  },
  inclusionsBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  inclusionsText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  inclusionsSep: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: Colors.border,
  },

  /* Terms — 4-tile grid */
  termsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  termTile: {
    /* 4-up on wide phones; wraps to 2-up on very narrow screens. */
    width: '23%',
    minWidth: 72,
    alignItems: 'center',
    gap: 4,
  },
  termIconBg: {
    width: 36,
    height: 36,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  termTitle: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  termLinePrimary: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  termLineSecondary: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: '500',
    textAlign: 'center',
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
