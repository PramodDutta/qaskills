import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "GoMock + mockgen Tutorial 2026: Generating & Using Mocks in Go",
  description: "Learn GoMock and mockgen in 2026: generate mocks from Go interfaces, wire up gomock.NewController, set EXPECT() calls, match args, and order calls in tests.",
  date: "2026-06-26",
  category: "Go",
  content: `**GoMock** is Go's interface-mocking framework, now maintained as \`go.uber.org/mock\` after Google archived the original \`github.com/golang/mock\`. Its \`mockgen\` tool reads a Go interface and generates a mock type that satisfies it. In a test you create a controller with \`gomock.NewController(t)\`, instantiate the generated \`NewMockYourInterface(ctrl)\`, script expectations with \`mock.EXPECT().Method(args).Return(...)\`, and inject the mock into the code under test. GoMock verifies arguments, call counts, and call order, then fails the test automatically if the contract is violated. This guide covers installing the tool, both generation modes, the \`//go:generate\` workflow, matchers, and ordering.

## Why GoMock instead of hand-written fakes

Go interfaces make dependency injection idiomatic: a function that needs a data store accepts an \`interface\` rather than a concrete \`*sql.DB\`, so a test can pass any type that satisfies it. You *can* hand-write a struct that implements the interface, but every method then needs a stub field, a way to vary its return value, and manual assertions that it was called correctly. That boilerplate grows with the interface.

\`mockgen\` generates all of it. The mock it produces verifies three things you would otherwise assert by hand:

| What GoMock checks | How you express it |
|---|---|
| Was the method called the right number of times? | \`.Times(n)\`, \`.MinTimes(n)\`, \`.MaxTimes(n)\`, \`.AnyTimes()\` |
| Was it called with the right arguments? | matchers: \`gomock.Eq(x)\`, \`gomock.Any()\`, \`gomock.Nil()\` |
| Were calls made in the right order? | \`gomock.InOrder(...)\`, \`.After(prev)\` |

When the controller's cleanup runs at the end of the test, any unmet expectation fails it. That turns interaction bugs — "the cache was never invalidated", "the API was called twice" — into ordinary test failures rather than silent passes. The test-double model mirrors Mockito on the JVM and mockall in Rust; the patterns in our [QASkills skills directory](/skills) carry across languages.

## Installing GoMock and mockgen

GoMock has two pieces: the runtime library you import in tests, and the \`mockgen\` binary that generates code. Since 2023 both live under \`go.uber.org/mock\`. Install the tool with \`go install\`:

\`\`\`bash
go install go.uber.org/mock/mockgen@latest
\`\`\`

That places a \`mockgen\` binary in \`$(go env GOPATH)/bin\`, so make sure that directory is on your \`PATH\`. Then add the runtime to your module — it is a normal dependency because the generated mocks import \`gomock\` at compile time:

\`\`\`bash
go get go.uber.org/mock/gomock
\`\`\`

If you are migrating from the archived \`github.com/golang/mock\`, the API is identical; you only change the import paths. The Uber fork is the actively maintained successor and the one to use for any new project in 2026.

## The interface you want to mock

Everything starts from an interface. Suppose a \`UserService\` depends on a \`UserRepository\` to load and save users:

\`\`\`go
package user

type User struct {
	ID   int
	Name string
}

type UserRepository interface {
	FindByID(id int) (*User, error)
	Save(u *User) error
}

type UserService struct {
	repo UserRepository
}

func NewUserService(repo UserRepository) *UserService {
	return &UserService{repo: repo}
}

func (s *UserService) Rename(id int, name string) error {
	u, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}
	u.Name = name
	return s.repo.Save(u)
}
\`\`\`

\`UserService\` accepts the interface, not a concrete database type. That single design choice is what makes the service testable: the test will inject a generated \`MockUserRepository\` instead of a real one.

## Generating a mock: source mode vs reflect mode

\`mockgen\` has two generation modes, and choosing the right one matters.

**Source mode** parses a specific \`.go\` file and generates mocks for the interfaces declared in it. Use it when the interface lives in your own package:

\`\`\`bash
mockgen -source=user/repository.go -destination=user/mock_repository.go -package=user
\`\`\`

**Reflect mode** takes an import path and a comma-separated list of interface names, then uses reflection on the compiled package to build the mock. Use it for interfaces in a third-party or standard-library package you cannot annotate:

\`\`\`bash
mockgen -destination=mocks/mock_io.go -package=mocks io Reader,Writer
\`\`\`

The two modes differ in what they can see:

| Aspect | Source mode | Reflect mode |
|---|---|---|
| Input | A \`.go\` file (\`-source\`) | Import path + interface names |
| Best for | Interfaces you own | Foreign / stdlib interfaces |
| Handles unexported deps | Yes (same package) | Via reflection |
| Speed | Fast (parses one file) | Compiles a helper program |
| Embedded interfaces | Resolved from source | Resolved from the type |

The key flags are the same for both: \`-source\` (source mode input), \`-destination\` (output file; defaults to stdout), and \`-package\` (the package name of the generated file). Source mode is the common case for application code because you control the interface; reach for reflect mode at the boundaries you import.

## Automating generation with go:generate

You do not want to remember and re-type that \`mockgen\` command. The idiomatic Go pattern is a \`//go:generate\` directive placed next to the interface, so a single \`go generate ./...\` regenerates every mock in the project. Add the comment to the file that declares the interface:

\`\`\`go
//go:generate mockgen -source=repository.go -destination=mock_repository.go -package=user
package user

type UserRepository interface {
	FindByID(id int) (*User, error)
	Save(u *User) error
}
\`\`\`

Now run, from the module root:

\`\`\`bash
go generate ./...
\`\`\`

\`go generate\` scans every package, finds each \`//go:generate\` line, and runs the command in that file's directory — which is why the paths above are relative to the package, not the repo root. Commit the generated \`mock_repository.go\` alongside the source so CI does not need \`mockgen\` to compile tests, and regenerate whenever the interface changes. Treating mocks as checked-in build artifacts keeps the workflow reproducible, the same principle behind the [API testing complete guide](/blog/api-testing-complete-guide).

## Writing your first test with the mock

With \`MockUserRepository\` generated, a test wires up a controller, scripts expectations, and injects the mock. The controller is the object that records expectations and verifies them.

\`\`\`go
package user

import (
	"testing"

	"go.uber.org/mock/gomock"
)

func TestRename(t *testing.T) {
	ctrl := gomock.NewController(t)
	repo := NewMockUserRepository(ctrl)

	existing := &User{ID: 7, Name: "Ada"}

	repo.EXPECT().
		FindByID(7).
		Return(existing, nil).
		Times(1)

	repo.EXPECT().
		Save(gomock.Any()).
		Return(nil).
		Times(1)

	svc := NewUserService(repo)
	if err := svc.Rename(7, "Grace"); err != nil {
		t.Fatalf("Rename returned error: %v", err)
	}

	if existing.Name != "Grace" {
		t.Errorf("name = %q, want Grace", existing.Name)
	}
}
\`\`\`

Read each expectation as a sentence: *expect \`FindByID\` to be called with \`7\`, return the existing user and no error, exactly once.* Note three things:

- \`gomock.NewController(t)\` ties the mock to the test. Since GoMock 1.5+ the controller registers \`ctrl.Finish()\` automatically via \`t.Cleanup\`, so you no longer write \`defer ctrl.Finish()\` yourself — verification runs when the test ends.
- \`NewMockUserRepository(ctrl)\` is the constructor \`mockgen\` generated; its name is always \`New\` + the mock type.
- \`EXPECT()\` returns a recorder whose method calls describe the expected interaction. \`FindByID(7)\` uses \`7\` directly — GoMock wraps a bare value in an implicit \`gomock.Eq\` matcher.

## Returning values, errors, and dynamic responses

\`.Return(...)\` supplies the values a mocked method hands back, one argument per return value. To simulate a failure, return a non-nil error exactly as the real implementation would:

\`\`\`go
repo.EXPECT().
	FindByID(999).
	Return(nil, errors.New("user not found"))
\`\`\`

When the return value must be *computed* from the arguments — or you need a side effect — use \`.DoAndReturn\`, which takes a function with the same signature as the mocked method:

\`\`\`go
repo.EXPECT().
	FindByID(gomock.Any()).
	DoAndReturn(func(id int) (*User, error) {
		return &User{ID: id, Name: "synthetic"}, nil
	})
\`\`\`

\`.Do\` is the side-effect-only sibling: it runs a function for its effect (capturing an argument, incrementing a counter) but still uses a separate \`.Return\` for the values. Prefer \`.Return\` for fixed results, \`.DoAndReturn\` when the response depends on the input.

\`\`\`go
var savedName string
repo.EXPECT().
	Save(gomock.Any()).
	Do(func(u *User) { savedName = u.Name }).
	Return(nil)
\`\`\`

## Matching arguments with matchers

A matcher decides *which* calls an expectation matches. Passing a raw value is shorthand for \`gomock.Eq\`; for anything looser, use an explicit matcher.

| Matcher | Matches when |
|---|---|
| \`gomock.Eq(x)\` | argument deep-equals \`x\` (the default for bare values) |
| \`gomock.Any()\` | any value at all |
| \`gomock.Nil()\` | the argument is nil |
| \`gomock.Not(m)\` | the inner matcher does *not* match |
| \`gomock.Len(n)\` | argument is a slice/map/string of length \`n\` |
| \`gomock.AssignableToTypeOf(v)\` | argument is assignable to \`v\`'s type |
| \`gomock.InAnyOrder(slice)\` | argument is a slice with the same elements, any order |
| \`gomock.Cond(func(x) bool)\` | the predicate returns \`true\` for the argument |

\`\`\`go
// One matcher per parameter.
repo.EXPECT().
	Save(gomock.AssignableToTypeOf(&User{})).
	Return(nil)

// Custom predicate via gomock.Cond (generic since GoMock 0.4).
repo.EXPECT().
	FindByID(gomock.Cond(func(id int) bool { return id > 0 })).
	Return(&User{}, nil)
\`\`\`

If your code calls a method with arguments no expectation matches, GoMock fails immediately with a message naming the unexpected call and listing the expectations it tried — surfacing the exact misuse instead of letting a wrong value flow downstream. Use \`gomock.Any()\` deliberately when you only care about the return, not the input.

## Setting call counts

Count expectations assert *interactions*, not just return values. By default an expectation must be called **exactly once**; change that with the cardinality methods.

\`\`\`go
repo.EXPECT().Save(gomock.Any()).Return(nil).Times(2)      // exactly twice
repo.EXPECT().FindByID(gomock.Any()).Return(nil, nil).AnyTimes() // zero or more
repo.EXPECT().Save(gomock.Any()).Return(nil).MinTimes(1)   // at least once
repo.EXPECT().Save(gomock.Any()).Return(nil).MaxTimes(3)   // at most three times
\`\`\`

When the controller verifies at test end, a \`.Times(2)\` expectation called once fails with \`missing call(s)\`. \`.AnyTimes()\` is how you allow optional calls (a logger you do not want to assert on) without an unmet-expectation failure. This cardinality check is what catches "you forgot to flush the buffer" and "you saved twice" classes of bug.

## Ordering calls with InOrder and After

Sometimes order is part of the contract: you must \`FindByID\` before \`Save\`, or \`Begin\` before \`Commit\`. GoMock enforces ordering two ways. \`gomock.InOrder\` is the readable option for a straight sequence:

\`\`\`go
func TestRenameOrder(t *testing.T) {
	ctrl := gomock.NewController(t)
	repo := NewMockUserRepository(ctrl)

	gomock.InOrder(
		repo.EXPECT().FindByID(7).Return(&User{ID: 7}, nil),
		repo.EXPECT().Save(gomock.Any()).Return(nil),
	)

	svc := NewUserService(repo)
	if err := svc.Rename(7, "Grace"); err != nil {
		t.Fatalf("Rename: %v", err)
	}
}
\`\`\`

If the service calls \`Save\` before \`FindByID\`, the test fails. For more complex graphs where one call must follow a specific earlier one (but others are unordered), capture the handle and use \`.After\`:

\`\`\`go
first := repo.EXPECT().FindByID(gomock.Any()).Return(&User{}, nil)
repo.EXPECT().Save(gomock.Any()).Return(nil).After(first)
\`\`\`

\`InOrder\` is sugar over chained \`.After\` calls. Constrain only the calls whose order is contractually important; leave the rest unordered so harmless refactors do not break the test.

## GoMock vs testify/mock vs counterfeiter

GoMock is not the only mocking option in Go. The practical split: pick GoMock or counterfeiter for code-generated mocks with strict checks, and testify/mock when you prefer hand-written mocks with a lighter API.

| Aspect | GoMock (\`go.uber.org/mock\`) | testify/mock | counterfeiter |
|---|---|---|---|
| Mock source | Generated by \`mockgen\` | Hand-written, embeds \`mock.Mock\` | Generated by \`counterfeiter\` |
| Argument matching | Matcher objects | \`mock.Anything\`, \`mock.MatchedBy\` | Plain Go assertions in the test |
| Call-count / order | Built in (\`Times\`, \`InOrder\`) | \`.Times(n)\`, no native ordering | Via call-count getters you assert |
| Style | Strict, expectation-first | Permissive, assert after the fact | Spy-style: record then verify |
| Maintenance in 2026 | Active (Uber fork) | Active | Active |
| Best when | You want enforced interaction contracts | Quick mocks, fewer generated files | You prefer spies over expectations |

**When to pick testify/mock:** you want to avoid a code-generation step and are comfortable writing the mock struct yourself, or your team already standardizes on testify for assertions and suites. Its \`On("Method", args).Return(...)\` API is permissive — unexpected calls do not fail unless you assert them.

**When to pick counterfeiter:** you prefer the spy model — let the fake record every call, then assert call counts and captured arguments *after* exercising the code, rather than declaring expectations up front. It reads naturally for tests that check "what happened" instead of "what should happen."

**Verdict:** in 2026 GoMock (\`go.uber.org/mock\`) is the most common choice for generated, strict interaction mocks, and the one to learn first for interface-heavy Go code. Use testify/mock for a lighter hand-written mock without generation, and counterfeiter when you favor spies over expectations. To weigh these against mocking in other ecosystems, browse the [QASkills comparison index](/compare).

## Best practices

- **Mock at interface boundaries, not everywhere.** Mock the collaborators a unit *talks to* (repository, HTTP client, clock) and let pure logic run for real. Over-mocking yields tests that pass even when the production code is wrong.
- **Commit generated mocks.** Check \`mock_*.go\` files into version control so CI compiles tests without installing \`mockgen\`, and regenerate with \`go generate ./...\` whenever an interface changes.
- **Use \`gomock.Any()\` for arguments you don't care about.** Assert exact values only where the contract matters; over-specifying every argument makes tests brittle to harmless refactors.
- **Don't write \`defer ctrl.Finish()\` on modern versions.** GoMock 1.5+ registers the cleanup automatically via \`t.Cleanup\`; the explicit call is only needed on older releases and is harmless but redundant now.
- **Keep one controller per test.** Create the controller inside the test (or subtest) so expectations are isolated and verified independently — sharing a controller across cases leaks expectations between them.

## Frequently Asked Questions

### What is the difference between GoMock and mockgen?

GoMock is the framework — the \`gomock\` runtime package you import in tests that provides the controller, matchers, and expectation API. \`mockgen\` is the separate command-line tool that reads a Go interface and generates the mock type that satisfies it. You run \`mockgen\` once to produce the mock code, then use the \`gomock\` library at test time to script and verify it. Both ship under \`go.uber.org/mock\`.

### Is github.com/golang/mock still maintained in 2026?

No. Google archived the original \`github.com/golang/mock\` repository in 2023, and development moved to the Uber-maintained fork at \`go.uber.org/mock\`. The API is identical, so migrating is mostly a find-and-replace of the import paths and reinstalling the tool with \`go install go.uber.org/mock/mockgen@latest\`. For any new project in 2026 you should use the Uber fork; the original receives no fixes.

### When should I use mockgen source mode vs reflect mode?

Use source mode (\`-source=file.go\`) when the interface lives in a package you own, because it parses your file directly and resolves same-package and unexported dependencies cleanly. Use reflect mode (passing an import path plus interface names) for interfaces in third-party or standard-library packages you cannot annotate, since it reflects on the compiled type. Source mode is faster and the common case for application code; reflect mode covers the boundaries you import.

### Do I still need defer ctrl.Finish() with GoMock?

On GoMock 1.5 and later, no. When you call \`gomock.NewController(t)\` the controller registers its own verification through \`t.Cleanup\`, so expectations are checked automatically when the test finishes. The explicit \`defer ctrl.Finish()\` is only required on older versions; calling it on a modern version is harmless but redundant. New code should simply rely on the automatic cleanup.

### How do I match arguments more loosely than exact equality?

Pass a matcher instead of a raw value. \`gomock.Any()\` matches anything, \`gomock.Nil()\` matches nil, \`gomock.Not(m)\` negates another matcher, \`gomock.AssignableToTypeOf(v)\` matches by type, and \`gomock.Cond(func(x) bool {...})\` matches when your predicate returns true. A bare value like \`FindByID(7)\` is implicitly wrapped in \`gomock.Eq\`, so use an explicit matcher whenever you want something looser than deep equality.

### How do I generate mocks for many interfaces automatically?

Add a \`//go:generate mockgen ...\` comment next to each interface declaration, then run \`go generate ./...\` from the module root. \`go generate\` walks every package, finds each directive, and runs the command in that file's directory, so paths in the directive are relative to the package. This regenerates the whole project's mocks in one command and keeps the \`mockgen\` invocation versioned alongside the interface it targets.
`,
};
