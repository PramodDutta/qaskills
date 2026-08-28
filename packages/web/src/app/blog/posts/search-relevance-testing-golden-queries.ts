import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Search Relevance Testing with Golden Queries, NDCG, and Drift Alarms',
  description: 'Search relevance testing with golden queries, graded judgments, and NDCG drift alarms that fail CI before ranking regressions hit production.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Search Relevance Testing with Golden Queries, NDCG, and Drift Alarms

Search relevance testing measures whether your search or retrieval stack returns the right documents in the right order for a frozen set of queries. You build a golden query set, attach graded judgments (0-3 or binary), run the current index or embedding model against those queries, then score ranking quality with NDCG@k, MRR, and Precision@k. When a model upgrade, query rewriter, or filter change drops NDCG below a baseline, CI fails. That is the whole loop: fixed judgments in, ranked ids out, metric delta as the gate.

Offline scores are not vanity charts. They are regression sensors. Click-through and revenue still matter online, but they lag and confound. A golden set with graded labels tells you tonight whether last week's embedding swap buried the documents your raters marked as highly relevant.

## Golden query sets that survive model upgrades

A golden query set is a versioned JSON (or JSONL) corpus of real-ish queries, expected document ids, graded labels, and optional metadata such as locale, vertical, and active filters. Treat it like a fixture suite, not a spreadsheet someone edits ad hoc. Freeze the document ids and labels when you cut a baseline. When the corpus of documents changes, re-judge or retire queries instead of silently remapping ids.

Sample schema that works for keyword, hybrid, and vector retrieval:

