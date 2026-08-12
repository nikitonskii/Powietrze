# Spec 008: Miejsca gestures (swipe-delete + drag reorder)

**Status:** draft
**Milestone:** M-miejsca-polish B (gestures)
**Sources:** `design/README.md` §"Screens/Views → 2. Miejsca" ("Swipe-to-delete,
long-press reorder (to implement)"); `docs/specs/006-miejsca.md` / `007-miejsca-data-ux.md`
(the `PlaceRow`, `FavoritesProvider`, `MiejscaScreen` this builds on); user request
(2026-08-12): swipe-to-delete + drag reorder of favorites.

## Scope

Add two gestures to the **favorites** list on Miejsca:
1. **Swipe-to-delete** — swiping a favorite row left reveals a red **"Usuń"** action that
   removes it (via `react-native-gesture-handler`'s `ReanimatedSwipeable`).
2. **Drag-to-reorder** — long-pressing a favorite lifts it; dragging vertically reorders
   the list; dropping persists the new order.

Both apply only to favorite rows. The pinned **"Twoja lokalizacja"** row and the search
results are not gesture-enabled.

## Non-goals

- **"Edytuj" edit-mode** — not needed; gestures are always-on.
- **Reordering / swiping the location row or search results.**
- **Refresh / caching** — unchanged.
- **Cross-list drag, multi-select, undo-delete** — out of scope.

## Public API

`src/core/places` — add a pure array move:
```ts
export function moveItem<T>(list: T[], from: number, to: number): T[];
// Moves list[from] to index `to`. Returns the SAME array reference on a no-op
// (from === to) or any out-of-bounds index (so callers can skip a redundant save).
```

`src/shared/place/FavoritesContext.tsx` — grow the value:
```ts
type FavoritesValue = {
  favorites: Station[];
  add: (s: Station) => void;
  remove: (id: number) => void;
  reorder: (from: number, to: number) => void; // moveItem + persist (skips save on no-op)
};
```

`src/features/miejsca` (new components):
- `FavoriteRow` — wraps `PlaceRow` in `ReanimatedSwipeable`; `renderRightActions` is a
  red "Usuń" action (`testID="delete-<city>"`, unchanged) calling `onDelete`. The inline
  ✕ from spec 006/007 is removed (swipe replaces it).
- `DraggableFavorites` — renders the favorite rows with long-press-drag reorder (custom
  Reanimated shared values + a `LongPress`→`Pan` gesture, composed with each row's
  swipeable via `Gesture.Race` so a long-press-drag wins over a horizontal swipe); calls
  `onReorder(from, to)` on drop.

`App.tsx` — wrap the whole tree in `GestureHandlerRootView` (outermost), required by
`react-native-gesture-handler`.

`src/features/miejsca/MiejscaScreen.tsx` — the favorites branch renders the pinned
location `PlaceRow` + `<DraggableFavorites favorites onOpen onDelete onReorder />`
instead of the inline `favorites.map`. Empty hint + search branch unchanged.

## Behavior — Acceptance Criteria

- **AC 008-1** — `moveItem` (pure, unit). Pins: `moveItem(['a','b','c'], 0, 2)` →
  `['b','c','a']`; `moveItem(['a','b','c'], 2, 0)` → `['c','a','b']`;
  `moveItem(['a','b','c'], 1, 2)` → `['a','c','b']`; no-op returns the SAME reference:
  `moveItem(l, 1, 1) === l`, and any out-of-bounds (`-1`, `>= length`) `=== l`.
- **AC 008-2** — `FavoritesProvider.reorder` (RNTL, fake store): mounted with favorites
  `[k, w, g]`, `reorder(0, 2)` yields `[w, g, k]` and calls `store.save` with `[w,g,k]`;
  `reorder(1, 1)` (no-op) does **not** call `store.save` again.
- **AC 008-3** — `FavoriteRow` swipe-delete action (RNTL): the row renders its "Usuń"
  delete action (`testID="delete-<city>"`) in the tree; pressing it calls `onDelete`.
  (RNTL cannot simulate the swipe reveal itself — the action's presence + press is the
  automated proof; the swipe motion is covered by the manual AC.)
- **AC 008-4** — `MiejscaScreen` favorites regression (must stay green after the
  `FavoriteRow`/`DraggableFavorites` refactor): the spec-006/007 favorites tests still
  pass — `delete-<city>` removes + persists, deleting one favorite does NOT refetch the
  others (the placeKey guard), the pinned location row + empty hint, and the search/save
  flow (AC 006-9 / 007-4) are unaffected.
- **AC 008-5** *(manual)* — On the simulator: (a) swipe a favorite left → **"Usuń"** →
  the favorite is removed; (b) long-press a favorite → it lifts → drag over another →
  drop → the order changes; (c) kill & relaunch → the new order **persists**; (d) the
  pinned "Twoja lokalizacja" row cannot be swiped or dragged. *(Screenshots / notes;
  the gestures can't be driven headlessly — offered to the human, same limit as prior
  milestones. This is also the gate that the `react-native-gesture-handler` native
  integration works on RN 0.86 New Arch.)*

## Resolved ambiguities

- **Swipe = `ReanimatedSwipeable`** (RNGH built-in); **reorder = custom** Reanimated +
  gesture-handler (no library equivalent that fits the New-Arch/Reanimated-4 stack
  without risk). Composed with `Gesture.Race` (long-press-drag beats swipe).
- **Delete testID preserved** (`delete-<city>`) so the swipe action is the same
  target the existing favorites tests press — the swipe gesture is new, the delete
  contract is not.
- **Only favorites are gesture-enabled**; the location row is pinned outside
  `DraggableFavorites`.
- **Reorder persists** the whole reordered `Station[]` via the existing `FavoritesStore`
  (`reorder` → `moveItem` → `store.save`); order is restored on next launch by
  `store.load` (already ordered).
- **Gestures are largely manual-tested** — the pure move, the persistence, and the
  delete-action press are automated; the swipe motion and the drag choreography are
  the manual AC (RNTL can't simulate real gestures).

## Risks & config

- **New dep `react-native-gesture-handler` → ADR-012** (a DoD gate): `pod install`,
  `GestureHandlerRootView` wrapping the app, and `import 'react-native-gesture-handler/jestSetup'`
  at the top of `jest.setup.js`. Justify over alternatives (the RN-community standard;
  Reanimated-4-compatible; required for `ReanimatedSwipeable`). Note New-Arch/RN-0.86
  support and pin the version if needed.
- **Jest rendering of `ReanimatedSwipeable`**: AC 008-3/008-4 assume the RNGH jest mock
  renders `renderRightActions` into the tree (so `delete-<city>` is queryable). The plan
  must verify this at build time; if the mock renders children-only, `FavoriteRow` keeps
  the delete action reachable in tests another way (e.g., an always-mounted action) so
  the delete regression stays covered.
- **Native rebuild required** (new pod) for the manual AC.
- **Boundaries**: new components stay in `src/features/miejsca` (consume `shared/place`,
  never `data`); `moveItem` is pure in `core/places`. RNGH is a UI dep used only in
  features + the app root.
- **File sizes**: `DraggableFavorites` is the largest new unit — keep it ≤ 200 lines /
  functions ≤ 40; split a `useReorderGesture` hook out if it grows.

## Verification

- **AC 008-1** — `src/core/places/__tests__/*` (moveItem).
- **AC 008-2** — `src/shared/place/__tests__/FavoritesContext.test.tsx` (reorder + persist).
- **AC 008-3** — `src/features/miejsca/__tests__/FavoriteRow.test.tsx`.
- **AC 008-4** — `src/features/miejsca/__tests__/MiejscaScreen.test.tsx` (regression).
- **AC 008-5** — recorded manual evidence: simulator screenshots/notes (`docs/harness/evidence/08/`).
