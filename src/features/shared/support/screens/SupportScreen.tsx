/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * SupportScreen — Production
 * ------------------------------------------------------------------
 * Reached from the "Contact Support" link on LoginScreen (and from
 * any other stack that declares a `Support` route). Presents three
 * contact channels — phone call, WhatsApp chat, and email — each
 * opening the relevant native intent via `Linking`.
 *
 * All contact details are centralized in `SUPPORT_CONTACT` below —
 * update those constants once real support numbers/email are
 * available.
 *
 * ------------------------------------------------------------------
 * HEADER PATTERN
 * ------------------------------------------------------------------
 * Uses the app-wide `SafeScreen` + `ScreenHeader` combo — same as
 * every other stack screen (Profile, Settings, NotificationCentre,
 * Referrals, CustomerFeedback, UC's Vendors/Payments/Drivers/…).
 * That gives one predictable header identity across the app.
 *
 * The screen's own "We're here to help, 24/7" hero sits BELOW the
 * ScreenHeader as feature content — not as a title. It's yielded
 * to h3-scale so the visual hierarchy reads:
 *
 *   ScreenHeader ("Contact Support", h1) → screen identity
 *     Hero ("We're here to help, 24/7", h3, accent)      → value prop
 *       Section label → Cards → Trust strip              → content
 *
 * Do NOT fold the hero into ScreenHeader.subtitle — it can't carry
 * the "24/7" accent, and rightSlot isn't sized for an 84×84
 * illustration.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useState } from 'react';
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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import {
  Colors,
  Dimensions,
  Radius,
  Shadows,
  Spacing,
  Typography,
} from '../../../../theme';
import { withAlpha } from '../../../../components/roles';
import { SafeScreen, ScreenHeader } from '@shared/components';
import type { AuthParamList } from '../../../../navigation/types';

/* -----------------------------------------------------------------
 * Contact config
 * ----------------------------------------------------------------- */

const SUPPORT_CONTACT = {
  phone: '+919355992138',
  whatsapp: '919355992138', // no '+', no leading zeros — wa.me format
  email: 'india.urbancruise03@gmail.com',
  whatsappPrefill: 'Hi Urban Cruise, I need help with...',
  emailSubject: 'Support Request',
};

/* -----------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------- */

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
 * Icons
 * ----------------------------------------------------------------- */

type IconProps = { color: string; size: number };

const HeadsetIcon: React.FC<IconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 13v-1a8 8 0 0 1 16 0v1"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Path
      d="M4 13.5a2 2 0 0 1 2-2h1a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2v-2Z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Path
      d="M20 13.5a2 2 0 0 0-2-2h-1a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1a2 2 0 0 0 2-2v-2Z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Path
      d="M18 17.5v.5a3 3 0 0 1-3 3h-2"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Circle cx={17.5} cy={20.2} r={0.2} fill={color} />
  </Svg>
);

const PhoneCallIcon: React.FC<IconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 4.5c0-.6.4-1 1-1h2.4c.4 0 .8.3.9.7l1.2 3.5c.2.4 0 .9-.3 1.2l-1.5 1.3a12 12 0 0 0 5.1 5.1l1.3-1.5c.3-.3.8-.5 1.2-.3l3.5 1.2c.4.1.7.5.7.9V18c0 .6-.4 1-1 1a15.5 15.5 0 0 1-14.5-14.5z"
      stroke={color}
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
  </Svg>
);

const WhatsAppIcon: React.FC<IconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Z"
      stroke={color}
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
    <Path
      d="M8.7 8.3c.2-.4.4-.5.6-.5h.5c.2 0 .4 0 .5.4.2.5.6 1.6.7 1.7.1.1.1.3 0 .5-.1.1-.1.2-.3.4-.1.2-.3.3-.4.5-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1.2-.2.7-.8.9-1.1.2-.2.4-.2.6-.1.2.1 1.5.7 1.8.9.3.1.4.2.5.3.1.2.1.9-.2 1.6-.3.7-1.6 1.4-2.2 1.4-.6.1-1.3.1-4.2-1.1-3.5-1.5-5.7-5-5.9-5.3-.2-.3-1.4-1.9-1.4-3.6 0-1.7.9-2.5 1.2-2.9Z"
      stroke={color}
      strokeWidth={1.3}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </Svg>
);

const MailIcon: React.FC<IconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 6.5h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-11Z"
      stroke={color}
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
    <Path
      d="m4.5 7 7 5.5 7-5.5"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ShieldCheckIcon: React.FC<IconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2.5 4.5 5.2v6c0 4.9 3.2 9.3 7.5 10.5 4.3-1.2 7.5-5.6 7.5-10.5v-6L12 2.5z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Path
      d="m8.75 12 2.25 2.25L15.5 9.75"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const UcWatermarkIcon: React.FC<IconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 5v7a6 6 0 0 0 12 0V5"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
    />
  </Svg>
);

