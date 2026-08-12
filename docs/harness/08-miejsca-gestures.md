# Harness journal 08 — Miejsca gestures (swipe-delete + drag reorder)

**Milestone:** M-miejsca-polish B · **Spec:** `docs/specs/008-miejsca-gestures.md` · **Plan:** `docs/superpowers/plans/2026-08-12-m-miejsca-gestures.md` · **Branch:** `feature/m-miejsca-gestures` (stacked on `feature/m-miejsca-data-ux` / PR #5)

## What the app gained
Two gestures on the favorites list:
- **Swipe-to-delete** — swiping a favorite left reveals a red **"Usuń"** action that removes
  it (`react-native-gesture-handler`'s `ReanimatedSwipeable`).
- **Drag-to-reorder** — long-pressing a favorite lifts it (scale + shadow); dragging
  vertically reorders; dropping **persists** the new order.
The pinned "Twoja lokalizacja" row and search results are not gesture-enabled.

## What the harness gained
- First use of `react-native-gesture-handler` (ADR-012) on RN 0.86 New Architecture, with
  `GestureHandlerRootView` at the root and the jest wiring for it.
- `moveItem` (pure, `core/places`) + `FavoritesProvider.reorder` (persisted) — the reorder
  logic is fully unit-tested even though the drag gesture is manual.

## Layers introduced / changed
- `src/core/places`: `moveItem` (pure).
- `src/shared/place/FavoritesContext`: `reorder(from, to)` → `moveItem` + `store.save`.
- `src/shared/tokens`: `colors.danger` (`#ff453a`), `colors.shadow` (`#000000`).
- `src/features/miejsca`: `FavoriteRow` (swipe), `DraggableFavorites` (long-press drag),
  MiejscaScreen wires them.
- `App.tsx`: `GestureHandlerRootView style={{flex:1}}` at the root. ADR-012.

## Mid-build corrections (critic, pre-build)
The `critic` (verified against the RNGH 3.1.0 tarball) returned NEEDS-REVISION and caught:
1. **Build blocker** — RNGH 3.1.0 is ESM-only; without adding it to jest
   `transformIgnorePatterns`, every gesture test would fail to parse. Fixed in setup.
2. **M1-retro trap** — if `DraggableFavorites` keyed rows by index, delete/reorder would
   remount rows and re-break the spec-007 no-refetch guard (and reship the bug). Mandated
   `station.id` keys; the guard test is the automated proof.
3. **Wrong gesture-composition API** — `ReanimatedSwipeable` owns its pan internally and
   exposes only `simultaneousWith` (no `Gesture.Race`); corrected to a long-press +
   vertical `activeOffsetY` Pan (axis separation from the swipe's horizontal offset).
4. Both-operand OOB pins for `moveItem` (100% core-coverage gate), `flex:1` on the root,
   pinned `@^3.1.0`, `onReorder(from,to)` order.

## Build-time discoveries (jest ↔ RNGH/Reanimated)
- **`ReanimatedSwipeable` under Jest** needs Reanimated internals the bundled reanimated
  mock lacks (`isSharedValue`, `useHandler`). → mocked `ReanimatedSwipeable` to render its
  children + right-actions inline (unit-tests the delete wiring; the swipe motion is the
  manual AC), which sidesteps the reanimated-mock gaps entirely.
- **`GestureDetector` requires a `GestureHandlerRootView` ancestor** even under Jest → the
  MiejscaScreen favorites test wraps its render in `GestureHandlerRootView`.

## Known limitations (deferred)
- **Drag reorder is an MVP** — the dragged row lifts/moves and the list snaps to the new
  order on drop; live reflow of the non-dragged rows during the drag is a polish follow-up.
  `ROW_H` is a fixed approximation; drag feel is tuned at the manual AC.
- "Edytuj" edit-mode: not built (gestures are always-on).
- No refresh/caching.

## Manual evidence (AC 008-5)
Native rebuild done (new RNGH pod). iPhone 16 Pro, iOS 18.3.1.
- **Boot with RNGH on New Arch** (`ac-008-5-boot-rngh-newarch.png`): the app builds and
  launches cleanly with `GestureHandlerRootView style={{flex:1}}` wrapping the tree and
  RNGH natively linked — **not blank**, so the New-Architecture integration and the
  `flex:1` root are correct. (Teraz shows the Kraków fallback + the expected `__DEV__`
  log because the device's nearest station has no fresh PM2.5 now — not a defect.)
- **The interactive gesture walkthrough** — swipe→Usuń, long-press→drag→reorder, and
  order-persists-across-relaunch — needs real touch that can't be driven headlessly (no
  `idb`/accessibility). The new native build is on the sim; the walkthrough is offered to
  the human on the Miejsca tab. The reorder logic + swipe-delete wiring are automated
  (AC 008-1/2/3/4); this manual pass is where the drag *feel* (`ROW_H`, thresholds) is judged.

## Retro — corrections became rules
_(placeholder — filled at merge, step 10)_
