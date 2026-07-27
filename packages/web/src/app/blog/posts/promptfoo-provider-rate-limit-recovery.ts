import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Promptfoo provider rate limit recovery',
  description:
    'Promptfoo provider rate limit recovery: use repo evidence, fixtures, code examples, and CI checks to expose AI contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Promptfoo provider rate limit recovery',
  keywords: [
    'Promptfoo provider rate limit recovery',
    'how to promptfoo provider rate limit recovery',
    'promptfoo provider rate limit recovery example',
    'Promptfoo 429 retry test',
    'Promptfoo max concurrency rate limit',
    'LLM provider backoff eval',
  ],
  relatedSlugs: [
    'promptfoo-complete-guide-2026',
    'promptfoo-red-teaming-llm-applications',
    'prompt-injection-testing-guide-2026',
    'llm-eval-cost-latency-testing-guide-2026',
  ],
  sources: [
    'https://www.promptfoo.dev/docs/providers/',
    'https://www.promptfoo.dev/docs/configuration/guide/',
    'https://www.rfc-editor.org/info/rfc9110',
  ],
  repoEvidence: [
    'seed-skills/promptfoo-llm-red-teaming/SKILL.md',
    'seed-skills/prompt-testing/SKILL.md',
  ],
  content: `Promptfoo provider rate limit recovery uses a local HTTP server that returns a fixed sequence of 429 and success replies for each case ID. A passing run keeps concurrency within its limit, retries only the allowed attempts, records every case once, honors the chosen delay rule, and writes a complete JSON report after service returns.

## What must Promptfoo provider rate limit recovery prove?

Promptfoo provider rate limit recovery must prove that short provider throttles do not lose or clone eval cases. It must also prove that retries end at a firm limit.

The fixture should own the reply plan, time source, and case IDs. A live provider cannot give the same 429 order on each run, so it cannot be the main test.

Each request needs one logical case ID and one attempt number in the server ledger. The final report still needs one row per logical case, not one row per HTTP attempt.

Bounded concurrency is an observed peak, not a config claim. The server should count open requests and save the largest number seen during the run.

Retry timing needs a range that allows normal process delay while rejecting immediate loops. Use a fake clock when the retry layer permits it, or broad monotonic bounds with a local server.

The terminal path matters as much as recovery. A case that receives 429 beyond the allowed attempts must end once, carry a useful error, and make the run fail.

The [Promptfoo provider guide](https://www.promptfoo.dev/docs/providers/) lists HTTP as a supported provider form. That boundary lets the test replace a paid service with a loopback script.

The [Promptfoo complete guide](/blog/promptfoo-complete-guide-2026) covers common eval setup. This page owns case truth when the provider asks the runner to slow down.

A pass requires expected, completed, passed, and failed counts to reconcile. An empty or partial result file cannot pass because no assertion happened to be false.

Open the [AI testing skills directory](/skills) for broader LLM QA flows. Keep this gate limited to request control, retry facts, case counts, and final report state.

## Which repository behavior defines the test contract?

The repo defines a machine-readable report and a fixed CI run. Those facts give retry tests a stable output contract even when several HTTP attempts serve one case.

Lines 68 through 74 of \`seed-skills/promptfoo-llm-red-teaming/SKILL.md\` run the prompt and provider matrix, then write \`results.json\`. The file is the source for complete case accounting.

Lines 124 through 133 of the same file run pinned quality and red-team configs in CI. The text favors fixed pull-request suites and keeps new attacks for a slower schedule.

The second repo path, \`seed-skills/prompt-testing/SKILL.md\`, checks token and latency limits. A retry test should keep elapsed time and attempt count as separate fields so a slow pass stays visible.

Inputs include test IDs, provider URL, concurrency cap, retry cap, wait policy, and scripted reply plans. Outputs include the request ledger, peak open requests, report rows, errors, and process status.

Record the Promptfoo command and resolved config path with the artifact. A wrong config can produce a small successful run that looks like missing retry work.

The report denominator comes from prompts, providers, and tests in the chosen matrix. Calculate that expected count before execution, then compare exact logical IDs afterward.

The [Promptfoo configuration guide](https://www.promptfoo.dev/docs/configuration/guide/) documents file-based and HTTP provider setup. Use only fields supported by the pinned Promptfoo version in the test repo.

The [Promptfoo red-team guide](/blog/promptfoo-red-teaming-llm-applications) covers hostile content. Rate-limit fixtures should use simple fixed replies so transport and scheduling remain the only changing parts.

Repository facts do not prove a retry took place. The local ledger supplies that missing proof with status, attempt, start time, end time, and logical case ID.

## How to promptfoo provider rate limit recovery?

For how to promptfoo provider rate limit recovery, start one loopback server on an open port and give every case a reply queue. The queue must reset before each test.

Use at least four plans: direct success, one 429 then success, several 429 replies then success, and 429 through the final allowed attempt. Add a controlled 503 only if policy treats it as retryable.

The server should copy safe request facts before choosing a reply. Save case ID, attempt index, current open count, monotonic time, response status, and any \`Retry-After\` value.

Configure Promptfoo to call the local provider and write JSON. The first example follows the output command in \`seed-skills/promptfoo-llm-red-teaming/SKILL.md\` while keeping the endpoint local.

\`\`\`yaml
prompts:
  - "{{query}}"

providers:
  - id: http
    config:
      url: http://127.0.0.1:4319/chat
      method: POST
      headers:
        X-Eval-Case: "{{caseId}}"
      body:
        caseId: "{{caseId}}"
        prompt: "{{prompt}}"
      transformResponse: json.output

tests:
  - vars:
      caseId: direct-success
      query: Return the fixed success text
    assert:
      - type: equals
        value: accepted
  - vars:
      caseId: throttle-once
      query: Return the fixed success text after one retry
    assert:
      - type: equals
        value: accepted
\`\`\`

Generate this config with the actual loopback port when the test starts. Do not reserve a shared port because parallel CI jobs can collide and send requests to the wrong fixture.

Launch Promptfoo as a child process with an explicit config and output path. Capture standard error separately, since terminal provider faults may explain a missing result row.

Count logical cases from the generated config rather than the server ledger. A dropped case would never reach the server, so using received requests as the denominator creates a false pass.

The [prompt injection testing guide](/blog/prompt-injection-testing-guide-2026) is useful after transport works. Keep fixed harmless prompts here so no model or grader can add noise to retry facts.

Run the direct-success control first. It proves request rendering and result parsing before the script starts testing delay and attempt rules.

## Promptfoo provider rate limit recovery example: scenario and assertion matrix

A promptfoo provider rate limit recovery example should compare clean service, exact retry limit, terminal throttle, parallel work, and report failure. Each row needs a stable artifact check.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Baseline | Every case returns 200 on attempt one | One request and one result per case | A case is absent or repeated | \`seed-skills/promptfoo-llm-red-teaming/SKILL.md\` |
| Retry boundary | 429 replies stop one attempt before the cap | Final attempt succeeds and keeps one result | Extra request occurs after success | [HTTP semantics](https://www.rfc-editor.org/info/rfc9110) |
| Terminal 429 | Every allowed attempt returns 429 | One failed case and bounded attempts | Loop continues or case vanishes | [Promptfoo providers](https://www.promptfoo.dev/docs/providers/) |
| Parallel run | Delayed replies hold several requests open | Peak open count stays at or below cap | Server observes cap plus one | [Promptfoo configuration](https://www.promptfoo.dev/docs/configuration/guide/) |
| Report write fault | Output path rejects the final write | Process fails and no report is trusted | Partial JSON is marked successful | \`seed-skills/prompt-testing/SKILL.md\` |

For the retry boundary, name the cap in attempts rather than retries. This choice avoids a common disagreement about whether the first request counts.

The server should reject a request after a case has already returned success. That check catches a queued retry which was not canceled when the prior reply arrived.

Use a barrier for the parallel row so several requests stay open at once. Without a controlled pause, a fast loopback server may never reveal the set limit.

The [LLM cost and latency guide](/blog/llm-eval-cost-latency-testing-guide-2026) covers wider timing budgets. This matrix asks only whether retry work stays bounded and fully counted.

## What failures expose Promptfoo 429 retry test?

A Promptfoo 429 retry test exposes dropped cases, cloned results, retry storms, bad delay handling, and false report success. Inject each fault at the local HTTP edge.

First, return one 429 with \`Retry-After\`, followed by a fixed success. The ledger must show two attempts for one case and the report must show one logical result.

Next, return success on the last allowed attempt. Assert that no further request arrives during a short guard window after the process exits.

Then return 429 for all allowed attempts. The process and report should expose a terminal provider error without adding a normal success row.

Hold every reply until the concurrency cap has been reached. Release them together and fail if the server ever sees more open requests than the declared limit.

The second example creates a fixed local reply plan and tracks attempts plus peak work. It can serve the HTTP provider config without a remote service.

\`\`\`typescript
import { createServer } from 'node:http';

const plans = new Map<string, number[]>([
  ['direct-success', [200]],
  ['throttle-once', [429, 200]],
  ['terminal-throttle', [429, 429, 429]],
]);
const attempts = new Map<string, number>();
const ledger: Array<{ caseId: string; attempt: number; status: number }> = [];
let openRequests = 0;
let peakOpenRequests = 0;

export const server = createServer((request, response) => {
  let body = '';
  request.setEncoding('utf8');
  request.on('data', (chunk) => {
    body += chunk;
  });
  request.on('end', () => {
    openRequests += 1;
    peakOpenRequests = Math.max(peakOpenRequests, openRequests);

    const caseId = String(JSON.parse(body).caseId);
    const attempt = (attempts.get(caseId) ?? 0) + 1;
    attempts.set(caseId, attempt);
    const plan = plans.get(caseId) ?? [500];
    const status = plan[Math.min(attempt - 1, plan.length - 1)];
    ledger.push({ caseId, attempt, status });

    response.statusCode = status;
    response.setHeader('content-type', 'application/json');
    if (status === 429) response.setHeader('retry-after', '1');
    response.end(JSON.stringify(status === 200 ? { output: 'accepted' } : { error: 'busy' }));
    openRequests -= 1;
  });
});

export function getServerFacts() {
  return { ledger: [...ledger], peakOpenRequests };
}
\`\`\`

Inject a broken JSON success body after recovery. A 200 status does not prove the provider adapter could create a valid output or result row.

Inject a child-process stop between successful HTTP reply and report write. The gate must reject the missing or malformed artifact rather than rebuild a pass from the server ledger.

The [Promptfoo complete guide](/blog/promptfoo-complete-guide-2026) can help with command setup. Keep the ledger and result file as separate proofs because neither alone covers all failures.

## How should Promptfoo max concurrency rate limit run in CI?

A Promptfoo max concurrency rate limit check needs a barrier that holds requests long enough to measure overlap. Fast sequential replies cannot prove a cap.

Start the server on loopback with an operating-system chosen port. Write that port into a job-local config, then remove the config during cleanup.

Use a fixed case count larger than the cap. If the cap is three, run at least eight cases so more than one scheduling wave is required.

At the server, raise \`openRequests\` when a full request arrives and lower it after the reply ends. Save the peak and every case start and finish time.

Release the first wave only after the expected cap arrives or a setup timeout fires. If fewer arrive, the test can still report the observed lower peak without hanging.

Run the same suite twice with a fresh server state. Attempts, logical result IDs, and terminal states should match even if exact process times vary.

Give the child process a firm whole-run timeout. On expiry, terminate it, save the ledger, mark pending case IDs, and fail the run as incomplete.

Keep config, command, package version, request ledger, result JSON, standard error, and final counts. These files let owners tell provider delay from runner scheduling.

The [blog index](/blog) links broader CI isolation patterns. This test must not use provider keys, staging endpoints, or shared report paths.

Block release when peak work exceeds the cap, attempts exceed policy, a successful case is retried, IDs are lost or cloned, or the final JSON is incomplete. Also block a run that never reaches the planned overlap, since such a pass does not exercise concurrency.

## Which assertions verify LLM provider backoff eval?

An LLM provider backoff eval needs exact assertions on attempts, waits, counts, peak work, terminal state, and report integrity. A final success status alone is too weak.

Assert the planned logical ID set before execution and the report ID set afterward. The sets must match except for terminal failures represented by an explicit failed row.

Assert one final row per logical case. Multiple HTTP attempts are valid evidence, but duplicate logical results can overstate pass counts and cost.

Assert attempt indexes start at one and rise without gaps for each case. Gaps can reveal lost ledger events or a retry layer that did not preserve identity.

Assert no case exceeds the stated attempt cap. Add a post-success guard window and require no new attempt after a successful reply.

Assert wait bounds with monotonic time. The lower bound catches a tight loop, while the upper bound catches a stalled retry that harms CI time.

The approved [HTTP semantics reference](https://www.rfc-editor.org/info/rfc9110) defines the \`Retry-After\` field. Save the raw field and the delay chosen by the client so policy remains reviewable.

Assert peak open requests stays within the configured cap and reaches a useful test level. A peak of one passes an upper bound but does not exercise a cap of three.

Assert the result file parses fully, names the expected config, and contains final counts that reconcile. A zero-byte, partial, stale, or wrong-run file must fail.

Use the [Promptfoo red-team guide](/blog/promptfoo-red-teaming-llm-applications) for later attack runs. Keep this backoff check tied to fixed text and machine facts.

Keep the retry owner explicit in each fixture: if Promptfoo, an HTTP gateway, and a provider SDK all retry the same 429, the server ledger can show more attempts than any one layer planned, so the test setup should disable the two layers outside scope and record their resolved retry settings beside the command. Add one separate integration case for stacked retries only when production truly uses them, then assert a total end-to-end attempt ceiling and name which layer scheduled each wait, because a local per-layer cap can still multiply into an unsafe request storm.

Compare request bodies, headers, and case IDs across attempts to prove that a retry sends the same logical eval input, while allowing only fields that are meant to change, such as trace or attempt IDs; a recovery test that changes the prompt on attempt two has not retried the original case and must not use its success result. Track billed usage and side-effect markers apart from final rows, since one logical result can still create several charged calls or repeated tool actions, and require the local fixture to reject any duplicate side-effect key before CI accepts recovered output.

A good error names case ID, attempt, status plan, chosen wait, peak work, and result state. That message gives runner, provider, and CI owners distinct leads.

## Step-by-step test implementation

Implement Promptfoo provider rate limit recovery in six steps from repo output rules to a local CI proof. Keep all provider behavior under the fixture's control.

1. Read \`seed-skills/promptfoo-llm-red-teaming/SKILL.md\` and \`seed-skills/prompt-testing/SKILL.md\`, then record the JSON output, fixed CI, latency, and case-count contracts.
2. Create loopback reply plans for direct success, one throttle, boundary recovery, terminal throttle, delayed work, malformed success, and report-write failure.
3. Generate a job-local HTTP provider config, start the server on an open port, and calculate planned logical IDs before launching Promptfoo.
4. Run the expected path and assert exact attempts, bounded peak work, one result per case, complete counts, and a parseable machine report.
5. Inject extra retries, missing rows, duplicate rows, bad JSON, child timeout, and terminal 429 replies, then require stable failed states and saved evidence.
6. Run the focused suite in CI, retain the safe ledger and result file, close the server, clear temporary data, and assign runner, fixture, adapter, or platform owners.

Start with no more than a few fixed cases per branch. A small matrix makes attempt plans and final counts easy to inspect in a failed job.

Prove the red path by changing one success plan to terminal throttle in a test branch. Check that CI keeps the artifact even though the process returns nonzero.

The [AI testing skills directory](/skills) can support wider Promptfoo work. This suite should remain the one source for retry and case-accounting rules.

After the gate is stable, add a slow scheduled check against a nonproduction provider if needed. Never let that remote check replace the local release proof.

## Failure triage and regression ownership

Start with planned and final logical IDs. If they differ, inspect matrix creation, worker scheduling, and report parsing before looking at retry times.

If the server never receives a case, the runner or generated config owns the first fault. A provider cannot retry a request it never saw.

If attempts exceed the cap, inspect the retry layer and off-by-one meaning. Record whether the policy counts total attempts or retries after the first request.

If a request arrives after success, inspect cancellation and queued timers. The local server has already proved that the provider response was available.

If peak work exceeds the cap, inspect the resolved config and which task pool the option controls. Generation and eval work may use different scheduling paths.

If waits are too short or long, compare raw \`Retry-After\`, chosen delay, and monotonic timestamps. Clock time can jump and should not drive elapsed checks.

If all requests finish but rows are missing, inspect response parsing and report writing. The ledger proves transport, while the result file proves eval accounting.

If only CI fails, compare Promptfoo version, runtime, config artifact, port choice, and process timeout. Shared network access is not needed for this loopback test.

The [LLM latency guide](/blog/llm-eval-cost-latency-testing-guide-2026) can guide wider time limits. Keep retry correctness separate from provider speed in the issue.

Close each fault with the ledger row, result row, config ID, and owner. A generic rate limit failure hides the layer that actually broke.

## Frequently Asked Questions

### How do you script 429 and transient provider failures in Promptfoo and verify bounded concurrency, retries, case accounting, and terminal errors?

Point an HTTP provider at a loopback server with reply queues keyed by case ID. Record each attempt, status, wait, and open-request count. Compare planned IDs with one final row each, then fail extra attempts, excess peak work, missing rows, duplicate rows, or unbounded terminal errors.

### What fixture best tests how to promptfoo provider rate limit recovery?

Use direct success, one 429 then success, last-attempt success, terminal 429, delayed parallel replies, malformed success, and report-write failure plans. Start a fresh server for each test and calculate logical case IDs from config, not from the requests that happened to arrive.

### Which failure signal proves promptfoo provider rate limit recovery example?

Proven faults include attempts above the cap, a request after success, peak work above its limit, an invalid wait, or a missing logical result. A terminal throttle must end once with a named failed row. Partial or stale JSON should make the whole run incomplete.

### How should CI report Promptfoo 429 retry test?

CI should retain the generated config, Promptfoo version, command, request ledger, peak open count, result JSON, standard error, and reconciled case totals. Sort ledger rows by case and attempt. Publish evidence before cleanup, even when the child process times out or exits with failure.

### When should Promptfoo max concurrency rate limit block a release?

Block when observed peak requests exceed the declared cap, when the fixture never reaches a useful overlap level, or when scheduling drops cases. Also block retries past policy, post-success attempts, terminal loops, and any final report whose logical IDs or counts do not match the planned matrix.

### How can teams keep LLM provider backoff eval repeatable?

Use loopback reply plans, stable case IDs, monotonic time, a fixed attempt policy, and an operating-system chosen port. Reset all server state per test, hold requests behind a barrier, sort saved facts, and avoid live providers. Pin Promptfoo and keep the generated config with each failed run.

## Conclusion

Promptfoo provider rate limit recovery is ready to gate release when scripted throttles recover within firm attempt and concurrency bounds, every logical case appears once, and terminal failures remain explicit. The local ledger and Promptfoo JSON must agree before CI can trust the run.

Open the [AI testing skills directory](/skills) to choose an LLM test workflow. Then read the [Promptfoo complete guide](/blog/promptfoo-complete-guide-2026) before adding this local recovery gate to CI.`,
};
