# Non-Functional Requirements

Every NFR is measurable and names its check method. Unmeasurable
proposals are rejected, exactly like unmeasurable acceptance criteria.

| ID | Requirement | Target | Check | Verified at |
|---|---|---|---|---|
| NFR-1 | Atmosphere animation frame rate | ≥ 55 fps sustained | Perf monitor on device/simulator | M3 |
| NFR-2 | Reduced-motion support | particles frozen, density preserved | RNTL test + manual toggle | M3 |
| NFR-3 | Cold start → interactive Teraz | ≤ 2.5 s on device | Instruments / stopwatch | M7 |
| NFR-4 | Offline / stale data | cached view + prominent freshness timestamp, no crash | RNTL negative tests | M7 |
| NFR-5 | Type safety | `tsc --noEmit` strict, zero errors | CI, every PR | M0 |
| NFR-6 | Coverage | ≥ 80% lines in `src/core`; ≥ 60% overall | `jest --coverage` threshold in CI | M1 / M4 |
| NFR-7 | Dependency discipline | no new dependency without an ADR | reviewer agent + CLAUDE.md | M0 |
