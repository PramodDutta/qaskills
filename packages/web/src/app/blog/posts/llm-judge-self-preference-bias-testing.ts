import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Self-Preference Bias in an LLM Judge',
  description:
    'Test self-preference bias in an LLM judge with blinded model-family comparisons, quality controls, position swaps, and actionable release thresholds.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Testing Self-Preference Bias in an LLM Judge

Three answers are equally correct, equally concise, and stripped of model names. The judge still gives the answer produced by its own model family a higher score. That is the failure this test is built to detect. It is subtle because an ordinary leaderboard can make the preference look deserved: the judge family may genuinely produce stronger answers. A useful test must separate legitimate quality recognition from favoritism associated with authorship.

Self-preference is not established merely because a judge ranks its own output first. It exists when family membership predicts a favorable judgment after relevant quality differences and presentation effects have been controlled. That distinction should drive the dataset, execution order, statistics, and release rule. Otherwise a team can accuse a good judge of bias, or approve a biased one because its preferred generator happened to be strongest in the sample.

This guide treats the judge like any other probabilistic component under test. We will construct a crossed generator-by-judge experiment, blind provenance, swap response positions, use verifiable items where possible, retain repeated judgments, and calculate effects that engineering teams can monitor over time. For the broader discipline around score stability and reference sets, read the [LLM judge calibration guide](/blog/llm-judge-calibration-guide-2026). For choosing rubrics and judge modes before investigating a specific bias, use the [LLM-as-a-judge evaluation guide](/blog/llm-as-a-judge-evaluation-guide).

## The signal is authorship after quality is held constant

Suppose Judge J and Generator J are from the same family. A raw self-win rate answers a weak question: how often did J prefer Generator J? The rate combines response quality, task mix, length, formatting, response position, random sampling, and any actual family preference. It cannot identify which cause produced the win.

A stronger estimand compares the judge's treatment of matched outputs. On objectively gradable tasks, first classify each response using a trusted verifier. Then ask whether the judge is more likely to select a same-family response when both candidates share the same correctness state. On subjective tasks, use adjudicated human preferences or a quality model that is independent of every generator and judge in the matrix. Neither is perfect, but both are better controls than assuming all candidate models produce equal work.

| Observation | What it could mean | Evidence still needed |
|---|---|---|
| Judge J selects Generator J 70% of the time | Better answers, bias, or both | Ground-truth or human quality labels |
| Same-family answer wins more when placed first | Family preference mixed with position bias | Reversed-order judgments |
| Correct foreign answer loses to incorrect sibling answer | Harmful self-preference candidate | Repeat runs and rubric audit |
| Sibling receives higher scalar scores on identical quality strata | Family-linked score inflation | Confidence interval and task stratification |
| Family effect disappears after style normalization | Style familiarity, not provenance alone | Raw and normalized paired comparison |

The most valuable cases are discordant with ground truth. If an objectively wrong sibling answer defeats an objectively correct foreign answer, the judgment is harmful regardless of motive. If both answers are correct but one is clearer, selection of the clearer sibling is not evidence of bias. Preserve this distinction in the result schema rather than trying to reconstruct it later from free-form rationales.

## Build a crossed generator-by-judge matrix

Testing only one judge against one competitor gives no way to distinguish self-preference from a general preference for one response style. Use at least three generator families and, when budget permits, rotate several judges through the same candidates. Every item should be generated before judging begins. Store the exact response text, generator family, model revision, decoding settings, prompt version, and a content hash.

The design is crossed when each judge sees outputs from every generator family, including its own, across the same item set. Pairing should be balanced so each family appears in slot A and slot B equally often. Do not tell the judge the author, provider, or model. Remove obvious transport metadata, but do not silently rewrite prose in the main condition. A cleaned-text condition can be useful later for diagnosing stylistic recognition, but it answers a different question.

| Design choice | Minimum defensible setup | Stronger production setup |
|---|---|---|
| Generator families | Judge family plus two unrelated families | Four or more families with revision tracking |
| Task sampling | Fixed stratified reference set | Product-traffic sample plus safety and edge strata |
| Pair order | One deterministic reversal | Both orders, repeated with independent seeds |
| Quality control | Programmatic verifier where available | Verifier plus blinded expert adjudication sample |
| Judge output | Winner, score, short reason | Schema-constrained verdict with criterion scores |
| Repetition | Three calls per pair | Enough repeats for a predeclared interval width |

