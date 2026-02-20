---
name: Negative Test Generator
description: Systematically generate negative test cases covering invalid inputs, unauthorized actions, missing required fields, exceeded limits, and malformed request payloads
version: 1.0.0
author: Pramod
license: MIT
tags: [negative-testing, error-handling, invalid-input, boundary-testing, validation-testing, robustness, fault-tolerance]
testingTypes: [unit, integration, security]
frameworks: [jest, vitest, pytest]
languages: [typescript, javascript, python, java]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Negative Test Generator Skill

You are an expert QA engineer specializing in negative testing and robustness verification. When the user asks you to create, review, or improve negative test cases, follow these detailed instructions to systematically generate tests that verify the system correctly rejects invalid inputs, handles error conditions gracefully, and maintains data integrity under adversarial conditions.

## Core Principles

1. **Every input has an invalid twin** -- For every valid input a system accepts, there exists a family of invalid inputs that must be rejected. Negative testing maps this family systematically, not randomly.
2. **Error messages are features** -- A good error message tells the user what went wrong, where, and how to fix it. Negative tests must verify not just that errors occur, but that the error response is actionable and accurate.
3. **Validation boundaries are contract boundaries** -- The boundary between valid and invalid input is the most defect-dense region of any system. Test one step inside and one step outside every boundary.
4. **Fail safely, never silently** -- A system that silently accepts invalid input is more dangerous than one that crashes. Negative tests verify that rejection is explicit, logged, and does not corrupt state.
5. **Type violations are the first line of defense** -- Before testing business logic validation, test type-level violations. Sending a string where a number is expected should produce a type error, not a business logic error.
6. **Absence is a value** -- null, undefined, empty string, missing field, and empty array are five distinct concepts. Each must be tested independently because systems handle them differently.
7. **Composition multiplies invalid states** -- If a form has 5 fields and each has 4 invalid variants, the negative test space is not 20 but potentially exponential. Use pairwise testing to manage combinatorial explosion.
8. **Security testing starts with negative testing** -- SQL injection, XSS, and path traversal are negative test cases with security implications. Every input field is a potential attack vector.
9. **Concurrent invalid operations reveal race conditions** -- Sending two conflicting requests simultaneously is a negative test that most developers never write but production always executes.
10. **Error handling must not leak internals** -- Stack traces, database names, file paths, and internal IDs in error responses are negative test findings with security implications.

## Project Structure

```
tests/
  negative/
    generators/
      input-type-violations.ts
      missing-fields.ts
      boundary-violations.ts
      format-violations.ts
      injection-payloads.ts
      concurrent-conflicts.ts
    helpers/
      error-assertions.ts
      payload-builder.ts
      type-fuzzer.ts
    tests/
      api/
        create-user.negative.test.ts
        update-order.negative.test.ts
        authentication.negative.test.ts
        authorization.negative.test.ts
      validation/
        email-validation.negative.test.ts
        number-validation.negative.test.ts
        date-validation.negative.test.ts
        string-validation.negative.test.ts
      payloads/
        malformed-json.negative.test.ts
        oversized-payload.negative.test.ts
        content-type-mismatch.negative.test.ts
      concurrency/
        race-condition.negative.test.ts
        duplicate-submission.negative.test.ts
    config/
      negative-test.config.ts
    data/
      injection-strings.json
      boundary-values.json
```

## Input Type Violation Generator

The foundation of negative testing is systematically generating invalid type variants for every field.

