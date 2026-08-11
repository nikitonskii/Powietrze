# GIOŚ live value — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock index with a real GIOŚ PM2.5 reading for Kraków (station 400), derived to the app's index and driving the existing scene/hero/atmosphere, with loading + error-stale states.

**Architecture:** A pure `src/core/air` module owns the contract (`Reading`, `AirQualitySource`) and derivation (`indexFromPm25`, `formatFreshness`). A new `src/data/gios` layer implements the interface by fetching GIOŚ v1 directly (pure mappers isolate the JSON-LD Polish keys; the IO adapter takes an injected `fetch`). `src/features/teraz` consumes it via a React-context-injected source through a `useCurrentReading` hook; `TerazScreen` composes the `Reading` into `Hero`. `src/app` wires the real adapter.

**Tech Stack:** RN 0.86 global `fetch` (no new deps), TS strict, Jest + `@testing-library/react-native`, `eslint-plugin-boundaries`.

## Global Constraints

Copied from `CLAUDE.md` + `docs/specs/004-gios-live-value.md`; every task implicitly includes these.

- TypeScript strict; `any` forbidden without an inline justifying comment (GIOŚ JSON-LD is untyped external data — justify each `any`).
- Files ≤ 200 lines; functions ≤ 40. One responsibility per module (mappers pure, source IO — separate files).
- Imports flow `app → features → shared → core` **plus** a new `data` element: `app → data`, `data → core`; `features` consume only the core `Reading`/interface (adapter injected), never `data` directly.
- **No hard-coded hex** in `src/features/**`, `src/shared/ui/**`, `src/app/**`.
- **`src/core` stays pure** — zero React, zero IO. The fetch adapter lives in `src/data`.
- Behavior tests over snapshots; every test name cites its AC ID.
- Data/table values pinned by a literal fixture (AC-2). Mapper negatives use synthetic fixtures (not just the happy-path real one).
- Node 22.11+. `npm run lint`, `npm run typecheck`, `npm test` all green; `src/core` stays 100% coverage.
- Adding any dependency requires an ADR. No new npm deps here; ADR-009 records the direct-to-GIOŚ architecture.
- Never edit `design/`. Never push `main`; never force-push. Work stays on `feature/gios-live-value`.
- iOS build/run/screenshot run against the develop-lineage checkout with Powietrze's own Metro on 8081; needs the sandbox disabled and `api.gios.gov.pl` in the allowlist (Task 6).
- Exact GIOŚ keys (verified against the captured fixtures): sensors array `"Lista stanowisk pomiarowych dla podanej stacji"`, id `"Identyfikator stanowiska"`, discriminator `"Wskaźnik - kod"` (value `"PM2.5"`); data array `"Lista danych pomiarowych"`, value `"Wartość"`, time `"Data"`.

---

### Task 1: `core/air` — contract + derivation (AC-1, AC-2, AC-3)

**Files:**
- Create: `src/core/air/index.ts`
- Test: `src/core/air/__tests__/air.test.ts`

**Interfaces:**
- Produces: `Reading`, `AirQualitySource`, `PM25_INDEX_DIVISOR`, `indexFromPm25(pm25)`, `formatFreshness(measuredAt, now)`.

- [ ] **Step 1: Write the failing test** — `src/core/air/__tests__/air.test.ts`:
```ts
import { indexFromPm25, formatFreshness, PM25_INDEX_DIVISOR } from '../index';

describe('air derivation', () => {
  test('AC-1: indexFromPm25 = round(pm25 / 1.03)', () => {
    expect(indexFromPm25(5)).toBe(5);
    expect(indexFromPm25(122)).toBe(118);
    expect(indexFromPm25(180)).toBe(175);
    expect(indexFromPm25(0)).toBe(0);
  });
  test('AC-2: PM25_INDEX_DIVISOR literal', () => {
    expect(PM25_INDEX_DIVISOR).toBe(1.03);
  });
  test('AC-3: formatFreshness relative label', () => {
    const at = '2026-08-11 21:00:00';
    expect(formatFreshness(at, new Date('2026-08-11T21:12:00'))).toBe('12 min temu');
    expect(formatFreshness(at, new Date('2026-08-11T21:00:30'))).toBe('przed chwilą');
    expect(formatFreshness(at, new Date('2026-08-11T23:30:00'))).toBe('2 godz temu');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx jest src/core/air` → FAIL (cannot resolve `../index`).

