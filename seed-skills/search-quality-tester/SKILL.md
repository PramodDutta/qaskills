---
name: Search Quality Tester
description: Evaluate search functionality quality including relevance ranking, typo tolerance, faceted filtering, autocomplete accuracy, and zero-results handling
version: 1.0.0
author: Pramod
license: MIT
tags: [search-testing, search-relevance, autocomplete, faceted-search, fuzzy-search, search-ranking, zero-results]
testingTypes: [e2e, integration]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Search Quality Tester Skill

You are an expert QA engineer specializing in search functionality testing. When the user asks you to write, review, or debug search quality tests, follow these detailed instructions to evaluate relevance ranking, typo tolerance, faceted filtering, autocomplete accuracy, zero-results handling, and search performance.

## Core Principles

1. **Relevance is king** -- Search results must be ordered by relevance to the query, not by insertion order or random criteria. Every search test suite must include explicit relevance ranking assertions.
2. **Typo tolerance is expected** -- Modern users expect search to handle misspellings, transpositions, and phonetic similarities. Test fuzzy matching systematically with controlled edit distances.
3. **Faceted filtering must compose** -- Facet filters (category, price range, date, tags) must work individually and in combination without producing contradictory or empty results when data exists.
4. **Autocomplete guides discovery** -- Autocomplete suggestions shape user behavior. They must appear quickly, reflect actual content, and gracefully handle partial input and special characters.
5. **Zero results is a UX moment** -- A blank screen with no guidance is a failure. Zero-results pages must offer helpful alternatives, spelling corrections, or navigation paths.
6. **Performance under load matters** -- Search latency directly impacts user satisfaction. Measure response times under realistic concurrent loads and set strict budgets.
7. **Special characters must not break search** -- Queries containing quotes, ampersands, angle brackets, Unicode, or SQL-like syntax must never cause errors or security vulnerabilities.
8. **Search analytics drive improvement** -- Every search interaction should emit trackable events. Validate that analytics capture query terms, result counts, click-through positions, and refinements.

## Project Structure

```
tests/
  search/
    relevance/
      keyword-ranking.spec.ts
      phrase-matching.spec.ts
      boost-rules.spec.ts
    typo-tolerance/
      edit-distance.spec.ts
      phonetic-matching.spec.ts
      transposition.spec.ts
    autocomplete/
      suggestion-accuracy.spec.ts
      suggestion-speed.spec.ts
      partial-input.spec.ts
    facets/
      single-facet.spec.ts
      combined-facets.spec.ts
      facet-counts.spec.ts
    zero-results/
      empty-state.spec.ts
      suggestions.spec.ts
      spelling-correction.spec.ts
    pagination/
      result-pages.spec.ts
      deep-pagination.spec.ts
      sort-order-persistence.spec.ts
    performance/
      latency.spec.ts
      concurrent-search.spec.ts
    security/
      special-characters.spec.ts
      injection-prevention.spec.ts
    analytics/
      event-tracking.spec.ts
      click-tracking.spec.ts
    fixtures/
      search-test-data.ts
      expected-rankings.ts
    utils/
      search-helpers.ts
      relevance-scorer.ts
playwright.config.ts
```

## Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/search',
  fullyParallel: true,
  retries: 1,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'search-test-results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'search-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'search-mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
```

```typescript
// tests/search/fixtures/search-test-data.ts
export interface SearchTestCase {
  query: string;
  expectedTopResults: string[];
  expectedMinCount: number;
  category?: string;
  description: string;
}

export const relevanceTestCases: SearchTestCase[] = [
  {
    query: 'wireless bluetooth headphones',
    expectedTopResults: ['Sony WH-1000XM5', 'Bose QuietComfort Ultra'],
    expectedMinCount: 10,
    description: 'Exact product category match should rank top brands first',
  },
  {
    query: 'headphones',
    expectedTopResults: ['Sony WH-1000XM5', 'AirPods Max', 'Bose QuietComfort Ultra'],
    expectedMinCount: 20,
    description: 'Broad category term should return all headphone products',
  },
  {
    query: '"noise cancelling"',
    expectedTopResults: ['Sony WH-1000XM5', 'Bose QuietComfort Ultra'],
    expectedMinCount: 5,
    description: 'Quoted phrase should match exact phrase in descriptions',
  },
];

