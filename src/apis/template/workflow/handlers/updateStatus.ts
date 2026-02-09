import { ApiHandlerContext } from '@/apis/types';
import { findWorkflowItemById, findWorkflowItemBySourceRef, updateWorkflowFields } from '@/server/database/collections/template/workflow-items';
import { featureRequests, reports } from '@/server/database';
import { getProjectManagementAdapter } from '@/server/project-management';
import { STATUSES } from '@/server/project-management/config';
import { isObjectIdFormat } from '@/server/utils';
import { routeWorkflowItemByWorkflowId } from '@/server/workflow-service';
import type { UpdateWorkflowStatusRequest, UpdateWorkflowStatusResponse } from '../types';

const VALID_STATUSES = new Set<string>(Object.values(STATUSES));

export async function updateStatus(
    params: UpdateWorkflowStatusRequest,
    context: ApiHandlerContext
): Promise<UpdateWorkflowStatusResponse> {
    if (!context.isAdmin) {
        return { error: 'Admin access required' };
    }

    const { status } = params;

    if (!status || !VALID_STATUSES.has(status)) {
        return { error: `Invalid status: ${status}` };
    }

    // Resolve the workflow item ID — either direct or by source ref
    let resolvedItemId: string | undefined;

    if (params.itemId) {
        if (!isObjectIdFormat(params.itemId)) {
            return { error: 'Invalid item ID' };
        }
        resolvedItemId = params.itemId;
    } else if (params.sourceId && params.sourceType) {
        if (!isObjectIdFormat(params.sourceId)) {
            return { error: 'Invalid source ID' };
        }
        const sourceCollection = params.sourceType === 'feature' ? 'feature-requests' as const : 'reports' as const;
        const workflowItem = await findWorkflowItemBySourceRef(sourceCollection, params.sourceId);
        if (!workflowItem) {
            return { error: 'Workflow item not found for source' };
        }
        resolvedItemId = workflowItem._id.toString();
    } else {
        return { error: 'Either itemId or sourceId+sourceType is required' };
    }

    try {
        // Try the workflow service first (handles adapter + review status clearing)
        const result = await routeWorkflowItemByWorkflowId(resolvedItemId, status);

        if (result.success) {
            return { success: true };
        }

        // If service says "not a valid routing destination", fall back to direct update
        // This handles non-routable statuses (PR Review, Done, Final Review, Bug Investigation)
        if (result.error?.includes('not a valid routing destination')) {
            const item = await findWorkflowItemById(resolvedItemId);
            if (!item) {
                return { error: 'Workflow item not found' };
            }

            // Update local DB
            await updateWorkflowFields(resolvedItemId, { workflowStatus: status });

            // Also update the adapter by looking up the source document's githubProjectItemId
            if (item.sourceRef) {
                const sourceDoc = item.sourceRef.collection === 'feature-requests'
                    ? await featureRequests.findFeatureRequestById(item.sourceRef.id.toString())
                    : await reports.findReportById(item.sourceRef.id.toString());

                if (sourceDoc?.githubProjectItemId) {
                    const adapter = getProjectManagementAdapter();
                    await adapter.init();
                    await adapter.updateItemStatus(sourceDoc.githubProjectItemId, status);
                }
            }

            return { success: true };
        }

        // Other service errors — pass through
        return { error: result.error || 'Failed to update status' };
    } catch (error) {
        console.error('Error updating workflow status:', error);
        return {
            error: error instanceof Error ? error.message : 'Failed to update status',
        };
    }
}
