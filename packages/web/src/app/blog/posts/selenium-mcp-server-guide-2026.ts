import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium MCP Server: AI Browser Automation Guide 2026',
  description:
    'Learn how the Selenium MCP Server lets AI agents drive Chrome and Firefox over WebDriver. Setup, mcp.json config, the full tool surface, and Selenium MCP vs Playwright MCP compared.',
  date: '2026-06-27',
  category: 'Tutorial',
  content: `
# Selenium MCP Server: The Complete AI Browser Automation Guide for 2026

For more than a decade Selenium WebDriver has been the backbone of browser automation. Thousands of organizations run vast regression suites against Selenium Grid, in every major language, against every major browser. So when AI coding agents arrived and started writing and running tests on their own, a natural question followed: could that enormous Selenium ecosystem be wired directly into an AI agent? The Selenium MCP Server answers yes. It exposes Selenium WebDriver as a set of Model Context Protocol tools, so an AI agent such as Claude Code, Cursor, or Claude Desktop can open a real browser, find elements, click, type, take screenshots, and run JavaScript, all from a plain natural-language instruction.

This matters because MCP has become the universal connector between AI models and external tools. By March 2026 every major AI provider supported the protocol, including Anthropic Claude, OpenAI, Google Gemini, Microsoft Copilot, and AWS Bedrock. The MCP SDKs cross roughly 97 million monthly downloads, and the community catalog has grown past 5,800 servers. Browser automation is one of the most valuable categories in that catalog, because it lets an agent actually exercise a web application rather than only reason about its source code.

In this guide we will explain exactly what the Selenium MCP Server is, how the moving parts fit together, how to install and configure it with a real mcp.json snippet, the precise tool surface an agent receives, and a full walkthrough of a natural-language task translated into WebDriver calls. We will compare Selenium MCP against Microsoft's Playwright MCP in detail, explain when each is the right choice, and finish with a practical troubleshooting section. If you are new to the protocol itself, our [MCP for QA engineers guide](/blog/mcp-for-qa-engineers-guide) is a useful companion read.

## What the Selenium MCP Server Is and Why It Matters

The Selenium MCP Server, created by test automation expert Angie Jones, is a small standalone process that speaks the Model Context Protocol on one side and drives Selenium WebDriver on the other. An AI agent connects to it as an MCP client. The server advertises a list of browser automation tools. When the agent decides it needs to, say, navigate to a URL or click a button, it issues a tool call; the server translates that call into the corresponding WebDriver command and returns the result.

The key insight is leverage. Selenium is not a niche library; it is the most widely deployed browser automation stack in the world, with first-class bindings in Java, Python, C#, Ruby, and JavaScript, and a mature distributed execution layer in Selenium Grid. The Selenium MCP Server brings AI-agent control to that ecosystem instead of asking teams to abandon it. If your company already runs Selenium against Chrome and Firefox, an AI agent can now reuse the same WebDriver foundation your suite relies on.

There are three concrete reasons this is significant in 2026:

- **Reuse of existing infrastructure.** Teams with established Selenium Grids, cloud provider integrations, and browser version pinning can let an agent automate within that exact environment, rather than introducing a parallel toolchain.
- **Browser breadth.** The Selenium MCP Server supports Chrome and Firefox out of the box, the two browsers that dominate cross-browser regression matrices.
- **Language familiarity.** Selenium's command vocabulary, locator strategies, and waiting model are deeply documented and understood by QA engineers everywhere, which makes the agent's actions easy to audit and reason about.

In short, the Selenium MCP Server is the bridge that lets the AI-agent era inherit, rather than discard, fifteen years of browser automation maturity.

## Architecture: How the Pieces Fit Together

It helps to picture the request path as a chain of four components. Each link has a single responsibility, and understanding the chain makes both configuration and debugging far easier.

\`\`\`text
+---------------------+      +----------------------+      +---------------+      +-----------+
|   MCP Client        |      |  Selenium MCP Server |      |   WebDriver   |      |  Browser  |
| (Claude Code /      | <--> |  (tool definitions + | <--> | (chromedriver | <--> | (Chrome / |
|  Cursor / Claude    | MCP  |   WebDriver bridge)  |  WD  | / geckodriver)|      | Firefox)  |
|  Desktop)           |      |                      |      |               |      |           |
+---------------------+      +----------------------+      +---------------+      +-----------+
\`\`\`

1. **MCP client.** This is the AI agent's host application, for example Claude Code in your terminal, the Cursor editor, or Claude Desktop. The client reads your configuration file, launches the configured MCP servers, and exposes their tools to the model. When the model wants to act on a browser, it emits a structured tool call.

2. **Selenium MCP Server.** This process receives tool calls over the MCP transport (typically stdio for a locally launched server). It maps each MCP tool, such as \`navigate\` or \`click\`, onto the corresponding Selenium WebDriver command. It also manages the WebDriver session lifecycle, including which browser to launch and whether to run headless.

3. **WebDriver.** This is the W3C WebDriver implementation for the chosen browser, \`chromedriver\` for Chrome or \`geckodriver\` for Firefox. It receives standard WebDriver protocol requests and executes them against the real browser binary.

4. **Browser.** The actual Chrome or Firefox instance that loads pages, runs JavaScript, and renders the DOM. Everything the agent observes ultimately comes from this real browser.

Because the chain uses standard WebDriver underneath, anything Selenium can already drive, including a remote Selenium Grid endpoint, can in principle be driven by the agent. This is the architectural property that makes the Selenium MCP Server interesting for teams with existing distributed test infrastructure.

## Installing and Configuring the Selenium MCP Server

The server runs as a Node package and is most conveniently launched with \`npx\`, which means you do not need a global install. Your MCP client launches it on demand. Configuration lives in a JSON file whose location depends on the client: Claude Desktop uses \`claude_desktop_config.json\`, Claude Code and Cursor use a project or user level \`mcp.json\`. The shape of the entry is the same across clients.

Here is a minimal configuration that registers the Selenium MCP Server and tells it to use Chrome:

\`\`\`json
{
  "mcpServers": {
    "selenium": {
      "command": "npx",
      "args": ["-y", "@angiejones/mcp-selenium"],
      "env": {
        "SELENIUM_BROWSER": "chrome"
      }
    }
  }
}
\`\`\`

To run Firefox instead, change the browser environment variable. You can also request a headless session, which is essential on CI runners and servers without a display:

\`\`\`json
{
  "mcpServers": {
    "selenium": {
      "command": "npx",
      "args": ["-y", "@angiejones/mcp-selenium"],
      "env": {
        "SELENIUM_BROWSER": "firefox",
        "SELENIUM_HEADLESS": "true"
      }
    }
  }
}
\`\`\`

Some clients prefer launching servers with \`uvx\` (the Python tooling launcher) when a server is distributed as a Python package, while Node servers use \`npx\`. The Selenium MCP Server is published on npm, so \`npx\` is the correct launcher. After saving the configuration, restart the client so it picks up the new server. In Claude Code you can confirm registration from the command line:

\`\`\`bash
# List configured MCP servers and their connection status
claude mcp list

# Add the Selenium server straight from the CLI instead of editing JSON
claude mcp add selenium -- npx -y @angiejones/mcp-selenium
\`\`\`

When the client restarts, it spawns the server, performs the MCP handshake, and the server reports its tools. The agent will now see browser automation capabilities alongside whatever else you have configured. If you are wiring up several testing servers at once, our [reference on MCP servers for test automation](/blog/mcp-servers-for-test-automation-2026) shows how to combine them in one file.

## The Tool Surface an Agent Receives

Once connected, the Selenium MCP Server gives the agent a focused set of WebDriver-backed tools. These map closely onto the everyday vocabulary of a Selenium script, which is exactly what makes the agent's behavior predictable and auditable. The table below summarizes the core tools, the WebDriver action each represents, and a typical use.

| Tool | What it does | Underlying WebDriver action | Typical use |
|---|---|---|---|
| \`start_browser\` | Opens a new browser session | New session (Chrome/Firefox) | Begin a test, set headless mode |
| \`navigate\` | Loads a URL | \`driver.get(url)\` | Go to the page under test |
| \`find_element\` | Locates an element by strategy | \`driver.findElement(By...)\` | Target a button, field, or link |
| \`click_element\` | Clicks a located element | \`element.click()\` | Submit forms, follow links |
| \`send_keys\` | Types text into a field | \`element.sendKeys(text)\` | Fill login or search inputs |
| \`get_element_text\` | Reads visible text | \`element.getText()\` | Assert messages and labels |
| \`get_element_attribute\` | Reads an attribute value | \`element.getAttribute(name)\` | Verify href, value, state |
| \`take_screenshot\` | Captures the viewport | \`driver.getScreenshotAs(...)\` | Evidence and visual checks |
| \`execute_script\` | Runs JavaScript in the page | \`driver.executeScript(js)\` | Scroll, read state, trigger events |
| \`hover\` | Moves the pointer over an element | Actions API \`moveToElement\` | Reveal menus and tooltips |
| \`close_session\` | Ends the browser session | \`driver.quit()\` | Clean teardown |

A defining feature of Selenium is its rich set of locator strategies, and the server preserves them. When the agent calls \`find_element\`, it specifies both a strategy and a value. The supported strategies mirror Selenium's \`By\` class:

| Locator strategy | Example value | Notes |
|---|---|---|
| \`id\` | \`login-button\` | Fastest and most stable when present |
| \`name\` | \`username\` | Common for form fields |
| \`css\` | \`button.primary[type=submit]\` | Flexible, recommended default |
| \`xpath\` | \`//button[text()='Sign in']\` | Powerful for text and structure |
| \`class\` | \`alert-danger\` | Matches a single class name |
| \`tag\` | \`h1\` | Coarse, useful for landmarks |
| \`linkText\` | \`Forgot password?\` | Exact anchor text |
| \`partialLinkText\` | \`Forgot\` | Substring anchor match |

Because these strategies are identical to what your hand-written Selenium tests already use, an agent's locator choices translate directly into selectors a human engineer can verify, copy, and maintain.

## Walkthrough: A Natural-Language Task End to End

Let us trace a realistic instruction so you can see how a sentence becomes a sequence of WebDriver commands. Suppose you tell the agent:

> Open the demo login page at https://practice.example.com/login, sign in with username \`standard_user\` and password \`secret_sauce\`, confirm the dashboard heading reads "Products", and take a screenshot.

The agent breaks this down into discrete tool calls. Conceptually, the conversation between the model and the Selenium MCP Server unfolds like this:

\`\`\`text
1.  start_browser     -> { browser: "chrome", headless: false }
2.  navigate          -> { url: "https://practice.example.com/login" }
3.  find_element      -> { by: "id", value: "user-name" }
4.  send_keys         -> { text: "standard_user" }
5.  find_element      -> { by: "id", value: "password" }
6.  send_keys         -> { text: "secret_sauce" }
7.  find_element      -> { by: "css", value: "button[type=submit]" }
8.  click_element     -> {}
9.  find_element      -> { by: "css", value: ".dashboard h1" }
10. get_element_text  -> {}   // returns "Products"
11. take_screenshot   -> {}   // returns base64 image
12. close_session     -> {}
\`\`\`

Each of those calls becomes a concrete WebDriver instruction. Written out as the equivalent Java Selenium code a human might author, the underlying actions are:

\`\`\`java
WebDriver driver = new ChromeDriver();
driver.get("https://practice.example.com/login");

driver.findElement(By.id("user-name")).sendKeys("standard_user");
driver.findElement(By.id("password")).sendKeys("secret_sauce");
driver.findElement(By.cssSelector("button[type=submit]")).click();

WebElement heading = driver.findElement(By.cssSelector(".dashboard h1"));
String text = heading.getText();          // "Products"
assert text.equals("Products");

File shot = ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);
driver.quit();
\`\`\`

The agent does not hand you that Java file unless you ask, but it is performing exactly these operations through the server. The valuable part is the loop that follows: if \`get_element_text\` returns something other than "Products", the agent sees the discrepancy in the tool result, can take a screenshot for evidence, re-inspect the DOM with \`execute_script\`, adjust its locator, and retry. That closed feedback loop, observe then correct, is what separates an AI agent driving a browser from a static recorded script.

## Selenium MCP vs Playwright MCP

The two most prominent browser automation MCP servers in 2026 are the Selenium MCP Server and Microsoft's Playwright MCP. They solve the same high-level problem but take fundamentally different approaches under the hood, and the difference has real consequences for stability, speed, and ecosystem fit. We cover the testing frameworks themselves in depth in [Selenium vs Playwright 2026](/blog/selenium-vs-playwright-2026); here we focus on the MCP servers.

| Dimension | Selenium MCP Server | Playwright MCP |
|---|---|---|
| Driving mechanism | Selenium WebDriver (W3C protocol) | Accessibility tree snapshots |
| Page perception | Locators against the live DOM | Structured a11y tree, not pixels |
| Browsers | Chrome, Firefox | Chromium, Firefox, WebKit |
| Language ecosystem | Java, Python, C#, Ruby, JS bindings | TypeScript/JS first, Python, .NET |
| Distributed execution | Selenium Grid support | Playwright's own parallelism |
| Vision model needed | No | No (uses a11y tree, not screenshots) |
| Best fit | Existing Selenium suites and Grids | Greenfield, accessibility-driven flows |
| Maintainer | Angie Jones (community) | Microsoft |

The headline architectural distinction: Microsoft's Playwright MCP drives the browser via the accessibility tree rather than pixels or screenshots, feeding the model a structured, text-based representation of the page. This is fast, deterministic, and avoids the cost and flakiness of vision models. The Selenium MCP Server instead uses classic WebDriver locator strategies against the DOM, the same model Selenium engineers have used for years.

Neither is universally better. Playwright MCP's accessibility-tree approach is elegant for fresh automation and pairs naturally with accessibility-aware testing. The Selenium MCP Server's WebDriver foundation wins when you need to live inside an existing Selenium world, including Grid, specific browser version pinning, or non-JavaScript language bindings that your team standardizes on.

## When to Choose Selenium MCP

Choosing between these servers is mostly a question of context, not raw capability. The Selenium MCP Server is the stronger choice in several concrete situations:

- **You have an existing Selenium suite.** If your regression tests are already written in Selenium, an agent that speaks the same WebDriver dialect can extend, debug, and triage them using identical locators and waiting semantics. There is no impedance mismatch.
- **You depend on Selenium Grid.** Distributed cross-browser execution across a Grid, whether self-hosted or via a cloud provider, is Selenium's home turf. Driving the same Grid from an agent keeps one execution backbone.
- **Your team standardizes on a non-JS language.** Selenium's first-class Java, C#, Python, and Ruby bindings mean the agent's actions translate cleanly into code your engineers actually write and review.
- **Browser version pinning matters.** Teams that pin exact Chrome and Firefox versions against specific driver builds get a familiar, controllable environment.

Conversely, if you are starting fresh, value WebKit/Safari coverage, or want the deterministic accessibility-tree perception model, Playwright MCP is a natural default. Many teams in 2026 actually run both, using whichever matches a given project. For a broader survey of agent-driven testing options, see our roundup of [AI test automation tools for 2026](/blog/ai-test-automation-tools-2026).

## Troubleshooting Common Issues

Most problems with the Selenium MCP Server fall into a handful of categories. Here is how to diagnose and fix them quickly.

**Driver and browser version mismatch.** The single most common failure is a \`chromedriver\` or \`geckodriver\` that does not match the installed browser. Modern Selenium ships Selenium Manager, which auto-resolves the correct driver, but in locked-down CI you may need to pin versions explicitly. Verify versions before blaming the server:

\`\`\`bash
# Check browser and driver versions
google-chrome --version
chromedriver --version

firefox --version
geckodriver --version
\`\`\`

If the major versions diverge, update the driver or let Selenium Manager fetch a matching one. A mismatch typically surfaces as a session failing to start the moment the agent calls \`start_browser\`.

**Server not appearing in the client.** If your agent does not see the Selenium tools, the client never successfully launched the server. Confirm the JSON is valid (a stray trailing comma silently breaks the whole file), restart the client fully, and check the client's MCP logs. In Claude Code, \`claude mcp list\` shows connection status; a server stuck in a failed state usually means \`npx\` could not resolve the package or Node is missing from the launch environment.

**Headless quirks.** On CI runners and headless servers there is no display, so you must set \`SELENIUM_HEADLESS=true\`. Some elements behave differently headless, and a default headless viewport can be small enough to keep elements off-screen. If a click fails only in CI, have the agent set a larger window size via \`execute_script\` or capture a \`take_screenshot\` to see what the headless browser actually rendered.

**Stale or timing-sensitive elements.** Single-page apps re-render constantly, so an element located a moment ago may be detached when the agent acts. The cure is the same as in hand-written Selenium: prefer stable locators, and let the agent re-find an element rather than reuse a stale reference. Because the agent observes each tool result, it can detect a stale-element error and recover by locating the element again.

## Frequently Asked Questions

### What is the Selenium MCP Server?

The Selenium MCP Server is a Model Context Protocol server, created by Angie Jones, that exposes Selenium WebDriver as a set of tools an AI agent can call. It lets clients like Claude Code, Cursor, or Claude Desktop open Chrome or Firefox, find elements by standard locators, click, type, read text, run JavaScript, and take screenshots, all from natural-language instructions.

### How do I install the Selenium MCP Server?

Add an entry to your MCP client's config (\`mcp.json\` or \`claude_desktop_config.json\`) that launches it with \`npx -y @angiejones/mcp-selenium\` and set \`SELENIUM_BROWSER\` to chrome or firefox. Restart the client so it spawns the server. In Claude Code you can also run \`claude mcp add selenium -- npx -y @angiejones/mcp-selenium\` and verify with \`claude mcp list\`.

### Does the Selenium MCP Server support Chrome and Firefox?

Yes. The Selenium MCP Server supports both Chrome and Firefox out of the box, the two browsers that dominate cross-browser regression matrices. You select the browser with the \`SELENIUM_BROWSER\` environment variable, and you can run either in headless mode by setting \`SELENIUM_HEADLESS=true\`, which is required on CI runners without a display.

### What is the difference between Selenium MCP and Playwright MCP?

The Selenium MCP Server drives the browser through classic WebDriver locators against the live DOM, while Microsoft's Playwright MCP drives the browser via the accessibility tree rather than pixels or screenshots. Selenium MCP fits existing Selenium suites and Grid setups across many languages; Playwright MCP suits greenfield, accessibility-aware automation and adds WebKit coverage.

### Can the Selenium MCP Server use Selenium Grid?

Because the server is built on standard Selenium WebDriver, it can in principle target a remote Selenium Grid endpoint just as a hand-written Selenium test would, keeping a single distributed execution backbone. This is one of the main reasons teams with established Grid infrastructure prefer Selenium MCP over alternatives that bring their own separate parallelism model.

### Do I need a vision model to use the Selenium MCP Server?

No. The Selenium MCP Server works through DOM locators and WebDriver commands, not by analyzing screenshots, so it does not require a vision-capable model. Screenshots are available as evidence through the \`take_screenshot\` tool, but the agent reasons about the page using element text, attributes, and locators rather than pixel analysis.

### Why does the Selenium server not show up in Claude Code?

Almost always the client failed to launch the server. Check that your config JSON is valid with no trailing commas, that Node and \`npx\` are available in the launch environment, and that you fully restarted the client. Run \`claude mcp list\` to see connection status; a failed server usually means \`npx\` could not resolve \`@angiejones/mcp-selenium\`.

### Is the Selenium MCP Server good for AI test generation?

Yes. Pairing the server with an AI agent lets the agent generate a test in natural language, execute it live against a real browser, observe the actual result, and correct its locators or steps when something fails. That observe-and-fix loop, backed by the mature Selenium ecosystem, makes it well suited to reliable agent-driven test creation and triage.

## Conclusion

The Selenium MCP Server is the bridge between two worlds: the fifteen-year-old, battle-tested Selenium WebDriver ecosystem and the new era of AI agents that write and run their own tests. By exposing WebDriver as MCP tools, it lets Claude Code, Cursor, and Claude Desktop drive real Chrome and Firefox sessions using the exact locator strategies, Grid infrastructure, and language bindings your team already relies on. You keep your investment and gain an agent that can observe failures and fix itself.

If you are ready to put an AI agent to work on browser automation, start by registering the server in your \`mcp.json\`, then give it real testing skills to follow. Browse the curated [QA skills directory](/skills) on qaskills.sh to equip your agent with proven Selenium and Playwright workflows, and explore our [Playwright end-to-end complete guide](/blog/playwright-e2e-complete-guide) to round out your automation toolkit. The combination of MCP servers and reusable skills is how high-performing QA teams will scale in 2026.
`,
};
