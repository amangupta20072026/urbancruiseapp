/**
 * ------------------------------------------------------------------
 * SafetyHelpScreen — "Safety & Travel Support FAQs"
 * ------------------------------------------------------------------
 * Reached from HelpSupportScreen when the user taps the "Safety &
 * Travel Support" topic tile. Renders the curated Safety FAQs
 * through the shared FaqAccordionList (single-open expand/collapse
 * with an up/down chevron and per-answer "Was this helpful?"). This
 * file owns the CONTENT; the accordion UI lives in one place — see
 * FaqAccordionList for the interaction model and styling rules.
 *
 * SEARCH BAR — INTENTIONALLY ABSENT:
 *   The reference mockup includes a top search bar, but the product
 *   ask for this pass is to ship the list only. See
 *   QuotationHelpScreen.tsx for the full rationale (identical policy).
 *
 * SHARED ACROSS ROLES:
 *   Registered on Customer, Vendor and Driver stacks (mirroring
 *   HelpSupport). Content is written from the customer's point of
 *   view today because most safety questions ("share my live
 *   location", "if the driver does not arrive", "left something in
 *   the vehicle") are inherently customer-scoped. When driver /
 *   vendor safety concerns become substantial (e.g. driver panic
 *   flow, vendor incident escalation), split by `userRole` here or
 *   ship a separate topic tile.
 *
 * CONTENT IS THE SSoT AND SAFETY-CRITICAL:
 *   These answers are read at moments of real anxiety — a rider who
 *   feels unsafe, a driver who hasn't arrived, a lost belonging.
 *   Wording carries higher stakes than the other topic screens:
 *
 *     • The Emergency answer tells the user to dial 100 / 112
 *       FIRST for anything life-threatening, then to use the app
 *       for driver / route issues. Do not reorder — an app button
 *       is never a substitute for reaching local emergency services.
 *
 *     • The pre-trip checklist calls out the OTP handoff explicitly
 *       ("driver cannot start the trip without the OTP you see in
 *       your app") because that is the concrete anti-fraud
 *       affordance the product actually provides. Generic "verify
 *       the car" advice without the OTP anchor is worse.
 *
 *     • The "feel unsafe during the trip" answer names the "ask to
 *       stop at a safe public location" right explicitly. Riders in
 *       the moment often forget they have this right; naming it
 *       reduces harm even when the app itself cannot help fast enough.
 *
 *     • "You will not be charged for a driver no-show" is a product
 *       commitment. If policy ever changes, this file changes.
 *
 *   Any change to safety policy, emergency protocol, driver
 *   verification standards, or the trip-share flow MUST be
 *   reflected here at the same time — this file is the customer-
 *   facing SSoT until the /support/faqs?topic=safety endpoint ships.
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
 * ("open FAQ #feel-unsafe") continue to resolve when the list is
 * reordered. Replace with a TanStack Query hook when
 * /support/faqs?topic=safety ships — the rest of this file stays
 * unchanged.
 * ----------------------------------------------------------------- */

