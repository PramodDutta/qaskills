import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Error Handling Testing — Patterns, Edge Cases, and Resilience',
  description:
    'Complete guide to testing error handling. Covers error boundaries, API error responses, retry logic, graceful degradation, and automated error scenario testing.',
  date: '2026-02-23',
  category: 'Guide',
  content: `
Your application works perfectly -- until it does not. A network request fails, a third-party API returns an unexpected payload, a database connection drops mid-transaction, or a user submits a form with data your validation never anticipated. What happens next defines the difference between a product users trust and one they abandon. Error handling testing is the practice of systematically verifying that your application responds correctly when things go wrong. It goes far beyond checking that errors "don't crash the app." Proper error handling testing validates that error messages are helpful, fallback behaviors activate correctly, retry mechanisms respect backoff limits, and users always have a path forward. Yet error handling remains the most under-tested area in most codebases. Teams write dozens of happy-path tests and skip the failure scenarios entirely. This guide gives you the patterns, code examples, and automation strategies to close that gap.

## Key Takeaways

- **Error handling is the most under-tested area** in most applications -- happy-path tests account for 80%+ of test suites while error scenarios are left to manual QA or discovered in production
- **Every API status code deserves a dedicated test** -- 400, 401, 403, 404, 409, 422, 429, and 500 responses each require distinct handling on the client and server
- **React error boundary testing** requires simulating component-level throws and verifying that fallback UI renders correctly with proper recovery options
- **Retry logic must be tested with precise timing assertions** -- verify exponential backoff intervals, maximum retry counts, and circuit breaker thresholds
- **Graceful degradation testing** ensures your app remains usable when dependencies fail, using cached data, feature flags, and offline-first patterns
- **AI coding agents** can automate error scenario generation, catching edge cases that manual testing routinely misses

---

## Why Error Handling Testing Matters

Most bugs that reach production are not logic errors in the happy path. They are **error handling failures** -- situations where the application encountered an unexpected condition and responded poorly. A null pointer because an API returned an empty array instead of an object. A white screen because a component threw during render and no error boundary caught it. An infinite retry loop that hammered a struggling service into full collapse.

**Happy-path testing is necessary but insufficient.** If your test suite only covers the success scenarios, you are testing the 20% of code paths that are least likely to cause production incidents. The other 80% -- the error handlers, fallback logic, timeout management, and edge case validation -- is where the real risk lives.

The consequences of untested error handling are severe. **Users lose trust** when they encounter cryptic error messages, blank screens, or frozen interfaces. **Revenue drops** when checkout flows fail silently and users cannot complete purchases. **Security vulnerabilities emerge** when error messages leak stack traces, database schemas, or internal service names. **Cascading failures** occur when one service's error handling inadequacy overwhelms downstream dependencies.

Error handling testing gives you confidence that your application degrades gracefully under all conditions. It verifies that users always see helpful messages, that retry logic respects limits, that fallback behaviors activate when primary paths fail, and that errors are properly logged for debugging without exposing sensitive information to end users.

The return on investment is extraordinary. A single error handling test that catches a missing null check can prevent a production outage that affects thousands of users. A retry logic test that catches a missing maximum limit can prevent a cascading failure that takes down an entire microservices cluster.

---

## Types of Errors to Test

Before writing error handling tests, you need a comprehensive catalog of the error types your application can encounter. Each error type requires a different testing strategy, different assertions, and different tooling.

| Error Type | Example | Testing Strategy | Priority |
|---|---|---|---|
| **Network errors** | Connection refused, DNS failure, socket timeout | Network interception (Playwright, MSW) | Critical |
| **Validation errors** | Invalid email, missing required fields, out-of-range values | Boundary value analysis, invalid input injection | High |
| **Authentication errors** | Expired token, invalid credentials, missing auth header | Token manipulation, session expiry simulation | Critical |
| **Authorization errors** | Insufficient permissions, role-based access denial | Cross-role testing, privilege escalation attempts | Critical |
| **Timeout errors** | Request exceeding deadline, long-running query | Delayed response mocking, deadline configuration | High |
| **Rate limit errors** | 429 Too Many Requests, throttled API calls | Rapid-fire request simulation, header inspection | Medium |
| **Server errors** | 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable | Server error mocking, health check validation | Critical |
| **Data corruption** | Malformed JSON, unexpected schema, truncated response | Invalid payload injection, schema mismatch testing | High |
| **Third-party failures** | Payment gateway down, email service timeout, CDN outage | Dependency mocking, circuit breaker validation | High |

Each category demands dedicated test cases. A comprehensive error handling test suite covers all nine categories with multiple scenarios per category. The priority column helps you decide where to invest testing effort first -- start with the critical categories that cause the most user-visible failures.

---

## Testing API Error Responses

API error responses are the foundation of error handling testing. Every HTTP status code your API can return should have at least one dedicated test verifying the response structure, status code, headers, and error message content.

### Status Code Validation

Your API tests should cover every error status code your endpoints can return. Here is a comprehensive test suite pattern using a testing framework like Vitest:

\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { app } from '../app';
import request from 'supertest';

describe('API Error Responses', () => {
  it('returns 400 for malformed request body', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: 'VALIDATION_ERROR',
      message: expect.any(String),
      details: expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
      ]),
    });
  });

  it('returns 401 for missing authentication', async () => {
    const response = await request(app)
      .get('/api/protected/resource');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('UNAUTHORIZED');
    expect(response.headers['www-authenticate']).toBeDefined();
  });

  it('returns 403 for insufficient permissions', async () => {
    const response = await request(app)
      .delete('/api/admin/users/123')
      .set('Authorization', 'Bearer viewer-token');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('FORBIDDEN');
    expect(response.body.message).not.toContain('stack');
  });

  it('returns 404 for non-existent resource', async () => {
    const response = await request(app)
      .get('/api/users/non-existent-id');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('NOT_FOUND');
  });

  it('returns 409 for duplicate resource creation', async () => {
    await request(app)
      .post('/api/users')
      .send({ email: 'existing@example.com', name: 'Test' });

    const response = await request(app)
      .post('/api/users')
      .send({ email: 'existing@example.com', name: 'Test' });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('CONFLICT');
  });

  it('returns 422 for semantically invalid data', async () => {
    const response = await request(app)
      .post('/api/orders')
      .send({ quantity: -5, productId: 'valid-id' });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('UNPROCESSABLE_ENTITY');
  });

  it('returns 429 when rate limit is exceeded', async () => {
    const requests = Array.from({ length: 101 }, () =>
      request(app).get('/api/public/data')
    );
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter((r) => r.status === 429);

    expect(rateLimited.length).toBeGreaterThan(0);
    expect(rateLimited[0].headers['retry-after']).toBeDefined();
  });

  it('returns 500 with safe error message', async () => {
    // Trigger an internal error via a known edge case
    const response = await request(app)
      .post('/api/process')
      .send({ trigger: 'internal-error-test' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('INTERNAL_ERROR');
    expect(response.body.message).not.toContain('Error:');
    expect(response.body.message).not.toContain('/src/');
    expect(response.body).not.toHaveProperty('stack');
  });
});
\`\`\`

### Error Response Schema Consistency

Every error response from your API should follow a consistent schema. This is critical for frontend error handling -- your UI code should be able to rely on a predictable error structure regardless of which endpoint returned the error.

\`\`\`typescript
describe('Error Response Schema', () => {
  const errorEndpoints = [
    { method: 'GET', path: '/api/users/invalid' },
    { method: 'POST', path: '/api/users', body: {} },
    { method: 'DELETE', path: '/api/users/non-existent' },
  ];

  errorEndpoints.forEach(({ method, path, body }) => {
    it(\`\${method} \${path} returns consistent error schema\`, async () => {
      const req = request(app)[method.toLowerCase()](path);
      if (body) req.send(body);

      const response = await req;

      // Every error response must have these fields
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.error).toBe('string');
      expect(typeof response.body.message).toBe('string');

      // Must never leak internal details
      expect(JSON.stringify(response.body)).not.toMatch(
        /node_modules|\.ts|\.js|at Object\.|stack/i
      );
    });
  });
});
\`\`\`

The key principle is that **error messages should be helpful to users without revealing implementation details**. A message like "User not found" is helpful. A message like "Error: Cannot read properties of null (reading 'id') at UserService.findById (src/services/user.ts:42)" is a security vulnerability.

---

## React Error Boundary Testing

React error boundaries are your last line of defense against unhandled component errors. When a component throws during rendering, the nearest error boundary catches the error and renders a fallback UI instead of a white screen. Testing error boundaries requires a specific approach because you need to simulate component-level throws in a controlled way.

### Testing an ErrorBoundary Component

\`\`\`typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

// Component that throws on demand
function BrokenComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Component render failed');
  }
  return <div>Working content</div>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error for expected throws
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary fallback={<div>Error occurred</div>}>
        <BrokenComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Working content')).toBeInTheDocument();
    expect(screen.queryByText('Error occurred')).not.toBeInTheDocument();
  });

  it('renders fallback UI when child component throws', () => {
    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByText('Working content')).not.toBeInTheDocument();
  });

  it('calls onError callback with error details', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary
        fallback={<div>Error</div>}
        onError={onError}
      >
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Component render failed' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('supports error recovery via retry button', async () => {
    let throwCount = 0;

    function FlakeyComponent() {
      throwCount++;
      if (throwCount <= 1) {
        throw new Error('Temporary failure');
      }
      return <div>Recovered content</div>;
    }

    render(
      <ErrorBoundary
        fallback={
          <div>
            <p>Something went wrong</p>
            <button onClick={() => {}}>Try Again</button>
          </div>
        }
      >
        <FlakeyComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Try Again'));

    expect(screen.getByText('Recovered content')).toBeInTheDocument();
  });
});
\`\`\`

### Key Error Boundary Testing Patterns

**Nested error boundaries.** Test that errors bubble up to the nearest boundary, not the root boundary. If a sidebar component throws, the main content area should remain functional.

**Async error handling.** Error boundaries do not catch errors in async code (event handlers, setTimeout, promises). Test that your async error handling uses separate mechanisms like try/catch in event handlers and \`.catch()\` on promises.

**Error boundary reset.** Test that navigating away from a broken route and returning resets the error boundary state, allowing the component to attempt rendering again.

---

## Testing Retry Logic

Retry logic is deceptively difficult to implement correctly and even harder to test. A retry mechanism that works perfectly in unit tests can cause cascading failures in production if the backoff timing, maximum retry count, or circuit breaker threshold is wrong.

### Testing Exponential Backoff

\`\`\`typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryWithBackoff } from './retry';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries with exponential backoff timing', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Attempt 1'))
      .mockRejectedValueOnce(new Error('Attempt 2'))
      .mockResolvedValueOnce('success');

    const promise = retryWithBackoff(operation, {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
    });

    // First attempt -- immediate
    await vi.advanceTimersByTimeAsync(0);
    expect(operation).toHaveBeenCalledTimes(1);

    // Second attempt -- after 1000ms (baseDelay * 2^0)
    await vi.advanceTimersByTimeAsync(1000);
    expect(operation).toHaveBeenCalledTimes(2);

    // Third attempt -- after 2000ms (baseDelay * 2^1)
    await vi.advanceTimersByTimeAsync(2000);
    expect(operation).toHaveBeenCalledTimes(3);

    const result = await promise;
    expect(result).toBe('success');
  });

  it('respects maximum retry limit', async () => {
    const operation = vi.fn()
      .mockRejectedValue(new Error('Always fails'));

    const promise = retryWithBackoff(operation, {
      maxRetries: 3,
      baseDelay: 100,
    });

    // Advance through all retry delays
    for (let i = 0; i < 10; i++) {
      await vi.advanceTimersByTimeAsync(10000);
    }

    await expect(promise).rejects.toThrow('Always fails');
    expect(operation).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });

  it('caps delay at maxDelay', async () => {
    const delays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;

    vi.spyOn(globalThis, 'setTimeout').mockImplementation(
      (fn: Function, delay?: number) => {
        if (delay && delay > 0) delays.push(delay);
        return originalSetTimeout(fn, delay);
      }
    );

    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok');

    const promise = retryWithBackoff(operation, {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 5000,
    });

    for (let i = 0; i < 10; i++) {
      await vi.advanceTimersByTimeAsync(10000);
    }

    await promise;

    // No delay should exceed maxDelay
    delays.forEach((delay) => {
      expect(delay).toBeLessThanOrEqual(5000);
    });
  });

  it('does not retry non-retryable errors', async () => {
    const operation = vi.fn()
      .mockRejectedValue(new Error('VALIDATION_ERROR'));

    const promise = retryWithBackoff(operation, {
      maxRetries: 3,
      baseDelay: 100,
      isRetryable: (error) => !error.message.includes('VALIDATION'),
    });

    await vi.advanceTimersByTimeAsync(0);

    await expect(promise).rejects.toThrow('VALIDATION_ERROR');
    expect(operation).toHaveBeenCalledTimes(1); // No retries
  });
});
\`\`\`

### Circuit Breaker Testing

A **circuit breaker** prevents your application from repeatedly calling a failing service. It tracks failure counts and "opens" the circuit after a threshold, returning errors immediately without making the call. After a cooldown period, it enters a "half-open" state and allows one test request through.

\`\`\`typescript
describe('CircuitBreaker', () => {
  it('opens after failure threshold', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      cooldownMs: 5000,
    });

    const failingCall = () => Promise.reject(new Error('Service down'));

    // Trigger failures up to threshold
    for (let i = 0; i < 3; i++) {
      await expect(breaker.call(failingCall)).rejects.toThrow();
    }

    // Circuit is now open -- calls fail immediately
    await expect(breaker.call(failingCall)).rejects.toThrow(
      'Circuit breaker is open'
    );
    expect(breaker.state).toBe('open');
  });

  it('transitions to half-open after cooldown', async () => {
    vi.useFakeTimers();
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      cooldownMs: 5000,
    });

    const failingCall = () => Promise.reject(new Error('down'));
    await expect(breaker.call(failingCall)).rejects.toThrow();
    await expect(breaker.call(failingCall)).rejects.toThrow();

    expect(breaker.state).toBe('open');

    await vi.advanceTimersByTimeAsync(5001);

    expect(breaker.state).toBe('half-open');
    vi.useRealTimers();
  });

  it('closes circuit on successful half-open request', async () => {
    vi.useFakeTimers();
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      cooldownMs: 1000,
    });

    // Open the circuit
    const fail = () => Promise.reject(new Error('down'));
    await expect(breaker.call(fail)).rejects.toThrow();
    await expect(breaker.call(fail)).rejects.toThrow();

    // Wait for half-open
    await vi.advanceTimersByTimeAsync(1001);

    // Successful call closes the circuit
    const succeed = () => Promise.resolve('ok');
    const result = await breaker.call(succeed);

    expect(result).toBe('ok');
    expect(breaker.state).toBe('closed');
    vi.useRealTimers();
  });
});
\`\`\`

Testing retry logic thoroughly prevents one of the most dangerous production failures -- a retry storm where every client simultaneously retries against a struggling service, turning a partial outage into a total collapse.

---

## Graceful Degradation Testing

Graceful degradation means your application continues to provide value even when some of its dependencies are unavailable. Testing graceful degradation verifies that fallback behaviors activate correctly and that users receive a functional, if reduced, experience.

### Testing Fallback Behavior

\`\`\`typescript
describe('Product Catalog with Degradation', () => {
  it('serves cached data when API is unavailable', async () => {
    // Pre-populate cache
    await cache.set('products:featured', [
      { id: '1', name: 'Cached Product', price: 29.99 },
    ]);

    // Mock API failure
    vi.spyOn(apiClient, 'get').mockRejectedValue(
      new Error('Service unavailable')
    );

    const result = await productService.getFeatured();

    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toBe('Cached Product');
    expect(result.source).toBe('cache');
    expect(result.stale).toBe(true);
  });

  it('shows degraded UI indicator when using cached data', async () => {
    vi.spyOn(productService, 'getFeatured').mockResolvedValue({
      products: [{ id: '1', name: 'Product', price: 9.99 }],
      source: 'cache',
      stale: true,
    });

    render(<ProductCatalog />);

    await waitFor(() => {
      expect(screen.getByText('Product')).toBeInTheDocument();
      expect(
        screen.getByText('Showing cached results')
      ).toBeInTheDocument();
    });
  });

  it('recovers automatically when service comes back online', async () => {
    const apiGet = vi.spyOn(apiClient, 'get')
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce({
        data: [{ id: '2', name: 'Fresh Product', price: 19.99 }],
      });

    // First call uses cache
    const staleResult = await productService.getFeatured();
    expect(staleResult.source).toBe('cache');

    // Second call gets fresh data
    const freshResult = await productService.getFeatured();
    expect(freshResult.source).toBe('api');
    expect(freshResult.products[0].name).toBe('Fresh Product');
  });
});
\`\`\`

### Feature Flag Degradation

Feature flags let you disable non-essential features when their backing services are failing, preserving the core user experience.

\`\`\`typescript
describe('Feature Flag Degradation', () => {
  it('hides recommendations when recommendation service is down', async () => {
    featureFlags.set('show_recommendations', false);

    render(<ProductPage productId="123" />);

    await waitFor(() => {
      expect(screen.getByText('Product Details')).toBeInTheDocument();
      expect(
        screen.queryByTestId('recommendations-section')
      ).not.toBeInTheDocument();
    });
  });

  it('shows simplified checkout when payment service is degraded', async () => {
    featureFlags.set('payment_service_degraded', true);

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(
        screen.getByText('Limited payment options available')
      ).toBeInTheDocument();
      // Only shows basic payment methods
      expect(screen.getByText('Credit Card')).toBeInTheDocument();
      expect(screen.queryByText('Apple Pay')).not.toBeInTheDocument();
      expect(screen.queryByText('Buy Now Pay Later')).not.toBeInTheDocument();
    });
  });
});
\`\`\`

### Offline-First Testing

For applications that support offline usage, you need to verify that core functionality works without any network connectivity.

\`\`\`typescript
describe('Offline Mode', () => {
  it('queues form submissions when offline', async () => {
    // Simulate going offline
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));

    render(<FeedbackForm />);

    await userEvent.type(screen.getByLabelText('Message'), 'Great product');
    await userEvent.click(screen.getByText('Submit'));

    expect(screen.getByText('Saved offline')).toBeInTheDocument();
    expect(offlineQueue.pending).toHaveLength(1);
  });

  it('syncs queued items when coming back online', async () => {
    offlineQueue.add({ type: 'feedback', data: { message: 'Test' } });

    // Simulate coming online
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    window.dispatchEvent(new Event('online'));

    await waitFor(() => {
      expect(offlineQueue.pending).toHaveLength(0);
      expect(apiClient.post).toHaveBeenCalledWith('/api/feedback', {
        message: 'Test',
      });
    });
  });
});
\`\`\`

---

## Network Error Simulation

Simulating network errors in end-to-end and integration tests is essential for verifying how your application behaves when HTTP requests fail. Modern tools like Playwright and MSW (Mock Service Worker) make this straightforward.

### Playwright Network Interception

Playwright lets you intercept and modify network requests at the browser level, making it ideal for error handling testing in E2E tests.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Network Error Handling', () => {
  test('shows error state when API returns 500', async ({ page }) => {
    await page.route('**/api/products', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'INTERNAL_ERROR' }),
      });
    });

    await page.goto('/products');

    await expect(
      page.getByText('Unable to load products')
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('handles network timeout gracefully', async ({ page }) => {
    await page.route('**/api/dashboard', async (route) => {
      // Simulate a very slow response
      await new Promise((resolve) => setTimeout(resolve, 30000));
      route.fulfill({ status: 200, body: '{}' });
    });

    await page.goto('/dashboard');

    await expect(
      page.getByText('Request timed out')
    ).toBeVisible({ timeout: 15000 });
  });

  test('handles connection refused', async ({ page }) => {
    await page.route('**/api/**', (route) => {
      route.abort('connectionrefused');
    });

    await page.goto('/dashboard');

    await expect(
      page.getByText('Unable to connect to server')
    ).toBeVisible();
  });
});
\`\`\`

### MSW Error Handlers

MSW (Mock Service Worker) intercepts requests at the service worker level, making it ideal for integration tests with React Testing Library.

\`\`\`typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { render, screen, waitFor } from '@testing-library/react';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('MSW Error Handling', () => {
  it('displays error message for failed API call', async () => {
    server.use(
      rest.get('/api/users/profile', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ error: 'Database connection failed' })
        );
      })
    );

    render(<UserProfile />);

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load profile')
      ).toBeInTheDocument();
    });
  });

  it('handles network error (no response)', async () => {
    server.use(
      rest.get('/api/users/profile', (req, res) => {
        return res.networkError('Connection refused');
      })
    );

    render(<UserProfile />);

    await waitFor(() => {
      expect(
        screen.getByText('Network error. Check your connection.')
      ).toBeInTheDocument();
    });
  });

  it('handles slow responses with loading timeout', async () => {
    server.use(
      rest.get('/api/search', async (req, res, ctx) => {
        await new Promise((r) => setTimeout(r, 10000));
        return res(ctx.json({ results: [] }));
      })
    );

    render(<SearchResults query="test" />);

    await waitFor(
      () => {
        expect(
          screen.getByText('Search is taking longer than expected')
        ).toBeInTheDocument();
      },
      { timeout: 6000 }
    );
  });
});
\`\`\`

These network simulation techniques let you verify error handling without depending on real service failures. You can test every combination of status codes, response delays, and connection errors in a deterministic, repeatable way.

---

## Console Error and Exception Monitoring

Testing that errors are properly logged is as important as testing that they are properly displayed. Your error monitoring tests should verify that errors reach your logging system with the right severity, context, and metadata -- while ensuring that sensitive information is never included.

### Testing Console Error Calls

\`\`\`typescript
describe('Error Logging', () => {
  it('logs API errors with request context', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    vi.spyOn(apiClient, 'get').mockRejectedValue(
      new Error('Service unavailable')
    );

    await productService.getFeatured();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('getFeatured failed'),
      expect.objectContaining({
        endpoint: '/api/products/featured',
        error: 'Service unavailable',
      })
    );

    consoleSpy.mockRestore();
  });

  it('does not log sensitive data in error messages', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    await authService.login('user@example.com', 'secretPassword123');

    const loggedMessages = consoleSpy.mock.calls
      .map((call) => JSON.stringify(call))
      .join(' ');

    expect(loggedMessages).not.toContain('secretPassword123');
    expect(loggedMessages).not.toContain('Authorization');
    expect(loggedMessages).not.toContain('Bearer');

    consoleSpy.mockRestore();
  });
});
\`\`\`

### Error Monitoring Integration Testing

If you use an error tracking service like Sentry or Datadog, you should test that errors are reported with the correct metadata.

\`\`\`typescript
describe('Sentry Integration', () => {
  it('reports unhandled errors with user context', async () => {
    const sentrySpy = vi.spyOn(Sentry, 'captureException');

    // Trigger an unhandled error in a component
    render(
      <ErrorBoundary>
        <ComponentThatThrows />
      </ErrorBoundary>
    );

    expect(sentrySpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Render failed' }),
      expect.objectContaining({
        tags: { component: 'ComponentThatThrows' },
        level: 'error',
      })
    );
  });

  it('attaches breadcrumbs for debugging context', async () => {
    const breadcrumbSpy = vi.spyOn(Sentry, 'addBreadcrumb');

    await userEvent.click(screen.getByText('Load Data'));

    // Wait for the error to occur
    await waitFor(() => {
      const breadcrumbs = breadcrumbSpy.mock.calls.map((c) => c[0]);
      expect(breadcrumbs).toContainEqual(
        expect.objectContaining({
          category: 'api',
          message: 'GET /api/data',
          level: 'error',
        })
      );
    });
  });
});
\`\`\`

### Unhandled Rejection Detection

Unhandled promise rejections are silent killers. They do not crash the application visibly but indicate missing error handling somewhere in your async code.

\`\`\`typescript
describe('Unhandled Promise Rejections', () => {
  it('has no unhandled rejections during normal flow', async () => {
    const rejections: PromiseRejectionEvent[] = [];
    const handler = (e: PromiseRejectionEvent) => {
      rejections.push(e);
    };

    window.addEventListener('unhandledrejection', handler);

    render(<App />);
    await userEvent.click(screen.getByText('Dashboard'));
    await waitFor(() => screen.getByTestId('dashboard-loaded'));

    window.removeEventListener('unhandledrejection', handler);

    expect(rejections).toHaveLength(0);
  });
});
\`\`\`

Testing your error monitoring infrastructure ensures that when production errors occur, your team has the information needed to diagnose and fix them quickly. Without these tests, you might discover that your error tracking was misconfigured only after a critical incident.

---

## Automate Error Testing with AI Agents

Writing comprehensive error handling tests is time-consuming. AI coding agents can dramatically accelerate this work by generating error scenarios, writing negative test cases, and identifying missing error handling in your codebase. QA skills give your AI agent the specialized knowledge to do this effectively.

Install the **error boundary tester** skill to teach your agent how to systematically test React error boundaries, fallback UI rendering, and error recovery flows:

\`\`\`bash
npx @qaskills/cli add error-boundary-tester
\`\`\`

Install the **error message reviewer** skill to have your agent audit error messages for clarity, consistency, and security -- ensuring no stack traces or internal paths leak to users:

\`\`\`bash
npx @qaskills/cli add error-message-reviewer
\`\`\`

Additional skills that strengthen your error handling test suite:

- **console-error-hunter** -- scans test output for unexpected console errors and unhandled promise rejections, then generates tests to cover the missing error handling
- **negative-test-generator** -- analyzes your existing test suite and generates complementary negative test cases for every happy-path test it finds

Browse the full catalog of QA skills at [/skills](/skills) to find additional testing capabilities for your AI agent. If you are new to QA skills, the [getting started guide](/getting-started) walks you through installation and configuration in under five minutes.

For teams working with AI-generated code, pairing error handling testing with [security testing](/blog/security-testing-ai-generated-code) creates a comprehensive safety net that catches both functional failures and security vulnerabilities before they reach production.

---

## Frequently Asked Questions

### What is the difference between error handling testing and negative testing?

**Error handling testing** specifically focuses on verifying that your application responds correctly when errors occur -- that error messages are helpful, fallback UI renders, retry logic works, and errors are properly logged. **Negative testing** is a broader category that includes testing with invalid inputs, boundary values, and unexpected user behavior. Error handling testing is a subset of negative testing that focuses specifically on the error response paths rather than input validation paths. Both are essential, but error handling testing requires a deeper understanding of your application's failure modes and recovery mechanisms.

### How many error scenarios should I test per API endpoint?

As a baseline, test at least one scenario for every HTTP status code your endpoint can return. For most REST endpoints, this means tests for 200, 400, 401, 403, 404, 422, and 500 at minimum. For endpoints with rate limiting, add 429 tests. For endpoints that create resources, add 409 conflict tests. Beyond status codes, test network-level failures (timeouts, connection refused) and data-level failures (malformed response, empty response, unexpected schema). A well-tested endpoint typically has 8 to 15 error scenario tests alongside its happy-path tests.

### Should I test error handling in unit tests or integration tests?

**Both**, because they catch different categories of failures. Unit tests verify that individual error handling functions work correctly in isolation -- that a retry wrapper respects its maximum count, that an error formatter strips sensitive data, that a circuit breaker opens at the right threshold. Integration tests verify that error handling works end-to-end -- that a 500 response from the API triggers the error state in the UI, that the error boundary catches a component throw and renders the fallback. Unit tests run faster and provide precise failure diagnostics. Integration tests catch errors in the wiring between components. A robust error handling test suite uses both.

### How do I test error handling without making tests brittle?

The most common mistake is testing exact error messages with string matching, which breaks whenever copy changes. Instead, test error **categories** and **behaviors**. Assert that an error notification appears, not that it contains a specific sentence. Assert that the retry button is visible, not that the error message says "Please try again." Use test IDs and roles for UI assertions. For API errors, assert on status codes and error type fields rather than human-readable messages. This makes your tests resilient to copy changes while still verifying correct error handling behavior.

### What tools are best for simulating network errors in tests?

For **end-to-end tests**, Playwright's \`page.route()\` API is the gold standard -- it intercepts requests at the browser level and lets you return custom status codes, simulate timeouts with delays, or abort connections entirely. For **integration tests**, MSW (Mock Service Worker) intercepts at the service worker level and works seamlessly with React Testing Library. For **unit tests**, simple mocking with \`vi.spyOn()\` or \`jest.mock()\` on your HTTP client is sufficient. For **production resilience testing**, tools like Chaos Monkey, Gremlin, and Litmus Chaos inject real failures into running systems. Start with Playwright and MSW for test-time simulation, then graduate to chaos engineering tools for production validation.
`,
};
