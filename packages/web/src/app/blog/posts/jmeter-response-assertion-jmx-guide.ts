import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'JMeter Response Assertion JMX Format: Complete 2026 Guide',
  description:
    'JMeter Response Assertion JMX reference: ResponseAssertion XML structure, test_field, the test_type bitmask, test_strings, with copy-paste JMeter 5.6.3 examples.',
  date: '2026-06-02',
  category: 'Reference',
  content: `
# JMeter Response Assertion JMX Format Guide 2026

Apache JMeter stores every test plan as an XML document with a \`.jmx\` extension, and the single element most engineers need to read, edit, or generate by hand is the Response Assertion. When you add a Response Assertion in the JMeter GUI you are really constructing a \`ResponseAssertion\` XML node with a very specific shape: a collection property holding the strings to match, an integer bitmask describing the comparison, and a string property naming the field to test. Get any one of those wrong and JMeter either ignores the assertion silently or throws a confusing parse error when it loads the plan.

This guide is a precise, copy-paste reference to the Response Assertion JMX format as it exists in JMeter 5.6.3, the current stable release in 2026. We document the full \`ResponseAssertion\` element, every value the \`test_field\` property accepts, how the \`test_type\` integer bitmask encodes "Contains," "Matches," "Equals," "Substring," plus the Not and Or modifiers, and how the \`test_strings\` collection holds your patterns. We finish with several complete, runnable assertion blocks you can drop straight into a \`.jmx\` file. Whether you searched for "jmeter response assertion jmx format," "jmeter test_type values," or "ResponseAssertion XML example," this is the reference you want.

If you are building out a broader performance suite, our [load testing skills hub](/skills) collects installable JMeter and k6 skills for AI coding agents, and the [blog](/blog) has deeper walkthroughs on distributed JMeter and k6 comparisons. The reason editing JMX by hand matters is automation: when you generate test plans programmatically, template assertions across hundreds of endpoints, or diff plans in code review, you work with the XML directly, not the GUI.

## What a Response Assertion Is

A Response Assertion is JMeter's mechanism for verifying that a sampler's response matches what you expect. Without assertions, a load test only confirms that the server returned *something*; it tells you nothing about correctness. A sampler can return HTTP 200 with an error page in the body, and JMeter will happily count it as a success unless an assertion inspects the content. The Response Assertion lets you check the response body, the response code, the response message, the response headers, the request data, the request headers, or the document text, and mark the sampler failed if the check does not pass.

Each assertion is attached as a child of a sampler (or higher in the tree, where it applies to all samplers in scope). At runtime JMeter evaluates the assertion against the SampleResult and, on failure, sets the sampler's success flag to false and records the assertion's failure message. That failure then propagates into your listeners, your CI exit code, and any "stop on error" logic you configured.

The element is powerful because it combines four independent choices: which field to test, what kind of comparison to perform, whether to negate the result, and whether multiple patterns are combined with AND or OR. All four are encoded in the JMX, and understanding that encoding is what this guide delivers.

## The ResponseAssertion XML Structure

When JMeter serializes a Response Assertion to JMX, it writes a \`ResponseAssertion\` element followed immediately by a \`hashTree\` element (every JMeter element is paired with a hashTree that holds its children). The assertion itself carries four key properties. Here is the canonical skeleton with annotations.

\`\`\`xml
<ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion"
                   testname="Response Assertion" enabled="true">
  <!-- The patterns to match, held in a collection -->
  <collectionProp name="Asserion.test_strings">
    <stringProp name="49586">expected text</stringProp>
  </collectionProp>
  <!-- Optional: a custom failure message shown in reports -->
  <stringProp name="Assertion.custom_message"></stringProp>
  <!-- Which part of the result to test -->
  <stringProp name="Assertion.test_field">Assertion.response_data</stringProp>
  <!-- Apply to the main sample only, or also sub-samples -->
  <boolProp name="Assertion.assume_success">false</boolProp>
  <!-- The comparison bitmask: 2 = Contains -->
  <intProp name="Assertion.test_type">2</intProp>
</ResponseAssertion>
<hashTree/>
\`\`\`

Three details trip people up immediately. First, the collection property name is literally \`Asserion.test_strings\` with the misspelling "Asserion" (missing the second "t"). This is a long-standing typo baked into JMeter's source and you must reproduce it exactly or JMeter will not read your patterns. Second, every other property uses the correctly spelled \`Assertion.\` prefix. Third, each pattern inside the collection is a \`stringProp\` whose \`name\` attribute is an arbitrary hash (JMeter generates a number like \`49586\`); the name is ignored on load, so any unique string works, but the GUI regenerates it on save.

The table below maps each property to its meaning.

| Property name | Type | Meaning |
|---|---|---|
| \`Asserion.test_strings\` | collectionProp | The patterns/strings to match (note the typo) |
| \`Assertion.test_field\` | stringProp | Which field of the result to inspect |
| \`Assertion.test_type\` | intProp | Bitmask: comparison + Not/Or modifiers |
| \`Assertion.custom_message\` | stringProp | Custom text shown when the assertion fails |
| \`Assertion.assume_success\` | boolProp | If true, ignore the assertion's own pass/fail for the sampler status |

## The test_field Property Values

The \`Assertion.test_field\` property is a string that names exactly one part of the SampleResult to inspect. You can only test one field per assertion; to check both the response code and the body, you add two assertions. The accepted values are fixed constants from JMeter's source, and the GUI radio buttons map directly onto them.

\`\`\`xml
<!-- Test the response body (default and most common) -->
<stringProp name="Assertion.test_field">Assertion.response_data</stringProp>

<!-- Test the HTTP status code, e.g. 200, 404, 500 -->
<stringProp name="Assertion.test_field">Assertion.response_code</stringProp>

<!-- Test the HTTP status message, e.g. "OK", "Not Found" -->
<stringProp name="Assertion.test_field">Assertion.response_message</stringProp>

<!-- Test the response headers block -->
<stringProp name="Assertion.test_field">Assertion.response_headers</stringProp>

<!-- Test the request headers JMeter sent -->
<stringProp name="Assertion.test_field">Assertion.request_headers</stringProp>

<!-- Test the request data (the body JMeter sent) -->
<stringProp name="Assertion.test_field">Assertion.request_data</stringProp>

<!-- Test the document as extracted text (for binary/Tika docs) -->
<stringProp name="Assertion.test_field">Assertion.response_data_as_document</stringProp>

<!-- Test the full URL of the sampler -->
<stringProp name="Assertion.test_field">Assertion.sample_label</stringProp>
\`\`\`

The two you will use ninety percent of the time are \`Assertion.response_data\` (the body) and \`Assertion.response_code\` (the status). A common mistake is leaving the field at the default body value while writing a pattern like \`200\`; that checks whether the body *contains* the substring "200," not the status code. If you want to assert the HTTP status, you must switch \`test_field\` to \`Assertion.response_code\`.

The table summarizes the full set.

| test_field value | What it inspects | Typical pattern |
|---|---|---|
| \`Assertion.response_data\` | Response body | \`"status":"ok"\` |
| \`Assertion.response_code\` | HTTP status code | \`200\` or \`2\\d\\d\` |
| \`Assertion.response_message\` | HTTP status message | \`OK\` |
| \`Assertion.response_headers\` | Response headers | \`Content-Type: application/json\` |
| \`Assertion.request_headers\` | Request headers sent | \`Authorization\` |
| \`Assertion.request_data\` | Request body sent | \`grant_type=password\` |
| \`Assertion.response_data_as_document\` | Extracted document text | (PDF/Office content) |

## The test_type Bitmask Decoded

The \`Assertion.test_type\` integer is the heart of the assertion and the part that confuses people most, because it is a bitmask, not a simple enum. JMeter packs the comparison mode and two modifier flags into one integer by OR-ing bit values together. The base comparison modes are: Matches (regex match of the whole field) = 1, Contains (regex find anywhere) = 2, Equals (exact literal string) = 8, and Substring (literal substring, no regex) = 16. The modifiers are: Not (negate the result) = 4, and Or (combine multiple strings with OR instead of AND) = 32.

\`\`\`text
Base comparison bits:
  1  = Matches   (regex, whole field must match)
  2  = Contains  (regex, pattern found anywhere)
  8  = Equals    (plain string, exact equality)
  16 = Substring (plain string, found anywhere)

Modifier bits (added on top):
  4  = Not       (invert the result)
  32 = Or        (OR multiple patterns instead of AND)
\`\`\`

To build a \`test_type\` value, take the base mode and add any modifiers. "Contains" alone is 2. "Does NOT contain" is 2 + 4 = 6. "Matches" with multiple regexes OR-ed together is 1 + 32 = 33. "Substring, negated" is 16 + 4 = 20. The table enumerates the combinations you will actually see.

| test_type | Decoded meaning |
|---|---|
| 1 | Matches (regex) |
| 2 | Contains (regex) — the GUI default |
| 8 | Equals (literal, exact) |
| 16 | Substring (literal) |
| 5 | Matches + Not |
| 6 | Contains + Not |
| 12 | Equals + Not |
| 20 | Substring + Not |
| 33 | Matches + Or |
| 34 | Contains + Or |
| 38 | Contains + Not + Or |

A practical tip for hand-editing: when in doubt, add the assertion in the GUI with the checkboxes you want, save the plan, and open the JMX to read the resulting integer. You will quickly internalize the common values. The most frequent by far is 2 (Contains), followed by 16 (Substring) when you want a fast literal check with no regex engine overhead, and 8 (Equals) for response codes where you want an exact \`200\`.

## The test_strings Collection

The patterns themselves live in the \`collectionProp\` named \`Asserion.test_strings\`. Each pattern is a separate \`stringProp\`. When you have multiple patterns, the \`test_type\` Or bit (32) decides whether the sampler passes if *all* patterns match (AND, default) or if *any* pattern matches (OR). Here is a multi-pattern OR example asserting that the body contains either of two success markers.

\`\`\`xml
<ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion"
                   testname="Body contains success marker" enabled="true">
  <collectionProp name="Asserion.test_strings">
    <stringProp name="-1422950858">"status":"success"</stringProp>
    <stringProp name="-1422950859">"result":"ok"</stringProp>
  </collectionProp>
  <stringProp name="Assertion.test_field">Assertion.response_data</stringProp>
  <boolProp name="Assertion.assume_success">false</boolProp>
  <!-- 2 (Contains) + 32 (Or) = 34 -->
  <intProp name="Assertion.test_type">34</intProp>
</ResponseAssertion>
<hashTree/>
\`\`\`

Two encoding rules matter here. First, the body of a \`stringProp\` is XML, so characters like \`<\`, \`>\`, and \`&\` must be escaped as \`&lt;\`, \`&gt;\`, and \`&amp;\`. A pattern matching an HTML tag \`<title>\` must be written \`&lt;title&gt;\`. Second, for regex modes (Matches and Contains), JMeter uses ORO/Perl5 regex syntax, so backslash escapes like \`\\d\` and \`\\.\` are interpreted by the regex engine — but because they sit inside XML you write them as plain backslashes (the XML parser leaves backslashes alone).

You can also parameterize patterns with JMeter variables and functions. A pattern of \`\${expectedUserId}\` will be resolved at runtime from a variable, which is how you assert dynamic, data-driven expectations.

## A Complete, Runnable Assertion Example

Putting it together, here is a sampler with two assertions: one that checks the HTTP status is exactly 200, and one that checks the JSON body contains a token field. This is a self-contained fragment you can paste inside the \`hashTree\` of an HTTP Request sampler in a JMeter 5.6.3 \`.jmx\` file.

\`\`\`xml
<HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy"
                  testname="POST /login" enabled="true">
  <stringProp name="HTTPSampler.domain">api.example.com</stringProp>
  <stringProp name="HTTPSampler.path">/login</stringProp>
  <stringProp name="HTTPSampler.method">POST</stringProp>
  <boolProp name="HTTPSampler.postBodyRaw">true</boolProp>
  <elementProp name="HTTPsampler.Arguments" elementType="Arguments">
    <collectionProp name="Arguments.arguments">
      <elementProp name="" elementType="HTTPArgument">
        <stringProp name="Argument.value">{"user":"qa","pass":"secret"}</stringProp>
        <stringProp name="Argument.metadata">=</stringProp>
      </elementProp>
    </collectionProp>
  </elementProp>
</HTTPSamplerProxy>
<hashTree>
  <!-- Assertion 1: status code must EQUAL 200 -->
  <ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion"
                     testname="Status is 200" enabled="true">
    <collectionProp name="Asserion.test_strings">
      <stringProp name="49586">200</stringProp>
    </collectionProp>
    <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
    <boolProp name="Assertion.assume_success">false</boolProp>
    <intProp name="Assertion.test_type">8</intProp>
  </ResponseAssertion>
  <hashTree/>
  <!-- Assertion 2: body must CONTAIN a token field -->
  <ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion"
                     testname="Body has token" enabled="true">
    <collectionProp name="Asserion.test_strings">
      <stringProp name="110541305">"token":"</stringProp>
    </collectionProp>
    <stringProp name="Assertion.test_field">Assertion.response_data</stringProp>
    <boolProp name="Assertion.assume_success">false</boolProp>
    <intProp name="Assertion.test_type">2</intProp>
  </ResponseAssertion>
  <hashTree/>
</hashTree>
\`\`\`

You can validate this without the GUI by running JMeter in non-GUI mode, which is also how you would run it in CI.

\`\`\`bash
# Run the plan headless and write results to a JTL file
jmeter -n -t login-plan.jmx -l results.jtl -e -o ./report

# A non-zero exit or failed assertions appear in results.jtl
# Filter failures quickly:
grep 'success="false"' results.jtl
\`\`\`

## Common Pitfalls and How to Avoid Them

The single most common failure is reproducing the \`Asserion.test_strings\` typo incorrectly. If you "fix" the spelling to \`Assertion.test_strings\`, JMeter loads the assertion with zero patterns and it passes vacuously, silently weakening your test. Always keep the typo.

The second pitfall is the \`test_field\` / \`test_type\` mismatch described earlier — asserting a status code while \`test_field\` still points at the body. The third is forgetting XML escaping for patterns containing angle brackets or ampersands, which produces a parse error on load. The fourth is using a regex mode (Contains = 2) with a pattern that contains regex metacharacters you meant literally; a pattern like \`price: $5.00\` treats \`$\` and \`.\` as regex operators. If you want a literal match, use Substring (16) instead, which does no regex interpretation.

| Pitfall | Symptom | Fix |
|---|---|---|
| Fixed the \`Asserion\` typo | Assertion always passes | Keep the misspelling |
| Wrong test_field for code | Status check matches body text | Set \`Assertion.response_code\` |
| Unescaped \`<\`, \`>\`, \`&\` | JMX fails to load | Use \`&lt;\` \`&gt;\` \`&amp;\` |
| Regex metachars taken literally | Unexpected pass/fail | Use Substring (16) |
| assume_success left true | Failed assertion ignored | Set it false |

## Generating Assertions Programmatically

Because the format is deterministic, you can template assertions across many endpoints. A small Python helper that emits the XML block for a "Contains" body assertion looks like this and is handy when scaffolding large plans from an OpenAPI spec.

\`\`\`python
from xml.sax.saxutils import escape

def response_assertion(name: str, pattern: str,
                       field: str = "Assertion.response_data",
                       test_type: int = 2) -> str:
    """Emit a JMeter ResponseAssertion XML block (JMeter 5.6.3)."""
    return f'''<ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="{escape(name)}" enabled="true">
  <collectionProp name="Asserion.test_strings">
    <stringProp name="0">{escape(pattern)}</stringProp>
  </collectionProp>
  <stringProp name="Assertion.test_field">{field}</stringProp>
  <boolProp name="Assertion.assume_success">false</boolProp>
  <intProp name="Assertion.test_type">{test_type}</intProp>
</ResponseAssertion>
<hashTree/>'''

# Status-code equals 200, then body contains a field
print(response_assertion("Status 200", "200",
                         field="Assertion.response_code", test_type=8))
print(response_assertion("Has id", '"id":'))
\`\`\`

This approach keeps assertions consistent and lets you diff generated plans in version control. Note the helper escapes both the testname and the pattern, sidestepping the XML-escaping pitfall entirely. For more on weaving assertions into a full pipeline, see the [load testing material on the blog](/blog) and the installable performance skills in the [directory](/skills).

## Scope, Assume Success, and Assertion Placement

Two behaviors govern *where* an assertion applies and *how strict* it is, and both are encoded in the JMX. The first is scope: an assertion attached directly under a sampler applies only to that sampler, but an assertion placed higher in the tree — under a Thread Group or Transaction Controller — applies to every sampler within that scope. In the JMX this is purely positional: the assertion's location in the nested \`hashTree\` structure determines what it checks. A common pattern is one tree-level assertion that checks every response code is 2xx, plus per-sampler assertions for body content.

The second behavior is \`Assertion.assume_success\`. When set to \`true\`, JMeter still evaluates the assertion and records its result, but it does *not* let a failed assertion flip the sampler to failed. This is occasionally useful for "soft" checks you want reported in listeners without breaking the run, but it is dangerous as a default because a failing assertion then silently passes the build. Keep it \`false\` unless you have a specific reason.

\`\`\`xml
<!-- A tree-level assertion: applies to ALL samplers in this Thread Group.
     Checks every response code matches 2xx via regex (test_type 1 = Matches). -->
<ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion"
                   testname="All responses are 2xx" enabled="true">
  <collectionProp name="Asserion.test_strings">
    <stringProp name="0">2\\d\\d</stringProp>
  </collectionProp>
  <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
  <boolProp name="Assertion.assume_success">false</boolProp>
  <intProp name="Assertion.test_type">1</intProp>
</ResponseAssertion>
<hashTree/>
\`\`\`

The interaction between scope and \`assume_success\` is worth internalizing: a tree-level assertion with \`assume_success=false\` is the strictest, failing the whole scope on any mismatch; a per-sampler assertion with \`assume_success=true\` is the loosest, reporting but never failing. Choose deliberately.

## Response Assertion vs JSON and Duration Assertions

The Response Assertion is the general-purpose tool, but JMeter ships sibling assertion elements that serialize to different XML and are better for specific jobs. The JSON Assertion (\`JSONPathAssertion\`) evaluates a JSONPath expression against the body — far cleaner than a regex when you want to assert \`$.data.user.id == 10\`. The Duration Assertion (\`DurationAssertion\`) fails a sampler whose response took longer than a threshold, which a Response Assertion cannot express because it only inspects content, not timing. The Size Assertion (\`SizeAssertion\`) checks the byte length of the response.

\`\`\`xml
<!-- JSONPathAssertion: assert a value at a JSON path -->
<JSONPathAssertion guiclass="JSONPathAssertionGui" testclass="JSONPathAssertion"
                   testname="user id is 10" enabled="true">
  <stringProp name="JSON_PATH">$.user.id</stringProp>
  <stringProp name="EXPECTED_VALUE">10</stringProp>
  <boolProp name="JSONVALIDATION">true</boolProp>
  <boolProp name="EXPECT_NULL">false</boolProp>
  <boolProp name="INVERT">false</boolProp>
  <boolProp name="ISREGEX">false</boolProp>
</JSONPathAssertion>
<hashTree/>
\`\`\`

The decision rule is simple: use the Response Assertion for status codes, headers, and presence-of-substring checks; reach for the JSON Assertion when you need to navigate into structured JSON by path; and use the Duration Assertion for any latency SLA. Mixing them under one sampler is normal and recommended.

| Assertion element | XML testclass | Best for |
|---|---|---|
| Response Assertion | \`ResponseAssertion\` | Codes, headers, substring/regex on body |
| JSON Assertion | \`JSONPathAssertion\` | Values at a JSONPath in JSON bodies |
| Duration Assertion | \`DurationAssertion\` | Response-time SLA (fail if too slow) |
| Size Assertion | \`SizeAssertion\` | Response byte-length checks |

## Frequently Asked Questions

### Why is the collection property spelled "Asserion" and not "Assertion"?

It is a genuine typo in JMeter's source code that has existed for many years and was never corrected to preserve backward compatibility with existing test plans. The constant name is hard-coded, so JMeter reads patterns only from \`Asserion.test_strings\`. If you correct the spelling by hand, JMeter loads the assertion with no patterns and it passes vacuously. Always reproduce the misspelling exactly.

### What test_type value means "does not contain"?

Six. The Contains comparison is bit value 2 and the Not modifier is bit value 4, so 2 + 4 = 6 produces a "Contains, negated" assertion that fails when the pattern *is* found and passes when it is absent. Similarly, "does not equal" is 8 + 4 = 12, and "does not match (regex)" is 1 + 4 = 5. The Not bit always adds 4 on top of the base comparison.

### How do I assert the HTTP status code instead of the body?

Set \`Assertion.test_field\` to \`Assertion.response_code\` and put your expected code in the patterns. For an exact match use \`test_type\` 8 (Equals) with a pattern of \`200\`. To accept any 2xx, use \`test_type\` 1 (Matches) with the regex \`2\\d\\d\`. Leaving the field at the default \`Assertion.response_data\` would instead search the body text, which is a common and silent mistake.

### Does the stringProp name attribute inside the collection matter?

No. JMeter generates a numeric hash for the \`name\` attribute of each pattern \`stringProp\`, but that value is ignored when the plan loads — only the element text (the pattern) is used. When hand-editing you can use \`0\`, \`1\`, or any unique string. The GUI will regenerate proper hash names the next time you save the plan, so do not be surprised if your values change.

### What is the difference between Contains and Substring?

Contains (test_type 2) treats the pattern as an ORO/Perl5 regular expression and searches for a match anywhere in the field, so metacharacters like \`.\`, \`$\`, and \`[\` are interpreted. Substring (test_type 16) treats the pattern as a plain literal string with no regex interpretation and is faster. Use Substring when your expected text contains characters that would otherwise be parsed as regex operators.

### How does the Or modifier change multi-pattern behavior?

By default, when an assertion has multiple patterns, all of them must match for the sampler to pass (logical AND). Adding the Or bit (32) flips this to logical OR, so the sampler passes if *any* single pattern matches. For example, Contains + Or is 2 + 32 = 34, which passes if the body contains the first marker or the second. This is useful when an endpoint may return one of several valid success shapes.

### Can I use JMeter variables inside assertion patterns?

Yes. Patterns are evaluated with JMeter's variable and function syntax at runtime, so a pattern of \`\${expectedToken}\` resolves to the current value of that variable, and functions like \`\${__P(env,prod)}\` work too. This lets you build data-driven assertions where each iteration of a CSV-driven test asserts a different expected value, without duplicating the assertion element per row.

## Conclusion

The JMeter Response Assertion JMX format is small but unforgiving: a misspelled collection name you must preserve, a string \`test_field\` that selects exactly one part of the result, an integer \`test_type\` bitmask that OR-encodes the comparison and the Not/Or modifiers, and a collection of XML-escaped patterns. Once you internalize the bit values — 2 for Contains, 8 for Equals, 16 for Substring, plus 4 for Not and 32 for Or — you can read, edit, and generate assertions confidently without ever opening the GUI, which is exactly what you need for templated plans, code review diffs, and programmatic generation.

Ready to move faster? Browse installable JMeter and performance-testing skills for your AI coding agent in the [QASkills directory](/skills), and read deeper performance walkthroughs on the [blog](/blog). Drop a Response Assertion skill into Claude Code or Cursor and let your agent scaffold correct \`ResponseAssertion\` blocks across your entire API surface in seconds.
`,
};
