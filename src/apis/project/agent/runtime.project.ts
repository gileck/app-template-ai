/**
 * Project-owned agent runtime config (NOT synced from template).
 *
 * The template owns the agent API plumbing (conversations, messages,
 * traces, attachments); this is the thin per-project seam that points the
 * `agent/sendMessage` endpoint at THIS project's agent. The
 * `build-app-agent` skill rewrites these two values per project.
 */
export const agentRuntime = {
    /** RPC handler module the daemon runs for each turn. No file
     *  extension — the daemon resolves `.ts`/`.js`/`/index.*`. */
    handlerPath: 'src/server/project/demo-agent/handler',
    /** Default system prompt for the agent (overridable per-turn via the
     *  sendMessage request's `systemPrompt`). */
    systemPrompt:
        'You are a helpful assistant. You have these tools available: ' +
        'get_time (returns the current server time, optionally in a given timezone), ' +
        'calculate (one arithmetic operation on two numbers), and ' +
        'ask_user (ask the user one or more multiple-choice questions and wait for their answer — ' +
        'use it whenever the next step depends on a choice among concrete options; each question ' +
        'can be single-choice or multiSelect, and you may ask several at once). ' +
        'Use them when relevant. Be concise.',
};
