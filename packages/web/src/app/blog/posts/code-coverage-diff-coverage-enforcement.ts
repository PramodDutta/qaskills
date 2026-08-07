import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Code Coverage Diff Coverage Enforcement That Improves Pull Requests',
  description: 'Use this code coverage diff coverage enforcement guide to gate risky changes, avoid vanity percentages, and keep CI feedback focused on edited code.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Code Coverage Diff Coverage Enforcement That Improves Pull Requests

Code coverage diff coverage enforcement means gating the lines changed by a pull request, not celebrating a repository-wide percentage that barely moves. A useful policy asks whether new or modified executable lines are covered by tests, reports the uncovered lines directly to the author, and leaves legacy debt visible without letting it block every unrelated change.

For QA and test-automation engineers, diff coverage is a practical compromise. Full-suite coverage goals can be too blunt for large codebases with years of history. A changed-line gate is specific enough to influence the pull request in front of you. It helps reviewers ask better questions: “Why is this branch untested?” rather than “Why is the whole repo still at 63 percent?”

This guide builds a workflow around Istanbul-style coverage reports, Git diffs, CI checks, and review diagnostics. It also covers what people get wrong, especially treating generated lines, snapshots, and test-only edits as if they had the same risk as new production logic.

## Separate total coverage from changed-line coverage

Total coverage and diff coverage answer different questions. Total coverage describes the historical test surface of the repository. Diff coverage describes whether this change added untested executable code. Both are useful, but only diff coverage is a precise pull-request gate.

| Metric | Question answered | Good use | Bad use |
|---|---|---|---|
| Total line coverage | How much of the whole codebase ran under tests? | Trend monitoring and broad risk discussions | Blocking every PR in a legacy repo |
| Total branch coverage | How many branch outcomes ran? | Finding untested conditional paths | Treating all branches as equal risk |
| Diff line coverage | Are changed executable lines covered? | Pull-request gate and review focus | Replacing architectural testing judgment |
| Diff branch coverage | Are changed decisions exercised both ways? | High-risk conditional logic | Demanding impossible branches from generated code |

The key is to avoid a vanity gate. A team can keep total coverage stable while adding untested code if the repository is large enough. A team can also lower total coverage slightly with a well-tested refactor that removes low-value tested lines. Diff coverage puts the attention where the author can act immediately.

Diff coverage does not prove correctness. It proves that tests executed the changed lines. A weak assertion can still cover a bug. Use the gate as a minimum bar, then rely on review, mutation testing where appropriate, contract tests, end-to-end workflows, and defect history to decide whether the tests are meaningful.

## Decide what counts as a changed executable line

The hardest part is not calculating a percentage. It is deciding which lines belong in the denominator. A good policy includes production source lines changed by the pull request and excludes lines that cannot or should not be executed directly, such as comments, type-only declarations, generated files, snapshots, lockfiles, and configuration that has separate validation.

Create an explicit decision table so engineers do not have to negotiate every failed build.

