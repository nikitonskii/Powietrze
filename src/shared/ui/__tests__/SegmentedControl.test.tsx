import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SegmentedControl } from '../SegmentedControl';
import { colors } from '../../tokens';
import { colorOf } from '../../test/colorOf';

const opts = ['Przybliżona', 'Dokładna'] as const;

test('AC-14: active option → primary text on segActive; others muted/transparent', async () => {
  await render(
    <SegmentedControl
      options={opts}
      value="Przybliżona"
      onChange={jest.fn()}
      testID="seg-precision"
    />,
  );
  expect(colorOf(screen.getByText('Przybliżona'))).toBe(colors.text.primary);
  expect(colorOf(screen.getByText('Dokładna'))).toBe(colors.text.muted);
  const active = StyleSheet.flatten(
    screen.getByTestId('seg-precision-Przybliżona').props.style,
  );
  expect(active.backgroundColor).toBe(colors.control.segActive);
});

test('AC-14: pressing an option calls onChange with its value', async () => {
  const onChange = jest.fn();
  await render(
    <SegmentedControl
      options={opts}
      value="Przybliżona"
      onChange={onChange}
      testID="seg-precision"
    />,
  );
  fireEvent.press(screen.getByTestId('seg-precision-Dokładna'));
  expect(onChange).toHaveBeenCalledWith('Dokładna');
});
