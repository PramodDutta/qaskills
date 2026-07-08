# QASkills.sh — Last 30 Days of Work (handoff)

> Purpose: a durable handoff so any agent/model/session, regardless of context, knows what was done recently, what is in flight, and where things live. Rebuild this from `git log --since='30 days ago'` when it goes stale.
> Written: 2026-07-08. Covers roughly 2026-06-08 to 2026-07-08 (59 commits). Owner: Pramod (solo founder).
> Read `CLAUDE.md` first (operating manual); this file is the "what happened lately" companion.

## Current state (verified 2026-07-08)

- Live catalog: **409 skills** (`GET https://qaskills.sh/api/skills?limit=1` -> top-level `total`)
- Blog: **860 post files** in `packages/web/src/app/blog/posts/` (dual-registry, see CLAUDE.md)
- Seed catalog: **396 dirs** in `seed-skills/` (source of truth; upserts to the live 409)
- CLI: **@qaskills/cli v0.3.0** on npm (~1,185 downloads/month)
- Repo: public, MIT-licensed (LICENSE added 2026-07-08), 167 stars, 17 forks
- Prod: Vercel project `qaskills.sh`, deploys via the `ship-prod` skill (worktree of HEAD)

## What shipped last 30 days (by theme, not raw log)

### SEO content engine (the growth driver, near-daily)
- ~250+ articles published across the month in batches of ~10/day, sourced from keyword research and (late June on) net-new WebSearch topics after the saved GSC reports were exhausted.
- Big batches: 79 gap-fill articles (2026-06-19), 28 net-new via multi-agent workflow (2026-06-27).
- Two batches on 2026-07-07 (20 articles: morning + a second run this session covering playwright-cli, qa-wolf, browser-use, healenium, webhook, EAA, checkly, chrome-devtools-mcp, finalrun, momentic).
- SEO infra: per-blog FAQPage JSON-LD, Related Articles internal linking, /compare and /skills-for programmatic hubs, sitewide JSON-LD, real logo/favicon/canonicals.
- Reality check logged (2026-06-15): head terms are gated by AI Overviews + official-source dominance + domain authority, NOT on-page tweaks. Growth = net-new long-tail + rank-lifting page-2 articles, not chasing gated head terms.

### Catalog / skills
- 12 P0 seed skills added this session (2026-07-07): 4 LLM-eval (deepeval, ragas, promptfoo, langfuse), 3 manual-QA tools (jira, testrail, istqb), 5 gaps (unit-test-generation, pr-test-coverage-review, kafka-event-driven-testing, test-metrics-kpis-dashboards, percy). Catalog 397 -> 409, prod-verified.
- Earlier: flagship "QA Skill for Claude Code", BrowserBash, E2E + QA-Agent cluster skills; real bodies authored for 14 empty hardcoded skills; full 383-skill catalog audit.
- Skills gap research (`docs/product/SKILLS-GAP-RESEARCH-2026-07.md`): the "mandatory 25" additions by persona (SDET / Automation / QA / Manual Tester). P0 (12) done; P1 (13) queued.

### CLI / product
- CLI v0.3.0: universal `.agents/skills/` install target, Claude Code marketplace, removed `--yes`.
- CLI v0.2.0 earlier: fixed SKILL.md extraction from git clones, exit codes.
- API: stable skill pagination with unique-id tiebreaker.
- CI: force-dynamic on 16 DB-driven pages (build needs no DATABASE_URL), ESLint configured so Web CI passes.

### Web / marketing
- Contextual course-ad component across skills/blog/footer, driven by `packages/web/src/lib/courses.ts` (single source of truth). PromoBanner refactored (2026-07-07) to derive dates from courses.ts, so course dates change in ONE place.
- Course dates currently: AI Tester Blueprint "Starts 26 Jul 2026", Playwright "Starts 11 Jul 2026".
- Public sponsorship media kit at `/qaskills-media-kit.html`.
- Aleeup chatbot embed sitewide + chatbot context doc + fine-tune dataset (77 Q&A).

