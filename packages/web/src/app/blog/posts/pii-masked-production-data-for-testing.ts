import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Using PII-Masked Production Data for Testing',
  description:
    'Use PII-masked production data for testing while preserving referential integrity, distributions, chronology, uniqueness, and measurable privacy safeguards.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Using PII-Masked Production Data for Testing

Replace every customer email with test@example.com and the staging import fails on the first unique constraint. Replace each customer ID independently and the order graph falls apart. Leave rare job titles and postal sectors untouched and the dataset may still identify a person even though names disappeared. Production-shaped test data is a data-engineering and privacy problem, not a search-and-replace task.

A defensible masked dataset preserves only the properties a named test needs: relationships, valid formats, useful distributions, chronological intervals, or uniqueness. It removes direct identifiers, reduces quasi-identifier precision, handles free text aggressively, and produces evidence that the result cannot be reversed or joined back casually.

## Begin with test utility, not a copy request

“We need production data in QA” is too broad to approve. Ask which defects synthetic fixtures cannot expose. A billing migration may need cardinalities, null rates, currency combinations, and invoice-to-line relationships. A search performance run may need term-frequency and document-size distributions but no real prose. A timezone regression may need offset diversity and event ordering, not exact addresses.

Translate those needs into permitted properties before selecting a transformation.

| Testing need | Property worth preserving | Property usually unnecessary | Candidate treatment |
| --- | --- | --- | --- |
| Foreign-key migration | Key equality across related tables | Original business identifiers | Deterministic token mapping |
| Email uniqueness logic | Valid shape and uniqueness | Real local part and domain | Synthetic deterministic address |
| Aging calculation | Interval between related dates | Actual calendar date | Per-subject consistent date shift |
| Regional tax rule | Jurisdiction code | Street and precise postal code | Retain approved coarse region |
| Query-plan rehearsal | Row counts and value skew | Exact customer values | Sample plus distribution-preserving synthesis |
| Full-text failure handling | Length, language, malformed markup | User-written sentences | Generated corpus with matching characteristics |

If no test uses a field, delete it from the exported schema. Masking an unnecessary column adds disclosure risk and implementation work without increasing coverage.

## Inventory identifiers by how they can reveal someone

Direct identifiers include names, email addresses, phone numbers, government numbers, account handles, device IDs, and precise locations. Quasi-identifiers such as birth date, postal area, occupation, employer, or unusual timestamps can identify a person when combined. Sensitive attributes include health, financial, biometric, employment, and behavioral data. Free text can contain all three in unpredictable positions.

Classification must follow data lineage, not column names. created_by may hold an employee email. payload may contain serialized contact details. object_key can include a customer ID. Support attachments, logs, analytics properties, and search indexes are common blind spots.

Create a field register with owner, purpose, sensitivity, transformation, retained utility, join dependencies, and deletion rule. Review nested JSON keys and arrays individually. A single label such as “masked JSON” is not auditable.

| Field pattern | Hidden exposure | Review question | Default stance |
| --- | --- | --- | --- |
| email_hash | Stable cross-system linkage | Was it keyed, salted, and scoped? | Replace with environment-scoped token |
| ip_address | Household or device inference | Does any approved test need network precision? | Remove or generalize heavily |
| event_timestamp | Rare activity signature | Can dates be bucketed or shifted? | Preserve order, reduce exactness |
| notes | Names, diagnoses, secrets in prose | Can generated text serve the test? | Drop and synthesize |
| latitude/longitude | Home or workplace location | Is broad region sufficient? | Remove precision or generate |
| external_reference | Link to public records | Can a tester resolve it outside the dataset? | Tokenize consistently |

Column comments and ORM types help discovery, but sample-based scanning is not proof of absence. Combine schema review, producer knowledge, automated detectors, and conservative handling of unknown blobs.

## Choose transformations according to the invariant

Masking is an umbrella term. Redaction deletes value. Substitution generates a plausible replacement. Generalization reduces precision. Permutation shuffles values within a population. Deterministic tokenization maps the same input to the same output. Date shifting moves related timestamps together. Each preserves and destroys different information.

Plain unsalted hashing is usually a poor identifier mask. Email and phone spaces are guessable, and a stable digest enables linking across every leaked copy. A keyed HMAC is stronger for deterministic mapping because an attacker without the key cannot cheaply reproduce the map. Scope the key or include a dataset namespace so tokens from two environments cannot be joined by equality.

Encryption is reversible and therefore not anonymization. It may be appropriate for a controlled vault workflow, but copying decryption capability into QA recreates the original exposure. If reversibility is unnecessary, do not build it.

Permutation preserves a real value set. That can retain rare identifying values and can reconstruct relationships when attackers know auxiliary facts. Use it only after evaluating those risks and never for free text or unique identifiers.

## Preserve relationships with one stable mapping per domain key

