# ADR 009: App calls GIOŚ directly (no owned proxy yet)

**Status:** accepted
**Context:** `design/README.md` §State Management specifies "the app queries the
owned server, never GIOŚ directly". No such server exists, and this milestone is
a live-value-first data slice. GIOŚ v1 (`api.gios.gov.pl/pjp-api/v1`) is a free
public REST API with no API key, callable from a phone.
**Decision:** The app calls GIOŚ v1 **directly**, behind a `src/core`
`AirQualitySource` interface implemented by a new `src/data/gios` adapter. The
concrete adapter is injected (React context) so features depend only on the core
interface.
**Consequences:** Adds a `data` layer + a boundaries-lint element (`app → data`,
`data → core`). Amends the design's proxy assumption — a proxy/cache can slot in
behind the same interface later (rate limits, caching, hiding GIOŚ's verbose
JSON-LD) without touching features. No runtime npm dependency (RN `fetch`).
