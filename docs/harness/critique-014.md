# Critique — Spec 014: Wire live settings (scale, precision, location) + hide widget row

**Verdict: SHIP-WITH-FIXES** — the architecture is clean and the design decisions are
sound, but two blockers (an under-specified US-AQI contract that will emit `NaN` on
real hourly values, and undocumented breakage of ≥4 existing test suites) must be
resolved before this goes to a plan. Review escalated to ADVERSARIAL mode after a
systemic pattern emerged: the spec repeatedly ignores its blast radius on existing tests.

Severity counts: **2 Blocker · 5 Should-fix · 5 Nit**

---

## Pre-commitment predictions vs findings
Predicted the risk would cluster in (1) US-AQI breakpoint gap/rounding ambiguity,
(2) the loc-toggle reset fighting placeKey hooks, (3) layer leaks threading
KRAKOW_STATION, (4) spec-009 test fallout.
- (1) CONFIRMED and worse than expected — see B1 (gap-region → NaN).
- (2) Mostly a non-issue — the reset is clean; only a minor hydration-timing ambiguity (S5).
- (3) FALSE ALARM — layering is clean (see "Verified OK"). App.tsx is the composition
  root and already imports `data/gios`; passing `KRAKOW_STATION` (a `core/geo` `Station`)
  as a prop crosses no boundary.
- (4) CONFIRMED and broader — fallout hits spec-006, spec-009, Hero, PlaceRow (B2).

---

## Blockers (block execution)

### B1 — `usAqiFromPm25` contract is under-specified; "linear over standard breakpoints" is wrong, and gap-region inputs produce `NaN`
Location: spec §"Public API" (`src/core/air/index.ts`) lines 35-37, and **AC-1** (lines 79-81).

Two distinct defects:

1. **The prose actively misleads toward a wrong implementation.** The spec says
   *"piecewise-linear over the standard breakpoints … Rounded to an integer"* and labels
   AC-1 *"EPA PM2.5 breakpoints, linear"*. A competent implementer will build **continuous**
   segments — concentration anchors `[0,12,35.4,55.4,150.4,250.4,350.4,500.4]` mapped to
   AQI anchors `[0,50,100,150,200,300,400,500]`. That implementation passes every AC-1
   point **except one**: `12.1`. Continuous slope on `12→35.4` is `50/23.4 = 2.137/µg`, so
   `usAqiFromPm25(12.1) = 50 + 2.137·0.1 = 50.21 → round → 50`, but AC-1 demands `51`.
   The only way to get `12.1 → 51` is the **discontinuous official EPA table** with lower
   AQI endpoints `51/101/151/201/301/401` and lower concentration endpoints
   `12.1/35.5/55.5/150.5/250.5/350.5`. That exact table is **never written in the spec** —
   which violates the M1 retro rule that AC-1 must *pin* the breakpoint table (§Verification
   line 134 claims it does, but it only pins 8 sample points, not the table).

2. **Gap-region inputs are undefined → runtime `NaN`.** The official table has 0.1-µg gaps
   between bands (`12.0`→50 vs `12.1`→51; nothing defined for `12.05`). GIOŚ returns hourly
   µg/m³ as floats (the app already divides raw pm25 by 1.03 in `indexFromPm25`,
   `src/core/air/index.ts:18`), so values like `12.05`, `35.45`, `55.45` **will** occur. An
   if-chain keyed on `[C_lo, C_hi]` ranges returns `undefined`/`NaN` for those — the hero
   would render the string `"NaN"` when `scale='US AQI'`. No AC covers a gap-region value,
   so this ships silently.

**Why it matters:** wrong AQI numbers or literal `"NaN"` shown as the app's headline value.
**Fix:**
- Embed the full 7-row EPA breakpoint table verbatim in the spec (`C_lo | C_hi | I_lo | I_hi`)
  as the authoritative fixture, and drop/qualify the word "linear" (it is piecewise-linear
  *within each band of a discontinuous table*).
- Specify input handling in the gaps: state that concentration is truncated (EPA convention)
  or rounded to 0.1 µg/m³ before lookup, so `usAqiFromPm25(12.05)` is defined. Add an AC
  fixture point in a gap (e.g. `12.05 → 50`).
