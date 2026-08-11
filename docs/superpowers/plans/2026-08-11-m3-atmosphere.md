# M3 — Atmosphere (signature-first) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the signature atmosphere behind the Teraz screen — a Skia particle field whose count scales with `scene.density`, plus the 260px radial number-glow — with reduced-motion support and ≥55fps.

**Architecture:** A pure `src/core/atmosphere` module maps `scene.density` → field params (count/opacity/blur) and provides a pure `particleOffset(seed,t,frozen)` drift function (the testable seam). `src/shared/ui/Atmosphere` draws the field in a Skia canvas driven by a Reanimated clock; `src/shared/ui/NumberGlow` draws the radial disc. `TerazScreen` composes them (gradient → atmosphere → hero). Skia/Reanimated are proven in a build spike (Task 1) before any atmosphere code.

**Tech Stack:** `@shopify/react-native-skia`, `react-native-reanimated` (+ `react-native-worklets` if RA4 resolves), RN 0.86 / React 19, TS strict, Jest + `@testing-library/react-native`.

## Global Constraints

Copied from `CLAUDE.md` + `docs/specs/003-atmosphere.md`; every task implicitly includes these.

- TypeScript strict; `any` forbidden without an inline justifying comment.
- Files ≤ 200 lines; functions ≤ 40 lines. One responsibility per module.
- Imports flow `app → features → shared → core`, never reverse; no cross-feature imports.
- **No hard-coded hex** in `src/features/**`, `src/shared/ui/**`, `src/app/**` — colors come from `scene()` or `src/shared/tokens`. Particle/glow colors come from `scene.key` (a prop); numeric glow literals live in `src/core/atmosphere`.
- **`atmosphere` consumes `scene.density`** — it must NOT re-derive density or re-declare `0.03`/`135` (those stay solely in `src/core/scene`).
- Behavior tests over snapshots; every test name cites its AC ID: `test('AC-3: …')`.
- Data table (particle/glow constants) needs ≥1 test pinning the literal values (AC-4, M1 retro rule).
- Node 22.11+. `npm run lint`, `npm run typecheck`, `npm test` all green; `src/core` stays 100% coverage; no new simulator warnings.
- Adding any dependency requires an ADR in `docs/decisions/`.
- Never edit `design/`. Never push to `main`; never force-push. Work stays on `feature/m3-atmosphere` (worktree at `.claude/worktrees/m3-atmosphere`).
- iOS build/run/screenshot commands run against the develop-lineage checkout with Powietrze's own Metro on 8081; build tooling needs the sandbox disabled.

---

### Task 1: Build spike — Skia + Reanimated integration, config, ADRs

The make-or-break task. Prove the native stack works on RN 0.86 / New Arch / Xcode 26.2 **before** writing atmosphere code. **If Skia/Reanimated will not build or render a trivial canvas after a genuine 3-attempt effort, STOP and report BLOCKED with the exact failure** — do not proceed to Task 2.

**Files:**
- Modify: `package.json` (add deps), `babel.config.js` (worklets/reanimated plugin), `jest.setup.js` (skia + reanimated mocks)
- Create: `docs/decisions/006-react-native-skia.md`, `007-react-native-reanimated.md`, and — only if Reanimated 4.x resolves — `008-react-native-worklets.md`
- Create (temporary spike, deleted in Step 8): `src/shared/ui/_SkiaSpike.tsx`

- [ ] **Step 1: Install deps and resolve the Reanimated major**

Run (from the m3 worktree):
```bash
npm install @shopify/react-native-skia react-native-reanimated
npm ls react-native-reanimated react-native-worklets 2>/dev/null
```
Record the resolved `react-native-reanimated` version. If it is **4.x**, run `npm install react-native-worklets` (it ships the worklets runtime + babel plugin) and you will write ADR-008. If **3.x**, no worklets package and the plugin is `react-native-reanimated/plugin`.

- [ ] **Step 2: Configure Babel**

In `babel.config.js`, add the worklets/reanimated plugin **last** in the `plugins` array:
- Reanimated 4.x: `'react-native-worklets/plugin'`
- Reanimated 3.x: `'react-native-reanimated/plugin'`

- [ ] **Step 3: Configure Jest mocks**

