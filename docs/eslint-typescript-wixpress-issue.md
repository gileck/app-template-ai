# ESLint TypeScript Issue with Wixpress Registry

## Problem Summary

ESLint fails with the error `tsutils.iterateComments is not a function` when linting TypeScript files. This prevents `yarn lint` and `yarn checks` from passing.

## Root Cause

The **wixpress npm registry** (`https://npm.dev.wixpress.com/`) contains a broken version of `@typescript-eslint` packages (version `8.52.0`) that:

1. **Uses deprecated `tsutils` package** - The `tsutils` package was deprecated and replaced with `ts-api-utils`. The old `tsutils` doesn't work with TypeScript 5.x.

2. **Version doesn't exist on public npm** - Version `8.52.0` of `@typescript-eslint/*` packages doesn't exist on the public npm registry (https://registry.npmjs.org/). The latest public version is around `8.18.x`.

3. **Forced by user's global `.npmrc`** - The user's `~/.npmrc` is configured to use the wixpress registry:
   ```
   registry=https://npm.dev.wixpress.com/
   ```

## Error Message

```
./src/apis/apis.ts
Error: Parsing error: tsutils.iterateComments is not a function

./src/apis/auth/client.ts
Error: Parsing error: tsutils.iterateComments is not a function
... (all .ts and .tsx files)
```

## What Was Tried (Failed Attempts)

### 1. Removing `next/typescript` from ESLint Config
**Approach:** Remove `"next/typescript"` from the ESLint extends array to avoid loading TypeScript ESLint rules.

**Result:** Failed. The `next/core-web-vitals` config still loads the TypeScript parser internally for `.ts` and `.tsx` files.

### 2. Overriding the Parser for TypeScript Files
**Approach:** Add a config block to override the parser for TypeScript files:
```javascript
{
  files: ["**/*.ts", "**/*.tsx"],
  languageOptions: {
    parser: undefined, // Use default espree parser
  }
}
```

**Result:** Failed. The Next.js ESLint config overrides this setting.

### 3. Using Yarn Resolutions
**Approach:** Add resolutions to `package.json` to force specific versions:
```json
"resolutions": {
  "@typescript-eslint/eslint-plugin": "^8.0.0",
  "@typescript-eslint/parser": "^8.0.0",
  "@typescript-eslint/typescript-estree": "^8.0.0"
}
```

**Result:** Failed. Yarn still resolves to `8.52.0` from the wixpress registry because it's the only version available there.

### 4. Clearing Yarn Cache and Reinstalling
**Approach:**
```bash
yarn cache clean
rm -rf node_modules yarn.lock
yarn install
```

**Result:** Failed. Fresh install still pulls `8.52.0` from wixpress registry.

### 5. Downgrading TypeScript to 4.9.5
**Approach:** Downgrade TypeScript to a version that might work with the old `tsutils` package.

**Result:** Failed. The `tsutils` error persists regardless of TypeScript version. Also caused additional issues:
- `moduleResolution: "bundler"` not supported in TypeScript 4.9.5
- Required changing to `moduleResolution: "node"`

### 6. Downgrading eslint-config-next
**Approach:** Downgrade `eslint-config-next` to version `14.2.0` hoping it uses older `@typescript-eslint` versions.

**Result:** Failed. Still resolves to `8.52.0` from the wixpress registry.

### 7. Project-Level .npmrc Override
**Approach:** Create a project-level `.npmrc` to override the registry for `@typescript-eslint` packages:
```
@typescript-eslint:registry=https://registry.npmjs.org/
```

**Result:** Not possible. User cannot access the public npm registry (`https://registry.npmjs.org/`) from their network.

## The Real Solution (Not Implemented)

The **real solution** would be one of the following:

### Option A: Fix the Wixpress Registry
Contact wixpress registry administrators to:
1. Update `@typescript-eslint` packages to versions that use `ts-api-utils` instead of `tsutils`
2. Or mirror the correct versions from public npm

**Why it didn't work:** This requires administrative access to the wixpress registry, which is outside the developer's control.

### Option B: Access Public npm Registry
Configure network access to allow reaching `https://registry.npmjs.org/` for specific packages.

**Why it didn't work:** Network/firewall restrictions prevent access to the public npm registry.

## Current Workaround

The workaround disables ESLint for TypeScript files entirely and relies on the TypeScript compiler for type checking.

### ESLint Configuration

In `eslint.config.mjs`, TypeScript files are ignored:
```javascript
const eslintConfig = [
  // Ignore ALL TypeScript files to avoid the broken parser
  {
    ignores: ["**/*.ts", "**/*.tsx"]
  },
  // Only apply Next.js ESLint config to JavaScript files
  ...compat.extends("next/core-web-vitals"),
  // ... rest of config
];
```

### TypeScript Configuration

TypeScript 5.x is used with modern settings in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    // ... other options
  }
}
```

### Trade-offs

| What Works | What's Lost |
|------------|-------------|
| `yarn ts` - TypeScript type checking | TypeScript-aware ESLint rules (e.g., `@typescript-eslint/no-unused-vars`) |
| `yarn lint` - JavaScript ESLint + Next.js rules | ESLint errors/warnings for TypeScript files |
| `yarn checks` - Both pass | IDE ESLint integration for TypeScript files |

### Validation Commands

```bash
# TypeScript type checking (works)
yarn ts

