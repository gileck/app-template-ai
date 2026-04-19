---
title: MCP / SDK Programmatic Access
description: Give agents and scripts typed, authenticated access to every app endpoint via a bearer-token + X-On-Behalf-Of pattern.
summary: "Bake programmatic access into any child project: `ADMIN_API_TOKEN` + `X-On-Behalf-Of` lets a Node SDK or MCP server act as any user. Run `yarn init:mcp` to scaffold `packages/<name>-sdk/` and `packages/<name>-mcp/`."
priority: 4
related_docs:
  - admin.md
  - authentication.md
---

# MCP / SDK Programmatic Access

Template-provided pattern for letting agents and standalone scripts hit any `/api/process/*` endpoint as any user. The server half is baked in; the client half (SDK + MCP) is scaffolded on demand via `yarn init:mcp`.

## Auth model

Two parts cooperate:

1. **Server**: `getUserContext.ts` recognises `Authorization: Bearer <ADMIN_API_TOKEN>` + `X-On-Behalf-Of: <userId>`. When both are present and the token matches (constant-time compare), the request is treated as coming from `<userId>`. `authDebug.tokenAuth = true` is stamped on the context.
2. **Admin gate**: `processApiCall.ts` accepts `admin/*` calls when either `isAdmin` is true OR `authDebug.tokenAuth === true`. Anyone holding the token can therefore call `admin/users/list` to resolve usernames to ids — this is the canonical way for agents to translate "list plans for sarah" into a concrete user id.

**Security caveat:** `ADMIN_API_TOKEN` is god-mode. It can act on behalf of *any* user and reach *all* `admin/*` endpoints. Rotate on every suspected leak; never commit it; never log or echo it in agent output.

## Server-side (already in template)

No action required in a child project — these ship with the template:

| File | Role |
| --- | --- |
| `src/apis/getUserContext.ts` | Bearer + on-behalf-of auth path |
| `src/apis/processApiCall.ts` | Admin gate with `tokenAuth` bypass |
| `src/apis/template/auth/types.ts` | `AuthDebugInfo.tokenAuth?: boolean` |
| `src/apis/template/admin-users/` | `admin/users/list` endpoint |
| `src/server/database/collections/template/users/users.ts` | `listAllUsers()` |

Set `ADMIN_API_TOKEN` per environment:

```bash
# Local
echo 'ADMIN_API_TOKEN=<random-hex-64-chars>' >> .env.local

# Production / Preview
yarn vercel-cli env:push ADMIN_API_TOKEN
```

Generate a token with `openssl rand -hex 32` (or similar). Treat it like a password.

## Client-side (scaffold on demand)

### One-shot scaffold

```bash
yarn init:mcp              # uses project app name
yarn init:mcp my-cool-app  # or pass an explicit name
```

Produces:

```
packages/<name>-sdk/              # typed Node client
  package.json                     # @<name>/sdk
  src/
    index.ts                       # createClient() factory
    http.ts                        # callApi() + ClientOptions
    errors.ts                      # <Pascal>Error hierarchy
    validation.ts                  # assertNonEmptyString, etc.
    admin.ts                       # client.admin.users.list()
    ping.ts                        # starter domain — delete once you add real ones

packages/<name>-mcp/              # stdio MCP server
  package.json                     # @<name>/mcp
  src/
    server.ts                      # JSON-RPC over stdio
    tools.ts                       # TOOLS[] — starter: ping, list_users, call_api
  skills/use-<name>/
    SKILL.md                       # agent guidance (MCP + SDK paths)
```

It also adds `packages/**/node_modules` and `packages/**/dist` to `.gitignore`.

### Install + build

```bash
cd packages/<name>-sdk && yarn install && yarn build
cd ../<name>-mcp && yarn install && yarn build
```

### Wire into `.mcp.json`

```jsonc
{
  "mcpServers": {
    "<name>": {
      "command": "node",
      "args": ["packages/<name>-mcp/dist/server.js"],
      "env": {
        "<UPPER>_URL": "http://localhost:3000",
        "<UPPER>_TOKEN": "${ADMIN_API_TOKEN}",
        "<UPPER>_USER_ID": "${LOCAL_USER_ID}"
      }
    }
  }
}
```

Restart your MCP client (Claude Code, Claude Agent SDK, NanoClaw) to pick up the server.

### Use from a Node script

```ts
import { createClient } from '@<name>/sdk';

const client = createClient({
  baseUrl: 'https://<name>.example.com',
  adminToken: process.env.<UPPER>_TOKEN!,
  userId: '65f0abc...',
});

const me = await client.ping.me();          // default user
const list = await client.admin.users.list();
const other = client.asUser('65f1def...');   // scoped copy
await other.call('auth/me');                 // escape hatch for untyped endpoints
```

## Adding a typed domain

Each domain is a tiny function in `packages/<name>-sdk/src/` that returns methods wrapping `callApi`:

```ts
// packages/<name>-sdk/src/orders.ts
import { callApi, ClientOptions } from './http';
import { assertNonEmptyString } from './validation';

export interface Order { id: string; total: number }

export function ordersDomain(opts: ClientOptions) {
  return {
    list: () => callApi<{ orders: Order[] }>(opts, 'orders/list'),
    get: (id: string) => {
      assertNonEmptyString(id, 'id');
      return callApi<Order>(opts, 'orders/get', { id });
    },
  };
}
```

Then in `src/index.ts`:

```ts
import { ordersDomain } from './orders';
// ...
return {
  ping: pingDomain(opts),
  admin: adminDomain(opts),
  orders: ordersDomain(opts),
  // ...
};
```

And the matching MCP tool in `packages/<name>-mcp/src/tools.ts`:

```ts
{
  name: 'list_orders',
  description: 'List orders for the (on-behalf-of) user.',
  inputSchema: { type: 'object', properties: {}, required: [] },
  handler: (c) => c.orders.list(),
},
```

Rebuild (`yarn build`) and restart the MCP client.

## Bundling the MCP for container consumers

NanoClaw-style containers don't run `yarn install` inside the container. Ship a single bundled ESM file:

```bash
cd packages/<name>-mcp
npx esbuild src/server.ts --bundle --platform=node --format=esm --target=node20 \
  --outfile=dist/server.bundle.mjs
```

Point the consumer at `packages/<name>-mcp/dist/server.bundle.mjs` and set the same three env vars.

## Keeping scaffolds on template sync

`packages/` is project-owned — sync-template leaves it alone. Template improvements to the _shape_ of the scaffold (new starter files, error class changes) land in `scripts/template/init-mcp-templates/` and propagate on the next template sync; existing `packages/` contents are untouched. Re-running `yarn init:mcp` is idempotent — it only fills in files that don't exist yet, so you can use it to preview template additions without overwriting your customizations.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `401 Unauthorized` from MCP tool | `ADMIN_API_TOKEN` on server ≠ `<UPPER>_TOKEN` in MCP env. |
| `403 Forbidden` on `admin/*` | Token correct but `tokenAuth` was not set — check that the bearer path in `getUserContext.ts` runs before the dev shortcut. |
| `missing_on_behalf_of` tokenError | MCP client is not sending `<UPPER>_USER_ID`. |
| MCP starts but returns empty tool list | `tools.ts` `TOOLS` array is empty — add at least `ping`. |
