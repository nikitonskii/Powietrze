// Isolates GIOŚ v1's JSON-LD Polish keys. `any` is used deliberately: GIOŚ
// returns untyped external JSON; it is validated/narrowed at this boundary.
/* eslint-disable @typescript-eslint/no-explicit-any */
const SENSORS_KEY = 'Lista stanowisk pomiarowych dla podanej stacji';
const DATA_KEY = 'Lista danych pomiarowych';

export function findPm25SensorId(sensorsJson: any): number {
  const list: any[] = sensorsJson?.[SENSORS_KEY] ?? [];
  const sensor = list.find(e => e['Wskaźnik - kod'] === 'PM2.5');
  if (!sensor) throw new Error('GIOŚ: no PM2.5 sensor for station');
  return sensor['Identyfikator stanowiska'];
}

export function parseLatestPm25(getDataJson: any): {
  pm25: number;
  measuredAt: string;
} {
  const list: any[] = getDataJson?.[DATA_KEY] ?? [];
  const entry = list.find(e => e['Wartość'] != null);
  if (!entry) throw new Error('GIOŚ: no non-null PM2.5 reading');
  return { pm25: entry['Wartość'], measuredAt: entry['Data'] };
}
