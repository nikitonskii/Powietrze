# Critique — Spec 011: Tab bar (icons + design fidelity)

**VERDICT: SHIP-WITH-FIXES**  ·  Blocker 1 · Should-fix 4 · Nit 4

**Overall:** Scope, structure, and intent are sound — icon paths are transcribed
byte-for-byte, the PR #7 tint logic is preserved, and no new dependency is added.
But AC-2's Skia testability claim rests on an unverified model of the Jest mock and
hides a crash trap that can take down the already-shipped AC-4 tint tests. Pin the
AC-2 implementation constraints and the fidelity gaps before this goes to a plan.

**Pre-commitment vs. findings:** predicted (1) path drift, (2) Skia mock testability
gaps, (3) missing a11y, (4) `gap` ambiguity, (5) 24->25 scale unaddressed. Actual:
(1) NO drift — transcription perfect; (2) confirmed + worse (JS path factory crashes
under the mock); (3) confirmed (pre-existing); (4) fine (RN 0.86 supports gap);
(5) confirmed unaddressed.

---

## BLOCKER (1)

### B-1 — AC-2 is underspecified and built on a wrong model of the Skia mock; the "obvious" implementation crashes shipped tests.
Location: `docs/specs/011-tabbar.md:58-59` (AC-2), `:96-99` (Verification), `:70-73` (AC-4).

Two proven problems:

1. **`Skia.Path.MakeFromSVGString()` throws under Jest** — the mock builds `Skia`
   from `global.CanvasKit`, which is undefined
   (`node_modules/@shopify/react-native-skia/lib/module/mock/index.js`), giving
   `TypeError: Cannot read properties of undefined (reading 'Path')`. If the executor
   writes the natural implementation (parse the `d` string to an `SkPath` in JS, e.g.
   a `useMemo`), then `TabIcon.test.tsx` crashes AND `AppNavigator.test.tsx` (the
   AC 006-10 + unfocused-Teraz tint tests) crashes, because rendering the tab bar now
   renders `TabIcon`. That regresses green, shipped tests.
   Fix: MANDATE string-form paths — pass the raw `d` string straight to
   `<Path path="M3 17h4..."/>`; never call `Skia.Path.*` in JS. (Verified: string-form
   renders cleanly under the mock.)

2. **AC-2's phrase "props the Skia jest mock exposes" is factually wrong and hides the
   real constraint.** `<Circle>`/`<Path>`/`<Group>` render as host elements
   `skCircle`/`skPath`/`skGroup`; the test renderer preserves their props. Props are
   assertable ONLY when the `testID` sits on the stroked element (Circle/Path). The
   `Canvas` mocks to a bare `View`, so a `testID` on the Canvas yields a node with NO
   `color`/`strokeWidth`. `TabIcon` exposes only one top-level `testID` (`:35-39`) and
   never says where it lands — so AC-4's "tint applies to BOTH icon and label" is not
   testable as written.
   Fix: forward `TabIcon`'s `testID` onto the stroked `<Path>`/`<Circle>` (or emit
   `icon-<name>`); TabBar renders `<TabIcon testID={`icon-${route.name}`}/>`, then
   `within(tab).getByTestId('icon-Teraz').props.color` verifies the tint. Reword
   "props the mock exposes" -> "props preserved on the `skPath`/`skCircle` host node."

- Confidence: HIGH (both proven empirically with throwaway Jest probes).
- Why it matters: this is the spec's core deliverable and its verification story;
  as-is, planning proceeds on a coin-flip that either crashes shipped tests or yields
  an unverifiable icon-tint AC.
- Detection: fast/loud if it bites (first test run) — kept at Blocker as a
  spec-clarity gate and the top-leverage change.

---

## SHOULD-FIX (4)

### S-1 — viewBox 24 -> 25px scale unaddressed (fidelity + stroke width).
Location: `:33-34`, `:58`. Paths use `viewBox 0 0 24 24` but AC-2 says a `25x25` canvas
with `strokeWidth 1.9`. Skia has no viewBox; drawing 24-space coords on a 25px canvas
renders ~4% small, shifted ~0.5px up-left (center 12 vs 12.5), and stroke stays 1.9
where SVG's transform makes it ~1.98 (x 25/24). For a fidelity milestone, pin it.
Fix: specify a `<Group transform={[{scale: 25/24}]}>` wrapper (scales coords + stroke
together, matching SVG), OR draw on a 24x24 canvas, OR accept-and-document raw-24.

### S-2 — Label 10.5/500 has no type token and `Text` requires a `variant`; letterSpacing unspecified.
Location: `:72` (AC-3) vs `src/shared/tokens/index.ts:35` (`label: 12/600/2.4`) and
`src/shared/ui/Text.tsx:9` (`variant` is required). No 10.5/500 token exists, and the
required `variant` prop forces either adding a token or overriding all three variant
fields via `style`. Design tab span (`Powietrze.dc.html:257`) has NO letter-spacing,
but `TabBar.tsx:47` forces `letterSpacing: 0.5`; AC-3 is silent.
Fix: add `type.tab = {size:10.5, weight:'500', letterSpacing:0}` and reference it.

