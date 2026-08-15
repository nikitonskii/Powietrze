# Task 5 — HistoryChart + PollutantTiles + glass tokens

Worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`, branch `feature/m-teraz-detail`.

## Global Constraints
- TS strict; no `any`. Files ≤200, functions ≤40. Test names cite AC IDs.
- **No hex/rgba in `src/shared/ui/**`** — colors from tokens (new `glass`/`glassBorder`, plus existing `text.muted/.dim/.inactive/.faint/.primary`) or `scene()`.
- No new dependency. These are plain RN Views/Text (NOT Skia) so `StyleSheet.flatten(node.props.style)` reads their style in tests.
- Glyphs: header `OSTATNIE 24 GODZINY`, axis `12:00 18:00 00:00 06:00 teraz`, `µg/m³` (µ=U+00B5), `NO₂` (₂=U+2082), `—` (U+2014). Copy from this brief.

## Consumes (Task 1, committed)
`HourPoint`, `historyBarOpacity`, `barHeightPct` from `../../core/air`; `scene` from `../../core/scene`.

## Produces
`HistoryChart({ history })`, `PollutantTiles({ pm10?, no2? })`.

## Files
- Modify: `src/shared/tokens/index.ts` (add `glass`, `glassBorder`)
- Create: `src/shared/ui/HistoryChart.tsx`, `src/shared/ui/PollutantTiles.tsx`
- Test: `src/shared/ui/__tests__/HistoryChart.test.tsx`, `src/shared/ui/__tests__/PollutantTiles.test.tsx`

## Step 1: Add tokens
In `src/shared/tokens/index.ts` `colors`: `glass: 'rgba(255,255,255,0.07)'`, `glassBorder: 'rgba(255,255,255,0.09)'`.

## Step 2: Write failing tests
`HistoryChart.test.tsx`:
```ts
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { HistoryChart } from '../HistoryChart';
import { scene } from '../../../core/scene';
import { historyBarOpacity, barHeightPct, type HourPoint } from '../../../core/air';

const H: HourPoint[] = [
  { at: 'a', pm25: 10, index: 10 },
  { at: 'b', pm25: 200, index: 200 },
];

test('AC-8: header + axis labels + bar color/opacity/height', async () => {
  await render(<HistoryChart history={H} />);
  expect(screen.getByText('OSTATNIE 24 GODZINY')).toBeTruthy();
  for (const l of ['12:00', '18:00', '00:00', '06:00', 'teraz']) {
    expect(screen.getByText(l)).toBeTruthy();
  }
  const b0 = StyleSheet.flatten(screen.getByTestId('bar-0').props.style);
  expect(b0.backgroundColor).toBe(scene(10).key);
  expect(b0.opacity).toBe(historyBarOpacity(0, 2));
  expect(b0.height).toBe(`${barHeightPct(10)}%`);
  const b1 = StyleSheet.flatten(screen.getByTestId('bar-1').props.style);
  expect(b1.backgroundColor).toBe(scene(200).key);
  expect(b1.opacity).toBe(1);
  expect(b1.height).toBe('100%');
});

test('AC-8: single-point history → opacity 1 (no NaN)', async () => {
  await render(<HistoryChart history={[{ at: 'x', pm25: 5, index: 5 }]} />);
  expect(StyleSheet.flatten(screen.getByTestId('bar-0').props.style).opacity).toBe(1);
});
```
`PollutantTiles.test.tsx`:
```ts
import { render, screen } from '@testing-library/react-native';
import { PollutantTiles } from '../PollutantTiles';

test('AC-9: PM10 + NO₂ labels, values, µg/m³ units', async () => {
  await render(<PollutantTiles pm10={40} no2={22} />);
  expect(screen.getByText('PM10')).toBeTruthy();
  expect(screen.getByText('NO₂')).toBeTruthy();
  expect(screen.getByText('40')).toBeTruthy();
  expect(screen.getByText('22')).toBeTruthy();
  expect(screen.getAllByText('µg/m³')).toHaveLength(2);
});

test('AC-9: missing value → —', async () => {
  await render(<PollutantTiles pm10={40} no2={undefined} />);
  expect(screen.getByText('—')).toBeTruthy();
});
```

## Step 3: Implement
`src/shared/ui/HistoryChart.tsx` — card (`colors.glass` bg, 1px `colors.glassBorder`, radius 22, padding 18/18/14) with:
- header `Text` `OSTATNIE 24 GODZINY` (`colors.text.muted`, fontSize 11, fontWeight '600', letterSpacing 1.4);
- a bars row (`flexDirection:'row'`, `alignItems:'flex-end'`, `gap:3`, `height:76`, marginTop 14) mapping `history` to bars. Bar `i`:
  `<View testID={`bar-${i}`} style={{ flex:1, height:`${barHeightPct(history[i].index)}%`, backgroundColor: scene(history[i].index).key, opacity: historyBarOpacity(i, history.length), borderRadius:3 }} />`;
- axis-label row (`flexDirection:'row'`, `justifyContent:'space-between'`, marginTop 8) of five `Text` (`colors.text.faint`, fontSize 10): `12:00 18:00 00:00 06:00 teraz`.
Keep the render fn ≤40 lines — extract a `Bar` sub-component if needed (its testID/props as above).

`src/shared/ui/PollutantTiles.tsx` — a `flexDirection:'row'`, `gap:12` container of two tiles. A `Tile({ label, value })` helper: `<View style={tile}>` (`colors.glass` bg, 1px `colors.glassBorder`, radius 20, padding 16, `flex:1`) with label `Text` (`colors.text.dim`, 11/600, letterSpacing 1), value `Text` `{value ?? '—'}` (fontSize 30, fontWeight '600', `colors.text.primary`, marginTop 6), unit `Text` `µg/m³` (`colors.text.inactive`, 11). Render `<Tile label="PM10" value={pm10}/>` and `<Tile label="NO₂" value={no2}/>`. (value is a number|undefined → render `value ?? '—'`; convert number to string implicitly via Text child.)

## Step 4: Verify pass + gate
`npx jest HistoryChart PollutantTiles`; `npm run lint` (0 — no raw color); `npm run typecheck`.

## Step 5: Commit
`git add src/shared/tokens/index.ts src/shared/ui/HistoryChart.tsx src/shared/ui/PollutantTiles.tsx src/shared/ui/__tests__/HistoryChart.test.tsx src/shared/ui/__tests__/PollutantTiles.test.tsx && git commit -m "feat(shared): HistoryChart + PollutantTiles + glass tokens (AC-8..9, spec 012)"`

## Report
Write your full report to `.superpowers/sdd/2026-08-13-m-teraz-detail/task-5-report.md` BEFORE your final message. Final message: status, commit SHA, one-line test summary, concerns.

Note: if a git/npm command fails with "Operation not permitted" (sandbox), retry with sandbox disabled.
