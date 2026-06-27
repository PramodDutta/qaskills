import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "BFCL Explained: Berkeley Function-Calling Leaderboard for Tool Use (2026)",
  description: "Berkeley Function-Calling Leaderboard (BFCL) explained: how this benchmark scores tool use with AST and executable evaluation, plus how to run it yourself.",
  date: "2026-06-26",
  category: "AI Evals",
  content: `# BFCL Explained: Berkeley Function-Calling Leaderboard for Tool Use (2026)

The **Berkeley Function-Calling Leaderboard (BFCL)** is an open benchmark from UC Berkeley's Gorilla team that measures how well large language models call functions and tools. Given a request and a set of function schemas, a model must emit the *right* call — correct function, arguments, and types — and BFCL grades that two ways: **Abstract Syntax Tree (AST) matching** for structure and **executable evaluation** for real runtime behavior. It spans single, multiple, and parallel calls across Python, Java, JavaScript, and REST, and now reaches multi-turn and agentic tasks. The headline number is **Overall Accuracy**, the unweighted average of every sub-category.

This guide explains what BFCL actually tests, how its scoring works, how the V1→V4 versions evolved, and how to run the eval yourself. BFCL updates frequently, so treat the commands as accurate usage patterns and confirm exact flags against the official \`ShishirPatil/gorilla\` repository before pinning anything in CI.

## What BFCL measures (and why it exists)

Most general LLM benchmarks grade prose: did the model answer, summarize, or solve the math? Function calling is a different skill. The model is given a list of callable tools — each with a name, a description, and a typed parameter schema — and must decide *whether* to call one, *which* one, and with *what arguments*, then format that call so a downstream system can execute it. A wrong field name, a string where an integer belongs, or a hallucinated parameter breaks the whole chain.

BFCL was built to quantify exactly that. It is maintained by the creators of **Gorilla** and **Gorilla OpenFunctions**, UC Berkeley's open models for function calling, and it has become the de facto scoreboard providers cite when claiming "best-in-class tool use." Each leaderboard entry reports an **Overall Accuracy** plus a per-category breakdown and — importantly for production teams — columns for estimated **Cost (USD)** and **Latency (seconds)**, so you can weigh quality against price and speed.

If you have ever shipped an agent that picked the right tool in a demo and then passed a malformed argument on real traffic, BFCL surfaces that failure mode before it reaches users. For a broader primer on how agent and tool scoring fits together, see our [AI agent evaluation overview](/blog).

## The core categories: single, multiple, parallel

The foundation of BFCL is a taxonomy of function-calling *shapes*, defined by how many tools are available and how many calls the correct answer requires.

| Category | Tools available | Calls expected | What it stresses |
|---|---|---|---|
| **Simple** | One | One | Basic schema-filling: right args, right types |
| **Multiple** | Several | One | Tool *selection* — pick the correct function among distractors |
| **Parallel** | One | Several | Decomposing a request into multiple calls at once |
| **Parallel Multiple** | Several | Several | Selection *and* decomposition combined — the hardest base case |

These four shapes are the heart of the benchmark. "Simple" looks easy but still catches models that invent parameters or mis-type values. "Multiple" punishes models that grab the first plausible tool instead of the correct one. "Parallel" and "Parallel Multiple" test whether a model recognizes that one user turn ("book a cab and text my wife the ETA") implies *two independent calls* rather than one.

On top of these shapes, BFCL adds a **relevance / irrelevance** check (introduced with the V2 expansion): the model is handed tools that do **not** fit the request and is expected to *decline* to call anything. This is the function-calling equivalent of knowing what you don't know — a model that fabricates a call for an impossible request fails, even though no schema-filling was involved.

## The two scoring methods: AST vs executable

BFCL's most cited design choice is that it grades function calls **two different ways**, because syntactic correctness and runtime correctness are not the same thing.

### AST evaluation (structural matching)

For most categories, BFCL parses the generated call into an **Abstract Syntax Tree** and compares it against the ground-truth structure. It checks, in order: the function name matches, every *required* parameter is present, each value is allowed (exact match, or within an accepted set/range the annotators defined), and the types are correct. Crucially, AST matching is **order-independent for arguments** and tolerant of multiple valid values, so it does not punish writing \`{"city": "Paris", "units": "metric"}\` versus \`{"units": "metric", "city": "Paris"}\`. It is fast, deterministic, and needs no live API — which is why it covers the bulk of the dataset, including the non-Python languages.

Conceptually, AST scoring asks one question per call:

\`\`\`python
def ast_match(predicted: dict, expected: dict, schema: dict) -> bool:
    # 1. Function name must match
    if predicted["name"] != expected["name"]:
        return False

    pred_args = predicted.get("arguments", {})
    exp_args = expected.get("arguments", {})

    # 2. Every REQUIRED parameter must be present
    for param in schema.get("required", []):
        if param not in pred_args:
            return False

    # 3. Each provided value must be type-correct and allowed
    #    (expected values can be a set of acceptable answers)
    for key, allowed in exp_args.items():
        if key not in pred_args:
            return False
        if pred_args[key] not in as_set(allowed):
            return False

    return True  # argument ORDER is ignored on purpose
\`\`\`

This is illustrative pseudocode, not BFCL's internals — the real checker handles nested objects, optional parameters, numeric tolerances, and language-specific parsing — but it captures the contract: **right name, required params present, values type-correct and within the accepted set.**

### Executable evaluation (runtime matching)

AST matching proves a call is *well-formed*; it does not prove the call *works*. So BFCL also ships an **executable** category where the generated function is actually run against real or simulated APIs, and the **return value** is compared to ground truth. A model can produce a syntactically perfect call that returns the wrong result — wrong endpoint, wrong units, an argument valid in shape but semantically off. Executable evaluation catches that.

The trade-off is practical: executable tests are slower, can hit rate limits, and depend on live services staying up, which is why they cover a focused slice (including REST calls) rather than the whole dataset. Together the two methods give you both *form* (AST) and *function* (executable) — the same instinct as pairing unit assertions with end-to-end checks in QA. For how outcome-based scoring compares to AST, transcript, and rubric grading across tools, see our [evaluation approach comparison hub](/compare).

## Languages and the multi-turn / agentic layers

BFCL is explicitly multi-language. Beyond Python, it includes dedicated **Java**, **JavaScript**, and **REST** categories, because function-calling conventions differ across ecosystems and a model strong in Python JSON can stumble on Java method signatures or live REST endpoints. There is also a **live** family built from real, user-contributed queries and function definitions (versus the original expert-curated set), which better reflects messy production phrasing.

The benchmark has grown well past single-shot calls. Its **multi-turn** categories place the model in a stateful session where it must carry context across turns, ask for missing details, and operate over evolving state, with deliberately hard sub-cases:

- **Base multi-turn** — ordinary multi-step interactions that require chaining several correct calls.
- **Missing parameters** — the user's request omits required information, and the model is expected to *ask* rather than hallucinate a value.
- **Missing function** — no available tool can satisfy the request, and the model should recognize the gap instead of forcing a call.
- **Long context** — information-dense sessions that stress the model's ability to track relevant state over many tokens.

The latest **agentic** layer pushes further still, evaluating tool use inside a full agent loop rather than as an isolated skill — including a **web-search** category where the model must actually retrieve information to finish a task (which is why the harness reads a \`SerpAPI\` key for those tests). The thread through every version is constant: give the model tools and a request, then check whether the calls it produces are correct.

## How BFCL versions evolved (V1 → V4)

BFCL is versioned, and each release widened what "function calling" means. Knowing which version a score refers to is essential, because numbers are not comparable across them.

| Version | Headline addition |
|---|---|
| **V1** | Established **AST** as the core evaluation metric for single/multiple/parallel calls |
| **V2** | Added **enterprise and community-contributed functions** (the "live" data), plus relevance/irrelevance and executable testing |
| **V3** | Introduced **multi-turn and multi-step** interactions with state tracking (missing function, missing parameters, long context) |
| **V4** | Moved to **holistic agentic evaluation**, including web search and tool use inside a full agent loop |

When you read "Model X scores 88% on BFCL," always ask *which version and which categories*. A strong V1 AST number says little about V3 multi-turn reliability or V4 agentic behavior, which are markedly harder. The dataset, harness, and category definitions all live in the same open repository, so any number you see can be reproduced rather than taken on faith.

## How to run BFCL yourself

BFCL ships as an installable package, \`bfcl-eval\`, with a two-step workflow: **generate** model outputs for a set of categories, then **evaluate** those outputs into scores. The Gorilla README explicitly warns not to confuse it with the unrelated \`bfcl\` project on PyPI.

### 1. Install and configure

\`\`\`bash
pip install bfcl-eval

# Tell BFCL where to store result/ and score/ folders (required for PyPI installs)
export BFCL_PROJECT_ROOT="$(pwd)/bfcl-runs"
\`\`\`

Set the provider API keys for whichever proprietary models you'll test — BFCL supports GPT, Claude, Mistral, Gemini, and Nova families — and a \`SerpAPI\` key if you plan to run the web-search category:

\`\`\`bash
export OPENAI_API_KEY="..."
export ANTHROPIC_API_KEY="..."
# Only needed for the web_search / agentic category:
export SERPAPI_API_KEY="..."
\`\`\`

### 2. Generate model responses

Run inference for one or more models across one or more categories. Models use a provider-specific id; a \`-FC\` suffix selects the model's **native function-calling** interface, while the same id without \`-FC\` uses prompt-based formatting (BFCL scores both styles so you can compare them fairly):

\`\`\`bash
bfcl generate \\
  --model claude-3-5-sonnet-20241022-FC,gpt-4o-2024-11-20-FC \\
  --test-category simple_python,parallel,multi_turn_base \\
  --num-threads 4
\`\`\`

Key flags, decoded:

- \`--model\` — comma-separated model ids. The \`-FC\` suffix = native function calling.
- \`--test-category\` — comma-separated categories. Examples include \`simple_python\`, \`parallel\`, \`live_multiple\`, \`multi_turn\`, \`multi_turn_base\`, and \`web_search\`; the full list lives in the repo's \`TEST_CATEGORIES.md\`.
- \`--num-threads\` — parallel inference workers for API models (default \`1\`).

For locally hosted open models, \`bfcl generate\` also exposes a \`--backend {vllm|sglang}\` flag (with \`--num-gpus\`, \`--gpu-memory-utilization\`, and LoRA options) so you can serve the weights yourself instead of calling a hosted API.

### 3. Evaluate into scores

Once outputs exist, score them with the matching categories:

\`\`\`bash
bfcl evaluate \\
  --model claude-3-5-sonnet-20241022-FC,gpt-4o-2024-11-20-FC \\
  --test-category simple_python,parallel,multi_turn_base
\`\`\`

This writes per-category accuracy into your score directory. Useful flags include \`--partial-eval\` (score only the entries you actually generated) and \`--result-dir\` / \`--score-dir\` to point at custom locations.

### 4. Read the results responsibly

The leaderboard's **Overall Accuracy is the unweighted average of all sub-categories** — so one headline number blends easy "simple" tasks with brutal multi-turn ones. To interpret a run well:

- **Report categories, not just the average.** "92% simple, 54% multi-turn" tells you far more than "73% overall," because the average hides where a model breaks.
- **Match the interface to production.** If you ship native tool calling, evaluate the \`-FC\` variant; comparing your prompt-based setup to someone else's FC score is apples-to-oranges.
- **Weigh cost and latency.** The USD and seconds columns matter — a two-point accuracy gain that triples latency may not be worth it for a real-time agent.
- **Pin the version.** Re-running months later on a newer dataset will move numbers for reasons unrelated to your model.

\`\`\`python
# Overall Accuracy = unweighted mean of per-category accuracy.
category_scores = {
    "simple_python": 0.94,
    "parallel": 0.81,
    "multiple": 0.88,
    "multi_turn_base": 0.57,
    "irrelevance": 0.79,
}

overall = sum(category_scores.values()) / len(category_scores)
print(f"Overall Accuracy: {overall:.1%}")  # 79.8% — note how multi_turn drags it down
\`\`\`

## When to reach for BFCL

Use BFCL when you are choosing or tuning a model whose job is to **call tools** — function-calling APIs, agent toolchains, structured-output pipelines — and you want a standardized, reproducible comparison across providers. Its category breakdown lets you match the benchmark to your workload: weight "parallel" if your agent fans out calls, "multi-turn" if it holds conversations, "irrelevance" if false calls are costly. It is *not* the right tool for grading free-form generation quality, reasoning depth, or end-to-end success in a bespoke domain — for those, reach for a task-specific eval or a stateful agent benchmark. To find install-ready evaluation and agent-testing skills for AI coding agents, browse [/skills](/skills).

## Frequently Asked Questions

### What is the Berkeley Function-Calling Leaderboard (BFCL)?

BFCL is an open benchmark from UC Berkeley's Gorilla team that measures how accurately large language models generate function and tool calls. Given a user request plus a set of typed function schemas, a model must produce the correct call — right function, right arguments, right types — and BFCL grades it with Abstract Syntax Tree (AST) matching and executable evaluation. Its leaderboard ranks models by Overall Accuracy, the unweighted average of all sub-categories, alongside cost and latency.

### How does BFCL's AST evaluation differ from executable evaluation?

AST evaluation parses the generated call into a syntax tree and checks that the function name, required parameters, values, and types match the ground truth, ignoring argument order — it proves the call is *well-formed* without running anything. Executable evaluation actually runs the generated function against real or simulated APIs and compares the return value, proving the call *works*. AST covers most of the dataset because it's fast and deterministic; executable tests cover a focused slice (including REST) because they're slower and depend on live services.

### What categories does BFCL test?

The base categories are simple (one tool, one call), multiple (several tools, pick one), parallel (one tool, several calls), and parallel multiple (several tools, several calls), plus a relevance/irrelevance check where the model should decline to call anything. Beyond those, BFCL adds dedicated Java, JavaScript, and REST categories, a "live" family built from real user-contributed queries, multi-turn categories (base, missing parameters, missing function, long context), and an agentic layer including web search. Overall Accuracy averages across all of them.

### How do I run BFCL on my own model?

Install the official package with \`pip install bfcl-eval\` (not the unrelated \`bfcl\` PyPI project), set \`BFCL_PROJECT_ROOT\` and your provider API keys, then use the two-step CLI. Run \`bfcl generate --model <id> --test-category <categories>\` to produce outputs, then \`bfcl evaluate --model <id> --test-category <categories>\` to score them. Add a \`-FC\` suffix to the model id to test native function calling, and confirm the current category names in the repo's \`TEST_CATEGORIES.md\`.

### What do the BFCL versions (V1–V4) mean?

V1 established AST matching for single, multiple, and parallel calls; V2 added enterprise and community-contributed "live" functions plus relevance and executable testing; V3 introduced multi-turn and multi-step interactions with state tracking; and V4 moved to holistic agentic evaluation including web search. Scores are not comparable across versions, so always note which version a number refers to, especially since later versions are substantially harder than the original AST-only tests.

### Is BFCL free to use?

Yes. BFCL is open source and lives in the \`ShishirPatil/gorilla\` repository, and the evaluator installs from PyPI as \`bfcl-eval\`. You still need API access to whichever proprietary model providers you want to benchmark (GPT, Claude, Mistral, Gemini, Nova) — and a SerpAPI key for the web-search category — and those calls incur each provider's own token costs, which add up across large multi-category runs.
`,
};
