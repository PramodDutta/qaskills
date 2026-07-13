import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Comment a Test Summary on Pull Requests with GitHub Actions',
  description:
    'Comment a clear test summary on every pull request with GitHub Actions, update one sticky comment, handle failures, and keep forked contributions safe.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Comment a Test Summary on Pull Requests with GitHub Actions

A red check tells a reviewer that something failed. It does not tell them whether 1 test failed or 400, which package broke, whether the failure is new, or where to find the report. A pull request comment can close that information gap, but only if it is concise, updated rather than duplicated, posted even when tests fail, and implemented without handing write credentials to untrusted code.

This tutorial builds that workflow in two stages. First, you will create a straightforward same-repository workflow that runs Vitest, generates a Markdown summary, and maintains one sticky pull request comment. Then you will harden the design for forked pull requests by separating untrusted test execution from privileged commenting. The result is review feedback that is useful without becoming comment spam or a token-security problem.

For the broader pipeline structure around caching, matrices, and quality gates, read the [GitHub Actions testing CI/CD guide](/blog/github-actions-testing-ci-cd-guide). If your summary also reports line coverage, the [Codecov vs Coveralls coverage gates comparison](/blog/codecov-vs-coveralls-coverage-gates-2026) explains where coverage enforcement belongs.

## Decide What the Comment Must Communicate

The best comment is not a pasted test log. It is a review interface. Put the decision-level result first, keep counts in a compact table, show only a few failed tests, and link reviewers to the workflow run for full evidence. Logs can contain terminal control characters, machine paths, environment details, and thousands of lines that do not belong in a pull request discussion.

| Information | Include in comment | Keep in workflow artifact or logs |
|---|---:|---:|
| Overall pass or fail | Yes | Yes |
| Passed, failed, skipped counts | Yes | Yes |
| Duration and test files | Yes | Yes |
| First five failure names | Yes | Yes |
| Full stack traces | No | Yes |
| Raw stdout and stderr | No | Yes |
| Coverage totals | Optional | Yes |
| Secrets or environment dump | Never | Never |

