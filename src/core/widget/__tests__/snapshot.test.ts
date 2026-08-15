import {
  buildWidgetSnapshot,
  widgetSnapshotIdentity,
  WIDGET_SNAPSHOT_VERSION,
} from '..';
import type { ReadingDetail } from '../../air';
import { displayValue, scaleLabel } from '../../air';
import { scene, bandOf, BANDS } from '../../scene';

const reading = {
  index: 63,
  pm25: 65,
  measuredAt: '2026-08-15 12:00:00',
  city: 'Kraków',
  station: 'Aleja Krasińskiego',
};
const detail: ReadingDetail = {
  history: [],
  pollutants: [
    { code: 'PM10', value: 13 },
    { code: 'NO2', value: 29 },
  ],
};

test('AC-1: buildWidgetSnapshot bakes every field from reading/detail/settings', () => {
  const s = buildWidgetSnapshot(reading, detail, 'µg/m³', 'Przybliżona');
  expect(s.version).toBe(WIDGET_SNAPSHOT_VERSION);
  expect(s.city).toBe('Kraków');
  expect(s.stationLabel).toBe('Aleja Krasińskiego');
  expect(s.measuredAt).toBe('2026-08-15 12:00:00');
  expect(s.displayValue).toBe(displayValue(63, 65, 'µg/m³', 'Przybliżona'));
  expect(s.scaleCaption).toBe(scaleLabel('µg/m³'));
  expect(s.band).toBe(BANDS[bandOf(63)]);
  expect(s.keyHex).toBe(scene(63).key);
  expect(s.deepHex).toBe(scene(63).deep);
  expect(s.midHex).toBe(scene(63).mid);
  expect(s.tiles).toEqual([
    { label: 'PM10', value: '13', unit: 'µg/m³' },
    { label: 'NO₂', value: '29', unit: 'µg/m³' },
  ]);
});

test('AC-1: no detail → empty tiles', () => {
  expect(
    buildWidgetSnapshot(reading, undefined, 'CAQI', 'Przybliżona').tiles,
  ).toEqual([]);
});

test('AC-2: color + band + displayValue pinned across bands (app↔widget contract)', () => {
  for (const [index, key, band] of [
    [7, '#5fe3a1', 'Bardzo dobry'],
    [63, '#f5c63d', 'Umiarkowany'],
    [175, '#c77dff', 'Bardzo zły'],
  ] as const) {
    const s = buildWidgetSnapshot(
      { ...reading, index },
      undefined,
      'CAQI',
      'Przybliżona',
    );
    expect(s.keyHex).toBe(key);
    expect(s.band).toBe(band);
    expect(s.keyHex).toBe(scene(index).key);
    expect(s.displayValue).toBe(
      displayValue(index, reading.pm25, 'CAQI', 'Przybliżona'),
    );
  }
});

test('AC-3(core): identity changes with place/measuredAt/scale/precision, stable otherwise', () => {
  const a = buildWidgetSnapshot(reading, detail, 'CAQI', 'Przybliżona');
  const b = buildWidgetSnapshot(reading, detail, 'CAQI', 'Przybliżona');
  expect(widgetSnapshotIdentity(a)).toBe(widgetSnapshotIdentity(b));
  expect(
    widgetSnapshotIdentity(
      buildWidgetSnapshot(reading, detail, 'µg/m³', 'Przybliżona'),
    ),
  ).not.toBe(widgetSnapshotIdentity(a)); // scale → displayValue changes → identity changes
  expect(
    widgetSnapshotIdentity(
      buildWidgetSnapshot(
        { ...reading, measuredAt: '2026-08-15 13:00:00' },
        detail,
        'CAQI',
        'Przybliżona',
      ),
    ),
  ).not.toBe(widgetSnapshotIdentity(a));
});