Model family is often ambiguous. Fine-tunes, distilled descendants, shared base checkpoints, and provider aliases may be related even when their product names differ. Define family membership before seeing results. Keep a second, broader lineage grouping if shared ancestry could plausibly create stylistic familiarity. Changing the family map after observing a result is equivalent to moving a test oracle.

## Run blinded pairwise judgments with position swaps

The following TypeScript program uses the standard OpenAI-compatible chat-completions HTTP shape exposed by many model gateways. It expects \`LLM_BASE_URL\`, \`LLM_API_KEY\`, and \`JUDGE_MODEL\`. It submits a pair in both orders and writes structured JSON lines. The candidate texts shown here are placeholders for pre-generated records, not synthetic evidence of bias.

\`\`\`typescript
import { appendFile } from 'node:fs/promises';

type Candidate = {
  id: string;
  family: string;
  text: string;
  objectivelyCorrect: boolean;
};

type Verdict = {
  winner: 'A' | 'B' | 'tie';
  scores: { A: number; B: number };
  reason: string;
};

const endpoint = process.env.LLM_BASE_URL;
const apiKey = process.env.LLM_API_KEY;
const judgeModel = process.env.JUDGE_MODEL;
if (!endpoint || !apiKey || !judgeModel) throw new Error('Missing judge environment variables');

async function judge(question: string, a: Candidate, b: Candidate): Promise<Verdict> {
  const prompt = [
    'Evaluate two anonymous answers using correctness, relevance, and clarity.',
    'Ignore response order. Return JSON only with winner, scores, and reason.',
    \`Question: \${question}\`,
    \`Answer A:\\n\${a.text}\`,
    \`Answer B:\\n\${b.text}\`,
  ].join('\\n\\n');

  const response = await fetch(\`\${endpoint}/v1/chat/completions\`, {
    method: 'POST',
    headers: { Authorization: \`Bearer \${apiKey}\`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: judgeModel,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) throw new Error(\`Judge HTTP \${response.status}\`);
  const body = await response.json();
  return JSON.parse(body.choices[0].message.content) as Verdict;
}

async function runPair(question: string, left: Candidate, right: Candidate) {
  for (const [a, b, order] of [
    [left, right, 'original'],
    [right, left, 'reversed'],
  ] as const) {
    const verdict = await judge(question, a, b);
    await appendFile(
      'self-preference-results.jsonl',
      JSON.stringify({ judgeModel, question, a, b, order, verdict }) + '\\n',
    );
  }
}
\`\`\`

In a real run, call \`runPair\` from a scheduler that randomizes pair order and rate-limits requests. Do not retry only malformed or surprising outputs without recording the first attempt. Parser failure is itself a judge reliability result. If infrastructure retries are necessary, mark every attempt and define which one enters analysis before the run.

Temperature zero does not make hosted inference deterministic. Model serving stacks, routing, and implementation changes can still vary. Repeat judgments, but treat repeats as clustered observations of the same item rather than independent new test cases.

## Derive quality-conditioned bias measures

Use several measures because each catches a different failure. The harmful error rate counts cases where the judge picks an objectively wrong same-family response over a correct foreign response. The matched self-lift compares same-family and foreign win rates inside equal-quality strata. Position inconsistency counts pairs whose winner identity changes when A and B are swapped. Score inflation compares criterion scores after controlling for truth labels and item.

For a binary preference, an odds ratio is often easier to model than a raw percentage-point difference. A mixed-effects logistic model with fixed effects for same-family status, correctness, position, length, and task stratum, plus random intercepts for item, is a strong analysis. Small teams can begin with stratified paired differences and bootstrap intervals. The important point is to resample by item, not individual repeated call, because judgments for one prompt are correlated.

This runnable analysis reads JSONL records produced by the harness, maps each winning slot back to a candidate, and reports the highest-severity contradictions. It deliberately does not declare bias from an arbitrary universal cutoff.

\`\`\`typescript
import { readFile } from 'node:fs/promises';

type Row = {
  judgeModel: string;
  a: { family: string; objectivelyCorrect: boolean };
  b: { family: string; objectivelyCorrect: boolean };
  verdict: { winner: 'A' | 'B' | 'tie'; scores: { A: number; B: number } };
};

const judgeFamily = process.env.JUDGE_FAMILY;
if (!judgeFamily) throw new Error('Set JUDGE_FAMILY');

const rows = (await readFile('self-preference-results.jsonl', 'utf8'))
  .trim()
  .split('\\n')
  .map((line) => JSON.parse(line) as Row);

let harmful = 0;
let eligible = 0;
let siblingScoreLift = 0;
let scoredPairs = 0;

for (const row of rows) {
  const siblingIsA = row.a.family === judgeFamily;
  const sibling = siblingIsA ? row.a : row.b;
  const foreign = siblingIsA ? row.b : row.a;
  const pickedSibling = row.verdict.winner === (siblingIsA ? 'A' : 'B');

  if (sibling.objectivelyCorrect !== foreign.objectivelyCorrect) {
    eligible += 1;
    if (!sibling.objectivelyCorrect && foreign.objectivelyCorrect && pickedSibling) harmful += 1;
  }

  siblingScoreLift += siblingIsA
    ? row.verdict.scores.A - row.verdict.scores.B
    : row.verdict.scores.B - row.verdict.scores.A;
  scoredPairs += 1;
}

console.log({
  contradictorySiblingWins: harmful,
  unequalCorrectnessPairs: eligible,
  meanSiblingScoreLift: siblingScoreLift / scoredPairs,
});
\`\`\`

The \`meanSiblingScoreLift\` is descriptive, not causal. Add the quality and position controls before using it for a release decision. For tiny samples, report counts and examples instead of dressing uncertainty in decimal precision.

## Probe whether the judge recognizes its own style

Self-preference and self-recognition are related hypotheses, not synonyms. A useful follow-up asks the judge to predict which anonymous answer came from its family, without rating quality. Compare recognition accuracy with preference on the same items. If recognized sibling outputs receive extra credit, the case is stronger. If preference remains while recognition is at chance, shared style features may still act implicitly, or another confound may be present.

Create controlled transformations as separate experimental arms:

1. Normalize markdown, headings, citations, and common preambles without changing semantic content.
2. Match answer length within a narrow band.
3. Paraphrase both candidates through an independent model, then re-verify facts.
4. Replace prose with a canonical structured representation for tasks that allow it.
5. Include human-written answers whose style resembles each model family.

Never mix transformed answers into the primary benchmark without a provenance field. Paraphrasing can change quality, especially for code, legal nuance, or mathematical reasoning. A disappearing family effect after normalization suggests a style-mediated mechanism, but it does not retroactively invalidate the production risk. Production outputs still contain style.

## Guard against position, verbosity, and rubric leakage

A judge can prefer the first answer, the longer answer, or the response that echoes rubric vocabulary. These biases can imitate family preference if the sibling generator systematically has the favored property. Position swaps are mandatory. Length matching and a regression term for token count help with verbosity. To detect rubric leakage, measure phrase overlap between candidates and criterion descriptions, then create an adversarial set where a wrong answer fluently repeats the rubric.

Judge rationales are diagnostic evidence, not ground truth about the judge's internal cause. A rationale may cite a real difference even when the selection pattern is biased across the dataset. Conversely, a vague rationale does not prove favoritism. Aggregate behavior under controlled perturbation carries more weight than a plausible paragraph attached to one verdict.

Keep prompts anonymous. Labels such as “Model A” and “Model B” are better than provider names, but even stable labels can accumulate positional associations. Random opaque identifiers are acceptable if the output schema maps them reliably. Do not include generator-specific safety disclaimers in system metadata unless those disclaimers are part of the content users actually see.

## Set a release rule around harm, not a vanity score

There is no responsible universal statement that a two-point sibling lift is acceptable while three points is not. Set thresholds from impact. A judge that routes customer-visible medical responses needs stricter contradiction tolerances and more human adjudication than one that sorts low-stakes draft copy. Predeclare three outcomes: pass, investigate, and block.

A practical gate can block on any replicated case where an incorrect sibling answer defeats a verified correct answer in both positions, investigate when the quality-conditioned family effect interval excludes zero, and pass only when power is sufficient to detect the smallest effect the product considers harmful. The gate should also fail closed when model aliases or revisions are missing, because lineage analysis becomes impossible.

Track these artifacts with the build:

| Artifact | Why retain it | Regression use |
|---|---|---|
| Candidate content hash and model revision | Detect silent generator drift | Re-run identical corpus on new judge |
| Full judge request and raw response | Audit parsing and rubric changes | Diff behavior beyond final winner |
| Ground-truth source or adjudication record | Defend quality labels | Revisit disputed items |
| Position-reversed pair identifier | Join mirrored observations | Measure order sensitivity |
| Family taxonomy version | Preserve lineage assumptions | Recompute under revised taxonomy |
| Cost, latency, and retry metadata | Expose operational selection effects | Separate timeout bias from judgment bias |

Do not refresh the whole corpus every release. Maintain a stable anchor set for trend detection and a rotating set for coverage. If every item changes, a score change cannot be attributed to the judge revision.

## Choose mitigation based on the failure mechanism

Cross-family judging reduces the direct same-family conflict but does not remove shared training priors, position preference, or quality confounding. An ensemble can reduce dependence on one lineage, provided the members are genuinely diverse and aggregation does not conceal minority safety concerns. Deterministic verifiers should supersede model opinion for properties such as compilation, exact numeric answers, schema validity, and citation existence.

| Evaluation arrangement | Strength | Important limitation |
|---|---|---|
| Same-family single judge | Low integration cost and familiar domain behavior | Highest structural exposure to self-preference |
| Unrelated-family judge | Removes the obvious sibling relationship | Can introduce foreign-family preference or capability gaps |
| Majority vote across diverse judges | Less dependent on one model's taste | Costly, correlated judges can still agree wrongly |
| Human adjudication sample | Anchors subjective quality to target users | Slow and subject to annotator inconsistency |
| Programmatic verifier plus judge | Grounds objective criteria before style scoring | Only works for properties that can be verified |

Prompt changes are the cheapest mitigation, but test them rather than assuming a stronger warning fixes behavior. Asking for criterion-by-criterion evidence, forcing correctness checks before preference, and withholding authorship cues may help. Long reasoning can also raise cost and expose sensitive content in logs. The production solution is frequently layered: verifier first, independent judge second, human escalation for disagreement.

## Make the bias suite survive model upgrades

Hosted models can change behind a stable name. Pin revisions when the provider supports it, record response fingerprints when available, and treat an unannounced behavior shift as a new test subject. Rebaseline only after comparing the old and new judge on the same anchor items. Rebaselining by deleting failures destroys the point of regression testing.

Monitor slices rather than a single global effect. Self-preference may appear only in coding, safety refusals, a particular language, or tasks the judge itself performs poorly. Report family effect by correctness stratum, domain, response length, and recognition status. Avoid slices so small that a single pair dominates the chart.

Finally, keep the benchmark outside the generation prompt and access-controlled like any evaluation asset. If candidate models are tuned repeatedly against the exact items, quality and stylistic adaptation contaminate the measurement. Rotate sealed items and watch for suspiciously memorized phrasing.

## Frequently Asked Questions

### Does choosing its own answer prove that an LLM judge is biased?

No. The answer may actually be better. Evidence of self-preference requires a family-linked advantage after correctness, human quality, position, length, and task mix are controlled. Incorrect sibling wins against verified correct alternatives are especially informative.

### How many repeated judgments should I collect per pair?

Use enough repetitions to meet a predeclared uncertainty target, not a folklore number. Three is a useful smoke test, but production decisions usually need more items rather than dozens of repeats on a tiny corpus. Resample and analyze at the item level.

### Should model names be removed from the response text?

Remove explicit provenance metadata in the blinded condition. Do not broadly rewrite content unless you create a distinct normalization arm, because editing can alter quality and erase the very production style through which preference operates.

### Can a cross-family judge be treated as unbiased?

No. It avoids one direct conflict but may favor its own unrelated style, share training priors, or be weaker on the evaluated domain. Validate every proposed replacement with the same crossed matrix.

### What is the most serious self-preference regression?

A repeatable judgment that selects an objectively wrong same-family answer over a correct foreign answer, independent of response order, is the clearest high-severity signal. Preserve the raw pair and route it to rubric and model review.
`,
};
