import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QA Engineer to AI Testing Engineer Roadmap',
  description:
    'Follow a practical QA engineer to AI testing engineer roadmap through Python, model evals, RAG measurement, agent traces, and portfolio evidence.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# QA Engineer to AI Testing Engineer Roadmap

Your first useful AI evaluation can be a 40-row CSV and a Python function. It does not require training a model or deriving transformer attention. If those rows represent costly user requests, the expected answers are reviewable, and the function exposes regressions, you are already applying mature QA thinking to a probabilistic system.

The transition from QA engineer to AI testing engineer is less about abandoning test engineering than extending its observation model. Exact outputs become distributions and scored qualities. A single request becomes a dataset. A deterministic oracle becomes a combination of rules, references, model graders, and human review. Release evidence must cover prompts, retrieval, models, tools, and safety policy as versioned components.

This roadmap is organized by evidence you can produce, not certificates you can collect. Move faster through areas you already know, but do not skip the artifacts. A hiring manager or engineering lead can inspect an evaluation report, a failure taxonomy, and a reproducible repository. They cannot inspect that you “understand LLM quality” from a list of course titles.

## Reframe familiar QA skills for probabilistic behavior

Boundary analysis, risk-based testing, observability, data design, API automation, and defect triage remain central. Their application changes. A chatbot answer can be acceptable without matching a reference string. The same prompt can produce different wording. A model update can improve helpfulness and worsen citation faithfulness. Retrieval can fail even when the generator behaves perfectly with supplied context.

Map existing strengths to new test objects:

| Existing QA capability | AI-system extension | Portfolio evidence |
|---|---|---|
| Equivalence partitioning | Dataset slices by intent, language, risk, and ambiguity | Slice-level score report |
| API contract testing | Structured output, tool arguments, token limits, refusal schema | JSON Schema validation suite |
| Test data management | Curated prompts, references, contexts, adversarial cases | Versioned evaluation dataset |
| Root-cause analysis | Separate retrieval, generation, model, prompt, and tool faults | Failure taxonomy with labeled examples |
| Performance testing | Time to first token, end-to-end latency, token consumption | Percentile report by request class |
| Security testing | Prompt injection, data leakage, unsafe tool use | Threat-based attack set and mitigations |
| Release gating | Metric thresholds plus critical-case invariants | CI evaluation policy with trend comparison |

The hardest adjustment is resisting one binary quality number. AI products have multiple failure surfaces. Measure them separately so a better average cannot cancel a severe regression in a high-risk slice.

## Weeks 1 to 3: Python as an evaluation workbench

