# M-design-fidelity Implementation Plan (skyline + tab bar)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Bring two pieces to the design pixel-for-pixel with no new dependency — the Horizon city skyline (spec 010) and the icon-based tab bar (spec 011).

**Architecture:** Skyline = a Skia `Path` in the existing atmosphere canvas, density-driven, extracted as a `Skyline` sub-component; its math + path literal live in pure `core/atmosphere`. Tab bar = Skia-stroked SVG icons (`TabIcon`) above labels, keeping the PR #7 tint logic. Everything uses `@shopify/react-native-skia` (already shipped).

**Tech Stack:** React Native 0.86, TypeScript strict, `@shopify/react-native-skia`, Jest + @testing-library/react-native v14 (render async).

## Global Constraints

- Specs: `docs/specs/010-skyline.md`, `docs/specs/011-tabbar.md` — every AC ID maps to one of these.
- TypeScript strict; `any` forbidden without inline justification.
- Files ≤ 200 lines, functions ≤ 40 lines.
- **No hex/rgba literals** in `src/features/**` / `src/shared/ui/**` / `src/app/**` — colors from tokens or built in `core` (the skyline rgba is produced by `skylineColor()` in core). Font sizes/spacing inline are fine.
- **No new dependency.**
- Behavior tests cite AC IDs: `test('AC-2: …')`.
- **Skia + Jest, load-bearing:** the Skia jest mock has NO CanvasKit — NEVER call `Skia.Path.*` / `Skia.Path.MakeFromSVGString` in JS (it throws, and would crash the tab-bar/atmosphere tests). Pass raw `d` strings to `<Path path="…"/>`. The mock renders `Canvas`→`View` and children (`Path`/`Circle`/`Group`/`Blur`) as host nodes (`skPath`/`skCircle`/`skGroup`/`skBlurMaskFilter`) whose props are preserved — so `testID` must sit on the specific element whose props you assert (never on the `Canvas`).
- Design glyph/values are the source of truth; copy path strings verbatim from the specs, never retype.

---

### Task 1: Skyline model (core/atmosphere additions)

**Files:**
- Modify: `src/core/atmosphere/index.ts` (add exports)
- Test: `src/core/atmosphere/__tests__/skyline.test.ts` (new)

**Interfaces — Produces:** `SKYLINE_PATH`, `SKYLINE_VIEWBOX`, `SKYLINE_TOP_RATIO`, `skyline(density)`, `skylineColor(density)`. Consumed by Task 2.

- [ ] **Step 1: Write the failing tests** (`src/core/atmosphere/__tests__/skyline.test.ts`)

```ts
import {
  SKYLINE_PATH,
  SKYLINE_VIEWBOX,
  SKYLINE_TOP_RATIO,
  skyline,
  skylineColor,
} from '..';

const EXPECTED_PATH =
  'M0,150 L0,96 L14,96 L14,74 L26,74 L26,96 L40,96 L40,58 L52,52 L64,58 L64,96 L78,96 L78,40 L86,34 L94,40 L94,96 L108,96 L108,70 L120,70 L120,50 L132,50 L132,96 L146,96 L146,64 L158,64 L158,82 L170,82 L170,44 L182,38 L194,44 L194,96 L206,96 L206,60 L218,60 L218,78 L230,78 L230,52 L242,52 L242,30 L250,24 L258,30 L258,96 L272,96 L272,68 L284,68 L284,48 L296,48 L296,96 L310,96 L310,58 L322,52 L334,58 L334,80 L348,80 L348,66 L360,66 L360,88 L376,88 L376,72 L389,72 L389,150 Z';

test('AC-1: skyline path/viewBox/top-ratio pinned to the design (literal fixture)', () => {
  expect(SKYLINE_PATH).toBe(EXPECTED_PATH);
  expect(SKYLINE_VIEWBOX).toEqual({ width: 389, height: 150 });
  expect(SKYLINE_TOP_RATIO).toBe(0.44);
});

test('AC-2: skyline(density) → blur + opacity', () => {
  expect(skyline(1)).toEqual({ blur: 7, opacity: 0.55 });
  expect(skyline(0.5)).toEqual({ blur: 3.5, opacity: 0.775 });
  expect(skyline(0.03)).toEqual({ blur: 0.21, opacity: 0.9865 });
});

test('AC-3: skylineColor(density) → rgba, alpha 2dp trailing-zero-stripped', () => {
  expect(skylineColor(1)).toBe('rgba(3,5,9,0.4)');
  expect(skylineColor(0.5)).toBe('rgba(3,5,9,0.56)');
  expect(skylineColor(0.03)).toBe('rgba(3,5,9,0.71)');
});
```

