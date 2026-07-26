# QASkills Paid Packs: Verified Research and Build Plan

Version 2, 2026-07-26. Supersedes the 2026-07-20 draft. Produced by a 15-agent research workflow (7 research tracks, each adversarially fact-checked, then synthesized). Roughly 1.5M tokens of research.

**Verdict: GO, but on three packs, not six, and at a fraction of the revenue the first draft claimed.**

## 0. Corrections to the previous version of this document

The 2026-07-20 draft is wrong in four material ways. Recording them so nobody plans against them.

| First draft said | Verified reality |
|---|---|
| "roughly $2,400/mo" revenue | Two independent models put the realistic case at **$220 to $930/mo gross**. The optimistic case is $2,520/mo. $2,400/mo was presented as realistic; it is closer to the optimistic ceiling. |
| Six persona packs at launch | Only **three** are shippable today. Security is a hard no. Performance and Accessibility need rewrites first. |
| "Polar or Lemon Squeezy" | **Lemon Squeezy is in maintenance mode**, and its official migration target (Stripe Managed Payments) **excludes India**. For an India-based seller the answer is Polar, fallback Dodo Payments. |
| Catalog framed as 436 sellable skills | **165 to 185 of 413 seed skills (40 to 45%) are template clones** sharing one ~563 to 575 word skeleton. Free filler is fine. Paid filler is a refund thread. |

## 1. What agentary.dev is, verified

A four-week-old, one-person product. Useful as a mechanism to copy, not as proof that the market exists.

**Product and price.** Two Claude Code kits (Engineer, Marketing) delivered as a private GitHub repo. $49 each, $89 for the bundle, all one-time. Verified in the live Polar API payload (`"amount":8900`, `"type":"one_time"`, `"is_recurring":false`), not just page copy. Tax at checkout: $0.

**The mechanism (worth copying).** Polar as merchant of record, using Polar's native `github_repository` benefit to auto-grant repo access. Buy flow: CTA to a `buy.polar.sh` checkout (email plus card, no billing address), pay, private repo access, then `npx github:agentary-dev/kit init --kit both`. Updates are a git pull wrapped as `agentary update`.

**What is rotten (do not copy).**
- **The scarcity is hardcoded.** "1 spots left" and the $89 to $129 to $199 ladder are string literals in the compiled React bundle. No API call, no counter. A cache-busted refetch returns the same "1".
- **Contradictory refunds.** The FAQ, Terms and refund page all say "all sales are final and purchases are non-refundable", while `llms.txt` advertises a "14-day money-back guarantee".
- **"Lifetime updates" is quietly narrowed** in Terms to "the version line you purchased".
- **18 of 22 advertised agents match, by exact filename, agents in two free MIT repos** (wshobson/agents, 38,240 stars; VoltAgent/awesome-claude-code-subagents, 23,732 stars).
- **Counts do not agree with themselves:** site says 103 skills / 181 commands, Polar checkout says 104 / 191. The repo is private, so neither is auditable.
- Solo operator, no legal entity disclosed, contact Gmail on a domain that 404s. GitHub org created 2026-06-28; all three Polar products created within 27 minutes the same morning. Third brand name already (claudethings.com, agentskit.co both 308 to agentary.dev). Polar seller org flagged `"status":"under_review"` while checkouts run live.

**Traction: unknown, probably tiny.** Zero testimonials, zero customer counts, zero Wayback snapshots, no Product Hunt listing.

**Their actual growth engine** is worth stealing: 65 URLs, 11 free browser-based no-signup tools, 5 prompt-library pages, robots.txt explicitly allowing 19 AI crawlers, and an llms.txt.

## 2. Competitive position

**The generalist kit space is a commodity.** agentskit.co, claudethings.com, getclaudekit.com, theclaudekit.com and claudecodeagents.com run near-identical positioning, several with byte-identical copy.

**The QA vertical is genuinely empty at depth.** The only dedicated QA agent-skill repo found is neonwatty/qa-skills: 14 skills, 6 agents, MIT, 21 stars, free. No funded QA vendor (Testim, Momentic, QA Wolf, Rainforest, Mabl, Autify) sells agent or skill packs at all; they sell seats and managed services.

