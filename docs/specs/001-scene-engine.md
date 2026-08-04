# Spec 001: Scene engine

**Status:** draft
**Milestone:** M1
**Sources:** `design/README.md` §"The color system" + §"Atmosphere layer"
(anchor table, thresholds, derived formulas); `design/Powietrze.dc.html`
logic class (`ANCH`, `BANDS`, `ADVICE`, `ramp`, `bandOf`, `scene`) — the
color-math source of truth.

## Scope

Pure-TypeScript domain core in `src/core/scene/`: one CAQI value in, the
complete visual scene out — interpolated colors, band name, advice copy,
derived pollutant values, particle density. Zero React or React Native
imports. This is the module every later milestone (hero, atmosphere,
chart, widgets) consumes; the whole app's thesis — one value drives every
visual — lives here.

## Non-goals

- Rendering of any kind (M2+), the Skia shader and particle motion (M3).
- Synthetic 24h-chart / forecast / sparkline series from the prototype's
  `renderVals` — demo data generators, replaced by real API data (M4/M7).
- Trend arrows (↑/↓/→) — Miejsca logic (M5).
- Fetching, caching, station/city metadata (M7).
- Non-CAQI scales (US AQI, µg/m³ display) — Ustawienia (M6).

## Public API

Module `src/core/scene` (single entry point; internals free to decompose):

```ts
export type ColorProp = 'key' | 'deep' | 'mid';
export type Rgb = readonly [number, number, number];      // 0–255 ints
export type BandIndex = 0 | 1 | 2 | 3 | 4 | 5;
export type BandName =
  | 'Bardzo dobry' | 'Dobry' | 'Umiarkowany'
  | 'Dostateczny' | 'Zły' | 'Bardzo zły';

export interface Anchor {
  readonly v: number;
  readonly key: string;
  readonly deep: string;
  readonly mid: string;
}

export interface Scene {
  readonly key: string;      // lowercase '#rrggbb'
  readonly deep: string;
  readonly mid: string;
  readonly rgb: Rgb;         // key color as channels (particle renderer, M3)
  readonly band: BandName;
  readonly advice: string;
  readonly pm25: number;
  readonly pm10: number;
  readonly no2: number;
  readonly density: number;  // 0.03–1
}

export const ANCHORS: readonly Anchor[];   // the 6 design stops, verbatim
export const BANDS: readonly BandName[];   // index = BandIndex
export const ADVICE: readonly string[];    // index = BandIndex

export function ramp(v: number, prop: ColorProp): string;
export function bandOf(v: number): BandIndex;
export function scene(v: number): Scene;
```

Anchor data (exact, from the design table):

| v | key | deep | mid |
|---|---|---|---|
| 12  | `#5FE3A1` | `#04231A` | `#0A3A2A` |
| 38  | `#A8E063` | `#0C2A16` | `#173D1F` |
| 63  | `#F5C63D` | `#241B05` | `#3D2E08` |
| 88  | `#FF9147` | `#2A1305` | `#43200A` |
| 125 | `#FF5C5C` | `#2B0B0B` | `#451212` |
| 175 | `#C77DFF` | `#1C0720` | `#2E0F35` |

## Behavior — Acceptance Criteria

Interpolation & colors:

- **AC-1** — Given `v` equal to any anchor stop (12, 38, 63, 88, 125,
  175), `ramp(v, prop)` returns that anchor's exact color for each of
  `key`/`deep`/`mid` (lowercase; e.g. `ramp(63, 'key') === '#f5c63d'`).
- **AC-2** — Given `v` strictly between two adjacent anchors, each RGB
  channel is `Math.round(lo + (hi − lo) · t)` with
  `t = (v − lo.v)/(hi.v − lo.v)`. Exact case: `ramp(50, 'key')` (t = 0.48
  between `#A8E063` and `#F5C63D`) `=== '#cdd451'`.
- **AC-3** — Near-identity across the 75/76 band boundary: computed
  values `ramp(74, 'key') === '#f9af41'` and `ramp(76, 'key') ===
  '#faaa42'` — per-channel difference ≤ 6. Never a band snap.