- [ ] **Step 2: Run to verify fail** — `npx jest src/core/atmosphere` → FAIL (exports missing).
- [ ] **Step 3: Implement** — append to `src/core/atmosphere/index.ts`:

```ts
// The design's generic city silhouette (Powietrze.dc.html:34), reused verbatim.
export const SKYLINE_PATH =
  'M0,150 L0,96 L14,96 L14,74 L26,74 L26,96 L40,96 L40,58 L52,52 L64,58 L64,96 L78,96 L78,40 L86,34 L94,40 L94,96 L108,96 L108,70 L120,70 L120,50 L132,50 L132,96 L146,96 L146,64 L158,64 L158,82 L170,82 L170,44 L182,38 L194,44 L194,96 L206,96 L206,60 L218,60 L218,78 L230,78 L230,52 L242,52 L242,30 L250,24 L258,30 L258,96 L272,96 L272,68 L284,68 L284,48 L296,48 L296,96 L310,96 L310,58 L322,52 L334,58 L334,80 L348,80 L348,66 L360,66 L360,88 L376,88 L376,72 L389,72 L389,150 Z';
export const SKYLINE_VIEWBOX = { width: 389, height: 150 } as const;
export const SKYLINE_TOP_RATIO = 0.44;

// density (scene.density 0.03..1) → skyline haze. blur ports the CSS px radius
// 1:1 to the Skia Blur sigma (M3 shadowBlur precedent); opacity = 1 - density*0.45.
export function skyline(density: number): { blur: number; opacity: number } {
  return { blur: density * 7, opacity: 1 - density * 0.45 };
}

// Fill rgba(3,5,9, 0.72 - density*0.32); alpha rounded to 2dp, trailing zeros
// stripped, so the string is stable (raw concat would emit 0.3999…). Built here
// to keep the rgba out of the no-hex-linted UI layer.
export function skylineColor(density: number): string {
  const alpha = parseFloat((0.72 - density * 0.32).toFixed(2));
  return `rgba(3,5,9,${alpha})`;
}
```

- [ ] **Step 4: Verify pass + gate** — `npx jest src/core/atmosphere` PASS; `npm run typecheck`; confirm `src/core` still 100% coverage.
- [ ] **Step 5: Commit** — `git commit -m "feat(core): skyline path + density haze math (AC-1..3, spec 010)"`

---

### Task 2: Skyline sub-component + Atmosphere integration

**Files:**
- Create: `src/shared/ui/Skyline.tsx`
- Modify: `src/shared/ui/Atmosphere.tsx` (render `<Skyline>` after the particle group)
- Test: `src/shared/ui/__tests__/Skyline.test.tsx` (new)

**Interfaces — Consumes:** Task 1 exports; Skia `Group`/`Path`/`Blur`. **Produces:** `Skyline({ density, width, height })`.

- [ ] **Step 1: Write the failing test** (`src/shared/ui/__tests__/Skyline.test.tsx`)

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

- [ ] **Step 2: Run to verify fail** — `npx jest Skyline` → FAIL.
- [ ] **Step 3: Implement** (`src/shared/ui/Skyline.tsx`) — string-form path, translate-then-scale about origin, blur+opacity+color from core:

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

- [ ] **Step 4: Integrate** — in `src/shared/ui/Atmosphere.tsx`, render `<Skyline density={scene.density} width={width} height={height} />` inside the `<Canvas>` **after** the particle `<Group>` (so it overlays the field). Import `Skyline`. Keep `Atmosphere()` ≤40 lines.
- [ ] **Step 5: Verify pass + gate** — `npx jest Skyline Atmosphere` PASS; `npm test` (nothing else broke); `npm run lint` (0 — no rgba in Skyline.tsx, it comes from core); `npm run typecheck`.
- [ ] **Step 6: Commit** — `git commit -m "feat(atmosphere): render density-driven skyline in the canvas (AC-4, spec 010)"`

---

### Task 3: type.tab token + TabIcon (Skia icons)

