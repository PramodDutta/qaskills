import type { SeoClusterArticle } from './seo-cluster-article';

export const llmAgentTestingPillar2026: SeoClusterArticle = {
  slug: 'testing-llm-applications-guide',
  clusterId: 'llm-agent-testing',
  post: {
    title: 'LLM Testing Complete Guide: Evals, Agents, RAG, and Quality Gates',
    description:
      'Build reliable LLM tests for prompts, agents, RAG, multi-turn workflows, security, monitoring, CI quality gates, cost, and eval-platform migration.',
    date: '2026-03-17',
    updated: '2026-07-14',
    category: 'Guide',
    image: '/blog/pillars/llm-agent-testing.png',
    imageAlt:
      'Layered LLM testing architecture connecting production datasets to deterministic, model, and human graders for agents, RAG, security, and CI quality gates',
    primaryKeyword: 'llm testing',
    keywords: [
      'llm testing',
      'llm evaluation',
      'llm evals',
      'AI agent testing',
      'agent evaluation',
      'RAG evaluation',
      'LLM as a judge',
      'prompt testing',
      'LLM eval framework',
      'AI quality gates',
    ],
    contentKind: 'pillar',
    relatedSlugs: [
      'openai-evals-platform-shutdown-migration-2026',
      'llm-eval-harness-production-guide-2026',
      'deterministic-graders-vs-llm-judge-human-review-2026',
      'ai-agent-eval-testing-guide',
    ],
    sources: [
      'https://developers.openai.com/api/docs/guides/evaluation-best-practices',
      'https://developers.openai.com/api/docs/deprecations',
      'https://developers.openai.com/cookbook/examples/evaluation/moving-from-openai-evals-to-promptfoo',
      'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents',
      'https://deepeval.com/docs/evaluation-introduction',
      'https://deepeval.com/docs/evaluation-test-cases',
      'https://deepeval.com/docs/metrics-tool-correctness',
      'https://www.promptfoo.dev/docs/configuration/expected-outputs/',
      'https://www.promptfoo.dev/docs/integrations/ci-cd/',
      'https://www.promptfoo.dev/docs/red-team/configuration/',
      'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/',
      'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_precision/',
      'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/',
      'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/',
      'https://genai.owasp.org/llmrisk/llm01-prompt-injection/',
      'https://genai.owasp.org/llmrisk/llm022025-sensitive-information-disclosure/',
      'https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/',
      'https://genai.owasp.org/llmrisk/llm062025-excessive-agency/',
    ],
    content: `
**LLM testing is the disciplined measurement of whether an AI application satisfies task, safety, reliability, latency, and cost requirements across representative inputs and repeated trials.** Build it as a layered system: version a production-matched dataset, run the real application or component, capture outputs and traces, apply deterministic checks first, use calibrated LLM judges where semantics require them, and retain human review for subjective or high-risk decisions. Test prompts, retrieval, generation, tools, state changes, and conversations separately before enforcing end-to-end quality gates. Because outputs vary, compare distributions and failure categories, not one attractive response.

This guide is current to **July 14, 2026**. OpenAI's [evaluation best-practices guide](https://developers.openai.com/api/docs/guides/evaluation-best-practices) recommends task-specific tests that reflect real traffic, continuous evaluation, comprehensive logging, and human calibration of automated scoring. The engineering practices remain sound, but the hosted OpenAI Evals product is being retired: OpenAI's [official deprecation schedule](https://developers.openai.com/api/docs/deprecations) says it was deprecated June 3, becomes read-only October 31, and is scheduled to shut down November 30, 2026. A migration section later in this guide separates that product change from the broader practice of eval-driven development.

Use the focused companion articles when a subsystem needs deeper implementation detail:

- [Migrate from the hosted OpenAI Evals platform](/blog/openai-evals-platform-shutdown-migration-2026)
- [Build a production LLM eval harness](/blog/llm-eval-harness-production-guide-2026)
- [Choose deterministic graders, LLM judges, and human review](/blog/deterministic-graders-vs-llm-judge-human-review-2026)
- [Test AI-agent outcomes, tools, trajectories, and state](/blog/ai-agent-eval-testing-guide)

For retrieval systems, continue with the [RAG evaluation metrics guide](/blog/rag-evaluation-metrics-complete-2026) and [RAG regression testing guide](/blog/rag-regression-testing-guide). Security teams should pair this article with the [prompt-injection testing guide](/blog/prompt-injection-testing-guide-2026), while release engineers can use the [LLM CI/CD quality-gates guide](/blog/llm-evaluation-ci-cd-quality-gates). Browse reusable instructions in the [QA skills directory](/skills), including the author-qualified [Playwright CLI skill](/skills/Pramod/playwright-cli) for browser evidence and end-to-end checks.

---

## LLM testing at a glance

An LLM application is not only a model. It is a versioned composition of instructions, context, retrieval, tools, code, policies, state, provider behavior, and user interaction. An eval that calls a model with a copied prompt while production uses different retrieval filters and tool permissions measures a different system. The central testing rule is therefore simple: **measure the smallest useful component in isolation, but run release decisions against a production-matched assembly.**

| Evaluation layer | Primary question | Typical evidence | Best first grader |
| --- | --- | --- | --- |
| Contract and deterministic logic | Is the output structurally and operationally valid? | JSON, schema, regex, type, policy rule, executable test | Code assertion |
| Model or prompt behavior | Is the answer correct, relevant, complete, and appropriately written? | Response plus reference or rubric | Exact/reference check where possible; calibrated model grader otherwise |
| Retrieval and RAG | Did the system find the right evidence and use it faithfully? | Ranked document IDs, chunks, answer, citations | Retrieval metrics plus claim-to-source checks |
| Agent workflow | Did the agent achieve the goal without forbidden actions? | Outcome, state diff, tool calls, trace, side effects | Outcome and state assertions |
| Multi-turn interaction | Did behavior remain coherent, safe, and stateful over the conversation? | Full transcript, user state, terminal outcome | Per-turn rules plus conversation rubric |
| Security and abuse | Can untrusted content redirect, disclose, escalate, or execute? | Adversarial inputs, tool authorization logs, sinks | Deny/allow invariants and sandbox checks |
| Production operation | Is quality stable for real traffic within service budgets? | Sampled traces, feedback, incidents, latency, cost | Online monitors plus delayed labels |

No single score can faithfully compress all seven layers. A response may be helpful but ungrounded, grounded but irrelevant, correct but too slow, or successful only because an overprivileged tool bypassed policy. Keep metrics disaggregated long enough to diagnose those differences. Create a roll-up only for a defined decision, such as whether a candidate prompt may proceed to canary, and retain the underlying dimensions beside it.

## Version baseline and limitations

This is an application-testing guide, not a model leaderboard. It does not claim that one provider, judge, metric, or framework is universally best, and it reports no invented benchmark. Any threshold shown in code is explicitly an **illustrative policy value**, not an industry standard. Derive production thresholds from user harm, business tolerance, a labeled baseline, measurement error, and the cost of false acceptance versus false rejection.

The implementation examples reflect public documentation available on July 14, 2026:

- OpenAI Evals best practices and the June 2026 deprecation notice are treated as separate sources: one describes evaluation design, and the other controls migration timing.
- Anthropic's [agent-evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) supplies the task, trial, grader, transcript, outcome, harness, capability/regression, and repeated-trial concepts used here.
- DeepEval examples use its documented \`LLMTestCase\`, metric, \`assert_test()\`, and \`deepeval test run\` workflow. Confirm class names against the version in your lockfile before adopting snippets.
- Ragas examples use the newer collections-oriented metric API shown in its current docs. Ragas marks older metric patterns as legacy and documents a future removal path, so do not begin a new harness from an old tutorial.
- Promptfoo examples use declarative tests and assertions documented in July 2026. Pin a reviewed package version in CI rather than copying \`@latest\` into a controlled release pipeline.
- OWASP references use the 2025 LLM risk pages that remain current for prompt injection, disclosure, output handling, and excessive agency. Threats evolve faster than a regression suite; update adversarial cases after incidents and dependency changes.

Model sampling, provider infrastructure, search indexes, external websites, and judge models can all change. A passing eval is evidence under a recorded configuration, not a timeless guarantee. Store the tested model identifier, prompt hash, retrieval snapshot, tool schema, grader version, dataset version, runtime configuration, and timestamp with every result.

## Why conventional tests are necessary but insufficient

Traditional tests still own deterministic contracts. Use them aggressively for serialization, authorization, routing, schema validity, database changes, citation URLs, tool arguments, and state invariants. LLM testing does not replace unit, integration, contract, end-to-end, performance, or security testing. It adds measurement where valid behavior has semantic latitude or stochastic variation.

Three properties create the gap:

1. **Many outputs can be acceptable.** Exact text matching rejects legitimate paraphrases, ordering differences, or alternative plans.
2. **The same configuration can produce different trials.** A single pass says little about reliability when another sample may fail.
3. **The application changes the task around the model.** Retrieval, tool responses, conversation history, and policy code determine what evidence the model sees and what actions it may take.

Do not respond by making every assertion semantic. That creates an expensive, opaque suite whose grader can fail independently of the product. Instead, decompose the requirement. If a support answer must be valid JSON, mention a cancellation deadline from an approved policy, avoid unsupported fees, and sound professional, grade JSON and approved numbers in code; check claim support against the policy; reserve a calibrated model grader for tone. Each requirement should be evaluated by the cheapest reliable mechanism that actually observes it.

OpenAI explicitly warns against generic, production-mismatched, intuition-only evaluation and recommends combining metrics with human judgment in its [best-practices guide](https://developers.openai.com/api/docs/guides/evaluation-best-practices). That is why “the demo looked good” cannot be a release gate. It neither defines the traffic distribution nor reveals which requirement failed.

## Build the evaluation architecture before choosing a framework

A durable eval system has six separable responsibilities:

1. **Dataset registry:** immutable task rows, labels, strata, provenance, sensitivity, and split membership.
2. **System adapter:** invokes the exact component or application configuration under test.
3. **Trace collector:** records model calls, retrieval, tools, state transitions, latency, token usage, and errors.
4. **Grader layer:** applies deterministic, model-based, and human judgments without hiding individual results.
5. **Experiment store:** links candidate and baseline results to code, prompts, models, data, and grader versions.
6. **Decision layer:** turns evidence into a merge block, warning, canary approval, rollback, or investigation.

Keep the system adapter independent from graders. Otherwise, a framework migration forces application rewrites and a model provider change can silently alter both the system and its judge. The adapter should emit a neutral record that multiple tools can consume.

\`\`\`typescript
export interface EvalRecord {
  taskId: string;
  datasetVersion: string;
  input: unknown;
  reference?: unknown;
  output: unknown;
  trace: {
    modelCalls: Array<{ model: string; inputTokens: number; outputTokens: number }>;
    retrieved: Array<{ id: string; rank: number; score?: number }>;
    tools: Array<{ name: string; arguments: unknown; result: unknown }>;
    stateBefore?: unknown;
    stateAfter?: unknown;
  };
  timingMs: { total: number; firstToken?: number };
  costUsd?: number;
  error?: { kind: string; message: string };
  config: {
    appCommit: string;
    promptHash: string;
    model: string;
    graderVersion: string;
  };
}
\`\`\`

This is an example interchange contract, not a library API. In a real system, redact secrets before persistence and store large documents by controlled reference rather than duplicating raw content into every record. Make missing evidence explicit. A trace with no retrieved-document IDs cannot support a retrieval regression diagnosis, and a tool call with redacted arguments may be unusable for authorization grading unless the redaction preserves the relevant fields.

### Map every requirement to an observable

Start with product decisions, not metric names. “Helpful” is too broad. Translate it into observable claims such as:

- The response answers the requested operation rather than an adjacent one.
- Every stated policy fact is supported by the active policy revision.
- The workflow performs no write before explicit confirmation.
- A denied user cannot access another tenant's records through any tool path.
- The final database state contains exactly one refund and one audit entry.
- The response arrives within the product's measured latency budget.
- The complete task stays within the approved cost envelope.

For each observable, document the failure impact, evaluation scope, grader, required evidence, aggregation rule, and action on failure. This prevents teams from adding a “relevance score” because a framework exposes one while leaving a high-risk state mutation untested.

### Separate component diagnosis from release confidence

Component evals answer **where** quality changed. End-to-end evals answer **whether users receive an acceptable system outcome**. Run both, but do not confuse them.

| Scope | Example | Advantage | Blind spot |
| --- | --- | --- | --- |
| Prompt-only | Fixed messages sent directly to one model | Fast attribution of prompt/model change | Omits retrieval, policies, tools, and UI |
| Retriever-only | Query against a frozen corpus and index | Precise recall and ranking diagnosis | Does not show whether the generator uses context |
| Generator-only | Fixed retrieved chunks passed to the answer model | Isolates grounding and response behavior | Hides real retrieval failures |
| Agent component | One planner or one tool selector with controlled inputs | Locates orchestration defects | May reward local behavior that harms final outcome |
| End-to-end | Real request through production-like services | Best release evidence | Slower, noisier, and harder to diagnose |

A practical run starts with deterministic unit and contract tests, then focused component evals, then a smaller end-to-end regression suite. Expensive capability, adversarial, and repeated-trial suites can run on schedule or before high-impact releases. This is a portfolio, not a pyramid that forces all work into one shape.

## Define a quality contract

An eval objective should identify a user, task, operating context, acceptable behavior, unacceptable behavior, and decision. “Evaluate the chatbot” is not actionable. “Block release if the candidate increases unsupported policy claims for authenticated billing questions while holding task completion and refusal behavior within agreed bounds” is testable.

Use a contract with five dimensions:

1. **Task quality:** correctness, completeness, relevance, instruction following, and outcome.
2. **Grounding:** support from approved sources, citation alignment, and calibrated abstention when evidence is absent.
3. **Safety and security:** prohibited content, privacy, authorization, prompt injection, side effects, and output validation.
4. **Reliability:** repeated-trial success, error rate, recovery, and consistency across traffic strata.
5. **Operational fitness:** latency, token usage, external calls, infrastructure load, and cost.

Do not average a critical authorization failure into a high helpfulness score. Mark non-negotiable invariants as hard gates and aggregate only substitutable qualities. A weighted score can make sense for relevance, completeness, and style if product owners accept trade-offs among them. It does not make sense when one component is “never disclose another user's data.”

### Write an eval card

Treat each suite as a maintained product artifact. Its short eval card should answer:

- What user behavior and decision does this suite represent?
- Which production period and traffic segments informed the dataset?
- What is intentionally out of scope?
- Which rows are regression, capability, adversarial, or monitoring cases?
- Who may view raw inputs, outputs, and traces?
- Which graders are deterministic, model-based, or human?
- How were model graders calibrated, and when is recalibration due?
- What thresholds or deltas cause block, warn, review, or canary?
- Which known blind spots could produce false confidence?
- Who owns failed-case triage and dataset maintenance?

The card prevents a dashboard from outliving the assumptions that made its score meaningful.

## Build production-matched datasets

The dataset determines what “quality” means in practice. A hundred clean FAQ questions cannot validate a product whose traffic contains multilingual fragments, pasted tables, ambiguous follow-ups, stale documents, tool failures, and adversarial instructions. OpenAI recommends reflecting real-world distributions, mining logs, and including typical, edge, and adversarial cases in its [eval design guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices). Anthropic likewise recommends turning manual checks, bug reports, and support failures into tasks in its [agent eval roadmap](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).

### Combine complementary data sources

| Source | What it contributes | Main risk | Control |
| --- | --- | --- | --- |
| Production samples | Real language, frequency, context, and failure patterns | Privacy, consent, dominant cases crowding out rare harms | Redaction, access control, stratified sampling |
| Historical incidents and support cases | Known high-impact failures | Overfitting to yesterday's defects | Preserve as regression set and add adjacent variants |
| Domain-expert authored tasks | Precise requirements and rare business rules | Author assumptions may not match users | Review against logs and independent experts |
| Synthetic expansion | Variations, long tails, multilingual and adversarial coverage | Generator artifacts and unrealistic phrasing | Human sampling and distribution checks |
| Public benchmarks | External comparability or capability probes | Task mismatch and contamination | Keep separate from product release score |
| Red-team cases | Abuse paths and boundary attacks | Rapidly becomes stale; may expose exploit details | Controlled storage and recurring refresh |

Production matching does not mean copying raw traffic in its observed proportions and stopping. Very rare failures can carry disproportionate harm. Maintain at least two views: a **prevalence-weighted set** for expected user experience and a **risk-weighted set** that deliberately oversamples severe cases. Report them separately so an easy majority cannot conceal a dangerous minority.

### Define the evaluation unit

A row must contain enough state to replay the requirement. For a single-turn classifier, input and expected label may be sufficient. For RAG, include the corpus or snapshot ID, reference facts, acceptable source IDs, and expected abstention behavior. For an agent, include initial environment state, available tools, identities, permissions, terminal conditions, and post-run checks. For multi-turn chat, include persona, hidden user goal, scripted facts, simulator policy, and conversation termination.

\`\`\`json
{
  "task_id": "refund-confirmation-017",
  "suite": "support-agent-regression",
  "split": "locked_regression",
  "risk": "high",
  "input": {
    "user_message": "Refund order A-104 to my original payment method",
    "user_id": "user-17",
    "tenant_id": "tenant-blue"
  },
  "initial_state_fixture": "orders/refundable-a104-v3.json",
  "reference": {
    "required_confirmation": true,
    "allowed_tools": ["get_order", "request_confirmation", "create_refund"],
    "forbidden_tools": ["issue_store_credit"],
    "expected_state": "fixtures/refunded-a104-v2.json"
  },
  "tags": ["write-action", "authorization", "confirmation", "refund"],
  "provenance": {
    "source": "sanitized-production-incident",
    "policy_revision": "refund-policy-2026-06-18"
  }
}
\`\`\`

The IDs and policy date above are fictional test fixtures. They demonstrate structure, not a real company result or benchmark. Keep expected behavior outside the user-visible prompt so the system cannot simply echo the grader key.

### Split datasets by decision

Use distinct partitions:

- **Development set:** visible to builders for prompt and workflow iteration.
- **Locked regression set:** known supported behavior; changes require review.
- **Capability set:** difficult but valid tasks that expose room for improvement.
- **Calibration set:** independently human-labeled examples for grader selection and tuning.
- **Adversarial set:** security, abuse, malformed, and policy-boundary cases with restricted access where needed.
- **Online shadow set:** recent, sanitized production samples evaluated outside the user path.

Do not repeatedly optimize against the same locked set and still call it held out. Exposure turns it into development data. Rotate or replenish hidden tasks, record who accessed labels, and monitor suspiciously large improvements concentrated in familiar cases.

### Preserve labels and provenance

A reference answer is not always a gold string. Store acceptable facts, forbidden claims, source IDs, executable assertions, rubric anchors, and reviewer notes. Version references when policy changes instead of editing old rows in place. Otherwise, historical scores become impossible to interpret: the system did not improve merely because the answer key was rewritten.

For every row, retain provenance, collection window, consent basis where applicable, redaction method, policy or corpus revision, annotator role, and ambiguity status. Exclude unresolved examples from hard gates. Ambiguous cases are valuable for product discovery, but they add label noise when forced into binary release decisions.

### Prevent leakage and correlated trials

Store eval labels away from model-visible context. Reset databases, files, caches, and tool state for each trial. Anthropic stresses clean, isolated environments because shared state can create correlated failures or artificial advantages in its [agent harness guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents). If one task leaves a record another task reads, those trials are not independent.

Isolation also means controlling external dependencies. Freeze a search corpus for regression tests; use a recorded clock; seed fixture IDs; replace destructive APIs with realistic sandboxes; and record dependency versions. Keep a separate live-web capability suite if current information is part of the product. Do not mix live and frozen evidence into one score without labeling the difference.

## Use deterministic, model, and human graders together

Anthropic groups agent graders into code-based, model-based, and human approaches and recommends deterministic checks where possible, model grading where necessary, and human review for validation in its [grader guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents). The categories are complementary rather than maturity stages. A sophisticated system should still use a plain equality assertion when equality is the requirement.

| Grader | Best for | Strength | Primary failure mode |
| --- | --- | --- | --- |
| Deterministic code | Schemas, exact facts, IDs, permissions, state, executable behavior, latency and cost | Fast, cheap, reproducible, debuggable | Brittle if used for genuinely open-ended semantics |
| Model grader | Relevance, grounded synthesis, tone, completeness, pairwise preference, nuanced policy | Scales semantic judgment across free-form output | Bias, drift, nondeterminism, prompt sensitivity, cost |
| Human reviewer | Ambiguous, subjective, novel, high-risk, or calibration decisions | Closest to accountable expert judgment | Slow, expensive, disagreement, fatigue |

### Deterministic graders should own hard facts

Examples include:

- JSON Schema and enum validation.
- Exact classification labels and normalized entity IDs.
- Regex or parser checks for required sections.
- Citation URL existence and source-ID membership.
- Database, filesystem, queue, and audit-log state.
- Tool allowlists, parameter bounds, confirmation tokens, and tenant identity.
- Unit tests, type checks, static analysis, and sandbox exit status.
- Token, call-count, latency, and cost budgets.
- PII detectors and secret canaries, while recognizing that detectors themselves need validation.

A deterministic grader can still be wrong. Tests may encode an accidental implementation detail or accept a loophole. Execute a known-good reference solution and known-bad counterexamples against every new grader. Review whether the test proves the requirement rather than merely observing a correlated field.

\`\`\`typescript
type SupportOutput = {
  action: 'answer' | 'clarify' | 'escalate';
  citations: string[];
  text: string;
};

export function gradeSupportContract(raw: string, approvedSourceIds: Set<string>) {
  const parsed = JSON.parse(raw) as SupportOutput;

  if (!['answer', 'clarify', 'escalate'].includes(parsed.action)) {
    throw new Error('invalid action');
  }
  if (!Array.isArray(parsed.citations)) {
    throw new Error('citations must be an array');
  }
  if (parsed.citations.some((id) => !approvedSourceIds.has(id))) {
    throw new Error('response cites an unapproved source');
  }
  if (parsed.action === 'answer' && parsed.citations.length === 0) {
    throw new Error('an answer requires supporting citations');
  }

  return { passed: true, parsed };
}
\`\`\`

That function validates a contract, not factual entailment. A cited document can still fail to support the answer. Add a claim-to-source grader rather than pretending source membership proves grounding.

### Use model graders for a narrow semantic question

An effective judge receives the original task, the candidate response, only the context needed to judge, a single dimension or compact rubric, anchored labels, counterexamples, and a structured output schema. Give it an explicit “insufficient evidence” outcome. Asking one judge for an overall 1-10 “quality” score produces a number with weak diagnostic value.

Prefer these formulations:

- **Classification:** Does each claim have support: supported, contradicted, or unknown?
- **Pairwise comparison:** Which response better satisfies a fixed rubric, or are they tied?
- **Criteria scoring:** Does the response satisfy each independently named criterion?
- **Reference comparison:** Does the output preserve the required facts without introducing conflicts?

OpenAI notes that models tend to be more dependable at discriminating among options than producing unconstrained judgments in its [eval process guide](https://developers.openai.com/api/docs/guides/evaluation-best-practices). Pairwise or categorical tasks are therefore often easier to calibrate than an open-ended critique. They still require position randomization, tie handling, and human labels.

### Calibrate every LLM judge

Judge calibration is a test project of its own:

1. Define the exact decision and rubric with domain experts.
2. Create a calibration set covering clear passes, clear failures, boundary cases, adversarial phrasing, and missing evidence.
3. Collect independent human labels before showing model scores.
4. Measure agreement by class and severity, not only overall accuracy.
5. Inspect false accepts and false rejects; weight them by product harm.
6. Revise rubric, context, anchors, and output schema without tuning on the final validation subset.
7. Freeze judge model, prompt, decoding configuration, and version.
8. Recheck agreement after model, rubric, domain, language, or traffic changes.
9. Route low-confidence, novel, and high-risk cases to humans.

Useful reports include a confusion matrix, per-class precision and recall, raw agreement, an agreement coefficient suited to the label design, score correlation for ordinal rubrics, and repeated-judgment stability. No universal agreement threshold makes a judge safe. A privacy detector used as a hard gate requires a different false-negative tolerance than a style grader used for a warning.

The [LLM judge calibration guide](/blog/llm-judge-calibration-guide-2026) expands this workflow. Anthropic specifically recommends close human calibration and isolated rubric dimensions rather than one judge scoring everything in its [agent grader guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).

### Control known judge biases

At minimum, test and mitigate:

- **Position bias:** swap candidate A and B; require order-invariant decisions or aggregate both orders.
- **Verbosity bias:** include concise high-quality and long low-quality counterexamples.
- **Self-preference:** do not assume a model fairly grades outputs from its own family; validate on labeled cross-provider examples.
- **Reference leakage:** keep hidden labels and grader instructions out of the candidate context.
- **Style-content conflation:** grade factual support separately from fluency.
- **Authority mimicry:** do not reward citations merely because they look formal; provide source text or verified IDs.
- **Prompt injection against the judge:** delimit candidate content as untrusted data and prevent it from issuing grader instructions.
- **Judge drift:** pin versions where supported and recalibrate after any unavoidable change.

Multi-judge voting can reduce some random error, but correlated judges can confidently share the same bias. Consensus is not a substitute for human-grounded validation.

### Keep humans in accountable decisions

Human review is essential for initial rubrics, disputed labels, high-severity false accepts, new failure modes, model-judge calibration, and subjective product quality. Improve reviewer reliability with written criteria, anchor examples, blinded candidate order, independent labels, adjudication, and a visible “cannot determine” option.

Measure reviewer disagreement. It may reveal an unclear task rather than poor reviewers. If two qualified experts cannot independently reach a stable verdict from the supplied evidence, the case is not ready for a hard automated gate. Clarify the product requirement or collect better evidence first.

## Separate capability evals from regression evals

Capability and regression suites serve opposite optimization states. Anthropic defines capability evals as difficult tasks that expose what an agent can learn to do, while regression evals protect behavior it should already perform reliably in its [capability-versus-regression guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).

**Capability evals** should contain valid, challenging tasks with room to improve. A low starting score may be appropriate if reference solutions prove the tasks and graders are sound. Use these suites to compare architecture ideas, identify bottlenecks, and detect saturation. Do not block every commit because an experimental task remains unsolved.

**Regression evals** represent supported product behavior, fixed incidents, and non-negotiable boundaries. Their expected success should be high enough that a failure triggers triage. Run a focused subset on pull requests and the broader set before release or on schedule.

Graduate a capability case into regression once the team commits to supporting it. Preserve its history, tighten its expected reliability, and assign an owner. Conversely, retire or rewrite obsolete regression cases when the product contract changes; do not silently delete a red case to improve the chart.

| Property | Capability suite | Regression suite |
| --- | --- | --- |
| Question | What can the system do, and where is headroom? | Does supported behavior still work? |
| Expected difficulty | Intentionally challenging | Mostly solved and stable |
| Primary action | Experiment and investigate | Block, warn, or rollback based on risk |
| Update trigger | Saturation, new product bets, stronger models | Incidents, accepted features, policy changes |
| Recommended cadence | Scheduled, model evaluation, major design change | Pull request subset, release, continuous schedule |

## Measure non-determinism instead of hiding it

Temperature zero does not turn a distributed generative system into a pure function. Provider changes, model snapshots, routing, numerical behavior, tool timing, retrieval ties, external content, and conversation branching can still vary. Record all controllable parameters, but evaluate reliability through repeated independent trials where variance matters.

For a task with independent per-trial success probability \`p\`:

- **pass@k** asks whether at least one of \`k\` attempts succeeds. Under the simple independent-probability model, that is \`1 - (1 - p)^k\`.
- **pass^k** asks whether every one of \`k\` attempts succeeds. Under the same model, that is \`p^k\`.

Anthropic explains the product distinction in its [non-determinism guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents): pass@k fits workflows where multiple attempts are allowed and one valid result is useful; pass^k exposes consistency when every user expects success. At \`k = 1\`, both reduce to first-attempt success.

Do not inflate a customer-facing reliability claim with pass@10 if the product gives each customer one attempt. Conversely, do not reject a design tool that intentionally generates five candidates because four are unsuitable when its contract is to provide at least one usable option. The metric must match the delivery policy.

### Design repeated trials correctly

- Reset all mutable state between trials.
- Decide whether retrieval and tools should be frozen or live, then label that choice.
- Keep retries caused by infrastructure errors separate from model attempts.
- Record trial-level results instead of only an aggregate.
- Report uncertainty or raw counts, especially for small samples.
- Stratify by task because easy-task volume can hide a severe hard-task regression.
- Compare candidate and baseline on the same task set and, where feasible, matched conditions.
- Inspect discordant cases rather than treating a small score movement as self-explanatory.

A repeated run can reveal three different problems: unstable model behavior, unstable infrastructure, or unstable grading. Label grader errors and provider failures separately from genuine task failures. Retrying a malformed judge response until it passes silently biases results.

### Avoid false precision

An observed pass rate is an estimate over sampled tasks and trials. Its precision depends on sample size, task mix, dependence, and label quality. Do not publish five decimal places from a small suite. For release decisions, pair the aggregate with counts, traffic strata, severity, confidence intervals or an appropriate paired test, and case-level diffs.

The suite itself is not the production population. A statistically clear improvement on an unrepresentative dataset can still hurt users. Distribution validity and measurement validity come before significance testing.

## Test single-turn prompts and structured outputs

The smallest useful LLM eval often exercises one request and one response. It should still invoke the production prompt builder rather than a pasted prompt. Prompt assembly bugs commonly occur in role ordering, missing variables, locale selection, truncation, policy insertion, few-shot retrieval, and default parameters. Capture the fully rendered messages as an artifact, but redact secrets and never expose hidden grader labels to the model.

For structured tasks, establish the contract in layers:

1. The provider returned a response rather than a timeout or content-length failure.
2. The output parses under the expected transport format.
3. The value conforms to the JSON Schema or typed contract.
4. Enumerations, numeric ranges, IDs, and cross-field invariants are valid.
5. The content is semantically correct for the request.
6. The downstream application handles the parsed value safely.

Structured generation narrows syntax; it does not prove truth. A perfectly valid object can contain the wrong customer ID or an invented policy. Conversely, do not pay for an LLM judge to discover that JSON does not parse. Put deterministic validation before semantic grading so failures are cheaper and clearer.

### Create contrastive cases

For every behavior that should occur, add a nearby case where it should not. If a routing prompt should call search for current weather, include a timeless knowledge question that should not call search. If the assistant should refuse account changes without authentication, include an authenticated case that should proceed. Anthropic recommends this balanced design because one-sided tests can optimize toward over-triggering in its [agent eval roadmap](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).

Use minimal pairs to expose causality: two cases differ by tenant, date, permission, negation, locale, or one policy fact. They are more diagnostic than a large set of unrelated prompts because a candidate should change only the intended decision.

### Treat abstention as a first-class outcome

Some inputs lack sufficient evidence, are ambiguous, or require a human. Add reference behavior for \`answer\`, \`clarify\`, \`abstain\`, and \`escalate\`; otherwise, a system can improve answer rate by confidently inventing details. Grade both sides: unnecessary abstention harms usefulness, while unsupported answers harm trust and may create legal or financial risk.

## Evaluate multi-turn conversations

A multi-turn eval is a stateful interaction, not a collection of independent single-turn rows. Test whether the system remembers valid facts, forgets or isolates data when required, handles corrections, maintains identity and permissions, recovers from tool errors, and terminates appropriately. DeepEval, for example, documents a \`ConversationalTestCase\` and conversation metrics; its [turn-relevancy metric](https://deepeval.com/docs/metrics-turn-relevancy) evaluates assistant turns against a sliding window rather than treating each reply in isolation.

Define four actors and artifacts:

- **System under test:** the assistant, tools, retrieval, memory, and policy code.
- **User simulator or script:** a bounded persona with a hidden goal and facts it may reveal.
- **Environment:** accounts, records, clocks, permissions, and tool behavior.
- **Conversation grader:** turn checks, transcript constraints, final outcome, and state checks.

A model-based user simulator increases coverage but also adds another stochastic component. Pin its configuration, prevent it from seeing grader keys it should not know, and validate that it follows the persona. For high-risk regression cases, use scripted turns or a hybrid state machine: deterministic transitions for required facts, with a model only paraphrasing allowed utterances.

### Grade turns and terminal behavior separately

Per-turn checks catch immediate violations such as leaking a secret, calling a write tool before confirmation, repeating a resolved question, or losing the requested language. Conversation-level checks capture whether the goal was achieved, the interaction stayed coherent, and the user state ended correctly. A good final sentence cannot erase an unauthorized action in turn three.

Track at least:

- Goal completion and final state.
- Required facts gathered before action.
- Contradictions across assistant turns.
- Tool calls and confirmation order.
- Escalation or termination condition.
- Number of turns, loops, repeated questions, tokens, latency, and cost.
- Memory written, retrieved, expired, and isolated by user or tenant.
- Safety behavior after adversarial or emotionally charged follow-ups.

Test interruption and resumption. Rehydrate the conversation from the same persisted representation production uses, then verify that the assistant neither loses necessary state nor imports another session's context.

## Test AI agents by outcome, trajectory, tools, and state

Agent testing extends LLM testing because the model can act repeatedly, observe results, and mutate an environment. Anthropic distinguishes a transcript or trajectory from the outcome: the transcript records the trial's calls and intermediate results, while the outcome is the final environment state in its [agent-eval definitions](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents). That distinction prevents “I completed the refund” from passing when no refund exists.

### Grade the outcome first

Prefer direct evidence of task completion:

- A database row exists with the correct owner, amount, and idempotency key.
- A code patch passes required tests without breaking protected tests.
- A calendar event has the requested participants and time zone.
- A generated report contains claims supported by the captured sources.
- A browser task reaches the expected server-side state, not merely a confirmation page.

Outcome graders leave room for valid alternative plans. Anthropic cautions that rigidly requiring one exact tool sequence can reject creative but correct solutions, and recommends grading what the agent produced unless the path itself matters in its [grader design advice](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).

### Grade trajectory when the path is part of the requirement

The path matters for authorization, safety, cost, compliance, and user experience. Check trajectory invariants such as:

- A read occurs before an update that depends on current state.
- A user confirmation token precedes a destructive action.
- No forbidden tool is called, even if the final state looks correct.
- Tool arguments stay within tenant and resource boundaries.
- A retry follows the documented idempotency and backoff policy.
- The agent stops after success instead of continuing to mutate state.
- The number of searches, model turns, or privileged calls stays within a budget.

Do not require harmless implementation trivia. “Must call search before calculator” is brittle when the task can be solved safely either way. “Must verify ownership before transfer” is a policy invariant and should be exact.

| Agent evidence | What it proves | Example grader | Common mistake |
| --- | --- | --- | --- |
| Final response | What the agent told the user | Schema, rubric, claim support | Treating a claim of success as actual success |
| Outcome artifact | What was produced | Unit tests, document checks, file hash | Ignoring hidden collateral changes |
| Environment state | What changed | Database diff, API query, audit event | Checking only the UI |
| Tool calls | What capabilities were used | Allowlist, arguments, order invariant | Requiring one arbitrary valid path |
| Full trajectory | How the agent adapted | Loop, recovery, policy and efficiency checks | Scoring hidden reasoning instead of observable conduct |
| Side effects | What else was affected | Queue, email, billing, permissions, network sinks | Resetting fixtures before inspecting effects |

### Build a stateful agent test

\`\`\`typescript
import { expect, test } from 'vitest';
import { createSandbox, runSupportAgent } from '../support-agent';

test('requires confirmation and creates one authorized refund', async () => {
  const sandbox = await createSandbox('refundable-order-a104');

  const first = await runSupportAgent(sandbox, {
    userId: 'user-17',
    message: 'Refund order A-104 to the original payment method.',
  });

  expect(first.toolCalls.map((call) => call.name)).not.toContain('create_refund');
  expect(first.output.action).toBe('request_confirmation');

  const second = await runSupportAgent(sandbox, {
    userId: 'user-17',
    message: 'I confirm the refund.',
    conversationId: first.conversationId,
  });

  expect(second.toolCalls.filter((call) => call.name === 'create_refund')).toHaveLength(1);
  expect(await sandbox.refunds.forOrder('A-104')).toMatchObject({
    userId: 'user-17',
    status: 'created',
  });
  expect(await sandbox.audit.count({ event: 'refund_created' })).toBe(1);
});
\`\`\`

The identifiers are fixtures. This test deliberately checks both absence of an early side effect and presence of the authorized final state. In production, also assert tenant scope, amount, payment destination, idempotency, and all prohibited side effects relevant to the risk model.

### Inject tool and environment faults

Happy-path tools hide agent weaknesses. Simulate timeouts, partial results, stale reads, rate limits, validation errors, permission denials, duplicate delivery, and ambiguous responses. Verify bounded retries, idempotency, fallback behavior, transparent user communication, and eventual stop. Distinguish a product failure from a deliberately injected dependency failure in reports.

Run destructive tools in isolated sandboxes with least privilege. Reset state after evidence capture, not before. Use unique trial IDs so asynchronous side effects can be attributed and cleaned safely.

### Test planners and multi-agent handoffs

For planner-executor systems, grade the plan's required constraints, the executor's actual actions, and the final state independently. For multi-agent systems, capture sender, recipient, message, delegated authority, state ownership, and handoff reason. Add cases for dropped context, duplicated work, conflicting updates, circular delegation, malicious peer messages, and one agent attempting to extend another's permissions.

The model and the scaffold are jointly under test. A better model can perform poorly in a restrictive or faulty harness; an overpermissive harness can inflate apparent task success. Record both versions and avoid attributing every result change to the model.

## Decompose RAG evaluation

RAG quality is a chain of evidence transformations. Test ingestion, indexing, retrieval, ranking, context assembly, generation, citation, and freshness separately. An end-to-end answer score cannot tell whether the relevant document was absent, retrieved too low, truncated, ignored, or contradicted by the generator.

| RAG stage | Core question | Useful evidence | Representative measures |
| --- | --- | --- | --- |
| Ingestion | Was source content parsed, chunked, labeled, and authorized correctly? | Source-to-chunk mapping, metadata, ACLs | Coverage, parser errors, metadata invariants |
| Retrieval | Were all needed items found? | Query, ranked source/chunk IDs, references | Recall@k, context recall |
| Ranking | Did useful evidence appear before noise? | Relevance labels by rank | Precision@k, MRR, nDCG, context precision |
| Context assembly | Was the right evidence preserved within limits? | Selected chunks, order, token count | Required-fact coverage, duplication, truncation |
| Generation | Did the answer address the request using supplied evidence? | Answer and retrieved context | Faithfulness, relevance, completeness, abstention |
| Citation | Does each citation support its adjacent claim? | Claim-to-source spans and links | Citation precision, coverage, source validity |
| Freshness and deletion | Does the corpus reflect current authorized sources? | Version, tombstones, timestamps | Stale-hit and deleted-hit checks |

Ragas lists context precision, context recall, response relevancy, faithfulness, and related metrics for RAG in its [official metric catalog](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/). These dimensions are not interchangeable. Its [context precision documentation](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_precision/) focuses on ranking useful chunks toward the top; [context recall](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/) focuses on whether required information was retrieved; and [faithfulness](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/) measures claims supported by retrieved context.

### Test retrieval with stable labels

When possible, label relevant document or chunk IDs and compute deterministic information-retrieval metrics. ID-based relevance avoids asking an LLM to rediscover ground truth on every run. Use semantic grading when relevance genuinely depends on interpretation, then calibrate those labels.

Evaluate multiple \`k\` values without automatically increasing production top-k. Higher recall can add distracting or adversarial context, increase latency and cost, and lower ranking precision. Report performance by query type, source, language, document age, and metadata filter. Include queries that should return no evidence.

Test filters and access control before semantic quality. A highly relevant chunk from the wrong tenant is a security failure, not a retrieval success. Add deleted-document tombstones, revised policies, duplicate versions, malformed metadata, and conflicting documents to the corpus fixture.

### Test generation against the retrieved context

Faithfulness asks whether response claims are supported by provided evidence, not whether they are universally true. That distinction is operationally useful: a true fact absent from the approved context may still violate a grounded-answer contract. Separately test factual correctness against authoritative references when the application allows outside knowledge.

\`\`\`python
from openai import AsyncOpenAI
from ragas.llms import llm_factory
from ragas.metrics.collections import Faithfulness


async def score_grounding(user_input: str, response: str, retrieved_contexts: list[str]):
    client = AsyncOpenAI()
    judge = llm_factory("gpt-4o-mini", client=client)
    metric = Faithfulness(llm=judge)

    result = await metric.ascore(
        user_input=user_input,
        response=response,
        retrieved_contexts=retrieved_contexts,
    )
    return result.value
\`\`\`

This follows the collections-style pattern in the current [Ragas faithfulness docs](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/). The model identifier is an example supported by that documentation, not a recommendation. Pin and calibrate the judge used by your project, handle evaluation errors explicitly, and never equate this one score with total RAG quality.

### Verify citations at claim level

Parse the answer into claims and citation spans. Confirm that each cited source exists, was authorized and retrieved in the trial, and entails the adjacent claim. Then measure coverage: important factual claims without citations should not disappear from the denominator. A citation at the end of a paragraph should not receive credit for every sentence automatically.

Also test link resolution, fragment anchors, source version, and quote fidelity. For dynamic web sources, preserve an approved snapshot or content hash so a historical result remains auditable.

### Exercise no-answer and conflict behavior

Create cases where evidence is absent, insufficient, stale, or contradictory. Grade whether the application asks for clarification, states uncertainty, cites both authoritative positions, or abstains according to policy. A RAG system evaluated only on answerable questions learns nothing about its hallucination boundary.

## Choose frameworks by responsibility

DeepEval, Promptfoo, and Ragas overlap, but they have different ergonomic centers. Do not select one from a generic feature-count table. Prototype the hardest requirement: stateful agent setup, custom deterministic grading, provider matrices, RAG diagnostics, judge customization, result export, or CI integration.

| Tool | Natural fit | Documented primitives used here | Adoption question |
| --- | --- | --- | --- |
| DeepEval | Python tests, test cases, traces, broad metric catalog | \`LLMTestCase\`, \`assert_test()\`, \`deepeval test run\`, agent/RAG/conversation metrics | Does its test-case model capture your production trace and state evidence? |
| Promptfoo | Declarative prompt/provider matrices, assertions, CI, red teaming | YAML tests, deterministic and model-graded assertions, JSON/JUnit output, red-team runs | Can your application be represented safely as a provider or custom target? |
| Ragas | RAG and workflow metric experimentation | Collections metrics for retrieval, faithfulness, relevance, agents | Are its metric semantics aligned and calibrated for your corpus and labels? |
| Custom harness | Unusual state, policy, simulators, or regulated evidence | Your adapter, trial isolation, graders, result store | Can you afford long-term maintenance and interoperability? |

Framework choice does not change the validity requirements. A built-in metric still needs task relevance, calibration, versioning, and failure inspection. Preserve neutral records and raw grader outputs so you can compare implementations or migrate later.

### DeepEval example: combine grounding and tool checks

\`\`\`python
from deepeval import assert_test
from deepeval.metrics import FaithfulnessMetric, ToolCorrectnessMetric
from deepeval.test_case import LLMTestCase, ToolCall


def test_policy_lookup_uses_grounded_context():
    case = LLMTestCase(
        input="Can I return an unopened item after 20 days?",
        actual_output="Yes. Unopened items can be returned within 30 days.",
        retrieval_context=["Unopened items are eligible for return within 30 days."],
        tools_called=[ToolCall(name="lookup_return_policy")],
        expected_tools=[ToolCall(name="lookup_return_policy")],
    )

    assert_test(
        case,
        [
            FaithfulnessMetric(threshold=0.8),
            ToolCorrectnessMetric(),
        ],
    )

# Run with: deepeval test run tests/test_policy_eval.py
\`\`\`

The \`0.8\` threshold is illustrative. DeepEval documents the test-case fields and \`assert_test()\` workflow in its [evaluation introduction](https://deepeval.com/docs/evaluation-introduction), and its [tool-correctness documentation](https://deepeval.com/docs/metrics-tool-correctness) explains name, parameter, output, order, and exact-match options. Select strictness according to the requirement rather than assuming name equality is sufficient.

### Promptfoo example: deterministic assertions before a rubric

\`\`\`yaml
description: support answer regression
prompts:
  - file://prompts/support-answer.txt
providers:
  - id: openai:gpt-5-mini
tests:
  - description: answer from the approved return policy
    vars:
      question: Can I return an unopened item after 20 days?
      policy: Unopened items are eligible for return within 30 days.
    assert:
      - type: is-json
      - type: javascript
        value: |
          const value = JSON.parse(output);
          return value.action === 'answer' && value.citations.includes('return-policy');
      - type: llm-rubric
        value: |
          The answer must be fully supported by this policy: {{policy}}
        provider: openai:gpt-5-mini
\`\`\`

Promptfoo's [assertion documentation](https://www.promptfoo.dev/docs/configuration/expected-outputs/) supports deterministic, custom, similarity, and model-graded checks. The target and judge happen to use the same example provider above for brevity; a real team should test self-preference, pin reviewed model identifiers, and calibrate the rubric. Validate config and inspect outputs before converting it into a merge gate.

## Security testing is an independent quality dimension

Safety rubrics do not replace authorization, sandboxing, validation, and adversarial security tests. Treat model inputs and outputs as untrusted. Test the full path from user or retrieved content through the model to tools, interpreters, databases, browsers, and external network sinks.

OWASP's current LLM guidance identifies four risks directly relevant to eval design:

- [Prompt injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) can be direct or embedded in external content, and RAG or fine-tuning does not eliminate it.
- [Sensitive information disclosure](https://genai.owasp.org/llmrisk/llm022025-sensitive-information-disclosure/) includes PII, credentials, confidential business data, and other protected context.
- [Improper output handling](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/) occurs when generated output reaches downstream code without context-appropriate validation or encoding.
- [Excessive agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) arises from unnecessary functionality, permissions, or autonomy and can magnify model mistakes or injections.

### Build a threat-to-test matrix

| Threat | Adversarial setup | Hard evidence | Required control |
| --- | --- | --- | --- |
| Direct prompt injection | User asks to override policy or reveal instructions | No forbidden disclosure or action | Policy enforcement outside prompt where possible |
| Indirect prompt injection | Retrieved page, file, email, image, or tool result contains instructions | Untrusted content cannot redirect privileged behavior | Content boundaries, least privilege, approval |
| Cross-tenant data access | Query references another tenant's valid object ID | Tool denial and no leaked fields | Server-side authorization on every call |
| Secret or PII leakage | Seed context with unique canaries and protected fields | No canary reaches output, logs, or network sink | Minimization, redaction, access control |
| Improper output handling | Model emits HTML, SQL, shell, path, URL, or code payload | Sink rejects or safely encodes it | Schema validation, parameterization, sandboxing |
| Excessive agency | Agent is tempted to use a broad or destructive tool | Tool absent, denied, or confirmation-gated | Minimal tool set and permissions |
| RAG poisoning | Authorized corpus contains a malicious instruction block | Answer treats it as data and follows trusted policy | Source trust, instruction/data separation, monitoring |
| Resource exhaustion | Very long, recursive, or tool-looping request | Bounded calls, tokens, time, and spend | Quotas, timeouts, loop detection |

Run both **should block** and **should allow** cases. A guardrail that refuses every request can score perfectly on malicious-only probes while destroying the product. Measure attack success, false-block rate, and downstream impact separately.

### Test controls outside the model

The strongest security assertions usually target deterministic enforcement:

- Tool handlers authenticate and authorize the current principal independently of model text.
- High-impact writes require a signed, scoped confirmation or human approval.
- Generated SQL uses an allowlisted query builder or parameterization, not string execution.
- Generated HTML and Markdown are sanitized for their render context.
- File paths resolve inside a sandbox and reject traversal.
- Network destinations are allowlisted and egress is logged.
- Secrets never enter prompts unless strictly required, and are redacted from traces.
- Retrieval applies ACL filters before content reaches the context window.

OWASP recommends least privilege, deterministic output validation, human approval for high-risk actions, and adversarial simulation in its [prompt-injection mitigations](https://genai.owasp.org/llmrisk/llm01-prompt-injection/). Test those controls directly. A model's refusal text is not proof that a forbidden backend route is inaccessible.

### Maintain adversarial cases

Prompt attacks mutate. Keep a stable regression set for previously fixed vulnerabilities and a rotating discovery set generated or curated from new threat intelligence. Include multilingual, encoded, split-payload, multimodal, nested-document, and tool-result variants relevant to the application. Review generated probes before executing them against systems with side effects.

Promptfoo documents separate eval and red-team workflows and CI context tags in its [CI/CD guide](https://www.promptfoo.dev/docs/integrations/ci-cd/). Treat scanner findings as test leads, not automatic proof of exploitability. Reproduce high-severity results, capture the sink or state impact, and distinguish target failures from grader or probe-generation errors.

## Combine offline evals with online monitoring

Offline evals run controlled tasks before exposure. Online evaluation observes real behavior after deployment. Each catches failures the other misses. Anthropic describes automated evals, production monitoring, A/B tests, user feedback, transcript review, and human studies as complementary methods in its [holistic evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).

### Offline evaluation

Use offline suites for repeatable comparison, incident regressions, policy boundaries, model or prompt upgrades, fault injection, and destructive scenarios that should never touch users. Freeze dependencies where repeatability matters and run candidate and baseline under matched conditions.

Offline limitations include stale distributions, simplified tools, incomplete user behavior, and benchmark overfitting. Refresh cases from sanitized production evidence and record which product segments remain underrepresented.

### Online monitoring

Capture production traces with consent, minimization, retention, and access controls. Useful operational signals include:

- Request and model error rates.
- End-to-end and per-component latency percentiles.
- Input/output tokens, tool calls, retries, and cost.
- Retrieval-empty and abstention rates.
- Tool denial, confirmation, and side-effect counts.
- User correction, rephrase, escalation, abandonment, and explicit feedback.
- Policy and security detector events.
- Sampled model-grader scores, with calibration and judge errors tracked separately.
- Distribution drift by language, intent, account tier, source, and workflow.

Online metrics rarely provide immediate ground truth. A thumbs-up is useful but self-selected; absence of a complaint is not correctness. Join delayed outcomes where lawful and meaningful, such as successful resolution, reversed action, human escalation, or incident review.

### Use shadow, canary, and A/B stages deliberately

**Shadow evaluation** runs a candidate on copied, sanitized requests without using its output. It reveals latency, cost, tool-plan, and quality differences while protecting users, but write tools must be disabled or simulated. **Canary deployment** serves a small controlled slice with rollback conditions. **A/B testing** measures real user outcomes when the change and traffic volume support a valid experiment.

Do not send sensitive production content to an unapproved judge provider. Apply the same data residency, retention, contractual, and access requirements to evaluation calls as to product calls.

### Close the feedback loop

Every meaningful online failure should enter a triage pipeline:

1. Preserve a minimally necessary, access-controlled trace.
2. Identify model, prompt, corpus, tools, policy, and environment versions.
3. Reproduce in an isolated fixture.
4. Decide whether the defect is in product behavior, grader, data, or infrastructure.
5. Add a regression task and adjacent contrastive cases.
6. Fix the smallest responsible component.
7. Run component and end-to-end suites.
8. Deploy through shadow or canary when risk warrants it.

This converts monitoring from a dashboard into a quality system.

## Design CI quality gates that engineers can trust

A CI gate should be reproducible enough to act on and narrow enough to finish within the team's feedback budget. Do not run an uncached, expensive, high-variance research suite on every documentation change. Classify suites by trigger and decision.

### Four gate classes

1. **Hard invariants:** schema, authorization, secret leakage, forbidden tools, required state, executable tests. Any failure blocks.
2. **Regression rates:** compare supported behavior with a baseline by task and severity. Block only under a pre-agreed rule that accounts for noise.
3. **Operational budgets:** latency, token, call, and cost limits. Block or warn according to product impact and environment fidelity.
4. **Human approval:** subjective, novel, high-risk, or statistically ambiguous differences go to review rather than being forced into an unreliable number.

Use a fast pull-request subset and a broader scheduled or release suite. Trigger targeted cases based on changed prompts, tools, retrievers, policies, or model configuration, but retain periodic full runs to catch incorrect impact mapping.

### Compare candidate and baseline

Absolute thresholds alone allow slow erosion and can reject a healthy system when infrastructure shifts. Run the current production baseline and candidate against the same dataset, grader version, and environment where feasible. Report:

- Aggregate and stratum-level pass counts.
- New failures, fixed failures, and unstable cases.
- Critical-invariant failures separately.
- Metric deltas with uncertainty or raw repeated-trial counts.
- Latency and cost distributions.
- Grader errors, provider errors, and fixture failures.
- Links to outputs, traces, state diffs, and versions.

Never let a candidate's improved average compensate for a new critical security failure. Conversely, avoid blocking on a tiny aggregate movement when the case-level evidence is within known grader variance. Define an escalation path.

### Example CI command sequence

\`\`\`bash
# The repository pins promptfoo; CI does not float to an unreviewed latest release.
pnpm exec promptfoo validate config -c evals/promptfooconfig.yaml
pnpm exec promptfoo eval \
  -c evals/promptfooconfig.yaml \
  --no-cache \
  --fail-on-error \
  -o artifacts/llm-eval.json \
  -o artifacts/llm-eval.junit.xml

# Stateful Python evals use DeepEval's documented runner.
uv run deepeval test run tests/evals --exit-on-first-failure -- --tb=short
\`\`\`

Promptfoo documents JSON, HTML, and JUnit output plus failure behavior in its [CI/CD integration guide](https://www.promptfoo.dev/docs/integrations/ci-cd/). DeepEval documents \`deepeval test run\` as its pytest-enabled CLI path in its [evaluation guide](https://deepeval.com/docs/evaluation-introduction). The directories and flags above are an example; verify them against pinned versions and store artifacts under your CI retention policy.

### Quarantine infrastructure, not quality

If an eval is flaky, identify whether the source is target behavior, grader behavior, provider availability, shared fixtures, or the runner. Quarantine only with an owner, reason, visible expiration, and replacement signal. Do not rerun a genuine model failure until it passes and call that stability. Preserve all attempts and apply the product's retry policy explicitly.

## Gate latency and cost with quality

An LLM change can improve semantic scores by using a larger model, longer context, more search, and extra retries while making the product economically or operationally unusable. Track quality, latency, and cost on the same task record so trade-offs remain visible.

### Latency dimensions

Measure end-to-end duration and decompose it into retrieval, reranking, model queue, time to first token, generation, tool execution, retries, and post-processing. Report percentiles by workflow rather than only a mean. For streaming experiences, time to first useful content and time to a correct terminal action may matter more than final token time.

Run performance gates in a controlled environment, but complement them with production percentiles because network and provider routing differ. Separate cold and warm paths, cached and uncached retrieval, and normal from degraded dependencies.

### Cost dimensions

Record input, cached input where the provider exposes it, output and reasoning tokens where applicable, embedding volume, reranker calls, judge calls, tool/API charges, and retry cost. Compute both cost per trial and cost per successful task. A cheap system that requires frequent retries may cost more per outcome.

Do not cache candidate outputs in a regression comparison unless caching is the behavior under test. Cache stable grader inputs cautiously to reduce expense, and invalidate on judge model, prompt, rubric, or evidence changes. Never allow a cache key to omit tenant or policy context.

### Use budgets as constraints, not universal numbers

Set budgets from product economics and service objectives. For example, a pull-request policy may block a new critical failure, warn on a measured cost increase, and require owner approval for a latency regression. The actual percentages and currency limits must come from your baseline and business; this guide intentionally supplies no fake universal threshold.

Plot a quality-cost-latency frontier for candidate configurations. A configuration is dominated when another is at least as good on all required dimensions and better on one. This is more honest than ranking every candidate by a weighted score whose trade-offs nobody approved.

## Establish evaluation governance

Evals influence releases and can contain sensitive user data, hidden test labels, security probes, and expensive provider access. Govern them like production test infrastructure and controlled data products.

### Assign ownership

Platform or QA teams can own runners, schemas, isolation, and reporting. Product and domain experts should own task intent and references. Security owns threat cases and severity. Privacy and legal stakeholders define permissible data use and retention. A named release owner accepts or rejects evidence. Shared contribution is useful; unowned thresholds are not.

### Version every dependency of a result

At minimum, record:

- Dataset, split, and row revisions.
- Application commit and deployment configuration.
- Prompt templates, few-shot examples, and policy content hashes.
- Target model/provider identifier and sampling parameters.
- Embedding model, corpus snapshot, index, retriever, reranker, and top-k.
- Tool schemas, permissions, sandbox fixture, and external service versions.
- Grader code, model, prompt, rubric, and calibration-set revision.
- Runner/framework version, region, timestamp, and trial seed where meaningful.

An experiment ID should resolve to immutable artifacts. Mutable dashboard names are convenient labels, not sufficient provenance.

### Protect evaluation data

Minimize before collection, redact before persistence, encrypt in transit and at rest, scope access, audit exports, and enforce deletion. Keep secret canaries synthetic. Do not place real credentials in adversarial prompts. Review whether external model or observability vendors may retain eval content, and use approved local or private deployment where required.

Separate ordinary development cases from restricted incidents and exploit payloads. Engineers may need aggregate results without permission to read raw customer content. Redaction must preserve what the grader needs; replacing every entity with the same token can destroy authorization or coreference tests.

### Control changes

Review dataset, grader, threshold, and rubric changes like code. A pull request should explain why the measurement changed and, when possible, recompute baseline history. Do not change the system and judge simultaneously without an overlap run, because attribution becomes impossible.

Schedule suite health reviews. Remove duplicates, repair ambiguous tasks, refresh policies, inspect saturated capability sets, sample passes as well as failures, and verify that a known-good reference still passes. Anthropic emphasizes reading transcripts and maintaining suites as living artifacts in its [long-term eval guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).

## Migrate from hosted OpenAI Evals before shutdown

OpenAI announced the Evals platform deprecation on June 3, 2026. Existing evals are scheduled to become read-only October 31, and the dashboard and API are scheduled to shut down November 30, 2026, according to the [official deprecations page](https://developers.openai.com/api/docs/deprecations). Do not interpret this as OpenAI advising teams to stop evaluating. Its best-practices documentation still describes task-specific, continuous evaluation; the hosted product and the engineering discipline are different things.

| Date | Official platform state | Required team action |
| --- | --- | --- |
| June 3, 2026 | Deprecation announced | Freeze migration ownership and inventory dependencies |
| Before October 31, 2026 | Existing evals remain writable during transition | Export runnable configs and historical results; validate replacements |
| October 31, 2026 | Existing evals scheduled to become read-only | Do not depend on dashboard edits or new hosted workflow changes |
| November 30, 2026 | Dashboard and API scheduled to shut down | Remove runtime and CI dependencies; retain governed archives |

OpenAI's [official migration cookbook](https://developers.openai.com/cookbook/examples/evaluation/moving-from-openai-evals-to-promptfoo) recommends Promptfoo, documents exporting a runnable Promptfoo config from a completed run, and treats historical result export as a separate operation. It also warns that similarity scores may not match exactly across systems and that manually recreated model graders require validation.

### Migration procedure

1. **Inventory:** list eval IDs, owners, datasets, runs, prompts, models, graders, thresholds, consumers, API calls, scheduled jobs, permissions, and retention requirements.
2. **Classify:** identify active release gates, research experiments, obsolete assets, historical evidence, and regulated records.
3. **Export runnable configurations:** for supported evals, open a completed run and download the runnable Promptfoo config following the cookbook.
4. **Export historical results separately:** archive raw exports with checksums, metadata, access controls, and a readable inventory.
5. **Validate syntax:** install a pinned Promptfoo version and validate every exported config.
6. **Run uncached:** execute the exported suite against a controlled target and capture raw results.
7. **Map graders explicitly:** document each OpenAI testing criterion to its replacement assertion, custom grader, or human process.
8. **Calibrate differences:** compare row-level decisions, especially similarity and LLM-judge outputs. Do not demand meaningless numeric identity.
9. **Parallel-run:** operate old and new paths long enough to investigate material disagreement before the read-only date.
10. **Move ownership into code:** version configs, datasets, custom assertions, runner dependencies, and CI policy in controlled repositories.
11. **Cut over consumers:** update CI, dashboards, alerts, scheduled jobs, service accounts, and documentation.
12. **Prove independence:** disable the old path in a rehearsal and confirm releases, reports, and incident workflows still function.

### Migration command example

\`\`\`bash
# Names are local examples; use the files downloaded from your OpenAI export.
promptfoo validate config -c ./exports/customer-support.yaml
promptfoo eval -c ./exports/customer-support.yaml --no-cache
promptfoo view

# Historical results are exported and imported separately from runnable config.
promptfoo import ./exports/customer-support-results.json
\`\`\`

These commands mirror the flow in OpenAI's [migration cookbook](https://developers.openai.com/cookbook/examples/evaluation/moving-from-openai-evals-to-promptfoo). In CI, invoke the repository-pinned binary rather than an uncontrolled global installation. Review migration warnings and test custom providers in a sandbox.

### What must survive the migration

Preserve semantics, not just files:

- Dataset rows, splits, labels, tags, and provenance.
- Rendered prompt behavior and application adapters.
- Target providers, model parameters, and tool definitions.
- Grader rubrics, code, model configurations, and thresholds.
- Per-case output, score, reason, error, cost, and latency where available.
- Baseline and candidate relationships used by release decisions.
- Access controls, retention, audit, and incident links.

An exported YAML file is not a complete migration if the old dashboard held the only human labels, run history, or ownership context. The dedicated [OpenAI Evals shutdown migration guide](/blog/openai-evals-platform-shutdown-migration-2026) provides a narrower checklist for that transition.

## Practical implementation roadmap

Build the smallest trustworthy loop, then expand by risk. A giant metric catalog without reliable fixtures is less useful than ten incident-derived cases with direct state assertions.

### Phase 1: define and instrument

1. Pick one high-value workflow and name its user outcome.
2. Write the quality contract and hard security invariants.
3. Instrument model calls, retrieval IDs, tools, state, latency, token usage, and errors.
4. Create a neutral eval record and redact it under a documented policy.
5. Convert manual checks and recent failures into initial tasks.
6. Build isolated fixtures and prove one known-good reference solution passes.

Anthropic suggests that an early suite can start with a modest set of real failures rather than waiting for hundreds of tasks in its [zero-to-one roadmap](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents). The exact count is less important than coverage, clarity, and ownership.

### Phase 2: automate reliable grading

1. Implement schema, authorization, state, tool, and budget assertions.
2. Add retrieval ID labels and claim-source evidence where applicable.
3. Define narrow rubrics only for semantic dimensions code cannot judge.
4. Collect independent human labels and calibrate model graders.
5. Separate development, calibration, capability, regression, and adversarial splits.
6. Store result provenance and case-level artifacts.

### Phase 3: establish release gates

1. Pin framework, target, and judge versions.
2. Run baseline and candidate on matched conditions.
3. Put hard invariants and a fast regression subset in pull-request CI.
4. Schedule broader repeated-trial, capability, security, and cost suites.
5. Define block, warn, review, canary, and rollback actions before a failure occurs.
6. Assign triage owners and a time-bounded quarantine process.

### Phase 4: connect production

1. Add privacy-approved sampling and online operational metrics.
2. Mine corrections, escalations, incidents, and failed outcomes into tasks.
3. Use shadow evaluation for candidate behavior without side effects.
4. Canary high-impact changes with observable rollback conditions.
5. Recalibrate judges and reweight traffic strata as distributions change.
6. Review suite health, saturation, access, and retention on a fixed cadence.

### Phase 5: scale governance and reuse

Create reusable adapters, grader libraries, fixture builders, and result schemas without centralizing product judgment away from domain owners. Publish contribution templates so product, support, security, and engineering can add cases through review. Browse [QA skills](/skills) for repeatable agent instructions, and use browser tooling such as the [Playwright CLI skill](/skills/Pramod/playwright-cli) when an agent outcome requires UI, network, screenshot, or trace evidence.

## Frequently asked questions

### What should an LLM eval dataset contain?

It should contain replayable tasks, initial state, references or rubric anchors, tags, traffic/risk strata, provenance, sensitivity, policy or corpus versions, and the evidence needed by graders. Combine sanitized production samples, incidents, expert-authored cases, contrastive edge cases, and adversarial tests. Keep development, locked regression, capability, calibration, and online-shadow splits separate so repeated optimization does not masquerade as held-out performance.

### Should I use deterministic checks or an LLM as judge?

Use deterministic checks whenever code can directly prove the requirement: parsing, schema, exact labels, permissions, state, executable tests, tool bounds, latency, and cost. Use an LLM judge for narrow semantic questions such as relevance, claim support, completeness, or tone, then calibrate it against independent human labels. Retain human review for ambiguity, high-risk decisions, and judge maintenance.

### How do I calibrate an LLM judge?

Create an independently human-labeled set with clear, boundary, adversarial, and insufficient-evidence cases. Freeze a narrow rubric and structured labels, then measure class-level agreement, false accepts, false rejects, and repeated stability. Inspect disagreements, revise without tuning on the final validation subset, and version the judge model and prompt. Recalibrate after domain, language, rubric, traffic, or model changes.

### What are pass@k and pass^k?

Pass@k measures whether at least one of \`k\` attempts succeeds, so it fits products that intentionally allow several candidates or attempts. Pass^k measures whether all \`k\` trials succeed, emphasizing consistent reliability. Use the metric matching the user experience. Reporting pass@10 for a one-shot customer workflow can make an unreliable system look much stronger than what each user receives.

### How many trials should I run for non-deterministic evals?

There is no universal number. Use more trials when outcomes are variable, cases are high risk, or expected changes are small; use fewer for fast diagnosis of large changes. Report raw counts and uncertainty, reset state between trials, and separate target, grader, and infrastructure errors. The decision should be based on the precision required, not a ritual trial count copied from another product.

### How should I test an AI agent?

Start with verifiable outcomes and final environment state, then add tool, trajectory, side-effect, and efficiency checks where the path matters. Test confirmation, authorization, tenant scope, fault recovery, idempotency, stopping, and forbidden actions. Run each trial in a clean production-like sandbox. Grade the final response separately because an agent can claim success without creating the required state.

### How should I evaluate a RAG application?

Decompose it. Test ingestion and ACL metadata, deterministic retrieval recall and ranking where labels exist, context assembly, answer faithfulness, response relevance, abstention, and claim-level citation alignment. Freeze a corpus for regression and use a separate live suite for freshness. High answer quality cannot diagnose poor retrieval, and high retrieval recall does not prove the generator used evidence correctly.

### How do offline evals and production monitoring work together?

Offline evals provide controlled, repeatable pre-release comparison and safely exercise destructive or adversarial scenarios. Production monitoring reveals actual distributions, dependencies, latency, cost, feedback, and new failures, usually with incomplete ground truth. Feed reproducible production failures back into regression suites, use shadow runs for candidate comparison, and canary risky changes with rollback conditions.

### What does the OpenAI Evals shutdown mean for my team?

It means the hosted Evals platform is scheduled to become read-only on October 31, 2026 and its dashboard and API are scheduled to shut down November 30, according to [OpenAI's deprecation notice](https://developers.openai.com/api/docs/deprecations). Export runnable configs and historical results before those dates, validate grader semantics in the replacement, parallel-run material gates, and remove CI/API dependencies. It does not mean teams should stop doing evals.

## Release checklist

Before approving an LLM application change, confirm:

- The eval objective and user outcome are explicit.
- Dataset rows match production and risk distributions and have provenance.
- Development, regression, capability, calibration, and adversarial data are separated.
- The candidate and baseline use recorded application, model, prompt, corpus, tool, and grader versions.
- Hard facts, authorization, state, and budgets use deterministic checks.
- Model judges are narrow, structured, calibrated, and versioned.
- High-risk or disputed cases have accountable human review.
- Repeated trials match the product's actual attempt policy.
- Agent outcomes, trajectories, tools, state, and side effects are all covered where relevant.
- RAG retrieval, ranking, generation, abstention, and citations are decomposed.
- Multi-turn memory, correction, recovery, and termination are tested.
- Prompt injection, disclosure, output sinks, least privilege, and excessive agency have direct tests.
- Grader, provider, fixture, and product failures are reported separately.
- CI rules distinguish block, warning, review, canary, and rollback.
- Latency and cost are measured on the same cases as quality.
- Production monitoring can feed reproducible failures back into the suite.
- OpenAI hosted-Evals dependencies have a migration owner and dated cutover plan.
- Data access, retention, redaction, exports, and audit requirements are enforced.
- Known limitations are visible to the person making the release decision.

LLM testing becomes dependable when it stops being a collection of impressive scores and becomes an evidence chain: representative task, controlled trial, complete trace, appropriate grader, calibrated decision, and production feedback. Build that chain around user outcomes and hard system boundaries. Models, frameworks, and hosted products will change; a versioned, portable quality contract can survive them.
`,
  },
};