export const typoTestCases = [
  { typo: 'headphoens', corrected: 'headphones', editDistance: 1 },
  { typo: 'bluetooh', corrected: 'bluetooth', editDistance: 1 },
  { typo: 'wireles', corrected: 'wireless', editDistance: 1 },
  { typo: 'heeadphones', corrected: 'headphones', editDistance: 2 },
  { typo: 'blutooth', corrected: 'bluetooth', editDistance: 2 },
];

export const specialCharacterQueries = [
  'C++ programming',
  'rock & roll',
  '<script>alert("xss")</script>',
  "O'Reilly books",
  'price: $50-$100',
  'SELECT * FROM products',
  'search term\x00null byte',
  'emoji search 🎧',
  '   leading trailing spaces   ',
  '',
];
```

## How-To Guides

### Testing Search Relevance Ranking

Relevance ranking is the most critical aspect of search quality. The following pattern establishes a framework for asserting that the most relevant results appear at the top of the result list.

```typescript
// tests/search/relevance/keyword-ranking.spec.ts
import { test, expect } from '@playwright/test';
import { relevanceTestCases } from '../fixtures/search-test-data';

test.describe('Search Relevance Ranking', () => {
  for (const testCase of relevanceTestCases) {
    test(`relevance: ${testCase.description}`, async ({ page }) => {
      await page.goto('/search');
      const searchInput = page.getByRole('searchbox');
      await searchInput.fill(testCase.query);
      await searchInput.press('Enter');

      // Wait for results to load
      await page.waitForSelector('[data-testid="search-results"]');

      // Verify minimum result count
      const resultCount = await page
        .getByTestId('result-count')
        .textContent();
      const count = parseInt(resultCount || '0', 10);
      expect(count).toBeGreaterThanOrEqual(testCase.expectedMinCount);

      // Verify top results contain expected items
      const topResults = await page
        .getByTestId('search-result-title')
        .allTextContents();
      const topN = topResults.slice(0, testCase.expectedTopResults.length);

      for (const expectedResult of testCase.expectedTopResults) {
        expect(topN).toContain(expectedResult);
      }
    });
  }

  test('exact match ranks above partial match', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('Playwright Testing Guide');
    await searchInput.press('Enter');

    await page.waitForSelector('[data-testid="search-results"]');

    const firstResult = await page
      .getByTestId('search-result-title')
      .first()
      .textContent();

    // Exact title match must be the first result
    expect(firstResult).toBe('Playwright Testing Guide');
  });

  test('boosted fields rank higher than body text', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('performance optimization');
    await searchInput.press('Enter');

    await page.waitForSelector('[data-testid="search-results"]');

    // Items with "performance optimization" in the title should
    // rank above items that only mention it in the description
    const results = await page.getByTestId('search-result').all();
    expect(results.length).toBeGreaterThan(2);

    const firstTitle = await results[0]
      .getByTestId('search-result-title')
      .textContent();
    expect(firstTitle?.toLowerCase()).toContain('performance');
  });
});
```

### Testing Typo Tolerance and Fuzzy Matching

Users frequently misspell queries. A robust search system corrects these errors transparently or presents a "Did you mean?" prompt.

```typescript
// tests/search/typo-tolerance/edit-distance.spec.ts
import { test, expect } from '@playwright/test';
import { typoTestCases } from '../fixtures/search-test-data';