- **AC-4** — Continuity invariant: for every integer `v` in 0…200 and
  every prop, per-channel `|ramp(v+1) − ramp(v)| ≤ 5` (exhaustive scan).
- **AC-5** — Clamping: for `v < 12`, `ramp` returns the first anchor's
  color; for `v ≥ 175`, the last anchor's (`ramp(0, 'key') === ramp(12,
  'key')`; `ramp(200, 'mid') === '#2e0f35'`).
- **AC-6** — Every color `ramp` or `scene` returns is a lowercase
  7-character `#rrggbb` string — including the clamped ends (regex
  `/^#[0-9a-f]{6}$/` over the 0…200 scan). *(The prototype returns the
  anchor's uppercase literal when clamping and lowercase when
  interpolating; this spec normalizes to lowercase everywhere.)*

Bands & copy:

- **AC-7** — Band thresholds are inclusive upper bounds: 0→`Bardzo
  dobry`, 25→`Bardzo dobry`, 26→`Dobry`, 50→`Dobry`, 51→`Umiarkowany`,
  75→`Umiarkowany`, 76→`Dostateczny`, 100→`Dostateczny`, 101→`Zły`,
  150→`Zły`, 151→`Bardzo zły`, 200→`Bardzo zły`.
- **AC-8** — `scene(v).advice` is exactly the design copy for
  `bandOf(v)` — all six Polish strings verbatim from
  `design/README.md` §Teraz (e.g. band `Zły` → „Zostań w domu. Zamknij
  okna, unikaj wysiłku.").

Derived values:

- **AC-9** — `pm25 = Math.round(v × 1.03)`, `pm10 = Math.round(pm25 ×
  1.55)` (from the *rounded* pm25), `no2 = Math.round(18 + v × 0.42)`.
  Exact case `scene(118)`: pm25 = 122, pm10 = 189, no2 = 68.
- **AC-10** — `density = clamp(pm25/135, 0.03, 1)`. Exact cases:
  `scene(0).density === 0.03` (floor), `scene(11).density ≈ 0.0815`
  (11/135), `scene(150).density === 1` (pm25 = 155, capped).

Negative scenarios & purity:

- **AC-11** — Given `v < 0`, `scene(v)` deep-equals `scene(0)` (input
  clamped to 0 before any derivation — no negative pollutant values).
- **AC-12** — Given non-finite `v` (`NaN`, `±Infinity`), `scene`, `ramp`,
  and `bandOf` throw a `RangeError`. *(The prototype's `bandOf(NaN)`
  silently returns band 5 — worst air — because every comparison is
  false; this spec fails fast instead.)*
- **AC-13** — `scene` is pure and deterministic: two calls with the same
  `v` return deep-equal results, and `src/core/scene` imports nothing
  from `react`, `react-native`, or any I/O module (the test suite runs in
  Jest's plain `node` environment with no RN preset mocks needed).

## Resolved ambiguities

1. **Hex casing** — prototype output is mixed-case depending on code
   path; normalized to lowercase everywhere (AC-6). Why: string-equality
   comparisons in tests and render code must not depend on which branch
   produced the color.
2. **Invalid input** — prototype maps `NaN` to the worst band silently;
   this spec throws `RangeError` (AC-12) and clamps negatives to 0
   (AC-11). Why: a data-layer glitch should surface in development, not
   paint the screen purple.
3. **`pm10` derives from rounded `pm25`** (AC-9), matching the prototype
   exactly rather than `v × 1.03 × 1.55` — off-by-one differences are
   visible in the UI tiles.
4. **No upper clamp on derived values** — colors clamp at anchor 175 and
   density caps at 1, but `pm25`/`pm10`/`no2` keep growing with `v`
   (matches prototype; real stations can exceed index 200).

## Verification

- AC-1…AC-13: Jest unit tests in `src/core/scene/__tests__/`, each test
  name citing its AC ID; AC-4/AC-6 as exhaustive 0…200 scans.
- AC-13 import purity additionally visible mechanically: the suite passes
  under Jest `testEnvironment: 'node'` without the RN preset's mocks.
- Coverage: `src/core/scene` at 100% statements/branches (NFR-6 floor for
  `core` is 80%; this module is pure math — anything uncovered is dead
  code).
