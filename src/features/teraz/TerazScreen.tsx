import { StyleSheet, View } from 'react-native';
import { scene } from '../../core/scene';
import { GradientBackground } from '../../shared/ui/GradientBackground';
import { spacing } from '../../shared/tokens';
import { Hero } from './Hero';
import { MOCK_PLACE } from './mockData';

export function TerazScreen() {
  const s = scene(MOCK_PLACE.index);
  return (
    <GradientBackground scene={s}>
      <View style={styles.content}>
        <Hero scene={s} place={MOCK_PLACE} />
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
});
