import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';
import {
  GLOW_SIZE,
  GLOW_INNER_ALPHA,
  GLOW_TRANSPARENT_STOP,
} from '../../core/atmosphere';

// Radial glow disc behind the index number (design: radial-gradient(circle,
// {key}44, transparent 68%), 260px). `color` is scene.key; the alpha comes
// from the core constant, applied as a runtime 8-digit-hex concat (no literal).
export function NumberGlow({
  color,
  size = GLOW_SIZE,
  children,
}: {
  color: string;
  size?: number;
  children: ReactNode;
}) {
  const alphaHex = Math.round(GLOW_INNER_ALPHA * 255)
    .toString(16)
    .padStart(2, '0');
  const r = size / 2;
  return (
    <View style={styles.wrap}>
      <Canvas
        testID="number-glow"
        style={[styles.glow, { width: size, height: size }]}
      >
        <Circle cx={r} cy={r} r={r}>
          <RadialGradient
            c={vec(r, r)}
            r={r}
            positions={[0, GLOW_TRANSPARENT_STOP]}
            colors={[`${color}${alphaHex}`, `${color}00`]}
          />
        </Circle>
      </Canvas>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute' },
});
