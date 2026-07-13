# Single-backslash regex escapes silently collapse inside blog-post template literals

## Problem

Blog posts store the article body as a JS template literal (`content: \`...\``). Code
samples containing regex like `re.sub(r"\s+", ...)`, `/^\d+$/`, or `toHaveURL(/\/settings$/)`
were written with SINGLE backslashes. JS parses `\s`, `\d`, `\/` in a template literal as
NonEscapeCharacter sequences and drops the backslash, so the PUBLISHED page rendered
`r"s+"`, `/^d+$/`, `/settings$/`. No build error, no crash: the string is still valid, just
wrong. In a tranche of 54 Codex-generated posts this hit 15 files (51 backslashes), including
a security how-to whose timestamp validator `/^\d+$/` became `/^d+$/` (accepts the letter d,
rejects real integer timestamps) and a RAG article whose whitespace-collapse `\s+` stopped
collapsing. The adversarial Opus audit caught both; the mechanical gate did not.

## Approach

1. The existing escaping gate only checked two things: exactly 2 unescaped backticks, and no
   LIVE `${` interpolation (`${` preceded by an even number of backslashes). It never looked
   at lone `\x` sequences, because those neither break the build nor change the backtick/interp
   count. Structurally invisible to the old gate.
2. Detection must be PAIR-AWARE. A naive `grep '\\[^`$\\]'` over-counts: it flags the second
   backslash of an already-correct `\\d` pair. Walk the content left to right, consume
   `\\`, `` \` ``, `\$` as two-char pairs, and only flag a backslash that starts none of those.
3. The fix is the same walk: for each lone content backslash, emit `\\` + char (double it).
   Idempotent against already-doubled sequences because the walker skips `\\` pairs.
4. Verified on the live rendered HTML, not just the source: `curl .../blog/<slug> | grep '/^\d+$/'`
   confirms the browser shows the backslash. Source-only checks can lie about what JS emits.

## Judgment calls

- Did NOT blanket-double every backslash in the file. `` \` `` and `\${` are intentional and
  correct; doubling them would break the template. Scoped strictly to the content region and
  skipped the three legitimate escape pairs.
- Trusted the audit over the mechanical gate for prose-embedded correctness, then turned the
  finding into a permanent gate so the next batch is caught mechanically, not by luck.

## Reusable rule

For any content stored in a JS template literal, a lone `\x` (x not `` ` ``, `$`, or `\`) is a
silent data-loss bug: JS drops the backslash at parse time with no error. Add a pair-aware
"lone content backslash" check to the bulk-generation mechanical gate alongside the
unescaped-backtick and live-`${` checks, and verify the fix on rendered output, not source.
