# Signal catalog: raw artifact markers per failure class

Deep lookup table for Step 2/3 of the Flaky Test Doctor skill. Each row is a
concrete, greppable marker and the class it supports. Two independent markers
minimum before classifying.

## Playwright trace markers

| Marker (where) | Supports | Notes |
|---|---|---|
| `page.on('pageerror')` entry at failure timestamp (console tab) | PRODUCT | Uncaught app exception |
| Hydration mismatch warning (console tab) | PRODUCT | React/Next: server-client divergence |
| 5xx response on app-owned API (network tab) | PRODUCT or ENVIRONMENT | 5xx from own backend = product; from third party = environment |
| 429 with Retry-After (network tab) | ENVIRONMENT or DATA | Rate limit from shared test tenant = data-shaped |
| Action duration within 5% of its timeout (actions tab) | TEST or ENVIRONMENT | Slowness, not selector wrongness |
| `waitForTimeout` in the action list | TEST | Fixed sleep, always a smell |
| strict mode violation: resolved to N elements | TEST | Selector under-specified for a transient DOM state |
| Navigation entry between action and its assertion | TEST | Assertion raced a navigation |
| Same POST fired twice within <100ms | PRODUCT | Double-submit race in the app |

## JUnit XML / rerun markers

| Marker | Supports | Notes |
|---|---|---|
| Same testcase, same failure line across all reruns | PRODUCT or TEST (deterministic) | Not flaky; bisect |
| `<flakyFailure>` / pass-on-retry entries | TEST or ENVIRONMENT | Retry-masked; pull attempt-1 artifacts |
| Failures only in one `<testsuite hostname=...>` | ENVIRONMENT | Runner-specific |
| `java.sql.SQLIntegrityConstraintViolationException` / `duplicate key value` | DATA | Fixture collision under parallelism |
| Failure timestamps cluster at :00 hours or month boundaries | DATA | Time-boundary logic |

## CI log markers

| Marker | Supports |
|---|---|
| `Killed` / exit 137 / OOMKilled | ENVIRONMENT |
| `no space left on device` | ENVIRONMENT |
| Container image digest differs from last green run | ENVIRONMENT |
| Only shard N of M fails repeatedly | ENVIRONMENT or DATA (shard-local fixture) |

## Disambiguation probes

| Ambiguity | Probe |
|---|---|
| TEST race vs app slowness | `--repeat-each=10 --retries=0` with `trace: 'on'`; compare action timings pass vs fail |
| Shared state vs ordering | Run the test alone 10x, then full suite with `--workers=1`, then `--workers=4` |
| DATA collision vs ENVIRONMENT | Unique-suffix all fixture keys; if failures stop, it was data |
| PRODUCT race vs TEST race | Reproduce manually at human speed following the trace steps; app misbehaving at human speed = product |
