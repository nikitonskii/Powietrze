import { StyleSheet, View } from 'react-native';
import type { Scene } from '../../core/scene';
import { Text } from '../../shared/ui/Text';
import { NumberGlow } from '../../shared/ui/NumberGlow';
import { colors } from '../../shared/tokens';

export interface Place {
  city: string;
  station: string;
  freshness: string;
  index: number;
}

export function Hero({
  scene,
  place,
  value,
  pm25Label,
  scaleCaption,
  eyebrow,
}: {
  scene: Scene;
  place: Place;
  value: string; // pre-formatted big number, per the active scale/precision
  pm25Label: string | null; // 'PM2.5 · … µg/m³' sub-line; null hides it (CAQI already is PM2.5)
  scaleCaption: string; // active scale label shown under the number; '' hides it
  eyebrow: string; // 'TWOJA LOKALIZACJA' for your location, 'MIEJSCE' for a selected place
}) {
  return (
    <View style={styles.wrap}>
      <Text variant="label" color={colors.text.label}>
        {eyebrow}
      </Text>
      <Text variant="city" style={styles.city}>
        {place.city}
      </Text>
      <Text variant="station" color={colors.text.dim} style={styles.station}>
        {place.station} · {place.freshness}
      </Text>
      <NumberGlow color={scene.key}>
        <Text variant="index" color={scene.key} style={styles.number}>
          {value}
        </Text>
      </NumberGlow>
      {scaleCaption ? (
        <Text variant="station" color={colors.text.dim} style={styles.caption}>
          {scaleCaption}
        </Text>
      ) : null}
      <Text variant="band" color={scene.key}>
        {scene.band}
      </Text>
      {pm25Label !== null ? (
        <Text variant="pm" color={colors.text.mid} style={styles.pm}>
          {pm25Label}
        </Text>
      ) : null}
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
  number: { marginTop: 24 },
  caption: { marginTop: 2 },
  pm: { marginTop: 8 },
  advice: { marginTop: 12, maxWidth: 280, textAlign: 'center' },
});
