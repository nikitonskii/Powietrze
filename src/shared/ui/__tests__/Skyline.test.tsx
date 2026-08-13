import { render, screen } from '@testing-library/react-native';
import { Canvas } from '@shopify/react-native-skia';
import { Skyline } from '../Skyline';
import { skyline, skylineColor } from '../../../core/atmosphere';

const renderSky = (density: number) =>
  render(
    <Canvas>
      <Skyline density={density} width={389} height={800} />
    </Canvas>,
  );

test('AC-4: skyline path/group/blur carry the density-derived props', async () => {
  await renderSky(0.5);
  expect(screen.getByTestId('skyline').props.color).toBe(skylineColor(0.5));
  expect(screen.getByTestId('skyline-group').props.opacity).toBe(
    skyline(0.5).opacity,
  );
  expect(screen.getByTestId('skyline-blur').props.blur).toBe(skyline(0.5).blur);
});
