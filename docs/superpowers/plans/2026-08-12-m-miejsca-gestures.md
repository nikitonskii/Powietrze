# M-miejsca Gestures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swipe-to-delete and long-press drag-reorder for favorites on Miejsca, persisted.

**Architecture:** Pure `moveItem` + a persisted `FavoritesProvider.reorder`; `react-native-gesture-handler` (ADR-012) at the app root; a `FavoriteRow` wrapping `PlaceRow` in `ReanimatedSwipeable` (delete), and a `DraggableFavorites` list with a custom long-press→Pan reorder built on the existing Reanimated 4.

**Tech Stack:** TypeScript strict, Jest + @testing-library/react-native v14, react-native-gesture-handler@^3.1.0 (new), react-native-reanimated 4.5.3.

## Global Constraints

- **Layered imports** `app → features → shared → data → core`, one-way. `moveItem` is pure in `core/places`. `FavoriteRow`/`DraggableFavorites` live in `src/features/miejsca`, consume `shared/place`, never `data`. RNGH is used only in `features` + the app root.
- **TypeScript strict**; `any` only with an inline justification.
- **Files ≤ 200 lines, functions ≤ 40 lines.** Split a `useReorderGesture` hook out of `DraggableFavorites` if it grows.
- **Test names cite AC IDs** (`AC 008-1` …); behavior tests, no tautologies. Spec-006/007 favorites tests must stay green (AC 008-4).
- **Copy (verbatim):** delete action label `Usuń`; delete testID `delete-<city>` (unchanged); location row `Twoja lokalizacja` / `najbliższa stacja`; empty hint `Wyszukaj i dodaj miejsce`.
- **New dep `react-native-gesture-handler@^3.1.0` → ADR-012** (DoD gate). v3 is New-Architecture-only (matches RN 0.86). RNGH 3.1.0 is **ESM-only** → it MUST be added to `jest.config.js` `transformIgnorePatterns`, and `jest.setup.js` must `import 'react-native-gesture-handler/jestSetup'` at the top. `GestureHandlerRootView` must have `style={{ flex: 1 }}`. No babel plugin needed (worklets plugin stays last).
- **`onReorder(from, to)`** argument order matches `moveItem(list, from, to)` exactly.
- **`DraggableFavorites` keys rows by `station.id`** (never index) — index keys remount rows and break the spec-007 no-refetch guard (AC 008-4).
- **DoD:** every AC traceable to a test (or manual evidence); `npm run lint`, `npm run typecheck`, `npm test` green; ADR + journal updated; no new warnings.

---

### Task 1: `moveItem` (pure array move)

**Files:**
- Modify: `src/core/places/index.ts` (add `moveItem`)
- Modify: `src/core/places/__tests__/places.test.ts` (add AC 008-1)

**Interfaces:**
- Produces: `moveItem<T>(list: T[], from: number, to: number): T[]` — same ref on no-op / out-of-bounds.

- [ ] **Step 1: Write the failing test** — append to `src/core/places/__tests__/places.test.ts`

