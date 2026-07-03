# QASkills.sh — Top 5 Features to Become the #1 QA-Skills Registry (Research, 2026-07)

> Method: 3 parallel deep-research agents (competitor landscape, demand-side pain points,
> standards/ecosystem direction) — ~30 web searches / ~40 source fetches — plus a firsthand
> audit of our own repo against the agentskills.io spec. Full evidence + sources inline.

## The strategic picture (read this first)

- **SKILL.md won.** Anthropic open-sourced the Agent Skills spec (agentskills.io, Dec 2025);
  ~40 products adopted it (Copilot, Cursor 2.4, Codex, Gemini CLI, JetBrains, Amp…).
  `.agents/skills/` is emerging as the cross-vendor install dir. We picked the right format —
  but our implementation has drifted from the spec (see Feature 3).
- **skills.sh (Vercel) owns volume.** No submission flow — any GitHub repo is a listing; the
  leaderboard is install telemetry (~870k skills listed, 2M+ installs on the top skill).
  **We cannot win on catalog size. Nobody can.**
- **The ecosystem just had its supply-chain crisis.** Snyk's ToxicSkills (Feb 2026): of 3,984
  scanned skills, **36.8% had a security flaw, 13.4% critical, 76 confirmed malicious**.
  Trust is now the #1 stated user fear, and scanning-at-install became table stakes
  (Snyk+Vercel integration, Cisco Skill Scanner).
- **Skills provably work — when curated.** SkillsBench (arXiv): curated skills give **+16.2pp
  average pass-rate uplift**; self-generated skills give ~zero. Separately measured: skills
  fail to auto-trigger ~50% of the time; a skill costs ~12K tokens/call. **Nobody publishes
  measured outcomes per skill. That's the open lane.**
- The three questions users actually ask — *is it safe?* / *does it work?* / *is it current?* —
  are unanswered by every registry today. A QA brand answering all three IS the positioning.

**Thesis: don't compete on catalog size — compete on *verified quality* in the QA vertical.
"Every skill security-scanned, eval-proven, and version-fresh." skills.sh structurally cannot
claim this for a telemetry-harvested long tail; it's perfectly on-brand for a QA company.**

---

## Feature 1 — Eval-Proven Skills: measured "it works" badges (THE moat)

**What:** A CI eval harness that runs each skill against fixture repos and publishes, on the
skill page + API + CLI:
- **Uplift score:** baseline-vs-skill pass rate ("+22pp across 12 tasks on Claude Code + Codex"),
  SkillsBench-style with deterministic verifiers (does the generated Playwright/pytest suite
  pass? does mutation score improve?)
- **Trigger accuracy:** % of relevant prompts where the skill activates (community-measured
  ~50% failure is the pain; publishing a "triggers reliably" score is novel)
- **Token footprint:** context cost per activation (context-rot is a top-5 complaint)
- "Eval-Verified ✓" badge + last-run date.

