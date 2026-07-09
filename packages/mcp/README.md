# QASkills MCP Server

MCP server for [QASkills.sh](https://qaskills.sh), search, inspect, and install QA testing skills from any MCP client.

## Claude Code

```bash
claude mcp add qaskills -- npx -y @qaskills/mcp
```

## Generic MCP Config

```json
{
  "mcpServers": {
    "qaskills": {
      "command": "npx",
      "args": ["-y", "@qaskills/mcp"]
    }
  }
}
```

## Tools

| Tool                | Description                                                                        |
| ------------------- | ---------------------------------------------------------------------------------- |
| `search_skills`     | Search skills by query, testing type, framework, language, agent, sort, and limit. |
| `get_skill`         | Get skill metadata by slug without the full markdown body.                         |
| `get_skill_content` | Get raw SKILL.md markdown for a skill.                                             |
| `install_skill`     | Install a skill into the current project or a target directory.                    |
| `list_categories`   | List categories grouped by testing type, framework, language, and domain.          |
| `get_leaderboard`   | Get top skills from the QASkills.sh leaderboard.                                   |

## Environment Variables

| Variable               | Description                                                   |
| ---------------------- | ------------------------------------------------------------- |
| `QASKILLS_API_URL`     | Override the API base URL, defaults to `https://qaskills.sh`. |
| `QASKILLS_TELEMETRY=0` | Disable install telemetry.                                    |
| `DO_NOT_TRACK=1`       | Disable install telemetry.                                    |
