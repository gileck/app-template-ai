/**
 * ListView
 *
 * Action-focused list view that surfaces items needing attention.
 * Organized in collapsible sections by workflow status.
 * Supports bulk selection for approve/delete operations.
 */

import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight, Github } from 'lucide-react';
import { Card, CardContent } from '@/client/components/template/ui/card';
import { StatusBadge, SelectCheckbox, formatDate } from './shared';
import type { PendingItem, WorkflowItem } from '@/apis/template/workflow/types';

// ── Collapsible Section ──────────────────────────────────────────────────────

interface CollapsibleSectionProps {
    title: string;
    count: number;
    collapsed: boolean;
    onToggle: () => void;
    children: ReactNode;
}

export function CollapsibleSection({ title, count, collapsed, onToggle, children }: CollapsibleSectionProps) {
    return (
        <div className="mb-6">
            <button
                onClick={onToggle}
                className="flex items-center gap-1.5 mb-3 group min-h-11"
            >
                {collapsed ? (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide group-hover:text-foreground transition-colors">
                    {title} ({count})
                </h2>
            </button>
            {!collapsed && (
                <div className="flex flex-col gap-2">
                    {children}
                </div>
            )}
        </div>
    );
}

// ── Pending Card ─────────────────────────────────────────────────────────────

interface PendingCardProps {
    item: PendingItem;
    onSelect: (id: string) => void;
    selectMode?: boolean;
    selected?: boolean;
    onToggleSelect?: () => void;
}

export function PendingCard({ item, onSelect, selectMode, selected, onToggleSelect }: PendingCardProps) {
    return (
        <Card
            className={`cursor-pointer hover:bg-accent/50 transition-colors ${selected ? 'ring-2 ring-primary' : ''}`}
            onClick={() => selectMode ? onToggleSelect?.() : onSelect(item.id)}
        >
            <CardContent className="p-4">
                <div className="flex gap-3">
                    {selectMode && <SelectCheckbox selected={!!selected} />}
                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium leading-tight line-clamp-2">
                                {item.title}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                                {formatDate(item.createdAt)}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge label={item.type === 'bug' ? 'Bug' : 'Feature'} colorKey={item.type} />
                            <StatusBadge label="Pending Approval" />
                            {item.priority && (
                                <StatusBadge label={item.priority} colorKey={item.priority} />
                            )}
                            {item.source && (
                                <StatusBadge label={`via ${item.source}`} colorKey="source" />
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ── Workflow Card ────────────────────────────────────────────────────────────

interface WorkflowCardProps {
    item: WorkflowItem;
    onSelect: (id: string) => void;
    selectMode?: boolean;
    selected?: boolean;
    onToggleSelect?: () => void;
}

export function WorkflowCard({ item, onSelect, selectMode, selected, onToggleSelect }: WorkflowCardProps) {
    const navId = item.sourceId || item.id;
    const typeLabel = item.type === 'bug' ? 'Bug' : item.type === 'task' ? 'Task' : 'Feature';
    const ghUrl = item.content?.url;
    return (
        <Card
            className={`cursor-pointer hover:bg-accent/50 transition-colors ${selected ? 'ring-2 ring-primary' : ''}`}
            onClick={() => selectMode ? onToggleSelect?.() : onSelect(navId)}
        >
            <CardContent className="p-4">
                <div className="flex gap-3">
                    {selectMode && <SelectCheckbox selected={!!selected} />}
                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium leading-tight line-clamp-2">
                                {item.content?.title || 'Untitled'}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {item.implementationPhase && (
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Phase {item.implementationPhase}
                                    </span>
                                )}
                                {item.createdAt && (
                                    <span className="text-xs text-muted-foreground">
                                        {formatDate(item.createdAt)}
                                    </span>
                                )}
                                {item.content?.number && (
                                    <span className="text-xs text-muted-foreground">
                                        #{item.content.number}
                                    </span>
                                )}
                                {ghUrl && (
                                    <a
                                        href={ghUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                        title="Open GitHub issue"
                                    >
                                        <Github className="w-3.5 h-3.5" />
                                    </a>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge label={typeLabel} colorKey={item.type} />
                            <StatusBadge label={item.status || 'No status'} />
                            {item.reviewStatus && (
                                <StatusBadge label={item.reviewStatus} />
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ── ListView Props ───────────────────────────────────────────────────────────

interface ListViewProps {
    /** Filtered pending items to display */
    filteredPending: PendingItem[];
    /** Grouped pipeline items by status */
    pipelineGroups: { status: string; items: WorkflowItem[] }[];
    /** Done items */
    doneItems: WorkflowItem[];
    /** Section collapse state */
    collapsedSections: string[];
    /** Bulk selection mode */
    selectMode: boolean;
    /** Selected items map */
    selectedItems: Record<string, { type: 'feature' | 'bug'; mongoId: string }>;
    /** Toggle section collapse */
    onToggleSection: (section: string) => void;
    /** Select an item to view details */
    onSelectItem: (id: string) => void;
    /** Toggle item selection for bulk actions */
    onToggleItemSelect: (key: string, item: { type: 'feature' | 'bug'; mongoId: string }) => void;
    /** Parse item ID to extract mongoId */
    parseItemId: (id: string) => { mongoId: string };
}

export function ListView({
    filteredPending,
    pipelineGroups,
    doneItems,
    collapsedSections,
    selectMode,
    selectedItems,
    onToggleSection,
    onSelectItem,
    onToggleItemSelect,
    parseItemId,
}: ListViewProps) {
    const hasPending = filteredPending.length > 0;
    const hasPipelineGroups = pipelineGroups.length > 0;
    const hasDone = doneItems.length > 0;
    const isEmpty = !hasPending && !hasPipelineGroups && !hasDone;

    if (isEmpty) {
        return (
            <div className="text-sm text-muted-foreground py-8 text-center">
                No workflow items found.
            </div>
        );
    }

    return (
        <div>
            {hasPending && (
                <CollapsibleSection
                    title="Pending Approval"
                    count={filteredPending.length}
                    collapsed={collapsedSections.includes('pending')}
                    onToggle={() => onToggleSection('pending')}
                >
                    {filteredPending.map((item) => (
                        <PendingCard
                            key={item.id}
                            item={item}
                            onSelect={onSelectItem}
                            selectMode={selectMode}
                            selected={`pending:${item.id}` in selectedItems}
                            onToggleSelect={() => onToggleItemSelect(`pending:${item.id}`, { type: item.type, mongoId: parseItemId(item.id).mongoId })}
                        />
                    ))}
                </CollapsibleSection>
            )}

            {pipelineGroups.map((group) => (
                <CollapsibleSection
                    key={group.status}
                    title={group.status}
                    count={group.items.length}
                    collapsed={collapsedSections.includes(group.status)}
                    onToggle={() => onToggleSection(group.status)}
                >
                    {group.items.map((item) => {
                        const sourceId = item.sourceId;
                        const canSelect = sourceId && (item.type === 'feature' || item.type === 'bug');
                        const { mongoId } = sourceId ? parseItemId(sourceId) : { mongoId: '' };
                        return (
                            <WorkflowCard
                                key={item.id}
                                item={item}
                                onSelect={onSelectItem}
                                selectMode={selectMode && !!canSelect}
                                selected={`workflow:${item.id}` in selectedItems}
                                onToggleSelect={canSelect ? () => onToggleItemSelect(`workflow:${item.id}`, { type: item.type as 'feature' | 'bug', mongoId }) : undefined}
                            />
                        );
                    })}
                </CollapsibleSection>
            ))}

            {hasDone && (
                <CollapsibleSection
                    title="Done"
                    count={doneItems.length}
                    collapsed={collapsedSections.includes('Done')}
                    onToggle={() => onToggleSection('Done')}
                >
                    {doneItems.map((item) => {
                        const sourceId = item.sourceId;
                        const canSelect = sourceId && (item.type === 'feature' || item.type === 'bug');
                        const { mongoId } = sourceId ? parseItemId(sourceId) : { mongoId: '' };
                        return (
                            <WorkflowCard
                                key={item.id}
                                item={item}
                                onSelect={onSelectItem}
                                selectMode={selectMode && !!canSelect}
                                selected={`workflow:${item.id}` in selectedItems}
                                onToggleSelect={canSelect ? () => onToggleItemSelect(`workflow:${item.id}`, { type: item.type as 'feature' | 'bug', mongoId }) : undefined}
                            />
                        );
                    })}
                </CollapsibleSection>
            )}
        </div>
    );
}