test.describe('Typo Tolerance', () => {
  for (const { typo, corrected, editDistance } of typoTestCases) {
    test(`corrects "${typo}" (edit distance ${editDistance})`, async ({ page }) => {
      await page.goto('/search');
      const searchInput = page.getByRole('searchbox');
      await searchInput.fill(typo);
      await searchInput.press('Enter');

      await page.waitForSelector('[data-testid="search-results"]');

      // Option A: Search auto-corrects and shows results
      const resultCount = await page.getByTestId('result-count').textContent();
      const count = parseInt(resultCount || '0', 10);

      if (count > 0) {
        // Verify results are relevant to the corrected term
        const didYouMean = page.getByTestId('did-you-mean');
        if (await didYouMean.isVisible()) {
          const suggestion = await didYouMean.textContent();
          expect(suggestion?.toLowerCase()).toContain(corrected);
        }

        // Results should match what the corrected query would return
        const titles = await page
          .getByTestId('search-result-title')
          .allTextContents();
        const hasRelevantResult = titles.some(
          (t) =>
            t.toLowerCase().includes(corrected) ||
            t.toLowerCase().includes(corrected.split(' ')[0])
        );
        expect(hasRelevantResult).toBe(true);
      } else {
        // Option B: Zero results but shows spelling suggestion
        const didYouMean = page.getByTestId('did-you-mean');
        await expect(didYouMean).toBeVisible();
      }
    });
  }

  test('preserves user query while showing correction', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('javscript');
    await searchInput.press('Enter');

    await page.waitForSelector('[data-testid="search-results"]');

    // The input should still show the original query
    await expect(searchInput).toHaveValue('javscript');

    // But results should be for "javascript"
    const didYouMean = page.getByTestId('did-you-mean');
    if (await didYouMean.isVisible()) {
      await expect(didYouMean).toContainText('javascript');
    }
  });
});
```

### Testing Autocomplete Suggestions

Autocomplete must respond quickly and provide accurate, helpful suggestions as users type.

```typescript
// tests/search/autocomplete/suggestion-accuracy.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Autocomplete Suggestions', () => {
  test('shows suggestions after minimum character threshold', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.getByRole('searchbox');

    // Type one character -- should not trigger autocomplete
    await searchInput.fill('p');
    await page.waitForTimeout(300);
    const suggestionsAfterOne = page.getByTestId('autocomplete-dropdown');
    await expect(suggestionsAfterOne).not.toBeVisible();

    // Type second character -- should trigger autocomplete
    await searchInput.fill('pl');
    await page.waitForTimeout(300);
    await expect(suggestionsAfterOne).toBeVisible();

    const suggestions = await page
      .getByTestId('autocomplete-suggestion')
      .allTextContents();
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(10);
  });

  test('suggestions respond within 200ms', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.getByRole('searchbox');

    const startTime = Date.now();
    await searchInput.fill('test');

    await page.waitForSelector('[data-testid="autocomplete-dropdown"]');
    const elapsed = Date.now() - startTime;

    // Autocomplete must appear within 200ms for good UX
    expect(elapsed).toBeLessThan(200);
  });

  test('suggestions update as user continues typing', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.getByRole('searchbox');

    await searchInput.fill('play');
    await page.waitForSelector('[data-testid="autocomplete-dropdown"]');
    const initialSuggestions = await page
      .getByTestId('autocomplete-suggestion')
      .allTextContents();

    await searchInput.fill('playwright');
    await page.waitForTimeout(300);
    const refinedSuggestions = await page
      .getByTestId('autocomplete-suggestion')
      .allTextContents();

    // Refined suggestions should be a subset or more specific
    expect(refinedSuggestions.length).toBeLessThanOrEqual(
      initialSuggestions.length
    );
  });

  test('keyboard navigation works in autocomplete', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.getByRole('searchbox');

    await searchInput.fill('test');
    await page.waitForSelector('[data-testid="autocomplete-dropdown"]');

    // Arrow down highlights the first suggestion
    await searchInput.press('ArrowDown');
    const firstSuggestion = page
      .getByTestId('autocomplete-suggestion')
      .first();
    await expect(firstSuggestion).toHaveAttribute('aria-selected', 'true');

    // Enter selects the highlighted suggestion
    const suggestionText = await firstSuggestion.textContent();
    await searchInput.press('Enter');
    await expect(searchInput).toHaveValue(suggestionText || '');
  });

  test('escape closes autocomplete dropdown', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.getByRole('searchbox');

    await searchInput.fill('test');
    await page.waitForSelector('[data-testid="autocomplete-dropdown"]');

    await searchInput.press('Escape');
    await expect(
      page.getByTestId('autocomplete-dropdown')
    ).not.toBeVisible();
  });

  test('highlighted terms match query prefix', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.getByRole('searchbox');

    await searchInput.fill('play');
    await page.waitForSelector('[data-testid="autocomplete-dropdown"]');

    // Each suggestion should have the matching portion highlighted
    const highlights = await page
      .locator('[data-testid="autocomplete-suggestion"] mark')
      .allTextContents();

    for (const highlight of highlights) {
      expect(highlight.toLowerCase()).toContain('play');
    }
  });
});
```

### Testing Faceted Filter Combinations

Faceted search allows users to narrow results by multiple dimensions. Filters must compose correctly and display accurate counts.

```typescript
// tests/search/facets/combined-facets.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Faceted Filter Combinations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('testing');
    await searchInput.press('Enter');
    await page.waitForSelector('[data-testid="search-results"]');
  });

  test('single facet reduces result count', async ({ page }) => {
    const initialCount = await getResultCount(page);

    await page.getByTestId('facet-category').getByText('E2E Testing').click();
    await page.waitForSelector('[data-testid="search-results"]');

    const filteredCount = await getResultCount(page);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  test('combining facets applies AND logic', async ({ page }) => {
    // Apply first facet
    await page.getByTestId('facet-category').getByText('E2E Testing').click();
    await page.waitForSelector('[data-testid="search-results"]');
    const afterFirstFacet = await getResultCount(page);

    // Apply second facet
    await page.getByTestId('facet-language').getByText('TypeScript').click();
    await page.waitForSelector('[data-testid="search-results"]');
    const afterSecondFacet = await getResultCount(page);

    expect(afterSecondFacet).toBeLessThanOrEqual(afterFirstFacet);
  });

  test('facet counts update after filtering', async ({ page }) => {
    // Get initial count for a category facet
    const initialFacetCount = await page
      .getByTestId('facet-category')
      .getByText('E2E Testing')
      .locator('..')
      .getByTestId('facet-count')
      .textContent();

    // Apply a different facet
    await page.getByTestId('facet-language').getByText('Python').click();
    await page.waitForSelector('[data-testid="search-results"]');

    // Category facet counts should update
    const updatedFacetCount = await page
      .getByTestId('facet-category')
      .getByText('E2E Testing')
      .locator('..')
      .getByTestId('facet-count')
      .textContent();

    const initial = parseInt(initialFacetCount || '0', 10);
    const updated = parseInt(updatedFacetCount || '0', 10);
    expect(updated).toBeLessThanOrEqual(initial);
  });

  test('removing a facet restores previous result set', async ({ page }) => {
    const initialCount = await getResultCount(page);

    // Apply facet
    await page.getByTestId('facet-category').getByText('E2E Testing').click();
    await page.waitForSelector('[data-testid="search-results"]');

    // Remove facet
    await page.getByTestId('active-filter-E2E Testing').click();
    await page.waitForSelector('[data-testid="search-results"]');

    const restoredCount = await getResultCount(page);
    expect(restoredCount).toBe(initialCount);
  });

  test('clear all filters resets to original results', async ({ page }) => {
    const initialCount = await getResultCount(page);

    // Apply multiple facets
    await page.getByTestId('facet-category').getByText('E2E Testing').click();
    await page.waitForSelector('[data-testid="search-results"]');
    await page.getByTestId('facet-language').getByText('TypeScript').click();
    await page.waitForSelector('[data-testid="search-results"]');

    // Clear all
    await page.getByTestId('clear-all-filters').click();
    await page.waitForSelector('[data-testid="search-results"]');

    const clearedCount = await getResultCount(page);
    expect(clearedCount).toBe(initialCount);
  });
});

