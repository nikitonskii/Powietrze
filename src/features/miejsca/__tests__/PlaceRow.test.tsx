import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from '@testing-library/react-native';
import { Text as RNText } from 'react-native';
import { PlaceRow } from '../PlaceRow';
import {
  PlaceSourceProvider,
  type SourceForPlace,
} from '../../../shared/place';
import { SettingsProvider } from '../../../shared/settings';
import {
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsStore,
} from '../../../core/settings';
import type { Station } from '../../../core/geo';
import type { Reading } from '../../../core/air';
import { displayValue } from '../../../core/air';
import { scene, trendArrow } from '../../../core/scene';
import { colorOf } from '../../../shared/test/colorOf';

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

const settingsStore = (s: Settings = DEFAULT_SETTINGS): SettingsStore => ({
  load: async () => s,
  save: async () => {},
});

const wrap = (
  sfp: SourceForPlace,
  opts: {
    onPress?: () => void;
    trailing?: React.ReactNode;
    settings?: Settings;
  } = {},
) =>
  render(
    <SettingsProvider store={settingsStore(opts.settings)}>
      <PlaceSourceProvider sourceForPlace={sfp}>
        <PlaceRow
          place={{ kind: 'station', station: w }}
          title="Warszawa"
          subtitle="Al. Niepodległości"
          onPress={opts.onPress ?? (() => {})}
          trailing={opts.trailing}
          testID="row-530"
        />
      </PlaceSourceProvider>
    </SettingsProvider>,
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

test('AC 007-2: while loading (pending source), shows neither the index nor "brak danych"', async () => {
  // Controllable promise: stays pending so status === 'loading' (reading undefined).
  let resolveReading: (r: Reading) => void = () => {};
  const pending = new Promise<Reading>(res => {
    resolveReading = res;
  });
  await wrap(() => ({ getCurrentReading: () => pending }));
  // status is 'loading' with no reading → the tri-state renders NOTHING, proving
  // failure is read from status === 'stale', not from reading === undefined
  // (which also matches loading). A regression to the old bug would show "brak danych" here.
  expect(screen.queryByText('brak danych')).toBeNull();
  expect(screen.queryByText('42')).toBeNull();
  // resolving flips to the index (it wasn't stuck)
  await act(async () => {
    resolveReading(reading);
  });
  await waitFor(() => expect(screen.getByText('42')).toBeTruthy());
});

test('AC 013-2/3: a live row shows the band + trend arrow tinted the key color', async () => {
  await wrap(() => ({ getCurrentReading: () => Promise.resolve(reading) })); // index 42
  await screen.findByText('42');
  expect(screen.getByText(scene(42).band)).toBeTruthy();
  const arrow = screen.getByTestId('trend-42');
  expect(arrow.props.children).toBe(trendArrow(42)); // '→' (40..85)
  expect(colorOf(arrow)).toBe(scene(42).key);
});

test('AC 013-2: no band+trend line when the row has no reading (stale)', async () => {
  await wrap(() => ({
    getCurrentReading: () => Promise.reject(new Error('down')),
  }));
  await screen.findByText('brak danych');
  expect(screen.queryByTestId('trend-42')).toBeNull();
});

test('AC-5: the big number honors settings.scale/precision, color stays scene(index).key', async () => {
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    scale: 'µg/m³',
    precision: 'Dokładna',
  };
  await wrap(() => ({ getCurrentReading: () => Promise.resolve(reading) }), {
    settings,
  });
  const expected = displayValue(42, 43, 'µg/m³', 'Dokładna'); // '43.0'
  const el = await screen.findByText(expected);
  expect(colorOf(el)).toBe(scene(42).key);
});
