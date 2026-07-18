import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Mocha Hooks Explained: before, after, beforeEach, afterEach',
  description:
    'Master Mocha hooks before, after, beforeEach, and afterEach with suite nesting, async setup, cleanup patterns, and real test workflow examples.',
  date: '2026-07-18',
  category: 'Guide',
  content: `
# Mocha Hooks Explained: before, after, beforeEach, afterEach

Mocha hooks are the control surface for fixture lifecycle. If you get \`before\`, \`after\`, \`beforeEach\`, and \`afterEach\` right, your suites stay deterministic. If you get them wrong, you ship order-dependent flakes that only fail in CI. This guide walks through each hook with runnable patterns you can drop into Node unit tests, API contract suites, and browser automation wrappers.

If you are still choosing a runner for a greenfield project, the [JavaScript testing frameworks complete guide 2026](/blog/javascript-testing-frameworks-complete-guide-2026) maps Mocha against Jest, Vitest, and others. Once hooks click, pair them with assertions from the [Mocha Chai testing guide](/blog/mocha-chai-testing-guide).

## Hook map: when each function runs

Mocha registers four root-level hooks (plus aliases) that fire around describe blocks and individual tests.

| Hook | Scope | Runs | Typical job |
|------|-------|------|-------------|
| \`before\` | entire suite | Once before any test in the suite | Expensive shared setup: DB container, HTTP server, schema migrate |
| \`after\` | entire suite | Once after all tests in the suite finish | Tear down shared resources so the next file starts clean |
| \`beforeEach\` | per test | Before every \`it\` in the suite | Reset state that must not leak between cases |
| \`afterEach\` | per test | After every \`it\`, pass or fail | Close handles, restore stubs, delete temp rows |

Mocha's default UI is BDD (\`describe\` / \`it\`). Hooks defined inside a \`describe\` apply only to that suite and its nested suites. Root-level hooks in a file apply to every test in that file.

Execution order for a single suite with two tests:

1. Suite \`before\`
2. Test A \`beforeEach\`
3. Test A body
4. Test A \`afterEach\`
5. Test B \`beforeEach\`
6. Test B body
7. Test B \`afterEach\`
8. Suite \`after\`

Nested suites stack. Parent \`before\` runs before child \`before\`. Parent \`beforeEach\` runs before child \`beforeEach\`. On teardown, child \`afterEach\` / \`after\` run before parent counterparts. That stack is the mental model you need when debugging "why did my server start twice?"

## before: pay once for shared infrastructure

Use \`before\` when the cost of setup is high and the resource is safe to share read-only or carefully isolated.

\`\`\`js
const { createApp } = require('../src/app');
const { migrate, rollback } = require('../src/db');

describe('POST /orders', function () {
  let app;
  let baseUrl;

  before(async function () {
    this.timeout(30000);
    await migrate();
    app = await createApp({ port: 0 });
    baseUrl = \`http://127.0.0.1:\${app.address().port}\`;
  });

  after(async function () {
    await app.close();
    await rollback();
  });

  it('rejects empty cart', async function () {
    const res = await fetch(\`\${baseUrl}/orders\`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    });
    if (res.status !== 400) {
      throw new Error(\`expected 400, got \${res.status}\`);
    }
  });
});
\`\`\`

Notes that keep this pattern honest:

- Raise the hook timeout with \`this.timeout(ms)\` when migrations or container pulls can exceed Mocha's default (often 2000 ms depending on version and config). Prefer file-level or suite-level timeout config when many hooks need the same budget.
- Prefer binding the free port (\`port: 0\`) over hardcoding 3000 so parallel workers do not collide.
- Keep \`before\` pure setup. Assertions belong in \`it\` blocks so failures surface as test failures, not hook failures that obscure which case never ran.

## after: always release what before acquired

\`after\` is not optional decoration. Open sockets, child processes, and Docker clients left alive make the next file hang or exhaust file descriptors.

\`\`\`js
const { spawn } = require('node:child_process');

describe('CLI smoke', function () {
  let child;

  before(function (done) {
    child = spawn('node', ['bin/server.js'], { env: { ...process.env, PORT: '0' } });
    child.stdout.on('data', (buf) => {
      if (String(buf).includes('listening')) done();
    });
    child.on('error', done);
  });

  after(function (done) {
    if (!child || child.killed) return done();
    child.once('exit', () => done());
    child.kill('SIGTERM');
  });

  it('prints version', async function () {
    // hit health endpoint using the port the process logged
  });
});
\`\`\`

If \`after\` itself throws, Mocha still reports the failure. Do not swallow cleanup errors silently unless you rethrow after best-effort teardown. A common pattern is try/finally style inside the hook: close the app, then always attempt DB disconnect.

## beforeEach: isolate the mutable world

Shared servers are fine. Shared mutable tables, clocks, and module caches are not. Put anything that mutates per-case state in \`beforeEach\`.

\`\`\`js
const sinon = require('sinon');
const { OrderService } = require('../src/orders');

describe('OrderService.total', function () {
  let clock;
  let service;

  beforeEach(function () {
    clock = sinon.useFakeTimers(new Date('2026-07-18T12:00:00Z').getTime());
    service = new OrderService({ taxRate: 0.1 });
  });

  afterEach(function () {
    clock.restore();
  });

  it('applies tax on the frozen clock day', function () {
    const total = service.total([{ price: 100 }]);
    if (total !== 110) throw new Error(\`unexpected total \${total}\`);
  });

  it('handles empty line items', function () {
    const total = service.total([]);
    if (total !== 0) throw new Error(\`unexpected total \${total}\`);
  });
});
\`\`\`

Why not put \`sinon.useFakeTimers\` in \`before\`? Because a test that advances the clock (or forgets to restore) poisons every later case. \`beforeEach\` + \`afterEach\` restore is the standard antidote to timer and stub leakage.

## afterEach: the flake firewall

Treat \`afterEach\` as your always-on cleanup lane:

- Restore stubs and spies (\`sinon.restore()\`, or per-stub \`restore()\`).
- Truncate or transaction-rollback per-test DB rows.
- Delete temp directories created for file upload tests.
- Reset environment variables you overrode for a single case.

Order relative to failing tests: Mocha still runs \`afterEach\` when the test body throws. That is deliberate. A failing assertion must not skip cleanup, or the next green test fails for unrelated reasons.

## Nested suites and inheritance

Nesting is where teams either gain clarity or invent mystery bugs.

\`\`\`js
describe('billing API', function () {
  before(async function () {
    // starts API once for the whole file
  });

  describe('invoices', function () {
    beforeEach(async function () {
      // seed two invoice rows
    });

    afterEach(async function () {
      // delete invoice rows
    });

    it('lists invoices', async function () { /* ... */ });
    it('filters by status', async function () { /* ... */ });
  });

  describe('refunds', function () {
    beforeEach(async function () {
      // seed payment that can be refunded
    });

    it('creates a refund', async function () { /* ... */ });
  });
});
\`\`\`

What actually runs for \`lists invoices\`:

1. Outer \`before\` (API up)
2. Inner \`beforeEach\` (invoice seed)
3. Test
4. Inner \`afterEach\`
5. No outer \`after\` yet (more tests remain)

What does **not** run: the \`refunds\` suite's \`beforeEach\`. Sibling suites do not share each other's per-test hooks. That isolation is a feature; do not try to share mutable seeds across sibling describes unless you intentionally put them on the parent.

## Sync, promise, and callback styles

Mocha supports three completion signals for hooks and tests. Pick one style per function and stick to it.

| Style | How Mocha waits | Risk |
|-------|-----------------|------|
| Synchronous | Function returns | Forgetting async work starts fire-and-forget races |
| Promise / async | Returned promise settles | Unhandled rejection becomes a hook failure |
| Callback \`done\` | \`done()\` or \`done(err)\` | Calling \`done\` twice, or never, hangs or double-ends |

Prefer \`async\`/\`await\` for new code. Callback \`done\` remains common in older suites and when wrapping EventEmitter "ready" signals. Never mix: do not \`async function (done)\` and also return a promise while calling \`done\`. Mocha may treat that as double completion depending on version and can produce confusing double-report errors.

## Timeouts, retries, and hooks

Hooks participate in Mocha's timeout machinery. A slow \`before\` that exceeds the timeout fails the suite before any \`it\` runs. When diagnosing:

1. Check whether the failure is labeled as a hook failure in the reporter output.
2. Raise timeout only for the hook or suite that needs it, not globally, so real hangs still surface.
3. If you use Mocha retries for flaky integration tests, remember retries re-run the test body and the surrounding \`beforeEach\` / \`afterEach\`, not necessarily a top-level \`before\` (which already succeeded). Design seeds so retry is idempotent.

Root-cause flaky retries instead of masking them. Hooks that leave ports bound or browser pages open are a common reason retry "fixes" nothing on the second attempt.

## Root hooks and parallel mode

Mocha can load root hook plugins and run files in parallel. Practical rules:

- Prefer per-file suite hooks over global mutable state.
- When using parallel workers, each worker process gets its own module cache and its own hook registrations. Shared external resources (one Postgres on a fixed port) need worker-unique schemas, databases, or containers.
- Avoid writing to a single shared temp file path from \`beforeEach\` in parallel mode without uniqueness (\`process.pid\`, worker id, or random suffix).

If your suite only passes with \`--jobs 1\`, the bug is almost always shared mutable fixtures, not Mocha itself.

## Debugging hook order without guesswork

When a suite fails mysteriously, instrument temporarily:

\`\`\`bash
npx mocha --grep "POST /orders" --timeout 10000 --bail
\`\`\`

Add short \`console.error\` labels at the start of each hook (remove before merge). Combine with \`--bail\` so the first failure stops the cascade. For deeper traces, run a single file:

\`\`\`bash
npx mocha test/orders.test.js --slow 50
\`\`\`

Watch for tests that exceed the slow threshold: they often point at hooks doing network work that belongs in \`before\` instead of \`beforeEach\`, or the reverse (shared state that should be reset every case).

## Decision table: which hook should own this?

| Fixture | Prefer | Why |
|---------|--------|-----|
| Start test HTTP server | \`before\` / \`after\` | Costly; share across cases |
| Truncate \`orders\` table | \`beforeEach\` / \`afterEach\` | Must not leak rows |
| Fake system clock | \`beforeEach\` / \`afterEach\` | Clock must reset every case |
| Load JSON fixture into memory | \`before\` if immutable; else \`beforeEach\` | Pure data can be shared if not mutated |
| Open browser / page (Playwright wrapper) | Suite \`before\` for browser; \`beforeEach\` for fresh context/page | Browser launch is expensive; cookies are not |
| Sinon sandbox | \`beforeEach\` create, \`afterEach\` restore | Prevents stub bleed |
| Dockerized dependency | \`before\` of a top-level suite or external compose | Minutes-scale setup |

## Common failure modes and fixes

**Hook timeout with no clear stack.** The async work never settled: missing \`await\`, event never fired, or promise chain dropped. Convert to \`async\` and await the readiness probe explicitly.

**"Cannot log after tests are done" / open handle warnings (when using tools that detect them).** Something started in \`before\` or a test was not closed in \`after\` / \`afterEach\`. Track servers, timers, and DB pools.

**Order-dependent pass/fail.** Mutable shared array or module-level counter updated in tests without reset. Move initialization into \`beforeEach\`.

**Nested suite double-migrates the database.** Both parent and child call migrate in \`before\`. Keep schema migration on the outermost suite only; children only seed.

**AI coding agents inventing \`beforeAll\` in a Mocha BDD file.** Mocha's classic BDD UI documents \`before\` / \`after\` / \`beforeEach\` / \`afterEach\`. Some projects enable aliases or use other UIs; do not assume Jest naming works until you verify the project's Mocha UI and plugins. Ready-made QA skills install from qaskills.sh with the qaskills CLI when you want agent-facing checklists for runner-specific fixture rules.

## Practical recipe: API suite template

Use this skeleton as a default for REST handlers:

1. Outer \`describe\` starts app + migrates once (\`before\` / \`after\`).
2. Inner \`describe\` per resource seeds minimal rows (\`beforeEach\`) and deletes them (\`afterEach\`).
3. Auth token created in the resource suite \`beforeEach\` if every case needs a user; otherwise create inside the \`it\` that needs a special role.
4. No network calls in assertion helpers without cleanup ownership documented next to the helper.
5. Run the file alone under parallel CI first, then with siblings, to catch shared resource collisions early.

## Frequently Asked Questions

### Does beforeEach run before nested suite hooks?

Parent \`beforeEach\` hooks run before child \`beforeEach\` hooks for a given test. Teardown reverses: child \`afterEach\` runs before parent \`afterEach\`. Suite-level \`before\` / \`after\` follow the same outer-to-inner setup and inner-to-outer teardown stacking. If a child suite seems to miss parent setup, confirm the child is actually nested under that \`describe\`, not a sibling registered at the same level.

### Should I put assertions inside Mocha hooks?

Avoid it. Hook failures mark the suite infrastructure as broken and can skip or obscure individual cases. Use hooks to create preconditions; use \`it\` blocks to assert behavior. The exception is a deliberate smoke check that the server is listening, and even then prefer throwing a clear setup error after a readiness probe rather than a soft assertion library call that looks like a product failure.

### How do Mocha hooks interact with this.timeout and this.retries?

Both \`this.timeout(ms)\` and retry settings can be applied from hooks and tests depending on your Mocha version and interface. Timeouts apply to the hook function currently running. Retries re-execute the failed test and its per-test hooks; successful suite-level \`before\` work is not redone. Keep suite \`before\` idempotent only in the sense that it runs once, and keep \`beforeEach\` safe to run on every retry attempt.

### What is the difference between after and afterEach for database cleanup?

\`after\` is correct for dropping a schema or stopping a container acquired in \`before\`. \`afterEach\` is correct for deleting or rolling back rows created for a single case. Using only \`after\` for row cleanup lets failures inside the suite leave dirty data for later tests in the same process. Using only \`afterEach\` for container teardown pays a huge cost per test. Match cleanup scope to acquisition scope.
`,
};
