# QASkills.sh — Full Skill Catalog Audit (2026-06-11)

**Scope:** every live skill on qaskills.sh — 389 DB rows / 383 unique slugs. Method: full catalog fetch, bulk `/content` download (all 200 OK), automated deep analysis (body size, code fences, placeholder detection, template fingerprint, language-tag mismatch, broken mail-merge, frontmatter schema, encoding), plus seed-pipeline cross-check (seed-skills/ dirs vs DB vs hardcoded seed.ts) and prior CLI install verification (30 skills, 5 agents).

## Verdict summary

| Verdict | Count | % | Meaning |
|---|---|---|---|
| GOOD | 177 | 46% | Real content, real code, usable + reusable |
| STUB | 187 | 49% | Templated boilerplate, single placeholder code fence, not reusable |
| BROKEN-EMPTY | 17 | 4% | Body <210 chars — essentially no content served |
| THIN | 2 | 1% | Real but under 1.5K chars |

**Transport layer is flawless:** all 383 `/content` endpoints return 200 text/markdown; CLI installs are byte-identical to API output; frontmatter schema valid on all 383 (name/description/version present); zero encoding issues.
**The problems are data quality + seed pipeline + 3 CLI bugs.**

---

## Bugs found (the master fix list)

### P0 — Data integrity (DB)

**BUG-1: 6 duplicate slugs in DB (389 rows, 383 unique).**
`api-gateway-testing`, `bdd-gherkin-patterns`, `regression-test-selection`, `canary-deployment-testing`, `capybara-testing`, `drizzle-orm-testing` each have 2 rows. Slug lookups (`/skills/[author]/[slug]`, `/content`, CLI add) become nondeterministic.
Fix: dedupe rows (keep richer fullDescription), add UNIQUE constraint on slug, make seed.ts upsert on slug conflict.

**BUG-2: 17 BROKEN-EMPTY skills — body served is just the description echo.**
14 are hardcoded seed.ts entries WITHOUT a seed-skills/ dir (so no fullDescription source): `artillery-load`, `code-coverage`, `detox-mobile`, `docker-testcontainers`, `eslint-testing`, `maestro-mobile`, `msw-mocking`, `mutation-testing`, `puppeteer-automation`, `supertest-api`, `tdd-patterns`, `vitest-testing`, `vue-testing-utils`, `webdriverio-e2e`.
3 are user-published junk/spam: `skill-md`, `webnovel-assistant`, `webnovel-assistant-target` (off-topic, by handsome-liu01).
Fix: author real SKILL.md seed dirs for the 14; delete/unlist the 2 webnovel spam rows + decide on `skill-md`.

**BUG-3: 6 seeded dirs never landed in DB despite seed reporting success.**
`log-testing-patterns`, `mobile-gesture-tester`, `rag-regression-testing`, `screenshot-capture`, `testcontainers-reuse-node`, `ux-friction-logger` — includes 2 of the 13 new skills added 2026-06-04. seed.ts printed "Discovered and seeded 280" but these rows are absent. Likely silent conflict-skip (onConflictDoNothing on a non-slug unique key) or insert error swallowed.
Fix: debug seed.ts upsert; re-seed; verify via API.

### P1 — Content quality (the 49%)

**BUG-4: 187 STUB skills — mass-generated template, zero real code.**
All share one fingerprint: "Quality First / Defense in Depth / Adapt this pattern to your specific use case", identical 10-section skeleton, exactly one placeholder fence (`// Example <topic> pattern`), mad-libs prose ("setting up flaky for a new or existing project"). 177 authored `qaskills`, 9 `thetestingacademy`, 1 user. Full list: /tmp/skill-audit/stubs.txt (committed below as stub list).
Fix: regenerate in batches with real, runnable, language-correct code (worst-30 list already prepared). This is the single biggest credibility + reuse problem.

**BUG-5: 55 skills have language-tag mismatch in code fences** (e.g. ```python fence with // comments, ```ruby with //). Subset of the stubs. Fixed automatically by BUG-4 regeneration.

**BUG-6: qualityScore is inflated/meaningless for stubs** — stubs score 81-89, indistinguishable from GOOD skills. The calc ignores placeholder fences and template fingerprints.
Fix: penalize empty/placeholder fences, template markers, and body<4KB in packages/shared quality-score util; re-run scoring.

**BUG-7: near-duplicate topic slugs confuse users** — `appium-mobile` vs `appium-mobile-testing` vs `appium-python-mobile-testing` vs `python-appium-mobile-testing`; `artillery-load` vs `artillery-load-testing`; `vitest` vs `vitest-testing`; `playwright-visual-testing` vs `-fork`; `data-pipeline-testing` vs `pipeline-testing`.
Fix: consolidate/redirect or differentiate content.

### P2 — CLI (new client release justified)

**BUG-8 (High): GitHub-backed skills deliver no SKILL.md.** `add` on a skill with githubUrl (e.g. `selenium-advance-pom`, `vibe-check`) git-clones the whole repo into the agent dir and prints "installed" — agent gets a code dump, not skill instructions.
Fix in packages/cli/src/lib/installer.ts: after clone, locate SKILL.md in repo (search known paths); if absent, fall back to tier-2 `/content`; only copy the SKILL.md (+ referenced assets), not the full repo.

**BUG-9 (Med): failed install exits 0** — masks failures in CI. Fix: `process.exitCode = 1` in add.ts catch path.

**BUG-10 (Low): `--version` prints 0.1.0 while package.json is 0.1.2** — hardcoded version string. Fix: import from package.json.

Then: bump version, tag `cli-v0.2.0`, publish to npm (needs owner go).

### P3 — Hygiene

**BUG-11: user-published junk visible in catalog** — `my-qa-skill` (738B test junk), `autonomous-qa-workflow-skill-testchimp` (1.3KB vendor ad). Decide: minimum-quality gate on publish (validator already exists — enforce server-side), unlist current junk.

**BUG-12: publish pipeline allows off-topic content** (webnovel spam) — add topic/content validation server-side on POST /api/skills.

---

## Execution order (agreed: one by one, push each)

1. **FIX-1**: CLI bugs 8/9/10 + tag cli-v0.2.0 (code-only, fast, testable)
2. **FIX-2**: seed.ts upsert bug (BUG-3) + slug UNIQUE/dedupe (BUG-1) + re-seed + verify
3. **FIX-3**: author real SKILL.md for the 14 hardcoded BROKEN-EMPTY skills; remove webnovel spam (BUG-2, BUG-12 unlist)
4. **FIX-4**: regenerate worst-30 stubs → verify → continue in batches of ~30 until 187 done (BUG-4, kills BUG-5 too)
5. **FIX-5**: qualityScore penalty for placeholders (BUG-6) + re-score
6. **FIX-6**: consolidate near-duplicate slugs (BUG-7) + junk policy (BUG-11)

## Reusability bar (definition of done per skill)
- Frontmatter: valid name/description/semver/testingTypes>=1/languages>=1/agents
- Body >= 4KB with >= 3 real runnable code fences, correct language tags
- No template fingerprint, no placeholder fences, no mad-libs prose
- Installs via CLI byte-identical, renders on site, search-findable

## Artifacts
- Analysis data: 383-skill classification (committed as JSON next to this file)
- Stub list (187): stubs.txt | Broken list (17): broken.txt
