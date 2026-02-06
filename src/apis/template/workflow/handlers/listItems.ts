/**
 * List Workflow Items Handler
 *
 * Returns all workflow items from the project management adapter,
 * enriched with creation dates from the underlying MongoDB documents.
 */

import { ApiHandlerContext } from '@/apis/types';
import { getProjectManagementAdapter } from '@/server/project-management';
import { findByWorkflowStatus as findFeatures } from '@/server/database/collections/template/feature-requests/feature-requests';
import { findByWorkflowStatus as findReports } from '@/server/database/collections/template/reports/reports';
import { toStringId } from '@/server/utils';
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

        const [projectItems, features, reports] = await Promise.all([
            adapter.listItems(),
            findFeatures(),
            findReports(),
        ]);

        // Build a map of mongoId -> createdAt ISO string from the raw documents
        const dateMap = new Map<string, string>();
        for (const f of features) {
            dateMap.set(toStringId(f._id), new Date(f.createdAt).toISOString());
        }
        for (const r of reports) {
            dateMap.set(toStringId(r._id), new Date(r.createdAt).toISOString());
        }

        const items: WorkflowItem[] = projectItems.map((item) => {
            // Extract mongoId from composite ID (e.g., "feature:abc123" -> "abc123")
            const colonIndex = item.id.indexOf(':');
            const mongoId = colonIndex !== -1 ? item.id.substring(colonIndex + 1) : item.id;

            return {
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
                createdAt: dateMap.get(mongoId) ?? null,
            };
        });

        return { items };
    } catch (error) {
        return {
            error: error instanceof Error ? error.message : 'Failed to list workflow items',
        };
    }
}
