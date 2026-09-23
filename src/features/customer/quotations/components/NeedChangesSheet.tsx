/**
 * ------------------------------------------------------------------
 * NeedChangesSheet — "Request Changes" bottom sheet
 * ------------------------------------------------------------------
 * Opens from the "Need Changes" CTA on QuotationDetailScreen.
 * Lets the customer flag which parts of the quotation they'd like
 * revised (multi-select) and add free-text notes; the payload is
 * routed to their assigned travel executive.
 *
 * LAYOUT (top → bottom, inside the sheet):
 *
 *   ┌───────────────────────────────────  X (close) ┐
 *   │ Request Changes                              │
 *   │ Let us know what you'd like to change.       │
 *   │ Your request will be sent to your travel exec│
 *   └──────────────────────────────────────────────┘
 *
 *   ┌─ Your Travel Executive ────────────────────┐   (green-tint)
 *   │ [avatar]  Rahul Sharma                     │
 *   │           Travel Consultant                │
 *   │           📞 +91 98765 43210               │
 *   │           ● Usually replies within 5 mins  │
 *   └────────────────────────────────────────────┘
 *
 *   What would you like to change?
 *   [ 🚗  Vehicle              ○ ]
 *   [ ₹   Price                 ○ ]
 *   [ 📅  Travel Date          ○ ]
 *   [ 🕐  Pickup Time          ○ ]
 *   [ 🧭  Route                ○ ]
 *   [ 👥  Passenger Count      ○ ]
 *   [ 📍  Pickup / Drop Loc.   ○ ]
 *   [ 💬  Other                ○ ]
 *
 *   Additional Notes (Optional)
 *   ┌──────────────────────────────────────────┐
 *   │ Please describe the changes...           │
 *   │                                    0/500 │
 *   └──────────────────────────────────────────┘
 *
 *   ⓘ Our executive will review your request and
 *     share an updated quotation.
 *
 *   [ 🛩 Submit Request ]  (green)
 *   [    Cancel        ]  (link)
 *
 * ------------------------------------------------------------------
 * PATTERNS FOLLOWED (from CustomerFilterSheet + CustomerContactSheet)
 * ------------------------------------------------------------------
 *   - `forwardRef<BottomSheetModal, Props>` + `useImperativeHandle`
 *     so the parent presents/dismisses imperatively via a ref.
 *   - `BottomSheetBackdrop` w/ `pressBehavior="close"` and opacity
 *     0.55 (matches other sheets in the app for consistency).
 *   - `handleIndicatorStyle` + `backgroundStyle` = the rounded top
 *     bar all sheets share.
 *   - `BottomSheetScrollView` for content that might overflow when
 *     the keyboard opens over the notes field. Uses
 *     `BottomSheetTextInput` — the vendored TextInput wrapper —
 *     which tells the sheet library about focus so it slides the
 *     content up correctly rather than letting the keyboard cover
 *     the input.
 *   - Local DRAFT state: `selected` (Set) + `notes` (string) live
 *     inside the sheet and are reset on submit / dismiss. The
 *     parent never sees intermediate keystrokes — only the final
 *     payload via `onSubmit`.
 *
 * ------------------------------------------------------------------
 * SUBMISSION FLOW
 * ------------------------------------------------------------------
 *   canSubmit = at least one category is selected OR notes has
 *   non-whitespace content. The "Other"-only case additionally
 *   requires notes (product rule: if the customer can't tell us
 *   which pre-defined slot fits, they must describe it).
 *
 *   On submit:
 *     1. Sheet transitions its primary button to a loading state.
 *     2. `onSubmit(payload)` is invoked and awaited.
 *     3. On success → success toast + reset draft + dismiss sheet.
 *     4. On rejection → error toast; sheet stays open so the user
 *        can retry without re-selecting.
 *
 *   `onSubmit` is optional — if the parent doesn't supply it, the
 *   sheet still runs the happy-path (600ms mock delay) so demos
 *   feel real without wiring anything up.
 * ------------------------------------------------------------------
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import {
  Calendar,
  Car,
  Clock,
  IndianRupee,
  Info,
  MapPin,
  MessageCircle,
  Route,
  Send,
  Users,
  X,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { toast } from '@services/toast';

import { RequestSuccessModal } from './RequestSuccessModal';
import type {
  QuotationChangeCategory,
  QuotationChangeRequest,
  TravelExecutive,
} from '../types';

/* ================================================================
 * Props
 * ================================================================ */

