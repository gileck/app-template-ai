import { useMemo } from 'react';
import { Card, CardContent } from '@/client/components/template/ui/card';
import { Button } from '@/client/components/template/ui/button';
import { Input } from '@/client/components/template/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/client/components/template/ui/select';
import { Badge } from '@/client/components/template/ui/badge';
import { toast } from '@/client/components/template/ui/toast';
import { Copy, Trash2, LayoutGrid, List as ListIcon, Terminal } from 'lucide-react';
import {
    useSessionLogs,
    clearSessionLogs,
    type SessionLog,
    type LogLevel,
} from '@/client/features/template/session-logs';
import { useDebugStore, type LogLevelFilter } from './store';

const LEVEL_BADGE_VARIANT: Record<LogLevel, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    debug: 'outline',
    info: 'secondary',
    warn: 'default',
    error: 'destructive',
};

const LEVEL_TEXT_CLASS: Record<LogLevel, string> = {
    debug: 'text-muted-foreground',
    info: 'text-info',
    warn: 'text-warning',
    error: 'text-destructive',
};

function formatLogLine(log: SessionLog): string {
    const time = new Date(log.timestamp).toISOString();
    const perf = log.performanceTime !== undefined ? ` +${log.performanceTime}ms` : '';
    const meta = log.meta ? ` ${JSON.stringify(log.meta)}` : '';
    const route = log.route ? ` (${log.route})` : '';
    return `[${time}${perf}] [${log.level.toUpperCase()}] [${log.feature}]${route} ${log.message}${meta}`;
}

export function Debug() {
    const logs = useSessionLogs();
    const search = useDebugStore((s) => s.search);
    const setSearch = useDebugStore((s) => s.setSearch);
    const levelFilter = useDebugStore((s) => s.levelFilter);
    const setLevelFilter = useDebugStore((s) => s.setLevelFilter);
    const viewMode = useDebugStore((s) => s.viewMode);
    const setViewMode = useDebugStore((s) => s.setViewMode);

    const filteredLogs = useMemo(() => {
        const query = search.trim().toLowerCase();
        const filtered = logs
            .filter((log) => (levelFilter === 'all' ? true : log.level === levelFilter))
            .filter((log) => {
                if (!query) return true;
                const haystack = `${log.level} ${log.feature} ${log.message} ${log.route ?? ''} ${log.meta ? JSON.stringify(log.meta) : ''}`.toLowerCase();
                return haystack.includes(query);
            });
        // Console view shows logs in chronological order (oldest -> newest), like a real console.
        // Cards/list show newest first.
        return viewMode === 'console' ? filtered : filtered.slice().reverse();
    }, [logs, search, levelFilter, viewMode]);

    const handleCopyAll = async () => {
        const ordered = viewMode === 'console' ? filteredLogs : filteredLogs.slice().reverse();
        const text = ordered.map(formatLogLine).join('\n');
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`Copied ${filteredLogs.length} log${filteredLogs.length === 1 ? '' : 's'}`);
        } catch {
            toast.error('Failed to copy logs');
        }
    };

    const handleCopyOne = async (log: SessionLog) => {
        try {
            await navigator.clipboard.writeText(formatLogLine(log));
            toast.success('Log copied');
        } catch {
            toast.error('Failed to copy log');
        }
    };

    const handleClear = () => {
        clearSessionLogs();
        toast.success('Logs cleared');
    };

    return (
        <div className="mx-auto max-w-4xl py-4 px-2 sm:px-4 pb-20 sm:pb-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-semibold">Debug</h1>
                    <p className="text-xs text-muted-foreground">
                        {filteredLogs.length} of {logs.length} session log{logs.length === 1 ? '' : 's'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9"
                        onClick={handleCopyAll}
                        disabled={filteredLogs.length === 0}
                    >
                        <Copy className="mr-1.5 h-4 w-4" />
                        Copy all
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9"
                        onClick={handleClear}
                        disabled={logs.length === 0}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* View mode toggle */}
            <div className="flex gap-2">
                <ViewModeButton
                    active={viewMode === 'cards'}
                    onClick={() => setViewMode('cards')}
                    icon={<LayoutGrid className="mr-1.5 h-4 w-4" />}
                    label="Cards"
                />
                <ViewModeButton
                    active={viewMode === 'list'}
                    onClick={() => setViewMode('list')}
                    icon={<ListIcon className="mr-1.5 h-4 w-4" />}
                    label="List"
                />
                <ViewModeButton
                    active={viewMode === 'console'}
                    onClick={() => setViewMode('console')}
                    icon={<Terminal className="mr-1.5 h-4 w-4" />}
                    label="Console"
                />
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input
                    placeholder="Search message, feature, route, meta…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9"
                />
                <Select
                    value={levelFilter}
                    onValueChange={(value) => setLevelFilter(value as LogLevelFilter)}
                >
                    <SelectTrigger className="h-9 w-28 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All levels</SelectItem>
                        <SelectItem value="debug">Debug</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warn">Warn</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {filteredLogs.length === 0 ? (
                <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                        {logs.length === 0 ? 'No logs captured in this session yet.' : 'No logs match the current filters.'}
                    </CardContent>
                </Card>
            ) : viewMode === 'console' ? (
                <ConsoleView logs={filteredLogs} />
            ) : viewMode === 'list' ? (
                <ListView logs={filteredLogs} onCopy={handleCopyOne} />
            ) : (
                <CardsView logs={filteredLogs} onCopy={handleCopyOne} />
            )}
        </div>
    );
}

