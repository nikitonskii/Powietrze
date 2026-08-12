import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { scene } from '../../core/scene';
import { thresholdFromRatio, ratioFromThreshold } from '../../core/settings';
import { colors } from '../tokens';

export function ThresholdSlider({
  value,
  onChange,
  testID,
}: {
  value: number;
  onChange: (next: number) => void;
  testID?: string;
}) {
  const [width, setWidth] = useState(0);
  const key = scene(value).key;
  const emit = (x: number) =>
    onChange(thresholdFromRatio(width ? x / width : 0));
  const pan = Gesture.Pan()
    .onBegin(e => runOnJS(emit)(e.x))
    .onUpdate(e => runOnJS(emit)(e.x));
  const knobLeft = ratioFromThreshold(value) * width;

  return (
    <View testID={testID}>
      <Text style={[styles.value, { color: key }]}>{value}</Text>
      <GestureDetector gesture={pan}>
        <View
          style={styles.hitbox}
          onLayout={e => setWidth(e.nativeEvent.layout.width)}
        >
          <View style={styles.track}>
            <LinearGradient
              testID={testID ? `${testID}-fill` : undefined}
              colors={[key, colors.control.trackOff]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
          <View style={[styles.knob, { left: Math.max(0, knobLeft - 11) }]} />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  value: {
    fontSize: 15,
    fontWeight: '600',
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  hitbox: { height: 22, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  knob: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.text.primary,
  },
});
