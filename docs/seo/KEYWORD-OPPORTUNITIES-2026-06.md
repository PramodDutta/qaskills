# QASkills.sh — Keyword Opportunity Report (June 2026)

**Date range:** Mar 2 – Jun 1, 2026 (3 months)
**Source:** Google Search Console — property `https://qaskills.sh/` (URL-prefix, owner luckydutta96@gmail.com)
**Total clicks:** 4.35K | **Total impressions:** 250K | **Avg CTR:** 1.7% | **Avg position:** 9.6

> NOTE: GSC property is **URL-prefix `https://qaskills.sh/`**, NOT `sc-domain:qaskills.sh`. Earlier MEMORY was wrong. Use the URL-prefix property for all future pulls.

---

## Summary

Impressions exploded to 250K (vs 14.9K in the May report) — the 230+ new articles are indexing and surfacing. But **CTR collapsed to 1.7%** (was 5.84%) because most new articles rank **page 2 (pos 7-11)** where they earn impressions but ~0 clicks. The growth job now is **half new-content, half rank-lifting** existing page-2 articles into the top 3.

### Biggest single gap

| Query | Impressions | Position | Clicks | Status |
|-------|-------------|----------|--------|--------|
| **comparing popular bdd frameworks** | **4,468** | 4.7 | **0** | Article exists + refreshed. Pos 4.7 = page-1 bottom. Needs internal links + depth to crack top 3 → ~800 clicks/mo |

### High-impression, page-2, ~0-click queries (article EXISTS, needs rank lift)

| Query | Imp | Pos | Clicks |
|-------|-----|-----|--------|
| python vs pytest | 471 | 7.7 | 0 |
| playwright authentication storagestate official docs | 387 | 7.6 | 0 |
| unittest vs pytest | 376 | 9.6 | 2 |
| openai evals official docs 2026 | 275 | 7.4 | 0 |
| pytest vs unittest | 276 | 12.5 | 1 |
| playwright accessibility testing axe official docs | 242 | 7.3 | 0 |
| k6 vs jmeter | 237 | 14.8 | 2 |
| openai evals official documentation 2026 | 237 | 7.4 | 0 |
| python unittest vs pytest | 216 | 8.8 | 0 |
| startedkafkacontainer getbootstrapservers | 192 | 3.2 | 0 |

**Action for these:** NOT new articles — add cross-links from high-authority pages, refresh dates, expand the exact-match section. Separate rank-lift task.

---

## 25 NEW Articles to Write (real GSC demand, no existing coverage)

Each backed by actual queries from the 3-month report. Grouped by cluster.

### A. Pytest informational cluster (huge 0-click demand, pos 1-6, people confused pytest with a language)
Queries: `what is pytest` (156 imp pos 1.1), `what is pytest in python`, `how does pytest work`, `is pytest part of python standard library`, `pytest best practices 2026`, `pytest latest version 2026`, `current version of pytest may 2026`, `pytest 2026 release notes`, `alternatives to pytest`

1. **what-is-pytest-python-explained** — "What Is Pytest in Python? (And Why It's Not a Language)"
2. **pytest-best-practices-2026** — "Pytest Best Practices 2026: Fixtures, Markers, Config, Plugins"

### B. Playwright reference gaps (pos 7-10, queries with no/weak dedicated page)
3. **playwright-multiple-tabs-windows-guide** — `playwright multiple tabs` (pos 10.9)
4. **playwright-page-evaluate-complete-guide** — `playwright page.evaluate official docs/documentation` (pos 5.8-8.9)
5. **playwright-test-step-annotations-guide** — `playwright test.step tutorial example` (pos 9.4)
6. **playwright-locator-filter-visible-reference** — `playwright locator filter visible option`, `isvisible timeout parameter 2025/2026` (pos 8-10)
7. **playwright-vs-puppeteer-bundle-size-2026** — `playwright npm install size vs puppeteer chromium binary size comparison 2025` (**356 imp**, pos 10.1), `npm playwright weekly downloads 2026`, `playwright screenshot image generation node.js cli vs puppeteer`

### C. Fresh / news (freshness queries, recurring "2026" intent)
8. **vitest-4-migration-guide-breaking-changes** — `vitest 4.0 migration breaking changes from vitest 3` (multiple, NEW)
9. **migrate-selenium-to-playwright-checklist-2026** — `migrate selenium to playwright` (pos 53!), `provide a checklist for the transition from selenium to playwright`, `selenium to ai agents migration`

