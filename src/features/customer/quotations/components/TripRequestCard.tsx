/**
 * ------------------------------------------------------------------
 * TripRequestCard  (Customer · Quotations tab)
 * ------------------------------------------------------------------
 * View-only card for a trip request the customer sent with
 * "Plan a Trip". Shown above the quotations until the travel expert
 * sends a quotation.
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ Delhi → Jaipur                    [Received] │
 *   │ Round Trip · 12 Dec, 09:00 am · 4 passengers │
 *   │ Return: 14 Dec 2026                          │
 *   │ TRIP-2026-00124                              │
 *   │ ──────────────────────────────────────────── │
 *   │ 📞 Our travel expert will call you           │
 *   └──────────────────────────────────────────────┘
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PhoneCall } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

import {
  formatDate,
  formatPickup,
  passengersLabel,
  routeLabel,
  type CustomerTripRequest,
} from '../planTrip';

type Props = {
  request: CustomerTripRequest;
};

export const TripRequestCard: React.FC<Props> = ({ request }) => {
  const meta = [
    request.tripTypeLabel,
    formatPickup(request.pickupAt),
    passengersLabel(request.passengers),
  ].join(' · ');

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`Trip request ${request.requestNumber}, ${routeLabel(
        request,
      )}, ${meta}. Received. Our travel expert will call you.`}
    >
      <View style={styles.topRow}>
        <Text style={styles.route} numberOfLines={2}>
          {routeLabel(request)}
        </Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>Received</Text>
        </View>
      </View>

      <Text style={styles.meta}>{meta}</Text>
      {request.returnAt ? (
        <Text style={styles.meta}>
          Return: {formatDate(new Date(request.returnAt))}
        </Text>
      ) : null}
      <Text style={styles.number}>{request.requestNumber}</Text>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <PhoneCall size={16} color={Colors.primary} strokeWidth={2} />
        <Text style={styles.infoText}>Our travel expert will call you</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.xs,
    ...Shadows.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.xxs,
  },
  route: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.pill,
    backgroundColor: Colors.warningTint,
  },
  statusText: {
    ...Typography.caption,
    color: Colors.pendingDark,
    fontWeight: '700',
  },
  meta: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  number: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '700',
    flex: 1,
  },
});