```ts
import { moveItem } from '../index'; // add to the existing import line

test('AC 008-1: moveItem moves an item and is a no-op (same ref) on no-op/OOB', () => {
  expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  expect(moveItem(['a', 'b', 'c'], 1, 2)).toEqual(['a', 'c', 'b']);
  const l = ['a', 'b', 'c'];
  expect(moveItem(l, 1, 1)).toBe(l); // no-op → same reference
  expect(moveItem(l, -1, 0)).toBe(l); // OOB from<0
  expect(moveItem(l, 3, 0)).toBe(l); // OOB from>=length
  expect(moveItem(l, 0, -1)).toBe(l); // OOB to<0
  expect(moveItem(l, 0, 3)).toBe(l); // OOB to>=length
});
```
(Add `moveItem` to the existing `import { … } from '../index';` at the top of the file.)

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/core/places`
Expected: FAIL — `moveItem` not exported.

- [ ] **Step 3: Implement** — add to `src/core/places/index.ts`

```ts
// Moves list[from] to index `to`. Returns the SAME reference on a no-op (from === to)
// or any out-of-bounds index, so callers can skip a redundant persist.
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= list.length ||
    to >= list.length
  ) {
    return list;
  }
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
```

- [ ] **Step 4: Run to verify it passes (with coverage — core is 100%-gated)**

Run: `npm test -- src/core/places && npx jest src/core --coverage --collectCoverageFrom='src/core/places/index.ts' 2>&1 | tail -8`
Expected: PASS; `src/core/places/index.ts` 100% branches (all OOB sub-conditions pinned).

- [ ] **Step 5: Commit**

```bash
git add src/core/places/index.ts src/core/places/__tests__/places.test.ts
git commit -m "feat(core/places): moveItem pure array move (AC 008-1)"
```

---

### Task 2: `FavoritesProvider.reorder`

**Files:**
- Modify: `src/shared/place/FavoritesContext.tsx`
- Modify: `src/shared/place/__tests__/FavoritesContext.test.tsx` (add AC 008-2)

**Interfaces:**
- Consumes: `moveItem` (Task 1).
- Produces: `useFavorites()` now returns `{ favorites, add, remove, reorder }` where `reorder(from: number, to: number): void`.

- [ ] **Step 1: Write the failing test** — append to `src/shared/place/__tests__/FavoritesContext.test.tsx`

The existing file has a `Probe` using `useFavorites()` and a `makeStore`. Add a reorder-capable probe + test:

```tsx
import type { Station } from '../../../core/geo';
// existing k plus two more:
const w2: Station = { id: 530, name: 'Warszawa, Al. Niepodległości', city: 'Warszawa', lat: 0, lon: 0 };
const g2: Station = { id: 706, name: 'Gdańsk, ul. Powstańców Wielkopolskich', city: 'Gdańsk', lat: 0, lon: 0 };

function ReorderProbe() {
  const { favorites, reorder } = useFavorites();
  return (
    <>
      <Text>{favorites.map(f => f.id).join(',') || 'empty'}</Text>
      <Pressable testID="move-0-2" onPress={() => reorder(0, 2)}><Text>m02</Text></Pressable>
      <Pressable testID="noop" onPress={() => reorder(1, 1)}><Text>noop</Text></Pressable>
    </>
  );
}

test('AC 008-2: reorder moves + persists; no-op does not persist', async () => {
  const store = makeStore([k, w2, g2]); // k=400 (already imported in the file)
  render(<FavoritesProvider store={store}><ReorderProbe /></FavoritesProvider>);
  await waitFor(() => expect(screen.getByText('400,530,706')).toBeTruthy());

  fireEvent.press(screen.getByTestId('move-0-2'));
  await waitFor(() => expect(screen.getByText('530,706,400')).toBeTruthy());
  expect(store.saved.at(-1)!.map(s => s.id)).toEqual([530, 706, 400]);

  const savesAfterMove = store.saved.length;
  fireEvent.press(screen.getByTestId('noop')); // reorder(1,1) → no change, no save
  await waitFor(() => expect(screen.getByText('530,706,400')).toBeTruthy());
  expect(store.saved).toHaveLength(savesAfterMove);
});
```
(Reuse the file's existing `k`, `makeStore`, `Text`/`Pressable` imports; add `w2`/`g2` if not present. If `makeStore` doesn't accept an initial list, extend it to `makeStore(initial: Station[] = [])`.)

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- FavoritesContext`
Expected: FAIL — `reorder` is not on the context value.

- [ ] **Step 3: Implement** — `src/shared/place/FavoritesContext.tsx`

Add `moveItem` to the `core/places` import; extend the type and value:
```ts
import {
  addFavorite,
  moveItem,
  removeFavorite,
  type FavoritesStore,
} from '../../core/places';

type FavoritesValue = {
  favorites: Station[];
  add: (s: Station) => void;
  remove: (id: number) => void;
  reorder: (from: number, to: number) => void;
};
```
Add the `reorder` field to the `useMemo` value (after `remove`), and include it in the deps (unchanged — deps are `[favorites, store]`):
```ts
      reorder: (from, to) =>
        setFavorites(prev => {
          const next = moveItem(prev, from, to);
          if (next !== prev) store.save(next); // same ref on no-op → no save
          return next;
        }),
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/shared/place && npm run typecheck`
Expected: PASS (reorder test + the existing FavoritesContext/ActivePlace/usePlaceReading suites); tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/shared/place/FavoritesContext.tsx src/shared/place/__tests__/FavoritesContext.test.tsx
git commit -m "feat(shared/place): FavoritesProvider.reorder + persist (AC 008-2)"
```

---

### Task 3: `react-native-gesture-handler` dep + ADR-012 + root + jest config

**Files:**
- Create: `docs/decisions/012-gesture-handler.md`
- Modify: `package.json` (dep), `ios/Podfile.lock` (`pod install`), `jest.config.js`, `jest.setup.js`, `App.tsx`

**Interfaces:**
- Produces: `GestureHandlerRootView` at the app root; RNGH importable in tests.

- [ ] **Step 1: Author ADR-012** — `docs/decisions/012-gesture-handler.md`

```markdown
# ADR-012: Gestures via react-native-gesture-handler

