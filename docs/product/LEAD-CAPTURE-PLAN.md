# Lead Capture System: Audit and Plan

2026-07-28. Written after auditing what is already live, not from scratch.

## 0. The headline

Capture is not the problem. **259 leads in about one month against roughly 4,300 monthly blog clicks is about 6% conversion**, which is a good popup rate. The problem is that all 259 are sitting cold: the confirmation email cannot send, there is no nurture, no segmentation, and one single offer serves 1,398 different articles.

Fix the follow-up first, then multiply the capture. In that order.

## 1. What already exists and works

| Piece | State |
|---|---|
| `landing_signups` table | Live. `email`, `source`, `intent`, `note`, `createdAt`, unique index on (email, source) |
| `POST /api/signups/waitlist` | Live. Zod-validated, CORS-open for external landing pages, per-source branding, returns download links even if DB or email fails |
| `LeadMagnetPopup` | Live. Mounted globally in `layout.tsx`, fires after 12s, localStorage-gated so it never nags |
| Magnet assets | `claude-code-qa-playbook.pdf` and `claude-code-qa-skills.zip` in `public/lead-magnet/` |
| Captured | 259 emails, all from one source, most recent today |

The route is well built: it deliberately hands back download links even when storage or email fails, so a user never loses the thing they asked for.

## 2. The actual gaps, in priority order

**P0. The confirmation email cannot send.** `RESEND_API_KEY` is not set in Vercel production (verified by a fresh `vercel env pull`). The route calls Resend, the call fails, the catch swallows it, the user still gets their download link and we look fine. But 259 people have received **zero** emails from us. No welcome, no nurture, no reason to come back. This is the single highest-value fix and it is a config change, not code.

**P1. One offer for 1,398 articles.** The popup shows the same Claude QA playbook whether the reader came for `mocha-hooks-before-after-beforeeach-guide` or `testing-rag-faithfulness-with-ragas`. A topic-matched offer typically converts far better than a generic one, and it tags the lead by interest for free.

**P2. Popup is the only surface.** No inline capture inside article bodies, no end-of-article CTA, no exit intent. The blog is where the entire audience is (about 1,419 URLs, 2.4M impressions per quarter) and it has exactly one timed interruption on it.

**P3. No segmentation.** Every lead is `source = claude-qa-lead-magnet`. When we sell packs, we cannot tell an automation reader from an AI-testing reader, so we would have to blast everyone identically.

**P4. No double opt-in and no unsubscribe on this table.** `users` has HMAC unsubscribe tokens; `landing_signups` has nothing. Before any bulk send, this needs an unsubscribe path or we create a compliance problem.

## 3. The plan

### Phase 0: Unblock delivery. Today, under an hour.
1. Set `RESEND_API_KEY` in Vercel production, verify `qaskills.sh` as a Resend sending domain (SPF/DKIM).
2. Set `UNSUBSCRIBE_SECRET` (currently absent; the token helper falls back to `CRON_SECRET`, which is also absent).
3. Send one test to yourself, confirm the confirmation email actually arrives.
4. Backfill: send the 259 existing leads the welcome they never got, with the download links and a single next step.

Blocked on you: the Resend key. Nothing else in this phase needs code.

### Phase 1: Segment the capture. 1 day.
1. Add `topic` and `magnet` columns to `landing_signups` (nullable, so nothing breaks), plus `confirmedAt` for double opt-in later.
2. Map each blog post category to a topic bucket: automation, ai-testing, performance, security, accessibility, manual. The `category` field already exists on every `BlogPost`.
3. Popup and any inline form pass `topic` and the current slug in `note`. Retro-tag nothing; just start collecting it.

Result: every new lead is segmented from day one, which is what makes the pack launch targetable.

### Phase 2: Multiply the surfaces. 2 days.
1. **Inline mid-article CTA**, injected after roughly the third H2 of every post: a compact one-field form, topic-matched copy. This is the highest-volume surface we are not using.
2. **End-of-article CTA** below the FAQ, framed as the next step rather than an interruption.
3. **Exit intent** on desktop (mouseleave toward the top), as a second chance for people the 12s timer missed. Keep the existing localStorage gate so nobody sees two.
4. Keep the timed popup, but suppress it when an inline form is already visible in the viewport.

All of this reuses the existing `POST /api/signups/waitlist` route as-is. Only the client surfaces are new.

### Phase 3: Topic-matched magnets. 2 to 3 days.
Three new assets, each derived from content we already own so authoring cost is low:
- **Playwright/automation:** a locator and flaky-test field guide (we have `flaky-test-doctor` and the whole Playwright cluster).
- **AI testing:** an LLM eval starter kit with a golden-set template (we have `ai-system-quality-engineer`, DeepEval, Ragas, promptfoo articles).
- **Manual/test design:** the boundary and negative test-case pack (we have `boundary-value-generator` at 5,714 words, `negative-test-generator` at 4,595).

Serve whichever matches the article's category, fall back to the current playbook.

### Phase 4: Nurture. 2 days.
A 4-email sequence on capture, sent through the existing `send.ts`:
1. Instant: the asset, plus the one-command install.
2. Day 2: the single best article for their topic bucket.
3. Day 5: the flagship skill for their persona (flaky-test-doctor, ai-system-quality-engineer, etc).
4. Day 9: soft ask, either the pack pre-order or a reply asking what they are stuck on.

Add the HMAC unsubscribe link to every one of these, reusing `unsubscribe-token.ts` with a `landing_signups` variant.

## 4. Expected effect, stated honestly

Current: about 6% of blog visitors convert on the popup alone, about 259/month.

Inline plus end-of-article plus exit intent typically adds meaningfully on top of a popup-only setup, but I am not going to invent a multiplier. The defensible claim is narrower: **we currently monetize none of the 259 because we cannot email them**, so Phase 0 alone changes the value of the list from zero to whatever the list is worth. Phases 1 to 3 raise volume and make the list targetable; measure the actual lift rather than trusting a projection.

## 5. What I need from you

1. **`RESEND_API_KEY`** plus confirmation that `qaskills.sh` is verified in Resend. This is the only hard blocker.
2. **Approve the schema migration** on `landing_signups` (add `topic`, `magnet`, `confirmedAt`, all nullable). Prod DDL needs your explicit go per repo rules.
3. **Decide on the backfill:** do you want the 259 existing leads to get the welcome email they never received? I would send it, but it is an outward mass send and I will not do it without your word.
4. **Double opt-in or single?** Single converts better; double is safer for deliverability and EU compliance. My recommendation: single opt-in with a clear unsubscribe, since these are voluntary downloads, not scraped addresses.

Phases 1 and 2 need no secrets and can start immediately if you want capture surfaces built while the Resend key is sorted out.
