/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * GiveFeedbackScreen — STACK SCREEN (booking-scoped)
 * ------------------------------------------------------------------
 * Route: `Feedback` under CustomerStackParamList, param `{ bookingId }`.
 *
 * TWO ENTRY POINTS:
 *   1. BookingDetailScreen → "Give Feedback" CTA (post-trip prompt).
 *   2. CustomerFeedbackScreen → per-row "Give Feedback" on the
 *      "Select a Booking" list.
 *
 * WHY A SEPARATE SCREEN (not a bottom sheet or inline block):
 *   The form is keyboard-heavy (three star rows + 8-chip grid +
 *   textarea + submit). A sheet fights the soft keyboard on Android
 *   and gives up half its height to the drag handle + backdrop; a
 *   full screen keeps the header visible, lets the KeyboardAware
 *   scroller do its job, and matches the app's existing
 *   screen-per-detail convention (BookingDetail, QuotationDetail,
 *   RequestQuotation).
 *
 * FORM MODEL:
 *   react-hook-form + zod, same shape as LoginScreen. `mode: 'onChange'`
 *   so the CTA reflects validity live without a "submit-to-see-errors"
 *   round-trip. The zod schema is the SSoT for the payload — the
 *   mutation hook accepts already-validated inputs.
 *
 * IDEMPOTENCY:
 *   One key per submit tap, minted on tap (not on hook init) so a
 *   tap-fail-retap sequence gets a fresh key and can actually try
 *   again. See idempotency.ts header. On retry-inside-a-tap
 *   (network glitch → user hits Retry in the toast), the SAME key
 *   is reused via `pendingKeyRef` so we don't accidentally double-
 *   submit through the server's dedupe window.
 *
 * ERROR HANDLING (paired with useSubmitFeedback's error surface):
 *   - conflict → success-style navigation: the feedback exists,
 *     the user's intent is satisfied. We show an info toast and
 *     pop back — retrying would fail identically.
 *   - notFound → hard fail toast + pop. The trip is no longer
 *     eligible; the form has nowhere to go.
 *   - network / timeout → warning toast with a Retry action.
 *   - anything else → generic error toast; user can tap Submit again.
 *
 * INVALID BOOKINGID:
 *   Reached via a stale deeplink or a bug. We render an inline
 *   empty state ("This trip is no longer available for feedback")
 *   with a back button — we do NOT auto-pop, because a pop with no
 *   context feels like a crash. When the /eligible endpoint ships,
 *   this path also handles "trip exists but grace window expired".
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { z } from 'zod';
import {
  Armchair,
  ArrowRight,
  Calendar,
  Car,
  Check,
  Clock,
  Headphones,
  IndianRupee,
  MessageSquare,
  ShieldCheck,
  Smile,
  User,
  type LucideIcon,
} from 'lucide-react-native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { toast } from '@services/toast';
import { logEvent } from '@services/telemetry/logEvent';
import { ApiError } from '@api/errors';
import { newIdempotencyKey } from '@api/idempotency';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import type { CustomerStackParamList } from '@navigation/types';

import type { LikeTag } from '../types';
import { getMockCompletedBookingById } from '../mocks';
import { StarRating } from '../components/StarRating';
import { useSubmitFeedback } from '../hooks';

/* ================================================================
 * Config
 * ================================================================ */

const COMMENT_MAX = 500;

/* ================================================================
 * Schema (react-hook-form + zod)
 *
 * Kept above the component so the resolver is a stable identity.
 * The union of `LikeTag` values is echoed here so the schema itself
 * rejects an unknown tag (belt-and-braces with the button set).
 * ================================================================ */

const LIKE_TAGS: readonly [LikeTag, ...LikeTag[]] = [
  'driver_behaviour',
  'vehicle_cleanliness',
  'comfortable_ride',
  'ontime_pickup',
  'value_for_money',
  'safe_driving',
  'executive_support',
  'booking_experience',
];

const ratingStar = z
  .number()
  .int('Pick a whole-star rating')
  .min(1, 'Please rate this')
  .max(5);

const feedbackSchema = z.object({
  ratings: z.object({
    overall: ratingStar,
    executive: ratingStar,
    driver: ratingStar,
  }),
  tags: z.array(z.enum(LIKE_TAGS)).max(LIKE_TAGS.length),
  comment: z
    .string()
    .max(COMMENT_MAX, `Please keep your note under ${COMMENT_MAX} characters`),
});
type FeedbackForm = z.infer<typeof feedbackSchema>;

/**
 * Custom Resolver matches the LoginScreen pattern (safeParse →
 * per-field errors). Kept explicit rather than pulling in
 * @hookform/resolvers so bundle + code paths stay identical across
 * the app.
 */
const feedbackResolver: Resolver<FeedbackForm> = async values => {
  const result = feedbackSchema.safeParse(values);
  if (result.success) {
    return { values: result.data, errors: {} };
  }
  const fieldErrors: Record<string, { type: string; message: string }> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!fieldErrors[key]) {
      fieldErrors[key] = { type: 'validation', message: issue.message };
    }
  }
  return { values: {} as FeedbackForm, errors: fieldErrors as never };
};

