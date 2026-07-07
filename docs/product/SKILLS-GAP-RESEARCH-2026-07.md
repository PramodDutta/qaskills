# Mandatory Skills Gap Research: QA / SDET / Automation Engineer / Manual Tester

**Date:** 2026-07-07
**Question:** Which skills must the qaskills.sh catalog add for each persona, which first, and how do we add them?
**Method:** three evidence sources triangulated: (1) grep inventory of all 384 seed-skills (testingTypes distribution + slug coverage of 47 high-demand topics), (2) 2026 job-market and ecosystem research (World Quality Report 2025-26 AI-upskilling data, SDET job-requirement surveys, most-installed agent-skill lists), (3) our own demand signals (blog cluster traffic, GSC keyword reports, the fact that our LLM-evals blog cluster is a top traffic driver).

## 1. Catalog state (what we have)

384 skills. Distribution by testingTypes: integration 233, e2e 156, unit 117, api 46, security 45, performance 45, visual 33, accessibility 21, mobile 13, contract 13, acceptance 12, bdd 9, load 8, regression 6, strategy 5, reporting 5, tdd 3, **llm-evals 3**.

Slug-level check of 47 high-demand topics found these with ZERO coverage:

- **LLM evaluation:** deepeval, ragas, promptfoo, langfuse (only 3 generic llm-evals skills exist)
- **Test management / manual QA tooling:** jira, testrail, xray/zephyr, istqb-style test design, test-metrics
- **Engineering workflow:** pr-review (test coverage), unit-test-generation (as a dedicated skill), kafka event testing
- **Tooling long tail:** percy, pa11y, nuclei

Thin but present (1-2 skills where a persona needs a family): test-plan(1), test-case(1), exploratory(1), risk-based(1), appium(1), maestro(1), synthetic(1).

## 2. The core mismatch

Our blog wins traffic on LLM evaluation and AI-agent testing (dozens of DeepEval/Ragas/promptfoo/Langfuse/agent-testing articles, several ranking), but a reader who lands there has almost nothing to `qaskills add`. The catalog is strongest exactly where the market is most saturated (Playwright, 15 skills) and weakest where our own funnel already proves demand. Job-market data agrees: AI fluency is the fastest-growing QA skill requirement (near-sevenfold jump in postings per 2026 surveys; 58% of enterprises upskilling QA in AI per WQR), and AI QA specialization carries a 15-30% salary premium.

Second structural gap: the Manual Tester persona. The industry narrative for 2026 is manual testers becoming test designers and AI editors. They need agent skills for test-case design, exploratory charters, bug reporting, and their actual tools (Jira, TestRail, Xray). We have 8 thin skills for this entire persona and zero tool integrations.

## 3. Mandatory skills per persona

Legend: NEW = zero catalog coverage today. UPG = exists but thin, needs a proper family/upgrade.

### SDET (agent = test-infrastructure copilot)

| # | Skill | Status | Why mandatory |
|---|---|---|---|
| 1 | deepeval-llm-evaluation | NEW | Top OSS eval framework, pytest-style; our blog cluster already ranks |
| 2 | ragas-rag-evaluation | NEW | Default RAG eval stack; SDETs inherit AI-feature testing |
| 3 | promptfoo-llm-red-teaming | NEW | Eval + security in one; huge search footprint |
| 4 | langfuse-llm-observability | NEW | Tracing/eval loop for production LLM features |
| 5 | unit-test-generation | NEW | The single most common agent task; deserves a dedicated, framework-aware skill |
| 6 | pr-test-coverage-review | NEW | "Review this PR for missing tests" is a daily SDET agent prompt |
| 7 | kafka-event-driven-testing | NEW | Event-driven is standard architecture; zero coverage today |
| 8 | test-impact-analysis | NEW | Run-less-test-smarter; CI cost pressure makes this hot |
| 9 | contract-testing family | have(4) | Keep, cross-link from new kafka skill |
| 10 | ci-cd-best-practices | have | Keep, freshness pass |

### Automation Engineer (agent = framework operator)

| # | Skill | Status | Why mandatory |
|---|---|---|---|
| 1 | playwright-cli-agent-loop | NEW | Matches brand-new Playwright agent tooling (--debug=cli); first-mover keyword |
| 2 | chrome-devtools-mcp-performance | NEW | Official Chrome MCP; perf testing via agents |
| 3 | browser-use-qa-agent | NEW | Hottest OSS browser-agent library, QA angle |
| 4 | percy-visual-regression | NEW | Top-3 visual tool, zero coverage (applitools angle exists via blog only) |
| 5 | checkly-monitoring-as-code | UPG | synthetic(1) generic; tool-specific skill converts better |
| 6 | maestro-mobile-flows | UPG | mobile=13 overall is thin; Maestro is the growth tool |
| 7 | appium-mobile-advanced | UPG | 1 basic skill for the biggest mobile framework |
| 8 | pa11y-accessibility-ci | NEW | Pairs with existing axe skills; CI-first a11y |
| 9 | self-healing-locators-strategy | NEW | Category-defining 2026 topic; we rank on blog side |
| 10 | playwright family | have(15) | Saturated; stop adding here |

### QA Engineer, general (agent = quality strategist)

