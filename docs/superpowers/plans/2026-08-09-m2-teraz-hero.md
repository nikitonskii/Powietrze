# M2 — Teraz hero (static) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a static Teraz screen — design tokens, a small UI kit, the hero block bound to `scene()`, and a 3-tab bar shell — as the first UI surface of Powietrze.

**Architecture:** New layers `src/shared` (tokens + dumb UI) and `src/features/{teraz,miejsca,ustawienia}` on top of the M1 `src/core/scene`. Composition lives in an `app` layer (`App.tsx` + `src/app`). Everything static: one mock index (`118`, Kraków) flows through `scene()` into the hero and the tab-bar tint. Atmosphere (particles/shader/skyline/blur/radial glow) is M3; below-the-fold cards are M4.

**Tech Stack:** React Native 0.86 / React 19, TypeScript strict, Jest + `@testing-library/react-native`, `@react-navigation/native` + `bottom-tabs` (+ `react-native-screens`), `react-native-linear-gradient`, `eslint-plugin-boundaries`.

## Global Constraints

Copied verbatim from `CLAUDE.md` + `docs/specs/002-teraz-hero.md`; every task implicitly includes these.

- TypeScript strict; `any` forbidden without an inline justifying comment.
- Files ≤ 200 lines; functions ≤ 40 lines. One responsibility per module.
- Imports flow `app → features → shared → core`, never reverse; no cross-feature imports.
- **No hard-coded hex** in `src/features/**` or `src/shared/ui/**` — colors come from `scene()` or `src/shared/tokens`.
- Behavior tests over snapshots; every test name cites its AC ID: `test('AC-3: …')`.
- Node 22.11+. `npm run lint`, `npm run typecheck`, `npm test` all green; no new simulator warnings.
- Adding any dependency requires an ADR in `docs/decisions/`.
- Design values (colors, copy, type scale) are read from `design/README.md`; a data table needs ≥1 test pinning the literal values (M1 retro rule).
- Never edit `design/`. Never push to `main`; never force-push. Work stays on `feature/m2-teraz-hero` (worktree already created off `develop`).
- All commands run from the M2 worktree: `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m2-teraz-hero`.

---

### Task 1: Workspace bootstrap + dependencies + ADRs

**Files:**
- Modify: `package.json` (add deps, remove `@react-native/new-app-screen`)
- Create: `docs/decisions/003-react-navigation.md`
- Create: `docs/decisions/004-linear-gradient.md`
- Create: `docs/decisions/005-ui-test-and-lint-tooling.md`

**Interfaces:**
- Produces: installed runtime deps (`@react-navigation/native`, `@react-navigation/bottom-tabs`, `react-native-screens`, `react-native-linear-gradient`) and dev deps (`@testing-library/react-native`, `eslint-plugin-boundaries`); a green baseline (M1 suite still passes in the fresh worktree).

- [ ] **Step 1: Install base deps (fresh worktree has no node_modules)**

Run: `npm install`
Expected: completes; `node_modules/` populated.

- [ ] **Step 2: Confirm the M1 baseline is green before adding anything**

Run: `npm test && npm run lint && npm run typecheck`
Expected: all pass (M1 `src/core/scene` suite green). If not, STOP — the worktree base is wrong, not your code.

- [ ] **Step 3: Install runtime + dev dependencies**

Run:
```bash
npm install @react-navigation/native @react-navigation/bottom-tabs react-native-screens react-native-linear-gradient
npm install --save-dev @testing-library/react-native eslint-plugin-boundaries
npm uninstall @react-native/new-app-screen
```
Expected: `package.json` updated. (Native pods handled in Step 4; only needed for the simulator build in Task 7, not for Jest.)

- [ ] **Step 4: Install iOS pods for the native modules**

Run: `cd ios && bundle exec pod install && cd ..`
Expected: `react-native-screens` and `react-native-linear-gradient` (via RN autolinking) appear in Pods. If `pod install` is unavailable in this environment, note it and defer to the Task 7 simulator build — Jest does not need pods.

- [ ] **Step 5: Write the three ADRs**

`docs/decisions/003-react-navigation.md`:
```markdown
# ADR 003: React Navigation for app navigation

**Status:** accepted
**Context:** M2 introduces the 3-tab shell (Teraz · Miejsca · Ustawienia);
M5/M6 need real multi-screen flows (search, detail, settings). A hand-rolled
switcher would be rewritten then.
**Decision:** Adopt `@react-navigation/native` + `@react-navigation/bottom-tabs`
(v7) with `react-native-screens`. M2 supplies a custom `tabBar` (design blur +
key/accent tints); default bar styling is insufficient.
**Consequences:** Native deps (screens) → pods + jest mocks. Real backdrop
blur is deferred (needs a BlurView dep) — M2 uses the translucent rgba token;
tab icons (SF Symbols) deferred with it. Reversible only by rewriting nav.
```

