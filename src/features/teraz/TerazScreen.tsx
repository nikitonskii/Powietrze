import { StyleSheet, View } from 'react-native';
import { scene } from '../../core/scene';
import { formatFreshness } from '../../core/air';
import { Atmosphere } from '../../shared/ui/Atmosphere';
import { GradientBackground } from '../../shared/ui/GradientBackground';
import { colors, spacing } from '../../shared/tokens';
import { useActivePlace } from '../../shared/place';
import { Hero } from './Hero';

export function TerazScreen() {
  const { active, reading } = useActivePlace();
  if (!reading) {
    return <View testID="teraz-loading" style={styles.loading} />;
  }
  const s = scene(reading.index);
  const eyebrow = active.kind === 'location' ? 'TWOJA LOKALIZACJA' : 'MIEJSCE';
  const place = {
    city: reading.city,
    station: reading.station,
    freshness: formatFreshness(reading.measuredAt, new Date()),
    index: reading.index,
  };
  return (
    <GradientBackground scene={s}>
      <Atmosphere scene={s} />
      <View style={styles.content}>
        <Hero scene={s} place={place} pm25={reading.pm25} eyebrow={eyebrow} />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: spacing.screenTop,
    paddingHorizontal: spacing.screenH,
    paddingBottom: spacing.screenBottom,
    justifyContent: 'center',
  },
  loading: { flex: 1, backgroundColor: colors.base },
});
