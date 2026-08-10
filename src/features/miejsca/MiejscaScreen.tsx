import { StyleSheet, View } from 'react-native';
import { Text } from '../../shared/ui/Text';
import { colors } from '../../shared/tokens';

export function MiejscaScreen() {
  return (
    <View testID="screen-miejsca" style={styles.center}>
      <Text variant="city" color={colors.text.mid}>
        Miejsca
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.base,
  },
});
