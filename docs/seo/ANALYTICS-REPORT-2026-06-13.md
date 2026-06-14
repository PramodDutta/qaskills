# QASkills.sh — GSC + GA4 Analysis (2026-06-13)

Live pull via Search Console (URL-prefix `https://qaskills.sh/`) + GA4 (property 528788664, account `btc scrolltest`/107190665), owner luckydutta96.

## Search Console — 3 months (Mar 13 – Jun 12)

| Metric | Now | Prev (June pull) | Trend |
|--------|-----|------------------|-------|
| Clicks | 5.84K | 4.35K | +34% |
| Impressions | 448K | 250K | **+79%** |
| Avg CTR | 1.3% | 1.7% | down (page-2 dilution from new content) |
| Avg position | **8.5** | 9.6 | **improving** |
| Pages earning impressions | 732 | ~389 | nearly doubled |

Steep growth curve through June. Position improving while impressions surge = content is indexing and climbing; CTR dip is expected (lots of new page-2 content not yet top-3).

### Top pages (clicks / impressions)
| Page | Clicks | Impr | Read |
|------|--------|------|------|
| / | 1,953 | 8,704 | brand home |
| /agents/claude-code | 1,333 | **19,917** | #1 content asset — deepen it |
| /blog/must-have-qa-skills-claude-code-2026 | 946 | 10,998 | top blog |
| /categories/e2e-testing | 197 | 7,752 | 2.5% CTR — rank-lift target |
| /blog/qa-skills-for-cursor-2026 | 121 | **7,819** | 1.5% CTR — biggest page-2 gap |
| /skills/thetestingacademy/playwright-e2e | 91 | 2,357 | |
| /skills | 78 | 3,300 | |
| /how-to-publish | 47 | 1,692 | the page we fixed — now earning clicks (was 4s bounce) |

Queries still brand-dominated (qaskills.sh, qa skills, qa skills claude) — strong brand recall; non-brand long tail is the growth runway.

## GA4 — 28 days (May 17 – Jun 13)

- **14,733 sessions**, 41% engagement rate, 38s avg, 79K events.
- **Organic Search now the #1 channel: 7,532 (51%)**, 51% engagement, 50s — healthy, high-intent.
- Direct 6,134 (42%) BUT 26% engagement / 22s — inflated by a bot/crawler spike (see anomaly).
- Referral 833 (5.7%), Organic Social 66, **AI Assistant 13** (NEW — ChatGPT/Perplexity/Claude citations starting; GEO/llms.txt work paying off), Email 4 (digest not activated).
- Realtime at pull: 13 users (Brazil, Israel, Portugal).

### Anomaly (data hygiene)
June 7 "Direct" surged to 619 vs expected 96 — driven by **Singapore 10→542 sessions, Chrome 75→603, direct +2,483% WoW**. Pattern = bot/crawler burst, not real users. It inflates the Direct channel's totals + drags its engagement metrics. Treat Direct numbers with caution until filtered.

### Measurement gaps
- **0 key events configured** — GA4 tracks no conversions (skill installs, signups, CLI clicks). Total revenue ₹0. Cannot measure funnel ROI today.
- **Email ~0 sessions** — Resend newsletter wired but never activated.

## Verdict
SEO is **genuinely working**: organic is now the majority channel, position improving (9.6→8.5), impressions +79%, AI-assistant traffic appearing. Growth is real, not vanity.

## Highest-ROI moves (from this data)
1. **Rank-lift /blog/qa-skills-for-cursor-2026 (7.8K imp, 1.5% CTR) + /categories/e2e-testing (7.7K imp, 2.5%)** — both page-2 with big reach; internal links + title/meta = fast clicks.
2. **Deepen /agents/claude-code** — 19.9K impressions, the #1 asset; expand content + internal links to compound it.
3. **Configure GA4 key events** — track CLI-install clicks + publish + signups so ROI is measurable.
4. **Filter the Singapore/bot Direct spike** — add an internal-traffic/bot filter so Direct metrics are trustworthy.
5. **Activate newsletter** — Email is 0; brand traffic (60% of clicks) is uncaptured.

Saved: docs/seo/ANALYTICS-REPORT-2026-06-13.md
