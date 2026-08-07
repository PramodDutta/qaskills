import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LLM Eval Regression Baseline Comparison for Reliable AI Releases',
  description: 'Use LLM eval regression baseline comparison to detect prompt, model, retrieval, and agent regressions before they reach production users safely.',
  date: '2026-08-07',
  category: 'AI Testing',
  content: `
# LLM Eval Regression Baseline Comparison for Reliable AI Releases

LLM eval regression baseline comparison means running the same evaluation set against a known baseline system and a proposed candidate, then judging the paired outputs case by case. The goal is not to produce a single attractive score. The goal is to know whether the candidate is meaningfully better, worse, or merely different on the tasks your product must handle.

For QA engineers, the important shift is from snapshot worship to release evidence. A baseline can be yesterday's production prompt, the last approved model configuration, a frozen retrieval index, or a previous agent tool policy. A candidate can change one or more of those parts. The comparison has to preserve both outputs, score them with the same grader, and show which cases moved. Without that pairing, an average score hides the exact user journeys that regressed.

This workflow is especially useful for AI coding agents, support assistants, RAG systems, and tool-using agents because behavior can drift while every API call remains technically successful. Use it alongside broader agent QA strategy from [agentic AI testing](/blog/agentic-ai-testing-guide-2026), and apply the same comparison discipline when your agent depends on tools exposed through [MCP servers for test automation](/blog/mcp-servers-test-automation-2026). The rest of this guide builds a concrete, file-based baseline comparison harness that a CI job can run and a reviewer can audit.

## Freeze the Baseline Before You Score the Candidate

A baseline is only useful when it is frozen. If your evaluation script resolves \`latest\` prompt text, \`latest\` retrieval corpus, and \`latest\` grader instructions for both sides, you are not comparing systems. You are comparing whatever happened to be current at runtime. That makes regression reports impossible to reproduce.

Freeze the components that influence output: model identifier or local model build, prompt template, system instructions, tool list, retrieval corpus revision, chunking settings, reranker settings, safety policy, and evaluator rubric. You do not need to freeze these forever. You need to record the exact revision used by each run so a reviewer can replay or explain a change.

| Component | Baseline record | Candidate record | Regression risk if omitted |
|---|---|---|---|
| Prompt | Git SHA or content hash | Git SHA or content hash | Score moves with hidden instruction edits |
| Model | Provider model name or local build ID | Provider model name or local build ID | Behavior changes look like prompt changes |
| Retrieval corpus | Index manifest hash | Index manifest hash | Answers improve or degrade due to data freshness |
| Tool policy | Allowed tool manifest | Allowed tool manifest | Agent succeeds by using different capabilities |
| Evaluator | Rubric revision and judge config | Same revision for paired run | Grading drift masquerades as model drift |
| Dataset | Immutable case manifest | Same manifest | Aggregate score is not comparable |

The phrase \`same evaluator\` matters. If you update the rubric while evaluating the candidate, run the baseline through the updated rubric too. A fair comparison is paired: same input, same evaluator, two outputs. If you want to adopt a new evaluator, create a bridge run that scores the old and new systems under both rubrics and label the historical break clearly.

## Model the Evaluation Case as Test Data, Not Chat Logs

A regression suite needs cases that explain what counts as success. A raw transcript is not enough because the evaluator cannot infer every hidden requirement. Add fields for task category, risk, expected facts, forbidden behavior, and grading mode. For agents, include allowed tools and expected trace properties when tool use is part of the contract.

\`\`\`ts
export type EvalCase = {
  id: string;
  suite: 'coding-agent' | 'rag-answer' | 'support' | 'classifier';
  risk: 'low' | 'medium' | 'high';
  input: {
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    contextRefs?: string[];
  };
  expectations: {
    requiredFacts?: string[];
    forbiddenClaims?: string[];
    mustRefuse?: boolean;
    requiredToolNames?: string[];
    maxToolCalls?: number;
  };
  tags: string[];
};
\`\`\`

Keep the case ID stable across edits. If you correct a typo in an expected fact without changing the scenario, keep the ID and bump the case revision in your manifest. If the user task changes from \`write a Playwright locator\` to \`debug a flaky Playwright locator\`, create a new case. Paired comparison depends on the same scenario having the same identity over time.

A JSONL case file can stay readable:

\`\`\`json
{"id":"agent-rename-test-001","suite":"coding-agent","risk":"medium","input":{"messages":[{"role":"system","content":"You help maintain a TypeScript test suite."},{"role":"user","content":"Rename the flaky test helper and explain the behavior change."}]},"expectations":{"requiredFacts":["mentions affected test files","does not claim tests passed unless run"],"forbiddenClaims":["guarantees no flakiness remains"],"maxToolCalls":8},"tags":["code-review","test-maintenance"]}
{"id":"rag-citation-returns-002","suite":"rag-answer","risk":"high","input":{"messages":[{"role":"user","content":"What does the refund policy say about annual plans?"}],"contextRefs":["policy-refunds-v4"]},"expectations":{"requiredFacts":["annual plans are reviewed by support","answer uses provided policy context"],"forbiddenClaims":["refund is automatic for every annual plan"]},"tags":["billing","citation"]}
\`\`\`

This format is not tied to one evaluation vendor. You can transform it into DeepEval, promptfoo, Ragas, a pytest suite, a Vitest suite, or an internal harness. The durable artifact is the case contract and the run record.

## Capture Both Outputs Before Judging Either One

A common testing error is to call the candidate, grade it, and compare the score to a stale number in a dashboard. That loses the strongest debugging signal: what the baseline actually said for the same case. Capture baseline and candidate outputs in one run record before grading. Then the grader can compare the pair, and humans can inspect disagreements.

\`\`\`ts
export type SystemUnderTest = {
  name: string;
  generate(caseData: EvalCase): Promise<{
    text: string;
    toolCalls?: Array<{ name: string; input: unknown; outputSummary?: string }>;
    usage?: { inputTokens?: number; outputTokens?: number };
    latencyMs: number;
  }>;
};

export type PairedOutput = {
  caseId: string;
  baseline: Awaited<ReturnType<SystemUnderTest['generate']>>;
  candidate: Awaited<ReturnType<SystemUnderTest['generate']>>;
};

export async function capturePair(
  caseData: EvalCase,
  baseline: SystemUnderTest,
  candidate: SystemUnderTest,
): Promise<PairedOutput> {
  const [baselineOutput, candidateOutput] = await Promise.all([
    baseline.generate(caseData),
    candidate.generate(caseData),
  ]);

  return {
    caseId: caseData.id,
    baseline: baselineOutput,
    candidate: candidateOutput,
  };
}
\`\`\`

Parallel capture keeps the run fast, but do not use parallelism if the systems mutate shared state or call the same rate-limited sandbox in a way that changes behavior. For agent tests, isolate workspaces and test accounts. A baseline that consumes a one-time token before the candidate runs can make the candidate look worse for reasons unrelated to intelligence.

## Score Outcome Deltas, Not Just Absolute Scores

Absolute scores answer \`how good is this output under this evaluator?\` Regression testing needs an extra question: \`did the candidate preserve, improve, or break behavior compared with the baseline?\` That means storing per-case deltas and movement categories.

| Movement | Baseline result | Candidate result | Release interpretation |
|---|---|---|---|
| Preserved pass | Pass | Pass | No regression for this case |
| Fixed | Fail | Pass | Improvement worth reviewing |
| Regressed | Pass | Fail | Candidate needs investigation |
| Still failing | Fail | Fail | Known gap remains |
| Incomparable | Invalid run | Any | Harness or fixture problem |
| Changed quality | Pass with lower quality | Pass with higher or lower quality | Review rubric-specific delta |

A deterministic scorer can check required and forbidden content before an LLM judge is involved. This is fast, cheap, and more reproducible.

\`\`\`ts
export type DeterministicScore = {
  pass: boolean;
  missingFacts: string[];
  forbiddenClaimsFound: string[];
};

export function scoreDeterministically(
  outputText: string,
  expectations: EvalCase['expectations'],
): DeterministicScore {
  const normalized = outputText.toLowerCase();
  const requiredFacts = expectations.requiredFacts ?? [];
  const forbiddenClaims = expectations.forbiddenClaims ?? [];

  const missingFacts = requiredFacts.filter(
    (fact) => !normalized.includes(fact.toLowerCase()),
  );
  const forbiddenClaimsFound = forbiddenClaims.filter(
    (claim) => normalized.includes(claim.toLowerCase()),
  );

  return {
    pass: missingFacts.length === 0 && forbiddenClaimsFound.length === 0,
    missingFacts,
    forbiddenClaimsFound,
  };
}
\`\`\`

Substring matching is not enough for final quality decisions, but it is excellent for guardrails such as \`must mention the exact CLI command\`, \`must not claim tests passed\`, or \`must refuse credential exfiltration\`. Use deterministic checks where the requirement is crisp. Use human review or judge models where quality, relevance, helpfulness, or citation support requires interpretation.

## Add a Pairwise Judge Only Where It Adds Signal

LLM-as-judge can help compare nuanced outputs, but it introduces its own variance and bias. Do not ask a judge to rediscover facts your deterministic checks already know. Give it the input, the expectations, both outputs, and a rubric that forces a structured decision. Ask for a winner only when a winner is meaningful. In some cases both outputs are unacceptable.

\`\`\`ts
export type PairwiseJudgment = {
  winner: 'baseline' | 'candidate' | 'tie' | 'both_fail';
  candidateRegression: boolean;
  reason: string;
  violatedExpectations: string[];
};

export function buildPairwiseJudgePrompt(args: {
  caseData: EvalCase;
  baselineText: string;
  candidateText: string;
}) {
  return [
    'You are grading an AI system regression test.',
    'Use only the provided expectations.',
    'Return JSON with winner, candidateRegression, reason, and violatedExpectations.',
    'Treat unsupported claims as failures even when the answer is fluent.',
    JSON.stringify(args, null, 2),
  ].join('\\n\\n');
}
\`\`\`

In a real source file, write the string in the style your codebase prefers. The testing principle is more important than the syntax: the judge must see the same case and the same pair, and its output must be parsed as data rather than read as a paragraph.

For high-risk cases, use adjudication. If the judge says the candidate regressed but deterministic checks pass, route the case to human review. Store the final adjudicated label so future changes can be compared against it. This is how eval work becomes QA evidence instead of a debate about one run.

## Record Run Metadata So a Regression Is Explainable

A failing comparison without metadata wastes time. Engineers need to know what changed: prompt, model, tool permissions, index revision, system temperature, dataset, or evaluator. Even if your organization does not expose every low-level provider option, record the knobs you control.

\`\`\`json
{
  "runId": "eval_2026_08_07_001",
  "createdAt": "2026-08-07T09:30:00.000Z",
  "datasetManifest": "sha256:case-manifest-example",
  "baseline": {
    "name": "prod-2026-08-06",
    "promptRevision": "git:abc123",
    "retrievalManifest": "sha256:index-prod-example",
    "toolManifest": "sha256:tools-prod-example"
  },
  "candidate": {
    "name": "candidate-pr-418",
    "promptRevision": "git:def456",
    "retrievalManifest": "sha256:index-prod-example",
    "toolManifest": "sha256:tools-prod-example"
  },
  "evaluator": {
    "rubricRevision": "git:rubric789",
    "mode": "deterministic-plus-pairwise"
  }
}
\`\`\`

Store metadata next to the results, not only in CI logs. Logs expire, dashboards roll up, and provider consoles may not preserve enough context. A JSON result artifact in object storage or a test-results database can support later incident review.

## Gate Pull Requests With Risk-Sensitive Thresholds

A single global score threshold is too blunt. A candidate that improves twenty low-risk writing cases but breaks one high-risk authorization answer should not ship automatically. Weight cases by product risk and define separate gates for regressions, not only averages.

| Gate | Example rule | Why it works |
|---|---|---|
| High-risk hard stop | No high-risk preserved-pass case may regress | Protects safety, security, billing, compliance, and destructive actions |
| Regression budget | Candidate may not introduce more than a small reviewed count of medium-risk regressions | Allows controlled tradeoffs while keeping movement visible |
| Improvement floor | Candidate must fix at least one targeted failure for certain projects | Prevents churn-only prompt edits |
| Cost guard | Candidate cost or latency may not exceed an approved budget | Stops quality gains that violate product constraints |
| Harness validity | Any invalid paired run fails the evaluation job | Prevents false confidence from broken capture |

A small gate script can consume a JSON result and fail CI using ordinary process exit behavior:

\`\`\`ts
type CaseResult = {
  caseId: string;
  risk: 'low' | 'medium' | 'high';
  movement: 'preserved_pass' | 'fixed' | 'regressed' | 'still_failing' | 'incomparable';
};

export function evaluateReleaseGate(results: CaseResult[]) {
  const highRiskRegressions = results.filter(
    (result) => result.risk === 'high' && result.movement === 'regressed',
  );
  const invalidRuns = results.filter(
    (result) => result.movement === 'incomparable',
  );
  const mediumRiskRegressions = results.filter(
    (result) => result.risk === 'medium' && result.movement === 'regressed',
  );

  return {
    pass:
      highRiskRegressions.length === 0 &&
      invalidRuns.length === 0 &&
      mediumRiskRegressions.length <= 2,
    highRiskRegressions,
    invalidRuns,
    mediumRiskRegressions,
  };
}
\`\`\`

The exact thresholds are product decisions. QA should make the risk model explicit and reviewable. Do not hide a high-risk regression inside a weighted average unless the organization has intentionally accepted that risk.

## Make CI Output Useful to Reviewers

The CI job should publish a compact summary and a detailed artifact. The summary tells reviewers whether the candidate can merge. The artifact shows each changed case with baseline output, candidate output, scores, judge reason, and metadata.

\`\`\`yaml
name: llm-eval-regression

on:
  pull_request:
    paths:
      - "prompts/**"
      - "evals/**"
      - "agent-tools/**"

jobs:
  compare-baseline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run eval:compare
      - uses: actions/upload-artifact@v4
        with:
          name: llm-eval-results
          path: reports/llm-eval/
\`\`\`

This workflow uses documented GitHub Actions syntax and common official actions. The project-specific behavior lives behind \`npm run eval:compare\`, which you own. That script can call promptfoo, DeepEval, Ragas, a provider API, a local model, or a mocked agent harness, as long as it emits the paired comparison artifact.

For GitLab CI, the same idea applies: run the comparison script, save artifacts, and expose a JUnit or JSON report if your organization uses those views. The key is not the CI vendor. The key is that the comparison runs on the same frozen dataset and records both outputs.

## Diagnose Flaky Eval Comparisons

The most frustrating failure mode is a comparison that flips on rerun with no code change. Diagnose it before arguing about model quality. Start with the harness: confirm the same case manifest, same prompt revision, same evaluator revision, same retrieval manifest, and same tool sandbox. Then inspect runtime nondeterminism: provider behavior, sampling settings, time-dependent prompts, current-date tools, live web calls, randomized retrieval tie-breakers, and shared test accounts.

Create a reproducibility checklist:

| Symptom | Likely cause | Diagnostic action |
|---|---|---|
| Same case alternates pass and fail | Nondeterministic generation or judge variance | Rerun the pair several times and inspect answer differences |
| Candidate always fails after baseline runs | Shared state consumed by baseline | Isolate accounts, workspaces, queues, and files |
| RAG answers shift daily | Live corpus or index alias changed | Resolve an immutable retrieval manifest |
| Judge contradicts deterministic checks | Rubric ambiguity or judge prompt gap | Add crisp deterministic assertion or human adjudication |
| Tool traces differ for unrelated cases | Tool sandbox pollution | Reset workspace and credentials per case |

If the model provider supports deterministic controls for the model you use, apply them according to official documentation, but do not assume determinism is guaranteed across all hosted LLM behavior. Regression testing should tolerate small quality variance while hard-stopping clear safety, factuality, and tool-use regressions.

## What People Get Wrong About Baselines

The first mistake is treating the highest historical score as the baseline. That encourages teams to chase a lucky run. The correct baseline is the approved production behavior or the last release candidate you are willing to defend. A lower but stable baseline is more useful than a cherry-picked peak.

The second mistake is comparing aggregate scores across changed datasets. If you add easier cases, the average improves. If you add harder cases, the average drops. Neither result proves the system changed. When the dataset changes, run both baseline and candidate against the same new manifest and label the dataset revision. Historical charts should show the dataset break.

The third mistake is scoring only final answers for agents. Tool-using agents can produce a decent final answer while taking dangerous steps: editing too many files, reading unauthorized context, calling a destructive tool, or exhausting a step budget. Include trace-level expectations when behavior matters. A coding agent answer that says \`I did not run tests\` may be acceptable; an agent that claims tests passed without a recorded command is not.

## Store Results in a Shape You Can Query

Flat files are enough to start, but use a shape that can later move into a database. You will want to ask which tags regress most, which prompt changes improve high-risk cases, whether judge disagreement is rising, and how latency moves with quality.

\`\`\`sql
create table eval_case_results (
  run_id text not null,
  case_id text not null,
  risk text not null,
  movement text not null,
  baseline_pass boolean not null,
  candidate_pass boolean not null,
  judge_winner text,
  latency_delta_ms integer,
  cost_delta_units numeric,
  created_at timestamp not null,
  primary key (run_id, case_id)
);
\`\`\`

The table does not need to store full outputs if those live in object storage. Store references and hashes so the database remains queryable. For privacy-sensitive prompts, record approved redacted views and protect raw artifacts according to your data policy.

## A Complete Comparison Loop

The full loop is straightforward once the artifacts are clear. Select an immutable dataset. Resolve the approved baseline. Build the candidate from the pull request or experiment branch. Capture paired outputs. Run deterministic checks. Run pairwise judging only where needed. Classify movement. Apply risk-sensitive gates. Publish a summary and detailed artifact. Adjudicate disputed cases. Promote the candidate only when the regression story is acceptable.

\`\`\`bash
npm run eval:capture
npm run eval:score
npm run eval:gate
npm run eval:report
\`\`\`

Those command names are examples of scripts you can define in your own package. Keep each stage separable so a QA engineer can rerun scoring against captured outputs without paying to regenerate model responses. That separation also helps debug whether a failure is in the system, the evaluator, or the release gate.

Baseline comparison turns LLM evaluation from a subjective demo into a regression discipline. It will not tell you that your product strategy is correct. It will tell you, with evidence, which known behaviors changed and whether those changes are acceptable for release.

## Frequently Asked Questions

### Should the baseline be production or the last experiment?

Use production, or the last approved release candidate, as the default baseline. An experiment can be a secondary comparison, but it should not replace the behavior users currently rely on unless the team has formally promoted it. The baseline is a release control, not a leaderboard entry. If production is known to be bad, keep it as one comparison and add a target baseline that represents the behavior you intend to reach.

### How many eval cases are enough for regression comparison?

Enough cases means enough coverage to protect the behaviors you are willing to gate. Start with a small set of high-risk and high-traffic journeys, then add cases whenever production incidents, support escalations, or prompt reviews reveal missing scenarios. A hundred duplicated easy cases are less valuable than twenty diverse cases with clear expectations. Track coverage by risk, feature, language, tool use, and failure mode rather than chasing a universal number.

### Can we use an LLM judge for every case?

You can, but it is often wasteful and less stable than a mixed approach. Use deterministic checks for exact requirements, such as required facts, forbidden claims, JSON validity, tool-call counts, and refusal rules. Use an LLM judge for nuanced quality comparisons where a rule-based check would be misleading. For high-risk changes, add human adjudication when the judge and deterministic checks disagree or when the candidate changes product-critical behavior.

### What should happen when the dataset itself changes?

Create a new dataset manifest and run both baseline and candidate against that same manifest. Do not compare the candidate's score on the new dataset to the baseline's score on the old dataset. If you need trend continuity, run a bridge evaluation and label the chart with the dataset revision change. Case corrections are healthy, but they must be visible so score movement is not mistaken for model improvement or regression.
`,
};