**The one real demand datapoint is discouraging.** On Agensi, the flagship QA bundle `ai-automation-qa-pack` is priced at **$5 and has 10 installs**. Individual QA skills there run $5 to $9. That is the only observed QA-pack demand signal in the entire research set.

**Bundles clear better than single skills.** ClaudeSkills360: free tier plus a $39 paid tier (2,350+ skills, 3-device license, lifetime updates, 30-day money back), claiming 527+ users. KissMySkills Agency Bundle $99. ClaudeKit $14.99/$29.99/$49.99 per month with a $99 lifetime option.

**Caveats the verifier forced.** Most of the marketplace economics (the $5 to $15 band, the 70/30 split, "median skill earns under $50/month") trace to **one self-interested vendor blog with no methodology**. And the free substitutes are enormous: affaan-m/ECC at 233,491 stars, hesreallyhim/awesome-claude-code at 50,963, plus Vercel's MIT skills.sh with no business model.

**Our defensible wedge:** we are the only open, browsable, individually addressable, machine-readable QA catalog. Agentary's entire category cannot publish a manifest without revealing the contents are free MIT files. We can publish ours, because the sale is curation plus depth plus role playbooks, not secrecy.

## 3. The catalog audit: the finding that changes the plan

Measured directly against the repo and live API on 2026-07-26, twice, by two independent agents that agree.

| Metric | Value |
|---|---|
| Live skills | 438 |
| Seed skills with a SKILL.md | 413 |
| Live-only user-submitted (excluded from packs) | 25, with 8 combined installs |
| **Template clones (thin)** | **165 to 185, i.e. 40 to 45% of the catalog** |
| Template clone word band | 562 to 575 words, a 14-word spread across 185 files |
| Real/deep skills | 228 |
| Total corpus | 650,573 words |
| Mean quality score, template vs real | 84.5 vs 85.2 (the score does not distinguish them) |

The template clones share one skeleton ("You are an expert QA engineer specializing in X... Quality First, Defense in Depth, Actionable Results"). Fine as free catalog entries. **Unsellable.** The moment a pack has a price, a reviewer who installs `react-testing-library` (552 words, 57 installs) can publish a teardown.

### Pack readiness, with real slugs and measured word counts

**READY: Manual and Functional QA (20 skills, zero thin).**
`test-plan-generation` (2,036), `test-case-generator-user-stories` (4,519), `bug-report-writing` (1,976), `istqb-test-design-techniques` (1,027), `exploratory-test-charter-generator` (4,510), `session-based-exploratory-testing` (822), `boundary-value-generator` (5,714), `pairwise-test-generator` (3,904), `negative-test-generator` (4,595), `regression-suite-bug-reports` (4,823), `release-readiness-checklist` (1,000), `test-strategy-design` (2,506), `first-time-user-tester` (4,469), `empty-state-reviewer` (3,981), `form-validation-breaker` (4,346), `ux-friction-logger` (4,995), `error-message-reviewer` (3,818), `jira-qa-workflows` (1,051), `testrail-test-management` (917), `xray-zephyr-jira-testing` (852).
Strongest pack we have, and the persona nobody else serves.

**READY: Automation Engineer (20 skills, zero thin, one borderline).**
`playwright-e2e` (1,632), `playwright-advance-e2e` (3,723), `playwright-api` (1,832), `playwright-locator-filter` (1,272), `playwright-multi-tab-handling` (1,260), `selenium-advance-pom` (2,563), `selenium-java` (1,446), `cypress-e2e` (1,348), `webdriverio-e2e` (1,048), `selenium-to-playwright-migration` (1,788), `flaky-test-doctor` (1,698), `self-healing-locators-strategy` (922), `test-data-factory` (4,234), `allure-report-generator` (3,932), `docker-testcontainers` (1,178), `api-testing-rest` (1,892), `ci-test-sharding-parallelization` (801), `appium-mobile` (1,469), `maestro-mobile` (1,158), `quality-gates-ci` (777, borderline).

