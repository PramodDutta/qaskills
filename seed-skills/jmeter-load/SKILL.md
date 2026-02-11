---
name: JMeter Load Testing
description: Load and performance testing skill using Apache JMeter, covering test plans, thread groups, assertions, listeners, timers, and distributed testing.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [jmeter, load-testing, performance, stress-testing, api-testing]
testingTypes: [load, performance]
frameworks: [jmeter]
languages: [java]
domains: [api, web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# JMeter Load Testing Skill

You are an expert performance engineer specializing in Apache JMeter. When the user asks you to create, review, or debug JMeter test plans, follow these detailed instructions.

## Core Principles

1. **Realistic load modeling** -- Thread groups must simulate real user behavior with think times.
2. **Correlation** -- Extract dynamic values (session IDs, tokens) from responses and reuse them.
3. **Parameterization** -- Use CSV Data Set Config for test data; never hardcode user-specific values.
4. **Assertions everywhere** -- Every sampler should have at least one assertion to verify correctness.
5. **Non-GUI execution** -- Always run actual load tests from the command line, never the GUI.

## Project Structure

```
jmeter/
  test-plans/
    smoke-test.jmx
    load-test.jmx
    stress-test.jmx
    api-test.jmx
  data/
    users.csv
    products.csv
    payloads/
      create-order.json
  lib/
    custom-plugins.jar
  scripts/
    run-load-test.sh
    generate-report.sh
  results/
    .gitkeep
  reports/
    .gitkeep
  jmeter.properties
```

## Test Plan Structure

A well-organized JMeter test plan follows this hierarchy:

```
Test Plan
  ├── User Defined Variables
  ├── HTTP Request Defaults
  ├── HTTP Header Manager
  ├── HTTP Cookie Manager
  ├── CSV Data Set Config
  ├── Thread Group (User Flow)
  │     ├── Transaction Controller (Login)
  │     │     ├── HTTP Request (GET /login)
  │     │     ├── HTTP Request (POST /auth/login)
  │     │     ├── Response Assertion
  │     │     ├── JSON Extractor (token)
  │     │     └── JSR223 PostProcessor
  │     ├── Constant Timer (Think Time)
  │     ├── Transaction Controller (Browse Products)
  │     │     ├── HTTP Request (GET /products)
  │     │     └── Response Assertion
  │     └── Transaction Controller (Checkout)
  │           ├── HTTP Request (POST /cart)
  │           ├── HTTP Request (POST /checkout)
  │           └── Response Assertion
  ├── View Results Tree (debug only)
  ├── Summary Report
  └── Backend Listener (InfluxDB)
```

## Thread Group Configuration

### Standard Load Test

```xml
<ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="Load Test Users">
  <intProp name="ThreadGroup.num_threads">100</intProp>
  <intProp name="ThreadGroup.ramp_time">300</intProp>
  <boolProp name="ThreadGroup.scheduler">true</boolProp>
  <stringProp name="ThreadGroup.duration">1800</stringProp>
  <stringProp name="ThreadGroup.delay">0</stringProp>
  <boolProp name="ThreadGroup.same_user_on_next_iteration">false</boolProp>
</ThreadGroup>
```

### Stepping Thread Group (Ultimate Thread Group Plugin)

Use the Ultimate Thread Group plugin for complex ramp patterns:

- **Start Threads Count** -- Number of threads to add at each step
- **Initial Delay** -- Wait before starting this step
- **Startup Time** -- Time to ramp up these threads
- **Hold Load For** -- Duration to maintain these threads
- **Shutdown Time** -- Time to ramp down these threads

Example pattern for a load test:
| Start | Delay | Startup | Hold  | Shutdown |
|-------|-------|---------|-------|----------|
| 25    | 0s    | 60s     | 300s  | 30s      |
| 25    | 60s   | 60s     | 240s  | 30s      |
| 25    | 120s  | 60s     | 180s  | 30s      |
| 25    | 180s  | 60s     | 120s  | 30s      |

## HTTP Request Defaults

Always configure HTTP Request Defaults at the test plan level:

```
Protocol: https
Server Name: ${BASE_URL}
Port Number: ${PORT}
Content Encoding: UTF-8
Implementation: HttpClient4
Connect Timeout: 5000
Response Timeout: 30000
```

## Extractors and Correlation

### JSON Extractor

Extract values from JSON responses:

```
Variable Names: auth_token
JSON Path Expressions: $.token
Match No.: 1
Default Values: NOT_FOUND
```

### Regular Expression Extractor

For HTML or non-JSON responses:

```
Reference Name: csrf_token
Regular Expression: name="csrf_token" value="(.+?)"
Template: $1$
Match No.: 1
Default Value: NOT_FOUND
```

### Boundary Extractor

Simpler alternative to regex:

```
Reference Name: session_id
Left Boundary: sessionId=
Right Boundary: ;
Match No.: 1
```

### Using Extracted Values

In subsequent requests:
```
Header: Authorization: Bearer ${auth_token}
URL Path: /api/users/${user_id}
Body: {"sessionId": "${session_id}"}
```

## Assertions

### Response Assertion

```
Apply to: Main sample only
Field to Test: Response Code
Pattern Matching Rules: Equals
Patterns to Test: 200
```

### JSON Assertion

```
Assert JSON Path exists: $.data.id
Expected Value: (leave empty to just check existence)
Additionally assert value: false
```

### Duration Assertion

```
Duration in milliseconds: 2000
```

### Size Assertion

```
Apply to: Main sample only
Size to Assert: Response body
Type of Comparison: < (less than)
Size in bytes: 1048576
```

## Timers

### Constant Timer

```
Thread Delay: 1000
```

### Gaussian Random Timer

More realistic than constant timers:

```
Deviation: 500
Constant Delay Offset: 2000
```
This produces delays between ~1000ms and ~3000ms with most around 2000ms.

### Uniform Random Timer

```
Random Delay Maximum: 3000
Constant Delay Offset: 1000
```
Produces delays between 1000ms and 4000ms uniformly distributed.

## Parameterization with CSV

### CSV Data Set Config

```
Filename: data/users.csv
File Encoding: UTF-8
Variable Names: username,password,role
Ignore first line: true
Delimiter: ,
Allow quoted data: true
Recycle on EOF: true
Stop thread on EOF: false
Sharing mode: All threads
```

### CSV File Format

```csv
username,password,role
user1@example.com,Pass123!,user
user2@example.com,Pass456!,user
admin@example.com,Admin789!,admin
```

## JSR223 Scripting (Groovy)

### Pre-Processor -- Generate Dynamic Data

```groovy
import java.time.Instant
import java.util.UUID

vars.put("request_id", UUID.randomUUID().toString())
vars.put("timestamp", Instant.now().toString())
vars.put("random_email", "user_${__Random(1000,9999)}@example.com")

// Generate random order amount
def amount = (Math.random() * 1000 + 10).round(2)
vars.put("order_amount", amount.toString())
```

### Post-Processor -- Parse Complex Responses

```groovy
import groovy.json.JsonSlurper

def response = prev.getResponseDataAsString()
def json = new JsonSlurper().parseText(response)

if (json.data && json.data.size() > 0) {
    def firstItem = json.data[0]
    vars.put("product_id", firstItem.id.toString())
    vars.put("product_name", firstItem.name)
    log.info("Extracted product: ${firstItem.name}")
} else {
    log.warn("No products found in response")
    prev.setSuccessful(false)
    prev.setResponseMessage("No products in response")
}
```

### Assertion -- Custom Validation

```groovy
import groovy.json.JsonSlurper

def response = prev.getResponseDataAsString()
def json = new JsonSlurper().parseText(response)

// Validate response structure
assert json.data != null : "Response missing 'data' field"
assert json.data.size() > 0 : "Data array is empty"
assert json.total >= json.data.size() : "Total count inconsistent"

// Validate each item
json.data.each { item ->
    assert item.id != null : "Item missing ID"
    assert item.name?.trim() : "Item missing name"
    assert item.price > 0 : "Item price must be positive"
}
```

## Distributed Testing

### Master-Slave Configuration

On the master machine (`jmeter.properties`):

```properties
remote_hosts=slave1:1099,slave2:1099,slave3:1099
server.rmi.ssl.disable=true
mode=StrippedBatch
```

On each slave machine:

```bash
# Start JMeter server
jmeter-server -Djava.rmi.server.hostname=<slave-ip>
```

Run distributed test:

```bash
jmeter -n -t test-plans/load-test.jmx \
  -R slave1,slave2,slave3 \
  -l results/distributed-results.jtl \
  -e -o reports/distributed-report
```

## Command-Line Execution

```bash
# Basic run
jmeter -n -t test-plans/load-test.jmx -l results/results.jtl

# With properties override
jmeter -n -t test-plans/load-test.jmx \
  -JBASE_URL=staging.example.com \
  -JTHREADS=200 \
  -JRAMPUP=300 \
  -JDURATION=1800 \
  -l results/results.jtl

# Generate HTML report after test
jmeter -g results/results.jtl -o reports/html-report

# Run with HTML report generation
jmeter -n -t test-plans/load-test.jmx \
  -l results/results.jtl \
  -e -o reports/html-report

# With specific log level
jmeter -n -t test-plans/load-test.jmx \
  -l results/results.jtl \
  -LDEBUG
```

## Listeners and Reporting

### Backend Listener (InfluxDB)

For real-time monitoring with Grafana:

```
Backend Listener Implementation: org.apache.jmeter.visualizers.backend.influxdb.InfluxdbBackendListenerClient
influxdbUrl: http://influxdb:8086/write?db=jmeter
application: my-app
measurement: jmeter
summaryOnly: false
samplersRegex: .*
```

### Custom JTL Configuration

In `jmeter.properties` or `user.properties`:

```properties
jmeter.save.saveservice.output_format=csv
jmeter.save.saveservice.response_data=false
jmeter.save.saveservice.samplerData=false
jmeter.save.saveservice.requestHeaders=false
jmeter.save.saveservice.url=true
jmeter.save.saveservice.responseHeaders=false
jmeter.save.saveservice.timestamp_format=ms
jmeter.save.saveservice.successful=true
jmeter.save.saveservice.label=true
jmeter.save.saveservice.code=true
jmeter.save.saveservice.message=true
jmeter.save.saveservice.threadName=true
jmeter.save.saveservice.time=true
jmeter.save.saveservice.connect_time=true
jmeter.save.saveservice.latency=true
jmeter.save.saveservice.bytes=true
```

## Best Practices

1. **Never run load tests from the GUI** -- GUI mode is for script development only.
2. **Remove all listeners during actual tests** -- Listeners consume memory under load.
3. **Use Transaction Controllers** -- Group related requests for meaningful metrics.
4. **Parameterize test data** -- Use CSV files and variables for all test data.
5. **Add think times** -- Real users pause between actions.
6. **Validate with assertions** -- Every request should be verified for correctness.
7. **Use HTTP Request Defaults** -- Centralize common settings.
8. **Enable cookies** -- Add HTTP Cookie Manager for session management.
9. **Increase JVM heap** -- Set `-Xms1g -Xmx4g` for large load tests.
10. **Monitor the load generator** -- Ensure the JMeter machine is not the bottleneck.

## Anti-Patterns to Avoid

1. **Running tests from GUI** -- GUI mode adds overhead and skews results.
2. **Too many listeners** -- View Results Tree with response data consumes massive memory.
3. **No correlation** -- Hardcoded session IDs cause authentication failures.
4. **No think time** -- Unrealistic load pattern with machine-gun requests.
5. **Ignoring ramp-up** -- Starting all threads simultaneously overloads the system unnaturally.
6. **Single machine overload** -- Too many threads on one machine produces unreliable results.
7. **Not clearing results between runs** -- Old results mixed with new cause confusion.
8. **Hardcoded data** -- Every user sending the same data is unrealistic.
9. **Ignoring connection timeouts** -- Without timeouts, threads hang forever.
10. **Not monitoring JMeter itself** -- JMeter GC pauses affect results accuracy.

## Key Metrics to Monitor

- **Throughput** -- Requests per second (should plateau, not drop)
- **Response Time** -- Average, median, 90th, 95th, 99th percentiles
- **Error Rate** -- Percentage of failed requests
- **Active Threads** -- Should match the configured ramp pattern
- **Connect Time** -- Time to establish TCP connection
- **Latency** -- Time to first byte of response
- **Bandwidth** -- Network throughput (bytes/sec)
- **Server Hits/sec** -- Rate of requests hitting the server
