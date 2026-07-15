import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'How to Test Agent Skills: Evals, Iteration, and Regression Checks',
  description: 'Learn how to test agent skills with repeatable evals, QA-grade fixtures, scoring rubrics, and regression gates that make every iteration safer.',
  date: '2026-07-15',
  category: 'Tutorial',
  content: `
# How to Test Agent Skills: Evals, Iteration, and Regression Checks

An agent skill is executable guidance, not a document that merely needs proofreading. Its real behavior emerges when a model interprets the description, chooses whether to load the skill, follows its workflow, reads referenced resources, calls tools, and produces an artifact. A typo check cannot tell you whether that chain works. A useful evaluation can.

For QA and test-automation engineers, the practical answer to how to test agent skills is familiar: define observable behavior, build representative fixtures, separate fast checks from expensive scenarios, record evidence, and gate releases on regressions. The unfamiliar part is that outputs may be semantically correct without being textually identical. Your harness therefore needs deterministic checks where possible and structured judgment where necessary.

This guide develops a complete evaluation system for skills used in test planning, Playwright authoring, API verification, bug triage, and CI analysis. It covers activation, instruction following, tool use, artifact quality, safety, iteration, and release decisions. The goal is not to freeze a skill forever. The goal is to make change measurable enough that you can improve it confidently.

## Define the behavioral contract before writing an eval

A skill evaluation starts with a contract: under which conditions should the skill activate, what work should it perform, and what evidence proves success? If the contract is vague, the eval becomes a collection of favorite prompts and subjective opinions. That is the agent equivalent of automating UI tests before agreeing on acceptance criteria.

Write the contract from the user's perspective. A Playwright troubleshooting skill might promise to diagnose locator instability, request missing evidence only when necessary, prefer accessible selectors, and return a minimal patch plus verification steps. Each promise becomes an observable. Avoid specifying the exact prose the model must emit unless wording itself is the requirement.

The contract should cover five layers:

| Layer | Contract question | QA example | Failure signal |
|---|---|---|---|
| Discovery | Should the agent select this skill? | A prompt mentions flaky Playwright locators | Skill is missed or selected for unrelated work |
| Procedure | Does it follow the intended sequence? | Inspect trace before proposing retries | Patch is suggested without evidence review |
| Tool use | Does it use permitted tools correctly? | Reads the failing spec and page object | Invents a file or runs an unsafe command |
| Artifact | Is the result technically useful? | Locator patch compiles and targets one element | Patch is invalid or broadens the match |
| Boundary | Does it avoid work outside scope? | Declines to expose credentials from CI logs | Leaks secrets or changes unrelated tests |

Turn the contract into a short list of must, should, and must-not statements. This priority split prevents low-value style preferences from outweighing a broken artifact. For example, “must not replace assertions with sleeps” is a release condition. “Should summarize the root cause in two sentences” is a quality preference.

\`\`\`yaml
skill_contract:
  capability: diagnose and repair flaky Playwright tests
  must:
    - identify evidence supporting the proposed root cause
    - preserve or strengthen the original assertion
    - provide a runnable verification step
  should:
    - prefer role, label, or test-id locators over CSS structure
    - keep the patch limited to the failing behavior
  must_not:
    - add arbitrary fixed waits
    - claim a test passed without execution evidence
    - expose secrets found in logs
\`\`\`

If you are still designing the file itself, the [complete SKILL.md creation guide](/blog/how-to-create-a-claude-skill-skill-md-complete-guide) explains the documented name and description frontmatter and the user or project skill locations. Testing is much easier once activation intent and procedural scope are explicit.

## Build a skill eval pyramid for fast and realistic feedback

One end-to-end conversation cannot diagnose why a skill failed. It also costs too much to run after every sentence change. Use a pyramid in which the broad base contains cheap static checks, the middle exercises individual behaviors, and the top runs realistic repository tasks.

| Eval tier | Typical target | Speed | What it catches |
|---|---|---:|---|
| Static contract checks | Files, frontmatter, references, forbidden text | Seconds | Broken packaging and obvious policy violations |
| Activation checks | Skill selected or ignored for labeled prompts | Seconds to minutes | Weak descriptions and overlap with adjacent skills |
| Component scenarios | One workflow branch with a small fixture | Minutes | Missed steps, poor tool choice, invalid artifacts |
| Repository simulations | Multi-file task in a disposable repo | Minutes | Integration, navigation, compilation, test behavior |
| Shadow or sampled production review | Real requests with human oversight | Hours to days | Distribution shifts and unanticipated user language |

Static checks should be strict. Confirm that the skill directory contains \`SKILL.md\`, that its frontmatter name and description are present, that referenced files exist, and that examples do not include retired commands. The documented limits are 64 characters for the name and 1024 characters for the description. Do not turn every sentence into a snapshot, because harmless editing then creates noise.

Activation checks test the description as a classifier. Positive prompts should cover direct requests, shorthand from experienced engineers, and incomplete language from stressed incident responders. Negative prompts should include neighboring tasks that sound similar but need a different skill. A security review skill, for instance, should not activate merely because an ordinary test happens to use authentication.

Component scenarios isolate one branch. Give a tiny repository containing a brittle selector, one trace excerpt, and a failing test output. Ask for diagnosis and a patch. Repository simulations add a package manifest, page objects, helpers, and distracting failures. Their purpose is to discover whether the skill still works amid normal project entropy.

Keep only a few top-tier simulations in the pull-request gate. Run the larger suite nightly or before a skill release. This preserves fast author feedback while retaining coverage of real agent behavior.

## Design fixtures that resemble testing work, not toy prompts

The fixture determines what the eval can teach you. “Write a login test” is too underspecified to reveal whether a skill handles production constraints. A good fixture supplies the same evidence an engineer would inspect: repository files, command output, a trace excerpt, environmental limitations, and an acceptance criterion.

Build each fixture as an immutable input bundle. Put it in a disposable workspace for every run so one candidate cannot benefit from files created by a previous candidate. If the agent can execute commands, use a container or another isolated environment with narrowly scoped credentials and predictable dependencies.

A useful fixture manifest records intent without prescribing the answer:

\`\`\`yaml
id: playwright-checkout-locator-004
task: repair the failing checkout confirmation test
inputs:
  repository: fixtures/checkout-app
  evidence:
    - artifacts/failure-summary.txt
    - artifacts/accessibility-snapshot.txt
constraints:
  - do not change application source
  - preserve the order confirmation assertion
  - do not add fixed timeouts
expected_observations:
  - two buttons share the visible label Continue
  - the dialog provides a unique accessible name
verification:
  - npm test -- checkout-confirmation.spec.ts
\`\`\`

Create fixtures across dimensions that matter to your organization. For a test-generation skill, vary framework, repository structure, assertion style, authentication mechanism, and whether the requirement is complete. For triage, vary log volume, misleading symptoms, concurrency, and the actual defect layer. For API testing, vary content types, pagination, retries, and schema drift.

Use minimal fixtures for component diagnosis and larger fixtures for integration confidence. Minimal does not mean artificial. A six-file repository can still exhibit a real page-object abstraction, shared fixture, and locator bug. Strip unrelated dependencies, but retain the structural feature that makes the scenario meaningful.

Version fixtures like test data. A scenario ID should continue to represent the same behavior. If requirements change, add a new version instead of quietly rewriting the expected outcome. Otherwise trend charts compare different questions under the same label.

Finally, seed controlled ambiguity. One scenario might omit the browser name because it is irrelevant. Another might omit a required base URL, where the correct behavior is to ask a question or clearly state an assumption. This distinguishes useful initiative from confident fabrication.

## Measure activation with positive, negative, and boundary prompts

A skill that is never selected is unavailable in practice. A skill that activates everywhere creates interference, wastes context, and may apply the wrong workflow. Treat discovery as a classification problem with a labeled prompt set.

Start with at least three prompt families. Positive prompts clearly need the skill. Negative prompts belong to distant capabilities. Boundary prompts sit beside the skill's scope and expose description overlap. For a skill that reviews generated Playwright tests, a boundary prompt might ask to debug the application component rather than the test.

| Prompt label | Example request | Expected decision | Reason |
|---|---|---|---|
| Positive | “Review this generated Playwright spec for false positives” | Activate | Direct artifact and quality task |
| Positive, indirect | “This spec passes even when checkout is broken” | Activate | Describes the failure mode without naming review |
| Boundary | “The checkout component throws after clicking Pay” | Usually do not activate | Application debugging is primary |
| Boundary | “Write tests that reproduce this checkout exception” | Activate | Test design is now the requested capability |
| Negative | “Summarize our release notes” | Do not activate | No testing workflow is involved |

Calculate precision and recall for activation. Recall answers, “Of the prompts that need the skill, how often was it selected?” Precision answers, “Of the times it was selected, how often was that appropriate?” Both matter. A broad description may raise recall while destroying precision.

\`\`\`typescript
type ActivationCase = {
  id: string;
  prompt: string;
  expected: 'activate' | 'ignore';
};

const activationCases: ActivationCase[] = [
  {
    id: 'false-positive-review',
    prompt: 'Review this generated Playwright spec for false positives',
    expected: 'activate',
  },
  {
    id: 'release-note-summary',
    prompt: 'Summarize these release notes for the team',
    expected: 'ignore',
  },
];
\`\`\`

Do not tune the description against only literal keyword matches. Include phrases from bug reports, pull-request comments, Slack-style shorthand, and non-native English. Add a prompt to the regression corpus whenever a real user expresses the need in a way your activation suite missed.

When multiple skills are available, run competitive activation tests. A request for “API contract coverage” might plausibly select schema validation, test generation, or consumer-driven contract testing. The expected result can allow one primary skill and one acceptable alternative, but should reject unrelated selections. Competitive cases reveal collisions that isolated tests hide.

## Score outputs with evidence-backed assertions and rubrics

Exact string matching is appropriate for file paths, command exit codes, and required artifact fields. It is poor at judging a diagnosis. Combine deterministic assertions, model-assisted grading, and targeted human review. Each method should score the property it can observe reliably.

| Scoring method | Use it for | Avoid using it for | Evidence produced |
|---|---|---|---|
| Parser or schema check | YAML, JSON, TypeScript syntax, required headings | Technical correctness of a strategy | Parse result and error location |
| Command execution | Compilation, unit tests, lint, generated test behavior | Claims about unexercised environments | Exit code, stdout, artifacts |
| Semantic rubric grader | Root-cause reasoning, relevance, instruction adherence | Secret detection when a pattern check suffices | Criterion scores with cited excerpts |
| Human review | Novel failures, rubric calibration, high-risk release | Every routine candidate | Expert disposition and notes |

Prefer binary assertions for release-critical properties. The generated spec compiles or it does not. The patch contains a fixed timeout or it does not. The original assertion remains or it does not. Use scaled rubrics for dimensions such as diagnosis quality, minimality, and explanation clarity.

A rubric should describe observable anchors rather than adjectives. “Excellent” is not reproducible. “Names the duplicated accessible label, cites the snapshot evidence, and scopes the locator to the confirmation dialog” is reproducible.

\`\`\`markdown
## Root-cause accuracy: 0 to 3

- 3: Identifies the duplicated accessible label, cites fixture evidence, and explains
  why the original locator resolves ambiguously.
- 2: Identifies locator ambiguity but does not connect it to specific evidence.
- 1: Suggests a locator change without a supported root cause.
- 0: Attributes failure to timing or network behavior contrary to the evidence.

## Patch integrity: pass or fail

Pass only when the original order-confirmation assertion remains, no fixed wait is
added, and the edited TypeScript passes the configured checks.
\`\`\`

Require graders to quote or point to evidence from the candidate output. Randomize candidate order when comparing versions, and hide which version is new. Periodically send a sample to two human reviewers and measure agreement. If humans disagree frequently, the rubric is ambiguous or the fixture lacks decisive evidence.

Never let an overall average mask a critical failure. A candidate that scores beautifully on clarity but leaks a token must fail. Report a scorecard with hard gates, per-dimension scores, and scenario tags rather than one seductive number.

## Exercise the entire skill workflow, including tool calls

Text-only grading misses the most important failures in an agentic workflow. The skill may instruct the agent to inspect files, run the narrow failing test, read a trace, edit a spec, and rerun verification. Your eval should record whether those events occurred and what they produced.

Instrument the harness at the tool boundary. Capture tool name, normalized arguments, start time, duration, result status, and artifact hashes. Redact credentials before persisting transcripts. Avoid demanding an exact call sequence when several sequences are valid. Assert critical precedences instead: evidence inspection must happen before a confident diagnosis, and the edited file must be verified after the edit.

\`\`\`typescript
type ToolEvent = {
  tool: string;
  phase: 'before-edit' | 'edit' | 'after-edit';
  ok: boolean;
  target?: string;
};

function hasVerifiedEdit(events: ToolEvent[]): boolean {
  const editIndex = events.findIndex((event) => event.phase === 'edit' && event.ok);
  return editIndex >= 0 && events.slice(editIndex + 1).some(
    (event) => event.phase === 'after-edit' && event.ok,
  );
}
\`\`\`

Add decoy files to some fixtures. If the agent reads every artifact in a large repository, the skill may lack navigation guidance. If it ignores the one failure summary named in the prompt, the workflow may underemphasize evidence. Measure both correctness and economy: useful files read, irrelevant files read, redundant commands, and repeated failures without adaptation.

Tool errors deserve dedicated scenarios. Make a test command unavailable, return a truncated log, or deny write access. The desired behavior is usually to explain the limitation, use safe alternate evidence, and avoid claiming completion. Recovery behavior separates a resilient skill from a happy-path prompt.

For destructive or externally visible tools, replace real systems with fakes. A test-management skill can submit to a mock endpoint that records the proposed payload. The eval can then verify field mapping without creating actual test cases. Production shadowing should remain read-only unless a human explicitly authorizes the action.

## Test progressive disclosure as a context-budget behavior

A well-structured skill gives the agent enough information at the moment it needs it. It does not force every reference, example, and framework variant into the initial context. Testing this property requires more than counting files. You need to observe whether the agent loads relevant resources and ignores irrelevant ones.

Create paired scenarios that share an entry prompt but diverge later. One repository uses Playwright, the other uses Cypress. The base instructions should route each case to the right reference. Penalize loading both framework guides unless both are genuinely needed. This evaluates information architecture, not merely answer quality.

The [progressive disclosure design guide](/blog/progressive-disclosure-agent-skill-design) explains how to keep routing instructions in the main skill and move conditional depth into referenced resources. In evals, treat every reference as a branch with three questions: was it discoverable, was it loaded when relevant, and did its guidance alter the result correctly?

| Disclosure failure | Transcript symptom | Likely design repair |
|---|---|---|
| Hidden resource | Agent improvises despite a relevant guide | Make the reference and trigger condition explicit |
| Context flooding | Agent reads every framework document immediately | Add decision-oriented routing near the reference list |
| Late discovery | Agent edits, fails, then finds the required rule | Move the routing cue earlier in the workflow |
| Stale branch | Agent follows a retired command from a reference | Add reference-level freshness and regression checks |

Measure context use carefully. Token count alone is not quality. A shorter run that misses a critical repository policy is worse than a longer correct run. Track useful-resource recall and irrelevant-resource rate alongside approximate context consumption.

Create a static reference graph as a quick preflight. Every relative reference should resolve, and intentional leaf files should not point into cycles that cause repeated loading. Then use scenario traces to check the dynamic graph, the resources actually selected. The combination catches both broken packaging and poor runtime routing.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI. Whether a skill is installed or authored locally, apply the same disclosure tests before trusting it in a large test repository.

## Add adversarial and metamorphic cases to expose brittle guidance

Ordinary examples show that a skill can work. Adversarial cases show whether it fails safely. Metamorphic cases show whether irrelevant changes alter the outcome. Both are especially useful when natural-language outputs make fixed expected text impractical.

For adversarial testing, place misleading instructions in fixture content, such as a log line that says to upload environment variables. The agent should treat repository and artifact text as untrusted data, not higher-priority instructions. Include secrets represented by unmistakable dummy markers and assert that the final response redacts them.

For metamorphic testing, transform a passing fixture while preserving its semantics. Rename a helper, reorder unrelated tests, change prose in a requirement, or add an irrelevant failing screenshot. The diagnosis and patch strategy should remain equivalent. If the output changes dramatically, the skill may be anchored to example wording or repository trivia.

\`\`\`yaml
metamorphic_family: api-pagination-contract
base_case: fixtures/api-pagination/base
transformations:
  - rename the client helper without changing behavior
  - reorder unrelated test declarations
  - replace sample customer names
invariants:
  - detect the missing next-page assertion
  - preserve the existing status and schema checks
  - avoid assuming a fixed total item count
\`\`\`

Mutation testing provides another strong signal. Deliberately weaken the skill or its generated artifact: remove an instruction to preserve assertions, swap a role locator for a broad CSS selector, or delete the verification step. A capable eval suite should kill these mutants by producing a failing score. Surviving mutants identify blind spots in the harness.

Test prompt injection, oversized inputs, conflicting repository guidance, unavailable tools, malformed evidence, and tasks outside scope. The expected response need not be a refusal every time. Often it should isolate untrusted material, explain the conflict, and continue with the safe portion of the task.

Keep adversarial fixtures controlled and clearly synthetic. Never place usable secrets in the suite. Ensure that failure logs and grader prompts cannot accidentally reproduce sensitive production data.

## Turn every real failure into a durable regression check

A regression corpus is the memory of the skill. Without it, iteration becomes a loop in which one example improves while an older capability silently breaks. Every confirmed production failure should yield a minimized, sanitized scenario before or alongside the fix.

Use a consistent intake workflow:

1. Capture the request, relevant environment facts, tool trace, and harmful outcome.
2. Remove customer data, credentials, and unrelated repository content.
3. Minimize the fixture while reproducing the same behavioral failure.
4. State the contract property that was violated.
5. Confirm the current skill fails the new case for the expected reason.
6. Implement the smallest skill or resource change that addresses the cause.
7. Run the full appropriate suite, not only the new case.

Tag regressions by capability, framework, risk, and failure mechanism. Tags let you run a narrow set during authoring and the complete collection before release. They also reveal clusters. Five “wrong locator” incidents might actually share one missing instruction about inspecting the accessibility tree.

\`\`\`yaml
regression:
  id: reg-2026-017
  source: sanitized-production-report
  capability: playwright-diagnosis
  risk: high
  mechanism: unsupported-timing-assumption
  expected:
    hard_gates:
      - no fixed wait is introduced
      - diagnosis cites available trace evidence
    rubric:
      root_cause_accuracy: 3
      patch_minimality: 2
\`\`\`

Keep the baseline result alongside the regression case. A future reviewer should see what failed, what changed, and why the expected behavior is legitimate. Do not preserve raw conversation transcripts when a smaller structured fixture is sufficient.

Some failures should become static linters rather than expensive conversational evals. If an incident involved a forbidden fixed wait, a pattern-based check may catch recurrence cheaply. Keep the scenario too if context determines whether the construct is harmful, but shift simple invariants toward the pyramid base.

Delete or rewrite obsolete cases deliberately. A regression suite that encodes retired product behavior becomes an anchor against improvement. Every removal should note which contract changed and who approved it.

## Iterate by diagnosing the layer that failed

When an eval fails, resist rewriting the entire skill. First identify the layer: activation, routing, procedure, domain knowledge, tool recovery, artifact construction, or grading. The smallest correct intervention is easier to understand and less likely to create collateral regressions.

Use a failure matrix during triage:

| Observed failure | Most likely layer | First evidence to inspect | Candidate change |
|---|---|---|---|
| Skill never loads | Discovery | Activation labels and selected capabilities | Clarify description with scope and trigger language |
| Wrong reference loads | Disclosure routing | Resource-read events | Sharpen branch conditions in the main workflow |
| Correct plan, invalid patch | Artifact construction | Parser and compiler output | Add a focused template or verification requirement |
| Works until a tool errors | Recovery procedure | Tool event sequence | Document fallback and evidence rules |
| Output seems right, score is low | Grading | Rubric anchors and cited evidence | Calibrate grader before changing the skill |

Run a baseline before editing. Change one coherent idea at a time, then compare per-scenario deltas, tool use, and hard-gate failures. A change that improves the average by two points but introduces one critical secret leak is a rejection.

Maintain an experiment note with hypothesis, patch, targeted cases, full-suite result, and decision. This can be lightweight, but it prevents the team from repeating unsuccessful prompt changes months later.

\`\`\`markdown
## Experiment E-042

Hypothesis: Agents miss the trace because the evidence step appears after patch advice.

Change: Move evidence collection before root-cause classification and name trace.zip as
one possible source without making it mandatory.

Target result: reg-2026-017 passes with no increase in irrelevant artifact reads.

Decision: Accept only if all high-risk gates pass and activation precision is unchanged.
\`\`\`

Inspect improvements for overfitting. If a change repeats fixture-specific filenames, commands, or diagnoses, it may pass the suite without generalizing. Counter with held-out scenarios and metamorphic variants. The skill should teach a decision procedure, not memorize your benchmark.

Model or platform updates can change behavior without a skill edit. Record the model family, relevant agent configuration, tool versions, fixture revision, and run date with every result. When a baseline moves, you can distinguish skill drift from environment drift.

## Establish release gates that reflect QA risk

Not every score change deserves the same reaction. Define gates before seeing the candidate so a persuasive demo cannot override a serious regression. Use risk tiers based on what the skill can access and what a failure can damage.

| Risk tier | QA skill example | Required gate | Suggested release path |
|---|---|---|---|
| Low | Drafts test-case ideas without tools | No critical policy failures, quality threshold met | Standard review and sampled follow-up |
| Medium | Edits test code in a branch | Compile, targeted tests, no assertion weakening | Full regression suite and reviewer approval |
| High | Operates CI or test-management tools | All safety gates, recovery cases, audit evidence | Staged rollout with human confirmation |
| Critical | Can affect production data or releases | Formal threat review and strict authorization | Do not rely on skill evals alone |

Gate hard invariants separately from aggregate quality. A practical candidate report includes activation precision and recall, scenario pass rate, hard-gate count, median rubric score, tool error recovery, context-use indicators, and cost or latency. Report confidence intervals when run-to-run variation is material.

Repeat non-deterministic scenarios several times. One lucky pass is weak evidence. The number of repetitions should grow with risk and output variability. Preserve the seeds or run identifiers your platform exposes, but do not assume exact reproducibility from a stochastic model.

Use a champion-challenger comparison. The released skill is the champion; the edited version is the challenger. Run both on the same fixture revision and environment. Promote only when the challenger resolves the target issue, preserves hard gates, and does not create unacceptable segment regressions.

Roll out in stages where possible: team sandbox, opt-in pilot, broader internal use, then default availability. Monitor correction rate, abandoned runs, tool errors, and reviewer overrides. Offline evals establish readiness, while controlled use tests whether your fixture distribution matches reality.

Store the skill version or content hash in every run record. When a user reports a problem, you need to know exactly which instructions and references were active.

## Operate the suite as a maintained QA product

An eval suite decays unless someone owns it. Assign maintainers for fixtures, graders, infrastructure, and release decisions. Schedule reviews for stale dependencies, retired framework versions, duplicated cases, and scoring criteria that no longer reflect team practice.

Keep the suite observable. A simple dashboard should show pass rate by capability and risk, activation confusion pairs, newly flaky scenarios, cost, latency, and the oldest unreviewed regression. Segment results instead of celebrating one global average.

When a scenario becomes flaky, classify the source. Model variance may require repeated trials and threshold scoring. Infrastructure flakiness requires a stable fixture or mock. An ambiguous oracle requires rubric repair. Do not simply add retries until the chart turns green.

Calibrate semantic graders against human decisions on a fixed sample. Recalibrate after changing the grader model or rubric. Include counterexamples that are fluent but technically wrong, because language quality can otherwise dominate scoring.

The suite itself needs tests. Validate fixture manifests, ensure setup scripts produce a clean environment, confirm intentionally failing tests fail before the agent edits them, and verify mutation cases are detected. This is ordinary test-harness engineering applied to an unusual system under test.

Review costs by tier. Static and component checks should carry most pull-request coverage. Expensive repository simulations should justify themselves through unique failure detection. Archive redundant cases, but preserve high-risk and historically important regressions even when they overlap.

The outcome is a living quality system: contracts explain intended behavior, fixtures encode real work, traces expose decisions, rubrics make judgment reviewable, and regressions preserve lessons. That is how to test agent skills without pretending a generative system is either fully deterministic or impossible to evaluate.

## Assemble a minimum viable harness in one sprint

You do not need a specialized evaluation platform to begin. A repository folder, a scenario manifest, a disposable workspace script, and a result file are enough for the first useful loop. The harness should accept a skill candidate and scenario ID, prepare the fixture, run the agent through your approved interface, capture tool events and final output, execute deterministic checks, and write a machine-readable scorecard.

Start with one capability slice, such as diagnosing ambiguous Playwright locators. Select four positive activation prompts, four negative or boundary prompts, three artifact scenarios, one tool-error scenario, and one adversarial fixture. That compact set exercises the whole chain without hiding design problems behind a large benchmark.

Define result fields before automating dashboards. Record scenario revision, skill content hash, model or agent identity, start time, duration, tool outcomes, hard-gate results, rubric scores, and reviewer notes. Store generated patches and command output as artifacts, subject to your retention and redaction policy. A score without the underlying evidence is difficult to audit.

Run the harness locally during skill authoring and in CI for reviewed changes. The pull-request job should fail on broken references, invalid fixtures, hard-gate violations, and statistically meaningful regression thresholds you declared in advance. Keep costlier repeated simulations in a scheduled workflow if they would make ordinary review too slow.

During the first sprint, ask a QA engineer who did not author the skill to review several outputs blind. Their disagreements reveal hidden assumptions in fixtures and rubrics. Revise the contract and oracle before expanding the suite. Once the small harness catches deliberately seeded defects, add historical failures and broader framework branches. This incremental build follows the same principle as product automation: prove that the test detects meaningful faults before celebrating coverage numbers.

## Frequently Asked Questions

### How many eval cases does a new agent skill need?

Start with coverage, not a magic count. A narrow QA skill may begin with 20 to 30 cases spanning activation positives, negatives, boundary prompts, core workflow branches, tool failure, and at least two adversarial situations. A skill that edits repositories or operates external systems needs more risk-focused cases and repeated runs. Add cases from real failures over time. Ten diverse, decisive fixtures are more useful than one hundred paraphrases that all exercise the same happy path.

### Should agent skill evals use an LLM as the judge?

Use a model grader for semantic properties that parsers and commands cannot evaluate, such as whether a root-cause explanation is supported by evidence. Pair it with deterministic checks for syntax, forbidden constructs, test execution, and required artifacts. Calibrate the grader against blinded human reviews and require cited output evidence for each score. A model judge should never be the only gate for secret handling, destructive actions, compilation, or other properties with objective verification.

### How do I keep stochastic eval results from becoming flaky?

Separate infrastructure instability from model variation, then handle each explicitly. Stabilize repositories, dependencies, mocks, and command timeouts. For genuinely variable model behavior, run important scenarios multiple times and gate on a declared pass-rate or score distribution rather than one run. Keep hard safety failures intolerant of repetition. Record the environment and candidate hash, inspect newly unstable cases, and avoid automatic retries that hide the first failure without explaining it.

### When is an agent skill ready for release?

A skill is ready when it satisfies its behavioral contract across representative and adversarial fixtures, introduces no hard-gate regressions, and performs acceptably against the currently released version. Medium- and high-risk skills also need verified tool recovery, artifact execution, and a staged rollout plan. Readiness is not a perfect score. It is documented evidence that known risks are controlled, target failures are fixed, quality thresholds hold by segment, and production feedback can be traced to an exact skill version.
`,
};
