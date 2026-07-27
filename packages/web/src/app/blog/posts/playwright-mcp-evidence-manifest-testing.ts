import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright MCP Evidence Manifest Testing',
  description:
    'playwright mcp evidence manifest testing: validate every MCP evidence-manifest artifact. Use repo evidence, failure checks, and CI-safe QA steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'playwright mcp evidence manifest testing',
  keywords: [
    'playwright mcp evidence manifest testing',
    'playwright mcp artifact manifest',
    'validate browser agent evidence',
    'mcp screenshot trace inventory',
    'missing browser artifact test',
    'agent session evidence checksum',
    'playwright mcp output contract',
  ],
  relatedSlugs: [
    'playwright-mcp-browser-automation-guide',
    'playwright-screenshots-videos-traces-complete-guide',
    'observability-driven-testing-guide',
    'playwright-mcp-testing-capability-guide-2026',
  ],
  sources: [
    'https://playwright.dev/mcp/configuration/options',
    'https://playwright.dev/mcp/capabilities',
    'https://github.com/microsoft/playwright-mcp',
  ],
  repoEvidence: [
    'packages/web/src/app/blog/posts/pillar-playwright-mcp-2026.ts',
    'packages/web/e2e/article-factory-2026-07-25.e2e.ts',
  ],
  content: `Playwright MCP evidence manifest testing validates a QA-owned index that connects one agent run to every required screenshot, trace, console log, network log, and saved session. Check schema, normalized relative paths, file existence, size, optional checksums, sensitivity labels, uniqueness, and run ownership. Reject missing, corrupt, duplicate, or cross-run entries.

## What Does Playwright MCP Evidence Manifest Testing Control?

Playwright MCP evidence manifest testing controls the integrity of an evidence package produced around one browser-agent run. The manifest is a team-defined contract that indexes outputs; it is not presented here as a built-in Playwright MCP file format.

That distinction prevents false product claims. Playwright MCP can create screenshots, traces, video, output files, and saved session data under documented options or capabilities, while the QA system decides which files every run must retain.

A complete entry identifies the run, file type, relative path, byte size, media or content format, risk class, and checksum policy. The referenced file must exist inside the same run directory.

The manifest itself is only a claim. A passing check must resolve each path, inspect file facts, and reject a claim that points to nothing or escapes the run root.

Artifact existence is still not feature correctness. Screenshots and logs support review, but assertions against page behavior determine whether the browser task satisfied its product contract.

Use a requirement profile for each run type. A visual smoke run may require a screenshot and console log, while a diagnostic run may also require a trace, network log, and saved session record.

The [Playwright MCP browser guide](/blog/playwright-mcp-browser-automation-guide) explains agent operations and safety boundaries. This article adds a deterministic package check after those operations produce evidence.

Playwright MCP evidence manifest testing passes only when the profile and manifest agree and every declared file belongs to the run. Sensitive outputs must also follow their retention rules.

## How Does Playwright MCP Artifact Manifest Work?

A Playwright MCP artifact manifest works as a small JSON document written after artifact-producing tools finish and before the run directory is published. A validator reads it without trusting its paths or metadata.

The official [MCP configuration options](https://playwright.dev/mcp/configuration/options) document an output directory, saved session data, and automatic video recording options. They establish output controls but do not define this article's manifest schema.

The official [MCP capabilities reference](https://playwright.dev/mcp/capabilities) lists core screenshots and devtools operations for tracing and video. Console and network observation also have explicit tools in the current capability surface.

Start the check with a schema that rejects unknown file types, missing fields, invalid sizes, absolute paths, and unsupported risk labels. Schema success only proves the document shape.

Next, resolve each relative path against a canonical run directory. Reject absolute paths, parent traversal, symbolic-link escapes, and normalized duplicates before reading any artifact.

Then compare declared and actual metadata. Require a regular file, nonzero size when the format demands content, expected extension or media type, and checksum equality when checksums are enabled.

Finally, compare artifact types with the run's requirement profile. An undeclared extra file may need quarantine, while a missing required type should always fail the package.

Playwright MCP evidence manifest testing separates observation from assertion. The manifest shows file inventory; dedicated tests assert browser behavior and the check's response to corrupt fixtures.

## Validate Browser Agent Evidence: Repository Evidence

To validate browser agent evidence, use \`packages/web/src/app/blog/posts/pillar-playwright-mcp-2026.ts\` as the repository source for MCP operating and artifact boundaries. It discusses screenshots, console and network records, traces, video, storage, and saved sessions.

That source also treats artifacts as potentially sensitive. Browser state, network data, screenshots, and traces can expose credentials or personal content, so a sensitivity class belongs beside every retained path.

The pillar explains capability selection and distinguishes browser observations from committed tests. That distinction supports a manifest validator without claiming an artifact proves the product result.

The second path, \`packages/web/e2e/article-factory-2026-07-25.e2e.ts\`, demonstrates repository-level contract testing. It iterates registered records, requests each public output, and checks required schemas, links, headings, and source sections.

That E2E file does not implement an MCP artifact manifest. Its relevant evidence is the testing pattern: enumerate a known contract, validate each required output, and fail precisely when one published item is absent.

The proposed check adapts that pattern to run files. It iterates manifest entries, resolves each file under one root, checks facts, and compares the observed type set with a required profile.

The [observability-driven testing guide](/blog/observability-driven-testing-guide) helps decide which records answer a diagnostic question. Avoid retaining every possible artifact when a smaller evidence set proves the run.

Playwright MCP evidence manifest testing should cite both paths honestly. One grounds available browser evidence and its risks; the other grounds deterministic iteration and public contract checks.

## When Should QA Teams Use MCP Screenshot Trace Inventory?

An MCP screenshot trace inventory is useful when agent runs produce files that must survive beyond the live tool transcript. Release review, incident replay, regulated evidence handling, and remote debugging commonly need that index.

Use it only after defining the required artifact profile and ownership model. A manifest without a profile can be internally consistent while omitting the exact evidence reviewers expected.

The control case removes one required file after writing a valid manifest. Validation must fail with the missing type and path, rather than silently trusting the JSON entry.

Use a locator or testing-capability assertion when the question is whether page content is visible or has a required value. A screenshot inventory cannot replace semantic browser checks.

Use a Playwright trace when chronology, network activity, and actions are needed for diagnosis. Do not require traces for every successful run if retention cost and sensitivity exceed their review value.

Use an MCP tool record when the request and response sequence itself matters. The manifest can point to that log, but it should not paraphrase or reconstruct commands that were never retained.

Use CI artifact metadata alone when one trusted platform already guarantees a simple file set and no cross-run package is needed. Additional manifests create maintenance cost and must have a clear consumer.

The [screenshots, videos, and traces guide](/blog/playwright-screenshots-videos-traces-complete-guide) compares evidence formats. Select requirements by diagnostic purpose instead of enabling every format by default.

Playwright MCP evidence manifest testing is appropriate when missing or misassigned output would invalidate review. It is unnecessary ceremony for a disposable local experiment with no retained evidence.

## Missing Browser Artifact Test: Failure Modes and Diagnostics

A missing browser artifact test should start from one valid package and mutate one boundary at a time. Cases should cover absent files, undeclared required types, duplicate paths, corrupt content, and cross-run references.

A product failure exists when Playwright MCP was configured to produce a required artifact but the expected output never appears or cannot be completed. Preserve safe server logs and resolved configuration for that case.

A test defect exists when the profile demands an unsupported file or the manifest writer runs before files close. Wrong path rules and mismatched checksum code can cause the same type of fault.

An environment limitation exists when disk quotas, permissions, process termination, container cleanup, or artifact upload rules remove valid files. Capture run directory metadata without exposing file contents.

The primary risk is a manifest that passes while its screenshot, trace, log, or session path is missing or outside the run. Treat path containment and file existence as separate mandatory checks.

Reject duplicate normalized paths even when raw strings differ. Entries such as \`logs/console.json\` and \`logs/./console.json\` identify one file and should not count as two artifacts.

Reject parent traversal and absolute paths before filesystem reads. A validator must never hash arbitrary host files because an untrusted manifest supplied a crafted path.

For corrupt content, compare byte size and checksum when the profile uses checksums. Format-aware checks may also require parseable JSON logs or a recognizable archive, but should avoid claiming deep semantic validity.

The repository contract style in \`packages/web/e2e/article-factory-2026-07-25.e2e.ts\` favors precise assertions. Report the entry index, type, normalized path, and failed rule so remediation does not require opening sensitive data.

## Agent Session Evidence Checksum: Evidence and CI Assertions

An agent session evidence checksum detects bytes that changed after the manifest was written. Use a named algorithm, normalized lowercase encoding, and a clear policy for which artifact classes require hashing.

SHA-256 is a practical integrity choice for ordinary CI evidence. A checksum proves byte equality with the manifest value, but it does not prove authorship, safety, correctness, or absence of secrets.

Record the manifest version, run identifier, artifact type, relative path, actual size, expected size, checksum policy, sensitivity class, and validation result. These fields keep failures reviewable without publishing artifact bodies.

Create a valid fixture first, then clone it for each negative case. Delete one file, duplicate one path, alter one byte, replace a run identifier, and point one entry at a sibling run directory.

Require a distinct error code for each mutation. A generic "invalid manifest" response slows diagnosis and can hide that path containment failed before checksum comparison.

CI should validate before uploading the run directory. Upload only a package that passed inventory, containment, integrity, and sensitivity policy checks.

For highly sensitive session state, successful validation may still require deletion rather than upload. The manifest can retain a redacted tombstone showing type, deletion policy, and validation result without preserving credentials.

The [MCP testing capability guide](/blog/playwright-mcp-testing-capability-guide-2026) covers assertion tools available during a run. Manifest validation occurs afterward and verifies the evidence package, not the live page.

Playwright MCP evidence manifest testing should also compare the manifest run ID with CI metadata supplied out of band. Trusting only a self-declared ID cannot detect a complete package copied from another job.

## Playwright MCP Output Contract Comparison Table

A Playwright MCP output contract should assign each file a defined purpose and handling rule. The matrix separates visual, time-based, text, and reusable-session evidence.

| Option or signal | Use when | Expected evidence | Main risk |
|---|---|---|---|
| Screenshot entry | Preserve one visual state tied to a named browser step | Run ID, path, size, format, sensitivity, validation | Image exists but belongs to another step or run |
| Trace entry | Preserve browser chronology for diagnostic replay | Run ID, archive path, size, checksum, validation | Trace is missing, incomplete, or contains secrets |
| Log entry | Preserve console or network observations in a known format | Log subtype, path, size, format, sensitivity, validation | Empty or malformed logs count as useful evidence |
| Session entry | Declare saved state with strict retention controls | Path or tombstone, size, checksum policy, sensitivity | Authentication state leaks through uploaded artifacts |

A screenshot should include a step or assertion identifier in metadata. File names alone are often ambiguous after retries or parallel runs.

A trace should normally receive an integrity check because partial archives can exist after forced termination. Format checks should stay bounded and avoid executing content.

Console and network records need subtypes and schemas. A generic \`log\` label cannot tell reviewers whether the expected diagnostic channel was retained.

Saved sessions deserve the strongest access and deletion rules. The [official Playwright MCP repository](https://github.com/microsoft/playwright-mcp) documents output and session options, but teams still own artifact governance.

The table is a minimum review contract, not a demand to keep every type. Run profiles should require only evidence with a named consumer and safe retention plan.

## How Do You Implement Playwright MCP Evidence Manifest Testing?

Implement Playwright MCP evidence manifest testing with a strict schema, a trusted run root, an external expected run ID, and a required artifact profile. Validate before any upload or publication step.

1. Read \`packages/web/src/app/blog/posts/pillar-playwright-mcp-2026.ts\` and define required artifact types, formats, sensitivity classes, and retention rules.
2. Create one isolated run directory, configure MCP outputs deliberately, and write the manifest after all selected files close.
3. Validate schema, run ownership, relative normalized paths, uniqueness, required types, regular-file status, size, and optional checksums.
4. Clone the valid fixture into missing, duplicate, corrupt, traversal, and cross-run cases with one mutation each.
5. Require precise validation codes and delete sensitive session state before upload when policy forbids retention.
6. Run the validator locally and in CI, then publish only the manifest and artifacts allowed by the approved profile.

The first example checks required type coverage without depending on entry order. A production validator should also reject duplicate types when the profile permits only one of each.

\`\`\`typescript
import { expect } from '@playwright/test';

const required = ['screenshot', 'trace', 'console', 'network'];
const actual = manifest.artifacts.map((artifact) => artifact.type);

expect(manifest.runId).toBe(process.env.CI_RUN_ID);
expect(new Set(actual)).toEqual(new Set(required));
expect(actual).toHaveLength(new Set(actual).size);
\`\`\`

The second example resolves paths under a trusted root and checks each regular file. It performs containment before filesystem access.

\`\`\`typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import { expect } from '@playwright/test';

const root = path.resolve(runDir);

for (const artifact of manifest.artifacts) {
  const resolved = path.resolve(root, artifact.path);
  expect(resolved.startsWith(root + path.sep)).toBe(true);

  const stat = await fs.stat(resolved);
  expect(stat.isFile()).toBe(true);
  expect(stat.size).toBe(artifact.size);
  expect(stat.size).toBeGreaterThan(0);
}
\`\`\`

Add checksum comparison after these structural checks, then run each mutated fixture independently. Do not print session bodies or raw network logs when a metadata assertion fails.

The [observability guide](/blog/observability-driven-testing-guide) can help reduce the required profile to useful evidence. Browse [QA skills](/skills) for validation patterns and retention checks.

Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli) when a run also needs repeatable browser commands. Keep manifest generation outside the agent's unchecked prose response.

### Audit One Evidence Folder by Hand

Make one small run folder with a short ID that also appears in the CI job data; put no old files in it. A clean root makes each check plain; it also keeps one job from hiding gaps in the next.

Write the run plan before the browser starts; name each file type that must exist. State why a reviewer needs it; if no one needs a file, leave it out of the required set.

Use one screen image for a named page step, not a set of near-matched shots; give the step a safe ID. Put that ID in the entry; a reviewer can then map the image to the browser act.

Start and stop the trace at clear points in the run; wait for the stop call to end. Then write its entry; a path written too soon may point at a file that is still open.

Save console and network logs with a known text or JSON shape; mark their type with care. Check that each log has real data when the run should make data; an empty file should not pass by size alone.

Treat saved session state as a key, even when the file has a dull name; mark it secret in the manifest. Do not upload it by default. A delete note can prove policy without keeping the key.

Build the manifest after all file write calls have ended; sort its entries by type and path. A stable order helps code review. The validator should still compare sets, since order is not part of truth.

Read the run ID from trusted CI data and pass it to the check; do not let the file choose the only ID. A copied folder can claim any ID in its own text. The outer value spots that copy.

Resolve each path from the run root before you touch the file; reject a path that starts at the disk root. Reject one that climbs with \`..\`. These checks keep the scan in its own safe space.

Turn the full root and file path into their fixed forms before the prefix check; this closes simple path tricks. Check links with care as well. A link can point out of the run even when its name looks safe.

Read file facts after path checks pass; require a normal file and the planned size rule. Match the real byte count with the entry. A folder or pipe must never count as a saved browser file.

Hash files only when the plan calls for it, and name the hash form in the schema; compare fixed text forms. Do not print file bytes on a mismatch. The path, size, and hash result are enough.

Now remove one image from a copy of the good folder; the check should name its type and path. Add the file back before the next case. One change per case keeps each error easy to trust.

Next, point one entry at the first run from a second run folder; the path check or run check must fail. This is the cross-run case. It guards against a job that picks up a stale trace or screen shot.

Change one byte in a safe fake log for the hash case; keep its size the same if you can. The hash must still catch the edit. This proves that size alone is not the same as file trust.

Add two raw paths that map to the same fixed path; the check should report a duplicate before upload. One file cannot meet two required slots by name tricks. Count each fixed path only once.

Run the secret policy case last; give a session entry an upload action that is not allowed. The check should block the package. Then change the action to delete and prove that cleanup took place.

Save the validator code, schema version, run ID, and error code with each case; do not save raw secret files for a passed check. The [MCP testing guide](/blog/playwright-mcp-testing-capability-guide-2026) can help link live checks with this later file audit.

If the browser run stops early, still scan the folder and report what is absent; mark the package as failed. Do not fill missing slots with blank files. A clear gap is more useful than false proof.

If upload drops a file after local validation, run a second light check on the stored package; compare its entry count and safe file facts. The [trace and image guide](/blog/playwright-screenshots-videos-traces-complete-guide) can help set a small, useful file set.

Playwright MCP evidence manifest testing should make a bad package fail for one clear rule; it should not ask a reviewer to open every file. The manifest is useful when it cuts work and keeps trust high.

Give each file type one short code in the run plan, such as shot, trace, log, or state; use the same code in the test name. A failed check can then name the gap in one line; no one must read the file to know what is gone.

Keep the screen shot tied to one page URL and one safe step ID; check both fields in the list. A shot from the home page cannot prove a later cart step. The link between step and file must be clear.

For a trace, check that the stop act came after the last step that the plan needs; save the stop time in the list. A valid file can still end too soon. The time check guards that simple but key case.

For a text log, set a small base size that fits the run type; a no-op run may have no net log. A fault run should have the fault line. Match the rule to the plan instead of using one size for all work.

For a state file, make the default end act delete, not keep; write a safe proof that the path is gone. If a team must keep it, require a short life and a locked store. A pass on file checks does not grant a right to keep secrets.

Run the list check on a case with two tabs and name which tab made each shot; use a page ID that has no user data. This stops a shot from the wrong tab from filling the slot. The same rule can aid trace marks.

Run one case with a retry and give each try its own root; add the try count to the trusted run ID. The second try must not read files from the first. Old proof must not turn a new fault into a pass.

Clear the run root before the MCP task starts, then check that it was empty; this makes the first file easy to track. Do not use a shared home path for test output. A short job root is both safe and easy to wipe.

Set a top size for the whole file set as well as each file; a vast trace can harm upload and hide a loop. Fail with the type and size, not the file text. The owner can then tune the trace scope or fix the loop.

Check file names for a small safe set of chars; reject control chars and names that tools may parse in odd ways. A path can stay in the root and still be hard to use. Plain names cut that risk.

Do not let the agent write its own final pass word with no code check; let the run make files, then let a fixed test read them. The two roles should stay apart. This keeps a calm text reply from masking a lost file.

Save the list as the last small file in the root, then close its write call; run the scan next. Do not change the list after the scan. If a later tool adds output, run the scan again or mark that file out of scope.

Test a file with the right name and wrong type, such as text where an image must be; the size may look sound. Check its known file mark or safe parse rule. This catches a swap that path and byte count miss.

Test a blank JSON list and a list with one sound row; both should fail when the run plan calls for four file types. The error should name the first set gap. A vague parse pass is not an inventory pass.

At upload time, send only files that the list marks as safe to keep; match the sent set back to those rows. A file can pass the disk scan yet still be barred by policy. Keep file trust and upload right as two checks.

End with one clean run that makes the least file set and passes all checks; save its safe facts as the base case. This gives each bad case a known source. It also shows that the rule can pass real work, not just reject faults.

## Frequently Asked Questions

### What is the safest way to use playwright mcp artifact manifest?

Treat the manifest as untrusted input, validate it against a strict schema, and resolve normalized relative paths beneath a trusted run root. Compare run identity out of band, require declared sensitivity, hash selected files, reject duplicates, and delete session state when policy forbids uploading reusable credentials.

### How do you verify validate browser agent evidence?

Compare required types with declared entries, then verify each entry's containment, ownership, regular-file status, size, format, and optional checksum. Run separate missing, duplicate, corrupt, traversal, and cross-run controls. Browser assertions must still prove behavior because valid evidence files do not establish a correct product result.

### When should a QA team choose mcp screenshot trace inventory?

Use an inventory when retained agent runs need release review, incident replay, audit handling, or transfer between systems. Define a consumer and requirement profile first. Skip it for disposable local exploration where no artifacts survive, since an unused manifest adds maintenance and sensitive metadata without review value.

### What causes failures in missing browser artifact test?

Typical causes include writing the manifest before files close, incorrect output roots, cleanup running too early, unsupported required types, path normalization bugs, quota or permission failures, process termination, and uploads that omit files. Mutate one boundary at a time so the validator's error remains specific.

### Which evidence should agent session evidence checksum retain?

Retain manifest version, external run ID, artifact type, normalized relative path, declared and actual size, checksum algorithm and result, sensitivity class, validator version, and policy action. Avoid retaining the session contents, secrets, cookies, or storage values merely to explain a checksum mismatch.

### How should CI handle playwright mcp output contract?

CI should generate outputs in one isolated run directory, close writers, create the manifest, and validate before upload. It should reject missing, extra forbidden, duplicate, corrupt, escaping, or cross-run entries. Upload only policy-approved files, preserve precise metadata errors, and delete sensitive state on every outcome.

## Conclusion

Playwright MCP evidence manifest testing makes retained agent output reviewable only when the manifest is treated as a QA-owned, untrusted index. Require profile coverage, run ownership, path containment, existence, integrity, sensitivity handling, precise negative controls, and independent browser assertions.

Read related articles in the [QASkills blog](/blog) and explore the [skills directory](/skills). Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli), install it, and apply this focused evidence-package verification workflow.`,
};
