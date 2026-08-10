import { render } from '@testing-library/react-native';
import App from '../App';

test('App renders without crashing', async () => {
  const { getByText } = await render(<App />);
  expect(getByText('TWOJA LOKALIZACJA')).toBeTruthy();
});
