/**
 * Empty State Component
 *
 * Displays a friendly message when there are no todos.
 */

export function EmptyState() {
    return (
        <div className="todo-empty-state">
            <div className="todo-empty-icon">🎉</div>
            <h3 className="text-xl font-semibold mb-2 todo-gradient-text">
                Your todo list is empty!
            </h3>
            <p className="text-muted-foreground">
                Time to add something awesome!
            </p>
        </div>
    );
}