**Files:**
- Modify: `src/shared/tokens/index.ts` (add `type.tab`)
- Create: `src/shared/ui/TabIcon.tsx`
- Test: `src/shared/ui/__tests__/TabIcon.test.tsx` (new)

**Interfaces — Produces:** `type.tab`; `TabIconName`, `ICON_PATHS`, `TabIcon({ name, color, testID })`. Consumed by Task 4.

- [ ] **Step 1: Add the token.** In `src/shared/tokens/index.ts` `type` object add: `tab: { size: 10.5, weight: '500', letterSpacing: 0 },`.

- [ ] **Step 2: Write the failing tests** (`src/shared/ui/__tests__/TabIcon.test.tsx`)

```ts
import { render, screen } from '@testing-library/react-native';
import { TabIcon, ICON_PATHS } from '../TabIcon';

test('AC-1: ICON_PATHS pins the design icon table (literal fixture)', () => {
  expect(ICON_PATHS).toEqual({
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
  });
});

test('AC-2: TabIcon strokes the icon in `color`; testID lands on a stroked node', async () => {
  await render(<TabIcon name="teraz" color="#ff6658" testID="icon-x" />);
  const node = screen.getByTestId('icon-x');
  expect(node.props.color).toBe('#ff6658');
  expect(node.props.strokeWidth).toBe(1.9);
});
```

- [ ] **Step 3: Run to verify fail** — `npx jest TabIcon` → FAIL.
- [ ] **Step 4: Implement** (`src/shared/ui/TabIcon.tsx`) — data-driven, string-form paths, `scale 25/24` group, testID on the first stroked node. Keep the render body ≤40 lines.

```tsx
import { Canvas, Group, Path, Circle } from '@shopify/react-native-skia';

export type TabIconName = 'teraz' | 'miejsca' | 'ustawienia';

// Verbatim from Powietrze.dc.html:256/260/264 (viewBox 0 0 24 24).
export const ICON_PATHS: Record<
  TabIconName,
  { paths: string[]; circles: { cx: number; cy: number; r: number }[] }
> = {
  teraz: { paths: ['M3 17h4M17 17h4M5 20.5h5M14 20.5h5'], circles: [{ cx: 12, cy: 9, r: 4 }] },
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
  // testID on the first stroked element (a circle exists for every icon) so its
  // `color` is assertable — the Canvas mocks to a bare View with no color.
  return (
    <Canvas style={{ width: SIZE, height: SIZE }}>
      <Group transform={[{ scale: SIZE / 24 }]}>
        {circles.map((c, i) => (
          <Circle
            key={`c${i}`}
            testID={i === 0 ? testID : undefined}
            cx={c.cx}
            cy={c.cy}
            r={c.r}
            color={color}
            style="stroke"
            strokeWidth={STROKE}
            strokeCap="round"
          />
        ))}
        {paths.map((d, i) => (
          <Path
            key={`p${i}`}
            path={d}
            color={color}
            style="stroke"
            strokeWidth={STROKE}
            strokeCap="round"
            strokeJoin="round"
          />
        ))}
      </Group>
    </Canvas>
  );
}
```

