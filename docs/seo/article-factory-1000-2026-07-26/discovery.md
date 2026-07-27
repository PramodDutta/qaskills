# Discovery Report

Date: 2026-07-26

| Item | Finding |
|---|---|
| Stack | pnpm 9 monorepo, Turborepo, TypeScript, Next.js 15 App Router, React 19 |
| Content directory | `packages/web/src/app/blog/posts` |
| Article format | TypeScript `BlogPost` modules with metadata, Markdown content, sources, and repository evidence |
| URL pattern | `https://qaskills.sh/blog/<slug>` |
| Registry | `packages/web/src/app/blog/posts/index.ts` |
| Sitemap | `packages/web/src/app/sitemap.ts`, generated from `postList` |
| Author | Pramod Dutta, The Testing Academy |
| Baseline inventory | 1,778 routes and articles after the verified 250-article checkpoint |
| Extension | 750 posts in 150 five-article batches, producing 1,000 campaign articles total |

New modules are imported by a batch manifest, aggregated by the extension manifest, and
registered once in the blog index. The detail route emits BlogPosting, FAQPage, and
BreadcrumbList JSON-LD from the registered post.
