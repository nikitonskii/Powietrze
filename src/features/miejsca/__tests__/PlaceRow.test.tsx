import {
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react-native';
import { Text as RNText } from 'react-native';
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

const wrap = (
  sfp: SourceForPlace,
  opts: { onPress?: () => void; trailing?: React.ReactNode } = {},
) =>
  render(
    <PlaceSourceProvider sourceForPlace={sfp}>
      <PlaceRow
        place={{ kind: 'station', station: w }}
        title="Warszawa"
        subtitle="Al. Niepodległości"
        onPress={opts.onPress ?? (() => {})}
        trailing={opts.trailing}
        testID="row-530"
      />
    </PlaceSourceProvider>,
  );

test('AC 007-2: resolving source renders the live index + trailing; row press fires onPress', async () => {
  const onPress = jest.fn();
  await wrap(() => ({ getCurrentReading: () => Promise.resolve(reading) }), {
    onPress,
    trailing: <RNText>TRAIL</RNText>,
  });
  await waitFor(() => expect(screen.getByText('42')).toBeTruthy());
  expect(screen.getByText('TRAIL')).toBeTruthy();
  fireEvent.press(screen.getByTestId('row-530'));
  expect(onPress).toHaveBeenCalled();
});

test('AC 007-2: a failed reading shows "brak danych", not "—"', async () => {
  await wrap(() => ({
    getCurrentReading: () => Promise.reject(new Error('down')),
  }));
  await waitFor(() => expect(screen.getByText('brak danych')).toBeTruthy());
  expect(screen.queryByText('—')).toBeNull();
});
