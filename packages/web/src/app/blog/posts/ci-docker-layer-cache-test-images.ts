import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'CI Docker Layer Cache for Test Images: Faster Builds Without Stale Test Environments',
  description: 'Use ci docker layer cache test images to speed pipeline builds while keeping dependencies, browsers, services, and test evidence reproducible.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# CI Docker Layer Cache for Test Images: Faster Builds Without Stale Test Environments

CI Docker layer cache test images are worth testing because a fast container build is only useful when it still represents the commit under review. The practical goal is not "turn on caching". The goal is to reuse expensive layers such as operating system packages, browsers, language dependencies, and test tools while forcing rebuilds when the files that define those layers change.

For QA and test-automation engineers, this matters most in end-to-end, contract, API, and performance pipelines where the test image is larger than the application change. A Playwright image may install browser dependencies. A Selenium or WebdriverIO image may include drivers and fonts. A k6 or JMeter image may include plugins, certificates, and generated data. If every pull request rebuilds all of that from zero, feedback is slow. If caching is too broad, stale tools hide real failures.

This guide shows how to design cacheable test images, choose cache keys, validate cache hits, diagnose stale layers, and wire the result into CI without confusing cache speed with test correctness. It pairs naturally with canceling duplicate pipeline work, covered in [cancel stale e2e runs on new commit](/blog/ci-cancel-stale-e2e-runs-on-new-commit), and with publishing reliable flaky-test evidence, covered in [GitLab CI JUnit flaky test reports](/blog/gitlab-ci-junit-report-flaky-tests).

## Cache The Dependency Boundary, Not The Whole Mystery Box

A Docker layer cache works when earlier instructions and the files they depend on are unchanged. It performs badly when the Dockerfile copies the entire repository before installing dependencies because any source edit invalidates the expensive dependency layer. Test images should be designed around boundaries: base operating system, system packages, language dependencies, browser or tool downloads, test support files, and finally the current source.

| Layer | Typical contents | Should change when | Cache risk |
|---|---|---|---|
| Base image | Runtime, OS distribution, shell tools | Base tag or digest changes | Floating tags can shift silently |
| System dependencies | Fonts, libraries, curl, certificates | Dockerfile package list changes | Missing package update may persist |
| Language dependencies | npm, pnpm, pip, Maven, Gradle dependencies | Lockfile changes | Copying source too early invalidates cache |
| Browser or test tools | Playwright browsers, WebDriver drivers, k6 plugins | Tool version or install command changes | Version drift between local and CI |
| Test assets | fixtures, schemas, seed data | Asset files change | Overbroad copy can keep stale data |
| Source under test | application and tests | Every commit | Should be the least cached part |

The following Dockerfile shape keeps dependency installation separate from application source. It is intentionally simple, and you should adapt package managers to your project.