- [ ] **Step 3: Write `src/core/air/index.ts`:**
```ts
export interface Reading {
  index: number;
  pm25: number;
  measuredAt: string;
  city: string;
  station: string;
}

export interface AirQualitySource {
  getCurrentReading(): Promise<Reading>;
}

export const PM25_INDEX_DIVISOR = 1.03;

export function indexFromPm25(pm25: number): number {
  return Math.round(pm25 / PM25_INDEX_DIVISOR);
}

// Relative freshness. `now` injected for tests. measuredAt "YYYY-MM-DD HH:mm:ss"
// is treated as device-local (the app is Poland-only; GIOŚ times are Europe/Warsaw).
export function formatFreshness(measuredAt: string, now: Date): string {
  const then = new Date(measuredAt.replace(' ', 'T'));
  const mins = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (mins < 1) return 'przed chwilą';
  if (mins < 60) return `${mins} min temu`;
  return `${Math.floor(mins / 60)} godz temu`;
}
```

- [ ] **Step 4: Verify** — `npx jest src/core/air --coverage --collectCoverageFrom='src/core/air/**' && npm run lint && npm run typecheck` → PASS, 100% coverage.
- [ ] **Step 5: Commit** — `git add src/core/air && git commit -m "feat(core): air Reading contract + indexFromPm25 + formatFreshness (AC-1..3)"`

---

### Task 2: `data` layer — boundaries + ADR-009 + GIOŚ constants + pure mappers (AC-4, AC-5)

**Files:**
- Modify: `.eslintrc.js` (add `data` boundaries element)
- Create: `docs/decisions/009-direct-gios.md`
- Create: `src/data/gios/constants.ts`, `src/data/gios/mappers.ts`, `src/data/gios/index.ts`
- Create synthetic fixtures: `src/data/gios/__fixtures__/{sensors_noPm25.json, getData_nullhead.json, getData_allnull.json}` (real `sensors400.json` + `getData2752.json` already committed)
- Test: `src/data/gios/__tests__/mappers.test.ts`

**Interfaces:**
- Consumes: nothing (pure). Produces: `GIOS_BASE`, `KRAKOW_STATION_ID`, `KRAKOW_STATION`, `findPm25SensorId(sensorsJson)`, `parseLatestPm25(getDataJson)`.

- [ ] **Step 1: Add the `data` boundaries element** in `.eslintrc.js` — under `settings['boundaries/elements']` add `{ type: 'data', pattern: 'src/data/*' }`; in the `policies`/rules add `data → [core]` and extend `app`'s allow to include `data`. (Match the existing v7 `policies` shape used since M2.) Keep everything else unchanged.

- [ ] **Step 2: Write ADR-009** — `docs/decisions/009-direct-gios.md`:
```markdown
# ADR 009: App calls GIOŚ directly (no owned proxy yet)

**Status:** accepted
**Context:** design/README specifies "the app queries the owned server, never
GIOŚ directly". No such server exists, and this milestone is a live-value-first
data slice. GIOŚ v1 is a free public REST API (no key), callable from a phone.
**Decision:** The app calls `api.gios.gov.pl/pjp-api/v1` directly, behind a
`src/core` `AirQualitySource` interface (a new `src/data/gios` adapter). A
proxy/cache can slot in behind the same interface later.
**Consequences:** Adds a `data` layer + boundaries rule. Amends the design's
proxy assumption (revisit if rate limits / caching bite). No runtime dep.
```

