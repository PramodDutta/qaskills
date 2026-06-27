import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Go httptest Tutorial: Testing HTTP Handlers & Servers (2026)",
  description: "Learn Go httptest in 2026 to test HTTP handlers and servers: use ResponseRecorder, NewRequest, httptest.Server, table-driven tests, and mock upstreams.",
  date: "2026-06-26",
  category: "Go",
  content: `Go's \`net/http/httptest\` package tests HTTP handlers and clients without binding a real network port. To test a handler, build a request with \`httptest.NewRequest\`, capture the response in a \`httptest.ResponseRecorder\`, call the handler directly, then assert on \`rec.Code\`, \`rec.Body\`, and \`rec.Header()\`. To test code that *calls* an HTTP service, spin up a real loopback server with \`httptest.NewServer\`, point your client at \`server.URL\`, and close it with \`defer server.Close()\`. Both paths run in-process, need no mocking framework, and ship in the standard library.

## Why httptest instead of a real server

You could start your application on \`:8080\` and fire \`curl\` at it, but that is slow, flaky, and hard to parallelize. \`httptest\` gives you two faster primitives.

The first, \`ResponseRecorder\`, skips the network entirely. An \`http.Handler\` is just a function with the signature \`ServeHTTP(http.ResponseWriter, *http.Request)\`. A \`ResponseRecorder\` *is* an \`http.ResponseWriter\` that records everything written to it into memory. So you call the handler as a plain function and inspect what it wrote — no sockets, no ports, no goroutines.

The second, \`httptest.Server\`, is a real HTTP server bound to \`127.0.0.1\` on a random free port. You use it when the code under test is an HTTP *client* and you need a controllable upstream to respond to it.

| Scenario | Tool | Network? |
|---|---|---|
| Test your own handler / mux | \`ResponseRecorder\` + \`NewRequest\` | No |
| Test code that calls an external API | \`httptest.Server\` | Loopback only |
| Need TLS for the upstream | \`httptest.NewTLSServer\` | Loopback TLS |
| Inspect what a handler wrote | \`rec.Result()\` / \`rec.Body\` | No |

Because everything runs in-process, these tests are deterministic and fast enough to run on every save. They slot into the same suites covered in the [QASkills skills directory](/skills) for Go testing.

## Testing a handler with ResponseRecorder

Here is the canonical pattern. Suppose you have a health-check handler:

\`\`\`go
package api

import (
	"fmt"
	"net/http"
)

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, \`{"status":"ok"}\`)
}
\`\`\`

The test builds a request, records the response, and asserts:

\`\`\`go
package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHealthHandler(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	HealthHandler(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}
	if body := strings.TrimSpace(rec.Body.String()); body != \`{"status":"ok"}\` {
		t.Errorf("body = %q", body)
	}
}
\`\`\`

Three things make this work:

- \`httptest.NewRequest(method, target, body)\` returns an \`*http.Request\` already wired for server-side use. Unlike \`http.NewRequest\`, it panics on error (acceptable in tests) and pre-fills \`RemoteAddr\`, so you never get a nil-pointer surprise.
- \`httptest.NewRecorder()\` returns a \`*ResponseRecorder\`. Its exported fields are \`Code\` (defaults to \`200\`), \`Body\` (a \`*bytes.Buffer\`), and \`HeaderMap\` (use the \`Header()\` method to read it).
- You invoke the handler as an ordinary function call. No router, no listener.

If your handler implements the \`http.Handler\` interface instead of being a bare function, call \`handler.ServeHTTP(rec, req)\` — identical idea.

## Reading the response: rec.Body vs rec.Result()

There are two ways to read what the handler produced, and the difference trips people up.

Access the recorder fields directly when you want the raw captured data:

\`\`\`go
rec.Code                 // int status code
rec.Body.String()        // full body as a string
rec.Header().Get("Etag") // a single response header
\`\`\`

Call \`rec.Result()\` when you want a real \`*http.Response\` — useful for exercising the same parsing code your production client uses, or reading cookies and trailers:

\`\`\`go
res := rec.Result()
defer res.Body.Close()

body, _ := io.ReadAll(res.Body)
cookies := res.Cookies()
\`\`\`

One gotcha: \`rec.Result().StatusCode\` reflects the explicit \`WriteHeader\` value, but the recorder's \`rec.Code\` field is set even if the handler never calls \`WriteHeader\` (it stays at the \`200\` default). Prefer \`rec.Result()\` when you specifically need to assert that a status was *written*, and \`rec.Code\` for the simpler "what did the client see" check.

## Table-driven handler tests

Table tests are the idiomatic Go way to cover many cases without duplication. Each row is a request plus its expected outcome, and a single loop drives them all. The pattern mirrors what we describe in the [Go testing with table-driven tests guide](/blog/go-table-driven-tests-guide).

\`\`\`go
func TestUserHandler(t *testing.T) {
	tests := []struct {
		name       string
		method     string
		target     string
		wantStatus int
		wantBody   string
	}{
		{"get existing", http.MethodGet, "/users/1", http.StatusOK, \`{"id":1}\`},
		{"get missing", http.MethodGet, "/users/999", http.StatusNotFound, "not found\\n"},
		{"wrong method", http.MethodDelete, "/users/1", http.StatusMethodNotAllowed, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			req := httptest.NewRequest(tt.method, tt.target, nil)
			rec := httptest.NewRecorder()

			UserHandler(rec, req)

			if rec.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", rec.Code, tt.wantStatus)
			}
			if tt.wantBody != "" && rec.Body.String() != tt.wantBody {
				t.Errorf("body = %q, want %q", rec.Body.String(), tt.wantBody)
			}
		})
	}
}
\`\`\`

\`t.Run\` gives each case its own subtest name, so a failure points straight at the failing row. Calling \`t.Parallel()\` inside the subtest lets independent cases run concurrently — safe here because each gets a fresh request and recorder with no shared state.

## Testing POST bodies and JSON

For a handler that decodes a JSON request body, pass an \`io.Reader\` as the third argument to \`NewRequest\`. \`strings.NewReader\` or \`bytes.NewBufferString\` both work:

\`\`\`go
func TestCreateUser(t *testing.T) {
	payload := \`{"name":"Ada","email":"ada@example.com"}\`
	req := httptest.NewRequest(http.MethodPost, "/users", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	CreateUserHandler(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body=%s", rec.Code, rec.Body.String())
	}

	var got struct {
		ID   int    \`json:"id"\`
		Name string \`json:"name"\`
	}
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if got.Name != "Ada" {
		t.Errorf("name = %q, want Ada", got.Name)
	}
}
\`\`\`

Decode the *response* straight out of \`rec.Body\` — it satisfies \`io.Reader\`, so \`json.NewDecoder(rec.Body)\` reads it without an intermediate string. Use \`t.Fatalf\` (not \`t.Errorf\`) for failures that make the rest of the test meaningless, like a non-201 status before you try to decode.

## Testing the full router

So far we have called handlers in isolation. To test routing — that \`GET /users/1\` reaches the right handler and path parameters parse correctly — pass the request through your actual \`*http.ServeMux\` or third-party router. Since Go 1.22 the standard library mux supports method-and-path patterns natively:

\`\`\`go
func TestRouting(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /users/{id}", UserHandler)
	mux.HandleFunc("POST /users", CreateUserHandler)

	req := httptest.NewRequest(http.MethodGet, "/users/42", nil)
	rec := httptest.NewRecorder()

	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("routing failed: status = %d", rec.Code)
	}
}
\`\`\`

\`mux.ServeHTTP(rec, req)\` runs the full matching logic, so inside \`UserHandler\` a call to \`r.PathValue("id")\` returns \`"42"\`. This is the closest you get to an integration test without opening a socket.

## Testing an HTTP client with httptest.Server

When the code under test makes outbound HTTP calls, flip the setup: start a fake upstream with \`httptest.NewServer\`. It returns a \`*httptest.Server\` whose \`URL\` field is the base address to hand your client.

\`\`\`go
func TestFetchUser(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != "/users/7" {
				http.Error(w, "unexpected path", http.StatusBadRequest)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprint(w, \`{"id":7,"name":"Grace"}\`)
		}))
	defer server.Close()

	client := NewAPIClient(server.URL) // inject the fake base URL
	user, err := client.FetchUser(context.Background(), 7)
	if err != nil {
		t.Fatalf("FetchUser: %v", err)
	}
	if user.Name != "Grace" {
		t.Errorf("name = %q, want Grace", user.Name)
	}
}
\`\`\`

The key design constraint: your client must accept its base URL (or an \`*http.Client\`) as a parameter so the test can inject \`server.URL\`. Hard-coding \`https://api.example.com\` inside the client makes it untestable this way. Always \`defer server.Close()\` to release the port and stop the goroutine. For TLS-only clients, swap in \`httptest.NewTLSServer\` and trust the server's self-signed cert via \`server.Client()\`, which returns an \`*http.Client\` pre-configured for that exact server. This complements the upstream-mocking patterns in our [API testing complete guide](/blog/api-testing-complete-guide).

## Asserting on the outbound request

A fake upstream can also *capture* what your client sent — headers, query string, body — and let you assert on it. Record the request inside the handler closure:

\`\`\`go
func TestClientSendsAuth(t *testing.T) {
	var gotAuth string
	var gotBody []byte

	server := httptest.NewServer(http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			gotAuth = r.Header.Get("Authorization")
			gotBody, _ = io.ReadAll(r.Body)
			w.WriteHeader(http.StatusAccepted)
		}))
	defer server.Close()

	client := NewAPIClient(server.URL)
	_ = client.CreateEvent(context.Background(), "deploy")

	if gotAuth != "Bearer test-token" {
		t.Errorf("Authorization = %q", gotAuth)
	}
	if !strings.Contains(string(gotBody), "deploy") {
		t.Errorf("body missing payload: %s", gotBody)
	}
}
\`\`\`

This verifies the *contract* from the client's side: the right header, the right method, the right payload. Combine it with the response assertion from the previous section and you have covered both directions of the exchange.

## ResponseRecorder vs httptest.Server: which to use

Both come from the same package, but they solve opposite problems. Picking the wrong one leads to slow tests or untestable code.

| Aspect | ResponseRecorder | httptest.Server |
|---|---|---|
| What it tests | Your \`http.Handler\` | Your HTTP *client* |
| Network | None (in-memory) | Real loopback TCP |
| Speed | Fastest (function call) | Fast, but binds a port |
| TLS support | N/A | Yes, via \`NewTLSServer\` |
| Cleanup needed | None | \`defer server.Close()\` |
| Captures request | The one you build | What your client actually sends |
| Concurrency-safe | Yes (fresh per test) | Server is, recorder access isn't shared |

**When to pick ResponseRecorder:** you are testing handlers, middleware, routing, or anything you can invoke as \`ServeHTTP\`. It is faster, has zero cleanup, and exposes the response as plain fields. This should be your default for server-side code.

**When to pick httptest.Server:** the unit under test reaches *out* over HTTP and you need a controllable, realistic upstream — to simulate 500s, timeouts, redirects, or specific JSON. It also exercises the real \`net/http\` transport (connection reuse, TLS handshake), which a recorder cannot.

**Verdict:** use \`ResponseRecorder\` for the code you own and \`httptest.Server\` for the boundaries you call. Most services need both — recorder tests for the handler layer, server tests for the outbound clients. Reach for \`httptest.Server\` only when a true loopback round-trip earns its small extra cost; otherwise the in-memory recorder keeps the suite fast. To weigh Go's built-in approach against other stacks, browse the [QASkills comparison index](/compare).

## Common pitfalls

- **Forgetting \`defer server.Close()\`.** Leaked test servers hold ports and goroutines, eventually exhausting file descriptors in large suites. Always defer the close immediately after \`NewServer\`.
- **Reading \`rec.Body\` after \`rec.Result()\` consumes it.** If you call \`rec.Result()\` and read its \`Body\`, that drains the buffer. Pick one access style per assertion.
- **Hard-coded base URLs.** A client that embeds its endpoint cannot be pointed at \`server.URL\`. Inject the base URL or the \`*http.Client\`.
- **Using \`http.NewRequest\` for server tests.** It works, but \`httptest.NewRequest\` sets \`RemoteAddr\` and skips error handling, avoiding nil panics when your handler reads \`r.RemoteAddr\`.
- **Asserting on \`rec.Code\` for "was a status written?"** The field defaults to \`200\`, so it cannot distinguish "wrote 200" from "wrote nothing." Use \`rec.Result().StatusCode\` when that distinction matters.

## Frequently Asked Questions

### What is the difference between httptest.NewRequest and http.NewRequest?

\`httptest.NewRequest\` is built for testing server handlers: it panics instead of returning an error, and it pre-populates fields like \`RemoteAddr\` so handlers that read them don't hit nil values. \`http.NewRequest\` is the general-purpose constructor used by real clients and returns an \`(*http.Request, error)\` pair. In handler tests, prefer \`httptest.NewRequest\`; for code that issues real outbound calls, use \`http.NewRequest\` or \`http.NewRequestWithContext\`.

### Do I need to start a server to test an http.Handler in Go?

No. An \`http.Handler\` is just an object with a \`ServeHTTP(ResponseWriter, *Request)\` method, so you can call it directly with a \`httptest.ResponseRecorder\` standing in for the \`ResponseWriter\`. This runs entirely in memory with no port, no listener, and no goroutine — it is the fastest and most common way to test handlers. You only need \`httptest.NewServer\` when the code under test is an HTTP client that must make a real round-trip.

### How do I read the response body from a ResponseRecorder?

The recorder exposes the body as \`rec.Body\`, a \`*bytes.Buffer\`, so \`rec.Body.String()\` gives you the text and \`rec.Body.Bytes()\` gives the raw bytes. You can also decode JSON straight from it with \`json.NewDecoder(rec.Body)\` since it satisfies \`io.Reader\`. If you need a full \`*http.Response\` (for cookies, trailers, or to reuse client parsing), call \`rec.Result()\` and read \`res.Body\` instead — but don't mix the two on the same recorder, as \`Result()\` can consume the buffer.

### How do I mock an external API that my Go code calls?

Start a \`httptest.NewServer\` with a handler that returns whatever the upstream would, then inject \`server.URL\` into your client as its base URL and \`defer server.Close()\`. Inside the handler you can branch on \`r.URL.Path\` or \`r.Method\` to serve different fixtures, simulate errors with \`http.Error\`, or capture the incoming request to assert on it. This requires your client to accept its base URL or \`*http.Client\` as a parameter rather than hard-coding the endpoint.

### Can httptest test TLS/HTTPS endpoints?

Yes. Use \`httptest.NewTLSServer\` instead of \`NewServer\`; it serves over HTTPS with a self-signed certificate on a loopback address. Because the cert is not in the system trust store, call \`server.Client()\` to get an \`*http.Client\` that already trusts it, or pass that client into your code under test. This lets you exercise TLS-only paths without managing real certificates.

### Should I test handlers in isolation or through the full router?

Do both at different layers. Call a single handler directly with a recorder to unit-test its logic — status codes, body shape, error branches — without router noise. Then add a few tests that pass requests through your real \`http.ServeMux\` (with \`mux.ServeHTTP\`) to confirm routing, method matching, and path parameters like \`r.PathValue("id")\` resolve correctly. The router tests catch wiring mistakes that isolated handler tests cannot see.
`,
};
