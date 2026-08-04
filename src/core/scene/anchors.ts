import type { Anchor, BandName } from './types';

export const ANCHORS: readonly Anchor[] = [
  { v: 12, key: '#5fe3a1', deep: '#04231a', mid: '#0a3a2a' },
  { v: 38, key: '#a8e063', deep: '#0c2a16', mid: '#173d1f' },
  { v: 63, key: '#f5c63d', deep: '#241b05', mid: '#3d2e08' },
  { v: 88, key: '#ff9147', deep: '#2a1305', mid: '#43200a' },
  { v: 125, key: '#ff5c5c', deep: '#2b0b0b', mid: '#451212' },
  { v: 175, key: '#c77dff', deep: '#1c0720', mid: '#2e0f35' },
];

export const BANDS: readonly BandName[] = [
  'Bardzo dobry',
  'Dobry',
  'Umiarkowany',
  'Dostateczny',
  'Zły',
  'Bardzo zły',
];

export const ADVICE: readonly string[] = [
  'Powietrze czyste. Idealny czas na spacer i sport.',
  'Jakość dobra. Można spokojnie wyjść na zewnątrz.',
  'Umiarkowanie. Wrażliwi — rozważcie krótszy wysiłek.',
  'Ogranicz długie i intensywne aktywności na zewnątrz.',
  'Zostań w domu. Zamknij okna, unikaj wysiłku.',
  'Powietrze bardzo szkodliwe. Nie wychodź bez potrzeby.',
];
