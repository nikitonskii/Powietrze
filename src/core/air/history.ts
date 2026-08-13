import { indexFromPm25 } from './index';

export interface HourPoint {
  at: string;
  pm25: number;
  index: number;
}

export interface ReadingDetail {
  history: HourPoint[];
  pm10?: number;
  no2?: number;
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

// Bar height as % of the track: clamp(index/2, 10, 100) (design bar formula).
export function barHeightPct(index: number): number {
  return Math.min(100, Math.max(10, index / 2));
}