```typescript
// input-type-violations.ts
type FieldType = 'string' | 'number' | 'boolean' | 'email' | 'url' | 'date' | 'uuid' | 'enum' | 'array' | 'object';

interface FieldDefinition {
  name: string;
  type: FieldType;
  required: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  enumValues?: string[];
  format?: string;
}

interface NegativeTestCase {
  name: string;
  field: string;
  category: NegativeCategory;
  input: any;
  expectedError: {
    status?: number;
    code?: string;
    messagePattern?: RegExp;
    field?: string;
  };
}

type NegativeCategory =
  | 'type_violation'
  | 'missing_required'
  | 'boundary_violation'
  | 'format_violation'
  | 'injection'
  | 'null_undefined'
  | 'empty_value'
  | 'overflow'
  | 'encoding'
  | 'special_characters';

function generateTypeViolations(field: FieldDefinition): NegativeTestCase[] {
  const cases: NegativeTestCase[] = [];
  const typeInvalids: Record<FieldType, any[]> = {
    string: [123, true, [], {}, 0, -1, NaN, Infinity],
    number: ['abc', '', true, [], {}, 'NaN', '123abc', null],
    boolean: ['yes', 'no', 1, 0, 'true', 'false', '', null],
    email: [123, true, [], {}, null],
    url: [123, true, [], {}, null],
    date: [123, true, [], {}, 'not-a-date', null],
    uuid: [123, true, [], {}, 'not-a-uuid', null],
    enum: [123, true, [], {}, null],
    array: ['string', 123, true, {}, null],
    object: ['string', 123, true, [], null],
  };

  const invalids = typeInvalids[field.type] || [];

  for (const invalidValue of invalids) {
    cases.push({
      name: `${field.name}: should reject ${typeof invalidValue} (${JSON.stringify(invalidValue)}) when ${field.type} expected`,
      field: field.name,
      category: 'type_violation',
      input: invalidValue,
      expectedError: {
        status: 400,
        code: 'VALIDATION_ERROR',
        messagePattern: new RegExp(`${field.name}.*(?:invalid|expected|must be)`, 'i'),
        field: field.name,
      },
    });
  }

  return cases;
}

function generateMissingFieldCases(fields: FieldDefinition[]): NegativeTestCase[] {
  const cases: NegativeTestCase[] = [];

  for (const field of fields.filter(f => f.required)) {
    // Missing entirely
    cases.push({
      name: `${field.name}: should reject when required field is missing entirely`,
      field: field.name,
      category: 'missing_required',
      input: undefined,
      expectedError: {
        status: 400,
        code: 'VALIDATION_ERROR',
        messagePattern: new RegExp(`${field.name}.*required`, 'i'),
        field: field.name,
      },
    });

    // Explicitly null
    cases.push({
      name: `${field.name}: should reject null for required field`,
      field: field.name,
      category: 'null_undefined',
      input: null,
      expectedError: {
        status: 400,
        code: 'VALIDATION_ERROR',
        field: field.name,
      },
    });

    // Explicitly undefined
    cases.push({
      name: `${field.name}: should reject undefined for required field`,
      field: field.name,
      category: 'null_undefined',
      input: undefined,
      expectedError: {
        status: 400,
        code: 'VALIDATION_ERROR',
        field: field.name,
      },
    });

    // Empty string (for string types)
    if (field.type === 'string' || field.type === 'email' || field.type === 'url') {
      cases.push({
        name: `${field.name}: should reject empty string for required field`,
        field: field.name,
        category: 'empty_value',
        input: '',
        expectedError: {
          status: 400,
          code: 'VALIDATION_ERROR',
          field: field.name,
        },
      });

      cases.push({
        name: `${field.name}: should reject whitespace-only string for required field`,
        field: field.name,
        category: 'empty_value',
        input: '   ',
        expectedError: {
          status: 400,
          code: 'VALIDATION_ERROR',
          field: field.name,
        },
      });
    }

    // Empty array (for array types)
    if (field.type === 'array') {
      cases.push({
        name: `${field.name}: should reject empty array for required field`,
        field: field.name,
        category: 'empty_value',
        input: [],
        expectedError: {
          status: 400,
          code: 'VALIDATION_ERROR',
          field: field.name,
        },
      });
    }
  }

  return cases;
}
```

## Boundary Violation Generator

