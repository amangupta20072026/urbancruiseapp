/**
 * ------------------------------------------------------------------
 * Trip charge types — shared by Quotation Details and Booking Details
 * ------------------------------------------------------------------
 * Lifted out of `features/customer/bookings/types.ts` unchanged when
 * the Quotation Details screen adopted the same two cards. Both
 * screens describe the SAME commercial terms at two points in the
 * funnel, so one type keeps them from drifting: a row re-worded for
 * a quotation can never disagree with the booking the customer ends
 * up with.
 *
 * Every string is display-ready — `TripCharges.tsx` only lays them
 * out. Ops can re-word freely without a component change.
 * ------------------------------------------------------------------
 */

/** How an "other charge" relates to the quoted fare. */
export type TripChargeStatus =
  /** Already part of the quoted fare (e.g. tolls). */
  | 'included'
  /** Not in the fare — the customer pays the driver directly. */
  | 'not_included'
  /** Billed on top of the fare only when the trip goes beyond plan
   *  (extra km, extra hours). */
  | 'extra';

/** One row of the "Other Charges (if applicable)" card. */
export type TripCharge = {
  /** e.g. "State Tax (Karnataka)". */
  label: string;
  status: TripChargeStatus;
  /** One-line explanation, e.g. "Client will pay to driver". */
  detail: string | null;
  /** Rate lines rendered as small chips, e.g. ["₹20/km", "₹150/hr"]. */
  rates: readonly string[];
  /** Set when the rate depends on ONE known vehicle (e.g. extra km
   *  above 1800): names that vehicle, e.g.
   *  "Option 4 · Royal · 26 Seat Force Traveller". The row then shows
   *  only `rates[0]` as one large chip beside "For your vehicle".
   *
   *  Null for charges that are the same for every vehicle, AND for a
   *  vehicle-dependent charge whose vehicle isn't known yet — on a
   *  pending quotation the customer hasn't picked one, so the row
   *  lists every option's rate as ordinary chips instead. */
  forVehicle: string | null;
};
