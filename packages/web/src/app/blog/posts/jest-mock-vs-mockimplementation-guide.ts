import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'jest.fn() vs mockImplementation: Mocking Guide 2026',
  description:
    'Learn jest.fn(), mockImplementation, mockReturnValue, and mockResolvedValue, how to mock axios, plus how Jest mocking maps to pytest-mock and unittest.mock.',
  date: '2026-05-30',
  category: 'Reference',
  content: `
# jest.fn() vs mockImplementation: The Complete Mocking Guide

Mocking is where most JavaScript and TypeScript test suites either become rock-solid or quietly rot. Jest gives you a rich set of mocking primitives, but the relationship between them confuses almost everyone at first. What is the difference between \`jest.fn()\` and \`mockImplementation\`? When do you reach for \`mockReturnValue\` versus \`mockResolvedValue\`? How do you mock an entire module like axios, and why does the order of \`jest.mock()\` calls matter? And if you also work in Python, how does all of this map onto pytest-mock and unittest.mock? This guide answers every one of those questions with working code you can paste into a real test file.

The short version, so you have a mental anchor before the details: \`jest.fn()\` creates a mock function. \`mockImplementation\` is a method you call *on* a mock function to give it a custom body. They are not competing alternatives; they are two halves of the same workflow. You almost always create a mock with \`jest.fn()\` (or get one from \`jest.mock()\`) and then shape its behavior with \`mockImplementation\`, \`mockReturnValue\`, or \`mockResolvedValue\`. Once that clicks, the rest of Jest's mocking API falls into place. We will build up from the single mock function, through return-value helpers, into full module mocking with the axios example everyone needs, and finish with a cross-language comparison so Python developers can transfer their mental model. If you use Vitest instead of Jest, almost everything here applies unchanged because Vitest deliberately mirrors the Jest mocking API; see our [Jest vs Vitest comparison](/blog/jest-vs-vitest-2026) for the differences.

To have an AI coding agent write correct mocks for you, install a [testing skill](/skills) into Claude Code or Cursor and it will follow these patterns automatically.

## jest.fn(): Creating a Mock Function

\`jest.fn()\` is the foundation of Jest mocking. It returns a brand-new **mock function**: a callable that records every call made to it (arguments, return values, \`this\`, call order) and lets you assert on that history afterward. By itself, a bare \`jest.fn()\` does nothing useful when called; it returns \`undefined\`. Its value comes from two things: tracking calls, and being programmable.

\`\`\`javascript
const fn = jest.fn();

fn('hello', 42);
fn('world');

// The mock recorded every call
expect(fn).toHaveBeenCalledTimes(2);
expect(fn).toHaveBeenCalledWith('hello', 42);
expect(fn.mock.calls).toEqual([['hello', 42], ['world']]);
expect(fn('anything')).toBeUndefined();   // no implementation yet
\`\`\`

The \`fn.mock\` property is where all the recorded data lives: \`fn.mock.calls\` is an array of argument arrays, \`fn.mock.results\` holds return values, and \`fn.mock.instances\` tracks \`new\` usage. Every other mocking method in Jest is about controlling what a mock function *does* when called, layered on top of this tracking. That is the key insight: \`jest.fn()\` answers "was this called and how," and the methods below answer "what should it do."

## mockImplementation: Giving a Mock a Body

\`mockImplementation\` sets the actual function body that runs when the mock is called. This is the most flexible way to program a mock because you supply arbitrary logic: conditionals, computed return values, side effects, anything a normal function can do.

\`\`\`javascript
const add = jest.fn();
add.mockImplementation((a, b) => a + b);

expect(add(2, 3)).toBe(5);
expect(add).toHaveBeenCalledWith(2, 3);   // still tracks calls

// You can pass the implementation directly to jest.fn() too:
const multiply = jest.fn((a, b) => a * b);
expect(multiply(4, 5)).toBe(20);
\`\`\`

There is also \`mockImplementationOnce\`, which queues an implementation that is used for exactly one call and then discarded. Chain several to script a sequence of behaviors, with \`mockImplementation\` as the fallback once the queue empties.

\`\`\`javascript
const flaky = jest.fn();
flaky
  .mockImplementationOnce(() => { throw new Error('first call fails'); })
  .mockImplementationOnce(() => 'second call works')
  .mockImplementation(() => 'all later calls');

expect(() => flaky()).toThrow('first call fails');
expect(flaky()).toBe('second call works');
expect(flaky()).toBe('all later calls');
expect(flaky()).toBe('all later calls');
\`\`\`

So \`jest.fn()\` versus \`mockImplementation\` is a false dichotomy. \`jest.fn()\` creates the mock; \`mockImplementation\` configures its behavior. You use them together.

## mockReturnValue vs mockResolvedValue

When all you need is a fixed return value, writing a full implementation is overkill. Jest provides shortcuts. \`mockReturnValue\` makes the mock return a constant synchronously. \`mockResolvedValue\` makes it return a Promise that resolves to a value, which is exactly what you want when mocking async functions. There are matching rejection and "once" variants.

| Method | Returns | Use for |
|---|---|---|
| \`mockReturnValue(v)\` | \`v\` synchronously | Plain sync functions |
| \`mockReturnValueOnce(v)\` | \`v\` for the next call only | Scripted sync sequences |
| \`mockResolvedValue(v)\` | \`Promise.resolve(v)\` | Async functions / await |
| \`mockResolvedValueOnce(v)\` | resolved Promise, next call only | Scripted async sequences |
| \`mockRejectedValue(e)\` | \`Promise.reject(e)\` | Testing error/catch paths |
| \`mockImplementation(fn)\` | whatever \`fn\` returns | Custom logic, conditionals |

\`\`\`javascript
// Synchronous constant
const getConfig = jest.fn().mockReturnValue({ env: 'test' });
expect(getConfig()).toEqual({ env: 'test' });

// Async success: mockResolvedValue is sugar for an async implementation
const fetchUser = jest.fn().mockResolvedValue({ id: 1, name: 'Ada' });
await expect(fetchUser()).resolves.toEqual({ id: 1, name: 'Ada' });

// Async failure
const fetchBroken = jest.fn().mockRejectedValue(new Error('network down'));
await expect(fetchBroken()).rejects.toThrow('network down');
\`\`\`

Note that \`mockResolvedValue(x)\` is just shorthand for \`mockImplementation(() => Promise.resolve(x))\`. If your async behavior is more complex than a single resolved value, drop down to \`mockImplementation\` with an async function. The shortcuts cover the common case; \`mockImplementation\` covers everything.

## Mocking Modules with jest.mock()

Mocking a single function is useful, but the real power is replacing an entire dependency module so your code under test never touches the real thing. \`jest.mock('module-name')\` auto-mocks every export of that module, turning each function into a \`jest.fn()\`. You then program those auto-created mocks in your test.

A critical detail: \`jest.mock()\` calls are **hoisted** to the top of the file by Jest's transformer, executing before your \`import\` statements regardless of where you write them. This is why the order seems to matter; in practice it means you can write the \`jest.mock()\` call after your imports and it still applies, but you must not rely on variables from the module scope inside a non-hoisted factory unless they are prefixed with \`mock\`. Understanding this hoisting behavior eliminates a whole class of confusing failures.

\`\`\`javascript
import { getUser } from './user-service';
import { db } from './database';

jest.mock('./database');   // hoisted; replaces db with auto-mocks

test('getUser queries the database', async () => {
  // db.query is now a jest.fn() we can program
  db.query.mockResolvedValue([{ id: 1, name: 'Ada' }]);

  const user = await getUser(1);

  expect(user.name).toBe('Ada');
  expect(db.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [1]);
});
\`\`\`

You can also pass a **factory function** as the second argument to control exactly what the mock module exports. This is essential when auto-mocking is not enough, for example when you need a default export or a specific shape.

\`\`\`javascript
jest.mock('./logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  __esModule: true,
  default: jest.fn(),
}));
\`\`\`

## The axios Question: jest.fn() vs mockImplementation in HTTP Mocking

The most-searched mocking question in the JavaScript world is some variant of "difference between jest.fn() and mockImplementation when mocking axios." The confusion arises because axios mocking combines module mocking, mock functions, and return-value helpers all at once. Let us settle it definitively.

When you mock axios, you first replace the module with \`jest.mock('axios')\`. That turns \`axios.get\`, \`axios.post\`, and so on into mock functions created by Jest. At that point \`axios.get\` *is* a \`jest.fn()\`. Now you need to tell it what to return. You have two equivalent options, and choosing between them is the heart of the question:

\`\`\`javascript
import axios from 'axios';
import { fetchTodos } from './todos';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

afterEach(() => jest.clearAllMocks());

test('option A: mockResolvedValue (preferred for simple cases)', async () => {
  mockedAxios.get.mockResolvedValue({ data: [{ id: 1, title: 'Test' }] });

  const todos = await fetchTodos();

  expect(todos).toHaveLength(1);
  expect(mockedAxios.get).toHaveBeenCalledWith('/api/todos');
});

test('option B: mockImplementation (when you need logic)', async () => {
  mockedAxios.get.mockImplementation((url) => {
    if (url === '/api/todos') {
      return Promise.resolve({ data: [{ id: 1, title: 'Test' }] });
    }
    return Promise.reject(new Error(\`Unexpected URL: \${url}\`));
  });

  const todos = await fetchTodos();
  expect(todos).toHaveLength(1);
});
\`\`\`

Here is the rule. **Use \`mockResolvedValue\` (or \`mockReturnValue\`) when the response is the same regardless of input.** It is shorter and reads clearly. **Use \`mockImplementation\` when the mock must vary its behavior based on the arguments**, for example returning different data for different URLs, simulating retries, or throwing on certain inputs. They produce identical results in the simple case because \`mockResolvedValue(x)\` is literally \`mockImplementation(() => Promise.resolve(x))\` under the hood. There is no functional difference for a single fixed response; the difference is expressiveness and intent. For deeper API mocking strategies, see our [API mocking and service virtualization guide](/blog/api-mocking-service-virtualization-guide).

A common refinement is to mock only the specific method rather than the whole module, using \`jest.spyOn\`:

\`\`\`javascript
import axios from 'axios';

const spy = jest.spyOn(axios, 'get').mockResolvedValue({ data: { ok: true } });
// ... run test ...
spy.mockRestore();   // restore the real implementation afterward
\`\`\`

\`jest.spyOn\` wraps an existing method, letting you observe and optionally override it, then restore it later. Prefer it when you want to keep most of a module real and stub just one method.

## Cleaning Up Mocks Between Tests

Mocks accumulate state across tests, which causes order-dependent failures: a call count from one test leaks into the next. Reset them in a teardown hook. Jest offers three reset levels, and choosing the right one matters.

| Method | Clears call data | Removes implementations | Restores original (spies) |
|---|---|---|---|
| \`mockClear()\` / \`clearAllMocks()\` | Yes | No | No |
| \`mockReset()\` / \`resetAllMocks()\` | Yes | Yes | No |
| \`mockRestore()\` / \`restoreAllMocks()\` | Yes | Yes | Yes (only for spies) |

\`\`\`javascript
afterEach(() => {
  jest.clearAllMocks();   // most common: reset call history each test
});
\`\`\`

You can also set \`clearMocks: true\` in your Jest config to do this automatically. Use \`restoreAllMocks\` when you have used \`jest.spyOn\` and need the real implementations back. Forgetting cleanup is one of the top causes of [flaky tests](/blog/fix-flaky-tests-guide).

## Jest Mocking vs pytest-mock vs unittest.mock

If you write tests in both JavaScript and Python, mapping the concepts across languages saves enormous confusion. Python's standard library ships \`unittest.mock\`, and the pytest ecosystem adds \`pytest-mock\`, a thin fixture wrapper around it. The mental models line up closely once you see the correspondence.

| Concept | Jest | unittest.mock (Python) | pytest-mock (Python) |
|---|---|---|---|
| Create a mock function | \`jest.fn()\` | \`Mock()\` / \`MagicMock()\` | \`mocker.Mock()\` |
| Set a return value | \`.mockReturnValue(v)\` | \`.return_value = v\` | \`.return_value = v\` |
| Set async/resolved value | \`.mockResolvedValue(v)\` | \`AsyncMock(return_value=v)\` | \`mocker.AsyncMock(...)\` |
| Custom implementation | \`.mockImplementation(fn)\` | \`.side_effect = fn\` | \`.side_effect = fn\` |
| Sequence of returns | \`.mockReturnValueOnce(...)\` chain | \`.side_effect = [a, b, c]\` | \`.side_effect = [a, b, c]\` |
| Raise / reject | \`.mockRejectedValue(e)\` | \`.side_effect = Exception()\` | \`.side_effect = Exception()\` |
| Patch a module/attr | \`jest.mock('mod')\` | \`@patch('mod.attr')\` | \`mocker.patch('mod.attr')\` |
| Spy on real method | \`jest.spyOn(obj, 'm')\` | \`patch.object(obj, 'm', wraps=...)\` | \`mocker.patch.object(..., wraps=...)\` |
| Auto cleanup | \`clearMocks: true\` config | manual / context manager | automatic (fixture-scoped) |

The closest one-to-one mappings worth memorizing: Jest's \`mockReturnValue\` equals Python's \`return_value\` attribute, and Jest's \`mockImplementation\` equals Python's \`side_effect\` when you assign a callable. Python's \`side_effect\` is overloaded: assign a function for custom logic, assign a list for a sequence of returns, or assign an exception to raise. Here is the Python equivalent of the axios example using pytest-mock:

\`\`\`python
# Python with pytest-mock
def test_fetch_todos(mocker):
    mock_get = mocker.patch("todos.requests.get")
    mock_get.return_value.json.return_value = [{"id": 1, "title": "Test"}]

    todos = fetch_todos()

    assert len(todos) == 1
    mock_get.assert_called_once_with("/api/todos")
\`\`\`

**pytest-mock vs unittest.mock**: they are the same engine. pytest-mock's \`mocker\` fixture wraps unittest.mock and, crucially, automatically undoes every patch when the test ends, so you never write \`with patch(...)\` blocks or manual \`stopall()\` calls. Use pytest-mock in pytest projects for that automatic teardown; use unittest.mock directly only outside pytest. For more, see our [pytest best practices guide](/blog/pytest-best-practices-2026) and [Python unittest vs pytest](/blog/python-unittest-vs-pytest).

## Typing Mocks in TypeScript

In a TypeScript codebase, untyped mocks are a common source of friction: \`mockResolvedValue\` may complain that your shape does not match, or autocomplete on \`.mock.calls\` may not work. The fix is to tell the compiler that a value is a mock. Jest provides \`jest.Mocked<T>\` for whole modules and \`jest.MockedFunction<T>\` for individual functions.

\`\`\`typescript
import axios from 'axios';
jest.mock('axios');

// Tell TypeScript the whole module is mocked
const mockedAxios = axios as jest.Mocked<typeof axios>;
mockedAxios.get.mockResolvedValue({ data: { ok: true } });

// Or type a single function mock
import { fetchUser } from './api';
jest.mock('./api');
const mockedFetchUser = fetchUser as jest.MockedFunction<typeof fetchUser>;
mockedFetchUser.mockResolvedValue({ id: 1, name: 'Ada' });
\`\`\`

With these casts, \`mockResolvedValue\` enforces that your resolved value matches the function's real return type, autocomplete works on mock methods, and a type change in the real function surfaces as a compile error in the test. This turns your tests into a second layer of type checking. The newer \`jest.mocked()\` helper does the same thing more concisely: \`const mockedAxios = jest.mocked(axios)\`. Prefer \`jest.mocked()\` in new code because it requires no manual \`as\` cast and reads more clearly.

## Common Mocking Pitfalls to Avoid

A handful of mistakes account for most mocking pain. Knowing them upfront saves hours of debugging.

**Mocking what you do not own at the wrong boundary.** Mock at the edge of your system, not deep inside third-party internals. Mock the HTTP client (axios) or the module that wraps it, not the network socket. Mocking too deep couples your test to implementation details that change.

**Forgetting to reset between tests.** As covered above, call \`jest.clearAllMocks()\` in \`afterEach\` or set \`clearMocks: true\`. Without it, a call count or queued \`...Once\` implementation leaks into the next test, producing failures that depend on test order and are maddening to debug.

**Confusing the mock with the real export in ESM.** With ES modules and Babel/SWC, \`jest.mock\` hoisting still applies, but you must reference the imported binding, not re-import. Always program the same object your code under test imports. The \`jest.Mocked\` cast on the imported symbol keeps this straight.

**Over-asserting on implementation.** Asserting \`toHaveBeenCalledWith\` on every internal call makes tests brittle. Assert on the calls that represent the contract you care about (the URL fetched, the payload sent) and let the rest be free. Tests that mirror the implementation line for line break on every refactor even when behavior is unchanged.

**Using mockReturnValue for async code.** If the real function is async and your code \`await\`s it, \`mockReturnValue({ data })\` returns a plain object, not a Promise, so the \`await\` resolves to the object but \`.then\` chains break and TypeScript complains. Use \`mockResolvedValue\` for anything awaited.

| Pitfall | Symptom | Fix |
|---|---|---|
| No reset between tests | Order-dependent failures | \`clearAllMocks()\` / \`clearMocks: true\` |
| \`mockReturnValue\` for async | \`.then\` is not a function | Use \`mockResolvedValue\` |
| Over-asserting internal calls | Tests break on every refactor | Assert only the contract |
| Mocking too deep | Brittle, coupled tests | Mock at the dependency boundary |
| Untyped mocks in TS | Type errors, no autocomplete | \`jest.mocked()\` / \`jest.Mocked<T>\` |

Avoiding these keeps a mock-heavy suite maintainable rather than turning it into a liability. The guiding principle is to mock the boundary, program only what the test needs, reset between tests, and assert on behavior rather than implementation.

## Frequently Asked Questions

### What is the difference between jest.fn() and mockImplementation in axios mocking?

There is no functional difference for a single fixed response, because \`mockResolvedValue(x)\` is shorthand for \`mockImplementation(() => Promise.resolve(x))\`. After \`jest.mock('axios')\`, \`axios.get\` becomes a \`jest.fn()\`. Use \`mockResolvedValue\` when the response is constant regardless of input, and use \`mockImplementation\` when the mock must return different data based on the URL or arguments, simulate retries, or conditionally throw.

### What does jest.fn() actually do?

\`jest.fn()\` creates a mock function that records every call made to it, including arguments, return values, and call order, exposed through its \`.mock\` property. On its own it returns \`undefined\` when called. Its purpose is twofold: to track how it was called so you can assert with matchers like \`toHaveBeenCalledWith\`, and to be programmable via \`mockReturnValue\`, \`mockResolvedValue\`, or \`mockImplementation\`.

### When should I use mockReturnValue vs mockResolvedValue?

Use \`mockReturnValue\` for synchronous functions that return a plain value, and use \`mockResolvedValue\` for asynchronous functions, since it makes the mock return a Promise that resolves to your value, matching code that uses await. For async error paths, use \`mockRejectedValue\`. If the behavior is more complex than returning one fixed value, drop down to \`mockImplementation\` with a custom function instead.

### How do I mock axios in Jest?

Call \`jest.mock('axios')\` to replace the module, which turns methods like \`axios.get\` into mock functions. Then program the response with \`axios.get.mockResolvedValue({ data: ... })\` for a fixed result, or \`mockImplementation\` for conditional logic. Cast to \`jest.Mocked<typeof axios>\` in TypeScript for type safety, and call \`jest.clearAllMocks()\` in \`afterEach\` so call history does not leak between tests.

### Why does the order of jest.mock matter?

Jest hoists \`jest.mock()\` calls to the top of the file, executing them before your imports, so the module is already mocked by the time the code under test imports it. In practice this means you can write the call after your imports and it still applies. The catch is that variables referenced inside a mock factory must be prefixed with \`mock\` to satisfy Jest's hoisting safety check.

### What is the difference between pytest-mock and unittest.mock?

pytest-mock is a thin pytest plugin that wraps the standard library's unittest.mock and exposes it through a \`mocker\` fixture. The mocking engine is identical, but pytest-mock automatically undoes every patch when the test finishes, removing the need for \`with patch(...)\` context managers or manual cleanup. Use pytest-mock inside pytest projects for that automatic teardown; use unittest.mock directly when you are not running under pytest.

### How does Jest mocking compare to Python's unittest.mock?

The concepts map closely: \`jest.fn()\` corresponds to \`Mock()\`, \`mockReturnValue\` to the \`return_value\` attribute, and \`mockImplementation\` to assigning a callable to \`side_effect\`. Python's \`side_effect\` is more overloaded, since you can assign a list for sequential returns or an exception to raise. Module patching with \`jest.mock\` corresponds to \`@patch\` or \`mocker.patch\`, and \`jest.spyOn\` corresponds to patching with \`wraps\`.

### How do I reset mocks between tests in Jest?

Reset mocks in an \`afterEach\` hook. Use \`jest.clearAllMocks()\` to clear recorded call data while keeping implementations, \`jest.resetAllMocks()\` to also remove implementations, and \`jest.restoreAllMocks()\` to restore original implementations for anything created with \`jest.spyOn\`. You can also set \`clearMocks: true\` in your Jest config to clear call data automatically before every test, preventing order-dependent failures.

## Conclusion

The confusion around \`jest.fn()\` versus \`mockImplementation\` dissolves once you see they are not alternatives: \`jest.fn()\` creates a mock function that tracks calls, and \`mockImplementation\` (along with \`mockReturnValue\` and \`mockResolvedValue\`) programs what that mock does. For axios and other HTTP clients, mock the module with \`jest.mock()\`, then choose \`mockResolvedValue\` for fixed responses and \`mockImplementation\` for argument-dependent behavior; they are equivalent in the simple case because one is sugar for the other. Always clean up mocks between tests, and if you also write Python, remember that \`mockImplementation\` maps to \`side_effect\` and \`mockReturnValue\` maps to \`return_value\`.

Keep going with our [Jest vs Vitest comparison](/blog/jest-vs-vitest-2026), the [pytest best practices guide](/blog/pytest-best-practices-2026), and the [API mocking guide](/blog/api-mocking-service-virtualization-guide). To have an AI agent write correct, well-isolated mocks for you, browse the skills directory:

\`\`\`bash
npx @qaskills/cli search mocking
\`\`\`

Explore all 450+ testing skills at [qaskills.sh/skills](/skills).
`,
};
