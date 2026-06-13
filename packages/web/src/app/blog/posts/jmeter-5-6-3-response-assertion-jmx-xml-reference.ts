import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'JMeter 5.6.3 ResponseAssertion JMX XML Reference',
  description:
    'JMeter 5.6.3 ResponseAssertion JMX XML schema reference. Covers response_code, response_data, response_headers, test_field=49, contains, matches, equals, full examples.',
  date: '2026-06-07',
  category: 'Reference',
  content: `
# JMeter 5.6.3 ResponseAssertion JMX XML Reference

Apache JMeter 5.6.3 ships with the \`<ResponseAssertion>\` element as the canonical way to assert against an HTTP response in a JMX test plan. The JMX file format is XML, and while the GUI hides the schema, anyone editing a JMX in source control, generating one from a script, or debugging a CI failure needs to know the exact structure. This reference covers every \`<ResponseAssertion>\` attribute -- \`Assertion.test_field\`, \`Assertion.test_type\`, \`Assertion.assume_success\`, \`Assertion.custom_message\`, the assertion data collection, and the magic integer values for response code, response data, response headers, request data, request headers, document text, and URL. If you are searching for \`jmeter 5.6.3 responseassertion jmx xml correct format example\`, this page has the canonical XML for every common use case.

We assume Apache JMeter 5.6.3 or 5.6.x. The schema has been stable since 5.0 so older 5.x JMX files are forward-compatible, but exact attribute names matter -- a typo means the assertion silently does nothing.

## Key Takeaways

- \`<ResponseAssertion>\` is an XML element with attributes \`guiclass\`, \`testclass\`, \`testname\`, and \`enabled\`, plus child \`<stringProp>\`, \`<collectionProp>\`, and \`<boolProp>\` elements
- \`Assertion.test_field\` holds the magic string indicating WHICH part of the response to check: \`Assertion.response_data\`, \`Assertion.response_code\`, \`Assertion.response_headers\`, \`Assertion.response_message\`, \`Assertion.request_data\`, \`Assertion.request_headers\`, \`Assertion.url_data\`
- \`Assertion.test_type\` is an integer bitmask: contains=2, matches=1, equals=8, substring=16, not=4, or=32. Combine with bitwise OR. The value 49 means substring(16) | not(4) | or(32)... actually equals(8) + substring(16) + not(4) bitwise = 28, so 49 specifically means "contains OR equals NOT regex"
- The patterns to check live inside \`<collectionProp name="Asserion.test_strings">\`. Each pattern is a \`<stringProp>\` with a numeric-hash name
- \`Assertion.assume_success\` (default false) tells JMeter to mark the sample as success regardless of upstream status -- useful when retrying an expected error

## The Minimal ResponseAssertion JMX

The smallest valid \`<ResponseAssertion>\` element checking that the response body contains "OK":

\`\`\`xml
<ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="Body contains OK" enabled="true">
  <collectionProp name="Asserion.test_strings">
    <stringProp name="49586">OK</stringProp>
  </collectionProp>
  <stringProp name="Assertion.custom_message"></stringProp>
  <stringProp name="Assertion.test_field">Assertion.response_data</stringProp>
  <boolProp name="Assertion.assume_success">false</boolProp>
  <intProp name="Assertion.test_type">2</intProp>
</ResponseAssertion>
<hashTree/>
\`\`\`

Three things to note:

- The name attribute on the inner \`<stringProp>\` is a hash code that JMeter computes from the pattern string. You can use any unique value; the hash is not validated
- The element name is misspelled in the JMX schema: \`Asserion.test_strings\` (single 's', missing 't'). This is a historical bug preserved for backward compatibility
- Every \`<ResponseAssertion>\` must be followed by an empty \`<hashTree/>\` because all JMeter elements are tree-shaped

## test_field Values

| Value | What it checks |
|---|---|
| \`Assertion.response_data\` | Response body bytes (default) |
| \`Assertion.response_code\` | HTTP status code as string (\`200\`, \`404\`) |
| \`Assertion.response_message\` | HTTP status reason (\`OK\`, \`Not Found\`) |
| \`Assertion.response_headers\` | Response headers as flat string |
| \`Assertion.request_data\` | Request body |
| \`Assertion.request_headers\` | Request headers |
| \`Assertion.url_data\` | The full request URL |

The default in the GUI is \`response_data\`. Override only when you specifically want to assert on a different field.

## test_type Bitmask

\`test_type\` is an integer that combines flags:

| Flag | Integer | Meaning |
|---|---|---|
| matches (regex) | 1 | Pattern is a regex matching the entire field |
| contains (regex substring) | 2 | Pattern is a regex appearing anywhere |
| not | 4 | Negate the result |
| equals | 8 | Pattern equals the field literally |
| substring | 16 | Pattern appears literally (no regex) |
| or | 32 | OR semantics across multiple patterns |

Combine with bitwise OR. Common values:

| Combined | Meaning |
|---|---|
| 2 | contains regex |
| 1 | matches regex (whole field) |
| 8 | equals literal |
| 16 | contains literal substring |
| 6 (2 + 4) | NOT contains regex |
| 12 (8 + 4) | NOT equals |
| 20 (16 + 4) | NOT substring |
| 34 (2 + 32) | contains regex with OR across patterns |
| 16 + 32 = 48 | substring with OR |

The value 49 specifically is 16 + 32 + 1 = substring + or + matches, which is a contradictory pairing -- in practice the GUI normalizes to a single mode and JMeter chooses substring with OR (48) or matches with OR (33).

## response_code Assertion

The most common shape: assert that the response is HTTP 200.

\`\`\`xml
<ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="Status 200" enabled="true">
  <collectionProp name="Asserion.test_strings">
    <stringProp name="49586">200</stringProp>
  </collectionProp>
  <stringProp name="Assertion.custom_message">Expected 200 status</stringProp>
  <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
  <boolProp name="Assertion.assume_success">false</boolProp>
  <intProp name="Assertion.test_type">8</intProp>
</ResponseAssertion>
<hashTree/>
\`\`\`

\`test_type=8\` means equals. The pattern \`200\` must equal the response code exactly.

## response_data Substring Assertion

Assert that the body contains a literal string:

\`\`\`xml
<ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="Body contains success" enabled="true">
  <collectionProp name="Asserion.test_strings">
    <stringProp name="49587">"status":"success"</stringProp>
  </collectionProp>
  <stringProp name="Assertion.test_field">Assertion.response_data</stringProp>
  <boolProp name="Assertion.assume_success">false</boolProp>
  <intProp name="Assertion.test_type">16</intProp>
</ResponseAssertion>
<hashTree/>
\`\`\`

\`test_type=16\` is substring. Faster than regex because no compilation is needed.

## response_data Regex Match Assertion

Assert the body matches a regex pattern across the entire body:

\`\`\`xml
<ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="Body matches JSON pattern" enabled="true">
  <collectionProp name="Asserion.test_strings">
    <stringProp name="49588">.*"orderId":\\\\d+.*</stringProp>
  </collectionProp>
  <stringProp name="Assertion.test_field">Assertion.response_data</stringProp>
  <boolProp name="Assertion.assume_success">false</boolProp>
  <intProp name="Assertion.test_type">1</intProp>
</ResponseAssertion>
<hashTree/>
\`\`\`

\`test_type=1\` is matches (full-field regex). The regex must match the entire response. For "contains regex", use \`test_type=2\`.

## response_headers Assertion

Assert that a specific header value is present:

\`\`\`xml
<ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="Content-Type is JSON" enabled="true">
  <collectionProp name="Asserion.test_strings">
    <stringProp name="49589">Content-Type: application/json</stringProp>
  </collectionProp>
  <stringProp name="Assertion.test_field">Assertion.response_headers</stringProp>
  <boolProp name="Assertion.assume_success">false</boolProp>
  <intProp name="Assertion.test_type">16</intProp>
</ResponseAssertion>
<hashTree/>
\`\`\`

The headers field is a single flat string with headers separated by CR-LF, so substring works.

## Negated Assertion (NOT contains)

Assert that the body does NOT contain "error":

\`\`\`xml
<ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="Body has no errors" enabled="true">
  <collectionProp name="Asserion.test_strings">
    <stringProp name="49590">"error"</stringProp>
  </collectionProp>
  <stringProp name="Assertion.test_field">Assertion.response_data</stringProp>
  <boolProp name="Assertion.assume_success">false</boolProp>
  <intProp name="Assertion.test_type">20</intProp>
</ResponseAssertion>
<hashTree/>
\`\`\`

\`test_type=20\` is substring(16) + not(4). The assertion fails if the pattern appears.

## Multiple Patterns with OR

Assert that the status code is 200 OR 201 OR 204:

\`\`\`xml
<ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="Status is success" enabled="true">
  <collectionProp name="Asserion.test_strings">
    <stringProp name="49591">200</stringProp>
    <stringProp name="49592">201</stringProp>
    <stringProp name="49593">204</stringProp>
  </collectionProp>
  <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
  <boolProp name="Assertion.assume_success">false</boolProp>
  <intProp name="Assertion.test_type">40</intProp>
</ResponseAssertion>
<hashTree/>
\`\`\`

\`test_type=40\` is equals(8) + or(32). Without OR semantics every pattern must match (AND), which is impossible for status codes.

## Full HTTP Sampler with ResponseAssertion

End-to-end JMX skeleton showing where ResponseAssertion fits relative to an HTTP sampler:

\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="API Test" enabled="true">
      <stringProp name="TestPlan.comments"></stringProp>
      <boolProp name="TestPlan.functional_mode">false</boolProp>
      <boolProp name="TestPlan.serialize_threadgroups">false</boolProp>
      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments">
        <collectionProp name="Arguments.arguments"/>
      </elementProp>
      <stringProp name="TestPlan.user_define_classpath"></stringProp>
    </TestPlan>
    <hashTree>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="Users" enabled="true">
        <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel" testclass="LoopController">
          <boolProp name="LoopController.continue_forever">false</boolProp>
          <stringProp name="LoopController.loops">1</stringProp>
        </elementProp>
        <stringProp name="ThreadGroup.num_threads">10</stringProp>
        <stringProp name="ThreadGroup.ramp_time">5</stringProp>
        <boolProp name="ThreadGroup.scheduler">false</boolProp>
        <stringProp name="ThreadGroup.duration"></stringProp>
        <stringProp name="ThreadGroup.delay"></stringProp>
      </ThreadGroup>
      <hashTree>
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="GET /api/users" enabled="true">
          <elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="HTTPArgumentsPanel" testclass="Arguments">
            <collectionProp name="Arguments.arguments"/>
          </elementProp>
          <stringProp name="HTTPSampler.domain">api.example.com</stringProp>
          <stringProp name="HTTPSampler.port">443</stringProp>
          <stringProp name="HTTPSampler.protocol">https</stringProp>
          <stringProp name="HTTPSampler.path">/api/users</stringProp>
          <stringProp name="HTTPSampler.method">GET</stringProp>
          <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
          <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
        </HTTPSamplerProxy>
        <hashTree>
          <ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="Status 200" enabled="true">
            <collectionProp name="Asserion.test_strings">
              <stringProp name="49586">200</stringProp>
            </collectionProp>
            <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
            <boolProp name="Assertion.assume_success">false</boolProp>
            <intProp name="Assertion.test_type">8</intProp>
          </ResponseAssertion>
          <hashTree/>
          <ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="Body contains users array" enabled="true">
            <collectionProp name="Asserion.test_strings">
              <stringProp name="49594">"users":[</stringProp>
            </collectionProp>
            <stringProp name="Assertion.test_field">Assertion.response_data</stringProp>
            <boolProp name="Assertion.assume_success">false</boolProp>
            <intProp name="Assertion.test_type">16</intProp>
          </ResponseAssertion>
          <hashTree/>
        </hashTree>
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>
\`\`\`

Two assertions both live in the \`<hashTree>\` immediately following the HTTPSamplerProxy. JMeter applies them in order; the first failure marks the sample as failed.

## assume_success Flag

When \`Assertion.assume_success\` is true, the assertion overrides any prior failure on the sample. This is rarely useful in production tests but occasionally helpful for negative testing:

\`\`\`xml
<boolProp name="Assertion.assume_success">true</boolProp>
\`\`\`

If your test expects an HTTP 500 and you want to mark the sample as success only when the body contains "Internal Server Error", set assume_success on the body assertion.

## custom_message

\`Assertion.custom_message\` is shown in the result log when the assertion fails. Make it descriptive:

\`\`\`xml
<stringProp name="Assertion.custom_message">Expected status 200 but got something else</stringProp>
\`\`\`

This shows up in \`results.jtl\` and the GUI listener, making CI failure triage faster.

## Running From CLI

\`\`\`bash
jmeter -n -t test-plan.jmx -l results.jtl -e -o report/
\`\`\`

\`-n\` is non-GUI, \`-t\` is the JMX path, \`-l\` is the result log, \`-e -o\` generates the HTML dashboard.

## Validating JMX in CI

Before running you can validate the JMX is at least well-formed XML and conforms to the JMeter schema:

\`\`\`bash
xmllint --noout test-plan.jmx
\`\`\`

For schema validation use the official jmeter.xsd shipped with JMeter, though enforcement is loose.

## Test Type Cheat Sheet

| test_type | Behavior |
|---|---|
| 1 | matches (full regex) |
| 2 | contains (regex substring) |
| 8 | equals (literal) |
| 16 | substring (literal) |
| 4 + N | NOT N |
| 32 + N | OR-combine N across patterns |

Most teams use 8 (equals) for response_code and 16 (substring) for response_data. Move to 2 (regex contains) only when literal substring is insufficient.

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---|---|---|
| Typo \`Assertion.test_strings\` | Collection ignored; assertion never fails | Use exactly \`Asserion.test_strings\` (single 's') |
| Wrong test_type for response_code | Assertion never matches | Use 8 (equals) for status codes |
| Regex without escaping | \`(\` or \`.\` matches unexpectedly | Either escape or switch to test_type=16 (substring) |
| assume_success unintentionally true | Failures silently pass | Default to false; only use deliberately |
| Missing \`<hashTree/>\` after the assertion | JMX parse error | Always add the trailing empty hashTree |

## Programmatic JMX Generation

For dynamic test plans you can template the JMX. A minimal Python generator:

\`\`\`python
from string import Template

ASSERTION_TEMPLATE = Template('''
<ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="$name" enabled="true">
  <collectionProp name="Asserion.test_strings">
    <stringProp name="$hash">$pattern</stringProp>
  </collectionProp>
  <stringProp name="Assertion.test_field">$field</stringProp>
  <boolProp name="Assertion.assume_success">false</boolProp>
  <intProp name="Assertion.test_type">$type</intProp>
</ResponseAssertion>
<hashTree/>
''')

def generate(name, pattern, field='Assertion.response_data', type=16):
    return ASSERTION_TEMPLATE.substitute(
        name=name,
        hash=str(abs(hash(pattern)))[:5],
        pattern=pattern,
        field=field,
        type=type,
    )

print(generate('Status 200', '200', 'Assertion.response_code', 8))
\`\`\`

## Frequently Asked Questions

### Why does the field name have a typo (Asserion vs Assertion)?

\`Asserion.test_strings\` is a historical bug in JMeter that has never been fixed because changing it would break every existing JMX file. Always use the typo'd form in your hand-written JMX.

### What is the difference between matches and contains?

\`matches\` (test_type=1) requires the regex to match the ENTIRE field. \`contains\` (test_type=2) requires the regex to match anywhere in the field. For substring matching, use the literal substring mode (test_type=16) which skips regex compilation and is faster.

### How do I assert on multiple things on one response?

Add multiple ResponseAssertion elements as siblings under the HTTPSamplerProxy's hashTree. Each one checks one thing. JMeter ANDs them by default; the first failure marks the sample failed.

### Can I use JSON Path instead of substring?

Yes. Use \`<JSONPostProcessor>\` to extract a value into a variable, then assert with a regular ResponseAssertion (or with the Compare Assertion). For complex JSON shapes, \`<JSONPathAssertion>\` is a separate element.

### How does Assertion.assume_success interact with previous failures?

If a previous assertion or the sampler itself failed, an assertion with assume_success=true marks the sample as success again. This is opt-in per assertion and rarely the right answer. Default to false.

### Can the same pattern be used as contains and equals?

No. test_type is one mode at a time. To check that a value contains "abc" AND does not equal "abc", use two ResponseAssertion elements.

### How do I parameterize patterns?

Use JMeter variables: \`<stringProp name="49586">\${expected_status}</stringProp>\`. The variable is substituted at sample time.

## Conclusion

\`<ResponseAssertion>\` in JMeter 5.6.3 has a small but precise XML schema. Memorize the seven \`test_field\` magic strings, the six \`test_type\` flags, and the typo'd \`Asserion.test_strings\` collection name and you can hand-edit any JMX file. For maintenance-critical test plans use one assertion per concern and a clear \`Assertion.custom_message\` -- your future CI-failure-triage self will thank you.

Browse the [load testing skills directory](/skills) for AI agent skills that scaffold ResponseAssertion blocks automatically, and our [Locust vs JMeter comparison](/blog/locust-vs-jmeter-2026-which-load-testing) to choose the right tool for your next load test campaign. The [load testing tool comparison](/compare) covers k6, Gatling, Artillery, and Locust side by side.
`,
};
