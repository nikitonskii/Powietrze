# Spec 013: Miejsca — band + trend arrow on rows

**Status:** draft
**Milestone:** M-miejsca-trend (small; built proportionately — TDD + gates, no full critic/subagent ceremony, like PR #7)
**Sources:** `design/README.md` §2 (Miejsca row: "band + trend arrow (↑ index>85, ↓ index<40, → else) tinted key"); `design/Powietrze.dc.html` lines 148, 493 (`up?'↑':(index<40?'↓':'→')`, `trendStyle {color: key, weight 600}`)

## Scope
Add the design's "band + trend arrow" line to each live place row in Miejsca. The
arrow is a pure function of the index (`>85 ↑`, `<40 ↓`, else `→`), rendered next
to the band name and tinted the scene key color. Shows only when the row has a
live reading. No new dependency.

## Non-goals
- The full "miniature Horizon scene" row redesign (per-index gradient background,
  44px right-aligned index restyle) — a separate, larger design-fidelity milestone.
- A *historical* trend (comparing hours). The design defines the arrow by absolute
  index thresholds, not change over time; this ships that. (Real historical trend
  is a possible future enhancement — data already exists via spec 012's history.)

## Public API
### `src/core/scene/` (addition — pure)
```ts
export type TrendArrow = '↑' | '↓' | '→';
// index > 85 → '↑'; index < 40 → '↓'; else '→'. (design Powietrze.dc.html:493)
export function trendArrow(index: number): TrendArrow;
```

## Behavior — Acceptance Criteria
- **AC-1** — `trendArrow` thresholds (literal fixture, incl. boundaries):
  `86 → '↑'`, `85 → '→'`, `40 → '→'`, `39 → '↓'`, `118 → '↑'`, `19 → '↓'`,
  `63 → '→'`.
- **AC-2** — `PlaceRow`, when it has a live `reading`, renders a band+trend line:
  the band (`scene(reading.index).band`, in `colors.text.high`) followed by the
  `trendArrow(reading.index)` glyph tinted `scene(reading.index).key`. The arrow
  carries a testID `trend-<index>` (or the row exposes the arrow's color for the
  test). When there is no reading (loading/stale), no band+trend line renders.
- **AC-3** — the arrow value matches `trendArrow(index)` for the row's index, and
  its color equals `scene(index).key` (asserted via `colorOf`).

## Resolved ambiguities
- **Index-threshold arrow, per design** — not a historical delta (see Non-goals).
- **Shown on both favorites and search results** — both use `PlaceRow`, so the
  band+trend line appears on both (consistent; the design shows band+trend on the
  favorite rows, and it's harmless/informative on result rows).
- **Placement** — a third line on the row's left column, under the station
  subtitle, matching the design's left-stack (city / station / band+trend).

## Verification
- **AC-1**: unit test `src/core/scene/__tests__/trend.test.ts` (literal fixture,
  pins thresholds + boundaries).
- **AC-2/AC-3**: behavior test in `src/features/miejsca/__tests__/PlaceRow.test.tsx`
  (or MiejscaScreen) — assert band + arrow glyph present and the arrow's color is
  `scene(index).key` via `colorOf`; assert absent when no reading.
- Manual: the arrow shows on Miejsca rows on the sim (folded into the next journal).
