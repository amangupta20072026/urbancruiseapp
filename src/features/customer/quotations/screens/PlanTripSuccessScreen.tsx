/**
 * ------------------------------------------------------------------
 * PlanTripSuccessScreen  (Customer)
 * ------------------------------------------------------------------
 * Shown after "Plan a Trip" is submitted. Confirms the request was
 * received, shows the request number and trip, and tells the
 * customer what happens next: our travel expert calls them, prepares
 * the quotation, and the quotation appears in the Quotations tab.
 *
 * ROUTE CONTRACT:
 *   Registered as "QuotationSuccess". params.requestId is the trip
 *   request id from PlanTripScreen; the request number and trip are
 *   read from the Plan a Trip store. If the request can't be found,
 *   the screen still works and shows the id it was given.
 *
 * CTAs:
 *   "View My Requests" → Quotations tab (the request is listed there)
 *   "Back to Home"     → Home tab
 *   Both reset the stack, so Back never returns to this screen.
 *
 * LAYOUT — single viewport, no scroll. CTAs are pinned to the bottom
 * with `marginTop: 'auto'`; any new block must trim another one.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CommonActions,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Check,
  ChevronRight,
  ClipboardCheck,
  Copy,
  FileText,
  PhoneCall,
} from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import { SafeScreen } from '@shared/components';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import type { CustomerStackParamList } from '@navigation/types';

import { formatPickup, getTripRequest, routeLabel } from '../planTrip';

type Nav = NativeStackNavigationProp<
  CustomerStackParamList,
  'QuotationSuccess'
>;
type Rt = RouteProp<CustomerStackParamList, 'QuotationSuccess'>;

const COPIED_FEEDBACK_MS = 1500;

const STEPS: readonly { title: string; body: string }[] = [
  {
    title: 'Our travel expert calls you',
    body: 'We will call you on your registered mobile number to understand your plan.',
  },
  {
    title: 'We prepare your quotation',
    body: 'We will find the right vehicle and the best price for your trip.',
  },
  {
    title: 'See it in the app',
    body: 'Your quotation will appear in the Quotations tab.',
  },
];

const PlanTripSuccessScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { requestId } = params;

  const request = getTripRequest(requestId);
  const displayNumber = request?.requestNumber ?? requestId;
  const tripSummary = request
    ? `${routeLabel(request)} · ${formatPickup(request.pickupAt)}`
    : null;

  /* Copy feedback: the icon flips to a check for a short time. The
   * timer is cleared on unmount so it never sets state afterwards. */
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const onCopy = useCallback(() => {
    Clipboard.setString(displayNumber);
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  }, [displayNumber]);

  const resetToTab = useCallback(
    (tab: 'Home' | 'Quotations') => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'CustomerTabs',
              state: {
                index: 0,
                routes: [{ name: tab }],
              },
            },
          ],
        }),
      );
    },
    [navigation],
  );

  const goToQuotationsTab = useCallback(
    () => resetToTab('Quotations'),
    [resetToTab],
  );
  const goToHome = useCallback(() => resetToTab('Home'), [resetToTab]);

  return (
    <SafeScreen edges={['top', 'bottom']} backgroundColor={Colors.background}>
      <View style={styles.container}>
        {/* ── Brand mark ─────────────────────────────────── *
         * ucwithtext.png has transparent padding baked into the
         * canvas; the clip view shows only the visible band (same
         * trick as AppHeader). See the brand* styles below.
         * -------------------------------------------------- */}
        <View style={styles.brandWrap}>
          <View style={styles.brandClip}>
            <Image
              source={require('@assets/icons/ucwithtext.png')}
              style={styles.brandImage}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel="Urban Cruise"
            />
          </View>
        </View>

        {/* ── Hero illustration ──────────────────────────── */}
        <View style={styles.heroIllustration}>
          <View style={styles.heroBadge}>
            <PhoneCall size={44} color={Colors.primary} strokeWidth={1.5} />
            <View style={styles.heroCheck}>
              <Check size={16} color={Colors.textOnPrimary} strokeWidth={3} />
            </View>
          </View>
        </View>

        {/* ── Title + copy ───────────────────────────────── */}
        <Text style={styles.title}>Request Received</Text>
        <Text style={styles.subtitle}>
          Thank you for choosing Urban Cruise. Our travel expert will call you
          soon to plan your trip.
        </Text>

        {/* ── Request number card ────────────────────────── */}
        <View style={styles.requestIdCard}>
          <View style={styles.requestIdIcon}>
            <FileText size={22} color={Colors.accent} strokeWidth={2} />
          </View>
          <View style={styles.requestIdBody}>
            <Text style={styles.requestIdLabel}>Request ID</Text>
            <Text style={styles.requestIdValue}>{displayNumber}</Text>
            {tripSummary ? (
              <Text style={styles.requestTrip} numberOfLines={1}>
                {tripSummary}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={onCopy}
            hitSlop={8}
            style={({ pressed }) => [styles.copyBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Copy request id"
          >
            {copied ? (
              <ClipboardCheck
                size={16}
                color={Colors.primary}
                strokeWidth={2}
              />
            ) : (
              <Copy size={16} color={Colors.textSecondary} strokeWidth={2} />
            )}
            <Text
              style={[styles.copyBtnText, copied && styles.copyBtnTextActive]}
            >
              {copied ? 'Copied' : 'Copy'}
            </Text>
          </Pressable>
        </View>

        {/* ── What happens next ──────────────────────────── */}
        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>What happens next?</Text>

          {STEPS.map((step, i) => {
            const isLast = i === STEPS.length - 1;
            return (
              <View key={step.title} style={styles.stepRow}>
                <View style={styles.stepGutter}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                  </View>
                  {!isLast ? <View style={styles.stepConnector} /> : null}
                </View>
                <View style={[styles.stepBody, isLast && styles.stepBodyLast]}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepText}>{step.body}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── CTAs (pinned to bottom via marginTop: 'auto') ─ */}
        <View style={styles.ctaStack}>
          <Pressable
            onPress={goToQuotationsTab}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>View My Requests</Text>
            <ChevronRight
              size={18}
              color={Colors.textOnPrimary}
              strokeWidth={2.5}
            />
          </Pressable>

          <Pressable
            onPress={goToHome}
            style={({ pressed }) => [
              styles.outlineBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.outlineBtnText}>Back to Home</Text>
          </Pressable>
        </View>
      </View>
    </SafeScreen>
  );
};

export default PlanTripSuccessScreen;

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },

  /* Brand — canvas 2376×2091, visible band 2376×1125 starting at
   * row 651. BRAND width 140 drives the other three numbers. */
  brandWrap: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  brandClip: {
    width: 140,
    height: 66, // 140 × 1125/2376 ≈ 66 (visible band height)
    overflow: 'hidden',
  },
  brandImage: {
    width: 140,
    height: 123, // 140 × 2091/2376 ≈ 123 (full scaled canvas)
    marginTop: -38, // 140 × 651/2376 ≈ 38 (top padding to hide)
  },

  /* Hero illustration */
  heroIllustration: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    height: 96,
  },
  heroBadge: {
    width: 88,
    height: 88,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCheck: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: Colors.background,
  },

  /* Title */
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 32,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 18,
    paddingHorizontal: Spacing.sm,
  },

  /* Request number card */
  requestIdCard: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: '#FFF6E6', // warm cream, same as the old success pill
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  requestIdIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestIdBody: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
  },
  requestIdLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  requestIdValue: {
    ...Typography.subtitle,
    color: Colors.primary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  requestTrip: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  copyBtnText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  copyBtnTextActive: {
    color: Colors.primary,
  },

  /* Steps card */
  stepsCard: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryTint,
  },
  stepsTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  stepGutter: {
    alignItems: 'center',
    width: 28,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    ...Typography.caption,
    color: Colors.textOnPrimary,
    fontWeight: '800',
  },
  stepConnector: {
    flex: 1,
    width: 2,
    marginTop: 2,
    backgroundColor: Colors.primary,
    opacity: 0.35,
  },
  stepBody: {
    flex: 1,
    paddingBottom: Spacing.sm,
    gap: 2,
  },
  stepBodyLast: {
    paddingBottom: 0,
  },
  stepTitle: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  stepText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 15,
  },

  /* CTAs */
  ctaStack: {
    marginTop: 'auto',
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  primaryBtn: {
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  primaryBtnText: {
    ...Typography.button,
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },
  outlineBtn: {
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    ...Typography.button,
    color: Colors.primary,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
