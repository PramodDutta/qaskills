import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Run Contract Tests Before Deployment in CI',
  description:
    'Learn where to run contract tests before deployment in CI, publish verification evidence, and block incompatible consumer or provider releases safely.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Run Contract Tests Before Deployment in CI

A payment service image is already built, signed, and waiting at the production gate. The dangerous question is no longer whether its unit tests passed. It is whether that exact image remains compatible with every checkout version it will meet after release. Contract testing earns its place in CI by answering that release question before the deployment command runs.

This guide uses Pact terminology because its broker and compatibility matrix make the pipeline mechanics concrete. The same placement principles apply to other consumer-driven contract systems: generate evidence at the commit that owns it, verify providers against published expectations, and make deployment depend on immutable results. For the broader test-design side, read [API contract testing for microservices](/blog/api-contract-testing-microservices). Here the focus is orchestration, not how to write the first pact.

## Model the pipeline as evidence production

A useful contract pipeline has three distinct producers of evidence. The consumer build executes consumer tests and publishes a versioned contract. The provider build retrieves relevant contracts, verifies them against the provider implementation, and publishes each result. The release workflow asks whether all required evidence exists and passed for the application version and target environment.

Do not collapse those responsibilities into one large pre-production integration job. A consumer owns what it calls. A provider owns whether it can honor those calls. The broker owns the relationship between versions. CI merely moves evidence between those parties and refuses to deploy when the matrix is incomplete or red.

| Pipeline event | Contract action | Version recorded | Failure meaning |
|---|---|---|---|
| Consumer pull request | Generate pact and run mock-server assertions | Candidate consumer commit | Consumer code and declared interaction disagree |
| Consumer main build | Publish pact with branch metadata | Consumer commit SHA | Compatibility evaluation cannot begin |
| Provider change | Verify selected consumer pacts | Provider commit SHA | Provider cannot satisfy at least one expectation |
| Pact publication | Trigger provider verification | Provider branch or deployed version | New consumer demand lacks provider evidence |
| Release gate | Query compatibility matrix for target environment | Artifact commit SHA | Required verification is missing or failed |
| Successful deployment | Record deployment in broker | Same artifact commit SHA | Environment inventory would otherwise become stale |

This division exposes an important timing issue. A provider build triggered only by provider code changes cannot validate a newly published consumer contract. Configure a broker webhook, repository dispatch, or scheduled verifier so a consumer contract can cause provider verification. The release gate may need to wait briefly for that asynchronous result, but it should never manufacture a green result by skipping an unknown interaction.

## Give every artifact one identity

