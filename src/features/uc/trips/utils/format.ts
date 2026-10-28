/**
 * ------------------------------------------------------------------
 * UC Trips — status tones + formatters
 * ------------------------------------------------------------------
 * Pure, safe to call in render. Colours come only from `@theme`.
 *
 * Tones follow the approved Trips design: the whole card is washed
 * in the status family, the pill is the tint with a solid dot.
 *   Ongoing / Completed → green     Upcoming → blue
 *   Cancelled → red                 No show  → amber
 * (Cancelled and No show are not in the design; they reuse the
 * existing red / amber wash tokens from the customer Trip History.)
 * ------------------------------------------------------------------
 */

import { format } from 'date-fns';

import { Colors } from '@theme';

import type { UcTripStatus } from '../types';

export type UcTripTone = {
  label: string;
  /** Pill text, pill dot, tracker dots and solid rails. */
  fg: string;
  /** Pill background. */
  bg: string;
  /** Whole-card background. */
  wash: string;
  /** Whole-card border. */
  border: string;
};

export const UC_TRIP_TONE: Readonly<Record<UcTripStatus, UcTripTone>> =
  Object.freeze({
    upcoming: {
      label: 'Upcoming',
      fg: Colors.completed,
      bg: Colors.completedTint,
      wash: Colors.blueWash,
      border: Colors.blueWashBorder,
    },
    ongoing: {
      label: 'Ongoing',
      fg: Colors.primaryDark,
      bg: Colors.primaryTint,
      wash: Colors.greenWash,
      border: Colors.greenWashBorder,
    },
    completed: {
      label: 'Completed',
      fg: Colors.primaryDark,
      bg: Colors.primaryTint,
      wash: Colors.greenWash,
      border: Colors.greenWashBorder,
    },
    cancelled: {
      label: 'Cancelled',
      fg: Colors.error,
      bg: Colors.errorTint,
      wash: Colors.redWash,
      border: Colors.redWashBorder,
    },
    no_show: {
      label: 'No show',
      fg: Colors.pendingDark,
      bg: Colors.warningTint,
      wash: Colors.amberWash,
      border: Colors.amberWashBorder,
    },
  });

/** "06 Nov 2026" — device local time. */
export const formatTripDate = (iso: string): string =>
  format(new Date(iso), 'dd MMM yyyy');

/** "09:30 AM" */
export const formatTripTime = (iso: string): string =>
  format(new Date(iso), 'hh:mm a');

/** "1 Passenger" / "4 Passengers" */
export const formatPassengers = (n: number): string =>
  `${n} ${n === 1 ? 'Passenger' : 'Passengers'}`;
