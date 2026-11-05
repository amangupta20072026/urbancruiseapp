/**
 * ------------------------------------------------------------------
 * useVendorList — UC Directory, Vendors tab
 * ------------------------------------------------------------------
 * GET /uc/vendors (UC staff only), via the shared useDirectoryList.
 *
 * Query params sent:
 *   search  name / company / email / city (contains); a phone only
 *           when it is the complete number (the backend enforces it)
 *   status  all | active | pending | suspended | inactive
 *           (an empty status in the database counts as active)
 *   sortBy  newest | oldest | nameAsc (A–Z by the card title)
 *   cursor, limit
 *
 * To refresh every vendors list after a change:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.uc.vendors.all() })
 * ------------------------------------------------------------------
 */

import { endpoints } from '@api/endpoints';
import { queryKeys } from '@constants/queryKeys';

import { useDirectoryList } from '../../_directory/hooks/useDirectoryList';
import {
  DEFAULT_VENDOR_FILTERS,
  type Vendor,
  type VendorFilters,
} from '../types';

export type UseVendorListArgs = {
  search?: string;
  filters?: VendorFilters;
};

export function useVendorList({
  search = '',
  filters = DEFAULT_VENDOR_FILTERS,
}: UseVendorListArgs = {}) {
  return useDirectoryList<Vendor>({
    queryKey: queryKeys.uc.vendors.list({ search, filters }),
    url: endpoints.uc.vendors.list(),
    params: {
      search,
      status: filters.status,
      sortBy: filters.sortBy,
    },
  });
}
