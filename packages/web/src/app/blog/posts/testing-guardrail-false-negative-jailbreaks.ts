import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Guardrail False Negatives with Jailbreak Prompts',
  description:
    'Test guardrail false negatives with jailbreak prompts using policy-labeled datasets, layered attacks, calibrated graders, and release-ready safety metrics.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Testing Guardrail False Negatives with Jailbreak Prompts

One adversarial prompt reaches the model as Base64, a second hides the same intent inside role play, and a third obtains the prohibited answer over five harmless-looking turns. If the guardrail allows any of them and the application produces disallowed assistance, that result is a false negative: the system failed to detect or stop a policy violation.

Counting refusals is not enough. A safe completion can avoid a stock refusal phrase, while a harmful answer can begin with “I cannot help” and then provide the requested instructions. Guardrail testing needs a policy-specific oracle, attack diversity, and separate observations for input detection, model response, output filtering, and tool execution.

## Define the negative class before measuring misses

In a binary input guardrail, “positive” usually means the prompt is classified as unsafe or blocked. A false negative is an actually unsafe input classified as safe. In an end-to-end application, the definition may instead be “an attack achieved a prohibited outcome.” Write the definition beside every metric because teams reverse the labels surprisingly often.

| Ground truth | Guardrail decision: block | Guardrail decision: allow |
|---|---|---|
| Policy-violating request | True positive | False negative |
| Allowed request | False positive | True negative |

