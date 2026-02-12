/**
 * Weekly Progress Dashboard - Option B: Detailed Timeline View
 *
 * A comprehensive design showing daily breakdown with timeline visualization.
 * Includes day-by-day progress and detailed category breakdown.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/client/components/template/ui/card';
import { Button } from '@/client/components/template/ui/button';
import { Badge } from '@/client/components/template/ui/badge';
import { Separator } from '@/client/components/template/ui/separator';

// Mock data for detailed weekly progress
const weeklyData = {
  weekRange: 'Feb 5 - Feb 11, 2024',
  summary: {
    completed: 12,
    total: 15,
    avgPerDay: 1.7,
  },
  dailyProgress: [
    { day: 'Mon', shortDay: 'M', completed: 2, isToday: false },
    { day: 'Tue', shortDay: 'T', completed: 1, isToday: false },
    { day: 'Wed', shortDay: 'W', completed: 4, isToday: false },
    { day: 'Thu', shortDay: 'T', completed: 2, isToday: false },
    { day: 'Fri', shortDay: 'F', completed: 3, isToday: true },
    { day: 'Sat', shortDay: 'S', completed: 0, isToday: false },
    { day: 'Sun', shortDay: 'S', completed: 0, isToday: false },
  ],
  categories: [
    { name: 'Bug Fixes', count: 5, color: 'bg-red-500' },
    { name: 'Features', count: 4, color: 'bg-blue-500' },
    { name: 'Documentation', count: 2, color: 'bg-green-500' },
    { name: 'Other', count: 1, color: 'bg-gray-500' },
  ],
  recentTasks: [
    { title: 'Fix login timeout issue', category: 'Bug Fix', completedAt: 'Today, 2:30 PM' },
    { title: 'Add user preferences API', category: 'Feature', completedAt: 'Today, 11:00 AM' },
    { title: 'Update README', category: 'Docs', completedAt: 'Yesterday' },
  ],
};

export default function WeeklyProgressOptionB() {
  const [expandedSection, setExpandedSection] = useState<string | null>('daily');

  const maxDailyTasks = Math.max(...weeklyData.dailyProgress.map((d) => d.completed), 1);
  const completionPercentage = Math.round((weeklyData.summary.completed / weeklyData.summary.total) * 100);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      {/* Header with Week Navigation */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-foreground">Weekly Progress</h1>
          <Button variant="outline" size="sm" className="h-9">
            Share
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
            ←
          </Button>
          <span className="text-sm font-medium text-muted-foreground flex-1 text-center">
            {weeklyData.weekRange}
          </span>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" disabled>
            →
          </Button>
        </div>
      </div>

      {/* Summary Stats Bar */}
      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{weeklyData.summary.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completionPercentage}%</p>
              <p className="text-xs text-muted-foreground">Progress</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">{weeklyData.summary.avgPerDay}</p>
              <p className="text-xs text-muted-foreground">Avg/Day</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Daily Breakdown */}
      <Card className="mb-4">
        <CardHeader
          className="pb-2 cursor-pointer"
          onClick={() => toggleSection('daily')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Daily Breakdown</CardTitle>
            <span className="text-muted-foreground">{expandedSection === 'daily' ? '−' : '+'}</span>
          </div>
        </CardHeader>
        {expandedSection === 'daily' && (
          <CardContent>
            {/* Bar Chart */}
            <div className="flex items-end justify-between gap-1 h-24 mb-2">
              {weeklyData.dailyProgress.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      day.isToday ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                    style={{
                      height: day.completed > 0 ? `${(day.completed / maxDailyTasks) * 100}%` : '4px',
                      minHeight: '4px',
                    }}
                  />
                </div>
              ))}
            </div>
            {/* Day Labels */}
            <div className="flex justify-between">
              {weeklyData.dailyProgress.map((day, index) => (
                <div key={index} className="flex-1 text-center">
                  <p className={`text-xs ${day.isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                    {day.shortDay}
                  </p>
                  <p className={`text-xs ${day.isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {day.completed}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Category Breakdown */}
      <Card className="mb-4">
        <CardHeader
          className="pb-2 cursor-pointer"
          onClick={() => toggleSection('categories')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">By Category</CardTitle>
            <span className="text-muted-foreground">{expandedSection === 'categories' ? '−' : '+'}</span>
          </div>
        </CardHeader>
        {expandedSection === 'categories' && (
          <CardContent>
            <div className="space-y-3">
              {weeklyData.categories.map((category, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${category.color}`} />
                  <span className="flex-1 text-sm text-foreground">{category.name}</span>
                  <Badge variant="secondary">{category.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Recent Completions */}
      <Card>
        <CardHeader
          className="pb-2 cursor-pointer"
          onClick={() => toggleSection('recent')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Completions</CardTitle>
            <span className="text-muted-foreground">{expandedSection === 'recent' ? '−' : '+'}</span>
          </div>
        </CardHeader>
        {expandedSection === 'recent' && (
          <CardContent>
            <div className="space-y-3">
              {weeklyData.recentTasks.map((task, index) => (
                <div key={index}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {task.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{task.completedAt}</span>
                      </div>
                    </div>
                  </div>
                  {index < weeklyData.recentTasks.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Bottom spacing for mobile nav */}
      <div className="h-20" />
    </div>
  );
}
