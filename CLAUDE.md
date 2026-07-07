# CLAUDE.md

Operating manual for AI agents working in this repository. It is written so a model with less judgment than the one that wrote it can still ship at the same level: where a rule exists, follow the rule, do not improvise. Every named mistake below is one that actually happened or nearly happened here.

## What this is

QASkills.sh is a QA-skills directory for AI coding agents ("npm for QA skills"). pnpm monorepo (pnpm 9.15.0, Node >= 20, Turborepo). Solo-founder operation: work lands directly on `main`, ships to production the same day, and growth is SEO-driven. The three recurring jobs, by frequency:

1. **Publish SEO articles** (near-daily batches of 10) -> use project skill `publish-seo-batch`
2. **Add seed skills** to the catalog -> use project skill `add-seed-skills`
3. **Deploy to production** on Vercel -> use project skill `ship-prod`

Project skills live in `.claude/skills/`. If a task matches one, follow the skill, not memory.

## Conventions (non-negotiable)

**Writing (everything: chat, commits, docs, article content, code comments):**
- Never use em dashes. Use a comma, period, colon, parentheses, or "->". En dashes for ranges (Jul 14-19) are fine. Before finishing any writing deliverable, run a literal grep for the em dash character and fix hits.

**Git:**
- Conventional commits, imperative mood: `feat:`, `fix:`, `docs(scope):`, `chore:`. Match the style in `git log`.
- No `Co-Authored-By:` trailers. No "Generated with Claude Code" footers. Commits must look like normal human commits.
- Commit directly to `main` (repo norm, no PR ceremony). One concern per commit.
- Never `git add -A`, `git add .`, or `git commit -a` from the repo root. The root is littered with unrelated artifacts (screenshots, `evaldog-app/`, `qabuddy/`, one-off strategy docs). Stage explicit paths only, and review `git diff --cached --stat` before committing.
- Pre-existing working-tree changes and untracked files are someone's WIP. Never stash, clean, revert, or absorb them into your commit.

**Code:**
- Prettier: single quotes, semicolons, 2-space indent, 100 char width, trailing commas, LF endings. TypeScript strict mode in all packages.
- Server components fetch data; client components (`'use client'`) own all interactivity. Details under Architecture.
- Match the surrounding file's idiom, comment density, and naming.

**Secrets:**
- Never print, log, or commit env var values. `.env.local` and `.env.production.local` exist at the root; treat their contents as radioactive and as possibly stale (see mistake 4).
- Values copied out of `.env.local` are wrapped in double quotes; strip the quotes before exporting or setting via any API.

## Commands

```bash
pnpm install                          # install all dependencies
pnpm build                            # build all packages (Turbo, dependency order)
pnpm dev                              # dev servers for all packages
pnpm test                             # vitest across packages
pnpm lint                             # lint all packages
pnpm format / pnpm format:check       # Prettier write / check

# Single package
pnpm --filter @qaskills/shared build
pnpm --filter @qaskills/web dev
pnpm --filter @qaskills/cli test

# Web quality gates
pnpm --filter @qaskills/web lint
pnpm --filter @qaskills/web exec tsc --noEmit
pnpm --filter @qaskills/web build
pnpm test:post-flow                   # web build + unit + Playwright e2e gate

# Database (proxied to @qaskills/web)
pnpm db:push                          # push schema (DEV ONLY, ask before prod)
pnpm db:migrate                       # Drizzle migrations (prod, ask first)
pnpm db:seed                          # upsert seed-skills/ into the DB the exported DATABASE_URL points at
pnpm db:studio

# Seed-skill validation (build first)
pnpm --filter @qaskills/skill-validator build
node packages/skill-validator/dist/cli.js seed-skills/<slug>/SKILL.md

# CLI smoke test after build
node packages/cli/dist/index.js --help
```

**Build order matters:** `@qaskills/shared` must build before cli, sdk, web, skill-validator. Turbo handles it in `pnpm build`; when running package commands directly, build shared first after touching it.

## Monorepo map