const FAQS: readonly Faq[] = [
  {
    id: 'safety-overview',
    question: 'How does Urban Cruise ensure my safety?',
    answer:
      "Your safety is our highest priority. We verify every driver's identity and documents before onboarding, keep vehicles under valid commercial insurance, run 24×7 trip monitoring from our operations centre, and give you in-app tools like live tracking, trip-share and an emergency shortcut on every active trip. Your rating and feedback after each trip also directly shape which drivers stay on the platform.",
  },
  {
    id: 'verification',
    question: 'Are drivers and vehicles verified?',
    answer:
      'Yes. Every driver goes through document verification (Aadhaar, driving license, PAN), background verification, and an in-person interview before onboarding. Every vehicle is verified against its RC, valid PUC, valid commercial insurance and periodic condition checks. Details of your assigned driver and vehicle — including the number plate and driver photo — are shared with you 4 hours before pickup so you can confirm on arrival.',
  },
  {
    id: 'before-trip',
    question: 'What should I do before starting my trip?',
    answer:
      "Before boarding, confirm three things using the app: (1) the vehicle number plate matches what the app shows, (2) the driver's photo and name match, and (3) the trip OTP you see in the app is what the driver reads back to you. The driver cannot start the trip in the app without entering that OTP — this is your primary protection against boarding the wrong vehicle. Do not share the OTP over phone or message, only in person at pickup.",
  },
  {
    id: 'emergency',
    question: 'How can I get help during an emergency?',
    answer:
      'For any life-threatening emergency, dial 100 (Police) or 112 (all-services) immediately — nothing in an app replaces reaching local emergency services first. For urgent trip issues (driver conduct, wrong route, feeling unsafe), tap "Contact Support" from the trip screen or the Help & Support tile — our 24×7 operations team typically responds within a couple of minutes and can call the driver, dispatch help, or escalate on your behalf.',
  },
  {
    id: 'share-location',
    question: 'Can I share my live location with family or friends?',
    answer:
      'Yes. During any active trip, use "Share Trip" on the trip screen to send a live tracking link via WhatsApp, SMS or any messaging app on your phone. Anyone with the link can see your current location, driver details and the estimated arrival time — no Urban Cruise account required to view it. The link automatically expires when the trip ends, so it cannot be reused later.',
  },
  {
    id: 'feel-unsafe',
    question: 'What should I do if I feel unsafe during the trip?',
    answer:
      'Trust your instincts. If something feels wrong, tap the Emergency shortcut on the trip screen — our operations team will call you back promptly, stay on the line, and coordinate with the driver or dispatch help if needed. You also have the right at any time to ask the driver to stop at a safe public location (police station, petrol pump, busy market) — this is your right as a passenger and drivers are trained to comply immediately.',
  },
  {
    id: 'driver-no-show',
    question: 'What happens if the driver does not arrive?',
    answer:
      'The app shows the driver\'s live location and ETA to your pickup point. If the driver is delayed, use the in-app call or WhatsApp button to reach them directly — pickup traffic and last-mile navigation account for most delays. If the driver is unreachable or over 15 minutes late without an update, tap "Contact Support" — our team will call the driver, keep you informed, and dispatch a replacement vehicle if needed. You are not charged for a driver-caused no-show.',
  },
  {
    id: 'reschedule-cancel',
    question: 'Can I reschedule or cancel my trip?',
    answer:
      'Yes. Open the booking and tap "Modify Booking" to reschedule up to 24 hours before pickup, or "Cancel Booking" to cancel — the refund amount based on our cancellation policy is shown before you confirm. Trips already in progress can be ended early by asking the driver to stop; the fare is recalculated based on actual kilometres and hours travelled, and any excess advance is refunded per the standard refund schedule.',
  },
  {
    id: 'lost-item',
    question: 'What should I do if I left something in the vehicle?',
    answer:
      'Contact support through Help & Support as soon as you notice — the sooner the better, ideally within 24 hours of trip completion. Our team gets in touch with the driver immediately and coordinates the return: usually the driver drops the item back on their next trip in your area, or you can arrange collection from our nearest office. There is no fee for standard lost-and-found coordination.',
  },
  {
    id: 'hygiene',
    question: 'How do you maintain hygiene and cleanliness in vehicles?',
    answer:
      'Every vehicle undergoes interior cleaning before its first trip of the day, and vehicles are checked periodically at our operations centre for upholstery condition, working AC and overall condition. If you find your assigned vehicle unclean, damaged or in poor condition on arrival, refuse the trip and tap "Contact Support" — we will dispatch a replacement at no extra cost and take corrective action with the driver and operator.',
  },
  {
    id: 'report-concern',
    question: 'Can I report a safety concern or complaint?',
    answer:
      'Yes, and we take every report seriously. Use Help & Support after your trip to raise a concern with a description and any photos — for urgent, in-progress safety issues, use the Emergency shortcut instead. Every complaint is reviewed within 24 hours; complaints involving driver conduct trigger a formal investigation, and where warranted, immediate removal of the driver from the platform.',
  },
];

/* ================================================================
 * Screen
 * ================================================================ */

const SafetyHelpScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  /**
   * Fires the closed-union telemetry event with the topic scoped in.
   * See QuotationHelpScreen for the rationale — the list component
   * is topic-agnostic and this is where `topic` is stamped.
   *
   * NB: For the safety topic in particular, watching the aggregate
   * "not helpful" rate is a leading indicator of a policy that has
   * drifted from what the app actually does. A sudden spike on any
   * one `faqId` after a product change is a signal to update the
   * answer BEFORE support tickets pile up.
   */
  const handleFaqFeedback = useCallback((faqId: string, helpful: boolean) => {
    logEvent('support.faq_helpful_voted', {
      topic: 'safety',
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
          title="Safety & Travel Support FAQs"
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

export default SafetyHelpScreen;

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
