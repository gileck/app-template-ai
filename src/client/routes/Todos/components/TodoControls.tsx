/**
 * Todo Controls Component
 *
 * Provides UI controls for sorting and filtering the todo list.
 * Includes a sort dropdown and filter toggle switches.
 * Mobile: Collapsible section with filter count badge.
 * Desktop: Always visible controls.
 */

import React, { useMemo } from 'react';
import { Card } from '@/client/components/ui/card';
import { Label } from '@/client/components/ui/label';
import { Switch } from '@/client/components/ui/switch';
import { Button } from '@/client/components/ui/button';
import { Badge } from '@/client/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/client/components/ui/select';
import { useTodoPreferencesStore } from '../store';

export function TodoControls() {
    // Combined selector for better performance - single subscription reduces re-render checks
    const {
        sortBy,
        uncompletedFirst,
        hideCompleted,
        dueDateFilter,
        filtersExpanded,
        setSortBy,
        setUncompletedFirst,
        setHideCompleted,
        setDueDateFilter,
        setFiltersExpanded,
    } = useTodoPreferencesStore((state) => ({
        sortBy: state.sortBy,
        uncompletedFirst: state.uncompletedFirst,
        hideCompleted: state.hideCompleted,
        dueDateFilter: state.dueDateFilter,
        filtersExpanded: state.filtersExpanded,
        setSortBy: state.setSortBy,
        setUncompletedFirst: state.setUncompletedFirst,
        setHideCompleted: state.setHideCompleted,
        setDueDateFilter: state.setDueDateFilter,
        setFiltersExpanded: state.setFiltersExpanded,
    }));

    // Calculate active filter count for badge
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (sortBy !== 'newest') count++;
        if (uncompletedFirst) count++;
        if (hideCompleted) count++;
        if (dueDateFilter !== 'all') count++;
        return count;
    }, [sortBy, uncompletedFirst, hideCompleted, dueDateFilter]);

    // Shared filter controls content
    const filterControls = (
        <>
            {/* Sort Dropdown */}
            <div className="todo-controls-sort">
                <Label htmlFor="sort-select" className="text-sm font-medium mb-2 block">
                    Sort by
                </Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger id="sort-select" className="h-12 sm:h-10">
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
                <div className="flex items-center gap-3 py-2 sm:py-0">
                    <Switch
                        id="uncompleted-first"
                        checked={uncompletedFirst}
                        onCheckedChange={setUncompletedFirst}
                    />
                    <Label
                        htmlFor="uncompleted-first"
                        className="text-sm font-medium cursor-pointer"
                    >
                        Show uncompleted first
                    </Label>
                </div>
                <div className="flex items-center gap-3 py-2 sm:py-0">
                    <Switch
                        id="hide-completed"
                        checked={hideCompleted}
                        onCheckedChange={setHideCompleted}
                    />
                    <Label
                        htmlFor="hide-completed"
                        className="text-sm font-medium cursor-pointer"
                    >
                        Hide completed
                    </Label>
                </div>
            </div>

            {/* Due Date Filters */}
            <div className="todo-controls-due-date">
                <Label className="text-sm font-medium mb-3 block">Filter by Due Date</Label>
                <div className="todo-due-date-pills">
                    <Button
                        variant={dueDateFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDueDateFilter('all')}
                        className="h-12 sm:h-9 whitespace-nowrap"
                    >
                        All
                    </Button>
                    <Button
                        variant={dueDateFilter === 'today' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDueDateFilter('today')}
                        className="h-12 sm:h-9 whitespace-nowrap"
                    >
                        Today
                    </Button>
                    <Button
                        variant={dueDateFilter === 'week' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDueDateFilter('week')}
                        className="h-12 sm:h-9 whitespace-nowrap"
                    >
                        This Week
                    </Button>
                    <Button
                        variant={dueDateFilter === 'overdue' ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => setDueDateFilter('overdue')}
                        className="h-12 sm:h-9 whitespace-nowrap"
                    >
                        Overdue
                    </Button>
                    <Button
                        variant={dueDateFilter === 'none' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDueDateFilter('none')}
                        className="h-12 sm:h-9 whitespace-nowrap"
                    >
                        No Date
                    </Button>
                </div>
            </div>
        </>
    );

    return (
        <Card className="mb-4 p-4 todo-controls-card">
            {/* Mobile: Collapsible section */}
            <div className="sm:hidden">
                <Button
                    variant="ghost"
                    onClick={() => setFiltersExpanded(!filtersExpanded)}
                    className="w-full h-12 justify-between px-0 hover:bg-transparent"
                >
                    <span className="flex items-center gap-2 text-base font-medium">
                        Filters & Sort
                        {activeFilterCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                {activeFilterCount}
                            </Badge>
                        )}
                    </span>
                    <ChevronDown
                        className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                            filtersExpanded ? 'rotate-180' : ''
                        }`}
                    />
                </Button>

                {/* Collapsible content */}
                <div
                    className={`todo-controls-collapsible ${
                        filtersExpanded ? 'todo-controls-expanded' : 'todo-controls-collapsed'
                    }`}
                >
                    <div className="todo-controls-collapsible-content">
                        {filterControls}
                    </div>
                </div>
            </div>

            {/* Desktop: Always visible */}
            <div className="hidden sm:block">
                <div className="todo-controls-layout">
                    {/* Sort Dropdown */}
                    <div className="todo-controls-sort">
                        <Label htmlFor="sort-select-desktop" className="text-sm font-medium mb-2 block">
                            Sort by
                        </Label>
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger id="sort-select-desktop" className="h-10">
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
                        <div className="flex items-center gap-3">
                            <Switch
                                id="uncompleted-first-desktop"
                                checked={uncompletedFirst}
                                onCheckedChange={setUncompletedFirst}
                            />
                            <Label
                                htmlFor="uncompleted-first-desktop"
                                className="text-sm font-medium cursor-pointer"
                            >
                                Uncompleted First
                            </Label>
                        </div>
                        <div className="flex items-center gap-3">
                            <Switch
                                id="hide-completed-desktop"
                                checked={hideCompleted}
                                onCheckedChange={setHideCompleted}
                            />
                            <Label
                                htmlFor="hide-completed-desktop"
                                className="text-sm font-medium cursor-pointer"
                            >
                                Hide Completed
                            </Label>
                        </div>
                    </div>
                </div>

                {/* Due Date Filters - Desktop */}
                <div className="mt-4 border-t border-border pt-4">
                    <Label className="text-sm font-medium mb-3 block">Filter by Due Date</Label>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={dueDateFilter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setDueDateFilter('all')}
                            className="h-9"
                        >
                            All
                        </Button>
                        <Button
                            variant={dueDateFilter === 'today' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setDueDateFilter('today')}
                            className="h-9"
                        >
                            Due Today
                        </Button>
                        <Button
                            variant={dueDateFilter === 'week' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setDueDateFilter('week')}
                            className="h-9"
                        >
                            Due This Week
                        </Button>
                        <Button
                            variant={dueDateFilter === 'overdue' ? 'destructive' : 'outline'}
                            size="sm"
                            onClick={() => setDueDateFilter('overdue')}
                            className="h-9"
                        >
                            Overdue
                        </Button>
                        <Button
                            variant={dueDateFilter === 'none' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setDueDateFilter('none')}
                            className="h-9"
                        >
                            No Due Date
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}
