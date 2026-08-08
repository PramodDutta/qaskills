import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LLM Eval Multilingual Quality Parity: A Harness for Finding Language Gaps',
  description: 'Build an LLM eval multilingual quality parity harness with locale slices, calibrated rubrics, Unicode checks, confidence intervals, and actionable CI gates.',
  date: '2026-08-08',
  category: 'AI Testing',
  content: `
# LLM Eval Multilingual Quality Parity: A Harness for Finding Language Gaps

An **LLM eval multilingual quality parity** program measures whether users receive comparably correct, safe, useful, and format-compliant answers across supported languages. The practical method is to create aligned test items, score each locale on the same underlying intent, calculate the gap from a declared reference locale, and inspect language-specific error slices. Parity is not proven by translating ten English prompts and averaging every answer into one number.

The payoff is an evaluation harness that can tell a release team exactly what regressed: Arabic tool arguments, Japanese honorific tone, Hindi factual grounding, German instruction adherence, or Spanish refusal overreach. It separates model quality from translation quality, Unicode handling, retrieval coverage, and judge bias. That diagnosis is what makes the result useful to QA engineers and AI coding agents.

This guide focuses on concrete TypeScript workflows that can run against any HTTP model gateway. For broader multi-step behavior, failure recovery, and tool-use test design, see the [agentic AI testing guide for 2026](/blog/agentic-ai-testing-guide-2026). When language parity failures appear only after tools are discovered or invoked, use the [MCP servers test automation guide for 2026](/blog/mcp-servers-test-automation-2026) to isolate the protocol layer.

## Define parity as a bounded gap, not identical wording

Quality parity does not mean every language produces the same sentence structure or even the same length. A concise Japanese support answer and a more explicit German answer can both satisfy the same intent. Define a score vector for properties that should transfer across languages, then set an acceptable gap from a reference locale for each property.

Let \`score(language, dimension)\` be a value from 0 to 1. Let English be the reference only if product data and staffing justify that choice. A simple parity gap is:

\`gap(language, dimension) = score(reference, dimension) - score(language, dimension)\`

A positive gap indicates the target language trails the reference. A negative gap indicates it leads. Do not take the absolute value unless your policy truly treats better target-language performance as a defect. Report both the target score and gap because a tiny gap between two poor scores is not success.

| Dimension | What remains invariant | What may vary naturally | Useful evidence |
| --- | --- | --- | --- |
| Task correctness | facts, selected action, computed result | phrasing and explanation order | deterministic oracle or expert rating |
| Instruction following | required fields, constraints, requested language | politeness conventions | structural checks plus rubric |
| Safety | prohibited assistance boundary | culturally natural refusal wording | policy label and explanation quality |
| Grounding | claims supported by supplied context | citation placement conventions | claim-to-source review |
| Locale quality | appropriate language and script | region-specific vocabulary | native-speaker assessment |
| Tool use | tool name, argument semantics | user-facing narration | captured call trace |

Use separate release thresholds by dimension. A severe safety gap should not be averaged away by excellent style. Likewise, a JSON-schema failure that breaks downstream automation deserves a hard gate even when human raters like the prose.

## Build a locale matrix that reflects real product traffic

Language codes are not a sufficient coverage model. Locale, script, direction, user intent, and input mode can each expose different failures. \`pt-BR\` and \`pt-PT\` share a language but differ in vocabulary and conventions. Serbian may use Latin or Cyrillic. Arabic introduces right-to-left display concerns while still embedding left-to-right numbers, URLs, and code.

Start with BCP 47 language tags and record the exact product locale. Unicode CLDR describes language and locale identifiers at https://unicode.org/reports/tr35/. Keep the test matrix readable and make every row earn its place through traffic, risk, contractual support, or a known model weakness.

| Slice axis | Example values | Defect it can expose | Sampling guidance |
| --- | --- | --- | --- |
| Locale | \`en-US\`, \`es-MX\`, \`pt-BR\` | wrong regional terminology | cover supported product locales |
| Script | \`sr-Latn\`, \`sr-Cyrl\` | transliteration or script drift | pair the same intent across scripts |
| Direction | LTR, RTL, mixed | corrupted citations or punctuation | include URLs, IDs, and numbers |
| Input style | formal, colloquial, typo-heavy | brittle intent recognition | derive from consented real patterns |
| Task family | summarize, classify, extract, advise | uneven capability distribution | stratify, do not random-mix only |
| Risk tier | ordinary, sensitive, prohibited | inconsistent safety boundaries | oversample high-impact cases |

Do not allocate an equal item count merely because it is easy. A supported locale with payment, medical, or account-recovery flows can deserve more high-risk coverage than a high-volume but low-risk FAQ language. Record the rationale in the dataset manifest.

## Author aligned items without turning translation into the oracle

An aligned item represents the same semantic task across locales. It does not have to be a literal translation. Literal translation can import English idioms, unnatural names, irrelevant institutions, or grammatical clues that make one variant easier. Use a source intent specification, then have qualified speakers adapt prompts while preserving the required facts and constraints.

Store the invariant separately from the localized prompt. JSON Lines works well for review and sharding. The following three records are illustrative fixtures for a deterministic extraction task. Each line is valid JSON and can be saved as \`eval-items.jsonl\`.

\`\`\`json
{"caseId":"refund-001","locale":"en-US","family":"extraction","prompt":"Return JSON with orderId and requestedAction from: Please cancel order A-104.","expected":{"orderId":"A-104","requestedAction":"cancel"}}
{"caseId":"refund-001","locale":"es-MX","family":"extraction","prompt":"Devuelve JSON con orderId y requestedAction a partir de: Por favor cancela el pedido A-104.","expected":{"orderId":"A-104","requestedAction":"cancel"}}
{"caseId":"refund-001","locale":"ar-EG","family":"extraction","prompt":"أعد JSON يحتوي على orderId و requestedAction من: يرجى إلغاء الطلب A-104.","expected":{"orderId":"A-104","requestedAction":"cancel"}}
\`\`\`

Notice that schema keys and enum values remain stable because the downstream interface requires them. The natural-language request changes; the machine contract does not. If the application expects localized enum values instead, state that in the invariant rather than letting a judge guess.

Review aligned sets in groups by \`caseId\`. Ask reviewers to check semantic equivalence, naturalness, difficulty, and local appropriateness as separate questions. A translation can be faithful but awkward; an adaptation can be natural but easier because it accidentally gives away the answer.

## Validate the dataset before spending model calls

Dataset defects create false model regressions. Validate unique locale keys, supported tags, required pairs, and expected-output shape before running an evaluation. This dependency-free TypeScript validator reads the JSONL fixture and fails with actionable messages.

\`\`\`typescript
import { readFile } from "node:fs/promises";

type Item = {
  caseId: string;
  locale: string;
  family: string;
  prompt: string;
  expected: { orderId: string; requestedAction: string };
};

function isItem(value: unknown): value is Item {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  const expected = item.expected;
  return (
    typeof item.caseId === "string" &&
    typeof item.locale === "string" &&
    typeof item.family === "string" &&
    typeof item.prompt === "string" &&
    typeof expected === "object" &&
    expected !== null &&
    typeof (expected as Record<string, unknown>).orderId === "string" &&
    typeof (expected as Record<string, unknown>).requestedAction === "string"
  );
}

const text = await readFile("eval-items.jsonl", "utf8");
const lines = text.split(/\\r?\\n/).filter((line) => line.trim() !== "");
const items = lines.map((line, index) => {
  const parsed: unknown = JSON.parse(line);
  if (!isItem(parsed)) throw new Error(\`Invalid item on line \${index + 1}\`);
  return parsed;
});

const keys = new Set<string>();
for (const item of items) {
  const key = \`\${item.caseId}:\${item.locale}\`;
  if (keys.has(key)) throw new Error(\`Duplicate item \${key}\`);
  keys.add(key);
  if (Intl.getCanonicalLocales(item.locale).length !== 1) {
    throw new Error(\`Invalid locale tag \${item.locale}\`);
  }
}

console.log(\`Validated \${items.length} multilingual items\`);
\`\`\`

\`Intl.getCanonicalLocales\` checks whether the runtime accepts and canonicalizes a tag. It does not prove that your product supports the locale or that the dataset uses the intended region. Maintain an explicit supported-locale allowlist as a separate product check.

What people get wrong here is normalizing every prompt before preserving the original. Unicode normalization is useful for controlled comparisons, but the raw input may reveal a real boundary defect. Save both the original and any normalized derivative, and never use compatibility normalization blindly when distinctions can be meaningful. Unicode Standard Annex #15 explains NFC, NFD, NFKC, and NFKD at https://www.unicode.org/reports/tr15/.

## Capture responses and traces with a model-neutral runner

Evaluation input, model configuration, output, latency, and tool trace must be addressable by a run ID. Without those fields, a failed Arabic item becomes a screenshot rather than reproducible evidence. The gateway contract below is intentionally small: POST a prompt and locale, receive text plus optional tool calls.

Save this as \`run-eval.ts\`. It uses Node's built-in \`fetch\` and the validated JSONL structure. The example assumes your authorized test gateway implements \`POST /generate\` with the shown response shape.

\`\`\`typescript
import { appendFile, readFile } from "node:fs/promises";

type EvalItem = {
  caseId: string;
  locale: string;
  family: string;
  prompt: string;
  expected: Record<string, unknown>;
};

type GatewayResponse = {
  text: string;
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }>;
};

const baseUrl = process.env.MODEL_GATEWAY_URL;
if (baseUrl === undefined) throw new Error("MODEL_GATEWAY_URL is required");

const input = await readFile("eval-items.jsonl", "utf8");
const items = input
  .split(/\\r?\\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line) as EvalItem);

for (const item of items) {
  const startedAt = Date.now();
  const response = await fetch(new URL("/generate", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: item.prompt, locale: item.locale }),
  });
  if (!response.ok) throw new Error(\`Gateway returned \${response.status}\`);
  const output = (await response.json()) as GatewayResponse;
  const record = {
    runId: process.env.RUN_ID ?? "local",
    ...item,
    output,
    latencyMs: Date.now() - startedAt,
  };
  await appendFile("eval-results.jsonl", JSON.stringify(record) + "\\n", "utf8");
}
\`\`\`

Use a fixed model snapshot and decoding configuration when the provider supports them. Record the actual resolved model identifier returned by your gateway. If deterministic seeding is unavailable, repeat items and report the distribution. Never fabricate a seed parameter for an API that does not document one.

Run locales in interleaved order rather than completing English first and Arabic hours later. Interleaving reduces confounding from transient deployments, retrieval changes, rate limits, or service incidents. Preserve the item order in a manifest so a rerun can replay the same schedule.

## Score deterministic contracts before asking a judge model

Machine-checkable properties are cheaper, more repeatable, and easier to diagnose than subjective judging. For the extraction fixture, parse JSON, require exact stable keys, compare the order ID, and compare the action enum. Do not award full credit to prose that merely mentions the correct order when the application requires JSON.

\`\`\`typescript
type Expected = { orderId: string; requestedAction: string };
type Score = { validJson: number; schema: number; semantics: number };

export function scoreExtraction(text: string, expected: Expected): Score {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { validJson: 0, schema: 0, semantics: 0 };
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { validJson: 1, schema: 0, semantics: 0 };
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const schema =
    JSON.stringify(keys) === JSON.stringify(["orderId", "requestedAction"]) &&
    typeof record.orderId === "string" &&
    typeof record.requestedAction === "string"
      ? 1
      : 0;
  const semantics =
    record.orderId === expected.orderId &&
    record.requestedAction === expected.requestedAction
      ? 1
      : 0;
  return { validJson: 1, schema, semantics };
}

const example = scoreExtraction(
  '{"orderId":"A-104","requestedAction":"cancel"}',
  { orderId: "A-104", requestedAction: "cancel" },
);
console.log(example);
\`\`\`

Keep dimensions separate in stored results even if the dashboard later presents a composite. A localized key such as \`identificadorPedido\` is semantically understandable to a human yet fails the declared interface. That is a schema defect, not a translation-quality defect.

For classification, calculation, citation IDs, tool names, and argument types, write similarly narrow oracles. Use a judge only for properties such as completeness, tone, unsupported claims, nuanced safety, or linguistic naturalness.

## Design rubrics that a bilingual reviewer can actually apply

A rubric should define observable anchors, not ask whether an answer is "good." Present the source context, localized prompt, invariant, and model answer. Hide the model name and candidate order where practical. Require the reviewer to select an error category and cite a span or missing element.

| Score | Correctness anchor | Locale-quality anchor | Release interpretation |
| --- | --- | --- | --- |
| 0 | wrong action or central fact | wrong language or unintelligible | blocking |
| 1 | major omission changes outcome | pervasive grammar or region mismatch | blocking |
| 2 | mostly correct, one material defect | understandable but clearly unnatural | investigate |
| 3 | correct with minor non-blocking issue | natural with minor imperfection | acceptable by policy |
| 4 | fully correct and complete | natural for declared locale | target |

The numeric labels are an illustrative scale. Calibrate reviewers on examples before the real batch. Include disagreements in the data rather than forcing silent consensus. Review a shared overlap set per language, discuss category boundaries, then freeze the rubric for the release comparison.

An LLM judge can triage volume, but validate it against qualified human ratings in every supported language where it is used. A judge may prefer verbose answers, penalize dialects, miss code-switching, or give higher ratings to outputs in its strongest language. Run position-swapped comparisons and include known-good and known-bad anchors. If judge agreement collapses in one locale, treat the judge as the suspect until human review says otherwise.

## Calculate parity with paired items and uncertainty

Aligned items enable paired analysis. If case \`refund-001\` is easy in all locales while \`tax-014\` fails only in \`fr-CA\`, the pair tells you more than independent random samples. Calculate per-locale means, reference gaps, and a confidence interval over paired case differences.

The dependency-free bootstrap below uses an explicit seeded pseudo-random generator so CI reruns are stable. The iteration count and 95 percent interval are illustrative evaluation choices, not universal guarantees.

\`\`\`typescript
type Pair = { reference: number; target: number };

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function pairedGapInterval(
  pairs: Pair[],
  iterations = 5000,
  seed = 20260808,
): { meanGap: number; low: number; high: number } {
  if (pairs.length === 0) throw new Error("At least one pair is required");
  const random = mulberry32(seed);
  const differences = pairs.map((pair) => pair.reference - pair.target);
  const mean = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const sampledMeans: number[] = [];

  for (let i = 0; i < iterations; i += 1) {
    const sample = Array.from(
      { length: differences.length },
      () => differences[Math.floor(random() * differences.length)],
    );
    sampledMeans.push(mean(sample));
  }
  sampledMeans.sort((a, b) => a - b);
  return {
    meanGap: mean(differences),
    low: sampledMeans[Math.floor(iterations * 0.025)],
    high: sampledMeans[Math.floor(iterations * 0.975)],
  };
}

console.log(
  pairedGapInterval([
    { reference: 1, target: 1 },
    { reference: 1, target: 0 },
    { reference: 0, target: 0 },
    { reference: 1, target: 1 },
  ]),
);
\`\`\`

Do not interpret a wide interval as proof of parity. It means the sample is too uncertain for a strong claim. Add targeted cases based on risk and observed variance, not arbitrary padding. Report the item count with every interval.

## Gate releases on slices without creating a flake machine

A release gate should combine hard invariants and statistical review bands. Hard fail on invalid tool names, prohibited-content violations, or broken schemas when the product contract allows no exceptions. For noisy rubric dimensions, fail only when the paired gap crosses a predeclared boundary with sufficient evidence, and route borderline movement to review.

An illustrative policy might look like this:

| Condition | Outcome | Owner action |
| --- | --- | --- |
| Any critical safety violation | fail | policy and model review |
| JSON validity below declared floor | fail | prompt or model regression diagnosis |
| Gap interval entirely above 0.08 | fail | language owner investigates |
| Interval overlaps 0.08 | review | expand or manually adjudicate sample |
| Target beats reference | pass, inspect | learn whether reference also needs improvement |

The \`0.08\` boundary is illustrative. Choose thresholds from user impact and historical measurement reliability before seeing the candidate results. Moving a threshold after a failed run destroys the meaning of the gate.

\`\`\`typescript
type GateInput = {
  criticalViolations: number;
  jsonValidity: number;
  gapLow: number;
  gapHigh: number;
};

export function releaseDecision(input: GateInput): "pass" | "review" | "fail" {
  const illustrativeGapLimit = 0.08;
  const illustrativeJsonFloor = 0.98;
  if (input.criticalViolations > 0) return "fail";
  if (input.jsonValidity < illustrativeJsonFloor) return "fail";
  if (input.gapLow > illustrativeGapLimit) return "fail";
  if (input.gapHigh > illustrativeGapLimit) return "review";
  return "pass";
}

console.log(
  releaseDecision({
    criticalViolations: 0,
    jsonValidity: 0.99,
    gapLow: 0.02,
    gapHigh: 0.06,
  }),
);
\`\`\`

Version the dataset, rubric, judge prompt, deterministic scorers, locale resources, model configuration, and aggregation code together. A result is comparable only when the measurement system is stable or the change is explicitly analyzed.

## Exercise Unicode, mixed direction, and segmentation as metamorphic tests

Some multilingual failures happen before inference or after generation. A gateway truncates by UTF-16 code unit, a sanitizer removes combining marks, a database changes normalization, or a UI reverses an embedded order ID. Add metamorphic cases that preserve semantic intent while changing representation.

Useful transformations include NFC versus NFD for canonically equivalent text, extra non-semantic whitespace where appropriate, mixed-script identifiers that must remain exact, and RTL text containing ASCII IDs. Do not expect NFKC to preserve every meaningful distinction. Test the normalization policy the product actually declares.

\`\`\`typescript
import { describe, expect, it } from "vitest";

function extractOrderId(text: string): string | undefined {
  return /A-[0-9]{3}/u.exec(text)?.[0];
}

describe("multilingual text boundaries", () => {
  it("keeps canonical equivalents equal after NFC", () => {
    const composed = "Café";
    const decomposed = "Cafe\\u0301";
    expect(composed).not.toBe(decomposed);
    expect(composed.normalize("NFC")).toBe(decomposed.normalize("NFC"));
  });

  it("extracts an ASCII order ID from Arabic context", () => {
    const prompt = "يرجى إلغاء الطلب A-104 اليوم";
    expect(extractOrderId(prompt)).toBe("A-104");
  });

  it("counts user-perceived emoji as one segment", () => {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    expect(Array.from(segmenter.segment("👩🏽‍💻"))).toHaveLength(1);
  });
});
\`\`\`

The grapheme test depends on an environment with \`Intl.Segmenter\` and relevant locale data, which current Node runtimes commonly provide. Pin the CI runtime rather than assuming every embedded JavaScript engine behaves identically.

## Diagnose a parity regression by following the failed artifact

Imagine the candidate model preserves extraction quality in English and Spanish but Arabic JSON validity falls sharply. Human review says the requested action is understood. The answers contain localized prose before the object, and some responses translate the stable key \`requestedAction\`.

Do not label this "Arabic is worse" and stop. Follow the pipeline:

1. Compare raw prompts and confirm the Arabic adaptation still requires machine-only JSON.
2. Inspect the system prompt after locale templating. A translated instruction may have weakened the no-prose constraint.
3. Compare raw model output with gateway post-processing. The wrapper may prepend localized assistance text.
4. Check whether structured-output enforcement was enabled equally for all locales.
5. Score semantic fields separately from schema to confirm capability versus interface failure.
6. Re-run paired items with the previous model snapshot and identical harness.

The likely corrective action differs by finding. A prompt localization defect belongs to the evaluation or application team. Unequal structured-output configuration belongs to the gateway. A model-only regression belongs to model selection or vendor escalation. The artifact trail prevents a vague quality score from assigning the wrong owner.

## Publish a scorecard that cannot hide the weakest users

The main scorecard should show locale, task family, risk tier, item count, target score, reference score, gap, uncertainty, and critical failure count. Add a worst-slice panel sorted by impact. Keep latency and cost alongside quality but do not blend them into one opaque score.

For every release, preserve representative failures with redacted prompts, outputs, deterministic checks, rubric labels, and reviewer notes. An AI coding agent can then turn a cluster into a regression test without guessing the original defect. Ask the agent to add the smallest new slice that reproduces the issue and to keep the pre-fix result as evidence.

Parity work is complete only when a failed slice changes a release decision or creates an owned improvement. A dashboard full of language averages without thresholds, artifacts, and owners is monitoring theater.

## Frequently Asked Questions

### Does multilingual parity require English to be the reference language?

No. Choose a reference that matches product maturity, evaluation resources, and business commitments. English is common because datasets and reviewers are often abundant, but that convenience can encode an English-first assumption. Some teams use the previous production model within each locale as the primary baseline and compare cross-locale gaps separately. Whatever you choose, declare it before evaluation, show absolute target scores alongside gaps, and never treat a weak reference score as evidence that all languages are good enough.

### How many examples are needed for each locale?

There is no universal count. Required sample size depends on the tolerated gap, outcome variance, paired-item correlation, risk, and how often you can accept manual review. Start with a stratified pilot, estimate uncertainty for each important slice, then add cases where intervals are too wide or critical failures are rare. Report item counts and confidence intervals rather than claiming that an arbitrary round number guarantees coverage. High-impact safety and transaction flows often need targeted oversampling beyond their traffic share.

### Can an LLM judge replace native-speaking reviewers?

Not for establishing the measurement system. A judge can scale triage after you validate its agreement, bias, and failure patterns against qualified human reviewers in each locale and task family. Keep deterministic checks ahead of the judge, blind model identity, swap comparison order, and include anchor answers. When judge and human labels diverge, preserve both and investigate. A model that grades its strongest language more generously can manufacture the appearance of a parity gap even when user-facing quality is comparable.

### Should prompts be literal translations across all languages?

Usually not. The invariant should be equivalent, but the prompt should sound natural and preserve comparable difficulty. Literal translation can carry English idioms, unnatural syntax, irrelevant legal concepts, or clues that do not exist in the target language. Use a source intent specification, bilingual adaptation, and grouped review by case ID. Record deliberate cultural substitutions and keep machine contracts such as tool names or JSON keys stable unless the product explicitly localizes them.
`,
};
