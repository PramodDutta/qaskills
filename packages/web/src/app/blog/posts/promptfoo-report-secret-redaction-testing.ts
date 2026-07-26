import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Promptfoo report secret redaction testing',
  description:
    'Promptfoo report secret redaction testing: use repo evidence, fixtures, code examples, and CI checks to expose AI contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Promptfoo report secret redaction testing',
  keywords: [
    'Promptfoo report secret redaction testing',
    'how to promptfoo report secret redaction testing',
    'promptfoo report secret redaction testing example',
    'Promptfoo output secret scanner',
    'redact Promptfoo HTML report',
    'Promptfoo CI artifact privacy',
  ],
  relatedSlugs: [
    'promptfoo-complete-guide-2026',
    'promptfoo-red-teaming-llm-applications',
    'prompt-injection-testing-guide-2026',
    'pii-leakage-testing-llm-guide-2026',
  ],
  sources: [
    'https://www.promptfoo.dev/docs/configuration/outputs/',
    'https://www.promptfoo.dev/docs/red-team/troubleshooting/data-handling/',
    'https://genai.owasp.org/llmrisk/llm01-prompt-injection/',
  ],
  repoEvidence: [
    'seed-skills/promptfoo-llm-red-teaming/SKILL.md',
    'seed-skills/prompt-testing/SKILL.md',
  ],
  content: `Promptfoo report secret redaction testing plants unique canary values in prompts, variables, headers, replies, and errors, then scans every saved report and CI log. A pass means no canary or sensitive pattern remains, while case IDs, scores, safe reasons, and owners stay visible. Empty or missing artifacts must fail the gate.

## What must Promptfoo report secret redaction testing prove?

Promptfoo report secret redaction testing must prove that a report is safe to keep, share, and upload. It must also prove that the scrub step did not erase the facts needed to fix a failed case.

The test covers JSON, JSONL, YAML, HTML, text, console logs, test summaries, and archive names created by the job. Scan the raw files before upload because a later access rule does not remove data already placed in an artifact.

Use canaries instead of real keys or personal data. Each canary should be fake, unique to one field, easy to find as plain text, and safe if a failed test prints it.

Place canaries in a provider key, auth header, prompt variable, nested request value, model reply, assertion reason, and thrown error. This spread catches leaks from both config data and run data.

The official [Promptfoo output guide](https://www.promptfoo.dev/docs/configuration/outputs/) lists report formats and the fields that exports can contain. It also warns that several formats include eval config and use best-effort sanitizing, so a separate release scan has a clear purpose.

Safe evidence must remain after the scrub. Keep test ID, provider alias, pass state, numeric score, safe error class, rule ID, and the team that owns the fix.

Do not call a fully blank report safe. A scrub step that deletes all content hides leaks, but it also removes the case trail and can make a broken job look clean.

The [Promptfoo complete guide](/blog/promptfoo-complete-guide-2026) covers the full eval flow. This gate starts once files and logs exist, then decides whether those exact bytes may cross the CI trust line.

Use the [QA skills directory](/skills) when the suite also needs output safety or prompt checks. This article owns secret and private-data exposure in test reports, not unsafe text returned to an end user.

## Which repository behavior defines the test contract?

\`seed-skills/promptfoo-llm-red-teaming/SKILL.md\` runs \`promptfoo eval -o results.json\` for machine-readable CI output. That command creates a real file boundary which the scan can block before artifact upload.

The same file runs pinned regression cases on pull requests and keeps broader generated attacks for later jobs. A fast scan fits the pull request path because it needs no model call once fixture reports exist.

\`seed-skills/prompt-testing/SKILL.md\` says test files must not hold hardcoded API keys. It also treats cached and generated output as controlled test data, which means report files need the same care as source config.

Those repository rules define two inputs: machine-readable output and synthetic secret-bearing test data. The observable output is a publishable artifact set with no canary hit and enough safe fields for review.

The [data handling guide](https://www.promptfoo.dev/docs/red-team/troubleshooting/data-handling/) explains local and remote data paths. It notes that one environment flag is not a full network-isolation promise, so the test should inspect the job's real upload and sharing steps.

The [OWASP prompt injection entry](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) covers direct and indirect ways that hostile text can affect an LLM app. Report scans should treat copied prompts and tool text as data that may be private, even when the source looked harmless.

Keep source facts separate from local policy. Promptfoo defines its formats and controls, while the team decides which data classes may appear in its CI store.

Build a small inventory before the run. List expected report names, log streams, compressed files, and summaries so a missing scan target cannot pass by omission.

Give each canary a field label, such as \`header-token\`, \`prompt-private\`, or \`error-pii\`. The final scan report should name the label and file path without echoing the full value.

The [Promptfoo red-team guide](/blog/promptfoo-red-teaming-llm-applications) explains attack reports and pinned cases. The privacy gate protects the files from those runs even when every model assertion passes.

## How to promptfoo report secret redaction testing?

To learn how to promptfoo report secret redaction testing, create one fixture eval that puts a different fake value at each leak point. Generate every report format used by CI, capture both output streams, and scan the resulting byte set.

Choose canaries with a shared safe prefix and a random suffix created for the test. The prefix lets the scanner catch an unknown field, while the full values show which planned location leaked.

Do not use common sample strings such as \`secret\` by itself. Normal docs and error text can contain that word, which creates noise and encourages unsafe allowlists.

The first example runs a fixed eval into an isolated folder and saves console text. It uses no shell tracing because command echo can expose environment values before the app starts.

\`\`\`bash
set -eu
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

export API_TOKEN="QASKILLS_CANARY_HEADER_7F3A"
export PRIVATE_PROMPT="QASKILLS_CANARY_PROMPT_91C2"

npx promptfoo eval \
  --config test/fixtures/redaction/promptfooconfig.yaml \
  --output "$work_dir/results.json" \
  --output "$work_dir/results.yaml" \
  --output "$work_dir/results.html" \
  >"$work_dir/stdout.log" \
  2>"$work_dir/stderr.log"

node test/redaction/scan-artifacts.mjs "$work_dir"
\`\`\`

Make the fixture response local and fixed. The test is about file handling, so a live provider would add cost, drift, and data routes that do not help the oracle.

Walk files as bytes first, then decode known text formats as UTF-8. Search plain canaries, URL-encoded forms, JSON escapes, HTML entities, base64 forms, and key-like patterns.

Keep a byte hash before and after any scrub step. The pair proves which file was checked and stops a later file swap from hiding a leak.

When a format cannot be decoded, fail with its path and type instead of skipping it. An unknown file is not safe merely because the text scanner cannot read it.

Scan archives after unpacking them into a second temp folder. A clean outer zip name says nothing about a secret stored in an inner HTML or JSON file.

Require the scanner to list every expected file, its size, and its scan state. This count makes a skipped empty file, failed report command, or unsupported format visible.

The [PII leakage guide](/blog/pii-leakage-testing-llm-guide-2026) covers application replies. Report scanning starts after that point and checks whether safe or unsafe run data was copied into files.

## Promptfoo report secret redaction testing example: scenario and assertion matrix

This promptfoo report secret redaction testing example uses one canary per field and one exact file set. Each row has a safe result and a failure that cannot be confused with a model-quality score.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Baseline scrub | Canaries in config, request, reply, and error | No encoded canary; case ID and score remain | Any canary hit or lost case record | Promptfoo output guide |
| Nested boundary | Secret inside a list and nested object | Full tree scanned in JSON and YAML | Scanner checks only top-level text | \`seed-skills/prompt-testing/SKILL.md\` |
| HTML leak | Canary in escaped prompt and script data | No text, entity, or script-data hit | Visible or hidden HTML holds the canary | Promptfoo report fixture |
| Repeated run | Two jobs with different canary sets | Each folder is clean and keeps its own run ID | Stale file or cross-run secret remains | Machine-readable CI output |
| Upload failure | Scan is skipped or report is missing | Job stops before artifact upload | Empty set, partial set, or upload still runs | CI scan manifest |

The baseline row must check both secrecy and use. If case IDs or scores vanish, the report cannot support triage and should fail even when the canary scan is clean.

Nested values often reach exports through config, variables, provider data, and reasons. Parse known formats, but also scan raw text so parser errors do not turn malformed files into false passes.

For HTML, search text nodes, attributes, comments, script blocks, and encoded forms. A browser screenshot cannot prove that hidden source lacks a credential.

The [blog index](/blog) links other test gates, but this matrix has one rule: no artifact crosses the upload step until the planned set is complete and clean. Keep that upload rule in code so a job edit cannot bypass it by mistake.

## What failures expose Promptfoo output secret scanner?

A Promptfoo output secret scanner needs seeded red tests. Copy one raw canary into each format after generation and prove that the scan stops the job with the right file and label.

Test encoded forms because each output path may escape data differently. Include URL encoding, HTML entities, JSON Unicode escapes, line wrapping, and base64 only when that encoding is used by the real job.

Test split strings with care. A secret may be broken by HTML markup or line wrapping, so build a normalized scan view while still retaining the raw file hash.

The second example scans known canaries and keeps safe evidence fields. It reports labels, not values, and rejects an empty artifact list before any file is published.

\`\`\`typescript
const expected = ['results.json', 'results.yaml', 'results.html', 'stdout.log', 'stderr.log'];
const files = await collectTextArtifacts(root);

expect(files.map((file) => file.name).sort()).toEqual(expected.sort());

const findings = files.flatMap((file) =>
  scanForms(file.text, canaries).map((match) => ({
    file: file.name,
    label: match.label,
    form: match.form,
  })),
);

expect(findings).toEqual([]);

const safeJson = JSON.parse(files.find((file) => file.name === 'results.json')!.text);
expect(readCaseIds(safeJson)).toEqual(['privacy-01', 'privacy-02']);
expect(readScores(safeJson)).toEqual([1, 0]);
expect(uploadLedger).toEqual([]);
\`\`\`

Add a test that makes \`collectTextArtifacts\` return an empty array. The expected result is a hard failure, since zero findings over zero files proves nothing.

Add another test that removes the case ID during redaction. The scan may find no secret, but the evidence-retention assertion must stop the publish step.

Watch terminal output from the scanner itself. A poor failure message can leak the matched value even when the target report was scrubbed correctly.

Use a short safe fingerprint when two hits need comparison. A one-way digest prefix can tie findings to a planted canary without placing its full text in CI logs.

The [prompt injection guide](/blog/prompt-injection-testing-guide-2026) explains how hostile text can reach an eval. The report gate assumes any input may be private and applies the same byte-level rule to each file.

## How should redact Promptfoo HTML report run in CI?

To redact Promptfoo HTML report safely in CI, place the scan between report creation and artifact upload. The upload task must depend on a clean manifest rather than run after the eval regardless of status.

Use a fresh work folder for each job and reject files older than its start time. This check prevents an old clean report from hiding a failed new export.

Name every expected artifact in code, not through a broad glob alone. A glob can miss a renamed format without failing, while an inventory comparison shows the gap.

Keep the raw unredacted fixture inside the test process or a short-lived protected folder. Do not upload failed raw files merely to help debug the very leak that blocked them.

Publish a small safe scan manifest instead. It can include report name, byte size, hash, canary-label count, safe-field count, scan version, and pass state.

Run the scanner when Promptfoo exits with a failure as well as success. Provider error bodies and assertion reasons often appear only on failed paths, which makes them key scan targets.

Set the final workflow rule so a failed scan blocks all share, upload, cache, and notification steps that attach files. A later manual override should require a new clean artifact, not a waiver for the leaked one.

The [Promptfoo red-team article](/blog/promptfoo-red-teaming-llm-applications) helps place the job beside security runs. Use the [skills directory](/skills) for more CI controls, but keep one privacy manifest as this gate's release proof.

## Which assertions verify Promptfoo CI artifact privacy?

Promptfoo CI artifact privacy begins with set equality. The expected artifact names must equal the scanned names, and every scanned file must have a nonzero size unless its format permits an empty log.

Next, require zero matches across all canary labels and forms. Report the file, label, encoding form, and byte range while withholding the matched text.

Add pattern checks for key types that can enter outside the planned fixtures. Use strict prefixes and checksums where possible because broad entropy rules can flag harmless IDs and train teams to ignore warnings.

Then assert the safe fields. Every planned case ID, pass state, numeric score, safe reason code, and owner should appear exactly once in the clean report or its safe summary.

Check absence of raw prompts and replies when policy forbids them. A report can pass all fake-key checks yet still expose a private user message.

Verify order around the trust line. The upload ledger must remain empty until the scan manifest reports a complete file set and zero findings.

Scan stdout and stderr after all cleanup hooks run. A trap, stack trace, or failure reporter may print a secret after the main report scan has already passed.

The [PII leakage article](/blog/pii-leakage-testing-llm-guide-2026) adds data-class fixtures for names and account details. This gate uses those classes only in safe fake form and checks the files built by Promptfoo and CI.

## Step-by-step test implementation

Build the gate from a data map, not from a loose list of regular expressions. Each canary needs a source field, expected report paths, allowed safe label, and set of encoded forms.

1. Read \`seed-skills/promptfoo-llm-red-teaming/SKILL.md\` and inventory its machine-readable result command, pinned CI cases, reports, logs, and every later artifact-upload step.
2. Read \`seed-skills/prompt-testing/SKILL.md\`, then create fake unique canaries for provider keys, headers, prompts, nested variables, model replies, assertion reasons, errors, and private data fields.
3. Run a local fixed eval into a new work folder, capture stdout and stderr, generate each CI report format, and unpack any archive into an isolated scan folder.
4. Scan raw and normalized forms, require the full expected file set, and prove that case IDs, scores, safe reason codes, and owners remain after redaction.
5. Seed one leak per format, test encoded and nested forms, remove a safe field, skip a file, and require each fault to stop the upload ledger.
6. Run the focused scan in CI on success and error paths, publish only the safe manifest, remove raw temp files, and assign each finding to its source owner.

Start with one canary and one JSON report so a failure is easy to read. Add YAML, HTML, logs, and archives only after the first path detects both raw and encoded leaks.

Keep the scanner independent from the code that performs redaction. A shared bug should not be able to hide a value and also tell the test that the same value is gone.

Test the scanner with one clean file and one seeded leak before it scans Promptfoo output. This control pair proves both the pass and stop paths work in the current job.

Run that pair after scanner rule changes as well as report changes. A new pattern should not make all files fail or let the known leak pass.

Version the scan rules and fixture map together. A format change should create a clear diff in expected file names, parser paths, and seeded negative cases.

The [Promptfoo complete guide](/blog/promptfoo-complete-guide-2026) can guide the wider eval config. The privacy procedure should remain cheap enough to run before every artifact leaves the job.

## Failure triage and regression ownership

Start triage with the finding label and source field. A key from provider config belongs to config handling, while a private prompt in a result row belongs to report policy or output selection.

A hit found only in HTML often points to embedded script data, comments, or escaped attributes. Compare the raw file range with the same case in JSON without copying the secret into a ticket.

A hit found only in stderr can come from a thrown error, debug flag, shell trace, or test reporter. Assign it to the layer that wrote the line, not to the scanner that detected it.

Missing files belong to report creation or the scan inventory. A clean partial set is still a gate failure and should never be relabeled as a privacy pass.

Lost case IDs, scores, or owners belong to the redaction transform. That path is overbroad even though it removed every planted secret.

If upload occurred before the scan, treat it as a workflow-order defect. Delete or restrict the leaked artifact through the CI system's normal incident path, then rerun with a new canary set.

The decision path stays short: find the source field, locate the first unsafe file, verify scan coverage, check safe evidence, and inspect upload order. The [prompt injection article](/blog/prompt-injection-testing-guide-2026) is a later input-risk path, not a substitute for this artifact review.

## Frequently Asked Questions

### How do you scan Promptfoo JSON, HTML, YAML, and CI artifacts for credentials, private prompts, PII, and unsafe config values before publishing reports?

Plant unique fake canaries in every sensitive source, generate all real job formats, and scan raw plus encoded forms before upload. Require the exact artifact inventory and zero findings. Also assert that case IDs, scores, safe reasons, and owners remain, because deleting the whole report is not valid redaction.

### What fixture best tests how to promptfoo report secret redaction testing?

Use a local fixed eval with one distinct canary in each provider key, header, prompt, nested variable, reply, assertion reason, and error. Create JSON, YAML, HTML, stdout, and stderr files in a fresh folder. This fixture maps each detected leak back to one planned source without using real private data.

### Which failure signal proves promptfoo report secret redaction testing example?

A useful failure names the file, canary label, encoded form, and byte range without printing the matched value. The gate should also fail when an expected file is missing or safe case evidence disappears. These signals distinguish an actual leak, incomplete scan, and overbroad scrub from one another.

### How should CI report Promptfoo output secret scanner?

Publish a safe manifest containing each file name, size, hash, scan version, finding count, safe-field count, and final state. Keep raw failed artifacts inside the protected job and remove them after triage. The upload ledger should prove that no report moved before the scan returned a complete clean result.

### When should redact Promptfoo HTML report block a release?

Block when any canary appears in visible text, attributes, comments, script data, or encoded source. Also block when HTML is absent, stale, unscanned, or stripped of required case evidence. A screenshot or clean rendered page cannot prove that hidden source and embedded data are safe to share.

### How can teams keep Promptfoo CI artifact privacy repeatable?

Pin the report and scanner versions, create a fresh work folder, list expected files, and generate a new fake canary set for every run. Seed known leaks in scanner tests and compare safe fields exactly. Run the same gate on success, provider error, assertion failure, and cleanup output paths.

## Conclusion

Promptfoo report secret redaction testing protects the exact files and logs that CI plans to retain. A valid pass combines a complete scan, zero secret hits, preserved case evidence, safe failure text, blocked early upload, and verified cleanup.

Open the [QA skills directory](/skills) to choose an AI testing skill, then read the [Promptfoo complete guide](/blog/promptfoo-complete-guide-2026) before placing this privacy gate ahead of every report upload. Make the clean scan manifest a required input for the upload job.`,
};
