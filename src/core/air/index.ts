import type { ReadingDetail } from './history';

export interface Reading {
  index: number;
  pm25: number;
  measuredAt: string;
  city: string;
  station: string;
}

export interface AirQualitySource {
  getCurrentReading(): Promise<Reading>;
  getDetail?(): Promise<ReadingDetail>; // active-place only; see spec 012
}

export const PM25_INDEX_DIVISOR = 1.03;

export function indexFromPm25(pm25: number): number {
  return Math.round(pm25 / PM25_INDEX_DIVISOR);
}

// Relative freshness label. `now` is injected for testability. `measuredAt`
// ("YYYY-MM-DD HH:mm:ss") is treated as device-local time — the app is
// Poland-only and GIOŚ timestamps are Europe/Warsaw local.
export function formatFreshness(measuredAt: string, now: Date): string {
  const then = new Date(measuredAt.replace(' ', 'T'));
  const mins = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (mins < 1) return 'przed chwilą';
  if (mins < 60) return `${mins} min temu`;
  return `${Math.floor(mins / 60)} godz temu`;
}

export * from './history';
export * from './pollutants';

import type { Scale, Precision } from '../settings';

const US_AQI_BANDS = [
  { cLo: 0.0, cHi: 12.0, iLo: 0, iHi: 50 },
  { cLo: 12.1, cHi: 35.4, iLo: 51, iHi: 100 },
  { cLo: 35.5, cHi: 55.4, iLo: 101, iHi: 150 },
  { cLo: 55.5, cHi: 150.4, iLo: 151, iHi: 200 },
  { cLo: 150.5, cHi: 250.4, iLo: 201, iHi: 300 },
  { cLo: 250.5, cHi: 350.4, iLo: 301, iHi: 400 },
  { cLo: 350.5, cHi: 500.4, iLo: 401, iHi: 500 },
] as const;

// EPA PM2.5 → US AQI. Discontinuous table, piecewise-linear per band. Truncate
// the concentration to 0.1 µg/m³ (EPA) so the inter-band gaps never yield NaN.
export function usAqiFromPm25(pm25: number): number {
  if (!Number.isFinite(pm25) || pm25 <= 0) return 0;
  const c = Math.floor(pm25 * 10) / 10;
  if (c >= 500.4) return 500;
  const b = US_AQI_BANDS.find(x => c <= x.cHi)!;
  return Math.round(((b.iHi - b.iLo) / (b.cHi - b.cLo)) * (c - b.cLo) + b.iLo);
}

export function formatConcentration(v: number, precision: Precision): string {
  if (!Number.isFinite(v)) return '—';
  return precision === 'Dokładna' ? v.toFixed(1) : String(Math.round(v));
}

// Tile formatting. For 0 < value < 1, ALWAYS 2 decimals (e.g. "0.35") so a real
// sub-unit reading is never rounded away to "0". Otherwise defers to
// formatConcentration(value, precision) — so value ≥ 1 keeps today's behavior
// exactly, and negatives (rare GIOŚ artifacts) take that same path (not
// special-cased). Non-finite → "—" via formatConcentration.
export function formatPollutant(value: number, precision: Precision): string {
  if (value > 0 && value < 1) return value.toFixed(2);
  return formatConcentration(value, precision);
}

export function displayValue(
  index: number,
  pm25: number,
  scale: Scale,
  precision: Precision,
): string {
  if (scale === 'US AQI') return String(usAqiFromPm25(pm25));
  if (scale === 'µg/m³') return formatConcentration(pm25, precision);
  return String(index); // CAQI
}

export function scaleLabel(scale: Scale): string {
  return scale === 'CAQI' ? '' : scale;
}
