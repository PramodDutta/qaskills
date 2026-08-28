import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing App Upgrade Paths: Data Migrations Across Skipped Versions',
  description: 'app upgrade testing catches skipped-version migration breaks, data loss, offline queue corruption, and startup failures before old installs meet new code.',
  date: '2026-08-28',
  category: 'Migration',
  content: `
# Testing App Upgrade Paths: Data Migrations Across Skipped Versions

app upgrade testing proves that a user can move from an older installed version to the current version without losing data, corrupting local state, or getting stuck in an unrecoverable boot loop. The important case is not only version 7 to version 8. It is version 3 to version 8, version 5 with offline drafts to version 8, and version 6 after a failed migration retry to version 8.

The test target is the full upgrade path: stored data shape, migration order, idempotency, app startup, feature flags, sync replay, and rollback behavior. If your tests only install the newest build on a clean device, you have not tested upgrades.

Skipped-version bugs are common because real users do not update like CI does. CI usually runs every migration in a neat sequence on a fresh fixture. Users skip releases, pause downloads, restore phone backups, carry stale caches, lose power, run out of disk, and come back online with writes created by older code. Your migration tests need to model that mess without becoming so slow that nobody runs them.

## Define The Upgrade Contract Before You Touch Fixtures

Write the upgrade contract as plain statements that a tester, developer, and AI coding agent can all follow. A contract is better than a pile of old database files with mysterious names.

| Contract area | What must be true after upgrade | Example failure |
|---|---|---|
| Version detection | The app reads the old stored version correctly | Version missing means the app assumes a clean install |
| Migration ordering | All required migrations run once and in order | Version 4 to 8 skips the version 6 index rebuild |
| Data preservation | User-created records remain readable | Draft test runs disappear after schema split |
| Idempotency | Retrying the same migration is safe | Crash during migration creates duplicate rows |
| Startup behavior | App opens a usable screen or a controlled recovery state | Blank screen before telemetry starts |
| Sync compatibility | Offline mutations replay under the new schema | Old queue payloads fail validation forever |

The contract should mention both data and experience. It is not enough for the database to have the right columns if the app cannot open the project list. It is not enough for startup to succeed if the upgrade silently discards pending uploads.

For a QA skills directory used by AI coding agents, this contract also keeps generated tests grounded. Tell the agent which old versions matter, which user data is sacred, and which recovery screen is acceptable. Otherwise it will generate clean-install tests and call them migrations.

## Pick Source Versions By Risk, Not By History Completeness

You do not need every historical version in every test run. You need coverage for the versions that represent distinct storage shapes and risky release boundaries.

A useful selection grid looks like this:

| Source version | Why it is included | Fixture content |
|---|---|---|
| 1.0.0 | First public schema still seen in backups | One project, one draft, no settings table |
| 2.4.0 | Introduced local queue for offline writes | Pending create and pending update |
| 3.2.0 | Changed IDs from integers to strings | Mixed local and server IDs |
| 4.0.0 | Split run results into multiple tables | Attachments and assertions |
| 5.3.0 | Last version before encryption at rest | Plain local secrets fixture |
| 6.1.0 | Previous production version | Typical current user data |

Keep a slower nightly suite for the long tail if your product has high data retention risk. Keep the pull-request suite focused on a handful of representative starting points. The pull-request suite should catch a broken migration quickly. The nightly suite should catch forgotten historical baggage.

This table should live close to the tests. When product analytics shows that version 2 has almost no active users, you can move it to nightly. When support reports many restored backups from version 3, you promote it.

## Use A Tiny Model To Prove Migration Semantics

The sample below uses an in-memory object store. It is not a replacement for SQLite, IndexedDB, Core Data, Room, Realm, or browser storage tests. It shows the migration properties you should require from any implementation: ordered steps, skipped-version support, and idempotency.

\`\`\`ts
export type StoredAppState = {
  schemaVersion: number;
  projects?: Array<{ id: number; name: string }>;
  projectRecords?: Array<{ id: string; title: string; archived: boolean }>;
  drafts?: Array<{ projectId: number | string; body: string }>;
  syncQueue?: Array<{ kind: string; projectId: number | string; payload: unknown }>;
};

type Migration = (state: StoredAppState) => StoredAppState;

const migrations: Record<number, Migration> = {
  2: (state) => ({
    ...state,
    drafts: state.drafts ?? [],
    schemaVersion: 2
  }),
  3: (state) => ({
    ...state,
    projects: state.projects?.map((project) => ({
      id: project.id,
      name: project.name.trim()
    })),
    schemaVersion: 3
  }),
  4: (state) => ({
    ...state,
    projectRecords: (state.projects ?? []).map((project) => ({
      id: String(project.id),
      title: project.name,
      archived: false
    })),
    projects: undefined,
    drafts: (state.drafts ?? []).map((draft) => ({
      ...draft,
      projectId: String(draft.projectId)
    })),
    syncQueue: (state.syncQueue ?? []).map((entry) => ({
      ...entry,
      projectId: String(entry.projectId)
    })),
    schemaVersion: 4
  }),
  5: (state) => ({
    ...state,
    projectRecords: (state.projectRecords ?? []).map((project) => ({
      ...project,
      archived: project.archived ?? false
    })),
    schemaVersion: 5
  })
};

export function upgradeState(state: StoredAppState, targetVersion: number) {
  let current = structuredClone(state);
  for (let nextVersion = current.schemaVersion + 1; nextVersion <= targetVersion; nextVersion += 1) {
    const migration = migrations[nextVersion];
    if (!migration) {
      throw new Error("Missing migration for schema version " + nextVersion);
    }
    current = migration(current);
  }
  return current;
}
\`\`\`

That code makes one design choice explicit: every target version must have a migration function. If version 3 to version 5 is requested, migration 4 runs. If migration 4 is missing, the upgrade fails loudly instead of pretending the current code knows how to read every old shape.

Now test skipped versions directly:

\`\`\`ts
import { describe, expect, test } from "vitest";
import { StoredAppState, upgradeState } from "./upgrade-state";

describe("app upgrade testing for skipped versions", () => {
  test("upgrades version 1 state to version 5 without losing drafts", () => {
    const oldState: StoredAppState = {
      schemaVersion: 1,
      projects: [{ id: 42, name: " Checkout flow " }],
      drafts: [{ projectId: 42, body: "retry payment failure" }],
      syncQueue: [{ kind: "project.update", projectId: 42, payload: { name: "Checkout flow" } }]
    };

    const upgraded = upgradeState(oldState, 5);

    expect(upgraded.schemaVersion).toBe(5);
    expect(upgraded.projectRecords).toEqual([
      { id: "42", title: "Checkout flow", archived: false }
    ]);
    expect(upgraded.drafts).toEqual([
      { projectId: "42", body: "retry payment failure" }
    ]);
    expect(upgraded.syncQueue).toEqual([
      { kind: "project.update", projectId: "42", payload: { name: "Checkout flow" } }
    ]);
  });
});
\`\`\`

The test does not care how many releases existed between version 1 and version 5. It cares that the installed state lands on a readable current shape.

## Test Idempotency Like A Crash Already Happened

Migration code must survive interruption. Mobile operating systems kill apps. Browsers close tabs. Desktop apps crash during file writes. CI rarely hits those timings by accident, so create the state on purpose.

Idempotency means running a completed migration again does not duplicate, erase, or further transform data. For many systems, you also need resumability, where a partially completed migration can continue. They are related but not identical.

| Property | Test setup | Pass condition |
|---|---|---|
| Idempotent complete migration | State already has the new table or field | Re-running does not duplicate rows |
| Resumable partial migration | Some records moved, version marker not advanced | Migration completes missing work |
| Safe version marker | Crash before final marker write | App retries instead of assuming success |
| Transactional storage | Failure inside step | Old state remains valid or recovery is explicit |

Here is a pure function test for idempotency at the object-model level:

\`\`\`ts
import { expect, test } from "vitest";
import { StoredAppState, upgradeState } from "./upgrade-state";

test("completed upgrades are stable when opened again", () => {
  const upgradedOnce = upgradeState({
    schemaVersion: 1,
    projects: [{ id: 7, name: "Search" }],
    drafts: [{ projectId: 7, body: "edge case notes" }]
  }, 5);

  const upgradedTwice = upgradeState(upgradedOnce, 5);

  expect(upgradedTwice).toEqual(upgradedOnce);
});
\`\`\`

This catches a class of bugs where the app runs migration code on every startup because version detection is wrong. In a real database, you should also assert row counts and unique keys. Duplicate rows are the signature of a retry bug.

For SQL-backed apps, prefer wrapping each migration step in the database transaction model your platform supports. The SQL below is deliberately plain. It records the target version only after the structural work succeeds.

\`\`\`sql
BEGIN;

CREATE TABLE IF NOT EXISTS project_records (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO project_records (id, title, archived)
SELECT CAST(id AS TEXT), TRIM(name), 0
FROM projects;

UPDATE app_metadata
SET value = '4'
WHERE key = 'schema_version';

COMMIT;
\`\`\`

The exact SQL syntax varies by database, but the principles do not. Use a unique key. Make inserts repeat-safe when retry is possible. Update the version marker at the end. Test that the old state is still understandable if the marker does not advance.

## Build Fixtures That Carry User Intent

Old fixtures should not be random dumps. They should tell a story about user intent: a draft that must be kept, an offline queue item that must replay, a setting that must retain privacy behavior, or a local attachment that must still point to the right file.

Example fixture:

\`\`\`json
{
  "schemaVersion": 2,
  "projects": [
    { "id": 12, "name": "Login regression" }
  ],
  "drafts": [
    { "projectId": 12, "body": "Add locked account case" }
  ],
  "syncQueue": [
    {
      "kind": "draft.create",
      "projectId": 12,
      "payload": {
        "body": "Add locked account case"
      }
    }
  ],
  "settings": {
    "telemetry": false
  }
}
\`\`\`

That fixture is better than a production dump with thousands of rows because the expected result is reviewable. If a migration loses the draft, the test failure is meaningful. If a huge anonymized dump changes by 400 lines, nobody knows whether the diff matters.

Use production-shaped data sparingly. A nightly "can read anonymized historical database" test is useful, but it should not replace small intent-rich fixtures in pull requests.

## Cover Offline Queues And Sync Replays

Upgrade paths become harder when the old app stored writes locally and the new app changes payload shape. A user might create a test run on a plane in version 4, update to version 7 in the airport, then reconnect. The sync queue now has to replay old writes through new validation.

If your app has offline behavior, treat upgrade tests and sync tests as one system. The related guide on [mobile offline mode testing sync](/blog/mobile-offline-mode-testing-sync) focuses on queue ordering, conflict handling, and reconnect behavior. For upgrade work, the key is translating queued intent.

| Old queue item | New shape | Test expectation |
|---|---|---|
| \`projectId: 12\` as number | \`projectId: "12"\` as string | Replay uses string ID |
| Draft body at top level | Draft nested under \`payload.body\` | Body is preserved |
| Deleted item queued before edit | Tombstone model | Edit is dropped or conflict is explicit |
| Attachment path in old folder | New scoped storage path | Upload still finds the file or recovery is shown |

Test replay with the current validation code, not only migration code. A migration can transform the queue into a shape that looks right but still fails when the sync worker reads it.

\`\`\`ts
import { expect, test } from "vitest";

type QueueItem = {
  kind: "draft.create";
  projectId: string;
  payload: { body: string };
};

function validateQueueItem(item: QueueItem) {
  if (item.kind !== "draft.create") return false;
  if (typeof item.projectId !== "string") return false;
  if (item.projectId.length === 0) return false;
  if (typeof item.payload.body !== "string") return false;
  return item.payload.body.length > 0;
}

test("migrated offline queue item is accepted by current sync validation", () => {
  const item: QueueItem = {
    kind: "draft.create",
    projectId: "12",
    payload: { body: "Add locked account case" }
  };

  expect(validateQueueItem(item)).toBe(true);
});
\`\`\`

This looks small, but it blocks a painful production failure: the app upgrades cleanly, starts cleanly, then every queued write fails in the background forever.

## Exercise The Startup Path, Not Only The Migration Function

A migration function can pass while the app startup still fails because initialization order changed. Maybe feature flags load after storage. Maybe the router reads settings before migrations finish. Maybe telemetry starts early and crashes on a missing column. Upgrade testing needs one end-to-end startup check per high-risk source version.

For web apps, that can be a Playwright test with seeded IndexedDB or local storage. For mobile, it can be an emulator, simulator, or real-device test that installs an old build, creates data, upgrades over it, and launches the new build. The exact tool depends on your stack, but the sequence should be concrete:

| Step | What it proves |
|---|---|
| Install or seed old state | Source version is real |
| Create user-owned data | Fixture represents behavior, not only schema |
| Install current build over old state | Upgrade path is exercised |
| Launch and wait for stable screen | Startup order is valid |
| Inspect data in UI and storage | User intent survived |
| Trigger sync if relevant | Background compatibility is valid |

For browser storage, a Playwright-style setup can seed local storage before opening the app. The example uses plain browser APIs:

\`\`\`ts
import { expect, test } from "@playwright/test";

test("opens current app with version 2 local state", async ({ page }) => {
  await page.goto("http://127.0.0.1:5173/blank.html");
  await page.evaluate(() => {
    window.localStorage.setItem("app_state", JSON.stringify({
      schemaVersion: 2,
      projects: [{ id: 12, name: "Login regression" }],
      drafts: [{ projectId: 12, body: "Add locked account case" }]
    }));
  });

  await page.goto("http://127.0.0.1:5173/");

  await expect(page.getByText("Login regression")).toBeVisible();
  await expect(page.getByText("Add locked account case")).toBeVisible();
});
\`\`\`

Do not stop at "page loaded." Assert the old user data is visible through the current UI. Startup without data is a false pass for migration work.

## A Failure Story: The Upgrade That Passed CI And Lost Drafts

The symptom was a support spike after a mobile release. Users who had skipped several versions said their saved test case drafts were gone. The wrong theory was that the new editor failed to render drafts because the UI team had replaced the editor component in the same release.

The actual cause was an old migration that converted numeric project IDs to string IDs in the projects table, but did not convert IDs inside the drafts table. Users upgrading from the previous version were safe because a later migration touched drafts. Users jumping from version 2 to version 6 ran both migrations, but the later one only handled drafts that already had a new wrapper object. The skipped-version path left drafts pointing at numeric IDs that no current query used.

The fix was to make the ID conversion migration cover every table and every queue payload that referenced project IDs. QA added fixtures for version 2 with drafts, attachments, and sync items. The new assertion did not only count drafts. It opened the project and expected the draft body to appear under the right project.

The lesson was uncomfortable: the migration sequence was tested, but the fixture did not carry enough user intent to expose broken relationships.

## What People Get Wrong About Version Markers

The most common mistake is treating the version marker as the migration. It is only a marker. If code writes \`schemaVersion = 8\` before the data transformation completes, a crash can leave the app convinced it is current while the stored data is half old.

Better pattern:

| Bad marker habit | Safer approach |
|---|---|
| Advance marker at migration start | Advance after successful step |
| Use app release version as storage version | Use a separate schema version |
| Assume missing marker means current | Treat missing marker as legacy or invalid and test it |
| Store one marker but migrate many stores | Track enough state to recover each store safely |

Release versions are for humans and distribution. Schema versions are for storage. They may move together for a while, but coupling them forever creates strange pressure. A copy-only UI release should not need a storage migration. A hotfix might need one.

## Add Rollback And Failed-Upgrade Scenarios

Rollback is not the same as downgrade. Many apps cannot safely open a new database with old code, and that is acceptable if it is explicit. What matters is that a failed upgrade has a recovery path and that deployment rollback does not strand users.

The related article on [migration rollback testing schema changes](/blog/migration-rollback-testing-schema-changes) covers database rollback in more depth. For app upgrade testing, include these cases:

| Scenario | Expected behavior |
|---|---|
| Migration fails before marker update | App retries or shows repair flow |
| Migration fails after partial writes | Transaction rolls back or recovery completes missing work |
| New app writes new schema, old app opens it | Old app blocks with clear upgrade-required state |
| Server rolls back while clients are upgraded | API remains compatible or clients receive controlled errors |

A simple failed-step test can protect the marker rule:

\`\`\`ts
import { expect, test } from "vitest";

type VersionedStore = {
  schemaVersion: number;
  values: string[];
};

function unsafeMigrationThatFails(store: VersionedStore) {
  // Deliberately unsafe: mutates the live store in place, then fails before
  // advancing the version marker. This is the bug shape the test must catch.
  store.values.push("new-value");
  throw new Error("disk full");
}

test("failed migration does not advance the version marker", () => {
  const original: VersionedStore = { schemaVersion: 3, values: ["old-value"] };

  try {
    unsafeMigrationThatFails(original);
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
  }

  // The marker must not advance, and the partial write must be visible,
  // proving the migrator is not atomic and rollback or staging is required.
  expect(original.schemaVersion).toBe(3);
  expect(original.values).toContain("new-value");
});
\`\`\`

In a real storage engine, prove the same property with transactions or a recoverable journal. The pure test only demonstrates the contract.

## Put Upgrade Paths Into CI Without Making CI Miserable

Run the fast migration matrix on every pull request. Run install-over-old-build tests on a schedule, before release branches, and before store submission. Save artifacts when failures happen because upgrade bugs are hard to reconstruct from logs alone.

\`\`\`yaml
name: upgrade-tests

on:
  pull_request:
  workflow_dispatch:

jobs:
  migration-matrix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test -- -t "upgrade"
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: upgrade-test-output
          path: test-results
\`\`\`

Vitest test-name filtering uses \`-t\` or \`--testNamePattern\`. Playwright uses \`--grep\` or \`-g\`. Do not swap them in CI, because a filter typo can turn a targeted migration job into a run that executes nothing useful.

Keep artifacts small and relevant: the old fixture, migrated fixture, app logs, and screenshots of the recovery state. A 500 MB emulator dump is less useful than a clear before-and-after storage export with the failing test name.

## Review Upgrade Changes With A Data-Loss Lens

When reviewing an upgrade pull request, read it like a data-loss incident report that has not happened yet. Ask these questions:

| Review question | Evidence you want |
|---|---|
| Which old versions can reach this code? | Source-version matrix updated |
| What user-owned data changes shape? | Fixture with expected transformed data |
| Can the step run twice? | Idempotency test or transactional proof |
| What happens if the app dies mid-step? | Marker and recovery test |
| Do offline writes still replay? | Queue validation or sync test |
| Can support diagnose failures? | Error code, log event, or recovery screen |

The reviewer should reject migrations that only work for clean installs. Clean installs are table stakes. The release risk lives inside old state.

## Frequently Asked Questions

### Which source versions should app upgrade testing include?

Include versions that represent distinct stored data shapes, not every release number by default. Start with the oldest supported version, the previous production version, and releases that introduced storage, ID, encryption, attachment, or offline-queue changes. Promote a version when analytics, support, or backup restore behavior shows that many users still carry it. Keep the pull-request matrix small enough to run quickly, then use scheduled jobs for the long historical tail.

### Is it enough to test database migrations without launching the app?

No. Migration-function tests are necessary, but they do not prove startup order, UI reads, feature flags, or sync workers can consume the migrated state. Add at least one startup test for each high-risk source version. The test should open the current app over old state and assert that user-owned data is visible or recoverable. A launch-only assertion is too weak because the app can boot into an empty or partially broken state.

### How should I test skipped-version upgrades?

Create fixtures from older schema versions and upgrade them directly to the current target. Assert the final version marker, transformed records, relationships, offline queue payloads, and visible UI state. Do not simulate skipped versions by only running the previous migration. Real users jump across multiple storage shapes, so the test must start from the old shape. Keep expected results small and reviewable so failures tell you what user intent was lost.

### Should an app support downgrades after a migration?

Not always. Some products can support downgrades, but many apps cannot safely open new storage with old code. What matters is an explicit policy and a tested recovery path. If downgrade is unsupported, old code should block with a clear upgrade-required state instead of corrupting data. If server rollback is possible while clients remain upgraded, test API compatibility or controlled errors so users are not stranded after deployment rollback.
`,
};
