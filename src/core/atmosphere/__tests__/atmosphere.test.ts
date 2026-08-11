import {
  atmosphere,
  particleOffset,
  POOL_SIZE,
  OPACITY_BASE,
  OPACITY_SCALE,
  BLUR_BASE,
  BLUR_SCALE,
  RADIUS_MIN,
  RADIUS_MAX,
  DRIFT_VY_MIN,
  DRIFT_VY_MAX,
  WANDER_MIN,
  WANDER_MAX,
  GLOW_SIZE,
  GLOW_INNER_ALPHA,
  GLOW_TRANSPARENT_STOP,
} from '../index';

describe('atmosphere', () => {
  test('AC-1: count = round(density*260), consumes scene.density', () => {
    expect(atmosphere(0.03).count).toBe(8);
    expect(atmosphere(122 / 135).count).toBe(235); // index 118
    expect(atmosphere(1).count).toBe(260);
  });

  test('AC-2: particleOpacity = 0.05 + density*0.32', () => {
    expect(atmosphere(0.03).particleOpacity).toBeCloseTo(0.0596, 5);
    expect(atmosphere(122 / 135).particleOpacity).toBeCloseTo(0.33919, 5);
    expect(atmosphere(1).particleOpacity).toBe(0.37);
  });

  test('AC-3: particleBlur = 5 + density*9', () => {
    expect(atmosphere(0.03).particleBlur).toBeCloseTo(5.27, 5);
    expect(atmosphere(1).particleBlur).toBe(14);
  });

  test('AC-4: constants are the exact design literals', () => {
    expect(POOL_SIZE).toBe(260);
    expect(OPACITY_BASE).toBe(0.05);
    expect(OPACITY_SCALE).toBe(0.32);
    expect(BLUR_BASE).toBe(5);
    expect(BLUR_SCALE).toBe(9);
    expect(RADIUS_MIN).toBe(0.8);
    expect(RADIUS_MAX).toBe(3.4);
    expect(DRIFT_VY_MIN).toBe(0.08);
    expect(DRIFT_VY_MAX).toBe(0.36);
    expect(WANDER_MIN).toBe(5);
    expect(WANDER_MAX).toBe(17);
    expect(GLOW_SIZE).toBe(260);
    expect(GLOW_INNER_ALPHA).toBeCloseTo(0x44 / 255, 6);
    expect(GLOW_TRANSPARENT_STOP).toBe(0.68);
  });

  test('AC-5: frozen particleOffset is invariant to t; unfrozen is not', () => {
    // Fractional seed so vy/amp are exercised across the range.
    expect(particleOffset(0.3, 100, true)).toEqual(
      particleOffset(0.3, 999, true),
    );
    const c = particleOffset(0.3, 100, false);
    const d = particleOffset(0.3, 999, false);
    expect(c).not.toEqual(d);
  });
});
