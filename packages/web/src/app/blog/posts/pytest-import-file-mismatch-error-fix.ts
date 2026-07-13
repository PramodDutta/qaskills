import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "pytest “Import File Mismatch” Error Fix",
  description:
    "Fix pytest import file mismatch errors by locating duplicate module names, clearing stale bytecode, and choosing a package layout or import mode that stays stable.",
  date: "2026-07-13",
  category: "Guide",
  content: `
# pytest “Import File Mismatch” Error Fix

pytest collected \`services/payments/tests/test_api.py\`, but Python had already registered a module named \`test_api\` from \`services/orders/tests/test_api.py\`. Both files are valid. Their import names collide. pytest refuses to execute the second file because assertions, fixtures, and tracebacks could otherwise come from a different path than the one shown in collection.

The error is a guardrail around \`sys.modules\`, not a claim that the test's assertions are malformed. Its diagnostic usually prints an imported module's \`__file__\` and the file pytest wanted to collect. Compare those paths first. They reveal whether the conflict is another source tree, a copied build directory, or stale bytecode that still claims the same module name.

## Decode the two paths in the failure

A typical message has this shape:

\`\`\`text
import file mismatch:
imported module 'test_api' has this __file__ attribute:
  /workspace/services/orders/tests/test_api.py
which is not the same as the test file we want to collect:
  /workspace/services/payments/tests/test_api.py
HINT: remove __pycache__ / .pyc files and/or use a unique basename for your test file modules
\`\`\`

The module name, here \`test_api\`, is the lookup key in \`sys.modules\`. Under pytest's default \`prepend\` import mode, a test file outside a package is imported as a top-level module after its directory is placed at the front of \`sys.path\`. Two standalone files named \`test_api.py\` therefore compete for one key.

If the paths look almost identical except for a checkout root, CI may be collecting both the working tree and an installed or copied tree. If the first path ends in a cache location or references a file that no longer exists, stale \`.pyc\` metadata is a likely suspect. If the paths are two intentional test folders, cache deletion may make the first run pass only until the collision occurs in the opposite order.

| Path relationship in the message | Likely cause | Durable response |
|---|---|---|
| Two live test files with same basename | Top-level import-name collision | Package the test trees, rename files, or adopt importlib mode |
| Source tree versus \`build/\` copy | Over-broad discovery | Exclude build artifacts and fix invocation root |
| Old path versus current renamed file | Stale bytecode or retained cache | Remove caches, then verify collection layout |
| Editable checkout versus installed package | Import path ambiguity | Use a src layout and intentional import mode |
| Same file reached through symlinked roots | Duplicate collection path | Collect through one canonical path |

Do not begin by deleting every environment directory. The two printed paths often point to a one-line structural fix. Cache cleanup is cheap, but it should confirm the diagnosis rather than conceal it.

## Reproduce the collision with Python's module registry

The following tree is enough to trigger the default-mode problem:

\`\`\`text
repo/
├── services/
│   ├── orders/tests/test_api.py
│   └── payments/tests/test_api.py
└── pyproject.toml
\`\`\`

Neither \`tests\` directory contains \`__init__.py\`. pytest treats both files as standalone modules named \`test_api\`. Once Python imports the first, \`sys.modules['test_api']\` points to that file. Importing the second under the same name would return or overwrite the wrong module, so pytest reports the mismatch.

You can see the names pytest intends to collect without running tests:

\`\`\`bash
python -m pytest --collect-only -q
python -m pytest --collect-only --import-mode=importlib -q
\`\`\`

The second command is a diagnostic as well as a candidate configuration. If importlib mode collects both files, duplicate standalone basenames were probably the issue. It does not prove that importlib mode is compatible with test-to-test helper imports, so run the full suite before committing the change.

## Fix intentional duplicate names with package identity

Adding \`__init__.py\` files makes pytest derive qualified module names by walking package boundaries. The order test becomes \`services.orders.tests.test_api\`; the payment test becomes \`services.payments.tests.test_api\`. They no longer collide.

\`\`\`text
repo/
├── services/
│   ├── __init__.py
│   ├── orders/
│   │   ├── __init__.py
│   │   └── tests/
│   │       ├── __init__.py
│   │       └── test_api.py
│   └── payments/
│       ├── __init__.py
│       └── tests/
│           ├── __init__.py
│           └── test_api.py
└── pyproject.toml
\`\`\`

Package markers change import semantics, so review imports that assumed the test directory was directly on \`sys.path\`. Prefer importing application code from its installable package. Shared fixtures belong in \`conftest.py\`; shared helper modules can live in a clearly named testing-support package rather than being imported through ambiguous sibling paths.

In namespace-package repositories, adding \`__init__.py\` at every level may conflict with the intended distribution layout. pytest has \`consider_namespace_packages\` configuration for namespace resolution, but it should be chosen with the packaging model, not toggled only until collection turns green.

## Choose importlib mode when tests should not alter sys.path

\`--import-mode=importlib\` asks pytest to import test modules using importlib facilities without prepending their directories to \`sys.path\`. pytest derives unique names from their location under the root directory, so standalone test files can share basenames.

Set it in \`pyproject.toml\` to make local and CI behavior consistent:

\`\`\`toml
[tool.pytest.ini_options]
addopts = ["--import-mode=importlib", "--strict-markers"]
testpaths = ["tests", "services"]
\`\`\`

The tradeoff is deliberate: test modules cannot casually import one another merely because their folders were inserted into \`sys.path\`. Utilities inside arbitrary test directories may also stop being importable. Move reusable test helpers into application-adjacent testing code or an installed support package, and keep fixtures in \`conftest.py\`, which pytest discovers specially.

| Import mode | sys.path behavior | Duplicate standalone names | Main reason to select it |
|---|---|---|---|
| \`prepend\` | Inserts each test directory at the beginning | Must be unique unless packaged | Historical default, compatible with legacy imports |
| \`append\` | Adds each test directory at the end | Must still be unique unless packaged | Prefer installed package over same-named local tree in some layouts |
| \`importlib\` | Does not modify sys.path for test import | Unique names derived by pytest | Cleaner isolation for new suites |

\`append\` is not a duplicate-name fix. It changes precedence, not the fact that two standalone \`test_api.py\` files use the same top-level module name.

The broader [pytest best practices guide](/blog/pytest-best-practices-2026) covers src layouts and installed-package testing. Those choices reduce import ambiguity beyond this one error.

## Remove stale bytecode without deleting source

Python writes bytecode beneath \`__pycache__\` with interpreter-specific names. pytest also maintains \`.pytest_cache\`, which stores selection and run metadata. The import mismatch hint mentions \`.pyc\` files because old artifacts can reference a module path after files are moved, renamed, or copied between workspaces.

List caches before removal if the failure is surprising:

\`\`\`bash
find . -type d -name __pycache__ -prune -print
find . -type f -name '*.py[co]' -print
find . -type d -name .pytest_cache -prune -print

# After reviewing the paths:
find . -type d -name __pycache__ -prune -exec rm -rf {} +
find . -type f \\( -name '*.pyc' -o -name '*.pyo' \\) -delete
rm -rf .pytest_cache
python -m pytest --collect-only -q
\`\`\`

These commands are intended from the repository root in a disposable development or CI workspace. Do not run broad \`find ... rm\` commands from an unknown directory. Also do not expect \`--cache-clear\` alone to remove Python's \`__pycache__\`; pytest's cache and interpreter bytecode are different stores.

If caches return and the mismatch returns, the tree still exposes duplicate names or duplicate roots. Fix collection rather than adding unconditional deletion to every test command. Clean CI should not depend on repeatedly erasing evidence of an ambiguous layout.

## Stop collecting copied and generated test trees

Packaging jobs sometimes copy the whole project, including tests, beneath \`build/lib\`, \`dist-expanded\`, or a temporary integration directory. Running \`pytest .\` then discovers original and copied tests. Naming every copied file differently is the wrong repair; pytest should not recurse into build output.

Configure discovery roots narrowly and ignore known artifacts:

\`\`\`toml
[tool.pytest.ini_options]
testpaths = ["tests", "services"]
norecursedirs = ["build", "dist", ".venv", "node_modules"]
\`\`\`

\`testpaths\` applies when no explicit paths are given. A CI command such as \`pytest . build/lib\` can still broaden collection, so inspect the actual invocation. Run \`pytest --collect-only -vv\` to see node IDs and rootdir selection.

Be wary of stale pytest configuration in a parent directory. pytest determines a rootdir and loads one configuration source according to its discovery rules. The header printed by \`pytest -vv\` includes rootdir and configfile, which can explain why expected ignores were not active.

## Use a src layout to distinguish package under test

Import mismatch often appears alongside a second ambiguity: whether tests import the checkout or an installed build. A src layout places importable application code under \`src/package_name\`, and tests run against an editable or regular installation in the environment. The repository root no longer accidentally exposes a same-named package just because the current directory is on \`sys.path\`.

\`\`\`text
repo/
├── pyproject.toml
├── src/
│   └── ledger/
│       ├── __init__.py
│       └── reconciliation.py
└── tests/
    ├── conftest.py
    ├── unit/test_reconciliation.py
    └── integration/test_reconciliation.py
\`\`\`

Duplicate test basenames still need packages or importlib mode under prepend mode. The src layout solves application-package shadowing, not every test-module collision. It does, however, make an editable-versus-installed path problem much easier to inspect.

Run \`python -c "import ledger; print(ledger.__file__)"\` in the same environment as pytest. If it prints an unexpected site-packages copy or another checkout, repair environment installation and \`PYTHONPATH\`. Do not insert ad hoc paths at the top of every test module.

## Diagnose plugin and conftest imports

\`conftest.py\` files are imported during collection and can participate in collisions. In non-package trees, two conftest files may be represented under a top-level name depending on location and mode. Plugins imported by \`pytest_plugins\` can also load application or test-support modules before test collection reaches them.

Use \`pytest --trace-config\` to list active plugins. Temporarily disable a suspected third-party plugin with \`-p no:name\` only as a diagnostic, using the actual registered plugin name. If the mismatch disappears, inspect what that plugin imports; do not permanently disable useful functionality without understanding the conflict.

A test named the same as an installed library can shadow that library under prepend mode. For example, \`test/json.py\` or a helper \`requests.py\` can hijack normal imports. The mismatch may be the first visible symptom, but renaming shadowing helpers prevents broader nondeterminism.

## Pick the repair that matches repository intent

Renaming \`orders/tests/test_api.py\` to \`test_orders_api.py\` is perfectly valid in a small repository. It creates globally unique names and descriptive failure output. In a large monorepo, enforcing unique basenames across hundreds of services is operationally awkward; package identity or importlib mode scales better.

Adding \`__init__.py\` is attractive when test directories are conceptually packages and relative imports are acceptable. Importlib mode is attractive when tests should be independent and helpers are already installed. Narrow discovery is mandatory when the second tree is not source at all. Cache cleanup is sufficient only when the conflicting path is genuinely obsolete.

After choosing, run collection in the oldest and newest supported Python versions if the project spans interpreters. Then run the full suite, because import-mode changes can reveal helper imports that collection alone did not execute. The [pytest official reference cheatsheet](/blog/pytest-official-reference-cheatsheet-2026) is useful for verifying related flags without mixing them into the structural fix.

## Prevent the mismatch from returning in CI

Make CI build from a clean checkout, install the package once, and invoke pytest from one documented root. Avoid copying repository tests under a discoverable directory before the test job. If a build artifact must contain tests, place it outside the collection tree or run jobs in separate workspaces.

Add a collection-only smoke command when the monorepo frequently adds services. It catches import collisions before expensive integration fixtures start. Do not count collected test number as a quality metric, but compare unexpected large changes because duplicate roots can double collection without always producing the same error.

Finally, keep test file naming and packaging policy in the contributor guide. Import mechanics are repository architecture. Leaving every contributor to rediscover them from a mismatch hint guarantees inconsistent repairs.

## Recheck container mounts and multi-checkout jobs

CI containers can make a clean repository look duplicated. A job may copy source into the image at one root and also bind-mount the checkout elsewhere, then set PYTHONPATH to both. A test imported from one root can be collected from the other. Print the Python search path, the pytest rootdir, and the two mismatch paths before changing package markers.

Matrix jobs sometimes reuse a workspace across Python versions or build stages. One stage produces a build library containing tests; a later stage invokes pytest against the entire directory and sees both trees. Use isolated job directories, narrow testpaths, and artifact only the distribution outputs actually needed downstream. Cleaning bytecode cannot fix a live copied test tree.

Multiple Git worktrees and monorepo orchestration can cause a similar problem when a parent command passes two checkout paths to one pytest process. Each checkout is valid independently, but identical module names share one interpreter registry. Run separate pytest processes and merge reports rather than collecting separate revisions together.

A temporary session-start hook can print the selected root path and enumerate Python's search path. Remove it after resolving the environment because local filesystem paths may be sensitive in shared CI logs and the output adds noise to every run. The point is to establish whether pytest inserted a test directory or whether the launcher supplied the duplicate root before pytest started.

When containers install the project, decide whether tests target the installed wheel or editable source. Build the wheel, create a fresh environment, install it, then copy or mount only the external test suite if installed-artifact verification is the goal. Mixing editable installation, repository root importability, and a wheel unpacked beneath the same discovery tree produces results that depend on path order rather than the artifact intended for certification.

After repairing the job, retain a concise collection diagnostic as an artifact only on failure. The pytest header, collection tree, Python version, and sanitized search path are usually enough. Capturing the entire environment can leak credentials and makes the relevant two-path conflict harder to find.

Reproduce the container command locally with the same working directory and mount layout. Running pytest from the repository root when CI starts under a parent workspace can select a different rootdir and configuration file, producing a false local pass.

## Frequently Asked Questions

### Will pytest --cache-clear remove the import mismatch?

It clears pytest's own cache at session start, but it does not generally remove Python bytecode directories. It may help a stale pytest cache symptom, yet live duplicate module names require a layout or import-mode fix.

### Is --import-mode=append a safe solution for duplicate test_api.py files?

No. Append changes where test directories enter \`sys.path\`, but standalone modules still need unique top-level names. Use packages, distinct basenames, or importlib mode.

### Does adding __init__.py change test discovery?

It can change the module's qualified import name and how imports resolve, which is exactly why it prevents collisions. pytest still discovers matching test files, but helper imports and package boundaries should be reviewed.

### Why does the error happen only when I run the full suite?

Either file runs alone because \`sys.modules\` contains only one \`test_api\`. During full collection, the first file claims that name and the second exposes the path mismatch. Collection order can decide which path appears as imported.

### Can I suppress the check and execute both files anyway?

That would make test identity unreliable and is not a sound repair. Give the modules distinct import identities or stop collecting the duplicate tree. The check protects against running code from a path other than the one reported.
`,
};
