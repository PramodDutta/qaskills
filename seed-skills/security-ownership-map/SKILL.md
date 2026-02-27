---
name: "Security Ownership Map"
description: "Analyze git repositories to build security ownership topology, compute bus factor for sensitive code, detect orphaned security-critical files, and export ownership graphs for visualization."
version: 1.0.0
author: openai
license: MIT
tags: [security, ownership, bus-factor, git-analysis, code-ownership]
testingTypes: [security]
frameworks: []
languages: [python, typescript, go]
domains: [backend, infrastructure, devops]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Security Ownership Map

Build a bipartite graph of people and files from git history to compute ownership risk, detect orphaned security-critical code, and identify bus factor hotspots.

## Overview

This skill analyzes git repositories to answer critical security ownership questions:

- **Who owns the security-sensitive code?** Map people to auth, crypto, and secrets-related files
- **What is the bus factor?** Identify files with dangerously low contributor diversity
- **Where is orphaned code?** Find sensitive code that hasn't been touched recently
- **How do files cluster?** Build co-change graphs to understand code movement patterns

## Workflow

### 1. Scope the Repository

- Define the repo root and any in-scope paths
- Set time window with `--since` / `--until` parameters
- Decide sensitivity rules (defaults flag auth/crypto/secret paths)

### 2. Build the Ownership Map

```bash
python run_ownership_map.py \
  --repo . \
  --out ownership-map-out \
  --since "12 months ago" \
  --emit-commits
```

### 3. Query Security Findings

```bash
# Orphaned sensitive code (stale + low bus factor)
python query_ownership.py --data-dir ownership-map-out summary --section orphaned_sensitive_code

# Hidden owners for sensitive tags
python query_ownership.py --data-dir ownership-map-out summary --section hidden_owners

# Sensitive hotspots with low bus factor
python query_ownership.py --data-dir ownership-map-out summary --section bus_factor_hotspots

# Auth/crypto files with bus factor <= 1
python query_ownership.py --data-dir ownership-map-out files --tag auth --bus-factor-max 1
```

## Output Artifacts

The analysis produces:

- `people.csv` — Nodes: people with timezone detection
- `files.csv` — Nodes: files with sensitivity tags
- `edges.csv` — Edges: touch relationships
- `cochange_edges.csv` — File-to-file co-change edges with Jaccard weight
- `summary.json` — Security ownership findings
- `communities.json` — Code community clusters with maintainers

## Sensitivity Rules

Default rules flag common sensitive paths:

```csv
# pattern,tag,weight
**/auth/**,auth,1.0
**/crypto/**,crypto,1.0
**/*.pem,secrets,1.0
**/middleware/auth*,auth,1.0
**/password*,auth,0.8
```

Override with `--sensitive-config path/to/sensitive.csv`.

## Key Security Queries

1. **Bus factor hotspots** — Files with bus_factor <= 1 that handle auth/crypto
2. **Orphaned code** — Sensitive files not touched in 6+ months
3. **Hidden owners** — Developers who silently control large portions of sensitive code
4. **Ownership drift** — Compare against CODEOWNERS to highlight discrepancies

## Best Practices

- Run quarterly to track ownership changes
- Compare against CODEOWNERS for drift detection
- Filter bots with `--ignore-author-regex '(bot|dependabot)'`
- Use `--window-days 90` to smooth churn effects
- Export to Neo4j/Gephi for visual analysis
