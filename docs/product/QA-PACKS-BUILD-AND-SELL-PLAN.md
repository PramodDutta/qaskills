# QASkills Pro Packs: Build and Sell Plan

Deep-research + build plan for a paid, persona-based QA pack sold at `qaskills.sh/pack`, modeled on agentary.dev. Prepared 2026-07-20.

## 1. Executive summary

Sell six persona QA packs (Manual, Automation, AI, Performance, Security, Accessibility) plus a full "QA Pro Bundle", the same way agentary.dev sells Claude Code agent kits: one-time price, instant delivery, lifetime updates, one-command install into any AI coding agent. We already own the hard part (a 436-skill catalog, a published CLI, a packs data model, and refund/terms pages). The missing pieces are commerce (checkout), a license/entitlement layer, and a `qaskills pack` install command. This is a 2 to 3 week build to a sellable v1.

Revenue math (conservative): 464 registered users + 228 lead-magnet emails + organic SEO traffic. At a $79 bundle and a 1.5% convert on 2,000 monthly blog visitors, that is roughly $2,400/mo, with the per-persona $29 packs as the entry drug.

## 2. What agentary.dev does, and exactly how

Grounded from the live site (agentary.dev), not assumptions.

**Product.** Pre-configured "kits" for Claude Code: bundles of agents, skills, and slash commands distributed as a private GitHub repo.

- Engineer Kit: 58 agents, 61 skills, 159 commands
- Marketing Kit: 31 agents, 42 skills, 32 commands
- Framework-agnostic via a CLAUDE.md context file; MCP integration

**Pricing (one-time, lifetime updates).**

| Offering | Price | Notes |
|---|---|---|
| Engineer Kit | $49 | one-time |
| Marketing Kit | $49 | one-time |
| Complete Bundle | $89 launch, rising to $129, then $199 | scarcity ("1 spot left at $89; $129 for next 50; $199 after") |

**How the machine works.**

1. Checkout via **Polar** (a merchant-of-record: it collects payment and handles global sales tax/VAT for the seller).
2. On purchase, the buyer gets **access to a private GitHub repo** containing the kit.
3. Install is a single command that pulls from that private repo: `npx github:agentary-dev/...`. Auth piggybacks on the buyer's own GitHub access to the repo they were added to.
4. Updates are lifetime: `agentary update` re-pulls.
5. Refunds: "all sales are final, non-refundable" (digital, delivered in full at checkout).

**Why it works.** Zero fulfilment cost, instant delivery, scarcity pricing, "lifetime updates" removes buyer hesitation, and the private-repo mechanism doubles as license enforcement (revoke repo access = revoke the product).

## 3. Can we replicate it on qaskills.sh? Gap analysis

Yes, and we are better positioned than a from-scratch competitor because the inventory already exists.

| Capability | Status | Detail |
|---|---|---|
| Product inventory | HAVE | 436 live skills; per persona: Automation 173, Performance 48, Security 48, Accessibility 26, plus AI-eval and manual/generator skills |
| Packs data model | HAVE (partial) | `skill_packs` + `skill_pack_items` tables exist; needs price/tier/visibility columns |
| Install tooling | HAVE | `@qaskills/cli` on npm (0.4.1), full-directory install + `/artifact` ZIP endpoint already shipped |
| Delivery primitive | HAVE | The gated `/api/skills/:slug/artifact` checksummed-ZIP endpoint generalizes to a pack artifact |
| Commerce pages | HAVE | `/refund-policy` and `/terms` already exist |
| Payment / checkout | MISSING | no Stripe/Polar/Razorpay wired |
| License / entitlement | MISSING | no purchase records, no key redemption |
| `qaskills pack` command | MISSING | CLI installs single skills only |
| "Pro" (paid-only) skills | MISSING | today every skill is free/public; packs need exclusive depth to justify price |

Honest constraint: our skills are currently public. A pack of only-public skills is a convenience sale (curation + one install + updates), which is real but thin. To command $29 to $99 it must include **pro-only depth** the free catalog does not have (see section 4).

## 4. The product: six persona packs + the QA Pro Bundle

