import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Vitest 3 to 4 Migration Guide 2026: Upgrade Without Breaking Your Suite",
  description: "A safe, step-by-step Vitest 3 to 4 migration guide. Bump packages in lockstep, fix config and breaking changes, verify coverage, and roll back cleanly.",
  date: "2026-06-15",
  category: "Testing",
  content: `# Vitest 3 to 4 Migration Guide 2026: Upgrade Without Breaking Your Suite

To migrate from Vitest 3 to 4 safely: (1) get your suite fully green on Vitest 3 first and pin the exact current version, (2) read the official Vitest 4 migration guide for your target release, (3) bump \`vitest\` **and every** \`@vitest/*\` package to the same v4 major in lockstep, updating \`vite\` if a peer warning demands it, (4) run the suite **without** \`--update\` and fix config + breaking-change failures, then (5) re-run coverage and your CI matrix to verify. Branch the change so rollback is one \`git revert\`.

That is the whole playbook. The rest of this guide expands each step, shows the config patterns that change across major versions, and gives you a symptom-to-fix table for when something explodes.

## Why a major upgrade needs a process

Minor and patch Vitest releases are safe to take continuously. A **major** version (3 → 4) is the one release line where the maintainers are allowed to remove deprecated options, change defaults, rename config keys, and bump peer-dependency floors. That is exactly why you should not treat it like a routine \`pnpm up\`.

The good news: Vitest's public test APIs — \`describe\`, \`it\`/\`test\`, \`expect\`, and the \`vi\` mocking helpers — are deliberately stable across majors. The friction in almost every real upgrade lives in three places:

1. **\`vitest.config.ts\`** — a renamed or removed option.
2. **Peer dependencies** — \`vite\` and the \`@vitest/*\` plugins drifting out of sync.
3. **A handful of behavioral defaults** — coverage, environment, or pool settings that changed.

Knowing where the pain concentrates lets you move fast without flying blind.

> Accuracy note: this guide is written to be correct for *any* Vitest major upgrade, including 3 → 4. Where a specific v4 detail depends on your exact target release, I say so explicitly and point you at the official migration guide. Do not trust a blog post (including this one) over the changelog for the precise version you are installing.

## Pre-upgrade checklist

Do not skip this. Five minutes here saves an afternoon of bisecting later.

- [ ] **Pin and record your current version.** Run \`npx vitest --version\` and note it. If you ever need to roll back, this is the number you return to.
- [ ] **Get a fully green suite on Vitest 3 first.** Never start a framework upgrade with failing or flaky tests — you will not be able to tell new failures from pre-existing ones.
- [ ] **Commit a clean working tree.** The upgrade should be its own diff on its own branch.
- [ ] **Check Node.js support.** Major Vitest releases routinely raise the minimum Node version. Confirm your local Node, your CI image, and any Docker base images all satisfy the new floor before you start.
- [ ] **Read the official Vitest 4 migration guide and changelog.** This is the single most important step. The migration guide lists every breaking change with before/after examples. Open it in a tab and keep it there.
- [ ] **Inventory your \`@vitest/*\` packages.** List everything: \`@vitest/coverage-v8\` or \`@vitest/coverage-istanbul\`, \`@vitest/ui\`, \`@vitest/browser\`, plus any related Vite plugins. They all need to move together.
- [ ] **Note your current coverage numbers.** You will compare against these after the upgrade to make sure the coverage provider still instruments the same files.

If you are upgrading in a team repo, do this on a branch and let CI be the judge — never push the bump straight to your trunk.

## Step 1 — Bump every Vitest package in lockstep

The most common upgrade failure is a **mixed-major install**: \`vitest@4\` alongside a leftover \`@vitest/coverage-v8@3\`. The \`@vitest/*\` packages share internals with the core runner and are versioned together. They must all be on the same major.

Bump them in one command so the lockfile resolves a consistent set:

\`\`\`bash
# pnpm
pnpm add -D vitest@^4 \\
  @vitest/coverage-v8@^4 \\
  @vitest/ui@^4

# npm
npm install -D vitest@^4 @vitest/coverage-v8@^4 @vitest/ui@^4

# yarn
yarn add -D vitest@^4 @vitest/coverage-v8@^4 @vitest/ui@^4
\`\`\`

Only include the packages you actually use. If you are on the Istanbul coverage provider, swap in \`@vitest/coverage-istanbul@^4\`. If you use browser mode, add \`@vitest/browser@^4\` (see the browser section below).

After installing, verify there is exactly one Vitest major in the tree:

\`\`\`bash
# Should show only v4.x entries
npm ls vitest @vitest/coverage-v8 @vitest/ui

# pnpm equivalent
pnpm why vitest
\`\`\`

### Keep Vite in range

Vitest is built on Vite and declares a peer-dependency range for it. A Vitest major bump often raises that range. If your install logs a peer warning about \`vite\`, update Vite to a compatible version:

\`\`\`bash
pnpm add -D vite@latest
\`\`\`

In a monorepo, make sure every workspace package resolves the **same** \`vite\` and \`vitest\` versions — duplicated copies in different \`node_modules\` are a classic source of "works in package A, breaks in package B" errors. Check the official guide for the exact Vite floor your Vitest 4 release requires.

## Step 2 — Migrate the config

Open \`vitest.config.ts\` (or the \`test\` block of your \`vite.config.ts\`) and reconcile it against the migration guide. Here is a representative modern config and the patterns that tend to move across majors.

\`\`\`ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom', // 'node' | 'jsdom' | 'happy-dom'
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],

    // Worker pool: 'threads' | 'forks' | 'vmThreads' | 'vmForks'
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: false },
    },

    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**'],
    },
  },
});
\`\`\`

### The \`workspace\` → \`projects\` evolution

If you run multiple test configurations from one repo (for example, a \`node\` project and a \`jsdom\` project, or per-package setups in a monorepo), Vitest's multi-config story has been consolidating under a \`projects\` model. Older setups used a separate \`vitest.workspace.ts\` file; newer Vitest expresses the same idea via a \`test.projects\` array inside the root config:

\`\`\`ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
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
        },
      },
    ],
  },
});
\`\`\`

If you still have a \`vitest.workspace.ts\`, check whether your target v4 release wants it migrated into \`projects\`. The migration guide will tell you whether the old file is deprecated, removed, or still accepted. Do not guess — confirm against the docs for your exact version.

### Renamed and removed options

When a config option is removed in a major, Vitest typically either throws on startup with a clear message or silently ignores the key. The general pattern to handle this:

- Run the suite once right after the bump. **Read the startup output.** Vitest usually names the offending option and the replacement.
- For anything ambiguous, search the migration guide for the option name. Removed keys are documented with their successor.
- Pay attention to anything under \`deps\` (inline/external handling has been reorganized over several releases), \`environmentOptions\`, and reporter configuration — these are the areas most likely to have churned.

### Pool and environment settings

\`test.pool\` selects the worker isolation strategy (\`forks\`, \`threads\`, and the VM variants), and \`test.poolOptions\` tunes it. Defaults here can shift between majors, which occasionally changes how tests that rely on shared module state or global mutation behave. If tests that passed serially start failing under the new default, try pinning \`pool\` explicitly and, if needed, \`poolOptions.<pool>.singleFork\`/\`singleThread\` to reproduce the old isolation, then investigate the real cause rather than leaving it pinned forever.

The \`environment\` option (\`node\`, \`jsdom\`, \`happy-dom\`) is stable in name. If you use \`happy-dom\` or \`jsdom\`, those are **separate packages** with their own release cadence — upgrading Vitest may make a new version of them advisable, so check for peer warnings there too.

## Step 3 — Coverage provider notes

Coverage is the area where teams most often see a *number* change after an upgrade, even when no tests fail.

- **\`@vitest/coverage-v8\`** uses V8's built-in instrumentation. It is fast and the common default. Across majors, the underlying remapping logic can change subtly, which may nudge line/branch percentages even though your code did not.
- **\`@vitest/coverage-istanbul\`** uses Istanbul instrumentation. It is sometimes preferred for stricter or more familiar reports.

Whichever you use, it **must** be on the same major as \`vitest\`. After upgrading, regenerate coverage and compare against the baseline you recorded in the checklist:

\`\`\`bash
npx vitest run --coverage
\`\`\`

If your CI enforces coverage thresholds, expect that you may need to re-baseline the numbers slightly. A small delta after a major V8 upgrade is normal; a large drop usually means the \`coverage.include\`/\`exclude\` globs no longer match — re-check those globs against the migration guide, since their defaults can change.

## Step 4 — Browser mode

Vitest's **browser mode** (running tests in a real browser via \`@vitest/browser\`) is the most actively evolving part of the project, and its config shape has changed more than once across releases. Because of that, I will describe it generally rather than assert a specific v4 schema.

The pieces you will be reconciling:

- The **provider** that drives the browser (Playwright- or WebDriverIO-backed).
- The **\`test.browser\`** config block — \`enabled\`, \`headless\`, and how individual browser **instances**/targets are declared. The exact key names for declaring browsers have shifted between versions.
- The companion packages — your browser provider (\`playwright\` / \`webdriverio\`) need to be installed and compatible.

A representative shape looks like this, but **confirm the precise keys against the Vitest 4 browser-mode docs** for your release:

\`\`\`ts
// vitest.config.ts (browser mode — verify keys against the official guide)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      // How individual browsers are declared has changed across
      // versions — check the migration guide for the current syntax.
      instances: [{ browser: 'chromium' }],
    },
  },
});
\`\`\`

If browser mode is central to your suite, read its dedicated migration notes before you upgrade, and budget extra time. Our [Vitest browser mode complete guide](/blog/vitest-browser-mode-complete-guide) covers the setup end to end.

## Step 5 — Mocking API stability

This is the reassuring part. The \`vi\` namespace — \`vi.mock\`, \`vi.fn\`, \`vi.spyOn\`, \`vi.stubGlobal\`, timers, and friends — is intentionally stable across majors. In most upgrades you will not touch a single mock.

That said, "stable API" does not guarantee "identical behavior in every edge case." Hoisting rules for \`vi.mock\`, automatic-mock generation, and module-reset semantics occasionally get refined. If a previously passing mock starts misbehaving after the bump:

- Re-read the \`vi.mock\` and \`vi.hoisted\` sections of the migration guide for any noted behavior changes.
- Confirm the mock factory is not depending on something the new hoisting order moved.

For a deep dose on the mocking surface, see our [complete guide to vi.mock](/blog/vitest-mocking-vi-mock-complete-guide). If you are still deciding between frameworks before committing to the upgrade, our [Jest vs Vitest comparison](/blog/jest-vs-vitest-2026) lays out the tradeoffs.

## The upgrade-and-verify runbook

Run this top to bottom on a dedicated branch.

\`\`\`bash
# 0. Branch and confirm a clean, green starting point
git checkout -b chore/vitest-4-upgrade
npx vitest --version            # record this number
npx vitest run                  # must be fully green BEFORE you upgrade

# 1. Bump vitest + all @vitest/* together (adjust to your packages)
pnpm add -D vitest@^4 @vitest/coverage-v8@^4 @vitest/ui@^4
pnpm add -D vite@latest         # only if a peer warning asks for it

# 2. Sanity-check a single, consistent major in the tree
pnpm why vitest

# 3. Run WITHOUT --update so snapshots are not silently overwritten
npx vitest run

# 4. Fix startup/config errors first, then test failures.
#    Re-run after each fix.

# 5. Verify coverage against your recorded baseline
npx vitest run --coverage

# 6. Run the full CI matrix locally if you can (all Node versions)
\`\`\`

Why \`--update\` off in step 3? Running with snapshot updates enabled during a major upgrade will happily rewrite snapshots to match any *new* (possibly wrong) output, hiding genuine regressions. Update snapshots deliberately, only after you understand why they changed.

When everything is green, commit, push the branch, and let CI confirm before you merge.

### Rollback

Because the upgrade is an isolated diff, rollback is trivial:

\`\`\`bash
git checkout -- package.json pnpm-lock.yaml   # discard the bump
pnpm install                                  # restore the old tree
# or, if already committed:
git revert <upgrade-commit-sha>
\`\`\`

This is the entire reason to keep the bump on its own branch and commit. Never interleave the framework upgrade with feature work.

## Symptom → cause → fix

| Symptom | Likely cause | Fix |
|---|---|---|
| \`Cannot find module\` for a \`@vitest/*\` package, or version mismatch error on startup | Mixed Vitest majors (e.g. \`vitest@4\` + \`@vitest/coverage-v8@3\`) | Bump **all** \`@vitest/*\` packages to the same major; run \`pnpm why vitest\` to confirm one version |
| Peer-dependency warning mentioning \`vite\` | Vitest 4 raised its Vite peer floor | \`pnpm add -D vite@latest\`; confirm the required range in the migration guide |
| Vitest throws "unknown option" / option ignored at startup | A config key was renamed or removed in v4 | Read the startup message; look up the option in the migration guide and replace it |
| Multi-config / workspace setup no longer recognized | \`workspace\` model moved to \`projects\` | Migrate \`vitest.workspace.ts\` into \`test.projects\` per the docs |
| Coverage percentage moved with no code change | V8 remapping or default include/exclude changed | Re-baseline thresholds; verify \`coverage.include\`/\`exclude\` globs still match |
| Browser-mode tests fail to launch or config rejected | Browser-mode config shape changed across versions | Re-read browser-mode migration notes; update provider package + \`test.browser\` keys |
| Tests pass alone but fail together (or vice versa) after upgrade | Default \`pool\`/isolation changed | Pin \`pool\` and \`poolOptions\` to reproduce old behavior, then fix the real shared-state issue |
| Snapshots all "updated" and suddenly green | Ran with \`--update\` during the upgrade | Revert snapshot changes; re-run with \`--update\` off and review diffs manually |
| Works locally, breaks in CI | Node version below the new minimum | Bump the Node version in your CI/Docker images to meet v4's floor |

## A note on AI coding agents

If you let an AI agent perform the upgrade, give it the same guardrails you would give a junior engineer: a green starting suite, the official migration guide as context, and an explicit instruction to bump every \`@vitest/*\` package in lockstep and **not** run with \`--update\`. Curated, framework-specific testing instructions help agents avoid the mixed-major trap and other footguns. Browse the [QASkills skills directory](/skills) for Vitest and broader testing skills you can drop into Claude Code, Cursor, and other agents.

## Frequently Asked Questions

### Will my Vitest 3 tests break in 4?

Most of them will pass untouched. The core test APIs (\`describe\`, \`it\`, \`expect\`, \`vi.*\`) are stable across majors, so individual test bodies rarely need changes. What usually needs updating is your \`vitest.config.ts\` (a renamed or removed option), peer dependencies like \`vite\`, and occasionally a default such as coverage or pool behavior. Always confirm specifics against the official Vitest 4 migration guide for your exact version.

### How do I upgrade from Vitest 3 to 4?

On a clean branch, get your suite fully green first, then bump \`vitest\` and every \`@vitest/*\` package (coverage, ui, browser) to the same v4 major in one install, updating \`vite\` if a peer warning asks. Run \`vitest run\` without \`--update\`, fix config and breaking-change failures, then re-run with \`--coverage\` and your CI matrix to verify.

### Do I need to upgrade Vite when I upgrade Vitest?

Often, yes. Vitest declares a peer-dependency range for Vite, and a major Vitest release frequently raises that floor. If your package manager logs a peer warning about \`vite\` after the bump, update Vite to a compatible version. Check the migration guide for the exact range your Vitest 4 release requires.

### Why do all my \`@vitest/*\` packages need the same version?

Packages like \`@vitest/coverage-v8\`, \`@vitest/ui\`, and \`@vitest/browser\` share internals with the core runner and are released together. A mixed-major install (for example \`vitest@4\` with \`@vitest/coverage-v8@3\`) is the single most common upgrade failure and produces module-resolution or version-mismatch errors. Bump them all in one command and verify with \`pnpm why vitest\` or \`npm ls vitest\`.

### Did the mocking API (vi.mock) change in Vitest 4?

The \`vi\` mocking surface is intentionally stable across majors, so in most upgrades you will not touch your mocks at all. Edge cases around hoisting and module-reset semantics can be refined between versions, so if a previously passing mock misbehaves, re-read the \`vi.mock\`/\`vi.hoisted\` notes in the migration guide. For a full walkthrough, see our complete guide to vi.mock.

### How do I roll back if the Vitest 4 upgrade goes wrong?

Keep the upgrade as a single isolated commit on its own branch. To undo it, discard the changes to \`package.json\` and your lockfile and reinstall, or \`git revert\` the upgrade commit if it is already committed. Because no feature work is mixed in, rollback is a one-step operation and your suite returns to its known-good Vitest 3 state.
`,
};
