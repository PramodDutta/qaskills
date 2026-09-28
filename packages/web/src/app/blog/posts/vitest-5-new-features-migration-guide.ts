import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest 5 Migration Guide: Breaking Changes and New Features',
  description: 'Vitest 5 migration guide for QA teams: breaking changes, Node 22 readiness, CI reporter paths, mocking updates, and safer agent-led upgrades.',
  date: '2026-09-28',
  category: 'Migration',
  content: `
# Vitest 5 Migration Guide: Breaking Changes and New Features

Vitest 5 is an active current major release, not a rename, acquisition, or discontinued project. The official 5.0 announcement shipped on September 3, 2026, and the npm package page I verified shows \`5.0.2\` as the current published version. The practical upgrade headline is simple: Vitest 5 requires Node.js \`>=22.12.0\` and Vite \`>=6.4.0\`, then tightens several behaviors that used to let weak tests pass.

For QA engineers, the release is less about a single new syntax feature and more about stricter feedback loops. Mocks are cleared before every test by default. Async assertions that are not awaited now fail. Browser locators match text exactly by default. Reporter files moved under \`.vitest\`. Inline projects inherit root config by default. These changes are good for reliability, but they can surprise teams that run mixed unit, browser, benchmark, and CI-sharded suites.

If you are using Claude Code, Cursor, Copilot, or another AI coding agent, treat this as a migration with a harness, not a dependency bump. Agents are excellent at broad mechanical edits, but Vitest 5 changes runtime contracts, output locations, and filtering semantics. Give the agent a checklist, run the suite with stable reporters, and review any test that changes from "passing" to "properly failing."

## Verified Vitest 5 Status

The official sources confirm that Vitest is still maintained by the Vitest project and published through the same \`vitest\` npm package. There is no product rename to account for. The package remains documented at vitest.dev, with source and releases in the vitest-dev/vitest GitHub repository.

| Item | Verified state on 2026-09-28 | Migration impact |
| --- | --- | --- |
| Current npm package | \`vitest@5.0.2\` | Prefer \`5.0.2\` or a lockfile-resolved \`^5.0.2\` while stabilizing CI. |
| Initial stable 5.0 release | \`5.0.0\`, released September 3, 2026 | Attribute breaking changes to 5.0.0 only when release notes or the migration guide list them. |
| Runtime floor | Node.js \`>=22.12.0\` | CI images, local Volta/asdf configs, Docker base images, and hosted runners need review. |
| Vite floor | Vite \`>=6.4.0\` | Framework adapters that pin older Vite versions may block the upgrade. |
| Artifact root | \`.vitest\` | Add one gitignore entry and update CI upload paths. |
| Browser provider status | \`@vitest/browser-webdriverio\` moved to community maintenance | WebdriverIO browser projects need an explicit dependency decision. |

The official install command is still straightforward:

\`\`\`bash
npm install -D vitest
pnpm add -D vitest
yarn add -D vitest vite
bun add -D vitest
\`\`\`

For a controlled migration, I prefer an explicit version in the first pull request:

\`\`\`json
{
  "devDependencies": {
    "vite": "^6.4.0",
    "vitest": "5.0.2"
  },
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ci": "vitest run --reporter=github-actions --reporter=junit"
  }
}
\`\`\`

The exact Vite version can be higher if your framework supports it. The important point is that Vite \`6.4.0\` is the floor. Do not let an AI agent change only \`vitest\` and leave a locked transitive Vite version under the minimum.

## Preflight Audit Before Editing Tests

The cleanest Vitest 5 migration starts with a read-only audit. You want to know which failures will be caused by runtime incompatibility, which failures will be caused by intentional stricter semantics, and which failures are ordinary broken tests that happened to surface during the upgrade.

Run these commands before changing assertions:

\`\`\`bash
node --version
npm ls vitest vite
npm exec vitest -- --version
npm exec vitest -- run --reporter=verbose
npm exec vitest -- list --json
\`\`\`

If you use pnpm, replace \`npm exec vitest --\` with \`pnpm vitest\`. If you use workspaces, run the version checks from the package that owns the Vitest config, not just from the repository root.

| Audit target | What to look for | Why it matters in Vitest 5 |
| --- | --- | --- |
| Node version manager | \`.nvmrc\`, \`.node-version\`, \`package.json#engines\`, Docker images | Node below \`22.12.0\` is outside the supported floor. |
| Vite pinning | Framework packages, overrides, lockfile resolutions | Older Vite can fail before tests are even collected. |
| Config discovery | Test commands run from nested package directories | Vitest no longer climbs ancestor directories to find a config. |
| Reporter consumers | CI parsers, dashboards, artifact uploads, custom scripts | JSON, JUnit, blob, and HTML outputs now default under \`.vitest\`. |
| Mock state assumptions | Tests depending on call counts from previous tests | Mocks are cleared by default before each test. |
| Async assertions | \`expect(...).resolves\`, \`expect.poll\`, user-event promises | Unawaited async expectations now fail the owning test. |
| Browser locators | Text locators that rely on partial, case-insensitive matching | \`browser.locators.exact\` is enabled by default. |
| Benchmark imports | \`import { bench } from 'vitest'\` | Benchmark API moved to a \`bench\` fixture inside \`test()\`. |

This is also the right time to compare against your Vitest 4 upgrade notes. If you skipped that work, read [Vitest 4 migration guide breaking changes](/blog/vitest-4-migration-guide-breaking-changes) first, because unresolved 4.x deprecations can look like new 5.x failures.

## Config Resolution Changes That Break Monorepos

Vitest 5 no longer looks up config files from ancestor directories. In Vitest 4, running a command inside \`packages/ui\` might silently reuse \`../../vitest.config.ts\`. In Vitest 5, that assumption is gone. This is better for predictability, but it exposes monorepo scripts that were depending on implicit lookup.

The fix is to make each package script explicit. Either run Vitest from the root, or pass \`--config\` from the package script.

\`\`\`json
{
  "scripts": {
    "test:root": "vitest run --config ./vitest.config.ts",
    "test:ui": "vitest run --config ./packages/ui/vitest.config.ts",
    "test:api": "vitest run --config ./packages/api/vitest.config.ts"
  }
}
\`\`\`

Inline projects also changed. Projects defined inside \`test.projects\` now inherit the root config by default. That includes Vite options such as plugins and aliases. In many repos, this removes duplicated configuration. In repos with deliberately isolated projects, it can accidentally apply frontend plugins to backend tests or browser aliases to Node-only tests.

\`\`\`ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname
    }
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts']
        }
      },
      {
        extends: false,
        test: {
          name: 'tools',
          environment: 'node',
          include: ['tools/**/*.test.ts']
        }
      }
    ]
  }
});
\`\`\`

The \`extends: false\` project above is not always needed. It is a signal that the project should not inherit root Vite plugins. Use it when a project tests CLI utilities, migration scripts, or server code that should not pass through the app transform stack.

Referenced config files can also define their own projects now. In Vitest 4, a nested \`projects\` field inside a referenced config could be ignored. In Vitest 5, those nested projects are honored. Search for shared config merges that pull in a root \`test.projects\` field by accident.

\`\`\`bash
rg "projects:" .
rg "mergeConfig" .
rg "defineProject" .
\`\`\`

What people get wrong is asking an agent to "dedupe Vitest configs" immediately after upgrading. Do the opposite first: make project ownership explicit, prove that each command collects the intended files, then remove duplicated config only after the suite is green.

## Mock Clearing Changes The Meaning Of Stateful Tests

Vitest 5 clears mocks before each test by default. That means call history, instances, contexts, and results are reset between tests. This aligns with how most QA teams expect isolated tests to behave, but it breaks tests that intentionally asserted cumulative calls across several \`it\` blocks.

| Old pattern | Vitest 5 result | Better migration |
| --- | --- | --- |
| Assert total calls across multiple tests | Call count resets before the next test | Move the cumulative flow into one test or assert per-test behavior. |
| Set mock implementation in one test and reuse later | Implementation may not be where the later test expects | Move setup to \`beforeEach\` or a factory. |
| Depend on test order for a fake service | Hidden coupling is exposed | Use explicit fixtures with clear setup data. |
| Use global spies without cleanup | Spy call history starts clean, but patched behavior may still need lifecycle care | Pair \`vi.spyOn\` with \`vi.restoreAllMocks()\` when restoring implementation matters. |

Here is a clean Vitest 5 style for a service that emits audit events:

\`\`\`ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

type AuditEvent = {
  actorId: string;
  action: 'approved' | 'rejected';
};

function createAuditClient() {
  return {
    publish: vi.fn<(event: AuditEvent) => Promise<void>>()
  };
}

async function approveRequest(actorId: string, audit: ReturnType<typeof createAuditClient>) {
  await audit.publish({ actorId, action: 'approved' });
  return { status: 'approved' as const };
}

describe('approveRequest', () => {
  let audit: ReturnType<typeof createAuditClient>;

  beforeEach(() => {
    audit = createAuditClient();
  });

  it('publishes an approval audit event', async () => {
    const result = await approveRequest('qa-42', audit);

    expect(result.status).toBe('approved');
    expect(audit.publish).toHaveBeenCalledTimes(1);
    expect(audit.publish).toHaveBeenCalledWith({
      actorId: 'qa-42',
      action: 'approved'
    });
  });
});
\`\`\`

For module mocks, review whether the test depends on hoisting rules. Vitest 5 throws when hoistable methods such as \`vi.mock\` are called outside top-level scope. If a coding agent tries to wrap \`vi.mock\` in a helper that runs conditionally inside a test, stop it. Use top-level mocks, \`vi.doMock\` for non-hoisted dynamic cases, or a dependency injection seam in production code. For deeper mocking strategy, pair this migration with the [Vitest mocking vi.mock complete guide](/blog/vitest-mocking-vi-mock-complete-guide).

## Async Assertions Now Punish Floating Promises

One of the healthiest Vitest 5 changes is that asynchronous assertions that are not awaited now fail the test. Previously, a test could appear green because the assertion promise settled after the test finished. That is especially common when agents generate \`expect(...).resolves\`, \`expect(...).rejects\`, \`expect.poll\`, or Testing Library user interactions without \`await\`.

\`\`\`ts
import { describe, expect, it } from 'vitest';

async function loadOrderStatus(orderId: string) {
  if (!/^ORDER-[0-9]{6}$/.test(orderId)) {
    throw new Error('Invalid order id');
  }

  return { orderId, status: 'ready' as const };
}

describe('loadOrderStatus', () => {
  it('returns ready status for valid orders', async () => {
    await expect(loadOrderStatus('ORDER-123456')).resolves.toEqual({
      orderId: 'ORDER-123456',
      status: 'ready'
    });
  });

  it('rejects malformed order ids', async () => {
    await expect(loadOrderStatus('123456')).rejects.toThrow(/Invalid order id/);
  });
});
\`\`\`

\`expect.poll\` also changed: if the polling function does not resolve in time, the assertion fails. That matters for UI tests and eventually consistent APIs. A vague polling assertion can now turn a flaky wait into a clear timeout.

\`\`\`ts
import { describe, expect, it } from 'vitest';

type Queue = {
  getProcessedCount: () => Promise<number>;
  processOne: () => Promise<void>;
};

function createQueue(): Queue {
  let processed = 0;

  return {
    async getProcessedCount() {
      return processed;
    },
    async processOne() {
      processed += 1;
    }
  };
}

describe('queue processing', () => {
  it('observes the processed count after work completes', async () => {
    const queue = createQueue();

    await queue.processOne();

    await expect.poll(
      () => queue.getProcessedCount(),
      { interval: 10, timeout: 200 }
    ).toBe(1);
  });
});
\`\`\`

The migration rule for agents is blunt: every async expectation must be awaited or returned. Every user interaction that returns a promise must be awaited. Every polling assertion needs an explicit timeout chosen for the system under test, not a random long delay. This is not ceremonial. It prevents false greens.

## Text Matchers And Browser Locators Got Stricter

Vitest 5 makes \`toHaveTextContent\` strict and adds \`toMatchTextContent\` as the looser alternative. If your assertion means "the complete normalized text should equal this value," keep \`toHaveTextContent\`. If your assertion means "this text should appear somewhere inside the element," migrate to \`toMatchTextContent\`.

| Intent | Prefer | Example expectation |
| --- | --- | --- |
| Exact visible message | \`toHaveTextContent\` | The whole alert is \`Payment approved\`. |
| Partial phrase in a long region | \`toMatchTextContent\` | A receipt contains \`ORDER-123456\`. |
| Format validation | Anchored regex with \`toMatchTextContent\` | The badge is exactly \`QA-2026-09\`. |
| Accessibility-facing selection | Browser \`getByRole\` with exact name | A button is exactly named \`Approve request\`. |

Browser Mode also changed locator matching. \`browser.locators.exact\` defaults to \`true\`, so text is a full, case-sensitive match unless an individual locator uses a regex or opts out. That is good for catching ambiguous selectors, but it will break tests that expected \`getByText('Save')\` to match \`Save changes\`.

\`\`\`ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      instances: [{ browser: 'chromium' }],
      locators: {
        exact: true,
        errorFormat: 'aria'
      }
    }
  }
});
\`\`\`

In QA suites, prefer the strict default. Use regexes when the product intentionally includes dynamic text, and anchor those regexes when the full text shape matters.

\`\`\`ts
import { expect, test } from 'vitest';
import { page } from '@vitest/browser/context';

test('shows the approved request banner', async () => {
  await page.getByRole('button', { name: 'Approve request' }).click();

  await expect.element(
    page.getByRole('status', { name: /^Request ORDER-[0-9]{6} approved$/ })
  ).toBeVisible();
});
\`\`\`

The hidden benefit is better debugging with AI agents. When a locator fails, Vitest can report the ARIA tree for the searched subtree. That is much easier to paste into a prompt than a huge HTML dump, and it nudges the agent toward role and accessible-name fixes instead of brittle selectors.

## Reporter Output Moved, So CI Needs New Artifact Paths

Vitest 5 consolidates generated reports and artifacts under \`.vitest\`. The JSON and JUnit reporters now write files by default instead of printing to stdout. The HTML reporter defaults to \`.vitest/index.html\`. The blob reporter and \`--merge-reports\` default under \`.vitest/blob\`. Attachments moved to \`.vitest/attachments\`.

| Output | Vitest 5 default | Migration action |
| --- | --- | --- |
| JSON reporter | \`.vitest/json/output.json\` | Update parsers that previously consumed stdout. |
| JUnit reporter | \`.vitest/junit/output.xml\` | Update CI test report upload paths. |
| HTML reporter | \`.vitest/index.html\` | Upload the directory or configure \`outputDir\`. |
| Blob reporter | \`.vitest/blob/\` | Merge from the new directory or pass \`--outputFile.blob\`. |
| Attachments | \`.vitest/attachments/\` | Upload alongside blob reports when preserving screenshots or files. |

For GitHub Actions, use current action majors and collect \`.vitest\` as a single artifact. This workflow uses the default JUnit output path and keeps the artifact even when tests fail.

\`\`\`yaml
name: vitest

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22.12.0
          cache: npm
      - run: npm ci
      - run: npm exec vitest -- run --reporter=github-actions --reporter=junit --reporter=html
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: vitest-\${{ github.run_id }}
          path: .vitest
\`\`\`

If your CI parser expects XML in a custom folder, keep the reporter but set \`outputFile\` explicitly.

\`\`\`ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: [
      'default',
      ['junit', { outputFile: 'reports/vitest/junit.xml' }],
      ['json', { outputFile: 'reports/vitest/results.json' }]
    ]
  }
});
\`\`\`

The failure mode here is easy to diagnose: CI says "no test results found" while the test command clearly ran. Check whether \`.vitest/junit/output.xml\` exists in the workspace. If it does, the test runner is fine and the artifact or parser path is stale.

## Filters, Tags, And The New Full Test Name Separator

The \`-t\` flag and \`testNamePattern\` now match the full test name with suite names joined by \` > \`. Before Vitest 5, the segments were joined with a single space to mirror Jest. Most filters still work because they match a single test name segment. Filters that span a suite boundary need attention.

| Test tree | Old cross-boundary filter | Vitest 5 filter |
| --- | --- | --- |
| \`math > adds\` | \`vitest -t "math adds"\` | \`vitest -t "math > adds"\` |
| \`checkout > discounts > applies coupon\` | \`vitest -t "checkout discounts"\` | \`vitest -t "checkout > discounts"\` |
| Any test named \`applies coupon\` | \`vitest -t "applies coupon"\` | Still valid. |
| Flexible boundary match | \`vitest -t "math adds"\` | \`vitest -t "math.*adds"\` |

When agents triage a single failure, they often generate a command from reporter output. That now works better because the reporter output uses the same \` > \` separator that \`-t\` expects.

\`\`\`bash
npm exec vitest -- run -t "checkout > discounts > applies coupon"
npm exec vitest -- run src/checkout/discounts.test.ts -t "applies coupon"
npm exec vitest -- bench -t "JSON parser"
\`\`\`

Use name filters for a focused investigation, not as a permanent suite partition. For long-lived suite routing, Vitest projects, file globs, and tags are easier to reason about. The docs also note that tags must be defined in config and unknown tags can be rejected, which is useful for keeping agent-generated annotations from drifting.

## Benchmarks Moved Into The Test Context

Vitest 5 rewrote the public benchmark API. \`bench\` is no longer a top-level import from \`vitest\`. It is a fixture available in benchmark files inside \`test()\`. Benchmark files are selected by benchmark include patterns, with defaults matching \`*.bench.*\` and \`*.benchmark.*\` style names.

Old snippets that import \`bench\` directly need to be rewritten. The new style gives benchmark code access to normal test runner features such as lifecycle hooks, assertions, retries, and filtering.

\`\`\`ts
import { expect, test } from 'vitest';

function normalizeSearchTerm(input: string) {
  return input.trim().toLowerCase().replaceAll(' ', '-');
}

test('normalizes search terms within budget', async ({ bench }) => {
  const result = await bench('normalize qa query', () => {
    normalizeSearchTerm('  Vitest 5 Migration Guide  ');
  }).run();

  expect(result.throughput.mean).toBeGreaterThan(0);
});
\`\`\`

Run benchmarks separately from normal tests:

\`\`\`bash
npm exec vitest -- bench
npm exec vitest -- bench src/search/normalize.bench.ts -t "normalizes search"
\`\`\`

Do not convert unit tests into benchmarks just because a performance question exists. A unit test should assert correctness. A benchmark should measure a hot path with controlled inputs, low external noise, and a clear threshold or review process. If the benchmark is only there to make CI slower, remove it or run it manually.

## File System Module Cache Is Powerful But Needs Plugin Discipline

Vitest 5 promotes \`fsModuleCache\` as a stable option. When enabled, Vitest persists transformed modules on disk so separate runs can reuse them. The official docs say the cache lives under \`node_modules\` at the workspace root by default, can be moved with \`fsModuleCachePath\`, and can be cleared with \`vitest --clearCache\`.

\`\`\`ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fsModuleCache: true,
    fsModuleCachePath: 'node_modules/.vitest-cache'
  }
});
\`\`\`

This is attractive in CI and agent loops because transformed module reuse can reduce repeated work. The catch is plugin correctness. Vitest hashes file content and known environment details, but custom plugin options may affect transform output without being visible to the cache. If your plugin reads a feature flag file, a locale manifest, or codegen output, define a cache key generator.

\`\`\`ts
import { defineConfig } from 'vitest/config';

function replaceTokenPlugin(options: { token: string; replacement: string }) {
  return {
    name: 'replace-token',
    transform(code: string) {
      return code.replaceAll(options.token, options.replacement);
    },
    configureVitest({ defineCacheKeyGenerator }: {
      defineCacheKeyGenerator: (callback: () => string) => void;
    }) {
      defineCacheKeyGenerator(() => options.token + ':' + options.replacement);
    }
  };
}

export default defineConfig({
  plugins: [
    replaceTokenPlugin({ token: '__APP_VARIANT__', replacement: 'qa' })
  ],
  test: {
    fsModuleCache: true
  }
});
\`\`\`

The realistic failure mode is not a crash. It is worse: stale transformed code that makes a test pass locally but fail on a fresh CI runner, or fail locally after a branch switch but pass after \`vitest --clearCache\`. If clearing the cache changes behavior, suspect a transform cache key before rewriting assertions.

## Browser Mode And Package Moves

Vitest 5 removed the official WebdriverIO browser provider package from the main release and moved WebdriverIO support to the vitest-community organization. That does not mean browser testing is discontinued. It means teams using \`@vitest/browser-webdriverio\` should make a deliberate choice: move to the community package, switch to the Playwright provider, or separate those tests into a different tool if WebdriverIO-specific behavior is critical.

| Browser setup | Vitest 5 migration decision |
| --- | --- |
| Playwright provider | Usually keep it, then fix exact locator assumptions. |
| Preview provider | Recheck coverage against real browser needs and project goals. |
| WebdriverIO provider from old package | Replace with the community package or migrate provider strategy. |
| Custom browser commands | Update locator serialization handling if commands assumed locators were strings. |
| Screenshot workflows | Review \`screenshotDirectory\`, failure screenshot paths, and attachment uploads. |

Vitest 5 also represents browser locators as objects rather than plain strings for custom commands. If your custom command receives a locator from the browser context, update it to use the serialized locator shape documented by Vitest instead of treating the argument as a provider selector string.

For AI-driven migrations, browser tests deserve a separate commit. DOM tests produce noisy diffs because agents may change selectors, assertions, and fixture data at the same time. Keep provider dependency changes, locator exactness fixes, and screenshot artifact path updates separate enough that reviewers can understand why a visual or browser assertion changed.

## A Migration Workflow For QA Teams Using Agents

Agents are useful here because the migration has many small edits: config paths, CI artifact paths, filters, mock setup, async assertions, and benchmark imports. The risk is that agents can "green" a suite by weakening assertions. Your prompt should require stronger behavior checks, not fewer checks.

Give the agent a bounded plan:

| Step | Agent task | Human review focus |
| --- | --- | --- |
| 1 | Update Node, Vite, Vitest, and lockfile. | Runtime floors and framework compatibility. |
| 2 | Add \`.vitest/\` to gitignore and update CI uploads. | Test report consumers still receive files. |
| 3 | Run collection with \`vitest list\`. | Missing config due to ancestor lookup removal. |
| 4 | Fix mock and hoist errors. | No conditional \`vi.mock\` wrappers. |
| 5 | Await async assertions and user interactions. | Assertions still check side effects and output. |
| 6 | Fix browser locator exactness. | Prefer accessible roles over broad text matching. |
| 7 | Rewrite benchmarks. | Benchmarks stay out of normal test command unless intended. |
| 8 | Run full CI command locally. | Same reporters and artifact paths as CI. |

A useful agent instruction is:

\`\`\`text
Upgrade this Vitest suite to Vitest 5. Do not weaken assertions to make failures pass. When fixing async assertion failures, await or return the assertion. When fixing locator failures, prefer exact accessible role locators or anchored regexes. Keep CI reporter outputs under .vitest unless the existing pipeline requires a custom outputFile. Show every changed test command before editing package scripts.
\`\`\`

Ready-made QA skills can install from qaskills.sh with the \`qaskills\` CLI, but a skill is not a substitute for migration evidence. The evidence is still the same: exact versions, collected tests, meaningful assertions, uploaded artifacts, and a clean CI run.

## Failure Mode: The Suite Is Green, But CI Lost Its Reports

Here is a realistic post-upgrade failure:

\`\`\`text
Vitest command: passed
CI status: failed
Parser message: no JUnit files matched reports/junit/*.xml
Artifact browser: .vitest/junit/output.xml exists
\`\`\`

Diagnosis: the test runner succeeded, but the CI report collector still points at the old path. Vitest 5 writes JUnit output to \`.vitest/junit/output.xml\` by default. You can either update the collector or restore the old output path with reporter options.

The better fix depends on how many tools consume the path. If only GitHub artifact upload is stale, move everything to \`.vitest\`. If a quality dashboard, flaky-test service, or enterprise CI parser requires \`reports/junit/*.xml\`, configure Vitest to write there explicitly.

\`\`\`ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: [
      'default',
      ['junit', { outputFile: 'reports/junit/vitest.xml' }]
    ]
  }
});
\`\`\`

Then assert the side effect in CI with a shell check after the test command:

\`\`\`bash
test -s reports/junit/vitest.xml
test -d .vitest
\`\`\`

This tiny check saves long debugging sessions. It turns "the dashboard is empty" into a direct file contract.

## Frequently Asked Questions

### Should I upgrade to Vitest 5 immediately?

Upgrade when your CI images can run Node.js \`>=22.12.0\` and your app stack can run Vite \`>=6.4.0\`. For small Vite-native apps, that may be a same-day upgrade. For monorepos with framework adapters, browser tests, custom reporters, or benchmark files, plan a short migration branch. The most valuable first step is a read-only audit: versions, config discovery, reporter consumers, and test collection.

### Why did my Vitest 5 mocks stop keeping call counts between tests?

Vitest 5 clears mocks before each test by default. If a test expected cumulative calls across multiple \`it\` blocks, it was relying on shared state. Move that scenario into one test when the sequence is the behavior, or create fresh mocks in \`beforeEach\` and assert each test independently. If implementation restoration matters, use \`vi.restoreAllMocks()\` or explicit setup rather than depending on accidental state.

### What is the safest way to fix unawaited async assertion failures?

Await the assertion or return it from the test. Do not replace \`resolves\`, \`rejects\`, or \`expect.poll\` with weaker synchronous checks. Also inspect the action that triggers the async behavior: user interactions, queue processors, API calls, and timers often return promises too. A good fix waits for the action to settle, then asserts both the visible result and an important side effect.

### How should AI coding agents help with this migration?

Use agents for mechanical discovery and scoped edits: find stale reporter paths, rewrite \`-t\` filters that span suite boundaries, add awaits to async assertions, and update benchmark imports. Keep a human review on assertion strength, browser selector intent, and CI artifact contracts. The best agent prompt forbids weakening tests and asks for exact commands, versions, and changed file lists after each pass.
`,
};
