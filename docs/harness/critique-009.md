# Critique — Spec 009: Ustawienia

**VERDICT: SHIP-WITH-FIXES** — architecture, fidelity, and honesty framing are
sound and the tricky design glyphs are byte-correct, but two blockers (an
internal `clampThreshold` contradiction and a non-viable slider verification
path) plus several should-fixes must land before this goes to a plan.

Review mode: escalated to ADVERSARIAL after finding 1 blocker + a pattern of
under-specified ACs. Everything below is verified against source, not asserted.

---

## Verified-good (so the planner doesn't re-litigate)
- Glyph fidelity is EXACT (byte-diffed spec vs mock): `µ` = U+00B5 MICRO SIGN,
  `³` = U+00B3, `›` = U+203A, `–` = U+2013. AC-15's literal-fixture will hold.
- Token values match the mock: `colors.card = rgba(255,255,255,0.06)`
  (`tokens/index.ts:19`) == mock card `.06`; `colors.success = #34c759`
  (`tokens:4`) == toggle-on; `colors.text.dim = 0.5` (`tokens:12`) == static
  value grey. New tokens (`text.faint .4`, `text.footer .35`, `text.muted .55`,
  `control.trackOff .18/segBg .08/segActive .16/divider .06`) all match the raw
  rgba in `Powietrze.dc.html:183,199,210,214,226,230,240,247,534,540`.
- `scene(value).key` ≡ mock's `ramp(threshold,'key')`: `scene.ts:14` computes
  `key = ramp(Math.max(0,v),'key')`; for v∈[25,200] identical. AC-12's
  substitution is correct.
- AC-1 default literal matches `Powietrze.dc.html:372-373` (settings) + threshold
  100. Section order AC-14 matches markup 183/199/222/238. Divider "none after
  last row" matches markup (each group's last row drops `border-bottom`).
- No new dependency: `react-native-gesture-handler` + `reanimated` already ship
  (ADR-012 via spec 008); "no ADR this milestone" is correct.
- Layering is sound in principle: `core/settings` pure, `data/settings` → core,
  `shared` depends on the core `SettingsStore` interface (injected), mirroring
  the existing favorites seam (`data/favorites/index.ts`, `FavoritesContext.tsx`).

---

## Blockers (must fix before planning)

### B1 — `clampThreshold` contract contradicts itself (non-finite handling)
- **Where:** Public API comment line 54 vs AC-2 line 148.
- **What's wrong:** Line 54 says `non-finite → DEFAULT threshold (100)`.
  `Infinity` is non-finite, so by the comment `Infinity → 100`. But AC-2 says
  `Infinity → 200` (and `NaN → 100`). NaN and ±Infinity are all non-finite, yet
  the spec maps them differently. Two competent devs implement two different
  functions; the doc and the test AC disagree. AC-2 also never covers
  `-Infinity`.
- **Fix:** Reword line 54 to `NaN → DEFAULT (100); ±Infinity → clamp to bounds`
  and extend AC-2: `NaN → 100`, `Infinity → 200`, `-Infinity → 25`. (This is the
  intuitive clamp semantics; only genuinely-unknown NaN falls to default.)

### B2 — AC-12 slider verification path is non-viable and self-contradictory
- **Where:** AC-12 (line 186-189) + Verification bullet (line 251-252).
- **What's wrong:** Verification offers "slider drag via a `fireEvent` gesture
  or the reanimated test path (fallback: assert the clamp/`onChange` contract
  directly)." Spec 008 already established as project fact that gesture-handler
  gestures "can't be driven headlessly — offered to the human… RNTL can't
  simulate real gestures" (`008-miejsca-gestures.md:96-97,122`). So the primary
  path (jest gesture) does not exist here, and the "fallback" tests
  `clampThreshold` — NOT the drag→value mapping, which is the entire risk of a
  hand-rolled `Gesture.Pan` over a measured track. The one behavior AC-12
  promises ("a horizontal drag calls onChange with a value clamped to [25,200]")
  would ship untested and unverified.
