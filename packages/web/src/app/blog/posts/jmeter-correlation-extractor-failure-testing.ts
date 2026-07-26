import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'JMeter correlation extractor failure testing',
  description:
    'JMeter correlation extractor failure testing: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Performance Testing',
  primaryKeyword: 'JMeter correlation extractor failure testing',
  keywords: [
    'JMeter correlation extractor failure testing',
    'JMeter correlation extractor failure',
    'JSON Extractor default value',
    'stale variable JMeter test',
    'regex extractor missing match',
    'JMeter correlation assertion',
  ],
  relatedSlugs: [
    'jmeter-distributed-load-testing-complete-guide',
    'jmeter-response-assertion-jmx-guide',
    'jmeter-vs-k6-vs-gatling-2026',
    'jmeter-vs-locust-vs-gatling-comparison',
  ],
  sources: [
    'https://jmeter.apache.org/usermanual/component_reference.html',
    'https://jmeter.apache.org/usermanual/remote-test.html',
    'https://jmeter.apache.org/usermanual/best-practices.html',
  ],
  repoEvidence: [
    'seed-skills/jmeter-load/SKILL.md',
    'seed-skills/performance-test-scenario-generator/SKILL.md',
  ],
  content: `JMeter correlation extractor failure testing checks each new value before the next request can use it. The plan clears old state, gives a missed match a clear tag, checks that one safe value was found, and stops the loop on failure. A mock server proves no bad request was sent.

## What does JMeter correlation extractor failure testing verify?

- The observable contract is fail-fast correlation. A producer response supplies exactly one valid dynamic value, the extractor writes a fresh variable for the current iteration, an assertion validates it, and only then may a consumer request use that value.

- A missing path must produce an explicit sentinel rather than an empty string. The sentinel makes an extraction miss distinct from a legitimate blank value and from a variable that was never initialized.

- A stale value from the previous loop must never survive producer setup. Reset the target before the producer request, then require the extractor to replace it during the same iteration.

- An empty match must fail even if the extractor reports one result. Match count proves cardinality, while a trimmed-content check proves the selected value is usable.

- Multiple results must fail when the business flow expects one token. Random or first-match selection can hide an ambiguous response contract and send the wrong identity downstream.

- A failed producer or correlation assertion must prevent its dependent sampler from running. The evidence should show the producer label, extraction state, assertion message, loop action, and absence of the consumer request.

- The official [JMeter component reference](https://jmeter.apache.org/usermanual/component_reference.html) says the JSON Extractor is a post-processor under a sampler, supports JSON Path expressions, default values, and match-number behavior.

- The same reference documents a Result Status Action Handler that can continue, start the next loop, stop a thread, or stop a test after a sampler or assertion failure. The chosen action must match the load model.

- seed-skills/jmeter-load/SKILL.md recommends correlation, a visible NOT_FOUND default, response assertions, CLI execution, and dynamic values in later requests. These are repository facts that support the fixture.

- seed-skills/performance-test-scenario-generator/SKILL.md includes correlation helpers, content checks, threshold reports, and a single-VU debugging start. This article adds the specific stale-value and fail-fast oracle.

- The [JMeter distributed guide](/blog/jmeter-distributed-load-testing-complete-guide) covers controller and engine setup. This page owns extractor failure state, current-iteration identity, and proof that an invalid value never reached its consumer.

## How do you build a JMeter correlation extractor failure?

Build a local stub endpoint with named responses: one token, no token path, empty token, malformed JSON, two tokens, and one delayed response. Keep status code and headers controlled so each test changes only the response property under review.

Use one thread and two loop iterations for the first stale-value fixture. Iteration one returns a valid token. Iteration two omits the path. If the consumer sends the first token again, the plan has proved a stale-variable defect.

- Place a JSR223 PreProcessor on the producer sampler to reset the final variable and remove prior candidate variables. Place a JSON Extractor beneath that sampler, extract all candidates for cardinality evidence, and use a JSR223 Assertion to require one nonblank candidate.

Configure the thread group to start the next loop after a sample error for this user-flow fixture. That choice lets other virtual users or later iterations continue while preventing dependent samplers in the failed iteration. A stricter smoke gate may stop the test instead.

This JMX fragment adapts extractor and assertion patterns from seed-skills/jmeter-load/SKILL.md. The sentinel and count policy are recommendations for this controlled flow.

\`\`\`xml
<ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="Correlation user">
  <stringProp name="ThreadGroup.on_sample_error">startnextloop</stringProp>
  <elementProp name="ThreadGroup.main_controller"
    elementType="LoopController"
    guiclass="LoopControlPanel"
    testclass="LoopController"
    testname="Loop Controller">
    <stringProp name="LoopController.loops">2</stringProp>
  </elementProp>
</ThreadGroup>
<hashTree>
  <HTTPSamplerProxy guiclass="HttpTestSampleGui"
    testclass="HTTPSamplerProxy"
    testname="Producer GET token">
    <stringProp name="HTTPSampler.path">/fixture/token</stringProp>
    <stringProp name="HTTPSampler.method">GET</stringProp>
  </HTTPSamplerProxy>
  <hashTree>
    <JSR223PreProcessor guiclass="TestBeanGUI"
      testclass="JSR223PreProcessor"
      testname="Reset correlation state">
      <stringProp name="scriptLanguage">groovy</stringProp>
      <stringProp name="script"><![CDATA[
vars.put('auth_token', '__UNSET_CURRENT_ITERATION__')
vars.remove('auth_candidates_matchNr')
vars.remove('auth_candidates_1')
vars.remove('auth_candidates_2')
      ]]></stringProp>
    </JSR223PreProcessor>
    <hashTree/>
    <JSONPostProcessor guiclass="JSONPostProcessorGui"
      testclass="JSONPostProcessor"
      testname="Extract token candidates">
      <stringProp name="JSONPostProcessor.referenceNames">auth_candidates</stringProp>
      <stringProp name="JSONPostProcessor.jsonPathExprs">$.token</stringProp>
      <stringProp name="JSONPostProcessor.match_numbers">-1</stringProp>
      <stringProp name="JSONPostProcessor.defaultValues">__MISSING_TOKEN__</stringProp>
    </JSONPostProcessor>
    <hashTree/>
  </hashTree>
</hashTree>
\`\`\`

- The exact serialized element attributes can differ across JMeter releases, so create the elements in the pinned GUI once and review the saved JMX. The behavior contract is stable: clear prior state, extract candidates after the producer, and never trust an inherited variable.

Run the valid case before any fault. Assert one candidate, nonblank text, expected safe shape, a successful producer, and one captured consumer request containing the current token. That proves the stub, extractor scope, loop action, and request capture.

- The [JMeter response assertion guide](/blog/jmeter-response-assertion-jmx-guide) covers broader response checks. Keep this fixture focused on dynamic-value cardinality and freshness.

## What breaks JSON Extractor default value?

JSON Extractor default value handling breaks when the default is blank or looks like valid data. An empty default cannot distinguish no match from an empty server value, and a value such as zero may pass a loose request template. Use an impossible, named sentinel and assert against it.

- Stale variables appear when a prior iteration sets the final token and the next extraction does not replace it. Resetting before the producer makes freshness explicit. The assertion should also record the current loop and thread, without logging the secret token.

- Wrong extractor scope can read a sub-sample, redirect, transaction result, or another named variable instead of the intended producer response. Record the sampler label, response code, content type, and extractor placement. Use the Apply to setting deliberately.

Multiple matches create another hidden branch. Match zero can select randomly, match one can select the first, and match minus one can create indexed candidates. When exactly one token is required, extract all, assert count one, then copy the sole value to the final variable.

Malformed JSON is not the same as a missing path. Preserve the producer response code and a safe parser or assertion message so triage can separate server format failure from an expected object that lacks one field.

Response encoding can change regex or text extraction. Record content type and encoding, and use JSON Path for JSON rather than a regex over serialized JSON. A regex fixture should remain separate and include boundary cases for escaping and line breaks.

The consumer may still run if the Thread Group action remains Continue. Marking the producer failed is only half the contract. Assert the chosen stop action and capture the mock server's request count for the downstream route.

- The repository's JMeter skill says every sampler needs correctness assertions and correlation should replace hard-coded tokens. The performance scenario skill warns that status 200 can contain an application error. Both support content-aware fail-fast checks.

Use the [JMeter comparison guide](/blog/jmeter-vs-k6-vs-gatling-2026) for tool selection. This defect remains a test-plan control problem rather than a reason to change load tools.

## stale variable JMeter test fixtures and controls

- A stale variable JMeter test needs two iterations because a single missing response cannot prove inheritance. The first iteration seeds a valid value, while the second deliberately omits or empties it. The consumer capture must contain one request from iteration one and none from iteration two.

- The positive control returns one fresh token in both iterations. Each consumer request must use its iteration's token, and the two values must differ to expose accidental reuse.

- The missing control returns a token first and no matching path second. The second producer must fail with the sentinel and start the next loop before the consumer.

- The empty control returns a single empty string. Match count may be one, but trimmed content must fail and the final variable must remain unset.

- The repeated control returns two candidate tokens. The cardinality assertion must name observed count two and refuse to select either value.

- The malformed control returns invalid JSON with the same HTTP status. Evidence must identify parse or extraction failure rather than reporting a generic authorization error later.

- The repeated-run control starts a fresh JMeter process and result directory. It should produce the same sample-label sequence and consumer count without depending on a previous JTL or property.

- The cleanup control clears local stub state, result files, correlation variables, and temporary certificates owned by the fixture. Keep the failed JTL and safe log only when policy requests evidence.

- Use distinct labels such as Producer GET token, Validate current token, and Consumer POST order. Label identity makes JTL review and request capture clear without logging the extracted secret.

- The test must also prove the consumer body or header references the final validated variable, not the raw candidate. A correct assertion beside a consumer using another variable still leaves the flow unsafe.

- Read the [JMeter versus Locust and Gatling comparison](/blog/jmeter-vs-locust-vs-gatling-comparison) for wider architecture choices. Keep this two-iteration fixture in a tiny smoke plan before adding production-scale threads.

## How should regex extractor missing match be asserted?

- Regex extractor missing match uses the same freshness and fail-fast contract as JSON extraction. Reset first, use an unmistakable default, inspect match count, require exactly one nonblank capture, validate its allowed shape, then assign the final variable.

Exact equality is appropriate for sentinel, expected match count, producer label, consumer request count, and loop index. Do not compare the real secret token in logs or a shared CI report. Use a safe digest or fixed fixture token only in the local test.

- A partial-order assertion fits token length or numeric ranges, but it cannot prove freshness. Pair shape checks with iteration-specific fixture identity so a prior valid token cannot satisfy the next iteration.

- A state-transition assertion is strongest for prevention: final variable begins unset, becomes validated only after one good extraction, then appears in one consumer request. On failure, it remains unset and the consumer count does not increase.

- Bounded timing applies to the producer and stub, not to correlation correctness. Use configured connection and response timeouts. A late response should create a timeout sample rather than allowing the prior loop's variable to drive the consumer.

- Compatibility assertions should name JMeter, Java, plugin, and script versions. If the plan runs remotely, the [JMeter remote testing manual](https://jmeter.apache.org/usermanual/remote-test.html) requires aligned JMeter versions and says data files are not copied to engines.

- Do not accept a success-only check on the downstream response. An invalid token might coincidentally receive a friendly status, or the endpoint might return an error document with status 200. Assert that extraction succeeded before transmission.

- Use the [performance testing category](/categories/performance-testing) for related load skills. The extractor oracle should stay deterministic at one user before scale can amplify its request count.

## JMeter correlation assertion in CI

- A JMeter correlation assertion CI gate should run the small matrix in CLI mode before the full load plan. The official [JMeter best practices](https://jmeter.apache.org/usermanual/best-practices.html) recommend CLI execution, few listeners, selected saved data, and efficient JSR223 scripting.

Save JMeter and Java versions, JMX hash, stub fixture version, case name, thread and loop counts, sample labels, success flags, assertion messages, consumer request count, JTL path, and cleanup result. Do not save live bearer tokens or complete private responses.

- Generate one result directory per run and refuse a nonempty path. Old JTL rows can make an absent consumer appear present or carry a prior assertion message into the current report.

- Fail the job when any invalid case sends a consumer request, any valid case omits one, any sentinel reaches a request template, cardinality differs, assertion evidence is absent, or JMeter returns an unexpected status. The stub's request log is the final network-side oracle.

- For remote execution, distribute fixture data and configuration explicitly. The remote manual says the controller sends the test plan but not data files, and each engine runs the full plan. Consumer counts must therefore be grouped by engine and expected load multiplied correctly.

- Use one engine for the pull-request gate. Run a small remote compatibility case only when distributed execution is part of the release path. Correlation semantics should pass locally before adding RMI, engine startup, and result transport.

- The performance scenario repository file recommends starting with one virtual user, setting thresholds before execution, and correlating dynamic values. The JMeter skill requires non-GUI load runs and assertions. These facts support a fast prerequisite gate.

- Open the [QA skills directory](/skills) for performance test patterns. Keep this artifact small enough that a reviewer can trace producer, extractor, assertion, loop action, and consumer in order.

## JMeter correlation extractor failure testing comparison matrix

The matrix changes only producer response shape. Every invalid row must fail at the producer and keep consumer request count at zero. The valid row must prove the complete path before the other rows are trusted.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Single valid extracted token | One JSON token, fresh variable state | Count one, nonblank value, one consumer request | Valid flow fails or consumer omits current token | seed-skills/jmeter-load/SKILL.md |
| Missing path with sentinel default | JSON object without token path | Sentinel assertion fails and consumer stays absent | Old or blank token reaches consumer | [JMeter component reference](https://jmeter.apache.org/usermanual/component_reference.html) |
| Empty extracted value | Token path contains an empty string | Content assertion fails despite one match | Empty value passes cardinality alone | seed-skills/performance-test-scenario-generator/SKILL.md |
| Stale value from a previous iteration | Valid first loop, missing second loop | First consumer runs and second does not | First token is reused in loop two | [JMeter best practices](https://jmeter.apache.org/usermanual/best-practices.html) |
| Multiple matches when one is expected | Token path returns two candidates | Count assertion reports two and blocks consumer | Extractor picks one candidate silently | [JMeter remote testing](https://jmeter.apache.org/usermanual/remote-test.html) |

The missing and stale rows are related but not interchangeable. A fresh single-loop missing case proves the sentinel, while the two-loop case proves prior state cannot survive setup.

The empty and repeated rows separate content from cardinality. Both must fail before the final variable is assigned. Their messages should state expected one nonblank value and the observed safe category.

- When remote engines run the matrix, add engine identity to each row and calculate expected consumer counts per engine. Do not merge rows until each engine's producer and consumer evidence agrees.

Use the [blog index](/blog) for wider JMeter reporting and distributed test advice. This table remains a pre-load correctness check.

## How do you implement JMeter correlation extractor failure testing?

- Implementation should keep raw candidates separate from the final correlation variable. Reset both before the producer, let the extractor fill indexed candidates, validate count and content in one assertion, and assign the final value only after all checks pass.

This second fragment provides the assertion. It uses Groovy through JSR223, as recommended for repeated scripting in the official best-practices page. The messages expose safe categories rather than token contents.

\`\`\`xml
<JSR223Assertion guiclass="TestBeanGUI"
  testclass="JSR223Assertion"
  testname="Validate current correlation token">
  <stringProp name="scriptLanguage">groovy</stringProp>
  <stringProp name="cacheKey">correlation-token-assertion-v1</stringProp>
  <stringProp name="script"><![CDATA[
def sentinel = '__MISSING_TOKEN__'
def countText = vars.get('auth_candidates_matchNr') ?: '0'
def count = countText.isInteger() ? countText as int : -1
def candidate = count == 1 ? vars.get('auth_candidates_1') : null
def value = candidate?.trim()

if (count != 1) {
    AssertionResult.setFailure(true)
    AssertionResult.setFailureMessage(
        "correlation token expected 1 match, observed \${count}"
    )
} else if (!value || value == sentinel) {
    AssertionResult.setFailure(true)
    AssertionResult.setFailureMessage(
        'correlation token was missing or blank in the current iteration'
    )
} else if (!(value ==~ /[A-Za-z0-9._-]{8,128}/)) {
    AssertionResult.setFailure(true)
    AssertionResult.setFailureMessage(
        'correlation token did not match the approved fixture shape'
    )
} else {
    vars.put('auth_token', value)
}
  ]]></stringProp>
</JSR223Assertion>
<hashTree/>
\`\`\`

Place the consumer after the asserted producer in the same Thread Group. Its header should use \`Bearer \${auth_token}\`, while the stub captures request count and a safe token ID. Never place the consumer in a branch that can run after the loop action.

Follow this implementation procedure:

1. Read seed-skills/jmeter-load/SKILL.md and seed-skills/performance-test-scenario-generator/SKILL.md, then document extractor scope, variable lifecycle, assertion, request capture, CI, and cleanup duties.
2. Create an isolated stub with valid, missing, empty, malformed, repeated, and prior-iteration response cases, then start with one thread and fixed loops.
3. Run the positive case, reset variables, extract all candidates, assert one nonblank value, assign the final token, and capture exactly one consumer request.
4. Inject blank default, missing path, stale prior value, wrong scope, multiple matches, malformed encoding, and continue-on-error behavior one at a time.
5. Compare JTL, assertion, variable category, sampler label, loop transition, and stub request count with the five-row matrix, then report the first divergence.
6. Run the smoke gate in CI before load, retain only safe diagnostics, clear result paths and stub state, stop owned engines, and keep every invalid consumer attempt nonzero.

Repeat the valid case after all negative rows. It should produce one fresh request and no prior assertion. This final control catches leaked variables, a stub case that did not reset, or an output directory reused across runs.

Do not scale this plan until one-user evidence is exact. More threads can multiply the impact of one stale token and make the first faulty iteration harder to locate.

- The [JMeter distributed guide](/blog/jmeter-distributed-load-testing-complete-guide) can add engine setup after local correctness passes. Preserve the same sentinel, assertion, and consumer-capture contract on every engine.

## Frequently Asked Questions

### How do you detect a failed JMeter extractor before an empty or stale correlation value reaches the next request?

- Reset the final and candidate variables before the producer, extract all matches with an explicit sentinel, and assert exactly one nonblank value afterward. Assign the final variable only on success. Configure the thread loop to stop dependent samplers, then verify the stub received no consumer request.

### What should a JMeter correlation extractor failure fixture record?

- Record JMeter and Java versions, JMX hash, producer label, thread and loop, response case, extractor scope, match count, safe value category, assertion message, sampler success, loop action, consumer request count, JTL path, engine identity, and cleanup status. Never print the live extracted secret.

### Which failure proves JSON Extractor default value is broken?

- A missing path that leaves blank or prior data usable proves the default contract is unsafe. The controlled row should replace state with a named sentinel, fail at the producer, and send no consumer request. If the media response is malformed instead, report a parsing category rather than a missing-path category.

### How do teams isolate stale variable JMeter test?

- Use two loops with one thread and distinct fixture tokens. Return a valid token in loop one and omit the path in loop two. Reset before both producers, capture consumer traffic, and require one request only. Start a fresh process afterward to prove no property or result file retained state.

### Which assertion is strongest for regex extractor missing match?

- Combine exact match count, sentinel rejection, trimmed content, approved shape, current-iteration reset, producer failure, and zero downstream requests. Match count alone misses empty captures, while content alone can accept a stale value. The network-side consumer capture confirms the stop action worked after the assertion.

### How should CI report JMeter correlation assertion failures?

- CI should name case, producer, thread, loop, engine, expected and observed safe match category, assertion message, chosen error action, consumer request count, versions, JMX hash, JTL artifact, and cleanup result. It should fail if invalid data was transmitted, even when the downstream endpoint returned a successful status.

## Conclusion

JMeter correlation extractor failure testing gives each loop a fresh value or a clear stop. A missing, blank, repeated, or bad result must fail before the plan sets the final token.
This keeps JMeter correlation extractor failure testing at the producer boundary.

Begin with one thread, two loops, a local stub, and a clear missing tag. Let the first loop pass, then make the second loop miss its value and check that no old token was sent.

Run one good row before and after the fault set. The last good row proves that old vars, stub data, and result files did not leak.

Add remote engines only after the local path is clear. Each engine must keep its own count and show which producer, loop, and consumer took part.

Review the [JMeter distributed load testing guide](/blog/jmeter-distributed-load-testing-complete-guide), then open the [QA skills directory](/skills). Use the JMeter correlation extractor failure testing matrix in the next test run.`,
};
