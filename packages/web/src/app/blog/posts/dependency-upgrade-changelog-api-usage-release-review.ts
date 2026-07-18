import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Review Dependency Upgrades Against Used APIs',
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
  content: `A dependency upgrade API usage review compares the resolved package change with the exact imports, methods, types, commands, and configuration the repository uses. It reads official release information for that version interval, maps relevant changes to callers and tests, and returns NO-GO whenever compatibility evidence is missing or stale.

The [AI Release Guardian](/skills/thetestingacademy/ai-release-guardian) explicitly requires changelog checks for breaking changes in APIs the codebase actually uses. This article makes that instruction executable without treating every lockfile line as equal risk. Browse the wider [QA skill catalog](/skills) when the review reveals a need for deeper security, coverage, or framework-specific analysis.

## Define the Upgrade Change Set Precisely

Begin with the release scope, not the pull request title. A manifest may show one direct version edit while the lockfile resolves many direct and transitive changes. Conversely, a broad lockfile rewrite can contain formatting or peer-resolution movement that does not place every listed package on a runtime path.

Record the base reference, candidate \`head_sha\`, package manager and version, lockfile format, workspace filters, and install command. Then produce a normalized list of old and new resolved versions. Preserve the raw manifest and lockfile diff as evidence even when a separate tool creates the normalized list.

npm documents that packages needed by an application belong in \`dependencies\`, while development-only packages belong in \`devDependencies\`, in its guide to [specifying dependencies and devDependencies](https://docs.npmjs.com/specifying-dependencies-and-devdependencies-in-a-package-json-file/). That classification informs risk, but it does not settle it. A test runner can execute privileged CI code, and a build plugin can change production output.

Classify each changed package by how the repository reaches it:

| Reachability class | Examples of repository evidence | Review emphasis |
|---|---|---|
| Direct runtime | Import in application source | Public behavior, data, errors, performance-sensitive paths |
| Direct development | Import in tests, build, lint, or generation config | CI execution, generated output, test semantics |
| Transitive runtime | Dependency path from a direct runtime package | Parent release notes, resolution, integration tests |
| Transitive tooling | Dependency path from build or test tools | Pipeline behavior and artifact changes |
| Unused direct declaration | Manifest entry with no code or configured command use | Verify removal or hidden dynamic use |

Do not infer "unused" from static imports alone. Configuration strings, command invocations, loaders, framework conventions, generated code, plugins, and dynamic imports can establish usage without an ordinary import declaration. Search manifests, scripts, workflow files, configuration, and source. If reachability remains uncertain, classify it as unknown and expand the review.

The dependency upgrade API usage review should separate source changes made by contributors from resolved changes made by the package manager. Generated lockfile churn remains in the report, but the risk map should name packages, execution locations, and behavior at risk. This distinction keeps reviewers from reading thousands of integrity entries without losing supply-chain visibility.

Store the dependency upgrade API usage review scope as a generated artifact. A reviewer should be able to compare package, old version, new version, reachability class, affected workspaces, and unresolved discovery limits without reconstructing the lockfile manually.

For monorepos, report affected workspaces. A root devDependency may influence every package through shared tooling, while a workspace-local client library may affect one service. The [test impact analysis guide](/blog/test-impact-analysis-ci-guide-2026) explains graph-based selection, but unknown configuration edges must still trigger a wider safe fallback.

## Build a Used-API Inventory Before Reading Notes

A release note becomes actionable only when it intersects the repository. Inventory use before interpreting the changelog so the review does not anchor on prominent changes unrelated to this codebase. The inventory should be mechanical enough to regenerate at the judged SHA.

For each direct package, capture import style, imported names, namespace member access, type-only imports, constructed classes, extended classes, commands, configuration keys, plugin names, environment variables, and files containing each use. For a command-line tool, capture scripts and arguments. For a framework plugin, capture registration and lifecycle hooks.

| Usage evidence | Example shape | Compatibility question |
|---|---|---|
| Named import | \`import { parse } from 'package'\` | Was the export removed, renamed, or behaviorally changed? |
| Namespace member | \`client.retry()\` | Did method signature, default, or error behavior change? |
| Type import | \`import type { Options }\` | Did properties, unions, or optionality change compilation? |
| Configuration | \`plugin: 'adapter-name'\` | Were keys, defaults, or discovery rules changed? |
| CLI script | \`tool build --flag\` | Was the command or flag changed? |
| Dynamic load | \`loadProvider(name)\` | Can static analysis resolve the provider set? |

Trace one level of callers for changed or questioned APIs, following the Guardian risk-mapping rule. A parser API used by an upload endpoint risks user input handling. The same parser used only by a local fixture generator risks test setup. The symbol name alone cannot express blast radius.

Keep type-only and runtime use distinct. A package can compile after a runtime behavior change, while a type package can break the build without shipping code. Both matter because the gate includes required suites, lint errors, and type errors. Record which validation mechanism can observe each risk.

Commands deserve the same treatment as imports. Search \`package.json\` scripts, CI workflows, container files, hooks, and generator configuration. Capture complete argument shapes rather than only command names. A changed default can matter even when every flag remains accepted.

Avoid sending source or package data to an unapproved external service. The repository can generate this inventory locally with its compiler and search tools. OWASP lists dependency-chain abuse, ungoverned third-party services, improper artifact integrity validation, and insufficient logging among the concerns in its [CI/CD Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html). Keep review artifacts and credentials within the pipeline's trust boundaries.

## Interpret Version Numbers and Release Information

Version numbers are an index into the review, not compatibility proof. The [Semantic Versioning 2.0.0 specification](https://semver.org/spec/v2.0.0.html) defines major increments for incompatible public API changes, minor increments for backward-compatible functionality, and patch increments for backward-compatible fixes. It also requires software using SemVer to declare a public API.

Those rules describe a contract followed by participating publishers. They do not prove that every package follows it correctly, that undocumented behavior is stable, or that the repository used only public APIs. The review should record the version interval and official release material, then inspect changes relevant to the usage inventory.

Use this evidence order:

1. Official migration guide for the exact target major or feature.
2. Official changelog or release notes covering every version crossed.
3. Package API documentation for symbols and configuration the repository uses.
4. Published type declarations or source diff when official notes do not answer a used-API question.

Do not cite a search snippet as release evidence. Save stable URLs or versioned package artifacts in the report. When a single upgrade crosses several releases, review the complete interval rather than the final release entry alone. A deprecation introduced in one minor release can become removal in the later major target.

Classify each relevant note as removed API, changed signature, changed default, changed error behavior, changed configuration, changed platform requirement, security fix, or behavior clarification. Then connect it to files and tests. Notes with no repository intersection remain recorded as reviewed but do not need invented impact.

| Release information | Repository intersection | Gate action |
|---|---|---|
| Used export removed | Direct import found | Block until code and tests migrate |
| Default changes for used option | Option omitted in config | Test old and new behavior explicitly |
| New feature not used | No caller or config path | Record as reviewed, no extra test required |
| Runtime support changes | CI or production runtime outside range | Block with environment evidence |
| Security fix in reachable package | Resolved dependency path exists | Prioritize update and verify affected behavior |
| Notes unavailable for crossed versions | Compatibility cannot be assessed | NO-GO for missing evidence |

A dependency upgrade API usage review must not claim that a patch is automatically safe. It can say the publisher labels the release as a patch under SemVer, cite that source, and show that used APIs passed selected and required tests. The evidence supports the verdict; the number alone does not.

The dependency upgrade API usage review should also record notes examined with no repository intersection. That negative mapping proves the release interval was covered while keeping test selection focused on APIs, commands, and settings the repository actually reaches.

The [risk-based testing guide](/blog/risk-based-testing-strategy-guide-2026) helps prioritize money, authentication, data-shape, and public-contract callers discovered here. Apply repository risk classes instead of assigning unsupported numerical likelihoods.

## Review Configuration, Defaults, and Error Behavior

Public API usage extends beyond function names and parameter types. Configuration keys, omitted options, default retry behavior, environment discovery, emitted events, error classes, serialization, and command exit codes can affect callers without producing a compiler error. Include these behaviors when official release information says they changed.

Start from each inventory entry and ask what the caller leaves implicit. A constructor call with no retry option depends on the package default. A command without an output flag depends on its default path or stream. A catch block checking one error class depends on classification as well as message text.

Write behavior assertions at the narrowest public boundary that observes the risk. For a client default, use a controlled local server and count attempts or inspect requests. For configuration, start the component with the repository's real config file and assert the parsed result. For a CLI, execute the command against deterministic fixtures and assert exit status, output location, and artifact shape.

Do not freeze every incidental detail. Test only behavior connected to a used API and a documented change or repository contract. Snapshotting an entire error object can create noisy failures from fields callers never read, while omitting the one error category used for control flow misses the compatibility question.

Release notes may describe a new default as backward compatible because the public contract permits it. The repository can still depend on the previous behavior. Record that as a usage intersection rather than accusing the publisher of violating version policy. SemVer describes the declared public API; local assumptions need their own explicit tests.

Configuration can also cross workspace boundaries. A root preset may supply options to several packages, and one package may override only part of it. Resolve the effective value for every affected workspace before selecting tests. Store the source file and resolved option in evidence so reviewers can trace why a release note applies.

Error-path tests should assert the stable contract consumed by application code. If callers branch on status, code, or class, exercise that branch. If they only log and rethrow, confirm the public behavior and avoid asserting private stack formatting. Changed error handling on money, authentication, or data paths belongs in the risk map even when happy-path tests pass.

## Follow an Ordered Release Review Procedure

Keep the procedure reproducible and stop on missing prerequisites. Running the full suite first may produce a green result while hiding a removed path that no existing test exercises. Usage mapping and changed-line analysis identify whether the right tests exist.

1. **Pin the scope.** Record base, HEAD, package-manager version, manifests, lockfile, install flags, workspace filters, and resolved old-to-new package versions.
2. **Classify reachability.** Map each changed direct and transitive package to runtime, development, build, test, generation, or unknown execution paths.
3. **Inventory used APIs.** Capture imports, members, types, commands, options, plugins, and dynamic loading, plus one caller level for medium and high surfaces.
4. **Read official release information.** Cover the complete version interval and map each relevant change to inventory entries. Mark unavailable evidence explicitly.
5. **Select tests.** Prefer per-test coverage, then import graphs, conventions, and mapped end-to-end flows. Empty selection for a meaningful caller is a coverage finding.
6. **Run policy-required suites.** Narrow tests provide fast signal, but every suite in \`release-gates.yaml\` still runs at the judged HEAD.
7. **Evaluate changed-line coverage and static gates.** Report blocker-class gaps, lint errors, type errors, and new scanner findings against the base.
8. **Emit and validate the report.** Cite package versions, release sources, files, tests, runs, and gaps. Recompute the verdict from gate results and waivers.

Use a clean, frozen install for verification so the tested graph matches the committed lockfile. Record the package manager's version because lockfile interpretation and install behavior belong to the evidence context. Do not modify the lockfile during the gate and then test an uncommitted graph.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) describes artifact and job structure. Give upgrade review its own terminal status rather than burying it inside an install log. Reviewers need a direct path from the protected-branch check to the report.

If the diff exceeds the Guardian's configured analysis budget, recommend splitting rather than pretending to map every use. Large automated update batches can combine unrelated packages, callers, and release sources. A smaller set creates a clearer risk map and more specific remediation.

## Generate a Local API-Usage Artifact

Compiler-backed analysis catches ordinary TypeScript imports more reliably than text matching, while repository search covers commands and configuration. The following script uses the TypeScript compiler API to inventory module imports and namespace-style property access. It is a starting artifact generator, not a complete call-graph engine.

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
      if (!packageName.startsWith('.') && node.importClause) {
        const item = ensure(packageName);
        if (node.importClause.name) item.imported.push('default');
        const bindings = node.importClause.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) {
          item.imported.push(...bindings.elements.map((entry) => entry.name.text));
        }
        if (bindings && ts.isNamespaceImport(bindings)) {
          namespaces.set(bindings.name.text, packageName);
          item.imported.push('*');
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

This artifact intentionally preserves file paths and symbol names. Extend it for \`require\`, dynamic imports, re-exports, JSX factories, and framework-specific registration only when the repository uses those forms. Do not report unsupported analysis as complete.

Follow compiler output with targeted repository searches for changed package names and executable names. Inspect manifest scripts, workflow YAML, configuration, container definitions, and generated-code inputs. Save search commands and results beside the compiler artifact so reviewers can understand dynamic or convention-based findings.

Types can identify compile-time intersections, but tests still need behavioral assertions. A changed return default may satisfy the same type. A changed exception class may still inherit from the same base. Map these notes to behavior-focused tests through public boundaries.

The [OpenAPI-to-test-suite guide](/blog/openapi-spec-to-test-suite-generation) is useful when an upgraded client or validator touches API contracts. Generate cases from the declared schema, then connect failures to the package change rather than inventing inputs from release-note wording.

## Apply Team Gates and Select Relevant Tests

The repository's exact gate vocabulary already covers required suites, new skips, changed-line blockers, type errors, lint errors, and new security findings. Do not add an opaque \`dependency_safe: true\` field with no evidence semantics. Express the review through risk mapping, test results, coverage, static checks, and blockers.

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

Select tests that exercise callers of affected APIs. Per-test coverage is strongest when available. An import graph is next, followed by co-located conventions and mapped end-to-end flows. For a CLI or build tool, select fixture builds and artifact comparisons rather than application tests that never invoke it.

Then run every required suite. The Guardian contract says selection orders feedback but does not replace team policy. Record selected count, total count, strategy, run ID, and result. An empty selection for a medium or high change becomes a coverage finding even when the command supports a pass-with-no-tests option.

Changed-line coverage concerns repository code, not dependency source. Intersect caller changes and adaptation code with coverage. If no repository code changed beyond the lockfile, use the usage inventory and behavior tests to identify evidence gaps. Never fabricate a changed-line percentage for third-party files absent from the report.

The sibling article on [release-gates.yaml policy](/blog/release-gates-yaml-team-policy-schema) covers ownership and validation of these fields. Keep thresholds centralized so upgrade automation and ordinary feature pull requests evaluate the same team standard.

Security scanners can add evidence, but scanner success does not prove API compatibility. Likewise, a successful type check does not prove runtime behavior. The gate report should show each signal separately and derive the verdict from all configured results.

## Produce a Reviewable Upgrade Report

The risk map should name package, version interval, used API, caller, behavior at risk, and blast radius. Gate results should cite official release information, inventory artifacts, test runs, and file locations. Missing release information or unresolved dynamic use belongs in blockers rather than a footnote.

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

The package and API names above are illustrative placeholders for report shape, not claims about a real release. Actual reports must link the official notes and cite the exact used symbol. The [machine-verifiable report guide](/blog/machine-verifiable-no-go-release-report-json) shows schema validation and verdict recomputation.

Keep Markdown and JSON aligned. The human report can explain why checkout behavior matters, while the JSON retains stable fields for CI. Both should derive from one internal result object so a blocker cannot appear in one form and disappear from the other.

Waivers cannot repair missing evidence automatically. \`GO_WITH_WAIVERS\` requires every waiver to have a non-null owner and \`accepted: true\`. The [named waiver ownership guide](/blog/release-waiver-ownership-acceptance-contract) defines that narrow contract. A removed used API or failed required suite remains a blocker unless team policy explicitly classifies it otherwise.

Freshness applies to install, inventory, tests, scanner output, and report. If a bot rebases or updates another package, rerun the dependency upgrade API usage review at the new SHA. Reusing a previous report can mismatch both resolved versions and callers.

## Enforce the Review Without Granting Approval

Expose the validator as a unique required check, such as \`release/dependency-usage-review\`. GitHub's [protected branch documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) says protected branches can require status checks and can select an expected app source. It also recommends unique job names to avoid ambiguous required results.

Keep permissions narrow. Pull-request code should not possess credentials that can forge a trusted result, publish packages, or alter branch policy. The review job reads repository state, official release sources available to the pipeline, and test artifacts; it recommends but never merges, tags, or deploys.

Handle every path with a terminal status. A documentation-only pull request can pass after the job proves no dependency change exists. A failed install, unavailable release source, malformed inventory, or unknown package path should fail closed with a concrete reason rather than leaving the check pending.

The dependency upgrade API usage review becomes useful when reviewers can open its evidence quickly. Link the status to the Markdown summary, upload normalized JSON, and retain raw manifest, lockfile, inventory, test, and scanner artifacts according to repository policy.

Keep the dependency upgrade API usage review deterministic across reruns at one SHA. Pin package-manager inputs, sort inventory records, and preserve the same release-source URLs so a changed verdict reflects changed evidence rather than unstable output ordering.

Pair this process with the [rolling-deploy migration gate](/blog/database-migration-rolling-deploy-compatibility-gate) when an upgraded ORM or database client accompanies schema changes. The two reviews answer different questions: package API compatibility and application/schema overlap.

For the next automated upgrade, run the [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian), attach the used-API inventory, and require the derived report before merge. That concrete workflow replaces version-number confidence with repository-specific evidence.

## Frequently Asked Questions

### Is a patch-version dependency update automatically safe?

No. SemVer defines patch releases as backward-compatible fixes when a publisher follows the specification and has declared its public API. The gate still checks official release information, actual repository usage, selected tests, and required suites. Version shape helps organize evidence but cannot replace it.

### Should transitive dependency changes receive the same review?

Review them according to reachability and parent context. Record the resolved path, why the transitive package changed, and which runtime or tool path can execute it. Unknown reachability expands review. Do not demand invented API mappings when the repository never imports that package directly.

### How can the review find dynamically loaded plugins?

Search configuration, plugin registries, manifests, environment-driven loaders, workflow scripts, and fixture setup in addition to compiler imports. If the possible provider set cannot be resolved, report that limitation and select broader integration tests. Static-analysis uncertainty is evidence for caution, not proof that usage is absent.

### Do passing type checks prove an upgrade is compatible?

No. Type checks can detect removed exports and changed signatures represented in declarations, but they cannot prove unchanged defaults, errors, timing, serialization, or side effects. Pair type results with behavior tests chosen from actual callers, and preserve both signals as separate gate results.

### What happens when official release notes are missing?

Record the unavailable source and inspect versioned API documentation, published declarations, or source diffs according to team policy. If compatibility for a used medium or high-risk API remains unresolved, report NO-GO. Do not fill the gap with assumptions based only on version numbers or community summaries.

### Can an upgrade bot approve its own dependency change?

No. Automation can create the pull request, generate the inventory, run tests, and recommend a verdict. The Guardian contract prohibits merging, tagging, deploying, or issuing formal approval. Branch protection and named human review retain decision ownership, especially when waivers or unresolved supply-chain risk exist.
`,
};
