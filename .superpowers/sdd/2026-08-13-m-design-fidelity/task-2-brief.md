# Task 2 — Skyline sub-component + Atmosphere integration

Worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`, branch `feature/m-design-fidelity`.

## Global Constraints
- TS strict; no `any` without inline justification. Files ≤200, functions ≤40.
- **No hex/rgba in `src/shared/ui/**`** — the skyline color comes from `skylineColor()` (core), NOT a literal in the UI file.
- No new dependency.
- **Skia + Jest (load-bearing):** the Skia jest mock renders `Canvas`→`View` and children (`Group`/`Path`/`Blur`) as host nodes (`skGroup`/`skPath`/`skBlurMaskFilter`) with props preserved. Assert props via a `testID` on the SPECIFIC element (never the Canvas). Do NOT call `Skia.Path.*` — pass the path as a string to `<Path path=…/>`.

## Consumes (Task 1, committed)
`SKYLINE_PATH`, `SKYLINE_VIEWBOX`, `SKYLINE_TOP_RATIO`, `skyline(density)`, `skylineColor(density)` from `../../core/atmosphere`.

## Produces
`Skyline({ density, width, height })` from `src/shared/ui/Skyline.tsx`.

## Files
- Create: `src/shared/ui/Skyline.tsx`
- Modify: `src/shared/ui/Atmosphere.tsx` (render `<Skyline>` after the particle group)
- Test: `src/shared/ui/__tests__/Skyline.test.tsx`

## Step 1: Write the failing test (`src/shared/ui/__tests__/Skyline.test.tsx`)
```ts
import { render, screen } from '@testing-library/react-native';
import { Canvas } from '@shopify/react-native-skia';
import { Skyline } from '../Skyline';
import { skyline, skylineColor } from '../../core/atmosphere';

const renderSky = (density: number) =>
  render(
    <Canvas>
      <Skyline density={density} width={389} height={800} />
    </Canvas>,
  );

test('AC-4: skyline path/group/blur carry the density-derived props', async () => {
  await renderSky(0.5);
  expect(screen.getByTestId('skyline').props.color).toBe(skylineColor(0.5));
  expect(screen.getByTestId('skyline-group').props.opacity).toBe(skyline(0.5).opacity);
  expect(screen.getByTestId('skyline-blur').props.blur).toBe(skyline(0.5).blur);
});
```

## Step 2: Run to verify fail
`npx jest Skyline` → FAIL.

## Step 3: Implement (`src/shared/ui/Skyline.tsx`)
```tsx
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
  return (
    <Group
      testID="skyline-group"
      opacity={opacity}
      transform={[{ translateY: SKYLINE_TOP_RATIO * height }, { scale }]}
    >
      <Blur testID="skyline-blur" blur={blur} />
      <Path testID="skyline" path={SKYLINE_PATH} color={skylineColor(density)} />
    </Group>
  );
}
```

## Step 4: Integrate into `src/shared/ui/Atmosphere.tsx`
- Import `Skyline`.
- Inside the existing `<Canvas>`, AFTER the particle `<Group>` (so the skyline overlays the field), render:
  `<Skyline density={scene.density} width={width} height={height} />`
  (`width`/`height` already come from `useWindowDimensions()` in that file; `scene.density` is available.)
- Keep `Atmosphere()`'s render body ≤40 lines (it's a one-line addition).

## Step 5: Verify pass + gate
`npx jest Skyline Atmosphere` PASS. `npm test` (full suite — nothing else broke). `npm run lint` 0 (no rgba literal in Skyline.tsx). `npm run typecheck` 0.

## Step 6: Commit
`git add src/shared/ui/Skyline.tsx src/shared/ui/Atmosphere.tsx src/shared/ui/__tests__/Skyline.test.tsx && git commit -m "feat(atmosphere): render density-driven skyline in the canvas (AC-4, spec 010)"`

## Report
Write your full report to `.superpowers/sdd/2026-08-13-m-design-fidelity/task-2-report.md` BEFORE your final message. Note any deviation (esp. if the Skia mock exposes props differently than expected, or if the Blur/Group testID query needs adjusting). Final message: status, commit SHA, one-line test summary, concerns.

Note: if any git/npm command fails with "Operation not permitted" (sandbox), retry with sandbox disabled.