### Agent operating system (this session, 2026-07-07)
- Rewrote `CLAUDE.md` into a full operating manual: 16 named mistakes + preventing rules, checkable quality bars per deliverable, escalation rules.
- Authored 3 project skills in `.claude/skills/`: `publish-seo-batch`, `add-seed-skills`, `ship-prod`.
- Gitignored `.claude/settings.local.json` (held a live DB password) and `.env.vercel-prod`.

## In flight / open threads (NOT done)

- **Claude for OSS program**: applied 2026-07-08 (6 months free Claude Max 20x). Approval pending; link would arrive by email to luckydutta96@gmail.com. See memory `claude-oss-program-application.md`.
- **OSS awesome-list promotion PRs** (opened 2026-07-08, all PENDING maintainer review, none merged yet):
  - malomarrec/awesome-qa#15, TheJambo/awesome-testing#170, mfaisalkhatri/awesome-learning#427, travisvn/awesome-claude-skills#957
  - atinfo/awesome-test-automation#505 (pre-existing from Feb, still open)
  - awesome-claude-code: submissions CLOSED to non-collaborators, revisit later
  - Full status + skipped targets: `docs/product/OSS-PROMOTION-PR-PLAN-2026-07.md`
- **Product Hunt launch**: date has moved during planning (was Jul 8, then Jul 14 in ROADMAP). CONFIRM the live date before acting. Plan: `docs/product/PRODUCTHUNT-LAUNCH-PLAN.md` and `PH-LAUNCH-PLAN.md`.
- **P1 seed skills (13)**: queued behind Batch A. List in the skills-gap doc.
- **Reciprocal promotion**: a "featured in" blog post + footer strip once 3+ awesome-list PRs merge. Not started.

## Key decisions & gotchas learned (do not relearn the hard way)

- `.env.local` DATABASE_URL is STALE non-prod. Seed prod only after `vercel env pull .env.vercel-prod --environment=production` (works from the agent as of 2026-07-07). Verify live `total` before AND after.
- `vercel --prod` ships the WORKING TREE, not HEAD. Deploy committed HEAD via a throwaway `git worktree` (the `ship-prod` skill does this). Push alone does not reliably trigger deploy.
- Blog posts must be in BOTH registries in `posts/index.ts` (`posts` map + `postList`). Batch arrays spread last, so a duplicate slug silently overrides. Dedup every slug before writing.
- Two prior qaskills promo PRs (awesome-playwright, awesome-cursorrules) were REJECTED in Feb 2026. Do not re-nag them.
- Course dates live in `packages/web/src/lib/courses.ts` only (banner derives from it now).
- No em dashes anywhere. No Co-Authored-By / "Generated with Claude Code" trailers.

## Where things live

- Operating manual + rules: `CLAUDE.md` (root)
- Project skills: `.claude/skills/` (publish-seo-batch, add-seed-skills, ship-prod)
- Strategy/research: `docs/product/` (ROADMAP, FEATURES-RESEARCH, SKILLS-GAP-RESEARCH, OSS-PROMOTION-PR-PLAN, PH launch plans)
- SEO working docs: `docs/seo/` (keyword reports, gap analyses)
- Learnings notes: `learnings/` (2 notes; write one after each non-trivial solve)
- Cross-session memory: `/Users/promode/.claude/projects/-Users-promode-qaskills/memory/` (MEMORY.md index + per-fact files)

## The 6-month horizon (Jul-Dec 2026)

Thesis (from FEATURES-RESEARCH): do NOT compete with skills.sh on catalog size. Win the QA vertical on VERIFIED QUALITY, every skill scanned (safe) + eval-proven (works) + version-fresh (current). Proposed arc: Jul PH launch + spec conformance; Aug trust/scan layer; Sep eval-proven skills (the moat); Oct versioning/freshness; Nov teams/private packs (revenue); Dec consolidate. Daily SEO runs the whole time. Full sequencing + open decisions were being discussed 2026-07-08; not yet locked into a doc.