### D. Test management tools (NEW commercial cluster, ZERO current coverage)
10. **testrail-vs-zephyr-scale-2026** — `testrail vs zephyr scale for qa teams...` (pos 5.7)
11. **xray-test-management-pricing-2026** — `xray test management pricing 2026`, `how much does xray test management cost in 2026` (pos 9.7)
12. **best-test-management-tools-beyond-testrail-2026** — `test management tool that scales beyond testrail`, `testrail vs zephyr`

### E. AI testing tools cluster (rising, commercial)
13. **ai-accessibility-testing-tools-2026** — `ai accessibility testing agent` (pos 52), `a11y automated testing`, `axe auditor`
14. **ai-mobile-test-automation-2026** — `ai powered mobile test automation 2026` (pos 14.8)
15. **best-cheap-ai-e2e-testing-tools-2026** — `best cheap ai e2e testing tools 2025 2026`, `best cheap ai test automation tools`, `where can i find trusted tools for ai e2e testing` (cluster, pos 7-12)
16. **how-to-detect-ai-generated-code-2026** — `how to detect ai generated code 2025 2026` (pos 8.3)

### F. LLM eval / observability gaps
17. **rag-evaluation-metrics-complete-2026** — `rag evaluation metrics 2026` (pos 6.9), `rag evaluation tools 2026`, `best rag evaluation tools 2026`, `rag evaluation methods 2026`, `rag evaluation best practices 2026` (tool-agnostic pillar; we have ragas-specific only)
18. **rag-regression-testing-guide** — `rag regression testing`, `what is a rag workflow builder with groundedness scoring` (pos 10)
19. **openai-evals-trace-grading-complete-guide** — `openai trace grading official docs` + ~20 variants (`openai agent evals trace grading`, `traces graders datasets`), all pos 5-9, 0 clicks, high combined volume

### G. Agent / Cursor authoring (emerging, badly ranked or no page)
20. **agent-browser-complete-guide-2026** — `agent browser`, `vercel agent browser`, `agent-browser skill`, `vercel-labs agent-browser` (many, pos 37-77 = essentially unranked)
21. **cursor-skill-md-frontmatter-schema-guide** — `skill.md frontmatter schema cursor agent documentation`, `.cursor skills subagents best practices markdown yaml frontmatter`, `cursor skills documentation 2026`

### H. Playwright-vs comparisons (specific intents not yet covered)
22. **playwright-vs-cypress-nextjs-e2e-2026** — `playwright vs cypress for next.js e2e testing 2025/2026` (multiple, pos 15)
23. **playwright-vs-rest-assured-api-testing** — `playwright vs rest assured for api testing`, `rest assured vs playwright` (pos 7.3)

### I. Mocking cluster
24. **jest-mock-vs-mockimplementation-guide** — `difference between jest.fn() and mockimplementation in axios mocking` (pos 19), `unittest mock vs pytest mock`, `pytest-mock vs unittest.mock`, `pytest mock vs unittest mock`

### J. Testcontainers code gap
25. **testcontainers-reuse-withreuse-node-guide** — `withReuse testcontainers node`, `kafkacontainer testcontainers typescript`, `const mysqlcontainer require testcontainers` (exact code-paste queries, pos 7-9)

---

## Parallel Rank-Lift Task (separate from new articles)

Existing page-2 articles that need internal links + freshness, NOT rewrites:
- `comparing-popular-bdd-frameworks-2026-complete-guide` (pos 4.7, 4468 imp) — top priority
- `python-vs-pytest-explained` / `unittest-vs-pytest-2026` (pos 7.7-9.6)
- `openai-evals-complete-guide-2026` (pos 7.4)
- `playwright-storagestate-authentication-reference` (pos 7.6)
- `playwright-accessibility-testing-axe-complete-guide` (pos 7.3)
- `k6-vs-jmeter-2026-which-better` (pos 14.8 — worst; needs the most help)
- `testcontainers-kafka-*` (pos 3.2 — closest to page 1, small push wins)

Tactic: add a "Related" block + 3 contextual inline links from the homepage, /skills, and top-traffic articles into each of these. Refresh `date` field. Re-submit sitemap.

---

## What's Working (top pages by clicks, 3 mo)
- `/agents/claude-code` — 50 clicks / 167 imp on "claude qa skills" alone (CTR 30%, pos 3) — brand+agent hybrid converting well
- Brand queries (`qaskills.sh`, `qaskills`, `qa skills claude`) — pos 1-2, driving 60%+ of clicks

## Saved By
- File: `docs/seo/KEYWORD-OPPORTUNITIES-2026-06.md`
- Property: `https://qaskills.sh/` (URL-prefix) via luckydutta96 — authuser may vary; use account switcher
