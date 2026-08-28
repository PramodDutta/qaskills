# Auditing 57 generated articles: Grok at Codex parity, and the vacuous-test lens

## The problem

Audit 57 technical articles (3000+ words, heavy code samples) for wrong claims and
broken samples while Codex was usage-capped, using Grok as the only reviewer, and
have the findings be as sharp as Codex's.

## The approach

1. **File-based audit protocol for Grok.** A scratch dir with COPIES of the article
   files plus one INSTRUCTIONS.txt holding the audit spec (defect classes, output
   format). The prompt says only: read INSTRUCTIONS.txt, audit exactly these listed
   files, output findings only (`slug | snippet | BLOCKER/MINOR | what's wrong |
   fix` plus a count line). No spec text in the prompt itself.
2. **Chunks of ~10 files, sequential**, one background task each; parse findings by
   grepping the `| BLOCKER |` shape out of the raw log.
3. **Fix in the SOURCE staging dir, not the audit copies**, then re-run the whole
   mechanical gate before registration (it caught a raw backtick a fix of mine
   introduced inside a template literal).
4. **Read every finding's surrounding code before fixing.** Two "vitest --grep"
   hits were articles correctly teaching the distinction: false positives.

## The judgment calls

- **Did not prompt Grok with the spec inline.** Inline-spec prompts had produced
  shallow style nits. Making it read the spec as a file and restricting output to
  findings-only produced Codex-grade catches (invented `toHaveJSON` matcher twice,
  Playwright `request`-fixture cookie-jar isolation, `/about:blank` as a path).
- **Did not patch findings cosmetically.** The dominant blocker class (roughly half
  of 22) was the VACUOUS TEST: code that passes for the wrong reason. Race tests
  whose seed row sat in an uncommitted sibling transaction; a redaction test whose
  logger never received the secret; an attack message posted to the parent window
  so the iframe's origin check never ran; an "invalid JSON" injection re-wrapped in
  valid JSON by the envelope. The fix each time was to make the hostile input
  actually reach the guard, then assert the guard's observable effect.
- **Did not trust my own fixes without re-gating.** Every fix pass ended with the
  full mechanical gate plus the shingle-duplication check, not a spot check.

## The reusable rule

When auditing test-code samples, ask of every test "can this fail for the reason
the article claims?": trace the hostile input to the guard it supposedly triggers;
and give a weaker reviewer its spec as a file to read, not paragraphs in the prompt.
