/**
 * ------------------------------------------------------------------
 * Trip type — shared icon/label metadata
 * ------------------------------------------------------------------
 * `TripType` (the value) lives in `./types`. This file only adds the
 * *display* metadata (icon + label) so both consumers render the
 * concept identically:
 *
 *   - RequestQuotationScreen — interactive `TripTypeChip` picker.
 *   - QuotationDetailScreen  — read-only badge on the Trip Details
 *     card header.
 *
 * Kept out of `types.ts` on purpose: that file is otherwise pure
 * types (no runtime imports), and pulling `lucide-react-native`
 * components into it would make every type-only import drag the
 * icon library along for the ride.
 * ------------------------------------------------------------------
 */

import { ArrowLeftRight, Plane, RefreshCw } from 'lucide-react-native';
import type { TripType } from './types';

export type TripTypeOption = {
  key: TripType;
  label: string;
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
};

export const TRIP_TYPE_OPTIONS: readonly TripTypeOption[] = [
  { key: 'one_way', label: 'One Way', Icon: Plane },
  { key: 'round_trip', label: 'Round Trip', Icon: RefreshCw },
  { key: 'pickup_drop', label: 'Pickup & Drop', Icon: ArrowLeftRight },
];

const TRIP_TYPE_BY_KEY: Readonly<Record<TripType, TripTypeOption>> =
  Object.fromEntries(TRIP_TYPE_OPTIONS.map(opt => [opt.key, opt])) as Record<
    TripType,
    TripTypeOption
  >;

/** Look up the icon/label pair for a given `TripType`. */
export function getTripTypeOption(key: TripType): TripTypeOption {
  return TRIP_TYPE_BY_KEY[key];
}
