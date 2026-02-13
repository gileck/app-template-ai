/**
 * TimelineView
 *
 * Chronological activity stream showing workflow events.
 * Mobile-first design with filter tabs for activity types.
 *
 * Features:
 * - Activity feed with emoji icons and timestamps
 * - Filter tabs for All Activity, Needs Action, Recent Changes
 * - Actor display for tracking who did what
 * - Relative timestamps (e.g., "2 hours ago")
 */

import { useMemo } from 'react';
import { Github, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/client/components/template/ui/card';
import { formatRelativeTime, StatusBadge } from './shared';
import { useWorkflowPageStore } from '../store';
import type { TimelineFilter } from '../store';
import type { PendingItem, WorkflowItem } from '@/apis/template/workflow/types';

const TIMELINE_FILTER_OPTIONS: { value: TimelineFilter; label: string }[] = [
    { value: 'all', label: 'All Activity' },
    { value: 'needs-action', label: 'Needs Action' },
    { value: 'recent', label: 'Recent' },
];

interface TimelineFilterTabsProps {
    active: TimelineFilter;
    onChange: (v: TimelineFilter) => void;
}

function TimelineFilterTabs({ active, onChange }: TimelineFilterTabsProps) {
    return (
        <div className="flex rounded-lg bg-muted p-0.5 mb-4">
            {TIMELINE_FILTER_OPTIONS.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`flex-1 px-3 py-1.5 min-h-[36px] rounded-md text-xs font-medium transition-colors ${
                        active === opt.value
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

// ── Action Emoji Mapping ─────────────────────────────────────────────────────

const ACTION_EMOJI: Record<string, string> = {
    // Workflow actions
    'created': '🆕',
    'approved': '✅',
    'approve': '✅',
    'review-approve': '✅',
    'merged': '🎉',
    'merge-pr': '🎉',
    'merge-design-pr': '🎉',
    'merge-final-pr': '🏁',
    'rejected': '❌',
    'review-reject': '❌',
    'request-changes': '📝',
    'review-changes': '📝',
    'request-changes-pr': '📝',
    'request-changes-design-pr': '📝',
    'clarification-received': '💬',
    'clarification': '💬',
    'choose-recommended': '🎯',
    'approve-design': '🎨',
    'revert': '↩️',
    'revert-pr': '↩️',
    'merge-revert-pr': '↩️',
    'undo': '↩️',
    'undo-action': '↩️',
    'mark-done': '✓',
    'done': '✓',
    // Status transitions
    'moved': '➡️',
    'status-change': '➡️',
    'routed': '🔀',
    // Generic
    'update': '📝',
    'comment': '💬',
    'assigned': '👤',
    'pr-opened': '🔃',
    'design': '🎨',
};

function getActionEmoji(action: string): string {
    // Check exact match first
    if (ACTION_EMOJI[action]) return ACTION_EMOJI[action];
    // Check for partial matches
    const lowerAction = action.toLowerCase();
    for (const [key, emoji] of Object.entries(ACTION_EMOJI)) {
        if (lowerAction.includes(key)) return emoji;
    }
    return '📌';
}

// ── Timeline Event Type ──────────────────────────────────────────────────────

interface TimelineEvent {
    id: string;
    /** Emoji icon for the event */
    emoji: string;
    /** Main description of the event */
    description: string;
    /** Timestamp ISO string */
    timestamp: string;
    /** Actor who performed the action */
    actor?: string;
    /** Item type (feature, bug, task) */
    itemType: 'feature' | 'bug' | 'task' | 'pending';
    /** Item title for context */
    itemTitle: string;
    /** Item ID for navigation */
    itemId: string;
    /** Item number (GitHub issue) */
    itemNumber?: number;
    /** GitHub URL */
    githubUrl?: string;
    /** Whether this item needs action */
    needsAction: boolean;
    /** Original action type for filtering */
    action: string;
}

// ── Build Timeline Events ────────────────────────────────────────────────────

function buildTimelineEvents(
    pendingItems: PendingItem[],
    workflowItems: WorkflowItem[],
): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    // Add pending items as "created" events
    for (const item of pendingItems) {
        events.push({
            id: `pending-${item.id}`,
            emoji: '🆕',
            description: `New ${item.type === 'bug' ? 'bug report' : 'feature request'} submitted`,
            timestamp: item.createdAt,
            itemType: 'pending',
            itemTitle: item.title,
            itemId: item.id,
            needsAction: true, // Pending items need approval
            action: 'created',
        });
    }

    // Add workflow items and their history
    for (const item of workflowItems) {
        const navId = item.sourceId || item.id;
        const title = item.content?.title || 'Untitled';
        const itemType = item.type;

        // Add current state as an event (most recent)
        if (item.createdAt) {
            // Check if item needs action based on review status
            const needsAction = item.reviewStatus === 'Waiting for Review' ||
                item.reviewStatus === 'Request Changes' ||
                item.prData?.hasPendingDecision === true;

            events.push({
                id: `workflow-current-${item.id}`,
                emoji: getActionEmoji(item.status || 'update'),
                description: item.reviewStatus
                    ? `${item.status} — ${item.reviewStatus}`
                    : `Status: ${item.status || 'Unknown'}`,
                timestamp: item.createdAt,
                itemType,
                itemTitle: title,
                itemId: navId,
                itemNumber: item.content?.number,
                githubUrl: item.content?.url,
                needsAction,
                action: item.status || 'update',
            });
        }

        // Add history entries as events
        if (item.history && item.history.length > 0) {
            for (let i = 0; i < item.history.length; i++) {
                const entry = item.history[i];
                events.push({
                    id: `workflow-history-${item.id}-${i}`,
                    emoji: getActionEmoji(entry.action),
                    description: entry.description,
                    timestamp: entry.timestamp,
                    actor: entry.actor,
                    itemType,
                    itemTitle: title,
                    itemId: navId,
                    itemNumber: item.content?.number,
                    githubUrl: item.content?.url,
                    needsAction: false, // Historical events don't need action
                    action: entry.action,
                });
            }
        }
    }

    // Sort by timestamp, newest first
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return events;
}

// ── Timeline Event Card ──────────────────────────────────────────────────────

interface TimelineEventCardProps {
    event: TimelineEvent;
    onSelect: (id: string) => void;
}

function TimelineEventCard({ event, onSelect }: TimelineEventCardProps) {
    const typeLabel = event.itemType === 'bug' ? 'Bug'
        : event.itemType === 'task' ? 'Task'
        : event.itemType === 'pending' ? 'Pending'
        : 'Feature';

    return (
        <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => onSelect(event.itemId)}
        >
            <CardContent className="p-4">
                <div className="flex gap-3">
                    {/* Emoji icon */}
                    <div className="shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                        {event.emoji}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {/* Event description with timestamp */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm text-foreground leading-tight">
                                {event.description}
                            </p>
                            <span className="text-xs text-muted-foreground shrink-0">
                                {formatRelativeTime(event.timestamp)}
                            </span>
                        </div>

                        {/* Item context */}
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                            {event.itemTitle}
                        </p>

                        {/* Meta row: badges, actor, github link */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge label={typeLabel} colorKey={event.itemType === 'pending' ? 'feature' : event.itemType} />
                            {event.needsAction && (
                                <span className="inline-flex items-center gap-1 text-xs text-warning font-medium">
                                    <AlertCircle className="w-3 h-3" />
                                    Action needed
                                </span>
                            )}
                            {event.actor && (
                                <span className="text-xs text-muted-foreground">
                                    by {event.actor}
                                </span>
                            )}
                            {event.itemNumber && (
                                <span className="text-xs text-muted-foreground">
                                    #{event.itemNumber}
                                </span>
                            )}
                            {event.githubUrl && (
                                <a
                                    href={event.githubUrl}
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
                </div>
            </CardContent>
        </Card>
    );
}

// ── TimelineView Props ───────────────────────────────────────────────────────

interface TimelineViewProps {
    /** Filtered pending items */
    filteredPending: PendingItem[];
    /** Grouped pipeline items by status */
    pipelineGroups: { status: string; items: WorkflowItem[] }[];
    /** Done items */
    doneItems: WorkflowItem[];
    /** Select an item to view details */
    onSelectItem: (id: string) => void;
}

// ── Main TimelineView Component ──────────────────────────────────────────────

export function TimelineView({ filteredPending, pipelineGroups, doneItems, onSelectItem }: TimelineViewProps) {
    // Get timeline filter from store
    const timelineFilter = useWorkflowPageStore((s) => s.timelineFilter);
    const setTimelineFilter = useWorkflowPageStore((s) => s.setTimelineFilter);

    // Flatten all workflow items
    const allWorkflowItems = useMemo(() => {
        const items: WorkflowItem[] = [];
        for (const group of pipelineGroups) {
            items.push(...group.items);
        }
        items.push(...doneItems);
        return items;
    }, [pipelineGroups, doneItems]);

    // Build timeline events
    const allEvents = useMemo(
        () => buildTimelineEvents(filteredPending, allWorkflowItems),
        [filteredPending, allWorkflowItems]
    );

    // Filter events based on selected filter
    const filteredEvents = useMemo(() => {
        switch (timelineFilter) {
            case 'needs-action':
                return allEvents.filter((e) => e.needsAction);
            case 'recent': {
                // Show events from the last 24 hours
                const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
                return allEvents.filter((e) => new Date(e.timestamp).getTime() > oneDayAgo);
            }
            default:
                return allEvents;
        }
    }, [allEvents, timelineFilter]);

    // Empty state
    const isEmpty = filteredEvents.length === 0;

    return (
        <div>
            {/* Timeline Filter Tabs */}
            <TimelineFilterTabs active={timelineFilter} onChange={setTimelineFilter} />

            {/* Event List */}
            {isEmpty ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                    {timelineFilter === 'needs-action'
                        ? 'No items need action right now.'
                        : timelineFilter === 'recent'
                        ? 'No activity in the last 24 hours.'
                        : 'No workflow activity yet.'}
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {filteredEvents.map((event) => (
                        <TimelineEventCard
                            key={event.id}
                            event={event}
                            onSelect={onSelectItem}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
