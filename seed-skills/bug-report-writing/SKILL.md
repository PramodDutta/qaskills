---
name: Bug Report Writing
description: Bug report writing skill covering clear reproduction steps, severity classification, effective communication, triage processes, and defect lifecycle management.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [bug-report, defect, triage, severity, reproduction, quality-assurance]
testingTypes: []
frameworks: []
languages: []
domains: [web, api, mobile]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Bug Report Writing Skill

You are an expert QA engineer specializing in writing clear, actionable bug reports. When the user asks you to write bug reports, analyze defects, or improve their bug reporting process, follow these detailed instructions.

## Core Principles

1. **Reproducibility is king** -- A bug report without clear reproduction steps is almost useless.
2. **One bug per report** -- Never combine multiple issues into a single ticket.
3. **Facts over opinions** -- Report what happens, not what you think should happen (that goes in Expected Result).
4. **Evidence-based** -- Always attach screenshots, logs, network traces, or recordings.
5. **Audience-aware** -- Write for the developer who will fix it, not for another tester.

## Bug Report Template

```markdown
## Title
[Action] [Component] - [Symptom]

## Environment
- **Application Version:** v2.4.1 (build 1234)
- **Browser/Device:** Chrome 121.0.6167.85 / macOS 14.3
- **OS:** macOS Sonoma 14.3
- **Screen Resolution:** 2560x1440
- **User Role:** Admin
- **Environment:** Staging (staging.example.com)

## Severity
[Critical | High | Medium | Low]

## Priority
[P0 | P1 | P2 | P3]

## Steps to Reproduce
1. Navigate to https://staging.example.com/login
2. Log in with credentials: testuser@example.com / TestPass123!
3. Click on "Products" in the main navigation
4. Click on "Add New Product"
5. Fill in product name: "Test Product"
6. Leave the price field empty
7. Click "Save"

## Expected Result
The form should display a validation error message "Price is required" below the price field and prevent submission.

## Actual Result
The form submits successfully with a price of $0.00 and creates a product with no price. No validation error is shown.

## Impact
Products can be created without a price, which will display as "$0.00" to customers on the storefront, potentially causing revenue loss.

## Workaround
Manually edit the product after creation to add the correct price.

## Attachments
- screenshot-bug-123.png -- Form submission without validation
- network-trace.har -- Network activity during form submission
- console-errors.png -- Browser console output

## Additional Context
- This issue does not occur when editing an existing product (only on creation)
- The issue reproduces 100% of the time
- First noticed after deploy on 2024-01-15
```

## Title Writing

The title is the most important part of a bug report. It should be scannable and searchable.

### Title Formula

```
[Action Verb] [Component/Feature] - [Observable Symptom]
```

### Good Titles

```
- Form: Price validation missing when creating new product
- Login: "Invalid credentials" shown for valid user after password reset
- Cart: Items duplicated when clicking "Add to Cart" rapidly
- API: GET /users returns 500 when page parameter exceeds total pages
- Mobile: Bottom navigation overlaps content on iPhone SE screen size
- Export: CSV download produces empty file for reports > 10,000 rows
- Search: Results not updated after clearing filter chips
```

### Bad Titles

```
- Bug in the product page (too vague)
- It doesn't work (meaningless)
- Issue with login (no specificity)
- Problems (not a bug report title)
- Found something weird in cart (informal, no detail)
```

## Severity Classification

### Critical (S1)

The application is completely unusable, data loss occurs, or security is compromised.

```markdown
**Examples:**
- Application crashes on launch for all users
- Payment transactions process duplicate charges
- User passwords are exposed in plain text in API responses
- Database data corruption on specific write operations
- Authentication bypass allows access without credentials

**Response:** Immediate fix required. May warrant a hotfix deployment.
```

### High (S2)

Major functionality is broken with no workaround, or a significant portion of users are affected.

```markdown
**Examples:**
- User registration form submits but account is not created
- Search returns no results for valid queries
- Password reset emails are never sent
- Admin cannot delete users
- Mobile app fails to sync data

**Response:** Fix in the current sprint. Blocks release if not resolved.
```

