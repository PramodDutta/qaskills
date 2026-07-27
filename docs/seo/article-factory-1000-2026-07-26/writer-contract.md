# Article Factory Writer Contract

Each writer owns one five-article batch at a time. The batch brief is the approved intent
boundary. Do not broaden it, replace its primary keyword, or introduce an unapproved source.

## Required Output

- Five individual `BlogPost` modules named from the approved slugs.
- One `_article-factory-1000-batch-NNN.ts` manifest with exactly those five posts.
- Publication date and updated date `2026-07-26`.
- Author identity remains the route-level site author, Pramod Dutta of The Testing Academy.

## Hard Gates

- Final rendered prose is 3,000 to 4,000 words, excluding code blocks.
- The opening is a direct 40 to 60 word answer and includes the exact primary keyword.
- The title starts with the primary keyword and stays within 60 emitted characters after
  ` | QASkills.sh` is appended.
- Meta description is 140 to 155 characters and contains the primary keyword.
- Use 8 to 12 H2 sections, at least three question-form H2s, and no H1 in the content body.
- Include every secondary keyword in an H2 or H3, one GFM comparison table, one numbered
  procedure, at least two real code examples, and 5 to 8 FAQ answers of 40 to 60 words.
- Primary keyword density is 1 to 3 percent. Average sentence length is 15 to 20 words.
  Flesch Reading Ease is 58 to 72. Readable paragraphs contain 2 to 4 sentences.
- Include 9 to 20 internal links, 3 to 5 links per 1,000 words, at least five unique routes,
  `/skills`, four related registered posts, and a route-backed conclusion CTA.
- Cite every approved HTTPS source in the prose and list no other external links.
- Cite every approved repository evidence path exactly in the prose.
- Do not invent product behavior, statistics, benchmarks, credentials, quotes, or outcomes.
- Use ASCII only. Do not use em dashes.
- Do not use `delve`, `in today's fast-paced world`, `game-changer`, `unleash`,
  `unlock the power`, `moreover`, `furthermore`, `it's important to note`,
  `in conclusion`, `landscape`, `elevate`, `seamless`, or `robust`.

## Batch Audit

Run from `packages/web` after formatting:

```bash
ARTICLE_FACTORY_INVENTORY=../../docs/seo/article-factory-250-2026-07-25/inventory.json \
ARTICLE_FACTORY_SELECTED=../../docs/seo/article-factory-1000-2026-07-26/selected.json \
ARTICLE_FACTORY_DATE=2026-07-26 \
ARTICLE_FACTORY_SCORECARDS=../../docs/seo/article-factory-1000-2026-07-26/batch-scorecards/batch-NNN.json \
node --import tsx seo-tools/audit-article-batch.mts \
src/app/blog/posts/_article-factory-1000-batch-NNN.ts 5
```

Revise every failure. A batch is complete only when the audit reports five articles and zero
failures. Writers do not edit the registry, aggregate manifests, shared tooling, tests, package
files, inventories, or another writer's batch.
