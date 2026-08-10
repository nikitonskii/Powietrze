import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { Hero } from '../Hero';
import { MOCK_PLACE } from '../mockData';
import { scene } from '../../../core/scene';

const s118 = scene(118);
const colorOf = (node: any) => StyleSheet.flatten(node.props.style).color;

describe('Hero', () => {
  test('AC-2: location label + city', async () => {
    const { getByText } = await render(
      <Hero scene={s118} place={MOCK_PLACE} />,
    );
    expect(getByText('TWOJA LOKALIZACJA')).toBeTruthy();
    expect(getByText('Kraków')).toBeTruthy();
  });

  test('AC-3: station + freshness line', async () => {
    const { getByText } = await render(
      <Hero scene={s118} place={MOCK_PLACE} />,
    );
    expect(
      getByText('Aleja Krasińskiego · stacja GIOŚ · 12 min temu'),
    ).toBeTruthy();
  });

  test('AC-4: index number rendered in key color', async () => {
    const { getByText } = await render(
      <Hero scene={s118} place={MOCK_PLACE} />,
    );
    expect(colorOf(getByText('118'))).toBe(s118.key);
  });

  test('AC-5: band name reads from scene, in key color', async () => {
    const { getByText, rerender } = await render(
      <Hero scene={s118} place={MOCK_PLACE} />,
    );
    expect(colorOf(getByText('Zły'))).toBe(s118.key);
    await rerender(
      <Hero scene={scene(20)} place={{ ...MOCK_PLACE, index: 20 }} />,
    );
    expect(getByText('Bardzo dobry')).toBeTruthy();
  });

  test('AC-6: pm2.5 line value from scene', async () => {
    const { getByText } = await render(
      <Hero scene={s118} place={MOCK_PLACE} />,
    );
    expect(getByText('PM2.5 · 122 µg/m³')).toBeTruthy();
  });

  test('AC-7: advice copy from scene', async () => {
    const { getByText, rerender } = await render(
      <Hero scene={s118} place={MOCK_PLACE} />,
    );
    expect(
      getByText('Zostań w domu. Zamknij okna, unikaj wysiłku.'),
    ).toBeTruthy();
    await rerender(
      <Hero scene={scene(20)} place={{ ...MOCK_PLACE, index: 20 }} />,
    );
    expect(
      getByText('Powietrze czyste. Idealny czas na spacer i sport.'),
    ).toBeTruthy();
  });

  test('AC-12: renders at clamped extremes without crashing', async () => {
    const lo = await render(
      <Hero scene={scene(0)} place={{ ...MOCK_PLACE, index: 0 }} />,
    );
    expect(lo.getByText('0')).toBeTruthy();
    expect(lo.getByText('Bardzo dobry')).toBeTruthy();
    const hi = await render(
      <Hero scene={scene(200)} place={{ ...MOCK_PLACE, index: 200 }} />,
    );
    expect(hi.getByText('200')).toBeTruthy();
    expect(hi.getByText('Bardzo zły')).toBeTruthy();
  });
});
