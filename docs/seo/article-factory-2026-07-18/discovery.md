# SEO Article Factory Discovery Report

Date: 2026-07-18

## Application map

| Item              | Repository evidence                                                         |
| ----------------- | --------------------------------------------------------------------------- |
| Stack             | Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, pnpm, Turborepo  |
| Content directory | `packages/web/src/app/blog/posts/`                                          |
| Post format       | TypeScript modules exporting a `BlogPost` object with Markdown in `content` |
| Required fields   | `title`, `description`, `date`, `category`, `content`                       |
| SEO fields        | `updated`, `primaryKeyword`, `keywords`, `relatedSlugs`, `sources`          |
| Public URL        | `https://qaskills.sh/blog/<slug>`                                           |
| Detail registry   | `posts` in `packages/web/src/app/blog/posts/index.ts`                       |
| Listing registry  | `postList` in `packages/web/src/app/blog/posts/index.ts`                    |
| Sitemap           | `packages/web/src/app/sitemap.ts`, derived from `postList`                  |
| Structured data   | BlogPosting, FAQPage, and BreadcrumbList are emitted by the blog route      |
| Author identity   | Pramod Dutta, The Testing Academy, from the site's JSON-LD configuration    |

## Inventory result

The executable blog registry contained 1,441 unique entries before this batch. The collision audit evaluated slug, title, declared primary keyword, and search intent. The scratch inventory is stored at `/tmp/qaskills-seo-inventory.json` and is intentionally not committed because it duplicates the runtime registry.

The final queue is based on these repository sources:

- `seed-skills/ai-release-guardian/SKILL.md`
- `seed-skills/ai-release-guardian/references/gate-config-and-report-schema.md`
- `seed-skills/secure-test-data-engineer/SKILL.md`
- `seed-skills/secure-test-data-engineer/references/schema-to-data-mapping.md`

## Registration decision

Each article is a standalone post module. Five batch manifests group related posts, and one aggregate manifest registers all 25 posts in both `posts` and `postList`. This keeps detail routes, blog pagination, sitemap generation, internal links, and metadata synchronized.

The batch has a dedicated Vitest publication gate and Playwright post-flow coverage. Existing content is not forced through the new 3,000 to 4,000 word policy retroactively.