- **Additional under-specification in AC-12:**
  - No integer requirement: `Settings.threshold` is an integer and
    `clampThreshold` rounds, but AC-12 never says the slider emits integers.
    Nothing stops it emitting `137.4`, then `scene(137.4)` is fine but the stored
    value violates the integer invariant until a later merge.
  - Gradient dropped: the mock track is `linear-gradient(90deg,
    ramp(threshold,'key'), rgba(255,255,255,.15))` (`Powietrze.dc.html:578`);
    the "Resolved ambiguities" section even calls it "gradient track (ramp color
    → white)". But AC-12 says only "track fill uses `scene(value).key`" — the
    white `.15` endpoint and 90deg direction are lost. Fidelity gap between the
    prose and the checkable AC.
- **Fix:**
  1. Extract the pure mapping into `core/settings` (e.g.
     `thresholdFromRatio(ratio: number): number` returning a clamped **rounded**
     int, and its inverse `ratioFromThreshold`). Unit-test it (new AC) — this is
     the risky logic and it becomes headless-testable.
  2. Make the `ThresholdSlider` gesture a thin shell that measures track width
     and calls the pure fn; verify the actual drag with a **manual AC** recorded
     in the journal, matching the 008 precedent — do not pretend a jest gesture
     path works.
  3. AC-12: assert `onChange` receives an **integer** in `[25,200]`, and pin the
     track gradient stops (`scene(value).key` → `rgba(255,255,255,.15)`, 90deg).

---

## Should-fix

### S1 — Honesty model is inconsistent for the two fixed-value display rows
- **Where:** AC-18 (line 211-214) + Resolved ambiguity (line 230-232).
- **What's wrong:** `Godziny ciszy` (`22:00 – 07:00`) and `Stacja widżetu`
  (`Automatyczna ›`) render what look like *configured, active* settings, are
  non-interactive, and carry **no** `Wkrótce` tag. The spec lumps them with
  `Źródło`/`Częstotliwość` as rows that "state facts and need no tag." But
  `GIOŚ`/`15 min` ARE facts (real source + cadence); "quiet hours 22:00–07:00"
  and "widget station Automatyczna" are NOT facts — those features don't exist,
  so these are fake defaults presented as live settings. Worse, the `›` chevron
  on `Stacja widżetu` implies a tappable drill-in that does nothing. This
  directly undercuts the stated honesty goal. AC-18 also never states the
  tag-state for these two rows or the footer, so a test author can't know whether
  to assert tag-absence (ambiguity).
- **Fix:** Either (a) tag `Godziny ciszy` and `Stacja widżetu` `Wkrótce` too and
  drop the `›` affordance, or (b) rewrite the honesty rule to explicitly justify
  why *fixed-value non-interactive* rows are exempt while *interactive-unwired*
  rows are tagged — and make AC-18 enumerate the tag state of **every** row
  (all 4 groups + footer), not just 6-tagged + 2-untagged.

### S2 — Optimistic write-through race is unspecified / untested
- **Where:** AC-9 (line 172-174) + Resolved ambiguity (line 238-240).
- **What's wrong:** AC-9 only tests a single `set`. The task's flagged risk —
  two rapid `set` calls before the first render commits — is uncovered. If `set`
  is implemented by capturing `settings` from closure (`const next =
  {...settings,[k]:v}`), the second call overwrites the first's key. The proven
  pattern (`FavoritesContext.tsx:46-51`) uses a **functional updater**
  (`setState(prev => …)`), which the spec neither mandates nor tests. Also AC-9
  asserts `save` is called "once" while the favorites pattern calls `save`
  *inside* the state updater — under React StrictMode dev double-invoke that
  fires twice; asserting "once" may be fragile.
- **Fix:** Add an AC: two successive `set` calls (`set('alert',false)` then
  `set('morning',true)`) both persist and the final saved object contains both
  changes. Mandate functional-updater semantics in the `SettingsApi` note. Decide
  whether `save` lives in the updater (StrictMode double-fire) or a `useEffect`
  on `settings` (cleaner, one save per committed change) and word AC-9 to match.

### S3 — Production wiring of SettingsProvider is never specified
- **Where:** Public API `SettingsProvider` (line 79-83); nothing in ACs/Verif.
- **What's wrong:** The composition root is `App.tsx` (data instances built once
  and injected — `App.tsx:22-26,45`). Spec 009 never says App.tsx must construct
  `createAsyncStorageSettingsStore()` and wrap the tree in `<SettingsProvider>`.
  AC-19 tests via an injected fake, so **tests stay green while the real app
  crashes** (`useSettings` throws "wrap the tree" like `useFavorites` does,
  `FavoritesContext.tsx:72`). Only the manual screenshot would catch it.
