# Keyword Gap Analysis — Live GSC (2026-06-15)

**Source:** Google Search Console, URL-prefix property `https://qaskills.sh/`, last 3 months
(2026-03-14 → 2026-06-13). Pulled the full 1,000-query table from the DOM and diffed against
the 531 live blog articles + 46 `/compare` pages + 14 `/skills-for` hubs.

**Totals:** 5.91K clicks · 465K impressions · 1.3% CTR · avg position 8.5

---

## TL;DR — the honest finding

**The premise "keywords we're missing" is mostly already solved.** Nearly every
high-impression non-brand query *already has a dedicated article*. The lever now is **CTR /
ranking on pages that already exist**, not net-new content. There is a *small* genuine-gap
list (~8 pages, ~1K combined impressions) worth adding, and a large rank-lift opportunity on
pages already published.

| Bucket | Impressions | Clicks | Reality |
|---|---|---|---|
| Already covered, ranks p4–13, ~0 CTR | ~25K+ | ~10 | **Rank-lift problem, not content gap** |
| Genuinely missing dedicated page | ~1,050 | ~4 | **Write these (small list below)** |
| "X vs pytest" nonsense pairs | 5,047 | 0 | Harmless organic fuzzy-match noise — no action |
| Brand / navigational | ~4K | ~1.9K | Working as intended |

---

## 1. Genuinely MISSING pages (write these) — ~1,050 impr, near-0 clicks

These have real search demand and **no dedicated page** today. Ordered by value.

| # | Topic / target query | Impr (3mo) | Pos | Why it's a win |
|---|---|---|---|---|
| 1 | **`PLAYWRIGHT_BROWSERS_PATH` (Python install location)** — "must be set before importing", "=0 meaning", "ms-playwright env var" | **~314** | 2.2–6.4 | Already ranks p2.2 with 0 clicks → a focused reference page should capture it fast |
| 2 | **Postman vs Playwright** (API-vs-E2E tool comparison) | **~261** | 7–8.6 | Real comparison intent; we have neither direction |
| 3 | **Playwright file upload / `setInputFiles`** (buffer, mime, examples, "official docs") | **~125** | 6–7.4 | Feature-reference intent, evergreen |
| 4 | **"What's new in Playwright 2026" / Playwright updates 2026** | **114** | 9 | Evergreen-refresh page, high recurring demand |
| 5 | **Playwright mobile emulation** (device viewport / "official docs") | **91** | 8.3 | Feature reference |
| 6 | **pyunit vs pytest** (only mentioned in a body today, no dedicated page) | **66** | 8.7 | Variant of our top pytest cluster |
| 7 | **TestRigor vs Playwright** | 19 | 7.1 | Codeless-vs-code comparison, low volume |
| 8 | **Vitest 3 → 4 migration / breaking changes** | ~8 | 2.0 | Tiny now but already p2 — easy evergreen win |

> Note on intent: queries #1, #3, #5 phrase as **"official docs"** — searchers want a
> dry, canonical *reference* (tables, signatures, exact env-var values), not a tutorial.
> Match that format or they'll keep bouncing back to playwright.dev.

---

## 2. The REAL leverage — rank-lift on pages we ALREADY have

These are NOT missing. The articles exist with good titles. They rank p4–13 and convert ~0%.
This is where the impressions actually are.

| Cluster | Impr | Clicks | Pos | Existing page(s) | Action |
|---|---|---|---|---|---|
| **Playwright MCP + Cursor** (install / mcp.json / ide setup / troubleshooting) | **5,785** | 6 | 4–10 | `playwright-mcp-cursor-ide-setup-2026`, `…-cursor-tutorial-2026`, `…-cursor-troubleshooting-guide`, `…-json-configuration-reference` | Consolidate into one canonical hub + internal links + 2026/2026 freshness in titles |
| **"Comparing popular BDD frameworks"** | **4,710** | **0** | **4.7** | `comparing-popular-bdd-frameworks-2026-complete-guide` | ✅ **RESOLVED via live-SERP check (2026-06-15).** The query triggers a Google **AI Overview that cites QASkills.sh** as a source (verified "QASkills.sh +1" source chip), and our blue link ranks **#3 organic**. The 0 clicks = structural **zero-click search** — users get the answer inline. We already **own the citation** (a GEO win). Not a ranking bug; no restructure needed. Don't chase clicks here — redirect click-optimization to non-AIO clusters. |
| **Playwright "official docs" intents** (storageState, component testing, browser contexts, mobile) | **4,008** | 0 | 7–9 | reference pages exist | Add `dateModified`, tighten titles to include "Reference", interlink from `/skills` |
| **pytest / unittest** (best practices, python vs pytest, unittest vs pytest, python unittest vs pytest) | ~3,000 real | ~5 | 5.5–10.6 | `python-vs-pytest-explained`, `unittest-vs-pytest-2026`, etc. | Featured-snippet formatting (definition + table up top) |
| **OpenAI Evals** ("official docs 2026", "documentation 2026") | **2,186** | 1 | 4.9–8.3 | `openai-evals-complete-guide-2026` + 2 more | Title/intent mismatch — searcher wants "docs"; add a docs-style reference section |

