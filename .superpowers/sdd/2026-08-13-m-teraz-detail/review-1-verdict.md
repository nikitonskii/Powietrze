# Task 1 Review Verdict

## SPEC: ✅

All acceptance criteria verified against source of truth (design/Powietrze.dc.html:474):

- **AC-1**: buildHistory drops nulls, keeps negatives, sorts newest-first, reverses to oldest→newest, caps at count (default 24), maps to {at, pm25, index}. Empty input → []. Test meaningful (data flow, not snapshots).
- **AC-2**: historyBarOpacity formula `0.55 + 0.45 * (i / (count-1))` generalizes design spec `0.55+0.45*(h/23)` correctly. count≤1 guard → 1.0 (NaN prevention). (0,24)→0.55, (23,24)→1.0, (0,1)→1.0.
- **AC-3**: barHeightPct `Math.min(100, Math.max(10, index/2))` matches design line 474 exactly. Clamps [10, 100] verified.

## QUALITY: APPROVE

**Circular import resolved**: history.ts imports indexFromPm25 from ./index; index.ts re-exports history at line 30 (AFTER indexFromPm25 definition at line 15). Runtime safe: indexFromPm25 called at call-time only. Verified compile + test pass.

**Code quality**:
- Pure TS (no React); no `any`; type guard `p is { at: string; value: number }` correct
- File/function sizes within limits (history.ts 40L, buildHistory 8L, historyBarOpacity 3L, barHeightPct 2L)
- Test names cite AC IDs; 100% coverage (null-drop, negative-keep, cap, all-null, reverse, count≤1 guard, opacity ramp, both height clamps exercised)
- Comments explain rationale (e.g., "rare GIOŚ artifacts, clamped harmlessly downstream")

**No findings.** Clean, correct, ready to merge.
