/**
 * ------------------------------------------------------------------
 * AccountHelpScreen — "Account & App Support FAQs"
 * ------------------------------------------------------------------
 * Reached from HelpSupportScreen when the user taps the "Account &
 * App Support" topic tile. Renders the curated Account / App-support
 * FAQs through the shared FaqAccordionList (single-open expand/
 * collapse with an up/down chevron and per-answer "Was this helpful?").
 * This file owns the CONTENT; the accordion UI lives in one place —
 * see FaqAccordionList for the interaction model and styling rules.
 *
 * SEARCH BAR — INTENTIONALLY ABSENT:
 *   The reference mockup includes a top search bar, but the product
 *   ask for this pass is to ship the list only. See
 *   QuotationHelpScreen.tsx for the full rationale (identical policy).
 *
 * SHARED ACROSS ROLES:
 *   Registered on Customer, Vendor and Driver stacks (mirroring
 *   HelpSupport). Every answer is written to be role-agnostic —
 *   account creation, mobile-number changes, logout, notification
 *   management, app updates and account deletion all work the same
 *   for every role. When role-specific account behaviour appears
 *   (e.g. vendor multi-user sub-role management), read `userRole`
 *   from Redux and filter — no route split.
 *
 * CONTENT IS THE SSoT:
 *   Answers are written to be product-accurate for Urban Cruise's
 *   current identity model, and specifically call out a few things
 *   that tend to trip up new users:
 *
 *     • The app uses OTP-only auth — NO passwords. The "I forgot my
 *       password" answer is written to reframe the mental model, not
 *       to send the user through a password-reset flow that doesn't
 *       exist.
 *
 *     • One-device-at-a-time policy. Signing in on a new device
 *       signs the previous device out. Framed as a security feature
 *       (lost/stolen phone protection) because that's why the
 *       constraint exists.
 *
 *     • Language: English only today. Answered honestly instead of
 *       pretending a selector exists — under-promise, over-deliver.
 *
 *     • Delete-Account path with the retention caveat for tax /
 *       accounting records. This is the compliance-relevant one:
 *       Play Store and App Store both require an in-app deletion
 *       path, and the retention window has to be stated for GST
 *       and Income-Tax record-keeping.
 *
 *   Any policy change (added auth factor, multi-session support,
 *   language expansion, altered deletion window) MUST be reflected
 *   here at the same time — this file is the customer-facing SSoT
 *   until the /support/faqs?topic=account endpoint ships.
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
 * ("open FAQ #delete-account") continue to resolve when the list is
 * reordered. Replace with a TanStack Query hook when
 * /support/faqs?topic=account ships — the rest of this file stays
 * unchanged.
 * ----------------------------------------------------------------- */

const FAQS: readonly Faq[] = [
  {
    id: 'create-account',
    question: 'How do I create an account?',
    answer:
      'You can create an account using just your mobile number — no email or password required. Enter your number on the Login screen, verify it with the OTP we send via WhatsApp (with SMS as an automatic fallback), and complete your profile details. You are ready to book from the same moment.',
  },
  {
    id: 'update-mobile',
    question: 'How can I update my mobile number?',
    answer:
      'Your mobile number is the primary identifier of your account. Open More → Profile and tap the mobile number field to change it. You will be asked to verify both the old and the new number with an OTP before the change is applied. If you no longer have access to the old number, contact support with your account details and a recent booking reference for verification.',
  },
  {
    id: 'update-profile',
    question: 'How do I update my profile information?',
    answer:
      'Open More → Profile to edit your name, email, secondary phone and other profile details. Changes are saved as soon as you tap "Save Changes". A few fields (like the legal name that appears on GST invoices) may need a support request to change once invoices have already been raised under the old value — this is a compliance requirement, not a platform limit.',
  },
  {
    id: 'forgot-password',
    question: 'I forgot my password. What should I do?',
    answer:
      'Good news — Urban Cruise does not use passwords. Every login is verified with a fresh one-time OTP sent to your registered mobile number, so there is nothing to forget or reset. If you are not receiving the OTP, check the "Sent via SMS" banner on the verification screen (it means WhatsApp delivery failed and we fell back to SMS), and make sure the number has network coverage.',
  },
  {
    id: 'logout',
    question: 'How do I logout from the app?',
    answer:
      'Open More → Settings → Logout. You are signed out immediately and returned to the Login screen. Any sensitive data cached on the device — tokens, personal details, payment info — is cleared as part of logout. You can sign back in any time using the same mobile number.',
  },
  {
    id: 'multi-device',
    question: 'Can I use the app on multiple devices?',
    answer:
      'Yes, but only one device can be signed in at a time. Signing in on a new device automatically signs you out of the previous one — this is a security feature that protects your account if a phone is lost or stolen. Your bookings, quotations and payment history are always available on whichever device you are currently signed in on.',
  },
  {
    id: 'language',
    question: 'How do I change the app language?',
    answer:
      "Urban Cruise is currently available in English only. Support for Hindi and other Indian regional languages is on our roadmap — we will announce it in-app when it ships. The app does not follow your phone's system language today; everything is rendered in English regardless of device settings.",
  },
  {
    id: 'notifications',
    question: 'How do I manage notifications?',
    answer:
      'Open More → Settings → Notifications to turn trip updates, promotional alerts and booking reminders on or off individually. For the phone-level permission (whether the app is allowed to show notifications at all), tap "Open System Settings" from the same screen — it deep-links you straight to the notification section of your device settings, no hunting required.',
  },
  {
    id: 'not-working',
    question: 'The app is not working. What should I do?',
    answer:
      'Start with the standard checks: make sure you are on the latest version, restart the app, and confirm your internet connection is working. If the issue continues, force-stop and reopen the app, or reinstall it — your bookings and profile are safely stored on our servers and will reload on the next sign-in. Still stuck? Tap "Contact Support" from More → Help & Support with a short description of what happened and the screen it happened on.',
  },
  {
    id: 'update-app',
    question: 'How do I update the app to the latest version?',
    answer:
      'Open the Google Play Store (or App Store on iPhone), search for "Urban Cruise" and tap Update if one is available. You can also turn on auto-updates for Urban Cruise in your store settings so critical fixes reach you without you having to check. If the version you are on is no longer supported, the app will show a blocking prompt with a direct link to the store.',
  },
  {
    id: 'delete-account',
    question: 'How do I delete my account?',
    answer:
      'Open More → Settings → Account → Delete Account. You will be asked to confirm the request, and we send a final confirmation OTP to your registered mobile number to make sure the request is really from you. After confirmation, your account and personal data are permanently removed within 7 working days, in line with our privacy policy. Records tied to completed bookings (invoices, GST filings, trip logs) are retained for the period required by Indian tax and accounting laws, even after account deletion.',
  },
];

/* ================================================================
 * Screen
 * ================================================================ */

const AccountHelpScreen: React.FC = () => {
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
      topic: 'account',
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
          title="Account & App Support FAQs"
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

export default AccountHelpScreen;

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
