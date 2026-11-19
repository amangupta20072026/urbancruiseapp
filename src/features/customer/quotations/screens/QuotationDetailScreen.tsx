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
 *   │ 📄  Quotation ID QU-2026-482913  [ status confirmation box ]│
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
 * The meta card, vehicle card, total bar, terms grid and bottom
 * bar are only meaningful in the context of this screen. The Trip
 * Details card is the exception: it lives in
 * `components/QuotationTripCard.tsx` because it mirrors the booking
 * TripDetailsCard design and is easier to keep in step there. Extracting them to `components/` would create six new
 * files with zero external consumers. If any get reused later
 * (say, in a shared "Quotation summary" preview), hoist them
 * out at that point — YAGNI until then.
 *
 * ------------------------------------------------------------------
 * ACCEPT → PAY FLOW (pending path)
 * ------------------------------------------------------------------
 * Tapping "Accept & Continue" on the sticky bar presents the shared
 * `ContinueToBookingSheet` in `mode="accept"`. When the customer
 * confirms inside the sheet, the sheet fires `onAccepted`, which
 * flips this screen's local `status` pending → accepted. That state
 * change re-renders the sheet with `mode="booking"`, so the SAME
 * sheet morphs in place from "Accept this quotation?" into the
 * payment step ("Confirm & Continue" / "Pay ₹…") — no dismiss +
 * re-present. From there:
 *   - Tap "Pay" → success toast; TODO(nav) navigate to payment page.
 *   - Tap "Cancel" → sheet dismisses. The status change is already
 *                    committed, so the underlying screen now renders
 *                    the accepted layout (StatusPill + accepted CTAs).
 *
 * ------------------------------------------------------------------
 * TODO(nav):
 *   - "Need Changes"        → ModificationRequest (ghost route)
 *   - "Confirm & Continue"  → opens the confirmation sheet; the
 *                              accept step is still client-side until
 *                              the accept API is wired (see the
 *                              status useState below).
 *   - Payment page          → the sheet's `Pay` CTA currently only
 *                              fires the success toast; wire the
 *                              payment-page route when it lands.
 *   - "Continue to Booking" → BookingDetail (ghost) for the booking
 *                              that came from this quotation.
 *   - "Request New"         → RequestQuotation, pre-filling route
 *                              and passenger info from this record.
 * ------------------------------------------------------------------
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  ArrowLeftRight,
  Armchair,
  Bus,
  CarFront,
  CheckCircle2,
  ChevronRight,
  Clock,
  Fuel,
  LayoutGrid,
  Luggage,
  Mail,
  MessageCircle,
  Lock,
  PenSquare,
  Phone,
  RefreshCw,
  Snowflake,
  XCircle,
} from 'lucide-react-native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { makePhoneCall, openWhatsApp, sendEmail } from '@services/contact';
import { logEvent } from '@services/telemetry';
import type { CustomerStackParamList } from '@navigation/types';
import {
  TripNotesCard,
  OtherChargesCard,
} from '@shared/components/TripCharges';

import type { CustomerQuotationDetail, QuotationStatus } from '../types';
import { getCustomerQuotationDetail } from '../mocks';
import { QuotationTripCard } from '../components/QuotationTripCard';
import {
  VEHICLE_OPTIONS,
  VEHICLE_TIER_LABELS,
  VEHICLE_TIER_NAMES,
  VEHICLE_TIER_PALETTE,
  findVehicleOption,
  type VehicleOption,
  type VehicleSelection,
  type VehicleTierKey,
} from '../vehicleTierOptions';
import { narrowChargesToVehicle } from '../utils/otherCharges';
import {
  TIER_PALETTE,
  VehicleOptionCard,
} from '../components/VehicleOptionCard';
import {
  VehicleTierTabs,
  type VehicleTierTab,
} from '../components/VehicleTierTabs';
import { NeedChangesSheet } from '../components/NeedChangesSheet';
import { BookingProcessFab } from '../components/BookingProcessFab';
import { BookingProcessSheet } from '../components/BookingProcessSheet';
import { ContinueToBookingSheet } from '../components/ContinueToBookingSheet';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  BrochureActionRow,
  WatchVehicleVideoButton,
  findBrochure,
  findBrochureByGroupKey,
  hasVideo,
  lookupForVehicleOption,
  useBrochures,
  type BrochureEntry,
  type BrochureVideoState,
} from '@features/customer/brochures';

