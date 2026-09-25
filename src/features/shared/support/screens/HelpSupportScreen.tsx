/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * HelpSupportScreen — "Help & Support" hub
 * ------------------------------------------------------------------
 * Landing screen reached from the "Help & Support" tile in every
 * role's More sheet (Customer / Vendor / Driver). Kept DISTINCT from
 * the pre-auth SupportScreen (`Support` route) used by LoginScreen —
 * each entry point has its own tailored surface:
 *
 *   Support       — Pre-auth, three-channel contact card. Reached
 *                   from the "Contact Support" link on LoginScreen.
 *   HelpSupport   — Post-auth, full hub: hero banner, four contact
 *                   channels (WhatsApp / Call / Email / Live Chat)
 *                   and a "Get Help With" topic list.
 *
 * LAYOUT (top → bottom):
 *   ScreenHeader ("Help & Support" + "We're here to assist you, 24×7")
 *   Hero banner (primaryTint) — "NEED HELP?" + value props
 *   Contact Support — section head + "Available 24 × 7" pill
 *     2×2 grid of channel tiles (WhatsApp / Call / Email / Live Chat)
 *   Get Help With — section head + subtitle
 *     6 topic rows (each a full-width outlined card)
 *
 * DATA:
 *   Contact details come from remote AppConfig (`s.app.appConfig.support`)
 *   — same source SupportScreen reads. Ops can rotate the numbers
 *   without shipping a new build. Handlers alert gracefully if the
 *   config hasn't loaded yet (offline first-run).
 *
 * COMING-SOON PLACEHOLDERS:
 *   - Live Chat is gated behind `supportChatEnabled` feature flag
 *     (still off today). Until the flag flips, tapping the tile
 *     shows an info toast — matches the pattern used by
 *     BookingsScreen's Track Vehicle button.
 *   - All six "Get Help With" tiles now route to dedicated screens:
 *     Quotation Help → QuotationHelpScreen, Booking Help →
 *     BookingHelpScreen, Payments & Refunds → PaymentsHelpScreen,
 *     Account & App Support → AccountHelpScreen, Safety & Travel
 *     Support → SafetyHelpScreen, Feedback & Suggestions →
 *     FeedbackHelpScreen (form, not FAQ — see its header). Adding
 *     a seventh topic is: append to TopicId + TOPICS[], add its
 *     case in `handleTopicPress`, and register the screen on each
 *     role stack.
 *
 * DESIGN INVARIANTS:
 *   - Uses SafeScreen + ScreenHeader, matching every other stack
 *     screen (Profile, Settings, NotificationCentre, Referrals,
 *     Support, ...). Gives one predictable header identity.
 *   - Theme tokens only — no hardcoded colors / spacings / radii.
 *   - Channel tile colors reuse Colors.primary / info / accent
 *     (theme tokens) plus a tint pair — no palette values are
 *     inlined here.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Mail,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Phone,
  ShieldCheck,
  UserCircle2,
  type LucideProps,
} from 'lucide-react-native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';
import { toast } from '@services/toast';
import { navigate } from '@navigation/NavigationService';
import { useAppSelector } from '@store/hooks';

/* -----------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------- */

/**
 * Open a native intent URL with a graceful fallback alert when the
 * OS has no handler (e.g. no Mail app configured, WhatsApp not
 * installed, dialler unavailable on a tablet).
 *
 * Mirrors the SupportScreen implementation so both screens fail the
 * same way for the same reason — if we later add a shared util for
 * this, both files can drop their private copy in one step.
 */
const openLink = async (url: string, fallbackMessage: string) => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Unable to open', fallbackMessage);
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('Unable to open', fallbackMessage);
  }
};

/* -----------------------------------------------------------------
 * Local color pairs — the mockup calls for a purple channel tile
 * ("Live Chat") and a purple "Account" topic tile that don't yet
 * have a theme token pair. Kept as named module-scope constants so
 * a future theme addition (Colors.purple / Colors.purpleTint) can
 * be swapped in at one line each. `#7C3AED` matches Palette.purple
 * already used in moreMenuConfig.tsx.
 * ----------------------------------------------------------------- */

const PURPLE_FG = '#7C3AED';
const PURPLE_BG = '#EDE9FE';

/* -----------------------------------------------------------------
 * Static content
 * ----------------------------------------------------------------- */