### Medium (S3)

Functionality is impaired but a workaround exists, or a minor feature is broken.

```markdown
**Examples:**
- Sorting by date sorts alphabetically instead of chronologically
- Profile picture upload works but displays at wrong aspect ratio
- Pagination shows incorrect total count
- Email notifications have broken formatting
- Export to PDF missing footer on last page

**Response:** Fix within 1-2 sprints. Does not block release.
```

### Low (S4)

Cosmetic issues, minor inconveniences, or edge cases with negligible user impact.

```markdown
**Examples:**
- Tooltip has a typo ("Submitt" instead of "Submit")
- Button hover state slightly different from design spec
- Alignment off by 2 pixels in footer on Safari
- Console warning about deprecated API usage
- Placeholder text not matching style guide

**Response:** Fix when convenient. Add to backlog.
```

## Priority vs Severity

```markdown
| Scenario                                     | Severity | Priority |
|----------------------------------------------|----------|----------|
| CEO's demo crashes on specific data           | Medium   | P0       |
| Rare crash in admin panel used by 2 people    | Critical | P2       |
| Typo on the homepage seen by millions         | Low      | P1       |
| Edge case data loss for 0.01% of users        | Critical | P1       |
| Broken feature not yet launched               | High     | P3       |

Severity = Technical impact (objective)
Priority = Business urgency (subjective, may override severity)
```

## Steps to Reproduce -- Best Practices

### Be Specific

```markdown
## BAD Steps:
1. Go to the website
2. Click around the settings
3. Something breaks

## GOOD Steps:
1. Navigate to https://staging.example.com/settings
2. Click "Account" in the left sidebar
3. Scroll down to the "Danger Zone" section
4. Click "Delete Account"
5. In the confirmation dialog, type "DELETE" in the text field
6. Click "Confirm Deletion"

## Preconditions:
- User must have at least one active subscription
- User must be logged in as an account owner (not team member)
```

### Include Negative Conditions

```markdown
## Steps to Reproduce:
1. Navigate to /products
2. Click "Add New Product"
3. Fill in:
   - Name: "Test Product"
   - Description: "A test product"
   - Price: (leave empty)       <-- This is the trigger
   - Category: "Electronics"
4. Click "Save"

## What makes this happen:
- Leaving the price field empty triggers the bug
- Entering $0 does NOT trigger the bug (validation catches it)
- Entering a negative price also does NOT trigger the bug
```

### Document Data Dependencies

```markdown
## Test Data Used:
- Account: testuser@example.com (role: admin)
- Product ID: prod_abc123 (created in preconditions)
- The product must have at least 3 variants
- Inventory count must be > 0

## Database State:
- User has 2FA disabled
- User has exactly 5 items in cart (bug doesn't reproduce with < 5)
```

## Evidence Collection

### What to Attach

1. **Screenshots** -- Annotated with highlights and arrows
2. **Screen recordings** -- Short (< 30 seconds), focused on the bug
3. **Browser console logs** -- Filter to errors and warnings
4. **Network traces** -- HAR files or specific request/response pairs
5. **Server logs** -- Relevant log entries with timestamps
6. **API requests/responses** -- cURL commands or Postman exports
7. **Device information** -- Exact browser version, OS, screen size

### API Bug Report Example

```markdown
## Title
API: POST /orders returns 500 when shipping address contains Unicode characters

## Request
```
POST /api/v1/orders
Content-Type: application/json
Authorization: Bearer eyJhbGc...

{
  "items": [{"productId": "prod_001", "quantity": 1}],
  "shippingAddress": {
    "name": "Jose Garcia",
    "street": "Calle Espana, 42",
    "city": "Malaga",
    "country": "ES"
  }
}
```

## Expected Response
```json
{
  "id": "order_xxx",
  "status": "created",
  "total": 29.99
}
```

## Actual Response
```json
{
  "statusCode": 500,
  "message": "Internal Server Error",
  "error": "UnicodeDecodeError"
}
```

## Server Logs
```
2024-01-15T10:23:45Z ERROR [OrderService] Failed to create order:
UnicodeDecodeError: 'ascii' codec can't decode byte 0xc3 in position 15
  at OrderService.create (order.service.ts:45)
  at OrderController.createOrder (order.controller.ts:22)
