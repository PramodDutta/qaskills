import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Typesense collection schema drift testing',
  description:
    'Use Typesense collection schema drift testing to catch field-type, facet-flag, and default-sort differences before indexed documents fail in CI.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'Typesense collection schema drift testing',
  keywords: [
    'Typesense collection schema drift testing',
    'Typesense schema contract test',
    'facet flag drift detection',
    'search document type mismatch',
    'Typesense default sort schema',
    'collection migration regression test',
  ],
  relatedSlugs: [
    'testing-typesense-multiselect-facet-filter-queries',
    'mcp-search-filter-schema-drift-contract-tests',
    'mcp-search-response-normalization-contract-tests',
    'database-testing-automation-guide',
  ],
  repoEvidence: [
    'packages/web/src/lib/typesense/client.ts',
    'packages/web/src/lib/typesense/search.ts',
    'packages/shared/src/types/skill.ts',
  ],
  sources: [
    'https://typesense.org/docs/latest/api/collections.html',
    'https://typesense.org/docs/latest/api/documents.html',
  ],
  content: `Typesense collection schema drift testing catches differences in field names, scalar and array types, facet flags, and the default sorting field before search traffic finds them. It compares the repository schema with the deployed collection, indexes a representative document, and runs the same query, filter, facet, sort, and result mapping used by production.

The declared contract is in \`packages/web/src/lib/typesense/client.ts\`, while runtime assumptions live in \`packages/web/src/lib/typesense/search.ts\`. The public result type in \`packages/shared/src/types/skill.ts\` adds a third boundary that tests must compare rather than treating the collection alone as complete.

## What Must Typesense Collection Schema Drift Testing Catch?

Typesense collection schema drift testing must catch changed names, missing fields, extra required fields, wrong scalar or array shapes, facet differences, numeric widths, Boolean types, and default sort changes. A plain field-name snapshot misses several failures that appear only when documents or searches run.

The repository schema declares strings for name, slug, description, and author. Five taxonomy fields are \`string[]\`, two scores are \`int32\`, two flags are \`bool\`, and \`createdAt\` is \`int64\`. The collection defaults its sorting field to \`installCount\`.

Runtime search adds more facts. Text queries use name, description, and author. Filters can target each taxonomy array plus verified, facets request the five taxonomy arrays, and sorting can use installCount, createdAt, or qualityScore.

Result mapping creates a \`SkillSummary\` from each hit. It reads identity text, quality and install numbers, two taxonomy arrays, both flags, and a created time fallback. A schema comparison that ignores this mapper can miss a field that indexing accepts but application code cannot read safely.

Drift can exist in either direction. A deployed field may differ from source after an incomplete migration, or source can change before a new collection is built. Normalize and compare both sides without declaring one automatically correct.

The first failure report should name the field and property, such as \`frameworks.type: expected string[], received string\`. A single large JSON diff slows repair. Keep structural drift separate from document rejection and query failure so each result has one clear cause.

Use the [Typesense facet testing article](/blog/testing-typesense-multiselect-facet-filter-queries) for filter combinations after the schema gate passes. This guide owns the structural boundary that makes those filters possible.

## How Do You Build a Typesense Schema Contract Test?

A Typesense schema contract test should normalize the local object and deployed response into the same small shape. Sort fields by name, keep only contract properties, and compare the collection name, default sorting field, field type, facet value, and optional status.

The local schema omits \`facet\` on fields where the effective value is false. A deployed API may return false explicitly. Normalize both forms to a Boolean so an absent property does not create a false difference.

Do the same for optional flags if they enter the contract. Avoid snapshotting server metadata, creation times, document counts, or node-specific values. Those facts change without altering document compatibility.

\`\`\`typescript
import { expect, test } from 'vitest';
import { skillsSchema, SKILLS_COLLECTION } from '@/lib/typesense/client';

type FieldContract = {
  name: string;
  type: string;
  facet: boolean;
  optional: boolean;
};

function normalizeSchema(schema: {
  name: string;
  fields: Array<{ name: string; type: string; facet?: boolean; optional?: boolean }>;
  default_sorting_field?: string;
}) {
  return {
    name: schema.name,
    defaultSortingField: schema.default_sorting_field ?? '',
    fields: schema.fields
      .map((field): FieldContract => ({
        name: field.name,
        type: field.type,
        facet: field.facet ?? false,
        optional: field.optional ?? false,
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  };
}

test('matches the deployed skills collection contract', async () => {
  const deployed = await typesense.collections(SKILLS_COLLECTION).retrieve();
  expect(normalizeSchema(deployed)).toEqual(normalizeSchema(skillsSchema));
});
\`\`\`

This example fetches the schema through a test client with read access. Do not place an administrative key in test output or source. A local Typesense container can provide the same endpoint for pull requests, while a protected environment job checks the deployed collection.

The [Typesense collections documentation](https://typesense.org/docs/latest/api/collections.html) defines collection schema fields and update rules. Keep the repository object as the expected contract only when the release process says source leads deployment. Otherwise, compare and report without changing either side automatically.

Typesense collection schema drift testing should save normalized values as assertion data, not a hand-copied list. Importing \`skillsSchema\` ensures a source edit reaches the test. A separate approved migration fixture can describe the intended next collection during a planned change.

The [database testing guide](/blog/database-testing-automation-guide) discusses environment gates. This search contract needs the same discipline: known service version, isolated collection name, fixed schema setup, and cleanup that cannot delete a shared production collection.

## What Does Facet Flag Drift Detection Verify?

Facet flag drift detection verifies that every field used by \`filter_by\` or \`facet_by\` has the expected type and facet setting. It also checks that query builders use exact field names. A typo can leave indexing green while filtered requests fail or return incomplete counts.

The current search function requests facets for testingTypes, frameworks, languages, domains, and agents. Each appears as \`string[]\` with \`facet: true\` in \`skillsSchema\`. The same five fields can enter filter expressions when their parameter arrays are nonempty.

The verified flag also enters \`filter_by\` as \`verified:=true\`, and its schema field is Boolean with facet enabled. It is not included in the returned \`facet_by\` list. Tests should distinguish filter support from displayed facet counts.

Author is declared as a faceted string but appears only in \`query_by\` in the current function. Featured is also a faceted Boolean but is mapped from results without a filter branch here. Their facet flags remain part of the declared schema contract even when this query does not request their counts.

Build one positive request with every supported taxonomy filter, plus verified-only. Capture the final search parameters and compare each field against the normalized map. This static-to-runtime check fails before a service call when code names a missing or non-faceted field.

Then run a real search with representative data. The service response should include one facet count entry for each requested taxonomy field. Assert field names and a few fixed values, not the service's arbitrary order unless the API contract defines it.

The [MCP filter schema drift article](/blog/mcp-search-filter-schema-drift-contract-tests) covers a different boundary exposed to MCP clients. Typesense collection schema drift testing protects the internal collection that feeds web results, so keep both contracts without merging their fixtures.

## Search Document Type Mismatch Cases

A search document type mismatch can involve scalar versus array values, strings in numeric or Boolean fields, integer width, timestamp form, or missing required data. Schema equality alone cannot prove that the indexing transformer emits compatible documents.

Create one full representative document with every declared field and a stable ID. Use arrays for all taxonomy fields, numbers for qualityScore and installCount, Booleans for featured and verified, and an integer value for createdAt. Index it into the test collection and require success.

Then mutate one field at a time. Replace frameworks with a string, installCount with \`"12"\`, verified with \`"true"\`, or a required name with omission. Assert that the indexing operation rejects the invalid document and identify the changed field in the test name.

Numeric width deserves a focused case. The scores use \`int32\`, while createdAt uses \`int64\`. Use values inside each intended range for the valid document, then test a value that is unsuitable for the narrower field without relying on JavaScript precision beyond its safe integer limit.

The created time boundary needs special attention because \`skillsSchema\` declares \`int64\`, while the result mapper casts \`doc.createdAt\` to a string or falls back to \`created_at\`. The test should record the actual indexed unit and the expected \`SkillSummary.createdAt\` form. It should not hide that cross-layer mismatch with a broad cast.

Optional behavior must be explicit. None of the declared fields sets \`optional: true\`, so the normalized schema should treat them as required unless service defaults say otherwise. The [Typesense documents documentation](https://typesense.org/docs/latest/api/documents.html) is the approved source for indexing and field validation behavior.

Use the [MCP response normalization article](/blog/mcp-search-response-normalization-contract-tests) for external response shaping. This search document type mismatch suite stops earlier, at the document and web mapper boundary.

## How Do You Check the Typesense Default Sort Schema?

The Typesense default sort schema must name an existing numeric field that supports the collection's default ranking. In this repository, \`default_sorting_field\` is exactly \`installCount\`, and that field is declared as \`int32\`. Both facts need one assertion.

First compare the local and deployed default field strings. Then find that field in each normalized field map and require the expected numeric type. A matching name with a string field would still break numeric default sorting assumptions.

The production search function usually sends an explicit \`sort_by\`. Trending and most-installed use installCount descending, newest uses createdAt descending, and highest-quality uses qualityScore descending. Validate every target field against the schema, not only the collection default.

Build a small map from the source's sort options to field names and directions. A contract helper can parse the string before the colon, find the field, and require an integer type. Keep direction checks exact because an accidental ascending sort changes user-visible order without a schema error.

Index at least three documents with distinct install counts, created times, and quality scores. Run each production sort and assert the ordered slugs. This functional check catches a query change that normalized schema equality cannot detect.

Do not assume default order when the query sends \`sort_by\`. Test the collection default with a request that omits explicit sorting, then test each application option with its exact value. These are related but distinct facts.

The [skills directory](/skills) is the user-facing result surface. A manual order check there may spot obvious drift, but fixed documents in an isolated collection give a stable regression that does not depend on live install activity.

Typesense collection schema drift testing should report the default field, its deployed type, and all explicit application fields when this check fails. That short report makes a missing field different from a wrong direction or document value.

## Collection Migration Regression Test Strategy

A collection migration regression test should classify each planned change as additive, breaking, or reindex-required. The class determines whether an in-place schema update is safe, whether documents need new values, and whether an alias must switch to a rebuilt collection.

An additive optional field may permit old documents to remain valid. A new required field needs values for every document before traffic moves. A type change, scalar-to-array change, or altered default sorting field should be treated as a new collection contract and tested with full data.

Build the next collection under a versioned test name. Apply the proposed schema, import representative documents, run production queries, and compare normalized results. Do not mutate the current shared collection as part of a pull request test.

Use an alias switch only after both structural and functional gates pass. Test the alias target before and after the switch, and keep a rollback target until the new collection has served a smoke query. The specific deployment steps should follow the service policy owned by the project.

The regression suite needs old-document fixtures as well as new ones. An additive change can still fail when an indexer omits a value or emits the wrong type. A new collection built only from one ideal document gives weak migration proof.

Record which differences require reindexing in review output. Field type, facet behavior, and default sorting changes affect more than TypeScript compilation. The [collection API guide](https://typesense.org/docs/latest/api/collections.html) should remain the authority for supported schema changes.

The [database testing guide](/blog/database-testing-automation-guide) offers parallel ideas for migration controls. A collection migration regression test adds search-specific checks for indexing, facets, ranking, result mapping, alias target, and rollback.

## Declared Fields, Runtime Use, and Drift Impact

The table connects source declarations with current search behavior. It helps reviewers see why a field that looks unused in one file can still be required by filtering, result mapping, or default sorting.

| Field | Declared type | Facet | Query use | Result use | Drift consequence |
|---|---|---|---|---|---|
| name and description | string | No | query_by | Card text | Text search or mapping fails |
| author | string | Yes | query_by | Card author | Search or display loses author |
| taxonomy arrays | string[] | Yes | filter_by and facet_by | Two arrays plus facet counts | Filters reject or counts disappear |
| featured and verified | bool | Yes | verified can filter | Both mapped | Filter or badge type breaks |
| qualityScore and installCount | int32 | No | sort_by | Both mapped | Ranking or numeric display fails |
| createdAt | int64 | No | sort_by | Converted by mapper | Newest order or date form breaks |
| default sorting field | installCount | Not applicable | Collection default | Indirect ranking | Default order changes |

\`packages/web/src/lib/typesense/client.ts\` supplies the declared type and facet columns. \`packages/web/src/lib/typesense/search.ts\` supplies query and result use. \`packages/shared/src/types/skill.ts\` defines the final \`SkillSummary\` properties returned to other packages.

The "taxonomy arrays" row groups five fields for reading, but the actual test should compare them separately. One field can drift while the others remain valid. Report its exact name, expected type, facet setting, and runtime use.

Languages, domains, and agents contribute filter and facet results but are not direct fields on \`SkillSummary\`. Their counts still enter the \`facets\` object. Do not remove them from the schema merely because the hit mapper omits them from each card.

The [categories route](/categories) presents taxonomy entry points that depend on these values. Use it for a smoke check after the isolated service suite passes, while the field map remains the precise regression oracle.

Typesense collection schema drift testing should update this map and its executable field list together. A prose table alone can become stale, so the code test must derive expected declarations from the imported schema object.

## How Do You Run the Drift Audit in CI?

Run the drift audit in CI against an isolated collection built from the repository schema, then use a protected job to compare the deployed collection. Keep structure, document indexing, production query, and result mapping as separate phases with targeted output.

1. Normalize the repository \`skillsSchema\` into a sorted field contract.
2. Retrieve or fixture the active Typesense collection schema.
3. Compare names, types, facet flags, optional flags, and default sorting.
4. Index one complete document and several one-field mismatch cases.
5. Run production query, filter, facet, and sorting combinations.
6. Map returned hits to \`SkillSummary\` and assert required runtime types.
7. Report structural differences apart from indexing and query failures.

\`\`\`typescript
const runtimeFields = {
  queryBy: ['name', 'description', 'author'],
  facetBy: ['testingTypes', 'frameworks', 'languages', 'domains', 'agents'],
  filterBy: ['testingTypes', 'frameworks', 'languages', 'domains', 'agents', 'verified'],
  sortBy: ['installCount', 'createdAt', 'qualityScore'],
  mapped: [
    'id',
    'name',
    'slug',
    'description',
    'author',
    'qualityScore',
    'installCount',
    'testingTypes',
    'frameworks',
    'featured',
    'verified',
    'createdAt',
  ],
};

const fieldMap = new Map(skillsSchema.fields.map((field) => [field.name, field]));
for (const field of new Set([
  ...runtimeFields.queryBy,
  ...runtimeFields.facetBy,
  ...runtimeFields.filterBy,
  ...runtimeFields.sortBy,
])) {
  expect(fieldMap.has(field), 'missing schema field: ' + field).toBe(true);
}
for (const field of runtimeFields.facetBy) {
  expect(fieldMap.get(field)?.facet, 'field is not faceted: ' + field).toBe(true);
}
\`\`\`

The document \`id\` is supplied by indexed records even though it is not listed in the custom schema fields. Keep service-managed identity handling separate from custom field drift. The mapper still requires an ID on every returned summary.

Mask API keys and node credentials in CI output. Print normalized field differences, collection name, and test document IDs only. The audit needs read and document permissions on its own collection, not access to unrelated indexes.

Use a unique collection suffix per job and delete only that name during cleanup. For the deployed comparison, use read-only access and never patch drift automatically. A failed gate should lead to a reviewed migration, not an unplanned service change.

Open the [search testing skills](/skills) catalog after CI passes to choose tools for wider ranking checks. The [facet filter article](/blog/testing-typesense-multiselect-facet-filter-queries) can then reuse the verified schema without repeating structural setup.

### Read each drift signal in order

Start with the name of the local collection and the name that the client fetched; a wrong name can make every field look stale at once. Fix that test input before you compare a long list of fields.

If one field is missing from the live map, check whether source added it after the last collection build, then check the index job that writes that field. Do not mark the field as optional merely to make an old collection pass.

If the live map has an extra field, find out whether old code still owns it; an extra optional field may be safe for this query. An extra required field can still block new documents that the source does not fill.

For a scalar and array clash, print one safe sample value and its runtime type, but do not print the whole skill document or any key. The short sample should show whether the writer or the schema has the wrong shape.

For a number and string clash, inspect the value before the index call; a cast in the result mapper cannot fix a rejected document. Keep the write fault apart from a read fault so each owner gets a clear task.

When a facet flag differs, list each query that uses that field in \`filter_by\` or \`facet_by\`, since a text query may still pass with the bad flag. Run one fixed filter and one fixed facet to show the real search effect.

When the default sort name differs, check both the field name and its numeric type, then run a search with no \`sort_by\` value. This proves the collection default without mixing it with the app's explicit sort map.

If an explicit sort fails, print the chosen app option and final field-direction pair, then compare that field with the live schema map. A wrong option map is an app bug even when the collection default remains sound.

If the full document cannot be indexed, remove no fields at random; read the first field named by the service, fix that fixture fact, and try again. The valid control must contain each required field before mismatch cases can teach much.

If a bad document is accepted, read it back and check the stored form, since the service may coerce some input under its active settings. Record that seen form before deciding whether the test or the source contract needs to change.

If search finds the document but mapping fails, list only the field and the type read by the mapper, then check \`packages/shared/src/types/skill.ts\` next. The service can be right while the TypeScript cast makes a false claim about the hit.

The created time case needs both the stored integer and the final date text, so state the unit used by the index job in the fixture. A test that guesses seconds or milliseconds can pass sorting yet show the wrong date later.

If facet counts are absent, first check that \`facet_by\` reached the client call, then check each live facet flag. Last, check the fixed documents, since an empty field set can yield no useful count without any schema drift.

If a filter returns too many hits, print the final filter string and the slugs from the small test set. Do not test with live catalog data. Three fixed records can show wrong AND rules, bad field names, or weak seed values.

If a filter returns no hits, run the same query with no filter and require the seed document. That control proves text search and indexing first. Then add one filter at a time until the failed field becomes clear.

If a sort order ties, change the seed values rather than relying on an unstated tie rule. Use wide gaps in counts and times. A clear first, second, and third item gives a far better signal than three equal scores.

Keep source drift, live drift, and test drift as three possible causes. Source drift means code changed without a build. Live drift means the service changed without source, while test drift means the expected map copied an old fact.

The CI report should show one line per changed field with expected and seen values. Put index and query faults in later blocks. This order lets a maintainer stop at the first sound cause instead of reading one large raw response.

Do not let the test patch the live collection after it finds a mismatch. A read gate should fail and leave the state intact. The team can then review whether to rebuild, reindex, update code, or change the planned contract.

Use a new job collection for all write checks and keep the live job read only. Name that job collection with a run suffix. Delete only that exact name when cleanup runs, even if an earlier assertion failed.

Rerun the normalized compare after the write and search checks pass. This last read catches any setup tool that changed the schema during the test. It also leaves a clean final fact in the CI report.

Typesense collection schema drift testing should make the first bad field easy to act on. A short field map, one valid document, one bad document, and one real query form the core proof. Add more cases only when each one owns a new failure.

Keep the same runtime field list in test code and review notes. If production adds a filter or sort, the list must change in that pull request. This simple check stops a new query field from reaching the service with no schema gate.

Use [search QA skills](/skills) to choose a client or runner, but keep the expected field map in this repository. A tool may send the requests. The product source must still own names, types, flags, and result forms.

## Frequently Asked Questions

### Can a Typesense schema be compared as raw JSON?

Raw JSON often contains ordering or server metadata that does not define compatibility. Normalize fields by name and retain only contract properties such as type, facet, optional status, and default sorting. This yields focused failures while still detecting every structural fact used by indexing and search.

### Why test facet flags when field types already match?

A field can keep its string or array type while losing facet support. Text indexing may still work, yet \`facet_by\` or filter use can fail or lose counts. Compare facet flags and run one real faceted query so both declaration and service behavior are covered.

### Is int32 versus int64 drift significant?

Yes, the width is part of the accepted numeric contract. QASkills uses int32 for quality and install counts, then int64 for created time. Test valid representative values and a narrow-field boundary without exceeding JavaScript's safe integer range in the client fixture.

### Should every schema change trigger a full reindex?

Not every additive optional change requires the same process, but type, required-field, facet, and default-sort changes need careful migration review. Build a versioned test collection, import old and new document shapes, run production searches, and follow the current Typesense update rules.

### Why compare the result mapper with the collection schema?

The service can accept a document that application code later casts to an unsuitable runtime form. Comparing mapper reads with declared fields exposes missing names and type assumptions, including the created time boundary. A search contract ends only when a typed result reaches its caller.

### How should CI access the deployed collection safely?

Use a protected read-only key for schema retrieval and keep it out of logs. Run write and mismatch cases against an isolated temporary collection with a unique job suffix. A deployed difference should fail with a report, never trigger an automatic schema edit.

## Conclusion

Typesense collection schema drift testing joins four proofs: normalized schema equality, representative document indexing, production query behavior, and safe result mapping. Together they catch field, facet, sort, and type changes before a reindex or release sends incompatible data to search.

Browse [search QA skills](/skills) and run this schema drift audit before the next collection migration. Then apply the verified field map to the [Typesense facet testing guide](/blog/testing-typesense-multiselect-facet-filter-queries).`,
};
