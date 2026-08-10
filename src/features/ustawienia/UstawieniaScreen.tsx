import { StyleSheet, View } from 'react-native';
import { Text } from '../../shared/ui/Text';
import { colors } from '../../shared/tokens';

export function UstawieniaScreen() {
  return (
    <View testID="screen-ustawienia" style={styles.center}>
      <Text variant="city" color={colors.text.mid}>
        Ustawienia
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