```typescript
// boundary-violations.ts
function generateBoundaryViolations(field: FieldDefinition): NegativeTestCase[] {
  const cases: NegativeTestCase[] = [];

  // String length boundaries
  if (field.type === 'string' || field.type === 'email' || field.type === 'url') {
    if (field.minLength !== undefined) {
      cases.push({
        name: `${field.name}: should reject string shorter than minLength (${field.minLength})`,
        field: field.name,
        category: 'boundary_violation',
        input: 'a'.repeat(Math.max(0, field.minLength - 1)),
        expectedError: {
          status: 400,
          code: 'VALIDATION_ERROR',
          messagePattern: new RegExp(`${field.name}.*(?:min|short|least|minimum)`, 'i'),
        },
      });
    }

    if (field.maxLength !== undefined) {
      cases.push({
        name: `${field.name}: should reject string exceeding maxLength (${field.maxLength})`,
        field: field.name,
        category: 'boundary_violation',
        input: 'a'.repeat(field.maxLength + 1),
        expectedError: {
          status: 400,
          code: 'VALIDATION_ERROR',
          messagePattern: new RegExp(`${field.name}.*(?:max|long|exceed|maximum)`, 'i'),
        },
      });

      // Significantly exceeding max length
      cases.push({
        name: `${field.name}: should reject extremely long string (10x maxLength)`,
        field: field.name,
        category: 'overflow',
        input: 'a'.repeat(field.maxLength * 10),
        expectedError: {
          status: 400,
          code: 'VALIDATION_ERROR',
        },
      });
    }
  }

  // Numeric boundaries
  if (field.type === 'number') {
    if (field.min !== undefined) {
      cases.push({
        name: `${field.name}: should reject number below minimum (${field.min})`,
        field: field.name,
        category: 'boundary_violation',
        input: field.min - 1,
        expectedError: {
          status: 400,
          code: 'VALIDATION_ERROR',
          messagePattern: new RegExp(`${field.name}.*(?:min|least|greater)`, 'i'),
        },
      });

      cases.push({
        name: `${field.name}: should reject large negative number`,
        field: field.name,
        category: 'boundary_violation',
        input: -Number.MAX_SAFE_INTEGER,
        expectedError: { status: 400, code: 'VALIDATION_ERROR' },
      });
    }

    if (field.max !== undefined) {
      cases.push({
        name: `${field.name}: should reject number above maximum (${field.max})`,
        field: field.name,
        category: 'boundary_violation',
        input: field.max + 1,
        expectedError: {
          status: 400,
          code: 'VALIDATION_ERROR',
          messagePattern: new RegExp(`${field.name}.*(?:max|exceed|less)`, 'i'),
        },
      });
    }

    // Special numeric values
    cases.push({
      name: `${field.name}: should reject NaN`,
      field: field.name,
      category: 'type_violation',
      input: NaN,
      expectedError: { status: 400, code: 'VALIDATION_ERROR' },
    });

    cases.push({
      name: `${field.name}: should reject Infinity`,
      field: field.name,
      category: 'type_violation',
      input: Infinity,
      expectedError: { status: 400, code: 'VALIDATION_ERROR' },
    });

    cases.push({
      name: `${field.name}: should reject -Infinity`,
      field: field.name,
      category: 'type_violation',
      input: -Infinity,
      expectedError: { status: 400, code: 'VALIDATION_ERROR' },
    });

    cases.push({
      name: `${field.name}: should handle -0 correctly`,
      field: field.name,
      category: 'type_violation',
      input: -0,
      expectedError: { status: 400, code: 'VALIDATION_ERROR' },
    });
  }

  return cases;
}
```

## Format Violation Generator

