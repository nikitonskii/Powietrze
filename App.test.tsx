import { render, screen, fireEvent } from '@testing-library/react-native';
import App from './App';

// App.tsx builds its data-layer instances at module scope with the real
// global `fetch` (not injectable, unlike the unit-tested sources). Geolocation
// is stubbed in jest.setup.js and never resolves, so the nearest-station path
// never reaches fetchStations — only App's own station-list fetch (for search)
// does. Stub it to resolve empty instead of hitting the network.
beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({ 'Lista stacji pomiarowych': [] }),
    }),
  ) as unknown as typeof fetch;
});

test('AC-23: App wires SettingsProvider — Ustawienia renders without throwing', async () => {
  await render(<App />);
  fireEvent.press(screen.getByTestId('tab-Ustawienia'));
  expect(await screen.findByTestId('screen-ustawienia')).toBeTruthy();
});
