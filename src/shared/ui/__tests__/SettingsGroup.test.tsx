import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { SettingsGroup } from '../SettingsGroup';
import { colors } from '../../tokens';
import { colorOf } from '../../test/colorOf';

test('AC-16: label rendered verbatim in faint, card wraps children', async () => {
  await render(
    <SettingsGroup label="DANE">
      <Text>row-a</Text>
      <Text>row-b</Text>
    </SettingsGroup>,
  );
  const label = screen.getByText('DANE');
  expect(colorOf(label)).toBe(colors.text.faint);
  const s = StyleSheet.flatten(label.props.style);
  expect(s.fontSize).toBe(11);
  expect(s.fontWeight).toBe('600');
  expect(s.letterSpacing).toBe(1.4);
  expect(screen.getByText('row-a')).toBeTruthy();
  expect(screen.getByText('row-b')).toBeTruthy();
});
