/**
 * ------------------------------------------------------------------
 * UcBookingCardTracker — progress tracker on the UC booking card
 * ------------------------------------------------------------------
 * Looks exactly like the customer BookingProgressTracker
 * (features/customer/bookings/components/BookingProgressTracker.tsx):
 * same dot sizes, colours, connector and labels.
 *
 *   ✓───✓───●───○
 *  Booked Confirmed Trip Starts Completed
 *
 * Why not reuse the customer tracker directly:
 *   1. The data means something different. On a customer booking,
 *      `progressStep` is the step being worked on NOW. On a UC
 *      booking it is the LAST STEP ALREADY REACHED (see
 *      uc/bookings/types.ts). Passing the UC value straight in drew
 *      a just-booked booking as "Booked in progress" instead of
 *      "Booked ✓, waiting for confirmation".
 *   2. UC also shows cancelled and no-show bookings, which need a
 *      "stopped here" (✕) dot. The customer tracker has no such dot.
 *
 * Rules (`progressStep` = last step reached):
 *
 *   upcoming / ongoing
 *     steps up to and incl. progressStep → done   ✓
 *     the next step                      → current ●
 *     steps after that                   → pending ○
 *       upcoming at 'booked':     ✓ ● ○ ○
 *       upcoming at 'confirmed':  ✓ ✓ ● ○
 *       ongoing  at 'started':    ✓ ✓ ✓ ●
 *
 *   completed                         ✓ ✓ ✓ ✓
 *
 *   cancelled / no_show
 *     steps up to and incl. progressStep → done    ✓
 *     the next step                      → stopped ✕ (red)
 *     steps after that                   → pending ○
 *       cancelled at 'booked':    ✓ ✕ ○ ○
 *
 * An unknown step from the server is treated as 'booked', so bad
 * data never crashes the list.
 *
 * Used by both UC cards:
 *   - UC Bookings (UcBookingCard): default labels.
 *   - UC Trips (UcTripCard): `labels={{ started: 'On Trip' }}` and
 *     `accessibilityPrefix="Trip progress"`.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check, X } from 'lucide-react-native';

import { Colors, Radius, Typography } from '@theme';

import type { BookingProgressStep, UcBookingStatus } from '../types';

/* ================================================================
 * Model
 * ================================================================ */

type StepState = 'done' | 'current' | 'stopped' | 'pending';

type Step = {
  key: BookingProgressStep;
  label: string;
  state: StepState;
};

const STEPS: readonly { key: BookingProgressStep; label: string }[] = [
  { key: 'booked', label: 'Booked' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'started', label: 'Trip Starts' },
  { key: 'completed', label: 'Completed' },
];

const STATE_SPOKEN: Readonly<Record<StepState, string>> = {
  done: 'done',
  current: 'in progress',
  stopped: 'stopped here',
  pending: 'not reached',
};

/** Pure: builds the four steps for one booking (see rules above). */
export function buildUcCardSteps(
  status: UcBookingStatus,
  progressStep: BookingProgressStep,
  labels?: Partial<Record<BookingProgressStep, string>>,
): Step[] {
  const base = STEPS.map(s => ({ ...s, label: labels?.[s.key] ?? s.label }));

  if (status === 'completed') {
    return base.map(s => ({ ...s, state: 'done' }));
  }

  const found = STEPS.findIndex(s => s.key === progressStep);
  const reached = found === -1 ? 0 : found;
  const isStopped = status === 'cancelled' || status === 'no_show';
  const nextState: StepState = isStopped ? 'stopped' : 'current';

  return base.map((s, i) => ({
    ...s,
    state: i <= reached ? 'done' : i === reached + 1 ? nextState : 'pending',
  }));
}

/* ================================================================
 * Component
 * ================================================================ */

type Props = {
  /** UC trip statuses are the same set, so trips pass theirs too. */
  status: UcBookingStatus;
  /** Last step already reached. */
  progressStep: BookingProgressStep;
  /** Optional label per step, e.g. { started: 'On Trip' } on Trips. */
  labels?: Partial<Record<BookingProgressStep, string>>;
  /** Spoken prefix for screen readers. */
  accessibilityPrefix?: string;
};

const UcBookingCardTrackerImpl: React.FC<Props> = ({
  status,
  progressStep,
  labels,
  accessibilityPrefix = 'Booking progress',
}) => {
  const steps = buildUcCardSteps(status, progressStep, labels);
  const summary = steps
    .map(s => `${s.label} ${STATE_SPOKEN[s.state]}`)
    .join(', ');

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${accessibilityPrefix}: ${summary}`}
    >
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <React.Fragment key={step.key}>
            <View style={styles.stepCol}>
              <Dot state={step.state} />
              <Text
                style={[
                  styles.label,
                  step.state === 'pending' && styles.labelPending,
                  step.state === 'stopped' && styles.labelStopped,
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
            {!isLast ? (
              <View
                style={[
                  styles.connector,
                  // Green once this step is done, as on the customer card.
                  step.state === 'done' && styles.connectorDone,
                ]}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
};

export const UcBookingCardTracker = React.memo(UcBookingCardTrackerImpl);
UcBookingCardTracker.displayName = 'UcBookingCardTracker';

/* -------- Dot ---------------------------------------------------- */

const Dot: React.FC<{ state: StepState }> = ({ state }) => {
  switch (state) {
    case 'done':
      return (
        <View style={styles.dotDone}>
          <Check size={12} color={Colors.textOnPrimary} strokeWidth={3} />
        </View>
      );
    case 'current':
      return (
        <View style={styles.dotCurrent}>
          <View style={styles.dotCurrentInner} />
        </View>
      );
    case 'stopped':
      return (
        <View style={styles.dotStopped}>
          <X size={12} color={Colors.textOnPrimary} strokeWidth={3} />
        </View>
      );
    case 'pending':
      return <View style={styles.dotPending} />;
  }
};

/* ================================================================
 * Styles — values copied from the customer BookingProgressTracker
 * ================================================================ */

const DOT = 20;
const STEP_COL_WIDTH = 72;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  stepCol: {
    alignItems: 'center',
    gap: 3,
    width: STEP_COL_WIDTH,
  },

  connector: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginTop: DOT / 2 - 1,
    // Pull the line into both columns so it meets the dot edges.
    marginHorizontal: -(STEP_COL_WIDTH / 2 - DOT / 2),
  },
  connectorDone: {
    backgroundColor: Colors.primary,
  },

  dotDone: {
    width: DOT,
    height: DOT,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCurrent: {
    width: DOT,
    height: DOT,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primary,
    borderWidth: 2.5,
    borderColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCurrentInner: {
    width: 5,
    height: 5,
    borderRadius: Radius.circle,
    backgroundColor: Colors.textOnPrimary,
  },
  dotStopped: {
    width: DOT,
    height: DOT,
    borderRadius: Radius.circle,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPending: {
    width: DOT,
    height: DOT,
    borderRadius: Radius.circle,
    backgroundColor: Colors.border,
  },

  label: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  labelPending: {
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  labelStopped: {
    color: Colors.error,
  },
});
