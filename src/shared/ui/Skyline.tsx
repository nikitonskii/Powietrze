import { Group, Path, Blur } from '@shopify/react-native-skia';
import {
  SKYLINE_PATH,
  SKYLINE_TOP_RATIO,
  SKYLINE_VIEWBOX,
  skyline,
  skylineColor,
} from '../../core/atmosphere';

// The Horizon city silhouette: drawn in the atmosphere Skia canvas, its viewBox
// origin anchored at 44% of screen height, scaled uniformly to full width, and
// blurred/faded by air density. Extracted so Atmosphere() stays ≤40 lines.
export function Skyline({
  density,
  width,
  height,
}: {
  density: number;
  width: number;
  height: number;
}) {
  const { blur, opacity } = skyline(density);
  const scale = width / SKYLINE_VIEWBOX.width;
  // Skia's public prop types don't declare `testID` (it's only reachable via
  // the jest mock's host-node prop passthrough), so the query hooks below are
  // spread from plain objects rather than inlined as JSX literals — TS only
  // excess-property-checks fresh object literals, not spread variables.
  const groupProps = {
    testID: 'skyline-group',
    opacity,
    transform: [{ translateY: SKYLINE_TOP_RATIO * height }, { scale }],
  };
  const blurProps = { testID: 'skyline-blur', blur };
  const pathProps = {
    testID: 'skyline',
    path: SKYLINE_PATH,
    color: skylineColor(density),
  };
  return (
    <Group {...groupProps}>
      <Blur {...blurProps} />
      <Path {...pathProps} />
    </Group>
  );
}
