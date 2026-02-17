---
title: Implementation Roadmap
summary: Phase dependency graph, progress tracking, and execution order for the 7-phase pipeline architecture migration.
---

# Implementation Roadmap

## Phase Dependency Graph

```
Phase 1: Foundation (types, engine skeleton, registry, DB schema)
    ↓
Phase 2: Guards & Hooks (extract from current code)
    ↓
Phase 3: Pipeline Definitions (create 3 pipeline consts)
    ↓
Phase 4: Engine Core (implement engine.transition with validation)
    ↓
Phase 5: Internal Migration (refactor workflow-service functions)
    ↓
Phase 6: External Migration (migrate Telegram, API, CLI, agents)
    ↓
Phase 7: Cleanup (remove deprecated code)
```

Phases 1–3 can be partially parallelized (Phase 2 doesn't depend on Phase 1's engine skeleton, only on the types). But for simplicity and safety, execute them sequentially.

Phases 5 and 6 are the highest-risk phases — each function migration could break existing behavior. Migrate one function at a time and run the full E2E suite after each.

## Progress Tracking

| Phase | Description | Status | Tasks Done / Total |
|-------|-------------|--------|-------------------|
| 1 | Foundation | Not Started | 0 / 9 |
| 2 | Guards & Hooks | Not Started | 0 / 14 |
| 3 | Pipeline Definitions | Not Started | 0 / 6 |
| 4 | Engine Core | Not Started | 0 / 9 |
| 5 | Internal Migration | Not Started | 0 / 23 |
| 6 | External Migration | Not Started | 0 / 18 |
| 7 | Cleanup | Not Started | 0 / 9 |

**Total: 0 / 88 tasks**

## Execution Order

1. **Phase 1** — Create type system and skeleton. This is pure additive — no behavior changes, no risk.
2. **Phase 2** — Extract guards and hooks into standalone functions. Still additive — these functions exist but aren't called by the engine yet.
3. **Phase 3** — Create pipeline definitions. Additive — const objects that aren't used yet. Unit tests validate internal consistency.
4. **Phase 4** — Implement the engine core. Now the engine can execute transitions, but no callers use it yet. Unit tests validate engine behavior.
5. **Phase 5** — The critical phase. Each existing function becomes a thin wrapper around the engine. Migrate one at a time, run E2E after each. This is where regressions will appear.
6. **Phase 6** — Migrate transport layer (Telegram, API, CLI, agents). Lower risk because the wrapper functions from Phase 5 already validate the engine works.
7. **Phase 7** — Remove the old code. After Phase 6, the old function bodies are dead code. Remove them and clean up exports.

## Rollback Strategy

Each phase can be rolled back independently:

- **Phases 1–4**: Pure additive. Rollback = delete the new files.
- **Phase 5**: Each function wrapper can be reverted to the original implementation by restoring the old function body.
- **Phase 6**: Each transport migration can be reverted by restoring the old import/call pattern.
- **Phase 7**: If cleanup breaks something, restore the removed code from git.

The key safety net is the E2E test suite. If any test fails after a migration step, stop and investigate before proceeding.

## Sub-Phase Documents

| Phase | Document |
|-------|----------|
| Phase 1 | [phase-1-foundation.md](./phase-1-foundation.md) |
| Phase 2 | [phase-2-guards-and-hooks.md](./phase-2-guards-and-hooks.md) |
| Phase 3 | [phase-3-pipeline-definitions.md](./phase-3-pipeline-definitions.md) |
| Phase 4 | [phase-4-engine-core.md](./phase-4-engine-core.md) |
| Phase 5 | [phase-5-internal-migration.md](./phase-5-internal-migration.md) |
| Phase 6 | [phase-6-external-migration.md](./phase-6-external-migration.md) |
| Phase 7 | [phase-7-cleanup.md](./phase-7-cleanup.md) |