/* ================================================================
 * UI metadata
 *
 * Static — feature code never composes these dynamically. Kept at
 * module scope so nothing rebuilds them on re-render.
 * ================================================================ */

type RatingCategoryKey = 'overall' | 'executive' | 'driver';

const RATING_ROWS: readonly {
  key: RatingCategoryKey;
  title: string;
  subtitle: string;
  icon: LucideIcon;
}[] = [
  {
    key: 'overall',
    title: 'Overall Experience',
    subtitle: 'Your overall trip experience',
    icon: Smile,
  },
  {
    key: 'executive',
    title: 'Travel Executive',
    subtitle: 'Support & assistance from our executive',
    icon: Headphones,
  },
  {
    key: 'driver',
    title: 'Driver',
    subtitle: 'Driving, behaviour & professionalism',
    icon: Car,
  },
];

const TAG_OPTIONS: readonly {
  key: LikeTag;
  label: string;
  icon: LucideIcon;
}[] = [
  { key: 'driver_behaviour', label: 'Driver Behaviour', icon: User },
  { key: 'vehicle_cleanliness', label: 'Vehicle Cleanliness', icon: Car },
  { key: 'comfortable_ride', label: 'Comfortable Ride', icon: Armchair },
  { key: 'ontime_pickup', label: 'On-Time Pickup', icon: Clock },
  { key: 'value_for_money', label: 'Value for Money', icon: IndianRupee },
  { key: 'safe_driving', label: 'Safe Driving', icon: ShieldCheck },
  { key: 'executive_support', label: 'Executive Support', icon: Headphones },
  { key: 'booking_experience', label: 'Booking Experience', icon: Calendar },
];

/**
 * Convert an integer star rating to the word shown under the stars
 * in the Rate Your Experience card. Returns null for 0 so the label
 * slot collapses when the row hasn't been touched yet.
 */
