/**
 * ------------------------------------------------------------------
 * BookingProcessFab — floating "Booking process" button
 * ------------------------------------------------------------------
 * Sits bottom-right over the quotation scroll and opens
 * BookingProcessSheet.
 *
 *   on open        [ ⤳ Booking process ]
 *   after 5 s      [ ⤳ ]
 *
 * WHY IT STARTS LABELLED AND THEN COLLAPSES
 *   A bare circle at bottom-right is, in almost every app a customer
 *   uses, a CHAT button. This one opens a static explainer, and the
 *   app has real support elsewhere, so an unlabelled bubble on its
 *   own would send people looking for a human. Showing the label
 *   first teaches what the button is; collapsing afterwards hands the
 *   width back to the quotation, which is what the customer actually
 *   came to read.
 *
 *   It collapses ONCE, on mount. It does not re-expand on scroll or
 *   when the screen regains focus — a control that keeps growing and
 *   shrinking under the thumb is worse than either state.
 *
 * ICON — THE SAME `Route` AS TRAVEL ITINERARY
 *   QuotationTripCard uses `Route` beside the "N stops" count. This
 *   button uses the SAME icon on purpose: both point at the shape of
 *   the journey, so one screen teaches the customer one glyph rather
 *   than two.
 *
 *   If this is ever changed, change it in both places or neither —
 *   see `Route` in components/QuotationTripCard.tsx.
 *
 * HOW THE COLLAPSE IS DONE
 *   The label's wrapper is measured once on first layout, then its
 *   width is animated to 0 with `overflow: 'hidden'`. Because the
 *   pill's horizontal padding is exactly (PILL_SIZE - ICON_SIZE) / 2,
 *   a zero-width label leaves a 52×52 box — a true circle, with no
 *   second set of collapsed styles to keep in sync.
 *
 *   The pill is anchored by its RIGHT edge, so it shrinks towards the
 *   screen edge rather than drifting across the screen.
 *
 *   The gap between icon and label is a MARGIN, not padding. Yoga
 *   will not shrink a node below its own padding, so a padded
 *   wrapper stops at LABEL_GAP dp instead of 0 — which left the
 *   collapsed pill 60x52 (an oval) with the icon pushed off centre.
 *
 *   Reanimated, not Animated: the app already uses it (see
 *   WelcomeOverlay, OtpVerifyScreen), and `useReducedMotion` is the
 *   house way to respect the OS setting. With reduce-motion on, the
 *   button still collapses — it just arrives there instantly.
 *
 * POSITIONING — NO HARDCODED BAR HEIGHT
 *   The parent places this inside the view that wraps the ScrollView,
 *   NOT the screen root. That view ends exactly where the sticky
 *   BottomBar begins, so `bottom: Spacing.lg` lands the button a
 *   fixed gap above the bar whatever the bar's height is — and the
 *   gap survives the bar growing a third button or an extra line of
 *   trust copy, which a measured constant would not.
 *
 * HIT TARGET
 *   52 dp in both states, past the 44 dp minimum, so the button stays
 *   comfortably tappable at the edge of the screen even once it is
 *   just an icon.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Route } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

/* ================================================================
 * Geometry + timing
 * ================================================================ */

const PILL_SIZE = 52;
const ICON_SIZE = 19;
/** Makes the collapsed pill exactly PILL_SIZE wide, i.e. a circle. */
const PILL_PADDING = (PILL_SIZE - ICON_SIZE) / 2;
/** Space between the icon and the label while expanded. */
const LABEL_GAP = Spacing.sm;

/** How long the label stays before collapsing. */
const HOLD_MS = 5000;
const COLLAPSE_MS = 280;

/* ================================================================
 * Component
 * ================================================================ */

type Props = {
  onPress: () => void;
};

export const BookingProcessFab: React.FC<Props> = ({ onPress }) => {
  const reduceMotion = useReducedMotion();

  /** 1 = label at full width, 0 = collapsed to the icon. */
  const progress = useSharedValue(1);

  /** The label's natural width, measured once on first layout. */
  const [labelWidth, setLabelWidth] = useState<number | null>(null);

  const onLabelLayout = useCallback(
    (event: LayoutChangeEvent) => {
      // First layout only. Later layouts report the SHRINKING width
      // as the collapse animates, and feeding those back would stall
      // the animation at whatever width it had reached.
      if (labelWidth !== null) return;
      setLabelWidth(event.nativeEvent.layout.width);
    },
    [labelWidth],
  );

  useEffect(() => {
    // Wait for the measurement: collapsing from an unknown width
    // would jump rather than animate.
    if (labelWidth === null) return undefined;

    const timer = setTimeout(() => {
      progress.value = withTiming(0, {
        duration: reduceMotion ? 0 : COLLAPSE_MS,
        easing: Easing.out(Easing.cubic),
      });
    }, HOLD_MS);

    return () => clearTimeout(timer);
  }, [labelWidth, reduceMotion, progress]);

  const labelStyle = useAnimatedStyle(() => {
    // Before measurement the label lays out at its natural width so
    // it can be measured; no animated width is applied yet.
    if (labelWidth === null) return {};
    return {
      width: progress.value * labelWidth,
      // The gap must collapse too, and it must be a MARGIN: Yoga
      // refuses to shrink a node below its own padding, so a
      // `paddingLeft` here would leave LABEL_GAP dp behind, making
      // the collapsed pill an oval with an off-centre icon.
      marginLeft: progress.value * LABEL_GAP,
      opacity: progress.value,
    };
  });

  return (
    // Wrapper is pointer-transparent so the area beside the button
    // still scrolls the quotation underneath.
    <View style={styles.anchor} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        accessible
        accessibilityRole="button"
        // Stays correct once the label is gone, so the collapsed
        // circle is never an unlabelled button.
        accessibilityLabel="Booking process"
        accessibilityHint="Opens the three steps from here to your trip"
        style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
      >
        <Route size={ICON_SIZE} color={Colors.surface} strokeWidth={2.2} />

        <Animated.View
          style={[styles.labelWrap, labelStyle]}
          // The Pressable's own label already says this; without the
          // hint the text would be announced a second time while it
          // is still on screen.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text
            onLayout={onLabelLayout}
            numberOfLines={1}
            style={[
              styles.label,
              // Pinned after measuring so the text does not reflow
              // as its wrapper narrows.
              labelWidth === null ? null : { width: labelWidth },
            ]}
          >
            Booking process
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    // Anchors the pill by its right edge, so it shrinks towards the
    // screen edge instead of sliding across the screen.
    alignItems: 'flex-end',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: PILL_SIZE,
    // Symmetric on purpose: see PILL_PADDING.
    paddingHorizontal: PILL_PADDING,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryDark,
    ...Shadows.lg,
  },
  pressed: {
    opacity: 0.88,
  },
  labelWrap: {
    // Margin, never padding — see the note in the animated style.
    // This value applies only until the measurement lands, after
    // which the animated style drives it.
    marginLeft: LABEL_GAP,
    // Clips the text as the wrapper narrows to zero.
    overflow: 'hidden',
  },
  label: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.surface,
  },
});
