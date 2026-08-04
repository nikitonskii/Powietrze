# M1 Scene Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pure-TypeScript scene engine in `src/core/scene` (colors, bands, advice, derived pollutants, density from one CAQI value), 100%-covered, plus two harness deliverables: the coverage gate and the verifier agent.

**Architecture:** Small single-responsibility modules under `src/core/scene/` with one public entry (`index.ts`). No React anywhere in `src/core`. Contract: `docs/specs/001-scene-engine.md` (AC-1…AC-13) — every exact value below comes from that spec.

**Tech Stack:** TypeScript strict, Jest (`@react-native/jest-preset`). Zero new dependencies.

## Global Constraints

- Spec of record: `docs/specs/001-scene-engine.md`. Test names cite AC IDs: `test('AC-3: …')`.
- All color strings are lowercase `#rrggbb` (AC-6) — including the `ANCHORS` constants (normalized form of the design table).
- `src/core` imports nothing from `react`, `react-native`, or IO modules (AC-13).
- TypeScript strict; `any` forbidden without an inline justification comment.
- Files ≤ 200 lines, functions ≤ 40 lines.
- No bitwise operators — parse hex channels with `parseInt(hex.slice(…), 16)`.
- No new dependencies; never edit `design/`; never push.
- Work on branch `feature/m1-scene-engine` in a worktree.

---

### Task 1: Types + anchor data

**Files:**
- Create: `src/core/scene/types.ts`
- Create: `src/core/scene/anchors.ts`
- Test: `src/core/scene/__tests__/anchors.test.ts`

**Interfaces:**
- Produces: types `ColorProp`, `Rgb`, `BandIndex`, `BandName`, `Anchor`, `Scene`; constants `ANCHORS`, `BANDS`, `ADVICE` — consumed by every later task.

- [ ] **Step 1: Write the failing test**

```ts
// src/core/scene/__tests__/anchors.test.ts
import { ADVICE, ANCHORS, BANDS } from '../anchors';

const HEX = /^#[0-9a-f]{6}$/;

test('AC-1: six anchors, ascending stops, lowercase hex colors', () => {
  expect(ANCHORS).toHaveLength(6);
  expect(ANCHORS.map(a => a.v)).toEqual([12, 38, 63, 88, 125, 175]);
  for (const a of ANCHORS) {
    expect(a.key).toMatch(HEX);
    expect(a.deep).toMatch(HEX);
    expect(a.mid).toMatch(HEX);
  }
});

test('AC-8: six band names and six advice strings, index-aligned', () => {
  expect(BANDS).toHaveLength(6);
  expect(ADVICE).toHaveLength(6);
  expect(BANDS[4]).toBe('Zły');
  expect(ADVICE[4]).toBe('Zostań w domu. Zamknij okna, unikaj wysiłku.');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/core/scene/__tests__/anchors.test.ts`
Expected: FAIL — cannot find module `../anchors`

- [ ] **Step 3: Implement**

```ts
// src/core/scene/types.ts
export type ColorProp = 'key' | 'deep' | 'mid';
export type Rgb = readonly [number, number, number];
export type BandIndex = 0 | 1 | 2 | 3 | 4 | 5;
export type BandName =
  | 'Bardzo dobry'
  | 'Dobry'
  | 'Umiarkowany'
  | 'Dostateczny'
  | 'Zły'
  | 'Bardzo zły';

export interface Anchor {
  readonly v: number;
  readonly key: string;
  readonly deep: string;
  readonly mid: string;
}

export interface Scene {
  readonly key: string;
  readonly deep: string;
  readonly mid: string;
  readonly rgb: Rgb;
  readonly band: BandName;
  readonly advice: string;
  readonly pm25: number;
  readonly pm10: number;
  readonly no2: number;
  readonly density: number;
}
```

