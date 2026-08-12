import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Toggle } from '../Toggle';
import { colors } from '../../tokens';

const trackStyle = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style);

test('AC-13: on → success track, knob at end', async () => {
  const onValueChange = jest.fn();
  await render(
    <Toggle value onValueChange={onValueChange} testID="toggle-alert" />,
  );
  const s = trackStyle('toggle-alert');
  expect(s.backgroundColor).toBe(colors.success);
  expect(s.justifyContent).toBe('flex-end');
  expect(s.width).toBe(50);
  expect(s.height).toBe(30);
});

test('AC-13: off → trackOff, knob at start', async () => {
  await render(
    <Toggle value={false} onValueChange={jest.fn()} testID="toggle-alert" />,
  );
  const s = trackStyle('toggle-alert');
  expect(s.backgroundColor).toBe(colors.control.trackOff);
  expect(s.justifyContent).toBe('flex-start');
});

test('AC-13: press calls onValueChange with the inverse', async () => {
  const onValueChange = jest.fn();
  await render(
    <Toggle value onValueChange={onValueChange} testID="toggle-alert" />,
  );
  fireEvent.press(screen.getByTestId('toggle-alert'));
  expect(onValueChange).toHaveBeenCalledWith(false);
});
