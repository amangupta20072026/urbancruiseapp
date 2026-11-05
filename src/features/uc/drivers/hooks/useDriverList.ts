/**
 * ------------------------------------------------------------------
 * useDriverList — UC Directory, Drivers tab
 * ------------------------------------------------------------------
 * GET /uc/drivers (UC staff only), via the shared useDirectoryList.
 *
 * Query params sent:
 *   search        name / vendor / email / city / licence (contains); a
 *                 phone only when it is the complete number
 *   verification  all | verified | pending | rejected
 *   vendorId      one vendor's drivers (left out = all vendors)
 *   sortBy        newest | oldest | nameAsc
 *   cursor, limit
 *
 * To refresh every drivers list after a change:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.uc.drivers.all() })
 * ------------------------------------------------------------------
 */

import { endpoints } from '@api/endpoints';
import { queryKeys } from '@constants/queryKeys';

import { useDirectoryList } from '../../_directory/hooks/useDirectoryList';
import {
  DEFAULT_DRIVER_FILTERS,
  type Driver,
  type DriverFilters,
} from '../types';

export type UseDriverListArgs = {
  search?: string;
  filters?: DriverFilters;
};

export function useDriverList({
  search = '',
  filters = DEFAULT_DRIVER_FILTERS,
}: UseDriverListArgs = {}) {
  return useDirectoryList<Driver>({
    queryKey: queryKeys.uc.drivers.list({ search, filters }),
    url: endpoints.uc.drivers.list(),
    params: {
      search,
      verification: filters.verification,
      vendorId: filters.vendorId,
      sortBy: filters.sortBy,
    },
  });
}
