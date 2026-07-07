# Rewriting CLAUDE.md as an operating manual (and picking the 3 highest-leverage skills)

## Problem

Turn a generic CLAUDE.md into an operating manual that lets a weaker model work in this repo at a strong model's level, then identify and write the 3 skills that save the most hours.

## Approach

1. **Reconstruct "how the user works" from artifacts, not from the docs.** Four sources, in value order:
   - `~/.claude/projects/.../memory/` notes: every documented past failure (stale .env.local seed, slug collisions, working-tree deploys) is a pre-verified "named mistake".
   - `.claude/settings.local.json` permission allowlist: a literal command history of the real workflow, including the exact DB URLs, deploy commands, and one old commit template with a forbidden Co-Authored-By trailer.
   - `git log --format='%h %ad %s'`: cadence and message conventions. A near-daily `feat: publish 10 SEO articles (...)` commit identified the number-one recurring job.
   - `git show <daily-commit> --stat`: the file footprint of one routine commit IS the pipeline definition (10 post files + `posts/index.ts`).
2. **Verify every load-bearing mechanic in code before writing a rule about it.** Read `posts/index.ts` construction (two registries, batch arrays spread last, so duplicate slugs silently override), `seed.ts` (regex frontmatter parsing, so inline arrays only), `sitemap.ts` (derives from `postList`), `.vercel/project.json` (correct project IDs).
3. **Write rules in the shape of the failure.** Named mistake -> one preventing rule with a runnable check (`grep -c "'<slug>'" ... == 2`), not adjectives. Quality bars as checkbox commands. Escalation as two explicit lists: proceed-without-asking vs ask-first.
4. **Pick skills by commit frequency x past pain**, not by what sounds impressive: publish-seo-batch (daily), add-seed-skills (recurring, burned a session once), ship-prod (every ship, three documented failure modes). Each skill embeds its verification loop and a failure-mode table.

## Judgment calls

- Did NOT hardcode either Neon DATABASE_URL seen in history as "prod": two conflicting URLs is exactly the ambiguity that caused the original incident. The rule is "prove the target via live `/api/skills` total", which stays correct when credentials rotate.
- Did NOT run subagent pressure-tests on the skills (writing-skills TDD): the named mistakes are real observed failures, which already serve as the RED baseline; unsolicited agent fan-out is out of policy here.
- Did NOT put workflow summaries in skill descriptions: descriptions route ("use when..."), bodies execute; a summarized workflow in the description gets followed instead of the body.
- Did NOT fold the three skills into CLAUDE.md: CLAUDE.md loads every session, so it holds facts and tripwires; step-by-step pipelines live in on-demand skills.

## Reusable rule

When documenting "how we work here", mine the artifacts that record behavior (memory notes, permission allowlists, git log shapes, one routine commit's diff) and convert each past failure into a named mistake with a runnable check; frequency times past pain picks the skills worth writing.
