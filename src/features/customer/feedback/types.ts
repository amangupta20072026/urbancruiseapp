/**
 * ------------------------------------------------------------------
 * Customer Feedback — types
 * ------------------------------------------------------------------
 * SSoT for the general Feedback screen. This is the "Feedback" tile
 * from the Customer More sheet — a general-purpose form users open
 * to rate any of their completed trips.
 *
 * Distinct from the booking-scoped `Feedback` route (customer/…/
 * bookings/Feedback in the navigator) which is auto-launched after
 * a trip completes; that flow is scoped to ONE bookingId. Here the
 * user picks which past trip to rate.
 *
 * When the /customer/feedback endpoints ship, this file is the DTO
 * contract for both submit + list.
 * ------------------------------------------------------------------
 */

import type { BookingId } from '@app-types/ids';

export type FeedbackTab = 'give' | 'my';

/**
 * The pre-defined "what did you like" chip vocabulary. A closed
 * union so the server can pin the taxonomy in advance and reject
 * anything unknown — tag counts become useful analytics only if
 * the option set is stable.
 */
export type LikeTag =
  | 'clean_vehicle'
  | 'ontime_service'
  | 'professional_driver'
  | 'comfortable_ride'
  | 'good_support'
  | 'value_for_money';

/**
 * Trimmed-down booking projection for the "Select a Booking" list.
 * Only completed trips are eligible for feedback; the endpoint will
 * pre-filter, so the screen never has to.
 */
export type CompletedBookingSummary = {
  id: BookingId;
  from: string;
  to: string;
  travelDate: string; // ISO
  passengers: number;
  vehicleType: string;
  vehicleModel: string | null;
  hasAC: boolean;
};

/**
 * A previously-submitted feedback entry — rendered in the
 * "My Feedback" tab. Carries a snapshot of the trip context so
 * the tab list doesn't need a second lookup.
 */
export type SubmittedFeedback = {
  id: string;
  bookingId: BookingId;
  bookingFrom: string;
  bookingTo: string;
  /** ISO date of the trip (not the submission). */
  bookingDate: string;
  /** 1..5 integer overall rating. */
  rating: number;
  tags: LikeTag[];
  comment: string;
  /** ISO timestamp when the feedback was submitted. */
  submittedAt: string;
};
