import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Redis cached null ambiguity testing',
  description:
    'Use Redis cached null ambiguity testing to distinguish a missing key, a stored null value, a read failure, and a source fetch in cache helpers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Troubleshooting',
  primaryKeyword: 'Redis cached null ambiguity testing',
  keywords: [
    'Redis cached null ambiguity testing',
    'Redis null cache miss test',
    'negative caching sentinel value',
    'cacheGetOrSet nullable data',
    'cached null versus missing key',
    'TypeScript generic cache ambiguity',
  ],
  relatedSlugs: [
    'redis-cache-testing-guide',
    'testing-leaderboard-cache-filter-isolation-ranking-consistency',
    'testing-lazy-neon-database-initialization-nextjs-build',
    'error-handling-testing-patterns',
  ],
  sources: [
    'https://upstash.com/docs/redis/sdks/ts/commands/overview',
    'https://upstash.com/docs/redis/sdks/ts/commands/generic/exists',
  ],
  repoEvidence: [
    'packages/web/src/lib/cache.ts',
    'packages/web/src/app/api/leaderboard/route.ts',
    'packages/web/src/app/api/categories/route.ts',
  ],
  content: `Redis cached null ambiguity testing proves whether a helper can tell four states apart: no client, no key, a read fault, and stored null. Stub each state, call the source through the cache wrapper, and count fetches. If every null result starts a fetch, negative caching cannot work as intended.

That behavior follows \`packages/web/src/lib/cache.ts\`, where \`cacheGet\` returns null for three infrastructure outcomes and can also receive null from Redis. The wrapper treats only a non-null result as a hit. Tests should first pin this current rule, then assess an explicit state design.

## What Must Redis Cached Null Ambiguity Testing Expose?

Redis cached null ambiguity testing must expose each hidden cause behind the same returned value. A disabled client, missing key, caught read error, and cached null all reach \`cacheGetOrSet\` as null. The wrapper then invokes its fetcher for every one of those cases.

The first three states concern cache access, while the fourth can be valid domain data. A lookup may correctly find no user, no optional record, or no result. Caching that null can prevent repeated source work only when the helper can recognize it as a hit.

The current function signature is \`Promise<T | null>\`. When \`T\` itself can be null, the type cannot say whether null was stored or no cache value was found. Runtime branching has the same gap because it checks \`cached !== null\`.

False, zero, and an empty string behave differently. Each value is non-null, so the wrapper returns it without calling the source. Add these controls to prove the code uses a strict null test rather than a broad truthiness test.

Read failures are also collapsed by design. The catch block in \`cacheGet\` returns null, so callers receive fresh source data when Redis fails. That fallback may be useful, but tests should make the hidden fault visible through a stub or separate log assertion.

The cache helper appears in \`packages/web/src/app/api/leaderboard/route.ts\` and \`packages/web/src/app/api/categories/route.ts\`. Those consumers return objects rather than nullable records today. They still provide real routes for proving hit, miss, and source-call behavior around the shared helper.

The [Redis cache testing guide](/blog/redis-cache-testing-guide) covers broad expiry and invalidation work. This article isolates one type and state problem that can otherwise lead to repeat source calls.

## How Do You Write a Redis Null Cache Miss Test?

A Redis null cache miss test controls the client response and counts each fetcher call. Run one case for absent configuration, missing key, stored null, read exception, false, and an object. Record both the returned value and any write attempt.

Start with the helper as it exists. Do not add a sentinel before the characterization test runs, because the team needs proof of the original ambiguity. Name the test around observable behavior, such as "stored null calls the fetcher again."

The Upstash [command overview](https://upstash.com/docs/redis/sdks/ts/commands/overview) describes calling Redis commands through the TypeScript client. Stub the same \`get\` and \`set\` seams used by \`cacheGet\` and \`cacheSet\`. A live Redis case can follow after fast table tests.

\`\`\`typescript
import { expect, test, vi } from 'vitest';

test.each([
  { name: 'missing key', redisValue: null, fresh: 'db-value', calls: 1 },
  { name: 'stored null', redisValue: null, fresh: null, calls: 1 },
  { name: 'stored false', redisValue: false, fresh: true, calls: 0 },
  { name: 'stored object', redisValue: { id: 1 }, fresh: null, calls: 0 },
])('$name follows current cacheGetOrSet rules', async (item) => {
  redisGet.mockResolvedValueOnce(item.redisValue);
  const fetcher = vi.fn().mockResolvedValue(item.fresh);

  const result = await cacheGetOrSet('case-key', fetcher, 60);

  expect(fetcher).toHaveBeenCalledTimes(item.calls);
  expect(result).toEqual(item.calls === 0 ? item.redisValue : item.fresh);
});
\`\`\`

This table deliberately gives missing and stored null the same mocked \`get\` value. That is the flaw under study, not a complete model of Redis state. A later live case can seed a serialized null and compare it with a deleted key.

Add a read-error row by making \`get\` reject. The current catch should call the source and return its value, while a write error should not reject the wrapper. Assert those outcomes without claiming the caller can identify the fault.

For no-client behavior, clear only the two expected environment values and reset the module singleton between cases. Restore the process environment after each test. Module state can make a disabled-client test reuse a client created by an earlier row.

Use the [error handling testing guide](/blog/error-handling-testing-patterns) to decide which failures need an observable log or metric. The current return type alone cannot distinguish a normal miss from an outage.

## What Is a Negative Caching Sentinel Value?

A negative caching sentinel value is a stored marker that means the source produced a valid empty result. It differs from key absence, so later reads can return null as domain data without calling the source again. The marker needs an unambiguous serialized shape.

A tagged object is often clearer than a magic string. For example, \`{ kind: 'cached', value: null }\` cannot be confused with a missing key when \`get\` returns null. The wrapper can decode the tag and return its nested value.

Magic strings are small but can collide with legitimate data. A value such as \`__NULL__\` needs escaping or a key namespace that prevents user data from using it. Tests should include that same text as valid data before approving this design.

A tagged envelope can hold any cached value, including false, zero, and empty text. It also leaves room for a format version when old keys remain in Redis. The cost is a larger payload and a migration rule for values written without the envelope.

Negative caching needs a finite TTL chosen by the owning feature. A missing record can appear later, so a long-lived sentinel may serve stale absence. The test should pass a short explicit TTL and verify the write options rather than guessing a product duration.

Redis cached null ambiguity testing should check corrupted or unknown envelopes too. Decide whether those values cause a source fetch, an error, or cache deletion. Pin one safe outcome and record the bad key without returning it as domain data.

Use the [cache consistency article](/blog/testing-leaderboard-cache-filter-isolation-ranking-consistency) for keys and filter isolation. A null sentinel still needs the same key ownership and expiry discipline as positive cached data.

## CacheGetOrSet Nullable Data Cases

CacheGetOrSet nullable data tests should include null beside every common falsy value. The current strict comparison correctly preserves false, zero, and empty text as hits. Only null receives miss behavior, even when null is the fetcher's valid result.

Run the wrapper twice with a fetcher that returns null. On the first call, the source runs and \`cacheSet\` receives null. On the second call, the Redis read yields null again, so the source runs a second time.

That two-call sequence is stronger than one mocked read. It demonstrates why writing null does not create an effective hit under the current contract. Count source calls, read calls, and writes across both operations.

Repeat the sequence with false, zero, an empty string, an empty array, and an empty object. Each stored non-null value should skip the second source call. Exact equality checks prevent a helper from replacing valid falsy data with fresh content.

The leaderboard consumer in \`packages/web/src/app/api/leaderboard/route.ts\` caches a response object with skills, filter, and update time. Stub its database query, invoke the route twice, and expect one source query when a valid object is read from cache.

The category consumer in \`packages/web/src/app/api/categories/route.ts\` caches grouped arrays. An object with empty arrays remains non-null and should be a hit. This is a useful control because "no categories" can still be represented by a positive object.

\`\`\`typescript
type CachedEnvelope<T> =
  | { state: 'value'; value: T }
  | { state: 'missing' };

async function readEnvelope<T>(key: string): Promise<CachedEnvelope<T>> {
  const client = getRedis();
  if (!client) return { state: 'missing' };

  const value = await client.get<{ state: 'value'; value: T }>(key);
  return value === null ? { state: 'missing' } : value;
}

const hit = await readEnvelope<Profile | null>('profile:42');
if (hit.state === 'value') {
  return hit.value;
}
\`\`\`

This sample separates presence from nested data, but it still groups no client with no key. A richer result can retain miss reasons if the caller or telemetry needs them. Keep public return types as small as the real product requires.

The [leaderboard](/leaderboard) route is a useful positive-value integration check. Do not force nullable data into that feature merely to test the generic helper; use a focused test consumer for the null case.

## How Do You Distinguish Cached Null Versus Missing Key?

To distinguish cached null versus missing key, either store a tagged envelope or ask Redis whether the key exists. Both approaches create a separate presence signal. Tests should cover extra commands, read faults, expiry, and values written by older code.

The Upstash [EXISTS command documentation](https://upstash.com/docs/redis/sdks/ts/commands/generic/exists) describes checking how many named keys exist. When \`get\` returns null, an \`exists\` result of one can mean the key is present. An answer of zero indicates absence at that moment.

Two commands can observe a key change between calls. A key may expire after \`get\` and before \`exists\`, or appear in the reverse order. A transaction, script, or one-command envelope read can avoid that split when exact state matters.

The envelope approach obtains presence and value together from one \`get\`. Its tests must include old plain values if production already holds them. Decide whether legacy data is accepted, migrated on read, or treated as a miss.

Redis cached null ambiguity testing should also model client absence and read errors apart from normal misses. An internal result such as \`{ state: 'unavailable' }\` can support logs while the high-level wrapper still calls its source. Do not expose infrastructure details to callers unless they need them.

Use one real Redis test to seed null, false, and an envelope, then delete the key for a true miss. Assert \`exists\`, \`get\`, and source calls. Clean each unique key in a final block so a failed case cannot affect its next run.

The [categories page](/categories) offers another real cached route, but its grouped object is not nullable. Use it to prove that the proposed representation keeps ordinary objects unchanged after migration.

## TypeScript Generic Cache Ambiguity

TypeScript generic cache ambiguity begins when \`T\` can include null while the function also uses null for absence. The union \`T | null\` then collapses two meanings into one type. No caller branch can recover which event produced that value.

Changing the generic to \`NonNullable<T>\` forbids cached null instead of supporting it. That may be valid for a narrowly scoped helper, but it must be explicit. Tests should then reject nullable fetchers at compile time and use a different helper for negative caching.

A discriminated union supports both meanings. A \`hit\` branch can carry \`T\`, including null, while a \`miss\` branch has no value. Type narrowing then forces callers to check state before reading data.

Keep storage shape and return shape separate when useful. Redis may store a tagged envelope, while \`cacheGetOrSet\` still returns plain \`T\` after handling hit status internally. Lower-level tests verify encoding, and consumer tests verify the simple value.

Generic compile tests can supplement runtime cases. Include \`cacheGetOrSet<User | null>\`, \`cacheGetOrSet<boolean>\`, and an object type. The nullable call should either work with an explicit state design or fail intentionally under a non-null API.

Do not use a type assertion to erase the problem. Casting \`null as T\` can make the compiler quiet while runtime ambiguity remains. The test must count fetches after a stored null to prove state is preserved.

The [lazy database initialization guide](/blog/testing-lazy-neon-database-initialization-nextjs-build) discusses another optional resource boundary. Both designs benefit from state types that distinguish unavailable infrastructure from valid empty data.

## Redis State, Helper Result, and Fetcher Call Matrix

This matrix records current behavior and the reason each state matters. "Ambiguous" means the helper exposes the same null result before \`cacheGetOrSet\` decides to fetch. It does not mean every final route response is null.

| Redis state | r.get result | cacheGet result | Fetcher called | Value returned | Ambiguous |
|---|---|---|---|---|---|
| Client unconfigured | No call | null | Yes | Fresh value | Yes |
| Key missing | null | null | Yes | Fresh value | Yes |
| Stored null | null | null | Yes | Fresh value | Yes |
| Read exception | Rejected call | null | Yes | Fresh value | Yes |
| Stored false | false | false | No | false | No |
| Stored object | Object | Object | No | Object | No |

Run the first row with module state reset. Once the singleton holds a client, clearing environment values may not disable it. A test that ignores this detail can report the wrong branch.

The stored-null row needs a live serialization check in addition to a stub. Confirm how the configured client writes and reads null in the supported SDK version. Keep the expectation tied to that verified version rather than a guessed wire value.

The read-exception row should assert source fallback and any required signal. If no log or metric exists, state that limit in the test report. A successful final value does not prove cache health.

Add write-call and TTL columns to the project test matrix. A miss that returns fresh data should attempt a cache write, while a hit should not. Negative entries need a TTL that reflects how soon absent data may become present.

Browse [cache testing skills](/skills) when turning this matrix into shared test support. Keep the six core states visible rather than hiding them behind one broad mock setup.

## How Do You Run the Null Ambiguity Procedure?

Run the null procedure in two phases: characterize the current helper, then verify the chosen explicit state contract. The same source spy and value matrix should drive both phases. Only expected source-call counts should change for stored null.

1. Create a fetcher spy that returns one controlled nullable value.
2. Reset the Redis singleton and stub each read state independently.
3. Call the wrapper twice and record reads, writes, source calls, and values.
4. Assert the current helper treats every null read outcome as a miss.
5. Choose a tagged envelope, explicit hit result, or non-null-only contract.
6. Add the new representation without changing false, zero, or empty hits.
7. Repeat all states and prove stored null no longer invokes the source.

### Capture a cache-state proof pack

- The test key with a run prefix that no other worker can read or write during this case
- The client state before the call, including whether valid Redis settings exist and whether a prior singleton was reset
- The exact stubbed get result or thrown fault, kept apart from the domain value that the source will yield
- The source spy count before and after each wrapper call, with two calls shown for all stored-value cases
- The value sent to set, the chosen TTL, and the number of writes made after a true cache miss
- The final value seen by the caller, including its type when false, zero, empty text, or null is valid
- The hit or miss state from the new design, plus any fault reason kept for logs or service health checks
- The live Redis EXISTS result for missing and stored-null keys when that command is part of the chosen design
- The raw legacy value and decoded new envelope when old cache entries must work during a format change
- The key state after expiry, followed by one fresh source call and one new write under the same test clock
- The cleanup result for each unique key, with no shared prefix left behind for the next local or CI run
- The Redis SDK and runtime versions used by the live check, since decode rules must match the supported client
- The count of get, exists, set, and delete commands so a state fix does not add hidden work to each hit
- The route response from one object-valued consumer, checked before and after the helper change with the same cached data
- The smallest stored-null case that fails the old rule and passes the new rule without a sleep or retry loop

Start with false and an object as known hits. They verify that the mock reaches the read branch and that source call counts are trustworthy. Then run missing key and read-fault cases as known fallbacks.

Next, return null from the source twice through the same key. The current result should show two source calls, even if two writes occur. Save that failing efficiency contract before changing the helper.

Implement the selected representation at the lowest level that knows presence. Decode it in one place and keep consumer code free from magic values. Add a format marker if old cached values need safe coexistence.

After the change, repeat stored null and require one source call across two wrapper calls. Missing keys and read errors should still call the source, while false and objects should remain hits. This comparison proves the fix did not broaden or narrow unrelated behavior.

Finally, call the leaderboard and category consumers with ordinary cached objects. Their response shapes and source-call counts should remain stable. A generic cache fix should not force route-level envelope data into JSON output.

Use the [cache guide](/blog/redis-cache-testing-guide) for expiry and invalidation follow-up. Redis cached null ambiguity testing ends only when hit status, nullable data, and fault fallback are independently observable.

## Frequently Asked Questions

### Is negative caching the same as storing null?

Not when the read API also uses null for a missing key. Effective negative caching stores a value whose presence can be recognized, such as a tagged envelope. The wrapper can then return domain null without calling the source again until the negative entry expires.

### Can Redis EXISTS solve the ambiguity?

It can add a presence signal after a null read, but two separate commands can observe different moments as keys expire or change. Test that race and the extra request cost. A tagged value read in one command may offer a simpler contract for many applications.

### Why do false and zero work as cache hits?

The current wrapper checks whether the cached value is not strictly equal to null. False, zero, and empty strings satisfy that check, so the source is skipped. Keep these cases in regression tests because a future truthiness check would break valid falsy cache values.

### Should a Redis read error be treated as a miss?

Calling the source can keep the feature available, but a fault and normal miss should remain observable for operations. The current helper hides both behind null. A revised internal result can record unavailable state while preserving source fallback for callers that only need final data.

### What TTL should a cached null use?

Choose it from how quickly absent source data may appear and how costly repeated lookups are. There is no universal duration. Tests should verify the explicit TTL passed by the feature and should use short, controlled expiry in live cases rather than waiting on production values.

### Does a tagged envelope change consumer response data?

It need not. The low-level cache can decode the envelope and let \`cacheGetOrSet\` return plain \`T\`, including null. Integration tests should confirm that leaderboard and category JSON stay unchanged for the user while source-call counts improve for a focused nullable consumer.

### How should old cache values be migrated?

Define how the decoder recognizes both legacy plain values and new envelopes. It can accept old positive data, treat unknown shapes as misses, or rewrite on read. Seed each format in tests, then verify safe values, source calls, and expiry without casting unknown data blindly.

## Conclusion

Redis cached null ambiguity testing turns one vague null into a clear state matrix. The current helper merges disabled access, missing keys, read faults, and stored null, so repeated source calls are expected when nullable data is cached.

Choose either a tagged hit representation or a documented non-null-only contract, then rerun the same two-call cases. Keep false, zero, empty text, normal objects, and fault fallback as controls throughout the change.

Browse [cache and reliability testing skills](/skills) before choosing a nullable cache contract. Check the [leaderboard cache article](/blog/testing-leaderboard-cache-filter-isolation-ranking-consistency) when validating that ordinary route payloads and filter keys remain unchanged.`,
};
