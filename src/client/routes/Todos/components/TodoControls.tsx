/**
 * Todo Controls Component
 *
 * Provides UI controls for sorting and filtering the todo list.
 * Includes a sort dropdown and filter toggle switches.
 */

import React from 'react';
import { Card } from '@/client/components/ui/card';
import { Label } from '@/client/components/ui/label';
import { Switch } from '@/client/components/ui/switch';
import { Button } from '@/client/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/client/components/ui/select';
import { useTodoPreferencesStore } from '../store';

export function TodoControls() {
    const sortBy = useTodoPreferencesStore((state) => state.sortBy);
    const uncompletedFirst = useTodoPreferencesStore((state) => state.uncompletedFirst);
    const hideCompleted = useTodoPreferencesStore((state) => state.hideCompleted);
    const dueDateFilter = useTodoPreferencesStore((state) => state.dueDateFilter);
    const setSortBy = useTodoPreferencesStore((state) => state.setSortBy);
    const setUncompletedFirst = useTodoPreferencesStore((state) => state.setUncompletedFirst);
    const setHideCompleted = useTodoPreferencesStore((state) => state.setHideCompleted);
    const setDueDateFilter = useTodoPreferencesStore((state) => state.setDueDateFilter);

    return (
        <Card className="mb-4 p-4 todo-controls-card">
            <div className="todo-controls-layout">
                {/* Sort Dropdown */}
                <div className="todo-controls-sort">
                    <Label htmlFor="sort-select" className="text-sm font-medium">
                        Sort by
                    </Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger id="sort-select">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="updated">Recently Updated</SelectItem>
                            <SelectItem value="title-asc">Title A-Z</SelectItem>
                            <SelectItem value="title-desc">Title Z-A</SelectItem>
                            <SelectItem value="due-earliest">Due Date (Earliest First)</SelectItem>
                            <SelectItem value="due-latest">Due Date (Latest First)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Filter Toggles */}
                <div className="todo-controls-filters">
                    <div className="flex items-center gap-2">
                        <Switch
                            id="uncompleted-first"
                            checked={uncompletedFirst}
                            onCheckedChange={setUncompletedFirst}
                        />
                        <Label
                            htmlFor="uncompleted-first"
                            className="text-sm font-medium cursor-pointer"
                        >
                            Uncompleted First
                        </Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch
                            id="hide-completed"
                            checked={hideCompleted}
                            onCheckedChange={setHideCompleted}
                        />
                        <Label
                            htmlFor="hide-completed"
                            className="text-sm font-medium cursor-pointer"
                        >
                            Hide Completed
                        </Label>
                    </div>
                </div>
            </div>

            {/* Due Date Filters */}
            <div className="mt-4 border-t border-border pt-4">
                <Label className="text-sm font-medium mb-2 block">Filter by Due Date</Label>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant={dueDateFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDueDateFilter('all')}
                    >
                        All
                    </Button>
                    <Button
                        variant={dueDateFilter === 'today' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDueDateFilter('today')}
                    >
                        Due Today
                    </Button>
                    <Button
                        variant={dueDateFilter === 'week' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDueDateFilter('week')}
                    >
                        Due This Week
                    </Button>
                    <Button
                        variant={dueDateFilter === 'overdue' ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => setDueDateFilter('overdue')}
                    >
                        Overdue
                    </Button>
                    <Button
                        variant={dueDateFilter === 'none' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDueDateFilter('none')}
                    >
                        No Due Date
                    </Button>
                </div>
            </div>
        </Card>
    );
}
