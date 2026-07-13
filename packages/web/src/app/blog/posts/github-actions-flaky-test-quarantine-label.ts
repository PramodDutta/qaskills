import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Quarantine Flaky Tests with a GitHub Actions Label',
  description:
    'Quarantine flaky tests with a GitHub Actions pull-request label while keeping mandatory coverage, visible failures, expiry metadata, and auditable CI gates.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Quarantine Flaky Tests with a GitHub Actions Label

Build 814 fails on the same date-picker test for the third time, and rerunning turns it green. Removing the test protects CI speed but erases coverage; retrying the entire suite hides whether a new defect is intermittent. A controlled quarantine keeps the unstable test running in a separate, visible lane while the reliable suite remains a required gate.

A pull-request label can authorize that temporary routing. The label must not turn arbitrary red tests green. It should activate only a checked-in quarantine manifest whose entries name the test, owner, issue, reason, and expiry. Any failure outside that manifest stays blocking.

## Define what the label is allowed to change

Use a deliberately specific label such as \`ci:quarantine-approved\`. Its meaning is not “ignore failures.” It means “run reviewed quarantine entries in a nonblocking job and run everything else as the required suite.” Repository permissions determine who can apply it, and branch protection determines which job must succeed.

| Pipeline condition | Mandatory suite | Quarantine lane | Merge outcome |
| --- | --- | --- | --- |
| Label absent | Run all tests | Not needed | Any failure blocks |
| Approved label present, manifest valid | Exclude listed tests | Run only listed tests | Reliable failure blocks; known flaky failure is visible |
| Label present, manifest expired | Fail validation | Do not grant exception | Merge blocks |
| Label present, test not in manifest fails | Failure remains in mandatory suite | Irrelevant | Merge blocks |
| Quarantined test becomes stable | Mandatory suite still excludes until removal | Lane stays green | Cleanup bot or owner removes entry |
| Manifest selector matches no test | Fail validation or collection check | Empty lane is an error | Merge blocks |

This design makes quarantine an explicit code and workflow change, not a label that can forgive an unknown result after the fact. The label controls routing only for already identified tests.

For general workflow structure and caching, see the [GitHub Actions testing guide](/blog/github-actions-testing-ci-cd-guide). The controls below are specific to flaky-test isolation.

## Mark tests with stable quarantine tags

Playwright supports tags in test details and filtering with \`--grep\` and \`--grep-invert\`. Give each quarantined test a stable issue tag in addition to the common marker. The issue tag avoids relying on a title that maintainers may edit.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test(
  'date picker crosses the daylight-saving boundary',
  { tag: ['@quarantine', '@flake-1842'] },
  async ({ page }) => {
    await page.goto('/booking');
    await page.getByLabel('Departure date').fill('2026-11-01');
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page.getByTestId('selected-date')).toHaveText('Nov 1, 2026');
  },
);
\`\`\`

The test remains ordinary Playwright code. Do not use \`test.skip()\`, because skipped code supplies no pass or failure signal. Do not mark it \`test.fixme()\` unless the intention is to stop execution entirely. Quarantine is valuable precisely because the test continues producing evidence.

Other runners need an equivalent selection mechanism: pytest markers, Vitest project or filename patterns, JUnit tags, or a manifest consumed by a custom reporter. Use a selector the runner reports clearly.

## Store ownership and expiry outside the workflow

A tag says which test is isolated; it does not explain why. Keep a machine-readable file under review:

\`\`\`json
{
  "entries": [
    {
      "tag": "@flake-1842",
      "owner": "checkout-quality",
      "issue": "https://github.com/example/shop/issues/1842",
      "reason": "Intermittent timezone conversion after WebKit navigation",
      "expiresOn": "2026-07-27"
    }
  ]
}
\`\`\`

An issue URL is data, not an internal blog link, so it does not affect site navigation requirements. In a real repository, use its actual organization and issue.

Validate that every entry has a recognized tag, parseable future date, nonempty owner, and issue reference. Also scan tests so every \`@quarantine\` has an issue tag present in the manifest and every manifest tag selects at least one collected test. This bidirectional check prevents abandoned metadata and untracked quarantine.

## Route jobs from the pull-request label

The workflow below runs on pull-request changes, including labeling. When \`ci:quarantine-approved\` is absent, the required job runs the complete suite. When present, it excludes \`@quarantine\`, while a separate job runs only quarantined tests and is allowed to report failure without failing the workflow.

\`\`\`yaml
name: Browser tests

on:
  pull_request:
    types: [opened, synchronize, reopened, labeled, unlabeled]

permissions:
  contents: read

jobs:
  validate-quarantine:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - run: pnpm install --frozen-lockfile
      - run: node scripts/validate-quarantine.mjs

  required-tests:
    needs: validate-quarantine
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - name: Run every test when quarantine is not approved
        if: \${{ !contains(github.event.pull_request.labels.*.name, 'ci:quarantine-approved') }}
        run: pnpm exec playwright test
      - name: Run the reliable gate when quarantine is approved
        if: \${{ contains(github.event.pull_request.labels.*.name, 'ci:quarantine-approved') }}
        run: pnpm exec playwright test --grep-invert @quarantine

  quarantined-tests:
    needs: validate-quarantine
    if: \${{ contains(github.event.pull_request.labels.*.name, 'ci:quarantine-approved') }}
    continue-on-error: true
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm exec playwright test --grep @quarantine
      - if: \${{ always() }}
        uses: actions/upload-artifact@v4
        with:
          name: quarantined-playwright-report
          path: playwright-report
          retention-days: 14
\`\`\`

The expression uses GitHub's object filter to obtain label names and \`contains()\` to test membership. Including \`labeled\` and \`unlabeled\` in activity types causes a label change to create a new workflow run. \`synchronize\` handles new commits.

Pin actions to reviewed commit SHAs in higher-assurance repositories. Version tags keep the example readable but are mutable references.

## Make the reliable job the branch-protection gate

Configure \`required-tests\` and \`validate-quarantine\` as required status checks. Do not require \`quarantined-tests\`, because its purpose is observation while remediation proceeds. Conversely, do not put \`continue-on-error\` on a step that runs both reliable and quarantined tests.

GitHub job-level \`continue-on-error: true\` lets the job conclude without failing the workflow, while the job UI still exposes its outcome. Artifact upload uses \`always()\` so traces and reports survive a red test command.

Branch protection keys checks by workflow/job identity. Rename jobs carefully, since required checks may need repository setting updates. Test the workflow on a nonprotected branch or a temporary repository rule before depending on it.

## Validate expiry without timezone ambiguity

Expiry should be a date interpreted in UTC, and the validator should fail closed. This Node script reads the manifest, validates fields, and rejects entries whose expiry is today or earlier. It uses only built-in APIs.

\`\`\`javascript
// scripts/validate-quarantine.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(
  await readFile(new URL('../test-quarantine.json', import.meta.url), 'utf8'),
);

assert.ok(Array.isArray(manifest.entries), 'entries must be an array');
const seen = new Set();
const today = new Date().toISOString().slice(0, 10);

for (const entry of manifest.entries) {
  assert.match(entry.tag, /^@flake-[0-9]+$/);
  assert.ok(!seen.has(entry.tag), \`duplicate tag: \${entry.tag}\`);
  seen.add(entry.tag);
  assert.ok(entry.owner.trim(), \`missing owner for \${entry.tag}\`);
  assert.match(entry.issue, /^https:\/\/github\.com\//);
  assert.match(entry.expiresOn, /^\\d{4}-\\d{2}-\\d{2}$/);
  assert.ok(
    entry.expiresOn > today,
    \`quarantine \${entry.tag} expired on \${entry.expiresOn}\`,
  );
}

console.log(\`Validated \${manifest.entries.length} quarantine entries\`);
\`\`\`

Lexical comparison is valid for zero-padded ISO calendar dates. A more complete validator should also confirm the date exists, because a string such as 2026-02-31 matches the regular expression. Construct a UTC date and round-trip its components, or use the repository's approved date library.

Expiry is a forcing function, not automatic deletion. When it arrives, the build blocks until an owner removes the quarantine after demonstrating stability or renews it with evidence and review.

## Prevent labels from becoming an unrestricted bypass

Anyone who can label a pull request may be able to influence routing. Protect the workflow at several layers.

| Control | Failure it prevents |
| --- | --- |
| Checked-in manifest | Label cannot quarantine an arbitrary new failure |
| CODEOWNERS on workflow and manifest | Exception policy receives designated review |
| Required validation job | Expired or malformed entries cannot route |
| Exact runner tag | Only identified tests leave the blocking lane |
| Restricted label permissions | Untrusted contributor cannot self-approve |
| Pull-request event, read-only token | Fork code gets minimal repository authority |
| Artifact retention | Flaky evidence remains available for diagnosis |

Avoid \`pull_request_target\` for running untrusted pull-request code. That event can provide privileged base-repository context, and checking out contributor code in it creates serious risk. The ordinary \`pull_request\` event with read-only permissions is suitable for test execution.

A label name is not authorization by itself. Repository role settings, CODEOWNERS review, environment protection, or a separate approval action must define who may apply the exception in your threat model.

## Do not use retry as quarantine

Retries answer “did the same test pass on another attempt?” Quarantine answers “may this already identified unstable signal be nonblocking temporarily?” They are complementary but not interchangeable.

Global retries can turn a new race into a green build with no review. If retries are enabled, publish retry counts and treat a pass-on-retry as flaky telemetry. The quarantine decision should still require ownership and an issue.

| Mechanism | Keeps test running | Blocks merge | Intended duration |
| --- | --- | --- | --- |
| Immediate rerun | Yes | Usually based on final attempt | Diagnostic moment |
| Runner retry | Yes | Depends on final attempt | Standing resilience, used carefully |
| Quarantine lane | Yes | No for listed tests | Short, owned remediation window |
| Skip or disable | No | No | Last resort, poorest evidence |
| Delete test | No | No | Only when behavior is obsolete |

The [AI flaky-test detection guide](/blog/ai-flaky-test-detection-guide) discusses classification signals. Regardless of detection method, routing must remain auditable and narrow.

## Keep new failures in the mandatory lane

The central invariant is selector complementarity. With the label, required tests run \`--grep-invert @quarantine\`; the nonblocking job runs \`--grep @quarantine\`. A newly failing untagged test remains required.

Validate that no broad file pattern, project setting, or test annotation excludes additional cases. Compare Playwright's collected test list for full, reliable, and quarantine selections. The counts should satisfy full equals reliable plus quarantine, with no duplicate selection.

Beware dynamically generated titles and conditional test declaration. Collection must be stable in CI. A quarantined tag inside a branch that does not execute can make the manifest look valid locally and empty on the target runner.

When a pull request adds a quarantine tag, the manifest change and issue should be in the same review. Do not allow a label alone to mutate source files or create entries automatically without review.

## Report quarantine as debt, not noise

Upload the HTML report, traces on failure, and a concise job summary listing tag, owner, issue, expiry, and current result. Avoid posting a fresh pull-request comment on every synchronization unless comments are updated in place; notification fatigue makes failures invisible.

Track age and result history. A quarantined test that passes consistently across a defined observation window is a removal candidate. A test that fails every run may be a deterministic defect, not a flake, and should be fixed or converted into a known product issue with an explicit test expectation.

No universal pass count proves stability. Choose a window based on execution frequency and risk, and report it as policy rather than a statistical certainty. High-impact payment or permission tests deserve a stricter path than cosmetic animation coverage.

## Test the workflow policy itself

CI configuration deserves scenario tests before it becomes a merge gate. Open a draft pull request containing one reliably passing test, one deliberately failing untagged test, and one deliberately failing tagged test. Without the approval label, the complete required run must fail. With the label and valid manifest, the untagged failure must still fail the required job. After removing that untagged defect, the required job should pass while the quarantine lane displays its failure.

Then exercise metadata failures: expired date, missing owner, duplicate issue tag, manifest entry with no collected test, and tagged test with no manifest record. Each should block in validation. Remove and reapply the label to confirm the activity filters start fresh runs. These checks can live in a disposable workflow fixture repository if intentionally failing tests would disrupt the main project.

Review the Checks page as a maintainer would see it. A technically correct expression is insufficient if both jobs share confusing names or the nonblocking result looks green without opening details. Job summaries should say “quarantined test failed, merge exception active,” not “success.” The branch-protection list should contain stable job names that are present in both label branches. This human-facing verification catches policy gaps that YAML linting and expression syntax checks cannot.

## Handle pushes, forks, and scheduled runs separately

The \`pull_request\` payload contains labels. A \`push\` event does not have \`github.event.pull_request\`, so copying the same expression into a multi-event workflow can produce surprising false conditions. Keep the label-routed workflow pull-request-specific or calculate an explicit event-aware flag.

On the default branch, run the reliable and quarantine lanes on a schedule without needing a PR label. This preserves trend data after merge. Scheduled quarantine failure can open or update an issue through a separate workflow with narrowly scoped permissions.

Fork pull requests may not receive repository secrets. The quarantine suite should not require privileged secrets merely because it is nonblocking. If a test needs a protected environment, route that concern through an approved, safe workflow rather than weakening secret controls.

## A disciplined exit from quarantine

Fix the suspected race, run the test repeatedly in its representative matrix, and review historical evidence. Then remove both \`@quarantine\` and its manifest entry in one pull request. The label may remain as a repository capability for other approved entries, but it should be removed from the repaired PR if no quarantine applies.

After removal, the test returns to the mandatory selector automatically. Keep the issue link in commit history rather than permanent test comments unless the underlying behavior needs explanation.

Quarantine succeeds when it shortens diagnosis without normalizing red tests. If the manifest grows monotonically, the process is an avoidance mechanism. Set a team-level review cadence and capacity limit, but avoid a crude maximum that encourages deleting useful tests.

## Frequently Asked Questions

### Can a pull-request label safely make flaky failures nonblocking?

Yes, if it only routes tests already tagged in a reviewed, unexpired manifest. The mandatory job must exclude exactly those tests and remain a required check. A label that ignores arbitrary failures is unsafe.

### Why not mark quarantined Playwright tests with test.skip?

Skipped tests produce no failure or recovery evidence. Running them in a nonblocking job preserves reports, traces, pass streaks, and evidence needed to remove the quarantine.

### Should the quarantined job use continue-on-error at step or job level?

Use a dedicated job and apply \`continue-on-error\` there. Mixing reliable and quarantined commands in one forgiving step risks suppressing a new blocking failure and makes branch-protection status unclear.

### How does the workflow react when a label is removed?

Include the \`unlabeled\` pull-request activity type. GitHub starts a new run, the label condition becomes false, and the mandatory job runs the full suite again.

### What prevents an expired quarantine from continuing forever?

A required validation job compares each ISO expiry date with the current UTC date and fails closed. Renewal requires a reviewed manifest change, while removing the tag and entry restores the test to the reliable gate.
`,
};
