import { render } from '@testing-library/react-native';
import { GradientBackground } from '../GradientBackground';
import { scene } from '../../../core/scene';

test('AC-8: gradient uses [deep, mid] from the scene', async () => {
  const s = scene(118);
  const { getByTestId } = await render(<GradientBackground scene={s} />);
  expect(getByTestId('gradient-background').props.colors).toEqual([
    s.deep,
    s.mid,
  ]);
});
