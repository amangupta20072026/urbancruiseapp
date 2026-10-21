/**
 * ------------------------------------------------------------------
 * buildTripTimeline — 4-step tracker model for a history trip card
 * ------------------------------------------------------------------
 * Pure function (no React) so the rules are unit-tested on their own.
 *
 *   Booked ── Confirmed ── Trip Starts ── Completed
 *
 * Rules, by status (`progressStep` = last step the trip reached):
 *
 *   upcoming / in_progress
 *     steps before progressStep → done
 *     progressStep              → current
 *     steps after               → pending
 *
 *   completed
 *     every step                → done
 *
 *   cancelled / no_show
 *     steps up to progressStep  → done
 *     the NEXT step is replaced by a terminal step ("Cancelled" /
 *     "No show"), rendered done in the status colour
 *     steps after               → pending
 *
 *   e.g. cancelled at 'booked':
 *     Booked ✓ ── Cancelled ✓ ── Trip Starts ○ ── Completed ○
 *
 * Data outside the documented status/progressStep pairs (see
 * TripProgressStep) never crashes: a terminal step that would fall
 * past the end is clamped onto the last slot.
 * ------------------------------------------------------------------
 */

import type { TripProgressStep, TripStatus } from '../types';

export type TimelineStepState = 'done' | 'current' | 'pending';

export type TimelineStep = {
  /** Stable React key. */
  key: TripProgressStep | 'terminal';
  label: string;
  state: TimelineStepState;
};

const STEPS: readonly { key: TripProgressStep; label: string }[] = [
  { key: 'booked', label: 'Booked' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'started', label: 'Trip Starts' },
  { key: 'completed', label: 'Completed' },
];

const TERMINAL_LABEL: Partial<Record<TripStatus, string>> = {
  cancelled: 'Cancelled',
  no_show: 'No show',
};

export function buildTripTimeline(
  status: TripStatus,
  progressStep: TripProgressStep,
): TimelineStep[] {
  const lastIndex = STEPS.length - 1;
  const found = STEPS.findIndex(s => s.key === progressStep);
  // Unknown step from the server → treat as the first step.
  const reached = found === -1 ? 0 : found;

  if (status === 'completed') {
    return STEPS.map(s => ({ key: s.key, label: s.label, state: 'done' }));
  }

  const terminalLabel = TERMINAL_LABEL[status];
  if (terminalLabel) {
    const terminalIndex = Math.min(reached + 1, lastIndex);
    return STEPS.map((s, i) => {
      if (i === terminalIndex) {
        return { key: 'terminal', label: terminalLabel, state: 'done' };
      }
      return {
        key: s.key,
        label: s.label,
        state: i < terminalIndex ? 'done' : 'pending',
      };
    });
  }

  // upcoming / in_progress
  return STEPS.map((s, i) => ({
    key: s.key,
    label: s.label,
    state: i < reached ? 'done' : i === reached ? 'current' : 'pending',
  }));
}
