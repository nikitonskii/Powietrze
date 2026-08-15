# Task 6 — Teraz composition (scrollable + chart + tiles)

Worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`, branch `feature/m-teraz-detail`.

## Global Constraints
- TS strict; no `any`. Files ≤200, funcs ≤40. Test names cite AC IDs. No-hex on features. No new dependency.

## Consumes
`useActivePlace()` (now exposes `detail?`), `HistoryChart`, `PollutantTiles` (`../../shared/ui/...`), `GradientBackground`, `Atmosphere`, `Hero`, `spacing` tokens.

## Current TerazScreen.tsx (read it) returns:
```tsx
<GradientBackground scene={s}>
  <Atmosphere scene={s} />
  <View style={styles.content}><Hero scene={s} place={place} pm25={reading.pm25} eyebrow={eyebrow} /></View>
</GradientBackground>
```
`styles.content = { flex:1, paddingTop: spacing.screenTop, paddingHorizontal: spacing.screenH, paddingBottom: spacing.screenBottom, justifyContent:'center' }`. `gradient-background` testID + `teraz-loading` branch (no reading) must be preserved. Existing tests query `within(gradient-background).getByText('118'|'Zły'|'Kraków'|…)`.

## Files
- Modify: `src/features/teraz/TerazScreen.tsx`
- Test: extend `src/features/teraz/__tests__/TerazScreen.test.tsx`

## Step 1: Write the failing tests (append; the existing two must keep passing)
The existing harness uses `fakeAirSource()` which has NO `getDetail` → detail undefined → chart/tiles absent, so the existing tests are unaffected. For AC-10 add a source WITH getDetail:
```ts
import type { ReadingDetail } from '../../../core/air';

const detail: ReadingDetail = {
  history: [ { at: 'a', pm25: 10, index: 10 }, { at: 'b', pm25: 20, index: 20 } ],
  pm10: 40, no2: 22,
};
const detailedSource = (): AirQualitySource => ({
  ...fakeAirSource(),
  getDetail: async () => detail,
});

test('AC-10: with detail → chart + tiles render below the hero', async () => {
  await wrap(detailedSource);
  const g = await screen.findByTestId('gradient-background');
  expect(within(g).getByText('118')).toBeTruthy();        // hero still there
  expect(await within(g).findByText('OSTATNIE 24 GODZINY')).toBeTruthy(); // chart
  expect(within(g).getByText('PM10')).toBeTruthy();        // tiles
  expect(within(g).getByText('NO₂')).toBeTruthy();
});

test('AC-10: without detail (getCurrentReading only) → hero, no chart/tiles', async () => {
  await wrap(() => fakeAirSource());
  await screen.findByText('118');
  expect(screen.queryByText('OSTATNIE 24 GODZINY')).toBeNull();
});
```
(`fakeAirSource` may need a settle tick for detail — use `findByText` for the chart header as shown.)

## Step 2: Run to verify fail
`npx jest TerazScreen` → the new "with detail" test FAILS (no chart yet); the two existing tests still pass.

## Step 3: Implement (`TerazScreen.tsx`)
- Read detail: `const { active, reading, detail } = useActivePlace();`
- Keep the `if (!reading) return <View testID="teraz-loading" …/>` branch.
- Replace the content `View` with a `ScrollView` over the atmosphere:
```tsx
<GradientBackground scene={s}>
  <Atmosphere scene={s} />
  <ScrollView contentContainerStyle={styles.content}>
    <Hero scene={s} place={place} pm25={reading.pm25} eyebrow={eyebrow} />
    {detail && (
      <>
        <HistoryChart history={detail.history} />
        <PollutantTiles pm10={detail.pm10} no2={detail.no2} />
      </>
    )}
  </ScrollView>
</GradientBackground>
```
- `styles.content`: keep `paddingTop: spacing.screenTop, paddingHorizontal: spacing.screenH, paddingBottom: spacing.screenBottom`; use `flexGrow: 1` (NOT `flex:1`) so the ScrollView content still fills/centered-enough when short but can grow+scroll when the chart/tiles are present. Drop `justifyContent:'center'` OR keep it — pick what renders the hero reasonably (top-aligned per the mock is fine); the design scrolls content with the hero near the top. Add `marginTop: 8` to the chart and the tiles get their own spacing (PollutantTiles container marginTop 12 — add via a wrapping style or a `style` prop; simplest: wrap chart+tiles each in a small spacer or give them marginTop via a container). Keep the file ≤200 / funcs ≤40.
- Ensure `gradient-background` testID stays on GradientBackground (it's already there) so the existing `within(gradient)` queries work.

## Step 4: Verify pass + gate
`npx jest TerazScreen` (all incl. the 2 existing pass). Full `npm test`. `npm run lint`. `npm run typecheck`.

## Step 5: Commit
`git add src/features/teraz/TerazScreen.tsx src/features/teraz/__tests__/TerazScreen.test.tsx && git commit -m "feat(teraz): scrollable Teraz with 24h chart + pollutant tiles (AC-10, spec 012)"`

## Report
Write your full report to `.superpowers/sdd/2026-08-13-m-teraz-detail/task-6-report.md` BEFORE your final message; confirm the two existing Teraz tests still pass. Note any layout deviation (centering vs top-align). Final message: status, commit SHA, one-line test summary, concerns.

Note: if a git/npm command fails with "Operation not permitted" (sandbox), retry with sandbox disabled.
