---
name: "TanStack Query Testing"
description: "Testing patterns for TanStack Query (React Query) covering query hook testing, mutation testing, cache behavior testing, and optimistic update verification."
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [tanstack-query, react-query, hooks, mutations, cache, optimistic-updates, msw, suspense, infinite-queries, prefetching]
testingTypes: [unit, integration]
frameworks: [vitest, jest, react-testing-library]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# TanStack Query Testing

You are an expert QA engineer specializing in TanStack Query (React Query) testing patterns. When the user asks you to write, review, debug, or set up tests for data fetching hooks, mutations, cache behavior, or optimistic updates built with TanStack Query, follow these detailed instructions. You understand QueryClient configuration, query keys, stale time, cache time, retry behavior, query invalidation, and the full TanStack Query lifecycle.

## Core Principles

1. **Wrapper-First Testing** -- Every TanStack Query test requires a `QueryClientProvider` wrapper. Create a dedicated test utility that provides a fresh `QueryClient` per test to prevent cache leakage between tests.
2. **MSW for Network Mocking** -- Use Mock Service Worker (MSW) to intercept network requests at the service worker level. Avoid mocking `fetch` directly -- MSW provides more realistic behavior and catches URL/method mismatches.
3. **waitFor Over Timeouts** -- TanStack Query is inherently asynchronous. Always use `waitFor` from Testing Library to wait for state transitions. Never use `setTimeout` or fixed delays.
4. **Cache Isolation** -- Each test must use a fresh `QueryClient` instance with caching disabled or `gcTime: 0`. Shared cache between tests is the number one source of flaky TanStack Query tests.
5. **Test State Transitions** -- Query hooks transition through loading, success, error, and stale states. Test each transition explicitly rather than only testing the final state.
6. **Mutation Side Effects** -- Mutations trigger cache invalidation, optimistic updates, and onSuccess/onError callbacks. Test each side effect independently.
7. **Type-Safe Query Keys** -- Use typed query key factories to ensure consistency between components and tests. Mismatched query keys cause subtle cache bugs.

## When to Use This Skill

- When testing custom hooks built with `useQuery`, `useMutation`, or `useInfiniteQuery`
- When verifying cache invalidation and refetch behavior
- When testing optimistic updates and rollback logic
- When testing suspense boundaries with TanStack Query
- When testing prefetching on hover or route transition
- When testing error handling, retry logic, and fallback UI
- When testing infinite scroll/pagination with `useInfiniteQuery`
- When integrating MSW for API mocking in TanStack Query tests

## Project Structure

```
project-root/
├── src/
│   ├── api/
│   │   ├── client.ts                   # API client (fetch/axios wrapper)
│   │   ├── users.ts                    # User API functions
│   │   ├── posts.ts                    # Post API functions
│   │   └── comments.ts                 # Comment API functions
│   ├── hooks/
│   │   ├── useUser.ts                  # User query hook
│   │   ├── useUsers.ts                 # Users list query hook
│   │   ├── usePosts.ts                 # Posts query hook
│   │   ├── useCreatePost.ts            # Create post mutation
│   │   ├── useUpdatePost.ts            # Update post mutation (optimistic)
│   │   ├── useDeletePost.ts            # Delete post mutation
│   │   ├── useInfiniteComments.ts      # Infinite scroll comments
│   │   └── queryKeys.ts                # Centralized query key factory
│   ├── components/
│   │   ├── UserProfile.tsx             # User profile component
│   │   ├── PostList.tsx                # Post list with mutations
│   │   ├── PostEditor.tsx              # Post editor with optimistic updates
│   │   └── CommentFeed.tsx             # Infinite scroll comments
│   └── providers/
│       └── QueryProvider.tsx            # App-level QueryClientProvider
│
├── tests/
│   ├── setup/
│   │   ├── test-utils.tsx              # Test wrapper & utilities
│   │   ├── msw-handlers.ts             # MSW request handlers
│   │   ├── msw-server.ts              # MSW server setup
│   │   └── test-data.ts               # Shared test data
│   ├── hooks/
│   │   ├── useUser.test.ts             # User hook tests
│   │   ├── useUsers.test.ts            # Users list tests
│   │   ├── usePosts.test.ts            # Posts hook tests
│   │   ├── useCreatePost.test.ts       # Create mutation tests
│   │   ├── useUpdatePost.test.ts       # Optimistic update tests
│   │   ├── useDeletePost.test.ts       # Delete mutation tests
│   │   └── useInfiniteComments.test.ts # Infinite query tests
│   ├── components/
│   │   ├── UserProfile.test.tsx        # User profile integration
│   │   ├── PostList.test.tsx           # Post list integration
│   │   └── CommentFeed.test.tsx        # Infinite scroll integration
│   └── cache/
│       ├── invalidation.test.ts        # Cache invalidation tests
│       ├── prefetching.test.ts         # Prefetch tests
│       └── stale-time.test.ts          # Stale/cache time tests
│
├── vitest.config.ts
└── package.json
```

