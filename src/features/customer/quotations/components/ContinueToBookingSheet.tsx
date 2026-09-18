/**
 * ------------------------------------------------------------------
 * ContinueToBookingSheet — quotation confirmation bottom sheet
 * ------------------------------------------------------------------
 * Opens from the quotation CTA. In `accept` mode it confirms a
 * PENDING quotation; in `booking` mode it confirms the next booking
 * step for an ACCEPTED quotation.
 * QuotationDetailScreen. This is a lightweight review-and-confirm
 * surface: the customer sees a compact summary of the quotation
 * they're about to book and either backs out (Cancel) or proceeds
 * (Confirm & Continue), which routes them into the downstream
 * booking flow.
 *
 * LAYOUT (top → bottom, inside the sheet):
 *
 *   ┌────────────────────────────────────────────────────────┐
 *   │ ✅   Confirm & Continue                                 │
 *   │      Please review the details below before proceeding │
 *   │      to booking.                                       │
 *   ├────────────────────────────────────────────────────────┤
 *   │ ┌ Summary ─────────────────────────────── (tinted) ─┐  │
 *   │ │ 📄 Quotation ID          QU10257                 │  │
 *   │ │ 📅 Travel Date           12 Aug 2026 – 15 Aug 2026│  │
 *   │ │                              (3 Nights / 4 Days) │  │
 *   │ │ 👥 Passengers            2 Adults, 1 Child       │  │
 *   │ │                              (3 Passengers)      │  │
 *   │ │ ₹  Total Amount          ₹35,200                 │  │
 *   │ └───────────────────────────────────────────────────┘  │
 *   ├────────────────────────────────────────────────────────┤
 *   │ [    Cancel    ]  [   Confirm & Continue   ]          │
 *   │ 🔒 Your booking will be processed securely with UC     │
 *   └────────────────────────────────────────────────────────┘
 *
 * ------------------------------------------------------------------
 * PROP DESIGN — SUMMARY, NOT DETAIL
 * ------------------------------------------------------------------
 * The sheet takes a `ConfirmSummary` (a slim struct of just the
 * fields it renders) rather than the full `CustomerQuotationDetail`.
 * Two reasons:
 *   1. Explicit contract — anyone reading the file sees exactly
 *      what the sheet consumes without cross-referencing the
 *      detail type.
 *   2. Testability — future unit / snapshot tests can build a
 *      handful of primitives instead of the full detail object.
 * The parent composes the summary in one line from `detail`.
 *
 * ------------------------------------------------------------------
 * SUBMISSION FLOW
 * ------------------------------------------------------------------
 *   The primary CTA behaves differently by `mode`:
 *
 *   mode === 'accept'  (pending quotation)
 *     Tap "Accept & Continue" → spinner → `onConfirm()` (or mock
 *     delay) → on success:
 *       - toast.success('Quotation accepted', …)
 *       - `onAccepted()` fires so the parent can flip the
 *         quotation's status pending → accepted.
 *       - The sheet DOES NOT dismiss. The parent re-renders with
 *         `mode="booking"` and the same sheet morphs in place —
 *         hero copy, CTA label and trust line all swap to the
 *         payment step. This is the "accept → pay" two-step flow
 *         inside one sheet (no dismiss/re-present flicker).
 *
 *   mode === 'booking' (already-accepted quotation)
 *     Tap "Pay ₹…" → spinner → `onConfirm()` (or mock delay) →
 *     on success:
 *       - toast.success('Booking confirmed', …)
 *       - Sheet dismisses. Downstream: parent should navigate to
 *         the payment page (TODO(nav) — see call site).
 *
 *   On failure (either mode):
 *     - toast.error(...) + keep the sheet open so the customer
 *       can retry.
 *
 *   Tap "Cancel" → dismiss with no side-effects. If the customer
 *   cancels in `booking` mode AFTER having accepted a moment ago,
 *   the status change is already committed on the parent — the
 *   quotation stays 'accepted', the sheet just closes.
 *
 *   `onConfirm` is optional; without it a 700ms mock delay runs
 *   so demo taps feel real.
 *
 * NOTE ON PAYMENT AMOUNT:
 *   The prior design surfaced the booking advance on the CTA
 *   ("Pay ₹8,800 to confirm your reservation"). Product removed
 *   that — the amount is now collected on the downstream payment
 *   screen, not here. The sheet no longer accepts `advanceAmount`
 *   (still on the underlying record for the payment screen).
 * ------------------------------------------------------------------
 */

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import {
  Calendar,
  Check,
  FileText,
  IndianRupee,
  Lock,
  MapPin,
  Users,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { toast } from '@services/toast';

/* ================================================================
 * Types + Props
 * ================================================================ */

/**
 * Slim summary the sheet renders. Everything else on the underlying
 * `CustomerQuotationDetail` (vehicle, stops, terms, executive) is
 * intentionally excluded — the confirmation step is about the
 * *what* / *when* / *who* / *how much*, not the sales collateral.
 */
export type ConfirmSummary = {
  quotationNumber: string;
  travelDateStart: string; // ISO
  travelDateEnd: string; // ISO
  nights: number;
  days: number;
  adults: number;
  children: number;
  /** Total amount in INR (whole rupees). */
  amount: number;
  /** Human-readable route shown in the confirmation sheet. */
  trip: string;
};

type Props = {
  summary: ConfirmSummary;
  /** `accept` is used for a pending quotation; `booking` is used after acceptance. */
  mode?: 'accept' | 'booking';
  /**
   * Called when the customer confirms. Should resolve on success
   * (sheet dismisses, parent may route onward) or reject on
   * failure (sheet keeps state, error toast fires). If omitted a
   * 700ms mock runs so demo taps feel real.
   */
  onConfirm?: () => Promise<void>;
  /**
   * Fired ONLY in `accept` mode, after a successful confirm and
   * before the accept-toast is shown. The parent uses this to flip
   * the quotation's local status pending → accepted; that state
   * change re-renders this sheet with `mode="booking"` so the same
   * sheet transitions in place from "Accept this quotation?" to
   * "Confirm & Continue" (payment). No-op in `booking` mode.
   */
  onAccepted?: () => void;
};

/* ================================================================
 * Constants + helpers
 * ================================================================ */

/**
 * Fixed snap point. The sheet is compact (hero + 4-row summary +
 * two buttons + trust line ≈ 380–420dp), so a low snap keeps
 * enough of the parent screen visible for context. Bump this if
 * the summary grows past 4 rows.
 */
const SNAP_POINTS = ['54%'];

/** ISO → "12 Aug 2026". */
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
 * Component
 * ================================================================ */

export const ContinueToBookingSheet = forwardRef<BottomSheetModal, Props>(
  ({ summary, mode = 'booking', onConfirm, onAccepted }, ref) => {
    const internalRef = useRef<BottomSheetModal>(null);
    useImperativeHandle(ref, () => internalRef.current as BottomSheetModal, []);

    const [confirming, setConfirming] = useState(false);

    const dismiss = useCallback(() => {
      internalRef.current?.dismiss();
    }, []);

    /* Reset the confirming spinner if the sheet is dragged shut
       mid-flight. Otherwise the button stays locked on next open —
       a subtle bug that only shows after several open/close cycles. */
    const handleSheetChange = useCallback((index: number) => {
      if (index === -1) setConfirming(false);
    }, []);

    const handleConfirm = useCallback(async () => {
      if (confirming) return;
      setConfirming(true);
      try {
        if (onConfirm) {
          await onConfirm();
        } else {
          await new Promise(resolve => setTimeout(resolve, 700));
        }

        if (mode === 'accept') {
          /* Accept step. Tell the parent to flip the quotation
             pending → accepted, fire the accept toast, and LEAVE
             THE SHEET OPEN. The parent's state change will cause
             this component to re-render with mode='booking', so
             the hero, CTA and trust line swap in place into the
             payment step — no dismiss + re-present flicker. */
          onAccepted?.();
          toast.success('Quotation accepted', {
            description: 'Redirecting you to booking…',
          });
          // Intentionally NOT dismissing here.
        } else {
          /* Payment step. Fire the confirmation toast and dismiss.
             TODO(nav): once the payment checkout screen exists,
             navigate to it here (parent-side, likely via an
             `onPay` callback so this sheet stays route-agnostic).
             For now the toast is the only user-visible outcome. */
          toast.success('Booking confirmed', {
            description: 'Redirecting you to payment…',
          });
          dismiss();
        }
      } catch {
        toast.error('Could not confirm booking', {
          description: 'Please try again in a moment.',
        });
      } finally {
        setConfirming(false);
      }
    }, [confirming, mode, onConfirm, onAccepted, dismiss]);

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

    /* -------- Derived display strings -------- */

    const dateRange = useMemo(
      () =>
        `${formatDate(summary.travelDateStart)} – ${formatDate(
          summary.travelDateEnd,
        )}`,
      [summary.travelDateStart, summary.travelDateEnd],
    );

    const durationLabel = useMemo(() => {
      const n = `${summary.nights} ${
        summary.nights === 1 ? 'Night' : 'Nights'
      }`;
      const d = `${summary.days} ${summary.days === 1 ? 'Day' : 'Days'}`;
      return `(${n} / ${d})`;
    }, [summary.nights, summary.days]);

    const passengerLine = useMemo(
      () => formatPassengers(summary.adults, summary.children),
      [summary.adults, summary.children],
    );

    const passengerTotal = useMemo(() => {
      const total = summary.adults + summary.children;
      return `(${total} ${total === 1 ? 'Passenger' : 'Passengers'})`;
    }, [summary.adults, summary.children]);

    /* -------- Render -------- */

    return (
      <BottomSheetModal
        ref={internalRef}
        snapPoints={SNAP_POINTS}
        index={0}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheetBg}
        enablePanDownToClose
        // Keep the confirmation sheet at a single fixed height.
        // Dynamic sizing is intentionally disabled so dragging upward
        // cannot expand the sheet into a full-screen page. The single
        // snap point keeps the quotation screen visible behind it.
        enableDynamicSizing={false}
        enableOverDrag={false}
        onChange={handleSheetChange}
      >
        <BottomSheetView style={styles.content}>
          {/* ── Hero: green check tile + title/subtitle ── */}
          <View style={styles.hero}>
            <View style={styles.checkTile}>
              <Check size={26} color={Colors.textOnPrimary} strokeWidth={3} />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>
                {mode === 'accept'
                  ? 'Accept this quotation?'
                  : 'Confirm & Continue'}
              </Text>
              <Text style={styles.heroSubtitle}>
                {mode === 'accept'
                  ? "Please confirm that you've reviewed the quotation details before proceeding."
                  : 'Please review the details below before proceeding to booking.'}
              </Text>
            </View>
          </View>

          {/* ── Summary card ── *
           *
           * Green-tinted card with four rows. Each row is a
           * flex-row with the label group (icon + label) on the
           * left and the value on the right, right-aligned. Rows
           * with a secondary line (date range's duration,
           * passengers total) stack the sub-line under the value
           * with the same right-alignment. */}
          <View style={styles.summary}>
            <SummaryRow
              Icon={FileText}
              label="Quotation ID"
              value={summary.quotationNumber}
            />
            <SummaryRow Icon={MapPin} label="Trip" value={summary.trip} />
            <SummaryRow
              Icon={Calendar}
              label="Travel Date"
              value={dateRange}
              subValue={durationLabel}
            />
            <SummaryRow
              Icon={Users}
              label="Passengers"
              value={passengerLine}
              subValue={passengerTotal}
            />
            <SummaryRow
              Icon={IndianRupee}
              label="Total Amount"
              value={formatAmount(summary.amount)}
              valueEmphasis
            />
          </View>

          {/* ── Actions ── */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={dismiss}
              disabled={confirming}
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && !confirming && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={confirming}
              style={({ pressed }) => [
                styles.confirmBtn,
                pressed && !confirming && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                mode === 'accept'
                  ? 'Accept quotation and continue'
                  : `Pay ${formatAmount(
                      summary.amount,
                    )} and continue to booking`
              }
            >
              {confirming ? (
                <ActivityIndicator color={Colors.textOnPrimary} />
              ) : (
                <Text style={styles.confirmText}>
                  {mode === 'accept'
                    ? 'Accept & Continue'
                    : `Pay ${formatAmount(summary.amount)}`}
                </Text>
              )}
            </Pressable>
          </View>

          {/* ── Trust caption ── */}
          <View style={styles.trustRow}>
            <Lock size={12} color={Colors.textTertiary} strokeWidth={2} />
            <Text style={styles.trustText}>
              {mode === 'accept'
                ? 'You can continue to booking after accepting this quotation'
                : 'Your booking will be processed securely with Urban Cruise'}
            </Text>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

ContinueToBookingSheet.displayName = 'ContinueToBookingSheet';

/* ================================================================
 * SummaryRow — single row inside the tinted summary card. Kept
 *              as a small local component so the four call sites
 *              stay readable and consistent.
 * ================================================================ */

type SummaryIcon = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

const SummaryRow: React.FC<{
  Icon: SummaryIcon;
  label: string;
  value: string;
  /** Optional muted line rendered under the value (e.g. duration). */
  subValue?: string;
  /** Colour the value with the brand primary (used for Total). */
  valueEmphasis?: boolean;
}> = ({ Icon, label, value, subValue, valueEmphasis }) => (
  <View style={styles.summaryRow}>
    <View style={styles.summaryLeft}>
      <Icon size={16} color={Colors.textSecondary} strokeWidth={2} />
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
    <View style={styles.summaryRight}>
      <Text
        style={[styles.summaryValue, valueEmphasis && styles.summaryValueEmph]}
        numberOfLines={2}
      >
        {value}
      </Text>
      {subValue ? <Text style={styles.summarySub}>{subValue}</Text> : null}
    </View>
  </View>
);

/* ================================================================
 * Styles
 * ================================================================ */

const CHECK_TILE_SIZE = 56;

const styles = StyleSheet.create({
  handle: {
    backgroundColor: Colors.border,
    width: 44,
  },
  sheetBg: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },

  /* Hero */
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  checkTile: {
    width: CHECK_TILE_SIZE,
    height: CHECK_TILE_SIZE,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    /* Subtle outer tinted ring — done with a border-with-tint
       rather than a nested view so we don't add a second render
       layer for a 2dp decoration. */
    borderWidth: 4,
    borderColor: Colors.primaryTint,
    ...Shadows.xs,
  },
  heroText: {
    flex: 1,
    gap: Spacing.xs,
    marginTop: 4,
  },
  heroTitle: {
    ...Typography.h5,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  heroSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
    lineHeight: 20,
  },

  /* Summary card */
  summary: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryTint,
    gap: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    /* Prevent the label column from squeezing the value on very
       long values; the value column takes the flex remainder. */
    minWidth: 130,
  },
  summaryLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  summaryRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  summaryValue: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '800',
    textAlign: 'right',
  },
  summaryValueEmph: {
    ...Typography.subtitle,
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  summarySub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },

  /* Actions */
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  cancelText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '800',
  },
  confirmBtn: {
    flex: 1.5,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    ...Shadows.xs,
  },
  confirmText: {
    ...Typography.body,
    color: Colors.textOnPrimary,
    fontWeight: '800',
    letterSpacing: 0.2,
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

  pressed: {
    opacity: 0.9,
  },
});
