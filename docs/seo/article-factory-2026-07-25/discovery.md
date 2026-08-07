# Codebase Discovery Report

Date: 2026-07-25
Baseline commit: `2167f4556243d83f0d720250764d252973392268`

## Stack

- pnpm 9.15 monorepo coordinated by Turborepo
- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4
- Neon PostgreSQL with Drizzle ORM
- Typesense search, Upstash Redis cache, Clerk authentication, Resend email
- Vitest unit and integration tests plus Playwright browser tests
- Node 20 or newer

## Content System

- Content directory: `packages/web/src/app/blog/posts/`
- Article format: TypeScript modules exporting a `BlogPost` object
- Required metadata: `title`, `description`, `date`, `updated`, `category`, `content`
- Factory metadata: `primaryKeyword`, `keywords`, `relatedSlugs`, `sources`
- URL pattern: `https://qaskills.sh/blog/<slug>`
- Sitemap: `packages/web/src/app/sitemap.ts`
- Blog route: `packages/web/src/app/blog/[slug]/page.tsx`
- Registry: `packages/web/src/app/blog/posts/index.ts`
- Registration contract: add the post to both the detail `posts` map and the `postList` array
- Author identity: Pramod Dutta, The Testing Academy
- Structured data: the route emits `BlogPosting`, `FAQPage`, and `BreadcrumbList`

## Existing Inventory

The read-only inventory imported both blog registries and parsed literal sitemap routes.

- Registered posts: 1,466
- Registered list entries: 1,466
- Registry agreement: yes
- Static sitemap routes: 37
- Total inventory records: 1,503
- Seed skill directories: 413
- Scratch inventory: `/tmp/qaskills-seo-inventory-20260725.json`
- Scratch candidate audit: `/tmp/qaskills-seo-collision-results-20260725.json`

## Source Areas Mined

- CLI resolution, downloading, extraction, installation, initialization, and telemetry
- Clerk webhook synchronization and just-in-time database provisioning
- HMAC unsubscribe tokens, Resend initialization, and partial email delivery
- Neon lazy initialization, Typesense facets, PostgreSQL JSONB filters, caching, and artifacts
- Markdown sanitization, SKILL.md parsing, validation, and catalog regression
- MCP timeouts, schema drift, response projection, and package version manifests

## Publication Mechanics

Each thematic batch has a five-post manifest. A single aggregate manifest is imported by
`posts/index.ts`, then spread into both registries. The existing blog route supplies the page H1,
canonical URL, source list, author identity, dates, and all three JSON-LD graphs.

The dedicated publication test enforces the 3,000 to 4,000 code-excluded body range, title and
meta limits, answer-first structure, keyword placement, headings, FAQ extraction, tables,
procedures, code, links, source hosts, ASCII punctuation, collision rules, readability, and
cross-article prose originality.
