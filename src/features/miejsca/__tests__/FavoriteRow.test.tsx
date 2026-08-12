import { render, screen, fireEvent } from '@testing-library/react-native';
import { FavoriteRow } from '../FavoriteRow';
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
const sfp: SourceForPlace = () => ({
  getCurrentReading: () => Promise.resolve(reading),
});

test('AC 008-3: renders the row + a Usuń delete action that calls onDelete', async () => {
  const onOpen = jest.fn();
  const onDelete = jest.fn();
  await render(
    <PlaceSourceProvider sourceForPlace={sfp}>
      <FavoriteRow station={w} onOpen={onOpen} onDelete={onDelete} />
    </PlaceSourceProvider>,
  );
  expect(await screen.findByText('Warszawa')).toBeTruthy();
  // The swipe action is rendered in the tree (off-screen); pressing it deletes.
  fireEvent.press(screen.getByTestId('delete-Warszawa'));
  expect(onDelete).toHaveBeenCalled();
});
