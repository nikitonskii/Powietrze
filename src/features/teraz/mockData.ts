export interface Place {
  city: string;
  station: string;
  freshness: string;
  index: number;
}

export const MOCK_PLACE: Place = {
  city: 'Kraków',
  station: 'Aleja Krasińskiego · stacja GIOŚ',
  freshness: '12 min temu',
  index: 118,
};
