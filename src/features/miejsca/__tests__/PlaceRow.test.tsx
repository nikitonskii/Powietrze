import {
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react-native';
import { PlaceRow } from '../PlaceRow';
import {
  PlaceSourceProvider,
  type SourceForPlace,
} from '../../../shared/place';
import type { Station } from '../../../core/geo';
import type { Reading } from '../../../core/air';

const w: Station = {
  id: 530,
  name: 'Warszawa, Al. Niepodległości',
  city: 'Warszawa',
  lat: 0,
  lon: 0,
};
const reading: Reading = {
  index: 42,
  pm25: 43,
  measuredAt: '2026-08-11 21:00:00',
  city: 'Warszawa',
  station: 'y',
};
const wrap = (sfp: SourceForPlace, onPress = () => {}) =>
  render(
    <PlaceSourceProvider sourceForPlace={sfp}>
      <PlaceRow
        place={{ kind: 'station', station: w }}
        title="Warszawa"
        subtitle="Al. Niepodległości"
        onPress={onPress}
      />
    </PlaceSourceProvider>,
  );

test('AC 006-8: renders title + live index and fires onPress', async () => {
  const onPress = jest.fn();
  await wrap(
    () => ({ getCurrentReading: () => Promise.resolve(reading) }),
    onPress,
  );
  expect(screen.getByText('Warszawa')).toBeTruthy();
  await waitFor(() => expect(screen.getByText('42')).toBeTruthy());
  fireEvent.press(screen.getByText('Warszawa'));
  expect(onPress).toHaveBeenCalled();
});

test('AC 006-8: a failed reading shows a muted —', async () => {
  await wrap(() => ({
    getCurrentReading: () => Promise.reject(new Error('down')),
  }));
  await waitFor(() => expect(screen.getByText('—')).toBeTruthy());
});
