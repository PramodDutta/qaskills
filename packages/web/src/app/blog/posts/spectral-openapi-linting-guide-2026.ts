import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Spectral OpenAPI Linting Guide: Govern API Specs in CI (2026)",
  description: "Learn Spectral OpenAPI linting: install the CLI, write custom rulesets, fail CI on spec violations, and enforce API governance across teams in 2026.",
  date: "2026-06-15",
  category: "API Testing",
  content: `# Spectral OpenAPI Linting Guide: Govern API Specs in CI (2026)

Spectral is an open-source JSON/YAML linter, maintained by Stoplight, that validates OpenAPI (and AsyncAPI) specifications against rulesets you control. You point it at a spec file, it walks the document using JSONPath expressions, and it reports every place your spec breaks a rule — a missing \`operationId\`, an undocumented error response, a path that ignores your naming convention. Run it locally to catch problems before commit, and wire it into CI so a non-conforming spec fails the pipeline. The result is consistent, governed APIs across every team without manual review.

This guide covers installing the CLI, the built-in OpenAPI ruleset, writing custom rules with \`given\`/\`then\`, severity levels, CI integration, and the errors you will actually hit.

## Why lint an OpenAPI spec at all?

A schema validator only tells you whether your document is *valid* OpenAPI. It says nothing about whether it is a *good* API description. Spectral fills that gap. It is the difference between "this YAML parses" and "every operation has a summary, every 2xx has a schema, every path is kebab-case, and no one shipped a \`TODO\` description."

For organizations with many services, the spec is the contract. If specs drift in style and completeness, your generated SDKs, docs portals, and mock servers drift with them. Linting in CI turns governance from a wiki page nobody reads into an automated gate. It is the same shift-left logic behind running unit tests on every push — see our [QA skills directory](/skills) for related linting and contract-testing tools.

## Installing Spectral

Spectral ships as an npm package with a CLI. The recommended way to run it in a project or CI is as a dev dependency so the version is pinned in \`package.json\`:

\`\`\`bash
npm install --save-dev @stoplight/spectral-cli
\`\`\`

For ad-hoc local runs you can use it without installing:

\`\`\`bash
npx @stoplight/spectral-cli lint openapi.yaml
\`\`\`

A standalone binary and a Docker image (\`stoplight/spectral\`) are also published if you do not want Node in your CI image:

\`\`\`bash
docker run --rm -v "$PWD":/work stoplight/spectral \\
  lint /work/openapi.yaml
\`\`\`

Verify the install:

\`\`\`bash
npx spectral --version
\`\`\`

## Your first lint run

Create a ruleset file named \`.spectral.yaml\` at the repo root. The fastest start is to extend Spectral's built-in OpenAPI ruleset, which bundles dozens of best-practice rules:

\`\`\`yaml
# .spectral.yaml
extends: ['spectral:oas']
\`\`\`

\`spectral:oas\` is the OpenAPI ruleset (oas = OpenAPI Specification). There is also \`spectral:asyncapi\` for event-driven specs. Now lint a file:

\`\`\`bash
npx spectral lint openapi.yaml
\`\`\`

Typical output looks like this:

\`\`\`
openapi.yaml
  12:7   warning  operation-operationId    Operation must have "operationId".          paths./users.get
  40:11  error    oas3-schema              "responses" property must have required ... paths./users.post.responses
  58:9   warning  operation-description    Operation "description" must be present...   paths./orders.get

✖ 3 problems (1 error, 2 warnings, 0 infos, 0 hints)
\`\`\`

Each line gives the location (\`line:column\`), severity, the rule name, the message, and the JSONPath where it triggered. Spectral resolves \`$ref\` pointers before linting, so rules apply to the fully dereferenced document by default.

## Severity levels and exit codes

Spectral has four severity levels: \`error\`, \`warn\`, \`info\`, and \`hint\`. By default the CLI exits with a non-zero code only when an \`error\` is found, which is exactly what you want for a CI gate. You can tighten this with \`--fail-severity\`:

\`\`\`bash
# Fail the build on warnings too, not just errors
npx spectral lint openapi.yaml --fail-severity=warn
\`\`\`

This is the single most important flag for governance. Set it to \`warn\` once your specs are clean, and any new warning blocks the merge.

## Writing custom rules

The built-in ruleset is a starting point, not your house style. Custom rules are where Spectral earns its place. A rule has a \`given\` (a JSONPath selecting nodes), a \`then\` (a function applied to each matched node), and a \`severity\`.

### Rule anatomy

\`\`\`yaml
extends: ['spectral:oas']
rules:
  # Every operation must have a summary
  operation-summary-required:
    description: All operations must include a summary.
    given: $.paths[*][get,post,put,patch,delete]
    severity: error
    then:
      field: summary
      function: truthy
\`\`\`

\`given\` uses JSONPath: \`$.paths[*]\` selects every path item, and \`[get,post,...]\` narrows to HTTP methods. \`then.field: summary\` targets the \`summary\` property of each operation, and \`function: truthy\` asserts it exists and is non-empty.

### Core functions

Spectral ships with built-in functions you compose into rules:

| Function | Asserts |
|---|---|
| \`truthy\` | Field is present and non-empty |
| \`falsy\` | Field is absent or falsy |
| \`defined\` | Field is present (even if empty) |
| \`undefined\` | Field is absent |
| \`pattern\` | Value matches/doesn't match a regex |
| \`casing\` | Value follows a casing style (camel, pascal, kebab, snake, etc.) |
| \`length\` | String/array within min/max length |
| \`enumeration\` | Value is one of an allowed set |
| \`schema\` | Value validates against a JSON Schema |
| \`alphabetical\` | Array/keys are sorted |

### A practical custom ruleset

Here is a ruleset that enforces several common governance rules at once:

\`\`\`yaml
extends: ['spectral:oas']
rules:
  # Paths must be kebab-case
  path-kebab-case:
    description: Paths must use kebab-case.
    given: $.paths[*]~
    severity: error
    then:
      function: pattern
      functionOptions:
        match: '^(\\/[a-z0-9-]+(\\{[a-zA-Z0-9]+\\})?)+$'

  # Every operation needs a unique operationId
  operation-id-required:
    given: $.paths[*][get,post,put,patch,delete]
    severity: error
    then:
      field: operationId
      function: truthy

  # operationId should be camelCase
  operation-id-casing:
    given: $.paths[*][get,post,put,patch,delete].operationId
    severity: warn
    then:
      function: casing
      functionOptions:
        type: camel

  # Every endpoint must document a 4xx or 5xx response
  operation-has-error-response:
    description: Operations must define at least one error response.
    given: $.paths[*][get,post,put,patch,delete].responses
    severity: warn
    then:
      function: schema
      functionOptions:
        schema:
          type: object
          patternProperties:
            '^(4|5)[0-9][0-9]$': true
          minProperties: 1

  # Ban TODO/FIXME in descriptions
  no-todo-in-description:
    given: $..description
    severity: error
    then:
      function: pattern
      functionOptions:
        notMatch: '(?i)(todo|fixme)'
\`\`\`

The \`~\` suffix in \`$.paths[*]~\` is JSONPath-Plus syntax meaning "the property key, not the value" — that is how you lint the path strings themselves rather than the path objects.

### Custom JavaScript functions

When the built-ins are not enough, write a function in JavaScript. Reference it from a \`functions\` directory:

\`\`\`yaml
extends: ['spectral:oas']
functionsDir: './spectral-functions'
functions: [versionInPath]
rules:
  major-version-in-path:
    given: $.paths[*]~
    severity: error
    then:
      function: versionInPath
\`\`\`

\`\`\`javascript
// spectral-functions/versionInPath.js
export default function (targetVal) {
  if (!/^\\/v[0-9]+\\//.test(targetVal)) {
    return [
      { message: \`Path "\${targetVal}" must start with a version segment like /v1/.\` },
    ];
  }
}
\`\`\`

A function returns an array of problem objects (each with a \`message\`), or nothing/\`undefined\` when the value passes.

## Overrides and per-path exceptions

Real specs have exceptions. The \`overrides\` block lets you change severity or disable rules for specific files or JSONPath locations without polluting the spec with inline directives:

\`\`\`yaml
extends: ['spectral:oas']
overrides:
  # Legacy endpoints are grandfathered out of the casing rule
  - files:
      - 'openapi.yaml#/paths/~1legacy~1getStuff'
    rules:
      operation-id-casing: 'off'
  # The internal admin spec can be noisier
  - files:
      - 'specs/admin/**/*.yaml'
    rules:
      operation-description: warn
\`\`\`

You can also disable a rule inline in the spec with an extension, but prefer \`overrides\` so exceptions live in one auditable place.

## Running Spectral in CI

The whole point is the pipeline gate. Here is a GitHub Actions job that fails the build on any spec error:

\`\`\`yaml
# .github/workflows/api-lint.yml
name: API Lint
on:
  pull_request:
    paths: ['**/*.yaml', '**/*.yml', '**/*.json']
jobs:
  spectral:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Lint OpenAPI spec
        run: npx spectral lint openapi.yaml --fail-severity=warn
\`\`\`

For richer PR feedback, emit results in a machine-readable format and upload them. Spectral supports \`--format\` with \`stylish\` (default), \`json\`, \`junit\`, \`html\`, \`teamcity\`, \`pretty\`, and \`github-actions\`. The \`github-actions\` formatter produces inline annotations on the PR diff:

\`\`\`bash
npx spectral lint openapi.yaml --format=github-actions --fail-severity=warn
\`\`\`

For GitLab CI the job is just as short:

\`\`\`yaml
api-lint:
  image: stoplight/spectral:latest
  script:
    - spectral lint openapi.yaml --fail-severity=warn --format=junit > spectral.xml
  artifacts:
    reports:
      junit: spectral.xml
\`\`\`

The JUnit output surfaces violations in the merge-request test report. If you want a deeper comparison of pipeline options for this kind of gate, see our [CI tooling comparisons](/compare).

## Linting multiple files

Spectral accepts globs, so a monorepo of specs lints in one command:

\`\`\`bash
npx spectral lint "specs/**/*.{yml,yaml,json}" --fail-severity=warn
\`\`\`

Each file is linted against the nearest applicable ruleset, or the one passed with \`--ruleset\`. Use \`--ruleset .spectral.yaml\` to force a specific governance ruleset regardless of where files sit.

## Common errors and troubleshooting

**"Cannot read ruleset" / no rules run.** Spectral looks for \`.spectral.yaml\`, \`.spectral.yml\`, \`.spectral.json\`, or \`.spectral.js\` in the working directory. If your file is elsewhere, pass \`--ruleset path/to/ruleset.yaml\`. A common mistake is forgetting \`extends: ['spectral:oas']\`, which leaves you with zero built-in rules.

**\`$ref\` resolution failures.** By default Spectral resolves all references. A broken or circular \`$ref\` aborts linting. Use \`--ignore-unknown-format\` only for non-OpenAPI files; for genuinely external refs, ensure the referenced files are present in CI (check them out, do not rely on network fetches).

**Rule matches nothing.** This is almost always a \`given\` JSONPath bug. Test expressions interactively — Spectral uses JSONPath-Plus, so \`$..parameters[*]\` and filter syntax \`$.paths[*][get].parameters[?(@.in=='query')]\` are supported. Add \`--verbose\` to see which rules ran and how many results each produced.

**Everything is a warning and CI passes anyway.** You forgot \`--fail-severity\`. By default only \`error\` fails the build; set \`--fail-severity=warn\` once your spec is clean.

**Casing function on the wrong node.** \`function: casing\` operates on a string value. If you point it at an object you get no error and no result. For path keys remember the \`~\` operator.

## A recommended rollout strategy

Adopt Spectral incrementally so you do not block every PR on day one:

1. Start with \`extends: ['spectral:oas']\` and \`--fail-severity=error\`. This catches genuinely invalid specs only.
2. Add custom rules at \`severity: warn\`. The team sees them in CI output without being blocked.
3. Fix the existing warnings spec-by-spec, using \`overrides\` to grandfather legacy paths.
4. Flip the gate to \`--fail-severity=warn\` once the backlog is clear. New violations now block merges.
5. Promote stable warnings to \`error\` over time.

This mirrors how teams roll out any new quality gate — start observe-only, then enforce. The broader practice of contract-first API development pairs well with linting; explore related guides on the [QASkills blog](/blog).

## Frequently Asked Questions

### What is the difference between Spectral and a regular OpenAPI validator?

A validator checks whether your document is structurally valid against the OpenAPI schema — correct keywords, correct types. Spectral does that too (via \`spectral:oas\`) but goes further: it enforces *style and completeness* rules you define, like required summaries, naming conventions, and documented error responses. Validation answers "is this valid OpenAPI?"; Spectral answers "is this a good API description by our standards?"

### How do I make Spectral fail my CI build on warnings?

Pass the \`--fail-severity\` flag. By default the CLI exits non-zero only on \`error\`-level results, so warnings are reported but do not break the build. Run \`spectral lint openapi.yaml --fail-severity=warn\` to treat warnings as failures. This is the standard way to enforce a governance ruleset once your specs are clean.

### Can Spectral lint AsyncAPI and other JSON/YAML files, not just OpenAPI?

Yes. Spectral ships \`spectral:oas\` for OpenAPI and \`spectral:asyncapi\` for AsyncAPI, and you extend whichever fits. Because the engine is a generic JSON/YAML linter driven by JSONPath, you can also write rulesets for arbitrary config files, Kubernetes manifests, or any structured document — the OpenAPI knowledge lives entirely in the ruleset, not the engine.

### How do I write a custom Spectral rule?

Define a rule with three parts: \`given\` (a JSONPath selecting the nodes to check), \`then\` (a built-in or custom function applied to each node, plus an optional \`field\`), and \`severity\`. For logic the built-in functions cannot express, set \`functionsDir\` and write a JavaScript function that returns an array of problem messages. Place all rules under the \`rules\` key in your \`.spectral.yaml\`.

### Should Spectral run before or after schema validation in my pipeline?

Run Spectral as your single spec-quality gate; it performs structural validation via \`spectral:oas\` and your custom governance rules in one pass, so a separate validator step is usually redundant. Place the job early in the pipeline on every pull request that touches spec files, so contributors get fast feedback before code review rather than after merge.

### Does Spectral resolve \`$ref\` references before linting?

Yes, by default Spectral fully dereferences the document, so rules apply to the resolved spec including content pulled in via \`$ref\`. This means a broken or unreachable reference will abort the lint, so ensure all referenced files are available in CI. If you need rules to inspect the raw, unresolved document instead, Spectral exposes a resolved/unresolved distinction in its programmatic API for advanced cases.
`,
};
