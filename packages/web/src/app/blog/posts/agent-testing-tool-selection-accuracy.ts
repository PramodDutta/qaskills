import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Agent Testing Tool Selection Accuracy: A Practical Evaluation Guide',
  description: 'Improve agent testing tool selection accuracy with executable evaluations, failure taxonomies, and CI gates that expose wrong-tool decisions before release.',
  date: '2026-08-07',
  category: 'AI Testing',
  content: `
# Agent Testing Tool Selection Accuracy: A Practical Evaluation Guide

Agent testing tool selection accuracy measures whether an AI coding agent chooses the right available tool for a task, supplies an appropriate call, and avoids calling tools that cannot advance the task. The practical way to test it is to give the agent a controlled tool catalog, run a labeled suite of realistic requests, capture every decision, and score selection separately from argument correctness and final-answer quality.

That separation matters. An agent may produce a plausible answer after selecting the wrong tool because a fallback happened to work. It may also choose the correct tool but fail because the environment was unavailable. A useful evaluation identifies which layer failed. This guide develops a repeatable harness for QA teams, including expected outcomes, trace capture, confusion analysis, adversarial cases, and CI release gates.

## Define accuracy at the decision boundary

A tool-selection decision occurs whenever an agent must decide among three actions: call one of the offered tools, answer without a tool, or ask for missing information. The label is not simply a tool name. For many requests, several sequences are acceptable, while other requests should never trigger a tool.

Treat the expected result as a set of allowed first actions plus constraints on the eventual sequence. A request to inspect a repository can reasonably begin with file discovery or a targeted search. A request to explain a pasted function should usually begin without an external call. A request to delete an unspecified deployment should ask for scope before acting.

| Decision class | Expected behavior | Typical scoring rule | Example |
|---|---|---|---|
| Required tool | Call one of the allowed tools | Pass if the first consequential action is allowed | Run the existing unit tests |
| Tool optional | Tool use or direct reasoning may pass | Score the result and unnecessary cost separately | Explain a pasted stack trace |
| No tool | Answer from supplied context | Fail on any external side effect | Summarize text in the prompt |
| Clarification required | Ask before acting | Fail if a mutating tool is called | Remove the broken environment |
| Multi-step | Use an allowed ordered sequence | Score prerequisites and dependencies | Find a config, edit it, then test |

The phrase "consequential action" prevents harmless metadata inspection from dominating the score. Decide in advance whether listing resources counts. Keep that policy stable across model comparisons.

## Build a representative task inventory

Selection accuracy only means something relative to a workload. A suite composed entirely of obvious commands will overstate production quality. Start from the tasks engineers actually delegate: locating tests, reproducing failures, editing fixtures, querying an issue tracker, opening documentation, running a browser, and preparing a report.

Stratify the inventory along dimensions that affect routing. Include direct tool-name requests, intent-only requests, ambiguous nouns, unavailable capabilities, overlapping tools, destructive actions, and tasks answerable from the prompt. Preserve user phrasing, including terse messages and imperfect terminology. Synthetic cases are useful for coverage, but production traces reveal the vocabulary that causes genuine mistakes.

| Coverage axis | Easy case | Difficult case | Risk exposed |
|---|---|---|---|
| Explicitness | "Run Playwright tests" | "Check checkout like a customer" | Intent recognition |
| Tool overlap | One file reader | Repository search plus file reader | Tool discrimination |
| Missing data | Exact test path | "Run the flaky one" | Clarification judgment |
| Side effects | Read logs | Delete test records | Safety routing |
| Availability | Tool is healthy | Tool returns unavailable | Recovery selection |
| Context length | One instruction | Long issue with buried constraint | Attention and routing |

Aim for a stable core suite and a rotating challenge set. The core supports trend analysis. The challenge set reduces overfitting and lets QA add newly observed failures without rewriting historical baselines.

## Represent expected decisions as data

Store cases in a reviewable format rather than embedding labels in test code. Each record should include the prompt, offered tools, allowed first actions, forbidden actions, and notes explaining the label. Notes are important because routing labels can be subjective. A reviewer needs to understand why a call is permitted.

The following TypeScript shape supports one-action and multi-action expectations without claiming that every valid trace is identical:

\`\`\`ts
type SelectionCase = {
  id: string;
  prompt: string;
  toolSet: string[];
  allowedFirstActions: string[];
  forbiddenActions?: string[];
  requiredEventually?: string[];
  requiresClarification?: boolean;
  rationale: string;
};

const cases: SelectionCase[] = [
  {
    id: 'repo-find-login-test',
    prompt: 'Find the existing login test and tell me what it covers.',
    toolSet: ['search_files', 'read_file', 'run_tests'],
    allowedFirstActions: ['search_files'],
    forbiddenActions: ['run_tests'],
    requiredEventually: ['read_file'],
    rationale: 'The answer requires discovery and inspection, not execution.'
  }
];
\`\`\`

Do not use a hidden chain of thought as the oracle. Score observable actions and outputs. Internal reasoning is not reliably available, and testing it couples the suite to implementation details rather than user-visible behavior.

## Instrument traces without hiding errors

Your harness needs the complete observable trace: tool catalog presented to the agent, tool calls in order, validated arguments, tool results, assistant messages, latency, and token or cost metadata when available. Capture raw events before normalizing them. Raw data is invaluable when an adapter incorrectly maps a tool name or drops an error response.

Use a small normalized event model for assertions:

\`\`\`ts
type TraceEvent =
  | { kind: 'assistant'; text: string }
  | { kind: 'tool_call'; name: string; args: unknown }
  | { kind: 'tool_result'; name: string; ok: boolean; value: unknown };

type AgentRun = {
  caseId: string;
  events: TraceEvent[];
  finalText: string;
  durationMs: number;
};

function calledTools(run: AgentRun): string[] {
  return run.events
    .filter((event): event is Extract<TraceEvent, { kind: 'tool_call' }> =>
      event.kind === 'tool_call')
    .map(event => event.name);
}
\`\`\`

Store catalog versions with results. A routing regression may come from a changed model, a renamed tool, or an edited description. Without all three identifiers, trend data becomes difficult to interpret.

## Score selection, arguments, execution, and outcome separately

One pass/fail number conceals the action needed to improve the agent. Use a layered scorecard. Selection asks whether the agent chose an allowed capability. Argument score asks whether the call was well formed and semantically appropriate. Execution score reports whether the tool completed. Outcome score evaluates whether the user got a correct response.

| Layer | Question | Agent fault example | Non-agent fault example |
|---|---|---|---|
| Selection | Was the right action chosen? | Browser used for a database query | Catalog omitted the database tool |
| Arguments | Were inputs valid and scoped? | Wrong test directory | Schema adapter removed a field |
| Execution | Did the capability run? | Agent ignores a prerequisite | CI network outage |
| Outcome | Was the task completed? | Final answer contradicts results | Reference data is stale |

A simple selection scorer can return structured evidence rather than a boolean:

\`\`\`ts
type SelectionScore = {
  passed: boolean;
  firstAction?: string;
  missingRequired: string[];
  forbiddenObserved: string[];
};

function scoreSelection(test: SelectionCase, run: AgentRun): SelectionScore {
  const calls = calledTools(run);
  const firstAction = calls[0];
  const forbidden = new Set(test.forbiddenActions ?? []);
  const required = test.requiredEventually ?? [];

  const forbiddenObserved = calls.filter(name => forbidden.has(name));
  const missingRequired = required.filter(name => !calls.includes(name));
  const firstAllowed = firstAction
    ? test.allowedFirstActions.includes(firstAction)
    : Boolean(test.requiresClarification);

  return {
    passed: firstAllowed && forbiddenObserved.length === 0 && missingRequired.length === 0,
    firstAction,
    missingRequired,
    forbiddenObserved
  };
}
\`\`\`

For clarification cases, also verify the assistant actually asks a relevant question. Absence of a tool call alone is not enough. A refusal, an irrelevant lecture, and a precise scope question have different user value.

## Use confusion matrices for overlapping capabilities

Overall accuracy can remain flat while a high-risk route deteriorates. Build a confusion matrix where rows are expected action classes and columns are observed first actions. This immediately shows that, for example, repository search is being replaced by shell execution, or documentation lookup is being replaced by unsupported memory.

Normalize aliases before aggregation only when aliases truly represent the same capability. Do not combine a read-only SQL query tool with a general database administration tool simply because both mention a database.

\`\`\`ts
function confusionKey(expected: string, observed: string | undefined): string {
  return \`\${expected} -> \${observed ?? 'no_call'}\`;
}

const matrix = new Map<string, number>();

for (const result of evaluatedRuns) {
  const key = confusionKey(result.expectedClass, result.firstAction);
  matrix.set(key, (matrix.get(key) ?? 0) + 1);
}
\`\`\`


Review confusion by risk as well as frequency. One unnecessary search call is usually cheaper than one mistaken production mutation. Weighting does not replace raw accuracy, so report both.

## Test abstention and clarification as first-class skills

People often get tool testing wrong by treating more tool use as greater agency. Mature agents must abstain when the prompt already contains enough information, when no offered tool can help, or when authorization and scope are missing. An agent that always acts can look impressive in a demo and become dangerous in a shared environment.

Create paired tests. In one case, provide an exact resource identifier and expect a read. In the paired case, remove the identifier and expect a clarification. In another pair, ask for current build status and expect a CI query, then paste the status in the prompt and expect a direct explanation.

Assertions should inspect both action and language:

\`\`\`ts
function assertClarifiedWithoutMutation(run: AgentRun, mutatingTools: Set<string>) {
  const calls = calledTools(run);
  const mutations = calls.filter(name => mutatingTools.has(name));

  if (mutations.length > 0) {
    throw new Error(\`Mutating calls before clarification: \${mutations.join(', ')}\`);
  }

  if (!run.finalText.includes('?')) {
    throw new Error('Expected a concrete clarification question');
  }
}
\`\`\`

The question-mark check is only a starter assertion. A semantic evaluator or human rubric should confirm that the question requests the missing scope rather than asking something unnecessary.

## Challenge descriptions, not just prompts

Tool descriptions are part of the agent system. Small wording changes can determine whether an agent distinguishes "search issue titles" from "search repository contents." Test catalog quality by holding prompts constant and varying descriptions in controlled experiments.

Good descriptions state the object acted on, whether the operation reads or writes, important prerequisites, and what the result contains. Avoid advertising copy. Overlapping tools should explain their boundary using parallel terms so differences are visible.

| Weak description | Stronger description | Selection benefit |
|---|---|---|
| Search everything | Read-only search over repository file paths and contents | Defines corpus and side effect |
| Manage tests | Create or update test cases in the test-management system | Names mutation and destination |
| Open browser | Navigate and interact with rendered web pages in a browser session | Separates UI work from HTTP calls |

Do not leak the benchmark label by copying prompt wording into one description. The goal is clear capability boundaries that generalize beyond the suite.

## Add adversarial and metamorphic cases

Adversarial cases expose fragile keyword routing. Mention a tool in a context where it should not be used: "Explain why the Playwright result below failed" should not require rerunning Playwright when the trace contains enough evidence. Put an irrelevant URL beside a request to inspect a local file. Include quoted instructions from an issue that attempt to redirect the agent.

Metamorphic testing changes one property while preserving the expected route. Paraphrase the request, reorder background details, replace a filename with another valid filename, or add irrelevant prose. A stable agent should preserve the decision. Conversely, change the task from "describe" to "update" and expect the route to change from read-only inspection to an edit sequence.

\`\`\`ts
const variants = [
  'Locate the checkout spec and summarize its assertions.',
  'Which assertions are in our checkout test? Find the spec first.',
  'I need a summary, not a run. Inspect the checkout spec assertions.'
];

for (const prompt of variants) {
  test.each([{ prompt }])('routes repository inspection: $prompt', async ({ prompt }) => {
    const run = await executeAgent({ prompt, tools: repositoryTools });
    expect(calledTools(run)[0]).toBe('search_files');
    expect(calledTools(run)).not.toContain('run_tests');
  });
}
\`\`\`

Use your actual test runner's supported parameterization syntax. The example illustrates the test data and assertions, not a required framework choice.

## Diagnose the realistic wrong-browser failure

Consider an agent asked, "Check whether the API returns an order with status paid." The catalog offers an HTTP client, a browser automation tool, and a repository reader. The agent opens the UI, logs in, navigates to an order, and reports the displayed status. The final answer looks correct, yet the selection is wrong because the request targets the API contract. The browser introduces authentication state, frontend transformations, and extra latency.

Diagnose this failure in layers:

1. Confirm the exact catalog shown to the model. Was the HTTP capability present?
2. Inspect descriptions. Did the browser description mention APIs broadly while the HTTP description omit response inspection?
3. Review the prompt and label. Could "check" reasonably mean user-interface validation in your domain?
4. Compare paraphrases that explicitly say "HTTP response body" and "what a customer sees."
5. Inspect whether earlier context biased the agent toward browser tasks.
6. Re-run enough times to distinguish a consistent boundary error from sampling variance.

The fix may be a clearer description, a prompt policy, better examples, or a catalog change. Tuning the model is not the only lever.

## Evaluate multi-tool plans without demanding one exact trace

Complex coding tasks can have several valid plans. Requiring an exact sequence makes the benchmark brittle and punishes harmless exploration. Express invariants instead: a file must be read before it is edited, tests must run after the change, production mutation must not occur, and the final answer must cite actual results.

A trace predicate makes those constraints explicit:

\`\`\`ts
function indexOfCall(run: AgentRun, name: string): number {
  return run.events.findIndex(
    event => event.kind === 'tool_call' && event.name === name
  );
}

function assertEditWorkflow(run: AgentRun) {
  const read = indexOfCall(run, 'read_file');
  const edit = indexOfCall(run, 'edit_file');
  const test = indexOfCall(run, 'run_tests');

  if (read < 0 || edit < 0 || test < 0) throw new Error('Missing workflow action');
  if (!(read < edit && edit < test)) throw new Error('Unsafe workflow order');
}
\`\`\`

Allow additional read-only calls within a cost budget. Record efficiency metrics such as redundant calls, repeated identical queries, and calls after sufficient evidence was already available.

## Separate model accuracy from platform reliability

Tool systems fail outside the model. Schema conversion can drop required fields. A permission token can expire. Results can arrive in an unexpected format. If all such failures are labeled "agent chose badly," the evaluation sends engineers toward the wrong fix.

Run a preflight that validates tool availability and a contract test that calls deterministic fixtures without the agent. Then execute agent evaluations. Tag infrastructure failures and exclude them from the primary selection denominator, while still reporting their rate. Otherwise an unstable staging dependency can make a new model look worse.

This layered approach complements the broader architecture in the [agentic AI testing guide](/blog/agentic-ai-testing-guide-2026). When capabilities are exposed through Model Context Protocol servers, the catalog and contract checks described in [MCP servers for test automation](/blog/mcp-servers-test-automation-2026) help distinguish routing mistakes from server defects.

## Establish release gates with uncertainty visible

A release gate should protect critical routes without pretending a finite sample is perfect. Define an overall floor, per-risk-class floors, and zero-tolerance safety conditions. Compare the candidate with the current production configuration on identical cases. Use repeated runs for nondeterministic systems and report the number of observations.

| Gate | Example policy | Reason |
|---|---|---|
| Overall selection | Candidate does not fall below agreed floor | Stops broad regressions |
| Critical mutation | No unauthorized mutating calls | Protects shared systems |
| Clarification | No regression on missing-scope cases | Preserves safe behavior |
| Key confusion pair | Browser-for-API errors do not increase | Guards known weakness |
| Reliability | Infrastructure error rate stays below alert limit | Makes score interpretable |

Avoid choosing a universal percentage from an article. Your threshold should follow workload risk, suite size, and baseline variance. A 99 percent aggregate can still be unacceptable if the remaining one percent contains destructive decisions.

## Run the evaluation in CI

Divide tests into a fast deterministic smoke set and a larger scheduled evaluation. Pull requests that change tool schemas, descriptions, agent prompts, or routing logic should run the smoke set. Nightly or pre-release jobs can run repeated samples and expensive semantic grading.

An ordinary GitHub Actions job can invoke your repository script and upload reports:

\`\`\`yaml
name: agent-tool-evaluation

on:
  pull_request:
  workflow_dispatch:

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run eval:tool-selection
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: tool-selection-report
          path: reports/tool-selection/
\`\`\`

Pin dependencies through the repository lockfile, mask secrets, and ensure evaluation tools point at non-production fixtures. The workflow flags shown are standard action configuration, while the npm script and report path are project-defined examples.

## Review failures as a QA triage queue

Every failed case should produce a compact bundle: case identifier, prompt, tool catalog version, expected rule, observed trace, tool errors, scorer explanation, and rerun links. Group failures by confusion pair and likely ownership. This turns evaluation from a leaderboard into an engineering workflow.

Use a failure taxonomy with stable labels:

| Failure label | Meaning | Likely first owner |
|---|---|---|
| Intent misread | Correct capability existed but another was chosen | Agent or prompt team |
| Boundary ambiguity | Descriptions overlap materially | Tool platform owner |
| Premature action | Agent should have clarified | Safety and agent team |
| Invalid arguments | Right tool, wrong input | Agent or schema owner |
| Recovery loop | Repeated failed calls without adapting | Agent team |
| Harness defect | Trace or oracle is wrong | Evaluation owner |

Review a sample of passes too. A permissive rule can hide low-quality traces, especially when the final answer is correct by chance.

## Improve accuracy with targeted interventions

Once a confusion cluster is proven, make the smallest intervention that addresses it. Clarify tool boundaries, remove redundant capabilities, add a routing example, require confirmation for high-risk operations, or expose structured prerequisites. Then rerun the failing cluster plus the stable core to detect displacement into another route.

Do not optimize only for the benchmark. If examples repeat exact case language, selection gains may not generalize. Hold out paraphrases and production-derived cases. Track call cost and latency alongside accuracy because a policy that invokes three tools for every simple question can improve recall while harming users.

Teams that want packaged capability instructions can install ready-made QA skills from qaskills.sh with the qaskills CLI. Treat any installed skill like other routing inputs: version it, inspect its tool assumptions, and rerun the relevant selection suite before adoption.

## A practical rollout sequence

Begin with twenty to forty high-value cases rather than hundreds of weak labels. Include at least one no-tool case, one clarification case, one overlapping-tool pair, one unavailable-tool recovery, and one multi-step invariant. Have two reviewers label safety-sensitive cases and record disagreements.

Next, add trace capture and layered scoring. Run the current configuration repeatedly to establish variance. Only then set release gates. After the first production incident, add a minimal reproducer to the challenge set and a generalized variant to the core set. This creates a feedback loop in which real failures improve coverage without turning the benchmark into a list of memorized incidents.

The durable metric is not "the agent called something." It is whether the agent chose the least risky capability that could produce sufficient evidence, used it correctly, and stopped when the task was complete.

## Frequently Asked Questions

### Is tool selection accuracy the same as task success rate?

No. Task success measures whether the requested outcome was achieved, while selection accuracy evaluates whether the agent chose an appropriate action or capability. A task can succeed through a costly or unsafe route, such as checking an API claim through a browser. It can also fail after a correct selection because a service is unavailable. Report both metrics, plus argument validity and execution reliability, so a change in one layer does not masquerade as a change in another.

### How many evaluation cases are enough for an initial baseline?

Start with a small, carefully labeled set that represents important routes and risks. Twenty to forty cases can reveal obvious confusion if they cover abstention, clarification, overlap, failure recovery, and multi-step work. It is not enough for a universal accuracy claim. Expand using production language, repeat nondeterministic runs, and show counts beside percentages. Safety-critical routes need more focused evidence than low-impact read-only lookups.

### Should an evaluator require the exact same sequence on every run?

Usually not. Multi-tool tasks often permit several safe plans. Assert invariants such as reading before editing, testing after editing, avoiding forbidden mutations, and eventually using required evidence. Exact first-action rules are appropriate when the boundary is central, for example choosing an HTTP client rather than a browser for an API response. Flexible predicates reduce brittle failures while preserving the behavior that matters.

### What should the team do when reviewers disagree about the correct tool?

Treat disagreement as useful evidence. Revisit the prompt, capability descriptions, and domain assumptions, then record why each route might be valid. If both routes are safe and sufficient, allow both and compare cost separately. If disagreement reveals missing scope, label clarification as the expected action. Persistent ambiguity often indicates that tool descriptions or ownership boundaries need improvement, not that one reviewer must be forced into an arbitrary answer.
`,
};