**READY: AI Tester (20 skills, zero thin). Best differentiator.**
`ai-agent-eval` (3,423), `mcp-server-testing` (3,511), `ai-test-orchestration` (3,137), `playwright-agents` (3,040), `prompt-testing` (3,009), `ai-test-generation` (2,725), `agentic-testing` (2,678), `vibe-testing` (2,549), `rag-regression-testing` (1,702), `openai-evals-trace-grading` (1,673), `ai-release-guardian` (1,602), `rag-evaluation-metrics` (1,570), `ai-system-quality-engineer` (1,525), `claude-code-qa` (1,382), `promptfoo-llm-red-teaming` (873), `ragas-rag-evaluation` (869), `e2e-testing-claude-code` (847), `langfuse-llm-observability` (839), `browser-agent-qa-testing` (839), `deepeval-llm-evaluation` (808).
Keep `llm-output-testing` (564), `ai-model-testing` (564) and `llm-security-testing` (566) OUT: all thin.

**NOT READY: Performance (9 usable, 15 thin).** Usable: `page-speed-critic` (4,282), `performance-test-scenario-generator` (3,982), `n-plus-one-query-detector` (3,677), `memory-leak-detector` (3,527), `mobile-performance-testing` (2,542), `k6-performance` (1,667), `jmeter-load` (1,486), `artillery-load` (1,199), `chrome-devtools-mcp-performance` (907). Thin and blocking: Gatling, Locust, Lighthouse, Web Vitals, performance budgets, stress patterns, DB performance, synthetic monitoring. Roughly 8 rewrites.

**HARD NO: Security (4 usable out of 27 candidates).** Usable: `auth-bypass-tester` (5,226), `api-security-testing` (2,257), `owasp-security` (1,656), `nuclei-api-security-scanning` (881). Everything else is a ~566-word clone, including `sql-injection-testing`, `xss-testing-patterns`, `jwt-security-testing`, `zap-security-scanner`, `burpsuite-security`, `semgrep-sast`, `codeql-security`, and all compliance skills. Selling boilerplate security guidance is also the highest-liability content we could ship. 12 to 15 rewrites needed.

**MOSTLY READY: Accessibility (12 usable, 6 thin, 2 hard gaps).** Usable includes `accessibility-auditor` (5,477), `dark-mode-bug-finder` (4,548), `loading-state-tester` (4,260), `localization-bug-finder` (4,015), `responsive-layout-breaker` (3,694), `axe-accessibility` (1,714), `pa11y-accessibility-ci` (986), `accessibility-manual-audit` (868). **Blocking gap: no keyboard-navigation skill and no screen-reader skill exist anywhere in the catalog** (grep for keyboard, screen-reader, NVDA, VoiceOver, ARIA returns nothing). An a11y pack without those is not credible.

**Also fix before publishing any manifest:** near-duplicate slugs (`artillery-load`/`artillery-load-testing`, `vitest`/`vitest-testing`, `pytest-patterns`/`pytest-best-practices`, `a11y-automation-axe`/`axe-accessibility`, three `playwright-cli*` variants).

## 4. Persona demand, ranked on evidence

| Rank | Persona | Evidence for | Evidence against |
|---|---|---|---|
| 1 | **Automation / SDET** | Largest population (UK: 2,060 postings, median GBP 65,000, vs 210 manual postings). Playwright postings +56.8% YoY. Playwright carries a 38% salary premium over Selenium; AI-using testers earn ~27% more ($45,400 vs $35,800) | none material |
| 2 | **AI tester** | 63% of execs rank GenAI the #1 QE skill; 89% of orgs piloting GenAI in QE but only 15% at enterprise scale; 50% lack the expertise; 65.6% of testers "very concerned" about their future | Largely the same human as #1. Weakest-sourced demand data of the six |
| 3 | **Accessibility** | Best urgency-to-effort ratio. UK WCAG postings 223, up from 85 = **+163% YoY**, salary +15%. Live statute (European Accessibility Act) with dated deadlines | Smallest absolute market |
| 4 | **Security** | Richest wallet (OSCP course+cert $1,749; CEH ~$1,299). UK pen-test postings +79.9% YoY | Buys in the cybersecurity orbit, not QA. And our content is not there |
| 5 | **Performance** | steady | Only persona whose UK salary **fell** (GBP 55,000, -8.33% YoY); 155 postings |
| 6 | **Manual** | Our deepest content; 8.7% salary growth | Postings -13.2% YoY; smallest budgets |