/**
 * Ordered list of topics rendered in the "Get Help With" section.
 * Each entry has a stable `id` used by `handleTopicPress` — adding
 * a new topic OR wiring a real destination is a one-line switch
 * update, keeping this array as pure content.
 */
type TopicId =
  | 'quotation'
  | 'booking'
  | 'payments'
  | 'account'
  | 'safety'
  | 'feedback';

type Topic = {
  id: TopicId;
  title: string;
  subtitle: string;
  Icon: React.ComponentType<LucideProps>;
  /** Foreground icon color — paired 1:1 with `iconBg` below. */
  iconFg: string;
  /** Soft tint used for the icon tile background. */
  iconBg: string;
};

const TOPICS: readonly Topic[] = [
  {
    id: 'quotation',
    title: 'Quotation Help',
    subtitle: 'Get support for quotations (Pending, Accepted, Expired)',
    Icon: FileText,
    iconFg: Colors.info,
    iconBg: Colors.infoTint,
  },
  {
    id: 'booking',
    title: 'Booking Help',
    subtitle:
      'Get support for bookings (Upcoming, Ongoing, Completed, Cancelled)',
    Icon: CalendarCheck,
    iconFg: Colors.primary,
    iconBg: Colors.primaryTint,
  },
  {
    id: 'payments',
    title: 'Payments & Refunds',
    subtitle: 'Help with payments, invoices, refunds and GST',
    Icon: CreditCard,
    iconFg: Colors.accent,
    iconBg: Colors.accentTint,
  },
  {
    id: 'account',
    title: 'Account & App Support',
    subtitle: 'Login, profile, app usage and technical issues',
    Icon: UserCircle2,
    iconFg: PURPLE_FG,
    iconBg: PURPLE_BG,
  },
  {
    id: 'safety',
    title: 'Safety & Travel Support',
    subtitle: 'On-trip support, safety concerns and general travel assistance',
    Icon: ShieldCheck,
    iconFg: Colors.primary,
    iconBg: Colors.primaryTint,
  },
  {
    id: 'feedback',
    title: 'Feedback & Suggestions',
    subtitle: 'Share your feedback to help us improve',
    Icon: MessageSquare,
    iconFg: Colors.error,
    iconBg: Colors.errorTint,
  },
];

/* -----------------------------------------------------------------
 * Screen
 * ----------------------------------------------------------------- */

const HelpSupportScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  /* -------- Config-backed contact details -------- *
   *
   * Same source of truth as SupportScreen. Ops can rotate the
   * phone / WhatsApp / email in the backend and the app picks it
   * up on the next AppConfig refresh — no store release needed.
   */
  const supportConfig = useAppSelector(s => s.app.appConfig?.support);
  const supportChatEnabled = useAppSelector(
    s => s.app.appConfig?.featureFlags.supportChatEnabled ?? false,
  );
  const SUPPORT_CONTACT = useMemo(
    () => ({
      phone: supportConfig?.phone ?? '',
      whatsapp: supportConfig?.whatsapp ?? '',
      email: supportConfig?.email ?? '',
      whatsappPrefill: 'Hi Urban Cruise, I need help with...',
      emailSubject: 'Help & Support',
    }),
    [supportConfig?.phone, supportConfig?.whatsapp, supportConfig?.email],
  );

  // Bottom pad on the scroll content only — SafeScreen owns the top
  // inset, but scroll content must clear the home indicator / nav
  // bar on its own so the last topic card doesn't collide with the
  // system chrome on tall content.
  const bottomPad = Math.max(insets.bottom, Spacing.xxl);

  /* -------- Handlers -------- */

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const handleWhatsApp = useCallback(() => {
    if (!SUPPORT_CONTACT.whatsapp) {
      Alert.alert('Support unavailable', 'Please try again in a moment.');
      return;
    }
    const text = encodeURIComponent(SUPPORT_CONTACT.whatsappPrefill);
    void openLink(
      `whatsapp://send?phone=${SUPPORT_CONTACT.whatsapp}&text=${text}`,
      'WhatsApp is not installed on this device.',
    );
  }, [SUPPORT_CONTACT]);

  const handleCall = useCallback(() => {
    if (!SUPPORT_CONTACT.phone) {
      Alert.alert('Support unavailable', 'Please try again in a moment.');
      return;
    }
    void openLink(
      `tel:${SUPPORT_CONTACT.phone}`,
      'Calling is not supported on this device.',
    );
  }, [SUPPORT_CONTACT]);

  const handleEmail = useCallback(() => {
    if (!SUPPORT_CONTACT.email) {
      Alert.alert('Support unavailable', 'Please try again in a moment.');
      return;
    }
    const subject = encodeURIComponent(SUPPORT_CONTACT.emailSubject);
    void openLink(
      `mailto:${SUPPORT_CONTACT.email}?subject=${subject}`,
      'No email app is configured on this device.',
    );
  }, [SUPPORT_CONTACT]);

  const handleLiveChat = useCallback(() => {
    // Feature-flagged: LiveChat surface isn't built yet. Once the
    // flag flips true the real navigation goes here — for today the
    // tile is present in the UI so users see the affordance, and a
    // toast explains it's coming.
    if (!supportChatEnabled) {
      toast.info('Live chat coming soon', {
        description: "We're rolling this out shortly.",
      });
      return;
    }
    // TODO(nav): navigate('SupportLiveChat') once the screen lands.
  }, [supportChatEnabled]);

  const handleTopicPress = useCallback((topicId: TopicId) => {
    // Every topic tile now has a dedicated destination. Adding a
    // new topic later means: add its id to the TopicId union above,
    // add the corresponding case here, and register the screen on
    // every role stack that has HelpSupport (mirror the existing
    // topics in CustomerNavigator / VendorNavigator / DriverNavigator).
    //
    // Using the imperative `navigate` from NavigationService (not
    // `navigation.navigate` from useNavigation) because this screen
    // is registered on three role stacks (Customer, Vendor, Driver),
    // and the useNavigation hook types calls against the global
    // RootParamList — which only knows the outer flow-level routes.
    // NavigationService.navigate is typed as the flat union of
    // every ParamList precisely for cross-stack calls like this;
    // see its header for the full contract.
    switch (topicId) {
      case 'quotation':
        navigate('QuotationHelp');
        return;
      case 'booking':
        navigate('BookingHelp');
        return;
      case 'payments':
        navigate('PaymentsHelp');
        return;
      case 'account':
        navigate('AccountHelp');
        return;
      case 'safety':
        navigate('SafetyHelp');
        return;
      case 'feedback':
        navigate('FeedbackHelp');
        return;
      default: {
        const _exhaustive: never = topicId;
        void _exhaustive;
      }
    }
  }, []);

  /* -------- Render -------- */

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Help & Support"
          subtitle="We're here to assist you, 24×7"
          onBack={handleBack}
        />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero banner ─────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroKicker}>NEED HELP?</Text>
            <Text style={styles.heroTitle}>We're always here for you.</Text>
            <Text style={styles.heroBody}>
              Get quick support for your quotations, bookings, payments and
              more.
            </Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroRight}>
            <HeroBullet label="Quick response" />
            <HeroBullet label="Dedicated support team" />
            <HeroBullet label="Safe and reliable travel" />
            <View style={styles.heroTagline}>
              <View style={styles.heroTaglineRule} />
              <Text style={styles.heroTaglineText}>
                Your Journey. Our Priority.
              </Text>
            </View>
          </View>
        </View>

        {/* ── Contact Support ─────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          <View style={styles.availPill}>
            <Clock size={12} color={Colors.textSecondary} strokeWidth={2.25} />
            <Text style={styles.availPillText}>Available 24 × 7</Text>
          </View>
        </View>

        <View style={styles.channelGrid}>
          <ChannelTile
            title="WhatsApp"
            subtitle="Chat with us"
            Icon={MessageCircle}
            fg={Colors.primary}
            bg={Colors.primaryTint}
            onPress={handleWhatsApp}
          />
          <ChannelTile
            title="Call Us"
            subtitle="Speak to our team"
            Icon={Phone}
            fg={Colors.info}
            bg={Colors.infoTint}
            onPress={handleCall}
          />
          <ChannelTile
            title="Email Us"
            subtitle="Send us an email"
            Icon={Mail}
            fg={Colors.accent}
            bg={Colors.accentTint}
            onPress={handleEmail}
          />
          <ChannelTile
            title="Live Chat"
            subtitle="Chat in the app"
            Icon={MessagesSquare}
            fg={PURPLE_FG}
            bg={PURPLE_BG}
            onPress={handleLiveChat}
          />
        </View>

        {/* ── Get Help With ───────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Get Help With</Text>
          <Text style={styles.sectionHint}>
            Select a topic to find the right support
          </Text>
        </View>

        <View style={styles.topicList}>
          {TOPICS.map(topic => (
            <TopicRow
              key={topic.id}
              topic={topic}
              onPress={() => handleTopicPress(topic.id)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeScreen>
  );
};

export default HelpSupportScreen;

/* =================================================================
 * Local subcomponents
 * ================================================================= */

const HeroBullet: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.heroBulletRow}>
    {/* Ring-and-tick check — matches the mockup's outline-style
        checkmark on a green ring (no filled disc). */}
    <CheckCircle2 size={18} color={Colors.primary} strokeWidth={2.25} />
    <Text style={styles.heroBulletText}>{label}</Text>
  </View>
);