type Props = {
  executive: TravelExecutive;
  /**
   * Called with the customer's change request payload when they
   * submit. Should return a promise that resolves on success or
   * rejects on failure — the sheet handles both cases (toast +
   * dismiss / toast + keep-open respectively). If omitted, the
   * sheet runs a 600ms mock so demos work end-to-end.
   */
  onSubmit?: (req: QuotationChangeRequest) => Promise<void>;
  /**
   * Called from the success modal's primary button ("Go to
   * Quotations"). Optional — when omitted alongside `onBackToHome`,
   * the success modal isn't shown at all and the sheet falls back
   * to its legacy toast-then-dismiss flow. Kept optional (rather
   * than required) so demos and one-off consumers work without
   * wiring both callbacks.
   */
  onGoToQuotations?: () => void;
  /**
   * Called from the success modal's secondary link ("Back to
   * Home"). Same optionality contract as `onGoToQuotations`.
   */
  onBackToHome?: () => void;
};

/* ================================================================
 * Constants
 * ================================================================ */

const SNAP_POINTS = ['92%'];

const NOTES_MAX_LENGTH = 500;

/**
 * Category option config — icon, label, and the discriminant value
 * emitted in the payload. Kept as a static array (rather than
 * mapping over a bare enum) so we can control label copy and icon
 * choice without extra plumbing.
 */
const CATEGORIES: readonly {
  key: QuotationChangeCategory;
  label: string;
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
}[] = [
  { key: 'vehicle', label: 'Vehicle', Icon: Car },
  { key: 'price', label: 'Price', Icon: IndianRupee },
  { key: 'travel_date', label: 'Travel Date', Icon: Calendar },
  { key: 'pickup_time', label: 'Pickup Time', Icon: Clock },
  { key: 'route', label: 'Route', Icon: Route },
  { key: 'passenger_count', label: 'Passenger Count', Icon: Users },
  {
    key: 'pickup_drop_location',
    label: 'Pickup / Drop Location',
    Icon: MapPin,
  },
  { key: 'other', label: 'Other', Icon: MessageCircle },
];

/* ================================================================
 * Helpers
 * ================================================================ */

/* ================================================================
 * Component
 * ================================================================ */

