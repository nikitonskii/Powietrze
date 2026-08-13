# Spec 011: Tab bar — icons + design fidelity

**Status:** draft
**Milestone:** M-design-fidelity (with spec 010 skyline)
**Sources:** `design/README.md` §"Tab bar" (line 82) + §Assets ("Icons"); `design/Powietrze.dc.html` lines 254–267 (tab bar markup + the three inline icon SVGs)

## Scope

Bring the bottom tab bar to the design: each tab becomes an **icon above a
label** (not a bare label), using the design's three inline SVG icons rendered
with Skia (already on board — no new dependency). Keep the existing
`makeTabBar(activeTints, inactiveTints)` tint logic (PR #7: focused Teraz =
live key color, Miejsca/Ustawienia focused = accent, unfocused Teraz keeps a
dimmed live tint, other unfocused = neutral gray). Bar geometry/colors already
match the design (88px, `rgba(10,12,17,.55)`, top border) and stay.

## Non-goals

- True backdrop blur (`blur(24px)`). It needs a native library, which we are
  deliberately not adding; the design's own translucent `rgba(10,12,17,.55)`
  background stays and reads as a modern iOS bar. A real blur pass (tab bar +
  cards + search field) is a future milestone if ever wanted.
- `react-native-svg`. Icons are drawn with Skia to avoid a new dependency.
- Changing the tint/navigation behavior established in PR #7 — only the icon is
  added and the label restyled.

## Public API

### `src/shared/ui/TabIcon.tsx` (new)

```ts
export type TabIconName = 'teraz' | 'miejsca' | 'ustawienia';

// The three design icons as DATA (viewBox 0 0 24 24), transcribed verbatim from
// Powietrze.dc.html:256/260/264. `paths` are raw SVG `d` strings; `circles` are
// stroked outlines. Exported so AC-1's literal fixture can pin them, and so the
// render body stays a small data-driven loop (≤40 lines).
export const ICON_PATHS: Record<
  TabIconName,
  { paths: string[]; circles: { cx: number; cy: number; r: number }[] }
>;

// A 25×25 Skia icon. CRITICAL: pass each `d` straight to <Path path="M3 17h4…"/>
// (string form). NEVER call Skia.Path.MakeFromSVGString / Skia.Path.* in JS —
// the Skia Jest mock has no CanvasKit, so those throw and would crash both this
// test AND the shipped AppNavigator tint tests (the tab bar renders TabIcon).
// Draw inside a <Group transform={[{ scale: 25/24 }]}> so the 24-space coords
// AND the 1.9 stroke scale up to the 25px box exactly as the SVG does. Stroke:
// `color`, width 1.9, round cap, fill none. `testID` is forwarded onto the FIRST
// stroked host node (skPath/skCircle) — a testID on the Canvas (a bare View under
// the mock) would carry no `color`, making the tint unassertable.
export function TabIcon(props: {
  name: TabIconName;
  color: string;
  testID?: string;
}): JSX.Element;
```

### `src/shared/tokens/index.ts` (addition)

```ts
type.tab = { size: 10.5, weight: '500', letterSpacing: 0 }; // design tab label
```

### `src/app/TabBar.tsx` (modified)

`makeTabBar(activeTints, inactiveTints?)` signature and tint logic are
unchanged. Each item now renders `<TabIcon name={…} color={tint} testID={`icon-${route.name}`}/>`
above the label (label styled via `type.tab`). The route→icon mapping is an
explicit table, not an unchecked cast:

```ts
const ROUTE_ICON: Record<string, TabIconName> =
  { Teraz: 'teraz', Miejsca: 'miejsca', Ustawienia: 'ustawienia' };
// a route absent from the map renders no icon (label only) rather than crashing.
```

## Behavior — Acceptance Criteria

### Icon (UI)

- **AC-1** — `ICON_PATHS` deep-equals the literal table transcribed verbatim
  from `Powietrze.dc.html:256,260,264` (literal fixture — M1 retro rule):
  - `teraz`: paths `['M3 17h4M17 17h4M5 20.5h5M14 20.5h5']`, circles `[{cx:12,cy:9,r:4}]`
  - `miejsca`: paths `['M12 21s-7-6.3-7-11a7 7 0 0114 0c0 4.7-7 11-7 11z']`, circles `[{cx:12,cy:10,r:2.4}]`
  - `ustawienia`: paths `['M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1']`, circles `[{cx:12,cy:12,r:3}]`
- **AC-2** — `TabIcon name color testID` renders a 25×25 Skia `Canvas` with a
  `Group transform={[{ scale: 25/24 }]}` containing the icon's `Path`s (each fed
  the raw `d` **string**, not a parsed `SkPath`) and `Circle`s, all stroked
  (`color`, `strokeWidth 1.9`, round cap, no fill). The `testID` lands on the
  first stroked host node, so `getByTestId(testID).props.color === color` and
  `.props.strokeWidth === 1.9`. (No `Skia.Path.*` call anywhere — it throws under
  the mock.) Pixel look is AC-7.

