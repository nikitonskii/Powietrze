# Critique — Spec 016: Data-driven pollutant tiles

**Verdict: SHIP-WITH-FIXES** (2 blocking, 8 should-fix). Core design is sound and
well-scoped; blockers are AC-coverage + an unsatisfiable completion guard +
undocumented design divergence, not architectural.

Review mode: THOROUGH → escalated briefly on discovering B1 (a factually wrong
spec instruction) but the artifact is otherwise coherent; no systemic rot found.

---

## Pre-commitment predictions (before deep read)
Expected: (a) GIOŚ code leak into core, (b) formatPollutant edge holes, (c)
allSettled fulfilled-but-undefined leaking into a `value: number`, (d) the
"existing tests to update" list under-counting the blast radius.
Actually found: (a) defensible — codes are standard formulas, verified 1:1 in the
fixtures; (b) real but minor; (c) real (S3); (d) list is OK via wildcards, but the
GREP GUARD itself is broken (B1) — a failure mode I did not predict.

---

## Verified facts
- GIOŚ sensor codes match the catalog 1:1 — `sensors400.json` shows
  `"Wskaźnik - kod"` = `CO`, `NO2`, `PM10`, `C6H6`, `PM2.5`; `mappers.test.ts:44`
  treats `O3` as a valid code returning null at station 400. Claim in §Core holds.
- `findSensorId`/`parseLatestValue` are already code-generic — §Data "no change
  to mappers.ts" is correct.
- `detailFor` today (`source.ts:46-81`) is ~35 lines and rejects-absent-sensors;
  ordering via `Promise.allSettled` is index-preserving (Q3 concern is a non-issue
  IF results are zipped back to the input order).
- `getData_allnull.json` exists → the "present-but-all-null → omitted" AC-3 case
  has a fixture. `getData` fixtures for CO(2745) and C6H6(16500) do NOT exist.

---

## BLOCKING

