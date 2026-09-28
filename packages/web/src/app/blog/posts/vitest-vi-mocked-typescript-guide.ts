import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'vi.mocked in Vitest: Type-Safe Mocks in TypeScript',
  description: 'vi.mocked guide for Vitest TypeScript tests: type module mocks, deep mocks, partial returns, and fix mockReturnValue errors without unsafe casts.',
  date: '2026-09-28',
  category: 'Reference',
  content: `
# vi.mocked in Vitest: Type-Safe Mocks in TypeScript

\`vi.mocked\` is Vitest's TypeScript helper for telling the compiler that an imported function, module object, or nested property is already mocked. It does not mock anything by itself. It returns the same object at runtime, with mock-aware types layered on top. Use it after \`vi.mock\`, \`vi.spyOn\`, \`vi.importMock\`, or another setup step has actually created the mock.

Version context: Vitest 5.0.0 shipped on September 3, 2026, and \`5.0.2\` is the current release. The \`vi.mocked\` overloads described here match the current docs at \`vitest.dev\`. If your project is still on Vitest 4, its docs remain available at \`v4.vitest.dev\`, and the helper behaves the same way for everything shown in this guide.

For QA engineers using AI coding agents, \`vi.mocked\` is a guardrail against a common failure mode: the agent correctly mocks a module, then TypeScript rejects \`mockResolvedValue\`, \`mockReturnValue\`, or nested mock access because the import still has its original production type. The broader [Vitest mocking vi.mock complete guide](/blog/vitest-mocking-vi-mock-complete-guide) explains module mocking strategy. The [Vitest mock hoisting reference error fix](/blog/vitest-mock-hoisting-reference-error-fix) is the companion when the problem is execution order rather than typing.

## The Small But Important Contract

The official API says \`vi.mocked(object)\` is a type helper. That sentence should drive every design decision. If a value is not a mock at runtime, \`vi.mocked\` will not make it one. If you call \`vi.mocked(realFunction).mockReturnValue(...)\` without mocking or spying first, TypeScript may be satisfied while runtime still fails because the real function has no mock methods.

The current overloads support a boolean \`deep\` argument or an options object with \`partial\` and \`deep\`. \`partial: true\` loosens return values to \`Partial<T>\`. \`deep: true\` tells TypeScript that nested functions or nested return shapes are mocked too. \`partial: true, deep: true\` combines both for recursive partial typing.

| Form | Type meaning | Typical use |
| --- | --- | --- |
| \`vi.mocked(fn)\` | Treat one function as a mocked function | Imported function mocked by \`vi.mock\` |
| \`vi.mocked(module)\` | Treat first-level function exports as mocked | Namespace import from a mocked module |
| \`vi.mocked(module, { deep: true })\` | Treat nested properties as mocked | SDK objects with nested clients |
| \`vi.mocked(fn, { partial: true })\` | Allow partial resolved or returned values | Fetch wrappers returning large shapes |
| \`vi.mocked(obj, { partial: true, deep: true })\` | Allow nested partial mocked shapes | Complex service clients in unit tests |

\`\`\`typescript
import { describe, expect, it, vi } from 'vitest';
import { getAccount } from './account-service';

vi.mock('./account-service', () => ({
  getAccount: vi.fn(),
}));

describe('account summary', () => {
  it('uses a typed mocked function', async () => {
    vi.mocked(getAccount).mockResolvedValue({
      id: 'acct_123',
      status: 'active',
    });

    await expect(getAccount('acct_123')).resolves.toEqual({
      id: 'acct_123',
      status: 'active',
    });
    expect(getAccount).toHaveBeenCalledWith('acct_123');
  });
});
\`\`\`

That example is intentionally plain. The mock happens in \`vi.mock\`. The type refinement happens in \`vi.mocked\`. The assertion checks both the returned value and the side effect of calling the dependency with the intended ID.

## The Production Module Shape Matters

Type-safe mocks are only useful when the real module is typed well. If production exports use \`any\`, the mock cannot recover meaningful guarantees. A clean pattern is to type the service function at its source, import it normally in production code, and mock it in tests with the same import path.

\`\`\`typescript
export type Account = {
  id: string;
  status: 'active' | 'suspended';
};

export async function getAccount(id: string): Promise<Account> {
  const response = await fetch('/api/accounts/' + encodeURIComponent(id));

  if (!response.ok) {
    throw new Error('Account request failed');
  }

  return response.json() as Promise<Account>;
}
\`\`\`

\`\`\`typescript
import { getAccount } from './account-service';

export async function formatAccountBadge(id: string): Promise<string> {
  const account = await getAccount(id);
  return account.status === 'active' ? 'Account active' : 'Account suspended';
}
\`\`\`

Now the test can mock exactly the dependency contract and assert the user-facing behavior. The mock return must include a valid \`status\`, and TypeScript will reject accidental values such as \`'enabled'\`.

\`\`\`typescript
import { describe, expect, it, vi } from 'vitest';
import { getAccount } from './account-service';
import { formatAccountBadge } from './format-account-badge';

vi.mock('./account-service', () => ({
  getAccount: vi.fn(),
}));

describe('formatAccountBadge', () => {
  it('formats active accounts', async () => {
    vi.mocked(getAccount).mockResolvedValue({
      id: 'acct_123',
      status: 'active',
    });

    await expect(formatAccountBadge('acct_123')).resolves.toBe('Account active');
    expect(getAccount).toHaveBeenCalledTimes(1);
    expect(getAccount).toHaveBeenCalledWith('acct_123');
  });
});
\`\`\`

What people get wrong is reaching for \`as unknown as Mock\` or \`as any\` when TypeScript complains. That silences the compiler precisely where you want it to protect you: return shapes, parameter lists, and async behavior. \`vi.mocked\` keeps the connection to the original function signature.

## vi.mocked Versus vi.fn, vi.mock, vi.spyOn, And Types

\`vi.fn\` creates a mock function. \`vi.mock\` replaces a module before imports run. \`vi.spyOn\` wraps an existing object method. \`vi.mocked\` changes TypeScript's view of a value that has already been mocked. The related exported types such as \`MockedFunction\` and \`Mocked\` are useful for variables and helper functions, but \`vi.mocked\` is usually cleaner at the call site.

| Tool | Runtime effect | Type effect | Use when |
| --- | --- | --- | --- |
| \`vi.fn()\` | Creates a standalone mock function | Returns a typed mock | You inject a callback or fake dependency |
| \`vi.mock()\` | Mocks an imported module | Module import may still look original | You replace module exports for a test file |
| \`vi.spyOn()\` | Wraps an object method | Returns a spy mock | You observe or override one method |
| \`vi.mocked()\` | No runtime change | Narrows to mocked types | TypeScript cannot see the mock methods |
| \`MockedFunction<T>\` | No runtime change | Names a mocked function type | You store mocks in variables or helpers |

\`\`\`typescript
import { describe, expect, it, vi } from 'vitest';
import type { MockedFunction } from 'vitest';

type LookupUser = (id: string) => Promise<{ id: string; email: string }>;

const lookupUser: MockedFunction<LookupUser> = vi.fn<LookupUser>();

describe('typed standalone mock', () => {
  it('keeps parameter and return types', async () => {
    lookupUser.mockResolvedValue({
      id: 'user_1',
      email: 'qa@example.test',
    });

    await expect(lookupUser('user_1')).resolves.toEqual({
      id: 'user_1',
      email: 'qa@example.test',
    });
    expect(lookupUser).toHaveBeenCalledWith('user_1');
  });
});
\`\`\`

Use the type aliases when creating a mock variable yourself. Use \`vi.mocked\` when the value came from an import or object you do not want to restate. Both approaches are valid, but mixing them randomly tends to confuse AI-generated tests.

## Deep Mocks For SDK-Style Objects

Many frontend and API clients expose nested objects, such as \`client.users.get\` or \`client.billing.invoices.create\`. If \`vi.mock\` replaces those nested functions, plain \`vi.mocked(client)\` only tells TypeScript about the first level by default. Use \`{ deep: true }\` when the nested object really is mocked at runtime.

\`\`\`typescript
export const billingClient = {
  invoices: {
    async create(input: { accountId: string; amountCents: number }) {
      return {
        id: 'inv_live',
        accountId: input.accountId,
        amountCents: input.amountCents,
        status: 'open' as const,
      };
    },
  },
};
\`\`\`

\`\`\`typescript
import { describe, expect, it, vi } from 'vitest';
import { billingClient } from './billing-client';

vi.mock('./billing-client', () => ({
  billingClient: {
    invoices: {
      create: vi.fn(),
    },
  },
}));

describe('billing client mock', () => {
  it('types nested invoice creation', async () => {
    vi.mocked(billingClient, { deep: true }).invoices.create.mockResolvedValue({
      id: 'inv_test',
      accountId: 'acct_123',
      amountCents: 5000,
      status: 'open',
    });

    await expect(
      billingClient.invoices.create({ accountId: 'acct_123', amountCents: 5000 }),
    ).resolves.toMatchObject({
      id: 'inv_test',
      status: 'open',
    });
  });
});
\`\`\`

Deep typing should match deep runtime mocking. If you only spy on \`billingClient.invoices.create\`, do not pretend every nested property is mocked. Overusing \`deep: true\` makes tests look safer than they are.

## Partial Returns Without Lying About The Function

\`partial: true\` is useful when the production return type is large but a test only needs a few fields. The official docs show partial behavior for async and nested values. The key is to reserve it for functions where the code under test genuinely reads a subset. If production later reads a new field, a partial mock can hide the missing data unless your assertion exercises that branch.

| Return style | Use \`partial\`? | Why |
| --- | --- | --- |
| Small domain object with three fields | Usually no | Full values are clearer and safer |
| Fetch \`Response\` object | Often yes | Tests may only care about \`ok\` or \`status\` |
| SDK object with many optional fields | Sometimes | Keep test focused on fields consumed by code |
| Public contract you own | Prefer no | Full mock detects accidental contract drift |
| Deep nested SDK shape | \`partial\` plus \`deep\` only when needed | Avoid fabricating huge nested fixtures |

\`\`\`typescript
import { describe, expect, it, vi } from 'vitest';
import { fetchProfile } from './profile-api';

vi.mock('./profile-api', () => ({
  fetchProfile: vi.fn(),
}));

describe('profile loader', () => {
  it('allows a partial response when only ok is consumed', async () => {
    vi.mocked(fetchProfile, { partial: true }).mockResolvedValue({
      ok: false,
      status: 503,
    });

    const response = await fetchProfile('user_1');

    expect(response.ok).toBe(false);
    expect(response.status).toBe(503);
  });
});
\`\`\`

That sample is appropriate only if the tested branch reads \`ok\` and \`status\`. If the code later reads \`headers\`, \`json()\`, or \`url\`, the test should grow a more complete fake or use a real \`Response\`.

## Hoisting Still Controls When The Mock Exists

\`vi.mocked\` solves TypeScript errors. It does not solve hoisting errors. Vitest hoists \`vi.mock\`, \`vi.unmock\`, and \`vi.hoisted\` to the top of the file. The current migration docs say Vitest 5 throws when hoisted mock calls are placed inside functions, blocks, or test callbacks. Use top-level \`vi.mock\` for static module replacement. Use \`vi.doMock\` with dynamic imports when you intentionally need a per-test mock.

\`\`\`typescript
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readFeatureFlag: vi.fn<(name: string) => boolean>(),
}));

vi.mock('./feature-flags', () => ({
  readFeatureFlag: mocks.readFeatureFlag,
}));

describe('hoisted module mock', () => {
  it('uses a hoisted mock safely', async () => {
    mocks.readFeatureFlag.mockImplementation((name) => name === 'checkout-v2');

    const { isCheckoutV2Enabled } = await import('./checkout-mode');

    expect(isCheckoutV2Enabled()).toBe(true);
    expect(mocks.readFeatureFlag).toHaveBeenCalledWith('checkout-v2');
  });
});
\`\`\`

The diagnostic clue is different. If TypeScript says \`Property mockResolvedValue does not exist\`, \`vi.mocked\` is probably relevant. If Vitest says a mock factory referenced a top-level variable, or that a hoisted call was defined outside top-level scope, the fix is \`vi.hoisted\`, moving the mock, or changing to \`vi.doMock\` plus dynamic import.

## Failure Mode: The Test Compiles But The Mock Is Real

A realistic failure starts with an agent adding this line to a test: \`vi.mocked(sendEmail).mockResolvedValue({ id: 'email_1' })\`. TypeScript passes. At runtime, Vitest throws \`mockResolvedValue is not a function\`. The missing step is that \`sendEmail\` was never mocked. The helper changed the type, not the object.

Diagnose by asking three questions. Was \`sendEmail\` imported with ESM \`import\`, not \`require\`? Is there a top-level \`vi.mock('./email-service')\` or a \`vi.spyOn\` before the method is configured? Does the mock path exactly match the import path used by the code under test? Path aliases and setup files often create the mismatch.

| Error or symptom | Likely cause | Fix |
| --- | --- | --- |
| \`mockResolvedValue\` is not a function | Value was never mocked at runtime | Add \`vi.mock\`, \`vi.spyOn\`, or \`vi.fn\` |
| TypeScript rejects \`mockReturnValue\` | Import still has original type | Wrap the import with \`vi.mocked\` |
| Mock factory cannot read variable | \`vi.mock\` hoisting | Use \`vi.hoisted\` or define inside factory |
| Mock does not affect code under test | Import path mismatch or setup cache | Match paths and avoid importing mocked modules in setup |
| Partial mock hides missing field | \`partial: true\` overused | Return a full domain object for owned contracts |

\`\`\`typescript
import { describe, expect, it, vi } from 'vitest';
import * as emailService from './email-service';

describe('email sender', () => {
  it('spies before using vi.mocked', async () => {
    const spy = vi
      .spyOn(emailService, 'sendEmail')
      .mockResolvedValue({ id: 'email_1', accepted: true });

    vi.mocked(emailService.sendEmail).mockResolvedValueOnce({
      id: 'email_2',
      accepted: true,
    });

    await expect(emailService.sendEmail('qa@example.test')).resolves.toEqual({
      id: 'email_2',
      accepted: true,
    });
    expect(spy).toHaveBeenCalledWith('qa@example.test');
  });
});
\`\`\`

The spy creates the runtime mock. \`vi.mocked\` then gives the imported method mock-aware types. This is often the least disruptive fix for legacy modules where a full \`vi.mock\` factory would be too broad.

## Running Focused Mock Tests In CI

Vitest uses \`-t\` or \`--testNamePattern\` for test name filtering, and current docs note that the pattern matches the full name. In Vitest 5, suite and test name segments are joined with \` > \`; before Vitest 5, the join format mirrored Jest with spaces. That difference matters for very specific filters.

\`\`\`json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:mocks": "vitest run -t mocked",
    "test:account": "vitest run --testNamePattern 'account > formats'"
  }
}
\`\`\`

\`\`\`yaml
name: vitest

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run test -- --reporter=default
\`\`\`

Avoid building CI around type casts. A failing TypeScript mock is often an early signal that the production contract changed. Let \`tsc --noEmit\` or Vitest's transform step catch it before a UI test spends minutes exercising a branch fed by an impossible fixture.

## A Decision Checklist For Agents And Humans

When you see a mock typing error, choose the smallest tool that matches the runtime setup. If the mock is a standalone function you create in the test, use \`vi.fn\` with a function type or \`MockedFunction\`. If the mock is an imported module function replaced by \`vi.mock\`, use \`vi.mocked(importedFunction)\`. If it is a nested SDK client, confirm the mock factory creates nested \`vi.fn\` methods before using \`{ deep: true }\`. If you only need a subset of a huge returned shape, consider \`partial: true\`, then assert the branch that reads those fields.

Keep assertions meaningful. For async mocks, await the code under test and assert both the resulting behavior and the dependency call. For string outputs, use anchored regular expressions when matching formats, such as \`/^acct_[a-z0-9]+$/\` in rendered code. For side effects, check the call arguments, persisted state, emitted event, or visible UI change. A mock configured without an assertion is only a test arrangement, not proof.

## Frequently Asked Questions

### Does vi.mocked create a mock at runtime?

No. \`vi.mocked\` returns the object you pass to it and changes only TypeScript's understanding of that object. You still need \`vi.mock\`, \`vi.fn\`, \`vi.spyOn\`, or \`vi.importMock\` to create the runtime mock. If a test throws \`mockReturnValue is not a function\`, the object probably was real at runtime even though the compiler accepted the call.

### When should I use deep true with vi.mocked?

Use \`{ deep: true }\` when nested properties are actually mocked, such as an SDK object whose factory returns \`{ invoices: { create: vi.fn() } }\`. Do not use it as a blanket fix for every object. Deep mocked typing can make nested methods appear configurable even when your runtime factory did not replace them. Match the type helper to the real mock shape.

### Is partial true safe for domain objects?

It is safe only when the code under test reads a true subset of a large shape and the assertion covers that branch. For domain objects you own, full objects are usually better because they catch contract drift. \`partial: true\` is most helpful for platform or SDK objects where building a complete fake would distract from the behavior being tested.

### Why does vi.mocked not fix hoisting errors?

Hoisting is about when Vitest executes module mock calls. Typing is about what TypeScript believes after the mock exists. \`vi.mocked\` only helps the second problem. If the error mentions top-level variables in a mock factory or nested \`vi.mock\` calls, move the mock to top level, use \`vi.hoisted\`, or switch to \`vi.doMock\` with dynamic import for test-specific setup.
`,
};
