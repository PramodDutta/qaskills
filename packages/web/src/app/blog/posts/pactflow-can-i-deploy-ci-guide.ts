import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Pactflow can-i-deploy CI Guide',
  description: 'Pactflow can-i-deploy CI guide for release gates, environment promotion, branch metadata, rollback checks, and safe consumer provider deployments.',
  date: '2026-07-10',
  category: 'API Testing',
  content: `
# Pactflow can-i-deploy CI Guide

The build is green, the Docker image is signed, and the release should still stop. A consumer changed the shape of a request yesterday, the provider verification for production has not run against that version, and shipping now would move risk from CI into customer traffic. Pactflow's \`can-i-deploy\` command exists for that exact release decision.

A useful contract gate is not a decorative status check. It answers a narrow question: can this application version be deployed to this environment, given the pacts and verifications known to the broker? Pactflow builds on the Pact Broker model, so the quality of that answer depends on publishing consumer pacts, publishing provider verification results, recording deployments or releases, and asking about the correct target environment.

If your team is still designing its broker topology, start with [a Pactflow contract testing broker guide](/blog/pactflow-contract-testing-broker-guide). If you run an open source broker instead of Pactflow, the same release concepts map closely to [a Pact Broker setup guide for 2026](/blog/pact-broker-setup-guide-2026).

## What can-i-deploy actually proves

\`can-i-deploy\` does not run your tests. It queries the broker's recorded contract matrix. For a consumer, it checks whether the relevant providers have successfully verified the consumer's pact version for the target environment context. For a provider, it checks whether the provider version is compatible with the consumer versions it would meet in that environment.

That distinction matters in CI. Running \`can-i-deploy\` before publishing pacts or verification results produces a gate with missing evidence. Running it against the wrong branch, tag, or environment can produce a true answer to the wrong question. The command is reliable only when your pipeline feeds the broker consistently.

| Evidence in Pactflow | Produced by | Used by can-i-deploy for | Failure mode when missing |
|---|---|---|---|
| Consumer pact | Consumer test job publishes pact files | Provider compatibility decisions | Provider has nothing current to verify. |
| Provider verification result | Provider verification job publishes success or failure | Consumer deployment decisions | Consumer cannot prove the provider accepts the pact. |
| Application version | CI version, usually git SHA or build number | Matrix identity | Results attach to a different version than the artifact. |
| Environment deployment or release | Promotion job records where a version is active | Target environment calculation | The broker cannot know what versions meet in production. |
| Branch metadata | Publish and verification commands include branch | Mainline and feature branch workflows | Results look unrelated even when they came from the right code. |

## A consumer pipeline with a real release gate

A consumer service should publish pacts as soon as its contract tests pass, then ask \`can-i-deploy\` before promoting the artifact. The exact CI system can vary. The command shape is the important part.

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

export PACT_BROKER_BASE_URL="https://example.pactflow.io"
export PACT_BROKER_TOKEN="\${PACT_BROKER_TOKEN}"
export GIT_SHA="\${GITHUB_SHA}"

npm ci
npm test -- --runInBand

pact-broker publish ./pacts \
  --consumer-app-version "$GIT_SHA" \
  --branch "\${GITHUB_REF_NAME}" \
  --broker-base-url "$PACT_BROKER_BASE_URL" \
  --broker-token "$PACT_BROKER_TOKEN"

pact-broker can-i-deploy \
  --pacticipant "checkout-web" \
  --version "$GIT_SHA" \
  --to-environment "production" \
  --broker-base-url "$PACT_BROKER_BASE_URL" \
  --broker-token "$PACT_BROKER_TOKEN"
\`\`\`

This script deliberately uses the git SHA as the application version. That keeps the contract evidence tied to the same artifact that later gets deployed. If your organization uses immutable build numbers instead, use the build number everywhere: pact publish, verification publish, can-i-deploy, and deployment recording.

Do not run \`can-i-deploy\` only in a nightly job and treat that as release safety. A release gate must execute at the point where a specific version is about to move to a specific environment.

## Provider verification must publish the result that matters

Provider teams often run the verification locally and forget the publish step in CI. The consumer gate then fails because Pactflow has no provider evidence, even though the provider test job looked green. The verification job has to publish results to the broker with the provider version and branch.

\`\`\`ts
// pact/provider.pact.test.ts
import { Verifier } from '@pact-foundation/pact';

const providerVersion = process.env.GITHUB_SHA ?? 'local-dev';

new Verifier({
  provider: 'payments-api',
  providerBaseUrl: 'http://127.0.0.1:4000',
  pactBrokerUrl: process.env.PACT_BROKER_BASE_URL,
  pactBrokerToken: process.env.PACT_BROKER_TOKEN,
  publishVerificationResult: process.env.CI === 'true',
  providerVersion,
  providerVersionBranch: process.env.GITHUB_REF_NAME,
  consumerVersionSelectors: [
    { mainBranch: true },
    { deployedOrReleased: true },
  ],
}).verifyProvider();
\`\`\`

The selectors are the policy. Main branch contracts catch the next integration path. Deployed or released contracts protect the versions the provider must keep supporting. Your exact selector set should reflect your release model, not a copied default.

## Environments, releases, and deployments

Pactflow release gates become much more useful when the broker knows where versions are. Older workflows often used tags such as \`prod\` or \`staging\`. Environment-aware workflows record deployments or releases to named environments. That gives \`can-i-deploy --to-environment production\` enough context to evaluate the versions that would interact there.

| Workflow event | Broker command intent | Typical timing | Why it matters |
|---|---|---|---|
| Build created | Publish pacts or verification results with version | After tests pass | Creates compatibility evidence for an immutable version. |
| Artifact promoted to staging | Record deployment to staging | After deployment succeeds | Lets other services evaluate against staging occupants. |
| Artifact approved for production release | Run \`can-i-deploy --to-environment production\` | Before production rollout | Blocks incompatible versions before traffic moves. |
| Production rollout succeeds | Record deployment to production | After rollout is healthy | Updates the broker's view of active production versions. |
| Version is no longer active | Record undeployment when supported | After rollback or replacement | Prevents stale versions from influencing future decisions. |

A strong pipeline records the deployment only after the environment really contains the version. Recording too early can make the broker believe a version is active even when Kubernetes, ECS, or another platform rejected the rollout.

\`\`\`bash
pact-broker record-deployment \
  --pacticipant "checkout-web" \
  --version "$GIT_SHA" \
  --environment "production" \
  --broker-base-url "$PACT_BROKER_BASE_URL" \
  --broker-token "$PACT_BROKER_TOKEN"
\`\`\`

If your organization distinguishes release from deployment, choose the broker command that matches the lifecycle you operate. The key is consistency. Do not mix ad hoc tags, releases, and deployments without documenting which one drives \`can-i-deploy\`.

## CI placement by service type

Consumer and provider pipelines ask different questions. A consumer normally gates before deploying because its new requests must be accepted by providers. A provider gates before deploying because it must remain compatible with consumer versions that are already deployed or released.

| Service role | Publish step | Gate question | Good failure response |
|---|---|---|---|
| Consumer web app | Publish generated pacts after consumer tests | Can this consumer version go to production? | Wait for provider verification or fix the changed expectation. |
| Provider API | Publish verification results after provider tests | Can this provider version go to production with active consumers? | Preserve backward compatibility or coordinate consumer rollout. |
| Shared backend used by several consumers | Verify pacts selected by deployed or released consumers | Which consumer contract breaks? | Treat the broker output as a release dependency list. |
| Feature branch consumer | Publish branch pacts | Can providers verify the proposed interaction? | Use result as pre-merge signal, not production approval. |
| Hotfix provider | Verify currently deployed consumer pacts | Is the fix safe for the production matrix? | Gate hotfix speed with the contracts that matter right now. |

The gate should be close to the promotion action. In GitHub Actions, that might be a required job before an environment deployment. In GitLab, it might be a stage before production. In Buildkite, it might be a block step plus a command step. The platform is secondary. The invariant is that a failed \`can-i-deploy\` stops promotion.

## Interpreting a failed gate

A failed \`can-i-deploy\` result is not automatically a broken build. It can mean the provider has not verified yet, the verification failed, version metadata does not match, the wrong environment was queried, or the broker has no deployment information.

Start by reading the matrix output rather than retrying the pipeline. Identify the pacticipant pair, consumer version, provider version, and verification status. If the status is unknown, find the missing publish or verification job. If the status is failed, inspect the provider verification logs. If the versions look surprising, fix version propagation before changing tests.

A common anti-pattern is to add \`|| true\` around \`can-i-deploy\` during a release crunch. That trains the organization to ignore the contract system. A better exception path is explicit: document the broker result, identify the affected pacticipant, get service owner approval, and record a follow-up verification. Exceptions should be rare and visible.

## Branches, mainline, and pending contracts

Pactflow can support branch-aware and pending/WIP pact workflows, but those features need policy. Pending pacts are useful when a new consumer expectation has not been verified yet and should not break every provider build immediately. They are not a license to deploy unverified contracts to production.

For mature teams, branch metadata helps answer two different questions. Feature branch checks ask whether a proposed change is likely to integrate. Production gates ask whether a released version is safe with the versions in the target environment. Keep those questions separate in pipeline names and dashboards.

Avoid using environment names as branch names or tags. \`main\`, \`feature/add-coupons\`, \`staging\`, and \`production\` describe different dimensions. When they are blurred, \`can-i-deploy\` output becomes difficult to trust.

## Designing gates for multi-service release trains

The hardest \`can-i-deploy\` conversations happen when services do not release independently. A frontend, an API, and an async worker may be promoted as a train even though each has separate contract evidence. In that case, avoid a single vague contract job called \`pact\`. Give each pacticipant a gate that states the artifact and target environment.

A release train can still use Pactflow effectively if every artifact publishes its own version and the promotion pipeline queries each version before the train moves. If one service fails the gate, the train should either stop or remove that artifact from the release. Do not record a production deployment for a version that was built but not actually shipped.

| Release pattern | Gate strategy | Watch point |
|---|---|---|
| Independent microservice deploy | Run \`can-i-deploy\` in that service pipeline | Ensure target environment is the one receiving traffic. |
| Coordinated train | Run one gate per pacticipant version in the train | Do not hide one failed participant inside aggregate output. |
| Consumer before provider | Consumer gate waits for provider verification evidence | Provider CI must verify pending or changed pacts promptly. |
| Provider before consumer | Provider gate checks deployed or released consumers | Backward compatibility is the provider's responsibility. |
| Emergency rollback | Query the rollback version before redeploying | Old artifacts may lack current verification records. |

For rollback, remember that old does not automatically mean safe. A consumer rollback can reintroduce an interaction the current provider no longer supports. A provider rollback can break a newer consumer already in production. Query the exact version you plan to restore.

## Making broker output actionable in CI logs

A failed gate should tell the release owner what to do next. Raw command output is useful, but many CI logs bury it under setup noise. Wrap the command so the failure message includes pacticipant, version, target environment, and the broker URL for investigation. Keep the wrapper thin. It should not reinterpret the broker's decision.

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

PACTICIPANT="$1"
VERSION="$2"
ENVIRONMENT="$3"

echo "Checking Pactflow deployment safety"
echo "  pacticipant: $PACTICIPANT"
echo "  version:      $VERSION"
echo "  environment:  $ENVIRONMENT"

pact-broker can-i-deploy \
  --pacticipant "$PACTICIPANT" \
  --version "$VERSION" \
  --to-environment "$ENVIRONMENT" \
  --broker-base-url "$PACT_BROKER_BASE_URL" \
  --broker-token "$PACT_BROKER_TOKEN"
\`\`\`

This wrapper is boring by design. It standardizes context and still lets the broker decide. Avoid wrappers that convert unknown results to warnings, retry indefinitely, or swap environments based on branch names without making that policy visible.

## Governance without blocking useful branch feedback

Branch contract checks and production gates should have different severity. On a feature branch, a changed pact may be pending provider verification. That is a useful collaboration signal. On production promotion, the same missing verification is a release blocker. Teams get into trouble when they make feature branch feedback as strict as production or make production as relaxed as feature work.

| Pipeline point | Question | Recommended severity |
|---|---|---|
| Consumer pull request | Did the pact publish, and can providers see the proposed change? | Fail for publish errors, report verification status. |
| Provider pull request | Does the provider satisfy relevant changed pacts? | Fail for provider regressions. |
| Main branch build | Is the contract matrix healthy for mainline versions? | Fail when mainline compatibility is broken. |
| Staging promotion | Can this version meet staging occupants? | Block promotion. |
| Production promotion | Can this version meet production occupants? | Block release unless a documented exception is approved. |

This separation keeps Pactflow from becoming either too noisy to respect or too weak to protect production. The broker can support the workflow, but the team has to decide which question is being asked at each stage.

## Treat unknown as a release state

The broker matrix has more than pass and fail. Unknown matters. Unknown can mean a provider never verified a pact, a result was published under a different version, or the target environment has not been recorded. In production promotion, unknown should normally block. In branch feedback, unknown can be a collaboration prompt.

Build pipeline language around that distinction. A release owner should see "verification missing for payments-api against checkout-web version abc123" rather than a vague red job. The fix might be to rerun provider verification, repair version metadata, or record the current deployment. Retrying the consumer build is often the least useful response.

Make unknown visible in dashboards too. If teams only track failed verifications, they miss the quieter risk: contracts that nobody has verified yet.

## Frequently Asked Questions

### Should can-i-deploy run before or after deployment?

Run it before promotion to the target environment. After the deployment succeeds, record the deployment or release so future gates know which version is active there.

### What version should I pass to Pactflow?

Use the immutable artifact version, commonly a git SHA or CI build number. The same value must be used when publishing pacts, publishing verification results, running \`can-i-deploy\`, and recording deployment.

### Why does the gate fail when provider tests passed?

The provider test may not have published verification results, may have published them under a different version, or may have verified a different consumer selector set. Inspect the broker matrix before changing the test.

### Can feature branches use can-i-deploy?

Yes, but treat it as an integration signal unless that exact branch artifact is being promoted. Production approval should query the production environment with the version that will actually deploy.

### Is a tag-based workflow still acceptable?

It can work, but environment-aware deployment or release recording gives clearer answers for modern CI promotion. If you keep tags, document the tag policy and make sure every service uses it consistently.
`,
};