- [ ] **Step 3: Synthetic negative fixtures** — copy the real ones and edit:
  - `sensors_noPm25.json`: `sensors400.json` with the PM2.5 entry removed.
  - `getData_nullhead.json`: `getData2752.json` with the first two entries' `"Wartość"` set to `null` (so the mapper must skip to the third).
  - `getData_allnull.json`: `{"Lista danych pomiarowych": []}`.

- [ ] **Step 4: Write the failing mappers test** — `src/data/gios/__tests__/mappers.test.ts`:
```ts
import { findPm25SensorId, parseLatestPm25 } from '../mappers';
import sensors from '../__fixtures__/sensors400.json';
import sensorsNoPm25 from '../__fixtures__/sensors_noPm25.json';
import getData from '../__fixtures__/getData2752.json';
import nullHead from '../__fixtures__/getData_nullhead.json';
import allNull from '../__fixtures__/getData_allnull.json';

describe('gios mappers', () => {
  test('AC-4: findPm25SensorId → 2752', () => {
    expect(findPm25SensorId(sensors)).toBe(2752);
  });
  test('AC-4: no PM2.5 sensor throws', () => {
    expect(() => findPm25SensorId(sensorsNoPm25)).toThrow();
  });
  test('AC-5: parseLatestPm25 → latest non-null', () => {
    expect(parseLatestPm25(getData)).toEqual({ pm25: 5.0, measuredAt: '2026-08-11 21:00:00' });
  });
  test('AC-5: skips null-head entries', () => {
    const r = parseLatestPm25(nullHead);
    expect(r.pm25).not.toBeNull();
    expect(typeof r.pm25).toBe('number');
  });
  test('AC-5: all-null throws', () => {
    expect(() => parseLatestPm25(allNull)).toThrow();
  });
});
```
(Requires `resolveJsonModule` in tsconfig — verify it's on; RN's tsconfig usually allows JSON import via `esModuleInterop`. If import fails, `require` the fixtures instead.)

- [ ] **Step 5: Run to verify it fails** — `npx jest src/data/gios` → FAIL.

