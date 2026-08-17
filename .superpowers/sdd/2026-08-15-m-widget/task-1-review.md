# Task 1 review — core widget snapshot builder + identity + WidgetSync seam

## Verdicts

- **SPEC: PASS** — AC-1 and AC-2 fully satisfied and tested.
- **QUALITY: APPROVE**

## Verification performed

- Read `docs/specs/017-widget.md` (§ The snapshot, § Public API -> core, AC-1/AC-2).
- Read the full diff (`task-1.diff`, commit `c09b450`) and the implementer's report.
- Read actual source: `src/core/air/index.ts`, `src/core/air/pollutants.ts`,
  `src/core/scene/{index,anchors,scene,band,ramp}.ts`, `src/core/settings/index.ts`
  - confirmed every imported symbol (`Reading`, `ReadingDetail`, `displayValue`,
  `scaleLabel`, `formatPollutant`, `POLLUTANTS`, `scene`, `bandOf`, `BANDS`, `Scale`,
  `Precision`) exists with the signature the implementation assumes.
- Hand-traced AC-2's three pinned points against `ANCHORS`/`ramp`/`bandOf`:
  - index 7 < first anchor (v=12) -> `ramp` returns `first[prop]` exactly ->
    `#5fe3a1`; `bandOf(7)` (<=25) -> band 0 -> `'Bardzo dobry'`. Matches.
  - index 63 == an anchor exactly -> `key: '#f5c63d'`; `bandOf(63)` (<=75) -> band 2
    -> `'Umiarkowany'`. Matches.
  - index 175 == an anchor exactly -> `key: '#c77dff'`; `bandOf(175)` (>150) ->
    band 5 -> `'Bardzo zly'`. Matches.
- Ran `npx jest src/core/widget` - 4/4 tests pass (coverage report write failed
  only on a sandbox file-permission EPERM for `coverage/coverage-final.json`,
  unrelated to code correctness - test results themselves were unaffected).
- Ran `npx tsc --noEmit` - clean, no errors.
- Ran `npx eslint src/core/widget --ext .ts` - no errors (only pre-existing
  unrelated boundaries-plugin config warnings).

## SPEC verdict detail

**AC-1** - every field wired correctly in `src/core/widget/index.ts`:
`version` = `WIDGET_SNAPSHOT_VERSION`; `city`/`stationLabel`/`measuredAt` straight
from `reading`; `displayValue`/`scaleCaption`/`band`/`keyHex`/`deepHex`/`midHex` all
delegate to `displayValue()`/`scaleLabel()`/`BANDS[bandOf()]`/`scene()` - no
reimplementation. `tiles` maps `detail?.pollutants ?? []` through `POLLUTANTS` labels
+ `formatPollutant` + hardcoded `'µg/m³'` unit (matches spec's baked-unit design,
not a token violation - it's a data unit string, not a visual/design value).
Empty-detail -> `[]` tested explicitly. All asserted in
`src/core/widget/__tests__/snapshot.test.ts` tests 1-2, citing AC-1.

**AC-2** - pinned at indices 7/63/175 with exact hex literals AND cross-checked
against `scene(index).key` directly (both forms present, satisfying "asserting
they equal scene()/bandOf() exactly"). Verified against actual anchor table,
correct as above.

**`widgetSnapshotIdentity`** - present, tested (test 4, "AC-3(core)"): stable
across two structurally-identical builds; changes on scale change (via
`displayValue` delta) and on `measuredAt` change. This is a reasonable,
value-based (not reference-based) identity function. One nuance worth flagging
(see Should-fix below): its key is `[city, stationLabel, measuredAt, displayValue,
band].join('|')`, whereas the spec's provider section describes the key as
`(city + stationLabel + measuredAt + scale + precision + displayValue)`. Since
raw `scale`/`precision` aren't carried on `WidgetSnapshot` (only `scaleCaption`
and `displayValue` are), the implementation approximates with `displayValue` +
`band` instead of `displayValue` + `scaleCaption`. In practice `displayValue`
alone captures virtually all real scale/precision changes (CAQI index and
US AQI/µg per m3 values from the same reading diverge sharply), so this is a
very low-probability gap, not a functional bug as tested - but it is a literal
deviation from the spec's stated key components, and `scaleCaption` is never
part of identity at all, meaning a hypothetical scale flip that leaves
`displayValue`'s text unchanged (a coincidental numeric collision) would
silently fail to trigger a republish. Flagging as should-fix for Task 2 (the
provider), where this identity function's real trigger behavior gets exercised
against AC-3's actual scenarios - worth adding a core test/adjusting the key to
include `scaleCaption` for full spec fidelity.

## QUALITY findings

**Blocker:** none.

**Should-fix:**
1. `src/core/widget/index.ts:172-176` (`widgetSnapshotIdentity`) - key omits
   `scaleCaption`, substituting `band` for the spec's stated `scale`+`precision`
   components. Low real-world risk (see above) but a literal spec-text mismatch;
   worth a one-line adjustment (`s.scaleCaption` instead of / in addition to
   `s.band`) before Task 2 relies on it for AC-3's "publish on scale/precision
   change" behavior - otherwise Task 2's own AC-3 tests need to be written
   carefully to not paper over this gap.

**Nit:**
1. `src/core/widget/index.ts:150` - the non-null assertion
   `POLLUTANTS.find(c => c.code === p.code)!.label` is justified inline and
   mirrors an existing precedent (`usAqiFromPm25`'s `.find()!`); acceptable
   per CLAUDE.md's "any is forbidden unless justified" (this isn't `any`, and
   the closed-union argument is sound), noting only for visibility.

**Purity / architecture:** confirmed - `src/core/widget/index.ts` imports only
`../air`, `../scene`, `../settings` (all `src/core`), zero React/data imports.
No cross-feature imports (feature layers don't apply here; this is core only).

**Size:** file 71 lines (<=200); `buildWidgetSnapshot` ~27 lines,
`widgetSnapshotIdentity` ~5 lines (both <=40). Test file 89 lines.

**Duplication:** none - color math stays in `core/scene`, formatting stays in
`core/air`; `buildWidgetSnapshot` is pure wiring, no reimplementation.

**Dead code:** none found; the report's own note about removing the plan's
`?? p.code` fallback (replaced with `!` for coverage-gate reasons) is a sound,
documented decision, not a smell.

**Tests:** behavior-based, not snapshot-based; AC-1/AC-2 tests assert real
equality against the underlying pure functions and pinned literals, not
tautological restatements of the implementation body. Test names cite AC IDs
per CLAUDE.md convention.

## Verdict

**SPEC: PASS** (AC-1, AC-2 fully implemented and correctly tested;
`widgetSnapshotIdentity` present and stable-except-on-real-change, with one
flagged should-fix nuance for Task 2 to account for).

**QUALITY: APPROVE** (one should-fix noted for follow-up in Task 2, no blockers).
