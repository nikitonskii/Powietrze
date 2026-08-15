# Task 6 Review — Verdict

**SPEC: ✅** — Spec 014 AC-8 fully satisfied. ToggleRow `soon?: boolean` prop added and correctly defaults to false; loc/precision/scale untagged (live); alert/morning/threshold/quiet tagged (unwired/placeholder); widget row deleted entirely. Net tag state matches spec exactly: `wkrotce-alert/threshold/quiet/morning` present, `wkrotce-loc/precision/scale/widget` absent.

**QUALITY: APPROVE** — Clean diff, no `any` types or hex literals. ToggleRow and StackedRow functions within line/complexity limits. All group functions reasonable. Tests pass (6/6 UstawieniaScreen, 181 full suite), lint and typecheck green.

**Test Rewrite Ruling**: AC-18 and AC-21 assertions are GENUINE (not weakened). AC-18 explicitly asserts widget row absent via three NULL checks (`queryByText('Stacja widżetu')`, `queryByText('Automatyczna')`, `queryByTestId('setting-widget')`). AC-21 rewritten with positive loop over still-unwired keys (alert, threshold, quiet, morning) and negative loop over now-live keys (loc, precision, scale) and deleted widget — both assert the new expected state, not merely delete assertions. Other UstawieniaScreen tests (AC-17, AC-19, AC-20, AC-22) untouched, intact.

**Verdict**: READY TO MERGE.
