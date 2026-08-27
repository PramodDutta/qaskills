# Resume Skills on QASkills: Research and Implementation Plan

2026-08-08. Status: AWAITING APPROVAL. Nothing in this plan has been built.

Source repo researched first-hand (cloned, all 22 skills read): https://github.com/Paramchoudhary/ResumeSkills

## 0. Corrections and constraints up front

- The live domain is **qaskills.sh** (the request said qaskills.com). Plan targets `qaskills.sh/resume-skills`.
- License is confirmed **MIT** ("Copyright (c) 2026 Resume Skills"). We may copy, modify, and redistribute, including commercially, provided the copyright and license notice is preserved. That means every ported skill carries `license: MIT` plus a one-line attribution to the source repo. Claiming pure original authorship would violate the license; attribution also reads better than silence.
- Repo norm is committing to `main`, but per your instruction this ships as a **PR from a feature branch** for review before merge.
- The catalog stays free. Resume skills are normal free skills like everything else.

## 1. What the source repo actually contains (verified inventory)

22 skills under `skills/<slug>/SKILL.md`, simple frontmatter (name + description only), bodies 1,208 to 2,124 words. Real, structured content (the sampled `tech-resume-optimizer` has 34 H2/H3 sections): checklists, before/after examples, frameworks (STAR, ATS keyword matching), templates. Not stubs.

Zero slug collisions with our 443-skill catalog (checked every slug against `seed-skills/`).

| Tier | Skills | Verdict |
|---|---|---|
| Port nearly as-is (generic, high value) | resume-ats-optimizer, resume-bullet-writer, job-description-analyzer, resume-tailor, cover-letter-generator, linkedin-profile-optimizer, interview-prep-generator, salary-negotiation-prep, resume-quantifier, resume-formatter, career-changer-translator, offer-comparison-analyzer, resume-version-manager, reference-list-builder, cold-email-writer, application-form-filler, resume-section-builder, portfolio-case-study-writer | 18 to port |
| Port but lower priority | executive-resume-writer, academic-cv-builder, creative-portfolio-resume | 3, niche for our audience |
| Skip | tech-resume-optimizer | superseded by our persona rewrites below |

## 2. Our differentiator: 6 NEW persona skills (not in the source repo)

The source repo is generic. Our audience is QA. The genuinely new value, and the SEO hook, is persona-specific versions written by us, reusing the source frameworks but with QA-specific content (real tool matrices, portfolio expectations, interview loops):

1. `qa-tester-resume-optimizer` (manual/functional QA: ISTQB, test design, defect metrics)
2. `automation-tester-resume-optimizer` (SDET: Playwright/Selenium/Cypress skill matrix, framework-building bullets, GitHub portfolio)
3. `sdet-interview-prep` (coding + framework design + API/CI rounds, STAR stories from test projects)
4. `qa-project-portfolio-builder` (turning test suites and frameworks into case studies recruiters read)
5. `devops-engineer-resume-optimizer` (CI/CD, IaC, SRE metrics)
6. `qa-linkedin-profile-optimizer` (QA keyword optimization, recruiter search behavior for QA roles)

Total catalog addition: **21 ported + 6 new = 27 skills** (or 24 if the 3 niche ones are cut).

## 3. Adaptation per ported skill ("very small changes", concretely)

Each ported skill gets:
1. Frontmatter rewritten to our product schema (single-line values, inline arrays, description 10-500 chars, semver, Zod-validated).
2. Title-case display name (`Resume ATS Optimizer`), author `thetestingacademy`.
3. One added section: "For QA and testing roles" (5-10 lines of persona guidance) so every ported skill earns its place on a QA site.
4. Attribution + license line at the bottom of the body: "Adapted from Resume Skills (github.com/Paramchoudhary/ResumeSkills), MIT License."
5. Body otherwise preserved (it is good, and MIT allows it).

## 4. Taxonomy: the one shared-package change

Our validator and filters require `testingTypes >= 1` and `languages >= 1`, and the UI filter chips derive from `packages/shared/src/constants`. Resume skills fit none of the 18 existing testing types. Plan:

- Add one entry to `TESTING_TYPES`: `{ id: 'career', name: 'Career & Resume', slug: 'career', description: 'Resume, interview, and career development for QA professionals', icon: '📄', color: '#0EA5E9' }`.
- Add `{ id: 'markdown', name: 'Markdown' }` to `LANGUAGES` (resume skills are document-driven; keeps the languages field honest).
- Frontmatter for all 27: `testingTypes: [career]`, `languages: [markdown]`, `domains: [web]`, full agents list, tags like `[resume, career, ats, qa-jobs]`.

This is why filters, category chips, and the skills grid pick the new skills up with zero page-code changes. `@qaskills/shared` must be rebuilt first (known build-order rule).

## 5. Site surface: /resume-skills page + nav