- **Fix:** Add a task/AC: App.tsx instantiates the AsyncStorage settings store
  once and mounts `<SettingsProvider store={…}>` around `AppNavigator`, mirroring
  `FavoritesProvider`. Name the exact insertion point.

### S4 — SegmentedControl container/option dimensions not pinned
- **Where:** AC-11 (line 182-185).
- **What's wrong:** AC-11 checks only text/background colors. The container
  (`segBg rgba .08`, radius 11, padding 3 — `Powietrze.dc.html:191,230`) and each
  option (radius 9, padding `7px 4px`, size 13, weight 500 — line 540) are
  unpinned, so a faithful render isn't checkable and drift won't be caught by any
  test (only the single manual screenshot).
- **Fix:** Extend AC-11 (or add AC) to pin the container + option geometry, same
  rigor AC-10 applies to the toggle and AC-13 to the group card.

### S5 — No AC for save() resilience or the hydration flash
- **Where:** Data ACs (AC-4..7) + AC-8.
- **What's wrong:** (a) No AC that `save()` never rejects when
  `AsyncStorage.setItem` throws, even though the favorites adapter establishes
  exactly this swallow-and-dev-warn behavior (`data/favorites/index.ts:24-26`)
  and the spec's "fire-and-forget, failed save is a no-op" depends on it.
  (b) AC-8 admits the mount shows DEFAULT then hydrates, but nothing addresses
  the visible flash (e.g. `alert` renders ON then flips OFF when a non-default
  value loads). For settings this is probably acceptable, but it should be a
  stated decision, not a silent gap.
- **Fix:** Add a data AC mirroring favorites' swallow behavior. Add one line to
  AC-8 / Resolved ambiguities accepting (or masking) the pre-hydration flash.

### S6 — Row-level testID strategy undefined
- **Where:** AC-15 / AC-18 verification (line 253-254).
- **What's wrong:** AC-18 must assert "the `Alert smogowy` row shows a `Wkrótce`
  tag" and "`Źródło` shows none" — but no testID convention is given for rows or
  tags. 008 uses explicit testIDs (`delete-<city>`). Without a convention the
  test author invents ad-hoc queries mid-build.
- **Fix:** Define row/tag testIDs (e.g. `setting-row-alert`, `wkrotce-<key>`) in
  the spec so AC-18/AC-15 are mechanically writable.

---

## Nits
- **N1** Token grey sprawl: `.45` (text.inactive) / `.5` (text.dim) /
  `.55` (new text.muted) are three near-identical greys. Faithful to the mock,
  but flag for future consolidation.
- **N2** Unpinned visual details rely solely on the one manual screenshot:
  inter-group top padding `22px` (markup 199/222/238), first label top padding
  `0` (183), footer size `11.5px` (247), and the `07:30` sub-label
  (`12px`, `rgba .45`, markup 217). Consider pinning the 07:30 sub-label at least
  (it's copy-adjacent to AC-15).
- **N3** AC-13 says the group "renders `label` uppercased" while AC-14 already
  lists the labels uppercase — clarify whether the component applies
  `textTransform` or receives pre-uppercased strings (avoids a double-uppercase
  or locale-casing surprise).
- **N4** `threshold` moves from a top-level mock state field
  (`Powietrze.dc.html:372`) into the `Settings` object. Reasonable, but note it
  in traceability so AC-1's merged literal isn't mistaken for a mock mismatch.
- **N5** New body/label/segment sizes (11/13/15px) are inline rather than `type`
  tokens; existing screens use `type` tokens. Acceptable (no-hex lint only
  targets color), but inconsistent — consider adding `type.settingLabel` etc.

---

## Top 3 highest-leverage changes
1. **Fix B2 (slider):** extract a pure, unit-tested `thresholdFromRatio` into
   core, add a manual drag AC per the 008 precedent, and pin integer output +
   gradient stops. This converts the single riskiest deliverable from
   "untestable hope" to "verified logic + honest manual gate."
2. **Fix B1 (clamp contradiction):** align line 54 with AC-2 and add the
   `-Infinity` case. One-paragraph fix that removes a guaranteed
   implement-two-ways ambiguity in the most foundational function.
3. **Fix S1 + S3 together (honesty + wiring):** make the honesty rule cover
   every row explicitly (kill the fake-fact exemption or justify it) and pin the
   App.tsx SettingsProvider wiring so tests can't be green while the app crashes.