- Specify `NaN`/non-finite input behavior (e.g. `NaN → 0`), matching the `negative → 0` clamp.

### B2 — Spec guarantees failure of ≥4 existing test suites but the Verification section updates none (DoD "all green" cannot be met)
Location: spec §Wiring (lines 63-74) + §Verification (lines 133-142); CLAUDE.md DoD #2.

The changes silently invalidate already-green tests, none of which the spec mentions updating:

- **spec-006 `src/shared/place/__tests__/ActivePlaceContext.test.tsx:61-66`** renders
  `<ActivePlaceProvider>` with **no props and no `SettingsProvider`**. Spec-014 makes the
  provider take `defaultStation: Station` (line 64) and call `useSettings()` (line 68). If
  `defaultStation` is required → **typecheck fails**; either way `useSettings()` **throws**
  ("wrap the tree in SettingsProvider") → test crashes.
- **spec-009 `src/features/ustawienia/__tests__/UstawieniaScreen.test.tsx`**:
  - **AC-18 (line 51-74)** asserts `getByText('Stacja widżetu')` and `'Automatyczna'` are
    present — removing the widget row (spec-014 line 74) breaks this. **Spec-014 never
    mentions AC-18 at all.**
  - **AC-21 (line 91-107)** asserts `wkrotce-loc`, `wkrotce-precision`, `wkrotce-widget`,
    `wkrotce-scale` are all present — directly contradicted by spec-014 AC-8 (lines 106-109).
- **`src/features/teraz/__tests__/Hero.test.tsx:17+`** renders `<Hero>` bare (no providers).
  If Hero begins calling `useSettings()` (spec line 70), every Hero test throws.
- **`src/features/miejsca/__tests__/PlaceRow.test.tsx:34-48`** wraps only
  `PlaceSourceProvider`; adding `useSettings()` to PlaceRow throws there too.

**Why it matters:** DoD #2 requires `lint`/`typecheck`/`test` green in the same change. The
spec silently ships a red suite and leaves the implementer to discover the blast radius.
**Fix:** Add an explicit "Existing tests to update" subsection enumerating every suite above,
state that spec-009 AC-18/AC-21 are superseded/rewritten by spec-014 AC-8, and specify how
Hero/PlaceRow tests acquire a settings context (test wrapper or a fake `SettingsProvider`).

---

## Should-fix (significant rework if ignored)

### S1 — `ToggleRow` hardcodes `soon`; "drop the soon tag from loc" is not a one-line change
Location: `src/features/ustawienia/UstawieniaScreen.tsx:34` (ToggleRow passes `soon`
unconditionally); spec line 73.
`loc` is a `ToggleRow`, and `ToggleRow` has **no `soon` prop** — it hardcodes `soon`, which
also drives `alert` and `morning` (which must **keep** their tag per AC-8, lines 108-109).
An implementer taking "drop the soon tag from loc" literally cannot; they must refactor
`ToggleRow` to accept `soon?: boolean` and thread it per-row without regressing alert/morning.
The spec should call this out (precision/scale are `StackedRow`s that already take `soon`, so
the asymmetry is easy to miss).
**Fix:** Note the `ToggleRow` signature change and that alert/morning must retain `soon`.

### S2 — AC-1 fixture cannot satisfy the 100% core-coverage gate
Location: **AC-1** (lines 79-81); CLAUDE.md core 100% coverage gate.
The 7-segment table has bands the fixture never exercises: **seg 4** (55.5–150.4),
**seg 6** (250.5–350.4), **seg 7** (350.5–500.4), and the **150.4/150.5 (200/201) boundary**.
`600` only exercises the *clamp*, not seg-7 interpolation. An if-chain implementation will
miss branches → coverage gate fails.
**Fix:** Add fixture points inside every band and at the 150.4→200 / 150.5→201 boundary
(this also naturally pins the full table per the M1 retro rule).

