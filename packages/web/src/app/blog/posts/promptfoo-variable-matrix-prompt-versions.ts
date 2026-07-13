import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Compare Prompt Versions with a Promptfoo Variable Matrix',
  description:
    'Compare prompt versions with a Promptfoo variable matrix that holds model settings constant, expands shared inputs, and exposes quality regressions.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Compare Prompt Versions with a Promptfoo Variable Matrix

Version B wins on terse billing questions and fails every multilingual escalation. An average score hides that tradeoff; a matrix exposes it. Put both prompt files across the same variables and provider, then inspect each input slice before deciding which instruction set ships.

Promptfoo evaluates the cartesian product of configured prompts, providers, and tests. Array-valued variables can add another product within a test case. That machinery is powerful, but careless expansion creates duplicated cases, runaway cost, and comparisons where more than the prompt changed.

## Freeze the model before comparing instructions

A prompt experiment should change the prompt and keep the provider configuration, dataset, assertions, and sampling policy constant. Comparing one prompt on one model with another prompt on a newer model cannot attribute the difference. Temperature and seed behavior also influence repeatability where providers support them.

| Dimension | Hold constant for prompt A/B | Vary in a separate experiment |
| --- | --- | --- |
| Provider and model | Yes | Model selection benchmark |
| Temperature and token limits | Yes | Creativity or latency tuning |
| Input cases | Yes | Dataset expansion |
| Assertions and graders | Yes | Rubric calibration |
| Prompt text | No, this is the treatment | Prompt revision |
| Sampling repetitions | Same count | Variance study |

Label prompt versions so the result view is interpretable. Store them as files under version control rather than pasting large YAML scalars. A diff then explains exactly what changed, and evaluation results can record the commit.

## Build a shared-input comparison

This configuration compares two support-answer prompts on one provider. Each test input applies to both prompt files. Deterministic assertions cover non-negotiable properties, while a rubric evaluates behavior that cannot be expressed as a substring.

