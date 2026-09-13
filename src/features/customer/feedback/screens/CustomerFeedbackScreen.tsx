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
 *     [Rate Your Experience — selected booking + stars + tags
 *       + textarea + submit] (only visible once a booking is picked)
 *
 *   My Feedback
 *     [list of already-submitted feedback cards]
 *
 * INTERACTION:
 *   - Tapping "Give Feedback" on a booking-list card sets
 *     `selectedBookingId`; the card gets a green outline and the
 *     Rate section appears below.
 *   - Overall rating uses integer stars 0..5 (tap same star again
 *     to clear).
 *   - Tags are multi-select; selection is unordered.
 *   - Comment has a 500-char cap with a live counter.
 *   - Submit is disabled until a rating > 0 is set. On success, we
 *     reset local state and show a toast; the fixture is not
 *     updated (real submission will hit /customer/feedback).
 *
 * DATA:
 *   Local mocks in `../mocks.ts`. Swap for TanStack Query hooks
 *   when the endpoints ship.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowRight,
  Calendar,
  Check,
  MessageSquare,
} from 'lucide-react-native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { toast } from '@services/toast';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

import type { FeedbackTab, LikeTag, SubmittedFeedback } from '../types';
import { MOCK_COMPLETED_BOOKINGS, MOCK_SUBMITTED_FEEDBACK } from '../mocks';
import { BookingSelectCard } from '../components/BookingSelectCard';
import { StarRating } from '../components/StarRating';

const COMMENT_MAX = 500;

const TAG_OPTIONS: readonly { key: LikeTag; label: string }[] = [
  { key: 'clean_vehicle', label: 'Clean Vehicle' },
  { key: 'ontime_service', label: 'On-time Service' },
  { key: 'professional_driver', label: 'Professional Driver' },
  { key: 'comfortable_ride', label: 'Comfortable Ride' },
  { key: 'good_support', label: 'Good Support' },
  { key: 'value_for_money', label: 'Value for Money' },
];

/** Map of key → label for reverse lookup on the My Feedback tab. */
const TAG_LABELS: Record<LikeTag, string> = Object.fromEntries(
  TAG_OPTIONS.map(t => [t.key, t.label]),
) as Record<LikeTag, string>;

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
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<Set<LikeTag>>(new Set());
  const [comment, setComment] = useState('');

  const selectedBooking = useMemo(
    () => MOCK_COMPLETED_BOOKINGS.find(b => b.id === selectedBookingId) ?? null,
    [selectedBookingId],
  );

  /* -------- Handlers -------- */

  const onSelectBooking = useCallback((id: string) => {
    setSelectedBookingId(id);
    // Reset form when switching bookings so ratings don't bleed
    // across trips.
    setRating(0);
    setTags(new Set());
    setComment('');
  }, []);

  const onToggleTag = useCallback((tag: LikeTag) => {
    setTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  const canSubmit = selectedBooking !== null && rating > 0;

  const onSubmit = useCallback(() => {
    if (!canSubmit) return;
    // UI-only pass: no backend call. Reset the form + confirm.
    setSelectedBookingId(null);
    setRating(0);
    setTags(new Set());
    setComment('');
    toast.success('Thanks — your feedback was recorded.');
    setTab('my');
  }, [canSubmit]);

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

      <ScrollView
        style={styles.scrollBg}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {tab === 'give' ? (
          <GiveFeedbackTab
            selectedBookingId={selectedBookingId}
            onSelectBooking={onSelectBooking}
            selectedBooking={selectedBooking}
            rating={rating}
            setRating={setRating}
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
      </ScrollView>
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
  rating: number;
  setRating: (n: number) => void;
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
  rating,
  setRating,
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

    {/* Section 2 — Rate Your Experience (only after selection). */}
    {selectedBooking ? (
      <>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rate Your Experience</Text>
          <Text style={styles.sectionBody}>
            How was your overall experience with this trip?
          </Text>
        </View>

        <View style={styles.rateCard}>
          {/* Summary of the selected trip */}
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

          {/* Stars */}
          <Text style={styles.fieldLabel}>Overall Rating</Text>
          <StarRating value={rating} onChange={setRating} />

          {/* Tags */}
          <Text style={styles.fieldLabel}>What did you like?</Text>
          <View style={styles.tagWrap}>
            {TAG_OPTIONS.map(opt => {
              const active = tags.has(opt.key);
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => onToggleTag(opt.key)}
                  style={({ pressed }) => [
                    styles.tag,
                    active && styles.tagActive,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  {active ? (
                    <Check size={14} color={Colors.primary} strokeWidth={2.5} />
                  ) : null}
                  <Text
                    style={[styles.tagLabel, active && styles.tagLabelActive]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Comment */}
          <Text style={styles.fieldLabel}>Your Feedback (Optional)</Text>
          <View style={styles.textareaWrap}>
            <TextInput
              value={comment}
              onChangeText={t => setComment(t.slice(0, COMMENT_MAX))}
              placeholder="Tell us more about your experience..."
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
        </View>
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

  /* Rate card */
  rateCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.md,
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

  /* Field labels + fields */
  fieldLabel: {
    ...Typography.label,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginTop: Spacing.sm,
  },

  /* Tag chips */
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
