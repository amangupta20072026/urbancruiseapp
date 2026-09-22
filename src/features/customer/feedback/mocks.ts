/**
 * ------------------------------------------------------------------
 * Customer Feedback — mock fixture
 * ------------------------------------------------------------------
 * Seeds:
 *   - 3 completed bookings, matching the "Select a Booking" list in
 *     the mockup (Delhi→Jaipur, Gurugram→Agra, Mumbai→Pune)
 *   - 1 already-submitted feedback for the My Feedback tab
 *
 * DELETE when the /customer/feedback endpoints ship.
 * ------------------------------------------------------------------
 */

import { asBookingId } from '@app-types/ids';
import type { CompletedBookingSummary, SubmittedFeedback } from './types';

export const MOCK_COMPLETED_BOOKINGS: readonly CompletedBookingSummary[] = [
  {
    id: asBookingId('bk_00123'),
    from: 'Delhi',
    to: 'Jaipur',
    travelDate: '2026-09-15',
    passengers: 20,
    vehicleType: 'Tempo Traveller',
    vehicleModel: null,
    hasAC: true,
  },
  {
    id: asBookingId('bk_00122'),
    from: 'Gurugram',
    to: 'Agra',
    travelDate: '2026-09-12',
    passengers: 4,
    vehicleType: 'Sedan',
    vehicleModel: null,
    hasAC: true,
  },
  {
    id: asBookingId('bk_00110'),
    from: 'Mumbai',
    to: 'Pune',
    travelDate: '2026-09-05',
    passengers: 12,
    vehicleType: 'Innova Crysta',
    vehicleModel: null,
    hasAC: true,
  },
];

/**
 * Lookup helper used by GiveFeedbackScreen when the route lands with
 * a bookingId. When the /customer/feedback/eligible endpoint ships,
 * this becomes a `getEligibleFeedbackBooking(id)` TanStack query
 * with the same return shape. Callers must handle `null` — the
 * bookingId might be stale (feedback already submitted, or a
 * deeplink from a very old push).
 */
export function getMockCompletedBookingById(
  id: string,
): CompletedBookingSummary | null {
  return MOCK_COMPLETED_BOOKINGS.find(b => b.id === id) ?? null;
}

/**
 * In-memory set of booking IDs that already have a submitted
 * feedback record. Simulates the backend's dedupe key so the mock
 * `useSubmitFeedback` can return a `conflict` error on a repeat
 * submit — otherwise the client couldn't be tested against that
 * branch. DELETE with the mocks.
 */
export const MOCK_SUBMITTED_BOOKING_IDS = new Set<string>(['bk_00087']);

export const MOCK_SUBMITTED_FEEDBACK: readonly SubmittedFeedback[] = [
  {
    id: 'fb_001',
    bookingId: asBookingId('bk_00087'),
    bookingFrom: 'Delhi',
    bookingTo: 'Manali',
    bookingDate: '2026-08-02',
    rating: 5,
    ratings: { overall: 5, executive: 5, driver: 5 },
    tags: ['driver_behaviour', 'vehicle_cleanliness', 'value_for_money'],
    comment:
      'Great trip overall. Driver was courteous and the vehicle was spotless.',
    submittedAt: '2026-08-04T10:00:00Z',
  },
];
