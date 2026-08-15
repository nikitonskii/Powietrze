# Data-driven pollutant tiles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox syntax.

**Goal:** Render one Teraz-detail tile per pollutant the resolved station actually measures (Kraków: PM10/NO₂/CO/C₆H₆; O₃/SO₂ where present), from a fixed core catalog, instead of the hard-coded 2 tiles.

**Architecture:** A pure `POLLUTANTS` catalog + `PollutantReading` list in `core/air`; `ReadingDetail.pollutants` replaces `pm10?/no2?`; the GIOŚ adapter resolves the catalog via existing generic mappers; `PollutantTiles` becomes a data-driven wrapping grid deriving labels from the catalog.

**Tech Stack:** TS strict, React Native, Jest + @testing-library/react-native (render/renderHook are async — await them). No new dependency.

## Global Constraints
- No new dependencies (Skia/on-board only). · TS strict, no `any` outside the justified GIOŚ data-boundary in `mappers.ts`. · Files ≤200 lines, functions ≤40 lines. · `core` is pure (zero React/data imports), 100% coverage. · Imports one-way: features→shared→core, data→core; features never import data. · Behavior tests cite AC IDs. · Spec: `docs/specs/016-pollutant-tiles.md` (authoritative — exact labels, order, AC values live there).
- Labels are the exact glyphs `PM10 / NO₂ / O₃ / SO₂ / CO / C₆H₆` in that catalog order.

---

### Task 1: Core catalog + small-magnitude formatter (additive, green on its own)

