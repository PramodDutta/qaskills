import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Promptfoo Tutorial: LLM Prompt Testing and Evals (2026)',
  description:
    'A hands-on promptfoo tutorial for 2026: write YAML configs, run promptfoo eval, add assertions, compare models, and red-team your LLM prompts.',
  date: '2026-07-01',
  category: 'Guide',
  content: `
# Promptfoo Tutorial: LLM Prompt Testing and Evals (2026)

If you have ever tweaked a prompt, eyeballed a couple of outputs, and shipped it, you already know the problem: prompt changes are invisible regressions waiting to happen. A wording change that fixes one case silently breaks five others, a model upgrade shifts behavior in ways no manual spot-check will catch, and there is no diff you can review because the "code" is natural language and the output is probabilistic. Promptfoo is the open-source tool that fixes this. It lets you define your prompts, test cases, and pass/fail assertions in a simple YAML file, then run \`promptfoo eval\` from the command line to score every prompt-and-model combination side by side. It is, in effect, unit testing and A/B testing for LLM prompts.

This tutorial is a complete, practical walkthrough of promptfoo as it works in 2026. You will install it, write your first config, add deterministic and model-graded assertions, compare multiple models in one matrix, hook variables and CSV datasets into your tests, wire promptfoo into CI, and even run adversarial red-team scans against your own prompts. Every example is real and runnable. Whether you are an SDET moving into LLM quality, a prompt engineer who wants a safety net, or a team lead trying to make prompt changes reviewable, promptfoo is the tool that turns "trust me, it's better" into evidence. For the bigger picture of testing AI systems, see our guide to [vibe testing](/blog/vibe-testing-ai-first-qa-guide) and the full catalog of [QA skills](/skills).

## What Is Promptfoo and Why LLM Prompts Need Tests

Promptfoo is a CLI-first evaluation framework for LLMs. You describe what you want to test in a declarative config: which prompts, which providers (models), which inputs, and what "correct" means. Promptfoo then runs the full cross-product, collects every output, applies your assertions, and renders a color-coded grid so you can see at a glance which prompt and model combination wins.

The reason this matters is that LLM behavior is non-deterministic and sensitive to tiny changes. Without a test harness, every prompt edit is a gamble. With promptfoo, a prompt is code with a test suite: you can refactor it, upgrade the model behind it, and prove the change is an improvement instead of hoping. Because the config is plain YAML checked into git, prompt changes become reviewable pull requests with a measurable before-and-after.

| Capability | What it gives you |
|---|---|
| Prompt comparison | Test many prompt variants against the same inputs |
| Model comparison | Run the same prompts across GPT, Claude, and local models |
| Assertions | Deterministic and LLM-graded pass/fail checks |
| Datasets | Drive tests from inline vars or external CSV files |
| Red-teaming | Automated adversarial and jailbreak scans |
| CI integration | Fail builds when quality drops below a threshold |

## Installing Promptfoo

Promptfoo ships as an npm package and runs with Node.js 18 or newer. You can install it globally or, better for reproducibility, run it with npx so the version is pinned per project.

\`\`\`bash
# Run without installing (recommended for CI)
npx promptfoo@latest init

# Or install globally
npm install -g promptfoo
promptfoo --version
\`\`\`

Set the API keys for whichever providers you plan to test. Promptfoo reads them from environment variables, so nothing sensitive ends up in your config file.

\`\`\`bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
\`\`\`

Running \`init\` scaffolds a \`promptfooconfig.yaml\` in the current directory. That YAML file is the heart of everything, so let us build one from scratch to understand each part.

## Your First promptfooconfig.yaml

A minimal config has three ingredients: the prompts you want to test, the providers to run them on, and the test cases with their assertions. Here is a working example that tests a customer-support summarization prompt.

\`\`\`yaml
# promptfooconfig.yaml
description: "Support ticket summarizer eval"

prompts:
  - "Summarize this support ticket in one sentence: {{ticket}}"

providers:
  - openai:gpt-4o-mini

tests:
  - vars:
      ticket: "My login button does nothing after the latest update on Chrome."
    assert:
      - type: contains
        value: "login"
      - type: llm-rubric
        value: "The summary is a single clear sentence about a login issue"

  - vars:
      ticket: "I was charged twice for my annual subscription this month."
    assert:
      - type: contains-any
        value: ["charge", "billing", "payment"]
      - type: llm-rubric
        value: "Accurately describes a double-billing problem"
\`\`\`

Run it with a single command and promptfoo prints a results table right in your terminal.

\`\`\`bash
npx promptfoo@latest eval
\`\`\`

Each row is a test case, each cell shows the model output plus which assertions passed, and the summary line tells you the overall pass rate. The \`{{ticket}}\` syntax is a Nunjucks variable that promptfoo substitutes from each test's \`vars\` block.

## Viewing Results in the Web UI

The terminal grid is great for a quick glance, but for anything beyond a few cases the browser view is far easier to read. Promptfoo ships a local web UI that renders the full matrix, lets you filter to failures, and shows the exact prompt sent to each model.

\`\`\`bash
npx promptfoo@latest eval
npx promptfoo@latest view
\`\`\`

The \`view\` command opens a local dashboard where you can click into any cell to inspect the rendered prompt, the raw response, and the reasoning behind each model-graded assertion. This is invaluable when an assertion fails and you need to see whether the prompt, the model, or the assertion itself is the problem.

## Understanding Assertions: The Core of Testing

Assertions are what turn a demo into a test. Promptfoo supports two broad families. Deterministic assertions are fast, free, and exact: they check things like substring presence, regex matches, JSON validity, or latency. Model-graded assertions use an LLM to judge fuzzy qualities like tone, correctness, or helpfulness that no regex can capture.

| Assertion type | Category | Example use |
|---|---|---|
| contains / icontains | Deterministic | Output must mention a keyword |
| regex | Deterministic | Output matches a pattern |
| is-json | Deterministic | Output is valid JSON |
| javascript | Deterministic | Custom code returns pass/fail |
| latency | Deterministic | Response under N milliseconds |
| llm-rubric | Model-graded | Output meets a described standard |
| answer-relevance | Model-graded | Output addresses the input |
| factuality | Model-graded | Output matches a reference fact |

Here is a richer test that combines several assertion types to validate a structured JSON extraction prompt.

\`\`\`yaml
tests:
  - vars:
      email: "Ship 3 blue widgets to 221B Baker Street by Friday."
    assert:
      - type: is-json
      - type: javascript
        value: "JSON.parse(output).quantity === 3"
      - type: latency
        threshold: 4000
      - type: llm-rubric
        value: "Correctly extracts quantity, color, and address as JSON"
\`\`\`

The \`javascript\` assertion is especially powerful: \`output\` is the model's response, and any expression that returns a truthy value passes. This lets you enforce precise structural contracts without waiting on an LLM judge.

## Comparing Multiple Models Side by Side

One of promptfoo's best features is model comparison. Add more providers and promptfoo runs every prompt against every model, so you can see cost, latency, and quality trade-offs in a single grid. This is how you make an informed model-selection decision instead of a vibes-based one.

\`\`\`yaml
description: "Model bake-off for summarization"

prompts:
  - "Summarize in one sentence: {{ticket}}"

providers:
  - openai:gpt-4o-mini
  - openai:gpt-4o
  - anthropic:messages:claude-3-5-haiku-latest

tests:
  - vars:
      ticket: "The mobile app crashes when I open the settings screen."
    assert:
      - type: llm-rubric
        value: "Accurate one-sentence summary of an app crash"
\`\`\`

Run \`promptfoo eval\` and the grid puts each model in its own column. Promptfoo also reports token usage and latency per cell, so you can weigh whether the pricier model's quality gain justifies its cost for your workload. Our roundup of [AI test automation tools](/blog/ai-test-automation-tools-2026) puts this kind of comparison in context alongside other evaluation frameworks.

## Driving Tests with Datasets and Variables

Hardcoding test cases in YAML is fine to start, but real coverage needs volume. Promptfoo can pull test cases from an external CSV file, which lets non-engineers contribute cases in a spreadsheet and keeps large datasets out of your config.

\`\`\`yaml
prompts:
  - "Classify the sentiment of this review as positive, negative, or neutral: {{review}}"

providers:
  - openai:gpt-4o-mini

tests: file://tests/sentiment_cases.csv
\`\`\`

The CSV uses column headers as variable names, plus special \`__expected\` columns to declare assertions inline.

\`\`\`csv
review,__expected
"Absolutely love this product, works perfectly!",contains: positive
"Terrible experience, it broke on day one.",contains: negative
"It's okay, nothing special.",contains: neutral
\`\`\`

Now a single \`promptfoo eval\` runs every row in the file. You can grow this dataset to hundreds of cases without touching the YAML, which is the practical path to real regression coverage.

## Integrating Promptfoo Into CI/CD

Tests only prevent regressions when they run automatically. Promptfoo returns a non-zero exit code when assertions fail, so plugging it into CI is a two-line job. Here is a GitHub Actions workflow that gates every pull request on prompt quality, the same shift-left mindset we describe in [testing AI generated code](/blog/testing-ai-generated-code-sdet-playbook).

\`\`\`yaml
# .github/workflows/promptfoo.yml
name: LLM Prompt Eval
on: [pull_request]

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Run promptfoo
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
        run: npx promptfoo@latest eval --no-progress-bar
\`\`\`

You can also enforce a minimum pass rate so occasional model noise does not block a PR while real regressions still fail the build.

\`\`\`bash
npx promptfoo@latest eval --no-progress-bar --pass-rate-threshold 0.9
\`\`\`

Store the eval output as a CI artifact and, over time, you build a history of exactly how each prompt change moved your quality metrics. That audit trail is what makes prompt engineering a real engineering discipline.

## Comparing Prompt Variants to Optimize Wording

Beyond comparing models, promptfoo shines at comparing prompt phrasings against the same inputs and models. Small wording changes can meaningfully shift quality, cost, and format compliance, and the only way to know which variant wins is to measure. List several prompt strings and promptfoo runs each one across your entire test suite, so you can pick the phrasing that scores best rather than the one that sounds best.

\`\`\`yaml
description: "Prompt wording bake-off"

prompts:
  - "Summarize this ticket in one sentence: {{ticket}}"
  - "You are a support triage bot. In exactly one sentence, summarize: {{ticket}}"
  - "Give a concise one-line summary of the customer issue below.\\n\\n{{ticket}}"

providers:
  - openai:gpt-4o-mini

tests:
  - vars:
      ticket: "Password reset email never arrives even after several tries."
    assert:
      - type: llm-rubric
        value: "A single concise sentence naming a password reset email problem"
      - type: javascript
        value: "output.split('.').filter(Boolean).length <= 1"
\`\`\`

The grid makes the winner obvious: one prompt column will pass more assertions or hit fewer format violations. Because the config is in git, the chosen prompt and its winning evidence live together in the same pull request, which is precisely how prompt engineering becomes reviewable. This is the wider discipline we describe across our [QA skills](/skills) library.

## Caching and Controlling Evaluation Cost

Running large evals repeatedly against paid APIs adds up, so promptfoo caches responses by default. Identical prompt-and-provider combinations reuse a cached result instead of re-calling the model, which makes iterating on assertions essentially free once the outputs exist. You control the cache explicitly when you need fresh results, for example after changing a model version.

\`\`\`bash
# Reuse cached model outputs (fast, cheap iteration on assertions)
npx promptfoo@latest eval

# Force fresh model calls, ignoring the cache
npx promptfoo@latest eval --no-cache

# Clear the cache entirely
npx promptfoo@latest cache clear
\`\`\`

A smart workflow is to run once with real model calls, then iterate on your assertions repeatedly against the cache at zero cost until they express exactly what you mean. Only then do you re-run with fresh calls to confirm. This separation keeps your feedback loop tight without a surprising API bill, especially when your dataset grows into the hundreds of cases.

## Red-Teaming and Adversarial Testing

Beyond correctness, promptfoo can attack your own system to find safety and security holes before an adversary does. The red-team feature auto-generates adversarial inputs targeting jailbreaks, prompt injection, PII leakage, and harmful content, then reports which ones your prompt failed to defend against.

\`\`\`bash
npx promptfoo@latest redteam init
npx promptfoo@latest redteam run
npx promptfoo@latest redteam report
\`\`\`

The generated config lets you specify your application's purpose and which attack plugins to run. Promptfoo then crafts targeted probes and grades whether your system held up. This is essential for any customer-facing LLM feature. If your prompts drive tools or agents through the Model Context Protocol, pair this with the practices in [MCP for QA engineers](/blog/mcp-for-qa-engineers-guide) so both the prompt and the tool layer are hardened.

## Testing Prompts That Call Tools and Functions

Modern LLM features rarely just return text; they call tools, return structured JSON, or drive an agent. Promptfoo can validate these too. By combining the is-json assertion with javascript checks, you enforce a strict schema contract on function-calling output, catching the day a model quietly changes its argument names or drops a field.

\`\`\`yaml
prompts:
  - "Extract the meeting details as JSON with keys title, date, attendees: {{note}}"

providers:
  - openai:gpt-4o-mini

tests:
  - vars:
      note: "Sync with Priya and Sam about Q3 roadmap on July 10."
    assert:
      - type: is-json
      - type: javascript
        value: |
          const o = JSON.parse(output);
          return Array.isArray(o.attendees) && o.attendees.length === 2;
      - type: javascript
        value: "JSON.parse(output).title.length > 0"
\`\`\`

Multi-line javascript assertions can express arbitrarily precise contracts, and because they run instantly and for free, they are ideal for the structural guarantees that agent pipelines depend on. When these outputs feed a real tool layer, validate that layer too using the patterns in [MCP for QA engineers](/blog/mcp-for-qa-engineers-guide).

## Using Custom Providers and Configuration

Beyond hosted APIs, promptfoo can call local models, HTTP endpoints, or your own application through a custom provider. You can also tune generation parameters like temperature per provider so your eval reflects exactly how the prompt runs in production. Lowering temperature during evaluation reduces run-to-run variance and makes assertions more stable.

\`\`\`yaml
providers:
  - id: openai:gpt-4o-mini
    config:
      temperature: 0
      max_tokens: 256
  - id: http://localhost:11434/api/generate
    config:
      body:
        model: "llama3.1"
        stream: false
\`\`\`

Pointing a provider at your own running application is often the most valuable configuration of all, because it tests the real prompt-plus-model-plus-post-processing stack rather than the prompt in isolation. That end-to-end coverage is closer to what your users actually experience.

## Best Practices for Reliable Prompt Evals

Keep your config in version control and treat every prompt change as a pull request with an eval diff attached, so reviewers see the measurable impact. Mix deterministic and model-graded assertions: lean on cheap exact checks wherever possible and reserve LLM-graded rubrics for genuinely fuzzy qualities, because model-graded checks cost money and carry variance. Pin your provider and model versions so results are reproducible, and pin the grader model for llm-rubric assertions for the same reason. Grow your dataset from real production failures rather than imagined happy paths, and set a pass-rate threshold rather than demanding a perfect score, since a small amount of non-determinism is normal. Finally, run red-team scans on a schedule, not just once, because new attack techniques and model updates constantly change your exposure.

## Frequently Asked Questions

### What is promptfoo used for?

Promptfoo is an open-source tool for testing and evaluating LLM prompts. You define prompts, models, test cases, and pass/fail assertions in a YAML config, then run promptfoo eval to score every combination side by side. It functions as unit testing and A/B testing for prompts, catching regressions when you change a prompt or upgrade a model.

### How do I run a promptfoo eval?

Install promptfoo with npm or run it via npx, create a promptfooconfig.yaml describing your prompts, providers, and tests, then run npx promptfoo eval from that directory. The command runs every prompt against every model and applies your assertions, printing a results grid in the terminal. Run promptfoo view to open a browser dashboard with the full matrix.

### What is the difference between deterministic and model-graded assertions?

Deterministic assertions like contains, regex, and is-json check exact, code-verifiable conditions; they are fast, free, and reproducible. Model-graded assertions like llm-rubric and factuality use an LLM to judge fuzzy qualities such as tone or correctness that no pattern can capture. Best practice is to use deterministic checks wherever possible and reserve model-graded ones for genuinely subjective criteria.

### Can promptfoo compare different LLM models?

Yes. List multiple providers such as openai:gpt-4o and anthropic:messages:claude-3-5-haiku-latest in the config, and promptfoo runs the same prompts and tests against each one. The results grid puts each model in its own column with token usage and latency, so you can weigh quality against cost and pick the best model for your specific workload with real evidence.

### How do I add promptfoo to a CI/CD pipeline?

Promptfoo exits with a non-zero code when assertions fail, so add a CI step that runs npx promptfoo eval with your provider API keys supplied as secrets. In GitHub Actions this is a few lines on the pull_request trigger. Use the pass-rate-threshold flag to require a minimum pass rate, which blocks real regressions while tolerating minor model non-determinism.

### Does promptfoo support red-teaming and security testing?

Yes. Promptfoo includes a red-team feature that auto-generates adversarial inputs for jailbreaks, prompt injection, PII leakage, and harmful content. Run redteam init to configure it, redteam run to execute the attacks, and redteam report to see which probes your prompt failed. This helps you find and fix safety holes before shipping a customer-facing LLM feature.

### Is promptfoo free and open source?

Yes, promptfoo is open source and free to run locally through the CLI. You only pay the usual API costs for whichever LLM providers your evaluations call. There is an optional hosted offering for teams that want shared dashboards and collaboration, but the core evaluation and red-teaming functionality runs entirely from your own machine or CI environment.

## Conclusion

Promptfoo brings the discipline of automated testing to the fuzzy world of LLM prompts. By declaring your prompts, models, and assertions in version-controlled YAML and running promptfoo eval, you turn every prompt change into a reviewable, measurable pull request instead of a gamble. Start with a handful of test cases and deterministic assertions, layer in model-graded rubrics and multi-model comparisons, grow your dataset from real failures, and gate CI on a sensible pass-rate threshold. Then add red-team scans to catch the safety issues no functional test would find.

Want to build these evaluation skills into your everyday workflow? Browse the full library of [QA skills](/skills) for AI coding agents and start shipping LLM features you can actually trust.
`,
};
