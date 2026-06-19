import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'OpenAI Evals API Reference 2026: Endpoints, Graders, Runs',
  description:
    'A canonical OpenAI Evals API reference: creating evals, eval runs, data source configs, graders, sampling, reading results, and the oaieval CLI.',
  date: '2026-06-19',
  category: 'Guide',
  content: `
# OpenAI Evals API Reference 2026

This page is a reference for the OpenAI Evals framework and the Evals API as of 2026. It documents the objects, endpoints, parameters, grader types, and command-line entry points used to define, run, and read evaluations of model and prompt behavior. It is organized for lookup rather than narrative reading: each section describes one object or operation, lists its parameters, and shows a minimal runnable example using the \`openai\` Python client.

The Evals API consists of two top-level resources: the eval, which is a reusable definition of a dataset schema plus one or more testing criteria (graders), and the eval run, which executes that definition against a data source and produces graded results. A third surface, the \`oaieval\` command-line tool bundled with the open-source \`openai/evals\` repository, provides a registry-based way to run evals without writing API calls. All three are covered below.

For conceptual background and a tutorial-style walkthrough, see the [OpenAI Evals complete guide](/blog/openai-evals-complete-guide-2026). This page assumes you already understand what an eval is and focuses on the exact shape of the API. Readers comparing frameworks may also reference our [Ragas RAG evaluation metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) and the [DeepEval vs Ragas comparison](/blog/deepeval-vs-ragas-rag-evaluation-2026).

## Authentication and Client Setup

All API calls require an API key supplied through the \`OPENAI_API_KEY\` environment variable or passed explicitly to the client constructor. The Evals API is accessed through the \`client.evals\` namespace of the official Python SDK.

\`\`\`python
import os
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

# The evals namespace exposes evals and nested runs.
client.evals          # eval objects
client.evals.runs     # eval run objects
\`\`\`

The base REST path is \`/v1/evals\`. Runs are nested under an eval at \`/v1/evals/{eval_id}/runs\`. Every object returned includes an \`id\`, an \`object\` type string, and a \`created_at\` Unix timestamp.

## The Eval Object

An eval defines the schema of the data your test items will provide and the testing criteria used to grade model output. It does not itself contain data or invoke a model; that happens at run time. Creating an eval registers a reusable template.

### client.evals.create()

| Parameter | Type | Required | Description |
|---|---|---|---|
| name | string | No | Human-readable label for the eval. |
| data_source_config | object | Yes | Declares the schema of each test item, including item fields and optional sampling output schema. |
| testing_criteria | array | Yes | One or more grader objects applied to each sampled item. |
| metadata | map | No | Up to 16 key-value string pairs for your own bookkeeping. |

The \`data_source_config\` has a \`type\` of either \`custom\` (you define an \`item_schema\` JSON Schema describing each row) or \`logs\` (the source is stored completion logs). The \`include_sample_schema\` flag, when true, tells the API that runs will sample model output to be graded, exposing a \`sample\` namespace to graders.

\`\`\`python
eval_obj = client.evals.create(
    name="qa-accuracy",
    data_source_config={
        "type": "custom",
        "item_schema": {
            "type": "object",
            "properties": {
                "question": {"type": "string"},
                "reference": {"type": "string"},
            },
            "required": ["question", "reference"],
        },
        "include_sample_schema": True,
    },
    testing_criteria=[
        {
            "type": "string_check",
            "name": "exact-match",
            "input": "{{ sample.output_text }}",
            "reference": "{{ item.reference }}",
            "operation": "eq",
        }
    ],
)

print(eval_obj.id)  # e.g. "eval_68a..."
\`\`\`

Template strings use double-brace syntax. \`{{ item.<field> }}\` references a field from a test item; \`{{ sample.output_text }}\` references the model output produced during the run.

### Other eval endpoints

| Operation | Method | Path | Notes |
|---|---|---|---|
| Create eval | POST | /v1/evals | Returns the eval object. |
| Retrieve eval | GET | /v1/evals/{eval_id} | Fetch a single eval by id. |
| List evals | GET | /v1/evals | Supports order, limit, after pagination. |
| Update eval | POST | /v1/evals/{eval_id} | Update name or metadata. |
| Delete eval | DELETE | /v1/evals/{eval_id} | Removes the eval and its runs. |

\`\`\`python
client.evals.retrieve(eval_obj.id)
client.evals.list(limit=20, order="desc")
client.evals.update(eval_obj.id, metadata={"team": "search"})
client.evals.delete(eval_obj.id)
\`\`\`

## The Eval Run Object

An eval run executes an eval against a concrete data source. The run supplies the rows, optionally samples model completions for each row, applies the testing criteria, and aggregates pass/fail counts and per-criterion scores. A single eval can have many runs, which is how you compare prompts, models, or dataset versions over time.

### client.evals.runs.create()

| Parameter | Type | Required | Description |
|---|---|---|---|
| eval_id | string | Yes (path) | The id of the parent eval. |
| name | string | No | Label for this run. |
| data_source | object | Yes | Where rows come from and how output is sampled. |
| metadata | map | No | Key-value pairs for bookkeeping. |

The \`data_source\` object has a \`type\` that is usually \`completions\` or \`responses\`, meaning the API will call the named model to generate the output to be graded. It also carries a \`source\` describing the rows and a \`model\` plus \`input_messages\` template describing how to build each prompt.

\`\`\`python
run = client.evals.runs.create(
    eval_id=eval_obj.id,
    name="gpt-5-baseline",
    data_source={
        "type": "completions",
        "model": "gpt-5",
        "input_messages": {
            "type": "template",
            "template": [
                {
                    "role": "developer",
                    "content": "Answer the question concisely and factually.",
                },
                {"role": "user", "content": "{{ item.question }}"},
            ],
        },
        "source": {
            "type": "file_content",
            "content": [
                {"item": {"question": "Capital of France?", "reference": "Paris"}},
                {"item": {"question": "2 + 2?", "reference": "4"}},
            ],
        },
    },
)

print(run.id, run.status)  # "evalrun_...", "queued"
\`\`\`

### Run lifecycle and endpoints

A run progresses through statuses: \`queued\`, \`in_progress\`, \`completed\`, \`failed\`, or \`canceled\`. Poll the run or list its output items to read results once it completes.

| Operation | Method | Path |
|---|---|---|
| Create run | POST | /v1/evals/{eval_id}/runs |
| Retrieve run | GET | /v1/evals/{eval_id}/runs/{run_id} |
| List runs | GET | /v1/evals/{eval_id}/runs |
| Cancel run | POST | /v1/evals/{eval_id}/runs/{run_id} |
| List output items | GET | /v1/evals/{eval_id}/runs/{run_id}/output_items |
| Retrieve output item | GET | /v1/evals/{eval_id}/runs/{run_id}/output_items/{id} |

## Data Source Configuration Reference

The \`source\` inside a run's \`data_source\` declares where rows come from. Three source types are supported.

| Source type | Description | Key fields |
|---|---|---|
| file_content | Inline rows passed directly in the request. | content (array of {item: {...}}) |
| file_id | Rows from a previously uploaded JSONL file. | id (uploaded file id) |
| stored_completions | Rows derived from logged completions. | metadata filters, limit |

To use an uploaded file, first upload a JSONL file where each line is a JSON object with an \`item\` key, then reference its id.

\`\`\`python
file = client.files.create(
    file=open("golden.jsonl", "rb"),
    purpose="evals",
)

run = client.evals.runs.create(
    eval_id=eval_obj.id,
    name="from-file",
    data_source={
        "type": "completions",
        "model": "gpt-5-mini",
        "input_messages": {
            "type": "template",
            "template": [
                {"role": "user", "content": "{{ item.question }}"},
            ],
        },
        "source": {"type": "file_id", "id": file.id},
    },
)
\`\`\`

Each line of \`golden.jsonl\` looks like:

\`\`\`json
{"item": {"question": "Capital of Japan?", "reference": "Tokyo"}}
\`\`\`

## Testing Criteria: Grader Reference

Testing criteria are the graders applied to each item. The Evals API supports four grader types. Every grader has a \`type\`, a \`name\`, and type-specific parameters. Graders that produce a numeric score also accept a \`pass_threshold\`.

| Grader type | type value | Use case | Output |
|---|---|---|---|
| String check | string_check | Deterministic exact or substring comparison. | pass/fail |
| Text similarity | text_similarity | Fuzzy closeness to a reference string. | score + pass/fail |
| Model grader | label_model / score_model | LLM-as-judge classification or scoring. | label or score |
| Python grader | python | Arbitrary custom logic in sandboxed Python. | score + pass/fail |

### String check grader

Compares two templated strings with a deterministic operation. Supported operations are \`eq\`, \`ne\`, \`like\`, and \`ilike\`.

\`\`\`python
string_grader = {
    "type": "string_check",
    "name": "contains-answer",
    "input": "{{ sample.output_text }}",
    "reference": "{{ item.reference }}",
    "operation": "ilike",
}
\`\`\`

### Text similarity grader

Scores how close the output is to a reference using a chosen evaluation metric such as \`fuzzy_match\`, \`bleu\`, \`rouge_l\`, or \`cosine\`. A \`pass_threshold\` converts the score into pass/fail.

\`\`\`python
similarity_grader = {
    "type": "text_similarity",
    "name": "rouge-overlap",
    "input": "{{ sample.output_text }}",
    "reference": "{{ item.reference }}",
    "evaluation_metric": "rouge_l",
    "pass_threshold": 0.6,
}
\`\`\`

### Model grader (label and score)

A model grader uses an evaluator LLM to judge the output. The \`label_model\` variant classifies output into one of a fixed set of labels and passes when the chosen label is in \`passing_labels\`. The \`score_model\` variant returns a numeric score compared against a threshold.

\`\`\`python
label_grader = {
    "type": "label_model",
    "name": "is-correct",
    "model": "gpt-4o",
    "input": [
        {
            "role": "developer",
            "content": "Classify whether the answer is correct given the reference.",
        },
        {
            "role": "user",
            "content": "Answer: {{ sample.output_text }}\\\\nReference: {{ item.reference }}",
        },
    ],
    "labels": ["correct", "incorrect"],
    "passing_labels": ["correct"],
}
\`\`\`

### Python grader

A Python grader runs sandboxed code that receives the item and sample and returns a numeric result. It must define a function named \`grade\` taking \`sample\` and \`item\` arguments.

\`\`\`python
python_grader = {
    "type": "python",
    "name": "length-penalty",
    "source": (
        "def grade(sample, item):\\\\n"
        "    out = sample['output_text']\\\\n"
        "    ref = item['reference']\\\\n"
        "    if ref.lower() not in out.lower():\\\\n"
        "        return 0.0\\\\n"
        "    # Penalize verbosity beyond 200 chars.\\\\n"
        "    return 1.0 if len(out) <= 200 else 0.5\\\\n"
    ),
    "pass_threshold": 0.75,
}
\`\`\`

## Sampling Configuration

When a run's data source has type \`completions\` or \`responses\`, the API samples model output for each row before grading. Sampling parameters control the generation.

| Field | Type | Description |
|---|---|---|
| model | string | Model id used to generate the output to be graded. |
| input_messages | object | Template that builds the prompt from item fields. |
| sampling_params | object | Optional generation controls: temperature, max_completion_tokens, top_p, seed. |

\`\`\`python
data_source = {
    "type": "completions",
    "model": "gpt-5",
    "input_messages": {
        "type": "template",
        "template": [{"role": "user", "content": "{{ item.question }}"}],
    },
    "sampling_params": {
        "temperature": 0.0,
        "max_completion_tokens": 256,
        "seed": 42,
    },
    "source": {"type": "file_id", "id": "file_abc123"},
}
\`\`\`

Set \`temperature\` to 0.0 and pin a \`seed\` for reproducible runs, which is essential when comparing model versions.

## Reading Results

After a run completes, read aggregate counts from the run object and per-item detail from the output items endpoint. The run object exposes \`result_counts\` with \`passed\`, \`failed\`, \`errored\`, and \`total\`, plus \`per_testing_criteria_results\` breaking pass/fail down by grader.

\`\`\`python
import time

# Poll until the run finishes.
while True:
    run = client.evals.runs.retrieve(eval_id=eval_obj.id, run_id=run.id)
    if run.status in ("completed", "failed", "canceled"):
        break
    time.sleep(5)

print(run.result_counts)
# {"total": 100, "passed": 87, "failed": 12, "errored": 1}

for crit in run.per_testing_criteria_results:
    print(crit.testing_criteria, crit.passed, crit.failed)

# Per-item detail, including the sampled output and each grader's verdict.
items = client.evals.runs.output_items.list(
    eval_id=eval_obj.id,
    run_id=run.id,
    limit=50,
)
for item in items.data:
    print(item.id, item.status, item.results)
\`\`\`

Each output item contains the original \`datasource_item\`, the sampled completion, and a \`results\` array with one entry per testing criterion, where each entry reports \`passed\`, \`score\`, and the grader \`name\`.

## The oaieval CLI and openai-python

The open-source \`openai/evals\` repository provides a registry-based workflow as an alternative to the API. Evals are defined as YAML files in a registry, and the \`oaieval\` command runs a named eval against a named model. This path predates the hosted Evals API and remains useful for local, reproducible, file-based eval definitions.

Install the package and run an eval from the registry:

\`\`\`bash
pip install evals
oaieval gpt-4o my-eval-name --max_samples 100 --record_path results.jsonl
\`\`\`

A registry eval is described by a YAML file referencing a dataset and a grading class.

\`\`\`yaml
# evals/registry/evals/my_eval.yaml
my-eval-name:
  id: my-eval-name.dev.v0
  metrics: [accuracy]
my-eval-name.dev.v0:
  class: evals.elsuite.basic.match:Match
  args:
    samples_jsonl: my_eval/samples.jsonl
\`\`\`

Each line of \`samples.jsonl\` provides the prompt and the ideal answer:

\`\`\`json
{"input": [{"role": "user", "content": "Capital of France?"}], "ideal": "Paris"}
\`\`\`

| oaieval flag | Description |
|---|---|
| --max_samples N | Limit the run to the first N samples. |
| --record_path PATH | Write per-sample records to a JSONL file. |
| --seed N | Set the sampling seed for reproducibility. |
| --completion_args | Pass model parameters such as temperature. |

Choose the hosted Evals API when you want runs stored, graded, and compared in the platform with managed sampling; choose \`oaieval\` when you want fully local, version-controlled eval definitions in your own repository.

## Error Handling and Status Reference

Both eval creation and run execution can fail, and the API surfaces failures at two levels: request-level errors returned synchronously, and item-level errors recorded inside a completed run. Understanding the difference prevents you from treating a partial failure as a total one.

A request-level error is returned immediately when the eval or run object is malformed. Common causes include a \`testing_criteria\` template that references a field absent from the \`item_schema\`, an invalid grader \`type\`, or a missing required parameter. These raise an exception in the SDK before any sampling occurs.

\`\`\`python
from openai import BadRequestError

try:
    run = client.evals.runs.create(
        eval_id=eval_obj.id,
        data_source={
            "type": "completions",
            "model": "gpt-5",
            "input_messages": {
                "type": "template",
                "template": [{"role": "user", "content": "{{ item.missing }}"}],
            },
            "source": {"type": "file_id", "id": "file_abc123"},
        },
    )
except BadRequestError as exc:
    print("Run rejected:", exc.message)
\`\`\`

Item-level errors occur when an individual row fails during sampling or grading, for example a context-length overflow on one oversized prompt. The run still reaches \`completed\` status, but \`result_counts.errored\` is non-zero and the affected output items carry an error payload. Always inspect \`errored\` before trusting an aggregate pass rate.

| Run status | Meaning | Next action |
|---|---|---|
| queued | Accepted, not yet started. | Poll until in_progress. |
| in_progress | Sampling and grading underway. | Continue polling. |
| completed | All items processed (some may have errored). | Read result_counts and output items. |
| failed | The run could not execute. | Inspect the error field on the run. |
| canceled | Canceled via the cancel endpoint. | None. |

## Pagination and Listing Parameters

The list endpoints for evals, runs, and output items share a common cursor-based pagination scheme. Rather than page numbers, you pass the id of the last item you saw as the \`after\` cursor to fetch the next page. This keeps listings stable even as new objects are created.

| Parameter | Type | Default | Description |
|---|---|---|---|
| limit | integer | 20 | Number of objects to return, 1 to 100. |
| order | string | asc | Sort by created_at, asc or desc. |
| after | string | none | Cursor: return objects after this id. |
| status | string | none | Filter runs or items by status. |

\`\`\`python
# Iterate every run of an eval, page by page.
all_runs = []
cursor = None
while True:
    page = client.evals.runs.list(
        eval_id=eval_obj.id,
        limit=100,
        order="asc",
        after=cursor,
    )
    all_runs.extend(page.data)
    if not page.has_more:
        break
    cursor = page.data[-1].id

print(f"Total runs: {len(all_runs)}")
\`\`\`

The same pattern applies to \`client.evals.list()\` and \`client.evals.runs.output_items.list()\`. The \`status\` filter on the output-items list is particularly useful for pulling only the failing items from a large run so you can triage regressions without downloading every passing row.

## Frequently Asked Questions

### What is the difference between an eval and an eval run in the OpenAI Evals API?

An eval is a reusable definition: it declares the schema of each test item through a data_source_config and the testing_criteria used to grade output. An eval run executes that definition against a concrete data source, samples model completions, applies the graders, and produces pass/fail counts. One eval can have many runs, which is how you compare prompts and models over time.

### Which grader type should I use for exact-answer questions?

Use the string_check grader with the eq or ilike operation when the correct answer is a deterministic string. For answers that are correct but phrased differently, use text_similarity with a metric like rouge_l or fuzzy_match and a pass_threshold. For open-ended correctness that needs judgment, use a label_model grader with passing_labels.

### How do I make eval runs reproducible?

Set sampling_params.temperature to 0.0 and pin a seed in the data source, and pin the exact model version rather than a floating alias. With deterministic sampling, the same dataset produces stable output, so any change in scores reflects a real change in the prompt or model rather than sampling noise.

### Can I run OpenAI Evals without the API using a file-based workflow?

Yes. The open-source openai/evals repository provides the oaieval CLI, which runs registry-defined YAML evals against a named model entirely locally. This is ideal when you want version-controlled eval definitions in your own repository. The hosted Evals API is preferable when you want runs stored and compared in the platform with managed sampling.

### How do I read per-item results from a completed run?

Poll the run with client.evals.runs.retrieve until status is completed, then read run.result_counts for aggregates and run.per_testing_criteria_results for a per-grader breakdown. For full per-item detail, call the output_items list endpoint, which returns each item's sampled output and a results array with the verdict from every testing criterion.

### What data source types does an eval run support?

The source inside a run's data_source can be file_content for inline rows, file_id for a previously uploaded JSONL file where each line has an item key, or stored_completions for rows derived from logged completions. The surrounding data_source type is typically completions or responses, which tells the API to sample the named model for each row.

### How does a Python grader receive the model output?

A Python grader defines a function named grade that takes sample and item arguments. The sample dictionary contains the model output, accessible as sample['output_text'], and item contains the original test fields such as item['reference']. The function returns a numeric score that is compared against the grader's pass_threshold to yield pass or fail.

### Can I use model graders with a different model than the one being evaluated?

Yes, and it is recommended. The model field inside a label_model or score_model grader specifies the judge model, which is independent of the model under test set in the run's data_source. A common pattern is to sample output from a smaller or candidate model while grading with a strong judge such as gpt-4o for reliable verdicts.

## Conclusion

The OpenAI Evals API organizes evaluation into two objects, evals and runs, graded by four grader types, and complemented by the local oaieval CLI. Use this reference to look up the exact parameters for creating evals, configuring data sources, choosing graders, controlling sampling, and reading results, then pin your models and seeds for reproducible comparisons across versions.

To go deeper, read the [OpenAI Evals complete guide](/blog/openai-evals-complete-guide-2026) for a full tutorial, and browse the [skills directory](/skills) for ready-made evaluation workflows you can drop into your own agents and CI pipelines.
`,
};
