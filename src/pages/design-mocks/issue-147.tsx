/**
 * Issue #147 - Redesign the Todo List Page
 *
 * Design mock page with tabs for different design options.
 */

import React, { useState, Suspense } from 'react';

// Lazy load design options
const OptionA = React.lazy(() => import('./components/issue-147-optA'));
const OptionB = React.lazy(() => import('./components/issue-147-optB'));
const OptionC = React.lazy(() => import('./components/issue-147-optC'));

type OptionKey = 'optA' | 'optB' | 'optC';

const options: { key: OptionKey; label: string; description: string }[] = [
  { key: 'optA', label: 'Option A', description: 'Card Grid Layout' },
  { key: 'optB', label: 'Option B', description: 'Progress Dashboard' },
  { key: 'optC', label: 'Option C', description: 'Timeline View' },
];

export default function Issue147DesignMocks() {
  const [activeOption, setActiveOption] = useState<OptionKey>('optA');

  const renderOption = () => {
    switch (activeOption) {
      case 'optA':
        return <OptionA />;
      case 'optB':
        return <OptionB />;
      case 'optC':
        return <OptionC />;
      default:
        return <OptionA />;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Tab Navigation */}
      <div className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-md mx-auto">
          <div className="flex">
            {options.map((option) => (
              <button
                key={option.key}
                onClick={() => setActiveOption(option.key)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeOption === option.key
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="block">{option.label}</span>
                <span className="block text-xs opacity-70">{option.description}</span>
                {activeOption === option.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Design Mock Content */}
      <div className="max-w-md mx-auto bg-background min-h-[calc(100vh-80px)] shadow-sm">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Loading design...</div>
            </div>
          }
        >
          {renderOption()}
        </Suspense>
      </div>

      {/* Issue Info Footer */}
      <div className="max-w-md mx-auto p-4 text-center text-xs text-muted-foreground">
        <p>Issue #147: Redesign the Todo List Page</p>
        <p className="mt-1">Click the state toggle buttons within each design to see different states</p>
      </div>
    </div>
  );
}
