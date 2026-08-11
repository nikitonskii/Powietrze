import { StyleSheet, View } from 'react-native';
import type { Scene } from '../../core/scene';
import { Text } from '../../shared/ui/Text';
import { NumberGlow } from '../../shared/ui/NumberGlow';
import { colors } from '../../shared/tokens';
import type { Place } from './mockData';

export function Hero({
  scene,
  place,
  pm25,
}: {
  scene: Scene;
  place: Place;
  pm25?: number; // real measured µg/m³; falls back to the scene-derived value
}) {
  return (
    <View style={styles.wrap}>
      <Text variant="label" color={colors.text.label}>
        TWOJA LOKALIZACJA
      </Text>
      <Text variant="city" style={styles.city}>
        {place.city}
      </Text>
      <Text variant="station" color={colors.text.dim} style={styles.station}>
        {place.station} · {place.freshness}
      </Text>
      <NumberGlow color={scene.key}>
        <Text
          variant="index"
          color={scene.key}
          style={[styles.number, { textShadowColor: `${scene.key}88` }]}
        >
          {String(place.index)}
        </Text>
      </NumberGlow>
      <Text variant="band" color={scene.key}>
        {scene.band}
      </Text>
      <Text variant="pm" color={colors.text.mid} style={styles.pm}>
        PM2.5 · {Math.round(pm25 ?? scene.pm25)} µg/m³
      </Text>
      <Text variant="advice" color={colors.text.high} style={styles.advice}>
        {scene.advice}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  city: { marginTop: 8 },
  station: { marginTop: 4 },
  number: {
    marginTop: 24,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 42,
  },
  pm: { marginTop: 8 },
  advice: { marginTop: 12, maxWidth: 280, textAlign: 'center' },
});
