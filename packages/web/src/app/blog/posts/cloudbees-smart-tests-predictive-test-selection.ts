import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'CloudBees Smart Tests (Formerly Launchable): Predictive Test Selection Guide',
  description: 'predictive test selection guide for CloudBees Smart Tests: configure sessions, subsets, CI fallbacks, and failure triage without losing coverage.',
  date: '2026-09-28',
  category: 'Guide',
  content: `
# CloudBees Smart Tests (Formerly Launchable): Predictive Test Selection Guide

CloudBees Smart Tests is the current CloudBees product for what many teams still remember as Launchable: a predictive test selection system that learns from historical builds, code changes, and test outcomes, then returns the subset of tests most relevant to the current build. If your query is simply "how do I add predictive test selection to CI?", the answer is: record the build, create a test session, ask Smart Tests for a subset using your test runner, execute that subset, and always record the results back so the model keeps learning.

The rename matters because current CloudBees documentation uses the \`smart-tests\` command, while older links and some repository text still point at Launchable-era docs. I verified the current docs on September 28, 2026: the product is CloudBees Smart Tests, the CLI command shown by the CloudBees docs is \`smart-tests\`, Python 3.13 or newer is listed unless using \`uv\`, Java 8 or newer is required, and the required workflow now includes \`smart-tests record session\` before \`smart-tests subset\` or \`smart-tests record tests\`. The public CLI repository is \`cloudbees-oss/smart-tests-cli\`, and release notes show active maintenance, including v2.15.0 on September 8, 2026.

There is one packaging detail to treat carefully. CloudBees docs currently show \`uv tool install smart-tests-cli~=2.0\` in getting started, while the CLI reference and older repository text have shown \`smart-tests\` package examples. Because the official sources have not always been consistent, do not copy a stale install line into a shared CI template. Check the install command displayed in your CloudBees Smart Tests workspace and confirm the package your runner can install. The workflow and command surface below focus on the verified \`smart-tests\` executable and documented command sequence. If you are also designing a broader CI selection strategy, pair this with the [Test Impact Analysis CI Guide 2026](/blog/test-impact-analysis-ci-guide-2026) and the [CI Flaky Test Auto Quarantine Workflow](/blog/ci-flaky-test-auto-quarantine-workflow).

## Current Product And CLI Reality

The first implementation decision is not a YAML file. It is vocabulary. Use CloudBees Smart Tests in new docs, dashboards, and agent instructions. Use Launchable only as historical context or when migrating old scripts. This avoids the most common agent mistake: searching your repository for \`launchable\`, finding a half-working old command, and extending it instead of moving to the current \`smart-tests\` flow.

| Area | Current verified state | Implementation consequence |
| --- | --- | --- |
| Product name | CloudBees Smart Tests | Use this name in runbooks and PR comments |
| Historical name | Launchable | Expect old links and variables in legacy scripts |
| CLI executable | \`smart-tests\` | Standardize wrapper scripts around this command |
| Required order | \`record build\`, \`record session\`, \`subset\`, test execution, \`record tests\` | A missing session can make subset and upload behavior wrong |
| Runtime requirements | Python 3.13 or newer unless using \`uv\`, Java 8 or newer | CI images need both runtimes or a validated \`uv\` install path |
| Failure posture | CLI is designed to tolerate service issues and no-op in recoverable conditions | Add explicit verification and artifact checks so silent fallback is visible |

\`\`\`bash
smart-tests verify || true
smart-tests record build --build ci-123 --branch main
smart-tests record session --test-suite unit --build ci-123 > session.txt
find tests -name 'test_*.py' | sort > all-tests.txt
smart-tests subset file --confidence 90% --session @session.txt < all-tests.txt > subset.txt
pytest --junitxml=test-results/junit.xml \${TEST_ARGS}
smart-tests record tests file --session @session.txt test-results/junit.xml
\`\`\`

That command block is deliberately generic. In a real repo, \${TEST_ARGS} should be replaced by the runner-specific argument form that reads \`subset.txt\`. The important part is the data loop. Smart Tests cannot become useful if you only ask it for a subset and then skip the result upload when a failure happens.

## The Data Loop Predictive Selection Needs

Predictive test selection is not magic search over filenames. CloudBees Smart Tests needs build metadata, Git history, a test list, the test runner type, and results from previous sessions. The subset request includes the build or session being tested, an optimization target such as confidence, target percentage, or time, and the full input list of tests that would normally be candidates. The CLI then returns items at the "altitude" the test runner can execute.

Altitude is where many teams accidentally lose precision. Pytest can run individual test cases. Maven commonly runs at class level. Jest and Cypress are file-level for subset output. That means the same code change might produce a short list of test cases in one stack and a larger list of files in another. Your dashboard might say "predictive selection selected 12 items", but those items are not comparable unless you know the runner altitude.

| Runner family | Documented subset altitude | Practical effect |
| --- | --- | --- |
| \`pytest\` | Test case | Fine-grained selection can target individual tests |
| \`Jest\` | File | A selected file runs every test in that file |
| \`Cypress\` | File | Spec-file organization strongly affects subset size |
| \`Maven\` | Class | Large test classes reduce selection precision |
| \`Gradle\` | Class | Split oversized classes before judging model quality |
| \`Bazel\` | Target | Target boundaries become the selection unit |
| \`Go Test\` | Test case | Naming consistency affects history matching |
| \`Robot\` | Test case | Suites still need stable identifiers |

\`\`\`typescript
type TestItem = {
  id: string;
  path: string;
  runner: 'pytest' | 'jest' | 'cypress' | 'maven';
};

export function requireStableTestIds(items: TestItem[]): void {
  for (const item of items) {
    if (item.id.trim().length === 0) {
      throw new Error('Every test item needs a stable id');
    }

    if (!item.path.startsWith('tests/') && !item.path.startsWith('src/')) {
      throw new Error('Unexpected test path: ' + item.path);
    }
  }
}
\`\`\`

That small guard is not part of Smart Tests. It is a pattern worth using before you feed a generated list into any predictive selection tool. AI coding agents often create tests with descriptive names, but they can also rename files, move cases, or duplicate titles during a refactor. Stable identifiers make the model's history useful.

## A GitHub Actions Pipeline That Records Every Outcome

For GitHub Actions, the safest pattern is one job that records the build, creates a session, asks for a subset, runs tests, then uploads results in an \`if: always()\` step. The sample below uses the current GitHub Actions majors and keeps \`NODE_OPTIONS\`, secrets, and session files scoped to the test job.

\`\`\`yaml
name: smart-tests-unit

on:
  pull_request:
  push:
    branches: [main]

jobs:
  unit:
    runs-on: ubuntu-latest
    env:
      SMART_TESTS_TOKEN: \${{ secrets.SMART_TESTS_TOKEN }}
      BUILD_NAME: \${{ github.run_id }}-\${{ github.run_attempt }}
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0

      - uses: actions/setup-python@v7
        with:
          python-version: '3.13'

      - uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: '21'

      - name: Install Smart Tests CLI
        run: |
          python -m pip install --upgrade pip
          python -m pip install --upgrade smart-tests-cli

      - name: Verify Smart Tests connectivity
        run: smart-tests verify || true

      - name: Record build and session
        run: |
          smart-tests record build --build "\${BUILD_NAME}" --branch "\${{ github.ref_name }}"
          smart-tests record session --test-suite unit --build "\${BUILD_NAME}" > session.txt

      - name: Build candidate test list
        run: find tests -name 'test_*.py' | sort > all-tests.txt

      - name: Select predictive subset
        run: smart-tests subset file --confidence 90% --session @session.txt < all-tests.txt > subset.txt

      - name: Run selected tests
        run: |
          mkdir -p test-results
          pytest \$(cat subset.txt) --junitxml=test-results/junit.xml

      - name: Record test results
        if: always()
        run: smart-tests record tests file --session @session.txt test-results/junit.xml
\`\`\`

Two details are easy to miss. First, \`fetch-depth: 0\` gives the tool enough Git context for change analysis. Second, the result recording step uses \`if: always()\`. If the selected tests fail and you skip upload, Smart Tests sees no outcome for the exact build that mattered most. That starves the model and hides failures from the Smart Tests dashboard.

## Choosing Confidence, Time, Or Target

CloudBees supports multiple optimization targets. The docs identify \`--confidence\`, \`--time\`, and \`--target\` as high-level options. Confidence asks for enough tests to reach a specified confidence level. Target asks for a percentage-like portion. Time asks for a duration budget. The right choice depends on where in the pipeline the job runs.

| Pipeline stage | Recommended target style | Why it fits |
| --- | --- | --- |
| Pull request unit tests | \`--confidence\` | Keeps a quality-oriented signal while reducing obvious waste |
| Fast pre-merge smoke | \`--time\` | Enforces a wall-clock budget for developer feedback |
| Nightly validation | Full run, then record results | Refreshes model history and catches low-probability misses |
| Flaky suite triage | \`--confidence\` plus flaky ignore threshold if approved | Keeps selection behavior explicit during cleanup |
| Agent-generated experiment branch | Observation mode first | Lets the team compare selected versus actual without betting the merge on it |

\`\`\`bash
smart-tests subset file --confidence 90% --session @session.txt < all-tests.txt > subset.txt
smart-tests subset file --target 40% --session @session.txt < all-tests.txt > subset-target.txt
smart-tests subset file --time 10m --session @session.txt < all-tests.txt > subset-time.txt
\`\`\`

Avoid asking an agent to "make CI faster" and leaving the target unspecified. It may choose an aggressive percentage because the resulting job looks impressive in a single run. A good rollout starts with observation, compares selection against full-suite failures, and only then tightens the target.

## Unsupported Or Custom Test Runners

Smart Tests has documented integrations for many runners, plus \`file\` and \`raw\` profiles for unsupported or custom runners. Use the native runner integration when one exists because it knows the runner's expected input and output format. Use \`file\` when your runner can consume a list of files. Use \`raw\` when you need to map your own identifiers.

\`\`\`javascript
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const selectedFiles = readFileSync('subset.txt', 'utf8')
  .split('\\n')
  .map((line) => line.trim())
  .filter(Boolean);

if (selectedFiles.length === 0) {
  throw new Error('Smart Tests returned no selected files');
}

const result = spawnSync('npm', ['run', 'test:files', '--', ...selectedFiles], {
  stdio: 'inherit',
});

process.exit(result.status === null ? 1 : result.status);
\`\`\`

That wrapper does one thing an agent-generated shell script often forgets: it fails loudly when the subset file is empty. Empty can mean the model made a choice, but it can also mean the previous command failed, the session file was invalid, or the input list was wrong. A zero-test pass should never be indistinguishable from a healthy selected run.

## Fallback Modes And The Safe Failure Story

CloudBees documents fallback behavior for subset failures. By default, \`run-all\` returns all tests unchanged so CI continues when the subset API is unavailable or when the model is untrained. The docs also describe \`stop\` and \`random-sample\`, with \`--fallback-sampling-target\` for random sampling. The service can also return an untrained-model state, described in the docs as \`isBrainless: true\`, meaning it is still learning from recorded data.

The default \`run-all\` behavior is usually right for gating CI. But it can hide the fact that predictive selection is not actually saving time yet. Add artifacts that record subset size, all-test size, fallback mode, and session URL when available. This gives QA engineers and platform teams evidence instead of vibes.

\`\`\`bash
set -euo pipefail

total_count=\$(wc -l < all-tests.txt | tr -d ' ')
selected_count=\$(wc -l < subset.txt | tr -d ' ')

{
  echo "total_tests=\${total_count}"
  echo "selected_tests=\${selected_count}"
  echo "build=\${BUILD_NAME}"
  echo "suite=unit"
} > smart-tests-summary.txt

if [ "\${selected_count}" -eq 0 ]; then
  echo "Smart Tests selected zero tests" >&2
  exit 1
fi
\`\`\`

What people get wrong: they celebrate the first fast pull request after turning on predictive selection. One run proves nothing. You need to know whether the model selected tests, fell back to all tests, sampled randomly, or had too little history. Treat subset metadata as a test artifact, just like JUnit XML.

## Failure Mode: The Model Never Learns

A realistic failure looks like this: CI logs show \`smart-tests subset\` running, the job passes, but the selected list barely changes for weeks or always equals the full list. Engineers conclude predictive selection "does not work for our repo." The real cause is often that results are recorded under unstable build names, missing sessions, wrong test suite names, shallow Git history, or inconsistent test identifiers.

Diagnose it in this order. Confirm \`smart-tests verify\` can reach the workspace. Confirm every test job writes a session file. Confirm \`record tests\` runs on failures. Confirm the same \`--test-suite\` value is used for comparable runs. Confirm the runner in \`subset\` matches the runner in \`record tests\`. Then inspect whether the full candidate list changes unexpectedly between commits.

\`\`\`bash
smart-tests verify || true
test -s session.txt
test -s all-tests.txt
test -s subset.txt
python - <<'PY'
from pathlib import Path

all_tests = {line.strip() for line in Path('all-tests.txt').read_text().splitlines() if line.strip()}
subset = {line.strip() for line in Path('subset.txt').read_text().splitlines() if line.strip()}
missing = sorted(subset - all_tests)
if missing:
    raise SystemExit('Subset contains tests not present in all-tests.txt: ' + ', '.join(missing[:10]))
print(f'candidate_count={len(all_tests)} selected_count={len(subset)}')
PY
\`\`\`

For AI coding agents, encode those checks into a reusable QA skill or CI helper. Ready-made QA skills install from qaskills.sh with the qaskills CLI, but the important rule is simpler: agents should not edit selection targets until they can prove the data loop is healthy.

## Rollout Plan For A Busy QA Team

Start with observation, not enforcement. Record full-suite results for at least a meaningful slice of ordinary work: pull requests, merges to main, and scheduled full runs. Then enable subset selection on a non-blocking job and compare whether selected runs would have caught the same failures. Only after that should you let the selected job become a required check.

| Phase | CI behavior | Exit criteria |
| --- | --- | --- |
| Baseline | Full suite, \`record tests\` only | Stable sessions and visible results in the dashboard |
| Shadow | Generate subset but still run full suite | Subset artifact looks plausible and contains changed-area tests |
| Advisory | Run selected suite as non-required check | Failures are understandable and missing-data issues are fixed |
| Gating | Selected suite gates PRs, full suite runs on schedule | Misses are rare, reviewed, and fed back into suite design |
| Optimization | Tune confidence, time budget, and parallel bins | Faster feedback without shrinking trust |

The rollout should include suite hygiene. Predictive selection cannot rescue a suite where one file contains 400 unrelated Jest tests, one Maven class boots the whole world, or a Cypress spec mixes checkout, admin, reports, and marketing pages. Split tests around ownership and product behavior so the selection unit maps to real risk.

## How To Brief An AI Coding Agent

Agents are useful here when you give them hard constraints. Ask for a wrapper that preserves \`record tests\` on failure, refuses empty subsets, uploads artifacts, and leaves the optimization target unchanged unless a human approves it. Ask it to modify one CI job first. Do not ask it to "integrate Smart Tests everywhere" across a monorepo in a single pass.

\`\`\`markdown
Add CloudBees Smart Tests to the Python unit-test job only.

Constraints:
- Use the existing test command and keep its JUnit XML output.
- Add \`smart-tests record build\`, \`smart-tests record session\`, \`smart-tests subset\`, and \`smart-tests record tests\`.
- Make result recording run even when pytest fails.
- Save all-tests.txt, subset.txt, session.txt, and smart-tests-summary.txt as artifacts.
- Do not change the confidence target from 90%.
- Do not touch other CI jobs.
\`\`\`

That prompt is specific because the risk is not syntax. The risk is a plausible YAML file that drops failed runs, changes the test surface silently, or makes selection impossible to audit.

## Frequently Asked Questions

### Is CloudBees Smart Tests the same thing as Launchable?

CloudBees Smart Tests is the current CloudBees product name, while Launchable is the historical name many old docs, scripts, and search results still mention. Treat Launchable references as migration clues, not current terminology. New CI wrappers should use the \`smart-tests\` executable and the CloudBees Smart Tests docs. If an old pipeline still calls a \`launchable\` command, migrate deliberately and verify the install package, token variable, and command order before changing selection targets.

### Do I need full test runs after enabling predictive test selection?

Yes. Predictive selection depends on full or broad-enough result history to keep learning and to catch low-probability misses. A common pattern is selected tests on pull requests, full tests after merge or nightly, and mandatory result recording in both paths. If you stop full runs completely, the model has less evidence for tests that are rarely selected, new areas may take longer to stabilize, and your team loses an independent safety net for evaluating selection quality.

### What should happen when Smart Tests is unavailable?

For most gating CI jobs, the safest fallback is to run all tests. CloudBees documents \`run-all\` as the default fallback behavior when the subset API fails or the model is untrained. Some teams use \`stop\` for tightly budgeted non-gating jobs, or \`random-sample\` for experiments. Whatever you choose, record the fallback in artifacts so a fast job cannot masquerade as a healthy predictive selection run.

### Why did my subset contain files instead of individual tests?

Subset output depends on the test runner's supported altitude. Pytest can operate at test-case level, while Jest and Cypress commonly receive file-level selections and Maven or Gradle can receive class-level selections. That is normal. If file-level selection is too coarse, reorganize tests so each file has a tighter behavioral scope. Do not assume the model is weak just because your runner cannot execute a smaller unit.
`,
};
