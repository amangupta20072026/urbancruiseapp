/**
 * ------------------------------------------------------------------
 * CustomerFeedbackScreen — STACK SCREEN
 * ------------------------------------------------------------------
 * Pushed from the Customer More sheet's "Feedback" tile. General
 * feedback surface — not booking-scoped. (The auto-launched
 * post-trip flow lives at the `Feedback` route in the navigator
 * and is scoped to one bookingId.)
 *
 * TWO TABS:
 *   Give Feedback (default)
 *     [info banner]
 *     [Select a Booking — list of completed trips]
 *     [Rate Your Experience — three numbered sub-sections, only
 *       visible once a booking is picked:
 *         1. How would you rate your experience?
 *            Three category rows (overall / executive / driver),
 *            each an interactive 5-star row with a live word label
 *            (Poor … Excellent).
 *         2. What did we do well? (Select all that apply)
 *            2-column icon-chip grid, multi-select.
 *         3. Tell us more (Optional)
 *            Textarea, 500-char cap, live counter.]
 *
 *   My Feedback
 *     [list of already-submitted feedback cards]
 *
 * INTERACTION:
 *   - Tapping "Give Feedback" on a booking-list card sets
 *     `selectedBookingId`; the card gets a green outline and the
 *     Rate section appears below.
 *   - Each category rating uses integer stars 0..5 (tap same star
 *     again to clear).
 *   - Tags are multi-select; selection is unordered.
 *   - Comment has a 500-char cap with a live counter.
 *   - Submit is disabled until ALL THREE category ratings are > 0
 *     — a missing dimension would leave analytics with a zero-star
 *     signal for that axis. On success, we reset local state and
 *     show a toast; the fixture is not updated (real submission will
 *     hit /customer/feedback).
 *
 * DATA:
 *   Local mocks in `../mocks.ts`. Swap for TanStack Query hooks
 *   when the endpoints ship.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
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
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

import type {
  FeedbackTab,
  LikeTag,
  RatingCategories,
  SubmittedFeedback,
} from '../types';
import { MOCK_COMPLETED_BOOKINGS, MOCK_SUBMITTED_FEEDBACK } from '../mocks';
import { BookingSelectCard } from '../components/BookingSelectCard';
import { StarRating } from '../components/StarRating';

const COMMENT_MAX = 500;

/**
 * The eight "what did we do well" chips, in the exact left-to-right,
 * top-to-bottom order the design mock uses. The grid is 2 columns so
 * pairs on the same row are (index 0,1), (2,3), (4,5), (6,7). Icons
 * are paired 1:1 with the label because the chip is only ever a fixed
 * option — feature code never composes chips dynamically here.
 */
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

/** Map of key → label for reverse lookup on the My Feedback tab. */
const TAG_LABELS: Record<LikeTag, string> = Object.fromEntries(
  TAG_OPTIONS.map(t => [t.key, t.label]),
) as Record<LikeTag, string>;

/**
 * The three category-rating rows shown inside the Rate Your Experience
 * card. Kept alongside TAG_OPTIONS as static UI metadata — the domain
 * shape (integer 1..5 per key) lives in `types.ts` as RatingCategories.
 */
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

/**
 * Convert an integer star rating to the word shown under the stars in
 * the Rate Your Experience card. Returns null for 0 so the label slot
 * collapses when the row hasn't been touched yet.
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
 * Screen
 * ================================================================ */

