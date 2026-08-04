import { scene } from '../index';

const channels = (hex: string): number[] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

test.each([
  [12, 'Bardzo dobry', 'Powietrze czyste. Idealny czas na spacer i sport.'],
  [38, 'Dobry', 'Jakość dobra. Można spokojnie wyjść na zewnątrz.'],
  [63, 'Umiarkowany', 'Umiarkowanie. Wrażliwi — rozważcie krótszy wysiłek.'],
  [88, 'Dostateczny', 'Ogranicz długie i intensywne aktywności na zewnątrz.'],
  [125, 'Zły', 'Zostań w domu. Zamknij okna, unikaj wysiłku.'],
  [175, 'Bardzo zły', 'Powietrze bardzo szkodliwe. Nie wychodź bez potrzeby.'],
])('AC-8: scene(%i) carries band "%s" and its advice verbatim', (v, band, advice) => {
  const s = scene(v);
  expect(s.band).toBe(band);
  expect(s.advice).toBe(advice);
});

test('AC-7: band boundaries 25/26, 75/76 flip the name, not the continuity', () => {
  expect(scene(25).band).toBe('Bardzo dobry');
  expect(scene(26).band).toBe('Dobry');
  expect(scene(75).band).toBe('Umiarkowany');
  expect(scene(76).band).toBe('Dostateczny');
});

test('AC-9: derived pollutants for scene(118) are 122 / 189 / 68', () => {
  const s = scene(118);
  expect(s.pm25).toBe(122); // round(118 × 1.03)
  expect(s.pm10).toBe(189); // round(122 × 1.55) — from the ROUNDED pm25
  expect(s.no2).toBe(68); // round(18 + 118 × 0.42)
});

test('AC-10: density is clamp(pm25/135, 0.03, 1)', () => {
  expect(scene(0).density).toBe(0.03); // floor
  expect(scene(11).density).toBeCloseTo(11 / 135, 10);
  expect(scene(150).density).toBe(1); // pm25 = 155, capped
});

test('AC-11: negative input clamps to zero before any derivation', () => {
  expect(scene(-10)).toEqual(scene(0));
  expect(scene(-10).pm25).toBe(0);
});

test('AC-12: scene throws RangeError on non-finite input', () => {
  expect(() => scene(NaN)).toThrow(RangeError);
  expect(() => scene(Infinity)).toThrow(RangeError);
});

test('AC-13: scene is deterministic and rgb mirrors the key color', () => {
  const a = scene(74);
  const b = scene(74);
  expect(a).toEqual(b);
  expect([...a.rgb]).toEqual(channels(a.key));
});
