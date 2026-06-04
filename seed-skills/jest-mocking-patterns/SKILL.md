---
name: Jest Mocking Patterns
description: Teaches the agent the right way to mock in Jest — jest.fn, mockImplementation, mockResolvedValue, jest.mock factories, spyOn with restore, and isolating modules like axios.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [jest, mocking, jest-fn, spyon, jest-mock, axios, mockresolvedvalue, unit-testing]
testingTypes: [unit, integration]
frameworks: [jest]
languages: [typescript, javascript]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Jest Mocking Patterns

This skill makes the agent mock dependencies in Jest deliberately and reversibly: stubbing functions with `jest.fn`, controlling return values with `mockReturnValue`/`mockResolvedValue`, replacing whole modules with `jest.mock` factories, and spying on real implementations with `jest.spyOn` (always restored). The guiding rule: **mock the boundary, not the unit under test**, and always reset state between tests so mocks never leak.

Use this skill when the agent needs to isolate code from the network, the clock, the filesystem, a database client, or any third-party module (axios, fs, a payment SDK).

## Core Principles

1. **Mock at the boundary.** Mock network/DB/3rd-party clients, not the function you are testing. If you mock the thing under test, the test proves nothing.
2. **Reset mocks between tests.** Configure `clearMocks: true` (or call `jest.clearAllMocks()` in `beforeEach`) so call counts and implementations never bleed across tests.
3. **`jest.mock` is hoisted.** Calls to `jest.mock('module', factory)` are lifted above imports. The factory cannot reference outer variables unless they are prefixed `mock`.
4. **Prefer `spyOn` + `mockRestore` over `jest.mock`** when you only need to override one method and want the real implementation back afterward.
5. **Type your mocks.** Use `jest.mocked()` (or `as jest.Mock`) so the mock API is type-checked and autocompletes.
6. **Assert behavior, then interactions.** Check the result first; use `toHaveBeenCalledWith` to verify the boundary was called correctly.

## Workflow / Patterns

### Pattern 1 — `jest.fn` and controlling return values

`jest.fn()` is a recording stub. Drive it with `mockReturnValue`, `mockResolvedValue`, `mockRejectedValue`, or queue per-call values with `mockReturnValueOnce`.

```typescript
test('jest.fn return value control', () => {
  const calc = jest.fn();

  calc.mockReturnValue(10); // default for every call
  calc.mockReturnValueOnce(1).mockReturnValueOnce(2); // queued, then falls back

  expect(calc()).toBe(1);
  expect(calc()).toBe(2);
  expect(calc()).toBe(10);
  expect(calc).toHaveBeenCalledTimes(3);
});

test('async return values', async () => {
  const fetchUser = jest.fn<Promise<{ id: number }>, [number]>();
  fetchUser.mockResolvedValue({ id: 1 });

  await expect(fetchUser(1)).resolves.toEqual({ id: 1 });

  fetchUser.mockRejectedValueOnce(new Error('not found'));
  await expect(fetchUser(99)).rejects.toThrow('not found');
});
```

### Pattern 2 — `mockImplementation` for logic-bearing stubs

When the return depends on the input, supply a function. Use `mockImplementationOnce` for sequenced behavior.

```typescript
test('mockImplementation reacts to args', () => {
  const discount = jest.fn((price: number, isMember: boolean) =>
    isMember ? price * 0.9 : price,
  );

  expect(discount(100, true)).toBe(90);
  expect(discount(100, false)).toBe(100);
  expect(discount).toHaveBeenLastCalledWith(100, false);
});

test('retry then succeed via mockImplementationOnce', async () => {
  const send = jest
    .fn<Promise<string>, []>()
    .mockImplementationOnce(() => Promise.reject(new Error('503')))
    .mockImplementationOnce(() => Promise.resolve('ok'));

  await expect(send()).rejects.toThrow('503');
  await expect(send()).resolves.toBe('ok');
});
```

### Pattern 3 — `jest.mock` with a factory (the hoisting rule)

`jest.mock` replaces an entire module. Because it is hoisted above imports, any variable the factory references must be named with a `mock` prefix.

```typescript
// notifier.ts
import { sendSms } from './sms-client';
export async function notify(phone: string, msg: string) {
  await sendSms(phone, msg);
  return `sent to ${phone}`;
}

// notifier.test.ts
import { notify } from './notifier';
import { sendSms } from './sms-client';

// Hoisted: the factory may only use `mock`-prefixed outer vars.
const mockSend = jest.fn();
jest.mock('./sms-client', () => ({
  sendSms: (...args: unknown[]) => mockSend(...args),
}));

beforeEach(() => jest.clearAllMocks());

test('notify calls the SMS client correctly', async () => {
  mockSend.mockResolvedValue(undefined);

  const result = await notify('+15551234567', 'Hello');

  expect(result).toBe('sent to +15551234567');
  expect(sendSms).toHaveBeenCalledWith('+15551234567', 'Hello');
  expect(sendSms).toHaveBeenCalledTimes(1);
});
```

