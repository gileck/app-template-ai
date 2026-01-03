/**
 * Delete Todo Confirmation Dialog
 */

import { Button } from '@/client/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/client/components/ui/dialog';
import type { TodoItemClient } from '@/server/database/collections/todos/types';

interface DeleteTodoDialogProps {
    open: boolean;
    todo: TodoItemClient | null;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeleteTodoDialog({ open, todo, onConfirm, onCancel }: DeleteTodoDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Todo</DialogTitle>
                </DialogHeader>
                <p>Are you sure you want to delete &quot;{todo?.title}&quot;?</p>
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button variant="destructive" onClick={onConfirm} autoFocus>Delete</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
