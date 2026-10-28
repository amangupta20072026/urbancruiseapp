/**
 * ------------------------------------------------------------------
 * BookingProgressTracker — 4-step tracker on the UC booking card
 * ------------------------------------------------------------------
 *   ┄┄ ✓ ━━━━━━ ✓ ━━━━━━ (🚗) ┄┄┄┄┄┄ ○ ┄┄
 *    Booked   Confirmed  Trip Starts  Completed
 *
 * Dots (per BookingStepState):
 *   done     filled in the status colour, white check
 *   current  white with a status-colour ring; a car on 'Trip Starts'
 *            (trip is on the road), an inner dot otherwise
 *   stopped  filled in the status colour, white ✕ (cancelled/no show)
 *   pending  white with a grey ring
 *
 * Rails: a segment is solid in the status colour when the step to
 * its RIGHT has been reached; otherwise dotted grey. The outer stubs
 * before the first and after the last dot are dotted grey, or hidden
 * with `edgeStubs={false}`.
 *
 * Shared by UC Bookings (defaults) and UC Trips (`startedMarker="dot"`,
 * `edgeStubs={false}`) — the two designs differ only in those two
 * details, so one component keeps both trackers in step.
 *
 * Why not reuse customers/TripProgressTracker: that one inserts a
 * separate "Cancelled" step and fills the current dot. The approved
 * Bookings design marks the stopped step with ✕ and rings the
 * current one. Changing it would restyle Trip History too.
 *
 * Layout: each step is a flex:1 column holding [left rail, dot,
 * right rail] above its label, so rails meet at column edges and the
 * line is continuous on any width with no magic offsets.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Car, Check, X } from 'lucide-react-native';

import { Colors, FontWeight, Radius, Typography } from '@theme';

import type {
  BookingStepState,
  BookingTimelineStep,
} from '../utils/bookingTimeline';

type Props = {
  steps: readonly BookingTimelineStep[];
  /** Status colour for reached dots and solid rails. */
  color: string;
  /**
   * Marker inside the CURRENT dot on the 'started' step: a car
   * (Bookings design, default) or a plain inner dot (Trips design).
   */
  startedMarker?: 'car' | 'dot';
  /**
   * Dotted stubs before the first and after the last dot (Bookings
   * design, default). The Trips design starts and ends at the dots.
   */
  edgeStubs?: boolean;
  /** Spoken prefix for screen readers. */
  accessibilityPrefix?: string;
};

const STATE_SPOKEN: Readonly<Record<BookingStepState, string>> = {
  done: 'done',
  current: 'in progress',
  stopped: 'stopped here',
  pending: 'not reached',
};

const BookingProgressTrackerImpl: React.FC<Props> = ({
  steps,
  color,
  startedMarker = 'car',
  edgeStubs = true,
  accessibilityPrefix = 'Booking progress',
}) => {
  const lastIndex = steps.length - 1;
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
        const leftReached = i > 0 && step.state !== 'pending';
        const next = steps[i + 1];
        const rightReached = next !== undefined && next.state !== 'pending';
        return (
          <View key={step.key} style={styles.col}>
            <View style={styles.rail}>
              <Segment
                solid={leftReached}
                color={color}
                hidden={!edgeStubs && i === 0}
              />
              <Dot
                state={step.state}
                color={color}
                showCar={step.key === 'started' && startedMarker === 'car'}
              />
              <Segment
                solid={rightReached}
                color={color}
                hidden={!edgeStubs && i === lastIndex}
              />
            </View>
            <Text
              style={[
                styles.label,
                step.state === 'pending' && styles.labelPending,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

export const BookingProgressTracker = React.memo(BookingProgressTrackerImpl);
BookingProgressTracker.displayName = 'BookingProgressTracker';

/* ---------------- Segment ---------------- */

const Segment: React.FC<{
  solid: boolean;
  color: string;
  /** Keeps the column's width so dots stay centred, draws nothing. */
  hidden?: boolean;
}> = ({ solid, color, hidden = false }) => {
  if (hidden) {
    return <View style={styles.dottedWrap} />;
  }
  if (solid) {
    return <View style={[styles.solid, { backgroundColor: color }]} />;
  }
  // SVG dash: RN's borderStyle 'dashed' on a single edge renders
  // inconsistently on iOS, an SVG line is identical on both platforms.
  return (
    <View style={styles.dottedWrap}>
      <Svg width="100%" height={LINE}>
        <Line
          x1="0"
          y1={LINE / 2}
          x2="100%"
          y2={LINE / 2}
          stroke={Colors.textDisabled}
          strokeWidth={LINE}
          strokeDasharray="2 4"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};

/* ---------------- Dot ---------------- */

const Dot: React.FC<{
  state: BookingStepState;
  color: string;
  showCar: boolean;
}> = ({ state, color, showCar }) => {
  switch (state) {
    case 'done':
      return (
        <View style={[styles.dot, { backgroundColor: color }]}>
          <Check size={13} color={Colors.textInverse} strokeWidth={3} />
        </View>
      );
    case 'stopped':
      return (
        <View style={[styles.dot, { backgroundColor: color }]}>
          <X size={13} color={Colors.textInverse} strokeWidth={3} />
        </View>
      );
    case 'current':
      return (
        <View style={[styles.dot, styles.dotRing, { borderColor: color }]}>
          {showCar ? (
            <Car size={13} color={color} strokeWidth={2.4} />
          ) : (
            <View style={[styles.dotInner, { backgroundColor: color }]} />
          )}
        </View>
      );
    case 'pending':
      return <View style={[styles.dot, styles.dotRing, styles.dotPending]} />;
  }
};

/* ---------------- Styles ---------------- */

const DOT = 24;
const LINE = 2;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  rail: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    height: DOT,
  },
  solid: {
    flex: 1,
    height: LINE,
  },
  dottedWrap: {
    flex: 1,
    height: LINE,
  },

  dot: {
    width: DOT,
    height: DOT,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotRing: {
    borderWidth: 2,
    backgroundColor: Colors.surface,
  },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: Radius.circle,
  },
  dotPending: {
    borderWidth: 1.5,
    borderColor: Colors.textDisabled,
  },

  label: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: FontWeight.semiBold,
    textAlign: 'center',
    includeFontPadding: false,
  },
  labelPending: {
    color: Colors.textSecondary,
    fontWeight: FontWeight.regular,
  },
});
