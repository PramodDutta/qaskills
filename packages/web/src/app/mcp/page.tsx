import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QASkills MCP Server: Install QA Skills From Any AI Agent',
  description:
    'The QASkills MCP server lets Claude Code, Cursor, and any MCP client search, inspect, and install 400+ QA testing skills. One command to add it.',
  alternates: { canonical: 'https://qaskills.sh/mcp' },
  openGraph: {
    title: 'QASkills MCP Server',
    description:
      'Search, inspect, and install 400+ QA testing skills from any MCP client. In the official MCP registry.',
    url: 'https://qaskills.sh/mcp',
    type: 'website',
  },
};

const TOOLS: { name: string; does: string }[] = [
  { name: 'search_skills', does: 'Find skills by query, testing type, framework, language, or agent' },
  { name: 'get_skill', does: 'Fetch metadata for a single skill by slug' },
  { name: 'get_skill_content', does: 'Read the full SKILL.md markdown for a skill' },
  { name: 'install_skill', does: 'Write a skill into the current project (.claude/skills or .agents/skills)' },
  { name: 'list_categories', does: 'Browse the category tree' },
  { name: 'get_leaderboard', does: 'Get the top skills by install count' },
];

const CLIENTS: { name: string; how: string }[] = [
  { name: 'Claude Code', how: 'claude mcp add qaskills -- npx -y @qaskills/mcp' },
  { name: 'Cursor / Windsurf', how: 'Add the mcpServers JSON block below to your MCP config' },
  { name: 'Codex CLI / Gemini CLI', how: 'Same mcpServers JSON block; any MCP-compatible host works' },
];

export default function McpPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold text-muted-foreground">
        In the official MCP registry
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        QASkills MCP Server
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Give any AI coding agent the ability to search, read, and install 400+ QA testing skills
        without leaving the conversation. One stdio MCP server, six tools, zero config.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-muted/30 p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Quick install (Claude Code)
        </div>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-foreground/95 p-4 text-sm text-background">
          <code>claude mcp add qaskills -- npx -y @qaskills/mcp</code>
        </pre>
      </div>

      <h2 className="mt-12 text-2xl font-bold text-foreground">The six tools</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-4 font-semibold">Tool</th>
              <th className="py-2 font-semibold">What it does</th>
            </tr>
          </thead>
          <tbody>
            {TOOLS.map((t) => (
              <tr key={t.name} className="border-b border-border/60">
                <td className="py-2 pr-4 font-mono text-xs text-foreground">{t.name}</td>
                <td className="py-2 text-muted-foreground">{t.does}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 text-2xl font-bold text-foreground">Works with any MCP client</h2>
      <div className="mt-4 space-y-3">
        {CLIENTS.map((c) => (
          <div key={c.name} className="rounded-lg border border-border p-4">
            <div className="text-sm font-semibold text-foreground">{c.name}</div>
            <code className="mt-1 block break-all font-mono text-xs text-muted-foreground">
              {c.how}
            </code>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-muted/30 p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Generic mcpServers config
        </div>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-foreground/95 p-4 text-sm text-background">
          <code>{`{
  "mcpServers": {
    "qaskills": {
      "command": "npx",
      "args": ["-y", "@qaskills/mcp"]
    }
  }
}`}</code>
        </pre>
      </div>

      <h2 className="mt-12 text-2xl font-bold text-foreground">How it works</h2>
      <p className="mt-4 text-muted-foreground">
        Your agent hits a testing problem, calls <code className="font-mono text-sm">search_skills</code>{' '}
        to find a matching QA skill, reads it with{' '}
        <code className="font-mono text-sm">get_skill_content</code>, then runs{' '}
        <code className="font-mono text-sm">install_skill</code> to drop the SKILL.md into your
        project. The moment of need becomes the moment of adoption, no browser tab required. Prefer
        the terminal? The{' '}
        <Link href="/getting-started" className="text-blue-600 underline dark:text-blue-400">
          qaskills CLI
        </Link>{' '}
        does the same thing from the command line, and you can{' '}
        <Link href="/skills" className="text-blue-600 underline dark:text-blue-400">
          browse all 400+ skills
        </Link>{' '}
        on the site.
      </p>

      <div className="mt-12 rounded-xl border border-border bg-gradient-to-br from-blue-50 to-indigo-50/40 p-6 dark:from-blue-950/20 dark:to-indigo-950/10">
        <h2 className="text-xl font-bold text-foreground">Get started</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add the server, then ask your agent: &quot;search qaskills for a Playwright E2E skill and
          install it.&quot;
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="https://www.npmjs.com/package/@qaskills/mcp"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            View on npm
          </a>
          <a
            href="https://github.com/PramodDutta/qaskills/tree/main/packages/mcp"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Source on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
