import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { HistoryChart } from '../HistoryChart';
import { scene } from '../../../core/scene';
import {
  historyBarOpacity,
  barHeightPct,
  type HourPoint,
} from '../../../core/air';

const H: HourPoint[] = [
  { at: 'a', pm25: 10, index: 10 },
  { at: 'b', pm25: 200, index: 200 },
];

test('AC-8: header + axis labels + bar color/opacity/height', async () => {
  await render(<HistoryChart history={H} />);
  expect(screen.getByText('OSTATNIE 24 GODZINY')).toBeTruthy();
  for (const l of ['12:00', '18:00', '00:00', '06:00', 'teraz']) {
    expect(screen.getByText(l)).toBeTruthy();
  }
  const b0 = StyleSheet.flatten(screen.getByTestId('bar-0').props.style);
  expect(b0.backgroundColor).toBe(scene(10).key);
  expect(b0.opacity).toBe(historyBarOpacity(0, 2));
  expect(b0.height).toBe(`${barHeightPct(10)}%`);
  const b1 = StyleSheet.flatten(screen.getByTestId('bar-1').props.style);
  expect(b1.backgroundColor).toBe(scene(200).key);
  expect(b1.opacity).toBe(1);
  expect(b1.height).toBe('100%');
});

test('AC-8: single-point history → opacity 1 (no NaN)', async () => {
  await render(<HistoryChart history={[{ at: 'x', pm25: 5, index: 5 }]} />);
  expect(
    StyleSheet.flatten(screen.getByTestId('bar-0').props.style).opacity,
  ).toBe(1);
});
