/**
 * ------------------------------------------------------------------
 * Booking status — the ONE place that defines how a status looks
 * ------------------------------------------------------------------
 * Used by every booking surface (Customer bookings list, UC
 * dashboard, …) so a status always has the same label, icon and
 * colours wherever it appears. The values are the ones the Customer
 * bookings list shipped with; moved here unchanged.
 *
 * Kept free of React components and screens so any feature can
 * import it without pulling in another feature's UI.
 * ------------------------------------------------------------------
 */

import type { ComponentType } from 'react';
import {
  CalendarClock,
  Car,
  Check,
  Clock,
  type LucideProps,
} from 'lucide-react-native';

import { Colors } from '@theme';

export const BOOKING_STATUSES = [
  'upcoming',
  'ongoing',
  'completed',
  'cancelled',
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** True for a status this app version knows how to show. Data from
 *  the server or the saved cache may carry an unknown one. */
export function isBookingStatus(value: unknown): value is BookingStatus {
  return (BOOKING_STATUSES as readonly unknown[]).includes(value);
}

export type BookingStatusVisual = {
  label: string;
  Icon: ComponentType<LucideProps>;
  /** Pill text and icon colour. */
  fg: string;
  /** Pill background. */
  bg: string;
};

export const BOOKING_STATUS_VISUAL: Readonly<
  Record<BookingStatus, BookingStatusVisual>
> = Object.freeze({
  upcoming: {
    label: 'Upcoming',
    Icon: CalendarClock,
    fg: Colors.textOnPrimary,
    bg: Colors.primaryDark,
  },
  ongoing: {
    label: 'Ongoing',
    Icon: Car,
    fg: Colors.info,
    bg: Colors.infoTint,
  },
  completed: {
    label: 'Completed',
    Icon: Check,
    fg: Colors.primary,
    bg: Colors.primaryTint,
  },
  cancelled: {
    label: 'Cancelled',
    Icon: Clock,
    fg: Colors.error,
    bg: Colors.errorTint,
  },
});
