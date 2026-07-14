import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Keyboard & Mouse Interactions: Complete 2026 Reference',
  description:
    'Complete reference for Playwright keyboard and mouse APIs: key presses, modifiers, drag-and-drop, mouse wheel, hover, touchscreen, and pointer events.',
  date: '2026-05-15',
  category: 'Reference',
  content: `
# Playwright Keyboard and Mouse Interactions: Complete 2026 Reference

Playwright exposes three levels of input control. The high level is \`locator.click\` and \`locator.fill\`, which auto-wait and handle every common case. The mid level is \`page.keyboard\` and \`page.mouse\`, which provide direct control over key presses, modifiers, and pointer movement. The low level is \`page.touchscreen\` and CDP-based dispatches, which fire individual touch events and raw protocol commands.

This reference catalogues every method at every level, every key code, every modifier combination, and the patterns for the most common scenarios: drag-and-drop, keyboard shortcuts, multi-key chords, mouse wheel, and hover.

For broader fundamentals, see the [Playwright E2E Complete Guide](/blog/playwright-e2e-complete-guide). The [playwright-e2e skill](/skills/playwright-e2e) helps AI assistants pick the right input level for the task.

## High-level vs low-level

| Use case | High level | Low level |
|---|---|---|
| Click a button | \`locator.click()\` | \`page.mouse.click(x, y)\` |
| Type text | \`locator.fill('hi')\` | \`page.keyboard.type('hi')\` |
| Press a key | \`locator.press('Enter')\` | \`page.keyboard.press('Enter')\` |
| Drag and drop | \`locator.dragTo(target)\` | \`page.mouse.down/move/up\` |
| Hover | \`locator.hover()\` | \`page.mouse.move(x, y)\` |

Prefer high level. Drop to low level only when you need precise pixel control or a behavior the high level does not support.

## Keyboard reference

### Typing text

\`\`\`typescript
await page.getByLabel('Email').fill('asha@example.com');
// or
await page.keyboard.type('asha@example.com');
\`\`\`

\`fill\` clears the field first and types instantly. \`keyboard.type\` types character-by-character at the current focus.

### Pressing keys

\`\`\`typescript
await page.keyboard.press('Enter');
await page.keyboard.press('Escape');
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Tab');
await page.keyboard.press('Backspace');
\`\`\`

### Key combinations

\`\`\`typescript
await page.keyboard.press('Control+A'); // select all
await page.keyboard.press('Control+C'); // copy
await page.keyboard.press('Meta+V'); // paste (macOS)
await page.keyboard.press('Shift+Tab');
await page.keyboard.press('Alt+ArrowLeft');
\`\`\`

### Holding modifiers

\`\`\`typescript
await page.keyboard.down('Shift');
await page.getByRole('listitem', { name: 'Item 1' }).click();
await page.getByRole('listitem', { name: 'Item 5' }).click();
await page.keyboard.up('Shift');
// Result: Item 1-5 selected
\`\`\`

\`down\` and \`up\` give you explicit control for chord sequences.

### Inserting text

\`\`\`typescript
await page.keyboard.insertText('Hello, world');
\`\`\`

\`insertText\` skips key events and pastes the string directly. Useful for tests that need exact characters without firing keydown handlers.

### Key code reference

A subset of common keys (Playwright accepts the full DOM \`KeyboardEvent.code\` set):

| Key | Code |
|---|---|
| Letters | \`A\` through \`Z\` |
| Digits | \`0\` through \`9\` |
| Function | \`F1\` through \`F24\` |
| Arrows | \`ArrowUp\`, \`ArrowDown\`, \`ArrowLeft\`, \`ArrowRight\` |
| Whitespace | \`Space\`, \`Tab\`, \`Enter\` |
| Editing | \`Backspace\`, \`Delete\`, \`Home\`, \`End\`, \`PageUp\`, \`PageDown\` |
| Modifiers | \`Shift\`, \`Control\`, \`Alt\`, \`Meta\` |
| Symbols | \`Comma\`, \`Period\`, \`Slash\`, \`Semicolon\` |

## Mouse reference

### Click

\`\`\`typescript
await page.getByRole('button', { name: 'Save' }).click();
\`\`\`

Options:

\`\`\`typescript
await locator.click({
  button: 'right', // 'left' | 'right' | 'middle'
  clickCount: 2, // double-click
  delay: 100, // ms between mousedown and mouseup
  modifiers: ['Shift', 'Meta'],
  position: { x: 5, y: 5 }, // offset from top-left of element
  force: true, // skip actionability checks
  trial: false, // simulate without actually clicking
  timeout: 5000,
});
\`\`\`

### Double-click

\`\`\`typescript
await page.getByText('Filename').dblclick();
\`\`\`

### Right-click

\`\`\`typescript
await page.getByText('Filename').click({ button: 'right' });
\`\`\`

### Hover

\`\`\`typescript
await page.getByRole('button', { name: 'More options' }).hover();
await expect(page.getByRole('menu')).toBeVisible();
\`\`\`

Hover works on desktop (mouse) but not on touch devices. Use tap or explicit gesture for mobile.

### Drag and drop

\`\`\`typescript
await page.getByText('Source').dragTo(page.getByText('Target'));
\`\`\`

For finer control:

\`\`\`typescript
const source = page.getByText('Source');
const target = page.getByText('Target');
await source.hover();
await page.mouse.down();
await target.hover();
await page.mouse.up();
\`\`\`

### Mouse wheel

\`\`\`typescript
await page.mouse.wheel(0, 100); // scroll down 100px
await page.mouse.wheel(0, -100); // scroll up 100px
await page.mouse.wheel(50, 0); // scroll right 50px
\`\`\`

### Scrolling an element

\`\`\`typescript
await page.getByRole('region', { name: 'Sidebar' }).hover();
await page.mouse.wheel(0, 500);
// Or via locator
await page.locator('#sidebar').evaluate((el) => el.scrollBy(0, 500));
\`\`\`

The Playwright \`scrollIntoViewIfNeeded\` helper handles most scroll cases.

### Move

\`\`\`typescript
await page.mouse.move(100, 200); // absolute coordinates
await page.mouse.move(100, 200, { steps: 5 }); // smooth movement
\`\`\`

\`steps\` interpolates the movement; useful for triggering mousemove handlers along the path.

### Down / up

\`\`\`typescript
await page.mouse.down({ button: 'left' });
await page.mouse.up({ button: 'left' });
\`\`\`

Use directly for custom gesture sequences.

## Touch reference

For mobile or touch-enabled contexts:

\`\`\`typescript
await page.touchscreen.tap(100, 200);
\`\`\`

For tests that need real tap events instead of clicks. \`locator.tap()\` is the high-level alternative that auto-waits.

### Swipe

\`\`\`typescript
test('swipe gallery', async ({ page }) => {
  const gallery = page.getByRole('region', { name: 'Gallery' });
  const box = await gallery.boundingBox();
  if (!box) throw new Error('Gallery not visible');
  const startX = box.x + box.width * 0.8;
  const endX = box.x + box.width * 0.2;
  const y = box.y + box.height / 2;

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y, { steps: 10 });
  await page.mouse.up();
});
\`\`\`

For multi-touch gestures (pinch, rotate), use the Chromium DevTools Protocol directly via \`page.context().newCDPSession\`.

## Common patterns

### Form submit via keyboard

\`\`\`typescript
await page.getByLabel('Email').fill('asha@example.com');
await page.keyboard.press('Tab');
await page.keyboard.type('correct-horse-battery-staple');
await page.keyboard.press('Enter');
\`\`\`

### Keyboard navigation across tabs

\`\`\`typescript
await page.keyboard.press('Tab'); // first focusable
await page.keyboard.press('Tab'); // second focusable
await expect(page.getByRole('button', { name: 'Submit' })).toBeFocused();
\`\`\`

### Keyboard shortcuts

\`\`\`typescript
await page.keyboard.press('Control+S'); // global save
await expect(page.getByRole('status', { name: 'Saved' })).toBeVisible();
\`\`\`

For macOS, use \`Meta+S\` instead of \`Control+S\`. Use \`process.platform === 'darwin'\` to decide.

### Drag-and-drop a file

\`\`\`typescript
const fileInput = page.getByLabel('Upload file');
await fileInput.setInputFiles('./fixtures/report.pdf');
\`\`\`

For drag-and-drop file uploads (drop on a zone, not the input), use \`page.dispatchEvent\` with a DataTransfer payload.

### Wheel-zoom canvas

\`\`\`typescript
await page.locator('canvas').hover();
await page.mouse.wheel(0, -200); // zoom in
\`\`\`

### Long press / touch and hold

\`\`\`typescript
await page.touchscreen.tap(100, 200);
await page.mouse.down(); // following the touch
await page.waitForTimeout(800); // hold for 800ms
await page.mouse.up();
\`\`\`

## Common pitfalls

**Pitfall 1: Using \`type\` for fast field entry.** \`type\` fires keystrokes one by one and can be slower than \`fill\` for long strings.

**Pitfall 2: Forgetting modifier ups.** \`keyboard.down('Shift')\` without a corresponding \`up\` leaves the shift state stuck.

**Pitfall 3: Pressing keys before focus.** Keyboard events go to whatever has focus. \`locator.press\` focuses first; \`page.keyboard.press\` does not.

**Pitfall 4: Hovering on touch.** No hover event fires on touch devices. Adjust test logic or skip on mobile projects.

**Pitfall 5: Wheel on the wrong element.** \`page.mouse.wheel\` scrolls the focused element. Hover the target before wheeling.

## Anti-patterns

- Using \`page.keyboard.press('Tab')\` 20 times to reach an element. Use \`locator.focus()\`.
- Drag-and-drop via raw mouse events when \`locator.dragTo\` works. Use the high level.
- Asserting on a key event count. Test behavior, not event firing.
- Skipping modifiers because "we mostly run on Linux". Cross-platform key bindings differ; abstract via a helper.

## OS-aware shortcuts

\`\`\`typescript
const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
await page.keyboard.press(\`\${mod}+S\`);
\`\`\`

Wrap in a helper to keep tests readable.

## Conclusion and next steps

Mastering the input layers in Playwright means knowing when to reach for the high-level locator helpers and when to drop to \`page.keyboard\`, \`page.mouse\`, or \`page.touchscreen\`. The high level handles ninety percent; the lower levels exist for the precision cases.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants pick the right level by default. For broader locator patterns, see [Playwright Best Practices for Locators](/blog/playwright-best-practices-locators-2026). For mobile-specific gestures, [Playwright Mobile Emulation Devices Reference](/blog/playwright-mobile-emulation-guide).
`,
};
