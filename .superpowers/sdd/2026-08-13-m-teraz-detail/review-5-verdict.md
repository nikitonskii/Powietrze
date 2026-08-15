# Review 5 — HistoryChart + PollutantTiles + glass tokens

SPEC: ✅
QUALITY: APPROVE

## Findings

None — clean.

## Verification notes (for the record)

- **AC-8**: `HistoryChart.tsx` renders header "OSTATNIE 24 GODZINY" (`colors.text.muted`,
  11/600/ls1.4), five static axis labels `12:00 18:00 00:00 06:00 teraz`
  (`colors.text.faint`, 10px), one `Bar` per `history` point with
  `testID={\`bar-${index}\`}`, `backgroundColor: scene(point.index).key`,
  `opacity: historyBarOpacity(index, count)`, `height: \`${barHeightPct(point.index)}%\``.
  Card: `colors.glass` bg, 1px `colors.glassBorder`, radius 22, padding
  18/18/14. Bars row: height 76, gap 3, `alignItems:'flex-end'`. Test
  assertions read real flattened styles (`StyleSheet.flatten(...).style`)
  against independently-recomputed `scene()`/`historyBarOpacity`/`barHeightPct`
  values for two distinct inputs (index 10 vs 200) — not vacuous/tautological;
  a swapped color or wrong opacity formula would fail. Single-point edge case
  (count=1 → opacity 1, no NaN) is pinned as a literal, correctly exercising
  the division-by-zero guard.
- **AC-9**: `PollutantTiles.tsx` renders two `Tile`s — PM10 and NO₂ (₂ verified
  as U+2082 via codepoint check) — values at 30/600 `colors.text.primary`
  (`rgba(255,255,255,1)` ≡ design's `#fff`), unit "µg/m³" (µ verified U+00B5)
  at `colors.text.inactive`. Missing value renders `—` (verified U+2014) via
  `value ?? '—'`. Tile: `colors.glass`/`colors.glassBorder`/radius 20/padding 16.
  Tests assert real rendered text nodes for two distinct values (40, 22) plus
  the `—` fallback — meaningful, not tautological.
- **Design fidelity** vs `design/Powietrze.dc.html` lines 74–98: chart card
  `rgba(255,255,255,.07)` bg / `rgba(255,255,255,.09)` border / radius 22 /
  padding `18px 18px 14px` / bars row `height:76px;gap:3px` / bar
  `borderRadius:3px` — all match. Tile card same bg/border, radius 20,
  padding 16 — match. Header color `.55` → `colors.text.muted`; axis `.4` →
  `colors.text.faint`; tile label `.5` → `colors.text.dim`; tile unit `.45`
  → `colors.text.inactive`; tile value `#fff` → `colors.text.primary` — all
  correctly mapped token-for-hex. Bar formula (line 474:
  `Math.min(100,Math.max(10,hv/2))%`, `opacity:0.55+0.45*(h/23)`) matches
  `barHeightPct`/`historyBarOpacity` from Task 1 (previously pinned, reused
  unchanged here — confirmed via `src/core/air/history.ts` + its existing
  AC-2/AC-3 tests).
- **No-hex/no-rgba**: grepped both new files — zero raw `#`/`rgba(` literals;
  every color is `colors.glass`, `colors.glassBorder`, `colors.text.*`, or
  `scene(...).key`. New tokens `glass`/`glassBorder` added to
  `src/shared/tokens/index.ts` as specified. (Note: the ESLint
  `no-restricted-syntax` rule only pattern-matches `#hex` literals, not
  `rgba(...)` strings, so this file-level check was done manually rather
  than relying on lint alone — no violations found either way.)
- **Structure/layering**: no `any`; `HistoryChart.tsx` 87 lines, `PollutantTiles.tsx`
  52 lines (both ≤200); render functions short (`HistoryChart` body ~19
  lines, `Bar`/`Tile` sub-components extracted, all ≤40). Imports:
  `src/shared/ui/*` → `../tokens` (shared) and `../../core/{scene,air}`
  (core) only — matches the `boundaries/element-types` ESLint policy
  (shared → shared, core) and the CLAUDE.md layering rule (features → shared
  → core, one-way).
- Report claims (4 tests pass, lint 0, typecheck clean) were not
  independently re-run per instructions; diff/code content was reviewed
  directly and is consistent with those claims.

verdict written
