import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'CI Workflow Reusable Inputs Secrets: Safe GitHub Actions Contracts',
  description: 'Master CI workflow reusable inputs secrets with typed contracts, least-privilege forwarding, nested workflow tests, and safer GitHub Actions debugging.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# CI Workflow Reusable Inputs Secrets: Safe GitHub Actions Contracts

**CI workflow reusable inputs secrets** should be designed as an API boundary. Inputs are typed, non-secret configuration declared under \`on.workflow_call.inputs\`. Secrets are sensitive capabilities declared under \`on.workflow_call.secrets\` and passed by name from the calling job, or inherited when the trust boundary genuinely permits broad forwarding. The called workflow must validate configuration, request minimal token permissions, avoid logging sensitive values, and explicitly forward any secret needed by another nested workflow.

The safest default is a narrow contract: name every input, give optional values explicit defaults, name every secret, and map caller secret names to callee secret names. Use \`secrets: inherit\` only when the called workflow is trusted to receive the caller's whole available secret set. A reusable workflow does not automatically receive ordinary secrets, nested workflows receive only what their direct caller passes, and environment secrets can override an identically named passed secret inside a called job that declares an environment.

This guide builds a reusable GitHub Actions workflow for API smoke tests, its caller, validation scripts, negative contract probes, and a diagnosis path for misleading secret failures. Pair the design with [CI cancellation of stale E2E runs](/blog/ci-cancel-stale-e2e-runs-on-new-commit) when old commits waste capacity, and use [CI test selection by Git diff](/blog/ci-test-selection-by-git-diff) when the caller needs to calculate a focused test scope.

## Treat workflow_call as a versioned interface

A reusable workflow is not pasted YAML. It is an executable interface used by other repositories, branches, teams, and automation. Changing an input name, type, default, permission, output, or secret requirement can break callers. Review those changes with the same care as an API schema.

| Contract element | Declared by callee | Supplied by caller | Review question |
| --- | --- | --- | --- |
| string input | name, type, required or default | value under job-level \`with\` | is validation narrower than "any string"? |
| boolean input | type and default | YAML boolean or expression | does code preserve boolean meaning? |
| number input | type and default | numeric value or expression | are range and integer rules checked? |
| named secret | name and required flag | mapping under job-level \`secrets\` | is this capability truly required? |
| permissions | workflow or called job | calling job may maintain or reduce | can the token do more than the steps need? |
| output | workflow output mapped from job output | consumed through \`needs\` | is the value non-sensitive and stable? |

GitHub's current reuse documentation is at https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows. Workflow syntax is at https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax. Those references define the supported types and calling-job keywords. Check them when changing the interface rather than asking an agent to infer a key from ordinary job syntax.

The caller invokes a reusable workflow at the job level with \`uses\`. It is not a step. That calling job supports a limited set of keywords, including \`with\`, \`secrets\`, \`permissions\`, \`strategy\`, \`needs\`, \`if\`, and \`concurrency\`. A \`runs-on\` or \`steps\` block belongs inside the called workflow, not beside the calling job's \`uses\`.

## Declare a narrow smoke-test contract

The example contract accepts a URL, an environment label, and a boolean that controls whether destructive smoke actions are skipped. It requires one API token. Save it as \`.github/workflows/reusable-api-smoke.yml\`.

\`\`\`yaml
name: Reusable API smoke

on:
  workflow_call:
    inputs:
      target_url:
        description: HTTPS origin of the test environment
        required: true
        type: string
      environment_name:
        description: Non-secret environment label for reports
        required: false
        type: string
        default: staging
      dry_run:
        description: Skip mutation checks when true
        required: false
        type: boolean
        default: true
    secrets:
      api_token:
        description: Token scoped to smoke-test endpoints
        required: true

permissions:
  contents: read

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Validate reusable inputs
        env:
          TARGET_URL: \${{ inputs.target_url }}
          ENVIRONMENT_NAME: \${{ inputs.environment_name }}
        run: node scripts/validate-smoke-inputs.mjs

      - name: Run read-only smoke probe
        env:
          TARGET_URL: \${{ inputs.target_url }}
          API_TOKEN: \${{ secrets.api_token }}
        run: node scripts/smoke-read.mjs

      - name: Explain dry-run behavior
        if: \${{ inputs.dry_run }}
        run: echo "Mutation checks are disabled"
\`\`\`

The token is exposed only to the step that needs it. The validation step receives non-secret inputs, and the informational step receives neither URL nor token. This reduces accidental exposure through diagnostic commands and third-party actions.

The workflow's \`permissions\` block constrains \`GITHUB_TOKEN\`. It does not change the scope of \`api_token\`, which is an independently managed secret. Give that credential a test-only identity, the smallest endpoint scope, and a short lifetime where the provider supports it.

## Validate semantic constraints inside the called workflow

Type declarations stop a caller from passing a string where a boolean is required, but a string input can still be semantically dangerous. A URL might target production, use cleartext HTTP, embed credentials, or point to an unexpected host. Validate before passing it to test code.

Save the following as \`scripts/validate-smoke-inputs.mjs\`.

\`\`\`javascript
const targetValue = process.env.TARGET_URL;
const environmentName = process.env.ENVIRONMENT_NAME;

if (targetValue === undefined || environmentName === undefined) {
  throw new Error("TARGET_URL and ENVIRONMENT_NAME are required");
}

const target = new URL(targetValue);
const allowedHosts = new Set([
  "staging.example.test",
  "preview.example.test",
]);

if (target.protocol !== "https:") {
  throw new Error("Smoke target must use HTTPS");
}
if (target.username !== "" || target.password !== "") {
  throw new Error("Smoke target must not contain credentials");
}
if (!allowedHosts.has(target.hostname)) {
  throw new Error("Smoke target host is not allowlisted");
}
if (!/^[a-z][a-z0-9-]{1,30}$/.test(environmentName)) {
  throw new Error("Environment label has an invalid format");
}

console.log("Validated smoke target for", environmentName);
\`\`\`

The hosts use the reserved \`.test\` top-level domain, so replace them with authorized non-production hosts in a real repository. Do not turn an input directly into a shell command, file path, ref, or deployment target. Expressions are evaluated by GitHub Actions, then values enter the shell environment. Validate at the application-language boundary and avoid \`eval\`.

The smoke program can use Node's built-in \`fetch\`. It prints status and a boolean contract, never the token or complete response body. Save it as \`scripts/smoke-read.mjs\`.

\`\`\`javascript
const targetValue = process.env.TARGET_URL;
const token = process.env.API_TOKEN;

if (targetValue === undefined || token === undefined) {
  throw new Error("TARGET_URL and API_TOKEN are required");
}

const endpoint = new URL("/health", targetValue);
const response = await fetch(endpoint, {
  headers: { authorization: "Bearer " + token },
  signal: AbortSignal.timeout(15_000),
});

if (!response.ok) {
  throw new Error("Health probe failed with status " + response.status);
}

const body = await response.json();
if (
  typeof body !== "object" ||
  body === null ||
  !("ok" in body) ||
  body.ok !== true
) {
  throw new Error("Health response did not satisfy the contract");
}

console.log("Health probe passed with status", response.status);
\`\`\`

Masking is a last line of defense, not permission to print a secret. GitHub masks registered secret values in logs, but derived, transformed, encoded, split, or newly fetched sensitive values may require separate handling. Keep logs structural: status, rule ID, environment label, and correlation ID.

## Call the workflow with explicit mappings

The same-repository caller uses a relative workflow path. Save this as \`.github/workflows/pr-smoke.yml\`.

\`\`\`yaml
name: Pull request smoke

on:
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  call-smoke:
    if: \${{ github.event.pull_request.head.repo.full_name == github.repository }}
    uses: ./.github/workflows/reusable-api-smoke.yml
    with:
      target_url: https://preview.example.test
      environment_name: pr-smoke
      dry_run: true
    secrets:
      api_token: \${{ secrets.PREVIEW_SMOKE_TOKEN }}
\`\`\`

The condition avoids attempting the secret-backed job for pull requests from forks. GitHub does not pass ordinary secrets to workflows triggered from forks, with documented exceptions and event-specific behavior. Never switch to a more privileged trigger merely to make a fork test receive secrets. Split untrusted code checks from secret-backed post-merge or trusted-branch checks.

Explicit mapping documents capability flow. The caller calls its stored secret \`PREVIEW_SMOKE_TOKEN\`, while the callee sees only the interface name \`api_token\`. That decouples repository naming from the reusable contract and makes a review diff show exactly which credential crosses the boundary.

For a workflow in another repository, pin the \`uses\` reference according to supply-chain policy. A full commit SHA offers immutability; a tag or branch is easier to update but can move. A local relative call uses the workflow from the same commit as the caller and does not accept an \`@ref\` suffix.

## Choose named secrets before inherit

\`secrets: inherit\` is concise, but its security meaning is broad: the directly called workflow can access the caller's available secrets within GitHub's documented scope rules. That may be reasonable for an organization-owned platform workflow with a reviewed trust boundary, but it should be a conscious decision.

| Forwarding style | Visibility in caller | Callee capability | Recommended use |
| --- | --- | --- | --- |
| named mapping | each secret appears in YAML | only mapped names | default for test workflows |
| \`secrets: inherit\` | individual names are hidden | broad directly available set | tightly controlled same organization or enterprise |
| no \`secrets\` key | no ordinary secret forwarding | automatic token behavior only | public checks and untrusted code |
| OIDC permission | no long-lived cloud key | short-lived federated identity if configured | cloud access with provider trust policy |

What people get wrong is treating \`inherit\` as recursive. Secrets pass only to the directly called workflow. If workflow A calls B and B calls C, C receives a secret only if B passes or inherits it onward. This one-hop rule is valuable because every boundary gets a review opportunity.

Another mistake is declaring every possible secret optional so one reusable workflow can do everything. The result contains conditional branches that are hard to test and a caller cannot tell which capabilities a mode truly needs. Prefer smaller workflows with required secrets that match one purpose, or separate secret-free validation from authenticated operations.

## Forward one capability through a nested workflow

Suppose the smoke workflow delegates contract verification to another reusable workflow. B must map the secret to C explicitly. The nested workflow below is saved as \`.github/workflows/reusable-contract-check.yml\`.

\`\`\`yaml
name: Reusable contract check

on:
  workflow_call:
    inputs:
      target_url:
        required: true
        type: string
    secrets:
      contract_token:
        required: true

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Verify API contract
        env:
          TARGET_URL: \${{ inputs.target_url }}
          API_TOKEN: \${{ secrets.contract_token }}
        run: node scripts/smoke-read.mjs
\`\`\`

Workflow B can call it with this job:

\`\`\`yaml
jobs:
  delegate-contract-check:
    uses: ./.github/workflows/reusable-contract-check.yml
    with:
      target_url: \${{ inputs.target_url }}
    secrets:
      contract_token: \${{ secrets.api_token }}
\`\`\`

The names intentionally differ at each boundary. That makes capability translation visible: A's \`PREVIEW_SMOKE_TOKEN\` becomes B's \`api_token\`, then C's \`contract_token\`. If C reports that its secret is empty, inspect the B-to-C mapping before changing repository settings.

Permissions also cannot be elevated through a nested chain. A caller can maintain or reduce permissions available downstream. Design the top-level caller and each reusable workflow with explicit minimal permissions so an implicit default does not vary with organization settings.

## Keep environment secrets from shadowing passed secrets

Environment secrets behave differently from \`workflow_call\` secrets. The reusable workflow trigger does not accept an \`environment\` key for forwarding environment secrets. If a job inside the called workflow declares \`environment: staging\`, a secret with the same name in that environment is used instead of the caller-passed secret.

Consider this valid but surprising called-job fragment:

\`\`\`yaml
jobs:
  smoke:
    environment: staging
    runs-on: ubuntu-latest
    steps:
      - name: Probe with the selected token
        env:
          API_TOKEN: \${{ secrets.api_token }}
        run: node scripts/smoke-read.mjs
\`\`\`

If the \`staging\` environment defines \`api_token\`, it can shadow the value passed by the caller. The symptom is maddening: the caller mapping looks correct, the job receives a non-empty token, but authentication identifies the wrong account.

Use distinct names for environment-managed deployment credentials and callable workflow secrets, or let the caller choose a non-secret environment label while keeping credential selection at one well-documented layer. When environments provide approval gates, reviewers, or branch restrictions, retain those controls but make the credential source explicit.

## Diagnose missing, wrong, and overpowered credentials

A failed authentication does not automatically mean the secret was never forwarded. Diagnose from the contract outward without printing values.

| Symptom | Likely cause | Safe diagnostic |
| --- | --- | --- |
| workflow rejected before jobs start | missing required input or secret, wrong type, unknown name | compare caller keys with \`workflow_call\` declarations |
| step sees undefined environment variable | mapping omitted or expression resolves unavailable secret | log presence as a boolean, never the value |
| authentication uses wrong identity | environment secret shadows caller mapping | inspect called job's \`environment\` and secret names |
| nested workflow lacks secret | intermediate workflow did not forward it | trace each direct call boundary |
| fork PR job is skipped or secret absent | untrusted event does not receive ordinary secrets | run secret-free checks for forks |
| downstream API allows too much | external token scope is broad | inspect provider-side identity and permissions |

A presence check can fail safely without revealing length or prefix. Use it only inside the step already authorized to receive the secret.

\`\`\`bash
set -euo pipefail

if [[ -z "\${API_TOKEN:-}" ]]; then
  printf '%s\\n' 'API_TOKEN is unavailable' >&2
  exit 1
fi

printf '%s\\n' 'API_TOKEN is available to this step'
\`\`\`

The braces are essential in shell variable expressions. When composing values, write \`\${CI_PIPELINE_ID}_\${CI_NODE_INDEX}\` rather than ambiguous unbraced variables. In GitHub Actions, prefer the native expression contexts for workflow data and use shell variables only after values have been placed deliberately into \`env\`.

Never debug by enabling shell tracing around secret-bearing commands. \`set -x\` can echo expanded arguments. Do not dump all environment variables. A boolean presence signal, caller run ID, selected non-secret environment, and server-side authentication audit are enough to distinguish most causes.

## Replace long-lived cloud secrets with OIDC where possible

If a reusable workflow needs a cloud identity, OpenID Connect can exchange GitHub's job identity for a short-lived provider credential. The job requests \`id-token: write\`, the provider validates claims such as repository and ref, and an official provider action performs the exchange. This removes a long-lived cloud key from repository secrets, but it does not remove the need for least privilege.

Do not copy a generic OIDC block without configuring the provider trust policy. The secure contract includes both sides: GitHub permissions and cloud-side claim restrictions. Limit accepted organization, repository, workflow, branch or environment as appropriate, then grant the federated role only the API operations needed by the test.

Keep ordinary application test credentials separate. OIDC is suitable when the target provider supports federation. It is not a magic conversion for every service token, and an overpowered federated role can be as dangerous as an overpowered stored key during the job lifetime.

## Test the interface with positive and negative callers

Reusable workflow changes deserve contract tests. Maintain a manual or scheduled smoke caller in a sandbox repository or protected branch with a disabled test credential. Exercise the default path, each optional mode, nested forwarding, and output mapping. Then review negative cases at pull-request time through static inspection and small validation scripts.

| Contract case | Expected result | Evidence |
| --- | --- | --- |
| all required values supplied | called job starts and probe passes | run links caller and callee |
| required secret omitted | call is rejected before sensitive step | failure names contract boundary |
| boolean passed as string | type validation rejects call | no coercion-dependent behavior |
| disallowed target host | validation script exits nonzero | no network request is attempted |
| fork pull request | secret-backed job does not run | secret-free jobs still report |
| nested mapping removed | deepest workflow cannot receive token | diagnosis points to intermediate call |

Do not run destructive negative tests against production. Use disabled credentials, reserved hosts, mock services, or a dedicated sandbox. Numbers such as retry counts, matrix size, and timeouts should come from observed system behavior, not be invented by an agent to make the YAML look complete.

For releases of a cross-repository reusable workflow, publish a changelog that calls out input, output, secret, and permission changes. Test callers against the candidate commit SHA, then move an approved release tag if that is your distribution model. Consumers that pin a SHA need an intentional update mechanism.

Maintain a small caller inventory for high-impact workflows. GitHub can show workflow usage, but the platform team should still know which repositories depend on each supported contract and which reference they pin. Before removing an input, search those callers and provide a migration window. Before making an optional secret required, prove every supported execution mode needs it. Contract ownership also includes failure text: validation errors should name the rejected input or missing capability without echoing its value. Clear boundary errors shorten incidents and discourage unsafe debugging commands.

## Frequently Asked Questions

### Are secrets automatically available inside a reusable GitHub Actions workflow?

Ordinary secrets are not automatically passed to a reusable workflow. The calling job must map named secrets under \`secrets\` or use \`secrets: inherit\` where GitHub permits it. The automatically available \`GITHUB_TOKEN\` follows its documented context and permission rules. For named mappings, the key must match the called workflow's declared secret name. In nested workflows, each direct caller must forward the capability again. Test presence without printing the value, and inspect event restrictions for forks or Dependabot before assuming a configuration defect.

### When is secrets inherit acceptable for a reusable workflow?

Use inheritance only when the called workflow is within a clearly trusted organization or enterprise boundary and is reviewed to receive the caller's broad available secret set. Named mapping is easier to audit because every capability appears in the caller diff. Inheritance can be appropriate for a centrally governed platform workflow, but it raises the cost of reviewing third-party actions, debug steps, and future changes inside that workflow. It is direct-call only, not automatic recursive forwarding through every nested workflow.

### Can an environment secret override a secret passed by the caller?

Yes. If a job in the called workflow declares an environment, an identically named secret from that environment is used instead of the caller-passed secret. The \`workflow_call\` trigger itself does not support forwarding an environment. This can produce successful secret presence checks but authenticate as the wrong identity. Avoid name collisions, document where credential selection occurs, and inspect the called job's \`environment\` key during diagnosis. Preserve environment approvals where needed, but keep the source of each credential unambiguous.

### How should QA test changes to reusable workflow inputs and secrets?

Treat the workflow like a versioned API. Exercise a positive sandbox caller, omitted required values, wrong input types, unsafe target strings, fork behavior, nested secret forwarding, and least-privilege token access. Keep real credentials out of fixtures and logs. Validate non-secret strings before network or shell use, and prove secret-backed steps receive only the variables they need. For cross-repository consumers, test the candidate commit SHA before updating a release tag or pin, then record any contract or permission change in release notes.
`,
};
