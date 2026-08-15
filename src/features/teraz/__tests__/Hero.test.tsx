import { render } from '@testing-library/react-native';
import { Hero, type Place } from '../Hero';
import { scene } from '../../../core/scene';
import { colorOf } from '../../../shared/test/colorOf';

const s118 = scene(118);
const PLACE: Place = {
  city: 'Kraków',
  station: 'Aleja Krasińskiego · stacja GIOŚ',
  freshness: '12 min temu',
  index: 118,
};
const EYEBROW = 'TWOJA LOKALIZACJA';

describe('Hero', () => {
  test('AC-2: location label + city', async () => {
    const { getByText } = await render(
      <Hero
        scene={s118}
        place={PLACE}
        value="118"
        pm25Label="PM2.5 · 122 µg/m³"
        scaleCaption=""
        eyebrow={EYEBROW}
      />,
    );
    expect(getByText('TWOJA LOKALIZACJA')).toBeTruthy();
    expect(getByText('Kraków')).toBeTruthy();
  });

  test('AC-3: station + freshness line', async () => {
    const { getByText } = await render(
      <Hero
        scene={s118}
        place={PLACE}
        value="118"
        pm25Label="PM2.5 · 122 µg/m³"
        scaleCaption=""
        eyebrow={EYEBROW}
      />,
    );
    expect(
      getByText('Aleja Krasińskiego · stacja GIOŚ · 12 min temu'),
    ).toBeTruthy();
  });

  test('AC-4: index number rendered in key color', async () => {
    const { getByText } = await render(
      <Hero
        scene={s118}
        place={PLACE}
        value="118"
        pm25Label="PM2.5 · 122 µg/m³"
        scaleCaption=""
        eyebrow={EYEBROW}
      />,
    );
    expect(colorOf(getByText('118'))).toBe(s118.key);
  });

  test('AC-5: band name reads from scene, in key color', async () => {
    const { getByText, rerender } = await render(
      <Hero
        scene={s118}
        place={PLACE}
        value="118"
        pm25Label="PM2.5 · 122 µg/m³"
        scaleCaption=""
        eyebrow={EYEBROW}
      />,
    );
    expect(colorOf(getByText('Zły'))).toBe(s118.key);
    await rerender(
      <Hero
        scene={scene(20)}
        place={{ ...PLACE, index: 20 }}
        value="20"
        pm25Label="PM2.5 · 19 µg/m³"
        scaleCaption=""
        eyebrow={EYEBROW}
      />,
    );
    expect(getByText('Bardzo dobry')).toBeTruthy();
  });

  test('AC-6: pm2.5 line renders the passed pm25Label', async () => {
    const { getByText } = await render(
      <Hero
        scene={s118}
        place={PLACE}
        value="118"
        pm25Label="PM2.5 · 122 µg/m³"
        scaleCaption=""
        eyebrow={EYEBROW}
      />,
    );
    expect(getByText('PM2.5 · 122 µg/m³')).toBeTruthy();
  });

  test('AC-7: advice copy from scene', async () => {
    const { getByText, rerender } = await render(
      <Hero
        scene={s118}
        place={PLACE}
        value="118"
        pm25Label="PM2.5 · 122 µg/m³"
        scaleCaption=""
        eyebrow={EYEBROW}
      />,
    );
    expect(
      getByText('Zostań w domu. Zamknij okna, unikaj wysiłku.'),
    ).toBeTruthy();
    await rerender(
      <Hero
        scene={scene(20)}
        place={{ ...PLACE, index: 20 }}
        value="20"
        pm25Label="PM2.5 · 19 µg/m³"
        scaleCaption=""
        eyebrow={EYEBROW}
      />,
    );
    expect(
      getByText('Powietrze czyste. Idealny czas na spacer i sport.'),
    ).toBeTruthy();
  });

  test('AC-12: renders at clamped extremes without crashing', async () => {
    const lo = await render(
      <Hero
        scene={scene(0)}
        place={{ ...PLACE, index: 0 }}
        value="0"
        pm25Label="PM2.5 · 0 µg/m³"
        scaleCaption=""
        eyebrow={EYEBROW}
      />,
    );
    expect(lo.getByText('0')).toBeTruthy();
    expect(lo.getByText('Bardzo dobry')).toBeTruthy();
    const hi = await render(
      <Hero
        scene={scene(200)}
        place={{ ...PLACE, index: 200 }}
        value="200"
        pm25Label="PM2.5 · 500 µg/m³"
        scaleCaption=""
        eyebrow={EYEBROW}
      />,
    );
    expect(hi.getByText('200')).toBeTruthy();
    expect(hi.getByText('Bardzo zły')).toBeTruthy();
  });

  test('AC-5b: µg/m³ scale — number is the concentration, no PM2.5 sub-line, caption shown', async () => {
    const { getByText, queryByText } = await render(
      <Hero
        scene={s118}
        place={PLACE}
        value="13.1"
        pm25Label={null}
        scaleCaption="µg/m³"
        eyebrow="MIEJSCE"
      />,
    );
    expect(getByText('13.1')).toBeTruthy();
    expect(queryByText(/PM2.5 ·/)).toBeNull();
    expect(getByText('µg/m³')).toBeTruthy();
  });
});