```typescript
// format-violations.ts
function generateFormatViolations(field: FieldDefinition): NegativeTestCase[] {
  const cases: NegativeTestCase[] = [];

  if (field.type === 'email') {
    const invalidEmails = [
      { value: 'notanemail', reason: 'missing @ symbol' },
      { value: '@domain.com', reason: 'missing local part' },
      { value: 'user@', reason: 'missing domain' },
      { value: 'user@.com', reason: 'domain starts with dot' },
      { value: 'user@domain', reason: 'missing TLD' },
      { value: 'user @domain.com', reason: 'contains space' },
      { value: 'user@dom ain.com', reason: 'space in domain' },
      { value: 'user@@domain.com', reason: 'double @ symbol' },
      { value: 'user@domain..com', reason: 'consecutive dots in domain' },
      { value: '<script>@domain.com', reason: 'HTML in local part' },
      { value: 'user@domain.com\n', reason: 'trailing newline' },
      { value: '', reason: 'empty string' },
    ];

    for (const { value, reason } of invalidEmails) {
      cases.push({
        name: `${field.name}: should reject invalid email -- ${reason}`,
        field: field.name,
        category: 'format_violation',
        input: value,
        expectedError: {
          status: 400,
          code: 'VALIDATION_ERROR',
          messagePattern: /email.*invalid|invalid.*email/i,
        },
      });
    }
  }

  if (field.type === 'url') {
    const invalidUrls = [
      { value: 'not-a-url', reason: 'no protocol' },
      { value: 'htp://example.com', reason: 'invalid protocol' },
      { value: 'http://', reason: 'missing host' },
      { value: 'http://example', reason: 'no TLD' },
      { value: '://example.com', reason: 'missing protocol name' },
      { value: 'http://exam ple.com', reason: 'space in host' },
      { value: 'javascript:alert(1)', reason: 'javascript protocol' },
      { value: 'data:text/html,<script>alert(1)</script>', reason: 'data URI with script' },
    ];

    for (const { value, reason } of invalidUrls) {
      cases.push({
        name: `${field.name}: should reject invalid URL -- ${reason}`,
        field: field.name,
        category: 'format_violation',
        input: value,
        expectedError: {
          status: 400,
          code: 'VALIDATION_ERROR',
          messagePattern: /url.*invalid|invalid.*url/i,
        },
      });
    }
  }

  if (field.type === 'date') {
    const invalidDates = [
      { value: '2024-13-01', reason: 'month 13' },
      { value: '2024-02-30', reason: 'February 30th' },
      { value: '2024-00-01', reason: 'month 0' },
      { value: '2024-01-32', reason: 'day 32' },
      { value: '2024-01-00', reason: 'day 0' },
      { value: '24-01-15', reason: 'two-digit year' },
      { value: 'January 15, 2024', reason: 'non-ISO format' },
      { value: '01/15/2024', reason: 'US format slashes' },
      { value: '2024/01/15', reason: 'forward slashes' },
      { value: 'not-a-date', reason: 'non-date string' },
      { value: '9999-12-31T23:59:59.999Z', reason: 'far future date' },
      { value: '0000-01-01', reason: 'year zero' },
    ];

    for (const { value, reason } of invalidDates) {
      cases.push({
        name: `${field.name}: should reject invalid date -- ${reason}`,
        field: field.name,
        category: 'format_violation',
        input: value,
        expectedError: {
          status: 400,
          code: 'VALIDATION_ERROR',
        },
      });
    }
  }

  if (field.type === 'uuid') {
    const invalidUuids = [
      { value: 'not-a-uuid', reason: 'non-UUID string' },
      { value: '12345678-1234-1234-1234-12345678901', reason: 'too short' },
      { value: '12345678-1234-1234-1234-1234567890123', reason: 'too long' },
      { value: '12345678123412341234123456789012', reason: 'missing hyphens' },
      { value: 'ZZZZZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZZZZZZZZZ', reason: 'non-hex characters' },
      { value: '00000000-0000-0000-0000-000000000000', reason: 'nil UUID (may be invalid in context)' },
    ];

    for (const { value, reason } of invalidUuids) {
      cases.push({
        name: `${field.name}: should reject invalid UUID -- ${reason}`,
        field: field.name,
        category: 'format_violation',
        input: value,
        expectedError: {
          status: 400,
          code: 'VALIDATION_ERROR',
        },
      });
    }
  }

  if (field.type === 'enum' && field.enumValues) {
    cases.push({
      name: `${field.name}: should reject value not in enum`,
      field: field.name,
      category: 'format_violation',
      input: 'INVALID_ENUM_VALUE',
      expectedError: {
        status: 400,
        code: 'VALIDATION_ERROR',
        messagePattern: new RegExp(`${field.name}.*(?:invalid|must be one of|enum)`, 'i'),
      },
    });

    // Case sensitivity
    if (field.enumValues.length > 0) {
      const firstValue = field.enumValues[0];
      cases.push({
        name: `${field.name}: should reject wrong-case enum value`,
        field: field.name,
        category: 'format_violation',
        input: firstValue === firstValue.toLowerCase() ? firstValue.toUpperCase() : firstValue.toLowerCase(),
        expectedError: { status: 400, code: 'VALIDATION_ERROR' },
      });
    }
  }

  return cases;
}
```

## Injection Payload Generator

