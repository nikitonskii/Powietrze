import { render, within } from '@testing-library/react-native';
import { TerazScreen } from '../TerazScreen';

test('AC-6: gradient-background contains the atmosphere and the hero (composed)', async () => {
  const { getByTestId } = await render(<TerazScreen />);
  const gradient = getByTestId('gradient-background');
  // Atmosphere and hero are both mounted inside the gradient layer.
  expect(within(gradient).getByTestId('atmosphere')).toBeTruthy();
  expect(within(gradient).getByText('118')).toBeTruthy();
  expect(within(gradient).getByText('TWOJA LOKALIZACJA')).toBeTruthy();
});
