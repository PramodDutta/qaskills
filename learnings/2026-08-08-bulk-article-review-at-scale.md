# Reviewing 124 generated articles when the reviewer itself keeps failing

## The problem

Publish 124 SEO articles (3000+ words each) with no broken code samples and no false
technical claims, when the review tooling is less reliable than the content pipeline.

## The approach

1. **Generate, then verify on disk.** Feed topic waves to Codex and Grok. Never trust
   exit codes: build the wanted-slug list, `ls` the staging dir, diff the two. Re-run
   only genuinely missing slugs.
2. **Mechanical gate first, on every file.** One script checking word count, tables,
   code-block count, FAQ presence, exactly 2 internal links, em dashes, escaping
   (live `${`, pair-aware lone backslash, unescaped-backtick count), date, and
   description length. It caught 0 failures on generation, and later caught a defect
   *I* introduced.
3. **Corpus checks the gate cannot see.** Slug collisions against all 1728 existing
   slugs (including batch arrays), internal-link targets resolving, and 8-word
   shingle Jaccard between every article pair.
4. **Batch-wide greps for defect classes, separate from the audit.** Version strings,
   flag confusions (`--grep` vs `-t`), meta leaks, import assertions.
5. **LLM audit in small sequential chunks.** 10 slugs per pass, one at a time.
6. **Re-run the mechanical gate after every fix pass**, before moving on.
7. **Verify locally before committing**, then verify all 124 live after deploy.

## The judgment calls

- **Did not use Agent-tool subagents for the audit.** They failed environment-wide
  with a bogus model id (`gpt-5.4-mini`), including with no model override. Rather
  than retry a third time, switched the reviewer to the Codex CLI, which was already
  proven in this session. Two failures on the same step is the stop signal.
- **Did not keep audits concurrent.** Four parallel `codex exec` runs all died with
  SIGTERM (exit 144) at the same moment: the same mass-kill signature as
  over-parallelized generation. Dropped to 10-slug chunks run sequentially. Slower
  wall clock, but every chunk finished.
- **Did not treat local 500s as a content bug.** Every route 500'd under
  `next start`, including `/` and month-old articles. Cause was `.env.local` carrying
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` with no `CLERK_SECRET_KEY`, so Clerk middleware
  threw before any page rendered. Confirmed by testing a pre-existing URL, then ran
  the verify pass with a placeholder secret exported for that process only. No env
  file was edited.
- **Did not rely on the auditors alone.** They found 44 blockers but missed 3
  nonexistent GitHub Action versions and 3 meta leaks. My greps found those but would
  never have found a vacuous assertion. Different tools, different defect classes.
- **Did not trust a line-shaped anchor in the registration script.** `^export const
  postList` matched a derived `.sort()` expression; the real array is
  `legacyPostList`. The script asserted its anchors and aborted instead of writing to
  the wrong place.

## The reusable rule

When a reviewer is less reliable than the thing it reviews, make the cheap
deterministic check the gate and the expensive judgment call the supplement: run the
mechanical gate after every edit pass, verify agent work against the filesystem rather
than its exit code, and before blaming your new content for a failure, run the same
check against content that already worked.
