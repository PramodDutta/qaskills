import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'agent skill package SBOM generation Guide',
  description:
    'agent skill package SBOM generation: inventory files, hashes, and source relationships. See verified code, focused fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'agent skill package SBOM generation',
  keywords: [
    'agent skill package SBOM generation',
    'agent skill file inventory',
    'SKILL.md package manifest',
    'skill scripts SBOM',
    'artifact component hashes',
    'skill supply chain inventory',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'validate-skill-md-in-ci-pipeline',
    'agent-skill-security-review-checklist',
    'how-to-publish-ai-agent-skill-directory',
  ],
  sources: ['https://spdx.github.io/spdx-spec/v3.0.1/', 'https://slsa.dev/spec/v1.0/provenance'],
  repoEvidence: [
    'packages/cli/src/lib/installer.ts',
    'packages/web/src/app/api/skills/[id]/artifact/route.ts',
  ],
  content: `agent skill package SBOM generation should walk the selected package after extraction, record each local path and SHA-256 digest, and link that file list to its source and built ZIP. QASkills currently copies selected add-on directories and hashes the final ZIP, but neither cited path emits a per-file list or attestation.

The first deliverable should be a stable package file list. SPDX serialization and SLSA provenance can build on that proof, yet they remain separate formats with additional required meaning.

## What does agent skill package SBOM generation need to prove?

agent skill package SBOM generation must prove file choice, path key, byte hashing, ordering, source reference, and ZIP linkage. It must also show which fields come from current QASkills behavior and which belong to a proposed file list.

The CLI file choice boundary is \`packages/cli/src/lib/installer.ts\`. For cloned sources, \`extractSkillPackage\` searches to a bounded depth, chooses a shallow SKILL.md, and stages that file with adjacent \`references\`, \`scripts\`, and \`assets\` directories.

The web ZIP boundary is \`packages/web/src/app/api/skills/[id]/artifact/route.ts\`. It rebuilds one SKILL.md from the database, places it at \`<slug>/SKILL.md\` in a ZIP, hashes the ZIP bytes, and returns that digest in a response header.

Those paths answer distinct questions. CLI extraction decides which repo files survive for a cloned package. The artifact route materializes registry data into one downloadable archive. Neither creates an entry for each file.

Make a small tree fixture that shows the source root, the chosen skill root, the staged root, and the ZIP root as four named views, then list the path set at each view before any hash runs. This map lets a failed test show where a file was dropped or added, and it stops the file list from mixing repo paths with the short paths that a user will see after install or unzip.

A useful file list starts after file choice, not before it. Hashing an entire cloned repo would describe files that \`extractSkillPackage\` later removes. Hashing only the ZIP would not reveal which inner file changed.

Each file entry should use a package-local path, byte size, digest algorithm, and digest value. The document also needs package name, version, source reference when known, build tool, and creation time if the chosen format requires it.

The [SPDX 3.0.1 specification](https://spdx.github.io/spdx-spec/v3.0.1/) defines models for software files, packages, SBOMs, hashes, and relationships. A custom JSON list is useful test proof, but it should not be called SPDX-conformant without satisfying the selected SPDX profile and serialization.

The [agent skill security checklist](/blog/agent-skill-security-review-checklist) can review file choice, scripts, and links. The file list improves visibility; it does not prove the listed code is safe or that its source was trusted.

Use the [SKILL.md format guide](/blog/skill-md-format-guide) to establish the required root file. This guide owns selected package contents and provenance links, not frontmatter validity.

## agent skill file inventory: current repository behavior

An agent skill file list does not exist in the two cited paths today. Current code copies or creates files, then returns a folder or ZIP response without writing a file list beside those outputs.

Source type affects the resulting folder. A local install copies the supplied folder recursively. A direct GitHub clone is reduced to a discovered skill package when a SKILL.md exists, while a registry download may clone, fetch the content endpoint, or reconstruct one SKILL.md.

For cloned packages, \`SKILL_PACKAGE_DIRS\` contains exactly \`references\`, \`scripts\`, and \`assets\`. The extraction function stages those directories only when they sit beside the selected SKILL.md and are directories.

An adjacent root \`LICENSE\`, \`README.md\`, or arbitrary configuration file is not named by that selection list. A proposed file list must describe the files that actually survive extraction, not imply those omitted files were packaged.

Test this rule with one file in each named folder, one root file that should stay, and two root files that current clone extraction leaves out, all with short and distinct byte values. First assert the staged path set, then build the file list from that stage; this order proves an omitted license is a package-choice fact and not a bug in the walk or hash code.

The walk ignores \`.git\` and \`node_modules\` while looking for SKILL.md. It stops descending beyond its coded depth. Tests should create a shallow control and a deeper variant so selection behavior is visible before inventory logic runs.

After file choice, \`copyDir\` recurses through directories and skips entries named \`.git\`. It does not calculate sizes or digests, emit media types, record source paths, or assign relationships.

The web route behaves more narrowly. Its ZIP receives one built text file. The returned \`X-Artifact-Sha256\` and \`ETag\` describe the entire ZIP buffer, not the inner SKILL.md bytes as a named file entry.

This distinction prevents a false claim. QASkills has a ZIP hash, but repo proof does not show a skill scripts SBOM or per-file bill of materials. The new feature must add those records explicitly.

Inspect a published package in the [QASkills directory](/skills) to understand the registry output. Use repo fixtures for exact inventory tests because live content and versions can change between runs.

The [publication overview](/blog/how-to-publish-ai-agent-skill-directory) can explain where a file list is exposed. Decide whether it travels inside the ZIP, beside it through an API, or both, then test each advertised location.

## Why does SKILL.md package manifest change the contract?

A SKILL.md package file list changes the contract because consumers can verify inner files rather than trusting only a folder copy or archive digest. It also makes omissions, duplicate basenames, and source relationships reviewable.

The file list must follow the selected package root. If extraction chooses \`repo/tools/checks/SKILL.md\`, the file list paths should begin with \`SKILL.md\`, \`scripts/\`, \`references/\`, or \`assets/\`, not leak the temporary clone prefix.

Local path normalization needs a declared separator. ZIP and SBOM records should use forward slashes even when the build runs on Windows. Tests can create paths with the native API and compare clean file-list names.

Basenames are not identities. \`scripts/check.ts\` and \`references/check.ts\` are two components even though both end in \`check.ts\`. Store the complete local path and reject duplicate clean paths.

Hash raw bytes rather than decoded strings. Scripts, images, templates, and text with distinct newline styles all need exact byte key. A UTF-8 decode and re-encode could alter invalid sequences or normalization choices.

Ordering should be stable. Sort entries by their clean local paths before serialization. Stable ordering makes snapshots readable and prevents equivalent directories from producing noisy file list changes.

Run the same tree twice after creating its files in a new order, then compare the full sorted records and the encoded file list byte for byte. The walk may see a host-specific folder order, but the built result must not change; this check also catches a sort that uses only the base name and places same-name files in an unstable tie.

Symlink rules must be explicit before walking. Following links can list data outside the selected root or create cycles. Recording links without following them needs a distinct entry type and target rule.

License metadata also needs honest scope. The current clone extraction does not select an adjacent root license file through \`SKILL_PACKAGE_DIRS\`. A manifest cannot name a license file that was removed; packaging rule must change first if that file is required.

The [publishing instructions](/how-to-publish) should reject a stale file list if package bytes change after build. Generate file list after all file choice and content construction, immediately before archive creation.

agent skill package SBOM generation should not make a custom file list authoritative for provenance. It can record a source URL and revision when available, while a separate attestation proves how the built ZIP was produced.

## skill scripts SBOM test matrix

A skill scripts SBOM matrix should compare selected package contents with file list entries. Each row needs an exact expected path set, not only an entry count, because duplicate names and omitted root files can preserve counts.

| Case | Input or boundary | Layer under test | Expected assertion |
|---|---|---|---|
| SKILL.md only | One valid root instruction file | Web artifact and inventory | One component entry matches the generated file bytes |
| Package with scripts | \`SKILL.md\` plus \`scripts/check.mjs\` | CLI extraction then inventory | Both selected paths appear with separate SHA-256 values |
| References and assets | One file in each companion directory | CLI package selection | All normalized relative paths survive and sort consistently |
| Root license file | Adjacent \`LICENSE\` outside companion directories | Current extraction | Characterization records omission; policy test stays separate |
| Duplicate basename | \`scripts/check.ts\` and \`references/check.ts\` | Inventory identity | Two entries exist because full relative paths differ |
| Nested component | \`assets/templates/report.txt\` | Recursive walk | Entry path remains package-relative with forward slashes |

The SKILL.md-only row can exercise the web route after database setup. Compare the manifest entry digest with the exact built SKILL.md bytes, then separately verify the existing ZIP-level header against the response buffer.

The scripts row begins with \`extractSkillPackage\`. First assert the output folder contains only selected classes. Only then call the proposed inventory builder, so a selection failure cannot be blamed on hashing.

Docs and assets should contain distinct bytes and sizes. Distinct test values prevent a mistaken shared digest from passing. Include an empty file too if zero-byte components are allowed.

Give the empty file a named row with size zero and the known SHA-256 of an empty byte string, then place a one-byte file beside it so a skipped read cannot make both rows look alike. Also add a nested path whose file name matches a root name, since that pair proves the path key, walk depth, byte size, and digest are all checked rather than inferred from a count.

The root license row is characterization. Current extraction stages only SKILL.md and three add-on folder classes. Do not write a target expectation that the license survives until production file choice changes.

Duplicate basenames expose key choice. An implementation keyed only by filename would overwrite one entry. Assert ordered full paths and both hashes, then ensure relationship docs use the same identifiers.

Run this matrix in the [CI validation workflow](/blog/validate-skill-md-in-ci-pipeline). Keep ZIP response tests in the web package and folder selection tests in the CLI package, with a small shared inventory fixture if code becomes common.

agent skill package SBOM generation passes this matrix when selected bytes and listed components match exactly. Extra and missing entries should both fail because either condition breaks checks.

## How should artifact component hashes be verified?

Built ZIP file entry hashes should be verified from raw bytes at the final package root, before archive compression. Compute each digest on its own, sort records, and then compare the archive's extracted bytes with the same entries.

The first example characterizes current file choice from \`packages/cli/src/lib/installer.ts\`. It proves the root license and unrelated README are omitted while the three named add-on directories survive.

\`\`\`typescript
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { extractSkillPackage } from '../src/lib/installer';

let root = '';
afterEach(async () => {
  if (root) await fs.rm(root, { recursive: true, force: true });
});

it('characterizes files selected from a cloned skill', async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-package-'));
  const skillRoot = path.join(root, 'catalog', 'checks');
  await fs.mkdir(path.join(skillRoot, 'scripts'), { recursive: true });
  await fs.mkdir(path.join(skillRoot, 'references'), { recursive: true });
  await fs.mkdir(path.join(skillRoot, 'assets'), { recursive: true });
  await fs.writeFile(path.join(skillRoot, 'SKILL.md'), 'valid fixture');
  await fs.writeFile(path.join(skillRoot, 'scripts', 'run.mjs'), 'export {};');
  await fs.writeFile(path.join(skillRoot, 'references', 'api.md'), 'API notes');
  await fs.writeFile(path.join(skillRoot, 'assets', 'report.txt'), 'template');
  await fs.writeFile(path.join(skillRoot, 'LICENSE'), 'MIT');
  await fs.writeFile(path.join(skillRoot, 'README.md'), 'repository notes');

  await expect(extractSkillPackage(root)).resolves.toBe(true);
  await expect(fs.readdir(root).then((entries) => entries.sort())).resolves.toEqual([
    'SKILL.md',
    'assets',
    'references',
    'scripts',
  ]);
});
\`\`\`

Folder entry order is not generally guaranteed, so production test code should sort the \`readdir\` result before equality. The expected set is the important characterization: SKILL.md plus the three selected directories.

The second block is proposed test scaffolding for file entry hashing. It walks without following symbolic links, hashes each file buffer, normalizes separators, and sorts entries. This helper is not present in the cited repo.

\`\`\`typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

type Component = { path: string; size: number; sha256: string };

async function inventoryFiles(root: string): Promise<Component[]> {
  const components: Component[] = [];

  async function walk(directory: string): Promise<void> {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile()) {
        const bytes = await fs.readFile(absolute);
        components.push({
          path: path.relative(root, absolute).split(path.sep).join('/'),
          size: bytes.length,
          sha256: createHash('sha256').update(bytes).digest('hex'),
        });
      } else {
        throw new Error('Unsupported package entry type');
      }
    }
  }

  await walk(root);
  return components.sort((left, right) => left.path.localeCompare(right.path));
}
\`\`\`

Test the helper with two same-name files in distinct directories. Assert both clean paths, byte lengths, and separately calculated digests. Then mutate one byte and prove only that file digest changes.

Keep the first file list, change one byte in one script, and build a second list from the same root without touching times, names, or any other file. The changed row must keep its path and size when the new byte has the same width, its hash must change, all other rows must match, and the final ZIP hash must change after the archive is built again.

The artifact route should receive the final file list rather than rebuild it from database assumptions. Once implemented, unzip the response in a test and compare each archived path and byte buffer with its file list entry.

Build that check from the download bytes alone: save the ZIP buffer, recompute its top hash, open each file, and sort the inner path set before reading the file list that came with the same response. The test should fail on an extra ZIP file, a missing row, a wrong size, a bad file hash, or a file list that names itself with a hash made before its final bytes were fixed.

Keep the existing ZIP digest assertion too. A package-level hash answers whether the exact transfer bytes match, while file entry hashes answer which inner content changed. Neither digest substitutes for the other.

Use the [agent skill security checklist](/blog/agent-skill-security-review-checklist) to test unsupported entries and path escape attempts. Reject or represent links according to rule before any archive receives them.

## skill supply chain inventory acceptance criteria

A skill supply chain file list passes when it describes each packaged file, no unpackaged file, and the exact bytes delivered. Its package key and source fields must state what QASkills actually knows.

The minimum file data is clean local path, size, SHA-256 algorithm, and digest. Add a media type only when detected by a documented method. File role can derive from the top folder through an explicit mapping.

The manifest needs a schema version. Consumers should reject incompatible major versions and ignore only fields the selected schema permits. A silent shape change can make older checks incomplete.

Package name and version should match artifact routing and response headers. If a requested historical version is unavailable, current web code returns 404. The file list must never label current bytes as the unavailable request.

Source data differs by acquisition path. A Git clone can provide a URL and revision if captured before extraction. A content endpoint or database-built ZIP may have distinct proof. Leave unknown values absent rather than inventing a commit.

For each source type, make a field map that says which fact is known, where it came from, and which test can prove it, then omit every field that has no such row. A clone may prove a URL and commit, a registry build may prove a skill key and stored version, and a local folder may prove only that local bytes were read at build time.

SPDX output should map package, file, hash, and relationship records according to the chosen 3.0.1 profile. A small internal file list can feed that serializer, but conformance needs schema validation and required creation information.

The [SLSA provenance specification](https://slsa.dev/spec/v1.0/provenance) separates artifact subjects from build definition and run details. Use provenance to describe how an artifact was produced; do not rename the file list as SLSA provenance.

The build must occur after package file choice and before delivery. Any later mutation invalidates file and archive digests. Tests should alter a staged file after the file list is made and prove the check fails.

The [SKILL.md format guide](/blog/skill-md-format-guide) remains the authority for instruction structure, while the inventory records bytes. agent skill package SBOM generation should not parse and rewrite files merely to hash them.

## How do you test agent skill package SBOM generation step by step?

Test agent skill package SBOM generation by fixing the package root, proving selected files, hashing raw bytes, and verifying delivered output. Keep each stage on its own observable.

1. Read \`packages/cli/src/lib/installer.ts\` and \`packages/web/src/app/api/skills/[id]/artifact/route.ts\`, recording selection rules, archive layout, and the current ZIP digest.
2. Create a smallest valid package with SKILL.md, then add scripts, references, assets, a root license, and duplicate basenames as separate variants.
3. Run clone-style fixtures through \`extractSkillPackage\`, then assert the exact surviving relative path set before inventory generation.
4. Walk the selected root as bytes, reject unsupported entry types, normalize paths, calculate SHA-256 values, and sort component records.
5. Build the archive, extract it in the test, and compare every delivered path and buffer with the manifest and package-level digest.
6. Validate the chosen inventory or SPDX schema in CI, then require source and provenance fields only when the generator has evidence.

Step one prevents the file list from describing an imagined package. Record that clone extraction and web ZIP construction currently produce distinct file sets.

Step two gives each rule choice one fixture. The root license tests omission under current copy step, while duplicate basenames prove full path key. Keep file contents short but distinct.

Step three separates file choice from hashing. If an expected script disappears, the copy step assertion fails before any digest comparison. This order gives package owners a clear repair target.

Step four must consume buffers. Assert lowercase hexadecimal SHA-256 with sixty-four characters, exact byte size, forward-slash path, and stable order for each entry.

Step five verifies the bytes users receive. Compare the existing \`X-Artifact-Sha256\` with the downloaded buffer, then compare inner files with file-list entries once the route exposes them.

Make the test print one short diff by path when those sets do not match, with marks for only-in-stage, only-in-ZIP, only-in-list, size change, and hash change. A path-based diff is far more useful than a count mismatch, and it lets the same check cover SKILL.md-only builds, cloned add-on folders, and any later package rule without a new form of test output.

Finish with [how to publish](/how-to-publish). Confirm a published package exposes the documented manifest location, and reject stale or mismatched records before distribution.

## agent skill package SBOM generation rollout and regression checks

Roll out agent skill package SBOM generation as an additive file list before claiming standards conformance. Start with stable internal records and file checks, then add an SPDX serializer with its own validator.

CLI owners should define post-extraction package roots. Web owners should decide whether registry ZIPs include add-on files and manifests. Security owners should decide symlink, executable, and unsupported-entry rule.

The minimum regression set covers SKILL.md only, each add-on folder, nested files, zero-byte files, duplicate basenames, root license omission, unsupported entries, path separators, and one-byte mutation. Each row should assert its full path set and byte facts so a missing file cannot hide behind an unchanged count.

Do not make ZIP checks depend on entry order alone. Compare path sets and bytes after extraction. Keep a separate exact archive digest assertion because compression metadata and build behavior belong to the transfer contract.

If packaging expands to include licenses or other root files, change file choice tests first. File list should follow delivered contents automatically, while rule review determines whether new files are allowed.

The [publication overview](/blog/how-to-publish-ai-agent-skill-directory) should state whether manifests are built by QASkills or supplied by authors. Built proof should identify its tool and version without copying unverified author claims.

Catalog backfill needs measured source data. Database-built artifacts may know metadata and SKILL.md bytes but lack the original add-on files or commit. Publish partial proof honestly instead of inventing complete history.

For old skills, build the file list only from bytes that the registry can fetch or make again, label that build source, and leave repo revision fields out when no saved fact can prove them. Run a dry backfill first, group results by source type and path set, recompute a sample twice, and stop the write if the same input yields a new order or hash.

Use the [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) to validate schema, path safety, digest recomputation, and archive parity. Keep signing or attestation keys outside unit fixtures.

After installer, archive, compression, source, or schema changes, rerun each matrix row. agent skill package SBOM generation remains trustworthy only when file choice, file list, archive, and provenance claims still agree.

## Frequently Asked Questions

### What should agent skill file inventory tests assert?

Assert the exact clean local path set, raw byte size, SHA-256 value, stable order, package key, and schema version. Also prove omitted files remain absent under current file choice. Do not infer source revisions, licenses, or safety results when the generator lacks that proof.

### How does SKILL.md package manifest affect the SKILL.md contract?

The manifest adds a package-level proof contract without changing frontmatter syntax. It records the selected SKILL.md and add-on bytes, paths, and relationships. Validation should compare delivered files with entries, while SKILL.md parsing remains a separate test with its own errors and acceptance rules.

### Which fixture best exposes skill scripts SBOM?

Use one package containing SKILL.md, \`scripts/check.ts\`, and \`references/check.ts\` with distinct bytes. The repeated basename proves full paths are file entry identities. Add an adjacent root license to characterize current omission, then assert each surviving file has an independent digest and size.

### When should teams check artifact component hashes?

Check them after extraction, after any built content is finalized, while building the archive, and when verifying the download. Rerun the suite whenever file choice, newline handling, compression, or archive layout changes. A one-byte mutation should alter one file digest and the package digest.

### What is the pass criterion for skill supply chain inventory?

Each delivered file appears exactly once, no omitted file appears, and all sizes and digests match raw bytes. Paths are clean and safe, source fields contain only known facts, and standards claims pass their validators. Provenance remains separate from the file inventory unless a valid attestation is built.

## Conclusion

agent skill package SBOM generation should begin with a stable post-extraction file list, not a standards label. QASkills already selects add-on directories for cloned skills and hashes registry ZIP bytes, but per-file records and provenance still need implementation and tests.

Open the [QASkills skills directory](/skills), inspect a published package, then use [how to publish](/how-to-publish) to apply the inventory checklist before distribution. Rebuild one checked package twice and compare its path set, file hashes, and ZIP hash before making the file list part of a release.`,
};