/* -----------------------------------------------------------------
 * Contact card
 * ----------------------------------------------------------------- */

type ContactCardVariant = 'filled' | 'outline';

type ContactCardProps = {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaIcon: React.ReactNode;
  ctaColor: string;
  variant: ContactCardVariant;
  onPress: () => void;
  accessibilityLabel: string;
  delay: number;
};

const DESCRIPTION_LINE_LIMIT = 2;

const ContactCard: React.FC<ContactCardProps> = ({
  icon,
  iconBg,
  title,
  description,
  ctaLabel,
  ctaIcon,
  ctaColor,
  variant,
  onPress,
  accessibilityLabel,
  delay,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);

  const handleToggleExpand = useCallback(() => {
    if (!expanded && !isTruncated) return;
    setExpanded(prev => !prev);
  }, [expanded, isTruncated]);

  const handleTextLayout = useCallback(
    (e: { nativeEvent: { lines: Array<unknown> } }) => {
      if (!expanded && e.nativeEvent.lines.length > DESCRIPTION_LINE_LIMIT) {
        setIsTruncated(true);
      }
    },
    [expanded],
  );

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(400)}>
      <View style={styles.card}>
        <View style={[styles.cardIconWrap, { backgroundColor: iconBg }]}>
          {icon}
        </View>

        <Pressable
          style={styles.cardBody}
          onPress={handleToggleExpand}
          disabled={!expanded && !isTruncated}
          accessibilityRole={isTruncated ? 'button' : undefined}
          accessibilityLabel={
            isTruncated
              ? `${title}. ${expanded ? 'Show less' : 'Show more'}`
              : undefined
          }
        >
          <Text style={styles.cardTitle}>{title}</Text>
          <Text
            style={styles.cardDesc}
            numberOfLines={expanded ? undefined : DESCRIPTION_LINE_LIMIT}
            ellipsizeMode="tail"
            onTextLayout={handleTextLayout}
          >
            {description}
          </Text>
          {isTruncated && (
            <Text style={styles.cardMoreText}>
              {expanded ? 'Show less' : 'Read more'}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={onPress}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={({ pressed }) => [
            styles.cardCta,
            variant === 'filled'
              ? { backgroundColor: ctaColor }
              : {
                  backgroundColor: Colors.background,
                  borderWidth: 1.5,
                  borderColor: ctaColor,
                },
            pressed && styles.cardCtaPressed,
          ]}
        >
          {ctaIcon}
          <Text
            style={[
              styles.cardCtaText,
              { color: variant === 'filled' ? Colors.textInverse : ctaColor },
            ]}
          >
            {ctaLabel}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

/* -----------------------------------------------------------------
 * Screen
 * ----------------------------------------------------------------- */

type SupportNavProp = NativeStackNavigationProp<AuthParamList, 'Support'>;

const SupportScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<SupportNavProp>();

  // Bottom pad on the scroll content only — SafeScreen owns the top
  // inset, but scroll content must clear the home indicator / nav bar
  // on its own so long content doesn't collide with system chrome.
  const bottomPad = Math.max(insets.bottom, Spacing.lg);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const handleCall = useCallback(() => {
    void openLink(
      `tel:${SUPPORT_CONTACT.phone}`,
      'Calling is not supported on this device.',
    );
  }, []);

  const handleWhatsApp = useCallback(() => {
    const text = encodeURIComponent(SUPPORT_CONTACT.whatsappPrefill);
    void openLink(
      `whatsapp://send?phone=${SUPPORT_CONTACT.whatsapp}&text=${text}`,
      'WhatsApp is not installed on this device.',
    );
  }, []);

  const handleEmail = useCallback(() => {
    const subject = encodeURIComponent(SUPPORT_CONTACT.emailSubject);
    void openLink(
      `mailto:${SUPPORT_CONTACT.email}?subject=${subject}`,
      'No email app is configured on this device.',
    );
  }, []);

  return (
    <SafeScreen edges={['top']}>
      {/* App-standard header — same identity across every stack screen. */}
      <View style={styles.headerWrap}>
        <ScreenHeader title="Contact Support" onBack={handleBack} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — value prop, not screen title. Yields hierarchy to
            the ScreenHeader above by sitting at h3 scale, not h1. */}
        <Animated.View
          entering={FadeInDown.delay(60).duration(400)}
          style={styles.hero}
        >
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>
              We&apos;re here to help,{'\n'}
              <Text style={styles.heroTitleAccent}>24/7</Text>
            </Text>
            <Text style={styles.heroSubtitle}>
              Reach out to our support team for any assistance. We&apos;ll get
              back to you as soon as possible.
            </Text>
          </View>
          <View style={styles.heroIconWrap}>
            <HeadsetIcon color={Colors.primary} size={44} />
          </View>
        </Animated.View>

        {/* Section label */}
        <Animated.View entering={FadeInDown.delay(120).duration(400)}>
          <Text style={styles.sectionLabel}>Talk to Us</Text>
        </Animated.View>

        {/* Call */}
        <ContactCard
          delay={160}
          icon={<PhoneCallIcon color={Colors.primary} size={22} />}
          iconBg={withAlpha(Colors.primary, 0.12)}
          title="Call Us"
          description="Speak directly with our support executives."
          ctaLabel="Call Now"
          ctaIcon={<PhoneCallIcon color={Colors.textInverse} size={15} />}
          ctaColor={Colors.primary}
          variant="filled"
          onPress={handleCall}
          accessibilityLabel="Call support"
        />

        {/* WhatsApp */}
        <ContactCard
          delay={220}
          icon={<WhatsAppIcon color={Colors.primary} size={22} />}
          iconBg={withAlpha(Colors.primary, 0.12)}
          title="Chat on WhatsApp"
          description="Get quick help on WhatsApp."
          ctaLabel="Chat Now"
          ctaIcon={<WhatsAppIcon color={Colors.primary} size={15} />}
          ctaColor={Colors.primary}
          variant="outline"
          onPress={handleWhatsApp}
          accessibilityLabel="Chat with support on WhatsApp"
        />

        {/* Email */}
        <ContactCard
          delay={280}
          icon={<MailIcon color={Colors.accent} size={22} />}
          iconBg={withAlpha(Colors.accent, 0.12)}
          title="Email Us"
          description="Send us your query and we'll reply soon."
          ctaLabel="Send Email"
          ctaIcon={<MailIcon color={Colors.accent} size={15} />}
          ctaColor={Colors.accent}
          variant="outline"
          onPress={handleEmail}
          accessibilityLabel="Email support"
        />

        {/* Trust strip */}
        <Animated.View
          entering={FadeInUp.delay(340).duration(400)}
          style={styles.trustStrip}
        >
          <View style={styles.trustIconWrap}>
            <ShieldCheckIcon color={Colors.primary} size={20} />
          </View>
          <View style={styles.trustTextWrap}>
            <Text style={styles.trustTitle}>
              Your safety and satisfaction are our top priorities.
            </Text>
            <Text style={styles.trustSubtitle}>
              All your conversations are secure and confidential.
            </Text>
          </View>
          <View style={styles.trustWatermark}>
            <UcWatermarkIcon
              color={withAlpha(Colors.primary, 0.18)}
              size={40}
            />
          </View>
        </Animated.View>
      </ScrollView>
    </SafeScreen>
  );
};

