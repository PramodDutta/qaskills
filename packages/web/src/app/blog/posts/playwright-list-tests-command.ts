import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright List Tests Command',
  description:
    'playwright list tests command: collect Playwright tests without running them and gate CI. Use repo evidence, failure checks, and CI-safe QA steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'playwright list tests command',
  keywords: [
    'playwright list tests command',
    'playwright test list flag',
    'collect tests without running',
    'playwright test inventory ci',
    'detect zero discovered tests',
    'list tests by project',
    'validate playwright testmatch',
  ],
  relatedSlugs: [
    'playwright-test-config-options-complete-reference',
    'empty-related-test-set-release-blocker',
    'playwright-ci-github-actions-complete-guide-2026',
    'playwright-testing-best-practices-2026',
  ],
  sources: [
    'https://playwright.dev/docs/test-cli',
    'https://playwright.dev/docs/running-tests',
    'https://playwright.dev/docs/test-configuration',
  ],
  repoEvidence: [
    'packages/web/playwright.config.ts',
    'packages/web/e2e/article-factory-2026-07-25.e2e.ts',
  ],
  content: `Playwright list tests command resolves test config and reports discovered tests without launching browsers or executing test bodies. Run it with the same project, file, and grep filters used by CI, then fail when the test list is blank or incomplete. Retain test count, projects, paths, titles, run args, and exit status.

## What Does Playwright List Tests Command Control?

Playwright list tests command controls test load visibility before browser test run begins. It loads the selected test config, resolves projects and file filters, discovers matching tests, and sends that test list through a test report without running test bodies.

The official [Playwright CLI reference](https://playwright.dev/docs/test-cli) defines \`--list\` as collecting and reporting tests without running them. That boundary makes it clear for validating test set before a costly browser job.

Test load proves that tests are in the test list under one run command. It does not prove browsers launch, fixtures complete, checks pass, or the app behaves correctly.

The run command can expose a silent test scope gap early. A changed \`testMatch\`, wrong project, stale path, or narrow grep can produce a blank or incomplete set before CI spends time starting a server.

Playwright list tests command must use the same inputs as the full test run. Listing all projects while the real job runs just Chromium cannot validate that job's exact test set.

Likewise, listing from the local repo root with one config and executing from a package file path with another creates two different inventories. Record current directory and config path in the proof.

The local repo config at \`packages/web/playwright.config.ts\` gives this gate a concrete contract. It selects \`./e2e\`, matches \`.e2e.ts\` files, and defines one project named \`chromium\`.

The local repo test file \`packages/web/e2e/article-factory-2026-07-25.e2e.ts\` supplies in the test list browser and request tests under that contract. Its titles provide real test list entries that a focused check can need.

This workflow does not replace TypeScript loading checks. Test config or imported test code can still fail during collection, and that nonzero result should be reported on its own from a valid blank test list.

It also does not replace the [full Playwright CI run](/blog/playwright-ci-github-actions-complete-guide-2026). After test load passes, the real Playwright job must still run the intended tests with its server, fixtures, browser, and checks.

The [test test config reference](/blog/playwright-test-config-options-complete-reference) explains neighboring test set options. This post turns the resolved list into a small CI gate with explicit expected scope.

The [QASkills directory](/skills) provides reusable browser workflows for next diagnosis. Keep test list validation fast, deterministic, and independent from product status.

## How Does Playwright Test List Flag Work?

Playwright test list flag is the \`--list\` option on \`npx playwright test\`. It follows normal config, project, path, grep, and dependency selection while stopping before test run.

The run command still loads test config and test modules to collect test entries. Syntax errors, invalid imports, duplicate titles under enforced rules, or config failures can therefore make listing exit unsuccessfully.

That is clear proof since a job with uncollectable tests cannot provide test scope. Classify it as collection error rather than saying zero tests were discovered.

Pass \`--project=chromium\` when CI runs that project. Add the same file arguments, grep expressions, config path, and dependency switches used by the test command.

The [Playwright running guide](https://playwright.dev/docs/running-tests) describes project and command selection for normal runs. Test list validation should mirror those choices without adding browser test run.

The [test config guide](https://playwright.dev/docs/test-configuration) explains how projects and top-level options shape the resolved suite. Read the effective config rather than inferring test set from filenames alone.

Playwright list tests command text is designed for people and reporters, so avoid parsing decorative separators as a permanent wire format. Prefer a machine test report or a small custom test report when exact structured records become a release contract.

For a simple shell gate, a project marker and known title can provide a practical check. Store the complete bounded list as proof so a parser change remains diagnosable.

Observation means collecting the text, count, and exit status. Check means the status is zero, count is nonempty, required projects exist, and expected known test files or titles appear.

Do not use \`--pass-with-no-tests\` for this gate. The purpose is to reject a empty test set, while that option on purpose permits one.

Playwright list tests command should compare a small stable baseline instead of one exact total when the suite changes often. Required known test tests plus a minimum count can detect accidental loss without blocking each intended addition.

The [empty test-set release guide](/blog/empty-related-test-set-release-blocker) covers the general release risk. Here, the gate is tied specifically to Playwright's resolved project test list.

## Collect Tests Without Running: Repository Evidence

Collect tests without running proof must start from the real config. The file \`packages/web/playwright.config.ts\` sets \`testDir\` to \`./e2e\` and \`testMatch\` to a regular expression ending in \`.e2e.ts\`.

That means a file named \`example.spec.ts\` under the same file path would not join this local repo's browser test list. Listing can prove the actual pattern rather than relying on a developer's usual Playwright naming convention.

The config sets \`fullyParallel\` and defines one Chromium project based on Desktop Chrome. Listing should show project-qualified records even though no browser process starts.

It also defines a web server run command. The list gate should verify whether collection starts that server under the installed Playwright version and config, then avoid claiming browser test run either way.

The strongest stable check is about resolved tests, not incidental startup lines. Keep list output focused and make unexpected server behavior a separate timing or process check.

The local repo file \`packages/web/e2e/article-factory-2026-07-25.e2e.ts\` imports the article factory batch and declares request-based contract tests in a loop. It also declares a Chromium page test for public navigation.

Since the loop creates one test per post, the exact count depends on the imported batch. A known test title or file path is more stable than copying today's total into a permanent shell constant.

The file checks sitemap publication, post rendering, schema text, sources, and the Playwright skill route. Those titles confirm that listing reaches real local repo test entries rather than a synthetic blank fixture.

Playwright list tests command should need the file path and the Chromium project marker. If either disappears unexpectedly, the config pattern, project test set, or imported test entries may have changed.

The test module imports app data but does not launch a browser during declaration. Listing exercises that import graph enough to expose missing exports or module failures before full test run.

Use the [CI guide](/blog/playwright-ci-github-actions-complete-guide-2026) to place test list before the browser run. A failed test list step should block test run since later results cannot restore tests that were never selected.

Local repo proof has limits. The config and test file prove current test set intent, while official docs define what \`--list\` does; neither proves a future CI wrapper passes identical run args.

Capture the exact wrapper run command in each run. That closes the proof gap between committed Playwright settings and workflow-specific filters.

## When Should QA Teams Use Playwright Test Inventory CI?

QA teams should use Playwright test inventory CI when test config or test set changes can silently reduce test scope. It is especially clear in monorepos, multi-project suites, generated tests, and jobs with path or grep filters.

Run it before browser installation or app startup when test load needs neither resource. Fast rejection saves time and gives a direct message about missing tests.

Use it when renaming test extensions, moving directories, splitting configs, or changing \`testMatch\`. Each change can leave valid files outside the resolved suite.

Use it for each project that represents a required browser or environment. A nonempty global list does not prove that each selected project contributes tests.

Use it before a filtered smoke or release lane. Need known known test titles so a typo in grep cannot turn the lane into a blank success.

Playwright test inventory CI is also helpful for generated test entries. Compare expected source inputs and collected titles so a generation fault cannot remove tests without notice.

Do not use list text as proof of runtime test scope. A declared test may skip dynamically, fail in setup, or never reach its check since the browser cannot start.

Do not need one exact suite count without a maintenance plan. Legitimate additions and removals would create noisy gate changes that encourage careless baseline updates.

A structured reporter or custom collector is better than shell text parsing when test list drives release rule across many projects. Structured fields reduce dependence on display formatting.

A focused CLI run command is better for one developer checking a path. An MCP record may be clear when an agent needs machine-readable test list, but it should preserve the same test set facts.

The [Playwright practices guide](/blog/playwright-testing-best-practices-2026) helps keep tests independent and clearly titled. Those properties make a test list easier to review and compare.

Playwright list tests command should run again after any wrapper changes. A correct direct run command cannot prove that a package script, CI matrix, or shell quoting selects the same set.

## Detect Zero Discovered Tests: Failure Modes and Diagnostics

Detect zero discovered tests by separating three outcomes: successful nonempty test load, successful blank test load, and collection failure. Each outcome needs a distinct message and exit rule.

A successful blank list usually points toward test set. Check current directory, config path, \`testDir\`, \`testMatch\`, project, file arguments, grep, invert filters, and dependency flags.

A collection failure points toward code or test config. Preserve stderr, status, Node version, Playwright version, config path, and the first clear stack section.

An incomplete nonempty list is harder since a simple nonempty-count check passes. Need project names and a few stable known test files or titles for each important lane.

Reproduce the primary risk by changing one filter at a time in a controlled branch or temporary run command. A nonexistent project should fail differently from a grep expression that matches no tests.

Test defects include brittle text parsers, wrong shell quoting, a stale expected title, and a gate that lists different run args than test run. Product failures are not in scope since no test body runs.

Environment limits include missing dependencies, incompatible Node versions, filesystem case differences, and memory pressure during module loading. These can break test load before any browser starts.

Playwright list tests command may load imports with side effects. Test files should avoid network calls or mutable setup at module scope since test load needs test entries, not app test run.

The article factory test imports a batch at module scope and defines tests from it. That is appropriate data-driven declaration, but a broken import should fail test list with a clear code file error.

Do not pipe the run command through \`grep\` without preserving its original exit status. A successful grep over partial text can hide that Playwright itself failed.

Capture text first, store the Playwright status, and just then apply checks. Shell settings such as \`pipefail\` can help, but explicit values make CI logs easier to read.

The [empty test-set release guide](/blog/empty-related-test-set-release-blocker) can supply broader rule for zero test scope. This Playwright gate should still name the exact filter that removed the set.

Detect zero discovered tests before the full run and after project matrix expansion. Matrix interpolation errors can leave one row blank while another row keeps the overall workflow green.

## List Tests By Project: Evidence and CI Assertions

List tests by project and retain collected count, project names, file paths, full titles, selection arguments, config path, working directory, and exit status. These facts let reviewers reproduce the exact test list.

Start with a zero-status check before parsing text. A list truncated by a config error must not be treated as a smaller valid test list.

Then need a nonempty count for each mandatory project. Do not combine all rows into one total since a large Chromium set can hide a blank secondary project.

Need known test paths that represent critical test areas. For this local repo, the article factory E2E path is one real known test tied to publication contracts.

Need one stable title from that file just when title changes are reviewed with the gate. Path checks are often less noisy than exact full titles for broad suites.

Playwright list tests command proof should state each narrowing argument. Include project, file patterns, grep, grep-invert, shard, dependencies, config, and package script expansion.

Store a normalized JSON summary in CI. Keep the raw bounded text as a failure attachment so display format changes can be diagnosed without rerunning the old commit.

Compare test list before and after a test set change. Flag large drops for review, but let an explicit approved baseline change explain expected removals.

Do not call unlisted tests skipped. They never entered the selected test list, so test scope reports should describe them as unselected or undiscovered.

The next test command should consume the same argument array. Building two shell strings independently invites quoting and default differences.

For projects with dependencies, decide whether setup projects belong in the required test list. Use the same \`--no-deps\` rule as test run and state it in the run card.

The config at \`packages/web/playwright.config.ts\` currently defines just Chromium. A future project addition should update both test list expectations and full test run rule in the same review.

Use the [test config reference](/blog/playwright-test-config-options-complete-reference) when projects inherit or override test set. The final proof should show resolved names rather than just source snippets.

## Validate Playwright Testmatch Comparison Table

Validate Playwright testmatch decisions by comparing the list run command, project filters, narrow file or grep test set, and full test run. Each option answers a different test scope question.

| Option or signal | Use when | Expected evidence | Main risk |
|---|---|---|---|
| --list | Inspect resolved test collection without launching browsers | Count, projects, paths, titles, arguments, status, and config | A nonempty partial list is mistaken for complete coverage |
| project filter | Confirm each configured browser or environment contributes tests | Required project, per-project count, sentinel paths, and arguments | One populated project hides another empty project |
| file or grep filter | Audit a narrower selection before using it in CI | Filter text, matched titles, count, shell quoting, and status | A typo silently produces an empty or wrong inventory |
| full execution | Run after collection proves intended tests are discoverable | Browser results, fixtures, artifacts, skips, retries, and final status | Listing is treated as evidence that tests actually passed |

The list option is the fastest test set check. Its gate must cover more than nonempty count when critical files or projects can disappear independently.

Project filtering validates matrix rows and configured environments. Report each row on its own since per-process test set is the unit that next runs.

File and grep filters need careful shell handling. Print normalized run args and test them against known nonempty plus known negative controls.

Full test run remains the product gate. It adds browser startup, fixtures, page actions, checks, retries, and artifacts that listing on purpose omits.

Playwright list tests command belongs before test run, not instead of it. A good test list failure saves resources, while a good test list pass grants permission to start the real job.

The [QASkills blog](/blog) contains adjacent CI and test selection guidance. Keep this matrix near the workflow so each lane states which level of proof it provides.

## How Do You Implement Playwright List Tests Command?

Implement Playwright list tests command by capturing status and text, asserting project-specific sentinels, and passing the same run args to full test run. Use a controlled blank filter to prove the gate fails for missing test scope.

1. Read \`packages/web/playwright.config.ts\` and record its config path, working directory, test directory, testMatch pattern, projects, and required dependency policy.
2. Run \`npx playwright test --list --project=chromium\` with the same file and grep filters planned for CI, capturing stdout, stderr, and Playwright status separately.
3. Assert zero collection status, positive per-project count, and required sentinel paths or titles from \`packages/web/e2e/article-factory-2026-07-25.e2e.ts\`.
4. Repeat with a controlled unmatched grep or path and prove the inventory gate exits nonzero with an explicit empty-selection message.
5. Write a bounded JSON summary containing count, projects, paths, titles, arguments, versions, config, working directory, and raw-output attachment.
6. Reuse the exact argument array for full execution, then verify browser results and artifacts under the normal CI job.

The first code example is the smallest local repo-aligned run command. It uses the configured Chromium project and asks Playwright to collect without running test bodies.

\`\`\`bash
npx playwright test --list --project=chromium
\`\`\`

Run it from \`packages/web\` so the default config and relative \`./e2e\` file path resolve as intended. If CI runs from elsewhere, pass an explicit config path and record that difference.

The second example preserves the Playwright status before checking text. It rejects blank Chromium test list and requires the real article factory test path.

\`\`\`bash
set +e
inventory="$(npx playwright test --list --project=chromium 2>list-tests.stderr)"
status=$?
set -e

printf '%s\\n' "$inventory" > list-tests.stdout
test "$status" -eq 0
test "$(printf '%s\\n' "$inventory" | grep -c '\\[chromium\\]')" -gt 0
printf '%s\\n' "$inventory" |
  grep -F 'e2e/article-factory-2026-07-25.e2e.ts' >/dev/null
\`\`\`

A production gate should print a clear error for each failed check and retain both text files. The compact sample keeps the planned shell check visible without claiming a stable full text grammar.

Add a success control that lists the existing article factory file and sees Chromium entries. Confirm no test body attachment, browser navigation, or app check ran during collection.

Add a controlled failure with a grep expression that matches no title. Your wrapper must return nonzero even if Playwright's selected version reports the blank list without a fatal collection error.

Use the [Playwright CLI skill](/skills/Pramod/playwright-cli) after the test list passes and a real page test fails. Test list diagnosis should not open a browser since its purpose is test set.

Playwright list tests command can next move to a custom test report when shell parsing grows complex. Preserve the same required fields and controlled blank case during that migration.

## Frequently Asked Questions

### What is the safest way to use playwright test list flag?

Run \`--list\` with the exact config, project, paths, grep, and dependency options used by CI. Assert collection status before parsing, then need nonempty per-project counts and stable known test paths. Keep the list gate before, but separate from, full browser test run and its product checks.

### How do you verify collect tests without running?

Use a known test test whose body would create an obvious artifact, then run list mode and confirm the title appears while the artifact does not. Also record that no browser or test fixture result was produced. This proves declaration test load without treating module loading as complete runtime isolation.

### When should a QA team choose playwright test inventory ci?

Choose it when path, project, grep, generated test entries, or config changes can reduce test scope silently. It is valuable before expensive browser startup and across monorepo jobs. Keep full test run afterward since in the test list tests can still skip, fail setup, or break during real browser actions.

### What causes failures in detect zero discovered tests?

Common causes include wrong working directory, config path, testDir, testMatch, project name, file argument, grep, dependency switch, and shell quoting. Collection errors can also come from imports or syntax. Preserve the original status and stderr before labeling the result a blank valid test list.

### Which evidence should list tests by project retain?

Retain per-project count, project names, file paths, full titles, known test matches, all selection arguments, config path, working directory, Node and Playwright versions, raw text, and exit status. Mark absent tests as unselected or undiscovered rather than skipped, since their bodies never entered test run.

### How should CI handle validate playwright testmatch?

CI should compare resolved test list with required projects and known test files before running browsers. It should fail blank and unexpectedly reduced sets, preserve collection errors on its own, and reuse the same run args for test run. Approved testMatch changes must update expectations and explain intended additions or removals.

## Conclusion

Playwright list tests command is a reliable CI gate when it validates the same resolved test set that full test run uses without claiming runtime success. Adoption proof needs status, counts, projects, paths, titles, run args, versions, controlled blank failure, and the full browser job afterward.

Start with Chromium and one real known test file before expanding to each project or filter. Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli), install it, and apply this focused verification workflow to your test list.
`,
};
