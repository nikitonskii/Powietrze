import type { Station } from '../../core/geo';

export const GIOS_BASE = 'https://api.gios.gov.pl/pjp-api/v1/rest';
export const KRAKOW_STATION_ID = 400;
// Full Station now; the hero label is derived via stationLabel(KRAKOW_STATION),
// no longer stored as a string (see source.ts).
export const KRAKOW_STATION: Station = {
  id: 400,
  name: 'Kraków, Aleja Krasińskiego',
  city: 'Kraków',
  lat: 50.057678,
  lon: 19.926189,
};
