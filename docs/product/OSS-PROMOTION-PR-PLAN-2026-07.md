# OSS Promotion Plan: Awesome-List PRs for qaskills.sh

**Date:** 2026-07-08
**Goal:** Get qaskills.sh listed in 10-12 curated GitHub directories via PRs, for backlinks (SEO), discovery, and credibility. Reciprocally feature the effort on qaskills.sh.
**Status:** PLAN ONLY. Opening PRs to external repos needs explicit approval per CLAUDE.md. Entry drafts below are ready to submit on go.

## Rules for every PR (do not skip)

1. Read the repo's CONTRIBUTING and the exact format of neighboring entries; match it letter for letter (alphabetization, badge style, trailing period, category).
2. One project per PR, smallest possible diff, follow their PR template.
3. Honest placement only. A misfiled or off-topic entry gets rejected and burns the repo for future tries.
4. Never bulk-open. Space them out (2-3/day max) so it does not read as spam; a maintainer who sees the same handle spamming ten lists rejects on sight.
5. Fork-based PRs from PramodDutta. No AI-attribution in PR body (repo norm).
6. Track each in the table at the bottom.

## Verified targets (all live, checked 2026-07-08)

Merge-friendliness = share of last 15 closed PRs that merged. qaskills mentions = 0 in all (clean slate).

### Tier 1: strong fit + PR-friendly (do these first)

