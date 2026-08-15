import { defaultPlace, LOCATION_PLACE } from '..';
import type { Station } from '../../geo';

const krk: Station = {
  id: 400,
  name: 'Kraków, Aleja Krasińskiego',
  city: 'Kraków',
  lat: 0,
  lon: 0,
};

test('AC-4: defaultPlace by loc', () => {
  expect(defaultPlace(true, krk)).toEqual(LOCATION_PLACE);
  expect(defaultPlace(false, krk)).toEqual({ kind: 'station', station: krk });
});