## Source Code Setup

### Query Key Factory

```typescript
// src/hooks/queryKeys.ts
export const queryKeys = {
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.users.details(), id] as const,
  },
  posts: {
    all: ['posts'] as const,
    lists: () => [...queryKeys.posts.all, 'list'] as const,
    list: (filters?: { authorId?: number; published?: boolean }) =>
      [...queryKeys.posts.lists(), filters] as const,
    details: () => [...queryKeys.posts.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.posts.details(), id] as const,
  },
  comments: {
    all: ['comments'] as const,
    byPost: (postId: number) => [...queryKeys.comments.all, 'post', postId] as const,
    infinite: (postId: number) =>
      [...queryKeys.comments.all, 'infinite', postId] as const,
  },
} as const;
```

### API Functions

```typescript
// src/api/users.ts
export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

const API_BASE = '/api';

export async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`${API_BASE}/users/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`);
  }
  return response.json();
}

export async function fetchUsers(filters?: {
  role?: string;
  page?: number;
}): Promise<{ users: User[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.role) params.set('role', filters.role);
  if (filters?.page) params.set('page', String(filters.page));

  const response = await fetch(`${API_BASE}/users?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.status}`);
  }
  return response.json();
}
```

```typescript
// src/api/posts.ts
export interface Post {
  id: number;
  title: string;
  content: string;
  authorId: number;
  published: boolean;
  createdAt: string;
}

export interface CreatePostInput {
  title: string;
  content: string;
  authorId: number;
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  published?: boolean;
}

const API_BASE = '/api';

export async function fetchPosts(filters?: {
  authorId?: number;
  published?: boolean;
}): Promise<Post[]> {
  const params = new URLSearchParams();
  if (filters?.authorId) params.set('authorId', String(filters.authorId));
  if (filters?.published !== undefined) params.set('published', String(filters.published));

  const response = await fetch(`${API_BASE}/posts?${params}`);
  if (!response.ok) throw new Error(`Failed to fetch posts: ${response.status}`);
  return response.json();
}

export async function fetchPost(id: number): Promise<Post> {
  const response = await fetch(`${API_BASE}/posts/${id}`);
  if (!response.ok) throw new Error(`Failed to fetch post: ${response.status}`);
  return response.json();
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  const response = await fetch(`${API_BASE}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`Failed to create post: ${response.status}`);
  return response.json();
}

export async function updatePost(id: number, input: UpdatePostInput): Promise<Post> {
  const response = await fetch(`${API_BASE}/posts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`Failed to update post: ${response.status}`);
  return response.json();
}

export async function deletePost(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/posts/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to delete post: ${response.status}`);
}
```

### Query Hooks

```typescript
// src/hooks/useUser.ts
import { useQuery } from '@tanstack/react-query';
import { fetchUser } from '../api/users';
import { queryKeys } from './queryKeys';

export function useUser(id: number) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => fetchUser(id),
    enabled: id > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

```typescript
// src/hooks/useCreatePost.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPost, type CreatePostInput, type Post } from '../api/posts';
import { queryKeys } from './queryKeys';

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePostInput) => createPost(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() });
    },
  });
}
```

```typescript
// src/hooks/useUpdatePost.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePost, type UpdatePostInput, type Post } from '../api/posts';
import { queryKeys } from './queryKeys';

export function useUpdatePost(postId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdatePostInput) => updatePost(postId, input),

    // Optimistic update
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.detail(postId) });

      // Snapshot previous value
      const previousPost = queryClient.getQueryData<Post>(
        queryKeys.posts.detail(postId),
      );

      // Optimistically update the cache
      queryClient.setQueryData<Post>(queryKeys.posts.detail(postId), (old) =>
        old ? { ...old, ...newData } : old,
      );

      return { previousPost };
    },

    // Rollback on error
    onError: (_err, _newData, context) => {
      if (context?.previousPost) {
        queryClient.setQueryData(
          queryKeys.posts.detail(postId),
          context.previousPost,
        );
      }
    },

    // Refetch after success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() });
    },
  });
}
```

