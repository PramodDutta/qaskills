import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium BiDi event ordering tests',
  description:
    'Selenium BiDi event ordering tests: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'E2E Testing',
  primaryKeyword: 'Selenium BiDi event ordering tests',
  keywords: [
    'Selenium BiDi event ordering tests',
    'Selenium BiDi event order',
    'WebDriver BiDi network events',
    'BiDi callback race testing',
    'Selenium log event sequence',
    'BiDi subscription timing',
  ],
  relatedSlugs: [
    'selenium-grid-3-to-4-migration-guide',
    'selenium-bidirectional-bidi-protocol-guide',
    'selenium-webdriver-bidi-2026-official-reference',
    'selenium-4-relative-locators-guide-2026',
  ],
  sources: [
    'https://www.selenium.dev/documentation/webdriver/waits/',
    'https://www.selenium.dev/documentation/grid/architecture/',
    'https://www.selenium.dev/documentation/webdriver/bidi/',
    'https://www.w3.org/TR/webdriver2/',
  ],
  repoEvidence: [
    'seed-skills/selenium-java/SKILL.md',
    'seed-skills/selenium-grid-parallel/SKILL.md',
  ],
  content: `Selenium BiDi event ordering tests verify wire links without trusting callback receipt as one global sequence. A controlled page issues one request, one redirect, and named log messages after hooks are active. The rule joins request IDs, event types, wire times, session IDs, and final DOM state, then checks only the order the tested flow requires.

## What does Selenium BiDi event ordering tests verify?

Selenium BiDi event ordering tests verify that hooks exist before a triggering action and that related events satisfy clear wire and app edges. They join each request, redirect, and log entry by stable ID and wire time, while treating callback receipt order as diagnostic evidence rather than an automatic total-order contract.

The [Selenium BiDi documentation](https://www.selenium.dev/documentation/webdriver/bidi/) groups bidirectional features into logging, network, and script areas. It also notes that BiDi must be enabled through browser options, which makes agreed feature data part of fixture setup.

An event stream contains several notions of order. The remote end emits wire events, a transport carries them, a client library dispatches callbacks, worker threads append records, and the app reaches a visible final state.

Those stages can agree for a small local run and diverge under paired load. A test should therefore state whether it needs wire sequence, causality for one request, callback sequence, or only end before a DOM marker.

The repo file \`seed-skills/selenium-java/SKILL.md\` provides Java driver setup, clear waits, page objects, isolated test lifecycle, screenshots, and TestNG patterns. Its ThreadLocal driver factory closes and removes each driver after a test.

The repo file \`seed-skills/selenium-grid-parallel/SKILL.md\` stresses focused checks, independent state, awaited steps, cleanup, and actionable CI reports. It supports per-session event hook ownership, though it does not define the exact BiDi event graph used here.

This distinction prevents fabrication. Repo practices establish driver and session hygiene, while Selenium's current docs supplies the BiDi feature boundary and the article recommends the join matrix.

A strong pass proves that the event hook receipt precedes the page action, each target request has an ID, required request and response phases obey their edge, and the final page marker appears. It does not demand that other log and background network callbacks share one fixed position.

Use the [Selenium BiDi protocol guide](/blog/selenium-bidirectional-bidi-protocol-guide) for broader feature setup. Keep this [browser regression](/blog/selenium-testing-ai-agents-guide) focused on the smallest event graph that can expose a late event hook, missing join, or leaked event hook.

## How do you build an Selenium BiDi event order?

A Selenium BiDi event order fixture needs a fixed page served by a local test app. The page should emit \`fixture:start\`, request one named URL, follow one controlled redirect, emit \`fixture:response\`, and set \`data-fixture-state="complete"\`.

The server assigns a case ID and returns it in each fixture response. Request paths should include that ID, allowing collectors to discard browser startup traffic, favicon requests, extensions, and other health probes.

Enable the WebSocket feature before driver creation and record the agreed features. If the browser or driver does not provide the expected BiDi channel, fail setup instead of running a partial event test.

Create the event hook objects before page load or button activation. Wait for the event hook step to complete, record its receipt time, then execute exactly one trigger on the test thread.

Use a thread-safe event buffer because callbacks may run outside the test thread. Each entry should contain local sequence, local monotonic time, session ID, context ID, event type, request ID, URL, wire time, and a short test message.

Do not append entire payloads by default. Headers, request bodies, and logs can contain secrets, while this fixture needs only case ID, path, event kind, status, redirect ID, and selected times.

The first positive check checks a pre-action event hook marker. Next it finds one target request ID, verifies the required phases for that ID, and finally waits for the page's clear end attribute.

The [Selenium waiting guide](https://www.selenium.dev/documentation/webdriver/waits/) explains that browser automation commonly races when app state and commands progress at other speeds. An clear fixture marker removes arbitrary sleeps without pretending that DOM end defines wire callback order.

The [official Selenium BiDi reference article](/blog/selenium-webdriver-bidi-2026-official-reference) can help pin the library surface used by the repo. BiDi APIs still vary by Selenium version and language, so keep the shim close to the test and compare it with the [CDP protocol guide](/blog/selenium-cdp-chrome-devtools-protocol-guide).

This Java baseline follows the driver lifecycle in \`seed-skills/selenium-java/SKILL.md\`. It uses Selenium's Java network tool shape and stores a narrow record before the page action; teams should adapt accessor names only to their pinned Selenium release.

\`\`\`java
FirefoxOptions options = new FirefoxOptions();
options.setCapability("webSocketUrl", true);

try (WebDriver driver = new FirefoxDriver(options);
     Network network = new Network(driver)) {
  CopyOnWriteArrayList<EventRecord> events = new CopyOnWriteArrayList<>();
  String intercept = network.addIntercept(
      new AddInterceptParameters(InterceptPhase.BEFORE_REQUEST_SENT));

  network.onBeforeRequestSent(details -> {
    String url = details.getRequest().getUrl();
    if (url.contains("/fixture/request?case=order-17")) {
      events.add(EventRecord.before(
          details.getRequest().getRequestId(), url, System.nanoTime()));
    }
  });

  long actionAt = System.nanoTime();
  driver.get("https://fixture.test/order?case=order-17");
  new WebDriverWait(driver, Duration.ofSeconds(5)).until(
      d -> "complete".equals(
          d.findElement(By.id("result")).getAttribute("data-fixture-state")));

  assertThat(events).allMatch(event -> event.localNanos() >= actionAt);
  network.removeIntercept(intercept);
}
\`\`\`

An intercept may require an clear continue action in some API versions and phases. The fixture shim must follow the pinned tool's contract, close the network object, and include a test proving that event hook removal leaves no event after cleanup.

## What breaks WebDriver BiDi network events?

WebDriver BiDi network events appear broken when the suite subscribes after page load begins. The missing first event is then a test setup race, not proof that the browser violated an event edge.

Callback races causes a other failure. Two callbacks can finish in an order that differs from their wire times because one handler performs more parsing, logging, or synchronization work.

Other background traffic can also reorder a naive list. Browser services, page assets, preloads, and Grid health activity may interleave with the target request unless the filter uses context, URL, and case ID.

Missing request join turns phases into guesses. Matching by URL alone fails when a redirect repeats a URL, retries occur, two sessions load the same page, or the app intentionally makes paired calls.

Cleanup leakage creates convincing false positives. A event hook retained from the prior test can append the same event twice, while a shared static buffer can let session B satisfy session A's wait.

An overstrict total order is another test defect. The suite may require one log callback before an other response callback even though the flow under test only requires both before final end.

The classic [WebDriver specification](https://www.w3.org/TR/webdriver2/) defines remote commands, sessions, page load, and elements, but it is not the source for each BiDi event relation. Use it for final WebDriver state and session context, then use the pinned BiDi build for event fields.

Grid adds routing and session ownership. The [Grid architecture documentation](https://www.selenium.dev/documentation/grid/architecture/) describes components such as Router, Distributor, Node, Session Map, Session Queue, and Event Bus, which explains why per-session ID belongs in each paired artifact.

A timeout does not identify which cause occurred. The report should say whether event hook receipt was late, no matching request appeared, one phase was absent, join failed, final state was missing, or cleanup retained hooks.

The [Selenium Grid migration guide](/blog/selenium-grid-3-to-4-migration-guide) covers infrastructure changes beyond this event test. First reproduce the same case on one local session, then compare remote session, node, and transport metadata.

## BiDi callback race testing fixtures and controls

BiDi callback race testing needs a good case that subscribes before action and a bad case that on purpose subscribes after the first request. The bad case must miss or flag the early phase, proving the setup guard can detect its target defect.

A boundary case emits two other requests at nearly the same time. The test should accept either cross-request callback order while preserving the required phase order inside each request ID.

A log boundary emits one log message before the request and another after the response reaches app code. Join their test text and page case ID, but do not infer network wire order from Java callback insertion alone.

A redirect case creates one initial request and one redirected request. Preserve the redirect link supplied by the wire or fixture, because joining only by final URL collapses two causal nodes.

A repeated-run case executes the page ten times with new case IDs and new event buffers. Each run should have the same required graph even when local callback sequence numbers differ around other events.

A cleanup case removes hooks, closes tool resources, quits the driver, and clears the case buffer. Triggering a final fixture action before driver shutdown should produce no record after event hook removal.

For two paired sessions, allocate one collector per driver. Add session ID and browsing context to each entry, then assert that neither buffer contains the other session's case ID.

Inject a slow callback that waits briefly before appending. Wire-time and request-ID checks should still pass, while an check based only on append order should fail and expose the weak rule.

Inject one background request with the same path but another case ID. A URL-only filter should fail the count check, proving why clear fixture join is required.

The [E2E testing category](/categories/e2e-testing) contains related browser checks. This fixture should stay small enough that each event and edge can be reviewed without reading a production trace.

## How should Selenium log event sequence be asserted?

A Selenium log event sequence should be asserted as a directed set of required links. For example, event hook precedes action, action precedes the target request, the target response precedes the app's response message, and both precede the final page marker.

Start by selecting records for one session, context, and case ID. Then group network records by request ID and log records by their exact test message.

Require unique nodes where the fixture promises uniqueness. Two \`fixture:start\` messages or two initial request IDs indicate double hooks, a repeated action, or a server retry that needs clear handling.

Use wire times to compare events within the same documented clock domain. Never compare them directly with Java \`System.nanoTime\`, which has a other origin and should only order local shim actions.

Use local sequence numbers to explain callback dispatch, not to override wire relations. If wire order passes but local callbacks invert, the report can expose handler scheduling without declaring the browser flow wrong.

Use final DOM state as a end condition and app result. It proves the page handled its response but does not repair a missing event that should have been captured earlier.

Exact equality works for event counts and named messages in this controlled fixture. Partial order works for causal edges, while bounded waits apply only to receiving all required nodes and final state.

Support checks should name Selenium version, browser build, driver build, and agreed features. If a backed pair omits a field, mark that pair clearly instead of accepting missing ID for each run.

The [Selenium relative locators guide](/blog/selenium-4-relative-locators-guide-2026) covers element selection after page load. This test should use stable IDs for its trigger and result so locator flow does not become another event variable.

The following Java helper turns a joined event list into a partial-order check. It is independent of callback insertion timing because each required node supplies the wire order value normalized by the shim.

\`\`\`java
static void assertRequiredOrder(List<EventRecord> records, String requestId) {
  Map<EventType, EventRecord> byType = records.stream()
      .filter(event -> requestId.equals(event.requestId()))
      .collect(Collectors.toMap(
          EventRecord::type,
          Function.ID(),
          (left, right) -> {
            throw new AssertionError("double " + left.type());
          }));

  EventRecord before = require(byType, EventType.BEFORE_REQUEST);
  EventRecord response = require(byType, EventType.RESPONSE_STARTED);
  EventRecord complete = require(byType, EventType.RESPONSE_COMPLETE);

  assertThat(before.protocolOrder()).isLessThan(response.protocolOrder());
  assertThat(response.protocolOrder()).isLessThanOrEqualTo(complete.protocolOrder());
  assertThat(records)
      .filteredOn(event -> event.caseId().equals("order-17"))
      .allMatch(event -> event.sessionId().equals(before.sessionId()));
}
\`\`\`

If the wire shim cannot provide a comparable time for two event types, assert a documented ID or phase relation instead. Do not synthesize precision by sorting callback receipt and labeling it wire order.

## BiDi subscription timing in CI

BiDi subscription timing in CI should have a setup phase that ends only after each required event hook succeeds. Save receipt data and start the page action afterward on the same test's controlled path.

Pin Selenium, browser, and driver versions for the pull-request lane. A planned support lane can cover additional combinations, but each expectation must name the feature and fields that pair supports.

Use a local fixed server or a hermetic test service. Third-party pages introduce ads, redirects, content changes, and traffic that can invalidate event counts without changing Selenium.

Run one session per worker first. When the local case passes repeatedly, add Grid and preserve session ID, node ID where available, context ID, and case ID in the artifact.

Do not use a static event list across tests. A collector should be created after driver setup, owned by one test, closed before driver quit, and made unreachable during teardown.

The wait condition should describe the graph: required request phases are present and the final marker is complete. Sleeping for a fixed duration can still finish before a slow callback or waste time after all evidence arrived.

Store only the target URL path, test messages, statuses, IDs, times, versions, and first failed edge. Redact query values if a real app case replaces the test fixture.

The CI summary should distinguish "late event hook" from "missing target event." The former compares receipt and action, while the latter reports a sound setup followed by an incomplete joined graph.

Use the [site FAQ](/faq) for repo and directory questions, not wire adjudication. Event expectations should cite the approved Selenium docs and the pinned shim flow in source control.

Selenium BiDi event ordering tests should run after a small feature probe and before broad E2E suites. That order avoids spending a full browser matrix on a node that cannot negotiate the required BiDi feature.

## Selenium BiDi event ordering tests comparison matrix

The Selenium BiDi event ordering tests matrix separates setup, join, log causality, and session isolation. Each row defines only the event edges required by its controlled action and avoids one universal callback sequence.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Subscribe before page action | All event hook acknowledgments complete first | Event hook marker precedes trigger and target events appear | Action time is earlier or target graph is empty | Selenium BiDi docs |
| Subscribe after request begins | Trigger first, attach target event hook second | Guard reports an invalid late-event hook case | Suite silently treats missing first phase as pass | Selenium waits and fixture evidence |
| Request and response for one ID | One named request with controlled response | Required phases share ID and satisfy partial order | URL-only join or absent phase | BiDi network feature boundary |
| Log message during page load | Exact test messages around response handling | Named messages and final state satisfy required edges | Callback list imposes other total order | BiDi logging feature boundary |
| Two paired sessions | One collector and case ID per driver | Each event remains in its owning session buffer | Double or foreign case crosses buffers | Grid session architecture |

The first row is the health check. If the agreed feature or event hook receipt is missing, stop before page load and classify the result as not backed or failed setup.

The second row is an intentional fault, not a production expectation. It proves that the suite rejects a missing early event caused by its own event hook timing.

The one-request row should be boring and exact. Background requests are filtered out, all expected phases share one ID, and double phases fail with a concise event dump.

The log row accepts other callback interleaving. Its required edges come from the fixture's script and final marker, while wire event order remains attached to network IDs.

The paired row should run only after repeated local success. A foreign session ID in either buffer proves shared state or event hook routing failure even if both pages reach the correct DOM state.

## How do you implement Selenium BiDi event ordering tests?

Implement Selenium BiDi event ordering tests by defining the event graph before writing waits. Name each required node, ID field, clock domain, causal edge, end condition, and cleanup action.

1. Read \`seed-skills/selenium-java/SKILL.md\` and \`seed-skills/selenium-grid-parallel/SKILL.md\`, then record driver lifecycle, clear wait, session isolation, report, and cleanup practices.
2. Build a fixed page that emits one request, one redirect, exact log messages, and a final DOM marker under a unique case ID.
3. Enable BiDi, complete hooks before the trigger, and capture event hook time, request IDs, event types, wire times, callback sequence, session, context, and final state.
4. Inject late event hook, a slow callback, background traffic, missing join, leaked cleanup, and an not backed total-order check one fault at a time.
5. Compare the joined graph with the five-row matrix and report the first missing node, double ID, foreign session, or failed edge.
6. Run the focused case in CI, retain a redacted failed graph, remove each event hook, close tool resources, quit drivers, and clear per-test buffers.

Write the expected graph as data, not nested sleeps. A small list of node names and required predecessor pairs is easier to review when a feature or browser version changes.

Create a feature probe that starts and closes one BiDi tool. It should report not backed combinations before the main fixture launches, preserving a other result from a flow failure.

Make event hook end visible through a future, returned handle, or synchronous API receipt. Never infer readiness from the time spent constructing a event hook object.

Trigger the fixture exactly once and save its case ID before page load. The target server should reject unknown IDs so a stray page cannot produce matching messages by accident.

Filter by session, context, case, and target path before checking counts. This order turns noisy browser traffic into excluded diagnostics instead of intermittent double failures.

Check request IDs and required phases next. If one phase is absent, stop there and retain the surrounding records rather than running many dependent checks.

Evaluate the partial order after completeness. A missing node is other from an inverted edge, and reporting both as one timeout slows investigation.

Check final page state last, then remove hooks and trigger a no-record cleanup probe where the API allows it. Close the tool and driver even when an earlier check fails.

Run the same case locally ten times before enabling Grid. Then use the [Grid migration guide](/blog/selenium-grid-3-to-4-migration-guide) to add remote metadata without changing the event graph.

Keep API calls behind a small versioned shim because Selenium BiDi bindings continue to develop. The test-facing record and partial-order rule can remain stable while tool names or event accessors change.

## Frequently Asked Questions

### How can Selenium BiDi tests assert network and log event order without relying on nondeterministic callback timing?

Join events by session, context, case ID, request ID, type, and wire time, then assert only required causal edges. Keep callback sequence as a diagnostic field. Wait for graph completeness and final page state, but do not sort other callbacks into a total order the wire or fixture never promised.

### What should an Selenium BiDi event order fixture record?

Record agreed features, Selenium and browser versions, event hook receipt, action time, session and context IDs, case ID, request ID, URL path, event type, wire time, local callback sequence, final state, and cleanup result. These fields expose late setup, missing phases, wrong joins, races, and event hook leakage.

### Which failure proves WebDriver BiDi network events is broken?

A persuasive failure shows sound pre-action event hook, one joined request ID, and a missing or inverted required phase under a pinned backed pair. First exclude wrong filters, late hooks, background traffic, callback exceptions, and leaked state. A timeout or changed callback receipt order alone does not establish a wire defect.

### How do teams isolate BiDi callback race testing?

Teams use a local page, exact case IDs, one collector per session, thread-safe records, and a on purpose slow callback. They compare wire relations with local append order and accept harmless cross-request interleaving. Repeated runs plus event hook-removal probes expose static buffers, double hooks, and callbacks surviving teardown.

### Which check is strongest for Selenium log event sequence?

The strongest check requires unique named messages, their owning session and context, and only the causal edges created by the fixture. Pair that graph with request IDs and final DOM state. A raw list equality check is weaker because other callbacks may interleave while each required app edge remains correct.

### How should CI report BiDi subscription timing failures?

CI should report feature support, event hook receipt, action time, first missing or double node, failed edge, session, context, case ID, Selenium and browser versions, and cleanup status. Attach a short redacted event window. Separate not backed setup, late event hook, incomplete join, app state, and leaked-event hook failures.

## Conclusion

Selenium BiDi event ordering tests are reliable when hooks complete before action and evidence is joined by wire ID rather than callback receipt. A partial-order graph catches missing phases, inverted edges, double hooks, and foreign sessions without rejecting harmless races.

Pin the client and browser, keep collectors per session, and preserve the first failed graph edge. Review the [Selenium Grid migration guide](/blog/selenium-grid-3-to-4-migration-guide), then open the [QA skills directory](/skills) and implement the Selenium BiDi event ordering tests matrix in the next test run.`,
};