| # | Skill | Status | Why mandatory |
|---|---|---|---|
| 1 | test-metrics-kpis-dashboards | NEW | Every lead asks agents for metrics definitions and dashboards |
| 2 | release-readiness-checklist | NEW | Go/no-go discipline as an installable checklist skill |
| 3 | risk-based-testing | UPG have(1) | Expand into a real methodology skill |
| 4 | test-strategy | UPG have(1) | Same |
| 5 | regression-suite-design | UPG have(1) | regression=6 type coverage is weak |
| 6 | quality-gates-ci | NEW | Concrete gate definitions (coverage, flake budget, perf budget) |
| 7 | ai-test-strategy | NEW | When to use AI vs scripted vs manual; WQR-aligned |

### Manual Tester (agent = documentation and tooling assistant)

| # | Skill | Status | Why mandatory |
|---|---|---|---|
| 1 | jira-qa-workflows | NEW | THE manual-QA tool; bug lifecycle, JQL for testers, dashboards |
| 2 | testrail-test-management | NEW | Dominant test-case management; zero coverage |
| 3 | xray-zephyr-jira-testing | NEW | The Jira-native TCM pair; big search volume |
| 4 | istqb-test-design-techniques | NEW | BVA, equivalence partitioning, decision tables, state transitions; evergreen |
| 5 | exploratory-testing-charters | UPG have(1) | Session-based test management, tours, charter templates |
| 6 | bug-report-writing | UPG have(2) | Elevate to repro-quality standard w/ templates |
| 7 | test-case-design | UPG have(1) | Pair with istqb skill |
| 8 | uat-coordination | UPG have(2) | Business-facing UAT planning |
| 9 | accessibility-manual-audit | NEW | Screen reader + keyboard passes; complements axe automation |
| 10 | test-plan-generator | UPG have(1) | IEEE-829-shaped, agent-fillable |

## 4. The Mandatory 25 (deduped, prioritized)

**P0 (Batch A, 12 skills, this week): zero-coverage + proven demand**
1. deepeval-llm-evaluation
2. ragas-rag-evaluation
3. promptfoo-llm-red-teaming
4. langfuse-llm-observability
5. jira-qa-workflows
6. testrail-test-management
7. istqb-test-design-techniques
8. unit-test-generation
9. pr-test-coverage-review
10. kafka-event-driven-testing
11. test-metrics-kpis-dashboards
12. percy-visual-regression

Rationale: 4 LLM-eval skills close the catalog-vs-blog mismatch (each has ranking articles to cross-link); 3 manual-tester tool skills open an entire underserved persona; 5 fill zero-coverage engineering staples.

**P1 (Batch B, 13 skills, next week)**
13. pa11y-accessibility-ci
14. nuclei-api-security-scanning
15. checkly-monitoring-as-code
16. playwright-cli-agent-loop
17. chrome-devtools-mcp-performance
18. browser-use-qa-agent
19. xray-zephyr-jira-testing
20. exploratory-testing-charters (upgrade)
21. accessibility-manual-audit
22. release-readiness-checklist
23. quality-gates-ci
24. test-impact-analysis
25. self-healing-locators-strategy

**P2 (backlog):** maestro/appium upgrades, ai-test-strategy, ISTQB per-technique splits, bug-report/test-plan upgrades, kafka-adjacent (schema-registry testing).

## 5. Execution plan

1. **Batch A via the `add-seed-skills` project skill**, exactly: dedup slug vs seed-skills/ and live API, write frontmatter (single-line values, inline arrays, values from packages/shared constants) + 100+ line instructional body modeled on seed-skills/playwright-e2e/SKILL.md, validate every file with skill-validator.
2. **Seed to VERIFIED prod only**: baseline `total` from /api/skills, user runs `vercel env pull --environment=production`, seed, confirm total grew by exactly 12, spot-check /api/skills/<slug>/content.
3. **Cross-link for distribution**: each new skill page has 2+ existing blog articles about the same tool; add "install the skill" links from those posts (one follow-up commit; reuses the contextual-ad component pattern from e0f25a5).
4. **Batch B same pipeline** after Batch A verifies.
5. **Measure at day 14 and day 30**: install telemetry per new slug (/api/telemetry/install, leaderboard), GSC impressions for "<tool> skill" queries, /content endpoint pulls. Promote winners to featured; iterate P2 order by data.
6. **Category hygiene**: with llm-evals and manual-tester families landing, ensure categories/junctions represent them so /categories and packs surface the new families (packs candidate: "LLM Evaluation Pack", "Manual Tester Starter Pack").

## Sources

- Job market and skills demand: refontelearning.com QA Automation 2026, quashbugs.com QA-to-SDET 2026, marutitech.com SDET career, softwaretestinghelp.com SDET 2026, remote.qa 2026 report, Coursera QA Tester 2026
- World Quality Report 2025-26 (Capgemini/Sogeti/OpenText): GenAI QE adoption ~89% piloting / ~37% production, 58% upskilling QA in AI
- Manual tester evolution: autify.com AI test case generation, thinkpalm.com AI in manual testing, kualitee.com manual vs AI benchmark, testmuai.com manual-to-automation
- Agent-skill ecosystem: awesome-skills.com, agent-skills.cc, composio.dev top Claude skills, firecrawl.dev best skills, agensi.io QA skills roundups
- Internal: seed-skills grep inventory 2026-07-07, docs/seo/KEYWORD-GAPS-2026-06-15.md, blog cluster composition
