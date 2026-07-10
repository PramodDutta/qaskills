import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'fast-check Property-Based Testing for TypeScript',
  description:
    'Apply fast-check property-based testing in TypeScript with arbitraries, shrinking, invariants, model checks, and CI settings that find edge cases.',
  date: '2026-07-10',
  category: 'Tutorial',
  content: `
# fast-check Property-Based Testing for TypeScript

The bug report says a discount calculation returned a negative invoice total when a coupon, a refund credit, and a zero-tax region met in the same cart. Nobody wrote that exact example. A human tester tried normal carts. Unit tests covered one coupon. The edge case lived in the space between valid inputs. That is where fast-check earns its keep: it generates many valid inputs, checks an invariant, and shrinks a failure down to the smallest case it can find.

Property-based testing is not random testing with a nicer name. In fast-check, you define arbitraries that describe data, then assert properties that should hold for all generated values. The library searches the input space and records a reproducible seed when it finds a counterexample. For TypeScript teams, this is especially useful around parsers, formatters, reducers, pricing logic, permissions, serialization, date handling, and any code where example tests only cover the cases the author imagined.

This guide assumes you can already write unit tests. If you want the testing strategy behind the technique, read the broader [property-based testing guide](/blog/property-based-testing-complete-guide). If your team also uses Python and wants to compare mental models, the closest sibling is [Hypothesis for Python](/blog/hypothesis-property-based-testing-python-guide).

## The Shape of a fast-check Test

A fast-check test has three important parts: an arbitrary, a property, and a runner. The arbitrary creates values. The property receives those values and makes assertions. The runner executes enough cases to make the check meaningful. In Vitest or Jest, the runner is usually called inside a normal test.

| Piece | fast-check API | What you own | Bad smell |
| --- | --- | --- | --- |
| Arbitrary | \`fc.string()\`, \`fc.record()\`, \`fc.array()\`, custom chains | The shape of valid inputs | Generating impossible data and blaming the function |
| Property | \`fc.property(...)\` or \`fc.asyncProperty(...)\` | The invariant that must always hold | Rewriting the implementation as the assertion |
| Execution | \`fc.assert(property, options)\` | Number of runs, seed handling, timeout | Too few runs locally, too many in PR without value |
| Shrinking | Built into arbitraries | Reading the minimal failing case | Ignoring the seed and rerunning blindly |

Example-based tests ask, "Does this input produce this output?" Property tests ask, "Which rule is always true for this family of inputs?" Both are needed. A pricing engine still needs examples for known business cases. Properties then patrol the input space around them.

## Installing fast-check in a TypeScript Suite

fast-check works with common JavaScript and TypeScript test runners. The examples below use Vitest, but the fast-check calls are the same inside Jest.

\`\`\`bash
npm install -D fast-check vitest typescript
\`\`\`

A small Vitest config is enough for pure TypeScript logic.

\`\`\`ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    restoreMocks: true,
  },
});
\`\`\`

Do not begin by property-testing UI flows. Start with deterministic functions where a failure is easy to reproduce and where generated data exposes real variation.

## A First Invariant: Currency Formatting Round Trips

Suppose a checkout service stores money as integer cents and formats it for display. You might have example tests for \`1234 -> "$12.34"\`. The stronger invariant is that formatting then parsing returns the original cents for valid non-negative amounts.

\`\`\`ts
// src/money.ts
export function formatUsd(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error('cents must be a non-negative integer');
  }

  const dollars = Math.floor(cents / 100);
  const remainder = String(cents % 100).padStart(2, '0');
  return \`$\${dollars}.\${remainder}\`;
}

export function parseUsd(label: string): number {
  const match = /^\\$(\\d+)\\.(\\d{2})$/.exec(label);
  if (!match) {
    throw new Error('invalid USD label');
  }

  return Number(match[1]) * 100 + Number(match[2]);
}
\`\`\`

\`\`\`ts
// src/money.test.ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { formatUsd, parseUsd } from './money';

describe('USD formatting', () => {
  it('round trips non-negative integer cents', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000_000 }), (cents) => {
        expect(parseUsd(formatUsd(cents))).toBe(cents);
      }),
      { numRuns: 1000 },
    );
  });
});
\`\`\`

This is a real fast-check property. The arbitrary restricts values to what the function claims to accept. The property avoids a second implementation of the formatter. It only checks the round trip rule.

## Arbitraries Should Model Valid Domains

A weak property test often fails because the arbitrary generated nonsense. That can still teach you something, but it is not a product defect unless the function promised to handle nonsense. Model the domain with the same care you use for test data in end-to-end suites.

For a checkout system, a cart line might require a SKU, positive quantity, integer unit price, and optional coupon code. Build that arbitrary once and reuse it.

\`\`\`ts
// src/cart-arbitraries.ts
import fc from 'fast-check';

export const skuArb = fc
  .tuple(
    fc.constantFrom('BOOK', 'COURSE', 'SUBSCRIPTION'),
    fc.integer({ min: 100, max: 999 }),
  )
  .map(([prefix, id]) => \`\${prefix}-\${id}\`);

export const cartLineArb = fc.record({
  sku: skuArb,
  quantity: fc.integer({ min: 1, max: 20 }),
  unitPriceCents: fc.integer({ min: 1, max: 50_000 }),
});

export const cartArb = fc.record({
  lines: fc.array(cartLineArb, { minLength: 1, maxLength: 20 }),
  couponPercent: fc.option(fc.integer({ min: 1, max: 80 }), { nil: undefined }),
  storeCreditCents: fc.integer({ min: 0, max: 100_000 }),
});
\`\`\`

The arbitrary encodes business boundaries. If product changes the maximum coupon to 90 percent, the arbitrary should change. This is test data management, not decoration.

## Invariants for Pricing Logic

Pricing code is a strong candidate because totals have rules. A total should not be negative. Adding a line with a positive price should not reduce the pre-discount subtotal. Applying a coupon should not increase the total. Store credit should not create money.

\`\`\`ts
// src/cart.ts
export type CartLine = {
  sku: string;
  quantity: number;
  unitPriceCents: number;
};

export type Cart = {
  lines: CartLine[];
  couponPercent?: number;
  storeCreditCents: number;
};

export function subtotalCents(cart: Cart): number {
  return cart.lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
}

export function totalCents(cart: Cart): number {
  const subtotal = subtotalCents(cart);
  const discounted =
    cart.couponPercent === undefined
      ? subtotal
      : Math.floor(subtotal * ((100 - cart.couponPercent) / 100));

  return Math.max(0, discounted - cart.storeCreditCents);
}
\`\`\`

\`\`\`ts
// src/cart.test.ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { cartArb } from './cart-arbitraries';
import { subtotalCents, totalCents } from './cart';

describe('cart totals', () => {
  it('never produces a negative total for a valid cart', () => {
    fc.assert(
      fc.property(cartArb, (cart) => {
        expect(totalCents(cart)).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it('never makes the payable total greater than the subtotal', () => {
    fc.assert(
      fc.property(cartArb, (cart) => {
        expect(totalCents(cart)).toBeLessThanOrEqual(subtotalCents(cart));
      }),
    );
  });
});
\`\`\`

These properties are not exhaustive proof of correct pricing. They are high-value guards that catch classes of defects example tests routinely miss.

## Reading Shrunk Failures Like an SDET

When fast-check finds a failure, it tries to shrink the generated input. Shrinking is the reason property-based testing is practical. A random failing cart with twenty lines is hard to debug. A shrunk cart with one line, a specific coupon, and one store credit value is a bug report.

Capture the failure seed from the test output. fast-check reports enough replay information to reproduce a failure. In CI, preserve logs so the counterexample is not lost. For a serious defect, convert the shrunk counterexample into a named regression test after fixing the code. Keep the property too. The example test documents the specific bug. The property continues searching the surrounding input space.

| Failure artifact | What to do with it | Why it matters |
| --- | --- | --- |
| Seed | Rerun the property with the same seed while debugging | Reproduces the generated path |
| Counterexample | Paste into a focused regression test | Makes the fixed bug readable |
| Shrink path | Inspect if the final case is surprising | Reveals which fields mattered |
| Property name | Keep it business-specific | Helps triage CI output quickly |

Do not dismiss a weird counterexample because a user would not enter it manually. Ask whether the input is valid under your domain model. If it is valid, it can arrive through import, API, migration, admin tooling, or bad upstream data.

## Async Properties for API Adapters

fast-check supports asynchronous properties through \`fc.asyncProperty\`. Use them carefully. Async properties are slower and failures can be harder to isolate, but they are useful for deterministic adapters such as serialization through a local in-memory store or a test database transaction.

\`\`\`ts
// src/profile-codec.test.ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decodeProfile, encodeProfile } from './profile-codec';

const profileArb = fc.record({
  id: fc.uuid(),
  displayName: fc.string({ minLength: 1, maxLength: 80 }),
  emailOptIn: fc.boolean(),
  tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 }),
});

describe('profile codec', () => {
  it('preserves profiles through encode and decode', async () => {
    await fc.assert(
      fc.asyncProperty(profileArb, async (profile) => {
        const encoded = await encodeProfile(profile);
        const decoded = await decodeProfile(encoded);

        expect(decoded).toEqual(profile);
      }),
      { numRuns: 200 },
    );
  });
});
\`\`\`

Keep \`numRuns\` lower for async checks unless the operation is genuinely cheap. If the property talks to a remote service, it is usually no longer a unit property test. Move it to an integration suite and be honest about cost.

## Stateful Model Testing Without Theater

fast-check can test command sequences through model-based testing APIs such as \`fc.commands\` and \`fc.modelRun\`. This is useful when state transitions matter more than individual inputs: carts, undo stacks, permissions, workflow status, and queues.

Do not use model testing because it looks advanced. Use it when you can write a simple model that is obviously correct. A model that is as complicated as the system under test is just another implementation to debug.

\`\`\`ts
// src/stack.model.test.ts
import fc from 'fast-check';
import { describe, it } from 'vitest';
import { Stack } from './stack';

type Model = { values: number[] };
type Real = { stack: Stack<number> };

class PushCommand implements fc.Command<Model, Real> {
  constructor(private readonly value: number) {}

  check = () => true;

  run(model: Model, real: Real) {
    model.values.push(this.value);
    real.stack.push(this.value);
  }
}

class PopCommand implements fc.Command<Model, Real> {
  check(model: Model) {
    return model.values.length > 0;
  }

  run(model: Model, real: Real) {
    const expected = model.values.pop();
    const actual = real.stack.pop();

    if (actual !== expected) {
      throw new Error(\`expected \${expected}, got \${actual}\`);
    }
  }
}

describe('Stack model', () => {
  it('follows push and pop semantics', () => {
    fc.assert(
      fc.property(
        fc.commands([
          fc.integer().map((value) => new PushCommand(value)),
          fc.constant(new PopCommand()),
        ]),
        (commands) => {
          fc.modelRun(() => ({ model: { values: [] }, real: { stack: new Stack<number>() } }), commands);
        },
      ),
    );
  });
});
\`\`\`

The model is an array. The real system is the stack. That difference keeps the test valuable. For production systems, the same pattern can validate a reducer, a wizard state machine, or a queue abstraction.

## Tuning Runs, Seeds, and CI Behavior

Default settings are fine for early adoption, but a production suite needs explicit choices. Too few runs make properties decorative. Too many runs slow every pull request. Use stronger settings where the risk justifies it.

| Setting | Local recommendation | CI recommendation | Notes |
| --- | --- | --- | --- |
| \`numRuns\` | 100 to 500 for quick feedback | 500 to 5000 for critical pure functions | Increase only when failures are valuable |
| \`seed\` | Usually random | Set from env when replaying | Do not pin every property forever without reason |
| \`timeout\` | Keep runner defaults for pure tests | Add limits around expensive async checks | Timeouts indicate cost or infinite loops |
| Verbosity | Normal | Capture full failure output | CI logs must preserve counterexamples |

You can expose a replay seed through an environment variable:

\`\`\`ts
const seed = process.env.FC_SEED ? Number(process.env.FC_SEED) : undefined;

fc.assert(property, {
  numRuns: process.env.CI ? 1000 : 200,
  seed,
});
\`\`\`

That small hook makes CI failures reproducible without changing source code.

## Properties That Usually Pay Off

Some invariants appear across many TypeScript systems:

- Parse after format returns the original value.
- Sorting preserves the same set of items.
- Normalization is idempotent.
- Encoding then decoding preserves the object.
- Applying the same reducer event sequence to the same initial state returns the same final state.
- Permission checks never grant more access after removing a role.
- A subtotal is never lower than any positive line item.
- Date range splitting covers the same interval without overlap.

Pick invariants that would matter if broken. Do not add property tests that only prove JavaScript arithmetic still works.

## When fast-check Is the Wrong Tool

Property-based testing is powerful, but it is not a universal default. Do not use fast-check when the expected behavior is a single negotiated example, such as "the legal disclosure text must equal this approved sentence." Do not use it when the system under test is dominated by remote services, rate limits, and non-deterministic timing. Do not use it when nobody can state an invariant stronger than "it should work."

Example tests are better for:

- Exact copy, legal text, and approved templates.
- One-off compatibility bugs tied to a specific browser or provider.
- Visual layout approvals.
- Complex workflows where setup cost hides the property.
- Behavior where the oracle is a human decision.

The best suites mix both styles. Use examples to document named business cases. Use properties to search the space around those cases.

## Generating Data Without Losing Type Meaning

TypeScript types can create a false sense of safety in property tests. A value can satisfy a type and still be invalid for the domain. \`string\` is not the same as a SKU. \`number\` is not the same as cents. \`Date\` is not the same as a business day in a supported time zone.

Build arbitraries that represent domain types. If your code uses branded types or Zod schemas, consider using them to validate generated values at the boundary. That way the property explores meaningful cases instead of spending most runs on values the application would reject before reaching the function under test.

For high-risk domains, add comments beside arbitraries explaining why boundaries were chosen. A maximum quantity of 20, a coupon cap of 80 percent, or a tag length of 20 should come from product behavior, not the test author's mood. When product rules change, the arbitrary should change in the same pull request as the implementation.

## Debugging Without Muting the Property

When a property fails, the tempting response is to narrow the arbitrary until the failure disappears. That is often the wrong fix. First decide whether the counterexample is valid. If it is valid, fix the production code. If it is invalid, refine the arbitrary or add a precondition with \`fc.pre\`. Use preconditions sparingly because discarded inputs reduce search efficiency.

After the fix, keep the counterexample as a normal test. That small example becomes a readable artifact for code review, while the property continues to explore future combinations.

## Shrinking-Friendly Arbitrary Design

Shrinking works best when the arbitrary is built from fast-check primitives instead of opaque random functions. If you generate a cart by calling \`Math.random()\` inside \`fc.constantFrom()\`, fast-check cannot shrink the internal structure well. Prefer \`fc.record\`, \`fc.array\`, \`fc.integer\`, \`fc.option\`, and \`map\` chains that preserve shrink information.

This matters during triage. A well-designed arbitrary might shrink a failing cart to one line with one coupon. A poorly designed arbitrary might leave you with a large object that is technically reproducible but painful to understand. SDETs should treat shrink quality as part of test quality.

Keep generated objects small by default. If production allows 500 cart lines, you do not need every property to generate 500 lines on every run. Use a small default range, then add targeted stress properties for high-volume behavior. That gives fast local feedback and still covers scale where it matters.

## Properties Around Reducers and UI State

Frontend TypeScript code often has reducers, stores, or state machines that are excellent property targets. You can generate event sequences and assert that state invariants always hold. For example, a wizard should never mark step three complete while step one is invalid. A filter reducer should not create duplicate selected values. An undo stack should not grow beyond its configured limit.

The trick is to assert state rules, not snapshots after arbitrary sequences. A snapshot for a random event list is unreadable. A property such as "selected filter ids are unique after any sequence of add and remove events" is both readable and valuable.

These tests are cheap because they do not need a browser. They catch state bugs before UI tests become involved. When a browser test later fails, you can be more confident the defect is integration or rendering, not the reducer's basic state law.

## Introducing fast-check to an Existing Team

Start with one painful defect class. Pricing, date ranges, permissions, or serialization are better first targets than a random utility folder. Show the team a real counterexample and the shrink result. That demonstration teaches the technique faster than a style guide.

Add naming conventions early. Property names should state the invariant in business language: "never grants access after removing a role" is better than "property test for permissions." Reviewers should ask whether the arbitrary models the domain and whether the property could fail for an important reason. That keeps fast-check from becoming a novelty.

## Reviewing Property Tests in Pull Requests

A reviewer should not approve a property test just because it uses \`fc.assert\`. Ask what defect class it is meant to catch. Ask whether the arbitrary can generate the edge cases named in the description. Ask whether the assertion would fail if the implementation were obviously wrong. Mutation testing can help here, but a careful review is often enough.

Also review runtime. A property that runs 5000 cases across a heavy parser may be appropriate in nightly CI and painful on every save. Put expensive properties behind a separate test command or use lower local \`numRuns\` with higher CI settings. The test should earn its cost.

Finally, require a replay path. If a property can fail in CI but the team cannot reproduce it locally with a seed, it will quickly be treated as noise. Put seed instructions in the failure output or in the test README near the suite, and verify them during onboarding for every new maintainer.

## Frequently Asked Questions

### Is fast-check useful if I already have high branch coverage?

Yes, when the remaining risk is input variation. Branch coverage can show that a line executed once. fast-check can run the same branch with hundreds or thousands of valid values and find combinations your examples missed.

### Should generated data include invalid inputs?

Only when the property is about validation or rejection. For business invariants, generate valid domain data so failures represent product defects instead of arbitrary garbage.

### How do I reproduce a fast-check failure from CI?

Copy the seed and counterexample details from the failure output. Add the seed to \`fc.assert\` options or pass it through an environment variable such as \`FC_SEED\` while debugging locally.

### When should I convert a counterexample into a normal unit test?

After the bug is fixed. Keep the property, but add a named example test with the shrunk counterexample so future readers understand the exact regression.

### Can fast-check test async code?

Yes, use \`fc.asyncProperty\` and await \`fc.assert\`. Keep async properties focused and avoid remote services unless the test belongs in a slower integration suite.
`,
};
