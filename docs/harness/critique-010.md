# Critique — Spec 010: Skyline (Horizon city silhouette)

**VERDICT: SHIP-WITH-FIXES (REVISE)** — 1 Blocker, 4 Should-fix, 4 Nit.

## Overall assessment
The bones are correct: right density source (`scene.density`, no re-derivation — avoids the M3 mistake), literal-fixture AC-1, color built in core to keep rgba out of the no-hex UI layer, no new dependency, correct z-order over particles. But **AC-3 is unsatisfiable as written** (floating-point), AC-4's Skia-mock verifiability is mischaracterized in the pessimistic direction, and a placement ambiguity will cause a visible ~24px mismatch. Revise, not rework.

---

## Blocker (blocks execution)

### B1 — AC-3's exact rgba strings cannot be produced by the cited formula
- Location: `docs/specs/010-skyline.md:55-58` (AC-3); source `design/Powietrze.dc.html:560`.
- AC-3 asserts `skylineColor(1) === 'rgba(3,5,9,0.4)'` and `skylineColor(0.5) === 'rgba(3,5,9,0.56)'`. Line 560 uses raw concatenation `'rgba(3,5,9,'+(0.72-den*0.32)+')'` with NO rounding. Verified in Node:
  - `0.72 - 1*0.32`   -> `0.39999999999999997` -> `'rgba(3,5,9,0.39999999999999997)'`
  - `0.72 - 0.5*0.32` -> `0.5599999999999999`  -> `'rgba(3,5,9,0.5599999999999999)'`
  - `0.72 - 0`        -> `0.72` (the only clean value — and density=0 never ships; see N1)
- A faithful port fails AC-3 on 2 of 3 cases. The spec pins exact strings but omits any formatting rule, and the source it cites contradicts them.
- Confidence: HIGH (arithmetic verified). Realist check: detected instantly at first test run, trivial fix once known — but it is a genuine spec-contract defect that will bounce the plan, so it stays Blocker.
- Fix: Add to §Public API next to `skylineColor`: alpha rounded to 2 decimals with trailing zero stripped, e.g. `String(parseFloat((0.72 - density*0.32).toFixed(2)))`. Verified this yields exactly `'0.4'`, `'0.56'`, `'0.72'`, matching AC-3. Keep AC-3's expected strings. (`skyline()` numbers are exact — `0.55`, `0.775`, `3.5`, `1` all verified — so AC-2 is fine.)

---

## Should-fix (significant rework risk)

### S2 — AC-4 mischaracterizes Skia-mock verifiability; the hedge licenses a weak test
- Location: `docs/specs/010-skyline.md:69` (AC-4) and `:98-102` (Verification).
- The installed mock (`@shopify/react-native-skia@2.11.0`, `jestSetup.js` -> `lib/module/mock`) makes `Canvas` an RN `View` (why the existing `getByTestId('atmosphere')` works), and children render as host elements with props spread:
  - `renderer/components/shapes/Path.js` -> `createElement("skPath", {start,end,...props})`
  - `renderer/components/Group.js` -> `createElement("skGroup", {...props})`
  - `renderer/components/maskFilters/Blur.js` -> `createElement("skBlurMaskFilter", {...props})`
- Because these are string host types, RNTL records them as host nodes: `getByTestId('skyline')` finds the `skPath` and `.props` exposes `color`, `transform`, etc. The mock does NOT flatten props. AC-4's "if the mock flattens Skia props (as it may), assert element presence + spied values" is a false premise that would license a rubber-stamp test.
- Confidence: HIGH on mechanism (mock source read directly); MEDIUM that no runtime obstacle appears — no precedent in repo (existing `Atmosphere.test.tsx` only checks the canvas testID), so implementer should confirm empirically.
- Fix: Commit AC-4 to concrete assertions: `getByTestId('skyline').props.color === skylineColor(scene.density)`; give the enclosing group a testID and assert `opacity === skyline(density).opacity`; assert the `Blur` child's `blur` prop `=== skyline(density).blur`. Spying on `skyline`/`skylineColor` is a fine supplement, not the fallback for a flattening that does not happen.

### S3 — "top edge at SKYLINE_TOP_RATIO*height" is ambiguous (viewBox top vs. drawn top)
- Location: `docs/specs/010-skyline.md:67` (AC-4); path `design/Powietrze.dc.html:34`.
- The path draws y from 24 (tallest building, `L250,24`) to 150 (baseline); viewBox is `0 0 389 150`, so there is 24px headroom above the buildings. Design (`:560` `top:'44%'` on a 150-tall svg) anchors the viewBox origin at 44%, not the buildings' top. AC-4 gives scaleX/scaleY but omits translateY and transform origin, and "top edge" is undefined. Two devs differ by `24*scaleY ~= 24px` — a visible vertical shift.
- Confidence: HIGH.
- Fix: State: "The path's viewBox origin (y=0) is placed at `SKYLINE_TOP_RATIO * height`; transform = `translateY(0.44*height)` composed with uniform scale about origin (0,0)."

