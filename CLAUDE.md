# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QASkills.sh is a QA skills directory for AI coding agents. It's a pnpm monorepo (pnpm 9.15.0, Node >= 20) using Turborepo for orchestration.

## Common Commands

```bash
pnpm install                  # Install all dependencies
pnpm build                    # Build all packages (Turbo, respects dependency graph)
pnpm dev                      # Dev servers for all packages
pnpm test                     # Run tests across all packages (vitest)
pnpm lint                     # Lint all packages
pnpm format                   # Format with Prettier
pnpm format:check             # Check formatting

# Run a single package
pnpm --filter @qaskills/cli test
pnpm --filter @qaskills/web dev
pnpm --filter @qaskills/shared build

# Database (proxied to @qaskills/web)
pnpm db:push                  # Push schema to Neon Postgres
pnpm db:migrate               # Run Drizzle migrations
pnpm db:seed                  # Seed 20 initial skills
pnpm db:studio                # Open Drizzle Studio
```

**Build order matters:** `@qaskills/shared` must build before packages that depend on it (cli, sdk, web, skill-validator). Turbo handles this via `"dependsOn": ["^build"]`.

## Monorepo Layout

| Package | Path | Purpose |
|---|---|---|
| `@qaskills/shared` | `packages/shared` | Types, constants, Zod schemas, SKILL.md parser (private, dependency of all others) |
| `@qaskills/cli` | `packages/cli` | CLI tool — `qaskills add/search/init/list/remove/publish` (Commander.js + @clack/prompts) |
| `@qaskills/sdk` | `packages/sdk` | Programmatic TypeScript SDK |
| `@qaskills/skill-validator` | `packages/skill-validator` | Validates SKILL.md files against schema |
| `@qaskills/web` | `packages/web` | Next.js 15 App Router dashboard + API |
| (standalone) | `landingpage/` | Separate Next.js 16 marketing site (not in pnpm workspace) |
| (data) | `seed-skills/` | 20 seed QA skill definitions as SKILL.md files |

## Architecture

### Shared Package (`packages/shared`)
The single source of truth for the type system. All other packages depend on it.
- **Types:** `src/types/` — Skill, Agent, User, Review, Category, Pack
- **Constants:** `src/constants/` — 30+ agent definitions (with config file paths), testing frameworks, languages, domains, testing types
- **Schemas:** `src/schemas/` — Zod validation for skill frontmatter, skill creation, search params
- **Parsers:** `src/parsers/skill-parser.ts` — Uses gray-matter to parse SKILL.md YAML frontmatter + markdown body
- **Utils:** `src/utils/` — Slug generation, quality score calculation

### Web App (`packages/web`)
Next.js 15 with App Router, React 19, TailwindCSS v4, shadcn/ui (Radix primitives).

**Stack:** Neon Postgres (Drizzle ORM) / Typesense (search) / Upstash Redis (cache) / Clerk (auth) / PostHog (analytics)

**Key patterns:**
- Database uses a lazy Proxy in `src/db/index.ts` — initialized on first access, not at import time
- Clerk middleware is dynamically imported and only activated when env vars are set (`src/middleware.ts`), preventing SSR crashes without credentials
- Protected routes: `/dashboard(.*)`, `/api/skills/create(.*)`
- Drizzle schema lives in `src/db/schema/`, migrations in `src/db/migrations/`
- Drizzle config: `drizzle.config.ts` at package root

**API routes:** `src/app/api/` — skills (CRUD + search/sort/pagination), categories, leaderboard, telemetry/install

### CLI (`packages/cli`)
- `src/commands/` — One file per command (add, search, init, list, remove, update, info, publish)
- `src/lib/agent-detector.ts` — Detects 30+ AI agents by checking for config file paths
- `src/lib/installer.ts` — Downloads and installs skills to agent config directories
- `src/lib/api-client.ts` — HTTP client for qaskills.sh API
- Built with tsup (CJS output)

### Skill Type Flow
```
SKILL.md YAML frontmatter → SkillFrontmatter (parsed) → SkillCreate (Zod-validated) → DB row → Skill/SkillSummary (API response)
```

## SKILL.md Format
Each skill is a markdown file with YAML frontmatter. See `seed-skills/*/SKILL.md` for examples. Validated by `@qaskills/shared` Zod schemas — fields include: name, description, version (semver), author, tags, testingTypes, frameworks, languages, domains, agents.

## Code Style
- Prettier: single quotes, semicolons, 100 char width, trailing commas, LF endings
- TypeScript strict mode across all packages
- Web app uses `next dev --turbopack` for development

## Environment Variables
The web app requires: `DATABASE_URL` (Neon), `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, `TYPESENSE_API_KEY` + `TYPESENSE_HOST` + `TYPESENSE_PORT` + `TYPESENSE_PROTOCOL`. See `packages/web/.env.example` if it exists. The app gracefully degrades when Clerk keys are missing.

## CI/CD
- **cli-ci.yml:** Builds shared → lints → builds → tests CLI (on changes to `packages/cli/**` or `packages/shared/**`)
- **web-ci.yml:** Builds shared → lints → builds web (on changes to `packages/web/**` or `packages/shared/**`)
- **cli-publish.yml:** Publishes CLI to npm on `cli-v*` tags
- Web deploys to Vercel (project: qaskills.sh)
