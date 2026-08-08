import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Security Testing Prototype Pollution Node Applications: From Payload to Proof',
  description: 'Use security testing prototype pollution Node workflows to find unsafe merges, prove impact safely, test fixes, and harden CI with runnable checks.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Security Testing Prototype Pollution Node Applications: From Payload to Proof

Security testing prototype pollution Node applications requires proving two separate conditions: attacker-controlled keys can modify a prototype or an object’s prototype, and application code later trusts an inherited property in a security-relevant sink. Test both in an isolated process, assert the prototype state directly, demonstrate only a harmless local impact, then terminate the process so contaminated globals cannot affect the rest of the suite.

Begin with dynamic property assignment, deep merge, path setters, query parsers, and configuration overlays. Exercise \`__proto__\` and \`constructor.prototype\` paths, inspect own versus inherited properties, and verify authorization and request options use explicit defaults. Prototype pollution is distinct from token validation defects, so use the [JWT algorithm confusion testing guide](/blog/security-testing-jwt-algorithm-confusion) and [JWKS cache key rotation testing guide](/blog/testing-jwt-key-rotation-jwks-cache) when the same Node service also accepts JSON Web Tokens.

## Model the pollution source and exploitation sink separately

Prototype pollution is not one magic payload. JavaScript property lookup walks an object’s prototype chain when an own property is absent. A pollution source lets attacker-controlled data alter a prototype or replace a target object’s prototype. An exploitation sink makes a sensitive decision using a value found through that chain.

MDN describes the two phases as pollution and exploitation and documents common defenses at https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Prototype_pollution. That distinction improves defect reports. “The input contains \`__proto__\`” is not evidence. “The path setter writes \`isAdmin\` onto \`Object.prototype\`, then the access check reads inherited \`isAdmin\` for a user with no own role field” is evidence with a source, state change, and sink.

| Component pattern | Potential source behavior | Sensitive sink to inspect |
|---|---|---|
| Deep path setter | Traverses attacker-controlled segments | Authorization options |
| Recursive merge | Assigns untrusted keys into ordinary objects | Template or serializer configuration |
| Query-string parser | Builds nested objects from parameter names | Request-routing flags |
| Configuration overlay | Copies parsed JSON into defaults | HTTP method, body, filesystem path |
| Object-based dictionary | Uses user keys on \`{}\` | Feature flags or tenant policy |
| Clone or deserializer | Preserves unexpected prototype | Validation and allowlist decisions |

The highest-value test cases connect a reachable input to a real sink. However, a confirmed source still deserves remediation even when the current test cannot find an exploitable sink. A future feature or dependency change can introduce one. Record the preconditions and keep the regression test near the unsafe transformation.

## Create a process-isolated laboratory

Never run pollution probes in a shared production process. Modifying \`Object.prototype\` can change unrelated tests, reporters, HTTP clients, or cleanup logic. Use a child process or worker that exits after each payload family. Target a local fixture or an explicitly authorized test environment, and use harmless marker properties rather than command execution, file access, or external callbacks.

A minimal vulnerable path setter makes the mechanism visible:

\`\`\`js
// vulnerable-setter.mjs
export function setPath(target, path, value) {
  const segments = path.split('.');
  let cursor = target;

  for (const segment of segments.slice(0, -1)) {
    if (cursor[segment] === undefined) cursor[segment] = {};
    cursor = cursor[segment];
  }

  cursor[segments[segments.length - 1]] = value;
  return target;
}
\`\`\`

This helper is deliberately unsafe because it traverses inherited \`constructor\` and \`prototype\` properties. Use it only as a local test fixture. The first probe asserts the state change and cleans up in a \`finally\` block, but the process boundary remains the stronger containment mechanism.

\`\`\`js
// pollution-worker.mjs
import assert from 'node:assert/strict';
import { setPath } from './vulnerable-setter.mjs';

const marker = 'qaPrototypeMarker';

try {
  assert.equal(Object.hasOwn(Object.prototype, marker), false);
  setPath({}, 'constructor.prototype.' + marker, 'polluted');

  const cleanLookingObject = {};
  assert.equal(Object.hasOwn(cleanLookingObject, marker), false);
  assert.equal(cleanLookingObject[marker], 'polluted');
  process.stdout.write('pollution confirmed');
} finally {
  delete Object.prototype[marker];
}
\`\`\`

Run it directly only inside the fixture directory:

\`\`\`bash
node pollution-worker.mjs
\`\`\`

The expected local output is \`pollution confirmed\`. The test does not attempt remote code execution. It proves that an ordinary object inherits a property that the application did not assign to it.

## Use payload families that match JavaScript semantics

Payload lists copied from a scanner are easy to misinterpret. JSON parsing of an object with an own \`__proto__\` key does not by itself pollute \`Object.prototype\`. The danger can appear later when code assigns that key through a setter, recursively traverses it, or copies it into a target. Also, disabling the legacy \`__proto__\` accessor does not block traversal through \`constructor.prototype\`.

| Payload family | Example shape | What it tests | Important caveat |
|---|---|---|---|
| Legacy accessor | \`__proto__.marker\` | Dynamic traversal into inherited accessor | Runtime can delete or throw on accessor use |
| Constructor chain | \`constructor.prototype.marker\` | Alternate path to a prototype | Survives \`__proto__\` removal in unsafe setters |
| Parsed JSON key | own \`__proto__\` object | Copy and merge setter behavior | Parsing alone is not pollution |
| Nested merge | object several levels deep | Recursive key handling | Exact parser and merge semantics matter |
| Dictionary collision | keys such as \`toString\` | Inherited-name confusion | May break logic without global pollution |
| Sink marker | \`isAdmin\`, \`method\`, or harmless test flag | Application lookup behavior | Must remain non-destructive and local |

The following script demonstrates why a parsed JSON key and a copy operation must be tested as separate steps. It changes the prototype of one target object through \`Object.assign\`; it does not claim that \`Object.prototype\` becomes globally polluted.

\`\`\`js
// assign-behavior.mjs
import assert from 'node:assert/strict';

const input = JSON.parse('{"__proto__":{"qaFlag":"from-input"}}');
assert.equal(Object.hasOwn(input, '__proto__'), true);
assert.equal({}.qaFlag, undefined);

const assigned = Object.assign({}, input);
assert.equal(Object.hasOwn(assigned, 'qaFlag'), false);
assert.equal(assigned.qaFlag, 'from-input');
assert.equal({}.qaFlag, undefined);

const spread = { ...input };
assert.equal(Object.hasOwn(spread, '__proto__'), true);
assert.equal(spread.qaFlag, undefined);

console.log('copy behaviors distinguished');
\`\`\`

This distinction matters during diagnosis. If a scanner reports that JSON parsing “polluted the global prototype,” reproduce each transformation and inspect \`Object.getPrototypeOf(target)\`, \`Object.hasOwn(target, key)\`, and \`Object.hasOwn(Object.prototype, key)\`. Do not infer global impact from one inherited read on a single target.

## Write regression tests that expose the vulnerable primitive

Use Node’s built-in test runner to execute the vulnerable worker in a child process. A child process proves the marker cannot escape into the parent test runner, and it lets later tests enable runtime flags independently.

\`\`\`js
// prototype-pollution.test.mjs
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const worker = join(process.cwd(), 'pollution-worker.mjs');

test('unsafe constructor traversal is observable only in child process', async () => {
  assert.equal({}.qaPrototypeMarker, undefined);

  const result = await execute(process.execPath, [worker]);
  assert.equal(result.stdout, 'pollution confirmed');
  assert.equal({}.qaPrototypeMarker, undefined);
});
\`\`\`

Run the suite with a documented command:

\`\`\`bash
node --test prototype-pollution.test.mjs
\`\`\`

For an application defect, invert the assertion after remediation. The fixed helper must reject dangerous segments or use a data structure that cannot traverse the object prototype. Preserve the original payload as a regression case.

## Test the sink, not only the marker

A property on a prototype becomes security-relevant when code trusts absence to mean a safe default but then reads an inherited value. Authorization is the clearest harmless fixture. The vulnerable function below grants access whenever \`user.isAdmin\` is truthy, even if the object has no own \`isAdmin\` property.

\`\`\`js
// sink-proof.mjs
import assert from 'node:assert/strict';
import { setPath } from './vulnerable-setter.mjs';

function canOpenAdminPanel(user) {
  return user.isAdmin === true;
}

const marker = 'isAdmin';

try {
  const ordinaryUser = { id: 'user-17' };
  assert.equal(canOpenAdminPanel(ordinaryUser), false);

  setPath({}, 'constructor.prototype.' + marker, true);
  assert.equal(Object.hasOwn(ordinaryUser, marker), false);
  assert.equal(canOpenAdminPanel(ordinaryUser), true);
  console.log('harmless authorization bypass fixture confirmed');
} finally {
  delete Object.prototype[marker];
}
\`\`\`

This is a local proof, not a recommendation to probe live authorization. In an authorized integration environment, prefer a dedicated test-only flag or benign configuration effect. Never use another user’s data or attempt persistence beyond the test namespace.

Test negative controls too. An explicit own property \`isAdmin: false\` should remain false even when the prototype is polluted. A null-prototype object should not inherit the marker. \`Object.hasOwn(user, 'isAdmin')\` should distinguish an explicit value from inherited data. These controls prove the oracle is observing inheritance rather than an unrelated fixture mistake.

| Oracle | Polluted vulnerable state | Fixed state |
|---|---|---|
| \`Object.hasOwn(Object.prototype, marker)\` | True for global pollution | False |
| \`Object.hasOwn(candidate, marker)\` | False | False unless explicitly set |
| \`candidate[marker]\` | Attacker marker | Undefined or safe own default |
| Authorization outcome | Incorrectly allowed | Denied |
| Child-process exit | Clean controlled result | Clean rejection or safe result |

## Find sources in a Node codebase without overclaiming

Static search gives review candidates, not confirmed vulnerabilities. Look for dynamic assignment, recursive merge, object dictionaries, parsing of nested keys, and libraries that transform user-controlled property paths. Trace whether the key is attacker-controlled and whether validation runs before the assignment.

\`\`\`bash
rg -n -F -e 'Object.assign' -e 'Object.create(null)' -e 'Object.hasOwn' src test
rg -n 'for .* in |split|__proto__|constructor|prototype' src test
npm audit
\`\`\`

The search is intentionally broad and may produce false positives. Review every match in context. \`npm audit\` checks advisories known to the package ecosystem; it does not find custom application logic and does not prove exploitability. Do not report a dependency as vulnerable solely because its name appears in a historical blog post. Capture the installed dependency tree and the current advisory output.

During review, follow data in this order:

1. Input origin: HTTP body, query parameters, message queue, environment-derived configuration, or stored tenant settings.
2. Parser: JSON, URL parameters, YAML, form decoding, or custom dotted-path syntax.
3. Validation: schema, key allowlist, unknown-field rejection, and normalization order.
4. Transformation: merge, clone, setter, reducer, or object spread.
5. Target: ordinary object, null-prototype object, class instance, array, function, or prototype.
6. Sink: authorization, file path, HTTP options, template options, feature flags, or sanitization.

If the input cannot reach the setter, record the dead path instead of manufacturing severity. If a source exists but the sink is unknown, report confirmed prototype modification and bound the impact honestly.

## Exercise an HTTP boundary with a deliberately vulnerable local server

Real defects often depend on parsing and routing. This fixture accepts a dotted path in a JSON body and applies the vulnerable setter. It listens only on loopback and exposes a harmless status response. The worker exits after one request to limit contamination.

\`\`\`js
// local-server.mjs
import { createServer } from 'node:http';
import { setPath } from './vulnerable-setter.mjs';

const server = createServer((request, response) => {
  const chunks = [];
  request.on('data', (chunk) => chunks.push(chunk));
  request.on('end', () => {
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      setPath({}, body.path, body.value);
      const inherited = {}.qaHttpMarker === 'confirmed';
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ inherited }));
    } catch {
      response.writeHead(400, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'invalid request' }));
    } finally {
      delete Object.prototype.qaHttpMarker;
      server.close();
    }
  });
});

server.listen(4300, '127.0.0.1', () => {
  console.log('fixture listening on http://127.0.0.1:4300');
});
\`\`\`

Launch it and send the local payload:

\`\`\`bash
node local-server.mjs &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT

curl --silent --show-error \
  -H 'Content-Type: application/json' \
  --data '{"path":"constructor.prototype.qaHttpMarker","value":"confirmed"}' \
  'http://127.0.0.1:4300/'

wait "$server_pid"
\`\`\`

The response should say that the marker was inherited. A production regression test should expect rejection, safe storage as data, or a false inherited value, depending on the endpoint contract.

## Replace unsafe traversal with a narrow data contract

The strongest fix is to avoid arbitrary dynamic paths. Accept a fixed schema and map approved input fields explicitly. When dynamic keys are genuinely required, reject dangerous path segments at every level, use a null-prototype dictionary or \`Map\`, and ensure consumers check own properties or set safe defaults.

This replacement rejects the three prototype-navigation segments and creates intermediate dictionaries with a null prototype:

\`\`\`js
// safe-setter.mjs
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);

export function setSafePath(target, path, value) {
  const segments = path.split('.');
  if (segments.length === 0 || segments.some((segment) => !segment || forbidden.has(segment))) {
    throw new TypeError('path contains a forbidden or empty segment');
  }

  let cursor = target;
  for (const segment of segments.slice(0, -1)) {
    if (!Object.hasOwn(cursor, segment)) cursor[segment] = Object.create(null);
    const next = cursor[segment];
    if (next === null || typeof next !== 'object') {
      throw new TypeError('path crosses a non-object value');
    }
    cursor = next;
  }

  cursor[segments[segments.length - 1]] = value;
  return target;
}
\`\`\`

Now encode the security properties, not just one payload:

\`\`\`js
// safe-setter.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setSafePath } from './safe-setter.mjs';

for (const path of [
  '__proto__.qaMarker',
  'constructor.prototype.qaMarker',
  'settings.__proto__.qaMarker',
  'settings.constructor.value',
]) {
  test('rejects dangerous path: ' + path, () => {
    assert.throws(() => setSafePath({}, path, true), TypeError);
    assert.equal({}.qaMarker, undefined);
  });
}

test('stores an allowed path in own null-prototype dictionaries', () => {
  const target = {};
  setSafePath(target, 'preferences.theme', 'dark');
  assert.equal(target.preferences.theme, 'dark');
  assert.equal(Object.getPrototypeOf(target.preferences), null);
  assert.equal(Object.hasOwn(target.preferences, 'theme'), true);
});
\`\`\`

Schema validation should also reject unknown properties and define defaults. Test the configured validator with the actual schema and library version in the repository. Do not guess configuration keys from another validator. The desired behavior is library-independent: forbidden keys are rejected before transformation, unrecognized fields cannot flow into a generic merge, and absent security fields receive explicit safe values.

## Treat the Node runtime flag as defense in depth

Node documents \`--disable-proto=delete\` and \`--disable-proto=throw\`: delete removes \`Object.prototype.__proto__\`, while throw raises \`ERR_PROTO_ACCESS\` on access. See https://nodejs.org/docs/latest/api/cli.html#--disable-protomode. This narrows one entry path, but it does not make an unsafe \`constructor.prototype\` traversal safe.

Test both application compatibility and residual exposure:

\`\`\`bash
node --disable-proto=throw --test safe-setter.test.mjs
node --disable-proto=delete --test safe-setter.test.mjs
node --disable-proto=throw pollution-worker.mjs
\`\`\`

The last command can still confirm pollution through the constructor chain, which is the point of the control. Keep the flag as an additional runtime barrier after fixing sources and sinks. Freezing prototypes can provide stronger integrity in tightly controlled runtimes, but it can break code that legitimately modifies built-ins. Test startup, instrumentation, and supported polyfills before adopting it.

OWASP’s prevention guidance recommends \`Map\`, \`Set\`, null-prototype objects, freezing or sealing where compatible, and the Node runtime flag as defense in depth: https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html.

## Diagnose the failure that appears only in the full suite

A realistic failure looks like this: the prototype regression passes alone, but unrelated API tests fail when the full suite runs. Some requests unexpectedly use a different method, an authorization fixture becomes truthy, or a reporter crashes while formatting results. The likely cause is leaked prototype state in a shared process, not random test flakiness.

First run the suspicious file in isolation, then with the preceding test files. Add temporary before-and-after assertions for a unique marker on \`Object.prototype\`. Inspect whether cleanup runs when an assertion throws. Search for top-level imports that execute a payload before the test harness creates hooks. Finally, move every mutation proof into a child process and assert the parent remains clean.

Another common failure is a false negative under \`--disable-proto=throw\`. The suite tests only \`__proto__\`, concludes the service is safe, and misses \`constructor.prototype\`. Add both path families. Conversely, a scanner may claim global pollution after \`Object.assign\` changed only one target object’s prototype. Inspect the exact target and global prototype before assigning severity.

| Symptom | Likely mistake | Correct diagnostic |
|---|---|---|
| Tests fail only after pollution case | Global marker escaped | Child-process isolation and parent oracle |
| \`__proto__\` payload throws, constructor payload works | Runtime flag only | Fix traversal and keep flag as defense in depth |
| One object inherits marker, fresh objects do not | Target prototype changed | Inspect \`Object.getPrototypeOf(target)\` |
| Marker exists, authorization remains denied | Source without demonstrated sink | Trace own-property checks and explicit defaults |
| Audit is clean, custom setter pollutes | Application logic flaw | Test data flow independent of advisories |
| Fix blocks one spelling only | Incomplete segment policy | Table-driven payload family regression |

## Guide AI coding agents with security invariants

An AI coding agent can help enumerate dynamic assignment sites and generate table-driven tests, but require evidence for every claim. Give it a local fixture, the authorized directories, and invariants such as “no test may leave an own property on \`Object.prototype\`” and “security decisions must not trust inherited properties.” Ask it to show the path from input to transformation to sink.

Reject generated code that invents a sanitizer package, assumes JSON parsing alone pollutes, disables tests instead of isolating them, or uses destructive payloads. Also reject a patch that filters only the top-level \`__proto__\` key. Dangerous segments can appear nested, and the constructor chain is independent.

A solid pull-request gate combines focused unit tests for setters and merges, local HTTP integration tests for real parsing, dependency advisory review, and a runtime-flag compatibility job. Preserve payload, source location, target prototype, sink observation, process arguments, and cleanup result in failure artifacts. Those details turn a vague “prototype issue” into a reproducible engineering defect.

## Cover every parser and content-type boundary

An endpoint can be safe for JSON and vulnerable for a different decoder. Inventory every accepted representation instead of replaying one payload through the default content type. URL query parsers may translate bracket or dotted syntax into nested structures. Form decoders can handle repeated fields differently. YAML parsers and message deserializers have their own type and key rules. Test only syntax the installed parser documents, then inspect the resulting JavaScript value before it reaches the merge or setter.

Build a boundary matrix for the application, not a universal payload catalog:

| Boundary | First deterministic oracle | Follow-up question |
|---|---|---|
| JSON body | Own keys and object prototype after parsing | Which copy or merge consumes it? |
| Query parameters | Exact parsed value and nesting | Are parameter names allowed to form paths? |
| Form body | Repeated-key and bracket behavior | Does normalization happen before validation? |
| Configuration file | Parsed schema and unknown fields | Can a tenant supply the file or overlay? |
| Queue message | Deserialized envelope version | Is validation repeated by the consumer? |
| Database document | Stored key shape and provenance | Can previously stored hostile keys reach new code? |

Stored data matters because a patch at the HTTP edge may leave hazardous documents already in a database. After remediation, scan or migrate test fixtures that model legacy records and confirm the read path cannot feed them into an unsafe transformation. This is a common reason a fixed endpoint still fails after deployment: new writes are blocked, but an asynchronous worker later reads an old object and pollutes its process.

Normalization order is another test target. If a validator rejects the literal \`__proto__\` before a decoder transforms encoded input, the normalized key may bypass the check. Conversely, repeatedly decoding input can create behavior that the router itself never performs. Capture the raw request, the framework-parsed object, the post-normalization object, and the exact keys passed to the transformation. Test the real sequence once, without inventing extra decoding stages.

For rejected inputs, assert status, error category, absence of partial writes, clean prototype state, and continued process health. A denial-of-service bug that crashes the worker on a forbidden key is not a satisfactory security fix. For allowed inputs, verify ordinary nested data still works. Security regressions often arise when a broad blocklist rejects legitimate values containing words such as “constructor” in content rather than rejecting dangerous property-path segments.

## Validate the patch against bypass and compatibility cases

A patch should encode invariants at the narrowest shared transformation point. Route-level filters are useful only when every caller passes through them. If a deep setter is shared by HTTP, background jobs, and configuration loading, fixing and testing that setter reduces the chance of a forgotten entry path. Keep boundary validation too, because rejecting unexpected data early improves diagnostics and reduces attack surface.

Create a regression grid with these classes: dangerous segment at the beginning, middle, and end; constructor and prototype split across adjacent segments; empty segments; inherited built-in names; arrays; null values; and valid deep paths. Add mixed-case variants only if the application normalizes keys case-insensitively. JavaScript property names are case-sensitive, so blindly adding case variants without a normalization path produces noise rather than coverage.

Test failure atomicity. A path such as \`settings.safe.constructor.prototype.marker\` must not leave \`settings.safe\` partially created before throwing if the contract promises no mutation on invalid input. The example safe setter validates all segments before it writes, which supports that property for forbidden names. For type conflicts discovered during traversal, decide whether partial creation is acceptable and encode the decision. A clone-then-commit strategy can provide stronger atomicity when required.

Compatibility checks should include serialization, logging, equality, and downstream APIs. Null-prototype dictionaries do not inherit methods such as \`toString\` or \`hasOwnProperty\`; code must use safe static operations such as \`Object.hasOwn\`. A \`Map\` has a different serialization shape from a plain object. These are manageable design differences, but they should be tested rather than discovered in production.

Finally, run the pre-fix proof against the patched build and show why it no longer reaches the state change. A test that merely expects a 400 response may pass because of unrelated authentication or routing. Assert the intended validation error, confirm \`Object.prototype\` and target prototypes are clean, verify the sink remains safe, and send a valid neighboring request to prove the service remains functional. This set of oracles demonstrates remediation instead of accidental payload obstruction.

## Frequently Asked Questions

### Does parsing JSON with a __proto__ key immediately pollute Object.prototype?

No. Standard JSON parsing creates an own property named \`__proto__\` on the parsed object. The dangerous behavior can occur later when application code copies or traverses that property through operations that invoke the legacy setter or through an unsafe recursive merge. \`Object.assign\` can change the prototype of its target in such a case without globally changing \`Object.prototype\`. Test parsing, transformation, target state, and global state separately. This precision prevents both false alarms and missed vulnerabilities in downstream merge logic.

### Is --disable-proto enough to prevent prototype pollution in Node.js?

No. The Node flag can delete the legacy \`Object.prototype.__proto__\` accessor or make access throw, which removes an important attack path. Unsafe code may still reach a prototype through \`constructor.prototype\`, and inherited-property sinks remain risky if another source modifies a prototype. Fix dynamic traversal, validate keys, prefer \`Map\` or null-prototype dictionaries, and use own-property checks or explicit defaults for sensitive decisions. Keep the runtime flag as defense in depth and run compatibility tests under the selected mode.

### How can a QA engineer prove impact without using a dangerous exploit?

Use a unique harmless marker in a child process and a local fixture. First show that an ordinary object inherits a value it does not own. Then connect that marker to a benign sink, such as a test-only feature decision or local authorization function, without accessing real data, executing commands, or making external callbacks. Assert cleanup and parent-process integrity. In an integration environment, use dedicated accounts and an approved endpoint. The report should identify the source, changed prototype, inherited read, and safe observable consequence.

### What should a prototype pollution regression suite cover after the fix?

Cover \`__proto__\`, \`constructor.prototype\`, nested dangerous segments, inherited-name collisions, allowed paths, and non-object traversal. Assert that global prototypes remain unchanged, rejected input produces the documented error, and valid data is stored as own properties. Add sink tests for authorization and configuration defaults, plus a job using the chosen \`--disable-proto\` mode. If third-party parsers or merge utilities are involved, test the installed versions through the real HTTP or message boundary. Run mutation cases in isolated processes so one failure cannot contaminate unrelated tests.
`,
};