interface ViewModeButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}

function ViewModeButton({ active, onClick, icon, label }: ViewModeButtonProps) {
    return (
        <Button
            variant={active ? 'default' : 'outline'}
            size="sm"
            onClick={onClick}
            className="flex-1 h-9"
        >
            {icon}
            {label}
        </Button>
    );
}

interface LogViewProps {
    logs: SessionLog[];
}

interface InteractiveLogViewProps extends LogViewProps {
    onCopy: (log: SessionLog) => void;
}

function CardsView({ logs, onCopy }: InteractiveLogViewProps) {
    return (
        <div className="space-y-2">
            {logs.map((log) => (
                <Card key={log.id}>
                    <CardContent className="p-3 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant={LEVEL_BADGE_VARIANT[log.level]} className="text-[10px] uppercase">
                                {log.level}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                                {log.feature}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                                {new Date(log.timestamp).toLocaleTimeString()}
                                {log.performanceTime !== undefined ? ` · +${log.performanceTime}ms` : ''}
                            </span>
                            {log.route && (
                                <span className="text-[10px] text-muted-foreground truncate">
                                    {log.route}
                                </span>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="ml-auto h-7 px-2"
                                onClick={() => onCopy(log)}
                            >
                                <Copy className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                        <p className="text-sm break-words">{log.message}</p>
                        {log.meta && (
                            <pre className="text-[11px] bg-muted rounded p-2 overflow-x-auto">
                                {JSON.stringify(log.meta, null, 2)}
                            </pre>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function ListView({ logs, onCopy }: InteractiveLogViewProps) {
    const expandedIds = useDebugStore((s) => s.expandedIds);
    const toggleExpanded = useDebugStore((s) => s.toggleExpanded);

    return (
        <Card>
            <CardContent className="p-0 divide-y divide-border">
                {logs.map((log) => {
                    const isExpanded = expandedIds.includes(log.id);
                    return (
                        <div key={log.id}>
                            <button
                                type="button"
                                onClick={() => toggleExpanded(log.id)}
                                className="w-full text-left px-3 py-2 flex items-center gap-2 min-h-11 hover:bg-muted/50 transition-colors"
                            >
                                <Badge
                                    variant={LEVEL_BADGE_VARIANT[log.level]}
                                    className="text-[10px] uppercase shrink-0"
                                >
                                    {log.level}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                                    {log.feature}
                                </span>
                                <span className="text-xs flex-1 truncate">{log.message}</span>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                            </button>
                            {isExpanded && (
                                <div className="px-3 pb-3 pt-1 space-y-1.5 bg-muted/30">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-[10px] text-muted-foreground">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                            {log.performanceTime !== undefined ? ` · +${log.performanceTime}ms` : ''}
                                        </span>
                                        {log.route && (
                                            <span className="text-[10px] text-muted-foreground truncate">
                                                {log.route}
                                            </span>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="ml-auto h-7 px-2"
                                            onClick={() => onCopy(log)}
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    <p className="text-sm break-words">{log.message}</p>
                                    {log.meta && (
                                        <pre className="text-[11px] bg-muted rounded p-2 overflow-x-auto">
                                            {JSON.stringify(log.meta, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}

function ConsoleView({ logs }: LogViewProps) {
    return (
        <Card>
            <CardContent className="p-0">
                <pre className="font-mono text-[11px] leading-relaxed p-3 overflow-x-auto">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className={`${LEVEL_TEXT_CLASS[log.level]} whitespace-pre-wrap break-words`}
                        >
                            [+{log.performanceTime ?? 0}ms] {log.message}
                        </div>
                    ))}
                </pre>
            </CardContent>
        </Card>
    );
}
