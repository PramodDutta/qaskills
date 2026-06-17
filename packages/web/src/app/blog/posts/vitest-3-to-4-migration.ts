import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest 4 Migration Guide -- Vitest 3 to 4 Breaking Changes',
  description:
    'A practical Vitest 4.0 migration guide. Covers every Vitest 3 to 4 breaking change, the new browser mode, V8 coverage AST remapping, spy API changes, config updates, and a step-by-step upgrade path.',
  date: '2026-06-17',
  category: 'Guide',
  content: `
# Vitest 4 Migration Guide: Vitest 3 to 4 Breaking Changes

Vitest 4.0 is the biggest release since the framework's stabilization, and upgrading from Vitest 3 is mostly smooth -- but there are real breaking changes that will fail your build if you ignore them. This guide is a practical migration reference. It walks through every breaking change between Vitest 3 and Vitest 4, shows the before-and-after code for each, gives you a step-by-step upgrade path, and explains the new capabilities that make the upgrade worth doing rather than just necessary.

The headline changes in Vitest 4 are a graduated, stabilized browser mode, a rewritten V8 coverage provider that uses AST-aware remapping for far more accurate line and branch numbers, a cleaned-up mocking and spy API that removes long-deprecated aliases, the removal of the deprecated workspace configuration in favor of \\\`projects\\\`, and a bump in the minimum supported Node version. None of these are surprises if you were tracking the release candidates, but together they mean you cannot simply change the version number in \\\`package.json\\\` and expect a green run.

This reference assumes you are already running Vitest 3.x and want to land on 4.0 with minimal disruption. If you are still deciding whether Vitest is the right runner at all, our [Jest vs Vitest comparison](/blog/jest-vs-vitest-2026) covers that decision in depth, and the [QA skills directory](/skills) has ready-made testing skills for AI coding agents that target Vitest specifically. Let's get into the changes.

## Before You Upgrade: Prerequisites

Vitest 4 raises its minimum Node version. Verify you are on a supported runtime before touching anything else, because an unsupported Node version produces confusing downstream errors that look like code problems but are really environment problems.

\`\`\`bash
# Check your current versions first
node --version
npx vitest --version

# Vitest 4 requires a modern Node LTS. Upgrade Node if you are below the floor.
nvm install --lts
nvm use --lts
\`\`\`

You should also make sure your test suite is fully green on Vitest 3 before starting. Migrating on top of already-failing tests makes it impossible to tell whether a new failure is your bug or the upgrade's doing. Commit a clean baseline first.

## Vitest 3 vs Vitest 4 Breaking Changes Table

This is the reference table to keep open while you migrate. Each row links a breaking change to the action you must take.

| Area | Vitest 3 behavior | Vitest 4 behavior | Action required |
|---|---|---|---|
| Node version | Older LTS supported | Minimum Node raised to current LTS floor | Upgrade Node runtime |
| Workspace config | \\\`vitest.workspace.ts\\\` / \\\`workspace\\\` option | Removed; use \\\`projects\\\` in root config | Move config into \\\`test.projects\\\` |
| Browser mode | Experimental, single \\\`browser.name\\\` | Stable, \\\`browser.instances\\\` array | Convert to instances array |
| V8 coverage | Per-line, less accurate mapping | AST-aware remapping (more accurate) | Re-baseline coverage thresholds |
| Spy API | \\\`mockReset\\\` restored original impl | \\\`mockReset\\\` resets to no-op; use \\\`mockRestore\\\` | Audit reset/restore usage |
| \\\`spyOn\\\` defaults | Some implicit behaviors | Stricter, explicit configuration | Review spy setup |
| Deprecated aliases | \\\`vi.fn\\\` deprecated aliases present | Removed | Replace removed aliases |
| \\\`environmentMatchGlobs\\\` | Supported | Removed | Use \\\`projects\\\` per-env config |
| Reporters | Default \\\`basic\\\` reporter available | \\\`basic\\\` removed; use \\\`default\\\` | Update reporter name |
| \\\`poolMatchGlobs\\\` | Supported | Removed | Use \\\`projects\\\` with pool config |
| Snapshot format | Older default | Updated default formatting | Re-record snapshots if needed |

## Step 1: Bump the Version

Start by installing Vitest 4 and any companion packages that ship on the same major. The \\\`@vitest/coverage-v8\\\`, \\\`@vitest/browser\\\`, and \\\`@vitest/ui\\\` packages must move to the same major version as the core; mismatched majors are a common cause of cryptic startup errors.

\`\`\`bash
# Update core and all companion packages together to the 4.x line
npm install -D vitest@^4 @vitest/coverage-v8@^4 @vitest/ui@^4 @vitest/browser@^4

# Or with pnpm
pnpm add -D vitest@^4 @vitest/coverage-v8@^4 @vitest/ui@^4
\`\`\`

After installing, run the suite immediately so you see the full list of breaking-change errors at once. Do not fix them blindly; read them against the table above so you understand the category of each failure.

## Step 2: Migrate Workspace Config to Projects

Vitest 3 let you define a monorepo or multi-environment setup with a separate \\\`vitest.workspace.ts\\\` file or a top-level \\\`workspace\\\` option. Vitest 4 removes both in favor of a single \\\`projects\\\` array inside the root config. This is the most common migration blocker, so handle it early.

Here is the old Vitest 3 style, which will no longer work.

\`\`\`typescript
// OLD (Vitest 3): vitest.workspace.ts -- removed in Vitest 4
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/*',
  {
    test: {
      name: 'node',
      environment: 'node',
      include: ['tests/node/**/*.test.ts'],
    },
  },
]);
\`\`\`

And here is the Vitest 4 replacement, with everything consolidated into \\\`test.projects\\\` in the root \\\`vitest.config.ts\\\`.

\`\`\`typescript
// NEW (Vitest 4): vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/*',
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/node/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['tests/dom/**/*.test.ts'],
        },
      },
    ],
  },
});
\`\`\`

If you previously used \\\`environmentMatchGlobs\\\` or \\\`poolMatchGlobs\\\` to switch environments or worker pools by file pattern, those options are also gone. The replacement is a project per environment or pool, as shown by the \\\`node\\\` and \\\`jsdom\\\` projects above.

## Step 3: Convert Browser Mode to Instances

Vitest 4 graduates browser mode out of its experimental phase. The single \\\`browser.name\\\` field is replaced by a \\\`browser.instances\\\` array, which lets one config run the same tests across multiple real browsers. This is a clear improvement, but it is a hard breaking change: the old field is gone.

The old single-browser config looked like this.

\`\`\`typescript
// OLD (Vitest 3): single browser
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
      headless: true,
    },
  },
});
\`\`\`

The Vitest 4 version uses the instances array. Each instance can override settings, and tests run across all of them.

\`\`\`typescript
// NEW (Vitest 4): instances array
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      instances: [
        { browser: 'chromium' },
        { browser: 'firefox' },
        { browser: 'webkit' },
      ],
    },
  },
});
\`\`\`

If you only need one browser, you still use the array with a single entry. There is no longer a scalar \\\`name\\\` shortcut. For broader context on browser-driven testing strategy, our [Playwright complete guide](/blog/playwright-e2e-complete-guide) pairs well with Vitest's browser mode.

## Step 4: Audit the Spy and Mock API

Vitest 4 tightens the mocking API, and this is the change most likely to silently alter test behavior rather than throw a loud error. The key semantic shift is around \\\`mockReset\\\`. In Vitest 4, \\\`mockReset\\\` resets the mock to a no-op implementation, while restoring the original implementation now requires \\\`mockRestore\\\`. If you relied on \\\`mockReset\\\` to bring back the real function, your tests will start behaving differently.

\`\`\`typescript
import { vi, test, expect, afterEach } from 'vitest';

const calculator = {
  add: (a: number, b: number) => a + b,
};

test('spy intercepts and restore brings back the original', () => {
  const spy = vi.spyOn(calculator, 'add').mockReturnValue(99);
  expect(calculator.add(2, 3)).toBe(99);

  // Vitest 4: use mockRestore (NOT mockReset) to restore the real implementation
  spy.mockRestore();
  expect(calculator.add(2, 3)).toBe(5);
});

test('mockReset clears to a no-op in Vitest 4', () => {
  const spy = vi.spyOn(calculator, 'add').mockReturnValue(99);
  spy.mockReset();
  // After reset the mock returns undefined, it does NOT call through to the original
  expect(calculator.add(2, 3)).toBeUndefined();
});
\`\`\`

A safe global pattern is to be explicit in your teardown. If you want the original implementations back between tests, call \\\`vi.restoreAllMocks()\\\`; if you only want call history cleared, use \\\`vi.clearAllMocks()\\\`.

\`\`\`typescript
import { vi, afterEach } from 'vitest';

afterEach(() => {
  // restoreAllMocks puts back original implementations created via spyOn
  vi.restoreAllMocks();
});
\`\`\`

Several long-deprecated aliases are also removed in Vitest 4. Search your codebase for them and replace with the canonical forms before the suite even runs, since these throw at import or call time.

## Step 5: Re-baseline Coverage Thresholds

The V8 coverage provider in Vitest 4 uses AST-aware remapping. Previously V8 coverage mapped bytes back to source somewhat coarsely; the new approach walks the abstract syntax tree to attribute coverage to the correct statements, branches, and lines. The result is more accurate numbers -- which often means your reported coverage percentage changes even though your tests did not.

\`\`\`typescript
// vitest.config.ts -- coverage with the V8 provider
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Re-baseline these after upgrading; AST remapping shifts the numbers
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
\`\`\`

The practical advice: do not panic if a CI gate fails on coverage right after upgrading. Run coverage once on Vitest 4, read the new accurate numbers, and reset your thresholds to match reality rather than the old, less precise figures.

## Step 6: Update Reporters

The \\\`basic\\\` reporter is removed in Vitest 4. If your CI config or scripts request it explicitly, switch to the \\\`default\\\` reporter, optionally configured to behave like the old basic output.

\`\`\`typescript
// OLD: reporter: 'basic'  -- removed
// NEW: use default
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: { junit: './reports/junit.xml' },
  },
});
\`\`\`

## Quick Migration Checklist

Use this condensed checklist as your final pass before merging the upgrade.

| Step | Task | Done when |
|---|---|---|
| 1 | Upgrade Node to supported LTS | \\\`node --version\\\` meets the floor |
| 2 | Bump vitest + all @vitest/* to 4.x | No major-mismatch errors at startup |
| 3 | Replace workspace with \\\`projects\\\` | Config loads without workspace warnings |
| 4 | Remove \\\`environmentMatchGlobs\\\`/\\\`poolMatchGlobs\\\` | Replaced by per-environment projects |
| 5 | Convert \\\`browser.name\\\` to \\\`instances\\\` | Browser tests start across instances |
| 6 | Audit \\\`mockReset\\\` vs \\\`mockRestore\\\` | Restore semantics verified in tests |
| 7 | Replace removed deprecated aliases | No alias errors at runtime |
| 8 | Re-baseline coverage thresholds | CI coverage gate green on real numbers |
| 9 | Swap \\\`basic\\\` reporter for \\\`default\\\` | Reporter resolves without error |
| 10 | Re-record snapshots if formatting changed | \\\`vitest -u\\\` produces stable snapshots |

## A Complete Working Vitest 4 Config

Tying it together, here is a realistic Vitest 4 config that incorporates projects, the V8 coverage provider, and an updated reporter setup. This is a good template to copy into a freshly migrated repository.

\`\`\`typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: { junit: './reports/junit.xml' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/*.dom.test.ts'],
          setupFiles: ['./vitest.setup.ts'],
        },
      },
    ],
  },
});
\`\`\`

A matching example test that exercises the updated spy semantics rounds out the template.

\`\`\`typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchUser } from './user-service';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchUser', () => {
  it('returns the parsed user on success', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: 'QA' }), { status: 200 })
    );

    const user = await fetchUser(1);
    expect(user).toEqual({ id: 1, name: 'QA' });
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});
\`\`\`

## Common Migration Pitfalls and How to Avoid Them

A handful of mistakes account for most failed Vitest 4 migrations. The first is upgrading the core package without bumping the companion packages, leaving \\\`@vitest/coverage-v8\\\` or \\\`@vitest/ui\\\` on the 3.x line; the resulting errors are cryptic because the version mismatch surfaces deep inside the runner rather than as a clear message. Always move every \\\`@vitest/*\\\` package to the same major in one install command.

The second pitfall is treating the \\\`mockReset\\\` semantic change as a no-op. Because the behavior shift is silent rather than a thrown error, a suite can go green while actually testing the wrong thing -- a mock returning \\\`undefined\\\` where you expected the original implementation. Grep your codebase for \\\`mockReset\\\` and \\\`resetMocks\\\` and review each call site against whether you wanted a no-op or a restore.

\`\`\`bash
# Find every place that might be affected by the reset/restore semantic change
grep -rn "mockReset\\|resetMocks\\|restoreMocks\\|mockRestore" src/ tests/
\`\`\`

The third pitfall is letting the coverage gate block your merge after the V8 remapping shifts the numbers. Do not lower thresholds reflexively or raise them blindly -- run coverage once, read the now-accurate report, and set thresholds to reflect reality. The fourth is forgetting that \\\`environmentMatchGlobs\\\` and \\\`poolMatchGlobs\\\` are gone; if your old config switched environments by file pattern, those tests will all run in the wrong environment until you split them into projects.

## Verifying the Migration in CI

Once your local suite is green, prove the migration holds in continuous integration before merging. A clean CI run on Vitest 4 with coverage and the JUnit reporter confirms that both the runtime and the reporting pipeline survived the upgrade.

\`\`\`yaml
# .github/workflows/test.yml
name: test
on: [push, pull_request]
jobs:
  vitest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
      - run: npm ci
      - run: npx vitest run --coverage --reporter=default --reporter=junit
\`\`\`

Pin the Node version to a supported LTS in CI explicitly so the pipeline does not silently fall back to an unsupported runtime. If the coverage step fails, that is your cue to re-baseline thresholds against the new AST-accurate numbers rather than to assume your tests regressed.

## Letting an AI Agent Drive the Migration

Because Vitest 4's breaking changes are mechanical and well-defined, they are an excellent candidate for an AI coding agent to handle: replace removed aliases, convert config shapes, and re-baseline thresholds are all pattern-based edits. Hand your agent this guide's table plus a curated Vitest skill from the [QA skills directory](/skills) and it can produce most of the diff for you, leaving you to review the spy-semantics changes that need human judgment. If you are also weighing test runners more broadly, revisit the [Jest vs Vitest comparison](/blog/jest-vs-vitest-2026).

## Frequently Asked Questions

### What is the minimum Node version for Vitest 4?

Vitest 4 raises its minimum supported Node version to a current LTS floor, dropping older releases that Vitest 3 still tolerated. Before upgrading, run \\\`node --version\\\` and move to a supported LTS via your version manager. Running Vitest 4 on an unsupported Node version produces confusing errors that look like code bugs but are really environment incompatibilities.

### Why did my coverage numbers change after upgrading to Vitest 4?

Vitest 4's V8 coverage provider uses AST-aware remapping, which attributes coverage to the correct statements, branches, and lines far more precisely than the older byte-level mapping. Your tests did not change, but the reported percentages did because they are now more accurate. Run coverage once on Vitest 4 and reset your thresholds to the new, truthful numbers.

### What replaced the workspace config in Vitest 4?

The separate \\\`vitest.workspace.ts\\\` file and the top-level \\\`workspace\\\` option are removed. They are replaced by a \\\`projects\\\` array inside \\\`test\\\` in your root \\\`vitest.config.ts\\\`. Each project can define its own name, environment, include patterns, and setup files, which also replaces the removed \\\`environmentMatchGlobs\\\` and \\\`poolMatchGlobs\\\` options.

### Does mockReset behave differently in Vitest 4?

Yes, and this is the change most likely to silently alter behavior. In Vitest 4, \\\`mockReset\\\` resets a mock to a no-op implementation rather than restoring the original. To bring back the real implementation created via \\\`spyOn\\\`, you must call \\\`mockRestore\\\` or \\\`vi.restoreAllMocks()\\\`. Audit any test that relied on \\\`mockReset\\\` to restore original behavior.

### How do I configure multiple browsers in Vitest 4 browser mode?

The scalar \\\`browser.name\\\` field is removed. You now use a \\\`browser.instances\\\` array, where each entry specifies a browser such as chromium, firefox, or webkit, and tests run across all of them. Even for a single browser you use the array with one entry, since there is no longer a name shortcut.

### Can I upgrade from Vitest 2 directly to Vitest 4?

You can, but you will encounter the cumulative breaking changes from both the 3.x and 4.x lines at once, which is harder to debug. The recommended path is to land on a clean, green Vitest 3 baseline first, then follow this guide to reach 4.0. Upgrading one major at a time isolates failures and makes each fix obvious.

### Is the basic reporter still available in Vitest 4?

No. The \\\`basic\\\` reporter is removed in Vitest 4. Replace it with the \\\`default\\\` reporter, which produces comparable output and can be combined with machine-readable reporters like \\\`junit\\\` for CI. Update any scripts or CI config that request \\\`basic\\\` explicitly, or your run will fail to resolve the reporter.

### How long does a typical Vitest 3 to 4 migration take?

For a small to medium codebase already green on Vitest 3, the migration is usually a few hours: bump versions, convert the config to projects and browser instances, audit spy usage, and re-baseline coverage. Large monorepos with many workspace projects and heavy browser-mode usage take longer, mostly in re-baselining coverage gates and verifying spy-semantics changes across many test files.

## Conclusion

Vitest 4 is a worthwhile upgrade. The stabilized browser mode, AST-accurate V8 coverage, and cleaner mocking API are genuine improvements, not just churn. The breaking changes are real but mechanical: migrate workspace config to projects, convert browser mode to instances, audit \\\`mockReset\\\` versus \\\`mockRestore\\\`, re-baseline coverage thresholds, swap the removed reporter, and confirm your Node version. Work the checklist above row by row and you will land on 4.0 with a green suite and more accurate signal than before.

The fastest way to make this migration -- and your ongoing test maintenance -- nearly hands-off is to pair your AI coding agent with a curated Vitest skill. Browse the [QA skills directory](/skills) for testing skills built for agents, and if you are revisiting your runner choice entirely, read our [Jest vs Vitest comparison](/blog/jest-vs-vitest-2026) before you commit.
`,
};
