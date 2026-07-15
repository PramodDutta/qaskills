# Metric reference: what each eval measures and where to gate

Companion lookup for the AI System Quality Engineer skill. Thresholds are
starting points, not laws; tune on your held-out slice and never gate on a
single sample.

## DeepEval metrics

| Metric | Measures | Needs | Starting threshold |
|---|---|---|---|
| AnswerRelevancyMetric | Does the output address the input | input, output | 0.7 |
| FaithfulnessMetric | Is the output grounded in retrieval_context | output, retrieval_context | 0.8 |
| ContextualRelevancyMetric | Are retrieved chunks relevant | retrieval_context, input | 0.7 |
| ToolCorrectnessMetric | Right tools called vs expected | tools_called, expected_tools | exact/1.0 |
| Hallucination / Toxicity / Bias | Safety and grounding | output (+ context) | as low as product allows |

Notes: model-graded metrics are stochastic. Run K>=5 and gate on pass rate.
ToolCorrectness is deterministic (set comparison) and can gate at 1.0.

## Ragas metrics

| Metric | Layer | Low score means |
|---|---|---|
| context_precision | retrieval | retrieving irrelevant chunks; fix k / reranking |
| context_recall | retrieval | missing needed chunks; fix chunking / embeddings |
| faithfulness | generation | answer not grounded; fix prompt, not index |
| answer_relevancy | generation | answer off-topic; fix prompt / instructions |

Diagnostic split: low precision or recall = retrieval bug. High retrieval but
low faithfulness = generation bug. Never fix the index for a faithfulness miss.

## Deterministic anchors (no judge, gate hard)

| Check | Tool | Fails when |
|---|---|---|
| Output schema | Pydantic / Zod / jsonschema | Output does not parse to the contract |
| Citation validity | set membership vs corpus IDs | Cites an ID not in the corpus |
| Citation presence | count | RAG answer cites zero retrieved chunks |
| Refusal | keyword allowlist + judge confirm | A must-refuse case complied |
| Budget | token/latency counters | Over the per-case ceiling |
| Tool schema | jsonschema on arguments | Tool call has invalid/missing args |
| Forbidden action | trajectory scan | Agent took a disallowed step |

## Red-team plugins (promptfoo) that should gate

| Plugin/strategy | Catches |
|---|---|
| prompt-injection / hijacking | Instruction override from user or retrieved content |
| pii | Model leaks or invents personal data |
| jailbreak | Safety bypass via role-play or obfuscation |
| harmful | Disallowed-content generation |

Any high or critical finding is a failing test, not a backlog ticket.

## CI gate summary

- Deterministic anchors: 100% pass, no exceptions
- Model-graded metrics: pass_rate >= 0.8 over K>=5 on the held-out slice
- Red-team: zero high/critical
- Regression: no tracked metric down > 5 points vs last green baseline
