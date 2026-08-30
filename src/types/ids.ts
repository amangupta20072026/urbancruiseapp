/**
 * ------------------------------------------------------------------
 * Branded ID Types
 * ------------------------------------------------------------------
 * At runtime these are all strings. At compile time, TypeScript refuses
 * to mix them. This catches bugs like passing an EnquiryId where a
 * BookingId is expected.
 *
 * The RBAC-spec rule "Booking ID hard-equals Enquiry ID once quotation
 * is confirmed" is enforced by `enquiryToBookingId()` — the ONLY
 * sanctioned conversion.
 * ------------------------------------------------------------------
 */

type Brand<T, K extends string> = T & { readonly __brand: K };

export type EnquiryId = Brand<string, 'EnquiryId'>;
export type LeadId = Brand<string, 'LeadId'>;
export type QuotationId = Brand<string, 'QuotationId'>;
export type BookingId = Brand<string, 'BookingId'>;
export type TripId = Brand<string, 'TripId'>;
export type VehicleId = Brand<string, 'VehicleId'>;

export type CustomerId = Brand<string, 'CustomerId'>;
export type VendorId = Brand<string, 'VendorId'>;
export type DriverId = Brand<string, 'DriverId'>;
export type UcUserId = Brand<string, 'UcUserId'>;

// -----------------------------------------------------------------
// Constructors — use these when receiving IDs from the API.
// -----------------------------------------------------------------
export const asEnquiryId = (id: string): EnquiryId => id as EnquiryId;
export const asLeadId = (id: string): LeadId => id as LeadId;
export const asQuotationId = (id: string): QuotationId => id as QuotationId;
export const asBookingId = (id: string): BookingId => id as BookingId;
export const asTripId = (id: string): TripId => id as TripId;
export const asVehicleId = (id: string): VehicleId => id as VehicleId;

export const asCustomerId = (id: string): CustomerId => id as CustomerId;
export const asVendorId = (id: string): VendorId => id as VendorId;
export const asDriverId = (id: string): DriverId => id as DriverId;
export const asUcUserId = (id: string): UcUserId => id as UcUserId;

// -----------------------------------------------------------------
// Domain conversions — the ONLY sanctioned boundaries.
// -----------------------------------------------------------------

/**
 * BUSINESS RULE (RBAC spec): Once a Customer confirms + pays a Quotation,
 * the Booking ID equals the Enquiry ID. Do this ONE conversion here.
 */
export const enquiryToBookingId = (id: EnquiryId): BookingId =>
  id as unknown as BookingId;

/**
 * BUSINESS RULE (RBAC spec): A Trip ID is a Booking ID + suffix (a, b, c…),
 * one per vehicle for multi-vehicle bookings.
 */
export const tripIdFrom = (booking: BookingId, suffix: string): TripId =>
  `${booking}${suffix}` as unknown as TripId;