async function getResultCount(page: import('@playwright/test').Page): Promise<number> {
  const text = await page.getByTestId('result-count').textContent();
  return parseInt(text || '0', 10);
}
```

### Testing Zero-Results Pages

When search returns no results, the application must provide a helpful experience rather than a dead end.

```typescript
// tests/search/zero-results/empty-state.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Zero Results Handling', () => {
  test('displays helpful message for no results', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('xyznonexistentqueryzyx');
    await searchInput.press('Enter');

    await page.waitForSelector('[data-testid="zero-results"]');

    // Must show a clear "no results" message
    await expect(page.getByTestId('zero-results-message')).toContainText(
      'No results found'
    );

    // Must include the user's query in the message
    await expect(page.getByTestId('zero-results-message')).toContainText(
      'xyznonexistentqueryzyx'
    );
  });

  test('offers spelling suggestions on zero results', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('tesitng framwork');
    await searchInput.press('Enter');

    await page.waitForSelector('[data-testid="zero-results"]');

    const suggestion = page.getByTestId('spelling-suggestion');
    await expect(suggestion).toBeVisible();
    await expect(suggestion).toContainText('testing framework');
  });

  test('shows popular searches on zero results', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('asdfjklzxcv');
    await searchInput.press('Enter');

    await page.waitForSelector('[data-testid="zero-results"]');

    const popularSearches = page.getByTestId('popular-searches');
    await expect(popularSearches).toBeVisible();

    const links = await popularSearches.getByRole('link').all();
    expect(links.length).toBeGreaterThan(0);
  });

  test('zero results page has navigation to browse categories', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('zzz_nothing_matches_this');
    await searchInput.press('Enter');

    await page.waitForSelector('[data-testid="zero-results"]');

    const browseLink = page.getByTestId('browse-categories-link');
    await expect(browseLink).toBeVisible();
    await browseLink.click();

    await expect(page).toHaveURL(/\/categories/);
  });
});
```

### Testing Search Result Pagination

Pagination must maintain sort order, correctly handle deep page navigation, and preserve applied filters.

```typescript
// tests/search/pagination/result-pages.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Search Result Pagination', () => {
  test('pagination controls appear when results exceed page size', async ({ page }) => {
    await page.goto('/search?q=testing');
    await page.waitForSelector('[data-testid="search-results"]');

    const resultCount = await page.getByTestId('result-count').textContent();
    const count = parseInt(resultCount || '0', 10);

    if (count > 20) {
      await expect(page.getByTestId('pagination')).toBeVisible();
      await expect(page.getByTestId('page-next')).toBeEnabled();
    }
  });

  test('navigating pages shows different results', async ({ page }) => {
    await page.goto('/search?q=testing');
    await page.waitForSelector('[data-testid="search-results"]');

    const firstPageResults = await page
      .getByTestId('search-result-title')
      .allTextContents();

    await page.getByTestId('page-next').click();
    await page.waitForSelector('[data-testid="search-results"]');

    const secondPageResults = await page
      .getByTestId('search-result-title')
      .allTextContents();

    // Pages must show different results
    expect(firstPageResults).not.toEqual(secondPageResults);
  });

  test('sort order persists across pages', async ({ page }) => {
    await page.goto('/search?q=testing&sort=date-desc');
    await page.waitForSelector('[data-testid="search-results"]');

    // Get date of last result on page 1
    const lastDatePage1 = await page
      .getByTestId('search-result-date')
      .last()
      .textContent();

    await page.getByTestId('page-next').click();
    await page.waitForSelector('[data-testid="search-results"]');

    // Get date of first result on page 2
    const firstDatePage2 = await page
      .getByTestId('search-result-date')
      .first()
      .textContent();

    // Dates should be in descending order across the page boundary
    const date1 = new Date(lastDatePage1 || '');
    const date2 = new Date(firstDatePage2 || '');
    expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
  });

  test('filters persist across page navigation', async ({ page }) => {
    await page.goto('/search?q=testing');
    await page.waitForSelector('[data-testid="search-results"]');

    // Apply a filter
    await page.getByTestId('facet-category').getByText('Unit Testing').click();
    await page.waitForSelector('[data-testid="search-results"]');

    // Navigate to page 2
    await page.getByTestId('page-next').click();
    await page.waitForSelector('[data-testid="search-results"]');

    // Filter should still be active
    await expect(
      page.getByTestId('active-filter-Unit Testing')
    ).toBeVisible();
  });
});
```

### Testing Special Character Handling and Security

Search inputs must be sanitized to prevent injection attacks while still supporting legitimate special-character queries.

```typescript
// tests/search/security/special-characters.spec.ts
import { test, expect } from '@playwright/test';
import { specialCharacterQueries } from '../fixtures/search-test-data';

