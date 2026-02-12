/**
 * Weekly Progress Dashboard - Option A: Minimalist Summary View
 *
 * A clean, focused design showing weekly highlights at a glance.
 * Emphasizes key metrics and simple progress visualization.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/client/components/template/ui/card';
import { Button } from '@/client/components/template/ui/button';
import { Badge } from '@/client/components/template/ui/badge';
import { Separator } from '@/client/components/template/ui/separator';

// Mock data for the weekly progress
const weeklyData = {
  currentWeek: {
    startDate: 'Feb 5',
    endDate: 'Feb 11',
    tasksCompleted: 12,
    tasksTotal: 15,
    streak: 5,
    topCategory: 'Bug Fixes',
  },
  previousWeek: {
    tasksCompleted: 8,
  },
  highlights: [
    { label: 'Most productive day', value: 'Wednesday', detail: '4 tasks' },
    { label: 'Best category', value: 'Bug Fixes', detail: '5 completed' },
    { label: 'Current streak', value: '5 days', detail: 'Keep going!' },
  ],
};

export default function WeeklyProgressOptionA() {
  const [selectedWeek, setSelectedWeek] = useState<'current' | 'previous'>('current');

  const completionPercentage = Math.round(
    (weeklyData.currentWeek.tasksCompleted / weeklyData.currentWeek.tasksTotal) * 100
  );

  const weekOverWeekChange = weeklyData.currentWeek.tasksCompleted - weeklyData.previousWeek.tasksCompleted;
  const isPositiveChange = weekOverWeekChange > 0;

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Weekly Progress</h1>
        <p className="text-sm text-muted-foreground">
          {weeklyData.currentWeek.startDate} - {weeklyData.currentWeek.endDate}
        </p>
      </div>

      {/* Week Toggle */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={selectedWeek === 'current' ? 'default' : 'outline'}
          size="sm"
          className="flex-1 h-11"
          onClick={() => setSelectedWeek('current')}
        >
          This Week
        </Button>
        <Button
          variant={selectedWeek === 'previous' ? 'default' : 'outline'}
          size="sm"
          className="flex-1 h-11"
          onClick={() => setSelectedWeek('previous')}
        >
          Last Week
        </Button>
      </div>

      {/* Main Progress Card */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          {/* Circular Progress Indicator */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative h-32 w-32 mb-3">
              <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
                <circle
                  className="stroke-muted"
                  strokeWidth="8"
                  fill="none"
                  r="42"
                  cx="50"
                  cy="50"
                />
                <circle
                  className="stroke-primary transition-all duration-500"
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="none"
                  r="42"
                  cx="50"
                  cy="50"
                  strokeDasharray={`${completionPercentage * 2.64} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-foreground">{completionPercentage}%</span>
                <span className="text-xs text-muted-foreground">Complete</span>
              </div>
            </div>

            <p className="text-lg font-medium text-foreground">
              {weeklyData.currentWeek.tasksCompleted} of {weeklyData.currentWeek.tasksTotal} tasks
            </p>

            {/* Week-over-week comparison */}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={isPositiveChange ? 'default' : 'secondary'}>
                {isPositiveChange ? '↑' : '↓'} {Math.abs(weekOverWeekChange)} vs last week
              </Badge>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-foreground">{weeklyData.currentWeek.streak}</p>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-foreground">{weeklyData.currentWeek.topCategory}</p>
              <p className="text-xs text-muted-foreground">Top Category</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Highlights List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">This Week&apos;s Highlights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {weeklyData.highlights.map((highlight, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-muted-foreground">{highlight.label}</p>
                  <p className="font-medium text-foreground">{highlight.value}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {highlight.detail}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom spacing for mobile nav */}
      <div className="h-20" />
    </div>
  );
}
