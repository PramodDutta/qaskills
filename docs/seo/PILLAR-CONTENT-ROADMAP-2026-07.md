# QASkills.sh 2026 Pillar Content Roadmap

Last updated: 2026-07-14

## Objective

Build a research-backed map of 100 long-tail search topics, then prepare 10 canonical
pillar guides of approximately 10,000 words with four attached child guides of approximately
3,000 words per pillar. The first publication wave therefore contains 50 reviewed articles;
the other 50 topics remain a validated backlog for later expansion.

The executable source of truth is
[`seo-topic-plan-2026.ts`](../../packages/web/src/app/blog/posts/seo-topic-plan-2026.ts).
Its unit test enforces the cluster, title, keyword, slug, and publication-wave counts.

## Why This Is a Consolidation Project

The current registry exposes 1,369 posts. The measured median is 2,665 words, 485 posts are
at least 3,000 words, and no current post reaches 9,000 words. The corpus already contains
298 Playwright pages, 47 MCP pages, 48 RAG pages, 25 DeepEval pages, and 23 Promptfoo pages.

Publishing another disconnected set would increase cannibalization. Wave one therefore uses:

- 23 upgrades to existing canonical URLs, preserving their accumulated search equity.
- 27 genuinely new URLs for current 2026 features or search intents not covered by the corpus.
- One pillar and four distinct child intents per cluster.
- Canonical redirects for superseded aliases instead of parallel near-duplicate pages.

## Research Inputs

- QASkills Search Console opportunity reports from May and June 2026.
- QASkills three-month GSC and GA4 report from June 13, 2026.
- The July 2026 cannibalization map and technical SEO audit.
- Playwright 1.60 and 1.61 release notes plus the official Playwright CLI and MCP documentation.
- OpenAI's June 2026 hosted Evals shutdown notice and March 2026 Promptfoo acquisition notice.
- ISTQB CT-AI v2.0, released in 2026 with expanded GenAI, LLM, data, and model testing.
- DeepEval 4 metrics, simulation, tracing, and agent-evaluation documentation.
- Promptfoo evaluation, agent-skill, coding-agent, RAG, red-team, and MCP documentation.
- Ragas metrics and synthetic testset documentation.
- Model Context Protocol 2025-11-25 specification, official conformance suite, Inspector,
  authorization, and security guidance.
- OWASP Top 10 for Agentic Applications 2026 and OWASP GenAI security guidance.

No exact monthly volume is claimed for newly emerging terms without a verified keyword-tool
export. Priority combines first-party QASkills GSC demand, official product changes, relevance
to the QASkills product, and the ability to satisfy a distinct search intent.

## Ten Clusters

| #   | Pillar cluster                       | Canonical pillar                                  | Wave-one children | Main intent                           |
| --- | ------------------------------------ | ------------------------------------------------- | ----------------: | ------------------------------------- |
| 1   | Playwright Testing in 2026           | `playwright-e2e-complete-guide`                   |                 4 | Reliable E2E implementation           |
| 2   | Playwright CLI for Coding Agents     | `playwright-cli-complete-guide-2026`              |                 4 | Terminal browser automation           |
| 3   | Playwright MCP Browser Automation    | `playwright-mcp-browser-automation-guide`         |                 4 | MCP setup, use, and security          |
| 4   | Playwright Test Agents               | `playwright-test-agents-planner-generator-healer` |                 4 | Planner, Generator, Healer workflows  |
| 5   | AI-Powered Test Automation           | `ai-test-automation-tools-2026`                   |                 4 | Applying AI to conventional QA        |
| 6   | LLM and AI Agent Testing             | `testing-llm-applications-guide`                  |                 4 | Framework-neutral evaluation strategy |
| 7   | DeepEval LLM Testing                 | `deepeval-llm-testing-guide`                      |                 4 | Pytest-style LLM and agent evals      |
| 8   | Promptfoo Evaluation and Red Teaming | `promptfoo-complete-guide-2026`                   |                 4 | Eval matrices and adversarial testing |
| 9   | RAG Testing and Evaluation           | `rag-evaluation-metrics-complete-2026`            |                 4 | Retrieval and answer quality          |
| 10  | MCP Server Testing and Security      | `mcp-server-testing-guide-2026`                   |                 4 | Protocol, contract, and security QA   |

