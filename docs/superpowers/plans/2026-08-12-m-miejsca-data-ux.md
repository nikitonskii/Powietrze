# M-miejsca Data/Feedback UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Miejsca legible: live index in search results (debounced, capped), `+`→`✓` save feedback, and "brak danych" instead of a bare "—".

**Architecture:** Reuse `PlaceRow` for search results (so each shows a live reading) by turning its `onDelete?` into a general `trailing` slot and adding a `testID`; add a `SaveButton` (+/✓ via `hasFavorite`), a `useDebouncedValue` hook, and a `colors.success` token. `MiejscaScreen` debounces the query and slices to `MAX_VISIBLE_RESULTS` so only the shown rows fetch. No new dependencies.

**Tech Stack:** TypeScript strict, Jest + @testing-library/react-native v14 (has `renderHook`), Reanimated/Skia untouched.

## Global Constraints

- **Layered imports** `app → features → shared → data → core`, one-way. `useDebouncedValue` lives in `src/shared/hooks` (imports React only). `SaveButton`/`PlaceRow` stay in `src/features/miejsca`, consume `src/shared/place` contexts (never import `data`).
- **TypeScript strict**; `any` only with an inline justification.
- **Files ≤ 200 lines, functions ≤ 40 lines.** `MiejscaScreen` stays ≤ 200 after the refactor.
- **Test names cite AC IDs** (`AC 007-1` …); behavior tests, no tautologies. Spec-006 tests that this refactor touches MUST stay green (retargeted, not deleted).
- **Copy (verbatim):** no-data label `brak danych`; save `+`; saved `✓`; empty hint `Wyszukaj i dodaj miejsce`; location row `Twoja lokalizacja` / `najbliższa stacja`.
- **Values:** `MAX_VISIBLE_RESULTS = 8`; debounce `300` ms; `colors.success = '#34c759'`.
- **No new dependencies.** No ADR needed.
- **DoD:** every AC traceable to a test (or manual evidence); `npm run lint`, `npm run typecheck`, `npm test` green; journal updated; no new warnings.
- **testID contract (unchanged from spec 006 + new):** favorites delete = `delete-<city>`; result row = `result-<id>`; save control = `save-<id>` (unsaved) / `saved-<id>` (saved).

---

### Task 1: `useDebouncedValue` hook

**Files:**
- Create: `src/shared/hooks/useDebouncedValue.ts`
- Test: `src/shared/hooks/__tests__/useDebouncedValue.test.ts`

**Interfaces:**
- Produces: `useDebouncedValue<T>(value: T, delayMs: number): T`.

- [ ] **Step 1: Write the failing test** — `src/shared/hooks/__tests__/useDebouncedValue.test.ts`

```ts
import { renderHook, act } from '@testing-library/react-native';
import { useDebouncedValue } from '../useDebouncedValue';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('AC 007-1: immediate initial, updates after delay, resets on change', () => {
  const { result, rerender, unmount } = renderHook(
    ({ v }) => useDebouncedValue(v, 300),
    { initialProps: { v: 'A' } },
  );
  expect(result.current).toBe('A'); // initial → immediate

  rerender({ v: 'B' });
  act(() => jest.advanceTimersByTime(299));
  expect(result.current).toBe('A'); // still old at delay-1
  act(() => jest.advanceTimersByTime(1));
  expect(result.current).toBe('B'); // new at delay

  // reset-on-change: C superseded by D within the window → only D emits, C never seen
  rerender({ v: 'C' });
  act(() => jest.advanceTimersByTime(150));
  rerender({ v: 'D' }); // resets the timer
  act(() => jest.advanceTimersByTime(150)); // 150 since D (<300), 300 since C
  expect(result.current).toBe('B'); // neither C nor D due yet
  act(() => jest.advanceTimersByTime(150)); // now 300 since D
  expect(result.current).toBe('D'); // D emitted; C never observed

  // cleared on unmount: a pending timer must not fire a post-unmount setState
  rerender({ v: 'E' });
  unmount();
  expect(() => act(() => jest.advanceTimersByTime(300))).not.toThrow();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- useDebouncedValue`
Expected: FAIL — cannot resolve `../useDebouncedValue`.

