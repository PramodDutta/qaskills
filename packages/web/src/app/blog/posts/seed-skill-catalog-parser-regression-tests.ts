import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md Catalog Regression Testing',
  description:
    'SKILL.md catalog regression testing scans every seed, validates parsing and schema, checks slugs, reports all failures, and protects quality boundaries.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md catalog regression testing',
  keywords: [
    'SKILL.md catalog regression testing',
    'seed skill validation suite',
    'SKILL.md parser regression',
    'skill catalog schema audit',
    'duplicate skill slug test',
    'aggregate validation errors',
    'skill quality boundary',
    '413 seed regression test',
  ],
  relatedSlugs: [
    'mcp-api-timeout-abortcontroller-testing',
    'mcp-search-filter-schema-drift-contract-tests',
    'mcp-search-response-normalization-contract-tests',
    'mcp-package-registry-version-drift-tests',
  ],
  sources: [
    'https://agentskills.io/specification',
    'https://github.com/jonschlinkert/gray-matter',
    'https://zod.dev/basics',
  ],
  content: `
SKILL.md catalog regression testing scans every seed directory, reads its required skill file, parses frontmatter, validates metadata, checks generated slugs, records quality limits, and reports every defect together. The suite turns a large curated catalog into one repeatable release contract instead of trusting isolated examples or stopping at the first invalid package.

QASkills currently contains 413 seed \`SKILL.md\` files, including the verified Playwright CLI package and its references. One existing test checks that curated skill deeply, but the full catalog needs a broad parser and schema lane. Start with the [SKILL.md format guide](/blog/skill-md-format-guide), then apply this catalog procedure.

## How Do You Build a Seed Skill Validation Suite?

A seed skill validation suite begins with filesystem inventory, not a hard-coded list. Read the immediate directories under \`seed-skills\`, sort them for deterministic output, and require each directory to contain one readable \`SKILL.md\`. Additional reference files are allowed, but the entry file is mandatory.

Use repository-root discovery that works from local source and CI. A test file nested under a package can resolve the catalog with \`new URL('../../../../seed-skills/', import.meta.url)\`, as the current Playwright CLI seed test does. Avoid \`process.cwd()\` unless the test script guarantees its working directory.

The suite should collect package identity before parsing. Record directory name, absolute file path, relative display path, byte length, and read error. A missing or unreadable file must become one result row rather than crashing the complete scan.

The [Agent Skills specification](https://agentskills.io/specification) defines the expected \`SKILL.md\` package concept and required metadata conventions. QASkills adds catalog-specific fields such as testing types, languages, frameworks, domains, agents, and quality signals. Test both layers without confusing project policy with the external format.

\`\`\`typescript
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type SeedSource = {
  directory: string;
  filePath: string;
  raw?: string;
  readError?: string;
};

const catalogRoot = fileURLToPath(
  new URL('../../../../seed-skills/', import.meta.url),
);

export async function readSeedCatalog(): Promise<SeedSource[]> {
  const entries = await readdir(catalogRoot, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return Promise.all(
    directories.map(async (directory) => {
      const filePath = path.join(catalogRoot, directory, 'SKILL.md');
      try {
        return {
          directory,
          filePath,
          raw: await readFile(filePath, 'utf8'),
        };
      } catch (error) {
        return {
          directory,
          filePath,
          readError: error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );
}
\`\`\`

Do not follow arbitrary symlinks outside the catalog in a release test. Decide whether symlinked packages are forbidden or resolve each real path and require it to remain under \`seed-skills\`. This is an inventory rule, not a parser concern.

SKILL.md catalog regression testing should assert the discovered count only with care. A hard-coded 413 catches accidental deletion, but it also fails every legitimate addition. Prefer a reviewed manifest count or update one expected constant in the same pull request as new skills, with the diff showing the intended growth.

The [QASkills directory](/skills) is the public catalog view. Filesystem checks should run before database seeding so malformed source never becomes an incomplete public card.

## What Belongs in a SKILL.md Parser Regression?

A SKILL.md parser regression verifies real catalog inputs against the production \`parseSkillMd\` function. The parser uses \`gray-matter\`, converts frontmatter arrays through \`toStringArray\`, supplies defaults for version and license, trims body content, and retains the original raw string.

Test representative forms before scanning all files. Arrays may arrive as YAML lists or comma-separated strings. Numeric token fields remain numbers only when YAML parses them as numbers. Missing collection fields become empty arrays, while missing required strings become empty strings for later schema validation.

The official [gray-matter repository](https://github.com/jonschlinkert/gray-matter) documents frontmatter parsing and delimiters. Do not imitate its parser with a regular expression in tests. Call the same production parser that seeding and validation use.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { parseSkillMd } from '@qaskills/shared';

describe('SKILL.md parser fixtures', () => {
  it('normalizes YAML lists and comma-separated arrays', () => {
    const parsed = parseSkillMd(\`---
name: Parser Fixture
description: A complete parser fixture for the catalog regression suite.
version: 1.0.0
author: QA Team
license: MIT
tags: parser, regression, catalog
testingTypes:
  - unit
frameworks: vitest, zod
languages:
  - typescript
domains: [web]
agents: claude-code, codex
---

## Instructions

Run the parser checks against the complete seed catalog.
\`);

    expect(parsed.frontmatter.tags).toEqual(['parser', 'regression', 'catalog']);
    expect(parsed.frontmatter.testingTypes).toEqual(['unit']);
    expect(parsed.frontmatter.frameworks).toEqual(['vitest', 'zod']);
    expect(parsed.frontmatter.languages).toEqual(['typescript']);
    expect(parsed.content).toContain('Run the parser checks');
  });
});
\`\`\`

Then run every real file. A successful parse should produce non-empty raw content and body text for each seed in the sorted source list. The schema will decide required metadata, but parser assertions can catch a delimiter that turns the whole document into body text or a body lost after frontmatter.

Round-trip tests differ because \`serializeSkillMd\` changes format while parsed meaning can stay equal. Compare parsed frontmatter and content after serialization rather than raw byte identity.

SKILL.md catalog regression testing should retain the exact file path on parser exceptions. A generic "failed to parse frontmatter" across 413 entries is not actionable without the package and underlying parser message.

Use the [validate SKILL.md in CI guide](/blog/validate-skill-md-in-ci-pipeline) for a single-package workflow. The catalog lane extends that model across all curated inputs and aggregates results.

## How Do You Run a Skill Catalog Schema Audit?

A skill catalog schema audit sends every parsed frontmatter object through \`skillFrontmatterSchema.safeParse\`. QASkills requires name, description, semantic-looking three-part version, author, license, at least one testing type, and at least one language. Other arrays have defaults.

The [Zod basics documentation](https://zod.dev/basics) explains \`safeParse\` and structured issues. Use issue paths and messages in reports. Do not reduce all failures to "invalid schema" because the fix differs for a short description, missing language, or invalid version.

Preserve parser output as the schema input. Tests that reconstruct a smaller object can hide unknown or defaulted behavior. If unknown frontmatter keys need rejection, update the production schema to strict mode and add a specific policy test; the current object schema strips unknown keys during parsed output use.

For each issue, record package, relative file, field path, issue code, and message. Sort issues by package and field so CI output remains stable. A stable order allows reviewers to compare reports without false churn from concurrent file reads.

| Schema area | Current rule | Useful negative fixture |
| --- | --- | --- |
| name | 1 to 100 characters | Empty or 101-character name |
| description | 10 to 500 characters | Placeholder shorter than 10 |
| version | Three numeric components | \`v1.0\` or \`1.0\` |
| author | 1 to 100 characters | Empty author |
| license | Non-empty string | Missing license after parser default review |
| testingTypes | At least one string | Empty array |
| languages | At least one string | Empty array |
| token bounds | Optional numbers | String value or invalid cross-field relation |

The parser defaults missing license to MIT and missing version to 1.0.0, so a schema audit alone will not report those omissions. Decide whether catalog policy requires explicit source fields. If it does, inspect raw frontmatter keys in an additional policy check rather than claiming Zod catches missing values.

SKILL.md catalog regression testing must distinguish validity from warnings. The skill validator treats line count, estimated tokens, short body, and dangerous command patterns as warnings. A schema-valid skill can still need editorial or safety review.

## How Do You Add a Duplicate Skill Slug Test?

A duplicate skill slug test should compare both directory slugs and slugs generated from skill names. Directory entries are unique by filesystem definition, but two names can normalize to one public slug. Case, punctuation, spaces, and non-ASCII characters can collapse under \`toSlug\`.

The shared \`toSlug\` lowercases text, replaces runs outside \`a-z0-9\` with hyphens, and trims edge hyphens. Therefore \`API & Security\` and \`API Security\` both become \`api-security\`. A name containing only unsupported characters can become an empty slug.

\`\`\`typescript
import { toSlug } from '@qaskills/shared';

type SlugOwner = {
  directory: string;
  name: string;
};

function findSlugCollisions(owners: SlugOwner[]) {
  const bySlug = new Map<string, SlugOwner[]>();

  for (const owner of owners) {
    const slug = toSlug(owner.name);
    const group = bySlug.get(slug) ?? [];
    group.push(owner);
    bySlug.set(slug, group);
  }

  return [...bySlug.entries()]
    .filter(([slug, group]) => slug === '' || group.length > 1)
    .map(([slug, group]) => ({ slug, group }));
}

it('has unique non-empty generated slugs', async () => {
  const results = await auditSeedCatalog();
  expect(findSlugCollisions(results.validSkills)).toEqual([]);
});
\`\`\`

Also decide whether directory slug must equal the generated name slug. Curated exceptions may exist for established URLs, so do not enforce equality without inventory evidence. If exceptions are valid, maintain a small reviewed map from directory to public slug and reject unexplained differences.

Check case-insensitive directory uniqueness for cross-platform behavior. macOS and Linux filesystems can treat case differently, and a catalog that works locally may create ambiguous paths in CI or archives. Normalize directory names before comparison.

A duplicate skill slug test should print every owner in a collision group. Reporting only the first pair hides a third package and can lead to repeated fixes. The [high-quality QA skills guide](/blog/how-to-write-high-quality-qa-skills) helps authors choose clear names before a collision reaches review.

## How Do You Collect Aggregate Validation Errors?

Aggregate validation errors by returning one result per seed and delaying the final assertion until every file has been processed. A thrown parser error from the first alphabetical package should not hide 12 schema problems later in the catalog.

Model stages explicitly: read, parse, schema, policy, quality, and safety. A package can stop after a read or parse failure because later stages lack input, but the outer scan must continue. Record skipped stages so the report distinguishes "not checked" from "passed."

\`\`\`typescript
type CatalogIssue = {
  severity: 'error' | 'warning';
  stage: 'read' | 'parse' | 'schema' | 'policy' | 'quality' | 'safety';
  directory: string;
  field?: string;
  message: string;
};

type CatalogAudit = {
  discovered: number;
  parsed: number;
  valid: number;
  issues: CatalogIssue[];
};

async function auditSeedCatalog(): Promise<CatalogAudit> {
  const sources = await readSeedCatalog();
  const issues: CatalogIssue[] = [];
  let parsedCount = 0;
  let validCount = 0;

  for (const source of sources) {
    if (!source.raw) {
      issues.push({
        severity: 'error',
        stage: 'read',
        directory: source.directory,
        message: source.readError ?? 'SKILL.md was not readable',
      });
      continue;
    }

    try {
      const parsed = parseSkillMd(source.raw);
      parsedCount += 1;
      const schema = skillFrontmatterSchema.safeParse(parsed.frontmatter);
      if (schema.success) validCount += 1;
      else {
        for (const issue of schema.error.issues) {
          issues.push({
            severity: 'error',
            stage: 'schema',
            directory: source.directory,
            field: issue.path.join('.'),
            message: issue.message,
          });
        }
      }
    } catch (error) {
      issues.push({
        severity: 'error',
        stage: 'parse',
        directory: source.directory,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { discovered: sources.length, parsed: parsedCount, valid: validCount, issues };
}
\`\`\`

After collection, sort and format the errors, then use one assertion with the formatted report as its message. Keep machine-readable JSON as a CI artifact when the list is long. Developers need concise terminal output, while maintainers may need trend and ownership data.

SKILL.md catalog regression testing should not downgrade parse or schema failures because the count is large. Aggregate reporting improves diagnosis; it does not weaken the release gate.

## How Do You Monitor a Skill Quality Boundary?

A skill quality boundary detects sudden drops in documentation and metadata completeness. The shared \`calculateQualityScore\` awards schema, documentation, completeness, and freshness points, capped at 100. The current freshness component defaults to 15 because parsed input has no file time for a fair age check.

Quality differs from validity because a valid short body can still earn a low documentation score. A long template with code fences and lists can score well despite weak guidance. Use the score as a regression signal and combine it with explicit placeholder checks and review.

Choose boundaries from the current spread, including minimum, median, low percentile, and count below policy. A global minimum catches a severe drop, while a percentile catches many moderate regressions. Do not invent a score of 90 without checking whether existing curated skills can meet it fairly.

Test score invariants as well. Total must remain between zero and 100, each breakdown must respect its component maximum, and repeated scoring of one parsed skill must be deterministic. A quality implementation change should update distribution evidence and policy together.

| Quality evidence | Suggested use | Caution |
| --- | --- | --- |
| Per-skill total | Find one regression | Can reward superficial length |
| Component breakdown | Explain why score changed | Weights are project policy |
| Catalog minimum | Block severe outlier | Sensitive to legacy entries |
| Lower percentile | Track broad quality | Needs a stable baseline |
| Placeholder detector | Catch generated stubs | Requires maintained fingerprints |
| Manual review sample | Judge instruction usefulness | Not fully automated |

A skill quality boundary should not silently delete low-scoring skills from public data. Fail the source review, identify the package, and let a maintainer improve or explicitly waive it. Hidden filtering creates a mismatch between seed count and database count.

The verified [Playwright CLI skill](/skills/Pramod/playwright-cli) provides a useful high-detail package for parser, metadata, command, and reference assertions. Keep its focused test while the broad catalog suite checks shared invariants.

## How Do You Scale a 413 Seed Regression Test?

A 413 seed regression test is small enough to run on every relevant pull request. Reading and parsing a few hundred Markdown files should complete quickly, especially when discovery and reads are concurrent. Prefer deterministic clarity over premature caching.

Limit concurrency only if filesystem pressure appears in CI. \`Promise.all\` for 413 small reads is generally manageable, while parsing can run synchronously after content arrives. Measure the suite before adding a worker pool that complicates ordered reports.

Start with one clean timed run that saves read, parse, check, and full run times. These facts show where time goes and stop a guess from driving a hard-to-read design.

Use a temp fault tree with one good folder, one missing file, and one bad YAML file. The scan should find all three and list both faults, which keeps the error path quick to test.

Keep the real tree test read only, with no fixes, defaults, or score files beside seeds. A trusted check leaves source unchanged and writes all run data to a temp or CI artifact path.

Count each stage with whole numbers, so 413 found folders require 413 reads before parses can match. One failed read caps parses at 412 and exposes a loop that skips a seed without a clear fault.

Run the scan once per test module and reuse its immutable result across assertions. Repeating all reads for schema, slug, and quality tests wastes time and can produce inconsistent results if a generator modifies files during the run. A \`beforeAll\` audit keeps one catalog snapshot.

Freeze the top-level test result, while nested parsed data can stay open when checks never change it. Read-only types then show in review that no check may patch a prior result.

Sort each issue by directory, stage, field, and message to form one clear repo key. Avoid full paths because temp roots differ by host and stable lines should match local and CI reports.

Run on a case-sensitive Linux host because a Mac may treat two path names as one file. The case fold check should still run on all hosts. The Linux run gives one more guard for the path used in deploy.

Path-filter the suite for changes under \`seed-skills/**\`, shared parser and schema code, validator code, quality scoring, and seeding logic. Also run it in the complete CI lane because workflow mistakes can omit focused jobs. The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) offers the single-package foundation.

Avoid giant inline snapshots of all 413 parsed objects. They create review noise whenever descriptions improve. Assert invariants and store compact summaries: count, collisions, invalid packages, warnings, and distribution statistics.

SKILL.md catalog regression testing should remain platform-independent. Sort paths, use POSIX-style relative display names in reports, and avoid relying on directory iteration order. Test on the Node version required by the monorepo.

If catalog size grows into thousands, shard by stable directory hash but retain one final aggregation job for global slug uniqueness and score distribution. Shards alone cannot detect a collision split across workers.

A shard should use folder-name hash, since new list positions can move most work across lanes. A hash keeps old folders in the same lane. The final job can join small JSON reports from each lane.

Keep one run while it stays fast because more jobs add wait time and can lose a report. The 413 seed regression test should first favor one clear run. Split it only when saved timing data shows a real need.

## Run the Catalog Procedure

Run inventory, parser, schema, policy, quality, and report stages in that order. Each stage should add evidence without hiding earlier failures.

1. Discover and sort every immediate seed directory, then require one readable \`SKILL.md\` entry file.
2. Parse every readable file with the production gray-matter parser and retain package-scoped exceptions.
3. Validate parsed metadata through the production Zod schema and collect every issue path.
4. Check directory and generated-name slugs for empty values, case collisions, and duplicate public identities.
5. Run validator warnings and quality scoring, then compare results with reviewed catalog boundaries.
6. Sort all issues, print a concise human report, and save a machine-readable artifact.
7. Fail once after the complete scan when any blocking issue exists, while keeping warnings visible.

Add one catalog count assertion tied to an intentional manifest or reviewed expected count. When a skill is added, the same change should update the count and pass every invariant. When a directory disappears accidentally, the count failure identifies loss even if all remaining files validate.

Use [QASkills](/skills) after seeding to spot-check public names, tags, and descriptions. The source suite is authoritative for package quality, while browser checks prove database and rendering integration.

## How Do You Publish Actionable Failure Output?

Actionable failure output begins with totals: discovered, read, parsed, schema-valid, warnings, and blocking errors. Follow with one line per issue containing package, stage, field, and message. End with suggested commands or documentation links.

Group by package in Markdown artifacts and by stage in CI summaries, using the same safe issue rows for each view. A developer fixing one skill wants all its issues together, while a maintainer investigating parser regression wants every parse failure together. The machine-readable report can support both views.

Put the first blocking fault near the top so a pull request author can start the fix. Keep the full set below it for one complete repair push. Show the same counts in both parts so no fault seems lost.

Use a short stage code, then keep the plain field and message on the same line. A maintainer can scan the code fast, then read the cause. Do not use a code with no text.

Print repo paths such as \`seed-skills/playwright-cli/SKILL.md\` because they work in logs and pull request links. They also keep a user name or temp root out of the report. The raw JSON may hold the same safe path.

Print each field fault on its own line, so a short name and bad version stay distinct. Zod gives one path for each issue, so keep that path. The report can group the lines under one seed.

Do not print complete skill bodies or environment data. Frontmatter descriptions and command examples may be public, but error reports need only path and issue detail. Large raw dumps make logs hard to scan and can expose future private fixtures.

Use annotations when CI supports them. A schema issue can point to \`seed-skills/<slug>/SKILL.md\`, though exact line mapping requires raw YAML location support that \`gray-matter\` does not provide directly. File-level annotation is still better than a detached summary.

Cap job log lines without dropping faults from the saved report, then link the full JSON file. State how many more lines exist. This keeps the log useful when one parser change breaks many seeds.

Make the final error name the report because "expected zero errors" gives no clear next step. Include the count, first seed, first stage, and safe report path. These facts let a developer act without opening the test code.

Test report text with paths, quotes, and line breaks so fake errors stay on clear lines. Escape control text before print. This is log care, not a claim that seed text is unsafe.

SKILL.md catalog regression testing should name policy version or commit. Quality thresholds can change, and maintainers need to know which rule produced a warning. Store the report beside build and seed evidence for the judged revision.

The [how to write high-quality QA skills guide](/blog/how-to-write-high-quality-qa-skills) is a useful repair link for content and metadata issues. Parser errors should link to the [SKILL.md format guide](/blog/skill-md-format-guide) instead, because the author needs syntax guidance first.

## Protect the Catalog with SKILL.md Regression Tests

SKILL.md catalog regression testing protects all 413 current seeds by combining production parsing, Zod validation, slug checks, aggregate reporting, and measured quality boundaries in one read-only run with clear counts for every stage and seed in the full source tree, including all current and future seed packages. The gate should fail on incomplete source before database seeding, while focused tests can still provide deeper coverage for selected skills and their extra files, commands, or known package rules.

Add this suite beside [validate SKILL.md in CI](/blog/validate-skill-md-in-ci-pipeline), review related automation skills in [QASkills](/skills), and retain the verified [Playwright CLI skill](/skills/Pramod/playwright-cli) as a detailed package check. Broad invariants and focused assertions serve different purposes.

## Frequently Asked Questions

### Should the catalog test require exactly 413 seeds forever?

No. The current count is useful evidence, not a permanent product limit. Tie the expected count to a reviewed manifest or update it with intentional additions and removals. The assertion should catch loss, allow planned growth, and make the new total clear in review.

### Why keep a focused Playwright CLI seed test?

The catalog suite checks shared metadata, parsing, slugs, and quality rules. A focused test can verify imported files, exact commands, curated author, and framework details for one key seed. Keep both because the broad scan cannot know each package's own promise or all files beyond its main entry.

### Should warnings fail the catalog build?

Define warning policy by category, with parse and schema issues set to block from the start. Token, line-count, safety-pattern, and quality warnings may begin as visible proof, then block once the catalog meets a set base. Never hide warnings merely to keep CI green.

### How should malformed YAML be reported?

Catch the parser fault, keep the package and repo path, and scan all other seeds before the run ends. Report the safe message beside a stable parse-stage label. Do not replace all details with one generic error or dump the complete source into CI logs.

### Can database seeding replace source validation?

No. Seeding may apply defaults, skip key details, or stop after one fault without a full source report. Source checks catch bad packages before database work and stay fast in pull requests. Keep a separate seed test to prove good source becomes the right database rows.

### What makes a useful quality threshold?

Base it on the current score spread and a clear product rule that the team can review. Track the minimum, low percentile, and score parts, then pair them with stub checks and human review. A high score alone can reward long text and style without proof that the skill helps an agent.
`,
};
