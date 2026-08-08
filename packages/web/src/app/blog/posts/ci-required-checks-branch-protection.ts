import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'CI Required Checks and Branch Protection That Block Bad Merges',
  description: 'Configure ci required checks branch protection so merge gates match real jobs, skipped checks cannot fake success, and QA suites stay trustworthy on protected branches.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# CI Required Checks and Branch Protection That Block Bad Merges

CI required checks under branch protection are the named status checks that must report a successful, skipped, or neutral conclusion before collaborators can merge into a protected branch. On GitHub, you enable branch protection on \`main\` (or release branches), turn on required status checks, and select the exact check names produced by your workflows or external CI. Until those names pass (or skip/neutral per platform rules), the merge button stays blocked even if reviewers approved the pull request.

The subtle part is alignment: the string GitHub (or GitLab, or your forge) requires must match the check name that actually runs on the pull request head. Rename a GitHub Actions job without updating branch protection and merges freeze for everyone. Run a critical E2E suite only on \`push\` to feature branches without ever reporting on the PR context and the required check never appears. Allow skipped jobs to count as success, which GitHub documents, and a miswritten path filter can skip your entire QA gate while still satisfying protection.

This guide is for QA and test-automation engineers who own the meaning of green. You will design a required-check matrix, wire Actions jobs that always report when they must, avoid the skipped-job loophole, coordinate with cancel-in-progress and diff-based selection, and diagnose the failure mode where protection looks enabled but untested code still merges. Official GitHub docs on protected branches and status checks are at https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches and https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks. Pair this with [CI cancel stale E2E runs on new commit](/blog/ci-cancel-stale-e2e-runs-on-new-commit) and [CI test selection by git diff](/blog/ci-test-selection-by-git-diff) so gates stay both strict and fast.

## Start from merge risk, not from a long job list

Required checks are a product decision dressed as YAML. List the failure modes that must never reach \`main\`, then map each mode to one durable check name.

| Merge risk | Signal you trust | Candidate required check name | Usually not enough alone |
|---|---|---|---|
| Broken unit logic | Unit test job on PR head | \`unit\` | Lint-only jobs |
| Broken API contract | Contract or schema job | \`contract\` | Generated docs without validation |
| Broken critical UI path | Smoke E2E on PR | \`e2e-smoke\` | Full nightly suite (too slow to require) |
| Secrets or dependency drift | Audit / SCA job | \`security-audit\` | Manual spreadsheet reviews |
| Migration danger | Migration dry-run job | \`db-migrate-dry-run\` | App boot without DB |

Keep the required set small enough that every check is understood and owned. A protected branch with fifteen flaky required jobs trains people to bypass protection with admin overrides. Prefer three to seven stable gates for most product repos (illustrative range, not a standard).

## Understand how GitHub names and stores checks

On GitHub Actions, the check name that appears in the PR Checks tab is typically the **job name** (the map key under \`jobs:\` unless you set a custom \`name:\`). Branch protection matches that displayed name. External systems using the Checks API or commit status API contribute their own context names.

Practical consequences:

1. Renaming \`jobs: e2e:\` to \`jobs: e2e-smoke:\` changes the required check string.
2. Matrix jobs produce multiple checks; requiring the parent name may not match child names the way you expect. Verify the exact strings on a PR.
3. Checks become selectable in the UI after they have been reported on the repository in a recent window. GitHub community guidance often notes that checks need to have run in a context that populates the dropdown; you can also type the exact name when you know it.
4. Required status checks apply to the protected branch rules for PRs targeting that branch.

Document the canonical names in the repo so AI agents and humans stop inventing synonyms like \`E2E\`, \`e2e tests\`, and \`playwright\` for the same gate.

\`\`\`markdown
# docs/merge-gates.md

Required on \`main\` (exact GitHub check names):

- unit
- lint
- e2e-smoke
- contract

Not required (informational):

- e2e-full (nightly)
- lighthouse-lab
\`\`\`

## Build workflows that always produce the required names

A required check that sometimes does not run is a social footgun. People assume protection covers them when the job never started.

Minimal pattern: required jobs trigger on \`pull_request\` for the protected target branches, without path filters that can skip the whole workflow silently, or with an explicit companion job that reports failure when selection would skip a critical gate.

\`\`\`yaml
# .github/workflows/pr-required.yml
name: pr-required

on:
  pull_request:
    branches: [main, release/**]

concurrency:
  group: pr-required-\${{ github.workflow }}-\${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  unit:
    name: unit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npm test -- --coverage=false

  lint:
    name: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npm run lint

  e2e-smoke:
    name: e2e-smoke
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e:smoke
        env:
          BASE_URL: \${{ vars.E2E_BASE_URL }}
\`\`\`

Note the concurrency group uses \`\${{ }}\` expressions so GitHub Actions interpolates them. Cancel-in-progress pairs with required checks carefully: the latest commit should report the required names; abandoned runs should not leave the PR stuck waiting on obsolete SHAs. See the cancel-stale companion article for E2E-specific tactics.

## Confront the skipped check problem explicitly

GitHub documents that a skipped job can report success for mergeability purposes and will not necessarily block a PR even if that check is required. That interacts badly with:

- \`if:\` conditions that skip jobs on draft PRs, fork PRs, or path filters
- workflow-level \`paths:\` filters that prevent the workflow from starting
- matrix entries filtered to empty
- reusable workflows that short-circuit

| Pattern | What happens | Safer alternative |
|---|---|---|
| Workflow \`paths: ['src/**']\` only | Docs-only PR never runs required jobs | Separate docs workflow; keep required gates on all PRs or use a paths-filter job that still posts a named check |
| \`if: github.event.pull_request.draft == false\` on required job | Drafts skip gate; convert to ready with stale perception | Run gates on drafts too, or require re-run on ready |
| Path filter skips E2E when only \`README.md\` changes | Correct optimization if intentional | Document that README merges can skip E2E; do not require E2E for that path set without a reporting stub |
| Dynamic matrix becomes empty | Job skipped | Fail if matrix empty when changes touch product code |

A common hardened pattern is a selector job plus explicit outcomes:

\`\`\`yaml
jobs:
  changes:
    name: changes
    runs-on: ubuntu-latest
    outputs:
      e2e: \${{ steps.filter.outputs.e2e }}
    steps:
      - uses: actions/checkout@v4
      - id: filter
        uses: dorny/paths-filter@v3
        with:
          filters: |
            e2e:
              - 'app/**'
              - 'e2e/**'
              - 'package-lock.json'

  e2e-smoke:
    name: e2e-smoke
    needs: changes
    if: needs.changes.outputs.e2e == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:e2e:smoke

  e2e-smoke-gate:
    name: e2e-smoke
    needs: [changes, e2e-smoke]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Evaluate gate
        run: |
          if [ "\${{ needs.changes.outputs.e2e }}" != "true" ]; then
            echo "E2E not required for this diff; reporting success."
            exit 0
          fi
          if [ "\${{ needs.e2e-smoke.result }}" = "success" ]; then
            exit 0
          fi
          echo "E2E was required and did not succeed: \${{ needs.e2e-smoke.result }}"
          exit 1
\`\`\`

Important nuance: GitHub job names must be unique in the check list. The sketch above reuses \`name: e2e-smoke\` on two jobs for teaching the gate idea; in a real workflow you either use one job that always runs and internally no-ops, or you require the final gate job under a single stable name and never create two jobs with the same check name. Prefer one durable job name:

\`\`\`yaml
jobs:
  e2e-smoke:
    name: e2e-smoke
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - id: filter
        uses: dorny/paths-filter@v3
        with:
          filters: |
            e2e:
              - 'app/**'
              - 'e2e/**'
      - name: Install and run smoke
        if: steps.filter.outputs.e2e == 'true'
        run: |
          npm ci
          npm run test:e2e:smoke
      - name: Record skip reason
        if: steps.filter.outputs.e2e != 'true'
        run: echo "No app/e2e changes; smoke suite not executed."
\`\`\`

Here the check always runs and completes successfully when the suite is intentionally not selected. Reviewers can open the log and see the skip reason. That is different from a skipped job that never executed steps.

If you use diff-based test selection inside the suite, keep the job itself required and let selection shrink the work. The companion article on git-diff selection covers suite-level filtering without dropping the check.

## Configure branch protection with a deliberate checklist

On GitHub (UI path names can shift slightly over time):

1. Repository Settings -> Branches -> Branch protection rules (or rulesets, depending on your plan and UI).
2. Protect \`main\` (and release branches with the same required set or a stricter set).
3. Enable require a pull request before merging if that matches your process.
4. Enable require status checks to pass before merging.
5. Optionally enable require branches to be up to date before merging so checks re-run on the latest base.
6. Select exact check names: \`unit\`, \`lint\`, \`e2e-smoke\`, \`contract\`.
7. Restrict who can dismiss reviews or bypass protections; limit admin bypass in organizations that need auditability.
8. Save and open a test PR to verify the merge box lists the same names.

Rulesets in organizations can express similar constraints with different UI. The principle is unchanged: named checks, matching workflow output, limited bypass.

Example of documenting expected ruleset fields for platform engineers (illustrative):

\`\`\`json
{
  "name": "main-qa-gates",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main"]
    }
  },
  "rules": [
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "unit" },
          { "context": "lint" },
          { "context": "e2e-smoke" },
          { "context": "contract" }
        ]
      }
    }
  ]
}
\`\`\`

Do not treat this JSON as a drop-in for every GitHub plan without verifying the current ruleset schema for your account. Use it as a negotiation artifact with platform teams.

## Failure mode: protection enabled, untested code still merges

**Symptom:** Stakeholders believe \`main\` is gated. A production incident traces to a merged PR whose E2E never ran.

**Diagnosis sequence:**

1. Open the merged PR and read the Checks tab. Was \`e2e-smoke\` present? Green? Skipped? Missing?
2. Open branch protection / ruleset and list required contexts. Compare strings character for character with the Checks tab.
3. Inspect workflow triggers: did \`pull_request\` fire, or only \`push\` after merge?
4. Inspect \`if:\` and path filters for silent skips.
5. Check whether an admin bypassed protection or used a merge queue exception.
6. Check whether required checks ran on an old SHA while "require up to date" was off, allowing a broken base combination.

| Finding | Likely root cause | Fix |
|---|---|---|
| Required name \`E2E\` but job named \`e2e-smoke\` | Name drift | Align names; update protection |
| No E2E check on PR | Workflow not on \`pull_request\` | Add PR trigger |
| E2E skipped, merge allowed | Skipped required job counts as success | Always-run job or non-skip gate |
| Checks green on outdated SHA | Strict up-to-date not required | Enable strict checks if process allows |
| Admin merge without checks | Bypass permissions | Tighten bypass; audit log |

A useful forensic command for GitHub when \`gh\` is authenticated:

\`\`\`bash
# Inspect checks on a PR head SHA (requires GitHub CLI auth)
gh pr checks 1842 --repo acme/widget-app

# Show branch protection summary when available
gh api repos/acme/widget-app/branches/main/protection \\
  --jq '.required_status_checks.contexts'
\`\`\`

If the API returns contexts that do not appear on recent PRs, you found drift.

## Coordinate required checks with cancel-in-progress and selection

Fast feedback and strict gates pull in opposite directions. Resolve the tension with layers:

| Layer | Role | Required? |
|---|---|---|
| Lint + unit on every PR | Cheap correctness | Yes |
| Smoke E2E on every product code PR | Critical path | Yes |
| Full E2E nightly or on label | Breadth | No |
| Cancel in-progress on new push | Avoid queue pile-up | N/A (workflow hygiene) |
| Diff-based test selection | Shrink suite duration | Inside required job |

Cancel-in-progress must not leave the latest commit without a final status. The concurrency group should key on PR number so only superseding runs for the same PR cancel each other. Diff selection must fail closed on script errors: if the selection tool crashes, run the full smoke set or fail the job, rather than selecting zero tests and exiting zero.

Illustrative selection guard in a required job:

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

mapfile -t TESTS < <(npx tsx scripts/select-e2e-by-diff.ts)
if [ "\${#TESTS[@]}" -eq 0 ]; then
  echo "Selector returned no tests; running full smoke suite as fail-closed default."
  npx playwright test --project=smoke
  exit 0
fi

npx playwright test "\${TESTS[@]}"
\`\`\`

## Multi-repo and monorepo naming discipline

Monorepos multiply check names: \`unit (web)\`, \`unit (api)\`, matrix suffixes, and reusable workflow display names. Pick a naming scheme and freeze it.

Recommended pattern:

\`\`\`text
unit-web
unit-api
e2e-smoke-web
contract-api
lint-root
\`\`\`

Avoid spaces if your tooling scrapes names. Avoid timestamps or branch names inside check names. Avoid reusing the same display name across workflows that can race.

For path-based monorepo PRs, either:

- require only the gates for touched packages, using always-reporting aggregator checks, or
- require a fixed global smoke that always runs.

The second is simpler for branch protection. The first is faster but needs careful aggregators so skip loopholes do not return.

## What people get wrong: requiring everything or requiring nothing durable

Two extremes:

1. **Require the nightly suite on every PR.** Cycle time explodes, flakes dominate, engineers beg for bypass. Eventually someone disables protection "temporarily" and forgets.
2. **Require only lint.** Marketing screenshots of a green shield while production paths are untested on the PR.

The middle path is durable smoke plus unit/contract, with broader suites informational or scheduled. Measure median PR check time (illustrative target many teams aim for is under 15-20 minutes for required set; use your own SLO). If smoke cannot fit, invest in parallel shards and selection before adding bypass culture.

Another frequent mistake: using commit status contexts from deprecated integrations while the PR UI shows Actions checks with different names. Protection may reference a dead context that always appears neutral/success from a stale app. Audit contexts quarterly.

## Give AI coding agents a machine-readable gate contract

Agents that edit workflows often rename jobs for "clarity" and break protection. Put a contract file in the repo:

\`\`\`yaml
# .github/merge-gates.yaml
# Humans and agents: do not rename these job name fields without updating branch protection.
version: 1
protected_branches:
  - main
required_checks:
  - unit
  - lint
  - e2e-smoke
  - contract
rules:
  - do_not_skip_required_jobs_with_if_true_false_without_gate_job
  - pull_request_trigger_required
  - cancel_in_progress_allowed
\`\`\`

And a CI assertion that the workflow file still contains those job names:

\`\`\`ts
// scripts/assert-merge-gate-names.ts
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const gates = parse(readFileSync('.github/merge-gates.yaml', 'utf8')) as {
  required_checks: string[];
};
const wf = readFileSync('.github/workflows/pr-required.yml', 'utf8');

for (const name of gates.required_checks) {
  const pattern = new RegExp(\`name:\\\\s*\${name}\\\\b\`);
  if (!pattern.test(wf)) {
    console.error(\`Missing workflow job name: \${name}\`);
    process.exit(1);
  }
}
console.log('Merge gate names present in pr-required workflow.');
\`\`\`

This does not call the GitHub API to verify protection settings (that needs tokens and org permissions), but it catches the common agent rename footgun.

Ready-made QA skills install from qaskills.sh with the qaskills CLI when you want agents to learn gate hygiene as a reusable skill rather than a one-off markdown rule.

## Release branches and progressive strictness

\`main\` and \`release/*\` may share required checks, while \`release/*\` adds migration and performance gates.

| Branch | Required checks | Extra policy |
|---|---|---|
| \`main\` | unit, lint, e2e-smoke, contract | PR required, limited bypass |
| \`release/*\` | main set + \`db-migrate-dry-run\` + \`e2e-critical-path\` | No force push, linear history if used |
| feature branches | none at forge level | CI still runs for feedback |

Do not invent branch protection on every feature branch unless you need that control. Protection is for integration lines.

## Local simulation before you tighten production rules

When changing gates, use a dry-run PR in a fork or a temporary rule on a non-critical branch:

1. Create branch \`practice/protection-test\`.
2. Add a workflow that posts intentionally failing check \`gate-probe\`.
3. Protect the practice branch requiring \`gate-probe\`.
4. Confirm merge is blocked.
5. Fix the job; confirm merge is allowed.
6. Remove practice protection; apply the same pattern to \`main\` during a low-traffic window.
7. Announce the new required names in engineering chat with the docs link.

## QA ownership of the green definition

Platform teams often own the forge settings while QA owns suite meaning. Split responsibilities:

| Owner | Accountable for |
|---|---|
| Platform | Branch rulesets, bypass policy, token permissions |
| QA / test automation | Which suites are smoke vs full, flake budgets, selection correctness |
| App teams | Keeping package boundaries so selection and ownership work |
| Security | Audit jobs and secret scanning as required when policy demands |

Meet quarterly to re-read the required list. Remove checks that no longer map to a risk. Add checks only with an owner and a flake SLO.

## End-to-end narrative: adding contract tests as a required gate

Suppose API contract tests exist but are optional. Incidents show undetected response shape breaks.

Steps:

1. Ensure the workflow job is named \`contract\` and runs on every PR that touches \`services/api/**\` or always runs if cheap.
2. Merge a PR that only adds the job; do not require it yet. Verify the check appears on PRs.
3. Update \`.github/merge-gates.yaml\` and docs.
4. Add \`contract\` to branch protection during a team meeting, not as a silent settings change.
5. Watch for path-filter skips and name mismatches for one week.
6. Only then announce that contract is merge-blocking.

Rollback plan: remove the context from protection first if the suite is unstable, keep the job informational, fix flakes, re-add. Never leave protection pointing at a permanently failing or permanently skipped name.

## Observability for merge gates

Export or screenshot weekly:

- median and p95 duration of each required check
- flake rate (fail then pass on rerun) per required check
- count of admin bypasses
- count of PRs merged with skipped required-named jobs

If bypasses rise, the required set is wrong or too flaky. If durations rise, invest in shards, cancel-stale, and diff selection before engineers invent shadow processes.

## Frequently Asked Questions

### Why is my required check missing from the branch protection dropdown?

GitHub only lists checks it has seen in the repository's recent check history for selectable contexts, and community reports often note that checks must have reported in an appropriate branch context before they appear. Run the workflow on a pull request against the protected branch (or otherwise produce the check name), wait for completion, refresh the protection settings, and select the exact name. You can also type the known name when the UI allows. If the job only runs on \`workflow_dispatch\` or only on a rarely used branch, the dropdown may stay empty until it reports more visibly.

### Can a skipped GitHub Actions job satisfy a required status check?

Yes, GitHub documents that skipped jobs can report a success-style outcome for mergeability and may not block merging even when that check is required. That is why path filters and \`if:\` conditions on required jobs are dangerous without an always-run gate that records an intentional decision. Prefer a job that always starts and either runs tests or logs a deliberate no-op success when the diff does not need the suite. Verify behavior with a test PR that would skip under your filters and confirm the merge box matches your intent.

### Should full E2E suites be required checks on every pull request?

Usually no. Full suites are often too slow and too flake-prone to be the only merge definition of green. Require a short smoke E2E (and unit/contract gates), keep full E2E as non-required on PRs or as scheduled pipelines, and invest in selection and sharding so smoke stays representative. If a path is truly critical and not covered by smoke, expand smoke rather than forcing a two-hour required suite that trains people to bypass protection.

### How do cancel-in-progress runs interact with branch protection?

Cancel-in-progress aborts superseded workflow runs so the latest commit is what matters. Branch protection evaluates checks on the head commit that you merge. Configure concurrency groups per PR so only outdated runs cancel, ensure the latest run still publishes the required check names, and avoid leaving the head SHA without a terminal status. Pair cancellation with stable job names and, when needed, require up-to-date branches so merges cannot rely on green checks from an older base combination.
`,
};
