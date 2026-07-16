---
name: publish-seo-batch
description: Use when publishing SEO blog articles to qaskills.sh, e.g. "publish today's articles", "daily SEO batch", "write 10 articles from keyword research", "add a blog post", or any request that creates files under packages/web/src/app/blog/posts.
---

# Publish SEO Batch

The daily content pipeline: source topics -> dedup slugs -> write posts -> register -> build -> commit -> deploy -> prove live -> ping IndexNow. Default batch size is 10 unless the user says otherwise. Every step has a check; a batch is not "published" until step 8 passes, then step 9 nudges the search engines.

## Step 0: State check

```bash
git -C /Users/promode/qaskills status --short   # note pre-existing WIP; you will NOT stage it
date +%F                                        # today's date, used in every post and the commit message
```

Pre-existing modified/untracked files are the user's WIP. Leave them alone.

## Step 1: Source topics

Saved GSC reports in `docs/seo/KEYWORD-OPPORTUNITIES-*.md` are historical and fully published; do not source topics from them. Instead:

1. If the user supplied topics or keywords, use those.
2. Otherwise WebSearch for net-new opportunities in the site's clusters: Playwright (releases, features, integrations), LLM evaluation (DeepEval, Ragas, promptfoo, Langfuse), API testing, load testing, AI test generation, agentic testing, CI/CD. Favor high-intent long-tail: "X vs Y 2026", "how to X", tool + new-version guides, fresh industry reports.
3. Cross-check each candidate against existing coverage (step 2). Prefer gaps over rewrites.
4. If the research produced a reusable keyword dataset, save it as `docs/seo/KEYWORD-OPPORTUNITIES-YYYY-MM.md` and include it in the commit.

## Step 2: Dedup every slug (MANDATORY before writing any file)

Batch arrays are spread into the registries LAST, so a colliding slug silently replaces a real article. This has shipped a stub over a full article before.

```bash
cd /Users/promode/qaskills
for s in slug-one slug-two; do
  hits=$(grep -rn "$s" packages/web/src/app/blog/posts/ | grep -v "$s-something-longer" | wc -l)
  echo "$s: $hits hits"
done
```

Any hit (filename, `posts` map key, `postList` entry, batch array entry): choose a different slug or drop the topic. Also scan titles in `posts/index.ts` for near-duplicate topics; a second article on the same query cannibalizes the first.

## Step 3: Write each post

File: `packages/web/src/app/blog/posts/<slug>.ts`

```ts
import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Primary Keyword In Natural Title',
  description: 'Meta description, 140-170 chars, contains the keyword, states the payoff.',
  date: 'YYYY-MM-DD',            // today
  category: 'Guide',             // Guide | Reference | Tutorial | Comparison | AI Testing | API Testing | Migration | BDD | Performance
  content: `
# Same Title As Above

Opening paragraphs that answer the query directly...
`,
};
```

