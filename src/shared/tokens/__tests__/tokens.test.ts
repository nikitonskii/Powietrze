import { colors, type, spacing } from '../index';

describe('design tokens', () => {
  test('AC-1: colors are the exact design literals', () => {
    expect(colors.base).toBe('#07090d');
    expect(colors.accent).toBe('#8fb7ff');
    expect(colors.text.primary).toBe('rgba(255,255,255,1)');
    expect(colors.text.high).toBe('rgba(255,255,255,0.92)');
    expect(colors.text.mid).toBe('rgba(255,255,255,0.72)');
    expect(colors.text.label).toBe('rgba(255,255,255,0.62)');
    expect(colors.text.dim).toBe('rgba(255,255,255,0.5)');
    expect(colors.text.inactive).toBe('rgba(255,255,255,0.45)');
    expect(colors.tabBar.bg).toBe('rgba(10,12,17,0.55)');
    expect(colors.tabBar.border).toBe('rgba(255,255,255,0.08)');
  });
  test('AC-1: type scale literals', () => {
    expect(type.index.size).toBe(128);
    expect(type.index.weight).toBe('600');
    expect(type.index.letterSpacing).toBe(-3);
    expect(type.band.size).toBe(22);
    expect(type.city.size).toBe(30);
    expect(type.label.size).toBe(12);
    expect(type.label.letterSpacing).toBe(2.4);
    expect(type.station.size).toBe(12.5);
    expect(type.pm.size).toBe(14);
    expect(type.advice.size).toBe(16);
  });
  test('AC-1: spacing literals', () => {
    expect(spacing.screenH).toBe(24);
    expect(spacing.screenTop).toBe(70);
    expect(spacing.screenBottom).toBe(130);
  });
});