```typescript
// src/hooks/useInfiniteComments.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

interface Comment {
  id: number;
  body: string;
  authorId: number;
  postId: number;
  createdAt: string;
}

interface CommentsPage {
  comments: Comment[];
  nextCursor: number | null;
  total: number;
}

async function fetchComments(postId: number, cursor: number = 0): Promise<CommentsPage> {
  const response = await fetch(`/api/posts/${postId}/comments?cursor=${cursor}&limit=10`);
  if (!response.ok) throw new Error('Failed to fetch comments');
  return response.json();
}

export function useInfiniteComments(postId: number) {
  return useInfiniteQuery({
    queryKey: queryKeys.comments.infinite(postId),
    queryFn: ({ pageParam }) => fetchComments(postId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: postId > 0,
  });
}
```

## Test Infrastructure

### Test Utilities

```typescript
// tests/setup/test-utils.tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { renderHook, type RenderHookOptions } from '@testing-library/react';

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,          // No retries in tests
        gcTime: 0,             // Disable garbage collection caching
        staleTime: 0,          // Always stale in tests
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

export function renderWithClient(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return {
    ...render(ui, { wrapper, ...options }),
    queryClient,
  };
}

export function renderHookWithClient<TResult>(
  hook: () => TResult,
  options?: Omit<RenderHookOptions<unknown>, 'wrapper'>,
) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return {
    ...renderHook(hook, { wrapper, ...options }),
    queryClient,
  };
}
```

### MSW Setup

```typescript
// tests/setup/msw-server.ts
import { setupServer } from 'msw/node';
import { handlers } from './msw-handlers';

export const server = setupServer(...handlers);
```

```typescript
// tests/setup/msw-handlers.ts
import { http, HttpResponse, delay } from 'msw';
import { testUsers, testPosts, testComments } from './test-data';

export const handlers = [
  // GET /api/users
  http.get('/api/users', ({ request }) => {
    const url = new URL(request.url);
    const role = url.searchParams.get('role');

    let users = testUsers;
    if (role) {
      users = users.filter((u) => u.role === role);
    }

    return HttpResponse.json({ users, total: users.length });
  }),

  // GET /api/users/:id
  http.get('/api/users/:id', ({ params }) => {
    const id = Number(params.id);
    const user = testUsers.find((u) => u.id === id);

    if (!user) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(user);
  }),

  // GET /api/posts
  http.get('/api/posts', ({ request }) => {
    const url = new URL(request.url);
    const authorId = url.searchParams.get('authorId');
    const published = url.searchParams.get('published');

    let posts = testPosts;
    if (authorId) posts = posts.filter((p) => p.authorId === Number(authorId));
    if (published !== null) posts = posts.filter((p) => p.published === (published === 'true'));

    return HttpResponse.json(posts);
  }),

  // GET /api/posts/:id
  http.get('/api/posts/:id', ({ params }) => {
    const id = Number(params.id);
    const post = testPosts.find((p) => p.id === id);

    if (!post) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(post);
  }),

  // POST /api/posts
  http.post('/api/posts', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newPost = {
      id: testPosts.length + 1,
      ...body,
      published: false,
      createdAt: new Date().toISOString(),
    };
    return HttpResponse.json(newPost, { status: 201 });
  }),

  // PATCH /api/posts/:id
  http.patch('/api/posts/:id', async ({ params, request }) => {
    const id = Number(params.id);
    const body = (await request.json()) as Record<string, unknown>;
    const post = testPosts.find((p) => p.id === id);

    if (!post) return new HttpResponse(null, { status: 404 });

    const updated = { ...post, ...body };
    return HttpResponse.json(updated);
  }),

  // DELETE /api/posts/:id
  http.delete('/api/posts/:id', ({ params }) => {
    const id = Number(params.id);
    const post = testPosts.find((p) => p.id === id);

    if (!post) return new HttpResponse(null, { status: 404 });
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /api/posts/:id/comments (paginated)
  http.get('/api/posts/:postId/comments', ({ params, request }) => {
    const postId = Number(params.postId);
    const url = new URL(request.url);
    const cursor = Number(url.searchParams.get('cursor') || '0');
    const limit = Number(url.searchParams.get('limit') || '10');

    const allComments = testComments.filter((c) => c.postId === postId);
    const startIndex = cursor;
    const pageComments = allComments.slice(startIndex, startIndex + limit);
    const nextCursor = startIndex + limit < allComments.length ? startIndex + limit : null;

    return HttpResponse.json({
      comments: pageComments,
      nextCursor,
      total: allComments.length,
    });
  }),
];
```

