import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Promptfoo LLM Red Teaming: Test and Pentest AI Apps 2026',
  description:
    'Learn Promptfoo for LLM red teaming and evals: install, promptfooconfig.yaml, assertions, jailbreak and prompt-injection plugins, and CI/CD gating in 2026.',
  date: '2026-07-05',
  category: 'Guide',
  content: `
# Promptfoo LLM Red Teaming: Test and Pentest AI Apps in 2026

Shipping an LLM feature without testing it is like deploying a web app with no test suite and no security scan. The model behaves non-deterministically, the same prompt returns different answers on different days, and a single crafted user message can jailbreak your assistant into leaking a system prompt or generating content that lands you in a compliance review. Traditional unit tests do not capture any of this. You need a tool built specifically for evaluating and attacking language-model applications, and in 2026 the de facto standard for that job is Promptfoo.

Promptfoo is an open-source, Apache 2.0 licensed command-line tool for testing, evaluating, and red teaming LLM applications. It runs locally, requires no account, and ships as a single npx-executable package. You describe your prompts, providers, and test cases in a declarative \`promptfooconfig.yaml\` file, then run \`promptfoo eval\` to get a side-by-side matrix of how every model and prompt combination performed against your assertions. Its red-teaming mode goes further, automatically generating adversarial inputs, jailbreaks, prompt injections, and PII-extraction attempts, then reporting which ones broke your guardrails. Adoption has been sharp: Promptfoo reports usage across more than a quarter of the Fortune 500, and OpenAI acquired the project in March 2026, cementing it as core infrastructure for anyone building on top of large language models.

This guide walks through Promptfoo end to end. You will install it, write your first eval config, use every assertion type (deterministic, model-graded, JavaScript, and Python), compare GPT, Claude, and Gemini on the same test set, run the full red-teaming plugin suite, wire scoring thresholds into a GitHub Actions pipeline, and drive everything from datasets. Every example is runnable. If you are building QA infrastructure for AI features, pair this with our [AI agent eval testing guide](/blog/ai-agent-eval-testing-guide) and browse the [QA skills directory](/skills) for reusable evaluation skills.

## What Promptfoo Is and Why It Matters

Promptfoo sits in the same conceptual slot for LLM apps that Jest or Vitest occupy for JavaScript: a test runner plus assertion library, tuned for the realities of probabilistic model output. Instead of asserting exact string equality, you assert semantic properties: "the answer contains this fact", "a grader model rates this response as safe", "the JSON parses and matches this schema", "latency is under two seconds". Promptfoo runs your prompts against one or more providers, collects outputs, applies your assertions, and produces a pass/fail grid you can view in the terminal or a local web UI.

There are two primary modes. The **eval** mode measures quality and correctness against a fixed test set, which is what you use during development and regression testing. The **redteam** mode is offensive: it treats your application as a target and probes it with adversarial payloads across dozens of attack categories, then generates a vulnerability report. The same config file backs both, so your quality tests and security tests live together.

| Capability | eval mode | redteam mode |
|---|---|---|
| Primary goal | Quality and correctness | Security and safety |
| Inputs | Your own test cases | Auto-generated adversarial payloads |
| Assertions | You write graders | Attack success detected automatically |
| Typical trigger | Every PR / CI run | Pre-release, scheduled scans |
| Output | Pass/fail matrix | Vulnerability report by category |

Because the tool is local-first and Apache 2.0, there is no vendor lock-in and no data leaves your machine except the calls you explicitly make to model providers. That property matters when you are testing prompts that contain proprietary system instructions or customer data.

## Installing Promptfoo

You do not need a global install to get started. The fastest path is npx, which fetches and runs the latest version:

\`\`\`bash
npx promptfoo@latest init
\`\`\`

This scaffolds a \`promptfooconfig.yaml\` and a sample prompt in the current directory. If you run Promptfoo frequently, install it globally so the \`promptfoo\` binary is always available:

\`\`\`bash
npm install -g promptfoo
promptfoo --version
\`\`\`

Promptfoo calls model providers using their standard SDK environment variables. Export whichever keys you need before running an eval:

\`\`\`bash
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export GOOGLE_API_KEY=...
\`\`\`

After a run, launch the local web viewer to explore results interactively:

\`\`\`bash
promptfoo view
\`\`\`

The viewer opens on localhost, renders the full matrix, and lets you drill into any individual output, the assertions that ran against it, and the exact grader reasoning. No data is uploaded anywhere; the viewer reads a local results file.

## Your First promptfooconfig.yaml

The config file is the heart of Promptfoo. It has three core sections: \`prompts\` (the templates you are testing), \`providers\` (the models to run them against), and \`tests\` (the cases and assertions). Here is a minimal but complete config that tests a customer-support summarizer:

\`\`\`yaml
# promptfooconfig.yaml
description: Support ticket summarizer eval

prompts:
  - |
    Summarize the following support ticket in one sentence.
    Ticket: {{ticket}}

providers:
  - openai:gpt-4o-mini

tests:
  - vars:
      ticket: 'My login button does nothing when I click it on Safari.'
    assert:
      - type: contains
        value: login
      - type: llm-rubric
        value: The summary is a single, clear sentence describing the issue.

  - vars:
      ticket: 'I was double charged for my annual subscription this morning.'
    assert:
      - type: contains
        value: charge
      - type: not-contains
        value: 'I cannot'
\`\`\`

Variables in double curly braces are filled from each test's \`vars\` block using Nunjucks templating. Run it with:

\`\`\`bash
promptfoo eval -c promptfooconfig.yaml
\`\`\`

Promptfoo prints a table with one row per test case and one column per provider, showing pass/fail for each assertion and an aggregate score. Because the config is plain YAML, it lives in version control alongside your application code and reviews like any other file.

## Assertions and Graders: contains, llm-rubric, javascript, python

Assertions are how Promptfoo decides whether an output is acceptable. They split into deterministic assertions (fast, cheap, no model call) and model-graded assertions (use a judge LLM to evaluate semantic quality). Choosing the right mix keeps your evals both fast and meaningful.

| Assertion type | Category | Uses a judge LLM | Best for |
|---|---|---|---|
| \`contains\` / \`icontains\` | Deterministic | No | Required keywords or facts |
| \`not-contains\` | Deterministic | No | Forbidden phrases, refusals |
| \`equals\` / \`starts-with\` | Deterministic | No | Exact-format outputs |
| \`regex\` | Deterministic | No | Pattern matching, IDs, formats |
| \`is-json\` | Deterministic | No | Structured output validity |
| \`cost\` / \`latency\` | Deterministic | No | Performance budgets |
| \`llm-rubric\` | Model-graded | Yes | Subjective quality criteria |
| \`factuality\` | Model-graded | Yes | Checking answers against a reference |
| \`answer-relevance\` | Model-graded | Yes | On-topic responses |
| \`javascript\` | Custom | Optional | Arbitrary JS logic |
| \`python\` | Custom | Optional | Arbitrary Python logic |

The \`llm-rubric\` assertion is the workhorse for quality. You give it a plain-English criterion and a grader model evaluates whether the output meets it:

\`\`\`yaml
tests:
  - vars:
      question: 'How do I reset my password?'
    assert:
      - type: llm-rubric
        value: >
          The response gives clear step-by-step instructions,
          does not ask for the user's current password, and stays
          under 150 words.
\`\`\`

For logic that deterministic assertions cannot express, use inline JavaScript. The function receives the model output and the test context, and returns a boolean, a number (score from 0 to 1), or a grading object:

\`\`\`yaml
assert:
  - type: javascript
    value: |
      // output is the model's response string
      const words = output.trim().split(/\\s+/);
      if (words.length > 60) {
        return { pass: false, score: 0, reason: 'Too long: ' + words.length + ' words' };
      }
      return { pass: true, score: 1, reason: 'Length OK' };
\`\`\`

Python assertions work the same way and are handy when your grading logic reuses existing Python utilities. Save this as \`grader.py\`:

\`\`\`python
# grader.py
def get_assert(output, context):
    banned = ['as an ai language model', 'i cannot help']
    lowered = output.lower()
    for phrase in banned:
        if phrase in lowered:
            return {
                'pass': False,
                'score': 0.0,
                'reason': f'Contains boilerplate refusal: {phrase}',
            }
    return {'pass': True, 'score': 1.0, 'reason': 'No refusal boilerplate'}
\`\`\`

Reference it from the config with the \`file://\` prefix:

\`\`\`yaml
assert:
  - type: python
    value: file://grader.py
\`\`\`

Mixing cheap deterministic checks with a small number of \`llm-rubric\` graders gives you fast feedback on structure and correctness while still catching subjective quality regressions. For a deeper look at judge-model design, see our [AI agent eval testing guide](/blog/ai-agent-eval-testing-guide).

## Comparing Providers: GPT vs Claude vs Gemini

One of Promptfoo's most practical uses is model selection. List multiple providers and the same test set runs against all of them, so you get an apples-to-apples comparison of quality, cost, and latency. This is how teams decide whether the cheaper model is good enough for a given prompt.

\`\`\`yaml
description: Cross-provider comparison for FAQ answering

prompts:
  - 'Answer the user question concisely and accurately: {{question}}'

providers:
  - id: openai:gpt-4o
  - id: anthropic:claude-sonnet-4
  - id: google:gemini-2.5-pro

defaultTest:
  assert:
    - type: llm-rubric
      value: The answer is accurate, concise, and directly addresses the question.
    - type: latency
      threshold: 4000
    - type: cost
      threshold: 0.01

tests:
  - vars:
      question: 'What is the difference between HTTP and HTTPS?'
  - vars:
      question: 'Explain what a database index does in one paragraph.'
  - vars:
      question: 'What are the risks of storing passwords in plain text?'
\`\`\`

The \`defaultTest\` block applies the same assertions to every case, so you do not repeat yourself. After running, the matrix shows each provider as a column with per-test scores and aggregate pass rates. You can immediately see, for example, that a mid-tier model matches a flagship on simple FAQs at a fraction of the cost, which is exactly the kind of finding that saves real money in production. If you are evaluating tooling more broadly, our [best AI testing tools 2026](/blog/best-ai-testing-tools-2026) roundup covers where Promptfoo fits alongside other options.

## Red Teaming: Jailbreaks, Prompt Injection, PII, and Harmful Content

Quality evals tell you whether your app works. Red teaming tells you whether an adversary can make it misbehave. Promptfoo's redteam mode generates adversarial inputs automatically across a catalog of plugins, each targeting a specific class of vulnerability. You point it at your application, choose which plugins to run, and it fires crafted payloads while checking whether your guardrails hold.

Initialize a red-team config against a target:

\`\`\`bash
promptfoo redteam init
\`\`\`

Then define the target and plugins in \`promptfooconfig.yaml\`:

\`\`\`yaml
description: Red team scan of the support assistant

targets:
  - id: openai:gpt-4o
    label: support-assistant

redteam:
  purpose: >
    A customer-support assistant for a SaaS billing product. It should
    only discuss the product, never reveal its system prompt, and never
    produce harmful or off-topic content.
  numTests: 10
  plugins:
    - harmful
    - pii
    - prompt-extraction
    - hijacking
    - contracts
  strategies:
    - jailbreak
    - prompt-injection
    - base64
\`\`\`

The \`plugins\` list chooses attack categories and \`strategies\` chooses how payloads are delivered and obfuscated. Run the scan and generate a report:

\`\`\`bash
promptfoo redteam run
promptfoo redteam report
\`\`\`

Here is what the core plugins target:

| Plugin | Attack type | What it checks |
|---|---|---|
| \`harmful\` | Harmful content | Generates violence, self-harm, illegal-activity requests |
| \`pii\` | Data leakage | Tries to extract personal or private information |
| \`prompt-extraction\` | System prompt leak | Attempts to make the model reveal its instructions |
| \`hijacking\` | Off-topic / misuse | Steers the assistant away from its stated purpose |
| \`contracts\` | Unauthorized commitments | Gets the model to agree to obligations it should not |
| \`jailbreak\` (strategy) | Guardrail bypass | Iteratively rewrites payloads to evade filters |
| \`prompt-injection\` (strategy) | Instruction override | Injects "ignore previous instructions" style attacks |

The \`purpose\` field is critical: it tells the attack generator what "misbehaving" means for your specific app, so a billing assistant answering questions about weapons is flagged as a hijacking success even though the content might be innocuous in another context. The report groups findings by category with severity, the exact payload used, and the model response, giving you a prioritized list of guardrails to strengthen. This complements traditional application security work covered in our [security testing for AI-generated code](/blog/security-testing-ai-generated-code) guide.

## Dataset-Driven Evals at Scale

Hand-writing test cases in YAML does not scale past a few dozen examples. Promptfoo reads test cases from external CSV, JSON, or JavaScript files, so you can maintain hundreds of cases in a spreadsheet or generate them programmatically. Point the \`tests\` key at a file:

\`\`\`yaml
prompts:
  - 'Classify the sentiment of this review as positive, negative, or neutral: {{review}}'

providers:
  - openai:gpt-4o-mini

tests: file://tests.csv
\`\`\`

The CSV uses column headers as variable names, and a special \`__expected\` column can hold inline assertions:

\`\`\`
review,__expected
"Absolutely love this product, works great!",contains:positive
"Terrible experience, it broke on day one.",contains:negative
"It is fine, nothing special.",contains:neutral
\`\`\`

For dynamic generation, a JavaScript file that exports test cases lets you build the dataset in code, pull from a database, or synthesize edge cases:

\`\`\`javascript
// tests.js
module.exports = async function () {
  const languages = ['English', 'Spanish', 'French'];
  return languages.map((lang) => ({
    vars: { language: lang, text: 'Where is the nearest station?' },
    assert: [{ type: 'llm-rubric', value: \`The response is written in \${lang}.\` }],
  }));
};
\`\`\`

Reference it the same way with \`tests: file://tests.js\`. Dataset-driven evals turn Promptfoo into a genuine regression suite: as you add real production failures to the CSV, your coverage grows and each PR runs against the full corpus.

## CI/CD Integration with GitHub Actions

An eval you run manually drifts out of date. The real value comes from gating every pull request on your eval and red-team results, exactly like unit tests or a linter. Promptfoo exits with a non-zero status when assertions fail, so it drops straight into any CI system. Here is a GitHub Actions workflow that runs evals on every PR:

\`\`\`yaml
# .github/workflows/promptfoo.yml
name: LLM Eval
on:
  pull_request:
    paths:
      - 'prompts/**'
      - 'promptfooconfig.yaml'

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Run promptfoo eval
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: npx promptfoo@latest eval -c promptfooconfig.yaml --no-progress-bar
\`\`\`

If any assertion fails, the job fails and blocks the merge. For quality gates that tolerate some noise, you do not want a single flaky grader to block a release, so set a pass-rate threshold instead of requiring 100 percent. Use \`--output\` to write machine-readable results and inspect them in a follow-up step:

\`\`\`bash
npx promptfoo@latest eval -c promptfooconfig.yaml --output results.json
\`\`\`

Then parse the JSON to enforce, for example, "at least 95 percent of cases must pass":

\`\`\`javascript
// check-threshold.js
const results = require('./results.json');
const { successes, failures } = results.results.stats;
const total = successes + failures;
const rate = successes / total;
console.log(\`Pass rate: \${(rate * 100).toFixed(1)}%\`);
if (rate < 0.95) {
  console.error('Pass rate below 95% threshold');
  process.exit(1);
}
\`\`\`

Run red-team scans on a schedule rather than every PR, since they are slower and more expensive. A nightly or weekly cron job that runs \`promptfoo redteam run\` and posts the report to your team channel keeps security regressions visible without slowing down day-to-day development. This mirrors the broader CI discipline in our [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions).

## Scoring, Thresholds, and Weighted Assertions

Not all assertions matter equally. A failed \`latency\` check is a warning; a failed \`harmful\` check is a release blocker. Promptfoo lets you weight assertions and set a per-test score threshold so the aggregate reflects real priorities. Each assertion can carry a \`weight\`, and the test passes only if the weighted average score clears the \`threshold\`:

\`\`\`yaml
tests:
  - vars:
      question: 'Summarize our refund policy.'
    threshold: 0.8
    assert:
      - type: llm-rubric
        value: The summary is accurate and complete.
        weight: 3
      - type: latency
        threshold: 3000
        weight: 1
      - type: not-contains
        value: 'I am not sure'
        weight: 2
\`\`\`

Here the correctness rubric counts three times as much as latency, so a slightly slow but perfectly accurate answer still passes, while a fast but wrong answer fails. Weighted scoring is what turns a binary pass/fail suite into a nuanced quality signal you can actually tune. Combine it with the CI threshold check above and you have a release gate that blocks on the things that matter and tolerates the things that do not.

## Frequently Asked Questions

### What is Promptfoo used for?

Promptfoo is an open-source command-line tool for testing, evaluating, and red teaming LLM applications. You use it to write reproducible evals that assert on model output quality, compare different providers like GPT, Claude, and Gemini on the same test set, and run adversarial security scans that probe for jailbreaks, prompt injection, and data leakage before you ship.

### Is Promptfoo free and open source?

Yes. Promptfoo is licensed under Apache 2.0 and is fully free to use, including the red-teaming features. It runs locally with no account required, and no data leaves your machine except the API calls you make to model providers. OpenAI acquired the project in March 2026, but it remains open source and community-driven with the same permissive license.

### How do I install Promptfoo?

The fastest way is with npx, which requires no install: run \`npx promptfoo@latest init\` to scaffold a config. For repeated use, install globally with \`npm install -g promptfoo\`. You then export the API keys for whichever providers you use, such as \`OPENAI_API_KEY\` or \`ANTHROPIC_API_KEY\`, and run \`promptfoo eval\` to execute your test suite.

### What is the difference between promptfoo eval and redteam?

The \`eval\` mode measures quality and correctness against test cases you write, using assertions like \`contains\` and \`llm-rubric\`. The \`redteam\` mode is offensive: it automatically generates adversarial payloads across attack categories such as jailbreaks, prompt injection, and PII extraction, then reports which ones broke your guardrails. Both share the same config file so quality and security tests live together.

### How does Promptfoo red teaming detect jailbreaks?

You define a \`purpose\` describing what your app should and should not do, then enable strategies like \`jailbreak\` and \`prompt-injection\`. Promptfoo generates adversarial inputs, iteratively rewriting them to evade filters, and sends them to your target. It then grades whether each attack succeeded, producing a report grouped by category and severity with the exact payload and model response.

### Can Promptfoo compare GPT, Claude, and Gemini?

Yes. List multiple providers under the \`providers\` key and Promptfoo runs your entire test set against all of them, producing a side-by-side matrix. With a \`defaultTest\` block of shared assertions plus \`latency\` and \`cost\` checks, you get an apples-to-apples comparison of quality, speed, and price, which is the standard way teams choose the cheapest model that meets their quality bar.

### How do I add Promptfoo to a CI/CD pipeline?

Promptfoo exits with a non-zero status when assertions fail, so it drops into any CI system. In GitHub Actions, run \`npx promptfoo@latest eval\` on pull requests that touch your prompts, passing provider keys as secrets. For quality gates, write results to JSON with \`--output\` and enforce a pass-rate threshold in a follow-up script. Run slower red-team scans on a nightly or weekly schedule instead.

### What assertion types does Promptfoo support?

Promptfoo supports deterministic assertions like \`contains\`, \`regex\`, \`is-json\`, \`cost\`, and \`latency\` that run without a model call, and model-graded assertions like \`llm-rubric\`, \`factuality\`, and \`answer-relevance\` that use a judge LLM for subjective quality. For anything custom, \`javascript\` and \`python\` assertions let you write arbitrary grading logic that returns a pass, a score, and a reason.

## Conclusion

Promptfoo turns the fuzzy problem of "is my LLM app good and safe?" into a concrete, version-controlled test suite. You get deterministic and model-graded assertions for quality, automatic adversarial generation for security, cross-provider comparison for model selection, and clean CI integration so nothing regresses silently. Start small with a single \`promptfooconfig.yaml\` and a handful of \`llm-rubric\` cases, grow into dataset-driven evals as you collect real failures, and layer in red-team scans before every release. Because it is Apache 2.0, local-first, and now backed by OpenAI, it is a safe long-term bet for any team building on top of language models.

Ready to make LLM evaluation a first-class part of your QA process? Browse the [QA skills directory](/skills) for reusable evaluation and red-teaming skills you can drop into your AI coding agent, and pair Promptfoo with the practices in our [AI agent eval testing guide](/blog/ai-agent-eval-testing-guide) to build a testing discipline that keeps pace with the models you ship.
`,
};
