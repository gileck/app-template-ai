/**
 * Rule to warn about using direct ObjectId methods instead of server utilities
 * 
 * This rule warns when code uses:
 * - .toHexString() - should use toStringId() instead
 * - new ObjectId(variable) - should use toDocumentId() or toQueryId() instead
 * 
 * These direct methods can fail on UUID strings from client-generated IDs.
 * 
 * @see docs/react-query-mutations.md
 * @see src/server/utils/id.ts
 */

module.exports = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Prefer server ID utilities over direct ObjectId methods',
            category: 'API Guidelines',
            recommended: true,
        },
        fixable: null,
        schema: [],
        messages: {
            preferToStringId: 
                'Avoid .toHexString() - use toStringId() from @/server/utils instead. ' +
                'Direct ObjectId methods fail on UUID strings. ' +
                'See docs/react-query-mutations.md',
            preferIdUtils: 
                'Avoid new ObjectId(variable) - use toDocumentId() or toQueryId() from @/server/utils instead. ' +
                'Direct ObjectId methods fail on UUID strings. ' +
                'See docs/react-query-mutations.md',
        },
    },

    create(context) {
        const filename = context.getFilename();
        
        // Only apply to API handlers and server code (not database layer)
        const isApiHandler = filename.includes('/apis/') && filename.includes('/handlers/');
        const isServerFile = filename.includes('/apis/') && filename.endsWith('server.ts');
        
        if (!isApiHandler && !isServerFile) {
            return {};
        }

        return {
            // Detect .toHexString() calls
            CallExpression(node) {
                if (
                    node.callee.type === 'MemberExpression' &&
                    node.callee.property.type === 'Identifier' &&
                    node.callee.property.name === 'toHexString'
                ) {
                    context.report({
                        node,
                        messageId: 'preferToStringId',
                    });
                }
            },

            // Detect new ObjectId(variable) - but not new ObjectId() with no args
            NewExpression(node) {
                if (
                    node.callee.type === 'Identifier' &&
                    node.callee.name === 'ObjectId' &&
                    node.arguments.length > 0
                ) {
                    const arg = node.arguments[0];
                    
                    // Allow string literals that look like ObjectIds (24 hex chars)
                    if (arg.type === 'Literal' && typeof arg.value === 'string') {
                        if (/^[0-9a-fA-F]{24}$/.test(arg.value)) {
                            return; // Known ObjectId format, allow it
                        }
                    }
                    
                    // Warn on variables or non-ObjectId-format strings
                    context.report({
                        node,
                        messageId: 'preferIdUtils',
                    });
                }
            },
        };
    },
};
