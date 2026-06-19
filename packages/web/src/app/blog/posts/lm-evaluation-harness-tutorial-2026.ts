import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "lm-evaluation-harness Tutorial: Run LLM Benchmarks (2026)",
  description: "Learn EleutherAI's lm-evaluation-harness in 2026: install lm_eval, run MMLU/GSM8K/HellaSwag tasks, evaluate HF and API models, and read results.",
  date: "2026-06-15",
  category: "AI Evals",
  content: `# lm-evaluation-harness Tutorial: Run LLM Benchmarks (2026)

The **lm-evaluation-harness** (the \`lm_eval\` package from EleutherAI) is the de-facto standard tool for benchmarking large language models on academic tasks like MMLU, GSM8K, HellaSwag, and ARC. You install it with \`pip install lm-eval\`, then run a one-line command such as \`lm_eval --model hf --model_args pretrained=meta-llama/Llama-3.1-8B --tasks mmlu,gsm8k --device cuda:0 --batch_size 8\`. It loads the model, executes every prompt in the chosen task suite, scores the outputs against gold answers, and prints a reproducible accuracy table. It is the same harness that powers the Hugging Face Open LLM Leaderboard.

This guide walks through installation, the model backends, running and combining tasks, few-shot configuration, evaluating API models, writing a custom task, reading the metrics, and fixing the errors you will actually hit.

## Why lm-evaluation-harness is the standard

When a model card claims "67.3% on MMLU," that number is almost always produced by lm-evaluation-harness or a fork of it. Standardizing on one harness matters because tiny implementation differences — how answer choices are scored, whether log-likelihoods are length-normalized, which few-shot examples are used — can swing a reported score by several points. By running the *same* harness with the *same* task version, you get apples-to-apples comparisons across models and across time.

Key properties:

- **300+ built-in tasks**, including MMLU, GSM8K, HellaSwag, ARC, TruthfulQA, WinoGrande, BBH, GPQA, IFEval, and many multilingual sets.
- **Multiple backends**: local Hugging Face models, vLLM for fast batched inference, and API models (OpenAI-compatible, Anthropic, and others).
- **Versioned tasks** so a benchmark definition can be pinned and reproduced.
- **Reproducible output**: results serialized to JSON with the full config, model args, and per-task version.

If you are evaluating *application* behavior (a RAG pipeline, an agent, a chatbot) rather than raw model knowledge, a harness like this is the wrong tool — reach for an application-eval framework instead. Browse the [QA and eval skills directory](/skills) for those. lm-eval is specifically for benchmarking a model on fixed, gold-labeled datasets.

## Installation

You need Python 3.9 or newer. Install from PyPI:

\`\`\`bash
pip install lm-eval
\`\`\`

For the cutting-edge version and optional backends, install from source with extras:

\`\`\`bash
git clone https://github.com/EleutherAI/lm-evaluation-harness
cd lm-evaluation-harness
pip install -e ".[vllm,api]"
\`\`\`

The bracketed extras pull in optional dependencies: \`vllm\` for the high-throughput vLLM backend, \`api\` for hosted-model providers, \`math\` for the symbolic answer-checking used by some math tasks, and \`multilingual\` for tokenizers used by non-English sets. Install only what you need.

Verify the CLI is on your path:

\`\`\`bash
lm_eval --help
\`\`\`

## Listing available tasks

Before running anything, see what is installed. Task names are what you pass to \`--tasks\`:

\`\`\`bash
lm_eval --tasks list
\`\`\`

This prints hundreds of task identifiers and groups. A *group* (like \`mmlu\`) expands into many sub-tasks (one per subject), and the harness reports both per-subject scores and an aggregate.

## Your first benchmark run

Run HellaSwag — a commonsense sentence-completion task — against a small local model:

\`\`\`bash
lm_eval \\
  --model hf \\
  --model_args pretrained=EleutherAI/pythia-160m \\
  --tasks hellaswag \\
  --device cuda:0 \\
  --batch_size 16
\`\`\`

What each flag does:

- \`--model hf\` selects the Hugging Face \`transformers\` backend.
- \`--model_args\` is a comma-separated string of keyword arguments passed to the backend. \`pretrained=\` is the model ID or local path.
- \`--tasks\` is a comma-separated list of task or group names.
- \`--device\` is the compute device (\`cuda:0\`, \`cpu\`, or \`mps\` on Apple Silicon).
- \`--batch_size\` controls throughput; pass \`auto\` to let the harness pick the largest batch that fits in memory.

When the run finishes you get a results table printed to stdout:

\`\`\`
|  Tasks  |Version|Filter|n-shot| Metric |Value |   |Stderr|
|---------|------:|------|-----:|--------|-----:|---|-----:|
|hellaswag|      1|none  |     0|acc     |0.3081|±  |0.0046|
|         |       |none  |     0|acc_norm|0.3854|±  |0.0049|
\`\`\`

\`acc\` is raw accuracy; \`acc_norm\` is accuracy after normalizing each candidate's log-likelihood by its byte length (the standard reported number for multiple-choice tasks). \`Stderr\` is the standard error of the mean — your uncertainty given the sample size.

## Running multiple tasks at once

Pass several tasks or groups together. The harness loads the model once and runs everything, which is far cheaper than separate invocations:

\`\`\`bash
lm_eval \\
  --model hf \\
  --model_args pretrained=meta-llama/Llama-3.1-8B,dtype=bfloat16 \\
  --tasks mmlu,gsm8k,arc_challenge,winogrande \\
  --device cuda:0 \\
  --batch_size auto \\
  --output_path results/llama31-8b
\`\`\`

\`--output_path\` writes a JSON file with the full results, the resolved config, the model args, and each task's version — essential for reproducibility and for anyone trying to replicate your numbers later.

## Controlling few-shot count

Many leaderboard numbers are *few-shot*: the prompt includes a handful of solved examples before the question. MMLU is conventionally 5-shot, GSM8K is often 5-shot or 8-shot. Override the default with \`--num_fewshot\`:

\`\`\`bash
lm_eval \\
  --model hf \\
  --model_args pretrained=meta-llama/Llama-3.1-8B \\
  --tasks mmlu \\
  --num_fewshot 5 \\
  --device cuda:0 \\
  --batch_size auto
\`\`\`

The few-shot count is part of what makes a score comparable — a 0-shot MMLU number and a 5-shot MMLU number are different benchmarks. Always report it. Note that some newer tasks pin their own few-shot count in the task config and will warn if you override it.

## Faster inference with vLLM

For large models or large task suites, the vanilla \`transformers\` backend is slow. The \`vllm\` backend batches aggressively and is dramatically faster on a GPU:

\`\`\`bash
lm_eval \\
  --model vllm \\
  --model_args pretrained=meta-llama/Llama-3.1-8B,tensor_parallel_size=1,gpu_memory_utilization=0.8 \\
  --tasks mmlu,gsm8k \\
  --batch_size auto
\`\`\`

\`tensor_parallel_size\` shards the model across multiple GPUs; \`gpu_memory_utilization\` caps how much VRAM vLLM reserves for its KV cache. Scores should match the \`hf\` backend within noise — if they diverge meaningfully, suspect a tokenizer or chat-template mismatch.

## Evaluating API models

You can benchmark hosted models too, though it costs money per token and only generation-based tasks (not log-likelihood multiple-choice tasks) work for endpoints that do not expose token logprobs.

For an OpenAI-compatible chat endpoint:

\`\`\`bash
export OPENAI_API_KEY="sk-..."

lm_eval \\
  --model openai-chat-completions \\
  --model_args model=gpt-4o-mini \\
  --tasks gsm8k \\
  --apply_chat_template
\`\`\`

\`--apply_chat_template\` wraps each prompt in the model's chat format (system/user roles), which is required for instruction-tuned and chat models — without it you will get garbage scores because the prompt is malformed for that model.

For local OpenAI-compatible servers (vLLM's server, Ollama, LM Studio, TGI), point the backend at your base URL:

\`\`\`bash
lm_eval \\
  --model local-completions \\
  --model_args model=my-model,base_url=http://localhost:8000/v1/completions \\
  --tasks hellaswag
\`\`\`

If you are deciding between hosting your own model and calling an API, the trade-offs are similar to other infra build-vs-buy calls — see our [comparison guides](/compare) for the general framework.

## Writing a custom task

Built-in tasks live as YAML files. To add your own benchmark, create a YAML that points at a dataset and declares how to build the prompt and score the answer. A minimal multiple-choice task:

\`\`\`yaml
task: my_custom_qa
dataset_path: json
dataset_kwargs:
  data_files: ./data/my_qa.jsonl
output_type: multiple_choice
doc_to_text: "Question: {{question}}\\nAnswer:"
doc_to_choice: "{{choices}}"
doc_to_target: "{{label}}"
metric_list:
  - metric: acc
\`\`\`

Then register the directory and run it:

\`\`\`bash
lm_eval \\
  --model hf \\
  --model_args pretrained=EleutherAI/pythia-410m \\
  --tasks my_custom_qa \\
  --include_path ./my_tasks \\
  --device cuda:0
\`\`\`

\`output_type\` is the most important field. \`multiple_choice\` scores by log-likelihood over fixed answer options; \`generate_until\` lets the model free-generate and matches against a target with a filter (regex extraction, exact match, etc.). Pick \`generate_until\` for open-ended tasks like math word problems where the answer must be parsed out of generated text.

## Reading the results JSON

The file written by \`--output_path\` contains a \`results\` block (the scores), a \`configs\` block (every task's resolved config and \`version\`), and a \`config\` block (model, model args, num_fewshot, batch size, git hash). When you compare two runs, check that the task \`version\` numbers match — if EleutherAI bumped a task's version between your runs, the benchmark definition changed and the numbers are not directly comparable.

A reproducibility checklist worth following on every reported number:

- Pin the harness version (commit hash or PyPI version).
- Record the task name **and** version.
- Record \`--num_fewshot\`.
- Record whether \`--apply_chat_template\` was used.
- Record the backend (\`hf\` vs \`vllm\` vs an API) and dtype.

## Common errors and fixes

**\`CUDA out of memory\`** — Lower \`--batch_size\` (or set it to \`auto\`), use \`dtype=bfloat16\` or \`dtype=float16\` in \`--model_args\`, or switch to the \`vllm\` backend which manages memory better. For very large models, add \`parallelize=True\` (hf backend) or raise \`tensor_parallel_size\` (vllm).

**Scores far below the model card** — Almost always a prompt-format problem. For instruction/chat models, add \`--apply_chat_template\`. Confirm your \`--num_fewshot\` matches the leaderboard's, and confirm you are running the same task *version*.

**\`Task not found\`** — Run \`lm_eval --tasks list\` to get the exact identifier; names change between versions, and custom tasks require \`--include_path\`.

**API task returns zeros or errors** — Multiple-choice tasks need token logprobs. If your endpoint does not expose them, use a \`generate_until\` task instead, or pick the chat-completions backend with a generation task like GSM8K.

**Non-deterministic results across runs** — Sampling introduces variance. For generation tasks set a fixed seed via \`--seed\`, and prefer greedy decoding for benchmarking. Log-likelihood (multiple-choice) tasks are deterministic by construction.

## End-to-end example: comparing two models

A realistic workflow — benchmark a base model and an instruction-tuned variant on the same suite, then diff the JSON:

\`\`\`bash
# Base model
lm_eval --model hf \\
  --model_args pretrained=meta-llama/Llama-3.1-8B,dtype=bfloat16 \\
  --tasks mmlu,gsm8k,arc_challenge \\
  --num_fewshot 5 --batch_size auto \\
  --output_path results/base

# Instruction-tuned model (chat template ON)
lm_eval --model hf \\
  --model_args pretrained=meta-llama/Llama-3.1-8B-Instruct,dtype=bfloat16 \\
  --tasks mmlu,gsm8k,arc_challenge \\
  --num_fewshot 5 --batch_size auto \\
  --apply_chat_template \\
  --output_path results/instruct
\`\`\`

Now you have two JSON files with identical task versions and few-shot counts, differing only in the model and chat-template flag — a clean comparison you can publish or feed into CI.

## Frequently Asked Questions

### What is the lm-evaluation-harness used for?
It benchmarks large language models on standardized academic tasks (MMLU, GSM8K, HellaSwag, ARC, and 300+ others) and produces reproducible accuracy scores. It is the harness behind the Hugging Face Open LLM Leaderboard, so it is the standard tool for comparing models on raw capability. It is not designed for evaluating application behavior like RAG pipelines or agents.

### How do I install lm_eval?
Run \`pip install lm-eval\` for the released version, or clone the EleutherAI GitHub repo and run \`pip install -e ".[vllm,api]"\` for the latest code plus optional backends. You need Python 3.9 or newer. Verify the install with \`lm_eval --help\`.

### Why are my benchmark scores lower than the model card?
The most common cause is prompt formatting. For instruction-tuned or chat models you must pass \`--apply_chat_template\`, otherwise the prompt is malformed and scores collapse. Also confirm your \`--num_fewshot\` matches the published setting and that you are running the same task version, since EleutherAI versions tasks and definitions change over time.

### Can lm-evaluation-harness evaluate OpenAI or Anthropic API models?
Yes. Use the \`openai-chat-completions\` (or a comparable provider) backend, set the API key as an environment variable, and pass the model name in \`--model_args\`. Note that multiple-choice tasks need token logprobs, so for endpoints that do not expose them, use generation-based tasks like GSM8K instead.

### What is the difference between acc and acc_norm?
\`acc\` is raw accuracy — the fraction of questions where the model assigned the highest probability to the correct choice. \`acc_norm\` normalizes each choice's log-likelihood by its length (in bytes) before picking the winner, which corrects for the bias toward shorter answers. For multiple-choice tasks, \`acc_norm\` is usually the headline number reported on leaderboards.

### How do I add a custom benchmark task?
Create a YAML file declaring \`dataset_path\`, an \`output_type\` (\`multiple_choice\` or \`generate_until\`), and \`doc_to_text\` / \`doc_to_choice\` / \`doc_to_target\` templates that build the prompt and target from your dataset fields. Put it in a directory and run with \`--tasks your_task --include_path ./your_dir\`. Use \`generate_until\` for open-ended answers that need to be parsed out of generated text.
`,
};
