/**
 * ------------------------------------------------------------------
 * UC Bookings — status visuals + formatters
 * ------------------------------------------------------------------
 * Pure, safe to call in render. Colours come only from `@theme`.
 *
 * Status colours follow the approved UC Bookings design:
 *   Upcoming  → blue    Ongoing / Completed → green
 *   Cancelled → red     No show (not in design) → amber, the same
 *                       token the UC customer history uses for it.
 *
 * NOTE: this intentionally differs from the shared
 * `BOOKING_STATUS_VISUAL` (customer bookings / UC dashboard), where
 * Upcoming is solid dark green and Ongoing is sky blue. Kept local
 * to the UC Bookings tab so the customer screens are not restyled.
 * ------------------------------------------------------------------
 */

import type { ComponentType } from 'react';
import { format } from 'date-fns';
import {
  Car,
  CircleCheck,
  CircleX,
  Clock,
  UserX,
  type LucideProps,
} from 'lucide-react-native';

import { Colors } from '@theme';

import type { UcBookingStatus } from '../types';

/* ================================================================
 * Status visuals
 * ================================================================ */

export type UcBookingStatusVisual = {
  label: string;
  Icon: ComponentType<LucideProps>;
  /** Pill text/icon, tracker dots and solid rails. */
  fg: string;
  /** Pill background. */
  bg: string;
};

export const UC_BOOKING_STATUS_VISUAL: Readonly<
  Record<UcBookingStatus, UcBookingStatusVisual>
> = Object.freeze({
  upcoming: {
    label: 'Upcoming',
    Icon: Clock,
    fg: Colors.completed,
    bg: Colors.completedTint,
  },
  ongoing: {
    label: 'Ongoing',
    Icon: Car,
    fg: Colors.primaryDark,
    bg: Colors.primaryTint,
  },
  completed: {
    label: 'Completed',
    Icon: CircleCheck,
    fg: Colors.primaryDark,
    bg: Colors.primaryTint,
  },
  cancelled: {
    label: 'Cancelled',
    Icon: CircleX,
    fg: Colors.error,
    bg: Colors.errorTint,
  },
  no_show: {
    label: 'No show',
    Icon: UserX,
    fg: Colors.pendingDark,
    bg: Colors.warningTint,
  },
});

/** Chip labels (the chip strip shows the four shared statuses + All). */
export const UC_BOOKING_FILTER_LABEL = {
  all: 'All',
  upcoming: 'Upcoming',
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
} as const;

/* ================================================================
 * Formatters
 * ================================================================ */

/** "06 Nov 2026" — device local time (same as the history card). */
export const formatBookingDate = (iso: string): string =>
  format(new Date(iso), 'dd MMM yyyy');

/** "09:30 AM" */
export const formatBookingTime = (iso: string): string =>
  format(new Date(iso), 'hh:mm a');

/** "1 Passenger" / "4 Passengers" */
export const formatPassengers = (n: number): string =>
  `${n} ${n === 1 ? 'Passenger' : 'Passengers'}`;

/** "Innova Crysta (7 Seater)", or just "Innova Crysta" when unknown. */
export const formatVehicle = (
  name: string,
  seatingCapacity: number | null,
): string =>
  seatingCapacity && seatingCapacity > 0
    ? `${name} (${seatingCapacity} Seater)`
    : name;
