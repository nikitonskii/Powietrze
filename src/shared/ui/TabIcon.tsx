import { Canvas, Group, Path, Circle } from '@shopify/react-native-skia';

export type TabIconName = 'teraz' | 'miejsca' | 'ustawienia';

// Verbatim from Powietrze.dc.html:256/260/264 (viewBox 0 0 24 24).
export const ICON_PATHS: Record<
  TabIconName,
  { paths: string[]; circles: { cx: number; cy: number; r: number }[] }
> = {
  teraz: {
    paths: ['M3 17h4M17 17h4M5 20.5h5M14 20.5h5'],
    circles: [{ cx: 12, cy: 9, r: 4 }],
  },
  miejsca: {
    paths: ['M12 21s-7-6.3-7-11a7 7 0 0114 0c0 4.7-7 11-7 11z'],
    circles: [{ cx: 12, cy: 10, r: 2.4 }],
  },
  ustawienia: {
    paths: [
      'M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
    ],
    circles: [{ cx: 12, cy: 12, r: 3 }],
  },
};

const SIZE = 25;
const STROKE = 1.9;

export function TabIcon({
  name,
  color,
  testID,
}: {
  name: TabIconName;
  color: string;
  testID?: string;
}) {
  const { paths, circles } = ICON_PATHS[name];
  return (
    <Canvas style={{ width: SIZE, height: SIZE }}>
      <Group transform={[{ scale: SIZE / 24 }]}>
        {circles.map((c, i) => {
          // testID on the first circle (every icon has one) so its `color` is
          // assertable; spread a plain object so TS doesn't excess-check testID
          // (Skia's Circle type doesn't declare it) — same pattern as Skyline.
          const props = {
            cx: c.cx,
            cy: c.cy,
            r: c.r,
            color,
            style: 'stroke' as const,
            strokeWidth: STROKE,
            strokeCap: 'round' as const,
            ...(i === 0 ? { testID } : {}),
          };
          return <Circle key={`c${i}`} {...props} />;
        })}
        {paths.map((d, i) => (
          <Path
            key={`p${i}`}
            path={d}
            color={color}
            style={'stroke' as const}
            strokeWidth={STROKE}
            strokeCap={'round' as const}
            strokeJoin={'round' as const}
          />
        ))}
      </Group>
    </Canvas>
  );
}