`docs/decisions/004-linear-gradient.md`:
```markdown
# ADR 004: react-native-linear-gradient for the scene backdrop

**Status:** accepted
**Context:** The Teraz hero sits on a full-bleed deep→mid gradient derived
from the scene. M3's Skia atmosphere may supersede it, but M2 must render a
color-driven background without pulling Skia into a "static" milestone.
**Decision:** Use `react-native-linear-gradient` for the deep→mid backdrop.
**Consequences:** One native dep (autolinked, pods). If M3's Skia layer
replaces the backdrop, this is dropped — contained behind
`src/shared/ui/GradientBackground` so only one file changes.
```

`docs/decisions/005-ui-test-and-lint-tooling.md`:
```markdown
# ADR 005: UI test & import-boundary tooling

**Status:** accepted
**Context:** M2 is the first rendered surface and the first milestone to span
layers. It needs component tests and mechanical import-direction enforcement.
**Decision:** Add `@testing-library/react-native` (behavior tests over
snapshots) and `eslint-plugin-boundaries` (enforces app→features→shared→core,
no cross-feature imports). Grouped as one ADR: both are low-stakes M2 quality
tooling, not architectural forks.
**Consequences:** Component tests run under the RN Jest preset with native
mocks (Task 2). A wrong-direction import now fails `npm run lint` / CI.
```

- [ ] **Step 6: Verify install did not break the baseline**

Run: `npm test && npm run typecheck`
Expected: still green (no source changed yet; `App.tsx` still compiles — it is rewritten in Task 6, and the old `__tests__/App.test.tsx` still passes until then).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json docs/decisions/003-react-navigation.md docs/decisions/004-linear-gradient.md docs/decisions/005-ui-test-and-lint-tooling.md ios/Podfile.lock
git commit -m "chore(m2): deps for navigation, gradient, UI test/lint tooling + ADRs 003-005"
```

---

### Task 2: Quality gates & review tooling (AC-13)

**Files:**
- Modify: `.eslintrc.js` (boundaries + no-hex)
- Modify: `jest.config.js` (setup, mocks, coverage collection)
- Create: `jest.setup.js` (native-module mocks)
- Create: `.claude/agents/reviewer.md` (harness piece: reviewer agent)

**Interfaces:**
- Produces: `npm run lint` enforcing `app→features→shared→core` + no-hex-in-features/ui; a Jest environment that can render RN components with mocked native modules; the `reviewer` agent used at feature-loop step 6.

- [ ] **Step 1: Write the failing boundary test fixtures (temporary)**

Create `src/features/teraz/_boundary_probe.ts` (temporary; deleted in Step 6):
```ts
// Cross-feature import — MUST be rejected by lint.
export { UstawieniaScreen } from '../ustawienia/UstawieniaScreen';
```
Create `src/shared/ui/_hex_probe.ts` (temporary):
```ts
// Hard-coded hex in shared/ui — MUST be rejected by lint.
export const bad = '#ff0000';
```
(These reference files created in later tasks; that's fine — lint parses imports/literals, not resolution.)

- [ ] **Step 2: Configure ESLint**

Replace `.eslintrc.js`:
```js
module.exports = {
  root: true,
  extends: ['@react-native', 'plugin:boundaries/recommended'],
  plugins: ['boundaries'],
  ignorePatterns: ['coverage/', '**/_boundary_probe.ts', '**/_hex_probe.ts'],
  settings: {
    'boundaries/elements': [
      { type: 'app', pattern: ['App.tsx', 'src/app/*'] },
      { type: 'features', pattern: 'src/features/*', capture: ['feature'] },
      { type: 'shared', pattern: 'src/shared/*' },
      { type: 'core', pattern: 'src/core/*' },
    ],
  },
  rules: {
    'boundaries/element-types': ['error', {
      default: 'disallow',
      rules: [
        { from: 'app', allow: ['app', 'features', 'shared', 'core'] },
        { from: 'features', allow: ['shared', 'core', ['features', { feature: '${from.feature}' }]] },
        { from: 'shared', allow: ['shared', 'core'] },
        { from: 'core', allow: ['core'] },
      ],
    }],
  },
  overrides: [
    {
      files: ['src/features/**/*.{ts,tsx}', 'src/shared/ui/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-syntax': ['error', {
          selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
          message: 'No hard-coded hex in features/ui — use scene() or shared/tokens.',
        }],
      },
    },
  ],
};
```
Note the `ignorePatterns` for the probes is only so the *real* `npm run lint` (Step 6) stays green; you lint the probes explicitly in Step 3.

- [ ] **Step 3: Run lint against the probes to prove the rules bite**

Run: `npx eslint src/features/teraz/_boundary_probe.ts src/shared/ui/_hex_probe.ts --no-ignore`
Expected: FAIL — one `boundaries/element-types` error (cross-feature) and one `no-restricted-syntax` error (hex). This is the AC-13 evidence.

- [ ] **Step 4: Create the Jest setup with native mocks**

Create `jest.setup.js`:
```js
jest.mock('react-native-linear-gradient', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View };
});

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
```
(If `@testing-library/react-native` or `react-navigation` complains about
`react-native-screens` under Jest, add
`jest.mock('react-native-screens', () => ({ ...jest.requireActual('react-native-screens'), enableScreens: jest.fn() }))`
here. 3-attempt cap applies — do not thrash.)

- [ ] **Step 5: Configure Jest**

Replace `jest.config.js`:
```js
module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/__tests__/**', '!src/**/_*'],
  coverageThreshold: {
    './src/core/': { statements: 100, branches: 100, functions: 100, lines: 100 },
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|react-native-linear-gradient|@react-navigation|react-native-screens|react-native-safe-area-context)/)',
  ],
};
```
(Coverage gate stays core-only for M2; the harness tightens shared/features coverage at M4. `@testing-library/react-native` v13 auto-extends Jest matchers — no `extend-expect` needed; if `toBeTruthy` on queries is all you use, matchers aren't required anyway.)

- [ ] **Step 6: Delete the probes and confirm the real tree is clean**

Run:
```bash
rm src/features/teraz/_boundary_probe.ts src/shared/ui/_hex_probe.ts
npm run lint && npm test
```
Expected: lint clean, M1 suite still passes.

- [ ] **Step 7: Create the reviewer agent**

Create `.claude/agents/reviewer.md`:
```markdown
---
name: reviewer
description: Fresh-context diff review against CLAUDE.md — SOLID, module size, import direction, naming, test meaningfulness, no slop. Use at step 6 (REVIEW) of the feature loop, after gates are green, before verify.
tools: Bash, Read, Grep, Glob
model: sonnet
---

