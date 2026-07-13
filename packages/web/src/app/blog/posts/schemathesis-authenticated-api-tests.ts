import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Run Authenticated API Tests with Schemathesis',
  description:
    'Run authenticated Schemathesis API tests with static headers, dynamic token providers, refresh intervals, scope-aware caching, and safe diagnostics.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Run Authenticated API Tests with Schemathesis

Schemathesis generates a valid path, query, and body, then every protected operation returns 401. The generator is doing its job; the test transport lacks credentials. Adding a bearer token is easy. Supplying the right token for each operation, refreshing it without creating an authentication storm, and preserving negative security coverage requires a deliberate authentication layer.

Schemathesis can send a static header from the CLI or configuration, obtain credentials declaratively from a token endpoint, or use a Python authentication provider with \`get\` and \`set\` methods. Choose the smallest mechanism that matches token lifetime and scope behavior.

## Start by fixing the OpenAPI security model

Authentication-aware generation depends on the document. OpenAPI defines schemes under \`components.securitySchemes\` and applies them through root-level or operation-level \`security\`. An empty security array on an operation makes it public. An empty object inside a security requirement can represent optional access.

| OpenAPI shape | Meaning for a test runner | Common documentation defect |
|---|---|---|
| Root \`security: [{ bearerAuth: [] }]\` | Protected by default | Public health endpoint forgets to override |
| Operation \`security: []\` | No authentication required | Accidentally exposes a protected operation in the contract |
| Two schemes in one requirement object | Both schemes required | Intended alternatives modeled as simultaneous requirements |
| Two requirement objects in the array | Either requirement can satisfy access | One alternative is never exercised |
| OAuth scope list | Token needs listed scopes | Scope names drift from authorization server |

Do not compensate for an inaccurate schema by attaching an administrator token to every generated request. That can make wrongly public or wrongly documented endpoints appear healthy.

## Static tokens for short, controlled runs

For a token guaranteed to outlive the run, the CLI header is transparent:

\`\`\`bash
export API_TOKEN='short-lived-test-token'
schemathesis run https://api.example.test/openapi.json \\
  --header "Authorization: Bearer \${API_TOKEN}"
\`\`\`

The equivalent \`schemathesis.toml\` can reference an environment variable:

\`\`\`toml
headers = { Authorization = "Bearer \${API_TOKEN}" }

[output.sanitization]
enabled = true
\`\`\`

Keep the literal token out of version control and process listings. Environment variables are not perfect secret storage, but they are preferable to committing credentials. The CI identity should have only the permissions required by the tested operations.

Static headers apply broadly. If the schema includes a login endpoint, public documentation, or an operation that must be tested anonymously, global injection can distort behavior. Move to schema-aware authentication or split the run.

## Declarative token acquisition

Current Schemathesis supports dynamic OpenAPI authentication in \`schemathesis.toml\`. For a security scheme named \`BearerAuth\`, configure the token path and JSON Pointer used to extract the access token:

\`\`\`toml
[auth.dynamic.openapi.BearerAuth]
path = "/auth/token"
method = "post"
payload = { username = "\${TEST_USERNAME}", password = "\${TEST_PASSWORD}" }
extract_selector = "/access_token"
\`\`\`

Schemathesis calls the endpoint, extracts the value, and applies it according to the OpenAPI security scheme. For form-encoded credentials, set \`payload_content_type = "application/x-www-form-urlencoded"\`. If the service returns the credential in a response header, \`extract_from = "header"\` and a header-name selector are available.

Declarative acquisition is appropriate when one token shape covers the run and refresh behavior is simple. Use a Python provider for scope-dependent credentials, nonstandard exchanges, or explicit refresh-token handling.

## A dynamic Python authentication provider

The documented provider contract has \`get(case, ctx)\`, which returns authentication data, and \`set(case, data, ctx)\`, which applies it. The decorator caches data for 300 seconds by default; \`refresh_interval\` changes that interval.

\`\`\`python
# auth.py
import os
import requests
import schemathesis

TOKEN_URL = os.environ["TOKEN_URL"]


@schemathesis.auth(refresh_interval=240)
class TestBearerAuth:
    def get(
        self,
        case: schemathesis.Case,
        ctx: schemathesis.AuthContext,
    ) -> str:
        response = requests.post(
            TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": os.environ["TEST_CLIENT_ID"],
                "client_secret": os.environ["TEST_CLIENT_SECRET"],
            },
            timeout=15,
        )
        response.raise_for_status()
        payload = response.json()
        return payload["access_token"]

    def set(
        self,
        case: schemathesis.Case,
        data: str,
        ctx: schemathesis.AuthContext,
    ) -> None:
        case.headers = case.headers or {}
        case.headers["Authorization"] = f"Bearer {data}"
\`\`\`

Load the extension for a CLI run:

\`\`\`bash
export SCHEMATHESIS_HOOKS=auth
schemathesis run https://api.example.test/openapi.json
\`\`\`

Set the refresh interval below the actual token lifetime with allowance for clock skew and run latency. The decorator interval is time-based caching, not inspection of a JWT's \`exp\` claim. A test client should not need to decode opaque tokens.

## Applying the provider in pytest

Python integration is valuable when authentication depends on pytest fixtures or an in-process application. Register the provider on the schema and let each generated case call and validate normally.

\`\`\`python
import os
import requests
import schemathesis

schema = schemathesis.openapi.from_url(
    os.environ["OPENAPI_URL"],
)


@schema.auth(refresh_interval=180)
class ApiAuth:
    def get(self, case, ctx):
        response = requests.post(
            os.environ["TOKEN_URL"],
            json={"apiKey": os.environ["TEST_API_KEY"]},
            timeout=10,
        )
        response.raise_for_status()
        return response.json()["access_token"]

    def set(self, case, data, ctx):
        case.headers = case.headers or {}
        case.headers["Authorization"] = f"Bearer {data}"


@schema.parametrize()
def test_authenticated_contract(case: schemathesis.Case) -> None:
    case.call_and_validate()
\`\`\`

The generated test retains Schemathesis response checks while authentication is supplied through the schema provider. Do not fetch a token inside the test function for every example. Property-based generation can execute many examples per operation, creating avoidable load and rate-limit failures.

## Scope-aware token caching

A single token may not satisfy an API whose operations require different OAuth scopes. Schemathesis authentication supports cache keys through \`cache_by_key\`. The key function should derive a stable authorization class from the operation's security requirements, and the provider should request exactly that class.

Keep privilege partitions coarse enough to manage but precise enough to reveal authorization mistakes. For example, use separate read-only, billing-write, and administrator principals. If every case receives an all-powerful token, a missing scope check at the server is invisible.

| Credential class | Operations | Security signal preserved |
|---|---|---|
| Anonymous | Health and public catalog | Accidental authentication requirement |
| Reader | GET resources with read scope | Excess write permission is avoided |
| Writer | Approved mutation endpoints | Read-only enforcement can be tested |
| Tenant A administrator | Tenant-scoped administration | Cross-tenant identifiers remain adversarial |
| Expired or malformed token | Selected negative pass | Consistent 401 behavior |

The provider's cache key must never include generated example data indiscriminately, or every example obtains a token. Base it on scopes, tenant, or principal identity.

## Token refresh without masking expiry behavior

Proactive refresh keeps long generative runs healthy. It does not test how the API responds to an expired token. Maintain a separate negative test lane that deliberately sends an expired or revoked credential and asserts no protected representation or mutation occurs.

Avoid an automatic "on any 401, refresh and retry" transport wrapper. A 401 can mean wrong audience, missing scope handling, revoked credentials, or a server regression. Blind retry converts an important defect into extra token traffic. Refresh only when the credential is known to be expired and make the retry observable.

If the authorization server returns \`expires_in\`, a custom provider can cache expiry metadata and renew early. The built-in refresh interval is simpler and usually adequate for fixed-lifetime test tokens.

## Preserve unauthenticated and underprivileged coverage

Authenticated schema testing asks whether valid clients can call operations over a large generated input space. It does not prove enforcement. Add targeted runs for missing credentials, malformed schemes, wrong audience, expired tokens, insufficient scopes, and a valid token from another tenant.

Those cases should focus on security outcomes rather than full schema generation. An invalid body plus an invalid token can return either authentication or validation errors depending on middleware order. Use a minimally valid request when asserting authentication precedence.

The [Schemathesis API contract testing guide](/blog/api-contract-testing-schemathesis-guide) covers generated data and checks beyond credentials. The [authentication and authorization testing guide](/blog/authentication-authorization-testing-guide) develops the negative permission matrix around principals and resources.

## Keep generated operations safe

Once authenticated, Schemathesis can reach destructive endpoints. Run against an isolated environment, use disposable tenants, and limit the client identity. Schema generation can discover valid delete and update combinations that a read-only anonymous run never reached.

Filter operations only when the risk cannot be contained, and record why. Excluding every mutation leaves a large contract gap. Prefer resetting databases, synthetic accounts, idempotency keys, and resource cleanup.

Do not point a generative authenticated run at production. Rate limiting is not a safety boundary, and an OpenAPI document may contain operations whose effects are expensive or irreversible.

## Debugging a wall of 401 responses

First confirm the OpenAPI operation actually references the scheme configured by the provider. Scheme names are case-sensitive keys. Next verify that \`set\` initializes \`case.headers\` before assignment and that another hook does not overwrite the header.

Inspect the token issuer, audience, scopes, and expiry through the authorization server's safe diagnostics. Do not paste the token into online decoders. For JWTs, local decoding can aid diagnosis, but only signature-aware server validation establishes authenticity.

Check host boundaries. A schema loaded from one URL can describe servers at another base URL. Never forward an authorization header to an untrusted server selected from a document. Pin the expected API origin in CI and review server overrides.

Use Schemathesis output sanitization. Also configure the HTTP library and CI logger to redact \`Authorization\`, cookies, client secrets, and token endpoint bodies. Sanitized test output does not automatically sanitize an independently configured requests debug logger.

## Parallel execution and token endpoints

Parallel processes have separate in-memory auth caches, so each can obtain a token. The authorization server must tolerate that load, or CI should provision credentials before workers start. Do not share a refresh token among workers when rotation invalidates the previous token; one worker can revoke another's credential lineage.

Allocate a principal or refresh-token family per worker for mutable authorization state. Static client-credentials tokens may be safely cached separately when the provider permits concurrent grants. Include worker identity in test tenant naming, not in scopes invented solely for testing.

Rate-limit responses from the token endpoint are infrastructure failures distinct from generated API failures. Report them clearly and avoid classifying the current generated example as a minimal failing API case.

## Checking that authentication was really applied

A green run is not proof that the provider executed. The target environment may have accidentally disabled auth, or the schema may mark operations public. Add a controlled protected operation whose response identifies the test principal, and assert that identity without exposing secrets.

Run a canary request without the provider and require 401. Run another with a deliberately underprivileged token and require 403 where the API's policy makes that distinction. These checks validate the test harness before a long generated campaign.

Record aggregate token acquisition count. It should roughly follow cache partitions and refresh intervals, not the number of generated examples. Treat a sudden increase as a test-infrastructure regression.

## Choosing among authentication mechanisms

| Mechanism | Best fit | Limitation |
|---|---|---|
| CLI \`--header\` | One short run with a preissued token | Broad and cannot refresh itself |
| TOML static header | Repeatable CI configuration | Still one credential context |
| TOML dynamic OpenAPI auth | Standard token endpoint and one extraction rule | Less suitable for complex scope decisions |
| Python auth provider | Refresh, custom exchanges, scope or tenant cache keys | More code and secret-handling responsibility |
| Requests auth object | HTTP Basic, Digest, or third-party request auth | Tied to Python transport usage |

Prefer configuration for configuration-shaped problems. Move to Python only when behavior is genuinely required, then unit-test token selection and header application separately from the generated run.

## Stateful APIs and credential ownership

Generated creation and deletion flows become harder when tokens represent different users. A resource created by principal A should be read and deleted by A in the normal state machine, while principal B supplies the cross-tenant negative case. Passing only resource IDs without principal provenance can accidentally make a valid 404 look like broken generation.

Represent principal identity in state-machine bundles or test context, not in the generated API payload unless the public contract requires it. The authorization server decides identity from the credential. If a body contains an owner field, test that the server ignores or rejects attempts to assign another owner unless delegation is explicitly supported.

Cleanup should use the resource owner's credential or a separate audited cleanup identity after assertions finish. An administrator cleanup token must never leak into the calls being evaluated, because it changes authorization semantics.

## Cookies and CSRF-protected APIs

Not every authenticated OpenAPI API uses a bearer header. A login can return a session cookie, and mutating operations may also require a CSRF token tied to that session. Use a persistent requests session in Python integration when cookies must flow across calls, and acquire the CSRF token through the application's documented endpoint or page bootstrap.

Model cookie authentication accurately in OpenAPI where possible. Adding a global Authorization header to a cookie-based application tests a path real clients do not use. For CSRF, distinguish authentication from request-forgery protection: a valid session without the required token should fail mutations, while safe reads follow the product policy.

Parallel workers should not share one mutable cookie jar. Logouts, session rotation, and CSRF-token replacement create cross-worker failures. Allocate a session per worker or per generated state machine.

## Schema loading can itself require authentication

Some deployments protect the OpenAPI document separately from API operations. Credentials used to download the schema are not automatically the correct credentials for generated cases. Treat those channels independently and use least privilege for each.

If the document is obtained from an artifact rather than the running service, verify its server URL points to the intended isolated environment. A checked-in production server entry combined with a valid test token can send generated requests to the wrong host. Override the base URL explicitly and assert the origin before beginning generation.

Schema fetching failures should stop the run. Falling back silently to a stale local document can produce a green result against an obsolete contract.

## Token-service failure injection

Test the authentication provider as infrastructure. Make the token endpoint return a timeout, malformed JSON, a response without the extraction field, and a rate-limit status. The run should fail with a sanitized authentication setup error, not classify hundreds of API examples as unauthorized product failures.

For refresh logic, force one successful acquisition followed by a failed refresh. Decide whether in-flight calls may use the still-valid cached token and what happens after its safe refresh boundary. Keep these provider tests small and deterministic; the full generative suite need not rediscover the same harness behavior.

Track acquisition latency and response category without token content. This separates an authorization-server slowdown from an API-under-test regression and gives operators a useful dependency signal.

## Frequently Asked Questions

### How often does a Schemathesis Python auth provider fetch a token?

The auth decorator caches data for 300 seconds by default. Set \`refresh_interval\` to an appropriate value, use \`None\` to disable caching when justified, and account for separate caches in separate processes.

### Can I use one administrator token for every operation?

It may make happy-path calls succeed, but it hides scope and tenant enforcement defects. Use least-privilege credential classes and preserve separate anonymous and underprivileged tests.

### Why is my custom provider called many times in parallel CI?

Each process has its own memory and authentication cache. Token partitions created by cache keys also cause separate acquisitions. Provision per-worker credentials or ensure the token service supports the expected concurrency.

### Should the test automatically refresh after every 401?

No. A 401 may reveal audience, revocation, configuration, or server defects. Refresh based on known expiry, and surface unexpected 401 responses instead of silently replaying them.

### How do I stop Schemathesis from authenticating public endpoints?

Model public operations with the correct OpenAPI \`security\` override and use schema-aware authentication. If a global header is used, split public operations into a separate run or apply a selective provider rather than attaching credentials universally.
`,
};
