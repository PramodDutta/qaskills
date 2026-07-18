import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Rolling-Deploy Migration Gates',
  description:
    'Build rolling deploy migration compatibility gates with expand-contract checks, old-code probes, rollback evidence, and machine-readable release decisions.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Guide',
  primaryKeyword: 'rolling deploy migration compatibility',
  keywords: [
    'rolling deploy migration compatibility',
    'database migration release gate',
    'expand contract migration',
    'zero downtime database migration',
    'old code new schema testing',
    'migration rollback evidence',
    'release readiness report',
    'postgresql migration testing',
  ],
  relatedSlugs: [
    'dependency-upgrade-changelog-api-usage-release-review',
    'release-gates-yaml-team-policy-schema',
    'machine-verifiable-no-go-release-report-json',
    'release-waiver-ownership-acceptance-contract',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/sql-altertable.html',
    'https://www.postgresql.org/docs/current/ddl-constraints.html',
    'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches',
    'https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html',
  ],
  content: `A rolling deploy migration compatibility gate proves that old and new application revisions can share the database while pods overlap. It checks both schema directions, migration evidence, selected tests, and rollback documentation before returning a release verdict. Missing proof fails the gate instead of turning deployment timing into an assumption.

The [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) treats every migration as high risk and asks two questions: is there a down path, and can old code tolerate the new schema during deployment? This guide turns those questions into a repeatable check. The wider [QASkills directory](/skills) provides complementary skills when a repository needs deeper database, coverage, or pipeline analysis.

## Decide What the Compatibility Gate Proves

A migration can be valid SQL and still be unsafe during a rolling release. Database validity asks whether the statement executes and leaves constraints satisfied. Overlap compatibility asks whether every application revision expected during rollout can read and write while that resulting schema is active.

The gate therefore evaluates a release interval, not one final state. At minimum, it identifies the old application revision, the candidate revision, the schema before migration, and the schema after migration. It then records which pairings are permitted by the deployment plan and tests every permitted pairing.

The repository contract classifies data-shape changes as high risk. It also says missing evidence is a NO-GO, so an undocumented claim that an additive change is safe cannot pass. A useful rolling deploy migration compatibility decision contains test identifiers, migration identifiers, file locations, and the exact commit being judged.

Do not confuse this decision with authorization to deploy. The Guardian recommends a verdict but never merges, tags, approves, or deploys. A named human owns the release decision after reading the risk map and evidence. The [release readiness scorecard guide](/blog/ai-release-readiness-scorecard-2026) explains how that recommendation fits a broader review.

Define the gate boundary before running commands. If the platform updates ten instances gradually, the overlap includes old and new binaries. If a maintenance window stops every writer before migration, the compatibility matrix differs, but the stop-the-world procedure itself needs cited evidence. Policy follows the declared release method rather than an idealized architecture.

The gate should answer four concrete questions:

1. Can the old revision start, read, and write against the migrated schema?
2. Can the new revision operate before the migration when deployment order permits that state?
3. Do constraints, defaults, and generated values preserve both revisions' write contracts?
4. Is rollback documented, or is an irreversible operation covered by an accepted named waiver?

These questions make the result reviewable. They also prevent a green migration command from being reported as proof of application compatibility.

## Model Every Schema and Application Pairing

Start with a state matrix. Rows represent deployed application revisions, columns represent schema states, and each cell says whether the release plan can create that pairing. A cell that cannot occur should name the mechanism preventing it, such as a completed drain or an orchestrator barrier.

| Application revision | Schema before | Schema after expand | Schema after contract | Gate treatment |
|---|---|---|---|---|
| Old revision | Required baseline | Must pass during overlap | Usually forbidden until old instances drain | Test or prove exclusion |
| Candidate revision | Test if code can arrive first | Required target | Test after cleanup migration | Test every reachable state |
| Rollback revision | Required recovery state | Must pass if rollback keeps schema | Usually incompatible by design | Block or document recovery |

An expand migration adds a compatible shape, such as a nullable column or a new table, before candidate code depends on it. A contract migration removes the old shape only after old code and rollback paths no longer require it. This sequence is a release pattern, not a PostgreSQL guarantee. Each repository must prove its own reads, writes, defaults, and constraints.

PostgreSQL documents the available forms of [ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html), including adding and dropping columns, changing types, setting defaults, and validating constraints. That reference defines statement behavior. It does not know which fields an old binary selects, which inserts omit a column, or which enum values a serializer accepts.

The rolling deploy migration compatibility matrix should include background workers, scheduled jobs, and consumers that share the database. A web service may tolerate the expanded schema while an old queue worker selects columns into a strict positional decoder. Inventory deployable processes rather than treating the main API as the complete application.

A rolling deploy migration compatibility review also records revision retirement criteria. The contract migration cannot begin merely because candidate instances started; evidence must show old readers, writers, and supported rollback binaries have left every reachable path.

Include both reads and writes. An old reader may ignore a new nullable column, yet an old writer can create rows that violate the candidate revision's assumptions. A new default may protect omitted fields at the database boundary while an application-level validator still rejects records returned from another revision.

For each reachable cell, name representative user behavior. Examples include creating an order, updating its status, consuming its event, and reading it through the API. This keeps compatibility evidence connected to observable behavior. The [risk-based testing strategy](/blog/risk-based-testing-strategy-guide-2026) provides a useful method for ranking these paths without inventing probability scores.

## Classify Migration Operations by Evidence Needed

Do not assign safety from a filename or migration-tool label. Read the SQL, ORM model changes, application diff, and callers. The same \`ADD COLUMN\` phrase can represent a harmless optional field, a required field with a safe server default, or a write-breaking requirement enforced too early.

| Change form | Main overlap question | Minimum useful evidence | Typical gate result when unknown |
|---|---|---|---|
| Add nullable column | Do old serializers ignore it? | Old-revision read and write probe | NO-GO |
| Add required column with default | Can old inserts omit it, and can new code read old rows? | Insert probes plus backfill checks | NO-GO |
| Add constraint as not valid | Are new writes enforced, and can existing rows validate later? | Boundary writes and validation query | NO-GO |
| Rename column | Do any old queries still use the old name? | Caller inventory and overlap test | NO-GO |
| Narrow type or enum | Can either revision emit rejected values? | Boundary fixtures and dual-version writes | NO-GO |
| Drop column or table | Has every reader, writer, job, and rollback path stopped using it? | Usage evidence and completed drain | NO-GO |

PostgreSQL's [constraint documentation](https://www.postgresql.org/docs/current/ddl-constraints.html) defines check, not-null, unique, primary-key, and foreign-key behavior. Use those declarations as the database source of truth. The [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) then maps each declared constraint to valid, boundary, and negative fixtures without copying production rows.

Constraint tests should assert the intended rejection and the absence of partial writes. A new check constraint deserves values just inside and outside its boundary. A foreign key deserves valid-parent, deleted-parent, and wrong-entity cases. A required column deserves omitted, explicit null, and valid inputs according to the actual API and DDL layers.

Schema disagreements are findings. If a TypeScript field remains optional after the migration makes it not null, the database will reject an application state the type system accepts. If an API schema lists an enum value absent from the database check, generation from the API alone creates invalid fixtures. Resolve or report the mismatch instead of choosing whichever declaration helps the gate pass.

A destructive label is necessary but insufficient. Adding a unique constraint can reject existing or concurrent writes. Changing a default can alter behavior without changing validity. Backfills can expose timing and partial-progress states. Capture the exact statement, affected table, callers, and behavior at risk in the report's risk map.

When an ORM or database client changes beside the SQL, run the [dependency upgrade used-API review](/blog/dependency-upgrade-changelog-api-usage-release-review) separately. Package compatibility and application/schema overlap produce different evidence and can fail independently.

## Build the Gate as an Ordered Procedure

The procedure must be deterministic enough for another reviewer to reproduce. Keep generated files, lockfiles, and vendored output visible in scope, even if the risk analysis separates them. Pin every test artifact to the candidate \`head_sha\` because stale results are invalid under the report contract.

1. **Establish the release scope.** Record the base reference, candidate commit, migration files, application revisions, deploy order, and every process sharing the schema. Save the diff and file list as artifacts.
2. **Create the risk map.** Classify the migration as a data-shape change, name affected user behavior, trace callers one level, and identify old readers, old writers, candidate readers, and candidate writers.
3. **Derive the state matrix.** Mark every application/schema pairing reachable during rollout or rollback. For excluded cells, attach orchestration or runbook evidence showing why they cannot occur.
4. **Generate constraint-driven fixtures.** Use DDL first, then ORM and API declarations, to create deterministic valid, boundary, and negative records. Include relation order and cleanup checks.
5. **Run narrow probes first.** Exercise each reachable cell through public or service boundaries, then run every required suite from team policy. Test selection accelerates feedback but cannot replace required suites.
6. **Intersect coverage with changed lines.** Classify unexecuted data-shape branches as blockers unless the repository contract supports a named waiverable class. Record files and line ranges.
7. **Evaluate policy and emit both reports.** Produce Markdown for reviewers and JSON for CI, recompute the verdict from gate results and waivers, then fail the required check on invalid or NO-GO output.

The [test impact analysis guide](/blog/test-impact-analysis-ci-guide-2026) can improve narrow selection, but migration files often have hidden edges outside import graphs. Declare migrations as inputs to repository, API, worker, and end-to-end targets that depend on the changed shape. Unknown ownership should expand selection rather than return zero tests.

Deterministic data matters because a compatibility failure must reproduce against both binaries. Seed generators once, include worker and sequence identifiers for unique fields, and fix time. The [synthetic test data generation guide](/blog/synthetic-test-data-generation-guide) covers those mechanics, while this gate consumes their outputs as release evidence.

Cleanup is part of the procedure. Run-tagged rows should be deleted and counted after each matrix cell, or an isolated database should be discarded. Residue can make a later cell appear compatible because a previous revision already populated fields that should have been absent.

## Test Old and New Code Against Both Schemas

A practical harness starts two application builds against controlled database states. Build immutable images or artifacts for the base and candidate commits. Apply migrations to fresh databases, then direct the same behavior probes to each reachable application/schema pair.

The following TypeScript sketch keeps the matrix explicit. Its adapter operations are repository-specific, while its required pairings come directly from the deployment plan.

\`\`\`typescript
type Revision = 'old' | 'candidate';
type SchemaState = 'before' | 'expanded';

type CompatibilityCase = {
  revision: Revision;
  schema: SchemaState;
  required: boolean;
  reason: string;
};

const cases: CompatibilityCase[] = [
  { revision: 'old', schema: 'before', required: true, reason: 'baseline' },
  { revision: 'old', schema: 'expanded', required: true, reason: 'rolling overlap' },
  { revision: 'candidate', schema: 'before', required: true, reason: 'code-first rollback window' },
  { revision: 'candidate', schema: 'expanded', required: true, reason: 'target state' },
];

for (const item of cases.filter((entry) => entry.required)) {
  const databaseUrl = await databases.create(item.schema);
  const app = await applications.start(item.revision, { databaseUrl });

  try {
    await probes.createOrder(app.url, { reference: 'order-compat-001' });
    await probes.updateOrder(app.url, { status: 'processing' });
    await probes.readOrder(app.url, { reference: 'order-compat-001' });
    await databases.assertConstraints(databaseUrl);
  } finally {
    await app.stop();
    await databases.destroy(databaseUrl);
  }
}
\`\`\`

Do not make \`candidate + before\` mandatory when orchestration truly applies schema first and prevents candidate startup beforehand. Instead, mark it excluded and cite that mechanism. Conversely, do not omit the pairing merely because the happy-path runbook says migrations happen first. Rollback or retries can create states the primary sequence does not advertise.

Probe behavior through the same boundary clients use where practical. Direct repository calls can prove SQL compatibility but miss request validation, serialization, events, and cached models. Pair targeted database tests with API or worker tests. The [database testing automation guide](/blog/database-testing-automation-guide) gives additional transaction, constraint, and integration patterns.

The rolling deploy migration compatibility artifact should name each required cell and its terminal result. A missing cell is missing evidence, not an implicit pass, even when every executed probe succeeds.

Run negative probes too. Verify old writes do not create candidate-invalid records, new writes remain readable by old code, unknown enum values receive the documented behavior, and failed constraints leave no partial state. Record test names, run identifiers, application revisions, migration identifiers, and database versions in the evidence artifact.

## Encode the Exact Data Policy in release-gates.yaml

The gate file belongs to the team, not to an agent's private judgment. The assigned contract uses two data fields: rollback documentation is required, and destructive migrations require a waiver. Preserve those names so the evaluator and report consumer share one vocabulary.

\`\`\`yaml
gates:
  tests:
    required_suites: [unit, integration, e2e-smoke]
    flake_policy: quarantine-lane
    max_new_skips: 0
  coverage:
    changed_line_blockers: 0
    changed_line_min_pct: 80
  static:
    lint_errors: 0
    type_errors: 0
    new_security_findings: 0
  data:
    migration_rollback_documented: true
    destructive_migration_requires_waiver: true
  process:
    risk_map_reviewed: true
    max_diff_lines: 2000
\`\`\`

\`migration_rollback_documented\` fails when a diff contains a migration without a down path or deploy note. A deploy note must explain recovery mechanics and old-code tolerance, not merely state that rollback was considered. \`destructive_migration_requires_waiver\` covers drop and narrowing operations through the repository's declared policy.

The rolling deploy migration compatibility check should appear as evidence for the data gate, not as an undocumented extra verdict. A gate result can name the migration, matrix artifact, and run identifier. If one required matrix cell fails, the status is \`fail\`, and the blocker names the behavior and concrete artifact.

Policy changes need review like code. The sibling guide to [making release-gates.yaml team policy](/blog/release-gates-yaml-team-policy-schema) explains field ownership, validation, and branch enforcement. Avoid copying thresholds into workflow conditionals because duplicated policy can disagree during the release that most needs clarity.

GitHub says protected branches can require status checks before merge, and required checks can be limited to an expected app source in supported settings. Its [protected branch documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) also warns that duplicate job names can make required results ambiguous. Give the compatibility check a unique, stable name and bind it to the protected branch.

Required checks are enforcement, not evidence generation. The job must still preserve its matrix, logs, schema state, and report. A green label without inspectable artifacts cannot satisfy the Guardian rule that every claim cites its source.

## Emit Concrete Evidence in the NO-GO Report

The report contract requires \`verdict\`, \`head_sha\`, \`base_ref\`, \`risk_map\`, \`selected_tests\`, \`coverage\`, \`gate_results\`, \`blockers\`, \`waivers\`, and \`to_reach_go\`. CI must derive the verdict from gate results plus waivers rather than trusting a producer's label.

\`\`\`json
{
  "verdict": "NO_GO",
  "head_sha": "7d2a91c",
  "base_ref": "origin/main",
  "risk_map": [
    {
      "change": "orders migration 0043 adds status value",
      "behavior_at_risk": "old workers reading order status",
      "blast_radius": "all order update jobs",
      "surface": "data-shape",
      "risk": "high"
    }
  ],
  "gate_results": [
    {
      "gate": "data.migration_rollback_documented",
      "status": "fail",
      "evidence": "migration 0043 has no down path or deploy note"
    },
    {
      "gate": "tests.required_suites",
      "status": "fail",
      "evidence": "compat run #194 old+expanded failed at orders/worker.ts:88"
    }
  ],
  "blockers": [
    "old worker rejects expanded status in run #194 at orders/worker.ts:88",
    "migration 0043 lacks rollback documentation"
  ],
  "waivers": [],
  "to_reach_go": [
    "deploy tolerant old-worker reader before migration 0043",
    "add a down migration or a deploy note proving recovery"
  ]
}
\`\`\`

Evidence strings should identify artifacts, not conclusions. "Compatibility failed" is weak because a reviewer cannot locate the failure. "Run #194, old worker plus expanded schema, \`orders/worker.ts:88\`" connects the result to a reproducible state, code location, and run.

The [machine-verifiable NO-GO report guide](/blog/machine-verifiable-no-go-release-report-json) shows how to validate this object and recompute the verdict. Keep the human Markdown report aligned with the JSON fields. Two independently authored summaries invite disagreement about blockers and waivers.

Freshness is mandatory. The application artifacts, migration diff, selected tests, coverage, and report must all correspond to \`head_sha\`. A new commit invalidates earlier evidence even when it only appears to change documentation, because the report consumer should not guess whether the artifact remains applicable.

Security findings remain part of the same gate set. OWASP identifies dependency-chain abuse, insufficient flow control, improper artifact integrity validation, and insufficient logging among CI/CD risks in its [CI/CD Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html). Restrict report-writing credentials, preserve provenance, and never let untrusted pull-request code forge the required check.

## Diagnose Failures Without Weakening the Gate

A compatibility failure is a design signal, not a request for repeated retries. Classify the failing matrix cell, identify the read or write contract involved, and change rollout sequencing or application behavior. Then rerun every affected cell at the new HEAD.

| Failure | Likely corrective pattern | Evidence required afterward |
|---|---|---|
| Old reader rejects new value | Deploy tolerant reader before value emission | Old+expanded read probe |
| Old writer omits required field | Add safe default or delay constraint | Old+expanded write probe |
| Candidate expects completed backfill | Read both representations during transition | Partial-backfill fixtures |
| Contract migration breaks rollback | Delay drop until rollback window closes | Usage inventory and drain record |
| Constraint validation finds old rows | Repair data before validation | Deterministic validation query |

Do not relabel a failed data-shape test as flaky without diagnosis. The Guardian contract says flaky failures should be classified rather than ignored and rerun. If concurrency or environment timing caused nondeterminism, preserve the seed, schema state, revision pair, and logs needed to reproduce it.

Waivers are narrow. The contract permits waiverable coverage such as a debug log, while a migration compatibility blocker belongs in \`blockers\`. If team policy allows a destructive migration waiver, every waiver still needs a non-null owner and \`accepted: true\`. Read the sibling guide on [release waiver ownership](/blog/release-waiver-ownership-acceptance-contract) before designing an exception path.

Do not invent a rollback script that cannot be exercised. Some data transformations cannot reconstruct discarded values. In that case, document a forward recovery plan, deployment barrier, backup requirement, or operational restore procedure according to team policy, and report the remaining risk honestly. The gate's role is evidence, not optimistic wording.

The [test data management strategies guide](/blog/test-data-management-strategies) can help teams choose isolated databases, run tags, and cleanup ownership. Those controls make repeated compatibility runs trustworthy without using production records. Schema shapes and declared constraints are enough for gate fixtures.

## Adopt the Gate as a Required Release Check

Begin with one real migration and one service boundary. Build its state matrix, generate deterministic fixtures, run both application revisions, and publish the exact report fields. Expand coverage to workers and dependent services after the first evidence path is reproducible.

Name the required check clearly, for example \`release/migration-compatibility\`, and keep the name unique across workflows. Require it on the protected branch only after pull requests reliably receive a terminal result, including documentation-only changes. A skipped required workflow can otherwise leave merges blocked or create confusing policy gaps.

Keep rollout and rollback ownership with humans. Automation can inspect the diff, select tests, evaluate policy, and recommend NO-GO. It must not deploy or grant its own waiver. The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) provides the surrounding workflow structure for artifacts, jobs, and branch checks.

Use the exact phrase rolling deploy migration compatibility in the check description so reviewers understand what passed. The status should link to the Markdown report, while the JSON artifact supports machine validation. Both views must identify the candidate SHA and migration.

Treat rolling deploy migration compatibility as a release prediction bounded by the tested revisions and schema states. Post-deployment smoke checks still confirm production behavior after orchestration, routing, and real service dependencies enter the path.

Retain the matrix after release so the next migration starts from known revision pairings. Remove a pairing only when the deployment and rollback policies no longer permit that revision, then review the removal like any other change to release evidence.

This retained rolling deploy migration compatibility history exposes assumptions that should be retested when deployment topology or worker ownership changes.

For the next migration, install and apply the [AI Release Guardian](/skills/thetestingacademy/ai-release-guardian), commit the team gate file, and require its migration compatibility result before merge. That route gives agents the repository-grounded workflow used throughout this guide.

## Frequently Asked Questions

### Does an additive migration always pass the gate?

No. An added column, constraint, table, or enum value can still break strict readers, omitted-field writes, serializers, or old workers. The gate tests every reachable application/schema pair and checks declared constraints. Additive syntax is useful classification evidence, but it is not proof of behavioral compatibility.

### Must candidate code run against the old schema?

Only when rollout or rollback can create that pairing. If orchestration guarantees migration completion before candidate startup, record and cite that barrier. Do not exclude the pairing from an informal sequence alone. Retries, partial deployment, and rollback procedures can create states absent from the happy-path diagram.

### Is a down migration required for every change?

The repository gate requires a down path or deploy note when a migration exists. A deploy note can document forward recovery when reversal would discard data, but it must prove the chosen mechanism. Merely calling a change irreversible does not satisfy \`migration_rollback_documented\` or explain old-code tolerance.

### How should enum additions be tested during overlap?

Run old readers against rows containing the new value, and run old writers while the expanded schema is active. Also test API serialization, events, and background jobs that consume the enum. Delay emitting the value until every old consumer is tolerant when any required probe fails.

### Can a migration blocker receive a release waiver?

Only when committed team policy explicitly permits that class and a named owner accepts it. The default report contract treats missing evidence and failed required gates as NO-GO. A waiver cannot silently convert a blocker, and urgency does not change the evidence or the derived verdict.

### What evidence should the required check retain?

Retain the judged SHA, base reference, migration identifiers, state matrix, application artifact versions, fixture seed, selected tests, run identifiers, constraint results, coverage gaps, gate results, and remediation steps. Each blocker should point to a concrete run, file location, diff hunk, or migration rather than a general summary.
`,
};
