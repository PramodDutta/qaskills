import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Pact Broker Setup: Self-Host, Publish & can-i-deploy (2026)',
  description:
    'Complete Pact Broker setup guide: self-host with Docker Compose, publish pacts, run can-i-deploy, wire webhooks, version with git SHA and branches, and gate CI.',
  date: '2026-06-19',
  category: 'Guide',
  content: `
# Pact Broker Setup: The Complete 2026 Guide

A Pact Broker is the missing piece that turns consumer-driven contract testing from a local experiment into a safe, team-wide deployment gate. When you write a Pact consumer test, it produces a contract file (a "pact") that describes exactly how the consumer expects the provider to behave. Those JSON files are useless sitting on a developer's laptop. The broker is the central exchange where consumers publish their pacts, providers fetch and verify them, and your CI pipeline asks the single most important question in contract testing: "can I deploy this version of my service to production without breaking anyone?"

This guide walks through a complete **pact broker setup** from zero. You will stand up a self-hosted broker with Docker Compose backed by PostgreSQL, publish a real consumer pact, run provider verification, gate deployments with \`can-i-deploy\`, record deployments and releases, wire webhooks that trigger provider builds automatically, and adopt the modern branch-and-environment versioning model that replaced the old tag-based approach. By the end you will have a broker you can run in CI today, plus a clear comparison of self-hosting versus the hosted PactFlow SaaS so you can choose the right path for your team. If you are new to the underlying methodology, start with our [complete contract testing guide](/blog/contract-testing-pact-complete-guide), then come back here to operationalize it.

## What the Pact Broker Actually Does

The broker is a stateful application with a database and an HTTP API. It performs four jobs that no amount of local tooling can replace.

First, it **stores pacts** keyed by a consumer/provider pair plus a version. Second, it tracks **verification results** so it knows which provider versions have successfully verified which consumer contracts. Third, it records **deployments and releases** to named environments, so it always knows what is actually running in production, staging, and test. Fourth, it answers **can-i-deploy** queries by walking the matrix of pacts and verification results to determine whether a given application version is compatible with everything currently deployed in a target environment.

That fourth job is the entire point. Contract tests without a broker tell you whether two specific versions agree. The broker tells you whether the version you are about to ship is safe against every other service already live. It turns a pile of JSON files into a deployment decision.

## Self-Hosting the Broker with Docker

The open-source broker ships as the \`pactfoundation/pact-broker\` image. It is a Ruby application that needs a PostgreSQL database. Do not use the bundled SQLite option for anything beyond a five-minute demo — it loses data and does not handle concurrent writes.

Here is a production-shaped \`docker-compose.yml\` that runs the broker plus its database:

\`\`\`yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    healthcheck:
      test: ['CMD', 'pg_isready', '-U', 'pactbroker']
      interval: 5s
      timeout: 3s
      retries: 10
    environment:
      POSTGRES_USER: pactbroker
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-changeme}
      POSTGRES_DB: pactbroker
    volumes:
      - pgdata:/var/lib/postgresql/data

  pact-broker:
    image: pactfoundation/pact-broker:latest
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - '9292:9292'
    environment:
      PACT_BROKER_DATABASE_URL: 'postgres://pactbroker:\${POSTGRES_PASSWORD:-changeme}@postgres/pactbroker'
      PACT_BROKER_PORT: '9292'
      PACT_BROKER_LOG_LEVEL: INFO
      # Basic auth so the broker is not wide open
      PACT_BROKER_BASIC_AUTH_USERNAME: pact
      PACT_BROKER_BASIC_AUTH_PASSWORD: \${BROKER_PASSWORD:-pact}
      # Read-only credentials for dashboards / browsing
      PACT_BROKER_BASIC_AUTH_READ_ONLY_USERNAME: readonly
      PACT_BROKER_BASIC_AUTH_READ_ONLY_PASSWORD: readonly
      # Auto-create the schema on first boot
      PACT_BROKER_DATABASE_CLEAN_ENABLED: 'true'

volumes:
  pgdata:
\`\`\`

Bring it up and confirm it is healthy:

\`\`\`bash
export POSTGRES_PASSWORD='s3cret-db-pass'
export BROKER_PASSWORD='s3cret-broker-pass'

docker compose up -d
docker compose ps

# Confirm the API responds (basic auth required)
curl -sf -u pact:s3cret-broker-pass http://localhost:9292/diagnostic/status/heartbeat
\`\`\`

The broker UI is now at \`http://localhost:9292\`. It will be empty until you publish your first pact. In production you would put this behind TLS termination (nginx, Traefik, or your cloud load balancer) and point \`PACT_BROKER_DATABASE_URL\` at a managed Postgres instance rather than a sidecar container.

## Publishing Pacts to the Broker

Once your consumer tests run, they emit pact JSON into a \`pacts/\` directory. You publish those files with the \`pact-broker\` CLI, which is distributed in the \`pact-cli\` Docker image and via language packages.

The modern, correct way to publish includes the consumer version (use the git SHA), a branch, and the broker URL:

\`\`\`bash
GIT_SHA=$(git rev-parse --short HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

pact-broker publish ./pacts \\
  --consumer-app-version "\${GIT_SHA}" \\
  --branch "\${GIT_BRANCH}" \\
  --broker-base-url http://localhost:9292 \\
  --broker-username pact \\
  --broker-password s3cret-broker-pass
\`\`\`

If you prefer not to install anything globally, run the CLI from Docker:

\`\`\`bash
docker run --rm \\
  -v "\${PWD}/pacts:/pacts" \\
  --network host \\
  pactfoundation/pact-cli:latest \\
  publish /pacts \\
  --consumer-app-version "\$(git rev-parse --short HEAD)" \\
  --branch "\$(git rev-parse --abbrev-ref HEAD)" \\
  --broker-base-url http://localhost:9292 \\
  --broker-username pact \\
  --broker-password s3cret-broker-pass
\`\`\`

On the consumer side, the test itself generated those files. A minimal JavaScript consumer using Pact JS looks like this — note the contract is produced as a side effect of the test passing:

\`\`\`javascript
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const { like, eachLike } = MatchersV3;
const axios = require('axios');

const provider = new PactV3({
  consumer: 'web-frontend',
  provider: 'orders-api',
  dir: './pacts',
});

describe('orders-api contract', () => {
  it('returns an order by id', () => {
    provider
      .given('an order with id 42 exists')
      .uponReceiving('a request for order 42')
      .withRequest({ method: 'GET', path: '/orders/42' })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: like({
          id: 42,
          total: like(199.99),
          items: eachLike({ sku: like('ABC-1'), qty: like(2) }),
        }),
      });

    return provider.executeTest(async (mockServer) => {
      const res = await axios.get(\`\${mockServer.url}/orders/42\`);
      expect(res.status).toBe(200);
      expect(res.data.id).toBe(42);
    });
  });
});
\`\`\`

When this test passes, \`./pacts/web-frontend-orders-api.json\` appears, and the \`pact-broker publish\` command uploads it.

## Provider Verification

The provider checks every pact published against it and reports the results back to the broker. Always publish verification results — that is what feeds \`can-i-deploy\`. Here is the verification step run from CI for a provider:

\`\`\`bash
pact-broker can-i-deploy --help >/dev/null # CLI is installed

# Java/Gradle example wiring the verification plugin via env vars
PACT_BROKER_BASE_URL=http://localhost:9292 \\
PACT_BROKER_USERNAME=pact \\
PACT_BROKER_PASSWORD=s3cret-broker-pass \\
PACT_PROVIDER_VERSION=\$(git rev-parse --short HEAD) \\
PACT_PROVIDER_BRANCH=\$(git rev-parse --abbrev-ref HEAD) \\
PACT_PUBLISH_VERIFICATION_RESULTS=true \\
  ./gradlew pactVerify
\`\`\`

The provider fetches the consumer pacts (filtered by branch and deployed environments), replays each interaction against the running provider, and posts a pass/fail back to the broker tagged with the provider version. Now the broker knows: "orders-api version abc123 successfully verifies web-frontend version def456."

## can-i-deploy: The Deployment Gate

This is the command that makes contract testing worth the effort. Before you deploy any version to any environment, ask the broker if it is safe:

\`\`\`bash
pact-broker can-i-deploy \\
  --pacticipant web-frontend \\
  --version "\$(git rev-parse --short HEAD)" \\
  --to-environment production \\
  --broker-base-url http://localhost:9292 \\
  --broker-username pact \\
  --broker-password s3cret-broker-pass \\
  --retry-while-unknown 12 \\
  --retry-interval 10
\`\`\`

The command exits non-zero if the version is incompatible with anything currently in production, which fails your pipeline and blocks the deploy. The \`--retry-while-unknown\` flags let it wait for an in-flight provider verification to finish rather than failing immediately on a race condition. You run this for both consumers and providers, gating every promotion.

## Recording Deployments and Releases

For \`can-i-deploy --to-environment\` to work, the broker has to know what is actually deployed. You tell it by recording deployments after a successful release:

\`\`\`bash
# After the deploy succeeds, tell the broker what is now live
pact-broker record-deployment \\
  --pacticipant web-frontend \\
  --version "\$(git rev-parse --short HEAD)" \\
  --environment production \\
  --broker-base-url http://localhost:9292 \\
  --broker-username pact \\
  --broker-password s3cret-broker-pass
\`\`\`

Use \`record-deployment\` for services where only one version runs at a time (the broker automatically marks the previous version as undeployed). Use \`record-release\` for artifacts like mobile apps or libraries where multiple versions coexist in an environment and are retired explicitly with \`record-release --released\` later.

## Pact Broker CLI Command Reference

| Command | Purpose | Key flags |
|---|---|---|
| \`pact-broker publish\` | Upload pacts produced by consumer tests | \`--consumer-app-version\`, \`--branch\`, \`--tag\` |
| \`pact-broker can-i-deploy\` | Gate a deploy against an environment | \`--pacticipant\`, \`--version\`, \`--to-environment\` |
| \`pact-broker record-deployment\` | Mark a version as deployed (single-instance) | \`--pacticipant\`, \`--version\`, \`--environment\` |
| \`pact-broker record-release\` | Mark a version as released (multi-instance) | \`--pacticipant\`, \`--version\`, \`--environment\` |
| \`pact-broker create-or-update-webhook\` | Register a webhook | \`--request\`, \`--contract-published\`, \`--uuid\` |
| \`pact-broker describe-version\` | Inspect a version's branches/tags/envs | \`--pacticipant\`, \`--version\` |
| \`pact-broker create-environment\` | Define an environment in the broker | \`--name\`, \`--display-name\`, \`--production\` |

## Versioning: git SHA, Branches, Tags, and Environments

Getting versioning right is what separates a broker that helps from one that lies to you. The rules are simple.

**Application version must be the git SHA.** Never use \`1.0.0\` or \`latest\` as the consumer or provider version. The git commit SHA is globally unique, immutable, and traceable. Pass it as \`--consumer-app-version\` or \`--provider-version\`.

**Branches replace the old tag-based workflow.** In Pact's earlier model you tagged versions with \`prod\`, \`master\`, and feature branch names, and that one mechanism overloaded both "what code branch is this" and "where is this deployed." Modern Pact splits those concerns: use \`--branch\` to record the git branch a version came from, and use environments (\`--to-environment\`, \`record-deployment\`) to record where it is running. Tags still exist for backward compatibility but new pipelines should prefer branches plus environments.

| Concept | What it answers | Mechanism | Example values |
|---|---|---|---|
| Version | Which exact build is this? | git SHA | \`a1b2c3d\` |
| Branch | Which code line produced it? | \`--branch\` | \`main\`, \`feat/checkout\` |
| Environment | Where is it deployed/released? | \`record-deployment\` | \`production\`, \`staging\` |
| Tag (legacy) | Free-form label (older model) | \`--tag\` | \`prod\`, \`smoke\` |

With this model, \`can-i-deploy --to-environment production\` resolves the set of versions currently deployed there and checks compatibility against exactly those — not against some stale tag someone forgot to move.

## Webhooks: Closing the Loop Automatically

Without webhooks, your provider only verifies new consumer contracts when its own pipeline happens to run. Webhooks fix that: when a consumer publishes a changed pact, the broker calls a URL that triggers the provider's verification build. This is what makes the feedback loop fast.

Register a webhook with the CLI. This example triggers a GitHub Actions \`repository_dispatch\` event whenever a contract changes:

\`\`\`bash
pact-broker create-or-update-webhook \\
  'https://api.github.com/repos/acme/orders-api/dispatches' \\
  --uuid 7b3f-orders-verify \\
  --request POST \\
  --header 'Content-Type: application/json' \\
  --header 'Accept: application/vnd.github+json' \\
  --header 'Authorization: Bearer \${user.githubToken}' \\
  --data '{"event_type":"pact_changed","client_payload":{"pact_url":"\${pactbroker.pactUrl}"}}' \\
  --contract-content-changed \\
  --broker-base-url http://localhost:9292 \\
  --broker-username pact \\
  --broker-password s3cret-broker-pass
\`\`\`

Note the broker's template variables like \`\${pactbroker.pactUrl}\` and \`\${user.githubToken}\` — these are interpolated by the broker at fire time, not by your shell, which is why they survive into the registered webhook. Store secrets like the GitHub token as broker secrets, not inline. The \`--contract-content-changed\` event ensures the webhook fires only when the actual contract content changes, not on every republish of an identical pact.

## Wiring It All Into CI

A complete pipeline ties the pieces together. The consumer pipeline publishes its pact and asks can-i-deploy before shipping:

\`\`\`yaml
# .github/workflows/consumer.yml (excerpt)
jobs:
  contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test   # generates ./pacts
      - name: Publish pacts
        run: |
          npx pact-broker publish ./pacts \\
            --consumer-app-version "\${GITHUB_SHA::8}" \\
            --branch "\${GITHUB_REF_NAME}" \\
            --broker-base-url "\${PACT_BROKER_BASE_URL}" \\
            --broker-token "\${PACT_BROKER_TOKEN}"
      - name: Can I deploy?
        run: |
          npx pact-broker can-i-deploy \\
            --pacticipant web-frontend \\
            --version "\${GITHUB_SHA::8}" \\
            --to-environment production \\
            --retry-while-unknown 12 --retry-interval 10 \\
            --broker-base-url "\${PACT_BROKER_BASE_URL}" \\
            --broker-token "\${PACT_BROKER_TOKEN}"
      - name: Deploy + record
        run: |
          ./deploy.sh
          npx pact-broker record-deployment \\
            --pacticipant web-frontend \\
            --version "\${GITHUB_SHA::8}" \\
            --environment production \\
            --broker-base-url "\${PACT_BROKER_BASE_URL}" \\
            --broker-token "\${PACT_BROKER_TOKEN}"
\`\`\`

The provider pipeline, triggered by the webhook's \`pact_changed\` event, verifies and publishes results so the next can-i-deploy has fresh data.

## Self-Hosted Broker vs PactFlow Hosted

The open-source broker is free and capable, but PactFlow (the commercial SaaS from SmartBear) adds features that matter at scale. Choosing between them is mostly about operational burden versus advanced capability.

| Capability | Self-hosted OSS Broker | PactFlow (hosted SaaS) |
|---|---|---|
| Cost | Free (you pay for infra) | Paid subscription |
| Hosting/ops | You run Docker + Postgres + TLS + backups | Fully managed |
| Pact publishing & verification | Yes | Yes |
| can-i-deploy / matrix | Yes | Yes |
| Webhooks | Yes | Yes |
| Bi-directional contract testing | No (consumer-driven only) | Yes |
| SSO / SAML, fine-grained RBAC | No | Yes |
| Audit logs & secrets management | Limited | Yes |
| AI / OpenAPI-based contract tools | No | Yes |
| Support SLA | Community | Commercial support |

If your team is small, comfortable running a container plus a database, and only needs consumer-driven testing, the self-hosted broker is an excellent, no-cost choice. If you need [bi-directional contract testing](/blog/bidirectional-contract-testing-pact-2026), enterprise auth, or you simply do not want to operate stateful infrastructure, PactFlow earns its price. Many teams start self-hosted and migrate to PactFlow once contract testing becomes business-critical.

## Securing and Operating the Broker in Production

A broker that holds your deployment-safety data deserves the same operational care as any other production service. The Docker Compose setup above is a starting point, not a finished deployment. Harden it before real teams depend on it.

Put the broker behind TLS. The broker speaks plain HTTP on 9292; terminate TLS at a reverse proxy or load balancer in front of it and never publish credentials over an unencrypted connection. Use API tokens or basic auth, and prefer a long-lived read/write token for CI plus a separate read-only credential for dashboards and browsers, exactly as the \`PACT_BROKER_BASIC_AUTH_READ_ONLY_*\` variables enable. Rotate these on a schedule.

Back up the database. Everything that makes the broker valuable — every pact, every verification result, every deployment record — lives in PostgreSQL. Take regular automated backups of that database and test restoring them. A broker with a corrupted or empty database will happily answer \`can-i-deploy\` with dangerously wrong answers. Treat the database as the system of record it is.

Clean up old data. Over months, a busy broker accumulates thousands of pact versions and verification results, which slows the matrix queries that power \`can-i-deploy\`. Run periodic housekeeping:

\`\`\`bash
# Remove old pact versions while keeping anything deployed,
# released, or on the latest of each branch (dry run first)
docker run --rm --network host \\
  pactfoundation/pact-cli:latest \\
  pactflow clean \\
  --broker-base-url http://localhost:9292 \\
  --broker-username pact --broker-password s3cret-broker-pass \\
  --keep-version-selectors '[{"latest": true, "branch": "main"}]' \\
  --keep-min-age 30 \\
  --dry-run
\`\`\`

Drop \`--dry-run\` once you have confirmed the deletion set. Scheduling this monthly keeps query latency low and the UI responsive.

## Troubleshooting Common Broker Problems

A few failure modes account for most broker support questions, and recognizing them saves hours.

When \`can-i-deploy\` returns "unknown" rather than pass or fail, it means the broker has no verification result for the relevant pact yet — usually because the provider has not verified the new consumer contract. This is exactly what the \`--retry-while-unknown\` flags are for: they let the consumer wait for a webhook-triggered provider build to finish. If it never resolves, check that the provider pipeline is actually publishing verification results with \`PACT_PUBLISH_VERIFICATION_RESULTS=true\`.

When \`can-i-deploy --to-environment production\` claims everything is compatible but you know a service is broken, the usual cause is missing or stale deployment records. The broker only knows what you tell it via \`record-deployment\`. If a deploy succeeded but the \`record-deployment\` step was skipped or failed, the broker's view of production is wrong. Audit your pipeline to ensure the record step runs after every successful deploy and fails the build if it errors.

When publishing succeeds but the contract never appears under the expected branch, double-check you passed \`--branch\` and not a legacy \`--tag\`, and that the version is the git SHA rather than a reused label. Run \`pact-broker describe-version\` to see exactly which branches, tags, and environments a version is associated with.

## Frequently Asked Questions

### How do I set up a Pact Broker quickly?

Run the \`pactfoundation/pact-broker\` Docker image with a PostgreSQL backend using Docker Compose. Set \`PACT_BROKER_DATABASE_URL\`, expose port 9292, add basic auth, and bring it up with \`docker compose up -d\`. The broker auto-creates its schema on first boot, and the UI is immediately available at \`http://localhost:9292\`.

### What database does the Pact Broker need?

PostgreSQL is the supported production database. The broker also bundles SQLite, but that is suitable only for short demos because it does not handle concurrent writes and loses data easily. Always point \`PACT_BROKER_DATABASE_URL\` at a real Postgres instance — a managed cloud database in production, or a sidecar container for local development.

### What does can-i-deploy actually check?

It walks the broker's matrix of published pacts and verification results to determine whether a specific application version is compatible with every other version currently deployed in a target environment. If anything is incompatible or unverified, the command exits non-zero and fails your pipeline, blocking the unsafe deploy before it reaches production.

### Should I use the git SHA or a semantic version for pacts?

Use the git SHA. It is unique, immutable, and traceable back to an exact commit. Semantic versions and labels like \`latest\` get reused and overwritten, which corrupts the broker's understanding of which build verified which contract. Pass the short SHA as \`--consumer-app-version\` or \`--provider-version\`.

### What is the difference between branches and tags in Pact?

Branches record which code line a version came from (\`main\`, a feature branch) via \`--branch\`. Environments record where a version is deployed via \`record-deployment\`. Tags are the older, overloaded mechanism that mixed both concerns. New pipelines should prefer branches plus environments because \`can-i-deploy --to-environment\` resolves compatibility against what is genuinely live.

### Do I need webhooks for contract testing to work?

No, but they make the loop fast. Without webhooks, a provider only verifies new consumer contracts when its own pipeline next runs. A webhook fires when a consumer publishes a changed pact and triggers the provider's verification build immediately, so incompatibilities surface in minutes rather than on the next unrelated commit.

### When should I choose PactFlow over the self-hosted broker?

Choose PactFlow when you need bi-directional contract testing, enterprise authentication (SSO/SAML, RBAC), audit logging, or you simply do not want to operate stateful infrastructure. The self-hosted OSS broker is ideal for smaller teams doing consumer-driven testing who are comfortable running Docker and Postgres and want zero licensing cost.

### How do I record what is deployed in each environment?

After a successful deploy, run \`pact-broker record-deployment\` with the pacticipant, version, and environment. For single-instance services this also marks the previous version as undeployed. For artifacts where multiple versions coexist (mobile apps, libraries), use \`record-release\` instead and retire old versions explicitly later.

## Conclusion

A Pact Broker is the difference between contract tests that prove two builds agree and a deployment pipeline that knows what is safe to ship. You now have a self-hosted broker running on Docker Compose with PostgreSQL, a working consumer publish flow keyed by git SHA and branch, provider verification feeding results back, a \`can-i-deploy\` gate that blocks incompatible releases, deployment recording so the broker tracks reality, and webhooks that close the feedback loop automatically. Adopt the branch-plus-environment versioning model from day one and you will avoid the most common broker mistakes.

Ready to add contract testing to your stack the right way? Explore the curated [QA skills directory](/skills) for ready-to-install Pact, broker, and CI-gating skills your AI coding agent can apply directly to your repositories, and pair this broker setup with our deeper guides on contract testing methodology.
`,
};
