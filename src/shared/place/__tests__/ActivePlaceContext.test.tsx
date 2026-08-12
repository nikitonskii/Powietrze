import {
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import {
  PlaceSourceProvider,
  type SourceForPlace,
} from '../PlaceSourceContext';
import { ActivePlaceProvider, useActivePlace } from '../ActivePlaceContext';
import type { Station } from '../../../core/geo';
import type { Reading } from '../../../core/air';

const warsaw: Station = {
  id: 530,
  name: 'Warszawa, Al. Niepodległości',
  city: 'Warszawa',
  lat: 0,
  lon: 0,
};
const rLoc: Reading = {
  index: 4,
  pm25: 5,
  measuredAt: '2026-08-11 21:00:00',
  city: 'Kraków',
  station: 'x',
};
const rWaw: Reading = {
  index: 42,
  pm25: 43,
  measuredAt: '2026-08-11 21:00:00',
  city: 'Warszawa',
  station: 'y',
};

const sourceForPlace: SourceForPlace = place => ({
  getCurrentReading: () =>
    Promise.resolve(place.kind === 'location' ? rLoc : rWaw),
});

function Probe() {
  const { active, setActive, reading } = useActivePlace();
  return (
    <>
      <Text>{`${active.kind}:${reading?.city ?? '-'}:${
        reading?.index ?? '-'
      }`}</Text>
      <Pressable
        testID="pick"
        onPress={() => setActive({ kind: 'station', station: warsaw })}
      >
        <Text>pick</Text>
      </Pressable>
    </>
  );
}

test('AC 006-6: defaults to location, then setActive switches the reading', async () => {
  render(
    <PlaceSourceProvider sourceForPlace={sourceForPlace}>
      <ActivePlaceProvider>
        <Probe />
      </ActivePlaceProvider>
    </PlaceSourceProvider>,
  );
  await waitFor(() =>
    expect(screen.getByText('location:Kraków:4')).toBeTruthy(),
  );
  fireEvent.press(screen.getByTestId('pick'));
  await waitFor(() =>
    expect(screen.getByText('station:Warszawa:42')).toBeTruthy(),
  );
});
