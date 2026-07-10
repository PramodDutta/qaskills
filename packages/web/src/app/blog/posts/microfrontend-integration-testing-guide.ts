import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Microfrontend Integration Testing Guide',
  description:
    'Microfrontend integration testing guide for shells, remotes, Module Federation, shared dependencies, runtime contracts, and user-flow confidence.',
  date: '2026-07-10',
  category: 'Guide',
  content: `# Microfrontend Integration Testing Guide

The shell loaded, the remote mounted, and the first click failed because two teams shipped incompatible assumptions about a shared router. Microfrontends move ownership boundaries into the browser. That can improve delivery autonomy, but it also creates integration risks that unit tests inside a single remote will never see.

Testing microfrontends well means deciding which contracts belong at build time, which belong at runtime, and which user flows need a real shell with real remotes. A shell team cannot rely on every remote's internal tests. A remote team cannot assume the shell will provide the same auth object forever. For service-side boundary thinking, compare [microservices testing strategies](/blog/microservices-testing-strategies). For full user journeys, connect this with [end-to-end testing best practices](/blog/end-to-end-testing-best-practices).

## Identify the integration surface before choosing tools

Microfrontend failures usually happen at seams: remote loading, shared dependencies, route ownership, event contracts, auth context, design-system versions, and deployment compatibility. A browser E2E suite can catch some of this, but it is too late and too expensive as the only defense. Break the surface down.

| Integration surface | Example contract | Better test level |
|---|---|---|
| Remote manifest | Shell can load \`checkout/CartPanel\` | Build or smoke test |
| Shared dependency | React singleton version is compatible | Bundler config test and runtime smoke |
| Cross-app event | \`cart:item-added\` payload shape | Contract test |
| Routing | Remote owns \`/checkout/*\` under shell layout | Shell integration test |
| Auth context | Remote receives user and permissions | Component integration with shell provider |
| Visual system | Remote uses approved tokens | Visual review or component checks |

The goal is not to test every remote through every shell permutation. The goal is to catch the contract that would break users.

## Module Federation configuration checks

If the project uses Webpack Module Federation, many failures begin in configuration. A remote name changes. An exposed module path is renamed. A shared dependency stops being singleton. Those are testable before a browser opens.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import federationConfig from '../module-federation.config';

describe('checkout remote federation contract', () => {
  it('exposes the cart panel consumed by the shell', () => {
    expect(federationConfig.name).toBe('checkout');
    expect(federationConfig.exposes).toHaveProperty('./CartPanel');
  });

  it('keeps react shared as a singleton dependency', () => {
    expect(federationConfig.shared.react.singleton).toBe(true);
    expect(federationConfig.shared['react-dom'].singleton).toBe(true);
  });
});
\`\`\`

This test does not prove runtime loading, but it catches accidental config drift quickly. If your stack uses Vite federation or another plugin, assert the equivalent exposed modules and shared dependency rules from the real config object.

## Consumer-driven contracts for browser events

Microfrontends often communicate through custom events because it keeps teams independent. That only works when payloads are versioned and tested. Treat cross-app events like API contracts. A remote emitting \`cart:item-added\` should not silently change \`sku\` to \`productId\` without a compatibility plan.

\`\`\`ts
import { z } from 'zod';
import { describe, expect, it } from 'vitest';

const CartItemAdded = z.object({
  type: z.literal('cart:item-added'),
  detail: z.object({
    sku: z.string().min(1),
    quantity: z.number().int().positive(),
    source: z.enum(['product-page', 'cart-panel']),
  }),
});

function emitCartItemAdded(target: EventTarget, detail: unknown) {
  target.dispatchEvent(new CustomEvent('cart:item-added', { detail }));
}

describe('cart event contract', () => {
  it('emits the payload shape consumed by the shell', () => {
    const events: unknown[] = [];
    window.addEventListener('cart:item-added', (event) => {
      events.push({ type: event.type, detail: (event as CustomEvent).detail });
    });

    emitCartItemAdded(window, { sku: 'sku-123', quantity: 1, source: 'product-page' });

    expect(CartItemAdded.parse(events[0])).toEqual({
      type: 'cart:item-added',
      detail: { sku: 'sku-123', quantity: 1, source: 'product-page' },
    });
  });
});
\`\`\`

The schema can be published as a shared contract package or generated into both sides. What matters is that the consumer's expectation is executable.

## Shell integration tests with representative remotes

The shell needs tests that mount real remotes for the critical paths. Mocking every remote gives fast feedback but hides the failure mode unique to microfrontends: runtime composition. Keep a small set of shell integration tests that load representative deployed or locally served remotes.

For pull requests, a shell can run against stable contract remotes. For release candidates, use the candidate shell and candidate remotes together. If every remote changes independently, maintain a compatibility matrix for the combinations that users can actually receive.

Do not turn shell integration into a full regression suite for every remote. The shell should assert layout, routing, provider wiring, and cross-app behavior. Remote-specific business rules still belong to the remote team.

## Shared dependency drift

React, router libraries, state clients, and design systems are the usual suspects. A microfrontend can pass locally while failing inside the shell because it bundles its own copy of a dependency expected to be singleton. Tests should inspect both config and runtime symptoms.

| Dependency issue | Runtime symptom | Useful guard |
|---|---|---|
| Two React copies | Hooks error or context not shared | Singleton shared config plus shell smoke |
| Router mismatch | Links navigate outside shell control | Route contract test |
| Design token mismatch | Remote visually drifts | Visual diff on shell page |
| State client duplicate | Cache misses across apps | Provider integration test |

Package manager constraints help, but they do not replace runtime smoke tests. The browser is where the composition happens.

## Deployment compatibility and rollback

Microfrontends can be deployed separately, which means compatibility is a moving target. A shell released today may load a remote released yesterday. A rollback can create older-newer combinations that nobody tested if the pipeline assumes all parts ship together.

Write compatibility rules. For example: a remote must support the current shell and previous shell for one release window. A shell must tolerate a remote manifest failing and show a controlled fallback. Those rules deserve tests.

Runtime loading failures should produce a user-safe fallback and an observable error. A blank page because a remote entry 404s is not acceptable. Test the fallback by pointing the shell at a missing remote URL in a controlled environment.

## What belongs in Playwright E2E

Use browser E2E for flows that prove composition: open the shell, navigate into a remote, perform a cross-app action, and observe a result in another area. Keep the count small but meaningful. If a checkout remote emits a cart event and the shell header updates the badge, that is a good E2E assertion. Testing every coupon validation case through the shell is not.

E2E tests should identify which remote versions were loaded. Capture manifest URLs or build hashes in test logs. When a failure occurs, the first question will be whether the shell or remote changed.

## Contract ownership between shell and remote teams

Every microfrontend contract needs an owner. Without ownership, teams discover incompatibility only when the shell fails to load or a user flow breaks. The owner is not always the producer. For a custom event consumed by the shell, the shell team may own the schema because it defines what the shell needs. For an exposed remote module, the remote team may own the compatibility promise because it publishes the artifact.

Write contract changes like API changes. Add fields without breaking old consumers. Avoid renaming required fields without a transition window. When removal is necessary, publish a migration note and test the shell version that no longer depends on the field.

Contract tests should run in both directions when risk is high. The remote proves it still emits what the shell consumes. The shell proves it tolerates optional fields and controlled remote failure. That two-sided evidence prevents blame games during release.

## Local development environments that do not lie

Microfrontend development often uses local remotes, mocked remotes, or a local shell. Each mode is useful, but each hides different risks. A remote developer running only the remote cannot see shell provider changes. A shell developer using mocked remotes cannot see bundle loading failure. A fully composed local environment can be slow and brittle if every team must run every app.

Document the modes. For example: remote unit mode for component behavior, shell mock mode for layout work, composed mode for cross-app events, and deployed preview mode for release confidence. Tests should map to those modes so developers know what each command proves.

| Development mode | What it proves | What it hides |
|---|---|---|
| Remote alone | Component logic and local state | Shell providers, routing, shared dependencies |
| Shell with mocks | Layout and fallback behavior | Actual remote bundle and event implementation |
| Local composition | Runtime loading and cross-app flow | Cloud CDN, deployed manifest paths |
| Preview deployment | Real artifact compatibility | Some production traffic and data conditions |

No single mode is enough. The testing strategy should use the cheapest mode that can catch the specific risk.

## Visual and accessibility checks across composition

Microfrontends can pass functional tests while creating a broken combined page. A remote may bring its own reset CSS, duplicate landmark roles, trap focus inside a modal, or use a design-system version with different spacing. These issues appear only when the shell and remote render together.

Add accessibility checks to composed pages, not only remote pages. Verify heading structure, landmarks, focus order, modal behavior, and keyboard navigation across shell and remote boundaries. If the shell owns the header and the remote owns the main content, their ARIA responsibilities still meet in one document.

Visual regression should focus on stable composed states. Avoid snapshotting every remote screen through the shell. Choose the pages where layout ownership crosses team boundaries: navigation plus remote content, cart badge plus checkout event, profile shell plus account remote.

## Failure fallback testing

Remote loading will fail eventually: CDN issue, bad manifest, network block, incompatible deployment, or feature flag mistake. The shell should show a controlled fallback that preserves navigation and tells observability what failed. Test this deliberately.

A useful fallback test points the remote URL to a missing asset or intercepts the remote entry request in a browser test. The expected result is not "no error occurred." The expected result is a user-safe error region, no full-page crash, and a logged event with remote name and version if known.

Fallbacks should be product-specific. A marketing remote can show a simple unavailable section. A checkout remote may need to block order placement and preserve cart state. A support console remote may need a retry action. The test should reflect the business consequence.

## Performance budgets for remote composition

Microfrontends can silently add bundle weight because each team optimizes locally. The shell should maintain budgets for remote entry size, route load time, and duplicate dependencies. A remote that ships a second charting library may not fail tests, but it can damage user experience.

Budget tests can inspect build artifacts, Lighthouse reports, or real-user monitoring in preview. Keep the rule tied to the route. A rarely used admin remote can have a different budget than the default dashboard. What matters is that size and load cost are visible at integration time.

Shared dependencies deserve special attention. If a dependency is meant to be provided by the shell, test that the remote does not bundle another copy. Bundle analysis in CI can catch this before the browser does.

## Test data and identity across remotes

Microfrontends frequently share user identity, tenant selection, feature flags, and permissions through shell providers. Integration tests should verify that each remote receives the same identity context and reacts consistently. A remote that reads tenant ID from local storage while another reads it from a provider can create confusing cross-tenant defects.

Use test accounts with explicit permissions. Do not rely on an all-powerful admin for every composed test, because permission mismatches are common at the shell boundary. A user who can view orders but not issue refunds should see the same restrictions whether the control is rendered by the shell or a remote.

Feature flags deserve similar treatment. If the shell enables a new navigation item but the remote flag is off, users can land on a half-released screen. Tests should cover the flag combinations that can happen during rollout.

## Observability for composed pages

When a composed page fails, logs need to identify the shell version, remote name, remote version, route, and correlation ID. Without that metadata, teams spend time proving ownership before fixing the bug. Integration tests can assert that error boundaries and telemetry calls include the remote identity.

Do not log sensitive user data just to debug composition. A useful event can say \`remote checkout failed to mount on route /checkout\` with build IDs and error class. It does not need cart contents or customer email.

Add a smoke assertion that the shell exposes loaded remote versions in a debug endpoint, data attribute, or telemetry payload. That evidence is invaluable during rollback decisions.

## Contract deprecation testing

Microfrontend contracts age. A shell may support both old and new event payloads during a migration. Tests should make that compatibility window explicit. Add cases for the old payload, the new payload, and the removal date or feature flag that ends support.

Deprecation tests prevent accidental early removal. They also prevent zombie compatibility from living forever. When the migration window closes, delete the old contract test in the same pull request that removes the compatibility code.

## Release sequencing tests

Independent deployment creates sequencing risk. A remote may deploy before the shell that understands its new event, or the shell may deploy before the remote exposes a new module. Tests should model allowed sequences. If the shell can see old and new remotes during rollout, run compatibility checks for both.

Feature flags can reduce the risk, but only if they are tested in the same sequence users will experience. A flag that reveals a shell route before the remote is available should fail a release check. A flag that keeps the route hidden until the remote manifest is healthy can be tested as a safe rollout path.

Record the compatible shell and remote versions in release notes or generated metadata. The test output should make that compatibility visible without requiring a human to inspect deployment dashboards.

## Keeping mocks honest

Mocks are still useful in microfrontend testing, but they need contracts too. A shell mock remote should implement the same exposed module name, event names, and minimal props as the real remote. If the mock accepts anything, shell tests will pass against an impossible integration. Review mocks when remote contracts change, and delete mock behavior that no deployed remote still supports.

## Frequently Asked Questions

### Should microfrontend teams share a test framework?

They should share contract formats and quality gates, but not necessarily every internal test framework. A React remote and a Vue remote can still publish the same event contract and pass the same shell smoke.

### How many shell E2E tests are enough?

Cover the composition paths users rely on: remote loading, navigation, auth context, and one or two cross-app interactions. Put remote-specific rule coverage in the remote repository.

### Can contract tests replace browser integration tests?

No. Contracts catch shape and compatibility issues early, while browser integration proves runtime composition, shared dependencies, and provider wiring.

### How do I test a remote that is deployed independently?

Test the remote in isolation, publish its contract, then run shell compatibility tests against the remote artifact or URL that production can load. Record the remote version in test output.

### What is the biggest microfrontend testing mistake?

Mocking every remote in shell tests and calling the result integration coverage. That tests the shell's imagination, not the deployed composition users see.
`,
};
