import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Setting RAG Answer-Relevance Test Thresholds",
  description:
    "Set RAG answer-relevance test thresholds by calibrating metric scores to human judgments, query slices, evaluator variance, and explicit release costs.",
  date: "2026-07-13",
  category: "AI Testing",
  content: `
# Setting RAG Answer-Relevance Test Thresholds

An answer scoring 0.78 may be a crisp response to a two-part policy question, while a 0.86 answer may repeat the query and dodge the requested decision. The ordering depends on the evaluator, domain, language, and response shape. Choosing 0.80 because it looks round converts an uncalibrated signal into a brittle gate.

Answer relevance asks whether the response addresses the user’s request directly and sufficiently. It does not establish factual correctness, grounding, citation quality, or retrieval recall. A usable threshold maps relevance scores to reviewed product judgments, then makes the resulting false-pass and false-fail tradeoff explicit.

## Write the relevance rubric in observable terms

Human reviewers need more than “is this relevant?” Define what a passing response does for the product. For a policy assistant, it may answer every material part, stay on the requested entity and time period, avoid unrelated background, and ask a necessary clarification rather than guessing. For a troubleshooting assistant, a direct next action may matter more than a general explanation.

Use an ordinal label before asking reviewers for a continuous score:

| Label | Operational meaning | Illustrative behavior |
| --- | --- | --- |
| Fully relevant | Directly resolves all answerable parts | Gives eligibility and the required next step |
| Mostly relevant | Resolves the main intent with minor omission or excess | Correct action, but unnecessary background |
| Borderline | Related but materially incomplete or indirect | Describes policy without answering eligibility |
| Irrelevant | Fails the intent or answers another question | Discusses account setup for a billing dispute |
| Proper clarification | Cannot answer safely without one missing detail | Asks which subscription tier applies |

Decide how clarification maps to pass/fail. Treating every non-answer as irrelevant punishes the correct handling of ambiguous queries. Include an answerability or clarification-required field in the dataset so the metric can be interpreted against the right expected behavior.

Reviewers should label the response without seeing the automated score. Otherwise anchoring causes the human reference to imitate the metric. Give them the user query, conversation context needed to resolve pronouns, and response. Hide retrieval chunks if the task is pure answer relevance; show them for groundedness review, which is a different label.

## Understand the score you plan to threshold

Different evaluators assign “relevance” differently. A cross-encoder may score a query-answer pair. An embedding method may compare vector similarity. An LLM judge may apply a rubric. Ragas Response Relevancy generates questions from the response, embeds those generated questions and the original user input, then averages cosine similarities. That method rewards an answer from which the original question can be reconstructed, and it can penalize incompleteness or extra content.

The score range and distribution are evaluator-specific. Even when documentation describes a nominal zero-to-one scale, cosine similarity is mathematically capable of negative values. Do not clamp, rescale, or compare versions silently. Record evaluator model, embedding model, prompt or metric version, and parameters such as the number of generated questions.

The [Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) explains the metric family. Threshold calibration remains your responsibility because the library cannot know the product cost of a borderline answer.

## Generate scores with the current Ragas API

The collections-based Ragas API constructs an \`AnswerRelevancy\` scorer from an evaluator LLM and embeddings. The example below uses the documented OpenAI adapters and synchronous \`.score()\` method. It requires \`OPENAI_API_KEY\` in the environment and installed \`ragas\` and \`openai\` packages.

\`\`\`python
from openai import AsyncOpenAI
from ragas.embeddings.base import embedding_factory
from ragas.llms import llm_factory
from ragas.metrics.collections import AnswerRelevancy


client = AsyncOpenAI()
evaluator_llm = llm_factory("gpt-4o-mini", client=client)
evaluator_embeddings = embedding_factory(
    "openai",
    model="text-embedding-3-small",
    client=client,
)
scorer = AnswerRelevancy(
    llm=evaluator_llm,
    embeddings=evaluator_embeddings,
)

result = scorer.score(
    user_input="Can an owner cancel a workspace immediately?",
    response=(
        "An owner can schedule cancellation from Billing. "
        "Access continues through the current billing period."
    ),
)
print(float(result.value))
\`\`\`

This is a real scoring call, but a single result is not a threshold. Run the same pinned scorer over a labeled evaluation set and store one row per item. Preserve errors and timeouts separately from low scores. Converting an evaluator failure to zero makes infrastructure instability look like product irrelevance.

For reproducibility, cache scores for a given evaluator version and response hash. When recalibrating with a new evaluator, write new columns rather than overwriting old results. That makes distribution shifts visible.

## Select candidate cutoffs from reviewed data

Convert the human rubric into the release target. For example, \`fully relevant\` and \`mostly relevant\` might pass, \`borderline\` might require review, and \`irrelevant\` should fail. If proper clarifications are a separate class, evaluate them with a clarification rubric rather than forcing them into the same numeric threshold.

For each possible cutoff, count:

- True pass: metric passes a human-acceptable response.
- False pass: metric passes a human-unacceptable response.
- True fail: metric fails a human-unacceptable response.
- False fail: metric fails a human-acceptable response.

The following runnable script selects the lowest false-pass rate, then uses false-fail rate as a tiebreaker. In a real project, constrain candidate cutoffs and costs according to risk rather than relying on this simple ordering.

\`\`\`python
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class LabeledScore:
    score: float
    human_pass: bool
    slice_name: str


def rates(rows: list[LabeledScore], threshold: float) -> dict[str, float]:
    acceptable = [row for row in rows if row.human_pass]
    unacceptable = [row for row in rows if not row.human_pass]
    false_fails = sum(row.score < threshold for row in acceptable)
    false_passes = sum(row.score >= threshold for row in unacceptable)
    return {
        "false_fail_rate": false_fails / len(acceptable),
        "false_pass_rate": false_passes / len(unacceptable),
    }


calibration = [
    LabeledScore(0.91, True, "single-fact"),
    LabeledScore(0.84, True, "single-fact"),
    LabeledScore(0.77, True, "multi-part"),
    LabeledScore(0.74, False, "multi-part"),
    LabeledScore(0.68, False, "clarification"),
    LabeledScore(0.81, False, "single-fact"),
]

candidates = [0.70, 0.75, 0.80, 0.85]
for cutoff in candidates:
    print(cutoff, rates(calibration, cutoff))
\`\`\`

This tiny data is illustrative only. Calibration requires enough independently reviewed examples, especially around the expected boundary. If every passing response scores above 0.95 and every failing response below 0.30, the dataset may contain only easy extremes. Add plausible partial answers, verbose deflections, correct clarifications, and answers that cover one of several requested parts.

## Price false passes and false fails differently

A false pass allows an irrelevant answer through the gate. A false fail blocks a useful answer or sends it to review. Their costs vary by surface. An internal knowledge assistant may tolerate occasional false fails in CI to avoid confusing production responses. A creative exploration tool may prefer fewer unnecessary blocks.

Express the choice as expected review and escape cost:

\`\`\`text
threshold cost = (false passes * escape cost) + (false fails * review cost)
\`\`\`

This model is a decision aid, not an invoice. Costs may be ordinal levels rather than currency. Safety, legal, or accessibility impacts should not be reduced to a speculative dollar value. The point is to document asymmetry and obtain product risk ownership.

A two-threshold policy is often practical. Scores at or above the high threshold pass automatically. Scores below the low threshold fail. The middle band gets human review or a second evaluator. The band absorbs metric noise near the decision boundary and produces more valuable adjudications for future calibration.

## Calibrate slices before accepting one global floor

Answer length, query type, language, and ambiguity change score distributions. A short correct response such as “No” can be highly relevant to a yes/no question but give a reverse-question generator little material. Multi-part queries often score differently when one part is omitted. Clarifications resemble non-answers unless evaluated in context.

| Slice | Common scoring distortion | Calibration response |
| --- | --- | --- |
| Yes/no with rationale optional | Very short good answers have sparse semantic signal | Require rationale or use a dedicated decision check |
| Multi-part questions | One answered part dominates similarity | Add coverage labels and per-part assertions |
| Ambiguous requests | Correct clarification looks indirect | Separate clarification-required oracle |
| Multilingual responses | Embedding quality varies by language | Review and threshold per supported language |
| Long procedural answers | Extra steps can mask a missing requested action | Pair relevance with required-step coverage |
| Conversational follow-ups | Standalone query lacks referent | Score with resolved context or rewritten query |

Do not create a distinct threshold for every tiny subgroup. That overfits and becomes impossible to operate. Use a global policy where distributions and errors are similar, separate thresholds where reviewed evidence shows meaningful differences, and hard deterministic checks for invariants the relevance metric cannot see.

Report macro slice performance and traffic-weighted performance. A high-volume easy slice can otherwise conceal a low-volume but important failure. The [complete RAG evaluation metrics guide](/blog/rag-evaluation-metrics-complete-2026) helps pair relevance with retrieval, faithfulness, and citation measures so no single average becomes a quality proxy.

## Separate relevance from adjacent quality dimensions

A concise hallucination can be perfectly relevant. A grounded answer can be irrelevant because it cites accurate facts that do not answer the question. A relevant answer can omit citations. Therefore, a release gate should be conjunctive for critical requirements:

\`\`\`text
release pass = relevance pass
               AND groundedness pass
               AND required citation pass
               AND safety pass
\`\`\`

Do not average these scores into one number unless the product explicitly accepts compensation. A relevance score of 0.99 should not offset an unsupported refund amount. Preserve blocking invariants and use relevance as its own user-experience dimension.

Retrieval relevance is also different from answer relevance. The retriever may return excellent context while the generator responds with a tangent. Conversely, the model may answer relevantly from memorized knowledge after retrieval fails, which can violate a grounded product contract. Test stage outputs independently, then keep an end-to-end gate.

## Measure evaluator stability near the boundary

Ragas Answer Relevancy uses generated questions and model calls, so repeated scoring may vary. Sample repeated evaluations for items near candidate cutoffs. Record the mean, range, standard deviation, and threshold-crossing frequency. A response that passes four runs and fails six is unsuitable for a hard single-sample gate.

Pin model versions and metric configuration when the provider supports it. Use caching in CI for unchanged outputs. For a release candidate, either repeat boundary items and apply a documented aggregation rule or route them to review. Never retry until a preferred score appears.

Human labels also vary. Have multiple reviewers label a stratified subset, calculate agreement, and adjudicate disagreements. If experts cannot agree whether a response is relevant under the rubric, lowering metric variance will not solve the definition problem.

| Instability source | Detection | Mitigation |
| --- | --- | --- |
| Generated-question variation | Repeat identical score calls | Cache, pin, or aggregate documented repeats |
| Embedding model change | Distribution shift on frozen responses | Recalibrate and version thresholds |
| Human rubric ambiguity | Reviewer disagreement | Add examples and adjudication rules |
| Response sampling | Multiple answers for same query | Fix decoding for regression or model distribution |
| Retrieval drift | Same answer run receives changed context | Snapshot corpus and record pipeline versions |

## Turn the threshold into an explainable test report

When a candidate fails, show query, response, score, threshold, human label if available, slice, baseline score, and adjacent quality checks. Sort by distance below threshold and business risk. Include a paired view so reviewers see whether the candidate introduced the problem or inherited it.

Fail the run on policy, not on missing evaluator data. If scoring times out, mark the evaluation incomplete and use a distinct infrastructure exit. Otherwise teams will tune the product to compensate for evaluator outages. Track cost and latency of evaluation because a perfect threshold on an unaffordable suite will not run consistently.

Version the policy in a small manifest with evaluator identifiers, global threshold, slice overrides, review band, dataset version, and approval. A threshold change deserves review separate from an application change. Loosening the gate in the same pull request it blocks is acceptable only with new human calibration evidence, not because delivery is urgent.

## Validate the threshold after deployment

Offline labels age. User intents change, the corpus grows, and new answer styles appear. Sample privacy-safe production interactions for expert review, emphasizing low-score passes, high-score user complaints, novel queries, and underrepresented slices. Compare production score distributions with the calibration set.

User feedback is useful discovery data, not a clean relevance label. People downvote correct answers for tone or latency and accept irrelevant answers when they already know the solution. Adjudicate feedback before adding it to the golden set.

Monitor the false-pass rate, false-fail rate, review-band volume, evaluator error rate, and slice drift. Recalibrate when evaluator or model versions change, the domain expands, or disagreement rises. Keep an immutable holdout set to detect threshold overfitting.

## Stress the cutoff with bootstrap resampling

A selected threshold can be an accident of which reviewed examples landed in calibration. Bootstrap resampling gives a practical stability check: repeatedly sample labeled rows with replacement, select or evaluate the cutoff on each sample, and inspect how much the error rates move. Wide variation signals insufficient or unbalanced evidence.

\`\`\`python
import random
from statistics import quantiles


def bootstrap_false_pass_rates(rows, threshold, rounds=1000, seed=42):
    rng = random.Random(seed)
    observed = []
    for _ in range(rounds):
        sample = [rng.choice(rows) for _ in rows]
        unacceptable = [row for row in sample if not row.human_pass]
        if unacceptable:
            observed.append(
                sum(row.score >= threshold for row in unacceptable) / len(unacceptable)
            )
    lower, _, upper = quantiles(observed, n=4)
    return {"q1": lower, "median": sorted(observed)[len(observed) // 2], "q3": upper}


print(bootstrap_false_pass_rates(calibration, threshold=0.80))
\`\`\`

This example reports quartiles rather than a formal confidence interval and reuses the earlier \`LabeledScore\` data. For production analysis, stratify resampling when the dataset design requires fixed slice proportions, and keep entity-related variants in the same sampling unit. Treating ten paraphrases as ten independent observations produces false certainty.

Also repeat the entire selection on a time-based holdout. Bootstrap stability within one dataset cannot reveal a new intent or language absent from that dataset. A robust cutoff is stable under resampling, performs on later reviewed traffic, and produces tolerable errors in every critical slice. If these checks disagree, expand the review set or introduce a targeted deterministic check instead of adding decimal places to the threshold.

## Frequently Asked Questions

### Is 0.8 a good default RAG relevance threshold?

No universal cutoff transfers safely across evaluators and domains. Use reviewed outputs to measure false passes and false fails at candidate values. A threshold from a different embedding model, judge prompt, language, or query mix is only a hypothesis.

### Should a relevance test include retrieved context?

Not when the label strictly asks whether the response addresses the user input. Context belongs in groundedness and faithfulness evaluation. Include conversation context needed to resolve the request, but do not let irrelevant retrieved text redefine the user’s intent.

### How should correct clarifying questions be scored?

Mark which inputs require clarification and evaluate whether the response asks for the missing information directly. A general answer-relevance metric may underrate a non-answer, so use a separate clarification rubric or slice-specific evaluator.

### What should happen to scores inside the review band?

Send them to a trained reviewer or independent second evaluator under a documented rule. Preserve adjudications as new calibration evidence. Do not repeatedly rescore until one run crosses the automatic-pass line.

### Must the threshold change after upgrading Ragas or an evaluator model?

Assume recalibration is required until a frozen benchmark proves score distributions and classification errors remain equivalent. Write results to a new versioned column, compare paired outcomes, and promote the new policy only after review.
`,
};
