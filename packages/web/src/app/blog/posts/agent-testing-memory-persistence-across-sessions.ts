import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Agent Testing Memory Persistence Across Sessions: A QA Playbook',
  description: 'Master agent testing memory persistence across sessions with restart-safe fixtures, isolation checks, concurrency tests, and diagnostic workflows.',
  date: '2026-08-08',
  category: 'AI Testing',
  content: `
# Agent Testing Memory Persistence Across Sessions: A QA Playbook

Agent testing memory persistence across sessions means proving that an agent recalls the right durable facts after a process, worker, or conversation restarts, while forgetting data it must not retain. The reliable approach is to test the persistence contract below the model first, then test a small set of semantic behaviors through the model. A restart test that never actually destroys the in-memory objects is not a persistence test.

Treat memory as a stateful subsystem with identity boundaries, versioned records, retention rules, and observable writes. Use deterministic IDs and a controllable clock, terminate the first runtime, create a fresh runtime against the same backing store, and assert both positive recall and negative isolation. The wider [agentic AI testing guide](/blog/agentic-ai-testing-guide-2026) helps place these checks within tool, planning, and safety evaluation. If memories arrive through tools, the [MCP servers test automation guide](/blog/mcp-servers-test-automation-2026) covers that separate protocol boundary.

## Turn “memory” into a testable persistence contract

Teams often use one word for several different mechanisms. A transcript retained inside a browser tab, a server-side conversation identifier, a vector store of user preferences, and a workflow checkpoint can all make an agent appear to remember. They fail in different ways. Before writing a prompt assertion, identify the record, its scope, when it is committed, how it is retrieved, and when it expires.

| Memory class | Intended lifetime | Example content | Primary test oracle |
|---|---|---|---|
| Turn context | One model call | Current user message and tool output | Exact input envelope |
| Thread history | Multiple turns in one thread | Prior questions and answers | Ordered history items |
| Workflow checkpoint | Until task completion or retention expiry | Completed steps, pending approval | State-machine fields |
| User preference | Across threads for one user | Preferred test framework | Structured durable record |
| Organization knowledge | Shared under a tenant policy | Approved base URL or coding rule | Authorized retrieval result |
| Ephemeral scratch state | Current process only | Temporary plan candidates | Must disappear after restart |

A useful contract is more precise than “the agent remembers.” For example: “After a successful turn, a preference record is committed under tenant ID and user ID. A new process can retrieve it for a later thread. Other users and tenants cannot retrieve it. The record expires 30 days after its last confirmed update.” If 30 days is your chosen product policy, it is a requirement, not an industry default.

Create an oracle at each layer. The storage oracle verifies the exact record. The retrieval oracle verifies which records enter the next run. The behavioral oracle verifies the agent uses the relevant fact without exposing hidden data. This layered design distinguishes storage failure from search failure and search failure from model nondeterminism.

| Layer | Evidence to capture | Deterministic assertion | Semantic assertion |
|---|---|---|---|
| Write path | key, version, timestamp, payload hash | One committed record exists | Stored fact reflects user intent |
| Read path | namespace, query, selected IDs | Only allowed IDs were returned | Relevant memory outranks noise |
| Prompt assembly | ordered input item types | Required item is present once | Context is understandable |
| Model response | response and cited memory IDs | No forbidden marker appears | Answer applies the preference correctly |
| Cleanup | deletion or expiry event | Record is no longer retrievable | Agent states it does not know |

## Build a restartable reference store before involving an LLM

The fastest way to expose a false persistence test is to build a tiny store with explicit disk state. The following TypeScript module uses a JSON file so the mechanics are visible. It is a test fixture, not a production database. Each operation reads the file again, which prevents a test from accidentally passing through a module-level cache.

\`\`\`ts
// memory-store.ts
import { readFile, rename, writeFile } from 'node:fs/promises';

export type MemoryRecord = {
  tenantId: string;
  userId: string;
  key: string;
  value: string;
  updatedAt: string;
  version: number;
};

type Database = { records: MemoryRecord[] };

async function readDatabase(file: string): Promise<Database> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as Database;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { records: [] };
    throw error;
  }
}

export class FileMemoryStore {
  constructor(private readonly file: string) {}

  async put(record: Omit<MemoryRecord, 'version'>): Promise<MemoryRecord> {
    const database = await readDatabase(this.file);
    const index = database.records.findIndex((candidate) =>
      candidate.tenantId === record.tenantId &&
      candidate.userId === record.userId &&
      candidate.key === record.key,
    );
    const saved = { ...record, version: index < 0 ? 1 : database.records[index].version + 1 };
    if (index < 0) database.records.push(saved);
    else database.records[index] = saved;
    const temporary = this.file + '.next';
    await writeFile(temporary, JSON.stringify(database, null, 2), 'utf8');
    await rename(temporary, this.file);
    return saved;
  }

  async get(tenantId: string, userId: string, key: string): Promise<MemoryRecord | undefined> {
    const database = await readDatabase(this.file);
    return database.records.find((record) =>
      record.tenantId === tenantId && record.userId === userId && record.key === key,
    );
  }
}
\`\`\`

The temporary-file rename keeps a single-process write from leaving half-written JSON if serialization completes but the final replacement does not. It does not solve concurrent writers. That limitation becomes a deliberate later test, rather than an invisible property of the fixture.

Add a thin service that decides which statements become durable. Keeping this policy outside the model makes the fundamental tests repeatable. The example accepts an explicit command and stores only the value after the fixed prefix.

\`\`\`ts
// memory-service.ts
import { FileMemoryStore } from './memory-store.js';

export type Actor = { tenantId: string; userId: string };

export class MemoryService {
  constructor(
    private readonly store: FileMemoryStore,
    private readonly now: () => Date,
  ) {}

  async handle(actor: Actor, message: string): Promise<string> {
    const prefix = 'Remember my test framework is ';
    if (message.startsWith(prefix)) {
      const value = message.slice(prefix.length).trim();
      if (!value) return 'No framework was provided.';
      await this.store.put({
        ...actor,
        key: 'test-framework',
        value,
        updatedAt: this.now().toISOString(),
      });
      return 'Preference saved.';
    }

    if (message === 'Which test framework do I prefer?') {
      const record = await this.store.get(actor.tenantId, actor.userId, 'test-framework');
      return record ? record.value : 'I do not know.';
    }

    return 'Unsupported test fixture command.';
  }
}
\`\`\`

This service is intentionally boring. Its value is that it establishes the expected lifecycle without prompt variability. Once this layer passes, the same actor, key, and storage adapter can be placed behind a real agent tool or session implementation.

## Prove the second session is a genuinely fresh runtime

Reconstructing a class in the same process is a useful unit test, but it does not catch unflushed buffers, shutdown hooks, process-local credentials, or singleton caches. Use a child process for the write, let it exit, then use a second child process for the read. The only shared artifact should be the declared backing file.

\`\`\`ts
// session-worker.ts
import { FileMemoryStore } from './memory-store.js';
import { MemoryService } from './memory-service.js';

const [file, operation, tenantId, userId, ...words] = process.argv.slice(2);
if (!file || !operation || !tenantId || !userId) {
  throw new Error('usage: session-worker <file> <write|read> <tenant> <user> [value]');
}

const service = new MemoryService(
  new FileMemoryStore(file),
  () => new Date('2026-08-08T10:00:00.000Z'),
);

const actor = { tenantId, userId };
const output = operation === 'write'
  ? await service.handle(actor, 'Remember my test framework is ' + words.join(' '))
  : await service.handle(actor, 'Which test framework do I prefer?');

process.stdout.write(output);
\`\`\`

The test below compiles through the project’s normal TypeScript build and runs the emitted worker. It creates an isolated temporary directory, so parallel test jobs do not share memory. The output is exact because no model is involved yet.

\`\`\`ts
// memory-persistence.test.ts
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const run = promisify(execFile);

test('recalls a preference after the writer process exits', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'agent-memory-'));
  const database = join(directory, 'memory.json');
  const worker = join(process.cwd(), 'dist', 'session-worker.js');

  const write = await run(process.execPath, [worker, database, 'write', 'tenant-a', 'user-7', 'Playwright']);
  assert.equal(write.stdout, 'Preference saved.');

  const read = await run(process.execPath, [worker, database, 'read', 'tenant-a', 'user-7']);
  assert.equal(read.stdout, 'Playwright');
});
\`\`\`

Run the build and Node test runner using scripts your repository actually defines. A minimal package configuration can make the commands explicit:

\`\`\`json
{
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "npm run build && node --test dist/memory-persistence.test.js"
  },
  "devDependencies": {
    "@types/node": "latest",
    "typescript": "latest"
  }
}
\`\`\`

Pair it with a TypeScript configuration that emits ESM imports exactly as the examples use them:

\`\`\`json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": ".",
    "outDir": "dist",
    "strict": true,
    "types": ["node"]
  },
  "include": ["*.ts"]
}
\`\`\`

For a controlled tutorial, using dependency tags avoids asserting a version that may be outdated. In a real repository, lock versions through the package lock and review upgrades normally. Execute \`npm install\` once, then \`npm test\`. The test must still pass when the reader process starts with no reference to the writer’s service instance.

## Exercise identity boundaries with positive and negative pairs

Persistence is only correct when its scope is correct. The common leak is not “nothing was stored.” It is “the fact was stored under a key that is too broad.” A key built from \`userId\` alone can collide when the same external identity appears in two tenants. A key built from \`threadId\` alone can collide if thread identifiers are generated independently by different regions.

| Write identity | Read identity | Expected result | Defect exposed by failure |
|---|---|---|---|
| tenant-a, user-7 | tenant-a, user-7 | Recall | Persistence or retrieval failure |
| tenant-a, user-7 | tenant-a, user-8 | No recall | Cross-user leakage |
| tenant-a, user-7 | tenant-b, user-7 | No recall | Cross-tenant leakage |
| tenant-a, user-7, thread-1 | same user, thread-2 | Depends on memory class | Thread scope confused with user scope |
| anonymous session A | anonymous session B | No recall | Anonymous cookie or cache collision |
| deleted user-7 | recreated user-7 | No recall unless migration says otherwise | Identifier reuse leakage |

Add the negative assertions to the same restart boundary. A passing positive check can coexist with a severe isolation defect.

\`\`\`ts
// Add inside memory-persistence.test.ts
test('does not cross user or tenant boundaries after restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'agent-isolation-'));
  const database = join(directory, 'memory.json');
  const worker = join(process.cwd(), 'dist', 'session-worker.js');

  await run(process.execPath, [worker, database, 'write', 'tenant-a', 'user-7', 'Vitest']);

  const otherUser = await run(process.execPath, [worker, database, 'read', 'tenant-a', 'user-8']);
  const otherTenant = await run(process.execPath, [worker, database, 'read', 'tenant-b', 'user-7']);

  assert.equal(otherUser.stdout, 'I do not know.');
  assert.equal(otherTenant.stdout, 'I do not know.');
});
\`\`\`

Also verify authorization before retrieval, not only before display. Filtering a forbidden memory out of the final prompt is weaker than preventing it from being fetched. Logs, traces, ranking services, and evaluation artifacts can expose retrieved content even if the final response is clean.

## Separate durable facts from transcript continuity

What people get wrong most often is treating a repeated answer as proof of durable memory. The model may infer the same answer from the new prompt, a system instruction, seeded fixtures, a tool, or general knowledge. Use an opaque, test-generated marker that cannot be guessed, such as \`framework-token-7f3c\`, and verify the retrieval record that supplied it. Do not use secrets or personal data as markers.

Run distinct tests for transcript memory and extracted memory. Transcript memory should preserve ordering, roles, tool results, and approval events within the same thread. Extracted memory should retain only approved facts, often across threads, and should survive transcript compaction. An agent can pass one and fail the other.

| Scenario | Setup | Expected retrieval | Behavioral prompt |
|---|---|---|---|
| Same-thread continuation | Store prior turn | Recent ordered items | “What marker did I give?” |
| New thread, same user | Store durable preference | Preference only, not full transcript | “Apply my usual framework.” |
| New user | Store under original user | Nothing | “What is my preference?” |
| Corrected preference | Write old then new value | Latest confirmed value | “Which framework now?” |
| Revoked memory | Delete approved record | Nothing | “Recall the removed marker.” |
| Compacted thread | Compact older turns | Summary plus required durable fact | “Continue the agreed task.” |

For model-facing evaluation, use a rubric with hard leakage checks before semantic scoring. Fail immediately if the response contains a marker owned by another identity. Then score whether the response applies the permitted fact. Temperature and model variability can affect wording, but they must never relax tenant isolation.

\`\`\`ts
import assert from 'node:assert/strict';

type RecallEvaluation = {
  response: string;
  expectedMarker?: string;
  forbiddenMarkers: string[];
};

export function evaluateRecall(input: RecallEvaluation): void {
  for (const marker of input.forbiddenMarkers) {
    assert.equal(
      input.response.includes(marker),
      false,
      'response leaked a marker from a forbidden memory scope',
    );
  }

  if (input.expectedMarker) {
    assert.equal(
      input.response.includes(input.expectedMarker),
      true,
      'response did not use the expected persisted marker',
    );
  }
}
\`\`\`

This exact-match evaluator fits opaque markers, not natural-language preferences. For “prefers concise answers,” inspect the retrieved structured value deterministically and use a bounded response rubric separately. Keeping those assertions distinct prevents a style judge from concealing a missing record.

## Test corrections, ordering, and concurrent writes

Memory is rarely append-only in product semantics. Users correct names, change preferences, revoke consent, and create simultaneous turns from multiple devices. A “last write wins” policy needs a defined ordering source. Wall-clock timestamps from different machines are unsafe if clock skew can reverse them. Database versions, compare-and-set operations, or event sequence numbers provide clearer conflict behavior.

The JSON fixture deliberately has a read-modify-write race. Two writers can read version 1, both produce version 2, and one rename can replace the other. A concurrency test should expose that limitation. Run the same scenario against the production adapter and assert the actual policy: reject a stale version, serialize updates, or preserve both events for resolution.

| Race | Required decision | Assertion |
|---|---|---|
| Two preference updates | Which update wins? | Winner follows committed sequence, not response timing |
| Delete versus late write | Can deletion be resurrected? | Tombstone or version rule is honored |
| Retry after timeout | Is write idempotent? | One logical event, no duplicate history |
| Read during compaction | Is old or new view acceptable? | Reader observes a documented consistent state |
| Region failover | What is the consistency target? | Test waits or fails according to stated objective |

Use a barrier so concurrent operations actually overlap. Merely creating two promises does not guarantee the storage calls reach the critical section together. In integration environments, inject a test-only coordination hook immediately before commit, or use database locks and transaction telemetry to prove overlap. Do not add arbitrary sleeps and call the test deterministic.

Corrections also require provenance. If a user says “I no longer use Cypress, remember Playwright,” the new record should supersede the old one. Retrieval must not return both as equally current vector matches. Assert the canonical record version and the search result set, then ask the model. Semantic stores often retain old embeddings after the source row changes, creating “ghost memory” even though the primary database looks correct.

## Verify retention, deletion, and compaction with a controllable clock

Waiting days in a test is unnecessary. Inject time into application logic, as the reference service does, or use the datastore’s supported test controls. Check three boundaries: just before expiry, exactly at expiry according to your specification, and just after expiry. Define whether retention is measured from creation, last access, or last confirmed update.

A deletion test must go beyond a successful API response. Verify the primary store, retrieval index, cache, replica behavior allowed by the contract, and future model inputs. If backups have a separate retention policy, test the operational restoration process so deleted records do not silently return to active retrieval after a disaster recovery exercise.

Compaction deserves its own invariants:

1. Critical user constraints survive in a structured record or faithful summary.
2. Tool outputs needed for an unfinished task remain available.
3. Superseded facts do not reappear.
4. Untrusted text is not promoted into a system-level instruction.
5. Source and version metadata remain traceable.

The OpenAI Agents SDK documentation distinguishes in-process \`MemorySession\` from persistent session implementations and explains that session history is fetched before a run and new items are persisted afterward. See https://openai.github.io/openai-agents-js/guides/sessions/. LangGraph likewise distinguishes thread checkpoints from a store used across threads: https://docs.langchain.com/oss/javascript/langgraph/persistence. Those distinctions are useful test categories even when your agent uses a different framework.

## Diagnose the failure where “restart” loses only some memories

Consider a realistic incident: same-process tests pass, a process-restart test recalls the first preference, but a new container in CI answers “I do not know.” Storage inspection shows the record exists. The tempting diagnosis is eventual consistency. The actual fault is often namespace drift.

Capture these values on both writes and reads: environment, tenant ID, user ID, thread ID, memory class, schema version, normalized key, datastore endpoint identifier, and selected record IDs. Compare them without logging sensitive payloads. One common pattern is a writer using \`tenant-a:user-7\` while a new deployment reads \`production:tenant-a:user-7\`. Another is a local relative SQLite path resolving under two different working directories.

Use this triage order:

| Observation | Likely layer | Next check |
|---|---|---|
| No record after acknowledged write | Commit path | Transaction result and shutdown flush |
| Record exists, retrieval returns none | Query or namespace | Exact key, filters, index freshness |
| Retrieval returns record, prompt lacks it | Context assembly | Token budget, deduplication, role mapping |
| Prompt contains record, answer ignores it | Model behavior | Instruction conflict and relevance framing |
| Correct user plus foreign record returned | Authorization | Namespace construction before query |
| Failure only after deployment | Compatibility | Schema migration and serializer versions |

Do not label every delayed read “eventual consistency.” First establish whether the read queried the same logical store and key. If the system genuinely permits a lag, poll a deterministic storage condition with a deadline tied to the documented objective, record time to visibility, and fail with the last observed version. A fixed ten-second sleep makes the suite slower and hides regressions up to ten seconds.

## Add persistence checks to an AI coding-agent workflow

An AI coding agent can generate fixtures and expand identity matrices quickly, but it needs hard boundaries. Give it the memory contract, adapter interface, allowed test commands, and a list of identifiers that must remain opaque. Ask it to change one layer at a time. Review generated tests for fake restarts, shared temporary paths, assertions based only on friendly prose, and cleanup that executes before evidence is collected.

A practical pull-request gate has three tiers. Unit tests exercise key construction, serialization, expiry, and version comparison. Adapter integration tests run against the real database or cache in an isolated namespace. A small end-to-end set uses the actual agent runtime and checks permitted recall plus forbidden leakage. The end-to-end tier should be smaller because model calls are slower and less deterministic, not because isolation matters less.

For observability, emit structured events such as \`memory.write.committed\`, \`memory.read.selected\`, \`memory.delete.completed\`, and \`memory.compaction.finished\`. The names are illustrative, so match your telemetry vocabulary. Include record IDs, versions, scopes, latency, and result counts. Exclude raw memory values unless an approved redaction design explicitly permits them.

Before release, preserve these artifacts from failed tests:

- process IDs and start times proving separate runtimes
- sanitized write and read namespaces
- committed record versions
- retrieval candidate IDs and scores when search is involved
- the ordered, redacted context envelope
- model identifier and decoding settings
- cleanup status for the isolated test namespace

These artifacts let a QA engineer locate the broken boundary without replaying personal conversation data. They also give an AI coding agent enough concrete evidence to propose a focused patch instead of changing prompts blindly.

## Rehearse backup restore and schema evolution

A memory system can pass every ordinary restart test and still fail during the recovery event for which persistence exists. Add a restoration exercise using a test-owned database snapshot. Write records at known schema versions, capture the backup through the same supported mechanism used in operations, restore it into an isolated environment, and start the current application build against that restored state. Assert identity boundaries, latest versions, deletion tombstones, expiry metadata, and retrieval indexes before asking an agent to recall anything.

Schema compatibility is particularly important for long-lived threads. A deployment may rename \`userId\`, change an embedding model, split a free-text record into structured fields, or replace transcript items with compacted summaries. Test a fixture created by the oldest supported schema, not a hand-edited approximation of it. If the application migrates on read, assert the migration is idempotent and does not rewrite a record on every retrieval. If migration is performed offline, verify the old reader and new reader behavior during the rollout window defined by the deployment plan.

Use three fixture generations: old but supported, current, and intentionally unsupported. The supported fixtures should preserve meaning and access control. The unsupported fixture should fail with a clear operational signal or remain excluded from retrieval, rather than being partially deserialized into misleading defaults. Keep opaque markers in each fixture so the test can distinguish a successful migration from a newly generated answer.

Recovery also tests encryption and key access. A restored record that exists but cannot be decrypted is unavailable memory, while a record decrypted under the wrong tenant context is a security failure. Capture only key identifiers and error categories in test evidence, never key material. Finally, rerun deletion checks after restore. A backup restoration must not silently reactivate a memory that product policy considers deleted from active use. The exact backup retention and erasure procedure belongs in the contract, and the test should reflect that declared procedure rather than promising instantaneous removal from every historical medium.

## Frequently Asked Questions

### How do I prove an agent really persisted memory across sessions?

Write an opaque test marker in one process, let that process exit, start a second process with no shared in-memory objects, and retrieve through the declared durable store. Assert the stored record and the second process’s retrieval before checking the model response. Use a unique temporary namespace and verify a different user cannot retrieve the marker. Recreating a conversation object inside one runtime proves object reconstruction at most. It does not prove buffers were flushed, paths are stable, credentials work after restart, or another worker can read the data.

### Should memory tests assert the agent’s exact response text?

Use exact response assertions only for deterministic service fixtures or opaque markers with a tightly constrained answer. Natural model responses can express the same remembered preference in several valid ways. For those, assert the retrieved structured record exactly, verify the prompt assembly contains the permitted memory once, run hard checks for forbidden markers, and use a narrow semantic rubric for the final behavior. This split keeps model wording variability from masking a persistence defect and keeps a friendly but guessed answer from passing as evidence of durable storage.

### What is the minimum isolation matrix for persistent agent memory?

At minimum, cover same tenant and same user as the positive case, then different user in the same tenant and the same user identifier in a different tenant as negative cases. Add thread changes when the product distinguishes thread history from user-level memory. Systems with anonymous sessions, regions, organizations, or delegated agents need corresponding boundaries. Run negative cases after a real restart and inspect retrieval results, not only final text. A safe final answer does not prove a foreign record was never fetched into logs, traces, or ranking infrastructure.

### How can I test memory expiry without waiting for the retention period?

Inject a clock into retention logic or use documented datastore time controls. Create the record at a fixed instant, read just before the boundary, at the exact boundary defined by the requirement, and immediately after it. Verify both the primary record state and every retrieval path, including indexes and caches. Avoid changing the host clock for a shared test runner because unrelated TLS, logging, and timeout behavior may break. If datastore TTL cleanup is asynchronous, distinguish “logically excluded from reads” from “physically removed,” and test each against its documented deadline.
`,
};