\`\`\`dockerfile
FROM node:22-bookworm AS test-deps

WORKDIR /workspace

COPY package.json package-lock.json ./
RUN npm ci

COPY playwright.config.ts ./
RUN npx playwright install --with-deps chromium

FROM node:22-bookworm AS test-runner

WORKDIR /workspace
COPY --from=test-deps /workspace/node_modules ./node_modules
COPY --from=test-deps /root/.cache/ms-playwright /root/.cache/ms-playwright
COPY . .

CMD ["npm", "test"]
\`\`\`

The important detail is the order. A change to a test file should not force \`npm ci\` or browser installation to run again. A change to \`package-lock.json\` should force dependency installation. A change to \`playwright.config.ts\` may need to rebuild the browser layer if the config controls projects or browser choices in your repository. If it does not, keep it out of that stage.

What people get wrong: they make the cache key depend on the branch name only. That can be fast, but it does not express why the image is valid. A cache should be reusable across commits when dependency inputs match, and invalidated when the lockfile, Dockerfile, base image, or tool install step changes.

## Use BuildKit Cache Export Deliberately

Docker BuildKit supports external cache import and export through \`--cache-from\` and \`--cache-to\` on \`docker buildx build\`. The official Docker documentation covers cache backends and syntax at https://docs.docker.com/build/cache/backends/. CI systems and actions often wrap these options, but the concept remains the same: import a previous cache, build the new image, then export cache metadata and layers for the next run.

For a registry-backed cache, the command shape is:

\`\`\`bash
docker buildx build \\
  --file Dockerfile.test \\
  --target test-runner \\
  --tag registry.example.com/acme/web-test:pr-123 \\
  --cache-from type=registry,ref=registry.example.com/acme/web-test-cache:main \\
  --cache-to type=registry,ref=registry.example.com/acme/web-test-cache:pr-123,mode=max \\
  --push \\
  .
\`\`\`

Registry cache is useful when CI runners are ephemeral. A local directory cache can be useful when the runner workspace persists, but many hosted runners start from a clean machine. Inline cache can help when you push images, but it is not the same as a complete, separately managed cache backend. Choose the backend based on runner persistence, registry permissions, and whether pull requests from forks are allowed to write.

| Cache backend pattern | Good fit | Weakness | QA check |
|---|---|---|---|
| Registry cache | Ephemeral CI runners and shared teams | Needs registry access and cleanup policy | Verify imported cache is from trusted ref |
| Local cache directory | Self-hosted runners with persistent disk | Disk can fill or become branch-biased | Track cache size and prune policy |
| CI service cache | Small dependency or build directories | May have archive overhead and key limits | Confirm cache key includes lockfile inputs |
| No external cache | Small images or sensitive builds | Slow on large test environments | Measure build time before adding complexity |

Do not let pull requests from untrusted forks write to the same cache reference consumed by protected branches. A cache is not a deployment artifact, but it can influence build inputs. Use separate read and write policies for trusted and untrusted contexts, or make untrusted PRs read from main and write nowhere.

## Build A Test Image That Carries Evidence

The image should make it easy to prove what it contains. Add labels for the commit, Dockerfile path, dependency lockfile hash, and test tool versions that matter to your team. OCI image labels are documented at https://github.com/opencontainers/image-spec/blob/main/annotations.md. You do not need dozens of labels. You need enough to diagnose "why did this image run different tests than expected?"

\`\`\`dockerfile
ARG COMMIT_SHA
ARG LOCKFILE_SHA
ARG BUILT_AT

LABEL org.opencontainers.image.revision="$COMMIT_SHA"
LABEL org.opencontainers.image.created="$BUILT_AT"
LABEL qa.acme.lockfile-sha="$LOCKFILE_SHA"

RUN node --version > /opt/test-image-node-version.txt
RUN npm --version > /opt/test-image-npm-version.txt
\`\`\`

Then make CI compute the values from real files. Avoid letting the Dockerfile compute the lockfile hash after copying the whole repository because that hides the input from the CI logs and makes cache diagnosis harder.

\`\`\`bash
COMMIT_SHA="$(git rev-parse HEAD)"
LOCKFILE_SHA="$(sha256sum package-lock.json | awk '{print $1}')"
BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

docker buildx build \\
  --file Dockerfile.test \\
  --build-arg COMMIT_SHA="$COMMIT_SHA" \\
  --build-arg LOCKFILE_SHA="$LOCKFILE_SHA" \\
  --build-arg BUILT_AT="$BUILT_AT" \\
  --tag registry.example.com/acme/web-test:"$COMMIT_SHA" \\
  .
\`\`\`

Those labels do not force test correctness by themselves. They make failures inspectable. When a flaky browser test fails only in CI, you can inspect the image and confirm whether it used the expected lockfile, test runner, and browser cache. When an AI coding agent updates a Dockerfile, the evidence also gives reviewers a compact way to compare before and after behavior.

## Choose Cache Keys By Inputs That Actually Change Test Behavior

Cache keys should map to behavioral inputs, not moods. Branch name, PR number, or current date may be useful as namespace boundaries, but they do not prove that a dependency layer is valid. Better cache inputs include Dockerfile content, package lockfiles, language version files, test tool config, install scripts, and base image digest if your build process captures it.

| Input | Include in cache identity? | Reason |
|---|---:|---|
| Dockerfile.test | Yes | Changes install steps and layer order |
| package-lock.json, pnpm-lock.yaml, yarn.lock | Yes | Changes Node dependency tree |
| requirements.txt or poetry.lock | Yes | Changes Python dependency tree |
| pom.xml plus dependency lock strategy | Usually | Changes JVM test dependencies |
| playwright.config.ts | Maybe | Include if browser projects or install choices change |
| test source files | No for dependency cache | Should invalidate final source layer only |
| branch name | Namespace only | Useful for write isolation, not correctness |
| timestamp | No for reuse | Destroys cache value unless used for scheduled refresh |

For GitHub Actions, the Docker maintained actions support Buildx setup and build inputs. The example below uses documented action inputs such as \`cache-from\` and \`cache-to\` on \`docker/build-push-action\`. Pin action versions according to your organization's policy.

\`\`\`yaml
name: test-image

on:
  pull_request:
  push:
    branches: [main]

jobs:
  build-test-image:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}
      - name: Build test image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: Dockerfile.test
          target: test-runner
          push: true
          tags: ghcr.io/acme/web-test:\${{ github.sha }}
          cache-from: type=registry,ref=ghcr.io/acme/web-test-cache:main
          cache-to: type=registry,ref=ghcr.io/acme/web-test-cache:\${{ github.sha }},mode=max
\`\`\`

In a real workflow file, you would write the expression normally.

If you do not push images for every PR, build locally inside the runner and export only the cache. That can still speed future builds, but you need a separate step to run tests in the resulting image. Keep build, cache export, and test execution logs separate so a failure is easy to triage.

## Keep Test Execution Separate From Image Construction

A common anti-pattern is running the entire test suite during \`docker build\`. That makes cache behavior confusing because a cached test layer can hide the fact that tests did not run for the new source. Build stages may run small verification commands, such as checking that a CLI is installed, but the suite should run in a container created from the image after the source layer has been built for the current commit.

\`\`\`bash
docker buildx build \\
  --file Dockerfile.test \\
  --target test-runner \\
  --tag acme-web-test:local \\
  --load \\
  .

docker run --rm \\
  --env CI=true \\
  --volume "$PWD/test-results:/workspace/test-results" \\
  acme-web-test:local \\
  npm run test:e2e -- --reporter=junit
\`\`\`

This separation is also better for evidence. The image build log explains cache reuse. The test log explains product behavior. The test results directory can be uploaded as CI artifacts and parsed by your CI platform. When the same image is used for multiple shards, label and log the image digest so every shard can be tied to the exact environment.

| Practice | Why it helps | Failure avoided |
|---|---|---|
| Build once, run many shards from same image digest | Eliminates shard environment drift | Shard 1 and shard 6 use different browsers |
| Write test reports to mounted artifact directory | Keeps evidence outside container lifecycle | Results disappear when container exits |
| Avoid running suite in Dockerfile | Prevents cached test results | PR appears green without executing tests |
| Log image digest in each shard | Makes failures traceable | Cannot reproduce failing environment |

If your app itself is built into another image, do not casually merge app build and test runner image concerns. The test image may need debugging tools, browsers, and shell utilities that should not exist in production. Keep the boundary clear unless your release process deliberately tests the final production image.

## Validate Cache Hits With Timing And Layer Evidence

A cache that "should work" is not enough. Add a lightweight build log review to the first few pipeline runs after changing Dockerfile structure. BuildKit output indicates cached steps, but logs vary by frontend and CI formatting. Focus on evidence: dependency install steps should be cached when only test source changes, and they should rerun when the lockfile changes.

\`\`\`bash
git checkout -b cache-check
echo "// harmless test edit" >> tests/e2e/example.spec.ts

docker buildx build \\
  --file Dockerfile.test \\
  --target test-runner \\
  --progress=plain \\
  --tag acme-web-test:cache-check \\
  .
\`\`\`

Use the result to create a small acceptance matrix for the cache implementation.

| Change made | Expected expensive layers | Expected final layers | If this fails |
|---|---|---|---|
| Edit only a spec file | Dependency and browser install reused | Source copy reruns | Dockerfile copies source too early |
| Edit package lockfile | Dependency install reruns | Source copy reruns | Lockfile not copied before install |
| Edit Dockerfile package list | System package layer reruns | Later layers rerun | Build step hidden in script not tracked |
| Change base image digest | Most layers rerun | Full rebuild expected | Base image input not controlled |
| Change test fixture only | Dependencies reused | Fixture-containing layer reruns | Fixture copied into wrong stage |

This matrix is more useful than a single timing target. Timings change with runner load and registry distance. Layer invalidation behavior should remain explainable.

## Diagnose Stale Browser Or Dependency Failures

A realistic failure mode: a team upgrades Playwright in \`package-lock.json\`, but the Dockerfile copies only \`package.json\` before \`npm ci\`. The image cache reuses the old dependency layer because the copied inputs did not change. Locally, tests run with the new package. In CI, the old package and browser cache remain. Errors appear as protocol mismatches, missing browser executable messages, or tests that fail only on the runner.

Diagnose with a controlled checklist:

| Symptom | Likely cause | Command or evidence |
|---|---|---|
| CI uses older package than lockfile | Lockfile not copied before install | Inspect Dockerfile COPY before dependency step |
| Browser executable missing | Browser install layer skipped or cache path not copied | Run tool install verification inside image |
| Build fast but tests fail with old behavior | Source or config not included in invalidating layer | Inspect image labels and copied files |
| Cache never hits | Context changes invalidate early layers | Check .dockerignore and COPY order |
| Cache hits from unrelated branch | Shared mutable cache ref | Namespace write cache by trusted branch or commit |

Add a small smoke command to the image build if a tool is critical. It should print versions or verify binary presence, not run the full suite.

\`\`\`dockerfile
RUN node -e "console.log(process.version)"
RUN npx playwright --version
\`\`\`

Do not pin browser paths by guessing internal directories unless the tool documents that path for your environment. Prefer the install and runtime commands documented by the tool. For Playwright, official Docker and CI guidance is available at https://playwright.dev/docs/ci and https://playwright.dev/docs/docker.

## Use .dockerignore As A Cache Control Surface

The build context affects cache performance. If every local artifact, report, screenshot, and dependency directory is sent into the build context, Docker has more content to hash and more opportunities to invalidate layers. A disciplined \`.dockerignore\` is part of the cache design.

\`\`\`dockerignore
node_modules
test-results
playwright-report
coverage
.git
.env
*.log
tmp
\`\`\`

Be careful with \`.git\`. Excluding it is usually right for smaller contexts and reproducible builds, but if your build step calls \`git rev-parse\` inside Docker, it will fail or produce different evidence. Prefer passing commit metadata through build arguments from CI. Also avoid ignoring fixtures, schemas, or generated clients that tests genuinely need. A too-aggressive ignore file creates false green builds by omitting files that exist locally.

Review context size in CI whenever cache behavior changes. Large contexts make "fast cached builds" feel slow because the runner still has to prepare and send content before the cache decision becomes useful.

## Protect The Cache From Security And Reproducibility Problems

Layer cache speeds builds by trusting previous work. That trust needs boundaries. Protected branches should not import arbitrary cache layers produced by untrusted code. Secrets should not be written into layers. Private registry credentials should not be copied into the image. Test images should avoid caching generated credentials, real user data, or production snapshots.

| Risk | Bad pattern | Safer pattern |
|---|---|---|
| Secret in layer | \`COPY .npmrc .\` with token | Use CI secret mount or registry auth outside final image |
| Poisoned shared cache | Fork PR writes to main cache ref | Read-only cache for untrusted PRs |
| Floating base image drift | \`FROM node:latest\` | Use a controlled tag or digest policy |
| Stale generated data | Fixture generation cached without input hash | Include generator inputs in layer boundary |
| Oversized cache | Every commit writes permanent cache | Retention policy and scheduled cleanup |

When in doubt, prefer a slightly slower build over a cache that can change protected build behavior in ways reviewers cannot inspect. Caching is an optimization. Reproducibility and isolation are test requirements.

## A Review Checklist For CI Test Image Cache Changes

Use this checklist when reviewing a pull request that changes Dockerfile structure, CI build steps, or test image caching:

| Question | Pass signal | Review action if missing |
|---|---|---|
| Are dependency inputs copied before install? | Lockfiles appear before dependency RUN step | Ask for Dockerfile reorder |
| Does source copy happen late? | App and tests copied after expensive installs | Ask why source must influence dependencies |
| Is cache import read from a trusted location? | Main or protected cache refs are read-only where needed | Separate trusted and untrusted policy |
| Is cache export scoped? | PR, branch, or commit refs are deliberate | Avoid overwriting main cache from every PR |
| Are test results produced outside image build? | \`docker run\` or CI test step writes reports | Move suite out of Dockerfile |
| Can failures identify image inputs? | Labels, logs, or digest are captured | Add minimal evidence |

That checklist is intentionally practical. It helps QA engineers review changes that look like DevOps work but directly affect test reliability. The faster the pipeline becomes, the easier it is to miss that it stopped rebuilding the part that mattered.

## Frequently Asked Questions

### Should CI cache Docker layers for every test image?

No. Cache layers when the image has expensive, stable setup such as browsers, language dependencies, service clients, or load-test tools. For a tiny API test image that builds in seconds, external cache setup may add registry traffic and policy complexity without improving feedback. Measure a cold build, a warm build, and the time spent restoring or exporting cache. Keep caching where it reduces end-to-end pipeline time and still preserves clear invalidation behavior.

### How do I know a cached test image is not stale?

Tie cache validity to inputs and capture evidence. The Dockerfile should copy lockfiles before dependency installation, source late, and tool configs only where they affect the layer. CI should log the commit, lockfile hash, image tag or digest, and relevant tool versions. Then run small mutation checks: edit a spec file and dependency layers should cache, edit a lockfile and dependency layers should rebuild. If those expectations fail, fix the layer boundary before trusting timing improvements.

### Is it safe for pull requests from forks to write cache layers?

Usually not to the same cache consumed by protected branches. A cache can influence future builds, so untrusted code should not overwrite a trusted cache reference. A safer policy is allowing forked PRs to read from a protected main cache if your registry rules permit it, while disabling cache export or writing only to an isolated namespace. Protected branch builds can refresh the main cache after review. Match the policy to your CI threat model.

### Should tests run during docker build?

Avoid running the full suite during \`docker build\`. Cached layers can make it unclear whether tests executed for the current source, and test reports are harder to collect. Build the image, then run tests with \`docker run\` or your CI container runner, mounting an artifact directory for JUnit, traces, screenshots, or coverage. Small install verification commands inside the Dockerfile are fine when they prove a critical binary exists, but they should not replace test execution.
`,
};
