import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'CI Test Impact Caching Strategy: Fast Pipelines Without False Green Builds',
  description: 'Design a CI test impact caching strategy that safely reuses results, maps changed code to tests, handles uncertainty, and cuts feedback time without missed defects.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# CI Test Impact Caching Strategy: Fast Pipelines Without False Green Builds

A CI test impact caching strategy combines two separate optimizations: impact analysis chooses which tests must run for a change, while caching reuses expensive inputs or proven outputs when their complete validity conditions match. The safe design is conservative. Run tests for directly and transitively affected code, invalidate on test or environment changes, and fall back to broader execution whenever dependency information is incomplete.

The payoff is shorter pull-request feedback without trading away confidence. A correct strategy avoids reinstalling unchanged dependencies, avoids rebuilding identical artifacts, and can reuse test outcomes only when code, test, configuration, runtime, and relevant external inputs are identical. It also schedules full-suite backstops so gaps in the impact model are detected quickly. “No changed test files” is never enough evidence to skip testing.

The central engineering rule is simple: every cached result is a claim that a previous observation remains valid. The cache key must encode all causes that can change that observation. Every impacted-test decision is a claim that omitted tests cannot observe the change. The dependency model must justify that claim, or the pipeline must widen the selection.

## Separate four optimization layers before designing keys

Teams often call every reused directory “the test cache,” which makes failures hard to reason about. Dependency downloads, compiled outputs, test-runner transformations, and completed test results have different producers and invalidation boundaries. Model them separately.

| Layer | Example artifact | Safe validity inputs | Risk if stale |
|---|---|---|---|
| package download cache | npm's downloaded package data | package manager and lockfile ecosystem | slower or incorrect install behavior |
| dependency installation reuse | installed dependency tree | lockfile, runtime, platform, install mode | wrong binary or package version |
| build or transform cache | transpiled package, bundle, generated client | sources, compiler, config, dependencies, environment | tests execute obsolete code |
| test-result cache | pass or fail outcome and reports | test, affected code, runtime, config, fixtures, services | false green build |

Dependency-download caching is the least semantically dangerous because a clean install still validates the lockfile. Reusing a build output has more conditions. Reusing a passing test result is the highest-risk layer because the runner never executes the assertion again. Start with download and build caches. Add result caching only after the input model is measurable and audited.

Impact selection is independent of storage. A pipeline may select 300 affected tests and run all 300 from scratch. Another may select the same tests but restore compiled artifacts. Keeping these decisions independent lets you disable result reuse during an incident without discarding the dependency graph.

## Define the correctness envelope in writing

Before implementation, list inputs that can affect test discovery, execution, and result. Include obvious source files and non-obvious toolchain inputs. The list becomes both a cache-key specification and a review checklist.

| Input family | Concrete examples | Default response to change |
|---|---|---|
| production code | imported modules, templates, schemas | run transitively affected tests |
| test code | specs, fixtures, helpers, snapshots | run owning tests and dependents |
| runner configuration | Playwright or Vitest config, setup files | invalidate relevant result cache |
| toolchain | lockfile, Node version, browser revision | invalidate build and test results |
| environment | feature flags, locale, timezone, OS | partition or invalidate results |
| external contract | service image, database migration, API schema | run contract and integration coverage |
| global behavior | auth middleware, routing, shared CSS | widen selection by declared ownership |

An input does not have to be imported to matter. A test can depend on a database image, seeded clock, environment variable, feature flag, certificate, browser, network stub, or generated file. Static import graphs reveal only part of the causal graph. Add explicit dependency declarations for those edges.

Use a fail-closed rule for uncertainty: unknown change means broad test scope. This does not mean every edit always triggers everything. It means the optimization earns narrowness by proving coverage. A changed documentation file can safely select no runtime tests when repository policy identifies it as isolated. A changed root configuration file should usually select the full suite.

## Compute the comparison range correctly

Impact analysis begins with a change set, and a wrong base produces a wrong test set. For a pull request, compare the pull request head to the merge base with the target branch, not blindly to the previous commit. A branch may contain several commits or be behind its target. The merge base identifies the common ancestor from which the proposed change diverged.

