import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  searchStations,
  LOCATION_PLACE,
  type ActivePlace,
} from '../../core/places';
import { stationLabel } from '../../core/geo';
import { colors, spacing } from '../../shared/tokens';
import { Text } from '../../shared/ui/Text';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { useActivePlace, useFavorites, useStations } from '../../shared/place';
import { DraggableFavorites } from './DraggableFavorites';
import { PlaceRow } from './PlaceRow';
import { SaveButton } from './SaveButton';
import { SearchField } from './SearchField';
import { MAX_VISIBLE_RESULTS } from './constants';

export function MiejscaScreen() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const stations = useStations();
  const { favorites, remove, reorder } = useFavorites();
  const { setActive } = useActivePlace();
  const navigation = useNavigation<{ navigate: (n: string) => void }>();
  const results = useMemo(
    () =>
      searchStations(stations, debouncedQuery).slice(0, MAX_VISIBLE_RESULTS),
    [stations, debouncedQuery],
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
            <PlaceRow
              key={s.id}
              testID={`result-${s.id}`}
              place={{ kind: 'station', station: s }}
              title={s.city}
              subtitle={stationLabel(s)}
              onPress={() => open({ kind: 'station', station: s })}
              trailing={<SaveButton station={s} />}
            />
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
            <DraggableFavorites
              favorites={favorites}
              onOpen={s => open({ kind: 'station', station: s })}
              onDelete={remove}
              onReorder={reorder}
            />
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
  hint: { paddingVertical: spacing.rowV, textAlign: 'center' },
});