Per-article bar (all required):
- Content >= 1200 words; H1 equals `title`
- At least one markdown table (comparison, metrics, or reference)
- Code blocks for technical topics; ESCAPE backticks inside the template literal (\\\`\\\`\\\`)
- At least 2 internal links to existing posts (`/blog/<existing-slug>`); verify each target exists in `posts/index.ts` before linking
- No em dashes anywhere; no invented statistics (attribute figures or mark them approximate)
- No `${` in prose unless intentionally interpolating; escape as \\${ if literal
- End with a `## Frequently Asked Questions` section (3-4 `### Question?` H3s with short answers) as the LAST H2. It counts toward the word bar and `src/lib/extract-faqs.ts` turns it into FAQPage JSON-LD for AI-search citation. Without it, articles tend to land short of 1200 words.

## Step 4: Register in BOTH registries

`packages/web/src/app/blog/posts/index.ts` needs three edits per post:
1. Import: `import { post as camelCaseName } from './<slug>';` (with the other imports)
2. `posts` map entry: `'<slug>': camelCaseName,` placed BEFORE the batch `...Object.fromEntries` spreads
3. `postList` entry: `{ slug: '<slug>', ...camelCaseName },` placed before the batch spreads at the end

Missing 1 or 2 = the page 404s. Missing 3 = invisible on /blog and absent from the sitemap. Do not touch `sitemap.ts`; it derives from `postList`.

## Step 5: Verify locally (do not skip)

```bash
cd /Users/promode/qaskills
# exactly 2 quoted occurrences per slug in index.ts (map key + postList)
for s in slug-one slug-two; do
  c=$(grep -c "'$s'" packages/web/src/app/blog/posts/index.ts)
  [ "$c" -eq 2 ] || echo "REGISTRATION WRONG: $s count=$c"
done
# no em dashes in the new files
grep -l '—' packages/web/src/app/blog/posts/<each-new-slug>.ts && echo "EM DASH FOUND"
# build must pass
pnpm --filter @qaskills/shared build && pnpm --filter @qaskills/web build
```

Fix and re-run until all three are clean. Build failure in a post file is almost always an unescaped backtick or `${` in the template literal.

## Step 6: Commit

```bash
git -C /Users/promode/qaskills add \
  packages/web/src/app/blog/posts/<slug-one>.ts \
  packages/web/src/app/blog/posts/<slug-two>.ts \
  packages/web/src/app/blog/posts/index.ts
git -C /Users/promode/qaskills diff --cached --stat   # only your files
git -C /Users/promode/qaskills commit -m "feat: publish 10 SEO articles (YYYY-MM-DD) from keyword research"
git -C /Users/promode/qaskills push origin main
```

Explicit paths only. No trailers, no footers, no em dash in the message.

## Step 7: Deploy

**REQUIRED SUB-SKILL:** ship-prod. Follow it exactly (worktree if the tree is dirty, explicit project IDs, its verification checklist).

## Step 8: Prove it live

```bash
for s in slug-one slug-two; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://qaskills.sh/blog/$s")
  echo "$s: $code"
done
curl -s https://qaskills.sh/sitemap.xml | grep -c '<one-new-slug>'   # >= 1
```

Every slug must return 200 and appear in the sitemap. Report the checked URLs in the final summary.

## Step 9: Ping IndexNow (Bing + Yandex + Naver + Seznam)

After the new slugs are confirmed live (step 8), notify IndexNow so Bing and the other participating engines crawl them fast. Submit only the NEW slugs, not the whole sitemap. The verification key file is already hosted at `https://qaskills.sh/f1e4781767e4472e9061ad0f853449d3.txt` (committed in `packages/web/public/`); do not regenerate it.

```bash
# Build the payload from just this batch's new slugs
python3 - "$@" <<'PY'
import json, sys
slugs = ["slug-one", "slug-two"]  # replace with this batch's new slugs
urls = [f"https://qaskills.sh/blog/{s}" for s in slugs]
json.dump({
  "host": "qaskills.sh",
  "key": "f1e4781767e4472e9061ad0f853449d3",
  "keyLocation": "https://qaskills.sh/f1e4781767e4472e9061ad0f853449d3.txt",
  "urlList": urls,
}, open("/tmp/indexnow-batch.json", "w"))
print("urls:", len(urls))
PY
curl -s -o /dev/null -w 'Bing IndexNow: %{http_code}\n' -X POST 'https://www.bing.com/indexnow' \
  -H 'Content-Type: application/json; charset=utf-8' --data @/tmp/indexnow-batch.json
curl -s -o /dev/null -w 'IndexNow.org: %{http_code}\n' -X POST 'https://api.indexnow.org/indexnow' \
  -H 'Content-Type: application/json; charset=utf-8' --data @/tmp/indexnow-batch.json
```

200 or 202 means accepted. A 403 `SiteVerificationNotCompleted` means the key file was not reachable; confirm the txt URL returns the bare key as `text/plain` and retry. This is a fire-and-forget hint, not a gate: a non-200 here does not un-publish the batch, but report it. Google is not an IndexNow participant; it discovers the posts through the sitemap and `robots.txt` as before.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Build: `Unexpected token` / template error in a post | Unescaped backtick or `${` in content | Escape as \\\` and \\${ |
| Article 404 live | Missing `posts` map entry, or deploy did not actually run | Step 5 count check, then re-run ship-prod verification |
| Article absent from /blog and sitemap | Missing `postList` entry | Add it, rebuild, redeploy |
| An OLD article changed content | New slug collided with a batch-array slug | Rename the new slug, restore, redeploy |
| Sitemap grep = 0 but page is 200 | Deployed stale HEAD or sitemap cached | Confirm commit is in HEAD, redeploy, re-check |

## Red flags: stop and restart the step

- Writing a post file before running the step 2 grep
- "The slug is probably unique"
- `git add -A` or staging files you did not create
- Skipping the build because "it's just content"
- Reporting done without step 8 output in hand