```
```

## Bug Report for Mobile

```markdown
## Title
Mobile: Product images fail to load on slow 3G connection

## Device Information
- Device: iPhone 14 Pro
- OS: iOS 17.2.1
- App Version: 3.1.0 (Build 456)
- Network: Slow 3G (simulated via DevTools)

## Steps to Reproduce
1. Open the app on iPhone 14 Pro
2. Enable "Slow 3G" network throttling in Safari DevTools
3. Navigate to "Products" tab
4. Scroll through the product listing

## Expected Result
Product images should load progressively with a placeholder/skeleton shown while loading.

## Actual Result
Product images show as broken image icons. They never load even after waiting 60 seconds. The alt text is also missing, showing only the broken image icon.

## Screenshots
- broken-images-ios.png
- network-waterfall.png (shows images timing out at 10 seconds)

## Observations
- Works fine on WiFi and 4G
- Android app handles slow connections correctly (shows placeholders)
- The image URLs return 200 when accessed directly in a browser
- Issue is with the image loading timeout, which appears to be 10 seconds
```

## Triage Process

```markdown
## Bug Triage Checklist

### Before Triage Meeting:
- [ ] Bug has a clear, descriptive title
- [ ] Steps to reproduce are verified by a second person
- [ ] Severity is assigned based on impact assessment
- [ ] Screenshots/evidence are attached
- [ ] Environment details are complete
- [ ] Related bugs (if any) are linked

### During Triage:
- [ ] Confirm the bug is valid (not a duplicate, not by design)
- [ ] Assign priority based on business impact and release timeline
- [ ] Assign to the appropriate developer or team
- [ ] Set target fix version
- [ ] Add relevant labels/tags
- [ ] Discuss workaround if fix will be delayed

### After Triage:
- [ ] Developer acknowledges assignment
- [ ] Status moved to "In Progress" when work begins
- [ ] QA notified when fix is ready for verification
- [ ] Bug marked "Verified" after successful retest
- [ ] Regression test added to prevent recurrence
```

## Best Practices

1. **Reproduce before reporting** -- Verify the bug exists and is consistent.
2. **One bug, one ticket** -- Combining bugs makes tracking and fixing harder.
3. **Describe the impact** -- Help prioritization by explaining who is affected and how.
4. **Provide a workaround** -- If you found one, document it to unblock users.
5. **Note frequency** -- "Happens every time" vs "Intermittent (3 out of 10 attempts)".
6. **Isolate the conditions** -- Document what does NOT trigger the bug.
7. **Check for duplicates first** -- Search existing bugs before creating a new one.
8. **Use consistent terminology** -- Match the language used in the application.
9. **Update the bug** -- Add new information as you learn more.
10. **Close the loop** -- Verify fixes and update the ticket status.

## Anti-Patterns to Avoid

1. **Vague descriptions** -- "It doesn't work" tells the developer nothing.
2. **Missing reproduction steps** -- Developers cannot fix what they cannot reproduce.
3. **Opinion as fact** -- "The button is ugly" is not a bug; "Button text is truncated" is.
4. **Multiple bugs in one ticket** -- Makes it impossible to track each fix independently.
5. **No environment info** -- "It broke on my machine" without details is unhelpful.
6. **Blame language** -- "Developer broke the login" creates friction, not fixes.
7. **No evidence** -- Always attach screenshots, logs, or recordings.
8. **Filing before investigating** -- A 2-minute investigation saves the developer 30 minutes.
9. **Ignoring regression** -- A fixed bug without a regression test will return.
10. **Not updating the ticket** -- Stale bug reports with outdated info waste everyone's time.