export const NeedChangesSheet = forwardRef<BottomSheetModal, Props>(
  ({ executive, onSubmit, onGoToQuotations, onBackToHome }, ref) => {
    /* Two refs: `internalRef` drives the sheet itself; the outer
       ref exposed to the parent is bridged via useImperativeHandle
       so callers can call `.present()` / `.dismiss()` idiomatically.
       Matches the pattern in CustomerFilterSheet. */
    const internalRef = useRef<BottomSheetModal>(null);
    useImperativeHandle(ref, () => internalRef.current as BottomSheetModal, []);

    /* -------- Draft state (reset on dismiss) -------- */
    const [selected, setSelected] = useState<Set<QuotationChangeCategory>>(
      () => new Set(),
    );
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    /* Success-modal visibility. The modal renders OVER the sheet
       (native RN <Modal> so it wins over @gorhom's portal) until
       the user picks Go to Quotations / Back to Home or dismisses
       it, at which point we also close the sheet underneath. Kept
       local state (not a prop) so a stale visible=true can't leak
       into a fresh open of the sheet. */
    const [successVisible, setSuccessVisible] = useState(false);

    /* Whether the success modal is even wired up. Callers who don't
       provide both nav callbacks fall back to the legacy toast-and-
       dismiss path — safer default for demos and any future consumer
       that hasn't been updated. */
    const useSuccessModal = Boolean(onGoToQuotations) && Boolean(onBackToHome);

    const notesTrimmed = notes.trim();
    const hasSelection = selected.size > 0;
    const otherSelectedAlone =
      selected.size === 1 && selected.has('other') && notesTrimmed.length === 0;

    /* Product rule: if the ONLY selected category is "Other", we
       need notes so ops has something to work with. Otherwise:
       any selection OR any notes is enough to submit. */
    const canSubmit =
      !submitting &&
      (hasSelection || notesTrimmed.length > 0) &&
      !otherSelectedAlone;

    /* -------- Handlers -------- */

    const resetDraft = useCallback(() => {
      setSelected(new Set());
      setNotes('');
    }, []);

    const dismiss = useCallback(() => {
      internalRef.current?.dismiss();
    }, []);

    /**
     * `handleSheetChange` fires whenever the sheet's index moves.
     * We reset the draft on close (index -1) so the next open is
     * fresh. Avoids the "why is my last request still in the form"
     * confusion when a user opens the sheet twice. Also mirrors the
     * open/closed state into `isOpenRef` for the hardware-back
     * handler below — a ref, not state, so it doesn't re-render on
     * every animation frame.
     */
    const isOpenRef = useRef(false);

    const handleSheetChange = useCallback(
      (index: number) => {
        isOpenRef.current = index >= 0;
        if (index === -1) resetDraft();
      },
      [resetDraft],
    );

    /* -------- Hardware back (Android) -------- *
     *
     * `BottomSheetModalProvider` is mounted above `NavigationContainer`
     * in App.tsx, so this sheet renders into a portal outside the
     * navigator's screen tree. Without this listener, Android's back
     * press falls through to the navigator's default handling (pop the
     * focused screen) while the sheet just keeps floating on top of
     * whatever screen ends up focused. While the sheet is open, this
     * swallows the back press entirely — no dismiss, no navigation —
     * so closing stays explicit (× icon / Cancel / backdrop / swipe). */
    useEffect(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          if (isOpenRef.current) return true;
          return false;
        },
      );
      return () => subscription.remove();
    }, []);

    const toggleCategory = useCallback((key: QuotationChangeCategory) => {
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    }, []);

    const handleSubmit = useCallback(async () => {
      if (!canSubmit) return;

      const payload: QuotationChangeRequest = {
        categories: Array.from(selected),
        notes: notesTrimmed,
      };

      setSubmitting(true);
      try {
        if (onSubmit) {
          await onSubmit(payload);
        } else {
          /* Mock delay so the loading state is visible during the
             demo. Real backend swap-in happens at the call site. */
          await new Promise(resolve => setTimeout(resolve, 600));
        }
        if (useSuccessModal) {
          /* Modal path: keep the sheet mounted underneath so the
             success surface animates in on top of the completed
             form. resetDraft/dismiss happen when the modal closes
             (below), so a fast tap on "Go to Quotations" still tears
             down the sheet in the right order. */
          setSuccessVisible(true);
        } else {
          /* Legacy path — no callbacks wired; fall back to the
             toast + immediate dismiss. */
          toast.success('Request sent', {
            description: `${executive.name} will get back to you shortly.`,
          });
          resetDraft();
          dismiss();
        }
      } catch {
        toast.error('Could not send request', {
          description: 'Please try again in a moment.',
        });
      } finally {
        setSubmitting(false);
      }
    }, [
      canSubmit,
      selected,
      notesTrimmed,
      onSubmit,
      useSuccessModal,
      executive.name,
      resetDraft,
      dismiss,
    ]);

    /**
     * Success-modal exit handlers. All three (primary / secondary /
     * close) share the same sheet-teardown sequence: close the
     * modal, reset the draft, dismiss the sheet, then run whatever
     * navigation the caller passed. Doing the teardown first
     * matches the pattern in ContinueToBookingSheet — destination
     * screens don't want a lingering sheet under them, and running
     * navigate synchronously after dismiss() keeps the frame
     * timing tight.
     */
    const closeSuccessAnd = useCallback(
      (after?: () => void) => {
        setSuccessVisible(false);
        resetDraft();
        internalRef.current?.dismiss();
        after?.();
      },
      [resetDraft],
    );

    const handleSuccessGoToQuotations = useCallback(() => {
      closeSuccessAnd(onGoToQuotations);
    }, [closeSuccessAnd, onGoToQuotations]);

    const handleSuccessBackToHome = useCallback(() => {
      closeSuccessAnd(onBackToHome);
    }, [closeSuccessAnd, onBackToHome]);

    const handleSuccessClose = useCallback(() => {
      closeSuccessAnd();
    }, [closeSuccessAnd]);

    /* -------- Sub-renders -------- */

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

    return (
      <>
        <BottomSheetModal
          ref={internalRef}
          snapPoints={SNAP_POINTS}
          index={0}
          backdropComponent={renderBackdrop}
          handleIndicatorStyle={styles.handle}
          backgroundStyle={styles.sheetBg}
          enablePanDownToClose
          enableDynamicSizing={false}
          enableOverDrag={false}
          keyboardBehavior={Platform.OS === 'ios' ? 'extend' : 'interactive'}
          keyboardBlurBehavior="restore"
          onChange={handleSheetChange}
        >
          {/* Pinned header (X button lives here so it doesn't scroll away) */}
          <View style={styles.pinnedHeader}>
            <View style={styles.titleRow}>
              <View style={styles.titleTextCol}>
                <Text style={styles.title}>Request Changes</Text>
              </View>
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
            <Text style={styles.subtitle}>
              Let us know what you would like to change.
              {'\n'}Your request will be sent to your travel executive.
            </Text>
          </View>

          <BottomSheetScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Category picker ── */}
            <Text style={styles.sectionLabel}>
              What would you like to change?
            </Text>
            <View style={styles.categoryList}>
              {CATEGORIES.map(cat => (
                <CategoryRow
                  key={cat.key}
                  label={cat.label}
                  Icon={cat.Icon}
                  selected={selected.has(cat.key)}
                  onPress={() => toggleCategory(cat.key)}
                />
              ))}
            </View>

            {/* ── Notes ── */}
            <View style={styles.notesLabelRow}>
              <Text style={styles.sectionLabel}>Additional Notes</Text>
              <Text style={styles.notesOptional}>(Optional)</Text>
            </View>
            <View style={styles.notesWrap}>
              <BottomSheetTextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Please describe the changes you are looking for..."
                placeholderTextColor={Colors.textTertiary}
                multiline
                maxLength={NOTES_MAX_LENGTH}
                textAlignVertical="top"
                scrollEnabled
              />
              <Text
                style={[
                  styles.notesCounter,
                  notes.length >= NOTES_MAX_LENGTH && styles.notesCounterMax,
                ]}
              >
                {notes.length}/{NOTES_MAX_LENGTH}
              </Text>
            </View>

            {/* Only surface the "Other needs notes" hint when the
              customer has tripped that rule — showing it eagerly
              feels nagging. */}
            {otherSelectedAlone ? (
              <Text style={styles.hintText}>
                Please describe your request in the notes so we can help.
              </Text>
            ) : null}

            {/* ── Info banner ── */}
            <View style={styles.infoBanner}>
              <Info size={14} color={Colors.primary} strokeWidth={2.25} />
              <Text style={styles.infoText}>
                Our executive will review your request and share an updated
                quotation.
              </Text>
            </View>

            {/* ── Actions ── */}
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.submitBtn,
                !canSubmit && styles.submitBtnDisabled,
                pressed && canSubmit && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Submit change request"
              accessibilityState={{ disabled: !canSubmit }}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.textOnPrimary} />
              ) : (
                <>
                  <Send
                    size={18}
                    color={Colors.textOnPrimary}
                    strokeWidth={2.25}
                  />
                  <Text style={styles.submitText}>Submit Request</Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={dismiss}
              disabled={submitting}
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancel and close"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </BottomSheetScrollView>
        </BottomSheetModal>

        <RequestSuccessModal
          visible={successVisible}
          primaryLabel="Go to Quotations"
          onClose={handleSuccessClose}
          onPrimary={handleSuccessGoToQuotations}
          onSecondary={handleSuccessBackToHome}
        />
      </>
    );
  },
);

