# Agent Tasks

This folder contains task-cli configurations for scheduled local tasks. These run automatically via [task-cli](https://github.com/gileck/task-cli).

## Tasks Overview

| Task | Schedule | Purpose |
|------|----------|---------|
| `rpc-daemon/` | Always-on (auto-restart) | Runs the RPC-over-MongoDB daemon that executes remote jobs on the local machine |

---

## `rpc-daemon/` — RPC Daemon

Runs the local RPC daemon (`yarn daemon`) that polls MongoDB for jobs inserted by the deployed app and executes them locally (used to bypass datacenter IP blocks). See [rpc-architecture.md](../docs/template/rpc-architecture.md).

**Working directory:** Runs on the main project.

---

## Folder Structure

```
agent-tasks/
├── README.md                      # This file
└── rpc-daemon/
    ├── config.json                # task-cli configuration
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
task-cli get app-template:rpc-daemon

# Run manually
task-cli run app-template:rpc-daemon --wait

# Enable/disable
task-cli disable app-template:rpc-daemon
task-cli enable app-template:rpc-daemon

# Edit after config changes
task-cli edit app-template:rpc-daemon --config=./agent-tasks/rpc-daemon/config.json
```

---

## Setup for Child Projects

This folder is **not synced** from the template. Each child project registers its own RPC daemon — see the `/enable-rpc-calls` skill.
