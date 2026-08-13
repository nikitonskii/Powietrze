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
// A 25×25 Skia icon stroked in `color` (stroke width 1.9, round caps/joins),
// paths transcribed verbatim from the design (viewBox 0 0 24 24).
export function TabIcon(props: {
  name: TabIconName;
  color: string;
  testID?: string;
}): JSX.Element;
```

### `src/app/TabBar.tsx` (modified)

`makeTabBar(activeTints, inactiveTints?)` signature and tint logic are
unchanged. Each item now renders `<TabIcon name={…} color={tint}/>` above the
label. Route name → icon: `Teraz→teraz`, `Miejsca→miejsca`, `Ustawienia→ustawienia`.

## Behavior — Acceptance Criteria

### Icon (UI)

- **AC-1** — the three design icon path sets are transcribed verbatim (literal
  fixture — M1 retro rule). A test pins, per `TabIconName`, the exact path `d`
  strings / circle params from `Powietrze.dc.html:256,260,264`:
  - `teraz`: circle `cx12 cy9 r4` + path `M3 17h4M17 17h4M5 20.5h5M14 20.5h5`
  - `miejsca`: path `M12 21s-7-6.3-7-11a7 7 0 0114 0c0 4.7-7 11-7 11z` + circle `cx12 cy10 r2.4`
  - `ustawienia`: circle `cx12 cy12 r3` + path `M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1`
- **AC-2** — `TabIcon` renders a 25×25 Skia canvas whose strokes use the passed
  `color` (stroke width 1.9, round cap/join, fill none). Verified to the extent
  the Skia jest mock exposes (element presence + forwarded `color`/stroke props);
  the pixel look is AC-6.

### Tab bar (integration)

- **AC-3** — each tab renders a `TabIcon` (route→name mapping above) **above**
  its text label, vertically stacked with the design's `gap 4`; label is
  `10.5px` weight `500` (was the 12px/label variant).
- **AC-4** — the tint rule from PR #7 is preserved and applied to BOTH icon and
  label: focused Teraz → its `activeTints.Teraz` (live key color); focused
  Miejsca/Ustawienia → accent; unfocused Teraz → its `inactiveTints.Teraz`
  (dimmed live tint) or gray; other unfocused → `colors.text.inactive`. The
  existing AppNavigator tint tests (AC 006-10 and the unfocused-Teraz test)
  still pass unchanged — the label text remains queryable and carries the tint.
- **AC-5** — bar geometry unchanged and design-correct: height 88, background
  `colors.tabBar.bg` (`rgba(10,12,17,.55)`), `borderTopWidth 1` /
  `colors.tabBar.border`; each `tab-<Route>` testID preserved.
- **AC-6** — *(manual, journal)* On the simulator the three icons render crisply
  and tint correctly per focus (Teraz glows the live air color); screenshot into
  `docs/harness/evidence/11/`.

## Resolved ambiguities

- **Icons via Skia, not `react-native-svg`.** No new dependency; Skia strokes
  the paths directly. Each `TabIcon` is a tiny static 25×25 `Canvas` — three of
  them in the bar is negligible cost.
- **Label kept alongside the icon.** The design shows icon + label; keeping the
  text label also means the PR #7 tint tests (which query the label text) keep
  working — the icon is additive.
- **No blur.** See Non-goals; the translucent color stays.
- **Icon path literals live in `TabIcon.tsx`** (a UI asset module), pinned by
  the AC-1 fixture test. They contain no color literals (tint is a prop), so the
  no-hex lint is unaffected.

## Verification

- **AC-1** (icon literals): fixture test in `src/shared/ui/__tests__/TabIcon.test.tsx`
  pinning the three path/circle definitions.
- **AC-2** (icon render): same file — assert the icon renders and forwards the
  `color`/stroke props the Skia mock exposes.
- **AC-3..AC-5** (tab bar): extend `src/app/__tests__/*` — assert each tab has a
  `TabIcon` + label, the label is 10.5/500, tint applies to both, geometry
  unchanged; confirm the existing PR #7 tint tests still pass.
- **AC-6** (manual): simulator screenshot in the milestone journal.
