import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Braintrust LLM Evaluation Guide (2026)",
  description: "Learn Braintrust for LLM evaluation in 2026: run Eval() experiments, build scorers, manage datasets, and compare prompt/model changes with regression tracking.",
  date: "2026-06-15",
  category: "AI Evals",
  content: `# Braintrust LLM Evaluation Guide (2026)

Braintrust is an evaluation and observability platform for LLM applications. Its core unit is the **experiment**: you define a dataset of inputs (with optional expected outputs), a task function that calls your LLM, and one or more **scorers** that grade each output, then Braintrust runs them all and shows you scores, diffs, and regressions in a web UI. The headline API in the SDK is the \`Eval()\` function — you hand it a dataset, a task, and a list of scorers, and it produces a comparable experiment run. Braintrust also captures production traces (logs) so the same scorers can monitor live traffic.

This guide walks through installing the SDK, the \`Eval()\` structure, built-in and custom scorers, datasets, comparing experiments, and CI integration. Braintrust evolves quickly, so treat the code below as accurate usage *patterns* and confirm exact argument names and the latest scorer library against the official Braintrust docs before pinning anything in production.

## What Braintrust actually does

There are three jobs Braintrust helps with, and it is worth separating them:

1. **Offline evaluation** — run a fixed dataset through your prompt/model/agent and score the outputs. This is how you answer "did my prompt change make things better or worse?"
2. **Regression tracking** — every experiment is versioned and comparable, so you can see per-row diffs between two runs (old prompt vs new prompt, GPT vs Claude, etc.) instead of eyeballing outputs.
3. **Production observability** — log live LLM calls as traces and apply scorers (including LLM-as-judge) to a sample of real traffic to catch quality drift after deploy.

If you have ever changed a prompt, run it on five examples by hand, and convinced yourself it was "better," Braintrust replaces that with a repeatable, scored, side-by-side experiment. For a conceptual primer on how scoring works across tools, see our [AI agent evaluation overview](/blog).

## Installation and setup

Braintrust has SDKs for TypeScript/JavaScript and Python. Install whichever matches your stack:

\`\`\`bash
# TypeScript / Node
npm install braintrust autoevals

# Python
pip install braintrust autoevals
\`\`\`

The \`autoevals\` package is Braintrust's library of ready-made scorers (exact match, embedding similarity, LLM-as-judge factuality, and more). Authenticate by setting an API key as an environment variable:

\`\`\`bash
export BRAINTRUST_API_KEY="your_key_here"
\`\`\`

You create a key in the Braintrust dashboard. The SDK reads it from the environment, so you never hard-code it. With that in place you can write your first eval.

## The \`Eval()\` structure

The central abstraction is \`Eval(projectName, { data, task, scores })\`. Conceptually:

- **\`data\`** — a function (or dataset reference) returning an array of test cases. Each case has an \`input\` and usually an \`expected\` value.
- **\`task\`** — an async function that receives an \`input\` and returns your application's output (typically by calling an LLM).
- **\`scores\`** — an array of scorer functions, each returning a number, conventionally in the range 0 to 1.

Here is a minimal TypeScript example evaluating a simple summarizer:

\`\`\`typescript
import { Eval } from 'braintrust';
import { Factuality } from 'autoevals';

Eval('summarizer-eval', {
  // 1. The dataset: inputs and expected outputs
  data: () => [
    {
      input: 'The cat sat on the mat. The mat was red.',
      expected: 'A cat sat on a red mat.',
    },
    {
      input: 'Quarterly revenue rose 12% to $4.2M, beating estimates.',
      expected: 'Revenue grew 12% to $4.2M, above expectations.',
    },
  ],

  // 2. The task: call your LLM
  task: async (input) => {
    const response = await callYourModel(\`Summarize: \${input}\`);
    return response;
  },

  // 3. The scorers: grade each output
  scores: [Factuality],
});
\`\`\`

The Python equivalent mirrors this structure:

\`\`\`python
from braintrust import Eval
from autoevals import Factuality

Eval(
    "summarizer-eval",
    data=lambda: [
        {"input": "The cat sat on the mat. The mat was red.",
         "expected": "A cat sat on a red mat."},
    ],
    task=lambda input: call_your_model(f"Summarize: {input}"),
    scores=[Factuality],
)
\`\`\`

You run this like any script (\`npx tsx eval.ts\` or \`python eval.py\`), or via the Braintrust CLI's eval runner. Braintrust executes every case, applies every scorer, and uploads the results as a new experiment that you can open in the dashboard.

## Scorers: built-in and custom

A **scorer** takes the model's \`output\` and (optionally) the \`expected\` value and returns a score. Braintrust's \`autoevals\` library ships many common ones:

| Scorer | What it measures |
|---|---|
| \`ExactMatch\` | Output equals expected exactly (1 or 0). |
| \`Levenshtein\` | Normalized edit distance between output and expected. |
| \`EmbeddingSimilarity\` | Cosine similarity of embeddings — good for "semantically close." |
| \`Factuality\` | LLM-as-judge: does the output agree factually with the expected answer? |
| \`Battle\` / pairwise | LLM-as-judge comparing two candidate outputs. |
| JSON / schema validators | Whether output matches an expected structure. |

The most powerful category is **LLM-as-judge** scorers, which use a model to grade open-ended outputs where exact matching is meaningless. \`Factuality\` is the canonical example: it asks a judge model whether the generated answer is consistent with the reference.

Custom scorers are just functions. A scorer returns a number, and you can return a richer object with a name and metadata when you want it labeled in the UI:

\`\`\`typescript
// A simple deterministic custom scorer
function ContainsCitation({ output }: { output: string }) {
  const hasCitation = /\\[\\d+\\]|https?:\\/\\//.test(output);
  return {
    name: 'ContainsCitation',
    score: hasCitation ? 1 : 0,
  };
}

// A custom LLM-as-judge scorer using your own rubric
async function ToneIsProfessional({ output }: { output: string }) {
  const verdict = await judgeModel(
    \`On a scale of 0 to 1, how professional is this tone? Reply with only a number.\\n\\n\${output}\`,
  );
  return { name: 'ToneIsProfessional', score: parseFloat(verdict) };
}

Eval('support-bot', {
  data: loadCases,
  task: runSupportBot,
  scores: [ContainsCitation, ToneIsProfessional],
});
\`\`\`

A practical rule: use deterministic scorers (exact match, regex, schema validation) wherever the correct answer is well-defined, and reserve LLM-as-judge scorers for genuinely subjective or open-ended quality. Deterministic scorers are free, instant, and non-flaky; judge scorers cost tokens and can themselves be noisy, so calibrate them.

## Datasets

Hard-coding cases inline is fine for a first eval, but real projects use **datasets** — named, versioned collections of records stored in Braintrust. You can create a dataset from labeled examples, from production logs you want to turn into regression tests, or by uploading a file. Referencing a dataset in your eval looks like:

\`\`\`typescript
import { Eval, initDataset } from 'braintrust';

Eval('rag-qa', {
  data: initDataset('rag-qa', { dataset: 'golden-questions' }),
  task: async (input) => answerWithRag(input),
  scores: [Factuality, ContainsCitation],
});
\`\`\`

Datasets matter because they make evals **reproducible and growable**. When a bug slips to production, you capture that failing case, add it to the dataset, and it becomes a permanent regression test — the same loop QA engineers know from traditional test suites. Over time your golden dataset encodes the behavior you actually care about.

## Comparing experiments and catching regressions

The reason to run evals in a platform rather than a bare script is **comparison**. Each \`Eval()\` run becomes an experiment, and Braintrust diffs experiments for you: average score per scorer, distribution shifts, and crucially a **row-level diff** so you can see exactly which inputs got better and which regressed when you changed a prompt or swapped models.

A typical workflow:

1. Run the eval against your current prompt → experiment A (your baseline).
2. Change the prompt or model.
3. Run again → experiment B.
4. Open the comparison view: Braintrust shows the score delta and highlights rows where B is worse than A.

This turns "I think the new prompt is better" into "the new prompt improved Factuality from 0.78 to 0.86 but regressed on three edge cases." That regression visibility is the core value — it is the LLM equivalent of a test diff in a pull request. Compare this platform model against other evaluation tools on our [tool comparison hub](/compare).

## Production observability

Beyond offline evals, Braintrust can log your live LLM calls as **traces**. You wrap your model calls so each request/response (and any intermediate steps for an agent) is captured, then you can:

- Inspect real production inputs and outputs.
- Run scorers on a sample of live traffic to detect quality drift.
- Promote interesting or failing production cases into a dataset for offline evaluation.

This closes the loop between offline testing and production monitoring with one consistent scorer definition. The general pattern is to instrument your app to send traces, then use the same scorer code in both places so your offline benchmark and your live monitor agree on what "good" means.

## CI integration

To stop quality regressions before merge, run your eval in CI and fail the build if scores drop below a threshold. A GitHub Actions job looks like:

\`\`\`yaml
name: llm-eval
on: [pull_request]
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Run Braintrust eval
        run: npx braintrust eval ./evals
        env:
          BRAINTRUST_API_KEY: \${{ secrets.BRAINTRUST_API_KEY }}
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
\`\`\`

Because experiments are versioned and tied to your commit, the run posts results you can compare against the base branch. Many teams gate merges on "no scorer regressed by more than X" — exactly how you would gate on a failing unit test. Inside the task function you can add an assertion that throws when an average score is below a floor, which makes the CI step fail loudly.

## Common errors and troubleshooting

- **\`BRAINTRUST_API_KEY\` not set** — the SDK cannot upload the experiment. Export the key locally and add it as a CI secret.
- **Scorer returns \`NaN\`** — usually an LLM-as-judge scorer where you parsed the judge's reply incorrectly. Constrain the judge to output only a number, and clamp/validate the parsed value.
- **Flaky judge scores** — LLM-as-judge is non-deterministic. Lower the judge's temperature, give it a tight rubric, and consider averaging multiple judgments for high-stakes scorers.
- **Slow eval runs** — large datasets times multiple LLM calls are slow. Run cases concurrently (the SDK supports parallelism) and start with a small representative subset during development.
- **Comparisons look empty** — make sure both runs target the same project and dataset; experiments only diff cleanly when their inputs line up.

## When to use Braintrust

Braintrust fits teams who want one platform spanning offline evals, regression diffs, and production monitoring, with a strong UI for comparing runs. If you only need a lightweight code-first harness with no hosted UI, a framework-style library may be lighter weight; if your priority is rigorous academic-style benchmarking, a research-oriented framework may suit better. Many teams combine an open-source eval framework for local iteration with a hosted platform like Braintrust for team-wide tracking. Browse install-ready evaluation skills for AI coding agents at [/skills](/skills).

## Frequently Asked Questions

### What is Braintrust used for?

Braintrust is a platform for evaluating and monitoring LLM applications. You use it to run offline experiments that score prompt, model, or agent changes against a dataset, to compare runs side by side and catch regressions, and to log production traffic so the same scorers monitor live quality. It combines offline evaluation, regression tracking, and observability in one tool.

### What is the Eval() function in Braintrust?

\`Eval()\` is the core SDK function that defines and runs an experiment. You pass it a project name and an object with three parts: \`data\` (the test cases with inputs and expected outputs), \`task\` (the function that calls your LLM and returns an output), and \`scores\` (an array of scorer functions that grade each output). Running it uploads a comparable experiment to the Braintrust dashboard.

### What are scorers in Braintrust?

Scorers are functions that grade a model's output, typically returning a number from 0 to 1. Braintrust's \`autoevals\` library provides built-in scorers like exact match, embedding similarity, and LLM-as-judge factuality, and you can write custom scorers as plain functions. Use deterministic scorers where the answer is well-defined and reserve LLM-as-judge scorers for open-ended quality.

### Is Braintrust free to use?

Braintrust offers usage-based plans and the SDKs (\`braintrust\` and \`autoevals\`) are openly available on npm and PyPI. Pricing tiers and any free allowance change over time, so check the official Braintrust pricing page for the current details rather than relying on a fixed figure. Note that LLM-as-judge scorers also incur model-provider token costs separate from Braintrust itself.

### How does Braintrust help catch regressions?

Every \`Eval()\` run is a versioned experiment, and Braintrust diffs two experiments at the row level. After you change a prompt or model, you run the eval again and the comparison view shows the average score delta per scorer and highlights exactly which inputs improved or regressed. This turns subjective "it seems better" judgments into measurable, reviewable diffs you can gate merges on.

### Can Braintrust monitor LLM apps in production?

Yes. In addition to offline evaluation, Braintrust captures live LLM calls as traces, letting you inspect real inputs and outputs and run scorers on a sample of production traffic to detect quality drift. You can also promote interesting or failing production cases into a dataset so they become permanent offline regression tests, closing the loop between monitoring and evaluation.
`,
};
