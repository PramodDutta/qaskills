---
name: OpenAI Evals Trace Grading
description: Grade LLM and agent traces with OpenAI Evals - build datasets, configure string/python/model graders, run eval suites, and gate agent behavior changes in CI.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [openai-evals, llm-evals, trace-grading, agent-evaluation, model-grader, ci, datasets, llm-as-judge]
testingTypes: [llm-evals, regression, integration]
frameworks: [openai-evals, pytest]
languages: [python]
domains: [ai, llm, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# OpenAI Evals Trace Grading Skill

You are an expert in grading the behavior of LLMs and agents with OpenAI Evals. When the user asks you to evaluate agent traces, build an eval, or grade model outputs, you assemble a dataset of inputs with reference outputs, choose the cheapest grader that can decide correctness, run the eval, and wire it into CI so behavior regressions block merges. You always prefer a deterministic grader over a model grader when the correctness check can be expressed as code or an exact match.

## Core Principles

1. **A trace is the unit of evaluation.** An agent trace = the input, the steps/tool calls taken, and the final output. Grade the final output by default; grade intermediate steps when tool-use correctness matters.
2. **Pick the cheapest grader that can decide.** String/exact-match is free and deterministic. Python graders handle structured checks. Model graders (LLM-as-judge) are last resort for open-ended quality.
3. **Datasets are versioned JSONL.** Each line is one test sample with `input` and the reference needed to grade it. The dataset is the contract; commit it.
4. **Graders return a pass/fail and a score.** A score of 0-1 enables thresholds; a boolean enables hard gates. Always emit both where possible.
5. **Pin the grader model.** When using a model grader, fix the model and temperature 0 so the same trace scores identically across runs.
6. **Separate the system under test from the grader.** Never grade a model's output with the same model instance that produced it in a single uncontrolled call.
7. **CI gates on aggregate pass rate, not single samples.** A run passes when the pass rate clears a committed threshold; one hard sample failing is expected noise.
8. **Make graders explainable.** A failing grade must say *why* (expected vs actual, which rubric criterion failed) so a human can act in seconds.

## Project Layout

```
evals/
  data/
    support_agent.jsonl        # versioned dataset, one sample per line
  graders/
    exact_match.py
    json_schema_grader.py
    rubric_grader.py           # model-graded rubric
  config/
    support_agent.eval.json    # eval suite config (datasets + graders + threshold)
  run_eval.py                  # loads traces, runs graders, writes results.json
  gate.py                      # pass-rate gate for CI
.github/workflows/agent-evals.yml
```

## Dataset Format (JSONL)

Each line carries the input, an `ideal` reference answer, and optional `expected_tools` for trace-level grading.

```jsonl
{"id": "refund-window", "input": "What's the refund window for digital goods?", "ideal": "14 days", "expected_tools": ["search_policy"]}
{"id": "plan-support", "input": "Does Pro include priority support?", "ideal": "yes", "expected_tools": ["search_policy"]}
{"id": "out-of-scope", "input": "What's the weather in Paris?", "ideal": "I can only help with account and billing questions.", "expected_tools": []}
{"id": "json-extract", "input": "Extract the order id and amount from: order ABC-991 for $42.50", "ideal": "{\"order_id\": \"ABC-991\", \"amount\": 42.50}", "expected_tools": []}
```

## Capturing Agent Traces

Run the agent under test and record a structured trace per sample.

```python
# trace.py
from dataclasses import dataclass, field, asdict


@dataclass
class Trace:
    sample_id: str
    input: str
    output: str
    tool_calls: list[str] = field(default_factory=list)
    ideal: str | None = None
    expected_tools: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def run_agent_on_dataset(dataset: list[dict], agent) -> list[Trace]:
    traces: list[Trace] = []
    for sample in dataset:
        result = agent.run(sample["input"])  # your agent: returns output + tool_calls
        traces.append(Trace(
            sample_id=sample["id"],
            input=sample["input"],
            output=result.output,
            tool_calls=[c.name for c in result.tool_calls],
            ideal=sample.get("ideal"),
            expected_tools=sample.get("expected_tools", []),
        ))
    return traces
```

## Grader 1: String / Exact-Match (Deterministic, Free)

```python
# graders/exact_match.py
from trace import Trace


def grade(trace: Trace) -> dict:
    """Pass if the ideal answer appears (normalized) in the output."""
    expected = (trace.ideal or "").strip().lower()
    actual = trace.output.strip().lower()
    passed = expected in actual
    return {
        "grader": "string_contains",
        "passed": passed,
        "score": 1.0 if passed else 0.0,
        "reason": "" if passed else f"expected to contain '{trace.ideal}', got '{trace.output[:120]}'",
    }
```

## Grader 2: Python Grader (Structured Checks + Trace Steps)

```python
# graders/json_schema_grader.py
import json
from trace import Trace


def grade(trace: Trace) -> dict:
    """Grade a JSON-extraction trace: valid JSON, right keys, right values,
    AND the correct tools were called."""
    reasons: list[str] = []

    # 1. Output must parse as JSON matching the ideal.
    try:
        actual = json.loads(trace.output)
        ideal = json.loads(trace.ideal)
        if actual != ideal:
            reasons.append(f"json mismatch: expected {ideal}, got {actual}")
    except (json.JSONDecodeError, TypeError) as e:
        reasons.append(f"output not valid JSON: {e}")

    # 2. Trace-level check: exactly the expected tools were used.
    if sorted(trace.tool_calls) != sorted(trace.expected_tools):
        reasons.append(
            f"tool calls {trace.tool_calls} != expected {trace.expected_tools}"
        )

    passed = not reasons
    return {
        "grader": "python_json+tools",
        "passed": passed,
        "score": 1.0 if passed else 0.0,
        "reason": "; ".join(reasons),
    }
```

## Grader 3: Model Grader (LLM-as-Judge for Open-Ended Quality)

Use a model grader only when correctness is a judgment call. Pin the model and force a structured verdict.

```python
# graders/rubric_grader.py
import json
from openai import OpenAI
from trace import Trace

client = OpenAI()
GRADER_MODEL = "gpt-4o-mini"   # pinned

RUBRIC = """You are grading a customer-support agent's answer.
Return JSON: {"passed": bool, "score": float 0-1, "reason": str}.
Criteria:
- ACCURATE: consistent with the reference answer.
- IN-SCOPE: only answers account/billing topics; refuses off-topic politely.
- NO HALLUCINATION: makes no claim absent from the reference.
Fail if any criterion is violated."""


def grade(trace: Trace) -> dict:
    user = (f"Question: {trace.input}\n"
            f"Reference answer: {trace.ideal}\n"
            f"Agent answer: {trace.output}\n\nGrade it.")
    resp = client.chat.completions.create(
        model=GRADER_MODEL,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[{"role": "system", "content": RUBRIC},
                  {"role": "user", "content": user}],
    )
    verdict = json.loads(resp.choices[0].message.content)
    return {
        "grader": "model_rubric",
        "passed": bool(verdict["passed"]),
        "score": float(verdict["score"]),
        "reason": verdict.get("reason", ""),
    }
```

## Eval Suite Config (JSON)

Map each dataset sample type to the grader that should score it. This config is the declarative description of the eval run.

```json
{
  "eval_name": "support_agent_v3",
  "dataset": "evals/data/support_agent.jsonl",
  "grader_model": "gpt-4o-mini",
  "pass_rate_threshold": 0.9,
  "grading_rules": [
    { "match_id_prefix": "json-", "grader": "graders.json_schema_grader" },
    { "match_id_prefix": "out-of-scope", "grader": "graders.rubric_grader" },
    { "default": true, "grader": "graders.exact_match" }
  ]
}
```

## Running the Eval

```python
# run_eval.py
import importlib
import json

from trace import run_agent_on_dataset
from my_agent import build_agent


def load_jsonl(path: str) -> list[dict]:
    with open(path) as f:
        return [json.loads(line) for line in f if line.strip()]


def pick_grader(sample_id: str, rules: list[dict]):
    for rule in rules:
        prefix = rule.get("match_id_prefix")
        if prefix and sample_id.startswith(prefix):
            return importlib.import_module(rule["grader"]).grade
    default = next(r for r in rules if r.get("default"))
    return importlib.import_module(default["grader"]).grade


def main() -> None:
    config = json.load(open("evals/config/support_agent.eval.json"))
    dataset = load_jsonl(config["dataset"])
    traces = run_agent_on_dataset(dataset, build_agent())

    results = []
    for trace in traces:
        grade = pick_grader(trace.sample_id, config["grading_rules"])
        result = grade(trace)
        result["sample_id"] = trace.sample_id
        results.append(result)
        flag = "PASS" if result["passed"] else "FAIL"
        print(f"[{flag}] {trace.sample_id:20s} score={result['score']:.2f} {result['reason']}")

    passed = sum(r["passed"] for r in results)
    pass_rate = passed / len(results)
    report = {
        "eval_name": config["eval_name"],
        "pass_rate": round(pass_rate, 4),
        "threshold": config["pass_rate_threshold"],
        "n": len(results),
        "results": results,
    }
    json.dump(report, open("results.json", "w"), indent=2)
    print(f"\nPass rate: {pass_rate:.1%} (threshold {config['pass_rate_threshold']:.0%})")


if __name__ == "__main__":
    main()
```

## CI Gate and Workflow

```python
# gate.py
import json
import sys

report = json.load(open("results.json"))
if report["pass_rate"] < report["threshold"]:
    failed = [r["sample_id"] for r in report["results"] if not r["passed"]]
    print(f"EVAL FAILED: {report['pass_rate']:.1%} < {report['threshold']:.0%}")
    print("Failing samples: " + ", ".join(failed))
    sys.exit(1)
print(f"EVAL PASSED: {report['pass_rate']:.1%}")
```

```yaml
# .github/workflows/agent-evals.yml
name: Agent Evals
on:
  pull_request:
    paths: ["src/agent/**", "src/prompts/**", "evals/**"]
jobs:
  evals:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r requirements.txt   # includes openai
      - name: Run evals
        env: { OPENAI_API_KEY: "${{ secrets.OPENAI_API_KEY }}" }
        run: python evals/run_eval.py
      - name: Gate on pass rate
        run: python evals/gate.py
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: eval-results, path: results.json }
```

## Best Practices

1. **Reach for the cheapest grader first.** Exact-match and Python graders are deterministic and free; spend model-grader budget only on genuinely open-ended outputs.
2. **Grade tool-call correctness, not just final text, for agents.** A right answer reached by calling the wrong tool is a latent bug.
3. **Pin the grader model and temperature 0.** Reproducible scores are the whole point of a regression gate.
4. **Force structured verdicts from model graders.** `response_format=json_object` plus an explicit `reason` field makes failures debuggable.
5. **Gate on aggregate pass rate from a committed threshold.** Per-sample flakiness should not block a merge; an overall drop should.
6. **Version the JSONL dataset and the eval config together.** A pass rate is only meaningful for a fixed dataset version.
7. **Emit a per-sample reason on every fail.** "FAIL refund-window: expected '14 days', got '30 days'" turns triage into seconds.
8. **Scope the CI workflow to agent/prompt/eval paths.** Keeps paid grader calls off unrelated PRs.

## Anti-Patterns to Avoid

1. **Using a model grader for checks a regex or `==` could do.** It is slower, costs money, and is less reliable than the deterministic option.
2. **Grading with an unpinned model.** Scores drift, the gate flaps, and the team learns to ignore it.
3. **Only grading the final answer for agentic systems.** You miss wrong-tool and wrong-step regressions entirely.
4. **Storing the dataset inline in code.** It becomes unreviewable and impossible to version. Keep it in JSONL.
5. **Gating on a single sample's pass/fail.** Builds become flaky; legitimate hard cases block merges.
6. **A model grader that returns free text.** You cannot parse pass/fail reliably; demand structured JSON.
7. **Reusing the production agent object as its own judge in one call.** The grader must be an independent, pinned model.

## When to Trigger This Skill

Trigger when the user asks to:
- Grade or evaluate agent / LLM traces or transcripts
- Set up OpenAI Evals or an eval suite with graders
- Build a dataset and string/python/model graders for an agent
- Add a CI gate that blocks merges on agent behavior regressions
- Choose between exact-match, code-based, and LLM-as-judge grading
- Evaluate tool-call correctness in an agent trace

For RAG-specific metrics (faithfulness, context precision/recall), use the RAG Evaluation Metrics skill. For long-term drift gating of RAG pipelines, use the RAG Regression Testing skill.
