/**
 * ------------------------------------------------------------------
 * CustomerFeedbackScreen — STACK SCREEN
 * ------------------------------------------------------------------
 * Pushed from the Customer More sheet's "Feedback" tile. General
 * feedback hub — not booking-scoped. The actual rating form is a
 * separate screen (GiveFeedbackScreen at route `Feedback`).
 *
 * WHY THE FORM IS ITS OWN SCREEN:
 *   The form is keyboard-heavy (3 star rows + 8-chip grid + textarea
 *   + submit). Rendering it inline underneath the booking list
 *   forced a big scroll jump every time a booking was picked and
 *   made keyboard handling awkward on Android. A dedicated screen
 *   also gives the flow a clean back gesture and lets us reuse the
 *   same route from BookingDetailScreen's post-trip prompt without
 *   duplication.
 *
 * TWO TABS:
 *   Give Feedback (default)
 *     [info banner]
 *     [Select a Booking — list of completed trips; per-row
 *       "Give Feedback" navigates to the Feedback route with the
 *       chosen bookingId.]
 *   My Feedback
 *     [list of already-submitted feedback cards]
 *
 * DATA:
 *   Local mocks in `../mocks.ts`. Swap for TanStack Query hooks
 *   when the /customer/feedback/eligible and /customer/feedback
 *   endpoints ship — queryKeys are already reserved in
 *   `queryKeys.customer.feedback.*`.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowRight,
  Calendar,
  Check,
  MessageSquare,
} from 'lucide-react-native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import type { CustomerStackParamList } from '@navigation/types';
import type { BookingId } from '@app-types/ids';

import type { FeedbackTab, LikeTag, SubmittedFeedback } from '../types';
import { MOCK_COMPLETED_BOOKINGS, MOCK_SUBMITTED_FEEDBACK } from '../mocks';
import { BookingSelectCard } from '../components/BookingSelectCard';
import { StarRating } from '../components/StarRating';

/* ================================================================
 * UI metadata
 * ================================================================ */

/** Map of key → label for the My Feedback tab's read-only chip strip. */
const TAG_LABELS: Record<LikeTag, string> = {
  driver_behaviour: 'Driver Behaviour',
  vehicle_cleanliness: 'Vehicle Cleanliness',
  comfortable_ride: 'Comfortable Ride',
  ontime_pickup: 'On-Time Pickup',
  value_for_money: 'Value for Money',
  safe_driving: 'Safe Driving',
  executive_support: 'Executive Support',
  booking_experience: 'Booking Experience',
};

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

type NavProp = NativeStackNavigationProp<
  CustomerStackParamList,
  'CustomerFeedback'
>;

/* ================================================================
 * Screen
 * ================================================================ */

const CustomerFeedbackScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [tab, setTab] = useState<FeedbackTab>('give');

  const onGiveFeedback = useCallback(
    (bookingId: BookingId) => {
      // Navigate to the booking-scoped GiveFeedbackScreen. Keeping
      // the form on a dedicated route means the same entry point is
      // shared with BookingDetailScreen's post-trip CTA — one form,
      // one navigator wiring, no drift.
      navigation.navigate('Feedback', { bookingId });
    },
    [navigation],
  );

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Feedback"
          subtitle="Tell us about your experience"
          onBack={() => navigation.goBack()}
        />
      </View>

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
        KeyboardAwareScrollView isn't strictly required now that the
        textarea has moved to GiveFeedbackScreen, but the tab hub can
        still host inputs in future (a search bar over My Feedback
        was mentioned in design). Keeping it costs nothing and avoids
        a future re-wrap.
      */}
      <KeyboardAwareScrollView
        style={styles.scrollBg}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={120}
      >
        {tab === 'give' ? (
          <GiveFeedbackTab onGiveFeedback={onGiveFeedback} />
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
  onGiveFeedback: (bookingId: BookingId) => void;
}> = ({ onGiveFeedback }) => {
  if (MOCK_COMPLETED_BOOKINGS.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No completed trips yet</Text>
        <Text style={styles.emptySubtitle}>
          Once you complete a trip, you can share feedback about it here.
        </Text>
      </View>
    );
  }

  return (
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

      {/* Section — Select a Booking */}
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
            onGiveFeedback={() => onGiveFeedback(item.id)}
          />
        ))}
      </View>
    </>
  );
};

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

  /* Read-only tag chips on My Feedback cards */
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
