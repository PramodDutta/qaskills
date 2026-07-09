# QASkills.sh Project Board

> Living kanban. Updated 2026-07-09. Nothing is pending deploy: all shipped work is committed, pushed, and live.
> Columns: DONE (this session) | WAITING (on others, no action from you) | TODO (prioritized, actionable) | BLOCKED (needs a decision or action from you).

## DONE (shipped this session, live)

- Rewrote CLAUDE.md into an operating manual + 3 project skills (publish-seo-batch, add-seed-skills, ship-prod)
- SEO content: 89 articles total (10 + 10 + 14 + 55), all live and in sitemap
- Full SEO audit (docs/seo/SEO-AUDIT-2026-07.md): tech SEO strong, found 10 cannibalization groups
- 12 P0 seed skills added (catalog 397 -> 414 live)
- Course banner dates fixed + refactored to a single source (courses.ts)
- Email-capture lead magnet: popup + PDF ebook + 5-skill zip + prod capture table (live, browser-verified)
- MCP server built + published: npm @qaskills/mcp@0.1.2 + official MCP registry (io.github.PramodDutta/qaskills)
- Full regression sweep (MCP + prod + 12 random skills), all green
- Applied to Claude for OSS program

## WAITING (on external parties, no action needed from you)

- Claude for OSS grant decision (arrives by email to your GitHub account email)
- 5 awesome-list PR reviews: malomarrec/awesome-qa#15, TheJambo/awesome-testing#170, mfaisalkhatri/awesome-learning#427, travisvn/awesome-claude-skills#957, atinfo/awesome-test-automation#505

## TODO (prioritized: do the top one next)

1. **Cannibalization consolidation pass (highest SEO ROI).** The audit found 10 groups of near-duplicate slugs splitting ranking signal (6x playwright-agents, 6x deepeval variants, etc.). Pick one canonical per group, redirect/merge the rest. This lifts existing rankings, cheaper than new content.
2. **awesome-mcp-servers PR (90k stars, now unblocked).** The MCP server made this legitimate. One PR = a high-authority backlink.
3. **/mcp landing page + "QA MCP server" blog post** on qaskills.sh. Captures "qa mcp server" search intent and documents the install.
4. **P1 seed skills batch (13 skills).** Queued behind the P0 batch; list in SKILLS-GAP-RESEARCH-2026-07.md.
5. **Monetization Wk1** (from the earlier plan): GA4 lead_capture event on the popup, course-funnel click instrumentation, affiliate program signups.
6. **Reciprocal "featured in" blog post** once 3+ awesome-list PRs merge.
7. **Regression gaps backlog** (docs/product/REGRESSION-GAPS-2026-07.md): 8 untested surfaces (auth, webhooks, cron, email, CLI beyond add). Real test suites, not urgent.
8. **Repo has zero unit tests outside the web package** (cli/sdk/shared/skill-validator). Worth a test-writing pass.

## BLOCKED (needs a decision or action from you)

- **Rotate the npm token.** You pasted it in chat earlier; it is working in CI but should be revoked and reissued on npmjs.com, then `gh secret set NPM_TOKEN`.
- **Delete junk catalog entry `my-qa-skill`** (placeholder, 0 installs, live since May). Prod DELETE needs your yes; I can also sweep for siblings.
- **awesome-learning PR #427** needs a GPG/SSH-signed commit (no signing key configured on your repo).
- **Product Hunt launch**: date drifted during planning (Jul 8 -> Jul 14 -> ?). Confirm the live date before acting.
- **awesome-claude-code**: submissions closed to non-collaborators; revisit when they reopen.

## Reference docs (where things live)

- CLAUDE.md (operating manual) | docs/product/LAST-30-DAYS-WORK.md (history) | docs/product/*.md (plans + research) | docs/seo/*.md (SEO) | learnings/*.md (per-solve notes)