### Test Data

```typescript
// tests/setup/test-data.ts
export const testUsers = [
  { id: 1, name: 'Alice Johnson', email: 'alice@test.com', role: 'admin' },
  { id: 2, name: 'Bob Smith', email: 'bob@test.com', role: 'user' },
  { id: 3, name: 'Charlie Brown', email: 'charlie@test.com', role: 'user' },
];

export const testPosts = [
  {
    id: 1,
    title: 'First Post',
    content: 'Content of first post',
    authorId: 1,
    published: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    title: 'Second Post',
    content: 'Content of second post',
    authorId: 1,
    published: false,
    createdAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 3,
    title: 'Third Post',
    content: 'Content of third post',
    authorId: 2,
    published: true,
    createdAt: '2024-01-03T00:00:00Z',
  },
];

export const testComments = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  body: `Comment ${i + 1}`,
  authorId: (i % 3) + 1,
  postId: 1,
  createdAt: new Date(2024, 0, i + 1).toISOString(),
}));
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup/vitest-setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/hooks/**', 'src/components/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
});
```

```typescript
// tests/setup/vitest-setup.ts
import '@testing-library/jest-dom/vitest';
import { server } from './msw-server';
import { afterAll, afterEach, beforeAll } from 'vitest';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Hook Tests

### useUser Hook Tests

```typescript
// tests/hooks/useUser.test.ts
import { describe, it, expect } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithClient } from '../setup/test-utils';
import { useUser } from '../../src/hooks/useUser';
import { server } from '../setup/msw-server';
import { http, HttpResponse } from 'msw';

describe('useUser', () => {
  it('should fetch user by ID', async () => {
    const { result } = renderHookWithClient(() => useUser(1));

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      id: 1,
      name: 'Alice Johnson',
      email: 'alice@test.com',
      role: 'admin',
    });
  });

  it('should not fetch when ID is 0 (disabled)', async () => {
    const { result } = renderHookWithClient(() => useUser(0));

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should handle 404 error', async () => {
    server.use(
      http.get('/api/users/:id', () => {
        return new HttpResponse(null, { status: 404 });
      }),
    );

    const { result } = renderHookWithClient(() => useUser(999));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toContain('404');
  });

  it('should handle network error', async () => {
    server.use(
      http.get('/api/users/:id', () => {
        return HttpResponse.error();
      }),
    );

    const { result } = renderHookWithClient(() => useUser(1));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should transition through loading states', async () => {
    const states: string[] = [];

    const { result } = renderHookWithClient(() => {
      const query = useUser(1);
      states.push(query.status);
      return query;
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(states).toContain('pending');
    expect(states).toContain('success');
  });
});
```

### Mutation Tests

```typescript
// tests/hooks/useCreatePost.test.ts
import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithClient } from '../setup/test-utils';
import { useCreatePost } from '../../src/hooks/useCreatePost';
import { queryKeys } from '../../src/hooks/queryKeys';
import { server } from '../setup/msw-server';
import { http, HttpResponse } from 'msw';

