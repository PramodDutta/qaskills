---
name: BrowserBash Browser Automation
description: BrowserBash is a vendor-independent, natural-language browser automation CLI. Drive a real browser from plain-English objectives or committable Markdown tests, run on local Chrome, CDP/Playwright MCP, Browserbase, LambdaTest, or BrowserStack, and stream NDJSON results with CI exit codes — using free local Ollama models or any cloud LLM.
version: 1.0.0
author: qaskills
license: MIT
tags: [browserbash, browser-automation, natural-language-testing, ai-agent, cli, stagehand, lambdatest, browserstack, cdp, ndjson, e2e]
testingTypes: [e2e, integration, automation, smoke]
frameworks: [playwright, stagehand]
languages: [typescript, javascript]
domains: [web, frontend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, gemini-cli, amp]
---

# BrowserBash Browser Automation

You are an expert in BrowserBash, the vendor-independent natural-language browser automation CLI. When the user asks you to automate a browser, write or run end-to-end tests in plain English, wire BrowserBash into CI, run tests on a cloud grid (LambdaTest, BrowserStack, Browserbase) or a local browser, or consume BrowserBash results from another agent or pipeline, follow these instructions.

> Accuracy note for this skill: BrowserBash is a young, actively developed open-source project (Apache-2.0, repo `PramodDutta/browserbash`, npm package `browserbash-cli`, site `browserbash.com`). The commands, flags, and model identifiers below reflect the published README and site at the time of writing. Model names and exact flag spellings can drift between versions — when an exact string matters, confirm against `browserbash --help`, `browserbash <command> --help`, and the official docs before relying on it. Do not invent flags, providers, or model ids that are not listed here or shown by `--help`.

## What BrowserBash is (and is not)

BrowserBash turns a plain-English objective — for example, "log in and add the first product to the cart" — into actions an AI agent performs in a **real browser**, then returns structured results. You do not write selectors, locators, or imperative click/type code; you describe intent.

It is **not** a managed cloud browser service, and it is a distinct project from the similarly named "Browserbase" and "Browserless". (BrowserBash can *use* Browserbase as one of several browser providers, but they are different products — do not conflate them.)

Two layers are independently swappable, which is the core mental model:

- **Engine** — who interprets the English and decides the steps.
  - `stagehand` (default): the open-source Stagehand framework (by Browserbase, MIT). Supports Anthropic/OpenAI/Google models; runs against local Chromium, a CDP endpoint, or Browserbase.
  - `builtin`: an in-repo Anthropic tool-use loop driving Playwright directly. Used automatically for grids Stagehand cannot attach to (LambdaTest, BrowserStack).
- **Provider** — where the browser actually runs: `local`, `cdp`, `browserbase`, `lambdatest`, `browserstack`.

Under the hood every provider returns a Playwright `Browser`/`Page`, so BrowserBash is built **on top of Playwright** rather than replacing it — it sits a layer above, replacing the hand-written selector/test code with natural language.

### Why it matters for QA

- **Selector-free E2E**: tests survive UI refactors because there are no CSS/`data-test` selectors to maintain.
- **Committable, reviewable tests**: `*_test.md` files live in the repo and read like a test case.
- **Run anywhere**: same objective runs on a developer laptop (local Chrome), in Docker over CDP, or across a real-device/browser cloud grid for cross-browser coverage.
- **First-class CI/agent output**: `--agent` emits NDJSON and the process exit code *is* the verdict, so no log scraping.
- **Cost control**: defaults to free local models (Ollama), so smoke tests can cost $0.

## Setup and installation

The published CLI installs from npm:

```bash
npm install -g browserbash-cli
browserbash --version
```

To work from source (e.g. to add a custom provider), clone the repo and link it:

```bash
# in a clone of github.com/PramodDutta/browserbash
npm install
npm run build
npm link        # exposes the `browserbash` command
```

Requirements: **Node >= 18**, and **Google Chrome stable** for the default `local` provider. (`ffmpeg` is bundled and used for session video when you record.)

Scaffold a project workspace:

```bash
browserbash init        # creates ./.browserbash/ (tests, variables, config)
```

## Choosing an LLM backend (free-first)

BrowserBash defaults to model `auto`, resolved in this order:

1. **Ollama running locally** → uses your local model (free, open-source, no API key). This is the recommended default.
2. `ANTHROPIC_API_KEY` set → an Anthropic Claude model.
3. `OPENAI_API_KEY` set → an OpenAI model.
4. Otherwise: errors with setup guidance.

