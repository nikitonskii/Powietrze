export type PollutantCode = 'PM10' | 'NO2' | 'O3' | 'SO2' | 'CO' | 'C6H6';

export interface PollutantSpec {
  code: PollutantCode;
  label: string;
}

// SINGLE SOURCE OF TRUTH for which pollutants can appear, their display label,
// and the stable render order. `code` is the canonical air-quality formula; it
// EQUALS the GIOŚ sensor code so the data layer passes it verbatim to
// findSensorId — no translation layer exists or is needed.
export const POLLUTANTS: readonly PollutantSpec[] = [
  { code: 'PM10', label: 'PM10' },
  { code: 'NO2', label: 'NO₂' },
  { code: 'O3', label: 'O₃' },
  { code: 'SO2', label: 'SO₂' },
  { code: 'CO', label: 'CO' },
  { code: 'C6H6', label: 'C₆H₆' },
];

// One measured pollutant with its latest value (µg/m³). `label` is NOT stored
// here — the UI derives it from POLLUTANTS by `code` (one home for label truth).
export interface PollutantReading {
  code: PollutantCode;
  value: number;
}
