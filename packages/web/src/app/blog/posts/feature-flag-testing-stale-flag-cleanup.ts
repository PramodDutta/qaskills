import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Feature Flag Testing Stale Flag Cleanup: A Safe Retirement Workflow',
  description: 'Use feature flag testing stale flag cleanup workflows to prove both branches, find dead configuration, and remove old flags without production regressions.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Feature Flag Testing Stale Flag Cleanup: A Safe Retirement Workflow

Feature flag testing stale flag cleanup works when a team treats a flag as a temporary state machine, not a permanent Boolean. Test the enabled branch, disabled branch, targeting boundaries, fallback behavior, and the eventual one-way transition to ordinary code. Then collect evidence that the losing branch is unused before deleting the flag, its configuration, and its tests in a deliberate sequence.

The practical payoff is smaller production code and fewer invisible release combinations. A flag that remains after rollout doubles paths around an important decision, can behave differently when a provider is unavailable, and makes every later refactor harder to reason about. Cleanup is therefore part of delivering the feature, not optional gardening after delivery.

This guide builds a runnable TypeScript example around a checkout flag, adds unit and Playwright coverage, defines evidence for retirement, and shows how to diagnose a cleanup regression. The same control loop applies whether flags come from a hosted service, an open-source provider, environment configuration, or an internal rules engine.

## Model a flag as a lifecycle with an owner

A useful flag record describes intent and removal, not only its key and current value. Before writing tests, classify the flag. A release flag should normally converge to one branch. An operational kill switch may remain long-lived, but it needs periodic drills. An experiment needs analysis and a decision. A permission flag is usually entitlement logic and should not be disguised as temporary rollout state.

| Flag class | Intended lifetime | Required test focus | Retirement signal |
|---|---:|---|---|
| Release | Days or a few releases | Both branches, cohort targeting, fallback | Chosen branch is stable at full rollout |
| Experiment | Fixed analysis window | Assignment, exposure logging, metric integrity | Decision recorded and experiment stopped |
| Operational | Long-lived with reviews | Safe default, emergency response, recovery | Capability replaced or risk no longer exists |
| Migration | Until data or traffic moves | Old path, new path, mixed state, rollback | Old representation or dependency reaches zero |
| Entitlement | Product lifetime | Account rules, authorization boundaries | Product policy changes, not rollout completion |

Store an owner, creation date, expected removal date, and cleanup issue with each temporary flag. Those fields can live in the provider, a repository manifest, or both. The repository record is valuable because reviewers and AI coding agents can see it beside the code that consumes the flag.

Here is a small manifest whose schema is simple enough to validate in CI:

