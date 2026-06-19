import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Vitest Config Setup Guide 2026: vitest.config.ts Explained",
  description: "Configure vitest.config.ts in 2026 — test.globals, environment, setupFiles, projects, include/exclude, aliases, and coverage. Copy-paste working configs.",
  date: "2026-06-15",
  category: "JavaScript",
  content: `# Vitest Config Setup Guide 2026: vitest.config.ts Explained

A Vitest config lives in \`vitest.config.ts\` (or inside the \`test\` key of \`vite.config.ts\`) and is created with \`defineConfig\` from the \`vitest/config\` entry point. The minimum you need is an empty \`test\` object — Vitest works with zero configuration. From there you set \`test.globals\` to use \`describe\`/\`it\` without imports, \`test.environment\` to pick \`node\` or \`jsdom\`, \`test.setupFiles\` for per-suite setup, and \`test.projects\` to run multiple environments in one command. This guide shows every important option with a copy-paste config you can ship today.

## The minimum working config

Vitest reads \`vitest.config.ts\`, \`vitest.config.js\`, or \`vitest.config.mts\` at your project root. Because Vitest is built on Vite, it can also read your existing \`vite.config.ts\` — but the dedicated file is clearer once your test settings grow. Always import \`defineConfig\` from \`vitest/config\`, not from \`vite\`, so the \`test\` key is fully typed:

\`\`\`ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // every option below is optional
  },
});
\`\`\`

If you already have a Vite app, you can merge instead of maintaining two files. Use the triple-slash directive so TypeScript knows about the \`test\` field on a \`vite.config.ts\`:

\`\`\`ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
\`\`\`

Run it with \`vitest\` (watch mode) or \`vitest run\` (single pass, the CI default). No \`--config\` flag is needed unless your file has a non-standard name.

## test.globals: skip the imports

By default Vitest is explicit — you import \`describe\`, \`it\`, \`expect\`, and \`vi\` from \`vitest\` in every file. Set \`globals: true\` and those become ambient, matching the Jest developer experience:

\`\`\`ts
export default defineConfig({
  test: {
    globals: true,
  },
});
\`\`\`

There is one extra step for TypeScript users. The globals are not on the global type unless you tell \`tsconfig.json\` about them, otherwise \`expect\` shows as an unknown name:

\`\`\`json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
\`\`\`

With both pieces in place, a test file needs no imports at all:

\`\`\`ts
// math.test.ts — no imports needed when globals: true
describe('add', () => {
  it('sums two numbers', () => {
    expect(1 + 2).toBe(3);
  });
});
\`\`\`

Globals also unlock auto-cleanup integrations. For example, \`@testing-library/react\` registers an automatic \`afterEach(cleanup)\` when it detects a global \`afterEach\`, which only exists when \`globals: true\`.

## test.environment: node vs jsdom vs happy-dom

\`environment\` controls what global APIs exist inside your tests. The default is \`'node'\`, which has no \`document\` or \`window\` — correct for pure logic, API clients, and server code. For component and DOM tests you need a browser-like environment:

| Environment | Package required | Use for | Notes |
|---|---|---|---|
| \`node\` | built-in | server code, utilities, API logic | fastest, the default |
| \`jsdom\` | \`jsdom\` | React/Vue/Svelte component tests | most compatible DOM emulation |
| \`happy-dom\` | \`happy-dom\` | component tests where speed matters | faster than jsdom, slightly less complete |
| \`edge-runtime\` | \`@edge-runtime/vm\` | Vercel/Cloudflare edge functions | emulates the edge global scope |

Set it globally in the config, or override per file with a docblock comment so most of your suite stays on the fast \`node\` environment:

\`\`\`ts
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node', // default for the whole project
  },
});
\`\`\`

\`\`\`ts
/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
// this file gets a DOM; the rest of the suite stays on node
\`\`\`

Remember to install the environment package — \`pnpm add -D jsdom\` or \`pnpm add -D happy-dom\`. A missing package produces a clear "Cannot find module" error at startup.

## test.setupFiles: run code before every test file

\`setupFiles\` points to one or more modules that run before each test file. This is where you register custom matchers, polyfills, or global mocks. The classic example is \`@testing-library/jest-dom\`, which adds matchers like \`toBeInTheDocument\`:

\`\`\`ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});
\`\`\`

\`\`\`ts
// vitest.setup.ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
\`\`\`

Do not confuse \`setupFiles\` with \`globalSetup\`. \`setupFiles\` runs once per test file inside the same environment as your tests (so it can register \`afterEach\` and touch the DOM). \`globalSetup\` runs exactly once for the whole run in a separate context — use it for spinning up a database container or a test server, and return a teardown function:

\`\`\`ts
// global-setup.ts
export async function setup() {
  // start a server / seed a DB once
}
export async function teardown() {
  // shut it down after all tests finish
}
\`\`\`

\`\`\`ts
export default defineConfig({
  test: {
    globalSetup: ['./global-setup.ts'],
  },
});
\`\`\`

## include, exclude, and where Vitest finds tests

By default Vitest matches files like \`**/*.{test,spec}.{js,ts,jsx,tsx}\` and ignores \`node_modules\`, \`dist\`, and \`.idea\`. Override \`include\`/\`exclude\` when your team uses a different convention:

\`\`\`ts
export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
});
\`\`\`

If you want a separate "integration" pass, the cleanest approach in 2026 is \`projects\` rather than juggling globs.

## test.projects: multiple environments in one run

\`projects\` (the modern replacement for the older \`workspace\` file) lets one Vitest command run several configurations — for example a fast \`node\` unit project and a \`jsdom\` component project — each with its own setup, all reported together:

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
          include: ['src/**/*.unit.test.ts'],
        },
      },
      {
        test: {
          name: 'components',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          include: ['src/**/*.component.test.tsx'],
        },
      },
    ],
  },
});
\`\`\`

Each entry is a partial config; settings at the root \`test\` level act as shared defaults. Run a single project with \`vitest --project unit\`. This is far easier to reason about than conditionally swapping environments inside one file.

## Path aliases and TypeScript

If your app uses \`@/\` style imports, Vitest needs the same alias map your bundler uses. The least error-prone option is the \`vite-tsconfig-paths\` plugin, which reads \`paths\` straight from \`tsconfig.json\`:

\`\`\`ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
\`\`\`

Without it, an \`@/utils\` import that compiles fine in your editor will throw "Failed to resolve import" only when Vitest runs.

## A complete, production-ready config

Here is a single config that combines the pieces most React/TypeScript teams want — globals, a DOM environment, setup, aliases, sensible reporters, and coverage:

\`\`\`ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: true, // process imported CSS instead of mocking it
    clearMocks: true, // reset mock.calls between tests automatically
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: { lines: 80, functions: 80, branches: 75 },
    },
  },
});
\`\`\`

\`clearMocks: true\` is a quiet win — it clears mock call history before every test so you do not have to call \`vi.clearAllMocks()\` by hand in every \`beforeEach\`.

## Running in CI

For continuous integration use \`vitest run\` (no watcher) and machine-readable reporters. Vitest exits non-zero when any test fails, which is all most CI providers need:

\`\`\`yaml
# .github/workflows/test.yml
- run: pnpm install
- run: pnpm vitest run --coverage --reporter=default --reporter=junit --outputFile=junit.xml
\`\`\`

The \`junit\` reporter writes a JUnit XML file that GitHub Actions, GitLab, and Jenkins can parse for per-test status. Keep watch mode for local development only.

## Common errors and fixes

- **"expect is not defined" in TypeScript** — you set \`globals: true\` but forgot \`"types": ["vitest/globals"]\` in \`tsconfig.json\`.
- **"document is not defined"** — your test touches the DOM but \`environment\` is still \`node\`. Set it to \`jsdom\`/\`happy-dom\` globally or add the \`@vitest-environment\` docblock.
- **"Failed to resolve import '@/...'"** — missing alias plugin; add \`vite-tsconfig-paths\` or define \`resolve.alias\` manually.
- **Setup matchers not applied** — confirm the setup file is listed in \`setupFiles\` and that you imported \`@testing-library/jest-dom/vitest\` (the \`/vitest\` subpath), not the bare package.
- **Config changes ignored** — you edited \`vite.config.ts\` but Vitest is reading a separate \`vitest.config.ts\`; Vitest prefers the dedicated file when both exist.

For a deeper dive into mocking inside these tests, see the [Vitest vs Jest comparison](/compare), and browse ready-to-install testing setups for AI coding agents at [/skills](/skills). More runner guides live on the [blog](/blog).

## Frequently Asked Questions

### Do I need a separate vitest.config.ts or can I use vite.config.ts?

You can use either. A Vite app can hold the \`test\` key directly in \`vite.config.ts\`, which keeps everything in one file. Once your test settings grow — multiple projects, custom setup, coverage thresholds — a dedicated \`vitest.config.ts\` is clearer, and Vitest prefers it automatically when both files exist.

### How do I enable global describe and expect without imports?

Set \`test.globals: true\` in your config, then add \`"types": ["vitest/globals"]\` to the \`compilerOptions\` in \`tsconfig.json\`. The first makes the APIs ambient at runtime; the second makes TypeScript recognize them so \`expect\`, \`describe\`, and \`vi\` stop showing as undefined names.

### What is the difference between setupFiles and globalSetup?

\`setupFiles\` runs once before each test file, inside the same environment as your tests, so it can register \`afterEach\` hooks and access the DOM — ideal for custom matchers and cleanup. \`globalSetup\` runs exactly once for the entire test run in a separate context, suited to starting a database container or test server and returning a teardown function.

### Which environment should I pick — node, jsdom, or happy-dom?

Use \`node\` (the default) for server code, utilities, and API logic because it is fastest. Use \`jsdom\` for component tests when you want the most complete DOM emulation, or \`happy-dom\` when you want similar coverage with better speed. You can keep the project on \`node\` and switch individual files with a \`@vitest-environment\` docblock comment.

### How do I make @/ path aliases work in Vitest?

Add the \`vite-tsconfig-paths\` plugin to your config so Vitest reads the \`paths\` map from \`tsconfig.json\` automatically. Alternatively, define \`resolve.alias\` manually in the config. Without one of these, aliased imports compile in your editor but fail at test time with a "Failed to resolve import" error.

### How do I run Vitest in CI without watch mode?

Run \`vitest run\` instead of \`vitest\`; the \`run\` subcommand executes a single pass and exits with a non-zero code on failure. Add \`--coverage\` and a machine-readable reporter such as \`--reporter=junit --outputFile=junit.xml\` so your CI provider can ingest per-test results.
`,
};
