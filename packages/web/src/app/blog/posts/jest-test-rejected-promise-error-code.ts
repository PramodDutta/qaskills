import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test a Rejected Promise Error Code in Jest',
  description:
    'Test rejected Promise error codes in Jest with rejects matchers, typed custom errors, exact assertions, and safeguards against false-positive async tests.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Test a Rejected Promise Error Code in Jest

An API client rejects with \`{ code: 'PAYMENT_DECLINED', retryable: false }\`, but the test only checks \`toThrow('declined')\`. The message changes during a copy edit and the test breaks, while a regression that emits the wrong machine-readable code could pass. If callers branch on an error code, that code is part of the observable behavior and deserves a direct assertion.

Jest can inspect rejected values through \`expect(promise).rejects\`. The exact matcher depends on the error shape: \`toMatchObject\` for structured properties, \`toHaveProperty\` for one path, or \`toEqual\` when every enumerable field is intentionally contractual. The challenge is less about syntax than choosing a test boundary that catches the real defect without coupling to incidental Error internals.

## Make the rejection contract visible

JavaScript permits a Promise to reject with any value. Code can reject with an \`Error\`, a subclass, a plain object, a string, or even \`undefined\`. Production code should normally throw \`Error\` instances because they preserve a stack and integrate with logging, but tests must reflect the behavior actually promised by the API.

Consider a domain error:

\`\`\`typescript
export class PaymentError extends Error {
  constructor(
    public readonly code: 'PAYMENT_DECLINED' | 'GATEWAY_TIMEOUT',
    message: string,
    public readonly retryable: boolean,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'PaymentError';
  }
}

export async function capturePayment(amount: number): Promise<string> {
  if (amount > 5000) {
    throw new PaymentError(
      'PAYMENT_DECLINED',
      'The issuing bank declined this charge',
      false,
    );
  }

  return 'payment_123';
}
\`\`\`

The public rejection contract might be: instance is \`PaymentError\`, code is \`PAYMENT_DECLINED\`, and \`retryable\` is false. The stack, message punctuation, and property descriptor are not necessarily promises.

| Error aspect | Assert when | Matcher candidate |
|---|---|---|
| Class | Callers use \`instanceof\` or catch by type | \`rejects.toBeInstanceOf(PaymentError)\` |
| Code | Control flow branches on a stable identifier | \`rejects.toMatchObject({ code: ... })\` |
| Retry flag | Retry middleware consumes it | \`rejects.toHaveProperty('retryable', false)\` |
| Message | Text is user-facing or a documented contract | \`rejects.toThrow(/declined/)\` |
| Cause | Wrapping must preserve the underlying failure | Catch once, then inspect \`error.cause\` |
| Entire object | Every enumerable field is deliberately fixed | \`rejects.toEqual(...)\` |

Write that contract down before choosing assertions. Otherwise developers tend to snapshot an error object and accidentally freeze irrelevant implementation detail.

## Use rejects with a structured matcher

The clearest single assertion for a code is:

\`\`\`typescript
import { capturePayment, PaymentError } from './payments';

describe('capturePayment', () => {
  it('rejects a high-value charge with the decline code', async () => {
    await expect(capturePayment(5001)).rejects.toMatchObject({
      name: 'PaymentError',
      code: 'PAYMENT_DECLINED',
      retryable: false,
    });
  });

  it('uses the domain error type', async () => {
    await expect(capturePayment(5001)).rejects.toBeInstanceOf(PaymentError);
  });
});
\`\`\`

Always return or await the expectation. \`rejects\` unwraps the rejection asynchronously. If the test function finishes without waiting for that chain, Jest can report misleading results or surface activity after teardown. For investigation of that wider symptom, see [fixing Jest cannot log after tests are done](/blog/jest-cannot-log-after-tests-are-done-fix).

Two expectations call \`capturePayment\` twice in the example, which is safe only because this simplified function has no side effects. A payment gateway call should be invoked once. Catch the single rejection for multiple related assertions, or use one \`toMatchObject\` assertion that includes the class-relevant \`name\`. Note that matching \`name\` does not prove \`instanceof\`; decide which guarantee matters.

## Avoid the try/catch false positive

This test looks reasonable but passes if \`capturePayment\` unexpectedly resolves:

\`\`\`typescript
it('reports a decline', async () => {
  try {
    await capturePayment(5001);
  } catch (error) {
    expect(error).toMatchObject({ code: 'PAYMENT_DECLINED' });
  }
});
\`\`\`

When no exception reaches the catch block, no assertion executes. Prefer \`rejects\`, or add \`expect.assertions(number)\` before a catch pattern. The latter is useful when several fields, symbols, or non-enumerable properties need inspection.

\`\`\`typescript
it('preserves decline metadata on one error instance', async () => {
  expect.assertions(4);

  try {
    await capturePayment(5001);
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(PaymentError);

    const paymentError = error as PaymentError;
    expect(paymentError.code).toBe('PAYMENT_DECLINED');
    expect(paymentError.retryable).toBe(false);
    expect(paymentError.message).toContain('issuing bank');
  }
});
\`\`\`

\`expect.assertions(4)\` verifies that four assertions ran before completion. \`expect.hasAssertions()\` is looser and works when branches execute different assertion counts. Do not use either as decoration around a \`rejects\` test that already awaits the matcher unless it adds a meaningful invariant.

| Pattern | Resolution behavior | Best use |
|---|---|---|
| \`await expect(p).rejects.toMatchObject(...)\` | Fails automatically if resolved | Normal structured rejection check |
| \`return expect(p).rejects.toHaveProperty(...)\` | Jest waits for returned chain | Non-async test body |
| \`try/catch\` plus \`expect.assertions\` | Assertion count catches missing rejection | Several checks on one instance |
| Manual \`.catch()\` callback | Easy to forget return/await | Rarely justified in new tests |

## Choose toMatchObject over toEqual for Error fields

\`Error\` has unusual equality behavior. Standard properties such as \`message\`, \`name\`, and \`stack\` are not all enumerable in the same way as fields on a plain object. Jest's equality semantics for Error objects emphasize messages, which can surprise a test author expecting a deep comparison of custom properties. A partial object matcher states the intended fields explicitly and tolerates unrelated metadata.

\`toMatchObject\` is a strong default for coded errors:

\`\`\`typescript
await expect(loadInvoice('missing')).rejects.toMatchObject({
  code: 'INVOICE_NOT_FOUND',
  details: {
    invoiceId: 'missing',
  },
});
\`\`\`

\`toHaveProperty\` is useful for a single nested code:

\`\`\`typescript
await expect(sendRequest()).rejects.toHaveProperty(
  'response.data.error.code',
  'RATE_LIMITED',
);
\`\`\`

That second form is appropriate only if the rejected value contract genuinely includes \`response.data.error.code\`. Client-library response wrappers are often unstable across upgrades. A domain adapter should translate transport errors into application-owned errors, allowing higher-level tests to assert \`RateLimitError.code\` instead of Axios or Fetch implementation structure.

Use asymmetric matchers for dynamic but relevant values:

\`\`\`typescript
await expect(createUser({ email: 'taken@example.test' })).rejects.toMatchObject({
  code: 'EMAIL_ALREADY_EXISTS',
  requestId: expect.any(String),
  details: expect.objectContaining({ field: 'email' }),
});
\`\`\`

Do not assert \`expect.anything()\` for the code. It accepts any non-null value and therefore fails to protect the branch your consumer depends on.

## Test wrappers without losing the original code

Service layers often catch a lower-level rejection and throw a domain error. The test should determine whether translation is correct and whether diagnostics remain discoverable through \`cause\`.

\`\`\`typescript
export class InventoryError extends Error {
  constructor(
    public readonly code: 'STOCK_LOOKUP_FAILED',
    options: ErrorOptions,
  ) {
    super('Unable to check inventory', options);
    this.name = 'InventoryError';
  }
}

type InventoryClient = {
  available(sku: string): Promise<number>;
};

export async function reserve(
  client: InventoryClient,
  sku: string,
): Promise<void> {
  try {
    await client.available(sku);
  } catch (cause) {
    throw new InventoryError('STOCK_LOOKUP_FAILED', { cause });
  }
}
\`\`\`

The corresponding test controls the dependency and inspects one thrown instance:

\`\`\`typescript
it('translates an inventory transport failure', async () => {
  const transportError = Object.assign(new Error('connection reset'), {
    code: 'ECONNRESET',
  });
  const client = {
    available: jest.fn().mockRejectedValue(transportError),
  };

  expect.assertions(4);
  try {
    await reserve(client, 'SKU-7');
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(InventoryError);
    const inventoryError = error as InventoryError;
    expect(inventoryError.code).toBe('STOCK_LOOKUP_FAILED');
    expect(inventoryError.cause).toBe(transportError);
    expect(client.available).toHaveBeenCalledWith('SKU-7');
  }
});
\`\`\`

The test does not demand that the domain code equal \`ECONNRESET\`. Translation is the behavior. It separately proves the original error remains the exact cause. This distinction lets the transport implementation change while business callers retain a stable code.

## Distinguish thrown errors from rejected plain objects

A mock written with \`mockRejectedValue({ code: 'DENIED' })\` does not exercise Error behavior. That can be correct if an external dependency truly rejects plain objects, but it should not become an accidental substitute for a real error class.

| Rejection value | Stack trace | \`toThrow\` useful? | Recommended test focus |
|---|---|---|---|
| \`new DomainError(...)\` | Yes | Yes, for type/message | Class plus custom code |
| \`{ code: 'DENIED' }\` | No | No | Partial object shape |
| \`'DENIED'\` | No | No | Prefer fixing producer; otherwise \`rejects.toBe\` |
| Native \`TypeError\` | Yes | Yes | Error type and stable message fragment |
| Library response object | Maybe nested | Usually no | Translate at boundary, then test domain error |

If the production function uses \`throw new AuthorizationError(...)\`, configure the mock with a real instance. This catches code that relies on \`instanceof\`, \`name\`, or \`cause\`. A plain object with the same \`code\` can make such consumers look correct when they are not.

## Verify code branches with parameterized cases

Error-code logic often grows into a mapping: HTTP 409 becomes \`EMAIL_ALREADY_EXISTS\`, 429 becomes \`RATE_LIMITED\`, and a timeout becomes \`UPSTREAM_TIMEOUT\`. Table-driven tests make the mapping visible without weakening each case.

\`\`\`typescript
it.each([
  [409, 'EMAIL_ALREADY_EXISTS', false],
  [429, 'RATE_LIMITED', true],
  [504, 'UPSTREAM_TIMEOUT', true],
] as const)(
  'maps HTTP %i to %s',
  async (status, expectedCode, retryable) => {
    const transport = jest.fn().mockRejectedValue({
      response: { status },
    });

    await expect(registerUser(transport)).rejects.toMatchObject({
      code: expectedCode,
      retryable,
    });
  },
);
\`\`\`

Every row has a different input and explicit expected output. Avoid computing \`expectedCode\` with the same mapping function used by production, which would reproduce the implementation rather than test it. Add an unknown-status case to define the fallback code and ensure raw provider messages are not leaked.

Parameterized coverage should not force unrelated error shapes into one table. Validation errors may include field issues, while transport errors include retry advice. Separate tests can express those contracts more accurately.

## Make TypeScript narrowing honest

Catch variables are \`unknown\` under strict TypeScript because JavaScript can throw anything. An unconditional cast makes the test compile but does not prove the runtime type. Assert \`toBeInstanceOf\` before casting, or use a type guard that checks the fields consumed by the test.

\`\`\`typescript
function hasErrorCode(value: unknown): value is { code: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof value.code === 'string'
  );
}

it('returns a stable code to callers', async () => {
  expect.assertions(2);
  try {
    await performOperation();
  } catch (error: unknown) {
    expect(hasErrorCode(error)).toBe(true);
    if (!hasErrorCode(error)) return;
    expect(error.code).toBe('OPERATION_BLOCKED');
  }
});
\`\`\`

The early return is safe because \`expect.assertions(2)\` fails if the second assertion does not run. A custom Jest matcher can package this repeated runtime check and produce a better failure message. The [Jest custom matchers guide](/blog/jest-custom-matchers-guide) is useful when coded errors recur across many packages.

## Control timeouts and timers around rejection

Some promises reject only after a timer, abort signal, or retry budget. Use fake timers deliberately and advance them through Jest's timer APIs, while still awaiting the rejection expectation. Do not solve a missing await by increasing the test timeout.

\`\`\`typescript
it('rejects with a timeout code after the deadline', async () => {
  jest.useFakeTimers();
  try {
    const operation = fetchWithDeadline('/slow', 1000);
    const assertion = expect(operation).rejects.toMatchObject({
      code: 'REQUEST_TIMEOUT',
    });

    await jest.advanceTimersByTimeAsync(1000);
    await assertion;
  } finally {
    jest.useRealTimers();
  }
});
\`\`\`

Create the promise before advancing time, store the assertion so its rejection handler is attached, and restore real timers in \`finally\`. Otherwise an early assertion failure can contaminate later tests. For retry code, also assert the dependency call count so an immediate rejection cannot impersonate an exhausted retry policy.

## Review the assertion at the consumer boundary

The best code assertion sits where the code becomes meaningful. A low-level parser test may assert that \`parseGatewayError\` returns \`PAYMENT_DECLINED\`. A service test may assert that its Promise rejects with a \`PaymentError\`. A UI test usually should assert the recovery screen, not reach through layers to inspect a JavaScript error code invisible to the user.

Over-assertion creates maintenance cost. Under-assertion permits dangerous substitutions. During review, ask three questions:

1. Does production behavior actually reject, and will this test fail if it resolves?
2. Is the asserted code owned by this component or leaked from a dependency?
3. Would a different code change caller behavior while this test still passed?

If the answers are yes, owned, and no, the test is probably at the right level.

## Assert rejection timing only when timing is contractual

A Promise that rejects synchronously through an \`async\` function and one that rejects after an awaited dependency both reach \`rejects\`. Usually callers should not care about that internal timing. Add timer assertions only when cancellation, timeout, or retry behavior is part of the API.

Abort handling is a legitimate timing contract. If a function accepts an \`AbortSignal\`, create a controller, start the operation, abort it, and assert the owned cancellation code. Avoid asserting a platform-specific DOMException message if your adapter promises a domain error.

\`\`\`typescript
it('maps cancellation to the client-owned error code', async () => {
  const controller = new AbortController();
  const request = client.loadReport('report-9', { signal: controller.signal });
  controller.abort();

  await expect(request).rejects.toMatchObject({
    name: 'ReportClientError',
    code: 'REQUEST_CANCELLED',
    retryable: false,
  });
});
\`\`\`

Attach the rejection expectation promptly when a Promise could fail before later setup completes. Node can report an unhandled rejection if the operation rejects before the matcher is attached. Creating the matcher chain immediately, then advancing timers or triggering cancellation, keeps the test honest.

## Keep mock rejection shapes aligned with reality

Mocks make tests fast, but an invented rejection shape can validate a branch production never receives. Capture the dependency's documented error interface in a narrow adapter and test that adapter against representative responses. Higher layers then mock the adapter's domain error, not a sprawling vendor object.

When using \`mockRejectedValueOnce\` for retries, assert both the final code and attempt count. A sequence such as timeout, timeout, success tests recovery. A sequence ending in rejection should assert the exhaustion code owned by the retry layer, plus the original cause if preserving it is contractual.

Do not alternate rejected values without resetting or creating the mock per test. Residual one-time implementations make outcomes order dependent. Jest can clear call history, but clearing calls is not the same as restoring an implementation. Prefer local mocks and explicit setup.

## Include serialization where errors cross processes

An Error sent through JSON, a worker boundary, or a queue often loses non-enumerable \`name\`, \`message\`, and \`stack\` unless code maps it to a transport object. If callers receive serialized errors, test the serializer separately from the throwing function.

A safe error response might expose \`code\`, a public message, and a request ID while withholding stack and internal cause. Assert the exact allowed keys for that boundary. This prevents a unit test from passing on a rich in-process object while the HTTP client receives \`{}\` or an unstable database message.

For security, ensure unknown internal errors map to a generic public code. A table-driven test should include a domain error and an unexpected native Error, verifying that only the former's approved code leaves the service boundary.

## Frequently Asked Questions

### Should I await or return a Jest rejects expectation?

Either is valid. In an \`async\` test, \`await expect(promise).rejects...\` is usually clearest. In a non-async body, return the matcher chain. Never omit both, because Jest may finish the test before the rejection is checked.

### Why does toEqual(new MyError(...)) ignore my custom code?

Error equality has special semantics, and standard Error properties are not ordinary enumerable object fields. Assert the type separately and use \`toMatchObject({ code: ... })\` or catch the instance for focused field checks.

### Can rejects.toThrow verify an error code?

\`toThrow\` is designed for error type and message expectations, not arbitrary custom fields. Use it when those are contractual, then use \`toMatchObject\` or \`toHaveProperty\` for \`code\`.

### How do I test several properties without invoking the async function twice?

Use one \`toMatchObject\` containing all relevant enumerable fields, or catch one rejection with \`expect.assertions()\` and inspect that instance. The second approach is appropriate for \`cause\`, symbols, or type narrowing.

### Is it acceptable for a Promise to reject with a plain object containing code?

JavaScript allows it, and Jest can match it, but application-owned failures are usually better as Error subclasses. They retain stacks and work with standard error tooling. If a dependency rejects an object, translate it at the adapter boundary and expose a stable domain error to the rest of the system.
`,
};
