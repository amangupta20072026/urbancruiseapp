/**
 * useOpenQuotationDetail — opens a quotation from inside the app.
 *
 * Decides BEFORE navigating, so an Expired quotation slides straight
 * into the details screen with no blank in-between frame.
 * Deep links can't run hooks; they route to QuotationHighlights and
 * that screen applies the same rule on mount (see the screen header).
 */
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { CustomerStackParamList } from '@navigation/types';

import type { QuotationStatus } from '../types';
import { shouldShowHighlights } from './rules';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;
type DetailParams = CustomerStackParamList['QuotationDetail'];

export function useOpenQuotationDetail(): (
  params: DetailParams,
  knownStatus?: QuotationStatus,
) => void {
  const navigation = useNavigation<Nav>();
  return useCallback(
    (params, knownStatus) => {
      if (shouldShowHighlights(params.quotationId, knownStatus)) {
        navigation.navigate('QuotationHighlights', params);
      } else {
        navigation.navigate('QuotationDetail', params);
      }
    },
    [navigation],
  );
}
