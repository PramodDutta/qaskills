import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Langfuse Trace Quality Testing Guide',
  description:
    'Validate Langfuse trace quality with span completeness, metadata checks, score ingestion, dataset runs, and CI observability gates for agents.',
  date: '2026-07-10',
  category: 'AI Testing',
  content: `
# Langfuse Trace Quality Testing Guide

A trace that exists is not automatically useful. In Langfuse, a bad trace can have the model call but miss the user id, hide the retrieved documents, omit tool failures, lose token usage, or collapse a multi-step agent into one vague span named run. Trace quality testing checks whether observability data is complete enough for debugging, evaluation, and incident review.

This guide focuses on validating Langfuse traces as product telemetry: required attributes, observation nesting, generation metadata, score attachment, dataset run coverage, and CI checks that fail before instrumentation silently rots. For general setup and dashboards, read [Langfuse LLM observability guide 2026](/blog/langfuse-llm-observability-guide-2026). For deployment and operational concerns, pair it with [Langfuse self-hosting tracing guide 2026](/blog/langfuse-self-hosting-tracing-guide-2026).

## Trace quality is a schema problem

Most teams start by asking whether a trace was sent. That is too weak. A useful Langfuse trace has a shape: root operation, child spans for retrieval and tools, generation observations for model calls, metadata for tenant and feature, input and output capture policy, error levels, and scores when evaluation runs. Treat that shape like an API contract.

Define required fields per workflow. A customer-support agent trace may require user_id, session_id, ticket_id, route, model, prompt version, retrieved document ids, tool call status, and final answer category. A summarization batch job may require dataset item id, source document id, prompt version, model, latency, and quality score. Different workflows need different trace contracts.

| Workflow | Required trace attributes | Required observations | Quality failure |
|---|---|---|---|
| RAG answer | user_id, session_id, feature, prompt_version | retrieval span, generation, rerank span if used | Debugger cannot see which documents shaped the answer. |
| Tool-using agent | user_id, agent_name, route, tool_policy | generation, tool span for each tool call | Tool error disappears behind final model response. |
| Offline evaluation | dataset_name, dataset_item_id, experiment_name | generation, scoring observation or score | Score cannot be joined back to the dataset item. |
| Batch summarization | job_id, source_document_id, prompt_version | chunk spans, final generation | A failed chunk cannot be traced to the source file. |
| Chat session | user_id, session_id, conversation_turn | generation per turn | Session view cannot reconstruct turn order. |

## Instrumenting spans with current Langfuse SDK patterns

The current Python SDK supports observation context managers and attribute propagation. Use them to create a root span and nested observations. The example below records a RAG answer with a retrieval span and a generation observation. It keeps metadata explicit so tests can later assert trace completeness.

\`\`\`python
from langfuse import get_client, propagate_attributes

langfuse = get_client()


def answer_question(user_id: str, session_id: str, question: str) -> str:
    with langfuse.start_as_current_observation(
        as_type='span',
        name='rag-answer',
        input={'question': question},
        metadata={'feature': 'docs_qa', 'prompt_version': 'qa-v7'},
    ) as root:
        with propagate_attributes(user_id=user_id, session_id=session_id):
            with langfuse.start_as_current_observation(
                as_type='span',
                name='retrieve-documents',
                metadata={'index': 'help-center-v3'},
            ) as retrieval:
                documents = retrieve_documents(question)
                retrieval.update(
                    output={'document_ids': [doc['id'] for doc in documents]},
                    metadata={'result_count': len(documents)},
                )

            with langfuse.start_as_current_observation(
                as_type='generation',
                name='compose-answer',
                model='gpt-4.1-mini',
                input={'question': question, 'document_count': len(documents)},
            ) as generation:
                answer = call_model(question, documents)
                generation.update(output={'answer': answer})

        root.update(output={'answer': answer})
        return answer
\`\`\`

This shape is testable. A CI check can assert that the workflow creates rag-answer, retrieve-documents, and compose-answer observations, and that document ids appear on the retrieval span. If the retrieval code is refactored and the span disappears, trace quality fails before the next production incident.

## Testing trace envelopes without calling Langfuse

Do not make every unit test depend on the Langfuse service. For most trace quality checks, test the instrumentation wrapper or the payload builder before it sends telemetry. If your observability layer centralizes required metadata, you can validate fields quickly and deterministically.

The TypeScript example below validates an internal trace envelope before it is handed to SDK calls. It does not pretend to test Langfuse ingestion. It tests your contract for what must be present.

\`\`\`typescript
import { z } from 'zod';

const TraceEnvelope = z.object({
  name: z.literal('support-agent-turn'),
  userId: z.string().min(1),
  sessionId: z.string().min(1),
  metadata: z.object({
    route: z.enum(['billing', 'technical', 'general']),
    promptVersion: z.string().min(1),
    model: z.string().min(1),
  }),
  observations: z.array(
    z.object({
      name: z.string().min(1),
      type: z.enum(['span', 'generation', 'tool']),
      status: z.enum(['ok', 'error']),
    }),
  ),
});

test('support trace envelope contains routing and generation data', () => {
  const envelope = buildSupportTraceEnvelope({
    userId: 'user_123',
    sessionId: 'session_456',
    route: 'billing',
    promptVersion: 'support-v12',
    model: 'gpt-4.1-mini',
  });

  expect(() => TraceEnvelope.parse(envelope)).not.toThrow();
  expect(envelope.observations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'route-request', type: 'span' }),
      expect.objectContaining({ name: 'generate-response', type: 'generation' }),
    ]),
  );
});
\`\`\`

This kind of test catches missing metadata introduced by ordinary refactors. It is especially useful when different services use the same Langfuse project and you need consistent queryability.

## Score ingestion as part of the trace contract

Langfuse scores can attach to traces, observations, sessions, and dataset runs. That makes them a quality channel, not only a dashboard feature. If a CI evaluation computes faithfulness, refusal correctness, or routing accuracy, the test should assert that scores are attached with stable names and data types.

The score name is an API. Changing correctness to answer_quality breaks dashboards and historical comparisons. Keep score names controlled and version evaluation rubrics separately.

\`\`\`python
from langfuse import get_client

langfuse = get_client()


def record_answer_quality(trace_id: str, observation_id: str, passed: bool, note: str) -> None:
    langfuse.create_score(
        name='answer_grounded',
        value=passed,
        trace_id=trace_id,
        observation_id=observation_id,
        data_type='BOOLEAN',
        comment=note,
    )


def test_quality_score_uses_stable_name(monkeypatch):
    calls = []

    class FakeLangfuse:
        def create_score(self, **kwargs):
            calls.append(kwargs)

    monkeypatch.setattr('quality.langfuse', FakeLangfuse())

    record_answer_quality('trace_1', 'obs_1', True, 'Supported by retrieved document.')

    assert calls == [{
        'name': 'answer_grounded',
        'value': True,
        'trace_id': 'trace_1',
        'observation_id': 'obs_1',
        'data_type': 'BOOLEAN',
        'comment': 'Supported by retrieved document.',
    }]
\`\`\`

Mocking the client here is intentional. The contract is about the score payload your code sends. A smaller number of integration tests can verify that credentials and ingestion work against a real Langfuse project.

## Completeness checks for traces already ingested

Once traces are in Langfuse, you can sample recent traces and check completeness. This is useful as a scheduled quality gate. It should not block every pull request unless your test project is isolated and stable. A scheduled job can query traces for the last deployment and fail if required metadata falls below your internal threshold.

Avoid vague completeness checks such as trace has at least one span. Instead, use workflow-specific requirements.

| Check | Why it matters | Failure response |
|---|---|---|
| Root observation name is controlled | Dashboards and filters depend on stable names | Fix instrumentation wrapper or release mapping. |
| user_id or session_id present when allowed | Session analysis needs grouping | Check attribute propagation around root span. |
| Prompt version present | Evaluation regressions need prompt linkage | Add version to prompt loading path. |
| Retrieval span includes document ids | RAG debugging needs evidence | Update retriever instrumentation. |
| Tool spans include status and error text | Agent incidents need tool-level failure data | Wrap tool calls with status metadata. |
| Generation includes model name | Cost and quality analysis need model grouping | Ensure model adapter sets generation attributes. |
| Scores use stable names | Dashboards and experiments remain comparable | Add score name enum or schema validation. |

## Dataset and experiment trace quality

Langfuse datasets and experiments are only useful when each run can be joined back to inputs, outputs, scores, and traces. For evaluation pipelines, require dataset item id and experiment name in the trace metadata. If the trace cannot be mapped back to the dataset item, the evaluation result is hard to debug.

When an evaluation fails, the trace should show the prompt version, model, input, output, retrieved context if relevant, and evaluator score. That lets reviewers decide whether the model failed, the retrieval failed, the rubric is too strict, or the expected answer is stale.

Keep production privacy rules in mind. Trace quality does not mean capturing every raw input forever. It means capturing the right metadata and applying redaction or disabled IO capture where policy requires it. A high-quality trace can intentionally omit sensitive body text while still preserving route, ids, status, prompt version, and score.

## CI gates that do not become noisy

Start with contract tests around your own instrumentation wrappers. They are fast and deterministic. Add a small integration test that runs one synthetic trace through Langfuse in a non-production project if credentials are available. Make that integration test skip clearly when credentials are absent in local development, but run in CI environments configured for observability tests.

Do not fail product builds because the external observability service had a temporary network issue unless your release policy explicitly requires it. Separate local trace-shape tests from remote ingestion tests. Trace-shape tests should always run. Remote ingestion tests can run in a scheduled job or a dedicated CI stage with retry and clear ownership.

## Span naming that survives dashboards

Names are part of the trace contract. If one service emits llm_call, another emits generate, and a third emits completion, dashboards become a search exercise. Pick workflow names and observation names that describe product steps, not implementation accidents. Good names survive refactors: retrieve-documents, apply-guardrail, call-policy-tool, compose-answer, score-response.

Trace quality tests should reject unknown root names for critical flows. This is stricter than many teams expect, but it protects dashboards, alerts, and saved filters. If a new workflow is added, add the name to the allowlist in the same pull request. If a name changes, update the migration note and dashboards deliberately.

| Naming problem | Operational impact | Test guard |
|---|---|---|
| Random root names from function names | Dashboards split the same workflow into many groups | Root name must be in workflow enum. |
| Model provider as span name | Workflow view changes when model changes | Model belongs in generation metadata. |
| Tool names missing from spans | Tool failures cannot be grouped | Tool span name includes stable tool id. |
| Version embedded in name | History fragments across prompt changes | Version belongs in metadata. |
| Generic run names | Incident review cannot identify step | Required observation names per workflow. |

## Ingestion verification without brittle timing

Langfuse ingestion may be asynchronous depending on SDK configuration and deployment path. An integration test that creates a trace and immediately queries for it can flake if it assumes instant availability. Keep the remote ingestion test small and poll for a bounded time with a clear failure message. The goal is to verify credentials, endpoint, and basic SDK wiring, not to load test Langfuse.

Use a synthetic trace name that includes the CI run id or timestamp so the query is unambiguous. Do not reuse production user ids in test traces. Mark integration-test traces with a tag or metadata field so they can be filtered out of product analytics.

| Integration check | Keep it | Avoid |
|---|---|---|
| Create one root observation | Yes | Creating a full agent conversation just to test credentials. |
| Attach one score | Yes | Running expensive evaluator models. |
| Use synthetic metadata | Yes | Reusing real customer identifiers. |
| Poll with timeout | Yes | Assuming immediate query visibility. |
| Run in dedicated project | Preferable | Polluting production observability data. |

## Redaction as a quality requirement

A trace can be incomplete because it misses context, but it can also be excessive because it captures sensitive content. Quality tests should enforce both presence and absence. Required metadata must be present. Secrets, passwords, raw access tokens, payment card data, and unrelated personal information must be absent.

Redaction tests belong near the instrumentation boundary. Feed representative inputs through the trace payload builder and assert that sensitive fields are masked or omitted before the SDK sees them. Do not wait until data lands in Langfuse to discover a leakage pattern. Once sensitive data is ingested, cleanup becomes operationally expensive.

| Sensitive item | Safer trace representation | Test assertion |
|---|---|---|
| API key | Redacted marker and key prefix only if policy allows | Full key never appears in input, output, or metadata. |
| Password | Omitted | No password field in serialized trace payload. |
| Payment card | Last four only with explicit policy | Full number pattern is rejected. |
| Private document body | Document id and chunk ids | Raw body not included in retrieval metadata. |
| User message with health data | Category and policy label | Raw sensitive sentence omitted where required. |

## Trace quality review during incidents

During an incident, the trace should answer what path ran, which model was used, what tools were called, what evidence was retrieved, where the error happened, and which user or session was affected. If responders need to reproduce locally just to learn those basics, the trace contract is too weak.

After every LLM or agent incident, add one trace quality action item. Maybe the tool error lacked status text. Maybe prompt version was missing. Maybe the final score existed but was not linked to the trace. These are small instrumentation fixes that compound. Over time, incident review becomes a source of observability tests.

## Dataset-run hygiene

Evaluation datasets should not become detached from traces. Every dataset run should carry dataset name, item id, experiment name, model, prompt version, and evaluator version. That metadata lets you compare runs without guessing which code path produced them. If a dataset item fails, the reviewer should open the trace and see the exact observations that led to the score.

Do not overwrite dataset examples to match current model behavior unless the expected behavior really changed. Stale expectations should be updated, but convenient expectation drift can hide regressions. Keep a review note when expected outputs or rubrics change, and preserve enough trace metadata to compare old and new runs.

## Sampling traces for manual QA

Manual trace review still matters. Pick a small sample by workflow, model, and release version, then inspect whether the trace tells the story a responder would need. The reviewer should be able to identify user intent, prompt version, retrieved evidence, tool results, model output, score, and final product action without opening five other systems. When the reviewer cannot, convert the missing evidence into a trace quality test.

Sampling should include failures and low-score traces, not only happy paths. The best instrumentation gaps often appear when a tool errors, a guardrail blocks an answer, or an evaluator score is low. Those are the traces engineers will open during an incident.

Keep the review lightweight but regular. Ten representative traces after a risky release can reveal naming drift, missing scores, or redaction mistakes faster than waiting for a dashboard complaint. Record the review outcome beside the release notes for later audit review.

## Frequently Asked Questions

### Should trace quality tests call the real Langfuse API?

Some should, but not all. Unit tests should validate your trace envelope and score payloads without network calls. A smaller integration suite can verify real ingestion against a dedicated Langfuse project.

### What is the most important metadata to require first?

Require stable root names, user or session identifiers when policy allows, feature name, prompt version, model, and workflow-specific ids such as dataset item id or document ids. Those fields make traces searchable during incidents.

### Should every function become a Langfuse span?

No. Trace quality improves when spans represent meaningful workflow steps: retrieval, tool call, generation, rerank, guardrail, or final response. Instrumenting every helper creates noise and cost without improving diagnosis.

### How do I test Langfuse scores?

Validate score name, value type, trace id, optional observation id, and comment in your scoring code. Then run a small integration test or scheduled job to confirm the score appears in the project used for evaluations.

### Can trace quality conflict with privacy requirements?

Yes, if teams capture raw inputs and outputs without a policy. Use redaction, disabled IO capture, or metadata-only traces where needed. Quality means enough evidence for debugging within policy, not maximum data capture.
`,
};