The fully free / open-source stack (default engine + local Chromium + Ollama, zero cloud cost, no keys):

```bash
ollama pull qwen3                 # or any tool-capable local model
browserbash run "Open https://example.com and store the heading as 'h1'"
```

Practical tip from the project: very small local models (<= 8B) are flaky on multi-step objectives. A Qwen3 / Llama-3.3-70B-class model interprets multi-step flows far more reliably. Pick the smallest model that completes your flows deterministically.

Cloud LLM options (set the corresponding env var, then optionally pass `--model`):

```bash
# Anthropic (Stagehand or builtin engine)
export ANTHROPIC_API_KEY=sk-ant-...
browserbash run "..."

# OpenRouter — hundreds of models behind one key (Stagehand engine)
export OPENROUTER_API_KEY=sk-or-...
browserbash run "..." --model openrouter/anthropic/claude-sonnet-4-6
```

Important pairing rule: the cloud-grid providers (`lambdatest`, `browserstack`) auto-switch to the **builtin** engine, which speaks the Anthropic API. Pair those runs with `ANTHROPIC_API_KEY` (or an `ANTHROPIC_BASE_URL` gateway such as a LiteLLM proxy). Local Ollama-only setups will not drive those grids — set an Anthropic-compatible backend for grid runs.

Configuration precedence is **flags > env vars > `~/.browserbash/config.json` defaults**. Inspect and set defaults with:

```bash
browserbash config show
browserbash config set defaultProvider lambdatest
browserbash providers          # list available providers
browserbash whoami             # show resolved identity/credentials
```

## Core usage — one-shot objectives

`browserbash run "<objective>" [flags]` runs a single plain-English objective. Two patterns to know:

- **Acting**: "log in and add the first product to the cart" — the agent figures out the clicks and typing.
- **Extracting**: append `... store <value> as 'name'` and the value comes back in the result and final state.

```bash
# One-shot objective, local browser, default (Stagehand) engine
browserbash run "Open https://news.ycombinator.com and store the top story title as 'top_story'"

# Cap runtime and hide the window (good for CI)
browserbash run "Open https://example.com and verify the page contains 'Example Domain'" \
  --headless --timeout 120 --max-steps 15
```

Commonly used flags (always confirm the current set with `browserbash run --help`):

| Flag | Purpose |
|---|---|
| `--headless` | Run without a visible browser window. |
| `--timeout <seconds>` | Cap total execution time (timeout → exit code 3). |
| `--max-steps <n>` | Limit how many steps the agent may take. |
| `--agent` | Switch stdout to NDJSON for tooling/CI (see below). |
| `--record` | Capture screenshots and a session video. |
| `--provider <name>` | `local` (default), `cdp`, `browserbase`, `lambdatest`, `browserstack`. |
| `--engine <name>` | Force `stagehand` or `builtin`. |
| `--model <id>` | Pin the LLM (e.g. `ollama/qwen3`, `openrouter/<vendor>/<model>`). |
| `--cdp-endpoint <ws-url>` | Attach to an existing browser over CDP. |
| `--variables '<json>'` / `--variables-file <path>` | Provide `{{placeholder}}` values. |
| `--name <string>` | Label the run (shows in dashboards). |
| `--dashboard` | Open the local dashboard on this run afterward. |
| `--upload` | Push this run to the cloud dashboard (opt-in). |

## Core usage — committable Markdown tests (`*_test.md`)

For anything you want to review, version, and re-run, prefer a Markdown test file. Each list item is one step; `{{placeholders}}` work in every step.

```markdown
# Login flow

- Open {{base_url}}/login
- Type {{username}} into the email field
- Type {{password}} into the password field and press Enter
- Verify the dashboard heading is visible
- Store the logged-in user name as 'user_name'
```

Run it:

```bash
browserbash testmd run ./.browserbash/tests/login_test.md
browserbash testmd run ./.browserbash/tests/login_test.md --provider browserstack --agent
```

Composition: `@import ./helpers/login.md` splices another file's steps in place — factor shared setup (login, seed data) into helper files instead of copy-pasting. After every run a `Result.md` is written next to the test file recording what happened.

## Variables and secret masking

`{{key}}` placeholders are substituted in objectives and test steps. Load order (later wins):

1. Global: `~/.browserbash/variables/*.json`
2. Project: `./.browserbash/variables/*.json`
3. `--variables-file <path>`
4. `--variables '<json>'` (inline)

