import { render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThresholdSlider } from '../ThresholdSlider';
import { scene } from '../../../core/scene';
import { colorOf } from '../../test/colorOf';
import { colors } from '../../tokens';

const renderSlider = (value: number) =>
  render(
    <GestureHandlerRootView>
      <ThresholdSlider
        value={value}
        onChange={jest.fn()}
        testID="slider-threshold"
      />
    </GestureHandlerRootView>,
  );

test('AC-15: value text is tinted scene(value).key', async () => {
  await renderSlider(100);
  expect(colorOf(screen.getByText('100'))).toBe(scene(100).key);
});

test('AC-15: track gradient runs scene(value).key → fade token, horizontally', async () => {
  await renderSlider(150);
  const fill = screen.getByTestId('slider-threshold-fill');
  expect(fill.props.colors).toEqual([scene(150).key, colors.control.trackOff]);
  expect(fill.props.start).toEqual({ x: 0, y: 0 });
  expect(fill.props.end).toEqual({ x: 1, y: 0 });
});
