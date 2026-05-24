import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Pactflow Contract Testing Broker Complete Guide 2026',
  description:
    'Use Pactflow for managed Pact broker hosting. Setup, bi-directional contracts, webhooks, can-i-deploy, OpenAPI integration, and team workflow patterns.',
  date: '2026-05-01',
  category: 'API Testing',
  content: `
# Pactflow Contract Testing Broker Complete Guide 2026

Pactflow is the commercial, hosted version of the Pact Broker - the central piece of infrastructure that powers consumer-driven contract testing across microservice teams. While the open source Pact Broker is free and self-hostable, Pactflow takes away the operational burden and adds features critical for larger organizations: bi-directional contracts, OpenAPI compatibility, a polished dependency graph UI, fine-grained access controls, and rich integrations with CI tools and chat platforms. For teams adopting Pact at scale, Pactflow is the path of least resistance.

This complete guide covers Pactflow in 2026: account setup, publishing contracts from CI, verifying providers, the can-i-deploy gate, bi-directional contracts that work with OpenAPI specs, webhooks for cross-team notifications, and patterns for rolling out Pactflow across a multi-team organization. Real CLI commands and CI workflows are included. By the end you'll know whether Pactflow is right for your team and how to operate it effectively.

## Key Takeaways

- Pactflow is the managed (SaaS) version of Pact Broker
- Free tier supports up to 5 contracts
- Bi-directional contracts blend Pact and OpenAPI workflows
- Webhooks notify Slack, Jira, and other tools of contract events
- Fine-grained access controls for multi-team usage
- Hosted UI shows the full microservice dependency graph
- Backed by SmartBear (formerly DiUS), team is the Pact maintainer

---

## Account Setup

1. Sign up at pactflow.io
2. Create an organization
3. Generate API tokens (Settings → API Tokens)
4. Note your broker URL: \`https://yourorg.pactflow.io\`

## Publishing Contracts

\`\`\`bash
pact-broker publish ./pacts \\
  --consumer-app-version=\${GIT_SHA} \\
  --branch=\${GIT_BRANCH} \\
  --broker-base-url=https://yourorg.pactflow.io \\
  --broker-token=\${PACTFLOW_TOKEN}
\`\`\`

## Verifying Providers

\`\`\`bash
pact-provider-verifier \\
  --provider=user-service \\
  --provider-base-url=http://localhost:3000 \\
  --pact-broker-base-url=https://yourorg.pactflow.io \\
  --broker-token=\${PACTFLOW_TOKEN} \\
  --provider-version=\${GIT_SHA} \\
  --provider-version-branch=\${GIT_BRANCH} \\
  --publish-verification-results
\`\`\`

## Bi-Directional Contracts

A unique Pactflow feature: combine Pact (consumer-driven) with OpenAPI (provider-driven) to verify compatibility without provider-side Pact tests.

The provider publishes their OpenAPI spec as an "OAS contract":

\`\`\`bash
pactflow publish-provider-contract openapi.yaml \\
  --provider user-service \\
  --provider-app-version=\${GIT_SHA} \\
  --branch=main \\
  --content-type=application/yaml \\
  --verification-success \\
  --verification-results=test-results.xml \\
  --verification-results-content-type=application/xml \\
  --verifier=Postman
\`\`\`

Pactflow then checks consumer contracts against this OpenAPI spec automatically - no separate provider verification needed.

## can-i-deploy

\`\`\`bash
pact-broker can-i-deploy \\
  --pacticipant user-service \\
  --version \${GIT_SHA} \\
  --to-environment production \\
  --broker-base-url=https://yourorg.pactflow.io \\
  --broker-token=\${PACTFLOW_TOKEN}
\`\`\`

Returns exit code 0 if compatible with all consumers/providers tagged with production, non-zero otherwise.

## Recording Deployments

\`\`\`bash
pact-broker record-deployment \\
  --pacticipant user-service \\
  --version \${GIT_SHA} \\
  --environment production \\
  --broker-base-url=https://yourorg.pactflow.io \\
  --broker-token=\${PACTFLOW_TOKEN}
\`\`\`

After deployment, record it so future can-i-deploy queries know what's live.

## Webhooks

Pactflow can trigger webhooks on events like contract changed, verification published, can-i-deploy result. Common targets:

| Target | Use Case |
|--------|----------|
| Slack | Notify channel when contracts change |
| Jira | Auto-create tickets on verification failures |
| Jenkins/GitHub Actions | Trigger provider verification when contracts change |
| Custom HTTPS | Any internal automation |

Webhook config in Pactflow UI:

\`\`\`json
{
  "events": ["contract_content_changed"],
  "request": {
    "method": "POST",
    "url": "https://hooks.slack.com/...",
    "headers": {"Content-Type": "application/json"},
    "body": {
      "text": "Contract changed: \${pactbroker.consumerName} -> \${pactbroker.providerName}"
    }
  }
}
\`\`\`

## CI Pipeline With Pactflow

\`\`\`yaml
name: Contract Tests
on: [push, pull_request]

env:
  PACTFLOW_BROKER: https://yourorg.pactflow.io
  PACT_TOKEN: \${{ secrets.PACTFLOW_TOKEN }}

jobs:
  consumer:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:pact
      - run: |
          npx pact-broker publish ./pacts \\
            --consumer-app-version=\${{ github.sha }} \\
            --branch=\${{ github.ref_name }} \\
            --broker-base-url=\${PACTFLOW_BROKER} \\
            --broker-token=\${PACT_TOKEN}

  provider:
    runs-on: ubuntu-latest
    needs: consumer
    steps:
      - uses: actions/checkout@v4
      - run: npm start &
      - run: sleep 5
      - run: |
          npx pact-provider-verifier \\
            --provider=user-service \\
            --provider-base-url=http://localhost:3000 \\
            --provider-version=\${{ github.sha }} \\
            --provider-version-branch=\${{ github.ref_name }} \\
            --pact-broker-base-url=\${PACTFLOW_BROKER} \\
            --broker-token=\${PACT_TOKEN} \\
            --publish-verification-results

  deploy-gate:
    runs-on: ubuntu-latest
    needs: provider
    if: github.ref == 'refs/heads/main'
    steps:
      - run: |
          npx pact-broker can-i-deploy \\
            --pacticipant user-service \\
            --version \${{ github.sha }} \\
            --to-environment production \\
            --broker-base-url=\${PACTFLOW_BROKER} \\
            --broker-token=\${PACT_TOKEN}
\`\`\`

## Pactflow Plans

| Plan | Free | Starter | Pro |
|------|------|---------|-----|
| Contracts | 5 | Unlimited | Unlimited |
| Pacticipants | 5 | 25 | Unlimited |
| Bi-directional | No | Yes | Yes |
| SSO | No | No | Yes |
| Audit log | No | Yes | Yes |
| Support | Community | Email | Priority |

Pricing scales with team size; check pactflow.io for current details.

## Team Workflow

A 5-team microservices organization:

| Team | Service | Role |
|------|---------|------|
| Auth | identity-service | Provider |
| Web | webapp | Consumer |
| Mobile | mobile-api | Consumer |
| Billing | billing-service | Both |
| Notifications | notif-service | Provider |

Each team:
1. Writes Pact tests in their repo
2. CI publishes contracts to Pactflow on every PR
3. Receives Slack notifications when their contracts are affected
4. Uses can-i-deploy to gate production deploys

Pactflow's UI shows the dependency graph: Web depends on identity-service and notif-service. When identity-service changes, Web's CI auto-runs against the new provider.

## Comparison To Self-Hosted Pact Broker

| Aspect | Pactflow | Pact Broker (OSS) |
|--------|----------|-------------------|
| Cost | Subscription | Hosting cost only |
| Setup | Minutes | Days |
| Maintenance | None | Manual |
| UI | Polished | Basic |
| Bi-directional | Yes | No |
| Webhooks | Built-in | Manual setup |
| SSO | Available | Manual |

For teams with limited DevOps capacity, Pactflow's value proposition is clear. For teams with strong infrastructure and tight budget, self-hosted works fine.

## Bi-Directional Workflow Example

The bi-directional contracts feature is the killer feature in Pactflow. It lets you skip provider Pact verification entirely when you have a good OpenAPI spec:

1. Consumer team uses Pact normally and publishes contract
2. Provider team uses Postman/Schemathesis/Dredd/other to validate their service against OpenAPI
3. Provider publishes OpenAPI + verification results to Pactflow
4. Pactflow auto-checks consumer contracts against the OpenAPI spec
5. can-i-deploy works as usual

This is huge when provider teams already have OpenAPI in their workflow and don't want to add Pact-specific test code.

## Real Migration Story

A startup with 12 microservices migrating from self-hosted Pact Broker to Pactflow:

| Phase | Before | After Pactflow |
|-------|--------|----------------|
| Broker uptime | 95% | 99.95% (SLA) |
| Time to onboard new service | 2 days | 30 min |
| Average verification time | 15 min | 8 min (cached) |
| Engineers maintaining broker | 1 FTE | 0 |
| Cost | EC2 + RDS ~$200/mo | $400/mo for Pro plan |

Net: more reliable, faster, and frees up an engineer. Worth the premium for most growing teams.

## Anti-Patterns

| Anti-Pattern | Better |
|--------------|--------|
| Skipping can-i-deploy | Always gate deploys |
| Tagging every commit production | Only record actual deploys |
| Publishing on local dev | Only publish from CI |
| Sharing tokens across CIs | One token per CI system |
| Ignoring webhook failures | Monitor webhook delivery |

## Real Suite Example

\`\`\`javascript
// jest test - consumer side
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const path = require('path');

const provider = new PactV3({
  consumer: 'webapp',
  provider: 'user-service',
  dir: path.resolve(__dirname, '..', 'pacts'),
  logLevel: 'info',
});

describe('Pact contract: user-service', () => {
  it('GET /users/42 returns user object', () => {
    provider
      .given('user 42 exists')
      .uponReceiving('GET user 42')
      .withRequest({
        method: 'GET',
        path: '/users/42',
        headers: { Authorization: MatchersV3.like('Bearer abc') },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: MatchersV3.like({
          id: 42,
          name: 'Alice',
          email: 'alice@example.com',
        }),
      });

    return provider.executeTest(async (mock) => {
      const axios = require('axios');
      const res = await axios.get(\`\${mock.url}/users/42\`, {
        headers: { Authorization: 'Bearer test' },
      });
      expect(res.status).toBe(200);
    });
  });
});
\`\`\`

## Conclusion

Pactflow takes contract testing from a clever technique to a production-ready workflow at organizational scale. The hosted broker eliminates infrastructure work, bi-directional contracts bridge Pact and OpenAPI ecosystems, webhooks integrate with the rest of your tooling, and the polished UI makes the microservice dependency graph navigable for any team member. For teams adopting Pact at scale, the value far exceeds the subscription cost.

Start with Pactflow's free tier for one consumer/provider pair. Wire up CI to publish contracts and verify. Add can-i-deploy to your deployment pipeline. As you add more services, expand to a paid plan. Within a quarter you'll have a contract-driven workflow that catches integration bugs before deployment. Visit our [skills directory](/skills) or the [Pact contract testing complete guide](/blog/pact-contract-testing-complete-guide-2026) for foundational concepts.
`,
};