**Status:** accepted · **Date:** 2026-08-12 · **Milestone:** M-miejsca-polish B

## Context
Miejsca needs swipe-to-delete and long-press drag-reorder on favorites. Bare RN 0.86,
New Architecture, react-native-reanimated 4.5.3 already present.

## Decision
Use `react-native-gesture-handler@^3.1.0` — swipe via its `ReanimatedSwipeable`, reorder
via a custom Reanimated long-press→Pan gesture composed with it.

## Alternatives considered
- **react-native-draggable-flatlist** — a ready reorder list, but uncertain
  Reanimated-4 / New-Arch support on RN 0.86; another dep. Rejected (build reorder custom).
- **PanResponder (RN core)** — no native-thread gestures, no Swipeable; worse feel.
- **react-native-gesture-handler** — the community standard; v3 is New-Architecture-only
  (matches RN 0.86); provides `ReanimatedSwipeable`. Chosen.

## Consequences
- One pod. `GestureHandlerRootView style={{flex:1}}` at the app root.
- RNGH 3.1.0 is ESM-only → Jest needs it in `transformIgnorePatterns` + the RNGH jestSetup.
- No babel plugin required.
```

- [ ] **Step 2: Install + pod**

```bash
npm install react-native-gesture-handler@^3.1.0
cd ios && pod install && cd ..
```

- [ ] **Step 3: Wire jest** — `jest.config.js` and `jest.setup.js`

In `jest.config.js`, add `react-native-gesture-handler` to the `transformIgnorePatterns` allowlist regex (append `|react-native-gesture-handler` inside the `(?!(…)/)` group):
```js
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|react-native-linear-gradient|@react-navigation|react-native-screens|react-native-safe-area-context|@shopify/react-native-skia|react-native-reanimated|react-native-worklets|react-native-gesture-handler)/)',
  ],
```
At the very TOP of `jest.setup.js` (before the other mocks):
```js
import 'react-native-gesture-handler/jestSetup';
```

- [ ] **Step 4: Wrap the app root** — `App.tsx`

Add the import and wrap the outermost element:
```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// …
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StationsProvider stations={stations}>
        {/* …unchanged provider tree… */}
      </StationsProvider>
    </GestureHandlerRootView>
  );
```

- [ ] **Step 5: Verify nothing broke (no RNGH consumer yet)**

Run: `npm test && npm run typecheck && npm run lint`
Expected: all green — the jest config/ setup changes and the root wrapper must not break the existing 30 suites. (RNGH isn't imported by any component yet; this task only proves the toolchain + root are wired.)

- [ ] **Step 6: Commit**

```bash
git add docs/decisions/012-gesture-handler.md package.json package-lock.json ios/Podfile.lock jest.config.js jest.setup.js App.tsx
git commit -m "feat(app): react-native-gesture-handler + GestureHandlerRootView + ADR-012"
```

---

### Task 4: `FavoriteRow` — swipe-to-delete

**Files:**
- Create: `src/features/miejsca/FavoriteRow.tsx`
- Test: `src/features/miejsca/__tests__/FavoriteRow.test.tsx`

**Interfaces:**
- Consumes: `PlaceRow` (spec 007, `trailing?`/`testID?`), `ReanimatedSwipeable` (RNGH), `Station`, tokens.
- Produces: `FavoriteRow({ station, onOpen, onDelete })` — a `PlaceRow` for the station whose left-swipe reveals a red `Usuń` action (`testID="delete-<city>"`) calling `onDelete`.

- [ ] **Step 1: Write the failing test** — `src/features/miejsca/__tests__/FavoriteRow.test.tsx`

```tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { FavoriteRow } from '../FavoriteRow';
import { PlaceSourceProvider, type SourceForPlace } from '../../../shared/place';
import type { Station } from '../../../core/geo';
import type { Reading } from '../../../core/air';