### S-3 — AC-1 "literal fixture" conflicts with the Public API: the path literals aren't exported.
Location: `:52-57` + `:90-92` vs `:29-40` (API exports only `TabIcon` + `TabIconName`).
A fixture can't read the literals unless (a) `TabIcon.tsx` exports the path/circle
table, or (b) the test renders and reads `skPath.props.path` (verified: equals the `d`
string). Pick one. If (a), add the exported constant to the Public API; if (b), state
AC-1 is verified via the rendered `path` prop and merge with AC-2's render test.

### S-4 — Route->TabIconName mapping is asserted but not made safe.
Location: `:46`, `:32`. Routes are `Teraz|Miejsca|Ustawienia`
(`AppNavigator.tsx:30-32`). `route.name.toLowerCase() as TabIconName` is an unchecked
cast that silently breaks on rename/addition.
Fix: specify `const ROUTE_ICON: Record<string, TabIconName> =
{Teraz:'teraz',Miejsca:'miejsca',Ustawienia:'ustawienia'}` and behavior for unmapped
routes.

---

## NIT (4)

### N-1 — teraz icon: design has `stroke-linecap="round"` only, no linejoin.
`Powietrze.dc.html:256` vs spec's uniform "round cap/join" (`:58`). Harmless (teraz path
is straight segments + a circle, no joins), but note the divergence.

### N-2 — Design tab bar padding is `10px 0 24px`; current bar omits paddingTop:10.
`Powietrze.dc.html:254` vs `TabBar.tsx:41` (`paddingBottom:24` only). AC-5 (`:74-76`)
claims geometry is "design-correct," but the 10px top padding is missing and the new
icon+label stack changes centering. Reconcile the claim or add `paddingTop:10`.

### N-3 — No accessibility AC.
`TabBar.tsx:21-30` Pressables lack `accessibilityRole`/`accessibilityState={{selected}}`.
Icon-decorative is correct (label carries the name, icon needs no label), but VoiceOver
can't announce selection. Pre-existing / arguably out of scope — note as deferred.

### N-4 — Keep `TabIcon` render fn <= 40 lines (CLAUDE.md).
A `switch(name)` with inline JSX can bloat; a `{name:{circles,paths}}` data map + one
render body stays small and doubles as the AC-1 fixture source (ties to S-3).

---

## Verified solid (acknowledge)
- **AC-1 transcription is byte-for-byte correct** for all three icons vs
  `Powietrze.dc.html:256/260/264` (incl. `r2.4`, `20.5`, `4.2 4.2l2.1 2.1`, the
  8-subpath ustawienia string). No drift.
- **AC-4 "existing tint tests pass unchanged" is TRUE** — the icon adds no text node,
  so `within(tab).getByText('Teraz')` stays unique and `colorOf` still reads the
  label's `color` despite the 12->10.5 / 600->500 restyle
  (`AppNavigator.test.tsx:81-127`, `colorOf.ts`).
- **No new dependency / no ADR** — `@shopify/react-native-skia ^2.11.0` already ships
  (used in `Atmosphere.tsx`).
- **`gap:4` is expressible** — RN 0.86.2 supports flex `gap`; tab item is already a
  column stack (RN default `flexDirection:'column'`).
- **No-hex lint unaffected** — color is a prop; `d` literals contain no colors.

## Multi-perspective
- **Executor:** without B-1, hits the `Skia.Path` crash or ships an untestable icon
  tint; without S-2, unsure whether to add a token or override the variant.
- **Stakeholder:** solves the stated problem and protects PR #7 tint; icon-tint AC is
  not measurable until B-1's testID is defined.
- **Skeptic:** `design/README.md:133` suggests SF Symbols in native; the Skia choice is
  defensible under the no-new-libs constraint but the spec never acknowledges the
  divergence — add one sentence.

## Verdict justification
Escalated to ADVERSARIAL mode after the AC-2 crash finding, which drove the empirical
Jest probes and the AC-4 impact check. SHIP-WITH-FIXES (not REWORK) because the
substance is correct and every finding is closable with wording/token/testID changes.
Realist Check: B-1 held at Blocker (spec-clarity gate, top leverage) despite fast
detection; S-1 held at Should-fix (sub-pixel error still matters for a fidelity
milestone). Upgrade to SHIP once B-1 + S-1 + S-2 are written into the spec.

## Top 3 highest-leverage changes
1. **B-1:** Mandate string-form `<Path path="d"/>` (no JS `Skia.Path` parsing — it
   throws under Jest and would crash the shipped AC-4 tests) AND put testIDs on the
   stroked Circle/Path so icon tint is assertable.
2. **S-1:** Specify the 24->25 scale (a `scale: 25/24` Group transform is faithful).
3. **S-2:** Add a `type.tab` token (10.5/500/ls 0) instead of fighting the required
   `Text` variant, and pin label letterSpacing to the design's 0.

## Open questions (unscored)
- Is `paddingTop:10` (N-2) intentionally dropped, or an existing oversight to fix here?
- Is tab accessibility (N-3) in scope for this milestone or a separate a11y pass?