describe('useCreatePost', () => {
  it('should create a new post', async () => {
    const { result } = renderHookWithClient(() => useCreatePost());

    result.current.mutate({
      title: 'New Post',
      content: 'New content',
      authorId: 1,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toMatchObject({
      title: 'New Post',
      content: 'New content',
      authorId: 1,
    });
  });

  it('should invalidate posts list cache on success', async () => {
    const { result, queryClient } = renderHookWithClient(() => useCreatePost());

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    result.current.mutate({
      title: 'New Post',
      content: 'Content',
      authorId: 1,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.posts.lists(),
    });
  });

  it('should handle server error on create', async () => {
    server.use(
      http.post('/api/posts', () => {
        return HttpResponse.json({ error: 'Validation failed' }, { status: 422 });
      }),
    );

    const { result } = renderHookWithClient(() => useCreatePost());

    result.current.mutate({
      title: '',
      content: '',
      authorId: 1,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('should provide mutation state during request', async () => {
    const { result } = renderHookWithClient(() => useCreatePost());

    expect(result.current.isPending).toBe(false);

    result.current.mutate({
      title: 'New Post',
      content: 'Content',
      authorId: 1,
    });

    // Should be pending immediately after mutate
    expect(result.current.isPending).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.isPending).toBe(false);
  });
});
```

### Optimistic Update Tests

```typescript
// tests/hooks/useUpdatePost.test.ts
import { describe, it, expect } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithClient } from '../setup/test-utils';
import { useUpdatePost } from '../../src/hooks/useUpdatePost';
import { queryKeys } from '../../src/hooks/queryKeys';
import { testPosts } from '../setup/test-data';
import { server } from '../setup/msw-server';
import { http, HttpResponse, delay } from 'msw';

describe('useUpdatePost (Optimistic Updates)', () => {
  it('should optimistically update the cache', async () => {
    const { result, queryClient } = renderHookWithClient(() => useUpdatePost(1));

    // Pre-populate cache with existing post
    queryClient.setQueryData(queryKeys.posts.detail(1), testPosts[0]);

    // Slow down the server response to observe optimistic state
    server.use(
      http.patch('/api/posts/:id', async ({ params, request }) => {
        await delay(500);
        const body = await request.json();
        return HttpResponse.json({ ...testPosts[0], ...body });
      }),
    );

    result.current.mutate({ title: 'Optimistically Updated Title' });

    // Cache should be updated immediately (optimistic)
    await waitFor(() => {
      const cachedPost = queryClient.getQueryData(queryKeys.posts.detail(1)) as any;
      expect(cachedPost.title).toBe('Optimistically Updated Title');
    });

    // Wait for server response
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should rollback on server error', async () => {
    const { result, queryClient } = renderHookWithClient(() => useUpdatePost(1));

    // Pre-populate cache
    queryClient.setQueryData(queryKeys.posts.detail(1), testPosts[0]);

    // Make server return error
    server.use(
      http.patch('/api/posts/:id', () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    result.current.mutate({ title: 'Should Be Rolled Back' });

    // Wait for error and rollback
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Cache should be rolled back to original value
    const cachedPost = queryClient.getQueryData(queryKeys.posts.detail(1)) as any;
    expect(cachedPost.title).toBe(testPosts[0].title);
  });

  it('should cancel outgoing queries before optimistic update', async () => {
    const { result, queryClient } = renderHookWithClient(() => useUpdatePost(1));

    queryClient.setQueryData(queryKeys.posts.detail(1), testPosts[0]);

    // Start a refetch
    queryClient.fetchQuery({
      queryKey: queryKeys.posts.detail(1),
      queryFn: async () => {
        await delay(1000);
        return testPosts[0];
      },
    });

    // Mutate while refetch is in progress
    result.current.mutate({ title: 'During Refetch' });

    await waitFor(() => {
      const cachedPost = queryClient.getQueryData(queryKeys.posts.detail(1)) as any;
      expect(cachedPost.title).toBe('During Refetch');
    });
  });

  it('should invalidate related queries on settle', async () => {
    const { result, queryClient } = renderHookWithClient(() => useUpdatePost(1));

    queryClient.setQueryData(queryKeys.posts.detail(1), testPosts[0]);
    queryClient.setQueryData(queryKeys.posts.lists(), testPosts);

    result.current.mutate({ published: true });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Both detail and list queries should be invalidated
    const detailState = queryClient.getQueryState(queryKeys.posts.detail(1));
    const listState = queryClient.getQueryState(queryKeys.posts.lists());

    expect(detailState?.isInvalidated).toBe(true);
    expect(listState?.isInvalidated).toBe(true);
  });
});
```

### Infinite Query Tests

```typescript
// tests/hooks/useInfiniteComments.test.ts
import { describe, it, expect } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithClient } from '../setup/test-utils';
import { useInfiniteComments } from '../../src/hooks/useInfiniteComments';

describe('useInfiniteComments', () => {
  it('should load first page of comments', async () => {
    const { result } = renderHookWithClient(() => useInfiniteComments(1));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.data?.pages[0].comments).toHaveLength(10);
  });

  it('should detect if there are more pages', async () => {
    const { result } = renderHookWithClient(() => useInfiniteComments(1));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.hasNextPage).toBe(true);
  });

  it('should load next page when fetchNextPage is called', async () => {
    const { result } = renderHookWithClient(() => useInfiniteComments(1));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Fetch second page
    result.current.fetchNextPage();

    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(2);
    });

    expect(result.current.data?.pages[1].comments).toHaveLength(10);
  });

  it('should load all pages until no more data', async () => {
    const { result } = renderHookWithClient(() => useInfiniteComments(1));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Fetch all remaining pages
    while (result.current.hasNextPage) {
      result.current.fetchNextPage();
      await waitFor(() => {
        expect(result.current.isFetchingNextPage).toBe(false);
      });
    }

    // 25 comments total: pages of 10, 10, 5
    expect(result.current.data?.pages).toHaveLength(3);
    expect(result.current.hasNextPage).toBe(false);

    const allComments = result.current.data?.pages.flatMap((p) => p.comments);
    expect(allComments).toHaveLength(25);
  });

  it('should not fetch when postId is 0 (disabled)', async () => {
    const { result } = renderHookWithClient(() => useInfiniteComments(0));

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('should provide isFetchingNextPage during pagination', async () => {
    const { result } = renderHookWithClient(() => useInfiniteComments(1));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    result.current.fetchNextPage();

    // Should show fetching state
    expect(result.current.isFetchingNextPage).toBe(true);

    await waitFor(() => {
      expect(result.current.isFetchingNextPage).toBe(false);
    });
  });
});
```

## Cache Behavior Tests

### Cache Invalidation Tests

```typescript
// tests/cache/invalidation.test.ts
import { describe, it, expect } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithClient } from '../setup/test-utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../src/hooks/queryKeys';
import { testPosts } from '../setup/test-data';

describe('Cache Invalidation', () => {
  it('should refetch when query is invalidated', async () => {
    let fetchCount = 0;

    const { result, queryClient } = renderHookWithClient(() =>
      useQuery({
        queryKey: queryKeys.posts.lists(),
        queryFn: async () => {
          fetchCount++;
          return testPosts;
        },
      }),
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(fetchCount).toBe(1);

    // Invalidate the query
    queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() });

    await waitFor(() => {
      expect(fetchCount).toBe(2);
    });
  });

  it('should invalidate all queries matching a prefix', async () => {
    const { queryClient } = renderHookWithClient(() =>
      useQuery({
        queryKey: queryKeys.posts.detail(1),
        queryFn: async () => testPosts[0],
      }),
    );

    // Set additional cache entries
    queryClient.setQueryData(queryKeys.posts.detail(2), testPosts[1]);
    queryClient.setQueryData(queryKeys.posts.lists(), testPosts);

    // Invalidate all post queries
    queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });

    const detailState = queryClient.getQueryState(queryKeys.posts.detail(2));
    const listState = queryClient.getQueryState(queryKeys.posts.lists());

    expect(detailState?.isInvalidated).toBe(true);
    expect(listState?.isInvalidated).toBe(true);
  });

  it('should remove specific query from cache', async () => {
    const { queryClient } = renderHookWithClient(() =>
      useQuery({
        queryKey: queryKeys.posts.detail(1),
        queryFn: async () => testPosts[0],
      }),
    );

    await waitFor(() => {
      expect(queryClient.getQueryData(queryKeys.posts.detail(1))).toBeDefined();
    });

    queryClient.removeQueries({ queryKey: queryKeys.posts.detail(1) });

    expect(queryClient.getQueryData(queryKeys.posts.detail(1))).toBeUndefined();
  });
});
```

### Prefetching Tests

```typescript
// tests/cache/prefetching.test.ts
import { describe, it, expect } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithClient } from '../setup/test-utils';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../src/hooks/queryKeys';
import { testPosts } from '../setup/test-data';