\`\`\`json
{
  "version": "2026-08-01",
  "k": 10,
  "queries": [
    {
      "id": "q-0471",
      "text": "refund policy for annual plan",
      "locale": "en-US",
      "filters": { "product": "billing", "status": "published" },
      "judgments": [
        { "doc_id": "doc-8821", "grade": 3 },
        { "doc_id": "doc-4410", "grade": 2 },
        { "doc_id": "doc-1199", "grade": 1 }
      ]
    }
  ]
}
\`\`\`

Grade scale convention many teams use:

| Grade | Meaning | Typical use |
| --- | --- | --- |
| 3 | Exact answer or primary intent | Must appear near the top |
| 2 | Useful supporting doc | Acceptable in top k |
| 1 | Tangentially related | Better than noise, not a win |
| 0 | Irrelevant or harmful | Should not rank in top k |

Binary labels (relevant / not) are fine for Precision@k and MRR. Graded labels unlock NDCG, which rewards putting a grade-3 document above a grade-1 document. Start binary only if raters cannot agree on mid grades; move to 0-3 once you have a short rubric and examples.

Source queries from production logs with PII stripped, plus intentional edge cases: typos, synonym swaps, empty-ish intents, and queries that historically returned zero hits. Cap the set so a full offline run finishes in CI (often 200-2000 queries depending on latency). Stratify by traffic weight and by failure mode so popular navigational queries cannot drown rare but costly support queries.

Version the golden file in git. Tag baselines (\`golden@2026-08-01\`) when you accept a new model. Diff queries like you diff tests. Reject drive-by label edits without a reviewer who understands the rubric.

## Graded judgments without turning raters into a bottleneck

Judgment quality is the silent dependency of every metric. If two raters disagree on half the pairs, your NDCG delta is noise wearing a lab coat. Write a one-page rubric with three positive examples and three negative examples per grade. Require dual labeling on a sample, compute Cohen's kappa or simple percent agreement, and escalate ties to a third rater or a search owner.

Practical labeling workflow:

1. Sample candidates from current top-20 plus known good docs from older judgments.
2. Blind the rater to which system produced the hit list when possible.
3. Capture free-text notes only for grade changes that overturn a prior baseline.
4. Store rater id and timestamp on each judgment for audit, not for public dashboards.

What people get wrong: they chase perfect universal truth labels. Search intent is contextual. A doc that is grade 3 for "cancel subscription" on the billing site may be grade 0 for the same string on a developer docs site. Scope judgments to a product surface and locale. Multi-intent queries get multiple relevant docs, not a single winner. Force-ranking one winner invents false precision and punishes systems that correctly diversify results.

When labeler disagreement is high on a query, quarantine it from the CI gate set into a "shadow" set. Keep measuring it, but do not fail deploys on it until the rubric is clarified. Shadow sets still catch catastrophic empties; they just do not veto a 0.01 NDCG wiggle.

## Computing NDCG@k, MRR, and Precision@k from a frozen set

Metrics answer different questions. Use all three on the same golden run so a regression cannot hide by trading one for another.

| Metric | Question it answers | Sensitive to |
| --- | --- | --- |
| Precision@k | What fraction of the top k are labeled relevant? | Binary cutoff, k |
| MRR | How soon does the first relevant doc appear? | Single first hit |
| NDCG@k | How well does rank order match graded ideal order? | Grades and positions |

Discounted Cumulative Gain at position i uses a log2 discount so lower ranks count less. Normalized DCG divides by the ideal DCG for that query's judgments truncated to k. Implementation sketch in TypeScript you can drop into a Node harness:

\`\`\`ts
type Judgment = { doc_id: string; grade: number };
type GoldenQuery = { id: string; judgments: Judgment[] };

function dcgAtK(rels: number[], k: number): number {
  let sum = 0;
  const n = Math.min(k, rels.length);
  for (let i = 0; i < n; i++) {
    const gain = Math.pow(2, rels[i]) - 1;
    const discount = Math.log2(i + 2); // rank 1 -> log2(2)
    sum += gain / discount;
  }
  return sum;
}

function ndcgAtK(
  rankedIds: string[],
  judgments: Judgment[],
  k: number,
): number {
  const gradeById = new Map(judgments.map((j) => [j.doc_id, j.grade]));
  const rels = rankedIds.slice(0, k).map((id) => gradeById.get(id) ?? 0);
  const dcg = dcgAtK(rels, k);
  const ideal = [...judgments.map((j) => j.grade)]
    .sort((a, b) => b - a)
    .slice(0, k);
  const idcg = dcgAtK(ideal, k);
  return idcg === 0 ? 0 : dcg / idcg;
}

function mrr(rankedIds: string[], relevant: Set<string>): number {
  for (let i = 0; i < rankedIds.length; i++) {
    if (relevant.has(rankedIds[i])) return 1 / (i + 1);
  }
  return 0;
}

function precisionAtK(
  rankedIds: string[],
  relevant: Set<string>,
  k: number,
): number {
  const top = rankedIds.slice(0, k);
  if (top.length === 0) return 0;
  const hits = top.filter((id) => relevant.has(id)).length;
  return hits / k;
}
\`\`\`

Python equivalent for teams that already score offline in notebooks:

\`\`\`python
import math
from typing import Dict, List, Set

def dcg_at_k(rels: List[float], k: int) -> float:
    total = 0.0
    for i, rel in enumerate(rels[:k]):
        gain = (2 ** rel) - 1
        total += gain / math.log2(i + 2)
    return total

def ndcg_at_k(ranked_ids: List[str], grades: Dict[str, float], k: int) -> float:
    rels = [grades.get(doc_id, 0.0) for doc_id in ranked_ids[:k]]
    dcg = dcg_at_k(rels, k)
    ideal = sorted(grades.values(), reverse=True)[:k]
    idcg = dcg_at_k(ideal, k)
    return 0.0 if idcg == 0 else dcg / idcg

def mean_metric(values: List[float]) -> float:
    return sum(values) / len(values) if values else 0.0
\`\`\`

Macro-average metrics across queries (unweighted mean of per-query scores) unless you deliberately weight by traffic. Traffic weighting is honest for product risk and dangerous for CI flakes when a few head queries dominate. Publish both: unweighted for gates, traffic-weighted for product review.

Document the binary cutoff you use for Precision and MRR (grade >= 2 is common when using 0-3). Changing the cutoff without rebasing metrics is a silent methodology break.

## Offline harnesses that replay production-shaped traffic

An offline harness loads the golden set, calls your search API or in-process retriever with the same filters and locale headers production uses, collects ranked ids, then writes a metrics JSON artifact. Keep the harness deterministic: fixed seeds for any stochastic reranker, pinned model ids, and pinned index snapshots when possible.

Minimal Node driver shape:

\`\`\`ts
import fs from 'node:fs';
import { ndcgAtK, mrr, precisionAtK } from './metrics';

type GoldenFile = {
  version: string;
  k: number;
  queries: Array<{
    id: string;
    text: string;
    filters?: Record<string, string>;
    judgments: Array<{ doc_id: string; grade: number }>;
  }>;
};

async function search(text: string, filters?: Record<string, string>) {
  const res = await fetch(process.env.SEARCH_URL!, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ q: text, filters, size: 10 }),
  });
  if (!res.ok) throw new Error(\`search failed: \${res.status}\`);
  const body = (await res.json()) as { hits: Array<{ id: string }> };
  return body.hits.map((h) => h.id);
}

async function main() {
  const golden = JSON.parse(
    fs.readFileSync('golden/queries.json', 'utf8'),
  ) as GoldenFile;
  const rows = [];
  for (const q of golden.queries) {
    const ranked = await search(q.text, q.filters);
    const relevant = new Set(
      q.judgments.filter((j) => j.grade >= 2).map((j) => j.doc_id),
    );
    rows.push({
      id: q.id,
      ndcg: ndcgAtK(ranked, q.judgments, golden.k),
      mrr: mrr(ranked, relevant),
      p_at_k: precisionAtK(ranked, relevant, golden.k),
      empty: ranked.length === 0,
    });
  }
  const avg = (key: 'ndcg' | 'mrr' | 'p_at_k') =>
    rows.reduce((s, r) => s + r[key], 0) / rows.length;
  const report = {
    golden_version: golden.version,
    n: rows.length,
    ndcg: avg('ndcg'),
    mrr: avg('mrr'),
    precision_at_k: avg('p_at_k'),
    empty_rate: rows.filter((r) => r.empty).length / rows.length,
    per_query: rows,
  };
  fs.writeFileSync('artifacts/relevance.json', JSON.stringify(report, null, 2));
}

main();
\`\`\`

Run this against a staging index built from the same snapshot the baseline used when you need clean apples-to-apples comparisons. When you must hit a live moving index, record index generation ids in the artifact so you can explain weird diffs later.

For hybrid retrieval stacks (BM25 + vectors + rerank), keep the harness able to toggle stages. A drop that appears only when the cross-encoder reranker is on is a different bug class from a pure embedding miss. Teams working on retrieval quality for answer generation often pair this offline loop with [rag testing for hybrid retrieval tuning](/blog/rag-testing-hybrid-retrieval-tuning) so chunking and fusion weights get the same golden treatment.

## Side-by-side online checks that do not replace offline gates

Online side-by-side (SXS) shows two result lists for the same query to raters or to an internal tool. It catches presentation issues offline metrics ignore: snippet quality, duplicate near-matches, and "technically relevant but wrong surface" docs. It does not replace NDCG gates. SXS volume is tiny, rater fatigue is real, and you cannot run SXS on every pull request.

Use SXS when:

- You change UI result cards or snippet fields.
- Offline NDCG is flat but support tickets claim results "feel worse."
- You introduce a new query rewriter and want qualitative examples for a design review.

Keep offline CI as the fast veto. Promote to online experiments only after offline clears a threshold and SXS spot checks do not reveal obvious junk in the top three.

Interleaving and A/B tests measure clicks and downstream task success. Those are product experiments with traffic and privacy constraints. Search relevance testing in the sense of this guide stays mostly offline-plus-SXS so engineers get a same-day signal.

## Embedding upgrade drift alarms

Model upgrades are the classic silent killer. Average cosine similarity on a random doc sample looks fine. Head queries still work. Mid-tail support queries slide from rank 2 to rank 14 and NDCG@10 drops 0.04. Nobody notices until refund tickets spike.

A drift alarm compares current harness metrics to a committed baseline file and fails when deltas exceed budgets.

\`\`\`ts
type Metrics = {
  golden_version: string;
  ndcg: number;
  mrr: number;
  precision_at_k: number;
  empty_rate: number;
};

type Budgets = {
  ndcg_max_drop: number;
  mrr_max_drop: number;
  precision_max_drop: number;
  empty_rate_max_rise: number;
};

function assertNoDrift(current: Metrics, baseline: Metrics, budgets: Budgets) {
  if (current.golden_version !== baseline.golden_version) {
    throw new Error(
      \`golden version drift: current=\${current.golden_version} baseline=\${baseline.golden_version}\`,
    );
  }
  const drops = {
    ndcg: baseline.ndcg - current.ndcg,
    mrr: baseline.mrr - current.mrr,
    precision_at_k: baseline.precision_at_k - current.precision_at_k,
    empty_rate: current.empty_rate - baseline.empty_rate,
  };
  const failures: string[] = [];
  if (drops.ndcg > budgets.ndcg_max_drop) {
    failures.push(\`NDCG drop \${drops.ndcg.toFixed(4)} > \${budgets.ndcg_max_drop}\`);
  }
  if (drops.mrr > budgets.mrr_max_drop) {
    failures.push(\`MRR drop \${drops.mrr.toFixed(4)} > \${budgets.mrr_max_drop}\`);
  }
  if (drops.precision_at_k > budgets.precision_max_drop) {
    failures.push(
      \`P@k drop \${drops.precision_at_k.toFixed(4)} > \${budgets.precision_max_drop}\`,
    );
  }
  if (drops.empty_rate > budgets.empty_rate_max_rise) {
    failures.push(
      \`empty_rate rise \${drops.empty_rate.toFixed(4)} > \${budgets.empty_rate_max_rise}\`,
    );
  }
  if (failures.length) {
    throw new Error(\`relevance drift alarm:\\n\${failures.join('\\n')}\`);
  }
}
\`\`\`

Suggested starting budgets for a stable catalog search (tune to your noise floor):

| Signal | Soft warn | Hard fail in CI |
| --- | --- | --- |
| NDCG@10 mean drop | 0.01 | 0.025 |
| MRR mean drop | 0.01 | 0.03 |
| Precision@10 drop | 0.02 | 0.04 |
| Empty result rate rise | 0.005 | 0.015 |

Always fail on golden_version mismatch unless the job is explicitly a "rebaseline" workflow with human approval. Rebaseline by replacing \`baseline/relevance.json\` in a dedicated PR that includes the metric tables and a short rationale, not by editing numbers in place on a feature branch.

Caching layers can mask embedding drift during tests if stale vectors are served. If you use response caches in front of retrieval, invalidate or bypass them in the harness. Related patterns for LLM apps show up in [semantic cache testing for LLM applications](/blog/semantic-cache-testing-llm-applications), where a cache hit on an old embedding space looks healthy until you measure ranked ids against judgments.

## Query rewriting, filters, and near-empty result traps

Query rewriting (spellfix, synonym expansion, LLM reformulation) changes the string your retriever sees. Relevance tests must run with rewriter on and off, or at least pin rewriter version in the artifact. A rewriter that helps head queries can destroy exact SKU searches by over-expanding tokens.

Filters and facets interact with ranking in ways bag-of-metrics miss. A query can score well globally and still return zero hits when \`status=published\` and \`region=eu\` are applied. Encode filters on golden queries that use them in production. Add dedicated cases:

- Filter that should still yield >=1 grade >=2 doc
- Conflicting filters that should yield empty intentionally
- Facet value that exists in the index but not for the query intent

Empty and near-empty regressions deserve their own counters. Track \`empty_rate\` and \`lt3_rate\` (fewer than three hits). A system can keep mean NDCG stable while doubling empties on a thin slice if those queries previously scored near zero anyway. Slice metrics by vertical and by filter presence.

Shell snippet for a CI step that runs the harness and uploads artifacts:

\`\`\`shell
set -euo pipefail
export SEARCH_URL="\${SEARCH_URL}"
node scripts/relevance-harness.js
node scripts/assert-no-drift.js \\
  --current artifacts/relevance.json \\
  --baseline baseline/relevance.json \\
  --budgets config/relevance-budgets.json
\`\`\`

In GitHub Actions, keep the checkout and Node setup on v4 actions, and upload the report for humans to inspect:

\`\`\`yaml
name: search-relevance
on:
  pull_request:
  push:
    branches: [main]
jobs:
  offline-ndcg:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - run: npm ci
      - run: npm run relevance:offline
      - run: npm run relevance:assert-drift
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: relevance-report
          path: artifacts/relevance.json
\`\`\`

If you gate with Vitest around metric helpers, select cases with \`-t\` / \`--testNamePattern\`. If Playwright covers an internal SXS admin UI, focus with \`--grep\` / \`-g\`. Do not overload end-to-end UI tests with NDCG math; keep scoring in the offline harness.

## Failure story: the synonym that erased refunds

Symptom: support volume for "cannot find refund policy" jumped over a weekend after an "innocuous" embedding model bump. Online dashboards looked fine. Click-through on head navigational queries was flat. The on-call search engineer assumed the index build had dropped the billing collection.

Wrong theory: missing documents. The team spent half a day comparing document counts between clusters. Counts matched. A manual query for \`refund policy\` still returned the right doc at position 1 in staging with the old model id pinned.

Actual cause: a query rewriter synonym pack shipped in the same release window. It expanded \`refund\` to include \`return\`, \`chargeback\`, and a product-specific token that heavily favored logistics docs. The embedding upgrade alone was within budget on the golden set. Combined with rewriter-on, NDCG@10 on the billing stratum fell 0.06 and empty_rate on filtered billing queries rose. The CI job had been running with \`rewrite=false\` because someone marked rewriter tests as flaky two months earlier.

Fix: re-enable rewriter-on in the offline harness, split budgets by stratum (billing vs docs vs blog), and add a golden query \`refund policy for annual plan\` with filters \`{ "product": "billing" }\` and a grade-3 judgment on the canonical policy doc. The drift alarm now fails the combined stack. The synonym pack was narrowed; chargeback expansion became a vertical-specific rule instead of a global rewrite.

The lesson for search relevance testing is compositional. Measure the stack users actually hit, including rewrite, filters, and cache bypass rules. Component-level green arrows can still ship a red experience.

## What people get wrong about search relevance testing

People treat NDCG as a single corporate KPI and optimize the mean until the suite becomes a training target. Teams add queries that the current model already wins, inflate the average, and call it quality. That is teaching to the test. Prefer a fixed core set plus a rotating challenge set that is not allowed to affect the CI mean until it graduates after review.

People also confuse retrieval evaluation with answer evaluation. Returning the right chunk is not the same as generating the right paragraph. If your product is RAG chat, keep ranking metrics separate from faithfulness and citation checks. Mixing them into one "quality score" hides whether you should fix the index or the prompt.

Another frequent miss: ignoring near-duplicates. If three near-identical docs occupy ranks 1-3, Precision@k looks great and users still scroll in frustration. Add a diversity note in SXS and, where your stack supports it, a simple duplicate-title penalty check in the harness output for human review.

Finally, people skip empty-result alarms because "NDCG already covers it." It does not. Queries with no graded documents contribute zeros that get averaged away when the rest of the set is healthy. Explicit empty_rate and per-stratum slices catch the thin failure modes that create tickets.

If you want a starter pack of QA workflows for agents that maintain harnesses and CI gates, ready-made QA skills install from qaskills.sh with the qaskills CLI. Use them to standardize how agents propose golden query PRs, not as a substitute for your rubric.

## Wiring NDCG drops into CI gates

CI should fail closed on hard budgets and comment soft warnings on PRs for near misses. Store baseline metrics next to the golden file. Make rebaseline an explicit workflow:

1. Run harness on main with the new model or index.
2. Open a PR that only updates \`baseline/relevance.json\` and a short \`RELEVANCE_NOTES.md\` table of before/after.
3. Require a search owner review.
4. Merge, then allow feature work to proceed against the new floor.

Per-query diffs matter when the mean is within budget but a critical navigational query falls out of the top three. Emit a top-losers list in the artifact:

\`\`\`ts
function topLosers(
  current: Array<{ id: string; ndcg: number }>,
  baseline: Array<{ id: string; ndcg: number }>,
  n = 10,
) {
  const base = new Map(baseline.map((r) => [r.id, r.ndcg]));
  return current
    .map((r) => ({ id: r.id, drop: (base.get(r.id) ?? 0) - r.ndcg }))
    .filter((r) => r.drop > 0)
    .sort((a, b) => b.drop - a.drop)
    .slice(0, n);
}
\`\`\`

Post that list in the CI log. Humans triage losers faster than they read a single mean. When a loser is a label bug, fix the judgment in a separate PR. When it is a real ranking regression, block the model promotion.

Keep jobs cheap enough to run on every PR that touches retrieval code, embeddings, rewriters, or ranking configs. Path filters help, but run nightly full-set jobs even when those paths are quiet so corpus drift still surfaces.

Search relevance testing earns its keep when it is boring: same golden file, same formulas, same budgets, loud failure when order quality slips. The rest of the product can move fast because ranking regressions trip a wire before customers do.

## Frequently Asked Questions

### How large should a golden query set be for search relevance testing?

Start with 200 to 500 queries if each search call costs tens of milliseconds and CI minutes are scarce. Grow toward 1000 to 2000 as latency and labeling capacity allow. Stratify by head, torso, and tail traffic, and reserve 10 to 20 percent for known historical failures. Quality of judgments beats raw count. Two hundred well-labeled, filter-aware queries outperform two thousand single-rater binary labels with no locale or facet context. Revisit size when mean confidence intervals on NDCG overlap your hard-fail budget.

### Should CI use NDCG@k or MRR as the primary gate?

Use NDCG@k as the primary gate when you have graded judgments, because it penalizes burying highly relevant documents under weak ones. Keep MRR and Precision@k as secondary gates so a system cannot game NDCG with scattered mid grades while pushing the first useful hit down. If you only have binary labels, MRR plus Precision@k is a honest pair. Publish all three in the artifact every run so reviewers see tradeoffs instead of a single number used as a mascot.

### How do you handle document id changes when content is re-ingested?

Never silently remap ids inside the golden file during an ingest. If ids are content hashes, stable content keeps stable ids and judgments remain valid. If ids are database sequences, store a durable key (canonical URL or external id) on each judgment and resolve to the live id at evaluation time. When content changes enough that the old grade is wrong, retire or re-label the query. A rebaseline PR should list id resolution failures as explicitly as metric drops.

### What is a safe NDCG drop threshold before failing a deploy?

There is no universal constant. Measure night-to-night noise on main for two weeks with no ranking changes, then set the hard fail near two to three times that noise floor, and a soft warn near one times. Many stable catalog systems land hard fails around a 0.02 to 0.03 mean NDCG@10 drop on an unweighted set, with tighter budgets on money paths. Always pair NDCG budgets with empty_rate budgets. Revisit thresholds after golden set edits, because adding hard queries changes the mean and the noise together.
`,
};
