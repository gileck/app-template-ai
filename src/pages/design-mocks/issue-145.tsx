/**
 * Design Mock Page for Issue #145: Weekly Progress Dashboard
 *
 * This page displays multiple design options for review.
 */

import React, { useState, Suspense } from 'react';

// Lazy load each design option
const OptionA = React.lazy(() => import('./components/issue-145-optA'));
const OptionB = React.lazy(() => import('./components/issue-145-optB'));
const OptionC = React.lazy(() => import('./components/issue-145-optC'));

type TabOption = 'A' | 'B' | 'C';

const tabs: { id: TabOption; label: string }[] = [
  { id: 'A', label: 'Option A' },
  { id: 'B', label: 'Option B' },
  { id: 'C', label: 'Option C' },
];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function Issue145DesignMocks() {
  const [activeTab, setActiveTab] = useState<TabOption>('A');

  return (
    <div className="min-h-screen bg-background">
      {/* Tab Navigation */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-md mx-auto px-4">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-md mx-auto">
        <Suspense fallback={<LoadingFallback />}>
          {activeTab === 'A' && <OptionA />}
          {activeTab === 'B' && <OptionB />}
          {activeTab === 'C' && <OptionC />}
        </Suspense>
      </div>
    </div>
  );
}