- [ ] **Step 3: Write the implementation** — `src/shared/hooks/useDebouncedValue.ts`

```ts
import { useEffect, useState } from 'react';

// Returns `value`, but only after it has stayed unchanged for `delayMs`. A change
// before the delay elapses resets the timer, so only the latest value is emitted.
// The pending timer is cleared on unmount / dependency change (no leaked setState).
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- useDebouncedValue`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/hooks/useDebouncedValue.ts src/shared/hooks/__tests__/useDebouncedValue.test.ts
git commit -m "feat(shared/hooks): useDebouncedValue (AC 007-1)"
```

---

### Task 2: `PlaceRow` refactor — `trailing` slot, `testID`, "brak danych" tri-state

**Files:**
- Modify: `src/features/miejsca/PlaceRow.tsx`
- Modify: `src/features/miejsca/__tests__/PlaceRow.test.tsx`

**Interfaces:**
- Consumes: `usePlaceReading` (returns `{ status, reading }`), `scene`, tokens.
- Produces: `PlaceRow({ place, title, subtitle, onPress, trailing?, testID? })`. The `onDelete?` prop is **removed** (delete becomes a caller-supplied `trailing`).

- [ ] **Step 1: Rewrite the test** — `src/features/miejsca/__tests__/PlaceRow.test.tsx`

```tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { Text as RNText } from 'react-native';
import { PlaceRow } from '../PlaceRow';
import { PlaceSourceProvider, type SourceForPlace } from '../../../shared/place';
import type { Station } from '../../../core/geo';
import type { Reading } from '../../../core/air';

const w: Station = { id: 530, name: 'Warszawa, Al. Niepodległości', city: 'Warszawa', lat: 0, lon: 0 };
const reading: Reading = { index: 42, pm25: 43, measuredAt: '2026-08-11 21:00:00', city: 'Warszawa', station: 'y' };

const wrap = (
  sfp: SourceForPlace,
  opts: { onPress?: () => void; trailing?: React.ReactNode } = {},
) =>
  render(
    <PlaceSourceProvider sourceForPlace={sfp}>
      <PlaceRow
        place={{ kind: 'station', station: w }}
        title="Warszawa"
        subtitle="Al. Niepodległości"
        onPress={opts.onPress ?? (() => {})}
        trailing={opts.trailing}
        testID="row-530"
      />
    </PlaceSourceProvider>,
  );

test('AC 007-2: resolving source renders the live index + trailing; row press fires onPress', async () => {
  const onPress = jest.fn();
  await wrap(() => ({ getCurrentReading: () => Promise.resolve(reading) }), {
    onPress,
    trailing: <RNText>TRAIL</RNText>,
  });
  await waitFor(() => expect(screen.getByText('42')).toBeTruthy());
  expect(screen.getByText('TRAIL')).toBeTruthy();
  fireEvent.press(screen.getByTestId('row-530'));
  expect(onPress).toHaveBeenCalled();
});