- [ ] **Step 5: Verify pass + gate** — `npx jest TabIcon` PASS; `npm run lint` (0 — no color literal; `color` is a prop); `npm run typecheck`. (The test passes `#ff6658` as a prop value in a TEST file, which is allowed — no-hex targets source under features/shared-ui, and even there only non-token literals; confirm lint stays 0, and if the test's inline hex trips lint, use a token value like `colors.accent` instead.)
- [ ] **Step 6: Commit** — `git commit -m "feat(shared): type.tab token + Skia TabIcon (AC-1..2, spec 011)"`

---

### Task 4: Tab bar redesign (icons + labels + a11y)

**Files:**
- Modify: `src/app/TabBar.tsx`
- Test: extend `src/app/__tests__/AppNavigator.test.tsx` (and/or a focused TabBar test)

**Interfaces — Consumes:** `TabIcon`, `TabIconName` (Task 3), `type.tab`, existing `makeTabBar` tint logic.

- [ ] **Step 1: Write the failing tests** — add to `src/app/__tests__/AppNavigator.test.tsx` (keep the existing PR #7 tint tests as-is; they must still pass):

```ts
test('AC-3/AC-4: each tab shows its icon (tinted like the label) above the label', async () => {
  await renderNav();
  await screen.findByText('118');
  const key = scene(118).key;
  // focused Teraz: icon carries the live key tint
  expect(within(screen.getByTestId('tab-Teraz')).getByTestId('icon-Teraz').props.color).toBe(key);
  // unfocused Miejsca: neutral inactive
  expect(within(screen.getByTestId('tab-Miejsca')).getByTestId('icon-Miejsca').props.color).toBe(colors.text.inactive);
});

test('AC-6: each tab is a selected-aware button', async () => {
  await renderNav();
  const teraz = screen.getByTestId('tab-Teraz');
  expect(teraz.props.accessibilityState.selected).toBe(true);
  expect(screen.getByTestId('tab-Miejsca').props.accessibilityState.selected).toBe(false);
});
```

- [ ] **Step 2: Run to verify fail** — `npx jest AppNavigator` → the two new tests FAIL (no icon / no a11y state); the existing tint tests still pass.
- [ ] **Step 3: Implement** in `src/app/TabBar.tsx`:
  - Add `import { TabIcon, type TabIconName } from '../shared/ui/TabIcon';` and `const ROUTE_ICON: Record<string, TabIconName> = { Teraz: 'teraz', Miejsca: 'miejsca', Ustawienia: 'ustawienia' };`.
  - In each item render `ROUTE_ICON[route.name] && <TabIcon name={ROUTE_ICON[route.name]} color={tint} testID={`icon-${route.name}`} />` above the label.
  - Label: use `type.tab` (size 10.5, weight 500, letterSpacing 0) instead of the `label` variant / `letterSpacing: 0.5`. Tint stays `tint`.
  - Item column: `alignItems:'center'`, `gap: 4`.
  - Pressable: add `accessibilityRole="button"` and `accessibilityState={{ selected: focused }}`.
  - Bar style: add `paddingTop: 10` (design `10 0 24`); keep height 88, `colors.tabBar.bg`, borderTop.
- [ ] **Step 4: Verify pass + gate** — `npx jest AppNavigator` all PASS (incl. the untouched PR #7 tint tests); `npm test` full suite green; `npm run lint` 0; `npm run typecheck` 0.
- [ ] **Step 5: Commit** — `git commit -m "feat(nav): icon tab bar with design tint/geometry/a11y (AC-3..6, spec 011)"`

---

### Task 5: Native run + manual ACs + journal

**Files:**
- Create: `docs/harness/10-11-design-fidelity.md` (journal), `docs/harness/evidence/10/`, `docs/harness/evidence/11/`

- [ ] **Step 1: Full gate** — `npm run lint && npm run typecheck && npm test` green; `src/core` 100%.
- [ ] **Step 2: Build + run** on the iPhone 16 Pro sim (sandbox disabled). Confirm: the skyline appears at ~44% height on Teraz and blurs/fades between clean and bad air (AC-5, spec 010); the tab bar shows the three icons above labels, tinted per focus with Teraz glowing the live color (AC-7, spec 011).
- [ ] **Step 3: Capture** skyline screenshots at ~3 indices into `docs/harness/evidence/10/` and a tab-bar shot into `docs/harness/evidence/11/`. (Interactive/visual — offer to the human where headless capture can't drive it.)
- [ ] **Step 4: Write** `docs/harness/10-11-design-fidelity.md` — summary, AC coverage (010 AC-1..5, 011 AC-1..7), deviations, gotchas (esp. the Skia-string-path/jest-mock rule).
- [ ] **Step 5: Commit** — `git commit -m "docs(harness): journal 10-11 design fidelity + evidence"`

---

## Self-Review

**Spec coverage:** 010 AC-1..3 → T1; 010 AC-4 → T2; 010 AC-5 → T5. 011 AC-1..2 → T3; 011 AC-3..6 → T4; 011 AC-7 → T5. All covered.

**Placeholder scan:** none — every code step has real code or an exact edit list.

**Type consistency:** `SKYLINE_*`/`skyline`/`skylineColor` defined in T1, imported unchanged in T2; `TabIconName`/`ICON_PATHS`/`TabIcon` defined in T3, used in T4; `type.tab` added in T3 and consumed in T4; testID conventions (`skyline`/`skyline-group`/`skyline-blur`, `icon-<Route>`) consistent between component and tests.

**Load-bearing reminders honored:** string-form `<Path path=…>` (no `Skia.Path.*`); testIDs on stroked host nodes, never the Canvas; skyline rgba built in core to satisfy no-hex.