### ⚠️ Rank-lift reality check (live SERPs, 2026-06-15)

Before investing in rank-lift, I verified 3 representative head-term SERPs. The quick
on-page levers turned out to be **already pulled** (titles exact-match queries, related-post
cross-linking is automatic via `getRelatedPosts`, FAQ/Breadcrumb/BlogPosting schema present):

| Query | Impr | Live SERP reality | Quick-edit headroom |
|---|---|---|---|
| comparing popular bdd frameworks | 4,710 | Zero-click **AI Overview that cites QASkills.sh**; we're #3 organic | None — we already own the citation |
| playwright mcp server install cursor | 5,785 | **AI Overview (cites TestDino, not us)** + playwright.dev + microsoft/playwright-mcp GitHub + a dozen authority competitors | Very low — official sources + AIO + DA dominate "install" intent |
| pytest best practices | 654 | pytest.org official docs + Real Python + Reddit; we sit ~p5.5 (page 1) | Low — top-3 needs domain authority we don't have yet |

**Takeaway:** the head terms are gated by **domain authority, AI Overviews, and official
sources** — not by anything a title rewrite or freshness-date bump fixes. The right rank-lift
strategy is exactly what this batch did: **target winnable long-tail** (setInputFiles
reference, postman-vs-playwright, mobile-emulation) where official-source dominance is weaker.
The remaining real levers are slower/strategic, NOT quick edits:
- **GEO-citability** — restructure specific pages as clean direct-answer + exact-config-block
  + numbered steps so AI Overviews cite *us* (TestDino wins MCP citations this way). Per-page
  content work, uncertain ROI; don't touch the BDD page (already cited — don't break it).
- **Domain authority / backlinks** — off-page; outside code scope.

**Common rank-lift playbook (use only when a SERP shows real headroom — verify first):**
1. Title/snippet rewrite to exact-match the query phrasing (esp. add "Reference" / "2026" / "official").
2. Direct-answer block in the first 100 words (wins featured snippet + AI Overview citation).
3. Internal links from high-authority pages (`/blog` featured grid, `/skills`, related hubs).
4. `dateModified` bump for freshness.
5. For the BDD 0-click anomaly: manually inspect the live SERP — if it's an AI Overview, the fix is answer-block structuring, not ranking.

---

## 3. No action needed

- **"X vs pytest" pairs** (pytest vs go / dart / css grid / unity / numpy / pip / koa / qwik…):
  5,047 impr, **0 clicks, 45 queries**. We did **not** create these pages — `/compare` is
  curated-only (`notFound()` on arbitrary slugs) and no blog post generates them. This is
  Google fuzzy-matching our pytest content to irrelevant long-tail queries. Harmless noise;
  ignore.
- **Brand variants** (qaskills.sh, qa skills, claude qa skills, skills.sh misspellings):
  working as intended, ~1.9K clicks.

---

## Recommended sequence

1. **Quick win (1 batch):** write the 8 missing pages in §1 — heavy on the reference-style
   ones (PLAYWRIGHT_BROWSERS_PATH, setInputFiles, mobile emulation) since they already rank
   p2–6 and just need a dedicated, canonical page to convert.
2. **High leverage (separate pass):** rank-lift §2 — start with the BDD anomaly investigation
   and the Playwright-MCP-Cursor consolidation (combined ~10K impressions at ~0 CTR).
3. Skip §3 entirely.

> Bottom line: we don't need another 200 articles. We need ~8 small pages and a CTR pass on
> the ~25K impressions we're already earning but not clicking.
