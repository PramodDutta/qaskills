# QASkills.sh SEO Audit + 55-Article Content Plan (2026-07-09)

Audit run before publishing a 55-article, 3000-word batch. Method: technical checks against the live site (Claude), corpus gap + cannibalization analysis across all 953 registered slugs (Codex), fresh-topic scan (WebSearch).

## 1. Technical SEO: strong, no fixes needed

The blog engine already ships the technical layer, so new articles inherit it automatically:

| Signal | State |
|---|---|
| Sitemap | 1803 URLs, fresh lastmod (same-day), auto-derived from postList |
| robots.txt | Allows GPTBot, ClaudeBot, PerplexityBot; disallows /api, /dashboard, auth |
| Structured data (per article) | BlogPosting, FAQPage, BreadcrumbList, Organization, Person, WebSite, SearchAction all present |
| Canonicals + meta description | Present and correct on blog posts |
| Internal linking | Related-articles block + in-body links; FAQ -> FAQPage JSON-LD for AI-search citation |

Conclusion: the opportunity is net-new content in underserved clusters, not technical remediation.

## 2. Corpus state

- 953 registered blog slugs (730 literal registry entries + 223 batch-spread).
- Category skew: Guide 365, Reference 122, Tutorial 86, Comparison 64, AI Testing 38. Underweight: API Testing (21), Performance (12), Migration (15), Security (2).

### Saturated clusters (OFF LIMITS for new content)

Playwright 233, LLM-eval/RAG 125, Selenium 59, performance-tooling 49, pytest 45, Cypress 34, BDD 32, self-healing 30, CI/CD 29, QA-career 27, visual-regression 26, Testcontainers 23, Pact 22, mobile 22, accessibility 18.

### Cannibalization debt (existing, flagged not fixed here)

Ten groups of near-duplicate slugs target the same query and split ranking signal, e.g. six `playwright-test-agents-planner-generator-healer*` variants; six `deepeval-llm-testing*` variants; five `promptfoo-vs-deepeval*` variants; four `playwright-component-testing-react*`. Recommendation for a later pass: pick one canonical per group, 301 or consolidate the rest. NOT touched in this batch (this batch only ADDS net-new, non-colliding topics).

## 3. Fresh 2026 signals (WebSearch)

Agentic testing going mainstream; synthetic-data use surged (industry surveys cite ~14% -> ~25% 2024-2025); security testing shifting left as standard practice; multi-layer LLM QA (offline evals + runtime guardrails + observability + red-teaming) replacing binary pass/fail. These shaped the AI-testing and security/data topic selections below.

## 4. The 55-article plan (all validated: 0 slug collisions vs 953, all 62 internal-link targets exist)

Distributed deliberately into the underserved clusters, avoiding all 15 saturated ones:

| Cluster | Count | Examples |
|---|---|---|
| Test management (Jira-native + standalone) | 8 | Zephyr Scale, Xray, TestRail 2026, PractiTest, Testmo, Qase integrations, migration plan |
| Mobile (beyond the saturated basics) | 5 | Appium 3 migration, KIF, EarlGrey, device farms, RN Testing Library |
| Accessibility (tool-specific) | 5 | pa11y, Lighthouse CI a11y, WAVE, axe DevTools, WCAG 2.2 checklist |
| Security / DAST for QA | 5 | OWASP ZAP, Burp for QA, Nuclei in CI, Semgrep, API security checklist |
| Performance (net-new tools) | 4 | Taurus, Sitespeed.io, Lighthouse budget gates, SpeedCurve |
| API (net-new tools) | 6 | Step CI, Optic, Stoplight Prism, Scalar, grpcurl, AsyncAPI |
| Data quality testing | 6 | Great Expectations, Soda, dbt tests, Faker strategies, Factory Boy, data contracts |
| CI/CD (non-GitHub-Actions) | 4 | GitLab CI gates, CircleCI, Buildkite, test impact analysis |
| Visual (net-new tools) | 3 | Lost Pixel, Argos, baseline governance |
| LLM/agent QA (fresh angles) | 5 | RAG regression, prompt regression, eval dataset versioning, agent tool-use regression, LLM-judge calibration |
| Methodology / leadership | 4 | Risk-based testing, test-strategy template, QE operating model, Linear for QA |

Full machine-parseable topic list with per-article assigned internal links: /tmp/validated-topics.txt (also embedded in the generation waves). Every slug verified absent from the 953-slug inventory; every internal-link target verified present.

## 5. Execution

Generation delegated to Codex in 4 parallel waves of ~14 (frozen 3000-word spec: 2 tables, 2 code blocks, assigned internal links, closing FAQ, zero em dash). Claude owns: audit, topic validation (collision + link-target gate), dual-registry registration, build, deploy, live verification. Deploy in batches so publishing does not wait on all 55 at once.

Post-batch follow-ups (not in this batch): cannibalization consolidation pass; fill the underweight Security and Performance categories further; consider a /compare or /best-of hub for the new test-management and data-quality clusters.