# ESLint (works, but skips TypeScript files)
yarn lint

# Both checks (works)
yarn checks
```

## Yarn Lock Management

### The Problem

When running `yarn install` locally with the wixpress registry, `yarn.lock` gets populated with wixpress URLs:
```
"@typescript-eslint/parser@npm:^8.0.0":
  version: 8.52.0
  resolution: "@typescript-eslint/parser@npm:8.52.0"
  ...
```

If this `yarn.lock` is committed and pushed, **Vercel builds will fail** because Vercel uses the public npm registry and can't find these wixpress-specific versions.

### The Solution

**Before every commit**, checkout `yarn.lock` to keep the clean version with npmjs.org URLs:

```bash
git checkout yarn.lock
git add <other-files>
git commit -m "your message"
git push
```

This ensures:
- **Locally:** Your `yarn.lock` has wixpress URLs (works with your registry)
- **Git/Vercel:** The committed `yarn.lock` has npmjs.org URLs (works on Vercel)

### Why Not .gitignore?

Adding `yarn.lock` to `.gitignore` was considered but rejected because:
- Less reproducible builds
- Different developers might get different package versions
- Not a best practice for production projects

## Environment Differences

| Environment | Registry | TypeScript | ESLint | Works? |
|-------------|----------|------------|--------|--------|
| Local (wixpress) | npm.dev.wixpress.com | 5.x | Skips TS files | Yes |
| Vercel | registry.npmjs.org | 5.x | Could lint TS files* | Yes |

*Vercel gets correct `@typescript-eslint` packages from public npm, so ESLint could theoretically lint TypeScript files there. However, we keep the workaround consistent across environments.

## Future Resolution

When one of the following becomes available, the workaround can be removed:

1. **Wixpress registry is updated** with correct `@typescript-eslint` packages
2. **Network access** to public npm registry is granted
3. **Alternative registry** with correct packages becomes available

### To Revert the Workaround

1. Remove the `ignores: ["**/*.ts", "**/*.tsx"]` block from `eslint.config.mjs`
2. Add back `"next/typescript"` to the extends array
3. Change `no-unused-vars` back to `@typescript-eslint/no-unused-vars`

## Related Files

- `eslint.config.mjs` - ESLint configuration with TypeScript files ignored
- `package.json` - TypeScript ^5.0.0, contains resolutions (ineffective but left for documentation)
- `tsconfig.json` - TypeScript configuration with `moduleResolution: "bundler"`
- `yarn.lock` - Must be checked out before commits to avoid wixpress URLs
