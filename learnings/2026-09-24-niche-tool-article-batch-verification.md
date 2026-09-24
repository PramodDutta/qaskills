# Niche-tool article batch: verify status, escapes, and the auditor itself

**Problem:** Publish 25 AI-generated articles on niche or newly released tools (Playwright 1.62/1.63, Tracetest, Qodo Cover, k6 Studio, and others) without shipping false facts or broken code to a site with 30K monthly users.

## Approach

1. Check that each topic is absent from the corpus (slug grep plus title scan), then check that the tool is still alive: GitHub `archived`, `pushed_at`, latest release date, and the vendor blog. Two of the 25 had drifted: Tracetest Cloud was end-of-lifed (Oct 2024, open-source Core only), and the Qodo Cover repo says it is unmaintained. Reframe those topics before writing, not after.
2. Generate with Codex using `--search` (live web search), 2 topics per run, at most 3 runs at a time. Each writer runs the gate script on its own files and fixes errors before it exits.
3. Gate on the RENDERED content: transpile with the TypeScript compiler, evaluate `post.content`, then check links, FAQ, tables, word count, H1, and unbalanced inline backticks. Also scan the raw template literal: any backslash not followed by `\`, a backtick, or `$` is an error. That one rule caught shell line continuations collapsing into one line, `\"` turning JSON invalid, and `\)` swallowing a closing backtick.
4. Do a manual review against PRIMARY sources: raw release-notes markdown from GitHub, CLI source files, `action.yml`, CRD Go types, and `npm view` / `gh api` for versions and asset names.
5. Run a Codex audit in chunks of 5 with web search, then adjudicate every blocker against a primary source before applying it.
6. Re-audit only the articles you rewrote heavily, then register, build, render-check locally, commit explicit paths, deploy from a HEAD worktree, and verify live pages plus the sitemap delta.

## Judgment calls

- **Did not apply auditor findings blindly.** 6 of 17 flagged blockers were wrong. Examples: the auditor twice claimed Tracetest has no `-j` flag, but `resource_run_cmd.go` defines it. It rejected Pumba's `combine --rate-value` and Trunk's `swift-test-xunit-paths`, both of which are documented. It also rejected `import type` plus `typeof`, which is the exact pattern in Playwright's own docs.
- **Did not trust WebFetch summaries for adjudication.** The summarizer mixed 1.61 features into its 1.62 list. The raw `release-notes-js.md` settled it.
- **Did not put "lessons from the last audit" into the writer prompt as bare rules.** Writers turned them into article content: DB rollback advice in a Playwright release post, and "don't use `-t`" asides everywhere. Keep such rules in the gate and audit, or mark them "constraints, never mention".
- **Did not upgrade Grok or Codex when they failed.** Grok's free tier ran out and `gpt-6-astra` needs a newer CLI. Codex took over Grok's topics on `-m gpt-5.5`, because spending money is the user's call.

## Reusable rule

For any generated technical content, verify three things against primary sources, never against another model: the tool is still alive, every identifier exists, and the rendered code equals the intended code. That includes the reviewer model's own corrections.
