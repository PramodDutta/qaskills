import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Dependency Upgrade API Usage Review',
  description:
    'Run a dependency upgrade API usage review that maps lockfile changes to imported APIs, checks release notes, selects tests, and blocks unsupported updates.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Guide',
  primaryKeyword: 'dependency upgrade API usage review',
  keywords: [
    'dependency upgrade API usage review',
    'dependency changelog review',
    'used API inventory',
    'lockfile change analysis',
    'semantic versioning review',
    'package upgrade testing',
    'software supply chain gate',
    'release readiness dependency change',
  ],
  relatedSlugs: [
    'database-migration-rolling-deploy-compatibility-gate',
    'release-gates-yaml-team-policy-schema',
    'machine-verifiable-no-go-release-report-json',
    'release-waiver-ownership-acceptance-contract',
  ],
  sources: [
    'https://semver.org/spec/v2.0.0.html',
    'https://docs.npmjs.com/specifying-dependencies-and-devdependencies-in-a-package-json-file/',
    'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches',
    'https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html',
  ],
  content: `A dependency upgrade API usage review compares the locked package change with the exact imports, methods, types, steps, and config the repo uses. It reads vendor release facts for that version range, maps used changes to callers and tests, and returns NO-GO whenever fit proof is missing or stale.

The [AI Release Guardian](/skills/thetestingacademy/ai-release-guardian) clearly requires changelog checks for breaking changes in APIs the codebase actually uses. This article makes that instruction executable without treating each lock file line as equal risk. Browse the wider [QA skill catalog](/skills) when the review reveals a need for deeper safety, coverage, or framework-exact review.

## What Does a Dependency Changelog Review Cover?

Begin with the release scope, not the pull request title. A package file may show one direct version edit while the lock file resolves many direct and nested changes. Conversely, a broad lock file rewrite can contain formatting or peer-resolution movement that does not place each listed package on a runtime path.

Record the base reference, candidate \`head_sha\`, package tool and version, lock file format, workspace filters, and install step. Then produce a normalized list of old and new locked versions. Preserve the raw package file and lock file diff as proof even when a separate tool creates the normalized list.

npm documents that packages required by an app belong in \`dependencies\`, while development-only packages belong in \`devDependencies\`, in its guide to [specifying dependencies and devDependencies](https://docs.npmjs.com/specifying-dependencies-and-devdependencies-in-a-package-json-file/). That classification informs risk, but it does not settle it. A test runner can execute privileged CI code, and a build plugin can change production output.

Classify each changed package by how the repo reaches it:

| Call path class | Examples of repo proof | Review emphasis |
|---|---|---|
| Direct runtime | Import in app source | Public flow, data, errors, performance-sensitive paths |
| Direct development | Import in tests, build, lint, or generation config | CI execution, built output, test semantics |
| Nested runtime | Package path from a direct runtime package | Parent release notes, resolution, integration tests |
| Nested tooling | Package path from build or test tools | Pipeline flow and file changes |
| Unused direct declaration | Package file entry with no code or configured step use | Verify removal or hidden run-time use |

Do not infer "unused" from static imports alone. Config strings, step invocations, loaders, framework conventions, built code, plugins, and run-time imports can establish usage without a normal import declaration. Search manifests, scripts, workflow files, config, and source. If call path remains uncertain, classify it as unknown and expand the review.

The dependency upgrade API usage review should separate source changes made by contributors from locked changes made by the package tool. Built lock file churn remains in the report, but the risk map should name packages, execution locations, and behavior at risk. This distinction keeps team members from reading thousands of integrity entries without losing supply-chain visibility.

Store the dependency upgrade API usage review scope as a built file. A team member should be able to compare package, old version, new version, call path class, affected workspaces, and unresolved discovery limits without reconstructing the lock file manually.

For monorepos, report affected workspaces. A root devDependency may influence each package through shared tooling, while a workspace-local client library may affect one service. The [test impact analysis guide](/blog/test-impact-analysis-ci-guide-2026) explains graph-based test selection, but unknown config edges must still trigger a wider safe fallback.

## How Do You Build a Used API Inventory?

A release note becomes relevant only when it intersects the repo. List usage before interpreting the changelog so the review does not anchor on prominent changes unrelated to this codebase. The list should be mechanical enough to regenerate at the judged SHA.

For each direct package, capture import style, imported names, namespace member access, type-only imports, constructed classes, extended classes, steps, config keys, plugin names, environment variables, and files containing each use. For a command-line tool, capture scripts and arguments. For a framework plugin, capture registration and lifecycle hooks.

| Usage proof | Example shape | Fit question |
|---|---|---|
| Named import | \`import { parse } from 'package'\` | Was the export removed, renamed, or behaviorally changed? |
| Namespace member | \`client.retry()\` | Did method signature, default, or error behavior change? |
| Type import | \`import type { Options }\` | Did properties, unions, or optionality change compilation? |
| Config | \`plugin: 'adapter-name'\` | Were keys, defaults, or discovery rules changed? |
| CLI script | \`tool build --flag\` | Was the step or flag changed? |
| Run-time load | \`loadProvider(name)\` | Can static review resolve the provider set? |

Trace one level of callers for changed or questioned APIs, following the Guardian risk-mapping rule. A parser API used by an upload endpoint risks user input handling. The same parser used only by a local fixture generator risks test setup. The symbol name alone cannot express blast radius.

Keep type-only and runtime use distinct. A package can compile after a runtime behavior change, while a type package can break the build without shipping code. Both matter because the gate includes required suites, lint errors, and type errors. Record which checks can detect each risk.

Steps deserve the same treatment as imports. Search \`package.json\` scripts, CI workflows, container files, hooks, and generator config. Capture complete argument shapes rather than only step names. A changed default can matter even when each flag remains accepted.

Avoid sending source or package data to an unapproved external service. The repo can generate this list locally with its type checker and search tools. OWASP lists Dependency Chain Abuse, Ungoverned Usage of Third-Party Services, Improper Artifact Integrity Validation, and Insufficient Logging and Visibility among the concerns in its [CI/CD Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html). Keep review files and credentials within the pipeline's trust boundaries.

## How Should Lockfile Change Analysis Set the Review Scope?

Version numbers are an index into the review, not fit proof. The [Semantic Versioning 2.0.0 specification](https://semver.org/spec/v2.0.0.html) defines major increments for incompatible public API changes, minor increments for backward-compatible functionality, and patch increments for backward-compatible bug fixes. It also requires software using SemVer to declare a public API.

Those rules describe a contract followed by participating publishers. They do not prove that each package follows it correctly, that undocumented flow is stable, or that the repo used only public APIs. The review should record the version range and vendor release material, then inspect changes that affect the usage list.

Use this proof order:

1. Vendor migration guide for the exact target major or feature.
2. Vendor changelog or release notes covering each version crossed.
3. Package API docs for symbols and config the repo uses.
4. Published type declarations or source diff when vendor notes do not answer a used-API question.

Do not cite a search snippet as release proof. Save stable URLs or versioned package files in the report. When a single upgrade crosses several releases, review the complete range rather than the final release entry alone. A deprecation introduced in one minor release can become removal in the later major target.

Classify each used note as removed API, changed signature, changed default, changed error behavior, changed config, changed platform requirement, safety fix, or behavior clarification. Then connect it to files and tests. Notes with no repo intersection remain recorded as reviewed but do not need invented impact.

| Release facts | Repo intersection | Gate action |
|---|---|---|
| Used export removed | Direct import found | Block until code and tests migrate |
| Default changes for used option | Option omitted in config | Test old and new flow clearly |
| New feature not used | No caller or config path | Record as reviewed, no extra test required |
| Runtime support changes | CI or production runtime outside range | Block with environment proof |
| Safety fix in reachable package | Locked package path exists | Prioritize update and verify affected flow |
| Notes missing for crossed versions | Fit cannot be assessed | NO-GO for missing proof |

A dependency upgrade API usage review must not claim that a patch is safe by default. It can say the publisher labels the release as a patch under SemVer, cite that source, and show that used APIs passed chosen and required tests. The proof supports the verdict; the number alone does not.

The dependency upgrade API usage review should also record notes examined with no repo intersection. That negative mapping proves the release range was covered while keeping test chosen set focused on APIs, steps, and settings the repo actually reaches.

The [risk-based testing guide](/blog/risk-based-testing-strategy-guide-2026) helps prioritize money, authentication, data-shape, and public-contract callers discovered here. Apply repo risk classes instead of assigning unsupported numerical likelihoods.

## When Does Semantic Versioning Review Help?

Public API usage extends beyond function names and parameter types. Config keys, omitted options, default retry behavior, environment discovery, emitted events, error classes, serialization, and step exit codes can affect callers without producing a type checker error. Include these cases when vendor release facts say they changed.

Start from each list entry and ask what the caller leaves implicit. A constructor call with no retry option depends on the package default. A step without an output flag depends on its default path or stream. A catch block checking one error class depends on classification as well as message text.

Write behavior assertions at the narrowest public boundary that observes the risk. For a client default, use a controlled local server and count attempts or inspect requests. For config, start the component with the repo's real config file and assert the parsed result. For a CLI, execute the step against deterministic fixtures and assert exit status, output location, and file shape.

Do not freeze each incidental detail. Test only flow connected to a used API and a written change or repo contract. Snapshotting an entire error object can create noisy failures from fields callers never read, while omitting the one error category used for control flow misses the fit question.

Release notes may describe a new default as backward safe because the public contract permits it. The repo can still depend on the previous flow. Record that as a usage intersection rather than accusing the publisher of violating version rule set. SemVer describes the declared public API; local guesses need their own explicit tests.

Config can also cross workspace boundaries. A root preset may supply options to several packages, and one package may override only part of it. Resolve the effective value for each affected workspace before selecting tests. Store the source file and locked option in proof so team members can trace why a release note applies.

Error-path tests should assert the stable contract consumed by app code. If callers branch on status, code, or class, exercise that branch. If they only log and rethrow, confirm the public behavior and avoid asserting private stack formatting. Changed error handling on money, authentication, or data paths belongs in the risk map even when happy-path tests pass.

## What Does Package Upgrade Testing Need to Prove?

Keep the procedure reproducible and stop on missing prerequisites. Running the full suite first may produce a green result while hiding a removed path that no existing test exercises. Usage mapping and changed-line review find whether the right tests exist.

1. **Pin the scope.** Record base, HEAD, package-tool version, manifests, lock file, install flags, workspace filters, and locked old-to-new package versions.
2. **Classify call path.** Map each changed direct and nested package to runtime, development, build, test, generation, or unknown execution paths.
3. **List used APIs.** Capture imports, members, types, steps, options, plugins, and run-time loading, plus one caller level for medium and high surfaces.
4. **Read vendor release facts.** Cover the complete version range and map each used change to list entries. Mark missing proof clearly.
5. **Select tests.** Prefer per-test coverage, then import graphs, conventions, and mapped end-to-end flows. Empty chosen set for a meaningful caller is a coverage finding.
6. **Run required suites.** Narrow tests provide fast signal, but each suite in \`release-gates.yaml\` still runs at the judged HEAD.
7. **Check changed-line coverage and static gates.** Report blocker-class gaps, lint errors, type errors, and new scanner findings against the base.
8. **Emit and check the report.** Cite package versions, release sources, files, tests, runs, and gaps. Recompute the verdict from gate results, blockers, and waivers.

Use a clean, frozen install for verification so the tested graph matches the committed lock file. Record the package tool's version because lock file interpretation and install flow belong to the proof context. Do not modify the lock file during the gate and then test an uncommitted graph.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) describes file and job structure. Give upgrade review its own terminal status rather than burying it inside an install log. Team members need a direct path from the protected-branch check to the report.

If the diff exceeds the Guardian's configured review budget, recommend splitting rather than pretending to map each use. Large automated update batches can combine unrelated packages, callers, and release sources. A smaller set creates a clearer risk map and more exact fix.

## How Do You Build a Local API Usage File?

AST-based review catches standard TypeScript imports more reliably than text matching, while repo search covers commands and config. The following script uses the TypeScript Compiler API to list module imports and namespace-style property access. It is a starting file generator, not a complete call-graph engine.

\`\`\`typescript
import ts from 'typescript';
import { readFileSync } from 'node:fs';

type Usage = {
  packageName: string;
  file: string;
  imported: string[];
  namespaceMembers: string[];
};

const configPath = ts.findConfigFile('.', ts.sys.fileExists, 'tsconfig.json');
if (!configPath) throw new Error('tsconfig.json not found');

const config = ts.readConfigFile(configPath, (file) => readFileSync(file, 'utf8'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.');
const program = ts.createProgram(parsed.fileNames, parsed.options);
const usage: Usage[] = [];

for (const source of program.getSourceFiles()) {
  if (source.isDeclarationFile || source.fileName.includes('/node_modules/')) continue;

  const namespaces = new Map<string, string>();
  const byPackage = new Map<string, Usage>();

  const ensure = (packageName: string) => {
    const current = byPackage.get(packageName) ?? {
      packageName,
      file: source.fileName,
      imported: [],
      namespaceMembers: [],
    };
    byPackage.set(packageName, current);
    return current;
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const packageName = node.moduleSpecifier.text;
      if (!packageName.startsWith('.')) {
        const item = ensure(packageName);
        if (!node.importClause) {
          item.imported.push('(side-effect)');
        } else {
          if (node.importClause.name) item.imported.push('default');
          const bindings = node.importClause.namedBindings;
          if (bindings && ts.isNamedImports(bindings)) {
            item.imported.push(
              ...bindings.elements.map((entry) => entry.propertyName?.text ?? entry.name.text),
            );
          }
          if (bindings && ts.isNamespaceImport(bindings)) {
            namespaces.set(bindings.name.text, packageName);
            item.imported.push('*');
          }
        }
      }
    }

    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
      const packageName = namespaces.get(node.expression.text);
      if (packageName) ensure(packageName).namespaceMembers.push(node.name.text);
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  usage.push(...byPackage.values());
}

process.stdout.write(JSON.stringify({ headSha: process.env.HEAD_SHA, usage }, null, 2));
\`\`\`

This file intentionally preserves file paths and symbol names. Extend it for \`require\`, run-time imports, re-exports, JSX factories, and framework-exact registration only when the repo uses those forms. Do not report unsupported review as complete.

Follow type checker output with targeted repo searches for changed package names and executable names. Inspect package file scripts, workflow YAML, config, container definitions, and built-code inputs. Save search steps and results beside the type checker file so team members can understand run-time or convention-based findings.

Types can find compile-time intersections, but tests still need behavioral assertions. A changed return default may satisfy the same type. A changed exception class may still inherit from the same base. Map these notes to behavior-focused tests through public boundaries.

The [OpenAPI-to-test-suite guide](/blog/openapi-spec-to-test-suite-generation) is useful when an upgraded client or validator touches API contracts. Generate cases from the declared schema, then connect failures to the package change rather than inventing inputs from release-note wording.

## How Does a Software Supply Chain Gate Use Team Rules?

The repo's exact gate vocabulary already covers required suites, new skips, changed-line blockers, type errors, lint errors, and new safety findings. Do not add an opaque \`dependency_safe: true\` field with no proof semantics. Express the review through risk mapping, test results, coverage, static checks, and blockers.

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

Select tests that exercise callers of affected APIs. Per-test coverage is strongest when available. An import graph is next, followed by co-located conventions and mapped end-to-end flows. For a CLI or build tool, select fixture builds and file comparisons rather than app tests that never invoke it.

Then run each required suite. The Guardian contract says chosen set orders feedback but does not replace team rule set. Record chosen count, total count, strategy, run ID, and result. An empty chosen set for a medium or high change becomes a coverage finding even when the step supports a pass-with-no-tests option.

Changed-line coverage concerns repo code, not package source. Intersect caller changes and adaptation code with coverage. If no repo code changed beyond the lock file, use the usage list and flow tests to find proof gaps. Never fabricate a changed-line percentage for third-party files absent from the report.

The sibling article on [release-gates.yaml policy](/blog/release-gates-yaml-team-policy-schema) covers ownership and check of these fields. Keep thresholds centralized so upgrade automation and normal feature pull requests check the same team standard.

Safety scanners can add proof, but scanner success does not prove API fit. Likewise, a passing type check does not prove runtime flow. The gate report should show each signal separately and derive the verdict from all configured results.

## What Should a Release Readiness Dependency Change Report Show?

The risk map should name package, version range, used API, caller, behavior at risk, and blast radius. Gate results should cite vendor release facts, list files, test runs, and file locations. Missing release facts or unresolved run-time use belongs in blockers rather than a footnote.

\`\`\`json
{
  "verdict": "NO_GO",
  "head_sha": "31ad77e",
  "base_ref": "origin/main",
  "risk_map": [
    {
      "change": "client-package 4.8.2 to 5.0.0",
      "behavior_at_risk": "checkout request retries",
      "blast_radius": "all checkout submissions",
      "surface": "public-contract",
      "risk": "high"
    }
  ],
  "selected_tests": {
    "strategy": "import-graph",
    "selected": 8,
    "total": 214,
    "run_id": "upgrade-551",
    "result": "failed"
  },
  "gate_results": [
    {
      "gate": "tests.required_suites",
      "status": "fail",
      "evidence": "integration run upgrade-551 failed at checkout/client.test.ts:94"
    },
    {
      "gate": "static.type_errors",
      "status": "pass",
      "evidence": "typecheck run type-552 at head 31ad77e"
    }
  ],
  "blockers": [
    "used retry API changed across 5.0.0; checkout/client.ts:61 is not migrated",
    "integration run upgrade-551 fails at checkout/client.test.ts:94"
  ],
  "waivers": [],
  "to_reach_go": [
    "adapt checkout retry configuration to the documented 5.0.0 API",
    "rerun selected and required suites at the new HEAD"
  ]
}
\`\`\`

The package and API names above are illustrative placeholders for report shape, not claims about a real release. Actual reports must link the vendor notes and cite the exact used symbol. The [machine-verifiable report guide](/blog/machine-verifiable-no-go-release-report-json) shows schema check and verdict recomputation.

This abbreviated example omits the required \`coverage\` object. A schema-valid release report must include changed-line measurements and classified gaps from the judged HEAD.

Keep Markdown and JSON aligned. The human report can explain why checkout flow matters, while the JSON retains stable fields for CI. Both should derive from one internal result object so a blocker cannot appear in one form and disappear from the other.

Waivers cannot repair missing proof on their own. \`GO_WITH_WAIVERS\` requires each waiver to have a non-null owner and \`accepted: true\`. The [named waiver ownership guide](/blog/release-waiver-ownership-acceptance-contract) defines that narrow contract. A removed used API or failed required suite remains a blocker unless team rule set clearly classifies it otherwise.

Freshness applies to install, list, tests, scanner output, and report. If a bot rebases or updates another package, rerun the dependency upgrade API usage review at the new SHA. Reusing a previous report can mismatch both locked versions and callers.

## Enforce the Review Without Granting Approval

Expose the validator as a unique required check, such as \`release/dependency-usage-review\`. GitHub's [protected branch documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) says protected branches can require status checks and can select an expected app source. It also recommends unique job names to avoid ambiguous required results.

Keep permissions narrow. Pull-request code should not possess credentials that can forge a trusted result, publish packages, or alter branch rule set. The review job reads repo state, vendor release sources available to the pipeline, and test files; it recommends but never merges, tags, or deploys.

Handle each path with a terminal status. A docs-only pull request can pass after the job proves no package change exists. A failed install, missing release source, malformed list, or unknown package path should fail closed with a concrete reason rather than leaving the check pending.

Start with one direct package and one real caller. Save the old and new lock entries, list the symbols that caller uses, and run its smallest public-flow test. Then run the full suites named by team rules before the gate can pass.

Keep the failure path just as clear. A missing note, unknown import, bad install, or failed caller test must name the file and next fix. Do not turn an unknown into a low-risk label just to keep an update moving.

The dependency upgrade API usage review becomes useful when team members can open its proof quickly. Link the status to the Markdown summary, upload normalized JSON, and retain raw package file, lock file, list, test, and scanner files according to repo rule set.

Keep the dependency upgrade API usage review deterministic across reruns at one SHA. Pin package-tool inputs, sort list records, and preserve the same release-source URLs so a changed verdict reflects changed proof rather than unstable output ordering.

Pair this process with the [rolling-deploy migration gate](/blog/database-migration-rolling-deploy-compatibility-gate) when an upgraded ORM or database client accompanies schema changes. The two reviews answer different questions: package API fit and app/schema overlap.

For the next automated upgrade, run the [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian), attach the used-API list, and require the derived report before merge. That concrete workflow replaces version-number confidence with repository-specific proof.

## Frequently Asked Questions

### Is a patch-version package update safe by default?

No. SemVer defines patch releases as backward-safe fixes when a publisher follows the specification and has declared its public API. The gate still checks vendor release facts, actual repo usage, chosen tests, and required suites. Version shape helps organize proof but cannot replace it.

### Should nested package changes receive the same review?

Review them according to call path and parent context. Record the locked path, why the nested package changed, and which runtime or tool path can execute it. Unknown call path expands review. Do not demand invented API mappings when the repo never imports that package directly.

### How can the review find dynamically loaded plugins?

Search config, plugin registries, manifests, environment-driven loaders, workflow scripts, and fixture setup in addition to type checker imports. If the possible provider set cannot be locked, report that limitation and select broader integration tests. Static-review uncertainty is proof for caution, not proof that usage is absent.

### Do passing type checks prove an upgrade is safe?

No. Type checks can detect removed exports and changed signatures represented in declarations, but they cannot prove unchanged defaults, errors, timing, serialization, or side effects. Pair type results with flow tests chosen from actual callers, and preserve both signals as separate gate results.

### What happens when vendor release notes are missing?

Record the missing source and inspect versioned API docs, published declarations, or source diffs according to team rule set. If fit for a used medium or high-risk API remains unresolved, report NO-GO. Do not fill the gap with guesses based only on version numbers or community summaries.

### Can an upgrade bot approve its own package change?

No. Automation can create the pull request, generate the list, run tests, and recommend a verdict. The Guardian contract prohibits merging, tagging, deploying, or issuing formal approval. Branch protection and named human review retain decision ownership, especially when waivers or unresolved supply-chain risk exist.
`,
};
