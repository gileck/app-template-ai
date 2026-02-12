/**
 * Option C: Timeline/Activity Stream View
 *
 * A chronological timeline view showing recent activity and workflow progress.
 * Emphasizes recency and provides context about what happened and when.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/client/components/template/ui/card';
import { Badge } from '@/client/components/template/ui/badge';
import { Button } from '@/client/components/template/ui/button';
import { Skeleton } from '@/client/components/template/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/client/components/template/ui/sheet';
import { Avatar, AvatarFallback } from '@/client/components/template/ui/avatar';

type ViewState = 'populated' | 'empty' | 'loading';

// Sample activity items for the mock
const MOCK_ACTIVITIES = [
  {
    id: '1',
    title: 'Fix login redirect issue',
    type: 'bug' as const,
    status: 'Pending Approval',
    priority: 'critical',
    event: 'submitted',
    eventLabel: 'New bug report submitted',
    timestamp: '10 minutes ago',
    actor: 'John D.',
    actorInitials: 'JD',
  },
  {
    id: '2',
    title: 'Add dark mode support',
    type: 'feature' as const,
    status: 'Pending Approval',
    priority: 'high',
    event: 'submitted',
    eventLabel: 'New feature request',
    timestamp: '2 hours ago',
    actor: 'Sarah M.',
    actorInitials: 'SM',
  },
  {
    id: '3',
    title: 'Improve search performance',
    type: 'feature' as const,
    status: 'Product Design',
    priority: 'medium',
    event: 'design_ready',
    eventLabel: 'Design ready for review',
    timestamp: '5 hours ago',
    actor: 'AI Agent',
    actorInitials: 'AI',
  },
  {
    id: '4',
    title: 'Implement pagination',
    type: 'feature' as const,
    status: 'PR Review',
    priority: 'medium',
    event: 'pr_created',
    eventLabel: 'Pull request created',
    timestamp: 'Yesterday',
    actor: 'AI Agent',
    actorInitials: 'AI',
  },
  {
    id: '5',
    title: 'Update user profile UI',
    type: 'feature' as const,
    status: 'Technical Design',
    priority: 'low',
    event: 'moved',
    eventLabel: 'Moved to Technical Design',
    timestamp: '2 days ago',
    actor: 'Admin',
    actorInitials: 'AD',
  },
  {
    id: '6',
    title: 'Database connection timeout',
    type: 'bug' as const,
    status: 'Bug Investigation',
    priority: 'high',
    event: 'investigating',
    eventLabel: 'Investigation started',
    timestamp: '3 days ago',
    actor: 'AI Agent',
    actorInitials: 'AI',
  },
];

const EVENT_ICONS: Record<string, { icon: string; color: string }> = {
  submitted: { icon: '📥', color: 'bg-amber-100 dark:bg-amber-900/30' },
  design_ready: { icon: '🎨', color: 'bg-purple-100 dark:bg-purple-900/30' },
  pr_created: { icon: '🔀', color: 'bg-cyan-100 dark:bg-cyan-900/30' },
  moved: { icon: '➡️', color: 'bg-blue-100 dark:bg-blue-900/30' },
  investigating: { icon: '🔍', color: 'bg-pink-100 dark:bg-pink-900/30' },
  approved: { icon: '✅', color: 'bg-green-100 dark:bg-green-900/30' },
  merged: { icon: '🎉', color: 'bg-green-100 dark:bg-green-900/30' },
};

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

function ActivityCard({ activity, onClick }: {
  activity: typeof MOCK_ACTIVITIES[0];
  onClick: () => void;
}) {
  const eventConfig = EVENT_ICONS[activity.event] || { icon: '📌', color: 'bg-muted' };

  return (
    <div className="flex gap-3">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full ${eventConfig.color} flex items-center justify-center text-lg`}>
          {eventConfig.icon}
        </div>
        <div className="w-0.5 flex-1 bg-border mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">{activity.eventLabel}</span>
          <span className="text-[10px] text-muted-foreground">{activity.timestamp}</span>
        </div>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={onClick}>
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium leading-tight line-clamp-2">
                  {activity.title}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <TypeBadge type={activity.type} />
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {activity.status}
                  </Badge>
                </div>
              </div>
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-[10px] bg-muted">
                  {activity.actorInitials}
                </AvatarFallback>
              </Avatar>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ItemDetailSheet({ item, open, onClose }: {
  item: typeof MOCK_ACTIVITIES[0] | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!item) return null;

  const isActionable = item.status === 'Pending Approval' || item.event === 'design_ready' || item.event === 'pr_created';

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
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-[10px] bg-muted">
                {item.actorInitials}
              </AvatarFallback>
            </Avatar>
            <span>{item.actor}</span>
            <span className="text-muted-foreground/60">•</span>
            <span>{item.timestamp}</span>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs font-medium text-muted-foreground mb-1">Latest Activity</div>
            <div className="text-sm">{item.eventLabel}</div>
          </div>

          <p className="text-sm text-muted-foreground">
            This is where the full item description would appear, along with any attachments, comments, and related information.
          </p>

          <div className="flex gap-2 pt-4">
            {isActionable && (
              <Button className="flex-1">
                {item.status === 'Pending Approval' ? 'Approve' : item.event === 'design_ready' ? 'Review Design' : 'Review PR'}
              </Button>
            )}
            <Button variant="outline" className={isActionable ? 'flex-1' : 'w-full'}>
              View Details
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FilterTabs({ active, onChange }: { active: string; onChange: (v: string) => void }) {
  const tabs = [
    { value: 'all', label: 'All Activity' },
    { value: 'needs_action', label: 'Needs Action' },
    { value: 'recent', label: 'Recent Changes' },
  ];

  return (
    <div className="flex gap-1 p-1 rounded-lg bg-muted overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
            active === tab.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="p-4">
      <Skeleton className="h-6 w-24 mb-4" />
      <Skeleton className="h-10 w-full mb-4" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-3 w-32 mb-2" />
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
          <span className="text-2xl">📭</span>
        </div>
        <h2 className="text-lg font-medium mb-2">No activity yet</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Your workflow timeline will show feature requests, bug reports, and their progress through the pipeline.
        </p>
      </div>
    </div>
  );
}

function PopulatedView() {
  const [selectedItem, setSelectedItem] = useState<typeof MOCK_ACTIVITIES[0] | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredActivities = MOCK_ACTIVITIES.filter((activity) => {
    if (activeFilter === 'needs_action') {
      return activity.status === 'Pending Approval' || activity.event === 'design_ready' || activity.event === 'pr_created';
    }
    if (activeFilter === 'recent') {
      return activity.timestamp.includes('minutes') || activity.timestamp.includes('hours');
    }
    return true;
  });

  const actionableCount = MOCK_ACTIVITIES.filter(
    (a) => a.status === 'Pending Approval' || a.event === 'design_ready' || a.event === 'pr_created'
  ).length;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Workflow</h1>
        {actionableCount > 0 && (
          <Badge className="bg-primary text-primary-foreground">
            {actionableCount} pending
          </Badge>
        )}
      </div>

      {/* Filter tabs */}
      <div className="mb-4">
        <FilterTabs active={activeFilter} onChange={setActiveFilter} />
      </div>

      {/* Today marker */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground px-2">Today</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Timeline */}
      <div>
        {filteredActivities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onClick={() => setSelectedItem(activity)}
          />
        ))}
      </div>

      {filteredActivities.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No activities match this filter.
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

export default function OptionC({ viewState = 'populated' }: { viewState?: ViewState }) {
  if (viewState === 'loading') return <LoadingState />;
  if (viewState === 'empty') return <EmptyState />;
  return <PopulatedView />;
}