### Pattern 4 — `jest.spyOn` with restore (override one method, keep the rest)

`spyOn` wraps a real method so you can assert on it and optionally stub it. Always restore — `restoreMocks: true` in config, or `mockRestore()`.

```typescript
import * as mathUtils from './math-utils';

afterEach(() => jest.restoreAllMocks());

test('spy that still calls through', () => {
  const spy = jest.spyOn(mathUtils, 'add'); // real impl runs

  const sum = mathUtils.add(2, 3);

  expect(sum).toBe(5);
  expect(spy).toHaveBeenCalledWith(2, 3);
});

test('spy that replaces the implementation', () => {
  jest.spyOn(mathUtils, 'add').mockReturnValue(42);
  expect(mathUtils.add(2, 3)).toBe(42); // stubbed
  // restoreAllMocks() puts the real add back after this test.
});

test('spy on Date.now for deterministic time', () => {
  jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
  expect(Date.now()).toBe(1_700_000_000_000);
});
```

### Pattern 5 — Mocking axios (auto-mock + typed handle)

A real-world boundary. `jest.mock('axios')` auto-mocks the module; `jest.mocked` gives a typed handle.

```typescript
// user-service.ts
import axios from 'axios';
export async function getUser(id: number) {
  const { data } = await axios.get(`/api/users/${id}`);
  return data;
}

// user-service.test.ts
import axios from 'axios';
import { getUser } from './user-service';

jest.mock('axios');
const mockedAxios = jest.mocked(axios);

beforeEach(() => jest.clearAllMocks());

test('resolves the user from the API', async () => {
  mockedAxios.get.mockResolvedValue({ data: { id: 1, name: 'Ada' } });

  const user = await getUser(1);

  expect(user).toEqual({ id: 1, name: 'Ada' });
  expect(mockedAxios.get).toHaveBeenCalledWith('/api/users/1');
});

test('propagates a network error', async () => {
  mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));
  await expect(getUser(1)).rejects.toThrow('Network Error');
});
```

### Pattern 6 — Partial module mock with `requireActual`

Keep most of a module real, override one export. Essential when a util module mixes pure helpers with a side-effecting one.

```typescript
jest.mock('./config', () => ({
  ...jest.requireActual('./config'),
  isProduction: jest.fn().mockReturnValue(false), // override only this
}));
```

### Pattern 7 — Fake timers for debounce/throttle/setTimeout code

```typescript
test('debounced save fires once after the delay', () => {
  jest.useFakeTimers();
  const save = jest.fn();
  const debounced = makeDebounced(save, 300);

  debounced();
  debounced();
  jest.advanceTimersByTime(300);

  expect(save).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});
```

## Best Practices

1. **Set `clearMocks: true` and `restoreMocks: true`** in `jest.config` so state never leaks between tests and spies always restore.
2. **Prefix factory-referenced variables with `mock`** to satisfy Jest's hoisting rule; otherwise the factory throws a reference error.
3. **Use `jest.mocked(x)`** for typed access to mocked modules instead of unsafe `as any` casts.
4. **Reach for `spyOn` first** when overriding a single method — it is reversible and keeps the rest real.
5. **Assert the result before the interaction.** Confirm the output, then `toHaveBeenCalledWith` to verify how the boundary was invoked.
6. **Use `mockResolvedValueOnce`/`mockRejectedValueOnce`** to script retry and error paths precisely.
7. **Use fake timers** for time-dependent code instead of real `setTimeout` waits.

## Anti-Patterns

1. **Mocking the function under test.** The test then verifies the mock, not the code. Mock the dependency it calls.
2. **No `clearAllMocks`/`clearMocks`.** Call counts and implementations bleed across tests, producing order-dependent flakiness.
3. **Referencing a non-`mock` outer variable in a `jest.mock` factory.** Hoisting moves the factory above the declaration -> ReferenceError.
4. **`spyOn` without restore.** The stub leaks into later tests in the same file.
5. **Over-mocking** — stubbing every collaborator until the test no longer exercises real logic. Mock only the I/O boundary.
6. **Asserting only `toHaveBeenCalled()`** without checking arguments or the actual result — weak tests that pass on wrong calls.
7. **`as any` on mocked modules**, discarding the type safety `jest.mocked` provides.

## When to Trigger This Skill

- "Mock axios / fetch / an HTTP client in my Jest test"
- "How do I use `jest.mock` with a factory?"
- "`mockResolvedValue` / `mockReturnValueOnce` — how do these work?"
- "Spy on a method but keep the real implementation"
- "My Jest mock leaks into the next test"
- "ReferenceError: cannot access X before initialization in `jest.mock`"
- "Mock only one export from a module" / "partial mock"
- "Test debounced / setTimeout code with fake timers"