| # | Repo | Stars | Merge signal | Fit |
|---|---|---|---|---|
| 1 | [atinfo/awesome-test-automation](https://github.com/atinfo/awesome-test-automation) | 7.1k | 9/15 | Core: test automation frameworks/tools/resources. Add under an AI-testing or resources section. |
| 2 | [malomarrec/awesome-qa](https://github.com/malomarrec/awesome-qa) | 36 | 9/15 | Exact topic (QA + E2E tooling). Low stars but on-theme and easy merge = a cheap live link. |
| 3 | [TheJambo/awesome-testing](https://github.com/TheJambo/awesome-testing) | 2.3k | 5/15 | Testing resources for practitioners; a QA-skills-for-AI-agents resource fits "Tools/Resources". |
| 4 | [mxschmitt/awesome-playwright](https://github.com/mxschmitt/awesome-playwright) | 1.5k | 3/15 | Playwright is our biggest cluster (15 skills). PRIOR PR EXISTS (see scripts/awesome-playwright-pr-body.md); check if merged/open before re-submitting. |
| 5 | [mfaisalkhatri/awesome-learning](https://github.com/mfaisalkhatri/awesome-learning) | 1.2k | active (pushed 2026-07-07) | Test-automation learning resources. Our 800+ article blog + skills = a legit learning resource entry. |

### Tier 2: AI/Claude ecosystem (strong strategic fit, varied gatekeeping)

| # | Repo | Stars | Merge signal | Fit / caveat |
|---|---|---|---|---|
| 6 | [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | 49k | has a formal submission process | Highest-value link. Has a strict PR template + review. Submit under tooling/resources as "a registry of QA skills installable into Claude Code". Follow their template exactly. |
| 7 | [travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills) | 14k | 0/15 merged | Perfect topical fit BUT recent PRs not merging; may be curator-only or backlogged. Open an ISSUE first asking if community adds are accepted, then PR. |
| 8 | [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) | 67k | 0/15 merged | Same as above: huge, but 0 recent merges suggests auto-generated/gated. Low effort-to-try via issue; do not expect a merge. |
| 9 | [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules) | 40k | active | Indirect fit (our skills target Cursor too). PRIOR ATTEMPT EXISTS (scripts/PR_CONTENT_awesome-cursorrules.md). Only re-try if we ship an actual .cursorrules artifact; otherwise skip, weak fit. |

### Tier 3: stretch / conditional

| # | Repo | Stars | Note |
|---|---|---|---|
| 10 | [abhivaikar/howtheytest](https://github.com/abhivaikar/howtheytest) | 6.8k | Fit ONLY if we publish a "how we test qaskills.sh / how we build QA skills" writeup; it lists companies' testing practices, not tools. Content-gated: write the post first, then PR. |
| 11 | [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | 90k | ONLY if we ship an MCP server. qaskills is a CLI+registry today, not an MCP server. Flag as a product prerequisite, not a ready PR. |
| 12 | [sindresorhus/awesome](https://github.com/sindresorhus/awesome) (the root list) | 483k | Hardest bar: needs our OWN "awesome-qa-skills" list repo meeting their maturity rules, not a link to qaskills.sh. Long-game: convert seed-skills into a public awesome-list repo, then apply. |

Dropped during research (404/archived/off-topic): e2b-dev/awesome-ai-agents (stale, Feb 2025), kentcdodds/awesome-testing-tools (404), various guessed slugs.

## Entry drafts (ready to paste, adjust to each repo's format)

**One-liner (most lists):**
`[QASkills.sh](https://qaskills.sh) - Open registry of 400+ QA & testing skills (Playwright, API, LLM evals, accessibility) installable into Claude Code, Cursor & 30+ AI agents via the qaskills CLI.`

**Playwright-specific (awesome-playwright):**
`[QASkills.sh](https://qaskills.sh) - Curated Playwright E2E skills (Page Object Model, fixtures, self-healing, MCP) that AI coding agents install and follow via the qaskills CLI.`

**Claude-ecosystem (awesome-claude-code / claude-skills):**
`[QASkills.sh](https://qaskills.sh) - The largest open catalog of QA & testing Agent Skills (SKILL.md) - 400+ skills for Playwright, API, LLM evaluation, accessibility, performance - installable into Claude Code with \`npx qaskills add\`.`

## Reciprocal promotion on qaskills.sh

1. **Blog post:** "QASkills.sh in the wild: featured across the top testing & AI awesome-lists" - links out to each list (dofollow context), updates as PRs merge. Doubles as social proof.
2. **/resources or footer "As featured in" strip** once 3+ merge, with the list repos' names (credibility signal for the OSS-program application too).
3. **Backlink tracking:** these are dofollow GitHub links from high-DA repos = real SEO value; log which merged in docs/seo and watch referral traffic in GA4.

## Rollout sequence

- **Wave 1 (day 1-3):** Tier 1 #1-5. Highest merge odds, builds a track record. 2/day.
- **Wave 2 (day 4-7):** Tier 2 #6-8 (issue-first for #7/#8), #9 only if a cursor artifact exists.
- **Wave 3 (conditional):** #10 after a "how we test" post; #11 after an MCP server ships; #12 as a quarter-long project.
- After each merge: add to the reciprocal blog post + tracking table.

## Tracking (updated 2026-07-08)

| Repo | PR/Issue | State | Notes |
|---|---|---|---|
| malomarrec/awesome-qa | [#15](https://github.com/malomarrec/awesome-qa/pull/15) | OPEN (new) | AI-based Testing section |
| TheJambo/awesome-testing | [#170](https://github.com/TheJambo/awesome-testing/pull/170) | OPEN (new) | AI & LLM Testing section |
| mfaisalkhatri/awesome-learning | [#427](https://github.com/mfaisalkhatri/awesome-learning/pull/427) | OPEN (new) | QA Assistance tools |
| travisvn/awesome-claude-skills | [#957](https://github.com/travisvn/awesome-claude-skills/pull/957) | OPEN (new) | Collections & Libraries; repo has 0/15 recent merges, low odds |
| atinfo/awesome-test-automation | [#505](https://github.com/atinfo/awesome-test-automation/pull/505) | OPEN (pre-existing) | qaskills PR from Feb 2026 still pending; did NOT duplicate |
| hesreallyhim/awesome-claude-code | CLOSED to submissions | blocked | Confirmed 2026-07-08: issue creation limited to collaborators; CONTRIBUTING says recommendations paused during redesign. No PR, no CLI, no issue form works. REVISIT when they re-open (watch the repo / re-check the issue form). |
| ComposioHQ/awesome-claude-skills | skipped | - | Requires contributing a full skill FOLDER, not a link; 0/15 merges. Revisit only to donate an actual skill. |
| mxschmitt/awesome-playwright | skipped | - | Prior qaskills PR CLOSED/rejected Feb 2026; do not nag |
| PatrickJS/awesome-cursorrules | skipped | - | Prior qaskills PR CLOSED/rejected Feb 2026; weak fit |
| abhivaikar/howtheytest | deferred | - | Needs a "how we test qaskills.sh" post first |
| punkpeye/awesome-mcp-servers | deferred | - | Needs an actual MCP server shipped |
| sindresorhus/awesome | deferred | - | Needs our own mature awesome-qa-skills list repo |

### awesome-claude-code (49k stars): submissions currently CLOSED

Confirmed 2026-07-08: the issue form returns "An owner of this repository has limited the ability to create an issue to users that are collaborators." Submissions are paused during their redesign (per CONTRIBUTING). No path is open right now (PR, gh CLI, and issue form all blocked).

Revisit later: periodically re-check the submit link; when it stops erroring, submit this one-liner (their style: descriptive, no emoji):

`An open, MIT-licensed registry of 400+ QA and testing skills (Playwright, API testing, LLM evaluation, accessibility, performance) that install into Claude Code via a CLI.`

Submit link (currently gated): https://github.com/hesreallyhim/awesome-claude-code/issues/new?template=recommend-resource.yml
Resource URL: https://github.com/PramodDutta/qaskills