Use a stable hidden marker in the comment body, such as \`<!-- test-summary -->\`. The workflow searches comments for that marker. If it finds one created by the automation identity, it updates that comment; otherwise it creates one. A visible heading alone is not a reliable identifier because humans may use the same words.

## Generate Markdown from Structured Test Results

Do not parse a colored console transcript. Configure the test runner to emit JSON, JUnit XML, or another structured format. The example below uses Vitest JSON and a small Node script. The same architecture works with Jest JSON, Playwright JSON, pytest JUnit XML, or Maven Surefire reports.

Create \`scripts/test-summary.mjs\` with the following runnable program. It reads \`test-results.json\`, calculates counts, escapes Markdown table cells, limits failure details, and writes \`test-summary.md\`.

\`\`\`javascript
import { readFile, writeFile } from 'node:fs/promises';

const inputPath = process.argv[2] ?? 'test-results.json';
const outputPath = process.argv[3] ?? 'test-summary.md';
const report = JSON.parse(await readFile(inputPath, 'utf8'));

const files = report.testResults ?? [];
const tests = files.flatMap((file) => file.assertionResults ?? []);
const count = (status) => tests.filter((item) => item.status === status).length;
const passed = count('passed');
const failed = count('failed');
const skipped = count('pending') + count('skipped') + count('todo');
const durationMs = files.reduce(
  (sum, file) => sum + Math.max(0, (file.endTime ?? 0) - (file.startTime ?? 0)),
  0,
);
const escapeCell = (value) =>
  String(value).replaceAll('|', '\\|').replaceAll('\n', ' ').replaceAll('\r', ' ');

const failures = tests
  .filter((item) => item.status === 'failed')
  .slice(0, 5)
  .map((item) => \`- \${escapeCell([...item.ancestorTitles, item.title].join(' > '))}\`);

const icon = failed === 0 ? '✅' : '❌';
const lines = [
  '<!-- test-summary -->',
  \`## \${icon} Test summary\`,
  '',
  '| Test files | Passed | Failed | Skipped | Duration |',
  '|---:|---:|---:|---:|---:|',
  \`| \${files.length} | \${passed} | \${failed} | \${skipped} | \${(durationMs / 1000).toFixed(1)}s |\`,
];

if (failures.length > 0) {
  lines.push('', '### First failures', '', ...failures);
  if (failed > failures.length) {
    lines.push('', \`\${failed - failures.length} more failures are available in the run logs.\`);
  }
}

lines.push('', '_Updated by GitHub Actions for the latest commit._');
await writeFile(outputPath, \`\${lines.join('\n')}\n\`, 'utf8');
\`\`\`

Check the exact JSON shape produced by your runner version. Test the summarizer with committed sanitized fixtures representing pass, failure, skipped-only, and empty reports. The summarizer is production logic for your delivery pipeline, so it deserves deterministic tests.

One detail in the script is easy to miss: it treats absent arrays as empty. A test process can crash before writing complete results. Your workflow should still create an honest comment such as “test report unavailable” rather than throwing another opaque error in the reporting step.

## The Simple Workflow for Same-Repository Pull Requests

The following workflow is suitable when pull requests are created from branches in the same trusted repository. It grants only the permissions it needs, runs tests, creates the summary even after failure, posts or updates one comment, writes the same Markdown to the workflow job summary, and finally preserves the test exit code.

Save it as \`.github/workflows/pr-tests.yml\`. The workflow assumes \`npm run test:json\` writes \`test-results.json\`. Adapt that command to your repository, but keep the control-flow ordering.

\`\`\`yaml
name: Pull request tests

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

concurrency:
  group: pr-tests-\${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Run tests
        id: tests
        continue-on-error: true
        run: npm run test:json

      - name: Build test summary
        if: always()
        run: |
          if [ -f test-results.json ]; then
            node scripts/test-summary.mjs test-results.json test-summary.md
          else
            printf '%s\n' '<!-- test-summary -->' '## ❌ Test summary' '' 'The test process did not produce a report. Open the workflow run for details.' > test-summary.md
          fi

      - name: Add workflow job summary
        if: always()
        run: cat test-summary.md >> "\$GITHUB_STEP_SUMMARY"

      - name: Create or update pull request comment
        if: always()
        uses: actions/github-script@v8
        env:
          SUMMARY_PATH: test-summary.md
        with:
          script: |
            const fs = require('node:fs');
            const marker = '<!-- test-summary -->';
            const body = fs.readFileSync(process.env.SUMMARY_PATH, 'utf8');
            const { owner, repo } = context.repo;
            const issue_number = context.issue.number;
            const comments = await github.paginate(
              github.rest.issues.listComments,
              { owner, repo, issue_number, per_page: 100 },
            );
            const previous = comments.find(
              (comment) =>
                comment.user?.type === 'Bot' && comment.body?.includes(marker),
            );
            if (previous) {
              await github.rest.issues.updateComment({
                owner,
                repo,
                comment_id: previous.id,
                body,
              });
            } else {
              await github.rest.issues.createComment({
                owner,
                repo,
                issue_number,
                body,
              });
            }

      - name: Preserve test failure
        if: steps.tests.outcome == 'failure'
        run: exit 1
\`\`\`

The \`continue-on-error\` setting applies only to the test step. It allows reporting steps to run, but the last step restores the failing job result. Without that final step, broken tests would produce a polished comment and a green required check.

The \`if: always()\` expressions make reporting run after a test failure or cancellation where the runner still executes later steps. The workflow job summary is separate from the pull request comment. Writing to \`GITHUB_STEP_SUMMARY\` gives maintainers useful output even if comment permissions are unavailable.

## Understand the Permission Boundary

The simple workflow checks out and executes pull request code in a job whose token requests \`pull-requests: write\`. For a same-repository branch controlled by trusted contributors, that may fit the threat model. For a public fork, GitHub normally downgrades the token to read-only and withholds secrets, so the comment step fails. Trying to “fix” that by running untrusted code under \`pull_request_target\` with a write token is unsafe.

The security rule is simple: never check out or execute fork-controlled code in a privileged \`pull_request_target\` or \`workflow_run\` job. A malicious pull request can modify package scripts, test configuration, or dependencies and steal any credential available to the process.

| Event design | Runs fork code | Can safely hold write token | Suitable purpose |
|---|---:|---:|---|
| \`pull_request\` test job | Yes | No for untrusted forks | Build and test proposed code |
| \`pull_request_target\` with PR checkout | Yes | No | Avoid this combination |
| \`pull_request_target\` without PR execution | No | Yes, with care | Labeling or policy checks |
| \`workflow_run\` reporter | No, if it only reads validated artifact data | Yes, with care | Comment after unprivileged CI |
| Same-repo \`pull_request\` | Trusted by policy | Often | Simple combined workflow |

Dependabot pull requests receive fork-like restrictions. Test that path rather than assuming bot-authored changes behave like same-repository branches.

## Harden for Forks with Two Workflows

For external contributions, split responsibilities. Workflow A runs on \`pull_request\` with read-only permissions. It executes tests, writes a small summary artifact, and includes the pull request number and tested commit SHA. Workflow B runs from the default branch on \`workflow_run: completed\`, downloads the artifact from the triggering run, validates it, verifies the pull request still points to that commit, and posts the comment with write permission.

The untrusted job must not choose arbitrary repository coordinates, comment IDs, paths, or executable content for the privileged job. Treat every artifact byte as hostile input. Limit file size, parse strict JSON, validate types and ranges, and render text rather than evaluating code.

Workflow A can upload a compact envelope like this:

\`\`\`json
{
  "schemaVersion": 1,
  "pullRequest": 184,
  "headSha": "0123456789abcdef0123456789abcdef01234567",
  "passed": 318,
  "failed": 2,
  "skipped": 4,
  "durationSeconds": 47.2,
  "failures": [
    "checkout > rejects an expired coupon",
    "tax > rounds CHF cash totals"
  ]
}
\`\`\`

Upload that file with \`actions/upload-artifact@v4\`. In the reporter, use \`actions/github-script@v8\` or the API client to list artifacts for \`github.event.workflow_run.id\`, select the exact expected artifact name, download its ZIP, and parse only the expected file. Do not accept an artifact URL supplied inside the artifact.

Before commenting, query the pull request and compare its current head SHA with \`headSha\`. If they differ, the result belongs to an older synchronize event. Skip the comment so a slow previous run cannot overwrite fresh feedback. Concurrency in Workflow A reduces this race but does not remove it, especially when jobs are already finishing.

## Make the Sticky Comment Race-Safe

Two runs can search before either creates the marker comment, leading to duplicates. Concurrency keyed by pull request number prevents most overlap within one workflow. The SHA check prevents stale updates. There is still a small creation race if independent workflows post the same marker.

Keep one workflow responsible for the marker. Search only comments authored by the expected automation identity, because a contributor can place the marker in their own comment. If your repository uses multiple bots through the same \`github-actions[bot]\` identity, add a workflow-specific marker such as \`<!-- test-summary:unit-v1 -->\`.

Pagination matters. The REST endpoint may return only the first page by default, and active pull requests can exceed it. \`github.paginate\` in the example searches all pages. Updating by a cached comment ID is faster, but the ID needs reliable storage keyed to the pull request. Searching is usually simpler and robust enough.

## Report Matrix Jobs as One Result

A matrix can test Node versions, operating systems, packages, or shards. Do not let every matrix cell post its own comment. That creates noisy partial results and races.

Each test job should upload a uniquely named result artifact, such as \`results-node22-ubuntu-shard2\`. A final aggregation job uses \`if: always()\`, depends on every matrix job, downloads all artifacts, validates their schemas, deduplicates test identities if appropriate, and creates one Markdown body.

| Aggregation question | Recommended rule | Common mistake |
|---|---|---|
| Missing artifact | Mark cell incomplete or failed | Treat as zero tests |
| Retried test | Report flaky separately | Count final pass only |
| Same test on two runtimes | Keep per-environment status | Deduplicate and hide compatibility failure |
| Cancelled stale run | Do not comment | Overwrite current result |
| Shard duration | Use wall time plus optional sum | Add times and call it elapsed time |

Give every artifact a schema version. When the report generator changes, the aggregator can reject an unsupported shape with a useful message instead of silently producing wrong counts.

## Handle Failure Modes Deliberately

A good workflow produces truthful output when setup fails, tests crash, JSON is malformed, the comment API returns 403, or the pull request closes while CI is running. Separate the test result from the reporting result.

If dependency installation fails, there is no test report. Create an infrastructure-failure summary and keep the job red. If the comment API lacks permission, write the job summary and log a concise permission diagnosis. Decide whether comment failure should fail a required check. Most teams keep the test check authoritative and make notification failure visible but non-blocking through a separate step outcome.

Sanitize failure names before rendering. Markdown control characters can damage tables, and HTML-like input can create confusing output even though GitHub sanitizes rendered content. Limit each string length, replace line breaks, escape pipes, reject control characters, and cap the total body. Never include environment variables or raw tool output.

## Test the Workflow, Not Just the Tests

Use fixture reports to unit-test the summary generator. Cover zero tests, all pass, mixed outcomes, malformed JSON, missing fields, very long names, pipe characters, Unicode, and more failures than the display cap. Snapshot the resulting Markdown after reviewing it for stable content.

Then exercise repository-level cases on a temporary pull request:

1. A passing commit creates one green summary.
2. A failing commit updates the same comment and leaves the check red.
3. A later passing commit changes the comment back to green.
4. Two quick pushes leave only the newest SHA represented.
5. A forked pull request runs tests without exposing write credentials.
6. A missing artifact produces an explicit reporting error.
7. A pull request with more than 100 comments still updates the marker.

Pin third-party actions to full commit SHAs in high-assurance repositories. Official version tags make examples readable, but tags are mutable references. Use dependency automation to update pinned SHAs after review.

## Keep the Comment Useful Over Time

Reviewers stop reading noisy automation. Track whether the comment answers a merge decision quickly. Put regressions above historical information, collapse optional package details, and link to the run rather than embedding stacks. Remove metrics that nobody uses.

Do not post on every action type. \`opened\`, \`synchronize\`, and \`reopened\` usually cover test reruns tied to code. A manually rerun workflow may update the same comment if it still matches the head SHA. Closing a pull request does not require a final test comment.

Finally, give the workflow a stable name if branch protection refers to its check. Renaming jobs can alter required-check contexts. Treat workflow names, artifact schemas, comment markers, and report fields as interfaces with consumers.

## Operate the Reporter as Delivery Infrastructure

Assign an owner for the workflow and define what happens when GitHub is unavailable. Tests may finish successfully while artifact upload or comment delivery fails. The test result should remain stored in the workflow run, and a rerun of only the reporting path should be able to reconstruct the comment without rerunning an expensive suite. Retain the structured report long enough to cover normal review cycles, but do not keep sensitive failure payloads indefinitely.

Observe the reporter with a few direct metrics: comments created, comments updated, permission failures, missing artifacts, stale SHA skips, schema rejections, and API rate-limit responses. A sudden drop in updates can mean the workflow token policy changed even though test jobs remain green. Log the pull request number, workflow run ID, head SHA, artifact ID, and comment ID. Do not log the token or raw report body.

Rate limits matter in large repositories. Updating one comment per completed head is inexpensive compared with posting from every shard, yet a burst of synchronized matrix runs can still compete with other automation. Aggregate first, cancel stale runs, and avoid polling the comments endpoint repeatedly. If API calls are retried, use bounded backoff and distinguish retryable server failures from permission errors that will not improve.

Repository rules evolve. Review the permissions block when organization defaults change, when the repository becomes public, or when external contributions are enabled. A workflow that was safe for trusted internal branches may become an untrusted-code boundary overnight. Add a lightweight policy test that parses workflow files and rejects privileged jobs which check out a pull request head.

Accessibility and readability deserve review too. Do not communicate pass or fail through color or emoji alone. Keep explicit text labels, table headings, and stable ordering. Test the rendered comment in narrow and mobile views. Failure names should remain understandable when truncated, so preserve the suite and case portions rather than cutting from only one end.

Plan schema evolution before adding fields. A versioned envelope lets the trusted reporter support the current and previous producer during a gradual rollout. Reject unknown major versions, tolerate explicitly optional fields, and cap every array and string before rendering. This prevents a malformed or hostile artifact from creating an oversized comment or exhausting memory in the privileged job.

Finally, rehearse recovery. Delete the marker comment, rerun the reporter, and verify that it creates exactly one replacement. Close the pull request while a report is pending and ensure the reporter exits cleanly. Rotate repository settings so write permission is absent and confirm the workflow produces a precise job summary. Operational tests turn a convenient script into dependable review infrastructure.

## Frequently Asked Questions

### Why does the comment step receive a 403 on a forked pull request?

Fork-triggered \`pull_request\` workflows normally receive a read-only token, even if YAML requests write permission. Use a two-workflow design where the test job uploads data and a trusted default-branch reporter comments without executing pull request code.

### Why use \`continue-on-error\` for tests?

It allows summary and comment steps to run after test failure. A later step must exit nonzero when the test outcome was failure, or the workflow will incorrectly report a successful check.

### Can I use \`pull_request_target\` to get comment permission?

Only if the privileged job never checks out or executes untrusted pull request code. For test execution, keep \`pull_request\` read-only and move commenting to a carefully validated reporter.

### How do I prevent a new comment on every push?

Place a unique hidden marker in the body, paginate through comments, find the marker on a comment authored by the automation bot, and update its comment ID. Add pull-request concurrency to reduce races.

### Should a reporting failure block merging?

The test result should always remain authoritative. Many teams keep comment delivery non-blocking while surfacing it in the job summary or a separate check. In regulated workflows where the review artifact is mandatory, make reporting its own required check with clear failure diagnostics.
`,
};