- **Nav**: `packages/web/src/components/layout/header.tsx` holds a static links array. Add `{ href: '/resume-skills', label: 'Resume' }`. Current nav is Leaderboard, Skills, Roadmaps, Blog, Agents, Packs; one more fits.
- **Page**: new `packages/web/src/app/resume-skills/page.tsx`, server component, modeled on the existing `/roadmaps` curated-landing pattern: hero ("Resume skills for QA engineers: install into your AI agent"), persona sections (Manual QA, Automation/SDET, DevOps, Everyone), each skill card linking to its normal `/skills/thetestingacademy/<slug>` detail page, install command shown (`npx qaskills add qa-tester-resume-optimizer`). Static metadata + JSON-LD like other pages. No client interactivity needed beyond existing shared components (mistake 1 guarded).
- SEO: canonical `https://qaskills.sh/resume-skills`, added to sitemap automatically only if we wire it (sitemap covers static routes; verify entry).

## 6. Delivery pipeline (unchanged, proven)

Standard seed flow: `seed-skills/<slug>/SKILL.md` -> validator -> `pnpm db:seed` against the VERIFIED prod DATABASE_URL (vercel env pull; .env.local is stale, mistake 4) -> live at `/api/skills/<slug>` and installable via CLI. The upsert seeder makes this additive-only. Quality bar per seed skill applies (validator pass, single-line frontmatter, real body, live total grows by exactly N).

## 7. Promotion: 12-article list (each 3000+ words, standard pipeline)

1. `qa-resume-examples-2026` -> QA Resume Examples and Templates That Pass ATS in 2026 (Guide)
2. `sdet-resume-guide-2026` -> SDET Resume Guide: Skills Matrix, Projects, and ATS Keywords (Guide)
3. `automation-tester-resume-ats-optimization` -> Automation Tester Resume: ATS Optimization Step by Step (Tutorial)
4. `qa-tester-interview-preparation-ai-agent` -> QA Interview Prep With an AI Agent: STAR Stories From Your Own Test Work (AI Testing)
5. `manual-tester-to-automation-resume-transition` -> Manual Tester to Automation: Rewriting Your Resume for the Transition (Migration)
6. `qa-engineer-linkedin-profile-optimization` -> QA Engineer LinkedIn Optimization: What Recruiters Actually Search (Guide)
7. `devops-engineer-resume-ci-cd-keywords` -> DevOps Resume: CI/CD Keywords and Metrics That Get Interviews (Reference)
8. `qa-portfolio-projects-that-get-interviews` -> QA Portfolio Projects That Get Interviews (With Case Study Structure) (Guide)
9. `qa-salary-negotiation-guide-2026` -> QA Salary Negotiation: Market Data, Scripts, and Counter Offers (Guide)
10. `ats-resume-formatting-rules-tech-roles` -> ATS Resume Formatting Rules for Tech Roles: What Breaks Parsing (Reference)
11. `resume-skills-for-claude-code-job-search` -> Using Claude Code as Your Job Search Copilot: The Resume Skills Stack (AI Testing)
12. `qa-resume-bullet-points-before-after` -> QA Resume Bullets: 40 Before/After Rewrites With Metrics (Reference)

Each links to `/resume-skills` and 2 existing posts; the existing QA-career cluster (27 articles) gets internal links pointing in. These target "qa resume", "sdet resume", "qa interview" long-tail, which our current corpus does not cover at all.

## 8. Execution order and effort

| Phase | Work | Effort |
|---|---|---|
| A | Shared constants (`career`, `markdown`) + rebuild shared | 0.5 day |
| B | 21 ported seed skills (script-assisted conversion + manual QA-section per skill) | 1 day |
| C | 6 new persona skills (written fresh, audited like articles) | 1 day |
| D | `/resume-skills` page + nav + sitemap entry | 0.5 day |
| E | Validate all 27, build, PR from branch `resume-skills`, review, merge | 0.5 day |
| F | Seed prod (verified URL, total 443 -> 470), deploy via ship-prod, verify live | 0.5 day |
| G | 12 articles via the standard batch pipeline + IndexNow + GSC check | 1 day |

Total: ~5 days of agent work, deliverable in 2-3 calendar days.

## 9. Risks and honest notes

- **Brand stretch.** Career content on a technical directory. Mitigation: persona framing everywhere ("resume skills for QA engineers"), one nav item, no popups. It also feeds the existing course funnel naturally (career-minded QA visitors are exactly the course audience).
- **SEO cannibalization is nil** (no existing resume content), but these keywords have heavier competition (Zety, Indeed, TealHQ). Long-tail persona angles ("sdet resume", "qa portfolio") are the realistic wins, not "resume tips".
- **The source repo may update.** We fork-and-own; no sync obligation. Attribution line covers provenance.
- **Cyber-side variant** mentioned in the request is out of scope here; the same pipeline reruns for it later.

## 10. Approvals needed before any build

1. Approve the overall plan (or trim to the 18 core ports + 6 new).
2. Approve the `career` testing type + `markdown` language additions to shared constants.
3. Approve nav label: `Resume` (alternatives: `Resume Skills`, `Career`).
4. Approve PR-based flow on branch `resume-skills` (vs the usual direct-to-main).
5. Confirm prod seeding (443 -> ~470) once merged.
