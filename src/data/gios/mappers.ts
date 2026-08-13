// Isolates GIOŚ v1's JSON-LD Polish keys. `any` is used deliberately: GIOŚ
// returns untyped external JSON; it is validated/narrowed at this boundary.
/* eslint-disable @typescript-eslint/no-explicit-any */
const SENSORS_KEY = 'Lista stanowisk pomiarowych dla podanej stacji';
const DATA_KEY = 'Lista danych pomiarowych';

export function findSensorId(sensorsJson: any, code: string): number | null {
  const list: any[] = sensorsJson?.[SENSORS_KEY] ?? [];
  const sensor = list.find(e => e['Wskaźnik - kod'] === code);
  return sensor ? sensor['Identyfikator stanowiska'] : null;
}

export function parseSeries(
  getDataJson: any,
): { at: string; value: number | null }[] {
  const list: any[] = getDataJson?.[DATA_KEY] ?? [];
  return list.map(e => ({ at: e.Data, value: e['Wartość'] ?? null }));
}

// Newest (max `at`) non-null point — order-independent.
function newestNonNull(
  getDataJson: any,
): { at: string; value: number } | undefined {
  return parseSeries(getDataJson)
    .filter((p): p is { at: string; value: number } => p.value !== null)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))[0];
}

export function parseLatestValue(getDataJson: any): number | undefined {
  return newestNonNull(getDataJson)?.value;
}

export function findPm25SensorId(sensorsJson: any): number {
  const id = findSensorId(sensorsJson, 'PM2.5');
  if (id == null) throw new Error('GIOŚ: no PM2.5 sensor for station');
  return id;
}

export function parseLatestPm25(getDataJson: any): {
  pm25: number;
  measuredAt: string;
} {
  const e = newestNonNull(getDataJson);
  if (!e) throw new Error('GIOŚ: no non-null PM2.5 reading');
  return { pm25: e.value, measuredAt: e.at };
}
