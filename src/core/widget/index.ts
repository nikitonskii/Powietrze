import type { Reading, ReadingDetail } from '../air';
import { displayValue, scaleLabel, formatPollutant, POLLUTANTS } from '../air';
import { scene, bandOf, BANDS } from '../scene';
import type { Scale, Precision } from '../settings';

export const WIDGET_SNAPSHOT_VERSION = 1;

export interface WidgetTile {
  label: string;
  value: string;
  unit: string;
}

export interface WidgetSnapshot {
  version: number;
  city: string;
  stationLabel: string;
  displayValue: string;
  scaleCaption: string;
  band: string;
  keyHex: string;
  deepHex: string;
  midHex: string;
  tiles: WidgetTile[];
  measuredAt: string;
}

// The seam features/shared use to publish a snapshot; the native module
// implements it, a fake in tests.
export interface WidgetSync {
  publish(snapshot: WidgetSnapshot): void;
}

// Pure builder: reading (+ optional detail) + settings → the fully-baked
// snapshot the widget draws verbatim. No IO.
export function buildWidgetSnapshot(
  reading: Reading,
  detail: ReadingDetail | undefined,
  scale: Scale,
  precision: Precision,
): WidgetSnapshot {
  const s = scene(reading.index);
  const tiles = (detail?.pollutants ?? []).map(p => ({
    // Every PollutantCode has a POLLUTANTS entry (closed union, single
    // source of truth) — non-null assertion mirrors usAqiFromPm25's find().
    label: POLLUTANTS.find(c => c.code === p.code)!.label,
    value: formatPollutant(p.value, precision),
    unit: 'µg/m³',
  }));
  return {
    version: WIDGET_SNAPSHOT_VERSION,
    city: reading.city,
    stationLabel: reading.station,
    displayValue: displayValue(reading.index, reading.pm25, scale, precision),
    scaleCaption: scaleLabel(scale),
    band: BANDS[bandOf(reading.index)],
    keyHex: s.key,
    deepHex: s.deep,
    midHex: s.mid,
    tiles,
    measuredAt: reading.measuredAt,
  };
}

// Stable string that changes iff a republish is warranted (drives the
// provider's dedup). Keys on the FULL drawn snapshot so any visible change
// triggers a republish — notably a precision toggle changes the pollutant
// tiles (13 → 13.0) without changing the headline in CAQI mode, so keying on
// displayValue alone would leave the widget's tiles stale. `version` is a
// constant so including it is harmless.
export function widgetSnapshotIdentity(s: WidgetSnapshot): string {
  return JSON.stringify(s);
}
