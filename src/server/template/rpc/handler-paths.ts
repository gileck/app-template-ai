import { resolve, sep } from 'path';

// Allowlisted base directories for RPC handler modules. A job's handlerPath is
// only executable if it resolves to a file inside one of these roots:
//   - template RPC handlers (codex, claude-code-sdk, test-ping, …)
//   - project handlers (e.g. the agent handler)
// This is both a path-traversal guard (the separator-aware prefix check rejects
// `src/server/...-evil` and `../` escapes) and a capability restriction: the
// daemon dynamically import()s whatever path a job names, so without an
// allowlist ANY default-export function under src/server/ could be invoked as a
// handler. Keep this list in sync with where handlers actually live.
const ALLOWED_HANDLER_BASES = [
  'src/server/template/rpc/handlers',
  'src/server/project',
];

/**
 * Resolve a job's handlerPath to an absolute path and verify it sits inside an
 * allowlisted handler root. Returns the resolved absolute path on success, or
 * null if the path escapes every allowed base (traversal or non-handler dir).
 */
export function resolveAllowedHandlerPath(handlerPath: string): string | null {
  const resolved = resolve(process.cwd(), handlerPath);
  for (const base of ALLOWED_HANDLER_BASES) {
    const absBase = resolve(process.cwd(), base);
    // Require a separator after the base so `<base>` and `<base>-evil` don't
    // match — only true descendants `<base>/<handler>` are allowed.
    if (resolved.startsWith(absBase + sep)) {
      return resolved;
    }
  }
  return null;
}
