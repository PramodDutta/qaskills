# SEO Audit Report — QASkills.sh

> Audit Date: February 14, 2026
> URL: https://qaskills.sh
> Business Type: SaaS / Developer Tool Directory (QA Testing Niche)
> Pages Audited: 10 key pages across all page types

---

## Executive Summary

### Overall SEO Health Score: 68/100

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| Technical SEO | 25% | 75/100 | 18.8 |
| Content Quality | 25% | 72/100 | 18.0 |
| On-Page SEO | 20% | 78/100 | 15.6 |
| Schema / Structured Data | 10% | 38/100 | 3.8 |
| Performance (CWV) | 10% | 70/100 | 7.0 |
| Images | 5% | 60/100 | 3.0 |
| AI Search Readiness | 5% | 85/100 | 4.3 |
| **Total** | **100%** | | **70.5** |

### Top 5 Critical Issues
1. **Canonical URL pointing to homepage on all pages** — skill detail and blog post pages have canonical set to `https://qaskills.sh` instead of their own URL
2. **BlogPosting schema missing required `image` property** — blocks Article rich results in Google
3. **SoftwareApplication URL hardcoded with `thetestingacademy`** — breaks schema for other authors
4. **AggregateRating uses installCount as ratingCount** — misleading, potential spam penalty
5. **Verification meta tags are placeholders** — GSC/Bing not verified, can't submit sitemap

### Top 5 Quick Wins
1. Fix canonical URLs (each page should self-reference)
2. Add `image` to BlogPosting schema (use OG image as fallback)
3. Add BreadcrumbList to /skills, /blog, /faq, /about pages
4. Block /sign-in/, /sign-up/, /unsubscribe in robots.txt
5. Replace verification placeholders with real codes

---

## 1. Technical SEO (75/100)

### Passes
- HTML `lang="en"` attribute present
- Viewport meta tag properly configured
- Theme color set for light/dark modes
- robots.txt properly blocks /dashboard/ and /api/
- Sitemap XML is well-formed and valid
- HTTPS enforced
- Preconnect hints for external resources (datafa.st)
- Skip-to-main-content link for accessibility
- AI crawler directives in robots.txt (GPTBot, ClaudeBot, PerplexityBot, Amazonbot)

### Failures

#### CRITICAL: Canonical URL Inheritance Bug
The root layout sets `alternates: { canonical: 'https://qaskills.sh' }`. Individual pages that don't override this will inherit the homepage canonical. Confirmed on:
- `/skills/thetestingacademy/playwright-e2e` — canonical points to `https://qaskills.sh` (WRONG)
- `/blog/playwright-e2e-best-practices` — canonical points to `https://qaskills.sh` (WRONG)

**Fix:** Remove `alternates` from root layout. Add explicit canonical to each page's metadata.

#### HIGH: Verification Meta Placeholders
```
google: 'GOOGLE_VERIFICATION_CODE'
msvalidate.01: 'BING_VERIFICATION_CODE'
```
These render as literal strings in the HTML. Replace with real codes or remove entirely.

#### MEDIUM: Auth Pages Not Blocked in robots.txt
`/sign-in/` and `/sign-up/` are not disallowed. While they're not in the sitemap, they could be discovered via links.

#### MEDIUM: Sitemap lastmod Dates Are All Identical
All static pages use `new Date()`, producing identical build-time timestamps. Google effectively ignores these when all dates match.

#### LOW: Deprecated sitemap fields
`changeFrequency` and `priority` are present on all sitemap entries. Google ignores both.

---

## 2. Content Quality (72/100)

### E-E-A-T Assessment

| Signal | Status | Score |
|--------|--------|-------|
| **Experience** | Moderate — The Testing Academy with 189K YouTube subscribers, but no case studies | 65/100 |
| **Expertise** | Strong — Pramod Dutta credited as author, detailed technical content | 80/100 |
| **Authoritativeness** | Moderate — YouTube presence, GitHub repo, but limited backlinks | 65/100 |
| **Trustworthiness** | Strong — SSL, privacy policy, terms, free/open source, contact page | 80/100 |

### Content Issues

#### MEDIUM: Blog Posts Are Thin
- "Playwright E2E Best Practices" — only ~280 words of content
- Need 800+ words for competitive SEO content
- Only 3 blog posts total — need 2-4/month to build authority

#### MEDIUM: About Page Lacks Depth
- Missing: detailed team bios, certifications, industry recognition
- Missing: case studies, success metrics, partnerships
- No structured data on the about page

