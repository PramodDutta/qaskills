# Evergreen course promos and a dark mode that follows the site toggle

**Problem:** qaskills.sh course ads and the top banner showed a past cohort ("Starts 1 Aug 2026", ₹9,999, 33% OFF, code AITESTER) on every page. Separately, cards turned unreadable whenever the site's dark mode disagreed with the visitor's OS setting.

## Approach

1. **Remove stale fields from the type, not just the markup.** Deleting `cohort`, `schedule`, prices, `discount` and `code` from the `Course` interface in lib/courses.ts made `tsc` point at every renderer that still used them: CourseAd's sidebar and inline variants, and PromoBanner. The banner shows the course tagline where the date used to be. A grep for `Starts \d`, `% OFF` and `₹` confirmed nothing else hardcoded them.
2. **Find the real dark-mode mechanism before patching cards.** next-themes puts `.dark` on `<html>`, and globals.css swaps tokens under `.dark`. Tailwind v4's `dark:` defaults to the OS `prefers-color-scheme` setting, so 159 `dark:` utilities followed the OS instead of the site. The fix is one line: `@custom-variant dark (&:where(.dark, .dark *));`.
3. **Prove it with a fingerprint, not eyeballs.** For each page and site theme, load twice with Playwright `colorScheme` set to light and then dark. Collect every element's computed color, background, border and background-image, and count the differences. Prod before the fix had 7 to 490 differences per page; after the fix there were 0 on all 7 pages, in both themes. Run it against prod first, so the test is shown to catch the bug.
4. **Commit one hunk from a file that also holds someone's WIP.** globals.css carried an uncommitted 123-line block. Split `git diff` into hunks, `git apply --cached` only mine, check that `git diff --cached` shows 4 lines, then run plain `git commit`. Never use `git commit -- globals.css`: the pathspec form commits the working-tree file, WIP included.
5. **Measure a visual glitch before guessing.** Rounded cards showed yellow corner specks. A probe applied fill and border variants inline and counted yellow pixels in corner crops. Translucent palette fills and gradients (oklch with alpha) gave about 60 such pixels; opaque fills and hex-based `color-mix` gave 0. The borders were innocent.

## Judgment calls

- I removed prices, discounts and coupon codes along with the dates. They belonged to the same past cohort, and the request was "just information and links".
- I kept the coupon and date machinery out of courses.ts rather than leaving optional fields unset. Dated campaigns belong in a self-expiring config like lib/webinar.ts.
- The second fill fix replaced an unpushed commit by amending it, instead of stacking a second commit on the same lines. Nothing pushed was rewritten.
- I deployed on top of a peer session's HEAD (its webinar date move), never from an older tree.
- I did not bump PromoBanner's CAMPAIGN_ID. Visitors who dismissed the banner keep it dismissed.

## Reusable rule

When something renders differently per user, find which setting actually drives it, then prove the fix by showing that the other setting changes nothing (a computed-style diff of 0). Inspecting screenshots alone doesn't prove it.
