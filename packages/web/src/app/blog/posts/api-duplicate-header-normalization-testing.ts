import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'API duplicate header normalization testing',
  description:
    'API duplicate header normalization testing: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'API Testing',
  primaryKeyword: 'API duplicate header normalization testing',
  keywords: [
    'API duplicate header normalization testing',
    'API duplicate header handling',
    'repeated HTTP header test',
    'header normalization behavior',
    'Set-Cookie duplicate preservation',
    'comma joined header validation',
  ],
  relatedSlugs: [
    'api-testing-complete-guide',
    'api-testing-best-practices-guide',
    'testing-content-negotiation-accept-header',
    'testing-problem-details-rfc-9457-errors',
  ],
  sources: ['https://www.rfc-editor.org/info/rfc9110', 'https://www.rfc-editor.org/info/rfc9111'],
  repoEvidence: [
    'seed-skills/api-testing-rest/SKILL.md',
    'seed-skills/api-test-suite-generator/SKILL.md',
  ],
  content: `API duplicate header normalization testing sends known repeated field lines through a raw server, the chosen client, and any proxy under test. It keeps raw pairs beside the client view, then applies the rule for that field. List fields may join in order, invalid repeats may fail, and each Set-Cookie line must stay observable.

## What does API duplicate header normalization testing verify?

API duplicate header normalization testing proves where repeated request or response fields are joined, kept apart, rejected, or rewritten. The pass rule depends on the field definition, so a test must not demand one shape for every same-name line.

The first record should be raw. Save each field name and value in received order before a library builds a map, lowercases names, trims white space, or joins values. Then save the high-level view used by product code.

[RFC 9110](https://www.rfc-editor.org/info/rfc9110) states that HTTP field names are case-insensitive. It also defines a combined value for repeated lines and lets a recipient join suitable lines with a comma and optional white space while keeping their received order.

That permission does not make every duplicate valid. A sender should repeat a field only when its definition allows a list form, apart from known cases such as \`Set-Cookie\`. The test data must label each field as list-safe, special, or invalid.

The RFC calls out \`Set-Cookie\` because it often appears on more than one line and cannot be folded into one list value. A comma can occur inside a cookie date, so a split after joining can break one cookie into false parts.

Cache paths add one more useful case. [RFC 9111](https://www.rfc-editor.org/info/rfc9111) allows some request field values to match after permitted white space, line combining, and field-specific case rules. It does not allow a test to reorder values when their own field rules make order meaningful.

The repo has sound base rules but no special duplicate-field suite. \`seed-skills/api-testing-rest/SKILL.md\` asks tests to check the contract, error paths, response shape, headers, edge cases, clean data, and independent cases.

The file \`seed-skills/api-test-suite-generator/SKILL.md\` adds spec-driven cases, request IDs, strict checks, positive and negative data, and request or response detail on failure. This article adapts those facts to raw and joined header views.

Use the [API testing guide](/blog/api-testing-complete-guide) for status, body, auth, and route coverage. This gate stays on repeated lines, because a correct JSON body says nothing about lost cookies or changed field order.

## How do you build API duplicate header handling?

API duplicate header handling begins with two local ends: an echo server for request lines and a raw response server for response lines. Keep both on loopback, choose free ports per worker, and close every socket after each case.

The response fixture should write bytes itself. Many web frameworks normalize headers before sending them, which would make the setup unable to prove whether the client or server changed a line.

Start with a list-safe test field such as a private fixture field whose grammar you define as comma-separated tokens. Send \`X-Test-Stage: alpha\` and \`x-test-stage: beta\`, then require raw values in that order and a high-level value equivalent to \`alpha, beta\`.

Add two separate cookie lines with distinct names and an \`Expires\` value containing a comma. Raw capture must show two complete lines, and the client cookie API must return two full values if that API claims cookie support.

The following fixture returns exact response bytes and keeps setup outside the client under test. It uses a short body so content parsing cannot hide an early header failure.

\`\`\`typescript
import net from 'node:net';
import { once } from 'node:events';

export async function startDuplicateHeaderServer() {
  const server = net.createServer((socket) => {
    const lines = [
      'HTTP/1.1 200 OK',
      'Content-Length: 2',
      'X-Test-Stage: alpha',
      'x-test-stage: beta',
      'Set-Cookie: sid=one; Path=/; HttpOnly',
      'Set-Cookie: theme=light; Expires=Wed, 21 Oct 2026 07:28:00 GMT',
      '',
      'ok',
    ];
    socket.end(lines.join('\\r\\n'));
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('missing test port');

  return {
    url: \`http://127.0.0.1:\${address.port}\`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
\`\`\`

For request tests, read the server's raw request header list before the framework map. Send repeated values through the exact client API used in production, since some clients reject an array while others send more than one line.

Give each request a unique \`X-Request-ID\`, as the generator skill advises. The echo result should return that ID, the raw pairs, and its normalized map so logs from parallel workers cannot be mixed.

Prove the positive path before adding a proxy. Once direct client-to-server facts pass, place the real gateway between them and compare the same request ID at each hop.

Do not use a public echo service for the gate. It can add its own proxy, hide raw fields, or change behavior without a source commit, which makes a failed line hard to own.

The [API best-practices guide](/blog/api-testing-best-practices-guide) can shape the wider local harness. Keep duplicate values neutral and never place auth tokens or live cookies in the saved raw list.

## What breaks repeated HTTP header test?

A repeated HTTP header test breaks when its fixture, client, proxy, server, or assertion changes the field before the target layer sees it. Triage must compare each hop in order and stop at the first changed pair.

Case folding alone is not a defect because field names are case-insensitive. A test should compare normalized names for identity while still keeping original casing as trace data when a gateway's byte output matters.

Comma ambiguity is more serious. Joining \`alpha\` and \`beta\` is easy to read, but joining a value that already contains a comma can make naive splitting lose the field's grammar and quoted boundaries.

Order can also matter. RFC 9110 says a proxy must not change the order of same-name field values when forwarding them, because that order can affect the combined meaning. Sort-based snapshots can hide this fault.

Runtime maps are a frequent trap. A fetch-style \`Headers\` object may expose one joined string, while a Node response can retain \`rawHeaders\` or a distinct-value view. Assert the API your app uses, but keep a lower-level witness beside it.

Proxy rules may drop repeats as a security measure or use a field allowlist. That can be valid policy when documented, yet it should appear as an explicit reject or rewrite result rather than an unexplained missing value.

\`Set-Cookie\` collapse is the key negative case. If two cookie lines become one string and later code splits on commas, the date in \`Expires=Wed, 21 Oct 2026...\` can be mistaken for a third cookie boundary.

Request and response paths can differ. A server might join request fields but send response lines separately, while a browser may hide \`Set-Cookie\` from script. Label the direction and runtime in every expected result.

Protocol translation is another boundary. HTTP/2 and HTTP/3 carry fields differently from HTTP/1.1 line syntax, but the application still receives field values. Test the supported protocol pair and avoid claiming raw byte parity across versions.

If direct loopback passes but the proxy path fails, compare ingress and egress raw facts by request ID. If both raw paths pass while product code fails, inspect the client adapter and parser rather than the network.

The [content negotiation article](/blog/testing-content-negotiation-accept-header) covers \`Accept\` selection in depth. This suite should not decide preference rules; it only proves that repeated input reaches that logic in the defined shape.

## Which fixtures define header normalization behavior?

Header normalization behavior needs five types of case: allowed list lines, a value with an internal comma, separate cookies, a duplicate singleton, and mixed name casing. Each type needs a direct path and a path through every supported gateway.

For the list case, use two short tokens and require preserved order. Add optional white space around one value only when that field's grammar permits it, then compare the parsed members rather than raw spacing.

For comma data, use a quoted fixture value and a plain token on separate lines. The parser must follow the fixture field grammar; a global \`split(',')\` is intentionally expected to fail.

For cookies, use two different cookie names and place an \`Expires\` date on one line. Require two raw values and two client cookie values, then parse each full value with the product's cookie parser.

For a singleton field, send two conflicting values and state the expected policy. The server may reject the message, the gateway may block it, or the app may return a typed error, but silent first-value success is not an adequate test.

Mixed casing should point to one logical field. Check that \`X-Test-Stage\` and \`x-test-stage\` do not become two unrelated map keys, while the raw list still shows what was sent.

The repeat control sends the same cases ten times with new request IDs. Values, order, status, and line count must match on every run, and no server-side array may keep data from the prior request.

The cleanup control closes keep-alive agents, servers, sockets, and temp logs. A worker should release its port before the next suite begins, or a stale listener can answer with an old fixture.

Use the [API testing guide](/blog/api-testing-complete-guide) to place this focused worker beside the rest of the service suite. Keep its ports and raw logs private to one case.

Save failure evidence as small JSON. Include case ID, direction, protocol, runtime, direct raw pairs, proxy raw pairs, normalized view, status, request ID, and cleanup result.

Never save bearer tokens, session cookies, or user headers in this artifact. Replace values with synthetic tokens at fixture creation rather than trying to redact them after a failed run.

The [problem-details testing article](/blog/testing-problem-details-rfc-9457-errors) is useful when the chosen reject policy returns an error document. Keep its body checks separate from the line facts that caused the rejection.

## How should Set-Cookie duplicate preservation be asserted?

Set-Cookie duplicate preservation requires an array of full cookie field values or another API that keeps each line distinct. The oracle must not join first and split later, because cookie attributes can contain commas and semicolons with their own rules.

Begin with raw response pairs. Filter names without regard to case, keep pair order, and compare the two complete expected values byte for byte after only the transport's allowed line cleanup.

Then inspect the high-level cookie API. If the chosen runtime offers a distinct cookie getter, require two entries and parse each entry alone. If it offers no such API, keep the raw adapter in product code and test that adapter.

Do not assert one generic header map for this case. Some maps hide \`Set-Cookie\` in browser script for security, while server runtimes can expose it. The expected view must name the runtime boundary.

The first cookie should use a simple session value. The second should contain the fixed date \`Wed, 21 Oct 2026 07:28:00 GMT\`, which catches unsafe comma splitting without relying on the current clock.

Check names, paths, flags, and dates after parsing. Also require exactly two raw lines, because a parser could produce two objects from one wrongly joined field and mask the transport error.

Use exact equality for raw values and exact count for cookies. Use field-specific parsing for cookie parts, while keeping received order as trace data rather than treating it as cookie priority unless the app contract says so.

The code below captures both the raw list and Node's joined view. The two views answer different questions and should never overwrite each other in the report.

\`\`\`typescript
import http from 'node:http';
import { expect, test } from 'vitest';
import { startDuplicateHeaderServer } from './duplicate-header-server';

function valuesFor(raw: string[], wanted: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < raw.length; index += 2) {
    if (raw[index].toLowerCase() === wanted.toLowerCase()) values.push(raw[index + 1]);
  }
  return values;
}

test('keeps cookies while joining the list field', async () => {
  const fixture = await startDuplicateHeaderServer();
  try {
    const response = await new Promise<http.IncomingMessage>((resolve) => {
      http.get(fixture.url, resolve);
    });

    expect(valuesFor(response.rawHeaders, 'x-test-stage')).toEqual(['alpha', 'beta']);
    expect(response.headers['x-test-stage']).toBe('alpha, beta');
    expect(valuesFor(response.rawHeaders, 'set-cookie')).toEqual([
      'sid=one; Path=/; HttpOnly',
      'theme=light; Expires=Wed, 21 Oct 2026 07:28:00 GMT',
    ]);
    expect(response.headers['set-cookie']).toHaveLength(2);
  } finally {
    await fixture.close();
  }
});
\`\`\`

This case fails if the fixture never emits two lines, the client loses one, the list order changes, or cookies collapse. It also proves cleanup through the \`finally\` branch rather than trusting worker shutdown.

For browser-bound APIs, add a server-side check before the response reaches page script. The browser may rightly restrict cookie access, so a page assertion cannot stand in for transport preservation.

## How does comma joined header validation run in CI?

Comma joined header validation should run against one fixed runtime version on each pull request and a small supported-version grid on schedule. Its output must show the direct path before the proxy path, which keeps a gateway fault from looking like a client fault.

Pin the test field definitions in code. Each case should declare whether repeat lines are allowed, whether order matters, how values parse, and whether the expected result is join, preserve, or reject.

Start one server per worker on a system-picked port. Print the port only in debug output, and use a generated request ID for every exchange so interleaved logs can still be paired.

Run the raw response cases first, then request echo cases, then add the proxy. A failed direct case should skip only the dependent proxy comparison and still publish its own small evidence file.

Gate on exact pairs, parsed members, cookie count, reject status, and cleanup. Do not gate on header object key order across different names, since RFC 9110 does not assign meaning to that order.

The [API best-practices guide](/blog/api-testing-best-practices-guide) can help set job scope and failure output. This gate should still retain both wire and client views for each repeated field.

Record Node, client package, gateway, and protocol versions. A runtime update can change its normalized API without changing wire facts, and reviewers need both facts to choose the right owner.

Keep expected policy changes in reviewed fixtures. If a gateway begins rejecting duplicate singletons by design, update the named case and error check rather than weakening the whole suite to "present or rejected."

Use the repo's report rule from \`seed-skills/api-test-suite-generator/SKILL.md\`, but redact at input time. Store only the synthetic fields, request IDs, status, and first changed layer.

The [API testing category](/categories/api-testing) lists related skills for schema and auth checks. Run those suites beside this gate, not inside its raw socket fixture.

## API duplicate header normalization testing comparison matrix

This matrix makes field-specific outcomes clear before code chooses a client API. It also stops a team from treating lowercasing, joining, preserving, and rejecting as the same kind of change.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| List field repeated twice | Alpha then beta on same logical name | Raw pair order stays fixed and client joins | Missing, reversed, or unparsed member | RFC 9110 |
| Same list field with mixed case | Name casing differs across two lines | One logical field with two ordered values | Two map keys or one lost value | RFC 9110 |
| Value contains a comma | Quoted comma data plus plain token | Field parser keeps the quoted member whole | Global split creates extra members | RFC 9110 |
| Two Set-Cookie fields | One date-bearing and one plain cookie | Two full cookie values remain observable | Joined value or false third cookie | RFC 9110 |
| Duplicate singleton | Conflicting values for a non-list field | Named reject or rewrite policy is seen | Silent, undocumented first-value pass | Product policy |

Run the list row through direct and gateway paths. A gateway may trim allowed white space, yet its parsed member order and meaning must stay the same.

The mixed-case row proves identity, not style. Original spelling can differ in the trace, while normalized lookup should find both values under one case-insensitive field name.

The comma row must use the field parser chosen by the contract. A generic split can appear to work for plain tokens and then fail as soon as valid data contains a comma.

The cookie row is not a normal list assertion. Preserve each full line through the server adapter, then test cookie syntax inside each value without rebuilding line boundaries.

The singleton row needs a written product rule because the general HTTP source does not define every server's rejection response. Keep that rule next to the fixture and name its owner.

API duplicate header normalization testing passes this matrix only when raw, normalized, and parsed views agree with their own stated contracts. Agreement means each view can differ in form without losing a value or its field-specific meaning.

Read the [content negotiation article](/blog/testing-content-negotiation-accept-header) before adding real \`Accept\` values. Its grammar and ranking rules are more specific than the neutral list field used here.

## How do you implement API duplicate header normalization testing?

Implement API duplicate header normalization testing from the wire inward. Fix raw lines first, add one client view, then place the gateway in the path and compare each stage with the same request ID.

1. Read \`seed-skills/api-testing-rest/SKILL.md\` and \`seed-skills/api-test-suite-generator/SKILL.md\`, then list their contract, header, edge-case, request-ID, report, independence, and cleanup rules.
2. Start an isolated raw response server and request echo server with mixed case, list values, quoted commas, optional white space, and two complete Set-Cookie fields.
3. Prove the direct positive case by saving raw pairs, normalized lookup, parsed members, cookie arrays, status, and server-received values under one request ID.
4. Add case folding, comma ambiguity, changed order, a duplicate singleton, proxy rewriting, and cookie collapse one at a time while all other bytes stay fixed.
5. Route the same cases through each supported gateway, compare the first changed hop with the matrix, and assign the fault to setup, client, proxy, server, or parser.
6. Run the fixed runtime in pull requests, schedule the wider version grid, publish only synthetic failure facts, and close all agents, sockets, ports, and temp logs.

Make one deliberate client mutation that reads only the first field value. The list and cookie rows should fail, while the singleton reject row should still follow its own policy.

Make a second mutation that sorts repeated values before comparison. The ordered list row must fail, which proves the test protects received order instead of set membership.

Keep direct tests fast and local. The gateway layer may start a container or service, but it should reuse the exact raw fixture rather than rebuilding near-copy test data.

When a browser client is part of the app, assert only fields that browser script may expose. Keep server-side raw checks for restricted fields and state that boundary in the case name.

Publish the smallest first-failure record and the final cleanup state. A full packet dump is rarely needed for synthetic fields and can make later use with real auth data unsafe.

Rerun the suite after client, server, proxy, protocol, and runtime upgrades. Do not update expected output until raw facts and the field definition show that the new form keeps the same meaning.

The [problem-details article](/blog/testing-problem-details-rfc-9457-errors) can add typed error checks for rejected duplicates. Keep its content assertions downstream from the raw reason captured here.

## Frequently Asked Questions

### How should an API test repeated request and response headers when runtimes join, preserve, or reject duplicates?

Capture ordered raw name-value pairs first, then capture the runtime's normalized view and parse by the field's own definition. Mark each fixture as list-safe, special, or invalid. Assert joined order for list fields, distinct full values for Set-Cookie, and a named reject policy for invalid repeats.

### What should an API duplicate header handling fixture record?

Record the case ID, direction, protocol, request ID, runtime versions, raw pairs at each hop, normalized map, parsed members, response status, and cleanup result. Use only synthetic values. These facts reveal whether setup, client, proxy, server, or product parsing first changed a repeated field.

### Which failure proves repeated HTTP header test is broken?

The clearest proof is a mismatch between the known raw fixture and the first receiver's raw pairs, or between two adjacent hops sharing one request ID. Also fail when a list changes order, a cookie line collapses, an invalid singleton passes without policy, or the harness leaves stale sockets.

### How do teams isolate header normalization behavior?

Use loopback raw servers, one field rule per case, system-picked worker ports, unique request IDs, and no public echo service. Prove the direct client path before adding a gateway. Close each socket and agent after the case, then repeat with fresh values to expose shared arrays or stale listeners.

### Which assertion is strongest for Set-Cookie duplicate preservation?

Require exactly two raw Set-Cookie pairs and exactly two complete values from the runtime's supported cookie API. Put a comma-bearing Expires date in one value, then parse each value alone. Never join and split, because that process can invent a cookie boundary inside a valid date.

### How should CI report comma joined header validation failures?

Report the field rule, expected action, raw ordered pairs, normalized value, parsed members, request ID, protocol, runtime versions, first changed hop, and cleanup status. Keep case and value data synthetic. This report distinguishes harmless name casing from lost values, changed order, unsafe comma splitting, and proxy policy.

## Conclusion

API duplicate header normalization testing is complete when each field follows its own repeat rule across raw, normalized, and parsed views. A useful gate keeps list order, preserves separate cookies, rejects invalid repeats by policy, and names the first layer that changed the message.

Review the [complete API testing guide](/blog/api-testing-complete-guide), then open the [QA skills directory](/skills) and implement the API duplicate header normalization testing matrix in the next test run. Start on loopback, add the gateway last, and keep every saved value safe for CI logs.`,
};
