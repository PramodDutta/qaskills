# QASkills.sh: Keyword Opportunity Report (September 2026)

**Pulled:** 2026-09-28, Google Search Console, URL-prefix property `https://qaskills.sh/`, last 3 months (Jun 26 to Sep 25, 2026)
**Totals:** 32.1K clicks, 7.1M impressions, 0.5% CTR, average position 6.7 (Sep 23: 30.2K clicks, 6.98M impressions, position 6.8)
**Corpus at pull time:** 1,787 live blog URLs

## Method

1. Extracted the top 1,000 queries from the Performance report; kept the 434 with 100+ impressions.
2. Matched each query against every live article (slug and title tokens, light stemming, stop words removed). A query counts as covered when one article contains all of its significant tokens.
3. Checked every uncovered query and every net-new candidate tool against the corpus again with targeted regexes, then checked candidate tools for maintenance status (GitHub `archived`, last push, last release).

## Findings

- **95 of 434 queries** have no exact-match article, but most of those impressions are the brand query **"skills.sh"** and its misspellings (38K + 25K + 17K + 8K impressions at position 5). That is Vercel's open agent skills directory, a different site; searchers land on us by name similarity.
- The rest of the head terms are already covered. Growth from new articles now comes from the long tail and from tools the site has never covered.
- **Whole clusters with zero coverage:** Flutter testing, ETL / data pipeline testing, Airflow, PySpark, DynamoDB local testing.

### Uncovered queries turned into articles

| Query | Impressions | Position | Article planned |
|---|---:|---:|---|
| skills sh / skills.sh (all variants) | ~95,000 | 4.6-6.5 | skills-sh-agent-skills-directory-guide |
| percy app / app percy | 2,540 | 14.9-17.9 | app-percy-mobile-visual-testing-guide |
| playwright devices / devices list | 340 | 6.1-7.0 | playwright-devices-list-mobile-emulation-guide |
| cy.env / cypress.env | 322 | 7.5-7.9 | cypress-cy-env-environment-variables-guide |
| cypress skills / cypress ai skills | 417 | 7.2-7.6 | cypress-skills-ai-coding-agents-2026 |
| vi.mocked | 193 | 4.8 | vitest-vi-mocked-typescript-guide |
| github actions vs gitlab | 186 | 13.6 | github-actions-vs-gitlab-ci-test-automation-2026 |
| k6 python | 151 | 6.5 | k6-python-load-testing-options-guide |
| jbehave vs cucumber | 140 | 6.6 | jbehave-vs-cucumber-java-bdd-2026 |

Dropped after checking: p50/p95/p99 (covered by `performance-test-percentiles-p95-p99-guide`), Moq (covered), JUnit parameterized tests (covered), mutation testing in TypeScript (two Stryker guides exist), `PLAYWRIGHT_DOWNLOAD_HOST` (five articles cover it), k6 vs Artillery (already ranking at position 3.3).

### Net-new tool and release topics (43)

Cypress 16; Vitest 5 (5.0.0 shipped Sep 3, 2026); k6 2.0 (May 11, 2026, no upgrade guide existed despite dozens of k6 articles); Flutter integration tests, Patrol, golden tests; Airflow DAG testing, PySpark with chispa, ETL testing, DynamoDB local testing; Kaspresso, Firebase Test Lab, Bitrise; SeleniumBase, Taiko, Vibium, Lightpanda, Browserbase; Agenta; Specmatic, Microcks, Hoverfly, VCR.py; NBomber, ghz, oha; PIT, cargo-mutants, ArchUnit, gotestsum; CloudBees Smart Tests (formerly Launchable), Datadog Test Optimization; IBM Equal Access; AWS FIS, Chaos Toolkit, Steadybit; Trivy; Kiwi TCMS, Mailosaur, smtp4dev; Testkube, Signadot.

Skipped on purpose: Magnitude (pivoted in September 2026 from AI browser testing to a local LLM inference engine), Happo (repository archived), Goose and httpyac (release activity stalled), Shortest (no release since April 2025), TestSprite (active sponsorship prospect, so a paid placement beats a free article).

## Rank-lift list (article exists, position 8+, high impressions)

These need title, meta description, and internal-link work, not new articles:

| Query | Impressions | Position |
|---|---:|---:|
| percy browserstack / browserstack percy | 12,279 | 10.6-11.2 |
| playwright agents | 4,259 | 9.5 |
| robot framework keywords | 3,145 | 14.1 |
| pytest vs unittest | 1,990 | 9.3 |
| agent browser | 1,608 | 11.5 |
| langfuse vs langsmith | 1,519 | 10.1 |
| vitest vs jest | 1,092 | 10.9 |
| end to end testing best practices | 682 | 13.2 |
| github actions vs azure devops | 661 | 17.4 |
| pact testing | 688 | 11.0 |
| playwright cucumber | 599 | 12.8 |
| playwright accessibility testing | 477 | 12.2 |
| playwright mcp | 402 | 18.6 |
| playwright visual testing | 318 | 20.4 |
| playwright best practices | 244 | 17.7 |
