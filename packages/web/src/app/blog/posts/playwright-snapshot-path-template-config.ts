import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Snapshot Path Template Config: A Practical Guide',
  description: 'Master Playwright snapshot path template config with token-by-token examples, collision-safe layouts, project separation, and CI migration checks.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Playwright Snapshot Path Template Config: A Practical Guide

Playwright snapshot path template config belongs in \`playwright.config.ts\` as \`snapshotPathTemplate\` when one layout should cover screenshot and value snapshots. Build the path from documented tokens such as \`{testDir}\`, \`{testFilePath}\`, \`{arg}\`, \`{ext}\`, and, when snapshots differ by project, \`{projectName}\`. A safe starting template is \`{testDir}/__snapshots__{/projectName}/{testFilePath}/{arg}{ext}\`.

Choose the template from the repository’s ownership and collision boundaries, not from aesthetics. Preserve the test-file path, keep the assertion argument, and include a project or platform dimension only when the baseline can legitimately differ. The [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) explains where Playwright fits in a wider test stack, while [Playwright locator best practices](/blog/playwright-best-practices-locators-2026) help keep the interactions leading to a visual assertion stable.

## Start with one collision-safe repository layout

Suppose tests live under \`tests/\`, multiple projects may render differently, and reviewers want all baselines collected under one directory. This configuration keeps the test’s relative path and the snapshot argument, preventing two \`checkout.spec.ts\` files in different folders from sharing a baseline.

\`\`\`ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  snapshotPathTemplate: '{testDir}/__snapshots__{/projectName}/{testFilePath}/{arg}{ext}',
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
  ],
});
\`\`\`

The slash before \`{projectName}\` is conditional. Playwright documents that a token can be preceded by one character that appears only when the token has a non-empty value. Therefore \`{/projectName}\` produces \`/chromium\` for a named project and nothing for an unnamed project. This avoids an unwanted empty directory segment without custom JavaScript path logic.

A test can give every important snapshot a deliberate name:

\`\`\`ts
// tests/checkout/summary.spec.ts
import { expect, test } from '@playwright/test';

test('shows the paid order summary', async ({ page }) => {
  await page.setContent(\`
    <main style="font-family: Arial, sans-serif; width: 480px">
      <h1>Order complete</h1>
      <p>Reference QA-1042</p>
      <strong>Total: $42.00</strong>
    </main>
  \`);

  await expect(page.getByRole('main')).toHaveScreenshot('paid-order.png');

  const summary = await page.getByRole('main').innerText();
  expect(summary).toMatchSnapshot('paid-order.txt');
});
\`\`\`

Under the example projects, the image baseline resolves below the chromium or firefox project directory. The text snapshot also receives the project dimension because the global template applies to snapshot assertions generally. If the text is identical across projects, that duplication may be unnecessary. A later section shows assertion-specific templates.

The exact documented behavior and current token list are in the Playwright TestProject API: https://playwright.dev/docs/api/class-testproject#test-project-snapshot-path-template. Forward slashes are accepted as path separators on every platform, and a relative template resolves from the configuration directory.

## Understand every supported token before composing paths

Tokens are substituted from the current project, test file, test title, platform, and assertion argument. Do not invent tokens such as \`{browserName}\`, \`{specName}\`, or \`{os}\`. If you want the browser in the path, name projects meaningfully and use \`{projectName}\`.

| Token | Meaning | Example value |
|---|---|---|
| \`{arg}\` | Relative snapshot path without its extension | \`paid-order\` |
| \`{ext}\` | Snapshot extension including the leading dot | \`.png\` |
| \`{platform}\` | Value of \`process.platform\` | \`linux\` |
| \`{projectName}\` | File-system-sanitized project name, possibly empty | \`chromium\` |
| \`{snapshotDir}\` | Project’s configured snapshot directory | Absolute resolved directory |
| \`{testDir}\` | Project’s configured test directory | Absolute resolved directory |
| \`{testFileDir}\` | Test file’s directories relative to \`testDir\` | \`checkout\` |
| \`{testFileBaseName}\` | Test filename without its last extension | \`summary.spec\` |
| \`{testFileName}\` | Test filename with extension | \`summary.spec.ts\` |
| \`{testFilePath}\` | Test path relative to \`testDir\` | \`checkout/summary.spec.ts\` |
| \`{testName}\` | Sanitized title including parent describes, excluding filename | \`shows-the-paid-order-summary\` |

\`{arg}\` comes from the name passed to \`toHaveScreenshot()\`, \`toMatchSnapshot()\`, or other supported snapshot assertion. When a call has no name, Playwright generates one. Explicit names are easier to review and less sensitive to assertion order. If the assertion receives an array of path segments, the argument contains that relative path without the final extension.

\`{testFilePath}\` already contains the filename and its extension. A template that combines \`{testFilePath}\` and \`{testFileName}\` repeats information. That is valid but noisy. A template using only \`{testFileName}\` discards parent directories and can collide when separate feature folders contain identically named test files.

\`{testName}\` can improve human readability, but it is a sanitized title, not a durable identifier. Renaming a describe block or test title moves every baseline under it. Long parameterized titles can produce unwieldy paths. Prefer explicit snapshot arguments for stable artifact names and use the test name only when the tradeoff is intentional.

## Predict the path expansion on paper

Before changing a repository, expand the template for representative files and projects. This catches duplicate segments, missing collision dimensions, and unintended absolute paths without generating hundreds of baselines.

Assume this input:

| Input | Value |
|---|---|
| Config directory | \`/repo/e2e\` |
| \`testDir\` | \`/repo/e2e/tests\` |
| Test file | \`/repo/e2e/tests/checkout/summary.spec.ts\` |
| Project name | \`chromium\` |
| Snapshot argument | \`paid-order.png\` |
| Platform | \`linux\` |

The template \`{testDir}/__snapshots__{/projectName}/{testFilePath}/{arg}{ext}\` expands conceptually to:

\`\`\`text
/repo/e2e/tests/__snapshots__/chromium/checkout/summary.spec.ts/paid-order.png
\`\`\`

The relative template \`__snapshots__{/projectName}/{testFilePath}/{arg}{ext}\` instead begins at the config directory:

\`\`\`text
/repo/e2e/__snapshots__/chromium/checkout/summary.spec.ts/paid-order.png
\`\`\`

That difference affects repository layout. Using \`{testDir}\` puts baselines under the configured test directory. Using a relative literal can put them beside it. Neither is universally correct. Choose based on version-control ownership, package boundaries, and tooling expectations.

What people get wrong is assuming \`snapshotDir\` automatically remains the storage root after an unrelated custom template is added. A custom template defines the resulting path. Include \`{snapshotDir}\` when that configured directory is meant to be part of the layout, or use \`{testDir}\` or a config-relative literal deliberately.

## Choose between global and assertion-specific templates

The global \`snapshotPathTemplate\` can govern screenshot, ARIA, and value snapshot paths. Playwright also supports assertion-specific \`pathTemplate\` settings under \`expect\`. Use those when artifacts have different sharing rules.

Screenshots commonly vary by rendering project. Text snapshots may be portable across browsers. ARIA snapshots are often reviewed as text and may not need a browser dimension, depending on the tested behavior. This config separates them:

\`\`\`ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  snapshotPathTemplate: '{testDir}/__snapshots__{/projectName}/{testFilePath}/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      pathTemplate: '{testDir}/__screenshots__{/projectName}/{testFilePath}/{arg}{ext}',
    },
    toMatchAriaSnapshot: {
      pathTemplate: '{testDir}/__aria__/{testFilePath}/{arg}{ext}',
    },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
  ],
});
\`\`\`

The screenshot-specific template overrides the global location for \`toHaveScreenshot\`. The ARIA-specific template does the same for ARIA snapshots. Value snapshots still use the global template. Confirm the available assertion-specific options against the installed Playwright documentation because matcher configuration evolves.

| Requirement | Template dimension | Reason |
|---|---|---|
| Browser rendering differs | \`{projectName}\` for screenshots | Prevent legitimate cross-browser pixel collisions |
| OS font rendering differs | \`{platform}\` or OS-specific project | Separate approved platform baselines |
| Text value is portable | Omit project dimension | Avoid identical copies |
| Same filenames exist in feature folders | \`{testFilePath}\` or \`{testFileDir}\` | Preserve source namespace |
| Snapshot names repeat within a file | Unique \`{arg}\` or \`{testName}\` plus arg | Prevent overwrites |
| Monorepo packages own baselines | Package-local config-relative root | Keep review ownership local |

Do not separate baselines by project simply to make collisions disappear. First decide whether the output is supposed to differ. If all named projects should share a text contract, duplicated files can drift because one project update does not necessarily review the others meaningfully.

## Design project names as artifact namespaces

\`{projectName}\` uses the project’s file-system-sanitized name. Good project names communicate the baseline variant, such as \`chromium-desktop\` and \`webkit-mobile\`. A vague name such as \`default\` provides little value in a diff.

This configuration creates clear visual namespaces while keeping test selection in Playwright’s normal project model:

\`\`\`ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
});
\`\`\`

The device descriptors shown are documented Playwright devices, but the exact browser binaries and device catalog come from the installed Playwright package. Commit the package lock so baseline generation and CI use the reviewed dependency state.

If a project can be unnamed, use \`{/projectName}\` rather than a mandatory \`/{projectName}\` segment. If every project is named by policy, a mandatory segment makes violations obvious. Either way, do not add both project name and browser name through undocumented placeholders.

Platform is a separate decision. Screenshot rendering can vary across operating systems because fonts, graphics, and browser builds differ. The visual comparison documentation advises generating and comparing in a consistent environment: https://playwright.dev/docs/test-snapshots. Many teams standardize baseline generation in one container or CI image instead of committing a baseline per developer OS. If multiple platforms are intentionally supported, include \`{platform}\` or model platforms as named projects and review the multiplied baseline set.

## Keep snapshot arguments stable and meaningful

An explicit argument is part of the path contract. Name the component or state being asserted, not the test implementation step. \`cart-empty.png\` and \`cart-with-discount.png\` survive a title rewrite better than \`screenshot-1.png\`.

Playwright permits an array of path segments for screenshot names, provided the resulting relative path stays within the snapshot area for the test file. This is useful for component and state grouping:

\`\`\`ts
import { expect, test } from '@playwright/test';

test('renders account states', async ({ page }) => {
  await page.setContent('<main><h1>Account</h1><p>Status: Active</p></main>');

  await expect(page.getByRole('main')).toHaveScreenshot([
    'account',
    'active.png',
  ]);
});
\`\`\`

Do not build names from current timestamps, random IDs, worker indices, or CI run numbers. Those produce a new expected file every run. Normalize application data before the assertion, seed deterministic fixtures, and mask or style dynamic elements with supported screenshot options when appropriate.

Auto-generated names are convenient for exploration but can shift when assertions are inserted or reordered. For long-lived baselines, explicit names make code review and migrations safer. Add a review rule that two assertions in the same file cannot resolve to the same intended artifact.

## Avoid collisions in parameterized and repeated tests

Parameterized tests often share source file and snapshot argument. If several cases call \`toHaveScreenshot('card.png')\`, the resulting paths can collide unless the test name contributes a dimension or the argument includes the case identity.

Prefer a sanitized, controlled case slug in the explicit argument:

\`\`\`ts
import { expect, test } from '@playwright/test';

const cases = [
  { slug: 'starter', label: 'Starter', price: '$9' },
  { slug: 'team', label: 'Team', price: '$29' },
] as const;

for (const testCase of cases) {
  test('renders ' + testCase.label + ' pricing card', async ({ page }) => {
    await page.setContent(
      '<article><h2>' + testCase.label + '</h2><p>' + testCase.price + '</p></article>',
    );

    await expect(page.getByRole('article')).toHaveScreenshot(
      'pricing-' + testCase.slug + '.png',
    );
  });
}
\`\`\`

The slug list is controlled source data, not arbitrary user input. This keeps paths portable and understandable. If case IDs come from external fixtures, validate them before using them in filenames. Avoid slashes, parent-directory segments, control characters, and values that differ only by case on case-insensitive file systems.

| Collision source | Fragile template or name | Safer correction |
|---|---|---|
| Same spec filename in two folders | \`{testFileName}/{arg}{ext}\` | Preserve \`{testFilePath}\` |
| Two projects, one screenshot | No project dimension | Add \`{projectName}\` if output may differ |
| Parameterized cases | Every case uses \`card.png\` | Put controlled case slug in \`{arg}\` |
| Multiple unnamed assertions | Generated ordinal names | Supply explicit arguments |
| Case-only filename differences | \`Home.png\` and \`home.png\` | Adopt lowercase canonical slugs |
| Title-based directories | Full \`{testName}\` only | Retain file path and explicit arg |

## Migrate an existing snapshot tree without losing review history

Changing \`snapshotPathTemplate\` changes where Playwright looks for expected files. If the new path is empty, tests can report missing snapshots even though valid baselines remain in the old location. Plan the move as a reviewable migration.

First inventory current snapshot directories and duplicate filenames:

\`\`\`bash
find tests -type d -name '*-snapshots' -print
find tests -type f \\( -name '*.png' -o -name '*.webp' -o -name '*.txt' -o -name '*.aria.yml' \\) -print
\`\`\`

Then add the new config on a branch and run a narrow representative test with snapshot updates. Playwright documents \`--update-snapshots\` for creating or refreshing expected snapshots.

\`\`\`bash
npx playwright test tests/checkout/summary.spec.ts --project=chromium --update-snapshots
git status --short
git diff --stat
\`\`\`

Review whether the new files map one-to-one to old baselines. Compare image content with a trusted binary or image comparison workflow, not a text diff. Use version-control moves when the bytes are unchanged so history remains easier to follow. Do not delete old baselines until every active project resolves the intended new path and CI has executed from a clean checkout.

For a large repository, migrate one package or feature group at a time if configs permit it. A single huge snapshot move can hide unintended visual changes among thousands of renamed files. Freeze unrelated baseline updates during the migration window.

## Verify the config from a clean checkout

A path template can pass locally because stale expected files exist in multiple directories. CI should validate from a clean workspace with only tracked files. Run a representative test without update mode, then inspect that no snapshots were generated or modified.

A portable shell check uses Git after the test:

\`\`\`bash
npx playwright test tests/checkout/summary.spec.ts --project=chromium

if test -n "$(git status --porcelain --untracked-files=all)"; then
  git status --short
  exit 1
fi
\`\`\`

This assumes the job begins with a clean checkout and the test does not intentionally generate other tracked artifacts. If reports and traces are expected, route them to ignored CI artifact directories or narrow the cleanliness check to snapshot roots.

Also run on the same operating system, browser installation, fonts, locale, timezone, and rendering dependencies used to approve baselines. A perfect path template does not make screenshots deterministic. Freeze time where the UI shows clocks, seed data, wait for web fonts, disable application animations where appropriate, and assert the UI has reached a stable state before capture.

## Diagnose “snapshot does not exist” after a config change

Consider a realistic failure: the repository contains \`tests/__snapshots__/chromium/checkout/summary.spec.ts/paid-order.png\`, but Playwright says the snapshot is missing. The test passes on one laptop and fails in CI.

Start with the effective inputs, not with copying the file. Confirm which config file Playwright loaded, the resolved \`testDir\`, the project name, source test path, assertion argument, and CI platform. Check whether the test is actually running under an unnamed project, whether a package-level config changes the config directory, or whether a case-only path difference works on one file system but not another.

| Observation | Probable cause | Next action |
|---|---|---|
| Extra empty directory appears locally | Mandatory separator before empty project token | Use conditional \`{/projectName}\` |
| CI expects a different root | Relative template resolved from another config | Confirm active config and use intentional root token |
| Firefox looks under chromium path | Hard-coded literal project directory | Use \`{projectName}\` |
| Two feature tests share one file | Filename token dropped parent directories | Use \`{testFilePath}\` or \`{testFileDir}\` |
| Every baseline renamed after title edit | \`{testName}\` dominates path | Prefer stable explicit arguments |
| Local passes, Linux CI misses case | Case-insensitive local file system | Normalize names and fix tracked casing |

Generate one baseline on a disposable branch to reveal the path Playwright currently chooses, then compare it with the tracked tree. Do not commit the generated file until the configuration is understood. The missing file can be a useful diagnostic showing the exact expansion.

Another failure mode is a collision that does not report missing data. Two tests resolve to the same path, and update mode lets the last writer replace the file. Symptoms include a baseline flipping between two images or passing only when tests run serially. Search for duplicate explicit arguments within a source file, preserve feature directories, and keep project variants separate. Parallelism exposes the race; it does not cause the naming defect.

## Review AI-generated Playwright config with concrete invariants

AI coding agents can propose templates quickly, but they often guess plausible token names or overlook existing snapshot ownership. Give the agent the current config, test tree, project list, and desired example expansions. Require it to use only documented tokens and to show paths for at least two source folders, one named project, one unnamed project if supported, and a parameterized snapshot.

Review generated changes against these invariants:

- No two active tests are expected to write the same baseline.
- Portable text snapshots are not multiplied without a stated reason.
- Visual variants have an explicit project or platform dimension.
- Relative roots resolve inside the intended package.
- Snapshot arguments cannot contain uncontrolled path data.
- A clean non-update run leaves the tracked tree unchanged.
- Update mode is never the default CI behavior.

If the agent changes both selectors and baselines in one patch, split the work. Locator instability can create apparent visual churn, while a path migration creates file churn. Reviewing one causal change at a time makes snapshot diffs meaningful.

## Use a decision sequence instead of copying a template blindly

Start by asking whether snapshots should live beside each test or in a central reviewed tree. Next preserve the source-file namespace with \`{testFilePath}\` or an equivalent combination. Decide whether the artifact can differ by Playwright project or platform. Retain \`{arg}{ext}\` so assertion names and formats remain visible. Finally, expand representative paths and run from a clean checkout.

For many repositories, these patterns are useful starting points:

| Repository goal | Starting template |
|---|---|
| Central project-specific baselines under tests | \`{testDir}/__snapshots__{/projectName}/{testFilePath}/{arg}{ext}\` |
| Config-level baseline directory | \`__snapshots__{/projectName}/{testFilePath}/{arg}{ext}\` |
| Configured snapshot root | \`{snapshotDir}{/projectName}/{testFilePath}/{arg}{ext}\` |
| Screenshot tree separated by platform | \`{testDir}/__screenshots__/{platform}/{projectName}/{testFilePath}/{arg}{ext}\` |
| Source folder plus compact filename | \`{testDir}/__snapshots__/{testFileDir}/{testFileBaseName}/{arg}{ext}\` |

These are starting points, not promises that every repository should adopt them. The correct config is the smallest one that preserves ownership and every legitimate rendering dimension without duplicating identical expectations.

## Handle monorepos and multiple Playwright configs deliberately

Monorepos often have one Playwright config per package, and each relative template resolves from its own config directory. That can be desirable because baselines stay beside the package that owns them. It can also surprise a central CI job that assumes one repository-level \`__snapshots__\` directory. Inventory every active config and expand the same relative template from each location before standardizing it.

If packages have separate \`testDir\` values, \`{testFilePath}\` is relative within each project and does not include the package name. This is safe when each template root is package-local. If several configs intentionally write into one shared absolute root, include a package namespace through the literal part of each config. Do not expect a token to infer workspace ownership, and do not let two package configs generate into the same path concurrently without a proven namespace boundary.

Repository tools must follow the chosen topology. Snapshot cleanup scripts should load or mirror all active roots, code owners should cover the generated directories, and CI artifact rules should not mistake committed baselines for disposable test output. A central visual-review workflow may benefit from one root, while package-local ownership may make dependency updates and history easier to review. The template should support the human review path.

Also consider config selection during command execution. Running Playwright from the repository root does not by itself guarantee the intended package config is active. Use the repository’s documented scripts or Playwright’s supported config selection, then record the command in CI. A missing snapshot under the wrong root is often a config-discovery issue rather than token substitution.

During migration, test two packages that contain the same source-relative filename and snapshot argument. Generate on a disposable branch, confirm the paths remain distinct, then run both packages in parallel from a clean checkout. This small collision test catches the most damaging shared-root mistake before the entire monorepo produces or overwrites baselines.

## Frequently Asked Questions

### Which tokens should I include in a Playwright snapshot path template?

A strong default includes a stable root, \`{testFilePath}\`, \`{arg}\`, and \`{ext}\`. Add \`{projectName}\` when the expected output legitimately differs across named projects, and \`{platform}\` only when you intentionally maintain operating-system-specific baselines. Use the conditional form \`{/projectName}\` if unnamed projects are allowed. Avoid adding every token, because duplicated filename and title information makes paths long and migrations noisy. Expand the template for representative tests before adopting it repository-wide.

### What is the difference between snapshotDir and snapshotPathTemplate?

\`snapshotDir\` defines the project’s snapshot directory value, while \`snapshotPathTemplate\` defines the complete template used to resolve snapshot paths. The template can include \`{snapshotDir}\`, \`{testDir}\`, or a config-relative literal root. Once you customize the template, do not assume the snapshot directory will be used unless the template includes it or the selected pattern otherwise resolves there. Verify the effective config and generate one disposable baseline to observe the actual path before moving the repository’s existing snapshots.

### Why should projectName sometimes be omitted from text snapshots?

Browser projects often need different screenshot baselines because rendering engines, devices, or viewports differ. A serialized value or portable text contract may be identical across projects. Including \`{projectName}\` for that value creates duplicate expected files that can drift and increases review work. Use assertion-specific path templates when screenshot and text-sharing rules differ. Keep the project dimension when the text actually depends on the project, such as browser-specific accessibility output you intentionally validate. The decision should follow the expected contract, not a desire for symmetrical directories.

### How do I migrate snapshot paths without accidentally approving visual changes?

Inventory existing files, change the template on a focused branch, and generate a narrow representative set in update mode. Map new paths to old baselines and compare their bytes or images before using version-control moves. Keep unrelated UI changes out of the migration. Then run every active project from a clean checkout without update mode and confirm the repository remains unchanged. Only remove old directories after CI resolves the new paths. For a large suite, migrate feature groups incrementally so reviewers can distinguish path moves from genuine baseline changes.
`,
};