Each pack = a curated set of existing catalog skills PLUS 3 to 5 pack-exclusive "pro" skills and a persona playbook (a CLAUDE.md-style operating manual for that role's agent).

| Pack | Who it is for | Core catalog skills (real) | Pro-only additions (new) |
|---|---|---|---|
| **Manual Tester Pro** | Exploratory + test-design QA | test-plan-generation, test-data-generation, boundary-value-generator, negative-test-generator, test-case-generator-user-stories, bug-report skills | Exploratory charter generator, risk-based test matrix, session-based-testing playbook |
| **Automation Tester Pro** | E2E/UI/API SDET | playwright-e2e, cypress-e2e, selenium-advance-pom, playwright-api, webdriverio-e2e, visual-regression, flaky-test-doctor | Page-object scaffolder, CI wiring pack, flaky-quarantine workflow |
| **AI Tester Pro** | LLM/RAG/agent QA | deepeval, promptfoo, ragas, ai-agent-eval, ai-system-quality-engineer, llm-security-testing | Golden-dataset builder, LLM-judge harness, agent-trajectory grader |
| **Performance Tester Pro** | Load/perf engineer | k6-performance, jmeter-load, artillery-load, gatling-performance, locust-load-testing, lighthouse-performance | SLO/threshold gate pack, p95 regression harness, spike/soak scenario generator |
| **Security Tester Pro** | AppSec/pentest-minded QA | owasp-security, auth-bypass-tester, sql-injection-testing, xss-testing-patterns, jwt-security-testing, semgrep-sast | IDOR probe pack, secrets-in-logs scanner, threat-model-to-test mapper |
| **Accessibility Tester Pro** | a11y specialist | axe-accessibility, accessibility-auditor, a11y-automation-axe, accessibility-manual-audit, cognitive-load-analyzer | WCAG 2.2 audit checklist skill, screen-reader flow pack, keyboard-nav matrix |

**QA Pro Bundle** = all six packs + a cross-role "AI Testing Engineer" playbook + priority updates.

Each pack ships with: the skills, a `CLAUDE.md` role playbook, a quick-start, and a versioned changelog (so "lifetime updates" is a visible, real benefit).

## 5. Pricing and positioning

Anchor below agentary's bundle, price the entry pack as an impulse buy.

| SKU | Launch price | Standard | Rationale |
|---|---|---|---|
| Single persona pack | $29 | $39 | impulse tier, one role |
| Any 3 packs | $59 | $79 | team-of-one upsell |
| **QA Pro Bundle (all 6)** | **$79** | **$129** | hero SKU, undercuts agentary's $129/$199 |
| Team (5 seats) | $299 | $399 | later phase |

All one-time, lifetime updates (matches the category norm and kills churn objections). Scarcity/launch pricing mirrors agentary ("first 100 at $79"). Free catalog stays free; packs are the curated + pro + playbook layer.

Competitive frame: agentary ($49/$89 Claude-Code kits, general dev), agensi.io (SKILL.md marketplace), gumroad prompt packs ($9 to $49). We are the only **QA-specialist**, persona-segmented pack, which is the differentiator and the reason a QA lead buys ours over a generic kit.

## 6. Delivery and payment architecture

Two viable delivery models. Recommend **Model A** (fits what we already shipped); Model B is the agentary clone.

**Model A: license key + CLI + gated artifact (recommended).**
- Buyer pays, gets a license key by email + on the success page.
- `qaskills pack add ai-tester --key QAS-XXXX` calls a new gated endpoint that validates the key, checks the entitlement, and returns the pack artifact ZIP (reusing the `/artifact` ZIP builder we already shipped, extended to packs including pro-only skills).
- Revoke = deactivate the key. Updates = re-run `pack add` (server serves the current version).
- Pros: uses our CLI + artifact endpoint + registry; no per-buyer repo provisioning.

**Model B: private repo per buyer (agentary parity).**
- On purchase, provision/add buyer to a private GitHub repo; install via `npx github:...`.
- Pros: exact proven mechanism. Cons: repo provisioning automation, GitHub seat limits, more moving parts.

**Payment: merchant-of-record first.**
- **Primary: Polar or Lemon Squeezy** (both are merchants of record: they handle global VAT/GST/sales-tax and remit, which a solo founder should not hand-roll). Polar is exactly what agentary uses. Webhook on `order.paid` -> create purchase + license.
- **Alternative: Razorpay** (already in the founder's toolchain) if India-first, but then tax handling is on us and global card support is weaker. Recommendation: Polar/Lemon Squeezy for a global digital product.

## 7. Build plan (phased, concrete)

**Phase 0 (0.5 day): decisions.** Payment provider (Polar vs Lemon Squeezy vs Razorpay), delivery model (A vs B), launch prices. These are the only true blockers; everything else is mechanical.

**Phase 1 (2 to 3 days): data + entitlement.**
- Migrate `skill_packs`: add `tier` (`free`|`pro`), `priceCents`, `currency`, `visibility`, `heroCopy`, `version`. (Schema change to prod -> needs explicit approval, per repo rules.)
- New tables: `purchases` (email, provider, providerOrderId, packSlug|bundle, amount, createdAt) and `licenses` (key, purchaseId, packScope, status, activations, maxActivations, expiresAt null=lifetime).
- Seed the six packs + bundle into `skill_packs`/`skill_pack_items` from a `pro-packs/` manifest.

**Phase 2 (2 to 3 days): pro skills + playbooks.** Author the 3 to 5 pro-only skills per pack + the CLAUDE.md role playbook. This is the value that justifies price; generate with the Codex+Grok pipeline, audit with Opus (same mechanism as our articles/skills).

**Phase 3 (2 days): commerce endpoints + pages.**
- `POST /api/webhooks/<provider>`: on paid -> insert purchase, mint license, send license email (reuse the existing Resend `send.ts`; needs RESEND_API_KEY set, currently missing in prod).
- `GET /api/packs/:slug/artifact?key=`: validate license -> return pack ZIP (extends the shipped `/artifact` builder).
- `/pack` landing page (persona grid, pricing, checkout buttons to Polar/Lemon Squeezy) + `/pack/[slug]` per-pack page + `/pack/success` (shows key + install command).

**Phase 4 (1 to 2 days): CLI `pack` command.**
- `qaskills pack add <slug> --key <key>`: resolve entitlement, download the pack artifact, install all skills into the detected agent (reuses the installer + full-package logic already shipped). Add a case to the E2E publish gate.

**Phase 5 (1 day): launch.** Wire scarcity pricing, publish `/pack`, IndexNow ping, email the 464 users + 228 signups (once RESEND_API_KEY exists), soft-launch to the waitlist first.

**Reused, already-shipped assets:** `@qaskills/cli` full-directory install, `/api/skills/:slug/artifact` ZIP+checksum builder, `skill_packs` schema, `/refund-policy` + `/terms`, Resend `send.ts` + unsubscribe tokens, the E2E publish gate, and the Codex+Grok+Opus content pipeline for authoring pro skills.

## 8. Go-to-market

- Soft-launch the QA Pro Bundle to the 228 waitlist first (they opted in via the claude-qa lead magnet), scarcity price for the first 100.
- Each of the 1,419 blog posts becomes a funnel: add a contextual "Get the [persona] Pro Pack" CTA to relevant cluster posts (Playwright posts -> Automation pack, LLM-eval posts -> AI pack).
- Leaderboard + `/skills` get a "Pro Packs" nav entry.
- The reels page (qaskills.sh/reels) already markets features; add pack CTAs.

## 9. Risks and open decisions (need your call)

1. **Payment provider**: Polar (agentary's choice, MoR) vs Lemon Squeezy (MoR) vs Razorpay (India, self-tax). Pick one.
2. **Delivery model**: A (license + CLI, recommended) vs B (private repo, agentary parity).
3. **Free vs pro line**: which skills stay free vs become pro-only. Recommendation: keep all current 436 free, make packs = curation + NEW pro skills + playbooks, so we never take away what users have.
4. **Prod schema migration + RESEND_API_KEY**: both are prod changes that need your explicit go (repo rule).
5. **Prices**: confirm the $29 / $59 / $79-launch ladder.

Give decisions on 1 to 5 and Phase 1 can start immediately; nothing here requires new external dependencies except the payment account and the (already-needed) Resend key.
