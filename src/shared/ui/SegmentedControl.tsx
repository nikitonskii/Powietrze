import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors } from '../tokens';

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  testID,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  testID?: string;
}) {
  return (
    <View testID={testID} style={styles.container}>
      {options.map(opt => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            testID={testID ? `${testID}-${opt}` : undefined}
            onPress={() => onChange(opt)}
            style={[styles.option, active && styles.optionActive]}
          >
            <Text
              style={[
                styles.label,
                { color: active ? colors.text.primary : colors.text.muted },
              ]}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.control.segBg,
    borderRadius: 11,
    padding: 3,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  optionActive: { backgroundColor: colors.control.segActive },
  label: { fontSize: 13, fontWeight: '500' },
});
