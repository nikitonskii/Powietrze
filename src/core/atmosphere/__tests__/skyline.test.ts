import {
  SKYLINE_PATH,
  SKYLINE_VIEWBOX,
  SKYLINE_TOP_RATIO,
  skyline,
  skylineColor,
} from '..';

const EXPECTED_PATH =
  'M0,150 L0,96 L14,96 L14,74 L26,74 L26,96 L40,96 L40,58 L52,52 L64,58 L64,96 L78,96 L78,40 L86,34 L94,40 L94,96 L108,96 L108,70 L120,70 L120,50 L132,50 L132,96 L146,96 L146,64 L158,64 L158,82 L170,82 L170,44 L182,38 L194,44 L194,96 L206,96 L206,60 L218,60 L218,78 L230,78 L230,52 L242,52 L242,30 L250,24 L258,30 L258,96 L272,96 L272,68 L284,68 L284,48 L296,48 L296,96 L310,96 L310,58 L322,52 L334,58 L334,80 L348,80 L348,66 L360,66 L360,88 L376,88 L376,72 L389,72 L389,150 Z';

test('AC-1: skyline path/viewBox/top-ratio pinned to the design (literal fixture)', () => {
  expect(SKYLINE_PATH).toBe(EXPECTED_PATH);
  expect(SKYLINE_VIEWBOX).toEqual({ width: 389, height: 150 });
  expect(SKYLINE_TOP_RATIO).toBe(0.44);
});

test('AC-2: skyline(density) → blur + opacity', () => {
  expect(skyline(1)).toEqual({ blur: 7, opacity: 0.55 });
  expect(skyline(0.5)).toEqual({ blur: 3.5, opacity: 0.775 });
  expect(skyline(0.03)).toEqual({ blur: 0.21, opacity: 0.9865 });
});

test('AC-3: skylineColor(density) → rgba, alpha 2dp trailing-zero-stripped', () => {
  expect(skylineColor(1)).toBe('rgba(3,5,9,0.4)');
  expect(skylineColor(0.5)).toBe('rgba(3,5,9,0.56)');
  expect(skylineColor(0.03)).toBe('rgba(3,5,9,0.71)');
});