function ratingLabel(n: number): string | null {
  switch (n) {
    case 1:
      return 'Poor';
    case 2:
      return 'Fair';
    case 3:
      return 'Good';
    case 4:
      return 'Very Good';
    case 5:
      return 'Excellent';
    default:
      return null;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/* ================================================================
 * Types
 * ================================================================ */

type FeedbackRoute = RouteProp<CustomerStackParamList, 'Feedback'>;
type FeedbackNavProp = NativeStackNavigationProp<
  CustomerStackParamList,
  'Feedback'
>;

/* ================================================================
 * Screen
 * ================================================================ */

const GiveFeedbackScreen: React.FC = () => {
  const navigation = useNavigation<FeedbackNavProp>();
  const route = useRoute<FeedbackRoute>();
  const { bookingId } = route.params;

  const booking = useMemo(
    () => getMockCompletedBookingById(bookingId),
    [bookingId],
  );

  const { submitFeedback, isPending } = useSubmitFeedback();

  /**
   * The idempotency key survives across intra-tap retries (a network
   * blip triggers TanStack's own retry; a user tap on the "Retry"
   * toast action triggers a manual retry). A fresh Submit tap after
   * a hard fail generates a new key — otherwise the server dedupe
   * would refuse the second attempt as a replay.
   */
  const pendingKeyRef = useRef<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid },
  } = useForm<FeedbackForm>({
    mode: 'onChange',
    defaultValues: {
      ratings: { overall: 0, executive: 0, driver: 0 },
      tags: [],
      comment: '',
    },
    resolver: feedbackResolver,
  });

  /**
   * Fires ONCE per mount to record the funnel-start event. Doing
   * this in an effect keeps the reducer out of render, and the
   * bookingId dep is stable — a fresh screen instance means a
   * fresh event.
   */
  const startedRef = useRef(false);
  React.useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    logEvent('customer.feedback_started', { bookingId });
  }, [bookingId]);

  /* Character count is derived from a live watch. Cheap — the
   * textarea is capped at 500, so this re-render is bounded. */
  const commentLength = watch('comment').length;

  /* -------- Submit -------- */

  const doSubmit = useCallback(
    async (values: FeedbackForm, idempotencyKey: string) => {
      try {
        await submitFeedback({
          bookingId,
          ratings: values.ratings,
          tags: values.tags,
          comment: values.comment.trim(),
          idempotencyKey,
        });
        // Clear the pending key — this tap is over. A subsequent
        // Submit (post-navigation, e.g. re-mount) will mint a fresh one.
        pendingKeyRef.current = null;
        toast.success('Thanks — your feedback was recorded.');
        navigation.goBack();
      } catch (err) {
        if (!(err instanceof ApiError)) {
          toast.error('Something went wrong. Please try again.');
          return;
        }

        switch (err.kind) {
          case 'conflict':
            // Feedback already exists for this booking — user intent
            // is effectively satisfied. Info toast + pop is friendlier
            // than an error dialog they can't act on.
            pendingKeyRef.current = null;
            toast.info(
              err.code === 'feedback_exists'
                ? 'Feedback for this trip was already submitted.'
                : err.message,
            );
            navigation.goBack();
            break;

          case 'notFound':
            pendingKeyRef.current = null;
            toast.error('This trip is no longer available for feedback.');
            navigation.goBack();
            break;

          case 'validation':
            // Server-side validation failure — should be unreachable
            // if the zod schema is in sync, but the server is
            // authoritative. Keep the key so a "Retry" after a fix
            // reuses it.
            toast.error(err.message);
            break;

          case 'network':
          case 'timeout':
            // Transient. Offer a retry that REUSES the same key so
            // the server's idempotency window catches it if the
            // first request actually landed.
            toast.warning('Network issue. Check your connection.', {
              action: {
                label: 'Retry',
                onPress: () => {
                  const keptKey = pendingKeyRef.current;
                  if (!keptKey) return;
                  void doSubmit(values, keptKey);
                },
              },
            });
            break;

          default:
            toast.error(
              err.message || 'Something went wrong. Please try again.',
            );
        }
      }
    },
    [bookingId, navigation, submitFeedback],
  );

  const onSubmit = useMemo(
    () =>
      handleSubmit(async values => {
        if (isPending) return;
        // Fresh tap → fresh key. Any retry inside this tap reuses it.
        const key = newIdempotencyKey();
        pendingKeyRef.current = key;
        await doSubmit(values, key);
      }),
    [handleSubmit, isPending, doSubmit],
  );

  /* -------- Invalid / expired bookingId -------- */

  if (!booking) {
    return (
      <SafeScreen edges={['top']} backgroundColor={Colors.background}>
        <View style={styles.headerWrap}>
          <ScreenHeader title="Feedback" onBack={() => navigation.goBack()} />
        </View>
        <View style={styles.notFoundBody}>
          <Text style={styles.notFoundTitle}>Trip not found</Text>
          <Text style={styles.notFoundSubtitle}>
            This trip is no longer available for feedback. If you think this is
            a mistake, please contact support.
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

  /* -------- Render -------- */

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Give Feedback"
          subtitle="Tell us about your experience"
          onBack={() => navigation.goBack()}
        />
      </View>

      {/*
        KeyboardAwareScrollView (react-native-keyboard-controller)
        auto-scrolls the focused input into view when the software
        keyboard opens. Without it, the "Tell us more" textarea sits
        behind the keyboard on both platforms and the user types blind.

        `bottomOffset` reserves clearance so the focused input's caret
        is not flush against the keyboard top; matches the value used
        by CustomerFeedbackScreen and RequestQuotationScreen — same
        textarea-above-CTA layout everywhere.
      */}
      <KeyboardAwareScrollView
        style={styles.scrollBg}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={120}
      >
        {/* Info banner — kept for visual continuity with the tab hub. */}
        <View style={styles.infoBanner}>
          <View style={styles.infoBannerIcon}>
            <MessageSquare size={22} color={Colors.primary} strokeWidth={2} />
          </View>
          <View style={styles.infoBannerText}>
            <Text style={styles.infoBannerTitle}>
              Your feedback helps us improve
            </Text>
            <Text style={styles.infoBannerBody}>
              Share your experience and help us serve you better.
            </Text>
          </View>
        </View>

        {/* Booking context card — permanent, no toggle. This is a
            booking-scoped screen; the trip is a fixed premise, not a
            choice. */}
        <View style={styles.rateSummaryCard}>
          <View style={styles.rateSummary}>
            <View style={styles.rateSummaryBody}>
              <View style={styles.routeRow}>
                <Text style={styles.routeText}>{booking.from}</Text>
                <ArrowRight
                  size={16}
                  color={Colors.textSecondary}
                  strokeWidth={2.5}
                />
                <Text style={styles.routeText}>{booking.to}</Text>
              </View>
              <View style={styles.summaryMetaLine}>
                <Calendar
                  size={12}
                  color={Colors.textSecondary}
                  strokeWidth={2}
                />
                <Text style={styles.summaryMeta}>
                  {formatDate(booking.travelDate)} · {booking.passengers}{' '}
                  Passengers
                </Text>
              </View>
              <Text style={styles.summaryMeta}>
                {booking.vehicleModel ?? booking.vehicleType}
                {booking.hasAC ? ' | AC' : ''}
              </Text>
            </View>
            <View style={styles.completedPillOnRate}>
              <Text style={styles.completedPillOnRateText}>Completed</Text>
            </View>
          </View>
        </View>

        {/* 1. Category ratings */}
        <Text style={styles.numberedSectionTitle}>
          1. How would you rate your experience?
        </Text>
        <Controller
          control={control}
          name="ratings"
          render={({ field }) => (
            <View style={styles.categoryCard}>
              {RATING_ROWS.map((row, idx) => {
                const value = field.value[row.key];
                const label = ratingLabel(value);
                const RowIcon = row.icon;
                return (
                  <View
                    key={row.key}
                    style={[
                      styles.categoryRow,
                      idx < RATING_ROWS.length - 1 && styles.categoryRowDivider,
                    ]}
                  >
                    <View style={styles.categoryIconPuck}>
                      <RowIcon
                        size={20}
                        color={Colors.primary}
                        strokeWidth={2}
                      />
                    </View>
                    <View style={styles.categoryText}>
                      <Text style={styles.categoryTitle}>{row.title}</Text>
                      <Text style={styles.categorySubtitle}>
                        {row.subtitle}
                      </Text>
                    </View>
                    <View style={styles.categoryStars}>
                      <StarRating
                        value={value}
                        onChange={n =>
                          field.onChange({ ...field.value, [row.key]: n })
                        }
                        size={20}
                        showLabel={false}
                        color={Colors.primary}
                      />
                      <Text
                        style={[
                          styles.categoryStarsLabel,
                          label ? styles.categoryStarsLabelActive : null,
                        ]}
                      >
                        {label ?? 'Tap to rate'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        />

        {/* 2. Tag chips */}
        <Text style={styles.numberedSectionTitle}>
          2. What did we do well?{' '}
          <Text style={styles.numberedSectionHint}>
            (Select all that apply)
          </Text>
        </Text>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => {
            const selected = new Set(field.value);
            const toggle = (t: LikeTag) => {
              const next = new Set(selected);
              if (next.has(t)) next.delete(t);
              else next.add(t);
              // Preserve TAG_OPTIONS order in the array so the wire
              // payload is stable across re-selections.
              field.onChange(
                TAG_OPTIONS.filter(o => next.has(o.key)).map(o => o.key),
              );
            };
            return (
              <View style={styles.tagGrid}>
                {TAG_OPTIONS.map(opt => {
                  const active = selected.has(opt.key);
                  const TagIcon = opt.icon;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => toggle(opt.key)}
                      style={({ pressed }) => [
                        styles.tagGridItem,
                        active && styles.tagGridItemActive,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <TagIcon
                        size={16}
                        color={active ? Colors.primary : Colors.textSecondary}
                        strokeWidth={2}
                      />
                      <Text
                        style={[
                          styles.tagGridLabel,
                          active && styles.tagGridLabelActive,
                        ]}
                        numberOfLines={1}
                      >
                        {opt.label}
                      </Text>
                      {active ? (
                        <View style={styles.tagGridCheck}>
                          <Check
                            size={10}
                            color={Colors.textOnPrimary}
                            strokeWidth={3}
                          />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            );
          }}
        />

        {/* 3. Comment */}
        <Text style={styles.numberedSectionTitle}>
          3. Tell us more{' '}
          <Text style={styles.numberedSectionHint}>(Optional)</Text>
        </Text>
        <Controller
          control={control}
          name="comment"
          render={({ field }) => (
            <View style={styles.textareaWrap}>
              <TextInput
                value={field.value}
                onChangeText={t => field.onChange(t.slice(0, COMMENT_MAX))}
                onBlur={field.onBlur}
                placeholder="Share your experience, suggestions or anything we can improve..."
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={styles.textarea}
                maxLength={COMMENT_MAX}
                editable={!isPending}
              />
              <Text style={styles.charCount}>
                {commentLength}/{COMMENT_MAX}
              </Text>
            </View>
          )}
        />

        {/* Submit */}
        <Pressable
          onPress={onSubmit}
          disabled={!isValid || isPending}
          style={({ pressed }) => [
            styles.submitBtn,
            (!isValid || isPending) && styles.submitBtnDisabled,
            pressed && isValid && !isPending && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Submit feedback"
          accessibilityState={{ disabled: !isValid || isPending }}
        >
          {isPending ? (
            <ActivityIndicator color={Colors.textOnPrimary} />
          ) : (
            <Text style={styles.submitBtnText}>Submit Feedback</Text>
          )}
        </Pressable>
      </KeyboardAwareScrollView>
    </SafeScreen>
  );
};

export default GiveFeedbackScreen;

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },

  /* Scroll */
  scrollBg: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.section,
    gap: Spacing.lg,
  },

  /* Info banner */
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryTint,
  },
  infoBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.circle,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBannerText: {
    flex: 1,
    gap: 2,
  },
  infoBannerTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  infoBannerBody: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  /* Booking-context card above the numbered rate sections */
  rateSummaryCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  rateSummary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  rateSummaryBody: {
    flex: 1,
    gap: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeText: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  summaryMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  summaryMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    includeFontPadding: false,
  },
  completedPillOnRate: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryTint,
  },
  completedPillOnRateText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    includeFontPadding: false,
  },

  /* Numbered section headers (1. / 2. / 3.) */
  numberedSectionTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  numberedSectionHint: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  /* Category rating card (3 rows: overall / executive / driver) */
  categoryCard: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    ...Shadows.xs,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  categoryRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  categoryIconPuck: {
    width: 40,
    height: 40,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    flex: 1,
    gap: 2,
  },
  categoryTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  categorySubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  categoryStars: {
    alignItems: 'flex-end',
    gap: Spacing.xxs,
  },
  categoryStarsLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontWeight: '600',
    includeFontPadding: false,
  },
  categoryStarsLabelActive: {
    color: Colors.primary,
  },

  /* Tag chip grid — 2 columns, icon left, check badge on active */
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.sm,
  },
  tagGridItem: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tagGridItemActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryTint,
  },
  tagGridLabel: {
    flex: 1,
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '600',
    includeFontPadding: false,
  },
  tagGridLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  tagGridCheck: {
    width: 16,
    height: 16,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Textarea */
  textareaWrap: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    gap: Spacing.xs,
  },
  textarea: {
    ...Typography.body,
    color: Colors.textPrimary,
    padding: 0,
    minHeight: 84,
    includeFontPadding: false,
  },
  charCount: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'right',
  },

  /* Submit */
  submitBtn: {
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    ...Shadows.sm,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.buttonDisabled,
  },
  submitBtnText: {
    ...Typography.button,
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },

  /* Not-found / expired body */
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
  secondaryBtn: {
    marginTop: Spacing.md,
    height: 48,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    ...Typography.button,
    color: Colors.primary,
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.85,
  },
});
