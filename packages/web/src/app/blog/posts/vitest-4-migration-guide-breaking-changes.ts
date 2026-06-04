import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest 4.0 Migration Guide: Breaking Changes from v3',
  description:
    'Step-by-step Vitest 4.0 migration guide for the breaking changes from v3: config, deprecated APIs, browser mode, coverage v8, and workspace to projects.',
  date: '2026-06-02',
  category: 'Guide',
  content: `
# Vitest 4.0 Migration Guide: Breaking Changes from Vitest 3

Vitest 4.0 is the most significant release since the framework reached stability, and upgrading from Vitest 3 touches more of your setup than a typical major bump. The headline changes are a reworked browser mode that is now built on a proper provider architecture, the replacement of the \`workspace\` configuration with the new \`projects\` field, a modernized v8 coverage pipeline, and the removal of several long-deprecated APIs. None of these are insurmountable, but doing the migration blind will cost you an afternoon of cryptic errors. This guide walks through every breaking change in order, with the exact before-and-after code you need, so you can upgrade methodically and have a green suite at the end.

We will assume you are currently on a recent Vitest 3.x release and using a standard setup: a \`vitest.config.ts\`, the v8 coverage provider, and possibly the experimental browser mode or a multi-package workspace. The migration follows a clear sequence. First you bump the packages and run the suite to surface failures. Then you address configuration renames, starting with workspace-to-projects, which is the change most likely to break a monorepo. Next you update the coverage configuration, then migrate browser-mode setups to the new provider API, and finally sweep up the removed and renamed assertion and mocking helpers. We will also cover the Node.js version requirement and the new defaults you should be aware of even if they do not strictly break anything. By the end you will have a checklist you can re-run on every package in a monorepo. If you are weighing Vitest against Jest more broadly first, read our [Jest vs Vitest comparison](/blog/jest-vs-vitest-2026) and the [Jest to Vitest migration guide](/blog/jest-to-vitest-migration-guide).

To have an AI coding agent perform much of this migration mechanically across your repo, install a [testing skill](/skills) into Claude Code or Cursor.

## Step 1: Check Prerequisites and Bump Packages

Vitest 4 raises its minimum requirements. Confirm your environment meets them before touching anything else, because an unsupported Node version produces confusing downstream errors that look like config problems but are not.

| Requirement | Vitest 3 | Vitest 4 |
|---|---|---|
| Node.js | 18+ | 20.19+ / 22.12+ (modern LTS) |
| Vite | 5 or 6 | 6+ |
| TypeScript | 5.0+ | 5.0+ (5.5+ recommended) |
| ESM | Recommended | Strongly recommended |

Upgrade your Node runtime first, then bump Vitest and its companion packages together so versions stay aligned. Mismatched \`vitest\` and \`@vitest/*\` versions are a frequent source of breakage.

\`\`\`bash
# Upgrade Vitest and all companion packages in lockstep
npm install -D vitest@^4 @vitest/coverage-v8@^4 @vitest/ui@^4 @vitest/browser@^4

# If you use Vite directly, ensure it is v6+
npm install -D vite@^6
\`\`\`

Now run your existing suite immediately. The failures you see are your migration to-do list. Work through them with the steps below rather than guessing.

\`\`\`bash
npx vitest run
\`\`\`

## Step 2: Migrate workspace to projects

The biggest structural change in Vitest 4 is that the \`workspace\` configuration is replaced by a \`projects\` field defined inside your main config's \`test\` block. In Vitest 3 a monorepo used a separate \`vitest.workspace.ts\` file. In Vitest 4 that file is removed and you declare projects inline, which unifies configuration and makes it easier to share top-level settings.

\`\`\`typescript
// BEFORE (Vitest 3): vitest.workspace.ts
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/*',
  {
    test: {
      name: 'unit',
      include: ['src/**/*.unit.test.ts'],
      environment: 'node',
    },
  },
  {
    test: {
      name: 'browser',
      include: ['src/**/*.browser.test.ts'],
    },
  },
]);
\`\`\`

\`\`\`typescript
// AFTER (Vitest 4): vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/*',
      {
        test: {
          name: 'unit',
          include: ['src/**/*.unit.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.ts'],
        },
      },
    ],
  },
});
\`\`\`

Delete the old \`vitest.workspace.ts\` (and any \`.js\`/\`.json\` variant) after moving its contents into \`projects\`. The \`defineWorkspace\` helper is gone, so remove that import. Glob strings and inline project objects both still work, just relocated. If you were running \`vitest --workspace\` on the CLI, that flag is also removed; configuration now drives project selection, and you filter with \`--project <name>\` instead.

## Step 3: Update Coverage Configuration

Coverage in Vitest 4 modernizes the v8 provider. The default reporting path now uses the AST-aware remapping that produces more accurate line and branch numbers, and several coverage options were renamed or had their defaults changed. The most common breakage is configuration keys that no longer exist or now live under a different name.

\`\`\`typescript
// AFTER (Vitest 4): coverage block in vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // 'all' now defaults to true: uncovered files are included
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts', '**/*.config.*', '**/mockData/**'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
});
\`\`\`

Key things to verify during the coverage migration:

| Coverage concern | Change in Vitest 4 | Action |
|---|---|---|
| \`coverage.all\` | Defaults to \`true\` now | Set explicit \`include\` so uncovered files are scoped |
| Thresholds | Moved under \`coverage.thresholds\` object | Nest \`lines\`/\`branches\` inside \`thresholds\` |
| \`@vitest/coverage-v8\` version | Must match Vitest major | Install \`@vitest/coverage-v8@^4\` |
| Istanbul provider | Still available | Switch \`provider: 'istanbul'\` if v8 remapping causes issues |
| Per-file thresholds | Supported via \`thresholds.perFile\` | Add \`perFile: true\` if you relied on it |

Because \`all\` now defaults to true, suites that previously reported only touched files will suddenly include every matched file, which can drop your reported percentage and trip thresholds. This is expected and arguably more honest; scope it with a precise \`include\` glob rather than disabling \`all\`.

## Step 4: Migrate Browser Mode

Browser mode received the largest API overhaul. In Vitest 4 it is no longer flagged as experimental in the same way and is configured through an \`instances\` array under \`browser\`, each describing a browser to run against via a provider such as Playwright or WebdriverIO. The older single-browser \`name\` field on the \`browser\` object is replaced by this instances model, which lets one project target multiple browsers cleanly.

\`\`\`typescript
// BEFORE (Vitest 3): single-browser experimental config
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

\`\`\`typescript
// AFTER (Vitest 4): instances-based browser config
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

Each entry in \`instances\` can carry its own launch options, so you can, for example, run Chromium headed and WebKit headless in the same project. Make sure the matching provider package is installed (\`@vitest/browser\` plus your Playwright or WebdriverIO dependency). If you previously imported browser utilities from a deep path, check the new public entry points, as several were consolidated. For end-to-end browser testing beyond component tests, our [Playwright complete guide](/blog/playwright-e2e-complete-guide) covers the full-page automation story.

## Step 5: Replace Removed and Renamed APIs

Vitest 4 removes a batch of APIs that were deprecated across the 3.x line. Sweep your test files for these and update them. Most are mechanical find-and-replace edits.

| Removed / changed (v3) | Replacement (v4) | Notes |
|---|---|---|
| \`vi.mocked(x, true)\` deep boolean | \`vi.mocked(x, { deep: true })\` | Pass an options object |
| \`spy.mockReset()\` clearing impl differently | Aligned with Jest semantics | Re-verify reset behavior |
| \`environment: 'happy-dom'\` auto-install | Explicit dependency required | \`npm i -D happy-dom\` |
| \`test.concurrent\` implicit defaults | Explicit \`concurrent\` config | Set in config or per-suite |
| Deprecated \`vi.advanceTimersByTimeAsync\` edge cases | Standardized fake-timers API | Use \`vi.useFakeTimers()\` flow |
| \`--segfault-retry\` CLI flag | Removed | No longer needed |
| Snapshot default format tweaks | New serializer defaults | Re-run and commit updated snapshots |

A particularly common one: if you relied on \`happy-dom\` or \`jsdom\` being auto-installed, Vitest 4 expects you to declare the environment package explicitly as a dependency. Add it to \`devDependencies\` so CI does not fail with a missing-module error.

\`\`\`bash
npm install -D happy-dom    # or: npm install -D jsdom
\`\`\`

Snapshots also deserve attention. The serializer defaults shifted slightly, so a handful of snapshots may report differences on the first Vitest 4 run. Inspect the diffs to confirm they are formatting-only, then update with \`vitest run -u\` and commit the regenerated files in a dedicated commit so reviewers can see it was a serializer change, not a behavior change.

\`\`\`bash
npx vitest run -u    # update snapshots after confirming diffs are cosmetic
\`\`\`

## Step 6: Review New Defaults and Pool Behavior

Beyond outright breaking changes, Vitest 4 ships new defaults that can subtly alter behavior. The test pool and isolation defaults were tuned for the modern \`forks\` pool, and pool-related options were consolidated. If you had custom \`poolOptions\`, verify they still apply under the new naming.

\`\`\`typescript
export default defineConfig({
  test: {
    pool: 'forks',           // forks is the robust default
    poolOptions: {
      forks: {
        singleFork: false,   // parallel by default
      },
    },
    isolate: true,           // per-file isolation; keep on unless you measured a need to disable
  },
});
\`\`\`

Keep \`isolate: true\` unless you have a measured performance reason to disable it; isolation prevents cross-file state leakage, the same principle that keeps any test suite reliable (see [fixing flaky tests](/blog/fix-flaky-tests-guide)). If you disable isolation for speed, expect to hunt down global-state bugs in exchange.

## Step 7: Run, Verify, and Lock In

With every step applied, run the full suite, the coverage report, and any browser tests to confirm green across the board. Then commit the migration as a focused changeset so it is easy to review and revert if needed.

\`\`\`bash
npx vitest run --coverage          # unit + coverage
npx vitest run --project browser   # browser instances
\`\`\`

In a monorepo, repeat the package bump and config edits for each package, or centralize shared config and reference it from each project entry. The \`projects\` field makes this far cleaner than the old workspace file because top-level \`test\` settings cascade. Wire the final command into CI; our [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) shows the GitHub Actions setup.

## Troubleshooting Common Migration Errors

Even a careful migration throws a few errors on the first run. Here are the ones reported most often and how to resolve each, so you do not lose time guessing.

**"Cannot find module 'happy-dom'" or "'jsdom'".** Vitest 4 stopped auto-installing DOM environment packages. The fix is to add the package explicitly: \`npm install -D happy-dom\` (or \`jsdom\`). This error is the most common single failure after upgrading because many projects never realized the environment was being installed implicitly for them. Once installed, your \`environment: 'happy-dom'\` setting works as before.

**"defineWorkspace is not exported".** You still have an import of \`defineWorkspace\` from \`vitest/config\`, but that helper was removed alongside the workspace feature. Delete the import and the \`vitest.workspace.ts\` file, then move its contents into the \`test.projects\` array as shown in Step 2. There is no drop-in replacement function; the configuration simply moved inline.

**Coverage percentage dropped sharply.** This is almost always the new \`coverage.all: true\` default pulling previously-ignored files into the report. It is not a regression in your tests; it is more files being counted. Add or tighten the \`include\` glob so only your real source files are measured, for example \`include: ['src/**/*.{ts,tsx}']\`, and exclude config, type declarations, and mock data.

**Browser tests fail to launch.** The browser config moved to the \`instances\` array, and the matching provider must be installed. Confirm you have \`@vitest/browser@^4\` plus your provider (\`playwright\` or \`webdriverio\`), and that each browser is listed as an object in \`instances\`. A bare \`browser.name\` string from the v3 config will no longer be recognized.

**Snapshots all show diffs.** The serializer defaults shifted, so cosmetic formatting changes appear. Confirm the diffs are formatting-only, then regenerate with \`vitest run -u\` and commit them separately. If a snapshot diff shows a genuine value change rather than formatting, that is a real test signal, not a migration artifact, so investigate it before updating.

**Type errors after upgrade.** Vitest 4 ships updated TypeScript types. If you reference internal or deep-import types that were consolidated, point them at the public entry points. Also ensure your \`tsconfig\` includes \`"types": ["vitest/globals"]\` if you use the global \`test\`, \`expect\`, and \`describe\` without importing them.

| Error message | Root cause | Fix |
|---|---|---|
| Cannot find module 'happy-dom' | Env package no longer auto-installed | \`npm i -D happy-dom\` |
| defineWorkspace is not exported | Workspace API removed | Move config to \`test.projects\` |
| Coverage dropped unexpectedly | \`coverage.all\` defaults true | Tighten \`include\` glob |
| Browser launch fails | New \`instances\` API + provider | Install provider, use \`instances\` array |
| All snapshots differ | New serializer defaults | Verify, then \`vitest run -u\` |
| Type errors on globals | Updated types | Add \`vitest/globals\` to tsconfig types |

Working through this table resolves the overwhelming majority of first-run failures. If a failure does not match any row, re-read the specific error: Vitest 4's messages are descriptive and usually name the exact option or import that changed.

## Migration Checklist Summary

For quick reference, here is the whole migration condensed:

| # | Step | Key change |
|---|---|---|
| 1 | Prerequisites | Node 20.19+/22.12+, Vite 6+, bump all \`@vitest/*\` to v4 |
| 2 | Workspace | Replace \`vitest.workspace.ts\` with \`test.projects\` |
| 3 | Coverage | \`all\` defaults true; nest thresholds; match coverage-v8 version |
| 4 | Browser mode | Use \`browser.instances\` array with a provider |
| 5 | Removed APIs | Update \`vi.mocked\` options, install env packages explicitly |
| 6 | Defaults | Verify \`pool\`/\`poolOptions\`, keep \`isolate\` on |
| 7 | Verify | Run suite + coverage + browser, regenerate snapshots, commit |

## Frequently Asked Questions

### What are the breaking changes in Vitest 4.0 from Vitest 3?

The main breaking changes are: the \`workspace\` config and \`vitest.workspace.ts\` file are replaced by a \`projects\` field inside \`test\`; browser mode moves to an \`instances\` array with a provider; the v8 coverage provider modernizes and \`coverage.all\` now defaults to true; several deprecated APIs like the boolean form of \`vi.mocked\` are removed; environment packages such as happy-dom must be installed explicitly; and the minimum Node.js version rises to modern LTS.

### How do I migrate from Vitest workspace to projects?

Move the contents of your \`vitest.workspace.ts\` into a \`projects\` array inside the \`test\` block of \`vitest.config.ts\`, then delete the workspace file. Glob strings like \`'packages/*'\` and inline project objects both still work, just relocated. Remove the \`defineWorkspace\` import since it no longer exists, and replace any \`vitest --workspace\` CLI usage with \`--project <name>\` for filtering.

### Does Vitest 4 change coverage configuration?

Yes. Vitest 4 modernizes the v8 coverage provider with more accurate AST-aware remapping, nests thresholds under a \`coverage.thresholds\` object, and changes \`coverage.all\` to default to true so uncovered files are included. You must install \`@vitest/coverage-v8@^4\` to match the Vitest major version. Because \`all\` now includes untouched files, scope reporting with a precise \`include\` glob to avoid unexpected coverage drops.

### How does browser mode change in Vitest 4?

Browser mode in Vitest 4 replaces the single \`browser.name\` field with an \`instances\` array, where each entry describes a browser to run against through a provider such as Playwright or WebdriverIO. This lets one project target Chromium, Firefox, and WebKit simultaneously, each with its own launch options. Install \`@vitest/browser\` plus your chosen provider package, and verify any deep import paths against the consolidated public entry points.

### What Node.js version does Vitest 4 require?

Vitest 4 requires a modern Node.js LTS, specifically Node 20.19 or newer in the 20 line, or 22.12 or newer in the 22 line, and it also requires Vite 6 or newer. Upgrade your Node runtime before bumping Vitest, because an unsupported Node version produces confusing errors that masquerade as configuration problems. Confirm \`node --version\` meets the requirement first.

### Do I need to update my snapshots when migrating to Vitest 4?

Possibly. Vitest 4 adjusts some serializer defaults, so a handful of snapshots may report differences on the first run. Inspect each diff to confirm it is formatting-only rather than a real behavior change, then regenerate with \`vitest run -u\` and commit the updated snapshots in a dedicated commit. Keeping the snapshot update separate makes it clear to reviewers that the change is cosmetic.

### Is Vitest 4 backward compatible with Vitest 3 config?

Mostly, but not fully. Standard test configuration, most matchers, and the core API carry over, so simple projects upgrade with little change. However, monorepo workspace config, browser mode, coverage options, and several deprecated helpers do break and require the edits in this guide. Run your suite immediately after bumping packages; the resulting failures form a precise list of what needs updating.

### Should I migrate from Jest to Vitest or upgrade Vitest 3 to 4?

If you are already on Vitest 3, upgrade to Vitest 4 using this guide rather than considering Jest, since you keep your existing ecosystem and the migration is contained. If you are still on Jest and evaluating a switch, see our Jest vs Vitest comparison and Jest to Vitest migration guide first; Vitest's Vite-native speed and Jest-compatible API make it attractive, but the move is a larger project than a within-Vitest major upgrade.

## Conclusion

Migrating from Vitest 3 to Vitest 4 is a methodical, seven-step process: confirm the new Node and Vite prerequisites and bump packages in lockstep, replace workspace config with the \`projects\` field, modernize coverage and account for \`all\` defaulting to true, move browser mode to the \`instances\` provider model, sweep up removed APIs and explicit environment dependencies, review the new pool and isolation defaults, then run, regenerate snapshots, and commit. Run your suite right after the package bump so the failures guide you, and repeat the config edits per package in a monorepo using the cascading \`projects\` field.

Continue with our [Jest vs Vitest comparison](/blog/jest-vs-vitest-2026), the [Jest to Vitest migration guide](/blog/jest-to-vitest-migration-guide), and the [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions). To have an AI coding agent apply these mechanical changes across your whole repo, browse the skills directory:

\`\`\`bash
npx @qaskills/cli search vitest
\`\`\`

Explore all 450+ testing skills at [qaskills.sh/skills](/skills).
`,
};
