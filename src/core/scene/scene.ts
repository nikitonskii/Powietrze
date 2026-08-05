import { ADVICE, BANDS } from './anchors';
import { bandOf } from './band';
import { hexToRgb } from './color';
import { ramp } from './ramp';
import type { Scene } from './types';
import { assertFiniteIndex } from './validate';

const DENSITY_FLOOR = 0.03;
const DENSITY_PM25_CEILING = 135;

export function scene(v: number): Scene {
  assertFiniteIndex(v);
  const index = Math.max(0, v);
  const key = ramp(index, 'key');
  const bandIndex = bandOf(index);
  const pm25 = Math.round(index * 1.03);
  return {
    key,
    deep: ramp(index, 'deep'),
    mid: ramp(index, 'mid'),
    rgb: hexToRgb(key),
    band: BANDS[bandIndex],
    advice: ADVICE[bandIndex],
    pm25,
    pm10: Math.round(pm25 * 1.55),
    no2: Math.round(18 + index * 0.42),
    density: Math.min(1, Math.max(DENSITY_FLOOR, pm25 / DENSITY_PM25_CEILING)),
  };
}
