import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest Snapshot Serializers Custom Guide: Build Stable, Reviewable Diffs',
  description: 'Use this Vitest snapshot serializers custom guide to normalize noisy values, preserve useful detail, and produce stable snapshots reviewers can trust.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Vitest Snapshot Serializers Custom Guide: Build Stable, Reviewable Diffs

A custom Vitest snapshot serializer converts a value into a deliberate, stable representation before Vitest writes or compares the snapshot. Register a serializer globally with the \`expect.addSnapshotSerializer\` API in a setup file, or list a serializer module under \`test.snapshotSerializers\`. The practical payoff is smaller diffs that preserve behaviorally important fields while removing timestamps, opaque IDs, absolute paths, and framework internals.

This Vitest snapshot serializers custom guide treats serialization as test-interface design, not cosmetic cleanup. You will build a typed serializer, constrain its match predicate, compose with Vitest's printer, test the serializer without blindly updating snapshots, and diagnose collisions between plugins. The examples are intended for QA and test-automation engineers who need repeatable results locally, in containers, and in AI-agent-generated test suites.

A serializer should never make a wrong result look right. Normalize values only when the test has a separate assertion for the underlying invariant, or when the exact value is genuinely irrelevant. If an order ID must be a UUID, assert its shape before replacing it with a readable token. The snapshot then documents structure while the focused assertion protects correctness.

## Decide whether serialization is the right testing seam

Snapshot noise has several causes, and a serializer is appropriate for only some of them. Start by identifying who owns the unstable value. If your test data factory generates the current time, inject a clock. If a library returns a rich object whose public meaning is hidden inside internal properties, serialize that object. If unordered data arrives from an API that promises no ordering, compare it as a set or sort a copied view with an explicit rationale.

| Source of churn | Better first response | Serializer role | Risk if handled poorly |
|---|---|---|---|
| Current time created by application code | Inject or fake the clock | Optional display normalization | Real time-zone defects disappear |
| Random identifiers | Seed or inject the generator, then assert format | Replace verified values with tokens | Invalid IDs look acceptable |
| Absolute temporary paths | Assert the meaningful suffix | Redact machine-specific prefix | Wrong directory is hidden |
| Third-party class internals | Assert public behavior | Render a compact public view | Upgrade incompatibility is missed |
| Object key order | Confirm whether order matters | Usually rely on normal object formatting | Ordered behavior becomes invisible |
| Secrets or tokens | Prevent collection at the source | Defensive redaction only | Snapshot stores credentials in Git |

This distinction is especially useful when an AI coding agent proposes to run snapshot update mode after every failure. Updating is not diagnosis. First classify the difference as intended behavior, environmental noise, or regression. A serializer addresses recurring representation noise. It does not approve product changes.

Snapshot tests also need a clear review surface. A 600-line object dump is rarely reviewed carefully. Prefer serializers for domain values such as \`Money\`, \`HttpExchange\`, or \`AuditEvent\`, where a compact representation can express the contract better than raw enumeration. For a broader comparison of runner tradeoffs, the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) helps place Vitest snapshot behavior in context.

## Build a serializer around a branded domain value

Suppose a checkout service returns a receipt containing a domain \`Money\` object. The object caches formatter state and stores metadata that changes across environments. The business contract needs the currency and minor-unit amount, not every internal field.

\`\`\`ts
// src/money.ts
export class Money {
  readonly kind = 'Money';

  constructor(
    readonly minorUnits: number,
    readonly currency: 'USD' | 'EUR' | 'INR',
  ) {
    if (!Number.isInteger(minorUnits)) {
      throw new TypeError('minorUnits must be an integer');
    }
  }
}
\`\`\`

A serializer plugin has a \`test\` predicate and a \`serialize\` function. Vitest uses its snapshot formatting system to find a plugin that accepts the value. Keep the predicate narrow and side-effect free because it can be called for many nested values.

\`\`\`ts
// test/serializers/money.serializer.ts
import type { SnapshotSerializer } from 'vitest';
import { Money } from '../../src/money';

const moneySerializer = {
  test(value) {
    return value instanceof Money;
  },
  serialize(value) {
    const money = value as Money;
    return \`Money(\${money.currency} \${money.minorUnits} minor units)\`;
  },
} satisfies SnapshotSerializer;

export default moneySerializer;
\`\`\`

Readers see normal TypeScript after Markdown rendering.

The output is intentionally not a locale-formatted decimal. Locale formatting can vary with runtime data and obscures the exact integer used for arithmetic. \`Money(USD 2599 minor units)\` is stable and lossless for this contract. A reviewer can infer dollars only if the currency convention is known, but the snapshot does not silently round.

Test it at the consumer boundary:

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { Money } from '../src/money';

describe('receipt snapshot', () => {
  it('shows exact totals in the receipt contract', () => {
    const receipt = {
      status: 'paid',
      subtotal: new Money(2_499, 'USD'),
      tax: new Money(100, 'USD'),
      total: new Money(2_599, 'USD'),
    };

    expect(receipt.total.minorUnits).toBe(2_599);
    expect(receipt).toMatchSnapshot();
  });
});
\`\`\`

The direct assertion and snapshot have different jobs. The assertion makes the arithmetic expectation unmistakable. The snapshot documents the complete receipt shape and uses the serializer wherever a nested \`Money\` appears.

## Register serializers at the scope you actually intend

Vitest supports explicit registration through \`expect.addSnapshotSerializer\` and implicit loading through the \`snapshotSerializers\` configuration option. Explicit registration in a setup file is easy to discover next to other test initialization. Configuration registration is useful when serializer modules are a stable part of the project test policy.

\`\`\`ts
// test/setup.ts
import { expect } from 'vitest';
import moneySerializer from './serializers/money.serializer';

expect.addSnapshotSerializer(moneySerializer);
\`\`\`

\`\`\`ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./test/setup.ts'],
  },
});
\`\`\`

Alternatively, load the serializer module directly:

\`\`\`ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    snapshotSerializers: ['./test/serializers/money.serializer.ts'],
  },
});
\`\`\`

Do not register the same serializer through both routes. Duplicate registration adds confusion when investigating precedence, even if the output appears unchanged. Choose one project convention and document the reason. A small repository may register a serializer beside one test file with \`expect.addSnapshotSerializer\`, but suite-wide representations belong in setup or configuration so test order does not determine behavior.

| Registration choice | Visibility | Best fit | Main caution |
|---|---|---|---|
| Test file call | Local and explicit | One narrow suite or prototype | A later test may assume registration that never happened |
| Setup file call | Centralized with hooks and matchers | Shared testing policy | Setup selection may differ between projects |
| \`snapshotSerializers\` config | Declarative and suite-wide | Stable serializer modules | Path resolution must follow the active config root |

In a Vitest workspace or multi-project configuration, verify which project loads the setup file. A unit project may need a domain serializer while browser-oriented tests need a DOM-specific one. Global registration everywhere can cause accidental matches and needless startup work.

## Delegate nested values to the provided printer

Returning a hand-built string works for a small scalar domain value. Composite values need indentation, recursion, existing plugins, and reference handling. The serializer receives a printer function plus formatting context. Delegate nested values to that printer instead of calling \`JSON.stringify\`.

\`\`\`ts
// test/serializers/http-exchange.serializer.ts
import type { SnapshotSerializer } from 'vitest';

type HttpExchange = {
  kind: 'HttpExchange';
  request: { method: string; path: string; headers: Record<string, string> };
  response: { status: number; body: unknown };
};

export default {
  test(value) {
    return Boolean(
      value &&
      typeof value === 'object' &&
      (value as { kind?: unknown }).kind === 'HttpExchange',
    );
  },
  serialize(value, config, indentation, depth, refs, printer) {
    const exchange = value as HttpExchange;
    const view = {
      request: {
        method: exchange.request.method,
        path: exchange.request.path,
      },
      response: exchange.response,
    };

    return \`HttpExchange \${printer(
      view,
      config,
      indentation,
      depth,
      refs,
    )}\`;
  },
} satisfies SnapshotSerializer;
\`\`\`

The public view omits headers because request headers often contain user agents, tracing values, cookies, or authorization material. That omission should be a documented test decision. If content negotiation matters, retain a normalized \`accept\` header. If authentication behavior matters, assert the scheme and authorization outcome separately without saving the credential.

The printer preserves established formatting for the response body and lets other serializers handle nested domain values. It also avoids the common \`JSON.stringify\` problems: lost \`undefined\` values, errors on \`BigInt\`, custom \`toJSON\` behavior, poor readability, and circular-reference failures.

Use a wrapper label such as \`HttpExchange\` so snapshots explain why their representation differs from a plain object. That label becomes especially valuable when a failure diff is pasted into a pull request without the surrounding test code.

## Normalize nondeterminism without erasing the contract

A robust pattern is assert, project, then serialize. First assert that unstable values meet their rules. Next project the rich result into fields the test owns. Finally let the serializer normalize presentation. This prevents a redaction token from acting as a free pass.

\`\`\`ts
import { expect, it } from 'vitest';

it('records a successful card authorization', () => {
  const event = createAuthorizationEvent();

  expect(event.id).toMatch(/^[0-9a-f-]+$/i);
  expect(Number.isNaN(Date.parse(event.recordedAt))).toBe(false);
  expect(event.amount.minorUnits).toBe(4_200);

  expect({
    ...event,
    id: '<event-id>',
    recordedAt: '<iso-timestamp>',
  }).toMatchSnapshot();
});
\`\`\`

Here projection in the test may be clearer than a global serializer because only this event scenario needs normalization. A serializer becomes valuable when the same domain representation appears in many suites, nested at different depths, and needs one governed policy.

| Value | Assertion before normalization | Snapshot token | Never discard |
|---|---|---|---|
| Event ID | Required syntax and uniqueness where relevant | \`<event-id>\` | Missing or duplicated ID |
| Timestamp | Parseable and within expected window | \`<iso-timestamp>\` | Wrong ordering or impossible time |
| Trace header | Allowed syntax, propagated when required | \`<trace-id>\` | Lost propagation behavior |
| Temporary file | Exists and uses permitted root | \`<temp-root>/report.json\` | Wrong filename or extension |
| Access token | Never print raw value | \`<redacted>\` | Authentication result and scheme |

What people get wrong is writing a serializer whose \`test\` predicate matches any object containing \`id\` or \`createdAt\`. That broad rule silently changes unrelated snapshots and may capture values owned by another plugin. Match a class, a unique symbol, or an exact discriminator. Structural matching is acceptable only when the discriminator is part of a controlled domain contract.

## Test the serializer as production test infrastructure

A serializer can introduce false negatives, secret exposure, recursion, or unreadable output. Give it focused unit tests. Test both the positive match and nearby values that must not match. Test deterministic output with representative nested data. Avoid asserting only through an external snapshot because a broken update could approve the serializer and expected text together.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { Money } from '../../src/money';
import serializer from './money.serializer';

describe('moneySerializer', () => {
  it('accepts Money and rejects lookalike objects', () => {
    expect(serializer.test(new Money(500, 'INR'))).toBe(true);
    expect(serializer.test({
      kind: 'Money',
      minorUnits: 500,
      currency: 'INR',
    })).toBe(false);
  });

  it('renders exact minor units and currency', () => {
    const output = serializer.serialize(new Money(500, 'INR'));

    expect(output).toBe('Money(INR 500 minor units)');
  });
});
\`\`\`

Calling \`serialize\` directly is reasonable for a serializer that ignores formatting parameters. For a composite serializer, use an integration snapshot too, because recreating the formatting context in a unit test couples the test to internal formatter details. The pair gives fast logic feedback and proof that registration works.

Add a secrecy test when redaction is part of the serializer's purpose:

\`\`\`ts
import { expect, it } from 'vitest';

it('does not persist authorization credentials', () => {
  const secret = 'Bearer test-only-secret';
  const exchange = makeExchange({ authorization: secret });

  expect(exchange).toMatchSnapshot();

  const rendered = formatExchangeForAudit(exchange);
  expect(rendered).not.toContain(secret);
});
\`\`\`

Prefer testing the pure projection function used by the serializer, as shown conceptually with \`formatExchangeForAudit\`, rather than reading snapshot files during the test. A source control secret scanner remains useful defense in depth, but the serializer test catches the issue at its origin.

## Diagnose serializer collisions and missing registration

A realistic failure begins after adding a generic event serializer. Locally, an audit-event snapshot is concise. In CI, the raw object appears and includes changing worker paths. An engineer repeatedly updates the snapshot, producing alternating formats.

Use this sequence:

1. Run the single file with the same Vitest config and project selection as CI.
2. Add a temporary focused assertion that calls the plugin's \`test\` function for the actual value.
3. Confirm the setup file executes, or confirm the configured serializer module resolves from the active root.
4. Search for every \`addSnapshotSerializer\` call and every \`snapshotSerializers\` entry.
5. Narrow competing predicates, especially plugins matching plain objects.
6. Delete the temporary diagnostics, run without update mode, and inspect the resulting diff.

\`\`\`bash
rg "addSnapshotSerializer|snapshotSerializers" .
npx vitest run test/audit-event.test.ts
\`\`\`

If a serializer works alone but not in the suite, registration order or predicate overlap is a strong suspect. If it fails in one project only, inspect that project's configuration and setup files. If output changes only across machines, look for data that bypasses your projection, such as a nested error stack, absolute URL, locale-formatted number, or path separator.

Another failure mode is recursive printing. A serializer matches an object, passes essentially the same object back to \`printer\`, and the formatter selects the serializer again. Project to a plain value that no longer satisfies the plugin predicate. Removing the discriminator or class identity from the projected view is a simple way to guarantee progress.

| Symptom | Likely cause | Diagnostic | Durable fix |
|---|---|---|---|
| Raw value in every snapshot | Serializer not loaded or predicate false | Assert \`test(actual)\` and inspect active config | Fix setup/config scope or predicate |
| Output flips between two formats | Overlapping plugins or inconsistent setup | Search all registrations | Give each plugin a unique domain boundary |
| Stack overflow during snapshot | Printer receives a still-matching value | Log the projected discriminator in a unit test | Print a nonmatching public view |
| CI-only path churn | Absolute paths or different root | Compare the first differing leaf | Normalize only the machine prefix |
| Large unrelated snapshot changes | Predicate is too broad | Test representative negative inputs | Match class, symbol, or exact discriminator |

Do not reach first for global string replacement over the serialized output. A regular expression that replaces every long number or hexadecimal string has no domain awareness. It can hide a changed price, HTTP status, database key, or error code. Normalize before formatting, with typed fields and explicit meaning.

## Keep snapshots reviewable in AI-assisted pull requests

AI agents can generate large snapshot suites quickly. That speed makes serializer governance more important because a low-quality representation multiplies across files. Give the agent a narrow task: add behavioral assertions, use the established serializer, run the test without update mode, explain each intended diff, then update only approved snapshots.

A useful review checklist is concrete:

- Does the serializer retain every field needed to understand the contract?
- Are redacted values validated elsewhere?
- Can the predicate match an unrelated object?
- Does nested printing terminate and use existing serializers?
- Does the snapshot remain stable across time zone, locale, operating system, and worker path?
- Is the resulting diff smaller because noise disappeared, not because behavior disappeared?

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when an agent needs a repeatable snapshot-review workflow. Whether the workflow is human-led or agent-assisted, keep snapshot acceptance as a review decision. A green command only says stored text matches received text.

When UI tests appear near unit snapshots, do not force DOM locator concepts into serializers. Stable selection and stable rendering solve different problems. The [Playwright locator practices guide](/blog/playwright-best-practices-locators-2026) covers selection contracts; a serializer should focus on the value Vitest is asked to compare.

## Roll out a serializer without rewriting the whole suite

Start with one noisy domain type and one owning test directory. Capture current churn over several runs, introduce the narrow serializer, and review the exact snapshot changes. Avoid combining the rollout with product refactoring because reviewers need to distinguish representation changes from behavior changes.

Use a staged plan:

| Stage | Action | Evidence to collect | Stop condition |
|---|---|---|---|
| Baseline | Run target snapshots twice in clean environments | Files and lines that change | Nondeterminism is reproducible |
| Contract | List fields kept, normalized, and excluded | Reviewer-approved representation | Every omission has a reason |
| Prototype | Register in one test scope | Serializer unit tests and one integration diff | Predicate and output are stable |
| Expansion | Move to shared setup or config | Passing targeted directory | No unrelated snapshot changes |
| CI gate | Run without update mode | Clean fresh-checkout result | Same output across supported runners |

Commit the serializer, its tests, and updated snapshots together only after reviewing the before-and-after representation. In the pull request description, name the normalized fields and the assertions that continue to protect them. That note prevents a later maintainer from assuming the tokens are arbitrary decoration.

If dozens of snapshots change unexpectedly, revert the rollout change in your branch, narrow the predicate, and repeat. Do not approve bulk changes because the new output looks cleaner. The count itself is evidence that the match boundary may be wider than intended.

Snapshot formatting options and serializers are different tools. Formatting controls general presentation such as indentation or other supported pretty-format choices. A serializer extends how a particular value is represented. Do not attempt to inject plugins through snapshot formatting options. Keep domain plugins in the supported serializer registration paths.

## Frequently Asked Questions

### Should a Vitest snapshot serializer remove every dynamic field?

No. Remove or normalize only fields whose exact value is irrelevant to the behavior under test. Before replacing an ID, timestamp, path, or token, assert the invariant that matters, such as syntax, ordering, location, or secrecy. Retain meaningful status codes, amounts, names, and decision outputs. The strongest pattern is assert first, then serialize a public view. Blanket removal produces stable snapshots but weak tests because genuine regressions can disappear with the noise.

### When should I use snapshotSerializers instead of a setup file?

Use \`snapshotSerializers\` when the modules are a declarative, suite-wide part of the Vitest configuration. Use \`expect.addSnapshotSerializer\` in a setup file when serializer registration belongs beside custom matchers and hooks, or when projects load different test policies. Both are documented paths. Avoid registering the same plugin twice, and verify the active project includes the chosen setup or configuration. For a one-suite experiment, local registration can be clearer until the representation proves broadly useful.

### Why does my custom serializer cause infinite recursion?

The usual cause is passing a value back to the supplied printer that still satisfies the same serializer's \`test\` predicate. The formatter chooses the plugin again, repeats serialization, and eventually overflows. Build a plain public view that no longer has the matching class identity, symbol, or discriminator, then pass that view to the printer. Add a focused integration test with a nested instance so recursion is caught before the serializer is registered across the entire suite.

### How should an AI coding agent update snapshots after adding a serializer?

Have the agent run a focused test without update mode first, categorize every diff, and report which fields were normalized. It should also run serializer unit tests, negative predicate cases, and at least one clean-environment check. Only then should it update the approved snapshots and rerun the suite without update mode. Do not authorize an unreviewed repository-wide snapshot refresh. The agent's useful contribution is repeatable diagnosis and evidence, while acceptance remains tied to the product contract.
`,
};
