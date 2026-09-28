# 52-article batch: the failure modes that slip past gates and auditors

**Problem:** Publish about 50 SEO articles into a saturated 1,787-post corpus. Every one had to be net-new, current as of the day, and correct, and the writer and auditor models each introduced errors of their own.

## Approach

1. **Source from real demand first.** Pull the top 1,000 Search Console queries (in batches of about 35 rows, because the privacy guard truncates longer returns). Match each query's tokens against every live slug and title, and keep only queries that no single article covers. Then add net-new tools and releases, each checked with a slug/title regex against the corpus.
2. **Check each tool's identity, not just its activity.** `archived`, `pushed_at`, and the latest release all looked healthy for Magnitude, yet its README headline showed it had pivoted from AI browser testing to a local LLM runner. Read the repo description and README title before writing a guide.
3. **Verify every version in the research notes against the registry** (`npm view`, PyPI JSON, pub.dev API, Maven metadata, `gh api releases`) before injecting it. One of my notes said "Vitest 4 is current", but Vitest 5 had shipped three weeks earlier. The writer corrected it, then leaked the correction as meta text ("changed from the research starting point").
4. **Sweep the whole batch mechanically after generation.** Resolve every `uses:` action ref with `gh api .../git/refs` (branches count, as Cypress's `v7` shows), grep all image and package pins against their registries, and grep for APIs the latest major removed (`Cypress.env()` in Cypress 16). This caught `flutter-action@v3`, an unpublished `wd@1.16.0`, stale Docker tags, and a `Cypress.env()` call that neither the gate nor the auditor flagged.
5. **Grow the leak regex from real misses.** Writers echoed the spec's style rules as prose ("majors requested for this site", "for this article set", "project standard requested") even though the prompt said to apply them silently. Each new phrasing went into the gate the moment it appeared.
6. **Adjudicate every audit finding against a primary source.** This round 48 of 53 findings were real and 5 were auditor errors: oha `--worker-threads` exists, as do Soda's named `sources:` and the Smart Tests v2.15.0 release.

## Judgment calls

- **Swapped topics in waves that had not started** (Magnitude for Lightpanda), and edited prompts in place to inject verified facts, instead of fixing the articles afterwards.
- **Skipped TestSprite** even though it had no coverage: it is an active sponsor prospect, so a free article would undercut a paid placement.
- **Did not pay for Grok** when its free tier ran out after one article; Codex absorbed the reassigned topics.
- **Requested keep-awake** after a two-hour stall. The Mac had slept and paused every background job, and nothing reported an error.

## Reusable rule

Trust nothing that any model wrote about the present: check tool identity, versions, and removed APIs against the live registries and READMEs, and treat every leaked phrase as a new gate rule.
