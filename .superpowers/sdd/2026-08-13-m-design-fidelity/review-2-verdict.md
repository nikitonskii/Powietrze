# Review 2 Verdict: Task 2 (Skyline sub-component + Atmosphere integration)

**SPEC: ✅**
**QUALITY: APPROVE**

## AC-4 compliance

- `Skyline.tsx` renders `<Group testID="skyline-group" opacity={skyline(density).opacity} transform={[{translateY: SKYLINE_TOP_RATIO*height}, {scale: width/SKYLINE_VIEWBOX.width}]}>` containing `<Blur testID="skyline-blur" blur={skyline(density).blur}/>` and `<Path testID="skyline" path={SKYLINE_PATH} color={skylineColor(density)}/>` — matches spec 010 AC-4 verbatim (transform order, origin anchor, scale formula).
- `SKYLINE_PATH` is passed as a plain string to `<Path path={...}>`; grepped the file — no `Skia.Path.*` call anywhere.
- Color comes exclusively from `skylineColor(density)`; no hex/rgba literal in `Skyline.tsx`.
- Test genuinely exercises density-derived values, not tautological: it imports the real `skyline`/`skylineColor` from core, renders `<Skyline density={0.5} .../>`, and asserts `getByTestId(...).props.{color,opacity,blur}` equal the independently-computed `skyline(0.5)`/`skylineColor(0.5)` outputs. This would fail if the component hardcoded wrong values or mismatched the formula — it is a real assertion, not `expect(x).toBe(x)`.
- Integration: `Atmosphere.tsx` renders `<Skyline .../>` as a `<Canvas>` child immediately after the closing `</Group>` of the particle field (line 124, after line 123's `</Group>`) — a sibling AFTER the particle group, so it overlays per spec. The JSX return statement (the "render body" the spec's AC-4 and brief both reference) is ~21 lines, well under the 40-line budget; only 2 lines were added (1 import outside the function, 1 JSX line inside). Confirmed via `git log` that `Atmosphere.tsx`'s overall function length predates this diff — not introduced or worsened materially by this task.

## Deviation judgment

### 1. Props-spread workaround — RULING: acceptable, no changes required

Verified directly against the installed package's `.d.ts` files (`Group.d.ts`, `Blur.d.ts`, `Drawings.d.ts`/`PathProps`): none declare `testID`. The report's premise is accurate, not a fabricated excuse.

The mechanism is legitimate, ordinary TypeScript: excess-property checking is a special-cased check that only fires for a *fresh object literal* assigned/passed directly to a typed position; a variable (even one holding an object literal) assigned first and then spread is checked by plain structural assignability, which tolerates extra properties. This is well-documented TS behavior, not a hack that happens to work by accident.

Does it weaken type safety on the real props? No. Structural assignability still requires `opacity`/`transform`/`blur`/`path`/`color` to match the vendor's declared types at the `<Group {...groupProps}>` call site — if `blur` were typed as a string, `<Blur {...blurProps}>` would still fail to compile. Only the *excess* `testID` property is excused, which is exactly the targeted gap, not a side-channel that loosens anything else.

Confirmed no `any`, no `@ts-ignore`, no eslint-disable anywhere in the file (grepped). `testID` is genuinely test-only: the jest Skia mock (via `@shopify/react-native-skia/jestSetup.js`) is the only consumer that reads it off host nodes for `getByTestId`; production Skia drawing has no concept of `testID` and silently ignores unknown props on its native elements, so this is harmless in the shipped app. This is also the first occurrence of this exact problem in the codebase (grepped all other `testID` usages — every other one is on a real RN `View`/`Pressable`/`Text` that declares `testID` natively), so there's no established typed-wrapper convention this deviates from.

Minor, non-blocking suggestion: if a second Skia element needing `testID` shows up in a future task, consider promoting this to a small shared `type Testable<T> = T & { testID?: string }` helper (or a `withTestId` object-spread utility) in `src/shared/ui/` to avoid re-deriving the same object-literal-then-spread pattern per file. Not worth doing for a single occurrence.

### 2. Import path fix (`../../../core/atmosphere`) — RULING: correct, brief was wrong

`Skyline.test.tsx` lives at `src/shared/ui/__tests__/`. Three `../` levels reach `src/`, so `../../../core/atmosphere` resolves to `src/core/atmosphere`, which is a real directory (`index.ts` + `__tests__/`) exporting `SKYLINE_PATH`/`skyline`/`skylineColor`. Confirmed against the sibling `Atmosphere.test.tsx` in the same directory, which uses the identical depth (`../../../core/scene`). The brief's `../../core/...` would have resolved to `src/shared/core/atmosphere`, which does not exist — the report's correction was necessary and consistent with existing convention, not a scope-creeping change.

## Findings

None — clean.

## One-line ruling

Props-spread workaround is sound and type-safe (no `any`/`@ts-ignore`/eslint-disable, real props still structurally checked, `testID` confirmed absent from Skia's public types and harmless in production) — APPROVE as-is.

verdict written
