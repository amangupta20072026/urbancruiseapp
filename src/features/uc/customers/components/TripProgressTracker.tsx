/**
 * ------------------------------------------------------------------
 * TripProgressTracker
 * ------------------------------------------------------------------
 * Horizontal 4-step tracker for HistoryTripCard, coloured in the
 * trip's status tone (blue upcoming, green completed, red cancelled…).
 *
 *    ●────────○────────○────────○
 *  Booked  Confirmed  Trip Starts  Completed
 *
 * Why not reuse customer/bookings BookingProgressTracker: that one is
 * single-colour (brand green), uses fixed 72px columns and has no
 * terminal "Cancelled" step. Changing it would restyle the customer
 * booking screens too. The step vocabulary (BookingProgressStep) IS
 * shared.
 *
 * Layout: each step is a flex:1 column holding [left rail, dot,
 * right rail] above its label. Rails meet at column edges, so the
 * line is continuous on any screen width with no magic offsets.
 * A rail is coloured when the step to its RIGHT has been reached.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { Colors, Radius, Typography } from '@theme';

import type { TimelineStep } from '../utils/tripTimeline';

type Props = {
  steps: readonly TimelineStep[];
  /** Status tone colour for reached dots and rails. */
  color: string;
};

const TripProgressTrackerImpl: React.FC<Props> = ({ steps, color }) => {
  const lastIndex = steps.length - 1;
  const summary = steps
    .filter(s => s.state !== 'pending')
    .map(s => s.label)
    .join(', ');

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Trip progress: ${summary}`}
    >
      {steps.map((step, i) => {
        const leftActive = i > 0 && step.state !== 'pending';
        const next = steps[i + 1];
        const rightActive = next !== undefined && next.state !== 'pending';
        return (
          <View key={step.key} style={styles.col}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.line,
                  i === 0 && styles.lineHidden,
                  leftActive && { backgroundColor: color },
                ]}
              />
              <Dot state={step.state} color={color} />
              <View
                style={[
                  styles.line,
                  i === lastIndex && styles.lineHidden,
                  rightActive && { backgroundColor: color },
                ]}
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

export const TripProgressTracker = React.memo(TripProgressTrackerImpl);
TripProgressTracker.displayName = 'TripProgressTracker';

/* ---------------- Dot ---------------- */

const Dot: React.FC<{ state: TimelineStep['state']; color: string }> = ({
  state,
  color,
}) => {
  if (state === 'done') {
    return (
      <View style={[styles.dot, { backgroundColor: color }]}>
        <Check size={12} color={Colors.textInverse} strokeWidth={3} />
      </View>
    );
  }
  if (state === 'current') {
    return (
      <View style={[styles.dot, { backgroundColor: color }]}>
        <View style={styles.dotCurrentInner} />
      </View>
    );
  }
  return (
    <View style={[styles.dot, styles.dotPending]}>
      <View style={styles.dotPendingInner} />
    </View>
  );
};

/* ---------------- Styles ---------------- */

const DOT = 22;
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
  line: {
    flex: 1,
    height: LINE,
    backgroundColor: Colors.border,
  },
  lineHidden: {
    backgroundColor: Colors.transparent,
  },

  dot: {
    width: DOT,
    height: DOT,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCurrentInner: {
    width: 8,
    height: 8,
    borderRadius: Radius.circle,
    backgroundColor: Colors.textInverse,
  },
  dotPending: {
    backgroundColor: Colors.border,
  },
  dotPendingInner: {
    width: 10,
    height: 10,
    borderRadius: Radius.circle,
    backgroundColor: Colors.surfaceMuted,
  },

  label: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  labelPending: {
    color: Colors.textSecondary,
    fontWeight: '400',
  },
});
