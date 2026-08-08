import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Jest Snapshot Obsolete Cleanup CI: Detect Drift Without Hiding Regressions',
  description: 'Implement Jest snapshot obsolete cleanup CI checks that detect stale artifacts, produce reviewable diffs, and prevent accidental snapshot rewrites from masking defects.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Jest Snapshot Obsolete Cleanup CI: Detect Drift Without Hiding Regressions

A safe Jest snapshot obsolete cleanup CI workflow has two distinct modes. Pull request verification runs Jest in CI mode without updating snapshots, so new, mismatched, and obsolete snapshot state fails visibly. A separate drift check runs the complete owning test project with \`--updateSnapshot\` in a disposable CI workspace, then uses \`git diff --exit-code\` to prove that the committed snapshot files were already current. CI reports the patch as an artifact or log, but it never pushes the rewrite automatically.

That separation protects review intent. Snapshot updates are source changes, not housekeeping that a green job should quietly perform. An obsolete entry may mean a renamed test, a deleted case, a test that stopped executing, or a feature that was removed. The correct response depends on why it became unreachable. Cleanup must make that evidence easier to inspect, not erase it before anyone looks.

This article assumes Jest's built-in snapshot support and a GitHub Actions runner, although the control flow works in other CI systems. For broader runner selection, see the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026). If browser-facing assertions are replacing brittle UI snapshots, use the [Playwright locator practices guide](/blog/playwright-best-practices-locators-2026) to design resilient element checks.

## Understand what “obsolete” means in a snapshot suite

Jest stores external snapshots in \`__snapshots__\` files beside the test file by default. A snapshot entry is obsolete when the snapshot file contains a key that the executed test suite no longer claims. A whole snapshot file can also become orphaned when its associated test file disappears. These two cases look similar in a diff but require different checks.

| Drift type | Typical cause | What the reviewer must establish |
|---|---|---|
| Mismatched snapshot | Rendered or serialized output changed | Whether product behavior changed intentionally |
| New snapshot | A new snapshot assertion has no committed baseline | Whether the assertion scope is appropriate |
| Obsolete entry | Test title, parameter label, or assertion count changed | Whether coverage moved or disappeared |
| Orphaned \`.snap\` file | Test file deleted or renamed | Whether deletion is complete and intentional |
| Unstable snapshot | Time, random IDs, locale, or ordering varies | Which nondeterministic field needs normalization |

Jest documents \`--ci\` and \`--updateSnapshot\` in its CLI reference at https://jestjs.io/docs/cli and snapshot principles at https://jestjs.io/docs/snapshot-testing. In CI mode, Jest does not silently write a new snapshot. Updating snapshots is an explicit operation through \`--updateSnapshot\`, whose short alias is \`-u\`.

The important phrase is “executed test suite.” A cleanup run that selects only changed tests, a single test name, or one shard may lack enough information to declare the rest obsolete safely. Run the complete Jest project that owns the snapshot files before treating an update diff as authoritative.

## Create snapshots with a narrow, stable contract

Use snapshots when the serialized representation is meaningful and reviewable. The following example snapshots an audit line after removing fields whose values vary by run:

\`\`\`ts
// src/audit-event.ts
export interface AuditEvent {
  id: string;
  occurredAt: string;
  actor: { id: string; email: string };
  action: 'order.created' | 'order.cancelled';
  metadata: Record<string, string>;
}

export function auditDisplay(event: AuditEvent) {
  return {
    actor: event.actor.email,
    action: event.action,
    metadata: Object.fromEntries(
      Object.entries(event.metadata).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
  };
}
\`\`\`

\`\`\`ts
// src/audit-event.test.ts
import { auditDisplay, type AuditEvent } from './audit-event';

test('formats an order-created audit event', () => {
  const event: AuditEvent = {
    id: 'evt_123',
    occurredAt: '2026-08-08T09:30:00.000Z',
    actor: { id: 'usr_7', email: 'qa@example.test' },
    action: 'order.created',
    metadata: {
      region: 'ap-south',
      orderId: 'ord_42',
    },
  };

  expect(auditDisplay(event)).toMatchSnapshot();
});
\`\`\`

The committed snapshot is small enough to review:

\`\`\`text
// Jest Snapshot v1, https://jestjs.io/docs/snapshot-testing

exports[\`formats an order-created audit event 1\`] = \`
{
  "action": "order.created",
  "actor": "qa@example.test",
  "metadata": {
    "orderId": "ord_42",
    "region": "ap-south",
  },
}
\`;
\`\`\`

Snapshot serializer formatting depends on the Jest version, so the exact file representation shown is illustrative. Commit the output generated by the repository's pinned version. Do not hand-author snapshot formatting as a routine practice.

What people get wrong is snapshotting everything, then trusting \`-u\` as an approval mechanism. Updating a thousand-line object proves only that Jest can serialize the new value. It does not prove that every changed field is correct. Keep the object narrow, use property matchers or explicit assertions for volatile data, and treat the update patch as a product-behavior review.

## Make local update commands intentionally different from CI checks

Package scripts should communicate whether they verify or rewrite:

\`\`\`json
{
  "scripts": {
    "test": "jest",
    "test:ci": "jest --ci",
    "test:snapshots:update": "jest --updateSnapshot --runInBand",
    "test:snapshots:check": "jest --ci --runInBand"
  }
}
\`\`\`

\`--runInBand\` is optional. It makes snapshot diagnosis and console output easier to follow, but it should not be used to conceal shared-state defects. Use the normal parallel configuration after cleanup to confirm the suite remains worker-safe.

The local reviewer workflow is:

\`\`\`sh
npm ci
npm run test:snapshots:check
npm run test:snapshots:update
git diff -- '**/__snapshots__/*.snap' '*.test.ts' '*.test.tsx'
npm run test:snapshots:check
\`\`\`

The quoted pathspecs prevent the shell from expanding them prematurely and let Git match repository paths. Adjust extensions to the repository. The update command must run all tests in the owning Jest project. If the monorepo has multiple projects, create one explicit script per project or invoke the appropriate documented Jest configuration.

| Command | Writes workspace snapshots | Appropriate purpose |
|---|---:|---|
| \`jest --ci\` | No new baseline updates | Pull request gate |
| \`jest --updateSnapshot\` | Yes | Deliberate local review or disposable drift probe |
| \`jest -u -t "name"\` | Can update selected scope | Targeted authoring, not authoritative global cleanup |
| \`git diff --exit-code\` | No | Detect uncommitted drift after update |
| \`git status --short\` | No | Inventory created, removed, and modified files |

Do not hide \`--updateSnapshot\` inside the ordinary \`test\` script. A developer running a verification command should not rewrite evidence as a side effect.

## Build the pull request verification job

The primary job installs exactly from the lockfile and runs Jest in CI mode:

\`\`\`yaml
# .github/workflows/test.yml
name: test

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: read

jobs:
  jest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run test:ci
\`\`\`

This job should fail on behavior drift. It should not run \`git add\`, create a commit, or push to the pull request. Pin third-party actions according to organizational policy. The major tags shown are readable examples, not a substitute for a supply-chain review.

A pull request that intentionally changes a snapshot should include the product change, test change if needed, and reviewed snapshot patch in the same commit series. Reviewers can then connect each output difference to a requirement.

## Add a disposable snapshot drift probe

The second job answers a different question: if the full suite updated snapshots now, would the repository change? It updates only the runner's ephemeral checkout, captures status, and fails when any tracked or untracked snapshot artifact differs.

\`\`\`yaml
# .github/workflows/snapshot-drift.yml
name: snapshot-drift

on:
  pull_request:

permissions:
  contents: read

jobs:
  snapshot-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - name: Update snapshots in disposable checkout
        run: npm run test:snapshots:update
      - name: Show snapshot workspace status
        run: git status --short
      - name: Save tracked snapshot patch
        run: git diff --binary > /tmp/snapshot-drift.patch
      - name: Fail on tracked or untracked drift
        run: |
          untracked="$(git ls-files --others --exclude-standard)"
          if [ -n "$untracked" ]; then
            echo "Untracked files remain after snapshot update:"
            echo "$untracked"
            exit 1
          fi
          git diff --exit-code
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: snapshot-drift
          path: /tmp/snapshot-drift.patch
          if-no-files-found: ignore
\`\`\`

\`git diff --exit-code\` detects modifications and deletions to tracked files, but it does not report untracked files, so the shell step checks both. It quotes \`$untracked\` to avoid word splitting when printing the diagnostic. If the repository legitimately generates unrelated untracked outputs, clean them through the producing tool or constrain the inventory carefully without excluding genuinely new snapshots.

The patch is generated before the detection step and uploaded only when that step fails. It contains tracked changes, while the status output identifies untracked files. Do not include secrets or sensitive rendered customer data in snapshots or uploaded patches.

Keep the drift job independent from build steps that rewrite source fixtures, generated clients, or lockfiles. Otherwise the final Git check mixes snapshot evidence with unrelated generator drift, and the failure becomes harder to assign. If tests require generated assets, produce them in an earlier verification job and check those assets separately, or establish a clean baseline after the approved generation step before updating snapshots. The snapshot probe should answer one narrow question: whether executing the complete snapshot-owning suite changes its committed test artifacts.

## Catch orphaned snapshot files that Jest may not visit

When a test file is deleted, the safest orphan check compares each \`__snapshots__/name.snap\` path with its likely owner. Naming conventions can vary with extensions and transforms, so a repository-specific script is clearer than a fragile shell one-liner.

The following Node script supports test filenames ending in \`.test.ts\`, \`.test.tsx\`, \`.spec.ts\`, or \`.spec.tsx\`:

\`\`\`js
// scripts/check-orphan-snapshots.mjs
import { access, readdir } from 'node:fs/promises';
import path from 'node:path';

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

const root = process.cwd();
const allFiles = await walk(root);
const snapshots = allFiles.filter((file) =>
  file.includes(path.sep + '__snapshots__' + path.sep) &&
  file.endsWith('.snap'),
);
const orphans = [];

for (const snapshot of snapshots) {
  const testDirectory = path.dirname(path.dirname(snapshot));
  const snapshotName = path.basename(snapshot, '.snap');
  const owner = path.join(testDirectory, snapshotName);
  if (!await exists(owner)) {
    orphans.push(path.relative(root, snapshot));
  }
}

if (orphans.length > 0) {
  console.error('Orphaned snapshot files:');
  console.error(orphans.join('\\n'));
  process.exitCode = 1;
}
\`\`\`

Jest snapshot filenames commonly include the full test filename before \`.snap\`, such as \`audit-event.test.ts.snap\`. Removing only the final \`.snap\` therefore yields the owner path. The script avoids following symbolic-link directories because \`Dirent.isDirectory()\` is false for a symbolic link, which prevents accidental traversal outside the tree. In a large repository, scope \`root\` to source packages to avoid scanning dependency directories.

Add it before the drift update:

\`\`\`json
{
  "scripts": {
    "test:snapshots:orphans": "node scripts/check-orphan-snapshots.mjs",
    "test:snapshots:update": "jest --updateSnapshot --runInBand"
  }
}
\`\`\`

This checker is convention-based. If the project uses a custom snapshot resolver, derive ownership using that same resolver rather than assuming Jest's default location.

## Diagnose an obsolete snapshot before deleting it

Imagine CI reports one obsolete snapshot after a refactor from:

\`\`\`ts
test.each(['draft', 'submitted'])('renders order %s', (status) => {
  expect(renderOrder(status)).toMatchSnapshot();
});
\`\`\`

to:

\`\`\`ts
test.each(['draft'])('renders order %s', (status) => {
  expect(renderOrder(status)).toMatchSnapshot();
});
\`\`\`

Running \`-u\` will remove the submitted entry, but the diff alone cannot explain why the case disappeared. Diagnose in this order:

1. Inspect the source diff that changed the parameter table.
2. Find the requirement that says whether submitted remains supported.
3. Search for an equivalent explicit assertion or test at another level.
4. Run the pre-update test suite and capture Jest's obsolete summary.
5. Only then update and review the exact removed key.

If submitted orders are still valid, the obsolete snapshot is a coverage regression. Restore the case or replace it with more focused assertions. If support was intentionally removed, deletion is correct, and the product change should make that decision obvious.

| Observation | Likely diagnosis | Safe next action |
|---|---|---|
| One key vanished after test rename | Identity changed, behavior may not have | Review old and new values, then update |
| Many snapshots changed ordering | Serializer, runtime, or locale drift | Stabilize environment before approving |
| Snapshot file deleted with its test | Feature or test removal | Confirm replacement coverage |
| Obsolete notice appears only in full run | Focused runs missed owning suite | Keep cleanup full-scope |
| Update changes product test plus unrelated snapshots | Environment or version mismatch | Reproduce from clean lockfile install |

The realistic failure mode is an automatic bot running \`jest -u\` on every pull request and committing the result. A developer accidentally removes the submitted case, the bot deletes its snapshot, and the final branch is green. The cleanup automation has converted lost coverage into an apparently tidy patch. The remedy is not a smarter commit message. Stop automatic mutation, fail the drift job, and require a person to connect deletions to requirements.

## Prevent nondeterminism from looking like obsolescence

Snapshot churn is often caused by unstable values rather than obsolete keys. Normalize only fields that are intentionally outside the contract. Do not erase meaningful timestamps, identifiers, or ordering simply to make the file quiet.

Property matchers can preserve structure while accepting dynamic fields:

\`\`\`ts
test('creates an audit envelope', () => {
  const result = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    action: 'order.created',
  };

  expect(result).toMatchSnapshot({
    id: expect.any(String),
    createdAt: expect.any(String),
  });
});
\`\`\`

This sample uses globals available in the configured runtime. If \`crypto.randomUUID\` is not available in the project's supported Node environment, import \`randomUUID\` from \`node:crypto\`. The matchers assert types, but they do not validate UUID shape or timestamp parseability. Add explicit assertions when those details are part of the API contract.

Stable ordering is another common issue. Sort only collections whose contract is order-insensitive. If UI order matters, sorting in the test would mask a regression. Configure timezone and locale explicitly when output depends on them, and pin the Node and Jest versions through normal repository tooling.

## Handle monorepos, shards, and changed-test selection

Snapshot cleanup and test distribution have conflicting goals. Sharding makes verification faster, while cleanup needs a complete view of every snapshot owned by the project. Keep them separate.

| CI mode | Test selection | May update snapshots? | Purpose |
|---|---|---:|---|
| PR shards | All tests split across jobs | No | Fast behavior verification |
| Changed tests | Dependency-related subset | No | Developer feedback |
| Cleanup probe | Full owning Jest project, one coherent run | Yes, disposable only | Detect drift |
| Local authoring | Focused test or name pattern | Yes, reviewed | Iterate on intended change |

Do not have multiple shards write into a shared checkout or artifact directory. Concurrent snapshot rewrites can race, and no shard knows whether an entry belongs to a test handled elsewhere. The cleanup probe can run less frequently if the full suite is expensive, but pull request verification should still refuse unreviewed new or mismatched snapshots.

For Jest \`projects\`, execute the configuration that includes every project owning the target snapshots, or perform one cleanup command per project in stable sequence. Ensure display names and roots prevent two projects from claiming the same snapshot path.

## Review snapshot patches as structured evidence

A good snapshot review asks what changed at three levels:

- Test identity: Did a title, parameter, or assertion count change?
- Contract shape: Were meaningful fields added, removed, or reordered?
- Concrete values: Did user-visible text, state, permissions, or accessibility data change?

Large patches deserve decomposition. Replace a broad snapshot with smaller snapshots or explicit matchers before approving the behavior change. Do not accept a serializer upgrade and a product change in the same snapshot patch if they can be separated. A mechanical formatting rewrite makes semantic differences harder to see.

Keep snapshot files in normal code ownership. Require QA or component owners for sensitive areas, such as authorization decisions, invoices, API error bodies, and accessibility output. A snapshot is executable test data, and changes should receive the same review rigor as an assertion written inline.

## Establish a cleanup policy the team can follow

The policy can fit in a short repository document:

1. Verification never updates snapshots.
2. Updates run from a clean dependency install with the pinned runtime.
3. Cleanup covers the complete owning Jest project.
4. Every removed key is explained by a requirement, rename, or replacement test.
5. CI may create a disposable patch but never push it automatically.
6. Orphan checks reflect the repository's snapshot resolver.
7. Snapshot updates and serializer upgrades are separated from unrelated behavior changes.

Measure the workflow with repository-specific data: number of drift failures, time to diagnosis, repeated sources of churn, and obsolete entries that exposed missing coverage. Do not optimize for zero snapshot changes. The goal is meaningful, explainable change.

## Frequently Asked Questions

### Should CI run Jest with updateSnapshot enabled?

Not in the primary verification job. Use \`jest --ci\` there so snapshot drift fails without being rewritten. A separate disposable job may run \`jest --updateSnapshot\` to reveal what cleanup would change, followed by tracked and untracked file checks. That job should fail and expose the patch for review, not commit it. Keeping verification and mutation separate prevents an accidental product change or deleted test case from receiving a fresh baseline automatically.

### Does git diff --exit-code catch every new snapshot?

No. It catches modifications and deletions of tracked files, but ordinary Git diff output does not include untracked files. Pair it with \`git ls-files --others --exclude-standard\` or an equivalent repository-aware check. Also print \`git status --short\` for diagnosis. If the test command generates unrelated untracked outputs, either clean them through their owning tool or constrain the check to expected snapshot paths without ignoring genuinely new snapshot files.

### Can I clean obsolete snapshots with a focused Jest test name?

A focused update is useful while authoring one intentional change, but it is weak evidence for repository-wide cleanup. Test-name filters, changed-test selection, and shards do not necessarily execute every snapshot assertion in the owning project. Run the complete project before declaring entries or files obsolete. Review the focused patch locally, then run a full non-updating CI check and the full disposable drift probe to confirm no unrelated state remains.

### When should I replace a snapshot with explicit assertions?

Replace it when reviewers cannot identify the contract quickly, when unrelated representation fields dominate diffs, or when a small number of business rules matter more than the complete serialized output. Explicit assertions are especially useful for authorization, totals, error codes, and state transitions. Keep snapshots for compact representations where the whole shape is meaningful. A hybrid often works best: explicit assertions for critical semantics and a small snapshot for stable presentation details.
`,
};
