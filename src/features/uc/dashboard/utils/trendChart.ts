/**
 * ------------------------------------------------------------------
 * Bookings Trend chart — geometry (pure, unit-tested)
 * ------------------------------------------------------------------
 * Turns the day counts into everything the chart draws, for a given
 * width and height. No React, no SVG: the component only renders
 * what this returns.
 * ------------------------------------------------------------------
 */

import type { TrendPoint } from '../types';

/** `top` leaves room for the latest-day bubble above the highest
 *  possible point; `right` leaves room for half of the last date
 *  label (e.g. "Oct 20"), which is centred on the last point. */
export const CHART_PADDING = { left: 32, right: 22, top: 48, bottom: 28 };

/** At most this many date labels on the x axis (more would overlap). */
export const MAX_X_LABELS = 7;

/** Up to this many points, every day gets a dot (as in the design);
 *  beyond it only the latest day does. */
export const MAX_DOTS = 15;

/** Round whole-number steps, smallest first: 1, 2, 5, 10, 20, 25, … */
const NICE_STEPS: readonly number[] = (() => {
  const out: number[] = [];
  for (let k = 0; k <= 12; k++) {
    for (const f of [1, 2, 2.5, 5]) {
      const s = f * 10 ** k;
      if (Number.isInteger(s)) out.push(s);
    }
  }
  return out;
})();

/**
 * A rounded axis for whole-number counts: the first round step that
 * gives 3–4 intervals (e.g. 52 → 0, 20, 40, 60), top at or above
 * `max`. Counts of 3 or less (and all-zero data) get a 0…3 axis.
 */
export function niceAxis(max: number): { max: number; step: number } {
  if (!(max > 3)) return { max: 3, step: 1 };
  const step =
    NICE_STEPS.find(s => {
      const n = Math.ceil(max / s);
      return n >= 3 && n <= 4;
    }) ??
    NICE_STEPS.find(s => Math.ceil(max / s) <= 4) ??
    NICE_STEPS[NICE_STEPS.length - 1];
  return { max: Math.ceil(max / step) * step, step };
}

export type ChartPoint = { x: number; y: number; count: number; date: string };

export type ChartGeometry = {
  points: ChartPoint[];
  /** SVG path of the line. */
  line: string;
  /** SVG path of the filled area under the line. */
  area: string;
  yTicks: { y: number; value: number }[];
  /** Thinned date labels; always includes the first and last day. */
  xLabels: { x: number; date: string }[];
  showAllDots: boolean;
  /** y of the x axis (count 0). */
  baseY: number;
};

export function buildChart(
  data: readonly TrendPoint[],
  width: number,
  height: number,
): ChartGeometry | null {
  if (data.length === 0 || width <= 0 || height <= 0) return null;

  const { left, right, top, bottom } = CHART_PADDING;
  const innerW = Math.max(1, width - left - right);
  const innerH = Math.max(1, height - top - bottom);
  const axis = niceAxis(Math.max(...data.map(p => p.count)));

  const xAt = (i: number) =>
    data.length === 1 ? left + innerW : left + (innerW * i) / (data.length - 1);
  const yAt = (v: number) => top + innerH - (v / axis.max) * innerH;
  const baseY = yAt(0);

  const points = data.map((p, i) => ({
    x: xAt(i),
    y: yAt(p.count),
    count: p.count,
    date: p.date,
  }));

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`)
    .join(' ');
  const first = points[0];
  const last = points[points.length - 1];
  const area = `${line} L${last.x},${baseY} L${first.x},${baseY} Z`;

  const yTicks: ChartGeometry['yTicks'] = [];
  for (let v = 0; v <= axis.max + 1e-9; v += axis.step) {
    yTicks.push({ value: Math.round(v * 100) / 100, y: yAt(v) });
  }

  return {
    points,
    line,
    area,
    yTicks,
    xLabels: pickLabelIndexes(points.length, MAX_X_LABELS).map(i => ({
      x: points[i].x,
      date: points[i].date,
    })),
    showAllDots: points.length <= MAX_DOTS,
    baseY,
  };
}

/** Up to `max` evenly spread indexes, always the first and last. */
export function pickLabelIndexes(count: number, max: number): number[] {
  if (count <= 0) return [];
  if (count <= max) return Array.from({ length: count }, (_, i) => i);
  const out = new Set<number>();
  for (let k = 0; k < max; k++) {
    out.add(Math.round((k * (count - 1)) / (max - 1)));
  }
  return [...out].sort((a, b) => a - b);
}
