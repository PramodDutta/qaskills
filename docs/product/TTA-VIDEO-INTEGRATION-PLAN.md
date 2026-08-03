# TTA Video Integration Plan

2026-08-03. Bring The Testing Academy's YouTube library into qaskills.sh so a reader can watch the technique, not just read it.

## 0. The asset, verified

| Fact | Value | How verified |
|---|---|---|
| Channel | The Testing Academy | live page |
| Subscribers | **206k** | live page |
| Videos | **1.1k** | live page |
| Channel ID | `UC2TpiJFaC0f4_5GopyMkDdQ` | extracted from channel HTML |
| RSS feed | `https://www.youtube.com/feeds/videos.xml?channel_id=UC2TpiJFaC0f4_5GopyMkDdQ` | returns 15 entries with videoId, title, published date |

Recent uploads map almost perfectly onto the catalog: "Build Custom Automation Skills for Playwright & Selenium", "Playwright BDD Cucumber Masterclass", "Create Custom AI Skills with GitHub Copilot & Claude Code", "How to Test API Response via the Deepeval?", "How to Handle Flaky Test in Test Automation?". That is Playwright, BDD, DeepEval, Claude Code skills, and flaky tests: five of our strongest clusters.

**The one real constraint:** the RSS feed only exposes the **latest 15** videos. There is no way to enumerate all 1.1k without either the YouTube Data API (needs a Google API key, 10,000 quota units/day, `playlistItems.list` against the uploads playlist) or a one-time manual curation pass. Plan for both: RSS for freshness, a curated map for depth.

## 1. Why this is worth doing

Three compounding wins, in order of value:

1. **Retention and trust.** 1,419 blog posts currently end at text. A 206k-subscriber channel behind the same brand is proof the author actually does this work.
2. **SEO.** A page with an embedded video plus `VideoObject` structured data is eligible for video rich results and the Videos tab. We publish at ~2,400 URLs and rank at average position 7.4, so anything that lifts CTR compounds. Our CTR is 0.5%, which is the weakest number on the site.
3. **Cross-promotion both ways.** Site sends viewers to the channel; channel descriptions send viewers to skills. Both properties are yours.

## 2. Architecture

### 2.1 Data layer, two sources feeding one shape

```ts
// src/lib/videos/types.ts
export interface TTAVideo {
  id: string;            // YouTube video id
  title: string;
  publishedAt: string;   // ISO date
  topics: LeadTopic[];   // reuses the persona buckets from lib/lead-topics.ts
  skills?: string[];     // optional explicit skill slugs this video demonstrates
  blogSlugs?: string[];  // optional explicit blog slugs
}
```

**Source A, curated (`src/lib/videos/catalog.ts`).** A hand-checked list of the 40 to 60 videos worth surfacing, each tagged to skills and clusters. Static, in git, reviewable, zero runtime cost, no API key. This is the backbone.

**Source B, fresh (RSS).** A daily cron (`/api/cron/sync-videos`, matching the existing weekly-digest cron pattern) reads the RSS feed and records the latest 15 into a `videos` table. Powers a "Latest from the channel" strip so the site stays current without anyone editing code.

Ship A first. B is additive and can wait.

### 2.2 Matching a video to a page

Reuse `pickLeadTopic()` from `lib/lead-topics.ts`, already built and tested for lead capture. It maps page context to one of six persona buckets with narrower buckets winning.

Resolution order, most specific first:
1. Explicit `skills` or `blogSlugs` on the video (hand-tuned, always wins)
2. Keyword overlap between video title and the page title/slug
3. Persona bucket match via `pickLeadTopic()`
4. No confident match, render nothing

Rule: **never show a loosely related video.** A Playwright video on a Playwright page builds trust; a random video on an unrelated page burns it. Rendering nothing is a valid, preferred outcome, exactly how `pickLeadTopic` already returns null rather than guessing.

### 2.3 Embedding, performance-safe

Do **not** put a raw YouTube iframe on 1,419 blog posts. A standard embed pulls roughly 1MB+ of JS and wrecks LCP, and we have `lighthouse-performance` and `page-speed-critic` skills in the catalog, so shipping a slow page would be embarrassing.

