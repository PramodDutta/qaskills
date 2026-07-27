import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP skill content fidelity testing',
  description:
    'MCP skill content fidelity testing guide with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP skill content fidelity testing',
  keywords: [
    'MCP skill content fidelity testing',
    'MCP SKILL.md exact bytes',
    'YAML frontmatter fidelity',
    'markdown body preservation',
    'get_skill_content integration test',
    'skill content checksum test',
  ],
  relatedSlugs: [
    'qaskills-mcp-server-guide',
    'testing-skill-md-yaml-frontmatter-roundtrip',
    'mcp-server-contract-testing-guide',
    'mcp-server-testing-guide-2026',
  ],
  sources: [
    'https://modelcontextprotocol.io/specification/2025-11-25/server/tools',
    'https://nodejs.org/api/fs.html',
    'https://developer.mozilla.org/en-US/docs/Web/API/Response',
  ],
  repoEvidence: [
    'packages/mcp/src/index.ts',
    'packages/web/src/app/api/skills/[id]/content/route.ts',
    'packages/mcp/package.json',
  ],
  content: `MCP skill content fidelity testing must compare the content API text with the tool's returned text character for character, then compare UTF-8 bytes when byte identity is required. Success preserves frontmatter, Markdown spacing, code fences, Unicode escapes, and the final newline. Any JSON conversion, normalization, trimming, or rewriting disproves fidelity.

## What must MCP skill content fidelity testing prove?

MCP skill content fidelity testing must prove that \`get_skill_content\` returns exactly the text supplied by the content API. The comparison should cover frontmatter delimiters, field order, body structure, blank lines, fenced code, escaped characters, and final newline behavior.

The API and MCP tool form two boundaries in one path. The API reconstructs a canonical SKILL.md string, while the tool downloads that response and wraps the same string in MCP text content.

String equality is the primary oracle because production works with decoded text at the tool boundary. A UTF-8 byte comparison can supplement it by re-encoding both controlled strings with the same documented charset.

Do not normalize line endings or trim either side before the exact assertion. Those transformations can hide a lost final newline, collapsed blank line, or carriage-return change that matters to artifact consumers.

The result shape also belongs to the contract. A good call returns one text item, holds the full file in that text, and has no error flag.

The negative oracle should identify the first differing offset and a short escaped window. Printing the entire skill can make CI logs noisy and may expose content unrelated to the failure.

This article does not claim the API preserves original uploaded source bytes. It reconstructs canonical text from stored fields, so fidelity begins with the API-produced response rather than an earlier author file.

The [frontmatter round-trip guide](/blog/testing-skill-md-yaml-frontmatter-roundtrip) covers parse and write loops. Here, the question is if the MCP path changes the file that the API has made.

The [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) defines text content at the protocol layer. Repository tests must still prove the exact QASkills string placed inside that content block.

## Which repository behavior defines the contract?

The MCP side lives in \`packages/mcp/src/index.ts\`. Its \`get_skill_content\` handler builds a content route with the coded slug, calls the shared text helper, and returns that string through \`textResult\`.

The text helper calls \`fetchWithTimeout\` and then \`response.text()\`. It does not call \`response.json()\`, parse YAML, remove the top block, trim spaces, or build the body again.

\`textResult\` creates one object with \`type: 'text'\` and the supplied string. That small wrapper should be asserted exactly because a future conversion to metadata JSON would alter consumers even if visible prose looked similar.

The API side lives in \`packages/web/src/app/api/skills/[id]/content/route.ts\`. It takes a UUID or slug, finds one skill, sends the row to \`buildSkillMarkdown\`, and returns a Markdown reply.

The successful response sets \`Content-Type\` to \`text/markdown; charset=utf-8\`. The declared charset gives byte comparison tests a clear encoding when they convert expected and actual strings.

Current reconstruction starts with \`---\`, emits YAML lines from selected stored fields, closes frontmatter, inserts one blank line, appends the body, and finishes with a newline. When full description is absent, it creates a heading and description fallback body.

The route also has a controlled fallback for one known skill and JSON errors for missing or failed lookups. Fidelity success cases should avoid those branches first, then test them separately if they are part of release scope.

The MCP package metadata in \`packages/mcp/package.json\` records version, Node engine, and SDK dependency. Include those values in a cross-package failure report because decoding or bundling differences may follow runtime changes.

The [Response text reference](https://developer.mozilla.org/en-US/docs/Web/API/Response) describes decoding the body to text. That behavior explains why an MCP string check occurs after HTTP decoding, not against an opaque response stream.

MCP skill content fidelity testing should preserve this ownership split. The web route owns canonical construction and headers, while the MCP package owns fetching the exact route and returning its decoded text unchanged.

## How should QA teams test MCP SKILL.md exact bytes?

MCP SKILL.md exact bytes testing should start with a controlled API string containing features that transformations often damage. Include delimiters, arrays, nested-looking Markdown, blank lines, a fenced example, trailing spaces if supported, an escaped Unicode sequence, and one final newline.

First, invoke the content route or its reconstruction boundary with a deterministic database row. Capture the response text and verify its content type before involving the MCP package.

Second, serve that exact reply to the saved \`get_skill_content\` handler. Demand a strict match between API text and the MCP text item with no cleanup step.

Third, encode each string with \`Buffer.from(value, 'utf8')\`. Byte equality then proves the same decoded characters yield the same UTF-8 sequence under the route's declared charset. The [Node file-system documentation](https://nodejs.org/api/fs.html) is the approved reference for later file-based byte checks.

This does not compare database source bytes because the database stores fields rather than one opaque uploaded file. State the starting boundary clearly in the test name and failure report.

Use a fresh Response for each call. Calling \`text()\` uses its body, so one shared value can make a false empty result in the next case.

The URL must include the coded slug and \`/content\` end. A mock for all GET calls could give Markdown to the data route and let a route bug pass.

Check that \`response.json\` is not used. A JSON cast could strip the text form or fail on YAML even when the HTTP body itself is right.

Add one empty-body case since an empty string is still valid text at this helper layer. A product check may reject empty skill text elsewhere, but this match test must not add fallback prose.

Use the [QASkills MCP guide](/blog/qaskills-mcp-server-guide) for user call context. Keep exact-byte tests based on fixed text, not a skill list row that can change after it goes live.

MCP skill content fidelity testing should report both character and byte offsets when possible. Character context helps reviewers read the difference, while byte context identifies encoding and newline faults precisely.

## Test matrix for YAML frontmatter fidelity

The YAML frontmatter fidelity matrix should isolate one content feature per row while retaining one full-file integration fixture. Focused rows explain failures, and the complete fixture protects interactions among fields and body formatting.

Expected output must come from the API-produced string for end-to-end cases. Hand-writing a second reconstruction in the MCP test risks repeating assumptions and missing a route change.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| Frontmatter delimiters | Canonical response beginning and ending with \`---\` | Both delimiters remain at exact offsets | Delimiter removed or indented | Content API route |
| Field ordering | Name, description, version, author, license | MCP text matches API order exactly | Parser reorders keys | \`packages/mcp/src/index.ts\` |
| Array values | Tags and agents in generated YAML | Brackets, commas, and spaces remain | JSON conversion changes syntax | Content API route |
| Blank lines | Separator and body paragraphs | Every newline sequence is equal | Trimming collapses structure | Response text reference |
| Fenced code | Body with a TypeScript fence | Fence markers and indentation remain | Rendering or escaping rewrites body | \`packages/mcp/src/index.ts\` |
| Escaped Unicode | Body contains controlled \`\\u00e9\` source text | Expected decoded string re-encodes equally | Replacement or normalization changes bytes | UTF-8 response header |
| Final newline | Canonical body ends with one newline | MCP text ends with the same byte | Helper trims or adds another newline | Content API route |
| Missing description body | Row uses generated fallback body | MCP returns exact API fallback | Tool invents a separate fallback | Content API route |

The mark row catches YAML parse by mistake. A tool that returns only the body could still look fine to a person while it breaks install tools that need all of SKILL.md.

The field-order row does not claim YAML meaning depends on key order. It asserts artifact identity because this endpoint publishes canonical text that downstream checksum and cache logic may compare.

Array formatting deserves its own row. Converting \`[api, smoke]\` into JSON syntax or a multiline list can preserve data while violating exact content fidelity.

The escaped-Unicode row should use controlled source that remains ASCII in test code, then build the intended character at runtime. This keeps repository files portable while still exercising UTF-8 encoding.

The final-newline row should compare length and final byte explicitly. Many generic equality diffs make one missing newline difficult to see, especially after Markdown rendering.

Run a full file case after the small rows. It should join YAML, prose, a table or list, and code so the result looks like a real skill file.

MCP skill content fidelity testing should not accept a normalized checksum for an exact contract unless that policy is explicit. Normalization is useful only when the product intentionally treats selected differences as equivalent.

## What failures expose markdown body preservation?

Markdown body preservation fails when the MCP path trims the body, changes indentation, decodes escapes twice, alters code fences, normalizes line endings, or appends presentation text. Each change can affect rendering, instructions, or checksums.

Put guard marks near weak parts. One before a fence and one before the last line break make offsets clear without a large screen diff.

Test leading spaces inside code separately from paragraph indentation. Markdown gives those spaces structural meaning, so whitespace-only comparison settings must remain disabled.

Put JSON-like, YAML-like, and Markdown text in one fixed body. The tool should treat it all as raw reply text and must not pick a parser from how it looks.

Avoid importing a Markdown renderer into this suite. Rendering equality can hide different source, while installers and editors consume the source string itself.

The first code sample matches API text with the saved MCP handler result. It also proves route choice and stops a JSON read from being used by mistake.

\`\`\`typescript
import { expect, it, vi } from 'vitest';

it('returns the exact content API text through get_skill_content', async () => {
  const apiText = [
    '---',
    'name: api-checks',
    'tags: [api, smoke]',
    '---',
    '',
    '## Run checks',
    '',
    '    const marker = "caf\\\\u00e9";',
    '',
  ].join('\\n');
  const response = new Response(apiText, {
    status: 200,
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
  global.fetch = vi.fn().mockResolvedValue(response);
  const tool = (await captureRegisteredTools()).get('get_skill_content')!;

  const result = await tool.handler({ slug: 'api-checks' });

  expect(String(vi.mocked(fetch).mock.calls[0][0]))
    .toEndWith('/api/skills/api-checks/content');
  expect(result).toEqual({
    content: [{ type: 'text', text: apiText }],
  });
  expect(Buffer.from(result.content[0].text, 'utf8'))
    .toEqual(Buffer.from(apiText, 'utf8'));
});
\`\`\`

The set value is one string made before the handler call. The check does not build set YAML from returned text, which could let the same bad rewrite hide.

The second example creates a compact diagnostic for one changed byte. It keeps failure artifacts useful without publishing the entire controlled skill.

\`\`\`typescript
function firstByteDifference(expected: Buffer, actual: Buffer) {
  const limit = Math.max(expected.length, actual.length);
  for (let index = 0; index < limit; index += 1) {
    if (expected[index] !== actual[index]) {
      return {
        index,
        expected: expected.subarray(Math.max(0, index - 8), index + 9).toString('hex'),
        actual: actual.subarray(Math.max(0, index - 8), index + 9).toString('hex'),
      };
    }
  }
  return null;
}

it('retains the canonical final newline', async () => {
  const expected = Buffer.from(apiText, 'utf8');
  const actual = Buffer.from(await invokeContentToolText(), 'utf8');

  expect(firstByteDifference(expected, actual)).toBeNull();
  expect(actual.at(-1)).toBe(0x0a);
});
\`\`\`

Use this error clue with the main check, not in place of it. A full byte match still makes the real pass or fail choice.

## CI coverage for get_skill_content integration test

A get_skill_content integration test should connect the web reconstruction output to the MCP handler with controlled process boundaries. It does not need a public database or remote deployment to prove text transit.

Run the web side first and save its reply text in memory. Give that exact value through a URL-aware fetch stub when MCP asks for the right content route.

Use separate package tests for route database selection and fallback behavior. The cross-package case should focus on successful canonical output so a database mock failure does not obscure transit fidelity.

Set the response header exactly as production does. If runtime decoding behavior changes, the fixture should still state the intended UTF-8 charset explicitly.

Run CI on the minimum supported Node release and the primary release runtime. Record package version, runtime version, response length, and checksums when equality fails.

Block a release on each string or UTF-8 byte diff, wrong route, JSON read, lost text wrap, odd error flag, or changed final line break. Each fault must name its first bad edge.

Keep only short escaped spans near the first diff. Full fixed test files can stay in source, but build logs should not print any skill body from wide smoke tests.

Run the suite after changes to \`packages/mcp/src/index.ts\`, \`packages/web/src/app/api/skills/[id]/content/route.ts\`, \`packages/mcp/package.json\`, or the route's text builder. That path list keeps each owner clear.

Pair the focused job with the [MCP server contract guide](/blog/mcp-server-contract-testing-guide) when registration shape also changes. Content identity and protocol discovery are related but should produce separate failures.

MCP skill content fidelity testing should include one built MCP package check. Source tests can miss a bundle rewrite or stale release file that changes how the reply is read.

## How should skill content checksum test be asserted?

A skill content checksum test should hash exact UTF-8 bytes from the API text and returned MCP text. Equal hashes support identity only when both sides use the same encoding and no normalization occurs before hashing.

Always keep one direct equality assertion beside checksum checks. Hash equality offers concise artifacts, while direct comparison gives a useful diff and avoids turning encoding setup into a hidden assumption.

Select a stable algorithm available in the supported runtime, such as SHA-256. Record algorithm, encoding, byte length, and digest together so another job can reproduce the observation.

Do not hash JavaScript object serialization of the MCP result. That includes wrapper syntax and may vary independently from the content text being protected.

Do not trim or convert line endings before hashing an exact contract. If a later portability policy permits CRLF and LF equivalence, define a separate normalized digest with a different name.

Add one change case that removes the final line break and prove the hash changes. A test with no such guard may hash the wrong value or a fixed string.

Add one more change in code fence spaces. This proves the hash sees source diffs that a page view may not show.

For a fail log, find the first byte diff before you show hashes. Two unlike hashes prove a change but do not tell the owner if YAML, body, or last line changed.

The [skills directory](/skills) can give a smoke-test slug after fixed CI checks pass. Store only reply length and hash for that run since live text is allowed to change.

MCP skill content fidelity testing should mark live hash changes as review signs, not clear source bugs. The fixed API-to-MCP match stays the release gate.

## Step-by-step test implementation

Build the suite by connecting one canonical producer result to one opaque-text consumer. This approach avoids two hand-written copies of expected SKILL.md.

1. Read \`packages/mcp/src/index.ts\` and the content route, then record URL, decoder, wrapper, header, reconstruction, and final-newline behavior.
2. Create controlled rows for frontmatter, arrays, blank lines, fenced code, escaped Unicode text, fallback body, and final newline.
3. Produce canonical text through the web boundary, serve it from an exact content URL, and capture the production MCP handler.
4. Execute the expected path and assert URL, content type, strict string equality, UTF-8 buffer equality, result shape, and absent JSON parsing.
5. Remove or alter one fragile byte per negative case, then assert a stable first-offset diagnostic and no false normalized success.
6. Run source and built-package checks in CI, retaining lengths, digests, and short escaped difference windows for ownership.

Keep test text build on the web side and wire checks on the MCP side. A shared set-text helper can make both packages copy one bug and pass as a pair.

Reset fetch and code mocks after each case. A used Response or old handler can make an empty body that looks like a trim bug.

Use one test file only if the package rig needs file transfer. The core \`get_skill_content\` path must not write on disk, so a new file is its own side-effect fault.

The [getting started page](/getting-started) can aid a hand rerun across packages. CI should need no account, skill list write, or public web call.

Review every negative test for one controlled difference. Multiple simultaneous mutations make the first-offset report accurate but the ownership conclusion ambiguous.

## Failure triage and regression ownership

Start with the first diff offset. A diff in YAML or fallback body likely belongs to web build, while a good API value that changes later belongs to MCP.

If API text is right but the request URL is wrong, check slug code and the \`/content\` end. MCP owns route choice; the web route owns the ID it receives.

If the URL is right but JSON parse runs, check the text helper call. MCP should use \`response.text()\` and return raw content with no field cast.

If just line ends or the last line differ, check reply reuse, trim code, and bundle rewrites. Do not change the match rule before you find the first part that changed bytes.

If Unicode bytes differ while text looks close, check code points, text form, charset header, and UTF-8 bytes. Name an owner only after proof shows which edge made the change.

If the MCP wrap differs but inner text matches, send the bug to wire setup. Skill text may still be whole, but callers need the set text object too.

If source passes and a built package fails, check package build and bundle output. The release owner should fix stale or changed code before API or MCP tests change.

If a live skill hash changes while fixed CI passes, check the current data row and set API reply. The text owner may approve that change with no claim that the wire harmed it.

The [blog index](/blog) helps find parse, route, and MCP guides during triage. Link the fail log to exact offsets and package edges, not a page screenshot.

Close the bug after API text, wire text, bytes, wrap, and last line all match. One like hash is not enough when the test may have hashed a trimmed or wrong field.

## Frequently Asked Questions

### What is the starting point for MCP SKILL.md exact bytes?

The exact contract starts with the UTF-8 text produced by the content API, not an earlier author upload. The route reconstructs canonical SKILL.md from stored fields. Tests should compare that response with the MCP text result, then re-encode both strings identically for byte equality.

### How do tests prove YAML frontmatter fidelity?

Use canonical API text containing delimiters, ordered fields, arrays, blank lines, and a final newline. Return it through the captured content handler and assert strict string equality. Separate focused rows should identify delimiter, ordering, spacing, or newline drift without parsing YAML again.

### Should markdown body preservation use rendered output?

No. Rendering can make different Markdown source look equivalent and can hide indentation, fence, escape, or newline changes. Compare source strings and UTF-8 bytes directly. A renderer may have separate visual tests, but it cannot replace artifact fidelity assertions for installers and editors.

### When is a normalized checksum acceptable?

Only when the product explicitly defines selected source differences as equivalent, such as an approved line-ending policy. Give that digest a distinct normalized name and retain exact checks elsewhere. Silent trimming or normalization before hashing would hide the very changes this transit contract must detect.

### What should a content fidelity failure report contain?

Report producer and consumer byte lengths, encoding, checksum algorithm and values, first differing offset, and short escaped or hexadecimal windows. Also include request route, runtime, and package version. Avoid printing an entire skill body when a small controlled context identifies the fault.

## Conclusion

MCP skill content fidelity testing proves the API's set SKILL.md reaches \`get_skill_content\` with no parse, trim, rewrite, or wrap drift. Strict text and byte matches, plus first-offset logs, make YAML and body changes easy to own.

Review the [QASkills MCP integration](/mcp), then browse verified QA agent skills through the [skills directory](/skills). Use the [getting started page](/getting-started) and [round-trip guide](/blog/testing-skill-md-yaml-frontmatter-roundtrip) with this API-to-MCP matrix before release.`,
};
