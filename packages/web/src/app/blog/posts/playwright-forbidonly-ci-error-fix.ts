import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright “forbidOnly” CI Error Fix',
  description:
    'Fix the Playwright forbidOnly CI error by locating focused tests, checking generated suites, and adding reliable local and CI prevention controls.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Playwright “forbidOnly” CI Error Fix

The suite collected successfully, but Playwright stopped before running the focused test. Its message names \`forbidOnly\` because CI is configured to reject \`test.only\` and \`describe.only\`. That stop is a safety control: a green build based on one selected scenario would be much worse than an immediate red build.

Removing the first visible \`.only\` often fixes the incident, but not always. Focus can be nested, generated, imported from another directory, or hidden behind a wrapper. The reliable fix is to establish what Playwright actually collected, remove the focus marker at its source, and make the same validation easy to run before a commit reaches CI.

## Why forbidOnly aborts during test discovery

Playwright Test registers tests while loading test files. A focused declaration changes which registered tests are eligible to run. With \`forbidOnly: true\`, discovery treats that declaration as an error instead of honoring it. No assertion failure is involved, and retries cannot help.

| Declaration in collected code | Effect without the guard | Result with \`forbidOnly: true\` |
| --- | --- | --- |
| \`test.only('name', fn)\` | Runs that focused test and excludes ordinary peers | Discovery reports an error |
| \`test.describe.only('group', fn)\` | Focuses tests registered inside the suite | Discovery reports an error |
| Multiple focused declarations | Runs the union of focused tests | Every focus marker remains invalid |
| \`test.skip\` or \`test.fixme\` | Deliberately does not run the marked test | Allowed, because neither focuses the run |

The typical configuration enables the guard only when the CI environment variable is present:

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
});
\`\`\`

That is a sensible developer experience. Local focus remains available for fast iteration, while the authoritative pipeline refuses an incomplete run. For the surrounding configuration surface, including projects, reporters, timeouts, and web servers, consult the [Playwright test config reference](/blog/playwright-test-config-options-complete-reference).

Do not set \`forbidOnly: false\` in CI to get an urgent build through. That converts a useful failure into an incomplete test signal. The code change should remove accidental focus or deliberately redesign how a subset is selected.

## Find the declaration that Playwright collected

Start with a repository search, but search the directories named by the active configuration rather than assuming every test lives under \`tests/\`.

\`\`\`bash
rg --line-number --glob '*.{ts,tsx,js,jsx,mjs,cjs}' \
  '(test|it|describe)\.only\s*\(' .
\`\`\`

The expression finds common forms while avoiding a flood of ordinary uses of the word "only." Review every match. A focused suite in a helper imported by multiple projects may appear once in source but fail several project collections.

If the search has no result, ask Playwright to list what it sees using the same config and environment as CI:

\`\`\`bash
CI=true npx playwright test --list --config=playwright.config.ts
\`\`\`

\`--list\` performs collection without executing test bodies. It is useful for config diagnosis, although a forbidden focus marker can still make collection fail. The error location, stack, or preceding output often points to the loaded file. Preserve the actual CI working directory and config argument, because running from a package root may select a different default configuration.

Generated JavaScript is a common source of confusion. A TypeScript source file may be clean while an old \`dist/tests/example.spec.js\` still contains \`.only\` and matches \`testMatch\`. Inspect the effective \`testDir\`, \`testMatch\`, and \`testIgnore\`, then search generated locations. The correct remedy is usually to stop collecting build output, not to hand-edit it.

Also check less obvious syntax:

- an imported alias such as \`import { test as scenario } ...\` followed by \`scenario.only\`;
- a project-specific test factory that exposes its own \`only\` property;
- JavaScript emitted by a code generator during a setup step;
- package fixtures copied into the job after checkout;
- a dependency or shared workspace that is inside an overly broad \`testDir\`.

The error is about collected runtime declarations, so a simple text search is evidence, not a complete parser.

## Read the CI job before changing the test

An engineer may reproduce locally with \`npx playwright test\` and see the entire suite run. That does not disprove the CI failure. Compare the two invocations line by line.

| Difference | How it changes diagnosis | Correct check |
| --- | --- | --- |
| \`CI\` missing locally | \`forbidOnly\` may evaluate to false | Prefix the local command with \`CI=true\` |
| Different current directory | Another config or test tree can be selected | Run from the job's working directory |
| Explicit \`--config\` in pipeline | Local default may not match | Copy the exact argument |
| Build before test | Emitted specs may join discovery | Inspect artifacts after the build step |
| Matrix project filter | Only one browser or package exposes the file | Reproduce the same \`--project\` or workspace |
| Cached workspace | Stale generated tests can survive | Inspect restored paths and invalidate the faulty cache |

Environment-driven configuration deserves particular care. \`Boolean(process.env.CI)\` treats any non-empty value, including the string \`'false'\`, as true. That behavior is fine for providers that set \`CI=true\`, but it surprises local scripts that export \`CI=false\`. If your team needs explicit parsing, compare against \`'true'\` and document it.

The [Playwright GitHub Actions guide](/blog/playwright-github-actions-guide-2026) is useful when the failing job installs browsers, shards tests, and uploads reports. A forbid-only incident itself is provider-independent, but reproduction depends on matching the provider's checkout, build, and command sequence.

## Remove focus without losing the developer's intent

The smallest repair changes \`test.only\` to \`test\` or \`test.describe.only\` to \`test.describe\`. Run collection again, then run the relevant project. Do not automatically replace it with \`test.skip\`; that silences the scenario instead of restoring it to the suite.

Sometimes \`.only\` was being abused as a permanent suite selector. Replace that design with a supported selection mechanism:

- use \`--grep\` with a stable tag when a workflow intentionally runs a category;
- use Playwright projects when setup, browser, device, or environment defines the subset;
- use separate config files when suites have truly different ownership or infrastructure;
- use a specific test file argument for a diagnostic command, not for the required merge gate.

For example, a smoke pipeline can tag titles or details and select them explicitly rather than commit focus:

\`\`\`ts
import { expect, test } from '@playwright/test';

test('buyer can submit a paid order @smoke', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
});

test('buyer can apply store credit', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Apply store credit' }).click();
  await expect(page.getByTestId('amount-due')).toHaveText('$0.00');
});
\`\`\`

The intentional command is then \`npx playwright test --grep @smoke\`. Keep a separate full-suite job if the merge policy requires complete coverage. A named subset is observable in job configuration; a committed \`.only\` is an invisible override embedded in test code.

## When the error points into a fixture or helper

Playwright fixtures may register tests as modules load, especially in custom DSLs. A helper intended to define a shared conformance suite might call \`test.describe.only\` internally. Every consumer inherits the focus even though no spec file contains the literal expression.

Trace the import chain from the file named during discovery. Search for the exported factory, then inspect how it receives or constructs the \`test\` object. Avoid dynamic focus switches such as this:

\`\`\`ts
// Fragile: an environment variable silently changes suite selection.
const selected = process.env.FOCUS_PAYMENTS ? test.only : test;

selected('settles a captured payment', async ({ page }) => {
  // ...
});
\`\`\`

Use grep, projects, or a documented skip condition instead. Focus should be a short-lived local editing aid, not environment-controlled test architecture.

If a third-party helper genuinely registers focused tests, pin or update it and exclude its example suite from collection. Do not monkey-patch Playwright's \`test.only\` to a no-op. Such a patch hides the exact category of failure that \`forbidOnly\` exists to reveal.

Source maps can make stack locations look unfamiliar when code was transpiled. Confirm whether the path is source or output, and inspect both. If CI archives the Playwright report, its errors section may preserve a clearer source location than the abbreviated job log.

## Preventing focused tests at three checkpoints

\`forbidOnly\` is the final authority because it understands the declarations Playwright actually registers. Earlier checks should shorten feedback, not replace it.

First, enable an editor or lint rule that flags focused tests. ESLint ecosystems provide rules for disabled or focused tests, but select the plugin and rule that understands your test syntax and aliases. Verify it on a deliberately focused sample before trusting it.

Second, add a fast staged-file or pre-push scan if your team accepts local hooks. Hooks are bypassable and differ across developer machines, so their message should point to the exact file and remediation. They are convenience controls.

Third, keep \`forbidOnly: true\` in every required CI configuration. A monorepo with several Playwright configs can accidentally protect the web package while leaving an admin package unguarded. A configuration unit test can import each config and assert the policy, provided environment evaluation is controlled.

A small Playwright config test might look like this:

\`\`\`ts
import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

test('CI configuration forbids focused Playwright tests', async () => {
  vi.stubEnv('CI', 'true');
  const { default: config } = await import('../playwright.config');
  expect(config.forbidOnly).toBe(true);
});
\`\`\`

This checks policy wiring, not Playwright discovery. Retain a real collection command in CI.

## Handling an urgent pipeline failure safely

Treat the incident like a scope-integrity failure. Identify the commit, remove focus, run \`CI=true npx playwright test --list\`, and execute at least the affected project. If the focused declaration masked many tests, review the previous build's test count. A prior green run may have been incomplete if a different config did not enable the guard.

Do not approve a blanket ignore because "the selected test passed." The missing tests are the risk. If business pressure requires a reduced suite, express that reduction in the CI command, record it visibly, and schedule restoration. This is a release decision, not a syntax workaround.

On a large suite, compare reporter totals with a baseline range. Counts naturally change, so avoid a brittle assertion that every run has exactly N tests. A sudden collapse from thousands to one is valuable telemetry even before \`forbidOnly\` fires.

If the build comes from an untrusted pull request, remember that contributors can modify the config too. Repository rules should require review for test configuration and workflow changes. The guard is code in the same change set, not an external security boundary.

## Cases that resemble forbidOnly but are different

A grep-selected command can intentionally run one test without any \`.only\`; \`forbidOnly\` will not object. Likewise, project dependencies, sharding, file arguments, and \`testIgnore\` can reduce the collected set. Diagnose low test counts separately.

\`test.skip\` and \`test.fixme\` do not trigger this error, although excessive skips deserve their own governance. A serial suite, retries, or fail-fast settings also do not create focused declarations. Read the exact error rather than changing every selection-related option.

The distinction between \`test.only\` and a debugger breakpoint is equally important. A breakpoint pauses a worker but does not alter collection. Removing breakpoints will not repair a forbid-only failure.

Finally, a shell command that literally searches for \`.only\` may match documentation, snapshots, and this article. Restrict prevention scans to executable test sources or use an AST-aware lint rule. False positives teach developers to ignore the control.

## Test the guard itself with a disposable focused spec

Configuration checks can say \`forbidOnly: true\`, yet a job may invoke another config. A small pipeline self-test proves end-to-end enforcement. Create a focused spec in a temporary directory during the job, run Playwright against a tiny dedicated config that includes it, and assert the command fails. Remove the temporary directory afterward. Do not commit a permanently focused file to the normal test tree, because editors and local commands will keep tripping over it.

This kind of policy test belongs in workflow validation, not every application pull request if its process startup is costly. It is especially useful after reorganizing monorepo commands or extracting shared configurations. The expected signal is a non-zero exit caused by the focused declaration, not an unrelated missing browser or web-server failure. Use a test body that requires no page fixture so discovery reaches the intended guard before browser launch.

If shell scripting around an expected failure becomes unclear, write a small Node script that spawns the exact command, captures status and output, and fails unless the output mentions the focused test. Keep it provider-neutral so developers can reproduce it locally with \`CI=true\`.

## Review test-selection changes as production controls

A removed \`.only\` repairs the immediate build, but selection can still be narrowed elsewhere in the same commit. Review changes to \`testDir\`, \`testMatch\`, project dependencies, \`grep\`, workflow file arguments, and package scripts. An engineer could remove the marker while leaving CI configured to run only that file.

Reporters provide a second line of evidence. Store the number of collected, passed, skipped, and failed tests by project. Alert on large unexplained discontinuities rather than enforcing one frozen count. A new project may legitimately double the total; a typo in \`testMatch\` may reduce it to zero while the command exits successfully depending on \`passWithNoTests\` policy.

Protect the config and CI workflow through code ownership when suite completeness is release-critical. That does not imply every change is suspicious. It ensures someone familiar with selection semantics reviews a control that determines what "green" means.

## Focus locally without leaving a marker behind

Developers need fast feedback. File arguments, line filters supported by the runner, tags, and editor integrations can run a narrow case without editing source. These mechanisms leave less residue than \`.only\`, although command history and IDE launch settings must not leak into required CI jobs.

When using \`.only\` locally, remove it before staging and inspect the diff rather than trusting memory. A pre-commit scan can help, but pairing it with editor diagnostics gives feedback at the moment focus is added. Teams should make the safe action easy, not shame a workflow that Playwright intentionally supports for local iteration.

If a test is genuinely unstable and must not gate a release, quarantine it through an explicit, reviewed mechanism with ownership and an expiry. \`test.only\` is not quarantine because it excludes healthy coverage. \`test.skip\` without tracking is not a durable quarantine process either.

One more prevention check belongs in pull-request review: inspect deleted tests as well as added focus markers. A commit can satisfy the guard by removing the only focused spec while also removing valuable coverage. The desired state is an unfocused, complete suite, not merely a source tree that contains no forbidden token. Run the affected project and compare its collected cases before declaring the repair finished.

## Frequently Asked Questions

### Why does test.only work locally but fail in CI?

Most configurations set \`forbidOnly\` from the \`CI\` environment variable. Local runs leave the guard off so developers can focus during iteration; the pipeline enables it to protect suite completeness.

### Can I override forbidOnly from the Playwright command line?

The productive fix is to remove the focus declaration or use an explicit supported selector such as \`--grep\`. Weakening the required CI configuration defeats the policy and can produce a misleading green result.

### Why does ripgrep find nothing when Playwright still reports focus?

The declaration may use an alias, live in generated JavaScript, come from an imported suite factory, or be restored from a cached workspace. Inspect effective discovery paths and reproduce the exact post-build CI command.

### Should a smoke suite use describe.only permanently?

No. Give smoke tests a stable tag, file layout, or project and select that subset in job configuration. Permanent focus is easy to leak into full-suite runs and is deliberately blocked by the guard.

### Does forbidOnly detect skipped tests?

No. Skipping and focusing have different semantics. Govern \`skip\` and \`fixme\` through review, linting, or reporting while retaining \`forbidOnly\` for accidental focus.
`,
};
