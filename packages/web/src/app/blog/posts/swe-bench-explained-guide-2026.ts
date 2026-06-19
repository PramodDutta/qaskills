import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "SWE-bench Explained: The Coding Agent Benchmark (2026)",
  description: "SWE-bench explained for 2026: how this benchmark turns real GitHub issues into coding-agent tasks, how patches are scored, plus Verified and Lite subsets.",
  date: "2026-06-15",
  category: "AI Evals",
  content: `# SWE-bench Explained: The Coding Agent Benchmark (2026)

SWE-bench is an open-source benchmark from Princeton that measures whether a language model or coding agent can resolve real software engineering issues. Each task hands the model a real GitHub repository at a specific commit plus an issue's text, and the model must produce a patch (a code diff) that fixes it. The patch is then applied and graded by running the project's own test suite in a Docker container: a task counts as **resolved** only if the failing tests now pass and the passing tests still pass. The headline metric is **% Resolved**.

This guide explains where SWE-bench tasks come from, the exact structure of a task instance, how the evaluation harness scores a patch, and how to read the leaderboard responsibly. It also covers the major variants — **SWE-bench Verified**, **SWE-bench Lite**, and **SWE-bench Multimodal** — and when to use each. SWE-bench evolves quickly, so treat the commands below as accurate usage *patterns* and confirm exact flags against the official SWE-bench repository and docs before pinning anything.

## What SWE-bench actually measures

Most older coding benchmarks ask a model to write a small, self-contained function from a docstring — the kind of problem that fits on one screen and has an obvious unit test. SWE-bench is deliberately harder and more realistic. It measures whether a model can do the messy, end-to-end work a human engineer does on a real codebase:

- **Read an issue** written by an actual user or maintainer, often vague or under-specified.
- **Navigate a large repository** with hundreds of files to find the relevant code.
- **Produce a correct, minimal patch** that addresses the issue without breaking anything else.
- **Pass the project's existing tests**, not just a single hand-written check.

That last point is the heart of it. A SWE-bench task is not graded by string-matching the model's answer against a reference solution — it is graded by *running real tests*. This makes the benchmark an execution-based, behavioral evaluation rather than a similarity score, which is why it became the de facto yardstick for coding agents. For a broader primer on how execution-based grading differs from LLM-as-judge scoring, see our [AI agent evaluation overview](/blog).

## Where the tasks come from: the data pipeline

Every SWE-bench task is mined from the real history of popular open-source Python projects — repositories like \`django\`, \`sympy\`, \`scikit-learn\`, \`matplotlib\`, \`astropy\`, \`flask\`, \`requests\`, and others. The construction pipeline is the clever part, and understanding it is the fastest way to understand the whole benchmark.

The pipeline works backward from **merged pull requests that closed an issue and changed at least one test file**:

1. **Find a real GitHub issue** that was eventually fixed by a merged PR.
2. **Take the merged PR's diff and split it into two parts.** The changes to non-test source files become the *gold patch* (the reference human solution). The changes to test files become the *test patch* (the new or updated tests that the fix made pass).
3. **Record the base commit** — the state of the repository *before* the fix was merged. This is what the model is given.
4. **Validate the task** by checking out the base commit, applying the test patch, and confirming that the relevant tests **fail** before the fix and **pass** after the gold patch is applied. A task only enters the dataset if it is genuinely solvable and the tests actually discriminate a correct fix.

The elegance here is that the human PR provides *both* the answer key and the grader for free. The maintainers who merged the fix already wrote tests proving it worked. SWE-bench simply withholds the source-code half of the diff and asks the model to reproduce its effect — then reuses the maintainers' own tests as the rubric.

## Anatomy of a task instance

Each task in the dataset is a structured record. When you load SWE-bench from Hugging Face you get rows with fields like these:

\`\`\`json
{
  "instance_id": "django__django-11099",
  "repo": "django/django",
  "base_commit": "d26b2424...",
  "environment_setup_commit": "0668164b...",
  "problem_statement": "UsernameValidator allows trailing newline...",
  "patch": "diff --git a/django/contrib/auth/validators.py ...",
  "test_patch": "diff --git a/tests/auth_tests/test_validators.py ...",
  "FAIL_TO_PASS": ["test_validators (auth_tests.test_validators) ..."],
  "PASS_TO_PASS": ["test_help_text (auth_tests.test_validators) ..."]
}
\`\`\`

Here is what each field means and how it is used:

| Field | What it is | Role in evaluation |
|---|---|---|
| \`instance_id\` | Unique task ID, e.g. \`django__django-11099\` | Keys predictions to tasks |
| \`repo\` | The GitHub repo the task comes from | Identifies the codebase |
| \`base_commit\` | Repo state **before** the fix | What the model starts from |
| \`environment_setup_commit\` | Commit used to build the dependency environment | Ensures the right deps/Python |
| \`problem_statement\` | The issue text the model reads | The model's only spec |
| \`patch\` | The **gold** (human) source patch | Reference solution; not shown to the model |
| \`test_patch\` | The new/updated tests from the PR | Applied at eval time to grade the fix |
| \`FAIL_TO_PASS\` | Tests that fail before, must pass after | The "did you fix it?" check |
| \`PASS_TO_PASS\` | Tests that pass before and must still pass | The "did you break anything?" check |

Crucially, the model is given only the \`problem_statement\` and the repository at \`base_commit\`. It does **not** see the gold \`patch\` or the \`test_patch\`. Its job is to output a patch of its own. The two test lists, \`FAIL_TO_PASS\` and \`PASS_TO_PASS\`, are the entire grading contract.

## The evaluation loop: how a patch is scored

Once a model produces a predicted patch for a task, the harness scores it through a strict, reproducible sequence. Modern SWE-bench evaluation is **Docker-based** specifically so that every task runs in an isolated, deterministic environment — this fixed a major early source of noise, where flaky local dependency setups produced inconsistent scores.

For each task instance, the harness:

1. **Builds the environment** — spins up a Docker image for that repo at the correct \`environment_setup_commit\`, installing the exact dependencies and Python version the project needs.
2. **Checks out the \`base_commit\`** so the repository is in its pre-fix state.
3. **Applies the model's predicted patch** to the source. If the patch does not apply cleanly (malformed diff, wrong context lines), the task immediately fails.
4. **Applies the \`test_patch\`** so the new tests from the original PR are present.
5. **Runs the \`FAIL_TO_PASS\` tests** — these were failing before and **must now pass**. This proves the model actually fixed the issue.
6. **Runs the \`PASS_TO_PASS\` tests** — these were passing before and **must still pass**. This proves the model did not introduce a regression.

A task is marked **resolved** only if **both** conditions hold: every \`FAIL_TO_PASS\` test passes **and** every \`PASS_TO_PASS\` test passes. Fixing the bug but breaking something else fails the task. Breaking nothing but not actually fixing the bug also fails. Both gates must be green.

This two-sided check is exactly the discipline a human reviewer applies in a pull request: the new behavior works *and* nothing previously working regressed. It is also why SWE-bench is so much more credible than a single-assertion benchmark — passing requires a genuinely correct, non-destructive change. If you build coding-agent test suites, the same FAIL_TO_PASS / PASS_TO_PASS pattern is a powerful template; browse install-ready evaluation skills for AI coding agents at [/skills](/skills).

## What "% Resolved" means

The single headline number SWE-bench reports is **% Resolved** (also called the **resolve rate** or **pass rate**): the percentage of task instances in the dataset that the model resolved, where "resolved" means it passed both the \`FAIL_TO_PASS\` and \`PASS_TO_PASS\` gates described above.

\`\`\`text
% Resolved = (number of resolved instances / total instances) * 100
\`\`\`

A few things to keep in mind about this metric:

- It is **all-or-nothing per task**. There is no partial credit for a patch that is "almost right" — it either makes the tests pass or it does not.
- It is **only comparable within the same dataset**. A 60% on SWE-bench Lite (300 tasks) is not the same achievement as 60% on the full set (~2,294 tasks) or on Verified (500 tasks). Always note which subset a number refers to.
- It says nothing about **how** the patch was produced. Two agents with the same % Resolved may differ wildly in cost, latency, number of tool calls, and reliability — none of which the headline number captures.

## Running the harness conceptually

You do not need to re-implement any of this — SWE-bench ships an evaluation harness you point at your predictions. The end-to-end flow has three stages: load the dataset, generate predictions, then run evaluation. Confirm exact package names and flags against the official repo, as they change between versions.

**1. Install and load the dataset.** SWE-bench is installable from PyPI, and the datasets live on Hugging Face under \`princeton-nlp\` (for example \`princeton-nlp/SWE-bench\`, \`princeton-nlp/SWE-bench_Verified\`, and \`princeton-nlp/SWE-bench_Lite\`):

\`\`\`bash
pip install swebench
\`\`\`

\`\`\`python
from datasets import load_dataset

# Load the human-validated Verified subset (recommended for comparisons)
ds = load_dataset("princeton-nlp/SWE-bench_Verified", split="test")
print(ds[0]["instance_id"], ds[0]["repo"])
\`\`\`

**2. Produce predictions as JSONL.** Your model or agent reads each task's \`problem_statement\` and repo, then emits one prediction per task. The harness expects a predictions file where each line is a JSON object with the instance ID, the patch your model produced, and a model name label:

\`\`\`json
{"instance_id": "django__django-11099", "model_patch": "diff --git a/...", "model_name_or_path": "my-agent-v1"}
{"instance_id": "sympy__sympy-20212", "model_patch": "diff --git a/...", "model_name_or_path": "my-agent-v1"}
\`\`\`

The \`model_patch\` is the unified diff your agent generated. The harness never asks *how* you produced it — generation (the agent scaffold, prompting, retrieval, tool use) is entirely up to you and is separate from scoring.

**3. Run the evaluation harness.** Point the harness at your predictions and the dataset. It builds the per-task Docker environments, applies each patch, runs the two test sets, and writes a report:

\`\`\`bash
python -m swebench.harness.run_evaluation \\
  --dataset_name princeton-nlp/SWE-bench_Verified \\
  --predictions_path preds.jsonl \\
  --run_id my-agent-run-1 \\
  --max_workers 8
\`\`\`

The harness produces a **per-instance report** (which tasks resolved, which patches failed to apply, which tests failed) and a **final summary** with the total resolved count and the overall resolve rate for your run. That resolved count, over the dataset size, is your % Resolved.

## SWE-bench Verified, Lite, and Multimodal

The original full SWE-bench is large and, as researchers discovered, partly noisy — some tasks were effectively unsolvable from the issue text alone, or had tests that were too strict, too loose, or environment-dependent. Several curated variants address different needs.

| Variant | Tasks | Purpose | When to use it |
|---|---|---|---|
| **SWE-bench (full)** | ~2,294 | The complete mined dataset across 12 Python repos | Maximum coverage; large-scale research runs |
| **SWE-bench Verified** | 500 | Human-validated subset (released by OpenAI) filtering out noisy or unsolvable tasks | The cleanest number for **comparing models** |
| **SWE-bench Lite** | 300 | Smaller, cheaper subset of self-contained tasks | Fast, low-cost iteration and CI-style checks |
| **SWE-bench Multimodal** | — | Tasks that include visual context (e.g. screenshots, UI/JS issues) | Evaluating agents that must reason over images |

**SWE-bench Verified** is the one most people should quote. OpenAI worked with the SWE-bench authors and professional developers to manually review tasks and keep 500 that are well-specified and fairly gradable — removing instances where the issue lacked the information needed to solve it or where the tests were unreasonable. Because the noise is filtered out, Verified scores are a fairer, more apples-to-apples measure of capability, and it is the subset most current leaderboards highlight.

**SWE-bench Lite** is a 300-task subset chosen to be more self-contained and cheaper to run. It is ideal when you are iterating quickly on an agent scaffold and do not want to pay for thousands of Docker builds and model calls on every change. Treat it as a fast signal, not a definitive score.

**SWE-bench Multimodal** extends the idea to tasks where the issue includes visual information — for instance, front-end or JavaScript bugs accompanied by screenshots. It evaluates whether an agent can combine image understanding with code editing, a capability single-modality SWE-bench cannot probe.

## How to read the leaderboard responsibly

SWE-bench scores get quoted constantly in launch announcements, so it is worth knowing how to interpret them without being misled. The benchmark is honest; the marketing around it sometimes is not.

- **Check which subset the number is on.** "62% on SWE-bench" is meaningless without knowing whether that is Lite, Verified, or full. Verified and Lite numbers are systematically higher than full-set numbers because the hard or noisy tasks are removed. Always compare like with like.
- **Separate the model from the scaffold.** A SWE-bench result reflects the *whole system* — the base model **plus** the agent harness (how it explores files, runs tests, retries, and edits). Two reports using the same model can differ by many points purely because of the scaffold. When comparing models, hold the scaffold constant, or compare end-to-end systems and say so.
- **Watch for contamination.** Because tasks come from public GitHub history, a model may have been trained on the actual fixing commits. Held-out variants exist partly to mitigate this; be skeptical of high scores on older instances and prefer cleaner, recent subsets.
- **Look past % Resolved to cost and reliability.** A system that resolves 50% of tasks cheaply and consistently may beat one that resolves 55% with huge token spend and high variance.

For a side-by-side view of how different evaluation methodologies stack up, see our [tool comparison hub](/compare).

## When SWE-bench is the right benchmark

Reach for SWE-bench when your goal is to measure **end-to-end issue resolution on real codebases** — the core competency of a coding agent. Its execution-based grading, two-sided test gates, and provenance in real maintainer-written tests make it far more trustworthy than docstring-to-function benchmarks for that purpose.

It is *not* the right tool for everything. To measure narrow code-generation skill or non-coding capabilities, other benchmarks fit better. And no single benchmark should be your only signal: pair SWE-bench (Verified for headline comparisons, Lite for fast iteration) with your own domain-specific evals built from the bugs your project actually sees. That combination — a public, execution-based benchmark plus a private regression suite — is how serious teams evaluate coding agents in 2026.

## Frequently Asked Questions

### What is SWE-bench?

SWE-bench is an open-source benchmark from Princeton that tests whether language models and coding agents can resolve real software engineering issues. Each task gives the model a real GitHub repository at a base commit plus an issue description, and the model must produce a code patch that fixes it. The patch is graded by applying it and running the project's actual test suite in a Docker container.

### How is a SWE-bench task scored as resolved?

A task is resolved only when the model's patch passes two test sets after being applied. The \`FAIL_TO_PASS\` tests, which failed before the fix, must now pass — proving the issue was actually fixed. The \`PASS_TO_PASS\` tests, which passed before, must still pass — proving nothing was broken. Both conditions are required, so fixing the bug while introducing a regression still fails the task.

### What does "% Resolved" mean in SWE-bench?

% Resolved (also called the resolve rate or pass rate) is the percentage of task instances a model successfully resolved out of the total in the dataset. It is all-or-nothing per task — there is no partial credit. It is only comparable within the same subset, so a percentage on SWE-bench Lite is not directly comparable to one on Verified or the full set.

### What is the difference between SWE-bench, Verified, and Lite?

The full SWE-bench has roughly 2,294 tasks mined from 12 Python repositories. SWE-bench Verified is a 500-task, human-validated subset released by OpenAI that removes noisy or unsolvable tasks, making it the cleanest set for comparing models. SWE-bench Lite is a 300-task subset of more self-contained problems, designed for cheaper, faster evaluation during development.

### Where do SWE-bench tasks come from?

They are mined from merged pull requests in popular open-source Python projects like Django, SymPy, and scikit-learn. SWE-bench takes a PR that closed an issue and changed a test file, then splits the diff: the source changes become the hidden gold patch, and the test changes become the grader. The repository state before the merge is given to the model as the starting point.

### How do I run the SWE-bench evaluation harness?

Install the \`swebench\` package, load a dataset such as \`princeton-nlp/SWE-bench_Verified\` from Hugging Face, and have your agent produce a JSONL predictions file where each line has \`instance_id\`, \`model_patch\`, and \`model_name_or_path\`. Then run \`python -m swebench.harness.run_evaluation\` with \`--dataset_name\`, \`--predictions_path\`, and \`--run_id\`. The harness builds Docker environments, applies each patch, runs the tests, and reports the resolved count.
`,
};
