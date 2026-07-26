# Codebase Discovery Report

Date: 2026-07-25
Baseline commit: `c3f9211`

## Stack

- pnpm 9.15 monorepo coordinated by Turborepo
- Next.js 15 App Router, React 19, TypeScript, and Tailwind CSS 4
- Neon PostgreSQL with Drizzle ORM
- Typesense search, Upstash Redis cache, Clerk authentication, and Resend email
- Vitest unit and integration tests plus Playwright browser tests
- Node 20 or newer

## Content System

- Content directory: `packages/web/src/app/blog/posts/`
- Article format: TypeScript modules exporting a `BlogPost` object
- Required metadata: `title`, `description`, `date`, `updated`, `category`, and `content`
- Factory metadata: `primaryKeyword`, `keywords`, `relatedSlugs`, and `sources`
- URL pattern: `https://qaskills.sh/blog/<slug>`
- Sitemap: `packages/web/src/app/sitemap.ts`
- Blog route: `packages/web/src/app/blog/[slug]/page.tsx`
- Registry: `packages/web/src/app/blog/posts/index.ts`
- Registration contract: add every post to both the detail `posts` map and `postList`
- Author identity: Pramod Dutta, The Testing Academy
- Structured data: the route emits `BlogPosting`, `FAQPage`, and `BreadcrumbList`

## Existing Inventory

The baseline inventory imports both blog registries and parses literal sitemap routes.

- Registered blog posts: 1,491
- Registered list entries: 1,491
- Registry agreement: yes
- Static sitemap routes: 37
- Total inventory records: 1,528
- Seed skill directories: 413
- Baseline scratch inventory: `/tmp/qaskills-seo-final-inventory-20260725.json`

## Source Areas

- QASkills CLI, SDK, agent detection, package delivery, and telemetry
- Next.js APIs, Clerk synchronization, Resend email, webhooks, and request security
- Neon, Drizzle, Typesense, Upstash, ranking, reviews, installs, and artifact delivery
- SKILL.md parsing, YAML normalization, validation, provenance, and static analysis
- MCP servers, clients, tools, schemas, transports, package manifests, and QA agents
- Playwright browser automation, debugging, evidence, CI, and agent-driven workflows
- LLM evaluation, RAG, prompt security, model drift, tool calling, and guardrails
- Test frameworks, API testing, accessibility, security, performance, mobile, and CI

## Publication Mechanics

Each writing batch contains five article modules and one manifest. One aggregate manifest is
imported by `posts/index.ts` and spread into both registries. The route supplies the page H1,
canonical URL, source list, author identity, dates, and all required JSON-LD graphs.

The shared publication gate measures code-excluded body words, title and meta limits,
answer-first structure, keyword placement, headings, FAQs, tables, procedures, code examples,
links, source hosts, punctuation, collisions, readability, and cross-article originality.
