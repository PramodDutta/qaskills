# QASkills.sh — Product Hunt Launch Plan (2026-07)

> Planned 2026-07-04. Launch driven via Claude-in-Chrome on the @promode_ PH account
> (Chrome profile luckydutta96@gmail.com). PH days run the WHOLE day from 00:01 PT
> (= 12:31 PM IST) — date only, no time slot.

## ✅ DECIDED: launching Wednesday, July 8, 2026 (12:01 AM PT)

Scheduled on PH by Pramod on 2026-07-04. Listing live at producthunt.com/my/products
(filter: scheduled). Everything below was the pre-decision analysis.

## 📅 Recommended launch date (pre-decision analysis)

**PRIMARY: Tuesday, July 14, 2026** — first clean Tuesday after the July 4 holiday
week; US audience fully back; classic high-traffic day. Best if we mobilize the TTA
audience (YouTube/email/X) for upvotes.

**ALT (max #1-badge odds): Saturday, July 18 or Sunday, July 19, 2026** — weekends
have ~3–4× less competition; #1 needs only ~400–600 upvotes vs ~800–1,200 on a
Tue–Thu AI-category day. Weekend launches also get ~15% more "Visit" clicks. Best if
firepower is limited and the goal is the badge.

**Decision rule:**
- Confident we can rally 800+ upvotes → **Tue Jul 14** (max eyeballs).
- Want the #1 badge cheaply, smaller push → **Sun Jul 19** (less competition).

**Avoid:** Mon Jul 6–7 (post-holiday grogginess), any day OpenAI/Google/Anthropic
drops a mega-launch (Tue–Thu risk). No specific collision found for Jul 14–19 as of
research date.

Sources: Product Hunt forums, fmerian "best day to launch", tooljunction AI-launch
playbook 2026, Smol Launch guide.

## 🎬 Video
Remotion-rendered 32s launch video: `out/qaskills-launch.mp4` (1920×1080, 3.4 MB).
6 scenes: hook (AI writes fast / tests badly) → flaky-test pain → QASkills reveal →
terminal `npx @qaskills/cli add` demo → stats (394 skills, 30+ agents, 15K devs,
free/OSS) → CTA. Copied to ~/Desktop. Upload as the PH video (or host on YouTube/Loom
and paste the URL — PH video field accepts YouTube/Loom).

## 📝 Listing copy (ready to paste)

**Name:** QASkills.sh

**Tagline** (≤60): `Expert QA skills for Claude Code, Cursor & 30+ AI agents`

**Description** (≤260):
> AI agents write code fast but test it badly — flaky tests, missed edge cases.
> QASkills.sh is a free, open-source directory of 394+ QA skills you install into
> Claude Code, Cursor, Copilot & 30+ agents in one command. Instant Playwright,
> pytest, API & AI-eval expertise.

**Topics/tags (max 3):** Developer Tools · Artificial Intelligence · Open Source

**First comment (maker):**
> Hey Product Hunt! 👋 I'm Pramod, founder of The Testing Academy.
>
> AI coding agents are amazing at writing app code — and pretty bad at testing it.
> Flaky tests, missed edge cases, no framework best-practices.
>
> QASkills.sh fixes that. A free, open-source directory of **394+ QA skills** you
> install with one command:
> `npx @qaskills/cli add playwright-e2e`
>
> Your agent instantly inherits expert testing knowledge — stable locators, Page
> Object Model, fixtures, no flaky tests. Works with Claude Code, Cursor, Copilot,
> Windsurf + 30 more, plus the universal `.agents/skills` standard.
>
> Bonus: 890+ QA tutorials, tool comparisons, and you can publish your own skills.
> 100% free, MIT-licensed.
>
> What skills should we add next? Would love your feedback 🙏

## Gallery assets
- Thumbnail + slide 1 auto-pull from the site OG image (fine to ship).
- More slides must be **drag-dropped in normal Chrome** (automation can't drive the OS
  file picker). Suggested: /skills grid, /leaderboard, a SKILL.md + agent using it,
  30-agent marquee.

## Launch-day playbook
1. 00:01 PT — listing goes live (scheduled). Maker comment auto-posts.
2. Notify TTA audience in 3 waves (morning/noon/evening PT) — "we're live", NEVER
   "please upvote" (PH bans it → homepage removal).
3. Reply to every comment fast (engagement → ranking).
4. Cross-post X / LinkedIn / YouTube community.

## Status
- [ ] Pick date (Tue Jul 14 vs Sun Jul 19)
- [ ] Fill listing via Chrome (main info + tags + first comment)
- [ ] Add video + gallery slides
- [ ] Schedule — STOP before final "Confirm scheduled date" for explicit OK
