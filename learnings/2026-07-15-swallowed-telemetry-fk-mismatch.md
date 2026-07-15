# Telemetry that never fails visibly can silently record nothing for years

## Problem

QASkills install counts undercounted from day one. The CLI sent
`{skillId: <display name>, action, agents}`; the API inserted that value into
`installs.skill_id` (a NOT NULL uuid FK) and ran `eq(skills.id, value)`. Every
CLI event threw on the uuid cast, the route's catch-all returned
`{success: true}`, and the CLI also swallowed errors by design. Three layers of
"telemetry must never fail visibly" meant the failure had no symptom at all:
no error, no log, just quietly frozen counters that everyone read as "low
installs."

## Approach

1. Found it by verifying a roadmap's claims against code instead of trusting
   them: the roadmap said "slug-to-UUID telemetry bug"; reading the route plus
   the CLI caller showed it was worse (display name, not slug, and a field
   vocabulary mismatch: action/agents vs installType/agentType).
2. Fixed at the SERVER, not just the client: a pure `normalizeInstallEvent()`
   accepts every payload shape ever shipped (uuid, slug, display name), then
   the route resolves by id -> slug -> name before touching the FK. Old CLIs
   in the wild start counting correctly without upgrading.
3. Unit-tested the pure normalizer (no DB mocking needed) and proved the whole
   path end to end: local server insert joined back to the right slug, then a
   prod probe moved installCount 87 -> 88.
4. Kept the "never fail visibly" contract but made the only silent path an
   explicit decision (unknown skill -> success without insert), not an
   accident.

## Judgment calls

- Did NOT backfill or estimate lost installs; no data exists to reconstruct.
- Did NOT make 'update' events bump installCount (reinstalls inflating the
  leaderboard would be a new lie replacing the old one).
- Extracted normalization into a lib so the contract is testable without
  standing up the DB.

## Reusable rule

Any "must never fail visibly" path needs one observable success signal
somewhere (a counter that moves, a row that joins); verify it end to end once,
because stacked error-swallowing turns a type mismatch into years of silent
data loss. And when a fire-and-forget client and its server disagree on field
names, fix the server to accept every historical shape: clients in the wild
never upgrade in step.
