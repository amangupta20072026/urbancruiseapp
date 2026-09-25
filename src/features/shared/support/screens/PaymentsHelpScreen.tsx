/**
 * ------------------------------------------------------------------
 * PaymentsHelpScreen — "Payments & Refunds FAQs"
 * ------------------------------------------------------------------
 * Reached from HelpSupportScreen when the user taps the "Payments &
 * Refunds" topic tile. Renders the curated Payments & Refunds FAQs
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
 *   view today because customers own the payment relationship in the
 *   current model; vendor / driver payout FAQs will land as a
 *   separate topic tile ("Payouts") when they ship.
 *
 * CONTENT IS THE SSoT:
 *   Answers are written to be product-accurate for Urban Cruise's
 *   current payment flow — supported methods (UPI, cards, net
 *   banking, wallets), tokenised card handling on PCI-DSS
 *   infrastructure, receipt / share flow inside PaymentDetailSheet,
 *   the pending-payment 30-minute settlement window, refund method
 *   preservation (original-mode-only, enforced by banks & card
 *   networks), and the mode-specific refund SLAs (UPI 1–3 days,
 *   cards 5–7, netbanking up to 7). Any policy change (added / dropped
 *   payment method, changed SLA, new refund path) must be reflected
 *   here at the same time — this file is the customer-facing SSoT
 *   until the /support/faqs?topic=payments endpoint ships.
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
 * ("open FAQ #refund-timing") continue to resolve when the list is
 * reordered. Replace with a TanStack Query hook when
 * /support/faqs?topic=payments ships — the rest of this file stays
 * unchanged.
 * ----------------------------------------------------------------- */

const FAQS: readonly Faq[] = [
  {
    id: 'methods',
    question: 'What payment methods are accepted?',
    answer:
      'We accept UPI (Google Pay, PhonePe, Paytm, and any BHIM-compatible app), Credit Cards (Visa, Mastercard, RuPay, Amex), Debit Cards, Net Banking from all major Indian banks, and popular Wallets. All transactions are processed through our PCI-DSS compliant payment partners.',
  },
  {
    id: 'security',
    question: 'Is my payment information secure?',
    answer:
      'Yes. We never store your full card number, CVV or UPI PIN on our servers — sensitive details are tokenised and handled directly by our payment partners on PCI-DSS certified infrastructure. Every transaction is protected by bank-grade encryption, and 3D Secure / OTP authentication is enforced on all card payments.',
  },
  {
    id: 'receipt',
    question: 'How can I view or download my payment receipt?',
    answer:
      'Open the Payments tab and tap any transaction to see its details. Use "Download Receipt" for a GST-compliant PDF copy, or "Share Receipt" to send it directly to email, WhatsApp or any other app on your device. Receipts for the last 12 months are available for download.',
  },
  {
    id: 'pending',
    question: 'Why is my payment showing as pending?',
    answer:
      'A "Pending" status usually means your bank has authorised the payment but the confirmation has not reached us yet. Most pending payments settle automatically within 30 minutes. If it stays pending for over an hour, tap "Contact Support" from the transaction — please do NOT retry the payment, as that can result in a duplicate charge.',
  },
  {
    id: 'failure',
    question: 'What should I do if my payment fails?',
    answer:
      'Failed payments are auto-reversed by the bank, so no money is actually deducted from your account. If your bank statement does show a debit, it will be refunded automatically within 5–7 working days. You can retry the payment right away using a different method — there is no cool-down period.',
  },
  {
    id: 'refund-when',
    question: 'When will I receive a refund?',
    answer:
      'Once a refund is approved, it is initiated on our end immediately. The actual credit to your account depends on your original payment method — UPI usually takes 1–3 working days, credit and debit cards take 5–7 working days, and net banking can take up to 7 working days.',
  },
  {
    id: 'refund-method',
    question: 'How will the refund be processed?',
    answer:
      'Refunds are always returned to the original payment method used for the booking — a UPI payment refunds back to the same UPI ID, a card payment refunds back to the same card, and so on. Refunds cannot be redirected to a different account; this is a payment-security requirement enforced by banks and card networks, not a platform choice.',
  },
  {
    id: 'refund-duration',
    question: 'How long does it take to get a refund?',
    answer:
      'From the time we initiate the refund: 1–3 working days for UPI, 5–7 working days for credit and debit cards, and up to 7 working days for net banking and wallets. Weekend and public holiday delays are common — please account for these before raising a support ticket.',
  },
  {
    id: 'refund-notification',
    question: 'Will I get a notification after a refund is processed?',
    answer:
      'Yes. You will receive a push notification the moment we initiate the refund, and a second one once your bank confirms the credit has landed in your account. Both events are also stamped on the transaction details in the Payments tab, so you have a clear paper trail.',
  },
  {
    id: 'refund-missing',
    question: "I haven't received my refund. What should I do?",
    answer:
      'First, check the transaction on the Payments tab and confirm the expected credit window has passed (up to 7 working days for cards and net banking). If the window has passed and you still do not see the credit, tap "Contact Support" with your transaction ID — our team will share the bank reference number so you can follow up with your issuer, and escalate on your behalf if needed.',
  },
];

/* ================================================================
 * Screen
 * ================================================================ */

const PaymentsHelpScreen: React.FC = () => {
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
      topic: 'payments',
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
          title="Payments & Refunds FAQs"
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

export default PaymentsHelpScreen;

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
