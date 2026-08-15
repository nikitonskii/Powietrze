# Review 6 verdict — Teraz composition (scrollable + chart + tiles)

SPEC: ✅
QUALITY: APPROVE

## AC-10 check

- `useActivePlace()` now destructures `detail` (`ActivePlaceContext.tsx` already
  exposed `detail?: ReadingDetail`, unchanged by this task). Correct — accessed
  as `detail?.history/pm10/no2` only inside a `detail && (...)` guard, so no
  unsafe access; `PollutantTiles` itself further guards with `value ?? '—'`.
- Order top→bottom: Hero, then (when `detail` present) `HistoryChart`, then
  `PollutantTiles` — matches spec 012 AC-10 exactly. Absent `detail` → chart/tiles
  omitted, Hero still renders, no crash (confirmed by the "without detail" test
  and by the `detail &&` guard, which short-circuits cleanly for `undefined`).
- `ScrollView` wraps only the content; `GradientBackground` (bearing the
  `gradient-background` testID) and `Atmosphere` remain outside/above it,
  non-scrolling — matches the brief's required composition.
- `contentContainerStyle` uses `flexGrow: 1` (not `flex: 1`) — correct for a
  ScrollView content container. Padding (`screenTop`/`screenH`/`screenBottom`)
  preserved from `spacing` tokens, unchanged values.
- Chart/tiles spacing: `styles.detail = { marginTop: 8 }` wraps
  chart+tiles-container (gives HistoryChart its 8px gap below Hero), and
  `styles.tiles = { marginTop: 12 }` wraps `PollutantTiles` (12px gap below
  chart) — matches the brief's 8/12 spacing instruction.
- `gradient-background` testID and the `teraz-loading` early-return branch are
  both untouched by the diff — confirmed by inspection of both the diff and the
  current file.

## Regression check (critical)

- Diff confirmed additive-only for the two pre-existing tests (`AC-8: renders
  the live reading…` and `AC-8: shows a loading state…`) — no lines inside
  either test block were touched; only two new `test(...)` blocks were appended
  after them.
- `GradientBackground` renders `testID="gradient-background"` on the outer
  `LinearGradient`, with `children` (now including the `ScrollView`) rendered
  inside it — so `within(gradient-background).getByText(...)` still traverses
  into the ScrollView's content. No structural reason for the existing
  assertions to break.
- A second matching test file, `TerazScreen.nearest.test.tsx` (1 test, AC
  006-7), also matches the `npx jest TerazScreen` glob — this is why the report
  says "5 passed, 5 total" for that command (4 tests in `TerazScreen.test.tsx`
  + 1 in `TerazScreen.nearest.test.tsx`), not a discrepancy. That test only
  asserts place/eyebrow text, unaffected by the ScrollView refactor.
- Tests were not re-run per instructions; the report's "48 suites / 162 tests"
  full-suite claim and TDD-evidence narrative (fail-then-pass) are internally
  consistent with the diff and not further verified here.

## Layout deviation ruling

The report drops `justifyContent: 'center'` (vertical centering of the Hero
when short) in favor of top-alignment. `design/README.md` says "content
scrolls over it... Hero block centered," which read in isolation could suggest
vertical centering is expected — but `Hero.tsx` already has its own
`alignItems: 'center'` / `textAlign: 'center'` styles independent of the
parent ScrollView, and every other "centered" reference in the design doc
(`TWOJA LOKALIZACJA`, advice text) is horizontal/text-alignment, not viewport
positioning. Given the mock's full Teraz page is taller than one screen once
chart/tiles/forecast are included, viewport vertical-centering was never a
coherent reading for the general case anyway. The brief explicitly left this
choice to the implementer ("pick what renders the hero reasonably... top-
aligned per the mock is fine"). No test asserts on vertical position, so
nothing regresses.

**Ruling: acceptable.** A reasonable, brief-sanctioned interpretation with no
functional or test impact; worth a one-line follow-up note for design sign-off
on the Hero-only (no-detail) vertical position, but not a blocker for this task.

## Quality

- No raw hex in `TerazScreen.tsx` — only `colors.base` and `spacing.*` tokens
  used; no new hex introduced.
- No `any` in the diff.
- `TerazScreen.tsx`: 53 lines (≤200); `TerazScreen` function ~29 lines (≤40).
- `HistoryChart.tsx`'s inline `style={{...}}` on `Bar` (dynamic per-point
  height/color/opacity) is a pre-existing file from an earlier task, not part
  of this diff — the associated lint warning is expected/acceptable per the
  brief and does not block this task.
- `styles.detail` / `styles.tiles` wrapper views are a reasonable, minimal way
  to satisfy the 8/12 marginTop spacing without touching `HistoryChart` /
  `PollutantTiles` internals.

## Findings

None — clean.
