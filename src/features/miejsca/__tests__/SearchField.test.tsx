import { render, screen, fireEvent } from '@testing-library/react-native';
import { SearchField } from '../SearchField';

test('clear button appears only when there is text', async () => {
  const { rerender } = await render(
    <SearchField value="" onChangeText={() => {}} />,
  );
  expect(screen.queryByTestId('search-clear')).toBeNull();
  await rerender(<SearchField value="Wr" onChangeText={() => {}} />);
  expect(screen.getByTestId('search-clear')).toBeTruthy();
});

test('tapping clear wipes the whole field in one tap', async () => {
  const onChangeText = jest.fn();
  await render(<SearchField value="Wrocław" onChangeText={onChangeText} />);
  fireEvent.press(screen.getByTestId('search-clear'));
  expect(onChangeText).toHaveBeenCalledWith('');
});