Append to `jest.setup.js`:
```js
require('react-native-reanimated').setUpTests?.();
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);
```
And add the Skia Jest mock per the installed version (`@shopify/react-native-skia` ships one — `jest.mock('@shopify/react-native-skia', () => require('@shopify/react-native-skia/lib/module/mock').Mock)` or the version's documented path; confirm the exact path from `node_modules`). Add `@shopify/react-native-skia` and `react-native-reanimated` (+ worklets) to `transformIgnorePatterns` in `jest.config.js`.

- [ ] **Step 4: Pods**

Run: `cd ios && pod install && cd ..` (in the m3 worktree; needs the new native modules autolinked).

- [ ] **Step 5: Minimal Skia smoke component**

Create `src/shared/ui/_SkiaSpike.tsx` rendering a Skia `Canvas` with one filled `Circle` (or `Fill`) in a static color, mounted full-screen. Temporarily render it from `App.tsx` (or a spike route).

- [ ] **Step 6: Build, launch, screenshot — confirm the canvas renders**

Ensure Powietrze's Metro is on 8081 (from this checkout), then:
```bash
npx react-native run-ios --simulator "iPhone 16 Pro" --no-packager
xcrun simctl io booted screenshot /tmp/claude/m3-spike.png
```
Expected: the Skia circle/fill is visible (not a red box). If red-box/native crash, read the error, apply the version-specific fix (New Arch flag, missing pod, babel plugin order), retry — **3-attempt cap**, then BLOCKED.

- [ ] **Step 7: Confirm the JS suite still passes with the new mocks**

Run: `npm test && npm run typecheck && npm run lint`
Expected: existing 54 tests green (the new Skia/Reanimated mocks must not break them).

- [ ] **Step 8: Write ADRs, remove the spike, commit**

Write ADR-006 (skia: chosen for the particle-field perf headroom; native dep, pods, Jest mock; contained behind `src/shared/ui/Atmosphere`), ADR-007 (reanimated: the animation clock; babel plugin + jest setup), and ADR-008 if RA4 (`react-native-worklets`: worklets runtime split out of RA4, New-Arch-only). Delete `_SkiaSpike.tsx` and revert the `App.tsx` spike render.
```bash
git add package.json package-lock.json babel.config.js jest.setup.js jest.config.js ios/Podfile.lock docs/decisions/00*-*.md
git commit -m "chore(m3): skia + reanimated build spike proven; config + ADRs 006-008"
```

---

### Task 2: `core/atmosphere` pure module (AC-1…AC-5)

**Files:**
- Create: `src/core/atmosphere/index.ts`
- Test: `src/core/atmosphere/__tests__/atmosphere.test.ts`

**Interfaces:**
- Consumes: nothing (pure). Density values arrive from `scene.density` at call sites.
- Produces: `atmosphere(density: number): { count; particleOpacity; particleBlur }`; `particleOffset(seed: number, t: number, frozen: boolean): { x; y }`; constants `POOL_SIZE, OPACITY_BASE, OPACITY_SCALE, BLUR_BASE, BLUR_SCALE, RADIUS_MIN, RADIUS_MAX, DRIFT_VY_MIN, DRIFT_VY_MAX, WANDER_MIN, WANDER_MAX, GLOW_SIZE, GLOW_INNER_ALPHA, GLOW_TRANSPARENT_STOP`.

- [ ] **Step 1: Write the failing test** — `src/core/atmosphere/__tests__/atmosphere.test.ts`:
```ts
import {
  atmosphere, particleOffset, POOL_SIZE, OPACITY_BASE, OPACITY_SCALE,
  BLUR_BASE, BLUR_SCALE, RADIUS_MIN, RADIUS_MAX, DRIFT_VY_MIN, DRIFT_VY_MAX,
  WANDER_MIN, WANDER_MAX, GLOW_SIZE, GLOW_INNER_ALPHA, GLOW_TRANSPARENT_STOP,
} from '../index';

describe('atmosphere', () => {
  test('AC-1: count = round(density*260), consumes scene.density', () => {
    expect(atmosphere(0.03).count).toBe(8);
    expect(atmosphere(122 / 135).count).toBe(235); // index 118
    expect(atmosphere(1).count).toBe(260);
  });
  test('AC-2: particleOpacity = 0.05 + density*0.32', () => {
    expect(atmosphere(0.03).particleOpacity).toBeCloseTo(0.0596, 5);
    expect(atmosphere(122 / 135).particleOpacity).toBeCloseTo(0.33919, 5);
    expect(atmosphere(1).particleOpacity).toBe(0.37);
  });
  test('AC-3: particleBlur = 5 + density*9', () => {
    expect(atmosphere(0.03).particleBlur).toBeCloseTo(5.27, 5);
    expect(atmosphere(1).particleBlur).toBe(14);
  });
  test('AC-4: constants are the exact design literals', () => {
    expect(POOL_SIZE).toBe(260);
    expect(OPACITY_BASE).toBe(0.05);
    expect(OPACITY_SCALE).toBe(0.32);
    expect(BLUR_BASE).toBe(5);
    expect(BLUR_SCALE).toBe(9);
    expect(RADIUS_MIN).toBe(0.8);
    expect(RADIUS_MAX).toBe(3.4);
    expect(DRIFT_VY_MIN).toBe(0.08);
    expect(DRIFT_VY_MAX).toBe(0.36);
    expect(WANDER_MIN).toBe(5);
    expect(WANDER_MAX).toBe(17);
    expect(GLOW_SIZE).toBe(260);
    expect(GLOW_INNER_ALPHA).toBeCloseTo(0x44 / 255, 6);
    expect(GLOW_TRANSPARENT_STOP).toBe(0.68);
  });
  test('AC-5: frozen particleOffset is invariant to t; unfrozen is not', () => {
    const a = particleOffset(7, 100, true);
    const b = particleOffset(7, 999, true);
    expect(a).toEqual(b);
    const c = particleOffset(7, 100, false);
    const d = particleOffset(7, 999, false);
    expect(c).not.toEqual(d);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx jest src/core/atmosphere` → FAIL (cannot resolve `../index`).

- [ ] **Step 3: Write `src/core/atmosphere/index.ts`** — pure implementation:
```ts
export const POOL_SIZE = 260;
export const OPACITY_BASE = 0.05;
export const OPACITY_SCALE = 0.32;
export const BLUR_BASE = 5;
export const BLUR_SCALE = 9;
export const RADIUS_MIN = 0.8;
export const RADIUS_MAX = 3.4;
export const DRIFT_VY_MIN = 0.08;
export const DRIFT_VY_MAX = 0.36;
export const WANDER_MIN = 5;
export const WANDER_MAX = 17;
export const GLOW_SIZE = 260;
export const GLOW_INNER_ALPHA = 0x44 / 255;
export const GLOW_TRANSPARENT_STOP = 0.68;

export interface AtmosphereField {
  count: number;
  particleOpacity: number;
  particleBlur: number;
}

export function atmosphere(density: number): AtmosphereField {
  return {
    count: Math.round(density * POOL_SIZE),
    particleOpacity: OPACITY_BASE + density * OPACITY_SCALE,
    particleBlur: BLUR_BASE + density * BLUR_SCALE,
  };
}

// Deterministic per-seed drift: upward vy + horizontal sine wander.
// frozen === true → independent of t (field present but static).
export function particleOffset(
  seed: number,
  t: number,
  frozen: boolean,
): { x: number; y: number } {
  const time = frozen ? 0 : t;
  const vy = DRIFT_VY_MIN + (seed % 1) * (DRIFT_VY_MAX - DRIFT_VY_MIN);
  const amp = WANDER_MIN + (seed % 1) * (WANDER_MAX - WANDER_MIN);
  return {
    x: Math.sin(time * 0.001 + seed) * amp,
    y: -time * vy,
  };
}
```
(If `seed` is an integer, `seed % 1` is 0 — the plan's implementer should seed with fractional values per particle, or replace `seed % 1` with a hash; the contract only requires determinism + frozen invariance, which the test pins.)

- [ ] **Step 4: Run tests + lint + typecheck + coverage** — `npx jest src/core/atmosphere --coverage --collectCoverageFrom='src/core/atmosphere/**' && npm run lint && npm run typecheck`. Expected: PASS, 100% coverage on the new module.

- [ ] **Step 5: Commit** — `git add src/core/atmosphere && git commit -m "feat(core): atmosphere field params + frozen-aware particleOffset (AC-1..5)"`

---

### Task 3: `NumberGlow` + wire into Hero (AC-9)

**Files:**
- Create: `src/shared/ui/NumberGlow.tsx`
- Modify: `src/features/teraz/Hero.tsx` (wrap the index number)

**Interfaces:**
- Consumes: `GLOW_SIZE, GLOW_INNER_ALPHA, GLOW_TRANSPARENT_STOP` (Task 2); Skia (Task 1); `scene.key` via `color` prop.
- Produces: `NumberGlow({ color: string; size?: number; children: ReactNode })` with `testID="number-glow"`.

- [ ] **Step 1: Write `NumberGlow.tsx`** — a Skia radial gradient disc (`GLOW_SIZE` square, `color` at `GLOW_INNER_ALPHA` → transparent at `GLOW_TRANSPARENT_STOP`) absolutely positioned behind `children`. No hex literals (alpha comes from the core constant; color is the prop). Confirm the exact Skia radial-gradient API from the version installed in Task 1.
- [ ] **Step 2: Wrap the index number** in `Hero.tsx` with `<NumberGlow color={scene.key}>…</NumberGlow>`, keeping the existing key text-shadow.
- [ ] **Step 3: Verify** — `npx jest src/features/teraz src/shared/ui && npm run lint && npm run typecheck` green (no-hex passes).
- [ ] **Step 4: Commit** — `git add src/shared/ui/NumberGlow.tsx src/features/teraz/Hero.tsx && git commit -m "feat(shared): NumberGlow radial disc behind the index (AC-9)"`

---

### Task 4: `Atmosphere` Skia particle field + reduced-motion (AC-5 RNTL)

**Files:**
- Create: `src/shared/ui/Atmosphere.tsx`
- Test: `src/shared/ui/__tests__/Atmosphere.test.tsx`

**Interfaces:**
- Consumes: `atmosphere`, `particleOffset`, `RADIUS_MIN/MAX` (Task 2); `Scene`, Skia canvas, Reanimated clock (Task 1).
- Produces: `Atmosphere({ scene: Scene; reducedMotion?: boolean })`, `testID="atmosphere"`, `StyleSheet.absoluteFill`.

- [ ] **Step 1: Write the failing RNTL test** — `Atmosphere.test.tsx`:
```tsx
import { render } from '@testing-library/react-native';
import { Atmosphere } from '../Atmosphere';
import { scene } from '../../../core/scene';

test('AC-5: renders the field frozen under reduced motion without crashing', async () => {
  const { getByTestId } = await render(
    <Atmosphere scene={scene(118)} reducedMotion />,
  );
  expect(getByTestId('atmosphere')).toBeTruthy();
});
```
- [ ] **Step 2: Run to verify it fails** — `npx jest src/shared/ui/__tests__/Atmosphere.test.tsx` → FAIL (cannot resolve `../Atmosphere`).
- [ ] **Step 3: Write `Atmosphere.tsx`** — build `atmosphere(scene.density).count` particles (seeded pseudo-random positions/radii within `RADIUS_MIN..RADIUS_MAX`, color `scene.key`, opacity `particleOpacity`, blur `particleBlur`); always call the Reanimated clock hook; pass `frozen = reducedMotion ?? useReducedMotion()` into `particleOffset` so the frozen field is static. Render in a Skia `Canvas` at `absoluteFill` with `testID="atmosphere"`. Confirm exact Skia/Reanimated APIs from the installed versions.
- [ ] **Step 4: Verify** — `npx jest src/shared/ui && npm run lint && npm run typecheck` green.
- [ ] **Step 5: Commit** — `git add src/shared/ui/Atmosphere.tsx src/shared/ui/__tests__/Atmosphere.test.tsx && git commit -m "feat(shared): Skia particle field with reduced-motion freeze (AC-5)"`

---

### Task 5: Compose into TerazScreen (AC-6)

**Files:**
- Modify: `src/features/teraz/TerazScreen.tsx`
- Test: `src/features/teraz/__tests__/TerazScreen.test.tsx` (create)

**Interfaces:**
- Consumes: `Atmosphere` (Task 4), `GradientBackground`, `Hero`, `scene` (existing).
- Produces: TerazScreen mounting order gradient-background → atmosphere → hero content.

- [ ] **Step 1: Write the failing z-order test** — `TerazScreen.test.tsx`:
```tsx
import { render } from '@testing-library/react-native';
import { TerazScreen } from '../TerazScreen';

test('AC-6: render order is gradient-background behind atmosphere behind hero', async () => {
  const { getByTestId, getByText } = await render(<TerazScreen />);
  const gradient = getByTestId('gradient-background');
  const atmosphere = getByTestId('atmosphere');
  expect(gradient).toBeTruthy();
  expect(atmosphere).toBeTruthy();
  expect(getByText('118')).toBeTruthy();
  // atmosphere is a descendant of/after gradient; hero text renders above both.
});
```
- [ ] **Step 2: Run to verify it fails** — atmosphere testID absent in TerazScreen yet → FAIL.
- [ ] **Step 3: Mount `Atmosphere`** in `TerazScreen` inside `GradientBackground`, `absoluteFill`, before the content `View` so it sits above the gradient and below the Hero. Keep existing `spacing` padding.
- [ ] **Step 4: Verify full suite + lint + typecheck** — `npm test && npm run lint && npm run typecheck` green.
- [ ] **Step 5: Commit** — `git add src/features/teraz/TerazScreen.tsx src/features/teraz/__tests__/TerazScreen.test.tsx && git commit -m "feat(teraz): compose atmosphere behind hero (AC-6)"`

---

### Task 6: Verify, visual/perf evidence, critic agent, docs (AC-7…AC-10)

**Files:**
- Create: `.claude/agents/critic.md` (harness piece M3 introduces), `docs/harness/03-atmosphere.md`, `docs/nfr.md` (add ≥55fps) — create if absent
- Modify: `docs/specs/003-atmosphere.md` (Status → implemented)
- Create: PR screenshot + perf evidence (attached, not committed)

- [ ] **Step 1: Full green gate** — `npm test -- --coverage && npm run lint && npm run typecheck`; `src/core` still 100%.
- [ ] **Step 2: Build + capture visual evidence** — rebuild, screenshot Teraz at index 118 (AC-7, AC-9); temporarily point `MOCK_PLACE.index` (or a dev override) to 12 and 175 for AC-8 two-shot; screenshot each. Confirm no new console warnings.
- [ ] **Step 3: Perf reading (AC-10)** — enable the RN perf monitor at index 175, record fps (target ≥55) in `docs/nfr.md` and the PR.
- [ ] **Step 4: Create the `critic` agent** — `.claude/agents/critic.md`: a fresh-context spec/plan critic (adversarial, cites AC IDs, verifies arithmetic against `design/`, reports BLOCKER/SHOULD-FIX/NIT + verdict; read-only). Used at feature-loop step 2.
- [ ] **Step 5: Harness journal + spec status** — `docs/harness/03-atmosphere.md` (what M3 added: critic agent, skia/reanimated; deviations; approx spend; retro placeholder). Flip spec 003 Status → implemented.
- [ ] **Step 6: Commit docs** — `git add .claude/agents/critic.md docs/harness/03-atmosphere.md docs/nfr.md docs/specs/003-atmosphere.md && git commit -m "docs(m3): critic agent + harness journal 03 + NFR + spec status implemented"`
- [ ] **Step 7: REVIEW + VERIFY** — dispatch the `reviewer` (base `develop`, spec 003) and `verifier` agents; fix blockers or record waivers. Confirm AC-1…AC-6 VERIFIED, AC-7…AC-10 MANUAL-OK (evidence attached).
- [ ] **Step 8: Open PR to `develop`** — push `feature/m3-atmosphere`; PR with diff, spec, review + verify reports, screenshots, fps reading.

---

## Self-Review

**Spec coverage:** AC-1…AC-5 → Task 2 · AC-4 literal fixture → Task 2 · AC-5 RNTL → Task 4 · AC-6 → Task 5 · AC-7/AC-9 → Task 6 (screenshots) · AC-8 → Task 6 · AC-10 → Task 6 (perf) · reduced-motion pure+RNTL → Tasks 2+4 · ADRs 006-008 → Task 1 · critic agent → Task 6 · Skia/Reanimated risk → Task 1 spike (BLOCKED gate).

**Type consistency:** `atmosphere(density)` / `particleOffset(seed,t,frozen)` signatures match between Task 2 definition and Tasks 3/4 use; `Atmosphere({scene,reducedMotion})` and `NumberGlow({color,size?,children})` consistent between definition and TerazScreen/Hero consumers; constants named identically across tasks.

**Known execution risks (flagged, not blockers):** Skia/Reanimated on RN 0.86/New Arch/Xcode 26.2 (Task 1 spike is the gate — BLOCKED if it fails); Reanimated major (3 vs 4) changes the babel plugin + whether `react-native-worklets`/ADR-008 is needed (resolved in Task 1 Step 1); exact Skia radial-gradient + particle APIs confirmed against the installed version during Tasks 3-4; `seed % 1` determinism note in Task 2 Step 3.