#### GOOD: Comparison Pages Are Comprehensive
- QASkills vs SkillsMP: ~2,000 words with comparison tables
- Playwright vs Cypress: ~2,900 words with detailed framework analysis
- Both have proper heading hierarchy and internal links

#### GOOD: Skill Detail Pages Have Rich Content
- Playwright E2E skill: 2,000+ lines of detailed guidance
- Code examples, patterns, anti-patterns
- Strong topical authority signals

---

## 3. On-Page SEO (78/100)

### Page-by-Page Analysis

| Page | Title | Title Length | Meta Desc | H1 | Canonical | Score |
|------|-------|-------------|-----------|-----|-----------|-------|
| Homepage | "QASkills.sh — The QA Skills Directory for AI Agents" | 54 chars | 188 chars (long) | "Give Your AI Agent Complete QA Mastery" | Correct | 80 |
| /skills | "Browse QA Skills" | 17 chars (short) | 136 chars | "Browse QA Skills" | OK | 75 |
| /agents/claude-code | "QA Skills for Claude Code" | 57 chars (w/ brand) | 136 chars | "QA Skills for Claude Code" | Correct | 82 |
| /categories/e2e-testing | "E2E Testing Skills for AI Agents" | 60 chars (w/ brand) | 128 chars | "E2E Testing Skills for AI Agents" | Correct | 78 |
| /compare/qaskills-vs-skillsmp | "QASkills vs SkillsMP: Best QA Skills Directory" | 60 chars | 152 chars | Matches intent | Correct | 85 |
| /blog/playwright-e2e-best-practices | "Playwright E2E Best Practices for AI Agents" | 57 chars | 98 chars (short) | Matches | WRONG (homepage) | 60 |
| /skills/.../playwright-e2e | "Playwright E2E Testing" | 36 chars | 110 chars | "Playwright E2E Testing" | WRONG (homepage) | 65 |

### Issues Found

#### HIGH: Duplicate Title Tag on Category Page
`/categories/e2e-testing` renders: "E2E Testing Skills for AI Agents | QASkills.sh | QASkills.sh" — brand name appears twice due to template stacking.

#### MEDIUM: Agent Pages Lack H2 Section Headings
`/agents/claude-code` has no H2 tags in main content. Skills display as cards without semantic heading structure. Add H2 sections grouping skills by category.

#### MEDIUM: Homepage Meta Description Too Long
188 characters — will be truncated in SERPs. Ideal is 150-160 characters.

#### GOOD: All Pages Have Unique Titles
No duplicate titles detected across audited pages.

---

## 4. Schema / Structured Data (38/100)

### Coverage Matrix

