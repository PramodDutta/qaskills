import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'JMeter timer scope execution testing',
  description:
    'JMeter timer scope execution testing: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Performance Testing',
  primaryKeyword: 'JMeter timer scope execution testing',
  keywords: [
    'JMeter timer scope execution testing',
    'JMeter timer scope test',
    'constant timer execution order',
    'JMeter timer child sampler',
    'throughput timer placement',
    'measure JMeter think time',
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
  content: `JMeter timer scope execution testing proves which timer delays each sampler before its request begins. A small JMX tree combines parent, nested, sibling, and throughput cases with timestamped proof. The test splits set think time from server lag, host timer noise, and result work so a failure points to tree spot instead of elapsed time alone.

## What does JMeter timer scope execution testing verify?

JMeter timer scope execution testing verifies that each timer delays only samplers within its test-tree scope and that all in-scope timers run before a scoped sampler. The strongest check maps sampler labels to timer tree path, set values, pre-request time marks, and result records instead of treating total sample time as timer proof.

The [JMeter component reference](https://jmeter.apache.org/usermanual/component_reference.html) states that timers are processed before each sampler in their scope. It also states that several timers in the same scope are all processed before each affected sampler, while an unscoped timer is not processed.

That rule has two parts that tests often merge. Tree location decides which samplers inherit a timer, while the timer code decides how much or when a thread pauses.

A Constant Timer gives each affected thread the set ms pause. Random timers add a spread, and throughput timers plan work toward a rate, so they need other number oracles even when tree scope is identical.

The repo file \`seed-skills/jmeter-load/SKILL.md\` presents realistic think time, timer types, command-line run, checks, and result practices. Its example test tree places a Constant Timer beside transaction controllers under a thread group.

The companion \`seed-skills/performance-test-scenario-generator/SKILL.md\` ties think time to observed user flow and warns that missing pauses can create misleading load. It also splits warm-up, request thresholds, scenario mix, and environment facts from user delay.

Neither repo file provides this exact scope regression suite. The article combines their load-modeling practices with JMeter's component rules to recommend a focused five-row timer contract.

Response time is the wrong primary signal because it includes connection work, network transit, server handling, and result collection. A slow endpoint can make a missing timer look present, while a fast endpoint can expose a timer that was placed correctly.

Run this grid before the wider [JMeter distributed testing guide](/blog/jmeter-distributed-load-testing-complete-guide) workflow. The local [performance test](/blog/performance-testing-complete-guide) proves tree semantics with one thread and a synthetic server before remote engines add clocks, queues, and network differences.

## How do you build an JMeter timer scope test?

A JMeter timer scope test starts with a compact JMX tree containing two sibling controllers, two samplers under one controller, and one sampler under the other. Place a parent Constant Timer above both branches and a child Constant Timer inside only the first branch.

Use one thread, one loop, fixed delays, and a local endpoint that returns at once. Large delays make the difference easy to observe, but keep the complete test short enough to run several times during a pull request.

Give each sampler a one-off label such as \`A1\`, \`A2\`, and \`B1\`. Labels connect the test-tree diagram, JTL rows, JMeter log messages, and right delay map without relying on row position.

Capture a time mark at once before the request path executes. A JSR223 PreProcessor can write the current monotonic or wall-clock reading with the sampler label, while the target server records arrival time under the same case ID.

Do not estimate timer delay from one sampler's elapsed field. JMeter's sample elapsed time normally describes request work after timer work, so a pre-sampler probe and prior completion record provide a clearer edge.

The good case places a 400 ms parent timer at thread-group scope. All three sampler starts should follow the preceding controlled edge by at least the reviewed tolerance around that delay.

Next add a 600 ms child timer to branch A. Samplers A1 and A2 should receive the combined parent and child delays, while B1 should retain only the parent delay.

Keep endpoint response time below a small local threshold and record it separately. If the endpoint becomes slow, stop the fixture as invalid rather than widening the timer bounds until any outcome passes.

The [JMeter response assertion guide](/blog/jmeter-response-assertion-jmx-guide) can validate the endpoint payload. Its status and body checks support fixture health, but time mark proof must still own timer scope.

This first JMX fragment adapts the Constant Timer pattern from \`seed-skills/jmeter-load/SKILL.md\`. The hash-tree indentation is the important part because the child timer belongs only to the branch-A controller.

\`\`\`xml
<ThreadGroup testname="Timer scope fixture">
  <elementProp name="ThreadGroup.main_controller"
    elementType="org.apache.jmeter.control.LoopController">
    <stringProp name="LoopController.loops">1</stringProp>
  </elementProp>
</ThreadGroup>
<hashTree>
  <ConstantTimer testname="Parent 400 ms">
    <stringProp name="ConstantTimer.delay">400</stringProp>
  </ConstantTimer>
  <hashTree/>
  <GenericController testname="Branch A"/>
  <hashTree>
    <ConstantTimer testname="Child 600 ms">
      <stringProp name="ConstantTimer.delay">600</stringProp>
    </ConstantTimer>
    <hashTree/>
    <HTTPSamplerProxy testname="A1"/>
    <hashTree/>
    <HTTPSamplerProxy testname="A2"/>
    <hashTree/>
  </hashTree>
  <GenericController testname="Branch B"/>
  <hashTree>
    <HTTPSamplerProxy testname="B1"/>
    <hashTree/>
  </hashTree>
</hashTree>
\`\`\`

Treat the fragment as part of a validated JMX document, not a stand-alone plan. Load it in a version-matched JMeter process, save it once if needed, and inspect the parsed tree before trusting timing results.

## What breaks constant timer execution order?

Constant timer execution order breaks first when a timer is placed under the wrong controller. The XML remains valid and the test still sends requests, yet a sibling can gain or lose delay because scope follows the tree rather than visual intent.

Multiple in-scope timers create another false diagnosis. JMeter processes each scoped timer before the sampler, so a test that expects only the nearest timer will report a valid sum as an unexpected pause.

Host timer and operating-system noise affects observed start times. Use a lower bound that proves the set delay and a narrow, measured allowance for local overhead, but reject hosts whose noise exceeds the fixture's health threshold.

Server lag cannot prove a timer ran. The timer occurs before sampler run, while response time begins after the request starts, so a delayed response and a delayed start belong in other fields.

Throughput timers are not fixed think-time timers. They release work according to a timing policy and target rate, which means one gap can vary even when aggregate flow is correct.

Wall-clock checks alone are fragile when clocks adjust or remote engines differ. Prefer per-engine monotonic gaps for local order, then use synchronized wall time only as supporting proof across machines.

Listeners can add memory and work cost that changes a load run. The [JMeter best practices guide](https://jmeter.apache.org/usermanual/best-practices.html) recommends command-line mode and as few listeners as possible, with heavy result views reserved for script debugging.

A common weak check starts a stopwatch around the whole test. Ramp-up, engine startup, three samplers, endpoint time, report writing, and shutdown then hide whether one timer reached one intended sampler.

Another weak check asserts that the run feels slower after adding a timer. That proves only aggregate time changed and cannot identify branch A, branch B, summed timing, or a skipped sampler.

Compare tools and timing models in the [JMeter, k6, and Gatling guide](/blog/jmeter-vs-k6-vs-gatling-2026), but do not import another runner's [sleep semantics](/blog/jmeter-response-assertion-jmx-guide) into this JMX rule. Tree scope is a JMeter-specific fact that should be tested in JMeter.

## JMeter timer child sampler fixtures and controls

A JMeter timer child sampler grid needs one clear good row, one deliberate skip, one summed case, one host timer edge, and one cleanup probe. Each case should regenerate its JTL and diagnostic file under a one-off directory.

The good row gives branch A one 600 ms child timer. Both A samplers should show that delay before their own start, proving the timer applies to each sampler rather than once per controller entry.

The skip row keeps B1 as a sibling outside branch A. Its pre-request gap must not include the child delay, though it can still inherit a timer placed at thread-group scope.

The summed row gives A1 both a parent and child timer. Its reviewed lower bound is the sum, while the report names each contributing timer and tree path instead of storing only one total.

The zero-delay edge leaves a Constant Timer in scope with value zero. The plan should remain valid and the result should not invent a good pause, which catches code that treats timer presence as elapsed time.

The repeated-run control executes the same plan three times after a short warm-up. Sampler-to-timer mappings must remain equal even if harmless timing overhead changes between runs.

The cleanup probe deletes or replaces JTL, log, and pre-sampler proof before the next case. A new run must contain exactly its right sampler labels and no rows from a prior case.

Add a wrong-tree fault by moving the child timer one level upward. B1 should fail because it now receives the added delay, while A1 and A2 remain consistent with the broader scope.

Add a missing-timer fault by moving the child beneath a sampler that cannot scope the intended sibling. A2 should fail first, and the parsed tree path should explain why the timer never applied there.

Use the [performance testing category](/categories/performance-testing) to place this check beside other focused gates. Keep the fixture's pass rule about timer mapping rather than overall load, lag percentiles, or live throughput.

## How should throughput timer placement be asserted?

Throughput timer placement should be asserted with tree scope plus a rate-aware plan rule. Record sampler starts, timer type, set rate, math mode, tree path, thread count, test time, and any fixed random seed.

For a Constant Timer, exact setup and a bounded pre-start gap are appropriate. The observed pause should meet the set lower bound, while host health limits the acceptable extra delay.

For two constant timers, assert the sum of in-scope values. Also preserve the source list because the same total could come from a wrong combination and conceal a scope error.

For a throughput timer, avoid exact spacing for each request unless the selected code promises it. Assert the documented rate flow over a suitable window and retain individual starts for diagnosing bursts or starvation.

The component reference explains that Precise Throughput Timer creates a plan and can model randomized arrivals. It also notes that a nonzero random seed supports repeatable load patterns, which is useful for a fixed regression fixture.

Spot remains testable even when gaps vary. A sampler outside the timer's scope must not participate in that timer's plan, while each scoped sampler should contribute to the reviewed rate math.

Use a partial-order check for timer and sampler phases: all in-scope timer work completes before the sampler starts. Unrelated worker activity does not need a total event order.

Use a state check for scope membership. The right map might be \`A1 -> parent, child\`, \`A2 -> parent, child\`, and \`B1 -> parent\`, and any missing or extra timer name fails before numeric timing is considered.

The [JMeter versus Locust and Gatling comparison](/blog/jmeter-vs-locust-vs-gatling-comparison) can inform runner selection. This suite should still pin its JMeter version because timer implementations and property defaults may change.

Never loosen throughput bounds until a short run always passes. First check thread supply, test time, startup effects, endpoint health, math mode, random seed, and the timer's exact test-tree location.

The second XML sample adds pre-request proof without a GUI listener. It uses a JSR223 PreProcessor under each measured branch and writes structured values into the JMeter log for a focused CI run.

\`\`\`xml
<JSR223PreProcessor testname="Record sampler start">
  <stringProp name="scriptLanguage">groovy</stringProp>
  <stringProp name="script"><![CDATA[
def label = sampler.getName()
def now = System.nanoTime()
def previous = vars.getObject('scope_previous_start')
def deltaMs = previous == null ? -1 : (now - previous) / 1_000_000d
log.info("TIMER_SCOPE case=baseline sampler={} deltaMs={}", label, deltaMs)
vars.putObject('scope_previous_start', now)
  ]]></stringProp>
</JSR223PreProcessor>
<hashTree/>
<ResponseAssertion testname="Fixture response is healthy">
  <collectionProp name="Asserion.test_strings">
    <stringProp name="right">timer-fixture-ok</stringProp>
  </collectionProp>
  <stringProp name="Check.test_field">Check.response_data</stringProp>
</ResponseAssertion>
\`\`\`

For precise timer boundaries, a custom sampler or targeted plugin may provide better phase hooks than this gap probe. State that code choice in the report and validate the probe with an injected known delay before relying on it.

## measure JMeter think time in CI

To measure JMeter think time in CI, run the narrow JMX plan in command-line mode against a local, low-lag endpoint. Pin Java and JMeter versions, one thread, loop count, timer values, random seed, and result properties.

The best-practices command is \`jmeter -n -t test.jmx -l test.jtl\`. Add a dedicated log file and property values, then parse only the labels and diagnostic lines needed by this fixture.

Warm the Java process or run one unmeasured setup plan before collecting tight bounds. Startup compilation and class loading should not be mistaken for a scoped timer, especially on small CI workers.

Set a fixture health gate for server response time and host timer noise. If either exceeds its reviewed limit, mark the environment invalid instead of reporting an application or timer failure.

The [remote testing manual](https://jmeter.apache.org/usermanual/remote-test.html) explains controller and remote-engine operation for remote tests. This local gate should pass first because remote clocks and links add variables that do not help prove tree scope.

If the live plan runs remotely, repeat a reduced mapping case on each engine. Calculate timer gaps within each engine and use labels plus engine IDs, not controller arrival order, to join records.

Save plan hash, JMeter version, Java version, operating system, engine ID, sampler label, tree path, right timers, set delay, observed gap, endpoint time, and cleanup state. These facts let a reviewer distinguish test code, host load, and target lag.

Keep normal artifacts compact. A parsed JSON summary and failed sampler lines are more useful than a full result tree, heap dump, or each response body.

Use the [blog index](/blog) to find load and reporting guidance after this gate. Timer scope should remain a fast semantic check, not become a miniature endurance test in each pull request.

JMeter timer scope execution testing should fail with the first label whose right timer set or lower bound differs. The message must include source names, tree paths, set values, observed gap, and fixture health.

## JMeter timer scope execution testing comparison matrix

This JMeter timer scope execution testing matrix compares spot, scope, summed delay, skip, and throughput flow. The right observation combines parsed tree facts with pre-sampler proof so total wall time cannot become a substitute.

| Scenario | Controlled setup | Right observation | Failure signal | Proof source |
|---|---|---|---|---|
| Timer at thread-group scope | One 400 ms timer above both controllers | A1, A2, and B1 list the parent before starting | Any sampler misses the parent delay | JMeter component reference |
| Timer under one controller | One 600 ms timer inside branch A | A1 and A2 list child; B1 does not | Sibling inclusion or child omission | Component reference and repo tree |
| Two timers for one sampler | Parent plus child apply to A1 | Source set and lower bound reflect their sum | Nearest-only or double-count result | JMeter component reference |
| Sibling outside timer scope | B1 remains in branch B | B1 receives only inherited parent timing | Child delay appears on B1 | Parsed JMX tree |
| Throughput versus constant delay | Same labels under split timer cases | Fixed delay uses bounds; rate timer uses windowed plan | Exact-spacing rule mislabels valid rate flow | Component reference |

Run the parent-only row first because it proves the probe can observe a known delay on each sampler. If that row fails, inspect plan parsing, log extraction, endpoint health, and host noise before testing child scope.

The child and sibling rows form one paired control. Their other result must come only from tree tree path, so duplicate endpoints and equivalent response checks should be used.

The summed row must report the contributing timers as well as their sum. Without that set, one missing delay and one accidental extra delay could cancel into an apparently correct total.

The throughput row uses a other numeric rule by design. Keep it in the same table to prevent teams from applying a constant-delay rule to a rate host timer.

Review the matrix whenever JMeter, Java, plugins, or the live JMX tree changes. A version upgrade should never alter right values without a saved reason and a focused rerun.

## How do you implement JMeter timer scope execution testing?

Implement JMeter timer scope execution testing with a parsed tree map, one known parent delay, and a time mark probe that runs before each labeled request. Prove that baseline before moving timers or introducing variable timing.

1. Read \`seed-skills/jmeter-load/SKILL.md\` and \`seed-skills/performance-test-scenario-generator/SKILL.md\`, then record their timer, think-time, non-GUI, result, threshold, and cleanup practices.
2. Create a JMX tree with sibling samplers, nested controllers, parent and child timers, fixed labels, and pre-request time mark capture against a local endpoint.
3. Run the parent-only good case and collect sampler starts, set timer values, parsed tree paths, labels, endpoint time, and result-log proof.
4. Move one timer, add a summed timer, inject host timer load, slow the endpoint, or replace fixed delay with throughput timing one change at a time.
5. Compare the observed timer set and number rule with the five-row matrix, then report the first sampler and phase that diverge.
6. Execute the plan in command-line CI, retain concise failed-case proof, remove generated JTL and logs, stop the fixture server, and verify empty state.

Parse the JMX before run and create an right sampler-to-timer map. This catches a tool that wrote valid XML under the wrong hash tree without waiting for timing proof.

Run a calibration plan containing one sampler and one fixed timer. Its repeated gap spread provides the host allowance used by the focused test, but the set delay remains the lower-bound contract.

Add branch A with two samplers and confirm that the child timer applies before each one. A controller-entry-only code should fail A2 even if A1 appears correct.

Add B1 after branch A and confirm skip. Shuffle controller order in a second plan to prove the test joins by labels and tree paths rather than output position.

Add two parent timers with other names and values. The right source list and sum should change together, which proves both structural and number checks are active.

Replace one fixed timer with a throughput timer only after constant scope passes. Use a long enough window and sufficient threads for the rate model, then keep its result out of fixed-delay equality checks.

Run the plan three times with clean output directories. Compare mapping results exactly and timing bounds statistically, then fail cleanup if a prior label appears in a new artifact.

For a remote live plan, copy the reduced case to each engine and report engine IDs. Do not combine gaps across clocks or infer sampler order from when results reach the controller.

The [distributed JMeter guide](/blog/jmeter-distributed-load-testing-complete-guide) covers the next scale step. Keep this local test in the repo so a tree refactor can be checked before a costly load window.

Finally, add the focused command and parsed summary to pull-request CI. The suite is complete when wrong spot, missing scope, summed delay, and a stale artifact each fail with other first causes.

## Frequently Asked Questions

### Where does a JMeter timer apply in the test tree, and how can a test confirm its delay reaches only intended samplers?

A timer applies to samplers in the scope created by its JMeter tree position, and all in-scope timers run before each scoped sampler. Confirm that rule with a parsed tree path map, one-off sampler labels, and pre-request timing proof. Keep response time split because server and network time cannot prove timer run.

### What should an JMeter timer scope test fixture record?

Record plan hash, JMeter and Java versions, engine ID, sampler label, controller path, in-scope timer names, set values, pre-request time mark, prior edge, endpoint time, JTL row, and cleanup result. These fields distinguish wrong spot, summed timing, host noise, server delay, stale output, and parser errors.

### Which failure proves constant timer execution order is broken?

The clearest failure shows a scoped sampler starting without its set lower-bound delay while the local endpoint and time mark probe remain healthy. A paired sibling outside that scope should remain unchanged. Report each in-scope timer and tree path so an accidental extra timer cannot compensate for the missing one.

### How do teams isolate JMeter timer child sampler?

Teams use one thread, fixed loops, a local fast endpoint, named controllers, one-off sampler labels, and fresh result files. They place a child timer under one branch and keep an equivalent sibling outside it. Moving the timer one level upward should make the sibling fail, proving the skip check works.

### Which check is strongest for throughput timer placement?

Assert exact scope membership first, then evaluate the timer's documented rate flow over a suitable window with fixed setup and seed where supported. Do not require each gap to equal a constant pause. Include thread supply, startup effects, and endpoint health before classifying a rate deviation as timer failure.

### How should CI report measure JMeter think time failures?

CI should report the first sampler label, engine, right and observed timer set, set delay or rate, observed gap, tree path, endpoint health, host allowance, and cleanup state. Attach only relevant JTL and log lines. This message splits tree defects, timing limits, target lag, and stale proof.

## Conclusion

JMeter timer scope execution testing passes when each sampler inherits exactly the timers defined by its tree path and uses the correct number rule. Fixed timers need source sums and bounded pre-start delays, while throughput timers need scope-aware plan checks over a suitable window.

Run the local semantic gate before remote load work and retain concise proof for the first mismatched label. Review the [JMeter distributed testing guide](/blog/jmeter-distributed-load-testing-complete-guide), then open the [QA skills directory](/skills) and implement the JMeter timer scope execution testing matrix in the next test run.`,
};