```ts
// src/core/scene/anchors.ts
import type { Anchor, BandName } from './types';

export const ANCHORS: readonly Anchor[] = [
  { v: 12, key: '#5fe3a1', deep: '#04231a', mid: '#0a3a2a' },
  { v: 38, key: '#a8e063', deep: '#0c2a16', mid: '#173d1f' },
  { v: 63, key: '#f5c63d', deep: '#241b05', mid: '#3d2e08' },
  { v: 88, key: '#ff9147', deep: '#2a1305', mid: '#43200a' },
  { v: 125, key: '#ff5c5c', deep: '#2b0b0b', mid: '#451212' },
  { v: 175, key: '#c77dff', deep: '#1c0720', mid: '#2e0f35' },
];

export const BANDS: readonly BandName[] = [
  'Bardzo dobry',
  'Dobry',
  'Umiarkowany',
  'Dostateczny',
  'Zły',
  'Bardzo zły',
];

export const ADVICE: readonly string[] = [
  'Powietrze czyste. Idealny czas na spacer i sport.',
  'Jakość dobra. Można spokojnie wyjść na zewnątrz.',
  'Umiarkowanie. Wrażliwi — rozważcie krótszy wysiłek.',
  'Ogranicz długie i intensywne aktywności na zewnątrz.',
  'Zostań w domu. Zamknij okna, unikaj wysiłku.',
  'Powietrze bardzo szkodliwe. Nie wychodź bez potrzeby.',
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/core/scene/__tests__/anchors.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/core/scene
git commit -m "feat(core): scene types and anchor data (AC-1, AC-8 data)"
```

---

### Task 2: Color helpers + input validation

**Files:**
- Create: `src/core/scene/color.ts`
- Create: `src/core/scene/validate.ts`
- Test: `src/core/scene/__tests__/color.test.ts`

**Interfaces:**
- Produces: `hexToRgb(hex: string): Rgb`, `rgbToHex(rgb: readonly number[]): string`, `lerpRgb(a: Rgb, b: Rgb, t: number): Rgb`, `assertFiniteIndex(v: number): void`.

- [ ] **Step 1: Write the failing test**

```ts
// src/core/scene/__tests__/color.test.ts
import { hexToRgb, lerpRgb, rgbToHex } from '../color';
import { assertFiniteIndex } from '../validate';

test('AC-2: hexToRgb and rgbToHex round-trip with per-channel rounding', () => {
  expect(hexToRgb('#5fe3a1')).toEqual([95, 227, 161]);
  expect(rgbToHex([95, 227, 161])).toBe('#5fe3a1');
  expect(rgbToHex([206.5, 211.4, 80.6])).toBe('#cfd351'); // rounds per channel
  expect(rgbToHex([0, 7, 255])).toBe('#0007ff'); // zero-pads
});

test('AC-2: lerpRgb interpolates linearly without rounding', () => {
  expect(lerpRgb([0, 100, 200], [10, 0, 250], 0.5)).toEqual([5, 50, 225]);
  expect(lerpRgb([0, 100, 200], [10, 0, 250], 0)).toEqual([0, 100, 200]);
  expect(lerpRgb([0, 100, 200], [10, 0, 250], 1)).toEqual([10, 0, 250]);
});

test('AC-12: assertFiniteIndex throws RangeError on non-finite input', () => {
  expect(() => assertFiniteIndex(NaN)).toThrow(RangeError);
  expect(() => assertFiniteIndex(Infinity)).toThrow(RangeError);
  expect(() => assertFiniteIndex(-Infinity)).toThrow(RangeError);
  expect(() => assertFiniteIndex(74)).not.toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/core/scene/__tests__/color.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement**

```ts
// src/core/scene/color.ts
import type { Rgb } from './types';

