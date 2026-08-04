import { ANCHORS } from '../anchors';
import { ramp } from '../ramp';
import type { ColorProp } from '../types';

const PROPS: readonly ColorProp[] = ['key', 'deep', 'mid'];
const channels = (hex: string): number[] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const maxChannelDiff = (a: string, b: string): number =>
  Math.max(
    ...channels(a).map((c, i) => Math.abs(c - channels(b)[i])),
  );

test('AC-1: anchor stops return the anchor color exactly', () => {
  for (const a of ANCHORS) {
    for (const p of PROPS) {
      expect(ramp(a.v, p)).toBe(a[p]);
    }
  }
  expect(ramp(63, 'key')).toBe('#f5c63d');
});

test('AC-2: values between anchors interpolate linearly per channel', () => {
  expect(ramp(50, 'key')).toBe('#cdd451'); // t = 0.48 between #a8e063 and #f5c63d
});

test('AC-3: 74 and 76 are near-identical across the band boundary', () => {
  expect(ramp(74, 'key')).toBe('#f9af41');
  expect(ramp(76, 'key')).toBe('#faaa42');
  expect(maxChannelDiff(ramp(74, 'key'), ramp(76, 'key'))).toBeLessThanOrEqual(6);
});

test('AC-4: adjacent integers never differ by more than 5 per channel (0–200)', () => {
  for (let v = 0; v <= 200; v++) {
    for (const p of PROPS) {
      expect(maxChannelDiff(ramp(v, p), ramp(v + 1, p))).toBeLessThanOrEqual(5);
    }
  }
});

test('AC-5: values outside the anchor range clamp to the end anchors', () => {
  expect(ramp(0, 'key')).toBe(ramp(12, 'key'));
  expect(ramp(-3, 'key')).toBe(ANCHORS[0].key);
  expect(ramp(200, 'mid')).toBe('#2e0f35');
  expect(ramp(999, 'deep')).toBe(ANCHORS[5].deep);
});

test('AC-6: every output is a lowercase #rrggbb string (0–200 scan)', () => {
  for (let v = 0; v <= 200; v++) {
    for (const p of PROPS) {
      expect(ramp(v, p)).toMatch(/^#[0-9a-f]{6}$/);
    }
  }
});

test('AC-12: ramp throws RangeError on non-finite input', () => {
  expect(() => ramp(NaN, 'key')).toThrow(RangeError);
  expect(() => ramp(Infinity, 'mid')).toThrow(RangeError);
});