```typescript
// injection-payloads.ts
function generateInjectionPayloads(field: FieldDefinition): NegativeTestCase[] {
  const cases: NegativeTestCase[] = [];

  if (field.type === 'string' || field.type === 'email' || field.type === 'url') {
    const injectionStrings = [
      // SQL injection
      { value: "'; DROP TABLE users; --", category: 'SQL injection' },
      { value: "' OR '1'='1", category: 'SQL injection' },
      { value: "' UNION SELECT * FROM passwords --", category: 'SQL injection' },
      { value: "1; UPDATE users SET role='admin' WHERE '1'='1", category: 'SQL injection' },

      // XSS
      { value: '<script>alert("XSS")</script>', category: 'XSS' },
      { value: '<img src=x onerror=alert(1)>', category: 'XSS' },
      { value: '"><script>alert(document.cookie)</script>', category: 'XSS' },
      { value: "javascript:alert('XSS')", category: 'XSS' },
      { value: '<svg onload=alert(1)>', category: 'XSS' },

      // Path traversal
      { value: '../../../etc/passwd', category: 'Path traversal' },
      { value: '..\\..\\..\\windows\\system32\\config\\sam', category: 'Path traversal' },
      { value: '/etc/shadow', category: 'Path traversal' },

      // Command injection
      { value: '; ls -la', category: 'Command injection' },
      { value: '| cat /etc/passwd', category: 'Command injection' },
      { value: '$(whoami)', category: 'Command injection' },
      { value: '`id`', category: 'Command injection' },

      // LDAP injection
      { value: '*)(objectClass=*)', category: 'LDAP injection' },

      // XML injection
      { value: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>', category: 'XXE' },

      // Header injection
      { value: 'value\r\nInjected-Header: malicious', category: 'Header injection' },

      // Unicode and encoding attacks
      { value: '\u0000null_byte', category: 'Null byte injection' },
      { value: '%00null_byte', category: 'URL-encoded null byte' },
      { value: '\uFEFFBOM_prefix', category: 'BOM injection' },
    ];

    for (const { value, category } of injectionStrings) {
      cases.push({
        name: `${field.name}: should safely handle ${category} attempt`,
        field: field.name,
        category: 'injection',
        input: value,
        expectedError: {
          status: 400,
          code: 'VALIDATION_ERROR',
          // The response should NOT contain the injected content reflected back
        },
      });
    }
  }

  return cases;
}
```

## API Negative Testing

