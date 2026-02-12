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

# Run tests in watch mode
pnpm --filter @qaskills/cli test:watch

# Database (proxied to @qaskills/web)
pnpm db:push                  # Push schema to Neon Postgres (dev)
pnpm db:migrate               # Run Drizzle migrations (prod)
pnpm db:seed                  # Seed 20 initial skills (tsx src/db/seed.ts)
pnpm db:studio                # Open Drizzle Studio

# CLI testing after build
node packages/cli/dist/index.js <command>
```

**Build order matters:** `@qaskills/shared` must build before packages that depend on it (cli, sdk, web, skill-validator). Turbo handles this via `"dependsOn": ["^build"]`. After changing shared, rebuild it before restarting dependent dev servers.

## Monorepo Layout

| Package | Path | Purpose |
|---|---|---|
| `@qaskills/shared` | `packages/shared` | Types, constants, Zod schemas, SKILL.md parser (private, dependency of all others) |
| `@qaskills/cli` | `packages/cli` | CLI tool — `qaskills add/search/init/list/remove/publish` (Commander.js + @clack/prompts) |
| `@qaskills/sdk` | `packages/sdk` | Programmatic TypeScript SDK |
| `@qaskills/skill-validator` | `packages/skill-validator` | Validates SKILL.md files against schema |
| `@qaskills/web` | `packages/web` | Next.js 15 App Router dashboard + API |
| (standalone) | `landingpage/` | Separate Next.js 16 marketing site (**not** in pnpm workspace) |
| (data) | `seed-skills/` | 20 seed QA skill definitions as SKILL.md files |

## Architecture

### Shared Package (`packages/shared`)
The single source of truth for the type system. All other packages depend on it.
- **Types:** `src/types/` — Skill, SkillSummary, SkillFrontmatter, Agent, User, Review, Category, SkillPack
- **Constants:** `src/constants/` — 30+ AgentDefinition objects (each with `configDir`, `skillsDir`, `configFile`, `installMethod`), testing frameworks, languages, domains, testing types
- **Schemas:** `src/schemas/` — Zod validation for skill frontmatter, skill creation, search params
- **Parsers:** `src/parsers/skill-parser.ts` — `parseSkillMd()` / `serializeSkillMd()` using gray-matter for YAML frontmatter + markdown body
- **Utils:** `src/utils/` — Slug generation, quality score calculation

### Web App (`packages/web`)
Next.js 15 with App Router, React 19, TailwindCSS v4, shadcn/ui (Radix primitives).

**Stack:** Neon Postgres (Drizzle ORM) / Typesense (search) / Upstash Redis (cache) / Clerk (auth) / PostHog (analytics) / Resend (email)

#### Lazy Initialization Pattern
Both the database and Resend email client use lazy singletons to avoid build-time errors on Vercel:
- **Database** (`src/db/index.ts`): `db` is a Proxy that calls `getDb()` on first property access — connection created at runtime, not import time
- **Resend** (`src/lib/email/client.ts`): `getResendClient()` lazy singleton, exported via property getters for backward compat

#### Auth Pattern
- **Middleware** (`src/middleware.ts`): Clerk middleware protects routes via `createRouteMatcher`
- **Protected routes:** `/dashboard(.*)`, `/api/skills/create(.*)`, `/api/reviews(.*)`
- **Public webhooks:** `/api/webhooks(.*)` bypasses auth entirely
- **API auth helper** (`src/lib/api-auth.ts`): `getAuthUser()` fetches the authenticated Clerk user, then looks up/auto-creates the DB row if missing (handles missed webhooks via `onConflictDoNothing`)

#### Server/Client Component Split (Key Pattern)
This is a critical pattern used throughout the app to avoid RSC errors:
- **Server components** fetch data and pass serializable props to client components
- **Client components** (`'use client'`) handle interactivity, `useAuth()`, `onClick`, PostHog tracking
- **Icons as string keys**: When server components render lists that need client interactivity, icon names are passed as strings and mapped to Lucide components in the client component (e.g., `FilterTabs`, `PacksGrid`)
- **SignupGate** (`src/components/auth/signup-gate.tsx`): Client component wrapping content behind Clerk login — used for packs gating, install buttons

**DO NOT add `onClick` or other event handlers in server components — this causes 500 errors in production.**

#### Email System (`src/lib/email/`)
- `client.ts` — Lazy Resend singleton, `FROM_EMAIL` constant
- `send.ts` — `sendWelcomeEmail()`, `sendNewSkillAlert()`, `sendWeeklyDigest()`, `buildUnsubscribeUrl()`
- `unsubscribe-token.ts` — HMAC-SHA256 signed tokens (`base64url(userId:timestamp).base64url(signature)`), 30-day expiry, timing-safe comparison. Uses `UNSUBSCRIBE_SECRET` or falls back to `CRON_SECRET`
- Email templates in `src/components/emails/` (React Email): `welcome.tsx`, `new-skill-alert.tsx`, `weekly-digest.tsx` — all include signed unsubscribe URLs

#### API Routes (`src/app/api/`)
- `GET /api/skills` — List/search with pagination, JSONB array filtering (`@>` operator), sorting (trending/newest/quality/popular)
- `POST /api/skills` — Publish skill (auth required), sends non-blocking new-skill-alert emails in batches
- `GET/PATCH /api/user/preferences` — Email notification preferences
- `POST /api/unsubscribe` — Token-based unsubscribe (no auth required, CAN-SPAM compliance)
- `POST /api/webhooks/clerk` — User created/updated events → DB insert + welcome email
- `POST /api/cron/weekly-digest` — Vercel Cron (Mondays 9 AM UTC, configured in `vercel.json`), requires `CRON_SECRET` header
- Also: `/api/skills/[id]`, `/api/categories`, `/api/reviews`, `/api/leaderboard`, `/api/telemetry/install`

#### Database Schema (`src/db/schema/`)
- **Core tables:** `users`, `userPreferences`, `skills`, `categories`
- **Junction tables:** `skillCategories`, `agentCompatibility`, `installs`, `reviews`, `skillPacks`, `skillPackItems`
- **JSONB arrays on skills:** `tags`, `testingTypes`, `frameworks`, `languages`, `domains`, `agents` — filtered with PostgreSQL `@>` contains operator
- **Drizzle config:** `drizzle.config.ts` at package root, migrations in `src/db/migrations/`

### CLI (`packages/cli`)
- `src/commands/` — One file per command (add, search, init, list, remove, update, info, publish)
- `src/lib/agent-detector.ts` — Probes 30+ AI agent config paths, returns `DetectedAgent[]` with global vs project scope
- `src/lib/installer.ts` — `resolveSkill()` determines source (registry/github/local), `downloadSkill()` fetches content
- `src/lib/api-client.ts` — HTTP client with 10s timeout, base URL `QASKILLS_API_URL || 'https://qaskills.sh'`
- `src/lib/telemetry.ts` — Non-blocking install event tracking
- Built with tsup: CJS output, `noExternal: ['@qaskills/shared']` bundles shared into CLI dist, shebang banner for direct execution

### Skill Type Flow
```
SKILL.md YAML frontmatter → SkillFrontmatter (parsed) → SkillCreate (Zod-validated) → DB row → Skill/SkillSummary (API response)
```

## SKILL.md Format
Each skill is a markdown file with YAML frontmatter. See `seed-skills/*/SKILL.md` for examples. Validated by `@qaskills/shared` Zod schemas — fields include: name (1-100 chars), description (10-500 chars), version (semver), author, tags, testingTypes (required, >= 1), frameworks, languages (required, >= 1), domains, agents.

## Code Style
- Prettier: single quotes, semicolons, 2-space indent, 100 char width, trailing commas, LF endings
- TypeScript strict mode across all packages
- Web app uses `next dev --turbopack` for development

## Environment Variables

**Web app required:**
- `DATABASE_URL` — Neon Postgres connection string
- `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Auth (app gracefully degrades when missing)
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — Cache
- `TYPESENSE_API_KEY` + `TYPESENSE_HOST` + `TYPESENSE_PORT` + `TYPESENSE_PROTOCOL` — Search

**Email & cron (production):**
- `RESEND_API_KEY` — Email sending
- `CRON_SECRET` — Vercel Cron auth header
- `UNSUBSCRIBE_SECRET` — HMAC signing for unsubscribe tokens (falls back to `CRON_SECRET`)
- `NEXT_PUBLIC_POSTHOG_KEY` — PostHog analytics

**CLI:**
- `QASKILLS_API_URL` — Override API base URL (defaults to `https://qaskills.sh`)

## CI/CD
- **cli-ci.yml:** Builds shared → lints → builds → tests CLI (triggers on `packages/cli/**` or `packages/shared/**`)
- **web-ci.yml:** Builds shared → lints → type-checks → builds web (triggers on `packages/web/**` or `packages/shared/**`)
- **cli-publish.yml:** Publishes CLI to npm on `cli-v*` tags
- Web deploys to Vercel (project: qaskills.sh). Vercel Cron configured in `packages/web/vercel.json`

## Known Gotchas
- `git push` to main sometimes doesn't trigger Vercel auto-deploy — use `vercel --prod` as fallback
- Adding `onClick` or event handlers in server components causes 500 errors in production (Next.js RSC constraint)
- The `getAuthUser()` helper auto-creates DB rows for Clerk users not yet in the database — don't assume all users come through the webhook
- Resend client uses a placeholder API key during build to avoid errors — real key is only needed at runtime