The same source customer identifier may appear in customers, orders, tickets, event payloads, and an external warehouse. Transforming each table independently breaks referential integrity. Build a canonical mapping for each identifier domain, then apply it everywhere in the approved extraction graph.

Surrogate database keys can sometimes remain unchanged in an isolated dataset if they have no meaning outside it. Public account numbers, UUIDs exposed in URLs, and third-party IDs need new values even when they are technically keys. Decide based on linkability, not SQL type.

One-to-one mapping must also respect constraints. A deterministic email generator should remain unique. A replacement phone may need an allowed reserved range and valid length. A masked enum must stay inside the application vocabulary. Preserve null separately so missingness tests remain useful.

For polymorphic references and values embedded in JSON, central mapping tables reduce drift. Validate every foreign key after transformation, including logical references the database does not constrain. Orphan counts should be zero unless the source legitimately contains orphans and that defect is an intended fixture.

## Build an irreversible PostgreSQL transformation boundary

Run masking in a restricted pipeline that can read an approved snapshot and write only to a sanitized target. Testers should never receive source credentials. The following PostgreSQL example uses pgcrypto HMAC for deterministic, dataset-scoped tokens, generates reserved example.test email addresses, preserves order relationships, and shifts all dates for one customer by the same offset.

The key is supplied as a session setting by the pipeline's secret manager. It must not be committed, logged, or copied to the target database.

