import type { SeoClusterArticle } from './seo-cluster-article';

export const promptfooPillar2026: SeoClusterArticle = {
  slug: 'promptfoo-complete-guide-2026',
  clusterId: 'promptfoo',
  post: {
    title: 'Promptfoo Complete Guide for LLM Evals, RAG, and Red Teaming',
    description:
      'Use Promptfoo to design LLM evals, test RAG and coding agents, run red teams, enforce CI gates, preserve evidence, and govern reproducible releases.',
    date: '2026-05-21',
    updated: '2026-07-14',
    category: 'Guide',
    image: '/blog/pillars/promptfoo.png',
    imageAlt:
      'Promptfoo evaluation architecture connecting versioned datasets, model providers, deterministic graders, RAG checks, red teams, CI gates, and governed reports',
    primaryKeyword: 'promptfoo',
    keywords: [
      'promptfoo',
      'promptfoo eval',
      'promptfoo tutorial',
      'LLM evaluation',
      'RAG evaluation',
      'LLM red teaming',
      'prompt testing',
      'Promptfoo CI/CD',
      'Promptfoo Agent Skills',
      'Promptfoo MCP provider',
    ],
    contentKind: 'pillar',
    relatedSlugs: [
      'openai-promptfoo-acquisition-explained-2026',
      'promptfoo-agent-skills-codex-claude-install-2026',
      'promptfoo-mcp-provider-security-testing-2026',
      'promptfoo-evaluate-codex-vs-claude-agents-2026',
    ],
    sources: [
      'https://www.promptfoo.dev/docs/intro/',
      'https://www.promptfoo.dev/docs/installation/',
      'https://www.promptfoo.dev/docs/getting-started/',
      'https://www.promptfoo.dev/docs/configuration/guide/',
      'https://www.promptfoo.dev/docs/configuration/reference/',
      'https://www.promptfoo.dev/docs/configuration/prompts/',
      'https://www.promptfoo.dev/docs/configuration/test-cases/',
      'https://www.promptfoo.dev/docs/configuration/expected-outputs/',
      'https://www.promptfoo.dev/docs/providers/',
      'https://www.promptfoo.dev/docs/providers/http/',
      'https://www.promptfoo.dev/docs/guides/evaluate-rag/',
      'https://www.promptfoo.dev/docs/red-team/configuration/',
      'https://www.promptfoo.dev/docs/red-team/quickstart/',
      'https://www.promptfoo.dev/docs/red-team/troubleshooting/data-handling/',
      'https://www.promptfoo.dev/docs/integrations/ci-cd/',
      'https://www.promptfoo.dev/docs/configuration/caching/',
      'https://www.promptfoo.dev/docs/configuration/outputs/',
      'https://www.promptfoo.dev/docs/usage/command-line/',
      'https://www.promptfoo.dev/docs/usage/sharing/',
      'https://www.promptfoo.dev/docs/configuration/telemetry/',
      'https://www.promptfoo.dev/docs/integrations/agent-skill/',
      'https://www.promptfoo.dev/docs/providers/mcp/',
      'https://www.promptfoo.dev/docs/guides/evaluate-coding-agents/',
      'https://www.promptfoo.dev/docs/providers/openai-codex-sdk/',
      'https://github.com/promptfoo/promptfoo',
      'https://github.com/promptfoo/promptfoo/releases/tag/0.121.18',
      'https://openai.com/index/openai-to-acquire-promptfoo/',
    ],
    content: `
**Promptfoo is an open-source evaluation and red-teaming framework for testing prompts, models, RAG pipelines, agents, and AI application endpoints against versioned test cases.** A dependable workflow treats it as an evaluation runner rather than an automatic truth machine: connect the real system, preserve representative datasets, use deterministic assertions wherever possible, calibrate model graders against human decisions, test retrieval separately from generation, and make CI decisions from explicit risk thresholds. Promptfoo supplies the matrix, provider adapters, assertions, reports, and security probes; your team still owns requirements, labels, permissions, and release accountability.

This guide was researched against first-party documentation available on **July 14, 2026**. Command examples are pinned to Promptfoo **0.121.18**, the latest GitHub release observed on that date. The official [installation guide](https://www.promptfoo.dev/docs/installation/) recommends Node.js 24 LTS and says Node.js 20 support ends July 30, 2026. Use \`@latest\` to explore current behavior on a workstation only when change is acceptable; use a reviewed version in CI and revalidate its configuration schema during upgrades.

Four companion guides cover fast-moving surfaces in more depth:

- [What OpenAI's Promptfoo acquisition announcement means for open-source testing](/blog/openai-promptfoo-acquisition-explained-2026)
- [Install Promptfoo Agent Skills in Codex and Claude Code](/blog/promptfoo-agent-skills-codex-claude-install-2026)
- [Test and red-team an MCP server with the Promptfoo MCP provider](/blog/promptfoo-mcp-provider-security-testing-2026)
- [Evaluate Codex versus Claude coding agents with Promptfoo](/blog/promptfoo-evaluate-codex-vs-claude-agents-2026)

For the broader testing architecture, read the [LLM testing guide](/blog/testing-llm-applications-guide) and the [LLM evaluation CI/CD quality-gates guide](/blog/llm-evaluation-ci-cd-quality-gates). Browse reusable workflows in the [QA skills directory](/skills). The author-qualified [Playwright CLI skill](/skills/Pramod/playwright-cli) is useful when an eval requires browser evidence around an AI feature, but browser automation and semantic grading should remain separately inspectable.

### Source boundary used throughout this guide

Statements introduced as **documented behavior** summarize Promptfoo or OpenAI first-party material linked in the same section. Statements introduced as **recommended practice** are engineering guidance for building a defensible evaluation program. A recommendation is not a Promptfoo feature promise, an OpenAI roadmap commitment, or a universal threshold. Numeric thresholds in examples are illustrative policy values; calibrate them with labeled data and the cost of false acceptance versus false rejection.

---

## Promptfoo at a glance

Promptfoo evaluates combinations. A prompt or application input is rendered with variables, sent through one or more providers, and checked by assertions attached to a test case or applied by default. The result records the response, grading evidence, timing, token or cost data when providers expose it, and run metadata. The local web viewer presents those combinations as a matrix, while structured exports let CI and analysis systems consume them.

| Building block | What it represents | Example | Ownership question |
| --- | --- | --- | --- |
| Prompt | Text, messages, file, template, or input passed to a target | A support policy question | Is this the same instruction assembly production uses? |
| Provider | Model, HTTP endpoint, local program, agent runtime, or MCP server | \`openai:chat:gpt-5.4-mini\` or an internal API | Does the adapter preserve production behavior and evidence? |
| Test case | Variables, metadata, assertions, and optional provider options | A refund request from an ineligible account | Is the case representative, labeled, and safe to retain? |
| Assertion | A deterministic or model-based grading rule | JSON schema, prohibited phrase, rubric | Does the grader observe the actual requirement? |
| Dataset | Versioned collection of test cases and strata | Production-derived support questions | Can a reviewer trace provenance, consent, and split membership? |
| Eval run | One evaluated configuration at a point in time | Candidate prompt against frozen regression data | Can the team reproduce the run and compare it fairly? |
| Red-team scan | Generated or curated adversarial probes against a bounded target | Prompt injection against a support agent | Are target purpose, permissions, plugins, and review rules explicit? |
| Report | Human or machine-readable result artifact | JSON, JSONL, HTML, or JUnit XML | Does storage expose prompts, outputs, secrets, or personal data? |

The framework can compare prompt variants and providers, but a large matrix is not automatically good evidence. If two providers receive different tool access, retrieval state, sampling controls, or response transforms, their scores do not isolate model quality. If a model grader sees the reference answer for one candidate but not another, the comparison is invalid. If cached responses come from an older target, the run may be reproducible but no longer current. Evaluation design remains a scientific and product-risk responsibility.

### What Promptfoo is not

Promptfoo is not a source of business requirements. It does not know whether a medical response is clinically acceptable, whether a refund is authorized, or whether a tool call respects a tenant boundary unless those rules and observables are provided. It is not proof that a model is safe under every possible attack. It is not a replacement for unit, integration, contract, end-to-end, accessibility, performance, or conventional security testing. It is also not a guarantee that two nominally identical hosted model calls will remain behaviorally identical over time.

Use deterministic software tests for deterministic contracts. Use Promptfoo where the application introduces prompt variants, provider differences, semantic latitude, stochastic behavior, retrieval context, model grading, agent trajectories, or generated adversarial cases. A mature release gate commonly combines both.

| Requirement | Primary test mechanism | Promptfoo's role |
| --- | --- | --- |
| API response matches a JSON schema | Contract test and schema validator | Repeat the check across model/provider combinations |
| Answer cites an approved policy revision | Deterministic citation and source-ID checks | Exercise representative questions and preserve output evidence |
| Response is professionally phrased | Calibrated rubric plus sampled human review | Run the rubric consistently and expose disagreements |
| User cannot read another tenant's record | Authorization integration test | Add adversarial natural-language and tool-use variations |
| Retriever returns relevant approved documents | Retrieval metrics and labeled document IDs | Compare configurations and score context separately |
| Agent completes a repository task safely | Isolated fixture, state diff, test execution, trace review | Invoke agent runtimes and aggregate outcome evidence |
| Checkout works in a browser | Playwright end-to-end test | Optionally generate AI inputs, but keep browser assertions explicit |

## July 2026 status and OpenAI's announcement

**Documented behavior:** Promptfoo remains available as an open-source CLI and library in the [official GitHub repository](https://github.com/promptfoo/promptfoo). On March 9, 2026, [OpenAI announced an agreement to acquire Promptfoo](https://openai.com/index/openai-to-acquire-promptfoo/). The announcement says that, after the acquisition is finalized, Promptfoo technology will be integrated into OpenAI Frontier. It also says the companies will continue building the open-source project. The same announcement states that closing is subject to customary conditions.

Those words set a narrow factual boundary. The announcement does not establish that closing has occurred, does not publish transaction terms, and does not promise that every current CLI feature will become part of Frontier. It does not say that the open-source project will become OpenAI-only, that other providers will be removed, or that licensing, pricing, hosting, data handling, or governance terms will remain unchanged forever. Until a later first-party source states otherwise, those are unanswered operational questions rather than facts.

**Recommended practice:** treat the announcement as a vendor-governance event, not as a reason to abandon working evals or assume future capabilities. Record the Promptfoo package version, license, source revision where required, supported providers, data-flow choices, and export format in an internal dependency register. Keep your datasets, rubrics, and acceptance policy in portable files. Export enough result evidence to move to another runner if your risk posture or product requirements change. Reassess on release upgrades and when an authoritative closing or product-integration notice appears.

| Question after the announcement | What is sourced as of July 14, 2026 | What remains an organizational decision |
| --- | --- | --- |
| Will open source continue? | OpenAI says the parties will continue building the open-source project | How much the organization relies on that statement and what exit plan it needs |
| Is the deal closed? | The announcement says closing is subject to customary conditions | Whether legal or procurement requires updated evidence before renewal |
| Will Promptfoo support non-OpenAI providers? | Current documentation lists many provider interfaces | Which provider combinations the team validates and pins |
| Will data flow into Frontier? | The announcement describes future Frontier integration after finalization | Whether the team enables any hosted feature under its data policy |
| Does acquisition improve eval quality? | No comparative result is supplied by the announcement | How the team measures quality on its own labeled benchmark |
| Does an open-source CLI remove vendor risk? | Source availability reduces some portability risk | Patch policy, maintainership, hosted dependencies, and migration budget |

The focused [OpenAI and Promptfoo announcement explainer](/blog/openai-promptfoo-acquisition-explained-2026) tracks this distinction without turning an announced transaction into an unsupported product roadmap.

## Install Promptfoo with a reproducible baseline

**Documented behavior:** Promptfoo supports installation through npm-compatible workflows and can also be invoked with \`npx\`. The July 14 installation page recommends Node 24 LTS, notes the approaching Node 20 support cutoff, and provides \`promptfoo --version\` as the verification command. The [0.121.18 release page](https://github.com/promptfoo/promptfoo/releases/tag/0.121.18) is the version baseline used in this article.

\`\`\`bash
# Node 24 LTS is the documented recommendation on July 14, 2026.
node --version

# Add a reviewed project dependency so the lockfile records the version.
npm install --save-dev promptfoo@0.121.18

# Verify the executable resolved from this project.
npx promptfoo --version

# Scaffold an example, then inspect every generated file before committing it.
npx promptfoo init --example getting-started
\`\`\`

If the repository uses pnpm or yarn, install the same reviewed version with that package manager. Do not mix a global binary, an unpinned \`npx promptfoo@latest\` call, and a project lockfile without checking which executable ran. \`npx promptfoo --version\`, the package manager's dependency tree, and CI logs should agree.

**Recommended practice:** commit the package manifest, lockfile, configuration, prompts, non-sensitive test fixtures, custom providers, custom graders, and a concise README that defines the supported invocation. Keep credentials in the CI secret store or process environment. Do not copy an API key into \`config.env\`: current Promptfoo documentation warns that resolved configuration may appear in exported results. Use a dedicated service account with only the model or target privileges required by the suite.

For experimentation, the [getting-started guide](https://www.promptfoo.dev/docs/getting-started/) uses \`npx promptfoo@latest eval\` and \`view\`. That is reasonable when a developer intentionally wants the newest CLI. For a release gate, replace \`@latest\` with the lockfile-resolved command or an explicit reviewed version. The distinction is not cosmetic: provider IDs, runtime requirements, schema fields, default behavior, and report structures can evolve.

### Recommended repository layout

\`\`\`text
evals/
  README.md
  promptfooconfig.yaml
  prompts/
    support-system.txt
    support-system-candidate.txt
  datasets/
    regression.yaml
    safety.yaml
    retrieval.yaml
  providers/
    support-api.mjs
  graders/
    policy-assertion.mjs
  fixtures/
    policies/
      refunds-2026-07.md
  reports/
    .gitkeep
package.json
package-lock.json
\`\`\`

Generated reports should usually be CI artifacts rather than committed files because they may contain prompts, test variables, model outputs, provider configuration, and sensitive traces. Commit a sanitized golden report only when it has a defined review purpose and retention owner.

## Understand the evaluation execution model

The useful mental model is a controlled experiment, not a collection of prompts. Promptfoo renders every selected prompt with each test case, invokes every selected provider, then applies applicable assertions. This creates a cross-product unless filters, scenarios, or configuration narrow it. A config with two prompt variants, three providers, and one hundred tests can create six hundred provider calls before repeats, grader calls, or retries. Estimate that work before opening a pull request gate.

| Dimension | What changes when it varies | How to control interpretation |
| --- | --- | --- |
| Prompt | Instructions, examples, message ordering, tool descriptions | Change one reviewed prompt dimension at a time |
| Provider | Model, endpoint, runtime, adapter, defaults | Record exact provider and model IDs plus effective configuration |
| Dataset | Input distribution, references, metadata, adversarial coverage | Freeze a version for comparisons and report slice counts |
| Assertion | Oracle behavior, threshold, judge model, transformation | Version grader logic independently from the system under test |
| Repeat | Sampling variation and agent trajectory | Preserve trial identity and analyze distributions |
| Cache | Whether an earlier response is replayed | State whether the decision uses cached or fresh calls |
| Environment | Secrets, network, retrieval index, external services | Record environment identity without exporting secrets |

If a candidate performs better after the prompt, dataset, grader, and model all changed, the run cannot attribute the improvement. It may still be a useful system comparison, but label it correctly. For prompt optimization, hold the provider, tests, grader, retrieval snapshot, and sampling policy stable. For provider selection, hold the application behavior and test set stable while acknowledging that provider-specific features can prevent perfect parity. For regression gates, compare the deployed baseline and candidate against the same frozen cases, then run a separate fresh-data or shadow evaluation for drift.

### A minimal, reviewable configuration

The provider identifiers below match the July 2026 getting-started documentation. They are examples, not recommendations about model quality. Confirm availability, terms, region, and pricing in each provider's current first-party documentation before use.

\`\`\`yaml
# yaml-language-server: $schema=https://promptfoo.dev/config-schema.json
description: 'Support answer regression suite'

prompts:
  - id: file://prompts/support-system.txt
    label: 'Current production prompt'
  - id: file://prompts/support-system-candidate.txt
    label: 'Candidate prompt'

providers:
  - id: openai:chat:gpt-5.4-mini
    label: 'OpenAI reviewed model'
  - id: anthropic:messages:claude-opus-4-6
    label: 'Anthropic reviewed model'

defaultTest:
  assert:
    - type: is-json
    - type: javascript
      value: 'JSON.parse(output).answer.length <= 800'
      metric: 'answer-length-policy'

tests: file://datasets/regression.yaml
\`\`\`

This config intentionally does not declare a universal latency, cost, or semantic threshold. Those values must come from the product's measured service objective, budget, and grader calibration. It also does not place provider keys in YAML. Built-in providers read their supported credentials from the process environment.

The \`id: file://...\` objects and labels follow the current prompt configuration shape. The official [prompt configuration guide](https://www.promptfoo.dev/docs/configuration/prompts/) also documents inline, multiline, chat, generated, and templated prompts. Recheck the schema for the pinned version during upgrades, and use the simplest representation that preserves the production request accurately.

## Configure prompts without creating hidden variants

Promptfoo uses Nunjucks templating for prompt variables. A placeholder such as \`{{question}}\` is populated from test variables. The environment global uses \`{{env.NAME}}\`, not shell-style \`$NAME\` inside YAML. The official [Agent Skills guide](https://www.promptfoo.dev/docs/integrations/agent-skill/) calls this out because coding agents frequently generate the wrong syntax.

Templates are powerful but can obscure what was actually sent. A conditional branch, file glob, environment-selected directory, or generated prompt can cause local and CI runs to render different messages from the same visible config. Preserve rendered prompts in controlled result evidence, and add a small deterministic fixture that confirms critical variables and role ordering.

| Prompt representation | Best use | Main risk | Review control |
| --- | --- | --- | --- |
| Inline text | Tiny experiments | Config becomes unreadable | Keep only genuinely short prompts inline |
| Text or Markdown file | Versioned production instructions | Included files may drift from deployed prompt | Hash or package the same file production loads |
| Chat message JSON/YAML | Role-sensitive conversations | Provider adapters may map fields differently | Inspect rendered messages for every provider |
| Nunjucks template | Variables and bounded conditional content | Environment-dependent hidden variants | Test each branch and record resolved inputs |
| JavaScript/Python generator | Dynamic assembly matching application code | Evaluation can diverge from production implementation | Share the production assembly library where feasible |
| Multiple prompt variants | A/B or regression comparison | Cross-product cost and confounded edits | Label variants and change one hypothesis at a time |

**Recommended practice:** put each production candidate in a separate reviewed file, retain a stable ID and human label, and include a short change hypothesis in the pull request. Do not overwrite the baseline before the comparison completes. If production injects policies, retrieved context, user profile, or tool schemas, either invoke production through an HTTP/custom provider or assemble those inputs through the same shared code. A copied approximation may be useful for component diagnosis but should not be described as an end-to-end release test.

## Connect providers and the real application boundary

A Promptfoo provider is the invocation boundary. It can be a built-in model integration, an HTTP endpoint, a JavaScript or Python file, a coding-agent runtime, an MCP server, or another documented adapter. Provider choice determines what the eval actually measures.

| Provider style | Measures | Strong use | Important limitation |
| --- | --- | --- | --- |
| Built-in model provider | Direct model behavior under Promptfoo config | Prompt/model comparison | Omits application retrieval, tools, policy, and post-processing |
| HTTP provider | Deployed or local API behavior | End-to-end application eval | Needs explicit request/response transformation and safe auth |
| JavaScript provider | In-process adapter or custom workflow | Reusing TypeScript application code | Worker/runtime behavior can differ from deployed service |
| Python provider | Python model, retriever, chain, or application wrapper | RAG and ML-heavy systems | Python environment and dependencies must be pinned separately |
| MCP provider | MCP server as the target system | Tool protocol robustness and red teaming | Requires JSON tool-call prompts and returns JSON-string tool results |
| Coding-agent provider | Agent plus harness, filesystem, tools, and policies | Repository task evaluation | Side effects, nondeterminism, and runtime permissions dominate results |

The [provider catalog](https://www.promptfoo.dev/docs/providers/) is broad, but breadth does not imply semantic equivalence. Provider-specific options such as system-message handling, tool formats, reasoning controls, token accounting, safety filters, and response metadata differ. Keep common requirements in tests, then preserve provider-specific configuration where parity would otherwise remove a capability the product uses.

### HTTP provider for an application endpoint

The [HTTP provider documentation](https://www.promptfoo.dev/docs/providers/http/) supports explicit URL, method, headers, body, and \`transformResponse\` configuration. This concrete example targets a local test service whose contract is \`POST /api/support/answer\` and whose JSON response contains \`answer\`, \`citations\`, and \`requestId\`.

\`\`\`yaml
providers:
  - id: https
    label: 'Local support application'
    config:
      url: 'http://127.0.0.1:4300/api/support/answer'
      method: POST
      headers:
        Content-Type: application/json
        Authorization: 'Bearer {{env.SUPPORT_EVAL_TOKEN}}'
      body:
        question: '{{question}}'
        customerTier: '{{customerTier}}'
        conversationId: '{{conversationId}}'
      transformResponse: 'json.answer'

prompts:
  - '{{question}}'

tests:
  - vars:
      question: 'Can an annual plan be refunded after 45 days?'
      customerTier: 'standard'
      conversationId: 'eval-refund-45-days'
    assert:
      - type: not-contains
        value: 'guaranteed refund'
\`\`\`

This tests only the transformed answer. If citation IDs or request metadata are requirements, a transform that discards them prevents those assertions. Return a structured representation or use assertion context appropriately. Never log the bearer token, place it in a shared config, or point a write-capable eval at production customer data. Use a synthetic tenant and a target that can be reset.

### Custom providers as anti-corruption layers

The [JavaScript provider interface](https://www.promptfoo.dev/docs/providers/custom-api/) requires an ID and \`callApi\`; Python providers expose a corresponding \`call_api\` pattern. A custom provider is appropriate when the application needs authentication, retrieval, tracing, session setup, or output normalization that would make YAML fragile.

\`\`\`javascript
// evals/providers/support-api.mjs
export default class SupportApiProvider {
  id = () => 'support-api:staging';

  callApi = async (prompt, context) => {
    const response = await fetch('http://127.0.0.1:4300/api/support/answer', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ' + process.env.SUPPORT_EVAL_TOKEN,
      },
      body: JSON.stringify({
        question: prompt,
        traceId: context.vars.traceId,
        customerTier: context.vars.customerTier,
      }),
    });

    if (!response.ok) {
      return { error: 'Support API returned ' + response.status };
    }

    const body = await response.json();
    return {
      output: JSON.stringify({ answer: body.answer, citations: body.citations }),
      metadata: { requestId: body.requestId },
    };
  };
}
\`\`\`

This adapter is illustrative application code using the documented provider shape. Its endpoint and response contract are specific to the example, not Promptfoo APIs. In production, add a timeout, validated response schema, secret-safe error handling, and a deterministic cleanup strategy. Unit-test the provider independently: an adapter bug can make every model appear wrong.

## Build datasets that represent decisions, not demos

Evaluation quality is bounded by dataset quality. Five memorable prompts can demonstrate a workflow but cannot support a broad release claim. A useful dataset records why each case exists, where it came from, which behavior it represents, who labeled it, whether it may be retained, and which slice should be reported.

The official [test-case configuration](https://www.promptfoo.dev/docs/configuration/test-cases/) supports inline cases and external CSV, JSON, JSONL, YAML, YML, spreadsheet, globbed, and selected remote sources. External files keep a growing suite reviewable. Metadata can support filtering and slice analysis. Format choice should follow governance and diff quality, not only convenience.

| Dataset source | Value | Bias or risk | Control |
| --- | --- | --- | --- |
| Production failures | Direct evidence of user-impacting behavior | Privacy, overrepresentation of incidents, delayed labels | Redact, obtain permission, preserve provenance, stratify |
| Support or expert-authored cases | Domain coverage and clear intent | Author expectations may not match real users | Validate against observed traffic and affected-user needs |
| Synthetic generation | Fast expansion of variations and edge cases | Generator artifacts, duplicated patterns, unrealistic language | Review samples, deduplicate, compare distributions |
| Red-team probes | Adversarial and policy-boundary exploration | Generated cases may be invalid or out of scope | Human triage, target purpose, severity policy |
| Public benchmark | Comparable task definition | Domain mismatch, contamination, gaming | Keep separate from product acceptance evidence |
| Random traffic sample | Distributional monitoring | Rare high-risk cases can disappear in averages | Add risk-weighted strata and minimum slice counts |

### A reviewable test record

\`\`\`yaml
- description: 'Standard customer asks for a late annual-plan refund'
  vars:
    question: 'I bought the annual plan 45 days ago. Can I get a full refund?'
    customerTier: 'standard'
    policyText: file://../fixtures/policies/refunds-2026-07.md
  metadata:
    caseId: 'refund-late-standard-001'
    source: 'domain-expert-authored'
    policyRevision: 'refunds-2026-07'
    risk: 'high'
    locale: 'en-US'
  assert:
    - type: is-json
    - type: javascript
      value: |
        const answer = JSON.parse(output);
        return answer.eligible === false && answer.escalate === false;
      metric: 'refund-policy-decision'
    - type: llm-rubric
      value: |
        The answer explains the ineligibility clearly and respectfully.
        It must not invent an exception or claim a refund was processed.
      metric: 'explanation-quality'
\`\`\`

The deterministic assertion owns the policy decision; the rubric grades communication. Do not let a language model decide eligibility when an exact rule is available. The rubric includes the relevant forbidden outcomes instead of asking whether the answer is merely "good." If the grader needs the policy text, inject it into the rubric or grader context in the documented way; a grader cannot compare against a source it never receives.

### Split data by purpose

Maintain at least four conceptual sets even if the files are organized differently:

1. **Development set:** visible cases used while authoring prompts and adapters.
2. **Regression set:** stable labeled cases that protect known requirements and failures.
3. **Holdout set:** restricted cases used for periodic, less-gameable comparison.
4. **Monitoring set:** recent production-matched samples used to detect drift after release.

Red-team cases can overlap these purposes, but generated probes and confirmed vulnerabilities should not be conflated. Preserve confirmed exploit reproductions as stable regression tests after remediation. Refresh generated attacks separately so the scanner can explore new variants.

Prevent train-on-test behavior in both humans and agents. If a prompt author can inspect every holdout answer, the set gradually becomes another development set. If an automatic optimizer receives the test outputs, treat those cases as exposed. Rotate holdouts under a documented cadence and report how much of the suite is fresh versus historical.

### Generate data carefully

Promptfoo documents dataset generation, but generated cases are hypotheses, not labels. Use generation to propose personas, phrasings, edge conditions, and missing combinations. Then validate constraints, remove duplicates, check that expected behavior is actually defined, and label the provenance. Do not let the same model generate a case, write the expected answer, and grade its own answer without independent calibration.

For high-risk domains, define a review matrix:

| Review dimension | Minimum question |
| --- | --- |
| Validity | Is the input possible under the product and data model? |
| Requirement | Is the expected behavior supported by an authoritative rule? |
| Representativeness | Which traffic or risk slice does this case cover? |
| Privacy | May the input and output be sent to every configured provider? |
| Independence | Did the same model create both the expected result and the verdict? |
| Maintenance | What event should update or retire this case? |

## Choose assertions and graders by observability

Promptfoo assertions range from exact and structural checks to custom code and model-graded metrics. The [assertions reference](https://www.promptfoo.dev/docs/configuration/expected-outputs/) documents fields such as \`type\`, \`value\`, \`threshold\`, \`weight\`, \`provider\`, \`transform\`, \`contextTransform\`, and \`metric\`. It also supports assertion sets and external JavaScript or Python logic.

Start with the cheapest reliable oracle that can observe the requirement. A deterministic grader is not automatically correct, but it is easier to inspect, rerun, and debug. A model grader is justified when acceptable outputs vary semantically and an exact rule would reject legitimate behavior. Human review remains necessary when the label is subjective, consequential, novel, or used to calibrate an automated grader.

| Requirement | Preferred first grader | Why | Escalation path |
| --- | --- | --- | --- |
| Valid JSON | \`is-json\` or JSON schema | Exact and inexpensive | Custom schema logic for business constraints |
| Required identifier | \`contains\`, regex, or parsed equality | Directly observable | Custom code for normalized forms |
| Forbidden secret pattern | Deterministic detector | A semantic judge may overlook exact leakage | Security review and expanded detectors |
| Reference fact | Parsed exact check or \`factuality\` with supplied reference | Depends on answer latitude | Human adjudication for disputed references |
| Grounding in retrieved context | Context assertion plus citation checks | Needs source-to-claim comparison | Claim-level human audit |
| Tone or clarity | Calibrated \`llm-rubric\` | Multiple phrasings can satisfy it | Sampled expert review and disagreement analysis |
| Tool authorization | State and trace assertion | Final text cannot prove safe execution | Integration test of policy enforcement |
| Agent task completion | Tests, state diff, and outcome rubric | Transcript alone may be misleading | Manual trace review for failures and risky passes |

### Layer assertions rather than hiding them in one score

A single rubric that asks whether an answer is correct, safe, concise, grounded, and polite creates an ambiguous failure. Split independent requirements into named metrics. A response can then fail grounding while passing format and policy, which points to a different remediation than a malformed result.

\`\`\`yaml
defaultTest:
  assert:
    - type: is-json
      metric: 'contract-json'
    - type: javascript
      value: |
        const result = JSON.parse(output);
        return Array.isArray(result.citations) && result.citations.length > 0;
      metric: 'citation-present'
    - type: javascript
      value: |
        const result = JSON.parse(output);
        return result.answer.length <= 800;
      metric: 'answer-length'
    - type: llm-rubric
      value: |
        Judge only whether the answer is clear and directly addresses the question.
        Do not infer policy correctness; another assertion owns that decision.
      provider: openai:chat:gpt-5.4-mini
      metric: 'clarity-and-relevance'
\`\`\`

The explicit grader provider improves reproducibility, but a hosted model identifier can still change behavior. Record grader responses and reasons, test grader upgrades against a labeled calibration set, and avoid using the candidate model as its only judge. If a provider changes or retires a model, rerun baseline and candidate through the new grader before interpreting a score delta.

### Calibrate a model grader

Calibration is a measurement exercise:

1. Create a balanced set of human-labeled passes, failures, and ambiguous cases.
2. Define a rubric that names one decision and includes the evidence the judge needs.
3. Run the intended judge configuration repeatedly where variability matters.
4. Compare false acceptance, false rejection, and disagreement by risk slice.
5. Review reasons, not only scores, for leakage, positional bias, verbosity bias, or unsupported assumptions.
6. Set a threshold based on the consequence of each error, not on a round number.
7. Preserve uncertain cases for human review rather than forcing every output into pass or fail.
8. Recalibrate after changing the judge model, rubric, context assembly, or output transform.

Weighted assertions can express relative contribution, but a weighted average must not permit a critical security failure to be canceled by strong tone. Treat hard invariants as mandatory gates. Use weighting only among commensurate soft dimensions whose tradeoff has been approved.

For a concrete deterministic extension, see the [Promptfoo custom JavaScript assertion example](/blog/promptfoo-custom-javascript-assertion-example). For output contracts, use the [Promptfoo JSON schema testing guide](/blog/promptfoo-json-schema-structured-output-tests). For prompt experimentation, the [Promptfoo variable-matrix guide](/blog/promptfoo-variable-matrix-prompt-versions) explains how to avoid mixing unrelated changes.

## Evaluate RAG as retrieval plus generation

**Documented behavior:** Promptfoo's [RAG evaluation guide](https://www.promptfoo.dev/docs/guides/evaluate-rag/) explicitly recommends evaluating document retrieval and answer generation separately. It documents output-oriented checks such as factuality and answer relevance, context-oriented checks such as context faithfulness, context recall, and context relevance, and custom metrics for application-specific requirements. It also supports custom providers that invoke retrieval code and context transforms that extract evidence from structured provider responses.

This decomposition matters because an apparently wrong answer can have several causes:

| Failure | Observable evidence | Likely owner | Useful regression |
| --- | --- | --- | --- |
| Relevant document was not retrieved | Expected document ID absent from ranked results | Retrieval/index team | Query-to-document recall or ranking case |
| Irrelevant chunks consumed the context budget | Low relevance among selected chunks | Retriever or chunking owner | Context precision/relevance by query slice |
| Correct context was retrieved but ignored | Source present; answer omits or contradicts it | Prompt/model/application owner | Context-faithfulness and required-fact check |
| Unsupported claim was added | Claim has no approved source | Generation or post-processing owner | Citation and claim-support assertion |
| Correct answer cites wrong revision | Answer text looks valid; source ID is stale | Corpus governance owner | Active-revision and citation-ID assertion |
| Access control leaked a document | Retrieved source belongs to another tenant | Authorization owner | Tenant-boundary integration test and red-team case |

A single end-to-end score cannot diagnose these pathways. Preserve retrieved document IDs, ranks, corpus revision, chunker version, filter settings, answer, citations, and provider configuration. If the application returns only prose, add trace metadata or a test-only response mode before claiming that retrieval quality was measured.

### A bounded RAG configuration

The assertion names and context-variable pattern below follow the July 2026 RAG documentation. The thresholds are deliberately marked as example values; they are not Promptfoo defaults or industry benchmarks.

\`\`\`yaml
prompts:
  - file://prompts/policy-answer.txt

providers:
  - id: file://providers/policy-rag.py
    label: 'Frozen policy index 2026-07-01'

tests:
  - description: 'Late annual-plan refund uses active policy evidence'
    vars:
      query: 'Can a standard customer receive a full refund after 45 days?'
      context: file://fixtures/policies/refunds-2026-07.md
    metadata:
      corpusRevision: 'policies-2026-07-01'
      risk: 'high'
    assert:
      - type: context-faithfulness
        threshold: 0.8
        metric: 'example-context-faithfulness'
      - type: context-relevance
        threshold: 0.7
        metric: 'example-context-relevance'
      - type: factuality
        value: 'A standard annual plan is not eligible for a full refund after 45 days.'
        metric: 'refund-policy-fact'
\`\`\`

The provider path is a concrete project convention, not a built-in Promptfoo file. The Python provider must implement the documented \`call_api(prompt, options, context)\` contract and return an output. In a real RAG eval, return or retain retrieval evidence as well. If the generated answer is one field in a structured response, use \`options.transform\` for the answer and \`contextTransform\` for the retrieved context as documented, then unit-test both transforms.

**Recommended practice:** use deterministic document-ID checks for known-answer retrieval cases before semantic context graders. Evaluate top-k ranking against expert-labeled relevant IDs. Run generation against a frozen context to isolate prompt/model behavior. Then run the full live pipeline to test integration. Report every stage by meaningful slice such as locale, content type, policy family, query ambiguity, and recency.

### RAG dataset maintenance

RAG truth changes when the corpus changes. A question that expected the July policy may be wrong after an August revision even if the retriever and generator behave perfectly. Store \`corpusRevision\`, expected document IDs, reference facts, label author, and validity interval with each case. A corpus update should trigger three reviews: whether the reference changed, whether old content remains retrievable, and whether citations expose the active revision.

Do not use context faithfulness as a synonym for correctness. An answer can faithfully repeat an incorrect or unauthorized document. Do not use answer correctness alone as evidence of retrieval quality: a model may answer from prior knowledge while ignoring the supplied context. Pair source authorization, retrieval relevance, claim support, and answer usefulness.

For a wider metric architecture, the [LLM testing guide](/blog/testing-llm-applications-guide) explains how component and system evals cooperate. Promptfoo supplies implementation primitives, while the product team defines what evidence makes a retrieved claim acceptable.

## Red team a bounded system, not an abstract model

**Documented behavior:** Promptfoo's [red-team configuration guide](https://www.promptfoo.dev/docs/red-team/configuration/) organizes a scan around targets, plugins, strategies, and a purpose. Current CLI guidance describes \`promptfoo redteam init\`, \`redteam run\`, and \`redteam report\`; \`redteam run\` combines generation and evaluation so generated probes align with the active configuration. Tags can attach a CI run ID or Git revision to results.

Red teaming asks a different question from ordinary regression testing. A regression suite checks known behavior against expected outcomes. A red team explores whether adversarial inputs, transformations, tool paths, or policy boundaries produce harmful behavior. Generated probes increase search breadth, but their grades can be wrong and their coverage is finite. Treat a scan as a source of findings that require triage, reproduction, severity assignment, remediation, and stable regression tests.

### Minimal red-team intent

\`\`\`yaml
description: 'Synthetic support-agent authorization scan'

purpose: |
  The target answers account and billing questions for one synthetic tenant.
  It may read that tenant's public plan and invoice summary.
  It must not reveal another tenant's data, expose credentials, or execute writes.

targets:
  - id: file://providers/synthetic-support-target.mjs
    label: 'Resettable support fixture'

redteam:
  numTests: 5
  plugins:
    - id: rbac
      severity: critical
    - id: indirect-prompt-injection
      severity: critical
\`\`\`

The plugin identifiers shown are documented categories in the July 2026 red-team material. The count of five is a small smoke configuration, not adequate security coverage. Review current plugin requirements, remote-generation behavior, and supported strategies for the pinned release before expanding the scan.

| Red-team design element | Bad default | Defensible control |
| --- | --- | --- |
| Target | Production agent with real credentials | Synthetic tenant, resettable state, least privilege |
| Purpose | "Test my chatbot" | Explicit allowed data, denied actions, users, tools, and policy |
| Plugins | Every available category | Threat-model-selected categories plus justified broad discovery |
| Strategies | Maximum combinations in every PR | Small stable PR set and broader scheduled exploration |
| Grader | Unreviewed default verdict | Context-rich rubric, examples, and sampled human calibration |
| Finding | Scanner failure count | Reproduced exploit, impact, severity, owner, and evidence |
| Remediation | Prompt text change only | Root-cause fix, negative test, permissions review, and retest |

### Know where red-team data goes

Promptfoo's [data-handling guide](https://www.promptfoo.dev/docs/red-team/troubleshooting/data-handling/) distinguishes target evaluation, test generation, and result grading. It says target evaluation runs locally and sends data only to the configured target provider, while generation and grading may be local or remote depending on configuration. Some plugins and strategies require hosted behavior. Environment flags can disable supported remote-generation paths, but the documentation explicitly warns that those flags are not complete network-isolation controls and do not disable every hosted or account surface.

**Recommended practice:** write a data-flow review before a scan. Classify the purpose text, seed examples, prompts, target responses, grader inputs, reports, and credentials. Identify every configured model and hosted Promptfoo feature. If policy requires no data to Promptfoo-operated servers, follow the current data-handling checklist rather than assuming that "runs locally" covers generation, grading, sharing, telemetry, Cloud sync, or account checks. Network enforcement should be technical, not only an environment variable.

Run dangerous tool paths in a disposable environment. A prompt-injection test should not have the ability to send email, transfer money, delete production data, publish code, or read real customer records. Reducing agency is part of the security control; the scan should verify authorization boundaries rather than receive broad privileges in order to test them.

After triage, move confirmed vulnerabilities into an explicit regression layer. Keep the original attack, normalized reproduction, expected denial or containment, affected version, remediation commit, and owner. Rerun generated exploration periodically because a fixed attack set eventually measures only remembered cases. The existing [Promptfoo red-teaming guide](/blog/promptfoo-red-teaming-llm-applications) provides more implementation examples; use current official docs when command or plugin syntax differs.

## Put Promptfoo into CI without turning noise into policy

**Documented behavior:** The current [command-line reference](https://www.promptfoo.dev/docs/usage/command-line/) says \`promptfoo eval\` returns exit code \`100\` when at least one test fails or the pass rate is below \`PROMPTFOO_PASS_RATE_THRESHOLD\`, and exit code \`1\` for other errors. The failure exit code can be changed with \`PROMPTFOO_FAILED_TEST_EXIT_CODE\`. The pass-rate threshold is expressed as a percentage and defaults to 100 when not set. The [CI/CD guide](https://www.promptfoo.dev/docs/integrations/ci-cd/) documents JSON, HTML, and JUnit-style outputs, tags, caching, secret handling, and separate eval and red-team workflows.

A portable CI invocation for the pinned baseline is:

\`\`\`bash
export PROMPTFOO_PASS_RATE_THRESHOLD=95
export PROMPTFOO_FAILED_TEST_EXIT_CODE=1

npx promptfoo@0.121.18 eval \
  --config evals/promptfooconfig.yaml \
  --tag git.sha="$GIT_SHA" \
  --tag ci.run-id="$CI_RUN_ID" \
  --output artifacts/promptfoo-results.json \
  --output artifacts/promptfoo-results.junit.xml \
  --output artifacts/promptfoo-report.html
\`\`\`

The 95 percent value is illustrative. A global pass rate can hide a critical failure, so define hard mandatory assertions for security, authorization, legal, and irreversible state changes. Use aggregate thresholds only for a documented set of softer or noisy metrics. Normalize the failed-test exit code to 1 only if the CI platform handles ordinary nonzero exits more clearly; retain the result artifact so a reviewer can distinguish assertion failures from runtime errors.

### Use two CI lanes

| Lane | Trigger | Dataset | Cache policy | Decision |
| --- | --- | --- | --- | --- |
| Pull request | Relevant prompt, application, provider, grader, or dataset change | Small stable regression and critical safety set | Controlled cache for unchanged baseline; fresh candidate where required | Block critical deterministic regressions; warn during grader calibration |
| Scheduled | Nightly or weekly | Broader holdout, repeated trials, generated red-team probes | Fresh calls for drift; explicit retained cache for reruns | Open findings, trend slices, update baselines through review |

The pull-request lane should finish fast enough that teams do not bypass it. Select tests by changed surface only when the dependency map is reliable. A shared system prompt, provider adapter, retrieval filter, or grader change can affect every case even if one feature directory changed. The scheduled lane can spend more time on repeats, providers, locales, long conversations, agent tasks, and adversarial generation.

Start new semantic gates in observe-only mode. Compare automated judgments with human labels, inspect flaky cases, and determine which failures are actionable. Promote a metric to blocking only when its owner, threshold, false-decision rate, override process, and incident path are defined. A gate that repeatedly fails for unactionable reasons teaches developers to ignore evidence.

### Baseline versus candidate discipline

Evaluate both versions under the same dataset, provider versions, grader, retrieval snapshot, environment, and trial policy. If only the candidate receives fresh calls while the baseline comes from an old cache, note that asymmetry. Absolute requirements still apply even when the candidate improves relative to baseline. A model that raises a soft relevance score while introducing one authorization failure must not pass because the average increased.

Retain the config hash, prompt hash, dataset revision, provider labels, grader versions, application commit, and tags with the report. The dedicated [LLM CI/CD quality-gates guide](/blog/llm-evaluation-ci-cd-quality-gates) covers rollout, waiver, canary, and rollback governance beyond one runner.

## Use caching for repeatability without confusing it with freshness

**Documented behavior:** Promptfoo [caches successful provider responses](https://www.promptfoo.dev/docs/configuration/caching/) using provider-specific composite keys that include request material and configuration. Error and empty responses are not cached. The documented default disk location is \`~/.promptfoo/cache\`, the default time to live is 14 days, \`--no-cache\` disables replay for a CLI eval, and \`promptfoo cache clear\` removes entries. Repeat indexes use separate cache namespaces, so rerunning a repeated eval can replay the corresponding prior trials.

Caching supports three distinct goals:

1. **Developer iteration:** avoid paying for unchanged calls while refining reports or deterministic assertions.
2. **Controlled comparison:** replay the same response when validating only grader or visualization changes.
3. **CI efficiency:** restore a cache for unchanged baseline requests while keeping the key tied to relevant files.

It does not answer whether the current provider, retrieval corpus, or application would produce the same output now. For drift detection, incident reproduction against a live dependency, or stochastic reliability measurement, use fresh calls and record that choice.

\`\`\`bash
# Reproducible replay when the response itself is not under test.
export PROMPTFOO_CACHE_TYPE=disk
export PROMPTFOO_CACHE_PATH="$PWD/.cache/promptfoo"
npx promptfoo@0.121.18 eval --config evals/promptfooconfig.yaml

# Fresh repeated trials when current behavioral variability is under test.
npx promptfoo@0.121.18 eval \
  --config evals/promptfooconfig.yaml \
  --no-cache \
  --repeat 3
\`\`\`

Do not publish the second command's three trials as a statistically universal conclusion. Trial count should follow expected variability, risk, and the decision's required confidence. Report the count, aggregation rule, confidence or uncertainty method, and failures by slice.

### Reproducibility manifest

Store a machine-readable manifest beside each important result, whether produced by Promptfoo metadata, CI, or a small wrapper:

| Field | Why it matters |
| --- | --- |
| Promptfoo version | Stabilizes CLI and schema behavior |
| Node and package-manager versions | Stabilizes runtime and dependency resolution |
| Application commit or image digest | Identifies the target implementation |
| Prompt and config hashes | Proves which instructions and wiring ran |
| Dataset revision and row IDs | Identifies inputs without duplicating restricted data |
| Provider and model identifiers | Records invocation targets |
| Effective provider configuration | Captures sampling, tools, response transforms, and limits |
| Grader provider, prompt, and version | Makes semantic verdicts auditable |
| Retrieval corpus/index revision | Connects RAG outcomes to evidence state |
| Cache mode and cache namespace | Distinguishes replay from fresh calls |
| Trial count and seed where honored | Describes variability policy without claiming full determinism |
| Environment and permissions profile | Explains tool, network, filesystem, and data access |

Some hosted providers expose model aliases rather than immutable weights. Recording the alias is still necessary but may be insufficient for exact reproduction. State that limitation instead of claiming bit-for-bit repeatability.

## Report results without leaking the evaluation corpus

**Documented behavior:** Promptfoo supports output formats including JSON, JSONL, CSV, YAML, HTML, full Promptfoo XML, and compact JUnit XML. The [output documentation](https://www.promptfoo.dev/docs/configuration/outputs/) says full formats can include the eval configuration, prompts, test variables, model outputs, assertion reasons, and provider errors. Sanitization is best effort, and non-sensitive \`config.env\` values may still appear. JUnit output intentionally omits the full config, raw prompts, variables, model outputs, and detailed payloads so conventional CI viewers do not become a second full-export surface.

Choose the smallest artifact that satisfies the audience:

| Audience | Artifact | Retention recommendation | Main concern |
| --- | --- | --- | --- |
| Pull-request reviewer | JUnit summary plus restricted HTML link | Short, tied to the PR | Overexposing raw examples in comments |
| Eval engineer | JSON or JSONL plus config manifest | Enough for debugging and trend analysis | Sensitive outputs and large files |
| Domain adjudicator | Curated failed cases with rubric evidence | Until label dispute is resolved | Showing model/provider details that bias judgment |
| Security team | Red-team finding, trace, impact, reproduction | Per vulnerability policy | Exploit payload and credentials |
| Auditor | Signed summary, versions, approvals, exceptions | Per governance schedule | Mistaking report existence for control effectiveness |

The local \`promptfoo view\` workflow is suitable for workstation analysis. Sharing is a separate operation. Promptfoo's [sharing documentation](https://www.promptfoo.dev/docs/usage/sharing/) warns that uploaded snapshots can contain prompts, variables, outputs, traces, metadata, provider configuration, media references, scan artifacts, and derived artifacts. A private link is still data transfer. Require an approved destination, access policy, retention rule, and content review before enabling it.

Telemetry is another separate surface. The [telemetry page](https://www.promptfoo.dev/docs/configuration/telemetry/) says basic usage events are collected by default and excludes prompts, outputs, test cases, API keys, and full configurations from telemetry. It documents \`PROMPTFOO_DISABLE_TELEMETRY=1\`. Do not confuse telemetry controls with provider calls, hosted red-team generation, grading, sharing, account operations, or Cloud sync; review each path independently.

### Read a report as evidence, not a scoreboard

Begin with run validity: did providers succeed, were there timeouts, which tests ran, did filters or ranges exclude cases, and was the intended config loaded? Then inspect hard failures and slice regressions. Review semantic-grader disagreements and representative passes, not only failures. Compare cost and latency only where providers report compatible measurements. Separate assertion failure from provider/runtime error because remediation and release risk differ.

A percentage should always carry a denominator. "98 percent passed" means little if two hundred low-risk paraphrases overwhelm one failed authorization case. Report at minimum case counts, trial counts, slice counts, error counts, mandatory-invariant failures, and the version manifest. Avoid a single overall risk score unless stakeholders understand its inputs and inability to prove absence of vulnerabilities.

## Use Promptfoo Agent Skills as reviewed instructions

**Documented behavior:** Promptfoo's [Agent Skills documentation](https://www.promptfoo.dev/docs/integrations/agent-skill/) describes one plugin bundle with four focused skills:

| Skill | Documented purpose | Required review |
| --- | --- | --- |
| \`promptfoo-evals\` | Eval suites, assertions, test cases, and result inspection | Dataset, oracle, and config correctness |
| \`promptfoo-provider-setup\` | HTTP, JavaScript, and Python targets or wrappers | Authentication, data flow, timeout, and response contract |
| \`promptfoo-redteam-setup\` | Focused scan plans from endpoints, OpenAPI, or code | Threat model, target scope, plugins, purpose, and permissions |
| \`promptfoo-redteam-run\` | Execute scans and triage generated probes | Grader calibration, finding validation, and remediation tracking |

The docs say the same bundle is exposed for Claude Code and Codex through their marketplace manifests and follows the Agent Skills standard. For Claude Code, the documented marketplace flow is:

\`\`\`text
/plugin marketplace add promptfoo/promptfoo
/plugin install promptfoo@promptfoo
\`\`\`

For Codex, current Promptfoo documentation says the bundle is exposed through \`.agents/plugins/marketplace.json\`; follow the current Codex workspace installation surface rather than inventing a shell command from the Claude syntax. For an eval-only manual setup, the docs also describe copying the self-contained skill into a project's \`.agents/skills/\` or \`.claude/skills/\` directory.

Agent Skills reduce recurring configuration mistakes, but they do not authenticate truth. Review every generated provider, grader, target, command, plugin, and output destination. Run configuration validation and a tiny local smoke eval before a broad suite. A coding agent should not receive production secrets merely because its skill knows where to place an environment reference.

Recommended team flow:

1. Pin or vendor a reviewed skill revision and record its source.
2. Allow the agent to draft files in a branch with synthetic data.
3. Validate config against the pinned Promptfoo schema and CLI.
4. Review provider data flow, environment references, permissions, and timeouts.
5. Review each assertion against the product requirement and visible evidence.
6. Run a small known-pass and known-fail fixture to test the grader.
7. Compare the diff exactly as code, not as trusted generated output.
8. Update the skill and Promptfoo package independently so attribution remains possible.

The [Promptfoo Agent Skills installation guide](/blog/promptfoo-agent-skills-codex-claude-install-2026) covers the two agent environments and upgrade controls in detail. QASkills also provides a broader [skills catalog](/skills); avoid name-only installation when an author-qualified route such as the [Playwright CLI skill](/skills/Pramod/playwright-cli) is available.

## Test an MCP server with the MCP provider

Promptfoo has two MCP-related surfaces that should not be confused. The **MCP provider** makes an MCP server the target of an eval or red team. The **Promptfoo MCP server** exposes Promptfoo eval tools to an external MCP-capable agent. This section covers the provider because it evaluates the server under test.

**Documented behavior:** The [MCP provider guide](https://www.promptfoo.dev/docs/providers/mcp/) supports local command-based and remote URL-based servers, multiple servers, authentication, tool filtering, response transforms, timeout controls, ordinary evals, and red-team workflows. It lists four important limitations: prompts must be JSON tool calls, the target must implement the standard MCP protocol, remote support depends on the server implementation, and tool responses are returned as JSON strings.

\`\`\`yaml
providers:
  - id: mcp
    label: 'Synthetic account-tools MCP server'
    config:
      enabled: true
      server:
        url: 'http://127.0.0.1:4400/mcp'
        name: 'synthetic-account-tools'
        auth:
          type: bearer
          token: '{{env.MCP_BEARER_TOKEN}}'

prompts:
  - file://fixtures/mcp/read-own-invoice-tool-call.json

tests:
  - description: 'Synthetic user reads an invoice in the same tenant'
    assert:
      - type: is-json
      - type: not-contains
        value: 'other-tenant'
\`\`\`

The URL, server name, fixture, and tenant marker define a concrete local test harness. The JSON fixture must match the current MCP provider's documented tool-call format and the target server's actual tool schema. Do not convert ordinary natural-language prompts into guessed tool-call JSON; inspect discovered server capabilities and version the fixture with the server contract.

MCP security is primarily about authority and untrusted data. Validate which tools are exposed, arguments accepted, resources returned, roots or files reachable, and side effects possible. Test denied calls and cross-tenant identifiers, not only happy paths. Treat tool descriptions and remote resource text as untrusted input capable of carrying prompt injection. A model refusal is not a substitute for server-side authorization.

| MCP control | Eval evidence |
| --- | --- |
| Tool allowlist | Discovered tool set contains only approved names |
| Argument validation | Invalid types, paths, IDs, and oversized values are rejected |
| Authentication | Missing, expired, and wrong-audience tokens fail safely |
| Authorization | Synthetic user cannot access another tenant or privileged tool |
| Output handling | Tool result is bounded, encoded correctly, and free of secrets |
| State mutation | Writes require expected authorization and create auditable state |
| Prompt injection resistance | Untrusted resource text cannot expand tool authority |
| Timeout and cancellation | Hung tools stop without corrupting shared state |

Run destructive tests against isolated state and verify the state afterward. A final assistant sentence saying "I did not delete anything" is not evidence; query the backing fixture or audit log. The focused [Promptfoo MCP provider guide](/blog/promptfoo-mcp-provider-security-testing-2026) covers JSON tool calls, local and remote servers, authentication, red-team scope, and limitations.

## Evaluate coding agents as systems with side effects

**Documented behavior:** Promptfoo's [coding-agent evaluation guide](https://www.promptfoo.dev/docs/guides/evaluate-coding-agents/) covers OpenAI Codex SDK, OpenAI Codex app-server, Claude Agent SDK, OpenCode SDK, and plain LLM baselines. It emphasizes that capability depends on architecture and that intermediate steps matter. The Codex provider documentation describes a Git-repository check, filesystem sandbox, network/search controls, controlled environment, working directory, and ephemeral test-case threads. The Claude Agent SDK documentation describes read-only defaults when a working directory is supplied unless additional tools and permissions are enabled.

A coding-agent eval measures more than final text. It measures the model, system prompt, agent harness, tool schemas, permissions, repository fixture, dependency state, timeout, retries, and graders. Two agents can produce the same summary while leaving different files, running different tests, or making different network calls.

\`\`\`yaml
description: 'Read-only defect localization in a frozen repository fixture'

prompts:
  - |
    Inspect the repository and identify the root cause of the failing unit test.
    Do not modify files. Report the file, function, and reasoning.

providers:
  - id: openai:codex-sdk
    label: 'Codex SDK read-only'
    config:
      working_dir: ./fixtures/buggy-checkout
      sandbox_mode: read-only
      network_access_enabled: false
      web_search_enabled: false
  - id: anthropic:claude-agent-sdk
    label: 'Claude Agent SDK read-only'
    config:
      working_dir: ./fixtures/buggy-checkout

tests:
  - assert:
      - type: contains
        value: 'calculateTotal'
      - type: contains
        value: 'src/cart.ts'
\`\`\`

This is a bounded localization task, not a universal benchmark. It assumes the fixture contains a known failure in \`src/cart.ts\` and \`calculateTotal\`. The Claude read-only posture follows the documented provider default for a configured working directory; verify effective tools in the run evidence. The comparison still includes different harnesses, so report it as a system comparison.

For write-capable tasks, clone or reset a fixture per trial. Grade the resulting repository state with deterministic tests, diffs, lint, type checks, security checks, and task-specific invariants. Measure forbidden changes, unexpected files, dependency edits, network attempts, tool count, latency, and cost only when those observables are captured consistently. Review transcripts for a sample of passes as well as failures because an agent can reach a correct final state through an unsafe path.

| Agent-eval dimension | Normalization choice |
| --- | --- |
| Repository | Same immutable source fixture and clean dependency state per trial |
| Permissions | Equivalent least-privilege task capability, with differences disclosed |
| Network | Off unless the task requires a controlled endpoint |
| Time | Same timeout and retry policy, plus completion status |
| Tests | Same external deterministic verifier after each run |
| Trials | Same count and cache policy |
| Output | Final text plus state diff and available trace |
| Secrets | Minimal allowlisted environment, no inherited developer shell |
| Cost | Provider-reported or clearly qualified estimate, not mixed silently |

Do not rank agents from one repository task. Build categories such as localization, refactoring, dependency migration, test repair, security review, and documentation, each with multiple fixtures and risk-weighted outcomes. Separate capability from regression: a capability set asks whether an agent can solve representative tasks; a regression set protects failures that matter to your workflow.

The [Codex versus Claude Promptfoo guide](/blog/promptfoo-evaluate-codex-vs-claude-agents-2026) provides the focused comparison protocol. If a task includes a web application, run committed Playwright tests or use the [Playwright CLI skill](/skills/Pramod/playwright-cli) for bounded exploration, then keep browser evidence separate from the coding agent's self-report.

## Govern the evaluation program

Promptfoo can enforce configured checks; it cannot decide who is allowed to change them. A governance model should make ownership explicit before a gate blocks a release.

| Artifact | Accountable owner | Required reviewer | Change trigger |
| --- | --- | --- | --- |
| Product requirement | Product or domain owner | QA and affected stakeholders | Policy or feature change |
| Dataset and labels | Evaluation/data owner | Domain expert and privacy reviewer | Drift, new incidents, corpus change |
| Provider adapter | Application/platform owner | Security and QA | API, auth, or response-contract change |
| Deterministic grader | QA or application owner | Domain owner | Requirement or schema change |
| Model rubric | Evaluation owner | Domain expert | Judge, context, or rubric change |
| Red-team scope | Security owner | Application and data owners | Threat model or tool-permission change |
| CI threshold | Release owner | Metric and product owners | Calibration or risk-tolerance change |
| Exception | Named release authority | Security/domain owner by risk | Time-bounded incident or known defect |

Every blocking metric needs a definition, evidence source, threshold rationale, owner, response time, and override procedure. Exceptions should be specific to a case, version, and expiry date. Do not change a failing assertion merely to restore a green build; link the change to a requirement correction, label adjudication, accepted risk, or verified grader defect.

### Manage grader and dataset changes like code

A grader change can alter historical pass rates without any product change. Run old and new graders on a frozen calibration set, publish a confusion analysis, and decide whether to recompute baselines. A dataset change can alter the denominator and slice distribution. Report additions, removals, relabeling, and exposure of holdout cases. A provider change can alter system and judge behavior simultaneously; avoid upgrading both in one unexplained comparison.

Quality dashboards should show uncertainty and provenance, not only trends. A rising score can result from easier cases, looser thresholds, cache replay, a different judge, excluded errors, or genuine improvement. Require the manifest and dataset diff before interpreting movement.

### Minimum release evidence

For a meaningful AI behavior change, retain:

- Change hypothesis and affected requirement.
- Prompt, application, provider, retrieval, and grader versions.
- Dataset revision, counts, slices, and provenance summary.
- Hard-invariant results and semantic metric distributions.
- Runtime errors, timeouts, retries, and excluded cases.
- Human calibration or adjudication for consequential semantic checks.
- Red-team findings relevant to changed tools, data, or policy.
- Cost and latency evidence where release criteria include them.
- Approval, exception, canary, monitoring, and rollback decision.

This evidence does not guarantee safety. It creates an auditable basis for a bounded decision and a way to learn when production evidence disagrees.

## Migrate without coupling policy to one runner

Migration usually fails when teams move configuration before understanding semantics. An assertion named "factuality" in two frameworks may use different prompts, providers, scales, references, or thresholds. A cached output may not include the trace a new grader needs. A result export may be an interchange artifact but not reconstruct every local relationship, tag, cache entry, or share state.

Use a staged migration:

1. Inventory test inputs, prompt assembly, providers, custom code, graders, thresholds, reports, secrets, and data flows.
2. Classify each rule as deterministic, semantic, human, security, retrieval, agent-state, cost, or performance evidence.
3. Define a neutral test-case and result contract for requirements that must survive tooling changes.
4. Implement one production-matched provider and a small known-pass/known-fail set.
5. Run old and new systems side by side without blocking releases.
6. Investigate disagreements at the individual assertion level.
7. Recalibrate model graders rather than copying numeric thresholds.
8. Validate CI exit codes, filters, cache behavior, and artifact retention.
9. Promote gates gradually and keep a rollback path until the new evidence is trusted.
10. Archive migration mappings and unresolved differences.

The neutral contract should preserve case ID, input, expected invariants, reference evidence, metadata, system output, trace references, grader results, versions, and decision. It need not force every framework into one lowest-common-denominator schema; keep tool-specific details in namespaced fields.

### Limitations to state openly

| Limitation | Consequence | Mitigation |
| --- | --- | --- |
| Model and agent outputs vary | One pass does not prove reliability | Repeats, distributions, frozen and fresh lanes |
| Model graders also fail | Scores can encode bias or miss violations | Human calibration, deterministic layers, disagreement review |
| Provider abstractions are not identical | Cross-model matrices can compare different capabilities | Document effective config and architecture differences |
| Generated datasets reflect generator bias | Apparent coverage may be repetitive or unrealistic | Expert review, production samples, deduplication, slice analysis |
| Red-team generation is finite | No finding does not prove no vulnerability | Threat modeling, manual testing, recurring exploration, least privilege |
| Caches replay historical outputs | Fast reruns can hide current drift | Explicit fresh-call lanes and cache manifests |
| External services change | Exact reproduction may be impossible | Versions, timestamps, retained evidence, canary monitoring |
| Reports can contain sensitive data | Sharing or artifacts can create exposure | Data minimization, access control, redaction review, retention policy |
| Final text omits hidden agent effects | A good answer can mask unsafe actions | State diff, tool trace, audit log, external verifier |
| Acquisition roadmap is unsettled | Unsupported assumptions can distort vendor planning | Track first-party updates and preserve portable assets |

Promptfoo is a practical framework, not a certification. Passing an eval means the configured system satisfied the configured graders on the evaluated cases under the recorded conditions. Make claims no broader than that evidence.

## A 30-day implementation sequence

Teams often fail by enabling every provider, metric, and plugin before they can explain one result. A narrower sequence builds confidence.

### Week 1: define and connect

Choose one feature and one expensive failure mode. Write observable requirements, collect twenty to fifty representative cases if available, and identify privacy restrictions. Pin Promptfoo and Node. Connect a staging or local production-matched endpoint. Add one known pass and one known failure to prove the adapter and result transform.

### Week 2: grade and calibrate

Add deterministic format, policy, citation, and state checks. Use a semantic grader only where exact checks cannot express the requirement. Label a balanced calibration sample, measure false decisions, and revise the rubric. Preserve failures by category. Keep all CI behavior informational.

### Week 3: integrate and secure

Add a small PR workflow with version and dataset manifests, compact test reporting, and restricted full artifacts. Review caching and fresh-call policy. Threat-model the feature and run a focused red-team smoke scan against synthetic state. Convert confirmed findings into stable tests.

### Week 4: govern and expand

Assign metric owners, define blocking conditions, document exceptions, and rehearse a rollback. Promote only reliable hard checks to blocking. Add scheduled repeats, holdout cases, and broader red-team exploration. Review costs, latency, data transfer, and artifact retention. Decide which additional feature or risk slice is ready next.

At day 30, success is not a high number of tests. It is a suite whose inputs, decisions, failures, owners, and data flows the team can explain. Expansion is then a controlled engineering activity rather than accumulation.

## Frequently asked questions about Promptfoo

### Is Promptfoo a test runner or an LLM observability platform?

Promptfoo is primarily an evaluation and red-teaming framework with a CLI, library, local result history, web views, exports, and optional hosted or enterprise surfaces. It can record useful run evidence, but it is not a substitute for complete production observability. Keep request traces, retrieval diagnostics, tool calls, incidents, and user feedback in systems designed for those operational signals, then feed representative cases back into evals.

### Does Promptfoo make LLM outputs deterministic?

No. Caching can replay a previous successful provider response, and fixed configuration can reduce uncontrolled variation, but the underlying model, agent trajectory, external service, and retrieval corpus may remain stochastic or mutable. Use repeats, frozen fixtures, explicit versions, and distributional analysis where reliability matters. A cached result is reproducible evidence of an earlier response, not proof that a fresh call will match it.

### Should every assertion use an LLM judge?

No. Use exact, structural, schema, state, and code assertions whenever they directly observe the requirement. Model judges are appropriate for semantic decisions with multiple acceptable expressions, but they add cost, latency, variability, and their own failure modes. Calibrate them against human labels and keep critical deterministic invariants outside a weighted semantic score.

### Can Promptfoo test a production API instead of a model directly?

Yes. The documented HTTP provider can construct requests and transform responses, while custom JavaScript or Python providers can wrap more complex workflows. Prefer a staging or disposable environment with synthetic identities, least-privilege credentials, resettable state, and bounded network access. A direct model provider is useful for component testing but does not exercise the rest of the application.

### Does Promptfoo support RAG evaluation?

Yes. Official guidance covers evaluating retrieval and generation separately, with deterministic checks and context-oriented or output-oriented assertions. The framework does not create ground truth automatically. You still need labeled relevant documents, reference facts, corpus snapshots, retrieval traces, and thresholds calibrated to the product's harm and usefulness criteria.

### Can Promptfoo red-team an MCP server?

Yes. The documented MCP provider treats an MCP server as the target and supports local or remote server configuration. Current limitations include JSON tool-call prompts, standard-protocol requirements, implementation-dependent remote support, and tool responses returned as JSON strings. Use a synthetic server or account, environment-based credentials, tool allowlists, and explicit state assertions. See the [MCP provider security-testing guide](/blog/promptfoo-mcp-provider-security-testing-2026).

### Can Promptfoo compare Codex and Claude coding agents fairly?

It can invoke documented Codex and Claude agent providers, but fairness requires more than sending the same sentence. Normalize repository fixtures, permissions, network access, tools, time and cost budgets, dependency state, trial counts, and outcome graders. Preserve architecture differences rather than pretending the harnesses are identical. The [coding-agent comparison guide](/blog/promptfoo-evaluate-codex-vs-claude-agents-2026) defines that protocol.

### What changed after OpenAI announced it would acquire Promptfoo?

The March 9, 2026 announcement says OpenAI plans to integrate Promptfoo technology into Frontier after finalization and continue the open-source project. It also says closing is subject to customary conditions. It does not by itself prove closure or define future licensing, pricing, provider support, or product migration. Track first-party updates and maintain portable datasets and exports.

### Should Promptfoo reports be committed to Git?

Usually not. Full exports can include prompts, variables, outputs, configuration, traces, and other sensitive evidence. Store reports as access-controlled CI artifacts with a retention period, and publish compact JUnit data to test dashboards when that is sufficient. Commit sanitized fixtures and policy, not raw customer content or secrets. Review the documented output and sharing data surfaces before enabling uploads.

### How should a team start using Promptfoo?

Choose one costly failure mode, collect a small labeled dataset, connect the production-matched boundary, add deterministic assertions, run a local baseline, calibrate only the semantic graders that remain necessary, then add a warning-only CI job. Expand coverage after the team can explain failures and reproduce runs. A small trustworthy gate is more valuable than a large unowned scorecard.

---

## Conclusion

Promptfoo is most useful when it makes an evaluation contract visible: what system ran, against which data, under which permissions, using which graders, with what evidence and release consequence. Pin the runner, version prompts and datasets, preserve the real application boundary, separate retrieval from generation, prefer deterministic assertions, calibrate semantic judges, and retain human authority over consequential decisions.

Continue with the [OpenAI Promptfoo announcement analysis](/blog/openai-promptfoo-acquisition-explained-2026), [Promptfoo Agent Skills installation guide](/blog/promptfoo-agent-skills-codex-claude-install-2026), [Promptfoo MCP provider security guide](/blog/promptfoo-mcp-provider-security-testing-2026), and [Promptfoo coding-agent evaluation guide](/blog/promptfoo-evaluate-codex-vs-claude-agents-2026). Pair them with the [LLM testing architecture](/blog/testing-llm-applications-guide), [LLM CI/CD quality gates](/blog/llm-evaluation-ci-cd-quality-gates), the broader [QA skills catalog](/skills), and the [Playwright CLI skill](/skills/Pramod/playwright-cli) when end-to-end browser behavior also needs explicit verification.
`,
  },
};
