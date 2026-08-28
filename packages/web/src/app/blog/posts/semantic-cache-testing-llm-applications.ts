import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Semantic Caches in LLM Apps: Hit Quality and Invalidation',
  description: 'Semantic cache LLM testing for hit quality, similarity thresholds, and invalidation so cached answers stay correct when prompts paraphrase or docs change.',
  date: '2026-08-28',
  category: 'AI Testing',
  content: `
# Testing Semantic Caches in LLM Apps: Hit Quality and Invalidation

Semantic cache LLM testing means proving that approximate matches on prompt or query embeddings return the right cached answer, skip the wrong ones, and clear stale entries when knowledge changes. You measure hit quality (false hits vs true hits), calibrate similarity thresholds, pin embedding models, isolate namespaces, and assert invalidation after corpus or policy updates. Exact string caches are the wrong baseline. The job is to show that paraphrases intended to share an answer do hit, near-miss queries do not, and cached responses stay as correct as a fresh LLM call when the underlying facts still hold.

QA and test-automation engineers who ship AI coding agents live inside this tradeoff every week. Latency dashboards look great after a cache lands. Correctness tickets appear two sprints later when a customer paraphrases a refund question and gets an onboarding FAQ. Semantic caching is not a free speed knob. It is a retrieval surface that needs fixtures, thresholds, invalidation contracts, and regression suites the same way you already treat RAG and eval gates. If you already run [RAG embedding migration checks](/blog/rag-testing-embedding-dimension-migration), treat semantic cache tests as the sibling suite that sits in front of the model, not behind retrieval.

## Semantic Cache Anatomy: Similarity Keys, Not String Keys

A semantic cache stores prior LLM answers (or tool-call plans) keyed by an embedding of the user prompt, rewritten query, or conversation fingerprint. Lookup runs something like \`getSimilar(embedding, threshold)\` against a vector index and returns a hit when cosine similarity (or another distance) clears the threshold. That is the whole product idea: reuse work when the next request means approximately the same thing.

Exact caches fail this product idea. \`"How do I reset my password?"\` and \`"I forgot my password, reset please"\` are different strings and the same intent. Exact keys miss. Semantic keys can hit. The reverse is also true. \`"Cancel my subscription"\` and \`"Cancel my free trial email"\` can sit close in embedding space for a weak model even when product policy treats them as different workflows. Semantic keys can false-hit.

For test design, model the cache as a narrow interface you control with doubles:

| Operation | Contract under test | Failure mode if broken |
|---|---|---|
| \`embed(text)\` | Deterministic for pinned model + version | Silent threshold drift after model swap |
| \`getSimilar(embedding, threshold)\` | Returns best neighbor above threshold or miss | False hits / silent misses |
| \`put(embedding, value, meta)\` | Writes with namespace, TTL, source hash | Cross-tenant bleed, immortal entries |
| \`invalidate(namespace)\` or \`invalidateBySource(hash)\` | Removes or marks stale | Stale answers after docs change |
| \`stats()\` | Exposes hit, miss, false-hit labels in test mode | Blind latency wins without quality |

Keep product SDKs out of unit tests. You do not need a commercial cache API to prove behavior. You need a double that records thresholds, namespaces, and returned payloads so assertions stay local and fast.

What people get wrong: treating semantic cache hit rate as a success metric on its own. Hit rate without a correctness label is how teams celebrate serving the wrong answer faster. Instrument three rates in test mode: true hit (similar and answer still valid), false hit (similar enough by distance but answer wrong for the new prompt), and intentional miss (distance below threshold). Product dashboards can keep a simple hit ratio. QA gates must keep the labeled trio.

## Hit Quality Failures: When a Cache Hit Is Worse Than a Miss

A false hit is the primary correctness risk. The cache returns a prior completion because embeddings were close, yet the new prompt needed a different policy branch, tenant, locale, or document set. Users experience confident wrong answers. Support sees "the bot ignored my question." On-call sees healthy latency and elevated thumbs-down.

### Failure story: refund paraphrase that stole an onboarding answer

Symptom: after enabling semantic caching on a support agent, p95 latency dropped 40%. CSAT dipped on billing chats. One recurring report said the bot answered "how do I get a refund for last month?" with steps to complete account setup.

Wrong theory: the team blamed the LLM prompt. They lengthened the system message, added "never confuse refund with onboarding," and re-ran a handful of manual chats. Fresh (uncached) calls looked fine. Cached production traffic still failed.

Actual cause: the cache key embedded only the last user utterance. Onboarding and refund questions shared lexical overlap ("account", "billing email", "last month") in the embedding model then in use. Threshold was 0.82 cosine, tuned on a tiny paraphrase set that never included billing. A popular onboarding answer sat in the cache with high traffic, so it became the nearest neighbor for several billing paraphrases.

Fix: (1) widen the cache fingerprint to include route intent from a cheap classifier plus tenant and locale, (2) drop threshold to a candidate generator and add a secondary exact-intent check before serving, (3) build a hit/miss matrix with near-miss billing vs onboarding pairs that must miss, (4) add canary tokens into cached payloads so evals can detect when a cached onboarding answer appears on a refund golden prompt. Latency rose a little. False hits collapsed. CSAT recovered.

That story is the template for your suite. Always keep a path that bypasses the cache in CI so you can separate model regressions from cache regressions. Pair that with a forced-hit path that injects a known cached payload for a near-miss prompt and asserts the product refuses to serve it.

## Threshold Calibration and Near-Miss Suites

Thresholds are not vibes. They are product policy expressed as a number. Too low and you false-hit. Too high and you pay full LLM cost for paraphrases you meant to merge. Calibration belongs in tests with fixtures, not in a single engineer "trying a few prompts."

Build three fixture bands:

| Band | Intent | Example pair relation | Expected cache behavior |
|---|---|---|---|
| Should-hit paraphrases | Same task, same tenant policy | "reset password" / "forgot password link" | Hit above threshold |
| Near-miss cousins | Related words, different task | "cancel subscription" / "cancel trial email" | Miss (or hit then secondary reject) |
| Hard negatives | Shared entities, opposite outcomes | "approve refund" / "deny refund" | Must miss |

Unit-test the similarity gate with a double that returns fixed distances so you are not paying an embedding provider inside the loop:

\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { decideCacheLookup } from './semantic-cache-policy';

describe('similarity threshold gate', () => {
  const threshold = 0.88;

  it('hits when distance clears threshold and intent matches', () => {
    const decision = decideCacheLookup({
      similarity: 0.93,
      threshold,
      queryIntent: 'password_reset',
      candidateIntent: 'password_reset',
    });
    expect(decision).toEqual({ action: 'hit', reason: 'similarity_and_intent' });
  });

  it('misses near-miss cousins even when similarity is high', () => {
    const decision = decideCacheLookup({
      similarity: 0.91,
      threshold,
      queryIntent: 'cancel_subscription',
      candidateIntent: 'cancel_trial_email',
    });
    expect(decision).toEqual({ action: 'miss', reason: 'intent_mismatch' });
  });

  it('misses when similarity is below threshold', () => {
    const decision = decideCacheLookup({
      similarity: 0.71,
      threshold,
      queryIntent: 'refund_status',
      candidateIntent: 'refund_status',
    });
    expect(decision).toEqual({ action: 'miss', reason: 'below_threshold' });
  });
});
\`\`\`

Run focused Vitest filters with \`-t\` / \`--testNamePattern\` while tuning:

\`\`\`bash
npx vitest run -t "similarity threshold gate"
\`\`\`

Do not stop at unit distances. Keep an offline calibration notebook or script that embeds the full paraphrase and near-miss lists with the pinned model, plots score distributions, and fails if the should-hit 5th percentile falls below the near-miss 95th percentile. That separation margin is your real threshold headroom. If the distributions overlap, no single threshold saves you; you need a stronger fingerprint (intent, tool schema version, retrieval source hash) before similarity.

## Embedding Model Pins and Namespace Isolation

A semantic cache is only as stable as its embedding space. Changing the embedding model, truncation length, or instruction prefix remaps every vector. Old entries become nonsense neighbors. New queries disagree with historical distances. Teams that would never mix Postgres encodings casually rotate embedding models and leave the vector table untouched.

Pin these in config and assert them in boot tests:

| Pin | Why tests care | Breakage signal |
|---|---|---|
| Embedding model id + revision | Distance distributions shift across models | Sudden false-hit spike after deploy |
| Embedding dimensionality | Index layout and migration rules | Insert/query errors or silent pad/truncate bugs |
| Instruction / prefix text | "query:" vs "passage:" changes geometry | Paraphrase pairs flip from hit to miss |
| Distance metric | Cosine vs dot vs L2 are not interchangeable | Thresholds become meaningless |
| Namespace / tenant key | Isolation boundary | Cross-tenant answer leakage |
| Prompt template version | Same user text, different system contract | Stale policy answers |

Namespace isolation deserves its own suite. Two tenants can ask identical questions and require different answers because of plan tier, region, or knowledge pack. A cache that keys only on embedding content will leak. Your double should refuse cross-namespace reads even when vectors match.

\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { createSemanticCacheDouble } from './cache-double';

describe('cache key / namespace isolation', () => {
  it('does not serve tenant A entries to tenant B at equal similarity', async () => {
    const cache = createSemanticCacheDouble();
    const embedding = new Array(8).fill(0.25);

    await cache.put({
      namespace: 'tenant:a',
      embedding,
      value: { answer: 'Plan A refund window is 14 days' },
      meta: { sourceHash: 'policy-a-v3' },
    });

    const hit = await cache.getSimilar({
      namespace: 'tenant:b',
      embedding,
      threshold: 0.99,
    });

    expect(hit).toBeNull();
  });

  it('serves within the same namespace when threshold passes', async () => {
    const cache = createSemanticCacheDouble();
    const embedding = new Array(8).fill(0.5);

    await cache.put({
      namespace: 'tenant:a',
      embedding,
      value: { answer: 'Plan A refund window is 14 days' },
      meta: { sourceHash: 'policy-a-v3' },
    });

    const hit = await cache.getSimilar({
      namespace: 'tenant:a',
      embedding,
      threshold: 0.8,
    });

    expect(hit?.value.answer).toContain('14 days');
  });
});
\`\`\`

When embedding dimensions change, invalidate or rebuild. Do not "just raise the threshold and see." Apply the same freeze, migrate, and rebuild checklist you use for retrieval indexes so semantic cache query and key spaces never drift apart mid-release.

## Invalidation After Knowledge Changes

Semantic caches go stale when the world behind the answer moves: RAG corpus updates, price lists, policy docs, tool schemas, prompt versions, or guardrail rules. TTL alone is a blunt instrument. A 24-hour TTL on a refund policy that changed at noon still serves wrong guidance until expiry. A five-minute TTL on a stable style guide burns money.

Prefer source-hash invalidation plus targeted namespaces:

1. Every \`put\` stores \`sourceHash\` (content hash of docs, prompt version, tool schema version).
2. Publishers that update knowledge emit the new hash.
3. Cache layer calls \`invalidateBySource(oldHash)\` or namespace purge for the affected tenant pack.
4. Tests assert that a prior hit becomes a miss after the update, then a fresh put can repopulate.

\`\`\`python
import hashlib
from cache_double import SemanticCacheDouble

def test_invalidation_after_document_update():
    cache = SemanticCacheDouble()
    doc_v1 = "Refunds are available within 30 days of purchase."
    doc_v2 = "Refunds are available within 14 days of purchase."
    source_v1 = hashlib.sha256(doc_v1.encode()).hexdigest()
    source_v2 = hashlib.sha256(doc_v2.encode()).hexdigest()
    embedding = [0.1, 0.2, 0.3, 0.4]

    cache.put(
        namespace="help:en",
        embedding=embedding,
        value={"answer": doc_v1},
        meta={"sourceHash": source_v1},
    )
    assert cache.get_similar("help:en", embedding, threshold=0.85) is not None

    # Publisher updated the corpus; old hash must leave the cache.
    cache.invalidate_by_source(source_v1)
    assert cache.get_similar("help:en", embedding, threshold=0.85) is None

    cache.put(
        namespace="help:en",
        embedding=embedding,
        value={"answer": doc_v2},
        meta={"sourceHash": source_v2},
    )
    hit = cache.get_similar("help:en", embedding, threshold=0.85)
    assert hit["value"]["answer"] == doc_v2
\`\`\`

Also test the negative path: an unrelated document update must not purge an entire global cache if your design uses fine-grained hashes. Over-invalidation is a performance bug that masquerades as safety. Under-invalidation is a correctness bug that masquerades as speed.

Wire invalidation into the same pipeline that already promotes RAG corpora. If the publish job forgets the cache purge step, your golden cached answers will disagree with fresh RAG answers until someone notices. A single CI job that updates a fixture doc, publishes, and asserts both retrieval and semantic cache miss-then-refresh catches that gap early.

## Poisoning, Injection, and Canary Tokens in Cached Paths

Cached content is still content. If an attacker can influence a value that gets stored and later served to other users, the cache becomes a distribution channel. Prompt injection that slips into a stored tool trace, a retrieved snippet that was concatenated into a cached answer, or a shared "memory" namespace without authz all qualify.

Test angles that belong in this module:

- Refuse to cache responses that include untrusted tool output unless those spans are sanitized or fingerprinted.
- Isolate per-user memories from per-tenant FAQ caches.
- Reject cache writes when output moderation fails, even if similarity lookup would later be cheap.
- Embed canary tokens into fixtures so evals detect cross-route leakage.

Canary tokens are especially practical for QA. Place a unique opaque string into an onboarding cached answer fixture. On refund golden prompts, fail if that canary appears. Place another canary into a tenant-A namespace. On tenant-B traffic, fail if it appears. This is the same spirit as [prompt-injection canary token evals](/blog/llm-eval-prompt-injection-canary-tokens): a cheap, deterministic tripwire that does not require a judge model for the obvious failures.

\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { renderSupportAnswer } from './support-agent';
import { createSemanticCacheDouble, embedFixture } from './cache-double';

describe('canary tokens on cached responses', () => {
  it('does not leak onboarding canary into refund prompts', async () => {
    const cache = createSemanticCacheDouble();
    const onboardingCanary = 'CANARY_ONBOARD_7f3c';

    await cache.put({
      namespace: 'public-faq',
      embedding: embedFixture('complete account setup'),
      value: { answer: \`Welcome steps. \${onboardingCanary}\` },
      meta: { sourceHash: 'onboarding-v2', route: 'onboarding' },
    });

    const result = await renderSupportAnswer({
      prompt: 'How do I get a refund for last month?',
      cache,
      forceLookup: true,
    });

    expect(result.servedFromCache).toBe(false);
    expect(result.answer).not.toContain(onboardingCanary);
  });
});
\`\`\`

If your org already installs ready-made QA skills from qaskills.sh with the qaskills CLI, wire a cache-canary skill next to your injection-canary skill so agents propose the same fixture pattern instead of inventing one-off scripts per repo.

## Golden-Set Regression Across Cached and Fresh Routes

Latency teams want cache on. Eval teams want reproducibility. You need both routes in CI:

1. Fresh route: cache bypass, real or stubbed LLM, full judge/assertions.
2. Cached route: populate from fixtures or prior fresh runs, force lookup, assert identical business fields.
3. Divergent route: deliberately stale fixture, assert miss or regeneration after invalidation.

An evaluation harness should compare cached vs fresh answer quality on the same golden prompts. Do not only assert string equality. Policy answers can differ in wording and still match. Use field extractors (refund window days, plan name, URL allowlist) plus an optional judge for free prose.

\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { runGoldenPrompt } from './eval-harness';
import { extractRefundFields } from './field-extractors';

describe('cached vs fresh answer quality', () => {
  const prompts = loadGoldenSet('billing-paraphrases.json');

  for (const prompt of prompts) {
    it(\`matches fields for \${prompt.id}\`, async () => {
      const fresh = await runGoldenPrompt(prompt, { cacheMode: 'bypass' });
      const cached = await runGoldenPrompt(prompt, { cacheMode: 'prefer' });

      expect(cached.latencyMs).toBeLessThan(fresh.latencyMs);

      expect(extractRefundFields(cached.answer)).toEqual(
        extractRefundFields(fresh.answer),
      );

      if (prompt.expectCacheHit) {
        expect(cached.servedFromCache).toBe(true);
      } else {
        expect(cached.servedFromCache).toBe(false);
      }
    });
  }
});
\`\`\`

Hit/miss matrix fixtures keep the suite honest. Store them as data, not as buried expects. Each row carries the seeded entry's intent and the query's intent separately; if the seed reused the query's intent, the intent-mismatch guard could never fire and every miss row would pass for the wrong reason:

\`\`\`json
{
  "matrix": [
    {
      "id": "pw-paraphrase-1",
      "query": "I forgot my password, send a reset link",
      "queryIntent": "password_reset",
      "seedCachedPrompt": "How do I reset my password?",
      "seedIntent": "password_reset",
      "expectHit": true
    },
    {
      "id": "billing-near-miss-1",
      "query": "Cancel my subscription now",
      "queryIntent": "cancel_subscription",
      "seedCachedPrompt": "Cancel my free trial email",
      "seedIntent": "cancel_trial_email",
      "expectHit": false
    },
    {
      "id": "refund-hard-neg-1",
      "query": "Approve this refund for order 44",
      "queryIntent": "refund_approve",
      "seedCachedPrompt": "Deny this refund for order 44",
      "seedIntent": "refund_deny",
      "expectHit": false
    }
  ]
}
\`\`\`

Drive Playwright smoke paths only where UI must prove the banner or citation differences between cached and fresh answers. Use \`--grep\` / \`-g\` to target those smokes without booting the full UI suite on every cache unit change.

## Latency Savings Without Correctness Debt

The business case for semantic caches is saved tokens and saved milliseconds. QA should quantify both without letting either steal correctness. Track in the harness:

| Metric | Definition | Gate idea |
|---|---|---|
| Cache-eligible latency delta | Fresh p95 minus cached p95 on should-hit set | Must exceed agreed floor (for example 30%) |
| True-hit precision | True hits / (true hits + false hits) | Must stay above product floor |
| Paraphrase recall | Should-hit prompts that actually hit | Catch over-tight thresholds |
| Stale-serve rate | Hits whose sourceHash is not current | Must be zero in CI fixtures |
| Stampede retries | Concurrent misses that stampede the LLM | Cap duplicate generations |

Stampede deserves an explicit concurrency test. When ten identical paraphrases miss at once, you want one generation and nine waiters (or controlled coalescing), not ten full LLM bills and ten racing writes. A double can simulate a slow \`generate()\` and assert single-flight behavior.

\`\`\`yaml
name: semantic-cache-quality
on:
  pull_request:
    paths:
      - 'src/semantic-cache/**'
      - 'tests/semantic-cache/**'
      - 'fixtures/semantic-cache/**'
jobs:
  vitest-cache:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npx vitest run tests/semantic-cache --reporter=verbose
      - run: node scripts/compare-cached-vs-fresh.mjs
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: semantic-cache-eval-report
          path: artifacts/semantic-cache/**
\`\`\`

Keep the compare script boring: read golden prompts, run bypass vs prefer modes against stubs in CI (and against a shadowed production embedding endpoint in a nightly job), emit JSON metrics, fail on precision/recall/stale gates. Nightly can use real embeddings. PR CI should stay deterministic with recorded vectors so flaky providers do not block merges.

## Concurrency, Stampede, and Fixture Matrices in Practice

Ship a single "matrix runner" that loads the JSON hit/miss fixtures, seeds the cache double, and asserts expectations. Engineers extend data, not code. That pattern keeps AI coding agents from inventing new assert styles every time they touch the suite.

\`\`\`typescript
import { describe, it, expect } from 'vitest';
import matrix from '../fixtures/semantic-cache/hit-miss-matrix.json';
import { createSemanticCacheDouble, embedFixture } from './cache-double';
import { decideCacheLookup } from './semantic-cache-policy';

describe('hit/miss matrix fixtures', () => {
  for (const row of matrix.matrix) {
    it(\`\${row.id} expectHit=\${row.expectHit}\`, async () => {
      const cache = createSemanticCacheDouble();
      await cache.put({
        namespace: 'public-faq',
        embedding: embedFixture(row.seedCachedPrompt),
        value: { answer: \`seed:\${row.seedCachedPrompt}\` },
        meta: { sourceHash: 'seed', intent: row.seedIntent },
      });

      const similar = await cache.getSimilar({
        namespace: 'public-faq',
        embedding: embedFixture(row.query),
        threshold: 0.0, // candidate generator; policy decides
      });

      const decision = decideCacheLookup({
        similarity: similar?.similarity ?? 0,
        threshold: 0.88,
        queryIntent: row.queryIntent,
        candidateIntent: similar?.meta.intent,
      });

      const isHit = decision.action === 'hit';
      expect(isHit).toBe(row.expectHit);
    });
  }
});
\`\`\`

For stampede:

\`\`\`typescript
import { describe, it, expect, vi } from 'vitest';
import { createSingleFlightCache } from './single-flight-cache';

describe('semantic cache stampede control', () => {
  it('coalesces concurrent misses into one generate call', async () => {
    const generate = vi.fn(async () => ({ answer: 'one shared answer' }));
    const cache = createSingleFlightCache({ generate, threshold: 0.9 });
    const embedding = new Array(8).fill(0.33);

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        cache.getOrGenerate({ namespace: 'public-faq', embedding, prompt: 'Reset password' }),
      ),
    );

    expect(generate).toHaveBeenCalledTimes(1);
    expect(new Set(results.map((r) => r.answer)).size).toBe(1);
  });
});
\`\`\`

Operational checklist for the QA owner before calling a semantic cache "done":

1. Threshold unit tests with intent-aware near misses.
2. Hit/miss matrix checked into fixtures and run in CI.
3. Namespace isolation tests with identical embeddings.
4. Invalidation tests on document, prompt, and tool-schema hashes.
5. Cached vs fresh field comparison on golden paraphrases.
6. Canary token leakage tests across routes and tenants.
7. Stampede / single-flight concurrency test.
8. Embedding pin boot assert (model id, dimension, metric).
9. Actions workflow on \`actions/checkout@v4\` and \`actions/setup-node@v4\` uploading eval artifacts with \`actions/upload-artifact@v4\`.
10. Dashboards that show true-hit precision, not only raw hit rate.

If any item is missing, you do not have cache testing. You have a latency experiment.


## Measuring Near Misses That Must Never Hit

Near-miss testing is where semantic cache QA earns its keep. Paraphrase hits are relatively easy to demo in a slide deck. The failures that hurt customers are cousins: prompts that share entities, product names, or verbs but demand different side effects. Build a dedicated near-miss catalog the same way search teams build hard-negative query sets.

For each high-traffic intent, write at least five cousins that support would treat as different tickets. Cancel subscription versus cancel email notifications. Rotate API keys versus rotate billing contacts. Delete project versus archive project. Approve refund versus request refund status. If your embedding model collapses those pairs above the production threshold, the product is not ready for semantic reuse on that route.

Automate the catalog as a nightly job against the pinned embedding endpoint, and as a PR job against recorded vectors. Nightly catches model-side drift. PR catches policy-side mistakes when someone loosens the threshold to chase hit rate. Publish a small report artifact listing every pair whose similarity crossed the threshold. Humans should triage that list like flaky-test triage: fix the fingerprint, split the namespace, or accept an explicit secondary check. Do not silently raise the threshold without re-running the should-hit band, or you will trade false hits for silent latency regressions on the paraphrases you still want to merge.

Agents writing new product routes should extend the near-miss catalog in the same PR that introduces caching for that route. Make that a review checklist item. A route that ships with caching but without near-miss fixtures is incomplete the same way an API without negative auth tests is incomplete.

## Freshness Windows Versus Correctness Windows

TTL is a freshness window. Correctness windows are often shorter and more event-driven. Price changes, incident banners, and legal disclaimers may need immediate purge even when the embedding neighborhood is stable. Encode those channels as named invalidation topics in tests: \`pricing\`, \`legal\`, \`incident\`, \`prompt-version\`, \`tool-schema\`. Assert that publishing to a topic clears only the subscribed cache namespaces.

This split also clarifies ownership. Platform owns TTL defaults and stampede controls. Product owns topic subscriptions for each answer class. QA owns the proof that both sides meet in CI. When an incident banner is published, a smoke prompt that previously hit a calm FAQ must miss, regenerate with the banner fields, and only then become eligible to cache again under the new source hash.

## Frequently Asked Questions

### How is semantic cache LLM testing different from ordinary response caching?

Ordinary response caches key on exact strings, headers, or normalized text. Semantic cache LLM testing keys on embedding similarity and must prove approximate matches are safe. You add threshold calibration, near-miss suites, embedding pins, and labeled true-hit versus false-hit metrics. Exact caches mostly need TTL and key normalization tests. Semantic caches need paraphrase recall, hard-negative misses, namespace isolation, and invalidation tied to knowledge hashes. If your suite only asserts "second call is faster," you are not testing semantic behavior yet, only microbenchmarking a happy path.

### What similarity threshold should QA demand before release?

There is no universal number. Demand evidence that should-hit paraphrase scores separate from near-miss scores under the pinned embedding model, with a documented margin. Encode the working threshold in config, lock it in unit tests, and fail CI when recalibration on the golden lists shows overlapping distributions. If overlap remains, block release until the fingerprint includes intent, tenant, locale, or source hash rather than "raising threshold until support tickets quiet down." Thresholds without separation data are guesses dressed as policy.

### When must a semantic cache invalidate after a RAG corpus update?

Invalidate when any cached answer could have depended on changed chunks, metadata filters, or source documents. Practical rule: store a source hash on each cache write and purge on hash change for that namespace or document family. Do not rely only on TTL for policy, pricing, or entitlement content. Test the publish path end to end: update fixture docs, run the publisher, assert prior hits miss, then assert fresh generation repopulates with new field values. Unrelated docs should not purge unrelated namespaces if you claim fine-grained invalidation.

### How do canary tokens help catch false hits in cached answers?

Canary tokens are unique opaque strings planted in fixture cached payloads for a specific route or tenant. Golden prompts from other routes or tenants must never return those strings. When a false hit serves the wrong cached answer, the canary appears and the test fails without a probabilistic judge. Use canaries together with field extractors: canaries catch gross cross-route leakage quickly, while extractors catch subtle policy drift inside the correct route. Rotate canaries when fixtures leak into screenshots or logs so they stay unambiguous tripwires.

`,
};
