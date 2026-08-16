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
      {/* Absolute-fill overlay that flex-centers the oversized glow Canvas on the
          number. Without it the absolute Canvas anchors its top-left to the digits,
          so the halo renders down-and-right and looks cut off above the number. */}
      <View style={styles.glow} pointerEvents="none">
        <Canvas testID="number-glow" style={{ width: size, height: size }}>
          <Circle cx={r} cy={r} r={r}>
            <RadialGradient
              c={vec(r, r)}
              r={r}
              positions={[0, GLOW_TRANSPARENT_STOP]}
              colors={[`${color}${alphaHex}`, `${color}00`]}
            />
          </Circle>
        </Canvas>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
