import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest module reset dynamic imports',
  description:
    'Vitest module reset dynamic imports: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Unit Testing',
  primaryKeyword: 'Vitest module reset dynamic imports',
  keywords: [
    'Vitest module reset dynamic imports',
    'Vitest resetModules dynamic import',
    'fresh module instance Vitest',
    'Vitest module cache isolation',
    'dynamic import after reset',
    'Vitest singleton reset test',
  ],
  relatedSlugs: [
    'vitest-config-setup-guide-2026',
    'jest-vs-vitest-2026',
    'vitest-mocking-vi-mock-complete-guide',
    'vitest-workspace-monorepo-testing-guide',
  ],
  sources: [
    'https://vitest.dev/config/sequence',
    'https://vitest.dev/config/environment',
    'https://vitest.dev/guide/mocking/modules',
  ],
  repoEvidence: ['seed-skills/vitest-testing/SKILL.md', 'seed-skills/vitest/SKILL.md'],
  content: `Vitest module reset dynamic imports clear the module cache before each case sets its own state and loads the file. The test must wait for that load, check a new boot value and fresh count, then clear env and mock state; a top-level import still keeps its old link.

## What does Vitest module reset dynamic imports verify?

This test asks if the file ran again after the cache was cleared. It checks the value read at load time, the first count kept in file scope, the new file object, the chosen mock, and the clean state left for the next case.

- JavaScript modules normally evaluate once per module registry and then return their cached namespace. A stateful singleton can therefore retain values between tests in one worker.

- vi.resetModules clears the relevant Vitest module registry so a later import can evaluate the subject again. It does not retroactively change references held by an earlier static import.

- A dynamic import runs at the point where the test awaits it. That timing lets the case reset the registry, install its environment or dependency state, and only then evaluate the subject.

- Static imports are resolved before ordinary test statements execute. Calling resetModules afterward cannot make an existing static binding point to a new namespace.

- The fixture should expose one value read at evaluation time and one module-local counter. Those fields prove both configuration and singleton state were refreshed.

- Namespace identity is useful supporting evidence. The strongest oracle still checks observable exports because identity alone does not prove the module read the intended state.

- Environment state, fake timers, spies, and mocks have their own cleanup APIs. A registry reset should never stand in for restoring those separate resources.

- The repository path seed-skills/vitest-testing/SKILL.md explains that vi.mock factories are hoisted and recommends vi.hoisted when factories need shared handles. It also recommends restoring mocks and selecting the right test environment.

- The path seed-skills/vitest/SKILL.md shows module mocking, isolation configuration, and explicit cleanup patterns. It says tests should avoid shared mutable state, which directly supports this fixture design.

- The official [Vitest module mocking guide](https://vitest.dev/guide/mocking/modules) defines how module interception and import behavior work. Use it for mock timing, while this article adds a stateful reset matrix.

- The [Vitest setup guide](/blog/vitest-config-setup-guide-2026) covers the wider runner configuration. This article owns evaluation timing after a module registry reset.

- A passing record stores case ID, worker ID, expected mode, observed boot mode, first counter value, namespace comparison, mock plan, import completion, and cleanup result.

Vitest module reset dynamic imports pass only when each case gets the file state it set up for that load. A call count on vi.resetModules is not proof, since a top-level import, saved promise, or load with no await can still use old state.

## How do you build a Vitest resetModules dynamic import?

Make a small file that reads one env value as it loads and keeps one count in file scope. In each test, clear the cache, set that case value, load the file with import, wait for it, and check both exports before any more state can change.

- Keep the subject in its own file with no top-level import from the test. Even a helper imported at test-file scope can pull the subject into the registry earlier than intended.

- Export bootMode from process.env when the fixture evaluates. Later environment changes should not alter that constant, which makes stale evaluation visible.

- Export nextValue from a module-local counter initialized to zero. The first call should return one for every genuinely fresh import.

- Give each case a distinct mode such as alpha and beta. Repeated identical values cannot prove the second import observed the second setup.

- Use vi.stubEnv for owned environment changes, then call vi.unstubAllEnvs during cleanup. Direct process.env writes need equally explicit restoration.

- Await the import promise before calling nextValue. An unawaited import can finish after the case cleans its environment and produce nondeterministic boot state.

- The first example adapts reset and isolation patterns from seed-skills/vitest-testing/SKILL.md. The fixture and test stay separate so no static import evaluates the subject before reset.

\`\`\`typescript
// stateful-config.ts
export const bootMode = process.env.APP_MODE ?? 'unset';

let counter = 0;
export function nextValue() {
  counter += 1;
  return counter;
}

// stateful-config.test.ts
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

async function importFor(mode: string) {
  vi.resetModules();
  vi.stubEnv('APP_MODE', mode);
  return import('./stateful-config');
}

it.each(['alpha', 'beta'])('evaluates in %s mode', async (mode) => {
  const subject = await importFor(mode);
  expect(subject.bootMode).toBe(mode);
  expect(subject.nextValue()).toBe(1);
  expect(subject.nextValue()).toBe(2);
});
\`\`\`

- The helper resets before it stubs the environment, but the essential rule is that both operations finish before import. Keep that order stable and document it in the test.

- afterEach repeats reset as defensive cleanup for later tests. The next case still resets at setup because it should not depend on a previous case reaching cleanup.

- Do not place the parameter rows under test.concurrent. They mutate one worker's environment and module registry, so concurrent execution would invalidate the isolation premise.

- Use the [Vitest mocking guide](/blog/vitest-mocking-vi-mock-complete-guide) when dependencies also need interception. Keep dependency mock timing explicit beside the dynamic import.

## What breaks fresh module instance Vitest?

The fresh load fails if a top-level import ran first, a helper saved the file object, reset came too late, or the test did not await the load. Two tests that change one cache or env at once can also cross, and old mock state can skew the new file.

- A top-level import is the most common defect. Its binding remains attached to the original namespace even when a later dynamic import creates another evaluation.

- A module-level variable that stores await import creates a second cache outside Vitest's registry. Resetting the runner registry cannot clear that application or test helper reference.

- Calling import before vi.resetModules establishes the stale namespace first. Moving reset one line later does not repair the already returned object.

- Omitting await lets assertions, cleanup, or another case race module evaluation. The observed mode can then depend on event-loop timing rather than test order.

- vi.mock calls are hoisted. A mock declared inside ordinary source layout can still be registered before imports, so its timing differs from a per-case imperative setup.

- resetModules and mock reset are different operations. A fresh subject can still receive a persistent mocked dependency unless the case changes or removes that mock deliberately.

- vi.clearAllMocks clears call history but does not create a new module evaluation. vi.restoreAllMocks restores spies but does not replace a cached singleton namespace.

- An environment variable left by a failing case can become the next module's boot value. Cleanup needs a finally or afterEach path that runs even when assertions fail.

- Concurrent tests in one worker can interleave reset, environment setup, and import. Run this file serially or redesign the subject to accept configuration through dependency injection.

- Setup files can import shared modules before test cases. Audit the import graph when reset appears ineffective, because an indirect early import is less obvious than a direct static statement.

- The [Vitest environment configuration](https://vitest.dev/config/environment) describes available test environments and per-file selection. Environment choice affects globals, but it does not replace module registry control within one file.

- The [Jest versus Vitest guide](/blog/jest-vs-vitest-2026) covers migration differences. Do not translate module reset assumptions without verifying Vitest's import and mock behavior directly.

## Vitest module cache isolation fixtures and controls

Start with one clean load, then make rows with no reset, late reset, a top-level link, a new env value, a raised mock, a load with no await, two calls at once, repeat runs, and cleanup. Each row should show one known old or fresh value.

- The baseline resets, stubs alpha, imports dynamically, and expects bootMode alpha with first counter one. It proves the fixture and import path work before faults are introduced.

- The no-reset case imports once, increments the counter, changes environment, and imports again without reset. Expect the same namespace, old boot mode, and continued counter.

- The proper-reset case repeats that sequence with reset before the second import. Expect a different namespace, new boot mode, and counter restarted at one.

- The late-reset case imports beta before reset and keeps that namespace. A later reset may affect future imports, but it must not rewrite the saved beta object.

- The static case imports the fixture at file scope in a dedicated test file. After reset and dynamic import, compare the unchanged static binding with the fresh namespace.

- The environment case changes APP_MODE before dynamic import and leaves every other input fixed. The exported boot value should equal the new case value exactly.

- The hoisted-mock case supplies one dependency through vi.mock and documents that its registration is not sequenced like ordinary in-test code. Use vi.doMock when a non-hoisted next-import plan is required.

- The unresolved case starts an import and immediately cleans the environment. Its mutation should fail the awaited expected-mode assertion, proving that completion is part of the contract.

- The concurrent case intentionally overlaps two reset and import sequences in a diagnostic test. Keep it skipped or mutation-only in normal CI, because the production regression should avoid shared concurrent changes.

- The repeat case runs the serial matrix several times with fixed modes. Every repetition should produce the same namespace relations and initial counter values.

- The failure-cleanup case throws after import, then a following sentinel case confirms environment, mocks, timers, and registry state were restored.

- The file-isolation control runs the same fixture in two worker files. Record worker and file identity without assuming that file isolation solves state shared through external services or process globals.

## How should dynamic import after reset be asserted?

Check the facts that code can see: a new file object, the right boot value, a first count of one, the planned mock result, and a load that has ended. Then check cleanup on its own, so a good fresh load cannot hide an env or mock leak.

- Save the first namespace and its values before reset. After the second import, require a different object and compare specific exports rather than relying on object inequality alone.

- Assert the first counter call is one. This proves module-local state restarted instead of merely proving one configuration string changed.

- Assert bootMode equals the value installed before import. A namespace can be new yet still evaluate after cleanup and read unset or stale state.

- Add an evaluation ID in a test-only fixture when identity needs clearer evidence. Do not add random production behavior solely to satisfy a unit test.

- Assert dependency results when mocks change by case. Registry reset can refresh the subject while a hoisted dependency mock remains deliberately active.

- Track import completion with the awaited namespace itself or an explicit fixture event. Timer advancement does not prove a dynamic import has resolved.

- The second example adapts module mocking and cleanup distinctions from seed-skills/vitest/SKILL.md. It characterizes the saved static binding without pretending reset can mutate it.

\`\`\`typescript
import { afterEach, expect, it, vi } from 'vitest';
import * as staticSubject from './stateful-config';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it('keeps a static binding while a later dynamic import is fresh', async () => {
  const originalMode = staticSubject.bootMode;
  staticSubject.nextValue();

  vi.resetModules();
  vi.stubEnv('APP_MODE', 'dynamic-case');
  const freshSubject = await import('./stateful-config');

  expect(freshSubject).not.toBe(staticSubject);
  expect(freshSubject.bootMode).toBe('dynamic-case');
  expect(freshSubject.nextValue()).toBe(1);
  expect(staticSubject.bootMode).toBe(originalMode);
  expect(staticSubject.nextValue()).toBe(2);
});
\`\`\`

- Keep this characterization in a separate file from the clean dynamic matrix. Its top-level import would intentionally invalidate the no-static-import premise of that matrix.

- The expected static counter assumes no other test in that file calls nextValue. Reset test setup or split files when adding more cases.

- Add a namespace cache helper mutation and show that its saved promise returns the old object after runner reset. This catches hidden caching in test utilities.

- If only bootMode changes while the counter continues, inspect whether the fixture reads environment lazily rather than during evaluation. The oracle must match actual module design.

- The strongest assertion combines configuration, state, identity, dependency, completion, and cleanup. Each field points to a different failure mechanism.

## Vitest singleton reset test in CI

Run this small file in order with fixed Vitest and Node builds and no web calls. The Vitest module reset dynamic imports job should save case order, safe export values, worker ID, load end, and cleanup state without dumping file objects; use the [unit test FAQ](/faq) when a row fails.

- Pin Vitest, Vite, Node, pool configuration, and environment. Module execution behavior can change with runner or transform updates, so lockfile and runtime revisions belong in evidence.

- Keep the stateful fixture local to the test package. An alias resolving to two file paths can create two module identities and make a cache test appear fresh for the wrong reason.

- Run the Vitest module reset dynamic imports matrix without test.concurrent. If the suite enables concurrency globally, override or isolate this file so registry and environment mutation stay serial.

- The [Vitest sequence configuration](https://vitest.dev/config/sequence) documents sequencing controls for files, setup files, hooks, and concurrent work. Use the smallest setting that makes the owned mutation order explicit.

- Require expected collected and completed case counts. A filtered parameter row or aborted dynamic import must fail the gate even if remaining assertions pass.

- Record module specifier and resolved fixture path when debugging identity. Different query strings or aliases can intentionally create distinct cache keys, which is not the reset behavior under test.

- Run a no-reset characterization beside the positive matrix. It should retain old mode and counter, proving the fixture can distinguish cached from fresh evaluation.

- Run one mutation review that removes reset, moves it after import, omits await, or enables concurrency. Each change should produce a stable, named failure.

- Keep environment and mock cleanup in afterEach, then verify a final sentinel. A failed earlier assertion must not leave the worker contaminated for unrelated tests.

- Do not store process.env snapshots or dependency secrets in the artifact. Case IDs, synthetic modes, counters, mock labels, and cleanup booleans are enough.

- The [Vitest workspace guide](/blog/vitest-workspace-monorepo-testing-guide) covers package-level projects. Keep this focused singleton case in the project that owns the module under test.

- Block release for stale boot values, continued counters after expected reset, incomplete imports, wrong mocks, concurrent registry mutation, missing cases, or failed cleanup. Assign each failure to test setup or module design before changing assertions.

## Vitest module reset dynamic imports comparison matrix

Use one test file and plain alpha or beta modes for all rows. The file object, boot value, and first count show if the code ran again, while the [unit testing category](/categories/unit-testing) can guide the rest of the suite.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Dynamic import without resetModules | Import alpha, increment, set beta, import again | Same namespace, alpha boot value, continued counter | Test incorrectly claims a fresh instance | seed-skills/vitest-testing/SKILL.md |
| resetModules before dynamic import | Reset, set beta, then await import | New namespace, beta boot value, counter one | Any stale value or unfinished import | [Vitest module mocking](https://vitest.dev/guide/mocking/modules) |
| Static import followed by resetModules | Save top-level namespace, reset, dynamically import | Static binding stays old; dynamic namespace is fresh | Existing binding is expected to change | seed-skills/vitest/SKILL.md |
| Environment changed before import | Reset, stub a distinct mode, await import | Exported boot mode equals that case | Cleanup or timing supplies another value | [Vitest environments](https://vitest.dev/config/environment) |
| Two concurrent singleton tests | Overlap reset, environment, and import steps | Diagnostic exposes shared mutation risk | Concurrent result is accepted as isolated | [Vitest sequence](https://vitest.dev/config/sequence) |

- Row one is a characterization control, not the desired isolated pattern. Its stale values prove the fixture can reveal cache reuse.

- Row two is the positive rule. Reset and case setup both complete before the dynamic import begins, and assertions wait for its namespace.

- Row three documents the boundary of reset. Existing import bindings remain valid references and should never be expected to retarget.

- Row four isolates evaluation-time configuration. Different synthetic values make stale environment or late cleanup visible immediately.

- Row five should guide test design rather than normalize a race. Keep shared registry and environment mutation out of concurrent cases.

- Add hoisted-mock and helper-cache rows when the subject has dependencies or test utilities. Preserve one changed input per row so diagnostics stay direct.

## How do you implement Vitest module reset dynamic imports?

Use a small state file, set state before import, await each load, run rows in order, and clear each kind of state with its own tool. Prove the old-cache case first, then show the [QA blog](/blog) result for a reset load with the new boot value and count.

1. Read seed-skills/vitest-testing/SKILL.md and seed-skills/vitest/SKILL.md. Record their hoisted mock, environment, isolation, restoration, and shared-state guidance before defining the fixture's observable reset contract.
2. Create a separate singleton fixture that reads a synthetic environment value during evaluation and increments module-local state. Avoid importing that subject from top-level helpers used by the clean matrix.
3. Run the no-reset characterization, then reset modules, set a new mode, dynamically import, await completion, and assert namespace, boot value, first counter, dependency behavior, and expected case count.
4. Add late reset, static binding, helper cache, hoisted mock, unresolved promise, changed environment, concurrent mutation, repeated-run, and failed-cleanup cases separately. Keep synthetic values distinct.
5. Compare results with the five-row matrix, and report stale namespace, stale configuration, continued state, wrong dependency, incomplete import, race, or cleanup failure as separate conditions.
6. Run the focused file serially in CI, pin runner metadata, require all cases, execute a cleanup sentinel, and review any import-graph or mock-policy change before updating expectations.

- Search the fixture's import graph before blaming resetModules. An indirect top-level import can establish state earlier than the test source suggests.

- Prefer dependency injection when state can be passed explicitly. Registry reset is useful for modules whose evaluation behavior is itself part of the contract.

- Keep dynamic specifiers literal and consistent. Alias or query changes can create different identities without exercising the reset operation being studied.

- Separate hoisted vi.mock declarations from per-case vi.doMock plans. Their different timing should be visible in test names and expected evidence.

- Use the [Vitest mock guide](/blog/vitest-mocking-vi-mock-complete-guide) for wider dependency patterns. Do not reset whole modules merely to clear one function's call history.

- Browse verified [unit testing skills](/skills) for the repository examples used here. The package owner still decides which singleton state and evaluation inputs are contractual.

- Use the [blog index](/blog) for broader unit and workspace testing. Keep this gate responsible for module evaluation timing within its owned worker.

Module-isolation diagnostics should capture resolved specifier, worker identity, registry-reset order, environment mutation, mock registration mode, imported namespace relation, and completion state for each evaluation. That structured evidence separates stale module caching from hoisted interception, helper-level promise reuse, configuration leakage, alias divergence, or concurrent test interference.

Deterministic verification also requires serial execution for shared mutations, explicit cleanup of spies and timers, exact case cardinality, and pinned transform configuration. These controls prevent an indirect setup import, resolution difference, incomplete dynamic operation, or contaminated worker state from being misclassified as successful singleton reinitialization.

## Frequently Asked Questions

### How can Vitest tests reset module state and use dynamic imports so each case receives a fresh module instance?

Keep the file out of top-level imports, clear the cache, set fake env or mock state, then await import in the test. Check a new file object, the new boot value, and a count of one; run in order, then clear env and mocks with their own Vitest calls.

### What should an Vitest resetModules dynamic import fixture record?

Save case ID, import text, file path when needed, worker and test file, planned mode, seen boot value, first count, old-or-new file link, mock plan, load end, tool builds, and cleanup. Fake values give enough proof, so do not dump file objects or all process env data.

### Which failure proves fresh module instance Vitest is broken?

An old boot value, a count that goes on, the same file object after reset, or a load that ends after cleanup proves the pattern failed. First check file path and row count; a wrong helper result may be old raised mock state, which has its own fix.

### How do teams isolate Vitest module cache isolation?

Use one small state file and one test file that runs in order, with no top-level or helper load of the subject. Clear the cache for each setup, use a new case value, await each import, clear env, mocks, spies, and clocks, then let a last check prove clean state.

### Which assertion is strongest for dynamic import after reset?

Check that the new file object differs, the boot value is exact, the first local count is one, the helper gives its planned result, and the load has ended. Then check the old saved object still has old state, since reset does not point an old import at new code.

### How should CI report Vitest singleton reset test failures?

Report case and worker IDs, tool builds, import text, planned and seen mode, first count, old-or-new object link, mock tag, load end, row counts, and cleanup. Keep old cache, bad step order, mock leak, race, and lost proof apart so the right owner can fix the fault.

## Conclusion

Vitest module reset dynamic imports work when cache reset and case setup both end before an awaited import loads the file. A new file object, the right boot value, fresh local count, ordered rows, and clean env plus mocks prove the case is fresh without false claims about old links.

Read the [Vitest configuration guide](/blog/vitest-config-setup-guide-2026), then open verified [QA skills](/skills) and run this grid in the next small test job. Keep the old-cache row by the fresh row, so a new tool build can be checked against the same plain facts.`,
};