NeedChangesSheet.displayName = 'NeedChangesSheet';

/* ================================================================
 * Sub-components
 * ================================================================ */

const CategoryRow: React.FC<{
  label: string;
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  selected: boolean;
  onPress: () => void;
}> = ({ label, Icon, selected, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryRow,
        selected && styles.categoryRowSelected,
        pressed && styles.pressed,
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
    >
      <View style={styles.categoryIconWrap}>
        <Icon size={18} color={Colors.primary} strokeWidth={2} />
      </View>
      <Text style={styles.categoryLabel}>{label}</Text>
      <View style={[styles.radioOuter, selected && styles.radioOuterOn]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
    </Pressable>
  );
};

/* ================================================================
 * Styles
 * ================================================================ */

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

  /* Pinned header (outside ScrollView) */
  pinnedHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  titleTextCol: {
    flex: 1,
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Scroll */
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxxl,
  },

  /* Section header */
  sectionLabel: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '800',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  /* Category rows */
  categoryList: {
    gap: Spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  categoryRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryTint,
  },
  categoryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },

  /* Radio */
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: Radius.circle,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  radioOuterOn: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primary,
  },

  /* Notes */
  notesLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  notesOptional: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  notesWrap: {
    position: 'relative',
  },
  notesInput: {
    ...Typography.body,
    color: Colors.textPrimary,
    minHeight: 110,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  notesCounter: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.sm,
    ...Typography.caption,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  notesCounterMax: {
    color: Colors.error,
    fontWeight: '700',
  },

  hintText: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },

  /* Info banner */
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryTint,
  },
  infoText: {
    ...Typography.bodySmall,
    color: Colors.primaryDark,
    fontWeight: '500',
    flex: 1,
  },

  /* Actions */
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 52,
    marginTop: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    ...Shadows.xs,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.buttonDisabled,
  },
  submitText: {
    ...Typography.body,
    color: Colors.textOnPrimary,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cancelBtn: {
    alignSelf: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  cancelText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.85,
  },
});
