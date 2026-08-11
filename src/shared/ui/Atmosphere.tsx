import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Blur, Canvas, Circle, Group } from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import type { Scene } from '../../core/scene';
import {
  atmosphere,
  DRIFT_VY_MIN,
  DRIFT_VY_MAX,
  RADIUS_MIN,
  RADIUS_MAX,
  WANDER_MIN,
  WANDER_MAX,
} from '../../core/atmosphere';

const MS_PER_FRAME = 1000 / 60; // the design's vy is px/frame; the clock is ms
// Ambient floor: keep a gently-alive field even on clean-air days (density
// bottoms out at ~8 faint specks otherwise). Density still scales above this.
const AMBIENT_MIN_COUNT = 48;
const AMBIENT_MIN_OPACITY = 0.13;

// Deterministic pseudo-random in [0,1) from an integer — a stable field seed.
function rand(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

interface Particle {
  seed: number;
  x: number;
  y: number;
  r: number;
}

function ParticleDot({
  p,
  clock,
  color,
  opacity,
  frozen,
  height,
}: {
  p: Particle;
  clock: SharedValue<number>;
  color: string;
  opacity: number;
  frozen: boolean;
  height: number;
}) {
  // Inline mirror of core `particleOffset` — RA4 can't import a 'worklet'-tagged
  // function under Jest, so the drift runs here on the UI thread. Literals stay
  // single-sourced as the imported constants; `particleOffset` (AC-5) is the
  // pure, tested reference for this exact formula.
  const cx = useDerivedValue(() => {
    const time = frozen ? 0 : clock.value / MS_PER_FRAME; // ms → frames
    const amp = WANDER_MIN + p.seed * (WANDER_MAX - WANDER_MIN);
    return p.x + Math.sin(time * 0.02 + p.seed) * amp;
  });
  const cy = useDerivedValue(() => {
    const time = frozen ? 0 : clock.value / MS_PER_FRAME; // ms → frames
    const vy = DRIFT_VY_MIN + p.seed * (DRIFT_VY_MAX - DRIFT_VY_MIN);
    const y = p.y - time * vy; // slow drift upward
    return ((y % height) + height) % height; // wrap so it loops
  });
  return <Circle cx={cx} cy={cy} r={p.r} color={color} opacity={opacity} />;
}

// Full-bleed Skia particle field; count/opacity/blur from scene.density.
// reducedMotion (default = OS setting) freezes drift but keeps the field.
export function Atmosphere({
  scene,
  reducedMotion,
}: {
  scene: Scene;
  reducedMotion?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const osReduced = useReducedMotion();
  const frozen = reducedMotion ?? osReduced;
  const field = atmosphere(scene.density);
  const count = Math.max(field.count, AMBIENT_MIN_COUNT);
  const opacity = Math.max(field.particleOpacity, AMBIENT_MIN_OPACITY);
  const clock = useSharedValue(0);
  useFrameCallback(info => {
    clock.value = info.timeSinceFirstFrame ?? 0;
  }, !frozen);

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        seed: rand(i * 2 + 1),
        x: rand(i * 3 + 2) * width,
        y: rand(i * 5 + 3) * height,
        r: RADIUS_MIN + rand(i * 7 + 5) * (RADIUS_MAX - RADIUS_MIN),
      })),
    [count, width, height],
  );

  return (
    <Canvas testID="atmosphere" style={StyleSheet.absoluteFill}>
      <Group>
        {/* Soft edge without erasing the tiny particles (design shadowBlur is
            a per-particle halo, not a field-wide smear). */}
        <Blur blur={1} />
        {particles.map((p, i) => (
          <ParticleDot
            key={i}
            p={p}
            clock={clock}
            color={scene.key}
            opacity={opacity}
            frozen={frozen}
            height={height}
          />
        ))}
      </Group>
    </Canvas>
  );
}
