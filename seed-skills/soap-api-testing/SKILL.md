---
name: "SOAP API Testing"
description: "SOAP web service testing including WSDL validation, XML schema testing, WS-Security, and SOAP fault handling verification."
version: 1.0.0
author: qaskills
license: MIT
tags: [soap, wsdl, xml, web-service, api]
testingTypes: [api, integration]
frameworks: []
languages: [java, python, csharp]
domains: [api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# SOAP API Testing

This skill makes the agent test SOAP/XML web services the way they actually break: malformed envelopes, schema-invalid payloads, WS-Security signature failures, and SOAP Faults that return HTTP 200 with an error body. Trigger it whenever you see a `.wsdl`, an `<soap:Envelope>`, a `?wsdl` URL, WS-Security/UsernameToken, or libraries like `zeep`, JAX-WS, Apache CXF, or `System.ServiceModel`.

## Core Principles

1. **A SOAP Fault is HTTP 200, not 500.** Never assert on status code alone. Parse the body and check for a `<soap:Fault>` element with `faultcode`/`faultstring` (SOAP 1.1) or `<Code>`/`<Reason>` (SOAP 1.2). A "successful" HTTP response can carry a business error.
2. **Validate against the WSDL/XSD, not against your assumptions.** The contract is the schema. Test that the service rejects schema-invalid input and that its responses validate against the declared types. Catch contract drift before consumers do.
3. **Test the envelope, not just the payload.** SOAP bugs hide in namespaces, `SOAPAction` headers, `mustUnderstand` attributes, and header blocks — not only in the business body.
4. **WS-Security is part of the test surface.** Wrong/expired UsernameToken, missing timestamp, broken signature, and replayed nonces must all be exercised. Security headers fail silently into Faults.
5. **Pin namespaces explicitly in assertions.** XPath without namespace binding is a false-pass machine. Always register the prefix→URI map and assert with qualified names.
6. **Drive happy-path tests from the WSDL via a generated client; drive negative tests with raw XML.** Generated clients (zeep, wsimport) won't let you send malformed envelopes — you need raw POSTs for that.

## Setup

Python (recommended for fast, readable SOAP tests):

```bash
pip install "zeep==4.2.1" "requests==2.32.3" "lxml==5.2.2" "pytest==8.2.0" "xmlsec==1.3.14"
```

Java (Maven, for JAX-WS / CXF shops):

```xml
<!-- pom.xml -->
<dependency>
  <groupId>jakarta.xml.ws</groupId>
  <artifactId>jakarta.xml.ws-api</artifactId>
  <version>4.0.2</version>
</dependency>
<dependency>
  <groupId>org.apache.cxf</groupId>
  <artifactId>cxf-rt-frontend-jaxws</artifactId>
  <version>4.0.5</version>
</dependency>
<!-- Generate the client stubs from the WSDL at build time -->
<!-- mvn org.apache.cxf:cxf-codegen-plugin:wsdl2java -->
```

## Patterns / Workflow

### 1. Happy path with a generated zeep client (Python)

zeep parses the WSDL, builds typed operations, and validates input against the XSD automatically.

```python
import pytest
from zeep import Client, Settings
from zeep.exceptions import Fault, ValidationError

WSDL = "http://www.dneonline.org/Calculator/calculator.wsdl"

@pytest.fixture(scope="module")
def client():
    settings = Settings(strict=True, xml_huge_tree=True)
    return Client(wsdl=WSDL, settings=settings)

def test_add_returns_sum(client):
    result = client.service.Add(intA=7, intB=5)
    assert result == 12

def test_missing_required_arg_is_rejected_locally(client):
    # zeep validates against the XSD before the request leaves the machine
    with pytest.raises(ValidationError):
        client.service.Add(intA=7)  # intB is required by the schema
```

### 2. Catching and asserting on a SOAP Fault

The service may return a Fault for business errors. zeep raises `zeep.exceptions.Fault`; assert on its contents rather than letting the test crash.

```python
def test_divide_by_zero_raises_soap_fault(client):
    with pytest.raises(Fault) as exc_info:
        client.service.Divide(intA=10, intB=0)
    fault = exc_info.value
    assert "DivideByZero" in fault.message or "zero" in fault.message.lower()
    # SOAP 1.1 faultcode lives in fault.code; detail carries app data
    assert fault.detail is not None
```

### 3. Negative / malformed-envelope tests with raw XML

A generated client cannot send a broken envelope. Build the SOAP request by hand and POST it, then assert the server rejects it with a Fault (a robust service must not 500 or accept garbage).

```python
import requests
from lxml import etree

ENDPOINT = "http://www.dneonline.org/calculator.asmx"
NS = {
    "soap": "http://schemas.xmlsoap.org/soap/envelope/",
    "tns": "http://tempuri.org/",
}

def post_soap(body: str, action: str) -> requests.Response:
    envelope = f"""<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://tempuri.org/">
  <soap:Body>{body}</soap:Body>
</soap:Envelope>"""
    return requests.post(
        ENDPOINT,
        data=envelope.encode("utf-8"),
        headers={"Content-Type": "text/xml; charset=utf-8", "SOAPAction": action},
        timeout=10,
    )

def test_non_numeric_input_returns_fault():
    body = "<tns:Add><tns:intA>not_a_number</tns:intA><tns:intB>2</tns:intB></tns:Add>"
    resp = post_soap(body, '"http://tempuri.org/Add"')
    # SOAP Faults come back as HTTP 500 on .NET ASMX or 200 elsewhere — inspect the body
    root = etree.fromstring(resp.content)
    fault = root.find(".//soap:Fault", NS)
    assert fault is not None, f"Expected a SOAP Fault, got: {resp.text[:300]}"
    faultstring = fault.findtext("faultstring")
    assert faultstring and faultstring.strip() != ""

def test_missing_soapaction_header_is_rejected():
    body = "<tns:Add><tns:intA>1</tns:intA><tns:intB>2</tns:intB></tns:Add>"
    resp = post_soap(body, "")  # empty SOAPAction
    assert resp.status_code in (400, 415, 500)
```

### 4. Validate a response against the XSD

Pull the schema out of the WSDL (or a standalone `.xsd`) and validate live responses against it to catch contract drift.

```python
from lxml import etree

def test_response_validates_against_schema():
    schema_doc = etree.parse("schemas/calculator_types.xsd")
    schema = etree.XMLSchema(schema_doc)

    body = "<tns:Add><tns:intA>4</tns:intA><tns:intB>6</tns:intB></tns:Add>"
    resp = post_soap(body, '"http://tempuri.org/Add"')

    root = etree.fromstring(resp.content)
    payload = root.find(".//{http://tempuri.org/}AddResponse")
    assert payload is not None
    # raises DocumentInvalid with a precise line/element on drift
    schema.assertValid(payload)
```

### 5. WS-Security UsernameToken (Python zeep)

Attach a signed/plaintext UsernameToken and assert that valid creds succeed and bad creds Fault.

```python
from zeep import Client
from zeep.wsse.username import UsernameToken

def test_valid_username_token_authenticates():
    client = Client(
        WSDL,
        wsse=UsernameToken("svc_user", "s3cret", use_digest=True),
    )
    assert client.service.Add(intA=1, intB=1) == 2

def test_invalid_credentials_raise_fault():
    client = Client(WSDL, wsse=UsernameToken("svc_user", "WRONG"))
    with pytest.raises(Fault) as exc:
        client.service.Add(intA=1, intB=1)
    assert "auth" in str(exc.value).lower() or "security" in str(exc.value).lower()
```

### 6. JAX-WS contract test (Java)

For JVM teams, generate stubs with `wsdl2java` and assert on the typed exception that maps to the Fault.

```java
import jakarta.xml.ws.soap.SOAPFaultException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CalculatorSoapTest {

    private final CalculatorSoap port =
        new Calculator().getCalculatorSoap();  // generated from WSDL

    @Test
    void add_returnsSum() {
        assertEquals(12, port.add(7, 5));
    }

    @Test
    void divideByZero_throwsSoapFault() {
        SOAPFaultException ex = assertThrows(
            SOAPFaultException.class,
            () -> port.divide(10, 0));
        assertNotNull(ex.getFault().getFaultCode());
        assertTrue(ex.getFault().getFaultString().toLowerCase().contains("zero"));
    }
}
```

## Best Practices

- **Snapshot the WSDL into the repo** and diff it in CI. A silently changed contract is the most common SOAP outage. Fail the build on unexpected WSDL/XSD diffs.
- **Register namespace prefixes once** in a shared fixture and reuse the map in every XPath assertion. Never use prefix-less XPath against namespaced SOAP.
- **Assert on Fault detail, not just faultstring.** The `<detail>` block carries the machine-readable error code consumers branch on.
- **Test `mustUnderstand` headers** — send an unknown header with `mustUnderstand="1"` and confirm the service Faults rather than ignoring it.
- **Add a WS-Security timestamp with a tight TTL** and verify the service rejects an expired/replayed request (nonce reuse) to catch missing anti-replay protection.
- **Keep one canonical "golden" request/response pair per operation** as a regression baseline.

## Anti-Patterns

1. **Asserting `status_code == 200` and calling it green.** A SOAP Fault rides inside a 200 on many stacks — you've just shipped a passing test for a broken call.
2. **Prefix-less or wrong-namespace XPath.** `root.find(".//Fault")` returns `None` even when a Fault exists because the element is namespaced. Always bind `soap:`.
3. **Hardcoding the envelope and forgetting `SOAPAction`.** Many services route on the `SOAPAction` header; omitting it produces confusing 415/500s that look like server bugs.
4. **Only testing the generated client.** It will never let you send malformed XML, so your service's input-rejection path goes completely untested. Pair it with raw-XML negative tests.
5. **Skipping XSD validation of responses.** Without it, a server that drops a required field or changes a type passes until a downstream consumer melts.
6. **Putting real credentials/secrets in committed envelopes.** WS-Security tokens belong in env vars or a secrets manager, never in the test fixture XML.

## When to Trigger This Skill

- "Test this SOAP API / web service" or a shared `?wsdl` URL or `.wsdl` file
- "Validate the WSDL / XSD contract" or "check for schema drift"
- "Why is my SOAP Fault not being caught" / "the service returns 200 but it's an error"
- Anything mentioning `zeep`, JAX-WS, Apache CXF, `wsimport`, `wsdl2java`, `System.ServiceModel`, WSDL, SOAPAction, or WS-Security / UsernameToken
- "Add WS-Security / signature / timestamp tests" for an XML web service
