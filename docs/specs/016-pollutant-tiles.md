# Spec 016: Data-driven pollutant tiles (O₃/SO₂/CO/C₆H₆ where measured)

**Status:** draft
**Milestone:** M-pollutant-tiles · **No new dependency** (Skia/on-board only rule holds)
**Sources:** `design/README.md` (Teraz detail: pollutant tiles under the 24h chart); live GIOŚ v1 API (`station/sensors/{id}`, `data/getData/{sensorId}`)
**Critic:** SHIP-WITH-FIXES — B1/B2 + S1–S8 folded in (see `.superpowers/sdd/critic-016.md`).

## Problem
The Teraz detail shows exactly two hard-coded tiles — **PM10** and **NO₂**. But
the resolved station (Kraków default *or* whatever geolocation picks) measures a
different set of pollutants. Kraków/Al. Krasińskiego (station 400) measures
**PM10, NO₂, CO, C₆H₆** — but **not O₃ and not SO₂**. Other stations measure O₃
and/or SO₂ but not CO. Hard-coding any fixed set therefore either hides real data
or would render permanently-empty tiles.

## Scope
Make the tiles **data-driven**: render one tile per pollutant the resolved
station actually reports a current value for, from a fixed catalog, in a stable
priority order, laid out as a wrapping 2-column grid. Adds CO + C₆H₆ (and O₃/SO₂
wherever a station has them) with zero station-specific code.

**Supersedes `design/README.md:80`** (which mandates a fixed 2-tile PM10+NO₂
grid). `design/` is read-only (constitution), so this deviation is recorded here
and **needs human sign-off** at spec review. The tile *visuals* (glass, 1fr/1fr,
12px gap, fonts) are kept exactly; only the *set* becomes data-driven. (S1)

## Non-goals
- **Per-pollutant 24h history / sparklines** — the chart stays PM2.5-only. Tiles
  show the latest value only (deferred; would multiply fetches and redesign the chart).
- **Per-pollutant CAQI sub-indices / coloring** — tiles are neutral (glass), like
  today. The one CAQI value still drives the scene. No per-pollutant band math.
- **Unit conversion** — GIOŚ reports all six in µg/m³; the tile unit stays µg/m³.

## Design

### Core — pollutant catalog + model (`src/core/air`)
```ts
export type PollutantCode = 'PM10' | 'NO2' | 'O3' | 'SO2' | 'CO' | 'C6H6';
export interface PollutantSpec { code: PollutantCode; label: string }

// SINGLE SOURCE OF TRUTH for which pollutants can appear, their display label,
// and the stable render order. `code` is the canonical air-quality formula; it
// EQUALS the GIOŚ sensor code so the data layer passes it verbatim to
// findSensorId — no translation layer exists or is needed. (S7)
export const POLLUTANTS: readonly PollutantSpec[] = [
  { code: 'PM10', label: 'PM10' },
  { code: 'NO2',  label: 'NO₂' },
  { code: 'O3',   label: 'O₃' },
  { code: 'SO2',  label: 'SO₂' },
  { code: 'CO',   label: 'CO' },
  { code: 'C6H6', label: 'C₆H₆' },
];

// One measured pollutant with its latest value (µg/m³). `label` is NOT stored
// here — the UI derives it from POLLUTANTS by `code` (one home for label truth). (S6)
export interface PollutantReading { code: PollutantCode; value: number }

// ReadingDetail: history stays PM2.5-only; the two fixed fields are REPLACED by a
// catalog-ordered list (empty if none resolved).
export interface ReadingDetail { history: HourPoint[]; pollutants: PollutantReading[] }
```