export default SupportScreen;

/* -----------------------------------------------------------------
 * Styles
 * ----------------------------------------------------------------- */

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  /* ScreenHeader wrapper — matches every other stack screen's
     header padding (Spacing.md horizontal, Spacing.sm top). */
  headerWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },

  scroll: {
    paddingHorizontal: Dimensions.screenHorizontalPadding,
    paddingTop: Spacing.lg,
  },

  /* Hero — yielded from h1 (26/32) to h3 (22/28) so the ScreenHeader
     above owns "screen identity" and the hero owns "value prop." */
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 22,
    lineHeight: 28,
  },
  heroTitleAccent: {
    color: Colors.primary,
  },
  heroSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  heroIconWrap: {
    width: 84,
    height: 84,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(Colors.primary, 0.1),
  },

  /* Section label */
  sectionLabel: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: Spacing.md,
  },

  /* Contact card */
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 14,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    minHeight: 116,
    ...Shadows.xs,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  cardDesc: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 18,
    minHeight: 18 * DESCRIPTION_LINE_LIMIT,
  },
  cardMoreText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  cardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    height: 38,
    borderRadius: Radius.md,
  },
  cardCtaPressed: {
    opacity: 0.85,
  },
  cardCtaText: {
    ...Typography.button,
    fontSize: 13,
    fontWeight: '700',
  },

  /* Trust strip */
  trustStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: withAlpha(Colors.primary, 0.06),
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  trustIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  trustTextWrap: {
    flex: 1,
  },
  trustTitle: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '700',
    lineHeight: 18,
  },
  trustSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  trustWatermark: {
    position: 'absolute',
    right: -8,
    bottom: -6,
  },
});