Contract evidence is trustworthy only when version identifiers join the correct things. Use the source commit SHA for the application version, and attach that same identifier to the container image, pact publication, provider verification, and deployment record. A mutable label such as \`latest\`, a build number local to one workflow, or a branch name cannot prove which binary was checked.

The release must promote an existing artifact. Rebuilding after verification introduces a gap: dependencies, build arguments, or generated files may differ. If the provider verifier exercised commit \`8b721f4\`, production should receive the image already built from \`8b721f4\`, not a fresh image that happens to carry the same semantic version.

Branch information is still useful. It helps the broker select contracts for feature-branch development and determine fallback relationships. It is metadata, not artifact identity. Send both branch and version where the client supports them.

| Identifier | Good use | Poor use | Reason |
|---|---|---|---|
| Full commit SHA | Pacticipant version and image label | Human release notes | Immutable and shared across jobs |
| Semantic release number | Public package or release label | Sole verification key before tagging | Often assigned after validation |
| Branch name | Contract selection and main-branch policy | Deployed application version | Moves whenever new commits land |
| Workflow run number | Diagnostics and traceability | Cross-repository correlation | Unique only inside one workflow |
| Container digest | Proving the deployed bytes | Source-level broker version | Excellent artifact identity but awkward for source events |

Store the mapping from commit SHA to image digest as build provenance. That lets an incident investigator move from a failed integration in the broker to the exact deployed bytes without guessing.

## Publish consumer contracts without creating races

Run consumer contract tests on pull requests for fast feedback, but be deliberate about publication. Publishing every speculative contract can trigger provider builds and clutter selection. Teams commonly publish from the consumer's main build and optionally publish feature-branch contracts when cross-service collaboration needs early feedback.

Never reuse a consumer version with different pact content. A version in the broker describes a particular application revision. If CI retries the same commit, publishing identical content is harmless. If generated content changes without a commit, the build is nondeterministic and should be fixed rather than hidden behind version mutation.

A consumer pipeline should fail when the test process or publication fails. Treat publication as delivery of test evidence, not an optional upload. If provider verification is triggered asynchronously, publication success does not imply compatibility. It only makes verification possible.

The following GitHub Actions excerpt shows the sequencing. Package names and scripts are project-specific, while the standard GitHub expressions and Pact Broker CLI commands illustrate the release boundary. Every \`\${{ ... }}\` expression is evaluated by Actions.

\`\`\`yaml
name: contract-and-release

on:
  push:
    branches: [main]

env:
  APP_VERSION: \${{ github.sha }}
  PACT_BROKER_BASE_URL: \${{ vars.PACT_BROKER_BASE_URL }}
  PACT_BROKER_TOKEN: \${{ secrets.PACT_BROKER_TOKEN }}

jobs:
  consumer-contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run test:contract
      - name: Publish checkout pacts
        run: |
          pact-broker publish pacts \\
            --consumer-app-version "$APP_VERSION" \\
            --branch "$GITHUB_REF_NAME" \\
            --broker-base-url "$PACT_BROKER_BASE_URL" \\
            --broker-token "$PACT_BROKER_TOKEN"

  release-gate:
    needs: consumer-contract
    runs-on: ubuntu-latest
    steps:
      - name: Require compatible production integrations
        run: |
          pact-broker can-i-deploy \\
            --pacticipant checkout-web \\
            --version "$APP_VERSION" \\
            --to-environment production \\
            --broker-base-url "$PACT_BROKER_BASE_URL" \\
            --broker-token "$PACT_BROKER_TOKEN"

  deploy:
    needs: release-gate
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: ./deploy-existing-image.sh "$APP_VERSION"
      - name: Update broker environment inventory
        run: |
          pact-broker record-deployment \\
            --pacticipant checkout-web \\
            --version "$APP_VERSION" \\
            --environment production \\
            --broker-base-url "$PACT_BROKER_BASE_URL" \\
            --broker-token "$PACT_BROKER_TOKEN"
\`\`\`

In a real repository, pin third-party actions to reviewed commit SHAs if your supply-chain policy requires it. Also keep the broker token scoped to the operations each job needs. A pull request from an untrusted fork must not receive a publication credential.

## Verify the provider from the outside in

Provider verification should boot the provider in a controlled test mode, retrieve the relevant pacts, replay each interaction, and publish the result. It is not enough to run provider unit tests that happen to cover similar routes. The verifier must compare the actual response with the contract's status, headers, and body matchers.

Provider states deserve special scrutiny. A state such as \`an order 42 exists\` is setup language, not an instruction for the consumer. The provider test suite maps that label to a deterministic fixture or API setup. Keep handlers idempotent because a verifier may execute them more than once. Do not point state setup at shared production-like data whose contents drift between runs.

Verification selection should include contracts that could matter after this provider release. Modern Pact workflows use branches, environments, deployed versions, and pending/WIP pact features rather than manually maintained consumer lists. A hard-coded list silently misses a new consumer, which is exactly the dependency contract testing is meant to expose.

The provider job below demonstrates the order around a Node service. The application-specific verifier command is intentionally represented as the project's npm script; the broker publication flags belong in that script's Pact verifier configuration. The CI job's responsibility is to preserve identity and surface failure.

\`\`\`yaml
name: verify-orders-provider

on:
  push:
    branches: [main]
  repository_dispatch:
    types: [pact-changed]

jobs:
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: contract
          POSTGRES_DB: orders_contract
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    env:
      PROVIDER_VERSION: \${{ github.event.client_payload.provider_sha || github.sha }}
      PACT_BROKER_BASE_URL: \${{ vars.PACT_BROKER_BASE_URL }}
      PACT_BROKER_TOKEN: \${{ secrets.PACT_BROKER_TOKEN }}
      DATABASE_URL: postgresql://postgres:contract@localhost:5432/orders_contract
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ env.PROVIDER_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run db:migrate
      - name: Verify selected pacts and publish results
        run: npm run pact:verify
        env:
          PACT_PUBLISH_VERIFICATION_RESULTS: 'true'
          PACT_PROVIDER_VERSION: \${{ env.PROVIDER_VERSION }}
          PACT_PROVIDER_BRANCH: \${{ github.ref_name }}
\`\`\`

Be careful with a webhook-triggered provider run: \`github.sha\` may identify the workflow's default branch at dispatch time, while the payload may name another intended revision. Decide which provider revision should verify the new contract, validate that input, and check out precisely that commit. Publishing a result against the wrong provider version makes the matrix look complete while proving nothing about the releasable artifact.

## Put the compatibility query immediately before deployment

The compatibility query is a release check, so place it after artifact creation and all version-specific evidence publication, but before the first mutation of the target environment. A gate that runs at pull-request time is useful feedback, yet it cannot replace the final query. Production inventory and contract results can change between merge and release.

For Pact, \`can-i-deploy --pacticipant NAME --version SHA --to-environment production\` asks the broker to evaluate that version against applications currently recorded in production. Exit code zero permits the next step. A nonzero exit stops it. Avoid parsing friendly console text when the CLI already expresses the decision through its exit status.

If verifications are triggered asynchronously, use a bounded retry capability supported by your broker client or an explicit orchestration wait. Distinguish \`pending evidence\` from \`failed evidence\` in logs. Both block release, but only the former is a timing condition. Set a deadline based on expected provider CI duration and fail closed when it expires.

There is a subtle but serious ordering rule: record deployment only after the platform confirms success. Recording before rollout tells later compatibility queries that a version is present even if the deployment failed. For a progressive rollout, choose and document what \`deployed\` means. It could mean the first production traffic, completion in one region, or full rollout. The broker inventory must match the release policy used by the gate.

## Handle consumers and providers differently at the gate

A consumer release needs evidence that the providers in its destination environment satisfy its contract. A provider release needs evidence that it satisfies consumers it will encounter there. Mobile and desktop consumers make provider gating harder because multiple client versions remain active simultaneously. The compatibility policy may need all supported production consumer versions, not merely the newest one.

This is why \`run the contract suite before deploy\` is too vague. The relevant matrix slice depends on application role and environment population.

| Release shape | Required compatibility view | Special risk |
|---|---|---|
| Web consumer with server-controlled rollout | Candidate consumer versus deployed providers | Rollback version may also need compatibility |
| Provider serving one web consumer | Candidate provider versus deployed consumer | Consumer may deploy independently during the run |
| Provider serving mobile clients | Candidate provider versus every supported client cohort | Old app versions cannot be upgraded on demand |
| Application acting as both roles | Both incoming and outgoing integration edges | One green direction can hide a failure in the other |
| First release of a new integration | Explicit initial verification or pending policy | Missing evidence may be mistaken for success |

Do not globally ignore missing contracts to make initial adoption convenient. Use a narrowly scoped pending policy, verify the first interaction, then remove the exception. An allow-list should have an owner and expiry, otherwise it becomes a permanent hole in the deployment decision.

## Prevent false confidence from green checks

Contract tests validate examples of an interface, not the entire distributed system. A green matrix cannot prove authorization policy, database migration safety, network behavior, capacity, or business workflow correctness. Keep focused integration, security, migration, and end-to-end checks where their distinct risks justify them.

The most common green-but-unsafe configurations are operational rather than syntactic:

1. Verification results are published against a branch label instead of the provider commit.
2. The release rebuilds an image after the verifier ran.
3. Deployment records are never updated, so the broker evaluates obsolete environment versions.
4. Provider verification selects only a hand-maintained consumer list.
5. A failed publication step is marked non-blocking.
6. A contract contains permissive matchers that omit fields consumers actually use.
7. The release script queries \`latest\` while another build publishes concurrently.

Audit these joins quarterly and after pipeline migrations. Start from one deployed digest, locate its source revision, locate the broker participant version, and inspect the exact verification results used at its gate. If any link requires a human inference, strengthen the metadata.

## Decide what runs on pull requests, main, and release

Fast feedback and release assurance need different scopes. On a consumer pull request, generate the pact and compare it with the target branch to reveal potentially breaking changes. On consumer main, publish the contract. On provider pull requests, verify relevant contracts against the candidate code without necessarily publishing authoritative main-branch results. On provider main, publish results using the immutable version. At release, query the destination environment again.

| Stage | Blocking signal | Typical cost control |
|---|---|---|
| Consumer PR | Local contract test failure | Run only affected package tests |
| Provider PR | Verification failure for selected contracts | Broker selectors and changed-service filters |
| Main build | Evidence publication failure | Retry transport errors, never assertion failures |
| Pre-production release | Matrix says incompatible or unknown | Reuse published evidence, do not replay all suites |
| Post-deployment | Deployment recording failure | Retry and alert because future gates depend on inventory |

This layout also makes CI ownership visible. Application repositories create versioned facts; the release workflow consumes those facts. If you are still designing job dependencies and protected environments, the [GitHub Actions testing and CI/CD guide](/blog/github-actions-testing-ci-cd-guide) provides the surrounding workflow mechanics.

Keep diagnostic artifacts long enough to explain a block. Useful output includes the participant name, exact application version, destination environment, missing matrix rows, verification URLs, and provider job identifier. Avoid printing broker tokens or dumping authorization headers while increasing verbosity.

## Frequently Asked Questions

### Should contract tests run again inside the deployment job?

Usually no. The deployment job should query evidence tied to the immutable artifact version. Re-running provider verification there increases release time and may test a different environment or dependency state. Repeat it only when the deployment environment itself is part of the verified contract setup, and publish the new result under the same accurately identified artifact.

### What should happen when a provider webhook build is still running?

Keep the release closed and wait only up to an explicit deadline. Once the verification publishes, repeat the compatibility query. If the deadline expires, fail with a message that identifies missing evidence rather than reporting an incompatibility assertion. Operators need to know whether to inspect queue health or provider behavior.

### Can a team gate on the latest successful provider verification?

Not safely for a versioned release. \`Latest\` can move between query and deployment, especially across repositories. Gate the consumer or provider commit that produced the artifact, against versions recorded in the destination environment.

### How do rollback releases interact with the Pact matrix?

Treat rollback as another deployment of a known version. Query whether that version is compatible with the integrations currently in production, because those neighbors may have changed since its original release. After the rollback succeeds, record that older version as deployed again.

### Is a broker outage a reason to bypass the release check?

The default should be fail closed. A bypass transfers compatibility risk to production precisely when evidence cannot be inspected. If the business defines an emergency path, require authorization, capture the exact artifact and unavailable query, limit the change scope, and reconcile deployment records when the broker returns.
`,
};
