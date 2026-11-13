/**
 * ------------------------------------------------------------------
 * HistoryFilterChips
 * ------------------------------------------------------------------
 * Trip-history status chips: All / Upcoming / Ongoing / Completed /
 * Cancelled. Used by Trip History, the UC Bookings tab and the UC
 * Trips tab.
 *
 * This is now a thin wrapper over
 * `@features/uc/_shared/components/StatusFilterChips`, which owns all
 * the markup and styling. The look is unchanged — the shared file is
 * this component's own chip code, lifted out so the Quotations tab
 * could render through it instead of keeping a second copy. Two files
 * drawing chips is how two screens end up with different sized chips.
 *
 * Everything this component adds on top:
 *   - the fixed five-chip order,
 *   - the HISTORY_STATUS_LABEL text,
 *   - the default Trip History palette.
 * ------------------------------------------------------------------ */

import React, { useMemo } from 'react';

import { Colors } from '@theme';
import {
  StatusFilterChips,
  type StatusChipPalette,
  type StatusChipTone,
} from '@features/uc/_shared/components/StatusFilterChips';

import {
  HISTORY_STATUS_LABEL,
  TRIP_STATUS_TONE,
  type HistoryStatusFilter,
} from '../types';

/* ---------------- Palette ---------------- */

/** Kept as named exports: UcTripCard builds its palette from these. */
export type FilterChipTone = StatusChipTone;
export type FilterChipPalette = StatusChipPalette<HistoryStatusFilter>;

/**
 * Default palette: the Trip History card colours. Status `solid`s are
 * read from TRIP_STATUS_TONE (the cards' source) so chips and cards
 * can't drift apart. "All" has no card, so it uses the brand's royal
 * purple — a fifth colour none of the statuses use.
 */
export const TRIP_HISTORY_CHIP_PALETTE: FilterChipPalette = Object.freeze({
  all: { solid: Colors.royal, tint: Colors.royalTint },
  upcoming: {
    solid: TRIP_STATUS_TONE.upcoming.solid,
    tint: Colors.completedTint,
  },
  ongoing: {
    solid: TRIP_STATUS_TONE.in_progress.solid,
    tint: Colors.accentTint,
  },
  completed: {
    solid: TRIP_STATUS_TONE.completed.solid,
    tint: Colors.primaryTint,
  },
  cancelled: {
    solid: TRIP_STATUS_TONE.cancelled.solid,
    tint: Colors.errorTint,
  },
});

/** Display order of the chips (left → right). */
const ORDER: readonly HistoryStatusFilter[] = [
  'all',
  'upcoming',
  'ongoing',
  'completed',
  'cancelled',
];

const OPTIONS = ORDER.map(key => ({
  key,
  label: HISTORY_STATUS_LABEL[key],
}));

type Props = {
  value: HistoryStatusFilter;
  onChange: (next: HistoryStatusFilter) => void;
  /**
   * Optional per-status counts, shown alongside the label as "All 42".
   * When omitted, chips render label-only. This keeps the API forgiving
   * — the parent may not have the counts on first render.
   */
  counts?: Partial<Record<HistoryStatusFilter, number>>;
  /**
   * Colour per chip. Pass the palette that matches the cards on the
   * screen. Defaults to the Trip History colours.
   */
  palette?: FilterChipPalette;
};

export const HistoryFilterChips: React.FC<Props> = ({
  value,
  onChange,
  counts,
  palette = TRIP_HISTORY_CHIP_PALETTE,
}) => {
  const options = useMemo(() => OPTIONS, []);

  return (
    <StatusFilterChips
      options={options}
      value={value}
      onChange={onChange}
      counts={counts}
      palette={palette}
    />
  );
};
