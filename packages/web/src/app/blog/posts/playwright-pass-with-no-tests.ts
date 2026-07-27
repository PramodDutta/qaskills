import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Pass With No Tests',
  description:
    'playwright pass with no tests: allow intentional empty selections without hiding bad filters. Use repo evidence, failure checks, and CI-safe QA steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'playwright pass with no tests',
  keywords: [
    'playwright pass with no tests',
    'playwright pass with no tests flag',
    'playwright no tests found ci',
    'allow empty changed test set',
    'detect broken test filter',
    'empty e2e suite release gate',
    'playwright zero tests exit code',
  ],
  relatedSlugs: [
    'empty-related-test-set-release-blocker',
    'playwright-test-config-options-complete-reference',
    'ci-detect-tests-affected-by-changed-files',
    'playwright-testing-best-practices-2026',
  ],
  sources: [
    'https://playwright.dev/docs/test-cli',
    'https://playwright.dev/docs/running-tests',
    'https://playwright.dev/docs/ci',
  ],
  repoEvidence: ['packages/web/playwright.config.ts', 'packages/web/package.json'],
  content: `Playwright pass with no tests is appropriate only when a dynamic selection can validly contain zero tests and an independent preflight records why. Run the same selector with \`--list\`, classify the empty set, and keep ordinary suites fail-closed. The flag changes exit behavior; it does not prove discovery is correct.

## What Does Playwright Pass With No Tests Control?

Playwright pass with no tests controls the runner's exit result when no tests are found. The option can make that empty execution succeed, but it does not validate paths, projects, grep expressions, configuration, or changed-file analysis.

That distinction matters in CI because an exit code answers only whether the command met runner policy. It does not tell reviewers whether zero was the expected collection count.

Fixed smoke, regression, and release suites should normally reject an empty inventory. Their purpose requires at least one known test, so zero usually means discovery or checkout failed.

Dynamic selections can have a valid empty case. A changed-file job may find that documentation, styles, or unrelated packages have no mapped end-to-end tests.

The official [Playwright test CLI reference](https://playwright.dev/docs/test-cli) describes \`--pass-with-no-tests\` as making a test run succeed when no tests were found. It separately documents \`--list\`, \`--grep\`, \`--project\`, positional filters, and \`--only-changed\`.

Treat those selection inputs as evidence. Record the exact arguments, base Git reference, resolved configuration, selected projects, collected count, and reason that zero is permitted.

The [empty related-test-set guide](/blog/empty-related-test-set-release-blocker) develops the wider release decision. A zero count is safe only when a deterministic mapping explains it and a control proves the mapper still finds known tests.

Playwright pass with no tests does not replace configuration validation, test inventory checks, source checkout verification, or a full-suite schedule. It is one narrowly scoped exit policy after those safeguards pass.

## How Does Playwright Pass With No Tests Flag Work?

The Playwright pass with no tests flag is a command-line switch read by the test runner. It affects the final no-tests condition after configuration loading, project selection, file matching, and test filtering.

The runner still reports configuration errors, syntax failures, invalid projects, failed tests, and infrastructure errors. The flag is not a general ignore-errors option and should never be presented as one.

Run \`--list\` with the exact same file, project, grep, and changed-file arguments used by execution. If the preflight and run differ, the recorded count cannot justify the later result.

The [running tests guide](https://playwright.dev/docs/running-tests) shows common project, headed, debug, and file selectors. Every added selector narrows collection and creates another place where a typo can produce zero.

An observation is the collected count and listed test identities. An assertion compares that count with the job's declared minimum or with an approved empty-set reason.

For an intentional empty change set, the preflight should state which changed files were considered and why none map to E2E coverage. A bare environment variable saying "allow empty" is not enough.

For a fixed suite, set a positive minimum and omit the flag. A smoke job that collected zero tests must fail even if another broad nightly suite exists.

Playwright pass with no tests belongs in a wrapper that chooses between fail-closed execution and an audited empty branch. Avoid adding it unconditionally to a shared package script.

## Playwright No Tests Found CI: Repository Evidence

Playwright no tests found CI behavior depends on the repository's active configuration. The file \`packages/web/playwright.config.ts\` sets \`testDir\` to \`./e2e\` and matches files ending in \`.e2e.ts\`.

The same configuration declares one project named \`chromium\`. A path outside the E2E directory, a different suffix, or a misspelled filter can therefore remove every candidate.

CI also uses one worker, two retries, a dot reporter, and a fresh web server at \`http://127.0.0.1:3100\`. Those execution settings do not establish that collection found any test.

The file \`packages/web/package.json\` pins \`@playwright/test\` 1.61.0. Its \`test:e2e\` script resolves the local Playwright CLI, which prevents an unrelated global version from changing available options.

That script contains no unconditional empty-pass switch. Current fixed E2E runs therefore retain the runner's normal no-tests policy, which is the safer repository default.

The [Playwright configuration reference](/blog/playwright-test-config-options-complete-reference) helps review \`testDir\`, \`testMatch\`, projects, and CI settings together. Collection controls should be treated as one contract rather than independent strings.

A new dynamic job should wrap \`pnpm test:e2e -- --list\` and \`pnpm test:e2e -- <selection>\`. It should not edit the shared script merely to serve one changed-file workflow.

Playwright pass with no tests must use the same locked dependency and configuration in preflight and execution. Record the commit digest of both evidence files when a CI result is retained.

## When Should QA Teams Use Allow Empty Changed Test Set?

Allow empty changed test set behavior when a reviewed impact mapper can prove that none of the changed files require E2E coverage. Typical examples include prose-only documentation or isolated developer tooling.

The mapper should produce machine-readable inputs, matched rules, selected specs, and an empty reason. Reviewers need to see why zero occurred without reconstructing shell logs.

Use a positive control in the same pipeline or a scheduled job. Feed a known application file into the mapper and require at least one stable E2E spec, proving that mapping did not collapse globally.

The official CLI supports \`--only-changed [ref]\` for Git-based changed test selection. Its result still depends on repository history, the chosen reference, dependency analysis, and a complete checkout.

Shallow clones can omit the base reference, while force-pushed branches can change the comparison. Fetch the required commit explicitly and record both resolved digests before trusting the empty outcome.

Use \`--list\` without the pass flag to inspect collection. Add the flag only to the execution branch that already holds an approved zero count and reason.

A locator assertion is unrelated because no browser test started. A runner selection or mapping gate owns this problem, while an interactive CLI session cannot prove committed suite collection.

The [changed-file detection guide](/blog/ci-detect-tests-affected-by-changed-files) explains dependency-aware selection. Pair that model with a periodic full run so mapping gaps become visible before a release depends on them.

Playwright pass with no tests is inappropriate for a static project, a release smoke suite, or a job whose base reference is missing. In those cases, zero is unexplained and must block the gate.

## Detect Broken Test Filter: Failure Modes and Diagnostics

To detect broken test filter behavior, test each selector against both matching and nonmatching controls. A grep typo, path typo, changed \`testMatch\`, or accidental project exclusion can otherwise resemble a valid empty set.

A misspelled project often produces an explicit error, which is easy to diagnose. A valid but unmatched grep or positional regular expression is more dangerous because collection can simply become empty.

Configuration drift creates another quiet failure. Renaming specs from \`.e2e.ts\` while keeping the current \`testMatch\` makes files visible to Git but invisible to Playwright.

A sparse checkout or wrong working directory can remove the configured \`e2e\` tree. Record \`pwd\`, configuration path, test directory existence, and relevant file count before collection.

Changed-file selection can fail conceptually even when the command is valid. An incomplete dependency graph may classify an application change as unrelated, so the positive mapping control is essential.

Reporter parsing can also be defective. If a wrapper reads human text, a format change may turn an unknown count into zero; treat missing or unparseable totals as a hard failure.

The [Playwright testing practices guide](/blog/playwright-testing-best-practices-2026) favors stable, isolated tests. Selection logic deserves the same standard through deterministic inputs, explicit outputs, and controlled failure cases.

Separate product failures from harness failures. No product code ran when collection was empty, so do not label the result as a passing application test.

Environment faults include unavailable Git history, missing generated specs, wrong package roots, and stale caches. Test faults include filters and mapping rules, while an approved unrelated change is the only intentional zero case.

Playwright pass with no tests can hide all three categories when applied globally. Keep the flag behind evidence checks that reject an unknown count or unexplained empty reason.

## Empty E2e Suite Release Gate: Evidence and CI Assertions

An empty E2E suite release gate needs a stronger record than a green check mark. Capture selection mode, all arguments, resolved base and head commits, configuration path, project names, listed tests, and final exit code.

For a nonzero selection, execute exactly the listed scope and require normal test success. Preserve failed test artifacts according to the repository's existing trace policy.

For zero, require a mapper-produced reason code such as \`docs_only\` or \`no_e2e_dependency\`. Free-form operator text can support triage but should not control release logic.

Verify that the changed file list is nonempty and complete. An empty checkout diff is different from a real change set that maps to no browser specs.

Require a control query that finds at least one known test under the same configuration. This proves Playwright can load the suite even though the dynamic selector chose none.

The [CI guidance](https://playwright.dev/docs/ci) covers pinned dependencies, browser installation, workers, and container practices. Collection evidence should be captured before expensive browser setup when possible, but it must use the same source checkout and configuration.

Retain stdout and stderr when the count is unknown, then fail the job. Never coerce a parse error, terminated command, or missing report into an approved zero.

The release record should distinguish \`executed_pass\`, \`executed_fail\`, \`approved_empty\`, and \`selection_error\`. Only the first and third can satisfy this specific gate.

Use the [QASkills directory](/skills) to find CI and Playwright workflows that keep these states explicit. A reusable skill should still require repository-specific mappings and minimum counts.

Playwright pass with no tests is acceptable only for the \`approved_empty\` state. Every other zero outcome must retain a nonzero exit code and diagnostic evidence.

## Playwright Zero Tests Exit Code Comparison Table

Playwright zero tests exit code policy should vary by job purpose, not developer convenience. The table separates runner behavior from the evidence needed to trust an empty result.

| Option or signal | Use when | Expected evidence | Main risk |
| --- | --- | --- | --- |
| Default no-tests failure | Fixed suites and release smoke jobs must collect tests | Config, selectors, expected minimum, count, and exit code | Discovery drift blocks late without a clear inventory |
| \`--pass-with-no-tests\` | A reviewed dynamic selector can validly return zero | Changed files, mapping reason, count, controls, and exit code | A broken filter receives a green result |
| \`--list\` preflight | CI must expose the selected inventory before execution | Exact arguments, listed identities, parse status, and count | Preflight arguments differ from execution |
| Full-suite fallback | Mapping or Git evidence is missing or cannot be explained | Selection error, fallback scope, results, and artifacts | Teams skip the fallback to save time |

The default is correct for this repository's fixed E2E script. It makes changes to \`testDir\`, \`testMatch\`, or checked-out files visible as a failed gate.

The pass option is correct only after the preflight reaches an approved state. Its presence in a command should trigger a review for the matching decision record.

The list preflight should emit a stable report where possible. If the team parses console text, pin the runner and reject any format that does not contain one unambiguous total.

A full-suite fallback costs more time but restores confidence when changed-file analysis cannot run. Budget that path in CI rather than treating an uncertain selection as empty.

The [blog index](/blog) connects test selection with release, tracing, and configuration guidance. Keep the matrix in the job documentation beside the wrapper implementation.

Playwright pass with no tests does not turn zero tests into test coverage. It turns one explained empty decision into a successful pipeline state.

## How Do You Implement Playwright Pass With No Tests?

Implement Playwright pass with no tests in a small wrapper that lists tests, validates the count, and authorizes only known empty reasons. Keep the repository's ordinary E2E command unchanged.

1. Read \`packages/web/playwright.config.ts\` and \`packages/web/package.json\`, then record the test directory, match rule, projects, pinned runner version, and local script.
2. Resolve the changed-file base and head commits, run the exact selection with \`--list\`, and save the arguments, changed files, list output, and parsed count.
3. If the count is positive, run the same selection without \`--pass-with-no-tests\` and retain normal results plus failure artifacts.
4. If the count is zero, require a machine-produced approved reason and a positive known-test control before running with the pass flag.
5. Reproduce an unmatched grep, missing base reference, and malformed list output, then require each case to fail rather than become approved empty.
6. Repeat under CI settings, schedule the complete suite, compare selected coverage, and retain selection rule, count, reason, exit code, and fallback result.

The first example uses the repository script for a list preflight. It treats an unreadable count as an error instead of silently assigning zero.

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

selection=(--only-changed=origin/main --project=chromium)
list_log="$(mktemp)"
trap 'rm -f "$list_log"' EXIT

corepack pnpm test:e2e -- --list "\${selection[@]}" | tee "$list_log"
count="$(
  sed -nE 's/^Total: ([0-9]+) tests?.*/\\1/p' "$list_log" |
    tail -n 1
)"

if [[ ! "$count" =~ ^[0-9]+$ ]]; then
  echo "Playwright test count was not readable" >&2
  exit 2
fi

printf 'selected_count=%s\\n' "$count"
\`\`\`

The exact summary format should be verified against Playwright 1.61.0 before adoption. A JSON reporter or custom reporter is preferable if the workflow needs a long-lived machine contract.

The second example branches on evidence from a trusted mapper. The control path names a committed spec that must remain discoverable.

\`\`\`bash
if (( count > 0 )); then
  corepack pnpm test:e2e -- "\${selection[@]}"
elif [[ "\${EMPTY_SET_REASON:-}" =~ ^(docs_only|no_e2e_dependency)$ ]]; then
  control_log="$(corepack pnpm test:e2e -- --list e2e/blog.e2e.ts)"
  grep -Eq '^Total: [1-9][0-9]* tests?' <<<"$control_log"
  corepack pnpm test:e2e -- "\${selection[@]}" --pass-with-no-tests
else
  echo "Zero tests without an approved mapping reason" >&2
  exit 3
fi
\`\`\`

Replace the illustrative control file with a stable repository-owned spec that exists in every supported checkout. Also export the resolved commits and changed-file manifest as structured job evidence.

Test the wrapper with a grep that matches nothing but no approved reason. It must stop before execution and report a selection error.

Then test a documented docs-only change whose mapper produces the approved reason. The wrapper should prove suite discovery through the control and record the final successful empty result.

The [Playwright CLI skill](/skills/Pramod/playwright-cli) supports interactive browser work, but it does not replace test-runner collection. Use it only to investigate application behavior after a selected committed test exposes a failure.

Playwright pass with no tests should remain visible in CI logs and code review. Hiding it behind an opaque package alias makes accidental expansion difficult to detect.

### A zero-test gate card

Start the card with the job name and the kind of suite it owns. Mark it as fixed or change based before any command runs.

Write the head SHA and base SHA as full values from Git. A branch name alone can move and leave the old result hard to prove.

Save the changed file list before the map or test tool reads it. This list is the root fact for each choice that comes next.

Check that the list has at least one path for a real change job. No diff may mean the wrong base, not a safe empty test set.

Write each map rule that matched and the spec paths it chose. If no rule matched, give one short code from a reviewed set.

Keep the full test args in an array and use that array for both steps. Hand-built strings can split paths or lose a grep mark.

Run the list step first and save its raw exit code at once. A cut off tool must not look like a clean count of zero.

Read one clear total and reject two totals or no total at all. This rule keeps a new report shape from making false proof.

When the count is more than zero, save the test names with the card. The later run must use the same paths, tags, and project set.

When the count is zero, write why that result is safe in this job. Keep the code short, such as \`docs_only\`, and define it in source.

Run one known test list with the same config as a health check. The [config guide](/blog/playwright-test-config-options-complete-reference) helps pick a stable control.

The control should fail when the test tree or config cannot load. It should not share the same change map that may be at fault.

Mark if the checkout is full, sparse, or shallow on the card. Then prove the base commit can be read before changed tests are found.

Save the path to the config and the work dir seen by the tool. A correct file run from the wrong root can still find no tests.

Write the test folder and match rule in a small box near the count. This makes a new suffix or moved folder easy to spot.

Name each selected project and check it exists before the list runs. An empty project set and an empty test set are not the same state.

Keep grep text in its raw form and in a safe shown form. Quotes and shell marks can change what the test tool will match.

Break the grep on purpose in one check and require a red gate. This proves an unknown empty match cannot use the approved path.

Break the base ref in a second check and require a clear Git error. Do not fall back to no diff when the base cannot be found.

Use the [changed-test guide](/blog/ci-detect-tests-affected-by-changed-files) to test the map with known app files. Each key app path should lead to at least one owned spec.

Keep a full suite run on a set clock, such as each night. Compare misses with the [empty-set guide](/blog/empty-related-test-set-release-blocker) and fix the map.

If the map cannot give a sound reason, run the full scope at once. The cost is real, but a weak green gate costs far more.

Write the final state as \`ran_pass\`, \`ran_fail\`, \`safe_empty\`, or \`select_error\`. Do not use one broad word such as success for all four.

Save the run exit code beside that state and not on a far log page. A peer should not need shell rules to infer what took place.

Clean the temp list file after its key facts reach the job report. Keep it only when a fail needs the raw text for review.

Use the [test practices guide](/blog/playwright-testing-best-practices-2026) to keep the control small and stable. A known test should not depend on weak data or a live third party.

Ask one peer to explain why zero was safe from the card alone. If that peer must guess, the gate does not have enough proof.

End with the next full run time and the map owner on two lines. This gives the empty choice a clear backstop and a clear team.

When more than one package changed, show the map result for each path before the final count is made. One docs path must not hide an app path that should bring a test into the set and make the job run.

Keep the safe reason in source with a short note on who may add a new value and what proof they need. A free text reason from a pull request should never grant the empty branch on its own.

At review time, place the last full run result next to the change-based card so missed test links are easy to spot. If the full run finds a fault that the map skipped, mark the map red and fix it before the next release.

Use the same shell, Node release, and locked test tool for the list step and the run step in each job, with each version written on the saved gate card. A tool swap between those steps can change file rules or report text and make the saved count weak proof for the release team.

When a pull request adds its first test for a new app path, add the map rule in the same change and name its test owner for all later work on that path. Run one false case and one true case for that rule so the next empty result rests on code that has shown both sides in the same locked job with the same base and head.

## Frequently Asked Questions

### What is the safest way to use playwright pass with no tests flag?

Place the flag only in a dynamic-selection branch that already recorded an exact zero count, complete changed-file input, approved reason, and positive discovery control. Keep fixed suites fail-closed. Run the same arguments during list and execution stages, and schedule a full suite to detect mapping gaps.

### How do you verify playwright no tests found ci?

Save the resolved configuration, working directory, test directory inventory, project names, filters, Git base and head, list output, and parsed count. Exercise one known match and one intentional nonmatch. Treat missing history, parser errors, absent directories, or an unknown count as selection failures rather than empty success.

### When should a QA team choose allow empty changed test set?

Choose it when a deterministic impact mapper proves that a complete, nonempty change list has no E2E dependency. Require an approved reason code and a known-test control under the same configuration. Do not allow empty for static smoke suites, release regression projects, incomplete checkouts, or unexplained Git comparisons.

### What causes failures in detect broken test filter?

Typical causes are misspelled grep text, positional regular expressions, renamed file suffixes, stale \`testMatch\`, excluded projects, wrong working directories, sparse checkouts, shallow Git history, and incomplete dependency maps. Also test report parsing, because an unreadable total must never be interpreted as a valid zero count.

### Which evidence should empty e2e suite release gate retain?

Retain exact selection arguments, configuration and package digests, runner version, resolved base and head commits, changed files, mapping rules, listed test identities, collected count, empty reason, control result, command exit code, and any full-suite fallback. Keep the status distinct from an execution that ran and passed tests.

### How should CI handle playwright zero tests exit code?

CI should fail zero tests by default, permit only an evidence-backed dynamic empty branch, and fail any unknown collection state. Use \`--list\` before execution, preserve its output, and run a positive control. When mapping or Git data is uncertain, execute the full suite instead of applying the pass flag.

## Conclusion

Playwright pass with no tests is safe only when zero is an expected result produced by a verified selector. Require exact arguments, complete change inputs, a parsed count, approved reason, discovery control, final exit code, and a full-suite fallback before accepting the gate.

Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli), install it, and apply this focused verification workflow. Then browse [verified QA skills](/skills) while keeping every fixed E2E suite fail-closed.`,
};