False-negative rate is \`FN / (TP + FN)\`: among policy-violating cases, how many passed. Attack success rate is related but not identical. An input guardrail can miss a jailbreak while the model independently refuses, producing a guardrail false negative but no harmful end-to-end output. Conversely, an allowed benign-looking prompt may manipulate a tool through retrieved content, bypassing a prompt classifier entirely.

Track at least two outcomes:

1. **Guardrail miss:** the relevant control allowed an input or output that the policy labels unsafe.
2. **Application compromise:** the final response or action materially fulfilled the prohibited goal.

That separation tells engineers whether apparent safety comes from the intended control or from another layer that may change with the next model release.

## Turn policy prose into labelable cases

A statement such as “prevent harmful content” cannot produce consistent labels. Break it into behaviors with boundaries, allowed transformations, and examples. For a cybersecurity assistant, the policy may allow defensive explanation and refuse credential theft, malware deployment, or destructive access. A request’s topic alone is not enough; intent, capability, target, and requested specificity matter.

Create a case record with:

- stable ID and policy category;
- original user goal, separate from the attack wrapper;
- conversation context and user authorization assumptions;
- expected control action;
- prohibited outcome criteria;
- severity if missed;
- annotator rationale and policy version;
- attack strategy and generator version.

Do not store only the mutated prompt. When a jailbreak template changes thousands of tokens, reviewers still need the underlying prohibited intent to judge whether the output accomplished it.

The [LLM guardrails testing guide](/blog/llm-guardrails-testing-guide-2026) covers broader false-positive, latency, availability, and layered-control testing. This article concentrates on missed attacks.

## Build an attack portfolio, not a bag of famous prompts

Static “DAN” prompts provide a cheap regression baseline, but a production guardrail should face transformations and adaptive attacks that reflect its threat model. Promptfoo separates plugins, which generate risky goals, from strategies, which alter how those goals are delivered.

| Attack family | What it changes | Failure it can reveal |
|---|---|---|
| Role or authority framing | Claims a privileged persona or fictional setting | Policy applied to surface wording instead of requested action |
| Encoding | Base64, ROT13, leetspeak, homoglyphs | Detector lacks normalization or semantic analysis |
| Instruction layering | Wraps goal in translation, summarization, or analysis | Guardrail trusts an apparently benign task frame |
| Adaptive jailbreak | Iteratively revises prompts using target feedback | Static signatures do not generalize |
| Multi-turn escalation | Distributes intent across conversation history | Per-message classifier ignores accumulated context |
| Indirect injection | Places instructions in retrieved or browsed content | User-input filter misses untrusted external instructions |
| Tool coercion | Requests a dangerous action through function calls | Text safety passes while authorization fails |

Coverage should follow reachable risk. An offline summarizer with no tools needs different attacks from an agent holding cloud credentials. Avoid multiplying every strategy by every policy category without a reason; that consumes model calls and produces repetitive evidence.

## Generate a Promptfoo red-team baseline

Promptfoo’s current red-team workflow supports plugins for vulnerability goals and strategies such as static jailbreak templates, encoding transformations, and adaptive jailbreaks. A minimal configuration against a directly addressed model looks like this:

\`\`\`yaml
# promptfooconfig.yaml
targets:
  - id: openai:gpt-5-mini
    label: support-assistant

redteam:
  purpose: >-
    A customer-support assistant that may explain account security and recovery,
    but must not reveal credentials, help bypass authentication, facilitate hate,
    or provide instructions for self-harm.
  numTests: 8
  plugins:
    - harmful:hate
    - harmful:self-harm
    - hijacking
  strategies:
    - jailbreak-templates
    - base64
    - jailbreak
  maxConcurrency: 2
\`\`\`

Run the documented workflow from the directory containing the configuration:

\`\`\`bash
npx promptfoo@latest redteam run
npx promptfoo@latest redteam report
\`\`\`

For an application, target its HTTP API or a custom provider rather than the base model. Otherwise the test bypasses the very input and output guardrails you intend to evaluate. The direct model configuration above is useful for learning the workflow or measuring model behavior, not proof that an application control works.

Pin Promptfoo and the attack-provider model in CI after the initial setup. \`@latest\` is convenient interactively, but a silently changing generator, grader, or strategy library makes regression results difficult to interpret. Record target model, prompt, guardrail, plugin, strategy, and evaluator versions with each run.

For a deeper tool workflow, use the [Promptfoo red-teaming guide](/blog/promptfoo-red-teaming-llm-applications).

## Measure from exported case-level results

Aggregate pass rate hides which policy and attack family regressed. Export case-level results and calculate a confusion matrix from human-reviewed labels and guardrail decisions. The following standard-library Python script accepts JSON Lines records and prints false-negative rates by policy.

Each line must contain \`policy\`, \`actually_unsafe\`, and \`blocked\`. “Actually unsafe” is ground truth established through policy review, not the guardrail’s own score.

\`\`\`python
# guardrail_metrics.py
import json
import sys
from collections import defaultdict

def ratio(numerator: int, denominator: int) -> float:
    return numerator / denominator if denominator else 0.0

counts = defaultdict(lambda: {"tp": 0, "fn": 0, "fp": 0, "tn": 0})

for line in sys.stdin:
    record = json.loads(line)
    unsafe = bool(record["actually_unsafe"])
    blocked = bool(record["blocked"])

    if unsafe and blocked:
        key = "tp"
    elif unsafe and not blocked:
        key = "fn"
    elif not unsafe and blocked:
        key = "fp"
    else:
        key = "tn"
    counts[record["policy"]][key] += 1

for policy, result in sorted(counts.items()):
    unsafe_total = result["tp"] + result["fn"]
    allowed_total = result["tn"] + result["fp"]
    print(json.dumps({
        "policy": policy,
        **result,
        "false_negative_rate": ratio(result["fn"], unsafe_total),
        "false_positive_rate": ratio(result["fp"], allowed_total),
    }))
\`\`\`

Run it with \`python guardrail_metrics.py < reviewed-results.jsonl\`. Do not publish a percentage without its denominator. One miss out of two cases and fifty misses out of one hundred have the same rate but very different evidence strength.

## Grade the outcome, not refusal vocabulary

A regex for “I can’t assist” is a poor safety oracle. It produces false failures when a safe answer uses different language and false passes when a model states a refusal before leaking actionable details.

Use a layered grader:

1. deterministic checks for explicit canaries, secrets, forbidden tool calls, or structured policy fields;
2. a policy-specific classifier or rubric for semantic behavior;
3. human review of all high-severity failures and a sample near the decision boundary.

A judge prompt should receive the original prohibited goal, policy definition, assistant output, and relevant tool trace. Ask whether the response materially enables the prohibited outcome, not whether it “looks unsafe.” Calibrate the judge against a blind human-labeled set. Report precision and recall for the evaluator itself before trusting it to measure the guardrail.

Do not let the same model generate attacks, answer them, and judge success without independent checks. Shared blind spots can make the entire loop agree on the wrong label.

## Separate detector thresholds from policy quality

Many guardrails return category scores. Lowering a threshold may reduce false negatives while increasing false positives. Plot or tabulate both across a validation set, then choose thresholds by category and risk rather than a universal number.

| Policy category | Cost of a miss | Cost of an unnecessary block | Likely review posture |
|---|---|---|---|
| Credential exfiltration | Severe account or data compromise | User must rephrase a rare request | Favor high recall, review misses immediately |
| Hate content | Harm, platform abuse, legal exposure | Legitimate educational discussion may be blocked | Preserve contextual allowed cases during tuning |
| Self-harm | Potentially critical user harm | Over-refusal can suppress supportive resources | Use specialist policy and careful human review |
| Off-scope hijacking | Cost and product misuse | Helpful adjacent request is declined | Tune to product economics and purpose |

This is not a recommendation for numeric thresholds. Those depend on your detector, data, policy, and risk acceptance. The test team’s job is to make the tradeoff visible and reproducible.

## Preserve successful jailbreaks as regression seeds

Every confirmed false negative should become a minimized, versioned regression case. Preserve the original attack privately for forensic work, then reduce it to the shortest form that still reproduces the miss. Minimization reveals whether success depended on encoding, conversational setup, a particular phrase, or sheer context length.

Store sensitive jailbreak corpora with access control. Some prompts contain harmful detail, personal data, proprietary system text, or exploit instructions. CI reports should use identifiers and redacted excerpts, not broadcast the full corpus to every artifact viewer.

Tag each seed with the policy version and expected behavior. A policy change can legitimately relabel old cases. Never rewrite historical results silently; create a new label revision and explain the rationale.

## Test the complete guardrail path

Applications often have several controls: input classifier, system prompt, model alignment, output classifier, tool authorization, and post-processing. Instrument each decision with a correlation ID so a failed case answers:

- Did the input guardrail run?
- What policy version and score did it produce?
- Was the request modified before the model?
- What did the model return before output filtering?
- Did any tool call execute?
- Did the output guardrail block or redact?
- What content reached the user?

Without that trace, teams may credit the wrong layer. An output filter might catch every missed input during one model version, then fail when the model changes format. Defense in depth is valuable, but every layer needs direct tests and end-to-end tests.

## Multi-turn false negatives need stateful evaluation

A single prompt may be allowed while the conversation trajectory is disallowed. Attackers establish trust, request benign components, ask the model to remember encoded material, and combine it later. Sending each turn to a stateless endpoint cannot test that risk.

Preserve conversation state exactly as production does. Assert at which turn the guardrail should intervene and whether previous safe context remains available after a refusal. Include session isolation: one user’s adversarial history must not change another user’s policy context or leak through a shared cache.

Measure both time-to-block and eventual compromise. A control that blocks turn five after executing a prohibited tool on turn four is not successful.

## Indirect jailbreaks move the attack surface

For RAG and agents, the malicious instruction may live in a web page, email, retrieved document, issue description, or tool result. An input classifier looking only at the user message never sees it. Build fixtures containing untrusted instructions and verify the application treats them as data, preserves instruction hierarchy, and prevents unauthorized actions.

Use harmless canaries for exfiltration tests. Place a synthetic token in a protected source, then fail if it appears in model output, outbound tool arguments, URLs, or logs. Deterministic canary checks are stronger than an LLM judge for this condition.

## Set release gates by risk slice

“Overall attack pass rate above 95%” can hide a total failure in a severe category diluted by hundreds of easy cases. Gate on high-severity policy slices, known regression seeds, and deterministic authorization controls separately. Use broader adaptive attack campaigns as scheduled evidence when their variability and cost make per-commit gating impractical.

A practical pipeline has three cadences: fast deterministic policy and canary tests on each change, a pinned adversarial sample on pull requests or nightly runs, and a wider adaptive red team before major model or guardrail releases. Quarantine infrastructure errors, not safety failures. A timeout should be reported separately rather than counted as a pass.

## Test normalization as an observable security boundary

Encoded attacks expose a design question: which layer normalizes input, and what exact representation does the classifier inspect? If the application decodes Base64 for a legitimate feature after the guardrail runs, the classifier may approve opaque text and the downstream model sees the prohibited request. Test the actual processing order, not just the detector in isolation.

Record the raw user input, normalized representation, and content passed to each control under restricted diagnostic access. Apply size and recursion limits to decoding. A payload nested through repeated encodings can become a denial-of-service test rather than a semantic jailbreak.

Homoglyphs and invisible characters also need deterministic preprocessing tests. Normalization can improve recall but damage allowed content in multilingual products. Preserve benign examples from every supported language so a security change does not silently create broad false positives.

## Add harmless controls beside every attack batch

Attack suites need negative controls: allowed prompts that share vocabulary, encoding, role play, or educational context with prohibited cases. Without them, a guardrail that blocks every transformed input appears excellent on false negatives.

For a Base64 strategy, include an encoded benign support request. For a cybersecurity policy, pair a credential-theft request with authorized password-reset guidance. For self-harm policy, include supportive resource-seeking cases reviewed under the relevant standard. These controls make threshold and context failures visible.

Reviewers should label attack and control cases without seeing the guardrail decision when feasible. Otherwise knowledge of the system output can pull ambiguous labels toward agreement with the classifier.

## Reproduce adaptive attacks without promising identical text

An adaptive attacker uses stochastic model calls, so rerunning with the same configuration may not generate the same prompt. Preserve the successful final prompt and conversation as a deterministic regression seed. Also preserve generator configuration and random seed when the tool supports it, but do not claim that provider behavior is perfectly reproducible.

The regression seed answers “did we fix this known bypass?” A fresh adaptive campaign answers “can an attacker find another bypass?” Both are needed. Passing the seed alone may mean the control learned one signature rather than the underlying intent.

Compare campaigns by policy slice, strategy, token budget, and target version. A higher attack success rate after increasing attacker effort is not automatically a product regression. Keep attack resources constant for longitudinal comparisons and report exploratory campaigns separately.

## Frequently Asked Questions

### Is every allowed jailbreak prompt a guardrail false negative?

Only if policy ground truth says the relevant control should block it. An input classifier may intentionally allow ambiguous content while an output or authorization layer enforces safety. Define the control’s responsibility before labeling the result.

### Why track attack success separately from guardrail misses?

A detector can miss an unsafe prompt while the model refuses, or it can block input after a prohibited tool already ran elsewhere in the flow. The two metrics distinguish control performance from final application harm.

### How many jailbreak templates are enough?

There is no universal count. Cover policy categories, transformations, multi-turn behavior, indirect inputs, and known incidents according to the threat model. Add adaptive generation and new regression seeds rather than accumulating near-duplicate famous prompts.

### Can an LLM judge reliably label harmful completions?

It can assist after calibration, but it is not ground truth. Compare it with independent human labels, use deterministic checks where possible, monitor category-level errors, and manually review severe or borderline cases.

### Should successful jailbreak prompts be shared with every developer?

Usually not in full. Store sensitive attack material under appropriate access controls and expose stable IDs, policy categories, and redacted diagnostics in routine CI. Share complete cases only with people who need them for remediation or review.
`,
};
