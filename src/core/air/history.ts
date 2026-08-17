import { indexFromPm25 } from './index';
import type { PollutantReading } from './pollutants';

export interface HourPoint {
  at: string;
  pm25: number;
  index: number;
}

// history stays PM2.5-only; pollutants is the catalog-ordered list of every
// measured pollutant the resolved station reports a finite current value
// for (empty if none resolved). See spec 016.
export interface ReadingDetail {
  history: HourPoint[];
  pollutants: PollutantReading[];
}

// Raw hourly points → chart series: drop nulls (negatives kept — rare GIOŚ
// artifacts, clamped harmlessly downstream), sort by `at` newest-first, take
// `count`, return oldest→newest, each with its derived index.
export function buildHistory(
  points: { at: string; value: number | null }[],
  count = 24,
): HourPoint[] {
  return points
    .filter((p): p is { at: string; value: number } => p.value !== null)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, count)
    .reverse()
    .map(p => ({ at: p.at, pm25: p.value, index: indexFromPm25(p.value) }));
}

// Bar opacity ramps 0.55 (oldest) → 1.0 (now). count <= 1 → 1.0 (no 0/0 NaN).
export function historyBarOpacity(i: number, count: number): number {
  if (count <= 1) return 1;
  return 0.55 + 0.45 * (i / (count - 1));
}

// Bar heights (% of track) normalized across the visible window so the shape of
// the last 24h is always readable — Kraków usually sits in one CAQI band, and an
// absolute index/2 mapping clamps every bar to the floor (a dead-flat chart).
// Absolute severity is still encoded per-bar by COLOR (scene(index).key); height
// only encodes relative variation. `floor` keeps the lowest bar visible; a flat
// window (span 0) renders every bar at a neutral mid-height. Empty → [].
export function barHeights(points: HourPoint[], floor = 22): number[] {
  if (points.length === 0) return [];
  const idx = points.map(p => p.index);
  const min = Math.min(...idx);
  const span = Math.max(...idx) - min;
  if (span === 0) return idx.map(() => 60);
  return idx.map(v => Math.round(floor + (100 - floor) * ((v - min) / span)));
}

// Min/max index over the window, for the chart's numeric range readout. Callers
// pass a non-empty series (the chart renders a readout only when it has points).
export function indexRange(points: HourPoint[]): { min: number; max: number } {
  const idx = points.map(p => p.index);
  return { min: Math.min(...idx), max: Math.max(...idx) };
}