| What | Path | Notes |
|---|---|---|
| `@qaskills/shared` | `packages/shared` | Types, constants (30+ agent definitions, testing types, frameworks, languages, domains), Zod schemas, SKILL.md parser. Dependency of everything. |
| `@qaskills/cli` | `packages/cli` | `qaskills add/search/init/list/remove/publish` (Commander.js + @clack/prompts). Ships to npm via `cli-v*` tags only. |
| `@qaskills/sdk` | `packages/sdk` | Programmatic TypeScript SDK. |
| `@qaskills/skill-validator` | `packages/skill-validator` | Validates seed SKILL.md files. Bin: `qaskills-validate`. |
| `@qaskills/web` | `packages/web` | Next.js 15 App Router site + API + 800+ blog posts. This is the product. |
| Seed catalog | `seed-skills/` | ~384 directories, one product-schema SKILL.md each. Source of truth for the live catalog. |
| SEO working docs | `docs/seo/` | GSC keyword reports (`KEYWORD-OPPORTUNITIES-YYYY-MM.md`), analytics notes. |
| Product docs | `docs/product/` | Roadmap, launch plans. |
| Not the product | `evaldog-app/`, `qabuddy/`, `landingpage/`, root *.png / *.md strategy files | Separate experiments and artifacts. Do not build, fix, or stage them unless explicitly asked. |

`landingpage/` is NOT in the pnpm workspace; `pnpm --filter` cannot see it.

## Architecture (load-bearing facts)

### Blog engine (`packages/web/src/app/blog/`)
The SEO machine. One TypeScript module per post at `posts/<slug>.ts` exporting `post: BlogPost`:

```ts
export interface BlogPost {
  title: string;        // keyword-bearing
  description: string;  // meta description
  date: string;         // 'YYYY-MM-DD'
  category: string;     // Guide | Reference | Tutorial | Comparison | AI Testing | API Testing | Migration | BDD | Performance
  content: string;      // full markdown in a template literal (escape backticks)
  image?: string;
  imageAlt?: string;
}
```

`posts/index.ts` (~2800 lines) holds TWO registries and a post must be in BOTH:
- `posts: Record<string, BlogPost>` -> powers `[slug]/page.tsx` detail pages (miss it = 404)
- `postList` array -> powers the /blog listing and the sitemap (miss it = invisible)

Batch files (`generated-seo-batch-2026.ts`, `playwright-long-tail-batch-2026.ts`, `_keyword-gap-batch.ts`, `_gapfill-batch.ts`, `_gapfill-batch2.ts`) export arrays that are spread into both registries AT THE END. A duplicate slug therefore resolves silently in favor of whichever entry lands last. `seoPriorityOverrides2026` is the only intentional override mechanism. `sitemap.ts` derives blog URLs from `postList`; never hand-add blog entries to the sitemap.

### Web app (`packages/web`)
Next.js 15 App Router, React 19, TailwindCSS v4, shadcn/ui. Stack: Neon Postgres (Drizzle) / Typesense / Upstash Redis / Clerk / PostHog / Resend.

