import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Promptfoo eval cache invalidation testing',
  description:
    'Promptfoo eval cache invalidation testing: use repo evidence, fixtures, code examples, and CI checks to expose AI contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Promptfoo eval cache invalidation testing',
  keywords: [
    'Promptfoo eval cache invalidation testing',
    'how to promptfoo eval cache invalidation testing',
    'promptfoo eval cache invalidation testing example',
    'Promptfoo stale cache test',
    'Promptfoo provider cache key',
    'disable Promptfoo cache in CI',
  ],
  relatedSlugs: [
    'promptfoo-complete-guide-2026',
    'promptfoo-red-teaming-llm-applications',
    'prompt-injection-testing-guide-2026',
    'promptfoo-variable-matrix-prompt-versions',
  ],
  sources: [
    'https://www.promptfoo.dev/docs/configuration/caching/',
    'https://www.promptfoo.dev/docs/configuration/guide/',
    'https://www.promptfoo.dev/docs/providers/',
  ],
  repoEvidence: [
    'packages/web/src/app/blog/posts/pillar-promptfoo-2026.ts',
    'seed-skills/prompt-testing/SKILL.md',
  ],
  content: `Promptfoo eval cache invalidation testing runs controlled setup pairs against a counted local server and an isolated cache path. Identical rendered calls must reuse a cached result, while any change to a prompt, provider, variable, header, model, or transform must call the server again. CI rejects stale reuse and unstable misses.

## What must Promptfoo eval cache invalidation testing prove?

Promptfoo eval cache invalidation testing must prove both reuse and invalidation with server call counts. The same rendered call should reuse its prior result, while an input that changes behavior must miss the old entry and return the newly tagged fixture reply.

The test should observe cache behavior, not copy Promptfoo's private key format. Internal cache strings can change between releases, while server calls, reply tags, result rows, and cache isolation remain stable external facts.

Define equivalence before writing changes. Whitespace or key order may be irrelevant in one client, while a header, variable, model option, or reply transform may alter another client's effect.

Use one base setup and mutate exactly one dimension per case. The expected result is either one server call across two runs for equivalence or two calls with distinct fixture tags for invalidation.

The official [Promptfoo caching guide](https://www.promptfoo.dev/docs/configuration/caching/) documents cache controls, storage types, paths, time to live, and clearing methods. It also states that cache key formats are code details and describes hashed call material for host and fetch scopes.

That guide notes that successful replies are cached while errors are not cached. It also describes split namespaces for repeats, which gives the matrix additional boundary cases beyond simple reruns.

The [configuration guide](https://www.promptfoo.dev/docs/configuration/guide/) defines the surrounding evaluation shape. Tests should persist the exact resolved config used for each pair so a hidden default cannot explain an unexpected hit or miss.

The [provider catalog](https://www.promptfoo.dev/docs/providers/) shows that providers can use string, object, file, and endpoint forms with options. A cache suite should cover the provider form used by the application instead of assuming every client normalizes inputs identically.

Keep prompt comparison split from cache key. The [prompt version matrix article](/blog/promptfoo-variable-matrix-prompt-versions) can compare output quality, while this gate proves whether each variant actually reached the intended host.

Use the [Promptfoo complete guide](/blog/promptfoo-complete-guide-2026) for wider setup and the [skills directory](/skills) for adjacent QA checks. The cache test remains fixed because its local server returns fixed, numbered replies.

## Which repository behavior defines the test contract?

The first repository anchor is \`packages/web/src/app/blog/posts/pillar-promptfoo-2026.ts\`. Lines 96-104 explain that a large matrix is not fair proof when inputs differ and warn that replies cached from an older target can make a run easy to rerun but no longer current.

That warning creates a concrete oracle. A new setup must receive a reply generated for its own rendered call, not a reply tag saved under a previous prompt, model, header, variable, or transform.

The second anchor is \`seed-skills/prompt-testing/SKILL.md\`. Lines 737-741 recommend caching repeated calls, testing boundary paths, and pinning model versions because model changes can silently move output quality.

Together, the files require controlled cost without confusing old target effect with current proof. The test must therefore show legitimate reuse for exact repeats and reliable misses for every pinned input that changes host effect.

Record the package version, cache type, cache path, cache enable flag, and time to live. These values explain cache scope without exposing private key bytes or relying on a developer's global cache.

The counted host should save call key before returning a fixed reply. Include a run tag, host tag, rendered prompt, selected headers, options, and reply test key in its local ledger.

Run every pair with its own empty cache path. A shared path can convert an intended first call into a hit from another test, hiding whether setup and key material are correct.

The [red-teaming article](/blog/promptfoo-red-teaming-llm-applications) explains broader target fidelity. Cache checks should pass before adversarial runs, or old replies may make the target appear safer or weaker than its current effect.

The [prompt injection guide](/blog/prompt-injection-testing-guide-2026) can supply later hostile inputs. This contract uses harmless tests so a cache mismatch has one cause and one clear reply tag.

## How to promptfoo eval cache invalidation testing?

To learn how to promptfoo eval cache invalidation testing, create a local test server that increments a durable counter for each real call. Point Promptfoo at a temp cache, run the same config twice, and require one call plus two equal result values.

Then copy the base config and mutate one field. Run the changed config against the same pair-local cache, require a new server call, and verify the result contains the new fixture tag rather than the base tag.

The YAML below defines a small call with visible prompt, variables, host options, and transform effect. The local endpoint records all received values and returns a reply containing its current counter.

\`\`\`yaml
description: cache identity contract

prompts:
  - "Answer {{question}} for {{region}}"

providers:
  - id: http
    config:
      url: http://127.0.0.1:4318/eval
      method: POST
      headers:
        X-Fixture-Model: fixture-v1
        X-Policy-Revision: policy-7
      body:
        prompt: "{{prompt}}"
        region: "{{region}}"
        temperature: 0
      transformResponse: json.answer

tests:
  - vars:
      question: "When does support close?"
      region: "IN"
    assert:
      - type: contains
        value: "fixture-v1"
\`\`\`

Start the host before generating the final config so the chosen loopback port is known. Save its call ledger and counter beside the two Promptfoo result files.

Use the documented \`PROMPTFOO_CACHE_PATH\` to assign the temp path. Set cache type and enablement by name so local defaults and test-env defaults cannot change the test.

Do not infer a hit only from equal outputs. A fixed host can return equal text on two real calls, so host count and call ledger are required proof.

Do not infer a miss only from different outputs. A volatile host can change text for equal calls, so the ledger must show the exact rendered call and a new call sequence.

After the repeat passes, create pairwise changes for prompt text, provider ID, variable value, selected header, model setting, and transform expression. Keep the expected server reply stable except for the counter and new tag.

The [prompt version matrix guide](/blog/promptfoo-variable-matrix-prompt-versions) can organize larger prompt comparisons. This test should remain small enough that every cache decision maps to one changed field.

## Promptfoo eval cache invalidation testing example: scenario and assertion matrix

This promptfoo eval cache invalidation testing example compares exact reruns, semantic changes, harmless representation changes, repeats, and dependency errors. Every row reads the counted host ledger before declaring a cache outcome.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Exact rerun | Same resolved config and cache path | One provider call and equal tagged results | Second call or changed result identity | Promptfoo caching guide |
| Prompt mutation | One instruction word changes | New provider call and candidate response tag | Baseline tag reused for new prompt | \`pillar-promptfoo-2026.ts\` |
| Header or model change | One behavior-setting value changes | New request ledger row with changed field | Stale response or omitted changed value | Promptfoo provider catalog |
| Repeat namespace | Two repeat indexes run and rerun | Distinct first outputs, then reuse by index | Index collision or unplanned new calls | Promptfoo caching guide |
| Error response | Local provider returns a fixed 500 | Error is not reused as a successful result | Cached failure, missing case, or endless retry | \`seed-skills/prompt-testing/SKILL.md\` |

The exact rerun row proves the cache is active. Without that control, every change can appear to invalidate correctly when the suite actually disabled caching or pointed each run at another path.

The prompt row must inspect the final rendered value. Editing a template has no effect when the changed branch is not used by the selected test variables.

Header and model cases should use values that the server ledger can see. If a client consumes a setting internally, expose a fixture reply tag or mock boundary that proves the new option reached the call.

The repeat row compares each repeat index with itself across reruns. It should not require repeat zero and repeat one to share one result because the documented effect gives them split namespaces.

The error row should use bounded retries and record every attempt. A later green call must not receive a cached error, and an error must not be presented as a successful transformed answer.

Use the [complete Promptfoo guide](/blog/promptfoo-complete-guide-2026) for command and report context. Keep this table centered on cache effect rather than assertion quality.

## What failures expose Promptfoo stale cache test?

A Promptfoo stale cache test fails when a behavior-changing call receives the base reply without another server call. The report should name the changed field, base and new values, server count, reply tags, and both resolved calls.

The opposite defect also matters. If an same call calls the host again, the key may include irrelevant ordering, temp paths, unstable IDs, or another value that prevents useful reuse.

Run a negative client that deliberately omits one call field from its test key. This test-only defect proves the assertions can detect stale reuse without changing Promptfoo production code.

The TypeScript example compares call counts and tagged results for a change pair. It also requires complete result rows and removes the pair's cache path in a verified cleanup path.

\`\`\`typescript
import { expect, test } from 'vitest';

test('misses cache when a behavior-setting header changes', async () => {
  const fixture = await startCountedProvider();
  const cachePath = await createEmptyCacheDirectory('header-mutation');

  const baseline = await runPromptfoo({
    config: makeConfig(fixture.url, { policyRevision: 'policy-7' }),
    cachePath,
  });
  const candidate = await runPromptfoo({
    config: makeConfig(fixture.url, { policyRevision: 'policy-8' }),
    cachePath,
  });

  expect(fixture.calls).toHaveLength(2);
  expect(fixture.calls.map((call) => call.policyRevision)).toEqual([
    'policy-7',
    'policy-8',
  ]);
  expect(baseline.results).toHaveLength(1);
  expect(candidate.results).toHaveLength(1);
  expect(baseline.results[0].output).toContain('provider-call-1');
  expect(candidate.results[0].output).toContain('provider-call-2');

  await removeCacheDirectory(cachePath);
  expect(await pathExists(cachePath)).toBe(false);
});
\`\`\`

Add a transform change that returns another field from the same fixture reply. The changed run must reflect the selected field, whether the code invalidates provider cache or reapplies transform logic after a safe reply reuse.

That distinction should appear in the expected contract. The final output must never be stale, but an internal provider call is required only when the changed setting affects provider call keys.

Add a malformed cache entry by truncating a copied pair path. The run should fail or fetch clean data according to pinned effect, but it must not report partial bytes as a valid model answer.

Add a stale path case where the env points to a previous test path. A run-specific marker file should expose the wrong path before evaluation starts.

Add an empty-reply case because the official guide says empty replies are not cached. The second run should call the host again and keep complete case accounting.

The [red-teaming guide](/blog/promptfoo-red-teaming-llm-applications) can consume cache-safe target proof later. A stale reply in adversarial work can hide both fixed and newly introduced effect.

## How should Promptfoo provider cache key run in CI?

A Promptfoo host cache key suite should pin the Promptfoo package, use a loopback counted host, and assign one temp cache path per change pair. Never reuse a developer home cache or a cache restored from another branch.

Begin with an exact-rerun control that requires one call. Then run pairwise changes for prompts, variables, provider IDs, headers, model options, transforms, repeat indexes, empty replies, and errors.

Use explicit \`PROMPTFOO_CACHE_ENABLED\`, \`PROMPTFOO_CACHE_TYPE\`, \`PROMPTFOO_CACHE_PATH\`, and \`PROMPTFOO_CACHE_TTL\` values. Save only safe env names and nonsecret test values in reports.

Set deadlines for the local server, each Promptfoo process, and the complete pair. On timeout, collect the call ledger and process status before stopping the server and deleting temp data.

Retain the resolved base and new configs, a field-level change diff, host ledger, result files, cache settings, package version, decision summary, and cleanup record. Do not upload raw cache files when they may contain call data.

Fail release on stale candidate output, unplanned provider calls for exact repeats, missing result rows, cached errors, mixed cache paths, incomplete pairs, remote traffic, or failed cleanup. Keep split codes for false hits and false misses.

Run the suite when Promptfoo, host clients, config generation, call transforms, or cache settings change. A smaller exact-rerun smoke check can run on other pull calls if the full matrix is costly.

Use the [complete guide](/blog/promptfoo-complete-guide-2026) for the main job and the [skills path](/skills) for broader AI test design. Cache proof should be available before CI compares prompt or host scores.

## Which assertions verify disable Promptfoo cache in CI?

Tests that disable Promptfoo cache in CI need a control proving the flag took effect. Run the same config twice with caching disabled and require two provider calls, distinct reply tags, complete result rows, and no new files under the assigned cache path.

Then run the same pair with caching enabled and require one call. These adjacent controls distinguish a broken cache test from a real enablement problem.

Assert env values in the child process rather than only in the parent test. A command wrapper may filter, override, or load another env file before Promptfoo starts.

Compare provider calls with result rows and case IDs. Two calls for two results are expected when disabled, while a missing result cannot be explained as successful cache bypass.

Inspect the assigned temp path before and after the run. The suite should reject a default home path, an existing shared path, or a path outside the test workspace.

Use disabled mode when measuring current host effect or when cached data would weaken a specific experiment. Use enabled mode for the contract matrix itself, because invalidation cannot be tested when every call bypasses cache.

Assert that a disabled run does not delete or alter an independent enabled-cache test. Cache controls should change use for one process, not mutate unrelated stored proof.

The [prompt version article](/blog/promptfoo-variable-matrix-prompt-versions) can state which comparison mode it expects. A machine-readable cache policy in each report prevents reviewers from assuming every score came from fresh host traffic.

## Step-by-step test implementation

Build the suite around a counted host and pair-local cache paths, not around private key snapshots. The following steps make hits, misses, call changes, and cleanup visible through supported effect.

1. Read \`packages/web/src/app/blog/posts/pillar-promptfoo-2026.ts\` lines 96-104 and \`seed-skills/prompt-testing/SKILL.md\` lines 737-741, then list behavior-changing inputs and required cache evidence.
2. Create isolated fixtures for how to promptfoo eval cache invalidation testing and its example matrix, using loopback traffic, fixed replies, unique run tags, and empty pair directories.
3. Build a counted provider, resolved-config writer, Promptfoo process wrapper, request ledger, result parser, mutation diff, remote-traffic guard, deadlines, and verified cleanup.
4. Run the exact baseline twice and assert one provider call, equal tagged results, complete rows, the expected cache path, and no unrelated request or file changes.
5. Mutate one prompt, provider, variable, header, model option, or transform field per pair, then require the planned hit or miss and a nonstale final result.
6. Run the focused suite in CI, retain sanitized configs and ledgers, remove temporary paths, and assign config, adapter, cache, result, process, or harness failures.

Keep expected hit or miss policy beside every change test. Reviewers should not infer semantics from a test name when an client treats one field differently from another.

Repeat the exact-rerun control after all negative cases. One call and equal tagged results prove that malformed entries, error tests, and disabled-cache runs did not alter the clean path.

The [blog index](/blog) lists related Promptfoo practices. Keep this contract independent from live models so cache effect can be reproduced without cost or host variance.

## Failure triage and regression ownership

Start with the resolved config diff and host count. No config difference means the change test failed, while a visible effect change with no new call indicates stale reuse or an client key omission.

If a new call occurred but the old result appears, inspect reply transform, result parsing, and artifact paths. The cache may be correct while the report reader opened the base file twice.

If exact reruns produce extra calls, compare cache path, enable flag, type, time to live, package version, and rendered call. An unstable run ID or temp value may have entered call key.

If only one provider family fails, route the defect to that client before changing global policy. Provider IDs and options have different shapes, so the test must prove which call data the client received.

If error cases are reused, retain status, attempt count, and reply class. Distinguish Promptfoo caching from an upstream proxy or local test that served its own stored reply.

If CI alone fails, inspect restored caches, home paths, worker isolation, env loading, process concurrency, and cleanup order. A shared cache path often creates failures that cannot reproduce in a clean local run.

If a transform changes output without another provider call, compare that effect with the written change policy. A safe reused raw reply may still yield a fresh final transform, so assert final correctness and provider calls separately.

The [complete Promptfoo article](/blog/promptfoo-complete-guide-2026) helps place client and report ownership. Within this gate, config owners define key, client owners form calls, cache owners decide reuse, and harness owners prove the observed calls.

## Frequently Asked Questions

### How do you verify Promptfoo cache identity changes when prompts, providers, variables, headers, model settings, or response transforms change?

Run a base and one-field change against a counted local server using the same isolated cache path. Compare resolved configs, server ledgers, tagged outputs, and complete result rows. Require reuse only for documented same calls, and require a fresh or correctly reprocessed result whenever behavior changes.

### What fixture best tests how to promptfoo eval cache invalidation testing?

Use a loopback host that records rendered calls, increments a durable counter, and returns tagged fixed replies. Give each change pair a new cache path and explicit cache env values. This test measures real calls, detects stale outputs, avoids model variance, and cannot contact a production target.

### Which failure signal proves promptfoo eval cache invalidation testing example?

Report the changed field, base and new values, expected cache decision, server call count, call ledger diff, and output tags. A stale-hit signal needs a changed rendered call with no new call or old output. A false-miss signal needs same calls with an unplanned extra call.

### How should CI report Promptfoo stale cache test?

CI should retain sanitized resolved configs, a one-field change diff, local server ledger, result rows, cache settings, package version, case decision, process status, and cleanup proof. Reports should not publish raw cache entries or secrets. Stable pair and case IDs must connect requests, calls, and outputs.

### When should Promptfoo provider cache key block a release?

Block when a behavior-changing call receives stale output, an exact rerun makes an unexplained provider call, an error becomes cached success, result rows disappear, cache paths mix, or cleanup fails. Also block remote traffic from this test. Keep final-output correctness split from internal call expectations for transforms.

### How can teams keep disable Promptfoo cache in CI repeatable?

Set cache enablement, type, path, and time to live by name in the child process. Pair a disabled two-call control with an enabled one-call control against the same fixed host. Use fresh paths, fixed configs, stable counters, and verified cleanup so global defaults or restored caches cannot alter outcomes.

## Conclusion

Promptfoo eval cache invalidation testing proves that exact repeats reuse safe proof while effect-changing inputs cannot receive stale results. The gate also catches false misses, mixed cache paths, cached errors, missing rows, remote fallback, and cleanup failures through host counts and tagged outputs.

Open the [QA skills path](/skills) to choose an AI testing skill, then read the [Promptfoo complete guide](/blog/promptfoo-complete-guide-2026) before implementing this regression gate. Begin with one exact-rerun control and one prompt change before expanding the pairwise matrix.`,
};