test('AC 007-2: a failed reading shows "brak danych", not "—"', async () => {
  await wrap(() => ({ getCurrentReading: () => Promise.reject(new Error('down')) }));
  await waitFor(() => expect(screen.getByText('brak danych')).toBeTruthy());
  expect(screen.queryByText('—')).toBeNull();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- PlaceRow`
Expected: FAIL — `brak danych` not found / `testID` / `trailing` not supported yet.

- [ ] **Step 3: Refactor** — `src/features/miejsca/PlaceRow.tsx`

```tsx
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ActivePlace } from '../../core/places';
import { scene } from '../../core/scene';
import { usePlaceReading } from '../../shared/place';
import { Text } from '../../shared/ui/Text';
import { colors, spacing } from '../../shared/tokens';

// One live place row: title/subtitle on the left; on the right the live index in the
// scene's key color, or a small dim "brak danych" when the station has no current
// reading. `trailing` is the right-most control (✕ for favorites, +/✓ for results).
export function PlaceRow({
  place,
  title,
  subtitle,
  onPress,
  trailing,
  testID,
}: {
  place: ActivePlace;
  title: string;
  subtitle: string;
  onPress: () => void;
  trailing?: ReactNode;
  testID?: string;
}) {
  const { status, reading } = usePlaceReading(place);
  return (
    <Pressable testID={testID} style={styles.row} onPress={onPress}>
      <View style={styles.left}>
        <Text variant="city" style={styles.title}>{title}</Text>
        <Text variant="station" color={colors.text.dim}>{subtitle}</Text>
      </View>
      {reading ? (
        <Text variant="index" color={scene(reading.index).key} style={styles.index}>
          {String(reading.index)}
        </Text>
      ) : status === 'stale' ? (
        <Text variant="station" color={colors.text.dim}>brak danych</Text>
      ) : null}
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.rowGap,
    paddingVertical: spacing.rowV,
    paddingHorizontal: spacing.cardH,
    backgroundColor: colors.card,
    borderRadius: 22,
  },
  left: { flex: 1 },
  title: { fontSize: 20 },
  index: { fontSize: 44, letterSpacing: 0 },
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- PlaceRow && npm run typecheck`
Expected: PASS (2 tests); tsc will still flag `MiejscaScreen.tsx` (it passes `onDelete`) — that's fixed in Task 4. Run `npm test -- PlaceRow` alone to gate this task.

- [ ] **Step 5: Commit**

```bash
git add src/features/miejsca/PlaceRow.tsx src/features/miejsca/__tests__/PlaceRow.test.tsx
git commit -m "refactor(miejsca): PlaceRow trailing slot + testID + brak-danych tri-state (AC 007-2)"
```
Note: `MiejscaScreen.tsx` still passes `onDelete` → tsc/build red until Task 4 (expected; the plan sequences it).

---

### Task 3: `SaveButton` + `colors.success` token

**Files:**
- Modify: `src/shared/tokens/index.ts` (add `success`)
- Create: `src/features/miejsca/SaveButton.tsx`
- Test: `src/features/miejsca/__tests__/SaveButton.test.tsx`

**Interfaces:**
- Consumes: `hasFavorite` (core/places), `useFavorites` (shared/place), `Station`, tokens.
- Produces: `SaveButton({ station: Station })` — `save-<id>` (`+`) when unsaved, `saved-<id>` (`✓`) when saved.

- [ ] **Step 1: Add the token** — `src/shared/tokens/index.ts`

Inside the `colors` object (next to `accent`):
```ts
  success: '#34c759',
```

- [ ] **Step 2: Write the failing test** — `src/features/miejsca/__tests__/SaveButton.test.tsx`

```tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { SaveButton } from '../SaveButton';
import { FavoritesProvider } from '../../../shared/place';
import type { FavoritesStore } from '../../../core/places';
import type { Station } from '../../../core/geo';

const w: Station = { id: 530, name: 'Warszawa, Al. Niepodległości', city: 'Warszawa', lat: 0, lon: 0 };
function makeStore(initial: Station[] = []): FavoritesStore & { saved: Station[][] } {
  const saved: Station[][] = [];
  return { saved, load: async () => initial, save: async l => { saved.push(l); } };
}
const wrap = (store: FavoritesStore) =>
  render(<FavoritesProvider store={store}><SaveButton station={w} /></FavoritesProvider>);

test('AC 007-3: unsaved shows +, tapping adds and flips to ✓', async () => {
  const store = makeStore([]);
  await wrap(store);
  expect(screen.getByTestId('save-530')).toBeTruthy();
  fireEvent.press(screen.getByTestId('save-530'));
  await waitFor(() => expect(screen.getByTestId('saved-530')).toBeTruthy());
  expect(screen.queryByTestId('save-530')).toBeNull();
  expect(store.saved.map(l => l.map(s => s.id))).toContainEqual([530]);
});

test('AC 007-3: already-saved shows ✓ from the start, no + and no extra save', async () => {
  const store = makeStore([w]);
  await wrap(store);
  await waitFor(() => expect(screen.getByTestId('saved-530')).toBeTruthy());
  expect(screen.queryByTestId('save-530')).toBeNull();
  expect(store.saved).toHaveLength(0); // ✓ is terminal — no press, no save
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- SaveButton`
Expected: FAIL — cannot resolve `../SaveButton`.

- [ ] **Step 4: Write the implementation** — `src/features/miejsca/SaveButton.tsx`

```tsx
import { Pressable } from 'react-native';
import type { Station } from '../../core/geo';
import { hasFavorite } from '../../core/places';
import { useFavorites } from '../../shared/place';
import { Text } from '../../shared/ui/Text';
import { colors } from '../../shared/tokens';

// Search-result save control: "+" (accent) until the station is a favorite, then a
// terminal green "✓". Removal happens from the favorites list (the ✕), per the design.
export function SaveButton({ station }: { station: Station }) {
  const { favorites, add } = useFavorites();
  if (hasFavorite(favorites, station.id)) {
    return (
      <Text testID={`saved-${station.id}`} variant="city" color={colors.success}>
        ✓
      </Text>
    );
  }
  return (
    <Pressable testID={`save-${station.id}`} onPress={() => add(station)} hitSlop={8}>
      <Text variant="city" color={colors.accent}>+</Text>
    </Pressable>
  );
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- SaveButton && npx eslint src/features/miejsca/SaveButton.tsx src/shared/tokens/index.ts`
Expected: PASS (2 tests); lint 0 errors (no hard-coded hex outside tokens — `#34c759` lives in the token file, which is exempt).

- [ ] **Step 6: Commit**

```bash
git add src/shared/tokens/index.ts src/features/miejsca/SaveButton.tsx src/features/miejsca/__tests__/SaveButton.test.tsx
git commit -m "feat(miejsca): SaveButton +→✓ + colors.success token (AC 007-3)"
```

---

### Task 4: `MiejscaScreen` — debounced, capped, live results via `PlaceRow` + `SaveButton`

**Files:**
- Create: `src/features/miejsca/constants.ts`
- Modify: `src/features/miejsca/MiejscaScreen.tsx`
- Modify: `src/features/miejsca/__tests__/MiejscaScreen.test.tsx`

**Interfaces:**
- Consumes: `useDebouncedValue` (Task 1), `PlaceRow` (Task 2, `trailing`/`testID`), `SaveButton` (Task 3), `searchStations`/`LOCATION_PLACE` (core/places), `stationLabel` (core/geo), the shared/place contexts.
- Produces: `MAX_VISIBLE_RESULTS = 8`.

- [ ] **Step 1: Add the constant** — `src/features/miejsca/constants.ts`

```ts
export const MAX_VISIBLE_RESULTS = 8;
```

- [ ] **Step 2: Update the existing test + add AC 007-4** — `src/features/miejsca/__tests__/MiejscaScreen.test.tsx`

First, in the existing `AC 006-9` test, change the one line `fireEvent.press(screen.getByTestId('add-400'));` to `fireEvent.press(screen.getByTestId('save-400'));` (the `+` control is now `SaveButton`, testID `save-<id>`). Leave everything else in that test unchanged. Then append this test:

```tsx
test('AC 007-4: results capped at 8, only shown rows fetch, preview navigates, save works, no-data → brak danych', async () => {
  mockNavigate.mockClear();
  // 12 synthetic stations all matching "testowo"; id 1 has no data (its source rejects).
  const many: Station[] = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1, name: `Testowo ${i + 1}`, city: 'Testowo', lat: 0, lon: 0,
  }));
  const store = makeStore();
  let stationReads = 0;
  const countingSfp: SourceForPlace = place => ({
    getCurrentReading: () => {
      if (place.kind === 'station') {
        stationReads++;
        if (place.station.id === 1) return Promise.reject(new Error('down'));
      }
      return Promise.resolve(anyReading);
    },
  });
  await render(
    <StationsProvider stations={many}>
      <PlaceSourceProvider sourceForPlace={countingSfp}>
        <FavoritesProvider store={store}>
          <ActivePlaceProvider><MiejscaScreen /></ActivePlaceProvider>
        </FavoritesProvider>
      </PlaceSourceProvider>
    </StationsProvider>,
  );
  fireEvent.changeText(screen.getByTestId('search-input'), 'testowo');

  // capped at MAX_VISIBLE_RESULTS: exactly 8 result rows (each has a save control)
  await waitFor(() => expect(screen.getAllByTestId(/^save-/)).toHaveLength(8));
  // cost guard: only the 8 shown rows fetched — not one per match (not 12)
  expect(stationReads).toBe(8);
  // no-data row (id 1 rejected) reads "brak danych"
  expect(screen.getByText('brak danych')).toBeTruthy();
  // preview: pressing a result ROW (not the +) navigates
  fireEvent.press(screen.getByTestId('result-2'));
  expect(mockNavigate).toHaveBeenCalledWith('Teraz');
  // save: pressing + adds and flips to saved
  fireEvent.press(screen.getByTestId('save-3'));
  await waitFor(() => expect(screen.getByTestId('saved-3')).toBeTruthy());
  expect(store.saved.map(l => l.map(s => s.id))).toContainEqual([3]);
});
```
(The `AC 006-8` favorites test and the `AC 006-8` default/hint test are UNCHANGED — they cover AC 007-5's regression: `delete-<city>` and the no-refetch guard still hold after the refactor.)

- [ ] **Step 3: Run to verify the new/updated tests fail**

Run: `npm test -- MiejscaScreen`
Expected: FAIL — `save-400`/`save-3` not found (results still use the old `add-<id>` custom row).

- [ ] **Step 4: Rewrite MiejscaScreen** — `src/features/miejsca/MiejscaScreen.tsx`

```tsx
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { searchStations, LOCATION_PLACE, type ActivePlace } from '../../core/places';
import { stationLabel } from '../../core/geo';
import { colors, spacing } from '../../shared/tokens';
import { Text } from '../../shared/ui/Text';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { useActivePlace, useFavorites, useStations } from '../../shared/place';
import { PlaceRow } from './PlaceRow';
import { SaveButton } from './SaveButton';
import { SearchField } from './SearchField';
import { MAX_VISIBLE_RESULTS } from './constants';

export function MiejscaScreen() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const stations = useStations();
  const { favorites, remove } = useFavorites();
  const { setActive } = useActivePlace();
  const navigation = useNavigation<{ navigate: (n: string) => void }>();
  const results = useMemo(
    () => searchStations(stations, debouncedQuery).slice(0, MAX_VISIBLE_RESULTS),
    [stations, debouncedQuery],
  );

  const open = (place: ActivePlace) => {
    setActive(place);
    navigation.navigate('Teraz');
  };

  return (
    <ScrollView
      testID="screen-miejsca"
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text variant="city" style={styles.header}>Miejsca</Text>
      <SearchField value={query} onChangeText={setQuery} />

      {query.trim() ? (
        <ScrollView contentContainerStyle={styles.list}>
          {results.map(s => (
            <PlaceRow
              key={s.id}
              testID={`result-${s.id}`}
              place={{ kind: 'station', station: s }}
              title={s.city}
              subtitle={stationLabel(s)}
              onPress={() => open({ kind: 'station', station: s })}
              trailing={<SaveButton station={s} />}
            />
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <PlaceRow
            place={LOCATION_PLACE}
            title="Twoja lokalizacja"
            subtitle="najbliższa stacja"
            onPress={() => open(LOCATION_PLACE)}
          />
          {favorites.length === 0 ? (
            <Text variant="station" color={colors.text.dim} style={styles.hint}>
              Wyszukaj i dodaj miejsce
            </Text>
          ) : (
            favorites.map(s => (
              <PlaceRow
                key={s.id}
                place={{ kind: 'station', station: s }}
                title={s.city}
                subtitle={stationLabel(s)}
                onPress={() => open({ kind: 'station', station: s })}
                trailing={
                  <Pressable
                    testID={`delete-${s.city}`}
                    onPress={() => remove(s.id)}
                    hitSlop={8}
                  >
                    <Text variant="label" color={colors.text.dim}>✕</Text>
                  </Pressable>
                }
              />
            ))
          )}
        </ScrollView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.base },
  content: { paddingTop: spacing.screenTop, paddingBottom: spacing.screenBottom },
  header: { paddingHorizontal: spacing.screenH, marginBottom: spacing.rowGap },
  list: { paddingHorizontal: spacing.screenH, gap: spacing.rowGap },
  hint: { paddingVertical: spacing.rowV, textAlign: 'center' },
});
```
Note: nested `ScrollView` for the list is fine here (short lists); keep the outer one for the header/search. If the nested `ScrollView` warns about nesting same-orientation scrollers in the sim, switch the inner to a `View` — the lists are short (≤8 results, a handful of favorites). Prefer `View` for the inner containers to avoid the warning:
replace the two inner `<ScrollView contentContainerStyle={styles.list}>…</ScrollView>` with `<View style={styles.list}>…</View>` and `import { View }` from react-native. (Do this — it keeps the console clean per DoD.)

- [ ] **Step 5: Run the full miejsca gate**

Run: `npm test -- src/features/miejsca && npm run typecheck`
Expected: PASS — `PlaceRow`, `SaveButton`, and `MiejscaScreen` (AC 006-8 ×2 unchanged, AC 006-9 updated, AC 007-4 new) all green; tsc clean (the `onDelete` reference is gone).

- [ ] **Step 6: Commit**

```bash
git add src/features/miejsca/constants.ts src/features/miejsca/MiejscaScreen.tsx src/features/miejsca/__tests__/MiejscaScreen.test.tsx
git commit -m "feat(miejsca): live+debounced+capped search results via PlaceRow/SaveButton (AC 007-4/5)"
```

---

### Task 5: Manual simulator verification (AC 007-6) + journal 07

**Files:**
- Create: `docs/harness/07-miejsca-data-ux.md`, `docs/harness/evidence/07/*.png`

No native rebuild needed (JS-only change) — reload the JS on the existing sim build.

- [ ] **Step 1: Full gate + reload**

Run: `npm run lint && npm run typecheck && npm test` (all green), then reload JS on the simulator (Metro `r`, or relaunch the app).

- [ ] **Step 2: Exercise + screenshot**

- Search "Warsz" → results show **live indices**, data-less stations (Al. Niepodległości, Kondratowicza) read **"brak danych"** → `xcrun simctl io booted screenshot /tmp/claude/m7-search.png`
- Tap `+` on a station **with** data (e.g. Wokalna / Grochowska) → it flips to **✓** and **stays on Miejsca** (the `+` must NOT navigate) → `…/m7-saved.png`
- The saved station now appears in the favorites list with its **live value** → `…/m7-favorite.png`
- Confirm the ✕ removes a favorite without triggering the row preview.

- [ ] **Step 3: Store evidence + write the journal**

```bash
mkdir -p docs/harness/evidence/07
# sips -Z 500 each /tmp/claude/m7-*.png into docs/harness/evidence/07/
```
Write `docs/harness/07-miejsca-data-ux.md` (what changed, the critic's pre-build findings, the deferred gestures → spec 008, retro placeholder), citing the screenshots as AC 007-6 evidence.

- [ ] **Step 4: Commit**

```bash
git add docs/harness/07-miejsca-data-ux.md docs/harness/evidence/07
git commit -m "docs(harness): journal 07 miejsca data-ux + AC 007-6 evidence"
```

---

## Self-Review

**1. Spec coverage:** AC 007-1 → T1; AC 007-2 → T2; AC 007-3 → T3; AC 007-4 + AC 007-5 (spec-006 favorites regression, tests unchanged) → T4; AC 007-6 (manual) → T5. `useDebouncedValue`/`SaveButton`/`colors.success`/`MAX_VISIBLE_RESULTS`/`PlaceRow` refactor all mapped. The `onDelete→trailing` blast radius (PlaceRow + PlaceRow.test + MiejscaScreen + MiejscaScreen.test) is fully owned across T2/T4.

**2. Placeholder scan:** Every code step carries real code; every test step real assertions. The one prose caveat (inner `View` vs `ScrollView`) resolves to a concrete instruction ("use `View`").

**3. Type consistency:** `PlaceRow({place,title,subtitle,onPress,trailing?,testID?})` identical in T2 (def) and T4 (use). `SaveButton({station})` T3→T4. `useDebouncedValue<T>(value,delayMs)` T1→T4. `MAX_VISIBLE_RESULTS` T4. testIDs consistent: `result-<id>`/`save-<id>`/`saved-<id>`/`delete-<city>` across MiejscaScreen and its test. `usePlaceReading` returns `{status,reading}` (spec-006) — consumed in T2. `hasFavorite`/`useFavorites` (spec-006) — consumed in T3.