- **Lazy init:** `db` (`src/db/index.ts`) is a Proxy creating the connection on first access; Resend client (`src/lib/email/client.ts`) is a lazy singleton with a placeholder key at build time. This is why the build needs no real secrets. Preserve the pattern for any new external client.
- **Auth:** Clerk middleware (`src/middleware.ts`) protects `/dashboard(.*)`, `/api/skills/create(.*)`, `/api/reviews(.*)`; `/api/webhooks(.*)` is public. `getAuthUser()` (`src/lib/api-auth.ts`) looks up AND auto-creates the DB user row (missed-webhook safety). App degrades gracefully when Clerk keys are absent.
- **Server/client split:** server components fetch and pass serializable props. Client components own `onClick`, hooks, PostHog. Icons cross the boundary as string names mapped to Lucide components client-side (see `FilterTabs`, `PacksGrid`). `SignupGate` wraps login-gated content.
- **Markdown rendering:** skill pages render `fullDescription` via `SkillDescription` (react-markdown + remark-gfm + rehype-sanitize), falling back to `description`.
- **Email:** `src/lib/email/send.ts` (welcome, new-skill alert, weekly digest). Unsubscribe tokens are HMAC-SHA256 signed, 30-day expiry (`UNSUBSCRIBE_SECRET`, falls back to `CRON_SECRET`). Templates in `src/components/emails/`.
- **API routes:** `GET /api/skills` (pagination, JSONB `@>` filters, sorting; response has top-level `total`), `GET /api/skills/[id]`, `GET /api/skills/[id]/content` (reconstructs full SKILL.md as text/markdown for the CLI), `POST /api/skills`, `/api/categories`, `/api/reviews`, `/api/leaderboard`, `/api/telemetry/install`, `POST /api/unsubscribe`, `POST /api/webhooks/clerk`, `POST /api/cron/weekly-digest` (Vercel Cron, Mondays 9 AM UTC, `CRON_SECRET` header).
- **Schema (`src/db/schema/`):** `users`, `userPreferences`, `skills`, `categories` + junctions (`skillCategories`, `agentCompatibility`, `installs`, `reviews`, `skillPacks`, `skillPackItems`). JSONB arrays on skills (`tags`, `testingTypes`, `frameworks`, `languages`, `domains`, `agents`) filtered with `@>`. `fullDescription` holds the SKILL.md markdown body.

### Seed pipeline
`seed.ts` auto-discovers every `seed-skills/*/SKILL.md`, parses frontmatter with REGEX (not a YAML library), and upserts (`onConflictDoUpdate` on skills, `onConflictDoNothing` on categories). Regex consequences: values must be single-line, arrays must be inline `[a, b, c]` form. The markdown body after frontmatter becomes `fullDescription`.

### CLI (`packages/cli`)
One file per command in `src/commands/`. `agent-detector.ts` probes 30+ agent config paths. `installer.ts` downloads with a 3-tier fallback: git clone `githubUrl` -> `GET /api/skills/{slug}/content` -> reconstruct from metadata. `api-client.ts`: 10s timeout, base URL `QASKILLS_API_URL || 'https://qaskills.sh'`. Built with tsup, CJS, shared bundled in via `noExternal`.

### Type flow
SKILL.md frontmatter -> `SkillFrontmatter` -> `SkillCreate` (Zod) -> DB row -> `Skill`/`SkillSummary` API response.

## Named mistakes and the rule that prevents each

