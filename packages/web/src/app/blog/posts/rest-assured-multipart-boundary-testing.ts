import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'REST Assured multipart boundary testing',
  description:
    'REST Assured multipart boundary testing: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'API Testing',
  primaryKeyword: 'REST Assured multipart boundary testing',
  keywords: [
    'REST Assured multipart boundary testing',
    'REST Assured multipart boundary',
    'multipart repeated field test',
    'REST Assured file upload headers',
    'multipart filename encoding',
    'API multipart content type',
  ],
  relatedSlugs: [
    'rest-assured-java-api-testing',
    'rest-assured-json-schema-validation-guide',
    'rest-assured-vs-karate-detailed-comparison-2026',
    'api-testing-best-practices-guide',
  ],
  sources: [
    'https://github.com/rest-assured/rest-assured/wiki/Usage',
    'https://www.rfc-editor.org/info/rfc9110',
    'https://www.rfc-editor.org/info/rfc7578',
  ],
  repoEvidence: [
    'seed-skills/restassured-api-framework/SKILL.md',
    'seed-skills/rest-assured-api/SKILL.md',
  ],
  content: `- REST Assured multipart boundary testing verifies the request at a capture server, not only through a successful upload response. The test compares the boundary declared by Content-Type with body delimiters, preserves repeated field order, checks each part's name, filename, media type, and bytes, and rejects malformed framing before application processing.

## What does REST Assured multipart boundary testing verify?

- The contract joins wire framing with parsed semantics. A generated multipart request must declare one boundary, use that exact value for every delimiter, terminate it correctly, and deliver the expected ordered parts without byte or metadata loss.

- The [multipart/form-data specification](https://www.rfc-editor.org/info/rfc7578) defines the central rules. Boundaries delimit parts using CRLF and two hyphens, the boundary parameter belongs in Content-Type, and the delimiter value must not occur inside an encapsulated part.

The same RFC says multiple files for one field use separate parts with the same name parameter. It also permits a Content-Type on each part and recommends an appropriate media type, or application/octet-stream when the type is unknown.

REST Assured multipart boundary testing should prove these observations:

- REST Assured generates the request boundary for the ordinary positive path. The test must not hardcode a top-level Content-Type value that disagrees with the generated body.

- The capture server stores the raw top-level Content-Type, raw request bytes or a safe digest, delimiter positions, parsed part order, names, filenames, part media types, selected headers, and byte digests.

- The declared boundary parses as one valid parameter and appears in opening, intermediate, and closing delimiters. A boundary-like byte sequence inside file content cannot split a part.

- Two parts with the same field name remain two ordered values. The parser and application adapter must not silently overwrite the first with the second.

- A binary part arrives byte-for-byte unchanged and carries the explicit expected media type. Newline conversion or character decoding must not touch binary content.

- Filename handling follows a documented compatibility policy. Raw wire evidence, parsed value, normalized display value, and safe storage name remain distinct.

- An empty text field, an empty file, and an absent part produce different parsed states. The endpoint cannot treat all three as missing.

- A declared boundary that differs from body delimiters fails as malformed input. The application handler should not receive a partial part list as if the request were valid.

- The repository file seed-skills/rest-assured-api-framework/SKILL.md provides a Java framework structure with request specifications, reusable assertions, payload management, reporting, and teardown. It does not supply this article's boundary oracle.

- The file seed-skills/rest-assured-api/SKILL.md contains an explicit file-upload example using multipart content type, multiPart, a file, a part media type, and a text form parameter. This article extends that positive upload into raw framing and repeated-field tests.

- Use the [REST Assured Java API guide](/blog/rest-assured-java-api-testing) for the broader request and specification workflow. This page owns multipart framing and server-boundary evidence.

## How do you build a REST Assured multipart boundary?

- A REST Assured multipart boundary fixture needs a capture endpoint before the real upload handler. The endpoint should read the exact request bytes, parse the top-level media type, validate framing, parse parts with the production library, and return a safe JSON summary.

- Use a deterministic file set: one short ASCII text file, one binary array containing zero and high bytes, one empty file, and one UTF-8 filename. Generate expected SHA-256 digests before sending anything.

Create the baseline with one text part and one binary file part. Let REST Assured create the top-level boundary while the test sets each part's control name, filename, and media type.

- The capture response should include a redacted Content-Type, extracted boundary token, count of opening delimiters, whether the closing delimiter exists, ordered part summaries, and whole-body digest. Do not echo arbitrary upload bytes into CI logs.

Run the positive baseline first and require HTTP success, one parsed text part, one parsed file part, matching digests, and no parser warnings. That proves the capture server before malformed cases are introduced.

- This Java example adapts the upload pattern from seed-skills/rest-assured-api/SKILL.md and the reusable specification style in seed-skills/restassured-api-framework/SKILL.md. The capture summary fields are fixture-specific.

\`\`\`java
byte[] binary = new byte[] {0, 1, 2, 10, 13, 127, (byte) 255};

given()
    .baseUri(captureServerUrl)
    .multiPart("description", "boundary baseline")
    .multiPart(
        new MultiPartSpecBuilder(binary)
            .controlName("file")
            .fileName("sample.bin")
            .mimeType("application/octet-stream")
            .build()
    )
.when()
    .post("/capture/multipart")
.then()
    .statusCode(200)
    .body("mediaType", equalTo("multipart/form-data"))
    .body("declaredBoundary", not(emptyString()))
    .body("closingDelimiterPresent", equalTo(true))
    .body("parts.size()", equalTo(2))
    .body("parts[0].name", equalTo("description"))
    .body("parts[0].text", equalTo("boundary baseline"))
    .body("parts[1].name", equalTo("file"))
    .body("parts[1].filename", equalTo("sample.bin"))
    .body("parts[1].contentType", equalTo("application/octet-stream"))
    .body("parts[1].sha256", equalTo(binaryDigest));
\`\`\`

- The [REST Assured usage wiki](https://github.com/rest-assured/rest-assured/wiki/Usage) documents multiPart overloads, multiple multipart entities, filenames, control names, media types, and MultiPartSpecBuilder. Use the API that makes each expected property explicit.

- Do not attach a generic request specification that forces application/json. The repository framework example uses JSON for ordinary API requests, so the multipart test must override or omit that incompatible default deliberately.

- Use the [REST Assured JSON schema guide](/blog/rest-assured-json-schema-validation-guide) for validating the capture summary response. Keep request-wire assertions separate from response schema assertions.

## What breaks a multipart repeated field test?

A multipart repeated field test breaks when the server maps parts directly into a single-value object. The second value overwrites the first, and an assertion that checks only the last value falsely passes.

Use two parts named tag with values alpha and beta. Require ordered parsed entries, count two, and an application-level list containing both values in the documented order.

- The RFC's repeated-name rule is especially important for multiple files. Separate file parts can share one name, so a parser that requires unique names is not broadly compatible with multipart/form-data.

- Client helpers can also change ordering when form parameters and multipart specifications are added through different APIs. Capture raw delimiter order and parsed order rather than assuming chained method order always reaches the wire unchanged.

- A comma-joined string is not equivalent to repeated parts. Reject a server or proxy that collapses two fields into one value unless the application contract explicitly defines that transformation.

- An empty repeated field must remain present. Test alpha, empty, beta so filtering blank values cannot look like a harmless normalization.

Different media types under one repeated name need per-part assertions. A list of uploaded documents can contain PDF and plain text without one shared Content-Type.

- Boundary-like bytes inside a file can expose naive parsers. Include a sequence that resembles two hyphens and a prefix, while ensuring the exact declared delimiter never appears in the payload.

Proxy buffering or body inspection can reorder, normalize, or reject parts before the application sees them. Run one direct-origin case and one public-edge case, then label which layer first changed the evidence.

- Parallel uploads can contaminate a capture ledger. Give each request a run identifier outside the uploaded filename and select exactly one server record before asserting.

- The [REST Assured versus Karate comparison](/blog/rest-assured-vs-karate-detailed-comparison-2026) can guide framework decisions. Repeated-field fidelity still needs a network-side oracle regardless of client.

## REST Assured file upload headers fixtures and controls

- REST Assured file upload headers need positive, negative, boundary, and cleanup controls. Each case should change one part property while preserving target URL, server parser, and unrelated request fields.

- The single-file control sends one text field and one binary file. It proves generated framing, part names, media types, filename, bytes, response summary, and capture cleanup.

- The repeated-name control sends tag alpha and tag beta as separate parts. It requires two ordered parts and no comma joining or last-value overwrite.

- The binary-type control sends known bytes with application/octet-stream. It checks both byte digest and part Content-Type.

- The empty-file control sends zero bytes with a filename. It remains a present file part rather than disappearing or becoming an absent field.

- The absent-file control omits the part entirely. Its application response must differ from the empty-file case according to the API contract.

- The quoted-filename control uses spaces, quotes, and a safe ASCII fallback case. It captures the raw Content-Disposition and parsed filename separately.

- The UTF-8 filename control uses a fixture generated from code points. It avoids non-ASCII source text while testing the encoded wire value and parser policy.

- The boundary-content control places boundary-like bytes inside binary data. The parser must preserve the full digest and part count.

- The malformed-boundary control declares one value and frames the body with another. It expects a client or server parsing failure before normal upload handling.

- The transport control sends the same generated body through each supported proxy path. It requires equal part order, metadata, and byte digests while recording message framing separately, so a transfer change cannot be mistaken for a multipart boundary change.

- The repeated-run control creates a new capture ID and output directory. No part, digest, or parser warning from the first run can remain.

The top-level header and part headers answer different questions. Content-Type on the request declares multipart/form-data plus a boundary, while each part can declare its own media type.

- Capture Content-Disposition for every part because it carries the name and optional filename. Do not store complete arbitrary header blocks when they may include application secrets.

Use the [API testing best practices guide](/blog/api-testing-best-practices-guide) for wider status, authentication, and cleanup design. Keep this matrix attached to a synthetic capture endpoint.

## How should multipart filename encoding be asserted?

- multipart filename encoding should compare raw Content-Disposition bytes, parser output, application normalization, and safe storage identity separately. One equality check cannot represent all four stages.

- RFC 7578 says a filename parameter should identify file content when a meaningful name exists. It also warns receivers not to use supplied path information blindly and describes UTF-8 bytes as a common deployed practice.

- The same RFC says the filename-star parameter from RFC 5987 must not be used for multipart/form-data. A compatibility suite should therefore test what the supported client emits rather than inventing that alternate parameter.

- Use an ASCII baseline such as report-01.txt for exact equality. It proves ordinary quoting and Content-Disposition parsing before extended characters are added.

- Generate the UTF-8 case in Java from code points so this TypeScript article remains ASCII. Record the expected Unicode scalar sequence, UTF-8 byte digest, raw parameter form, parsed Java string, and normalized safe display value.

Include spaces and a literal quote in a separate controlled name. The raw header must escape or quote it correctly, while the parsed value must match the documented server policy.

- Include path-shaped names such as ../report.txt only in an isolated security fixture. The receiver must reduce them to an approved storage name and never write outside its owned temporary directory.

- Do not require the stored object key to equal the supplied filename. Secure systems often replace it with a generated identifier while preserving a sanitized display name as metadata.

- Exact equality fits the ASCII case, byte digest, and expected normalized output. A compatibility allowlist fits supported encodings across pinned client and parser versions.

- The response should never echo an unsanitized filename into HTML. Keep multipart parsing, storage naming, and output encoding as distinct checks.

- Open the [REST Assured Java guide](/blog/rest-assured-java-api-testing) for reusable assertions and request setup. Add filename cases only after the baseline framing case is exact.

## API multipart content type in CI

- API multipart content type checks belong in CI because client upgrades, parser upgrades, proxies, and shared request specifications can all change framing. Run direct-capture and public-edge positives before malformed negative cases.

- The [HTTP semantics specification](https://www.rfc-editor.org/info/rfc9110) provides the general meaning and processing model for HTTP fields, content metadata, requests, and responses. RFC 7578 supplies the specific multipart/form-data body rules used by this gate.

- Save Java, REST Assured, HTTP client, server parser, and proxy versions; collection or test commit; run ID; safe Content-Type; boundary digest; delimiter count; closing state; ordered part summaries; byte digests; response status; report path; and cleanup result.

- Do not retain arbitrary uploaded content, complete private filenames, Authorization, cookies, or raw production headers. Use synthetic files and cryptographic digests for shared evidence.

- Fail CI when boundary parameters are missing or inconsistent, closing delimiters are absent, part counts differ, repeated names collapse, order changes, media types drift, filename policy fails, bytes change, malformed input reaches the handler, or cleanup is incomplete.

Run the capture server on an isolated port and allocate one ledger per worker. Parallel tests must not read the latest request globally because another worker can replace it.

- The repository framework skill includes teardown and reporting, while the API skill includes explicit upload assertions. Combine those patterns without importing the JSON Content-Type default into multipart requests.

Open the [QA skills directory](/skills) for API framework patterns. Keep the boundary suite small enough that raw and parsed evidence can be reviewed together.

## REST Assured multipart boundary testing comparison matrix

- The matrix distinguishes valid generated framing from deliberately malformed raw requests. REST Assured multipart boundary testing should never use the malformed builder for its positive client contract.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Single text field and file | Generated boundary, ASCII text, known binary | Two ordered parts, matching metadata and digests | Success response without wire evidence | seed-skills/rest-assured-api/SKILL.md |
| Two parts with same field name | tag alpha followed by tag beta | Two ordered values remain distinct | Parser keeps only final value | [RFC 7578](https://www.rfc-editor.org/info/rfc7578) |
| Binary file with explicit media type | Known bytes and application/octet-stream | Part media type and digest match | Text decoding or newline change corrupts bytes | [REST Assured usage](https://github.com/rest-assured/rest-assured/wiki/Usage) |
| Unicode and quoted filename | Generated UTF-8 plus separate quoted ASCII case | Raw, parsed, normalized, and stored values follow policy | Unsafe path or unsupported parameter is accepted | seed-skills/restassured-api-framework/SKILL.md |
| Declared boundary differs from body | Raw body uses actual-boundary, header declares other | Request rejected before upload handler | Partial parts reach application as valid | [HTTP semantics](https://www.rfc-editor.org/info/rfc9110) |

- The first four rows exercise normal multipart generation. The final row deliberately bypasses the helper to prove the server rejects invalid framing.

- Keep the capture parser and production parser versions aligned when possible. If they differ, record both and treat disagreement as a compatibility finding.

- Use the [blog index](/blog) when the matrix exposes proxy, upload security, schema, or framework setup issues. Preserve boundary and part digests with the exact row.

## How do you implement REST Assured multipart boundary testing?

- Implementation needs one positive builder and one separate malformed request builder. Sharing them risks hardcoded Content-Type leaking into ordinary upload tests.

- The negative example creates raw ASCII multipart bytes with one delimiter while declaring another. It follows boundary validation and negative-case guidance from both repository skills without claiming REST Assured generated the mismatch.

\`\`\`java
String declaredBoundary = "declared-boundary";
String actualBoundary = "actual-boundary";
String body = String.join("\\r\\n",
    "--" + actualBoundary,
    "Content-Disposition: form-data; name=\\"description\\"",
    "Content-Type: text/plain",
    "",
    "malformed boundary case",
    "--" + actualBoundary + "--",
    ""
);

given()
    .baseUri(captureServerUrl)
    .header(
        "Content-Type",
        "multipart/form-data; boundary=" + declaredBoundary
    )
    .body(body.getBytes(StandardCharsets.US_ASCII))
.when()
    .post("/capture/multipart")
.then()
    .statusCode(anyOf(is(400), is(422)))
    .body("error.code", equalTo("INVALID_MULTIPART_BOUNDARY"))
    .body("handlerInvoked", equalTo(false));
\`\`\`

Follow this procedure for REST Assured multipart boundary testing:

1. Read seed-skills/restassured-api-framework/SKILL.md and seed-skills/rest-assured-api/SKILL.md, then document request, assertion, capture, report, CI, and teardown duties.
2. Create an isolated capture server for text parts, repeated names, binary files, generated filenames, empty parts, and a deliberately malformed boundary.
3. Run the positive generated case, capture Content-Type and raw framing, parse ordered parts, compare metadata and byte digests, and confirm cleanup.
4. Inject repeated names, explicit media types, empty versus absent files, quoted and UTF-8 filenames, boundary-like content, proxy forwarding, and mismatch separately.
5. Compare declared boundary, delimiters, part order, names, filenames, media types, bytes, parser result, handler state, and status with the five-row matrix.
6. Run direct and edge cases in CI, retain safe digests and summaries, clear ledgers and temporary uploads, stop the fixture, and repeat the positive case.

- Assert the malformed response contract only when the application owns it. If a proxy rejects the request first, capture that layer's stable status and prove the application handler remained untouched.

- Never send malformed bodies to a production upload route. Keep destructive parsing cases within the owned fixture environment and use synthetic bytes.

- The [API testing best practices guide](/blog/api-testing-best-practices-guide) can add authentication, rate limits, and data cleanup after framing correctness passes. Preserve the capture server as the network-side oracle.

## Frequently Asked Questions

### Should REST Assured set the multipart boundary manually?

- For ordinary positive uploads, let REST Assured generate the boundary that matches its serialized body. Capture and assert the result at the server. Set a manual boundary only in a separate negative fixture where the body is also constructed explicitly to test mismatch rejection.

### How do you prove repeated multipart fields were preserved?

Send two separate parts with the same name and distinct controlled values. Assert raw delimiter order, parsed part count, ordered names and values, and the application list. A map containing only the final value is evidence of collapse, even when the endpoint returns success.

### Which headers belong to each uploaded file part?

- Each part needs Content-Disposition with its field name and an optional filename. A file part should carry the known media type, or application/octet-stream when its type is unknown. Assert these part headers separately from the request's top-level multipart/form-data Content-Type and boundary parameter.

### How should a test handle non-ASCII multipart filenames?

- Generate the filename from code points, then compare expected UTF-8 bytes, raw Content-Disposition, parser output, normalized display metadata, and safe storage identity. Keep an ASCII baseline. Do not require unsafe path text or an unsupported filename-star parameter to survive unchanged.

### What proves a multipart boundary mismatch was rejected safely?

- The declared parameter and body delimiters must differ in a controlled raw request, the parser must return a stable client-error response, and the normal upload handler must remain uninvoked. Capture parser diagnostics without echoing file bytes, then repeat the valid generated request after cleanup.

### What should CI retain from a multipart upload fixture?

- Keep client and parser versions, fixture revision, run ID, safe Content-Type, boundary digest, delimiter and closing state, ordered part names, filename categories, media types, byte lengths and digests, response status, handler state, report path, and cleanup result. Avoid retaining arbitrary upload content.

## Conclusion

- REST Assured multipart boundary testing is reliable when generated requests are observed at a capture server and malformed requests use a separate raw builder. Boundary agreement, closing syntax, repeated names, filenames, media types, byte digests, parser state, and handler isolation each need direct evidence.

Begin with one text field and one binary file, then add repeated names, empty parts, filename cases, and boundary-like bytes. Run the mismatch only in an owned fixture and repeat the positive upload after cleanup.

- Review the [REST Assured Java API testing guide](/blog/rest-assured-java-api-testing), then open the [QA skills directory](/skills) and implement the REST Assured multipart boundary testing matrix in the next test run.`,
};
