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

// Deterministic per-seed drift: slow upward vy + horizontal sine wander.
// `t` is elapsed FRAMES (the design's vy is px/frame); callers convert ms→frames.
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
    x: Math.sin(time * 0.02 + seed) * amp, // gentle sway, ~5s period
    y: -time * vy,
  };
}

// The design's generic city silhouette (Powietrze.dc.html:34), reused verbatim.
export const SKYLINE_PATH =
  'M0,150 L0,96 L14,96 L14,74 L26,74 L26,96 L40,96 L40,58 L52,52 L64,58 L64,96 L78,96 L78,40 L86,34 L94,40 L94,96 L108,96 L108,70 L120,70 L120,50 L132,50 L132,96 L146,96 L146,64 L158,64 L158,82 L170,82 L170,44 L182,38 L194,44 L194,96 L206,96 L206,60 L218,60 L218,78 L230,78 L230,52 L242,52 L242,30 L250,24 L258,30 L258,96 L272,96 L272,68 L284,68 L284,48 L296,48 L296,96 L310,96 L310,58 L322,52 L334,58 L334,80 L348,80 L348,66 L360,66 L360,88 L376,88 L376,72 L389,72 L389,150 Z';
export const SKYLINE_VIEWBOX = { width: 389, height: 150 } as const;
export const SKYLINE_TOP_RATIO = 0.44;

// density (scene.density 0.03..1) → skyline haze. blur ports the CSS px radius
// 1:1 to the Skia Blur sigma (M3 shadowBlur precedent); opacity = 1 - density*0.45.
export function skyline(density: number): { blur: number; opacity: number } {
  return { blur: density * 7, opacity: 1 - density * 0.45 };
}

// Fill rgba(3,5,9, 0.72 - density*0.32); alpha rounded to 2dp, trailing zeros
// stripped, so the string is stable (raw concat would emit 0.3999…). Built here
// to keep the rgba out of the no-hex-linted UI layer.
export function skylineColor(density: number): string {
  const alpha = parseFloat((0.72 - density * 0.32).toFixed(2));
  return `rgba(3,5,9,${alpha})`;
}
