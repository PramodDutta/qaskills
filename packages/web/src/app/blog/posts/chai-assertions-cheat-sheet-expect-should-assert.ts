import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Chai Assertions Cheat Sheet: expect, should, and assert',
  description: 'Use this Chai assertions cheat sheet to choose expect, should, or assert, test async failures, inspect objects, and write clearer JavaScript tests.',
  date: '2026-07-18',
  category: 'Reference',
  content: `
# Chai Assertions Cheat Sheet: expect, should, and assert

Chai gives JavaScript test suites three assertion styles over the same core behavior: \`expect\`, \`should\`, and \`assert\`. The useful question is not which style is fashionable. It is which expression makes a failed test explain the contract with the least ambiguity.

This reference uses realistic API, UI-support, and data-validation examples. Every snippet can sit inside a Mocha test after installing \`chai\`. If you are still selecting a runner, read the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026). For a complete runner setup, hooks, and suite structure, pair this sheet with the [Mocha and Chai testing guide](/blog/mocha-chai-testing-guide).

## Choose an assertion style before the suite chooses for you

All three interfaces ultimately express pass or fail, but they optimize different reading patterns.

| Style | Typical form | Strongest fit | Main caution |
|---|---|---|---|
| expect | \`expect(actual).to.equal(expected)\` | Behavior-focused tests and fluent chains | A very long chain can hide the important comparison |
| should | \`actual.should.equal(expected)\` | Teams that prefer sentence-like assertions | It extends \`Object.prototype\` and cannot start naturally from \`null\` or \`undefined\` |
| assert | \`assert.equal(actual, expected)\` | Compact checks and engineers familiar with xUnit APIs | Argument order varies by method, so review expected versus actual carefully |

Use one primary style per repository. Mixing styles inside a single test makes scanning harder, especially when an AI coding agent adds assertions from a different convention. A repository instruction such as “use Chai expect, include a failure message on business-critical values” gives both humans and agents a stable pattern.

\`\`\`ts
import { expect, assert, should } from 'chai';

should();

describe('checkout summary', () => {
  const summary = { itemCount: 2, currency: 'INR', total: 1498 };

  it('supports all three interfaces', () => {
    expect(summary.total).to.equal(1498);
    summary.currency.should.equal('INR');
    assert.strictEqual(summary.itemCount, 2);
  });
});
\`\`\`

## Equality: decide whether identity or structure is the contract

The most common Chai mistake is using \`equal\` for objects. \`equal\` uses strict equality, so two separately created objects with the same fields are not equal. Use \`deep.equal\` when the object or array structure is the intended contract.

| Intent | expect or should chain | assert equivalent |
|---|---|---|
| Strict primitive or reference equality | \`.equal(value)\` | \`assert.strictEqual(actual, value)\` |
| Recursive object or array equality | \`.deep.equal(value)\` | \`assert.deepEqual(actual, value)\` |
| Deliberately non-strict equality | \`.eql(value)\` for deep equality, not coercion | \`assert.equal(actual, value)\` performs non-strict equality |
| Inequality | \`.not.equal(value)\` | \`assert.notStrictEqual(actual, value)\` |

\`\`\`ts
import { expect } from 'chai';

it('maps a service response into a stable view model', () => {
  const actual = { id: 'ORD-41', lines: [{ sku: 'BOOK', quantity: 2 }] };

  expect(actual).to.deep.equal({
    id: 'ORD-41',
    lines: [{ sku: 'BOOK', quantity: 2 }],
  });
  expect(actual.lines).to.have.lengthOf(1);
});
\`\`\`

Deep equality is excellent for small, stable value objects. It is brittle for entire HTTP responses containing timestamps, request IDs, or optional fields. In that case, assert the schema-relevant pieces instead of deleting useful fields from production code to satisfy a test.

## Objects and arrays: assert the boundary, not incidental representation

Chai property and membership assertions let a test describe just the boundary it owns. \`include\` checks array membership or an object subset. \`members\` checks array members without requiring the same order, while \`ordered.members\` makes order significant. \`keys\` can verify exact or included key sets depending on the chain.

\`\`\`ts
import { expect } from 'chai';

it('returns an accessible user search result', () => {
  const result = {
    id: 'u-17',
    displayName: 'Mina Shah',
    roles: ['editor', 'reviewer'],
    metadata: { source: 'directory', refreshedAt: '2026-07-18T08:00:00Z' },
  };

  expect(result).to.include({ id: 'u-17', displayName: 'Mina Shah' });
  expect(result).to.have.property('roles').that.includes('reviewer');
  expect(result.roles).to.have.members(['reviewer', 'editor']);
  expect(result.metadata).to.have.all.keys('source', 'refreshedAt');
});
\`\`\`

For arrays of objects, \`deep.include\` is usually clearer than mapping to JSON strings. If duplicates matter, add a length check because membership alone may not communicate cardinality. For a paginated API, assert the returned IDs, count, and ordering separately so a failure says whether selection, pagination, or sorting broke.

## Types, presence, and numeric ranges

Type assertions catch adapter errors before downstream assertions produce confusing messages. Chai's \`a\` and \`an\` language chains accept standard JavaScript type names. Presence needs more care: \`exist\` rejects both \`null\` and \`undefined\`, while \`undefined\`, \`null\`, \`true\`, and \`false\` target exact values.

| QA contract | Recommended assertion | What it prevents |
|---|---|---|
| Generated identifier exists | \`expect(id).to.exist\` | Accepting missing values before later API calls |
| Flag is truly boolean | \`expect(enabled).to.be.a('boolean')\` | Strings such as \`"false"\` passing truthiness checks |
| Latency meets an SLO | \`expect(ms).to.be.lessThan(500)\` | A broad equality assertion on variable timing |
| Retry count is bounded | \`expect(count).to.be.within(1, 3)\` | Infinite or unexpectedly eager retries |
| Text follows a stable pattern | \`expect(code).to.match(/^QA-\\d{4}$/)\` | Overfitting to one generated value |

\`\`\`ts
it('records a bounded retry after rate limiting', async () => {
  const audit = await runRateLimitedRequest();

  expect(audit.requestId).to.be.a('string').and.not.empty;
  expect(audit.retryCount).to.be.within(1, 3);
  expect(audit.elapsedMs).to.be.greaterThan(0);
  expect(audit.recovered).to.be.true;
  expect(audit.error).to.be.undefined;
});
\`\`\`

Avoid \`expect(value).to.be.ok\` when the difference between zero, an empty string, \`null\`, and \`false\` matters. “Truthy” is a JavaScript implementation detail, not usually a business requirement.

## Exceptions and rejected promises need different handling

\`throw\` inspects a function. Passing the result of a function calls it before Chai can observe the exception. Wrap synchronous work in a function, then match the error type or message. Do not assert an entire volatile message if a stable fragment or error class expresses the contract.

\`\`\`ts
import { expect } from 'chai';

function parseQuantity(raw: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError('quantity must be a positive integer');
  }
  return value;
}

it('rejects a fractional quantity', () => {
  expect(() => parseQuantity('1.5'))
    .to.throw(RangeError, 'positive integer');
});
\`\`\`

Core Chai does not turn a promise rejection into a \`throw\` assertion. Without a promise assertion plugin, use \`try/catch\` and ensure the success path cannot silently pass. This explicit pattern is portable and makes the caught value available for detailed checks.

\`\`\`ts
it('rejects an expired session', async () => {
  let caught: unknown;

  try {
    await authenticate({ token: expiredToken });
  } catch (error) {
    caught = error;
  }

  expect(caught).to.be.instanceOf(AuthenticationError);
  expect(caught).to.have.property('code', 'TOKEN_EXPIRED');
});
\`\`\`

An alternative is Node's promise rejection assertion from \`node:assert/strict\`, but do not mix it casually into a Chai-style suite. If your project adopts a Chai plugin for promise assertions, document the plugin initialization in the shared test bootstrap so local runs and CI load the same behavior.

## Strings, regular expressions, and diagnostic messages

Use \`include\` for a stable substring and \`match\` for a genuine format. Regex anchors matter. \`/QA-\\d+/\` accepts extra text, while \`/^QA-\\d+$/\` requires the whole string to conform. When AI generates a regex, review escaping and add negative examples alongside the happy path.

Custom assertion messages help when data-driven cases otherwise look identical. With \`expect\`, pass a message as the second argument to \`expect\`. With the assert interface, many methods accept a final message parameter.

\`\`\`ts
for (const sample of [
  { locale: 'en-IN', text: 'Payment declined', fragment: 'declined' },
  { locale: 'fr-FR', text: 'Paiement refusé', fragment: 'refusé' },
]) {
  it(\`shows the decline reason for \${sample.locale}\`, () => {
    expect(
      sample.text,
      \`rendered message for \${sample.locale}\`,
    ).to.include(sample.fragment);
  });
}
\`\`\`

Notice that the source file must preserve JavaScript interpolation if this example is copied. Inside this article module, interpolation markers are escaped so the blog template remains literal.

## Negation, chaining, and failure quality

Negation is valuable when the forbidden outcome is the contract, such as ensuring a response does not expose \`passwordHash\`. It becomes weak when it leaves many incorrect values acceptable. \`expect(status).not.to.equal(500)\` still permits 404, 401, or 302. Prefer \`expect(status).to.equal(200)\` when the correct outcome is known.

Chaining can combine closely related facts, but one assertion per concept often diagnoses failures better. If a chain checks type, length, content, and order, the first failure may conceal the actual regression. Split checks at system boundaries and keep compact chains for local invariants such as “a non-empty string.”

When reviewing agent-generated tests, ask three questions:

1. Could an obviously wrong value still pass?
2. Does the assertion verify observable behavior rather than a private implementation detail?
3. Would the failure message identify the broken contract without rerunning locally?

That review catches tautologies such as comparing a value to itself, assertions calculated with the same production helper, and snapshots so broad that reviewers stop reading them.

## A compact migration map between interfaces

| Contract | expect | should | assert |
|---|---|---|---|
| Exact status | \`expect(status).to.equal(201)\` | \`status.should.equal(201)\` | \`assert.strictEqual(status, 201)\` |
| Deep body match | \`expect(body).to.deep.equal(expected)\` | \`body.should.deep.equal(expected)\` | \`assert.deepEqual(body, expected)\` |
| Contains role | \`expect(roles).to.include('admin')\` | \`roles.should.include('admin')\` | \`assert.include(roles, 'admin')\` |
| Error type | \`expect(fn).to.throw(TypeError)\` | \`fn.should.throw(TypeError)\` | \`assert.throws(fn, TypeError)\` |
| Numeric ceiling | \`expect(ms).to.be.at.most(500)\` | \`ms.should.be.at.most(500)\` | \`assert.isAtMost(ms, 500)\` |

Mechanical migration is possible, but preserve semantics. In particular, distinguish strict equality from non-strict \`assert.equal\`, and do not convert a deep comparison into reference equality. Run the smallest affected suite after each batch, inspect at least one intentional failure, and let the failure output confirm that expected and actual values are oriented correctly.

## Frequently Asked Questions

### Should a new Chai suite use expect, should, or assert?

Use \`expect\` unless your team already has a consistent convention. It reads naturally, handles \`null\` and \`undefined\` without the receiver problem of \`should\`, and makes strict versus deep equality visible in the chain. The larger quality gain comes from consistency: configure examples, contributor guidance, and AI-agent instructions around one style, then allow exceptions only when another interface materially improves clarity.

### Why does equal fail for two objects that look identical?

\`equal\` checks strict identity. Two object literals occupy different references even when every property matches. Use \`deep.equal\` or \`assert.deepEqual\` when recursive values are the contract. Before switching, confirm that structural equality is truly intended. If code is supposed to return the same cached object instance, strict equality is the correct assertion and the failure is useful.

### How should I assert a promise rejection without adding a plugin?

Await the operation inside \`try/catch\`, store the caught error, and assert its type plus a stable property such as an application error code. Ensure the test fails when no rejection occurs, which the stored-error assertion naturally does. This is more verbose than plugin syntax but requires no Chai extension and allows precise inspection of custom error fields, nested causes, or safe message fragments.

### Are deep assertions safe for complete API responses?

They are safe but often too broad. Full responses commonly include generated IDs, timestamps, feature-dependent fields, and ordering that the test does not own. A deep assertion then turns harmless evolution into noise. Prefer a deep comparison for stable nested contracts, plus focused property, membership, and type assertions for variable regions. Keep a separate schema or contract test when the complete response shape itself is the behavior under test.
`,
};