\`\`\`yaml
# promptfooconfig.yaml
description: Compare support prompt v3 with v4
prompts:
  - id: file://prompts/support-v3.txt
    label: support-v3
  - id: file://prompts/support-v4.txt
    label: support-v4

providers:
  - id: openai:chat:gpt-5-mini
    config:
      temperature: 0

defaultTest:
  assert:
    - type: not-contains
      value: 'internal_policy'
    - type: llm-rubric
      value: >-
        The answer addresses the customer's stated problem, does not invent account
        facts, and gives a concrete next step in the requested language.

tests:
  - description: Duplicate card charge in French
    vars:
      language: French
      channel: email
      issue: I was charged twice for order 814.
    assert:
      - type: contains
        value: '814'
  - description: Password reset in chat
    vars:
      language: English
      channel: chat
      issue: The reset link expired before I could use it.
    assert:
      - type: contains-any
        value: ['new link', 'another link', 'fresh link']
\`\`\`

Run it with \`npx promptfoo eval\`, then open the result viewer with \`npx promptfoo view\`. The prompt files use Nunjucks variables such as \`{{issue}}\`. Both versions must expose the same variable names, or missing substitution becomes an accidental treatment.

Provider identifiers evolve, so select one supported by the installed Promptfoo version and your environment. Keep API keys in the environment. Do not embed them in \`env\` fields that may appear in exported results.

## Expand variables without confusing test cases

Promptfoo expands array values into combinations by default. That makes a compact matrix for independent factors. Two languages, two channels, and three issues produce twelve variable combinations, and each combination then runs against every prompt and provider.

\`\`\`yaml
prompts:
  - file://prompts/triage-v1.txt
  - file://prompts/triage-v2.txt
providers:
  - openai:chat:gpt-5-mini

tests:
  - description: Channel and urgency matrix
    vars:
      channel: [chat, email]
      urgency: [normal, urgent]
      message:
        - Where can I download my invoice?
        - My account is locked before payroll closes.
    assert:
      - type: llm-rubric
        value: >-
          The response uses a tone suitable for {{channel}}, recognizes {{urgency}},
          and does not claim the requested action has already been completed.
\`\`\`

This example creates eight inputs and sixteen prompt cells. That is appropriate only if every channel, urgency, and message combination is meaningful. If urgency belongs to a particular message, write separate test cases or load rows from CSV. Blind cartesian expansion can produce nonsense such as marking a documentation question as a safety emergency.

| Data shape | Best Promptfoo representation | Reason |
| --- | --- | --- |
| Independent categorical factors | Array variables in one test | Intentional cartesian product |
| Coupled scenario fields | One test case per row | Preserves valid relationships |
| Hundreds of reviewed examples | CSV, JSONL, or YAML file | Easier ownership and diffing |
| Large text context | \`file://\` variable | Keeps config readable |
| Array passed as one value | Disable variable expansion | Prevents accidental case multiplication |

When the prompt genuinely expects an array, set \`defaultTest.options.disableVarExpansion: true\` for that evaluation. Otherwise Promptfoo treats array variable elements as cases. This option changes matrix semantics, so do not enable it merely to reduce a surprising run count.

## Design assertions that reveal prompt differences

Exact string equality is suitable for a classification label or required JSON field, not for open-ended support prose. Combine deterministic gates with model-graded or similarity checks where appropriate. Every grader introduces its own uncertainty, cost, and bias.

Use \`contains\` for a required identifier, \`not-contains\` for prohibited leakage, JSON assertions for structured output, and latency or cost assertions only when thresholds reflect an operational budget. Rubrics should describe observable output, not vague adjectives such as “excellent.”

Calibrate rubric graders against examples scored by knowledgeable reviewers. Include disagreements and revise the rubric until false passes and false failures are understood. A prompt version should not win because the grader prefers its verbosity unless verbosity is a product requirement.

Promptfoo's [complete guide](/blog/promptfoo-complete-guide-2026) covers providers, assertion types, result viewing, and CI fundamentals. A version matrix depends on those pieces but adds experimental discipline: one treatment, shared cases, and slice-level interpretation.

## Prevent labels and file order from biasing review

Human reviewers can be influenced by version names. Labels such as “new-improved” announce the expected winner. Use neutral labels during blind review, then map them back to commits after scoring. Randomize displayed order if your review workflow supports it.

Automated graders can also receive prompt-identifying artifacts in the output. Do not let either prompt mention its version. Keep fixture metadata out of the rendered answer unless the production prompt uses it.

File order does not change the underlying evaluation, but it can influence which column a reviewer reads first. Require reviewers to inspect failures and notable regressions by slice, not just the first aggregate percentage.

## Read the matrix by slice, not only by total

A global pass rate mixes easy and consequential cases. Group results by language, issue family, risk level, input length, and channel. A two-point overall gain is not an acceptable trade if account-recovery safety cases regress sharply.

Attach metadata to cases for filtering. Keep metadata separate from prompt variables unless the prompt needs it. Useful fields include owner, capability, severity, locale, and dataset version. Avoid post hoc slicing until a desired story appears; decide important segments before the run.

| Result pattern | Likely interpretation | Next action |
| --- | --- | --- |
| B improves every slice | Broad improvement candidate | Repeat and review failures |
| B wins short inputs, loses long context | Context handling changed | Inspect instruction placement |
| Only grader scores change | Subjective style shift or grader noise | Blind human calibration |
| Deterministic gates regress | Hard contract violation | Block promotion |
| Latency rises with equal quality | More verbose prompt or output | Measure token contribution |

Inspect raw outputs. Scores are indexes into evidence, not the evidence itself. Look for one repeated failure mode that an assertion failed to express, then add a case or improve the rubric without rewriting history for only one version.

## Budget the cartesian product

Calculate planned calls before execution: prompts multiplied by providers multiplied by expanded test cases, then multiplied by repetitions and grader calls. Model-graded assertions may create additional requests. A compact YAML matrix can therefore cost much more than its line count suggests.

During development, filter to a representative slice. Before merging, run the complete required dataset. Cache behavior can speed iteration but should not let a stale response stand in for a changed prompt. Record Promptfoo version, provider identifiers, prompt commit, dataset revision, and relevant generation settings with the result.

Set concurrency with provider rate limits in mind. High concurrency reduces wall time but can introduce throttling and retries that distort latency measurements. Separate a quality comparison from a performance benchmark when throttling cannot be controlled.

## Promote a prompt with a declared decision rule

Define gates before observing results. For example: no failures on deterministic safety assertions, no regression in any critical locale, a minimum rubric pass threshold on the frozen set, and manual review of all changed outcomes. Avoid inventing a weighted composite after seeing which version it favors.

Stochastic outputs require repetition. Even temperature zero is not a universal guarantee of identical provider output. Run multiple samples for borderline cases and report a distribution or consistency rate. A single lucky completion should not promote a fragile prompt.

The [prompt regression testing guide](/blog/prompt-regression-testing-guide-2026) explains how to turn accepted cases into a durable release gate. Keep a separate exploratory set to discover weaknesses and a frozen regression set to compare versions. Continually rewriting expected outcomes for the candidate prompt destroys the baseline.

## Diagnose a misleading comparison

If one column is blank, confirm both prompt files render with the same variables and the test does not filter by prompt label. If run counts exceed expectations, find array values and calculate their product. If only one version triggers provider errors, compare final rendered messages in the viewer for malformed JSON, excessive context, or unsupported roles.

When outputs look identical despite edited files, clear or intentionally bypass stale cached results and verify file resolution relative to the config. Promptfoo resolves \`file://\` paths from the configuration location. A similarly named file in another directory can lead reviewers to evaluate the wrong content.

If a rubric seems to reward one style, score a blinded sample manually. Check whether the grader prompt contains the same assumptions as one candidate. Prefer deterministic assertions for facts that can be parsed, leaving model grading for genuinely semantic properties.

## Maintain the matrix as a test asset

Give each case a reason to exist. Remove exact duplicates, but preserve distinct boundary conditions even if their text looks similar. Review datasets for sensitive customer content before committing or sharing results. Synthetic examples should still reflect production language and constraints.

Version prompt files and datasets independently. A prompt-only pull request should run against the current frozen set. A dataset update should show how both incumbent and candidate behave so a harder test set is not mistaken for a prompt regression.

Finally, archive enough result metadata to reproduce the decision while acknowledging that hosted models change. The goal is traceability, not a false promise that an external model will emit identical text forever.

## Use CSV rows when variables are correlated

Product datasets usually contain correlated fields: a Japanese message needs a Japanese expected phrase, a refund scenario has a particular policy excerpt, and a high-risk case carries a stricter rubric. Put those relationships in rows rather than parallel arrays. Promptfoo maps CSV column names to variables and recognizes special expected-output columns.

Review CSV quoting carefully when inputs contain commas, line breaks, or JSON. A malformed row can shift columns and create nonsensical prompts. JSONL is often clearer for nested values, while YAML is convenient for assertions that vary by case. Choose the format reviewers can validate reliably, not the shortest file.

Give each row stable metadata such as capability and case ID. Avoid using customer tickets verbatim. Redact or synthesize content while retaining linguistic difficulty, ambiguity, and policy constraints. A sanitized but unrealistic dataset produces precise scores about the wrong workload.

## Compare structured-output prompts at the schema boundary

When both versions must emit JSON, validate parseability and schema before applying semantic grading. A prose answer with correct facts is still a failure if the caller expects a typed object. Conversely, formatting differences inside valid objects should not dominate evaluation.

Use assertions supported by the installed Promptfoo version to validate JSON fields and values. Keep the schema or deterministic checker under version control. Then add cases for quotes, Unicode, missing optional fields, nullability, and user text that tries to inject additional keys.

Inspect whether one prompt repairs malformed JSON through extra prose that a lenient parser silently strips. Evaluate the exact provider output consumed by production. If production uses tool calling or a structured-response API, configure that same provider mode rather than pretending a plain text JSON instruction is equivalent.

## Measure variance before calling a regression

One evaluation run is a sample from a nondeterministic system. Provider infrastructure, model changes, and stochastic decoding can move outcomes. Repeat cases that are near a release threshold, and distinguish consistent failures from occasional grader disagreement.

Use identical repetition counts for both prompts. Report numerator and denominator for each slice, not only a rounded percentage. Review changed outputs where version A passes and B fails, plus the reverse. If the grader itself varies on an unchanged stored output, fix or replace the grader before using it as a gate.

A frozen set can still become stale as product policy changes. Update it through review, rerun the incumbent, and record that the baseline moved. Do not rewrite a failed expected answer silently during the same change that introduces a candidate prompt.

## Add the matrix to CI without blocking exploration

Split a small deterministic gate from a larger scheduled evaluation. Pull requests can run critical cases on one fixed provider with hard assertions and publish the result artifact. Nightly or manual jobs can exercise more locales, repetitions, rubric graders, and provider variants.

Fail CI when the declared release rule fails, not whenever any exploratory grader dislikes an answer. Preserve outputs for investigation subject to privacy policy. Include the prompt and dataset hashes in job metadata so an engineer can reproduce which files were evaluated.

API outages and rate limits should be classified separately from assertion failures. Retrying a provider request may be reasonable with a cap, but it changes latency evidence. A run with missing cells should not declare either prompt the winner.

## Guard against prompt injection inside matrix variables

Evaluation inputs should include adversarial text that attempts to override system instructions, reveal hidden policy, or change the output schema. Those strings belong in variables exactly where untrusted production content enters. Do not put the attack into a privileged prompt role unless that is the real architecture.

Compare versions on both task completion and instruction-boundary behavior. A prompt that refuses every difficult input may look safe while failing the product. Rubrics should distinguish a legitimate request containing suspicious words from an actual request to violate policy.

If the prompt inserts retrieved documents, test instructions embedded in those documents and mark document text as untrusted in both versions. Include cases where the correct answer is present beside a malicious directive. Keep prohibited secret values synthetic, then use deterministic \`not-contains\` assertions so evaluation artifacts never require real credentials.

Red-team cases can be maintained in a separate dataset with restricted result sharing. When they are part of the release gate, run both incumbent and candidate. A newly added attack that defeats both versions is a product finding, not evidence that the candidate alone regressed.

## Frequently Asked Questions

### Does Promptfoo run every test against every prompt automatically?

By default, test cases participate in the prompt and provider product. A test can restrict prompts or providers explicitly, so inspect filters when a matrix cell is missing.

### What happens when two vars are arrays?

Promptfoo expands their combinations unless variable expansion is disabled. Confirm that the cartesian combinations are semantically valid and calculate the resulting request count before running.

### Should prompt versions use different providers?

Not in a prompt-only comparison. Keep the provider and its configuration fixed. Run a separate model comparison if provider choice is also under evaluation.

### How can I pass an array to the prompt as one value?

Use \`disableVarExpansion\` in test options for that evaluation, then reference the array variable normally. Verify that this choice applies to all cases inheriting the option.

### Is the highest aggregate pass rate always the winner?

No. Enforce hard gates and inspect critical slices. A version with a higher average can still introduce an unacceptable regression in safety, locale, structured output, or a high-value workflow.
`,
};
