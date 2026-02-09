/**
 * Workflow Service
 *
 * Unified service layer for workflow item lifecycle operations.
 * All transports (Telegram, UI, CLI) call these functions.
 */

export { approveWorkflowItem } from './approve';
export { routeWorkflowItem, routeWorkflowItemByWorkflowId } from './route';
export { deleteWorkflowItem } from './delete';
export type {
    ItemType,
    RoutingDestination,
    WorkflowItemRef,
    ApproveOptions,
    ApproveResult,
    RouteResult,
    DeleteOptions,
    DeleteResult,
} from './types';
export {
    FEATURE_ROUTING_STATUS_MAP,
    BUG_ROUTING_STATUS_MAP,
    ROUTING_DESTINATION_LABELS,
    getRoutingStatusMap,
    statusToDestination,
} from './constants';