const w: Station = { id: 530, name: 'Warszawa, Al. Niepodległości', city: 'Warszawa', lat: 0, lon: 0 };
const reading: Reading = { index: 42, pm25: 43, measuredAt: '2026-08-11 21:00:00', city: 'Warszawa', station: 'y' };
const sfp: SourceForPlace = () => ({ getCurrentReading: () => Promise.resolve(reading) });

test('AC 008-3: renders the row + a Usuń delete action that calls onDelete', async () => {
  const onOpen = jest.fn();
  const onDelete = jest.fn();
  render(
    <PlaceSourceProvider sourceForPlace={sfp}>
      <FavoriteRow station={w} onOpen={onOpen} onDelete={onDelete} />
    </PlaceSourceProvider>,
  );
  expect(await screen.findByText('Warszawa')).toBeTruthy();
  // The swipe action is rendered in the tree (off-screen); pressing it deletes.
  const del = screen.getByTestId('delete-Warszawa');
  fireEvent.press(del);
  expect(onDelete).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- FavoriteRow`
Expected: FAIL — cannot resolve `../FavoriteRow`.

- [ ] **Step 3: Implement** — `src/features/miejsca/FavoriteRow.tsx`

```tsx
import { Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { Station } from '../../core/geo';
import { stationLabel } from '../../core/geo';
import { Text } from '../../shared/ui/Text';
import { colors, spacing } from '../../shared/tokens';
import { PlaceRow } from './PlaceRow';

// A favorite row with swipe-left-to-delete. The revealed "Usuń" action keeps the
// delete-<city> testID (same delete contract as before; the swipe motion is new).
export function FavoriteRow({
  station,
  onOpen,
  onDelete,
}: {
  station: Station;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const renderRightActions = () => (
    <View style={styles.actions}>
      <Pressable
        testID={`delete-${station.city}`}
        style={styles.delete}
        onPress={onDelete}
      >
        <Text variant="label" color={colors.text.primary}>Usuń</Text>
      </Pressable>
    </View>
  );
  return (
    <ReanimatedSwipeable
      renderRightActions={renderRightActions}
      friction={2}
      rightThreshold={40}
    >
      <PlaceRow
        place={{ kind: 'station', station }}
        title={station.city}
        subtitle={stationLabel(station)}
        onPress={onOpen}
        testID={`fav-${station.id}`}
      />
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  actions: { justifyContent: 'center' },
  delete: {
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    height: '100%',
    borderRadius: 22,
  },
});
```
Note: add `colors.danger = '#ff453a'` to `src/shared/tokens/index.ts` (iOS system red; no hard-coded hex in features). Add it next to `success`.

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- FavoriteRow`
Expected: PASS. **If `delete-Warszawa` is not found**, the RNGH jest mock isn't rendering `renderRightActions` — fallback: render the actions unconditionally alongside the swipeable (e.g. wrap `ReanimatedSwipeable` + an absolutely-positioned actions layer) so the delete stays queryable, OR (simpler) in the test, drive the reveal via the swipeable ref's `openRight()` in an `act`. Report which was needed.

- [ ] **Step 5: Commit**

```bash
git add src/features/miejsca/FavoriteRow.tsx src/features/miejsca/__tests__/FavoriteRow.test.tsx src/shared/tokens/index.ts
git commit -m "feat(miejsca): FavoriteRow swipe-to-delete via ReanimatedSwipeable (AC 008-3)"
```

---

### Task 5: `DraggableFavorites` + MiejscaScreen wiring

**Files:**
- Create: `src/features/miejsca/DraggableFavorites.tsx`
- Modify: `src/features/miejsca/MiejscaScreen.tsx`
- Modify: `src/features/miejsca/__tests__/MiejscaScreen.test.tsx` (regression — AC 008-4)

**Interfaces:**
- Consumes: `FavoriteRow` (Task 4), `reorder`/`useFavorites` (Task 2), `moveItem` semantics, Reanimated + gesture-handler.
- Produces: `DraggableFavorites({ favorites, onOpen, onDelete, onReorder })`.

- [ ] **Step 1: Update the MiejscaScreen regression test** — `src/features/miejsca/__tests__/MiejscaScreen.test.tsx`

The `AC 006-8: favorites render live…` test presses `delete-Warszawa`/`delete-Gdańsk` and asserts the no-refetch guard. These testIDs now come from `FavoriteRow`'s swipe action (same IDs). No change needed IF the action renders in the tree (verified in Task 4). Add nothing new unless Task 4 reported a fallback; keep the existing favorites tests as the AC 008-4 regression. Confirm they still pass in Step 4.

- [ ] **Step 2: Implement `DraggableFavorites`** — `src/features/miejsca/DraggableFavorites.tsx`

MVP reorder: long-press lifts a row (scale + raised zIndex), a vertical Pan moves it, on release it computes the target index from net translation and calls `onReorder`; the data re-render lands the new order. Rows are keyed by `station.id`.

```tsx
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import type { Station } from '../../core/geo';
import { spacing } from '../../shared/tokens';
import { FavoriteRow } from './FavoriteRow';

const ROW_H = 74; // row height + list gap; used to convert drag distance → index delta

export function DraggableFavorites({
  favorites,
  onOpen,
  onDelete,
  onReorder,
}: {
  favorites: Station[];
  onOpen: (s: Station) => void;
  onDelete: (id: number) => void;
  onReorder: (from: number, to: number) => void;
}) {
  return (
    <View style={styles.list}>
      {favorites.map((s, index) => (
        <DraggableRow
          key={s.id}
          station={s}
          index={index}
          count={favorites.length}
          onOpen={() => onOpen(s)}
          onDelete={() => onDelete(s.id)}
          onReorder={onReorder}
        />
      ))}
    </View>
  );
}

function DraggableRow({
  station,
  index,
  count,
  onOpen,
  onDelete,
  onReorder,
}: {
  station: Station;
  index: number;
  count: number;
  onOpen: () => void;
  onDelete: () => void;
  onReorder: (from: number, to: number) => void;
}) {
  const ty = useSharedValue(0);
  const active = useSharedValue(false);
  const [dragging, setDragging] = useState(false);

  // Long-press then vertical pan (activeOffsetY) reorders; horizontal is left to the
  // row's own ReanimatedSwipeable (activeOffsetX), so the two don't fight.
  const drag = Gesture.Pan()
    .activateAfterLongPress(250)
    .activeOffsetY([-10, 10])
    .onStart(() => {
      active.value = true;
      runOnJS(setDragging)(true);
    })
    .onUpdate(e => {
      ty.value = e.translationY;
    })
    .onEnd(() => {
      const delta = Math.round(ty.value / ROW_H);
      const to = Math.max(0, Math.min(count - 1, index + delta));
      if (to !== index) runOnJS(onReorder)(index, to);
      ty.value = 0;
      active.value = false;
      runOnJS(setDragging)(false);
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }, { scale: active.value ? 1.03 : 1 }],
    zIndex: active.value ? 10 : 0,
  }));

  return (
    <GestureDetector gesture={drag}>
      <Animated.View style={[rowStyle, dragging && styles.lifted]}>
        <FavoriteRow station={station} onOpen={onOpen} onDelete={onDelete} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.rowGap },
  lifted: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
```
Notes: `ROW_H` is an approximation — the manual AC (008-5) is where the drag feel + threshold get tuned; the reorder *correctness* (data + persist) is covered by AC 008-2/008-4. If `DraggableFavorites` exceeds 200 lines, extract `DraggableRow`'s gesture into a `useReorderGesture(index, count, onReorder)` hook. `shadowColor:'#000'` in a non-scene shadow is allowed by the no-hex rule (it targets `#[0-9a-fA-F]{3,8}` color literals in JSX text props — verify lint; if it flags, move to a `colors.shadow` token).

- [ ] **Step 3: Wire MiejscaScreen** — replace the favorites `favorites.map(...)` block with `DraggableFavorites`

In `src/features/miejsca/MiejscaScreen.tsx`: pull `reorder` from `useFavorites()`, and in the non-search branch replace the inline `favorites.map(...)` (the block rendering `PlaceRow` with the ✕ `trailing`) with:
```tsx
          ) : (
            <DraggableFavorites
              favorites={favorites}
              onOpen={s => open({ kind: 'station', station: s })}
              onDelete={remove}
              onReorder={reorder}
            />
          )}
```
Add `import { DraggableFavorites } from './DraggableFavorites';`, add `reorder` to the `useFavorites()` destructure, and remove the now-unused inline `Pressable` delete + `PlaceRow` favorite import usage if it leaves `Pressable` unused (keep imports that are still used). The location `PlaceRow` and empty hint stay as-is.

- [ ] **Step 4: Run the full miejsca gate + regression**

Run: `npm test -- src/features/miejsca && npm run typecheck && npm run lint`
Expected: PASS — `FavoriteRow`, `PlaceRow`, `SaveButton`, and `MiejscaScreen` (incl. the AC 006-8 favorites regression pressing `delete-Warszawa`/`delete-Gdańsk` and the `calls.s530 === 1` no-refetch guard) all green; tsc + lint clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/miejsca/DraggableFavorites.tsx src/features/miejsca/MiejscaScreen.tsx src/features/miejsca/__tests__/MiejscaScreen.test.tsx
git commit -m "feat(miejsca): DraggableFavorites long-press reorder + wire MiejscaScreen (AC 008-4)"
```

---

### Task 6: Manual simulator verification (AC 008-5) + journal 08

**Files:**
- Create: `docs/harness/08-miejsca-gestures.md`, `docs/harness/evidence/08/*.png`

Native rebuild required (new RNGH pod).

- [ ] **Step 1: Native rebuild + boot**

Run: `npx react-native run-ios --simulator "iPhone 16 Pro"`. Confirm the app boots (not blank — proves `GestureHandlerRootView style={{flex:1}}` + RNGH native link are correct).

- [ ] **Step 2: Exercise + capture (add a couple of favorites first via search)**

- Swipe a favorite left → **Usuń** → it's removed → `/tmp/claude/m8-swipe.png`
- Long-press a favorite → it lifts → drag over another → drop → order changes → `/tmp/claude/m8-reorder.png`
- Kill & relaunch → the new order persists → `/tmp/claude/m8-persist.png`
- Confirm the pinned "Twoja lokalizacja" row can't be swiped or dragged.

- [ ] **Step 3: Store evidence + write the journal**

```bash
mkdir -p docs/harness/evidence/08
# sips -Z 500 each /tmp/claude/m8-*.png into docs/harness/evidence/08/
```
Write `docs/harness/08-miejsca-gestures.md` (what changed, ADR-012, the critic's pre-build findings incl. the ESM/jest and id-keying catches, drag-feel tuning notes, retro placeholder), citing the screenshots as AC 008-5 evidence.

- [ ] **Step 4: Commit**

```bash
git add docs/harness/08-miejsca-gestures.md docs/harness/evidence/08
git commit -m "docs(harness): journal 08 miejsca gestures + AC 008-5 evidence"
```

---

## Self-Review

**1. Spec coverage:** AC 008-1 → T1; AC 008-2 → T2; RNGH dep/ADR-012/root/jest-config (incl. transformIgnorePatterns + jestSetup + flex:1) → T3; AC 008-3 → T4; AC 008-4 (regression via preserved favorites tests + id-keyed rows) → T5; AC 008-5 (manual) → T6. `moveItem` same-ref-on-OOB (both operands) → T1. `onReorder(from,to)` order = `moveItem` order → T5 wiring. Version pin `^3.1.0` → T3/ADR.

**2. Placeholder scan:** Every code step has real code; every test step real assertions. The two flagged uncertainties (RNGH-jest rendering of the swipe action in T4; `ROW_H`/drag-feel in T5) carry concrete fallbacks + the manual-AC tuning path, not TODOs.

**3. Type consistency:** `moveItem<T>(list,from,to)` T1 → used in T2. `useFavorites(): {favorites,add,remove,reorder}` T2 → consumed in T5. `FavoriteRow({station,onOpen,onDelete})` T4 → used by `DraggableFavorites` T5. `DraggableFavorites({favorites,onOpen,onDelete,onReorder})` T5 → MiejscaScreen. `onReorder(from,to)` order matches `moveItem`/`reorder`. testIDs: `delete-<city>` (unchanged, T4), `fav-<id>` (new, T4). Rows keyed by `station.id` (T5) — ties to the AC 008-4 guard.
