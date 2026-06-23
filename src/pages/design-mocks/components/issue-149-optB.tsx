/**
 * Option B: Action-Focused List View
 *
 * A streamlined list view that prioritizes actionable items at the top.
 * Shows items needing attention first, with inline quick actions.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/client/components/template/ui/card';
import { Badge } from '@/client/components/template/ui/badge';
import { Button } from '@/client/components/template/ui/button';
import { Skeleton } from '@/client/components/template/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/client/components/template/ui/sheet';
import { Separator } from '@/client/components/template/ui/separator';

type ViewState = 'populated' | 'empty' | 'loading';

// Sample workflow items for the mock
const MOCK_ITEMS = [
  {
    id: '1',
    title: 'Add dark mode support',
    type: 'feature' as const,
    status: 'Pending Approval',
    priority: 'high',
    createdAt: '2 days ago',
    needsAction: true,
    actionLabel: 'Approve',
  },
  {
    id: '2',
    title: 'Fix login redirect issue',
    type: 'bug' as const,
    status: 'Pending Approval',
    priority: 'critical',
    createdAt: '1 day ago',
    needsAction: true,
    actionLabel: 'Approve',
  },
  {
    id: '3',
    title: 'Improve search performance',
    type: 'feature' as const,
    status: 'Product Design',
    priority: 'medium',
    createdAt: '5 days ago',
    needsAction: true,
    actionLabel: 'Review Design',
    reviewStatus: 'Waiting for Review',
  },
  {
    id: '4',
    title: 'Implement pagination',
    type: 'feature' as const,
    status: 'PR Review',
    priority: 'medium',
    createdAt: '3 weeks ago',
    needsAction: true,
    actionLabel: 'Review PR',
    reviewStatus: 'Approved',
  },
  {
    id: '5',
    title: 'Update user profile UI',
    type: 'feature' as const,
    status: 'Technical Design',
    priority: 'low',
    createdAt: '1 week ago',
    needsAction: false,
  },
  {
    id: '6',
    title: 'Database connection timeout',
    type: 'bug' as const,
    status: 'Bug Investigation',
    priority: 'high',
    createdAt: '3 days ago',
    needsAction: false,
  },
  {
    id: '7',
    title: 'Add export to CSV feature',
    type: 'feature' as const,
    status: 'Ready for development',
    priority: 'medium',
    createdAt: '2 weeks ago',
    needsAction: false,
  },
];

function TypeBadge({ type }: { type: 'feature' | 'bug' }) {
  return (
    <Badge
      variant="secondary"
      className={`text-[10px] px-1.5 py-0 ${
        type === 'bug' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      }`}
    >
      {type === 'bug' ? 'Bug' : 'Feature'}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'Pending Approval': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Product Design': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Technical Design': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Bug Investigation': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    'Ready for development': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'PR Review': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  };
  return (
    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${colors[status] || 'bg-muted'}`}>
      {status}
    </Badge>
  );
}

function ActionItem({ item, onTap, onAction }: {
  item: typeof MOCK_ITEMS[0];
  onTap: () => void;
  onAction: (e: React.MouseEvent) => void;
}) {
  return (
    <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={onTap}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Urgent indicator */}
          {item.priority === 'critical' && (
            <div className="w-1 h-full min-h-[60px] bg-red-500 rounded-full flex-shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-sm font-medium leading-tight line-clamp-2">
                {item.title}
              </span>
              {item.actionLabel && (
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs px-3 shrink-0"
                  onClick={onAction}
                >
                  {item.actionLabel}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <TypeBadge type={item.type} />
              <StatusBadge status={item.status} />
              <span className="text-[10px] text-muted-foreground ml-auto">{item.createdAt}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RegularItem({ item, onTap }: {
  item: typeof MOCK_ITEMS[0];
  onTap: () => void;
}) {
  return (
    <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={onTap}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium leading-tight line-clamp-1">
              {item.title}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <TypeBadge type={item.type} />
              <StatusBadge status={item.status} />
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">{item.createdAt}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ItemDetailSheet({ item, open, onClose }: {
  item: typeof MOCK_ITEMS[0] | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader>
          <div className="flex items-center gap-2 mb-2">
            <TypeBadge type={item.type} />
            <StatusBadge status={item.status} />
          </div>
          <SheetTitle className="text-left">{item.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="capitalize">{item.priority} priority</span>
            <span>Created {item.createdAt}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            This is where the full item description would appear, along with any attachments, comments, and related information.
          </p>
          <div className="flex gap-2 pt-4">
            {item.actionLabel && <Button className="flex-1">{item.actionLabel}</Button>}
            <Button variant="outline" className="flex-1">View Details</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LoadingState() {
  return (
    <div className="p-4">
      <Skeleton className="h-6 w-24 mb-4" />
      <Skeleton className="h-10 w-full mb-4" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-4">Workflow</h1>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-medium mb-2">All caught up!</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          No items need your attention right now. New feature requests and bug reports will appear here.
        </p>
      </div>
    </div>
  );
}

function PopulatedView() {
  const [selectedItem, setSelectedItem] = useState<typeof MOCK_ITEMS[0] | null>(null);

  const actionItems = MOCK_ITEMS.filter((item) => item.needsAction);
  const inProgressItems = MOCK_ITEMS.filter((item) => !item.needsAction);

  return (
    <div className="p-4">
      {/* Header with action count */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Workflow</h1>
        {actionItems.length > 0 && (
          <Badge className="bg-primary text-primary-foreground">
            {actionItems.length} need attention
          </Badge>
        )}
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-4">
        <div className="flex-1">
          <div className="text-2xl font-bold">{actionItems.length}</div>
          <div className="text-xs text-muted-foreground">Action required</div>
        </div>
        <Separator orientation="vertical" className="h-10" />
        <div className="flex-1">
          <div className="text-2xl font-bold">{inProgressItems.length}</div>
          <div className="text-xs text-muted-foreground">In progress</div>
        </div>
        <Separator orientation="vertical" className="h-10" />
        <div className="flex-1">
          <div className="text-2xl font-bold">{MOCK_ITEMS.length}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
      </div>

      {/* Action required section */}
      {actionItems.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Needs Your Attention
          </h2>
          <div className="space-y-2">
            {actionItems.map((item) => (
              <ActionItem
                key={item.id}
                item={item}
                onTap={() => setSelectedItem(item)}
                onAction={(e) => {
                  e.stopPropagation();
                  // Action would be handled here
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* In progress section */}
      {inProgressItems.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            In Progress
          </h2>
          <div className="space-y-2">
            {inProgressItems.map((item) => (
              <RegularItem
                key={item.id}
                item={item}
                onTap={() => setSelectedItem(item)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Item detail sheet */}
      <ItemDetailSheet
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}

export default function OptionB({ viewState = 'populated' }: { viewState?: ViewState }) {
  if (viewState === 'loading') return <LoadingState />;
  if (viewState === 'empty') return <EmptyState />;
  return <PopulatedView />;
}
