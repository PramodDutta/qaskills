TITLE: Pest PHP Testing Tutorial (2026): Expectations & Datasets
DESCRIPTION: Pest PHP testing tutorial for 2026 — install, it()/test() functions, the expectation API, datasets, hooks, and how Pest compares to PHPUnit, with runnable code.
DATE: 2026-06-15
CATEGORY: Testing
---
# Pest PHP Testing Tutorial (2026): Expectations, Datasets & vs PHPUnit

**Pest is a PHP testing framework built on top of PHPUnit that replaces class-based tests with a clean, function-based API.** Instead of writing test classes that extend `TestCase`, you write `test('it works', fn() => ...)` or `it('does something', ...)` and assert with a fluent expectation API: `expect($value)->toBe(5)`. Because Pest runs on the PHPUnit engine, every PHPUnit test still works, you keep PHPUnit's runner and tooling, and you can adopt Pest incrementally. This tutorial covers installation, the expectation API, datasets, hooks, and where Pest differs from PHPUnit, with runnable code throughout.

---

## Install

Pest installs via Composer and ships an initializer:

```bash
composer require pestphp/pest --dev --with-all-dependencies
./vendor/bin/pest --init
```

`--init` creates `tests/Pest.php` (global config/bindings), a `tests/Feature` and `tests/Unit` directory, and a `phpunit.xml`. Run the suite with:

```bash
./vendor/bin/pest
./vendor/bin/pest --filter=Cart      # filter by name
./vendor/bin/pest --parallel         # run across multiple processes
./vendor/bin/pest --coverage         # requires Xdebug or PCOV
```

For Laravel projects, install the plugin (`pestphp/pest-plugin-laravel`) to get Laravel-aware helpers like `actingAs`, `get`, `post`, and database assertions.

---

## Your first test

A Pest test file is just PHP with top-level `test()` or `it()` calls — no class, no boilerplate.

```php
<?php
// tests/Unit/CalculatorTest.php

test('adds two numbers', function () {
    expect(add(2, 3))->toBe(5);
});

it('returns zero for empty sum', function () {
    expect(add(0, 0))->toBe(0);
});
```

`it()` and `test()` are identical except that `it()` prepends "it" to the description, so `it('works')` reads as "it works" in the output. Use whichever reads better.

---

## The expectation API

The expectation API is Pest's signature feature: a fluent, chainable assertion syntax that is far more readable than `assertEquals($expected, $actual)`.

```php
expect(5)->toBe(5);                      // strict ===
expect('hi')->toEqual('hi');             // loose ==
expect($user)->toBeInstanceOf(User::class);
expect($list)->toHaveCount(3);
expect($list)->toContain('apple');
expect($name)->toStartWith('Ada');
expect($name)->toEndWith('lace');
expect($value)->toBeNull();
expect($flag)->toBeTrue();
expect($n)->toBeGreaterThan(0)->toBeLessThan(100); // chainable
expect($email)->toMatch('/@/');
expect(fn() => risky())->toThrow(RuntimeException::class);
```

### Negation, chaining, and `and()`

```php
expect($x)->not->toBeNull();             // negate with ->not
expect($user)
    ->name->toBe('Ada')                  // drill into properties
    ->email->toContain('@')
    ->and($user->age)->toBeGreaterThan(18); // switch subject with and()
```

The property-drilling (`->name->toBe(...)`) and `->and(...)` chaining let you assert many things about an object in one fluent statement — something PHPUnit cannot do as cleanly.

### Higher-order expectations on collections

```php
expect([1, 2, 3])->each->toBeInt();      // assert on every element
expect($users)->each(fn ($u) => $u->toBeInstanceOf(User::class));
```

### Custom expectations

Define reusable matchers in `tests/Pest.php` with `expect()->extend`:

```php
expect()->extend('toBeWithinRange', function (int $min, int $max) {
    expect($this->value)->toBeGreaterThanOrEqual($min)
                        ->toBeLessThanOrEqual($max);
    return $this;
});

// usage
expect($score)->toBeWithinRange(0, 100);
```

---

## Datasets (parameterized tests)

Datasets are Pest's equivalent of PHPUnit data providers, and they are dramatically terser. Attach a `with()` to feed multiple inputs; the test runs once per row and names each case.

```php
it('squares a number', function (int $input, int $expected) {
    expect($input ** 2)->toBe($expected);
})->with([
    [2, 4],
    [3, 9],
    [10, 100],
]);
```

Named datasets make failures self-describing:

```php
it('validates emails', function (string $email, bool $valid) {
    expect(isValidEmail($email))->toBe($valid);
})->with([
    'plain'        => ['ada@example.com', true],
    'missing at'   => ['ada.example.com', false],
    'empty string' => ['', false],
]);
```