### S4 — CSS-px blur ported 1:1 to a Skia Gaussian sigma
- Location: `docs/specs/010-skyline.md:36,52` and `design/Powietrze.dc.html:560` (`filter: blur(${(den*7).toFixed(1)}px)`).
- `blur = density*7` is a CSS blur radius; Skia `<Blur blur>` is a Gaussian sigma — different units, different visual softness. Spec presents 7 as exact.
- Confidence: MEDIUM.
- Fix: Note the unit difference in §Resolved ambiguities; require AC-5 to compare against the HTML at matching indices and permit a documented conversion factor rather than treating 7 as pixel-exact. (Precedent: M3 ported particle `shadowBlur` 1:1 — accept the precedent explicitly or revisit both.)

### S5 — Constitution: single-responsibility / <=40-line function
- Location: `docs/specs/010-skyline.md:77` (§Resolved ambiguities); `src/shared/ui/Atmosphere.tsx:82-124`.
- Putting the skyline in `Atmosphere.tsx` makes the file "particle field AND skyline"; the `Atmosphere()` render body is already ~40 lines. Adding a skyline group pushes past the <=40-line limit — both flagged by CLAUDE.md.
- Confidence: MEDIUM (depends on final line count).
- Fix: Have AC-4 require extracting a `Skyline` sub-component rendered inside the existing canvas, rather than inlining the group into `Atmosphere()`. Keeps the canvas single (as intended) while respecting module/function limits.

---

## Nit

- **N1** — `docs/specs/010-skyline.md:52-56`: AC-2/AC-3 test `density=0`, but `scene.density` floors at `0.03` (`clamp(PM2.5/135, 0.03, 1)`), so `skyline(0)`/`skylineColor(0)` never ship. Add one realistic anchor (e.g. `0.03`, or the AC-5 clean index's density ~= `0.09`). Irony: `skylineColor(0)=0.72` is the only cleanly-formatting alpha — the one tested value that works is the unreachable one (see B1).
- **N2** — `docs/specs/010-skyline.md:67`: AC-4 uses `height` (= `useWindowDimensions().height`) as "screen height." Correct only because the canvas is `StyleSheet.absoluteFill` full-bleed. State this assumption so a future safe-area/inset change does not silently move the 44% origin.
- **N3** — Vertical position tracks screen height (`TOP_RATIO*height`) while size tracks width (uniform `scaleX`); on unusual aspect ratios the horizon holds 44% but building heights follow width. Acceptable — note it as intended so it is not "fixed" later.
- **N4** — `docs/specs/010-skyline.md:5`: header says "lines 32-35 (svg + path)"; the `<svg>` is line 33 and `<path>` line 34 (line 32 is the wrapper `<div>`). AC-1's "line 34" citation is correct; only the header range is loose.

---

## What's missing
- No formatting rule for the rgba alpha (root of B1).
- No translateY/origin for path placement (root of S3).
- No note on Skia-sigma vs CSS-px blur units (S4).
- No decomposition guidance given file/function-size limits (S5).
- No realistic-density test anchor (N1).

## Ambiguity risks
- `"top edge at SKYLINE_TOP_RATIO * height"` -> A: viewBox top (y=0) at 44% (design-faithful, 24px headroom). B: drawn building top (y=24) at 44%. Wrong choice shifts the skyline up ~24px vs the mock.
- `"if the mock flattens Skia props (as it may)"` -> A: implementer writes real prop assertions. B: implementer assumes flattening (it does not) and ships element-presence-only. Wrong choice makes AC-4 a rubber stamp.

## Multi-perspective notes
- Executor: cannot satisfy AC-3 by faithfully porting line 560 (B1); placement transform under-specified (S3).
- Stakeholder: criteria mostly measurable; AC-4's hedge is a vanity gate until tightened (S2).
- Skeptic: the same-canvas choice is right (free Blur, no dep, correct z-order); the answer to the size limit is component extraction (S5), not a separate layer.

## Verdict justification
Escalated to ADVERSARIAL mode after B1 plus a pattern of under-specified numeric/placement contracts (3+ Should-fix). Expanded scope into the installed node_modules mock and the existing test, which flipped the spec's own AC-4 assumption. Realist check: B1 held at Blocker despite fast detection; no finding involves data/security/financial impact. Architecture, density sourcing, core-purity color, and the literal fixture are all correct — REVISE, not REWORK.

## Top 3 highest-leverage changes
1. B1 — Specify the alpha formatting rule; unblocks the core test suite.
2. S2 — Turn AC-4's hedge into concrete prop assertions (the mock supports them); makes the only UI gate real.
3. S3 — Define translateY/origin and "top edge = viewBox top"; prevents a visible ~24px placement mismatch.

## Open questions (unscored)
- Does the existing `<Blur>` import resolve to the mask-filter or image-filter variant, and does the skyline want the same? Both render as inspectable host elements (no AC-4 impact) but may affect the AC-5 look.
- Should `skyline()`/`skylineColor()` clamp defensively, or rely on pre-clamped `scene.density`? (Currently relies on upstream; fine for 100% core branch coverage — no branches.)
