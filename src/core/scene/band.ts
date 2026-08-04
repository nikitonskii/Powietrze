import type { BandIndex } from './types';
import { assertFiniteIndex } from './validate';

export function bandOf(v: number): BandIndex {
  assertFiniteIndex(v);
  if (v <= 25) {
    return 0;
  }
  if (v <= 50) {
    return 1;
  }
  if (v <= 75) {
    return 2;
  }
  if (v <= 100) {
    return 3;
  }
  if (v <= 150) {
    return 4;
  }
  return 5;
}