### Core — small-magnitude formatting (`src/core/air`)
Benzene runs ~0.3 µg/m³; in "Przybliżona" (rounded) mode `formatConcentration`
renders it "0" — misleading. Add:
```ts
// Tile formatting. For 0 < value < 1, ALWAYS 2 decimals (e.g. "0.35") so a real
// sub-unit reading is never rounded away to "0". Otherwise defer to
// formatConcentration(value, precision) — so value ≥ 1 keeps today's behavior
// EXACTLY, and negatives (rare GIOŚ artifacts) take the same path as
// formatConcentration (NOT special-cased). value === 0 → "0". Non-finite → "—".
export function formatPollutant(value: number, precision: Precision): string;
```
`formatConcentration` is unchanged (hero µg/m³ number + PlaceRow keep using it);
`formatPollutant` is a clean delegation, not a fork of it.

### Data — resolve the catalog (`src/data/gios`)
Add a focused helper so `detailFor` stays a thin composition within the 40-line /
one-responsibility limits (S4):
```ts
// Resolves every catalog pollutant the station reports a finite latest value for,
// preserving POLLUTANTS order. Absent sensor → skipped (no fetch). All fetches via
// Promise.allSettled; a settled result is KEPT only if Number.isFinite(value) —
// note parseLatestValue returns `undefined` for an all-null sensor, which settles
// FULFILLED (not rejected), so the finite check (not just status==='fulfilled') is
// what filters it out. (S3)
async function resolvePollutants(sensorsJson, fetchImpl): Promise<PollutantReading[]>;
```
`detailFor` then = resolve sensors once → `history` from PM2.5 (as today) +
`pollutants: await resolvePollutants(sensors, fetchImpl)`. `mappers.ts` needs no
change (`findSensorId`/`parseLatestValue` already code-generic).

### Shared UI — data-driven grid (`src/shared/ui/PollutantTiles.tsx`)
```ts
export function PollutantTiles(props: { pollutants: PollutantReading[]; precision: Precision }): JSX.Element | null;
```
- One `Tile` per entry: label via `POLLUTANTS.find(p => p.code === code)!.label`
  (shared→core import is allowed), value via `formatPollutant(value, precision)`,
  unit "µg/m³".
- **Wrapping 2-column grid** (`flexWrap: 'wrap'`, each tile `flexBasis` ≈ 48% with
  the existing 12px gap) so 2/4/6 tiles lay out cleanly. **A ragged last row
  (3 or 5 tiles) leaves a lone 48%-width tile — kept at 48% (consistent sizing),
  NOT stretched to full width.** (Q3)
- Empty list → `return null` (no crash, no stray unit). No "—" tiles: an absent
  pollutant is simply not shown. **Accepted consequence (S8):** a station whose
  sensor flickers null hour-to-hour will reflow between N and N−1 tiles; this is
  intended (a truly-absent sensor must not render "—").

### Feature wiring (`src/features/teraz/TerazScreen.tsx`)
Replace `pm10={detail.pm10} no2={detail.no2}` with `pollutants={detail.pollutants}`.

## Behavior — Acceptance Criteria

### Core (pure)
- **AC-1** — `POLLUTANTS` equals the six specs above in that exact order with those
  exact labels (pin the array literal, incl. the `NO₂/O₃/SO₂/C₆H₆` subscript glyphs).
- **AC-2** — `formatPollutant` table:
  - `(0.35,'Przybliżona') === '0.35'` and `(0.35,'Dokładna') === '0.35'` (sub-1 always 2 dp)
  - `(0.999,'Przybliżona') === '1.00'` (still sub-1 → 2 dp; documents the boundary)
  - `(0) === '0'`
  - `(-0.35,'Przybliżona')` and `(-4.2,'Dokładna')` take the `formatConcentration`
    path (negatives NOT special-cased — pin whatever formatConcentration yields)
  - `(333,'Przybliżona') === '333'`; `(13.1,'Dokładna') === '13.1'`;
    `(13.1,'Przybliżona') === '13'` (≥1 defers to `formatConcentration`)
  - non-finite (`NaN`, `Infinity`) → `'—'`