### B1 — The completion grep guard is unsatisfiable; it collides with the `scene` module
§"Existing tests to update": `Grep \.pm10\b|\.no2\b|pm10:|no2:` under `src` before
finishing; zero remain.` This can NEVER reach zero. The `scene` domain has its own
unrelated `pm10`/`no2` fields (derived atmosphere values):
- `src/core/scene/types.ts:27-28` (`readonly pm10/no2: number`)
- `src/core/scene/scene.ts:25-26` (`pm10: Math.round(...)`, `no2: ...`)
- `src/core/scene/__tests__/scene.test.ts:32-33` (`s.pm10`, `s.no2`)
An executor following the guard literally is either blocked forever or wrongly
edits the scene engine. **Fix:** scope the guard to `ReadingDetail` usages only,
e.g. `grep -rnE 'detail\.(pm10|no2)|\bpm10\?:|\bno2\?:|pm10=|no2=' src` and/or
explicitly exclude `src/core/scene`. Also note the current pattern misses JSX
props (`pm10={...}`) and fixture imports (`import pm10 from`) — widen it.

### B2 — No AC proves O₃/SO₂ render when a station actually has them
The entire premise ("other stations measure O₃/SO₂") is unverified. AC-3 tests
only a station WITHOUT O₃/SO₂ (station 400). The full 6-order path
`[PM10,NO₂,O₃,SO₂,CO,C6H6]` — the feature's core value — has zero coverage, so an
ordering/label regression for O₃/SO₂ ships silently. **Fix:** add an AC (or a
second AC-3 case) with a fixture station exposing PM10+NO₂+O₃+SO₂+CO+C6H6 and
assert `pollutants` equals the 6 in catalog order with correct labels/values.

---

## SHOULD-FIX

### S1 — Undocumented divergence from a source-of-truth (design/README.md:80)
`design/README.md:80` mandates: `Two tiles grid (1fr 1fr, gap 12px): PM10 and
NO₂`. The spec silently replaces this with a data-driven 2/4/6 wrapping grid.
CLAUDE.md names `design/README.md` a source of truth (and read-only). The spec
neither cites nor supersedes README:80, and DoD item 3 requires docs reconciled.
**Fix:** add a line to §Scope: "Supersedes design/README.md:80 (fixed 2-tile
grid); design is read-only so the deviation is recorded here + needs human
sign-off." Also: Q1 says "confirm [benzene label] against design/README.md" — but
the README never mentions benzene/CO/O₃/SO₂ (verified). That open question is
unanswerable from design; resolve it here (see Q1 rec).

### S2 — New getData fixtures required but never listed
AC-3 needs CO(2745) + C6H6(16500) getData fixtures returning newest-non-null; the
"present-but-all-null" case needs an all-null getData. Only `getData_allnull.json`
exists. The spec lists tests to UPDATE but omits fixtures to CREATE. **Fix:** list
`getData_co.json`, `getData_c6h6.json` (+ reuse `getData_allnull.json`) under §Verification.

### S3 — Fulfilled-but-undefined can leak `value: undefined` into a `value: number`
`parseLatestValue` returns `number | undefined` (undefined for all-null). Under
`allSettled`, an all-null sensor resolves FULFILLED with `undefined` — it is not
rejected. Copying today's pattern (`status === 'fulfilled' ? x.value : undefined`)
would emit a `PollutantReading` with `value: undefined`, violating the type. §Data
says "include only if parseLatestValue is a finite number" but never states the
mechanism. **Fix:** spell out the filter is `Number.isFinite(value)` AFTER
settling, not merely `status === 'fulfilled'`. (AC-3's all-null case gates it, but
the design prose should not leave the trap implicit.)

### S4 — detailFor risks the ≤40-line / one-responsibility limits
The refactor adds: resolve N ids over POLLUTANTS, build a code-tagged promise
array, settle, filter-finite, zip back to catalog order — on top of the PM2.5
history path. That plausibly exceeds 40 lines and mixes two responsibilities.
**Fix:** direct a helper (e.g. `resolvePollutants(sensors, fetchImpl)` in source
or a mappers-level composer) so detailFor stays a thin composition. Call this out
so the executor doesn't produce one 55-line function that fails lint.

### S5 — formatPollutant edge cases missing from AC-2
The rule keys on `0 < |value| < 1` (absolute value). Untested: negative sub-unit
(`-0.35` → "-0.35"? tiles have NO clamp, unlike buildHistory) and `0.999` →
`toFixed(2)` = `"1.00"` (renders ≥1-looking with 2dp). NaN/0/333/13.1 are covered.
**Fix:** add AC-2 rows for a negative value and a just-under-1 value, and decide
the negative policy (recommend: same-as-formatConcentration path, i.e. don't
special-case negatives — GIOŚ negatives are artifacts per `history.ts:15-17`).

### S6 — Drop `label` from PollutantReading; derive it in the UI from POLLUTANTS
`PollutantReading { code; label; value }` denormalizes `label` out of
`PollutantSpec`, forcing the data layer to copy labels and creating two homes for
label truth. Cleaner: `PollutantReading { code; value }`; the UI imports
POLLUTANTS (shared→core is allowed) and maps `code→label`. One source of truth for
labels/order, dumber data layer. (Answers Q1's "is code↔label↔order coupling
right?": order is correctly single-sourced in POLLUTANTS; label is not.)

### S7 — "the data layer maps GIOŚ codes onto [core codes]" oversells a seam that doesn't exist
§Core comment implies a mapping layer. In reality core codes ARE the GIOŚ code
strings passed verbatim to `findSensorId` — no mapping, no seam. Fine for YAGNI,
but reword the comment to say "core codes are the canonical air-quality formulas;
they equal GIOŚ codes so no translation is needed" rather than implying indirection.

### S8 — Layout jitter from hour-to-hour sensor nulls (Q4 consequence)
Because a present-but-null sensor is OMITTED (not "—"), a station whose NO₂
flickers null will show 4 tiles one hour, 3 the next — the grid reflows and a
lone 48% tile appears. Acceptable, but the spec should state it explicitly as an
accepted consequence so it isn't logged as a bug later.

---

## MINOR
- Labels (display subscripts) live in `src/core` — mild layering smell, but
  consistent with existing core string helpers (`scaleLabel`, `formatConcentration`).
  Acceptable; S6 reduces the surface anyway.
- AC-5 (empty → renders nothing) + the parent `detail &&` guard: fine. Confirm the
  component's own `pollutants.length === 0 → null` is still tested independently.

---

## Answers to the 7 judged questions
1. **Catalog in core / leak?** Acceptable, not a leak — codes are standard formulas,
   verified 1:1 with GIOŚ in fixtures. Order is correctly single-sourced. Label is
   NOT (S6). Reword the misleading "mapping" comment (S7).
2. **formatPollutant sub-1 rule / duplication?** Correct and a CLEAN delegation, not
   duplication — new behavior is only the sub-1 branch; ≥1 defers. Keep it a SEPARATE
   function (folding it into formatConcentration would change the hero/PlaceRow
   contract the spec deliberately leaves untouched). Close the negative/0.999 holes (S5).
3. **detailFor refactor correctness/size?** Ordering is safe IF results are zipped back
   to catalog order (allSettled preserves index). Two real gaps: fulfilled-undefined
   filtering (S3) and function size (S4). Present-but-all-null handled via S3.
4. **Drop the "—" tile?** Right call for TRULY-ABSENT sensors (data-driven premise).
   For present-but-null it's defensible but causes layout jitter — accept and document
   (S8). Do not reintroduce "—"; it would misrepresent a sensor the station lacks.
5. **AC completeness/traceability?** Biggest gap is B2 (no O₃/SO₂-present AC).
   Secondary: S5 edges, and no AC pins the wrapping-grid/ragged-row (manual AC-6 only).
   The "tests to update" list is complete via wildcards (detail.test.ts, usePlaceDetail,
   TerazScreen, PollutantTiles all covered) — but the GUARD is broken (B1) and fixtures
   are unlisted (S2).
6. **Scope/YAGNI?** Data-driven is JUSTIFIED, not over-engineered — nearest-station
   (shipped) means the resolved station is often not Kraków, so a hardcoded set would be
   wrong elsewhere. Catalog of 6 is bounded by what GIOŚ reports. Nothing speculative.
7. **Open questions — firm recommendations:**
   - Q1 (label): use `C₆H₆` (proper subscripts). Design uses formula style
     ("PM10", "NO₂"); "Benzen" would be the lone word-label — inconsistent. README is
     silent on benzene, so decide here, not "against design". Apply formula style to
     O₃/SO₂/CO too.
   - Q2 (sub-1 rule): KEEP "2 dp under 1.0". "1 sig fig" would round 0.35→0.4 (lossy);
     per-pollutant precision is YAGNI. Just add the negative/near-1 edges (S5).
   - Q3 (ragged 3/5 row): ACCEPT ragged; don't force even counts or fills (YAGNI; real
     counts are usually 2 or 4). Decision to record: the lone last tile stays 48%
     width (consistent sizing), NOT stretched to full — pin this so it isn't read as a bug.

---

## Self-audit / Realist check
- B1: HIGH confidence, hard evidence (scene.ts:25-26). Cannot be refuted. Kept blocking —
  it's the spec's own DoD-style gate and is factually wrong; cheap, high-value fix.
- B2: HIGH confidence. It's a genuine coverage gap on the feature's core claim, not a
  preference. Kept blocking.
- S3/S4: MEDIUM — AC-3 partially guards S3; both are real executor traps worth pre-empting.
- Did NOT inflate: no data-loss/security/financial issues here, so nothing earns CRITICAL.
  The whole artifact is a small, competent spec; blockers are about verification rigor and
  governance, hence SHIP-WITH-FIXES rather than REWORK.