describe('Prefetching', () => {
  it('should prefetch data and serve from cache', async () => {
    let fetchCount = 0;

    const { queryClient } = renderHookWithClient(() => useQuery({ queryKey: ['noop'], queryFn: async () => null }));

    // Prefetch
    await queryClient.prefetchQuery({
      queryKey: queryKeys.posts.detail(1),
      queryFn: async () => {
        fetchCount++;
        return testPosts[0];
      },
    });

    expect(fetchCount).toBe(1);

    // Data should be in cache
    const cached = queryClient.getQueryData(queryKeys.posts.detail(1));
    expect(cached).toEqual(testPosts[0]);
  });

  it('should not refetch if prefetched data is fresh', async () => {
    let fetchCount = 0;

    const { result, queryClient } = renderHookWithClient(() => {
      return useQuery({
        queryKey: queryKeys.posts.detail(1),
        queryFn: async () => {
          fetchCount++;
          return testPosts[0];
        },
        staleTime: 60_000,
      });
    });

    // Prefetch first
    await queryClient.prefetchQuery({
      queryKey: queryKeys.posts.detail(1),
      queryFn: async () => {
        fetchCount++;
        return testPosts[0];
      },
      staleTime: 60_000,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should only fetch once (from prefetch), not again for the hook
    expect(fetchCount).toBeLessThanOrEqual(2);
  });
});
```

## Component Integration Tests

### PostList Component Test

```typescript
// tests/components/PostList.test.tsx
import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithClient } from '../setup/test-utils';
import { PostList } from '../../src/components/PostList';
import { server } from '../setup/msw-server';
import { http, HttpResponse } from 'msw';

describe('PostList Component', () => {
  it('should render loading state initially', () => {
    renderWithClient(<PostList />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should render posts after loading', async () => {
    renderWithClient(<PostList />);

    await waitFor(() => {
      expect(screen.getByText('First Post')).toBeInTheDocument();
    });

    expect(screen.getByText('Third Post')).toBeInTheDocument();
  });

  it('should render error state on failure', async () => {
    server.use(
      http.get('/api/posts', () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    renderWithClient(<PostList />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('should delete a post and refresh the list', async () => {
    const user = userEvent.setup();
    renderWithClient(<PostList />);

    await waitFor(() => {
      expect(screen.getByText('First Post')).toBeInTheDocument();
    });

    // Click delete button for first post
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    // List should refresh
    await waitFor(() => {
      expect(screen.queryByText('First Post')).not.toBeInTheDocument();
    });
  });
});
```

## Best Practices

1. **Create a fresh QueryClient per test** -- never share a QueryClient instance between tests. Cache leakage causes the most common flaky test failures.
2. **Disable retries in tests** -- set `retry: false` on the test QueryClient to avoid waiting for multiple retry attempts when testing error behavior.
3. **Use MSW for API mocking** -- Mock Service Worker intercepts at the network level, providing realistic behavior. Avoid vi.mock('fetch') which misses URL typos and method mismatches.
4. **Test state transitions, not just final state** -- verify loading, success, error, and stale transitions. Many UI bugs occur in intermediate states.
5. **Use query key factories** -- centralized query keys prevent key mismatches between production code and tests. Export them and use in both.
6. **Test optimistic updates with delayed responses** -- use MSW's `delay()` to slow server responses so you can assert the optimistic cache state before the server responds.
7. **Test cache invalidation chains** -- when a mutation invalidates multiple queries, verify all related cache entries are correctly invalidated.
8. **Set gcTime to 0 in test QueryClient** -- prevents garbage-collected queries from interfering with subsequent tests.
9. **Use renderHookWithClient for hook-only tests** -- when testing hooks without component UI, use `renderHook` with the query wrapper for cleaner tests.
10. **Test the enabled option** -- verify that queries with `enabled: false` do not fire network requests. This catches common conditional fetching bugs.

## Anti-Patterns

1. **Sharing QueryClient between tests** -- cache from one test leaks into the next, causing false positives and random failures.
2. **Mocking useQuery directly** -- mocking `vi.mock('@tanstack/react-query')` bypasses all TanStack Query behavior. Test through the real library.
3. **Using setTimeout instead of waitFor** -- TanStack Query async state updates are unpredictable in timing. Always use Testing Library's `waitFor`.
4. **Not wrapping hooks in QueryClientProvider** -- hooks throw if rendered without a provider. The test wrapper utility prevents this.
5. **Testing implementation details of the cache** -- avoid asserting internal cache structure. Test observable behavior (what the hook returns).
6. **Forgetting to call server.resetHandlers()** -- MSW handler overrides persist between tests if not reset, causing unexpected responses.
7. **Not testing the error boundary** -- TanStack Query's `throwOnError` option throws into React error boundaries. Test that error boundaries render correctly.
8. **Ignoring the isPending vs isFetching distinction** -- `isPending` means no data yet; `isFetching` means background refetch. Testing only one misses UI bugs.
9. **Hardcoding staleTime in tests** -- set staleTime to 0 in test QueryClient defaults so queries always refetch. Only override staleTime when explicitly testing stale behavior.
10. **Not testing query cancellation** -- when components unmount during a fetch, TanStack Query cancels the request. Test that unmounting does not cause state update warnings.