Learn enough Python to manipulate datasets, call HTTP APIs, write tests, handle async work, and produce reports. Focus on standard library fundamentals, type hints, \`pytest\`, \`pandas\` or a lighter table tool, JSON, regular expressions, and virtual environments. You do not need advanced machine learning mathematics to build a reliable first harness.

Implement deterministic evaluators before adding an LLM judge. They are cheap, explainable, and excellent for invariants: valid JSON, required citations, forbidden secrets, exact tool name, numeric bounds, refusal presence, and duplicate sources.

\`\`\`python
# tests/test_support_answer_contract.py
import re

import pytest


def citation_ids(answer: str) -> set[str]:
    return set(re.findall(r"\\[source:([a-z0-9-]+)\\]", answer.lower()))


def evaluate_answer(answer: str, allowed_sources: set[str]) -> dict[str, bool]:
    used = citation_ids(answer)
    return {
        "has_citation": bool(used),
        "citations_known": used.issubset(allowed_sources),
        "no_unresolved_placeholder": "TODO" not in answer,
        "within_length": len(answer.split()) <= 180,
    }


@pytest.mark.parametrize(
    ("answer", "allowed", "expected"),
    [
        (
            "Reset the key in Settings. [source:account-security]",
            {"account-security"},
            {"has_citation": True, "citations_known": True},
        ),
        (
            "Email the old key to support. [source:unknown-page]",
            {"account-security"},
            {"has_citation": True, "citations_known": False},
        ),
    ],
)
def test_answer_contract(answer, allowed, expected):
    result = evaluate_answer(answer, allowed)
    for metric, value in expected.items():
        assert result[metric] is value
\`\`\`

This is not a claim that citation presence proves factual correctness. It is a contract layer. Label every metric with what it establishes and what it does not. That habit prevents teams from promoting proxy scores into unjustified product claims.

By the end of this phase, you should be able to load a JSONL dataset, execute a system under test for each case, persist raw responses and metadata, calculate deterministic results, and generate a failure list. Keep raw artifacts so evaluators can be rerun without paying for another model call.

## Weeks 4 to 6: Design datasets that represent decisions

An evaluation dataset is not a random prompt dump. Each record needs a reason to exist and enough metadata for analysis. Begin with 30 to 100 carefully reviewed cases drawn from product requirements, production failures, support tickets, and known risk boundaries. Synthetic generation can expand coverage later, but human-curated anchor cases protect intent.

Recommended fields include case ID, user input, reference answer or grading criteria, relevant source IDs, risk, locale, intent, expected tool behavior, prohibited behavior, and provenance. Avoid storing personal data merely because production logs contain it. Redact or synthesize with a documented method.

Create slices before running metrics. A 92 percent aggregate can hide that all password-reset questions pass while every billing exception fails. Slice by business capability, criticality, language, answerability, prompt length, and attack class. Do not create dozens of tiny slices that cannot support a decision; choose partitions connected to ownership and risk.

| Dataset layer | Purpose | Change control |
|---|---|---|
| Smoke anchors | Fast, critical behavior on each pull request | Product and QA approval |
| Regression cases | Reproduce previously observed failures | Add with every confirmed defect |
| Capability set | Broad feature and intent coverage | Reviewed per release cycle |
| Adversarial set | Injection, leakage, manipulation, unsafe requests | Security-owned, access controlled when needed |
| Fresh holdout | Detect overfitting to visible evaluation cases | Restricted and periodically renewed |
| Production sample | Observe real distribution with privacy safeguards | Time-windowed, redacted, consent-aware |

Version dataset and evaluator separately. If both change in the same pull request, the score movement is ambiguous. Record model identifier, parameters, prompt hash, retriever configuration, tool definitions, and evaluation code revision with every run.

## Weeks 7 to 9: Separate retrieval from generation

RAG systems add a testable pipeline before generation. Measure whether the retriever found relevant chunks, whether relevant chunks rank early, whether irrelevant context crowded the window, and whether the answer stayed grounded in what was retrieved. A good final answer can occur despite poor retrieval because the model memorized the fact. That should not pass a retrieval evaluation.

Implement a transparent retrieval metric before adopting a framework. If dataset records identify relevant document IDs, precision at k and recall at k are straightforward. Precision asks what fraction of the first k retrieved items is relevant. Recall asks what fraction of all labeled relevant items appeared in those k.

\`\`\`python
# rag_eval.py
from dataclasses import dataclass


@dataclass(frozen=True)
class RetrievalCase:
    query: str
    relevant_ids: set[str]


def precision_at_k(ranked_ids: list[str], relevant_ids: set[str], k: int) -> float:
    selected = ranked_ids[:k]
    if not selected:
        return 0.0
    return sum(item in relevant_ids for item in selected) / len(selected)


def recall_at_k(ranked_ids: list[str], relevant_ids: set[str], k: int) -> float:
    if not relevant_ids:
        raise ValueError("A labeled case needs at least one relevant document")
    return len(set(ranked_ids[:k]) & relevant_ids) / len(relevant_ids)


case = RetrievalCase(
    query="Can an owner rotate an API key without downtime?",
    relevant_ids={"key-rotation", "overlapping-credentials"},
)
ranking = ["key-rotation", "password-reset", "overlapping-credentials"]

assert precision_at_k(ranking, case.relevant_ids, 2) == 0.5
assert recall_at_k(ranking, case.relevant_ids, 3) == 1.0
\`\`\`

Next, add answer faithfulness or groundedness evaluation. LLM-based graders can evaluate qualities that resist exact rules, but they introduce model variance, cost, latency, and grader bias. Calibrate them against a human-labeled set. Track agreement by failure category, not only overall correlation. Prompt the grader with explicit criteria and require structured reasoning fields for audit, while being cautious about displaying chain-of-thought-like internal content.

Your RAG portfolio project should compare chunk size, embedding model, top-k, metadata filters, and reranking on one fixed dataset. Report tradeoffs instead of announcing a winner. The ideal top-k for short policy answers may differ from research synthesis.

## Weeks 10 to 12: Evaluate agents as trajectories

An agent is more than its final prose. It selects tools, constructs arguments, observes results, updates state, and decides when to stop. A plausible final answer can conceal an unauthorized tool call. A failed final answer can arise from a perfect plan followed by one unavailable dependency. Capture the trajectory.

Define invariants for each task class: allowed tools, forbidden tools, maximum calls, required confirmation before side effects, argument schemas, success condition, and recovery behavior. Then score both outcome and process. Avoid requiring one exact sequence when several valid plans exist.

\`\`\`python
# agent_trace_checks.py
from typing import Any


def check_trace(
    events: list[dict[str, Any]],
    allowed_tools: set[str],
    max_calls: int,
) -> list[str]:
    violations: list[str] = []
    calls = [event for event in events if event.get("type") == "tool_call"]

    if len(calls) > max_calls:
        violations.append(f"tool call budget exceeded: {len(calls)} > {max_calls}")

    for call in calls:
        tool = call.get("tool")
        if tool not in allowed_tools:
            violations.append(f"tool not allowed: {tool}")
        if not isinstance(call.get("arguments"), dict):
            violations.append(f"arguments for {tool} are not an object")

    return violations


trace = [
    {"type": "tool_call", "tool": "catalog_search", "arguments": {"sku": "A-17"}},
    {"type": "tool_result", "status": "ok"},
    {"type": "final", "text": "Item A-17 is in stock."},
]

assert check_trace(trace, {"catalog_search"}, max_calls=2) == []
\`\`\`

Add scenarios for tool timeouts, malformed results, conflicting sources, permission denial, and partial completion. Test that the agent does not invent a result when a tool fails. For consequential actions, verify confirmation and idempotency boundaries. The [AI agent eval testing guide](/blog/ai-agent-eval-testing-guide) develops these trajectory and outcome patterns further.

## Months 4 to 6: Build an evaluation system, not a notebook

Notebooks are useful for exploration. Release evaluation needs repeatable execution, configuration, caching, artifacts, and CI integration. Package the runner as a command that accepts dataset version, system endpoint, concurrency, and output directory. Validate configuration at startup. Save one result record per case so interrupted runs can resume safely.

Separate generation from scoring. Stage one calls the product and records model outputs, retrieved contexts, tool traces, timing, token usage, and errors. Stage two applies deterministic and model-based evaluators. Stage three aggregates by slice and compares against a baseline. This architecture lets you change an evaluator without regenerating answers and lets reviewers inspect raw evidence.

Use concurrency carefully. Provider rate limits, shared vector stores, and stateful agents can make a highly parallel harness measure throttling rather than product behavior. Record retries and do not silently replace rate-limited cases. Cost budgets belong in configuration, and the runner should stop cleanly before exceeding them.

CI gates should begin with critical invariants and small smoke sets. Run broader, expensive evaluations nightly or before a release. Compare paired cases against the accepted baseline rather than relying only on a fixed global threshold. A release can pass the average yet regress ten important cases; a paired report makes those cases visible.

## Human review is part of the test architecture

Human evaluation is not a fallback for weak automation. It defines quality criteria, calibrates graders, resolves disputed examples, and finds new failure categories. Design a rubric with observable dimensions such as correctness, relevance, completeness, groundedness, tone, and policy compliance. Give raters examples at the boundaries.

Blind reviewers to model version when possible. Randomize order, collect independent ratings for a subset, and discuss disagreements. Do not fabricate precision from subjective labels. Report sample size and agreement method, and retain rationales permitted by privacy policy.

Active review can focus human time on cases where evaluators disagree, confidence is low, a high-risk slice changes, or a novel failure cluster appears. The automation prioritizes attention; humans improve the taxonomy and dataset. That feedback loop is more valuable than treating an LLM judge as permanent ground truth.

## A portfolio that proves engineering judgment

One deep project beats five thin chat wrappers. Build a small support RAG service or tool-using agent with a versioned evaluation repository. Include a README that states risks, system boundaries, dataset provenance, metric definitions, reproducibility steps, and known limitations.

Publish these artifacts without secrets or proprietary data:

1. A dataset schema with reviewed example cases and slice labels.
2. A runner that stores raw results and resumes interrupted work.
3. Deterministic checks plus one calibrated model-based evaluator.
4. Retrieval and generation reports separated by configuration.
5. Agent trace checks for allowed tools, arguments, and stopping behavior.
6. A regression report comparing two prompts or retrievers.
7. A defect narrative showing how evidence led to a fix.

The project should contain an honest “what this does not prove” section. For example, 50 English support cases do not establish multilingual safety. A context precision score does not establish answer correctness. A local mock tool does not establish production authorization. Senior judgment is visible in those boundaries.

## Choosing tools without becoming tool-dependent

Learn concepts through a small manual implementation, then adopt frameworks where they reduce plumbing. Evaluation libraries can supply metrics, dataset objects, experiment tracking, and integrations. Observability platforms can capture traces and compare runs. None replaces an explicit product quality model.

Evaluate tools on data portability, custom metric support, asynchronous execution, caching, self-hosting needs, provider coverage, trace schema, cost visibility, and CI output. Export raw records in a format you control. If a vendor score cannot be explained to a product owner, it should not be the only release gate.

Keep model and framework APIs behind adapters. AI libraries change quickly, and evaluation repositories live longer than demo code. Pin dependencies, record evaluator model versions, and add contract tests around serialized results. The general [QA engineer skills career guide 2026](/blog/qa-engineer-skills-career-guide-2026) can help position these additions alongside test architecture, delivery, and leadership skills.

## A weekly practice rhythm after the roadmap

Reserve one session for dataset maintenance, one for framework or research reading, and one for a measured experiment. Review production failures with product and domain specialists. Add confirmed cases to regression data. Recalibrate model graders when their model or prompt changes.

Write short evaluation memos. State the decision, configuration, dataset, results by slice, failure examples, costs, and limitations. Clear technical writing is part of the role because AI quality decisions cross engineering, product, legal, security, and operations.

Interview preparation should use the same material. Be ready to explain why a metric was selected, how leakage was prevented, how nondeterminism was managed, why a threshold is justified, and what evidence would change your conclusion. That discussion distinguishes evaluation engineering from merely calling a model API.

## Frequently Asked Questions

### Do I need machine learning mathematics before applying for AI testing roles?

You need working literacy in probability, classification metrics, embeddings, sampling, and experimental design, but you can begin useful evaluation work before advanced mathematics. Learn theory alongside concrete harnesses and deepen it as the product's risk demands.

### Which language should a QA engineer learn first for AI evaluation?

Python is the practical first choice because model, data, RAG, and evaluation ecosystems center on it. Keep TypeScript if your product and agent stack use it, but gain enough Python to inspect examples, build datasets, and run evaluation libraries confidently.

### How large should my first eval dataset be?

Start with dozens of carefully justified cases, not thousands of unreviewed prompts. Cover critical intents and failure boundaries, label slices, then grow from production evidence and systematic generation. Report the size honestly and avoid broad claims from a narrow sample.

### Is an LLM judge acceptable as a release gate?

It can contribute after calibration against human labels, but it should not stand alone for critical invariants. Combine it with deterministic checks, slice-level thresholds, disagreement review, and stored raw evidence. Version the judge model and rubric like test code.

### What is the strongest portfolio signal for an AI testing engineer?

A reproducible evaluation project that changes an engineering decision. Show the dataset rationale, raw traces, metrics, regression comparison, defect analysis, and limitations. The reasoning connecting evidence to action matters more than the number of frameworks listed.
`,
};
