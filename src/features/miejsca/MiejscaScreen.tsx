import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  searchStations,
  LOCATION_PLACE,
  type ActivePlace,
} from '../../core/places';
import { stationLabel } from '../../core/geo';
import { colors, spacing } from '../../shared/tokens';
import { Text } from '../../shared/ui/Text';
import { useActivePlace, useFavorites, useStations } from '../../shared/place';
import { PlaceRow } from './PlaceRow';
import { SearchField } from './SearchField';

export function MiejscaScreen() {
  const [query, setQuery] = useState('');
  const stations = useStations();
  const { favorites, add, remove } = useFavorites();
  const { setActive } = useActivePlace();
  const navigation = useNavigation<{ navigate: (n: string) => void }>();
  const results = useMemo(
    () => searchStations(stations, query),
    [stations, query],
  );

  const open = (place: ActivePlace) => {
    setActive(place);
    navigation.navigate('Teraz');
  };

  return (
    <ScrollView
      testID="screen-miejsca"
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text variant="city" style={styles.header}>
        Miejsca
      </Text>
      <SearchField value={query} onChangeText={setQuery} />

      {query.trim() ? (
        <View style={styles.list}>
          {results.map(s => (
            <View key={s.id} style={styles.resultRow}>
              <Pressable
                testID={`result-${s.id}`}
                style={styles.resultMain}
                onPress={() => open({ kind: 'station', station: s })}
              >
                <Text variant="city" style={styles.resultTitle}>
                  {s.city}
                </Text>
                <Text variant="station" color={colors.text.dim}>
                  {stationLabel(s)}
                </Text>
              </Pressable>
              <Pressable
                testID={`add-${s.id}`}
                onPress={() => add(s)}
                hitSlop={8}
              >
                <Text variant="city" color={colors.accent}>
                  +
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.list}>
          <PlaceRow
            place={LOCATION_PLACE}
            title="Twoja lokalizacja"
            subtitle="najbliższa stacja"
            onPress={() => open(LOCATION_PLACE)}
          />
          {favorites.length === 0 ? (
            <Text variant="station" color={colors.text.dim} style={styles.hint}>
              Wyszukaj i dodaj miejsce
            </Text>
          ) : (
            favorites.map(s => (
              <PlaceRow
                key={s.id}
                place={{ kind: 'station', station: s }}
                title={s.city}
                subtitle={stationLabel(s)}
                onPress={() => open({ kind: 'station', station: s })}
                onDelete={() => remove(s.id)}
              />
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.base },
  content: {
    paddingTop: spacing.screenTop,
    paddingBottom: spacing.screenBottom,
  },
  header: { paddingHorizontal: spacing.screenH, marginBottom: spacing.rowGap },
  list: { paddingHorizontal: spacing.screenH, gap: spacing.rowGap },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.rowGap,
  },
  resultMain: { flex: 1 },
  resultTitle: { fontSize: 20 },
  hint: { paddingVertical: spacing.rowV, textAlign: 'center' },
});
