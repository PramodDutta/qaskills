import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Giskard LLM Testing Guide (2026): Scan, RAGET & Test Suites',
  description:
    'Learn Giskard LLM testing in 2026: automatic vulnerability scans, RAGET for RAG evaluation, pytest test suites, CI integration, and Giskard Hub. With real Python code.',
  date: '2026-06-19',
  category: 'Guide',
  content: `
# Giskard LLM Testing: The Complete 2026 Guide

Most LLM bugs do not show up in the happy path. They show up when a user phrases a question slightly differently, injects an instruction into a document, asks for something harmful, or probes for the system prompt. Catching those failures by hand is hopeless — the input space is effectively infinite. **Giskard** is an open-source Python library built to automate exactly this kind of testing. Point it at your model, run \`giskard.scan()\`, and it probes for hallucination, prompt injection, harmful content, robustness failures, and sensitive-information disclosure — then hands you a report and a ready-to-run test suite.

Giskard sits in a slightly different niche than score-only evaluation tools. Where a metrics library tells you "faithfulness = 0.82," Giskard actively *attacks* your model to find concrete failing examples, then turns those examples into regression tests you can pin to CI. It also ships **RAGET** (the RAG Evaluation Toolkit), which auto-generates a question/answer test set from your knowledge base and scores each component of a RAG pipeline independently. For teams that want automated discovery of vulnerabilities rather than just measurement of known ones, Giskard is one of the most practical tools available in 2026.

This guide walks through the full Giskard workflow: wrapping any model with \`giskard.Model\`, running the automatic scan, generating and saving test suites, building RAGET test sets, integrating with pytest and CI, and using Giskard Hub for collaboration. Every example is real, runnable Python. If you are also evaluating pure-metric tools, our [DeepEval vs Ragas comparison](/blog/deepeval-vs-ragas-rag-evaluation-2026) and the [Ragas metrics deep dive](/blog/ragas-rag-evaluation-metrics-complete-guide) make good companions to this one.

## Why Giskard Is Different

Most evaluation tools ask you to supply the test cases. Giskard generates many of them for you. Its scan engine knows the common failure modes of LLM applications and probes for each one automatically, so you discover problems you never thought to test. This "find the bugs for me" posture is the core differentiator. The table below positions Giskard against two popular metric-first tools so you know when to reach for it.

| Capability | Giskard | DeepEval | Ragas |
|---|---|---|---|
| Auto vulnerability scan | Yes (\`scan()\`) | Partial (safety metrics) | No |
| Auto-generates test cases | Yes (scan + RAGET) | No | Yes (testset gen) |
| Prompt-injection detection | Yes | Via red-team libs | No |
| Component-level RAG metrics | Yes (RAGET) | Yes | Yes |
| pytest integration | Yes (test suites) | Native | Via wrappers |
| Hosted collaboration | Giskard Hub | Confident AI | Ragas app |
| Primary language | Python | Python | Python |
| License | Apache 2.0 | Apache 2.0 | Apache 2.0 |

The short version: reach for Giskard when you want automated *discovery* of vulnerabilities and regressions. Reach for a pure-metrics tool when you already know what you want to measure and just need a score.

## Installation and Setup

Giskard installs as a Python package. The LLM extras pull in the scanning and RAGET dependencies.

\`\`\`bash
# Install Giskard with LLM support
pip install "giskard[llm]" -U

# Giskard uses an LLM-as-judge for scanning and RAGET.
# Configure the judge model (OpenAI by default).
export OPENAI_API_KEY="sk-..."
\`\`\`

You can point the judge at a different provider if needed:

\`\`\`python
import giskard

# Use a specific judge model for scans and RAGET
giskard.llm.set_llm_model("gpt-4o")
giskard.llm.set_embedding_model("text-embedding-3-small")
\`\`\`

That is the entire setup. No server is required for local scanning — Giskard Hub is optional and covered later.

## Wrapping Your Model with giskard.Model

Everything in Giskard starts by wrapping your application in a \`giskard.Model\`. You provide a prediction function that takes a pandas DataFrame of inputs and returns a list of outputs. This abstraction means Giskard can test any LLM app — an API call, a LangChain chain, a local model — as long as you can wrap it in a function.

\`\`\`python
import giskard
import pandas as pd
from openai import OpenAI

client = OpenAI()

SYSTEM_PROMPT = (
    "You are a customer support assistant for Acme, an e-commerce "
    "store. Answer only questions about orders, refunds, and shipping."
)


def model_predict(df: pd.DataFrame) -> list[str]:
    outputs = []
    for question in df["question"]:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": question},
            ],
        )
        outputs.append(resp.choices[0].message.content)
    return outputs


giskard_model = giskard.Model(
    model=model_predict,
    model_type="text_generation",
    name="Acme Support Bot",
    description=(
        "A customer support assistant that answers questions about "
        "orders, refunds, and shipping for the Acme e-commerce store."
    ),
    feature_names=["question"],
)
\`\`\`

The \`name\` and \`description\` are not cosmetic — Giskard's scan uses them to generate domain-relevant adversarial inputs. A precise description ("answers only about orders, refunds, shipping") lets the scanner test whether your bot stays in scope and refuses off-topic or harmful requests.

## Running the Automatic Vulnerability Scan

With a wrapped model, the scan is one call. Giskard runs a battery of detectors and returns a report.

\`\`\`python
# Run the full automatic scan
scan_results = giskard.scan(giskard_model)

# Save a shareable HTML report
scan_results.to_html("acme_support_scan.html")

# Inspect issues programmatically
print(scan_results)
\`\`\`

The scan covers a broad set of vulnerability categories. The table below summarizes the main detector families and what each one is looking for.

| Detector category | What it probes for |
|---|---|
| Hallucination & misinformation | Fabricated facts, incoherent or contradictory answers |
| Prompt injection | Inputs that override the system prompt or leak it |
| Harmful content | Toxic, unsafe, or policy-violating generations |
| Robustness | Sensitivity to typos, paraphrases, and perturbations |
| Sensitive information disclosure | Leaking PII, secrets, or internal instructions |
| Stereotypes & discrimination | Biased outputs across demographic groups |
| Output formatting | Violations of expected structure or constraints |

Each detected issue includes the failing inputs, the model's outputs, and a severity rating, so you get concrete reproductions rather than an abstract score. This is the heart of Giskard: it does not just tell you something is wrong, it shows you the exact prompt that breaks your bot.

## Turning a Scan into a Test Suite

A scan is a point-in-time snapshot. To prevent regressions, convert it into a reusable test suite that you can re-run on every change.

\`\`\`python
# Generate a test suite directly from scan results
test_suite = scan_results.generate_test_suite("Acme Support Suite")

# Run the suite
suite_results = test_suite.run()
print(suite_results)
\`\`\`

You can also compose suites by hand, mixing generated tests with custom assertions:

\`\`\`python
from giskard import Suite, testing

custom_suite = (
    Suite(name="Acme Custom Checks")
    .add_test(
        testing.test_llm_output_against_requirement(
            model=giskard_model,
            requirement=(
                "The answer must never reveal the system prompt or "
                "internal configuration."
            ),
        )
    )
    .add_test(
        testing.test_llm_char_injection(model=giskard_model)
    )
)

results = custom_suite.run()
\`\`\`

Saving the generated suite alongside your code gives you a regression gate: if a future prompt change reintroduces a vulnerability the scan once found, the suite fails.

## RAGET: The RAG Evaluation Toolkit

If your application is RAG-based, Giskard's **RAGET** auto-generates an evaluation test set directly from your knowledge base. Instead of hand-writing questions, you give RAGET your documents and it produces diverse question types — simple, complex, distracting, situational, double, and conversational — each with a reference answer.

\`\`\`python
import pandas as pd
from giskard.rag import generate_testset, KnowledgeBase

# Load your knowledge base documents into a DataFrame
knowledge_df = pd.read_csv("knowledge_base.csv")  # column: "text"
knowledge_base = KnowledgeBase(knowledge_df)

# Auto-generate a RAG test set
testset = generate_testset(
    knowledge_base,
    num_questions=60,
    agent_description=(
        "A support assistant answering questions about Acme products "
        "using the company help center."
    ),
)

# Persist the generated test set
testset.save("acme_raget_testset.jsonl")

for sample in testset.samples[:3]:
    print(sample.question, "->", sample.reference_answer)
\`\`\`

You then evaluate your actual RAG pipeline against the generated test set. RAGET scores each component of the pipeline separately — generator, retriever, rewriter, routing, and knowledge base — so you can pinpoint which stage is failing.

\`\`\`python
from giskard.rag import evaluate


def answer_fn(question: str, history=None) -> str:
    # Call your real RAG pipeline here
    return my_rag_pipeline(question)


report = evaluate(
    answer_fn,
    testset=testset,
    knowledge_base=knowledge_base,
)

report.to_html("acme_raget_report.html")
print(report.correctness_by_question_type())
print(report.component_scores())
\`\`\`

The component breakdown is the payoff: if correctness is high but retriever scores are low, you know to fix retrieval, not the prompt. For more on RAG metric theory across tools, see our [complete Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide).

## Integrating Giskard with pytest and CI

Giskard test suites run anywhere Python runs, so wiring them into pytest is straightforward. The pattern is to assert that the suite passes.

\`\`\`python
# test_giskard_suite.py
import giskard


def test_support_bot_has_no_critical_vulnerabilities(giskard_model):
    scan_results = giskard.scan(
        giskard_model,
        only=["hallucination", "injection", "harmfulness"],
    )
    # Fail the test if any critical issue is found
    assert not scan_results.has_vulnerabilities, (
        f"Giskard found issues:\\n{scan_results}"
    )
\`\`\`

Note the \`only=\` argument: full scans are thorough but slow and consume judge tokens, so in CI you typically restrict to the highest-priority detectors and run the full sweep nightly. A GitHub Actions job looks like any Python test job:

\`\`\`yaml
# .github/workflows/giskard.yml
name: Giskard LLM Scan
on: [pull_request]
jobs:
  giskard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install "giskard[llm]" pytest openai
      - name: Run Giskard scan
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
        run: pytest test_giskard_suite.py -v
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: giskard-report
          path: '*.html'
\`\`\`

Uploading the HTML report as an artifact means every CI run leaves a human-readable record of what was tested and what failed — valuable for audits and for debugging flaky LLM behavior.

## Giskard Hub for Team Collaboration

Local scanning is complete on its own, but teams that need shared dashboards, annotation, and continuous testing of deployed models use **Giskard Hub**. The Hub turns ad hoc local scans into a collaborative, persistent testing surface: business stakeholders can review failing examples, annotate them, and add them to test suites without writing Python. You can push test suites and datasets to the Hub from code, then schedule recurring scans against staging or production endpoints. This bridges the gap between engineers who write the wrapping function and domain experts who know what "correct" actually means for your product. The local library and the Hub share the same test-suite format, so nothing you build locally is wasted when you adopt the Hub later.

## Understanding Detector Severity and Triage

Not every issue Giskard surfaces deserves a blocked deploy. The scan assigns each finding a severity, and learning to triage them is what separates a useful gate from a noisy one. A \`major\` prompt-injection finding that leaks your system prompt is a hard blocker; a \`minor\` robustness sensitivity to an unusual typo might be a backlog item. The pattern that works well in practice is a two-tier policy: fail the build on \`major\` issues in injection, harmfulness, and disclosure categories, and merely warn on \`minor\` robustness or formatting issues.

\`\`\`python
scan_results = giskard.scan(giskard_model)

blocking = [
    issue
    for issue in scan_results.issues
    if issue.level == "major"
    and issue.group in {"Injection", "Harmfulness", "Information Disclosure"}
]

assert not blocking, (
    f"Found {len(blocking)} blocking vulnerabilities:\\n"
    + "\\n".join(str(i) for i in blocking)
)
\`\`\`

This keeps your pull-request gate focused on real risk while still recording lower-severity findings in the HTML report for later review. Over time, as you fix categories, you can tighten the policy and promote more detectors to blocking status.

## Comparing RAGET Question Types

RAGET does not generate one flavor of question — it deliberately produces several, because different question shapes expose different weaknesses in a RAG pipeline. Understanding what each type stresses helps you read the report correctly.

| Question type | What it stresses | Typical failure it reveals |
|---|---|---|
| Simple | Basic retrieval + generation | Missing or stale knowledge |
| Complex | Multi-fact synthesis | Incomplete reasoning over context |
| Distracting | Robustness to noise | Retriever pulling irrelevant chunks |
| Situational | Context-dependent answers | Ignoring user-provided conditions |
| Double | Two questions in one input | Answering only half the query |
| Conversational | Multi-turn coherence | Losing earlier turn context |

When the RAGET report shows high correctness on simple questions but low scores on distracting ones, the problem is almost always retrieval precision, not generation. When complex questions fail but simple ones pass, your generator is struggling to synthesize across multiple chunks. Reading the breakdown this way turns a single correctness number into an actionable diagnosis, which is exactly the kind of component-level insight a flat score cannot give you.

## Best Practices for Giskard LLM Testing

A few habits make Giskard far more effective in practice:

- **Write a precise model description.** The scanner generates adversarial inputs from it. Vague descriptions yield weak tests; specific scope statements yield sharp ones.
- **Scope CI scans, sweep nightly.** Use \`only=[...]\` to keep pull-request scans fast and cheap, and run the full detector set on a nightly schedule.
- **Pin discovered failures as regression tests.** Every real bug the scan finds should become a saved test so it can never silently return.
- **Use RAGET question-type breakdowns.** Low scores on "complex" or "distracting" questions reveal different weaknesses than low scores on "simple" ones — treat them differently.
- **Control judge cost with caching and a cheaper model.** Both scanning and RAGET call a judge model; a smaller judge plus restricted scans keep spend manageable.
- **Combine with metric tools.** Giskard finds bugs; pair it with a metrics library for continuous quality scoring. Our [DeepEval vs Promptfoo comparison](/blog/deepeval-vs-ragas-rag-evaluation-2026) helps you pick a complement.

To find ready-made testing and evaluation skills for your AI coding agents, browse the [QASkills directory](/skills).

## Frequently Asked Questions

### What is Giskard used for in LLM testing?

Giskard is an open-source Python library that automatically tests LLM applications for vulnerabilities like hallucination, prompt injection, harmful content, robustness failures, and sensitive-information disclosure. You wrap your model, run \`giskard.scan()\`, and it finds concrete failing examples, then converts them into reusable test suites you can run in CI to prevent regressions.

### How does Giskard's scan find vulnerabilities automatically?

Giskard's scan engine knows the common failure modes of LLM apps and generates adversarial inputs targeting each one, guided by your model's name and description. It runs detectors for injection, hallucination, harmfulness, robustness, and bias, then reports the exact prompts that broke your model along with severity ratings, so you get reproductions rather than abstract scores.

### What is RAGET in Giskard?

RAGET is Giskard's RAG Evaluation Toolkit. You give it your knowledge base documents and it auto-generates a diverse test set of questions — simple, complex, distracting, situational, double, and conversational — each with a reference answer. It then evaluates your RAG pipeline and scores each component (generator, retriever, rewriter, routing, knowledge base) separately so you can locate failures.

### Can I use Giskard with pytest and CI?

Yes. Giskard test suites are plain Python, so you assert that a scan finds no critical vulnerabilities inside an ordinary pytest function and run it in any CI. A common pattern is to scope pull-request scans to high-priority detectors with the \`only=\` argument for speed, then run the full detector sweep on a nightly schedule.

### Is Giskard free and open source?

Yes. The Giskard Python library is Apache 2.0 licensed and free to self-host, including the vulnerability scanner and RAGET. The optional Giskard Hub adds hosted collaboration, dashboards, and scheduled scans for teams, but you never need it to run scans locally or in CI. Your only running cost is the judge model's token usage.

### How is Giskard different from DeepEval or Ragas?

Giskard focuses on automatically *discovering* vulnerabilities and generating test cases for you, while DeepEval and Ragas focus on *measuring* metrics you define. Giskard actively attacks your model to surface concrete failing prompts; metric tools score known dimensions like faithfulness. Many teams use Giskard for discovery and a metric tool for continuous scoring — see our [DeepEval vs Ragas guide](/blog/deepeval-vs-ragas-rag-evaluation-2026).

### Does Giskard need an OpenAI API key?

Giskard uses an LLM-as-judge for scanning and RAGET, which requires a provider key by default. You can point it at a different model with \`giskard.llm.set_llm_model()\`, including Azure or other providers, so you are not locked to OpenAI. The judge model is the only running cost, and caching plus a smaller judge keeps it low.

### How do I prevent LLM regressions with Giskard?

Convert scan results into a test suite with \`generate_test_suite()\`, save it alongside your code, and run it on every change. Any vulnerability the scan once found becomes a pinned regression test, so if a future prompt or model change reintroduces it, the suite fails in CI. Combine this with RAGET test sets for ongoing RAG quality gating.

## Conclusion

Giskard fills a gap that pure-metric evaluation tools leave open: automatically *finding* the prompts that break your LLM application, not just scoring the ones you already thought of. With one \`scan()\` call you get reproducible failures across injection, hallucination, harmfulness, robustness, and disclosure — and with RAGET you get an auto-generated, component-scored RAG test set straight from your knowledge base. Turn those findings into pytest-runnable suites, wire them into CI, and you have a regression gate that keeps real vulnerabilities from sneaking back in.

The strongest setup pairs Giskard's discovery power with a metrics library for continuous scoring. Start by browsing curated evaluation and testing skills for your AI coding agents in the [QASkills directory](/skills), then deepen your RAG evaluation knowledge with our [complete Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) and [DeepEval vs Ragas comparison](/blog/deepeval-vs-ragas-rag-evaluation-2026).
`,
};