Mark any sensitive value as a secret so it is masked as `*****` in all logs **and** NDJSON output:

```bash
browserbash run "Log in to {{base_url}} as {{user}} with {{password}}" \
  --variables '{
    "base_url": "https://app.example.com",
    "user": "qa@example.com",
    "password": { "value": "hunter2", "secret": true }
  }'
```

Always wrap passwords, tokens, and API keys as `{"value":"...","secret":true}`. Never inline a real credential as a plain string in a committed test file or a CI log.

## Agent / NDJSON mode (for AI coding tools and CI)

`--agent` switches stdout to newline-delimited JSON — one object per line, stable schema. This is the integration surface for other agents and pipelines:

```bash
browserbash run "<objective>" --agent --headless --timeout 120
```

- **Progress events**, one per step: `{"type":"step","step":1,"status":"passed","action":"navigate","remark":"..."}`
- **Terminal event** (exactly one): `{"type":"run_end","status":"passed|failed|error|timeout","summary":"...","final_state":{...},"duration_ms":...,"test_url":"..."}`

**Exit codes** — the process exit code *is* the verdict, so a CI step needs no output parsing:

| Code | Meaning |
|---|---|
| `0` | passed |
| `1` | failed (assertion / objective not met) |
| `2` | error (crash, bad config, provider failure) |
| `3` | timeout |

When you (an AI agent) drive BrowserBash, read the NDJSON stream line by line: surface `step` events as progress, and branch on the `run_end` `status` plus the process exit code. Extracted values appear in `final_state`. Do not try to parse human-readable output for verdicts — use `--agent`.

## Running on cloud browser grids

Cross-browser / real-device coverage comes from the provider layer. Set the vendor credentials, then select the provider.

```bash
# LambdaTest / TestMu (auto-switches to builtin engine → needs an Anthropic backend)
export LT_USERNAME=... LT_ACCESS_KEY=... ANTHROPIC_API_KEY=sk-ant-...
browserbash run "Open {{base_url}} and complete checkout" --provider lambdatest --headless

# BrowserStack Automate (also builtin engine)
export BROWSERSTACK_USERNAME=... BROWSERSTACK_ACCESS_KEY=... ANTHROPIC_API_KEY=sk-ant-...
browserbash testmd run ./.browserbash/tests/checkout_test.md --provider browserstack --agent

# Browserbase (Stagehand-native)
export BROWSERBASE_API_KEY=... BROWSERBASE_PROJECT_ID=...
browserbash run "..." --provider browserbase

# Attach to any existing browser over CDP (your grid, Docker, or a Playwright MCP-managed browser)
browserbash run "..." --cdp-endpoint ws://localhost:9222/devtools/browser/<id>
```

You can persist grid credentials so you do not re-export them each run:

```bash
browserbash login --provider lambdatest --username "$LT_USERNAME" --access-key "$LT_ACCESS_KEY"
```

On LambdaTest and BrowserStack, BrowserBash reports the pass/fail status back to the grid's session, so the verdict shows correctly in the vendor dashboard.

## Recording, replay, and dashboards

Every run is kept in a private on-disk store (`~/.browserbash/runs`, secrets masked, capped at ~200 runs). Two ways to inspect them:

```bash
# Local dashboard — free, no account, fully local (nothing leaves your machine)
browserbash dashboard                          # serves http://localhost:4477
browserbash run "..." --record --dashboard     # run, then open the dashboard on this run
browserbash dashboard --clear                  # wipe the local store

# Cloud dashboard — optional, opt-in per run (history across machines, shareable links)
browserbash connect --key bb_...               # one-time key from browserbash.com/dashboard
browserbash run "..." --record --upload        # push THIS run only
```

`--record` captures screenshots and a session **video** on any engine; the **builtin** engine additionally produces a Playwright trace you can open in the Playwright trace viewer. Without `--upload`, nothing is sent to the cloud. Cloud runs are retained 15 days on the free tier (extended retention is the only paid option; the CLI is fully free and open-source with no locked features).

## CI integration (GitHub Actions)

```yaml
- run: npm install -g browserbash-cli
- run: |
    browserbash login --provider lambdatest --username "$LT_USERNAME" --access-key "$LT_ACCESS_KEY"
    browserbash testmd run .browserbash/tests/smoke_test.md --agent --headless --timeout 180
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    LT_USERNAME: ${{ secrets.LT_USERNAME }}
    LT_ACCESS_KEY: ${{ secrets.LT_ACCESS_KEY }}
```

