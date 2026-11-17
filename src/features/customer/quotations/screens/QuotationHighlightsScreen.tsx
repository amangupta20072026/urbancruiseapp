/**
 * ------------------------------------------------------------------
 * QuotationHighlightsScreen (Customer)
 * ------------------------------------------------------------------
 * The three brand images as a SCREEN, on a white background, then
 * REPLACES itself with QuotationDetail using the same params.
 * `replace` means Back on the details screen returns to where the
 * customer came from, never to these images.
 *
 * WHEN THIS SCREEN IS USED:
 *   In-app taps on a quotation card play the same images in an
 *   overlay ON TOP OF the list (HighlightsStoryHost), so the first
 *   image flips down right over the list. This screen is the fallback
 *   for entries without a list behind them: notification / deep links,
 *   and the overlay host not being mounted.
 *
 * The images, timing, flips, taps and hold-to-pause all live in
 * HighlightsStory (see its header). This screen only adds:
 *   - the entry gate (Expired / unknown → straight to details);
 *   - `active` = this screen is focused;
 *   - finishing with `navigation.replace('QuotationDetail', …)`.
 *
 * NAVIGATION (product decision):
 *   No Skip button, Android back is consumed (by HighlightsStory while
 *   active), iOS swipe-back is off (gestureEnabled: false in
 *   CustomerNavigator). QuotationDetail fades up from slightly below
 *   (CustomerNavigator option).
 *
 * ENTRY GATE:
 *   In-app callers decide before navigating (useOpenQuotationDetail).
 *   Deep links / notification taps always land here, so the screen
 *   re-applies the same rule (shouldShowHighlights) and goes straight
 *   to details for Expired or unknown quotations.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SafeScreen } from '@shared/components';
import type { CustomerStackParamList } from '@navigation/types';

import { HighlightsStory } from '../highlights/HighlightsStory';
import { shouldShowHighlights } from '../highlights/rules';

type Nav = NativeStackNavigationProp<
  CustomerStackParamList,
  'QuotationHighlights'
>;
type Route = RouteProp<CustomerStackParamList, 'QuotationHighlights'>;

const QuotationHighlightsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const isFocused = useIsFocused();

  // Decided once per mount: the rule must not flip mid-sequence.
  const [eligible] = useState(() => shouldShowHighlights(params.quotationId));

  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    navigation.replace('QuotationDetail', params);
  }, [navigation, params]);

  // Deep-link entry for an Expired / unknown quotation.
  useEffect(() => {
    if (!eligible) finish();
  }, [eligible, finish]);

  // Expired / unknown: blank screen for the instant before `replace`.
  if (!eligible) {
    return <SafeScreen>{null}</SafeScreen>;
  }

  return (
    <SafeScreen>
      <HighlightsStory active={isFocused} onFinish={finish} />
    </SafeScreen>
  );
};

export default QuotationHighlightsScreen;
