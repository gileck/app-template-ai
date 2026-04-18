import { createStore } from '@/client/stores';
import type { LogLevel } from '@/client/features/template/session-logs';

export type LogLevelFilter = LogLevel | 'all';
export type DebugViewMode = 'cards' | 'list' | 'console';

interface DebugState {
    search: string;
    levelFilter: LogLevelFilter;
    viewMode: DebugViewMode;
    expandedIds: string[];
    setSearch: (search: string) => void;
    setLevelFilter: (level: LogLevelFilter) => void;
    setViewMode: (mode: DebugViewMode) => void;
    toggleExpanded: (id: string) => void;
}

export const useDebugStore = createStore<DebugState>({
    key: 'debug-storage',
    label: 'Debug',
    creator: (set) => ({
        search: '',
        levelFilter: 'all',
        viewMode: 'cards',
        expandedIds: [],
        setSearch: (search) => set({ search }),
        setLevelFilter: (levelFilter) => set({ levelFilter }),
        setViewMode: (viewMode) => set({ viewMode }),
        toggleExpanded: (id) =>
            set((state) => ({
                expandedIds: state.expandedIds.includes(id)
                    ? state.expandedIds.filter((existing) => existing !== id)
                    : [...state.expandedIds, id],
            })),
    }),
    persistOptions: {
        partialize: (state) => ({
            levelFilter: state.levelFilter,
            viewMode: state.viewMode,
        }),
    },
});