**Files:**
- Modify: `src/core/air/history.ts` (or a new `src/core/air/pollutants.ts` re-exported from `index.ts` — implementer's call; keep files ≤200 lines) — add `PollutantCode`, `PollutantSpec`, `POLLUTANTS`, `PollutantReading`. **Do NOT touch `ReadingDetail` in this task.**
- Modify: `src/core/air/index.ts` — add `formatPollutant`; ensure new types/consts are exported.
- Test: `src/core/air/__tests__/pollutants.test.ts` (new) and extend the existing format test file for `formatPollutant`.

**Interfaces:**
- Produces (consumed by Task 2): `PollutantCode`, `PollutantSpec`, `POLLUTANTS: readonly PollutantSpec[]`, `PollutantReading { code: PollutantCode; value: number }`, `formatPollutant(value: number, precision: Precision): string`.

- [ ] **Step 1: Write failing tests** — AC-1 (pin `POLLUTANTS` to the exact 6-entry literal with codes+labels+order per spec §Core); AC-2 (the full `formatPollutant` table from spec AC-2: `0.35`→`'0.35'` both precisions, `0.999`→`'1.00'`, `0`→`'0'`, negatives take the `formatConcentration` path, `333`→`'333'`, `13.1`→`'13.1'`/`'13'`, non-finite→`'—'`).
- [ ] **Step 2: Run, verify they fail** — `npx jest src/core/air`.
- [ ] **Step 3: Implement** — add the catalog/types; implement `formatPollutant` (spec §Core: `0 < value < 1` → `value.toFixed(2)`; else `formatConcentration(value, precision)`; the non-finite `'—'` already comes from `formatConcentration`). Keep it a clean delegation — no copy of formatConcentration's logic.
- [ ] **Step 4: Run tests** — `npx jest src/core/air` green.
- [ ] **Step 5: Full gate** — `npm run typecheck && npm run lint && npm test` all green, `src/core` 100% (no threshold error). Commit: `feat(core): pollutant catalog + formatPollutant (AC-1, AC-2)`.

---

### Task 2: ReadingDetail migration — data adapter + data-driven tiles (atomic)

**Files:**
- Modify: `src/core/air/history.ts` — change `ReadingDetail` to `{ history: HourPoint[]; pollutants: PollutantReading[] }` (remove `pm10?`/`no2?`).
- Modify: `src/data/gios/source.ts` — add `async function resolvePollutants(sensorsJson, fetchImpl): Promise<PollutantReading[]>`; make `detailFor` compose `history` (as today) + `pollutants`.
- Create fixtures: `src/data/gios/__tests__/fixtures/` — `getData_co.json`, `getData_c6h6.json`, `getData_o3.json`, `getData_so2.json` (each newest-non-null, GIOŚ v1 `Lista danych pomiarowych` shape with `Data`/`Wartość`), and a sensors fixture listing all six for AC-3b. Reuse existing `getData_allnull.json` for AC-3c. (Match the shape of existing fixtures in that dir.)
- Modify: `src/shared/ui/PollutantTiles.tsx` — props `{ pollutants: PollutantReading[]; precision }`; render a wrapping 2-col grid; label via `POLLUTANTS.find(p => p.code === code)!.label`; `formatPollutant` for the value; empty list → `return null`; lone last tile stays 48% (not stretched).
- Modify: `src/features/teraz/TerazScreen.tsx` — pass `pollutants={detail.pollutants}`.
- Update tests (spec §"Existing tests to update"): `PollutantTiles.test.tsx`, `src/data/gios/__tests__/*`, `src/shared/place/__tests__/*`, `src/features/teraz/__tests__/*`.

**Interfaces:**
- Consumes: everything from Task 1.
- Produces: final `ReadingDetail`, data-driven `PollutantTiles`.

- [ ] **Step 1: Write failing tests first**
  - Data (mocked `fetch`): **AC-3a** (PM10+NO₂+CO+C₆H₆ station → `pollutants` exactly `[PM10,NO2,CO,C6H6]` in order, right values, O₃/SO₂ absent, `history` from PM2.5); **AC-3b** (all-six station → `[PM10,NO2,O3,SO2,CO,C6H6]` in catalog order); **AC-3c** (a present sensor with all-null getData → omitted). Create the fixtures above.
  - UI: **AC-4** (4-entry list → four labels derived from catalog, values via `formatPollutant`, four `µg/m³`; benzene `0.35`→`'0.35'` in `Przybliżona`; ≥1 precision cases still hold); **AC-5** (empty list → `queryByText('µg/m³')` null, no crash).
- [ ] **Step 2: Run, verify they fail** (and that the existing pm10/no2 suites now red — expected; they get rewritten this task).
- [ ] **Step 3: Implement** — (a) change `ReadingDetail`; (b) `resolvePollutants` (spec §Data: map `POLLUTANTS` → `findSensorId`; for present ids `getLatest`; `Promise.allSettled`; KEEP only `Number.isFinite(value)` results — remember `parseLatestValue` returns `undefined` for all-null which settles *fulfilled*; preserve catalog order); keep `detailFor` ≤40 lines by delegating; (c) rewrite `PollutantTiles`; (d) wire `TerazScreen`.
- [ ] **Step 4: Update fallout tests** — rewrite the pm10/no2 assertions across the four suites listed; the old "missing → —" case becomes "absent pollutant → tile not rendered".
- [ ] **Step 5: Run tests** — `npm test` green.
- [ ] **Step 6: Completion guard (B1)** — run the scoped grep from spec §"Completion guard": `grep -rnE 'detail\.(pm10|no2)|(pm10|no2)\?:|(pm10|no2)=\{' src --include='*.ts' --include='*.tsx' | grep -v 'src/core/scene'` → must be empty. (Do NOT touch `src/core/scene`'s own pm10/no2 — unrelated atmosphere fields.)
- [ ] **Step 7: Full gate** — `npm run typecheck && npm run lint && npm test` green, `src/core` 100%. Commit: `feat(teraz): data-driven pollutant tiles — CO/C₆H₆/O₃/SO₂ where measured (AC-3..5)`.

---

## Self-review
- **Spec coverage:** AC-1/AC-2 → Task 1; AC-3a/b/c, AC-4, AC-5 → Task 2; AC-6 manual (post-build, sim). All covered.
- **Type consistency:** `PollutantReading { code; value }` (no label) used identically in both tasks; `POLLUTANTS` order pinned once in Task 1 and relied on for ordering in Task 2.
- **No placeholders:** exact AC values + fixture list + grep guard all carried from the spec.
- **Atomicity:** Task 1 is purely additive (green alone); Task 2 is the atomic shape migration (splitting it would leave the tree non-compiling). Reviewer can reject Task 1 (catalog/formatter wrong) independently of Task 2 (adapter/UI wrong).
