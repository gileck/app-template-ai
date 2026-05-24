import { createStore } from '@/client/stores';

interface AgentUIState {
    /** Currently-selected conversation id, or null when on the empty
     *  "start a new chat" screen. Persisted so reopening the app
     *  resumes the last thread. */
    selectedConversationId: string | null;
    /** Last picked agent model id. Persisted so the picker remembers
     *  across sessions. */
    selectedModelId: string;
    /** Per-message: which messages have their thinking timeline
     *  expanded. Not persisted — it's a transient view choice and the
     *  default (collapsed) is fine on each app load. */
    expandedTimelineMessageIds: string[];
    /** When on, the thread renders every trace entry inline alongside
     *  messages, with timestamps + layer/level metadata. Persisted so
     *  developers leave it on across reloads. */
    verboseMode: boolean;

    setSelectedConversationId: (id: string | null) => void;
    setSelectedModelId: (id: string) => void;
    toggleTimelineExpanded: (messageId: string) => void;
    setVerboseMode: (on: boolean) => void;
}

const DEFAULT_MODEL_ID = 'claude-code-sonnet';

export const useAgentUIStore = createStore<AgentUIState>({
    key: 'agent-ui',
    label: 'Agent UI',
    creator: (set, get) => ({
        selectedConversationId: null,
        selectedModelId: DEFAULT_MODEL_ID,
        expandedTimelineMessageIds: [],
        verboseMode: false,
        setSelectedConversationId: (id) => set({ selectedConversationId: id }),
        setSelectedModelId: (id) => set({ selectedModelId: id }),
        toggleTimelineExpanded: (messageId) => {
            const current = get().expandedTimelineMessageIds;
            set({
                expandedTimelineMessageIds: current.includes(messageId)
                    ? current.filter((id) => id !== messageId)
                    : [...current, messageId],
            });
        },
        setVerboseMode: (on) => set({ verboseMode: on }),
    }),
    persistOptions: {
        partialize: (state) => ({
            selectedConversationId: state.selectedConversationId,
            selectedModelId: state.selectedModelId,
            verboseMode: state.verboseMode,
        }),
    },
});
