import { render, screen } from '@testing-library/react-native';
import App from '../App';
import { fakeAirSource } from '../src/shared/test/fakeAirSource';

test('App renders the live Teraz hero', async () => {
  await render(<App source={fakeAirSource()} />);
  expect(await screen.findByText('TWOJA LOKALIZACJA')).toBeTruthy();
  expect(await screen.findByText('118')).toBeTruthy();
});
