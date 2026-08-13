import { ScrollView, StyleSheet, View } from 'react-native';
import { scene } from '../../core/scene';
import { formatFreshness } from '../../core/air';
import { Atmosphere } from '../../shared/ui/Atmosphere';
import { GradientBackground } from '../../shared/ui/GradientBackground';
import { HistoryChart } from '../../shared/ui/HistoryChart';
import { PollutantTiles } from '../../shared/ui/PollutantTiles';
import { colors, spacing } from '../../shared/tokens';
import { useActivePlace } from '../../shared/place';
import { Hero } from './Hero';

export function TerazScreen() {
  const { active, reading, detail } = useActivePlace();
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
      <ScrollView contentContainerStyle={styles.content}>
        <Hero scene={s} place={place} pm25={reading.pm25} eyebrow={eyebrow} />
        {detail && (
          <View style={styles.detail}>
            <HistoryChart history={detail.history} />
            <View style={styles.tiles}>
              <PollutantTiles pm10={detail.pm10} no2={detail.no2} />
            </View>
          </View>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingTop: spacing.screenTop,
    paddingHorizontal: spacing.screenH,
    paddingBottom: spacing.screenBottom,
  },
  detail: { marginTop: 8 },
  tiles: { marginTop: 12 },
  loading: { flex: 1, backgroundColor: colors.base },
});