- [ ] **Step 6: Write `constants.ts` + `mappers.ts` + `index.ts`:**
```ts
// constants.ts
export const GIOS_BASE = 'https://api.gios.gov.pl/pjp-api/v1/rest';
export const KRAKOW_STATION_ID = 400;
export const KRAKOW_STATION = {
  city: 'Kraków',
  station: 'Aleja Krasińskiego · stacja GIOŚ',
};
```
```ts
// mappers.ts  — isolates GIOŚ JSON-LD Polish keys.
const SENSORS_KEY = 'Lista stanowisk pomiarowych dla podanej stacji';
const DATA_KEY = 'Lista danych pomiarowych';

/* eslint-disable @typescript-eslint/no-explicit-any */
// any: GIOŚ v1 returns untyped JSON-LD with Polish keys; typed at the boundary here.
export function findPm25SensorId(sensorsJson: any): number {
  const list: any[] = sensorsJson?.[SENSORS_KEY] ?? [];
  const s = list.find((e) => e['Wskaźnik - kod'] === 'PM2.5');
  if (!s) throw new Error('GIOŚ: no PM2.5 sensor for station');
  return s['Identyfikator stanowiska'];
}
export function parseLatestPm25(
  getDataJson: any,
): { pm25: number; measuredAt: string } {
  const list: any[] = getDataJson?.[DATA_KEY] ?? [];
  const e = list.find((x) => x['Wartość'] != null);
  if (!e) throw new Error('GIOŚ: no non-null PM2.5 reading');
  return { pm25: e['Wartość'], measuredAt: e['Data'] };
}
```
```ts
// index.ts
export * from './constants';
export * from './mappers';
export * from './source';
```
(Note: the `no-explicit-any` disable + comment satisfies the constitution's justified-`any` rule for external untyped data.)

- [ ] **Step 7: Verify** — `npx jest src/data/gios && npm run lint && npm run typecheck` (lint must pass incl. the new boundaries element; run a probe that `features → data` is disallowed if quick). PASS.
- [ ] **Step 8: Commit** — `git add .eslintrc.js docs/decisions/009-direct-gios.md src/data/gios && git commit -m "feat(data): gios constants + pure mappers, data boundary, ADR-009 (AC-4,5)"`

---

### Task 3: GIOŚ source adapter (AC-6)

**Files:**
- Create: `src/data/gios/source.ts`
- Test: `src/data/gios/__tests__/source.test.ts`

**Interfaces:**
- Consumes: `AirQualitySource`, `Reading`, `indexFromPm25` (core); mappers + constants (Task 2).
- Produces: `createGiosSource(fetchImpl?, stationId?): AirQualitySource`.

- [ ] **Step 1: Write the failing test** — `source.test.ts`:
```ts
import { createGiosSource } from '../source';
import sensors from '../__fixtures__/sensors400.json';
import getData from '../__fixtures__/getData2752.json';

test('AC-6: getCurrentReading composes a Reading and calls two URLs', async () => {
  const calls: string[] = [];
  const fakeFetch = ((url: string) => {
    calls.push(url);
    const body = url.includes('/sensors/') ? sensors : getData;
    return Promise.resolve({ json: () => Promise.resolve(body) });
  }) as unknown as typeof fetch;

  const reading = await createGiosSource(fakeFetch).getCurrentReading();
  expect(reading).toEqual({
    index: 5, pm25: 5.0, measuredAt: '2026-08-11 21:00:00',
    city: 'Kraków', station: 'Aleja Krasińskiego · stacja GIOŚ',
  });
  expect(calls).toEqual([
    'https://api.gios.gov.pl/pjp-api/v1/rest/station/sensors/400',
    'https://api.gios.gov.pl/pjp-api/v1/rest/data/getData/2752',
  ]);
});
```

- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Write `source.ts`:**
```ts
import type { AirQualitySource, Reading } from '../../core/air';
import { indexFromPm25 } from '../../core/air';
import { GIOS_BASE, KRAKOW_STATION, KRAKOW_STATION_ID } from './constants';
import { findPm25SensorId, parseLatestPm25 } from './mappers';

export function createGiosSource(
  fetchImpl: typeof fetch = fetch,
  stationId: number = KRAKOW_STATION_ID,
): AirQualitySource {
  return {
    async getCurrentReading(): Promise<Reading> {
      const sensors = await (
        await fetchImpl(`${GIOS_BASE}/station/sensors/${stationId}`)
      ).json();
      const sensorId = findPm25SensorId(sensors);
      const data = await (
        await fetchImpl(`${GIOS_BASE}/data/getData/${sensorId}`)
      ).json();
      const { pm25, measuredAt } = parseLatestPm25(data);
      return {
        index: indexFromPm25(pm25),
        pm25,
        measuredAt,
        city: KRAKOW_STATION.city,
        station: KRAKOW_STATION.station,
      };
    },
  };
}
```

- [ ] **Step 4: Verify** — `npx jest src/data/gios && npm run lint && npm run typecheck`. PASS.
- [ ] **Step 5: Commit** — `git add src/data/gios/source.ts src/data/gios/__tests__/source.test.ts && git commit -m "feat(data): gios source adapter — sensors→getData→Reading (AC-6)"`

---

### Task 4: `useCurrentReading` hook + context (AC-7)

**Files:**
- Create: `src/features/teraz/AirSourceContext.tsx`, `src/features/teraz/useCurrentReading.ts`
- Test: `src/features/teraz/__tests__/useCurrentReading.test.tsx`

**Interfaces:**
- Consumes: `AirQualitySource`, `Reading` (core). Produces: `AirSourceContext`, `AirSourceProvider`, `useCurrentReading()`.

- [ ] **Step 1: Write `AirSourceContext.tsx`** — a React context holding an `AirQualitySource`, with `AirSourceProvider({ source, children })`. Default context value throws if used without a provider (fail-fast).
- [ ] **Step 2: Write the failing hook test** — `useCurrentReading.test.tsx`: render a probe component inside `AirSourceProvider` with (a) a fake source resolving a fixed `Reading` → assert it exposes `status:'ready'` + the reading; (b) a fake source that rejects → assert `status:'stale'` and no throw. Use `findBy`/`waitFor` for the async transition.
- [ ] **Step 3: Run to verify it fails.**
- [ ] **Step 4: Write `useCurrentReading.ts`:**
```ts
import { useContext, useEffect, useState } from 'react';
import type { Reading } from '../../core/air';
import { AirSourceContext } from './AirSourceContext';

type State =
  | { status: 'loading'; reading?: Reading }
  | { status: 'ready'; reading: Reading }
  | { status: 'stale'; reading?: Reading };

export function useCurrentReading(): State {
  const source = useContext(AirSourceContext);
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    let active = true;
    source
      .getCurrentReading()
      .then((r) => active && setState({ status: 'ready', reading: r }))
      .catch(() =>
        active && setState((prev) => ({ status: 'stale', reading: prev.reading })),
      );
    return () => {
      active = false;
    };
  }, [source]);
  return state;
}
```

- [ ] **Step 5: Verify** — `npx jest src/features/teraz && npm run lint && npm run typecheck`. PASS.
- [ ] **Step 6: Commit** — `git add src/features/teraz/AirSourceContext.tsx src/features/teraz/useCurrentReading.ts src/features/teraz/__tests__/useCurrentReading.test.tsx && git commit -m "feat(teraz): AirSource context + useCurrentReading (AC-7)"`

---

### Task 5: Wire TerazScreen + Hero + app provider (AC-8)

**Files:**
- Modify: `src/features/teraz/TerazScreen.tsx`, `src/features/teraz/Hero.tsx`, `App.tsx` (or `src/app/AppNavigator.tsx`)
- Modify/Test: `src/features/teraz/__tests__/TerazScreen.test.tsx`
- (Delete or keep-as-test-only: `src/features/teraz/mockData.ts` — remove from the render path.)

**Interfaces:**
- Consumes: `useCurrentReading`, `formatFreshness`, `scene`, `GradientBackground`, `Atmosphere`, `Hero`, `createGiosSource`.

- [ ] **Step 1: Modify `Hero`** to show the **real** PM2.5 — add a `pm25: number` prop and render `PM2.5 · {Math.round(pm25)} µg/m³` instead of `scene.pm25`. Keep the rest.
- [ ] **Step 2: Rewrite `TerazScreen`** to consume the hook:
```tsx
export function TerazScreen() {
  const { reading } = useCurrentReading();
  if (!reading) {
    return <View testID="teraz-loading" style={styles.loading} />; // base-bg skeleton
  }
  const s = scene(reading.index);
  const place = {
    city: reading.city,
    station: reading.station,
    freshness: formatFreshness(reading.measuredAt, new Date()),
    index: reading.index,
  };
  return (
    <GradientBackground scene={s}>
      <Atmosphere scene={s} />
      <View style={styles.content}>
        <Hero scene={s} place={place} pm25={reading.pm25} />
      </View>
    </GradientBackground>
  );
}
```
(`styles.loading`: `flex:1, backgroundColor: colors.base`. No hex — use the token.)
- [ ] **Step 3: Wire the provider in `App.tsx`** — wrap `AppNavigator` in `<AirSourceProvider source={createGiosSource()}>`. `App.tsx`/`app` may import `data` (`createGiosSource`) and `features` (`AirSourceProvider`).
- [ ] **Step 4: Update `TerazScreen.test.tsx`** for AC-8 — render `TerazScreen` inside `AirSourceProvider` with a fake source resolving `Reading{index:118, pm25:122, city:'Kraków', station:'Aleja Krasińskiego · stacja GIOŚ', measuredAt:'…'}`; assert `getByText('118')`, `'Zły'`, `'Kraków'`, `'PM2.5 · 122 µg/m³'`, `getByTestId('atmosphere')`; and with a never-resolving source assert `getByTestId('teraz-loading')`. Also update `__tests__/App.test.tsx` if it asserted mock text — it should now await the provider's real/fake source (in the App test, the real GIOŚ source would hit the network; provide a fake or assert the loading state). Prefer: App test asserts it renders without crashing (loading state) — do not hit the network in Jest.
- [ ] **Step 5: Run the full suite + lint + typecheck** — `npm test && npm run lint && npm run typecheck`. All green. If `App.test.tsx` tries to fetch, mock `createGiosSource` or assert the loading state.
- [ ] **Step 6: Commit** — `git add src/features/teraz App.tsx && git commit -m "feat(teraz): drive Teraz from the live GIOŚ reading (AC-8)"`

---

### Task 6: Sandbox allowlist, live verification, docs, review/verify, merge (AC-9)

**Files:**
- Modify: `.claude/settings.json` (add `api.gios.gov.pl` to `sandbox.network.allowedDomains`)
- Create: `docs/harness/04-gios-live-value.md`; Modify: `docs/specs/004-gios-live-value.md` (Status → implemented)

- [ ] **Step 1: Add `api.gios.gov.pl`** to `.claude/settings.json` → `sandbox.network.allowedDomains` (so the running app + dev fetch reach GIOŚ). Commit separately: `chore(harness): allow api.gios.gov.pl for live GIOŚ data`.
- [ ] **Step 2: Full green gate** — `npm test -- --coverage && npm run lint && npm run typecheck`; `src/core` 100%.
- [ ] **Step 3: Build + capture live evidence (AC-9)** — ensure Powietrze's Metro on 8081 from this checkout; `npx react-native run-ios --simulator "iPhone 16 Pro"` (the app now fetches GIOŚ on launch). Screenshot Teraz showing Kraków's **real** current value (band/colour/atmosphere match the live index) + real "N min temu". Confirm no new console warnings. (Loading skeleton flashes first, then the value.)
- [ ] **Step 4: Harness journal + spec status** — `docs/harness/04-gios-live-value.md` (what this milestone added: the `data` layer, direct-GIOŚ, the fixture-fidelity + negative-fixture lesson the critic enforced; approx spend; retro placeholder). Flip spec 004 Status → implemented.
- [ ] **Step 5: Commit docs** — `git add docs/harness/04-gios-live-value.md docs/specs/004-gios-live-value.md && git commit -m "docs: harness journal 04 + spec 004 status implemented"`
- [ ] **Step 6: REVIEW + VERIFY** — dispatch the `reviewer` (base `develop`, spec 004) and `verifier` agents; fix blockers or record waivers. Confirm AC-1…AC-8 VERIFIED, AC-9 MANUAL-OK (screenshot).
- [ ] **Step 7: Merge to `develop`** — merge `feature/gios-live-value` into `develop` (like M2/M3); push. `develop → main` promotion stays human.

---

## Self-Review

**Spec coverage:** AC-1/2/3 → Task 1 · AC-4/5 → Task 2 (mappers + negative fixtures) · AC-6 → Task 3 (adapter, fake fetch, pinned URLs) · AC-7 → Task 4 (hook states) · AC-8 → Task 5 (compose + real pm25 + loading) · AC-9 → Task 6 (live screenshot) · `data` boundary + ADR-009 → Task 2 · sandbox allowlist → Task 6.

**Type consistency:** `Reading`/`AirQualitySource` (Task 1) consumed unchanged by the adapter (Task 3), hook (Task 4), screen (Task 5); `createGiosSource(fetchImpl?, stationId?)` signature stable; `Hero` gains a `pm25` prop (Task 5) consumed by `TerazScreen`; mapper return `{pm25, measuredAt}` matches `parseLatestPm25` between Task 2 and Task 3.

**Known execution risks (flagged, not blockers):** JSON fixture imports may need `resolveJsonModule`/`require` (Task 2 Step 4 note); `App.test.tsx` must not hit the network — provide a fake source or assert the loading state (Task 5 Step 4); the `features → data` boundary must stay disallowed — features consume only the core `Reading` (adapter injected via context); GIOŚ could rate-limit or a sensor could be all-null at run time (the stale path covers it).
