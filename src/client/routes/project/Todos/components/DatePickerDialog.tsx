/**
 * Date Picker Dialog Component
 *
 * Dialog for selecting due dates with quick action buttons.
 */

import { useState, useEffect } from 'react';
import { Calendar } from '@/client/components/ui/calendar';
import { Button } from '@/client/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/client/components/ui/dialog';
import { getQuickDates } from '../utils/dateUtils';

interface DatePickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedDate?: Date;
    onDateSelect: (date: Date | undefined) => void;
}

export function DatePickerDialog({
    open,
    onOpenChange,
    selectedDate,
    onDateSelect,
}: DatePickerDialogProps) {
    // eslint-disable-next-line state-management/prefer-state-architecture -- Ephemeral UI state for dialog-local date selection before confirmation
    const [date, setDate] = useState<Date | undefined>(selectedDate);

    // Update local state when selectedDate prop changes
    useEffect(() => {
        setDate(selectedDate);
    }, [selectedDate, open]);

    const quickDates = getQuickDates();

    const handleQuickSelect = (quickDate: string) => {
        const newDate = new Date(quickDate);
        setDate(newDate);
    };

    const handleClear = () => {
        setDate(undefined);
    };

    const handleSetDate = () => {
        onDateSelect(date);
        onOpenChange(false);
    };

    const handleCancel = () => {
        setDate(selectedDate);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Set Due Date</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Quick action buttons */}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickSelect(quickDates.today)}
                        >
                            Today
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickSelect(quickDates.tomorrow)}
                        >
                            Tomorrow
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickSelect(quickDates.nextWeek)}
                        >
                            Next Week
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClear}
                        >
                            Clear
                        </Button>
                    </div>

                    {/* Calendar */}
                    <div className="flex justify-center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleSetDate}>
                        Set Date
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
