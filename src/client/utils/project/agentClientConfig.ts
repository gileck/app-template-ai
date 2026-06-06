/**
 * Project-owned agent client config (NOT synced from template).
 *
 * The template owns the agent hooks/store/UI plumbing; this is the thin
 * per-project client seam the `build-app-agent` skill customizes. It lives
 * under `client/utils/project` (not `features/project`) so the
 * template-owned agent store can import it without crossing the
 * template→project module boundary (enforced by the boundaries ESLint
 * rule, which only restricts the features/routes/components element types).
 */
export const agentClientConfig = {
    /** Default model id the agent model-picker starts on. */
    defaultModelId: 'claude-code-sonnet',
};