const CustomerFeedbackScreen: React.FC = () => {
  const navigation = useNavigation();

  const [tab, setTab] = useState<FeedbackTab>('give');

  /* -------- "Give Feedback" tab state -------- */
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null,
  );
  /**
   * The redesigned Rate Your Experience surface asks for THREE
   * independent star ratings (overall / executive / driver). Stored
   * as a single object so `onChangeRating` can update any key without
   * spawning three sibling `useState` calls.
   */
  const [ratings, setRatings] = useState<RatingCategories>({
    overall: 0,
    executive: 0,
    driver: 0,
  });
  const [tags, setTags] = useState<Set<LikeTag>>(new Set());
  const [comment, setComment] = useState('');

  const selectedBooking = useMemo(
    () => MOCK_COMPLETED_BOOKINGS.find(b => b.id === selectedBookingId) ?? null,
    [selectedBookingId],
  );

  /* -------- Handlers -------- */

  const resetForm = useCallback(() => {
    setRatings({ overall: 0, executive: 0, driver: 0 });
    setTags(new Set());
    setComment('');
  }, []);

  const onSelectBooking = useCallback(
    (id: string) => {
      setSelectedBookingId(id);
      // Reset form when switching bookings so ratings don't bleed
      // across trips.
      resetForm();
    },
    [resetForm],
  );

  const onChangeRating = useCallback(
    (key: keyof RatingCategories, next: number) => {
      setRatings(prev => ({ ...prev, [key]: next }));
    },
    [],
  );

  const onToggleTag = useCallback((tag: LikeTag) => {
    setTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  /**
   * All three category ratings must be set before the user can submit.
   * Matches the redesigned form where a missing dimension would leave
   * analytics with a zero-star signal for that axis.
   */
  const canSubmit =
    selectedBooking !== null &&
    ratings.overall > 0 &&
    ratings.executive > 0 &&
    ratings.driver > 0;

  const onSubmit = useCallback(() => {
    if (!canSubmit) return;
    // UI-only pass: no backend call. Reset the form + confirm.
    setSelectedBookingId(null);
    resetForm();
    toast.success('Thanks — your feedback was recorded.');
    setTab('my');
  }, [canSubmit, resetForm]);

  /* -------- Render -------- */

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Feedback"
          subtitle="Tell us about your experience"
          onBack={() => navigation.goBack()}
        />
      </View>

      {/* Two-tab segmented control. Solid-fill active variant, same
          visual family as the other list-screen chip strips. */}
      <View style={styles.tabsWrap}>
        <TabButton
          label="Give Feedback"
          active={tab === 'give'}
          onPress={() => setTab('give')}
        />
        <TabButton
          label="My Feedback"
          active={tab === 'my'}
          onPress={() => setTab('my')}
        />
      </View>

      {/*
        KeyboardAwareScrollView (react-native-keyboard-controller)
        auto-scrolls the focused input into view when the software
        keyboard opens. Without it, the "Tell us more" textarea —
        the last field before the Submit CTA — sits behind the
        keyboard on both platforms and the user types blind.

        `bottomOffset` reserves clearance so the focused input's
        caret is not flush against the keyboard top; matches the
        value used by RequestQuotationScreen, which has the same
        textarea-above-CTA layout. Requires <KeyboardProvider>
        higher in the tree — App.tsx mounts it.
      */}
      <KeyboardAwareScrollView
        style={styles.scrollBg}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={120}
      >
        {tab === 'give' ? (
          <GiveFeedbackTab
            selectedBookingId={selectedBookingId}
            onSelectBooking={onSelectBooking}
            selectedBooking={selectedBooking}
            ratings={ratings}
            onChangeRating={onChangeRating}
            tags={tags}
            onToggleTag={onToggleTag}
            comment={comment}
            setComment={setComment}
            canSubmit={canSubmit}
            onSubmit={onSubmit}
          />
        ) : (
          <MyFeedbackTab />
        )}
      </KeyboardAwareScrollView>
    </SafeScreen>
  );
};

export default CustomerFeedbackScreen;

/* ================================================================
 * Give Feedback tab body
 * ================================================================ */

