# Assembling a 10k-word pillar from parallel Codex+Grok sections

## Problem

A single 10,000-word pillar article is too long for one Codex/Grok call (output
truncates around 5-6k words) and too risky to hand-embed in a JS template-literal
BlogPost (one stray backtick or regex backslash breaks the build or silently
mangles code samples).

## Approach

1. **Split by subtopic, not by size.** Six sections (~1700-2800w each) mapped to the
   cluster's real search intents (Mocha/Chai as the biggest, since it had the most
   impressions), one subagent per section. Codex for structure-heavy sections, Grok
   for the two deepest, so both engines contributed as the goal required.
2. **Subagents write PLAIN markdown, not .ts.** No escaping in the generation step.
   Each writes real backticks and code. One section owns the H1, one owns the FAQ;
   every other section starts at H2. This keeps the prompts simple and the output
   clean.
3. **Assemble with one deterministic escape pass** in this exact order:
   `\` -> `\\`, then `` ` `` -> `` \` ``, then `${` -> `\${`. Applied to the whole
   concatenated body. This is bulletproof because doubling backslashes FIRST means
   the escapes added in steps 2-3 are never themselves re-escaped. Verified by the
   pair-aware gate (unescaped backticks == 2, no live `${`, zero lone backslash) AND
   by actually `_compile`-ing the module in Node to prove it parses.
4. **Audit the markdown sections, not the assembled .ts.** Fixes land pre-escaping
   where they are readable. Three Opus reviewers: two on technical accuracy (2
   sections each), one on the intro/FAQ plus whole-pillar coherence (duplicate
   headings, cross-section contradictions, one-H1/one-FAQ).

## Judgment calls

- Detected real markdown H1s by walking code-fence state, so `# comment` lines inside
  bash/python code blocks were not mistaken for article titles (a naive `^# ` grep
  reported 13 false H1s in the Playwright section).
- The audit caught a genuine blocker in the highest-value section (Mocha hook
  execution order: child `before` runs before root `beforeEach`, and the numbered
  list contradicted the section's own correct prose). Fixed in source, re-assembled,
  re-verified. Did not ship on "the prose nearby is right."

## Reusable rule

For long pillar content, generate plain-markdown sections in parallel (one subtopic
each, one H1 owner, one FAQ owner), then assemble with the backslash-first three-step
escape and prove it by compiling the module, not by eyeballing. Audit the markdown
before escaping, and always run a cross-section coherence pass, because independently
generated sections drift and duplicate.
