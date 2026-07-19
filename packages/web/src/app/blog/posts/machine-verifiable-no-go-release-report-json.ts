import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Machine Verifiable NO GO Report',
  description:
    'Create a machine verifiable no go report with JSON Schema, fresh evidence, recomputed verdicts, CI validation, and precise release remediation steps.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Tutorial',
  primaryKeyword: 'machine verifiable no go report',
  keywords: [
    'machine verifiable no go report',
    'release report JSON schema',
    'NO-GO release decision',
    'recomputed release verdict',
    'CI evidence validation',
    'release readiness JSON',
    'quality gate report contract',
    'stale artifact detection',
  ],
  relatedSlugs: [
    'database-migration-rolling-deploy-compatibility-gate',
    'dependency-upgrade-changelog-api-usage-release-review',
    'release-gates-yaml-team-policy-schema',
    'release-waiver-ownership-acceptance-contract',
  ],
  sources: [
    'https://json-schema.org/draft/2020-12/json-schema-core',
    'https://json-schema.org/draft/2020-12/json-schema-validation',
    'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches',
    'https://docs.sonarsource.com/sonarqube-server/2026.1/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates',
  ],
  content: `A machine verifiable no go report is structured release proof whose verdict CI can recompute independently. It binds risks, selected tests, test-reach gaps, gate results, blockers, waivers, and remediation steps to one HEAD SHA. Schema validity alone is insufficient; proof freshness and verdict consistency must also pass before automation trusts the result.

The [AI Release Guardian](/skills/thetestingacademy/ai-release-guardian) requires both Markdown for humans and JSON for CI, with each claim citing a test run, file range, schema change, or diff hunk. This tutorial implements that contract. The broader [QASkills catalog](/skills) provides the proof-producing skills that can feed its fields.

## What Makes a Quality Gate Report Contract Trustworthy?

A prose release brief can help a reviewer but cannot reliably drive a protected status. Different writers may omit fields, rename verdicts, or describe stale results without a detectable error. A structured report gives consumers stable keys and clear check failures.

The report does not replace source files. It indexes them. A gate result points to run \`#8841\`; a test reach gap points to \`orders/service.ts:118-131\`; a schema change blocker names \`0043\`. Consumers can locate proof without embedding full logs or scanner output in one JSON object.

The assigned contract has four non-negotiable match rules:

1. Derive \`verdict\` from \`gate_results\`, \`blockers\`, and \`waivers\`; reject disagreement.
2. Require clear file IDs in gate proof and blocker entries.
3. Allow \`GO_WITH_WAIVERS\` only when each waiver has a named owner and \`accepted: true\`.
4. Reject files that do not correspond to the report's \`head_sha\`.

These rules turn missing proof into NO_GO rather than uncertainty. A job cannot write \`GO\` after a required suite fails. It cannot use an ownerless waiver to clear an exception. It cannot reuse a passing report after a new commit changes the judged build.

Keep advice separate from authority. The Guardian can generate a machine verifiable no go report and set a CI check from its checked result, but it never merges, tags, deploys, or formally approves. A human remains accountable for the release process.

The [release readiness scorecard guide](/blog/ai-release-readiness-scorecard-2026) explains human presentation. Use one internal evaluation object to render both JSON and Markdown so the two views cannot disagree about blockers, waivers, or steps to reach GO.

## Which Fields Define a NO-GO Release Decision?

Stable field names matter because multiple jobs and consumers share them. Use the repo source as the source of truth rather than allowing each workflow to emit its own report dialect.

| Field | Purpose | Invalid or incomplete example |
|---|---|---|
| \`verdict\` | Derived advice | \`GO\` while a gate has \`status: fail\` |
| \`head_sha\` | Commit to which all proof applies | Empty SHA or files from another commit |
| \`base_ref\` | Match baseline | Missing base for delta findings |
| \`risk_map\` | User flow and blast radius per change | File list without flow at risk |
| \`selected_tests\` | Selection method, counts, run, result | "tests ran" without IDs |
| \`coverage\` | Changed lines and classified gaps | Whole-project percentage without changed-line gaps |
| \`gate_results\` | One result per set gate | Missing required gate or vague proof |
| \`blockers\` | Clear reasons release cannot proceed | General "quality concerns" text |
| \`waivers\` | Named accepted waiverable items | Null owner or false acceptance for waived verdict |
| \`to_reach_go\` | Exact fix actions | Generic "fix tests" instruction |

The report's verdict values are \`GO\`, \`GO_WITH_WAIVERS\`, and \`NO_GO\`. The assigned JSON example uses underscores, while the human report may display "GO WITH WAIVERS" or "NO-GO" for readability. Normalize labels only at the presentation boundary.

Risk-map entries name \`change\`, \`behavior_at_risk\`, \`blast_radius\`, \`surface\`, and \`risk\`. This transforms a diff inventory into a release explanation. The [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) helps classify affected flow without inventing unsupported scores.

\`selected_tests\` records strategy, selected count, total count, run ID, and result. Selection can use per-test test reach, import graphs, or conventions. It does not replace suites required by team rule set. The [test impact analysis guide](/blog/test-impact-analysis-ci-guide-2026) describes conservative selection and fallback behavior.

Test reach focuses on changed lines. Each gap names file, lines, class, surface, and reason. A blocker-class gap on a high surface cannot disappear inside a whole-project percentage. Pre-existing debt can be listed separately without pretending it was introduced by the diff.

## How Do You Write a Release Report JSON Schema?

JSON Schema Draft 2020-12 separates core processing from shape check. The official [core specification](https://json-schema.org/draft/2020-12/json-schema-core) defines schema processing and vocabularies, while the [validation specification](https://json-schema.org/draft/2020-12/json-schema-validation) defines assertion keywords for instance structure. Declare the dialect clearly and use a checker that supports it.

The following schema covers the contract's decisive fields. It rejects unknown top-level fields, requires all core arrays, constrains verdict and status values, and enforces the owner and acceptance shape for each waiver. Cross-field verdict result remains application logic because ordinary shape assertions do not express the complete rule set cleanly.

\`\`\`json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:qaskills:release-report:1",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "verdict",
    "head_sha",
    "base_ref",
    "risk_map",
    "selected_tests",
    "coverage",
    "gate_results",
    "blockers",
    "waivers",
    "to_reach_go"
  ],
  "properties": {
    "verdict": {
      "enum": ["GO", "GO_WITH_WAIVERS", "NO_GO"]
    },
    "head_sha": {
      "type": "string",
      "minLength": 7,
      "pattern": "^[0-9a-f]+$"
    },
    "base_ref": {
      "type": "string",
      "minLength": 1
    },
    "risk_map": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["change", "behavior_at_risk", "blast_radius", "surface", "risk"],
        "properties": {
          "change": { "type": "string", "minLength": 1 },
          "behavior_at_risk": { "type": "string", "minLength": 1 },
          "blast_radius": { "type": "string", "minLength": 1 },
          "surface": { "type": "string", "minLength": 1 },
          "risk": { "enum": ["low", "medium", "high"] }
        }
      }
    },
    "selected_tests": {
      "type": "object",
      "additionalProperties": false,
      "required": ["strategy", "selected", "total", "run_id", "result"],
      "properties": {
        "strategy": { "enum": ["per-test-coverage", "import-graph", "convention"] },
        "selected": { "type": "integer", "minimum": 0 },
        "total": { "type": "integer", "minimum": 0 },
        "run_id": { "type": "string", "minLength": 1 },
        "result": { "enum": ["passed", "failed"] }
      }
    },
    "coverage": {
      "type": "object",
      "additionalProperties": false,
      "required": ["changed_lines", "executed", "gaps"],
      "properties": {
        "changed_lines": { "type": "integer", "minimum": 0 },
        "executed": { "type": "integer", "minimum": 0 },
        "gaps": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": ["file", "lines", "class", "surface", "reason"],
            "properties": {
              "file": { "type": "string", "minLength": 1 },
              "lines": { "type": "string", "minLength": 1 },
              "class": { "enum": ["blocker", "waiverable", "debt"] },
              "surface": { "type": "string", "minLength": 1 },
              "reason": { "type": "string", "minLength": 1 }
            }
          }
        }
      }
    },
    "gate_results": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["gate", "status", "evidence"],
        "properties": {
          "gate": { "type": "string", "minLength": 1 },
          "status": { "enum": ["pass", "fail"] },
          "evidence": { "type": "string", "minLength": 1 }
        }
      }
    },
    "blockers": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 }
    },
    "waivers": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["item", "owner", "accepted"],
        "properties": {
          "item": { "type": "string", "minLength": 1 },
          "owner": { "type": ["string", "null"] },
          "accepted": { "type": "boolean" }
        }
      }
    },
    "to_reach_go": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 }
    }
  }
}
\`\`\`

The \`$id\` URN is a stable ID example for this QASkills contract; a deployment should publish or bundle the schema according to its checker design. Check must not fetch arbitrary remote schemas from untrusted pull-request content. Bundle the approved schema or restrict resolution to trusted IDs.

Add semantic checks that \`executed\` does not exceed \`changed_lines\`, selected count does not exceed total, set gates appear exactly once, and the report SHA equals the CI SHA. These rules are straightforward application invariants even when not encoded in the shape schema.

The [release-gates.yaml policy guide](/blog/release-gates-yaml-team-policy-schema) defines the expected gate set. Load rule set and report together, then reject missing, duplicate, or unknown gate results. Strict input and output schemas prevent spelling mistakes from weakening enforcement.

## Why Is a Recomputed Release Verdict Required?

Never trust the job's \`verdict\` field by itself. The consumer calculates the expected value from failed gates, blockers, and waiver state, compares it with the supplied value, and rejects disagreement. This guards against job bugs and deliberate or accidental label changes.

Under the assigned contract, any failed gate or blocker produces \`NO_GO\`. When no blocker exists and each waiver is named and accepted, nonempty waivers produce \`GO_WITH_WAIVERS\`. When no blocker or waiver remains, the verdict is \`GO\`.

\`\`\`typescript
type Verdict = 'GO' | 'GO_WITH_WAIVERS' | 'NO_GO';

type GateResult = {
  gate: string;
  status: 'pass' | 'fail';
  evidence: string;
};

type Waiver = {
  item: string;
  owner: string | null;
  accepted: boolean;
};

type ReleaseReport = {
  verdict: Verdict;
  head_sha: string;
  gate_results: GateResult[];
  blockers: string[];
  waivers: Waiver[];
};

export function deriveVerdict(report: ReleaseReport): Verdict {
  const hasFailedGate = report.gate_results.some((gate) => gate.status === 'fail');
  if (hasFailedGate || report.blockers.length > 0) return 'NO_GO';

  if (report.waivers.length > 0) {
    const allAccepted = report.waivers.every(
      (waiver) => waiver.owner !== null && waiver.owner.trim() !== '' && waiver.accepted,
    );
    return allAccepted ? 'GO_WITH_WAIVERS' : 'NO_GO';
  }

  return 'GO';
}

export function assertReportConsistency(report: ReleaseReport, ciSha: string): void {
  if (report.head_sha !== ciSha) {
    throw new Error('release report was not produced for the judged HEAD');
  }

  const expected = deriveVerdict(report);
  if (report.verdict !== expected) {
    throw new Error('reported verdict disagrees with gates, blockers, and waivers');
  }
}
\`\`\`

Do not derive GO_WITH_WAIVERS merely because a waiver array exists. Each item needs ownership and acceptance. The sibling [release waiver ownership guide](/blog/release-waiver-ownership-acceptance-contract) covers classification and human acceptance boundaries in detail.

Also reject duplicate gate names because one passing entry could conceal another failing entry in a careless map conversion. Compare the report gate set with the configured gate set. The checker should know whether each required field was assessed rather than interpreting absence as pass.

A machine verifiable no go report can contain a NO_GO verdict with an empty blocker list when a gate fails, but better error text should mirror the clear failure in blockers and fix. Enforce whichever mirroring rule the repo formally adopts; do not silently assume it from shape validity.

## How Does Stale Artifact Detection Protect the Verdict?

Freshness begins with exact commit ID. The report's \`head_sha\` must equal the SHA checked out by the trusted checker. Each test, test reach, scanner, schema change, and review file should also declare that SHA or provide a checkable linkage to the same workflow execution.

Treat a branch name as insufficient ID because it can move. Treat a pull-request number as scope context, not content ID. A run triggered before a force push can belong to the same pull request while judging different code.

Proof sources should follow a repo-defined grammar. Examples include \`run #8841\`, \`orders/service.ts:118-131\`, \`migration 0043\`, and \`diff hunk auth/session.ts:72\`. The checker can require at least one recognized source form without pretending to prove that the file exists.

Presence checks belong to trusted bridges; a test bridge confirms run ID, status, and SHA through the CI source. A test reach bridge verifies the file hash and changed-line mapping. A schema change bridge confirms the named file appears in the diff. Keep bridge results clean and small.

| Freshness failure | Why it invalidates the report | Required response |
|---|---|---|
| Report SHA differs from CI SHA | Verdict judges another build | Reject report |
| Test run predates latest push | Required suite may not cover new code | Mark gate failed |
| Test reach uses another base | Changed-line gaps are miscomputed | Recollect test reach |
| Scanner compares wrong branch | New-finding delta is unreliable | Rerun correct match |
| Review acknowledgment predates changed risk map | Human did not review current risks | Require fresh acknowledgment |

SonarQube quality gates check conditions against analysis results, as described in the official [quality-gate introduction](https://docs.sonarsource.com/sonarqube-server/2026.1/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates). When importing such a result, preserve its project, branch or pull request, analysis ID, and source SHA rather than copying only "passed."

Never place secrets, production records, full tokens, or sensitive scanner payloads in the report. Store protected details in controlled files and source them according to access rule set. The report needs enough ID for authorized reviewers, not unrestricted copies of each source.

## What Should CI Evidence Validation Reject?

A checker proven only against one happy report is not a release control. Build table-driven negative tests from each contract rule. Assert the exact failure category so a parser failure does not masquerade as a verdict inconsistency.

At least, test this sequence:

1. Check a complete GO report with no blockers or waivers.
2. Change one gate to fail while leaving \`verdict: GO\`; expect inconsistency failure.
3. Add an ownerless waiver and \`GO_WITH_WAIVERS\`; expect NO_GO result.
4. Change \`head_sha\`; expect freshness failure.
5. Remove each required field one at a time; expect schema failure.
6. Add an unknown top-level field; expect strict-schema failure.
7. Duplicate a gate name or omit a set gate; expect rule set match failure.
8. Make selected or run counts impossible; expect semantic failure.

Include malformed JSON, unsupported schema dialect, invalid enum values, empty proof, and non-whole number counts. A machine verifiable no go report should fail with a concise diagnostic that finds the JSON path and rule, then set a terminal failed check.

Test trusted bridge boundaries separately. Supply a nonexistent run, a run for another SHA, a deleted file, and a scanner result from the wrong base. Shape fixtures cannot prove source linkage; bridge integration tests can.

The [dependency upgrade API review](/blog/dependency-upgrade-changelog-api-usage-release-review) applies when updating the JSON Schema checker or YAML parser. Map the exact APIs used, read official release information, and rerun negative fixtures before trusting a new version.

Keep example reports synthetic. Do not copy production incident records or credentials into fixtures. Use deterministic SHAs, run IDs, files, and schema change names that are clearly test data while still matching check grammar.

## How Should Release Readiness JSON Run in CI?

Place schema, semantic, freshness, bridge, and verdict checks in one trusted checker. Jobs can upload proof, but the aggregate status should be written by the checker after it checks each set gate. This reduces opportunities for one job to declare its own release outcome.

\`\`\`yaml
name: release-report

on:
  pull_request:

jobs:
  verify-release-report:
    name: release/report-contract
    runs-on: ubuntu-latest
    permissions:
      contents: read
      checks: write
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm release-report:verify artifacts/release-report.json
        env:
          EXPECTED_HEAD_SHA: \${{ github.event.pull_request.head.sha }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: verified-release-report
          path: artifacts/release-report.json
\`\`\`

The escaped expression above is standard GitHub Actions context syntax inside this TypeScript template. In an actual workflow, ensure proof-producing jobs run before this job and download their files. Give the final check a unique, stable name.

GitHub documents that protected branches can require status checks before merge and can select an expected app source in supported settings. Its [protected branch guide](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) also warns that duplicate job names can make required results ambiguous. Protect \`release/report-contract\` and avoid reusing that name elsewhere.

Use minimal permissions. Untrusted pull-request code should not obtain credentials capable of forging a trusted result or changing branch rules. Depending on repo threat model, separate proof execution from privileged status publication and check file provenance before publication.

Return terminal failures for missing report, malformed JSON, missing proof, and invalid rule set. Avoid path filters that prevent a required check from appearing. A pull request with no release-relevant changes can produce a valid report whose gates cite the no-change diff inventory.

The [CI/CD pipeline guide](/blog/cicd-testing-pipeline-github-actions) provides surrounding workflow patterns. The report checker remains an advisory tool even when branch protection enforces its status; it does not perform deployment.

## Trust Proof Jobs and File Paths

A machine verifiable no go report is only as trustworthy as the chain that supplies its fields. Treat test runners, test reach collectors, scanners, schema change analyzers, review bridges, the report job, and the final checker as separate roles. Each role should emit a small file with ID, build, status, and provenance.

Define a proof manifest before combining results. For each job, record the gate name, job or app ID, run ID, file name, file digest when available, base, HEAD, and parser version. The checker rejects missing jobs, unexpected jobs, duplicate gate names, and build mismatches before deriving a verdict.

| Job role | Trusted output | Consumer check |
|---|---|---|
| Test job | Suite result, run ID, HEAD | Required suite exists and is terminal |
| Test reach job | Changed lines, executed lines, classified gaps | Base and HEAD match the report |
| Scanner job | New-finding delta and analysis ID | Baseline and HEAD match the report |
| Schema change analyzer | Schema change IDs and rollback proof | Diff contains cited files and notes |
| Review bridge | Named acknowledgment of current risk map | ID and current SHA are valid |
| Report checker | Derived verdict and error text | Protected status comes from expected source |

For each machine verifiable no go report, distinguish file presence from file trust. A file named \`unit-results.json\` can exist while coming from untrusted pull-request code or another workflow. The trusted bridge verifies source ID and run linkage, then normalizes only the fields the report contract needs.

Keep the checker deterministic and deny unknown proof keys. If a scanner changes its output format, its bridge should fail with a parser diagnostic rather than supplying an empty finding list. If a test file is missing, \`tests.required_suites\` fails instead of defaulting to pass.

A machine verifiable no go report should preserve enough provenance for later reconstruction without copying sensitive logs. Identify controlled files by run and name, retain their hashes according to repo rule set, and keep secrets out of both human and JSON views. Authorized reviewers can follow the sources when deeper inspection is required.

Protect publication separately from execution. Untrusted code may need to run tests, but it should not possess credentials that can impersonate the expected status source. The final checker can read clean files with minimal permissions, check them, and publish one aggregate result after each contract rule passes.

Finally, a machine verifiable no go report needs failure handling for its own infrastructure. File download errors, parser crashes, missing source APIs, and unsupported rule set versions are missing proof. Return a terminal NO_GO diagnostic, retain available logs, and rerun only after the fault is understood or repaired.

## Clean Proof Without Losing Meaning

Bridges need a small shared envelope, but normalization must not erase distinctions required by rule set. A skipped required suite, a failed suite, and a suite that never started are different job states even when each prevents GO. Preserve the raw state, then map all three to a failed required-suite gate with exact proof.

Define the clean envelope around ID and measurement. Useful fields include job name, job version, gate name, base, HEAD, run ID, started and completed status, measured value, threshold input, and file source. The central checker applies thresholds from the committed rule set rather than trusting a job's pass label.

For counts, retain both numerator and denominator when the contract uses them; selected tests need selected and total counts. Test reach needs changed and executed lines plus classified gaps. Security deltas need base and HEAD IDs with the new-finding count. A Boolean alone prevents later match checks and useful fix.

Preserve not-applicable proof clearly. If no schema change appears in the diff, the data bridge can emit \`pass\` with proof that the gate is not applicable, including the diff inventory and HEAD. Omitting the data result is invalid because the consumer cannot distinguish no schema change from a crashed bridge.

Normalization also needs stable status field names. Translate source-exact values at the bridge boundary and retain the original value for error text. Unknown source states fail parsing. Do not map a new or undocumented state to pass merely because it is not named failure.

Proof text should be generated from structured bridge fields, not accepted as the only input. The checker can format a concise source such as suite, run, and SHA while retaining machine fields for presence checks. This prevents small wording changes from breaking check and avoids extracting authority from free-form prose.

Keep measurement and rule set timestamps secondary to commit ID. Clock skew can make event ordering difficult across services, while base and HEAD establish which code was judged. Timestamps still help investigation, but they cannot repair a SHA mismatch or prove that a moving branch still names the same content.

Version bridge contracts. A consumer should reject an unsupported envelope version with a terminal diagnostic rather than guessing field meaning. During an upgrade, test old and new fixtures, choose the version clearly, and keep verdict result unchanged unless team rule set also changes.

Finally, retain the original job file according to repo rule set. Clean fields support automated decisions; raw output supports authorized investigation when parsing, classification, or source handling is disputed. Store a hash or another stable content ID so the retained file resolves to the same content the bridge read.

## Keep Human and Machine Views Aligned

Render Markdown from the checked report after validation, not from separate handwritten notes. Show verdict, risk map, proof, blockers, waivers, and numbered remediation steps. Link each item to the file location available to reviewers.

Human wording can be clearer than field names. Display \`NO_GO\` as "NO-GO" and explain user flow in full sentences. Do not alter classification or omit inconvenient entries. The JSON remains the canonical machine contract, while Markdown is its accessible presentation.

Keep fix exact and testable. "Add a test driving the refund branch through the public API" is clear. "Improve test reach" does not name flow or completion proof. Order steps so contributors can rerun the relevant narrow test before the full required suites.

Keep each proof file small and give it one job. A test file should state the suite, run, result, and HEAD. A coverage file should state the same HEAD, changed lines, hit lines, and gaps. The report can then join facts without parsing prose.

Test the bad path before making the check required. Change one SHA, remove one gate, and add one ownerless waiver in fixed fixtures. Each case should end with a clear failed status and a direct fix, not a crash or a pending job.

Pair the report with specialized proof guides. The [rolling-deploy migration gate](/blog/database-migration-rolling-deploy-compatibility-gate) supplies old-code and new-schema proof. The [release-gates team policy guide](/blog/release-gates-yaml-team-policy-schema) supplies set thresholds. Both feed the same report rather than publishing separate verdicts.

For your next pull request, install the [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian), emit its complete JSON contract, and make separate verdict verification the required check. That route provides the exact source workflow, field source, and guardrails behind this tutorial.

## Frequently Asked Questions

### Is valid JSON enough for a release report?

No. JSON syntax only proves that a parser can read the document. JSON Schema checks shape assertions, while application logic verifies set gates, count relationships, proof sources, file freshness, and verdict result. A syntactically valid report can still be stale, incomplete, or internally contradictory.

### Why should CI recompute the verdict?

Independent verdict recomputation catches job bugs and prevents a label from overriding failed proof. The consumer examines gate statuses, blockers, and accepted named waivers, calculates the expected verdict, and rejects disagreement. This keeps the report's decision traceable to fields rather than trusting one mutable string.

### Can JSON Schema check that a test run exists?

No. A shape schema can require a nonempty run ID and constrain its shape, but it cannot prove source presence or commit linkage by itself. A trusted CI bridge must query or inspect the run file, check its status and SHA, then supply clean proof.

### What should happen after a new commit is pushed?

Invalidate proof that does not declare or link to the new HEAD. Rerun required suites, test reach mapping, scanner match, and any review acknowledgment affected by the changed risk map. The pull-request number remains the same, but the report must judge exact content ID.

### Should Markdown or JSON be the canonical report?

Use one checked internal result, serialize JSON for machines, and render Markdown for reviewers. JSON supplies stable fields and strict checks; Markdown supplies explanation and links. Neither view should be authored independently because duplicated blocker and waiver lists can drift during remediation.

### Can a NO-GO report trigger deployment automatically?

No. NO_GO blocks according to repository policy, while GO remains an advisory recommendation that satisfies the configured evidence checks. The Guardian never merges, deploys, tags, or grants formal approval. Authorized humans and deployment systems retain their separate responsibilities after report validation.
`,
};
