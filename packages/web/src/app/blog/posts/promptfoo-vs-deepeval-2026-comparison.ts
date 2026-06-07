import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Promptfoo vs DeepEval: LLM Testing Framework Comparison 2026',
  description:
    'Promptfoo vs DeepEval in 2026: CLI/YAML red teaming vs pytest-style metrics. Compare RAG support, CI/CD, graders, languages, and pricing with runnable configs.',
  date: '2026-06-07',
  category: 'Comparison',
  content: `
# Promptfoo vs DeepEval: LLM Testing Framework Comparison 2026

If you are building an LLM feature and need to test it before it ships, you will quickly run into two names: Promptfoo and DeepEval. Both are free, open source, and widely adopted in 2026. Both let you assert that a model's output meets a quality bar, both score outputs with model-graded checks, and both plug into continuous integration. Yet they come from opposite ends of the testing world. Promptfoo is a CLI- and YAML-first tool that grew out of prompt comparison and red teaming. DeepEval is a Python metrics library that feels like an extension of pytest, the unit-testing framework most Python engineers already know.

This guide compares the two head to head. We cover positioning and philosophy, metric coverage, RAG support, red teaming, CI/CD integration, the assertion and grader styles each tool uses, language and runtime, local versus hosted operation, and how pricing works. You will find a runnable \`promptfooconfig.yaml\` and a runnable DeepEval pytest file so you can see the ergonomics for yourself. At the end there is a recommendation matrix that maps common use cases to the tool that fits best. The goal is not to crown a winner but to help you pick the right tool for your stack, your language, and your workflow.

## Key Takeaways

- Promptfoo is CLI- and YAML-first, runs on Node.js, and is strongest at prompt comparison, side-by-side model evals, and red teaming.
- DeepEval is a Python library that mirrors pytest, so it slots naturally into existing Python test suites and CI gates.
- Both are open source and free to self-host. Each has an optional companion cloud platform for dashboards and team collaboration; check current pricing on their sites.
- DeepEval ships a large catalog of research-backed metrics (G-Eval, faithfulness, answer relevancy, hallucination, and RAG-specific scores). Promptfoo offers a broad set of assertion types plus model-graded rubrics.
- Promptfoo's red-teaming and adversarial test generation are best in class. DeepEval added red teaming through a companion project, but Promptfoo's is more mature.
- Choose by language and workflow first: Python pytest shop leans DeepEval; YAML-driven, multi-provider comparison or security testing leans Promptfoo.

---

## Positioning and Philosophy

Promptfoo was built to answer a single practical question: which prompt or model is better. You describe prompts, providers, and test cases in a YAML file, run \`promptfoo eval\`, and get a colorized table that compares outputs side by side. The mental model is a spreadsheet of experiments. Because the configuration is declarative, you can compare five models against twenty prompts without writing a line of imperative code. Over time Promptfoo grew a powerful red-teaming engine that generates adversarial inputs and probes for jailbreaks, prompt injection, and unsafe content.

DeepEval was built to answer a different question: does my LLM output pass the same kind of assertion I would write in a unit test. If you have ever written \`assert response.status_code == 200\`, DeepEval feels immediately familiar. You write a test function, construct an \`LLMTestCase\`, pick one or more metrics, and call \`assert_test\`. The whole thing runs under \`deepeval test run\` or plain \`pytest\`. The mental model is your existing test suite, extended to cover non-deterministic model output.

That difference in origin explains nearly every other distinction. Promptfoo optimizes for fast, declarative comparison and security testing. DeepEval optimizes for deep, code-native metric evaluation that lives next to your application code.

---

## Language and Runtime

This is often the deciding factor, so it comes early. Promptfoo is a Node.js tool. You install it with \`npm install -g promptfoo\` or run it with \`npx promptfoo@latest\`. It is language-agnostic about what you are testing because it talks to model providers over HTTP, but the tool itself and its custom JavaScript or TypeScript assertions live in the Node ecosystem. You can call custom Python graders, but the host runtime is Node.

DeepEval is a Python library. You install it with \`pip install deepeval\`, and it runs inside the Python interpreter alongside your application. If your product backend, your data pipeline, and your existing tests are all Python, DeepEval removes a context switch: your evals are just more Python in the same virtual environment, importing the same modules your app imports.

The practical implication is simple. A Python-first team that already uses pytest gets the smoothest path with DeepEval. A team that prefers declarative config, mixes languages, or already runs Node tooling gets the smoothest path with Promptfoo. Neither choice locks you out of testing any provider, but the developer experience is best when the eval tool matches your primary language.

---

## Metric Coverage

DeepEval leads on the breadth and depth of built-in metrics. It ships a catalog of research-backed scorers you can drop in without writing your own rubric. These include G-Eval (a flexible LLM-as-judge metric you define with natural-language criteria), answer relevancy, faithfulness, contextual precision and recall, hallucination, toxicity, bias, and summarization quality. Each metric returns a numeric score and a reason string explaining the verdict, which is useful when a test fails and you need to know why.

Promptfoo approaches scoring through assertions. You attach one or more assertions to each test case, and they range from deterministic checks (equality, contains, regex, JSON schema validation, latency thresholds, cost ceilings) to model-graded checks (\`llm-rubric\`, \`factuality\`, \`answer-relevance\`, \`context-faithfulness\`). It also supports custom JavaScript and Python assertions for anything bespoke. The catalog is broad and pragmatic, leaning toward composable building blocks rather than a fixed taxonomy of academic metrics.

The distinction: DeepEval gives you a named, documented metric for most common evaluation needs out of the box, which is convenient and reduces the chance of writing a weak rubric. Promptfoo gives you flexible assertion primitives plus model-graded rubrics, which is powerful but asks you to compose more of the evaluation yourself.

| Capability | Promptfoo | DeepEval |
|---|---|---|
| Primary interface | CLI + YAML config | Python library + pytest |
| Host runtime | Node.js | Python |
| Deterministic asserts | Yes (contains, regex, JSON schema, latency, cost) | Yes (custom + metric thresholds) |
| Model-graded scoring | llm-rubric, factuality, relevance | G-Eval, faithfulness, relevancy, hallucination |
| Named RAG metrics | Context faithfulness/recall assertions | Contextual precision, recall, faithfulness, relevancy |
| Red teaming | Best in class, built in | Available via companion project |
| Side-by-side model compare | First-class (web view) | Possible but code-driven |
| Custom graders | JS or Python | Python |
| Local self-host | Yes (fully) | Yes (fully) |
| Optional cloud dashboard | Yes (check pricing) | Yes (check pricing) |

---

## RAG Support

Retrieval-augmented generation has its own failure modes: the model can hallucinate facts not present in the retrieved context, the retriever can fetch irrelevant chunks, or the answer can ignore the context entirely. Both tools support RAG evaluation, but they package it differently.

DeepEval treats RAG as a first-class scenario. Its \`LLMTestCase\` accepts a \`retrieval_context\` field, and metrics like contextual precision, contextual recall, faithfulness, and answer relevancy are designed to score the retrieval and the generation separately. This separation matters because it tells you whether a bad answer came from a bad retrieval or a bad generation step. For teams building RAG pipelines, this granularity speeds up debugging.

Promptfoo supports RAG through context-aware assertions such as \`context-faithfulness\`, \`context-recall\`, and \`context-relevance\`, which you populate by passing the retrieved context as a variable in your test case. You can also evaluate the retrieval step directly by writing a provider that calls your vector store. It works well, and for a YAML-driven comparison of two retrieval strategies it is excellent, but the metric vocabulary is assertion-shaped rather than a dedicated RAG suite.

If RAG quality is the core of your product and you want named, separable retrieval and generation scores with explanatory reasons, DeepEval has a slight edge. If you want to compare retrieval strategies or prompt variants quickly in config, Promptfoo is very comfortable. For a deeper look at the wider field, see our [LLM evals comparison covering OpenAI, Promptfoo, and Ragas](/blog/llm-evals-comparison-openai-promptfoo-ragas).

---

## Red Teaming and Security Testing

Red teaming is where Promptfoo pulls clearly ahead. It includes a dedicated red-teaming engine that generates adversarial test cases automatically across many attack categories: prompt injection, jailbreaks, PII leakage, harmful content, hijacking, and more. You configure a small set of plugins and strategies, run \`promptfoo redteam run\`, and the tool synthesizes attacks, executes them against your application, and produces a report you can act on. This makes it a practical security-scanning step you can run in CI before a release.

DeepEval can do red teaming as well, primarily through a companion red-teaming project in the same ecosystem that focuses on adversarial robustness and vulnerability scanning. It is capable and improving, but as of 2026 Promptfoo's red-teaming surface area, attack library, and reporting are more mature and more frequently the default choice for teams whose primary goal is security testing of an LLM application.

If your evaluation program is driven by safety and security requirements, that alone is a strong reason to reach for Promptfoo. We cover the discipline in depth in our guide to [red teaming LLM applications with Promptfoo](/blog/promptfoo-red-teaming-llm-applications).

| Red-teaming dimension | Promptfoo | DeepEval |
|---|---|---|
| Built-in adversarial generation | Extensive, plugin-based | Via companion project |
| Attack categories covered | Broad (injection, jailbreak, PII, harm) | Growing |
| One-command scan | \`promptfoo redteam run\` | Project-specific commands |
| Reporting | Dedicated red-team report | Vulnerability output |
| Maturity (2026) | High | Moderate |

---

## Assertion and Grader Styles

The two tools express "did this output pass" in noticeably different ways, and the style you prefer matters for day-to-day ergonomics.

Promptfoo uses an assertion list attached to each test. Each assertion has a \`type\` and usually a \`value\`. A single test can stack a deterministic check (the output must be valid JSON), a model-graded check (an \`llm-rubric\` asking whether the answer is helpful and accurate), and a constraint (latency under two seconds). Promptfoo aggregates the assertions into a pass or fail for the row and shows the breakdown in its web view. Because assertions are data, you can template them across many test cases and keep the whole eval in version control as readable YAML.

DeepEval uses metrics objects with thresholds. You instantiate a metric, for example \`AnswerRelevancyMetric(threshold=0.7)\`, attach it to a test case, and call \`assert_test\`. Each metric computes a score between zero and one and passes when the score meets the threshold. Because this is Python, you can parametrize tests, share fixtures, mock dependencies, and use every pytest feature you already know. Failures appear in standard pytest output, and DeepEval also prints the metric's reason so you understand the verdict.

Both styles are good. Promptfoo's is more declarative and shines for comparison tables. DeepEval's is more programmatic and shines when your evals need real logic, shared setup, or tight coupling to application code.

---

## A Runnable Promptfoo Config

Here is a complete \`promptfooconfig.yaml\` that compares two models on a support-summary task. It mixes a deterministic assertion, a model-graded rubric, and a context-faithfulness check for a small RAG case. Save it, then run \`npx promptfoo@latest eval\` followed by \`npx promptfoo@latest view\` to open the results.

\`\`\`yaml
# promptfooconfig.yaml
description: "Support reply quality eval: gpt-4o vs gpt-4o-mini"

prompts:
  - |
    You are a support agent. Using only the context below, answer the
    customer question in two sentences. If the context does not contain
    the answer, say you do not know.
    Context: {{context}}
    Question: {{question}}

providers:
  - openai:gpt-4o
  - openai:gpt-4o-mini

defaultTest:
  assert:
    - type: latency
      threshold: 4000
    - type: llm-rubric
      value: "The reply is polite, concise, and directly answers the question."

tests:
  - vars:
      context: "Refunds are processed within 5 business days to the original payment method."
      question: "How long do refunds take?"
    assert:
      - type: contains
        value: "5"
      - type: context-faithfulness
        threshold: 0.8

  - vars:
      context: "Our office is open Monday to Friday, 9am to 5pm."
      question: "Are you open on Sundays?"
    assert:
      - type: llm-rubric
        value: "The reply correctly states the office is not open on Sundays."

  - vars:
      context: "The premium plan costs 20 dollars per month and includes priority support."
      question: "What does the premium plan include?"
    assert:
      - type: contains-any
        value: ["priority support", "priority"]
\`\`\`

The structure reads top to bottom: declare prompts, declare providers, set default assertions that apply to every test, then list test cases with their own variables and extra assertions. Nothing here is imperative. You could add a third provider or ten more test cases without touching code, which is exactly the iteration loop Promptfoo is built for. For a full tour of the tool, see our [complete Promptfoo guide for 2026](/blog/promptfoo-complete-guide-2026).

---

## A Runnable DeepEval Pytest File

Here is the same spirit of test in DeepEval. It uses two built-in metrics, answer relevancy and faithfulness, plus a custom G-Eval metric defined with plain-language criteria. Save it as \`test_support.py\` and run it with \`deepeval test run test_support.py\` or with \`pytest\`.

\`\`\`python
# test_support.py
from deepeval import assert_test
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from deepeval.metrics import (
    AnswerRelevancyMetric,
    FaithfulnessMetric,
    GEval,
)


def call_my_app(question: str, context: str) -> str:
    """Replace this with a real call to your LLM application."""
    # Stand-in deterministic response for the example.
    return "Refunds are processed within 5 business days."


def test_refund_answer():
    question = "How long do refunds take?"
    context = [
        "Refunds are processed within 5 business days to the "
        "original payment method."
    ]
    output = call_my_app(question, context[0])

    test_case = LLMTestCase(
        input=question,
        actual_output=output,
        retrieval_context=context,
    )

    relevancy = AnswerRelevancyMetric(threshold=0.7)
    faithfulness = FaithfulnessMetric(threshold=0.8)
    tone = GEval(
        name="Tone",
        criteria="Decide if the reply is polite and concise.",
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
        ],
        threshold=0.7,
    )

    assert_test(test_case, [relevancy, faithfulness, tone])
\`\`\`

Notice how this is ordinary Python. You import metrics, build a test case, and assert. You can parametrize \`test_refund_answer\` over a list of question and context pairs with \`pytest.mark.parametrize\`, share an LLM client through a fixture, and run it in the same job that runs your unit tests. That seamlessness with the Python test stack is DeepEval's core advantage. For a deeper walkthrough, read our [DeepEval pytest LLM testing guide](/blog/deepeval-pytest-llm-testing-guide).

---

## CI/CD Integration

Both tools are designed to run in continuous integration and to fail a build when quality regresses, which is the whole point of automated evals. The integration styles match their philosophies.

Promptfoo runs as a CLI step. In GitHub Actions you add a job that installs Node, runs \`npx promptfoo@latest eval\`, and lets a non-zero exit code fail the build when assertions do not pass. Promptfoo also publishes a GitHub Action and supports sharing eval results as a link or comment, so reviewers can inspect a comparison table on a pull request. Because the config is declarative YAML in your repo, the eval is reviewable like any other code change. The red-team step can run on the same trigger, giving you a security gate before merge.

DeepEval runs as a pytest step, which means it inherits everything your existing Python CI already does. If you run \`pytest\` in CI today, you run DeepEval by pointing the same command at your eval tests or by adding \`deepeval test run\`. Failures show up in the standard test report, coverage of conftest fixtures and markers works as usual, and you can gate merges on the eval job exactly as you gate on unit tests. For Python teams this is the least disruptive integration possible.

| CI/CD dimension | Promptfoo | DeepEval |
|---|---|---|
| Invocation | \`promptfoo eval\` CLI step | \`pytest\` / \`deepeval test run\` |
| Build gate | Non-zero exit on failed assert | Standard pytest failure |
| PR comments / shareable results | Yes (shareable links, action) | Through pytest reporters |
| Fits existing Python CI | Adds a Node step | Reuses existing pytest job |
| Security gate in CI | Yes (red-team run) | Limited |
| Config reviewability | YAML diff in PR | Python diff in PR |

For broader CI context across the tooling landscape, see our roundup of [AI test automation tools for 2026](/blog/ai-test-automation-tools-2026).

---

## Local vs Hosted and Pricing

Both tools are fully usable on a laptop or a CI runner with no account and no network dependency beyond the model provider you are testing. This is important: you can adopt either one, run unlimited evals locally, and never pay the project a cent. The cost you do pay is the inference cost of the model calls that the model-graded metrics and your application make, which is true of any LLM eval tool.

Each project offers an optional companion cloud product for teams that want hosted dashboards, historical tracking, shared datasets, and collaboration features. Promptfoo has a cloud offering aimed at teams and enterprises that want managed red-teaming and result sharing. DeepEval has a companion platform that adds hosted dashboards, dataset management, and team features on top of the open-source library. Pricing for both evolves, often with a free tier and paid plans by seat or usage, so do not anchor on any number you read in an article. Check current pricing on each project's site before you budget.

The honest summary: for an individual engineer or a small team that just needs to gate quality in CI, both tools are free and self-contained. The paid tiers earn their keep when you need persistent dashboards, organization-wide datasets, managed red-teaming, or audit trails across many projects.

| Operating model | Promptfoo | DeepEval |
|---|---|---|
| Run locally, no account | Yes | Yes |
| Self-host fully | Yes | Yes |
| Companion cloud | Yes (teams, red-team) | Yes (dashboards, datasets) |
| License | Open source | Open source |
| Cost to start | Free (pay only model usage) | Free (pay only model usage) |
| Pricing note | Check current pricing | Check current pricing |

---

## Recommendation Matrix by Use Case

The right tool depends on what you are testing and how your team works. This matrix maps common situations to the better default. Both tools can usually do the other's job, so treat this as a starting point rather than a rule.

| Use case | Better default | Why |
|---|---|---|
| Python backend with existing pytest suite | DeepEval | Evals become more Python in the same job |
| Compare many prompts or models side by side | Promptfoo | Declarative YAML, built-in comparison view |
| Security and red-team testing of an LLM app | Promptfoo | Mature, one-command adversarial scanning |
| RAG pipeline with separable retrieval scoring | DeepEval | Named contextual precision/recall/faithfulness |
| Non-Python or mixed-language stack | Promptfoo | Node CLI, provider-agnostic over HTTP |
| Quick prompt iteration during development | Promptfoo | Fast edit-run-compare loop |
| Deep metric reasoning tied to app logic | DeepEval | Programmatic metrics, fixtures, parametrize |
| Reviewable evals as config in pull requests | Promptfoo | YAML diffs read cleanly in review |
| Want a large catalog of named metrics | DeepEval | G-Eval, hallucination, bias, summarization |

Many teams end up using both. They iterate on prompts and run security scans in Promptfoo during development, and they gate their Python CI with DeepEval metrics that live next to the application. That combination gives you fast comparison and security coverage from one tool and code-native, deeply integrated metric gates from the other. Browse related tooling on our [skills directory](/skills) to round out your evaluation stack.

---

## Frequently Asked Questions

### Is Promptfoo or DeepEval better for LLM testing in 2026?

Neither is universally better; they fit different teams. Promptfoo is the stronger choice for declarative prompt and model comparison, fast iteration, and red teaming, and it runs on Node.js. DeepEval is the stronger choice for Python-first teams that want metric-rich evals embedded in an existing pytest suite. Decide by your primary language and whether your priority is comparison and security (Promptfoo) or code-native metric gates (DeepEval).

### Can DeepEval and Promptfoo run together in the same project?

Yes, and many teams do exactly that. They use Promptfoo during development for side-by-side prompt comparison and for red-team security scans, then gate their Python continuous integration with DeepEval metrics that import the same application code. The two tools do not conflict because they run as separate steps. Using both gives you Promptfoo's comparison and adversarial coverage alongside DeepEval's deep, code-native metric assertions in CI.

### Which tool has better RAG evaluation support?

DeepEval has a slight edge for RAG because it treats retrieval context as a first-class field and offers named, separable metrics: contextual precision, contextual recall, faithfulness, and answer relevancy. That separation tells you whether a poor answer came from bad retrieval or bad generation. Promptfoo supports RAG through context-faithfulness and context-recall assertions, which work well for comparing retrieval strategies in YAML but are assertion-shaped rather than a dedicated RAG metric suite.

### Does Promptfoo work with Python, or is it Node only?

The Promptfoo tool itself runs on Node.js and is installed with npm or run with npx. However, it is provider-agnostic about what you test because it calls model providers over HTTP, so you can evaluate a Python application's endpoint without issue. You can also write custom Python assertions that Promptfoo invokes. If you want the eval host runtime itself to be Python and to live inside your pytest suite, DeepEval is the more natural fit.

### Are Promptfoo and DeepEval free to use?

Both are open source and free to run locally or in CI with no account required. The only direct cost is the model inference for the calls your application and any model-graded metrics make, which applies to every LLM eval tool. Each project also offers an optional companion cloud platform with hosted dashboards, shared datasets, and team features on paid plans. Check current pricing on each project's site, since plans change over time.

### Which framework is easier to add to an existing CI pipeline?

For a Python pipeline that already runs pytest, DeepEval is the least disruptive because its tests are pytest tests; you reuse the same job, fixtures, and reporters. For pipelines that are language-agnostic or already use Node tooling, Promptfoo drops in as a CLI step whose non-zero exit code fails the build, and it can also post shareable comparison results on pull requests. Both are designed to gate merges on eval quality.

### How mature is DeepEval's red teaming compared to Promptfoo?

As of 2026, Promptfoo's red teaming is more mature. It includes a built-in adversarial generation engine with a broad attack library covering prompt injection, jailbreaks, PII leakage, and harmful content, plus dedicated reporting, all runnable with one command. DeepEval offers red teaming primarily through a companion project that is capable and improving but covers fewer attack categories and is less established. If security testing is your main goal, Promptfoo is the safer default.

### Should I pick based on metrics or based on workflow?

Workflow first, then metrics. The biggest day-to-day cost is friction, so match the tool to your language and your existing test process: Python pytest shops gain the most from DeepEval, while declarative or multi-language teams gain the most from Promptfoo. Once the workflow fits, compare metric needs. If you require named research-backed metrics, DeepEval leads; if you require red teaming and comparison tables, Promptfoo leads.

---

## Conclusion

Promptfoo and DeepEval are both excellent, free, open-source tools that solve overlapping problems from opposite directions. Promptfoo is the declarative, Node-based tool that excels at prompt and model comparison and at red teaming, with config you review like code. DeepEval is the Python metrics library that turns your pytest suite into an LLM evaluation harness with a deep catalog of named metrics and first-class RAG support. Pick by language and workflow first, then by metric and security needs. Many teams run both: Promptfoo for fast comparison and security scanning, DeepEval for code-native metric gates in CI. Explore related tools on our [skills directory](/skills) and keep reading the [blog](/blog) for deeper evaluation guides.
`,
};
