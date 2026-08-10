import { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { Scene } from '../../core/scene';

export function GradientBackground({
  scene,
  children,
}: {
  scene: Scene;
  children?: ReactNode;
}) {
  return (
    <LinearGradient
      testID="gradient-background"
      colors={[scene.deep, scene.mid]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={StyleSheet.absoluteFill}
    >
      {children}
    </LinearGradient>
  );
}