You review a diff against this repo's constitution. You find problems; you
do not fix them.

Input (from the dispatching prompt): the base ref (e.g. `develop`) and the
spec path. Read `CLAUDE.md` and the spec first.

Procedure:
1. `git diff <base>...HEAD --stat` then read each changed file in full.
2. Check against CLAUDE.md, reporting file:line for each finding:
   - Architecture: imports flow app→features→shared→core; no cross-feature
     imports; UI never fetches data directly.
   - SOLID / size: files ≤200 lines, functions ≤40; one responsibility.
   - Style: TS strict, no unjustified `any`; no hard-coded design values
     that belong in tokens/scene; naming matches surrounding code.
   - Tests: behavior over snapshots; names cite AC IDs; a test that
     asserts nothing or restates the implementation is a finding.
   - Slop: dead code, duplication, speculative abstraction, could-be-smaller.
3. Do NOT run or trust the implementer's claims about behavior — that is the
   verifier's job. Judge the code as written.

Output: findings grouped by severity (blocker / should-fix / nit), each with
file:line and a one-line rationale. If clean, say so explicitly. End with a
one-line verdict: APPROVE / CHANGES-REQUESTED.
```

- [ ] **Step 8: Commit**

```bash
git add .eslintrc.js jest.config.js jest.setup.js .claude/agents/reviewer.md
git commit -m "chore(m2): import-boundary + no-hex lint, jest RN setup, reviewer agent (AC-13)"
```

---

### Task 3: Design tokens (AC-1)

**Files:**
- Create: `src/shared/tokens/index.ts`
- Test: `src/shared/tokens/__tests__/tokens.test.ts`

**Interfaces:**
- Produces:
  - `colors` — `{ base, accent, text: { primary, high, mid, label, dim, inactive }, tabBar: { bg, border } }` (string values)
  - `type` — per-variant `{ size: number; weight: string; letterSpacing: number }` for `index|band|city|label|station|pm|advice`
  - `spacing` — `{ screenH, screenTop, screenBottom }` (numbers)

- [ ] **Step 1: Write the failing test**

`src/shared/tokens/__tests__/tokens.test.ts`:
```ts
import { colors, type, spacing } from '../index';

