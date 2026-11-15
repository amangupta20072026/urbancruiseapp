/**
 * ------------------------------------------------------------------
 * Other Charges — narrowing a quotation's rows to the chosen vehicle
 * ------------------------------------------------------------------
 * Booking Details can always name the vehicle, so its "Extra Charge
 * above 1800 km" row shows ONE rate beside "For your vehicle". A
 * pending quotation can't: the customer is still choosing, and the
 * rate sheet prices extra km differently per option (₹20/km for
 * options 1–3, ₹26/km for 4, ₹40/km for 5).
 *
 * So the quotation's row carries every option's rate in
 * `vehicleRates`, and this function collapses it to the one that
 * applies the moment the customer picks a vehicle — giving the two
 * screens the same row, at the same moment the information exists.
 *
 * WHY A MAP, NOT A LABEL MATCH
 *   The row itself declares that it is vehicle-priced. Nothing here
 *   looks for "Extra Charge above 1800 km" by name, so ops can
 *   re-word the label, and a second vehicle-priced charge needs no
 *   change here at all.
 *
 * Pure — no React, no I/O — so every branch is unit-testable.
 * ------------------------------------------------------------------
 */

import type { TripCharge } from '@shared/components/TripCharges';

import type { QuotationCharge } from '../types';
import {
  describeVehicleOption,
  type VehicleOption,
} from '../vehicleTierOptions';

/**
 * Collapse every vehicle-priced row to `option`'s own rate.
 *
 * A row is left exactly as it is when:
 *   - no vehicle is selected yet (`option` is null) — the customer
 *     sees each option's rate as ordinary chips, so nothing is
 *     hidden before they choose;
 *   - the row is not vehicle-priced (`vehicleRates` is null);
 *   - the rate sheet does not price this option (options 6 and 7
 *     today). Showing the full list beats inventing a number.
 *
 * Returns the same array reference when nothing changed, so a
 * `useMemo` around it won't re-render the card for no reason.
 */
export function narrowChargesToVehicle(
  charges: readonly QuotationCharge[],
  option: VehicleOption | null,
): readonly TripCharge[] {
  if (!option) return charges;

  let changed = false;
  const narrowed = charges.map<TripCharge>(charge => {
    const rate = charge.vehicleRates?.[option.id];
    if (!rate) return charge;
    changed = true;
    return {
      ...charge,
      rates: [rate],
      forVehicle: describeVehicleOption(option),
    };
  });

  return changed ? narrowed : charges;
}
