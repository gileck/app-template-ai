/**
 * Weekly Progress Dashboard - Option C: Goal-Oriented View
 *
 * A gamified design focused on weekly goals and achievements.
 * Emphasizes progress toward targets with motivational elements.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/client/components/template/ui/card';
import { Button } from '@/client/components/template/ui/button';
import { Badge } from '@/client/components/template/ui/badge';
import { Separator } from '@/client/components/template/ui/separator';

// Mock data for goal-oriented progress
const weeklyData = {
  weekRange: 'Feb 5 - Feb 11',
  goals: [
    { name: 'Complete 10 tasks', current: 12, target: 10, completed: true },
    { name: 'Fix 3 bugs', current: 5, target: 3, completed: true },
    { name: 'Review 5 PRs', current: 3, target: 5, completed: false },
    { name: 'Update docs', current: 2, target: 2, completed: true },
  ],
  achievements: [
    { icon: '🔥', title: '5-Day Streak', description: 'Completed tasks 5 days in a row', isNew: true },
    { icon: '⚡', title: 'Speed Demon', description: 'Finished 4 tasks in one day', isNew: true },
    { icon: '🎯', title: 'Goal Crusher', description: 'Exceeded weekly target', isNew: false },
  ],
  weeklyStats: {
    goalsCompleted: 3,
    goalsTotal: 4,
    tasksCompleted: 12,
    currentStreak: 5,
    bestStreak: 7,
  },
  comparison: {
    thisWeek: 12,
    lastWeek: 8,
    trend: 'up',
  },
};

export default function WeeklyProgressOptionC() {
  const [showAllAchievements, setShowAllAchievements] = useState(false);

  const goalsPercentage = Math.round(
    (weeklyData.weeklyStats.goalsCompleted / weeklyData.weeklyStats.goalsTotal) * 100
  );

  const displayedAchievements = showAllAchievements
    ? weeklyData.achievements
    : weeklyData.achievements.filter((a) => a.isNew);

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Weekly Goals</h1>
        <p className="text-sm text-muted-foreground">{weeklyData.weekRange}</p>
      </div>

      {/* Overall Progress Card */}
      <Card className="mb-4 overflow-hidden">
        <div className="bg-primary/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Goals Completed</p>
              <p className="text-3xl font-bold text-foreground">
                {weeklyData.weeklyStats.goalsCompleted}/{weeklyData.weeklyStats.goalsTotal}
              </p>
            </div>
            <div className="text-right">
              <Badge
                variant={goalsPercentage >= 75 ? 'default' : 'secondary'}
                className="text-lg px-3 py-1"
              >
                {goalsPercentage >= 100 ? '🎉' : goalsPercentage >= 75 ? '💪' : '📈'} {goalsPercentage}%
              </Badge>
            </div>
          </div>
        </div>
        <CardContent className="py-4">
          {/* Comparison with last week */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">vs. Last Week</span>
            <span className={weeklyData.comparison.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
              {weeklyData.comparison.trend === 'up' ? '↑' : '↓'}{' '}
              {Math.abs(weeklyData.comparison.thisWeek - weeklyData.comparison.lastWeek)} tasks
            </span>
          </div>

          <Separator className="my-3" />

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-foreground">{weeklyData.weeklyStats.tasksCompleted}</p>
              <p className="text-xs text-muted-foreground">Tasks Done</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{weeklyData.weeklyStats.currentStreak}</p>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
            <div>
              <p className="text-lg font-bold text-muted-foreground">{weeklyData.weeklyStats.bestStreak}</p>
              <p className="text-xs text-muted-foreground">Best Streak</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals List */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">This Week&apos;s Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weeklyData.goals.map((goal, index) => {
              const progress = Math.min((goal.current / goal.target) * 100, 100);
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={goal.completed ? 'text-green-600' : 'text-muted-foreground'}>
                        {goal.completed ? '✓' : '○'}
                      </span>
                      <span className={`text-sm ${goal.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {goal.name}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {goal.current}/{goal.target}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        goal.completed ? 'bg-green-500' : 'bg-primary'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Goal Button */}
          <Button variant="outline" className="w-full mt-4 h-11">
            + Set Next Week&apos;s Goals
          </Button>
        </CardContent>
      </Card>

      {/* Achievements Section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Achievements {displayedAchievements.filter((a) => a.isNew).length > 0 && (
                <Badge variant="default" className="ml-2 text-xs">
                  {displayedAchievements.filter((a) => a.isNew).length} New
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowAllAchievements(!showAllAchievements)}
            >
              {showAllAchievements ? 'Show New' : 'View All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {displayedAchievements.map((achievement, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  achievement.isNew ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50'
                }`}
              >
                <span className="text-2xl">{achievement.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{achievement.title}</p>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                </div>
                {achievement.isNew && (
                  <Badge variant="default" className="text-xs">
                    New!
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {displayedAchievements.length === 0 && (
            <div className="text-center py-6">
              <p className="text-2xl mb-2">🏆</p>
              <p className="text-sm text-muted-foreground">Keep working to unlock achievements!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom spacing for mobile nav */}
      <div className="h-20" />
    </div>
  );
}
