import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Human-in-the-Loop LLM Evaluation Workflow Guide',
  description:
    'Run human-in-the-loop LLM evaluation workflows with calibrated reviewers, adjudication, rubrics, and datasets that improve release decisions.',
  date: '2026-07-10',
  category: 'AI Testing',
  content: `
# Human-in-the-Loop LLM Evaluation Workflow Guide

Two reviewers read the same support answer. One marks it acceptable because it is polite and mostly right. The other rejects it because it invents a refund policy. The model did not change between those reviews. The evaluation system did. Human-in-the-loop LLM evaluation is the discipline of making that review process consistent enough to guide releases.

Automation can score many things: exact match, JSON validity, retrieval citation presence, latency, toxicity classifiers, and LLM-as-a-judge rubrics. Human review is still needed when the risk depends on product judgment, domain nuance, legal interpretation, empathy, or whether an answer would actually help a user. The goal is not to turn humans into slow unit tests. The goal is to use human judgment where it has the highest signal and to measure that judgment honestly.

This guide covers dataset sampling, rubric design, reviewer calibration, double review, adjudication, release gates, and how to combine human labels with automated evaluators. It pairs with dataset construction in the [OpenAI agent evals datasets workflow guide](/blog/openai-agent-evals-datasets-workflow-guide-2026) and automated grading patterns in the [LLM-as-a-judge evaluation guide](/blog/llm-as-a-judge-evaluation-guide).

## Start with the decision the review must support

Human evaluation is expensive. Before writing a rubric, decide what decision the review will influence. Are you choosing between two prompts? Approving a retrieval change? Measuring whether a safety mitigation works? Auditing production failures? Training an automated judge? Each decision needs a different sample and a different tolerance for disagreement.

A release gate needs representative coverage and clear pass criteria. A model comparison needs paired examples so reviewers can compare outputs under the same prompt. A safety audit needs risk-weighted sampling, not a random feed of easy cases. A judge-training set needs labels that are consistent enough to become reference data.

| Evaluation decision | Sampling approach | Human review emphasis |
|---|---|---|
| Release approval | Stratified sample across user intents and risk levels | Pass/fail against product rubric |
| Prompt A/B comparison | Same inputs reviewed for both variants, order blinded | Preference plus reason codes |
| Safety mitigation audit | Oversample known risky intents and policy boundaries | Harm category, severity, refusal quality |
| RAG retrieval change | Examples grouped by answerability and citation needs | Groundedness, missing context, citation support |
| Judge calibration | Double-labeled examples with adjudicated final labels | Reviewer agreement and label clarity |

Do not mix all of these into one spreadsheet and call it an evaluation. The review form may look similar, but the analysis is different. If the question is release readiness, the output should be a release recommendation. If the question is reviewer calibration, the output should be agreement and rubric revisions.

## Write rubrics reviewers can actually apply

A useful rubric describes observable behavior. Vague labels such as good, bad, helpful, or safe produce inconsistent review. Better labels say what counts as grounded, what counts as a critical omission, when a refusal is required, and which mistakes are release blockers.

Keep scoring scales small. A three-level scale often works better than a seven-level scale because reviewers can apply it consistently. For example: pass, minor issue, fail. If severity matters, define severity with consequences: minor issue does not change the user's decision, major issue could mislead the user, critical issue causes policy, legal, security, financial, or safety risk.

Each rubric item should have examples. If reviewers are judging hallucination, show an answer that invents a policy, an answer that makes a harmless wording change, and an answer that correctly says the context is insufficient. Calibration examples reduce interpretation drift more than another paragraph of policy text.

## Build a review queue with traceable records

Every human label should be traceable to the input, model output, model version, prompt version, retrieval context, reviewer, rubric version, and timestamp. Without that, labels become anecdotes. The code below creates a small review packet from model outputs and writes JSONL records that can be assigned to reviewers.

\`\`\`python
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Literal


Risk = Literal["low", "medium", "high"]


@dataclass(frozen=True)
class ReviewItem:
    item_id: str
    prompt_id: str
    prompt_version: str
    model: str
    user_input: str
    retrieved_context: list[str]
    model_answer: str
    risk: Risk
    rubric_version: str


items = [
    ReviewItem(
        item_id="refund-001",
        prompt_id="support_answer",
        prompt_version="2026-07-03",
        model="candidate-model",
        user_input="Can I get a refund after 45 days?",
        retrieved_context=["Annual plans are refundable within 30 days of purchase."],
        model_answer="You can request a refund within 30 days. After 45 days, support can review exceptions.",
        risk="high",
        rubric_version="support-rubric-v4",
    )
]

with Path("review_queue.jsonl").open("w", encoding="utf-8") as file:
    for item in items:
        file.write(json.dumps(asdict(item), ensure_ascii=False) + "\\n")
\`\`\`

This is deliberately plain. Many teams will store the same records in a database or labeling platform. The important property is traceability. A label without prompt version and retrieved context cannot explain a regression later.

Include the context reviewers need, but do not overload them. For RAG answers, show the retrieved passages and citations. For agent tasks, show the relevant trajectory steps and final answer. For summarization, show the source document excerpt. If reviewers must open five tools to judge one item, throughput and consistency will collapse.

## Calibrate reviewers before collecting production labels

Calibration is a short, structured practice round. Reviewers label the same examples, compare decisions, discuss disagreements, and refine the rubric. It should happen before the main review and whenever the rubric changes. Skipping calibration saves a day and can waste the whole evaluation.

Use calibration examples that include borderline cases. Easy examples inflate agreement and do not teach reviewers how to handle ambiguity. Include a correct refusal, a subtle unsupported claim, a partially useful answer with one missing caveat, and a fluent answer that cites the wrong passage.

After calibration, measure agreement on a small shared set. Percent agreement is easy to understand but can be misleading when most labels are the same. For categorical labels, Cohen's kappa is a useful additional signal for two reviewers. It accounts for agreement expected by chance.

\`\`\`python
from sklearn.metrics import cohen_kappa_score


reviewer_a = ["pass", "fail", "minor", "pass", "fail", "minor", "pass", "fail"]
reviewer_b = ["pass", "fail", "fail", "pass", "fail", "minor", "minor", "fail"]

kappa = cohen_kappa_score(reviewer_a, reviewer_b, labels=["pass", "minor", "fail"])

print(f"reviewer agreement kappa={kappa:.3f}")

if kappa < 0.6:
    raise SystemExit("Rubric needs calibration before release review")
\`\`\`

The threshold depends on the stakes and label difficulty. Do not treat 0.6 as universal law. Use it as a forcing function: if agreement is low, discuss examples and improve the rubric before collecting hundreds of labels.

## Double review and adjudication

For high-risk evaluations, use two independent reviewers per item. Independence matters. If reviewer B sees reviewer A's label first, you are measuring conformity, not agreement. After both reviews are complete, route disagreements to adjudication. The adjudicator may be a senior domain reviewer, QA lead, policy specialist, or product owner depending on the rubric.

Adjudication should produce a final label and a reason. The reason is useful for improving the prompt, retrieval, or rubric. If many disagreements center on the same phrase, the rubric likely needs a clearer example. If reviewers consistently disagree about whether a citation supports an answer, the retrieval display may be insufficient.

| Disagreement pattern | Likely cause | Workflow response |
|---|---|---|
| Pass vs minor on wording | Rubric too sensitive or unclear severity definition | Add examples for acceptable wording variation |
| Pass vs fail on groundedness | Reviewers interpret source support differently | Define citation support and unsupported inference |
| Minor vs fail on missing caveat | Product risk not encoded clearly | Tie severity to user consequence |
| Frequent policy category mismatch | Taxonomy overlaps | Split or merge categories, then recalibrate |
| One reviewer consistently stricter | Reviewer drift or training gap | Review shared examples and compare rationales |

Do not hide disagreement in the final report. Report raw agreement, adjudicated pass rate, and major disagreement themes. A model with a 90 percent adjudicated pass rate but low reviewer agreement is not as stable as the headline suggests.

## Sampling production traffic responsibly

Production samples are valuable because they contain real language, messy context, and user intent distributions. They also carry privacy and bias risks. Redact or minimize personal data before review. Define who can see samples. Keep retention short when possible. If regulated data is involved, involve legal and security teams before building the queue.

Random sampling alone often underrepresents rare but dangerous cases. Use stratified sampling: ordinary traffic, high-risk intents, low-confidence model outputs, user-reported bad answers, long conversations, retrieval misses, and policy boundary cases. Report metrics by stratum instead of blending everything into one number.

Be careful with feedback loops. If reviewers only see thumbs-down examples, they may overestimate failure rate. If they only see model outputs that passed automated filters, they may miss filter blind spots. Make the sample design visible in the report so decision-makers understand what the labels represent.

## Combining human labels with automated evaluators

Human review and automated evaluation should reinforce each other. Use human labels to calibrate LLM judges, validate heuristic checks, and identify categories where automation is unreliable. Use automated checks to pre-screen obvious failures, enforce formatting, and route high-risk items to humans.

Do not let an LLM judge silently replace human review for a high-stakes rubric until you have measured judge agreement against adjudicated labels. Track judge performance by category. A judge may be strong at citation presence and weak at legal nuance. Release gates should reflect those differences.

A useful pattern is tiered evaluation. First, deterministic checks validate JSON, required citations, blocked phrases, and tool call structure. Second, LLM judges score scalable qualitative dimensions. Third, humans review sampled items, high-risk failures, and disagreement cases. The final release decision uses all three signals.

## Turning labels into product decisions

A review workflow should end with decisions, not a pile of rows. For a release evaluation, report pass rate by risk group, critical failure count, top failure modes, reviewer agreement, sample design, and examples of representative failures. Include whether the candidate is better or worse than baseline, not only whether it crossed a threshold.

Tie thresholds to risk. A creative brainstorming feature can tolerate different failure types than a tax assistant or medical triage workflow. For high-risk domains, a single critical hallucination in a small sample may block release. For low-risk writing assistance, minor style issues may be tracked but not blocking.

When a release fails, labels should route to fixes. Unsupported answer failures might go to retrieval. Incorrect refusal might go to policy instructions. Tool misuse might go to agent planning. Tone issues might go to prompt style. A label taxonomy that does not map to fix ownership is hard to act on.

## Reviewer operations: fatigue, drift, and fairness

Human reviewers are part of the system and need QA too. Long review sessions reduce consistency. Rotate reviewers, limit batch sizes, and include gold examples in ongoing review if the volume is high. Gold examples are pre-adjudicated items used to detect drift, but they should be used carefully. If reviewers feel trapped by trick questions, quality suffers.

Provide reviewers with a way to flag unclear rubric items. Those flags are valuable. They show where the evaluation design is ambiguous. Track review time per item and disagreement rate per rubric item. A question that takes twice as long and produces twice the disagreement may need redesign.

Fairness also matters. If the model serves different user groups, sample across dialects, languages, accessibility needs, regions, and domain contexts where appropriate. Human evaluation can reproduce reviewer bias if rubrics and calibration examples ignore those dimensions.

## Managing review cost and turnaround

Human review becomes fragile when nobody budgets for it. Estimate cost from three numbers: items reviewed, reviewers per item, and median minutes per review. A 300-item release review with double labeling and four minutes per item is forty reviewer hours before adjudication. That is manageable if planned, painful if discovered two days before launch.

Reduce cost by routing intelligently. Low-risk formatting checks can be automated. High-risk policy boundaries should go to experienced reviewers. Items where an automated judge and deterministic checks agree with high confidence can be sampled rather than fully reviewed. Items with disagreement, missing context, or severe risk should be prioritized.

Turnaround matters because stale evaluations slow shipping. Create review batches that can be completed in one sitting, and avoid mixing ten unrelated rubrics in the same queue. Reviewers are faster and more consistent when a batch has a coherent task: support groundedness, safety refusal quality, tool-use correctness, or summarization faithfulness.

## Auditing the review system itself

The review workflow needs its own QA. Periodically sample completed reviews and inspect whether labels match the rubric. Track reviewer disagreement by category, adjudicator override rate, time per item, and appeal outcomes from product teams. These are not vanity metrics. They tell you whether the evaluation process is stable enough to trust.

Gold items can help, but they should not become a hidden exam. Use them to detect drift and identify training needs. If reviewers frequently miss the same gold item, the problem may be the item or rubric, not the reviewers. Review operations should encourage accurate judgment, not defensive labeling.

Version review forms. If the rubric changes in July, labels from June should not be blended without noting the rubric version. This is especially important when measuring model progress over time. A model can appear better because the scoring criteria became easier, or worse because reviewers became stricter.

## Closing the loop with product changes

Human labels should feed a backlog with clear owners. A hallucination caused by missing retrieval context belongs to retrieval or content indexing. A refusal that is too aggressive may belong to policy prompt design. A wrong tool call belongs to agent orchestration. A confusing but correct answer may belong to UX writing.

Track whether fixes reduce the labeled failure mode in the next evaluation. Otherwise, the workflow becomes a reporting machine. The most valuable human-in-the-loop systems create learning loops: label, diagnose, fix, re-evaluate, and update the rubric when the product's risk model changes.

When a failure is accepted for release, record the risk owner and reason. Accepted risk is sometimes legitimate. Hidden risk is not. Human evaluation earns trust when it makes those tradeoffs explicit.

## Handling appeals and disputed labels

Product teams will sometimes disagree with evaluation labels. Build an appeal path before the first tense release review. An appeal should include the item ID, disputed label, proposed label, and evidence from the rubric or product policy. The adjudicator can uphold the label, change it, or flag the rubric for revision.

Appeals are useful data. If many appeals succeed, reviewer training or rubric examples may be weak. If many appeals fail, product stakeholders may not understand the evaluation criteria. Either way, the workflow improves when disagreement is visible and resolved through rules rather than hallway negotiation.

Do not allow private relabeling to hit a target. Every changed label should preserve the original reviewer labels and the adjudication reason. Auditability is what keeps human evaluation credible when release pressure rises.

## Frequently Asked Questions

### How many human-reviewed examples do I need?

It depends on the decision and risk. Start with enough examples to cover the main intent and risk strata, then expand where confidence intervals or disagreement are too large. For release gates, a smaller risk-weighted sample is often more useful than a large random sample of easy cases.

### Should reviewers know which model produced the answer?

Usually no for comparisons. Blind the model identity and randomize answer order so reviewers do not favor a known baseline or a new candidate. For incident review, model identity may be necessary because the goal is diagnosis rather than preference measurement.

### What if human reviewers disagree often?

Treat that as a signal, not a nuisance. Review the disagreement examples, clarify the rubric, add examples, and recalibrate. If disagreement remains high, the evaluation dimension may be too subjective for a hard release gate.

### Can LLM-as-a-judge replace human reviewers?

It can reduce volume for some dimensions, but validate it against adjudicated human labels first. Use humans for calibration, high-risk samples, and categories where the judge has weak agreement or unclear reasoning.

### What should an adjudicator record?

Record the final label, the reason, and the rule or example that supports the decision. Adjudication without rationale cannot improve rubrics, reviewers, prompts, or automated judges.
`,
};