The step fails the build automatically because the exit code carries the verdict. Use `--agent` so the logs are machine-readable, store secrets in the CI secret store (never in the test file), and set a `--timeout` so a stuck agent cannot hang the pipeline.

## Best practices

1. **Describe intent, assert outcomes.** Write objectives as a user goal ("complete checkout as a standard user") and always include an explicit verification step ("Verify the order-confirmation heading is visible"). An objective with no assertion can "pass" without proving anything.
2. **Prefer `*_test.md` over inline objectives for anything that recurs.** Committed Markdown tests are reviewable in PRs, diff cleanly, and produce a `Result.md` audit trail. Reserve `run "..."` for exploration and one-offs.
3. **Default to the free local stack for fast/smoke tests.** Local Chrome + Ollama costs nothing; reserve paid LLMs and cloud grids for cross-browser/real-device coverage where they earn their cost.
4. **Right-size the model.** Use the smallest model that completes your flows reliably; bump to a Qwen3 / Llama-3.3-70B-class (or a hosted Claude) model only when small models stumble on multi-step objectives.
5. **Always mark credentials as secrets.** Wrap them as `{"value":"...","secret":true}` so they are masked in logs and NDJSON. Keep real values in CI secrets or `~/.browserbash/variables`, not in committed files.
6. **Use `--agent` everywhere automated.** In CI and when another agent invokes BrowserBash, rely on NDJSON + the exit code for the verdict — never scrape human output.
7. **Set `--timeout` and `--max-steps`.** Natural-language agents can wander; bounding steps and time prevents runaway runs and runaway token spend.
8. **Match engine to provider.** Browserbase/local/CDP can use the default Stagehand engine; LambdaTest/BrowserStack run on the builtin engine and therefore need an Anthropic-compatible backend. Don't expect a local-Ollama-only setup to drive those grids.
9. **Record on failure-prone or flaky flows.** `--record` gives video (and a Playwright trace on the builtin engine) so you can see exactly what the agent did when a run is unexpectedly red.
10. **Factor shared steps with `@import`.** Put login and setup in a helper Markdown file and import it, so a UI change to login is fixed in one place.

## Common pitfalls

1. **Confusing BrowserBash with Browserbase / Browserless.** They are different products with similar names. BrowserBash is the CLI; Browserbase is one optional provider it can target. Verify which one a command or doc refers to.
2. **Expecting local-only models to drive cloud grids.** LambdaTest and BrowserStack use the builtin (Anthropic) engine — without `ANTHROPIC_API_KEY` (or an `ANTHROPIC_BASE_URL` gateway) those runs error.
3. **Tiny models on multi-step flows.** Sub-8B models frequently misinterpret multi-step objectives, producing flaky passes/fails. Treat non-determinism here as a model-size problem first.
4. **Hardcoding secrets in committed test files.** Without `{"secret":true}` (or by inlining a literal), credentials leak into logs and the on-disk run store. Always parameterize and mark secrets.
5. **Parsing human output in CI.** The human reporter format can change; rely on `--agent` NDJSON and the exit code instead.
6. **No timeout / no max-steps.** An ambiguous objective can loop or stall; an unbounded run wastes time and tokens. Always bound automated runs.
7. **Vague objectives without an assertion.** "Go to the dashboard" with no verification can succeed while the app is actually broken. State what must be true at the end.
8. **Assuming exact flag/model strings never change.** This is an actively developed young tool. Run `browserbash --help` / `browserbash <command> --help` and check the official docs (`browserbash.com/learn`) when an exact spelling matters.
9. **Forgetting `--upload` is opt-in (and the inverse).** Nothing reaches the cloud dashboard without `--upload`; conversely, do upload sensitive runs only deliberately. Local history is always kept on disk regardless.
10. **Skipping `browserbash init`.** Running without the `./.browserbash/` workspace means no project-scoped variables, config, or test conventions — scaffold first so variable resolution and defaults work as expected.

## Summary

BrowserBash lets you (or an AI coding agent) automate and test the web in plain English: write a one-shot objective or a committable `*_test.md`, run it on local Chrome or a cloud grid, drive it with a free local model or any cloud LLM, mask secrets, and consume NDJSON results with CI-grade exit codes. Treat it as a natural-language layer on top of Playwright: describe intent, assert outcomes, bound the run, keep credentials secret, and verify exact command/model strings against `--help` and the official docs since the project is evolving.
