import { hexToRgb, lerpRgb, rgbToHex } from '../color';
import { assertFiniteIndex } from '../validate';

test('AC-2: hexToRgb and rgbToHex round-trip with per-channel rounding', () => {
  expect(hexToRgb('#5fe3a1')).toEqual([95, 227, 161]);
  expect(rgbToHex([95, 227, 161])).toBe('#5fe3a1');
  expect(rgbToHex([206.5, 211.4, 80.6])).toBe('#cfd351'); // rounds per channel
  expect(rgbToHex([0, 7, 255])).toBe('#0007ff'); // zero-pads
});

test('AC-2: lerpRgb interpolates linearly without rounding', () => {
  expect(lerpRgb([0, 100, 200], [10, 0, 250], 0.5)).toEqual([5, 50, 225]);
  expect(lerpRgb([0, 100, 200], [10, 0, 250], 0)).toEqual([0, 100, 200]);
  expect(lerpRgb([0, 100, 200], [10, 0, 250], 1)).toEqual([10, 0, 250]);
});

test('AC-12: assertFiniteIndex throws RangeError on non-finite input', () => {
  expect(() => assertFiniteIndex(NaN)).toThrow(RangeError);
  expect(() => assertFiniteIndex(Infinity)).toThrow(RangeError);
  expect(() => assertFiniteIndex(-Infinity)).toThrow(RangeError);
  expect(() => assertFiniteIndex(74)).not.toThrow();
});
