import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Jest Async/Await Testing & Promises Guide (2026)",
  description: "Master async testing in Jest: async/await, returning promises, resolves/rejects matchers, the done callback pitfalls, fake timers, and avoiding false-pass tests.",
  date: "2026-06-15",
  category: "JavaScript",
  content: `# Jest Async/Await Testing & Promises Guide

The reliable way to test asynchronous code in Jest is to make Jest **wait** for the async work to finish — either by marking the test \`async\` and \`await\`-ing the result, or by \`return\`-ing the promise from the test body. The cardinal rule: if you forget to await or return, Jest finishes the test before your assertions run, and broken code passes silently. Jest also provides the \`.resolves\` / \`.rejects\` matchers for asserting on promise outcomes, and a legacy \`done\` callback for callback-style APIs. This guide shows each pattern, the pitfalls that cause false passes, and how to control time with fake timers.

For installable, agent-ready JavaScript testing skills you can drop into Claude Code or Cursor, browse the [QASkills directory](/skills).

## The direct answer: async/await

Mark the test function \`async\` and \`await\` the promise. Jest waits for the returned promise to settle before completing the test.

\`\`\`js
test('fetchUser returns the user', async () => {
  const user = await fetchUser(1);
  expect(user.name).toBe('Ada');
});
\`\`\`

This is the recommended pattern for almost all async tests in 2026 — it reads like synchronous code, plays well with \`try/catch\`, and makes the "must wait" requirement obvious.

## Why forgetting to await breaks tests silently

This is the number-one async testing bug. Consider:

\`\`\`js
// BROKEN: assertion may never run, test passes anyway
test('rejects on bad id', () => {
  fetchUser(-1).then((user) => {
    expect(user).toBeDefined(); // if this throws, Jest never sees it
  });
});
\`\`\`

The test function returns \`undefined\` immediately, Jest marks it passed, and the \`.then\` callback runs later — possibly after the test is over. If the assertion inside fails, Jest may not associate the failure with this test at all. **Always either \`await\` or \`return\` the promise.** The two correct rewrites:

\`\`\`js
// Option A: async/await
test('rejects on bad id', async () => {
  await expect(fetchUser(-1)).rejects.toThrow('not found');
});

// Option B: return the promise
test('resolves the user', () => {
  return expect(fetchUser(1)).resolves.toHaveProperty('name', 'Ada');
});
\`\`\`

A safety net: enable the \`expect.hasAssertions()\` or \`expect.assertions(n)\` guard so Jest fails the test if the expected assertions did not run.

## The resolves / rejects matchers

\`.resolves\` and \`.rejects\` unwrap a promise and let you chain a normal matcher onto the settled value. They make assertions on outcomes concise:

\`\`\`js
test('resolves to a value', async () => {
  await expect(Promise.resolve(42)).resolves.toBe(42);
});

test('resolves to a shape', async () => {
  await expect(fetchUser(1)).resolves.toMatchObject({ id: 1 });
});

test('rejects with a specific error', async () => {
  await expect(fetchUser(-1)).rejects.toThrow('User not found');
});

test('rejects with an error type', async () => {
  await expect(loadConfig()).rejects.toBeInstanceOf(ValidationError);
});
\`\`\`

Critically, **you must still \`await\` (or \`return\`) the \`expect(...).resolves/.rejects\` expression.** Writing \`expect(p).resolves.toBe(1)\` without awaiting it creates a floating promise and the assertion is not enforced.

## try/catch for rejections — and its trap

You can assert on rejections with \`try/catch\`, but there is a subtle hazard: if the call unexpectedly *resolves*, the \`catch\` never runs and the test passes without checking anything.

\`\`\`js
// RISKY: passes if fetchUser does NOT reject
test('throws for missing user', async () => {
  try {
    await fetchUser(-1);
  } catch (err) {
    expect(err.message).toBe('User not found');
  }
});
\`\`\`

Guard it with \`expect.assertions(n)\` so Jest verifies the \`catch\` actually executed:

\`\`\`js
test('throws for missing user', async () => {
  expect.assertions(1);            // fails if the catch is skipped
  try {
    await fetchUser(-1);
  } catch (err) {
    expect(err.message).toBe('User not found');
  }
});
\`\`\`

For rejection assertions, \`await expect(...).rejects.toThrow(...)\` is cleaner and immune to this trap — prefer it over manual \`try/catch\` unless you need to inspect a complex error object.

## The done callback and its pitfalls

For callback-based APIs that do not return a promise, Jest supports a \`done\` parameter. The test does not finish until you call \`done()\`:

\`\`\`js
test('emits a "ready" event', (done) => {
  emitter.once('ready', (payload) => {
    try {
      expect(payload.ok).toBe(true);
      done();
    } catch (err) {
      done(err);          // report assertion failures to Jest
    }
  });
  emitter.start();
});
\`\`\`

Two pitfalls make \`done\` error-prone:

1. **If \`done()\` is never called, the test hangs until the timeout** (default 5000 ms) and then fails with an unhelpful timeout error.
2. **Assertions that throw inside the callback are not automatically reported** — you must wrap them in \`try/catch\` and pass the error to \`done(err)\`, or the failure surfaces as a timeout instead.

Also note: **you cannot mix \`done\` with an \`async\` function or a returned promise.** Jest will error if a test both takes \`done\` and returns a promise. Pick one. In modern code, wrap callback APIs in a promise and use \`async/await\` instead of reaching for \`done\`:

\`\`\`js
function ready(emitter) {
  return new Promise((resolve) => emitter.once('ready', resolve));
}

test('emits ready', async () => {
  emitter.start();
  const payload = await ready(emitter);
  expect(payload.ok).toBe(true);
});
\`\`\`

## Testing multiple async operations

\`Promise.all\` lets you await several operations and assert on the combined result:

\`\`\`js
test('loads dashboard data', async () => {
  const [user, orders, notes] = await Promise.all([
    fetchUser(1),
    fetchOrders(1),
    fetchNotes(1),
  ]);
  expect(user.id).toBe(1);
  expect(orders).toHaveLength(3);
  expect(notes).toEqual([]);
});
\`\`\`

For setup/teardown, \`beforeEach\`/\`afterEach\` accept async functions too — Jest waits for the returned promise:

\`\`\`js
beforeEach(async () => {
  await db.migrate();
  await db.seed();
});
\`\`\`

## Fake timers: testing code that uses setTimeout/setInterval

When code under test waits with \`setTimeout\`, \`setInterval\`, or \`Date\`, you do not want real time to pass in your tests. Jest's fake timers let you advance the clock instantly and deterministically.

\`\`\`js
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

test('debounced save fires after 300ms', () => {
  const save = jest.fn();
  const debounced = debounce(save, 300);

  debounced();
  expect(save).not.toHaveBeenCalled();

  jest.advanceTimersByTime(300);       // fast-forward 300ms
  expect(save).toHaveBeenCalledTimes(1);
});
\`\`\`

Useful controls:

- \`jest.advanceTimersByTime(ms)\` — run all timers scheduled within \`ms\`.
- \`jest.runAllTimers()\` — exhaust the timer queue (careful with recursive timers).
- \`jest.runOnlyPendingTimers()\` — run currently queued timers without picking up new ones they schedule.
- \`jest.setSystemTime(new Date('2026-01-01'))\` — pin \`Date.now()\` for deterministic timestamps.

### Combining fake timers with promises

A classic gotcha: code that mixes timers and promises (e.g. \`await sleep(1000)\` where \`sleep\` wraps \`setTimeout\`) needs both the timer advanced **and** the microtask queue flushed. Advancing the timer alone is not enough because the resolved promise's \`.then\` runs on the microtask queue. Use the async timer helpers and await between steps:

\`\`\`js
test('retries after a delay', async () => {
  const op = jest.fn()
    .mockRejectedValueOnce(new Error('flaky'))
    .mockResolvedValueOnce('ok');

  const promise = retryWithBackoff(op, 1000);

  await jest.advanceTimersByTimeAsync(1000);  // advance + flush microtasks
  await expect(promise).resolves.toBe('ok');
  expect(op).toHaveBeenCalledTimes(2);
});
\`\`\`

\`advanceTimersByTimeAsync\` (and \`runAllTimersAsync\`) advance fake timers and allow pending promise callbacks to run, which is what you almost always want when timers and \`async/await\` are intertwined.

## Setting and adjusting timeouts

Genuinely slow async tests can exceed the 5-second default. Raise the per-test timeout with a third argument, or globally with \`jest.setTimeout\`:

\`\`\`js
test('slow integration call', async () => {
  await runMigration();
}, 30000);              // 30s for this test only
\`\`\`

Resist raising timeouts to "fix" flakiness — a test that needs a long real-time wait usually signals missing fake timers or an unawaited promise. See related patterns on the [QASkills blog](/blog) and adjacent tools on [/compare](/compare).

## Mocking async dependencies

Most async tests should not hit a real network. Mock the dependency so the promise resolves instantly and deterministically, then assert on how your code reacts. With Jest's mock functions:

\`\`\`js
const api = { getUser: jest.fn() };

test('maps the API response to a view model', async () => {
  api.getUser.mockResolvedValue({ id: 1, first: 'Ada', last: 'Lovelace' });

  const vm = await loadUserCard(api, 1);

  expect(vm.displayName).toBe('Ada Lovelace');
  expect(api.getUser).toHaveBeenCalledWith(1);
});

test('surfaces a friendly message on failure', async () => {
  api.getUser.mockRejectedValue(new Error('503'));
  await expect(loadUserCard(api, 1)).rejects.toThrow('Could not load user');
});
\`\`\`

\`mockResolvedValue\` / \`mockRejectedValue\` are shorthand for returning a resolved or rejected promise. For a sequence of responses (first call fails, retry succeeds), chain \`mockResolvedValueOnce\`. This keeps async tests fast, deterministic, and free of network flakiness.

## Async setup and teardown ordering

When \`beforeEach\`/\`afterEach\` are async, Jest awaits them in order, so you can rely on setup completing before the test and teardown running after — even on failure. Order matters: declare cleanup so the most recently acquired resource is released first, and always tear down in \`afterEach\` (which runs even when the test throws) rather than at the end of the test body:

\`\`\`js
let server, db;
beforeEach(async () => {
  db = await openDb();
  server = await startServer(db);
});
afterEach(async () => {
  await server.close();   // release in reverse order of acquisition
  await db.close();
});
\`\`\`

Putting cleanup in the test body instead of \`afterEach\` leaks resources whenever an assertion fails — a frequent cause of cascading failures and hung CI runs.

## Common errors and troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Test passes but code is broken | Promise not awaited/returned | \`await\` or \`return\` the promise; add \`expect.hasAssertions()\` |
| \`Exceeded timeout of 5000 ms\` | \`done()\` never called, or a promise never resolves | Ensure resolution; prefer \`async/await\` over \`done\`; use fake timers |
| Rejection test passes when it shouldn't | \`catch\` skipped because call resolved | Add \`expect.assertions(n)\`, or use \`await expect(p).rejects.toThrow()\` |
| Fake-timer test hangs on awaited delay | Microtasks not flushed | Use \`advanceTimersByTimeAsync\` / \`runAllTimersAsync\` and await |
| \`Cannot use done() with an async function\` | Mixed \`done\` and returned promise | Choose one mechanism, not both |

## Frequently Asked Questions

### Should I use async/await, return the promise, or the done callback in Jest?

Prefer \`async/await\` for almost everything — it reads clearly, works with \`try/catch\`, and makes the "wait for this" requirement obvious. Returning the promise is equivalent and fine for one-liners. Reserve the \`done\` callback for callback-based APIs that do not return a promise, and even then consider wrapping the callback in a promise so you can use \`async/await\` instead.

### Why does my async Jest test pass even though the code is wrong?

Almost always because you neither awaited nor returned the promise, so Jest completed the test before the assertions ran. The \`.then\` callback executes after the test is over, and a failing assertion inside it is not attributed to the test. Fix it by \`await\`-ing or \`return\`-ing the promise, and add \`expect.hasAssertions()\` or \`expect.assertions(n)\` as a safety net.

### How do I assert that a promise rejects in Jest?

Use \`await expect(promise).rejects.toThrow('message')\` or \`.rejects.toBeInstanceOf(ErrorType)\` — and remember to await the whole expression. This is cleaner and safer than a manual \`try/catch\`, which silently passes if the call unexpectedly resolves. If you do use \`try/catch\`, guard it with \`expect.assertions(1)\` so Jest verifies the catch block actually executed.

### What are common pitfalls with the done callback?

If you never call \`done()\`, the test hangs until the timeout and fails with a misleading message, so always ensure every path calls it. Assertions that throw inside a callback are not auto-reported — wrap them in \`try/catch\` and pass the error to \`done(err)\`. Finally, you cannot combine \`done\` with an \`async\` test function or a returned promise; Jest will error if you mix them.

### How do I test setTimeout or debounced code without waiting in real time?

Enable fake timers with \`jest.useFakeTimers()\`, then advance the clock with \`jest.advanceTimersByTime(ms)\` or exhaust the queue with \`jest.runAllTimers()\`. This runs scheduled callbacks instantly and deterministically. Restore real timers in \`afterEach\` with \`jest.useRealTimers()\` so timer behavior does not leak into other tests.

### Why does my test hang when I combine fake timers with await?

Because advancing fake timers alone does not flush the microtask queue where resolved-promise callbacks run, so an \`await\`-ed delay never proceeds. Use the async variants — \`jest.advanceTimersByTimeAsync(ms)\` or \`jest.runAllTimersAsync()\` — and await them, which advance timers and let pending promise callbacks execute. This is the correct pattern whenever timers and \`async/await\` are intertwined.
`,
};
