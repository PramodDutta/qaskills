import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cache the pnpm Store for Tests in GitLab CI',
  description:
    'Cache the pnpm store in GitLab CI with lockfile-derived keys, project-local paths, trusted writers, and pull-only test jobs that stay reproducible.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Cache the pnpm Store for Tests in GitLab CI

The cache archive restores successfully, yet \`pnpm install\` downloads every package again. In most cases the runner archived one store path while pnpm used another. GitLab only caches paths under the project checkout, and pnpm's default store location varies with its environment. The reliable fix is to choose a project-local store explicitly, hash the lockfile into the cache key, and keep installation in the job.

Caching pnpm's content-addressable store is an optimization for package retrieval. It is not a replacement for \`pnpm install --frozen-lockfile\`, not a way to share \`node_modules\` blindly, and not guaranteed to make every pipeline faster. Archive transfer and compression can outweigh registry downloads. This tutorial builds a reproducible configuration first, then shows how to decide if the cache earns its cost.

For the wider pipeline anatomy around runners, services, and test reports, use the [GitLab CI test automation guide](/blog/gitlab-ci-test-automation-guide-2026). To place dependency preparation behind merge controls and required jobs, see the [GitLab CI quality gates guide](/blog/gitlab-ci-quality-gates-guide-2026).

## Understand what pnpm's store contributes

pnpm keeps package contents in a global content-addressable store and constructs each project's dependency layout from that content. When a required package is already present, installation can reuse it instead of fetching the tarball from the registry. The project still needs its \`node_modules\` layout, lifecycle scripts, lockfile validation, and workspace links.

That separation is why caching the store is safer than caching \`node_modules\`. A restored store is an input to a fresh deterministic install. A restored module tree is already an installation product whose links and generated files may reflect another job, Node version, architecture, or script environment.

| Directory or file | Role | Cache recommendation |
|---|---|---|
| \`.pnpm-store/\` | Downloaded content-addressed packages | Candidate for GitLab cache |
| \`node_modules/\` | Project dependency layout and links | Recreate with \`pnpm install\` |
| \`pnpm-lock.yaml\` | Exact dependency graph and integrity data | Track in source, use for key |
| pnpm metadata cache | Request and metadata acceleration | Optional, version-sensitive |
| Test reports | Outcome of a particular job | Upload as artifacts, not cache |
| Build output | Generated product used downstream | Usually artifacts with explicit dependency |

GitLab caches can be reused across pipelines. Artifacts pass declared results between jobs in a pipeline. A test report belongs to the run that created it, while a package store can accelerate many runs. Mixing those lifecycles leads to stale reports or needless dependency uploads.

## Put the store below the checkout root

GitLab cache paths are relative to \`CI_PROJECT_DIR\` and cannot point outside the project. Configure pnpm before installation:

\`\`\`bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
pnpm config set store-dir .pnpm-store
pnpm store path
pnpm install --frozen-lockfile
\`\`\`

The final \`pnpm store path\` is a diagnostic worth retaining during rollout. It should resolve inside the checkout. Use the pnpm major and version declared by the repository's \`packageManager\` field. A mismatched major can reject or reinterpret a lockfile, so “install latest pnpm” is not reproducible CI.

Setting \`PNPM_STORE_DIR\` or the \`pnpm_config_store_dir\` environment variable can also work, but one explicit mechanism is easier to diagnose. Avoid configuring a home-directory path and then listing \`.pnpm-store\` under \`cache.paths\`; those are different directories even if their names look similar.

## Use a lockfile-derived cache key

GitLab's \`cache:key:files\` derives a key from file content. Point it at \`pnpm-lock.yaml\` so dependency graph changes create a new cache entry. Add a prefix for dimensions that change package compatibility, commonly pnpm major, Node major, runner architecture, or job family.

This complete job uses a project-local store, a lockfile key, and a frozen install:

\`\`\`yaml
stages:
  - test

variables:
  PNPM_VERSION: '9.15.0'
  PNPM_STORE_DIR: '.pnpm-store'

unit_tests:
  stage: test
  image: node:20-bookworm-slim
  before_script:
    - corepack enable
    - corepack prepare "pnpm@\${PNPM_VERSION}" --activate
    - pnpm config set store-dir "\${PNPM_STORE_DIR}"
    - pnpm store path
    - pnpm install --frozen-lockfile
  script:
    - pnpm test -- --run
  cache:
    key:
      files:
        - pnpm-lock.yaml
      prefix: "pnpm9-node20-\${CI_RUNNER_EXECUTABLE_ARCH}"
    paths:
      - .pnpm-store/
    policy: pull-push
    when: on_success
  artifacts:
    when: always
    reports:
      junit: reports/junit.xml
    paths:
      - reports/
    expire_in: 7 days
\`\`\`

The pnpm command after \`script\` must match the repository. Vitest accepts \`--run\`, while Jest and other runners differ. The cache configuration does not justify inventing a test flag.

The prefix is intentionally explicit. \`CI_RUNNER_EXECUTABLE_ARCH\` distinguishes runner architecture. The image fixes Node 20 and a Debian family. If multiple jobs use identical dependencies on identical runner classes, keep the prefix common so they can reuse one entry. If native packages behave differently by job image, split it.

## Frozen installation remains the correctness gate

A warm store can contain more packages than the current project needs. That is normal. pnpm addresses content by integrity and links only what the lockfile selects. The required correctness command remains \`pnpm install --frozen-lockfile\`. It fails when manifest and lockfile disagree rather than editing the lockfile inside CI.

Do not switch to \`--offline\` simply because a cache exists. GitLab cache availability is not guaranteed, entries can be evicted, and a new package may be absent. Strict offline mode converts an optimization miss into a pipeline failure. \`--prefer-offline\` is an optional pnpm behavior when the team wants cached data favored while allowing network recovery, but benchmark it and understand metadata freshness before adopting it.

| Install mode | Cache miss behavior | Suitable default in CI |
|---|---|---|
| \`--frozen-lockfile\` | Downloads missing content, never rewrites lockfile | Yes |
| \`--offline\` | Fails if required package metadata or content is absent | Only sealed, prefilled environments |
| \`--prefer-offline\` | Prefers local data but can contact registry | Optional after measurement |
| No frozen lockfile | May update dependency resolution | Avoid for verification jobs |

A test pipeline must pass from an empty store. Periodically run a no-cache canary or clear the key prefix in a branch to verify this invariant. Otherwise a package available only from historical cache can hide a broken registry, missing authentication, or unpublished dependency.

## Stop parallel jobs from uploading the same archive

With \`policy: pull-push\`, every test job restores and uploads. A large matrix can spend substantial time compressing nearly identical stores, and concurrent writers create redundant work. Use one preparation job as the trusted writer and configure fan-out test jobs with \`policy: pull\`.

\`\`\`yaml
.pnpm_cache: &pnpm_cache
  key:
    files:
      - pnpm-lock.yaml
    prefix: "pnpm9-node20-\${CI_RUNNER_EXECUTABLE_ARCH}"
  paths:
    - .pnpm-store/

warm_pnpm_store:
  stage: .pre
  image: node:20-bookworm-slim
  cache:
    <<: *pnpm_cache
    policy: pull-push
  script:
    - corepack enable
    - corepack prepare pnpm@9.15.0 --activate
    - pnpm config set store-dir .pnpm-store
    - pnpm install --frozen-lockfile
  rules:
    - if: '\$CI_COMMIT_BRANCH == \$CI_DEFAULT_BRANCH'

browser_tests:
  stage: test
  image: node:20-bookworm-slim
  cache:
    <<: *pnpm_cache
    policy: pull
  before_script:
    - corepack enable
    - corepack prepare pnpm@9.15.0 --activate
    - pnpm config set store-dir .pnpm-store
    - pnpm install --frozen-lockfile
  script:
    - pnpm test:e2e
\`\`\`

This example warms only on the default branch. Whether feature branches can restore that entry depends on GitLab's cache scope and protected-branch settings. Do not weaken protected and unprotected separation merely to improve hit rate. A low-trust merge request must not poison an executable dependency cache later used with deployment credentials.

The warm job is useful only if downstream jobs can access distributed cache and if its delay does not exceed the saved time. On GitLab.com instance runners, distributed cache is available. Self-managed fleets need shared storage or consistent runners. Without it, the warm job may upload to one runner while consumers execute elsewhere with no shared backend.

## Choose cache scope around trust and reuse

A lockfile-only key allows branches with identical dependencies to reuse content. A branch-specific key isolates writers but guarantees the first pipeline on every branch starts cold. A hybrid uses the lockfile content plus protected-scope behavior supplied by GitLab.

| Key strategy | Hit rate | Isolation | Typical use |
|---|---:|---:|---|
| \`CI_COMMIT_REF_SLUG\` | Medium after first branch run | Strong branch separation | Long-lived untrusted branches |
| Lockfile content | High across matching branches | Relies on GitLab scope controls | Trusted project pipelines |
| Job name plus lockfile | Lower across job types | Avoids incompatible consumers | Different images or native toolchains |
| Commit SHA | Almost always cold | Maximum isolation | Poor choice for dependency acceleration |
| Static key | High until polluted | Weak invalidation | Avoid unless contents are intentionally cumulative |

GitLab separates protected and non-protected caches by default. Keep that security boundary unless all cache writers are trusted equivalently. A package store contains executable JavaScript and lifecycle scripts may run during installation. Treat restored bytes as untrusted inputs even when their integrity is checked through the lockfile.

## Account for native addons and install scripts

The content-addressable store primarily holds package content, but dependency installation can involve native addons, platform-specific optional packages, and lifecycle-generated artifacts. The safest key includes material compatibility dimensions and installation runs inside the target job image.

If the monorepo tests Node 20 and Node 22, use a Node-major prefix even when most JavaScript packages are identical. This sacrifices some reuse for easier failure analysis. Teams can later prove that a shared store is safe for their dependency graph and consolidate. Correctness precedes maximal cache density.

Never cache secrets written by registry authentication. Configure scoped registry tokens through masked CI variables and ensure \`.npmrc\` with interpolated credentials is not inside a cache path or artifact. Prefer short-lived credentials where the registry supports them.

## Monorepos need one graph key, not package guesses

In a pnpm workspace, the root \`pnpm-lock.yaml\` usually describes the dependency graph for every package. Key the store from that file and run the install at the workspace root. Filtering tests afterward with \`pnpm --filter ... test\` is fine, but installing independently in package subdirectories can miss workspace links and produce inconsistent stores.

GitLab supports at most a bounded number of cache entries per job, so resist separate stores for dozens of packages. The shared store already deduplicates package content. Split caches only for a compatibility or trust reason, not to mirror the folder tree.

If multiple lockfiles genuinely exist for independent projects, define separate jobs or cache entries with clear prefixes. Remember that \`cache:key:files\` accepts only a limited number of files. A generated combined checksum is possible, but generating it before GitLab restores the cache is awkward because restoration occurs before job scripts. Repository structure is often the cleaner fix.

## Measure archive economics

The pnpm documentation explicitly notes that caching the store is optional and not guaranteed to speed installation. Measure restore, install, and upload separately. A hit that saves thirty seconds during install but adds forty seconds of cache transfer is a regression.

Capture these values from job logs over representative pipelines:

1. Cache download and extraction time.
2. \`pnpm install\` duration and registry requests.
3. Cache creation and upload time on writer jobs.
4. Archive size and eviction frequency.
5. Total test job duration at p50 and a tail percentile.

Avoid fabricated universal savings. Registry proximity, dependency count, runner disk, compression, and network paths vary too much. The best configuration for GitLab.com shared runners may be wrong for an on-premises runner beside an internal registry.

Run \`pnpm store prune\` only as an intentional maintenance choice. Frequent pruning removes versions useful when switching branches and adds work before archive upload. Immutable lockfile keys naturally age out old entries through cache retention policies; they do not require pruning on every job.

## Diagnose the common failure signatures

When the cache appears ineffective, compare the logged \`pnpm store path\` with \`cache.paths\` first. Then inspect exact cache keys and runner availability.

| Symptom | Investigation | Repair |
|---|---|---|
| “Successfully extracted cache” but full downloads follow | Store path mismatch | Set project-local \`store-dir\` before install |
| Cache never found on another runner | No distributed cache backend | Configure shared cache or accept cold jobs |
| New dependency is mysteriously unavailable | Strict offline install | Allow network recovery with frozen lockfile |
| Test matrix uploads for minutes | Every job uses \`pull-push\` | Assign one writer, consumers use \`pull\` |
| Native addon fails after Node upgrade | Compatibility missing from key | Add Node major or image identity to prefix |
| Feature branch cannot see default cache | Protected-scope or key separation | Preserve trust boundary, warm appropriate scope |

Do not “fix” a miss by replacing the key with a constant. That trades visible network cost for invisible staleness and cache contention. A predictable miss on a changed lockfile is correct behavior.

## Rehearse cache loss and registry failure separately

Two resilience drills answer different questions. In the first, change the cache prefix or disable cache for one pipeline while the registry remains available. The install should recreate the store and all tests should run. This proves the cache is optional. In the second, keep a known complete cache but make the registry unavailable in an isolated environment. The outcome depends on pnpm metadata, lifecycle scripts, and whether every required package is present. Do not promise offline resilience until that drill succeeds intentionally.

A warm content store does not guarantee that installation needs no network. Metadata checks, git dependencies, remote lifecycle downloads, package-manager preparation, and application test fixtures may still call external systems. Capture network destinations during the drill and decide which are legitimate. If fully hermetic installation is a requirement, build a supported offline process or internal registry mirror rather than depending on yesterday's opportunistic GitLab archive.

Registry authentication also needs a cold-path test. A cache hit can conceal an expired token for weeks, then a lockfile change causes an apparently unrelated pipeline failure. Schedule a small job that installs a private fixture package into an empty temporary store using the same CI credentials. Keep the fixture harmless and avoid publishing secrets in command output.

Use failure classification in job logs:

| Failure point | Ownership clue | Useful next check |
|---|---|---|
| Corepack cannot activate pnpm | Runtime image or outbound package-manager access | Pinning and bundled package-manager policy |
| Cache restore misses | Key, scope, eviction, or runner backend | Exact resolved key and protected status |
| Integrity verification fails | Registry content or corrupted input | Lockfile integrity and trusted source |
| Private package returns 401 | CI credential expired or scope changed | Masked variable availability and registry path |
| Lifecycle script reaches internet | Dependency is not hermetic | Replace, mirror, or explicitly permit destination |

These drills keep performance state from becoming hidden availability state. Teams should be able to delete every pnpm cache entry and still obtain a correct, if slower, pipeline.

## Frequently Asked Questions

### Why cache the pnpm store instead of \`node_modules\`?

The store supplies verified package content to a fresh install. \`node_modules\` contains a project-specific linked layout and generated artifacts that can be coupled to another job's Node version, platform, or scripts.

### Must the store be inside \`CI_PROJECT_DIR\`?

For GitLab's project cache paths, yes. Set \`store-dir\` to a relative directory such as \`.pnpm-store\` and print \`pnpm store path\` to verify that pnpm and GitLab agree.

### Should every parallel test job upload the cache?

Usually not. Let a trusted preparation or default-branch job use \`pull-push\`, and make fan-out consumers \`pull\`. This avoids repeated compression and competing writes.

### Is \`--offline\` safer once the cache is warm?

It is stricter, not automatically safer. Cache availability is not guaranteed, so offline mode can fail valid builds on eviction or a cold runner. Frozen lockfile installation already protects dependency resolution while allowing missing content to download.

### When should I remove the pnpm store cache?

Remove it when measured restore plus upload cost meets or exceeds install savings, when a nearby registry is faster, or when cache sharing cannot be secured for the pipeline's trust model.
`,
};
