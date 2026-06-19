import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Jest Setup and Teardown: beforeEach & afterEach Guide 2026",
  description: "Master Jest setup and teardown — beforeEach, afterEach, beforeAll, afterAll, setupFiles vs setupFilesAfterEach, and how scoping inside describe blocks works.",
  date: "2026-06-15",
  category: "JavaScript",
  content: `# Jest Setup and Teardown: beforeEach & afterEach Guide 2026

Jest provides four lifecycle hooks for setup and teardown: \`beforeEach\` and \`afterEach\` run before and after **every** test, while \`beforeAll\` and \`afterAll\` run **once** for the whole file or \`describe\` block. Use \`beforeEach\`/\`afterEach\` to create and reset per-test state (a fresh fixture, a cleared mock, a new in-memory record) so tests stay isolated, and use \`beforeAll\`/\`afterAll\` for expensive one-time work like opening a database connection. For setup shared across many files, point Jest at a setup module with \`setupFiles\` (runs before the framework loads) or \`setupFilesAfterEach\` (runs after, where \`expect\` and the hooks are available).

## The four lifecycle hooks at a glance

Every Jest test file has access to four global functions. They take a callback and an optional timeout, and they nest with \`describe\` blocks. Here is the core behavior:

| Hook | Runs | Typical use |
|---|---|---|
| \`beforeAll(fn)\` | Once, before the first test in scope | Open a DB pool, start a server, seed shared read-only data |
| \`beforeEach(fn)\` | Before **every** test in scope | Reset mocks, build a fresh object under test, begin a transaction |
| \`afterEach(fn)\` | After **every** test in scope | Restore spies, clear timers, roll back a transaction |
| \`afterAll(fn)\` | Once, after the last test in scope | Close the DB pool, stop the server, delete temp files |

"In scope" is the key phrase. A hook declared at the top level of a file applies to every test in that file. A hook declared inside a \`describe\` applies only to the tests in that block. We will return to scoping in detail below.

\`\`\`js
let counter;

beforeEach(() => {
  counter = 0; // fresh state for every test
});

test('increments', () => {
  counter += 1;
  expect(counter).toBe(1);
});

test('starts clean', () => {
  // counter is 0 again, not 1 — beforeEach reset it
  expect(counter).toBe(0);
});
\`\`\`

## beforeEach vs beforeAll: when to use which

The decision comes down to **isolation versus cost**.

Reach for \`beforeEach\` when each test must start from an identical, untouched state. This is the default you should prefer. If test A mutates an object and test B reads it, sharing that object via \`beforeAll\` makes B's result depend on whether A ran first — a classic source of order-dependent flakiness.

Reach for \`beforeAll\` only when setup is genuinely expensive and the result is **read-only** or safely reset between tests. A common pattern is to open a connection once with \`beforeAll\`, but reset the *data* with \`beforeEach\`:

\`\`\`js
let db;

beforeAll(async () => {
  db = await connect(process.env.TEST_DATABASE_URL); // expensive, do once
});

beforeEach(async () => {
  await db.query('TRUNCATE users RESTART IDENTITY CASCADE'); // cheap, do each time
});

afterAll(async () => {
  await db.end(); // release the pool so Jest can exit
});
\`\`\`

If you forget the \`afterAll\` cleanup, Jest may warn that it could not exit one second after the test run finished, usually because an open handle (a socket, timer, or connection) is still alive. Run with \`jest --detectOpenHandles\` to find the culprit.

## afterEach: restoring state and cleaning up

\`afterEach\` is where you undo anything a test changed in the shared environment. The most common job is restoring mocks and spies so one test's stubbing does not leak into the next.

\`\`\`js
afterEach(() => {
  jest.restoreAllMocks(); // undo jest.spyOn replacements
  jest.clearAllMocks();   // reset .mock.calls / .mock.results
});
\`\`\`

There is an important distinction among the three mock-reset functions:

- \`jest.clearAllMocks()\` resets \`mock.calls\`, \`mock.instances\`, and \`mock.results\` but keeps the implementation.
- \`jest.resetAllMocks()\` does the above **and** removes any mocked implementation, leaving a bare \`jest.fn()\`.
- \`jest.restoreAllMocks()\` only affects spies created with \`jest.spyOn\` and restores the **original** implementation.

Rather than calling these by hand in \`afterEach\`, most teams set them in config:

\`\`\`js
// jest.config.js
module.exports = {
  clearMocks: true,    // like jest.clearAllMocks() before every test
  restoreMocks: true,  // like jest.restoreAllMocks() before every test
};
\`\`\`

With \`clearMocks\` and \`restoreMocks\` enabled, you rarely need a manual \`afterEach\` for mocks at all. Note these config flags run **before** each test, which is equivalent in effect to a clean slate per test.

## Async setup and teardown

All four hooks support async work. Return a promise, use \`async\`/\`await\`, or accept a \`done\` callback. Returning the promise (or using \`async\`) is preferred because Jest waits for it automatically and surfaces rejections as failures.

\`\`\`js
beforeEach(async () => {
  await seedFixtures();
});

afterAll(() => {
  return server.close(); // returning the promise is enough
});
\`\`\`

Avoid mixing \`done\` with a returned promise in the same hook — Jest will error because it cannot tell which signal means "finished." Pick one style. Each hook accepts a second argument for a custom timeout in milliseconds if your setup is slow:

\`\`\`js
beforeAll(async () => {
  await startDockerContainer();
}, 30000); // allow 30s instead of the default 5s
\`\`\`

## How scoping works inside describe blocks

This is the part that trips people up. Hooks apply to their enclosing scope, and **outer hooks run before inner hooks** on the way in, then **inner hooks run before outer hooks** on the way out. Picture the order with a nested example:

\`\`\`js
beforeAll(() => console.log('1 - outer beforeAll'));
beforeEach(() => console.log('2 - outer beforeEach'));
afterEach(() => console.log('3 - outer afterEach'));
afterAll(() => console.log('4 - outer afterAll'));

test('outer test', () => console.log('TEST outer'));

describe('inner', () => {
  beforeAll(() => console.log('5 - inner beforeAll'));
  beforeEach(() => console.log('6 - inner beforeEach'));
  afterEach(() => console.log('7 - inner afterEach'));
  afterAll(() => console.log('8 - inner afterAll'));

  test('inner test', () => console.log('TEST inner'));
});
\`\`\`

The output order is:

\`\`\`text
1 - outer beforeAll
2 - outer beforeEach
TEST outer
3 - outer afterEach
5 - inner beforeAll
2 - outer beforeEach
6 - inner beforeEach
TEST inner
7 - inner afterEach
3 - outer afterEach
8 - inner afterAll
4 - outer afterAll
\`\`\`

Two takeaways: outer \`beforeEach\` runs for inner tests too (setup is cumulative, outermost first), and inner \`afterEach\` runs before outer \`afterEach\` (teardown unwinds innermost first). Also note Jest **executes all \`describe\` blocks first** to collect tests, before running any test bodies — so do not put test setup logic at the top level of a \`describe\`; put it inside a hook. The same principle applies in other runners; if you are comparing approaches, see our [testing skills directory](/skills) for framework-specific patterns.

## File-level setup: setupFiles vs setupFilesAfterEach

For setup that should apply to **every test file** without copy-pasting hooks, Jest exposes two config arrays. The names are similar but they run at very different times.

- **\`setupFiles\`** — modules that run **once per test file, before the test framework is installed**. At this point \`expect\`, \`beforeEach\`, and the other globals do **not** exist yet. Use it for things that must be in place before any test code loads: polyfills, environment variables, fake timers configured globally, or registering a global like \`fetch\`.

- **\`setupFilesAfterEach\`** — modules that run **after the framework is set up, before each test file's tests run**. Here \`expect\` and all lifecycle hooks **are** available. This is where you add custom matchers (for example from \`@testing-library/jest-dom\`) and register shared \`beforeEach\`/\`afterEach\` hooks.

\`\`\`js
// jest.config.js
module.exports = {
  setupFiles: ['<rootDir>/jest.polyfills.js'],
  setupFilesAfterEach: ['<rootDir>/jest.setup.js'],
};
\`\`\`

\`\`\`js
// jest.setup.js  (runs after framework is ready)
import '@testing-library/jest-dom';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});
\`\`\`

A reliable rule of thumb: if your setup code needs \`expect\`, a custom matcher, or any of the lifecycle hooks, it belongs in \`setupFilesAfterEach\`. If it must run before the test environment even exists (polyfilling a global, mutating \`process.env\`), it belongs in \`setupFiles\`.

> Historical note: older guides reference \`setupFilesAfterEach\`'s predecessor. In current Jest the after-framework array is the right home for matchers and shared hooks — always confirm the exact key against the version in your \`package.json\`, since config keys are the kind of detail that changes between major releases.

## A realistic end-to-end example

Here is a complete test file that ties the hooks together for a small service with a database and a clock.

\`\`\`js
import { UserService } from '../src/user-service';

let db;
let service;

beforeAll(async () => {
  db = await connect(process.env.TEST_DATABASE_URL);
});

afterAll(async () => {
  await db.end();
});

beforeEach(async () => {
  await db.query('TRUNCATE users RESTART IDENTITY CASCADE');
  service = new UserService(db);
  jest.useFakeTimers().setSystemTime(new Date('2026-06-15T00:00:00Z'));
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('UserService.create', () => {
  test('stores a user with a created_at timestamp', async () => {
    const user = await service.create({ email: 'a@example.com' });
    expect(user.createdAt.toISOString()).toBe('2026-06-15T00:00:00.000Z');
  });

  test('rejects a duplicate email', async () => {
    await service.create({ email: 'a@example.com' });
    await expect(service.create({ email: 'a@example.com' })).rejects.toThrow(/duplicate/);
  });
});
\`\`\`

Notice the layering: the connection is opened once (\`beforeAll\`), data is reset per test (\`beforeEach\`), the clock is frozen per test and restored after (\`afterEach\`), and the pool is closed at the very end (\`afterAll\`). This pattern scales to large suites without order-dependent flakiness.

## CI usage

In CI, lifecycle hooks behave identically, but two flags matter. Run \`jest --ci\` to disable automatic snapshot writing (snapshots must already exist), and add \`--runInBand\` if your \`beforeAll\`/\`afterAll\` resources (a shared port, a single test DB) cannot tolerate parallel worker processes. Otherwise let Jest parallelize and give each worker its own database via an env var keyed on \`process.env.JEST_WORKER_ID\`.

\`\`\`yaml
- name: Run tests
  run: npx jest --ci --runInBand --detectOpenHandles
\`\`\`

\`--detectOpenHandles\` is invaluable when CI hangs: it reports any resource your \`afterAll\` failed to close.

## Common errors and troubleshooting

**"Jest did not exit one second after the test run."** A handle is still open. You forgot an \`afterAll\` cleanup (unclosed server, DB pool, or timer). Add the teardown and run with \`--detectOpenHandles\`.

**State leaking between tests.** You used \`beforeAll\` where \`beforeEach\` was needed, or you mutated a module-level variable without resetting it. Move the setup to \`beforeEach\`, or reset the variable there.

**A spy from one test affects another.** You created a \`jest.spyOn\` but never restored it. Enable \`restoreMocks: true\` in config or call \`jest.restoreAllMocks()\` in \`afterEach\`.

**\`expect is not defined\` in a setup file.** Your matcher or hook setup is in \`setupFiles\` instead of \`setupFilesAfterEach\`. Move it to the after-framework array.

**Hooks run in an order you did not expect.** Remember outer-then-inner for \`before*\` and inner-then-outer for \`after*\`, and that all \`describe\` callbacks execute during collection before any test runs.

For broader context on isolating tests with fresh fixtures across frameworks, compare approaches in our [framework comparison hub](/compare) or browse more guides on the [blog](/blog).

## Frequently Asked Questions

### What is the difference between beforeEach and beforeAll in Jest?

\`beforeEach\` runs before every individual test in its scope, giving each test a fresh starting state, while \`beforeAll\` runs only once before the first test in scope. Use \`beforeEach\` for per-test isolation (resetting mocks or data) and \`beforeAll\` for expensive one-time setup like opening a database connection. Mixing them — connect once with \`beforeAll\`, reset data with \`beforeEach\` — is a common, safe pattern.

### Does beforeEach run for tests inside nested describe blocks?

Yes. A \`beforeEach\` declared at the file's top level runs before every test in the file, including tests inside nested \`describe\` blocks. When both an outer and an inner \`beforeEach\` exist, the outer one runs first, then the inner one, before each inner test. Teardown unwinds in the reverse order, with the inner \`afterEach\` running before the outer \`afterEach\`.

### What is the difference between setupFiles and setupFilesAfterEach?

\`setupFiles\` modules run once per test file before the Jest framework is installed, so \`expect\` and the lifecycle hooks are not available yet — use it for polyfills and environment setup. The after-framework setup array runs after the framework is ready, where \`expect\`, custom matchers, and hooks all work — use it for \`@testing-library/jest-dom\`, custom matchers, and shared \`beforeEach\`/\`afterEach\` hooks. Always confirm the exact config key against your installed Jest version.

### How do I do async setup in a Jest hook?

Make the hook callback \`async\` and \`await\` your asynchronous work, or return the promise directly — Jest waits for it to settle and reports rejections as failures. Do not combine the \`done\` callback with a returned promise in the same hook, since Jest cannot tell which signal indicates completion. Pass a second numeric argument to the hook to raise the timeout for slow setup, e.g. \`beforeAll(fn, 30000)\`.

### How do I reset mocks between tests automatically?

Enable \`clearMocks: true\` and \`restoreMocks: true\` in your Jest config so mock call data is cleared and \`jest.spyOn\` replacements are restored before each test, removing the need for a manual \`afterEach\`. \`clearMocks\` resets \`mock.calls\` and \`mock.results\`, while \`restoreMocks\` restores original implementations for spies. For full implementation removal use \`resetMocks\`/\`jest.resetAllMocks()\`.

### Why does Jest say it could not exit after my tests finished?

That warning means an open handle — an unclosed server, database pool, socket, or pending timer — is keeping the Node process alive. The fix is to release the resource in an \`afterAll\` (or \`afterEach\`) hook that mirrors your setup. Run \`jest --detectOpenHandles\` to get a stack trace pointing at the resource that was never closed.
`,
};
