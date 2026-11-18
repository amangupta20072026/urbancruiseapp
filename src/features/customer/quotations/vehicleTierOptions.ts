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

/** Title-case tier name for running text, e.g. the "For your vehicle"
 *  line on the Other Charges card. The pill above shouts; prose
 *  shouldn't. Booking Details already uses these exact spellings in
 *  `BookingVehicleOption.tier`, so the two screens read alike. */
export const VEHICLE_TIER_NAMES: Readonly<Record<VehicleTierKey, string>> = {
  economy: 'Economy',
  premium: 'Premium',
  royal: 'Royal',
  royal_vip: 'Royal VIP',
};

/** One tier's colours. */
export type VehicleTierPalette = {
  /** Strong colour: tabs, tier tags (white text on it), selected
   *  card border / price / ✓ / button, tinted-badge text. */
  solid: string;
  /** Light tint: image background, tinted badge background. */
  tint: string;
  /** Faintest wash: selected card background. */
  wash: string;
};

/**
 * THE tier colours — the one place they are defined. "Rising value":
 * green → blue → purple → gold, getting richer as the tier goes up.
 * Used everywhere a tier is coloured: Quotation Details (tier tabs and
 * vehicle cards), the brochure screens' tier tags (Vehicle Brochures,
 * Compare Vehicles, Vehicle Video) and the Booking Details vehicle
 * card's tier badge.
 *
 * Contrast (WCAG AA, small text): white on every `solid` is ≥ 4.9:1,
 * and every `solid` on its own `tint` is ≥ 4.5:1.
 */
export const VEHICLE_TIER_PALETTE: Readonly<
  Record<VehicleTierKey, VehicleTierPalette>
> = {
  economy: { solid: '#2E7D32', tint: '#E7F7EC', wash: '#F4FBF5' },
  premium: { solid: '#1D4ED8', tint: '#DBEAFE', wash: '#EFF6FF' },
  royal: { solid: '#7E22CE', tint: '#F3E8FF', wash: '#FAF5FF' },
  royal_vip: { solid: '#A16207', tint: '#FEF7DD', wash: '#FFFBEB' },
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
  /**
   * Row number on the ops rate sheet ("Vehicle Options & Pricing",
   * #1 … #7), 1-based. NOT the array index — ops may reorder or
   * retire a row, and the number is what they, the customer and the
   * booking all quote ("Option 4"). `BookingVehicleOption.number` on
   * the booking side is the same number.
   */
  number: number;
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
    number: 1,
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
    number: 2,
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
    number: 3,
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
    number: 4,
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
    number: 5,
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
    number: 6,
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
    number: 7,
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

/**
 * One-line name for a chosen vehicle, e.g.
 *   "Option 4 · Royal · 26 Seat Force Traveller"
 *
 * Used by the "For your vehicle" line on the Other Charges card.
 * Deliberately identical in shape to what Booking Details builds from
 * `BookingVehicleOption`, so the same charge reads the same way
 * before and after the customer confirms.
 */
export function describeVehicleOption(option: VehicleOption): string {
  return [
    `Option ${option.number}`,
    VEHICLE_TIER_NAMES[option.tier],
    `${option.seats} Seat ${option.model}`,
  ].join(' · ');
}

/* -------- Invariant check --------
 *
 * `number` is the rate sheet's row number and other data keys off it
 * (extra-km rates, the booking's `vehicleOption.number`). A duplicate
 * or a gap means two vehicles answer to "Option 4". Runs once at
 * module load in development only; production bundles pay nothing. */
if (__DEV__) {
  const numbers = VEHICLE_OPTIONS.map(o => o.number);
  const unique = new Set(numbers);
  if (unique.size !== numbers.length) {
    throw new Error(
      `[vehicleTierOptions] duplicate option number in ${numbers.join(', ')}`,
    );
  }
  const ids = new Set(VEHICLE_OPTIONS.map(o => o.id));
  if (ids.size !== VEHICLE_OPTIONS.length) {
    throw new Error('[vehicleTierOptions] duplicate option id');
  }
}
