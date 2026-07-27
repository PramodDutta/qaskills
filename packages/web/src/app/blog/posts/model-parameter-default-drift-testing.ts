import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Model parameter default drift testing',
  description:
    'Model parameter default drift testing: use repo evidence, fixtures, code examples, and CI checks to expose AI contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'AI Testing',
  primaryKeyword: 'Model parameter default drift testing',
  keywords: [
    'Model parameter default drift testing',
    'how to model parameter default drift testing',
    'model parameter default drift testing example',
    'LLM default parameter regression',
    'pin model sampling settings',
    'SDK model default change test',
  ],
  relatedSlugs: [
    'golden-dataset-llm-evaluation-guide',
    'eval-dataset-versioning-guide-2026',
    'testing-llm-applications-guide',
    'llm-non-determinism-flaky-eval-guide-2026',
  ],
  sources: [
    'https://platform.openai.com/docs/models',
    'https://www.nist.gov/itl/ai-risk-management-framework',
    'https://deepeval.com/docs/evaluation-end-to-end-single-turn',
  ],
  repoEvidence: ['seed-skills/ai-agent-eval/SKILL.md', 'seed-skills/prompt-testing/SKILL.md'],
  content: `Model parameter default drift testing resolves omitted temperature, seed, token limit, tool choice, and sampling values under both old and upgraded adapters, then compares effective request manifests. A passing system pins behavior-changing settings or exposes every changed default for review. Silent manifest changes, missing origins, and unapproved output differences must stop the SDK upgrade.

## What must Model parameter default drift testing prove?

Model parameter default drift testing must prove that the final model request stays clear when app code leaves out a setting. Each output-changing field needs a final value, source, SDK release, model ID, and link to the run record used by the test.

Source code may look unchanged while an SDK, its wrapper, or a model alias supplies new defaults behind the same app call. Temperature, seed, output limits, tool choice, top-p sampling, stop rules, and parallel tool settings can all change output, cost, or tool use.

The safest rule sends a clearly set value for each output control that the chosen model and SDK support. When a field must stay blank, the SDK layer must resolve it and show the old and new values during upgrade review.

This contract does not promise the same model text. The [non-determinism guide](/blog/llm-non-determinism-flaky-eval-guide-2026) handles variable outputs, while this gate proves which settings produced each run.

Create two fixed SDK fixtures named old and new, with all other code and test data held the same. Give them changed defaults, resolve the same app request through both, and check the final run records before any network call.

A clearly set request should remain unchanged across SDK layers and should send the same field on the wire. An omitted setting should either trigger a rule error or appear as a reviewed diff with old value, new value, and default source.

The run record should distinguish \`application\`, \`adapter_default\`, and \`provider_default\` sources. A value without source cannot prove whether the team intentionally chose it.

Include unsupported settings in the contract and state whether the app must stop, warn, or use another model. If an upgraded SDK layer drops \`seed\` or renames a token field, the test must report lost control rather than quietly omit the value.

Run output fixtures only after all run-record checks pass for both SDK fixtures and each planned model. A text difference can support later work, but a clear setup diff gives the first stable release signal.

Use the [evaluation dataset versioning guide](/blog/eval-dataset-versioning-guide-2026) for inputs and expected outputs. Keep SDK and run-record releases beside test-set releases so past runs can be rebuilt from the same facts.

## Which repository behavior defines the test contract?

Lines 21 through 27 of \`seed-skills/ai-agent-eval/SKILL.md\` require repeatable test pipelines with all key run facts pinned. They specifically call for pinned model versions, temperatures, seed values, and system prompts.

That repo rule makes final setup part of the test proof for each saved result and later trend. It does not claim each host supports the same settings, so the SDK contract must record support and field mapping in clear terms.

Lines 724 through 741 of \`seed-skills/prompt-testing/SKILL.md\` recommend tests at more than one temperature and warn against ignored model-version changes. These practices support a small setting matrix and a gate for SDK upgrades.

Read the request flow in order and save proof at each step where a field can change or be lost. App options enter the SDK layer, defaults and field maps produce host fields, the sent request leaves the process, and the run record stores final values.

Seen input includes the app request, SDK layer release, SDK release, model ID, and the old or new default table. Seen output includes the sent request, final run record, source for each value, warnings, and unsupported fields.

The [OpenAI model catalog](https://platform.openai.com/docs/models) documents available model families and IDs for API requests. Record the exact model ID used by the app instead of treating a broad family name as enough upgrade proof.

The [DeepEval single-turn guide](https://deepeval.com/docs/evaluation-end-to-end-single-turn) describes logging model and other hyperparameters with eval runs. Extend that proof with each final SDK setting that can change output or tool use.

The [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) provides a lifecycle approach to managing AI risk. A reviewed default diff applies that approach at the package-change boundary with named ownership and retained proof.

Separate source facts from local fixture rules so a reviewer can see which parts come from code and which are team choices. The repo requires pinning and variation tests, while the project decides supported settings, allowed omissions, and approval rules.

The [testing LLM applications guide](/blog/testing-llm-applications-guide) covers wider output checks across prompts, data, and model runs. Run this setup gate first so later score changes can be tied to one known request and run record.

## How to model parameter default drift testing?

How to model parameter default drift testing begins with one shared request shape that does not depend on a single SDK. Include each setting the app intends to control and a source for each resolved value.

Create SDK snapshots for the installed release and the proposed release, then keep both files under review with the test. Do not infer old output from a live host after the upgrade, because that reference may no longer exist.

Resolve the same app request against both snapshots and capture the wire body before any call leaves the test. Send fields through the real SDK boundary, then map only known field-name changes into the shared run record.

Do not hide missing values, unsupported settings, or changed types during this mapping step. Those facts are the core proof that an upgrade altered app control.

The TypeScript example below uses clearly set values before SDK defaults and retains each source in the result. Its diff function checks shared fields rather than generated text, so the test stays local and fast.

\`\`\`typescript
type SamplingOptions = {
  temperature?: number;
  seed?: number;
  maxOutputTokens?: number;
  toolChoice?: 'auto' | 'required' | 'none';
  topP?: number;
};

type EffectiveValue<T> = {
  value: T;
  origin: 'application' | 'adapter_default';
};

function buildManifest(
  options: SamplingOptions,
  defaults: Required<SamplingOptions>,
) {
  const resolve = <K extends keyof SamplingOptions>(key: K) => ({
    value: options[key] ?? defaults[key],
    origin: options[key] === undefined ? 'adapter_default' : 'application',
  });

  return {
    temperature: resolve('temperature'),
    seed: resolve('seed'),
    maxOutputTokens: resolve('maxOutputTokens'),
    toolChoice: resolve('toolChoice'),
    topP: resolve('topP'),
  };
}

function changedFields(
  before: ReturnType<typeof buildManifest>,
  after: ReturnType<typeof buildManifest>,
) {
  return Object.keys(before).filter((key) => {
    const name = key as keyof typeof before;
    return JSON.stringify(before[name]) !== JSON.stringify(after[name]);
  });
}
\`\`\`

The helper makes blank fields visible but does not decide whether the app may ship them. A strict release rule can reject each \`adapter_default\` source for live requests until an owner reviews it.

Build one fixture with all fields clearly set and another with each field omitted in turn. Single omissions name the exact default that changed, while an all-omitted case checks the combined request and keeps field order stable.

Add null, zero, and false values where the SDK type permits them, and name their meaning in the case data. The SDK layer must distinguish an intentional zero from absence rather than replace it with a truthy fallback.

Capture the sent host request beside the shared run record and compare both with hand-written expected data. A correct run record with a wrong wire field still changes live output, so both views need checks.

Record unsupported fields with a typed status, model ID, SDK release, and the reason supplied by the bridge. If the new SDK rejects seed for one model, the review needs that fact before accepting less repeatable runs.

Use the [golden dataset guide](/blog/golden-dataset-llm-evaluation-guide) for stable output cases. Pair each output result with the shared run record so changed settings and changed outputs are not confused.

## Model parameter default drift testing example: scenario and assertion matrix

A model parameter default drift testing example should isolate set values, omitted values, edge values, renamed wire fields, and unsupported controls. Each case checks run records before the model runs, which keeps a host outage out of the result.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Explicit baseline | All five controls set by application | Old and new manifests match with application origins | Adapter overrides an explicit value | Reproducibility repository rule |
| Omitted temperature | Old default 0, new default 1 | Reviewable diff names value and origin | Same source code hides changed request | Versioned adapter fixtures |
| Zero token limit boundary | Explicit supported boundary value | Absence and zero remain distinct | Truthy fallback replaces zero | Canonical manifest contract |
| Renamed token field | SDK wire key changes across versions | Canonical value matches both serialized requests | New request drops the limit | Adapter translation test |
| Unsupported seed | New model cannot accept seed | Typed support change blocks or receives approval | Seed silently disappears | Complete configuration evidence |

The clearly set baseline should produce no changed shared fields across old and new SDK snapshots. If a new SDK layer transforms a set value, the sent-request check should name the wire difference and the field source.

The omitted-temperature case proves the main drift path without asking a model to create any text. Both values may be valid on their own, but an unreviewed change breaks the repeatable-run contract.

The zero boundary catches common \`value || default\` code. Use null only when the public API defines it, and assert its meaning separately from undefined.

The renamed-field case tests both old and new wire code with one shared expected value. Shared equality is needed, but the wire request must also contain the field expected by each SDK release.

The unsupported-seed case should not invent support that the new model or SDK does not offer. Return \`unsupported\` with model and SDK details, then apply the project's block or review rule.

Add a tool-choice case where omitted \`auto\` changes to a new default. Use a prompt with an available tool, but make run record drift the primary failure before checking calls.

Add a maximum-output case with responses near the old limit. The output fixture should detect truncation only after the request proof confirms which limit was sent.

Retain this matrix beside SDK snapshots and package-lock changes in the same review. A reviewer can connect package updates with each changed final field without reading generated output samples first.

The [dataset versioning guide](/blog/eval-dataset-versioning-guide-2026) can preserve output fixtures. Keep setup snapshots as separate files because a stable test set cannot prevent SDK drift.

## What failures expose LLM default parameter regression?

An LLM default parameter regression appears when the same app request resolves to changed final values after an SDK update without a reviewed setup diff. Inject changed defaults around one field at a time so each failed case has one clear cause.

First vary temperature while keeping each other default fixed. The omitted request must report one changed field, while a clearly set temperature request must report none.

Next vary maximum output tokens and tool choice. Assert both shared values and sent wire fields so a translation bug cannot hide behind a stable run record.

Then remove seed support from the new SDK layer. The gate should emit a typed support change with the model and SDK IDs rather than delete the field and continue.

Test \`0\`, \`1\`, empty stop lists, and false flags where supported. These values expose fallback expressions that mistake valid boundaries for omission.

The Vitest example below compares old and new defaults with both omitted and clearly set options. It proves that the harness catches drift with plain objects and no host call.

\`\`\`typescript
import { describe, expect, it } from 'vitest';

describe('effective model request manifest', () => {
  const oldDefaults = {
    temperature: 0,
    seed: 7,
    maxOutputTokens: 512,
    toolChoice: 'auto' as const,
    topP: 1,
  };
  const newDefaults = {
    ...oldDefaults,
    temperature: 1,
    maxOutputTokens: 1024,
  };

  it('reports changed defaults for omitted settings', () => {
    const before = buildManifest({}, oldDefaults);
    const after = buildManifest({}, newDefaults);

    expect(changedFields(before, after)).toEqual([
      'temperature',
      'maxOutputTokens',
    ]);
    expect(after.temperature).toEqual({
      value: 1,
      origin: 'adapter_default',
    });
  });

  it('keeps explicit settings stable across adapter versions', () => {
    const options = { temperature: 0, maxOutputTokens: 512 };
    const before = buildManifest(options, oldDefaults);
    const after = buildManifest(options, newDefaults);

    expect(changedFields(before, after)).toEqual([]);
    expect(after.temperature.origin).toBe('application');
  });
});
\`\`\`

Add an empty-run mutation where no run record is emitted. An output test cannot pass without setup proof, even if its one generated answer matches expectations.

Add a wire-code mutation that sends \`max_tokens\` to an SDK expecting another field. The captured request should fail while the shared run record shows the intended value.

Add a model-alias mutation where the final model ID changes. Treat model identity as a run record field even though it is not a sampling setting.

Finally, save and reload the run record. Values, sources, support states, releases, and changed-field order must remain stable for later checks.

## How should pin model sampling settings run in CI?

Pin model sampling settings in a fixed SDK contract stage on each SDK, host package, model setup, wire-code, or lockfile change. Keep this stage free from network calls so its failures point to app code or files.

Use a focused command such as \`pnpm vitest run tests/llm/effective-request.test.ts\`. Load tracked SDK snapshots and capture sent requests through local fakes before any broad model tests begin.

Run schema and support tests first. They should verify supported fields, types, aliases, model restrictions, and absence semantics before comparing defaults.

Run the clearly set value matrix next. Each value must survive the shared resolve step and wire write without SDK replacement or type coercion.

Run omitted-value checks after that. Require either the same final run records or a reviewed diff file naming each old value, new value, and source.

Retain package release, SDK release, model ID, app options, shared run records, wire requests, support changes, and the gate result. Redact secrets while preserving all output controls.

Block release on silent default changes, lost set fields, unsupported controls without a rule, missing run records, wrong model identity, or unreviewed diffs. A planned change can proceed only with updated fixtures and clear approval proof.

Place model output smoke tests in a later stage. They can reveal practical impact, but they should not replace set request-contract assertions.

Reset module caches and test env settings between cases. Process-level default overrides can make CI order decide which run record a test observes.

Use the [non-determinism guide](/blog/llm-non-determinism-flaky-eval-guide-2026) for repeated output checks. This setup gate should remain fixed even when the model is not.

## Which assertions verify SDK model default change test?

An SDK model default change test must assert input intent, final values, value sources, support rules, wire shape, releases, and report completeness. Output-only checks miss the earliest stable proof.

Assert the app option object exactly. This proves the source truly omitted a field rather than losing it during fixture setup.

Assert each shared setting has a value or a typed unsupported state. Missing keys should fail because absence can hide an SDK decision.

Assert each value's source is \`application\`, \`adapter_default\`, or another approved source. Never infer intent from the final number alone.

Assert clearly set values remain the same across SDK layers. Include zero, false, empty arrays, and exact limits where each type permits them.

Assert omitted values resolve under both snapshots and check them field by field. The diff should list changed values in stable order with old and new sources.

Assert the sent request contains the expected SDK field and value. Shared proof cannot compensate for an SDK layer that sends the wrong wire shape.

Assert support maps name supported, translated, ignored, and rejected controls for the selected model. An ignored control should block claims that runs can be repeated.

Assert exact SDK, bridge, model, and run-record releases. Past output cannot be explained if these IDs are aliases or missing.

Assert output fixtures reference the run record ID they used. This link prevents a score report from being joined with setup from another concurrent run.

Assert artifacts round-trip without type coercion. A numeric seed stored as text or an omitted source can corrupt later diff logic.

Use the [testing LLM applications guide](/blog/testing-llm-applications-guide) after this contract passes. Behavior tests have more value when each request setting and support result is already known.

## Step-by-step test implementation

Implement the upgrade gate from repo proof through SDK layer snapshots, run record check, failure injection, and retained CI output. Keep host run outside the fixed core.

1. Read \`seed-skills/ai-agent-eval/SKILL.md\` lines 21 through 27 and \`seed-skills/prompt-testing/SKILL.md\` lines 724 through 741, then list every setting and version that needs control.
2. Create canonical request and capability schemas plus old and new adapter snapshots containing defaults, supported fields, translations, model rules, and version identifiers.
3. Replay omitted and explicit temperature, seed, token limit, tool choice, top-p, and related settings through both real adapter boundaries using local request capture.
4. Assert application intent, effective values, origins, capabilities, serialized requests, model identity, and exact configuration diffs before any behavior test.
5. Inject changed defaults, unsupported controls, renamed fields, zero-value coercion, model-alias changes, missing manifests, and artifact type loss.
6. Run the focused suite in CI, retain both manifests and wire requests, reset process state, and assign configuration, adapter, SDK, provider, or reporting failures.

Start by defining the shared schema with no package-specific names. This becomes the stable check surface across SDK releases.

Build SDK layer snapshots from reviewed code and documentation, then freeze them as fixtures. Do not let the proposed SDK layer generate its own expected old output.

Run direct options through parsers before resolve step. This stage catches test env strings, null handling, and coercion before defaults enter.

Resolve and serialize each single-field case. Small fixtures identify exactly where an intended value changes or disappears.

Check all-omitted requests to expose combined drift. Then check fully set requests to prove the app can pin output across the same upgrade.

Attach output smoke results only after run record proof. A new output with stable settings and a new setting with stable output require new owners.

Finally, require reviewed run record updates alongside package upgrades. The pull request should show both code lock changes and the final request diff.

## Failure triage and regression ownership

Triage begins with app options, then follows parsed values, resolved run record, support map, sent request, host response, and output result. Stop at the first wrong representation.

If app options differ, config or fixture setup owns the failure. Check test-env sources and parsed types before inspecting the SDK.

If options match but resolved values differ, SDK defaults or resolve-step logic owns it. The old and new run-record fields show the exact change.

If the run record is correct but the wire request differs, wire code translation owns the defect. Capture field names, values, and SDK releases without sending the request.

If a setting becomes unsupported for the chosen model, the support rule owns the release result. Engineering should show the change rather than mimic support that the host does not offer.

If request proof is stable but output scores change, route investigation to model output, test set, prompt, or host. The setup gate has then ruled out one major source.

If the run record is missing or incomplete, trace and report code own a proof failure. No output result should become a baseline without its final request.

If only CI differs, inspect test env variables, module caches, lockfile resolve step, runtime release, and test order. Local fakes should make each request run record repeatable.

Use the [golden dataset guide](/blog/golden-dataset-llm-evaluation-guide) for downstream regression ownership. Keep the final run record attached so evaluators can distinguish input drift from model variation.

## Frequently Asked Questions

### How do you prove omitted temperature, seed, token limit, tool-choice, and sampling parameters do not silently change behavior after an SDK upgrade?

Resolve the same app request through frozen old and new SDK snapshots, then check shared run records and captured wire requests. Each setting needs a value, source, support state, and release. Clearly set requests must remain stable, while omitted-setting changes require a blocking, reviewable diff before any host run.

### What fixture best tests how to model parameter default drift testing?

Use old and proposed SDK snapshots with deliberately changed defaults, plus one all-omitted request and single-field set requests. Capture shared and sent forms locally. Include zero, false, empty, unsupported, and renamed-field cases so absence handling, type coercion, support loss, and wire errors become clear fixed failures.

### Which failure signal proves model parameter default drift testing example?

The clearest signal is one unchanged app request producing changed final values without a recorded diff. Also fail when set values are overridden, sources disappear, a wire field is dropped, support changes are hidden, model identity changes, or output results lack the exact run record used for that run.

### How should CI report LLM default parameter regression?

CI should report app options, old and new SDK releases, model ID, shared run records, value sources, support states, captured wire requests, and changed fields. Include the review status and output-fixture links. This proof separates setup, resolver, wire code, support, model, and report faults.

### When should pin model sampling settings block a release?

Block when output-changing settings rely on an unreviewed default, set values no longer reach the wire request, a required control becomes unsupported, or setup proof is missing. A planned setting change can pass only with updated fixtures, a named owner, a recorded reason, and linked downstream test results.

### How can teams keep SDK model default change test repeatable?

Freeze SDK snapshots, capture requests locally, avoid host calls, reset test-env and module state, and check typed shared run records. Version each fixture with SDK, bridge, and model IDs. Repeated runs should produce the same values, sources, support states, wire fields, change lists, and saved files on each worker.

## Conclusion

Model parameter default drift testing turns an SDK upgrade into a clear setup review. A trustworthy gate captures final values and sources, checks SDK support rules and wire requests, blocks silent changes, and links each later output result to the exact model run record that produced it.

Open the [AI testing skills directory](/skills) to choose a repeatable workflow, browse the [QA testing blog](/blog), then read the [golden dataset LLM evaluation guide](/blog/golden-dataset-llm-evaluation-guide) before implementing this gate. Pin supported controls first, and make each unavoidable default change visible before release.`,
};