Each cluster contains ten topics in the executable plan: one pillar, four first-wave children,
and five second-wave long tails. This yields exactly 100 unique slugs, titles, and primary
keywords without forcing all 100 pages into the first release.

## Editorial Acceptance Gates

Every pillar must meet all of these gates:

- 9,500 to 11,500 substantive words, excluding metadata.
- One primary keyword and six to ten natural secondary keywords.
- Direct, self-contained answer within the first 100 words.
- At least five correct code or configuration examples where the topic is technical.
- At least three useful comparison, decision, or reference tables.
- Links to all four attached child guides, `/skills`, and a relevant QASkills skill page.
- At least eight real FAQs whose answers appear visibly on the page.
- Inline links to primary documentation for versioned or security-sensitive claims.
- A conclusion that gives a decision or next action rather than repeating the introduction.

Every child guide must meet all of these gates:

- 2,800 to 3,800 substantive words.
- A search job that does not duplicate its pillar or sibling pages.
- Direct answer within the first 100 words.
- At least two accurate code or configuration examples where relevant.
- At least one decision or reference table.
- Link to its pillar, related siblings, `/skills`, and a relevant skill page.
- At least six visible FAQs and primary-source links.

All 50 pages must also pass:

- Unique title, description, slug, and primary keyword.
- Title/H1, URL, first paragraph, and heading alignment with search intent.
- `BlogPosting`, `BreadcrumbList`, and visible FAQ-derived `FAQPage` JSON-LD.
- Published and modified dates, keyword metadata, article section, and measured word count.
- Descriptive hero image alt text and a valid Open Graph image.
- No invented APIs, commands, benchmark numbers, customer claims, or unsupported statistics.
- No broken internal links, orphan cluster pages, placeholder text, or duplicate canonicals.
- Unit tests, production build, and Playwright post-flow smoke tests.

## Internal-Link Model

Every child links back to its pillar. Every pillar links to all four wave-one children. Sibling
links are used only when the next task is genuinely related. The page renderer also reads
optional `pillarSlug` and `relatedSlugs` metadata to show a visible topic-cluster navigation
block, while the existing related-article system continues to provide broader discovery.

## Publication Order

1. Playwright CLI and Playwright MCP, because the official interfaces changed materially in
   Playwright 1.59 through 1.61 and the existing QASkills pages are incomplete.
2. Playwright Test Agents and core Playwright, consolidating existing duplicate authority.
3. LLM testing, DeepEval, Promptfoo, and RAG, using current official framework behavior.
4. AI-powered QA and generic MCP testing, including OWASP 2026 agentic security coverage.
5. Run the complete editorial, schema, build, and browser verification suite before publishing.

## Current Status

- [x] Current registry, word-count distribution, and saturated clusters measured.
- [x] Existing GSC, GA4, technical audit, and cannibalization research reviewed.
- [x] Exactly 100 topics mapped into ten intent-separated clusters.
- [x] Wave one fixed at ten pillars plus forty child guides.
- [x] Optional keyword, modified-date, word-count, and cluster metadata added to the blog model.
- [x] All ten first-wave clusters implemented and gated (50/50 articles: ten pillars and forty children).
- [x] Ten 1600×900 pillar hero images are present as crawlable PNGs with editable SVG sources.
- [x] Ten pillar drafts meet the 9,500-word minimum and editorial gates.
- [x] Forty child drafts meet the 2,800-word minimum and editorial gates.
- [x] Canonical aliases are consolidated for every upgraded topic.
- [x] Full unit, build, and Playwright post-flow verification passes on localhost.
