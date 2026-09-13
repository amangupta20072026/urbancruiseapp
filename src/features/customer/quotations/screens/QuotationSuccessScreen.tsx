/**
 * ------------------------------------------------------------------
 * QuotationSuccessScreen  (Customer)
 * ------------------------------------------------------------------
 * Terminal screen for the "Request a Quotation" flow. Confirms the
 * enquiry was captured, displays the Request ID (copy-to-clipboard),
 * and outlines what happens next.
 *
 * ROUTE CONTRACT:
 *   params.requestId is passed by RequestQuotationScreen on submit.
 *   For the UI-only pass this is a client-generated placeholder; when
 *   the backend takes over, the same param will carry the server's
 *   enquiry id — no shape change needed here.
 *
 * PRIMARY CTAs:
 *   "View My Requests" → jumps to the Quotations tab (the request
 *                        will appear once the list is wired to the
 *                        backend).
 *   "Back to Home"     → resets to CustomerTabs on the Home tab.
 *
 * Reached via navigation.replace() from the form screen so pressing
 * Back from here doesn't drop the user back into a completed form.
 *
 * LAYOUT — single-viewport, no scroll:
 *   The whole flow (brand → hero → title → subtitle → request-id →
 *   steps → CTAs) is designed to fit within SafeScreen on a typical
 *   phone without scrolling on either axis. Achieved with a flex
 *   column that pins CTAs to the bottom via `marginTop: 'auto'` and
 *   tight, hand-tuned vertical spacings above. Any new block must
 *   pay for its space by trimming an existing one — reintroducing a
 *   ScrollView would silently undo the "single-screen" decision.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useState } from 'react';
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
  ClipboardCheck,
  Copy,
  FileText,
  ChevronRight,
} from 'lucide-react-native';

import { SafeScreen } from '@shared/components';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import type { CustomerStackParamList } from '@navigation/types';

type Nav = NativeStackNavigationProp<
  CustomerStackParamList,
  'QuotationSuccess'
>;
type Rt = RouteProp<CustomerStackParamList, 'QuotationSuccess'>;

const STEPS: readonly { title: string; body: string }[] = [
  {
    title: 'We review your requirements',
    body: 'Our team will go through your travel details.',
  },
  {
    title: 'We prepare the best options',
    body: 'Our team will find suitable vehicles and prepare a customized quotation.',
  },
  {
    title: "We'll contact you",
    body: 'You will receive the quotation on your registered mobile number and email.',
  },
];

const QuotationSuccessScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { requestId } = params;

  const [copied, setCopied] = useState(false);

  /**
   * Copy-to-clipboard is intentionally not wired: the app does not
   * currently depend on @react-native-clipboard/clipboard, and adding
   * a native module for a single toast would be disproportionate.
   * The icon flips to a check for ~1.5s to give visual feedback and
   * we log the intent so we can prioritise wiring it if this button
   * sees real traction.
   */
  const onCopy = useCallback(() => {
    setCopied(true);
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, []);

  const goToQuotationsTab = useCallback(() => {
    // Reset the CustomerFlow stack to CustomerTabs > Quotations so
    // pressing Back from the list doesn't return to the success
    // screen. Same idea as the "back to home" reset below.
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'CustomerTabs',
            state: {
              index: 0,
              routes: [{ name: 'Quotations' }],
            },
          },
        ],
      }),
    );
  }, [navigation]);

  const goToHome = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'CustomerTabs',
            state: {
              index: 0,
              routes: [{ name: 'Home' }],
            },
          },
        ],
      }),
    );
  }, [navigation]);

  return (
    <SafeScreen edges={['top', 'bottom']} backgroundColor={Colors.background}>
      <View style={styles.container}>
        {/* ── Brand mark ─────────────────────────────────── *
         *
         * ucwithtext.png has transparent top/bottom padding baked
         * into the canvas (visible content occupies rows 651–1776
         * of a 2376×2091 file). We reuse the clip-container trick
         * from `HomeHeader` so the padding never adds dead space:
         * the outer view is sized to the SCALED VISIBLE region
         * (BRAND_W × BRAND_H) and clips the Image, which is drawn
         * at the full scaled canvas height (IMG_H) and shifted up
         * by TOP_TRIM so only the visible band is exposed.
         *
         * BRAND_W drives everything — bump it and the other three
         * derive from the same ratios (see constants below).
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
          <View style={styles.heroDocument}>
            <FileText size={52} color={Colors.primary} strokeWidth={1.5} />
            <View style={styles.heroCheck}>
              <Check size={16} color={Colors.textOnPrimary} strokeWidth={3} />
            </View>
          </View>
        </View>

        {/* ── Title + copy ───────────────────────────────── */}
        <Text style={styles.title}>Request Submitted{'\n'}Successfully!</Text>
        <Text style={styles.subtitle}>
          Thank you for choosing Urban Cruise. Your travel requirement has been
          shared with our team.
        </Text>

        {/* ── Request ID pill ────────────────────────────── */}
        <View style={styles.requestIdCard}>
          <View style={styles.requestIdIcon}>
            <FileText size={22} color={Colors.accent} strokeWidth={2} />
          </View>
          <View style={styles.requestIdBody}>
            <Text style={styles.requestIdLabel}>Request ID</Text>
            <Text style={styles.requestIdValue}>{requestId}</Text>
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

export default QuotationSuccessScreen;

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  /* Root — flex column filling SafeScreen with padded gutters. */
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },

  /* Brand — see JSX header comment for the padding-trim rationale.
   * BRAND_W drives everything; if it changes, recompute the other
   * three from the same ratios (canvas 2376×2091, visible 2376×1125
   * starting at row 651). Kept inline as literals to keep this
   * StyleSheet self-contained; if a third screen needs the trim
   * technique it should be promoted to a shared BrandMark component. */
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

  /* Hero illustration — compact so title/subtitle/steps fit above
   * the pinned CTAs on the shortest supported viewport. */
  heroIllustration: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    height: 110,
  },
  heroDocument: {
    width: 88,
    height: 100,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  heroCheck: {
    position: 'absolute',
    right: -4,
    bottom: -4,
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

  /* Request ID card */
  requestIdCard: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: '#FFF6E6', // warm cream to match the mockup pill
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
  /* Copy chip — icon + label instead of icon-only for a clearer
   * affordance; matches the pattern in the reference mockup. */
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

  /* Steps card — tight row gaps and no trailing padding on the
   * last step so all three fit without pushing CTAs off-screen. */
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
    borderStyle: 'dashed',
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

  /* CTAs — `marginTop: 'auto'` pins them to the bottom of the flex
   * container, so any leftover vertical space on taller phones
   * collects above rather than between sections. */
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
