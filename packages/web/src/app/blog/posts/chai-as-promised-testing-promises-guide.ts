import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'chai-as-promised: Testing Promises with Chai',
  description: 'Master chai-as-promised testing promises with readable fulfillment, rejection, and eventually assertions that catch false positives in async QA suites.',
  date: '2026-07-18',
  category: 'Guide',
  content: `
# chai-as-promised: Testing Promises with Chai

Promise tests are easiest to trust when the assertion reads like the contract: this operation must fulfill with a value, or this invalid request must reject with a specific error. Chai-as-promised adds that vocabulary to Chai. It does not make asynchronous work synchronous, and it does not remove the need to give Mocha a promise to wait for. Its value is a precise, reviewable assertion layer over promise settlement.

This article builds a small API-client test suite around \`eventually\`, \`fulfilled\`, \`rejected\`, and \`rejectedWith\`. For a wider view of runners and assertion libraries, consult the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026). If suite setup or basic Chai syntax is unfamiliar, the [Mocha and Chai guide](/blog/mocha-chai-testing-guide) supplies that foundation.

## Install and register the plugin once

Install Mocha, Chai, and chai-as-promised in the project that owns the tests. TypeScript execution also needs the project's chosen compiler or loader, but that choice is independent of the plugin.

\`\`\`bash
npm install --save-dev mocha chai chai-as-promised
\`\`\`

Register chai-as-promised before tests use its properties. In an ESM setup, a shared test bootstrap module can import the Chai namespace, load the plugin, and call \`use\`.

\`\`\`ts
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

export const expect = chai.expect;
\`\`\`

Tests can import \`expect\` from that bootstrap module. A project may instead load a setup file through its established Mocha configuration. The important property is ordering: registration happens before the first promise assertion, and it happens in a predictable place rather than being repeated in individual specs.

| Setup decision | Recommended practice | Test-suite benefit |
|---|---|---|
| Plugin registration | Centralize it in test bootstrap | Every spec has the same assertion language |
| Assertion import | Re-export the configured \`expect\` | Prevents accidental use of unconfigured Chai |
| Module syntax | Match the repository's ESM or CommonJS setup | Avoids loader errors unrelated to assertions |
| Dependency scope | Keep test libraries in development dependencies | Production bundles do not need test tooling |

If an AI coding agent generates a spec, point it at the shared bootstrap file. This stops the agent from adding a second Chai instance or inventing per-file setup. Ready-made QA skills can also be installed from qaskills.sh with the qaskills CLI when you want a reusable testing workflow rather than another copied prompt.

## Model a promise API with stable contracts

Useful examples need more than \`Promise.resolve(42)\`. Consider a checkout client that validates input, calls a transport, and returns the receipt from a successful response. It throws a domain error before transport for an invalid amount and propagates transport failures.

\`\`\`ts
export class InvalidAmountError extends Error {}

type Receipt = { paymentId: string; status: 'accepted' };
type Transport = (request: {
  path: string;
  body: { amount: number };
}) => Promise<{ receipt: Receipt }>;

export async function submitPayment(
  amount: number,
  transport: Transport
): Promise<Receipt> {
  if (amount <= 0) {
    throw new InvalidAmountError('amount must be positive');
  }

  const response = await transport({
    path: '/payments',
    body: { amount },
  });
  return response.receipt;
}
\`\`\`

There are three independent contracts to cover: fulfillment shape, validation rejection, and infrastructure rejection. Keeping those cases separate gives failures a clear diagnostic meaning. One oversized test that tries several amounts and errors often obscures which settlement behavior changed.

## Assert fulfillment and the eventual value

The \`fulfilled\` assertion checks settlement only. Use it when the fact of successful completion is itself the contract, for example a void-returning cache refresh. When the result matters, \`eventually\` transfers the eventual fulfillment value into ordinary Chai assertions.

\`\`\`ts
import { expect } from './test-bootstrap';
import { submitPayment } from '../src/submit-payment';

describe('submitPayment fulfillment', () => {
  it('fulfills with the accepted receipt', async () => {
    const transport = async () => ({
      receipt: { paymentId: 'pay_104', status: 'accepted' as const },
    });

    await expect(submitPayment(2500, transport)).to.eventually.deep.equal({
      paymentId: 'pay_104',
      status: 'accepted',
    });
  });
});
\`\`\`

Await the assertion itself. Chai-as-promised produces a promise-aware assertion, so dropping \`await\` recreates the classic false-pass risk. An alternative is to return the assertion from a non-async Mocha test.

\`\`\`ts
it('completes a cache refresh', () => {
  const refresh = () => Promise.resolve();

  return expect(refresh()).to.be.fulfilled;
});
\`\`\`

Choose assertions that expose business meaning. \`eventually.have.property('status', 'accepted')\` is more useful than fulfillment alone for a payment workflow, while deep equality is appropriate when the exact response object is a supported contract. Avoid asserting incidental fields such as generated timestamps unless the test controls them.

| Intent | Assertion form | What a failure tells the reviewer |
|---|---|---|
| Any successful settlement | \`await expect(promise).to.be.fulfilled\` | The operation rejected |
| Exact resolved object | \`await expect(promise).to.eventually.deep.equal(expected)\` | Settlement or response shape changed |
| One resolved field | \`await expect(promise).to.eventually.have.property(name, value)\` | Required output field is missing or wrong |
| Resolved collection size | \`await expect(promise).to.eventually.have.lengthOf(count)\` | Returned collection cardinality changed |

## Specify rejection type and message deliberately

The \`rejected\` assertion proves only that a promise rejects. \`rejectedWith\` can narrow the expectation to an error constructor and message. Prefer the strongest stable contract. A domain error class and a durable message are good candidates; a full upstream stack trace is not.

\`\`\`ts
import { InvalidAmountError, submitPayment } from '../src/submit-payment';

it('rejects a zero amount with a domain error', async () => {
  let transportCalls = 0;
  const transport = async () => {
    transportCalls += 1;
    throw new Error('transport should not run');
  };

  await expect(submitPayment(0, transport)).to.be.rejectedWith(
    InvalidAmountError,
    'amount must be positive'
  );
  expect(transportCalls).to.equal(0);
});
\`\`\`

Notice the second oracle. The rejection is necessary, but the absence of a transport call proves validation happened at the correct layer. Without it, an implementation could send an invalid payment, receive an unrelated failure, and still satisfy a broad rejection assertion.

For an infrastructure failure, identity may matter because the client promises to propagate the original error:

\`\`\`ts
it('propagates the transport failure', async () => {
  const networkError = new Error('connection reset');
  const transport = async () => Promise.reject(networkError);

  const assertion = expect(submitPayment(900, transport)).to.be.rejected;
  await assertion;

  await expect(submitPayment(900, transport)).to.be.rejectedWith(
    Error,
    'connection reset'
  );
});
\`\`\`

In production tests, avoid invoking an operation twice merely to make two assertion styles. The example contrasts the styles. If duplicate execution has side effects, make one assertion that captures the supported contract, or catch the rejection once and inspect the error object with standard Chai assertions.

## Combine eventual assertions with interaction evidence

Promise matchers describe the output channel. They do not automatically prove that the dependency received the right request or that no extra call occurred. Capture arguments in a fake transport, then assert them after the promise assertion settles.

\`\`\`ts
it('posts the amount to the payments endpoint', async () => {
  const requests: Array<{ path: string; body: { amount: number } }> = [];
  const transport = async (request: {
    path: string;
    body: { amount: number };
  }) => {
    requests.push(request);
    return {
      receipt: { paymentId: 'pay_205', status: 'accepted' as const },
    };
  };

  await expect(submitPayment(1750, transport)).to.eventually.include({
    status: 'accepted',
  });
  expect(requests).to.deep.equal([
    { path: '/payments', body: { amount: 1750 } },
  ]);
});
\`\`\`

This pattern is valuable for agent-generated tests. Ask the agent to identify both the settlement oracle and the interaction oracle. Then review whether the interaction is publicly observable behavior or implementation trivia. Endpoint and request body usually belong to an adapter contract; the number of internal helper calls often does not.

## Test concurrency without losing failed assertions

Batch workflows introduce two levels of promises: each operation and the aggregate. Decide whether the product contract is all-or-nothing or partial success. \`Promise.all\` rejects when an input rejects, while \`Promise.allSettled\` fulfills with a status record for every input. Test the primitive the implementation actually promises.

\`\`\`ts
it('rejects the batch when one payment fails', async () => {
  const good = Promise.resolve({ paymentId: 'p1', status: 'accepted' });
  const bad = Promise.reject(new Error('issuer unavailable'));

  await expect(Promise.all([good, bad])).to.be.rejectedWith(
    'issuer unavailable'
  );
});

it('reports both outcomes for an all-settled batch', async () => {
  const results = Promise.allSettled([
    Promise.resolve('accepted'),
    Promise.reject(new Error('declined')),
  ]);

  await expect(results).to.eventually.satisfy(
    (items: PromiseSettledResult<string>[]) =>
      items[0].status === 'fulfilled' && items[1].status === 'rejected'
  );
});
\`\`\`

Do not create several promise assertions inside \`forEach\` and assume Mocha tracks them. Build an array and await \`Promise.all\`, or use a sequential loop. An assertion library cannot compensate for promises that the test runner never receives.

## Troubleshoot assertion chains that do not run

When a chai-as-promised test behaves strangely, separate plugin wiring from promise behavior.

| Observation | Probable issue | Repair |
|---|---|---|
| \`eventually\` is unknown | Plugin was not registered on the Chai instance in use | Import the configured bootstrap assertion |
| Test passes before rejection appears | Promise assertion was neither awaited nor returned | Await or return the complete chain |
| \`rejectedWith\` fails on text | Message is transformed or unstable | Assert the documented error type or stable fragment |
| Test hangs | System promise never settles | Inspect unresolved fakes, callbacks, and timers |
| Type checking lacks plugin properties | Type declarations are not visible to the test compilation | Check dependency installation and test tsconfig scope |

Run the smallest relevant spec and grep by its title while diagnosing. These are documented Mocha CLI behaviors and keep noise low.

\`\`\`bash
npx mocha "test/submit-payment.spec.ts"
npx mocha "test/submit-payment.spec.ts" --grep "rejects a zero amount"
\`\`\`

Read a green promise test skeptically. It should be possible to point at the awaited or returned assertion, explain what fulfillment or rejection contract it proves, and identify any interaction evidence needed to rule out the wrong failure source.

## Frequently Asked Questions

### Does chai-as-promised replace async and await?

No. It extends Chai with assertions that understand thenables, while async and await control how the test waits for asynchronous work. A common pattern is \`await expect(operation()).to.eventually.equal(value)\`. You can instead return that assertion chain from a non-async Mocha test. In both forms, Mocha must receive the assertion's promise so a late failure is attached to the correct test.

### When should I use fulfilled instead of eventually?

Use \`fulfilled\` when successful settlement is the complete requirement, such as a command that intentionally resolves without a value. Use \`eventually\` when the fulfillment value carries a contract worth checking, including a receipt, collection, status, or transformed model. For most query and API-client tests, validating the value provides stronger regression protection than confirming that the operation merely avoided rejection.

### Can rejectedWith verify a custom error class?

Yes, pass the custom error constructor and, when stable, the expected message. This distinguishes a deliberate domain rejection from an accidental TypeError or transport failure. Also assert relevant side effects, such as proving the transport was not called after local validation failed. Avoid coupling to stack traces or volatile upstream wording because those details make tests brittle without strengthening the user-facing contract.

### Why did an eventually assertion pass after I removed await?

The test likely ended before the promise-aware assertion settled. If the underlying promise fulfilled as expected, the detached assertion produced no visible problem; if it later failed, it could appear as an unhandled rejection outside the test. Restore \`await\` or return the entire assertion chain. Then deliberately break the expected value once to confirm that the spec fails for the intended reason.
`,
};
