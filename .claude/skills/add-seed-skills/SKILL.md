---
name: add-seed-skills
description: Use when adding or editing QA skills in seed-skills/ or getting them onto the live qaskills.sh catalog, e.g. "add N new skills", "create a seed skill for X", "seed the database", "the skill page is empty", "skill 404s on the site".
---

# Add Seed Skills

Pipeline: `seed-skills/<slug>/SKILL.md` -> validator -> `seed.ts` upsert into the PROD database -> live catalog. These are PRODUCT catalog skills (Zod schema with testingTypes/languages), not Claude Code workflow skills; never confuse the two formats.

## Format contract (parser reality)

`packages/web/src/db/seed.ts` parses frontmatter with regex, not a YAML library:
- Every value on ONE line; a wrapped description parses as truncated garbage
- Arrays INLINE ONLY: `tags: [a, b, c]`. YAML block lists (`- item`) parse as EMPTY arrays
- Zod limits: name 1-100 chars, description 10-500 chars, version semver, `testingTypes` >= 1, `languages` >= 1
- Allowed values come from `packages/shared/src/constants/` (testing types, frameworks, languages, domains, agent slugs); check there before inventing one

Template (model the body on `seed-skills/playwright-e2e/SKILL.md`):

```markdown
---
name: Human Readable Skill Name
description: One line, 10-500 chars, what the skill teaches an agent to do.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [tag-one, tag-two]
testingTypes: [e2e]
frameworks: [playwright]
languages: [typescript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, cline]
---

# Skill Title

Real instructions: principles, project structure, code samples, checklists.
This body becomes fullDescription: it renders on the skill page and is what
the CLI downloads. Aim for 100+ lines of substance; an empty or thin body
is a broken product page.
```

## Steps

### 1. Dedup the slug (directory name = slug)

```bash
ls /Users/promode/qaskills/seed-skills | grep -i "<core-term>"
curl -s -o /dev/null -w '%{http_code}\n' "https://qaskills.sh/api/skills/<slug>"   # want 404
```

### 2. Write `seed-skills/<slug>/SKILL.md`

Frontmatter per the contract above, then the full body.

### 3. Validate every file

```bash
cd /Users/promode/qaskills
pnpm --filter @qaskills/shared build && pnpm --filter @qaskills/skill-validator build
for d in <slug-one> <slug-two>; do
  node packages/skill-validator/dist/cli.js "seed-skills/$d/SKILL.md" || echo "INVALID: $d"
done
```

Also eyeball that arrays are inline and the description is one line (the validator uses the real YAML parser and can pass files the seed regex still mangles).

### 4. Seed PRODUCTION (the dangerous step)

**Never use the `DATABASE_URL` from `.env.local`.** It points at a stale non-prod database; seeding it changes nothing on the live site. This mistake has burned a full session before.

1. Baseline: `curl -s 'https://qaskills.sh/api/skills?limit=1'` and record the top-level `total`.
2. Get the prod URL: the user must run `vercel env pull .env.vercel-prod --environment=production` (agent pulls of prod secrets are blocked). Ask once, precisely, and wait.
3. Seed with the explicit URL (strip any surrounding quotes from the value):

```bash
cd /Users/promode/qaskills
export DATABASE_URL='<prod-url-without-quotes>'
pnpm --filter @qaskills/web db:seed
```

`seed.ts` is an upsert (`onConflictDoUpdate` on skills): safe to re-run, it will not delete the live rows that exist only in prod. Never substitute custom SQL, and never run UPDATE/DELETE against prod without explicit user approval.

### 5. Verify live (the only proof that counts)

```bash
curl -s 'https://qaskills.sh/api/skills?limit=1'                       # total must equal baseline + N
curl -s "https://qaskills.sh/api/skills/<slug>/content" | head -20     # frontmatter + body, not empty
curl -s -o /dev/null -w '%{http_code}\n' "https://qaskills.sh/skills/thetestingacademy/<slug>"  # 200 (adjust author segment if different)
```

`total` unchanged, or slug 404s => you seeded the wrong database. STOP. Do not retry blindly; re-verify which URL was exported and report the mismatch.

### 6. Commit

```bash
git -C /Users/promode/qaskills add seed-skills/<slug-one> seed-skills/<slug-two>
git -C /Users/promode/qaskills commit -m "feat(skills): add <N> <theme> seed skills"
git -C /Users/promode/qaskills push origin main
```

No web redeploy is needed for catalog changes (pages read the DB), but commit so the repo stays the source of truth.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Skill live but tags/types empty | Block-list arrays or multi-line values in frontmatter | Convert to inline arrays, single lines, re-seed |
| Skill page renders only the short description | Missing/empty markdown body | Write the body, re-seed (upsert refreshes fullDescription) |
| Live `total` did not grow | Seeded the stale `.env.local` DB | Step 4.2, re-seed with the real prod URL |
| Validator passes but seed drops fields | Validator parses real YAML, seed.ts regex does not | Obey the format contract, not just the validator |
| Connection error on seed | Quoted URL or Node 24 | Strip quotes; use Node 20 |

## Red flags

- Exporting DATABASE_URL from `.env.local` "because it is right there"
- Skipping the baseline/after `total` comparison
- Frontmatter-only SKILL.md ("body later")
- Writing DELETE/UPDATE SQL to "fix" prod data
