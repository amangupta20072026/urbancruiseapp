/**
 * ------------------------------------------------------------------
 * BookingProgressTracker
 * ------------------------------------------------------------------
 * Horizontal 4-step progress bar shown inside the upcoming-booking
 * card. Composition:
 *
 *   ✓───●───○───○
 *  Booked Confirmed  Trip   Completed
 *   date   note      Starts
 *
 * Rules:
 *   - A step earlier than the cursor renders as done (filled circle
 *     with white check).
 *   - The cursor step renders as active (filled circle with a
 *     concentric dot).
 *   - Later steps render as pending (open gray circle).
 *   - Each connector segment between two steps is green when the
 *     LEFT step is done, otherwise gray.
 *   - The sub-label below each step is optional and only renders
 *     when a caller passes it (formatted date for booked / current
 *     status note for the cursor / travel date for started, etc).
 *
 * The component is pure presentation: it takes the current step +
 * a per-step sub-label map and renders. No knowledge of booking
 * shape, so the same tracker can be reused wherever a lifecycle
 * needs visualising (e.g. a future BookingDetail hero).
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { Colors, Radius, Typography } from '@theme';
import type { BookingProgressStep } from '../types';

/** Fixed step vocabulary — order matters (drives the "done" test). */
const STEPS: readonly {
  key: BookingProgressStep;
  label: string;
}[] = [
  { key: 'booked', label: 'Booked' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'started', label: 'Trip Starts' },
  { key: 'completed', label: 'Completed' },
];

type State = 'done' | 'current' | 'pending';

function stateFor(
  step: BookingProgressStep,
  cursor: BookingProgressStep,
  renderCurrentAs: 'current' | 'done',
): State {
  const cursorIndex = STEPS.findIndex(s => s.key === cursor);
  const stepIndex = STEPS.findIndex(s => s.key === step);
  const lastIndex = STEPS.length - 1;
  // When the cursor has reached the final step, the trip is fully
  // complete — render that last dot as "done" (checkmark) rather
  // than "current" (in-progress dot), since there's no next step
  // left to be "in progress" toward.
  if (cursorIndex === lastIndex && stepIndex === lastIndex) return 'done';
  if (stepIndex < cursorIndex) return 'done';
  if (stepIndex === cursorIndex) {
    // `renderCurrentAs='done'` flips the cursor step from the ring
    // "in progress" dot to a filled check. Used by the ongoing
    // booking screen where "Trip Starts" is really a past milestone
    // by the time the user reads the card — the trip has already
    // started, only Completed is genuinely still pending.
    return renderCurrentAs === 'done' ? 'done' : 'current';
  }
  return 'pending';
}

type Props = {
  currentStep: BookingProgressStep;
  /**
   * Optional sub-label per step. Keyed by step so callers pass in
   * only the ones they want to show; unspecified steps render no
   * sub-label. Strings may contain `\n` for a two-line sub — used
   * by BookingDetailScreen to render "05 Sept\n08:00 AM". Example:
   *   { booked: '10 Sep', confirmed: 'Pending', started: '15 Sep' }
   */
  subLabels?: Partial<Record<BookingProgressStep, string>>;
  /**
   * Optional per-step label override. When a step is past-tense in
   * some contexts (e.g. detail screen for a completed booking:
   * "Trip Started" instead of the default "Trip Starts"), the
   * caller passes an override. Absent keys fall back to STEPS.label.
   */
  labelOverrides?: Partial<Record<BookingProgressStep, string>>;
  /**
   * How to render the cursor step visually. Default 'current'
   * shows the concentric-dot ring ("in progress"). 'done' shows a
   * filled circle with a check — use this when the cursor step is
   * really a past milestone from the reader's point of view (e.g.
   * the ongoing-booking detail screen: the trip has already
   * started, so "Trip Starts" is done, and only later steps are
   * pending). Later steps are still rendered as pending regardless.
   */
  renderCurrentAs?: 'current' | 'done';
};

export const BookingProgressTracker: React.FC<Props> = ({
  currentStep,
  subLabels,
  labelOverrides,
  renderCurrentAs = 'current',
}) => {
  return (
    <View style={styles.row}>
      {STEPS.map((step, i) => {
        const state = stateFor(step.key, currentStep, renderCurrentAs);
        const isLast = i === STEPS.length - 1;
        // Segment to the right of this dot; green when THIS step is
        // done (i.e. we've moved past it).
        const segmentDone = state === 'done';
        const sub = subLabels?.[step.key];
        const label = labelOverrides?.[step.key] ?? step.label;
        return (
          <React.Fragment key={step.key}>
            <View style={styles.stepCol}>
              <Dot state={state} />
              <Text
                style={[
                  styles.label,
                  state === 'pending' && styles.labelPending,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
              {sub ? (
                <Text
                  style={[styles.sub, state === 'pending' && styles.subPending]}
                  numberOfLines={2}
                >
                  {sub}
                </Text>
              ) : null}
            </View>
            {!isLast ? (
              <View
                style={[styles.connector, segmentDone && styles.connectorDone]}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
};

/* -------- Dot ---------------------------------------------------- */

const Dot: React.FC<{ state: State }> = ({ state }) => {
  if (state === 'done') {
    return (
      <View style={styles.dotDone}>
        <Check size={12} color={Colors.textOnPrimary} strokeWidth={3} />
      </View>
    );
  }
  if (state === 'current') {
    return (
      <View style={styles.dotCurrent}>
        <View style={styles.dotCurrentInner} />
      </View>
    );
  }
  return <View style={styles.dotPending} />;
};

/* ================================================================
 * Styles
 * ================================================================ */

const DOT = 20; // outer diameter for all three dot states

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  stepCol: {
    alignItems: 'center',
    gap: 3,
    width: 60,
  },

  /* Connector — sits between two step columns. */
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginTop: DOT / 2 - 1,
    marginHorizontal: -20,
  },
  connectorDone: {
    backgroundColor: Colors.primary,
  },

  /* Dots */
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
  dotPending: {
    width: DOT,
    height: DOT,
    borderRadius: Radius.circle,
    backgroundColor: Colors.border,
  },

  /* Labels */
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
  sub: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
    includeFontPadding: false,
  },
  subPending: {
    color: Colors.textTertiary,
  },
});
