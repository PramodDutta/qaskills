import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Only Changed Tests',
  description:
    'playwright only changed tests: run changed Playwright tests with a verified fallback. Use repo evidence, failure checks, and CI-safe QA steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'playwright only changed tests',
  keywords: [
    'playwright only changed tests',
    'playwright only changed flag',
    'playwright changed tests git ref',
    'affected e2e tests pull request',
    'test impact analysis playwright',
    'verify changed test selection',
    'fallback full browser suite',
  ],
  relatedSlugs: [
    'ci-detect-tests-affected-by-changed-files',
    'test-impact-analysis-ci-guide-2026',
    'playwright-ci-github-actions-complete-guide-2026',
    'playwright-testing-best-practices-2026',
  ],
  sources: [
    'https://playwright.dev/docs/test-cli',
    'https://playwright.dev/docs/running-tests',
    'https://playwright.dev/docs/ci',
  ],
  repoEvidence: ['seed-skills/pr-test-impact-analyzer/SKILL.md', 'packages/web/package.json'],
  content: `Playwright only changed tests should begin with a known Git base, a complete checkout, and a reviewed list preflight. Run the selected files first, but use a full-suite fallback whenever history or dependency evidence is incomplete. Record both paths so faster feedback never becomes silent coverage loss.

## What Does Playwright Only Changed Tests Control?

Playwright only changed tests limits a run to test files linked with changes between the current work and a Git reference. The result is a focused candidate set, not proof that every product risk has coverage.

The official [command line reference](https://playwright.dev/docs/test-cli) defines \`--only-changed [ref]\` as a Git-only filter. With no reference, it uses uncommitted changes; with a reference, it compares that point with \`HEAD\`.

The same reference defines \`--list\` as test collection without browser execution. Pairing both options exposes titles and projects before any selected browser test consumes CI time.

Repository history is therefore part of the input contract. A shallow clone, stale remote branch, or wrong merge base can change the selection before Playwright reads a test.

Dependency knowledge is the second part of that contract. Static imports are visible to tools, while runtime paths, generated files, configuration, and service contracts may need explicit risk mappings.

The workflow does not replace unit tests, service checks, security gates, or a periodic complete browser run. It only changes which Playwright files receive the first feedback slot.

Use the [changed-file CI guide](/blog/ci-detect-tests-affected-by-changed-files) for the broader pipeline design. This article keeps the release rule narrow: review the list, add known risks, and fall back when evidence is weak.

Playwright only changed tests are safe when omission has a defined response. An empty or surprising list must trigger review, not an automatic green status.

## How Does Playwright Only Changed Flag Work?

The playwright only changed flag applies during test discovery, before workers launch browsers. Playwright reads the Git comparison and collects the files that meet its changed-test rule.

Run \`npx playwright test --list --only-changed=origin/main\` as the first observable step. Save the exact reference, resolved commit, selected titles, projects, and command exit status.

The [running tests guide](https://playwright.dev/docs/running-tests) explains that the normal test command runs configured projects and reports results in the terminal. The changed filter narrows that normal run rather than creating a new assertion model.

Observation and assertion have different roles here. The list observes what the runner plans, while policy checks assert that expected risk paths and control tests are present.

A valid preflight should compare changed files with direct tests, shared fixtures, page objects, configuration, and known service edges. One missing high-risk control makes the list incomplete even when the command succeeds.

After approval, run the same reference without \`--list\`. Do not alter projects, grep filters, configuration, or working tree between preflight and execution.

Playwright only changed tests should fail normally when a selected product test fails. That failure must not be relabeled as a selector problem or hidden by an unrelated second run.

The fallback decision belongs before execution or after a clear selector validation error. Keep product failure, test defect, and selection uncertainty as three separate CI outcomes.

## Playwright Changed Tests Git Ref: Repository Evidence

The playwright changed tests git ref should match the actual pull request base, not a branch name chosen from habit. In many pipelines, the merge base is safer than a moving remote tip.

The repository file \`seed-skills/pr-test-impact-analyzer/SKILL.md\` computes a merge base before reading changed paths. It then uses a three-dot Git diff and keeps modified, added, deleted, and renamed files.

That skill also builds a dependency graph from imports and traverses dependents until it reaches tests. Each selected test retains a dependency chain and a reason tied to the first changed file.

Those details explain why a raw filename match is not enough. Shared helpers, barrel exports, path aliases, fixtures, and configuration can broaden the true browser-test impact.

The skill's CI example checks out full history with \`fetch-depth: 0\`. That choice directly addresses the shallow-history risk in a Git-based selector.

Its best-practice section calls for periodic full runs compared with predicted selections. A failing test omitted from the prediction reveals a dependency or mapping gap.

The second evidence file, \`packages/web/package.json\`, identifies the commands and Playwright dependency used by this web package. It shows where a focused command belongs without inventing a second package boundary.

Review the [test impact analysis guide](/blog/test-impact-analysis-ci-guide-2026) when the repository needs explicit scoring and ownership. Playwright only changed tests can use that richer map as a check around the built-in filter.

Repository evidence proves the intended comparison process, but it does not prove a given pull request was complete. CI must retain the actual ref, diff, list, and fallback result for each run.

## When Should QA Teams Use Affected E2e Tests Pull Request?

An affected e2e tests pull request job suits repositories with reliable Git history, stable imports, and enough full-run data to judge omissions. It should shorten feedback while a later safety net still measures the whole suite.

Use it when browser tests are numerous, pull requests are small, and dependency ownership is clear. The first focused job can then report high-risk failures before slower projects finish.

Start with advisory mode rather than deleting the complete run. Compare several weeks of selected sets against full outcomes before making the focused job a required release gate.

A useful control changes one shared page object and expects several feature tests. Another changes a leaf test file and expects only that file plus configured project dependencies.

Do not use the filter when generated code, dynamic imports, remote schemas, or broad configuration dominate behavior without mappings. Those changes should trigger the complete browser suite by policy.

Use direct file filters for an operator who already knows the exact test target. Use grep for a named title group, and use project filters when browser or environment scope is the real question.

A locator assertion answers whether the product reached a user-visible state. No Git selector can replace that oracle inside the chosen tests.

The [Playwright CI guide](/blog/playwright-ci-github-actions-complete-guide-2026) covers installation and runner setup around this job. Keep changed-test policy separate so infrastructure changes cannot silently alter risk rules.

Playwright only changed tests are most useful as the fast first lane. A scheduled, merge-queue, or pre-release full run should remain the measured control lane.

## Test Impact Analysis Playwright: Failure Modes and Diagnostics

Test impact analysis Playwright failures begin before browser launch when the comparison data is wrong. Diagnose the input chain before questioning a missing test's locator or assertion.

A shallow checkout can omit the merge base or old commits. Capture \`git rev-parse\`, the merge-base result, fetch depth, and the changed-file list before accepting any selection.

An incorrect Git ref can compare against a moving branch tip instead of the pull request base. Resolve the ref to a commit and store both forms in the evidence record.

A dynamic dependency may never appear in static imports. Route names, feature flags, database changes, generated clients, and environment files often require explicit mapping rules.

A missing mapping is a test-policy defect, not a product pass. Add the edge, rerun the preflight, and keep the omitted control test as a regression for the selector.

A product failure occurs when a correctly selected browser test finds wrong application behavior. Preserve its normal trace, screenshot, and assertion message without blaming the selection process.

A test defect occurs when the selected test is stale, nonisolated, or coupled to an invalid fixture. Fix that test while leaving the changed-file evidence intact for review.

An environment limit occurs when the base ref cannot be fetched, Git metadata is absent, or the runner lacks enough resources. That state should invoke the full suite or fail closed according to written policy.

Playwright only changed tests must not turn a selector error into a zero-test success. Treat an empty list as expected only when changed files and explicit policy both support that outcome.

Use the [Playwright practices guide](/blog/playwright-testing-best-practices-2026) to keep selected tests isolated and user-facing. Better test design makes dependency edges easier to reason about and failures easier to classify.

## Verify Changed Test Selection: Evidence and CI Assertions

To verify changed test selection, compare the Git diff with selected titles, known dependency edges, and representative high-risk controls. The check must produce a reviewable decision before browser execution.

Begin with file classes rather than raw counts. Product source, shared test code, runner configuration, package manifests, schemas, and documentation should each have an explicit selection rule.

For every selected test, retain at least one reason. A direct edit, import chain, custom mapping, or policy addition gives reviewers a clear path back to the changed file.

For every excluded source file, retain its exclusion rule. Documentation-only changes may be safe, while a test config or authentication schema should usually force broader coverage.

Keep one sentinel for each critical user path, such as sign-in, checkout, or publishing. Include that sentinel when its shared dependencies change, even if automated analysis misses the edge.

The [CI documentation](https://playwright.dev/docs/ci) recommends deterministic installation and execution in continuous integration. Add full Git history to that stable runner setup when using a history-based filter.

Store the Git ref, resolved commit, merge base, changed files, selected tests, exclusions, risk additions, and fallback decision. After execution, append the selected result and any full-suite result.

Playwright only changed tests earn trust through comparison data over time. Track how often policy adds tests and whether complete runs expose omitted failures.

Do not retain secrets, full environment dumps, or private test payloads in this record. Paths, titles, commit identifiers, policy reasons, and bounded result fields are usually sufficient.

## Fallback Full Browser Suite Comparison Table

A fallback full browser suite is required when the focused selection cannot prove its own inputs. The matrix separates discovery, review additions, focused execution, and complete execution.

| Option or signal | Use when | Expected evidence | Main risk |
| --- | --- | --- | --- |
| \`--only-changed\` | Select tests from a verified Git comparison | Ref, commit, changed files, selected tests, and exit | A wrong base silently narrows the set |
| \`--list\` preflight | Review titles and projects without browser work | Listed titles, projects, policy checks, and exclusions | A valid list is mistaken for coverage proof |
| Risk-based additions | Add edges static analysis cannot infer | Mapping rule, owner, added tests, and reason | Manual rules become stale without review |
| Full-suite fallback | Run when history or mapping evidence is incomplete | Trigger, full command, result, and retained artifacts | A broad run starts too late for useful feedback |

Choose the first row only after the comparison commit exists locally. A command that parses an unintended history is technically successful but operationally unsafe.

Use the list row as a review gate, not as a browser result. It proves discovery output only, so no product behavior has been exercised yet.

Risk additions should live in versioned policy with owners and test paths. Pull request comments alone are too easy to lose during later changes.

The full-suite row is the default for missing history, uncertain configuration, or an unexplained empty selection. Its cost is visible, while skipped coverage is not.

The [skills directory](/skills) includes workflows that can help maintain this evidence. A skill can guide the process, but the repository still owns its mapping and release rules.

Playwright only changed tests should run first even when a complete suite is already planned. Early focused output preserves the speed benefit without claiming the second lane is unnecessary.

## How Do You Implement Playwright Only Changed Tests?

Implement Playwright only changed tests as a two-stage gate: inspect the candidate list, then execute either that set or the full suite. Use one immutable Git reference across both stages.

1. Read \`seed-skills/pr-test-impact-analyzer/SKILL.md\` and define changed-file classes, custom dependency edges, sentinel tests, and full-suite triggers.
2. Fetch complete pull request history, resolve the approved base to a commit, and save the merge base with the changed-file list.
3. Run \`--list --only-changed\` against that ref, then compare titles with direct tests, known edges, and high-risk controls.
4. Execute the same focused command when the review passes, or execute the complete configured suite when evidence remains incomplete.
5. Save refs, files, selected tests, exclusions, additions, fallback reason, focused result, and complete result without sensitive data.
6. Repeat the focused workflow with CI settings, then compare it with periodic complete runs and repair every observed mapping gap.

The first example performs discovery and execution with one resolved base. It stops if discovery itself fails, leaving policy code to decide whether a fallback is required.

\`\`\`typescript
import { execFileSync } from 'node:child_process';

const base = execFileSync('git', ['merge-base', 'origin/main', 'HEAD'], {
  encoding: 'utf8',
}).trim();

const listed = execFileSync(
  'npx',
  ['playwright', 'test', '--list', \`--only-changed=\${base}\`],
  { encoding: 'utf8' },
);

if (!listed.includes('.spec.ts') && !listed.includes('.e2e.ts')) {
  throw new Error('Changed-test selection needs policy review');
}

execFileSync('npx', ['playwright', 'test', \`--only-changed=\${base}\`], {
  stdio: 'inherit',
});
\`\`\`

The thrown error is a controlled selector signal, not a product-test pass. CI can catch that named signal and start the configured full run.

The second example is a compact evidence record. It includes the brief's simple fallback command as a documented emergency path, while the decision field explains why it ran.

\`\`\`json
{
  "gitRef": "origin/main",
  "mergeBase": "4f20a77",
  "changedFiles": ["src/auth/session.ts"],
  "selectedTests": ["e2e/sign-in.e2e.ts"],
  "exclusions": [],
  "fallbackDecision": "run because dynamic auth mapping is unverified",
  "fallbackCommand": "npx playwright test --only-changed=origin/main || npx playwright test",
  "fullSuiteResult": "required; result appended by CI"
}
\`\`\`

Do not use a bare shell \`||\` as the final release policy. It also reruns after a real selected-test failure, which mixes a product result with selector uncertainty.

Instead, classify the preflight result before tests begin. Use a distinct exit code or structured field for missing history, empty selection, unknown change class, and absent sentinel.

Run the smallest local check with \`npx playwright test --list --only-changed=origin/main\`. Then run the same command in CI after the checkout step fetches full history.

Compare output with \`git diff --name-status\` and the repository map. Keep the review readable by listing only paths, titles, reasons, and decisions.

The [Playwright CLI skill](/skills/Pramod/playwright-cli) can guide focused command execution. Use the [test impact guide](/blog/test-impact-analysis-ci-guide-2026) when custom edges need risk scores and owners.

### Build a Changed-Test Review Card

Start the card with the pull request number, head commit, base ref, and resolved merge base. These four facts make later reproduction possible after branches move.

Add each changed path with a plain change type. Keep rename source and target together because either side may own dependency edges.

Group paths as product code, test code, test support, configuration, generated output, or documentation. Each group should map to a written breadth rule.

List discovered tests with their Playwright project and title. File names alone can hide project dependencies or duplicate titles across browser projects.

Add one reason beside every test. Direct edit, import edge, custom map, or sentinel policy are short labels that reviewers can challenge.

Next, list excluded paths with their reason and owner. An unexplained exclusion is a failed preflight even when the selected set looks plausible.

Mark whether checkout history is complete and the base commit exists. If either answer is no, choose the complete suite without trying to estimate safety.

Check shared fixtures, page objects, global setup, web server code, and runner configuration separately. Changes there often affect tests beyond one feature folder.

Run the list twice from the same clean commit and compare normalized output. A different result points to generated state, discovery side effects, or an unstable environment.

Keep one known high-risk change fixture for selector testing. Alter its mapped source path and require the expected sentinel before trusting a policy update.

Run one negative fixture with a documentation-only path. It should follow the documented low-risk rule rather than adding arbitrary browser tests.

Record the focused start, finish, exit code, failed title, and artifact paths. These facts explain execution without storing full environment or secret values.

If focused tests fail, stop and report that failure normally. Do not let the complete fallback replace or dilute the first failing assertion.

If selector validation fails, start the full suite and retain the exact trigger. The review should show why extra work ran rather than presenting it as random variance.

After the complete run, compare failures against the earlier list. Any omitted failing test becomes a new graph edge, policy rule, or investigation item.

Review custom mappings when files move or aliases change. Stale edges can produce both missing coverage and needless test load.

Track selected count and complete count as context, not as a pass rule. A tiny correct selection may be safer than a large set with no clear reasons.

Measure time to first failure and total run time over several pull requests. That data shows whether the fast lane helps while the full lane guards omissions.

Keep the card as a small JSON artifact or job summary. A reviewer should understand the decision without opening a large trace.

Playwright only changed tests pass this process when history, mapping, selection, execution, and fallback each have an explicit recorded result. The final card must let a new reviewer repeat the choice from the same clean commit.

### Run a Small Selection Proof

Pick one pull request with a small code change and one known browser test, then write the base commit, head commit, changed path, test title, and risk note on one run sheet. Keep this first case free from generated files and broad config changes, since the goal is to prove the plain path before harder edges are added.

Fetch both commits in a clean job, resolve the merge base, and check that each object exists before any Playwright command starts or any pass state can be shown. Save the short commit IDs and the full ref names, so a branch move on the next day cannot alter what the first run meant.

Read the Git diff and mark each path as code, test, shared test aid, config, data, or docs, then state the test rule for every marked class. Use the [changed-file guide](/blog/ci-detect-tests-affected-by-changed-files) when this map grows, but keep the first proof small enough for one person to check by hand.

Find the direct browser test and walk each import edge back to the changed file, while noting any route, flag, file, or service tie that code import rules cannot see. Add those hidden ties to a short map with an owner and reason, rather than trusting a close file name or a broad folder guess.

Run the list command twice from the same clean tree and sort only stable fields, then compare project, file, suite, and test names for an exact match. If the two lists differ, stop the fast path and inspect load-time code, generated state, and config before any test result is used.

Add one high-risk sentinel that a clear policy links to the changed path, then show that the list holds both the direct test and this extra guard. The [impact analysis guide](/blog/test-impact-analysis-ci-guide-2026) can hold a larger risk model, while this proof needs one edge whose truth is easy to review.

Remove the known map in a throwaway branch and rerun the list, then require the sentinel to vanish and the preflight gate to reject that smaller set. Restore the map before the real run, since this forced miss exists to test the guard and must never reach the release branch.

Run the approved focused set once and keep its first pass or fail result, while naming the exact test, browser project, start time, end time, and exit code. A failed product check must stop that lane at once, even when the [Playwright CI guide](/blog/playwright-ci-github-actions-complete-guide-2026) also schedules a broad run later.

Run the full suite as a control on the same commit and compare all failed files with the set that the fast lane chose, without using total test count as proof. Any failed file outside the set is a real gap to map, even when the full run later passes after a retry.

Close the proof by checking that the run sheet has no secret text, stale branch tip, unexplained path, lost first failure, or false zero-test pass. Keep the small sheet with the CI result, because its base, list, map, choice, and control form the claim that reviewers must assess.

## Frequently Asked Questions

### What is the safest way to use playwright only changed flag?

Resolve the pull request base to a commit, fetch complete history, and run a list preflight before browser execution. Compare selected titles with changed files, known dependency edges, and critical sentinels. Use the complete suite whenever history, mappings, or exclusions cannot be explained.

### How do you verify playwright changed tests git ref?

Record the supplied ref, its resolved commit, and the merge base with \`HEAD\`. Compare \`git diff --name-status\` against the pull request file list, including renames and deletions. A missing base commit or unexpected diff should stop focused selection and trigger the fallback policy.

### When should a QA team choose affected e2e tests pull request?

Choose it when repository history is complete, dependency paths are maintained, and periodic full runs measure missed coverage. Start in advisory mode and preserve a complete control lane. Avoid making it the sole release gate for dynamic systems until mappings and fallback behavior have evidence.

### What causes failures in test impact analysis playwright?

Common causes include shallow clones, moving base refs, unresolved aliases, dynamic imports, stale graph caches, generated clients, and missing configuration mappings. Separate these selector defects from product failures and broken tests. Repair the input or edge, then compare the revised set with a complete run.

### Which evidence should verify changed test selection retain?

Retain the base ref, resolved commit, merge base, changed paths, selected titles, projects, dependency reasons, exclusions, manual additions, and fallback decision. Append focused and complete results with bounded artifact paths. Do not store secrets, private payloads, or an unfiltered environment dump.

### How should CI handle fallback full browser suite?

CI should choose the full suite before focused execution when history or selection checks fail. Preserve the named trigger and run the normal configured projects. A real selected-test failure should remain a failure; it must not become a selector fallback that obscures the first result.

## Conclusion

Playwright only changed tests are a fast first lane, not a self-proving coverage gate. Adopt them after full history, dependency reasons, exclusions, sentinels, controlled selector failures, and periodic complete comparisons are all visible in CI. A short plain run sheet should let any peer trace the base, list, risk map, choice, and full control without guesswork.

Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli), install it, and apply this brief's focused verification workflow. Review related controls on the [QASkills blog](/blog) before making the changed-test lane a required release check.`,
};
