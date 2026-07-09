# Publishing 55 long-form (3000-word) SEO articles via parallel Codex waves

## Problem

Ship 55 net-new 3000-word SEO articles in one session with a required SEO audit gate, delegating generation to Codex.

## Approach

1. **Audit as a real gate, split by strength.** Technical SEO checked by me against the live site (sitemap, JSON-LD, robots, canonicals: all already strong, so the play was net-new content not fixes). Corpus gap + cannibalization analysis across all 953 registered slugs delegated to Codex (heavy read). Fresh-topic timeliness from WebSearch (Codex has no web).
2. **Make Codex's topic proposals self-validating, then re-validate.** Codex output pipe-delimited `slug|title|category|intent|link1|link2` lines. I built the COMPLETE 953-slug inventory (literal registry + 223 batch-spread entries, which my first partial 730 set missed) and ran comm against it: 0 slug collisions, all 62 link targets present.
3. **Assign internal links in the spec, do not let the model pick.** Each topic line carried its 2 required link-slugs (already verified to exist). Codex could not hallucinate a broken link because it had no choice to make. Result across 55 files: 0 broken links.
4. **Parallel generation in waves.** Split 55 into 4 waves of ~14; each Codex run writes ONLY its new post files (never index.ts), so waves cannot conflict in the shared repo. 4 parallel --yolo runs, ~48k words each.
5. **Register programmatically, verify count.** A Python script generated 55 imports + 55 map entries + 55 postList entries with collision-proof `b55_`-prefixed identifiers, inserted at fixed anchors. Then grep-verified each slug appears exactly twice.
6. **Independent verification before trusting reports.** Re-checked all 55 for word count, em dashes, tables, code, FAQ-last, link validity.

## Judgment calls / gotchas

- **Wrapper-backgrounding loses harness tracking.** Launching `codex & codex & disown` inside one run_in_background call makes the wrapper "complete" instantly while the real work runs orphaned; I lost completion notifications for 2 waves and had to poll their output files. Fix next time: one run_in_background Bash call per Codex wave.
- **The escaped-code-fence trap in verification.** Code blocks inside a TS template literal are escaped as backslash-backtick-x3. My check `grep -c '```'` matched zero and nearly flagged all 55 as failures. The content was fine; the CHECK was wrong. Always grep the escaped form the files actually contain, and sanity-check a "100% failure" result before believing it.
- Did NOT touch the 10 cannibalization groups the audit found (6x playwright-agents, 6x deepeval variants, etc.): this batch only ADDS non-colliding net-new; consolidation is a separate 301/merge pass.

## Reusable rule

For a large delegated content batch: assign the internal links in the spec (never let the model choose a slug), dedup against the COMPLETE inventory including batch-spread entries, register programmatically with prefixed identifiers, and when a verification script reports 100% failure, suspect the script before the content.