```typescript
// create-user.negative.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api';

// Define the schema for test generation
const userFields: FieldDefinition[] = [
  { name: 'email', type: 'email', required: true, maxLength: 255 },
  { name: 'name', type: 'string', required: true, minLength: 1, maxLength: 100 },
  { name: 'age', type: 'number', required: false, min: 0, max: 150 },
  { name: 'role', type: 'enum', required: true, enumValues: ['admin', 'user', 'moderator'] },
  { name: 'website', type: 'url', required: false, maxLength: 2048 },
  { name: 'birthDate', type: 'date', required: false },
];

const validUser = {
  email: 'test@example.com',
  name: 'Test User',
  age: 25,
  role: 'user',
  website: 'https://example.com',
  birthDate: '1998-06-15',
};

describe('POST /api/users -- Negative Tests', () => {
  // Generate and run type violation tests for every field
  for (const field of userFields) {
    const typeViolations = generateTypeViolations(field);

    describe(`${field.name} -- type violations`, () => {
      for (const testCase of typeViolations) {
        it(testCase.name, async () => {
          const payload = { ...validUser, [field.name]: testCase.input };
          const response = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          expect(response.status).toBe(testCase.expectedError.status);
          const body = await response.json();
          expect(body.code || body.error).toBeDefined();

          // Verify error does not leak internal details
          const bodyText = JSON.stringify(body);
          expect(bodyText).not.toMatch(/stack|trace|node_modules|internal/i);
        });
      }
    });
  }

  // Missing required fields
  describe('Missing required fields', () => {
    const missingFieldCases = generateMissingFieldCases(userFields);

    for (const testCase of missingFieldCases) {
      it(testCase.name, async () => {
        const payload = { ...validUser };
        if (testCase.input === undefined) {
          delete (payload as any)[testCase.field];
        } else {
          (payload as any)[testCase.field] = testCase.input;
        }

        const response = await fetch(`${API_BASE}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        expect(response.status).toBe(400);
      });
    }
  });

  // Boundary violations
  describe('Boundary violations', () => {
    for (const field of userFields) {
      const boundaryViolations = generateBoundaryViolations(field);

      for (const testCase of boundaryViolations) {
        it(testCase.name, async () => {
          const payload = { ...validUser, [field.name]: testCase.input };
          const response = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          expect(response.status).toBe(400);
        });
      }
    }
  });

  // Format violations
  describe('Format violations', () => {
    for (const field of userFields) {
      const formatViolations = generateFormatViolations(field);

      for (const testCase of formatViolations) {
        it(testCase.name, async () => {
          const payload = { ...validUser, [field.name]: testCase.input };
          const response = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          expect(response.status).toBe(400);
        });
      }
    }
  });

  // Injection attempts
  describe('Injection attempts', () => {
    for (const field of userFields) {
      const injectionCases = generateInjectionPayloads(field);

      for (const testCase of injectionCases) {
        it(testCase.name, async () => {
          const payload = { ...validUser, [field.name]: testCase.input };
          const response = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          // Should either reject (400) or sanitize (200 with sanitized data)
          expect(response.status).toBeOneOf([400, 200, 422]);

          // If accepted, verify the injection is not reflected back unsanitized
          if (response.status === 200) {
            const body = await response.json();
            const bodyStr = JSON.stringify(body);
            expect(bodyStr).not.toContain('<script>');
            expect(bodyStr).not.toContain('DROP TABLE');
          }
        });
      }
    }
  });
});
```

## Malformed Request Testing

```typescript
// malformed-json.negative.test.ts
describe('Malformed Request Handling', () => {
  describe('Invalid JSON body', () => {
    it('should reject malformed JSON', async () => {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"email": "test@example.com",}', // trailing comma
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message || body.error).toMatch(/json|parse|syntax/i);
    });

    it('should reject truncated JSON', async () => {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"email": "test@exam',
      });

      expect(response.status).toBe(400);
    });

    it('should reject empty body', async () => {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '',
      });

      expect(response.status).toBe(400);
    });

    it('should reject non-JSON content type with JSON body', async () => {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(validUser),
      });

      expect(response.status).toBeOneOf([400, 415]); // 415 Unsupported Media Type
    });

    it('should reject body with duplicate keys', async () => {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"email": "good@test.com", "email": "evil@test.com", "name": "Test", "role": "user"}',
      });

      // At minimum, the last value should not silently override
      if (response.status === 200) {
        const body = await response.json();
        // Document which value wins
        expect(body.email).toBeDefined();
      }
    });
  });

  describe('Oversized payloads', () => {
    it('should reject payload exceeding size limit', async () => {
      const oversizedPayload = {
        ...validUser,
        name: 'x'.repeat(10 * 1024 * 1024), // 10MB string
      };

      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oversizedPayload),
      });

      expect(response.status).toBeOneOf([400, 413]); // 413 Payload Too Large
    });

    it('should reject deeply nested JSON', async () => {
      let nested: any = { value: 'deep' };
      for (let i = 0; i < 100; i++) {
        nested = { child: nested };
      }

      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validUser, metadata: nested }),
      });

      expect(response.status).toBeOneOf([400, 413, 422]);
    });

    it('should reject payload with excessive array elements', async () => {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validUser,
          tags: Array.from({ length: 100000 }, (_, i) => `tag_${i}`),
        }),
      });

      expect(response.status).toBeOneOf([400, 413, 422]);
    });
  });
});
```

## Authentication and Authorization Negative Tests

```typescript
// authentication.negative.test.ts
describe('Authentication Negative Tests', () => {
  it('should reject request with no auth token', async () => {
    const response = await fetch(`${API_BASE}/users/me`, {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.message || body.error).toMatch(/auth|token|unauthorized/i);
  });

  it('should reject request with expired token', async () => {
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNjAwMDAwMDAwfQ.invalid';
    const response = await fetch(`${API_BASE}/users/me`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expiredToken}`,
      },
    });

    expect(response.status).toBe(401);
  });

  it('should reject request with malformed token', async () => {
    const response = await fetch(`${API_BASE}/users/me`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer not.a.valid.jwt',
      },
    });

    expect(response.status).toBe(401);
  });

  it('should reject request with token signed by wrong key', async () => {
    const wrongKeyToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const response = await fetch(`${API_BASE}/users/me`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wrongKeyToken}`,
      },
    });

    expect(response.status).toBe(401);
  });

  it('should reject non-Bearer auth scheme', async () => {
    const response = await fetch(`${API_BASE}/users/me`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic dXNlcjpwYXNz',
      },
    });

    expect(response.status).toBeOneOf([401, 403]);
  });
});

