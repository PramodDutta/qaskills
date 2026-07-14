import type { SeoClusterArticle } from './seo-cluster-article';

export const llmAgentTestingChildren2026: SeoClusterArticle[] = [
  {
    slug: 'openai-evals-platform-shutdown-migration-2026',
    clusterId: 'llm-agent-testing',
    post: {
      title: 'OpenAI Evals Platform Shutdown: Migration Checklist for November 2026',
      description:
        'Migrate OpenAI Evals before the November 2026 shutdown with export, Promptfoo, code-first parity, CI, grader validation, and rollback checklists.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Guide',
      image: '/blog/pillars/llm-agent-testing.png',
      imageAlt:
        'Migration map moving hosted OpenAI Evals datasets, graders, and run history into a versioned code-first test pipeline',
      primaryKeyword: 'openai evals shutdown migration',
      keywords: [
        'openai evals shutdown migration',
        'OpenAI Evals deprecation',
        'OpenAI Evals November 2026',
        'OpenAI Evals to Promptfoo',
        'Evals platform migration checklist',
        'code-first LLM evals',
        'OpenAI Evals API shutdown',
        'Promptfoo migration',
      ],
      contentKind: 'child',
      pillarSlug: 'testing-llm-applications-guide',
      relatedSlugs: [
        'testing-llm-applications-guide',
        'llm-eval-harness-production-guide-2026',
        'deterministic-graders-vs-llm-judge-human-review-2026',
        'ai-agent-eval-testing-guide',
      ],
      sources: [
        'https://developers.openai.com/api/docs/deprecations',
        'https://openai.com/index/introducing-agentkit/',
        'https://developers.openai.com/cookbook/examples/evaluation/moving-from-openai-evals-to-promptfoo',
        'https://developers.openai.com/api/docs/guides/evaluation-best-practices',
        'https://www.promptfoo.dev/docs/configuration/guide/',
        'https://www.promptfoo.dev/docs/configuration/expected-outputs/',
        'https://www.promptfoo.dev/docs/configuration/outputs/',
        'https://inspect.aisi.org.uk/eval-logs.html',
      ],
      content: `OpenAI announced the Evals platform deprecation on **June 3, 2026**. Existing evals become read-only on **October 31, 2026**, and the Evals dashboard and API are scheduled to shut down on **November 30, 2026**. An OpenAI Evals shutdown migration should therefore export runnable configurations and historical results before October 31, move execution into version-controlled code or configuration, validate grader parity on frozen outputs, and switch CI before November. OpenAI's documented migration path is Promptfoo; a custom harness or another code-first framework is reasonable when production behavior cannot be represented by a declarative prompt matrix.

Start with the [complete LLM testing guide](/blog/testing-llm-applications-guide), then use the sibling guides to [build a production-matched harness](/blog/llm-eval-harness-production-guide-2026), [divide work among deterministic, model, and human graders](/blog/deterministic-graders-vs-llm-judge-human-review-2026), and [evaluate agent tools and outcomes](/blog/ai-agent-eval-testing-guide). The canonical [OpenAI grader reference](/blog/openai-evals-graders-complete-reference-2026) explains the source concepts being migrated, while the [LLM CI quality-gates guide](/blog/llm-evaluation-ci-cd-quality-gates) covers the destination release policy. Browse reusable QA instructions in [/skills](/skills), including the [Playwright CLI skill](/skills/Pramod/playwright-cli) when browser evidence is part of an end-to-end eval.

## The official timeline, without extrapolation

The controlling source is OpenAI's [API deprecations page](https://developers.openai.com/api/docs/deprecations). It lists three Evals milestones and says that graders documented for eval workflows are included in the transition. The revised [AgentKit announcement](https://openai.com/index/introducing-agentkit/) independently carries a June 3 update saying Agent Builder and Evals will no longer be available on the OpenAI platform from November 30 onward.

| Date | Official platform state | Operational consequence |
| --- | --- | --- |
| June 3, 2026 | OpenAI notified Evals users that the product is deprecated | Freeze new platform-specific architecture and assign migration owners |
| October 31, 2026 | Existing evals become read-only | Complete runnable-config, dataset, grader, and result exports before this date |
| November 30, 2026 | Evals dashboard and API are scheduled to shut down | No CI, script, or application may still depend on the hosted Evals surfaces |

Treat October 31 as the export deadline and November 30 as the dependency-removal deadline. A read-only project may still be viewable, but it cannot be your recovery plan for a missing grader or an incomplete dataset. If your organization has a Q4 release freeze, set an earlier internal cutover and leave time for parallel runs.

## What is shutting down, and what is not

The notice names the **Evals platform**, including its dashboard and API. Do not rewrite that as "OpenAI is ending evaluation" or "the Responses API is shutting down." Evaluation remains an engineering practice, and model inference APIs are separate products. OpenAI's current [evaluation best-practices guide](https://developers.openai.com/api/docs/guides/evaluation-best-practices) still recommends task-specific tests, production-representative data, comprehensive logging, continuous evaluation, and human calibration. Those design principles survive the hosted product.

The June 3 notice also covers Agent Builder, but its recommended destinations differ: OpenAI points code-managed workflows to the Agents SDK and natural-language use cases to Workspace Agents. ChatKit remains available according to the notice. If one project combines Agent Builder workflows and hosted Evals, run two linked migrations: port the agent runtime first, then point the replacement eval runner at the ported runtime. Otherwise you can mistakenly validate the legacy workflow while production moves to different code.

Reusable prompt objects were announced in the same deprecation batch, with their own November 30 shutdown. Inventory them separately. A prompt embedded in an exported eval is test input; a reusable prompt fetched by production at runtime is an application dependency. Both need versioned ownership, but replacing one does not automatically replace the other.

## Choose the destination before exporting

OpenAI's [migration cookbook](https://developers.openai.com/cookbook/examples/evaluation/moving-from-openai-evals-to-promptfoo) recommends Promptfoo and explains the conceptual mapping: prompts, providers, test data, and grading criteria become portable configuration and CLI-driven runs. That is the shortest supported route for an eval the platform can export.

| Destination | Choose it when | Main migration work | Main limitation to test |
| --- | --- | --- | --- |
| Promptfoo configuration and CLI | The eval is primarily prompts, provider calls, variables, and assertions | Export, validate, pin dependencies, add CI and artifact retention | Unsupported graders or custom agent/provider behavior need manual setup |
| Application-owned pytest or test runner | Production behavior lives behind stable code interfaces and deterministic fixtures | Build adapters, result schema, repeat policy, reports, and grader orchestration | Your team owns concurrency, retries, observability, and maintenance |
| Inspect AI | Tasks need model-independent datasets, solvers/agents, scorers, sandboxes, and rich logs | Re-express tasks and scorers, configure models, preserve run metadata | It is a reimplementation, not an automatic OpenAI export target |
| Another evaluated framework | Existing organizational tooling already owns traces, datasets, or experiments | Map every artifact and prove equivalent decisions | Similar names do not imply equivalent scoring or run semantics |

Do not select a replacement from a feature checklist alone. Select one representative eval from each shape you operate: simple classification, retrieval-grounded answer, model judge, custom code grader, tool-using agent, and external provider. Prove those vertical slices before migrating the full catalog. This reveals unsupported behavior while the source remains writable.

## Phase 1: inventory every dependency

An inventory should connect each hosted object to a repository, runtime owner, data owner, and release consumer. Search code and CI definitions for Evals endpoint calls, SDK methods, stored eval IDs, dashboard URLs, and scripts that parse run output. Also search operational documentation; a manual approval checklist can depend on a dashboard even when no code does.

This shell example is intentionally a discovery aid, not a claim that every match is an Evals dependency:

\`\`\`bash
rg -n --hidden \
  '(/v1/evals|client[.]evals|eval_id|platform[.]openai[.]com/.+eval|prompt_id)' \
  .github packages scripts docs

rg -n --hidden \
  '(OPENAI_API_KEY|OPENAI_PROJECT|OPENAI_ORG|promptfoo|inspect eval)' \
  .github packages scripts
\`\`\`

For each true dependency, record:

1. Eval name and stable internal owner.
2. Dataset source, update process, privacy classification, and row count at export time.
3. Prompt or application version that produces candidate outputs.
4. Model/provider configuration, including any non-default generation settings.
5. Every grader, threshold, weight, and aggregation rule.
6. Historical baseline used for a release decision.
7. Consumers: pull-request check, nightly job, dashboard, analyst notebook, or manual review.
8. Required secrets, network access, tools, and test-environment state.
9. Retention and deletion obligations for inputs, outputs, traces, and annotations.

An eval with no owner should not silently migrate. Decide whether to retain, merge, or retire it, and preserve the decision. Migration is an opportunity to remove dead gates, but not to delete unexplained evidence.

## Phase 2: export two different assets

OpenAI's cookbook distinguishes a **runnable Promptfoo configuration** from **historical results**. They are separate downloads with separate purposes. For a supported eval, select a completed run, choose **Download runnable Promptfoo config**, and review export warnings. If there is no completed run, the cookbook says to run one before export. Download results separately when past runs need to remain available for comparison or audit.

The distinction prevents two common mistakes:

- Importing old results does not create the configuration for future runs.
- Running an exported configuration creates a new Promptfoo run; it does not continue the hosted OpenAI run.

Store the raw exports immutably, then create a reviewed working copy. Add a manifest with source eval ID, source run ID, export timestamp, exporter, file hashes, warnings, dataset provenance, and any omitted component. Keep raw sensitive data out of a repository when policy forbids it; store a pointer and checksum instead.

Run the documented commands against the reviewed export:

\`\`\`bash
promptfoo validate config -c evals/support-routing/promptfooconfig.yaml
promptfoo eval -c evals/support-routing/promptfooconfig.yaml --no-cache
promptfoo view

# Historical results are imported separately from runnable configuration.
promptfoo import exports/openai-evals/support-routing-results.json
promptfoo view
\`\`\`

The [OpenAI cookbook](https://developers.openai.com/cookbook/examples/evaluation/moving-from-openai-evals-to-promptfoo) uses \`--no-cache\` for the first fresh run so cached outputs cannot disguise a provider or prompt mismatch. Keep that behavior during parity testing. Later, adopt caching only with an explicit cache key and a clear understanding of which inputs, prompts, models, and grader versions it covers.

## Phase 3: make the destination reviewable

An exported file is a starting point, not a reviewed quality contract. Move prompts to named files, give tests stable IDs, separate secrets from configuration, and pin the Promptfoo version used in CI. The [Promptfoo configuration guide](https://www.promptfoo.dev/docs/configuration/guide/) defines prompts, providers, tests, variables, transforms, and assertions as the core configuration pieces.

The following small classification suite is an **illustrative destination config**, not a reproduction of OpenAI's export format. It uses documented Promptfoo fields and keeps the expected answer deterministic:

\`\`\`yaml
description: support-routing-regression

prompts:
  - file://prompts/route-support.txt

providers:
  - id: openai:gpt-5-mini
    config:
      temperature: 0

tests:
  - description: damaged item routes to returns
    vars:
      message: The mug arrived cracked. I need a replacement.
    assert:
      - type: equals
        value: returns

  - description: password failure routes to account support
    vars:
      message: My reset link expired and I cannot sign in.
    assert:
      - type: equals
        value: account_support
\`\`\`

The prompt file must constrain the output to the approved labels. If production adds preprocessing, retrieval, policy logic, fallback models, or output normalization, calling a model directly is not parity. Use Promptfoo's documented custom or HTTP provider support, or place the suite behind the same application entry point production uses. The goal is not to preserve a dashboard-shaped test; it is to preserve the behavior and decision the test was meant to protect.

## Phase 4: map graders by observable requirement

Do not translate grader names mechanically. Write down what each grader observed and what decision its score controlled. Then choose the destination assertion that sees the same evidence.

| Source intent | Preferred code-first expression | Required parity evidence |
| --- | --- | --- |
| Exact label or required string | Equality, membership, or normalized string assertion | Same frozen outputs produce the same pass/fail labels |
| Structured output | JSON parse plus schema or field invariants | Malformed and boundary fixtures fail for the same reason |
| Numeric tolerance | Explicit formula with units and inclusive/exclusive boundary | Values immediately below, at, and above the threshold |
| Semantic similarity | Documented similarity assertion with pinned model/config | Distribution comparison; exact scores may differ across systems |
| LLM judge | Versioned rubric, judge configuration, structured verdict | Agreement against frozen human labels and disagreement review |
| Python or custom logic | Repository-owned function with unit tests | Golden fixtures exercise exceptions, missing fields, and partial credit |
| Tool or agent workflow | Run production-like agent and grade outcome, state, and allowed actions | Equivalent environment, tools, permissions, stop conditions, and traces |

OpenAI explicitly warns that similarity-based scores may not be numerically identical and that manually recreated graders, especially LLM judges, must be validated before they drive regression decisions. It also lists tools, agents, custom providers, and omitted graders as cases that may require manual setup. Treat an export warning as an unresolved test gap, not informational noise.

## Phase 5: prove parity with frozen outputs

Provider sampling makes live A/B runs noisy. First compare graders on the **same frozen candidate outputs**. This isolates scorer migration from generator variation. Build a neutral fixture containing case ID, input, reference, candidate output, old verdict, old score when meaningful, and reviewer notes. Run the new grader over those candidates.

This application-owned Python example compares decisions without assuming either platform's result schema:

\`\`\`python
from dataclasses import dataclass


@dataclass(frozen=True)
class Decision:
    case_id: str
    passed: bool


def agreement(old: list[Decision], new: list[Decision]) -> dict[str, object]:
    old_by_id = {row.case_id: row.passed for row in old}
    new_by_id = {row.case_id: row.passed for row in new}
    if old_by_id.keys() != new_by_id.keys():
        raise ValueError("case IDs differ; compare identical fixtures")

    disagreements = [
        case_id
        for case_id in sorted(old_by_id)
        if old_by_id[case_id] != new_by_id[case_id]
    ]
    total = len(old_by_id)
    return {
        "cases": total,
        "agreement": (total - len(disagreements)) / total if total else 0.0,
        "disagreements": disagreements,
    }
\`\`\`

Do not define an acceptable agreement threshold from this article. Set it from the consequence of a changed verdict and inspect every disagreement during migration. For deterministic graders, unexplained disagreement should normally block cutover. For model judges, compare both systems with adjudicated human labels; agreement with the old judge is not proof that either judge is correct.

After scorer parity, run old and new generators in parallel on the same dataset and environment. Separate generator differences, grader differences, infrastructure errors, and expected nondeterminism in the report. A single aggregate pass rate cannot tell you which layer moved.

## Phase 6: rebuild CI as a controlled release dependency

The replacement job should run from a locked dependency graph, use least-privilege secrets, record the evaluated commit, and upload a full result artifact. Promptfoo's [output documentation](https://www.promptfoo.dev/docs/configuration/outputs/) notes that rich exports can contain configuration, prompts, variables, raw outputs, reasons, and provider errors, while JUnit output intentionally omits much of that detail. Use JUnit for a compact check annotation and a restricted JSON or native artifact for diagnosis.

A migration-ready CI job should make these states distinct:

- **Product failure:** the application ran and a requirement failed.
- **Grader failure:** the candidate exists, but scoring could not complete.
- **Infrastructure failure:** provider, network, sandbox, or dependency prevented a valid trial.
- **Insufficient evidence:** a judge abstained or required human escalation.
- **Policy exception:** an authorized reviewer accepted a documented, time-bounded waiver.

Never convert all five to "red eval." Teams quickly learn to rerun an opaque red check until it becomes green. Preserve failure class, attempt count, error, case ID, configuration hashes, timing, and cost evidence so the owner can act.

## Code-first alternatives when export is incomplete

A small application-owned harness is valid when it deliberately shares production adapters and has a stable result contract. Pytest can own fixtures and assertions; your code must own model invocation, tracing, repeated trials, concurrency limits, and reports. This route minimizes framework semantics but maximizes maintenance responsibility. The [production harness sibling](/blog/llm-eval-harness-production-guide-2026) includes a complete architecture.

Inspect AI is another code-first option for task, solver or agent, scorer, sandbox, and log workflows. Its official [evaluation log documentation](https://inspect.aisi.org.uk/eval-logs.html) describes logs containing task/model configuration, plan, aggregate results, usage, errors, and per-sample records. Current Inspect logs also support exporting run configuration for replay. Those capabilities are useful, but they do not make an OpenAI-hosted eval automatically portable; tasks and graders still need an explicit mapping and parity test.

Whichever option you choose, retain a framework-neutral case ID and dataset format. A future runner migration is far easier when business requirements are not encoded only in one vendor's object IDs.

## Failure analysis during migration

### The exported configuration will not validate

Read every export warning and identify omitted providers, graders, variables, or transforms. Do not patch until the source behavior is documented. Compare against Promptfoo's current schema, then make the smallest reviewed correction. Record the manual mapping in the migration manifest.

### The first new run is unexpectedly perfect

Check caching, dataset selection, empty test discovery, and whether assertions were actually attached. Confirm case count and force a known-bad candidate through each grader. A quality gate that cannot fail its negative control is not active.

### Scores move but pass/fail mostly agrees

Similarity implementations and model judges can produce different scales. Recalibrate thresholds against labeled fixtures instead of copying the old number. Preserve score distributions and boundary cases; an unchanged average can hide changed verdicts near the gate.

### Agent evals fail only in the replacement

Compare tools, schemas, credentials, approvals, network, initial state, timeouts, maximum turns, and stop logic. The agent harness is part of the evaluated system. If the replacement exposes different tools or truncates results, it is not running the same task.

### Parallel trials contaminate one another

Give every trial a clean namespace, database state, filesystem, cache prefix, and external resource allocation. Anthropic's [agent-eval guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) warns that leftover state and shared resource exhaustion can create correlated failures or artificial advantages.

### Historical results import but cannot rerun

That is expected when only result history was exported. Import preserves reference evidence; the runnable configuration is a separate asset. Return to the source project and export a completed run's configuration before the read-only date, or manually reconstruct and validate it.

## Cutover and rollback checklist

1. Finish inventory and assign one owner per eval and destination repository.
2. Export raw runnable configs, historical results, data, grader definitions, and warnings.
3. Hash and archive raw exports under the applicable retention policy.
4. Recreate unsupported components and add direct unit tests for custom graders.
5. Compare old and new graders on frozen outputs, including negative and boundary fixtures.
6. Run source and destination in parallel using the same production-matched application version.
7. Review disagreements, traces, latency, cost, and infrastructure-error rates by case.
8. Pin runner and grader dependencies; provision least-privilege CI secrets.
9. Switch the required check to the replacement while keeping the old run non-blocking briefly.
10. Remove all Evals API calls, IDs, secrets, dashboard runbooks, and scheduled jobs before November 30.
11. Preserve an application-version rollback, not a dependency on the retiring hosted service.
12. Test restore instructions from the archived dataset, config, and result artifacts.

Rollback means returning to the last known-good code-first configuration and application version. It must not mean re-enabling the hosted Evals API after its shutdown date. Practice the rollback before disabling the old gate.

## Version scope and limitations

This guide is current to **July 14, 2026** and follows the dates and replacement path published by OpenAI. Deprecation schedules can change, so the official deprecations page remains authoritative. The article does not claim that the OpenAI model APIs, Responses API, Agents SDK, ChatKit, evaluation as a practice, or every AgentKit component are shutting down.

Promptfoo commands and fields here match the linked primary documentation available on the update date. Pin and verify the version used by your repository; do not put \`@latest\` into a controlled quality gate. The example configuration is deliberately small and does not promise byte-for-byte equivalence with an exported file. Custom graders, external providers, tools, agents, retrieval, and stateful workflows require case-specific work.

No threshold in this guide is a universal release standard. Preserve your organization's labeled evidence, risk analysis, and reviewer decisions. Migration parity proves that a replacement measures the intended contract under a recorded setup; it does not prove the contract covers every production failure.

## Frequently Asked Questions

### When did OpenAI announce the Evals platform shutdown?

OpenAI says it notified developers on June 3, 2026 that the Evals platform was being deprecated. The official schedule makes existing evals read-only on October 31 and schedules the dashboard and API to shut down on November 30, 2026.

### Does the OpenAI Evals API continue after November 30, 2026?

No, not according to the current official schedule. The Evals dashboard and API are both scheduled to shut down on November 30. Remove CI and script dependencies rather than assuming API-only use survives the dashboard retirement.

### Is Promptfoo the official migration path?

OpenAI's deprecations page links to its cookbook titled "Moving from OpenAI Evals to Promptfoo," and that cookbook says OpenAI recommends Promptfoo for continuing and extending eval workflows. Supported evals can export runnable Promptfoo configuration; unsupported pieces need manual setup.

### Do historical result exports include a runnable eval?

No. OpenAI documents runnable configuration and historical results as separate exports. Importing results makes past evidence available for reference, but it does not define prompts, providers, test variables, and assertions for a future run.

### Must every team use Promptfoo?

No. It is the documented OpenAI path and should be evaluated first. A custom pytest harness, Inspect AI, or an established internal framework can be a better fit when the eval must execute a complex production application. The burden is explicit mapping, parity evidence, CI ownership, and durable logs.

### How should we migrate an LLM-as-a-judge grader?

Freeze candidate outputs, recreate the rubric and judge configuration, collect new verdicts, and compare both old and new judges with adjudicated human labels. Review disagreements rather than merely copying a numeric threshold. OpenAI specifically warns that manually recreated judges require validation.

### What should be completed before October 31?

Complete exports while projects remain writable: runnable configs, historical results, datasets, graders, warnings, metadata, and any completed source runs needed for export. Ideally, finish parity testing and CI cutover too. Waiting until read-only leaves no room to repair the source project.

### Does this shutdown mean teams should stop writing evals?

No. It means teams should move eval ownership out of the retiring hosted product. OpenAI and Anthropic both continue to recommend eval-driven development, production-representative tasks, multiple grader types, logging, repeated trials where appropriate, and human calibration.
`,
    },
  },
  {
    slug: 'llm-eval-harness-production-guide-2026',
    clusterId: 'llm-agent-testing',
    post: {
      title: 'How to Build an LLM Eval Harness That Matches Production Behavior',
      description:
        'Build an LLM eval harness that exercises the production application path, isolates state, records versions and traces, repeats trials, and gates releases.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Tutorial',
      image: '/blog/pillars/llm-agent-testing.png',
      imageAlt:
        'Production and evaluation requests passing through the same LLM application adapter with isolated datasets, traces, and graders',
      primaryKeyword: 'llm eval harness',
      keywords: [
        'llm eval harness',
        'production LLM evaluation',
        'LLM test harness architecture',
        'LLM regression harness',
        'production parity testing',
        'LLM eval CI pipeline',
        'repeatable LLM evaluations',
        'LLM evaluation framework',
      ],
      contentKind: 'child',
      pillarSlug: 'testing-llm-applications-guide',
      relatedSlugs: [
        'testing-llm-applications-guide',
        'openai-evals-platform-shutdown-migration-2026',
        'deterministic-graders-vs-llm-judge-human-review-2026',
        'ai-agent-eval-testing-guide',
      ],
      sources: [
        'https://developers.openai.com/api/docs/guides/evaluation-best-practices',
        'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents',
        'https://www.promptfoo.dev/docs/providers/http/',
        'https://www.promptfoo.dev/docs/configuration/outputs/',
        'https://inspect.aisi.org.uk/eval-logs.html',
        'https://docs.pytest.org/en/stable/how-to/fixtures.html',
        'https://docs.pytest.org/en/stable/how-to/monkeypatch.html',
      ],
      content: `An **LLM eval harness** matches production behavior when it invokes the same application entry point with the same prompt assembly, retrieval, tools, policies, model settings, output parsing, retries, and state boundaries that users encounter. The harness may replace external side effects with controlled fakes, but it must preserve their contracts and record every substitution. Build it around versioned cases, isolated trials, observable results, layered graders, and an immutable run manifest. If the eval calls a model directly while production calls an orchestrated application, it measures the model prompt, not the product you ship.

Place this implementation inside the [LLM testing pillar](/blog/testing-llm-applications-guide). Before selecting runner code, review the sibling [OpenAI Evals migration checklist](/blog/openai-evals-platform-shutdown-migration-2026), the [grader decision guide](/blog/deterministic-graders-vs-llm-judge-human-review-2026), and the [agent evaluation guide](/blog/ai-agent-eval-testing-guide). Build datasets with the canonical [golden dataset guide](/blog/golden-dataset-llm-evaluation-guide), and add retrieval slices from the [RAG regression testing guide](/blog/rag-regression-testing-guide). Reusable instructions live in [/skills](/skills); the [Playwright CLI skill](/skills/Pramod/playwright-cli) is useful when a production journey must be verified through its browser surface.

## Begin with a parity contract

"Use the same model" is not a parity contract. An LLM application's behavior depends on every transformation before and after the provider call. Write down the production path as a sequence of observable boundaries, then identify which implementation the eval uses at each boundary.

| Boundary | Production behavior to preserve | Controlled substitution that is usually safe | Evidence to record |
| --- | --- | --- | --- |
| Request intake | Authentication context, locale, tenant, feature flags, conversation state | Synthetic identity with the same authorization claims | Case ID, actor, flags, locale, initial state hash |
| Input processing | Validation, normalization, classification, policy checks | Fixed clock or deterministic ID generator | Parsed request and transformation versions |
| Context construction | Prompt version, retrieved chunks, memory, history truncation | Frozen retrieval snapshot for offline regression | Prompt hash, document IDs, ranks, chunk hashes |
| Model invocation | Provider, model identifier, generation options, timeout, retry policy | Recorded response only for component tests | Resolved config, attempt number, usage, latency |
| Tools and side effects | Tool schema, permissions, errors, idempotency, external state | Contract-faithful fake in an isolated namespace | Calls, arguments, results, state diff, approvals |
| Output processing | Structured parsing, fallback, citation mapping, policy filtering | None unless the parser itself is the unit under test | Raw provider output and final user-visible output |
| Delivery | Streaming, status, error mapping, persistence, analytics | In-memory sink with the same event contract | Events, finish reason, persisted record IDs |

OpenAI's [evaluation best-practices guide](https://developers.openai.com/api/docs/guides/evaluation-best-practices) calls production-mismatched datasets an anti-pattern and recommends tests that reflect real-world distributions. Anthropic goes further for agents: its [agent-eval guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) defines the agent harness as part of the evaluated system and says the eval harness should provide tools, execute tasks, capture steps, grade outputs, and aggregate results. Production parity therefore includes orchestration, not only inference.

Write the parity contract in the repository next to the harness. A reviewer should be able to answer: "Which production behavior is real, which is simulated, and why does the simulation preserve the requirement being graded?"

## Separate four objects that teams often conflate

A maintainable harness has four independent objects:

1. **Case:** immutable input, initial state, references, tags, and success criteria.
2. **Trial:** one attempt by one resolved application configuration against one case.
3. **Grade:** one scorer's result for one observable requirement, including evidence and error state.
4. **Run:** a collection of trials plus environment, dependency, dataset, and code metadata.

This separation matters because a case may have several trials, a trial may have several grades, and a run can fail without any product requirement failing. If a provider timeout is stored as a score of zero, reliability appears worse even though the agent never produced an answer. If a judge parser crashes and the harness records "fail," product and evaluation defects become indistinguishable.

Use explicit statuses such as \`completed\`, \`product_failed\`, \`grader_error\`, \`infrastructure_error\`, and \`cancelled\`. Scores belong only to completed grades. Operational policy can decide whether too many incomplete trials block a release, but the data model must retain the distinction.

## Design a versioned case format

Keep the case format framework-neutral and narrow. Business requirements should survive a future runner change. JSON Lines works well for reviewable records; larger payloads can be referenced by immutable URI and hash.

\`\`\`json
{
  "id": "support-refund-identity-required",
  "suite": "support-regression",
  "input": {
    "message": "Refund order A-104. I no longer have access to my email.",
    "actor": "customer-17"
  },
  "initial_state": {
    "order_status": "delivered",
    "identity_verified": false,
    "refund_status": "none"
  },
  "expected": {
    "refund_status": "none",
    "required_action": "request_identity_verification"
  },
  "tags": ["refund", "authorization", "negative-path"],
  "schema_version": 1
}
\`\`\`

The case states outcomes, not a script that forces one sentence or one exact tool sequence. The negative-path tag is important: an eval that tests only successful refunds can reward an agent that refunds everything. Anthropic recommends balanced tasks that cover when a behavior should and should not occur, and reference solutions that prove cases and graders are solvable.

Validate case files before calling any model. Reject duplicate IDs, missing references, unknown schema versions, invalid initial states, and impossible success criteria. Dataset defects are cheaper to fix at load time than after a costly run.

## Route evals through one application port

Create a narrow interface representing the production application, not the provider SDK. Production adapters can attach web or queue transport; eval adapters call the same service function directly. This avoids HTTP overhead without bypassing business logic.

The following is application-owned sample code. \`ApplicationPort\`, \`EvalCase\`, and \`TrialResult\` are illustrative interfaces, not APIs from a vendor:

\`\`\`python
from __future__ import annotations

from dataclasses import asdict, dataclass
from hashlib import sha256
from time import perf_counter
from typing import Any, Protocol


@dataclass(frozen=True)
class RunConfig:
    model: str
    prompt_version: str
    toolset_version: str
    max_attempts: int = 1


@dataclass(frozen=True)
class EvalCase:
    case_id: str
    request: dict[str, Any]
    initial_state: dict[str, Any]
    expected: dict[str, Any]


@dataclass(frozen=True)
class AppResult:
    output: dict[str, Any]
    trace: list[dict[str, Any]]
    final_state: dict[str, Any]
    usage: dict[str, int]


class ApplicationPort(Protocol):
    def invoke(
        self,
        request: dict[str, Any],
        initial_state: dict[str, Any],
        config: RunConfig,
    ) -> AppResult: ...


def stable_hash(value: object) -> str:
    import json

    encoded = json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    return sha256(encoded).hexdigest()


def execute_trial(app: ApplicationPort, case: EvalCase, config: RunConfig) -> dict[str, Any]:
    started = perf_counter()
    result = app.invoke(case.request, case.initial_state, config)
    return {
        "case_id": case.case_id,
        "config": asdict(config),
        "input_hash": stable_hash(case.request),
        "output": result.output,
        "trace": result.trace,
        "final_state": result.final_state,
        "usage": result.usage,
        "latency_ms": round((perf_counter() - started) * 1000, 3),
    }
\`\`\`

The function records the resolved configuration and returns raw evidence; it does not grade. That makes trials replayable through a new grader without paying for generation again. In production code, catch and classify exceptions at this boundary, record attempts separately, and redact sensitive fields before durable storage.

## Use dependency injection for controlled external systems

Do not patch deep provider functions differently in each test. Construct production services from explicit dependencies: model client, retriever, tool registry, clock, identity service, and persistence port. The eval assembles the same service with controlled implementations.

Controlled does not mean simplistic. A fake tool must enforce the same input schema, authorization, idempotency, and error categories that matter to the test. If the production payment tool rejects duplicate idempotency keys but the fake accepts them, the harness can approve a retry bug. Add contract tests that run against both the fake and a safe real test environment.

Pytest's official [fixture guidance](https://docs.pytest.org/en/stable/how-to/fixtures.html) supports managed setup and teardown, while its [monkeypatch fixture](https://docs.pytest.org/en/stable/how-to/monkeypatch.html) safely restores changed attributes, mappings, and environment variables. Prefer constructor injection for core boundaries and use monkeypatch for narrow process-level state such as a fixed environment flag.

Here is a deterministic outcome test against the same application port:

\`\`\`python
def test_unverified_customer_cannot_trigger_refund(app_with_fake_tools):
    case = EvalCase(
        case_id="support-refund-identity-required",
        request={
            "message": "Refund order A-104. I cannot access my email.",
            "actor": "customer-17",
        },
        initial_state={
            "order_status": "delivered",
            "identity_verified": False,
            "refund_status": "none",
        },
        expected={"refund_status": "none"},
    )
    config = RunConfig(
        model="resolved-by-test-environment",
        prompt_version="support-v7",
        toolset_version="support-tools-v3",
    )

    trial = execute_trial(app_with_fake_tools, case, config)

    assert trial["final_state"]["refund_status"] == "none"
    refund_calls = [
        event for event in trial["trace"]
        if event.get("type") == "tool_call" and event.get("name") == "process_refund"
    ]
    assert refund_calls == []
\`\`\`

This test intentionally makes the safety invariant strict: no refund side effect and no attempted refund tool call. A separate semantic grader can judge whether the response explains the verification step helpfully, but tone must not compensate for an unauthorized action.

## Reproduce production prompt and context assembly

Prompt text is only one input. The harness should call the production renderer with the same developer instructions, message roles, tool schemas, memory rules, retrieval filters, context budget, and output schema. Record a normalized prompt/context hash and enough non-sensitive metadata to explain a difference.

For RAG, offer two modes:

- **Frozen retrieval mode** injects a versioned list of document IDs and chunks. It isolates generation and grading from index drift.
- **Live retrieval mode** queries a production-like index snapshot. It measures the assembly and detects ranking, filtering, or chunking regressions.

Run fast frozen cases on pull requests and live retrieval cases on a scheduled or pre-release job. Compare retrieved IDs and ranks before scoring answer quality. The [RAG regression guide](/blog/rag-regression-testing-guide) explains how retrieval and generation failures can otherwise cancel each other in an aggregate score.

For conversations, preserve production history construction. Do not hand a judge the full untruncated transcript if production summarizes or compacts it before the model call. Record both the canonical conversation and the exact context sent for each turn.

## Model settings, retries, and time

Record the provider-visible model identifier, not a friendly alias alone. Also record temperature or sampling controls where supported, maximum output limits, reasoning settings, seed where supported, request timeout, retry policy, and fallback route. Do not claim temperature zero guarantees determinism; provider implementation, model updates, tool results, and concurrency can still vary.

Retries create a measurement choice. A user-facing service that retries a transient failure should be evaluated with that retry policy for end-to-end reliability. But retain each attempt so you can separately see first-attempt quality, recovered infrastructure errors, and final task success. Never overwrite a failed attempt with the successful retry.

Use a fixed clock for expiration, scheduling, and date-sensitive logic, then include that timestamp in the case. If a test says "today" without a recorded date and locale, it is not replayable.

## Isolate every trial

Anthropic's guidance says each trial should start clean because shared files, caches, exhausted resources, database state, or history can create correlated failures and artificial performance. Implement isolation at every mutable boundary:

- Unique trial ID and namespace for database rows, queues, object storage, and external test accounts.
- Fresh filesystem or sandbox when agents can read and write files.
- Empty application cache, or a deliberately recorded warm-cache mode.
- Fixed dependency snapshots for search indexes, policies, schemas, and tools.
- Bounded concurrency aligned with production limits and test-resource capacity.
- Idempotent teardown that records cleanup failure rather than hiding it.

Run the same case twice in different namespaces as an isolation test. Then deliberately contaminate one namespace and prove the other trial is unchanged. Isolation is a harness feature and deserves its own tests.

## Layer graders over retained evidence

Grade the cheapest objective facts first. Parse output, validate schema, inspect state, execute code, check tool authorization, and verify citations before invoking a model judge. A deterministic prerequisite failure may make a later semantic grade irrelevant; mark it skipped with a reason instead of assigning an arbitrary zero.

A useful grade record contains:

\`\`\`json
{
  "case_id": "support-refund-identity-required",
  "trial_id": "run-481-trial-03",
  "grader": "refund-state-invariant",
  "grader_version": "2",
  "status": "completed",
  "score": 1,
  "passed": true,
  "evidence": {
    "refund_status": "none",
    "process_refund_calls": 0
  }
}
\`\`\`

Model judges should receive only the evidence needed for one rubric dimension, return structured labels, and have an abstain path for insufficient evidence. Calibrate them against adjudicated human examples and store judge prompt and model versions. Human review should sample disagreements, high-risk cases, and new failure clusters rather than acting as an invisible cleanup queue.

## Repeat trials for the product question

Repeated trials answer different questions depending on product behavior. For a system that gets one chance, first-trial success matters. For a workflow allowed several independent proposals, at-least-one success may matter. For a customer-facing agent expected to work repeatedly, all-trials reliability matters.

If a task has an estimated independent per-trial success probability \(p\), two simple planning formulas are:

\`\`\`text
at least one success in k trials = 1 - (1 - p)^k
all k trials succeed              = p^k
\`\`\`

Anthropic calls these perspectives pass@k and pass^k and warns that they move in opposite directions as \(k\) grows. Independence is an assumption, not a fact. Shared outages, cached state, rate limits, and common retrieval snapshots correlate trials. Report the raw per-case outcomes and confidence uncertainty; do not present a formula-derived number as measured reliability when trials are correlated.

Choose trial counts from decision risk, expected variability, and budget. A pull-request smoke suite may run one trial per stable regression case; a scheduled evaluation can repeat the volatile or high-impact slices. Never hide that the two jobs answer different questions.

## Build an immutable run manifest

A result without provenance cannot support a regression decision. Write one manifest before execution and finalize it after completion. Include:

- Run ID, parent/baseline run, trigger, commit SHA, dirty-state flag, and CI job URL.
- Dataset name, schema version, content hash, included case IDs, and slice counts.
- Application build, prompt versions, retrieval snapshot, tool schema, policy version, and feature flags.
- Provider/model identifiers, generation options, timeout, retry, and fallback settings.
- Grader names, versions, judge configuration, rubrics, thresholds, and aggregation policy.
- Runtime image, dependency lock hash, region, clock, concurrency, and environment substitutions.
- Start/end timestamps, completed/incomplete counts, usage, latency, and artifact locations.

Inspect AI's [eval-log format](https://inspect.aisi.org.uk/eval-logs.html) is a useful primary-framework example: its log model preserves task and model details, execution plan, aggregate results, usage, errors, and per-sample data, and its current tooling can export run configuration for replay. Promptfoo's [output documentation](https://www.promptfoo.dev/docs/configuration/outputs/) similarly distinguishes rich result exports from compact JUnit output. Even a custom harness should meet that provenance bar.

## Aggregate by requirement and slice

Do not average unrelated criteria into one number too early. Report schema validity, task outcome, groundedness, unauthorized-action rate, grader errors, p50/p95 latency, and cost separately. Then slice by domain-relevant tags: intent, language, tenant policy, tool, retrieval difficulty, adversarial class, or conversation length.

An overall pass rate can improve while a small safety slice collapses. Require minimum coverage and explicit critical invariants. For weighted scores, publish the weights and show the component values. If a task allows partial credit, retain the assertions that earned it.

Compare candidate and baseline on matched cases. Added or removed cases change the denominator, so show common-case comparison separately from full-suite health. Do not update the baseline automatically when a candidate passes; baseline promotion should be a reviewed event with a preserved predecessor.

## CI topology that stays useful

Use several jobs rather than one giant gate:

| Job | Trigger | Typical scope | Decision |
| --- | --- | --- | --- |
| Harness unit tests | Every code change | Loaders, fakes, graders, aggregation, negative controls | Harness itself is trustworthy |
| Deterministic component evals | Pull request | Frozen outputs/retrieval and fast invariants | Parsing, policy, state, and grader regression |
| Production-path smoke eval | Pull request or merge | Small balanced suite, one controlled trial | Candidate can proceed |
| Repeated full suite | Scheduled or release | Representative slices and repeat policy | Reliability trend and release evidence |
| Shadow production eval | Sampled live traffic under policy | Real distribution with delayed/automated labels | Drift and missing-case discovery |

Cap concurrency, fail on missing cases, and enforce a maximum infrastructure-error budget. Upload artifacts even when the job fails. Keep secrets out of result exports and apply retention controls to production-derived inputs.

## Failure analysis by layer

### Eval is green but production is failing

Diff the parity contract. Common causes are a copied prompt, missing retrieval filters, different feature flags, direct provider calls, fake tools with weaker authorization, stale policy data, or a dataset that no longer represents traffic. Add the production failure as a case only after reproducing the actual path.

### Results change with no application diff

Compare manifests for model alias resolution, dependency versions, data snapshots, judge changes, clock, region, and concurrency. Then inspect infrastructure errors and raw outputs. A mutable dependency is still a change even when Git is clean.

### Failures cluster under parallel execution

Suspect shared state or resource exhaustion before blaming the model. Run the same cases serially, inspect namespace collisions, and monitor rate limits, CPU, memory, connection pools, and external test accounts. Reducing workers diagnoses the symptom; isolation and capacity controls fix it.

### A judge rejects outputs humans accept

Review the rubric, evidence supplied, output parser, judge model, and boundary examples. Split compound criteria, add an insufficient-evidence label, and recalibrate on adjudicated cases. Do not raise the threshold blindly or edit the candidate output before judging.

### Latency improves while task quality drops

Check truncation, timeouts, early stopping, skipped tools, reduced retrieval, and fallback routing. Latency is a tracked requirement, not a substitute for task success. Compare traces and finish reasons for matched cases.

### Retries make the final pass rate look healthy

Report first-attempt and final outcomes separately. Also report attempts, recovered errors, and added latency/cost. A user may tolerate a transparent retry, but an evaluation should not erase the reliability problem it recovered from.

## Version scope and limitations

This guide is current to **July 14, 2026** and is framework-neutral. The Python types are intentionally local examples, not published APIs. Adapt them to your application while preserving the separation among cases, trials, grades, and runs. Promptfoo, Inspect AI, and pytest details should be checked against the pinned versions in your lockfile and the linked official documentation.

A production-matched harness is still a model of production. Safe fakes cannot reproduce every outage, permission drift, third-party response, search-index update, or user interaction. Combine offline evals with production monitoring, feedback, A/B tests where appropriate, transcript review, and periodic human studies. Anthropic explicitly presents these as complementary methods rather than replacements.

The formulas assume a stable probability and independent trials. Real agent trials can be correlated. Thresholds, trial counts, sample sizes, and confidence requirements must come from your risk and observed variance; none in this article is an industry default.

## Frequently Asked Questions

### What is an LLM eval harness?

It is the infrastructure that loads test cases, configures and invokes the LLM application, isolates trials, captures outputs and traces, runs graders, aggregates results, and stores provenance. It is different from the agent harness, which orchestrates model and tool behavior inside one trial.

### Should an eval harness call the model provider directly?

Only when the component under test is the provider call or prompt itself. An end-to-end product eval should invoke the same application port production uses; otherwise it bypasses retrieval, policies, tools, parsing, retries, fallbacks, and state that can determine user-visible behavior.

### Can external services be mocked without losing production parity?

Yes, when the fake preserves the contract relevant to the requirement: schemas, authorization, errors, idempotency, timing behavior where important, and state changes. Run contract tests against the fake and a safe real environment. Document every substitution in the run manifest.

### How do I keep LLM evals from becoming flaky?

Isolate mutable state, pin dependencies and data snapshots, record model configuration, classify infrastructure errors separately, use deterministic graders for objective requirements, repeat only where the product question needs it, and compare distributions rather than expecting identical prose. Do not hide variance with unlimited retries.

### What should every eval result record?

At minimum: case and trial IDs, application commit/build, dataset and prompt hashes, model/provider configuration, retrieval and tool versions, raw output, final state, observable trace, grader versions, evidence, status, timing, usage, and environment substitutions. Apply redaction and retention policy before storage.

### How many trials should each case run?

There is no universal number. Use one for fast deterministic smoke checks, and repeat cases when variability or the release decision requires a reliability estimate. Base the count on risk, observed variance, desired uncertainty, and budget. Report the policy and raw outcomes.

### Should CI fail when the provider times out?

The run may need to block because evidence is incomplete, but record the event as an infrastructure error, not a product-quality failure. Set a reviewed tolerance for incomplete trials, preserve attempts, and ensure the report tells owners whether to debug the application, grader, or environment.

### How often should the dataset change?

Add real failures, new requirements, distribution shifts, and adversarial cases through review. Keep stable IDs and version every change. Compare candidate and baseline on the same case set, then report new-case health separately so denominator changes cannot masquerade as quality movement.
`,
    },
  },
  {
    slug: 'deterministic-graders-vs-llm-judge-human-review-2026',
    clusterId: 'llm-agent-testing',
    post: {
      title: 'Deterministic Graders vs LLM Judges vs Human Review',
      description:
        'Choose deterministic graders, calibrated LLM judges, or human review using task risk, objective evidence, agreement checks, cost, and escalation rules.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Comparison',
      image: '/blog/pillars/llm-agent-testing.png',
      imageAlt:
        'Decision scale balancing deterministic code checks, calibrated LLM judges, and expert human review for AI outputs',
      primaryKeyword: 'deterministic graders vs llm judge',
      keywords: [
        'deterministic graders vs llm judge',
        'LLM judge vs human evaluation',
        'LLM evaluation graders',
        'deterministic LLM testing',
        'human review AI evaluation',
        'LLM judge calibration',
        'hybrid LLM grading',
        'AI evaluation rubric',
      ],
      contentKind: 'child',
      pillarSlug: 'testing-llm-applications-guide',
      relatedSlugs: [
        'testing-llm-applications-guide',
        'openai-evals-platform-shutdown-migration-2026',
        'llm-eval-harness-production-guide-2026',
        'ai-agent-eval-testing-guide',
      ],
      sources: [
        'https://developers.openai.com/api/docs/guides/evaluation-best-practices',
        'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents',
        'https://www.promptfoo.dev/docs/configuration/expected-outputs/',
        'https://www.promptfoo.dev/docs/configuration/expected-outputs/python/',
        'https://www.promptfoo.dev/docs/configuration/outputs/',
      ],
      content: `For **deterministic graders vs LLM judge** decisions, use deterministic code whenever correctness can be computed from observable evidence; use a calibrated LLM judge for bounded semantic criteria that code cannot express; and use human review to define the standard, resolve consequential ambiguity, and audit automated graders. Most production evals need all three in that order. Never ask a judge whether JSON parses, never ask regex to decide whether advice is genuinely helpful, and never spend expert time rechecking every obvious schema violation. Escalate only after cheaper evidence has been retained.

Use the [complete LLM testing guide](/blog/testing-llm-applications-guide) for the full quality system. The sibling guides cover the [OpenAI Evals shutdown migration](/blog/openai-evals-platform-shutdown-migration-2026), a [production-matched eval harness](/blog/llm-eval-harness-production-guide-2026), and [tool-using agent evaluation](/blog/ai-agent-eval-testing-guide). Go deeper on semantic scoring in the canonical [LLM-as-a-judge guide](/blog/llm-as-a-judge-evaluation-guide) and on retrieval evidence in the [Ragas RAG evaluation guide](/blog/ragas-rag-evaluation-guide). Reusable QA instructions are available in [/skills](/skills), including the [Playwright CLI skill](/skills/Pramod/playwright-cli) for collecting browser-visible evidence before grading.

## The decision in one table

| Question | Deterministic grader | LLM judge | Human review |
| --- | --- | --- | --- |
| Best evidence | Parsed output, executable behavior, state, known reference, policy rule | Input, candidate, reference/context, narrow rubric | Same evidence plus domain context and adjudication guidance |
| Best tasks | Schema, exact label, numeric tolerance, tests, tool arguments, forbidden action | Relevance, faithfulness, completeness, tone, comparative quality | Ambiguous, novel, subjective, high-risk, or disputed cases |
| Reproducibility | Reproducible when inputs and code are pinned | Variable; model and rubric must be versioned | Reviewer and process dependent |
| Unit cost and speed | Usually lowest and fastest | Provider call plus parsing and retries | Usually highest and slowest |
| Main weakness | Rejects valid variation or misses semantic harm | Can misread rubric, evidence, or boundary; needs calibration | Limited scale, disagreement, fatigue, specialist availability |
| Release role | Hard invariant or precise metric | Calibrated semantic signal or comparison | Standard-setting, audit, escalation, and high-risk approval |

Anthropic's [agent-evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) uses the same three-way classification. It describes code graders as objective, reproducible, inexpensive, and debuggable but potentially brittle; model graders as flexible and scalable for open-ended work but nondeterministic and calibration-dependent; and human graders as high-quality expert judgment that is slow and costly. The useful conclusion is not that one wins. Each method should own the requirements its evidence can actually support.

## Convert requirements into atomic claims

Do not start by selecting a grader. Start by decomposing "good answer" into claims that can independently pass, fail, abstain, or error.

Consider a support response that must:

1. Be valid JSON with \`answer\` and \`citations\` fields.
2. Cite only documents retrieved for this request.
3. State the cancellation deadline exactly as the approved policy provides it.
4. Answer the customer's question without irrelevant procedural detail.
5. Use a calm, non-dismissive tone.
6. Avoid initiating cancellation until identity is verified.

Claims 1, 2, 3, and 6 have objective evidence and belong in code. Claims 4 and 5 are semantic and can use a calibrated judge. A policy owner or support quality reviewer defines examples for relevance and tone, adjudicates uncertain cases, and audits the judge. One "overall quality: 1-5" grader would hide which requirement failed and allow strong tone to compensate for an unauthorized action.

Atomic grading also makes partial credit honest. A response can be relevant but ungrounded, safe but incomplete, or correct but malformed. Store each result separately, then define a transparent release rule.

## Deterministic graders: make objective rules executable

A deterministic grader is any pinned computation whose output is fixed for the same evidence. It can be a string comparison, parser, schema validator, SQL query, state check, unit test, static analyzer, citation-set comparison, numeric formula, or tool-call invariant.

Prefer it when the requirement can be stated without asking for opinion:

- Output parses and satisfies a schema.
- Classification belongs to an allowed label set.
- A price or date equals an authoritative reference after normalization.
- Generated code passes required tests without breaking existing tests.
- Retrieved IDs include a required source.
- Every cited ID came from the retrieved set.
- A refund row exists exactly once, with the approved amount.
- A forbidden tool was never called.
- Latency and cost evidence stay within a product-defined budget.

The critical phrase is **observable evidence**. Do not grade a response string for "refund completed" when the real outcome is a database state change. Conversely, do not require an exact sentence when several truthful phrasings satisfy the user.

### Example: a deterministic structured-response grader

This application-owned function returns a detailed result rather than one unexplained Boolean. It uses only Python's standard library and checks format, citation provenance, deadline value, and action safety:

\`\`\`python
import json
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Check:
    name: str
    passed: bool
    evidence: Any


def grade_support_response(
    raw_output: str,
    retrieved_ids: set[str],
    expected_deadline_days: int,
    final_state: dict[str, Any],
) -> list[Check]:
    try:
        body = json.loads(raw_output)
    except json.JSONDecodeError as error:
        return [Check("valid_json", False, {"error": str(error)})]

    checks = [
        Check("answer_is_text", isinstance(body.get("answer"), str), type(body.get("answer")).__name__),
        Check("citations_is_list", isinstance(body.get("citations"), list), body.get("citations")),
        Check("deadline_exact", body.get("deadline_days") == expected_deadline_days, body.get("deadline_days")),
        Check("no_unverified_cancellation", final_state.get("cancelled") is False, final_state),
    ]

    citations = body.get("citations", [])
    if isinstance(citations, list):
        checks.append(
            Check(
                "citations_were_retrieved",
                all(isinstance(item, str) and item in retrieved_ids for item in citations),
                {"cited": citations, "retrieved": sorted(retrieved_ids)},
            )
        )
    return checks
\`\`\`

Unit-test malformed JSON, missing fields, wrong types, duplicate or invented citations, values immediately around the deadline, and prohibited state changes. Promptfoo's official [Python assertion documentation](https://www.promptfoo.dev/docs/configuration/expected-outputs/python/) likewise supports Boolean or numeric results for custom checks, but a repository-owned function should still have direct unit tests independent of the eval runner.

### Where deterministic grading goes wrong

Determinism does not guarantee validity. A wrong rule fails consistently. Common mistakes include exact matching unnormalized whitespace, demanding one tool sequence when several are valid, comparing floating values without a business tolerance, reading a self-reported outcome instead of environment state, and writing tests for an unstated file path or hidden precondition.

Anthropic recommends reference solutions that pass all graders and warns against rigid path grading when agents can find valid alternatives. Add positive controls, negative controls, and boundary fixtures. A grader that only sees passing examples has not demonstrated selectivity.

## LLM judges: constrain semantics rather than outsourcing judgment

Use a judge when the requirement is semantic, bounded, and supported by evidence the judge can read. Good candidates include whether an answer addresses every part of a question, whether claims are supported by supplied context, whether a summary preserves material qualifications, and which of two responses better satisfies a narrow rubric.

OpenAI's [evaluation best-practices guide](https://developers.openai.com/api/docs/guides/evaluation-best-practices) says models are stronger at discrimination and recommends pairwise comparison, classification, or scoring against explicit criteria rather than open-ended evaluation. Give the judge a small decision space and anchored examples. Do not ask it to invent the standard while applying it.

A judge contract should name:

- One criterion or a small set of independently scored dimensions.
- Exact evidence: user request, candidate, approved context/reference, and observable outcome.
- Labels with operational meanings, including an insufficient-evidence option.
- Positive, negative, and boundary examples approved by domain reviewers.
- A structured response schema and parser behavior.
- Judge model, prompt, settings, and version.
- Escalation rule and calibration dataset.

### Example: a bounded rubric in Promptfoo

Promptfoo documents model-graded assertions and a \`provider\` override for assertions in its [assertion reference](https://www.promptfoo.dev/docs/configuration/expected-outputs/). This illustrative test keeps factual invariants separate and asks the judge only about relevance:

\`\`\`yaml
providers:
  - openai:gpt-5-mini

tests:
  - description: cancellation answer stays relevant
    vars:
      question: Can I cancel after shipment?
      policy: Cancellation is unavailable after shipment. A return may be requested after delivery.
    assert:
      - type: is-json
      - type: llm-rubric
        provider: openai:gpt-5-mini
        value: |
          Judge only relevance to the QUESTION.
          PASS: directly answers cancellation after shipment and may briefly name the return alternative.
          FAIL: omits the cancellation answer or adds unrelated procedures.
          UNKNOWN: the candidate output is missing or unreadable.
          Do not judge policy correctness here; a separate deterministic check owns that rule.
\`\`\`

The provider shown is an example configuration, not a recommendation that the tested and judging model should always match. In a real suite, pass the question, policy, and candidate through the runner's documented template context and verify the rendered judge prompt. Keep a frozen set of candidate outputs so judge changes can be tested without regenerating answers.

### Pointwise, pairwise, and reference-based choices

Use **pointwise labels** for an absolute release criterion such as PASS, FAIL, or UNKNOWN. Use **pairwise comparison** to choose between prompt or model candidates on one criterion. Run both A/B and B/A orderings and inspect inconsistent decisions rather than assuming presentation order is harmless. Use **reference-based grading** when an approved answer or checklist anchors the judgment, but tell the judge to preserve meaning rather than reward copied wording.

Pairwise preference does not establish that either candidate meets an absolute safety requirement. A less harmful answer can still be unacceptable. Apply hard invariants before preference grading and retain an absolute acceptance check where the release decision requires one.

## Human review: make it a process, not a fallback label

Human review serves four distinct jobs:

1. **Standard-setting:** define rubrics, examples, and what evidence is material.
2. **Calibration:** label a representative set for automated-grader comparison.
3. **Adjudication:** resolve reviewer or grader disagreements using documented policy.
4. **Audit and discovery:** sample normal cases and inspect new failure clusters for blind spots.

Those jobs need different sampling. Calibration requires cases across labels and decision boundaries. Adjudication selects disagreements. Audit should include random ordinary traffic, not only dramatic failures. Discovery over-samples new products, languages, tools, user populations, and changed distributions.

Blind reviewers to model/provider identity when comparing candidates, randomize presentation, and hide the current automated verdict until the independent label is recorded. Train with examples, allow "insufficient evidence," and capture a reason code. For specialized legal, medical, financial, safety, or policy decisions, use appropriately qualified reviewers and governance; a general annotation pool cannot manufacture domain authority.

Human review is not automatically correct. Reviewers disagree, tire, infer unstated rules, and can be influenced by formatting. Use at least two independent labels for the calibration subset when risk justifies it, then adjudicate disagreements. Measure agreement before treating the labels as ground truth.

## Measure judge agreement with labels

Raw agreement is easy to understand but does not account for agreement expected from label prevalence. Cohen's kappa is one option for two raters on categorical labels:

\`\`\`text
observed agreement Po = matching labels / total labels
chance agreement Pe   = sum over labels of P(human=label) * P(judge=label)
kappa                 = (Po - Pe) / (1 - Pe)
\`\`\`

This standard-library implementation makes the assumptions visible and rejects mismatched inputs:

\`\`\`python
from collections import Counter


def categorical_agreement(human: list[str], judge: list[str]) -> dict[str, float]:
    if len(human) != len(judge) or not human:
        raise ValueError("human and judge labels must have the same non-zero length")

    labels = set(human) | set(judge)
    total = len(human)
    observed = sum(left == right for left, right in zip(human, judge, strict=True)) / total
    human_counts = Counter(human)
    judge_counts = Counter(judge)
    expected = sum(
        (human_counts[label] / total) * (judge_counts[label] / total)
        for label in labels
    )
    kappa = (observed - expected) / (1 - expected) if expected < 1 else 1.0
    return {"observed_agreement": observed, "expected_agreement": expected, "kappa": kappa}


human_labels = ["PASS", "FAIL", "FAIL", "PASS", "UNKNOWN", "PASS"]
judge_labels = ["PASS", "FAIL", "PASS", "PASS", "UNKNOWN", "FAIL"]
print(categorical_agreement(human_labels, judge_labels))
\`\`\`

Do not copy a generic kappa threshold into a release gate. Review the confusion matrix by label and business consequence. A judge that agrees on abundant PASS examples but misses rare unsafe FAIL cases can have an attractive aggregate while being unfit for the job. Measure false acceptance and false rejection on the decision boundary, with uncertainty, and inspect every high-consequence error.

If humans disagree heavily, fix the rubric or evidence before optimizing the judge. Automating an unstable standard only produces disagreement faster.

## A risk-based grader allocation

Allocate each requirement with two questions: **Can objective evidence decide it?** and **What happens if the grader is wrong?**

| Requirement | Primary grader | Secondary control | Human role |
| --- | --- | --- | --- |
| Valid JSON and required fields | Parser/schema code | Negative fixtures | Review schema changes only |
| Tool called with authorized account ID | Trace/state assertion | Contract test against tool | Investigate disputed authorization policy |
| Answer supported by supplied sources | Claim/evidence checks plus narrow judge where needed | Citation provenance code | Label subtle entailment cases |
| Helpful and concise support tone | Calibrated model rubric | Length and prohibited-language code | Define examples and audit drift |
| Generated patch solves issue | Executable tests | Static analysis and regression suite | Review maintainability or domain nuance |
| High-impact medical recommendation | Deterministic policy constraints plus specialist review | Calibrated assistive judge, not sole authority | Qualified expert owns acceptance |
| Prompt A vs B preference | Pairwise judge on one criterion | Swap order and retain ties | Calibrate and adjudicate close cases |

"Human in the loop" should not be used to excuse an unsafe automatic path. For a consequential action, deterministic authorization and approval controls belong in the application, not only in post-run evaluation. Human grading measures behavior; it does not replace runtime safeguards.

## Compose graders without hiding failures

A robust gate can use **hard invariants**, **semantic requirements**, and **review escalation**:

\`\`\`python
def release_decision(grades: dict[str, str]) -> str:
    hard_invariants = ["valid_schema", "authorized_action", "citation_provenance"]
    if any(grades.get(name) != "PASS" for name in hard_invariants):
        return "REJECT"

    semantic = [grades.get("relevance"), grades.get("tone")]
    if "FAIL" in semantic:
        return "REJECT"
    if "UNKNOWN" in semantic or None in semantic:
        return "HUMAN_REVIEW"
    return "ACCEPT"
\`\`\`

This is an illustrative policy shape, not a universal gate. Its important property is non-compensation: excellent tone cannot offset an unauthorized action. Unknown evidence does not become failure or pass; it routes to review. Store each grade and evidence even when the final decision is obvious.

Weighted averages are appropriate only when dimensions genuinely trade off. Publish weights, direction, normalization, and threshold. Keep critical minimums beside the total. If one judge scores several dimensions, preserve each dimension separately and test whether a compound rubric creates correlated errors.

## Control cost without degrading validity

Use a cascade:

1. Run parsers, state checks, executable tests, and policy invariants.
2. Skip semantic grading when prerequisites make the candidate unusable.
3. Use a calibrated judge on the remaining semantic criteria.
4. Escalate judge UNKNOWN, boundary scores, disagreements, novel slices, and high-risk cases.
5. Sample accepted ordinary cases for ongoing human audit.

Cache judge decisions only when the case, candidate output, evidence, rubric, judge model, and settings are all identical. A cache keyed only by candidate text is invalid when the policy context changes. Record cache hits in the grade provenance.

Shorter rubrics are not necessarily cheaper if ambiguity causes retries and review. Optimize after validity: remove irrelevant context, split dimensions, require structured labels, and cap explanations while retaining enough evidence to diagnose decisions.

## Failure analysis

### Exact-match failures dominate otherwise good outputs

Decide whether exact wording is a real contract. Normalize case, whitespace, Unicode, ordering, or numeric representation only where the business meaning permits it. If multiple answers are valid, switch to set membership, executable behavior, reference facts, or a bounded semantic grader.

### The LLM judge passes fluent but incorrect answers

Check whether the judge received authoritative context and whether correctness was combined with style in one rubric. Move known facts and state into deterministic checks. Ask the judge one grounded criterion, include FAIL boundary examples, and measure false acceptance against human labels.

### Human reviewers disagree on many cases

Inspect whether the task, evidence, and rubric are ambiguous. Add anchored examples and an insufficient-evidence option, then relabel independently. Do not average conflicting categorical judgments without adjudication when the result controls a consequential gate.

### Judge results change after a model update

Treat the judge as a versioned dependency. Replay frozen candidates through old and new judge configurations, compare label confusion by slice, and review changed high-risk decisions. Do not silently resolve a floating alias and continue the old baseline.

### The hybrid score passes despite a safety failure

The aggregation permits compensation. Make authorization, privacy, safety, schema, and other non-negotiable requirements hard invariants. Calculate an average only after those pass, and retain the failed dimension in the report.

### Review queues grow without bound

Separate grader errors from genuine uncertainty, narrow compound rubrics, improve evidence, and cluster repeated disputes into new deterministic rules or rubric examples. Set service ownership and prioritization by risk. Never auto-accept merely because the queue is old.

## Version scope and limitations

This comparison is current to **July 14, 2026**. It does not rank specific judge models or claim a universal cost, agreement rate, or threshold. Model behavior, provider pricing, and framework syntax change; pin configurations and use the linked primary docs for the version in your repository.

The Promptfoo YAML demonstrates documented assertion concepts but is not a complete application integration. Verify rendered variables and provider configuration locally. The Python graders and release function are application-owned examples, not framework APIs. They need unit tests, error classification, privacy controls, and domain-specific evidence before production use.

Cohen's kappa is one categorical agreement measure, not proof of grader validity. Label prevalence, sample selection, reviewer quality, task risk, and asymmetric error costs matter. For ordinal scores, multiple reviewers, or continuous values, choose an analysis appropriate to that design with statistical review.

Automated evaluation cannot eliminate human accountability for high-impact decisions. It can focus expert attention and make evidence repeatable. Runtime permissions, approval gates, monitoring, incident response, and user recourse remain separate controls.

## Frequently Asked Questions

### Are deterministic graders always better than an LLM judge?

They are better for requirements computable from objective evidence because they are reproducible and easy to debug. They are not better at nuanced semantic judgments that cannot be reduced to a correct parser, state check, reference, or executable test. Use each method for its evidence.

### When should I use an LLM-as-a-judge?

Use one for bounded semantic criteria such as relevance, faithfulness to supplied context, completeness, or comparative preference. Give it explicit labels, narrow evidence, anchored examples, structured output, an insufficient-evidence path, and calibration against independent human labels.

### Does human review count as the ground truth?

It can define the reference standard when qualified reviewers follow a clear process, but individual humans are not infallible. Measure independent reviewer agreement, adjudicate consequential disputes, document qualifications, and revise ambiguous tasks before treating labels as calibration truth.

### Can one overall quality score replace several graders?

Usually not. It hides failure causes and allows strengths to compensate for critical weaknesses. Keep correctness, grounding, safety, relevance, tone, latency, and cost separate. Create a roll-up only for a specific decision and preserve non-compensable invariants.

### Should the judge model be different from the model under test?

Model-family diversity can be a useful experiment, but it does not remove the need for calibration. Select a judge by measured agreement on your rubric and slices, test configuration changes on frozen outputs, and retain human audit. Do not infer validity from provider identity alone.

### How large should the human-labeled calibration set be?

There is no universal size. It must cover labels, important slices, edge cases, and the decision boundary with enough evidence to estimate consequential errors. Start from independently reviewed real cases, report uncertainty, and expand where disagreement or risk is concentrated.

### How do I handle a judge that returns UNKNOWN?

Retain UNKNOWN as insufficient evidence and route it according to risk: obtain missing context, retry only a genuine transient error, or request human review. Do not coerce it to PASS, and do not count it as product FAIL when the candidate was never validly judged.

### Can LLM judges be used in CI?

Yes, after calibration and with pinned rubrics, structured output, error classification, budget controls, retained evidence, and a policy for disagreement or abstention. Keep deterministic invariants first and avoid making a variable semantic score the only release signal.
`,
    },
  },
  {
    slug: 'ai-agent-eval-testing-guide',
    clusterId: 'llm-agent-testing',
    post: {
      title: 'AI Agent Evaluation Guide for Tools, Trajectories, and Task Success',
      description:
        'Evaluate AI agents across task outcomes, tool selection and arguments, trajectories, environment state, repeated trials, safety, latency, and cost.',
      date: '2026-04-13',
      updated: '2026-07-14',
      category: 'Guide',
      image: '/blog/pillars/llm-agent-testing.png',
      imageAlt:
        'AI agent evaluation stack connecting tool calls and trajectories to sandbox state changes and verified task outcomes',
      primaryKeyword: 'ai agent evaluation',
      keywords: [
        'ai agent evaluation',
        'AI agent testing',
        'agent tool use evaluation',
        'agent trajectory evaluation',
        'agent task success metrics',
        'agent eval framework',
        'AI agent regression testing',
        'LLM agent evaluation guide',
      ],
      contentKind: 'child',
      pillarSlug: 'testing-llm-applications-guide',
      relatedSlugs: [
        'testing-llm-applications-guide',
        'openai-evals-platform-shutdown-migration-2026',
        'llm-eval-harness-production-guide-2026',
        'deterministic-graders-vs-llm-judge-human-review-2026',
      ],
      sources: [
        'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents',
        'https://developers.openai.com/api/docs/guides/agent-evals',
        'https://developers.openai.com/api/docs/guides/evaluation-best-practices',
        'https://developers.openai.com/api/docs/deprecations',
        'https://openai.com/index/introducing-agentkit/',
        'https://inspect.aisi.org.uk/eval-logs.html',
        'https://inspect.aisi.org.uk/scanners.html',
      ],
      content: `**AI agent evaluation** should grade the verified task outcome first, then required or forbidden tool behavior, safety and policy invariants, the observable trajectory, final-response quality, and operational budgets across repeated isolated trials. Give the agent a realistic task, production-matched tools, and a clean environment; record every model call, tool call, result, handoff, approval, and state change; then use deterministic outcome checks wherever possible and calibrated semantic graders only where necessary. Do not declare success because the agent says it succeeded, and do not reject a valid solution merely because it followed an unexpected path.

This guide extends the [complete LLM testing pillar](/blog/testing-llm-applications-guide) and connects the sibling [OpenAI Evals migration checklist](/blog/openai-evals-platform-shutdown-migration-2026), [production eval harness guide](/blog/llm-eval-harness-production-guide-2026), and [grader comparison](/blog/deterministic-graders-vs-llm-judge-human-review-2026). Use the canonical [agent tool-use regression guide](/blog/agent-tool-use-regression-testing-guide-2026) for deeper tool cases and the [RAG regression guide](/blog/rag-regression-testing-guide) for research-agent retrieval. Browse [/skills](/skills) and the [Playwright CLI skill](/skills/Pramod/playwright-cli) when a browser-using agent's outcome must be verified against the real UI and backend evidence.

## Use a precise agent-eval vocabulary

Anthropic's [2026 agent-evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) provides a useful separation of concerns:

- A **task** is one test case with input and success criteria.
- A **trial** is one attempt at that task.
- A **grader** scores one aspect of performance and may contain several assertions.
- A **transcript**, trace, or trajectory records the interactions and intermediate evidence in a trial.
- An **outcome** is the final state of the environment.
- An **agent harness** or scaffold orchestrates the model, tools, and loop.
- An **evaluation harness** runs tasks, isolates trials, records evidence, grades, and aggregates.
- An **evaluation suite** groups tasks around a capability or behavior.

These terms prevent a misleading shortcut: the final assistant message is neither the outcome nor the full trajectory. A booking agent can write "reserved" while no reservation exists. A coding agent can announce tests passed without running them. Grade the environment, then use the response as additional evidence.

## The outside-in evaluation stack

Start at the layer closest to user value and move inward only to diagnose or enforce a necessary constraint.

| Layer | Core question | Evidence | Preferred grader |
| --- | --- | --- | --- |
| Task outcome | Did the requested real-world state become true? | Database, files, application state, executable tests, delivered artifact | Deterministic state or executable check |
| Safety and policy | Did the agent avoid prohibited or unapproved effects? | State diff, permissions, approvals, sensitive-data sinks | Hard deterministic invariant |
| Tool use | Were necessary tools selected with valid, authorized arguments and results used correctly? | Tool calls, schemas, parameters, results, errors | Contract and trace assertions; semantic check where needed |
| Trajectory | Was the observable route acceptable, efficient, and recoverable without requiring one exact sequence? | Model/tool events, handoffs, retries, turns, stop reason | Invariants plus targeted rubric |
| Final response | Did the agent communicate the verified result accurately and appropriately? | User-visible response plus outcome evidence | Deterministic facts plus calibrated judge |
| Operations | Did the trial stay within product reliability, latency, usage, and cost requirements? | Attempts, timing, tokens, calls, errors | Numeric policy and distribution report |

Outcome-first does not mean trajectories are irrelevant. A dangerous action followed by a compensating action can leave the final state looking correct. An agent can also reach the right answer by reading forbidden data. Keep hard trajectory and authorization invariants, but avoid requiring one idealized sequence when several safe routes solve the task.

OpenAI's current [agent workflow evaluation guide](https://developers.openai.com/api/docs/guides/agent-evals) describes traces as end-to-end records of model calls, tool calls, guardrails, and handoffs, and positions trace grading as a way to find workflow-level failures. That conceptual model remains useful. However, the hosted Evals dashboard and API are under the June 3 deprecation schedule, so new implementation should follow the [code-first migration guide](/blog/openai-evals-platform-shutdown-migration-2026) rather than add a lasting platform dependency.

## Write tasks that specify success, not hidden preferences

A strong task gives an agent everything a competent operator would need and makes every graded requirement discoverable. Include:

1. User goal and relevant actor or tenant.
2. Initial environment state.
3. Available tools, permissions, and approval boundaries.
4. Observable success criteria.
5. Prohibited side effects and non-negotiable policies.
6. Time, locale, or data snapshot when relevant.
7. Maximum operational boundary such as turns or elapsed time, if it is a real product requirement.
8. Reference solution or known-good execution proving the task is solvable.

Do not hide that a file must be created at one exact path if the grader expects that path. Do not ask for "a reasonable refund" and grade against an unstated amount. Anthropic advises that two domain experts should independently reach the same pass/fail decision and that grader-checked facts should be clear from the task.

This framework-neutral YAML shows a support-agent task. It is a content model, not an API for OpenAI, Anthropic, or Inspect:

\`\`\`yaml
id: refund-damaged-item-unverified-customer
suite: support-regression
user_goal: Replace a damaged item from order A-104.
initial_state:
  order_status: delivered
  identity_verified: false
  replacement_status: none
available_tools:
  - lookup_order
  - verify_identity
  - create_replacement
success:
  - replacement_status remains none until identity is verified
  - agent requests an approved verification step
forbidden:
  - create_replacement before verification
  - disclose account data not returned by an authorized tool
tracked:
  - turns
  - tool_calls
  - latency_ms
  - token_usage
\`\`\`

Include the opposite case where identity is already verified and replacement is allowed. Balanced positive and negative tasks expose both under-triggering and over-triggering. An agent that never uses a risky tool can look safe while failing every legitimate user goal.

## Build a real environment with controlled state

An agent eval needs a world it can change. The world may be a temporary database, container, repository checkout, browser profile, simulated inbox, or an in-memory domain model. It must enforce the contracts that matter and expose final state independently of the agent's narration.

Use a fresh namespace or sandbox per trial. Reset clocks, files, caches, queues, and external accounts. Record the initial-state hash and final-state diff. If a trial can inspect artifacts from a previous trial, measured capability may be inflated; if trials share exhausted resources, failures become correlated.

### Example: outcome grading with a contract-faithful tool

This minimal Python environment enforces authorization in the tool itself and grades the resulting state. The agent callback is application-owned; no vendor API is implied:

\`\`\`python
from dataclasses import dataclass, field
from typing import Callable


@dataclass
class SupportEnvironment:
    identity_verified: bool = False
    replacement_status: str = "none"
    events: list[dict[str, object]] = field(default_factory=list)

    def verify_identity(self, answer: str) -> dict[str, object]:
        self.identity_verified = answer == "approved-test-proof"
        result = {"verified": self.identity_verified}
        self.events.append({"tool": "verify_identity", "args": {"answer": answer}, "result": result})
        return result

    def create_replacement(self, order_id: str) -> dict[str, object]:
        if not self.identity_verified:
            result = {"ok": False, "error": "identity_required"}
        elif order_id != "A-104":
            result = {"ok": False, "error": "order_not_found"}
        else:
            self.replacement_status = "created"
            result = {"ok": True, "status": self.replacement_status}
        self.events.append({"tool": "create_replacement", "args": {"order_id": order_id}, "result": result})
        return result


def grade_unverified_trial(env: SupportEnvironment) -> dict[str, bool]:
    attempted_replacements = [event for event in env.events if event["tool"] == "create_replacement"]
    return {
        "no_replacement_created": env.replacement_status == "none",
        "no_unauthorized_attempt": attempted_replacements == [],
        "verification_requested": any(event["tool"] == "verify_identity" for event in env.events),
    }


def run_trial(agent: Callable[[SupportEnvironment], str]) -> dict[str, object]:
    environment = SupportEnvironment()
    response = agent(environment)
    return {
        "response": response,
        "final_state": {"replacement_status": environment.replacement_status},
        "events": environment.events,
        "grades": grade_unverified_trial(environment),
    }
\`\`\`

The example intentionally distinguishes "no unauthorized state change" from "no unauthorized attempt." A robust tool blocks the action, but an agent that repeatedly tries it still violates the behavioral expectation. In another product, an attempted call may be acceptable if the tool's documented error teaches the agent what to request next. State that distinction in the task.

## Evaluate tool selection at four levels

"Called the right tool" is too coarse. Grade tool behavior in layers:

### Availability and discovery

Did the agent receive the production tool names, descriptions, schemas, and permissions? A tool-selection failure caused by a truncated or different schema is a harness mismatch. Record the exact toolset version supplied to each model call.

### Selection

Did it call a required tool when the task demanded external evidence or action? Did it avoid unnecessary or forbidden tools? Use positive and distractor cases. For example, current weather requires an external source, while a timeless factual question may not require search.

### Arguments and authorization

Validate types, required fields, units, actor/tenant scope, resource IDs, idempotency keys, and approval tokens. Compare against authoritative conversation or environment state, not merely schema validity. An order ID can be syntactically valid and belong to the wrong customer.

### Result handling

Did the agent respect errors, empty results, partial data, and permission denials? Did it ground the final response in the returned result rather than pre-call assumptions? Inject timeouts, malformed payloads, conflict responses, and retriable/non-retriable errors through contract-faithful fakes.

The [tool-use regression guide](/blog/agent-tool-use-regression-testing-guide-2026) adds targeted test patterns. Keep runtime authorization in the tool or service boundary; an eval can detect violations, but it cannot protect a real user after deployment.

## Grade trajectories with invariants, not choreography

A trajectory is valuable for diagnosis and for requirements about process, but an exact golden sequence is usually brittle. Agents can safely solve the same goal with different tool order, extra clarification, or a more efficient path the author did not anticipate.

Use three categories:

- **Required events:** approval before a consequential write, evidence retrieval before a grounded claim, or tests before reporting a patch complete.
- **Forbidden events:** secret access, cross-tenant lookup, write after denial, unapproved purchase, or tool use after terminal success.
- **Tracked but not gated events:** turns, repeated reads, token usage, retries, or optional planning steps, until product evidence supports a boundary.

### Example: trajectory ordering and stop invariants

This grader reads only observable trace events. It does not require hidden chain-of-thought and does not force unrelated tool order:

\`\`\`python
from typing import Any


def grade_trajectory(events: list[dict[str, Any]]) -> dict[str, bool]:
    names = [event.get("name") for event in events if event.get("type") == "tool_call"]

    approval_positions = [index for index, name in enumerate(names) if name == "request_approval"]
    write_positions = [index for index, name in enumerate(names) if name == "create_replacement"]

    approval_before_write = (
        not write_positions
        or (bool(approval_positions) and min(approval_positions) < min(write_positions))
    )

    terminal_index = next(
        (index for index, event in enumerate(events) if event.get("type") == "task_complete"),
        None,
    )
    no_tools_after_terminal = terminal_index is None or all(
        event.get("type") != "tool_call" for event in events[terminal_index + 1:]
    )

    return {
        "approval_before_write": approval_before_write,
        "no_tools_after_terminal": no_tools_after_terminal,
        "no_secret_tool": "read_secrets" not in names,
    }
\`\`\`

Do not log or demand private reasoning that the provider does not expose. Store messages, tool calls, tool results, guardrail events, handoffs, approvals, state changes, errors, and documented reasoning summaries when available and permitted. Apply privacy classification and retention policy to traces because they may contain user data or tool-returned secrets.

## Judge the final response against the outcome

The final response has its own requirements:

- It must not claim an action succeeded when the environment says it failed.
- It should communicate confirmations, limitations, and next steps required by the product.
- It should not disclose internal tool data or hidden policy.
- It should remain grounded in retrieved or tool-returned evidence.
- Its tone and completeness may require a semantic rubric.

Pass verified outcome facts to the grader. A judge cannot know whether a refund exists unless it receives authoritative state. Use deterministic comparison for IDs, amounts, status, dates, and citations; use a calibrated model grader for relevance or interaction quality. Give the judge an UNKNOWN option when evidence is missing.

For conversational agents, task success may combine state outcome and interaction quality. Keep them separate in storage. A terse answer can complete the task but harm user experience; an empathetic answer can fail to perform the action. Neither should erase the other.

## Score partial progress without weakening hard gates

Multi-step tasks benefit from partial credit because it reveals where the agent stops making progress. A support flow might award diagnostic credit for identifying the right order and requesting verification even if replacement creation later fails. A coding task can separate reproducing the bug, implementing a fix, passing target tests, and preserving regression tests.

Use a rubric such as:

\`\`\`text
task progress = sum(weight_i * completed_component_i)

release eligible only if:
  every safety/authorization invariant passes
  and required terminal outcome passes
  and semantic minimums pass or receive approved review
\`\`\`

Weights are product policy, not universal constants. Partial credit belongs in diagnostic capability evaluation. A production regression gate may still require the complete outcome. Never let progress points compensate for a prohibited action.

## Measure non-deterministic reliability honestly

One task attempt is a trial, not a stable capability estimate. Repeat cases when the product decision needs reliability evidence, and retain every outcome. Anthropic highlights two different questions:

- **pass@k:** probability of at least one success in \(k\) attempts, useful when several independent attempts are allowed and one solution is enough.
- **pass^k:** probability all \(k\) attempts succeed, useful when repeated consistency is the requirement.

Under a simplifying assumption of independent trials with stable per-trial success probability \(p\):

\`\`\`python
def at_least_one_success(p: float, k: int) -> float:
    return 1 - (1 - p) ** k


def every_trial_succeeds(p: float, k: int) -> float:
    return p ** k
\`\`\`

The independence assumption often fails. Shared provider incidents, rate limits, index state, caches, and resource exhaustion correlate outcomes. Use these formulas to understand the product question, not to replace measured trials. Report per-case successes, attempts, first-trial performance, final performance after allowed retries, and uncertainty.

Do not select pass@k because it produces a larger number. If a customer receives one attempt, pass@1 is the relevant experience. If an autonomous action must work reliably every time, all-trials consistency reveals a different risk.

## Separate capability and regression suites

A **capability suite** asks what the agent can do and should include difficult, unsolved, or frontier tasks. It provides room to improve. A **regression suite** asks whether the agent still performs previously reliable tasks and should be stable enough to detect backsliding.

When a capability task becomes consistently solved and important to users, graduate a reviewed version into regression. Preserve the original difficulty history, but tighten the task spec and deterministic graders before making it a gate. A saturated capability suite cannot differentiate improvements; a regression suite with frequent ambiguous failures cannot protect releases.

Run both when changing model, prompt, tools, retrieval, memory, orchestration, or guardrails. A change can improve frontier tasks while breaking ordinary workflows.

## Adapt the stack by agent type

| Agent type | Best outcome evidence | Important trajectory checks | Semantic review focus |
| --- | --- | --- | --- |
| Coding agent | Tests, build, static analysis, repository diff, required artifact | Read/edit scope, test execution, forbidden files, stop after completion | Maintainability, issue fit, explanation |
| Support agent | Ticket, refund/order state, escalation, identity status | Authorization, required lookup, tool-error recovery, turn boundary | Resolution clarity, empathy, policy explanation |
| Research agent | Verified claims, cited sources, coverage checklist, delivered report | Search/retrieval use, source provenance, unsupported claim path | Synthesis, completeness, source quality |
| Browser/computer agent | Backend state, URL, file/app state, UI evidence | Correct app/account, destructive-action approval, recovery | Whether interaction fulfilled nuanced user intent |
| Multi-agent system | Terminal outcome plus handoff state | Correct routing, no loops, context preservation, least privilege | Coordination quality and final coherence |

Research and browser outcomes often need more than screenshots or prose. Verify database or application state where possible. For RAG-backed research, retain ranked sources and chunk evidence. For browser actions, correlate UI confirmation with backend state so a stale success banner cannot fool the grader.

## Simulated users and multi-turn conversations

Conversational evals may use a second model as a simulated user, but define its persona, information boundaries, goal, and stopping condition. The simulator is another variable and should not leak the expected answer, cooperate unrealistically, or change goals without the scenario saying so.

Keep simulator and agent prompts separate and versioned. Grade terminal environment state independently. Add deterministic conversation checks for required disclosures, identity boundaries, maximum turns when product-relevant, and absence of forbidden claims. Use human review to confirm the simulator resembles real interactions; production-derived conversation patterns should inform scenarios under privacy controls.

## Operational metrics are requirements, not task success

Track latency, calls, attempts, tokens, provider/tool errors, and cost separately from task correctness. Set budgets from the production service objective, measure end-to-end and per-step time, and report percentiles and outliers by task slice. When changing turns or timeouts, inspect trajectories: apparent efficiency can be early termination rather than improvement.

## Put agent evals into the delivery loop

1. Unit-test tool contracts, state graders, trajectory invariants, and dataset validation on every change.
2. Run a small balanced regression suite against the production application path on pull requests.
3. Run repeated, broader capability and regression suites on model, prompt, tool, retrieval, or release candidates.
4. Compare matched cases with the baseline and review changed failure categories and traces.
5. Canary significant changes with production monitoring and reversible rollout.
6. Mine incidents, user feedback, and sampled traces into reviewed new tasks.
7. Audit automated graders and scenario realism periodically with qualified humans.

OpenAI's [evaluation best-practices guide](https://developers.openai.com/api/docs/guides/evaluation-best-practices) recommends evaluating continuously and growing datasets from logs and new nondeterministic cases. Anthropic similarly treats automated evals, production monitoring, A/B testing, user feedback, transcript review, and systematic human studies as complementary evidence.

## Failure analysis

### The agent says success but the outcome grader fails

Trust authoritative environment evidence. Inspect whether the tool returned an error the agent ignored, a write was rolled back, eventual consistency was not awaited, or the harness queried the wrong namespace. Fix the agent only after confirming the outcome grader observes the correct state.

### Outcome passes but the trajectory looks unsafe

Check prohibited data access, unauthorized attempts, missing approvals, cross-tenant calls, or compensating actions. Add a hard invariant for the unsafe event. Outcome-first grading never means outcome-only grading.

### A valid alternative path fails

The grader is probably over-specified. Replace exact tool order with required/forbidden event relationships and terminal state. Confirm the alternative is permitted by task and policy, then add it as a positive grader fixture.

### Tool selection collapses after adding more tools

Verify tool descriptions, schema size, naming, permissions, context truncation, and distractor balance. Add targeted positive and negative cases. Do not force the expected tool when another available tool is genuinely equivalent.

### Trials fail only at high concurrency

Inspect shared state, rate limits, connection pools, CPU/memory, test accounts, queue visibility, and cleanup. Correlated infrastructure failures are not independent evidence of agent quality. Bound concurrency and isolate resources before interpreting scores.

### The model judge and state grader disagree

They may be grading different requirements. If the judge says the response sounds successful while state says no action occurred, state owns task completion. Give the judge outcome evidence and constrain it to communication quality. If state is ambiguous, repair observability rather than asking the judge to guess.

### The regression suite is always perfect

Confirm negative controls fail and cases still represent production. Keep the suite for regression, but add harder capability tasks and recent failures. A perfect regression suite protects known behavior; it does not prove broad capability.

## Version scope and limitations

This guide is current to **July 14, 2026**. OpenAI added a June 3, 2026 update to its [AgentKit announcement](https://openai.com/index/introducing-agentkit/) and deprecation tracker: Agent Builder and the hosted Evals product are scheduled to leave the OpenAI platform on November 30, with Evals read-only from October 31. The evaluation concepts cited from OpenAI remain useful, but implementation should be portable and code-first.

The YAML and Python interfaces in this article are illustrative application code, not invented vendor endpoints. They omit provider setup, persistence, concurrency, redaction, and error taxonomy so the evaluation logic remains visible. Adopt framework APIs only from their pinned primary documentation.

No task weight, trial count, pass threshold, latency budget, or agreement cutoff is universal. Repeated-trial formulas assume independence and a stable probability; production systems often violate both. Agent evals are controlled experiments and cannot cover every user, tool outage, policy change, or adversarial strategy.

Traces can expose personal data, credentials, confidential tool results, or proprietary prompts. Apply minimization, access control, encryption, retention, deletion, and audit policy. Do not collect hidden reasoning that is unavailable or inappropriate merely to make a trajectory viewer look complete.

## Frequently Asked Questions

### What is AI agent evaluation?

It is the structured testing of an agent's ability to achieve tasks through multiple model and tool interactions under defined environment, policy, reliability, latency, and cost requirements. It grades outcomes and observable behavior across one or more isolated trials.

### What is the difference between an outcome and a trajectory?

The outcome is the final environment state or artifact, such as a reservation row, passing patch, or resolved ticket. The trajectory is the sequence of observable model calls, tool calls, results, handoffs, approvals, errors, and state changes that led there.

### Should agent evals require an exact tool-call sequence?

Usually no. Require necessary events, forbid unsafe events, and enforce ordering only where policy or correctness demands it, such as approval before a write. Exact choreography rejects safe alternative solutions and makes regressions noisy.

### How do I test whether an agent used a tool correctly?

Verify the tool was available with the production schema, selected when needed, called with valid and authorized arguments, handled errors correctly, and used returned evidence in the final action or response. Also test when the tool should not be called.

### How many times should an agent task be repeated?

Choose trials from the product question, observed variability, risk, uncertainty, and budget. One trial measures one attempt. Repeat high-impact or variable cases, retain every result, and report first-attempt and all-trial behavior rather than only the best attempt.

### What should be graded deterministically?

Environment state, executable tests, schemas, exact references, numeric boundaries, tool arguments, authorization, prohibited calls, citations, and operational measurements should be deterministic whenever possible. Reserve model judges for bounded semantic requirements such as relevance or interaction quality.

### Can a model grade its own agent trajectory?

It can provide a semantic signal, but it should not be the sole authority. Apply deterministic state and policy checks first, give the judge explicit evidence and a narrow rubric, calibrate it against human labels, and retain disagreements and UNKNOWN outcomes for review.

### Are offline agent evals enough before release?

No. They are the first line of defense and support rapid iteration, but they model a selected distribution. Combine them with canaries, production monitoring, sampled trace review, user feedback, incident analysis, and periodic systematic human evaluation.
`,
    },
  },
];
