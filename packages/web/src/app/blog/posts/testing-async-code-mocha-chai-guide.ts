import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Async Code with Mocha and Chai: Promises, async/await, done',
  description: 'Learn testing async code with Mocha and Chai using promises, async/await, and done, with reliable patterns that prevent false passes and flaky tests.',
  date: '2026-07-18',
  category: 'Guide',
  content: `
# Testing Async Code with Mocha and Chai: Promises, async/await, done

Asynchronous tests fail in distinctive ways. A rejected promise can surface after Mocha has already marked a test green. A callback can run twice. A polling assertion can pass locally yet time out in CI. The syntax is rarely the hard part. The real challenge is making the test's completion boundary match the system behavior being verified.

This guide shows three documented Mocha completion styles: returning a promise, declaring an async test and awaiting work, and accepting the \`done\` callback. The examples use Chai assertions and realistic QA targets such as API clients, retry logic, event callbacks, and timeout behavior. If you need broader framework selection context, start with the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026). For the assertion and suite fundamentals used here, see the [Mocha and Chai testing guide](/blog/mocha-chai-testing-guide).

## The completion signal is the test contract

Mocha waits for synchronous tests to return, but asynchronous tests need an explicit completion signal. Choose exactly one signal for each test. When a test returns a thenable, Mocha waits for it to settle. When the test function is declared \`async\`, it returns a promise automatically. When the function accepts \`done\`, Mocha waits until that callback is invoked or the test times out.

| Style | Mocha considers the test complete when | Best fit | Main failure mode |
|---|---|---|---|
| Return a promise | The returned promise fulfills or rejects | Direct promise APIs and short chains | Forgetting \`return\` |
| \`async\` and \`await\` | The async function's promise settles | Multi-step workflows and readable setup | Starting work without awaiting it |
| \`done\` callback | \`done()\` or \`done(error)\` runs | Node-style callbacks and event emitters | Never calling it, or calling it twice |

Here is a small system under test that resembles an SDK wrapper. Its promise either resolves to a normalized record or rejects with the original transport error.

\`\`\`ts
export async function loadUser(
  id: string,
  fetchUser: (id: string) => Promise<{ id: string; active: boolean }>
) {
  const user = await fetchUser(id);
  return { ...user, status: user.active ? 'enabled' : 'disabled' };
}
\`\`\`

The useful assertion is not merely that a promise completed. A QA-focused test checks the contract at the boundary: the dependency received the correct identifier, the normalized status is correct, and rejection details remain observable.

## Return promises when the behavior is already a chain

Returning the promise is the leanest option when no intermediate values require imperative setup. The critical word is \`return\`. Without it, the test body ends immediately, and an assertion inside \`.then()\` may execute after Mocha reports success.

\`\`\`ts
import { expect } from 'chai';
import { loadUser } from '../src/load-user';

describe('loadUser', () => {
  it('maps an active account to enabled', () => {
    const fetchUser = (id: string) =>
      Promise.resolve({ id, active: true });

    return loadUser('qa-42', fetchUser).then((result) => {
      expect(result).to.deep.equal({
        id: 'qa-42',
        active: true,
        status: 'enabled',
      });
    });
  });
});
\`\`\`

For a rejection, test the error path explicitly. With core Chai, use both branches so an unexpected fulfillment fails instead of silently skipping the rejection assertion.

\`\`\`ts
it('preserves a transport rejection', () => {
  const transportError = new Error('gateway unavailable');
  const fetchUser = () => Promise.reject(transportError);

  return loadUser('qa-42', fetchUser).then(
    () => {
      throw new Error('expected loadUser to reject');
    },
    (error) => {
      expect(error).to.equal(transportError);
      expect(error.message).to.equal('gateway unavailable');
    }
  );
});
\`\`\`

That explicit fulfillment branch is a test oracle. It proves that rejection, not simply completion, is required. Avoid a pattern that places only \`catch\` after the call. If the promise unexpectedly resolves, the catch handler never runs and the test can pass without an assertion.

## Use async and await for multi-step QA scenarios

Most service tests become clearer with \`async\` and \`await\`. This style keeps arrange, act, and assert in one linear flow. Exceptions thrown by the code or by Chai reject the async function's promise, which Mocha treats as a test failure.

\`\`\`ts
it('passes the requested ID and normalizes an inactive user', async () => {
  const requestedIds: string[] = [];
  const fetchUser = async (id: string) => {
    requestedIds.push(id);
    return { id, active: false };
  };

  const result = await loadUser('qa-17', fetchUser);

  expect(requestedIds).to.deep.equal(['qa-17']);
  expect(result).to.include({ id: 'qa-17', status: 'disabled' });
});
\`\`\`

Use \`try/catch\` for rejections when you need core Chai only. Add an assertion after the awaited call that can never be reached on the expected path. This prevents an unexpected resolution from looking successful.

\`\`\`ts
it('reports a malformed response', async () => {
  const fetchUser = async () => {
    throw new TypeError('active must be boolean');
  };

  try {
    await loadUser('bad-record', fetchUser);
    expect.fail('expected loadUser to reject');
  } catch (error) {
    expect(error).to.be.instanceOf(TypeError);
    expect((error as Error).message).to.equal('active must be boolean');
  }
});
\`\`\`

One subtle trap remains: an async test can still launch untracked work. If a helper returns a promise, await it or return it. Calls such as \`seedDatabase()\`, \`page.close()\`, or \`client.flush()\` should not float beyond the test boundary. This is especially important in teardown, where unfinished cleanup contaminates the next test.

## Reserve done for callback and event APIs

The \`done\` form exists for code whose completion is not represented by a promise. Common examples include legacy Node callbacks, one-shot event listeners, streams, and adapters that invoke a supplied function. Pass failures to \`done(error)\` so Mocha can report them.

Suppose a validator uses a Node-style callback:

\`\`\`ts
type ValidationResult = { valid: boolean; reason?: string };

export function validateToken(
  token: string,
  callback: (error: Error | null, result?: ValidationResult) => void
) {
  queueMicrotask(() => {
    if (!token) return callback(new Error('token is required'));
    callback(null, { valid: token.startsWith('qa_') });
  });
}
\`\`\`

The callback test wraps assertions in \`try/catch\`. Otherwise, a thrown Chai assertion may not be associated cleanly with the callback completion path.

\`\`\`ts
it('accepts a token with the QA prefix', (done) => {
  validateToken('qa_sample', (error, result) => {
    if (error) return done(error);

    try {
      expect(result).to.deep.equal({ valid: true });
      done();
    } catch (assertionError) {
      done(assertionError as Error);
    }
  });
});
\`\`\`

Do not declare the function \`async\` and also accept \`done\`. That creates two completion mechanisms. Mocha documents this as overspecification and reports an error when a test returns a promise while also using a callback. Convert the callback API to a promise if the rest of the scenario benefits from await, or keep the test callback-based from end to end.

## Make timing deterministic instead of generous

Raising a timeout often hides the race rather than fixing it. First identify what the test is waiting for: a promise settlement, an event, a retry delay, or an external service. Replace controllable dependencies with fakes, and observe stable outcomes instead of wall-clock timing.

| Timing problem | Fragile response | Deterministic test design |
|---|---|---|
| Retry waits one second | Increase the suite timeout | Inject a sleep function and resolve it immediately |
| Event may fire before listener attaches | Add a short delay before assertion | Attach the listener before triggering the action |
| Background queue drains eventually | Poll with arbitrary sleeps | Expose or await a drain promise |
| Remote API is slow | Retry the whole test | Stub the boundary and cover the real API separately |

Here is retry code with an injected delay. The test verifies both the attempt count and the configured backoff without actually waiting.

\`\`\`ts
async function retryOnce<T>(
  operation: () => Promise<T>,
  sleep: (milliseconds: number) => Promise<void>
): Promise<T> {
  try {
    return await operation();
  } catch {
    await sleep(200);
    return operation();
  }
}

it('retries once after the configured delay', async () => {
  let attempts = 0;
  const delays: number[] = [];
  const operation = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('temporary');
    return 'ok';
  };
  const sleep = async (milliseconds: number) => {
    delays.push(milliseconds);
  };

  expect(await retryOnce(operation, sleep)).to.equal('ok');
  expect(attempts).to.equal(2);
  expect(delays).to.deep.equal([200]);
});
\`\`\`

This design runs quickly in CI and validates the behavior that matters. A separate integration test can exercise real scheduling if that risk deserves coverage.

## Diagnose hangs, false passes, and unhandled rejections

Start from the symptom and inspect the completion signal. Mocha's standard CLI can run a single file, filter tests by title, and change the timeout while investigating. Treat a longer timeout as diagnostic evidence, not the final repair.

\`\`\`bash
npx mocha "test/load-user.spec.ts"
npx mocha "test/load-user.spec.ts" --grep "preserves a transport rejection"
npx mocha "test/load-user.spec.ts" --timeout 5000
\`\`\`

| Symptom | Likely cause | First inspection |
|---|---|---|
| Green test with no assertion output | Promise was not returned or awaited | Check the act line and every async helper |
| Timeout exceeded | \`done\` was not reached, or promise stayed pending | Trace every branch, including error branches |
| Multiple-done error | Callback fires twice or both success and failure paths continue | Add early returns and inspect emitter lifecycle |
| Rejection after the test ends | Detached promise or delayed cleanup | Await teardown and background operations |
| Passes alone, fails in suite | Shared state survives between tests | Reset fakes, listeners, timers, and fixtures |

For callback code, make every terminal path visible. An \`if (error) return done(error)\` guard matters because execution must stop after signaling failure. For promises, scan for array methods that discard returned promises. For example, \`items.forEach(async item => ...)\` does not provide a combined promise to await. Use \`Promise.all(items.map(async item => ...))\` when parallel completion is intended, or a \`for...of\` loop for sequential work.

## Review async tests with a completion checklist

Before merging, verify the test as a small state machine rather than judging its readability alone.

1. Identify the single signal that tells Mocha the test is finished.
2. Confirm every expected failure path reaches a Chai assertion.
3. Confirm every unexpected success path fails deliberately.
4. Await setup and teardown that return promises.
5. Replace avoidable sleeps with observable completion or injected scheduling.
6. Assert meaningful outputs and interactions, not only that no error occurred.
7. Run the test with its surrounding suite to expose leaked state.

These checks catch the most expensive async defects: false confidence, cross-test contamination, and CI-only timing failures. The syntax you choose is secondary to a completion boundary that faithfully represents the behavior under test.

## Frequently Asked Questions

### Should every Mocha test be declared async?

No. Use an async function when the test awaits promise-based work. Keep truly synchronous tests synchronous, return a promise when a concise chain is clearer, and use \`done\` for callback-only interfaces. Declaring everything async can conceal a forgotten await because the function still returns a fulfilled promise. The best choice is the one that exposes exactly one honest completion signal and makes missing work obvious during review.

### How do I prove that a promise rejects with core Chai?

Use \`try/catch\` around an awaited call and call \`expect.fail\` immediately after the call, or return a two-branch \`then\` expression whose fulfillment branch throws. Then assert the rejection type, message, and any stable domain fields. A catch-only test is insufficient because unexpected fulfillment skips the catch and may leave the test green without checking anything.

### Why does my callback test time out even though the assertion ran?

Mocha waits for \`done\`, not merely for the callback or assertion to execute. Ensure the success path calls \`done()\` and each error path calls \`done(error)\`. Wrap callback assertions so thrown failures are forwarded. Also check for a branch that returns before completion, an event listener attached too late, or a stub that never invokes the callback expected by the production code.

### Is increasing the Mocha timeout a valid fix for flaky async tests?

It is valid only when the operation legitimately needs more time and the threshold represents a requirement. It is not a cure for races, forgotten awaits, uncontrolled network calls, or callbacks that may never fire. First make completion observable, isolate external services, and inject delays or clocks where practical. If a longer timeout remains necessary, scope it narrowly and keep assertions on the behavior and elapsed-time contract that justify it.
`,
};
