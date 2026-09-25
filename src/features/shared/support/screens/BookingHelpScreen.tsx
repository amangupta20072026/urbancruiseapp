/**
 * ------------------------------------------------------------------
 * BookingHelpScreen — "Booking FAQs"
 * ------------------------------------------------------------------
 * Reached from HelpSupportScreen when the user taps the "Booking
 * Help" topic tile. Renders the curated Booking FAQs through the
 * shared FaqAccordionList (single-open expand/collapse with an
 * up/down chevron). This file owns the CONTENT; the accordion UI
 * lives in one place — see FaqAccordionList for the interaction
 * model and styling rules.
 *
 * SEARCH BAR — INTENTIONALLY ABSENT:
 *   The reference mockup includes a top search bar, but the product
 *   ask for this pass is to ship the list only. See
 *   QuotationHelpScreen.tsx for the full rationale (identical policy).
 *
 * SHARED ACROSS ROLES:
 *   Registered on Customer, Vendor and Driver stacks (mirroring
 *   HelpSupport). Content is written from the customer's point of
 *   view today because customers own bookings in the current model;
 *   when vendor / driver-specific booking FAQs are needed, read
 *   `userRole` from Redux and swap the list — no route split.
 *
 * CONTENT IS THE SSoT:
 *   Answers are written to be product-accurate for Urban Cruise's
 *   current booking flow — status labels (Upcoming / Ongoing /
 *   Completed / Cancelled), the 24-hour free-cancellation window,
 *   the tiered penalty schedule, live tracking through TripLive,
 *   driver details shared 4 hours before pickup, GST-compliant
 *   invoice download and the 24×7 on-trip support channel. Any
 *   policy change (cancellation tiers, refund window, driver-share
 *   lead time, support hours) must be reflected here at the same
 *   time — this file is the customer-facing SSoT until the
 *   /support/faqs?topic=booking endpoint ships.
 * ------------------------------------------------------------------
 */

import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { FaqAccordionList, type Faq } from '../components/FaqAccordionList';
import { logEvent } from '@services/telemetry';
import { Colors, Spacing } from '@theme';

/* -----------------------------------------------------------------
 * FAQ registry
 *
 * Ids are stable strings so telemetry and any future deep-link
 * ("open FAQ #cancellation-policy") continue to resolve when the
 * list is reordered. Replace with a TanStack Query hook when
 * /support/faqs?topic=booking ships — the rest of this file stays
 * unchanged.
 * ----------------------------------------------------------------- */

const FAQS: readonly Faq[] = [
  {
    id: 'status',
    question: 'How can I check my booking status?',
    answer:
      'Open the Bookings tab from the bottom navigation. Every booking is labelled Upcoming, Ongoing, Completed or Cancelled. Tap any card to see the full trip timeline, driver and vehicle details, and the current status of the trip.',
  },
  {
    id: 'modify',
    question: 'Can I modify my booking?',
    answer:
      'Yes, up to 24 hours before the scheduled pickup. Open the booking and tap "Modify Booking" to change the pickup time, drop-off point, vehicle type or passenger count. Modifications made within 24 hours may attract a modification fee, which is shown before you confirm.',
  },
  {
    id: 'track-vehicle',
    question: 'How do I track my vehicle during the trip?',
    answer:
      'Once the trip starts, a "Track Vehicle" option appears on the booking card and inside the booking details. Tap it to see the vehicle\'s live location on a map, along with the driver\'s current speed and the estimated time to your pickup or destination.',
  },
  {
    id: 'driver-details',
    question: 'When will I get driver details?',
    answer:
      'Driver and vehicle details — driver name, phone number, vehicle model and number plate — are shared 4 hours before the scheduled pickup via a push notification and on the booking screen. You can call or WhatsApp the driver directly from there.',
  },
  {
    id: 'driver-late',
    question: 'What should I do if the driver is late?',
    answer:
      'First, try calling the driver from the booking screen — pickup traffic and last-mile navigation account for most delays. If you cannot reach them, tap "Contact Support" and our on-trip team will escalate immediately. The 24×7 team is available for any delay of more than 15 minutes past the scheduled pickup.',
  },
  {
    id: 'cancel',
    question: 'Can I cancel my booking?',
    answer:
      'Yes. Open the booking and tap "Cancel Booking". You will see the refund amount based on our cancellation policy before you confirm the cancellation. Trips that have already started cannot be cancelled through the app — call support instead.',
  },
  {
    id: 'cancellation-policy',
    question: 'What is the cancellation policy?',
    answer:
      'Free cancellation up to 24 hours before pickup (full refund). Between 24 and 6 hours before pickup: 25% charge. Between 6 and 2 hours: 50% charge. Under 2 hours or no-show: 100% charge. Multi-day and premium bookings may carry separate terms, which are shown on the booking screen before confirmation.',
  },
  {
    id: 'refund',
    question: 'Will I get a refund if I cancel?',
    answer:
      'Yes, subject to the cancellation policy above. Approved refunds are processed within 5–7 working days to your original payment method. You will receive a push notification when the refund is initiated and again when it is credited.',
  },
  {
    id: 'invoice',
    question: 'How can I download my invoice?',
    answer:
      'Open a completed booking and tap "Download Invoice". A GST-compliant PDF is generated with the fare breakdown, applicable taxes and our company details. Invoices for the last 12 months are also available under the Payments tab for quick download.',
  },
  {
    id: 'after-trip',
    question: 'What happens after trip completion?',
    answer:
      'Once the driver ends the trip, you will be prompted to rate the driver and share feedback. The final invoice becomes available immediately, and any pending balance is settled based on the actual kilometres and hours logged — usually within a few minutes of trip end.',
  },
  {
    id: 'on-trip-help',
    question: 'Who should I contact for on-trip assistance?',
    answer:
      'For any issue during an active trip — safety concerns, route changes, driver behaviour, vehicle problems — tap "Emergency" or "Contact Support" from the trip screen. Our 24×7 on-trip team typically responds within a few minutes and can loop in the driver or dispatch a replacement vehicle when needed.',
  },
];

/* ================================================================
 * Screen
 * ================================================================ */

const BookingHelpScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  /**
   * Fires the closed-union telemetry event with the topic scoped in.
   * See QuotationHelpScreen for the rationale — the list component
   * is topic-agnostic and this is where `topic` is stamped.
   */
  const handleFaqFeedback = useCallback((faqId: string, helpful: boolean) => {
    logEvent('support.faq_helpful_voted', {
      topic: 'booking',
      faqId,
      helpful,
    });
    // TODO(api): POST /support/faqs/:faqId/feedback { helpful }
    // when the endpoint ships.
  }, []);

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Booking FAQs"
          subtitle="Find answers to common questions"
          onBack={handleBack}
        />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + Spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <FaqAccordionList faqs={FAQS} onFeedback={handleFaqFeedback} />
      </ScrollView>
    </SafeScreen>
  );
};

export default BookingHelpScreen;

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerWrap: {
    paddingHorizontal: Spacing.lg,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
});