\`\`\`sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

CREATE TEMP TABLE customer_map ON COMMIT DROP AS
SELECT
  c.customer_id AS source_customer_id,
  'cust_' || substr(
    encode(
      hmac(
        convert_to('qa-2026:' || c.customer_id::text, 'UTF8'),
        convert_to(current_setting('app.mask_key'), 'UTF8'),
        'sha256'
      ),
      'hex'
    ),
    1,
    24
  ) AS masked_customer_id,
  (get_byte(
    hmac(
      convert_to(c.customer_id::text, 'UTF8'),
      convert_to(current_setting('app.mask_key'), 'UTF8'),
      'sha256'
    ),
    0
  ) % 61) - 30 AS date_shift_days
FROM source_snapshot.customers AS c;

INSERT INTO sanitized.customers (
  customer_id,
  display_name,
  email,
  region_code,
  created_at
)
SELECT
  m.masked_customer_id,
  'Test Customer ' || right(m.masked_customer_id, 8),
  'qa+' || right(m.masked_customer_id, 16) || '@example.test',
  c.region_code,
  c.created_at + make_interval(days => m.date_shift_days)
FROM source_snapshot.customers AS c
JOIN customer_map AS m ON m.source_customer_id = c.customer_id;

INSERT INTO sanitized.orders (
  order_id,
  customer_id,
  status,
  currency,
  total_minor,
  placed_at,
  customer_note
)
SELECT
  'ord_' || substr(
    encode(
      hmac(
        convert_to('order:' || o.order_id::text, 'UTF8'),
        convert_to(current_setting('app.mask_key'), 'UTF8'),
        'sha256'
      ),
      'hex'
    ),
    1,
    24
  ),
  m.masked_customer_id,
  o.status,
  o.currency,
  o.total_minor,
  o.placed_at + make_interval(days => m.date_shift_days),
  NULL
FROM source_snapshot.orders AS o
JOIN customer_map AS m ON m.source_customer_id = o.customer_id;

COMMIT;
\`\`\`

The example retains monetary amounts and coarse region because the hypothetical billing tests require them. That choice still needs a risk review: an unusual amount combined with date and region might identify a person. A safer pipeline might bucket amounts, sample common cases, or synthesize rare tails.

Date shifting preserves the interval between customer creation and order placement because both use one customer-specific offset. It does not preserve cross-customer calendar correlations. If month-end load is required, shift within controlled calendar buckets or generate an additional aggregate fixture rather than keeping exact timestamps.

## Treat free text as hostile to reliable masking

Regular expressions can catch obvious email and phone patterns, but people mention names, diagnoses, account numbers, addresses, and secrets in formats no pattern anticipates. Named-entity recognition also has false negatives. For most test purposes, replace notes, chat transcripts, logs, and attachment text with generated content.

Preserve measurable properties instead: language tag, length bucket, line count, Unicode class, markup shape, or presence of deliberately synthetic malformed input. Build a corpus designed for parsers and search behavior. If production vocabulary distribution matters, derive aggregated token frequencies under privacy review and generate new documents from approved terms.

When a narrow test truly needs production-like text, use layered detection, human review in a restricted environment, minimum group thresholds, and a residual-risk sign-off. Do not label a dataset anonymous because a scanner reported no matches. Scanner coverage is evidence, not proof.

Attachments deserve their own pipeline. Image metadata, faces, signatures, QR codes, filenames, and embedded document properties can reveal identities. Replacing a database attachment_id while copying the original object leaves the largest exposure untouched.

## Validate privacy invariants as executable tests

The masking job needs tests just like a migration. Structural assertions check row counts within approved tolerances, foreign keys, null-rate drift, uniqueness, enums, and chronological relationships. Privacy assertions check forbidden domains, direct identifier patterns, source-to-target equality, rare quasi-identifier groups, and absence of dropped columns.

This runnable pytest example uses psycopg to inspect the sanitized database. It checks referential integrity, reserved email domains, uniqueness, chronology, and minimum group size for the retained region and age-band combination. The threshold is an organization policy for this dataset, not a universal guarantee of anonymity.

\`\`\`python
import os

import psycopg


def test_sanitized_dataset_invariants():
    with psycopg.connect(os.environ['SANITIZED_DATABASE_URL']) as connection:
        with connection.cursor() as cursor:
            cursor.execute('''
                SELECT count(*)
                FROM sanitized.orders AS o
                LEFT JOIN sanitized.customers AS c USING (customer_id)
                WHERE c.customer_id IS NULL
            ''')
            assert cursor.fetchone()[0] == 0

            cursor.execute('''
                SELECT count(*)
                FROM sanitized.customers
                WHERE email !~ '^[a-z0-9+_-]+@example\\.test$'
            ''')
            assert cursor.fetchone()[0] == 0

            cursor.execute('''
                SELECT count(*) - count(DISTINCT email)
                FROM sanitized.customers
            ''')
            assert cursor.fetchone()[0] == 0

            cursor.execute('''
                SELECT count(*)
                FROM sanitized.orders AS o
                JOIN sanitized.customers AS c USING (customer_id)
                WHERE o.placed_at < c.created_at
            ''')
            assert cursor.fetchone()[0] == 0

            cursor.execute('''
                SELECT min(group_size)
                FROM (
                  SELECT region_code, age_band, count(*) AS group_size
                  FROM sanitized.customer_demographics
                  GROUP BY region_code, age_band
                ) AS groups
            ''')
            minimum_group = cursor.fetchone()[0]
            assert minimum_group is None or minimum_group >= 10
\`\`\`

k-anonymity-style group checks can reveal small equivalence classes, but they do not measure every attack, sensitive-value homogeneity, or background knowledge. Use them as one control within a documented threat model, not as a certification badge.

Never place source values in assertion failure output. A test comparing masked emails against original emails can report only counts and internal batch identifiers. Detailed investigation belongs in the restricted transformation environment.

## Measure utility without retaining the exact rows

A privacy-safe dataset that no longer exercises production behavior is wasted risk. Compare approved aggregate characteristics between source and sanitized output inside the restricted job: row-count ratios, null proportions, category frequencies, relationship fan-out, amount quantiles, text-length buckets, and query-plan-relevant skew.

Set tolerance by test purpose. Referential integrity requires zero unexplained orphans. A performance sample may accept approximate distributions. Financial reconciliation may require exact arithmetic totals on entirely synthetic account values. Write those decisions in the dataset contract.

| Utility metric | Why it matters | Example acceptance rule |
| --- | --- | --- |
| Orders per customer distribution | Join fan-out and pagination | Selected quantiles within reviewed tolerance |
| Null rate by field | Validation and fallback branches | No material drift for tested fields |
| Status frequency | Workflow branch coverage | Every supported state represented |
| Timestamp interval distribution | Aging and timeout logic | Bucket proportions remain useful |
| Unique email ratio | Constraint and lookup behavior | Exactly one email per retained customer |
| Query plan for key workloads | Performance rehearsal | Same join strategy at target scale, where feasible |

Do not publish source aggregates that reveal small groups. Apply suppression or minimum thresholds before metrics leave the secure boundary. An aggregate can still be personal data when it describes one or two people.

## Break linkage across environments and refreshes

If the same deterministic token appears in QA, analytics, support, and every monthly refresh, anyone with access can correlate records across systems. Scope mappings by environment and dataset generation. Whether refresh-to-refresh stability is worth that linkage should be a reviewed tradeoff.

Some regression suites need stable test identities. Preserve a small synthetic golden cohort for those cases instead of making the entire masked population linkable forever. Rotating the masking key for bulk refreshes limits longitudinal reconstruction and requires old datasets to be destroyed.

Keys belong in a secret manager accessible only to the transformation job. Test environments receive masked output, never the key or mapping table. Logs should contain job version, rule-set digest, row counts, validation results, approver, and expiry, but no value-level examples from source.

If a mapping must support incident investigation, keep it in a separately controlled vault with access logging and a destruction schedule. Recognize that such a dataset remains pseudonymized and potentially re-identifiable, not anonymous.

## Sample before transformation when full scale is unnecessary

Copying every production row increases exposure and processing cost. Sample a relationship-closed subgraph: select approved root entities, then include their dependent orders, lines, payments, and events according to retention rules. Sampling child tables independently creates orphans and distorts fan-out.

Stratify roots to retain important states, regions, account sizes, and edge cases, but suppress rare combinations that increase re-identification risk. Add synthetic boundary cases after masking rather than hunting for a real individual who exhibits them. A deliberately constructed leap-day invoice or maximum-length surname is more stable and ethical than preserving someone's record because it is unusual.

Large performance tests may need production scale without production people. Use the masked sample to estimate distributions, then synthesize additional rows with new identifiers. Validate aggregate utility and ensure generated rows cannot be mistaken for genuine customers.

The [test data management strategies guide](/blog/test-data-management-strategies) covers synthetic generation, subsetting, and lifecycle choices alongside masking. For transformation techniques and policy design, use the [test data privacy and masking guide](/blog/test-data-privacy-masking-guide).

## Put access, retention, and destruction around the dataset

Masking reduces risk but does not eliminate it. Apply least privilege, network isolation, encryption in transit and at rest, audit logs, environment-specific accounts, and a short retention period. Block outbound integrations so test systems cannot email, text, charge, or enrich masked records through production services.

Label every dataset with source snapshot time, rule-set version, classification, permitted uses, owner, and destruction date. Automate expiry. Backups, database snapshots, search indexes, caches, object storage exports, and developer downloads must follow the same deletion process.

Refreshes should be reproducible jobs with approval gates, not ad hoc dumps. A failed privacy validation must stop publication atomically. Never leave partially masked tables available while later steps finish. Write to an isolated target, validate, then promote access to the completed generation.

Regulatory obligations depend on jurisdiction, contract, data type, and whether the transformation is reversible or linkable. Engage privacy and security specialists for the actual risk determination. A technical masking checklist does not by itself change the legal status of data.

## Review failure modes before calling the pipeline complete

The most dangerous failures are quiet. New columns arrive without rules. A JSON producer adds phoneNumber. A unique constraint forces developers to weaken masking. A tester exports a subset to a laptop. A copied search index outlives the database. Design controls for those paths.

Schema drift should fail closed: newly discovered fields are excluded until classified, not copied by SELECT *. Rule changes need code review from data owners and privacy reviewers. The job should scan its own output and publish machine-readable validation evidence.

Use canary source records containing obvious synthetic identifiers in the restricted snapshot. If they emerge unchanged in output, the transformation path is broken. Canary detection does not replace broad scanning, but it verifies that expected rules actually ran.

Finally, test incident response. The inventory should reveal who has each generation, and automated destruction should work without depending on voluntary cleanup. A dataset that cannot be located and deleted is not governed, regardless of how clever its HMAC function is.

## Rehearse revocation before distributing a snapshot

A masked export can still be recalled because a transform was wrong, a detector missed a field, or the approved testing purpose ended. Record where each snapshot is published, which CI projects mount it, and who can create local copies. Without that inventory, retention exists only on paper.

Run a tabletop revocation: mark a dataset version blocked, deny new access, remove central artifacts, invalidate database credentials, and confirm consumers fail closed with a useful replacement path. Developer laptops and downloaded backups need an explicit handling policy because a server-side delete cannot reach them automatically.

Version identifiers should appear in database metadata and test reports, but never encode source customer information. When validation later discovers a leak, the version lets incident responders locate affected copies and prevents teams from restoring the same artifact from cache.

Revocation testing changes the engineering conversation from "the masking job passed" to "we can contain a masking failure." That is essential for production-derived material, whose residual risk cannot be reduced to zero by transformation alone.

## Frequently Asked Questions

### Is hashing an email address enough to make it safe for testing?

Usually not. Email values are guessable, and an unsalted stable hash supports dictionary attacks and cross-dataset linkage. Prefer a keyed, scoped transformation or a fully synthetic replacement, then remove the key and mapping from test access.

### How can dates stay useful without preserving real activity days?

Apply one deterministic offset to all related dates for a subject so intervals and ordering remain intact. Review residual risks from seasonality and rare timelines, and use buckets or synthesis when exact relationships are unnecessary.

### Should free-text notes be cleaned with regular expressions?

Regex can be one detection layer, but it cannot reliably remove names, secrets, medical facts, or contextual identifiers. Dropping the text and generating content with similar length, language, and markup properties is usually safer.

### Can masked production data be treated as anonymous?

Not automatically. Deterministic tokens, retained quasi-identifiers, reversible mappings, and auxiliary information may permit re-identification. Treat it as sensitive until a qualified risk assessment establishes otherwise.

### How do we preserve foreign keys after masking identifiers?

Create one canonical mapping per identifier domain and apply it across every related table and nested reference. Validate database and logical relationships afterward, and keep the source-to-target map outside the test environment.
`,
};