1. **The server-component onClick.** Event handler or hook added to a server component; builds locally, 500s in production. Rule: any interactivity means the file starts with `'use client'`. Server components pass only serializable props; functions never cross the boundary; icons cross as string names.
2. **The single-registry blog post.** Post file created but registered in only one of `posts` / `postList`; page 404s or never appears in listing and sitemap. Rule: every new post needs three edits in `posts/index.ts` (import, `posts` map entry, `postList` entry). Verify: `grep -c "'<slug>'" packages/web/src/app/blog/posts/index.ts` must print exactly 2.
3. **The silent slug collision.** A new post reuses a slug that already exists inside a batch array; one silently replaces the other (this shipped a stub over a real article once). Rule: before creating any post file, run `grep -rn "<slug>" packages/web/src/app/blog/posts/` and pick a new slug on any hit.
4. **The stale .env.local seed.** Seeding "production" using `.env.local`'s `DATABASE_URL`, which points at an old non-prod database; the live site never changes and new skills 404. Rule: `.env.local` is NOT production. The prod `DATABASE_URL` comes only from `vercel env pull .env.vercel-prod --environment=production` (gitignored file; try the pull yourself once, it has worked from the agent as of 2026-07-07; if blocked, ask the user to run it). Prove the target before and after: `curl -s 'https://qaskills.sh/api/skills?limit=1'` and compare `total`.
5. **The wrong Vercel project.** Two projects exist: `qaskills.sh` (prj_rDKli4AyhHoXZXV8NHrs92Ncbf4f, org team_DGM6VSs6vhASlhktmHkSqPwn, account luckydutta96) owns the domain; `qaskills` (prj_KnB3Qp...) is a decoy without it. Rule: deploy only to `qaskills.sh`; in any fresh directory or worktree, pass `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` explicitly and never accept interactive link defaults.
6. **The working-tree deploy.** `vercel --prod` uploads the WORKING TREE, not HEAD; uncommitted WIP ships to production. Rule: if `git status --short` is non-empty, deploy from a throwaway `git worktree add <tmp> HEAD` instead (see `ship-prod` skill).
7. **The push-and-pray deploy.** `git push` to main does not reliably trigger Vercel. Rule: a change is "shipped" only after `npx vercel ls` shows the new deployment Ready AND the changed page was fetched live and shows the change.
8. **The git add -A.** Sweeps screenshots, side-project apps, and stray docs into a product commit. Rule: stage explicit paths, always.
9. **The stale shared build.** Editing `packages/shared`, then building or testing cli/web against the OLD dist. Rule: rebuild shared first, every time it changes.
10. **The two SKILL.md formats.** `seed-skills/*/SKILL.md` is the PRODUCT catalog schema (name, description, version, testingTypes, languages, Zod-validated). `.claude/skills/*/SKILL.md` are Claude Code workflow skills (name + description frontmatter). Rule: never validate one against the other's schema or copy fields across.
11. **The multi-line frontmatter.** YAML block lists (`- item`) or wrapped descriptions in a seed SKILL.md parse as EMPTY via seed.ts regex; the skill seeds with no tags/types. Rule: single-line values, inline arrays `[a, b, c]` only.
12. **The missing skill body.** Seed skill directory added with frontmatter-only SKILL.md; `fullDescription` is empty, the site page is bare, the CLI downloads a husk. Rule: every seed skill gets a real markdown body; it IS the product.
13. **The webhook assumption.** Code assumes every Clerk user has a DB row. Rule: go through `getAuthUser()`; it auto-creates missing rows.
14. **The Node 24 upgrade.** Neon driver breaks on Node 24. Rule: Node 20.x locally and in Vercel project settings; do not bump.
15. **The manual npm publish.** Rule: the CLI ships only via CI on `cli-v*` tags: bump `packages/cli/package.json`, commit, `git tag cli-v<version>`, `git push origin main --tags`. Never `npm publish` by hand, and tag pushes need explicit user approval.
16. **The quoted env value.** Exporting `DATABASE_URL` straight from `.env.local` keeps its double quotes and breaks connections (or worse, gets stored quoted via API). Rule: strip quotes when exporting; never wrap values in quotes when setting via the Vercel API.

## Quality bar per deliverable

Report each bar as checked or failed; never claim "done" with an unchecked bar.

**SEO article (each one):**
- [ ] Slug is kebab-case and `grep -rn "<slug>" packages/web/src/app/blog/posts/` returned nothing before creation
- [ ] `title` contains the target keyword; `description` 140-170 chars; `date` = today (YYYY-MM-DD); `category` is one of the nine listed above
- [ ] Content >= 1200 words; H1 equals title; >= 1 markdown table; code blocks (escaped backticks) for technical topics
- [ ] >= 2 internal links to existing `/blog/<slug>` posts, each target verified registered
- [ ] Zero em dashes (grep the file)
- [ ] Registered in both registries (`grep -c "'<slug>'" .../index.ts` == 2) and `pnpm --filter @qaskills/web build` passes
- [ ] After deploy: `curl -sI https://qaskills.sh/blog/<slug>` is 200 and the slug appears in `curl -s https://qaskills.sh/sitemap.xml`

**Seed skill (each one):**
- [ ] Validator passes: `node packages/skill-validator/dist/cli.js seed-skills/<slug>/SKILL.md`
- [ ] Frontmatter: single-line values, inline arrays, description 10-500 chars, version semver, testingTypes >= 1, languages >= 1, values drawn from `packages/shared/src/constants`
- [ ] Body is real instruction (roughly 100+ lines with code samples), modeled on `seed-skills/playwright-e2e/SKILL.md`
- [ ] Slug absent from `seed-skills/` and from live `/api/skills/<slug>` before creation
- [ ] Seeded against the VERIFIED prod DB; live `total` grew by exactly N; `/api/skills/<slug>/content` returns frontmatter + body

