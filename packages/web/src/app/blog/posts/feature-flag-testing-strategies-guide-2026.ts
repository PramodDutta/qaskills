import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Feature Flag Testing Strategies Guide (2026)",
  description: "Test code behind feature flags without combinatorial blow-up. Strategies for flag matrices, default-state testing, flag cleanup, and CI patterns.",
  date: "2026-06-15",
  category: "Testing",
  content: `# Feature Flag Testing Strategies: A Practical Guide

Feature flag testing is the practice of verifying application behavior under different flag states without trying to test every possible combination of flags, which grows exponentially and is impossible to cover exhaustively. The working strategy is to test each flag in both its on and off states against a stable baseline, use pairwise combinations for flags that genuinely interact, always test the production default state, and aggressively retire stale flags so the combinatorial space stops growing. Flags are tested at unit, integration, and end-to-end levels, with the flag value injected rather than read from a live service during tests.

This guide covers the combinatorial-explosion problem, the strategies that keep flag testing tractable, how to make flag-dependent tests deterministic, and how flag cleanup is itself a testing concern.

## Why feature flags break naive testing

A feature flag (or toggle) is a runtime switch that changes behavior without a deploy. Teams use them for gradual rollouts, A/B experiments, kill switches, and trunk-based development. The problem for testing is simple arithmetic: **n independent boolean flags produce 2^n possible system states.**

| Flags | Possible combinations |
|---|---|
| 5 | 32 |
| 10 | 1,024 |
| 20 | 1,048,576 |
| 30 | ~1 billion |

A mature product easily carries dozens of flags. You cannot run a billion test configurations, and even if you could, most combinations are meaningless because most flags do not interact. The art of feature flag testing is deciding *which* states are worth testing.

There is a second, quieter problem: flags that are never removed. Every permanent flag doubles the theoretical state space forever and rots into dead conditional branches. Flag cleanup is therefore not just hygiene — it is what keeps the test problem solvable.

## Strategy 1: Test each flag on and off against a baseline

The foundational technique. For each flag, hold all other flags at their default values and test the feature both enabled and disabled. This is linear — \`2n\` tests for \`n\` flags instead of \`2^n\` — and catches the overwhelming majority of flag-specific bugs.

\`\`\`python
import pytest

@pytest.mark.parametrize("new_checkout_enabled", [True, False])
def test_checkout_completes(new_checkout_enabled):
    # Inject the flag value; do NOT call the live flag service in a unit test
    cart = Cart(flags={"new_checkout": new_checkout_enabled})
    result = cart.checkout(order)
    assert result.status == "ordered"   # invariant holds either way
\`\`\`

Notice the assertion is on the *invariant* (the order completes) rather than on flag-specific UI. The point of the on/off test is to prove the flag does not break the core behavior in either state. Where the two states differ, add targeted assertions per branch:

\`\`\`python
def test_new_checkout_shows_one_page():
    cart = Cart(flags={"new_checkout": True})
    assert cart.checkout_steps() == 1   # new flow is single-page

def test_legacy_checkout_shows_three_pages():
    cart = Cart(flags={"new_checkout": False})
    assert cart.checkout_steps() == 3
\`\`\`

## Strategy 2: Always test the production default state

The single most important configuration to test is the one your users actually run. Every flag has a default — the value it takes when the flag service is unreachable or the flag is unknown. Your suite must run with all flags at their production defaults, because that is the real system.

\`\`\`javascript
// Define the canonical production defaults in one place
const PROD_DEFAULTS = {
  new_checkout: false,
  dark_mode: true,
  fast_search: true,
};

test('app works with production default flags', () => {
  const app = createApp({ flags: PROD_DEFAULTS });
  expect(app.boot()).toBe('ready');
});
\`\`\`

A subtle but critical case: **test the fallback behavior when the flag provider fails.** If your flag SDK cannot reach its server, what value does each flag take? Tests must confirm the app degrades to a safe default rather than crashing or silently flipping behavior.

\`\`\`javascript
test('falls back to safe defaults when flag service is down', () => {
  const app = createApp({ flagProvider: unreachableProvider });
  // SDK should return the configured default, not throw
  expect(app.flags.get('new_checkout')).toBe(false);
  expect(app.boot()).toBe('ready');
});
\`\`\`

## Strategy 3: Pairwise for flags that actually interact

On/off testing assumes flags are independent. Some are not — \`new_checkout\` and \`new_payment_gateway\` might only conflict when both are on. For interacting flags, you do not need the full 2^n; you need **pairwise (all-pairs) coverage**, which guarantees every pair of flag values appears together at least once while keeping the test count small.

The math is dramatic. Ten flags is 1,024 exhaustive combinations but only about 10 pairwise cases. Generate them with a combinatorial tool like Microsoft PICT:

\`\`\`
# flags.txt
new_checkout:        on, off
new_payment_gateway: on, off
fast_search:         on, off
dark_mode:           on, off
recommendations:     on, off
\`\`\`

\`\`\`bash
pict flags.txt        # ~6-8 cases covering every pair, vs 32 exhaustive
\`\`\`

Feed the generated rows into a parametrized test. Crucially, **only apply pairwise to flags you have reason to believe interact** — usually flags touching the same subsystem. Throwing all 30 flags into a pairwise generator produces noise; group them by feature area first. For a deeper treatment of the technique, see the combinatorial-testing material in the [QA skills directory](/skills).

\`\`\`python
import csv, pytest

def load_cases(path):
    with open(path) as f:
        return [
            {k: v == "on" for k, v in row.items()}
            for row in csv.DictReader(f, delimiter="\\t")
        ]

@pytest.mark.parametrize("flags", load_cases("cases.tsv"))
def test_flag_combinations(flags):
    app = createApp(flags=flags)
    assert app.checkout(order).status == "ordered"
\`\`\`

## Strategy 4: Make flag-dependent tests deterministic

The fastest way to get flaky tests is to read flag values from a live service during the test run. A rollout set to "50% of users" returns different values on different runs — non-deterministic by design. The rule: **never let test behavior depend on a remote flag evaluation.** Inject the value instead.

Every major flag SDK supports a local/test mode for exactly this:

\`\`\`javascript
// LaunchDarkly: test data source pins flag values, no network
import { TestData } from '@launchdarkly/node-server-sdk/integrations';

const td = TestData();
td.update(td.flag('new_checkout').valueForAll(true));
const client = LDClient.init('sdk-key', { updateProcessor: td.getFactory() });
\`\`\`

\`\`\`python
# OpenFeature: in-memory provider for tests (vendor-agnostic)
from openfeature import api
from openfeature.provider.in_memory_provider import InMemoryProvider, InMemoryFlag

api.set_provider(InMemoryProvider({
    "new_checkout": InMemoryFlag("on", {"on": True, "off": False})
}))
\`\`\`

The pattern generalizes: wrap flag access behind a small interface in your own code, then in tests substitute a fake that returns fixed values. This also decouples your tests from any specific vendor. If a flag drives percentage rollouts or targeting rules, test the *targeting logic* separately with controlled user attributes, and test the *feature* with the flag pinned on or off.

## Strategy 5: Treat flag cleanup as a testing concern

Stale flags are the root cause of the combinatorial blow-up. A flag that has been "100% on" for six months is no longer a flag — it is a dead \`if\` statement and an untested \`else\` branch. Removing it shrinks the state space and deletes code paths you would otherwise have to keep testing.

A disciplined lifecycle:

| Stage | Action | Testing implication |
|---|---|---|
| Created | Add flag + on/off tests | Both branches tested |
| Rolling out | Pairwise with interacting flags | Interactions covered |
| Fully rolled out | Mark for removal | Stop testing the dead branch |
| Removed | Delete flag + the \`else\` branch + its tests | State space shrinks |

Operational guardrails that keep flags from accumulating:

- **Expiry dates.** Give every flag a removal date when it is created. Tools like LaunchDarkly and Unleash surface stale flags; some CI linters fail the build on flags older than a threshold.
- **A "remove the flag" task is part of done.** A rollout is not complete until the flag and its losing branch are deleted.
- **Lint for flag references.** When you delete a flag, a codebase search must find zero remaining references. A leftover reference to a removed flag is a bug that tests should catch (the SDK returns the default, often silently).
- **Test the removal.** When you delete a flag and keep only the winning branch, run the suite to confirm nothing depended on the deleted path. The on/off tests for that flag are deleted along with it.

You can compare flag-management platforms and related testing approaches on the [comparison hub](/compare).

## A layered test strategy across the pyramid

Flags are tested differently at each level of the test pyramid:

\`\`\`
        /\\        E2E: a few critical journeys, flags pinned to
       /  \\       prod-default AND to the "about to launch" state
      /----\\
     /      \\     Integration: flag-driven branches across modules,
    /        \\    using the SDK's test/local provider
   /----------\\
  /            \\  Unit: every flag on/off, value INJECTED,
 /______________\\ fast and exhaustive per-flag
\`\`\`

- **Unit** — exhaustively cover each flag on/off with injected values. Cheap and fast, so do all \`2n\` here.
- **Integration** — cover branches that span modules, using the SDK's in-memory provider so there is no network and no flakiness.
- **End-to-end** — do not multiply E2E runs across many flag combinations; they are slow. Run the critical journeys twice: once at production defaults, once at the configuration you are about to release. That validates the rollout without a combinatorial explosion in your slowest tests.

## Common pitfalls and troubleshooting

**Reading live flags in tests.** Percentage rollouts and targeting make live evaluation non-deterministic. Always inject or use the SDK's test provider. This is the number-one cause of flag-related flakiness.

**Forgetting the off state.** Teams test the shiny new on-state and ship, then the kill switch (off) turns out to be broken when they need it most. The off path is the safety mechanism — test it deliberately.

**Combinatorial overreach.** Trying to pairwise-test all flags at once produces a large, noisy suite. Group flags by the subsystem they touch and only combine flags that plausibly interact.

**Never removing flags.** Permanent flags permanently inflate the state space and rot into dead branches. Treat cleanup as part of the feature's definition of done, with an expiry date set at creation.

**Untested fallback behavior.** When the flag provider is unreachable, what happens? If you never test the failure mode, an outage in your flag service can change app behavior unpredictably. Assert that defaults apply and the app stays up.

**Flag-dependent assertions that drift.** When a flag is removed and one branch deleted, leftover tests for the dead branch silently pass against the default. Delete a flag's tests when you delete the flag.

## Frequently Asked Questions

### How do you test every combination of feature flags?

You generally do not, because n boolean flags create 2^n combinations, which becomes billions at scale. Instead you test each flag in its on and off states against a baseline (linear, not exponential), use pairwise combinations only for flags that genuinely interact, and always test the production default configuration. Exhaustive combination testing is reserved for the rare case of a handful of tightly coupled flags.

### Should I read flag values from the live service in tests?

No. Live flag evaluation is non-deterministic when flags use percentage rollouts or user targeting, which makes tests flaky. Inject the flag value directly or use your SDK's test/local provider (such as LaunchDarkly's TestData or OpenFeature's in-memory provider) so each test pins flags to known values and runs without a network call.

### How does pairwise testing help with feature flags?

Pairwise (all-pairs) testing guarantees that every pair of flag values appears together in at least one test case, which catches most interaction bugs while keeping the test count tiny. Ten flags drop from 1,024 exhaustive combinations to roughly ten pairwise cases. Apply it only to flags that plausibly interact — usually those touching the same subsystem — rather than to all flags at once.

### Why is feature flag cleanup a testing problem?

Every flag that is never removed permanently doubles the theoretical state space and leaves a dead conditional branch that you must keep testing or risk breaking. Removing a fully rolled-out flag deletes that branch and its tests, shrinking the combinatorial space. Setting an expiry date at flag creation and treating removal as part of "done" keeps the testing burden from growing without bound.

### What should I test about a flag's default state?

Test that the application behaves correctly with all flags at their production defaults, since that is what most users actually experience. Critically, also test what happens when the flag provider is unreachable: the SDK should return the configured default rather than crashing or flipping behavior, and the app should still boot and function. The off/default path is your safety net and must be verified explicitly.

### At what level of the test pyramid should flags be tested?

Test each flag on and off exhaustively at the unit level, where injecting values is cheap and fast. Cover flag-driven branches that span modules at the integration level using the SDK's in-memory provider. At the end-to-end level, avoid multiplying slow runs across many combinations — instead run critical journeys at the production default and at the configuration you are about to release.
`,
};
