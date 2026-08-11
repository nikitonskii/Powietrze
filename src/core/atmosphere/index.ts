export const POOL_SIZE = 260;
export const OPACITY_BASE = 0.05;
export const OPACITY_SCALE = 0.32;
export const BLUR_BASE = 5;
export const BLUR_SCALE = 9;
export const RADIUS_MIN = 0.8;
export const RADIUS_MAX = 3.4;
export const DRIFT_VY_MIN = 0.08;
export const DRIFT_VY_MAX = 0.36;
export const WANDER_MIN = 5;
export const WANDER_MAX = 17;
export const GLOW_SIZE = 260;
export const GLOW_INNER_ALPHA = 0x44 / 255; // design {key}44
export const GLOW_TRANSPARENT_STOP = 0.68;

export interface AtmosphereField {
  count: number;
  particleOpacity: number;
  particleBlur: number;
}

// Maps scene.density (already 0.03..1 from M1) to the particle-field params.
export function atmosphere(density: number): AtmosphereField {
  return {
    count: Math.round(density * POOL_SIZE),
    particleOpacity: OPACITY_BASE + density * OPACITY_SCALE,
    particleBlur: BLUR_BASE + density * BLUR_SCALE,
  };
}

// Deterministic per-seed drift: upward vy + horizontal sine wander.
// `seed` in [0,1) selects this particle's vy/amplitude within the design ranges.
// frozen === true → independent of t (field present but static, for reduce-motion).
export function particleOffset(
  seed: number,
  t: number,
  frozen: boolean,
): { x: number; y: number } {
  const time = frozen ? 0 : t;
  const vy = DRIFT_VY_MIN + seed * (DRIFT_VY_MAX - DRIFT_VY_MIN);
  const amp = WANDER_MIN + seed * (WANDER_MAX - WANDER_MIN);
  return {
    x: Math.sin(time * 0.001 + seed) * amp,
    y: -time * vy,
  };
}
