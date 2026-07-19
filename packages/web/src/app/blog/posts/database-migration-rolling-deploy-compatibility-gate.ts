import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Rolling Deploy Migration Compatibility Gate',
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
  content: `A rolling deploy migration compatibility gate proves that old and new app builds can share the DB while old and new pods run at the same time. It checks both schema directions, schema change proof, chosen tests, and rollback docs before returning a release verdict. Missing proof fails the gate instead of turning rollout timing into a guess.

The [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) treats each schema change as high risk and asks two questions: is there a down path, and can old code tolerate the new schema during rollout? This guide turns those questions into a repeatable check. The wider [QASkills directory](/skills) provides complementary skills when a repo needs deeper DB, test reach, or pipeline analysis.

## What Should a Database Migration Release Gate Prove?

A schema change can be valid SQL and still be unsafe during a rolling release. DB validity asks whether the statement executes and leaves constraints satisfied. Shared period fit asks whether each app build expected during rollout can read and write while that resulting schema is active.

The gate therefore checks a release interval, not one final state. At minimum, it finds the old app build, the new build, the schema before schema change, and the schema after schema change. It then records which pairings are allowed by the rollout plan and tests each allowed pairing.

The repo contract groups data-shape changes as high risk. It also says missing proof is a NO-GO, so an undocumented claim that an additive change is safe cannot pass. A useful rolling deploy migration compatibility decision contains test IDs, schema change IDs, file locations, and the exact commit being judged.

Do not confuse this decision with authorization to deploy. The Guardian recommends a verdict but never merges, tags, approves, or deploys. A named human owns the release decision after reading the risk map and proof. The [release readiness scorecard guide](/blog/ai-release-readiness-scorecard-2026) explains how that advice fits a broader review.

Define the gate boundary before running commands. If the platform updates ten instances gradually, the overlap includes old and new binaries. If a maintenance window stops each writer before schema change, the fit matrix differs, but the stop-the-world process itself needs cited proof. Policy follows the declared release method rather than an idealized architecture.

The gate should answer four clear questions:

1. Can the old build start, read, and write against the migrated schema?
2. Can the new build operate before the schema change when rollout order permits that state?
3. Do constraints, defaults, and generated values preserve both builds' write contracts?
4. Is rollback written, or is an irreversible change covered by an accepted named waiver?

These questions make the result reviewable. They also prevent a green schema change command from being reported as proof of app fit.

## How Does an Expand Contract Migration Model Each State?

Start with a state matrix. Rows represent deployed app builds, columns represent schema states, and each cell says whether the release plan can create that pairing. A cell that cannot occur should name the means preventing it, such as a completed drain or an orchestrator barrier.

| App build | Schema before | Schema after expand | Schema after contract | Gate treatment |
|---|---|---|---|---|
| Old build | Required baseline | Must pass during overlap | Usually forbidden until old instances drain | Test or prove exclusion |
| New build | Test if code can arrive first | Required target | Test after cleanup schema change | Test each reachable state |
| Rollback build | Required recovery state | Must pass if rollback keeps schema | Usually incompatible by design | Block or document recovery |

An expand schema change adds a compatible shape, such as a nullable column or a new table, before new code depends on it. A contract schema change removes the old shape only after old code and rollback paths no longer require it. This sequence is a release pattern, not a PostgreSQL guarantee. Each repo must prove its own reads, writes, defaults, and constraints.

PostgreSQL documents the available forms of [ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html), including adding and dropping columns, changing types, setting defaults, and validating constraints. That reference defines statement behavior. It does not know which fields an old binary selects, which inserts omit a column, or which enum values a serializer accepts.

The rolling deploy migration compatibility matrix should include background workers, scheduled jobs, and consumers that share the DB. A web service may tolerate the expanded schema while an old queue worker selects columns into a strict positional decoder. Inventory deployable processes rather than treating the main API as the complete app.

A rolling deploy migration compatibility review also records build retirement criteria. The contract schema change cannot begin merely because new instances started; proof must show old readers, writers, and supported rollback binaries have left each reachable path.

Include both reads and writes. An old reader may ignore a new nullable column, yet an old writer can create rows that violate the new build's guesses. A new default may protect omitted fields at the DB boundary while an app-level checker still rejects records returned from another build.

For each reachable cell, name a sample user flow. Examples include creating an order, updating its status, consuming its event, and reading it through the API. This keeps compatibility proof connected to observable behavior. The [risk-based testing strategy](/blog/risk-based-testing-strategy-guide-2026) provides a useful method for ranking these paths without inventing chance scores.

## Which Zero Downtime Database Migration Changes Need Proof?

Do not assign safety from a filename or migration-tool label. Read the SQL, ORM model changes, app diff, and callers. The same \`ADD COLUMN\` phrase can represent a harmless optional field, a required field with a safe server default, or a write-breaking requirement enforced too early.

| Change form | Main overlap question | Minimum useful proof | Typical gate result when unknown |
|---|---|---|---|
| Add nullable column | Do old serializers ignore it? | Old-build read and write probe | NO-GO |
| Add required column with default | Can old inserts omit it, and can new code read old rows? | Insert probes plus backfill checks | NO-GO |
| Add constraint with \`NOT VALID\` | Are new writes enforced, and can existing rows be validated later? | Boundary writes and validation query | NO-GO |
| Rename column | Do any old queries still use the old name? | Caller inventory and overlap test | NO-GO |
| Narrow type or enum | Can either build emit rejected values? | Boundary fixtures and dual-version writes | NO-GO |
| Drop column or table | Has each reader, writer, job, and rollback path stopped using it? | Usage proof and completed drain | NO-GO |

PostgreSQL's [constraint documentation](https://www.postgresql.org/docs/current/ddl-constraints.html) defines check, not-null, unique, primary-key, and foreign-key behavior. Use those declarations as the DB source of truth. The [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) then maps each declared constraint to valid, boundary, and negative fixtures without copying production rows.

Constraint tests should assert the intended rejection and the absence of partial writes. A new check constraint deserves values just inside and outside its boundary. A foreign key deserves valid-parent, deleted-parent, and wrong-entity cases. A required column deserves omitted, explicit null, and valid inputs according to the actual API and DDL layers.

Schema disagreements are findings. If a TypeScript field remains optional after the schema change makes it not null, the DB will reject an app state the type system accepts. If an API schema lists an enum value absent from the DB check, generation from the API alone creates invalid fixtures. Resolve or report the mismatch instead of choosing whichever declaration helps the gate pass.

A destructive label is required but insufficient because adding a unique constraint can reject existing or concurrent writes. Changing a default can alter flow without changing validity. Backfills can expose timing and partial-progress states. Capture the exact statement, affected table, callers, and flow at risk in the report's risk map.

When an ORM or DB client changes beside the SQL, run the [dependency upgrade used-API review](/blog/dependency-upgrade-changelog-api-usage-release-review) separately. Package fit and app/schema overlap produce different proof and can fail independently.

## How Do You Build the Gate as Ordered Steps?

The steps must be fixed enough for another team member to reproduce. Keep generated files, lockfiles, and vendored output visible in scope, even if the risk analysis separates them. Pin each test file to the new \`head_sha\` because stale results are invalid under the report contract.

1. **Establish the release scope.** Record the base reference, new commit, schema change files, app builds, deploy order, and each process sharing the schema. Save the diff and file list as files.
2. **Create the risk map.** Group the schema change as a data-shape change, name affected user flow, trace callers one level, and find old readers, old writers, new readers, and new writers.
3. **Derive the state matrix.** Mark each app/schema pairing reachable during rollout or rollback. For excluded cells, attach orchestration or runbook proof showing why they cannot occur.
4. **Generate constraint-driven fixtures.** Use DDL first, then ORM and API declarations, to create fixed valid, boundary, and negative records. Include relation order and cleanup checks.
5. **Run narrow probes first.** Exercise each reachable cell through public or service boundaries, then run each required suite from team policy. Test selection accelerates feedback but cannot replace required suites.
6. **Intersect test reach with changed lines.** Group unexecuted data-shape branches as blockers unless the repo contract supports a named waiverable class. Record files and line ranges.
7. **Check policy and emit both reports.** Produce Markdown for team members and JSON for CI, recompute the verdict from gate results and waivers, then fail the required check on invalid or NO-GO output.

The [test impact analysis guide](/blog/test-impact-analysis-ci-guide-2026) can improve narrow selection, but schema change files often have hidden edges outside import graphs. Declare schema changes as inputs to repo, API, worker, and end-to-end targets that depend on the changed shape. Unknown ownership should expand selection rather than return zero tests.

Fixed data matters because a fit failure must reproduce against both binaries. Seed generators once, include worker and sequence IDs for unique fields, and fix time. The [synthetic test data generation guide](/blog/synthetic-test-data-generation-guide) covers those mechanics, while this gate consumes their outputs as release proof.

Cleanup is part of the steps. Run-tagged rows should be deleted and counted after each matrix cell, or an isolated DB should be discarded. Residue can make a later cell appear compatible because a previous build already populated fields that should have been absent.

## How Should Old Code New Schema Testing Run?

A practical harness starts two app builds against controlled DB states. Build immutable images or files for the base and new commits. Apply schema changes to fresh DBs, then direct the same behavior probes to each reachable app/schema pair.

The following TypeScript sketch keeps the matrix explicit. Its adapters must be implemented for the repo, while its required pairings come directly from the rollout plan.

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

Do not make \`candidate + before\` mandatory when orchestration truly applies schema first and prevents new startup beforehand. Instead, mark it excluded and cite the mechanism that prevents it. Conversely, do not omit the pairing merely because the happy-path runbook says schema changes happen first. Rollback or retries can create states the primary sequence does not advertise.

Probe the flow through the same boundary clients use where practical. Direct data-access calls can prove SQL compatibility but miss request validation, serialization, events, and cached models. Pair targeted DB tests with API or worker tests. The [database testing automation guide](/blog/database-testing-automation-guide) gives additional transaction, constraint, and integration patterns.

The rolling deploy migration compatibility file should name each required cell and its terminal result. A missing cell is missing proof, not an implicit pass, even when each executed probe succeeds.

Run negative probes too. Verify old writes do not create new-invalid records, new writes remain readable by old code, unknown enum values receive the documented behavior, and failed constraints leave no partial state. Record test names, run IDs, app builds, schema change IDs, and DB versions in the proof file.

## How Should Migration Rollback Evidence Shape Team Rules?

The gate file belongs to the team, not to an agent's private judgment. The assigned contract uses two data fields: rollback docs is required, and destructive schema changes require a waiver. Preserve those names so the evaluator and report consumer share one vocabulary.

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

\`migration_rollback_documented\` fails when a diff contains a schema change without a down path or deploy note. A deploy note must explain recovery mechanics and old-code tolerance, not merely state that rollback was considered. \`destructive_migration_requires_waiver\` covers drop and narrowing changes through the repo's declared policy.

The rolling deploy migration compatibility check should appear as proof for the data gate, not as an undocumented extra verdict. A gate result can name the schema change, matrix file, and run ID. If one required matrix cell fails, the status is \`fail\`, and the blocker names the flow and clear file.

Policy changes need review like code. The sibling guide to [making release-gates.yaml team policy](/blog/release-gates-yaml-team-policy-schema) explains field ownership, check, and branch enforcement. Avoid copying thresholds into workflow conditionals because duplicated policy can disagree during the release that most needs clarity.

GitHub says protected branches can require status checks before merge, and required checks can be limited to an expected app source in supported settings. Its [protected branch documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) also warns that duplicate job names can make required results ambiguous. Give the fit check a unique, stable name and bind it to the protected branch.

Required checks are enforcement, not proof generation. The job must still preserve its matrix, logs, schema state, and report. A green label without inspectable files cannot satisfy the Guardian rule that each claim cites its source.

## What Belongs in a Release Readiness Report?

The report contract requires \`verdict\`, \`head_sha\`, \`base_ref\`, \`risk_map\`, \`selected_tests\`, \`coverage\`, \`gate_results\`, \`blockers\`, \`waivers\`, and \`to_reach_go\`. CI must derive the verdict from gate results, blockers, and waivers rather than trusting a producer's label. The abbreviated example below omits \`selected_tests\` and \`coverage\`; a schema-valid release readiness report must include them.

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

Evidence strings should identify sources, not merely state conclusions. "Fit failed" is weak because a team member cannot locate the failure. "Run #194, old worker plus expanded schema, \`orders/worker.ts:88\`" connects the result to a reproducible state, code location, and run.

The [machine-verifiable NO-GO report guide](/blog/machine-verifiable-no-go-release-report-json) shows how to check this object and recompute the verdict. Keep the human Markdown report aligned with the JSON fields. Two independently authored summaries invite disagreement about blockers and waivers.

Freshness is mandatory. The app files, schema change diff, chosen tests, test reach, and report must all correspond to \`head_sha\`. A new commit invalidates earlier proof even when it only appears to change docs, because the report consumer should not guess whether the file remains applicable.

Security findings remain part of the same gate set. OWASP lists Dependency Chain Abuse, Insufficient Flow Control Mechanisms, Improper Artifact Integrity Validation, and Insufficient Logging and Visibility among CI/CD risks in its [CI/CD Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html). Restrict report-writing credentials, preserve provenance, and never let untrusted pull-request code forge the required check.

## How Does PostgreSQL Migration Testing Find Failures?

A fit failure is a design signal, not a request for repeated retries. Group the failing matrix cell, find the read or write contract involved, and change rollout sequencing or app behavior. Then rerun each affected cell at the new HEAD.

| Failure | Likely corrective pattern | Proof required afterward |
|---|---|---|
| Old reader rejects new value | Deploy tolerant reader before value emission | Old+expanded read probe |
| Old writer omits required field | Add safe default or delay constraint | Old+expanded write probe |
| New expects completed backfill | Read both representations during transition | Partial-backfill fixtures |
| Contract schema change breaks rollback | Delay drop until rollback window closes | Usage inventory and drain record |
| Constraint check finds old rows | Repair data before check | Fixed check query |

Do not relabel a failed data-shape test as flaky without diagnosis. The Guardian contract says flaky failures should be grouped and rerun rather than ignored. If concurrency or environment timing caused nondeterminism, preserve the seed, schema state, build pair, and logs required to reproduce it.

Waivers are narrow. The contract permits waivers for test-reach gaps in low-risk code such as a debug log, while a schema-change compatibility blocker belongs in \`blockers\`. If team policy allows a destructive schema change waiver, each waiver still needs a non-null owner and \`accepted: true\`. Read the sibling guide on [release waiver ownership](/blog/release-waiver-ownership-acceptance-contract) before designing an exception path.

Do not invent a rollback script that cannot be exercised. Some data transformations cannot reconstruct discarded values. In that case, document a forward recovery plan, rollout barrier, backup requirement, or operational restore steps according to team policy, and report the remaining risk honestly. The gate's role is proof, not optimistic wording.

The [test data management strategies guide](/blog/test-data-management-strategies) can help teams choose isolated DBs, run tags, and cleanup ownership. Those controls make repeated fit runs trustworthy without using production records. Schema shapes and declared constraints provide a baseline for gate fixtures, but behavioral contracts may require additional data.

## Adopt the Gate as a Required Release Check

Begin with one real schema change and one service boundary. Build its state matrix, generate fixed fixtures, run both app builds, and publish the exact report fields. Expand test reach to workers and dependent services after the first proof path is reproducible.

Start the rolling deploy migration compatibility drill with one row and one user act. Ask the old build to read and write that row after the schema change. Then ask the new build to do the same against each state the rollout can create.

Keep logs for old and new builds in separate files. Name the schema state, build ID, run ID, and test case in each file. This makes a mixed-version fault easy to trace without reading one large shared log.

Name the required check clearly, for example \`release/migration-compatibility\`, and keep the name unique across workflows. Require it on the protected branch only after pull requests reliably receive a terminal result, including docs-only changes. A skipped required workflow can otherwise leave merges blocked or create confusing policy gaps.

Keep rollout and rollback ownership with humans. Automation can inspect the diff, select tests, check policy, and recommend NO-GO. It must not deploy or grant its own waiver. The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) provides the surrounding workflow structure for files, jobs, and branch checks.

Use the exact phrase rolling deploy migration compatibility in the check description so team members understand what passed. The status should link to the Markdown report, while the JSON file supports machine check. Both views must find the new SHA and schema change.

Treat rolling deploy migration compatibility as a release prediction bounded by the tested builds and schema states. Post-rollout smoke checks still confirm production behavior after orchestration, routing, and real service dependencies enter the path.

Retain the matrix after release so the next schema change starts from known build pairings. Remove a pairing only when the rollout and rollback policies no longer permit that build, then review the removal like any other change to release proof.

This saved rolling deploy migration compatibility history shows which guesses need new tests when rollout topology or worker ownership changes. It gives the next review a clear starting point.

For the next schema change, install and apply the [AI Release Guardian](/skills/thetestingacademy/ai-release-guardian), commit the team gate file, and require its schema change fit result before merge. That route gives agents the repo-grounded workflow used throughout this guide.

## Frequently Asked Questions

### Does an additive schema change always pass the gate?

No. An added column, constraint, table, or enum value can still break strict readers, omitted-field writes, serializers, or old workers. The gate tests each reachable app/schema pair and checks declared constraints. Additive syntax is useful classification proof, but it is not proof of behavioral fit.

### Must new code run against the old schema?

Only when rollout or rollback can create that pairing. If orchestration guarantees schema change completion before new startup, record and cite that barrier. Do not exclude the pairing from an informal sequence alone. Retries, partial rollout, and rollback steps can create states absent from the happy-path diagram.

### Is a down schema change required for each change?

The repo gate requires a down path or deploy note when a schema change exists. A deploy note can document forward recovery when reversal would discard data, but it must prove the chosen means. Merely calling a change irreversible does not satisfy \`migration_rollback_documented\` or explain old-code tolerance.

### How should enum additions be tested during overlap?

Run old readers against rows containing the new value, and run old writers while the expanded schema is active. Also test API serialization, events, and background jobs that consume the enum. Delay emitting the value until each old consumer is tolerant when any required probe fails.

### Can a schema change blocker receive a release waiver?

Only when committed team policy clearly permits that class and a named owner accepts it. The default report contract treats missing proof and failed required gates as NO-GO. A waiver cannot silently convert a blocker, and urgency does not change the proof or the derived verdict.

### What proof should the required check retain?

Retain the judged SHA, base reference, schema change IDs, state matrix, app file versions, fixture seed, chosen tests, run IDs, constraint results, test reach gaps, gate results, and fix steps. Each blocker should point to a clear run, file location, diff hunk, or schema change rather than a general summary.
`,
};
