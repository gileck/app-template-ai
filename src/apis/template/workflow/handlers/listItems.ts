/**
 * List Workflow Items Handler
 *
 * Returns all workflow items from the project management adapter.
 */

import { ApiHandlerContext } from '@/apis/types';
import { getProjectManagementAdapter } from '@/server/project-management';
import type { ListWorkflowItemsResponse, WorkflowItem } from '../types';

export async function listItems(
    _params: unknown,
    context: ApiHandlerContext
): Promise<ListWorkflowItemsResponse> {
    if (!context.isAdmin) {
        return { error: 'Admin access required' };
    }

    try {
        const adapter = getProjectManagementAdapter();
        if (!adapter.isInitialized()) {
            await adapter.init();
        }

        const projectItems = await adapter.listItems();

        const items: WorkflowItem[] = projectItems.map((item) => ({
            id: item.id,
            status: item.status,
            reviewStatus: item.reviewStatus,
            content: item.content
                ? {
                      type: item.content.type,
                      number: item.content.number,
                      title: item.content.title,
                      url: item.content.url,
                      state: item.content.state,
                      labels: item.content.labels,
                  }
                : null,
        }));

        return { items };
    } catch (error) {
        return {
            error: error instanceof Error ? error.message : 'Failed to list workflow items',
        };
    }
}