### Tab bar (integration)

- **AC-3** — each tab renders `<TabIcon>` (via the `ROUTE_ICON` map) **above**
  its text label, vertically stacked with `gap 4`; the label uses the new
  `type.tab` token (size 10.5, weight 500, letterSpacing 0 — matching the design,
  which has no letter-spacing).
- **AC-4** — the PR #7 tint rule is preserved and applied to BOTH icon and
  label: focused Teraz → `activeTints.Teraz` (live key color); focused
  Miejsca/Ustawienia → accent; unfocused Teraz → `inactiveTints.Teraz` (dimmed
  live tint) or gray; other unfocused → `colors.text.inactive`. Asserted on the
  icon via `within(tab).getByTestId('icon-<Route>').props.color` and on the label
  via `colorOf`. The existing AppNavigator tint tests (AC 006-10 + the
  unfocused-Teraz test) still pass unchanged — the icon adds no text node, so
  `getByText('Teraz')` stays unique.
- **AC-5** — bar geometry, design-correct: height 88, padding `10 / 0 / 24`
  (top 10, bottom 24 — `Powietrze.dc.html:254`), background `colors.tabBar.bg`
  (`rgba(10,12,17,.55)`), `borderTopWidth 1` / `colors.tabBar.border`; each
  `tab-<Route>` testID preserved; the icon+label stack is centered.
- **AC-6** — each tab `Pressable` sets `accessibilityRole="button"` and
  `accessibilityState={{ selected: focused }}` (the icon is decorative — the
  label carries the name — so it needs no separate a11y label).
- **AC-7** — *(manual, journal)* On the simulator the three icons render crisply
  and tint correctly per focus (Teraz glows the live air color); screenshot into
  `docs/harness/evidence/11/`.

## Resolved ambiguities

- **Icons via Skia, not `react-native-svg` or SF Symbols.** The design note
  (README §Assets) suggests SF Symbols in native; under the "no new libraries"
  constraint we stroke the design's own SVG paths with Skia (already on board).
  Each `TabIcon` is a tiny static 25×25 `Canvas` — three in the bar is negligible.
- **String-form paths only.** Paths are passed as raw `d` strings to `<Path path=…/>`;
  we never call `Skia.Path.MakeFromSVGString`/`Skia.Path.*` in JS, because the
  Skia Jest mock has no CanvasKit and those throw — which would crash both the
  icon test and the shipped AppNavigator tint tests (the bar renders `TabIcon`).
- **24→25 scale.** The paths are in a 24 viewBox but the icon box is 25px, so a
  `Group transform={[{ scale: 25/24 }]}` wraps them — this scales the coordinates
  AND the 1.9 stroke together (1.9→~1.98), exactly as an SVG `preserveAspectRatio`
  fit would, rather than drawing 24-space coords ~4% small in a 25px box.
- **testID on the stroked node.** Under the mock the `Canvas` is a bare `View`
  (no `color`), while `Path`/`Circle` render as host nodes that preserve props;
  so `TabIcon` forwards its `testID` onto the first stroked element to make the
  tint assertable.
- **Label kept alongside the icon.** The design shows icon + label; keeping the
  text label also means the PR #7 tint tests (which query the label text) keep
  working — the icon is additive and adds no second text node.
- **No blur.** See Non-goals; the translucent color stays.
- **`teraz` icon stroke.** The design gives it `linecap round` only (no
  `linejoin`); harmless (its path is straight segments + a circle, no joins), so
  a uniform round cap/join is fine — noted for fidelity.
- **Icon path literals live in `TabIcon.tsx`** as the exported `ICON_PATHS`
  table, pinned by the AC-1 fixture. They contain no color literals (tint is a
  prop), so the no-hex lint is unaffected.

## Verification

- **AC-1** (icon literals): fixture test in `src/shared/ui/__tests__/TabIcon.test.tsx`
  deep-equalling `ICON_PATHS` against the pinned table.
- **AC-2** (icon render): same file — render `<TabIcon testID="icon-x"/>`, assert
  `getByTestId('icon-x').props.color`/`.strokeWidth` on the stroked host node; the
  paths are string-form (no `Skia.Path.*`).
- **AC-3..AC-6** (tab bar): extend `src/app/__tests__/*` — each tab has a
  `TabIcon` (`icon-<Route>`) + label using `type.tab`; tint asserted on BOTH the
  icon (`.props.color`) and label (`colorOf`); geometry (height 88, padding
  10/0/24); `accessibilityState.selected`. Confirm the existing PR #7 tint tests
  (`AppNavigator.test.tsx`) still pass unchanged.
- **AC-7** (manual): simulator screenshot in the milestone journal.
