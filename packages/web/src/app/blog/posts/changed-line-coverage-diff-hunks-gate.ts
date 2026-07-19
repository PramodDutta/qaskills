import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Changed Line Coverage Diff Hunks Guide',
  description:
    'Calculate changed line coverage diff hunks from Git patches and Istanbul JSON, classify uncovered lines, and enforce an evidence-backed release gate.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Tutorial',
  primaryKeyword: 'changed line coverage diff hunks',
  keywords: [
    'changed line coverage diff hunks',
    'Git unified diff parser',
    'diff hunk line numbers',
    'Istanbul coverage JSON',
    'new code coverage gate',
    'coverage gap detection rules',
    'fail closed quality gate',
    'release evidence report',
  ],
  relatedSlugs: [
    'empty-related-test-set-release-blocker',
    'uncovered-changed-lines-blocker-waiver-debt',
    'git-diff-behavior-risk-blast-radius-map',
    'deleted-tests-weakened-assertions-release-risk',
  ],
  sources: [
    'https://git-scm.com/docs/git-diff',
    'https://github.com/istanbuljs/nyc',
    'https://vitest.dev/guide/cli',
    'https://docs.sonarsource.com/sonarqube-server/user-guide/about-new-code',
  ],
  content: `
Changed line coverage diff hunks should be calculated by taking added code line numbers from the exact Git diff, normalizing Istanbul or runner JSON to original source lines, and intersecting the two sets. Missing coverage files, stale HEAD values, parse errors, or unmapped source paths must produce NO-GO rather than an optimistic rate.

The [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) treats this overlap as Stage 4 proof. Whole-repo rates cannot answer whether a new authorization branch ran. The gate needs exact changed lines, run counts, risk classes, and file citations tied to the judged commit.

This tutorial builds that proof pipeline without pretending line execution proves each outcome. Pair it with the [empty related-test set guide](/blog/empty-related-test-set-release-blocker) when selection makes no runnable tests, because absent coverage and uncovered code are distinct failure states.

## What Does a New Code Coverage Gate Measure?

A new code coverage gate measures which added or changed source lines were executed at the judged HEAD. Start with two sets for each current source path: the diff set holds new-side lines from Git. The hit set holds original source lines with positive execution counts from selected tests. Their overlap is changed code that was executed, while their difference is the first gap list.

The line total needs a declared rule. Comments, blank lines, braces, type-only declarations, and other non-instrumented text may appear in a Git hunk without appearing in coverage data. Counting each added text line makes the rate depend on formatting. Counting only lines recognized as code by the coverage tool makes a more useful gate, while non-code changes remain visible in the risk map.

| Set or result | Definition | Required proof |
| --- | --- | --- |
| Changed new lines | Added new-side line numbers in eligible source files | Saved patch and base/HEAD identifiers |
| Code changed lines | Changed lines represented by coverage mappings | Coverage JSON and adapter version |
| Executed changed lines | Code changed lines with a positive hit count | Test run at the judged HEAD |
| Uncovered changed lines | Code changed lines with zero hits | File, line, hunk, and flow risk |
| Unknown changed lines | Lines whose path or source map cannot be resolved | Clear parser or mapping error |

Never convert unknown lines into exclusions. A path mismatch, absent source map, truncated file, or unsupported coverage shape means the count failed. The Guardian's fail-closed rule makes missing proof NO-GO, not zero blockers.

SonarQube similarly distinguishes new code from overall code and defines pull request new code by diff with the target branch ([SonarQube new code documentation](https://docs.sonarsource.com/sonarqube-server/user-guide/about-new-code)). That principle supports change-focused review, but the Guardian still applies its own flow-risk classes and report contract.

The phrase changed line coverage diff hunks describes the count inputs, not a universal threshold. Teams may configure a minimum rate, yet the skill's decisive default is zero Blocker-class gaps. A single untested new payment branch can block even when many harmless lines raise the rate.

A valid line total also needs a coverage-capable file type and a successful mapping to original source. Keep three counts when reviewing the result: changed text lines, code changed lines, and executed changed lines. Their differences explain why a patch may contain many additions but only a smaller code line total. This separation prevents peers from mistaking excluded syntax for tested flow.

Changed line coverage diff hunks should be reproducible from archived inputs, not reconstructed from a dashboard screenshot. Given the patch, coverage JSON, adapter version, and checkout root, a second run of the checker should produce the same normalized line lists. A mismatch is a proof-integrity finding that must be resolved before threshold evaluation.

## Capture the Exact Patch and Revision

Git can compare working trees, indexes, commits, blobs, and merge results. Its official documentation states that the three-dot form compares the second commit with the common ancestor, and \`--merge-base\` offers equivalent diff forms ([Git diff documentation](https://git-scm.com/docs/git-diff)). Choose the form matching the release event, then record both endpoints.

Use this ordered procedure:

1. Resolve the target reference, merge base, and full HEAD SHA in the CI checkout.
2. Save a rename-aware name-status file and a zero-color unified patch from those endpoints.
3. Record the Git version and diff command beside the files for later reproduction.
4. Build the risk map from the same patch before excluding any source path from coverage.
5. Run selected tests and coverage at that HEAD, then reject each file naming another commit.

The [Git diff behavior and blast-radius guide](/blog/git-diff-behavior-risk-blast-radius-map) covers the semantic reading step. Coverage consumes that map; it cannot derive customer impact from line numbers alone.

\`\`\`bash
set -eu

BASE_REF=origin/main
HEAD_SHA=$(git rev-parse HEAD)
MERGE_BASE=$(git merge-base "$BASE_REF" "$HEAD_SHA")

mkdir -p artifacts
git --version > artifacts/git-version.txt
git diff --no-color --find-renames --name-status \
  "$MERGE_BASE" "$HEAD_SHA" > artifacts/change-status.txt
git diff --no-color --find-renames --unified=0 \
  "$MERGE_BASE" "$HEAD_SHA" -- '*.ts' '*.tsx' '*.js' '*.jsx' \
  > artifacts/coverage-target.diff

printf '%s\n' "$HEAD_SHA" > artifacts/head-sha.txt
printf '%s\n' "$MERGE_BASE" > artifacts/merge-base.txt
\`\`\`

Zero context simplifies added-line extraction, but it is not ideal for human risk review. Preserve a second patch with normal or function context if peers need surrounding flow. The official Git docs say unified context defaults to three lines unless configured otherwise and supports whole-function context with \`--function-context\`.

Do not ignore deleted files merely because they have no new-side lines. Deletions belong in the risk map, and deleted test files receive High treatment. The [deleted tests and weakened assertions guide](/blog/deleted-tests-weakened-assertions-release-risk) explains that parallel gate.

## How Does a Git Unified Diff Parser Read Diff Hunk Line Numbers?

A Git unified diff parser reads diff hunk line numbers from each old-side and new-side range. The new cursor starts at the number after the plus sign. A context line moves both cursors, a deletion moves only the old cursor, and an addition records the current new-side line number and then advances the new cursor.

Do not treat the file header beginning with three plus signs as an added source line. Parse only inside a recognized hunk. Handle omitted counts, zero counts, multiple hunks, paths with quoting, new files, renames, and the no-newline marker. Reject malformed state instead of guessing.

The official Git manual documents plus, minus, and space as the normal new, old, and context indicators. It also documents name-status filters for added, copied, deleted, modified, renamed, type-changed, unmerged, unknown, and broken pairs ([Git diff documentation](https://git-scm.com/docs/git-diff)). Preserve that status metadata alongside parsed lines.

This TypeScript parser demonstrates the essential new-line state machine. A production parser should add fixtures copied from your supported Git output and return structured errors with patch offsets.

\`\`\`typescript
type ChangedLines = Map<string, Set<number>>;

const hunkHeader = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;

export function parseAddedLines(patch: string): ChangedLines {
  const changed: ChangedLines = new Map();
  let file: string | null = null;
  let newLine = 0;
  let inHunk = false;

  for (const row of patch.split('\n')) {
    if (row.startsWith('+++ b/')) {
      file = row.slice('+++ b/'.length);
      inHunk = false;
      if (!changed.has(file)) changed.set(file, new Set());
      continue;
    }

    const header = hunkHeader.exec(row);
    if (header) {
      if (!file) throw new Error('hunk-before-new-file-header');
      newLine = Number(header[1]);
      inHunk = true;
      continue;
    }

    if (!inHunk || !file || row.startsWith('\\ No newline')) continue;

    if (row.startsWith('+')) {
      changed.get(file)?.add(newLine);
      newLine += 1;
    } else if (row.startsWith(' ')) {
      newLine += 1;
    } else if (!row.startsWith('-')) {
      inHunk = false;
    }
  }

  return changed;
}
\`\`\`

This parser intentionally targets a saved no-color patch with standard prefixes. Custom diff drivers, submodules, binary patches, combined merge diffs, and unusual quoting need clear handling or exclusion with rationale. Unsupported input should return unknown coverage and fail the gate.

Test the parser with additions above and below deletions, adjacent hunks, count-one shorthand, empty files, and rename-only changes. A line-number error can falsely accuse code or hide a gap, so the parser deserves unit tests and versioned fixtures like any other release component.

## How Should Istanbul Coverage JSON Be Checked?

Istanbul coverage JSON should be checked for its source commit, path map, report shape, and run status before use. Run narrow tests first, but still run each suite required by repo rules. Focused coverage finds likely gaps fast, while required suites may add proof. Merge only files from the same commit and matching tools.

The nyc project documents that it instruments visited files by default and can include all eligible files with \`--all\`. It also supports include and exclude filters, multiple reporters, raw output under \`.nyc_output\`, and merging raw runs into one JSON file ([Istanbul nyc documentation](https://github.com/istanbuljs/nyc)). Record those settings because they find which source files can appear.

For Vitest, the official CLI documents \`--coverage.changed <commit/branch>\` for collecting coverage only on files changed since a reference. It also states that using changed selection with coverage limits the report to files related to those changes ([Vitest CLI documentation](https://vitest.dev/guide/cli)). Even with that convenience, preserve your own patch and verify the reference.

\`\`\`bash
npx jest --coverage --coverageReporters=json --findRelatedTests \
  src/orders/service.ts src/orders/policy.ts
cp coverage/coverage-final.json artifacts/coverage-final.json

npx vitest --run --coverage --coverage.changed="$MERGE_BASE"
cp coverage/coverage-final.json artifacts/vitest-coverage-final.json

printf '{"head_sha":"%s","merge_base":"%s"}\n' \
  "$HEAD_SHA" "$MERGE_BASE" > artifacts/coverage-provenance.json
\`\`\`

Validate that JSON parses, expected files exist, hit counts are nonnegative numbers, and paths resolve within the checked-out repo. Reject duplicate logical files reached through different path spellings until they are normalized deterministically.

Coverage path normalization should account for absolute workspace prefixes and forward-slash conversion. Do not use suffix matching alone, because two packages can contain the same relative path. Resolve against the recorded checkout root, then require one unambiguous repo-relative path.

Parallel and sharded suites need a clear merge stage. Give each worker a unique raw-output folder, preserve its test result, and merge only after each expected producer reports completion. A missing shard is missing coverage proof, even when the remaining files merge successfully. Record the expected and received shard identifiers so the final report can distinguish a real zero-hit line from an absent producer.

Line tracking settings must agree across merged runs. Mixing different transpiler targets, source-map modes, include filters, or coverage-tool versions can assign counters to incompatible source locations. Store a compact config fingerprint with each shard and reject mismatches before merging. A later job should never repair an incompatible bundle by dropping the shard whose metadata differs.

Coverage collection also needs a deterministic test-data boundary. If an integration shard cannot start because relational fixtures violate a changed constraint, report the required suite as not run and keep the verdict NO-GO. Do not publish partial unit coverage as if it represented the blocked integration flow. Repair the schema-derived setup, rerun the suite, and regenerate each dependent file.

Treat the raw JSON as proof, not as a stable API across runner versions. Pin the adapter to the repo's coverage tool, validate its accepted shape, and fail with a named unsupported-schema error after upgrades. That clear failure is safer than silently reading the wrong fields and producing an empty gap list.

## How Do You Normalize Executable Line Sets?

Normalize code line sets by mapping runner hits back to the current source paths and original line numbers. Istanbul JSON stores tracked statements and hit counts. Source maps may map built code back to TypeScript. Build an adapter for your exact report shape, version it, and test it with known fixtures before it can gate a release.

A statement can span several lines, while line coverage is usually attributed according to the coverage library's mapping. Do not invent hits for each line in a multiline range unless the tool defines that mapping. Prefer the tool's line-coverage API or a tested adapter that makes one hit count per original line.

Verify source maps with a small known branch before trusting them on a release. Choose a TypeScript statement with a stable original line, run one focused test, and confirm the normalized report points to that line rather than built JavaScript. Repeat this fixture after runner, compiler, transform, or coverage-tool upgrades. A source map that shifts counters by one line can hide a blocker and falsely flag neighboring code.

Built source requires a declared ownership rule. When built files are excluded, map the schema or generator input into the risk review and run the generation check required by rule set. When built output is the deployed file, preserve its coverage relationship explicitly. Never remove both input and output from consideration merely because their line mappings are inconvenient.

The overlap algorithm then becomes simple and reviewable:

\`\`\`typescript
type LineHits = Map<string, Map<number, number>>;

type FileGap = {
  file: string;
  executableChanged: number[];
  executed: number[];
  uncovered: number[];
  unknown: number[];
};

export function intersectChangedWithCoverage(
  changed: Map<string, Set<number>>,
  coverage: LineHits,
  instrumentedLines: Map<string, Set<number>>,
): FileGap[] {
  return [...changed.entries()].map(([file, changedLines]) => {
    const hits = coverage.get(file);
    const executable = instrumentedLines.get(file);
    if (!hits || !executable) {
      return {
        file,
        executableChanged: [],
        executed: [],
        uncovered: [],
        unknown: [...changedLines].sort((a, b) => a - b),
      };
    }

    const executableChanged = [...changedLines].filter((line) => executable.has(line));
    const executed = executableChanged.filter((line) => (hits.get(line) ?? 0) > 0);
    const uncovered = executableChanged.filter((line) => (hits.get(line) ?? 0) === 0);

    return { file, executableChanged, executed, uncovered, unknown: [] };
  });
}
\`\`\`

Calculate a rate only when the code line total is positive and no required file is unknown. For zero code changed lines, report "not applicable" with the reason rather than 100 percent. For any unknown required path, report an invalid count and fail closed.

Sort files and lines before serialization so review diffs remain stable. Emit the line total rule, source-map mode, normalized repo root, and each excluded path beside the result. Stable output makes checker changes reviewable and helps incident work distinguish a product gap from a count change.

The changed line coverage diff hunks record should also include hunk headers for each uncovered line. That context lets a reviewer connect a numeric hit count to the changed condition or call without manually searching a large patch. Keep the raw patch authoritative and treat extracted context as a convenience field.

The exact changed line coverage diff hunks calculation should retain raw line lists, not only totals. Peers need to open the cited hunk and decide whether a zero-hit line is a blocker, a named waiver candidate, or pre-existing debt exposed by the change.

## Apply Coverage Gap Detection Rules by Risk

Line coverage shows whether a path reached an instrumented line. It does not prove each branch, condition, state transition, side effect, or assertion. The Guardian therefore joins line gaps with the Stage 2 risk map and separately inspects new branches in High surfaces.

Classify an untested new branch in money, authentication, data shape, or a public contract as a Blocker. A logging statement, defensive fallback, or Low-surface line may be waiverable when a human names and accepts it. Pre-existing untested code that the diff merely touched can be debt, provided the report proves it was not newly introduced flow.

The focused [changed-line gap classification guide](/blog/uncovered-changed-lines-blocker-waiver-debt) provides the choice record for these categories. Never derive them solely from file paths. Read the hunk, find the flow at risk, and cite the exact line range.

| Proof pattern | Initial interpretation | Next action |
| --- | --- | --- |
| New denied-permission branch has zero hits | High blocker | Add allowed and denied flow tests |
| Added debug log has zero hits | Possible waiver | Name owner, rationale, and acceptance |
| Existing fallback moved with no semantic change | Possible debt | Prove pre-existence from base and record it |
| Changed code path absent from JSON | Unknown proof | Fix mapping or coverage collection |
| Line hit but new condition outcome untested | Branch-risk finding | Add outcome-specific test proof |

This is why changed line coverage diff hunks cannot be reduced to a badge. A high rate is supporting proof, not a release verdict. The configured blocker count, required suites, static checks, migration proof, and risk-map review all remain active gates.

If a gap involves schema constraints or relational setup, use the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) to build deterministic cases from DDL and model constraints. The [database testing automation guide](/blog/database-testing-automation-guide) adds broader database verification patterns.

For changed request contracts, the [OpenAPI test-suite generation guide](/blog/openapi-spec-to-test-suite-generation) can help derive positive and negative cases from the declared schema. The release report still needs proof that those built cases ran against the changed code at the judged HEAD.

## Enforce a Fail Closed Quality Gate at HEAD

Keep the gate rule set in the repo, not inside a one-off workflow expression. The Guardian reference schema defines \`changed_line_blockers\`, an optional changed-line minimum rate, required suites, new skip limits, static checks, migration rule set, and human risk-map review.

\`\`\`yaml
gates:
  tests:
    required_suites: [unit, integration, e2e-smoke]
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
  process:
    risk_map_reviewed: true
\`\`\`

Treat the rate field as an optional percentage threshold and the blocker limit as a class-based gate. If 18 of 20 executable changed lines were executed, the rate is 90 percent. A single remaining High authorization gap still makes the blocker count one and fails the zero-blocker gate.

Fail the count before evaluating thresholds when the patch, coverage JSON, provenance, or path mapping is missing. This ordering prevents an empty gap array from passing after a parser exception. Include a gate result such as \`coverage.evidence_valid: fail\` before reporting the blocker gate as not evaluated.

Use the [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) to wire file dependencies and required jobs. The Guardian verdict job should depend on the patch collector, tests, coverage adapter, risk-map review, and static checks. It should not run against whatever files happen to remain in a shared workspace.

Changed line coverage diff hunks must be recalculated after each new commit. Coverage from an earlier SHA is stale even if Git reports the same target files. Exact provenance is easier to enforce than a subjective claim that two file sets are equivalent.

## Publish a Release Evidence Report

The human report should show totals, then list each gap with file, lines, class, surface, reason, and proof. The machine report should carry the same information under coverage, gate results, blockers, waivers, and work required for GO.

\`\`\`json
{
  "verdict": "NO_GO",
  "head_sha": "<judged-head-sha>",
  "coverage": {
    "changed_lines": 20,
    "executed": 18,
    "unknown": 0,
    "gaps": [
      {
        "file": "src/auth/policy.ts",
        "lines": "74-75",
        "class": "blocker",
        "surface": "auth",
        "reason": "new denial branch has zero coverage hits"
      }
    ]
  },
  "gate_results": [
    {
      "gate": "coverage.changed_line_blockers",
      "status": "fail",
      "evidence": "artifacts/changed-line-report.json: one blocker"
    }
  ],
  "to_reach_go": [
    "Add a public-boundary test for the denied authorization outcome"
  ]
}
\`\`\`

Do not cite only a built HTML page whose line anchors can change between runs. Preserve the patch, normalized line report, raw coverage JSON, provenance record, test result, and adapter version. A checksum manifest makes accidental replacement detectable.

The [release readiness scorecard](/blog/ai-release-readiness-scorecard-2026) can summarize this gate beside tests, lint, types, security, data, and process proof. The [risk-based testing guide](/blog/risk-based-testing-strategy-guide-2026) helps define which flows deserve the strictest classes before the pull request arrives.

Each report claim needs a concrete source. "Coverage is good" is not actionable. "18 of 20 code changed lines ran; src/auth/policy.ts:74-75 is a Blocker; coverage run and patch both name HEAD X" can be checked and repaired.

## Run the Operational Procedure and Review It

Apply the workflow in a clean checkout so built output and stale local coverage artifacts cannot alter path mapping. Preserve failures as proof, then fix causes and rerun the complete dependent chain.

1. Generate the exact patch, status list, commit record, and risk map.
2. Select key tests, run them, and run each configured required suite.
3. Produce line-level coverage JSON with recorded include, exclude, source-map, and runner settings.
4. Parse new-side lines, normalize paths, and reject each unknown required mapping.
5. Intersect code changed lines with positive hit counts and retain line lists.
6. Classify each gap from flow risk, with named waiver ownership where permitted.
7. Evaluate repo gates, recompute the verdict, and emit matching Markdown and JSON.
8. Have a named human review the risk map; the Guardian recommends but never approves or merges.

Maintain a checker fixture matrix beside the code. Include a one-line addition, addition after deletion, multiline statement, uncovered conditional, renamed file, new file, deleted file, source-mapped TypeScript, duplicate suffix path, malformed hunk, and truncated JSON record. Assert normalized paths, line sets, unknown states, classifications, and gate status. These fixtures make changed line coverage diff hunks a testable release component instead of an opaque script.

Add one end-to-end fixture that starts from a committed base and head pair, runs a tiny suite, emits coverage, and evaluates the final report. Unit tests can prove parser branches, but the end-to-end case catches command options, working-folder assumptions, report locations, and provenance wiring. Keep its expected file small enough for peers to inspect directly.

Changed line coverage diff hunks become trustworthy only when each transition is observable. Keep parser tests, fixture patches, coverage adapters, and gate schemas under normal code review. When an escaped defect reveals a missed line or hidden source-map edge, add a regression fixture before changing rule set.

Use the [QASkills directory](/skills) to install AI Release Guardian, then run this procedure on one Medium or High pull request. Require zero unknown mappings and zero Blocker-class gaps before accepting the coverage gate, while preserving all configured full-suite proof.

## Frequently Asked Questions

### Should comments and blank lines count in the denominator?

No. Keep them visible in the diff and risk review, but calculate the rate from changed lines the coverage tool recognizes as code. Document that line total rule. If code mapping is unavailable for a required file, report unknown proof and fail rather than counting text lines or assuming exclusion.

### Does a hit on a changed line prove the branch is tested?

No. A positive line hit proves that execution reached the tool's mapped line. It does not prove each condition outcome, return path, exception, or side effect. Review new branches separately, especially on High surfaces, and require tests whose assertions demonstrate the intended public flow.

### How should renamed files be handled?

Use rename-aware Git output, retain old and new paths in status proof, and evaluate new-side added lines under the destination path. Normalize coverage to that repo-relative destination. A pure rename may have no code additions, but its ownership, build, import, or config effects still belong in risk review.

### Can SonarQube new-code coverage replace this report?

It can contribute authoritative review proof when configured for the same target and commit. The Guardian still needs its risk map, blocker versus waiver label, required-suite results, exact file citations, and derivable verdict. Verify that SonarQube's new-code definition matches the release diff before consuming its result.

### What happens when coverage JSON omits a changed file?

Treat the file as unknown until you prove it contains no code changed lines. Common causes include no selected test importing it, an include or exclude rule, source-map failure, and path mismatch. Record the cause, repair collection or mapping, and regenerate the report at the same judged HEAD.

### Should coverage from several suites be merged?

Yes, when each run uses the same HEAD, compatible line tracking, consistent source maps, and documented merge flow. Preserve each input and the merge command. Do not combine stale or differently transformed files, because line identities and hit counts may no longer describe the same source commit.
`,
};