\`\`\`json
{
  "flags": [
    {
      "key": "checkout.address-v2",
      "kind": "release",
      "owner": "checkout-team",
      "createdOn": "2026-07-10",
      "removeBy": "2026-08-21",
      "cleanupIssue": "CHK-842",
      "safeFallback": false
    }
  ]
}
\`\`\`

Do not turn the removal date into an automatic deletion date. It is a review trigger. Automated code can open or fail a governance check, but production evidence and ownership determine whether removal is safe.

## Put evaluation behind one typed boundary

Scattered SDK calls create scattered fallback rules. Wrap evaluation in a small interface and keep business code unaware of provider details. This creates one seam for deterministic tests and one place to record evaluation reasons or failures.

\`\`\`ts
export type EvaluationContext = {
  userId: string;
  accountId: string;
  country?: string;
};

export interface FlagReader {
  booleanValue(
    key: string,
    defaultValue: boolean,
    context: EvaluationContext,
  ): Promise<boolean>;
}

export async function checkoutVariant(
  flags: FlagReader,
  context: EvaluationContext,
): Promise<'legacy' | 'address-v2'> {
  const enabled = await flags.booleanValue(
    'checkout.address-v2',
    false,
    context,
  );

  return enabled ? 'address-v2' : 'legacy';
}
\`\`\`

The default is an engineering decision. In this example, provider failure returns the already-proven legacy checkout. A flag protecting a security correction might need the opposite default. Record the rationale in the flag manifest and test it. Never copy a provider dashboard's current value into code and assume it is a universally safe fallback.

OpenFeature defines a vendor-neutral feature flagging API at https://openfeature.dev/docs/. If you use it, keep tests at your wrapper boundary unless you specifically need to verify provider integration. The business test should say which variant is expected for a context, not reconstruct a vendor client's internals.

## Build the branch matrix before writing examples

The first testing artifact should be a decision table. It prevents the usual happy-path bias and makes missing states obvious. For a gradual account rollout, consider configuration value, targeting match, context quality, and provider health separately.

| Configuration and context | Provider result | Expected UI | Expected side effect |
|---|---|---|---|
| Flag off globally | false | Legacy address form | Legacy validation request |
| Flag on, account targeted | true | New structured address form | V2 validation request |
| Flag on, account not targeted | false | Legacy address form | Legacy validation request |
| Context missing account ID | fallback false | Legacy form plus diagnostic | No V2 request |
| Provider timeout | fallback false | Legacy form | Evaluation error counted |
| Cached true during brief outage | Policy-dependent | Explicitly documented branch | Staleness age recorded |

Add domain boundaries beneath this table. Does the new form accept every country supported by the old form? What happens to a cart started under one variant and completed under another? Can a user open two tabs with different cached assignments? Those are feature risks, not flag SDK risks, and they deserve scenario tests.

## Unit test every decision without a network provider

A map-backed reader makes branch tests fast and explicit. It also records calls so the test can verify the exact key, default, and targeting context.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import {
  checkoutVariant,
  type EvaluationContext,
  type FlagReader,
} from './checkout-variant';

class StubFlags implements FlagReader {
  readonly calls: Array<{
    key: string;
    defaultValue: boolean;
    context: EvaluationContext;
  }> = [];

  constructor(private readonly values: Record<string, boolean>) {}

  async booleanValue(
    key: string,
    defaultValue: boolean,
    context: EvaluationContext,
  ): Promise<boolean> {
    this.calls.push({ key, defaultValue, context });
    return this.values[key] ?? defaultValue;
  }
}

describe('checkoutVariant', () => {
  const context = { userId: 'user-7', accountId: 'account-42' };

  it.each([
    [true, 'address-v2'],
    [false, 'legacy'],
  ] as const)('maps %s to %s', async (value, expected) => {
    const flags = new StubFlags({ 'checkout.address-v2': value });

    await expect(checkoutVariant(flags, context)).resolves.toBe(expected);
    expect(flags.calls).toEqual([
      {
        key: 'checkout.address-v2',
        defaultValue: false,
        context,
      },
    ]);
  });

  it('uses the safe fallback when no value exists', async () => {
    const flags = new StubFlags({});
    await expect(checkoutVariant(flags, context)).resolves.toBe('legacy');
  });
});
\`\`\`

Vitest documents test-name filtering with \`-t\` and \`--testNamePattern\` at https://vitest.dev/guide/filtering. During diagnosis, run the file and a full test name together, for example \`vitest checkout-variant.test.ts -t "uses the safe fallback"\`. A name filter alone still requires test discovery across candidate files, so the file filter keeps feedback focused.

Provider failure deserves its own adapter test. Decide whether the wrapper returns the caller's default, uses a last-known value, or propagates an error. Do not write a unit test that says merely "SDK was called." Assert the observable policy.

\`\`\`ts
import { expect, it, vi } from 'vitest';
import type { EvaluationContext, FlagReader } from './checkout-variant';

class ResilientFlags implements FlagReader {
  constructor(
    private readonly evaluate: (
      key: string,
      context: EvaluationContext,
    ) => Promise<boolean>,
  ) {}

  async booleanValue(
    key: string,
    defaultValue: boolean,
    context: EvaluationContext,
  ): Promise<boolean> {
    try {
      return await this.evaluate(key, context);
    } catch {
      return defaultValue;
    }
  }
}

it('returns the caller default when evaluation fails', async () => {
  const evaluate = vi.fn().mockRejectedValue(new Error('provider unavailable'));
  const flags = new ResilientFlags(evaluate);
  const context = { userId: 'user-7', accountId: 'account-42' };

  await expect(
    flags.booleanValue('checkout.address-v2', false, context),
  ).resolves.toBe(false);
  expect(evaluate).toHaveBeenCalledWith('checkout.address-v2', context);
});
\`\`\`

This test is deliberately small. Retries, caching, and timeouts should be tested only if the adapter actually implements them. Making up resilience behavior in tests creates a reassuring specification for code that does not exist.

## Verify targeting as data, not a collection of screenshots

Percentage rollout is deterministic only if assignment inputs and hashing remain stable. Test your own targeting code if you own it. When the provider owns targeting, use provider integration tests against a dedicated project or local provider and assert a fixed set of contexts. Do not infer a user's bucket from a guessed hashing algorithm.

For repository-owned rules, represent cases as fixtures:

\`\`\`ts
import { describe, expect, it } from 'vitest';

type Rule = {
  allowedAccounts: string[];
  blockedCountries: string[];
};

function isAddressV2Enabled(
  rule: Rule,
  context: { accountId: string; country?: string },
): boolean {
  if (context.country && rule.blockedCountries.includes(context.country)) {
    return false;
  }
  return rule.allowedAccounts.includes(context.accountId);
}

describe('address v2 targeting', () => {
  const rule: Rule = {
    allowedAccounts: ['account-42', 'account-84'],
    blockedCountries: ['AQ'],
  };

  it.each([
    [{ accountId: 'account-42', country: 'IN' }, true],
    [{ accountId: 'account-42', country: 'AQ' }, false],
    [{ accountId: 'account-9', country: 'IN' }, false],
    [{ accountId: 'account-9' }, false],
  ])('evaluates %o as %s', (context, expected) => {
    expect(isAddressV2Enabled(rule, context)).toBe(expected);
  });
});
\`\`\`

Use synthetic account and user identifiers. Real customer identifiers in fixtures create privacy risk and make test data harder to share. Include boundary contexts, missing optional fields, invalid values, and rule precedence. If the provider supports segments, prerequisites, or multivariate values, expand the table around documented semantics rather than assuming every provider resolves conflicts the same way.

## Run one end-to-end journey per meaningful branch

Unit tests prove decisions, but a page can ignore the result, render both variants, or send the wrong API request. Keep a narrow end-to-end check for each branch. Supply deterministic flag state through a supported test seam, such as a test-only bootstrap endpoint available only in the test environment, a local provider, or server startup configuration.

The following Playwright example assumes the test environment accepts an explicit header and the application maps it to flag state. The route implementation is part of the test environment contract, not a Playwright feature.

\`\`\`ts
import { expect, test } from '@playwright/test';

test.describe('checkout address flag', () => {
  for (const scenario of [
    { header: 'enabled', heading: 'Delivery address', endpoint: '/address/v2' },
    { header: 'disabled', heading: 'Shipping details', endpoint: '/address/legacy' },
  ]) {
    test(\`renders \${scenario.header} branch\`, async ({ browser }) => {
      const context = await browser.newContext({
        extraHTTPHeaders: { 'x-test-address-v2': scenario.header },
      });
      const page = await context.newPage();
      const requestPromise = page.waitForRequest((request) =>
        request.url().includes(scenario.endpoint),
      );

      await page.goto('/checkout');
      await expect(
        page.getByRole('heading', { name: scenario.heading }),
      ).toBeVisible();
      await page.getByLabel('Postal code').fill('560001');
      await page.getByRole('button', { name: 'Continue' }).click();

      await requestPromise;
      await context.close();
    });
  }
});
\`\`\`

Prefer role and label locators because they assert how users encounter the interface. The detailed [Playwright locator best practices](/blog/playwright-best-practices-locators-2026) are especially relevant during flag cleanup: selectors tied to obsolete CSS classes can keep passing against hidden legacy markup or fail for reasons unrelated to behavior.

Do not create dozens of end-to-end combinations for rule evaluation. That belongs at the decision boundary. Use browser tests for wiring, accessibility-visible UI, and the critical request produced by each meaningful branch.

## Collect retirement evidence that answers specific questions

A dashboard showing "100% rollout" is not enough. It describes configured intent, not actual execution. Cleanup evidence should answer whether evaluations still choose the old branch, whether all relevant application versions know the flag, whether exceptions force fallback, and whether rollback remains required.

| Evidence | Question answered | Common blind spot |
|---|---|---|
| Evaluation counts by variation | Is the losing branch still selected? | Bots, tests, and internal users can distort totals |
| Unique accounts by variation | Are any customer cohorts still excluded? | Anonymous traffic may lack account identity |
| Evaluation error count | Is fallback masking provider failure? | SDK may sample or aggregate events |
| Application version dimension | Are old deployments still running? | Batch workers and mobile clients outlive web releases |
| Business outcome by variation | Did the winning path remain healthy? | Correlation does not prove the flag caused the outcome |
| Configuration audit history | Who changed targeting, and when? | Dashboard state alone loses sequence |

Define an observation window long enough to include low-frequency jobs, weekly users, and the longest supported client version. The number of days is contextual. A daily checkout service and a monthly billing close do not earn the same window. State the window and why it covers the system's recurrence patterns.

Instrument at the evaluation boundary with low-cardinality dimensions. Flag key, resolved variation, evaluation reason category, and application version are usually useful. Raw user IDs rarely belong in metrics. Exposure events for experiments must be distinguished from evaluations: an evaluation during prefetch is not proof that a person saw the variant.

## Execute cleanup as a reversible sequence

Removing configuration before consumers is dangerous because callers begin receiving their fallback, which might be the losing branch. Removing code before configuration can also confuse monitoring because the provider continues reporting evaluations from older deployments. Use a sequence that makes each transition observable.

1. Decide the permanent behavior and record the evidence.
2. Stop changing targeting except for an approved emergency rollback.
3. Set the chosen value for all production contexts.
4. Observe the defined window, including old versions and scheduled jobs.
5. Change code to the permanent branch and remove the runtime evaluation.
6. Deploy that code everywhere that can evaluate the flag.
7. Confirm evaluation volume reaches the expected residual level or zero.
8. Remove provider configuration, manifest entry, obsolete branch tests, and dead telemetry.
9. Close the cleanup issue with links to evidence and the final code revision.

The code change should simplify, not merely hard-code:

\`\`\`diff
-const variant = await checkoutVariant(flags, context);
-if (variant === 'address-v2') {
-  return renderStructuredAddress(checkout);
-}
-return renderLegacyAddress(checkout);
+return renderStructuredAddress(checkout);
\`\`\`

Delete \`checkoutVariant\` if it has no other consumers. Delete legacy components, adapters, fixtures, translations, analytics events, and styles after confirming they are branch-specific. Run type checking and repository-wide search for the exact key. A search result in a migration note is not runtime use, so classify results rather than demanding an empty repository blindly.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when an agent needs a repeatable review checklist. Keep the repository-specific lifecycle, flag ownership, and provider policy in project instructions, because a general skill cannot infer those facts safely.

## Diagnose the classic fallback regression

Consider a rollout that has served \`address-v2\` to every observed production account for two weeks. A developer deletes the provider flag first. Immediately, checkout reverts to the legacy form even though the dashboard had shown full rollout.

The failure is not a targeting problem. The application still evaluates the now-missing key with \`false\` as its default. Deleting configuration causes the wrapper to return that fallback. The evidence trail usually looks like this:

\`\`\`text
12:04:18 flag evaluation checkout.address-v2 reason=FLAG_NOT_FOUND default=false
12:04:18 checkout variant=legacy app_revision=7c91d2a
12:04:19 POST /address/legacy status=500
\`\`\`

Diagnose it in order. Confirm which application revision served the request. Verify that the key is absent rather than merely off. Inspect the default at the evaluation call. Compare configuration audit time with deployment time. Restore the flag at the chosen value if that is the safest recovery, then deploy code that removes evaluation. Do not flip the hard-coded default to \`true\` as the entire cleanup. That leaves stale abstraction and configuration dependencies in place.

Add a regression check around the removal order, perhaps as a release checklist assertion or an integration test showing permanent code no longer calls \`booleanValue\`. The bug escaped because the team treated provider deletion as equivalent to code cleanup.

## What people get wrong: branch coverage is not lifecycle coverage

Teams often point to 100 percent branch coverage for an \`if\` statement and conclude that a flag is safe. That metric says both code paths executed in tests. It says nothing about targeting rule precedence, missing context, provider failure, cross-request consistency, old application versions, or the safety of deleting configuration.

The opposite mistake is keeping both branch tests forever after the code has converged. Once the flag and losing path are removed, tests should describe permanent behavior. Preserving an elaborate test harness for a state production can no longer enter raises maintenance cost and can mislead an AI agent into rebuilding the deleted abstraction during a later change.

Another common error is coupling tests to a live shared dashboard. One team's targeting edit then changes another team's supposedly deterministic run. Use controlled configuration for integration tests and narrow contract checks for the real provider. A production smoke test may observe real state, but it should not mutate customer targeting as part of ordinary CI.

For teams choosing where these checks belong among unit, component, integration, and browser suites, the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) provides a useful runner-level comparison. The lifecycle matrix should remain stable even if the runner changes.

## Add CI checks that create pressure without unsafe automation

CI can detect suspicious age, missing ownership, duplicate keys, invalid dates, and references to flags scheduled for removal. It should not independently decide that zero events means safe deletion. Telemetry can be delayed, sampled, or incomplete.

A simple manifest audit can fail temporary flags that have crossed their review date:

\`\`\`js
import { readFile } from 'node:fs/promises';

const data = JSON.parse(await readFile('config/flags.json', 'utf8'));
const today = new Date('2026-08-08T00:00:00Z');
const overdue = data.flags.filter((flag) => {
  if (!['release', 'experiment', 'migration'].includes(flag.kind)) return false;
  return new Date(\`\${flag.removeBy}T00:00:00Z\`) < today;
});

if (overdue.length > 0) {
  for (const flag of overdue) {
    console.error(
      \`Overdue flag: \${flag.key}, owner=\${flag.owner}, issue=\${flag.cleanupIssue}\`,
    );
  }
  process.exitCode = 1;
}
\`\`\`

In a real job, derive today from the CI clock rather than fixing the example date. Validate input shape before trusting it, and make date semantics explicit. This script identifies review debt. The owner still verifies runtime evidence and creates the cleanup change.

Ask an AI coding agent to produce an evidence packet with its patch: exact flag key searches, changed call sites, tests run, losing assets removed, and any remaining references classified. Instruct it never to weaken a fallback or delete provider configuration merely to make tests green. That converts a broad "clean up stale flags" prompt into an auditable engineering task.

## Frequently Asked Questions

### How long should a flag stay at 100 percent before cleanup?

Use an observation window that includes the system's slowest relevant recurrence, not a universal number of days. Cover supported application versions, weekly or monthly jobs, low-frequency customer journeys, delayed event delivery, and the agreed rollback period. Document why the window is sufficient. A high-volume web request may provide evidence quickly, while a billing workflow needs a full billing cycle. At the end, verify variation counts, errors, versions, and business health before removing evaluation code.

### Should tests call the real feature flag provider?

Most branch and domain tests should use a deterministic wrapper stub or local provider. Add a small integration suite for authentication, context translation, value types, and the real provider's documented semantics. A shared live project is a poor default because targeting edits make CI nondeterministic. Production smoke checks may observe current state without mutating it. This split gives fast branch coverage while retaining confidence that the adapter and remote service agree.

### Which branch should be the default when evaluation fails?

Choose the branch with the safest consequence for that specific capability. For a new checkout release, the established path may be safer. For a critical security control, enabling protection may be safer. Consider stale cache behavior, dependency load, data format compatibility, and whether the fallback has already been removed elsewhere. Record the decision beside the flag, pass the default explicitly, and test provider failure. Dashboard state is not a substitute for a deliberate code fallback.

### What should be deleted after a stale release flag is retired?

Remove the runtime evaluation, losing implementation, provider configuration, manifest record, obsolete tests, fixtures, translations, styles, analytics dimensions, and documentation that describes two active variants. Preserve decision records and migration history where they remain useful. Search for the exact key and for branch-specific names, then classify every result. Finally, deploy across all evaluators and confirm expected evaluation traffic reaches zero before deleting the remote key, so older processes cannot fall into an unsafe default.
`,
};