const GiveFeedbackTab: React.FC<{
  selectedBookingId: string | null;
  onSelectBooking: (id: string) => void;
  selectedBooking: ReturnType<
    typeof MOCK_COMPLETED_BOOKINGS.find
  > extends infer T
    ? T | null
    : never;
  ratings: RatingCategories;
  onChangeRating: (key: keyof RatingCategories, next: number) => void;
  tags: Set<LikeTag>;
  onToggleTag: (t: LikeTag) => void;
  comment: string;
  setComment: (s: string) => void;
  canSubmit: boolean;
  onSubmit: () => void;
}> = ({
  selectedBookingId,
  onSelectBooking,
  selectedBooking,
  ratings,
  onChangeRating,
  tags,
  onToggleTag,
  comment,
  setComment,
  canSubmit,
  onSubmit,
}) => (
  <>
    {/* Info banner */}
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

    {/* Section 1 — Select a Booking */}
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Select a Booking</Text>
      <Text style={styles.sectionBody}>
        Choose a completed trip to give feedback
      </Text>
    </View>
    <View style={styles.list}>
      {MOCK_COMPLETED_BOOKINGS.map(item => (
        <BookingSelectCard
          key={item.id}
          item={item}
          selected={item.id === selectedBookingId}
          onSelect={() => onSelectBooking(item.id)}
        />
      ))}
    </View>

    {/*
      Section 2 — Rate Your Experience (only after selection).

      Redesigned surface. The old body was a single "Overall Rating"
      star row + a flat tag-chip strip + textarea. It's now three
      numbered sub-sections (1 / 2 / 3), each with its own card:

        1. How would you rate your experience?
           Three category rows (overall / executive / driver), each
           with an icon puck on the left, title + subtitle, and a
           right-aligned 5-star row with a live word label
           ("Poor" .. "Excellent") beneath.

        2. What did we do well? (Select all that apply)
           2-column chip grid with per-chip icon on the left and a
           checkmark badge on the right when active.

        3. Tell us more (Optional)
           Textarea, 500-char cap, live counter.

      The booking-summary card (route / date / vehicle / Completed
      pill) is retained above the numbered sections so the rater
      never loses context of which trip they're rating.
    */}
    {selectedBooking ? (
      <>
        {/* Booking context card */}
        <View style={styles.rateSummaryCard}>
          <View style={styles.rateSummary}>
            <View style={styles.rateSummaryBody}>
              <View style={styles.routeRow}>
                <Text style={styles.routeText}>{selectedBooking.from}</Text>
                <ArrowRight
                  size={16}
                  color={Colors.textSecondary}
                  strokeWidth={2.5}
                />
                <Text style={styles.routeText}>{selectedBooking.to}</Text>
              </View>
              <View style={styles.summaryMetaLine}>
                <Calendar
                  size={12}
                  color={Colors.textSecondary}
                  strokeWidth={2}
                />
                <Text style={styles.summaryMeta}>
                  {formatDate(selectedBooking.travelDate)} ·{' '}
                  {selectedBooking.passengers} Passengers
                </Text>
              </View>
              <Text style={styles.summaryMeta}>
                {selectedBooking.vehicleModel ?? selectedBooking.vehicleType}
                {selectedBooking.hasAC ? ' | AC' : ''}
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
        <View style={styles.categoryCard}>
          {RATING_ROWS.map((row, idx) => {
            const value = ratings[row.key];
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
                  <RowIcon size={20} color={Colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.categoryText}>
                  <Text style={styles.categoryTitle}>{row.title}</Text>
                  <Text style={styles.categorySubtitle}>{row.subtitle}</Text>
                </View>
                <View style={styles.categoryStars}>
                  <StarRating
                    value={value}
                    onChange={n => onChangeRating(row.key, n)}
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

        {/* 2. Tag chips */}
        <Text style={styles.numberedSectionTitle}>
          2. What did we do well?{' '}
          <Text style={styles.numberedSectionHint}>
            (Select all that apply)
          </Text>
        </Text>
        <View style={styles.tagGrid}>
          {TAG_OPTIONS.map(opt => {
            const active = tags.has(opt.key);
            const TagIcon = opt.icon;
            return (
              <Pressable
                key={opt.key}
                onPress={() => onToggleTag(opt.key)}
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

        {/* 3. Comment */}
        <Text style={styles.numberedSectionTitle}>
          3. Tell us more (Optional)
        </Text>
        <View style={styles.textareaWrap}>
          <TextInput
            value={comment}
            onChangeText={t => setComment(t.slice(0, COMMENT_MAX))}
            placeholder="Share your experience, suggestions or anything we can improve..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={styles.textarea}
            maxLength={COMMENT_MAX}
          />
          <Text style={styles.charCount}>
            {comment.length}/{COMMENT_MAX}
          </Text>
        </View>

        {/* Submit */}
        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.submitBtn,
            !canSubmit && styles.submitBtnDisabled,
            pressed && canSubmit && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Submit feedback"
        >
          <Text style={styles.submitBtnText}>Submit Feedback</Text>
        </Pressable>
      </>
    ) : null}
  </>
);

/* ================================================================
 * My Feedback tab body
 * ================================================================ */

const MyFeedbackTab: React.FC = () => {
  const items = MOCK_SUBMITTED_FEEDBACK;
  if (items.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No feedback yet</Text>
        <Text style={styles.emptySubtitle}>
          Feedback you submit will show up here.
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.list}>
      {items.map(fb => (
        <MyFeedbackCard key={fb.id} item={fb} />
      ))}
    </View>
  );
};

const MyFeedbackCard: React.FC<{ item: SubmittedFeedback }> = ({ item }) => (
  <View style={styles.myCard}>
    <View style={styles.routeRow}>
      <Text style={styles.routeText}>{item.bookingFrom}</Text>
      <ArrowRight size={16} color={Colors.textSecondary} strokeWidth={2.5} />
      <Text style={styles.routeText}>{item.bookingTo}</Text>
    </View>
    <View style={styles.summaryMetaLine}>
      <Calendar size={12} color={Colors.textSecondary} strokeWidth={2} />
      <Text style={styles.summaryMeta}>{formatDate(item.bookingDate)}</Text>
    </View>

    <View style={styles.myCardStars}>
      <StarRating value={item.rating} readOnly size={20} showLabel={false} />
    </View>

    {item.tags.length > 0 ? (
      <View style={styles.tagWrap}>
        {item.tags.map(t => (
          <View key={t} style={[styles.tag, styles.tagActive]}>
            <Check size={12} color={Colors.primary} strokeWidth={2.5} />
            <Text style={[styles.tagLabel, styles.tagLabelActive]}>
              {TAG_LABELS[t]}
            </Text>
          </View>
        ))}
      </View>
    ) : null}

    {item.comment ? <Text style={styles.myComment}>{item.comment}</Text> : null}
  </View>
);

/* ================================================================
 * Local subcomponents
 * ================================================================ */

const TabButton: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
}> = ({ label, active, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.tab,
      active && styles.tabActive,
      pressed && styles.pressed,
    ]}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
  >
    <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
      {label}
    </Text>
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
  },

  /* Two-tab segmented control */
  tabsWrap: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    height: 46,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '700',
    includeFontPadding: false,
  },
  tabLabelActive: {
    color: Colors.textOnPrimary,
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

  /* Section header */
  sectionHeader: {
    gap: 2,
  },
  sectionTitle: {
    ...Typography.h5,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  sectionBody: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },

  /* Booking list */
  list: {
    gap: Spacing.md,
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

  /* Tag chips (My Feedback read-only strip only — the Give Feedback
     tab uses tagGrid below.) */
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tagActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryTint,
  },
  tagLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
    includeFontPadding: false,
  },
  tagLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
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

  /* My Feedback cards */
  myCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
    ...Shadows.xs,
  },
  myCardStars: {
    marginTop: Spacing.xs,
  },
  myComment: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  /* Empty state */
  emptyState: {
    marginTop: Spacing.xxxxl,
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.85,
  },
});
