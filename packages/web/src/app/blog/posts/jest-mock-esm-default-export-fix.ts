import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Jest ESM Default Export Mock Fix",
  description:
    "Fix Jest ESM default export mocks by returning the right module shape, handling hoisting correctly, and using native ESM mocking when the runtime requires it.",
  date: "2026-07-13",
  category: "Guide",
  content: `
# Jest ESM Default Export Mock Fix

\`TypeError: (0, dependency_1.default) is not a function\` usually means the test replaced a module with the wrong shape. The production import asks for a default export, while the mock factory returned either a bare function or an object whose \`default\` member was never recognized as an ES module export. The function itself may be fine. The boundary around it is wrong.

The durable fix depends on how Jest is executing the test. Many TypeScript suites author \`import\` syntax but transform modules to CommonJS before execution. Native ESM suites preserve ESM semantics and use a different mocking sequence. Copying a factory from one mode into the other creates failures that look almost identical, so diagnose the runtime before changing syntax.

## Read the import and factory as matching object shapes

Consider a production module with one default export and one named export:

\`\`\`typescript
// src/rates-client.ts
export type Rate = { currency: string; value: number };

export const DEFAULT_CURRENCY = 'USD';

export default async function fetchRate(currency = DEFAULT_CURRENCY): Promise<Rate> {
  const response = await fetch(\`https://rates.example.test/latest?currency=\${currency}\`);
  if (!response.ok) throw new Error(\`rate service returned \${response.status}\`);
  return (await response.json()) as Rate;
}
\`\`\`

When transformed through the usual Babel or TypeScript interop path, \`import fetchRate from './rates-client'\` consumes the module's \`default\` property. A manual Jest factory should therefore return an ESM-shaped namespace object:

\`\`\`typescript
// src/quote-service.test.ts
import fetchRate, { DEFAULT_CURRENCY } from './rates-client';
import { quoteInCurrency } from './quote-service';

jest.mock('./rates-client', () => ({
  __esModule: true,
  default: jest.fn(),
  DEFAULT_CURRENCY: 'USD',
}));

const mockFetchRate = jest.mocked(fetchRate);

beforeEach(() => {
  mockFetchRate.mockReset();
});

it('converts a quote with the default-exported client', async () => {
  mockFetchRate.mockResolvedValue({ currency: 'EUR', value: 0.92 });

  await expect(quoteInCurrency(100, 'EUR')).resolves.toBe(92);
  expect(mockFetchRate).toHaveBeenCalledWith('EUR');
  expect(DEFAULT_CURRENCY).toBe('USD');
});
\`\`\`

The marker \`__esModule: true\` tells Jest's CommonJS-oriented module machinery that the factory already represents an ES module namespace. The \`default\` property supplies the value requested by the default import. Named exports sit beside it. \`jest.mocked()\` is a TypeScript helper for typed access to the mock; it does not turn a real function into a mock at runtime.

| Production import | Factory result expected in transformed ESM tests | Typical mistake |
|---|---|---|
| \`import run from './job'\` | \`{ __esModule: true, default: jest.fn() }\` | Returning \`{ run: jest.fn() }\` |
| \`import { run } from './job'\` | \`{ run: jest.fn() }\` | Placing the function under \`default\` |
| \`import run, { timeout } from './job'\` | Marker, \`default\`, and \`timeout\` properties | Replacing the module with only a function |
| \`const run = require('./job')\` for \`module.exports = run\` | A callable function | Adding an unnecessary default wrapper |
| \`import * as job from './job'\` | Namespace members used by production | Mocking only an unused default |

Do not add \`__esModule\` mechanically to every CommonJS mock. It is relevant when the consumer and transformation expect an ESM namespace. A genuine CommonJS module exporting with \`module.exports = function...\` has a different runtime shape.

## Recognize the three wrong factories by their symptoms

The first wrong form returns a named property for a default import:

\`\`\`typescript
jest.mock('./rates-client', () => ({
  fetchRate: jest.fn(),
}));
\`\`\`

Production looks for \`default\`, finds \`undefined\`, and later fails when calling it. The second form returns a bare mock function:

\`\`\`typescript
jest.mock('./rates-client', () => jest.fn());
\`\`\`

This sometimes appears to work because a transform wraps CommonJS values for default interoperability. It breaks once named exports are needed, interop configuration changes, or the consumer receives a namespace rather than the function. It is a fragile coincidence, not a clear contract.

The third form includes \`default\` but omits the marker:

\`\`\`typescript
jest.mock('./rates-client', () => ({
  default: jest.fn(),
}));
\`\`\`

Depending on the transform, the object can be wrapped again, producing the effective shape \`{ default: { default: mockFn } }\`. That explains failures where logging the imported value reveals an object with another \`default\` inside it.

Inspect the value once when diagnosis is unclear. \`console.dir(importedValue)\` in the failing test can distinguish \`undefined\`, a namespace object, and a mock function. Remove the diagnostic afterward; the permanent assertion should target behavior and calls, not an implementation-specific serialization of the module.

## Preserve real named exports with requireActual

Some modules export a default side-effecting client plus pure constants, validators, or types. Recreating every named runtime export in the factory is brittle. Spread the actual module, then override only the default. Set the marker explicitly after or before the spread, ensuring the final object keeps it true.

\`\`\`typescript
// src/invoice-service.test.ts
import sendInvoice, { formatInvoiceNumber } from './invoice-gateway';
import { finalizeInvoice } from './invoice-service';

jest.mock('./invoice-gateway', () => {
  const actual = jest.requireActual<typeof import('./invoice-gateway')>('./invoice-gateway');
  return {
    __esModule: true,
    ...actual,
    default: jest.fn(),
  };
});

const mockSendInvoice = jest.mocked(sendInvoice);

it('formats locally and sends through the mocked gateway', async () => {
  mockSendInvoice.mockResolvedValue({ deliveryId: 'delivery-7' });

  const result = await finalizeInvoice({ sequence: 19, totalCents: 4250 });

  expect(formatInvoiceNumber(19)).toBe('INV-0019');
  expect(mockSendInvoice).toHaveBeenCalledWith(
    expect.objectContaining({ invoiceNumber: 'INV-0019', totalCents: 4250 }),
  );
  expect(result.deliveryId).toBe('delivery-7');
});
\`\`\`

\`jest.requireActual()\` evaluates the real module. If module initialization opens a connection, reads mandatory environment configuration, or registers global state, a partial mock can trigger exactly the side effect the test meant to avoid. In that case, provide the few safe exports explicitly or refactor constants into a side-effect-free module.

Types vanish at runtime. You do not need to include \`Rate\` or other \`export type\` declarations in the returned object. TypeScript's \`typeof import(...)\` helps type the actual module without importing another runtime value.

For the separate choice between replacing behavior once and changing it per test, see [Jest mock versus mockImplementation](/blog/jest-mock-vs-mockimplementation-guide). Module shape answers “what was imported”; implementation APIs answer “what should the mock do now.”

## Account for Jest's factory hoisting

In transformed CommonJS tests, Jest hoists \`jest.mock()\` registration so it can replace dependencies before imports execute. The factory itself runs when the module is required. Referencing arbitrary outer variables can hit the temporal dead zone or Jest's out-of-scope factory guard.

This pattern is clear because the mock is created inside the factory and retrieved through the imported binding:

\`\`\`typescript
import calculateTax from './tax-client';

jest.mock('./tax-client', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockCalculateTax = jest.mocked(calculateTax);
\`\`\`

If a shared mock variable is necessary, names beginning with \`mock\` may be allowed by Jest's transform as an escape hatch, but naming does not remove JavaScript initialization rules. Ensure the value exists before the factory evaluates it. Factory-local creation is usually easier to reason about.

Also distinguish \`clear\`, \`reset\`, and \`restore\`. Clearing removes recorded calls while retaining the current implementation. Resetting also removes the mock implementation. Restoring is relevant to spies or replaced properties that remember an original value; it cannot magically reconstruct a module factory. The [Jest module isolation and resetModules guide](/blog/jest-module-isolation-resetmodules-guide) covers registry state when tests need fresh imports rather than fresh call history.

## Native ESM changes the order of operations

When Jest runs real ESM, static imports are evaluated before the module body. Traditional hoisting cannot move a call ahead of that language-level linking process. Jest exposes \`jest.unstable_mockModule()\` for ESM mocking, and the test must register the mock before dynamically importing the subject and dependency. The API name still signals that its stability contract differs from mature \`jest.mock()\`.

\`\`\`typescript
// quote-service.esm.test.ts
import { jest } from '@jest/globals';

const fetchRateMock = jest.fn<() => Promise<{ currency: string; value: number }>>();

jest.unstable_mockModule('./rates-client.js', () => ({
  default: fetchRateMock,
  DEFAULT_CURRENCY: 'USD',
}));

const { quoteInCurrency } = await import('./quote-service.js');

beforeEach(() => {
  fetchRateMock.mockReset();
});

it('uses the native ESM mock registered before import', async () => {
  fetchRateMock.mockResolvedValue({ currency: 'GBP', value: 0.8 });

  await expect(quoteInCurrency(50, 'GBP')).resolves.toBe(40);
  expect(fetchRateMock).toHaveBeenCalledWith('GBP');
});
\`\`\`

Notice that this factory returns ESM export names directly and does not rely on the transformed-CommonJS \`__esModule\` convention. The exact file extension follows the project's ESM resolution setup. In Node ESM, relative runtime specifiers commonly include \`.js\` even when TypeScript source files use \`.ts\`; Jest transformation and module mapping must agree.

| Execution model | Mock registration | Subject loading | Default export representation |
|---|---|---|---|
| Babel or ts-jest transformed to CommonJS | \`jest.mock()\` | Static import commonly works through hoisting | Usually marker plus \`default\` property |
| Native ESM in Jest | \`jest.unstable_mockModule()\` | Dynamic \`await import()\` after registration | Factory returns \`default\` export directly |
| CommonJS test and dependency | \`jest.mock()\` | \`require()\` or transformed import | Match \`module.exports\` shape |
| Dependency injection without module mocking | Construct fake and pass it | Normal import of subject | No module namespace replacement |

Do not decide the mode from source syntax alone. Check \`package.json\` type, Jest ESM configuration, transformer output, relevant file extensions, and whether the test imports \`jest\` from \`@jest/globals\`. A TypeScript file full of ESM imports can still execute as CommonJS.

## Mock default-exported objects and classes precisely

Not every default is a function. If the default export is an object, replacing it with \`jest.fn()\` changes property access into a call signature. Return a matching object under \`default\`:

\`\`\`typescript
jest.mock('./feature-flags', () => ({
  __esModule: true,
  default: {
    isEnabled: jest.fn(),
    variant: jest.fn(),
  },
}));
\`\`\`

A default-exported class needs a constructable value. A normal function or a mock function with an implementation returning the instance surface works; an arrow supplied as the final constructor value may not be constructable in all transformation paths. Keep class tests focused on the collaborator contract rather than reproducing all class internals.

Getter exports add another wrinkle. Spreading \`requireActual\` reads enumerable getters immediately and converts them to values. If live getter semantics matter, use property descriptors or split the module. This is a sign that broad partial mocking has become coupled to module implementation.

## Diagnose configuration before adding more wrappers

When a correct-looking factory still fails, reduce the case to one dependency and one assertion that the imported value is a mock. Then inspect transformation:

1. Confirm the mock specifier exactly matches the subject's import specifier after any alias mapping.
2. Check whether setup files imported the dependency before the test registered its mock.
3. Verify that only one physical copy of the module exists under monorepo or symlink resolution.
4. Establish whether the suite is native ESM or transformed CommonJS.
5. Remove barrel re-exports temporarily, because mocking the leaf while the subject imports the barrel targets different module IDs.

A module imported in a global setup file can be cached before a test's factory applies. Likewise, \`'@app/rates-client'\` and \`'./rates-client'\` may resolve to the same source in the bundler but be treated as different Jest requests depending on configuration. Mock the exact boundary the subject uses.

Avoid “fixes” that append \`.default\` in production code solely to satisfy a test. Production imports should reflect the dependency's actual contract. Repair the mock or module mapping instead.

## Prefer an injected collaborator when module state dominates the test

Module mocking is appropriate for a stable external boundary, but it becomes costly when every test resets registries, varies import timing, and depends on transform quirks. A function such as \`createQuoteService({ fetchRate })\` lets tests pass a typed fake directly. There is no namespace interop to imitate, and concurrent cases can own separate fakes.

This is not a requirement to rewrite simple modules. One correct \`jest.mock()\` factory is perfectly maintainable. Consider injection when the mock shape repeatedly breaks during ESM migration or the dependency carries singleton state. The goal is to test behavior with the least hidden runtime machinery.

## Cover re-exports and dynamic imports explicitly

A default re-export can change the boundary the consumer resolves. A barrel can expose the leaf's default as a named fetchRate export, in which case production receives a named binding even though the leaf declaration was default. Mock the barrel with a fetchRate property, or let the barrel execute and replace its leaf before import. Returning a default property for the barrel does not match that production request.

A barrel that re-exports the leaf as its own default is different again. Draw the import chain on paper when nested defaults become confusing, and label each edge as default, named, or namespace. The correct factory shape follows the edge used by the subject, not the original declaration several files away.

Dynamic imports introduce timing rather than a new export shape. In a transformed suite, register the module mock before the code reaches its dynamic import. In native ESM, register the ESM mock and only then import the subject. A subject that dynamically imports on the first method call can retain the module in Jest's registry across later cases, so varying factories may require isolation or a design that injects the loader.

Add one contract-style test during an ESM migration that imports the real dependency through the same specifier as production and asserts the public export types at runtime: callable default, expected named constants, or constructable class. This is not a substitute for behavior tests. It catches changes in package exports, transformer mapping, or barrel structure before dozens of mocks fail with opaque “not a function” messages.

Also check packages that publish both import and require entry points. Jest may resolve the CommonJS condition while the application bundler resolves ESM, giving each environment a legitimately different namespace shape. Align Jest's resolver with the production target where possible. If the test intentionally uses the CommonJS build, write its mock against that build and avoid presenting the result as proof of the ESM entry point.

Snapshotting the imported namespace is rarely the answer. A snapshot freezes incidental enumerable properties and can change across transpiler versions without a behavioral defect. Prefer direct assertions that the binding is callable, mocked, and invoked with the expected domain arguments. When a package upgrade alters the export map, those assertions explain the broken contract immediately.

Finally, keep one test that does not mock the module if the dependency is internal and cheap. A suite in which every consumer replaces the same default export can miss a renamed export or broken barrel until production bundling. The integration case can use a harmless in-memory adapter or local fixture while preserving the real import path.

## Frequently Asked Questions

### Why is my mocked default import an object instead of a function?

The module was likely wrapped as CommonJS interoperability data, often because the factory omitted \`__esModule: true\`. Inspect whether the function is nested under \`default.default\`, then return an explicit ESM-shaped object for the transformed test mode.

### Does jest.mocked create the default export mock?

No. It provides TypeScript-aware typing around a value that must already be mocked. The module factory, automatic mocking, or spy performs the runtime replacement.

### Can I use requireActual inside a native ESM mock factory?

Do not assume the CommonJS partial-mock recipe transfers directly. Native ESM mocking is asynchronous and has different loading constraints. Prefer explicit exports in the factory, or use the ESM-specific module APIs supported by the Jest version and configuration in the project.

### Why does the factory work alone but fail through an index barrel?

The subject may import a different module ID and receive a re-exported binding from the barrel. Mock the specifier used by the subject, or remove the barrel from that dependency boundary. Confirm moduleNameMapper is not creating another identity.

### Should __esModule appear in production source?

No. It is an interoperability marker used in generated or mock module objects. Author production exports with normal ESM syntax and configure the transformer consistently; place the marker only where the Jest factory must emulate that runtime shape.
`,
};
