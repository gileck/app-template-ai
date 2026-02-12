/**
 * Issue #149: Redesign the workflow main UI page
 *
 * Design mock options for the workflow page redesign.
 * Each option presents a different approach to displaying and managing workflow items.
 */

import React, { Suspense, useState } from 'react';
import { Skeleton } from '@/client/components/template/ui/skeleton';

// Lazy load each option component
const OptionA = React.lazy(() => import('./components/issue-149-optA'));
const OptionB = React.lazy(() => import('./components/issue-149-optB'));
const OptionC = React.lazy(() => import('./components/issue-149-optC'));

type ViewState = 'populated' | 'empty' | 'loading';

const OPTIONS = [
  { id: 'A', label: 'Option A', description: 'Kanban Board' },
  { id: 'B', label: 'Option B', description: 'Action-Focused List' },
  { id: 'C', label: 'Option C', description: 'Timeline View' },
] as const;

function LoadingFallback() {
  return (
    <div className="p-4">
      <Skeleton className="h-6 w-24 mb-4" />
      <Skeleton className="h-10 w-full mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function MockPage({
  viewState,
  colorMode,
}: {
  viewState?: string;
  colorMode?: string;
}) {
  const [activeTab, setActiveTab] = useState<'A' | 'B' | 'C'>('A');
  const typedViewState = (viewState as ViewState) || 'populated';

  // colorMode is handled by the parent shell via CSS class

  return (
    <div className="min-h-screen bg-background">
      {/* Tab navigation */}
      <div className="sticky top-12 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-md mx-auto px-4">
          <div className="flex">
            {OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setActiveTab(opt.id as 'A' | 'B' | 'C')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === opt.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <div>{opt.label}</div>
                <div className="text-[10px] text-muted-foreground">{opt.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Option content */}
      <div className="max-w-md mx-auto">
        <Suspense fallback={<LoadingFallback />}>
          {activeTab === 'A' && <OptionA viewState={typedViewState} />}
          {activeTab === 'B' && <OptionB viewState={typedViewState} />}
          {activeTab === 'C' && <OptionC viewState={typedViewState} />}
        </Suspense>
      </div>
    </div>
  );
}
