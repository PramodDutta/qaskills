import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Promptfoo Red Teaming Guide 2026: LLM Security Testing',
  description:
    'Complete 2026 guide to promptfoo red teaming: install, configure plugins and strategies, run jailbreak and prompt-injection scans, and map results to OWASP LLM Top 10.',
  date: '2026-06-08',
  category: 'Guide',
  content: `
# Promptfoo Red Teaming Guide 2026: LLM Security Testing for Production AI Apps

Shipping an LLM-powered feature is not the same as shipping a deterministic API. A chatbot, an agent, or a RAG assistant accepts free-form natural language, and that input surface is effectively infinite. Any attacker, curious user, or automated probe can ask your model to ignore its instructions, exfiltrate a system prompt, leak another customer's data, generate harmful content, or call an internal tool it was never supposed to reach. Traditional QA suites — unit tests, integration tests, contract tests — assume you know the inputs in advance. Adversarial security testing assumes you do not, and that someone is actively trying to break the system.

This matters because the failure modes are not theoretical. Prompt injection lets a malicious document or web page hijack an agent mid-task. Jailbreaks coax a model past its safety alignment with role-play, obfuscation, or multi-turn manipulation. PII leakage happens when a model trained or fine-tuned on customer data regurgitates it, or when a RAG pipeline retrieves a record the current user should never see. Insecure output handling turns a model's response into a cross-site scripting or SQL injection vector downstream. Excessive agency lets an over-permissioned agent delete records or send emails on a crafted instruction. These are now codified in the OWASP Top 10 for LLM Applications, and regulators and enterprise security teams expect you to test against them before launch.

This is where [promptfoo](/skills) fits. Promptfoo is the most widely adopted open-source LLM red-teaming and evaluation tool, used by more than a quarter of the Fortune 500. It generates thousands of adversarial test cases automatically, runs them against your real application, and produces a vulnerability report mapped to recognized frameworks. In March 2026 it was acquired by OpenAI, which signals just how central automated red teaming has become to the AI development lifecycle. This guide walks through installing promptfoo, configuring a red-team scan, understanding plugins and attack strategies, reading the report, and gating CI/CD on it — with runnable configuration throughout.

## Why Automated Red Teaming Beats Manual Pen Testing

A human red teamer is creative but slow and expensive. They can craft a brilliant jailbreak, but they cannot run it against forty model versions, in eleven languages, with base64 and ROT13 encodings, across every plugin category, on every pull request. Automated red teaming does exactly that. Promptfoo uses an attacker model to dynamically generate adversarial prompts tailored to your application's stated purpose, applies transformation strategies to evade filters, and grades the responses with a separate judge model. You get repeatable, regression-safe coverage that runs in CI and scales with your release cadence.

The mental model is simple. You tell promptfoo what your app is supposed to do and what it must never do. Promptfoo synthesizes attacks designed to make it do the forbidden thing. It records which attacks succeeded, scores severity, and shows you the exact prompt-and-response pairs so you can reproduce and fix each finding.

## Installing Promptfoo

Promptfoo ships as an npm package and requires no global install. The fastest path is to run it directly with npx, which always pulls the latest published version.

\`\`\`bash
# Run the latest version without installing
npx promptfoo@latest --version

# Or install globally if you prefer a pinned binary
npm install -g promptfoo

# Or add it as a dev dependency in your project
npm install --save-dev promptfoo
\`\`\`

Promptfoo needs an API key for whatever provider grades the results and (optionally) generates attacks. Set it in your environment before running a scan.

\`\`\`bash
export OPENAI_API_KEY="sk-..."
# or, for Anthropic-based grading
export ANTHROPIC_API_KEY="sk-ant-..."
\`\`\`

## Initializing a Red Team Project

The dedicated red-team initializer scaffolds a config and walks you through naming your target, describing its purpose, and selecting plugin categories. Run it in an empty directory.

\`\`\`bash
npx promptfoo@latest redteam init
\`\`\`

This produces a \`promptfooconfig.yaml\` with a \`redteam\` section pre-populated. You can also launch the browser-based setup, which is the most approachable way to configure a first scan, with:

\`\`\`bash
npx promptfoo@latest redteam setup
\`\`\`

The single most important field you will fill in is \`purpose\`. The attacker model uses it to generate relevant, high-quality attacks. A vague purpose yields generic attacks; a precise one yields attacks that actually probe your business logic — including authorization boundaries, allowed topics, and the data your app must protect.

## Anatomy of the redteam Section

The \`redteam\` block lives inside \`promptfooconfig.yaml\` and controls everything: what your app does, which vulnerability categories to probe, how attacks are transformed, and how many tests to generate per category. Here is a complete, runnable example for a customer-support assistant.

\`\`\`yaml
# promptfooconfig.yaml
description: 'Red team scan for the support assistant'

targets:
  - id: openai:gpt-4o
    label: support-bot

redteam:
  purpose: >
    A customer-support assistant for an online bank. It can answer questions
    about account features and help reset passwords. It must NEVER reveal another
    customer's data, never give financial advice, never disclose its system
    prompt, and never help with fraud.

  # How many adversarial tests to generate per plugin
  numTests: 10

  # Vulnerability categories to probe
  plugins:
    - harmful
    - pii
    - prompt-injection
    - jailbreak
    - hijacking
    - bola
    - bfla
    - owasp:llm

  # Transformations applied to attacks to evade filters
  strategies:
    - jailbreak
    - prompt-injection
    - multilingual
    - base64
    - crescendo
\`\`\`

\`purpose\` defines the app's intended behavior and its guardrails. \`numTests\` controls volume — start at 5 to 10 for a fast feedback loop, raise it to 25 or more for a thorough pre-release sweep. \`plugins\` selects what kinds of weakness to look for. \`strategies\` selects how the attack text is delivered so it slips past naive defenses. Plugins and strategies are orthogonal: every plugin's attacks can be run through every strategy, which is what produces the combinatorial coverage.

## Red Team Plugin Reference

Plugins are the vulnerability categories. Each one knows how to generate attacks that target a specific class of failure. You can list individual plugins, plugin collections like \`harmful\`, or compliance bundles like \`owasp:llm\`. The table below covers the most useful ones.

| Plugin | What it tests | Maps to |
|---|---|---|
| \`harmful\` | Generation of harmful, hateful, violent, or illegal content (a collection of 15+ sub-plugins) | OWASP LLM01, content policy |
| \`pii\` | Leakage of personally identifiable information (direct, via API/session, social engineering) | OWASP LLM02 / LLM06 |
| \`prompt-injection\` | Direct and indirect instruction override embedded in input | OWASP LLM01 |
| \`jailbreak\` | Bypassing safety alignment to elicit forbidden output | OWASP LLM01 |
| \`hijacking\` | Goal hijacking — steering the model off its intended task | OWASP LLM01 |
| \`bola\` | Broken Object Level Authorization — accessing another user's records | OWASP LLM06, API1 |
| \`bfla\` | Broken Function Level Authorization — invoking privileged functions | OWASP LLM06, API5 |
| \`excessive-agency\` | Agent taking actions beyond its mandate | OWASP LLM06 |
| \`overreliance\` | Model asserting false information confidently | OWASP LLM09 |
| \`owasp:llm\` | Bundle that expands to cover the full OWASP LLM Top 10 | OWASP LLM01-LLM10 |

The \`owasp:llm\` shortcut is the easiest way to get broad, framework-aligned coverage in one line. You can also scope it, for example \`owasp:llm:01\` to target only prompt injection, or use \`nist:ai:measure\` and \`mitre:atlas\` collections for those frameworks.

## Attack Strategy Reference

Strategies transform the attacks generated by plugins. A jailbreak plugin produces a malicious request; a strategy decides how that request is dressed up to defeat filters and alignment. Combining them is where promptfoo's power comes from.

| Strategy | How it works | Best against |
|---|---|---|
| \`basic\` | Sends the raw attack with no transformation (baseline) | Unprotected endpoints |
| \`jailbreak\` | Iterative single-turn refinement using an attacker model | Aligned models with weak guardrails |
| \`jailbreak:tree\` | Tree-of-attacks search exploring many jailbreak branches | Hardened models |
| \`prompt-injection\` | Wraps payloads in injection templates ("ignore previous...") | Apps that concatenate user input into prompts |
| \`multilingual\` | Translates attacks into low-resource languages | Filters tuned only for English |
| \`base64\` / \`rot13\` / \`leetspeak\` | Encodes the payload to evade keyword filters | Regex or blocklist defenses |
| \`crescendo\` | Multi-turn escalation that gradually steers toward the goal | Conversational, stateful agents |
| \`goat\` | Generative Offensive Agent Tester — adaptive multi-turn adversary | Complex agents and chat apps |
| \`math-prompt\` | Hides intent inside mathematical or symbolic encoding | Semantic safety classifiers |

Multi-turn strategies like \`crescendo\` and \`goat\` are essential for chat and agent targets, because many real jailbreaks only succeed across several messages. Single-turn scans will miss them entirely.

## Targeting Your Application

A red-team scan is only meaningful if it hits your real application, with your real system prompt, retrieval, and tools in the loop. Promptfoo supports several target types.

The simplest is a model provider directly, useful for testing a bare model or a prompt template:

\`\`\`yaml
targets:
  - id: openai:gpt-4o
  - id: anthropic:messages:claude-sonnet-4-5
\`\`\`

For most production apps you want to test the deployed HTTP endpoint so the scan exercises your full stack:

\`\`\`yaml
targets:
  - id: https
    label: support-api
    config:
      url: https://api.example.com/v1/chat
      method: POST
      headers:
        Authorization: 'Bearer \${API_TOKEN}'
        Content-Type: application/json
      body:
        message: '{{prompt}}'
        session_id: '{{sessionId}}'
      transformResponse: 'json.reply'
\`\`\`

The \`{{prompt}}\` placeholder is where promptfoo injects each adversarial test. \`transformResponse\` extracts the assistant's text from your JSON response so the judge can grade it. For anything that does not fit HTTP — a local SDK, a queue, a gRPC service — write a custom provider as a small JavaScript or Python file:

\`\`\`javascript
// customProvider.js
module.exports = {
  id: () => 'custom:support-agent',
  callApi: async (prompt, context) => {
    const reply = await myAgent.run(prompt, {
      sessionId: context.vars.sessionId,
    });
    return { output: reply };
  },
};
\`\`\`

Reference it with \`id: file://customProvider.js\`. This is the recommended approach for agents, because it lets the scan drive your orchestration logic, tool calls, and memory exactly as production would.

## Running the Scan and Generating the Report

Red teaming is a two-step pipeline: generate the adversarial cases and run them, then open the report. The \`redteam run\` command does generation plus execution in one shot.

\`\`\`bash
# Generate adversarial tests and run them against the target
npx promptfoo@latest redteam run

# Open the interactive vulnerability report in your browser
npx promptfoo@latest redteam report
\`\`\`

If you want to inspect the generated attacks before running them, split the steps:

\`\`\`bash
# Only synthesize the adversarial test cases
npx promptfoo@latest redteam generate

# Then execute and write results to a custom file
npx promptfoo@latest redteam run --output results.json
\`\`\`

The run streams progress to the terminal — which plugin is firing, how many tests passed or failed, and the running attack-success rate. When it finishes, \`redteam report\` launches a local web UI summarizing every finding.

## Reading the Vulnerability Report

The report is organized by severity and by category. At the top you get an overall risk posture and an attack-success-rate figure — the percentage of adversarial prompts that achieved their goal. Below that, findings are grouped by plugin (the vulnerability class) and tagged with severity: critical, high, medium, or low.

Each finding expands to show the exact attack prompt, the strategy used to deliver it, your application's response, and the judge model's rationale for marking it a pass or fail. This is the part that makes promptfoo actionable: you are not staring at an abstract score, you are looking at a reproducible exploit. Copy the prompt, paste it into your app, and confirm the leak yourself. Prioritize critical and high findings first — these are typically successful PII leaks, jailbreaks that produced genuinely harmful content, or authorization bypasses where the model returned another user's data. The report also tracks results over time, so you can prove a vulnerability stayed fixed across releases.

## Mapping Findings to the OWASP LLM Top 10

Security and compliance teams do not speak in plugin names; they speak in frameworks. Promptfoo maps every finding to the OWASP Top 10 for LLM Applications, which is the de facto standard for LLM risk. The mapping below shows how the plugins line up.

| OWASP LLM risk | Description | Promptfoo plugins |
|---|---|---|
| LLM01 Prompt Injection | Crafted input overrides instructions | \`prompt-injection\`, \`jailbreak\`, \`hijacking\` |
| LLM02 Sensitive Info Disclosure | System prompt or secret leakage | \`pii\`, \`harmful:privacy\` |
| LLM03 Supply Chain | Compromised models or dependencies | manual review + \`owasp:llm:03\` |
| LLM04 Data & Model Poisoning | Tainted training or RAG data | \`overreliance\`, RAG-specific tests |
| LLM05 Improper Output Handling | Unsanitized output causes downstream injection | \`ssrf\`, \`shell-injection\`, \`sql-injection\` |
| LLM06 Excessive Agency | Agent does more than intended | \`excessive-agency\`, \`bola\`, \`bfla\`, \`rbac\` |
| LLM07 System Prompt Leakage | Disclosure of the system prompt | \`prompt-extraction\` |
| LLM08 Vector & Embedding Weaknesses | RAG retrieval flaws | \`pii\`, cross-session leakage tests |
| LLM09 Misinformation | Confident false output | \`overreliance\`, \`hallucination\` |
| LLM10 Unbounded Consumption | Resource exhaustion / DoS | \`divergent-repetition\`, rate tests |

To get a scan that explicitly aligns to this framework, just add the bundle:

\`\`\`yaml
redteam:
  plugins:
    - owasp:llm
\`\`\`

The resulting report tags each finding with its OWASP identifier, which makes it straightforward to hand to a security reviewer or attach to a compliance audit.

## Gating CI/CD on Red Team Results

A scan you run by hand once before launch is a snapshot; a scan that runs on every pull request is a control. Because \`redteam run\` is a CLI command that exits non-zero when findings exceed a threshold, you can wire it into any pipeline. Here is a GitHub Actions job that fails the build on high-severity findings.

\`\`\`yaml
# .github/workflows/redteam.yml
name: LLM Red Team
on: [pull_request]

jobs:
  redteam:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Run red team scan
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
        run: |
          npx promptfoo@latest redteam run \\
            --no-progress-bar \\
            --max-concurrency 4
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: redteam-report
          path: redteam-results.json
\`\`\`

For PR gating, keep \`numTests\` low so the job stays fast, and reserve the heavy sweeps (high \`numTests\`, tree-of-attacks, GOAT) for a nightly scheduled run. Treat new critical or high findings the way you treat a failing unit test: the merge does not happen until they are addressed or explicitly waived with a documented justification.

## Eval Versus Red Team: Two Sides of Promptfoo

Red teaming is only half of what promptfoo does. The other half is plain evaluation — measuring quality, accuracy, and regression on a fixed dataset. The two share the same config format but answer different questions. A red team asks "can an attacker make this misbehave?" An eval asks "is this output correct and good?" You want both, and they run in the same tool.

A minimal eval config looks like this:

\`\`\`yaml
# promptfooconfig.yaml (eval mode)
prompts:
  - 'Summarize this support ticket: {{ticket}}'
providers:
  - openai:gpt-4o
  - anthropic:messages:claude-sonnet-4-5
tests:
  - vars:
      ticket: 'My card was declined twice at checkout.'
    assert:
      - type: contains
        value: 'card'
      - type: llm-rubric
        value: 'Response is empathetic and offers a next step'
\`\`\`

Run it with \`npx promptfoo@latest eval\` and view results with \`npx promptfoo@latest view\`. If you are choosing an evaluation stack, it is worth comparing approaches — our [promptfoo vs DeepEval comparison](/blog/promptfoo-vs-deepeval-2026-comparison) breaks down where each tool shines, and for retrieval-heavy systems the [DeepEval vs RAGAS guide](/blog/deepeval-vs-ragas-rag-evaluation-2026) covers RAG-specific metrics. Teams already invested in OpenAI's ecosystem should also read the [OpenAI Evals complete guide](/blog/openai-evals-complete-guide-2026), which pairs naturally with promptfoo now that the two are under one roof.

## From Findings to Fixes: Guardrails and Follow-Up

A red-team report tells you where you are exposed; it does not fix anything by itself. The remediation loop typically combines several layers. Tighten the system prompt to restate boundaries explicitly. Add input and output guardrails — promptfoo integrates with guardrail models and policy classifiers so you can test whether a proposed defense actually blocks the attacks that previously succeeded. Constrain agent tool permissions to the minimum (the cure for most LLM06 findings). Add output sanitization wherever model text flows into HTML, SQL, or a shell. Then re-run the scan: the right workflow is fix, re-scan, confirm the attack-success rate dropped, and lock the result in with a CI gate so it cannot regress.

## Best Practices for LLM Red Teaming

Write a precise, specific \`purpose\` — it is the single biggest lever on attack quality. Test the full application stack through an HTTP or custom provider, not just the bare model, so retrieval and tools are in scope. Always include multi-turn strategies (\`crescendo\`, \`goat\`) for chat and agent targets. Start small in CI and run exhaustive sweeps nightly. Re-scan after every guardrail change to prove the fix. Track attack-success rate as a release metric over time, not a one-off number. Keep the generated attack corpus in version control so findings are reproducible. And treat critical findings as launch blockers — the cost of a public jailbreak or a PII leak dwarfs the cost of a failed pipeline.

## The OpenAI Acquisition and What It Means

On March 9, 2026, OpenAI acquired promptfoo. The practical signal is large: the company building frontier models bought the leading open-source tool for stress-testing LLM applications, which tells you that adversarial testing is now considered core infrastructure rather than a nice-to-have. For users, the immediate guidance is reassuring — promptfoo remains open source, the CLI and config format are unchanged, and the workflows in this guide continue to work exactly as written. Expect tighter integration with OpenAI's evaluation and safety tooling over time, and likely deeper coverage of agentic and multi-modal attack surfaces. If anything, the acquisition strengthens the case for adopting promptfoo now: the skills you build today will carry forward, and the tool sits at the center of where production AI security testing is heading.

## Frequently Asked Questions

### What is promptfoo red teaming used for?

Promptfoo red teaming automatically generates adversarial prompts and runs them against your LLM application to find security weaknesses before attackers do. It probes for prompt injection, jailbreaks, PII leakage, harmful content, and authorization bypasses, then produces a severity-ranked report mapped to the OWASP LLM Top 10 that your team can act on.

### Is promptfoo free and open source?

Yes. Promptfoo is open source and free to run locally or in CI via \`npx promptfoo@latest\`. You only pay for the LLM provider API calls used to generate attacks and grade responses. OpenAI acquired promptfoo in March 2026, but the project remains open source and the CLI and config format are unchanged.

### How is red teaming different from a normal eval?

An eval measures output quality and correctness on a fixed dataset — it asks whether the response is good. Red teaming is adversarial: it dynamically generates attacks designed to make the model misbehave and asks whether it can be broken. Promptfoo does both with the same config format, using \`promptfoo eval\` and \`promptfoo redteam run\` respectively.

### Which OWASP LLM risks does promptfoo cover?

Promptfoo covers the full OWASP Top 10 for LLM Applications through its \`owasp:llm\` plugin bundle, including prompt injection, sensitive information disclosure, improper output handling, excessive agency, system prompt leakage, and misinformation. Each finding in the report is tagged with its OWASP identifier so you can hand results directly to security reviewers.

### What is the difference between plugins and strategies?

Plugins define the vulnerability category to test — what kind of weakness to look for, such as \`pii\`, \`jailbreak\`, or \`bola\`. Strategies define how the attack is delivered to evade defenses, such as \`base64\` encoding, \`multilingual\` translation, or multi-turn \`crescendo\` escalation. They combine: every plugin's attacks can run through every strategy for broad coverage.

### Can I run promptfoo red teaming in CI/CD?

Yes. \`redteam run\` is a CLI command that exits non-zero when findings exceed your threshold, so it drops into GitHub Actions, GitLab CI, or any pipeline. Keep \`numTests\` low for fast per-PR gating and schedule heavier sweeps nightly. Treat new critical or high findings as merge blockers, just like a failing test.

### How do I test a deployed app instead of a raw model?

Use the \`https\` target type to point promptfoo at your deployed endpoint, mapping \`{{prompt}}\` into your request body and using \`transformResponse\` to extract the reply. For agents or non-HTTP systems, write a small custom provider in JavaScript or Python so the scan exercises your full stack — system prompt, retrieval, tools, and memory included.

## Conclusion

LLM applications expose an unbounded natural-language attack surface, and the only realistic way to defend it is to attack it yourself, continuously and automatically. Promptfoo gives you that capability for free: describe your app, pick plugins and strategies, run the scan, read the OWASP-mapped report, fix what breaks, and gate CI so it stays fixed. With OpenAI's 2026 acquisition cementing its place at the center of AI security tooling, learning promptfoo now is one of the highest-leverage moves a QA or AppSec engineer can make.

Ready to go deeper? Browse the [QA skills directory](/skills) for ready-to-install red-teaming and evaluation skills your AI coding agent can use, and compare your evaluation options with our [promptfoo vs DeepEval](/blog/promptfoo-vs-deepeval-2026-comparison) and [OpenAI Evals](/blog/openai-evals-complete-guide-2026) guides. Start with a five-minute scan today — your future incident report will thank you.
`,
};
