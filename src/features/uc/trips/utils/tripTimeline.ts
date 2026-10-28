/**
 * ------------------------------------------------------------------
 * buildTripTimeline — 4-step tracker model for a UC trip card
 * ------------------------------------------------------------------
 * Pure function (no React) so the rules are unit-tested on their own.
 *
 *   Booked ── Confirmed ── On Trip ── Completed
 *
 * Rules, per the approved Trips design (`progressStep` = last step
 * the trip reached):
 *
 *   upcoming
 *     steps up to AND including progressStep → done
 *     steps after                            → pending
 *       e.g. upcoming at 'booked':     ✓ ┄┄ ○ ┄┄ ○ ┄┄ ○
 *     "Booked" and "Confirmed" are events that have happened, so they
 *     are ticked — nothing is in progress until the trip starts.
 *
 *   ongoing
 *     steps before progressStep → done
 *     progressStep ('started')  → current (ring with inner dot)
 *     steps after               → pending
 *       e.g.                           ✓ ━━ ✓ ━━ ◉ ┄┄ ○
 *
 *   completed
 *     every step → done                ✓ ━━ ✓ ━━ ✓ ━━ ✓
 *
 *   cancelled / no_show (not in the design; same rule as Bookings)
 *     steps before progressStep → done
 *     progressStep              → stopped (✕)
 *     steps after               → pending
 *
 * Returns the Bookings tracker's step model so both tabs share one
 * tracker component. Bad data never crashes: an unknown step is
 * treated as 'booked'.
 * ------------------------------------------------------------------
 */

import type {
  BookingStepState,
  BookingTimelineStep,
} from '@features/uc/bookings/utils/bookingTimeline';

import type { BookingProgressStep, UcTripStatus } from '../types';

export const TRIP_TIMELINE_STEPS: readonly {
  key: BookingProgressStep;
  label: string;
}[] = [
  { key: 'booked', label: 'Booked' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'started', label: 'On Trip' },
  { key: 'completed', label: 'Completed' },
];

export function buildTripTimeline(
  status: UcTripStatus,
  progressStep: BookingProgressStep,
): BookingTimelineStep[] {
  if (status === 'completed') {
    return TRIP_TIMELINE_STEPS.map(s => ({ ...s, state: 'done' }));
  }

  const found = TRIP_TIMELINE_STEPS.findIndex(s => s.key === progressStep);
  // Unknown step from the server → treat as the first step.
  const reached = found === -1 ? 0 : found;

  const reachedState: BookingStepState =
    status === 'cancelled' || status === 'no_show'
      ? 'stopped'
      : status === 'ongoing'
      ? 'current'
      : 'done'; // upcoming

  return TRIP_TIMELINE_STEPS.map((s, i) => ({
    ...s,
    state: i < reached ? 'done' : i === reached ? reachedState : 'pending',
  }));
}
