import { describe, expect, it } from 'vitest';
import { deepevalChildren2026 } from './children-deepeval-2026';
import { playwrightMcpChildren2026 } from './children-playwright-mcp-2026';

describe('SEO article API examples', () => {
  it('uses the DeepEval 4 single-turn evaluation parameter enum', () => {
    const content = deepevalChildren2026.map(({ post }) => post.content).join('\n');

    expect(content).toContain('SingleTurnParams.INPUT');
    expect(content).not.toContain('LLMTestCaseParams');
  });

  it('uses the Playwright MCP 0.0.78 testing-capability arguments', () => {
    const content = playwrightMcpChildren2026.map(({ post }) => post.content).join('\n');

    expect(content).toContain(
      'browser_verify_element_visible { role: "heading", accessibleName: "Sign in" }',
    );
    expect(content).toContain(
      'browser_verify_value { type: "textbox", element: "Email field", target: "e3", value: "alice@example.com" }',
    );
    expect(content).toContain(
      'browser_generate_locator { element: "Submit button", target: "e15" }',
    );
    expect(content).not.toMatch(/browser_(?:click|type|verify_value|generate_locator) \{ ref:/);
    expect(content).not.toMatch(/browser_verify_element_visible \{[^\n]*\bname:/);
  });
});
