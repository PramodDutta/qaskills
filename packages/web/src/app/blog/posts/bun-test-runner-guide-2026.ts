import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Bun Test Runner: Fast JavaScript and TypeScript Testing in 2026',
  description: 'A hands-on bun test runner guide for QA engineers covering bun:test APIs, mocks, coverage, DOM setup, CI reporting, and migration tradeoffs.',
  date: '2026-09-24',
  category: 'Tutorial',
  content: `
# Bun Test Runner: Fast JavaScript and TypeScript Testing in 2026

The Bun test runner is a fast, built-in JavaScript and TypeScript runner executed with \`bun test\` and authored through the Jest-compatible \`bun:test\` API. For QA engineers, its appeal is straightforward: TypeScript runs without a separate transform step, common Jest-style assertions are available, mocks and spies are built in, snapshots work, coverage is integrated, and CI can emit JUnit XML without adding a reporter package.

The correct way to adopt the Bun test runner is not to pretend it is Jest with a different binary. Bun aims for Jest compatibility, and the docs say complete compatibility is a long-term goal, but not everything is implemented. Treat Bun as its own runner with strong Jest ergonomics. You get excellent speed and a small toolchain when your code runs well in the Bun runtime. You need a compatibility check when your suite leans on obscure Jest matchers, custom environments, fake timer edge cases, or Node APIs that behave differently under Bun.

This guide focuses on production QA workflows: file discovery, CLI flags, TypeScript patterns, mocks, \`mock.module\`, coverage thresholds, DOM setup with \`happy-dom\`, JUnit reporting, CI sharding, and migration choices. If you are moving a Jest suite, pair this with the [Jest to Vitest migration guide](/blog/jest-to-vitest-migration-guide). If your biggest risk is type-level behavior and runtime validation, keep the [TypeScript testing patterns guide](/blog/typescript-testing-patterns-guide) nearby.

## The Bun Test Runner Fit

Bun's runner shines when the runtime and package manager are already part of your stack. A backend service using Bun, a TypeScript library validated against Bun, a CLI written for Bun, or a monorepo package with many small unit tests can see immediate simplification. You install fewer packages, start faster, and avoid the transformer stack that often makes AI coding agents wander through config files before they can run one test.

The official docs describe these supported areas: TypeScript and JSX, lifecycle hooks, snapshot testing, UI and DOM testing through compatible libraries, watch mode with \`--watch\`, script preloading with \`--preload\`, mocks, spies, module mocks, and coverage. The runner discovers common test file names and supports file filters, title filters, timeouts, retries, repeats, concurrency, reporters, and coverage configuration through \`bunfig.toml\`.

| Use case | Bun is a strong fit when | Pause when |
|---|---|---|
| Bun backend service | The app already runs on Bun in dev or prod | Production is Node-only and runtime parity is mandatory |
| TypeScript package | You want direct TS test execution | The published contract must be tested across multiple runtimes |
| CLI | Startup time and file IO tests dominate | The CLI depends on Node-specific process behavior |
| React component tests | You can preload \`happy-dom\` and use Testing Library | You need exact browser behavior or Playwright-level fidelity |
| Jest migration | Tests use common \`expect\`, \`describe\`, hooks, and mocks | Tests depend on unimplemented Jest APIs or custom environments |

For QA teams working with AI coding agents, Bun's low ceremony helps. The agent can run \`bun test --test-name-pattern checkout\` without first compiling TypeScript or loading a Babel stack. The tradeoff is that the agent must not invent Jest flags or assume every Jest matcher exists.

## Install, Discover, And Run Tests

The current Bun docs advertise Bun v1.4.2 in the installation header. For test runner behavior, always verify against the docs for the version in your lockfile or CI image, because Bun's runner has moved quickly.

Bun recursively searches for files matching common test patterns:

| Pattern family | Examples | Notes |
|---|---|---|
| \`*.test.*\` | \`cart.test.ts\`, \`api.test.mjs\` | Most common package convention |
| \`*_test.*\` | \`cart_test.ts\` | Useful in repos that avoid dotted names |
| \`*.spec.*\` | \`checkout.spec.tsx\` | Familiar to frontend teams |
| \`*_spec.*\` | \`checkout_spec.ts\` | Supported alternate style |

Supported extensions include JavaScript, TypeScript, JSX, TSX, ESM, CommonJS, MTS, and CTS variants. That breadth is convenient, but consistency still matters. Pick one naming pattern per repo so humans and agents can predict what runs.

\`\`\`bash
# Run all discovered tests.
bun test

# Run test files with "checkout" or "billing" in the path.
bun test checkout billing

# Run one specific file. Use ./ or / so Bun treats it as a path.
bun test ./test/checkout.test.ts

# Run test or suite names matching a regex.
bun test --test-name-pattern "refund"
\`\`\`

The path detail is easy to miss. Bun's docs state that a specific file path should start with \`./\` or \`/\` to distinguish it from a filter string. If your agent runs \`bun test test/checkout.test.ts\`, it may behave like a filter rather than an explicit path. Teach the runner shape once in your repo instructions.

## Write Tests With bun:test Without Hiding Behavior

\`bun:test\` exports \`test\`, \`describe\`, lifecycle hooks, \`expect\`, mocks, spies, and compatibility aliases. Basic tests look familiar to Jest users, but a good QA suite still favors direct behavior checks over vague snapshots of status.

\`\`\`typescript
// test/discount.test.ts
import { describe, expect, test } from 'bun:test';

type Cart = {
  subtotalCents: number;
  customerTier: 'standard' | 'gold';
};

function calculateDiscount(cart: Cart) {
  if (cart.customerTier === 'gold' && cart.subtotalCents >= 10000) {
    return { code: 'GOLD10', discountCents: Math.round(cart.subtotalCents * 0.1) };
  }

  return { code: 'NONE', discountCents: 0 };
}

describe('calculateDiscount', () => {
  test('applies the gold tier discount above the threshold', () => {
    const result = calculateDiscount({
      subtotalCents: 12500,
      customerTier: 'gold',
    });

    expect(result).toEqual({
      code: 'GOLD10',
      discountCents: 1250,
    });
  });

  test('does not discount standard customers', () => {
    const result = calculateDiscount({
      subtotalCents: 12500,
      customerTier: 'standard',
    });

    expect(result.code).toMatch(/^(GOLD10|NONE)$/);
    expect(result.discountCents).toBe(0);
  });
});
\`\`\`

Bun supports async tests and a \`done\` callback. Prefer async functions unless you are testing callback-only code. Async functions produce clearer stack traces and make missing waits easier to review.

\`\`\`typescript
// test/profile-api.test.ts
import { expect, test } from 'bun:test';

async function loadProfile(userId: string) {
  await Promise.resolve();
  return {
    id: userId,
    displayName: 'QA Lead',
    enabled: true,
  };
}

test('loadProfile returns an enabled profile', async () => {
  const profile = await loadProfile('user_42');

  expect(profile.id).toBe('user_42');
  expect(profile.enabled).toBe(true);
  expect(profile.displayName).toHaveLength(7);
});
\`\`\`

What people get wrong: they assume speed compensates for weak assertions. A test that checks only \`response.status === 200\` can run in one millisecond and still miss the broken payload, missing side effect, or wrong event name. Bun's speed is useful because it lets you run more meaningful tests often, not because it makes thin tests valuable.

## Title Filters, Only, Todo, Retry, And Repeat

Bun uses \`--test-name-pattern\` for title filtering, with \`-t\` as an alias. This is not Playwright's \`--grep\`, and it is not Mocha's \`--grep\`. In a polyglot QA repo, the filter flag belongs to the runner, not the language.

| Intent | Bun command or API | QA note |
|---|---|---|
| Run matching names | \`bun test --test-name-pattern "invoice"\` | Accepts a regex pattern |
| Short title filter | \`bun test -t "invoice"\` | Convenient locally |
| Focus a test | \`test.only("name", fn)\` plus \`bun test --only\` | Do not commit focused tests |
| Mark planned work | \`test.todo("name", fn)\` | \`--todo\` reports todos that now pass |
| Retry flakes | \`test("name", fn, { retry: 3 })\` | Use as a quarantine signal, not a cure |
| Stress a test | \`test("name", fn, { repeats: 20 })\` | Docs state repeats runs N+1 total |

\`\`\`typescript
// test/retry-repeat.test.ts
import { expect, test } from 'bun:test';

let attempts = 0;

test(
  'eventually reads from a flaky in-memory source',
  () => {
    attempts += 1;
    expect(attempts).toBeGreaterThanOrEqual(1);
  },
  { retry: 2 },
);

test(
  'id generator always returns a prefixed id',
  () => {
    const id = 'job_' + Math.random().toString(36).slice(2);
    expect(id).toMatch(/^job_[a-z0-9]+$/);
  },
  { repeats: 5 },
);
\`\`\`

Retries can make CI less noisy, but they can also hide a race. If a test needs \`retry\`, open an issue with the observed failure signature, owner, and expiry date. If it needs \`repeats\`, decide whether that stress belongs in every pull request or in a scheduled job.

## Timeouts And Child Process Cleanup

Bun's default per-test timeout is 5000 milliseconds. You can set a timeout with the \`--timeout\` CLI flag or by passing a timeout as the third argument to \`test\`. The docs also note that when a test times out, Bun kills child processes spawned by the test through Bun or Node child process APIs.

\`\`\`typescript
// test/timeout.test.ts
import { expect, test } from 'bun:test';

async function slowButBoundedOperation() {
  await new Promise((resolve) => setTimeout(resolve, 25));
  return 'ready';
}

test(
  'slowButBoundedOperation completes within the service budget',
  async () => {
    await expect(slowButBoundedOperation()).resolves.toBe('ready');
  },
  100,
);
\`\`\`

\`\`\`bash
# Set a suite-wide per-test timeout.
bun test --timeout 10000

# Stop after the first failure.
bun test --bail

# Stop after three failures.
bun test --bail=3

# Re-run each test file to expose file-level flakes.
bun test --rerun-each 3
\`\`\`

Timeouts should reflect service budgets or flake diagnosis, not arbitrary patience. If a unit test needs 30 seconds, it is probably waiting on real IO, leaked timers, or a dependency that should be injected.

## Mocks, Spies, And Module Boundaries

Bun supports function mocks through \`mock()\`, Jest-style \`jest.fn()\`, spies through \`spyOn\`, module mocks through \`mock.module()\`, and a partial \`vi\` alias for teams moving Vitest-style tests. The practical choice is the same as with every runner: mock at the narrowest boundary that proves behavior.

\`\`\`typescript
// test/event-publisher.test.ts
import { expect, mock, test } from 'bun:test';

type Publish = (topic: string, payload: Record<string, unknown>) => Promise<void>;

async function createOrder(orderId: string, publish: Publish) {
  await publish('order.created', {
    orderId,
    source: 'checkout',
  });

  return { id: orderId, status: 'accepted' };
}

test('createOrder publishes the order.created event', async () => {
  const publish = mock(async () => undefined);

  const result = await createOrder('ord_100', publish);

  expect(result).toEqual({ id: 'ord_100', status: 'accepted' });
  expect(publish).toHaveBeenCalledTimes(1);
  expect(publish).toHaveBeenCalledWith('order.created', {
    orderId: 'ord_100',
    source: 'checkout',
  });
});
\`\`\`

Spies are useful when you want to preserve the original behavior and observe it. Restore spies after each test or isolate the object per test so call history cannot leak.

\`\`\`typescript
// test/logger-spy.test.ts
import { afterEach, expect, spyOn, test } from 'bun:test';

const logger = {
  info(message: string) {
    return '[info] ' + message;
  },
};

const spies: Array<{ mockRestore: () => void }> = [];

afterEach(() => {
  while (spies.length > 0) {
    const spy = spies.pop();
    spy?.mockRestore();
  }
});

test('logger.info is called with the import summary', () => {
  const infoSpy = spyOn(logger, 'info');
  spies.push(infoSpy);

  const message = logger.info('imported 3 users');

  expect(message).toBe('[info] imported 3 users');
  expect(infoSpy).toHaveBeenCalledWith('imported 3 users');
});
\`\`\`

Module mocks are a bigger hammer. Bun's docs describe \`mock.module()\` as interacting with both ESM and CommonJS module caches, resolving specifiers like imports, and evaluating the mock factory lazily when the module is imported or required. That makes it powerful for legacy hard imports, but the same caution applies: if a dependency can be passed as an argument, that is usually easier to test.

\`\`\`typescript
// src/clock.ts
export function nowIso() {
  return new Date().toISOString();
}
\`\`\`

\`\`\`typescript
// test/module-clock.test.ts
import { expect, mock, test } from 'bun:test';

mock.module('../src/clock', () => {
  return {
    nowIso() {
      return '2026-09-24T00:00:00.000Z';
    },
  };
});

test('uses a mocked clock module', async () => {
  const clock = await import('../src/clock');

  expect(clock.nowIso()).toBe('2026-09-24T00:00:00.000Z');
});
\`\`\`

That pair of files is intentionally small. In a real suite, keep module mock setup close to the tests that need it. Hidden global mocks are hard for humans to review and easy for agents to cargo-cult into unrelated tests.

## DOM Testing With Preload And happy-dom

Bun does not pretend every test has a DOM. The official DOM testing guide recommends \`happy-dom\` for headless frontend tests and uses Bun's preload feature to register browser globals before tests run.

\`\`\`bash
bun add -d @happy-dom/global-registrator
\`\`\`

\`\`\`typescript
// happydom.ts
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();
\`\`\`

\`\`\`toml
# bunfig.toml
[test]
preload = ["./happydom.ts"]
\`\`\`

Once preloaded, tests can use browser globals such as \`document\` and \`window\`.

\`\`\`typescript
// test/dom-banner.test.ts
import { expect, test } from 'bun:test';

function renderBanner(text: string) {
  const banner = document.createElement('section');
  banner.setAttribute('role', 'status');
  banner.textContent = text;
  document.body.appendChild(banner);
  return banner;
}

test('renderBanner exposes status text', () => {
  document.body.innerHTML = '';

  const banner = renderBanner('Import complete');

  expect(banner.getAttribute('role')).toBe('status');
  expect(document.body.textContent).toContain('Import complete');
});
\`\`\`

The failure mode is usually obvious once you know it: \`ReferenceError: document is not defined\`. Diagnose it by checking whether \`bunfig.toml\` is in the working directory used by CI, whether the preload path is correct, and whether the setup file imports \`GlobalRegistrator\` from \`@happy-dom/global-registrator\`. If tests pass locally but fail in CI, print the working directory before \`bun test\` and confirm the same config is visible.

DOM emulation is not browser automation. Use it for rendering logic, accessible names, simple component states, and event handling. Use Playwright or another browser runner when layout, navigation, CSS behavior, permissions, downloads, cross-origin rules, or actual browser APIs decide correctness.

## Coverage And bunfig.toml Thresholds

Bun has built-in coverage reporting. Use \`--coverage\` to print a coverage report. Configure defaults and thresholds in \`bunfig.toml\`. The docs show \`coverageThreshold\` as either a number or an object with \`lines\` and \`functions\`. They also note a subtle behavior: Bun accepts a \`statements\` key but does not currently enforce it.

\`\`\`bash
bun test --coverage

bun test --coverage --coverage-reporter=lcov
\`\`\`

\`\`\`toml
# bunfig.toml
[test]
coverage = true
coverageReporter = ["text", "lcov"]
coverageDir = "./coverage"
coverageSkipTestFiles = true
coverageThreshold = { lines = 0.85, functions = 0.8 }
\`\`\`

Thresholds are fractions, not percentages. \`0.9\` means 90 percent. The Bun coverage docs also say threshold checks apply when coverage is enabled, and the detailed coverage docs note that outside \`--parallel\`, a run using only the LCOV reporter can exit 0 regardless of threshold. In CI, keep the text reporter enabled alongside LCOV if the threshold is your gate.

| Config or flag | Meaning | QA recommendation |
|---|---|---|
| \`--coverage\` | Generate coverage | Enable in CI and local audit scripts |
| \`coverage = true\` | Turn coverage on by default for tests | Use in packages where coverage is always expected |
| \`coverageReporter = ["text", "lcov"]\` | Emit console plus LCOV | Keeps thresholds visible and CI tools fed |
| \`coverageThreshold = 0.9\` | Lines and functions at 90 percent | Good for small libraries after baseline cleanup |
| \`coverageThreshold = { lines = 0.85, functions = 0.8 }\` | Separate thresholds | Better for services with integration seams |
| \`coverageSkipTestFiles = true\` | Exclude test files from coverage | Usually keep the default |

Coverage should trigger investigation, not number-chasing. If a file is below threshold because an error path lacks tests, add a real error-path test. If a file is below threshold because it is generated, exclude it with intent. If the whole suite is below threshold because the migration just started, set an honest baseline and ratchet it upward as behavior coverage improves.

## Snapshots That Stay Reviewable

Bun supports snapshot testing with \`toMatchSnapshot()\`, and snapshots can be updated with \`--update-snapshots\` or \`-u\`. Snapshots are useful for deterministic serializers, API contract fragments, and UI text structures. They are poor for volatile objects full of timestamps, random IDs, or unrelated implementation details.

\`\`\`typescript
// test/report-snapshot.test.ts
import { expect, test } from 'bun:test';

function buildQaReport() {
  return {
    status: 'ready',
    sections: [
      { title: 'Smoke', count: 12 },
      { title: 'Regression', count: 48 },
    ],
  };
}

test('buildQaReport keeps the public report shape stable', () => {
  expect(buildQaReport()).toMatchSnapshot();
});
\`\`\`

\`\`\`bash
bun test test/report-snapshot.test.ts
bun test --update-snapshots test/report-snapshot.test.ts
\`\`\`

A useful review rule: if the snapshot diff cannot be understood in under a minute, the test is probably snapshotting too much. Split the behavior into explicit assertions, or normalize volatile fields before the snapshot.

## CI With JUnit, Coverage, And Current Actions

Bun can emit JUnit XML with \`--reporter=junit\` and \`--reporter-outfile\`. The docs state that stdout and stderr still receive normal output while the JUnit report is written at the end. That is a nice CI default: humans see progress, CI gets structured results.

\`\`\`yaml
name: bun-test

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: mkdir -p reports coverage
      - run: |
          bun test \\
            --coverage \\
            --coverage-reporter=text \\
            --coverage-reporter=lcov \\
            --reporter=junit \\
            --reporter-outfile=./reports/bun.xml
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: bun-test-results
          path: reports/bun.xml
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: bun-coverage-lcov
          path: coverage/lcov.info
\`\`\`

Artifact names do not contain slashes. Paths can. This distinction matters because many generated workflows use names like \`coverage/bun\`, then fail in CI while the test runner itself did nothing wrong.

For large suites, Bun offers several scaling controls: \`--parallel\` spreads files across CPU cores, \`--concurrent\` makes tests within files concurrent, \`--max-concurrency\` caps that in-file concurrency, \`--shard=i/n\` splits work across machines, and \`--timings\` with \`--update-timings\` supports duration-aware scheduling. Do not turn them all on at once. Increase parallelism only after state leakage is under control.

\`\`\`yaml
name: bun-sharded-test

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v7
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: mkdir -p reports
      - run: |
          bun test \\
            --parallel \\
            --shard=\${{ matrix.shard }}/4 \\
            --reporter=junit \\
            --reporter-outfile=./reports/bun-shard-\${{ matrix.shard }}.xml
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: bun-junit-shard-\${{ matrix.shard }}
          path: reports/bun-shard-\${{ matrix.shard }}.xml
\`\`\`

If \`--parallel\` exposes failures that plain \`bun test\` did not, suspect global state, shared temp paths, process environment mutation, singleton caches, or module-level variables. The fix is isolation, not turning parallelism off forever.

## Concurrency Failure Mode: Shared State Bleed

Here is a realistic failure. A test file uses a module-level array as a fake event sink. Sequential tests pass. \`--concurrent\` fails because both tests mutate the same array.

\`\`\`typescript
// test/shared-state-fixed.test.ts
import { expect, test } from 'bun:test';

function createEventSink() {
  const events: Array<{ type: string; id: string }> = [];

  return {
    publish(event: { type: string; id: string }) {
      events.push(event);
    },
    all() {
      return [...events];
    },
  };
}

test.concurrent('publishes the user event', () => {
  const sink = createEventSink();
  sink.publish({ type: 'user.created', id: 'user_1' });

  expect(sink.all()).toEqual([{ type: 'user.created', id: 'user_1' }]);
});

test.concurrent('publishes the team event', () => {
  const sink = createEventSink();
  sink.publish({ type: 'team.created', id: 'team_1' });

  expect(sink.all()).toEqual([{ type: 'team.created', id: 'team_1' }]);
});
\`\`\`

The diagnosis is not "Bun concurrency is flaky." The original test design shared mutable state. The fixed version creates a fresh event sink per test. The same rule applies to temp directories, fake databases, environment variables, local storage, and Date mocks. Parallel runners reveal coupling that was already present.

## Migrating From Jest Without Magical Thinking

Bun can run many Jest-style suites with little or no code change, especially tests that use \`describe\`, \`test\`, \`expect\`, common matchers, hooks, \`jest.fn\`, and basic spies. The migration guide from Bun specifically calls out replacing \`collectCoverage\` with \`--coverage\`, using \`coverageThreshold\` as a fraction in \`bunfig.toml\`, and using \`happy-dom\` preload for browser-like environments that previously used \`testEnvironment: "jsdom"\`.

| Jest concept | Bun equivalent | Watchpoint |
|---|---|---|
| \`jest.fn()\` | \`mock()\` or \`jest.fn()\` from \`bun:test\` | Prefer one style per repo |
| \`jest.spyOn()\` | \`spyOn()\` from \`bun:test\` | Restore spies between tests |
| \`testEnvironment: "jsdom"\` | \`happy-dom\` preload | Not identical to jsdom or browsers |
| \`collectCoverage\` | \`bun test --coverage\` | Thresholds live in \`bunfig.toml\` |
| \`coverageThreshold: 90\` style thinking | \`coverageThreshold = 0.9\` | Fractions, not whole percentages |
| Custom Jest reporters | \`--reporter=junit\`, \`--reporter=dots\` | Plugin parity may not exist |

A safe migration flow is package by package:

1. Run the existing Jest suite and save the failure-free baseline.
2. Add a Bun script that runs one package, not the entire monorepo.
3. Fix environment setup first: globals, DOM preload, temp paths, test data.
4. Replace unsupported matchers with supported assertions.
5. Compare behavior failures, not just counts.
6. Add CI as non-blocking for a few runs if the package is high risk.
7. Remove Jest only when the Bun job proves the same behavior.

\`\`\`json
{
  "scripts": {
    "test": "bun test",
    "test:ci": "bun test --coverage --reporter=junit --reporter-outfile=./reports/bun.xml",
    "test:watch": "bun test --watch"
  }
}
\`\`\`

Avoid a migration that is only "make the green number reappear." If a matcher is unsupported, rewrite the assertion to be more explicit. If a module mock behaves differently, decide whether the production design should accept an injected dependency. If a jsdom behavior is absent in \`happy-dom\`, decide whether the test belongs in a real browser runner.

## Agent-Friendly Repo Instructions

AI coding agents are productive with Bun when the repo gives them a precise command vocabulary. Put this in your project instructions or testing README:

| Need | Command |
|---|---|
| Run all tests | \`bun test\` |
| Run one file | \`bun test ./test/example.test.ts\` |
| Run one title | \`bun test --test-name-pattern "example"\` |
| Update snapshots | \`bun test --update-snapshots\` |
| Run coverage | \`bun test --coverage\` |
| Produce JUnit | \`bun test --reporter=junit --reporter-outfile=./reports/bun.xml\` |
| Diagnose concurrency | \`bun test\`, then \`bun test --parallel\`, then compare |

Also name the boundaries. For example: "Do not use Playwright \`--grep\` with Bun. Do not add Jest config for Bun-only packages. Keep \`happy-dom\` setup in \`happydom.ts\`. Artifact names cannot contain slashes. Coverage thresholds are fractions." These tiny facts prevent most agent-generated CI churn.

## When Bun Is Not The Right Runner

Choose a different runner when runtime parity matters more than speed. If production runs on Node and your tests exercise Node-specific stream behavior, process flags, loader hooks, or native modules, Node's built-in runner or a Node-based framework may be a better first line. If you need a real browser, use Playwright or WebDriver. If your team depends heavily on Jest ecosystem plugins, make a compatibility inventory before changing the runner.

That is not a knock on Bun. It is a sign of a mature test strategy. The fastest runner is the one that finds the right failures without making developers debug the runner itself.

## Frequently Asked Questions

### Is the Bun test runner compatible with Jest?

Bun provides a Jest-compatible testing API and supports many common Jest patterns, including \`describe\`, \`test\`, \`expect\`, hooks, \`jest.fn\`, spies, snapshots, and module mocks. The official docs still say Bun aims for complete Jest compatibility, not that compatibility is complete today. Treat existing Jest suites as candidates for migration, not guaranteed drop-ins. Run a compatibility pass for matchers, custom environments, fake timers, reporters, and setup files before removing Jest from CI.

### How do I run one Bun test by name?

Use \`bun test --test-name-pattern "pattern"\`, or the short alias \`bun test -t "pattern"\`. The pattern filters test and suite names. To run one file, pass an explicit path that starts with \`./\` or \`/\`, such as \`bun test ./test/checkout.test.ts\`. Do not use Playwright's \`--grep\` or Mocha's \`--grep\` with Bun. Runner-specific flags are one of the easiest places for AI agents to make confident mistakes.

### How should I configure Bun coverage thresholds?

Enable coverage with \`bun test --coverage\` or \`coverage = true\` in \`bunfig.toml\`. Set \`coverageThreshold\` as a fraction, such as \`0.9\` for 90 percent, or use an object like \`{ lines = 0.85, functions = 0.8 }\`. Keep the text reporter enabled in CI if threshold enforcement is your gate, and add LCOV as an additional reporter for coverage services. Bun accepts a \`statements\` threshold key, but the docs say it is not currently enforced.

### Should I use happy-dom or Playwright with Bun?

Use \`happy-dom\` through Bun preload for fast DOM-like unit tests: rendering small components, checking accessible text, dispatching simple events, and validating browser-global-dependent utilities. Use Playwright when correctness depends on an actual browser: layout, CSS, navigation, storage permissions, downloads, focus behavior, cross-origin rules, or real rendering. A healthy stack often uses both. Bun handles fast component and utility checks, while Playwright protects the user journeys that need browser fidelity.
`,
};
