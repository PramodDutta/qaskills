import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Bind Release Evidence to the HEAD SHA',
  description:
    'Learn to bind release evidence head sha values across GitHub Actions, test reports, coverage files, and artifacts so reviewers judge one exact commit.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Tutorial',
  primaryKeyword: 'bind release evidence head sha',
  keywords: [
    'bind release evidence head sha',
    'GitHub Actions commit SHA',
    'release evidence provenance',
    'stale CI artifact detection',
    'release readiness report',
    'required status checks',
    'artifact attestation',
    'AI release guardian',
  ],
  contentKind: 'child',
  pillarSlug: 'ai-release-readiness-scorecard-2026',
  relatedSlugs: [
    'max-diff-lines-release-analysis-gate',
    'ai-release-guardian-human-control-boundary',
    'schema-authority-ddl-orm-openapi-types-test-data',
    'constraint-field-map-before-test-data-generation',
  ],
  sources: [
    'https://docs.github.com/en/actions/reference/workflows-and-actions/contexts',
    'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks',
    'https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts',
  ],
  content: `To **bind release evidence head sha** means recording one immutable commit identifier in every test, coverage, scan, risk, and gate result. A reviewer should reject any release packet whose artifacts omit that identifier or name another commit. This rule prevents a green run from an earlier revision being presented as evidence for code that changed later.

Start with the [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian), then place its evidence contract inside the broader [release readiness scorecard](/blog/ai-release-readiness-scorecard-2026). The [QASkills directory](/skills) provides related instructions, while the [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) explains how change risk should influence test depth. Identity binding comes before either test selection or verdict calculation.

## Why the Judged Commit Must Be Immutable

A release report describes a specific tree, not a branch name, pull request number, workflow name, or artifact label. Each mutable label can point somewhere different after another push, synchronization, rerun, or base update. A full commit SHA identifies the exact Git object whose files the guardian inspected.

The repository skill makes stale evidence invalid by definition. Its JSON report includes \`head_sha\`, and its gate rules require suites to run at the judged HEAD. That design prevents a report from combining current diff analysis with yesterday's coverage and an older security scan.

Consider a pull request with commits A, B, and C. Unit tests pass at B, then C changes an authorization branch without triggering the expected workflow. A dashboard that only shows "unit: passed" invites a mistaken GO, while an evidence row naming B exposes the mismatch immediately.

| Evidence label | Stable enough for a verdict? | Failure mode | Required binding |
| --- | --- | --- | --- |
| Branch name | No | A later push moves the branch | Full judged commit SHA |
| Pull request number | No | Many commits share one number | Pull request plus judged SHA |
| Workflow run ID | Not alone | A run can test a merge commit or old head | Run ID plus tested SHA |
| Artifact filename | No | Names can be reused across runs | SHA inside content and metadata |
| Full Git commit SHA | Yes | Immutable object identity | Compare at every handoff |

This is not an argument that one SHA answers every GitHub event question. Pull request workflows may test a synthetic merge commit, while a policy report may judge the pull request head. The contract must name which object is judged, which object was executed, and whether policy permits that relationship.

The [GitHub Actions contexts reference](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts) states that \`github.sha\` depends on the triggering event. Therefore, copying that value without recording the event can still create ambiguity. A good report stores the event name, head SHA, tested SHA, base reference, and workflow run identity together.

## Choose the Correct SHA for Each Workflow Event

For a \`push\` workflow, \`github.sha\` normally identifies the pushed commit associated with the run. For an open pull request, the default checkout can represent the pull request merge ref rather than the source branch tip. Release policy must distinguish these cases instead of calling both values HEAD without qualification.

Use a small identity table before implementing the workflow. It forces reviewers to decide whether the gate judges source changes alone, the proposed merge result, or both. The answer depends on the repository's merge model and branch rules, not an agent preference.

| Workflow event | Candidate identity | What it represents | Recommended report field |
| --- | --- | --- | --- |
| \`push\` | \`github.sha\` | Commit associated with the push run | \`head_sha\` and \`tested_sha\` match |
| \`pull_request\` | \`github.event.pull_request.head.sha\` | Latest source branch commit | \`head_sha\` |
| \`pull_request\` | \`github.sha\` | Event-dependent merge ref commit | \`tested_sha\` when merge-result testing is intended |
| \`workflow_dispatch\` | Explicit input resolved to SHA | Operator-selected revision | Store input and resolved SHA |
| Reusable workflow | Caller-provided immutable value | Identity chosen by caller | Validate against checkout before testing |

GitHub's [workflow event documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts) links context values to the event payload. Do not infer source HEAD from a convenient environment variable when the payload exposes it directly. Also avoid passing only a short SHA, because operational tools can truncate identifiers differently.

An honest policy may require two successful lanes. One lane checks the source head for changed-line mapping, and another tests the merge result against the current base. Keep their identities separate in the report instead of overwriting one field with whichever lane finished last.

The [test impact analysis CI guide](/blog/test-impact-analysis-ci-guide-2026) is useful after this choice because impacted tests must map to the same diff endpoints. If the test selector analyzes base-to-head but the executor checks out another tree, its selected set no longer proves the stated change.

## Capture Identity Before Running Any Gate

Capture and verify identity as the first executable step. Every later job should consume a small immutable manifest produced from that step, rather than recalculating branch state independently. This approach makes differences between checkout state and event metadata visible before expensive suites run.

Follow this procedure for a pull request gate:

1. Read the source head SHA from the pull request event and save it as the judged identity.
2. Check out the intended revision explicitly, then compare \`git rev-parse HEAD\` with the planned tested identity.
3. Write an evidence manifest containing event, repository, base ref, head SHA, tested SHA, run ID, and attempt.
4. Pass that manifest to every test and analysis job through job outputs or an immutable artifact.
5. Fail aggregation if any result omits the manifest values or reports a conflicting SHA.

The following workflow fragment keeps the source head and checked-out commit explicit. Template expressions are escaped here because this article is stored inside a TypeScript template literal.


\`\`\`yaml
name: release-evidence
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  identity:
    runs-on: ubuntu-latest
    outputs:
      head_sha: \${{ steps.identity.outputs.head_sha }}
      tested_sha: \${{ steps.identity.outputs.tested_sha }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.head.sha }}
          fetch-depth: 0
      - id: identity
        shell: bash
        env:
          EXPECTED_HEAD: \${{ github.event.pull_request.head.sha }}
        run: |
          tested_sha="$(git rev-parse HEAD)"
          test "$tested_sha" = "$EXPECTED_HEAD"
          echo "head_sha=$EXPECTED_HEAD" >> "$GITHUB_OUTPUT"
          echo "tested_sha=$tested_sha" >> "$GITHUB_OUTPUT"
\`\`\`

This example deliberately tests the source head. A repository that requires merge-result testing should check out the merge ref and preserve the pull request head separately. The important property is an explicit choice with a machine-checked relationship, not one universal checkout recipe.

Do not place untrusted event text into shell commands. The identity values above come from SHA fields, while titles and branch names should remain data rather than executable fragments. This keeps provenance collection independent from contributor-controlled labels.

## Carry the SHA Through Every Evidence Artifact

Once identity is established, each producer should repeat it inside its output. A filename such as \`coverage-COMMIT.json\` helps humans, but the structured file must also contain the commit. Renaming a file should never change what the file claims to prove.

The repository report schema supplies a useful center. It stores \`head_sha\`, selected-test run identity, coverage gaps with file locations, gate evidence, blockers, waivers, and actions needed for GO. Extend individual suite formats with a small envelope when their native reporter lacks commit metadata.


\`\`\`json
{
  "schema_version": "release-evidence/v1",
  "head_sha": "4bd51b0c45b7f9d2355f4cbf6bc5f9c7f8184f64",
  "tested_sha": "4bd51b0c45b7f9d2355f4cbf6bc5f9c7f8184f64",
  "workflow": {
    "run_id": "98124417",
    "run_attempt": 1,
    "event": "pull_request"
  },
  "producer": "unit-tests",
  "result": "passed",
  "artifact": "junit.xml"
}
\`\`\`

Use the same envelope for unit, integration, browser, coverage, lint, type, and security outputs. The detailed result can remain in its native format, while the envelope gives the aggregator one predictable identity contract. A producer without an envelope becomes missing evidence and fails closed.

The [GitHub Actions pipeline guide](/blog/cicd-testing-pipeline-github-actions) covers job dependencies and artifact flow. Apply those mechanics without allowing a downstream job to download "the latest" artifact from another run. Select by the current run and verify embedded identity after download.

To **bind release evidence head sha** consistently, make identity a required field in the evidence schema rather than a logging convention. Logs are helpful for diagnosis, but they are difficult to validate completely. Structured fields let CI recompute whether the report's verdict agrees with its gate results.

## Reject Stale or Mixed Evidence During Aggregation

Aggregation is where a collection becomes a release claim. The aggregator must validate schema, identity, completeness, and gate semantics before calculating a verdict. It should not accept the first green file matching a friendly name.

This TypeScript example checks the essential identity rule. Production code should also validate the full report shape with the repository's chosen schema library.


\`\`\`ts
type EvidenceEnvelope = {
  producer: string;
  head_sha: string;
  tested_sha: string;
  result: 'passed' | 'failed';
  artifact: string;
};

export function requireEvidenceForHead(
  judgedHead: string,
  requiredProducers: string[],
  evidence: EvidenceEnvelope[],
) {
  const byProducer = new Map(evidence.map((item) => [item.producer, item]));

  for (const producer of requiredProducers) {
    const item = byProducer.get(producer);
    if (!item) throw new Error('Missing release evidence from ' + producer);
    if (item.head_sha !== judgedHead) {
      throw new Error(producer + ' evidence belongs to ' + item.head_sha);
    }
    if (item.tested_sha !== judgedHead) {
      throw new Error(producer + ' tested a different commit');
    }
    if (item.result !== 'passed') {
      throw new Error(producer + ' did not pass');
    }
  }
}
\`\`\`

Some repositories intentionally test a merge commit, so their relationship check will differ. They might require \`head_sha\` to match the current pull request and \`tested_sha\` to match GitHub's current merge ref. Document that function and test it with stale head, stale merge, missing producer, duplicate producer, and failed-result cases.

GitHub states that [required checks must succeed against the latest commit SHA](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks). Treat that platform rule as a minimum, not a complete evidence model. A custom guardian still needs to prove that coverage, risk mapping, and scanner output belong to the same judged revision.

Mixed evidence should produce NO-GO, not "inconclusive" or a percentage score. The missing-evidence rule in the assigned skill exists because uncertainty cannot support a safe positive recommendation. A human may decide how to proceed, but the guardian must state the gap plainly.

## Bind Stored Artifacts and Build Provenance

Workflow artifacts preserve reports after jobs finish, but storage alone does not prove which source produced them. Include the evidence envelope, use retention appropriate to your audit needs, and keep run links beside artifact digests. Anyone reopening a decision should reconstruct the identity chain without guessing.

GitHub explains that [workflow artifacts can store test results, coverage, logs, and build output](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts). The same documentation describes attestations that include repository, workflow, environment, triggering event, and commit SHA in build provenance. Those claims help connect a built subject to its production process.

An attestation does not replace test semantics. It can show that a particular workflow produced an artifact associated with a commit, but it does not prove that the right tests were selected or that a waiver was acceptable. Keep provenance validation and quality-gate evaluation as separate report rows.

Use artifact digests when a release candidate moves between build, scan, staging, and deployment systems. The commit identifies source, while the digest identifies the exact built subject. Rebuilding the same commit may produce a different digest because dependencies, toolchains, or timestamps changed, so record both values.

| Question | Identity to record | Why both levels matter |
| --- | --- | --- |
| Which source was judged? | Full commit SHA | Connects risk map and changed lines |
| Which workflow ran? | Run ID and attempt | Locates execution logs and reruns |
| Which file was tested? | Artifact digest | Distinguishes rebuilt subjects |
| Which policy applied? | Gate config revision or digest | Explains threshold decisions |
| Who accepted a waiver? | Named owner and record | Preserves human accountability |

The sibling guide to [maximum diff size release analysis](/blog/max-diff-lines-release-analysis-gate) adds another precondition: the guardian must be able to inspect the entire source diff honestly. Identity answers "which change," while diff size answers "can this change be reviewed within the stated method."

## Handle Reruns, New Pushes, and Merge Updates

Reruns require special care because a run ID and attempt may change without a new source commit. Record both values and rebuild the final report from one coherent attempt. Do not combine a rerun's passing unit suite with an original attempt's coverage unless policy explicitly verifies identical inputs and preserves that relationship.

A new push invalidates every earlier positive recommendation, even when only documentation appears changed. The guardian has not yet classified the new diff, and a file labeled documentation can alter generated configuration or executable examples. Trigger a fresh identity capture and report sequence.

Base branch updates can also change a synthetic merge commit while leaving the pull request head unchanged. Repositories testing merge results must refresh that lane and record the new tested SHA. Source-head evidence may remain useful diagnostically, but it cannot substitute for a required current merge-result check.

Apply these operational rules:

1. Cancel superseded runs where possible, but still reject their artifacts if they arrive late.
2. Query the current pull request head immediately before publishing the guardian report.
3. Compare every required result with the chosen head and merge identities.
4. Mark an existing report superseded when a new push or required base update occurs.
5. Require a new human review when repository policy treats the latest push as review-sensitive.

The [AI release guardian human control guide](/blog/ai-release-guardian-human-control-boundary) explains why the report remains advice. Identity binding improves the advice but does not grant merge, tag, deployment, approval, or waiver authority to the agent.

Schema changes deserve the same discipline. The [schema authority test data guide](/blog/schema-authority-ddl-orm-openapi-types-test-data) identifies which declaration governs generated cases, while the [test data constraint field map](/blog/constraint-field-map-before-test-data-generation) turns those declarations into reviewable inputs. Their outputs should name the schema revision that produced them.

## Validate Identity at Every Tool Boundary

A **bind release evidence head sha** rule can fail even when the initial checkout is correct. Test runners, coverage tools, scanners, artifact jobs, and report aggregators often execute in separate processes or jobs. Each handoff needs an explicit identity value and a comparison against locally observed state.

Begin with the checkout. Run \`git rev-parse HEAD\` after checkout and store the full result, rather than trusting the requested ref alone. If the workflow intentionally tests a synthetic merge commit, also store the pull request head and current base identity so the relationship remains reviewable.

Next, pass identity to the test process through a documented environment variable or argument. Include it in reporter metadata, not only console output. A test job can then prove which tree it executed even when its native JUnit, JSON, or coverage format does not contain Git information.

The **bind release evidence head sha** comparison should happen again after every download. Artifact selection by run ID narrows the source, but embedded metadata confirms the file itself belongs to that run and commit. Reject duplicate producer names because one stale file must not overwrite one current file silently.

| Tool boundary | Local observation | Received claim | Failure response |
| --- | --- | --- | --- |
| Checkout to test runner | \`git rev-parse HEAD\` | Judged and tested SHA | Stop before tests when they differ |
| Test runner to reporter | Process identity input | Report envelope SHA | Fail report creation when absent |
| Reporter to artifact upload | File digest and envelope | Job output SHA | Upload only the validated pair |
| Artifact download to aggregator | Downloaded digest | Embedded producer and SHA | Reject stale, duplicate, or unknown producer |
| Aggregator to reviewer | Current pull request head | Final report \`head_sha\` | Mark report superseded on mismatch |
| Reviewer to deployment | Approved artifact digest | Release record SHA and digest | Block promotion when either changed |

Scanners deserve the same treatment. A scanner may analyze checked-out source, a container image, or a software bill of materials. The report should identify its subject type and digest, then connect that subject to the judged commit through build provenance instead of assuming every scanner operates on source.

Coverage has another endpoint requirement. Changed-line analysis combines a coverage result with diff hunks, so both must name compatible revisions. Coverage from HEAD combined with hunks from a later base update can produce incorrect gap locations even when the application source SHA stayed fixed.

Apply the **bind release evidence head sha** check before interpreting pass percentages. A coverage percentage tied to another tree is not weaker evidence for this release; it is evidence about a different release. Keep it for history, but exclude it from the current verdict.

For reusable workflows, make judged identity a required input and compare it with the caller and checkout contexts. A reusable job should never discover "latest main" midway through analysis. Its contract should make every mutable resolution occur once, near the caller, and become an immutable SHA afterward.

## Drill Stale-Evidence Failures Before a Release

Teams often test only the happy path where every job finishes for one commit. A **bind release evidence head sha** control needs deliberate stale-evidence drills because concurrency, reruns, and delayed uploads create realistic conflicts. The expected outcome is a clear NO-GO with the mismatched producer named.

Create fixture envelopes for the current head, previous head, missing SHA, malformed SHA, merge commit, and duplicate producer. Feed them to the aggregator in different orders. The verdict must remain identical regardless of file arrival order, because completion timing is not evidence authority.

Exercise this procedure in a test repository or non-production workflow:

1. Start a release evidence run for commit A and pause one slow producer.
2. Push commit B, complete its required jobs, and let its aggregation begin.
3. Allow the delayed artifact from A to arrive after B's current artifacts.
4. Confirm B rejects A's artifact and reports its producer, SHA, run, and attempt.
5. Rerun the failed producer for B and confirm only coherent B evidence can replace it.

Also test base updates when merge-result testing is required. Keep the source head fixed, update the base, and prove the old synthetic merge evidence becomes stale. This scenario catches systems that compare only pull request head values and ignore the integration tree they actually executed.

Failure messages should help a reviewer act without weakening the rule. State the judged SHA, received SHA, producer, run link, and required remediation. Avoid a generic "artifact invalid" message that sends someone searching through every job during a release window.

| Failure | Useful report statement | Required next action |
| --- | --- | --- |
| Previous-head unit report | Unit evidence names A; current judged head is B | Run unit suite at B |
| Missing coverage identity | Coverage artifact has no \`head_sha\` | Fix producer and regenerate coverage |
| Old merge-result scan | Scan subject is not current merge commit | Rebuild and rescan current merge result |
| Duplicate security producer | Two envelopes claim one producer | Resolve workflow ownership and rerun |
| Current head changed during review | Report head no longer matches pull request | Supersede report and start current analysis |

The **bind release evidence head sha** rule should remain strict during outages. If the artifact service loses metadata or the current run cannot be retrieved, evidence is missing. A named human can make an emergency decision through separate policy, but the guardian should not infer success from an earlier green badge.

Finally, retain failed drill reports long enough to review them. They show whether controls rejected stale inputs for the expected reason and whether operators understood remediation. A control that technically fails closed but produces confusing guidance can still invite manual bypass.

## Make SHA Binding a Release Gate

Adopt SHA binding as a required process gate, not an optional report decoration. Add fields for \`head_sha\`, \`tested_sha\`, run identity, gate-config revision, and artifact digest where relevant. Then make the aggregator fail when a required field is absent, malformed, stale, or inconsistent.

A practical acceptance checklist asks whether the current pull request head was read at decision time, every suite names its tested tree, coverage uses identical diff endpoints, and the final report derives its verdict from those rows. It also checks that waivers name an owner and that no evidence producer silently defaulted to a branch label.

To **bind release evidence head sha** in your next review, install and apply the [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) against one pull request. Keep its first report as NO-GO until every required artifact proves the exact judged commit, then let the named human release owner make the decision.

## Frequently Asked Questions

### Is github.sha always the pull request HEAD SHA?

No. GitHub documents that context values depend on the triggering event, and pull request workflows can use a merge ref. Record \`github.event.pull_request.head.sha\` as the source head when that is your policy target, then record the actual checkout separately. Never assume one variable has identical meaning across every event.

### Can a passing workflow from the previous commit be reused?

Not for a positive verdict about the current commit. It can remain useful diagnostic history, but it does not prove the latest change. The guardian should mark the required gate missing or stale, trigger current execution when authorized, and wait for evidence whose identity matches the judged revision.

### Should source HEAD or the synthetic merge commit be tested?

That choice belongs in repository policy. Source-head testing supports precise diff and changed-line analysis, while merge-result testing detects integration with the current base. Many teams require both. Store separate \`head_sha\` and \`tested_sha\` values, then validate the permitted relationship rather than pretending they are one object.

### Do artifact attestations prove a release is safe?

No. Attestations establish provenance and integrity claims for a built subject, including workflow and commit information. They do not decide whether coverage is adequate, risk mapping is complete, or a failing gate deserves a waiver. The guardian should cite attestation verification as one evidence row among several.

### How should rerun attempts appear in the report?

Record the workflow run ID and attempt number alongside the commit and artifact digest. Aggregate one coherent attempt unless policy defines a verified reuse rule. If a rerun changes only execution timing, identity still matters because reviewers need a precise route to logs, outputs, and the result being cited.

### What happens when evidence has no commit field?

Treat it as missing evidence and issue NO-GO. Inferring identity from a filename, upload time, branch, or nearby workflow is too weak for a release claim. Update the producer to emit a structured envelope, regenerate the artifact, and let aggregation confirm the exact SHA before reconsidering the verdict.
`,
};
