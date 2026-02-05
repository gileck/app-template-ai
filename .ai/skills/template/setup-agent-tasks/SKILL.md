---
name: setup-agent-tasks
description: Set up agent tasks for a child project using task-cli. Use this when configuring scheduled workflow agents for a new project.
---
# Setup Agent Tasks for a Child Project

The `agent-tasks/` folder is **not synced** from the template. Each child project needs its own task-cli configuration.

## Steps

### 1. Create the folder structure

```bash
mkdir -p agent-tasks/all/runs
```

### 2. Create `agent-tasks/all/config.json`

Replace `<repo-name>` with the project's repository name (e.g., `my-app`, `book-reader`):

```json
{
  "name": "Agent(<repo-name>): All",
  "uniqueKey": "<repo-name>:agent:all",
  "description": "Runs all workflow agents sequentially every 10 minutes",
  "script": {
    "path": "github-workflows-agent",
    "args": ["--all", "--global-limit", "--stream", "--reset"],
    "interpreter": "npm",
    "workingDirectory": "/Users/gileck/Projects/agents-copy/<repo-name>"
  },
  "schedule": {
    "type": "interval",
    "value": "600000"
  },
  "retry": {
    "enabled": true,
    "maxAttempts": 3,
    "backoffType": "exponential",
    "initialDelayMs": 10000,
    "maxDelayMs": 60000
  },
  "timeout": { "ms": 900000 },
  "notifications": {
    "onStart": false,
    "onSuccess": false,
    "onFailure": true
  },
  "options": {
    "enabled": true,
    "allowParallelRuns": false,
    "requiresInternet": true
  },
  "output": {
    "logFile": "/Users/gileck/Projects/<repo-name>/agent-tasks/all/runs/output.log",
    "statusFile": "/Users/gileck/Projects/<repo-name>/agent-tasks/all/runs/status.json"
  }
}
```

### 3. Register the task

```bash
task-cli create --config=./agent-tasks/all/config.json
```

### 4. Verify

```bash
task-cli get <repo-name>:agent:all
```

## Key configuration points

- **`script.workingDirectory`** — Must point to the project's agents copy (e.g., `/Users/gileck/Projects/agents-copy/<repo-name>`). Create it with `yarn init-agents-copy` if it doesn't exist.
- **`output.logFile` / `output.statusFile`** — Must point to the project's own `agent-tasks/all/runs/` folder, not the template's.
- **`uniqueKey`** — Use `<repo-name>:agent:all` to avoid conflicts with other projects.
- **`name`** — Use `Agent(<repo-name>): All` to identify the project in `task-cli get` output.

## What `--all --global-limit` does

- `--all` runs agents in order: auto-advance, product-dev, product-design, bug-investigator, tech-design, implement, pr-review
- `--global-limit` stops after the first agent that processes items; remaining agents run in the next 10-minute cycle
- This creates natural review gaps (e.g., PR reviewer runs in a later cycle than the implementor)

## Managing the task

```bash
# Check status (shows last run, next run, enabled)
task-cli get <repo-name>:agent:all

# Run manually
task-cli run <repo-name>:agent:all --wait

# Edit (after updating config.json)
task-cli edit <repo-name>:agent:all --config=./agent-tasks/all/config.json

# Delete
task-cli delete <repo-name>:agent:all --force
```

## Full documentation

See [docs/template/github-agents-workflow/agent-tasks.md](docs/template/github-agents-workflow/agent-tasks.md) for detailed reference.