| File or line type | Include in diff coverage? | Reason |
|---|---|---|
| New production branch in \`src/\` | Yes | New behavior needs executable evidence |
| Changed test file | No for production diff gate | Tests are evidence, not the covered product surface |
| TypeScript interface only | Usually no | It disappears at runtime and line coverage is misleading |
| Generated API client | Usually no | Regenerate and validate generation pipeline instead |
| Framework route handler | Yes | It is production behavior reachable by users or agents |
| Snapshot file | No | Snapshot review is a separate concern |
| Migration script | Depends | Use migration test or database validation if executable |

The policy should be stricter for high-risk paths. Payment changes, authentication, authorization, data deletion, and AI agent tool execution may need branch coverage or scenario-specific tests, not only changed-line coverage. Diff coverage is the default floor, not the ceiling.

## Produce coverage in a machine-readable format

Most JavaScript and TypeScript projects can produce Istanbul-compatible coverage output through their test runner or coverage provider. Vitest, Jest, and related tooling can emit reports such as text, lcov, and JSON through documented configuration. The exact provider and reporter settings depend on your stack, so keep the CI contract simple: after tests run, a machine-readable coverage file must exist.

For a Vitest project, a configuration might look like this:

\`\`\`ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      reporter: ['text', 'json'],
      reportsDirectory: 'coverage',
    },
  },
});
\`\`\`

For a Jest project, the same idea is enabling coverage and requesting a JSON reporter:

\`\`\`js
module.exports = {
  collectCoverage: true,
  coverageReporters: ['text', 'json'],
  coverageDirectory: 'coverage',
};
\`\`\`

Do not hard-code a fake runner flag into your team docs. Use the documented configuration for your runner and version. The enforcement layer should consume the artifact, not care whether the coverage came from Vitest, Jest, a browser test runner, or a merged report from multiple packages.

If your repository has several packages, merge coverage before evaluating the diff or run one diff check per package with clear ownership. A single changed line should map to the coverage artifact that actually contains that file. “No coverage data found” should be treated differently from “line is uncovered.” The former is often a path mapping or instrumentation issue.

## Extract changed lines from Git without guessing intent

The diff side of the calculation should come from Git. In CI, compare the pull request head against the merge base with the target branch. Locally, compare against the main branch or an explicitly provided base. Avoid comparing only the last commit because pull requests often contain multiple commits.

The command below prints changed line numbers for TypeScript source files using \`git diff --unified=0\`. It is a small building block, not a complete parser for every diff edge case.

\`\`\`bash
git diff --unified=0 origin/main...HEAD -- 'src/**/*.ts'
\`\`\`

A Node script can parse hunk headers. Hunk headers include the new-file range after the plus sign. For example, a header with \`+42,3\` means the new file has changed lines starting at 42 for 3 lines. A header with only \`+42\` means one changed line.

\`\`\`js
function changedLinesFromUnifiedDiff(diffText) {
  const byFile = new Map();
  let currentFile = null;

  for (const line of diffText.split('\\n')) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice('+++ b/'.length);
      if (!byFile.has(currentFile)) byFile.set(currentFile, new Set());
      continue;
    }

    if (!line.startsWith('@@') || currentFile === null) continue;

    const match = line.match(/\\+(\\d+)(?:,(\\d+))?/);
    if (!match) continue;

    const start = Number(match[1]);
    const count = Number(match[2] ?? '1');
    const lines = byFile.get(currentFile);

    for (let offset = 0; offset < count; offset += 1) {
      lines.add(start + offset);
    }
  }

  return byFile;
}
\`\`\`

In normal source code, keep the JavaScript regex exactly as your editor shows it.

Diff parsing gets tricky around deleted files, renames, binary files, and generated files. Start with a focused production path and make exclusions explicit. If your repository already uses a mature diff coverage tool, prefer it over maintaining a script. The point of the example is to make the mechanics inspectable for teams that need a custom policy.

## Map changed lines to Istanbul coverage

Istanbul JSON coverage maps each file to statement maps and execution counts. A line can contain several statements, and a statement can span multiple lines. For a pragmatic changed-line gate, count a changed line as covered if at least one statement covering that line has a positive execution count. For stricter teams, require every statement starting on the changed line to be covered. Document the choice.

Here is a simplified mapper for Istanbul-style statement coverage:

\`\`\`js
import fs from 'node:fs';
import path from 'node:path';

function loadCoverage(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function coveredLinesForFile(fileCoverage) {
  const covered = new Set();

  for (const [statementId, location] of Object.entries(fileCoverage.statementMap)) {
    const count = fileCoverage.s[statementId] ?? 0;
    if (count <= 0) continue;

    for (let line = location.start.line; line <= location.end.line; line += 1) {
      covered.add(line);
    }
  }

  return covered;
}

function findCoverageForRelativePath(coverage, relativePath) {
  const normalized = path.normalize(relativePath);

  return Object.entries(coverage).find(([file]) => {
    return path.normalize(file).endsWith(normalized);
  })?.[1];
}
\`\`\`

This code is intentionally transparent rather than feature-complete. A production implementation should handle source maps, path normalization across operating systems, ignored files, and branch coverage if your gate includes it. The mapper must also account for the fact that TypeScript source coverage may be reported against transpiled paths unless the runner is configured for source maps.

Now combine changed lines with covered lines:

\`\`\`js
function diffCoverageResult(changedLinesByFile, coverage) {
  const uncovered = [];
  let coveredCount = 0;
  let totalCount = 0;

  for (const [file, changedLines] of changedLinesByFile.entries()) {
    const fileCoverage = findCoverageForRelativePath(coverage, file);
    if (!fileCoverage) {
      for (const line of changedLines) uncovered.push({ file, line, reason: 'no coverage data' });
      totalCount += changedLines.size;
      continue;
    }

    const coveredLines = coveredLinesForFile(fileCoverage);

    for (const line of changedLines) {
      totalCount += 1;
      if (coveredLines.has(line)) {
        coveredCount += 1;
      } else {
        uncovered.push({ file, line, reason: 'line not covered' });
      }
    }
  }

  const percentage = totalCount === 0 ? 100 : (coveredCount / totalCount) * 100;
  return { coveredCount, totalCount, percentage, uncovered };
}
\`\`\`

The output needs to be actionable. A percentage alone forces authors to open artifacts and guess. A list of file and line pairs points them to the exact change.

## Pick a threshold that matches risk

Many teams choose a single number, such as 80 or 90 percent, and never revisit it. That is better than no policy, but it misses risk differences. A UI copy change, a pure type cleanup, and a new authorization branch should not carry the same enforcement. Start with a default threshold, then add path-based or label-based stricter rules only where they are worth the maintenance.

| Area | Suggested gate style | Rationale |
|---|---|---|
| Core domain logic | High diff line coverage plus branch review | Bugs are costly and usually testable |
| Authorization and permissions | Require targeted scenario tests | A covered line can still miss deny cases |
| API route handlers | Diff coverage plus contract or integration tests | Request validation and response shape matter |
| UI components | Diff coverage where unit tests exist, plus selected E2E | Rendering branches can be environment-sensitive |
| Generated code | Exclude, then test generator or contract | Hand-written line coverage adds noise |
| Test utilities | Separate utility tests when shared | Do not mix with production gate denominator |

An enforcement script can read thresholds from a small JSON file:

\`\`\`json
{
  "defaultMinimum": 85,
  "paths": [
    { "pattern": "src/auth/", "minimum": 95 },
    { "pattern": "src/payments/", "minimum": 95 },
    { "pattern": "src/generated/", "minimum": 0, "exclude": true }
  ]
}
\`\`\`

If you implement pattern matching yourself, keep it simple or use an established glob library already present in the project. Do not invent half a glob engine in a CI script. Bad matching creates arguments about tooling instead of improving tests.

## Fail with review-grade output

A failing diff coverage gate should say what changed, what was not covered, and how to reproduce locally. It should not dump a giant coverage JSON blob. The author should be able to fix the problem without opening five CI artifacts.

\`\`\`js
function printDiffCoverageFailure(result, minimum) {
  console.error('Diff coverage failed');
  console.error('Required: ' + minimum.toFixed(1) + '%');
  console.error('Actual: ' + result.percentage.toFixed(1) + '%');
  console.error('');
  console.error('Uncovered changed lines:');

  for (const item of result.uncovered.slice(0, 50)) {
    console.error('- ' + item.file + ':' + item.line + ' (' + item.reason + ')');
  }

  if (result.uncovered.length > 50) {
    console.error('...and ' + (result.uncovered.length - 50) + ' more');
  }

  console.error('');
  console.error('Run coverage locally, then add tests or justify an exclusion.');
}
\`\`\`

The phrase “justify an exclusion” matters. There should be a process for intentional exceptions, but it should be visible. Examples include generated files, unreachable defensive branches, or platform-specific code that is covered in a different job. An exception hidden in a broad ignore pattern is technical debt. An exception attached to a review comment with a narrow path and reason is an engineering decision.

## Wire diff coverage into CI after stale-run controls

Diff coverage should run after the relevant unit or integration tests have produced coverage. It should also cooperate with CI cancellation. If a newer commit arrives, the old coverage job should stop so it does not post stale failure feedback. That workflow is covered in [canceling stale end-to-end runs on new commits](/blog/ci-cancel-stale-e2e-runs-on-new-commit), and the same principle applies to coverage gates.

A generic GitHub Actions job can run tests, then a local enforcement script:

\`\`\`yaml
name: coverage

on:
  pull_request:

jobs:
  diff-coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm test -- --coverage
      - run: node scripts/check-diff-coverage.js origin/main...HEAD coverage/coverage-final.json
\`\`\`

For GitLab CI, the shape is similarly straightforward:

\`\`\`yaml
diff_coverage:
  image: node:22
  stage: test
  before_script:
    - npm ci
  script:
    - npm test -- --coverage
    - git fetch origin main
    - node scripts/check-diff-coverage.js origin/main...HEAD coverage/coverage-final.json
  artifacts:
    when: always
    paths:
      - coverage/
\`\`\`

The exact Node version should match your project. The command after \`npm test\` should match your runner. Keep \`fetch-depth: 0\` or an equivalent full-enough fetch because merge-base comparisons need history. A shallow checkout that lacks the target branch history can produce an empty or incorrect diff.

Coverage gates and flaky test reporting should also be kept separate. A flaky test can produce missing coverage and make the diff gate look like the problem. The [GitLab CI JUnit report flaky tests guide](/blog/gitlab-ci-junit-report-flaky-tests) shows how to expose test reliability signals so coverage failures are not confused with unstable execution.

## Diagnose common false failures

The most realistic false failure is path mismatch. The diff reports \`src/orders/price.ts\`, but the coverage file records \`/builds/group/project/src/orders/price.ts\` or \`packages/api/src/orders/price.ts\`. Normalize paths and print both the changed path and candidate coverage keys during debug mode. Do not immediately exclude the file. Fix the mapping.

Another common failure is source-map mismatch. TypeScript coverage should point back to source files. If the report points to transpiled \`dist/\` files, changed source lines will appear uncovered. Diagnose by opening \`coverage/coverage-final.json\` and checking file keys. Then adjust the test runner's documented source-map and coverage settings rather than hacking line offsets into the diff script.

Generated code is a policy failure more than a tooling failure. If code generation modifies hundreds of lines, the diff gate may fail even though nobody should hand-write tests for those lines. Exclude generated paths narrowly and add a separate check that generated files are up to date. A broad \`src/**/*.generated.ts\` exclusion is defensible. A broad \`src/api/**\` exclusion probably hides real route logic.

Finally, watch for partial test selection. If CI runs only affected tests but coverage is evaluated against all changed lines, a line may be uncovered because the selected suite missed the package that owns it. That can be a good signal: your affected-test selection is incomplete. It can also be an intentional split where another job covers that package. In that case, merge coverage artifacts before enforcement.

## What people get wrong about enforcement

The first mistake is setting a threshold so high that developers learn to game it. If the default is 100 percent for every path, teams may add shallow tests that execute lines without asserting behavior, or they may carve broad exclusions. A slightly lower threshold with focused review for risky branches can produce better tests.

The second mistake is ignoring branch coverage for changed conditionals. A changed line inside \`if (user.isAdmin)\` may be covered by only the allow path. The deny path still matters. Diff line coverage cannot see every semantic branch. For authorization, pricing, deletion, and feature-flag logic, add explicit scenario checks or branch-aware reporting.

The third mistake is using diff coverage as a substitute for deletion. Legacy uncovered code should not be protected forever just because it is not touched. Keep total coverage trends, mutation results, escaped defect metrics, or module risk scores visible. Diff coverage is the pull-request guardrail. It is not the whole quality strategy.

## A pragmatic rollout plan

Start in report-only mode for one or two weeks. Post the diff coverage percentage and uncovered changed lines, but do not fail the build. During that period, fix path mapping, generated-code exclusions, and source-map issues. If report-only mode produces noisy or unfair results, enforcement will lose trust immediately.

After report-only mode, fail only below a modest default threshold, then raise it gradually by area. Make exceptions narrow and reviewable. Add a label or configuration field only if your CI can make the exception visible in the job output. A hidden bypass is worse than no gate because it creates false confidence.

Use this rollout sequence:

| Phase | Gate behavior | Success criterion |
|---|---|---|
| Instrument | Produce coverage JSON in CI | Artifact exists for every relevant package |
| Report | Calculate diff coverage and print uncovered lines | Developers can reproduce locally |
| Enforce default | Fail below a default threshold | Failures are actionable and rare enough to fix |
| Harden risky paths | Add stricter path rules | Auth, payment, and data-loss paths get stronger review |
| Review exceptions | Audit exclusions monthly | Generated and unreachable paths stay narrow |

A local command should mirror CI:

\`\`\`bash
npm test -- --coverage
git fetch origin main
node scripts/check-diff-coverage.js origin/main...HEAD coverage/coverage-final.json
\`\`\`

If authors cannot reproduce the gate locally, they will treat it as CI magic. Reproducibility is also useful for AI coding agents, which can run the same command after adding tests and inspect precise uncovered lines.

## Frequently Asked Questions

### Is 100 percent diff coverage a good default?

Not usually. It sounds clean, but it can push teams toward shallow tests and broad exclusions. A better default is high enough to catch untested logic while leaving room for lines that are impractical or irrelevant to execute, such as defensive fallbacks or platform guards. Use stricter expectations for high-risk paths and changed conditionals. Review the uncovered lines, not just the percentage, because one uncovered authorization branch can matter more than ten uncovered low-risk formatting lines.

### Should generated files be included in diff coverage?

Usually no. Generated files should be validated through the generator, schema, contract, or snapshot process that owns them. Hand-writing tests against generated line changes creates noise and discourages regeneration. Exclude generated paths narrowly and visibly. Do not use generated-code exclusions to hide hand-written API handlers or business logic. If generated code includes custom edits, fix that process first because mixed ownership makes coverage policy hard to defend.

### Why does CI say changed lines are uncovered when local coverage looks fine?

The usual causes are path mismatches, source-map differences, shallow Git history, or different test selection. Compare the changed file path from Git with the keys in the coverage JSON. Make sure CI fetched enough history to compute the merge-base diff. Confirm the same tests run locally and in CI. If coverage maps to transpiled files rather than TypeScript source, adjust runner coverage settings instead of adding line-offset hacks.

### Can diff coverage replace code review?

No. Diff coverage tells you that tests executed changed lines. It does not prove the assertions are meaningful, that important branches were covered, or that the scenario matches user risk. Treat it as a fast pull-request signal that highlights missing evidence. Reviewers still need to inspect test intent, data setup, negative cases, and risky behavior. The best use of diff coverage is to make those review conversations concrete.
`,
};
