import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'NBomber: Load Testing in .NET and C#',
  description: 'Use nbomber to build realistic C# load tests, model traffic, set thresholds, publish reports, and catch performance regressions in CI pipelines.',
  date: '2026-09-28',
  category: 'Performance',
  content: `
# NBomber: Load Testing in .NET and C#

NBomber is a .NET load-testing framework for writing performance tests as C# or F# code instead of a separate DSL. For QA engineers in a .NET shop, the direct path is to create a small console project, add \`NBomber\`, model user behavior with \`Scenario.Create\`, wrap important operations in \`Step.Run\`, choose a load simulation such as \`Inject\` or \`KeepConstant\`, and fail the run with thresholds that reflect service-level expectations.

The project is active. The current verified stable release is NBomber 6.6.0, published in August 2026, with 6.7.0 beta packages visible but not the stable baseline for production test suites. The 6.6.0 release focused on stats and reporting: revised scenario-level statistics, data transfer throughput, a richer HTML report, consistent console, TXT, and Markdown reports, easier cluster troubleshooting, and improved log file naming.

There is one product-status caveat to state early: NBomber and NBomber Studio are free only for personal use according to the official license page. Organizational use requires a Business license, and Enterprise unlocks cluster mode plus NBomber Studio Kubernetes integration and load test schedules. If your company plans to run NBomber in CI or as part of release gates, clear the license path before the tests become critical. For broader performance-tool selection, compare this with [k6 load testing workflows](/blog/k6-load-testing-guide-2026), and for unit-test runner integration see [.NET xUnit and NUnit testing patterns](/blog/dotnet-testing-xunit-nunit-guide).

## What NBomber Gives a QA Automation Team

NBomber sits close to the codebase. That is its main advantage. You can reuse typed clients, authentication helpers, JSON models, generated SDKs, local fixtures, and normal C# control flow. You can also debug the test in an IDE, which is useful when a performance script fails because the login step changed or a token refresh path is broken.

The core abstractions are intentionally small:

| NBomber concept | C# API | What QA should model |
|---|---|---|
| Scenario | \`Scenario.Create("name", async context => ...)\` | A complete virtual-user workflow |
| Step | \`Step.Run("step_name", context, async () => ...)\` | A measured operation inside the workflow |
| Response | \`Response.Ok()\`, \`Response.Fail()\`, HTTP plugin responses | Whether the iteration succeeded and what payload or status was measured |
| Simulation | \`Simulation.Inject\`, \`Simulation.RampingInject\`, \`Simulation.KeepConstant\` | Arrival rate or concurrent-user shape |
| Runner | \`NBomberRunner.RegisterScenarios(...).Run(args)\` | Session configuration, reports, thresholds, CLI overrides |

NBomber is protocol-neutral. The official overview lists HTTP, WebSockets, AMQP, GraphQL, gRPC, SQL databases, MongoDB, Redis, and other systems as possible targets because the scenario body is just code. For HTTP, the separate \`NBomber.Http\` plugin wraps native \`HttpClient\` and adds helpers for request creation, JSON bodies, typed responses, data transfer tracking, status codes, and tracing.

## Start with a Load-Test Project, Not a Unit-Test Project

You can call NBomber from xUnit or NUnit for small performance smoke checks, but a dedicated console app is usually cleaner for real load. It accepts NBomber CLI arguments, writes reports, and can be run the same way locally, in a container, and in CI.

\`\`\`xml
<!-- LoadTests/LoadTests.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <ServerGarbageCollection>true</ServerGarbageCollection>
    <ConcurrentGarbageCollection>true</ConcurrentGarbageCollection>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="NBomber" Version="6.6.0" />
    <PackageReference Include="NBomber.Http" Version="6.2.1" />
  </ItemGroup>
</Project>
\`\`\`

The official system requirements page recommends .NET 10 for best performance and notes that NBomber targets .NET Standard 2.1, so it can run on older .NET Core lines. For new work in 2026, use the current .NET runtime in CI unless your organization has a platform constraint. The server and concurrent GC settings are also recommended by NBomber docs for accurate latency measurement under load.

Use package versions deliberately. \`NBomber\` 6.6.0 is the current stable core package. \`NBomber.Http\` is versioned separately, and NuGet shows 6.2.1 as the current package for the HTTP plugin. Do not assume all NBomber ecosystem packages share the same version number.

## A Runnable HTTP Scenario in C#

This example models a simple product lookup flow. It creates one \`HttpClient\`, measures a named HTTP step, validates the status code and body, and returns a failed response when the service returns unexpected data. The sample targets a base URL from an environment variable so the same binary can run against local, staging, or a dedicated performance environment.

\`\`\`csharp
// LoadTests/Program.cs
using System.Net;
using NBomber.Contracts;
using NBomber.CSharp;
using NBomber.Http;
using NBomber.Http.CSharp;

var baseUrl = Environment.GetEnvironmentVariable("SHOP_API_BASE_URL")
    ?? "https://api.example.test";

using var httpClient = Http.CreateDefaultClient();
httpClient.BaseAddress = new Uri(baseUrl);
httpClient.Timeout = TimeSpan.FromSeconds(30);

var browseCatalog = Scenario.Create("browse_catalog", async context =>
{
    var productId = "sku-1001";

    var productResponse = await Step.Run("get_product", context, async () =>
    {
        using var request = Http.CreateRequest("GET", $"/v1/products/{productId}")
            .WithHeader("Accept", "application/json");

        var response = await Http.Send(httpClient, request);

        if (response.StatusCode != HttpStatusCode.OK)
        {
            return Response.Fail(
                statusCode: response.StatusCode.ToString(),
                message: "Product endpoint returned a non-200 response"
            );
        }

        var body = await response.Payload.Value.Content.ReadAsStringAsync();
        if (!body.Contains("\\"sku-1001\\"", StringComparison.Ordinal))
        {
            return Response.Fail(
                statusCode: "invalid_body",
                message: "Product response did not contain the requested SKU"
            );
        }

        return response;
    });

    return productResponse.IsError ? Response.Fail() : Response.Ok();
})
.WithoutWarmUp()
.WithLoadSimulations(
    Simulation.Inject(
        rate: 20,
        interval: TimeSpan.FromSeconds(1),
        during: TimeSpan.FromMinutes(2)
    )
);

NBomberRunner
    .RegisterScenarios(browseCatalog)
    .WithTestSuite("shop-api")
    .WithTestName("catalog-baseline")
    .WithReportFolder("reports")
    .WithReportFileName("catalog-baseline")
    .WithReportFormats(ReportFormat.Html, ReportFormat.Md, ReportFormat.Txt, ReportFormat.Csv)
    .Run(args);
\`\`\`

This code is intentionally explicit about validation. Load tests should not treat every transport-level 200 as success. If the service starts returning an HTML error page with status 200, or a fallback body that omits the requested product, the load generator must count that as a failed iteration. Otherwise, you end up with beautiful latency numbers for broken behavior.

Run it locally like this:

\`\`\`bash
dotnet restore LoadTests/LoadTests.csproj
SHOP_API_BASE_URL=https://staging.example.com dotnet run --project LoadTests -- \\
  --test-suite=shop-api \\
  --test-name=catalog-baseline
\`\`\`

NBomber's CLI supports \`--config\`, \`--infra\`, \`--license\`, \`--session-id\`, \`--test-name\`, \`--test-suite\`, \`--target\`, and cluster-related options. Pass \`args\` to \`Run(args)\` or those flags will not apply.

## Pick Open or Closed Load Before Choosing Numbers

The decision that most affects your result is not whether the target rate is 20 or 200. It is whether you are modeling arrivals or concurrency. NBomber docs divide load simulations into open models and closed models.

| Simulation | Model | Meaning | Use when |
|---|---|---|---|
| \`Simulation.Inject\` | Open | Start a fixed number of scenario instances per interval | You know request arrival rate, such as 50 orders per second |
| \`Simulation.RampingInject\` | Open | Gradually raise or lower arrivals per interval | You want a controlled ramp to find a breaking point |
| \`Simulation.InjectRandom\` | Open | Vary arrivals between min and max | You want jitter closer to production bursts |
| \`Simulation.KeepConstant\` | Closed | Keep a fixed number of active scenario copies | You know concurrent users or connections |
| \`Simulation.RampingConstant\` | Closed | Gradually raise or lower active scenario copies | You want a ramp by concurrency |
| \`Simulation.IterationsForInject\` | Open, fixed count | Inject at a rate until a total iteration count completes | You want repeatable quick checks in development |

Open-model tests are excellent for backend API throughput because the incoming request rate is independent of how slow the system becomes. If the service gets slower, \`Inject\` keeps sending the scheduled arrivals, which exposes queueing and saturation. Closed-model tests are useful for browser-like or connection-oriented flows where each virtual user waits for its previous action before continuing.

What people get wrong: they describe \`KeepConstant(copies: 100)\` as "100 requests per second." It is not. It means 100 active scenario instances looping as fast as their workflow allows. If each iteration takes 200 ms, that can produce far more than 100 requests per second. If each iteration takes 5 seconds, it produces far less. Use \`Inject(rate: 100, interval: TimeSpan.FromSeconds(1), ...)\` when the requirement is 100 arrivals per second.

## Model a Workflow with Steps, Think Time, and Data

A realistic load test usually needs multiple measured operations: login or token creation, a read path, a write path, and maybe a polling step. In NBomber, wrap each operation in \`Step.Run\` so the report shows which part degraded.

\`\`\`csharp
using System.Net;
using System.Text.Json;
using NBomber.Contracts;
using NBomber.CSharp;
using NBomber.Http;
using NBomber.Http.CSharp;

var baseUrl = Environment.GetEnvironmentVariable("SHOP_API_BASE_URL")
    ?? "https://api.example.test";

using var httpClient = Http.CreateDefaultClient(maxConnectionsPerServer: 2_000);
httpClient.BaseAddress = new Uri(baseUrl);

var checkout = Scenario.Create("guest_checkout", async context =>
{
    var productId = $"sku-{context.InvocationNumber % 20 + 1000}";

    var product = await Step.Run("product_details", context, async () =>
    {
        using var request = Http.CreateRequest("GET", $"/v1/products/{productId}");
        var response = await Http.Send(httpClient, request);

        return response.StatusCode == HttpStatusCode.OK
            ? response
            : Response.Fail(statusCode: response.StatusCode.ToString());
    });

    if (product.IsError)
        return Response.Fail(message: "Cannot continue checkout without product details");

    await Task.Delay(TimeSpan.FromMilliseconds(250), context.CancellationToken);

    var cart = await Step.Run("create_cart", context, async () =>
    {
        var payload = new { productId, quantity = 1 };
        using var request = Http.CreateRequest("POST", "/v1/carts")
            .WithJsonBody(payload);

        var response = await Http.Send(httpClient, request);

        return response.StatusCode == HttpStatusCode.Created
            ? response
            : Response.Fail(statusCode: response.StatusCode.ToString());
    });

    if (cart.IsError)
        return Response.Fail(message: "Cart creation failed");

    return Response.Ok();
})
.WithLoadSimulations(
    Simulation.RampingInject(
        rate: 60,
        interval: TimeSpan.FromSeconds(1),
        during: TimeSpan.FromMinutes(3)
    ),
    Simulation.Inject(
        rate: 60,
        interval: TimeSpan.FromSeconds(1),
        during: TimeSpan.FromMinutes(5)
    ),
    Simulation.RampingInject(
        rate: 0,
        interval: TimeSpan.FromSeconds(1),
        during: TimeSpan.FromMinutes(2)
    )
);

NBomberRunner
    .RegisterScenarios(checkout)
    .Run(args);
\`\`\`

The tiny delay is illustrative think time. In a real test, derive think time from production telemetry, UX research, or a product decision. Mark illustrative numbers as illustrative in test comments or config. Do not let a random number become a service-level promise.

## Thresholds That Fail for the Right Reasons

NBomber thresholds can run during the test and fail the session when the real-time stats violate a rule. The official docs show thresholds against failure percentage, status code percentages, and latency percentiles. Use them to encode the release question.

\`\`\`csharp
using NBomber.CSharp;

var scenario = Scenario.Create("search_api", async context =>
{
    await Step.Run("search", context, async () =>
    {
        await Task.Delay(40, context.CancellationToken);
        return Response.Ok();
    });

    return Response.Ok();
})
.WithoutWarmUp()
.WithLoadSimulations(
    Simulation.Inject(
        rate: 25,
        interval: TimeSpan.FromSeconds(1),
        during: TimeSpan.FromMinutes(1)
    )
)
.WithThresholds(
    Threshold.Create(stats => stats.Fail.Request.Percent < 1),
    Threshold.Create(stats => stats.Ok.Latency.Percent95 < 350),
    Threshold.Create("search", stats => stats.Fail.Request.Percent < 1)
);

NBomberRunner.RegisterScenarios(scenario).Run(args);
\`\`\`

The last threshold targets the step named \`search\`, which is why the scenario wraps its work in \`Step.Run("search", ...)\`. Keep threshold names aligned with actual step names. A missing step-level threshold is worse than no threshold because reviewers may think the release gate covers an endpoint that is not measured.

Use threshold classes by purpose:

| Threshold type | Example question | Metric style |
|---|---|---|
| Error budget | Did failures stay below 1 percent? | \`stats.Fail.Request.Percent < 1\` |
| Tail latency | Did p95 stay under the agreed bound? | \`stats.Ok.Latency.Percent95 < 350\` |
| Status mix | Did 503s stay below the incident threshold? | \`stats.Fail.StatusCodes.Get("503").Percent < 0.5\` |
| Payload guard | Did the response size explode? | Data transfer or bytes metrics |
| Step-specific health | Did checkout fail even when browsing passed? | \`Threshold.Create("create_cart", ...)\` |

For QA automation, thresholds are not a substitute for analysis. They are a release gate. The HTML and Markdown reports still need review when a change approaches the limit.

## JSON Config for Environment-Specific Runs

NBomber supports JSON config loaded with \`LoadConfig("config.json")\` or via \`--config=config.json\`. The docs state that JSON config has higher priority than code configuration for overlapping settings. That is useful when the same compiled load test needs small local settings, a staging baseline, and a pre-release stress profile.

\`\`\`json
{
  "TestSuite": "shop-api",
  "TestName": "catalog-staging",
  "ScenarioCompletionTimeout": "00:02:00",
  "GlobalSettings": {
    "ScenariosSettings": [
      {
        "ScenarioName": "browse_catalog",
        "WarmUpDuration": "00:00:20",
        "LoadSimulationsSettings": [
          { "RampingInject": [40, "00:00:01", "00:02:00"] },
          { "Inject": [40, "00:00:01", "00:05:00"] },
          { "RampingInject": [0, "00:00:01", "00:01:00"] }
        ]
      }
    ]
  }
}
\`\`\`

\`\`\`csharp
using NBomber.CSharp;

var scenario = Scenario.Create("browse_catalog", async context =>
{
    await Task.Delay(50, context.CancellationToken);
    return Response.Ok();
});

NBomberRunner
    .RegisterScenarios(scenario)
    .LoadConfig("nbomber.staging.json")
    .Run(args);
\`\`\`

Put environment-specific rates in JSON and behavior in C#. That separation helps code reviewers focus on whether the workflow is correct while QA leads tune the workload without recompiling.

## Reports, Artifacts, and CI

\`NBomberRunner\` can set report formats, folder, file name, reporting interval, and report finalizers. For CI, generate at least HTML for humans and Markdown or TXT for quick log review. CSV is useful when you archive trend data elsewhere.

\`\`\`yaml
name: load smoke

on:
  workflow_dispatch:
  pull_request:
    paths:
      - "src/Shop.Api/**"
      - "LoadTests/**"

jobs:
  nbomber:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-dotnet@v6
        with:
          dotnet-version: "10.0.x"
      - name: Restore
        run: dotnet restore LoadTests/LoadTests.csproj
      - name: Run NBomber smoke profile
        env:
          SHOP_API_BASE_URL: \${{ secrets.SHOP_API_BASE_URL }}
          NBOMBER_LICENSE: \${{ secrets.NBOMBER_LICENSE }}
        run: |
          dotnet run --project LoadTests -- \\
            --config=LoadTests/nbomber.smoke.json \\
            --license=\${NBOMBER_LICENSE} \\
            --session-id=pr-\${{ github.run_id }}
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: nbomber-reports-\${{ github.run_id }}
          path: reports
\`\`\`

Keep pull request profiles short and targeted. A five-minute smoke load can catch accidental database scans, missing indexes, broken caching, or synchronous bottlenecks without turning every PR into a performance lab. Longer stress, soak, and capacity tests belong in scheduled workflows or release candidates.

## Failure Mode: The Load Generator Is the Bottleneck

A realistic failure: the API team sees p95 latency rise from 180 ms to 900 ms during a test and blames the service. The NBomber node CPU is at 100 percent, garbage collection pauses spike, and socket queues grow on the client. The report is telling you the load generator is unhealthy, not necessarily the service.

Diagnose it in this order:

| Check | Signal | Action |
|---|---|---|
| NBomber host CPU | Sustained saturation | Lower rate, use a larger runner, or split load |
| Free memory | Less than 10 to 20 percent headroom | Reduce payload retention or increase runner memory |
| Connection pool | Timeouts before server receives traffic | Raise or tune \`maxConnectionsPerServer\`, reuse clients |
| Service metrics | Server CPU low while client errors rise | Investigate generator, DNS, TLS, or network path |
| Step distribution | One client-side preparation step dominates | Move expensive fixture creation outside hot path |

The official requirements page also warns that if the NBomber node maxes out CPU or memory, your latency and throughput reflect the client limits. Always collect generator telemetry alongside server telemetry. If you cannot prove the generator was healthy, do not use the result as a release decision.

## Cluster Mode and Licensing Boundaries

NBomber Cluster lets multiple NBomber processes coordinate through NATS, aggregate metrics, evaluate thresholds on the coordinator, and produce merged reports. Use it when one node cannot generate enough load, when you need traffic from multiple regions, or when scenario placement matters. Official docs describe a Coordinator role and Agent roles, discovered by \`ClusterId\`, with NATS as the message broker.

Cluster mode has licensing implications. The docs say Enterprise is required for clustered setup, while Local Dev Cluster lets you experiment without a license key. The Kubernetes deployment docs describe Local Dev Cluster as limited to three pods, one Coordinator and two Agents, with each test run stopping after one minute. That is enough to validate wiring, not to run an enterprise capacity test.

\`\`\`bash
dotnet LoadTests.dll \\
  --config=cluster-config.json \\
  --cluster-id=shop-release-2026-09 \\
  --cluster-nats-url=nats://nats.internal:4222 \\
  --cluster-node-type=coordinator \\
  --cluster-coordinator-target=[]
\`\`\`

The \`[]\` target token is documented for keeping a role idle. A common production pattern is to keep the Coordinator orchestrating and evaluating thresholds while Agents generate the load. That makes coordinator metrics cleaner and reduces the risk that orchestration competes with traffic generation.

## Comparing NBomber with Script-First Tools

NBomber is not always the easiest tool for every team. It shines when your performance tests need C# code, typed clients, custom protocol work, or deep integration with .NET applications. A JavaScript-centric team may prefer k6. A browser-heavy team may need Playwright plus separate backend load tooling. A protocol-recording team may prefer JMeter or Gatling depending on existing assets.

| Situation | NBomber fit | Reason |
|---|---|---|
| .NET service with typed SDKs | Strong | Reuse application models and auth helpers |
| Custom binary or message protocol | Strong | Scenario body can run arbitrary C# |
| Simple public HTTP smoke from many regions | Medium | Works, but cloud-native SaaS tools may be faster to operate |
| Non-developers authoring tests | Weak to medium | C# is powerful but not spreadsheet-simple |
| Enterprise distributed load | Strong with Enterprise license | Cluster mode, placement, and consolidated reports |
| One-off manual endpoint benchmark | Medium | Setup is quick, but command-line tools may be quicker |

For AI coding agents, NBomber has a nice property: the agent can read and modify normal C# tests, run a narrow profile, and inspect typed compiler errors. The danger is that an agent can also invent unrealistic workloads quickly. Require every generated scenario to state its workload source: production telemetry, product target, incident replay, or illustrative local smoke.

## Operational Rules That Keep Results Trustworthy

Treat load tests as measurements, not decoration. Before a test becomes a gate, document the target environment, data state, build version, runner size, expected rate, warm-up duration, threshold rationale, and known external dependencies. A test that silently runs against a smaller database, a warm cache, or a shared staging box will teach the wrong lesson.

Use these rules for maintainable suites:

| Rule | Why it matters |
|---|---|
| Reuse \`HttpClient\` across iterations | Prevents socket churn and client-side distortion |
| Keep data setup outside the measured hot path when possible | Measures the service workflow, not fixture creation |
| Fail on wrong body, not only wrong status | Catches fallback pages, partial responses, and corrupt JSON |
| Name steps after business operations | Makes reports readable to QA, SRE, and product owners |
| Archive reports for every gated run | Allows trend comparison and post-incident review |
| Separate smoke, stress, and soak profiles | Prevents PR checks from pretending to be capacity tests |

The most valuable NBomber suite usually starts small: one smoke profile for regression detection, one stress profile for release candidates, and one investigation profile for known risky endpoints. Grow from questions the team actually asks, not from a desire to simulate the whole company in one test.

## Frequently Asked Questions

### Is NBomber free for company CI pipelines?

No, not under the current official license wording. NBomber and NBomber Studio are free only for personal use. Organizational use requires a commercial subscription, with Business covering organizational use and Enterprise adding cluster mode and specific Studio capabilities. Before adding NBomber to a company CI gate, confirm licensing with your procurement or engineering leadership. Personal experiments, tutorials, and hobby projects are treated differently from use by or for an organization.

### Should NBomber tests run on every pull request?

Run only short smoke profiles on pull requests. They should catch obvious regressions such as accidental slow queries, broken caching, or response validation failures. Capacity, stress, and soak tests need controlled environments, stable data, and enough time to produce meaningful results, so they fit scheduled runs or release-candidate workflows better. Archive the report artifact even for smoke tests, because trend history helps distinguish noise from an emerging regression.

### When should I use Inject instead of KeepConstant?

Use \`Inject\` when the requirement is arrivals per interval, such as 100 requests per second or 30 checkout starts per second. Use \`KeepConstant\` when the requirement is active concurrency, such as 500 connected clients or 50 users looping through a workflow. The distinction matters because slower responses reduce throughput in a closed model, while an open model keeps arrivals coming and exposes queueing under stress.

### Does NBomber replace unit tests or integration tests?

No. NBomber answers performance and reliability questions under load. Unit tests still protect local logic, and integration tests still verify service behavior at ordinary scale. A good NBomber scenario may reuse integration-test clients, but its assertions and thresholds target a different risk: what happens when many calls arrive over time. Keep functional correctness tests fast and exhaustive, then let NBomber cover the smaller set of workflows whose latency and failure rate matter.
`,
};
