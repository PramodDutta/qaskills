import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers Network Aliases Guide for Multi-Container Tests',
  description: 'Apply this Testcontainers network aliases guide to connect realistic service stacks, separate host and container URLs, and diagnose DNS and readiness failures.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Testcontainers Network Aliases Guide for Multi-Container Tests

Testcontainers network aliases give a container a stable, test-scoped hostname on a user-defined container network. They are the preferred way for one test container to address another on that network. An API container can connect to PostgreSQL at \`orders-db:5432\`, while the Node.js test process connects to the same database through \`database.getHost()\` and \`database.getMappedPort(5432)\`.

That distinction is the heart of this Testcontainers network aliases guide. Container-to-container traffic uses an alias and the service's original container port. Host-to-container traffic uses the Testcontainers host plus its randomly mapped port. Mixing those address spaces creates tests that work on one laptop, fail in CI, or accidentally reach a developer's local service.

## Build a Two-Sided Address Model

Every multi-container test has at least two network perspectives. The test runner usually executes on the host side. Dependencies execute on a Docker network. A URL is valid only from the perspective for which it was built.

| Caller | Target | Hostname | Port |
|---|---|---|---:|
| Node.js test process | PostgreSQL container | \`database.getHost()\` | \`database.getMappedPort(5432)\` |
| API container | PostgreSQL container | \`orders-db\` | \`5432\` |
| Node.js test process | API container | \`api.getHost()\` | \`api.getMappedPort(8080)\` |
| Probe container | API container | \`orders-api\` | \`8080\` |

The mapped port is allocated for access from outside the container network. Testcontainers deliberately uses a random free host port, which permits parallel test runs and avoids collisions. The alias is resolved by container-network DNS and has no reason to resolve in the host operating system.

Put this model in code instead of passing one ambiguous \`DATABASE_URL\` everywhere. Define separate names that state the caller's perspective:

\`\`\`ts
type ServiceAddresses = {
  databaseFromHost: string;
  databaseFromContainers: string;
  apiFromHost: string;
  apiFromContainers: string;
};

function buildAddresses(
  databaseHost: string,
  databaseMappedPort: number,
  apiHost: string,
  apiMappedPort: number,
): ServiceAddresses {
  return {
    databaseFromHost: \`postgresql://tester:tester@\${databaseHost}:\${databaseMappedPort}/orders\`,
    databaseFromContainers: 'postgresql://tester:tester@orders-db:5432/orders',
    apiFromHost: \`http://\${apiHost}:\${apiMappedPort}\`,
    apiFromContainers: 'http://orders-api:8080',
  };
}
\`\`\`

This naming makes review easier. Passing \`databaseFromHost\` into an API container is visibly suspicious. AI coding agents also produce safer changes when the types and identifiers preserve network intent rather than presenting one generic string.

## Create One Explicit Network Per Test Stack

With Testcontainers for Node.js, start a \`Network\`, attach containers with \`withNetwork(network)\`, and assign aliases with \`withNetworkAliases(...aliases)\`. The official networking documentation describes aliases as the preferred option for containers communicating on the same network: https://node.testcontainers.org/features/networking/.

Use a fresh network for an independently executable integration stack. It gives parallel runs separate DNS namespaces and lets Testcontainers clean up the resources with the test. Do not attach unrelated suites to a manually named, long-lived Docker network unless cross-run sharing is an explicit requirement.

\`\`\`ts
import { GenericContainer, Network } from 'testcontainers';

const network = await new Network().start();

try {
  const service = await new GenericContainer(process.env.SERVICE_TEST_IMAGE!)
    .withNetwork(network)
    .withNetworkAliases('orders-api')
    .withExposedPorts(8080)
    .start();

  console.log({
    fromHost: \`http://\${service.getHost()}:\${service.getMappedPort(8080)}\`,
    fromNetwork: 'http://orders-api:8080',
  });

  await service.stop();
} finally {
  await network.stop();
}
\`\`\`

In production-quality tests, put every started resource into a cleanup path that runs after failure. Modern Node.js and Testcontainers examples may use explicit resource management with \`await using\` where the project toolchain supports it. A conventional \`try/finally\` remains clear across more TypeScript configurations.

Do not set a fixed Docker container name just to obtain a hostname. Testcontainers for Node.js documentation discourages fixed names because existing containers can conflict, and recommends networks plus aliases for communication. The alias is scoped to the network, so two concurrently running test networks can both contain an \`orders-db\` without colliding.

## Choose Aliases That Express Roles, Not Instances

An alias becomes infrastructure configuration inside the test. Name the service role the client expects, such as \`orders-db\`, \`payments-stub\`, or \`catalog-api\`. Avoid random suffixes inside container configuration because the network already isolates the stack. Avoid production public domains unless the test specifically validates routing for those names.

| Alias style | Example | Assessment |
|---|---|---|
| Role-based | \`orders-db\` | Stable and readable |
| Technology-only | \`postgres\` | Clear until the stack has two databases |
| Generated instance ID | \`db-7f19a\` | Unnecessary inside an isolated network |
| Environment-shaped | \`orders-db.prod.internal\` | Risks confusing test and production intent |
| Generic | \`service\` | Hard to diagnose in a larger topology |

One container may have multiple aliases when compatibility or migration requires them. For example, an API could answer as both \`catalog-api\` and an older \`products-api\` name during a contract transition. Treat that as temporary compatibility and test both deliberately. Multiple aliases should not conceal two logical services behind one instance unless that equivalence is what the test proves.

Aliases are not service discovery health checks. DNS resolution can succeed while the process is still booting, migrating a schema, or refusing connections. Use a wait strategy that describes readiness independently.

## Assemble a Database and API Stack

The example below creates a PostgreSQL container and an application container on the same network. It passes the alias-based database URL into the application because the application is the caller. It exposes the API port because the test process will send HTTP requests from the host side.

Images come from environment variables so the repository can pin reviewed images in its own configuration. Failing immediately when an image is absent is clearer than silently pulling an unspecified tag.

\`\`\`ts
import { GenericContainer, Network, Wait } from 'testcontainers';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

function requiredImage(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(\`Missing required image variable \${name}\`);
  return value;
}

const network = await new Network().start();
const database = await new PostgreSqlContainer(requiredImage('POSTGRES_TEST_IMAGE'))
  .withDatabase('orders')
  .withUsername('tester')
  .withPassword('tester')
  .withNetwork(network)
  .withNetworkAliases('orders-db')
  .start();

const api = await new GenericContainer(requiredImage('ORDERS_API_TEST_IMAGE'))
  .withNetwork(network)
  .withNetworkAliases('orders-api')
  .withEnvironment({
    DATABASE_URL: 'postgresql://tester:tester@orders-db:5432/orders',
  })
  .withExposedPorts(8080)
  .withWaitStrategy(Wait.forHttp('/health', 8080))
  .start();

try {
  const response = await fetch(
    \`http://\${api.getHost()}:\${api.getMappedPort(8080)}/orders\`,
  );
  if (!response.ok) throw new Error(\`Orders API returned \${response.status}\`);
} finally {
  await api.stop();
  await database.stop();
  await network.stop();
}
\`\`\`

The application image must actually expose or listen on port 8080 internally, and its health endpoint must represent useful readiness. Binding only to loopback inside the application container would prevent other containers from reaching it. Containerized servers normally need to listen on an address reachable through the container's network interface.

The database container exposes a host-mapped connection for the test process through its module methods. The API does not use that connection string because the mapped host address belongs to the host perspective. It uses \`orders-db:5432\`.

## Do Not Confuse Start Order With Readiness

Starting the database before the API reduces one race, but it does not prove the database is ready for the API's exact operation. Testcontainers modules and wait strategies help determine container readiness. Your application also needs sane connection retry behavior because real deployments have the same timing variation.

An explicit HTTP wait tells Testcontainers not to return the started API until the health route satisfies the wait strategy. That health route should fail while mandatory dependencies are unavailable if the test contract requires a fully usable API. If it reports healthy before database migrations finish, the first test request may still race.

| Signal | What it proves | What it does not prove |
|---|---|---|
| Container process started | Runtime launched the process | Service accepts useful requests |
| Alias resolves | Network DNS has a record | Target port is listening |
| TCP connection succeeds | Something accepts a socket | Application is semantically ready |
| HTTP health returns success | Health policy currently passes | Every business operation will pass |
| Seed query succeeds | Required schema and data exist | Unrelated dependencies are healthy |

For a one-shot migration container, use a startup strategy intended for a process that exits successfully rather than treating exit as failure. Then start the API only after migration completion. Exact orchestration choices vary by language module, so follow the current Testcontainers documentation for the chosen one-shot strategy.

Avoid fixed sleeps. A five-second delay wastes four seconds on a fast machine and still fails on a slow registry, overloaded CI host, or first-time database initialization. Wait on the boundary the next component requires.

## Verify Connectivity From Inside the Network

A host-side HTTP assertion proves the published port path, but it does not prove that another container can resolve the alias. Add a small probe container when internal connectivity is part of the contract. The probe joins the same network and executes a real request using the alias.

\`\`\`ts
import { GenericContainer, Wait } from 'testcontainers';

const probe = await new GenericContainer(process.env.HTTP_PROBE_IMAGE!)
  .withNetwork(network)
  .withCommand([
    'sh',
    '-c',
    'wget -q -O - http://orders-api:8080/health',
  ])
  .withWaitStrategy(Wait.forOneShotStartup())
  .start();

const output = await probe.logs();
for await (const chunk of output) {
  process.stdout.write(chunk);
}

await probe.stop();
\`\`\`

Choose a reviewed probe image containing the command the test invokes. Do not assume every minimal container includes \`curl\`, \`wget\`, a shell, or DNS utilities. Better still, maintain a tiny internal probe image with known tools and pin it like any other test dependency.

For repeated assertions, keep a probe container running with a harmless command and use \`exec\` to run DNS and HTTP checks. Testcontainers for Node.js returns the command output and exit code from container execution, which makes failures easy to assert and attach.

\`\`\`ts
const dns = await probe.exec(['getent', 'hosts', 'orders-db']);
if (dns.exitCode !== 0) {
  throw new Error(\`Alias lookup failed: \${dns.output}\`);
}

const health = await probe.exec([
  'wget', '-q', '-O', '-', 'http://orders-api:8080/health',
]);
if (health.exitCode !== 0) {
  throw new Error(\`Internal health check failed: \${health.output}\`);
}
\`\`\`

These assertions answer two separate questions: can DNS resolve the name, and can the service respond? Preserve both results. A generic "network failed" error throws away the boundary information needed to fix it.

## Test the Host-to-Container Boundary Separately

Test code that runs in Node.js, Java, Python, or another host process should not attempt to connect to \`orders-api:8080\`. Use the running container's host and mapped port accessors. Do not hardcode \`localhost\`, because remote Docker environments and some CI arrangements expose ports through another host.

\`\`\`ts
function externalHttpUrl(
  container: { getHost(): string; getMappedPort(port: number): number },
  internalPort: number,
): string {
  return \`http://\${container.getHost()}:\${container.getMappedPort(internalPort)}\`;
}

const baseUrl = externalHttpUrl(api, 8080);
const response = await fetch(\`\${baseUrl}/orders/order-42\`);

if (response.status !== 200) {
  throw new Error(\`Expected order response, received \${response.status}\`);
}
\`\`\`

Call mapped-port methods after the container starts, when the mapping exists. If an application running on the host needs a database, give it the host-facing connection. If an application running in another test container needs the same database, give it the alias-facing connection. There is no single universal database URL for both callers.

This distinction becomes especially useful when combining API tests with browser automation. A browser running on the host may use the host URL. A browser in a Selenium container on the custom network may use the API alias. For decisions about JavaScript execution layers, [the complete JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) provides context. When browser checks interact with the stack, [Playwright locator best practices](/blog/playwright-best-practices-locators-2026) help keep UI assertions independent from this network setup.

## Connect a Container Back to a Host Service

Sometimes the system under test runs in the test process, while a container must call it. This is the reverse direction. A network alias cannot name the host process. Testcontainers provides a host-access mechanism and the special hostname \`host.testcontainers.internal\` for exposed host ports.

In Testcontainers for Node.js, start the host server first, expose its listening port through \`TestContainers.exposeHostPorts\`, and then start containers that will call it. The official documentation notes that this mechanism prepares container access to the host port.

\`\`\`ts
import { createServer } from 'node:http';
import { GenericContainer, TestContainers } from 'testcontainers';

const server = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ approved: true }));
});

await new Promise<void>(resolve => server.listen(0, '0.0.0.0', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Missing server port');

await TestContainers.exposeHostPorts(address.port);

const client = await new GenericContainer(process.env.HTTP_PROBE_IMAGE!)
  .withCommand(['sleep', 'infinity'])
  .start();

const result = await client.exec([
  'wget', '-q', '-O', '-',
  \`http://host.testcontainers.internal:\${address.port}/decision\`,
]);

await client.stop();
server.close();
\`\`\`

This is not an alias feature. It is a separate bridge from containers to the host. Keeping those mechanisms conceptually separate avoids trying to attach an alias to something that is not a container on the test network.

## Model Proxies and Failure Injection With Stable Targets

Network aliases are particularly valuable for Toxiproxy or another fault-injection proxy. The proxy needs a stable upstream such as \`orders-api:8080\`. The test then directs a client through the proxy and changes network conditions without rebuilding application configuration on every random Docker address.

Be explicit about which component uses the proxy. If the host-side test calls a mapped proxy port, use the proxy's host and mapped port. If another container calls the proxy, give the proxy its own network alias and internal listening port. The upstream still uses the target container alias.

Test one failure dimension at a time: connection cut, latency, timeout, or limited bandwidth. Assert the product behavior, such as retry limits, a circuit-breaker response, or a clear user error. Then remove the fault and assert recovery. A test that injects several network problems simultaneously is dramatic but hard to diagnose.

Never reuse a faulted proxy across parallel tests without strict reset logic. A latency toxic left active by one failed test can contaminate another. Per-test networks and per-test proxy containers are often worth the startup cost for resilience cases.

## Diagnose Alias Failures From DNS Outward

A realistic failure appears as \`ENOTFOUND orders-db\` in the API logs, while the host test can connect to PostgreSQL using its mapped port. This proves the database is running and host exposure works. It does not prove the API and database share a network or that the alias exists there.

Inspect the topology in order:

1. Confirm both containers were created with the same started \`Network\` object.
2. Confirm \`withNetworkAliases('orders-db')\` was applied to the database before it started.
3. Execute a DNS lookup from the API container or a probe on that network.
4. If DNS resolves, test a TCP connection to container port 5432, not the host's mapped port.
5. Inspect the API's effective environment and database logs.
6. Confirm the database is ready and credentials match.

| Symptom | Most likely layer | Diagnostic action |
|---|---|---|
| \`ENOTFOUND\` or name not known | Alias or network membership | Run DNS lookup inside peer container |
| Connection refused | Process not listening or not ready | Inspect service bind address and logs |
| Timeout | Routing, firewall, saturation, or wrong port | Verify same network and internal port |
| Authentication failed | Credentials or database state | Compare effective config and server logs |
| Host succeeds, peer fails | Address-space mix-up | Replace mapped host address with alias URL |
| Peer succeeds, host fails | Missing exposure or wrong mapping | Use \`getHost\` and \`getMappedPort\` |

Capture the network name or identifier, container IDs, aliases, effective sanitized URLs, wait-strategy results, and container logs as CI artifacts. Never print passwords embedded in connection strings. A useful diagnostic prints \`postgresql://tester:REDACTED@orders-db:5432/orders\`.

## Avoid Parallel-Test and Reuse Traps

The greatest benefit of network-scoped aliases is repeatability in parallel. Ten tests can each create a network containing \`orders-db\`, because each DNS namespace is independent. Problems return when suites share a static network, a fixed container name, or mutable singleton containers without isolation.

Container reuse can reduce startup time, but shared databases and networks change the test contract. State can outlive a test, aliases can point to an older instance, and schema migrations can race. Use reuse only with a documented lifecycle and strong data partitioning. Fresh resources are the clearer default for tests whose purpose is isolation.

Do not invent unique aliases from worker IDs unless containers from different workers actually share a network. On separate networks, random names merely complicate configuration. If a shared network is unavoidable, unique aliases solve name collision but do not solve shared service state or cleanup races.

For resource-heavy stacks, consider one stack per worker rather than one per test. Reset state through supported APIs and preserve worker-scoped addresses. Measure whether the performance gain justifies the wider failure blast radius.

## What Engineers Often Get Wrong About Aliases

The first misconception is that an alias replaces port exposure. It replaces the hostname for peer containers. Exposed ports serve host-side callers and are accessed through a mapped port. A container peer normally uses the original internal port.

The second is that aliases are globally resolvable. They exist on their Docker network. Your laptop's DNS and a container on another network will not necessarily resolve them.

The third is that network availability equals application readiness. DNS may resolve before a server listens, and a socket may accept before migrations complete. Use meaningful wait strategies.

The fourth is using a fixed Docker name for discoverability. That introduces cross-run collisions and makes cleanup brittle. Testcontainers network aliases provide discoverability within the intended scope.

The fifth is copying a host connection URI into a container environment. Mapped ports and returned hostnames belong to the host perspective. Construct the container-facing address from the alias and internal port.

## Turn the Topology Into a Reviewable Test Fixture

Centralize stack construction in a fixture that returns explicitly named addresses and started resources. Keep assertions in tests, not inside the fixture. The fixture should make startup order, wait conditions, aliases, credentials, exposed ports, and cleanup visible in one place.

Add a topology comment or table to the fixture documentation:

| Component | Alias | Internal dependency | Host exposure |
|---|---|---|---|
| PostgreSQL | \`orders-db\` | None | Dynamic port for setup and assertions |
| Orders API | \`orders-api\` | \`orders-db:5432\` | Dynamic mapping of port 8080 |
| Fault proxy | \`orders-proxy\` | \`orders-api:8080\` | Only when host test controls proxy path |
| Probe | None required | Calls aliases directly | No host port needed |

Return a cleanup function that stops consumers before providers and always attempts every cleanup step. If one stop fails, retain the other errors rather than abandoning remaining resources. Testcontainers' resource reaper provides important protection, but deterministic teardown keeps local and CI environments healthier.

Finally, pin and review container images in project configuration. An alias makes the address stable, not the software behind it. Record image identities with failure artifacts so an unexpected registry update cannot masquerade as a DNS regression.

Testcontainers network aliases work best when treated as part of a small, explicit network design. Name roles clearly, build URLs for the correct caller, wait for useful readiness, and probe from both sides of the boundary. Those habits turn multi-container integration tests from Docker puzzles into reproducible product checks.

## Keep the Fixture Portable Across Developer Machines and CI

Portability begins by avoiding assumptions about localhost, fixed host ports, pre-created Docker networks, and bind-mounted developer paths. Ask each started container for its host-facing address, keep peer addresses alias-based, and copy small fixture files into containers through the library when practical. A test that reaches outside its declared stack should name that dependency explicitly.

Run the topology on at least one clean CI worker where no developer services are available. This exposes accidental connections to a local database or message broker. Add a negative control by choosing credentials and database names unique to the test, then confirm logs show those values in sanitized form. If the suite still passes while a declared dependency is deliberately unavailable, it may not be exercising the intended container at all.

Remote Docker can change the host returned for published ports, but it does not change the internal alias contract between containers on the same network. That is why separating the two address builders pays off. When CI uses Docker-in-Docker or another supported environment, retain the same test-level topology and let Testcontainers discover the runtime. Put environment-specific Docker connectivity in infrastructure configuration, not scattered through application URLs.

## Frequently Asked Questions

### Can two Testcontainers networks use the same alias at the same time?

Yes. An alias is scoped to its network, so independent test networks can each contain a service named \`orders-db\`. This is one reason aliases support parallel testing better than fixed Docker container names. Collisions can still occur if containers share one network, or if tests reuse globally named external resources. Create a network per isolated stack or per worker, and keep mutable database state separate even when DNS names are safely duplicated.

### Should a container use getMappedPort to reach another container?

Normally no. A container on the same custom network should use the target's network alias and original internal service port, such as \`orders-db:5432\`. \`getMappedPort\` returns the host-side port allocated for callers outside that container network. Use it with \`getHost\` in the test process. Sending a peer container through the host mapping adds the wrong network perspective and often fails in remote Docker or CI environments.

### Why does the alias resolve before the service accepts requests?

Docker network DNS registration and application readiness are separate events. The hostname can resolve as soon as network metadata exists, while the process is still starting, loading configuration, applying migrations, or binding its socket. Add a Testcontainers wait strategy that reflects the dependency's useful state, such as a meaningful HTTP health response or module-provided database readiness. Applications should also tolerate short dependency startup variation when that matches real deployment behavior.

### Do network aliases work for a service running directly on the host?

No. Aliases identify containers attached to a shared container network. To let a container call a server running in the host test process, use Testcontainers' host-port exposure mechanism and the documented \`host.testcontainers.internal\` hostname. Start the host server first, expose its listening port before starting the client container, and keep that URL distinct from alias-based container addresses. The reverse direction, host to container, uses the container's \`getHost\` and \`getMappedPort\` values.
`,
};
