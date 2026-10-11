# Webinar capture on top-traffic pages, built beside a parallel session

**Problem:** Put a dated webinar invite on the pages that carry qaskills.sh's traffic without breaking a site with 20K monthly users, while another Claude session was building the webinar top banner in the same files.

## Approach

1. **Check for collisions before writing.** `git status` showed layout.tsx edited and a new lib/webinar.ts, both minutes old; `ListAgents` showed a busy peer session in the same repo. I messaged it a file-ownership split (it owns lib/webinar.ts, the banner and layout.tsx; I own new files under components/webinar/ plus the page slots), used its lib read-only, and sequenced commits and deploys by message.
2. **Place by data.** The GSC pages report for 28 days showed blog 80% of clicks, home 6.7%, /agents/claude-code 5.2%, and skill pages 3.9%. The in-content capture went where those pages already had a promo slot: the blog-mid CourseAd, the claude-code promo block, and the skill sidebar CourseAd.
3. **Borrow existing slots instead of adding new ones.** `WebinarSlot` is a client component that receives the server-rendered original as `children`. It renders the original on the server and on the first client render, so hydration matches. After mount, it swaps to the webinar card only while a session is current. A class error boundary falls back to the original on any error, and the original returns by itself after the batch.
4. **Allow one popup, and keep it respectful.** A desktop exit intent fires when the pointer leaves through the top, armed after 10 s, at most once a day. It never shows on touch devices, in a page view where the lead magnet popup may show, or on dashboard, auth, unsubscribe or pricing pages. It is mounted from footer.tsx because layout.tsx belonged to the peer.
5. **Verify what will actually ship.** Build in a clean worktree of HEAD plus my files, because the main tree carries others' WIP. Run a fake-clock Playwright suite covering session states, a New York time zone, mobile, dark mode, the exit rules, GA dataLayer events and UTMs, with analytics and sdet.live blocked. Run it locally, then again against live, then a coverage run over the top 16 GSC pages.

## Judgment calls

- I did not edit layout.tsx, lib/webinar.ts or the banner, even for a mount point. On a shared git index, ownership beats convenience.
- The exit intent stays off mobile, because Google penalizes mobile interstitials and the site's growth comes from SEO.
- I did not fix the pre-existing CourseAd dark-mode bug or the stale cohort dates in this change. Both were flagged as separate tasks.
- I did not trust the first green run. Screenshots caught two visual bugs that no assertion did.

## Traps found (each one cost a rebuild)

- **No test alias.** Vitest in packages/web has no `@/` alias, so a new `@/` import in a tested page breaks that page's test. Mock the import in the test, and use relative imports in pure modules under test.
- **Dark mode.** Tailwind v4's `dark:` follows the OS setting, but this site toggles a `.dark` class. For anything that must stay readable, use theme tokens (`bg-primary/5`, `text-primary`, `text-foreground`).
- **Corner specks.** Chrome paints yellow specks at the rounded corners of violet gradients. Use a solid fill instead.
- **Local server errors.** Local `next start` returns 500 on every route without Clerk keys. Run it with `QASKILLS_DISABLE_AUTH=1`.

## Reusable rule

Before editing shared files, check for a live peer session. Put new promos into existing slots with a server-rendered fallback. Verify with screenshots across theme and device, because assertions miss what eyes catch.