type Nav = NativeStackNavigationProp<CustomerStackParamList, 'QuotationDetail'>;
type Route = RouteProp<CustomerStackParamList, 'QuotationDetail'>;

/* ================================================================
 * Advisor contact-action tints
 * ================================================================
 * Kept in sync with the UC Directory customer contact modal
 * (src/features/uc/_directory/contact/DirectoryContactSheet.tsx)
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
   * (CustomerFilterSheet, DirectoryContactSheet, etc.) — see
   * `@gorhom/bottom-sheet`'s docs for the rationale over the
   * declarative visible-prop approach. */
  const needChangesRef = useRef<BottomSheetModal>(null);
  const confirmationRef = useRef<BottomSheetModal>(null);
  const bookingProcessRef = useRef<BottomSheetModal>(null);

  /* -------- Auto-open ContinueToBookingSheet on landing -------- *
   *
   * The Payments tab's pending-state "Pay Now" CTA navigates here
   * with `openContinueSheet: true` so the customer lands on the
   * quotation screen with the confirm-and-continue sheet already
   * open — one tap to complete payment instead of two.
   *
   * Gated on `detail` so the present() runs only after the mock
   * lookup resolves (a stale quotation id would land on the
   * not-found body below, and presenting a sheet over that body
   * would be a nonsense state). The `openContinueSheet` param is
   * one-shot — the intent is to open the sheet ONCE on this landing,
   * and if the user dismisses the sheet and returns to the screen
   * via back navigation, we don't want it to spring open again.
   * We rely on React Navigation's default behaviour of passing the
   * same params on remount from state — if that ever changes, add
   * `navigation.setParams({ openContinueSheet: undefined })` after
   * the present() to make the one-shot explicit.
   *
   * The rAF wait lets the sheet's own layout register before the
   * present() call — presenting inside the same microtask as mount
   * makes the sheet skip its enter animation on some devices. */
  const openContinueSheet = route.params.openContinueSheet;
  useEffect(() => {
    if (!openContinueSheet || !detail) return;
    const handle = requestAnimationFrame(() => {
      confirmationRef.current?.present();
    });
    return () => cancelAnimationFrame(handle);
  }, [openContinueSheet, detail]);

  /* -------- Auto-open NeedChangesSheet on landing -------- *
   *
   * Same one-shot pattern as above, for the Quotations list's
   * "Need Changes" button on pending cards. */
  const openNeedChangesSheet = route.params.openNeedChangesSheet;
  useEffect(() => {
    if (!openNeedChangesSheet || !detail) return;
    const handle = requestAnimationFrame(() => {
      needChangesRef.current?.present();
    });
    return () => cancelAnimationFrame(handle);
  }, [openNeedChangesSheet, detail]);

  /* -------- Selection state --------
   *
   * Which vehicle option (+ quantity) the customer has committed to in the pending
   * picker. Held HERE (not inside `ChooseVehicleSection`) so the
   * sticky `BottomBar` can gate its "Accept & Continue" CTA on it —
   * a customer shouldn't be able to accept a quotation before they
   * have chosen a vehicle.
   *
   * Ignored for `accepted` / `expired` quotations, which don't
   * render the picker at all (the vehicle is already locked in
   * server-side). */
  const [vehicleSelection, setVehicleSelection] =
    useState<VehicleSelection | null>(null);

  /* -------- Local status (SSoT while accept API is not wired) --------
   *
   * The mock `detail.status` is the initial value; every UI branch
   * on this screen (StatusPill, BottomBar CTAs, ChooseVehicleSection
   * vs VehicleCard, and the confirmation sheet's `mode`) reads from
   * `status` instead so we can flip pending → accepted client-side
   * when the customer completes the accept step inside the sheet.
   *
   * When the /customer/quotations/:id/accept mutation lands, replace
   * this with a TanStack Query invalidation: the mutation's onSuccess
   * refetches the detail and the server-returned status drives the UI
   * — this useState goes away with no other consumer changes needed.
   *
   * `useState` is initialised with `detail?.status ?? 'pending'` so
   * the not-found branch below can still short-circuit (the fallback
   * value is never actually read in that case). */
  const [status, setStatus] = useState<QuotationStatus>(
    detail?.status ?? 'pending',
  );

  const acceptDisabled = status === 'pending' && vehicleSelection === null;

  /* The vehicle behind `vehicleSelection.optionId`, or null while the
   * customer hasn't chosen. Drives the "For your vehicle" line on the
   * Other Charges card — see TripChargesSection. `findVehicleOption`
   * returns undefined for an id that is no longer offered (a stale
   * deep-link), which collapses to null so the card falls back to the
   * full tier list rather than crashing. */
  const selectedVehicleOption = useMemo(
    () =>
      vehicleSelection
        ? findVehicleOption(vehicleSelection.optionId) ?? null
        : null,
    [vehicleSelection],
  );

  /* -------- Handlers -------- */

  const onNeedChanges = useCallback(() => {
    needChangesRef.current?.present();
  }, []);

  /* Read-only explainer — no state to reset, so it is simply
     presented. `logEvent` records that the customer needed it:
     a high rate here says the quotation screen is not explaining
     itself well enough on its own. */
  const onOpenBookingProcess = useCallback(() => {
    logEvent('quotation.booking_process_opened', { status });
    bookingProcessRef.current?.present();
  }, [status]);

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

  // `selectVehicleOptionId` is one-shot (set by VehicleVideo /
  // CompareVehicles on return); clear it once applied so going back
  // and forth never re-applies a stale choice.
  const onPendingSelectConsumed = useCallback(() => {
    navigation.setParams({ selectVehicleOptionId: undefined });
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
          rightSlot={<StatusPill status={status} />}
        />
      </View>

      {/* The scroll and the floating pill share this wrapper. It
          ends exactly where the sticky BottomBar begins, so the
          pill keeps a fixed gap above the bar without anyone
          hardcoding the bar's height. */}
      <View style={styles.scrollArea}>
        <ScrollView
          style={styles.scrollBg}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <MetaCard detail={detail} />
          <QuotationTripCard detail={detail} />
          {status === 'pending' ? (
            <ChooseVehicleSection
              quotationId={route.params.quotationId}
              selection={vehicleSelection}
              onChangeSelection={setVehicleSelection}
              pendingSelectOptionId={route.params.selectVehicleOptionId}
              onPendingSelectConsumed={onPendingSelectConsumed}
            />
          ) : (
            <VehicleCard detail={detail} status={status} />
          )}
          <TripChargesSection
            detail={detail}
            selectedOption={selectedVehicleOption}
          />
        </ScrollView>

        <BookingProcessFab onPress={onOpenBookingProcess} />
      </View>

      <BottomBar
        status={status}
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
        onGoToQuotations={() =>
          navigation.navigate('CustomerTabs', { screen: 'Quotations' })
        }
        onBackToHome={() =>
          navigation.navigate('CustomerTabs', { screen: 'Home' })
        }
      />
      {/* Read-only explainer. Carries no screen data, so it takes
          no props beyond its ref. */}
      <BookingProcessSheet ref={bookingProcessRef} />
      <ContinueToBookingSheet
        ref={confirmationRef}
        mode={status === 'pending' ? 'accept' : 'booking'}
        onAccepted={() => setStatus('accepted')}
        summary={{
          quotationNumber: detail.quotationNumber,
          travelDateStart: detail.travelDateStart,
          travelDateEnd: detail.travelDateEnd,
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
              <Text style={styles.advisorName}>{executive.name}</Text>
              {/* Customers always see "Travel Advisor"; the internal job
                  title (`executive.role`, e.g. Sales Executive) is not
                  shown. Same wording as the Need Help sheet. */}
              <Text style={styles.advisorRole}>Travel Advisor</Text>
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
 * VehicleCard  — the vehicle-details block shown when a quotation
 *                is `accepted` or `expired` (the vehicle is locked
 *                in and there's exactly one to display).
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ (🚌) Vehicle Details              ✓ Confirmed │  accepted only
 *   │ ┌────────┐ [ECONOMY]                          │  tier: if known
 *   │ │ photo  │ Maruti Suzuki Ertiga               │
 *   │ └────────┘ A/c, Recline Seat, Charging Point… │  description
 *   │ ┌ 🪑 7  │ ⛽ CNG  │ ❄ Yes │ 🧳 Yes ┐          │  spec strip
 *   │ └ Seats │  Fuel   │  AC   │ Luggage ┘          │
 *   │ [ ▶ Watch Vehicle Video ]                     │  if brochure
 *   │           ⊞ Explore other vehicles ›          │
 *   └──────────────────────────────────────────────┘
 *
 * Everything is visible at once — no accordion. Once a quotation is
 * accepted the vehicle is a settled fact of the trip, not something
 * to dig for. The photo stays small on purpose: until each vehicle
 * has its own photo, a large placeholder would be misleading.
 *
 * SPEC STRIP: same tinted, four-column look as the Spiritual Tours
 * fact strip. AC and Luggage show "No" in grey rather than being
 * dropped, so the strip always reads the same four facts.
 *
 * DESCRIPTION: `vehicle.description` in full, small and grey, like
 * the vehicle option cards. Absent → "Your vehicle for this trip".
 *
 * TIER TAG: only when the quotation names the vehicle's brochure
 * (`vehicle.brochure.tier`); never guessed from the vehicle name.
 * Colours from VEHICLE_TIER_PALETTE, like everywhere else.
 *
 * EXPLORE OTHER VEHICLES: opens Vehicle Brochures in view-only mode
 * (`browseOnly`), so no "Select this vehicle" button appears — the
 * vehicle of an accepted / expired quotation can't be swapped there.
 * A customer who wants a different vehicle uses Need Changes.
 * ================================================================ */

type VehicleSpec = {
  key: string;
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  value: string;
  label: string;
  /** Grey value: a feature this vehicle does not have. */
  muted: boolean;
};

const VehicleCard: React.FC<{
  detail: CustomerQuotationDetail;
  status: QuotationStatus;
}> = ({ detail, status }) => {
  const v = detail.vehicle;
  const navigation = useNavigation<Nav>();

  /* Brochure video. Shown only when the quotation names its brochure
   * (`vehicle.brochure`, sent by the quotations API) AND the catalog
   * has it. Never guessed from the vehicle name: no video is better
   * than the wrong video. No brochure ref → no network call. */
  const brochureRef = v.brochure;
  const { data: brochureEntries } = useBrochures({
    enabled: brochureRef !== undefined,
  });
  const brochure = useMemo(
    () =>
      brochureRef && brochureEntries
        ? findBrochureByGroupKey(
            brochureEntries,
            brochureRef.groupKey,
            brochureRef.tier,
          )
        : null,
    [brochureRef, brochureEntries],
  );
  const onWatchVideo = useCallback(() => {
    if (!brochure) return;
    navigation.navigate('VehicleVideo', {
      groupKey: brochure.groupKey,
      tier: brochure.tier,
    });
  }, [navigation, brochure]);

  const onExplore = useCallback(() => {
    navigation.navigate('VehicleBrochures', {
      quotationId: detail.id,
      browseOnly: true,
    });
  }, [navigation, detail.id]);

  const tier = brochureRef?.tier;
  const tierColor = tier ? VEHICLE_TIER_PALETTE[tier].solid : null;

  const specs = useMemo<VehicleSpec[]>(
    () => [
      {
        key: 'seats',
        Icon: Armchair,
        value: String(v.seater),
        label: 'Seats',
        muted: false,
      },
      { key: 'fuel', Icon: Fuel, value: v.fuel, label: 'Fuel', muted: false },
      {
        key: 'ac',
        Icon: Snowflake,
        value: v.ac ? 'Yes' : 'No',
        label: 'AC',
        muted: !v.ac,
      },
      {
        key: 'luggage',
        Icon: Luggage,
        value: v.hasLuggageSpace ? 'Yes' : 'No',
        label: 'Luggage',
        muted: !v.hasLuggageSpace,
      },
    ],
    [v.seater, v.fuel, v.ac, v.hasLuggageSpace],
  );

  return (
    <View style={styles.card}>
      <SectionHeader
        icon={<Bus size={18} color={Colors.primary} strokeWidth={2} />}
        iconBg={Colors.primaryTint}
        title="Vehicle Details"
        rightSlot={
          status === 'accepted' ? (
            <View style={styles.vehicleConfirmed}>
              <CheckCircle2
                size={13}
                color={Colors.primaryDark}
                strokeWidth={2.5}
              />
              <Text style={styles.vehicleConfirmedText}>Confirmed</Text>
            </View>
          ) : undefined
        }
      />

      {/* ── Photo + identity ─────────────────────────────── */}
      <View style={styles.vehicleRow}>
        <Image
          source={v.image}
          style={styles.vehiclePhoto}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
        <View style={styles.vehicleIdentity}>
          {tier && tierColor ? (
            <View
              style={[styles.vehicleTierPill, { backgroundColor: tierColor }]}
            >
              <Text style={styles.vehicleTierPillText}>
                {VEHICLE_TIER_LABELS[tier]}
              </Text>
            </View>
          ) : null}
          <Text style={styles.vehicleName} numberOfLines={2}>
            {v.name}
          </Text>
          {/* Full description, like the vehicle option cards; the
              caption stands in until the quotation sends one. */}
          <Text style={styles.vehicleCaption}>
            {v.description?.trim() || 'Your vehicle for this trip'}
          </Text>
        </View>
      </View>

      {/* ── Spec strip ───────────────────────────────────── */}
      <View style={styles.vehicleSpecStrip}>
        {specs.map((spec, i) => (
          <View
            key={spec.key}
            style={[styles.vehicleSpec, i > 0 && styles.vehicleSpecDivided]}
            accessible
            accessibilityLabel={`${spec.label}, ${spec.value}`}
          >
            <spec.Icon
              size={20}
              color={spec.muted ? Colors.textTertiary : Colors.primaryDark}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.vehicleSpecValue,
                spec.muted && styles.vehicleSpecValueMuted,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {spec.value}
            </Text>
            <Text style={styles.vehicleSpecLabel} numberOfLines={1}>
              {spec.label}
            </Text>
          </View>
        ))}
      </View>

      {brochure ? (
        <View style={styles.vehicleVideoAction}>
          <WatchVehicleVideoButton
            comingSoon={!hasVideo(brochure)}
            onPress={onWatchVideo}
            vehicleName={v.name}
          />
        </View>
      ) : null}

      {/* ── Browse the whole fleet (view only) ───────────── */}
      <Pressable
        onPress={onExplore}
        hitSlop={8}
        style={({ pressed }) => [
          styles.vehicleExplore,
          pressed && styles.compareAllPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Explore other vehicles"
      >
        <LayoutGrid size={16} color={Colors.primaryDark} strokeWidth={2.2} />
        <Text style={styles.compareAllText}>Explore other vehicles</Text>
        <ChevronRight size={16} color={Colors.primaryDark} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
};

/* ================================================================
 * ChooseVehicleSection  — vehicle picker, shown instead of the plain
 *                         VehicleCard while a quotation is `pending`
 *                         (the vehicle isn't locked in yet).
 *
 * LAYOUT: one card, like Trip Details.
 *   ┌──────────────────────────────────────────┐
 *   │ 🚐 Choose Your Vehicle                    │
 *   │    Select the vehicle that best suits …   │
 *   │ [Economy 1|Premium 1|█Royal 2█|VIP 3]     │  VehicleTierTabs
 *   │ ┌ vehicle card (View all ⌄) ───────────┐ │
 *   │ └──────────────────────────────────────┘ │
 *   │        ⇄ Compare all 7 vehicles          │
 *   └──────────────────────────────────────────┘
 *
 * TIER TABS:
 *   Only the active tier's vehicles show. Economy is open when the
 *   screen loads. Switching tabs fades the new list in. The tab of the
 *   tier holding the selected vehicle shows a dot while another tab
 *   is open (VehicleTierTabs). A selection made on VehicleVideo /
 *   CompareVehicles switches to that vehicle's tier, so the customer
 *   lands looking at what they just chose.
 *
 *   Card numbers (the corner badge) stay the vehicle's position in the
 *   full list, so they match the Compare screen.
 *
 * COMPARE ALL:
 *   Opens CompareVehicles focused on the selected vehicle, or on the
 *   first vehicle of the open tab when nothing is selected yet.
 *
 * STATE:
 *   `selection` ({ optionId, quantity } | null) is lifted to the
 *   screen so the sticky BottomBar can gate "Accept & Continue".
 *
 *   `quantities` is local: every card has its own stepper, and the
 *   customer can set a count BEFORE tapping Select. Tapping Select
 *   commits that card's count. Changing the stepper on the
 *   already-selected card updates the selection live; changing it on
 *   any other card does NOT steal the selection — only Select does.
 *   Tapping Select on the selected card again deselects it.
 *
 * BROCHURES:
 *   Each card gets a "Watch Video / Compare" row. Videos come from the
 *   brochure catalog; while it loads or if it fails, the video button
 *   is hidden and the picker works as before (Compare stays — prices
 *   and seats need no catalog).
 *
 *   `pendingSelectOptionId` is a selection made on VehicleVideo or
 *   CompareVehicles. It is applied with that card's own quantity,
 *   exactly like tapping its Select, then consumed.
 * ================================================================ */

/** Tabs in tier order; a tier with no vehicles gets no tab. */
const TIER_TABS: readonly VehicleTierTab[] = (
  ['economy', 'premium', 'royal', 'royal_vip'] as const
)
  .map(key => ({
    key,
    label: VEHICLE_TIER_NAMES[key],
    count: VEHICLE_OPTIONS.filter(o => o.tier === key).length,
    color: TIER_PALETTE[key].solid,
  }))
  .filter(tab => tab.count > 0);

const ChooseVehicleSection: React.FC<{
  quotationId: CustomerQuotationDetail['id'];
  selection: VehicleSelection | null;
  onChangeSelection: (next: VehicleSelection | null) => void;
  pendingSelectOptionId: string | undefined;
  onPendingSelectConsumed: () => void;
}> = ({
  quotationId,
  selection,
  onChangeSelection,
  pendingSelectOptionId,
  onPendingSelectConsumed,
}) => {
  const navigation = useNavigation<Nav>();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [activeTier, setActiveTier] = useState<VehicleTierKey>(
    TIER_TABS[0]?.key ?? 'economy',
  );

  const qtyFor = useCallback(
    (id: string): number =>
      quantities[id] ?? (selection?.optionId === id ? selection.quantity : 1),
    [quantities, selection],
  );

  const onChangeQuantity = useCallback(
    (id: string, next: number) => {
      setQuantities(prev => ({ ...prev, [id]: next }));
      if (selection?.optionId === id) {
        onChangeSelection({ optionId: id, quantity: next });
      }
    },
    [selection, onChangeSelection],
  );

  const onSelect = useCallback(
    (id: string) => {
      onChangeSelection(
        selection?.optionId === id
          ? null
          : { optionId: id, quantity: qtyFor(id) },
      );
    },
    [selection, onChangeSelection, qtyFor],
  );

  /* Selection coming back from VehicleVideo / CompareVehicles. Unlike
   * a card tap it never toggles off: "Select this vehicle" means
   * select. Unknown ids (stale option list) are ignored.
   *
   * Runs once per new id. The callbacks are read through a ref so a
   * re-render (e.g. the selection it just made) can never re-apply it,
   * even before the screen has cleared the param. */
  const pendingSelectDeps = useRef({
    onChangeSelection,
    qtyFor,
    onPendingSelectConsumed,
  });
  useEffect(() => {
    pendingSelectDeps.current = {
      onChangeSelection,
      qtyFor,
      onPendingSelectConsumed,
    };
  });
  useEffect(() => {
    if (pendingSelectOptionId === undefined) return;
    const deps = pendingSelectDeps.current;
    const picked = VEHICLE_OPTIONS.find(o => o.id === pendingSelectOptionId);
    if (picked) {
      deps.onChangeSelection({
        optionId: picked.id,
        quantity: deps.qtyFor(picked.id),
      });
      setActiveTier(picked.tier);
    }
    deps.onPendingSelectConsumed();
  }, [pendingSelectOptionId]);

  /* -------- Brochures -------- */
  const { data: brochureEntries } = useBrochures();

  const brochureByOption = useMemo(() => {
    const map = new Map<string, BrochureEntry>();
    if (!brochureEntries) return map;
    for (const option of VEHICLE_OPTIONS) {
      const entry = findBrochure(
        brochureEntries,
        lookupForVehicleOption(option),
      );
      if (entry) map.set(option.id, entry);
    }
    return map;
  }, [brochureEntries]);

  const videoStateFor = useCallback(
    (optionId: string): BrochureVideoState => {
      const entry = brochureByOption.get(optionId);
      if (!entry) return 'none';
      return hasVideo(entry) ? 'available' : 'comingSoon';
    },
    [brochureByOption],
  );

  const onWatchVideo = useCallback(
    (option: VehicleOption) => {
      const entry = brochureByOption.get(option.id);
      if (!entry) return;
      navigation.navigate('VehicleVideo', {
        groupKey: entry.groupKey,
        tier: entry.tier,
        select: { quotationId, optionId: option.id },
      });
    },
    [navigation, brochureByOption, quotationId],
  );

  const onCompare = useCallback(
    (option: VehicleOption) => {
      navigation.navigate('CompareVehicles', {
        quotationId,
        focusOptionId: option.id,
      });
    },
    [navigation, quotationId],
  );

  /* -------- Tier tabs -------- */
  const tierOptions = useMemo(
    () => VEHICLE_OPTIONS.filter(o => o.tier === activeTier),
    [activeTier],
  );

  const selectedTier =
    selection !== null
      ? findVehicleOption(selection.optionId)?.tier ?? null
      : null;

  const onCompareAll = useCallback(() => {
    const focusOptionId = selection?.optionId ?? tierOptions[0]?.id;
    if (!focusOptionId) return;
    navigation.navigate('CompareVehicles', { quotationId, focusOptionId });
  }, [navigation, quotationId, selection, tierOptions]);

  return (
    <View style={styles.card}>
      <View style={styles.chooseVehicleHeader}>
        <View style={styles.chooseVehicleIcon}>
          <CarFront size={20} color={Colors.primaryDark} strokeWidth={2} />
        </View>
        <View style={styles.chooseVehicleHeaderText}>
          <Text style={styles.sectionTitle}>Choose Your Vehicle</Text>
          <Text style={styles.chooseVehicleSubtitle}>
            Select the vehicle that best suits your journey
          </Text>
        </View>
      </View>

      <VehicleTierTabs
        tabs={TIER_TABS}
        value={activeTier}
        onChange={setActiveTier}
        markedKey={selectedTier}
      />

      {/* Keyed by tier: a tab switch remounts the list, which fades
          the new tier's vehicles in. */}
      <Animated.View
        key={activeTier}
        entering={FadeIn.duration(220)}
        style={styles.chooseVehicleList}
      >
        {tierOptions.map(option => (
          <VehicleOptionCard
            key={option.id}
            option={option}
            index={VEHICLE_OPTIONS.indexOf(option) + 1}
            selected={selection?.optionId === option.id}
            quantity={qtyFor(option.id)}
            onChangeQuantity={next => onChangeQuantity(option.id, next)}
            onSelect={() => onSelect(option.id)}
            actions={
              <BrochureActionRow
                videoState={videoStateFor(option.id)}
                onWatchVideo={() => onWatchVideo(option)}
                onCompare={() => onCompare(option)}
                vehicleName={`${VEHICLE_TIER_LABELS[option.tier]} ${
                  option.model
                }`}
              />
            }
          />
        ))}
      </Animated.View>

      <Pressable
        onPress={onCompareAll}
        hitSlop={8}
        style={({ pressed }) => [
          styles.compareAll,
          pressed && styles.compareAllPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Compare all ${VEHICLE_OPTIONS.length} vehicles`}
      >
        <ArrowLeftRight
          size={16}
          color={Colors.primaryDark}
          strokeWidth={2.2}
        />
        <Text style={styles.compareAllText}>
          Compare all {VEHICLE_OPTIONS.length} vehicles
        </Text>
      </Pressable>
    </View>
  );
};

/* ================================================================
 * TripChargesSection — "Notes" + "Other Charges (if applicable)"
 * ================================================================
 * The same two cards Booking Details renders, from the same shared
 * component. Replaced the old three-card block (Important Charges /
 * Extra KM + Night Charges band / Terms & Conditions) so a customer
 * reads one set of terms, worded identically, before and after they
 * confirm.
 *
 * The only difference between the two screens is WHEN the vehicle is
 * known. Booking Details always knows it. Here the customer may
 * still be choosing, so `narrowChargesToVehicle` collapses the
 * vehicle-priced extra-km row to their pick the moment they select
 * one, and leaves the full tier list showing until then.
 *
 * TODO(api): an accepted quotation records which option was chosen
 * on the server, but the detail payload does not carry its id yet,
 * so the row shows every tier on an accepted quotation. Pass the
 * chosen option id through and this narrows there too, with no
 * change needed here.
 * ================================================================ */

const TripChargesSection: React.FC<{
  detail: CustomerQuotationDetail;
  selectedOption: VehicleOption | null;
}> = ({ detail, selectedOption }) => {
  const charges = useMemo(
    () => narrowChargesToVehicle(detail.otherCharges, selectedOption),
    [detail.otherCharges, selectedOption],
  );

  return (
    <>
      <TripNotesCard notes={detail.notes} />
      <OtherChargesCard charges={charges} />
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
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  headerBlock: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },

  /* Scroll */
  scrollArea: {
    flex: 1,
    // The floating pill is positioned against this box, so it must
    // establish the containing block for it.
    position: 'relative',
  },
  scrollBg: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    // Was Spacing.xxxxl. Raised so the floating "Booking process"
    // pill (52 dp tall, Spacing.lg from the bottom) can never rest
    // on top of the last card once the customer scrolls to the end.
    paddingBottom: Spacing.xxxxl + 52 + Spacing.lg,
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

  /* Brochure video button under the Vehicle Details spec strip */
  vehicleVideoAction: {
    marginTop: Spacing.md,
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

  /* ================================================================
   * Vehicle Details — unified design language across all 3 states
   * ================================================================
   * The same visual DNA drives BOTH:
   *   - the single locked-in vehicle card shown when the quotation
   *     is `accepted` / `expired` (VehicleCard), and
   *   - (the pending picker now uses its own VehicleOptionCard —
   *     see components/VehicleOptionCard.tsx).
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
  vehicleConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryTint,
  },
  vehicleConfirmedText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  vehiclePhoto: {
    width: 96,
    height: 70,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  vehicleIdentity: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  vehicleTierPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  vehicleTierPillText: {
    ...Typography.caption,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: Colors.textOnPrimary,
    includeFontPadding: false,
  },
  vehicleName: {
    ...Typography.subtitle,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  vehicleCaption: {
    ...Typography.caption,
    fontSize: 11.5,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  vehicleSpecStrip: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.lg,
    backgroundColor: '#EEF7EF',
  },
  vehicleSpec: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.xs,
  },
  vehicleSpecDivided: {
    borderLeftWidth: 1,
    borderLeftColor: '#CFE3D1',
  },
  vehicleSpecValue: {
    ...Typography.bodySmall,
    marginTop: 2,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  vehicleSpecValueMuted: {
    color: Colors.textTertiary,
  },
  vehicleSpecLabel: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  vehicleExplore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: Spacing.xs + 2,
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },

  /* ── Choose Your Vehicle (pending quotations only) ──
   * One card (styles.card), like Trip Details: header, tier tabs,
   * the open tier's vehicle cards, and the Compare-all link. */
  chooseVehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chooseVehicleIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chooseVehicleHeaderText: {
    flex: 1,
    gap: 2,
  },
  chooseVehicleSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chooseVehicleList: {
    gap: Spacing.sm + 2,
    marginTop: Spacing.md,
  },
  compareAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: Spacing.xs + 2,
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  compareAllPressed: {
    opacity: 0.6,
  },
  compareAllText: {
    ...Typography.label,
    fontWeight: '700',
    color: Colors.primaryDark,
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