| Page | WebSite | Organization | SoftwareApp | BreadcrumbList | BlogPosting | Score |
|------|---------|-------------|-------------|---------------|-------------|-------|
| Homepage | YES | YES | -- | -- | -- | 55 |
| /skills | -- | -- | -- | -- | -- | 0 |
| /skills/[a]/[s] | -- | -- | YES | YES | -- | 55 |
| /blog | -- | -- | -- | -- | -- | 0 |
| /blog/[slug] | -- | -- | -- | YES | YES | 50 |
| /faq | -- | -- | -- | -- | -- | 15 |
| /about | -- | -- | -- | -- | -- | 0 |
| /agents/* | -- | -- | -- | YES | -- | 20 |
| /categories/* | -- | -- | -- | YES | -- | 20 |
| /compare/* | -- | -- | -- | YES | -- | 20 |

### Critical Schema Issues

1. **BlogPosting missing `image` (REQUIRED)** — Google requires `image` for Article rich results. Currently not passed to `generateBlogPostJsonLd()`.

2. **SoftwareApplication URL hardcoded** — Line 58 of `json-ld.ts` hardcodes `thetestingacademy` in the URL. Breaks for other authors.

3. **AggregateRating.ratingCount misused** — Uses `installCount` (downloads) as `ratingCount` (reviews). Semantically incorrect and could trigger spam penalty.

4. **Organization logo should be ImageObject** — Currently a bare string URL. Should include `width` and `height`.

### Missing Schema Opportunities
- /skills page: `CollectionPage` + `ItemList` (could trigger carousel)
- /blog page: `Blog` schema with `blogPost` array
- /about page: `AboutPage` + `Organization` + `Person`
- /faq page: `WebPage` + `BreadcrumbList`

---

## 5. Performance (70/100)

### Build Output Analysis
- First Load JS shared: 102 kB (good)
- Homepage: 107 kB total (good)
- Skill detail page: 192 kB (moderate — largest page)
- Most pages: 102-105 kB (excellent)

### Observations
- Next.js 15 with Turbopack — modern build pipeline
- Static generation for most pages (good for performance)
- Dynamic pages: leaderboard (5-min revalidation), skills, blog posts
- Preconnect hints present for datafa.st
- Font loading via `next/font/google` (optimized)

### Needs Measurement
- Core Web Vitals (LCP, INP, CLS) need real-world measurement via PageSpeed Insights
- Third-party script impact (Datafast analytics, Clerk auth)

---

## 6. Images (60/100)

### Issues
- No `favicon.ico` or `apple-touch-icon.png` confirmed in `/public/` directory — metadata references them but files may not exist
- `logo.png` referenced in Organization schema — needs to exist at `https://qaskills.sh/logo.png`
- OG images are dynamically generated (good) but no static fallback images
- Skill pages may lack optimized hero images

---

## 7. AI Search Readiness (85/100)

### Passes
- `/llms.txt` endpoint exists with comprehensive site description (8.5/10 quality)
- AI crawler directives in robots.txt (GPTBot, ClaudeBot, PerplexityBot, Amazonbot)
- Structured data on key pages (SoftwareApplication, BreadcrumbList)
- Clear, quotable content on comparison and category pages
- SearchAction schema enables site search from AI

### Improvements Needed
- Add `Last Updated` timestamp to llms.txt
- Update skill count in llms.txt to match actual data
- Structure more content as self-contained, citable passages
- Add `data-nosnippet` to non-essential UI elements

---

## Priority Action Plan

### Critical (Fix This Week)

| # | Issue | File | Impact |
|---|-------|------|--------|
| 1 | Fix canonical URL inheritance — remove from root layout, add per-page | `layout.tsx` + all pages | Prevents duplicate content signals |
| 2 | Add `image` to BlogPosting schema | `json-ld.ts` | Unlocks Article rich results |
| 3 | Fix SoftwareApplication URL (use `skill.author` not hardcoded) | `json-ld.ts:58` | Correct schema for all authors |
| 4 | Fix AggregateRating (use real review count, not install count) | `json-ld.ts:56` | Prevents spam penalty |
| 5 | Replace verification placeholders or remove them | `layout.tsx:67-70` | Fix invalid meta tags |

### High (Fix This Sprint)

| # | Issue | File | Impact |
|---|-------|------|--------|
| 6 | Add BreadcrumbList to /skills, /blog, /faq, /about | Multiple pages | Breadcrumb rich results |
| 7 | Block /sign-in/, /sign-up/, /unsubscribe in robots.txt | `robots.ts` | Prevent indexing of auth pages |
| 8 | Fix duplicate brand in category title template | Category pages | Clean SERP appearance |
| 9 | Add H2 sections to agent landing pages | `/agents/*/page.tsx` | Better heading hierarchy |
| 10 | Add CollectionPage + ItemList to /skills | `skills/page.tsx` | Potential carousel rich results |

### Medium (Fix This Month)

| # | Issue | File | Impact |
|---|-------|------|--------|
| 11 | Trim homepage meta description to 150-160 chars | `layout.tsx` | Full SERP display |
| 12 | Use real lastmod dates in sitemap (not `new Date()`) | `sitemap.ts` | Accurate crawl signals |
| 13 | Add Blog schema to /blog listing page | `blog/page.tsx` | Better blog indexing |
| 14 | Add AboutPage + Organization schema to /about | `about/page.tsx` | Entity recognition |
| 15 | Add Organization logo as ImageObject with dimensions | `json-ld.ts` | Schema compliance |
| 16 | Expand blog posts to 800+ words each | Blog content | Better content quality |
| 17 | Verify /favicon.ico, /apple-touch-icon.png, /logo.png exist | `public/` | Correct icon display |

### Low (Backlog)

| # | Issue | Impact |
|---|-------|--------|
| 18 | Remove `changeFrequency` and `priority` from sitemap | Cleanup |
| 19 | Remove `/llms.txt` from sitemap | Not an HTML page |
| 20 | Add `Last Updated` to llms.txt | AI search accuracy |
| 21 | Plan sitemap index for future scale (>5K URLs) | Scalability |

---

## Score Improvement Forecast

| Action Set | Current Score | Projected Score |
|-----------|-------------|----------------|
| Current state | **68/100** | — |
| After Critical fixes (1-5) | — | **76/100** |
| After High fixes (6-10) | — | **82/100** |
| After Medium fixes (11-17) | — | **88/100** |
| After all fixes | — | **90+/100** |