Note the tension: our **best content** (Manual) serves the **weakest-budget** persona, and our best-budget persona (Security) has our **worst content**. The Automation and AI packs are where content strength and demand actually overlap.

**Willingness to pay is real but modest:** ~60% of developers pay personally for AI tools monthly, but only 18.5% pay $50+/mo and 11.5% pay $100+/mo. QA-specific paid comparables: TripleTen QA bootcamp from $5,950, CPACC $385 member / $485 non-member, IAAP membership $145/yr.

**Correction the verifier forced:** the EU AI Act high-risk deadline was **postponed from 2 Aug 2026 to 2 Dec 2027**. Do not use it as urgency copy. The European Accessibility Act urgency is real; the AI Act urgency is not.

## 5. Pricing and honest revenue math

**Recommended ladder (one-time, lifetime updates):**

| SKU | Price |
|---|---|
| Free catalog, CLI, API | $0 forever, stated as a permanent pledge |
| Single persona pack | **$49** |
| Three-pack QA Toolkit (Manual + Automation + AI) | **$99**, launch $79 for the first 100 with a **real** counter backed by the orders table |
| Team, 5 seats | $249 |
| Updates subscription | do not launch; revisit after 100 paid buyers |

Observed pack band is $39 to $99 (ClaudeSkills360 $39, Agentary $49/$89, KissMySkills $99, ClaudeKit $99 lifetime). Sit at the top of that band, not above it: we have vertical depth but zero social proof and a free public catalog, which caps willingness to pay.

**Anchor against QA tooling budgets, never against prompt packs.** Verified anchors: QA Wolf $60K to $250K+/yr, Rainforest QA from $200/mo, Katalon ~$84/mo per user, Cypress Cloud from $75/mo. "Rainforest starts at $200 a month. This is $99, once."

**Fees:** Polar Starter is 5% + $0.50 plus a 1.5% international-card surcharge, ~$2/mo payout fee, 0.25% + $0.25 per payout, up to 1% FX. Call it **8% all-in**. A $99 sale nets about $92.

**Revenue. Two independent models, both far below the first draft.**

| Scenario | Assumption | Gross/mo |
|---|---|---|
| Conservative | 0.05% of ~8,000 monthly visits | ~$220 |
| Realistic | 0.15% of ~10,000 visits, 15 sales at ~$62 | ~$930 |
| Optimistic | 0.30% of 12,000 visits | ~$2,520 |

The more skeptical track modelled ~$288/mo gross. Both agree the realistic band is **hundreds per month, not thousands**. Launch spike from owned channels (228 lead-magnet emails at 1 to 3%, 464 users at 1 to 2%) is a plausible 20 to 60 sales, or **$1,200 to $3,600 gross in week one**.

Read that honestly: the realistic case is a good side income (~$10K/yr), not a business pivot, and the conservative case does not repay 20 days of engineering. The single observed comparable sold **10 copies at $5**.

## 6. Payment and delivery: Polar, and the India problem

**Stack: Polar as merchant of record + Polar license keys + our existing CLI. Fallback: Dodo Payments.**

Polar is the only option clearing all four constraints: India-supported payouts (via Stripe Connect Express, which works in India even though standalone Stripe India is invite-only), merchant of record so we never register for EU VAT or US sales tax, native license keys with a public activate/validate API, and Standard Webhooks with 10 retries.

**Why not the others.** Lemon Squeezy is in acknowledged maintenance mode and Stripe Managed Payments **excludes India**. Gumroad is 10% + $0.50 with no India bank-payout row. Paddle pays monthly only, $100 minimum. Stripe direct is not a merchant of record. Razorpay is cheapest and the only one producing eFIRC natively, but does zero foreign VAT work and has no license primitive.

**The unresolved gotcha, and I will not guess at it.** With any merchant of record, foreign currency never lands in the Indian bank as a direct customer remittance, so **FIRC/FIRA evidence for GST export zero-rating is weak or absent**. That is a tax-position question for a CA, not for an agent. Do not launch without clearing it.

