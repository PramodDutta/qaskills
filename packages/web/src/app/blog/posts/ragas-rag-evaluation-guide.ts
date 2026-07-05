import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Ragas RAG Evaluation: Faithfulness, Relevancy and Precision',
  description:
    'A hands-on Ragas tutorial for evaluating RAG pipelines: faithfulness, answer relevancy, context precision and recall, judge LLMs, and CI gating in Python.',
  date: '2026-07-05',
  category: 'Tutorial',
  content: `
# Ragas RAG Evaluation: Faithfulness, Relevancy and Precision

Retrieval-augmented generation looks deceptively simple on a slide: retrieve some documents, stuff them into a prompt, let the model answer. In production it is anything but. Your retriever can pull the wrong passages, your model can ignore the passages it was given and hallucinate from parametric memory, or it can faithfully summarize context that never actually answered the user's question. Each of these failures produces a plausible-sounding response, which is exactly what makes RAG so hard to test. You cannot eyeball a few outputs and declare victory, and you cannot assert exact string equality against a non-deterministic generator. You need metrics that decompose the pipeline into its parts and score each independently.

Ragas is the Python framework built for that job. It is a reference-free evaluation library for RAG applications, meaning most of its core metrics do not require you to hand-write a gold-standard answer for every question. Instead, it uses a judge LLM to reason about the relationships between the user question, the retrieved context, and the generated answer. From those relationships it computes a small set of interpretable scores: faithfulness (is the answer grounded in the context?), answer relevancy (does the answer address the question?), context precision (is the retrieved context relevant and well-ranked?), and context recall (did retrieval find everything it needed?). Together these separate a retrieval problem from a generation problem, which is the single most valuable thing an eval can do for a RAG team.

This tutorial takes you from \`pip install ragas\` to a CI-gated evaluation suite. You will build an evaluation dataset with \`SingleTurnSample\` and \`EvaluationDataset\`, run \`evaluate()\` with the metric triad, choose and configure a judge LLM, interpret the scores you get back, integrate with LangChain and LlamaIndex pipelines, and wire a threshold gate into continuous integration. You will also see how Ragas compares to DeepEval and Promptfoo so you can pick the right tool. Every code sample is runnable Python. If you are building broader AI testing infrastructure, pair this with our [AI agent eval testing guide](/blog/ai-agent-eval-testing-guide) and browse the [QA skills directory](/skills) for reusable evaluation skills.

## What Ragas Is and Why RAG Needs Its Own Metrics

Standard NLP metrics like BLEU or ROUGE compare a generated string against a reference string token by token. They tell you nothing about whether an answer is grounded in retrieved evidence or whether the retriever did its job, and they require a human-written reference for every single test case. RAG breaks both assumptions. The whole point of retrieval is that the correct answer depends on documents that change over time, so a fixed reference goes stale, and the failure modes you care about, hallucination and bad retrieval, are invisible to string overlap.

Ragas reframes evaluation as a set of relationship checks between four objects: the user input (question), the retrieved contexts, the generated response, and optionally a reference. Because it uses an LLM as a judge to reason about those relationships, it can score properties like "every claim in this answer is supported by the retrieved passages" without a gold answer. This is what "reference-free" means, and it is why Ragas fits RAG so much better than classic metrics.

| Metric | Question it answers | Reference required | Diagnoses |
|---|---|---|---|
| Faithfulness | Is the answer grounded in the retrieved context? | No | Hallucination (generation) |
| Answer relevancy | Does the answer address the user's question? | No | Off-topic or evasive answers (generation) |
| Context precision | Are retrieved chunks relevant and ranked well? | Optional | Noisy retrieval (retrieval) |
| Context recall | Did retrieval find all needed information? | Yes | Missing evidence (retrieval) |

The key insight is that these metrics attribute failure to a component. If faithfulness is low but context precision is high, your retriever is fine and your generator is hallucinating. If context recall is low, no amount of prompt tuning will help because the needed evidence never reached the model. That diagnostic power is why Ragas has become the default RAG eval framework in 2026.

## Installing Ragas

Ragas is a pure Python package. Install it with pip into a virtual environment:

\`\`\`bash
python -m venv .venv
source .venv/bin/activate
pip install ragas
\`\`\`

Because Ragas relies on a judge LLM for most metrics, you also need a model provider SDK and its API key. The most common setup uses OpenAI:

\`\`\`bash
pip install langchain-openai
export OPENAI_API_KEY=sk-...
\`\`\`

Ragas wraps any LangChain-compatible chat model and embeddings model, so you are not locked into a single provider. Verify the install:

\`\`\`python
import ragas
print(ragas.__version__)
\`\`\`

With the package installed and a key exported, you are ready to assemble an evaluation dataset.

## Building an Evaluation Dataset

Ragas evaluates over a dataset where each row captures one interaction: the user question, the contexts your retriever returned, the answer your pipeline generated, and optionally a reference answer. The modern API models each row as a \`SingleTurnSample\` and collects them into an \`EvaluationDataset\`.

\`\`\`python
from ragas import SingleTurnSample, EvaluationDataset

samples = [
    SingleTurnSample(
        user_input='What is the capital of France?',
        retrieved_contexts=[
            'France is a country in Western Europe.',
            'Paris is the capital and most populous city of France.',
        ],
        response='The capital of France is Paris.',
        reference='Paris is the capital of France.',
    ),
    SingleTurnSample(
        user_input='Who wrote the novel 1984?',
        retrieved_contexts=[
            'Nineteen Eighty-Four is a dystopian novel by George Orwell, published in 1949.',
        ],
        response='The novel 1984 was written by George Orwell.',
        reference='George Orwell wrote 1984.',
    ),
]

dataset = EvaluationDataset(samples=samples)
print(len(dataset))
\`\`\`

The four fields map directly onto the metric definitions. \`user_input\` and \`response\` drive answer relevancy, \`retrieved_contexts\` and \`response\` drive faithfulness, and \`reference\` is needed only for context recall. In a real project you generate these rows by running your actual RAG pipeline over a fixed set of test questions and recording what it retrieved and answered, so the eval reflects your production system rather than a toy.

For larger datasets you often start from a Hugging Face dataset or a pandas DataFrame. Ragas provides a converter:

\`\`\`python
from datasets import load_dataset
from ragas import EvaluationDataset

hf = load_dataset('explodinggradients/amnesty_qa', 'english_v3', split='eval')
dataset = EvaluationDataset.from_hf_dataset(hf)
\`\`\`

Whichever way you build it, the dataset is the substrate every metric runs over. Keep it in version control and grow it as you discover real failures, exactly as you would a regression suite. Our [test data management guide](/blog/test-data-management-strategies) covers strategies for keeping evaluation datasets healthy over time.

## Running evaluate with the Metric Triad

With a dataset in hand, you call \`evaluate()\` and pass the metrics you want. Start with the core triad plus context recall for a complete picture:

\`\`\`python
from ragas import evaluate
from ragas.metrics import (
    Faithfulness,
    ResponseRelevancy,
    LLMContextPrecisionWithReference,
    LLMContextRecall,
)
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

judge = LangchainLLMWrapper(ChatOpenAI(model='gpt-4o-mini'))
embeddings = LangchainEmbeddingsWrapper(OpenAIEmbeddings())

metrics = [
    Faithfulness(llm=judge),
    ResponseRelevancy(llm=judge, embeddings=embeddings),
    LLMContextPrecisionWithReference(llm=judge),
    LLMContextRecall(llm=judge),
]

result = evaluate(dataset=dataset, metrics=metrics)
print(result)
\`\`\`

The call returns an aggregate result object with the mean of each metric across the dataset. To inspect per-sample scores and find the specific rows that dragged an average down, convert to a DataFrame:

\`\`\`python
df = result.to_pandas()
print(df[['user_input', 'faithfulness', 'answer_relevancy',
          'llm_context_precision_with_reference', 'context_recall']])
\`\`\`

Each score ranges from 0 to 1. Answer relevancy also uses an embeddings model, which is why we pass one in; the others rely on the judge LLM alone. Running the full triad on every evaluation gives you the component-level breakdown that makes debugging tractable.

## Choosing and Configuring the Judge LLM

Ragas is only as reliable as the model grading your outputs. The judge LLM reads questions, contexts, and answers and makes the calls that become your scores, so its quality and consistency matter. Three practical rules apply.

First, use a capable but affordable model as the default judge. A mid-tier model like \`gpt-4o-mini\` is usually strong enough for faithfulness and relevancy while keeping evaluation cheap enough to run on every pull request. Reserve a flagship model for cases where you suspect the judge itself is making errors.

Second, wrap your provider once and reuse it. Ragas accepts any LangChain chat model through \`LangchainLLMWrapper\`, so you can point it at OpenAI, Anthropic, or a local model:

\`\`\`python
from ragas.llms import LangchainLLMWrapper
from langchain_anthropic import ChatAnthropic

judge = LangchainLLMWrapper(ChatAnthropic(model='claude-sonnet-4', temperature=0))
\`\`\`

Third, pin \`temperature=0\` on the judge. Deterministic grading makes your eval reproducible, so a metric that scores 0.82 today scores 0.82 tomorrow on the same data, which is essential for a CI gate. A judge that wanders produces flaky evals, and a flaky eval is worse than no eval because it erodes trust. The role of the judge model is discussed further in our [AI agent eval testing guide](/blog/ai-agent-eval-testing-guide).

## Interpreting Faithfulness, Relevancy, and Precision Scores

A number between 0 and 1 is only useful if you know what it means and what to do about it. Here is how each core score decomposes and what a low value tells you.

**Faithfulness** measures the fraction of claims in the answer that can be inferred from the retrieved context. Ragas breaks the answer into individual statements, then checks each against the context. A score of 0.6 means roughly 40 percent of the answer's claims are not supported by what was retrieved, which is a direct hallucination signal. Low faithfulness with good retrieval means your generation prompt is letting the model draw on parametric memory; tighten the instruction to answer only from context.

**Answer relevancy** measures how directly the response addresses the question, computed by generating hypothetical questions from the answer and measuring their similarity to the original. A low score flags answers that are evasive, incomplete, or padded with irrelevant material even when they are technically correct.

**Context precision** measures whether the relevant chunks are ranked near the top of the retrieved set. Low precision means your retriever is returning noise, or the right passages are buried below irrelevant ones, which points at your chunking or ranking strategy rather than your generator.

| Score pattern | Likely cause | Where to fix |
|---|---|---|
| Low faithfulness, high context precision | Model ignores context, hallucinates | Generation prompt |
| High faithfulness, low context recall | Retriever misses needed evidence | Retriever / chunking |
| Low context precision, high recall | Too much noise retrieved | Reranking, top-k tuning |
| Low answer relevancy, high faithfulness | Grounded but off-topic answer | Prompt, query understanding |

Reading the pattern across all four metrics, not any single number, is what turns Ragas from a scoreboard into a debugging tool. The table above is the cheat sheet your team will return to every time a score drops.

## Integrating with LangChain and LlamaIndex

Ragas does not replace your RAG framework; it evaluates whatever you built. The integration pattern is the same regardless of framework: run your pipeline over test questions, capture the retrieved contexts and generated answer into \`SingleTurnSample\` rows, then evaluate. Here is that loop for a LangChain retrieval chain:

\`\`\`python
from ragas import SingleTurnSample, EvaluationDataset

questions = ['What is our refund window?', 'How do I reset my API key?']
references = ['Refunds are available within 30 days.', 'Reset API keys in account settings.']

samples = []
for q, ref in zip(questions, references):
    docs = retriever.invoke(q)                 # your LangChain retriever
    contexts = [d.page_content for d in docs]
    answer = rag_chain.invoke(q)               # your LangChain RAG chain
    samples.append(
        SingleTurnSample(
            user_input=q,
            retrieved_contexts=contexts,
            response=answer,
            reference=ref,
        )
    )

dataset = EvaluationDataset(samples=samples)
\`\`\`

The LlamaIndex pattern is identical in spirit; you query the index, pull \`source_nodes\` for the contexts, and read the response text:

\`\`\`python
query_engine = index.as_query_engine()

for q, ref in zip(questions, references):
    resp = query_engine.query(q)
    contexts = [node.get_content() for node in resp.source_nodes]
    samples.append(
        SingleTurnSample(
            user_input=q,
            retrieved_contexts=contexts,
            response=str(resp),
            reference=ref,
        )
    )
\`\`\`

Because Ragas only cares about the four fields, it is framework-agnostic. You can swap LangChain for LlamaIndex, a custom retriever, or a managed RAG service and your evaluation code does not change, which keeps your eval suite stable while your stack evolves.

## Gating CI on Ragas Scores

An eval you run by hand once a month does not prevent regressions. To keep RAG quality from silently degrading as you change prompts, retrievers, or models, gate your pipeline on Ragas scores in CI. The pattern is to run the evaluation, read the aggregate scores, and exit non-zero if any metric falls below a threshold:

\`\`\`python
# eval_gate.py
import sys
from ragas import evaluate
from ragas.metrics import Faithfulness, ResponseRelevancy, LLMContextPrecisionWithReference

result = evaluate(dataset=dataset, metrics=[
    Faithfulness(llm=judge),
    ResponseRelevancy(llm=judge, embeddings=embeddings),
    LLMContextPrecisionWithReference(llm=judge),
])

scores = result._repr_dict if hasattr(result, '_repr_dict') else dict(result)
thresholds = {
    'faithfulness': 0.85,
    'answer_relevancy': 0.80,
    'llm_context_precision_with_reference': 0.75,
}

failed = []
for metric, minimum in thresholds.items():
    value = scores.get(metric, 0)
    print(f'{metric}: {value:.3f} (min {minimum})')
    if value < minimum:
        failed.append(metric)

if failed:
    print('FAILED thresholds:', ', '.join(failed))
    sys.exit(1)
print('All Ragas thresholds passed.')
\`\`\`

Wire it into GitHub Actions so every change to your RAG code runs the gate:

\`\`\`yaml
# .github/workflows/ragas.yml
name: RAG Eval
on:
  pull_request:
    paths: ['rag/**', 'prompts/**']
jobs:
  ragas:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install ragas langchain-openai
      - env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
        run: python eval_gate.py
\`\`\`

Set thresholds slightly below your current baseline so normal noise does not block merges, and ratchet them up as you improve. This is the same discipline described in our [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions), applied to RAG quality instead of unit tests.

## Ragas vs DeepEval vs Promptfoo

Ragas is not the only LLM evaluation framework, and the right choice depends on what you are testing. Ragas is laser-focused on RAG with reference-free, component-attributing metrics. DeepEval is a broader Python testing framework that models evals as pytest-style test cases and covers RAG plus general LLM behaviors. Promptfoo is a YAML-driven CLI oriented toward prompt comparison and red teaming across providers. Many teams use more than one.

| Dimension | Ragas | DeepEval | Promptfoo |
|---|---|---|---|
| Primary focus | RAG-specific metrics | General LLM unit testing | Prompt eval and red teaming |
| Language | Python | Python | YAML + CLI (JS/Python assertions) |
| Reference-free metrics | Yes, core design | Some | Via llm-rubric graders |
| RAG component attribution | Strong (retrieval vs generation) | Moderate | Limited |
| Red teaming | No | Basic | Extensive |
| Best for | Diagnosing RAG pipelines | pytest-native LLM assertions | Comparing prompts and models |

Choose Ragas when your core problem is a RAG pipeline and you need to know whether retrieval or generation is failing. Reach for DeepEval when you want LLM assertions that feel like pytest and integrate with an existing Python test suite. Use Promptfoo when your priority is comparing prompts across providers or running adversarial security scans, as covered in our [best AI testing tools 2026](/blog/best-ai-testing-tools-2026) roundup. The three are complementary, and a mature AI QA stack often runs Ragas for RAG quality alongside Promptfoo for prompt and safety testing.

## Frequently Asked Questions

### What is Ragas used for?

Ragas is a Python framework for evaluating retrieval-augmented generation pipelines. It scores properties like faithfulness, answer relevancy, context precision, and context recall using a judge LLM, without requiring a hand-written reference answer for most metrics. Teams use it to diagnose whether RAG failures come from retrieval or generation, compare pipeline versions, and gate CI on quality thresholds.

### How do I evaluate a RAG system with Ragas?

Run your RAG pipeline over a fixed set of test questions and record the retrieved contexts and generated answers into \`SingleTurnSample\` rows, then collect them in an \`EvaluationDataset\`. Call \`evaluate()\` with metrics like \`Faithfulness\` and \`ResponseRelevancy\`, passing a judge LLM. Ragas returns per-metric scores from 0 to 1 that tell you where in the pipeline quality is dropping.

### What is faithfulness in Ragas?

Faithfulness measures how well a generated answer is grounded in the retrieved context. Ragas decomposes the answer into individual claims and checks each against the provided context, then reports the fraction that is supported. A low faithfulness score is a direct hallucination signal: the model is producing statements that the retrieved passages do not back up, usually because the generation prompt allows parametric memory to leak in.

### Does Ragas require reference answers?

Most Ragas metrics are reference-free. Faithfulness, answer relevancy, and LLM-based context precision work purely from the question, context, and response using a judge LLM, so you do not need gold answers. Only context recall requires a reference to measure whether retrieval found everything needed. This reference-free design is what makes Ragas practical for RAG, where correct answers depend on documents that change over time.

### Which judge LLM should I use with Ragas?

A capable but affordable model such as \`gpt-4o-mini\` is a strong default that keeps evaluation cheap enough to run on every pull request. Wrap it with \`LangchainLLMWrapper\` and set \`temperature=0\` for deterministic, reproducible grading. Reserve a flagship model for cases where you suspect the judge itself is making mistakes, and consider a stronger judge for high-stakes correctness checks.

### What is the difference between context precision and context recall?

Context precision measures whether the relevant chunks are ranked near the top of the retrieved set, so low precision means your retriever returns noise or buries the right passages. Context recall measures whether retrieval found all the information needed to answer, so low recall means required evidence never reached the model. Precision points at ranking and chunking; recall points at coverage and index completeness.

### How is Ragas different from DeepEval and Promptfoo?

Ragas is purpose-built for RAG with reference-free metrics that attribute failure to retrieval or generation. DeepEval is a broader pytest-style Python framework for general LLM unit testing. Promptfoo is a YAML-driven CLI focused on comparing prompts across providers and red teaming. Use Ragas to diagnose RAG pipelines, DeepEval for pytest-native LLM assertions, and Promptfoo for prompt comparison and adversarial security scans.

### Can I integrate Ragas with LangChain and LlamaIndex?

Yes. Ragas is framework-agnostic because it only needs four fields per sample: the question, retrieved contexts, response, and optionally a reference. Run your LangChain chain or LlamaIndex query engine over test questions, capture the source documents as contexts and the generated text as the response into \`SingleTurnSample\` rows, then evaluate. Swapping frameworks does not change your evaluation code.

## Conclusion

Ragas gives RAG teams what generic metrics never could: interpretable, component-level scores that tell you whether a failure lives in retrieval or generation, mostly without hand-written references. Faithfulness catches hallucination, answer relevancy catches evasive answers, and context precision and recall catch retrieval problems. Build an \`EvaluationDataset\` from your real pipeline, run the metric triad with a deterministic judge LLM, read the score patterns against the diagnostic table, and gate CI so quality cannot silently regress. Combined with a broader AI testing stack, Ragas turns RAG evaluation from guesswork into engineering.

Ready to make RAG evaluation a standing part of your QA process? Browse the [QA skills directory](/skills) for reusable RAG and LLM evaluation skills you can drop into your AI coding agent, and pair Ragas with the practices in our [AI agent eval testing guide](/blog/ai-agent-eval-testing-guide) to keep your retrieval pipelines honest as they scale.
`,
};
