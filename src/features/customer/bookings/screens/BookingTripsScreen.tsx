/**
 * ------------------------------------------------------------------
 * BookingTripsScreen (Customer)
 * ------------------------------------------------------------------
 * Every trip of ONE booking. Opens when the customer taps a booking
 * card (or its "View All Trips" button) on the Bookings tab and that
 * booking has more than one trip.
 *
 *   ‹ BK-2026-001250
 *     2 trips · Total Amount ₹30,000
 *   ┌ (1) [Upcoming] [Round Trip]            Trip ID ┐
 *   │ dates · days / route / passengers · vehicle    │
 *   │ [ View Details ]                               │
 *   └────────────────────────────────────────────────┘
 *   ┌ (2) [Ongoing] [One Way]                Trip ID ┐
 *   │ …                                              │
 *   └────────────────────────────────────────────────┘
 *
 * Each trip card is the same BookingCard the list uses, in 'trip'
 * mode: its own status, dates, route, passengers, vehicle and
 * actions, the Trip ID instead of the Booking ID, and no amount — the
 * amount belongs to the booking and is shown once, in the header.
 *
 * Tapping a trip opens BookingDetail for that trip
 * (`{ bookingId, tripId }`).
 *
 * DATA:
 *   Local mock fixture (`getCustomerBooking`). Swap for the
 *   /customer/bookings/:id query when it ships.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Spacing, Typography } from '@theme';
import { notifyComingSoon } from '@services/comingSoon';
import type { CustomerStackParamList } from '@navigation/types';

import type { CustomerBookingListItem, CustomerBookingTrip } from '../types';
import { getCustomerBooking } from '../mocks';
import { BookingCard } from '../components/BookingCard';

type Nav = NativeStackNavigationProp<CustomerStackParamList, 'BookingTrips'>;
type Route = RouteProp<CustomerStackParamList, 'BookingTrips'>;

/** ₹30,000 — Indian grouping. */
function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

const BookingTripsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const booking = useMemo<CustomerBookingListItem | null>(
    () => getCustomerBooking(route.params.bookingId),
    [route.params.bookingId],
  );

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const openTrip = useCallback(
    (trip: CustomerBookingTrip) => {
      if (!booking) return;
      navigation.navigate('BookingDetail', {
        bookingId: booking.id,
        tripId: trip.tripId,
      });
    },
    [navigation, booking],
  );

  const onModifyBooking = useCallback(() => {
    // Same as the Bookings list: modification isn't built yet.
    notifyComingSoon('customer.modifyBooking');
  }, []);

  const onTrackVehicle = useCallback(() => {
    // Same as the Bookings list: live tracking isn't built yet.
    notifyComingSoon('customer.tripLive');
  }, []);

  const onBookAgain = useCallback(() => {
    // Same as the Bookings list: launches the empty form for now.
    navigation.navigate('RequestQuotation');
  }, [navigation]);

  /* -------- Not-found guard -------- */
  if (!booking) {
    return (
      <SafeScreen edges={['top']} backgroundColor={Colors.background}>
        <View style={styles.headerWrap}>
          <ScreenHeader title="Booking Trips" onBack={handleBack} />
        </View>
        <View style={styles.notFoundWrap}>
          <Text style={styles.notFoundTitle}>Booking not found</Text>
          <Text style={styles.notFoundSubtitle}>
            This booking may have been removed or is no longer available.
          </Text>
        </View>
      </SafeScreen>
    );
  }

  const tripCount = booking.trips.length;

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title={booking.bookingNumber}
          subtitle={`${tripCount} ${
            tripCount === 1 ? 'trip' : 'trips'
          } · Total Amount ${formatRupees(booking.totalAmount)}`}
          onBack={handleBack}
        />
      </View>

      <ScrollView
        style={styles.listBg}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {booking.trips.map((trip, i) => (
          <BookingCard
            key={trip.tripId}
            trip={trip}
            mode={{ kind: 'trip', position: i + 1 }}
            onPress={() => openTrip(trip)}
            onViewDetails={() => openTrip(trip)}
            onModifyBooking={onModifyBooking}
            onTrackVehicle={onTrackVehicle}
            onBookAgain={onBookAgain}
          />
        ))}
      </ScrollView>
    </SafeScreen>
  );
};

export default BookingTripsScreen;

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },

  /* List — `flex: 1` so short lists stack from the top. */
  listBg: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxxl,
    gap: Spacing.md,
  },

  /* Not found */
  notFoundWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xs,
  },
  notFoundTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  notFoundSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
