import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Deno Testing Guide 2026: deno test, Mocking, Coverage, and CI',
  description: 'A practical deno test guide for QA engineers covering Deno.test, mocking, permissions, coverage, CI reports, and reliable AI-agent workflows.',
  date: '2026-09-24',
  category: 'Tutorial',
  content: `
# Deno Testing Guide 2026: deno test, Mocking, Coverage, and CI

\`deno test\` is the right default when your project already runs on Deno, when you want TypeScript execution without a separate transpiler, or when your QA automation needs a small, explicit runner that AI coding agents can operate safely. It is built into the runtime, works with \`Deno.test\`, BDD-style helpers from the standard library, snapshot assertions, coverage, doc tests, permissions, and CI reporters.

The practical payoff is speed of setup and fewer moving parts. A QA engineer can ask Claude Code, Cursor, or Copilot to add a regression test, run a single name with \`--filter\`, tighten permissions, and export JUnit or lcov without teaching the agent a Jest transform stack. The tradeoff is that you must learn Deno's runner vocabulary instead of importing assumptions from Node, Vitest, or Playwright.

This guide is written for test automation engineers who need operational detail: how to structure tests, when to use steps, how to mock time and functions, how to keep permissions honest, how to collect coverage, and how to debug failures that only appear under CI or parallel execution. If you are choosing across JavaScript runners, pair this with the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026). If your immediate problem is writing better TypeScript assertions and fixtures, keep the [TypeScript testing patterns guide](/blog/typescript-testing-patterns-guide) nearby.

## Deno test in 2026: the baseline to verify first

The official Deno 2.x docs describe testing as a first-class runtime feature, not a separate package. Test files can use \`Deno.test()\`, \`Deno.test.each()\`, \`t.step()\`, \`t.assertSnapshot()\`, standard assertions from \`jsr:@std/assert\`, and BDD helpers from \`jsr:@std/testing/bdd\`. The CLI runs tests with \`deno test\`, filters by test name with \`--filter\`, runs files across workers with \`--parallel\`, executes documentation examples with \`--doc\`, and emits built-in reporters including \`pretty\`, \`dot\`, \`junit\`, and \`tap\`.

The current defaults matter. Deno's exit sanitizer is enabled by default, but Deno 2.8 changed resource and async operation sanitizers so they are not globally on unless you opt in. If your team learned Deno testing before that change, add \`sanitizeOps\` and \`sanitizeResources\` deliberately in strict suites, or configure them in \`deno.json\`. Otherwise a leaked timer, response body, file handle, or unawaited async operation can slip through in tests that appear green.

| Testing concern | Deno feature to reach for | QA decision |
|---|---|---|
| Unit tests for pure TypeScript | \`Deno.test\` plus \`@std/assert\` | Use as the default, no framework install needed |
| Grouped setup and teardown | \`t.step()\` or \`@std/testing/bdd\` | Prefer steps for workflow diagnostics, BDD for migrated describe/it suites |
| One test body over many inputs | \`Deno.test.each\` | Use when each case needs separate reporting |
| Examples in API docs | \`deno test --doc\` | Run in CI for exported utilities and SDKs |
| Time-dependent behavior | \`FakeTime\` from \`@std/testing/time\` | Avoid real sleeps and date hacks |
| Function call observation | \`spy\`, \`stub\`, assertion helpers from \`@std/testing/mock\` | Keep mocks local and restore them |
| Coverage gates | \`deno test --coverage\`, \`deno coverage\` | Generate lcov or HTML, set thresholds where useful |

## Start with a runner contract, not scattered commands

Agent-authored tests are more reliable when the repository advertises one obvious contract. Put test commands in \`deno.json\`, pin standard library imports through \`imports\`, and make strict choices visible. Deno can run without a config file, but a config file reduces the number of choices an AI assistant has to infer.

\`\`\`json
{
  "imports": {
    "@std/assert": "jsr:@std/assert",
    "@std/testing/": "jsr:@std/testing/"
  },
  "tasks": {
    "test": "deno test",
    "test:strict": "deno test --sanitize-ops --sanitize-resources",
    "test:watch": "deno test --watch",
    "test:coverage": "deno test --clean --coverage=coverage && deno coverage --detailed coverage"
  },
  "test": {
    "include": ["src/**/*_test.ts", "tests/**/*.test.ts"],
    "exclude": ["tests/fixtures/**"],
    "sanitizeOps": true,
    "sanitizeResources": true
  },
  "coverage": {
    "thresholds": {
      "lines": 85,
      "branches": 75,
      "functions": 85
    }
  }
}
\`\`\`

That example does two important things. First, it uses the Deno runner's own filter and sanitizer language. Second, it prevents accidental test discovery in fixture folders. Without explicit include and exclude rules, a helper file named like a test can register side effects or try to access resources when the suite boots.

When you ask an AI coding agent to add tests, give it the command name and the scope: "Add coverage for \`parseInvoice\` and verify with \`deno task test:strict --filter parseInvoice\`." That phrasing nudges the agent toward Deno's \`--filter\`. It also keeps the agent away from unrelated habits such as Playwright's title grep option, Vitest's title option, or Jest's test-name option.

## Write tests around behavior, then use steps as checkpoints

\`Deno.test\` accepts a name and a function, or an object with options. The test context passed to the function gives you \`t.step()\`, which is particularly useful for workflow tests that are still unit-level. A failed step points to a smaller phase of the scenario without splitting the fixture setup across several independent tests.

\`\`\`typescript
import { assertEquals, assertMatch } from "@std/assert";

type CartLine = {
  sku: string;
  quantity: number;
  priceCents: number;
};

function priceCart(lines: CartLine[]) {
  const subtotalCents = lines.reduce((sum, line) => {
    return sum + line.quantity * line.priceCents;
  }, 0);

  const status = subtotalCents > 0 ? "priced" : "empty";
  return { subtotalCents, status };
}

Deno.test("prices a cart with multiple lines", async (t) => {
  const lines: CartLine[] = [
    { sku: "keyboard", quantity: 1, priceCents: 12900 },
    { sku: "switches", quantity: 2, priceCents: 3500 },
  ];

  let result: ReturnType<typeof priceCart> | undefined;

  await t.step("calculates subtotal", () => {
    result = priceCart(lines);
    assertEquals(result.subtotalCents, 19900);
  });

  await t.step("marks non-empty carts as priced", () => {
    if (!result) {
      throw new Error("priceCart result was not created");
    }

    assertMatch(result.status, /^(priced|empty)$/);
    assertEquals(result.status, "priced");
  });
});
\`\`\`

Notice the guard before the second step compares \`result\`. That is not ceremony. It prevents a misleading failure if setup changes and \`result\` is never assigned. Vacuous assertions are common in generated tests: a loose regex, an \`indexOf\` comparison that forgot to assert \`!== -1\`, or a status check that never proves the side effect happened. Good Deno tests are just as strict about test code as production code.

Use \`Deno.test.each\` when cases deserve separate names and separate retry or filter behavior. Use a loop inside one test only when the cases are part of one invariant and you want a single failure.

\`\`\`typescript
import { assertEquals } from "@std/assert";

function normalizeRole(input: string) {
  return input.trim().toLowerCase().replaceAll(" ", "-");
}

Deno.test.each([
  [" Admin ", "admin"],
  ["QA Lead", "qa-lead"],
  ["release manager", "release-manager"],
])("normalizes role %s", (input, expected) => {
  assertEquals(normalizeRole(input), expected);
});
\`\`\`

## Assertions: choose the narrowest proof

\`@std/assert\` covers the common QA assertions: equality, existence, string inclusion, regex matching, object partial matching, thrown errors, rejected promises, and strict identity. The key is to use the assertion that proves the behavior, not the one that happens to be shortest.

| Assertion job | Prefer | Avoid |
|---|---|---|
| Exact return values | \`assertEquals(actual, expected)\` | Stringifying both sides and comparing text |
| Required optional value | \`assertExists(value)\` before deeper checks | Accessing a property and hoping the stack trace is clear |
| Error path | \`assertRejects\` or \`assertThrows\` with error type and message detail | Catching any error and marking the test passed |
| State vocabulary | Anchored \`assertMatch(value, /^(paid|settled)$/)\` | Unanchored \`/paid|settled/\` |
| Partial object contract | \`assertObjectMatch\` | Comparing a whole response with volatile IDs and timestamps |

\`\`\`typescript
import {
  assertEquals,
  assertExists,
  assertObjectMatch,
  assertRejects,
} from "@std/assert";

type UserRecord = {
  id: string;
  email: string;
  role: "admin" | "member";
};

async function loadUser(id: string): Promise<UserRecord | undefined> {
  if (id === "missing") {
    return undefined;
  }

  return { id, email: "ada@example.com", role: "admin" };
}

Deno.test("loadUser returns a stable public contract", async () => {
  const user = await loadUser("user_123");

  assertExists(user);
  assertEquals(user.id, "user_123");
  assertObjectMatch(user, {
    email: "ada@example.com",
    role: "admin",
  });
});

Deno.test("loadUser callers handle missing users explicitly", async () => {
  await assertRejects(
    async () => {
      const user = await loadUser("missing");
      if (!user) {
        throw new Error("user not found");
      }
    },
    Error,
    "user not found",
  );
});
\`\`\`

The mistake people make with Deno assertions is treating \`@std/assert\` as less expressive because it is not fluent. In practice, the plain function style is useful for agents because the import tells the model exactly which assertion vocabulary is available. There is less temptation to invent a matcher name from another framework.

## Mocking with spy, stub, and FakeTime

Deno's standard testing tools separate call observation, replacement, and time control. \`spy\` wraps a function so you can inspect calls. \`stub\` replaces a method for a scoped period. \`FakeTime\` replaces Date and timers so time-dependent code can be tested without sleeping.

| Need | Tool | Failure mode it prevents |
|---|---|---|
| Prove a callback was called | \`spy\` | A test that checks only final status and misses whether an event fired |
| Replace a dependency method | \`stub\` | Network, filesystem, or clock access leaking into unit tests |
| Advance timers instantly | \`FakeTime\` | Flaky tests that rely on real \`setTimeout\` delays |
| Check exact call shape | \`assertSpyCall\`, \`assertSpyCalls\` | Passing because a function was called, but with the wrong payload |

\`\`\`typescript
import {
  assertSpyCall,
  assertSpyCalls,
  spy,
  stub,
} from "@std/testing/mock";
import { assertEquals } from "@std/assert";

type AuditSink = {
  write(event: { type: string; actor: string }): Promise<void>;
};

async function deactivateUser(
  userId: string,
  sink: AuditSink,
  onComplete: (id: string) => void,
) {
  await sink.write({ type: "user.deactivated", actor: userId });
  onComplete(userId);
  return { id: userId, state: "disabled" as const };
}

Deno.test("deactivateUser writes audit event and calls completion callback", async () => {
  const sink: AuditSink = {
    async write() {
      return Promise.resolve();
    },
  };

  using writeStub = stub(sink, "write", async () => {});
  const onComplete = spy((id: string) => id);

  const result = await deactivateUser("user_123", sink, onComplete);

  assertEquals(result, { id: "user_123", state: "disabled" });
  assertSpyCalls(writeStub, 1);
  assertSpyCall(writeStub, 0, {
    args: [{ type: "user.deactivated", actor: "user_123" }],
  });
  assertSpyCall(onComplete, 0, { args: ["user_123"] });
});
\`\`\`

\`\`\`typescript
import { assertEquals } from "@std/assert";
import { FakeTime } from "@std/testing/time";

class RetryBudget {
  #resetAt = Date.now() + 60_000;
  #remaining = 3;

  consume() {
    if (Date.now() >= this.#resetAt) {
      this.#remaining = 3;
      this.#resetAt = Date.now() + 60_000;
    }

    this.#remaining -= 1;
    return this.#remaining;
  }
}

Deno.test("RetryBudget resets after one minute", () => {
  using time = new FakeTime("2026-09-24T10:00:00Z");
  const budget = new RetryBudget();

  assertEquals(budget.consume(), 2);
  assertEquals(budget.consume(), 1);

  time.tick(60_000);

  assertEquals(budget.consume(), 2);
});
\`\`\`

Keep stubs close to the test and restore them automatically with \`using\` when possible. A long-lived global stub is one of the easiest ways to make a Deno suite order-dependent. If you must stub a module-level singleton, run that test in a file that does not share mutable state with unrelated tests.

## Permissions are part of the test design

Deno tests run under the same permission model as Deno programs. A suite with no permissions cannot read arbitrary files, open the network, or execute commands. That is a gift for QA because it lets you verify least privilege instead of discovering accidental dependency access after deployment.

There is one subtle rule: a test's \`permissions\` option can deny or narrow permissions, but it does not grant permissions the process did not receive. You still grant permissions on the command line or through Deno's configured permission sets. Inside a test, use \`permissions\` to prove behavior under denial.

\`\`\`typescript
import { assertEquals } from "@std/assert";

async function readOptionalConfig(path: string) {
  try {
    return await Deno.readTextFile(path);
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) {
      return "feature=false";
    }
    throw error;
  }
}

Deno.test({
  name: "readOptionalConfig falls back when read permission is denied",
  permissions: { read: false },
  async fn() {
    const config = await readOptionalConfig("./settings.env");
    assertEquals(config, "feature=false");
  },
});
\`\`\`

For CI, split permission profiles by suite instead of running everything with \`--allow-all\`. Unit tests should usually run with no extra permissions. Integration tests might get \`--allow-net=127.0.0.1:8080\` and \`--allow-read=./fixtures\`. End-to-end smoke tests that launch subprocesses should be the exception, not the default.

| Suite | Command shape | Permission intent |
|---|---|---|
| Pure unit | \`deno test src/**/*_test.ts\` | No ambient filesystem or network access |
| Fixture-based parser | \`deno test --allow-read=./fixtures tests/parser\` | Read only controlled sample files |
| Local API integration | \`deno test --allow-net=127.0.0.1:8080 tests/api\` | Hit one local service |
| CLI integration | \`deno test --allow-run=deno --allow-read --allow-write=./tmp tests/cli\` | Exercise process behavior in a sandboxed directory |

## Coverage, lcov, HTML, and thresholds

The Deno coverage workflow is two-stage. First run tests with \`--coverage\` to collect raw V8 coverage profiles. Then run \`deno coverage\` to read those profiles and print or export reports. Current Deno docs also document threshold support: \`deno coverage --threshold=90\` applies one percentage to line, branch, and function coverage, while a \`coverage.thresholds\` section in \`deno.json\` can set per-metric values.

\`\`\`bash
deno test --clean --coverage=coverage
deno coverage --detailed coverage
deno coverage --lcov --output=coverage.lcov coverage
deno coverage --html coverage
deno coverage --threshold=85 coverage
\`\`\`

Use \`--clean\` when collecting coverage in the same directory repeatedly. Coverage data accumulates, and stale profiles from renamed files can make the summary lie. Avoid running several \`deno test --clean --coverage=coverage\` commands at the same time against the same directory, because one job can delete another job's profiles.

HTML coverage is useful during investigation because it shows exact uncovered lines. lcov is the interchange format for coverage services. The terminal detailed report is best for local triage. Do not turn coverage into a trophy metric. A 90 percent line target can still miss a permission failure, a race, or a bad assertion. Use thresholds as a floor, then review uncovered branches in code that makes decisions.

## Documentation tests keep examples honest

\`deno test --doc\` runs code blocks from supported JSDoc and Markdown examples. This is unusually valuable for teams using agents because examples are often the first thing an AI assistant copies. If the examples compile and assert behavior, the assistant starts from a better seed.

\`\`\`typescript
/**
 * Formats a build number for release notes.
 *
 * \`\`\`ts
 * import { assertEquals } from "jsr:@std/assert/equals";
 * import { formatBuildNumber } from "./release.ts";
 *
 * assertEquals(formatBuildNumber(42), "build-0042");
 * \`\`\`
 */
export function formatBuildNumber(value: number) {
  return "build-" + String(value).padStart(4, "0");
}
\`\`\`

Run doc tests with a separate task if your Markdown includes snippets that need permissions or external services. For internal libraries, doc tests can be part of every pull request. For tutorials that intentionally show partial fragments, mark non-runnable blocks with a language or convention your docs system understands, then keep runnable examples complete.

## CI that gives developers and agents useful artifacts

A good Deno CI job should type-check through \`deno test\`, run strict sanitizers, export machine-readable test results, publish coverage artifacts, and keep artifact names simple. GitHub Actions artifact names should not contain a slash. The current Actions majors requested here are \`actions/checkout@v7\`, \`actions/setup-node@v7\`, and \`actions/upload-artifact@v7\`; Deno itself is commonly installed through \`denoland/setup-deno@v2\`.

\`\`\`yaml
name: deno-tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: denoland/setup-deno@v2
        with:
          deno-version: v2.x

      - name: Check formatting
        run: deno fmt --check

      - name: Lint
        run: deno lint

      - name: Test with coverage and JUnit
        run: |
          deno test --clean --coverage=coverage --sanitize-ops --sanitize-resources --junit-path=junit.xml
          deno coverage --lcov --output=coverage.lcov coverage
          deno coverage --html coverage

      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: deno-junit
          path: junit.xml

      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: deno-coverage-html
          path: coverage/html
\`\`\`

That workflow writes JUnit XML while keeping normal output in the terminal. If you shard test files across jobs with \`--shard=1/3\`, \`--shard=2/3\`, and \`--shard=3/3\`, give each shard a distinct coverage directory and artifact name. Merge coverage later only if your reporting service supports it cleanly.

## Filtering, parallelism, shuffling, retries, and affected tests

The runner control flags are simple, but they are not interchangeable with other tools. Deno filters test names with \`--filter\`. A string matches names containing that string. A value wrapped in slashes is treated as a regular expression. Parallel execution is \`--parallel\`, which runs test files across workers, with \`DENO_JOBS\` controlling the worker count. Sharding is \`--shard=INDEX/COUNT\`.

| Goal | Deno command | Notes |
|---|---|---|
| Run one named area | \`deno test --filter "checkout"\` | Matches by test name |
| Run a regex pattern | \`deno test --filter "/^api:/"\` | Use slash-wrapped regex syntax |
| Run docs examples | \`deno test --doc README.md src/mod.ts\` | Useful for SDKs and utility libraries |
| Parallelize files | \`DENO_JOBS=4 deno test --parallel\` | Tests inside one file still need careful shared-state design |
| Split CI machines | \`deno test --shard=2/4\` | Index is 1-based |
| Repeat a flaky suspect | \`deno test --repeats=20 --filter "retry budget"\` | Every repetition must pass |
| Retry failures | \`deno test --retry=2\` | A pass on any attempt makes the test pass |

Use retries to gather evidence, not to hide instability. If a test passes only because \`--retry=2\` eventually hits a lucky interleaving, the suite is telling you about a race, a leaked resource, a real timer, or mutable shared state.

## A realistic failure mode: green locally, red under strict CI

Suppose a test fetches from a local server and asserts a transformed response. It passes locally, but CI fails with a resource sanitizer error or hangs until timeout. The usual cause is an unconsumed response body, an interval that was not cleared, or a promise started by the test but not awaited.

\`\`\`typescript
import { assertEquals } from "@std/assert";

async function readStatus(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    await response.body?.cancel();
    return "unavailable";
  }

  const body = await response.json() as { status: string };
  return body.status;
}

Deno.test({
  name: "readStatus returns API status",
  sanitizeOps: true,
  sanitizeResources: true,
  permissions: { net: ["127.0.0.1:8080"] },
  async fn() {
    const status = await readStatus("http://127.0.0.1:8080/health");
    assertEquals(status, "ok");
  },
});
\`\`\`

Diagnosis should be mechanical. Re-run only that test with \`deno test --filter "readStatus" --sanitize-ops --sanitize-resources --allow-net=127.0.0.1:8080\`. If the error mentions a resource, audit files, responses, sockets, and timers. If the error mentions async ops, search for promises that are created but not awaited. If the test uses fake timers, advance the clock and settle promises before asserting.

What people get wrong: they disable sanitizers to make the suite pass. The better fix is to close or consume the resource. A failed sanitizer is not noise when you are testing API clients, CLIs, servers, or agent workflows that open files and network connections.

## When not to use Deno test

\`deno test\` is strongest for Deno-native code, TypeScript libraries, API clients, command-line tools, services, permission behavior, and documentation examples. It is not a browser automation framework. If the behavior under test is "click this button, inspect this page, record a trace," use Playwright directly or a higher-level E2E framework. Deno can run browser-adjacent tests, but the runner itself does not replace a browser engine.

It is also not the best choice when your organization has a heavy Jest or Vitest plugin ecosystem that must stay intact: custom snapshot serializers, fake DOM assumptions, framework-specific mocks, or reporter integrations that no one wants to migrate. In those cases, introduce Deno tests at package boundaries where the runtime is already Deno-native instead of forcing a wholesale migration.

| Project shape | Use \`deno test\`? | Reason |
|---|---:|---|
| Deno Deploy API | Yes | Same runtime model, permissions, and imports |
| Shared TypeScript utility published to JSR | Yes | Doc tests and snapshots are valuable |
| React component suite built around jsdom matchers | Maybe | Existing DOM testing setup may matter more |
| Browser checkout journey | No | Use Playwright or an E2E layer |
| CLI with filesystem and subprocess behavior | Yes | Permissions and sanitizers expose real bugs |

## Frequently Asked Questions

### Does deno test need a separate assertion library?

No. Deno does not include Jest-style globals, but the standard library provides \`@std/assert\` for common assertions and \`@std/expect\` if your team prefers fluent expectations. For QA automation, \`@std/assert\` is often the cleaner default because imports are explicit and failures are direct. Add the dependency with \`deno add jsr:@std/assert\` or map it in \`deno.json\` so tests can import from \`@std/assert\`.

### Should Deno suites enable sanitizers everywhere?

For application and library tests, enabling \`sanitizeOps\` and \`sanitizeResources\` is usually worth it because leaks often point to real production problems. Deno 2.8 and later do not keep those two sanitizers on globally by default, so strict teams should opt in through per-test options, \`Deno.test.sanitizer()\`, CLI flags, environment variables, or \`deno.json\`. Keep \`sanitizeExit\` on unless you are intentionally testing process termination in isolation.

### How do I run only one Deno test from an AI agent prompt?

Ask the agent to use \`deno test --filter "name fragment"\` or \`deno test --filter "/^exact pattern/"\`. That is the Deno runner flag. Do not borrow title-filter commands from Playwright, Vitest, or Jest unless the repository actually uses those tools. Include the file path too when possible, such as \`deno test tests/invoice_test.ts --filter "rounding"\`, so the agent gets a smaller feedback loop.

### Is Deno coverage good enough for CI gates?

Yes, for most Deno projects. \`deno test --coverage\` collects raw coverage, and \`deno coverage\` can print detailed output, export lcov, create HTML, and enforce thresholds. Treat the threshold as a floor, not proof of quality. A suite can hit a high line percentage while missing important branches, permission-denied paths, and async races. Review uncovered decision code when coverage changes, especially around error handling and retries.
`,
};
