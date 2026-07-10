import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest Workspace Testing for Monorepos',
  description:
    'Vitest workspace testing guide for monorepos: isolate packages, share setup safely, run targeted suites, and keep CI fast without hiding failures.',
  date: '2026-07-10',
  category: 'Guide',
  content: `# Vitest Workspace Testing for Monorepos

A monorepo test run usually fails in the least helpful place: a shared utility passes alone, a React package passes alone, then the root command reports a resolver error from a package you did not touch. Vitest workspaces give you a way to make those boundaries explicit. Each package can keep its own environment, aliases, setup files, and coverage behavior while still being executed from one root command.

The practical goal is not a prettier config file. The goal is to make package ownership visible in the test runner. A UI package should not inherit Node-only setup by accident. A database helper should not boot jsdom. A shared validation library should run fast and clean, without paying for browser mocks it never uses. If you are still deciding between runners, compare the tradeoffs in [Jest vs Vitest in 2026](/blog/jest-vs-vitest-2026). If you need the single-package starting point first, use the baseline in [Vitest config setup guide](/blog/vitest-config-setup-guide-2026).

## Mapping packages to Vitest projects without flattening their behavior

Vitest workspace mode lets a root config point at multiple project configs. In a pnpm, npm, Yarn, or Turborepo repository, that usually means each package owns a small Vitest config next to its source, and the root file only discovers them. Keep the root boring. Put environment choices, test setup, and local aliases inside the package that actually needs them.

That separation matters once packages use different runtimes. A React component library might need jsdom and Testing Library cleanup. A CLI might need the Node environment, real timers, and filesystem fixtures. A shared schema package may not need any setup. If the root config tries to express all of those in one object, the strictest package wins and every other package inherits cost or fragility.

Here is a workspace layout that stays readable after the tenth package:

| Path | Vitest role | Environment | What should live there |
|---|---|---|---|
| \`packages/shared/vitest.config.ts\` | Pure library project | node | Schema, parser, and utility tests |
| \`packages/web/vitest.config.ts\` | Component and route helper project | jsdom or node split | React setup, DOM matchers, browser API mocks |
| \`packages/cli/vitest.config.ts\` | Command behavior project | node | Temporary directories, process output helpers |
| \`vitest.workspace.ts\` | Root project list | none | Project references only, no package-specific setup |

The root file can use explicit paths. That is less magical than globbing, and it prevents a sample package from joining CI just because it contains a config file.

\`\`\`ts
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/shared/vitest.config.ts',
  'packages/cli/vitest.config.ts',
  'packages/web/vitest.config.ts',
]);
\`\`\`

Then each package keeps a normal Vitest config. This example is deliberately Node-only. It does not know about React, jsdom, or browser globals.

\`\`\`ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'shared',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: false,
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/shared',
    },
  },
});
\`\`\`

For a web package, use a different project name and setup file. The point is not to standardize every package into the same runtime. The point is to standardize how each package declares what it needs.

\`\`\`ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    name: 'web',
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/web',
    },
  },
});
\`\`\`

## Package isolation is a test design constraint, not only a config concern

Workspace projects reveal coupling that was already there. If a package test imports through another package source path instead of its public entrypoint, Vitest can still run it, but the test is now documenting a private dependency. In a monorepo that becomes painful when refactors land. The dependency graph says one thing, the tests say another.

Prefer testing package contracts through the same path consumers use. For internal packages, that may be the package name exposed through workspace protocol dependencies. If a test needs deep access, make that choice visible with a local test helper, not a random import path buried in the test body.

Isolation also changes fixture design. Shared fixtures are tempting, especially when every package needs users, orders, or configuration objects. But a root test helper can quietly pull in transitive dependencies and make a pure package heavier. Keep fixtures close to the package unless they represent a domain object truly shared across packages.

| Isolation smell | What it usually means | Better monorepo move |
|---|---|---|
| A package imports from \`../../other/src\` | Tests depend on implementation location | Import from the package entrypoint or add an explicit test utility export |
| Root setup mocks \`fetch\` for every project | Browser assumptions leaked into Node suites | Put the mock in only the projects that need it |
| One coverage folder receives all reports | Ownership is unclear when thresholds fail | Write project-specific reports and merge later if needed |
| All packages share one \`include\` glob | Package test naming conventions are being guessed | Declare includes per project so intent is local |

## Running only the packages affected by a change

Vitest workspaces do not replace Turborepo, pnpm filters, or a changed-files strategy. They give the test runner a project map. Your CI still needs to decide which commands to run. In small repositories, running the root workspace command is acceptable. In larger repositories, run package scripts through the monorepo orchestrator so cache keys and dependency order remain consistent.

For local work, developers usually need two modes: the exact package they are editing, and the whole workspace before pushing. A package script keeps the first path short:

\`\`\`json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
\`\`\`

At the root, point Vitest at the workspace file. If your repository already uses Turbo, let Turbo call package scripts. If you want a direct root command, keep it explicit:

\`\`\`json
{
  "scripts": {
    "test:vitest": "vitest --workspace vitest.workspace.ts",
    "test:vitest:watch": "vitest --workspace vitest.workspace.ts --watch"
  }
}
\`\`\`

The safest CI pattern is to build dependencies first, then run tests in dependency order. That is not because Vitest cannot import TypeScript. It is because published package boundaries often depend on generated declaration files, compiled entrypoints, or exports maps. If production consumers use built output, at least one CI path should test against that reality.

## Sharing setup without creating a hidden global test framework

Shared setup is useful when it is boring: matchers, deterministic timezone, fake console guards, or a helper that cleans temporary directories. It becomes harmful when it secretly changes network, clock, environment variables, or module resolution for every package. In workspace mode, a shared setup file should be imported deliberately by projects that need it.

For example, a CLI package can use a setup file that creates a temporary home directory and restores environment variables after each test. That does not belong in a UI package.

\`\`\`ts
import { afterEach, beforeEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let oldHome: string | undefined;
let tempHome: string;

beforeEach(() => {
  oldHome = process.env.HOME;
  tempHome = mkdtempSync(join(tmpdir(), 'cli-home-'));
  process.env.HOME = tempHome;
});

afterEach(() => {
  process.env.HOME = oldHome;
  rmSync(tempHome, { recursive: true, force: true });
  vi.restoreAllMocks();
});
\`\`\`

That setup is real Vitest code, but it is intentionally narrow. It manipulates the environment only for a package that needs home-directory behavior. A web package should have its own setup with DOM matchers and cleanup. A shared package should often have no setup at all.

## Resolver alignment with TypeScript, Vite, and package exports

Most monorepo Vitest failures are not assertion failures. They are resolver disagreements. TypeScript sees a path alias. Vite sees an alias. Node sees an exports map. The package manager sees workspace symlinks. When those disagree, the test runner becomes the first place the mismatch is obvious.

Avoid relying on a root alias that means different things in different packages. If \`@\` points to the web source in one package and shared source in another, keep those aliases inside the package configs. Do not define \`@\` once at the workspace root and expect every project to interpret it politely.

Exports maps deserve special attention. A package can pass source-level tests while shipping an exports map that hides the same module from consumers. Add a small set of tests that import from the public package name. That gives you confidence that the package can be consumed through the contract it advertises.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { parseSkillMd } from '@qaskills/shared';

describe('public package entrypoint', () => {
  it('exports the markdown parser used by downstream packages', () => {
    expect(typeof parseSkillMd).toBe('function');
  });
});
\`\`\`

This kind of test looks almost too small, but it catches broken package exports, missing build artifacts, and accidental private-only imports.

## Coverage thresholds per package, not per repository ego

A single root coverage threshold can hide risk. A stable shared parser package may deserve a high branch threshold. A fast-moving UI package with mostly presentational components may use a different gate while it matures. The threshold should reflect risk and current test strategy, not a number chosen because it looks responsible in a dashboard.

Vitest lets each project configure coverage. Use that to make package owners accountable for their own surface area. Store reports separately, then merge them in a reporting job if leadership wants one repository number. The source of truth for enforcement should remain close to the package.

Coverage also interacts with workspaces through include and exclude patterns. If a package includes generated files, fixture builders, or test-only command wrappers in coverage, the signal gets noisy. Keep exclusions specific and reviewed. Broad exclusions such as \`src/lib/**\` usually mean the package design is avoiding test pressure.

## Flake control when projects run in parallel

Workspace runs can make hidden shared state visible. Two packages may write to the same temporary path. Two suites may bind the same port. A global environment variable can be changed by one project while another project is still running. Vitest is fast because it uses workers, and workers punish tests that assume the whole machine belongs to them.

Use per-test temporary directories, random available ports, and package-specific caches. If a suite must run serially, mark the narrow test group rather than slowing the entire workspace. The more precise you are, the easier it is to preserve Vitest speed.

Watch mode has its own trap. A package-local watch command should usually run from the package directory. A root watch command is useful for cross-package refactors, but it can be expensive in repositories with generated files or large fixture folders. Tune watch exclusions before blaming Vitest for seeing too much.

## A rollout path for existing monorepos

Do not convert every package in one pull request unless the repository is small. Start with one pure package and one runtime-heavy package. That pair will expose the decisions you need: Node versus jsdom, package-level setup, resolver aliases, and coverage locations. Once those conventions are proven, add the next group.

Keep old scripts during the transition. Developers should not lose the ability to run tests while workspace config is still settling. When package scripts and root workspace execution agree for a few days, remove the obsolete path.

The migration is also a chance to delete fake shared setup. If a root file exists only because the old runner needed one place for everything, split it. If helpers are truly common, put them in a test utilities package with a public API. If they are not, move them home.

## Debugging project selection when a workspace run surprises you

When a developer says "Vitest ran the wrong tests", the cause is usually one of three things: the package script was executed from the wrong directory, the workspace file included more projects than expected, or a package-level include glob matched generated files. Treat project selection as a debugging target, not a mystery.

First, verify which command is actually running. In monorepos, \`pnpm test\`, \`pnpm --filter package test\`, \`turbo test\`, and \`vitest --workspace\` can all be valid, but they do not mean the same thing. A package filter asks the package manager or orchestrator to select packages. A Vitest workspace asks the runner to select projects from its own list. Combining both can be powerful, but only if the team knows which layer is responsible.

Second, check project names in output. A good project name is short and maps to a package. Names such as \`unit\` or \`test\` are less useful when a root run includes ten projects. If the output says \`web\` failed, the owner should be obvious.

Third, keep generated test artifacts away from normal includes. Code generation, OpenAPI clients, and copied fixtures can accidentally create files ending in \`.test.ts\`. A package-level include pattern such as \`src/**/*.test.ts\` is safer than a root-level pattern that scans every folder.

## Snapshot and fixture ownership in Vitest workspaces

Snapshots become awkward when they float between packages. A UI package snapshot belongs near the component that produced it. A CLI snapshot belongs beside the command test. Root snapshot folders make review harder because the diff no longer tells you which package behavior changed.

The same rule applies to filesystem fixtures. If a parser package needs malformed YAML examples, store them in that package. If a CLI package needs a fake home directory, create it in the CLI test setup. Shared fixtures are appropriate only when the fixture is part of a shared contract, such as a canonical SKILL.md example used by multiple packages.

One useful convention is to place package fixtures under \`src/test/fixtures\` or \`test/fixtures\` inside the package and never import fixtures through relative paths that cross package boundaries. If two packages need the same fixture, promote it to a small shared test fixture package or export it from the package that owns the contract. That extra ceremony prevents accidental coupling.

Review fixture diffs carefully. A large fixture update can hide a behavior change. In a workspace, the package that owns the fixture should also own the assertion explaining why the fixture changed.

## Frequently Asked Questions

### Should every package in a monorepo have its own Vitest config?

Not always. Tiny packages with identical runtime needs can share a config pattern, but each package should still have a clear project identity. Once a package needs a different environment, setup file, alias, or coverage rule, give it its own config.

### Can Vitest workspace mode replace Turborepo test pipelines?

No. Vitest coordinates test projects inside the runner. Turborepo coordinates package tasks, caching, dependency order, and changed-package execution. Many teams use both: Turbo decides which package scripts run, and each package script uses Vitest.

### How do I prevent jsdom from slowing down Node-only packages?

Put \`environment: 'node'\` in the Node package config and avoid root-level test setup that imports DOM libraries. The jsdom package should declare its own environment locally.

### Where should shared test helpers live?

Start inside the package that needs the helper. Promote it only when at least two packages use the same behavior for the same reason. A shared helper package should be versioned and imported deliberately, not injected through a root setup file.

### Should CI run package tests against source or built output?

Fast feedback can run against source, but at least one CI job should build dependencies and test the public entrypoints that consumers use. That catches exports map mistakes and missing generated files before release.
`,
};
