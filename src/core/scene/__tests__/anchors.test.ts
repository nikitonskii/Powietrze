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

test('AC-8: six band names and six advice strings, index-aligned', () => {
  expect(BANDS).toHaveLength(6);
  expect(ADVICE).toHaveLength(6);
  expect(BANDS[4]).toBe('Zły');
  expect(ADVICE[4]).toBe('Zostań w domu. Zamknij okna, unikaj wysiłku.');
});
