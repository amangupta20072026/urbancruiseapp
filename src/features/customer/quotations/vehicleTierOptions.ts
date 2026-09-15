/**
 * ------------------------------------------------------------------
 * Vehicle tier options — "Choose Your Vehicle" (pending quotations)
 * ------------------------------------------------------------------
 * While a quotation is `pending`, the vehicle ops proposed isn't
 * locked in yet, so the detail screen offers a tier picker instead
 * of the plain read-only Vehicle Details card (that card is still
 * used once the quotation is `accepted` / `expired`, when the
 * vehicle IS locked in).
 *
 * Mock-only for now — no `tripId`/`quotationId` scoping, since the
 * tier list is the same catalogue regardless of route. When a real
 * "change vehicle tier" endpoint lands, this becomes the response
 * shape and `price` moves from a flat mock number to a per-route
 * quote.
 * ------------------------------------------------------------------ */

export type VehicleTierKey = 'economy' | 'premium' | 'royal' | 'royal_vip';

export type VehicleTierOption = {
  key: VehicleTierKey;
  name: string;
  seater: number;
  /** Chassis/type line, e.g. "Force Traveller", "Force Urbania (2x1)". */
  type: string;
  price: number;
  /** Shows a "MOST POPULAR" badge on the card when true. */
  popular?: boolean;
  /** Shown as a checklist once the card is expanded. */
  features: readonly string[];
};

export const VEHICLE_TIER_OPTIONS: readonly VehicleTierOption[] = [
  {
    key: 'economy',
    name: 'Economy',
    seater: 16,
    type: 'Force Traveller',
    price: 40000,
    features: ['Basic AC', 'Non-Recline Seat', 'Basic Music System'],
  },
  {
    key: 'premium',
    name: 'Premium',
    seater: 16,
    type: 'Force Traveller',
    price: 44000,
    features: [
      'AC',
      'Recline Seat',
      'Charging Point',
      'Music System + Speaker',
    ],
  },
  {
    key: 'royal',
    name: 'Royal',
    seater: 16,
    type: 'Force Traveller',
    price: 45000,
    popular: true,
    features: [
      'Modified Vehicle',
      'Good AC',
      'Recline Seat',
      'Charging Point',
      'BT Music + Speaker',
      'Sofa / Bed',
    ],
  },
  {
    key: 'royal_vip',
    name: 'Royal VIP',
    seater: 16,
    type: 'Force Urbania (2x1)',
    price: 56000,
    features: [
      'Powerful AC',
      '2x1 Recline Seat',
      'Panoramic Windows',
      'Charging Points',
      'Personal AC Vents',
      'BT Music + Speaker',
      'Comfort & Silent Ride',
    ],
  },
];