// authorization.negative.test.ts
describe('Authorization Negative Tests', () => {
  it('should reject user accessing another user profile', async () => {
    const response = await fetch(`${API_BASE}/users/other-user-id`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${regularUserToken}`,
      },
    });

    expect(response.status).toBe(403);
  });

  it('should reject non-admin accessing admin endpoints', async () => {
    const response = await fetch(`${API_BASE}/admin/users`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${regularUserToken}`,
      },
    });

    expect(response.status).toBe(403);
  });

  it('should reject deleted user token', async () => {
    const response = await fetch(`${API_BASE}/users/me`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deletedUserToken}`,
      },
    });

    expect(response.status).toBeOneOf([401, 403]);
  });
});
```

## Concurrent Conflict Testing

```typescript
// race-condition.negative.test.ts
describe('Concurrent Operation Conflicts', () => {
  it('should handle duplicate creation requests', async () => {
    const user = { email: 'unique@example.com', name: 'Race Test', role: 'user' };

    const [response1, response2] = await Promise.all([
      fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      }),
      fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      }),
    ]);

    const statuses = [response1.status, response2.status].sort();
    // One should succeed (201), the other should fail (409 Conflict)
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);
  });

  it('should handle concurrent updates with optimistic locking', async () => {
    // Create a resource first
    const createResponse = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ items: [{ id: 'i1', quantity: 1 }] }),
    });
    const { id, version } = await createResponse.json();

    // Two concurrent updates with the same version
    const [update1, update2] = await Promise.all([
      fetch(`${API_BASE}/orders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'If-Match': version,
        },
        body: JSON.stringify({ status: 'confirmed' }),
      }),
      fetch(`${API_BASE}/orders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'If-Match': version,
        },
        body: JSON.stringify({ status: 'cancelled' }),
      }),
    ]);

    const statuses = [update1.status, update2.status].sort();
    expect(statuses).toContain(200);
    expect(statuses).toContain(409); // Optimistic locking conflict
  });
});
```

## Configuration

```typescript
// negative-test.config.ts
interface NegativeTestConfig {
  generation: {
    includeTypeViolations: boolean;
    includeMissingFields: boolean;
    includeBoundaryViolations: boolean;
    includeFormatViolations: boolean;
    includeInjectionPayloads: boolean;
    includeConcurrencyTests: boolean;
    customInjectionPayloadsPath?: string;
  };
  execution: {
    apiBaseUrl: string;
    authToken?: string;
    timeoutMs: number;
    retryCount: number;
    parallelRequests: number;
  };
  validation: {
    requireActionableErrorMessages: boolean;
    forbidInternalDetailsInErrors: boolean;
    maxResponseTimeMs: number;
    expectedErrorFormat: 'rfc7807' | 'custom' | 'any';
  };
  reporting: {
    outputDirectory: string;
    format: 'json' | 'markdown' | 'junit';
    includePayloads: boolean;
    includeResponseBodies: boolean;
  };
}

const defaultConfig: NegativeTestConfig = {
  generation: {
    includeTypeViolations: true,
    includeMissingFields: true,
    includeBoundaryViolations: true,
    includeFormatViolations: true,
    includeInjectionPayloads: true,
    includeConcurrencyTests: true,
  },
  execution: {
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
    timeoutMs: 10000,
    retryCount: 0,
    parallelRequests: 5,
  },
  validation: {
    requireActionableErrorMessages: true,
    forbidInternalDetailsInErrors: true,
    maxResponseTimeMs: 5000,
    expectedErrorFormat: 'any',
  },
  reporting: {
    outputDirectory: './test-artifacts/negative-tests',
    format: 'json',
    includePayloads: true,
    includeResponseBodies: true,
  },
};
```

## Best Practices

1. **Define your valid baseline first** -- Before generating negative tests, establish a known-good valid payload that passes all validation. Every negative test modifies exactly one aspect of this baseline.

2. **Test one invalid field at a time** -- When testing field-level validation, keep all other fields valid. Testing multiple invalid fields simultaneously masks which validation triggered the error.

3. **Verify the specific error, not just the status code** -- A 400 response is necessary but not sufficient. Verify that the error message identifies the correct field, the correct violation, and provides guidance for correction.

4. **Test error response consistency** -- All error responses should follow the same format. If one endpoint returns `{ error: "message" }` and another returns `{ message: "error" }`, that inconsistency is a finding.

5. **Verify no state mutation on rejected requests** -- After a rejected request, query the resource to confirm nothing changed. A system that returns 400 but partially applies the change has a critical bug.

6. **Test error responses under load** -- Error handling paths that work under normal conditions may fail under load (connection pool exhaustion, memory pressure). Include negative tests in your load test suite.

7. **Generate negative tests from your API schema** -- If you have OpenAPI, JSON Schema, or Zod definitions, generate negative tests programmatically. Manual enumeration is slow and incomplete.

8. **Include negative tests in CI** -- Negative tests catch regressions in validation logic. A "fix" that removes validation because it was "too strict" should cause test failures.

9. **Test the error response time** -- Error responses should be as fast as or faster than success responses. A slow error response suggests the system is doing work it should have rejected earlier.

10. **Document expected behavior for each negative case** -- "Should return an error" is not a specification. Document the exact status code, error code, and message pattern expected for each negative case.

11. **Test error handling at every layer** -- Validation errors (400), authentication errors (401), authorization errors (403), not found (404), conflict (409), rate limiting (429), and server errors (500) are all distinct negative test categories.

12. **Verify idempotency of error responses** -- Sending the same invalid request twice should produce the same error. Non-deterministic error responses indicate shared mutable state in the validation layer.

## Anti-Patterns to Avoid

1. **Only testing the happy path and calling it done** -- If your test suite has 50 positive tests and 2 negative tests, your validation coverage is likely below 10%. The ratio should be at least 1:1 positive to negative.

2. **Using generic assertions like expect(response.ok).toBe(false)** -- This tells you nothing about whether the right error was returned. Assert the specific status code, error code, and affected field.

3. **Hardcoding injection strings instead of generating them** -- Injection payloads evolve. Use a maintained payload list (OWASP, SecLists) rather than a static list that becomes outdated.

4. **Testing validation only at the API boundary** -- Validation should exist at multiple layers: client-side, API handler, service layer, and database constraints. Negative tests should verify defense in depth.

5. **Ignoring error response body content** -- An error response that contains a stack trace, database connection string, or internal file path is a security vulnerability. Always assert that error responses do not leak internals.

6. **Treating all 4xx errors as equivalent** -- 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 409 (conflict), 422 (unprocessable), and 429 (rate limited) all mean different things. Test for the specific code.

7. **Skipping null/undefined/empty string distinctions** -- In JavaScript, these are three different values with three different behaviors. A field that accepts null but rejects undefined has a bug or a design decision that must be documented.

8. **Not testing error recovery** -- After receiving an error, the system should accept the next valid request normally. A system that enters a broken state after handling an error has a state management bug.

## Debugging Tips

1. **Test returns 500 instead of 400** -- The validation layer is not catching the invalid input before it reaches the business logic or database. Add validation middleware or schema validation at the API handler level.

2. **Error message does not identify the invalid field** -- The validation library may be returning a generic message. Configure it to include field paths. With Zod, use `.safeParse()` and inspect `.error.issues[].path`.

3. **Injection string is accepted without sanitization** -- Check whether the system relies on client-side validation only. Server-side validation must exist independently. Also verify that parameterized queries are used for database access.

4. **Same invalid input produces different errors on retry** -- This indicates non-deterministic validation order or shared state. Ensure validation is stateless and processes fields in a deterministic order.

5. **Error response is slower than success response** -- The error path may be triggering exception handling, stack trace generation, or logging overhead. Profile the error handler and optimize.

6. **Concurrent duplicate requests both succeed** -- The uniqueness constraint may not be enforced at the database level. Add a UNIQUE constraint or use INSERT ... ON CONFLICT to ensure atomicity.

7. **Unicode characters cause encoding errors instead of validation errors** -- Ensure the application correctly handles UTF-8 throughout the stack. The error should be a validation rejection, not an encoding crash.

8. **Test passes locally but fails in CI** -- Check environment differences: database collation settings, locale configurations, and time zone settings all affect validation behavior for strings, dates, and numbers.

9. **Negative test generates false positive** -- The test may be too strict about the error format. If the system returns a valid error but with slightly different wording, update the assertion to use a regex pattern rather than an exact string match.

10. **Large payload test hangs instead of returning 413** -- The server may not have a request body size limit configured. Add body-parser limits (Express: `express.json({ limit: '1mb' })`) or equivalent middleware configuration.