/**
 * Delete Todo Confirmation Dialog
 */

import { Button } from '@/client/components/template/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/client/components/template/ui/dialog';
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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Delete Todo?</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-muted-foreground">
                        Are you sure you want to delete{' '}
                        <span className="font-semibold text-foreground">&quot;{todo?.title}&quot;</span>?
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                        This action cannot be undone.
                    </p>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onCancel} className="transition-transform hover:scale-105">
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        autoFocus
                        className="transition-transform hover:scale-105"
                    >
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