const ChannelTile: React.FC<{
  title: string;
  subtitle: string;
  Icon: React.ComponentType<LucideProps>;
  fg: string;
  bg: string;
  onPress: () => void;
}> = ({ title, subtitle, Icon, fg, bg, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.channelTile,
      { backgroundColor: bg },
      pressed && styles.pressed,
    ]}
    accessibilityRole="button"
    accessibilityLabel={`${title} — ${subtitle}`}
  >
    <View style={styles.channelHeadRow}>
      <View style={[styles.channelIconTile, { backgroundColor: fg }]}>
        <Icon size={20} color={Colors.textOnPrimary} strokeWidth={2.25} />
      </View>
      <ChevronRight size={18} color={Colors.textTertiary} strokeWidth={2.25} />
    </View>
    <Text style={styles.channelTitle}>{title}</Text>
    <Text style={styles.channelSubtitle}>{subtitle}</Text>
  </Pressable>
);

const TopicRow: React.FC<{
  topic: Topic;
  onPress: () => void;
}> = ({ topic, onPress }) => {
  const Icon = topic.Icon;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.topicRow, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${topic.title}. ${topic.subtitle}`}
    >
      <View style={[styles.topicIconTile, { backgroundColor: topic.iconBg }]}>
        <Icon size={20} color={topic.iconFg} strokeWidth={2.25} />
      </View>
      <View style={styles.topicTextCol}>
        <Text style={styles.topicTitle}>{topic.title}</Text>
        <Text style={styles.topicSubtitle} numberOfLines={2}>
          {topic.subtitle}
        </Text>
      </View>
      <ChevronRight size={20} color={Colors.textTertiary} strokeWidth={2.25} />
    </Pressable>
  );
};

/* =================================================================
 * Styles
 * ================================================================= */

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },

  /* ── Hero banner ───────────────────────────────────────────── */
  hero: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryTint,
  },
  heroLeft: {
    flex: 1.4,
    gap: Spacing.xs,
  },
  heroKicker: {
    ...Typography.caption,
    color: Colors.primaryDark,
    fontWeight: '800',
    letterSpacing: 1,
    includeFontPadding: false,
  },
  heroTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: '800',
    lineHeight: 26,
  },
  heroBody: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  heroDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xs,
  },
  heroRight: {
    flex: 1,
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  heroBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroBulletText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
  },
  heroTagline: {
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  heroTaglineRule: {
    width: 24,
    height: 2,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
  },
  heroTaglineText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },

  /* ── Section head (title + trailing pill / hint) ──────────── */
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: '800',
    flexShrink: 1,
  },
  sectionHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flexShrink: 1,
    textAlign: 'right',
  },
  availPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.circle,
    backgroundColor: Colors.surfaceMuted,
  },
  availPillText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '700',
    includeFontPadding: false,
  },

  /* ── Contact channel grid (2×2) ───────────────────────────── */
  channelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  channelTile: {
    // Two columns with the row `gap: Spacing.sm` between them.
    // `basis: 48%` + `flexGrow: 1` lets the tiles absorb any rounding
    // slack while staying 2-up on every phone width.
    flexBasis: '48%',
    flexGrow: 1,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    gap: 4,
  },
  channelHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  channelIconTile: {
    width: 40,
    height: 40,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  channelSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  /* ── Topic list (full-width outlined rows) ────────────────── */
  topicList: {
    gap: Spacing.sm,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  topicIconTile: {
    width: 44,
    height: 44,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicTextCol: {
    flex: 1,
    gap: 2,
  },
  topicTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  topicSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  pressed: {
    opacity: 0.85,
  },
});
