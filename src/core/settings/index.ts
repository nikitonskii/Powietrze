export type Precision = 'Przybliżona' | 'Dokładna';
export type Scale = 'CAQI' | 'US AQI' | 'µg/m³';

export interface Settings {
  loc: boolean;
  alert: boolean;
  morning: boolean;
  precision: Precision;
  scale: Scale;
  threshold: number;
}

export const THRESHOLD_MIN = 25;
export const THRESHOLD_MAX = 200;

export const DEFAULT_SETTINGS: Settings = {
  loc: true,
  alert: false,
  morning: false,
  precision: 'Przybliżona',
  scale: 'CAQI',
  threshold: 100,
};

const PRECISIONS: readonly Precision[] = ['Przybliżona', 'Dokładna'];
const SCALES: readonly Scale[] = ['CAQI', 'US AQI', 'µg/m³'];

// Round to an int and clamp into [25,200]. NaN → default; ±Infinity clamp.
export function clampThreshold(n: number): number {
  if (Number.isNaN(n)) return DEFAULT_SETTINGS.threshold;
  const rounded = Math.round(n);
  return Math.min(THRESHOLD_MAX, Math.max(THRESHOLD_MIN, rounded));
}

const SPAN = THRESHOLD_MAX - THRESHOLD_MIN;

// ratio (knob position [0,1]) → clamped, rounded integer threshold.
export function thresholdFromRatio(ratio: number): number {
  return clampThreshold(THRESHOLD_MIN + ratio * SPAN);
}

// inverse → clamped [0,1].
export function ratioFromThreshold(threshold: number): number {
  return (clampThreshold(threshold) - THRESHOLD_MIN) / SPAN;
}

// Persistence seam — a fake in tests, an AsyncStorage adapter in the app.
export interface SettingsStore {
  load(): Promise<Settings>;
  save(settings: Settings): Promise<void>;
}

// Hydrate arbitrary stored JSON into a valid Settings: fill missing keys from
// DEFAULT, replace wrong-typed / invalid-enum values, clamp threshold, drop
// unknown keys. Any non-object → DEFAULT.
export function mergeSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_SETTINGS };
  const r = raw as Record<string, unknown>;
  const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
  return {
    loc: bool(r.loc, DEFAULT_SETTINGS.loc),
    alert: bool(r.alert, DEFAULT_SETTINGS.alert),
    morning: bool(r.morning, DEFAULT_SETTINGS.morning),
    precision: PRECISIONS.includes(r.precision as Precision)
      ? (r.precision as Precision)
      : DEFAULT_SETTINGS.precision,
    scale: SCALES.includes(r.scale as Scale)
      ? (r.scale as Scale)
      : DEFAULT_SETTINGS.scale,
    threshold:
      typeof r.threshold === 'number'
        ? clampThreshold(r.threshold)
        : DEFAULT_SETTINGS.threshold,
  };
}
