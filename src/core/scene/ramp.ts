import { ANCHORS } from './anchors';
import { hexToRgb, lerpRgb, rgbToHex } from './color';
import type { ColorProp } from './types';
import { assertFiniteIndex } from './validate';

export function ramp(v: number, prop: ColorProp): string {
  assertFiniteIndex(v);
  const first = ANCHORS[0];
  const last = ANCHORS[ANCHORS.length - 1];
  if (v <= first.v) {
    return first[prop];
  }
  if (v >= last.v) {
    return last[prop];
  }
  let i = 1;
  while (ANCHORS[i].v < v) {
    i += 1;
  }
  const lo = ANCHORS[i - 1];
  const hi = ANCHORS[i];
  const t = (v - lo.v) / (hi.v - lo.v);
  return rgbToHex(lerpRgb(hexToRgb(lo[prop]), hexToRgb(hi[prop]), t));
}