Use a **facade**: render the poster image plus a play button; only inject the iframe on click.

```tsx
// src/components/video/lite-youtube.tsx  ('use client')
// Poster from https://i.ytimg.com/vi/<id>/hqdefault.jpg
// On click, swap in:
//   https://www.youtube-nocookie.com/embed/<id>?autoplay=1&rel=0
```

Specifics that matter:
- `youtube-nocookie.com` so no tracking cookie is set before consent
- Fixed aspect ratio wrapper (`aspect-video`) so there is zero layout shift
- `loading="lazy"` on the poster, `title` on the iframe for a11y
- Add `i.ytimg.com` to `next.config.js` `images.remotePatterns` (the file already has an allowlist for `img.clerk.com` and `avatars.githubusercontent.com`)

### 2.4 SEO: VideoObject JSON-LD

The site already emits Article and FAQPage JSON-LD via `lib/json-ld.ts` and `extract-faqs.ts`. Add a `VideoObject` block on any page carrying a video: `name`, `description`, `thumbnailUrl`, `uploadDate`, `embedUrl`, `contentUrl`. This is the piece that makes video rich results possible.

## 3. Placement, ranked by value

| # | Surface | What renders | Effort |
|---|---|---|---|
| 1 | **Skill detail** `/skills/[author]/[slug]` | "Watch this skill in action" facade above the markdown body | S |
| 2 | **Blog posts** | One matched video after the first H2, only on confident matches | S |
| 3 | **New `/learn` hub** | The curated library grouped by the six persona buckets, each video linked to its skills | M |
| 4 | **Roadmaps** `/roadmaps/[slug]` | Attach videos to existing roadmap steps, the most natural learning surface we already own | M |
| 5 | Homepage | Swap the single Loom demo for a "Latest from The Testing Academy" strip | S |

Start with 1 and 2. They touch the highest-traffic surfaces and reuse one component.

## 4. Build phases

**Phase 1, foundation (1 day).** `lib/videos/types.ts`, `catalog.ts` seeded with 20 videos, `lite-youtube.tsx` facade, `videoForPage()` resolver, `i.ytimg.com` in the image allowlist. Unit tests for the resolver mirroring `lead-topics.test.ts` (including the "returns nothing when unsure" case).

**Phase 2, placement (1 day).** Wire into skill detail pages and blog posts. Add `VideoObject` JSON-LD. Verify Core Web Vitals do not regress on a sample post.

**Phase 3, the hub (1 to 2 days).** Build `/learn`, grouped by persona bucket, cross-linked to skills and blog clusters. Add it to the sitemap and nav.

**Phase 4, freshness (1 day).** `videos` table, `/api/cron/sync-videos` reading RSS daily, "Latest from the channel" strip. Only worth doing after 1 to 3 prove out.

**Phase 5, curation depth (ongoing).** Expand the curated catalog from 20 to 60 videos. This is content work, not engineering, and is the real lever on coverage.

## 5. Risks and the honest limits

1. **RSS gives 15 videos, not 1,100.** Anything beyond the newest 15 must be curated by hand or fetched with a YouTube Data API key. Do not promise full-library coverage on day one.
2. **Performance.** Mitigated by the facade. Non-negotiable given the site's own performance content.
3. **Bad matches damage trust.** Mitigated by the render-nothing-when-unsure rule.
4. **Video titles drift from site vocabulary.** Shorts titled with hashtag soup ("#coding #programming") will not keyword-match. The explicit `skills`/`blogSlugs` fields exist for exactly this; prefer long-form videos over Shorts for embedding.
5. **Maintenance.** A curated catalog goes stale. Phase 4's cron is the answer, but until then someone must add new videos manually.

## 6. Decisions needed

1. **Curated-only, or also get a YouTube Data API key** so we can index all 1.1k videos?
2. **Start with placements 1 and 2** (skill pages plus blog) as recommended, or lead with the `/learn` hub?
3. **Replace the homepage Loom demo** with a TTA video strip, or keep both?
4. **Shorts:** include them anywhere, or long-form only? Recommendation: long-form only for in-page embeds, Shorts allowed on `/learn`.
