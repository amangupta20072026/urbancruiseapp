/**
 * ------------------------------------------------------------------
 * ReferralsScreen (Customer) — STACK SCREEN
 * ------------------------------------------------------------------
 * Pushed from the Customer More sheet ("Referral & Rewards" tile).
 *
 * LAYOUT (top → bottom):
 *   [Back  Referral & Rewards  subtitle]
 *   [Hero card — copy + gift illustration]
 *     └─ [Referral code chip + Share Now]
 *   [How It Works? — 3 steps]
 *   [Your Rewards summary card]
 *   [Recent Rewards list  (View All)]
 *   [More ways to earn rewards promo]
 *
 * DATA:
 *   Local mock fixture in `../mocks.ts` — code, total earned, and
 *   3 sample rewards. Swap for a TanStack Query hook when the
 *   endpoints ship.
 *
 * NAVIGATION INTENTS (all TODO(nav)):
 *   - Copy code   — visual-only feedback for now; clipboard native
 *                    module is not currently a dep. Same treatment
 *                    as QuotationSuccess.
 *   - Share Now   — TODO(nav): react-native Share.share() when the
 *                    referral deeplink URL is wired
 *   - Reward row  — TODO(nav): reward detail (not scoped yet)
 *   - View All    — TODO(nav): full rewards history screen
 *   - More ways   — TODO(nav): campaigns / earning-tips screen
 * ------------------------------------------------------------------
 */

import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowRight,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Gift,
  Send,
  Share2,
  UserPlus,
} from 'lucide-react-native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

import { MOCK_RECENT_REWARDS, MOCK_REFERRAL_SUMMARY } from '../mocks';
import { RewardRow } from '../components/RewardRow';

/* Local purple pair — the "Total rewards" tile's gift icon in the
 * mockup uses green; the campaign icon uses purple (handled inside
 * RewardRow). Nothing else on this screen needs purple. */

/* ================================================================
 * Screen
 * ================================================================ */

