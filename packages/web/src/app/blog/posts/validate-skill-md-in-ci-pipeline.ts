import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Validating SKILL.md in CI: Linting, Schema Checks, and Quality Gates',
  description:
    'Validate SKILL.md in a CI pipeline with linting, schema checks, and quality gates so QA teams ship agent skills that stay reliable on every PR.',
  date: '2026-07-15',
  category: 'Tutorial',
  content: `
# Validating SKILL.md in CI: Linting, Schema Checks, and Quality Gates

A Playwright skill that worked on your laptop can still fail the next agent session after merge. The usual culprit is not a flaky test. It is a \`SKILL.md\` that never went through the same gates as product code: missing frontmatter, a name that does not match the folder, a description past 1024 characters, or a body that tells the agent to load a \`references/\` file that does not exist. For QA and test-automation teams adopting AI coding agents, treating skills as unversioned prompt paste is how routing silently degrades across the whole suite.

This guide is a CI-first playbook for validating Agent Skills before they land on \`main\`. You will map the public [Agent Skills specification](https://agentskills.io/specification) into automatable checks, wire lint and schema gates into GitHub Actions (and similar runners), separate hard fails from soft quality signals, and report errors in a form skill authors can fix in one PR cycle. If you still need authoring fundamentals, pair this with the [complete SKILL.md creation guide](/blog/how-to-create-a-claude-skill-skill-md-complete-guide). For behavioral evals after structural validation, continue into [how to test and evolve agent skills](/blog/how-to-test-and-evolve-agent-skills).

Ready-made QA skills can be installed from [qaskills.sh](https://qaskills.sh) with the qaskills CLI when you want a baseline library instead of inventing every skill from scratch. The validation patterns below still apply to third-party skills you vendor into the repo.

## The failure mode CI is supposed to catch

QA teams already know the pattern: a change looks fine in a local shell, then breaks the shared pipeline. Skills introduce a new class of that problem.

**Local illusion.** You open Claude Code, Cursor, or another skills-compatible client with a project skill under \`.claude/skills/playwright-flake-triage/\`. The folder name matches what you typed. The agent loads the skill. You declare victory and push.

**CI reality.** On the default branch, the skill directory was renamed to \`playwright-flake-triage\` while \`name:\` in frontmatter still says \`pw-flake-triage\`. Some clients are strict about the directory match rule in the [specification](https://agentskills.io/specification). Discovery metadata is wrong. A second skill has a 1,200-character description that truncates or fails loaders. A third skill points at \`scripts/collect-trace.sh\` that never landed because the script was gitignored.

None of those failures look like a red unit test. They look like "the agent forgot our flaky-test playbook again." That is why skill validation belongs in CI next to lint and schema checks for product code, not as a manual checklist before release.

### What "valid" means in a QA agent repo

For this article, a skill is **CI-valid** when all of the following hold:

1. **Structural validity.** \`SKILL.md\` exists, YAML frontmatter parses, required fields are present.
2. **Spec conformance.** \`name\` and \`description\` obey published constraints (length, charset, directory match for \`name\`).
3. **Referential integrity.** Relative paths the body (or scripts) claim to use resolve inside the skill tree.
4. **Quality gates you choose.** Team rules such as "description must mention at least one trigger phrase" or "body under N lines" that are policy, not pure spec.
5. **Security hygiene.** No obvious secret-looking strings, no surprise outbound install scripts in \`scripts/\` without review labels.

Items 1-3 should fail the PR. Items 4-5 can be fail, warn, or label depending on risk tolerance. The rest of this guide shows how to encode that split so authors know which errors block merge.

## Spec contract you can encode without inventing keys

Stick to publicly documented fields from the Agent Skills spec. Do not invent frontmatter keys in CI just because they feel useful. If your team needs extra data, the optional \`metadata\` map is the extension point the spec already describes.

### Required frontmatter fields

| Field | Spec constraint (public) | CI check idea |
| --- | --- | --- |
| \`name\` | 1-64 chars; lowercase letters, numbers, hyphens only; no leading/trailing hyphen; no consecutive hyphens; must match parent directory name | Parse YAML; regex charset; compare to directory basename |
| \`description\` | 1-1024 chars; non-empty; should say what the skill does and when to use it | Length bounds; non-empty after trim; optional keyword policy |

### Optional fields worth allowing, not inventing

| Field | Spec notes | CI stance |
| --- | --- | --- |
| \`license\` | License name or reference to a bundled license file | Allow string; if value looks like a filename, optionally assert the file exists |
| \`compatibility\` | Max 500 characters; environment requirements | Enforce max length if present |
| \`metadata\` | Arbitrary string-to-string map | Accept map; optionally require \`metadata.version\` as team policy |
| \`allowed-tools\` | Experimental space-separated tool list | Parse as string if present; do not invent tool names in CI |

### Layout expectations agents actually use

A minimal skill directory:

\`\`\`text
playwright-flake-triage/
├── SKILL.md
├── scripts/           # optional
├── references/        # optional
└── assets/            # optional
\`\`\`

Project skills commonly live under paths such as \`.claude/skills/<skill-name>/\` (Claude Code project skills). Personal skills may live under \`~/.claude/skills/\`. CI should validate **repo-checked-in** skill trees (project skills, shared packages, vendored skills), not a developer's home directory. If you also use \`AGENTS.md\`, \`.github/copilot-instructions.md\`, \`.github/instructions/*.instructions.md\`, or \`.cursor/rules/*.mdc\`, those are separate instruction surfaces. Keep their checks in separate jobs so a Cursor rule failure does not masquerade as a \`SKILL.md\` failure.

## Layered quality gates: fail fast, then go deep

Think of skill CI the way you think of test pyramid layers. Cheap deterministic checks first. Expensive evals later, usually on a different workflow.

### Gate map for a QA monorepo

| Gate | When it runs | Cost | Typical failure | Merge impact |
| --- | --- | --- | --- | --- |
| YAML parse + required fields | Every PR touching skills | Seconds | Broken frontmatter fence | Hard fail |
| Spec schema (name/description/dir match) | Every PR | Seconds | Name mismatch, overlong description | Hard fail |
| Path integrity (body links, scripts) | Every PR | Seconds-minutes | Missing \`references/*.md\` | Hard fail |
| Content lint (style/policy) | Every PR | Seconds | Missing "when to use" language | Fail or warn |
| Secret / script hygiene | Every PR | Seconds | API key pattern in example | Hard fail for secrets |
| Behavioral skill evals | Nightly or labeled PR | Minutes-hours | Agent misroutes | Soft fail until stable |

This article focuses on the first five rows. Behavioral evolution and eval harness design belong in a separate job family once structure is already green.

### Pass criteria for a single skill package

For each skill root directory discovered by CI:

1. \`SKILL.md\` is present at the skill root (not only under a nested docs folder).
2. Frontmatter is valid YAML between opening and closing \`---\` fences.
3. \`name\` and \`description\` exist and meet length/charset rules.
4. Directory basename equals \`name\`.
5. If \`compatibility\` is set, length <= 500.
6. Every relative markdown link and every \`scripts/...\` path referenced in the body resolves (or is explicitly allowlisted as external).
7. No high-confidence secret patterns in tracked skill files.
8. Team policy checks (if configured) pass or only warn.

If you vendor skills from qaskills.sh or another registry, run the same gates on the vendored tree so a bad upgrade cannot slip in through a lockfile bump.

## Discovering skill roots in the repository

Do not hardcode a single path if your org is growing. QA platforms often keep skills in more than one place:

- \`.claude/skills/*/\` for Claude Code project skills
- \`skills/*/\` or \`agent-skills/*/\` for a portable monorepo layout shared across clients
- \`packages/*/skills/*/\` in polyrepos that publish skill packages

A simple discovery rule works well: any directory that contains a \`SKILL.md\` file is a skill root. Then enforce that the parent folder name matches frontmatter \`name\`.

\`\`\`bash
# List skill roots under the repo (POSIX-friendly)
find . -type f -name 'SKILL.md' \\
  ! -path './node_modules/*' \\
  ! -path './.git/*' \\
  -print | sed 's|/SKILL.md$||' | sort
\`\`\`

In CI, prefer an explicit allowlist of roots (for example \`.claude/skills\` and \`skills\`) so random \`SKILL.md\` copies in fixtures do not get treated as production skills. Fixture skills used only by tests should live under a path like \`testdata/skills/\` and either be excluded or validated with a looser profile.

## Official validation first: skills-ref

The Agent Skills project documents a reference validator:

\`\`\`bash
skills-ref validate ./my-skill
\`\`\`

Use that as the baseline hard gate when the binary is available in your environment. It checks that frontmatter is valid and naming conventions hold. Wrap it so multi-skill repos fail with a clear exit code:

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

ROOTS=("\${@:-.claude/skills}")
status=0

for root in "\${ROOTS[@]}"; do
  if [[ ! -d "\$root" ]]; then
    echo "skip missing root: \$root"
    continue
  fi
  while IFS= read -r -d '' skill; do
    echo "validate: \$skill"
    if ! skills-ref validate "\$skill"; then
      status=1
    fi
  done < <(find "\$root" -mindepth 1 -maxdepth 1 -type d -print0)
done

exit "\$status"
\`\`\`

Notes for CI authors:

- Pin the validator version the way you pin linters. Spec details evolve; floating \`latest\` makes green builds non-reproducible.
- If \`skills-ref\` is not installable in a locked-down runner, reimplement the **documented** checks in a short script (next section). Do not claim your custom script is the official tool.
- Keep validator output in the job log and, if possible, as a check annotation so authors do not dig through raw YAML errors.

## Custom schema checks when you need QA-specific rules

Official validation covers the contract. QA teams often need extra deterministic rules that the generic tool will not encode for you: "every Playwright skill description must include the word Playwright," or "no skill body may instruct the agent to skip failing tests without a ticket ID."

### Minimal TypeScript checker (no invented frontmatter)

The following sketch uses only fields from the public spec. It is illustrative; adapt imports and CI entrypoints to your stack. Escape and double-check regexes carefully if you paste this into a template literal elsewhere.

\`\`\`typescript
import fs from 'node:fs';
import path from 'node:path';

type Frontmatter = {
  name?: string;
  description?: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  'allowed-tools'?: string;
};

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseFrontmatter(raw: string): Frontmatter {
  const match = raw.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---\\r?\\n/);
  if (!match) {
    throw new Error('SKILL.md must start with YAML frontmatter delimited by ---');
  }
  const block = match[1];
  // Prefer a real YAML parser in production (e.g. yaml package).
  // This sketch only shows the validation surface, not a full YAML implementation.
  const data: Frontmatter = {};
  for (const line of block.split(/\\r?\\n/)) {
    if (!line || line.trimStart().startsWith('#') || /^\\s/.test(line)) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key === 'metadata') continue; // nested map: use a real YAML parser
    (data as Record<string, string>)[key] = value;
  }
  return data;
}

export function validateSkillDir(skillDir: string): string[] {
  const errors: string[] = [];
  const skillMd = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMd)) {
    return [\`missing SKILL.md in \${skillDir}\`];
  }
  const raw = fs.readFileSync(skillMd, 'utf8');
  let fm: Frontmatter;
  try {
    fm = parseFrontmatter(raw);
  } catch (e) {
    return [(e as Error).message];
  }

  const dirName = path.basename(skillDir);
  if (!fm.name) errors.push('frontmatter.name is required');
  if (!fm.description) errors.push('frontmatter.description is required');

  if (fm.name) {
    if (fm.name.length > 64) errors.push('name exceeds 64 characters');
    if (!NAME_RE.test(fm.name)) {
      errors.push(
        'name must be lowercase alphanumeric with single hyphens (no leading/trailing/consecutive hyphens)',
      );
    }
    if (fm.name !== dirName) {
      errors.push(\`name "\${fm.name}" must match directory "\${dirName}"\`);
    }
  }

  if (fm.description) {
    if (fm.description.length > 1024) {
      errors.push('description exceeds 1024 characters');
    }
    if (fm.description.trim().length === 0) {
      errors.push('description must be non-empty');
    }
  }

  if (fm.compatibility && fm.compatibility.length > 500) {
    errors.push('compatibility exceeds 500 characters');
  }

  return errors;
}
\`\`\`

### What this checker deliberately does not do

- It does not invent fields like \`version:\` at the top level. Put version under \`metadata\` if you need it, consistent with the spec's extension model.
- It does not claim to parse nested YAML without a proper library. Production CI should use a YAML parser, then validate the resulting object against the constraints above.
- It does not score writing quality with an LLM. That is a different gate with different flakiness characteristics.

## Content lint rules that stay deterministic

After schema validity, add lints that keep skills usable for test automation agents. Keep them rule-based so a PR never fails because a model "felt" the prose was weak.

### High-signal lint catalog for QA skills

| Rule ID | Signal | Example fail | Severity suggestion |
| --- | --- | --- | --- |
| \`desc-has-when\` | Description includes "use when" or "when the user" style trigger language | description is only "Helps with Selenium" | warn or fail |
| \`desc-not-howto\` | Description avoids step-by-step "how" that steals the body | description lists 8 numbered steps | warn |
| \`body-has-verify\` | Body mentions verify/re-run/assert for automation skills | pure happy-path deploy prose | warn for non-test skills, fail for \`*-test-*\` names |
| \`rel-paths-only\` | No absolute machine paths (\`/Users/...\`, \`C:\\\\...\`) | hard-coded laptop path | fail |
| \`ref-depth\` | Links to \`references/\` are one level deep | chains of nested "see also" files | warn |
| \`line-budget\` | \`SKILL.md\` under ~500 lines (spec recommendation) | 2,000-line monolith | warn, then fail after grace period |

### Extracting relative references for integrity checks

Agents follow relative paths from the skill root. Broken links waste a session. A practical extractor:

1. Scan the markdown body for \`(...path...)\` markdown links and for bare tokens that look like \`scripts/...\`, \`references/...\`, \`assets/...\`.
2. Ignore \`http://\`, \`https://\`, and \`mailto:\`.
3. Resolve each candidate against the skill directory.
4. Fail if the target is outside the skill root (path traversal) or missing.

\`\`\`bash
# Rough inventory of local path mentions (review false positives)
rg -n -o '(scripts|references|assets)/[A-Za-z0-9._/-]+' \\
  .claude/skills --glob '**/SKILL.md'
\`\`\`

Pair the inventory with an existence check in your Node or Python validator. For QA skills that generate test code, also verify that example commands in fenced blocks do not reference deleted npm scripts from the parent app unless those scripts are documented as external prerequisites in \`compatibility\`.

## GitHub Actions workflow that fails the PR correctly

Below is a concrete workflow shape. Adjust package manager and install steps to your repo. The important part is job structure: install pin, discover skills, validate, upload logs.

\`\`\`yaml
name: skill-md-quality-gates

on:
  pull_request:
    paths:
      - '.claude/skills/**'
      - 'skills/**'
      - 'scripts/validate-skills/**'
      - '.github/workflows/skill-md-quality-gates.yml'
  push:
    branches: [main]
    paths:
      - '.claude/skills/**'
      - 'skills/**'

jobs:
  validate-skills:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install skill validators
        run: |
          # Pin tools explicitly in package.json or a versioned install script.
          # Example placeholder: npm ci && npx --yes <your-pinned-validator>
          npm ci

      - name: Run skills-ref (or project wrapper)
        run: bash scripts/validate-skills/run-skills-ref.sh .claude/skills skills

      - name: Run project schema + path integrity
        run: npx tsx scripts/validate-skills/cli.ts --roots .claude/skills,skills --mode strict

      - name: Upload validation report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: skill-validation-report
          path: artifacts/skill-validation/**
\`\`\`

### Path filters are a feature, not a shortcut

Scoping the workflow to skill paths keeps CI green time low, but remember:

- A change to the validator scripts must also trigger the workflow (included above).
- A change to product test layout that skills document may not touch \`SKILL.md\`. For that class of drift, schedule a nightly integrity job that always runs path checks even when skill files are untouched.
- If skills live only under \`.claude/skills\`, do not also require a green job for empty \`skills/\` unless you create the directory.

### Required status check

In branch protection, mark \`validate-skills\` (or your job name) as required for \`main\`. Without that, authors learn to ignore the red X. Skill quality then becomes optional, which defeats the point of schema gates.

## Pre-commit, PR CI, and release: three different moments

| Moment | Goal | What to run | Human cost |
| --- | --- | --- | --- |
| Pre-commit / pre-push | Catch typos before push | Fast schema + name match on staged skills | Low if under ~2s |
| PR CI | Enforce team contract | Full schema, path integrity, secret scan, policy lints | Shared runner minutes |
| Release / publish | Protect consumers | Everything in PR CI plus package layout for publishable skill tarballs | Higher; run on tags |

Do not put LLM-based skill scoring in pre-commit. Non-determinism and latency will train people to \`--no-verify\`. Keep generative evals in nightly jobs or opt-in PR labels such as \`run-skill-evals\`.

### Sample pre-commit hook sketch

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail
changed=\$(git diff --cached --name-only --diff-filter=ACMR | grep -E '(^|/)SKILL\\.md$' || true)
[[ -z "\$changed" ]] && exit 0

roots=\$(echo "\$changed" | xargs -n1 dirname | sort -u)
for d in \$roots; do
  skills-ref validate "\$d"
done
\`\`\`

## Security and trust gates for skill PRs

Skills are not inert docs. They steer agents and may include executable \`scripts/\`. From a QA security lens, treat a skill PR like a small tool release.

### Checks that belong in CI

1. **Secret-like strings.** Fail on private key headers, \`API_KEY=\` assignments with high-entropy values, and cloud token patterns in skill trees. Use the same secret scanner you already run on app code; extend its path include list.
2. **Unexpected network installers.** Flag \`curl ... | bash\` patterns inside \`scripts/\` for manual review. You can implement this as a simple ripgrep step that sets annotations without failing, until policy hardens.
3. **Path traversal in references.** Reject body links that resolve outside the skill directory.
4. **Typosquat awareness for vendored skills.** If CI installs skills by name from a registry, pin versions and checksums. Prefer reviewing diffs when upgrading qaskills.sh packages the same way you review dependency bumps.

### What not to overclaim in a security job

Do not assert that CI "proves" a skill is free of prompt injection. Static checks reduce obvious risk. They do not replace human review of instruction text that might say "ignore repository policies" or exfiltrate env vars via a tool call. Add a PR template checkbox: "I read every file in this skill folder."

## Author-friendly failure reporting

A gate that only prints \`Error: invalid\` will be worked around. QA engineers fix what they can see.

### Report shape that speeds fixes

Emit one machine-readable JSON file and one human markdown summary:

\`\`\`json
{
  "skills": [
    {
      "path": ".claude/skills/api-contract-tests",
      "ok": false,
      "errors": [
        {
          "gate": "schema",
          "rule": "name-dir-match",
          "message": "name \\"api-contract\\" must match directory \\"api-contract-tests\\""
        },
        {
          "gate": "integrity",
          "rule": "missing-path",
          "message": "references/openapi-rules.md does not exist"
        }
      ]
    }
  ]
}
\`\`\`

Then render a short PR comment (via your existing bot, not a fictional CLI flag):

- Skill path
- Gate name
- Exact fix ("rename folder" vs "edit frontmatter name" vs "add missing file")

For description length failures, print \`currentLength/maxLength\`. Authors should not have to count characters by hand.

### Map failures to the skill lifecycle

When schema fails, the skill should not be advertised as installable. When only a warn-level content lint fails, allow merge with a tracked issue if your team accepts debt. Document that policy in the workflow README so reviewers do not argue severity on every PR.

## Monorepo patterns for large QA orgs

### Pattern A: one skill per directory under a single root

Simple and ideal for most teams:

\`\`\`text
.claude/skills/
  playwright-pom-sync/
    SKILL.md
  selenium-grid-debug/
    SKILL.md
  junit-report-triage/
    SKILL.md
\`\`\`

CI loops directories at depth 1. Name match is obvious.

### Pattern B: domain packages

\`\`\`text
packages/
  web-ui-skills/
    skills/
      accessibility-snapshot/
        SKILL.md
  api-skills/
    skills/
      contract-diff/
        SKILL.md
\`\`\`

Discovery uses multiple roots. Consider a manifest file checked into the repo that lists roots explicitly. Keep the manifest boring (YAML or JSON list of paths). Do not invent a second skill metadata format that duplicates \`SKILL.md\`.

### Pattern C: generated skills

Some platforms generate skill stubs from OpenAPI or from internal test taxonomy. Generation must emit valid frontmatter. Run the same validator on generated output in CI **before** commit hooks land the files, or as a check that \`git diff\` is empty after regeneration. Otherwise generators become a permanent source of name/description drift.

## Coordinating SKILL.md gates with other agent instruction files

Large repos mix skills with other instruction surfaces:

- \`AGENTS.md\` (nearest-file-wins conventions in the agents.md ecosystem)
- \`.github/copilot-instructions.md\` and \`.github/instructions/*.instructions.md\` (with \`applyTo\` frontmatter where used)
- \`.cursor/rules\` as \`.mdc\` files (\`alwaysApply\`, \`globs\`, \`description\`)
- \`GEMINI.md\` for Gemini CLI

**Do not fold all of those into one "agent config" linter with fake shared schema.** They have different file formats and loaders. Instead:

1. Keep a \`skill-md\` job focused on Agent Skills directories and \`SKILL.md\` rules from agentskills.io.
2. Keep separate jobs or steps for Cursor \`.mdc\` frontmatter and for Copilot instruction globs if you validate those at all.
3. In PR templates, ask authors which surface they changed so reviewers open the right checklist.

Cross-linking is fine in prose ("this skill assumes \`AGENTS.md\` defines the default test command"), but CI path integrity for a skill should not require parsing every other instruction file unless you deliberately build that integration test.

## Wiring validation into everyday QA workflows

### Example: flaky test triage skill

Suppose your team maintains \`playwright-flake-triage\`. Authors change the skill when the pipeline's flake taxonomy changes. CI should:

1. Validate frontmatter and directory name.
2. Confirm \`scripts/summarize-retry-reports.sh\` exists if the body references it.
3. Confirm \`references/flake-codes.md\` exists and is non-empty.
4. Optionally grep the description for triggers like "flake", "retry", "Playwright".

When a developer only updates product tests, the skill job may not run (path filters). Nightly integrity still opens an issue if the skill points at a renamed report path in the app.

### Example: API contract skill

For \`contract-diff\` skills used with Pact or OpenAPI diffs:

- Description should mention contract testing triggers so routing works.
- Body should include a verify loop (run diff, read exit code, file bug template).
- CI content lint can require a fenced example command that matches a script under \`scripts/\`.

### Example: onboarding a skill from qaskills.sh

Install or vendor the skill, then run the **same** CI job on the vendored path. If upstream SKILL.md is valid but your org policy requires a \`metadata.owner\` field, enforce that as team policy on top of the public spec, documented in your validator's README so contributors know it is local policy.

## Decision matrix: which gate should block merge?

| Symptom in review | Gate that should catch it | Block merge? | Follow-up |
| --- | --- | --- | --- |
| Frontmatter missing closing \`---\` | YAML parse | Yes | Author fixes fences |
| \`name: Web-UI\` uppercase | Spec name charset | Yes | Lowercase + hyphens |
| Folder \`api-tests\`, name \`api-test\` | Dir match | Yes | Rename one side |
| Description 1,500 characters | Description max 1024 | Yes | Shorten; move detail to body |
| Body links to deleted reference | Path integrity | Yes | Restore file or edit link |
| Description is "Useful helper" | Content lint \`desc-has-when\` | Team choice | Expand what + when |
| Skill body 800 lines | Line budget | Prefer warn first | Split into \`references/\` |
| Script curls unknown URL | Script hygiene | Yes or review label | Threat review |
| Agent picks wrong skill in eval | Behavioral eval (separate job) | Not in schema CI | Routing/description work |

Use this matrix in your contributing docs so reviewers do not invent severity on the fly.

## Graduating from lint-green to production-trusted skills

Schema CI is necessary and not sufficient. A skill can pass every static gate and still mis-route, skip verification steps, or produce brittle test code. Treat static validation as the compile step. Runtime skill quality is the test suite.

A practical sequence for QA teams:

1. **Land static gates** (this article) on all skill paths with required checks.
2. **Add a golden prompt list** per skill (should-trigger / should-not-trigger) stored next to the skill or under \`evals/\`.
3. **Run evals on a schedule** against the weakest model you still support, because vague skills hide on strong models.
4. **Feed failures back into description and body edits**, then rely on CI to keep structure honest while you iterate behavior.

That loop is where structural validation hands off to runtime quality work: golden prompts, model-weakness testing, and iterative description fixes without re-breaking the schema contract CI already enforces.

## Implementation checklist you can paste into the team wiki

Copy and adapt:

1. Inventory every repo path that contains production \`SKILL.md\` files.
2. Add \`skills-ref validate\` (or equivalent documented checks) as a hard PR gate.
3. Add directory name === \`name\` comparison if not already covered.
4. Enforce description length <= 1024 and name length <= 64.
5. Enforce \`compatibility\` length <= 500 when present.
6. Resolve relative \`scripts/\`, \`references/\`, and \`assets/\` references from the body.
7. Extend secret scanning to skill directories.
8. Decide warn vs fail for content policy lints; document the decision.
9. Make the skill job required in branch protection.
10. Add a nightly job without path filters for drift detection.
11. Pin validator versions.
12. Teach authors to read the validation report artifact.
13. Separate skill jobs from Cursor/Copilot/AGENTS.md checks.
14. Vendor third-party skills (including from qaskills.sh) through the same gates.
15. Only after static CI is boring, invest in behavioral eval automation.

## Common CI anti-patterns (and replacements)

**Anti-pattern: one giant "AI config" lint.** Replacement: separate jobs per file type and loader.

**Anti-pattern: only validating on release tags.** Replacement: PR-time hard fail for schema; release adds packaging checks.

**Anti-pattern: LLM judge in the required check.** Replacement: deterministic gates required; LLM judge optional or nightly.

**Anti-pattern: allowing skill PRs without reading \`scripts/\`.** Replacement: CODEOWNERS on \`**/scripts/**\` under skill trees plus hygiene greps.

**Anti-pattern: fixing CI by deleting the skill.** Replacement: quarantine with a manifest exclude and a tracked rewrite issue, still visible to the team.

**Anti-pattern: documenting skills only in Confluence.** Replacement: \`SKILL.md\` in git is the source of truth; CI enforces it. Wiki pages go stale without gates.

## Putting it together for a mid-size test platform team

Imagine a team of 12 with Playwright, API contract tests, and mobile UI automation. They keep twelve skills under \`.claude/skills\`. Before gates, two skills had mismatched names after a rename refactor, one description exceeded 1024 characters after someone pasted a full runbook into frontmatter, and one reference file was lost in a sparse checkout experiment.

After introducing the layered pipeline:

- PR CI catches the rename mismatch in under a minute.
- Description overflow fails with \`1284/1024\` in the log.
- Nightly integrity opens an issue when a skill still mentions \`reports/junit.xml\` after the product moved to \`artifacts/junit/\`.
- Authors stop asking "did you remember to update the skill?" because the merge queue already asked.

The cultural shift matches what good test automation already taught the industry: if a property matters, assert it in CI. Skills that steer agents through flake triage, grid debugging, and coverage gaps are now part of the product surface those agents touch. Validating \`SKILL.md\` is not bureaucracy. It is how you keep the agent-facing test OS coherent as the suite grows.

## Frequently Asked Questions

### Should every skill change require a full agent eval in PR CI?

No. Keep pull request CI focused on deterministic schema, lint, path integrity, and secret hygiene so feedback stays fast and stable. Full agent evals are slower, cost tokens, and can flake with model variance. Run deep evals nightly, on main, or when a PR carries an explicit label. Use static gates as the required merge bar; treat behavioral scores as quality trends you manage like flaky-test dashboards, not as a second flaky suite blocking every docs typo.

### Is skills-ref enough, or do we still need a custom validator?

Start with the documented \`skills-ref validate\` flow when you can install and pin it, because it tracks the public Agent Skills contract for frontmatter and naming. Add a custom validator when your QA org needs policy rules the reference tool will not encode, such as mandatory trigger phrases for Playwright skills, path integrity for internal report layouts, or \`metadata\` keys your platform expects. Custom code should restate only published constraints for core fields, then layer local policy clearly labeled as local.

### How do we validate skills that only exist on developer machines under ~/.claude/skills?

You generally do not. Personal skills under home-directory paths are outside the repository contract and will not be present on CI runners. If a workflow matters to the team, promote it into a project skill under version control (for example \`.claude/skills/\`) and validate that tree in CI. Use personal skills for experiments; use repo skills for shared flake triage, environment setup, and test authoring playbooks that must survive laptop reimages and onboarding.

### What is the fastest path if our monorepo has no skill CI today?

Inventory \`SKILL.md\` paths, add a single required job that fails on parse errors, missing required fields, name/directory mismatch, and description length, then expand. Pin versions, publish a JSON report artifact, and document warn-vs-fail policy before adding subjective lints. After that baseline stays green for a few sprints, add relative path integrity and secret scanning. Only then schedule behavioral evals. This order stops the highest-frequency silent breakages first without boiling the ocean.
`,
};
