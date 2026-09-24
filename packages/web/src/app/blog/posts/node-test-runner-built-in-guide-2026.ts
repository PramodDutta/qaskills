import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Node.js Built-in Test Runner (node:test): Complete Guide for 2026',
  description: 'A practical node test runner node:test guide for QA engineers covering CLI flags, mocks, coverage, reporters, CI setup, and safer migrations.',
  date: '2026-09-24',
  category: 'Tutorial',
  content: `
# Node.js Built-in Test Runner (node:test): Complete Guide for 2026

The Node.js built-in test runner, exposed through \`node:test\` and executed with \`node --test\`, is now a serious default for backend libraries, API services, CLIs, and agent-authored JavaScript checks that do not need a browser simulator or a large plugin ecosystem. The practical answer is simple: if your QA surface is mostly Node, HTTP, files, streams, database adapters, or pure TypeScript compiled to JavaScript, start with \`node:test\` before adding Jest or Vitest.

That recommendation is not ideological. Node's test runner is stable as a module, ships with Node, understands subtests, hooks, test filtering, reporters, watch mode, mock functions, method mocks, timer mocks, snapshot assertions, and experimental coverage. The tradeoff is equally clear: some valuable pieces remain experimental or early development in the official docs, especially code coverage, module mocking, watch mode, test tags, global setup, and snapshots in the Node 22 line.

For QA engineers using Claude Code, Cursor, Copilot, or another coding agent, \`node:test\` has one extra advantage: it reduces project-specific ceremony. Agents can inspect a failing assertion, run one title with \`--test-name-pattern\`, and propose focused fixes without first reverse-engineering a Jest transform pipeline. If you need a broader framework comparison, keep this guide beside [Jest vs Vitest in 2026](/blog/jest-vs-vitest-2026) and the broader [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026).

## Version Reality Check Before You Standardize

The official Node docs matter because many blog posts still describe the runner as a toy. That was fair in the Node 18 experimental period. It is not fair for Node 22 LTS and Node 24 LTS projects in 2026.

Node's documentation marks the top-level \`node:test\` module as Stable, with the history entry noting that the runner became stable in Node 20. At the same time, several features that QA teams naturally reach for are deliberately less mature. Code coverage is marked Experimental. Module mocking is marked Early development. Watch mode is marked Experimental. Snapshot testing, added in 22.3.0, is no longer experimental on current Node 22 and Node 24 releases. Newer extras such as test tags exist only on Node 24, and that version split changes how you write cross-version examples and CI.

| Capability | Node 22 LTS status | Node 24 LTS status | QA guidance |
|---|---:|---:|---|
| Core \`node:test\` runner | Stable | Stable | Safe default for service and library tests |
| \`describe()\` and \`it()\` aliases | Available | Available | Useful for teams migrating from BDD style |
| Mock functions and methods | Available | Available | Prefer for dependency seams inside one module graph |
| \`mock.module()\` | Early development | Early development | Use behind \`--experimental-test-module-mocks\` |
| Coverage | Experimental | Experimental | Useful in CI, but keep thresholds realistic |
| Snapshot testing | Stable on current 22.x releases | Stable | Pin a recent 22.x minimum; early 22.x releases needed a flag |
| Watch mode | Experimental | Experimental | Good locally, do not build CI policy on it |
| Test tags | Not the portable baseline | Early development | Avoid for shared examples unless Node 24+ is guaranteed |

For a directory of reusable QA workflows, this version split is exactly why ready-made QA skills install from qaskills.sh with the qaskills CLI: the useful skill is not just "run tests", it is "run tests with the runner flags that match this repo."

## A Minimal Test That Actually Scales

\`node:test\` does not ship a Jest-style \`expect\` global. The default pairing is \`node:test\` plus \`node:assert/strict\`. That sounds plain, but it is a strength for API-level QA. Assertions are explicit, failures are readable, and there is no hidden matcher compatibility layer.

\`\`\`typescript
// test/payment-status.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

type Payment = {
  id: string;
  amountCents: number;
  status: 'paid' | 'settled' | 'failed';
};

function summarizePayment(payment: Payment) {
  return {
    id: payment.id,
    settled: payment.status === 'settled',
    label: payment.status.toUpperCase(),
  };
}

describe('summarizePayment', () => {
  it('marks settled payments as settled', () => {
    const summary = summarizePayment({
      id: 'pay_123',
      amountCents: 4200,
      status: 'settled',
    });

    assert.equal(summary.id, 'pay_123');
    assert.equal(summary.settled, true);
    assert.match(summary.label, /^(PAID|SETTLED|FAILED)$/);
  });
});
\`\`\`

The last assertion is intentionally anchored. A loose regex such as \`/PAID|SETTLED|FAILED/\` can pass on strings that merely contain an allowed token. In test automation, that is how a regression becomes a green build with a quiet smirk.

Node discovers tests differently depending on how you call it. With no file arguments, \`node --test\` uses the runner's discovery rules. With file paths, you are telling Node exactly what to run. In a mixed monorepo, explicit files or package-level scripts are often cleaner than relying on repo-wide discovery.

\`\`\`json
{
  "scripts": {
    "test": "node --test",
    "test:unit": "node --test test/unit/*.test.mjs",
    "test:api": "node --test test/api/*.test.mjs",
    "test:watch": "node --test --watch"
  }
}
\`\`\`

If your source is TypeScript, do not assume \`node --test\` will behave like Vitest. Node can run JavaScript directly. For TypeScript, choose one of three deliberate paths: compile first with \`tsc\`, use a supported loader or transform path that your team owns, or constrain \`node:test\` usage to JavaScript integration tests. In Node 22 and Node 24, avoid old JSON import syntax too. JSON imports use import attributes.

\`\`\`typescript
import config from './fixtures/payment-config.json' with { type: 'json' };

console.log(config.currency);
\`\`\`

## Running One Test Without Mixing Runner Dialects

The most common agent mistake is using the wrong filter flag. Playwright filters test titles with \`--grep\` or \`-g\`, while Mocha also uses \`--grep\`. Jest and Vite-native test suites use title-focused flags such as \`-t\` or \`--testNamePattern\`. Node's built-in runner uses \`--test-name-pattern\`.

| Task | Correct Node command | Common wrong command |
|---|---|---|
| Run every test | \`node --test\` | \`node --test -t smoke\` |
| Run tests matching a title | \`node --test --test-name-pattern "refund"\` | \`node --test -t refund\` |
| Run only marked tests | \`node --test --test-only\` with \`only: true\` | Expecting \`.only\` to work in all modes |
| Watch locally | \`node --test --watch\` | Treating watch as stable CI behavior |
| Set concurrency | \`node --test --test-concurrency=4\` | \`--maxWorkers=4\` |

\`\`\`bash
# Run all tests.
node --test

# Run one file.
node --test test/payment-status.test.mjs

# Run titles that contain refund.
node --test --test-name-pattern "refund"

# Run tests marked with only.
node --test --test-only

# Run four test files concurrently.
node --test --test-concurrency=4
\`\`\`

\`--test-name-pattern\` filters by test name, not file path. If your agent is trying to run a single file, pass the file path. If it is trying to run a single scenario across many files, use the name pattern. This distinction is boring until a pull request claims "only the refund test failed" while actually running zero tests.

## Subtests, Hooks, And The Async Trap

Subtests are one of the best reasons to learn the Node runner instead of treating it as a tiny Jest clone. A top-level \`test()\` receives a context object. That context can create subtests with \`t.test()\`, register local hooks, mock dependencies, and write diagnostics.

The catch is important: subtests created directly inside a parent \`test()\` must be awaited. Node's docs are explicit that a parent test does not automatically wait for outstanding subtests created this way. If the parent finishes first, unfinished subtests are cancelled and treated as failures.

\`\`\`typescript
// test/cart-rules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

function calculateShipping(totalCents) {
  if (totalCents >= 5000) return 0;
  return 799;
}

test('cart shipping rules', async (t) => {
  await t.test('charges shipping below the threshold', () => {
    assert.equal(calculateShipping(4999), 799);
  });

  await t.test('makes shipping free at the threshold', () => {
    assert.equal(calculateShipping(5000), 0);
  });
});
\`\`\`

Suites written with \`describe()\` and \`it()\` feel more familiar to Jest and Mocha users. Hooks are available as top-level imports and also through context methods. Use top-level hooks when the fixture is shared by a suite. Use context hooks when the fixture belongs to a nested subtest group and you want the lifetime to be obvious.

\`\`\`typescript
// test/session-store.test.mjs
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

class SessionStore {
  #sessions = new Map();

  create(id, userId) {
    this.#sessions.set(id, { id, userId });
  }

  get(id) {
    return this.#sessions.get(id) ?? null;
  }

  clear() {
    this.#sessions.clear();
  }
}

describe('SessionStore', () => {
  let store;

  beforeEach(() => {
    store = new SessionStore();
  });

  afterEach(() => {
    store.clear();
  });

  it('returns a stored session', () => {
    store.create('sess_1', 'user_1');

    assert.deepEqual(store.get('sess_1'), {
      id: 'sess_1',
      userId: 'user_1',
    });
  });
});
\`\`\`

For database tests, use the same discipline you would use with any runner. If you wrap each test in a transaction, \`BEGIN\`, the queries, and \`ROLLBACK\` must run on one checked-out client, not on a pool that can hand each query to a different connection.

\`\`\`typescript
// test/db-transaction-helper.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

async function withRollback(pool, callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await callback(client);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}

test('creates an audit row inside an isolated transaction', async () => {
  const pool = {
    async connect() {
      const rows = [];
      return {
        async query(sql, params = []) {
          if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [] };
          if (sql === 'insert into audit(message) values($1) returning message') {
            rows.push({ message: params[0] });
            return { rows: [{ message: params[0] }] };
          }
          if (sql === 'select count(*)::int as count from audit') {
            return { rows: [{ count: rows.length }] };
          }
          throw new Error('unexpected sql: ' + sql);
        },
        release() {},
      };
    },
  };

  await withRollback(pool, async (client) => {
    await client.query('insert into audit(message) values($1) returning message', ['created']);
    const result = await client.query('select count(*)::int as count from audit');
    assert.equal(result.rows[0].count, 1);
  });
});
\`\`\`

That sample uses a fake pool so it runs as written, but the shape is the point: one client, one transaction boundary, no accidental pool round trips.

## Mocking Without A Framework Tax

Node exposes mocking through each test context as \`t.mock\`, and through the \`mock\` export. For most QA work, method mocks are enough. They let you observe calls, replace behavior, and restore the original implementation after the test.

\`\`\`typescript
// test/invoice-mailer.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

class Mailer {
  async send(message) {
    return { id: 'real_' + message.to };
  }
}

async function sendInvoice(mailer, invoice) {
  const result = await mailer.send({
    to: invoice.email,
    subject: 'Invoice ' + invoice.id,
  });

  return result.id;
}

test('sendInvoice sends one invoice email', async (t) => {
  const mailer = new Mailer();
  const sendMock = t.mock.method(mailer, 'send', async (message) => {
    return { id: 'mock_' + message.to };
  });

  const id = await sendInvoice(mailer, {
    id: 'INV-7',
    email: 'buyer@example.com',
  });

  assert.equal(id, 'mock_buyer@example.com');
  assert.equal(sendMock.mock.callCount(), 1);
  assert.deepEqual(sendMock.mock.calls[0].arguments[0], {
    to: 'buyer@example.com',
    subject: 'Invoice INV-7',
  });
});
\`\`\`

For standalone functions, \`t.mock.fn()\` creates a mock function with call tracking. Use it when you are injecting a callback, repository function, or queue publisher.

\`\`\`typescript
// test/refund-handler.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

async function processRefund(refund, publishEvent) {
  if (refund.amountCents <= 0) {
    throw new Error('refund amount must be positive');
  }

  await publishEvent('refund.created', {
    id: refund.id,
    amountCents: refund.amountCents,
  });
}

test('processRefund publishes a refund event', async (t) => {
  const publishEvent = t.mock.fn(async () => undefined);

  await processRefund({ id: 'rf_1', amountCents: 1200 }, publishEvent);

  assert.equal(publishEvent.mock.callCount(), 1);
  assert.deepEqual(publishEvent.mock.calls[0].arguments, [
    'refund.created',
    { id: 'rf_1', amountCents: 1200 },
  ]);
});
\`\`\`

Timer mocks are available through \`t.mock.timers\`. They are valuable for retry loops, debounce code, token expiry, and background polling. The failure mode to watch is partial fake time: if your code uses both \`Date.now()\` and \`setTimeout()\`, enable the relevant APIs together so the test clock and timer queue agree.

\`\`\`typescript
// test/retry-delay.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

function retryLater(callback) {
  setTimeout(() => {
    callback(Date.now());
  }, 1000);
}

test('retryLater waits for the retry window', (t) => {
  t.mock.timers.enable({
    apis: ['Date', 'setTimeout'],
    now: 1_700_000_000_000,
  });

  const callback = t.mock.fn();

  retryLater(callback);
  assert.equal(callback.mock.callCount(), 0);

  t.mock.timers.tick(1000);

  assert.equal(callback.mock.callCount(), 1);
  assert.equal(callback.mock.calls[0].arguments[0], 1_700_000_001_000);
});
\`\`\`

Module mocking exists, but it is the point where you should slow down. \`mock.module()\` can mock ECMAScript modules, CommonJS modules, JSON modules, and built-in modules, but the docs mark it Early development and require Node to start with \`--experimental-test-module-mocks\`. Use it for hard-to-inject legacy boundaries, not as your everyday dependency pattern.

\`\`\`typescript
// test/module-mock-example.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('mocks a built-in module after the flag is enabled', async (t) => {
  const mocked = t.mock.module('node:readline', {
    namedExports: {
      createInterface() {
        return {
          question(_prompt, answer) {
            answer('yes');
          },
          close() {},
        };
      },
    },
  });

  const readline = await import('node:readline');
  const rl = readline.createInterface();

  await new Promise((resolve) => {
    rl.question('continue?', (answer) => {
      assert.equal(answer, 'yes');
      resolve();
    });
  });

  mocked.restore();
});
\`\`\`

\`\`\`bash
node --experimental-test-module-mocks --test test/module-mock-example.test.mjs
\`\`\`

What people get wrong: they mock modules to compensate for code that could have accepted a dependency as a parameter. Agent-authored tests are especially prone to this because module mocking looks powerful. For new code, dependency injection is usually clearer, faster, and more portable across Node, Bun, Vitest, and browser runners.

## Coverage With Thresholds And Honest Expectations

Node's built-in coverage is enabled with \`--experimental-test-coverage\`. Coverage reporters include text output and machine-readable formats through the test reporter pipeline. The CLI also exposes threshold flags such as \`--test-coverage-lines\`, \`--test-coverage-functions\`, and \`--test-coverage-branches\`.

Use coverage as a change detector, not a moral score. A payment service with serious branch coverage on authorization and settlement logic can be healthier at an illustrative 82 percent than a UI utility package at 99 percent with vacuous assertions. Do not fabricate benchmark claims in build docs. Use your own baseline.

\`\`\`bash
node --test --experimental-test-coverage

node --test \\
  --experimental-test-coverage \\
  --test-coverage-lines=85 \\
  --test-coverage-functions=80 \\
  --test-coverage-branches=75
\`\`\`

| Coverage flag | What it gates | Practical use |
|---|---|---|
| \`--experimental-test-coverage\` | Turns on coverage collection | Required before threshold flags matter |
| \`--test-coverage-lines=85\` | Covered line percentage | Good broad CI guard |
| \`--test-coverage-functions=80\` | Covered function percentage | Catches exported helpers never called |
| \`--test-coverage-branches=75\` | Covered branch percentage | Best signal for validation and error paths |
| \`--test-coverage-include\` | Included file patterns | Keep generated files out of policy |
| \`--test-coverage-exclude\` | Excluded file patterns | Avoid punishing migrations or build output |

A good coverage failure diagnosis starts by asking whether a meaningful behavior is missing, not whether a number is red. If a branch is uncovered because the code handles an impossible state, simplify the code. If it is uncovered because nobody tested an authorization denial path, add the test. If it is uncovered because a generated client has hundreds of mechanical branches, exclude that generated file deliberately.

## Reporters For Humans, CI, And Agents

Node supports multiple reporters through \`--test-reporter\` and \`--test-reporter-destination\`. Common built-in reporter names include \`spec\`, \`tap\`, \`dot\`, \`junit\`, and \`lcov\`. The best setup often uses two outputs: readable console output for the developer, and a file reporter for CI systems or analysis agents.

\`\`\`bash
# Human-readable local output.
node --test --test-reporter=spec

# JUnit output for CI test summaries.
node --test \\
  --test-reporter=junit \\
  --test-reporter-destination=reports/node-test-results.xml

# LCOV coverage output when coverage is enabled.
node --test \\
  --experimental-test-coverage \\
  --test-reporter=lcov \\
  --test-reporter-destination=coverage/lcov.info
\`\`\`

Artifact names matter in GitHub Actions. Do not put slashes in the artifact name. Use slashes in paths only.

\`\`\`yaml
name: node-test

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node: [22, 24]
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: \${{ matrix.node }}
          cache: npm
      - run: npm ci
      - run: mkdir -p reports coverage
      - run: |
          node --test \\
            --test-reporter=spec \\
            --test-reporter=junit \\
            --test-reporter-destination=stdout \\
            --test-reporter-destination=reports/node-\${{ matrix.node }}.xml
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: node-test-results-\${{ matrix.node }}
          path: reports/node-\${{ matrix.node }}.xml
\`\`\`

That example uses current action majors and keeps artifact names free of \`/\`. If you add LCOV, upload \`coverage/lcov.info\` under an artifact name such as \`node-coverage-24\`, not \`coverage/node-24\`.

## Snapshot Testing Without Turning Reviews Into Noise

Node snapshot assertions live under the test context's \`assert\` helpers and the \`snapshot\` export. Snapshot testing arrived in Node 22.3.0 behind an experimental flag and stopped being experimental in 23.4.0, and current Node 22 docs list it without a stability warning. If your CI still runs an early 22.x release, pin a newer minimum rather than carrying the old flag.

\`\`\`typescript
// test/api-response-snapshot.test.mjs
import { test } from 'node:test';

function publicUserView() {
  return {
    id: 'user_123',
    role: 'qa_engineer',
    flags: ['beta-dashboard'],
  };
}

test('public user view stays stable', (t) => {
  t.assert.snapshot(publicUserView());
});
\`\`\`

\`\`\`bash
node --test test/api-response-snapshot.test.mjs
node --test --test-update-snapshots test/api-response-snapshot.test.mjs
\`\`\`

The best snapshot target is structured, deterministic, and intentionally broad enough to catch serialization drift. The worst target is a giant object full of timestamps, random IDs, generated class names, or unrelated fields. QA teams reviewing agent-generated snapshot updates should ask one question before accepting the diff: did the behavior change, or did the test just memorize noise?

## A Realistic Failure Mode: The Green Race

Here is a bug that appears in service tests written by humans and agents. The test calls a function that starts async work, then immediately asserts on the visible result. It passes on a fast machine and fails under CI load.

\`\`\`typescript
// test/green-race.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

class EventBus {
  events = [];

  async publish(event) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    this.events.push(event);
  }
}

async function createUser(bus, user) {
  const publishPromise = bus.publish({
    type: 'user.created',
    id: user.id,
  });

  return { id: user.id, publishPromise };
}

test('createUser publishes a user.created event', async () => {
  const bus = new EventBus();
  const result = await createUser(bus, { id: 'user_1' });

  await result.publishPromise;

  assert.equal(bus.events.length, 1);
  assert.deepEqual(bus.events[0], {
    type: 'user.created',
    id: 'user_1',
  });
});
\`\`\`

The diagnosis is simple: the test must wait for all async work that proves the side effect. A weaker test would assert only that \`createUser\` returned an ID. That does not prove event publication. Another weak version would check \`bus.events.indexOf(expected) >= 0\`, but object identity would make it fail even when the event shape is correct. Assert the side effect directly and wait for the promise that completes it.

## Migration Decision Guide

\`node:test\` is not a universal replacement for every JavaScript testing framework. It is a sharp default for Node-first projects. The decision gets easier when you map the runner to the behavior under test.

| Project shape | Use \`node:test\` when | Consider another runner when |
|---|---|---|
| Node library | You publish ESM or CJS and want low dependency weight | You rely on rich matcher plugins |
| API service | Tests hit handlers, database adapters, queues, and pure modules | You need a browser-like DOM environment |
| CLI tool | Tests spawn commands and inspect files or stdout | You need snapshot-heavy terminal UI testing across platforms |
| Frontend app | You only need a few Node-side utility tests | You need jsdom, component mounting, or browser mode |
| Monorepo | Some packages are Node-only and can avoid framework setup | One shared framework policy is more valuable than runner diversity |

For Jest teams, migrate leaf packages first: pure utilities, SDKs, CLI helpers, internal code generators. Keep Jest where the ecosystem still pays for itself. For Vitest teams, \`node:test\` is often a complement rather than a replacement. Vitest remains strong for Vite-native apps and browser-adjacent code. Node's runner is excellent when the runtime you ship is the runtime you test.

## What People Get Wrong About Built-In

The phrase "built-in" makes teams expect "minimal." The better mental model is "runtime-native." Node's runner knows Node's process model, module systems, timers, reporters, and coverage hooks without another dependency layer. That reduces failure surfaces in CI and makes agent debugging more direct.

But runtime-native does not mean policy-free. You still need naming conventions, clear scripts, deterministic fixtures, and a line on experimental features. Put \`--experimental-test-module-mocks\` in exactly the script that needs it. Put coverage thresholds in CI, not in every local command. Teach agents that \`--test-name-pattern\` is the Node filter flag. Review snapshots like code. Keep assertions about behavior, not just status codes.

For example, a status-only API test is rarely enough:

\`\`\`typescript
// test/api-contract.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

async function createProject(request) {
  if (!request.body.name) {
    return { status: 400, body: { error: 'name is required' } };
  }

  return {
    status: 201,
    body: {
      id: 'proj_1',
      name: request.body.name,
      audit: [{ action: 'project.created' }],
    },
  };
}

test('createProject returns the created project and audit event', async () => {
  const response = await createProject({ body: { name: 'Checkout QA' } });

  assert.equal(response.status, 201);
  assert.equal(response.body.name, 'Checkout QA');
  assert.match(response.body.id, /^proj_[a-z0-9]+$/);
  assert.deepEqual(response.body.audit, [{ action: 'project.created' }]);
});
\`\`\`

The status proves the handler selected a response code. The body assertions prove the side effect contract that clients actually depend on.

## Recommended Baseline For QA Teams

Use this baseline for new Node packages in 2026:

| Policy area | Recommendation | Reason |
|---|---|---|
| Node versions | Test Node 22 and 24 if you support both | Catches module-mocking and Node 24-only feature differences |
| Test files | Prefer \`test/**/*.test.mjs\` or compiled JS output | Keeps runner discovery obvious |
| Assertions | Use \`node:assert/strict\` | Fewer matcher compatibility surprises |
| Filtering | Use \`--test-name-pattern\` | Correct Node title filtering |
| Mocks | Prefer injected mocks and \`t.mock.method\` | Avoids experimental module mocks where possible |
| Coverage | Use experimental coverage in CI with modest thresholds | Good signal, still marked experimental |
| Reporters | Emit \`spec\` locally and \`junit\` in CI | Humans and CI both get useful output |
| Snapshots | Keep snapshots small and deterministic | Reduces review noise |

That baseline is intentionally unglamorous. It gives QA engineers and coding agents a stable command vocabulary, enough diagnostics for CI, and a migration path that does not strand browser tests or framework-specific matchers.

## Frequently Asked Questions

### Is node:test stable enough for production CI?

Yes, the core \`node:test\` runner is stable in current LTS lines, and Node's docs note that the runner became stable in Node 20. The nuance is feature-level stability. Coverage remains experimental, watch mode is experimental, and module mocking is early development. Production CI can absolutely run \`node --test\`, but your policy should separate stable test execution from experimental add-ons. Use experimental features deliberately, pin Node versions in CI, and avoid making a Node 24-only feature mandatory for packages that still support Node 22.

### Does node:test replace Jest or Vitest?

It replaces them cleanly for many Node-first packages, especially libraries, API services, CLIs, and integration tests that do not need jsdom, React component mounting, or matcher plugins. It is less compelling for Vite-heavy frontend projects or suites with deep Jest ecosystem dependencies. A practical migration keeps Jest or Vitest where they provide real value and moves pure Node tests to \`node:test\`. That reduces dependencies without turning the migration into a risky all-or-nothing rewrite.

### What flag runs one test by name in Node?

Use \`--test-name-pattern\`. For example, \`node --test --test-name-pattern "refund"\` runs tests whose names match that pattern. Do not use Playwright's \`--grep\` or Mocha's \`--grep\` unless you are actually invoking those runners. Jest-style title filters such as \`-t\` and \`--testNamePattern\` are also the wrong interface for \`node:test\`. This matters for AI coding agents because they often infer flags from neighboring projects. In a Node built-in runner project, the correct title filter is \`--test-name-pattern\`.

### Should QA teams use module mocking in node:test?

Use it sparingly. \`t.mock.module()\` is powerful, supports ESM, CommonJS, JSON modules, and built-ins, and requires \`--experimental-test-module-mocks\`. The official docs mark it Early development. For new code, injecting a dependency or mocking a method on an object is usually clearer and more portable. Reach for module mocks when you are testing legacy code with hard imports, process-level dependencies, or built-ins that cannot be passed in cleanly.
`,
};
