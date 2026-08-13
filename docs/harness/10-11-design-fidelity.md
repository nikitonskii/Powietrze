# Journal 10-11 — M-design-fidelity (skyline + tab bar)

**Specs:** `docs/specs/010-skyline.md` (5 ACs) · `docs/specs/011-tabbar.md` (7 ACs) · **Plan:** `docs/superpowers/plans/2026-08-13-m-design-fidelity.md`
**Branch:** `feature/m-design-fidelity` (off m-ustawienia tip; chain #3→#4→#5→#6→#7→#8 precede) · **Base→HEAD:** `341509a`→`57a12d7`
**Built:** 2026-08-13, subagent-driven (4 code tasks + 1 native/manual), per-task review each, final whole-branch review. **No new dependency.**

## What shipped
Two design-fidelity pieces the app was missing, both realized with Skia (already on board) — the user's directive was explicit: no new libraries, pixel-perfect to the design.

- **Skyline (010):** the design's generic city silhouette, rendered as a Skia `Path` in the existing atmosphere canvas at 44% screen height, that blurs and fades as air worsens (`blur density×7`, `opacity 1−density×0.45`, `fill rgba(3,5,9, 0.72−density×0.32)`). Path/viewBox/top-ratio + the haze math live in pure `core/atmosphere`; the rgba is built in core so no color literal lands in the no-hex UI layer. Extracted as a `Skyline` sub-component so `Atmosphere()` stays ≤40 lines.
- **Tab bar (011):** each tab is now the design's **icon above a label** — the circle-sensor / map-pin / gear SVGs stroked with Skia (`TabIcon` + `ICON_PATHS` table), 25×25 via a `scale 25/24` group. New `type.tab` token (10.5/500/ls 0). PR #7 tint logic preserved (Teraz glows the live air color). Geometry per design (88px, padding 10/0/24, translucent `rgba(10,12,17,.55)`). Added `accessibilityRole`/`selected`.

## Deliberate scope call (honest)
**No true backdrop blur** on the tab bar. The design specifies `blur(24px)`, but real backdrop blur (blurring live content behind the bar) needs a native library, which the user ruled out. Skia can't blur underlying native views — only its own canvas — so we keep the design's own translucent color, which reads as a modern iOS bar. A real blur pass (tab bar + cards + search field) is a future milestone if ever wanted. Also out of scope per spec: the `›` chevron affordance.

## Process notes / catch-class findings
- **Critics (pre-plan):** spec 010 SHIP-WITH-FIXES (B1: raw rgba concat emits `0.3999…` → mandated 2-dp formatting; S2: the Skia jest mock DOES expose props on host nodes → concrete AC assertions, not a hedge; S3: placement translateY/origin; S5: extract sub-component). Spec 011 SHIP-WITH-FIXES (B-1: `Skia.Path.MakeFromSVGString` THROWS under the mock and would crash the shipped tint tests → string-form `<Path path=d>` only; S-1: 24→25 scale via a `scale 25/24` group; S-2: add `type.tab`; S-3: export `ICON_PATHS` for the fixture). All folded in before planning.
- **Task-5 slider precedent reused:** Skia elements can't take a `testID` in their public types → attach test-only testIDs via an object-spread (TS skips excess-property checks on spread variables); no `any`/`@ts-ignore`. Used in both Skyline and TabIcon.
- **Final whole-branch review, 2 Important (both fixed):** (1) TabBar had hand-built label style duplicating the shared `Text` component — once `type.tab` existed, `<Text variant="tab">` was the DRY answer (the implementer's original brief guidance was wrong and the review caught it); (2) AC-5 (bar geometry) is not a manual AC yet had no test → added one. The whole-branch review is exactly where the "green tests but an AC untested / logic duplicated" class surfaces.
- **Reusable gotchas (for the next Skia work):** (1) NEVER `Skia.Path.*` in JS under Jest — pass `d` strings to `<Path path=…>`. (2) The Skia jest mock renders children as host nodes (`skPath`/`skCircle`/`skGroup`/`skBlurMaskFilter`) with props preserved; put the `testID` on the specific stroked element, never the `Canvas` (a bare View, no `color`). (3) Skia public prop types omit `testID` → object-spread to add a test-only one (consider a `.d.ts` augmentation once a 3rd site appears).

## AC coverage
**Automated gate:** 43 suites / 142 tests green · lint 0 errors · typecheck clean · `src/core` 100%.
- **010:** AC-1 (path/viewBox/top-ratio literal fixture) ✓ · AC-2 (skyline blur/opacity) ✓ · AC-3 (skylineColor rgba+rounding) ✓ · AC-4 (Skia render props) ✓ · **AC-5 (manual)** — skyline crisp→blurred→swallowed at clean/moderate/bad air — PENDING sim.
- **011:** AC-1 (ICON_PATHS fixture) ✓ · AC-2 (TabIcon stroke/color/testID) ✓ · AC-3 (icon-over-label + type.tab) ✓ · AC-4 (tint on icon+label; PR #7 tests unchanged) ✓ · AC-5 (bar geometry) ✓ · AC-6 (a11y selected) ✓ · **AC-7 (manual)** — icons render crisply + tint per focus — PENDING sim.

<!-- MANUAL EVIDENCE (append after sim run): docs/harness/evidence/10/ (skyline @ 3 indices), docs/harness/evidence/11/ (tab bar). -->

## Deferred (non-blocking)
- Skia-testID `.d.ts` augmentation (collapse the props-spread pattern) when a 3rd Skia-testID site appears.
- True backdrop blur (native lib) if the frosted-glass look is ever wanted app-wide.
