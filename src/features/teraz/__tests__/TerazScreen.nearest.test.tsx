import {
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { TerazScreen } from '../TerazScreen';
import {
  PlaceSourceProvider,
  ActivePlaceProvider,
  useActivePlace,
  type SourceForPlace,
} from '../../../shared/place';
import type { Reading } from '../../../core/air';
import type { Station } from '../../../core/geo';

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
const sourceForPlace: SourceForPlace = p => ({
  getCurrentReading: () => Promise.resolve(p.kind === 'location' ? rLoc : rWaw),
});

function Picker() {
  const { setActive } = useActivePlace();
  return (
    <Pressable
      testID="pick-waw"
      onPress={() => setActive({ kind: 'station', station: warsaw })}
    >
      <Text>pick</Text>
    </Pressable>
  );
}

test('AC 006-7: Teraz renders the active place + eyebrow (location → station)', async () => {
  await render(
    <PlaceSourceProvider sourceForPlace={sourceForPlace}>
      <ActivePlaceProvider>
        <TerazScreen />
        <Picker />
      </ActivePlaceProvider>
    </PlaceSourceProvider>,
  );
  expect(await screen.findByText('Kraków')).toBeTruthy();
  expect(screen.getByText('TWOJA LOKALIZACJA')).toBeTruthy();
  fireEvent.press(screen.getByTestId('pick-waw'));
  await waitFor(() => expect(screen.getByText('Warszawa')).toBeTruthy());
  expect(screen.getByText('42')).toBeTruthy();
  expect(screen.getByText('MIEJSCE')).toBeTruthy();
});