A portable shell step can fetch enough target history, determine the merge base, and emit a NUL-safe changed-file list. In a GitHub Actions pull-request job, \`GITHUB_BASE_REF\` identifies the target branch name.

\`\`\`bash
set -euo pipefail

if [ -z "\${GITHUB_BASE_REF:-}" ]; then
  echo "GITHUB_BASE_REF is required for pull request impact analysis" >&2
  exit 1
fi

git fetch --no-tags origin "\${GITHUB_BASE_REF}:refs/remotes/origin/\${GITHUB_BASE_REF}"
base_sha="$(git merge-base HEAD "origin/\${GITHUB_BASE_REF}")"
git diff --name-status -z "\${base_sha}" HEAD > changed-files.zlist
git rev-parse HEAD > head-sha.txt
printf '%s\\n' "\${base_sha}" > base-sha.txt
\`\`\`

Every backslash shown in the rendered shell has a purpose: variable boundaries are explicit, and the NUL-delimited output safely represents unusual file names. The example requires a checkout with enough history to find the merge base. If the CI checkout is shallow, fetch the target branch history according to repository size and policy, then fail visibly if \`git merge-base\` cannot resolve.

Renames need careful handling. \`--name-status -z\` reports status plus paths, including old and new paths for renames. A simple newline parser may drop one side. Treat both old and new locations as changed so former owners and new owners can contribute tests. Deletions also affect importers even though the deleted file cannot be scanned at head.

For push pipelines, the base depends on the event. Use the event's documented before SHA when valid, but handle a newly created branch and force push explicitly. Scheduled and manual pipelines should normally run the full policy scope rather than invent a comparison base.

## Build impact from dependencies plus declared ownership

The core model is a directed graph. If module A imports B, a change to B can affect A. If test T imports A, T is transitively affected. Traverse reverse dependencies from every changed production or test-support file until reaching owning tests. Then add non-import edges declared by configuration.

\`\`\`text
changed source
    -> direct importers
        -> transitive importers
            -> unit and component tests
            -> owning integration contracts
            -> selected end-to-end journeys
\`\`\`

The graph should be produced by tools that understand the repository's languages, aliases, project references, generated modules, and dynamic loading patterns. Do not parse imports with a quick regular expression and assume completeness. TypeScript path aliases, package exports, conditional resolution, code generation, and runtime module names all complicate the edge set.

Explicit ownership fills semantic gaps. A payment schema might map to API contract tests and a checkout journey. A shared authentication middleware change may select all authenticated packages. A CSS token may select visual tests even though JavaScript import analysis does not show the relationship.

| Changed path pattern | Additional selected scope | Rationale |
|---|---|---|
| \`db/migrations/**\` | database, repository, and critical journey suites | schema changes cross package boundaries |
| \`auth/**\` | authenticated API and UI smoke suites | shared security boundary |
| \`design/tokens/**\` | component and visual suites | style consumers may be generated |
| \`locales/**\` | localization and affected UI routes | text can alter locators and layout |
| root lockfile | all tests or a policy-defined broad set | dependency behavior can change globally |
| CI or test config | suite owned by that configuration | discovery and environment may change |

Store these rules as reviewed repository data rather than scattered shell conditions. Each broad rule should have an owner and explanation. Each narrow rule should be tested against known change scenarios.

## Implement a small, auditable selection policy

The following Node example demonstrates explicit path rules over a newline-delimited fixture list. Save it as \`select-suites.mjs\` and run it with Node after creating \`changed-paths.txt\`. It is intentionally a policy layer, not an import-graph parser. A production system can feed it the graph-derived tests, then widen the selection for global changes.

\`\`\`js
import { readFile } from 'node:fs/promises';

const changed = (await readFile('changed-paths.txt', 'utf8'))
  .split('\\n')
  .map((line) => line.trim())
  .filter(Boolean);

const allSuites = ['unit', 'component', 'api', 'e2e', 'visual'];
const selected = new Set();

for (const file of changed) {
  if (file === 'package-lock.json' || file.startsWith('test-config/')) {
    for (const suite of allSuites) selected.add(suite);
    continue;
  }
  if (file.startsWith('src/auth/')) {
    selected.add('unit');
    selected.add('api');
    selected.add('e2e');
  }
  if (file.startsWith('src/components/')) {
    selected.add('unit');
    selected.add('component');
    selected.add('visual');
  }
  if (file.startsWith('db/migrations/')) {
    selected.add('api');
    selected.add('e2e');
  }
  if (file.startsWith('tests/')) {
    selected.add('unit');
  }
}

if (changed.length > 0 && selected.size === 0) {
  selected.add('unit');
}

process.stdout.write(JSON.stringify([...selected].sort()) + '\\n');
\`\`\`

This fallback chooses unit tests for an unknown nonempty change only as an illustrative minimal policy. A safety-critical or poorly mapped repository should select all suites on unknown paths. The key property is that unknown does not silently become zero tests.

Test the selector itself as production logic. Give it table-driven cases for a leaf module, shared module, deleted source, renamed package, test fixture, lockfile, migration, documentation-only edit, and unknown path. Assert both the included suites and permitted exclusions. A broken optimization controller can invalidate every test beneath it.

\`\`\`js
import assert from 'node:assert/strict';

function selectSuites(paths) {
  const selected = new Set();
  for (const file of paths) {
    if (file === 'package-lock.json') return ['api', 'component', 'e2e', 'unit', 'visual'];
    if (file.startsWith('src/auth/')) {
      selected.add('api');
      selected.add('e2e');
      selected.add('unit');
    }
    if (file.startsWith('docs/')) continue;
  }
  if (paths.length > 0 && selected.size === 0 && !paths.every((p) => p.startsWith('docs/'))) {
    return ['api', 'component', 'e2e', 'unit', 'visual'];
  }
  return [...selected].sort();
}

assert.deepEqual(selectSuites(['src/auth/session.ts']), ['api', 'e2e', 'unit']);
assert.deepEqual(selectSuites(['docs/review.md']), []);
assert.deepEqual(
  selectSuites(['unknown/tooling-file']),
  ['api', 'component', 'e2e', 'unit', 'visual']
);
assert.deepEqual(
  selectSuites(['package-lock.json']),
  ['api', 'component', 'e2e', 'unit', 'visual']
);

console.log('selection policy verified');
\`\`\`

Keep the actual implementation and its test in one owned package so behavior does not drift between local and CI scripts.

## Design cache keys from producers, not directory names

A cache key describes a computation. Start with the output, identify its producer and every relevant input, then serialize stable fingerprints. For build output, inputs may include source closure, compiler version, config, lockfile, runtime major version, operating system, architecture, and selected feature flags. For test results, add test code, fixtures, runner configuration, service contracts, and browser identity.

A useful conceptual key looks like this:

\`\`\`text
test-result-v3
  / operating-system
  / architecture
  / runtime-version
  / lockfile-hash
  / runner-config-hash
  / test-file-hash
  / transitive-production-input-hash
  / fixture-and-service-contract-hash
\`\`\`

The \`v3\` namespace is illustrative. A manually bumped schema component gives maintainers a clean invalidation lever when key semantics change. Do not rely only on commit SHA for reusable results: it prevents cross-commit reuse entirely. Do not rely only on changed paths either: two different file contents can share the same path set.

Hash content, not modification timestamps. Normalize ordering before hashing a set. Include file paths as well as bytes so moving two identically sized files does not accidentally preserve identity. Use a cryptographic hash provided by the platform; collision resistance is cheap insurance for correctness keys.

The following script produces a deterministic digest for an explicit file list using Node's built-in crypto module. Save it as \`hash-inputs.mjs\`, then pass the input paths as command arguments. Paths are sorted and each path plus content is length-delimited before hashing.

\`\`\`js
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const files = process.argv.slice(2).sort();
if (files.length === 0) throw new Error('provide at least one input file');

const hash = createHash('sha256');
for (const file of files) {
  const content = await readFile(file);
  hash.update(String(Buffer.byteLength(file)) + ':');
  hash.update(file);
  hash.update(String(content.length) + ':');
  hash.update(content);
}

process.stdout.write(hash.digest('hex') + '\\n');
\`\`\`

Invoke it with an already resolved closure, for example the test, its helpers, production dependencies, and relevant configuration. The difficult part is completeness of that closure, not the hashing function.

## Use restore keys only for artifacts that tolerate partial matches

Many CI cache systems support prefix-based restore keys. That is useful for download caches where an older cache can still accelerate acquisition and a clean install verifies exact requirements. It is unsafe for a test-result cache unless the consumer revalidates every missing key dimension. A near match is not proof that a previous pass remains valid.

In GitHub Actions, \`actions/setup-node\` can manage package-manager data caching. The following job uses lockfile-aware npm caching, installs cleanly, computes selection, and runs a repository script. It does not reuse completed test outcomes.

\`\`\`yaml
name: pull-request-tests

on:
  pull_request:

jobs:
  impacted-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run impact:changed-files
        env:
          TARGET_BRANCH: \${{ github.base_ref }}
      - run: npm run test:impacted
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: impacted-test-report
          path: test-results/
          retention-days: 7
\`\`\`

The workflow assumes those two npm scripts exist in the repository and implement the reviewed policy. It deliberately uses a full checkout for straightforward merge-base calculation. Large repositories may adopt a bounded fetch strategy, but must detect and handle a missing merge base rather than proceeding with an incomplete diff.

Cache keys should also be scoped for trust. Untrusted pull requests must not be able to populate a cache later consumed as executable content by privileged main-branch jobs. Follow the CI provider's cache isolation model, avoid storing secrets, validate restored artifacts, and separate trusted and untrusted namespaces where required.

## Decide when test-result reuse is justified

Result reuse is most credible for deterministic hermetic unit tests whose full transitive inputs are known. It is least credible for end-to-end tests that depend on browser binaries, servers, databases, clocks, queues, third-party sandboxes, and asynchronous cleanup. For E2E, caching downloads and build products usually offers safer speedups than caching “pass.”

| Test type | Result reuse suitability | Primary concern |
|---|---|---|
| pure function unit test | potentially strong | complete source and runtime closure |
| component test with snapshots | moderate | renderer, fonts, browser, snapshots |
| API integration test | low to moderate | service image, database and configuration |
| browser end-to-end test | usually low | many environmental and stateful inputs |
| contract test against pinned schema fixture | moderate | fixture provenance and generator version |
| live third-party smoke test | poor | remote state changes outside repository |

If a result cache is introduced, store more than a boolean. Record the test identifier, key schema version, input digest, runner identity, start time, duration, outcome, and artifact references. Reject results produced by an incompatible schema or trust domain. Consider reusing only passes, while rerunning previous failures because infrastructure and flake diagnosis benefit from fresh evidence.

Do not cache a flaky pass as if it were deterministic. Track repeatability first. A result that alternates without input changes has revealed an unmodeled input or race, so caching freezes chance rather than knowledge.

## Handle generated files, schemas, and migrations explicitly

Generated artifacts create double-entry dependency edges. A source schema changes the generator output, and consumers depend on that output. If CI generates files after impact selection, the selector may see no changed generated path and skip consumers. Model the source schema as an ancestor of every generated output, or generate before final selection and compare the resulting artifacts.

Compiler and generator versions belong in build keys. If they arrive through the lockfile, the lockfile fingerprint may cover them, but global tools or container-bundled generators need explicit identities. Configuration and templates also affect output.

Database migrations are rarely safe to map only by imports. They can alter constraints, defaults, indexing, transaction behavior, and rollback expectations across the application. Use declared broad ownership. Run migration verification against the supported upgrade path, then select repository and critical journey tests. Cache a prepared database only if engine version, migration set, seed inputs, extensions, and initialization options are all part of its identity.

## Diagnose a false green caused by an incomplete cache key

Consider a monorepo that caches passing component tests using a key made from the component source and test file. A change to \`theme/tokens.css\` modifies a global spacing variable consumed through the test renderer's setup file. Neither the component nor test file changes, so CI restores the old pass. The pull request merges with a broken narrow layout.

Diagnosis starts from the omitted input:

1. Re-run the test with result caching disabled and reproduce the failure.
2. Record the loaded CSS and setup-file dependency path.
3. Compare the cache manifest with the actual runtime inputs.
4. Add the theme token closure and renderer setup to the key.
5. Add a selector-policy test for a token change.
6. Search recent cache hits for other results created with the incomplete schema.
7. Bump the cache-key namespace to prevent reuse of old manifests.

The immediate repair is invalidation, but the deeper fix is observability. Every cache hit should say which key schema, producer, input digest, and source run justified reuse. Without a manifest, a cache hit is an opaque shortcut and incident responders cannot assess its blast radius.

Another realistic failure uses the wrong pull-request base. A feature branch contains three commits, but the job diffs only \`HEAD~1\`. Tests affected by the first two commits disappear from selection. The selector itself behaves perfectly on incomplete input. The fix is merge-base comparison, plus a policy test that simulates a multi-commit branch.

## Measure safety and speed together

Pipeline duration alone rewards overly aggressive skipping. Track optimization effectiveness alongside disagreement with full-suite backstops. Useful measures include selected test count, executed count, result-cache hit count, dependency-cache hit, selection time, queue time, execution time, cache restore time, and bytes transferred.

Safety measures matter more: impacted pass followed by full-suite failure, tests found only by scheduled runs, cache hit followed by failure when recomputed, unknown-path fallback rate, and changes that select zero tests. Review each disagreement as a model defect until proven otherwise.

Use shadow mode before enforcing selection. Compute and report the impacted set while still running the full suite. Compare whether every failing test was included. Run this across representative changes, especially renames, deletions, shared libraries, configuration, generated code, and migrations. When confidence is adequate, make impacted tests the pull-request gate while retaining full runs on the main branch or schedule.

No universal percentage defines success. Repository topology, test cost, change distribution, and risk tolerance differ. Use your own baseline and label all projections as illustrative. A strategy that saves two minutes but produces one unexplained false green is not mature.

## Layer pull-request, main-branch, and scheduled coverage

Fast pull requests should run impacted tests plus mandatory smoke and policy suites. The main branch should run a broader or full suite after integration, because combinations of independently safe changes can interact. Scheduled runs can cover expensive browsers, platforms, migration paths, reliability repetitions, and live integrations.

Cancellation policy affects efficiency too. When a new commit supersedes an older pull-request run, canceling stale work can release capacity, provided any produced cache entries remain correctly scoped and atomic. The guide to [canceling stale E2E runs on a new commit](/blog/ci-cancel-stale-e2e-runs-on-new-commit) explains that lifecycle. For the change-set side of the design, [CI test selection by Git diff](/blog/ci-test-selection-by-git-diff) goes deeper into comparison ranges and path-driven selection.

Do not let cancellation leave a partially written shared cache that appears complete. Producers should write to a temporary location and publish an immutable entry only after successful completion. Consumers should validate a manifest before use. Provider-managed caches may have their own immutability semantics, so align the design with documented behavior.

## Review the strategy as a safety-critical subsystem

Assign ownership to the dependency graph, path policy, cache schemas, and backstop dashboards. Require reviews from test infrastructure owners when global mappings narrow. Add a manual switch to disable result reuse and widen selection during incidents. That switch should be exercised periodically, not discovered broken during a release.

What people get wrong is assuming the cache and impacted set are harmless optimizations outside the tested product. They decide which evidence exists for merging code, so they are part of the assurance system. Unit-test the selector, validate manifests, observe misses and hits, and intentionally inject representative changes to confirm the expected suites run.

A mature CI test impact caching strategy is explainable for any job: these files changed, these dependency and ownership edges selected these tests, these exact inputs justified these cache hits, and these backstops guard model uncertainty. If the system cannot produce that explanation, narrow reuse before optimizing further.

## Frequently Asked Questions

### Should CI cache passing end-to-end test results?

Usually start elsewhere. Browser end-to-end outcomes depend on many inputs, including built assets, browser revision, server images, data, flags, clocks, queues, and environment resources. Caching dependencies and deterministic build outputs often provides substantial savings with less false-green risk. Reuse an E2E pass only if the complete input contract is known, the test is repeatable, trust boundaries are enforced, and frequent full-suite backstops measure disagreement.

### What should happen when impact analysis cannot map a changed file?

The pipeline should widen selection according to a documented fail-closed policy. In a well-mapped low-risk repository, that might mean a mandatory unit and smoke set. In a high-risk or immature model, it should mean all relevant suites. Report unknown paths so owners improve the graph. Never silently select zero tests for a nonempty unknown change, because absence of an edge may be a modeling gap rather than evidence of isolation.

### How do I know whether a cache key is complete?

Start from the cached computation and enumerate everything that can influence its output: source closure, tests, helpers, configuration, runtime, platform, tools, fixtures, services, flags, and generated inputs. Inspect actual runtime dependencies and compare them with a stored manifest. Then run controlled invalidation tests by changing each input family. Completeness is an evidence-backed property that must be monitored, not a one-time naming exercise.

### How often should the full test suite still run?

Choose a cadence that limits the time an impact-model gap can remain undetected. Many teams run broader coverage on the main branch and a full set on a schedule, while high-risk repositories may require the full suite before merge. Base the decision on suite duration, release frequency, incident tolerance, and observed disagreement. Always run broadly after graph, toolchain, configuration, or cache-schema changes, and investigate every failure omitted by the impacted set.
`,
};
