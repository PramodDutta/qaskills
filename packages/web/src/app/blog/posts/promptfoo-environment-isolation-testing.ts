import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Promptfoo environment isolation testing',
  description:
    'Promptfoo environment isolation testing: use repo evidence, fixtures, code examples, and CI checks to expose AI contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'AI Testing',
  primaryKeyword: 'Promptfoo environment isolation testing',
  keywords: [
    'Promptfoo environment isolation testing',
    'how to promptfoo environment isolation testing',
    'promptfoo environment isolation testing example',
    'Promptfoo env variable precedence',
    'isolate Promptfoo CI credentials',
    'Promptfoo staging endpoint test',
  ],
  relatedSlugs: [
    'promptfoo-complete-guide-2026',
    'promptfoo-red-teaming-llm-applications',
    'prompt-injection-testing-guide-2026',
    'promptfoo-cli-tutorial-2026',
  ],
  sources: [
    'https://www.promptfoo.dev/docs/configuration/guide/',
    'https://www.promptfoo.dev/docs/red-team/configuration/',
    'https://www.promptfoo.dev/docs/red-team/troubleshooting/data-handling/',
  ],
  repoEvidence: [
    'seed-skills/promptfoo-llm-red-teaming/SKILL.md',
    'seed-skills/prompt-testing/SKILL.md',
  ],
  content: `Promptfoo environment isolation testing runs development, CI, and red-team cases in separate process environments, homes, cache directories, configs, and capture endpoints. A pass proves each run reads only its assigned credentials and follows documented configuration precedence. Any inherited production secret, shared cache record, or wrong endpoint causes a hard failure.

## What must Promptfoo environment isolation testing prove?

This test must show that each run has its own box of state. A dev run, CI run, and red-team run get their own keys, home, cache, config, web host, and files. The proof must also show that no state crossed those walls.

- A development run should receive only development credentials and its local or test endpoint. A CI run should receive a short-lived CI secret, a clean home, and a job-specific cache directory.

- A red-team run needs an equally explicit environment because generation, grading, and target evaluation can follow different network paths. The fixture should identify which provider handles each operation and which hosts are allowed.

- The contract also covers precedence. Command flags, config values, environment variables, and defaults must resolve in the documented order, with one captured result proving which source won.

- Isolation includes absence checks as well as positive values. A child process must not see a production key, a developer home path, a prior cache entry, or an endpoint outside its allowlist.

- The setup in seed-skills/promptfoo-llm-red-teaming/SKILL.md loads provider credentials from environment variables. It also separates deterministic pull-request checks from broader nightly red-team work, giving the runs distinct roles.

- The reproducibility rules in seed-skills/prompt-testing/SKILL.md call for pinned model settings, logged parameters, controlled caches, and versioned data. Those rules support a process fixture whose full input can be reviewed.

- The [Promptfoo complete guide](/blog/promptfoo-complete-guide-2026) explains normal configuration and evaluation. This article owns cross-environment leakage, precedence, endpoint selection, and shared-state defects.

- A passing test therefore proves both selection and containment. Correct output alone is insufficient when the request used a production key or a stale cache item from another job.

## Which repository behavior defines the test contract?

The repo reads model keys from the child process, then runs pull-request and night jobs on their own paths. The test keeps that split but swaps real model hosts for local stubs. This makes each key and path safe to check.

- In seed-skills/promptfoo-llm-red-teaming/SKILL.md, setup exports provider keys before Promptfoo runs. A child process can observe whether the intended variable exists, but the test artifact should record only a fingerprint or key label.

- The same file runs a deterministic pinned suite for pull requests and fresh generative attacks on a nightly schedule. Separate config paths and process environments prevent one cadence from inheriting the other's providers or data.

- The official [Promptfoo configuration guide](https://www.promptfoo.dev/docs/configuration/guide/) says environment variables used in templates resolve when configuration loads. It also warns that copying secrets into config environment fields can expose them in exported results.

- That load-time behavior means the test must start a fresh process after setting each environment. Changing a parent variable after one long-running process loaded its config does not prove isolation.

- The official [red-team configuration reference](https://www.promptfoo.dev/docs/red-team/configuration/) documents precedence led by command-line flags, followed by configuration values and environment settings. A controlled conflict should prove that order instead of assuming it.

- The [Promptfoo data handling guide](https://www.promptfoo.dev/docs/red-team/troubleshooting/data-handling/) distinguishes local target evaluation from local or remote generation and grading. It also explains that disabling one remote generation path is not complete network isolation.

- Seed-skills/prompt-testing/SKILL.md adds cache discipline and ground-truth separation. A clean test home and cache path keep one environment's result from satisfying another environment's request.

- The [Promptfoo red-team guide](/blog/promptfoo-red-teaming-llm-applications) covers attack design. Here, the key output is a process manifest that proves where configuration, credentials, network traffic, and artifacts came from.

## How to promptfoo environment isolation testing?

Start one new child process for each run kind. Give it a short list of allowed names, a new home, a new cache, one config, one result path, and one local web stub. Do not pass the full parent map.

- Do not spread the parent's full environment and then delete two known secrets. Start with required operating variables and add only the credentials, paths, and flags assigned to that run.

- Use canary values that identify their environment without resembling real secrets. A development key might carry a dev fingerprint, while CI and red-team keys carry different fixed fingerprints.

- Bind each capture server to loopback and a unique port. The server should save request host, path, headers after redaction, process run ID, and payload hash without forwarding anything.

- The first code example provides three small configs based on the split in seed-skills/promptfoo-llm-red-teaming/SKILL.md. A custom capture provider reads the assigned endpoint and writes evidence rather than calling a model.

\`\`\`yaml
# evals/ci.yaml
description: CI isolation contract
prompts:
  - file://prompts/support.txt
providers:
  - id: file://providers/capture-provider.cjs
    label: ci-capture
tests:
  - vars:
      question: Which environment handled this request?
    assert:
      - type: contains
        value: ci
env:
  RUN_KIND: ci

# evals/redteam.yaml uses a distinct run label and provider endpoint.
# Secrets remain in the child process environment, never in this file.
\`\`\`

- The config contains a nonsecret run label only. Provider credentials and target URLs remain in the process map, where the harness can vary them without writing secret material into exported config.

- Launch each config sequentially first, then launch them together. Promptfoo environment isolation testing should produce the same per-run manifest under both schedules.

- Use the [Promptfoo CLI tutorial](/blog/promptfoo-cli-tutorial-2026) for ordinary command syntax. The isolation harness wraps that command and checks its process boundary rather than changing Promptfoo internals.

- The [QA skills directory](/skills) can provide related security fixtures. Keep all canaries synthetic and ensure the test never reads a workstation's real production environment.

## Promptfoo environment isolation testing example: scenario and assertion matrix

The main case grid needs clean runs and planned clashes. Put one value in a flag, config, and process map, then check which one wins. Reuse a prompt across two caches and prove that both stubs still receive their own call.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Development baseline | Dev key, dev home, dev cache, loopback endpoint A | Only dev labels and paths appear | CI or production canary is visible | seed-skills/promptfoo-llm-red-teaming/SKILL.md |
| CI precedence | Config and command flag provide different concurrency values | Command flag wins and source is recorded | Config silently overrides the flag | [red-team configuration](https://www.promptfoo.dev/docs/red-team/configuration/) |
| Red-team network | Local target plus explicit generation provider | Only allowlisted hosts receive requests | Undeclared remote host is contacted | [data handling guide](https://www.promptfoo.dev/docs/red-team/troubleshooting/data-handling/) |
| Cache boundary | Same prompt hash in two empty cache directories | Both runs execute their own provider call | Second run reuses first run data | seed-skills/prompt-testing/SKILL.md |
| Secret export | Canary key exists only in child environment | Result files contain no key value | Config or result includes the canary | [configuration guide](https://www.promptfoo.dev/docs/configuration/guide/) |

- The development baseline catches accidental parent spreading with one forbidden canary. Include several realistic variable names, but save only which names were present and whether their fingerprints matched.

- The precedence row needs a field visible in output or captured provider context. Concurrency, provider label, or a harmless custom flag can prove the winning source without placing a secret in configuration.

- The red-team network row should monitor DNS or requests at a controlled adapter layer. A disabled remote-generation flag alone cannot prove that telemetry, sharing, configured providers, or other remote paths stayed inactive.

- The cache row uses equal prompt content to maximize the chance of a bad shared hit. Different cache directories and fresh homes should still yield two provider captures.

- The secret-export row scans only files created inside the temporary run root. It should report file paths and matching canary IDs while avoiding any real credential value.

- Use the [prompt injection testing guide](/blog/prompt-injection-testing-guide-2026) for attack content after isolation passes. Cross-environment safety should not depend on whether a model rejects a prompt.

## What failures expose Promptfoo env variable precedence?

Fault tests should leak one safe canary or share one path at a time. Pass a dev key to CI, point red-team work at the wrong stub, share a cache, or swap the order rule. Each fault must name the run and bad field.

- Create one harmless setting in the process environment, config file, and command flags with three distinct values. The run manifest should record the command value and label its source as the flag.

- Then remove the flag and rerun with config plus environment values. The config value should win where the documented rule applies, proving the test can distinguish each precedence tier.

- Secrets need a different check because they should not be copied into config merely to test ordering. Use canary names, provider selection, or a stub that reports a fingerprint from its process environment.

- Inject a developer key into the parent shell but omit it from the CI allowlist. If the child sees that canary, the launcher spread too much state even when the intended CI key also exists.

- Inject one shared home path across CI and red-team runs. The expected failure should name the duplicated path before either command starts, preventing accidental cache and config overlap.

- The second code example derives its environment map from the explicit setup pattern in seed-skills/promptfoo-llm-red-teaming/SKILL.md. It spawns Promptfoo with a minimal map and checks a redacted capture manifest.

\`\`\`typescript
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from 'vitest';

function runIsolated(kind: 'dev' | 'ci', port: number) {
  const root = mkdtempSync(join(tmpdir(), 'promptfoo-isolation-'));
  const resultPath = join(root, 'capture.json');
  const env = {
    PATH: process.env.PATH ?? '',
    HOME: join(root, 'home'),
    PROMPTFOO_CACHE_PATH: join(root, 'cache'),
    RUN_KIND: kind,
    PROVIDER_KEY: 'canary-' + kind,
    TARGET_URL: 'http://127.0.0.1:' + port,
    CAPTURE_PATH: resultPath,
  };
  const run = spawnSync(
    'npx',
    ['promptfoo', 'eval', '--config', 'evals/' + kind + '.yaml'],
    { cwd: root, env, encoding: 'utf8' },
  );
  return { root, resultPath, status: run.status };
}

test('CI receives no developer process state', () => {
  const run = runIsolated('ci', 43111);
  const capture = JSON.parse(readFileSync(run.resultPath, 'utf8'));
  expect(run.status).toBe(0);
  expect(capture).toMatchObject({
    runKind: 'ci',
    endpoint: 'http://127.0.0.1:43111',
    keyFingerprint: 'ci',
  });
  expect(JSON.stringify(capture)).not.toContain('canary-dev');
  expect(capture.cachePath.startsWith(run.root)).toBe(true);
});
\`\`\`

- Add a negative version that uses the parent's complete environment and expects the dev canary scan to fail. This proves the absence assertion can catch the exact launcher mistake it guards.

- The [Promptfoo complete guide](/blog/promptfoo-complete-guide-2026) can help debug config parsing. Do not weaken an isolation assertion because a config happens to produce acceptable model output.

## How should isolate Promptfoo CI credentials run in CI?

Give the CI job a fresh child process and a short list of names. Its key should have a short life, and all paths should sit under one job root. The job must not use the runner home or a shared cache.

- Allocate the home, config, cache, and output directories under one job-specific temporary root. Record normalized paths and assert that every created file remains inside that root.

- Use a local capture provider for pull-request isolation tests. Provider-backed quality or red-team runs can follow later in trusted jobs after the process contract passes.

- Disable optional network features as policy requires, then verify observed hosts rather than trusting flags alone. The data handling documentation makes clear that one remote-generation control does not disable every network path.

- Redact values at capture time and scan artifacts for synthetic canaries before upload. A hash or last-four fingerprint is enough to prove which credential reached the stub.

- Give development, pull-request, and nightly work separate cache keys and directories. If caching is deliberately shared, test an explicit namespace that includes environment, provider, prompt version, and policy identity.

- Fail on a missing manifest, unexpected host, path escape, forbidden variable name, duplicate cache root, or secret canary in output. An empty capture cannot pass because it may mean the provider never ran.

- Run the regular [Promptfoo red-team guide](/blog/promptfoo-red-teaming-llm-applications) suite only after the isolation check. This order prevents an expensive attack run from targeting the wrong service.

- Retain command arguments, config hash, package version, run kind, allowed hosts, observed hosts, and artifact scan result. Exclude raw environment values from the retained report.

## Which assertions verify Promptfoo staging endpoint test?

Check the host that saw the call, not just a staging name in a file. Save host, port, path, method, run ID, and a safe key mark at the stub. Also prove that each due call took place.

- Assert that every observed host belongs to the run's allowlist. Also assert that each required local or staging endpoint received the expected number of requests, so total network silence cannot pass.

- Assert credential fingerprints at the receiving stub when safe. This detects a staging endpoint reached with a production credential, which an endpoint-only check would miss.

- Assert process environment names against an allowlist and denylist. Record names and fingerprints only, because storing full values would turn the test report into a secret leak.

- Assert home, cache, config, temporary, and result paths are descendants of the run root. Resolve symbolic and relative paths before comparison when the launcher permits them.

- Assert that concurrent runs use different ports and roots. Equal prompt content should still produce one capture per environment when caches are separate.

- Assert config precedence with controlled nonsecret values and a source label. A correct endpoint chosen by accident does not prove future conflicts will resolve safely.

- Assert cleanup after evidence upload, then confirm cleanup does not remove another run's files. Use unique roots rather than broad deletion patterns in shared CI.

- The [Promptfoo CLI tutorial](/blog/promptfoo-cli-tutorial-2026) explains command execution, while this test adds containment evidence. Keep endpoint checks at the transport boundary instead of relying on generated text.

## Step-by-step test implementation

List all state the tool may read or write before code starts. Mark which run owns each key, path, host, and file. The launch step should stop at once when two runs share state that the plan says must stay split.

1. Read seed-skills/promptfoo-llm-red-teaming/SKILL.md and seed-skills/prompt-testing/SKILL.md, then list every credential, config, endpoint, cache, network path, and artifact used by each run kind.
2. Create synthetic dev, CI, and red-team canaries, plus separate temporary homes, cache roots, configs, outputs, loopback capture ports, and host allowlists.
3. Launch fresh Promptfoo child processes from minimal environment maps, preserving only required operating variables and each run's assigned state.
4. Capture resolved run kind, config hash, endpoint, credential fingerprint, cache path, observed hosts, request count, and result location without storing secret values.
5. Inject parent environment spread, precedence conflicts, shared cache roots, wrong endpoints, forbidden hosts, and secret export, then require stable failures.
6. Run sequential and concurrent cases in CI, scan retained artifacts, clean only owned roots, and release provider-backed work after every isolation assertion passes.

- Start with the process launcher and capture provider before adding real evaluation content. A one-line prompt is enough to prove environment selection, network routing, and cache separation.

- Add a preflight validator that rejects equal roots or ports. Early validation gives a clearer error than diagnosing contaminated results after two processes finish.

- Run each fixture under the same package and Node versions used by production CI. Version drift can change default directories or config parsing even when your wrapper is unchanged.

- Use the [AI testing skills directory](/skills) for related Promptfoo practices, but keep the environment inventory beside the launcher code. Reviewers need one place to see allowed state.

- After the expected path passes, run the leaked-parent mutation in a dedicated test. The failure should identify a forbidden variable name and run kind without printing its value.

- Finish by scanning config, JSON, logs, and reports for every synthetic canary. This provides direct proof that a process-only secret did not become stored output.

## Failure triage and regression ownership

Start with the run sheet, since it shows both what went in and what the stub saw. Check run kind, file hash, root paths, web hosts, and call counts first. Model text cannot fix a key or path leak.

- A forbidden variable belongs to the process launcher or CI environment policy. Remove broad environment spreading rather than adding the variable to an ever-growing ignore list.

- A wrong endpoint with correct process variables belongs to config resolution or provider setup. Compare the controlled precedence record and the exact config loaded by the child.

- A correct endpoint with the wrong credential fingerprint belongs to secret mapping. Rotate any real affected key, then repair environment scoping and add the leaked name as a canary.

- A shared cache hit belongs to cache path construction or namespace policy. Do not disable every cache merely to pass; prove that the key includes every required isolation dimension.

- An unexpected remote host belongs to configured providers, telemetry, sharing, remote generation, or another network feature. The [data handling article](/blog/promptfoo-red-teaming-llm-applications) can guide review, but captured traffic remains the deciding evidence.

- A secret canary in results belongs to config templating, provider logs, or artifact capture. Keep the failing artifact restricted, record the matching file path, and prevent upload until redaction is fixed.

- If sequential cases pass while concurrent cases fail, inspect shared ports, fixed file names, global homes, and process-wide caches. Concurrency often reveals hidden defaults that isolated serial runs cannot expose.

- Any intentional network or precedence policy change needs a reviewed manifest update. A model-quality owner should not approve a broader host allowlist without security and platform review.

## Frequently Asked Questions

### How do you prove Promptfoo development, CI, and red-team runs use isolated credentials, endpoints, cache paths, and configuration precedence?

Launch each run in a fresh child process with a minimal environment, unique temporary root, separate cache, explicit config, and capture endpoint. Assert credential fingerprints, resolved settings, observed hosts, request counts, and artifact paths. Then run the same fixtures concurrently and confirm their manifests remain disjoint.

### What fixture best tests how to promptfoo environment isolation testing?

Use three synthetic run profiles plus intentional conflicts. Give dev, CI, and red-team profiles distinct canaries, homes, caches, configs, ports, and host allowlists. Add parent-secret leakage, shared-cache, precedence, wrong-endpoint, unexpected-host, and secret-export mutations so every isolation rule has a proven failure signal.

### Which failure signal proves promptfoo environment isolation testing example?

A strong signal names the run and violated boundary, such as CI observed forbidden variable DEV_KEY or red-team contacted an unapproved host. Include redacted fingerprints and normalized paths. A wrong generated answer does not prove isolation failure because prompt, model, assertion, or provider behavior may be responsible.

### How should CI report Promptfoo env variable precedence?

CI should record the tested field, candidate sources, resolved nonsecret value, and winning source label. Keep command arguments and config hash with the result. For secrets, report only allowed variable names and fingerprints. Fail when the winning source differs or a lower-priority value leaks elsewhere.

### When should isolate Promptfoo CI credentials block a release?

Block on any forbidden variable, production fingerprint, shared root, wrong endpoint, unexpected host, missing capture, secret in an artifact, or unresolved precedence conflict. Also block when the process inherits the full runner environment. These defects can target real systems even when every evaluation assertion passes.

### How can teams keep Promptfoo staging endpoint test repeatable?

Use loopback capture servers, fixed synthetic canaries, fresh process roots, pinned tool versions, and stable config hashes. Assert request counts and resolved destinations rather than model text. Run sequential and concurrent variants, then retain redacted manifests so endpoint, credential, cache, and network changes remain easy to compare.

## Conclusion

Promptfoo environment isolation testing is credible when every run has an independent process map, root, cache, config, endpoint, and network policy. The release gate should catch parent leakage, precedence drift, shared state, wrong credentials, undeclared traffic, and stored secret canaries before provider-backed evaluation begins.

Open the [AI testing skills directory](/skills) to choose a Promptfoo skill, then read the [Promptfoo complete guide](/blog/promptfoo-complete-guide-2026) before implementing this regression gate. Keep the redacted run sheet so each new job has a safe base.`,
};