For reuse across files, register a **shared dataset** in `tests/Pest.php`:

```php
dataset('emails', [
    'ada@example.com',
    'grace@example.org',
]);

// in any test file:
it('accepts valid emails', function (string $email) {
    expect(isValidEmail($email))->toBeTrue();
})->with('emails');
```

You can even combine datasets — passing two `with()` calls produces the **cross product** of the inputs, useful for matrix testing.

---

## Hooks: `beforeEach`, `afterEach`, `beforeAll`, `afterAll`

Pest provides lifecycle hooks as plain functions at the top of a file. They apply to all tests in that file (or globally if placed in `tests/Pest.php`).

```php
beforeEach(function () {
    $this->cart = new Cart();   // $this is the underlying TestCase instance
});

afterEach(function () {
    // teardown after each test
});

beforeAll(function () {
    // once before the file's tests (static context)
});

afterAll(function () {
    // once after the file's tests
});

it('starts empty', function () {
    expect($this->cart->count())->toBe(0);
});
```

Inside a closure, `$this` is bound to the PHPUnit `TestCase`, so properties set in `beforeEach` are available in each test — and reset before the next one, keeping tests isolated.

### Scoping to a directory

`tests/Pest.php` controls which base `TestCase` and traits apply to which folders via `uses()`:

```php
// tests/Pest.php
uses(Tests\TestCase::class)->in('Feature');           // Laravel base TestCase for Feature/
uses(Illuminate\Foundation\Testing\RefreshDatabase::class)->in('Feature');
```

---

## A realistic end-to-end example

Testing a service with setup, datasets, and exception expectations:

```php
<?php
// tests/Unit/PriceCalculatorTest.php

beforeEach(function () {
    $this->calc = new PriceCalculator(taxRate: 0.10);
});

it('applies tax to a subtotal', function () {
    expect($this->calc->withTax(100.0))->toBe(110.0);
});

it('applies a discount before tax', function (float $subtotal, float $discount, float $expected) {
    expect($this->calc->total($subtotal, $discount))->toBe($expected);
})->with([
    'no discount'  => [100.0, 0.0, 110.0],
    '10% off'      => [100.0, 0.10, 99.0],
    'full comp'    => [100.0, 1.0, 0.0],
]);

it('rejects a negative subtotal', function () {
    expect(fn () => $this->calc->total(-1.0, 0.0))
        ->toThrow(InvalidArgumentException::class);
});
```

## Skipping, grouping, and todos

Pest attaches metadata by chaining methods onto a test. These control selection and conditional execution without commenting tests out:

```php
it('charges a real card', function () {
    // ...
})->skip('flaky in CI');

it('works on PHP 8.3+', function () {
    // ...
})->skipOnPhp('<8.3');

it('runs only in the smoke group', function () {
    // ...
})->group('smoke');

it('handles refunds')->todo();          // a placeholder you intend to write
```

Then filter at run time:

```bash
./vendor/bin/pest --group=smoke
./vendor/bin/pest --todos              # list everything still marked todo
```

`->todo()` registers an intentionally pending test so the work is tracked in the suite itself rather than in a separate backlog.

## Architecture testing with `arch()`

A genuinely distinctive Pest feature is architecture testing: assertions about your *codebase structure*, not its runtime behavior. These catch layering violations and forgotten `dd()`/`var_dump()` calls before review.

```php
arch('controllers do not depend on models directly')
    ->expect('App\Http\Controllers')
    ->not->toUse('App\Models');

arch('no debugging leftovers')
    ->expect(['dd', 'dump', 'var_dump', 'ray'])
    ->not->toBeUsed();

arch('value objects are immutable')
    ->expect('App\ValueObjects')
    ->toBeFinal();
```

Pest also ships preset rules (`arch()->preset()->php()`, `->security()`, `->laravel()`) that bundle common conventions. Architecture tests run as part of the normal suite, so a structural regression fails CI like any other test.

## Mocking and the `test()` higher-order API

Pest does not bundle its own mocking engine; it leans on Mockery (commonly already present in Laravel) or PHPUnit's `createMock`. A Mockery example inside a Pest test:

```php
it('sends a notification on signup', function () {
    $mailer = Mockery::mock(Mailer::class);
    $mailer->shouldReceive('send')->once()->with('ada@x.io');

    (new SignupService($mailer))->register('ada@x.io');
});
```

Because `$this` is the underlying `TestCase`, anything you could do in a PHPUnit method — partial mocks, spies, expectations — works inside a Pest closure unchanged.

For broader PHP testing strategy and where Pest fits among other tools, see the [QA skills directory](/skills), tutorials on the [blog](/blog), and head-to-head breakdowns on the [comparison hub](/compare).

---

## Pest vs PHPUnit

Pest is not a competitor that replaces PHPUnit — it **runs on** PHPUnit. The difference is the authoring experience.

