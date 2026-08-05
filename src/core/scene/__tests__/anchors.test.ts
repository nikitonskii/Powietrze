import { ADVICE, ANCHORS, BANDS } from '../anchors';

const HEX = /^#[0-9a-f]{6}$/;

test('AC-1: six anchors, ascending stops, lowercase hex colors', () => {
  expect(ANCHORS).toHaveLength(6);
  expect(ANCHORS.map(a => a.v)).toEqual([12, 38, 63, 88, 125, 175]);
  for (const a of ANCHORS) {
    expect(a.key).toMatch(HEX);
    expect(a.deep).toMatch(HEX);
    expect(a.mid).toMatch(HEX);
  }
});

test('AC-1: anchor table matches the design table literally', () => {
  expect(ANCHORS).toEqual([
    { v: 12, key: '#5fe3a1', deep: '#04231a', mid: '#0a3a2a' },
    { v: 38, key: '#a8e063', deep: '#0c2a16', mid: '#173d1f' },
    { v: 63, key: '#f5c63d', deep: '#241b05', mid: '#3d2e08' },
    { v: 88, key: '#ff9147', deep: '#2a1305', mid: '#43200a' },
    { v: 125, key: '#ff5c5c', deep: '#2b0b0b', mid: '#451212' },
    { v: 175, key: '#c77dff', deep: '#1c0720', mid: '#2e0f35' },
  ]);
});

test('AC-8: six band names and six advice strings, index-aligned', () => {
  expect(BANDS).toHaveLength(6);
  expect(ADVICE).toHaveLength(6);
  expect(BANDS[4]).toBe('Zły');
  expect(ADVICE[4]).toBe('Zostań w domu. Zamknij okna, unikaj wysiłku.');
});
