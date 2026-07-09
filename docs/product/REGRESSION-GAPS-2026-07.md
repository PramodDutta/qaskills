# Regression Gaps Backlog (from adversarial review, 2026-07-09)

Source: Grok adversarial review of three all-green regression reports (MCP 15/15, prod 46/46, 12 random skills 12/12). All-green does not mean covered; these are the named holes, risk-ranked. Each is a future test-suite task.

1. **Catalog quality gate (P1).** Regression only checks bytes/frontmatter/200s. Junk entries pass mechanically: `my-qa-skill` (user-submitted placeholder, live since May, 0 installs) proves it. Needed: a publish-time quality gate (placeholder-text detection, min real-content heuristics, review queue) and a one-time catalog sweep for sample/fork slugs. FOUND DEFECT: my-qa-skill removal pending owner approval (prod DELETE).
2. **Catalog integrity checks.** No golden baselines for search totals, no ranking assertions, no wrong-filter/empty-result cases, no duplicate-fork or orphan-author audit, no total-vs-pagination consistency across sort modes.
3. **Web product surface.** Skill detail SSR, packs, dashboard, install UI, markdown XSS on fullDescription, waitlist UX beyond one happy POST: untested.
4. **Auth/publish/reviews/webhooks/cron/email.** POST /api/skills, Clerk webhook user-create, weekly digest cron, unsubscribe HMAC, Resend sends: zero regression coverage; can all break while sweeps stay green.
5. **CLI surface beyond add.** search/list/remove/update/publish/init, 30+ agent detection matrix, global vs project scope, 3-tier download fallback (git clone -> /content -> metadata): uncovered.
6. **MCP depth.** Schema/required-field asserts, filter combinations, path traversal + overwrite behavior on install_skill targetDir, real-host (Claude Code/Cursor) integration, concurrency. FIXED ALREADY: VERSION drift (hardcoded 0.1.0 in 0.1.1 tarball) caught by this review, shipped as 0.1.2 with dynamic version.
7. **Telemetry assertions.** Install telemetry is fire-and-forget and never verified end-to-end (also: telemetry route matches skills.id against a slug, likely a silent no-op; pre-existing bug worth fixing).
8. **Scale/robustness.** n=12 of 414 skills sampled; no Node version matrix, rate limits, cache behavior, or published-tarball vs local-dist parity checks.

Rule of thumb going forward: every all-green report must state what it did NOT test.