### Data (adapter, fetch mocked)
- **AC-3a** — `detailFor` against a mocked station with sensors **PM10+NO₂+CO+C₆H₆
  (no O₃/SO₂)**, each getData returning a newest-non-null value: `pollutants` is
  exactly `[{PM10}, {NO2}, {CO}, {C6H6}]` **in that order** with the right values;
  O₃/SO₂ absent. `history` still built from PM2.5.
- **AC-3b (B2)** — `detailFor` against a mocked station exposing **all six**
  (PM10+NO₂+O₃+SO₂+CO+C₆H₆): `pollutants` equals the six in **catalog order**
  `[PM10,NO2,O3,SO2,CO,C6H6]` with correct values — proves the O₃/SO₂ path.
- **AC-3c** — a sensor present but whose getData is **all-null** → that pollutant
  is **omitted** (finite filter, not merely settled).

### UI
- **AC-4** — `PollutantTiles` with a 4-entry list renders all four labels (derived
  from POLLUTANTS), each value via `formatPollutant`, and four "µg/m³" units;
  benzene `0.35` shows "0.35" even in `Przybliżona`. The existing precision cases
  still hold for ≥1 values (13.1→"13"/"13.1").
- **AC-5** — empty `pollutants` → component renders nothing (`queryByText('µg/m³')`
  is null; no crash).

### Manual
- **AC-6** — *(journal)* On the sim (Kraków default): the detail shows **four**
  tiles — PM10, NO₂, CO, C₆H₆ — with live values (CO in the hundreds, benzene a
  small decimal like "0.35"), as a 2×2 grid under the 24h chart. Screenshot → evidence/16.

## Existing tests to update (learned from spec 014 B2)
Changing `ReadingDetail` from `pm10?/no2?` to `pollutants[]` reds several suites —
update them in the same change:
- `src/shared/ui/__tests__/PollutantTiles.test.tsx` — new prop shape + label-from-
  catalog + grid; the old "missing value → —" case becomes "absent pollutant → tile
  not rendered".
- `src/data/gios/__tests__/*` — `detailFor`/source tests asserting `pm10`/`no2`.
- `src/shared/place/__tests__/*` — any `usePlaceDetail`/`ActivePlaceContext`
  fixtures building a `ReadingDetail` with `pm10`/`no2`.
- `src/features/teraz/__tests__/*` — any `TerazScreen` fixture with `pm10`/`no2`.

**Completion guard (B1 — scoped to `ReadingDetail`, NOT the unrelated
`src/core/scene` `pm10`/`no2` atmosphere fields):**
```
grep -rnE 'detail\.(pm10|no2)|(pm10|no2)\?:|(pm10|no2)=\{' src --include='*.ts' --include='*.tsx' | grep -v 'src/core/scene'
```
must return zero before finishing.

## Verification
- **AC-1..2** core `src/core/air/__tests__/` (catalog literal + formatPollutant table; 100% core).
- **AC-3a..c** `src/data/gios/__tests__/` with mocked fetch.
  **Fixtures to CREATE (S2):** `getData_co.json`, `getData_c6h6.json`,
  `getData_o3.json`, `getData_so2.json` (newest-non-null), plus a sensors fixture
  listing all six for AC-3b; reuse existing `getData_allnull.json` for AC-3c.
- **AC-4..5** `src/shared/ui/__tests__/PollutantTiles.test.tsx`.
- **AC-6** manual on the sim, journal + evidence/16.

## Resolved open questions (critic)
1. **Benzene label** → `C₆H₆` (formula style, consistent with PM10/NO₂/O₃/SO₂/CO).
   `design/README.md` is silent on benzene/CO/O₃/SO₂, so resolved here (not "against design").
2. **Sub-1 rule** → keep "always 2 dp under 1.0" (1-sig-fig would lose 0.35→0.4;
   per-pollutant precision is YAGNI). Edges pinned in AC-2.
3. **Ragged 3/5-tile last row** → accepted; lone last tile stays 48% width (not stretched).
