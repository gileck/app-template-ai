# Design Documents

This directory contains approved design documents for GitHub issues.

## Structure

```
design-docs/
├── issue-123/
│   ├── product-design.md
│   └── tech-design.md
└── issue-456/
    └── product-design.md
```

## Workflow

1. **Design agents create PRs** with design files in this directory
2. **Admin receives Telegram notification** with [Approve & Merge] / [Request Changes] buttons
3. **Approve & Merge** triggers:
   - PR merged with squash commit
   - Artifact comment posted/updated on the GitHub issue
   - Status advanced to next phase
4. **Implementation agent reads designs** from files (via artifact comment links)

## File Naming Convention

- `product-design.md` - Product Design document
- `tech-design.md` - Technical Design document

Each issue gets its own directory: `issue-{N}/`

## Artifact Storage

After a design PR is merged, design metadata is saved to MongoDB `artifacts.designs` on the workflow-item document (primary storage) and an artifact comment is posted on the GitHub issue for human readability:

```markdown
<!-- ISSUE_ARTIFACT_V1 -->
## Design Documents

| Document | Status | Updated | PR |
|----------|--------|---------|-----|
| [Product Design](design-docs/issue-123/product-design.md) | ✅ Approved | 2026-01-25 | #456 |
| [Technical Design](design-docs/issue-123/tech-design.md) | ✅ Approved | 2026-01-25 | #457 |
```

## Backward Compatibility

The implementation agent reads design paths from MongoDB `artifacts.designs` first, then falls back to parsing the GitHub issue artifact comment if no DB artifacts exist. This maintains compatibility with issues created before the DB-first approach was implemented. See [workflow-items-architecture.md](docs/template/github-agents-workflow/workflow-items-architecture.md) for details.
