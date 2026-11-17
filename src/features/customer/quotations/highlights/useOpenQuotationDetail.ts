/**
 * useOpenQuotationDetail — opens a quotation from inside the app.
 *
 * Decides BEFORE navigating, so an Expired quotation opens the details
 * screen directly (with its fade-up) and never shows the images.
 *
 * Pending / Accepted: the brand images play ON TOP OF the current
 * screen (HighlightsStoryHost), so the first image flips down right
 * over the list the customer tapped; after the last image the details
 * screen opens underneath and the overlay fades away. If the overlay
 * can't start (not mounted, already playing) the QuotationHighlights
 * screen is used instead.
 *
 * Deep links can't run hooks; they route to QuotationHighlights and
 * that screen applies the same rule on mount (see the screen header).
 */
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { CustomerStackParamList } from '@navigation/types';

import type { QuotationStatus } from '../types';
import { shouldShowHighlights } from './rules';
import { startHighlightsStory } from './storyOverlay';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;
type DetailParams = CustomerStackParamList['QuotationDetail'];

export function useOpenQuotationDetail(): (
  params: DetailParams,
  knownStatus?: QuotationStatus,
) => void {
  const navigation = useNavigation<Nav>();
  return useCallback(
    (params, knownStatus) => {
      if (!shouldShowHighlights(params.quotationId, knownStatus)) {
        navigation.navigate('QuotationDetail', params);
        return;
      }
      const playing = startHighlightsStory(() =>
        navigation.navigate('QuotationDetail', params),
      );
      if (!playing) navigation.navigate('QuotationHighlights', params);
    },
    [navigation],
  );
}
