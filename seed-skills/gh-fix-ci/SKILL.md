---
name: "GitHub CI Fix Debugging"
description: "Debug and fix failing GitHub PR checks by inspecting GitHub Actions logs, summarizing failure context, drafting fix plans, and implementing fixes after approval."
version: 1.0.0
author: openai
license: MIT
tags: [github-actions, ci, debugging, pr-checks, fix]
testingTypes: [integration]
frameworks: [github-actions]
languages: [yaml, typescript, javascript, python]
domains: [devops]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# GitHub CI Fix Debugging

Use `gh` CLI to locate failing PR checks, fetch GitHub Actions logs for actionable failures, summarize the failure, propose a fix plan, and implement after explicit approval.

## Prerequisites

Authenticate with the GitHub CLI:

```bash
gh auth login  # Ensure repo + workflow scopes
gh auth status  # Verify authentication
```

## Workflow

### 1. Verify Authentication

```bash
gh auth status
```

If unauthenticated, ask the user to run `gh auth login` with repo + workflow scopes.

### 2. Resolve the PR

```bash
# Current branch PR
gh pr view --json number,url

# Or use a specific PR number
gh pr checks <pr-number>
```

### 3. Inspect Failing Checks

```bash
# List all PR checks with status
gh pr checks <pr> --json name,state,bucket,link,startedAt,completedAt,workflow

# For each failing check, get the run details
gh run view <run_id> --json name,workflowName,conclusion,status,url

# Fetch the logs
gh run view <run_id> --log
```

### 4. Scope Non-GitHub Actions Checks

- If `detailsUrl` is not a GitHub Actions run, label it as external
- Only report the URL for external providers (Buildkite, etc.)

### 5. Summarize Failures

For each failing check, provide:
- The failing check name
- The run URL
- A concise log snippet showing the actual failure
- Root cause analysis

### 6. Create a Fix Plan

Draft a concise plan including:
- What failed and why
- Proposed fix with specific file changes
- Impact assessment
- Request explicit approval before implementing

### 7. Implement After Approval

- Apply the approved plan
- Summarize diffs and changes made
- Run relevant tests locally if possible

### 8. Recheck Status

```bash
# After fixes, verify checks pass
gh pr checks <pr>
```

## Common CI Failure Patterns

### Test Failures
- Check test output for assertion errors
- Look for environment-specific issues
- Verify test data and fixtures

### Build Failures
- Check dependency versions and lockfiles
- Verify TypeScript/compilation errors
- Check for missing environment variables

### Lint/Format Failures
- Run linter locally to reproduce
- Apply auto-fix where possible
- Check for new rule violations

### Timeout Issues
- Identify slow tests or builds
- Check for infinite loops or deadlocks
- Consider increasing timeout or optimizing
