/**
 * ------------------------------------------------------------------
 * buildBookingTimeline — 4-step tracker model for a UC booking card
 * ------------------------------------------------------------------
 * Pure function (no React) so the rules are unit-tested on their own.
 *
 *   Booked ── Confirmed ── Trip Starts ── Completed
 *
 * Rules (`progressStep` = last step the booking reached):
 *
 *   upcoming / ongoing
 *     steps before progressStep → done
 *     progressStep              → current
 *     steps after               → pending
 *       e.g. upcoming at 'confirmed':  ✓ ── ◎ ── ○ ── ○
 *            ongoing  at 'started':    ✓ ── ✓ ── 🚗 ── ○
 *
 *   completed
 *     every step                → done      ✓ ── ✓ ── ✓ ── ✓
 *
 *   cancelled / no_show
 *     steps before progressStep → done
 *     progressStep              → stopped (✕ — where it ended)
 *     steps after               → pending
 *       e.g. cancelled at 'booked':    ✕ ── ○ ── ○ ── ○
 *
 * This differs from the customer-history tracker on purpose: the
 * approved UC Bookings design marks the step where a booking stopped
 * with an ✕ and keeps the step's own label, instead of inserting a
 * separate "Cancelled" step.
 *
 * Bad data never crashes: an unknown step is treated as 'booked'.
 * ------------------------------------------------------------------
 */

import type { BookingProgressStep, UcBookingStatus } from '../types';

export type BookingStepState = 'done' | 'current' | 'stopped' | 'pending';

export type BookingTimelineStep = {
  /** Stable React key. */
  key: BookingProgressStep;
  label: string;
  state: BookingStepState;
};

export const BOOKING_TIMELINE_STEPS: readonly {
  key: BookingProgressStep;
  label: string;
}[] = [
  { key: 'booked', label: 'Booked' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'started', label: 'Trip Starts' },
  { key: 'completed', label: 'Completed' },
];

export function buildBookingTimeline(
  status: UcBookingStatus,
  progressStep: BookingProgressStep,
): BookingTimelineStep[] {
  if (status === 'completed') {
    return BOOKING_TIMELINE_STEPS.map(s => ({ ...s, state: 'done' }));
  }

  const found = BOOKING_TIMELINE_STEPS.findIndex(s => s.key === progressStep);
  // Unknown step from the server → treat as the first step.
  const reached = found === -1 ? 0 : found;
  const reachedState: BookingStepState =
    status === 'cancelled' || status === 'no_show' ? 'stopped' : 'current';

  return BOOKING_TIMELINE_STEPS.map((s, i) => ({
    ...s,
    state: i < reached ? 'done' : i === reached ? reachedState : 'pending',
  }));
}