const ReferralsScreen: React.FC = () => {
  const navigation = useNavigation();

  const [copied, setCopied] = useState(false);

  /* -------- Handlers -------- */

  /**
   * Copy-to-clipboard is intentionally not wired: the app doesn't
   * currently depend on @react-native-clipboard/clipboard, and
   * adding a native module for a single button would be
   * disproportionate. The icon flips to a check for ~1.5s to give
   * the user visual feedback. Same treatment as QuotationSuccess.
   */
  const onCopyCode = useCallback(() => {
    setCopied(true);
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, []);

  const onShare = useCallback(() => {
    // TODO(nav): react-native Share.share({ message: `Use my Urban
    // Cruise code ${MOCK_REFERRAL_SUMMARY.code} …` }) once the
    // referral deeplink URL is wired.
  }, []);

  const onRewardPress = useCallback((_id: string) => {
    // TODO(nav): open reward detail
  }, []);
  const onViewAllRewards = useCallback(() => {
    // TODO(nav): full rewards history
  }, []);
  const onYourRewardsPress = useCallback(() => {
    // TODO(nav): rewards wallet
  }, []);
  const onMoreWaysPress = useCallback(() => {
    // TODO(nav): campaigns / earning tips
  }, []);

  /* -------- Render -------- */

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Referral & Rewards"
          subtitle="Invite your friends and earn rewards"
          onBack={() => navigation.goBack()}
        />
      </View>

      <ScrollView
        style={styles.scrollBg}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero card ─────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>
                Travel Together{'\n'}
                <Text style={styles.heroTitleAccent}>Earn Together!</Text>
              </Text>
              <Text style={styles.heroSubtitle}>
                Invite your friends to book with us and get exciting rewards.
              </Text>
            </View>
            {/* Illustration slot — no real asset yet; a large Gift
                icon inside a decorative circle stands in for it.
                Swap for <Image /> when the illustration lands. */}
            <View style={styles.heroIllustration}>
              <View style={styles.heroIllustrationCircle}>
                <Gift size={44} color={Colors.primary} strokeWidth={2} />
              </View>
            </View>
          </View>

          {/* Referral code + Share row */}
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Your Referral Code</Text>
            <View style={styles.codeRow}>
              <Pressable
                onPress={onCopyCode}
                style={({ pressed }) => [
                  styles.codeChip,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Copy referral code"
              >
                <Text style={styles.codeText}>
                  {MOCK_REFERRAL_SUMMARY.code}
                </Text>
                {copied ? (
                  <ClipboardCheck
                    size={18}
                    color={Colors.primary}
                    strokeWidth={2}
                  />
                ) : (
                  <Copy
                    size={18}
                    color={Colors.textSecondary}
                    strokeWidth={2}
                  />
                )}
              </Pressable>
              <Pressable
                onPress={onShare}
                style={({ pressed }) => [
                  styles.shareBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Share referral code"
              >
                <Share2
                  size={16}
                  color={Colors.textOnPrimary}
                  strokeWidth={2.5}
                />
                <Text style={styles.shareBtnText}>Share Now</Text>
              </Pressable>
            </View>
            <Text style={styles.codeHint}>
              Share your code with friends and earn rewards when they complete
              their first booking.
            </Text>
          </View>
        </View>

        {/* ── How It Works? ─────────────────────────────── */}
        <Text style={styles.sectionTitle}>How It Works?</Text>
        <View style={styles.stepsRow}>
          <HowStep
            n={1}
            Icon={Send}
            fg={Colors.primary}
            bg={Colors.primaryTint}
            badgeBg={Colors.primary}
            title="Invite"
            body="Share your referral code with friends"
          />
          <Arrow />
          <HowStep
            n={2}
            Icon={UserPlus}
            fg={Colors.info}
            bg={Colors.infoTint}
            badgeBg={Colors.info}
            title="They Book"
            body="Your friend completes their first booking"
          />
          <Arrow />
          <HowStep
            n={3}
            Icon={Gift}
            fg={Colors.accent}
            bg={Colors.accentTint}
            badgeBg={Colors.accent}
            title="You Earn"
            body="Get rewards in your wallet"
          />
        </View>

        {/* ── Your Rewards summary ──────────────────────── */}
        <Pressable
          onPress={onYourRewardsPress}
          style={({ pressed }) => [
            styles.summaryCard,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Your rewards"
        >
          <View style={styles.summaryIcon}>
            <Gift size={22} color={Colors.primary} strokeWidth={2} />
          </View>
          <View style={styles.summaryBody}>
            <Text style={styles.summaryTitle}>Your Rewards</Text>
            <Text style={styles.summarySub}>Total rewards earned</Text>
          </View>
          <Text style={styles.summaryAmount}>
            ₹{MOCK_REFERRAL_SUMMARY.totalEarned.toLocaleString('en-IN')}
          </Text>
          <ChevronRight size={18} color={Colors.primary} strokeWidth={2} />
        </Pressable>

        {/* ── Recent Rewards ────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Rewards</Text>
          <Pressable
            onPress={onViewAllRewards}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
            accessibilityRole="button"
          >
            <Text style={styles.viewAll}>View All</Text>
          </Pressable>
        </View>
        <View style={styles.rewardsList}>
          {MOCK_RECENT_REWARDS.map(item => (
            <RewardRow
              key={item.id}
              item={item}
              onPress={() => onRewardPress(item.id)}
            />
          ))}
        </View>

        {/* ── More ways promo ───────────────────────────── */}
        <Pressable
          onPress={onMoreWaysPress}
          style={({ pressed }) => [styles.promoCard, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <View style={styles.promoIcon}>
            <Gift size={22} color={Colors.error} strokeWidth={2} />
          </View>
          <View style={styles.promoBody}>
            <Text style={styles.promoTitle}>More ways to earn rewards</Text>
            <Text style={styles.promoSub}>
              Keep referring and look out for special offers!
            </Text>
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} strokeWidth={2} />
        </Pressable>
      </ScrollView>
    </SafeScreen>
  );
};

export default ReferralsScreen;

/* ================================================================
 * Subcomponents (local — no reuse outside this screen)
 * ================================================================ */

type IconComp = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

const HowStep: React.FC<{
  n: number;
  Icon: IconComp;
  fg: string;
  bg: string;
  badgeBg: string;
  title: string;
  body: string;
}> = ({ n, Icon, fg, bg, badgeBg, title, body }) => (
  <View style={styles.step}>
    <View style={styles.stepIconWrap}>
      <View style={[styles.stepIcon, { backgroundColor: bg }]}>
        <Icon size={26} color={fg} strokeWidth={2} />
      </View>
      <View style={[styles.stepBadge, { backgroundColor: badgeBg }]}>
        <Text style={styles.stepBadgeText}>{n}</Text>
      </View>
    </View>
    <Text style={styles.stepTitle}>{title}</Text>
    <Text style={styles.stepBody} numberOfLines={3}>
      {body}
    </Text>
  </View>
);

const Arrow: React.FC = () => (
  <View style={styles.arrow}>
    <ArrowRight size={18} color={Colors.textTertiary} strokeWidth={2} />
  </View>
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
  scrollBg: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxxl,
    gap: Spacing.lg,
  },

  /* Hero card */
  hero: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryTint,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.sm,
  },
  heroTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: '800',
    lineHeight: 30,
  },
  heroTitleAccent: {
    color: Colors.primary,
  },
  heroSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  heroIllustration: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIllustrationCircle: {
    width: 88,
    height: 88,
    borderRadius: Radius.circle,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },

  /* Code card (nested in hero) */
  codeCard: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
  },
  codeLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  codeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  codeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  codeText: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    letterSpacing: 1,
    flex: 1,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    ...Shadows.xs,
  },
  shareBtnText: {
    ...Typography.bodySmall,
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },
  codeHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 16,
  },

  /* Section title */
  sectionTitle: {
    ...Typography.h5,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewAll: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '700',
  },

  /* How It Works — 3-step row */
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 4,
  },
  step: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  stepIconWrap: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIcon: {
    width: 60,
    height: 60,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    width: 22,
    height: 22,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  stepBadgeText: {
    ...Typography.caption,
    color: Colors.textOnPrimary,
    fontWeight: '800',
    includeFontPadding: false,
  },
  stepTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '800',
    textAlign: 'center',
  },
  stepBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  arrow: {
    height: 68,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },

  /* Rewards summary */
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryTint,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.circle,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBody: {
    flex: 1,
    gap: 1,
  },
  summaryTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  summarySub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  summaryAmount: {
    ...Typography.h5,
    color: Colors.primary,
    fontWeight: '800',
  },

  /* Rewards list */
  rewardsList: {
    gap: Spacing.sm,
  },

  /* More-ways promo */
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.errorTint,
  },
  promoIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.circle,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoBody: {
    flex: 1,
    gap: 2,
  },
  promoTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  promoSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 16,
  },

  pressed: {
    opacity: 0.85,
  },
});
