import { render } from '@testing-library/react-native';
import { Atmosphere } from '../Atmosphere';
import { scene } from '../../../core/scene';

test('AC-5: renders the field frozen under reduced motion without crashing', async () => {
  const { getByTestId } = await render(
    <Atmosphere scene={scene(118)} reducedMotion />,
  );
  expect(getByTestId('atmosphere')).toBeTruthy();
});
