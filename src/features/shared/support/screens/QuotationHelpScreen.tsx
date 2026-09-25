/**
 * ------------------------------------------------------------------
 * QuotationHelpScreen — "Quotation FAQs"
 * ------------------------------------------------------------------
 * Reached from HelpSupportScreen when the user taps the "Quotation
 * Help" topic tile. Renders the curated Quotation FAQs through the
 * shared FaqAccordionList (single-open expand/collapse with an
 * up/down chevron). This file owns the CONTENT; the accordion UI
 * lives in one place — see FaqAccordionList for the interaction
 * model and styling rules.
 *
 * SEARCH BAR — INTENTIONALLY ABSENT:
 *   The reference mockup includes a top search bar, but the product
 *   ask for this pass is to ship the list only. A search field for
 *   ~10 items would be busywork; if the FAQ set grows past ~25
 *   entries or the backend starts returning categories, revisit —
 *   probably by promoting search into ScreenHeader's rightSlot
 *   rather than a separate row.
 *
 * SHARED ACROSS ROLES:
 *   Registered on Customer, Vendor and Driver stacks (mirroring
 *   HelpSupport). Content is role-agnostic today. When role-specific
 *   FAQs are needed, read `userRole` from Redux and filter the FAQS
 *   list — no route split.
 *
 * CONTENT IS THE SSoT:
 *   Answers are written to be product-accurate for Urban Cruise's
 *   current quotation flow (72-hour validity, all-inclusive pricing
 *   for the planned route, in-app modification path). Any policy
 *   change (validity window, cancellation terms, support hours) must
 *   be reflected here at the same time — this file is the customer-
 *   facing SSoT until the /support/faqs?topic=quotation endpoint ships.
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
 * Ids are stable strings (not array indices) so telemetry and any
 * future deep-link ("open FAQ #cancel-quotation") continue to
 * resolve when the list is reordered. When the backend ships
 * /support/faqs?topic=quotation, replace this constant with the
 * TanStack Query hook — the rest of this file stays unchanged.
 * ----------------------------------------------------------------- */

const FAQS: readonly Faq[] = [
  {
    id: 'status',
    question: 'How can I check the status of my quotation?',
    answer:
      'Open the Quotations tab from the bottom navigation. Every quotation is labelled with its current status — Pending (our team is preparing it), Accepted (ready for you to confirm and book), or Expired. Tap any card to see the full itinerary, fare breakdown and remarks.',
  },
  {
    id: 'validity',
    question: 'How long is the quotation valid?',
    answer:
      'Quotations are valid for 72 hours from the time they are issued. After that, prices may change based on vehicle availability, fuel rates and seasonal demand. You can always request a fresh quote for the same trip at no cost.',
  },
  {
    id: 'changes',
    question: 'Can I request changes in my quotation?',
    answer:
      'Yes. Open the quotation and tap "Request Changes" to update the pickup date and time, drop-off point, vehicle type or passenger count. Our team sends a revised quote within a few hours; the original quote stays in your list for reference until you accept the new one.',
  },
  {
    id: 'price-includes',
    question: 'What is included in the quotation price?',
    answer:
      'The quoted fare is all-inclusive for the itinerary shown — vehicle, driver, fuel and standard chauffeur allowances (food and stay for multi-day trips). It is a door-to-door price for the planned route, with no per-kilometre surprises.',
  },
  {
    id: 'tolls-parking-taxes',
    question: 'Are tolls, parking and state taxes included?',
    answer:
      'Yes. All highway tolls, parking fees at the listed stops, inter-state permits and state entry taxes are included in the quoted price. You will not be asked to pay these separately at any point during the trip.',
  },
  {
    id: 'new-dates',
    question: 'Can I get a new quotation for different dates?',
    answer:
      'Absolutely. Tap "Get Quote" on the Home tab and enter your new travel dates. Existing quotations stay in your list unchanged — a fresh one is issued for the new dates, so you can compare both before deciding.',
  },
  {
    id: 'confirm',
    question: 'How do I confirm a quotation?',
    answer:
      'Open the accepted quotation, review the itinerary and fare, then tap "Confirm & Continue to Book". You will be guided through payment — full amount or a booking advance — and your trip is locked in as soon as the payment clears.',
  },
  {
    id: 'expiry',
    question: 'What happens after the quotation expires?',
    answer:
      'An expired quotation stays visible in your list for reference but can no longer be confirmed. Tap "Request Fresh Quote" on the expired card and we will re-issue it at the current rates, usually within the same working day.',
  },
  {
    id: 'cancel',
    question: 'Can I cancel my quotation?',
    answer:
      'Yes. An unconfirmed quotation carries no charges — either ignore it and it will lapse after 72 hours, or tap "Discard" on the card to remove it immediately. Once a quotation is confirmed and paid, the standard booking cancellation policy applies.',
  },
  {
    id: 'modify-price',
    question: 'Will the price change if I modify the quotation?',
    answer:
      'It might. Adding stops, extending the trip, upgrading the vehicle tier or moving to a peak-season date can affect the fare. Any change is re-priced transparently and sent back to you for approval before it is applied — nothing changes without your consent.',
  },
  {
    id: 'contact-advisor',
    question: 'How can I contact my travel advisor?',
    answer:
      'Open the More tab and tap "Help & Support" for call, WhatsApp, email and live-chat options. Our advisors are available from 10am to 7pm IST, all days of the week. For urgent trip-related issues, the call and WhatsApp channels get the fastest response.',
  },
];

/* ================================================================
 * Screen
 * ================================================================ */

const QuotationHelpScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  /**
   * Fires the closed-union telemetry event with the topic scoped in.
   * The list component is topic-agnostic on purpose — the caller
   * owns the `topic` property so a single dashboard can aggregate
   * helpfulness by topic AND drill into individual questions by id.
   */
  const handleFaqFeedback = useCallback((faqId: string, helpful: boolean) => {
    logEvent('support.faq_helpful_voted', {
      topic: 'quotation',
      faqId,
      helpful,
    });
    // TODO(api): POST /support/faqs/:faqId/feedback { helpful }
    // when the endpoint ships. Fire-and-forget — the local
    // "Thanks" confirmation is what the user actually sees.
  }, []);

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Quotation FAQs"
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

export default QuotationHelpScreen;

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