**Why #1:** Demand research: "skills without evals are just markdown and hope" (a literal
article title). Competitor research: outcome verification is missing across ALL registries
(closest is wshobson's repo-internal PluginEval). Standards research: SkillsBench proved
curated skills work and self-generated ones don't — measurement IS the differentiation. And QA
skills are *uniquely executable* — a Playwright skill can be verified by running Playwright.
No horizontal registry can match this cheaply. We literally do QA — QA'ing the skills is the brand.

**Build sketch:** GitHub Actions matrix: fixture apps (todo-app, API server) × top-50 skills ×
2 agents (claude -p, codex exec) → run agent with/without skill on N tasks → score suites
(pass rate, mutation score via Stryker/mutmut, assertion density) → write results to a
`skill_evals` table → badge on page + `qualityScore` becomes measured, not heuristic (this also
completes FIX-5). Start with top-20 skills, expand.

## Feature 2 — Trust Layer: scan-on-publish + provenance + "Security Verified" badge

**What:**
- Automated scan of every skill (and every re-publish): prompt-injection patterns, malicious
  instructions, suspicious URLs, credential/env-var reads, dangerous bundled scripts.
  Integrate/adapt Cisco's open Skill Scanner + an LLM-judge pass; SkillTester's probe suite as
  a model. Result surfaced as badge + API field + CLI warning on `add`.
- **Provenance:** record source repo + commit per version, serve checksums, immutable version
  history. Later: OCI export with cosign/SLSA (direction enterprise is heading; don't bet on
  one package format yet).
- Publish the methodology (Glama-style transparent rubric + letter grades).

**Why #2:** Loudest user fear post-ToxicSkills, with an entire "how to audit a skill" content
genre as evidence. Vercel's response ("routine audits", vague) leaves the visible-per-skill
trust badge unclaimed. "The registry where every skill passed security QA" — again, on-brand.

**Build sketch:** scan pipeline in the publish path + backfill across the 384 existing skills;
`securityScan` JSONB on skills; badge component; CLI prints scan status before install.

## Feature 3 — Full Spec Conformance + Be Everywhere (distribution adapters)

**What:** (a) Conform to the open spec; (b) plug into every distribution channel:
- **Spec conformance (verified gaps in our repo today):** `name` must be lowercase-hyphens
  matching the dir (ours: "QA Skill for Claude Code" ❌); `author`/`version`/`tags` belong in a
  `metadata` map, not top-level ❌; support **directory-format skills** — `scripts/`,
  `references/`, `assets/`, progressive disclosure (1/384 of our skills has any bundled dir);
  validate with the official `skills-ref` validator in skill-validator + publish path.
- **CLI: install to `.agents/skills/`** as the universal target (Codex, Gemini CLI already scan
  it) alongside our 30+ per-agent paths; keep both.
- **Distribution adapters:** (1) Claude Code `marketplace.json` endpoint → `/plugin marketplace
  add qaskills` natively; (2) MCP skills extension (SEP-2640 / experimental-ext-skills) so
  agents discover QASkills skills in-session over MCP; (3) well-known-URI skill serving;
  (4) mirror skills to a public GitHub org so they're installable via `npx skills add` — ride
  skills.sh's leaderboard as free distribution instead of fighting it.

**Why #3:** Existential, not optional — agents execute `scripts/` now; a registry serving
flat markdown reconstructed from a DB column is below spec. And each adapter is cheap but opens
a whole channel (Claude Code plugin users, MCP-native discovery, skills.sh's flywheel).

## Feature 4 — Versioning, Pinning & Freshness ("is it current?")

**What:** Semver per skill + changelogs + diff-on-update; `qaskills.lock` lockfile +
`qaskills check` / `update` (npm-ci-equivalent restore); pin by version/SHA; **freshness
badge**: "last verified against Playwright 1.54 on 2026-07-02" (driven by Feature 1's eval
runs — evals re-run on framework releases automatically re-date skills).

**Why #4:** "Silent drift is the real enemy" — GitHub shipped SHA-pinning in `gh skill` for
exactly this; skillprovenance.dev exists solely for it; stale skills quietly poison agents
after framework majors. No registry shows version history, changelogs, or freshness. Retention
feature: update notifications bring users back.

## Feature 5 — Teams & Private Skill Packs (the monetization layer)

**What:** Org namespaces (`@company/skill`), private skills/packs, admin-provisioned "approved
set" pushed to every dev's agents via CLI/CI, roles + audit log, org install analytics.
Free for public; paid for private/teams. Author analytics dashboard (installs/views/evals over
time) ships with the same plumbing — no registry gives authors any data today.

**Why #5:** Enterprise standardization is the unserved demand (Cursor shipped Organizations;
Anthropic only offers org skill distribution inside its paid walled garden; World Quality
Report: 89% of orgs use GenAI in QE, only 15% scaled it — governance is the gap). Only path to
revenue that doesn't tax the community. Features 1+2 (proof + trust) are exactly what a QA
manager needs to justify org-wide adoption.

---

## Sequencing (90 days)

| Phase | Ship |
|---|---|
| Now (wk 1–3) | F3 spec conformance + `.agents/skills/` target + marketplace.json + GitHub mirror (rides skills.sh) |
| Wk 3–6 | F2 scan-on-publish + backfill 384 skills + badges (+ CLI warning) |
| Wk 6–10 | F1 eval harness on top-20 skills → measured qualityScore v2 (completes FIX-5); freshness dates (F4 seed) |
| Wk 10–14 | F4 semver/lockfile/pinning + update notifications |
| Quarter 2 | F5 orgs/private packs (paid) + author analytics |

**One-line strategy: skills.sh is the phonebook; QASkills becomes the *certified* directory —
scanned, eval-proven, version-fresh QA skills for every agent.**
