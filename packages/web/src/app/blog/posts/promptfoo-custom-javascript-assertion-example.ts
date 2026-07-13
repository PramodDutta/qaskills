import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Promptfoo Custom JavaScript Assertion Example',
  description:
    'Build a Promptfoo custom JavaScript assertion that parses support-agent JSON, scores domain rules deterministically, and returns useful failure reasons.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Promptfoo Custom JavaScript Assertion Example

“Looks helpful” is not a sufficient oracle when a support agent must return a valid escalation object, cite only retrieved policy IDs, and never promise an unauthorized refund. Those requirements are deterministic. Promptfoo's JavaScript assertion type lets the evaluation encode them as executable rules instead of sending every output to another model for a subjective grade.

A JavaScript assertion receives the model \`output\` and an assertion context. It can be an inline expression or a function exported from a file. A boolean gives a pass or fail, a number supplies a score, and a structured assertion result can communicate richer outcomes supported by Promptfoo. The maintainable pattern is a small external module: parse once, validate domain invariants, calculate a bounded score, and return a reason specific enough to repair either the prompt or the application.

## Design the output contract before writing the assertion

Assume a customer-support model must emit JSON with \`answer\`, \`action\`, and \`citations\`. The action is one of \`respond\`, \`escalate\`, or \`request_information\`. Retrieved policy identifiers are supplied as test variables. The model may cite only those identifiers. Refund language is forbidden unless an input variable explicitly says the user is eligible.

This is not general answer-quality judging. It is a machine-checkable contract at an LLM boundary.

| Rule | Why it belongs in JavaScript | Failure meaning |
|---|---|---|
| Output parses as one JSON object | Exact syntax requirement | Model or wrapper returned prose or malformed JSON |
| Action belongs to an enum | Product workflow has finite branches | Downstream router cannot dispatch safely |
| Every citation was retrieved | Set membership is deterministic | The answer cites unavailable evidence |
| Escalation contains no refund promise | Policy constraint is explicit | Generated text takes an unauthorized action |
| Answer length stays below configured maximum | Character count is objective | Channel or UI limit is exceeded |

Do not force nuanced properties into brittle keyword checks. Whether an answer is empathetic, complete, or well-written may need a rubric or human review. Whether \`citations\` is an array of approved IDs does not.

## Export a named assertion function

Promptfoo can load a JavaScript file using a \`file://\` reference. Appending \`:functionName\` selects a named export. CommonJS keeps the example directly runnable in a broad range of Node setups.

The function below returns a structured pass, score, and reason. It uses only the documented \`output\` and \`context\` inputs. Assertion-specific values come from \`context.config\`, while test variables come from \`context.vars\`.

\`\`\`js
const allowedActions = new Set(['respond', 'escalate', 'request_information']);

module.exports.validateSupportEnvelope = (output, context) => {
  let value;
  try {
    value = JSON.parse(output);
  } catch (error) {
    return { pass: false, score: 0, reason: \`Output is not JSON: \${error.message}\` };
  }

  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return { pass: false, score: 0, reason: 'Output must be a JSON object' };
  }

  const failures = [];
  if (typeof value.answer !== 'string' || value.answer.trim().length === 0) {
    failures.push('answer must be a non-empty string');
  }
  if (!allowedActions.has(value.action)) {
    failures.push('action must be respond, escalate, or request_information');
  }
  if (!Array.isArray(value.citations) || !value.citations.every((id) => typeof id === 'string')) {
    failures.push('citations must be an array of strings');
  }

  const available = new Set(context.vars.availablePolicyIds ?? []);
  const unknown = Array.isArray(value.citations)
    ? value.citations.filter((id) => !available.has(id))
    : [];
  if (unknown.length > 0) failures.push(\`unknown citations: \${unknown.join(', ')}\`);

  const maxChars = context.config.maxAnswerChars ?? 600;
  if (typeof value.answer === 'string' && value.answer.length > maxChars) {
    failures.push(\`answer exceeds \${maxChars} characters\`);
  }

  const refundPromise = /\b(I|we) (will|can) (issue|send|process) (a |your )?refund\b/i;
  if (!context.vars.refundEligible && refundPromise.test(value.answer ?? '')) {
    failures.push('answer promises a refund for an ineligible case');
  }

  const totalRules = 6;
  const score = Math.max(0, (totalRules - failures.length) / totalRules);
  return {
    pass: failures.length === 0,
    score,
    reason: failures.length === 0 ? 'Support envelope satisfies all rules' : failures.join('; '),
  };
};
\`\`\`

This assertion deliberately separates schema-like checks from policy checks. For a production contract, a JSON Schema validator may provide more complete structural validation. JavaScript remains useful for cross-field rules such as citation membership and refund eligibility.

The regular expression is narrow and illustrative. If the business policy prohibits a broad range of commitments, maintain an approved language classifier or structured action field rather than accumulating dozens of English phrases. Deterministic does not mean simplistic.

## Wire context variables and assertion config in promptfooconfig.yaml

Each test supplies the domain inputs needed to judge its output. The assertion config controls reusable thresholds. Keep secrets out of these values because evaluation artifacts and reports may retain them.

\`\`\`yaml
description: Support response contract evaluation

prompts:
  - file://prompts/support-agent.txt

providers:
  - id: openai:gpt-4.1-mini
    config:
      temperature: 0

tests:
  - description: Damaged item outside automatic refund window
    vars:
      customerMessage: The package arrived damaged. Refund it today.
      refundEligible: false
      availablePolicyIds:
        - returns-window
        - damaged-items
      retrievedPolicies: |
        damaged-items: Ask for photographs and escalate if the return window has passed.
        returns-window: Automatic refunds are available for 30 days.
    assert:
      - type: javascript
        value: file://assertions/support-envelope.js:validateSupportEnvelope
        config:
          maxAnswerChars: 500
\`\`\`

Provider identifiers and model availability evolve, so select one supported by the installed Promptfoo and provider integration. The assertion itself is provider-independent. That separation is valuable: the same contract can compare hosted models, local models, or a custom application endpoint.

Keep the prompt's expected output format aligned with the assertion. If the prompt requests Markdown and the assertion demands raw JSON, the evaluation is testing contradictory instructions. When the application strips code fences before parsing, evaluate that application behavior or reproduce the exact normalization in one clearly named adapter.

## Test the assertion as ordinary JavaScript

An evaluation oracle is production test code. Bugs in it create false confidence or false alarms at scale. Unit-test the exported function without calling a model. Cover a valid object, invalid JSON, an unknown citation, an overlong answer, an invalid action, and the refund policy branch.

\`\`\`js
const { describe, expect, it } = require('vitest');
const { validateSupportEnvelope } = require('./support-envelope');

const context = {
  vars: {
    availablePolicyIds: ['damaged-items', 'returns-window'],
    refundEligible: false,
  },
  config: { maxAnswerChars: 200 },
};

describe('validateSupportEnvelope', () => {
  it('accepts a cited escalation without an unauthorized promise', () => {
    const output = JSON.stringify({
      answer: 'Please attach a photo of the damage. I will send the case to a specialist.',
      action: 'escalate',
      citations: ['damaged-items'],
    });
    expect(validateSupportEnvelope(output, context)).toMatchObject({ pass: true, score: 1 });
  });

  it('reports multiple independent violations', () => {
    const output = JSON.stringify({
      answer: 'We will issue your refund.',
      action: 'refund_now',
      citations: ['imaginary-policy'],
    });
    const result = validateSupportEnvelope(output, context);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('action must be');
    expect(result.reason).toContain('unknown citations');
    expect(result.reason).toContain('promises a refund');
  });

  it('fails non-JSON output without throwing', () => {
    const result = validateSupportEnvelope('Here is your answer:', context);
    expect(result).toMatchObject({ pass: false, score: 0 });
  });
});
\`\`\`

Notice that the negative test expects all applicable reasons, not the first reason. Aggregated diagnostics shorten prompt iteration. For expensive evaluations, discovering one violation per run wastes both time and tokens.

## Scores need stable meaning

A numeric score is useful for tracking partial improvement, but only when its meaning is stable. In the example, six rules have equal weight and each recorded failure reduces the score. That is easy to explain, yet a malformed JSON response triggers only one failure even though none of the downstream fields can be checked. Giving it 5/6 would be misleading, so the parser branch returns zero immediately.

Weight safety-critical rules more heavily if a combined score is necessary, but retain a hard \`pass: false\` for non-negotiable violations. A model that formats perfectly while fabricating policy citations should not pass because its average exceeds a threshold.

| Return style | Best use | Limitation |
|---|---|---|
| Boolean | One binary invariant | Weak failure diagnosis |
| Number | Smooth metric or heuristic | Pass threshold and meaning need documentation |
| Structured result | Domain rules with actionable reasons | More assertion code to test |
| Several separate assertions | Independent report dimensions | Repeated parsing unless shared carefully |

Avoid changing rule count silently while comparing historical scores. Version the rubric or annotate the evaluation change. A score movement caused by a new assertion is not necessarily a model regression.

## Deterministic checks and model-graded checks complement each other

JavaScript is the right tool for parsability, set membership, enum values, regex constraints, numerical bounds, forbidden exact claims, and consistency against supplied variables. A model-graded rubric may be appropriate for grounded explanation quality, tone, ambiguity handling, or whether an answer addresses the user's actual intent.

Run cheap deterministic assertions first conceptually, even if the evaluation engine executes configured checks in its own order. There is little value in paying a judge to score prose that cannot be parsed by the application. In reports, keep contract failures separate from qualitative shortfalls so teams know whether to change the output schema, prompt, model, retrieval, or policy.

The [Promptfoo complete guide](/blog/promptfoo-complete-guide-2026) covers providers, prompts, datasets, caching, and evaluation commands. Custom JavaScript assertions occupy one focused layer: application-specific oracles that built-in assertions cannot express exactly.

## Context data is part of the oracle

An assertion is only as trustworthy as the reference data in \`context.vars\`. If \`availablePolicyIds\` contains policies the prompt never received, a hallucinated citation can look grounded. Derive the list from the same retrieval result passed to the model, or have the application endpoint return trace metadata that the evaluator can inspect.

Keep types predictable. YAML scalars may become booleans, numbers, strings, or arrays. Validate the assertion's context configuration and fail with an infrastructure reason when required inputs are missing. Treating a missing allowlist as an empty set could mark every model output bad; treating it as unrestricted could hide hallucinations.

Do not fetch live policy services from inside every assertion unless the evaluation is explicitly an integration test. Live reference data changes mid-run, adds latency, and makes results hard to reproduce. Snapshot the relevant policy IDs and content into the dataset with a version identifier.

## Security and sandbox expectations

A file-based assertion is JavaScript executed by the evaluation process. It can read environment variables, access files, perform network calls, or consume excessive resources unless the surrounding runtime constrains it. Review assertion modules like build scripts, especially when evaluating pull requests from untrusted contributors.

Never use \`eval()\` on model output. Parse data formats with a real parser and validate the resulting structure. Do not turn a model-supplied field into a filename or module import. Bound expensive operations: a catastrophic regular expression against a huge output can stall an evaluation.

Truncate failure reasons that quote model text. Reports should explain which rule failed without copying sensitive customer data. The sample reasons name fields and IDs; a production assertion could cap unknown-ID output to a small count.

## Debugging an assertion that behaves differently in Promptfoo

First invoke the exported function directly with the exact output saved by the evaluation. Differences commonly come from code fences, leading commentary, escaped JSON nested inside another object, or absent context variables. Inspect the output representation, not only its rendered view.

Then verify the \`file://\` path is relative to the configuration context expected by the installed version and that the named export matches exactly. If the module system is ESM, use an export style supported by the project and Promptfoo runtime instead of mixing \`module.exports\` with ESM-only package settings without testing it.

Finally, distinguish assertion exceptions from assertion failures. A domain violation should return a failed result. A programming error, missing required config, or unreachable dependency is evaluation infrastructure failure and should be visible as such, not converted into a misleading model score of zero.

The [LLM regression testing guide](/blog/llm-regression-testing-guide-2026) explains dataset versioning and baseline interpretation. A stable assertion module is what turns repeated evaluations into a regression signal rather than a sequence of loosely related demos.

## A code-review rubric for custom assertions

Before trusting a JavaScript oracle in a release gate, check that:

- It validates and bounds \`output\` before expensive processing.
- Parser failure returns a clear zero-score failure rather than throwing accidentally.
- Context inputs are checked for presence and expected type.
- Rules correspond to documented product behavior, not aesthetic preference.
- Safety invariants cannot be averaged away by formatting points.
- Failure reasons are actionable and avoid sensitive output disclosure.
- The module makes no unnecessary live network calls.
- Unit tests cover each rule and combinations of failures.
- Score meaning is documented and versioned when changed.
- The assertion is evaluated against the same post-processing boundary used by the application.

Custom JavaScript earns its place when it captures what the product already knows with certainty. It should make an LLM evaluation less subjective, not encode one engineer's taste as if it were a contract.

## Calibrate rules against a labeled edge-case set

Before a custom assertion becomes a release gate, run it over outputs labeled by domain reviewers. Every deterministic rule should agree with the documented label for the cases it claims to decide. Disagreement can reveal a code bug, an ambiguous policy, or a requirement that is not actually deterministic.

For the refund example, include legitimate statements such as “I cannot issue a refund” and “A specialist will review refund eligibility.” A broad search for the word \`refund\` would reject both. Include adversarial commitments such as “Your refund is on its way” that the narrow demonstration regex misses. This exercise often motivates moving authority into a structured \`action\` field and checking generated prose for a smaller set of prohibited commitments.

Maintain three outcome classes during calibration: definite pass, definite fail, and requires judgment. JavaScript should decide the first two only where rules are explicit. Route the third class to a model rubric or human sampling rather than forcing it through a growing list of phrases.

Version the assertion alongside the dataset. When policy changes make refunds permissible under new conditions, the assertion, prompt, variables, and labeled cases should change in one reviewed unit. Preserve prior evaluation results with their rubric version so trend charts do not compare different definitions of success as if they were one metric.

Mutation testing is useful for the oracle itself. Starting from a passing envelope, delete each required field, change each type, add an unknown citation, cross the length boundary by one character, and flip eligibility. Every mutation should trigger the intended reason. Starting from a failing object, repair one violation at a time and confirm only that reason disappears.

This is where senior test judgment matters most. A custom assertion can execute thousands of times and appear objective, so a subtle false-positive rule scales harm quickly. Small, reviewed functions with labeled calibration cases are safer than an impressive all-purpose evaluator that nobody can explain.

## Frequently Asked Questions

### When should a Promptfoo assertion return a number instead of a boolean?

Return a number for a genuinely graded property whose scale has stable meaning. Use a hard failure for mandatory structure or safety rules, even if you also report a partial diagnostic score.

### Can a custom JavaScript assertion be stored in a separate file?

Yes. Reference it with a \`file://\` value. A named function can be selected by appending its export name, which keeps several related assertions in one reviewed module when appropriate.

### What should happen when JSON parsing fails?

Return a failed result with a zero score and a concise parse reason. Do not attempt downstream field checks against an undefined structure, and do not throw for an ordinary bad model output.

### Can context.config carry assertion-specific thresholds?

Yes. Assertion configuration is available through the context, making limits such as maximum answer characters reusable without hard-coding them into the function. Validate required config values before use.

### Should the assertion call another LLM for semantic checks?

That turns it into a model-graded assertion with additional variance, cost, and prompt requirements. Keep JavaScript deterministic and use Promptfoo's model-based assertion facilities separately for qualities that truly require judgment.
`,
};
