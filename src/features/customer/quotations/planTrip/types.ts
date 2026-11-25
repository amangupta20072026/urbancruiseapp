/**
 * ------------------------------------------------------------------
 * Plan a Trip — types
 * ------------------------------------------------------------------
 * A "trip request" is the lead a customer creates from the app. In
 * production it becomes a row in Pinaak's `leads` table, where the
 * presales team calls the customer and the travel advisor prepares
 * the quotation. The app only creates it and shows its status.
 *
 * Trip types are plain strings decided by the backend (the dropdown
 * renders whatever list it sends), so `tripType` is a string and not
 * a fixed union.
 * ------------------------------------------------------------------
 */

/** One option of the trip type dropdown, as sent by the backend. */
export type PlanTripTypeOption = {
  /** Value saved on the lead (varchar). */
  value: string;
  /** Text shown to the customer. */
  label: string;
  /** True when the form must ask for a return date (round trip). */
  needsReturnDate: boolean;
};

/**
 * Customer-facing status of a trip request. Only "received" exists
 * for now: the customer sees "Our travel expert will call you" until
 * a quotation is sent, and the quotation then shows in the list.
 */
export type TripRequestStatus = 'received';

export type CustomerTripRequest = {
  id: string;
  /** Human-readable number shown to the customer, e.g. TRIP-2026-00124. */
  requestNumber: string;
  tripType: string;
  tripTypeLabel: string;
  pickupCity: string;
  dropCity: string;
  /** Pickup date and time, ISO string. */
  pickupAt: string;
  /** Return date (round trip only), ISO string. */
  returnAt: string | null;
  passengers: number;
  notes: string | null;
  status: TripRequestStatus;
  /** When the customer submitted it, ISO string. */
  createdAt: string;
};

/** What the Plan a Trip form submits. */
export type PlanTripInput = Omit<
  CustomerTripRequest,
  'id' | 'requestNumber' | 'status' | 'createdAt'
>;
