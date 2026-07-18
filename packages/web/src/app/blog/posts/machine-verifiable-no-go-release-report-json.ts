import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Machine-Verifiable NO-GO Reports',
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
  content: `A machine verifiable no go report is structured release evidence whose verdict CI can independently recompute. It binds risks, selected tests, coverage gaps, gate results, blockers, waivers, and remediation to one HEAD SHA. Schema validity alone is insufficient; evidence freshness and verdict consistency must also pass before automation trusts the result.

The [AI Release Guardian](/skills/thetestingacademy/ai-release-guardian) requires both Markdown for humans and JSON for CI, with every claim citing a test run, file range, migration, or diff hunk. This tutorial implements that contract. The broader [QASkills catalog](/skills) provides the evidence-producing skills that can feed its fields.

## Make the Report a Contract, Not a Summary

A prose release summary can help a reviewer but cannot reliably drive a protected status. Different writers may omit fields, rename verdicts, or describe stale results without a detectable error. A structured report gives consumers stable keys and explicit validation failures.

The report does not replace source artifacts. It indexes them. A gate result points to run \`#8841\`; a coverage gap points to \`orders/service.ts:118-131\`; a migration blocker names \`0043\`. Consumers can locate evidence without embedding full logs or scanner output in one JSON object.

The assigned contract has four non-negotiable consistency rules:

1. Derive \`verdict\` from \`gate_results\` and \`waivers\`; reject disagreement.
2. Require concrete artifact identifiers in gate evidence and blocker entries.
3. Allow \`GO_WITH_WAIVERS\` only when every waiver has a named owner and \`accepted: true\`.
4. Reject artifacts that do not correspond to the report's \`head_sha\`.

These rules turn missing evidence into NO_GO rather than uncertainty. A producer cannot write \`GO\` after a required suite fails. It cannot use an ownerless waiver to clear an exception. It cannot reuse a successful report after a new commit changes the judged revision.

Keep recommendation separate from authority. The Guardian can generate a machine verifiable no go report and set a CI check from its validated result, but it never merges, tags, deploys, or formally approves. A human remains accountable for the release process.

The [release readiness scorecard guide](/blog/ai-release-readiness-scorecard-2026) explains human presentation. Use one internal evaluation object to render both JSON and Markdown so the two views cannot disagree about blockers, waivers, or steps to reach GO.

## Preserve the Exact Field Vocabulary

Stable field names matter because multiple producers and consumers share them. Use the repository reference as the source of truth rather than allowing each workflow to emit its own report dialect.

| Field | Purpose | Invalid or incomplete example |
|---|---|---|
| \`verdict\` | Derived recommendation | \`GO\` while a gate has \`status: fail\` |
| \`head_sha\` | Revision all evidence judges | Empty SHA or artifacts from another commit |
| \`base_ref\` | Comparison baseline | Missing base for delta findings |
| \`risk_map\` | User behavior and blast radius per change | File list without behavior at risk |
| \`selected_tests\` | Selection method, counts, run, result | "tests ran" without identifiers |
| \`coverage\` | Changed lines and classified gaps | Whole-project percentage without changed-line gaps |
| \`gate_results\` | One result per configured gate | Missing required gate or vague evidence |
| \`blockers\` | Concrete reasons release cannot proceed | General "quality concerns" text |
| \`waivers\` | Named accepted waiverable items | Null owner or false acceptance for waived verdict |
| \`to_reach_go\` | Specific remediation actions | Generic "fix tests" instruction |

The report's verdict values are \`GO\`, \`GO_WITH_WAIVERS\`, and \`NO_GO\`. The assigned JSON example uses underscores, while the human report may display "GO WITH WAIVERS" or "NO-GO" for readability. Normalize only at the presentation boundary.

Risk-map entries name \`change\`, \`behavior_at_risk\`, \`blast_radius\`, \`surface\`, and \`risk\`. This transforms a diff inventory into a release explanation. The [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) helps classify affected behavior without inventing unsupported scores.

\`selected_tests\` records strategy, selected count, total count, run ID, and result. Selection can use per-test coverage, import graphs, or conventions. It does not replace suites required by team policy. The [test impact analysis guide](/blog/test-impact-analysis-ci-guide-2026) describes conservative selection and fallback behavior.

Coverage focuses on changed lines. Each gap names file, lines, class, surface, and reason. A blocker-class gap on a high surface cannot disappear inside a whole-project percentage. Pre-existing debt can be listed separately without pretending it was introduced by the diff.

## Write a Strict JSON Schema

JSON Schema Draft 2020-12 separates core processing from structural validation. The official [core specification](https://json-schema.org/draft/2020-12/json-schema-core) defines schema processing and vocabularies, while the [validation specification](https://json-schema.org/draft/2020-12/json-schema-validation) defines assertion keywords for instance structure. Declare the dialect explicitly and use a validator that supports it.

The following schema covers the contract's decisive fields. It rejects unknown top-level properties, requires all core arrays, constrains verdict and status values, and enforces the owner and acceptance shape for each waiver. Cross-field verdict derivation remains application logic because ordinary structural assertions do not express the complete policy cleanly.

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

The \`$id\` URN is a stable identifier example for this QASkills contract; a deployment should publish or bundle the schema according to its validator design. Validation must not fetch arbitrary remote schemas from untrusted pull-request content. Bundle the approved schema or restrict resolution to trusted identifiers.

Add semantic checks that \`executed\` does not exceed \`changed_lines\`, selected count does not exceed total, configured gates appear exactly once, and the report SHA equals the CI SHA. These rules are straightforward application invariants even when not encoded in the structural schema.

The [release-gates.yaml policy guide](/blog/release-gates-yaml-team-policy-schema) defines the expected gate set. Load policy and report together, then reject missing, duplicate, or unknown gate results. Strict input and output schemas prevent spelling mistakes from weakening enforcement.

## Recompute the Verdict Independently

Never trust the producer's \`verdict\` field by itself. The consumer calculates the expected value from failed gates, blockers, and waiver state, compares it with the supplied value, and rejects disagreement. This guards against producer bugs and deliberate or accidental label changes.

Under the assigned contract, any failed gate or blocker produces \`NO_GO\`. When no blocker exists and every waiver is named and accepted, nonempty waivers produce \`GO_WITH_WAIVERS\`. When no blocker or waiver remains, the verdict is \`GO\`.

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
    throw new Error('reported verdict disagrees with gate results and waivers');
  }
}
\`\`\`

Do not derive GO_WITH_WAIVERS merely because a waiver array exists. Every item needs ownership and acceptance. The sibling [release waiver ownership guide](/blog/release-waiver-ownership-acceptance-contract) covers classification and human acceptance boundaries in detail.

Also reject duplicate gate names because one passing entry could conceal another failing entry in a careless map conversion. Compare the set of report gates with configured policy. The evaluator should know whether every required field was assessed rather than interpreting absence as pass.

A machine verifiable no go report can contain a NO_GO verdict with an empty blocker list when a gate fails, but better diagnostics should mirror the concrete failure in blockers and remediation. Enforce whichever mirroring rule the repository formally adopts; do not silently assume it from structural validity.

## Verify Freshness and Evidence References

Freshness begins with exact commit identity. The report's \`head_sha\` must equal the SHA checked out by the trusted evaluator. Every test, coverage, scanner, migration, and review artifact should also declare that SHA or provide a verifiable linkage to the same workflow execution.

Treat a branch name as insufficient identity because it can move. Treat a pull-request number as scope context, not content identity. A run triggered before a force push can belong to the same pull request while judging different code.

Evidence references should follow a repository-defined grammar. Examples include \`run #8841\`, \`orders/service.ts:118-131\`, \`migration 0043\`, and \`diff hunk auth/session.ts:72\`. The validator can require at least one recognized reference form without pretending to prove that the artifact exists.

Existence checks belong to trusted adapters. A test adapter confirms run ID, status, and SHA through the CI provider. A coverage adapter verifies the artifact hash and changed-line mapping. A migration adapter confirms the named file appears in the diff. Keep adapter results normalized and small.

| Freshness failure | Why it invalidates the report | Required response |
|---|---|---|
| Report SHA differs from CI SHA | Verdict judges another revision | Reject report |
| Test run predates latest push | Required suite may not cover new code | Mark gate failed |
| Coverage uses another base | Changed-line gaps are miscomputed | Recollect coverage |
| Scanner compares wrong branch | New-finding delta is unreliable | Rerun correct comparison |
| Review acknowledgment predates changed risk map | Human did not review current risks | Require fresh acknowledgment |

SonarQube quality gates evaluate conditions against analysis results, as described in the official [quality-gate introduction](https://docs.sonarsource.com/sonarqube-server/2026.1/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates). When importing such a result, preserve its project, branch or pull request, analysis identity, and source SHA rather than copying only "passed."

Never place secrets, production records, full tokens, or sensitive scanner payloads in the report. Store protected details in controlled artifacts and reference them according to access policy. The report needs enough identity for authorized reviewers, not unrestricted copies of every source.

## Test the Validator With Invalid Reports

A validator proven only against one happy report is not a release control. Build table-driven negative tests from every contract rule. Assert the exact rejection category so a parser failure does not masquerade as a verdict inconsistency.

At minimum, test this sequence:

1. Validate a complete GO report with no blockers or waivers.
2. Change one gate to fail while leaving \`verdict: GO\`; expect inconsistency rejection.
3. Add an ownerless waiver and \`GO_WITH_WAIVERS\`; expect NO_GO derivation.
4. Change \`head_sha\`; expect freshness rejection.
5. Remove each required field one at a time; expect schema rejection.
6. Add an unknown top-level field; expect strict-schema rejection.
7. Duplicate a gate name or omit a configured gate; expect policy comparison rejection.
8. Make selected or executed counts impossible; expect semantic rejection.

Include malformed JSON, unsupported schema dialect, invalid enum values, empty evidence, and non-integer counts. A machine verifiable no go report should fail with a concise diagnostic that identifies the JSON path and rule, then set a terminal failed check.

Test trusted adapter boundaries separately. Supply a nonexistent run, a run for another SHA, a deleted artifact, and a scanner result from the wrong base. Structural fixtures cannot prove provider linkage; adapter integration tests can.

The [dependency upgrade API review](/blog/dependency-upgrade-changelog-api-usage-release-review) applies when updating the JSON Schema validator or YAML parser. Map the exact APIs used, read official release information, and rerun negative fixtures before trusting a new version.

Keep example reports synthetic. Do not copy production incident records or credentials into fixtures. Use deterministic SHAs, run IDs, files, and migration names that are clearly test data while still matching validation grammar.

## Run Validation as a Protected CI Check

Place schema, semantic, freshness, adapter, and verdict checks in one trusted evaluator. Producers can upload evidence, but the aggregate status should be written by the evaluator after it checks every configured gate. This reduces opportunities for one producer to declare its own release outcome.

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

The escaped expression above is standard GitHub Actions context syntax inside this TypeScript template. In an actual workflow, ensure evidence-producing jobs run before this job and download their artifacts. Give the final check a unique, stable name.

GitHub documents that protected branches can require status checks before merge and can select an expected app source in supported settings. Its [protected branch guide](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) also warns that duplicate job names can make required results ambiguous. Protect \`release/report-contract\` and avoid reusing that name elsewhere.

Use minimal permissions. Untrusted pull-request code should not obtain credentials capable of forging a trusted result or changing branch rules. Depending on repository threat model, separate evidence execution from privileged status publication and validate artifact provenance before publication.

Return terminal failures for missing report, malformed JSON, unavailable evidence, and invalid policy. Avoid path filters that prevent a required check from appearing. A pull request with no release-relevant changes can produce a valid report whose gates cite the no-change diff inventory.

The [CI/CD pipeline guide](/blog/cicd-testing-pipeline-github-actions) provides surrounding workflow patterns. The report evaluator remains a recommendation mechanism even when branch protection enforces its status; it does not perform deployment.

## Trust Evidence Producers and Artifact Paths

A machine verifiable no go report is only as trustworthy as the chain that supplies its fields. Treat test runners, coverage collectors, scanners, migration analyzers, review adapters, the report producer, and the final evaluator as separate roles. Each role should emit a small artifact with identity, revision, status, and provenance.

Define an evidence manifest before combining results. For each producer, record the gate name, job or app identity, run ID, artifact name, artifact digest when available, base, HEAD, and parser version. The evaluator rejects missing producers, unexpected producers, duplicate gate names, and revision mismatches before deriving a verdict.

| Producer role | Trusted output | Consumer check |
|---|---|---|
| Test job | Suite result, run ID, HEAD | Required suite exists and is terminal |
| Coverage job | Changed lines, executed lines, classified gaps | Base and HEAD match the report |
| Scanner job | New-finding delta and analysis identity | Comparison baseline and SHA match |
| Migration analyzer | Migration IDs and rollback evidence | Diff contains cited files and notes |
| Review adapter | Named acknowledgment of current risk map | Identity and current SHA are valid |
| Report evaluator | Derived verdict and diagnostics | Protected status comes from expected source |

For each machine verifiable no go report, distinguish artifact existence from artifact trust. A file named \`unit-results.json\` can exist while coming from untrusted pull-request code or another workflow. The trusted adapter verifies source identity and run linkage, then normalizes only the fields the report contract needs.

Keep the evaluator deterministic and deny unknown evidence keys. If a scanner changes its output format, its adapter should fail with a parser diagnostic rather than supplying an empty finding list. If a test artifact is missing, \`tests.required_suites\` fails instead of defaulting to pass.

A machine verifiable no go report should preserve enough provenance for later reconstruction without copying sensitive logs. Reference controlled artifacts by run and name, retain their hashes according to repository policy, and keep secrets out of both human and JSON views. Authorized reviewers can follow the references when deeper inspection is needed.

Protect publication separately from execution. Untrusted code may need to run tests, but it should not possess credentials that can impersonate the expected status source. The final evaluator can read normalized artifacts with minimal permissions, verify them, and publish one aggregate result after every contract rule passes.

Finally, a machine verifiable no go report needs failure behavior for its own infrastructure. Artifact download errors, parser crashes, unavailable provider APIs, and unsupported policy versions are missing evidence. Return a terminal NO_GO diagnostic, retain available logs, and rerun only after the fault is understood or repaired.

## Normalize Evidence Without Losing Meaning

Adapters need a small shared envelope, but normalization must not erase distinctions required by policy. A skipped required suite, a failed suite, and a suite that never started are different producer states even when each prevents GO. Preserve the raw state, then map all three to a failed required-suite gate with specific evidence.

Define the normalized envelope around identity and measurement. Useful fields include producer name, producer version, gate name, base, HEAD, run ID, started and completed status, measured value, threshold input, and artifact reference. The central evaluator applies thresholds from the committed policy rather than trusting a producer's pass label.

For counts, retain both numerator and denominator when the contract uses them. Selected tests need selected and total counts. Coverage needs changed and executed lines plus classified gaps. Security deltas need base and HEAD identities with the new-finding count. A Boolean alone prevents later consistency checks and useful remediation.

Preserve not-applicable evidence explicitly. If no migration appears in the diff, the data adapter can emit an applicable pass with the diff inventory and HEAD. Omitting the data result is invalid because the consumer cannot distinguish no migration from a crashed adapter.

Normalization also needs stable status vocabulary. Translate provider-specific values at the adapter boundary and retain the original value for diagnostics. Unknown provider states fail parsing. Do not map a new or undocumented state to pass merely because it is not named failure.

Evidence text should be generated from structured adapter fields, not accepted as the only input. The evaluator can format a concise reference such as suite, run, and SHA while retaining machine fields for existence checks. This prevents small wording changes from breaking validation and avoids extracting authority from free-form prose.

Keep measurement and policy timestamps secondary to commit identity. Clock skew can make event ordering difficult across services, while base and HEAD establish which code was judged. Timestamps still help investigation, but they cannot repair a SHA mismatch or prove that a moving branch still names the same content.

Version adapter contracts. A consumer should reject an unsupported envelope version with a terminal diagnostic rather than guessing field meaning. During an upgrade, test old and new fixtures, choose the version explicitly, and keep verdict derivation unchanged unless team policy also changes.

Finally, retain the original producer artifact according to repository policy. Normalized fields support automated decisions; raw output supports authorized investigation when parsing, classification, or provider behavior is disputed. Hash or otherwise identify the retained artifact so the report reference resolves to the same content the adapter read.

## Keep Human and Machine Views Aligned

Render Markdown from the validated report after derivation, not from separate handwritten notes. Show verdict, risk map, evidence, blockers, waivers, and numbered remediation. Link each item to the artifact location available to reviewers.

Human wording can be clearer than field names. Display \`NO_GO\` as "NO-GO" and explain user behavior in full sentences. Do not alter classification or omit inconvenient entries. The JSON remains the canonical machine contract, while Markdown is its accessible presentation.

Keep remediation specific and testable. "Add a test driving the refund branch through the public API" is actionable. "Improve coverage" does not name behavior or completion evidence. Order steps so contributors can rerun the relevant narrow test before the full required suites.

Pair the report with specialized evidence guides. The [rolling-deploy migration gate](/blog/database-migration-rolling-deploy-compatibility-gate) supplies old-code and new-schema evidence. The [release-gates team policy guide](/blog/release-gates-yaml-team-policy-schema) supplies configured thresholds. Both feed the same report rather than publishing independent verdicts.

For your next pull request, install the [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian), emit its complete JSON contract, and make independent verdict verification the required check. That route provides the exact source workflow, field reference, and guardrails behind this tutorial.

## Frequently Asked Questions

### Is valid JSON enough for a release report?

No. JSON syntax only proves that a parser can read the document. JSON Schema checks structural assertions, while application logic verifies configured gates, count relationships, evidence references, artifact freshness, and verdict derivation. A syntactically valid report can still be stale, incomplete, or internally contradictory.

### Why should CI recompute the verdict?

Independent derivation catches producer bugs and prevents a label from overriding failed evidence. The consumer examines gate statuses, blockers, and accepted named waivers, calculates the expected verdict, and rejects disagreement. This keeps the report's decision traceable to fields rather than trusting one mutable string.

### Can JSON Schema verify that a test run exists?

No. A structural schema can require a nonempty run identifier and constrain its shape, but it cannot prove provider existence or commit linkage by itself. A trusted CI adapter must query or inspect the run artifact, verify its status and SHA, then supply normalized evidence.

### What should happen after a new commit is pushed?

Invalidate evidence that does not declare or link to the new HEAD. Rerun required suites, coverage mapping, scanner comparison, and any review acknowledgment affected by the changed risk map. The pull-request number remains the same, but the report must judge exact content identity.

### Should Markdown or JSON be the canonical report?

Use one validated internal result, serialize JSON for machines, and render Markdown for reviewers. JSON supplies stable fields and strict checks; Markdown supplies explanation and links. Neither should be independently authored because duplicated blocker and waiver lists can drift during remediation.

### Can a NO-GO report trigger deployment automatically?

No. NO_GO blocks according to repository policy, while GO remains a recommendation that satisfies configured evidence checks. The Guardian explicitly never merges, deploys, tags, or grants formal approval. Authorized humans and deployment systems retain their separate responsibilities after report validation.
`,
};
