# Agent Tasks

This folder contains task-cli configurations for scheduled agent tasks. These tasks run automatically via [task-cli](https://github.com/gileck/task-cli).

## Tasks Overview

| Task | Schedule | Purpose |
|------|----------|---------|
| `all/` | Every 10 min | Runs all GitHub workflow agents sequentially |
| `repo-commits-code-reviewer/` | Every 4 hours | Reviews commits for bugs and improvements |

---

## `all/` — Workflow Agents

Runs all GitHub workflow agents in order:
1. auto-advance
2. product-dev
3. product-design
4. bug-investigator
5. tech-design
6. implement
7. pr-review

**Key flags:**
- `--all` — Run all agents in sequence
- `--global-limit` — Stop after first agent that processes items (others run next cycle)
- `--reset` — Reset agent state between runs

**Working directory:** Runs on `agents-copy/<repo>` (not the main project) to avoid conflicts.

---

## `repo-commits-code-reviewer/` — Code Reviewer

Standalone agent that reviews git commits for bugs and improvements.

**How it works:**
1. Reads `state.json` to find last reviewed commit
2. Gets new commits using diff-budget batching (~1500 lines per run)
3. Uses Claude to analyze diffs for bugs/improvements
4. Creates issues via `yarn agent-workflow create` for Telegram approval
5. Updates `state.json` with latest commit

**Working directory:** Runs on main project (needs actual git history).

**State file:** `repo-commits-code-reviewer/state.json` tracks the last reviewed commit.

---

## Folder Structure

```
agent-tasks/
├── README.md                      # This file
├── all/
│   ├── config.json                # task-cli configuration
│   └── runs/
│       ├── output.log             # Latest run output
│       └── status.json            # Run status
└── repo-commits-code-reviewer/
    ├── config.json                # task-cli configuration
    ├── state.json                 # Last reviewed commit
    └── runs/
        ├── output.log             # Latest run output
        └── status.json            # Run status
```

---

## Managing Tasks

```bash
# List all tasks
task-cli list

# Check task status
task-cli get app-template:agent:all
task-cli get app-template:agent:repo-commits-code-reviewer

# Run manually
task-cli run app-template:agent:all --wait
task-cli run app-template:agent:repo-commits-code-reviewer --wait

# Enable/disable
task-cli disable app-template:agent:all
task-cli enable app-template:agent:all

# Edit after config changes
task-cli edit app-template:agent:all --config=./agent-tasks/all/config.json
```

---

## Setup for Child Projects

This folder is **not synced** from the template. Each child project needs its own configuration.

Use `/setup-agent-tasks` skill or see [setup-agent-tasks guideline](docs/template/project-guidelines/setup-agent-tasks.md) for instructions.
