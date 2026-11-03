# A site-wide copy change: find every surface, then verify like a visitor

## The problem

"Remove the dates and prices from the Playwright and AI batch notification, link straight to
the batch, publish." The batch announcement turned out to live in eight places across two
codebases inside one repo (a React app and hand-written static pages), and the first live
check said "done" while visitors still saw the old dates.

## The approach

1. **Look at the live site before the code.** The obvious candidate (qaskills.sh) had been
   made evergreen days earlier, so the request had to be about another site. Reading the
   rendered banners on app.thetestingacademy.com found the stale text and its two systems
   (a `.tta-promo-banner` and a `.ttapromo-top` bar).
2. **Grep the whole repo for the stale strings, not the component names.** Searching for
   `Starts 31 Oct|bit.ly/aitester2026|promo-when|₹` found the static banners, the top promo
   script, an inline HTML copy, the app's global banner, a student popup and two student
   pages. Searching for the class name alone had found half.
3. **Apply one rule everywhere:** remove dates/times/countdowns and prices/discounts, point
   every link at the batch page, make the batch name a link, keep everything else.
4. **Gate on a baseline, not on zero.** The app's `tsc` had 61 pre-existing errors; compare
   the error set before and after the change (identical), then run the real gate, `vite build`.
5. **Verify the way a visitor receives it.** Poll the plain URL, read `cache-control`
   (`max-age=14400`), and refresh the browser's copy with `fetch(url, {cache: 'reload'})`
   before reloading the page.

## The judgment calls

- **Did not trust the cache-busted poll.** `?v=<timestamp>` returned the new file while the
  browser kept the old one for four hours. A cache-buster proves the deploy, not the visitor's
  view.
- **Did not edit page copy that is not a notification** (the testimonial page), and flagged it
  instead.
- **Did not touch files another session claimed.** It took the two student pages on top of my
  commit; we split by file and pushed in sequence on the shared branch.
- **Did not commit in the owner's checkout.** A fresh clone of the deploy branch, his
  `node_modules` borrowed through a symlink only for type-checking, removed with `unlink`.

## The reusable rule

For any "change this text everywhere" request, search for the stale strings across all code
(static and app), and call it live only after checking the plain URL and the browser's
cached copy, because a cache-busted request proves the deploy and nothing about visitors.