**Web code change:**
- [ ] `pnpm --filter @qaskills/shared build`, then web `lint`, `exec tsc --noEmit`, `build` all green
- [ ] No handlers/hooks in server components (inspect every changed component without `'use client'`)
- [ ] Any new env var is optional at build time (lazy init pattern), and the build passes with it unset
- [ ] User-visible changes verified rendered (dev server or live) and the summary says where

**CLI change:**
- [ ] `pnpm --filter @qaskills/cli test` green; `pnpm --filter @qaskills/cli build` then `node packages/cli/dist/index.js --help` runs
- [ ] Installer/detector changes exercised against a temp directory, never your real agent configs
- [ ] Release = version bump + tag flow only (mistake 15)

**Production deploy:** see `ship-prod` skill; its verification checklist is the bar.

**Commit:**
- [ ] Conventional prefix, imperative, subject <= 72 chars, no trailers/footers, no em dash
- [ ] `git diff --cached --stat` reviewed; every staged file belongs to the stated concern

## When uncertain: escalation rules

Resolution order:
1. **Repo first.** This file, `docs/`, `git log`, the code. Most questions are already answered here.
2. **Verify read-only against reality.** `curl` the live site/API, `npx vercel ls`, `git log`. Reads of production are always allowed and preferred over assumptions.
3. **Conflicting environment signals = hard stop.** If two sources disagree about a target (two DATABASE_URLs, two Vercel projects, two accounts), do not act on either. Report both values, your recommendation, and wait.
4. **Blocked twice on the same step = stop retrying.** Report the exact blocker and the exact command the user must run (e.g. `vercel env pull .env.vercel-prod --environment=production`, `vercel login`).

**Proceed without asking** (established patterns): writing articles, seed skills, and code; running builds/tests; committing those to `main`; deploying committed work via `ship-prod`; read-only curls of prod; re-running the upsert seeder against a verified prod URL.

**Ask first, always, even mid-flow:**
- Schema changes against prod (`db:push`, `db:migrate`, any DDL)
- Any prod SQL beyond the seed.ts upsert (UPDATE/DELETE/TRUNCATE, backfills)
- `npm publish` or pushing `cli-v*` tags
- Sending email, posting to any external platform (Product Hunt, social, GitHub issues/PRs on other repos), or anything visible outside qaskills.sh itself
- Changing Vercel project settings, env vars, or domains
- Deleting files you did not create this session; `rm -rf` anywhere in the repo; force push; history rewrites
- Anything that spends money

**Reporting:** lead with what happened; include the verification evidence (URL, command output); state failures as failures and skipped steps as skipped. Never bury a red check.

## Environment variables

**Web (required in prod):** `DATABASE_URL` (Neon), `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, `TYPESENSE_API_KEY/HOST/PORT/PROTOCOL`. Clerk keys optional (graceful degrade; currently NOT set in prod, so do not set only the publishable key). Email/cron: `RESEND_API_KEY`, `CRON_SECRET`, `UNSUBSCRIBE_SECRET` (falls back to `CRON_SECRET`), `NEXT_PUBLIC_POSTHOG_KEY`.
**CLI:** `QASKILLS_API_URL` overrides the API base (default `https://qaskills.sh`).
**Prod values** live in Vercel, pulled only by the user via `vercel env pull --environment=production`.

## CI/CD

- `cli-ci.yml`: shared build -> lint -> build -> test CLI (on `packages/cli/**` or `packages/shared/**`)
- `web-ci.yml`: shared build -> lint -> type-check -> build web (on `packages/web/**` or `packages/shared/**`)
- `cli-publish.yml`: npm publish on `cli-v*` tags
- Web deploys to Vercel project `qaskills.sh`; root `vercel.json` holds the build command; cron in `packages/web/vercel.json`. Auto-deploy on push is unreliable: `ship-prod` is the deploy path.
