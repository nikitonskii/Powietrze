# ADR-002: Explicit @types/node DevDependency

**Status:** Accepted · 2026-08-04

## Context
The purity test (spec AC-13) scans `src/core` for forbidden imports and must run at
dev time to enforce the core layer's strict zero-React, zero-IO purity boundary.
The test file uses Node.js built-ins (`fs`, `path`, `__dirname`) to introspect the
codebase; TypeScript needs type declarations for these.

Previously, type resolution relied on `@types/node` being transitively installed
via `@react-native/jest-preset`'s dependency tree. This is fragile — upgrades to
the RN preset could pull a different `@types/node` version, or none at all.

## Decision
Pin `@types/node` as an explicit top-level devDependency. The TypeScript compiler
options now include `"node"` in the `types` array to resolve declarations.

## Consequences
- (+) Type resolution is transparent and survives RN preset version changes.
- (+) Purity test remains type-safe under strict mode.
- (−) One additional entry in `package.json` devDependencies.
- (−) No runtime impact (type-only, stripped at build time).
