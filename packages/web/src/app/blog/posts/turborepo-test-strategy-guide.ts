import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Turborepo Test Strategy Guide',
  description:
    'Design a Turborepo test strategy for monorepos with affected tasks, cache-safe outputs, package boundaries, and faster CI feedback loops today.',
  date: '2026-07-10',
  category: 'Guide',
  content: `
# Turborepo Test Strategy Guide

The monorepo did not become slow because tests are bad. It became slow because every package learned to ask the same question on every commit: should I run? Turborepo gives you a task graph, cache keys, package boundaries, and affected execution so the repository can answer that question with evidence.

A good Turborepo test strategy is not "run turbo test and hope caching saves us." It defines which tests belong at which package boundary, what outputs are safe to cache, which inputs should invalidate results, and when CI should widen from affected packages to the full graph. Without that design, teams accidentally cache the wrong artifacts, skip tests that depend on shared config, or run full suites so often that the monorepo loses its advantage.

This guide is for QA engineers and platform teams shaping test execution in JavaScript and TypeScript monorepos. For CI mechanics, pair it with [GitHub Actions testing CI CD guide](/blog/github-actions-testing-ci-cd-guide). For selecting tests from change data beyond Turborepo's package graph, read [test impact analysis CI guide 2026](/blog/test-impact-analysis-ci-guide-2026).

## Start With Test Boundaries, Not Commands

Each package should own the fastest tests that can prove its behavior. Shared packages should not require app-level end-to-end tests for every change. Apps should not duplicate low-level unit coverage already owned by libraries. Turborepo helps when the package boundary is meaningful.

| Boundary | Test examples | Owner | Cache value |
|---|---|---|---|
| Shared utility package | Unit tests, property tests, type tests | Package maintainers | High, deterministic and fast |
| UI component package | Component tests, accessibility assertions, visual stories | Design system team | High if screenshots are stable |
| API client package | Contract tests against mock server, schema tests | API platform or consumer team | Medium, depends on fixtures |
| Web app package | Route tests, integration tests, smoke flows | App team | Medium, more inputs |
| End-to-end workspace | Playwright or Cypress journey tests | QA/platform | Lower cacheability, high release value |

If a shared package change triggers a full app E2E suite every time, the graph may be correct but the test ownership is not. Add narrower tests closer to the changed code.

## A Cache-Aware turbo.json

Turborepo tasks should declare dependencies and outputs honestly. Test tasks often have no persistent outputs unless they generate coverage or reports. Lint and typecheck may not need outputs. Build tasks usually do.

\`\`\`json
{
  \"$schema\": \"https://turbo.build/schema.json\",
  \"tasks\": {
    \"build\": {
      \"dependsOn\": [\"^build\"],
      \"outputs\": [\"dist/**\", \".next/**\", \"!.next/cache/**\"]
    },
    \"typecheck\": {
      \"dependsOn\": [\"^build\"],
      \"outputs\": []
    },
    \"test\": {
      \"dependsOn\": [\"^build\"],
      \"outputs\": [\"coverage/**\"],
      \"inputs\": [
        \"$TURBO_DEFAULT$\",
        \"src/**\",
        \"test/**\",
        \"tests/**\",
        \"vitest.config.*\"
      ]
    },
    \"e2e\": {
      \"dependsOn\": [\"build\"],
      \"outputs\": [\"test-results/**\", \"playwright-report/**\"],
      \"cache\": false
    }
  }
}
\`\`\`

The \`e2e\` task is marked uncacheable here because browser tests often depend on external services, generated ports, seeded databases, and timing. Some teams safely cache E2E reports for dry runs, but do not make that the default until the suite proves deterministic.

## Affected Execution Is Package-Level by Default

Turborepo's \`--affected\` mode selects packages affected by changed files. By default, the selection is package-level: if a file in a package changes, tasks for that package are in scope. Dependencies and dependents matter through the task graph.

\`\`\`bash
turbo run test --affected
turbo run lint typecheck test --affected
turbo run build test --filter=...[origin/main]
\`\`\`

Use affected execution for pull requests, but keep a full graph run somewhere. Affected mode is excellent for fast feedback, not a permanent replacement for scheduled full validation. Shared config, lockfile behavior, environment differences, and incorrectly declared inputs can still surprise you.

| CI event | Turborepo command posture | Why |
|---|---|---|
| Pull request | Affected lint, typecheck, unit test | Fast feedback on likely impact |
| Merge queue | Affected plus selected app integration tests | Catches combined changes before main |
| Nightly | Full graph test and build | Detects missed inputs and cache assumptions |
| Release branch | Full build, app smoke, E2E | Release confidence beats speed |
| Shared package major change | Widen dependents intentionally | Package-level affected may be too narrow for risk |

The strategy should say when to widen. Otherwise every failure becomes an argument in the pull request.

## Inputs Decide Whether the Cache Is Trustworthy

Turborepo caching is only as good as task inputs. If tests depend on a config file, fixture directory, generated schema, or environment variable that is not captured, cache hits can lie.

| Hidden input | Failure mode | Fix |
|---|---|---|
| Test config file | Test runner behavior changes but cache still hits | Add config pattern to \`inputs\` |
| Fixture directory | Contract fixture changes ignored | Include \`fixtures/**\` |
| Generated OpenAPI schema | Client tests pass against stale schema | Generate before test or include schema file |
| Environment variable | Same code behaves differently by flag | Use env-mode carefully and document required env |
| Root tsconfig | Type behavior changes across packages | Ensure default inputs include root config |
| Package manager lockfile | Dependency behavior changes | Keep lockfile in global dependency inputs |

Do not chase cache hit rate at the expense of correctness. A false cache hit is worse than a slow test because it creates confidence in a test that did not run under the relevant inputs.

## Package Scripts Should Be Predictable

Turborepo orchestrates tasks, but package scripts still define what happens. Keep script names consistent and avoid side effects hidden behind \`test\`.

\`\`\`json
{
  \"name\": \"@acme/pricing\",
  \"scripts\": {
    \"build\": \"tsup src/index.ts --format esm,cjs --dts\",
    \"typecheck\": \"tsc --noEmit\",
    \"test\": \"vitest run --passWithNoTests\",
    \"test:watch\": \"vitest\",
    \"lint\": \"eslint src tests\"
  },
  \"devDependencies\": {
    \"vitest\": \"latest\"
  }
}
\`\`\`

Use \`test:watch\` for local loops and \`test\` for CI-style non-interactive execution. If one package's \`test\` opens a watcher and another exits, Turborepo cannot provide predictable CI.

## Dependency Graph Smells

Turborepo will reveal architecture problems if you let it. When a small shared package invalidates the entire repository, ask whether the dependency is truly shared or just convenient.

| Smell | Graph symptom | Test strategy response |
|---|---|---|
| Kitchen-sink shared package | Almost every app depends on it | Split stable primitives from volatile helpers |
| App imports from another app | Affected scope crosses product boundaries | Extract a package or remove dependency |
| Test utilities shipped in runtime package | Test-only changes trigger app builds | Move test utilities to separate package |
| Global config churn | Many tasks miss cache after small config edits | Version config changes deliberately |
| E2E depends on every build | Pull requests wait on full apps | Create narrower integration tests |

QA engineers should care about these smells because graph design determines test cost. Architecture is a test performance issue.

## Handling End-to-End Tests in a Turborepo

End-to-end tests usually sit above package boundaries. They validate integrated behavior, so affected package selection is less obvious. A practical approach is to tag E2E suites by app and capability, then run smoke subsets for affected apps.

\`\`\`json
{
  \"name\": \"@acme/e2e\",
  \"scripts\": {
    \"e2e\": \"playwright test\",
    \"e2e:checkout\": \"playwright test tests/checkout --project=chromium\",
    \"e2e:smoke\": \"playwright test tests/smoke --project=chromium\"
  },
  \"devDependencies\": {
    \"@playwright/test\": \"latest\"
  }
}
\`\`\`

Then wire CI policy outside Turborepo or through filtered tasks: app package changes run app tests, shared checkout package changes run checkout smoke, release runs full E2E. Do not pretend Turborepo alone knows business criticality. It knows the package graph. You provide risk mapping.

## Remote Cache Governance

Remote caching is a force multiplier for monorepos, but QA should understand what is being reused. Cache artifacts should not include secrets, machine-specific paths that break consumers, or reports that are mistaken for freshly generated evidence.

| Cache decision | Recommendation |
|---|---|
| Build outputs | Cache when deterministic and portable |
| Unit test coverage | Cache if coverage is an output consumers need |
| E2E videos and traces | Usually do not rely on cache for pass/fail evidence |
| Flaky test results | Do not cache your way around nondeterminism |
| Security scan outputs | Be careful, inputs include tool version and database |
| Generated clients | Cache only when schema input is explicit |

When debugging a suspicious pass, rerun with cache disabled. If the result changes, fix inputs or task determinism before trusting the pipeline.

## Test Impact Rules Above the Package Graph

Turborepo understands package dependencies. QA often needs an additional map from package changes to product risk. A checkout component package may technically be used by two apps, but only one app's smoke suite may cover payment authorization. A localization package may affect every screen without changing business logic. Capture these rules explicitly.

\`\`\`ts
// tools/ci/impacted-suites.ts
type Suite = 'unit' | 'web-smoke' | 'checkout-e2e' | 'admin-smoke';

const suiteRules: Array<{ packageName: string; suites: Suite[] }> = [
  { packageName: '@acme/checkout-ui', suites: ['web-smoke', 'checkout-e2e'] },
  { packageName: '@acme/payments-client', suites: ['checkout-e2e'] },
  { packageName: '@acme/admin-permissions', suites: ['admin-smoke'] },
  { packageName: '@acme/i18n', suites: ['web-smoke', 'admin-smoke'] },
];

export function suitesForChangedPackages(packages: string[]): Suite[] {
  const selected = new Set<Suite>(['unit']);

  for (const packageName of packages) {
    const rule = suiteRules.find((item) => item.packageName === packageName);
    for (const suite of rule?.suites ?? []) {
      selected.add(suite);
    }
  }

  return [...selected];
}
\`\`\`

The changed package list can come from Turborepo query output, your CI provider, or a small workspace script. The important part is that risk mapping is reviewed as code. When the payments client starts affecting refunds, update the rule instead of relying on tribal memory.

| Package change | Turborepo sees | QA risk overlay |
|---|---|---|
| Shared date formatter | Dependent packages | Billing cutoff and locale smoke |
| Design system modal | Apps using design system | Accessibility and focus tests |
| API schema package | API clients and apps | Contract tests and consumer smoke |
| Auth middleware | Web app package | Login, logout, session expiry |
| Feature flag client | Many apps | Flag default and fallback tests |

This layer should stay small. If every change maps to every E2E suite, the rules are not adding value.

## Making Flaky Tests Cache-Ineligible

Caching a flaky test result is a confidence problem. If a test sometimes fails and sometimes passes with the same inputs, a cached pass can hide instability. Mark known flaky or environment-sensitive tasks as uncacheable until they are fixed.

\`\`\`json
{
  \"tasks\": {
    \"test:unit\": {
      \"outputs\": [\"coverage/**\"]
    },
    \"test:integration\": {
      \"outputs\": []
    },
    \"test:e2e:flaky-quarantine\": {
      \"cache\": false,
      \"outputs\": [\"test-results/flaky/**\"]
    }
  }
}
\`\`\`

Quarantine should not become a permanent home. It is a routing mechanism for unstable tests while owners investigate. Track count, age, owner, and reason. Turborepo can run the quarantine task separately so the signal remains visible without poisoning the main cache.

## Reviewing Cache Misses Like Test Failures

A sudden cache miss across the workspace is not always bad. It may be caused by a lockfile update, root config change, or Turborepo config edit. But unexplained misses waste CI time and hide input problems. Treat cache behavior as observable infrastructure.

| Cache observation | Likely cause | QA/platform action |
|---|---|---|
| All packages miss after config edit | Global hash changed | Expected, mention in PR |
| One package always misses | Non-deterministic output or undeclared input | Inspect task outputs and generated files |
| Tests hit cache after fixture change | Missing fixture input | Fix \`inputs\` immediately |
| Local hit, CI miss | Environment or path difference | Compare env and tool versions |
| E2E never hits | Task is uncacheable or outputs vary | Accept or split stable subtask |

Fast pipelines are maintained systems. Someone should look at cache behavior after major repo changes, not only after tests fail.

## Type Tests as Monorepo Contracts

In TypeScript monorepos, package APIs often break through types before runtime behavior changes. Add type tests for shared packages that export public helpers, React components, API clients, or generated types. These tests are fast and cache well, and they catch accidental breaking changes that unit tests may miss.

\`\`\`ts
// packages/api-client/test-d/user.contract.test-d.ts
import { expectTypeOf } from 'expect-type';
import { createUserClient } from '../src';

const client = createUserClient({ baseUrl: 'https://api.example.test' });
const user = await client.getUser('user_123');

expectTypeOf(user.id).toEqualTypeOf<string>();
expectTypeOf(user.email).toEqualTypeOf<string>();
expectTypeOf(user.roles).toEqualTypeOf<string[]>();
\`\`\`

Run type tests as a separate task when they use a different runner from unit tests. That gives Turborepo a clean cache key and lets API consumers depend on the contract without running browser tests.

| Type contract | Package that benefits |
|---|---|
| Public API client response | Web apps and worker consumers |
| Component prop names | App packages using design system |
| Event payload type | Producers and consumers in different packages |
| Feature flag keys | Apps and backend packages |
| Test helper signature | Test packages across workspace |

Type tests do not replace runtime tests. They prevent a class of monorepo breakage where code compiles in one package but consumers lose the API shape they rely on.

## Database and Generated Artifact Boundaries

Monorepos often generate clients from database schemas, GraphQL schemas, OpenAPI files, or protobuf definitions. Decide whether generated artifacts are committed or produced in CI, then make the Turborepo inputs reflect that decision. If generated files are committed, tests should fail when source schema and generated output drift. If generated files are built in CI, downstream tasks should depend on the generation task.

| Generation model | Turborepo implication |
|---|---|
| Committed generated client | Include schema and generated files in review |
| Generated during build | Add \`dependsOn\` from tests to generation/build task |
| Per-package generated output | Cache output with package task |
| Root schema feeds many packages | Treat schema as global input or explicit dependency |

Schema drift is a common source of "works locally" failures. A test strategy that ignores generation boundaries will eventually cache a result produced from yesterday's contract.

## Developer Workflow Mirrors CI

Turborepo is most effective when local commands resemble CI commands. Developers should be able to run the same affected unit tests or package-specific tasks before pushing. If CI has a secret impact map that local development cannot reproduce, failures feel arbitrary and developers stop trusting the pipeline.

Document a small command set: test current package, test affected packages, run app smoke locally, and clear cache for suspicious results. Keep watch-mode scripts outside CI task names so local speed does not distort automation. When a package needs special setup, put that setup in the package README or a script rather than in one engineer's shell history.

| Local need | Command style |
|---|---|
| Current package tests | Package manager filter plus \`test\` |
| Changed package set | \`turbo run test --affected\` |
| Suspicious cache hit | Re-run with cache disabled |
| App integration smoke | Filter to app and smoke task |

The easier it is to reproduce CI selection locally, the fewer low-signal reruns the team will need.

Local parity also makes onboarding easier. New package owners learn the graph by running the same tasks CI will run, not by reverse-engineering a failed pipeline log. That habit reduces avoidable reruns and review churn.

## Frequently Asked Questions

### Should every package have its own test script?

Yes, if the package contains behavior. Empty packages can use \`--passWithNoTests\`, but real packages should own their local tests so Turborepo can select and cache them independently.

### Is turbo run test enough for monorepo QA?

No. It is an orchestration command. You still need package-level test ownership, accurate inputs, sensible outputs, affected execution policy, and separate handling for integrated E2E risk.

### Should E2E tasks be cached?

Usually not at first. Browser E2E tests depend on services, data, ports, timing, and screenshots. Cache reports if useful, but do not treat cached E2E passes as equivalent to fresh release evidence until the suite is proven deterministic.

### How often should the full graph run?

Run affected tasks on pull requests and a full graph on a scheduled cadence, merge queue, or release branch. Full runs catch bad input declarations and cross-package assumptions that affected mode can miss.

### What is the biggest Turborepo testing mistake?

Optimizing for cache hit rate before correctness. A fast pipeline that skips relevant tests through missing inputs is worse than a slower honest one.
`,
};
