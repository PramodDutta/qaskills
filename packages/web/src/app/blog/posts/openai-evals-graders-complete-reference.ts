import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'OpenAI Evals Graders Complete Reference 2026',
  description:
    'Reference guide to all OpenAI Evals graders in 2026: exact match, regex, includes, model-graded, fact, choice, semantic similarity, and custom Python. With YAML samples and decision tables.',
  date: '2026-05-04',
  category: 'Reference',
  content: `
# OpenAI Evals Graders Complete Reference 2026

The grader is the single most important component of any LLM evaluation. If the grader is wrong, the eval score is wrong, and every decision based on the score is wrong. OpenAI Evals ships a rich library of graders that cover the common cases, from exact string match to model-graded semantic similarity. Choosing the right grader is the difference between an eval that improves your product and one that wastes your time.

This is the complete reference for OpenAI Evals graders in 2026. We cover every built-in grader (exact match, includes, regex, fuzzy match, semantic similarity, model-graded, fact, choice, label, JSON schema, code execution, and custom Python), with YAML configuration samples, when to use each, and when not to. We then cover grader composition, calibration, judge selection, and how to write your own. The goal is that after reading this guide, you can look at any evaluation problem and pick the right grader confidently. Save this page as a reference and use the decision table at the end whenever you start a new eval suite.

## Key Takeaways

- OpenAI Evals provides ten built-in grader types and an extension point for custom Python graders.
- Exact match, regex, and includes are deterministic and cheap; use them when answers are structured.
- Model-graded graders are flexible and handle paraphrase; use them for natural language responses but be aware of judge noise.
- Choose a strong judge model. Anything weaker than GPT-4 produces noisy scores.
- Compose graders for layered evaluation: a deterministic check first, then a model-graded fallback.
- Calibrate graders by reviewing a sample of grader decisions against human judgments.

---

## Why Graders Matter

A grader is a function that takes a test case and a candidate response and returns a score. The score is the eval result. If the grader misjudges, the eval misjudges, and you make wrong decisions about prompts, models, and rollouts.

Choosing the wrong grader is the single most common mistake in LLM evaluation. Teams use exact match where paraphrase is acceptable and end up with low scores that do not reflect quality. They use model-graded where exact match would do and pay for judge calls that add no signal. They use the default judge model without checking calibration and end up with noisy scores.

The right grader matches the task. For deterministic outputs (numbers, IDs, dates, code), use deterministic graders. For natural language, use model-graded with a strong judge. For structured outputs, use schema validation. For long-form responses, decompose into atomic claims and grade each.

---

## Grader 1: Exact Match

Exact match is the simplest grader. The score is 1 if the candidate response equals the expected answer, 0 otherwise.

\`\`\`yaml
graders:
  - id: exact
    type: exact_match
    expected_field: ideal
    response_field: completion
\`\`\`

Use exact match when the answer is a specific token, number, or short phrase. The grader is fast and free; no judge call required.

\`\`\`yaml
test_cases:
  - input: "What is 7 times 8?"
    ideal: "56"
  - input: "Capital of France?"
    ideal: "Paris"
\`\`\`

Pitfalls include whitespace, case, and trailing punctuation. Configure the grader to normalize before comparing.

| Configuration | Behavior |
| --- | --- |
| strip: true | Removes leading/trailing whitespace |
| lower: true | Case-insensitive |
| remove_punct: true | Strips punctuation |

Use exact match for tasks like classification (label match), math (numeric answer), and ID lookup. Avoid it for any task where paraphrase is acceptable.

---

## Grader 2: Includes

The includes grader scores 1 if the expected substring appears anywhere in the response.

\`\`\`yaml
graders:
  - id: includes
    type: includes
    expected_field: must_contain
    case_sensitive: false
\`\`\`

Useful when the response can be wordy but must contain a specific phrase or keyword. For example, a compliance check that the response includes a disclaimer.

\`\`\`yaml
test_cases:
  - input: "What is your return policy?"
    must_contain: "30-day"
\`\`\`

The includes grader is permissive. Combine it with a model-graded check that verifies the rest of the response makes sense.

---

## Grader 3: Regex Match

Regex graders match the response against a regular expression.

\`\`\`yaml
graders:
  - id: regex
    type: regex
    pattern: "^[A-Z]{3}\\\\d{6}$"
\`\`\`

Use regex for structured outputs like IDs, codes, dates, or formats with predictable structure. The grader scores 1 if the regex matches; 0 otherwise.

A common pattern is to extract a substring with a regex group and compare it to the expected value. The OpenAI Evals regex grader supports this via the group parameter.

\`\`\`yaml
graders:
  - id: extract_then_compare
    type: regex
    pattern: "Order ID: (\\\\d+)"
    group: 1
    expected_field: order_id
\`\`\`

Regex graders fail when responses paraphrase. If the model says "the order identifier is" instead of "Order ID is", the regex misses. Use regex when output format is constrained by prompt.

---

## Grader 4: Fuzzy Match

Fuzzy match compares strings allowing for typos and minor variation. The grader scores based on edit distance or similarity ratio.

\`\`\`yaml
graders:
  - id: fuzzy
    type: fuzzy
    threshold: 0.85
    expected_field: ideal
\`\`\`

The threshold determines how similar the strings must be to count as a match. A threshold of 0.85 allows for small variations but catches major differences.

Use fuzzy match when exact match is too strict but model-graded is overkill. Common applications include name matching, address validation, and short responses with predictable variation.

---

## Grader 5: Semantic Similarity

Semantic similarity uses embeddings to compare meaning rather than words.

\`\`\`yaml
graders:
  - id: semantic
    type: semantic_similarity
    embeddings_model: text-embedding-3-small
    threshold: 0.85
    expected_field: ideal
\`\`\`

The grader embeds both strings and computes cosine similarity. If the similarity exceeds the threshold, the score is 1.

Semantic similarity handles paraphrase naturally and is cheaper than model-graded for short comparisons. Use it for response matching where wording can vary but meaning should be preserved.

Pitfalls include high similarity for opposite-meaning statements ("uploads are limited to 100 MB" vs "uploads are not limited to 100 MB"). For high-stakes evaluations, pair semantic similarity with a model-graded check.

---

## Grader 6: Model-Graded

Model-graded graders use an LLM to evaluate the response against a custom prompt.

\`\`\`yaml
graders:
  - id: helpful
    type: model_graded
    model: gpt-4o
    prompt: |
      Evaluate whether the response is helpful, accurate, and complete.
      Question: {{ input }}
      Response: {{ completion }}
      Expected: {{ ideal }}

      Score 1 if the response is helpful, accurate, and addresses the question.
      Score 0 otherwise.
      Return JSON: {"score": 0|1, "reason": "<one-sentence explanation>"}
\`\`\`

Model-graded is the most flexible grader. The judge can score any dimension you can describe in natural language. Use it for long-form responses, paraphrased answers, and dimensions that resist rule-based grading.

The prompt is the contract. A vague prompt produces noisy scores; a specific prompt produces calibrated scores. The prompt should:

- State the task clearly.
- Define each score level with examples.
- Request structured output (JSON).
- Be tested on a calibration set before rollout.

| Judge Model | Cost per 1k tokens | Calibration |
| --- | --- | --- |
| gpt-4o | $$ | Strong default |
| claude-3.5-sonnet | $$ | Equivalent quality |
| gpt-4o-mini | $ | Acceptable for low-stakes |
| gpt-3.5-turbo | cheap | Too noisy for most uses |

Use the strongest judge you can afford. Cost per eval run is typically dominated by the judge, but the cost of a noisy grader is much higher: wrong decisions about prompts and models.

---

## Grader 7: Fact

The fact grader checks specific factual claims in a response against expected facts.

\`\`\`yaml
graders:
  - id: facts
    type: fact
    model: gpt-4o
    expected_facts:
      - "The maximum file size for single uploads is 100 MB"
      - "Multipart uploads support files up to 5 GB"
\`\`\`

The grader extracts atomic claims from the response and checks each against the expected facts. The score is the fraction of expected facts that appear in the response.

Use fact grading when you need partial credit. If a response covers three of five expected facts, the score is 0.6 instead of all or nothing.

---

## Grader 8: Choice

The choice grader evaluates multiple-choice or classification responses.

\`\`\`yaml
graders:
  - id: choice
    type: choice
    choices: ["positive", "negative", "neutral"]
    expected_field: sentiment
\`\`\`

The grader normalizes the response to one of the choices and compares. Configure aliases for common variants.

\`\`\`yaml
graders:
  - id: choice
    type: choice
    choices: ["positive", "negative", "neutral"]
    aliases:
      positive: ["pos", "+", "good"]
      negative: ["neg", "-", "bad"]
\`\`\`

Useful for classification tasks where the model may output variants of the same label.

---

## Grader 9: JSON Schema

The JSON schema grader validates structured outputs against a schema.

\`\`\`yaml
graders:
  - id: schema
    type: json_schema
    schema:
      type: object
      required: ["name", "email", "phone"]
      properties:
        name: { type: string }
        email: { type: string, format: email }
        phone: { type: string, pattern: "^\\\\+?[0-9]{10,15}$" }
\`\`\`

Use JSON schema grading for any task that produces structured output: form filling, data extraction, function calling. The grader scores 1 if the output validates against the schema; 0 otherwise.

Compose schema validation with content checks. Schema verifies structure; a model-graded check verifies content accuracy.

---

## Grader 10: Code Execution

Code execution grading runs the candidate code in a sandbox and checks the output.

\`\`\`yaml
graders:
  - id: code
    type: code_exec
    runtime: python
    timeout: 5
    expected_field: expected_output
    test_inputs_field: test_inputs
\`\`\`

Use for code generation tasks. The grader executes the generated code with the provided test inputs and compares the output to the expected output.

The sandbox isolates execution to protect against malicious or buggy code. Set a tight timeout to catch infinite loops.

---

## Grader 11: Custom Python

The framework supports custom graders written in Python.

\`\`\`python
from openai_evals import Grader, Result

class CitationGrader(Grader):
    def grade(self, case, response):
        citations = response.count("[")
        if citations >= case.get("min_citations", 1):
            return Result(score=1)
        return Result(score=0, reason="No citations")
\`\`\`

Register the grader in the YAML.

\`\`\`yaml
graders:
  - id: citations
    type: python
    path: graders/citation_grader.py
\`\`\`

Use custom graders for domain-specific logic that does not fit other types. Examples include compliance checks, business rules, and integration with your own systems.

---

## Composing Graders

A single eval can use multiple graders. Each grader runs independently and contributes to the overall score.

\`\`\`yaml
graders:
  - id: schema_check
    type: json_schema
    schema: { ... }
  - id: content_check
    type: model_graded
    prompt: "Is the JSON content factually correct?"
  - id: latency
    type: python
    path: graders/latency.py
\`\`\`

Common composition patterns:

A cheap deterministic check first, then a model-graded check only if the deterministic check passes. This saves judge calls.

A schema check for structure plus a model-graded check for content accuracy. The two cover different failure modes.

Multiple model-graded checks for different dimensions (helpfulness, safety, tone). Each dimension gets its own score.

| Pattern | When to Use |
| --- | --- |
| Schema + content | Structured outputs with content requirements |
| Cheap + expensive | Cost optimization for large suites |
| Multi-dimensional | Responses scored on multiple axes |
| Primary + fallback | Hard tests with soft confirmations |

---

## Calibrating Graders

Every grader needs calibration before you trust its scores. The process:

Sample 50 to 100 responses from your system.

Have a human label each response with a 0 or 1 score.

Run the grader on the same responses.

Compute agreement between human and grader.

Iterate on the grader prompt or configuration until agreement exceeds 90 percent.

Without calibration, you do not know whether the grader measures quality or measures noise. Calibration is one-time work that pays off across every future eval run.

---

## Judge Model Selection

For model-graded graders, the judge model matters as much as the grader prompt.

Use the strongest judge you can afford. GPT-4o, Claude 3.5 Sonnet, and Gemini 1.5 Pro are the current options for high-quality grading. Cheaper models like GPT-3.5 or open-source 7B models are usually too noisy.

Set temperature zero on the judge. Stochastic judges produce different scores on different runs, which makes regressions hard to detect.

Limit judge tokens. Long judge prompts waste money without improving signal. Most graders work with fewer than 2000 input tokens.

Run a smoke test on every new judge. Different models calibrate differently; a prompt that scores well on GPT-4 may score differently on Claude. Re-calibrate when changing judges.

---

## Grader Decision Table

| Output Type | Recommended Grader |
| --- | --- |
| Single number or label | Exact match |
| Specific phrase must appear | Includes |
| Structured ID or format | Regex |
| Short answer with minor variation | Fuzzy match |
| Natural language with paraphrase | Semantic similarity or model-graded |
| Long-form response | Model-graded |
| Multiple facts to verify | Fact grader |
| Multiple-choice answer | Choice |
| JSON or structured data | JSON schema + model-graded content |
| Generated code | Code execution |
| Domain-specific business rule | Custom Python |

---

## Common Pitfalls

Using exact match where paraphrase is acceptable. The model gives a correct answer in different words, the grader gives 0, and the score drops.

Using a weak judge model. GPT-3.5 or similar produces noisy model-graded scores. Use GPT-4 or equivalent.

Skipping calibration. Graders that are not calibrated against human judgments may measure noise instead of quality.

Vague grader prompts. The prompt is the contract; if it does not state the criteria clearly, the judge guesses.

Single-grader evals. Multiple graders catch different failure modes. Composing graders is usually better than one perfect grader.

---

## Further Resources

- OpenAI Evals 2026 documentation and source.
- Eval design best practices on /blog.
- LLM evaluation skills directory at /skills.

---

## Conclusion

Choosing the right grader is the foundation of useful LLM evaluation. Use the decision table to match your output type to a grader, calibrate the grader against human judgments, and compose graders when multiple dimensions matter. Once your graders are reliable, your eval scores become a trustworthy signal for prompt and model decisions. For more on eval design, see [/blog](/blog) and browse the [/skills](/skills) directory.
`,
};
