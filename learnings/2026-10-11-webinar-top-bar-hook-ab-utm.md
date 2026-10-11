# Turning site traffic into webinar sign-ups without breaking the site

## The problem

Put a webinar invite in front of qaskills.sh's 30K monthly visitors, using six ad-creative
hooks and UTM-tagged links, so Pramod can see which hook and which page drives sign-ups,
on an SEO site that must not get slower, jumpier, or broken.

## The approach

1. **Inventory every attention slot before adding one.** The top `PromoBanner` was still
   selling cohorts that started in August; the bottom-right held a chat bubble; a
   lead-magnet modal opens at 12s. So the invite took over the existing top slot for the
   batch window and hands it back automatically, instead of adding a fourth surface.
2. **Check the funnel before writing copy.** Fetch the join link: `sdet.live/webinar`
   redirects to a Zoom registration and forwards the query string, so UTMs survive. No
   price on the page, so "free" is defensible.
3. **Pure logic in `lib/`, unit-tested.** Session state (date, tomorrow, today with
   countdown, live, ended), UTM builder, hook picker. "Today" uses the visitor's calendar,
   because 8 PM IST is the next morning in the US (40% of traffic).
4. **One hook per visitor, sticky.** Random on first visit, kept in localStorage, sent as
   `utm_content` (the creative's file name). Rotating hooks every few seconds would make
   every click ambiguous.
5. **Measure the real bar height at every breakpoint, with the longest copy.** The first
   build was 54px at 1024px and 61px on phones. Short copy below `lg`, the date only at
   `xl`, and a compact badge on phones got it to 44px (46px on phones), close to the old
   bar, so the hydration layout shift stays small.

## The judgment calls

- **No floating card.** It would fight the chat bubble and the lead-magnet modal.
- **Did not fix the stale course dates.** The new cohort dates are unknown; flagged them,
  since they come back when the webinar batch ends.
- **Used the title Pramod gave, not the Zoom page's.** Explicit user wording beats an
  inferred one; flagged the mismatch instead of picking silently.
- **Split ownership with a parallel session by file**, committed path-only
  (`git commit -- <paths>`), and handed off the deploy so two `vercel --prod` never overlap.

## Gotchas

- Writing a regex escape for the em dash (backslash, u, 2014) through the file tool
  produced the literal character, twice; the em-dash grep caught it both times. Grep
  generated files for the raw character, not just your source text.
- Browser test clicks failed silently after 12s: the lead-magnet modal is a full-screen
  overlay. Suppress it (localStorage) before UI tests.

## The reusable rule

Before adding any promo, list what already competes for the visitor's attention and how
tall the slot can be; then give each visitor one variant and encode it in `utm_content`,
so the creative test answers a question instead of producing noise.
