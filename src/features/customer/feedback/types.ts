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
 * The pre-defined "what did we do well" chip vocabulary. A closed
 * union so the server can pin the taxonomy in advance and reject
 * anything unknown — tag counts become useful analytics only if
 * the option set is stable.
 *
 * The union was rewritten to match the redesigned Rate Your
 * Experience surface. The old vocabulary (`clean_vehicle`,
 * `ontime_service`, `professional_driver`, `good_support`) split
 * across the new category rating rows (executive / driver) and the
 * new chip set; the closest replacements are noted next to each
 * new key for anyone reconciling historic feedback records.
 */
export type LikeTag =
  | 'driver_behaviour' // was implicit in "professional_driver"
  | 'vehicle_cleanliness' // was "clean_vehicle"
  | 'comfortable_ride'
  | 'ontime_pickup' // was "ontime_service"
  | 'value_for_money'
  | 'safe_driving'
  | 'executive_support' // was "good_support"
  | 'booking_experience';

/**
 * Per-category integer ratings (1..5). The redesigned Rate Your
 * Experience surface asks the customer to score three axes
 * independently rather than a single "Overall Rating".
 *
 * `overall` is treated as the top-line rating for tab lists and
 * analytics — it's the value carried in `SubmittedFeedback.rating`.
 * `executive` and `driver` are additional dimensions.
 */
export type RatingCategories = {
  overall: number;
  executive: number;
  driver: number;
};

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
  /** 1..5 integer overall rating (mirrors `ratings.overall`). */
  rating: number;
  /**
   * Per-category breakdown of the rating. Optional so older records
   * (or backends still on the single-star schema) round-trip
   * cleanly — screens fall back to `rating` when this is absent.
   */
  ratings?: RatingCategories;
  tags: LikeTag[];
  comment: string;
  /** ISO timestamp when the feedback was submitted. */
  submittedAt: string;
};
