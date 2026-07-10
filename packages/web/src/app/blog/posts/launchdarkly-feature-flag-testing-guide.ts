import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LaunchDarkly Feature Flag Testing Guide',
  description:
    'LaunchDarkly feature flag testing guide for rollout rules, targeting matrices, SDK TestData, fallback checks, context tests, and safer releases.',
  date: '2026-07-10',
  category: 'Guide',
  content: `
# LaunchDarkly Feature Flag Testing Guide

The risky part of a flag is rarely the \`if\` statement. The risk sits in the LaunchDarkly rule that says beta customers in one region get the new checkout, internal users get a debug panel, everyone else stays on the legacy path, and a percentage rollout starts after support signs off. Testing that behavior requires more than toggling a boolean in a unit test.

LaunchDarkly changes the shape of release validation. A feature can be deployed, hidden, targeted, rolled out gradually, or killed without a redeploy. That flexibility is valuable only when the test strategy covers flag defaults, targeting rules, fallback behavior, stale flag cleanup, and production validation for the exact contexts that will see the change.

This guide is LaunchDarkly-specific: SDK test data, context targeting, rollout matrices, and the test boundaries that keep flag suites useful. For broader release patterns, read the [feature flag testing strategies guide](/blog/feature-flag-testing-strategies-guide-2026). For planning test coverage before a rollout, the [test planning strategy guide](/blog/test-planning-strategy-guide) is the companion piece.

## Model the flag, not just the branch

A boolean branch test asks whether code behaves when \`newCheckout\` is true or false. A LaunchDarkly test asks more precise questions: which context receives true, what happens when the SDK is unavailable, whether the default value is safe, whether the rule depends on the expected attribute, and whether the application records the exposure or business event you need for rollout decisions.

Start with a flag contract. The contract should include key, variations, default value in code, intended targeting attributes, owner, expiry condition, and kill-switch behavior. Without that information, tests drift into guessing. The flag key becomes a magic string and the fallback becomes whatever a developer typed during implementation.

| LaunchDarkly concern | Test question | Example |
|---|---|---|
| Flag key | Does application code request the intended flag? | \`checkout-redesign\` rather than \`new-checkout\` |
| Default value | Is fallback safe during SDK failure? | Checkout uses legacy flow when evaluation fails |
| Context attributes | Are targeting inputs present and correctly named? | \`plan: enterprise\`, \`country: IN\` |
| Variation type | Does code expect boolean, string, or JSON? | Theme flag returns \`control\` or \`compact\` |
| Cleanup date | Is the flag temporary? | Remove after 100 percent rollout and monitoring |

Many defects come from attribute mismatch. The LaunchDarkly rule targets \`accountTier\`, but the service sends \`plan\`. Unit tests that mock only a boolean never catch that. Include tests around the context object your application sends to the SDK.

## Unit tests with LaunchDarkly TestData

The Node server-side SDK supports a test data source through \`@launchdarkly/node-server-sdk/integrations\`. This is useful when you want the real SDK evaluation path without connecting to LaunchDarkly. You can set a flag, initialize the client with the test data update processor, and update flag behavior during the test.

\`\`\`ts
import ld from '@launchdarkly/node-server-sdk';
import { TestData } from '@launchdarkly/node-server-sdk/integrations';
import { afterEach, describe, expect, test } from 'vitest';

const context = {
  kind: 'user',
  key: 'qa-user-1',
  plan: 'enterprise',
};

describe('checkout LaunchDarkly flag evaluation', () => {
  let client: ld.LDClient | undefined;

  afterEach(async () => {
    await client?.close();
  });

  test('uses the redesigned checkout when the flag is on for all contexts', async () => {
    const td = new TestData();
    await td.update(td.flag('checkout-redesign').booleanFlag().variationForAll(true));

    client = ld.init('sdk-key-for-tests', {
      updateProcessor: td.getFactory(),
    });

    await client.waitForInitialization();

    const enabled = await client.variation('checkout-redesign', context, false);
    expect(enabled).toBe(true);
  });

  test('falls back to legacy checkout when the flag is off', async () => {
    const td = new TestData();
    await td.update(td.flag('checkout-redesign').booleanFlag().variationForAll(false));

    client = ld.init('sdk-key-for-tests', {
      updateProcessor: td.getFactory(),
    });

    await client.waitForInitialization();

    const enabled = await client.variation('checkout-redesign', context, false);
    expect(enabled).toBe(false);
  });
});
\`\`\`

This is more faithful than a hand-written mock because the test still uses the LaunchDarkly client API. It is also isolated. It does not require a real SDK key, network connectivity, or dashboard state. The tradeoff is that it does not prove the production flag rule in LaunchDarkly is configured correctly. You still need environment checks or targeted production validation for that.

Use TestData for application behavior: what the service does after evaluation. Use LaunchDarkly environment validation for dashboard configuration: whether the rule targets the intended contexts.

## Targeting matrices that stay small enough to run

Feature flag combinations can explode quickly. A checkout flow might depend on \`checkout-redesign\`, \`new-tax-service\`, \`wallet-payments\`, and \`fraud-step-up\`. Testing every combination for every country, plan, and device is rarely sensible. Instead, build a matrix around risk and interaction.

For LaunchDarkly, the matrix should include context attributes used by targeting rules. If a flag rule references \`plan\`, \`country\`, and \`qaCohort\`, include representative contexts for those attributes. If two flags interact in the same code path, include pairwise combinations for that path. If a flag is independent, avoid multiplying the whole suite by it.

| Matrix slice | Include when | Example context |
|---|---|---|
| Targeted allowlist | QA or beta users are explicitly targeted | \`kind=user\`, \`key=qa-checkout-1\` |
| Segment membership | LaunchDarkly segment controls exposure | Enterprise account in beta segment |
| Attribute rule | Rule checks context fields | \`country=US\`, \`plan=pro\` |
| Fallthrough | User matches no rule | Standard customer outside beta |
| Fallback | SDK cannot evaluate or flag missing | Default value in application code |

The matrix should be named in test data, not hidden in loops. A failure should say "enterprise India beta context saw legacy checkout" rather than "case 7 failed." Senior test suites optimize for diagnosis, not only coverage count.

## Evaluating reason details for configuration debugging

LaunchDarkly SDKs support variation detail methods that return both the value and an evaluation reason. In a debugging or diagnostic test, reason detail can tell you whether a context was targeted, matched a rule, fell through, or received a default because of an error. Use this carefully. It is excellent for validating configuration assumptions, but it can over-couple tests to dashboard rule structure if used everywhere.

\`\`\`ts
import ld from '@launchdarkly/node-server-sdk';
import { TestData } from '@launchdarkly/node-server-sdk/integrations';
import { expect, test } from 'vitest';

test('records whether checkout flag came from fallback or configured data', async () => {
  const td = new TestData();
  await td.update(td.flag('checkout-redesign').booleanFlag().variationForAll(true));

  const client = ld.init('sdk-key-for-tests', {
    updateProcessor: td.getFactory(),
  });

  await client.waitForInitialization();

  const detail = await client.variationDetail(
    'checkout-redesign',
    { kind: 'user', key: 'qa-user-2' },
    false,
  );

  expect(detail.value).toBe(true);
  expect(detail.reason.kind).not.toBe('ERROR');

  await client.close();
});
\`\`\`

In production smoke checks, reason details can help distinguish "the app bug ignored the flag" from "the context did not match the intended LaunchDarkly rule." Keep these checks targeted. If every functional test asserts a reason kind, legitimate dashboard refactors will create unnecessary failures.

## Testing SDK failure and fallback values

Every flag evaluation has a default value in application code. That value is a safety decision. For a release flag, the default is often false so the old path remains active if LaunchDarkly cannot be reached. For a kill switch, the safe default may be true or false depending on how the switch is named. Ambiguous naming is dangerous: \`disablePayments\` and \`paymentsEnabled\` invert the fallback conversation.

Test SDK failure without making the whole test suite depend on network failures. Wrap LaunchDarkly behind a small application interface, then inject a client that throws or returns the default path. This is not a replacement for SDK tests. It is the right way to assert business behavior when evaluation fails.

Do not log only "flag false" when a fallback occurs. Production debugging needs enough detail to distinguish a real false variation from a default caused by missing flag, uninitialized client, or invalid context. At the same time, do not log private context attributes casually. Treat flag debugging data like any other operational telemetry.

## Production validation with targeted contexts

LaunchDarkly enables testing in production because you can expose a feature to narrow contexts. That does not mean every test belongs in production. Use production validation for wiring, data compatibility, observability, and real infrastructure behavior that staging cannot represent. Keep destructive or synthetic-heavy cases in lower environments.

A production validation checklist for a LaunchDarkly rollout might include: flag exists in the correct environment, QA context receives intended variation, non-targeted control context remains unchanged, exposure events are recorded, business metrics are segmented by variation, kill switch is verified in a safe window, and stale flags have owners.

For server-side flags, remember that context attributes come from your service. If production data omits an attribute that staging always had, LaunchDarkly rules can fall through. Add observability around evaluation inputs for the rollout period, with redaction where needed.

## Cleaning up flags before they become test debt

Feature flags age badly. A permanent permission flag can be part of product architecture. A release flag that stays after 100 percent rollout becomes dead branching, doubled test paths, and mental overhead. Testing strategy should include flag removal.

Add a cleanup ticket when the flag is created. Include the removal condition: after 100 percent rollout for seven stable days, after migration completion, or after the experiment decision. Tests should move with the lifecycle. During rollout, test both paths. After full adoption, delete legacy-path tests with the legacy code. Do not keep both forever "just in case" unless the flag remains operationally meaningful.

Stale flag cleanup is also a reliability issue. Old flags can be reused accidentally, dashboards become harder to audit, and test matrices grow without adding risk coverage.

## Separating release flags, permission flags, and experiment flags

LaunchDarkly flags often look similar in code, but they need different test strategies. A release flag controls rollout of a new implementation. A permission flag controls entitlement. An experiment flag allocates users to variations for measurement. Mixing those categories creates confusing tests and dangerous defaults.

Release flags should emphasize backward compatibility and kill-switch behavior. The old and new paths must both work during rollout. The safe fallback is usually the old path. The cleanup plan should be short-lived. Permission flags should emphasize authorization boundaries: users without entitlement must not access the feature even if they craft URLs or API calls. Experiment flags should emphasize consistent bucketing, event capture, and metric attribution.

If one LaunchDarkly flag is trying to do all three jobs, split it. A flag named \`new-dashboard\` should not also mean "paid plan has dashboard access" and "experiment group B sees compact cards." Tests become clearer when the flag purpose is singular. Production operations become safer because killing a broken release does not accidentally revoke a paid entitlement or corrupt experiment data.

## Testing context construction as first-class code

Many LaunchDarkly defects are context defects. The SDK call works, the flag exists, and the rule is correct, but the application sends the wrong context key or omits a custom attribute. That is why context construction deserves direct tests.

Create a small function that builds the LaunchDarkly context from your domain user, account, device, or organization. Test that function without the SDK. Assert stable keys, kinds, and attributes used by targeting. If the dashboard rule uses \`organization.key\`, the code should not accidentally use a user key. If targeting depends on \`country\`, test the mapping from billing address or profile data.

Be careful with private attributes. LaunchDarkly contexts can carry useful targeting data, but tests should enforce redaction policy. Do not send email, phone, or raw customer names unless your privacy rules allow it. A context-construction test can assert that only approved attributes are present.

## Environment drift between staging and production

LaunchDarkly has environments, and environment drift is a real testing problem. A flag may exist in staging but not production. Variations may have different names. A targeting rule may be copied without a segment. A test that uses only SDK TestData will not catch that because TestData bypasses the dashboard entirely.

For important rollouts, add an environment validation step. It can be manual for small teams or automated through LaunchDarkly's API for mature platforms. The check should verify flag key, variations, default/off variation, prerequisites, segments, and tags such as owner or expiry. Do not run this check as a broad scrape of every flag on every commit. Run it for flags involved in the release.

The validation output should be readable by release owners. "Flag missing in production" is actionable. "Configuration hash mismatch" is not enough unless the tool also explains what changed.

## Observability for flag decisions

Testing does not end after the SDK returns a value. During rollout, log or emit metrics around important flag decisions. At minimum, you want variation, service version, context kind, and a correlation ID. For privacy, avoid raw user attributes. For high-volume paths, sample logs and rely on metrics.

Exposure events and business events should line up. If the checkout redesign is enabled for a context, the checkout completion metric should be segmentable by variation. Without that link, canary and experiment analysis become guesswork. QA should verify observability before rollout, not after the first incident.

Also test the kill path. Flip the flag in a safe environment and confirm the application responds without restart if that is the expected operational behavior. Server-side SDKs stream updates by default in many setups, but local configuration, proxies, or offline mode can change how quickly values update. The product risk is not theoretical: a kill switch that requires redeploy is not a kill switch.

## Prerequisites and dependent flags

LaunchDarkly flags can depend on other rollout decisions in the product even when they are not configured as formal prerequisites. A redesign flag may assume the new pricing service is enabled. A mobile feature may assume an API compatibility flag is already live. Tests should make those relationships visible.

Create a release checklist that names dependent flags and their required states. In automated tests, set all required flags deliberately through TestData or environment fixtures. Do not rely on incidental defaults. When testing production configuration, verify prerequisite flags before exposing the dependent feature. A canary can fail for the wrong reason if the dependency state is unknown.

This also helps cleanup. A dependent release flag should not be removed before the flag that still controls a required backend behavior. Flag lifecycle is graph-shaped more often than teams expect, and the test plan should reflect that.

## Frequently Asked Questions

### Should I mock LaunchDarkly or use TestData?

Use TestData when you want the real SDK API and deterministic flag behavior. Use a small mock around your own wrapper when testing application fallback behavior or SDK failure paths.

### Do LaunchDarkly unit tests prove dashboard targeting is correct?

No. SDK TestData proves application behavior under configured values. Dashboard targeting needs environment validation, API checks, or targeted smoke tests using real LaunchDarkly configuration.

### What default value should a release flag use?

Usually the safest existing behavior. For many release flags that means false, but kill switches and inverse flags require explicit discussion. Name flags so the safe default is obvious.

### How many flag combinations should I test?

Test combinations that share a code path or business risk. Use targeted contexts and pairwise coverage for interacting flags, but avoid multiplying every suite by unrelated flags.

### When should a LaunchDarkly flag be removed?

When the rollout or experiment is complete and the alternate path is no longer needed. Permanent permission or ops flags are different, but temporary release flags should have cleanup criteria from the start.
`,
};