**Delivery: Model A (license key + CLI + gated endpoint).** Reject the private-repo model despite Agentary using it: it caps at 50 outside-collaborator invites per repo per 24 hours (a good launch day silently fails), invitations expire in 7 days, and GitHub Team is $4/user/month against a one-time sale.

Purchase-to-install flow, no login required:
1. Buyer hits `/pack`, clicks a pack, lands on a Polar hosted checkout.
2. Polar charges as merchant of record and handles all tax.
3. Polar issues a license key and emails it.
4. Polar fires `order.paid` to `POST /api/webhooks/polar`. We verify the signature, write `orders` and `licenses` rows, send our own key email through the existing Resend sender.
5. `qaskills pack add ai-tester --license QASKILLS-xxxx-xxxx`.
6. CLI calls `POST /api/pack/redeem`; we validate against Polar, then stream the pack bundle through the existing installer (already detects 30+ agent config paths).
7. Re-running the command is the update path. Entitlement checked server side every call.

Day-one fallback if CLI work slips: Polar's `github_repository` benefit, zero code.

## 7. Build plan

**Phase A, content first (7 to 10 days).** This is the real work, and it comes before any commerce code. Write the pro-only skills and role playbooks for the three ready packs, and rewrite or quarantine the template clones that would appear in them. Use the existing Codex + Grok generation pipeline with the Opus audit gate.

**Phase B, entitlement data (2 days).** Add `tier`, `priceCents`, `currency`, `version` to `skill_packs`; new `orders`, `licenses`, `pack_downloads` tables. **Prod DDL needs your explicit approval.**

**Phase C, commerce (2 to 3 days).** Polar account and products, `POST /api/webhooks/polar`, `POST /api/pack/redeem`, `/pack` + `/pack/[slug]` + `/pack/success`. **Needs RESEND_API_KEY set in prod (still missing).**

**Phase D, CLI (1 to 2 days).** `qaskills pack add <slug> --license`, reusing the shipped installer and `/artifact` ZIP builder. Add a case to the E2E publish gate.

**Phase E, launch (1 day).** Real scarcity counter, publish, IndexNow, email the list, soft-launch to the 228 waitlist first.

Total 13 to 18 days. Reused as-is: the CLI, the full-directory installer, the `/artifact` ZIP+checksum endpoint, `skill_packs`, `/refund-policy` and `/terms`, Resend `send.ts` with unsubscribe tokens, the E2E gate, and the content pipeline.

## 8. Top five risks, ranked

1. **We are selling curation of a free public catalog.** Every pack skill except the pro-only additions is installable free in 30 seconds. A buyer can rebuild the pack from qaskills.sh itself. Mitigation: the pro-only skills and role playbooks must be genuinely exclusive and genuinely good, and the free pledge must be loud so it reads as generosity rather than bait.
2. **The 165 to 185 template clones become monetized liability the moment there is a price tag.** Mitigation: rewrite or exclude every clone that touches a pack, and de-duplicate the near-duplicate slugs before publishing any manifest.
3. **Demand may simply not be there.** The only observed QA pack sold 10 copies at $5. Mitigation: validate with a paid pre-order to the 228-person waitlist before Phase A, not after Phase E.
4. **GST export zero-rating under a merchant of record is unresolved.** Mitigation: CA consult before launch. Non-negotiable.
5. **Refund and EU consumer law.** A blanket no-refund policy copied from competitors leaves real exposure without an Article 16(m) express-consent waiver at checkout. Mitigation: add the waiver checkbox and offer a genuine 14-day window; Agentary's self-contradiction on this is a cautionary example, not a template.

## 9. Decisions needed from you

1. **Three packs now (Manual, Automation, AI) or wait and rewrite content to launch all six?**
2. **Price ladder:** confirm $49 single / $99 bundle (launch $79) / $249 team.
3. **Polar account** in your name, and are you willing to run the FIRC/GST question past a CA first?
4. **Approve the prod schema migration** (orders, licenses, pack_downloads) and **set RESEND_API_KEY** in prod.
5. **Validate before building?** My recommendation: put a $79 pre-order page in front of the 228-person waitlist for one week. If it does not clear ~15 pre-orders, do not build Phases B to E.