| Aspect | Pest | PHPUnit |
|---|---|---|
| Test definition | `test()` / `it()` functions | Classes extending `TestCase` |
| Assertions | Fluent `expect()->toBe()` | `assertEquals()`, `assertTrue()` |
| Parameterization | `->with([...])` datasets | `@dataProvider` / `#[DataProvider]` |
| Boilerplate | Minimal (no class) | Class + method per test |
| Engine | PHPUnit (under the hood) | PHPUnit |
| Parallel runs | `--parallel` built in | via paratest plugin |
| Existing PHPUnit tests | Run unchanged alongside Pest | n/a |
| Plugins | Laravel, Livewire, snapshots, arch, etc. | Large ecosystem |

**When to pick Pest:** new projects, Laravel apps, and teams who value readable, low-boilerplate tests and the expectation API. Its architecture-testing plugin (`arch()` presets that assert dependency rules) and parallel runner are genuine extras.

**When to stick with PHPUnit directly:** large legacy suites already invested in class-based tests and custom `TestCase` hierarchies, or environments with strict approval lists where adding a wrapper is not worth it. Even then you can adopt Pest incrementally, since both run together.

A small Pest niceness: a bare `expect()` with no assertion (or an empty test) is flagged as "risky/incomplete," nudging you to actually assert something.

---

## CI usage (GitHub Actions)

```yaml
name: php-tests
on: [push, pull_request]
jobs:
  pest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          coverage: pcov
      - run: composer install --prefer-dist --no-progress
      - run: ./vendor/bin/pest --parallel --coverage --min=80
```

`--min=80` fails the build if line coverage drops below 80% (requires a coverage driver like PCOV or Xdebug).

---

## Common errors and troubleshooting

- **`$this` is null inside a test closure** — you defined state in a hook that did not run for this file, or you are in `beforeAll` (static context). Set per-test state in `beforeEach`.
- **`--coverage` reports nothing / errors** — no coverage driver installed. Install PCOV or Xdebug and ensure it is enabled in PHP CLI.
- **Laravel helpers undefined (`actingAs`, `get`)** — install `pestphp/pest-plugin-laravel` and make sure `uses(Tests\TestCase::class)->in('Feature')` is set in `tests/Pest.php`.
- **Dataset test "passes" with no assertions** — your closure parameters do not match the dataset arity; Pest may run but assert nothing. Match parameter count to the dataset columns.
- **`expect(...)->toBe()` fails on equal-looking values** — `toBe` is strict (`===`); a string `"5"` is not `int 5`. Use `toEqual` for loose comparison or fix the type.
- **Existing PHPUnit tests not discovered** — check `phpunit.xml` `<testsuites>` includes the directory; Pest honors PHPUnit configuration.

---

## Frequently Asked Questions

### Is Pest a replacement for PHPUnit?

Not exactly — Pest is built on top of PHPUnit and uses its engine. It replaces the *authoring style* (function-based tests and a fluent expectation API) but keeps PHPUnit's runner, configuration, and compatibility. Your existing PHPUnit class-based tests run unchanged alongside Pest tests, so adoption can be incremental.

### What is the difference between `it()` and `test()` in Pest?

They are functionally identical ways to declare a test. The only difference is wording: `it('adds numbers')` is displayed as "it adds numbers," which reads naturally for behavior descriptions, while `test('adds numbers')` shows the description as-is. Choose whichever makes the output read better for a given test.

### How do datasets work in Pest?

Attach `->with([...])` to a test and the closure runs once per row, receiving each row's values as arguments. Rows can be keyed to give each case a readable name in the output. You can register shared datasets in `tests/Pest.php` with `dataset()`, reuse them by name, and combine two datasets to produce a cross product for matrix testing.

### What is the expectation API and why use it?

It is Pest's fluent assertion syntax — `expect($value)->toBe(5)->and(...)` — which reads left-to-right and chains multiple checks on one subject, including drilling into object properties. It is generally more readable than PHPUnit's `assertEquals($expected, $actual)` and supports negation with `->not` and custom matchers via `expect()->extend`.

### Can I run Pest tests in parallel?

Yes. Pest has built-in parallel execution via the `--parallel` flag, which distributes test files across multiple processes for faster runs. Combine it with `--coverage --min=80` in CI to enforce a coverage threshold. Parallel mode requires that your tests are isolated and do not depend on shared mutable global state.

### Does Pest work with Laravel?

Yes, very well. Install `pestphp/pest-plugin-laravel` to get Laravel-specific helpers like `actingAs()`, `get()`, `post()`, and database assertions, and wire your `Tests\TestCase` base class and traits (such as `RefreshDatabase`) to directories via `uses()` in `tests/Pest.php`. Many new Laravel applications default to Pest for their test suite.