test.describe('Special Character Handling', () => {
  for (const query of specialCharacterQueries) {
    test(`handles special characters: "${query.substring(0, 30)}..."`, async ({ page }) => {
      await page.goto('/search');
      const searchInput = page.getByRole('searchbox');
      await searchInput.fill(query);
      await searchInput.press('Enter');

      // Must not throw a 500 error
      const response = await page.waitForResponse(
        (resp) => resp.url().includes('/api/search') || resp.url().includes('/search'),
        { timeout: 5000 }
      );
      expect(response.status()).toBeLessThan(500);

      // Page must still be functional
      await expect(page.getByRole('searchbox')).toBeVisible();
    });
  }

  test('XSS payloads are sanitized in search results', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('<img src=x onerror=alert(1)>');
    await searchInput.press('Enter');

    // Wait for results or zero-results state
    await page.waitForSelector(
      '[data-testid="search-results"], [data-testid="zero-results"]'
    );

    // Verify no script execution occurred
    const alerts: string[] = [];
    page.on('dialog', (dialog) => {
      alerts.push(dialog.message());
      dialog.dismiss();
    });
    await page.waitForTimeout(1000);
    expect(alerts.length).toBe(0);

    // Verify the payload is not rendered as HTML
    const pageContent = await page.content();
    expect(pageContent).not.toContain('<img src=x onerror');
  });

  test('SQL injection payloads return safe responses', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill("'; DROP TABLE products; --");
    await searchInput.press('Enter');

    // Should return zero results or matching results, not an error
    await page.waitForSelector(
      '[data-testid="search-results"], [data-testid="zero-results"]'
    );

    // Page should be fully functional after the injection attempt
    await searchInput.clear();
    await searchInput.fill('headphones');
    await searchInput.press('Enter');
    await page.waitForSelector('[data-testid="search-results"]');

    const resultCount = await page.getByTestId('result-count').textContent();
    const count = parseInt(resultCount || '0', 10);
    expect(count).toBeGreaterThan(0);
  });
});
```

### Testing Search Performance Under Load

Search latency degrades user experience quickly. Measure response times and validate they remain within budget under realistic conditions.

```typescript
// tests/search/performance/latency.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Search Performance', () => {
  const LATENCY_BUDGET_MS = 500;

  test('search responds within latency budget', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.getByRole('searchbox');

    const queries = ['testing', 'playwright automation', 'performance testing tools'];

    for (const query of queries) {
      const startTime = Date.now();
      await searchInput.fill(query);
      await searchInput.press('Enter');
      await page.waitForSelector('[data-testid="search-results"]');
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(LATENCY_BUDGET_MS);
      await searchInput.clear();
    }
  });

  test('API search endpoint responds within budget', async ({ request }) => {
    const queries = ['unit testing', 'api testing', 'selenium'];

    for (const query of queries) {
      const startTime = Date.now();
      const response = await request.get(`/api/search?q=${encodeURIComponent(query)}`);
      const elapsed = Date.now() - startTime;

      expect(response.status()).toBe(200);
      expect(elapsed).toBeLessThan(300); // API should be faster than UI

      const body = await response.json();
      expect(body.results).toBeDefined();
    }
  });
});
```

### Testing Search Analytics Event Tracking

Every search action should emit analytics events for monitoring and improvement.

```typescript
// tests/search/analytics/event-tracking.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Search Analytics Tracking', () => {
  test('search query emits analytics event', async ({ page }) => {
    const analyticsEvents: any[] = [];

    // Intercept analytics calls
    await page.route('**/api/telemetry/**', async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        const body = request.postDataJSON();
        analyticsEvents.push(body);
      }
      await route.fulfill({ status: 200, body: '{}' });
    });

    await page.goto('/search');
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('playwright');
    await searchInput.press('Enter');
    await page.waitForSelector('[data-testid="search-results"]');

    // Allow time for async analytics to fire
    await page.waitForTimeout(1000);

    const searchEvent = analyticsEvents.find(
      (e) => e.event === 'search' || e.event === 'search_query'
    );
    expect(searchEvent).toBeDefined();
    expect(searchEvent.properties?.query).toBe('playwright');
  });

  test('result click emits click-through event with position', async ({ page }) => {
    const analyticsEvents: any[] = [];

    await page.route('**/api/telemetry/**', async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        const body = request.postDataJSON();
        analyticsEvents.push(body);
      }
      await route.fulfill({ status: 200, body: '{}' });
    });

    await page.goto('/search?q=testing');
    await page.waitForSelector('[data-testid="search-results"]');

    // Click the second result
    await page.getByTestId('search-result').nth(1).click();
    await page.waitForTimeout(1000);

    const clickEvent = analyticsEvents.find(
      (e) => e.event === 'search_result_click'
    );
    expect(clickEvent).toBeDefined();
    expect(clickEvent.properties?.position).toBe(2);
    expect(clickEvent.properties?.query).toBe('testing');
  });
});
```

### Testing Highlighted/Bolded Term Matching

Search result snippets should highlight the matching query terms to help users quickly assess relevance.

```typescript
// tests/search/relevance/highlight-matching.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Search Term Highlighting', () => {
  test('query terms are highlighted in result titles', async ({ page }) => {
    await page.goto('/search?q=playwright');
    await page.waitForSelector('[data-testid="search-results"]');

    const highlights = await page
      .getByTestId('search-result-title')
      .first()
      .locator('mark, strong, em.highlight')
      .allTextContents();

    expect(highlights.length).toBeGreaterThan(0);
    expect(highlights.some((h) => h.toLowerCase().includes('playwright'))).toBe(true);
  });

  test('multi-word queries highlight each term', async ({ page }) => {
    await page.goto('/search?q=playwright+testing');
    await page.waitForSelector('[data-testid="search-results"]');

    const allHighlights = await page
      .locator('[data-testid="search-result"] mark')
      .allTextContents();

    const highlightedText = allHighlights.join(' ').toLowerCase();
    expect(highlightedText).toContain('playwright');
    expect(highlightedText).toContain('testing');
  });

  test('highlights do not break HTML structure', async ({ page }) => {
    await page.goto('/search?q=<b>test</b>');
    await page.waitForSelector(
      '[data-testid="search-results"], [data-testid="zero-results"]'
    );

    // Ensure no raw HTML tags appear in rendered text
    const resultArea = page.getByTestId('search-results');
    if (await resultArea.isVisible()) {
      const text = await resultArea.textContent();
      expect(text).not.toContain('<b>');
      expect(text).not.toContain('</b>');
    }
  });
});
```

## Best Practices

1. **Use data-driven test cases** -- Define expected search results in fixture files rather than hardcoding them in tests. This makes it easy to update expectations when the search index changes and enables non-developers to maintain test data.

2. **Test relevance with ranked assertions** -- Do not just check that a result appears somewhere in the list. Assert that it appears in the top N positions. Relevance regression often manifests as correct results dropping below the fold.

3. **Separate relevance tests from functional tests** -- Relevance tests are inherently more fragile because they depend on indexed content. Keep them in a dedicated suite with their own fixtures so they can be run independently.

4. **Use stable test data** -- Seed a known dataset before running search tests rather than relying on production data. This eliminates flakiness caused by content changes and ensures consistent relevance rankings.

5. **Test both the API and the UI** -- Search API tests are faster and more precise for verifying ranking logic. UI tests are necessary for verifying autocomplete interactions, highlighting, and facet controls. Use both layers strategically.

6. **Measure search latency in CI** -- Add performance assertions to your CI pipeline. Search latency regressions are subtle and accumulate over time. A 500ms budget that fails the build prevents gradual degradation.

7. **Test facets with realistic combinations** -- Users apply multiple filters simultaneously. Test the most common two-facet and three-facet combinations, not just individual facets in isolation.

8. **Verify facet counts match actual results** -- A facet showing "TypeScript (15)" must produce exactly 15 results when clicked. Mismatched counts erode user trust in the search interface.

9. **Test autocomplete debouncing** -- Autocomplete should debounce rapid keystrokes to avoid overwhelming the server. Verify that typing quickly does not produce stale or out-of-order suggestions.

10. **Handle empty queries gracefully** -- Submitting an empty search should either show trending/popular results or display a helpful message, never an error or completely blank page.

11. **Test search URL state** -- Search queries, filters, sort order, and page number should be reflected in the URL. Users expect to share search URLs and use the browser back button to return to previous searches.

12. **Validate accessibility of search components** -- The search input must have proper ARIA labels. Autocomplete dropdowns must support keyboard navigation with correct `aria-expanded`, `aria-activedescendant`, and `role="listbox"` attributes.

## Anti-Patterns to Avoid

1. **Asserting exact result counts** -- Search indices change frequently. Asserting `expect(count).toBe(47)` will break whenever content is added or removed. Use range assertions like `toBeGreaterThan(10)` or `toBeLessThan(100)` instead.

2. **Ignoring search debounce in tests** -- Failing to account for autocomplete debounce timing leads to tests that pass locally but fail in CI. Always wait for the debounce period or intercept the underlying API call rather than using fixed timeouts.

3. **Testing relevance against production data** -- Production data changes constantly. A test that passes today will fail tomorrow when new content is indexed. Always seed a controlled dataset for relevance tests.

4. **Hardcoding page sizes** -- If the application changes its default page size from 20 to 25, hardcoded assertions will break. Read the page size from configuration or infer it from the results.

5. **Skipping zero-results scenarios** -- The zero-results page is often the most neglected UX surface. Users who see a blank dead end will leave. Always test what happens when no results match.

6. **Testing only happy-path queries** -- Real users type misspelled words, paste URLs into search boxes, enter single characters, and submit empty forms. Test the full spectrum of realistic and adversarial inputs.

7. **Ignoring search result snippet quality** -- Search results often show a snippet or excerpt. If the snippet does not contain the query terms, the result appears irrelevant even when it is not. Verify snippet content alongside title matching.

## Debugging Tips

- **Stale search index**: If relevance tests fail unexpectedly, check whether the search index has been rebuilt after recent data changes. Most search engines (Typesense, Elasticsearch, Algolia) have a reindexing delay.

- **Autocomplete timing failures**: If autocomplete tests fail intermittently, increase the debounce wait or switch to intercepting the API response with `page.waitForResponse()` instead of using `waitForTimeout()`.

- **Facet count mismatches**: When facet counts do not match actual results, check whether the search engine is using cached facet counts from a previous index state. Force a cache invalidation or reindex before running facet tests.

- **Encoding issues in URL state**: If search queries with special characters break when loaded from URLs, verify that the application properly encodes and decodes query parameters using `encodeURIComponent` / `decodeURIComponent`.

- **Flaky relevance order**: If the same query sometimes returns results in different orders, check whether the search engine uses a tie-breaking strategy for equally scored results. Add a secondary sort by ID or date to ensure deterministic ordering.

- **Performance test variance**: Search latency measurements can vary due to cold starts, garbage collection, and network conditions. Run performance tests multiple times and use the median rather than a single measurement. Consider warming up the search engine with a few queries before measuring.

- **Highlighting breaks with special regex characters**: If highlight markup is missing for queries containing regex metacharacters (`.`, `*`, `+`, `?`), verify that the search engine escapes these characters before applying highlight patterns.

- **Mobile autocomplete differences**: On mobile devices, the virtual keyboard may obscure the autocomplete dropdown. Test autocomplete visibility and interaction on mobile viewports using Playwright's device emulation.
