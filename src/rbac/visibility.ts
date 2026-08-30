/**
 * ------------------------------------------------------------------
 * RBAC Visibility Rules
 * ------------------------------------------------------------------
 * Time-gated and approval-gated visibility. Pure functions.
 *
 * The SERVER is the source of truth for these rules. This file mirrors
 * them on the client for UX — hiding fields, disabling buttons.
 * ------------------------------------------------------------------
 */

import type { ISODateTime } from '@app-types/datetime';

type BookingLike = {
  status:
    | 'pendingAck'
    | 'acknowledged'
    | 'assigned'
    | 'ongoing'
    | 'completed'
    | 'cancelled';
  driverAssigned: boolean;
  vehicleAssigned: boolean;
  ucApprovedAssignment: boolean;
  firstLegStart: ISODateTime;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * RBAC RULE 1 — Driver sees customer phone/address only:
 *   • when a driver has been assigned, AND
 *   • booking is 'assigned' or 'ongoing', AND
 *   • trip starts within 24 hours.
 */
export function isDriverCustomerContactUnlocked(
  booking: BookingLike,
  now: Date = new Date(),
): boolean {
  if (!booking.driverAssigned) return false;
  if (booking.status !== 'assigned' && booking.status !== 'ongoing')
    return false;
  const startMs = new Date(booking.firstLegStart).getTime();
  return startMs - now.getTime() <= DAY_MS;
}

/**
 * RBAC RULE 2 — Customer sees driver/vehicle only after UC approves.
 * NOT just "assigned" — UC-approved is a separate flag.
 */
export function isCustomerVehicleRevealed(booking: BookingLike): boolean {
  return booking.vehicleAssigned && booking.ucApprovedAssignment;
}

export function isCustomerDriverRevealed(booking: BookingLike): boolean {
  return booking.driverAssigned && booking.ucApprovedAssignment;
}