export function hexToRgb(hex: string): Rgb {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export function rgbToHex(rgb: readonly number[]): string {
  return `#${rgb
    .map(c => Math.round(c).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}
```

```ts
// src/core/scene/validate.ts
export function assertFiniteIndex(v: number): void {
  if (!Number.isFinite(v)) {
    throw new RangeError(`CAQI index must be a finite number, got: ${v}`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/core/scene/__tests__/color.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/core/scene
git commit -m "feat(core): color helpers and finite-input guard (AC-2, AC-12)"
```

---

### Task 3: `ramp()`

**Files:**
- Create: `src/core/scene/ramp.ts`
- Test: `src/core/scene/__tests__/ramp.test.ts`

**Interfaces:**
- Consumes: `ANCHORS`, `hexToRgb`/`rgbToHex`/`lerpRgb`, `assertFiniteIndex`, `ColorProp`.
- Produces: `ramp(v: number, prop: ColorProp): string`.

- [ ] **Step 1: Write the failing test**

```ts
// src/core/scene/__tests__/ramp.test.ts
import { ANCHORS } from '../anchors';
import { ramp } from '../ramp';
import type { ColorProp } from '../types';

const PROPS: readonly ColorProp[] = ['key', 'deep', 'mid'];
const channels = (hex: string): number[] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const maxChannelDiff = (a: string, b: string): number =>
  Math.max(
    ...channels(a).map((c, i) => Math.abs(c - channels(b)[i])),
  );

test('AC-1: anchor stops return the anchor color exactly', () => {
  for (const a of ANCHORS) {
    for (const p of PROPS) {
      expect(ramp(a.v, p)).toBe(a[p]);
    }
  }
  expect(ramp(63, 'key')).toBe('#f5c63d');
});

test('AC-2: values between anchors interpolate linearly per channel', () => {
  expect(ramp(50, 'key')).toBe('#cdd451'); // t = 0.48 between #a8e063 and #f5c63d
});

test('AC-3: 74 and 76 are near-identical across the band boundary', () => {
  expect(ramp(74, 'key')).toBe('#f9af41');
  expect(ramp(76, 'key')).toBe('#faaa42');
  expect(maxChannelDiff(ramp(74, 'key'), ramp(76, 'key'))).toBeLessThanOrEqual(6);
});

test('AC-4: adjacent integers never differ by more than 5 per channel (0–200)', () => {
  for (let v = 0; v <= 200; v++) {
    for (const p of PROPS) {
      expect(maxChannelDiff(ramp(v, p), ramp(v + 1, p))).toBeLessThanOrEqual(5);
    }
  }
});

test('AC-5: values outside the anchor range clamp to the end anchors', () => {
  expect(ramp(0, 'key')).toBe(ramp(12, 'key'));
  expect(ramp(-3, 'key')).toBe(ANCHORS[0].key);
  expect(ramp(200, 'mid')).toBe('#2e0f35');
  expect(ramp(999, 'deep')).toBe(ANCHORS[5].deep);
});

test('AC-6: every output is a lowercase #rrggbb string (0–200 scan)', () => {
  for (let v = 0; v <= 200; v++) {
    for (const p of PROPS) {
      expect(ramp(v, p)).toMatch(/^#[0-9a-f]{6}$/);
    }
  }
});

test('AC-12: ramp throws RangeError on non-finite input', () => {
  expect(() => ramp(NaN, 'key')).toThrow(RangeError);
  expect(() => ramp(Infinity, 'mid')).toThrow(RangeError);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/core/scene/__tests__/ramp.test.ts`
Expected: FAIL — cannot find module `../ramp`

- [ ] **Step 3: Implement**

```ts
// src/core/scene/ramp.ts
import { ANCHORS } from './anchors';
import { hexToRgb, lerpRgb, rgbToHex } from './color';
import type { ColorProp } from './types';
import { assertFiniteIndex } from './validate';

export function ramp(v: number, prop: ColorProp): string {
  assertFiniteIndex(v);
  const first = ANCHORS[0];
  const last = ANCHORS[ANCHORS.length - 1];
  if (v <= first.v) {
    return first[prop];
  }
  if (v >= last.v) {
    return last[prop];
  }
  let i = 1;
  while (ANCHORS[i].v < v) {
    i += 1;
  }
  const lo = ANCHORS[i - 1];
  const hi = ANCHORS[i];
  const t = (v - lo.v) / (hi.v - lo.v);
  return rgbToHex(lerpRgb(hexToRgb(lo[prop]), hexToRgb(hi[prop]), t));
}
```

Note: the `while` loop always terminates with a valid `i` because the two
clamp guards guarantee `first.v < v < last.v` — no unreachable fallback
branch, which keeps branch coverage at 100%.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/core/scene/__tests__/ramp.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/core/scene
git commit -m "feat(core): ramp color interpolation (AC-1..AC-6, AC-12)"
```

---

### Task 4: `bandOf()`

**Files:**
- Create: `src/core/scene/band.ts`
- Test: `src/core/scene/__tests__/band.test.ts`

**Interfaces:**
- Produces: `bandOf(v: number): BandIndex`.

- [ ] **Step 1: Write the failing test**

```ts
// src/core/scene/__tests__/band.test.ts
import { bandOf } from '../band';

test.each([
  [0, 0],
  [25, 0],
  [26, 1],
  [50, 1],
  [51, 2],
  [75, 2],
  [76, 3],
  [100, 3],
  [101, 4],
  [150, 4],
  [151, 5],
  [200, 5],
] as const)('AC-7: bandOf(%i) is band %i', (v, expected) => {
  expect(bandOf(v)).toBe(expected);
});

test('AC-12: bandOf throws RangeError on non-finite input', () => {
  expect(() => bandOf(NaN)).toThrow(RangeError);
  expect(() => bandOf(-Infinity)).toThrow(RangeError);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/core/scene/__tests__/band.test.ts`
Expected: FAIL — cannot find module `../band`

- [ ] **Step 3: Implement**

```ts
// src/core/scene/band.ts
import type { BandIndex } from './types';
import { assertFiniteIndex } from './validate';

export function bandOf(v: number): BandIndex {
  assertFiniteIndex(v);
  if (v <= 25) {
    return 0;
  }
  if (v <= 50) {
    return 1;
  }
  if (v <= 75) {
    return 2;
  }
  if (v <= 100) {
    return 3;
  }
  if (v <= 150) {
    return 4;
  }
  return 5;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/core/scene/__tests__/band.test.ts`
Expected: PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
git add src/core/scene
git commit -m "feat(core): bandOf thresholds (AC-7, AC-12)"
```

---

### Task 5: `scene()` + public entry point

**Files:**
- Create: `src/core/scene/scene.ts`
- Create: `src/core/scene/index.ts`
- Test: `src/core/scene/__tests__/scene.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: `scene(v: number): Scene`; `src/core/scene/index.ts` re-exporting the full public API of spec 001 — the import path all later milestones use.

- [ ] **Step 1: Write the failing test**

```ts
// src/core/scene/__tests__/scene.test.ts
import { scene } from '../index';

const channels = (hex: string): number[] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

test.each([
  [12, 'Bardzo dobry', 'Powietrze czyste. Idealny czas na spacer i sport.'],
  [38, 'Dobry', 'Jakość dobra. Można spokojnie wyjść na zewnątrz.'],
  [63, 'Umiarkowany', 'Umiarkowanie. Wrażliwi — rozważcie krótszy wysiłek.'],
  [88, 'Dostateczny', 'Ogranicz długie i intensywne aktywności na zewnątrz.'],
  [125, 'Zły', 'Zostań w domu. Zamknij okna, unikaj wysiłku.'],
  [175, 'Bardzo zły', 'Powietrze bardzo szkodliwe. Nie wychodź bez potrzeby.'],
])('AC-8: scene(%i) carries band "%s" and its advice verbatim', (v, band, advice) => {
  const s = scene(v);
  expect(s.band).toBe(band);
  expect(s.advice).toBe(advice);
});

test('AC-7: band boundaries 25/26, 75/76 flip the name, not the continuity', () => {
  expect(scene(25).band).toBe('Bardzo dobry');
  expect(scene(26).band).toBe('Dobry');
  expect(scene(75).band).toBe('Umiarkowany');
  expect(scene(76).band).toBe('Dostateczny');
});

test('AC-9: derived pollutants for scene(118) are 122 / 189 / 68', () => {
  const s = scene(118);
  expect(s.pm25).toBe(122); // round(118 × 1.03)
  expect(s.pm10).toBe(189); // round(122 × 1.55) — from the ROUNDED pm25
  expect(s.no2).toBe(68); // round(18 + 118 × 0.42)
});

test('AC-10: density is clamp(pm25/135, 0.03, 1)', () => {
  expect(scene(0).density).toBe(0.03); // floor
  expect(scene(11).density).toBeCloseTo(11 / 135, 10);
  expect(scene(150).density).toBe(1); // pm25 = 155, capped
});

test('AC-11: negative input clamps to zero before any derivation', () => {
  expect(scene(-10)).toEqual(scene(0));
  expect(scene(-10).pm25).toBe(0);
});

test('AC-12: scene throws RangeError on non-finite input', () => {
  expect(() => scene(NaN)).toThrow(RangeError);
  expect(() => scene(Infinity)).toThrow(RangeError);
});

test('AC-13: scene is deterministic and rgb mirrors the key color', () => {
  const a = scene(74);
  const b = scene(74);
  expect(a).toEqual(b);
  expect([...a.rgb]).toEqual(channels(a.key));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/core/scene/__tests__/scene.test.ts`
Expected: FAIL — cannot find module `../index`

- [ ] **Step 3: Implement**

```ts
// src/core/scene/scene.ts
import { ADVICE, BANDS } from './anchors';
import { bandOf } from './band';
import { hexToRgb } from './color';
import { ramp } from './ramp';
import type { Scene } from './types';
import { assertFiniteIndex } from './validate';

const DENSITY_FLOOR = 0.03;
const DENSITY_PM25_CEILING = 135;

export function scene(v: number): Scene {
  assertFiniteIndex(v);
  const index = Math.max(0, v);
  const key = ramp(index, 'key');
  const bandIndex = bandOf(index);
  const pm25 = Math.round(index * 1.03);
  return {
    key,
    deep: ramp(index, 'deep'),
    mid: ramp(index, 'mid'),
    rgb: hexToRgb(key),
    band: BANDS[bandIndex],
    advice: ADVICE[bandIndex],
    pm25,
    pm10: Math.round(pm25 * 1.55),
    no2: Math.round(18 + index * 0.42),
    density: Math.min(1, Math.max(DENSITY_FLOOR, pm25 / DENSITY_PM25_CEILING)),
  };
}
```

```ts
// src/core/scene/index.ts
export { ADVICE, ANCHORS, BANDS } from './anchors';
export { bandOf } from './band';
export { ramp } from './ramp';
export { scene } from './scene';
export type {
  Anchor,
  BandIndex,
  BandName,
  ColorProp,
  Rgb,
  Scene,
} from './types';
```

- [ ] **Step 4: Run full suite to verify it passes**

Run: `npx jest src/core`
Expected: PASS (all scene-engine tests)

- [ ] **Step 5: Commit**

```bash
git add src/core/scene
git commit -m "feat(core): scene() and public entry point (AC-7..AC-13)"
```

---

### Task 6: Purity scan + coverage gate

**Files:**
- Create: `src/core/scene/__tests__/purity.test.ts`
- Modify: `jest.config.js`
- Modify: `.github/workflows/ci.yml` (line 20: `- run: npm test -- --ci`)

**Interfaces:**
- Consumes: the finished `src/core/scene` tree.
- Produces: the harness's coverage gate — CI fails below 100% on `src/core`.

- [ ] **Step 1: Write the purity test**

```ts
// src/core/scene/__tests__/purity.test.ts
import * as fs from 'fs';
import * as path from 'path';

const FORBIDDEN = /(?:from|import)\s+['"](react|react-native|react-dom|fs|net|http|https)(\/[^'"]*)?['"]/;

function tsSourcesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '__tests__') {
      out.push(...tsSourcesUnder(p));
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

test('AC-13: src/core sources import no React, React Native, or IO modules', () => {
  const coreRoot = path.resolve(__dirname, '..', '..');
  expect(path.basename(coreRoot)).toBe('core');
  const sources = tsSourcesUnder(coreRoot);
  expect(sources.length).toBeGreaterThan(0);
  const offenders = sources.filter(f =>
    FORBIDDEN.test(fs.readFileSync(f, 'utf8')),
  );
  expect(offenders).toEqual([]);
});
```

- [ ] **Step 2: Run it — must pass already**

Run: `npx jest src/core/scene/__tests__/purity.test.ts`
Expected: PASS. Then prove it can fail (RED evidence): temporarily add
`import 'react-native';` to `src/core/scene/validate.ts`, re-run, expect
FAIL listing that file, revert the line, re-run, expect PASS. (The
post-edit hook may also complain during the probe — that is expected;
revert immediately after capturing the failure.)

- [ ] **Step 3: Add the coverage gate**

```js
// jest.config.js — replace the whole file with:
module.exports = {
  preset: '@react-native/jest-preset',
  collectCoverageFrom: ['src/core/**/*.ts'],
  coverageThreshold: {
    './src/core/': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
};
```

In `.github/workflows/ci.yml`, change the test step to:

```yaml
      - run: npm test -- --ci --coverage
```

- [ ] **Step 4: Verify the gate**

Run: `npm test -- --coverage`
Expected: PASS with `src/core` at 100/100/100/100. Also run
`npm run lint` and `npm run typecheck` — both green.

- [ ] **Step 5: Commit**

```bash
git add src/core/scene/__tests__/purity.test.ts jest.config.js .github/workflows/ci.yml
git commit -m "test(core): purity scan and 100% coverage gate on src/core (AC-13)"
```

---

### Task 7: Verifier agent

**Files:**
- Create: `.claude/agents/verifier.md`

**Interfaces:**
- Produces: the `verifier` subagent used at step 7 (VERIFY) of the feature loop, from this milestone onward.

- [ ] **Step 1: Write the agent definition**

```markdown
---
name: verifier
description: Audits every AC ID in a spec against executable evidence — runs the tests itself, never trusts reports. Use at step 7 (VERIFY) of the feature loop, after review, before human review.
tools: Bash, Read, Grep, Glob
model: sonnet
---

You are the acceptance-criteria verifier for this repository. You audit
claims; you do not fix code.

Input (from the dispatching prompt): a spec path in `docs/specs/`, and a
report file path you MUST write your audit to before your final message.

Procedure:
1. Read the spec. List every AC ID it defines.
2. For each AC ID, find the test(s) naming it: `grep -rn "AC-<n>" src/ --include="*.test.*"`.
3. Run the relevant suites yourself with `npx jest <path>` — the
   implementer's or reviewer's word is not evidence. Never modify source
   or test files.
4. For visual/manual criteria, look for recorded evidence referenced in
   the spec's Verification section; absence is a finding, not a pass.

Write to the report file a table — one row per AC ID:
| AC | Verdict | Evidence |
Verdicts: VERIFIED (named test exists and passed in your run) · FAILED
(test exists, fails) · UNTESTED (no test names this ID) · MANUAL-OK /
MANUAL-MISSING (visual criteria). Below the table: exact commands run and
a copy of the final Jest summary lines.

An AC with a test that asserts nothing, or a test citing an ID but
checking a different behavior than the AC text, is UNTESTED — say so.
Your final message: one line per non-VERIFIED AC plus the report path.
```

- [ ] **Step 2: Validate**

Run: `cat .claude/agents/verifier.md` — confirm frontmatter has `name`,
`description`, `tools`, `model` keys and the body matches. (Agent files
are picked up by filename; no build step.)

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/verifier.md
git commit -m "feat(harness): verifier agent for AC audits"
```

---

### Task 8: Journal + spec status

**Files:**
- Create: `docs/harness/01-scene-engine.md`
- Modify: `docs/specs/001-scene-engine.md` (Status line only: `**Status:** approved` → `**Status:** implemented`)

- [ ] **Step 1: Write the journal entry**

```markdown
# Harness journal 01 — M1: Scene engine

**Milestone:** M1 · **Spec:** `docs/specs/001-scene-engine.md` · **Branch:** `feature/m1-scene-engine`

## What the harness gained
- **Spec template + first real spec** (`docs/specs/TEMPLATE.md`, `001`):
  13 ACs with computed expected values; every test cites an AC ID.
- **Verifier agent** (`.claude/agents/verifier.md`): audits AC IDs against
  its own test runs at step 7 of the feature loop — reports to a file.
- **Coverage gate:** `src/core` pinned at 100% (statements/branches/
  functions/lines) in `jest.config.js`; CI now runs `--coverage`.

## What the app gained
`src/core/scene`: `scene()`, `ramp()`, `bandOf()`, anchor/band/advice
data — the single source every visual derives from (spec 001 API).

## Deviations from the prototype (all spec'd, none silent)
- Hex output normalized to lowercase (prototype was mixed-case by path).
- Non-finite input throws `RangeError` (prototype mapped `NaN` to the
  worst band silently); negative input clamps to 0.

## Retro
<!-- Filled at step 10 with corrections from review/verify/human. -->
```

- [ ] **Step 2: Flip the spec status line to `implemented`**

- [ ] **Step 3: Run all three checks**

Run: `npm run lint && npm run typecheck && npm test`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add docs/harness/01-scene-engine.md docs/specs/001-scene-engine.md
git commit -m "docs: harness journal 01 and spec 001 status"
```

---

## Model selection (for the executing controller)

- Tasks 1–6 contain the complete code above — transcription + testing:
  cheapest tier (haiku). Task 6's RED-evidence step included.
- Task 7–8 are prose transcription: cheapest tier.
- Task reviewers: mid tier (sonnet). Final whole-branch review: most
  capable available model.
