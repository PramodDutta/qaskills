import type { SeoClusterArticle } from './seo-cluster-article';

export const deepevalChildren2026: SeoClusterArticle[] = [
  {
    slug: 'deepeval-3-to-4-migration-guide-2026',
    clusterId: 'deepeval',
    post: {
      title: 'DeepEval 3 to 4 Migration Guide for Traces and Multi-Turn Goldens',
      description:
        'Migrate DeepEval 3 suites to DeepEval 4 with pinned environments, trace parity, multi-turn goldens, shadow CI, failure triage, and rollback controls.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Guide',
      image: '/blog/pillars/deepeval.png',
      imageAlt:
        'DeepEval version migration workflow comparing trace evidence, multi-turn goldens, metric results, and controlled CI rollout stages',
      primaryKeyword: 'deepeval 4 migration',
      keywords: [
        'deepeval 4 migration',
        'DeepEval 3 to 4',
        'DeepEval trace migration',
        'DeepEval multi-turn goldens',
        'DeepEval evals iterator',
        'DeepEval 4 CI migration',
        'DeepEval conversation migration',
        'LLM evaluation framework upgrade',
      ],
      contentKind: 'child',
      pillarSlug: 'deepeval-llm-testing-guide',
      relatedSlugs: [
        'deepeval-llm-testing-guide',
        'deepeval-skill-codex-claude-cursor-install-2026',
        'deepeval-conversation-simulator-guide-2026',
        'deepeval-task-completion-metric-agent',
      ],
      sources: [
        'https://github.com/confident-ai/deepeval/releases',
        'https://deepeval.com/docs/evaluation-component-level-llm-evals',
        'https://deepeval.com/docs/conversation-simulator',
        'https://deepeval.com/docs/evaluation-unit-testing-in-ci-cd',
        'https://deepeval.com/docs/command-line-interface',
      ],
      content: `A **DeepEval 4 migration** is safest when it is treated as a test-harness change, not a routine dependency bump. DeepEval 4 introduced an agent-oriented workflow, richer local trace inspection, and current integration patterns that evaluate traces and spans. At the same time, current conversation testing is built around conversational goldens and generated test cases. A team moving from DeepEval 3 should preserve its old decisions, migrate one evaluation shape at a time, and compare both runners before changing a release gate.

This guide uses the [DeepEval 4 testing pillar](/blog/deepeval-llm-testing-guide) as the architectural baseline. The companion articles explain how to [install the DeepEval coding-agent skill](/blog/deepeval-skill-codex-claude-cursor-install-2026), [generate stateful conversations](/blog/deepeval-conversation-simulator-guide-2026), and [diagnose TaskCompletionMetric traces](/blog/deepeval-task-completion-metric-agent). For cross-framework evaluation architecture, the canonical [LLM testing guide](/blog/testing-llm-applications-guide) covers test cases, graders, RAG, and agents. Reusable QA instructions are available in the [QASkills directory](/skills), including the [Playwright CLI skill](/skills/Pramod/playwright-cli) for browser-backed end-to-end evidence.

## What changed, and what should not change

The first-party [DeepEval 4 release notes](https://github.com/confident-ai/deepeval/releases) describe an agent-native evaluation loop, a terminal trace inspector, and native framework integrations. The current [component-level evaluation documentation](https://deepeval.com/docs/evaluation-component-level-llm-evals) places metrics on trace spans while datasets provide goldens to the evaluation loop. These are documented capabilities. They do not prove that every v3 suite needs a rewrite or that every historical score should move.

Your migration contract should preserve business meaning:

| Asset | Preserve during migration | Allowed implementation change |
| --- | --- | --- |
| Golden dataset | Stable case IDs, inputs, references, labels, and data lineage | Serialization or loading API |
| Model invocation | Production prompt, model configuration, tools, retrieval, and normalization | Instrumentation wrapper |
| Metric | Requirement, judge configuration, threshold, and failure reason | Attachment point on trace or span |
| Release decision | Which failures block, warn, or require review | Report format and CI job layout |
| Evidence | Candidate output, trace, score, reason, errors, and version identifiers | Local TUI or hosted visualization |

Do not accept a green migration because the new command exits zero. Require the expected number of cases, prove that a negative control fails, and compare decisions on identical outputs. That catches empty discovery, missing metrics, unintended caching, and instrumentation gaps.

Name one migration owner for the harness and separate owners for datasets, application adapters, judge calibration, and CI. A single upgrade ticket otherwise hides cross-team decisions. Record who can approve a changed verdict, who can classify an infrastructure failure, and who can authorize rollback before shadow runs begin.

## Prerequisites and version baseline

Create an upgrade branch and record the exact versions used by the existing job. Capture Python, DeepEval, pytest, provider SDK, tracing integration, and model identifiers. If a hosted judge alias can move independently, record the resolved model in each result. The framework version alone is not sufficient provenance.

The following commands are a discovery workflow, not a universal dependency policy:

\`\`\`bash
python --version
python -m pip show deepeval pytest
python -m pip freeze > artifacts/v3-freeze.txt
deepeval --version
deepeval --help > artifacts/v3-cli-help.txt

rg -n "(deepeval|LLMTestCase|ConversationalTestCase|Golden|@observe|assert_test|evaluate\()" \
  tests src .github
\`\`\`

Archive one representative successful run and one intentional failure before changing dependencies. Retain case count, metric names, scores, reasons, latency, model configuration, errors, and the commit SHA. If the v3 job does not persist these fields, add a temporary neutral export first. A result you cannot compare is not a baseline.

Use separate environments rather than upgrading in place. A conservative v4 environment pins the major line while your lockfile records the exact resolved package:

\`\`\`bash
python -m venv .venv-deepeval4
source .venv-deepeval4/bin/activate
python -m pip install --upgrade pip
python -m pip install "deepeval>=4,<5" pytest
python -m pip freeze > artifacts/v4-freeze.txt
deepeval --version
deepeval diagnose
\`\`\`

The [DeepEval CLI reference](https://deepeval.com/docs/command-line-interface) documents \`deepeval diagnose\` for inspecting effective settings and \`deepeval inspect\` for opening a saved run in the terminal trace viewer. Confirm the commands against \`deepeval --help\` for the exact pinned release because CLI flags can evolve inside a major version.

## Build a migration inventory by evaluation shape

Classify tests before editing them. A file name rarely tells you whether it is a single-output assertion, a stateful conversation, a component metric, or a trace-level agent decision.

1. **Single-turn end-to-end tests** build an \`LLMTestCase\` from input and final output. Preserve them first because they provide a simple compatibility signal.
2. **RAG tests** additionally depend on retrieval context and sometimes expected context. Verify both the retriever evidence and generated answer are still populated.
3. **Component tests** score a retriever, tool, LLM call, or sub-agent span. Their attachment point matters as much as their metric.
4. **Agent tests** need a complete top-level trace and meaningful final outcome. A final string without tool and state evidence can conceal an instrumentation regression.
5. **Multi-turn tests** use ordered turns or conversational goldens. Preserve role order, initial turns, expected outcome, and stopping semantics.
6. **Synthetic-data jobs** create test assets rather than evaluate releases. Keep them outside blocking CI until generated cases are reviewed and versioned.

Assign each group an owner, representative case, expected case count, current command, target v4 command, and rollback path. Migrate a vertical slice of every shape before bulk conversion. Ten easy single-turn tests do not validate an agent trace architecture.

## Stage 1: make single-turn tests boring

Start with tests whose inputs and candidate outputs can be frozen. Run v3 and v4 metrics against the same candidate text so generation nondeterminism does not contaminate scorer comparison. For deterministic assertions, require exact decision parity. For model-judged metrics, inspect disagreements against adjudicated human labels rather than forcing agreement with the older judge.

A neutral comparison record can be JSON Lines with one row per case:

\`\`\`json
{"case_id":"refund-001","input":"Refund order 42","actual_output":"I can start the refund.","expected_output":"Refund initiated","old_pass":true,"old_score":0.84,"old_reason":"Outcome is aligned"}
{"case_id":"refund-002","input":"Delete another user's order","actual_output":"Order deleted.","expected_output":"Refuse unauthorized request","old_pass":false,"old_score":0.12,"old_reason":"Authorization requirement violated"}
\`\`\`

Do not round scores before comparison, but do not define parity as identical floating-point values either. The stable artifact is the release decision and its rationale. Record raw values for analysis, then use an approved tolerance or confusion matrix appropriate to the metric.

## Stage 2: migrate to trace-aware evaluation

Current DeepEval documentation distinguishes trace-level and component-level evaluation. A trace represents a complete application run; spans represent internal operations. The [component-level guide](https://deepeval.com/docs/evaluation-component-level-llm-evals) documents \`@observe\`, \`update_current_trace\`, span metrics, \`EvaluationDataset\`, and \`evals_iterator()\`. It also states that component-level evaluation is currently single-turn.

This **illustrative v4 migration shape** instruments a synchronous agent and keeps the release metric at trace level. Replace the body and judge model with your production adapter and approved configuration:

\`\`\`python
from deepeval.dataset import EvaluationDataset, Golden
from deepeval.evaluate import AsyncConfig
from deepeval.metrics import TaskCompletionMetric
from deepeval.tracing import observe, update_current_trace


dataset = EvaluationDataset(
    goldens=[
        Golden(input="Create a support ticket for order 42"),
        Golden(input="Explain why order 99 cannot be refunded"),
    ]
)


@observe()
def support_agent(query: str) -> str:
    # Invoke the same orchestrator, tools, and normalization used in production.
    answer = run_production_agent(query)
    update_current_trace(input=query, output=answer)
    return answer


metric = TaskCompletionMetric(
    threshold=0.75,
    model="your-approved-judge-model",
    include_reason=True,
)

for golden in dataset.evals_iterator(
    metrics=[metric],
    async_config=AsyncConfig(run_async=False),
):
    support_agent(golden.input)
\`\`\`

The synchronous mode is useful during migration because failures are easier to associate with a case and provider rate limits are predictable. It is not automatically the best production configuration. After parity is established, evaluate the documented asynchronous pattern and choose concurrency from service quotas and trace isolation behavior.

Trace migration fails silently when the wrapper observes a helper instead of the top-level task. Verify that one golden produces one intended trace, that the trace has an input and final output, and that tool/retriever spans are children of the correct run. Use an intentionally failing query to prove the metric is attached to the trace that contains the bad outcome.

## Stage 3: migrate component metrics deliberately

A component metric should observe the component's contract, not whatever text happens to be easy to capture. For a retriever, retain query, retrieved chunks, source identifiers, and filters. For a tool, retain tool identity, validated arguments, output, and error state. For an LLM span, retain its actual prompt context and output after any application-level normalization.

The current v4 docs attach a metric to \`@observe(metrics=[...])\` and populate the span test case through \`update_current_span(test_case=...)\`. Do not attach the same metric to every nested span. That can multiply costs and produce misleading failures against operations the rubric was not written to judge.

During review, answer four questions for each metric:

- What requirement does this metric represent?
- Which trace or span contains all evidence needed to judge it?
- Which missing fields make the score invalid rather than low?
- Is the metric blocking, advisory, or diagnostic?

Treat missing evidence as an instrumentation failure. A zero score and a missing score have different owners and remediation paths.

## Stage 4: remodel multi-turn goldens

Current [ConversationSimulator documentation](https://deepeval.com/docs/conversation-simulator) defines a \`ConversationalGolden\` with scenario, expected outcome, and user description. The simulator calls the application through \`model_callback\`, returns \`ConversationalTestCase\` objects, and stops on a turn limit, expected-outcome logic, a stopping controller, or a terminal simulation-graph node.

Do not mechanically flatten a historical conversation into a single prompt. Preserve the stateful requirement as a golden and preserve any fixed opening turns. This current API example is intentionally small:

\`\`\`python
from deepeval.dataset import ConversationalGolden
from deepeval.simulator import ConversationSimulator
from deepeval.test_case import Turn


goldens = [
    ConversationalGolden(
        scenario="A verified customer changes the delivery address before dispatch",
        expected_outcome="The new address is validated and the order is updated",
        user_description="A concise customer who can provide the order number",
        turns=[Turn(role="assistant", content="How can I help with your order?")],
    )
]


async def model_callback(input: str, turns: list[Turn], thread_id: str) -> Turn:
    response = await call_production_chatbot(
        message=input,
        history=turns,
        session_id=thread_id,
    )
    return Turn(role="assistant", content=response)


simulator = ConversationSimulator(model_callback=model_callback, max_concurrent=4)
cases = simulator.simulate(conversational_goldens=goldens, max_user_simulations=8)
\`\`\`

The type annotation uses modern Python syntax and is illustrative; adapt it to your supported Python version. More importantly, route \`thread_id\` to the real session boundary. If every turn creates a new application session, a realistic transcript can still be testing the wrong system.

Compare migrated conversations on invariants rather than exact wording: role order, scenario coverage, terminal state, required tool effects, authorization behavior, maximum turns, and expected outcome. Synthetic users are stochastic. Exact transcript equality encourages brittle tests and does not prove task success.

## Stage 5: run shadow CI before changing the gate

The migration job should run beside the v3 gate for a fixed observation window. Keep the old gate authoritative while the v4 job uploads artifacts and reports differences. Do not let both jobs independently block the same pull request until their failure ownership is clear.

This GitHub Actions fragment is an **illustrative shadow layout**. Lockfiles, secrets, provider access, and artifact names must match your repository:

\`\`\`yaml
jobs:
  deepeval-v4-shadow:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
      - run: python -m pip install -r requirements-evals-v4.lock
      - run: deepeval diagnose
      - run: deepeval test run tests/evals
        env:
          DEEPEVAL_DISABLE_DOTENV: "1"
          JUDGE_API_KEY: \${{ secrets.JUDGE_API_KEY }}
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: deepeval-v4-results
          path: artifacts/evals/**
          if-no-files-found: error
\`\`\`

Use least-privilege secrets and sanitize traces before uploading. LLM inputs, retrieved documents, and tool arguments may contain customer or security-sensitive data. Artifact retention and access should follow the same classification as production telemetry.

Promote the v4 job only when it discovers the expected suite, its negative controls fail, its infrastructure-error rate is understood, and human review supports its changed verdicts. Keep the v3 lockfile and command available for a bounded rollback period.

## Failure diagnosis matrix

| Symptom | Probable layer | Investigation | Correct response |
| --- | --- | --- | --- |
| Zero tests or implausibly fast success | Discovery or command | Check paths, markers, collected cases, and CLI output | Fail the job on an unexpected case count |
| Scores exist but traces have no final output | Instrumentation | Inspect top-level observed function and update call | Fix trace boundaries before tuning metrics |
| One input creates multiple unrelated traces | Async or session isolation | Correlate golden ID, task, and trace ID | Repair context propagation and reduce concurrency |
| v4 scores differ only on model-judged metrics | Judge or rubric | Re-score frozen outputs and compare with human labels | Calibrate; do not force old-score equality |
| Conversation repeats or resets each turn | Application callback | Verify thread ID and history forwarding | Route simulation through the real session path |
| CI is flaky but local runs pass | Quota, secrets, network, or dotenv | Classify provider errors separately from metric failures | Add bounded infrastructure retry and explicit settings |
| New suite passes a known-bad candidate | Missing metric or cache | Disable suspect cache and inspect metric attachment | Block migration until the negative control fails |

## Common migration mistakes

**Changing framework, judge, prompt, and threshold together.** This destroys causal attribution. Hold model behavior and rubric stable while moving the harness, then make quality changes in separately reviewed commits.

**Calling every score delta a regression.** Model-judged metrics can vary. Compare release decisions, reason quality, and human agreement. Preserve distributions and disagreement examples rather than reporting only averages.

**Treating traces as optional decoration.** Trace-based agent metrics need a complete run. If tool effects or final outcome are absent, the judge may infer from incomplete evidence and produce a plausible but invalid reason.

**Generating a new synthetic dataset during cutover.** That changes both the harness and sample population. Migrate against frozen, reviewed goldens first. Generate and approve new cases afterward.

**Leaving deprecated API usage because it still works.** A compatibility alias is a warning window, not a target architecture. For example, current simulator docs call the stop callback \`stopping_controller\` and identify \`controller\` as deprecated. Update deliberately and make warnings visible in CI.

**Using hidden local settings in release tests.** The DeepEval CLI can load dotenv configuration. Current docs describe \`DEEPEVAL_DISABLE_DOTENV=1\` for CI isolation. Ensure the CI job receives every required setting explicitly and prints a sanitized diagnostic summary.

## Release checklist

- Pin exact v3 and v4 environments and archive dependency inventories.
- Freeze representative goldens and candidate outputs for scorer parity.
- Record expected test counts and add at least one known-bad control.
- Validate top-level traces before attaching component metrics.
- Preserve conversation state, role order, expected outcomes, and turn limits.
- Classify product, metric, instrumentation, and infrastructure failures separately.
- Run v4 in shadow mode and review every changed blocking verdict.
- Document artifact privacy, access, and retention.
- Keep an executable rollback job for the agreed stabilization window.
- Remove deprecated APIs only after equivalent evidence is proven.

## Frequently asked questions

### Is DeepEval 4 a drop-in upgrade from DeepEval 3?

Do not assume so for a production suite. Simple imports may continue to work, but trace attachment, integrations, conversation simulation, CLI behavior, and result artifacts deserve explicit validation. Build two pinned environments and compare representative tests before changing the gate.

### Should historical scores be recalculated after migration?

Preserve historical v3 results as immutable evidence. Re-run a selected frozen corpus in v4 and label it with the new framework and judge configuration. Do not overwrite old records because that erases the distinction between original and recalculated results.

### How long should shadow CI run?

There is no universal duration. Choose enough runs to cover routine changes, known edge cases, provider failures, and at least one release decision. A low-frequency suite may need a calendar window; a high-volume suite may use an agreed number of representative runs.

### Can we change thresholds while migrating?

Technically yes, but it is poor experimental design. First prove the new harness represents the old requirement. Then recalibrate thresholds against human-labeled examples in a separate change with an explicit risk owner.

### Why use frozen outputs before live agent runs?

Frozen outputs isolate metric behavior from model sampling, retrieval drift, tool state, and network changes. Once scorer parity is understood, live parallel runs can reveal generator and instrumentation differences without conflating every layer.

### What should block promotion of the v4 job?

Unexpected case counts, missing traces, inactive negative controls, unexplained deterministic disagreements, uncontrolled secrets, unclassified infrastructure errors, or changed blocking verdicts without human review should all stop promotion.

### Do multi-turn goldens replace conversational test cases?

They serve different stages in the current simulator workflow. A \`ConversationalGolden\` defines the scenario and expected outcome; \`ConversationSimulator.simulate()\` produces \`ConversationalTestCase\` instances containing turns that can be evaluated with conversational metrics.

### Is the terminal inspector required in CI?

No. The local \`deepeval inspect\` workflow is diagnostic, not the release contract. CI still needs durable machine-readable evidence and a clear exit decision. Use the inspector to explore saved runs without making manual terminal interaction a build dependency.

## Conclusion

A reliable DeepEval 3-to-4 migration preserves decisions before it adopts new capabilities. Freeze the evidence, pin both environments, move single-turn tests first, validate trace boundaries, remodel conversations as goldens, and shadow the new runner. Only then should DeepEval 4 own the release gate. That sequence lets teams benefit from agent-native traces and current simulation APIs without confusing a tooling upgrade with an improvement in model quality.
`,
    },
  },
  {
    slug: 'deepeval-skill-codex-claude-cursor-install-2026',
    clusterId: 'deepeval',
    post: {
      title: 'How to Install the DeepEval Skill in Codex, Claude Code, and Cursor',
      description:
        'Install and verify the official DeepEval skill in Codex, Claude Code, and Cursor, then govern permissions, eval loops, updates, CI, and rollback.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Tutorial',
      image: '/blog/pillars/deepeval.png',
      imageAlt:
        'Coding agents in Codex, Claude Code, and Cursor sharing a verified DeepEval skill and a controlled evaluation feedback loop',
      primaryKeyword: 'deepeval skill install',
      keywords: [
        'deepeval skill install',
        'DeepEval Codex skill',
        'DeepEval Claude Code skill',
        'DeepEval Cursor skill',
        'DeepEval agent skill',
        'npx skills add deepeval',
        'AI coding agent evals',
        'DeepEval vibe coder quickstart',
      ],
      contentKind: 'child',
      pillarSlug: 'deepeval-llm-testing-guide',
      relatedSlugs: [
        'deepeval-llm-testing-guide',
        'deepeval-3-to-4-migration-guide-2026',
        'deepeval-conversation-simulator-guide-2026',
        'deepeval-task-completion-metric-agent',
      ],
      sources: [
        'https://deepeval.com/docs/vibe-coder-quickstart',
        'https://github.com/confident-ai/deepeval/tree/main/skills/deepeval',
        'https://deepeval.com/docs/getting-started',
        'https://deepeval.com/docs/command-line-interface',
        'https://github.com/confident-ai/deepeval',
      ],
      content: `A **DeepEval skill install** gives Codex, Claude Code, or Cursor reusable instructions for building and running evaluation suites, but it does not install the Python framework, provision model credentials, or approve code changes for you. The official DeepEval quickstart uses a Skills-compatible installer so each coding agent can discover the same evaluation workflow. A production team should verify the source, choose project or user scope deliberately, constrain permissions, and test the resulting agent loop on a disposable branch.

The broader [DeepEval 4 tutorial](/blog/deepeval-llm-testing-guide) explains the framework architecture. Use the sibling guides when you need a [controlled DeepEval 3-to-4 migration](/blog/deepeval-3-to-4-migration-guide-2026), [synthetic conversation workflow](/blog/deepeval-conversation-simulator-guide-2026), or [TaskCompletionMetric trace diagnosis](/blog/deepeval-task-completion-metric-agent). The canonical [LLM testing guide](/blog/testing-llm-applications-guide) supplies a framework-neutral manual baseline. You can also browse [QASkills](/skills) and install the [Playwright CLI skill](/skills/Pramod/playwright-cli) when an eval needs browser evidence.

## What the official skill actually does

DeepEval's current [Vibe Coder quickstart](https://deepeval.com/docs/vibe-coder-quickstart) says the \`deepeval\` Agent Skill helps a coding assistant choose a single-turn, multi-turn, or component-level shape; reuse or generate goldens; write a committed pytest suite; run \`deepeval test run\`; read failures; and iterate. The source is published in the first-party [DeepEval repository](https://github.com/confident-ai/deepeval/tree/main/skills/deepeval).

That boundary matters. An agent skill is markdown instructions and supporting resources interpreted by the coding tool. It is not a sandbox, package manager, metric judge, or policy engine. The agent still operates with the permissions and tools granted by Codex, Claude Code, or Cursor. Your repository still owns dependencies, test data, secrets, review rules, and the final release decision.

| Layer | Responsibility | Verification evidence |
| --- | --- | --- |
| Agent skill | Guide the coding agent through a DeepEval workflow | Installed \`SKILL.md\`, source revision, and agent behavior |
| Python package | Provide test cases, metrics, tracing, datasets, and CLI | Locked dependency and \`deepeval --version\` |
| Coding agent | Inspect files, propose edits, run approved commands, summarize failures | Tool transcript, diff, and test output |
| Repository policy | Limit files, secrets, network, generated data, and approvals | Agent configuration and branch protection |
| CI | Reproduce the eval suite with controlled dependencies | Independent build logs and artifacts |

Do not evaluate installation success by asking the agent whether the skill is active. Inspect the installed files, trigger a bounded task, and verify the expected repository diff and command output.

## Prerequisites

Before installing, require:

1. Node.js and \`npx\`, because the documented installer is distributed through the Skills CLI.
2. Git, so the source repository and installed revision can be inspected.
3. Python supported by your application and a dedicated virtual environment.
4. A pinned DeepEval 4 dependency for the project, not an untracked global package.
5. Provider credentials supplied at runtime through a secret manager or local environment file excluded from version control.
6. One small, non-sensitive agent or LLM path suitable for an installation smoke test.
7. A clean branch so generated tests and unrelated modifications are easy to review.

Verify the source before execution. The official docs link to \`confident-ai/deepeval\`; similarly named packages or repositories should not be treated as equivalent. In controlled environments, review the installer's package provenance and lock or approve the version according to your supply-chain policy.

## Install once with the documented command

The official quickstart currently gives one command for Claude Code, Codex, Cursor, Windsurf, OpenCode, and other Skills-compatible assistants:

\`\`\`bash
npx skills add confident-ai/deepeval --skill "deepeval"
\`\`\`

Run it from the repository whose scope you intend to modify. Read the installer's prompts and output rather than piping automatic approval. A Skills CLI version may offer project-wide and user-wide destinations; select the scope explicitly when prompted. Project scope is usually easier to audit and reproduce because the skill files travel with or remain adjacent to one repository. User scope is appropriate only when the same trusted instructions should apply across many repositories.

The DeepEval docs also allow a manual copy or symlink of the repository's \`skills/deepeval\` directory into an agent's skills directory. Prefer the documented installer unless your environment has a managed distribution process. A manual copy needs its own source revision, update process, and integrity check.

Do not invent separate unofficial install commands for each editor. The supported command is intentionally common; the installer handles compatible destinations. Agent-specific work begins with verification and policy, not with changing the source skill.

## Verify project files after installation

The exact destination can depend on the coding tool and installer version. Trust the installer's displayed destination, then inspect the result. This read-only discovery command checks common project directories without asserting that every tool uses every directory:

\`\`\`bash
printf '%s\n' 'Candidate project skill files:'
rg --files .agents .claude .cursor 2>/dev/null | rg '(^|/)deepeval(/|$)|SKILL[.]md$'

printf '%s\n' 'DeepEval references in installed instructions:'
rg -n 'deepeval test run|EvaluationDataset|LLMTestCase|ConversationSimulator' \
  .agents .claude .cursor 2>/dev/null
\`\`\`

Inspect the installed \`SKILL.md\` and any referenced resources. Confirm the content originates from the first-party repository, contains no unexpected executable hook, and does not direct the agent to expose credentials or bypass review. Record the source commit or installer resolution in an internal dependency note if your team requires reproducible tooling.

An installation that leaves files outside the repository may be valid, but it is less visible to reviewers. Document the resolved user-level path and repeat the same inspection there. Do not copy personal credentials or machine-specific paths into project documentation.

## Configure Codex safely

For Codex, keep the first task narrow and name the allowed files and commands. A useful smoke prompt is:

> Read the installed DeepEval skill and the current application boundary. Create one evaluation test under tests/evals for the refund-policy function. Do not modify production code. Use the existing virtual environment, do not install packages, run only the focused eval command, and report the diff, case count, metric configuration, and any provider error.

This prompt separates skill discovery from package installation and production edits. Review Codex tool requests. Network calls, dependency changes, and secret access should remain explicit. If the agent cannot find the skill, verify the installer destination and restart or reload the tool according to its own discovery behavior rather than reinstalling repeatedly.

After the first generated test, review whether it calls the same adapter production uses, records stable case IDs, sets an intentional threshold, and includes a negative case. Reject a test that mocks away retrieval or tool use while claiming end-to-end coverage.

## Configure Claude Code safely

Claude Code should receive the same scope and acceptance criteria. Do not rely on a broad request such as "add DeepEval everywhere." Tell it which agent path to evaluate, where tests belong, which files are read-only, and which command proves completion.

A controlled request can say:

> Use the DeepEval skill to evaluate the support-routing agent. Work only in tests/evals and requirements-evals.lock. First propose the test shape and goldens. Wait for approval before changing dependencies. Run the focused suite, classify metric failures separately from provider failures, and do not lower thresholds to make the test pass.

The final sentence prevents a common agent failure mode: optimizing the gate instead of the application. Require Claude Code to explain why a metric represents the requirement and to show any changed prompt, model, or threshold in the diff summary.

If the tool supports persistent project instructions, keep organizational policy there and leave framework-specific procedure in the installed skill. Duplicating the entire skill into multiple instruction files creates drift during updates.

## Configure Cursor safely

The official quickstart currently notes that a first-class Cursor plugin is planned and instructs users to use the Skills CLI in the meantime. Treat that as the current first-party position, not a promise about a release date. Install through the common command, verify the destination, then reload skill discovery if necessary.

In Cursor, use a task that can be validated from the repository:

> Follow the DeepEval skill to add one pytest-style eval for the documented chatbot callback. Keep production code unchanged. Use two reviewed goldens, one expected success and one authorization refusal. Run deepeval test run only for the new file and summarize scores, reasons, trace availability, and unresolved limitations.

Review whether the editor included unrelated context or changed files outside scope. An IDE agent may have broad workspace visibility; the skill does not reduce that visibility by itself.

## Install the Python runtime separately

The agent skill can recommend commands, but your project must own DeepEval as a dependency. Create or activate the project's eval environment and install from a lockfile. For initial exploration, a constrained major-version requirement is reasonable; CI should resolve an exact version through your normal lock process.

\`\`\`bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install "deepeval>=4,<5" pytest
python -m pip freeze > requirements-evals.lock

deepeval --version
deepeval diagnose
\`\`\`

Do not commit provider keys. The current [CLI documentation](https://deepeval.com/docs/command-line-interface) describes effective settings and dotenv behavior. Use a checked-in example file containing variable names only, and supply real values through an approved local or CI secret mechanism. In CI, consider \`DEEPEVAL_DISABLE_DOTENV=1\` so an unexpected dotenv file cannot alter the job.

## Create a minimal ground-truth loop

The first generated suite should be intentionally small and independently reviewable. The [human quickstart](https://deepeval.com/docs/getting-started) documents the basic model: build a test case, choose a metric, and run it through \`deepeval test run\`. The skill should help the coding agent implement this pattern; it should not choose business acceptance criteria without an owner.

This is an **illustrative local test**, not a copy-paste production gate:

\`\`\`python
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, SingleTurnParams

from app.support import answer_support_question


policy_metric = GEval(
    name="Refund policy compliance",
    criteria=(
        "The answer must not promise a refund unless the supplied policy context "
        "allows it, and it must state the next valid action."
    ),
    evaluation_params=[
        SingleTurnParams.INPUT,
        SingleTurnParams.ACTUAL_OUTPUT,
        SingleTurnParams.RETRIEVAL_CONTEXT,
    ],
    threshold=0.8,
    model="your-approved-judge-model",
)


def test_damaged_item_policy() -> None:
    query = "My mug arrived broken. Can I get a refund?"
    context = ["Damaged items are refundable within 30 days with an order ID."]
    output = answer_support_question(query=query, context=context)
    case = LLMTestCase(
        input=query,
        actual_output=output,
        retrieval_context=context,
    )
    assert_test(case, [policy_metric])
\`\`\`

Add a deterministic unit test for input plumbing and a negative fixture that violates policy. An LLM judge alone should not validate authorization, schema, or exact tool arguments when ordinary code can assert them reliably.

Run only the focused file first:

\`\`\`bash
deepeval test run tests/evals/test_refund_policy.py
\`\`\`

Confirm case count, metric name, threshold, model, reason, and exit status. If the agent changes the application after a failure, require it to re-run deterministic tests and the focused eval, then show the final diff. A successful loop is patch, test, inspect, and summarize, not patching until a stochastic run happens to pass.

## Give the coding agent a durable operating contract

A good repository contract states:

- Goldens are reviewed test assets; generated candidates do not enter blocking CI automatically.
- Production prompts, tools, and retrievers are changed only in designated files.
- Metric thresholds and judge models require explicit review.
- A provider or tracing error is not a product-quality failure.
- The agent may not print, commit, or copy secrets into test output.
- Full traces are treated according to their most sensitive input.
- Costly or destructive tools are stubbed only when the test is labeled component-level.
- Every generated suite has a deterministic negative control.
- CI, not the interactive agent session, is the final reproducibility check.

Place policy in the repository's established agent-instruction mechanism, not inside the third-party skill. This keeps the vendor procedure updateable while organizational controls remain locally owned.

## CI and release use

The skill is primarily a development accelerator. CI should invoke checked-in tests directly and should not need a coding agent. That separation prevents an agent version or editor configuration from becoming an undeclared release dependency.

Use a locked environment, least-privilege API key, explicit test path, timeout, and result artifact. Fail on unexpected zero-case discovery. Classify outcomes into product failure, judge failure, trace/instrumentation failure, and infrastructure failure. A blind retry can hide all four.

For pull requests, run a small deterministic and high-signal suite. Run broader stochastic, synthetic, and adversarial suites on a schedule or before release. This is a recommendation based on cost and diagnostic speed, not a DeepEval requirement.

## Update and rollback strategy

An agent skill can change independently of the Python package. Track them separately:

| Dependency | Version evidence | Update validation | Rollback |
| --- | --- | --- | --- |
| DeepEval skill | Source repository commit or installer resolution | Review instruction diff and repeat bounded task | Restore previous reviewed skill directory |
| DeepEval Python package | Lockfile and installed version | Run deterministic, focused eval, and trace smoke tests | Restore prior lockfile |
| Judge model | Explicit model/config in result | Re-score frozen outputs and review disagreements | Restore previous judge config |
| Coding agent | Tool release and project settings | Repeat permission and file-scope smoke tests | Use approved prior tool/channel if available |

Do not run an update command blindly across developer machines. Review upstream changes, test in one repository, and publish the approved revision through your normal internal tooling. If you use a symlink, remember that moving its target can update every linked workspace at once.

## Failure diagnosis

### The agent says the DeepEval skill is unavailable

Inspect the installer's destination and the actual \`SKILL.md\`. Confirm you launched the agent in the expected repository and reload its skill discovery. Do not repeatedly install into different scopes; duplicate copies make precedence difficult to understand.

### The skill is found, but \`deepeval\` is not a command

The markdown skill and Python package are separate. Activate the project virtual environment, install from the approved lockfile, and run \`python -m pip show deepeval\`. Avoid a global package that masks a missing project dependency.

### The agent generates tests that never fail

Check test discovery, case count, metric attachment, caching, and negative controls. Replace one candidate output with a known policy violation. If the job remains green, the suite is not protecting the stated requirement.

### The agent edits production code before establishing a baseline

Revert only the agent's proposed patch through normal review, tighten file scope, and ask for a failing eval first. A coding agent needs a reproducible failure to know whether its production change improved behavior.

### Local results differ from CI

Compare locked packages, Python version, model identifier, environment settings, timezone, network access, dataset revision, and concurrency. Run \`deepeval diagnose\` in both environments with secrets redacted.

### Cursor, Claude Code, and Codex produce different suites

That is possible because the skill guides rather than deterministically generates code. Compare requirements, prompts, tool permissions, available repository context, and agent versions. Enforce one checked-in suite and shared review criteria rather than expecting identical generation traces.

## Common mistakes and limitations

**Treating installation as framework setup.** The skill does not install Python packages or keys. Verify both layers independently.

**Granting broad write and network access for convenience.** Skills do not sandbox agents. Start with one test directory and approved commands.

**Letting the agent invent quality thresholds.** Engineers and domain owners should calibrate gates against reviewed labels and consequences.

**Committing synthetic goldens without review.** Generated data can be unrealistic, duplicated, sensitive, or biased. Version only approved cases.

**Replacing deterministic assertions with model judges.** Schema, exact labels, permissions, and tool arguments should usually be checked in ordinary code.

**Assuming all three agents interpret instructions identically.** The standard transports guidance; each tool has its own context, permissions, and execution model.

**Making the interactive agent part of CI.** CI should run the committed DeepEval suite directly. Agent-driven repair belongs in a reviewed development loop.

## Installation checklist

- Verify the first-party docs and \`confident-ai/deepeval\` source.
- Choose project or user scope deliberately and record the destination.
- Inspect the installed \`SKILL.md\` and source revision.
- Install DeepEval 4 separately in a locked Python environment.
- Supply secrets outside version control and print only sanitized diagnostics.
- Give the coding agent a narrow test target and file boundary.
- Require a reviewed golden, negative control, and focused command.
- Review metrics, thresholds, judge model, trace evidence, and generated diff.
- Run the checked-in suite independently in CI.
- Document skill, package, model, and coding-agent updates separately.

## Frequently asked questions

### Is the DeepEval skill the same as the DeepEval Python package?

No. The skill is a set of instructions for a compatible coding agent. The Python package implements DeepEval APIs and CLI commands. Install and verify both, and keep their revisions separate in your inventory.

### What is the official installation command?

The current first-party Vibe Coder quickstart documents \`npx skills add confident-ai/deepeval --skill "deepeval"\`. Read the current docs and installer prompts when you run it because destinations and CLI behavior can evolve.

### Do Codex, Claude Code, and Cursor need different DeepEval skills?

The official skill is shared across Skills-compatible assistants. Tool-specific project instructions should define permissions and workflow constraints, but copying and editing three framework skills creates avoidable drift.

### Should the skill be installed globally or per project?

Prefer project scope when auditability and reproducibility matter. User scope can be appropriate for an individually managed environment, but document its path and revision because repository reviewers may not see it.

### Can the coding agent choose metrics automatically?

It can propose metrics based on the skill and application context. A human owner should confirm that each metric observes the right evidence and that its threshold maps to a release consequence.

### Does installing the skill send data to DeepEval or Confident AI?

Installation alone is not proof of runtime data transfer. The eval code, provider configuration, login state, and tracing/export settings determine what leaves the machine. Review those separately and classify trace contents before enabling uploads.

### How do we prove the skill is active?

Inspect the installed files, then give the agent a bounded task that should trigger the DeepEval workflow. Verify that it proposes an evaluation shape, creates a focused committed test, runs the expected command, and reports metric failures without weakening the gate.

### Can we use the skill to repair failing production behavior automatically?

Use it to accelerate a reviewed patch-test loop. Do not grant unattended production changes solely because an eval passes. Model-judged tests can be noisy, incomplete, or optimized around; deterministic tests, code review, and CI remain required.

## Conclusion

Install the official DeepEval skill once through the documented Skills-compatible command, then verify source, destination, runtime dependency, and behavior. Codex, Claude Code, and Cursor can share the same evaluation procedure while retaining tool-specific permissions. The durable outcome is not an installed folder; it is a checked-in, reviewed DeepEval suite that fails for the right reason and runs independently in CI.
`,
    },
  },
  {
    slug: 'deepeval-conversation-simulator-guide-2026',
    clusterId: 'deepeval',
    post: {
      title: 'DeepEval ConversationSimulator Tutorial with Synthetic Users',
      description:
        'Build DeepEval ConversationSimulator tests with conversational goldens, stateful callbacks, controlled stopping, evaluation metrics, CI, and failure analysis.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Tutorial',
      image: '/blog/pillars/deepeval.png',
      imageAlt:
        'Synthetic user and production chatbot exchanging stateful turns through a DeepEval conversation simulation and evaluation pipeline',
      primaryKeyword: 'deepeval conversation simulator',
      keywords: [
        'deepeval conversation simulator',
        'DeepEval ConversationSimulator tutorial',
        'DeepEval synthetic users',
        'DeepEval ConversationalGolden',
        'DeepEval model callback',
        'DeepEval stopping controller',
        'multi-turn LLM testing',
        'synthetic conversation evaluation',
      ],
      contentKind: 'child',
      pillarSlug: 'deepeval-llm-testing-guide',
      relatedSlugs: [
        'deepeval-llm-testing-guide',
        'deepeval-3-to-4-migration-guide-2026',
        'deepeval-skill-codex-claude-cursor-install-2026',
        'deepeval-task-completion-metric-agent',
      ],
      sources: [
        'https://deepeval.com/docs/conversation-simulator',
        'https://deepeval.com/docs/conversation-simulator-model-callback',
        'https://deepeval.com/docs/conversation-simulator-stopping-logic',
        'https://deepeval.com/docs/conversation-simulator-simulation-graph',
        'https://deepeval.com/docs/synthetic-data-generation-introduction',
      ],
      content: `The **DeepEval Conversation Simulator** creates synthetic user turns, sends them through your real chatbot callback, and returns complete conversations for multi-turn evaluation. Its value is not producing realistic-looking transcripts. Its value is repeatedly exercising state, tools, policy, recovery, and terminal outcomes from reviewed scenarios. A useful simulator suite therefore controls goldens, session boundaries, stopping behavior, evidence, and cost before it becomes a CI signal.

Start with the [DeepEval 4 pillar](/blog/deepeval-llm-testing-guide) for test-case and metric fundamentals. The cluster also covers [migration from DeepEval 3](/blog/deepeval-3-to-4-migration-guide-2026), [installation of the official coding-agent skill](/blog/deepeval-skill-codex-claude-cursor-install-2026), and [TaskCompletionMetric trace analysis](/blog/deepeval-task-completion-metric-agent). The canonical [LLM testing guide](/blog/testing-llm-applications-guide) provides broader framework context. Explore reusable instructions in [QASkills](/skills), and use the [Playwright CLI skill](/skills/Pramod/playwright-cli) when a conversation must drive a browser UI.

## Simulator, synthesizer, and evaluator are different stages

The current [synthetic-data introduction](https://deepeval.com/docs/synthetic-data-generation-introduction) distinguishes generating goldens from simulating turns. A golden defines what should be tested. \`ConversationSimulator\` creates a back-and-forth exchange between a synthetic user and your application. Metrics then evaluate the resulting \`ConversationalTestCase\` objects.

| Stage | Input | Output | Review question |
| --- | --- | --- | --- |
| Golden design | Requirement, incident, policy, persona, expected outcome | \`ConversationalGolden\` | Is this a meaningful behavior to test? |
| Simulation | Golden plus application callback and stopping logic | Ordered user and assistant turns | Did the run exercise the real stateful path? |
| Evaluation | Completed conversations plus metrics | Scores, reasons, and verdicts | Does each metric judge the intended requirement? |
| Release policy | Results plus error classification | Block, warn, or review decision | Is the evidence stable enough for this consequence? |

Do not ask the simulator to create both your requirements and your evidence without review. Synthetic scenarios generated from documents can expand coverage, but a domain owner should approve expected outcomes and high-risk personas before they control releases.

## Version and environment prerequisites

This tutorial targets current DeepEval 4 documentation as checked on July 14, 2026. Pin the exact resolved package in your project because defaults and optional arguments can change. The docs currently identify \`model_callback\` as mandatory, \`async_mode=True\`, \`max_concurrent=100\`, and \`max_user_simulations=10\` as defaults. Do not rely on those defaults for a cost-sensitive CI suite; set intentional values.

Prepare a separate eval environment:

\`\`\`bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install "deepeval>=4,<5" pytest
python -m pip freeze > requirements-evals.lock

deepeval --version
deepeval diagnose
\`\`\`

You also need credentials for the simulator model and for your application if it calls external providers. These may be different identities. Use scoped keys, provider budgets, and test tenants. A synthetic user must never operate against production customer state or irreversible tools.

## Design conversational goldens from risks

A good \`ConversationalGolden\` describes a goal and user condition, not an expected transcript. Exact dialogue scripts turn an open interaction into brittle replay. Use fields to make the scenario testable:

- **Scenario:** the task, precondition, and important constraint.
- **Expected outcome:** an observable terminal result, not merely "help the user."
- **User description:** relevant communication style, knowledge, permissions, or pressure.
- **Initial turns:** only when the application has a fixed greeting, consent step, or existing conversation state.

Build a portfolio of risks rather than many cosmetic personas. For a refund agent, useful partitions include eligible refund, expired window, missing order ID, unauthorized requester, partial shipment, provider outage, repeated user correction, and escalation. Each should map to a different product or safety decision.

This current-API example creates three reviewed scenarios:

\`\`\`python
from deepeval.dataset import ConversationalGolden
from deepeval.test_case import Turn


goldens = [
    ConversationalGolden(
        scenario=(
            "A verified customer requests a refund for a damaged item "
            "within the documented 30-day window."
        ),
        expected_outcome=(
            "The agent validates the order and initiates exactly one refund."
        ),
        user_description="A concise customer with the order ID available.",
        turns=[Turn(role="assistant", content="How can I help with your order?")],
    ),
    ConversationalGolden(
        scenario="An unverified caller asks to refund another customer's order.",
        expected_outcome=(
            "The agent refuses the change and requests an approved verification path."
        ),
        user_description="A persistent caller who pressures the agent to skip verification.",
    ),
    ConversationalGolden(
        scenario="A verified customer corrects an order number after one failed lookup.",
        expected_outcome=(
            "The agent uses the corrected order number without repeating the old lookup."
        ),
        user_description="A cooperative customer who notices and fixes their typo.",
    ),
]
\`\`\`

Keep stable IDs beside these objects in your own dataset layer because a scenario string is a poor primary key. Record requirement ID, risk, owner, data classification, and approval revision. That metadata can be included in artifacts even if the framework object does not carry every governance field.

## Implement a stateful model callback

The official [model-callback documentation](https://deepeval.com/docs/conversation-simulator-model-callback) says the callback receives \`input\` and may declare \`turns\` and \`thread_id\`. It must return an assistant \`Turn\`. DeepEval passes optional values by name when the callback declares them.

The callback is the most important integration boundary. It should invoke the same orchestration, retrieval, policy middleware, tools, output parsing, and session store used by the deployed application. A callback that directly calls the underlying LLM is a model test, not an end-to-end chatbot test.

This **illustrative adapter** sends a request to a test deployment. Adapt authentication and response validation to your service contract:

\`\`\`python
import os

import httpx
from deepeval.test_case import Turn


CHATBOT_URL = os.environ["CHATBOT_TEST_URL"]
CHATBOT_TOKEN = os.environ["CHATBOT_TEST_TOKEN"]


async def model_callback(
    input: str,
    turns: list[Turn],
    thread_id: str,
) -> Turn:
    payload = {
        "message": input,
        "session_id": thread_id,
        "history": [
            {"role": turn.role, "content": turn.content}
            for turn in turns
        ],
        "mode": "evaluation",
    }
    headers = {"Authorization": f"Bearer {CHATBOT_TOKEN}"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(CHATBOT_URL, json=payload, headers=headers)
        response.raise_for_status()
        body = response.json()

    if not isinstance(body.get("message"), str):
        raise ValueError("chatbot response must contain a string message")

    return Turn(role="assistant", content=body["message"])
\`\`\`

Decide whether the service expects full history, a session ID, or both. Sending both can duplicate context if the backend already stores prior turns. Confirm the production protocol and write a deterministic integration test for the adapter before spending model calls on simulation.

Use a test-mode tool boundary that prevents irreversible effects. A refund tool can write to an isolated ledger and return a receipt; it should not transfer money. Preserve tool semantics and authorization checks even when effects are sandboxed, or the simulated path will be unrealistically easy.

## Run a bounded simulation

The current [ConversationSimulator guide](https://deepeval.com/docs/conversation-simulator) documents \`conversational_goldens\` for \`simulate()\`. Set concurrency and turn limits from provider quotas, application latency, and expected trajectory length. Start synchronously or with very low concurrency while debugging session isolation.

\`\`\`python
from deepeval.simulator import ConversationSimulator


simulator = ConversationSimulator(
    model_callback=model_callback,
    simulator_model="your-approved-simulator-model",
    async_mode=True,
    max_concurrent=4,
)

test_cases = simulator.simulate(
    conversational_goldens=goldens,
    max_user_simulations=8,
)

assert len(test_cases) == len(goldens)
for case in test_cases:
    assert case.turns, "simulation returned an empty conversation"
\`\`\`

This assertion checks only structural completion. It does not prove the expected outcome. Capture per-case status, turn count, callback errors, thread ID, simulator model, application revision, and timestamps. Treat partial generation as an infrastructure or harness failure rather than a low-quality conversation.

At concurrency greater than one, verify thread isolation explicitly. Put a harmless canary value in each test session and assert it never appears in another conversation. Cross-session memory leakage is both a test-validity defect and a potential security defect.

## Control when simulations stop

A turn cap prevents unlimited execution, but it is not a semantic success condition. The docs say the default behavior uses the golden's expected outcome. The current [stopping-logic page](https://deepeval.com/docs/conversation-simulator-stopping-logic) supports a custom \`stopping_controller\` that returns \`proceed()\` or \`end()\`. It also says the previous \`controller\` keyword remains a deprecated alias.

Use a custom controller when your application emits a deterministic terminal signal such as a receipt, escalation state, denial code, or closed ticket. The following example intentionally uses an application marker rather than judging free-form prose:

\`\`\`python
from deepeval.simulator.controller import end, proceed


async def stopping_controller(last_assistant_turn, simulated_user_turns):
    if last_assistant_turn is None:
        return proceed()

    text = last_assistant_turn.content.lower()
    terminal_markers = (
        "refund receipt:",
        "verification required:",
        "case escalated:",
    )
    if any(marker in text for marker in terminal_markers):
        return end(reason="Application returned a terminal workflow marker")

    if simulated_user_turns >= 7:
        return end(reason="Safety turn budget reached")

    return proceed()


simulator = ConversationSimulator(
    model_callback=model_callback,
    stopping_controller=stopping_controller,
    max_concurrent=4,
)
\`\`\`

The turn-budget branch duplicates the outer maximum intentionally as defense in depth, but it should be aligned with your configured limit. A controller that ends on vague phrases such as "done" or "I can help" can truncate a failed workflow. Prefer structured application state when available.

For specific trajectories, the official [simulation-graph documentation](https://deepeval.com/docs/conversation-simulator-simulation-graph) supports \`SimulationNode\` graphs, terminal nodes, and visit limits. Use a graph when the synthetic user must follow ordered behavior such as ask, correct, challenge, then escalate. Use a stopping controller for global terminal conditions. Do not use an LLM-driven simulator when a deterministic state machine is the actual requirement.

## Evaluate completed conversations

Simulation and evaluation should be separate artifact stages. Save or serialize the completed cases according to your data policy, then apply metrics. This allows you to re-score fixed conversations when calibrating a judge without paying to regenerate every transcript.

The current simulator docs demonstrate passing returned cases to \`evaluate()\` with multi-turn metrics. This example uses turn relevancy as one diagnostic dimension; it is not a complete release policy:

\`\`\`python
from deepeval import evaluate
from deepeval.metrics import TurnRelevancyMetric


results = evaluate(
    test_cases=test_cases,
    metrics=[
        TurnRelevancyMetric(
            threshold=0.75,
            model="your-approved-judge-model",
            include_reason=True,
        )
    ],
)
\`\`\`

Pair conversational metrics with deterministic outcome checks. Query the isolated refund ledger for one receipt, verify no refund for an unauthorized caller, assert the corrected order ID reached the tool, and check the escalation code. A fluent dialogue can still perform the wrong state transition; a terse dialogue can satisfy the task.

Choose metrics by failure mode:

| Failure | Evidence | Suitable check |
| --- | --- | --- |
| Assistant ignores the latest correction | Ordered turns | Turn relevancy or custom conversational rubric |
| Agent leaks another user's order | Transcript and backend authorization log | Deterministic security assertion plus safety rubric |
| Refund is promised but not executed | Tool ledger and final turns | Deterministic outcome assertion |
| Agent loops without progress | Turn count and repeated actions | Step/trajectory invariant or custom metric |
| Policy explanation is misleading | Policy context and assistant turns | Calibrated conversational G-Eval |
| Session state resets | Thread ID and backend state | Integration assertion, not an LLM judge |

## Make synthetic users useful rather than merely diverse

Persona diversity should correspond to product behavior. Vary language, verbosity, domain knowledge, emotional pressure, correction patterns, accessibility needs, and adversarial intent only where the application has a requirement. Avoid demographic stereotypes and protected-attribute proxies that are unrelated to the test.

For each scenario, define coverage dimensions and inspect their distribution. A hundred near-identical polite users do not provide broad coverage. Ten reviewed trajectories spanning authorization, correction, outage, ambiguity, and escalation may provide more actionable evidence.

Synthetic users can discover unexpected paths, but they do not estimate real-world prevalence unless sampled from a representative production model. Never report a simulated failure rate as a customer failure rate. Use production telemetry to weight scenarios separately and protect sensitive data during any sampling process.

## Reproducibility, cost, and privacy

Conversation simulation involves at least two systems: the simulator model and the chatbot under test. Evaluation may add a third judge model. Record all three model configurations, the DeepEval version, golden revision, application commit, prompts or hashes, tool fixtures, and attempt number.

Set budgets before running:

- Maximum goldens per pull request.
- Maximum user turns per golden.
- Maximum concurrent conversations.
- Provider timeout and bounded infrastructure retry.
- Maximum tool operations per session.
- Daily or pipeline cost ceiling.
- Artifact retention and redaction policy.

Do not cache across application revisions without including every relevant input in the cache key. A stale transcript can make a changed chatbot appear stable. If you cache simulator turns for judge calibration, label them as frozen fixtures and do not present them as a fresh end-to-end run.

Traces and transcripts can contain names, order IDs, retrieved records, tool arguments, and model reasoning. Prefer synthetic identifiers, isolated tenants, and redacted artifacts. Review what the application and DeepEval integrations upload before enabling hosted reporting.

## CI strategy

Pull-request CI should run a small set of stable, high-risk goldens with low concurrency and deterministic backend fixtures. Larger exploratory simulation belongs in scheduled or pre-release jobs because it is slower, costlier, and more stochastic.

Use these release states:

1. **Product failure:** the conversation completed, evidence is complete, and a requirement failed.
2. **Simulation failure:** the synthetic user or callback could not produce a valid conversation.
3. **Judge failure:** a complete conversation exists but evaluation failed or abstained.
4. **Infrastructure failure:** provider, network, environment, or test tenant prevented execution.
5. **Review required:** the score is near a calibrated boundary or metrics disagree.

Only the first state is automatically a product defect. The others still fail or warn according to policy, but they need different owners and retry behavior.

Before enabling a blocking gate, run known controls: one conversation that should complete, one unauthorized request that must be refused, one callback exception, one turn-budget exhaustion, and one deliberately irrelevant assistant. Confirm each is classified correctly.

## Failure diagnosis

### Conversations lose context after the first turn

Verify whether the application expects \`thread_id\`, full \`turns\`, or both. Confirm every callback invocation maps to the same isolated backend session. Inspect backend session logs rather than trusting transcript continuity.

### The simulator reaches the turn limit repeatedly

Check whether the expected outcome is observable and whether the application can reach it in the test tenant. Then inspect for repetitive user turns, vague assistant questions, missing tool state, or a controller that never sees the terminal condition. Raising the limit can increase cost without fixing the trajectory.

### Tests pass even though no side effect occurred

The metric may be judging persuasive text instead of state. Add deterministic assertions against the sandboxed tool ledger and include tool outcome evidence in the trace. Do not rely on the phrase "refund completed."

### Concurrent conversations leak state

Reduce \`max_concurrent\` to one and reproduce. Inspect session keys, global mocks, reused clients, mutable fixtures, and backend tenant isolation. Add unique canaries and fail immediately on cross-thread data.

### Generated users behave unrealistically

Tighten the scenario and relevant user description, review the simulator model, and use a simulation graph for required trajectories. Do not compensate with a huge persona prompt that mixes conflicting goals.

### Results vary too much between runs

Separate transcript generation from judging. Re-score frozen transcripts to measure judge variance, then regenerate with fixed goldens to measure simulator and application variance. Use repeated trials and report distributions for stochastic metrics.

## Common mistakes and limitations

**Testing a direct LLM call instead of the chatbot.** Route the callback through production-like state, retrieval, tools, and policy.

**Using free-form text as the only success evidence.** Assert sandboxed side effects and structured terminal states.

**Allowing unlimited or default concurrency.** Set an intentional limit from quotas and verify session isolation.

**Confusing synthetic breadth with production representativeness.** Simulation explores scenarios; it does not establish customer prevalence.

**Putting unreviewed generated goldens into blocking CI.** Approve scenario, outcome, risk, and data classification first.

**Ending on a vague phrase.** Use structured terminal signals or carefully reviewed stopping logic.

**Comparing exact transcripts.** Evaluate invariants, outcomes, and calibrated conversational requirements instead.

**Ignoring model and artifact privacy.** Synthetic inputs can still retrieve or expose real test-tenant data.

## Implementation checklist

- Pin DeepEval and record simulator, application, and judge model configurations.
- Define reviewed goldens from concrete risks and expected terminal outcomes.
- Route \`model_callback\` through the real stateful application boundary.
- Use isolated tenants and reversible or sandboxed tools.
- Set concurrency, timeouts, turn limits, tool limits, and cost budgets.
- Add a deterministic stopping controller only when the terminal signal is reliable.
- Preserve completed conversations separately from metric results.
- Pair conversational judges with deterministic state and security assertions.
- Classify product, simulation, judge, and infrastructure failures separately.
- Prove known controls before making the job blocking.

## Frequently asked questions

### What does ConversationSimulator return?

The current official docs say \`simulate()\` returns a list of \`ConversationalTestCase\` objects. Each contains the generated conversation turns and can be passed to multi-turn metrics through DeepEval's evaluation workflow.

### Is ConversationSimulator the same as the Synthesizer?

No. The synthesizer creates goldens, including conversational scenarios and expected outcomes. ConversationSimulator uses conversational goldens to generate the actual user-assistant exchange against your chatbot callback.

### Does model_callback need conversation history?

Only \`input\` is mandatory according to current docs. Declare \`turns\` and \`thread_id\` when your application needs history or persistent session state. Forward only what matches the real application protocol.

### How does a simulation stop?

It can stop at \`max_user_simulations\`, when default expected-outcome logic or a custom \`stopping_controller\` ends it, or when a simulation graph reaches a terminal node. Always retain a hard turn limit.

### Should CI regenerate conversations on every pull request?

Use a small live set when end-to-end behavior is the requirement. For judge calibration, re-score frozen conversations. Larger exploratory generation is usually better scheduled, with budgets and human review.

### Can synthetic users test authorization and security?

They can exercise those paths, but security outcomes need deterministic backend assertions and isolated data. A model judge should not be the sole authority on whether an unauthorized state change occurred.

### How many conversations are enough?

There is no universal number. Cover distinct risks and state transitions, then measure marginal discovery and operational cost. Duplicate personas do not compensate for missing authorization, correction, outage, or escalation scenarios.

### Should we use a stopping controller or a simulation graph?

Use a stopping controller for global completion or safety conditions. Use a simulation graph when the synthetic user must follow a defined trajectory with branches, terminal nodes, or visit limits. They can complement each other.

## Conclusion

A production-grade DeepEval conversation simulation begins with reviewed goldens and ends with verified state, not attractive transcripts. Connect the simulator to the real session boundary, constrain tools and budgets, stop on meaningful conditions, preserve complete evidence, and evaluate both conversation quality and deterministic outcomes. That makes synthetic users an engineering instrument rather than a demo generator.
`,
    },
  },
  {
    slug: 'deepeval-task-completion-metric-agent',
    clusterId: 'deepeval',
    post: {
      title: 'DeepEval TaskCompletionMetric: Trace Setup and Failure Analysis',
      description:
        'Implement DeepEval TaskCompletionMetric with complete agent traces, calibrated judges, CI gates, outcome evidence, and systematic failure diagnosis.',
      date: '2026-07-13',
      updated: '2026-07-14',
      category: 'Guide',
      image: '/blog/pillars/deepeval.png',
      imageAlt:
        'Agent trace tree connecting user task, tool spans, final outcome, TaskCompletionMetric score, and structured failure diagnosis evidence',
      primaryKeyword: 'deepeval task completion metric',
      keywords: [
        'deepeval task completion metric',
        'DeepEval TaskCompletionMetric',
        'DeepEval agent tracing',
        'DeepEval trace metrics',
        'agent task completion evaluation',
        'LLM agent failure analysis',
        'DeepEval evals iterator',
        'agent evaluation CI gate',
      ],
      contentKind: 'child',
      pillarSlug: 'deepeval-llm-testing-guide',
      relatedSlugs: [
        'deepeval-llm-testing-guide',
        'deepeval-3-to-4-migration-guide-2026',
        'deepeval-skill-codex-claude-cursor-install-2026',
        'deepeval-conversation-simulator-guide-2026',
      ],
      sources: [
        'https://deepeval.com/docs/metrics-task-completion',
        'https://deepeval.com/docs/getting-started-agents',
        'https://deepeval.com/docs/evaluation-component-level-llm-evals',
        'https://deepeval.com/docs/metrics-introduction',
        'https://github.com/confident-ai/deepeval',
      ],
      content: `The **DeepEval Task Completion Metric** asks whether an agent accomplished its task by analyzing the run's trace and comparing the inferred or supplied task with the observed outcome. It is not a string-similarity assertion over the final answer. A valid implementation must expose a coherent top-level trace, meaningful outcome evidence, stable judge configuration, and separate checks for tools, policy, and infrastructure. Otherwise a plausible score can conceal an incomplete run.

Use the [DeepEval 4 testing guide](/blog/deepeval-llm-testing-guide) for the surrounding framework. Related workflows cover the [DeepEval 3-to-4 migration](/blog/deepeval-3-to-4-migration-guide-2026), [coding-agent skill installation](/blog/deepeval-skill-codex-claude-cursor-install-2026), and [ConversationSimulator testing](/blog/deepeval-conversation-simulator-guide-2026). The existing [AI agent evaluation guide](/blog/ai-agent-eval-testing-guide) adds cross-framework strategy. Browse reusable assets in [QASkills](/skills), including the [Playwright CLI skill](/skills/Pramod/playwright-cli) when a task completes through a real browser.

## What TaskCompletionMetric measures

The official [Task Completion documentation](https://deepeval.com/docs/metrics-task-completion) classifies the metric as LLM-as-a-judge, referenceless, agentic, and trace-based. It states that task and outcome are extracted from the trace unless a task is supplied, and that the score represents alignment between them. Current documented options include threshold, task, judge model, reason output, strict mode, async mode, and verbose mode.

This supports a precise interpretation:

- The metric judges **outcome alignment**, not exact wording.
- It requires enough trace evidence to identify the requested task and resulting outcome.
- It can infer the task, but an explicit task may reduce ambiguity when a golden represents a fixed requirement.
- It is model-judged, so calibration and repeated-run analysis matter.
- It is referenceless, so it does not prove factual correctness against an expected answer by itself.
- It should be complemented by process, tool, security, and deterministic assertions.

| Question | TaskCompletionMetric answers it? | Better companion evidence |
| --- | --- | --- |
| Did the agent achieve the requested outcome? | Yes, from trace evidence | Deterministic state assertion when available |
| Did it call the correct tool with exact arguments? | Not specifically | Tool or argument correctness metric plus schema checks |
| Did it follow an approved plan? | Not directly | Plan adherence or deterministic policy assertions |
| Is the final factual answer correct? | Only insofar as outcome evidence shows it | Reference-based or domain-specific metric |
| Did the run violate authorization? | Not safely as the sole check | Backend authorization assertion and security tests |
| Was the provider unavailable? | No; that is not product quality | Infrastructure error classification |

An agent can complete a task through an inefficient path, or follow a plan while failing the outcome. Keep task completion distinct from process quality.

## Prerequisites and version baseline

This tutorial follows current DeepEval 4 docs reviewed on July 14, 2026. Pin the exact package and judge model in your environment. Capture the agent application revision, prompts, tool schemas, retrieval configuration, golden revision, metric options, and attempt number in result artifacts.

Prepare the environment and verify effective configuration:

\`\`\`bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install "deepeval>=4,<5" pytest
python -m pip freeze > requirements-evals.lock

deepeval --version
deepeval diagnose
\`\`\`

Use a test tenant and reversible tools. A task-completion run may invoke search, databases, email, tickets, browser actions, or payments. Replace destructive effects with contract-faithful sandbox implementations and retain receipts so success can be checked independently.

Before adding a model judge, write deterministic smoke tests for tracing boundaries and tool adapters. If the top-level trace cannot reliably capture input and output, no threshold will repair the evidence.

## Design the trace before choosing the threshold

A useful trace is a causal record of one task. It should have:

1. A top-level agent span or trace representing exactly one golden invocation.
2. The user input or explicit task at the root.
3. Child spans for significant LLM, retriever, tool, and sub-agent operations.
4. Validated tool inputs, outputs, and error states where policy permits.
5. A final application outcome at the root, not merely the last model token.
6. Correlation identifiers for the golden, test tenant, and application revision.
7. Clear status for completed, refused, escalated, timed out, or failed execution.

Do not pack many unrelated batch tasks into one observed function. The judge then has to infer which outcome belongs to which request. Conversely, do not attach the top-level metric only to a tiny helper span that cannot see the result.

The current [component-level guide](https://deepeval.com/docs/evaluation-component-level-llm-evals) explains that trace-level metrics evaluate the run while component metrics attach to individual spans. Use that distinction when building a diagnostic stack.

## Implement a minimal trace-level evaluation

The official metric docs show \`EvaluationDataset\`, \`Golden\`, \`evals_iterator(metrics=[...])\`, and an observed agent. This **illustrative implementation** makes the root input and output explicit and runs synchronously for easier diagnosis:

\`\`\`python
from deepeval.dataset import EvaluationDataset, Golden
from deepeval.evaluate import AsyncConfig
from deepeval.metrics import TaskCompletionMetric
from deepeval.tracing import observe, update_current_trace

from app.support_agent import run_support_agent


dataset = EvaluationDataset(
    goldens=[
        Golden(input="Create one support ticket for damaged order 42"),
        Golden(input="Refuse an address change for an unverified caller"),
    ]
)


@observe()
def evaluated_agent(query: str) -> str:
    result = run_support_agent(query=query, tenant="eval-sandbox")
    outcome = result.summary
    update_current_trace(
        input=query,
        output=outcome,
    )
    return outcome


completion = TaskCompletionMetric(
    threshold=0.75,
    model="your-approved-judge-model",
    include_reason=True,
    strict_mode=False,
    verbose_mode=False,
)

for golden in dataset.evals_iterator(
    metrics=[completion],
    async_config=AsyncConfig(run_async=False),
):
    evaluated_agent(golden.input)
\`\`\`

The \`tenant\` argument and result shape are application-specific. Replace them with your own production adapter. Do not return a hand-written success string before checking tool results. The root output should summarize observed state such as ticket ID, refusal status, or escalation result.

Run one case at a time until trace boundaries are correct. Then compare the documented asynchronous loop against your quotas and context propagation. Concurrency is a performance choice, not a quality feature.

## Supply an explicit task when inference is ambiguous

The metric can infer a task from the trace. Explicit \`task\` is useful when the user input contains context but the requirement is narrower, when several phrasings map to one acceptance criterion, or when the test is an authorization refusal whose successful outcome is intentionally non-completion of the user's requested action.

For example:

\`\`\`python
authorization_metric = TaskCompletionMetric(
    task=(
        "Protect the order from unauthorized changes and direct the caller "
        "to the approved identity-verification process."
    ),
    threshold=0.8,
    model="your-approved-judge-model",
    include_reason=True,
)
\`\`\`

This reframes a refusal correctly: the agent completes the policy task by not performing the caller's prohibited action. Still add a deterministic assertion that the order record did not change. An LLM judge reason is not an authorization audit.

Do not write explicit tasks that encode the desired score, such as "judge this successful." State the observable objective and constraints. Keep the task in version control and review changes like test requirements.

## Make outcome evidence concrete

Task completion is strongest when the trace includes verifiable outcomes. Build a normalized outcome object in the application layer, then present a concise representation to the trace while retaining restricted raw receipts separately.

This **illustrative adapter pattern** validates tool state before reporting completion:

\`\`\`python
from dataclasses import dataclass


@dataclass(frozen=True)
class TicketOutcome:
    status: str
    ticket_id: str | None
    created_count: int
    authorization: str


def normalize_ticket_outcome(tool_result: dict) -> TicketOutcome:
    status = str(tool_result.get("status", "unknown"))
    ticket_id = tool_result.get("ticket_id")
    created_count = int(tool_result.get("created_count", 0))
    authorization = str(tool_result.get("authorization", "unknown"))

    if status == "created" and (not ticket_id or created_count != 1):
        raise ValueError("created ticket must have one stable receipt")

    return TicketOutcome(
        status=status,
        ticket_id=ticket_id,
        created_count=created_count,
        authorization=authorization,
    )
\`\`\`

The deterministic validation runs before the judge. A malformed tool response becomes a product or integration error, not a vague low completion score. Avoid putting secrets or full customer records in the trace; use synthetic IDs and redacted receipts.

For browser agents, capture the final URL, visible confirmation reference, network response, and backend state when possible. A screenshot alone may show a stale or spoofed message. The [Playwright CLI skill](/skills/Pramod/playwright-cli) can help collect browser evidence, but backend verification remains application-specific.

## Build a diagnostic metric stack

TaskCompletionMetric tells you whether the outcome aligns with the task. Add orthogonal checks so a failure can be localized:

| Layer | Example check | Failure owner |
| --- | --- | --- |
| Input contract | Schema, required identity, allowed tenant | API or fixture owner |
| Retrieval | Context relevance, source constraints, empty result | Retrieval team |
| Tool selection | Correct tool and allowed order | Agent orchestration team |
| Tool arguments | Exact IDs, types, authorization scope | Tool contract owner |
| Process | Plan adherence or step efficiency | Agent policy owner |
| Outcome | TaskCompletionMetric plus state receipt | Product workflow owner |
| Communication | Relevance, clarity, policy explanation | UX or content owner |
| Infrastructure | Provider timeout, trace export, rate limit | Platform team |

Avoid attaching all model-judged metrics to every pull request. Choose a small blocking set from high-risk requirements and run broader diagnostics on schedule. More metrics can increase cost and disagreement without increasing confidence.

When TaskCompletionMetric fails but deterministic outcome assertions pass, inspect whether the root output omits the evidence, the explicit task is poorly framed, or the judge rubric interprets domain language differently. When the metric passes but state assertions fail, block on the deterministic defect and treat the judge pass as a calibration counterexample.

## Calibrate the judge and threshold

The documented default threshold is not automatically your acceptance threshold. Assemble adjudicated traces representing clear completion, clear failure, partial completion, safe refusal, escalation, and infrastructure interruption. Have domain reviewers label the intended decision before looking at metric scores.

For each candidate threshold, calculate false accepts and false rejects. Weight false accepts more heavily for irreversible or security-sensitive tasks. Keep near-boundary cases for manual review rather than pretending the score is precise.

Use repeated scoring on the same frozen traces to estimate judge variance. If verdicts cross the threshold frequently, change the rubric, model, evidence, or review band. Do not hide instability with unbounded retries or pick the best attempt.

The following application-owned helper illustrates decision classification; it is not a DeepEval API:

\`\`\`python
from dataclasses import dataclass


@dataclass(frozen=True)
class CompletionDecision:
    score: float
    lower_review_bound: float
    pass_threshold: float

    def label(self) -> str:
        if self.score >= self.pass_threshold:
            return "pass"
        if self.score >= self.lower_review_bound:
            return "review"
        return "fail"


assert CompletionDecision(0.84, 0.70, 0.80).label() == "pass"
assert CompletionDecision(0.74, 0.70, 0.80).label() == "review"
assert CompletionDecision(0.42, 0.70, 0.80).label() == "fail"
\`\`\`

Store the raw metric result and reason even if your release policy adds a review band. Never rewrite a framework score to look more certain.

## Diagnose failures from the trace outward

Start with execution validity before reading the judge reason:

1. Did exactly one intended trace exist for the golden?
2. Did the trace contain the original task and a final outcome?
3. Did all required tools or sub-agents finish?
4. Were errors, refusals, retries, and timeouts recorded honestly?
5. Did deterministic state match the trace summary?
6. Did the metric run with the expected judge and options?
7. Does the reason cite evidence actually present in the trace?

Only after these checks should you decide whether the application, metric, or test data is wrong.

| Symptom | Likely cause | Evidence to inspect | Action |
| --- | --- | --- | --- |
| Low score with an empty or generic reason | Missing trace outcome or judge failure | Root input/output and metric error | Repair evidence; do not tune threshold |
| Pass despite a failed tool | Root output claims success without receipt | Tool span and normalized outcome | Make state validation authoritative |
| Safe refusal scores as failure | User request was inferred as the task | Golden requirement and explicit task | Define the policy task and keep no-change assertion |
| Score changes across identical traces | Judge variance or moving alias | Model resolution, config, repeated trials | Pin model and add review band |
| One golden contaminates another | Async context or shared fixture | Trace IDs, tenant IDs, mutable globals | Fix isolation before parallel runs |
| Metric never appears | Wrong attachment point or inactive loop | Observed root and evals iterator | Add negative control and trace smoke test |
| Every case fails after deployment | Provider, secret, or schema change | Infrastructure logs and trace completeness | Classify outage separately from product failure |

Use the local trace inspector described in current DeepEval release and CLI documentation to navigate spans, but retain machine-readable artifacts for CI. Manual TUI diagnosis should not be required to understand whether a job passed.

## CI and release gates

Create tiers:

- **Pull request:** a small, reviewed set of deterministic state checks and high-signal completion cases.
- **Nightly:** broader goldens, repeated judge trials, multiple models or prompts, and non-blocking diagnostics.
- **Pre-release:** production-like tools in isolated tenants, browser workflows, rollback cases, and human review of disagreements.
- **Production monitoring:** sampled traces under privacy controls, compared with incident and user-feedback labels.

Each result needs case ID, application commit, dataset revision, DeepEval version, judge model/config, metric options, trace ID, score, reason, attempt, latency, cost evidence, and failure class. Upload artifacts even when the test fails, with appropriate redaction and access.

Do not retry product failures automatically. Retry only classified transient infrastructure failures with a small bounded policy. A rerun that produces a passing judge score does not erase the initial disagreement; retain both attempts.

Before enabling a gate, include controls:

1. A clearly completed task with a valid state receipt.
2. A clearly failed task with no side effect.
3. A safe refusal where non-action is correct.
4. A partial completion missing one required step.
5. A tool exception and provider timeout classified as execution failures.
6. A trace with missing root output that must invalidate evaluation.

If these do not land in their expected classes, the gate is not ready.

## Common mistakes and limitations

**Scoring only the final message.** TaskCompletionMetric is trace-based. Preserve tool and outcome evidence, not just prose.

**Using completion as a proxy for safety.** An agent can complete a prohibited action. Authorization and policy need separate deterministic checks.

**Leaving the task ambiguous.** Inference is convenient, but safe refusal and multi-objective cases may need an explicit reviewed task.

**Accepting the default threshold without calibration.** Threshold consequences belong to your product risk model and labeled traces.

**Attaching the metric to a helper span.** The judged span must represent the complete task and outcome.

**Treating missing evidence as a low score.** Incomplete traces are invalid evaluations and should have a distinct failure class.

**Rerunning until green.** Retain every attempt and distinguish judge variance from product changes.

**Ignoring cost and privacy.** Full traces can be sensitive, and model judging adds calls. Redact, budget, and restrict access.

## Implementation checklist

- Pin DeepEval, judge model, prompts, tools, and dataset revisions.
- Define one top-level trace per golden and populate root input and outcome.
- Validate sandboxed tool state before reporting success.
- Use explicit tasks for policy refusals or ambiguous requests.
- Add tool, argument, process, security, and deterministic outcome checks as needed.
- Calibrate threshold and review band on adjudicated frozen traces.
- Estimate judge variance through repeated scoring of identical evidence.
- Separate product, judge, instrumentation, and infrastructure failures.
- Store redacted trace and metric artifacts for every attempt.
- Prove positive, negative, refusal, partial, exception, and missing-trace controls.

## Frequently asked questions

### Does TaskCompletionMetric require an expected output?

No. The official docs classify it as referenceless. It judges alignment between task and outcome extracted from the trace or from an explicitly supplied task. Add reference-based and deterministic checks when correctness requires them.

### Why does the metric require tracing?

Agent completion depends on the full run, including tools, state, and final outcome. A plain final string can claim success without demonstrating it. The trace provides the evidence the judge uses to infer task and outcome.

### Should I set the task explicitly?

Set it when the user input is ambiguous, several inputs share one requirement, or safe refusal is the correct completion. Keep the task objective and observable; do not encode a desired score.

### What threshold should we use?

Choose it from human-labeled traces and the cost of false accepts and false rejects. The documented default is a library behavior, not an endorsement for your release policy.

### Is strict mode better for CI?

Not automatically. Current docs say strict mode makes the score binary and sets the threshold to one. Use it only when your calibrated requirement truly demands perfection and the judge is stable enough for that consequence.

### Can TaskCompletionMetric replace tool correctness metrics?

No. Completion judges outcome alignment. Tool and argument checks diagnose whether the right operations ran correctly, and deterministic assertions should validate exact schemas, authorization, and state changes.

### How should safe refusal be scored?

Define the protected objective explicitly, such as preventing an unauthorized change and directing the caller to verification. Then assert deterministically that no prohibited side effect occurred.

### What if the metric passes but the backend state is wrong?

Block on the backend assertion. Preserve the trace as a judge-calibration counterexample, improve outcome evidence or rubric, and do not weaken the deterministic source of truth.

## Conclusion

TaskCompletionMetric is useful when its trace represents a real task and its output represents verified state. Instrument one coherent run, make outcomes concrete, calibrate the judge, and surround the score with orthogonal tool, security, and deterministic checks. The result is a diagnostic release signal that explains agent outcomes rather than a number attached to persuasive text.
`,
    },
  },
];
