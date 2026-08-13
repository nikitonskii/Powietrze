import { render, screen } from '@testing-library/react-native';
import { TabIcon, ICON_PATHS } from '../TabIcon';
import { colors } from '../../tokens';

test('AC-1: ICON_PATHS pins the design icon table (literal fixture)', () => {
  expect(ICON_PATHS).toEqual({
    teraz: {
      paths: ['M3 17h4M17 17h4M5 20.5h5M14 20.5h5'],
      circles: [{ cx: 12, cy: 9, r: 4 }],
    },
    miejsca: {
      paths: ['M12 21s-7-6.3-7-11a7 7 0 0114 0c0 4.7-7 11-7 11z'],
      circles: [{ cx: 12, cy: 10, r: 2.4 }],
    },
    ustawienia: {
      paths: [
        'M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
      ],
      circles: [{ cx: 12, cy: 12, r: 3 }],
    },
  });
});

test('AC-2: TabIcon strokes the icon in `color`; testID lands on a stroked node', async () => {
  await render(<TabIcon name="teraz" color={colors.accent} testID="icon-x" />);
  const node = screen.getByTestId('icon-x');
  expect(node.props.color).toBe(colors.accent);
  expect(node.props.strokeWidth).toBe(1.9);
});
