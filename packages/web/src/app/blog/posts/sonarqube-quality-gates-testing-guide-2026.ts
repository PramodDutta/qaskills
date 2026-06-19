import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "SonarQube Quality Gates for Testing & Coverage (2026)",
  description: "Configure SonarQube quality gates in 2026 to enforce test coverage and quality — Clean as You Code, new-code conditions, coverage import, and CI setup.",
  date: "2026-06-15",
  category: "CI/CD",
  content: `# SonarQube Quality Gates for Testing & Coverage (2026)

A SonarQube quality gate is a set of pass/fail conditions that a code analysis must satisfy before it's considered releasable. You define conditions like "coverage on new code ≥ 80%", "zero new bugs", "duplicated lines on new code < 3%", and SonarQube marks each analysis (and each pull request) **Passed** or **Failed** against them. The modern SonarQube philosophy is **Clean as You Code**: gates focus almost entirely on **new code** — code you added or changed since a defined baseline — rather than demanding you fix an entire legacy codebase at once. SonarQube doesn't measure coverage itself; your test runner (JaCoCo, nyc, coverage.py, etc.) produces a report, and SonarQube *imports* it and enforces the gate. This guide covers the default gate, configuring coverage import, new-code conditions, and wiring the gate into CI to block merges.

## How SonarQube fits with your test tools

A frequent misconception is that SonarQube runs your tests or computes coverage. It does not. The pipeline is:

1. Your test runner executes tests and emits a coverage report (JaCoCo XML, LCOV, Cobertura, etc.).
2. The **scanner** (\`sonar-scanner\`, Maven/Gradle plugin) analyzes your source for bugs, code smells, security issues, and duplications — and reads the coverage report you point it at.
3. The scanner uploads everything to the SonarQube **server**, which evaluates the **quality gate**.
4. The gate result (Passed/Failed) is reported back to your CI and pull request.

So coverage import is just *handing SonarQube the file your test tool already produced*. For producing that file, see our [JaCoCo guide](/blog) for Java and the [Istanbul/nyc guide](/blog) for JavaScript.

## The default gate: "Sonar way"

SonarQube ships a built-in gate called **Sonar way**, and in 2026 it's built entirely around new code. Its conditions are approximately:

| Condition (on new code) | Threshold |
|---|---|
| Coverage | ≥ 80% |
| Duplicated lines | < 3% |
| Issues | 0 (no new bugs, vulnerabilities, or code smells failing the gate) |
| Security hotspots reviewed | 100% |

The crucial word is **new code**. Sonar way doesn't care that your legacy module is at 40% coverage — it cares that the lines you *touch in this change* meet the bar. This is what makes the gate adoptable on an existing project: you don't have to boil the ocean, you just have to keep new work clean. Coverage and quality of the whole codebase then improve organically as you modify it.

## Defining "new code"

For new-code conditions to work, SonarQube needs a baseline. You set the **New Code definition** per project (or globally):

- **Previous version** — new code is everything since the last analyzed version (good for released software with version bumps).
- **Number of days** — new code is anything changed in the last N days.
- **Reference branch** — new code is the diff versus a branch (typically \`main\`). This is the best fit for trunk-based and PR-driven workflows, because each PR's "new code" is exactly its diff against \`main\`.

For most teams using pull requests, **reference branch = main** is the right choice — it makes the gate evaluate precisely the lines a PR adds or changes.

## Importing coverage

You tell the scanner where the coverage report lives via analysis properties. The property name depends on the language.

**Java with JaCoCo** — point at the aggregated XML:

\`\`\`properties
# sonar-project.properties
sonar.projectKey=my-app
sonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml
sonar.java.binaries=target/classes
\`\`\`

In a multi-module Maven build, use the aggregated report so SonarQube sees true combined coverage, not fragmented per-module numbers.

**JavaScript/TypeScript with LCOV** — point at \`lcov.info\`:

\`\`\`properties
sonar.projectKey=my-app
sonar.sources=src
sonar.tests=test
sonar.javascript.lcov.reportPaths=coverage/lcov.info
\`\`\`

**Python with coverage.py** — produce \`coverage.xml\` (\`coverage xml\`) and set:

\`\`\`properties
sonar.python.coverage.reportPaths=coverage.xml
\`\`\`

If coverage shows as 0% in SonarQube despite a passing test run, the report path is almost always wrong, relative to the wrong directory, or the report was generated *after* the scan. Generate coverage *before* running the scanner, and double-check the path resolves from the scanner's working directory.

## Creating a custom quality gate

Sonar way is a sensible default, but teams often tailor a gate. In the SonarQube UI, go to **Quality Gates → Create**, then add conditions. A practical custom gate for a team that wants slightly stricter rules:

| Metric | On | Operator | Value |
|---|---|---|---|
| Coverage | New code | is less than | 80% |
| Duplicated Lines (%) | New code | is greater than | 3% |
| Maintainability Rating | New code | is worse than | A |
| Reliability Rating | New code | is worse than | A |
| Security Rating | New code | is worse than | A |
| Security Hotspots Reviewed | New code | is less than | 100% |

Assign the gate to your project (Project Settings → Quality Gate). Keep conditions on **new code** unless you have a specific reason to gate the overall codebase — overall-code gates tend to fail forever on legacy projects and get disabled, defeating the purpose.

## Wiring the gate into CI

The gate is only an enforcement mechanism if CI **waits** for the result and fails the build when it's red. Two pieces make this work: the scanner step, and a "quality gate" check that blocks on the verdict.

A GitHub Actions example for a Maven/JaCoCo project:

\`\`\`yaml
name: sonar
on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened]
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # full history so SonarQube computes new code correctly
      - uses: actions/setup-java@v4
        with: { java-version: '21', distribution: 'temurin', cache: maven }
      - name: Build, test, coverage
        run: mvn -B verify   # runs tests + jacoco report
      - name: SonarQube scan
        env:
          SONAR_TOKEN: \${{ secrets.SONAR_TOKEN }}
        run: >
          mvn -B sonar:sonar
          -Dsonar.projectKey=my-app
          -Dsonar.host.url=\${{ secrets.SONAR_HOST_URL }}
          -Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml
\`\`\`

Two non-obvious essentials:

- **\`fetch-depth: 0\`** — SonarQube needs full git history (or at least the reference branch) to determine what counts as new code. A shallow clone breaks new-code detection and you'll get misleading results.
- **Waiting for the gate** — \`sonar:sonar\` uploads asynchronously. To *fail the job* on a red gate, either set \`-Dsonar.qualitygate.wait=true\` (the Maven/Gradle plugins and scanner support this — it polls until the gate computes and exits non-zero on failure) or use a follow-up step that checks the gate status. Without this, the job stays green even when the gate fails.

For pull requests, configure the SonarQube **branch/PR integration** (with the appropriate token and PR metadata) so the gate posts a status check on the PR. Mark that check **required** in branch protection, and an under-quality PR cannot merge. Coverage services do the same job from a different angle — compare approaches in our [Codecov vs Coveralls guide](/compare).

## Pull request decoration

When connected to GitHub, GitLab, Bitbucket, or Azure DevOps, SonarQube **decorates** the pull request: it posts a summary comment, inline issue annotations, and a quality-gate status check showing new-code coverage and any new issues. This is what turns SonarQube from a dashboard you have to remember to visit into an inline gate developers see on every PR. Setup requires a DevOps platform integration plus the right token scopes; the exact steps differ per platform but the outcome is the same — a required PR check tied to the gate.

## Common errors and fixes

- **Coverage shows 0%** — Wrong \`reportPaths\`, report generated after the scan, or a path that doesn't resolve from the scanner's working directory. Generate coverage first and verify the path.
- **"New code" is empty or wrong** — Shallow clone. Use \`fetch-depth: 0\` and a correct New Code definition (reference branch \`main\` for PR workflows).
- **Gate passes despite failures** — You didn't wait for the gate. Add \`-Dsonar.qualitygate.wait=true\` or a status-check step.
- **PR check missing** — DevOps platform integration not configured, or token lacks PR permissions. Set up the platform binding and check token scopes.
- **Legacy gate fails forever** — Conditions are on overall code, not new code. Switch to new-code conditions (Clean as You Code) so only changed lines are judged.

For automating SonarQube and CI quality workflows with AI coding agents, browse the [CI/CD skills directory](/skills).

## Frequently Asked Questions

### What is a quality gate in SonarQube?

A quality gate is a set of pass/fail conditions — such as new-code coverage ≥ 80%, zero new bugs, and duplicated lines < 3% — that a code analysis must meet to be considered releasable. SonarQube evaluates every analysis and pull request against the gate and reports Passed or Failed. Wired into CI as a required status check, it blocks under-quality code from merging.

### Does SonarQube measure code coverage itself?

No. SonarQube imports a coverage report that your test runner produces — JaCoCo XML for Java, LCOV for JavaScript, coverage.xml for Python, and so on. You point the scanner at the report file with a language-specific property like \`sonar.coverage.jacoco.xmlReportPaths\`, and SonarQube enforces the coverage condition in your gate. If coverage shows 0%, the report path or generation order is usually wrong.

### What is "Clean as You Code" in SonarQube?

Clean as You Code is SonarQube's philosophy of focusing quality gates on **new code** — the lines you added or changed since a baseline — rather than demanding you fix an entire legacy codebase. It makes the gate adoptable on existing projects because each change only has to meet the bar for its own diff. Overall code quality then improves organically as developers modify older code over time.

### How do I make my CI build fail when the SonarQube gate fails?

Add \`-Dsonar.qualitygate.wait=true\` to your scanner invocation (supported by the scanner CLI and the Maven/Gradle plugins), which polls until the gate computes and exits non-zero if it failed. Alternatively, add a follow-up CI step that queries the gate status. Without waiting, \`sonar:sonar\` uploads asynchronously and the job stays green even when the gate is red.

### How does SonarQube define "new code"?

You set a New Code definition per project: previous version, a number of days, or — best for PR workflows — a reference branch like \`main\`. With a reference branch, new code is exactly the diff versus that branch, so each pull request's gate evaluates only the lines it adds or changes. New-code detection requires full git history, so use a non-shallow clone (\`fetch-depth: 0\`) in CI.

### Can SonarQube post a coverage status on pull requests?

Yes. With a DevOps platform integration (GitHub, GitLab, Bitbucket, or Azure DevOps) and the right token, SonarQube decorates pull requests with a summary comment, inline issue annotations, and a quality-gate status check showing new-code coverage and new issues. Mark that status check as required in your branch protection rules so a PR failing the gate cannot be merged.
`,
};
