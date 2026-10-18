/**
 * ------------------------------------------------------------------
 * Vehicle options — "Choose Your Vehicle" (pending quotations)
 * ------------------------------------------------------------------
 * While a quotation is `pending`, the vehicle ops proposed isn't
 * locked in yet, so the detail screen offers a vehicle picker
 * instead of the plain read-only Vehicle Details card (that card is
 * still used once the quotation is `accepted` / `expired`).
 *
 * TIER vs OPTION:
 *   A tier (Economy / Premium / Royal / Royal VIP) is a comfort
 *   class. An option is one concrete vehicle offered at that tier.
 *   One tier can have several options — e.g. Royal VIP is offered
 *   as both a Force Traveller and a Force Urbania — so every option
 *   carries its own `id`, and selection is keyed on `id`, never on
 *   `tier`.
 *
 * QUANTITY:
 *   Large groups may need more than one vehicle. The customer picks
 *   ONE option and a quantity (1..maxQuantity). `pricePerVehicle`
 *   is per unit; the total is `pricePerVehicle × quantity`.
 *
 * Mock-only for now. When the "quotation vehicle options" endpoint
 * lands, this becomes the response shape and prices become a
 * per-route quote.
 * ------------------------------------------------------------------ */

export type VehicleTierKey = 'economy' | 'premium' | 'royal' | 'royal_vip';

/** Display label for each tier's pill. */
export const VEHICLE_TIER_LABELS: Readonly<Record<VehicleTierKey, string>> = {
  economy: 'ECONOMY',
  premium: 'PREMIUM',
  royal: 'ROYAL',
  royal_vip: 'ROYAL VIP',
};

/**
 * Amenity kinds the card knows how to draw an icon for. `label` on
 * each amenity is free text, so ops can say "BT Music" vs "Music
 * System" without a new kind.
 */
export type VehicleAmenityKind =
  | 'ac'
  | 'music'
  | 'charging'
  | 'sofa_bed'
  | 'tv'
  | 'panoramic';

export type VehicleAmenity = {
  kind: VehicleAmenityKind;
  label: string;
};

export type VehicleOption = {
  /** Unique per option. Selection is keyed on this. */
  id: string;
  tier: VehicleTierKey;
  /** Vehicle model, e.g. "Force Traveller". Card title. */
  model: string;
  /** One-line spec summary under the title. */
  description: string;
  seats: number;
  /**
   * Highlight chips in the spec row, after Seats. The card shows at
   * most 3 so the row stays on one line on a 360dp phone; put the
   * most distinctive amenities first.
   */
  amenities: readonly VehicleAmenity[];
  pricePerVehicle: number;
  /** Shows a "Most popular" badge on the card when true. */
  popular?: boolean;
  /** Upper bound for the quantity stepper. Defaults to 10. */
  maxQuantity?: number;
  /** Thumbnail. Optional — the card falls back to a bus icon. */
  image?: number;
};

/** What the screen holds once the customer commits to a vehicle. */
export type VehicleSelection = {
  optionId: string;
  quantity: number;
};

export const DEFAULT_MAX_VEHICLE_QUANTITY = 10;

// Placeholder image shared by every option until per-model assets
// land (same convention as PLACEHOLDER_VEHICLE_IMG in mocks.ts).
const PLACEHOLDER_IMG = require('@assets/images/service-car.png');

export const VEHICLE_OPTIONS: readonly VehicleOption[] = [
  {
    id: 'economy-traveller-13',
    tier: 'economy',
    model: 'Force Traveller',
    description: 'Basic A/c, Non-Recline Seat, Basic',
    seats: 13,
    amenities: [
      { kind: 'ac', label: 'A/C' },
      { kind: 'music', label: 'Basic' },
    ],
    pricePerVehicle: 15800,
    image: PLACEHOLDER_IMG,
  },
  {
    id: 'premium-traveller-13',
    tier: 'premium',
    model: 'Force Traveller',
    description:
      '2018-20 Model, A/c, Recline Seat, Charging Point, Music System + Speaker',
    seats: 13,
    amenities: [
      { kind: 'ac', label: 'A/C' },
      { kind: 'music', label: 'Music' },
      { kind: 'charging', label: 'Charging' },
    ],
    pricePerVehicle: 16400,
    image: PLACEHOLDER_IMG,
  },
  {
    id: 'royal-traveller-13',
    tier: 'royal',
    model: 'Force Traveller',
    description:
      '2021-23 Model, Modified Veh., Good A/c, Recline Seat, Charging Point, BT Music + Speaker, Sofa/Bed',
    seats: 13,
    amenities: [
      { kind: 'ac', label: 'A/C' },
      { kind: 'music', label: 'BT Music' },
      { kind: 'sofa_bed', label: 'Sofa/Bed' },
    ],
    pricePerVehicle: 17000,
    popular: true,
    image: PLACEHOLDER_IMG,
  },
  {
    id: 'royal-traveller-26',
    tier: 'royal',
    model: 'Force Traveller',
    description:
      '2021-23 Model, Modified Veh., Good A/c, Recline Seat, Charging Point, BT Music + Speaker, Sofa/Bed',
    seats: 26,
    amenities: [
      { kind: 'ac', label: 'A/C' },
      { kind: 'music', label: 'BT Music' },
      { kind: 'sofa_bed', label: 'Sofa/Bed' },
    ],
    // TODO(data): price copied from the rate sheet, where it equals
    // the 13-seat Royal. Confirm with ops before go-live.
    pricePerVehicle: 17000,
    image: PLACEHOLDER_IMG,
  },
  {
    id: 'royal-vip-traveller-12',
    tier: 'royal_vip',
    model: 'Force Traveller',
    description:
      'A/c, 1x1 VIP Maharaja Seat, More Legroom, Custom Designed Veh., Charging Points, Personal A/c Vent, BT Touch Music + Good Speakers, HD TV',
    seats: 12,
    amenities: [
      { kind: 'ac', label: 'A/C' },
      { kind: 'music', label: 'BT Music' },
      { kind: 'tv', label: 'HD TV' },
    ],
    pricePerVehicle: 21200,
    image: PLACEHOLDER_IMG,
  },
  {
    id: 'royal-vip-urbania-15-a',
    tier: 'royal_vip',
    model: 'Force Urbania',
    description:
      'A/c, 2x1 Recline Seat (15), Comfortable & Silent Cabin, Panoramic Window, Charging Points, Personal A/c Vents, BT Music + Speaker, Comfort, Silent',
    seats: 15,
    amenities: [
      { kind: 'ac', label: 'A/C' },
      { kind: 'music', label: 'BT Music' },
      { kind: 'panoramic', label: 'Panoramic' },
    ],
    pricePerVehicle: 30000,
    image: PLACEHOLDER_IMG,
  },
  {
    id: 'royal-vip-urbania-15-b',
    tier: 'royal_vip',
    model: 'Force Urbania',
    // TODO(data): identical to the row above in the rate sheet (its
    // text is cut off there). Confirm what makes this one different.
    description:
      'A/c, 2x1 Recline Seat (15), Comfortable & Silent Cabin, Panoramic Window, Charging Points, Personal A/c Vents, BT Music + Speaker, Comfort, Silent',
    seats: 15,
    amenities: [
      { kind: 'ac', label: 'A/C' },
      { kind: 'music', label: 'BT Music' },
      { kind: 'panoramic', label: 'Panoramic' },
    ],
    pricePerVehicle: 30000,
    image: PLACEHOLDER_IMG,
  },
];

export function findVehicleOption(id: string): VehicleOption | undefined {
  return VEHICLE_OPTIONS.find(o => o.id === id);
}