### S3 — Hero big number carries no unit/scale label; a US-AQI number sits under a CAQI band
Location: **AC-5** (lines 92-96); §Resolved ambiguities (lines 117-131); `Hero.tsx:36-47`.
With `scale='US AQI'`, the hero shows e.g. `51` under band `scene(index).band` (a CAQI
category). US-AQI 51 is "Moderate", but the CAQI band for the same air may read "Bardzo
dobra" — a US-AQI-literate user sees a number and a category that disagree, with **no label**
telling them which scale the big number is. The resolved-ambiguity list covers color/band
staying CAQI but never addresses this number-vs-category mismatch or the missing affordance.
`design/README.md:97` gives the segmented control but no hero unit caption.
**Fix:** Either add a small scale caption under/beside the hero number (e.g. "US AQI" /
"µg/m³") or add an explicit resolved-ambiguity accepting the unlabeled number, and add an AC
for whatever is chosen so it is checkable.

### S4 — `displayValue` invocation site is unspecified (leaf-component context coupling)
Location: spec line 70 ("Hero and PlaceRow render their big number via `displayValue(...)`
using `useSettings()`").
Two valid implementations: (a) Hero/PlaceRow call `useSettings()` themselves (couples two
leaf presentational components to context, and is what forces the Hero/PlaceRow test
breakage in B2), or (b) `TerazScreen`/parent computes the string and passes it down (keeps
leaves pure). The spec picks (a) implicitly but never justifies it over (b). Two devs will
diverge.
**Fix:** State explicitly where `displayValue` is called and why; if (a), tie it to the
Hero/PlaceRow test updates in B2.

### S5 — AC-6 reset rule under-specifies the async-hydration interaction and the test's provider needs
Location: **AC-6** (lines 98-103); §Verification line 138; `src/shared/settings/index.tsx:29-37`
(settings load async — first render is `DEFAULT_SETTINGS` with `loc:true`, then the stored
value arrives).
- Because settings hydrate asynchronously, a stored `loc:false` transitions `true→false`
  after mount and **fires the reset effect during hydration**, not only on a user toggle. At
  launch this is benign (no manual pick yet), but the spec should state that the reset effect
  cannot distinguish "hydration" from "user toggled" — otherwise an implementer may add
  guards that break AC-6, or omit guards and be surprised. Also note `defaultPlace(false,…)`
  returns a **fresh object each call** (unlike the stable `LOCATION_PLACE` const,
  `core/places/index.ts:7`), so a naive `useEffect` dependency on the computed place, rather
  than on `settings.loc`, would loop. Pin: effect keys on `settings.loc` only.
- §Verification line 138 says the AC-6 test uses "a fake settings store toggling `loc`", but
  the provider also mounts `usePlaceReading`/`usePlaceDetail`, which call `useSourceForPlace()`
  that **throws without `PlaceSourceProvider`** (`PlaceSourceContext.tsx:23`). The test needs
  both a fake `SettingsProvider` and a fake `PlaceSourceProvider`.
**Fix:** Specify the effect keys on `settings.loc`; document the hydration-fires-reset
behavior; list the full provider stack the AC-6 test requires.

---

## Nits (suboptimal but functional)

- **N1 — PlaceRow number width.** `PlaceRow.tsx:92` sets the index at `fontSize:44` with no
  fixed width. `scale='µg/m³'`+`Dokładna` yields strings like `"34.9"`/`"150.4"`, and US-AQI
  up to `"500"` — wider than a 2-3 digit CAQI index, which can crowd the flexible title
  column. No AC covers multi-char/decimal width.
- **N2 — Hero µg/m³ redundancy.** With `scale='µg/m³'`,`Dokładna`, the hero shows big `13.1`
  and, directly below, `PM2.5 · 13.1 µg/m³` (`Hero.tsx:49`) — the same value twice. Worth an
  explicit "acceptable" note or suppressing the sub-line in µg/m³ mode.
- **N3 — AC-3 placeholder.** AC-3 (line 84) writes `'CAQI', p` using an undefined token `p`
  for "any precision"; fine for a human, but state it means precision is irrelevant here.
- **N4 — Non-finite inputs.** Neither `formatConcentration` nor `displayValue` specifies
  `NaN`/`Infinity` behavior (e.g. `(NaN).toFixed(1) → "NaN"`). Tie to the B1 clamp decision.
- **N5 — Naming drift.** Public API names the param `fallback: Station` (line 60) while the
  Wiring/AC call it `defaultStation` (lines 64, 98). Align to avoid confusion.

---

## What's missing (gaps)
- No accounting for existing test suites the change breaks (B2) — the single biggest gap.
- No full EPA breakpoint table and no gap-region/`NaN` input rule (B1).
- No hero unit/scale affordance and no AC for it (S3).
- No coverage-completeness fixture for the 7 bands (S2).
- No statement of where `displayValue` is invoked (S4).
- Miejsca row layout for wide/decimal numbers is unaddressed (N1).

## Ambiguity risks
- Line 35-37 `"piecewise-linear over the standard breakpoints"` → Interp A: continuous anchor
  interpolation (WRONG — fails `12.1→51`); Interp B: discontinuous official EPA table
  (CORRECT). Risk if A chosen: wrong AQI + AC-1 red until re-derived. (B1)
- Line 70 `"render … via displayValue(...) using useSettings()"` → Interp A: leaves call
  `useSettings`; Interp B: parent passes the string. Risk: divergent designs + differing test
  breakage. (S4)

## Multi-perspective notes
- **Executor:** Will hit undocumented walls — a red existing suite (B2), a `ToggleRow` that
  can't drop `soon` without refactor (S1), and an AQI table they must reconstruct from EPA
  docs (B1). Each forces a question or a stall.
- **Stakeholder:** Solves the stated problem (wire 3 settings, hide widget) and success
  criteria are mostly measurable via ACs — but "user can tell which scale they're seeing" is
  neither guaranteed nor measured (S3).
- **Skeptic:** Strongest argument the approach is fine: color/band staying CAQI is a
  deliberate, defensible thesis and is well-defended. The weak point isn't the design, it's
  spec completeness around numeric correctness and test blast radius.

## Verified OK (acknowledged)
- **Layering is clean.** `core/air` importing `type { Scale, Precision }` from `core/settings`
  is type-only with no cycle (`core/settings` imports nothing from air/places — confirmed).
  `core/places` already imports `Station` from `core/geo`. No React in core. App.tsx is the
  composition root and already imports `data/gios`, so passing `KRAKOW_STATION` as a prop is
  no boundary crossing. The task's layer-leak worry is unfounded.
- **Provider order confirmed:** `SettingsProvider` wraps `ActivePlaceProvider`
  (`App.tsx:49-50`), so `useSettings()` is available inside the provider.
- **AC-1 boundary arithmetic is correct** given the official table: `0→0, 9→38 (round 37.5),
  12→50, 12.1→51, 35.4→100, 55.4→150, 250.4→300, 600→500 clamp, neg→0` all check out.
- **AC-2 rounding** correct: `Math.round(12.5)=13`, `(13).toFixed(1)="13.0"`.

---

## Realist Check
- B1 kept at Blocker: gap-region `NaN` is low-frequency but produces a literal `"NaN"`
  headline; the misleading "linear" wording is caught by AC-1's `12.1` point but only after
  wasted iteration and still leaves gaps uncovered. NOT data-loss/security, but it is
  incorrect output of the app's primary value — earns Blocker.
- B2 kept at Blocker: certain (100%) to red the suite and typecheck; DoD explicitly forbids
  shipping that. Detected immediately by CI, but the spec omitting it guarantees rework and
  confusion.
- No downgrades applied.

---

## Top 3 highest-leverage changes
1. **Embed the full EPA PM2.5 breakpoint table + specify gap/`NaN` input handling** (B1) —
   turns the app's headline number from "probably right, maybe NaN" into a pinned, testable
   contract and satisfies the M1 retro rule.
2. **Add an "Existing tests to update" section** enumerating spec-006 ActivePlaceContext,
   spec-009 AC-18 & AC-21, Hero, and PlaceRow (B2) — the difference between a green DoD and a
   guaranteed-red merge.
3. **Decide + document the `displayValue` call site and the `ToggleRow soon` refactor**
   (S4+S1) — removes the two ambiguities most likely to make the executor stop and ask.
