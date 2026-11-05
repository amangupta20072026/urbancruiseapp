/**
 * ------------------------------------------------------------------
 * useCustomerList — UC Directory, Customers tab
 * ------------------------------------------------------------------
 * GET /uc/customers (UC staff only), via the shared useDirectoryList.
 *
 * Query params sent:
 *   search    name / email / city / company (contains); a phone only
 *             when it is the complete number (the backend enforces it)
 *   type      all | personal | corporate | agent
 *   dateFrom  YYYY-MM-DD, India time, inclusive (joined on or after)
 *   dateTo    YYYY-MM-DD, India time, inclusive (joined on or before)
 *   sortBy    newest | oldest | nameAsc
 *   cursor, limit
 *
 * To refresh every customers list after a change:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.uc.customers.all() })
 * ------------------------------------------------------------------
 */

import { endpoints } from '@api/endpoints';
import { queryKeys } from '@constants/queryKeys';

import { useDirectoryList } from '../../_directory/hooks/useDirectoryList';
import {
  DEFAULT_CUSTOMER_FILTERS,
  type Customer,
  type CustomerFilters,
} from '../types';

export type UseCustomerListArgs = {
  search?: string;
  filters?: CustomerFilters;
};

export function useCustomerList({
  search = '',
  filters = DEFAULT_CUSTOMER_FILTERS,
}: UseCustomerListArgs = {}) {
  return useDirectoryList<Customer>({
    queryKey: queryKeys.uc.customers.list({ search, filters }),
    url: endpoints.uc.customers.list(),
    params: {
      search,
      type: filters.type,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      sortBy: filters.sortBy,
    },
  });
}
