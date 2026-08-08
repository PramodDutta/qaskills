import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LLM Eval Rubric Design Interrater Agreement: A Reliable Scoring Workflow',
  description: 'Master LLM eval rubric design interrater agreement through runnable scoring, calibration, diagnostics, and release gates for consistent AI judgments.',
  date: '2026-08-08',
  category: 'AI Testing',
  content: `
# LLM Eval Rubric Design Interrater Agreement: A Reliable Scoring Workflow

LLM eval rubric design turns a vague opinion such as "this answer feels good" into an observable, repeatable decision. Interrater agreement then tells you whether two qualified evaluators, or a human and an LLM judge, apply that decision system consistently. The practical goal is not perfect consensus. It is a rubric that makes important disagreements rare, visible, and diagnosable.

For QA teams, the reliable workflow is: define the exact decision, split it into independently scorable criteria, anchor every score with observable evidence, calibrate raters on a representative sample, calculate agreement per criterion, and revise the rubric before scaling. This article builds that workflow with TypeScript scripts you can run in CI, realistic records, adjudication rules, and failure analysis. It fits human review, LLM-as-a-judge pipelines, and mixed panels.

Rubric quality is part of test design, not documentation polish. A test oracle that changes with the reviewer is no oracle at all. The same discipline used for deterministic assertions applies here, but probabilistic outputs require an explicit treatment of ambiguity, severity, and reviewer variance.

## Start with the decision your evaluation must support

Before writing criteria, state what happens after the score. A release gate needs conservative, high-severity failure detection. A model comparison needs enough resolution to separate candidates. A regression monitor needs stable labels over time. These are different measurement jobs, so they should not share a rubric merely because they evaluate the same chatbot.

Write a one-sentence decision contract:

> This evaluation decides whether a support answer can be shown to a customer without human review, given the supplied policy and account facts.

That sentence identifies the evaluated object, context, audience, and consequence. It also prevents a common mistake: asking raters to judge the model's general intelligence when the release decision only depends on groundedness, policy compliance, and actionability.

| Decision type | Useful unit | Main error to avoid | Typical output |
|---|---|---|---|
| Release gate | One response and its evidence | Passing a harmful false positive | Pass, fail, blocking reason |
| Model selection | Paired responses to one case | Preference based on style alone | A wins, B wins, tie |
| Regression detection | Fixed case over model versions | Rubric drift between runs | Criterion scores and delta |
| Error discovery | Conversation or tool trace | Hiding rare failures in averages | Taxonomy label and severity |

Build the case packet before the rubric. Each item should contain a stable ID, prompt, relevant system instruction, expected source material, response, and metadata needed for slicing. Remove metadata such as model name when it could bias raters. Preserve metadata such as locale when it changes correctness.

\`\`\`ts
export type EvalCase = {
  id: string;
  userPrompt: string;
  policy: string;
  response: string;
  locale: string;
};

export const caseA: EvalCase = {
  id: "refund-014",
  userPrompt: "Can I get a refund after 45 days?",
  policy: "Returns are accepted within 30 days unless the item is defective.",
  response: "A standard return is outside the 30-day window. If the item is defective, contact support for an exception review.",
  locale: "en-US",
};
\`\`\`

A larger program may already use the trace-oriented approach in an [agentic AI testing guide](/blog/agentic-ai-testing-guide-2026). Keep the rubric tied to the decision even when the underlying trace contains dozens of tool calls.

## Convert quality language into observable criteria

Words such as helpful, safe, concise, and correct are constructs. A construct cannot be scored consistently until its boundary is described. Replace each broad quality word with a question that points to evidence in the case packet.

For the refund example, "correct" could become: "Does every factual claim about return eligibility match the supplied policy?" "Helpful" could become: "Does the response give the next action available under the policy?" These questions overlap less and tell a rater what to inspect.

A strong criterion has five fields:

| Field | Purpose | Example |
|---|---|---|
| Name | Stable reporting key | groundedness |
| Question | Observable judgment | Are policy claims supported by the supplied text? |
| Scale | Allowed labels | 0, 1, 2 |
| Anchors | Evidence for each label | Unsupported material claim means 0 |
| Blocking rule | Connection to decision | A 0 blocks release |

Keep criteria orthogonal enough that one defect does not mechanically fail everything. If a fabricated refund deadline causes groundedness, correctness, helpfulness, relevance, clarity, and safety all to score zero, the dashboard shows six failures but only one underlying defect. That inflates certainty and makes fixes hard to prioritize.

Here is a compact rubric represented as data. A data representation lets the runner validate labels and lets reports retain the exact rubric revision used for a score.

\`\`\`ts
type Level = 0 | 1 | 2;

type Criterion = {
  id: string;
  question: string;
  anchors: Record<Level, string>;
  blockingBelow: Level;
};

export const rubric: Criterion[] = [
  {
    id: "groundedness",
    question: "Are all material policy claims supported by the supplied policy?",
    anchors: {
      0: "At least one material claim contradicts or invents policy.",
      1: "Claims are supported, but an important qualification is missing.",
      2: "Every material claim is supported and relevant qualifications are present.",
    },
    blockingBelow: 1,
  },
  {
    id: "next_action",
    question: "Does the response state the most useful action the user can take?",
    anchors: {
      0: "No valid action is offered, or the action conflicts with policy.",
      1: "A valid action is present but underspecified.",
      2: "A valid action is specific and appropriately conditional.",
    },
    blockingBelow: 1,
  },
];
\`\`\`

Three levels often outperform five when raters cannot reliably distinguish adjacent labels. Add levels only when each new level corresponds to a decision-relevant distinction. Numerical appearance does not create interval data. The distance from 0 to 1 is not automatically the same as the distance from 1 to 2.

## Write anchors that survive contact with edge cases

An anchor is not a synonym for the score. "2 = excellent" merely repeats the judgment. A useful anchor names evidence, exceptions, and precedence. It tells raters what to do with mixed responses.

Use boundary pairs during design. For each threshold, create two nearly identical examples that belong on opposite sides. For groundedness, one answer may omit an optional detail and receive 1, while another invents an eligibility condition and receives 0. Ask reviewers whether the difference is observable without knowing the intended label.

| Weak anchor | Operational anchor | Why it is better |
|---|---|---|
| Mostly correct | No false material claim, but one decision-relevant qualification is absent | Defines both truth and omission |
| Very helpful | Gives a valid next step, owner, and required input | Lists observable elements |
| Safe | Does not reveal secrets, authorize prohibited action, or bypass escalation | Names failure families |
| Concise | Contains no repeated rationale or unrelated steps | Avoids arbitrary word limits |

Also define precedence. Suppose a response gives the right action but includes one invented reason. The groundedness score should reflect the fabrication and the action score can still reflect the valid instruction. The overall gate can fail because groundedness is blocking. This preserves diagnostic information without weakening the gate.

Use an "insufficient evidence" state sparingly and keep it outside the quality scale. It means the case packet cannot support a valid judgment, not that the response is mediocre. Mixing abstention with a middle score silently rewards broken fixtures.

\`\`\`ts
type Score = 0 | 1 | 2 | "INSUFFICIENT_EVIDENCE";

type Rating = {
  caseId: string;
  raterId: string;
  rubricVersion: string;
  criterionId: string;
  score: Score;
  evidence: string;
};

export function validateRating(rating: Rating): void {
  if (rating.evidence.trim().length < 12) {
    throw new Error(\`Rating \${rating.caseId}/\${rating.criterionId} needs evidence\`);
  }
  if (rating.score === "INSUFFICIENT_EVIDENCE" && !rating.evidence.includes("missing")) {
    throw new Error("Abstentions must identify missing case evidence");
  }
}
\`\`\`

The evidence field matters. Agreement on labels can hide agreement for different reasons, which makes future revisions fragile. A short cited phrase or defect description gives the adjudicator something concrete to compare.

## Design a calibration set before production scoring

Calibration is a test of the rubric and instructions, not an exam for raters. Select cases that exercise the boundaries you expect in production. Include obvious passes, obvious failures, mixed responses, missing-context cases, and examples from important slices such as languages or task families.

Do not begin with a meeting where everyone discusses each case before scoring. That produces consensus without measuring independent interpretation. First, each rater scores alone. Then calculate agreement and inspect disagreements. Only afterward should the group adjudicate.

A practical calibration cycle is:

1. Independently score 20 to 40 representative cases. This range is illustrative, not a universal minimum.
2. Compute exact agreement and a chance-corrected statistic for each criterion.
3. Sort disagreements by severity distance and production importance.
4. Discuss evidence, not rater authority.
5. Rewrite ambiguous anchors or repair case packets.
6. Score a fresh holdout set, rather than reusing cases everyone now remembers.

Stratify the sample. If 95 percent of calibration responses are obvious passes, raw agreement can look excellent while the rubric fails on the boundary that controls release. Deliberately enrich the calibration set with borderline and known-failure cases, then keep production prevalence in mind when interpreting the statistics.

\`\`\`ts
type Candidate = {
  id: string;
  userPrompt: string;
  policy: string;
  response: string;
  locale: string;
  expectedDifficulty: "clear" | "boundary" | "missing";
};

export function calibrationSample(cases: Candidate[]): Candidate[] {
  const byDifficulty = {
    clear: cases.filter((item) => item.expectedDifficulty === "clear").slice(0, 12),
    boundary: cases.filter((item) => item.expectedDifficulty === "boundary").slice(0, 16),
    missing: cases.filter((item) => item.expectedDifficulty === "missing").slice(0, 4),
  };

  return [...byDifficulty.clear, ...byDifficulty.boundary, ...byDifficulty.missing];
}
\`\`\`

Raters also need a short manual. It should define whether they may use outside knowledge, whether style defects affect factual criteria, how to handle a response that refuses, and how much conversation context is in scope. Lock the model output and case content during a calibration round. A changing case produces apparent rater disagreement that no rubric can fix.

## Measure interrater agreement without worshipping one number

Exact agreement is the fraction of items where raters selected the same label. It is easy to explain, but it ignores agreement expected by chance. Cohen's kappa adjusts for chance when exactly two raters score nominal categories. Weighted kappa can give partial credit to nearby ordinal scores. Krippendorff's alpha supports different measurement levels, multiple raters, and missing ratings, but requires a carefully tested implementation.

No statistic interprets itself. Report the confusion matrix, prevalence, sample size, and criterion alongside the coefficient.

| Measure | Good fit | Important limitation |
|---|---|---|
| Exact agreement | Fast operational dashboard | Does not correct for chance |
| Cohen's kappa | Two raters, nominal labels | Sensitive to label prevalence |
| Weighted kappa | Two raters, ordered labels | Weight scheme changes the result |
| Krippendorff's alpha | Multiple raters or missing values | More implementation choices |

The following dependency-free TypeScript computes exact agreement and unweighted Cohen's kappa for two raters. It validates the paired arrays and handles the degenerate case where expected agreement is one.

\`\`\`ts
type Label = string | number;

export function agreement(a: Label[], b: Label[]) {
  if (a.length === 0 || a.length !== b.length) {
    throw new Error("Rater arrays must have equal non-zero length");
  }

  const labels = [...new Set([...a, ...b])];
  const observed = a.filter((value, index) => value === b[index]).length / a.length;
  const expected = labels.reduce((sum, label) => {
    const shareA = a.filter((value) => value === label).length / a.length;
    const shareB = b.filter((value) => value === label).length / b.length;
    return sum + shareA * shareB;
  }, 0);

  const kappa = expected === 1 ? (observed === 1 ? 1 : 0) : (observed - expected) / (1 - expected);
  return { observed, expected, kappa };
}

console.log(agreement([2, 2, 1, 0, 1], [2, 1, 1, 0, 2]));
\`\`\`

For ordinal scores, also report distance. Two raters choosing 1 and 2 is a boundary disagreement; choosing 0 and 2 may reverse a release decision. A simple severe-disagreement rate can be more actionable than a small movement in kappa.

\`\`\`ts
export function disagreementSummary(a: number[], b: number[]) {
  if (a.length === 0 || a.length !== b.length) {
    throw new Error("Score arrays must have equal non-zero length");
  }
  const distances = a.map((value, index) => Math.abs(value - b[index]));
  return {
    meanDistance: distances.reduce((sum, value) => sum + value, 0) / distances.length,
    severeRate: distances.filter((value) => value >= 2).length / distances.length,
  };
}

console.log(disagreementSummary([2, 2, 1, 0], [2, 0, 1, 1]));
\`\`\`

Avoid universal labels such as "kappa above 0.8 is good" without context. The cost of disagreement, label prevalence, and maturity of the rubric all matter. Establish a local acceptance rule before looking at candidate model results. Otherwise teams move the threshold until a favored release passes.

## Add an LLM judge without losing measurement control

An LLM judge is another rater. It does not turn a subjective criterion into ground truth. Give it the same bounded case packet, rubric version, and output schema used for humans. Ask it to provide evidence, but do not confuse eloquent reasoning with correct scoring.

Start by comparing the judge with qualified humans on a blinded holdout set. Analyze per criterion and slice, because a judge can agree on English support answers while failing on code, minority dialects, or adversarial content. Recalibrate when the judge model, prompt, decoding behavior, or rubric changes.

The judge output should be machine-validated. This example validates an already parsed JSON value without assuming a particular model provider API.

\`\`\`ts
type JudgeResult = {
  criterionId: string;
  score: 0 | 1 | 2;
  evidence: string;
};

export function parseJudgeResult(value: unknown): JudgeResult {
  if (typeof value !== "object" || value === null) throw new Error("Result must be an object");
  const row = value as Record<string, unknown>;
  if (typeof row.criterionId !== "string") throw new Error("criterionId must be a string");
  if (row.score !== 0 && row.score !== 1 && row.score !== 2) throw new Error("score must be 0, 1, or 2");
  if (typeof row.evidence !== "string" || row.evidence.trim() === "") {
    throw new Error("evidence must be a non-empty string");
  }
  return {
    criterionId: row.criterionId,
    score: row.score,
    evidence: row.evidence,
  };
}

console.log(parseJudgeResult({ criterionId: "groundedness", score: 2, evidence: "The 30-day limit matches the policy." }));
\`\`\`

Keep the judge prompt free of model identity and candidate ordering where possible. For pairwise evaluations, swap A and B on a subset to detect position bias. For single-answer scoring, include deliberately clear anchors near the boundary. Do not show an expected answer if it encourages superficial phrase matching rather than checking the supplied facts.

When tooling enters the evaluation, verify tool traces separately from response quality. An [MCP server test automation workflow](/blog/mcp-servers-test-automation-2026) can assert schema, authorization, and protocol behavior, while the rubric evaluates whether the agent chose and used the tool appropriately.

## Diagnose disagreement as a QA failure mode

Consider a release evaluation where human A gives groundedness 2, human B gives 1, and the LLM judge gives 0. The judge explanation says the answer failed to quote the policy verbatim. The rubric asks whether claims are supported, not quoted. This is not evidence that the response is bad. It is evidence that the judge instruction or anchor interpretation is wrong.

Use a disagreement record that preserves all scores and explanations:

\`\`\`ts
type Disagreement = {
  caseId: string;
  criterionId: string;
  ratings: Array<{ raterId: string; score: number; evidence: string }>;
  resolution?: { score: number; reason: string; rubricChange: boolean };
};

export function needsAdjudication(item: Disagreement): boolean {
  const scores = item.ratings.map((rating) => rating.score);
  return Math.max(...scores) - Math.min(...scores) >= 2;
}

const item: Disagreement = {
  caseId: "refund-014",
  criterionId: "groundedness",
  ratings: [
    { raterId: "human-a", score: 2, evidence: "All claims match the supplied policy." },
    { raterId: "judge", score: 0, evidence: "The answer does not quote the policy." },
  ],
};

console.log(needsAdjudication(item));
\`\`\`

Classify the cause before changing anything:

| Cause | Diagnostic sign | Corrective action |
|---|---|---|
| Ambiguous anchor | Raters cite plausible, conflicting interpretations | Rewrite boundary and add paired examples |
| Missing case evidence | Raters make different external assumptions | Repair fixture or allow abstention |
| Rater drift | Agreement declines after weeks of scoring | Run blind recalibration |
| Judge bias | Errors cluster by position or writing style | Blind metadata and counterbalance order |
| Legitimate uncertainty | Experts disagree even with complete evidence | Escalate or change the decision rule |

Do not automatically resolve every disagreement by majority vote. Two raters can share the same misconception. Adjudication should point to the rubric and evidence, record the reason, and distinguish a case-specific resolution from a rubric change. If the rubric changes materially, bump its version and rescore the affected holdout. Mixing versions in one trend line fabricates improvement.

## What teams get wrong about agreement

The most damaging misconception is that agreement measures truth. It measures consistency under a specified protocol. Two raters can agree perfectly on an incorrect interpretation. That is why calibration needs known anchors, expert adjudication, and periodic validity checks against real outcomes.

A second mistake is combining criteria into one overall score before calculating agreement. An overall score can match even when raters disagree on every reason. Compute agreement at criterion level first. Derive the gate only after validating component scores.

A third mistake is training raters until disagreement disappears on the same small dataset. Memorization produces impressive agreement and poor generalization. Always confirm changes on unseen cases. Preserve a frozen benchmark, but refresh a portion when product behavior and risk change.

Finally, do not use model confidence as a substitute for agreement. Generated probabilities or self-reported certainty are not calibrated evidence of correctness. Treat a low-confidence result as a routing signal only after validating that the signal predicts errors on your data.

## Operationalize rubric versions in CI

Store ratings as append-only records with case version, rubric version, rater identity class, timestamp, and evidence. Reports should fail closed when required ratings are missing. A release policy can require no blocking failures and a minimum coverage rate, while a monitoring job can alert on agreement degradation.

\`\`\`ts
type GateRating = {
  caseId: string;
  criterionId: string;
  score: 0 | 1 | 2;
  blockingBelow: 0 | 1 | 2;
};

// Coverage must be checked per (case, criterion). Keying on caseId alone lets a
// case with one rated criterion mask every other required criterion on that case.
export function releaseGate(
  expectedCases: string[],
  requiredCriteria: string[],
  ratings: GateRating[],
) {
  const covered = new Set(ratings.map((rating) => rating.caseId + ":" + rating.criterionId));
  const missing: string[] = [];
  for (const caseId of expectedCases) {
    for (const criterionId of requiredCriteria) {
      const key = caseId + ":" + criterionId;
      if (!covered.has(key)) missing.push(key);
    }
  }
  const blockers = ratings.filter((rating) => rating.score < rating.blockingBelow);
  return {
    passed: missing.length === 0 && blockers.length === 0,
    missing,
    blockers,
  };
}

const gate = releaseGate(
  ["refund-014", "refund-015"],
  ["groundedness", "tone"],
  [
    { caseId: "refund-014", criterionId: "groundedness", score: 2, blockingBelow: 1 },
    { caseId: "refund-014", criterionId: "tone", score: 2, blockingBelow: 1 },
    { caseId: "refund-015", criterionId: "groundedness", score: 0, blockingBelow: 1 },
    { caseId: "refund-015", criterionId: "tone", score: 2, blockingBelow: 1 },
  ],
);
console.log(JSON.stringify(gate, null, 2));
\`\`\`

Run three checks separately: response quality, rating coverage, and rater health. A model can pass quality while the evaluator system is unhealthy because one criterion's agreement collapsed. In that state, do not silently trust the aggregate. Route the affected cases to review and investigate drift.

Set review triggers based on operational impact. Examples include any severe disagreement on a blocking criterion, a sustained agreement decline across fresh batches, or an unexpected jump in abstentions. Numeric thresholds must be chosen from your baseline and risk tolerance, not copied from a generic maturity table.

For AI coding agents, a ready-made QA skill can install from qaskills.sh with the qaskills CLI when you want a reusable evaluation workflow. Treat the installed skill as executable process guidance, and still version your product-specific rubric and examples alongside the evaluation data.

## A rubric readiness checklist

Before production scoring, verify the following:

- The decision contract says what the score controls.
- Every criterion asks one evidence-based question.
- Scale labels have observable anchors and boundary examples.
- Blocking criteria map to explicit product risks.
- Abstention means missing evidence, not uncertainty about quality.
- Raters score independently before discussion.
- Calibration includes important slices and borderline cases.
- Agreement is reported per criterion with confusion data.
- Severe disagreements receive evidence-based adjudication.
- Rubric, prompt, judge, and case versions are traceable.
- Revised guidance is confirmed on unseen cases.
- CI distinguishes model failure from evaluator-system failure.

This checklist makes rubric design testable. More prose is not necessarily better. The best rubric is the shortest one that produces stable, valid decisions across the response distribution you actually ship.

## Frequently Asked Questions

### How many levels should an LLM evaluation rubric use?

Use the fewest levels that represent decision-relevant differences your raters can repeatedly identify. Binary pass or fail works for a narrow release gate, while three ordered levels often capture a blocking defect, an acceptable but incomplete answer, and a complete answer. Five levels add value only when adjacent anchors have concrete distinctions. Test the scale during independent calibration. If raters repeatedly collapse two neighboring levels, merge them instead of adding more instructions or averaging away the disagreement.

### Is percent agreement enough for LLM evaluations?

Percent agreement is useful because every stakeholder can understand it, but it should not stand alone. Pair it with a confusion matrix, label prevalence, sample size, and a chance-corrected measure appropriate to the design. Also report severity distance for ordered scales. A criterion with frequent 0-versus-2 disagreements is operationally different from one with the same exact agreement but only 1-versus-2 disagreements. The decision cost should guide interpretation.

### Should an LLM judge replace human raters?

An LLM judge can reduce routine review volume after it demonstrates acceptable agreement and validity on representative, blinded data. It should not erase human ownership of the rubric, high-risk adjudication, or drift monitoring. Compare judge results per criterion and important slice, validate structured outputs, and recheck after model or prompt changes. A practical design routes clear cases automatically and sends abstentions, severe disagreements, and blocking failures to qualified humans.

### When should a rubric be revised after disagreement?

Revise the rubric when disagreement reveals a repeatable ambiguity, missing boundary, or conflicting instruction. Do not rewrite it merely because one difficult case produced different expert opinions. First classify the cause, adjudicate from evidence, and determine whether the resolution generalizes. A material change needs a new rubric version and validation on unseen cases. If old and new versions must coexist temporarily, report them separately so apparent quality changes are not actually measurement changes.
`,
};