describe('design tokens', () => {
  test('AC-1: colors are the exact design literals', () => {
    expect(colors.base).toBe('#07090d');
    expect(colors.accent).toBe('#8fb7ff');
    expect(colors.text.primary).toBe('rgba(255,255,255,1)');
    expect(colors.text.high).toBe('rgba(255,255,255,0.92)');
    expect(colors.text.mid).toBe('rgba(255,255,255,0.72)');
    expect(colors.text.label).toBe('rgba(255,255,255,0.62)');
    expect(colors.text.dim).toBe('rgba(255,255,255,0.5)');
    expect(colors.text.inactive).toBe('rgba(255,255,255,0.45)');
    expect(colors.tabBar.bg).toBe('rgba(10,12,17,0.55)');
    expect(colors.tabBar.border).toBe('rgba(255,255,255,0.08)');
  });
  test('AC-1: type scale literals', () => {
    expect(type.index.size).toBe(128);
    expect(type.index.weight).toBe('600');
    expect(type.index.letterSpacing).toBe(-3);
    expect(type.band.size).toBe(22);
    expect(type.city.size).toBe(30);
    expect(type.label.size).toBe(12);
    expect(type.label.letterSpacing).toBe(2.4);
    expect(type.station.size).toBe(12.5);
    expect(type.pm.size).toBe(14);
    expect(type.advice.size).toBe(16);
  });
  test('AC-1: spacing literals', () => {
    expect(spacing.screenH).toBe(24);
    expect(spacing.screenTop).toBe(70);
    expect(spacing.screenBottom).toBe(130);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/shared/tokens -v`
Expected: FAIL — cannot resolve `../index`.

- [ ] **Step 3: Write the tokens**

`src/shared/tokens/index.ts`:
```ts
export const colors = {
  base: '#07090d',
  accent: '#8fb7ff',
  text: {
    primary: 'rgba(255,255,255,1)',
    high: 'rgba(255,255,255,0.92)',
    mid: 'rgba(255,255,255,0.72)',
    label: 'rgba(255,255,255,0.62)',
    dim: 'rgba(255,255,255,0.5)',
    inactive: 'rgba(255,255,255,0.45)',
  },
  tabBar: {
    bg: 'rgba(10,12,17,0.55)',
    border: 'rgba(255,255,255,0.08)',
  },
} as const;

export const type = {
  index: { size: 128, weight: '600', letterSpacing: -3 },
  band: { size: 22, weight: '500', letterSpacing: 0 },
  city: { size: 30, weight: '500', letterSpacing: 0 },
  label: { size: 12, weight: '600', letterSpacing: 2.4 },
  station: { size: 12.5, weight: '400', letterSpacing: 0 },
  pm: { size: 14, weight: '400', letterSpacing: 0 },
  advice: { size: 16, weight: '400', letterSpacing: 0 },
} as const;

export const spacing = { screenH: 24, screenTop: 70, screenBottom: 130 } as const;
```
(The `#07090d` and `#8fb7ff` literals live in `src/shared/tokens`, which is
NOT covered by the no-hex rule — only `src/shared/ui` and `src/features` are.)

- [ ] **Step 4: Run tests + lint + typecheck**

Run: `npx jest src/shared/tokens -v && npm run lint && npm run typecheck`
Expected: PASS / clean.

- [ ] **Step 5: Commit**

```bash
git add src/shared/tokens
git commit -m "feat(shared): design tokens — colors, type scale, spacing (AC-1)"
```

---

### Task 4: UI kit — Text + GradientBackground (AC-8)

**Files:**
- Create: `src/shared/ui/Text.tsx`
- Create: `src/shared/ui/GradientBackground.tsx`
- Test: `src/shared/ui/__tests__/GradientBackground.test.tsx`

**Interfaces:**
- Consumes: `colors`, `type` (Task 3); `Scene` from `src/core/scene`; `react-native-linear-gradient` (mocked to a `View` in tests).
- Produces:
  - `Text(props: RNTextProps & { variant: keyof typeof type; color?: string })` — applies size/weight/letterSpacing from `type[variant]`; default color `colors.text.primary`.
  - `GradientBackground(props: { scene: Scene; children?: ReactNode })` — full-bleed `LinearGradient`, `testID="gradient-background"`, `colors={[scene.deep, scene.mid]}`.

- [ ] **Step 1: Write the Text primitive** (no dedicated test — exercised via Hero/GradientBackground; keep it trivial)

`src/shared/ui/Text.tsx`:
```tsx
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { colors, type as typeScale } from '../tokens';

export interface TextProps extends RNTextProps {
  variant: keyof typeof typeScale;
  color?: string;
}

export function Text({ variant, color, style, ...rest }: TextProps) {
  const t = typeScale[variant];
  return (
    <RNText
      style={[
        {
          fontSize: t.size,
          fontWeight: t.weight,
          letterSpacing: t.letterSpacing,
          color: color ?? colors.text.primary,
        },
        style,
      ]}
      {...rest}
    />
  );
}
```

- [ ] **Step 2: Write the failing GradientBackground test**

`src/shared/ui/__tests__/GradientBackground.test.tsx`:
```tsx
import { render } from '@testing-library/react-native';
import { GradientBackground } from '../GradientBackground';
import { scene } from '../../../core/scene';

test('AC-8: gradient uses [deep, mid] from the scene', () => {
  const s = scene(118);
  const { getByTestId } = render(<GradientBackground scene={s} />);
  expect(getByTestId('gradient-background').props.colors).toEqual([s.deep, s.mid]);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/shared/ui -v`
Expected: FAIL — cannot resolve `../GradientBackground`.

- [ ] **Step 4: Write GradientBackground**

`src/shared/ui/GradientBackground.tsx`:
```tsx
import { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { Scene } from '../../core/scene';

export function GradientBackground({
  scene,
  children,
}: {
  scene: Scene;
  children?: ReactNode;
}) {
  return (
    <LinearGradient
      testID="gradient-background"
      colors={[scene.deep, scene.mid]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={StyleSheet.absoluteFill}
    >
      {children}
    </LinearGradient>
  );
}
```

- [ ] **Step 5: Run tests + lint + typecheck**

Run: `npx jest src/shared/ui -v && npm run lint && npm run typecheck`
Expected: PASS / clean (no-hex rule passes — no hex literals here).

- [ ] **Step 6: Commit**

```bash
git add src/shared/ui
git commit -m "feat(shared): Text + GradientBackground UI primitives (AC-8)"
```

---

### Task 5: Teraz mock data + Hero (AC-2…7, AC-12)

**Files:**
- Create: `src/features/teraz/mockData.ts`
- Create: `src/features/teraz/Hero.tsx`
- Test: `src/features/teraz/__tests__/Hero.test.tsx`

**Interfaces:**
- Consumes: `Text`, `GradientBackground` (Task 4); `colors` (Task 3); `Scene`, `scene` from `src/core/scene`.
- Produces:
  - `interface Place { city: string; station: string; freshness: string; index: number }`
  - `const MOCK_PLACE: Place` — `{ city: 'Kraków', station: 'Aleja Krasińskiego · stacja GIOŚ', freshness: '12 min temu', index: 118 }`
  - `Hero(props: { scene: Scene; place: Place })`

- [ ] **Step 1: Write the mock data**

`src/features/teraz/mockData.ts`:
```ts
export interface Place {
  city: string;
  station: string;
  freshness: string;
  index: number;
}

export const MOCK_PLACE: Place = {
  city: 'Kraków',
  station: 'Aleja Krasińskiego · stacja GIOŚ',
  freshness: '12 min temu',
  index: 118,
};
```

- [ ] **Step 2: Write the failing Hero test**

`src/features/teraz/__tests__/Hero.test.tsx`:
```tsx
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { Hero } from '../Hero';
import { MOCK_PLACE } from '../mockData';
import { scene } from '../../../core/scene';

const s118 = scene(118);
const colorOf = (node: any) => StyleSheet.flatten(node.props.style).color;

describe('Hero', () => {
  test('AC-2: location label + city', () => {
    const { getByText } = render(<Hero scene={s118} place={MOCK_PLACE} />);
    expect(getByText('TWOJA LOKALIZACJA')).toBeTruthy();
    expect(getByText('Kraków')).toBeTruthy();
  });

  test('AC-3: station + freshness line', () => {
    const { getByText } = render(<Hero scene={s118} place={MOCK_PLACE} />);
    expect(getByText('Aleja Krasińskiego · stacja GIOŚ · 12 min temu')).toBeTruthy();
  });

  test('AC-4: index number rendered in key color', () => {
    const { getByText } = render(<Hero scene={s118} place={MOCK_PLACE} />);
    expect(colorOf(getByText('118'))).toBe(s118.key);
  });

  test('AC-5: band name reads from scene, in key color', () => {
    const { getByText, rerender } = render(<Hero scene={s118} place={MOCK_PLACE} />);
    expect(colorOf(getByText('Zły'))).toBe(s118.key);
    rerender(<Hero scene={scene(20)} place={{ ...MOCK_PLACE, index: 20 }} />);
    expect(getByText('Bardzo dobry')).toBeTruthy();
  });

  test('AC-6: pm2.5 line value from scene', () => {
    const { getByText } = render(<Hero scene={s118} place={MOCK_PLACE} />);
    expect(getByText('PM2.5 · 122 µg/m³')).toBeTruthy();
  });

  test('AC-7: advice copy from scene', () => {
    const { getByText, rerender } = render(<Hero scene={s118} place={MOCK_PLACE} />);
    expect(getByText('Zostań w domu. Zamknij okna, unikaj wysiłku.')).toBeTruthy();
    rerender(<Hero scene={scene(20)} place={{ ...MOCK_PLACE, index: 20 }} />);
    expect(getByText('Powietrze czyste. Idealny czas na spacer i sport.')).toBeTruthy();
  });

  test('AC-12: renders at clamped extremes without crashing', () => {
    const lo = render(<Hero scene={scene(0)} place={{ ...MOCK_PLACE, index: 0 }} />);
    expect(lo.getByText('0')).toBeTruthy();
    expect(lo.getByText('Bardzo dobry')).toBeTruthy();
    const hi = render(<Hero scene={scene(200)} place={{ ...MOCK_PLACE, index: 200 }} />);
    expect(hi.getByText('200')).toBeTruthy();
    expect(hi.getByText('Bardzo zły')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/features/teraz -v`
Expected: FAIL — cannot resolve `../Hero`.

- [ ] **Step 4: Write Hero**

`src/features/teraz/Hero.tsx`:
```tsx
import { StyleSheet, View } from 'react-native';
import type { Scene } from '../../core/scene';
import { Text } from '../../shared/ui/Text';
import { colors } from '../../shared/tokens';
import type { Place } from './mockData';

export function Hero({ scene, place }: { scene: Scene; place: Place }) {
  return (
    <View style={styles.wrap}>
      <Text variant="label" color={colors.text.label}>
        TWOJA LOKALIZACJA
      </Text>
      <Text variant="city" style={styles.city}>
        {place.city}
      </Text>
      <Text variant="station" color={colors.text.dim} style={styles.station}>
        {place.station} · {place.freshness}
      </Text>
      <Text
        variant="index"
        color={scene.key}
        style={[styles.number, { textShadowColor: `${scene.key}88` }]}
      >
        {String(place.index)}
      </Text>
      <Text variant="band" color={scene.key}>
        {scene.band}
      </Text>
      <Text variant="pm" color={colors.text.mid} style={styles.pm}>
        PM2.5 · {scene.pm25} µg/m³
      </Text>
      <Text variant="advice" color={colors.text.high} style={styles.advice}>
        {scene.advice}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  city: { marginTop: 8 },
  station: { marginTop: 4 },
  number: {
    marginTop: 24,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 42,
  },
  pm: { marginTop: 8 },
  advice: { marginTop: 12, maxWidth: 280, textAlign: 'center' },
});
```
(The `` `${scene.key}88` `` template is a runtime concat, not a `#rrggbb`
literal, so the no-hex lint rule does not flag it. The single text-shadow is
the M2 glow; radial disc + second shadow are M3 — see spec §Non-goals.)

- [ ] **Step 5: Run tests + lint + typecheck**

Run: `npx jest src/features/teraz -v && npm run lint && npm run typecheck`
Expected: PASS / clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/teraz
git commit -m "feat(teraz): hero block bound to scene() + mock place (AC-2..7, AC-12)"
```

---

### Task 6: Screens, navigation, custom tab bar (AC-9…11)

**Files:**
- Create: `src/features/teraz/TerazScreen.tsx`
- Create: `src/features/miejsca/MiejscaScreen.tsx`
- Create: `src/features/ustawienia/UstawieniaScreen.tsx`
- Create: `src/app/TabBar.tsx`
- Create: `src/app/AppNavigator.tsx`
- Modify: `App.tsx`
- Modify: `__tests__/App.test.tsx` (replace default-template test)
- Test: `src/app/__tests__/AppNavigator.test.tsx`

**Interfaces:**
- Consumes: `Hero`, `MOCK_PLACE` (Task 5); `GradientBackground`, `Text` (Task 4); `colors` (Task 3); `scene` from core; `@react-navigation/*`.
- Produces: `TerazScreen()`, `MiejscaScreen()`, `UstawieniaScreen()`, `makeTabBar(activeTints: Record<string,string>)`, `AppNavigator()`, and an `App` default export wiring them.

- [ ] **Step 1: Write the placeholder screens**

`src/features/miejsca/MiejscaScreen.tsx`:
```tsx
import { StyleSheet, View } from 'react-native';
import { Text } from '../../shared/ui/Text';
import { colors } from '../../shared/tokens';

export function MiejscaScreen() {
  return (
    <View testID="screen-miejsca" style={styles.center}>
      <Text variant="city" color={colors.text.mid}>Miejsca</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.base },
});
```

`src/features/ustawienia/UstawieniaScreen.tsx`:
```tsx
import { StyleSheet, View } from 'react-native';
import { Text } from '../../shared/ui/Text';
import { colors } from '../../shared/tokens';

export function UstawieniaScreen() {
  return (
    <View testID="screen-ustawienia" style={styles.center}>
      <Text variant="city" color={colors.text.mid}>Ustawienia</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.base },
});
```

- [ ] **Step 2: Write TerazScreen**

`src/features/teraz/TerazScreen.tsx`:
```tsx
import { StyleSheet, View } from 'react-native';
import { scene } from '../../core/scene';
import { GradientBackground } from '../../shared/ui/GradientBackground';
import { spacing } from '../../shared/tokens';
import { Hero } from './Hero';
import { MOCK_PLACE } from './mockData';

export function TerazScreen() {
  const s = scene(MOCK_PLACE.index);
  return (
    <GradientBackground scene={s}>
      <View style={styles.content}>
        <Hero scene={s} place={MOCK_PLACE} />
      </View>
    </GradientBackground>
  );
}
const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: spacing.screenTop,
    paddingHorizontal: spacing.screenH,
    paddingBottom: spacing.screenBottom,
    justifyContent: 'center',
  },
});
```

- [ ] **Step 3: Write the custom tab bar**

`src/app/TabBar.tsx`:
```tsx
import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Text } from '../shared/ui/Text';
import { colors } from '../shared/tokens';

export function makeTabBar(activeTints: Record<string, string>) {
  return function TabBar({ state, navigation }: BottomTabBarProps) {
    return (
      <View style={styles.bar}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const tint = focused ? activeTints[route.name] : colors.text.inactive;
          return (
            <Pressable
              key={route.key}
              testID={`tab-${route.name}`}
              style={styles.item}
              onPress={() => navigation.navigate(route.name)}
            >
              <Text variant="label" color={tint} style={styles.itemLabel}>
                {route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };
}
const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 88,
    paddingBottom: 24,
    backgroundColor: colors.tabBar.bg,
    borderTopWidth: 1,
    borderTopColor: colors.tabBar.border,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { letterSpacing: 0.5 },
});
```
(Real backdrop blur is deferred per ADR-003; the translucent `tabBar.bg`
token approximates it for M2.)

- [ ] **Step 4: Write the navigator**

`src/app/AppNavigator.tsx`:
```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { scene } from '../core/scene';
import { colors } from '../shared/tokens';
import { MOCK_PLACE } from '../features/teraz/mockData';
import { TerazScreen } from '../features/teraz/TerazScreen';
import { MiejscaScreen } from '../features/miejsca/MiejscaScreen';
import { UstawieniaScreen } from '../features/ustawienia/UstawieniaScreen';
import { makeTabBar } from './TabBar';

const Tab = createBottomTabNavigator();

const activeTints = {
  Teraz: scene(MOCK_PLACE.index).key,
  Miejsca: colors.accent,
  Ustawienia: colors.accent,
};
const tabBar = makeTabBar(activeTints);

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Teraz"
        tabBar={tabBar}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Teraz" component={TerazScreen} />
        <Tab.Screen name="Miejsca" component={MiejscaScreen} />
        <Tab.Screen name="Ustawienia" component={UstawieniaScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 5: Rewrite App.tsx**

`App.tsx`:
```tsx
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/app/AppNavigator';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
```

- [ ] **Step 6: Write the failing navigator test**

`src/app/__tests__/AppNavigator.test.tsx`:
```tsx
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent, within } from '@testing-library/react-native';
import { AppNavigator } from '../AppNavigator';
import { scene } from '../../core/scene';
import { MOCK_PLACE } from '../../features/teraz/mockData';
import { colors } from '../../shared/tokens';

const colorOf = (node: any) => StyleSheet.flatten(node.props.style).color;

test('AC-9: three tabs, Teraz active, hero visible', () => {
  render(<AppNavigator />);
  expect(screen.getByTestId('tab-Teraz')).toBeTruthy();
  expect(screen.getByTestId('tab-Miejsca')).toBeTruthy();
  expect(screen.getByTestId('tab-Ustawienia')).toBeTruthy();
  expect(screen.getByText('TWOJA LOKALIZACJA')).toBeTruthy();
  expect(screen.getByText('118')).toBeTruthy();
});

test('AC-10: tapping tabs switches to placeholder screens', () => {
  render(<AppNavigator />);
  fireEvent.press(screen.getByTestId('tab-Miejsca'));
  expect(screen.getByTestId('screen-miejsca')).toBeTruthy();
  expect(screen.queryByText('TWOJA LOKALIZACJA')).toBeNull();
  fireEvent.press(screen.getByTestId('tab-Ustawienia'));
  expect(screen.getByTestId('screen-ustawienia')).toBeTruthy();
});

test('AC-11: tab tints — Teraz=key, others=accent, inactive dim', () => {
  render(<AppNavigator />);
  const key = scene(MOCK_PLACE.index).key;
  expect(colorOf(within(screen.getByTestId('tab-Teraz')).getByText('Teraz'))).toBe(key);
  expect(colorOf(within(screen.getByTestId('tab-Miejsca')).getByText('Miejsca'))).toBe(colors.text.inactive);
  fireEvent.press(screen.getByTestId('tab-Miejsca'));
  expect(colorOf(within(screen.getByTestId('tab-Miejsca')).getByText('Miejsca'))).toBe(colors.accent);
});
```

- [ ] **Step 7: Replace the default-template App test**

Replace `__tests__/App.test.tsx`:
```tsx
import { render } from '@testing-library/react-native';
import App from '../App';

test('App renders without crashing', () => {
  const { getByText } = render(<App />);
  expect(getByText('TWOJA LOKALIZACJA')).toBeTruthy();
});
```

- [ ] **Step 8: Run the full suite + lint + typecheck**

Run: `npm test && npm run lint && npm run typecheck`
Expected: all green. If navigation rendering fails under Jest (screens / safe-area), add the mocks noted in Task 2 Step 4 — 3-attempt cap.

- [ ] **Step 9: Commit**

```bash
git add src/features/teraz/TerazScreen.tsx src/features/miejsca src/features/ustawienia src/app App.tsx __tests__/App.test.tsx
git commit -m "feat(app): Teraz screen + 3-tab navigation with custom tab bar (AC-9..11)"
```

---

### Task 7: Verification, visual evidence & docs

**Files:**
- Create: `docs/harness/02-teraz-hero.md` (harness journal)
- Modify: `docs/specs/002-teraz-hero.md` (Status → implemented)
- Create: PR screenshot evidence (attached to PR, not committed) for AC-14

**Interfaces:**
- Consumes: everything above.
- Produces: the feature-loop review/verify artifacts and the merge-ready branch.

- [ ] **Step 1: Full green gate**

Run: `npm test -- --coverage && npm run lint && npm run typecheck`
Expected: all pass; `src/core` coverage still 100%.

- [ ] **Step 2: Build + screenshot on the iOS simulator (AC-14)**

Run: `npm run ios` (or via Xcode). Confirm on the simulator: dominant ~128pt
index number in the key color with a visible glow; deep→mid gradient fills
the screen; band name + advice legible; 88px translucent tab bar with Teraz
tinted the key color. Capture a screenshot for the PR. Confirm **no new
console warnings** (DoD).

- [ ] **Step 3: Write the harness journal**

`docs/harness/02-teraz-hero.md`: what harness pieces M2 added (reviewer
agent; import-boundary + no-hex lint), which failure/need each addresses,
approximate token/cost spend, and a retro placeholder (filled at merge).
Follow the shape of `docs/harness/01-scene-engine.md`.

- [ ] **Step 4: Flip the spec status**

In `docs/specs/002-teraz-hero.md`, change `**Status:** draft` → `**Status:** implemented`.

- [ ] **Step 5: Commit docs**

```bash
git add docs/harness/02-teraz-hero.md docs/specs/002-teraz-hero.md
git commit -m "docs(m2): harness journal 02 + spec 002 status implemented"
```

- [ ] **Step 6: REVIEW — dispatch the reviewer agent**

Dispatch the `reviewer` agent (feature-loop step 6) with base `develop` and
spec `docs/specs/002-teraz-hero.md`. Fix blockers/should-fix or record an
explicit waiver.

- [ ] **Step 7: VERIFY — dispatch the verifier agent**

Dispatch the `verifier` agent with the spec path and a report path. Confirm
every AC-1…AC-13 is VERIFIED and AC-14 is MANUAL-OK (screenshot attached).

- [ ] **Step 8: Open the PR to `develop`**

Push `feature/m2-teraz-hero`; open a PR into `develop` with the diff, spec,
review report, verification report, and the simulator screenshot. Human
review is step 8; merge (step 9) + retro (step 10) follow.

---

## Self-Review

**Spec coverage** — every AC maps to a task:
- AC-1 → Task 3 · AC-2…7 → Task 5 · AC-8 → Task 4 · AC-9…11 → Task 6 ·
  AC-12 → Task 5 · AC-13 → Task 2 (lint) · AC-14 → Task 7 (manual).
- ADR-003/004/005 → Task 1 · reviewer agent → Task 2 · import-boundary lint
  → Task 2 · harness journal + spec status → Task 7.

**Type consistency** — `Place`/`MOCK_PLACE` (Task 5) consumed unchanged in
Tasks 6; `scene`/`Scene` from M1 core; `type`/`colors`/`spacing` shapes match
between Task 3 definition and Tasks 4–6 use; `makeTabBar(activeTints)` return
type consumed as `tabBar` prop in Task 6; `GradientBackground`/`Text` props
match between Task 4 and consumers.

**Placeholder scan** — no TBD/TODO; every code step carries real code; the
only deliberate deferrals (radial glow/double shadow, backdrop blur, tab
icons) are documented in the spec §Non-goals / ADR-003, not left implicit.

**Known execution risks (flagged, not blockers):** native mocks for
`react-native-screens`/`safe-area-context` under Jest may need the extra mock
in Task 2 Step 4; `pod install` may be unavailable in the sandbox (Jest does
not need it; defer to the Task 7 simulator build). 3-attempt gate-failure cap
applies to both.
