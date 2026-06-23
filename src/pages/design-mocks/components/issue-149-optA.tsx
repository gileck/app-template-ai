/**
 * Option A: Kanban Board View
 *
 * A visual kanban-style board showing workflow items in swim lanes by status.
 * Optimized for quick status scanning and drag-and-drop mental model.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/client/components/template/ui/card';
import { Badge } from '@/client/components/template/ui/badge';
import { Button } from '@/client/components/template/ui/button';
import { Skeleton } from '@/client/components/template/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/client/components/template/ui/sheet';

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
  },
  {
    id: '2',
    title: 'Fix login redirect issue',
    type: 'bug' as const,
    status: 'Pending Approval',
    priority: 'critical',
    createdAt: '1 day ago',
  },
  {
    id: '3',
    title: 'Improve search performance',
    type: 'feature' as const,
    status: 'Product Design',
    priority: 'medium',
    createdAt: '5 days ago',
    reviewStatus: 'Waiting for Review',
  },
  {
    id: '4',
    title: 'Update user profile UI',
    type: 'feature' as const,
    status: 'Technical Design',
    priority: 'low',
    createdAt: '1 week ago',
  },
  {
    id: '5',
    title: 'Database connection timeout',
    type: 'bug' as const,
    status: 'Bug Investigation',
    priority: 'high',
    createdAt: '3 days ago',
  },
  {
    id: '6',
    title: 'Add export to CSV feature',
    type: 'feature' as const,
    status: 'Ready for development',
    priority: 'medium',
    createdAt: '2 weeks ago',
  },
  {
    id: '7',
    title: 'Implement pagination',
    type: 'feature' as const,
    status: 'PR Review',
    priority: 'medium',
    createdAt: '3 weeks ago',
    reviewStatus: 'Approved',
  },
];

const STATUSES = [
  { key: 'Pending Approval', label: 'Pending', color: 'bg-amber-500' },
  { key: 'Product Design', label: 'Design', color: 'bg-purple-500' },
  { key: 'Technical Design', label: 'Tech Design', color: 'bg-blue-500' },
  { key: 'Bug Investigation', label: 'Bug Inv.', color: 'bg-pink-500' },
  { key: 'Ready for development', label: 'Ready', color: 'bg-orange-500' },
  { key: 'PR Review', label: 'PR Review', color: 'bg-cyan-500' },
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

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-blue-500',
    low: 'bg-gray-400',
  };
  return <div className={`w-2 h-2 rounded-full ${colors[priority] || 'bg-gray-400'}`} />;
}

function KanbanCard({ item, onClick }: { item: typeof MOCK_ITEMS[0]; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors mb-2"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <PriorityDot priority={item.priority} />
          <span className="text-sm font-medium leading-tight line-clamp-2 flex-1">
            {item.title}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <TypeBadge type={item.type} />
          <span className="text-[10px] text-muted-foreground">{item.createdAt}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({ status, items, onItemClick }: {
  status: typeof STATUSES[0];
  items: typeof MOCK_ITEMS;
  onItemClick: (item: typeof MOCK_ITEMS[0]) => void;
}) {
  const columnItems = items.filter((item) => item.status === status.key);

  return (
    <div className="flex-shrink-0 w-[280px] snap-start">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`w-2 h-2 rounded-full ${status.color}`} />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {status.label}
        </h3>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-auto">
          {columnItems.length}
        </Badge>
      </div>
      <div className="space-y-2 min-h-[200px] bg-muted/30 rounded-lg p-2">
        {columnItems.map((item) => (
          <KanbanCard key={item.id} item={item} onClick={() => onItemClick(item)} />
        ))}
        {columnItems.length === 0 && (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
            No items
          </div>
        )}
      </div>
    </div>
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
            <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
          </div>
          <SheetTitle className="text-left">{item.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <PriorityDot priority={item.priority} />
              <span className="capitalize">{item.priority} priority</span>
            </div>
            <span>Created {item.createdAt}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            This is where the full item description would appear, along with any attachments, comments, and related information.
          </p>
          <div className="flex gap-2 pt-4">
            <Button className="flex-1">Approve</Button>
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
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-shrink-0 w-[280px]">
            <Skeleton className="h-4 w-20 mb-3" />
            <div className="space-y-2 bg-muted/30 rounded-lg p-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 className="text-lg font-medium mb-2">No workflow items</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          When users submit feature requests or bug reports, they will appear here for review and processing.
        </p>
      </div>
    </div>
  );
}

function PopulatedView() {
  const [selectedItem, setSelectedItem] = useState<typeof MOCK_ITEMS[0] | null>(null);

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Workflow</h1>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {MOCK_ITEMS.length} items
          </Badge>
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          2 Pending
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          1 Design
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 text-xs font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
          1 PR Review
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status.key}
            status={status}
            items={MOCK_ITEMS}
            onItemClick={setSelectedItem}
          />
        ))}
      </div>

      {/* Item detail sheet */}
      <ItemDetailSheet
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}

export default function OptionA({ viewState = 'populated' }: { viewState?: ViewState }) {
  if (viewState === 'loading') return <LoadingState />;
  if (viewState === 'empty') return <EmptyState />;
  return <PopulatedView />;
}
