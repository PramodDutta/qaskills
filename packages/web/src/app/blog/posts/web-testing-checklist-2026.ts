import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Web Testing Checklist 2026: 150+ Test Cases Every QA Engineer Needs',
  description:
    'The ultimate web testing checklist with 150+ test cases organized by category. Covers functional testing, UI/UX, forms, auth, payments, accessibility, performance, security, SEO, cross-browser, and mobile web testing.',
  date: '2026-05-18',
  category: 'Guide',
  content: `
Every web application needs thorough testing before it reaches users. This comprehensive checklist provides 150+ test cases organized by category, each tagged with a priority level (P0 for critical, P1 for high, P2 for medium). Use this as a living reference for your QA process, whether you are testing manually, writing automated tests, or reviewing test coverage.

## How to Use This Checklist

**Priority levels:**
- **P0 (Critical)**: Must pass before any release. Blocking bugs. Test these first and automate them immediately
- **P1 (High)**: Should pass for every release. Important functionality that affects most users
- **P2 (Medium)**: Test regularly but acceptable to defer in time-constrained releases

**Automation recommendation:**
- P0 tests should always be automated and run in CI/CD
- P1 tests should be automated and run nightly or on every PR
- P2 tests can be a mix of automated and manual exploratory testing

---

## 1. Functional Testing Checklist

### Navigation and Routing

| # | Test Case | Priority |
|---|-----------|----------|
| 1 | All navigation links point to the correct pages | P0 |
| 2 | Browser back and forward buttons work correctly | P1 |
| 3 | Deep links (direct URL access) load the correct page | P0 |
| 4 | 404 page displays for invalid URLs | P1 |
| 5 | Redirects work correctly (HTTP to HTTPS, www to non-www) | P0 |
| 6 | URL parameters are preserved through navigation | P1 |
| 7 | Breadcrumb navigation reflects the current location | P2 |
| 8 | Anchor links scroll to the correct section | P2 |
| 9 | Pagination works correctly (next, previous, page numbers) | P1 |
| 10 | Infinite scroll loads additional content correctly | P1 |

### Search Functionality

| # | Test Case | Priority |
|---|-----------|----------|
| 11 | Search returns relevant results for valid queries | P0 |
| 12 | Search handles empty queries gracefully | P1 |
| 13 | Search displays "no results" message appropriately | P1 |
| 14 | Search results highlight matching terms | P2 |
| 15 | Search filters work correctly (category, date, type) | P1 |
| 16 | Search handles special characters without errors | P1 |
| 17 | Search suggestions or autocomplete work correctly | P2 |
| 18 | Search results pagination works correctly | P1 |
| 19 | Search preserves the query when navigating back | P2 |
| 20 | Search performance is acceptable (results in under 2 seconds) | P1 |

### Data Display

| # | Test Case | Priority |
|---|-----------|----------|
| 21 | Lists and tables display data correctly | P0 |
| 22 | Sorting works in both ascending and descending order | P1 |
| 23 | Filtering removes non-matching items correctly | P1 |
| 24 | Empty states display a helpful message | P1 |
| 25 | Loading states display while data is being fetched | P1 |
| 26 | Error states display when data fetch fails | P0 |
| 27 | Large datasets handle pagination or virtualization | P1 |
| 28 | Date and time values display in the correct timezone | P1 |
| 29 | Currency values display with proper formatting | P1 |
| 30 | Numbers use appropriate decimal and thousands separators | P2 |

---

## 2. UI/UX Testing Checklist

### Visual Consistency

| # | Test Case | Priority |
|---|-----------|----------|
| 31 | Font sizes and families are consistent across pages | P1 |
| 32 | Color scheme matches the design system | P1 |
| 33 | Spacing and alignment follow the design specifications | P2 |
| 34 | Icons render correctly at all sizes | P2 |
| 35 | Images load with proper aspect ratios (no stretching) | P1 |
| 36 | Dark mode and light mode toggle correctly | P1 |
| 37 | Hover states are visible on interactive elements | P2 |
| 38 | Focus states are visible for keyboard navigation | P0 |
| 39 | Active/selected states are clearly distinguishable | P1 |
| 40 | Disabled states are visually distinct from enabled states | P1 |

### Responsive Design

| # | Test Case | Priority |
|---|-----------|----------|
| 41 | Layout adapts correctly at mobile breakpoint (320-480px) | P0 |
| 42 | Layout adapts correctly at tablet breakpoint (481-768px) | P1 |
| 43 | Layout adapts correctly at desktop breakpoint (769-1024px) | P1 |
| 44 | Layout adapts correctly at large desktop (1025px and above) | P1 |
| 45 | No horizontal scrollbar appears at any standard breakpoint | P0 |
| 46 | Text remains readable at all screen sizes | P0 |
| 47 | Touch targets are at least 44x44 pixels on mobile | P1 |
| 48 | Navigation transforms to a mobile menu at small screens | P0 |
| 49 | Images scale appropriately without pixelation | P1 |
| 50 | Tables are scrollable or stack on small screens | P1 |

### User Interaction

| # | Test Case | Priority |
|---|-----------|----------|
| 51 | Buttons provide visual feedback on click | P1 |
| 52 | Loading indicators appear for async operations | P1 |
| 53 | Success messages display after completed actions | P1 |
| 54 | Error messages are clear and actionable | P0 |
| 55 | Confirmation dialogs appear for destructive actions | P0 |
| 56 | Undo functionality works where applicable | P2 |
| 57 | Tooltips display on hover for elements that need explanation | P2 |
| 58 | Modals can be closed with the Escape key | P1 |
| 59 | Modals can be closed by clicking the overlay | P2 |
| 60 | Toast notifications auto-dismiss after appropriate duration | P2 |

---

## 3. Form Validation Checklist

### Input Fields

| # | Test Case | Priority |
|---|-----------|----------|
| 61 | Required fields show validation errors when empty | P0 |
| 62 | Email fields validate email format | P0 |
| 63 | Phone number fields accept valid formats | P1 |
| 64 | Password fields enforce minimum length | P0 |
| 65 | Password fields enforce complexity requirements | P1 |
| 66 | Numeric fields reject non-numeric input | P1 |
| 67 | Date fields validate date format and ranges | P1 |
| 68 | URL fields validate URL format | P2 |
| 69 | Maximum character limits are enforced | P1 |
| 70 | Minimum character limits are enforced | P1 |

### Form Behavior

| # | Test Case | Priority |
|---|-----------|----------|
| 71 | Form cannot be submitted with invalid data | P0 |
| 72 | Validation errors display next to the relevant field | P0 |
| 73 | Validation errors clear when the user corrects the input | P1 |
| 74 | Submit button is disabled during form submission | P1 |
| 75 | Double-click on submit does not create duplicate entries | P0 |
| 76 | Form preserves input on validation failure (no data loss) | P0 |
| 77 | Tab order follows a logical sequence through form fields | P1 |
| 78 | Autofill works correctly for common fields | P2 |
| 79 | Copy-paste works in all input fields | P1 |
| 80 | Form submission works with Enter key | P1 |

### File Uploads

| # | Test Case | Priority |
|---|-----------|----------|
| 81 | Allowed file types are accepted | P0 |
| 82 | Rejected file types show a clear error message | P0 |
| 83 | File size limits are enforced | P1 |
| 84 | Multiple file upload works if supported | P1 |
| 85 | Upload progress indicator is visible | P1 |
| 86 | Drag and drop upload works | P2 |
| 87 | File preview displays after upload | P2 |
| 88 | Upload cancellation works correctly | P2 |

---

## 4. Authentication Flow Checklist

### Login

| # | Test Case | Priority |
|---|-----------|----------|
| 89 | Login with valid credentials succeeds | P0 |
| 90 | Login with invalid password shows error | P0 |
| 91 | Login with non-existent account shows appropriate error | P0 |
| 92 | Account lockout after multiple failed attempts | P0 |
| 93 | Remember me functionality works across browser sessions | P1 |
| 94 | Login redirects to the originally requested page | P1 |
| 95 | Social login (Google, GitHub) works correctly | P1 |
| 96 | Two-factor authentication flow works correctly | P0 |
| 97 | Session expires after the configured timeout | P1 |
| 98 | Concurrent session handling works as designed | P1 |

### Registration

| # | Test Case | Priority |
|---|-----------|----------|
| 99 | Registration with valid data creates a new account | P0 |
| 100 | Duplicate email registration shows appropriate error | P0 |
| 101 | Email verification flow works correctly | P0 |
| 102 | Password strength indicator updates in real time | P2 |
| 103 | Terms and conditions acceptance is required | P1 |
| 104 | Registration confirmation email is received | P1 |

### Password Management

| # | Test Case | Priority |
|---|-----------|----------|
| 105 | Forgot password sends reset email | P0 |
| 106 | Password reset link works correctly | P0 |
| 107 | Password reset link expires after timeout | P1 |
| 108 | Password change requires current password | P0 |
| 109 | New password cannot match the old password | P2 |
| 110 | Password visibility toggle works | P2 |

### Session and Logout

| # | Test Case | Priority |
|---|-----------|----------|
| 111 | Logout clears the session completely | P0 |
| 112 | After logout, back button does not show authenticated pages | P0 |
| 113 | Session token is invalidated on logout | P0 |
| 114 | Multiple tab behavior is consistent after logout | P1 |

---

## 5. Payment Flow Checklist

| # | Test Case | Priority |
|---|-----------|----------|
| 115 | Valid credit card payment processes successfully | P0 |
| 116 | Declined card shows appropriate error message | P0 |
| 117 | Expired card shows appropriate error message | P0 |
| 118 | Payment amount matches the order total | P0 |
| 119 | Tax calculation is correct for the shipping address | P0 |
| 120 | Discount codes apply correctly | P1 |
| 121 | Discount codes validate expiration and eligibility | P1 |
| 122 | Payment receipt is sent via email | P1 |
| 123 | Refund process works correctly | P0 |
| 124 | Currency display matches the user's locale | P1 |
| 125 | Payment retry works after a failed attempt | P1 |
| 126 | 3D Secure authentication flow completes correctly | P0 |
| 127 | Payment confirmation page displays order details | P1 |
| 128 | Order appears in the user's order history | P1 |

---

## 6. Accessibility Testing Checklist (WCAG 2.2)

### Perceivable

| # | Test Case | Priority |
|---|-----------|----------|
| 129 | All images have descriptive alt text | P0 |
| 130 | Color contrast ratio meets AA standard (4.5:1 for text) | P0 |
| 131 | Information is not conveyed by color alone | P0 |
| 132 | Text can be resized to 200% without loss of content | P1 |
| 133 | Videos have captions or transcripts | P1 |
| 134 | Audio content has text alternatives | P1 |

### Operable

| # | Test Case | Priority |
|---|-----------|----------|
| 135 | All functionality is accessible via keyboard | P0 |
| 136 | Focus order follows a logical reading sequence | P0 |
| 137 | Focus indicator is visible on all interactive elements | P0 |
| 138 | No keyboard trap exists (user can tab away from any element) | P0 |
| 139 | Skip navigation link is present and functional | P1 |
| 140 | Page has no content that flashes more than 3 times per second | P0 |
| 141 | Touch target size is at least 24x24 CSS pixels (WCAG 2.2) | P1 |
| 142 | Drag actions have single-pointer alternatives (WCAG 2.2) | P1 |

### Understandable

| # | Test Case | Priority |
|---|-----------|----------|
| 143 | Page language is declared in HTML lang attribute | P0 |
| 144 | Form labels are associated with their input fields | P0 |
| 145 | Error messages identify the field and describe the error | P0 |
| 146 | Navigation is consistent across pages | P1 |
| 147 | Help text is available for complex form fields | P2 |

### Robust

| # | Test Case | Priority |
|---|-----------|----------|
| 148 | HTML validates without major errors | P1 |
| 149 | ARIA roles and properties are used correctly | P1 |
| 150 | Screen reader can navigate and read all content | P0 |
| 151 | Dynamic content updates are announced to assistive technology | P1 |
| 152 | Custom components have appropriate ARIA roles | P1 |

### Automated Accessibility Testing

Run automated accessibility checks as part of your test suite:

\`\`\`typescript
// Playwright with axe-core
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test('homepage has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('form page meets accessibility standards', async ({ page }) => {
  await page.goto('/contact');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
\`\`\`

**Note:** Automated tools catch approximately 30-40% of accessibility issues. Manual testing with screen readers and keyboard-only navigation is essential for full coverage.

---

## 7. Performance Testing Checklist (Core Web Vitals)

### Core Web Vitals (2026 Thresholds)

| # | Test Case | Priority |
|---|-----------|----------|
| 153 | Largest Contentful Paint (LCP) is under 2.5 seconds | P0 |
| 154 | Interaction to Next Paint (INP) is under 200 milliseconds | P0 |
| 155 | Cumulative Layout Shift (CLS) is under 0.1 | P0 |
| 156 | First Contentful Paint (FCP) is under 1.8 seconds | P1 |
| 157 | Time to First Byte (TTFB) is under 800 milliseconds | P1 |

### Load Performance

| # | Test Case | Priority |
|---|-----------|----------|
| 158 | Page loads within 3 seconds on 4G connection | P0 |
| 159 | Page loads within 5 seconds on 3G connection | P1 |
| 160 | Total page weight is under 3MB (initial load) | P1 |
| 161 | JavaScript bundle size is under 500KB (gzipped) | P1 |
| 162 | Images are optimized and served in modern formats (WebP/AVIF) | P1 |
| 163 | Lazy loading is implemented for below-the-fold images | P1 |
| 164 | Critical CSS is inlined for above-the-fold content | P2 |
| 165 | Third-party scripts do not block rendering | P1 |

### Runtime Performance

| # | Test Case | Priority |
|---|-----------|----------|
| 166 | Scrolling is smooth (60fps) | P1 |
| 167 | Animations do not cause layout shifts | P1 |
| 168 | Form interactions respond within 100 milliseconds | P0 |
| 169 | No memory leaks during extended usage | P1 |
| 170 | API responses complete within SLA (typically under 1 second) | P0 |

### Performance Testing with Playwright

\`\`\`typescript
test('page performance meets thresholds', async ({ page }) => {
  await page.goto('/');

  const performanceMetrics = await page.evaluate(() => {
    const entries = performance.getEntriesByType('navigation');
    const nav = entries[0] as PerformanceNavigationTiming;
    return {
      ttfb: nav.responseStart - nav.requestStart,
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      loadComplete: nav.loadEventEnd - nav.startTime,
    };
  });

  expect(performanceMetrics.ttfb).toBeLessThan(800);
  expect(performanceMetrics.loadComplete).toBeLessThan(3000);
});
\`\`\`

---

## 8. Security Testing Checklist (OWASP)

### Input Validation

| # | Test Case | Priority |
|---|-----------|----------|
| 171 | SQL injection attempts are blocked in all input fields | P0 |
| 172 | XSS (Cross-Site Scripting) attempts are blocked | P0 |
| 173 | CSRF protection tokens are present on all forms | P0 |
| 174 | Input length limits prevent buffer overflow attempts | P1 |
| 175 | File upload validates content type (not just extension) | P0 |
| 176 | Server-side validation matches client-side validation | P0 |

### Authentication and Authorization

| # | Test Case | Priority |
|---|-----------|----------|
| 177 | Passwords are never stored in plain text | P0 |
| 178 | Session tokens are regenerated after login | P0 |
| 179 | Session cookies have Secure, HttpOnly, and SameSite flags | P0 |
| 180 | Unauthorized users cannot access protected resources | P0 |
| 181 | API endpoints enforce proper authorization checks | P0 |
| 182 | Rate limiting is applied to login and registration endpoints | P0 |
| 183 | JWT tokens have reasonable expiration times | P1 |
| 184 | Sensitive operations require re-authentication | P1 |

### Data Protection

| # | Test Case | Priority |
|---|-----------|----------|
| 185 | All traffic uses HTTPS (HTTP redirects to HTTPS) | P0 |
| 186 | HSTS header is present with appropriate max-age | P0 |
| 187 | Sensitive data is not exposed in URLs | P0 |
| 188 | API responses do not leak internal implementation details | P1 |
| 189 | Error messages do not expose stack traces or system info | P0 |
| 190 | Content-Security-Policy header is configured | P1 |
| 191 | X-Content-Type-Options: nosniff is set | P1 |
| 192 | X-Frame-Options or CSP frame-ancestors prevents clickjacking | P1 |

### Common Security Headers Check

\`\`\`typescript
test('security headers are present', async ({ request }) => {
  const response = await request.get('/');
  const headers = response.headers();

  expect(headers['strict-transport-security']).toBeDefined();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBeDefined();
  expect(headers['content-security-policy']).toBeDefined();
  expect(headers['referrer-policy']).toBeDefined();
});
\`\`\`

---

## 9. SEO Testing Checklist

### On-Page SEO

| # | Test Case | Priority |
|---|-----------|----------|
| 193 | Each page has a unique title tag (50-60 characters) | P0 |
| 194 | Each page has a unique meta description (150-160 characters) | P0 |
| 195 | Heading hierarchy is correct (single H1, proper nesting) | P1 |
| 196 | Images have descriptive alt attributes | P1 |
| 197 | URLs are clean and descriptive (no query string for content pages) | P1 |
| 198 | Canonical tags are present on all pages | P0 |
| 199 | Open Graph tags are present for social sharing | P1 |
| 200 | Structured data (JSON-LD) is valid and present | P1 |

### Technical SEO

| # | Test Case | Priority |
|---|-----------|----------|
| 201 | robots.txt is present and correctly configured | P0 |
| 202 | XML sitemap is present and includes all important pages | P0 |
| 203 | XML sitemap validates against the schema | P1 |
| 204 | No noindex tag on pages that should be indexed | P0 |
| 205 | Internal links use proper anchor text (not "click here") | P2 |
| 206 | No broken internal links (404s) | P1 |
| 207 | Redirect chains are under 3 hops | P2 |
| 208 | Page renders meaningful content without JavaScript for crawlers | P1 |

### Automated SEO Testing

\`\`\`typescript
test('homepage has proper SEO metadata', async ({ page }) => {
  await page.goto('/');

  const title = await page.title();
  expect(title.length).toBeGreaterThan(20);
  expect(title.length).toBeLessThan(70);

  const description = await page.getAttribute(
    'meta[name="description"]',
    'content'
  );
  expect(description).toBeTruthy();
  expect(description!.length).toBeGreaterThan(50);
  expect(description!.length).toBeLessThan(170);

  const h1Count = await page.locator('h1').count();
  expect(h1Count).toBe(1);

  const canonical = await page.getAttribute(
    'link[rel="canonical"]',
    'href'
  );
  expect(canonical).toBeTruthy();

  const ogTitle = await page.getAttribute(
    'meta[property="og:title"]',
    'content'
  );
  expect(ogTitle).toBeTruthy();
});
\`\`\`

---

## 10. Cross-Browser Testing Checklist

### Browser Coverage

| # | Test Case | Priority |
|---|-----------|----------|
| 209 | Chrome (latest 2 versions) | P0 |
| 210 | Firefox (latest 2 versions) | P1 |
| 211 | Safari (latest 2 versions) | P1 |
| 212 | Edge (latest 2 versions) | P1 |
| 213 | Safari on iOS (latest 2 versions) | P0 |
| 214 | Chrome on Android (latest 2 versions) | P0 |

### Cross-Browser Specific Checks

| # | Test Case | Priority |
|---|-----------|----------|
| 215 | CSS Grid and Flexbox layout renders correctly in all browsers | P1 |
| 216 | Custom fonts load and display correctly | P1 |
| 217 | Form elements render acceptably in all browsers | P1 |
| 218 | Date picker works in all browsers | P1 |
| 219 | Video and audio playback works in all browsers | P1 |
| 220 | Smooth scrolling behavior is consistent | P2 |
| 221 | CSS animations and transitions work correctly | P2 |
| 222 | JavaScript APIs used are supported in all target browsers | P0 |
| 223 | Web Storage (localStorage/sessionStorage) works correctly | P1 |
| 224 | Cookie handling is consistent across browsers | P1 |

### Playwright Cross-Browser Config

\`\`\`typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 15'] },
    },
  ],
});
\`\`\`

---

## 11. Mobile Web Testing Checklist

### Touch Interactions

| # | Test Case | Priority |
|---|-----------|----------|
| 225 | Tap interactions work correctly on all buttons | P0 |
| 226 | Swipe gestures work where implemented | P1 |
| 227 | Pinch-to-zoom works on images and maps | P2 |
| 228 | Long press actions work where implemented | P2 |
| 229 | No accidental taps due to elements being too close together | P1 |
| 230 | Pull-to-refresh works where implemented | P2 |

### Mobile-Specific Behavior

| # | Test Case | Priority |
|---|-----------|----------|
| 231 | Virtual keyboard does not obscure active input field | P0 |
| 232 | Landscape orientation works correctly | P1 |
| 233 | Portrait orientation works correctly | P0 |
| 234 | Page handles orientation changes gracefully | P1 |
| 235 | Viewport meta tag is set correctly | P0 |
| 236 | Phone numbers are clickable (tel: links) | P1 |
| 237 | Email addresses are clickable (mailto: links) | P2 |
| 238 | Maps link to the native maps application | P2 |
| 239 | App install banners display at appropriate times | P2 |
| 240 | Mobile navigation menu opens and closes correctly | P0 |

### Mobile Performance

| # | Test Case | Priority |
|---|-----------|----------|
| 241 | Page loads within 5 seconds on 4G mobile connection | P0 |
| 242 | Critical above-the-fold content loads within 2 seconds | P0 |
| 243 | Touch interactions respond within 100 milliseconds | P0 |
| 244 | Scrolling is smooth without jank | P1 |
| 245 | Battery-intensive animations can be reduced | P2 |

---

## 12. API Integration Testing Checklist

| # | Test Case | Priority |
|---|-----------|----------|
| 246 | API returns correct data for valid requests | P0 |
| 247 | API returns appropriate error codes for invalid requests | P0 |
| 248 | API response time is within SLA | P0 |
| 249 | API handles concurrent requests correctly | P1 |
| 250 | API rate limiting works as configured | P1 |
| 251 | API pagination returns correct subsets of data | P1 |
| 252 | API authentication rejects expired tokens | P0 |
| 253 | API validates all input parameters | P0 |
| 254 | API responses match the documented schema | P1 |
| 255 | API handles large payloads gracefully | P1 |
| 256 | API CORS headers are configured correctly | P1 |
| 257 | API versioning works (v1, v2 endpoints) | P1 |

---

## 13. Email Testing Checklist

| # | Test Case | Priority |
|---|-----------|----------|
| 258 | Transactional emails are sent within expected timeframe | P0 |
| 259 | Email content is correct and personalized | P0 |
| 260 | Email links point to the correct pages | P0 |
| 261 | Unsubscribe link works correctly | P0 |
| 262 | Email renders correctly in major email clients | P1 |
| 263 | Email does not land in spam folder | P1 |
| 264 | Email attachments are correct and accessible | P1 |
| 265 | Email subject line is correct and not truncated | P1 |

---

## 14. Error Handling and Edge Cases

| # | Test Case | Priority |
|---|-----------|----------|
| 266 | Application handles network disconnection gracefully | P0 |
| 267 | Application handles slow network connections | P1 |
| 268 | Application handles server errors (500) with a user-friendly message | P0 |
| 269 | Application handles timeout errors appropriately | P1 |
| 270 | Long text strings do not break layouts | P1 |
| 271 | Empty strings are handled correctly in all fields | P1 |
| 272 | Maximum integer values do not cause overflow | P2 |
| 273 | Unicode and emoji characters display correctly | P1 |
| 274 | Right-to-left (RTL) text renders correctly if supported | P2 |
| 275 | Concurrent user operations do not cause data corruption | P0 |
| 276 | Browser tab losing focus and regaining it works correctly | P1 |
| 277 | Application recovers gracefully after browser crash | P2 |

---

## 15. Localization and Internationalization

| # | Test Case | Priority |
|---|-----------|----------|
| 278 | All user-facing strings are translated | P0 |
| 279 | Date formats match the locale (MM/DD/YYYY vs DD/MM/YYYY) | P1 |
| 280 | Number formats match the locale (1,000.00 vs 1.000,00) | P1 |
| 281 | Currency symbols and formats are correct | P1 |
| 282 | Translated text does not break layouts (German text is often longer) | P1 |
| 283 | Language switcher works correctly | P1 |
| 284 | Right-to-left layout works for Arabic/Hebrew | P1 |
| 285 | Time zones are handled correctly | P1 |

---

## 16. Compliance and Legal

| # | Test Case | Priority |
|---|-----------|----------|
| 286 | Cookie consent banner appears for new visitors | P0 |
| 287 | Cookie preferences are respected after selection | P0 |
| 288 | Privacy policy is accessible and up to date | P0 |
| 289 | Terms of service are accessible and up to date | P0 |
| 290 | Data export request (GDPR) can be fulfilled | P1 |
| 291 | Account deletion request works correctly | P0 |
| 292 | CAN-SPAM compliance for marketing emails | P1 |
| 293 | Age verification works where required | P1 |

---

## Using This Checklist with AI Agents

Install testing-specific skills into your AI coding agent to automate many of these checks:

\`\`\`bash
# Install comprehensive testing skills
npx @qaskills/cli add playwright-e2e
npx @qaskills/cli add accessibility-testing
npx @qaskills/cli add security-testing
npx @qaskills/cli add api-testing-patterns

# Search for more skills
npx @qaskills/cli search "web testing"
\`\`\`

With the right QA skills installed, you can describe test scenarios from this checklist in natural language and your AI agent will generate the corresponding automated test code. Browse all available skills at [qaskills.sh/skills](/skills).

---

## Checklist Summary by Priority

| Priority | Count | Description |
|----------|-------|-------------|
| P0 (Critical) | 87 | Must pass before any release |
| P1 (High) | 133 | Should pass for every release |
| P2 (Medium) | 73 | Test regularly, acceptable to defer |
| **Total** | **293** | Complete web testing coverage |

Use this checklist as a starting point and customize it for your specific application. Add domain-specific test cases for your industry (healthcare, finance, e-commerce) and remove items that do not apply. The goal is comprehensive coverage that gives your team confidence in every release.

**Automate the P0 tests first, then work through P1, and handle P2 as capacity allows.** A well-maintained automated test suite covering all P0 tests is worth more than a comprehensive manual checklist that rarely gets fully executed.
`,
};
