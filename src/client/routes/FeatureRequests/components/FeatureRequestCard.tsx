import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/client/components/ui/card';
import { Button } from '@/client/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from '@/client/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/client/components/ui/confirm-dialog';
import { ChevronDown, ChevronUp, MoreVertical, Trash2, User, Calendar, FileText, Eye, ExternalLink, GitPullRequest, CheckCircle } from 'lucide-react';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import { DesignReviewPanel } from './DesignReviewPanel';
import type { FeatureRequestClient, FeatureRequestStatus, FeatureRequestPriority, DesignPhaseType } from '@/apis/feature-requests/types';
import { useUpdateFeatureRequestStatus, useUpdatePriority, useDeleteFeatureRequest, useApproveFeatureRequest, useGitHubStatus } from '../hooks';

interface FeatureRequestCardProps {
    request: FeatureRequestClient;
}

const allStatuses: FeatureRequestStatus[] = [
    'new',
    'in_review',
    'product_design',
    'tech_design',
    'ready_for_dev',
    'in_development',
    'ready_for_qa',
    'done',
    'rejected',
    'on_hold',
];

const allPriorities: FeatureRequestPriority[] = ['low', 'medium', 'high', 'critical'];

export function FeatureRequestCard({ request }: FeatureRequestCardProps) {
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral UI state
    const [isExpanded, setIsExpanded] = useState(false);
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral dialog state
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral dialog state
    const [showDesignReview, setShowDesignReview] = useState(false);

    const updateStatusMutation = useUpdateFeatureRequestStatus();
    const updatePriorityMutation = useUpdatePriority();
    const deleteMutation = useDeleteFeatureRequest();
    const approveMutation = useApproveFeatureRequest();

    // Fetch GitHub Project status only if there's a GitHub project item
    const { data: githubStatus, isLoading: isLoadingGitHubStatus } = useGitHubStatus(
        request.githubProjectItemId ? request._id : null,
        !!request.githubProjectItemId
    );

    const handleStatusChange = (status: FeatureRequestStatus) => {
        updateStatusMutation.mutate({ requestId: request._id, status });
    };

    const handlePriorityChange = (priority: FeatureRequestPriority) => {
        updatePriorityMutation.mutate({ requestId: request._id, priority });
    };

    const handleDelete = () => {
        deleteMutation.mutate(request._id, {
            onSuccess: () => setShowDeleteDialog(false),
        });
    };

    const handleApprove = () => {
        approveMutation.mutate(request._id);
    };

    // Show approve button for new or in_review requests that don't have a GitHub issue yet
    const canApprove = (request.status === 'new' || request.status === 'in_review') && !request.githubIssueUrl;

    const currentDesignPhase =
        request.status === 'product_design'
            ? request.productDesign
            : request.status === 'tech_design'
              ? request.techDesign
              : null;

    const currentPhaseType: DesignPhaseType | null =
        request.status === 'product_design'
            ? 'product'
            : request.status === 'tech_design'
              ? 'tech'
              : null;

    const canReviewDesign =
        currentDesignPhase &&
        currentDesignPhase.content &&
        currentPhaseType;

    return (
        <Card className="mb-3">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                        <CardTitle className="text-base font-medium">{request.title}</CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Show GitHub status as primary when linked, fallback to DB status */}
                            {request.githubProjectItemId ? (
                                isLoadingGitHubStatus ? (
                                    <span className="text-sm text-muted-foreground">Loading status...</span>
                                ) : githubStatus?.status ? (
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-md bg-primary px-2.5 py-0.5 text-sm font-medium text-primary-foreground">
                                            {githubStatus.status}
                                        </span>
                                        {githubStatus.reviewStatus && (
                                            <span className="text-xs text-muted-foreground">
                                                ({githubStatus.reviewStatus})
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <StatusBadge
                                        status={request.status}
                                        reviewStatus={currentDesignPhase?.reviewStatus}
                                    />
                                )
                            ) : (
                                <StatusBadge
                                    status={request.status}
                                    reviewStatus={currentDesignPhase?.reviewStatus}
                                />
                            )}
                            <PriorityBadge priority={request.priority} />
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {canApprove && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleApprove}
                                disabled={approveMutation.isPending}
                                className="gap-1"
                            >
                                <CheckCircle className="h-4 w-4" />
                                {approveMutation.isPending ? 'Approving...' : 'Approve'}
                            </Button>
                        )}
                        {canReviewDesign && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowDesignReview(true)}
                                className="gap-1"
                            >
                                <Eye className="h-4 w-4" />
                                Review
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        {allStatuses.map((status) => (
                                            <DropdownMenuItem
                                                key={status}
                                                onClick={() => handleStatusChange(status)}
                                                disabled={status === request.status}
                                            >
                                                {status.replace(/_/g, ' ')}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>Set Priority</DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        {allPriorities.map((priority) => (
                                            <DropdownMenuItem
                                                key={priority}
                                                onClick={() => handlePriorityChange(priority)}
                                                disabled={priority === request.priority}
                                            >
                                                {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setShowDeleteDialog(true)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Description</h4>
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                            {request.description}
                        </p>
                    </div>

                    {request.page && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            <span>Page: {request.page}</span>
                        </div>
                    )}

                    {/* GitHub Links */}
                    {(request.githubIssueUrl || request.githubPrUrl) && (
                        <div className="flex flex-wrap gap-3 text-sm">
                            {request.githubIssueUrl && (
                                <a
                                    href={request.githubIssueUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 hover:bg-muted/80 transition-colors"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    <span>Issue #{request.githubIssueNumber}</span>
                                </a>
                            )}
                            {request.githubPrUrl && (
                                <a
                                    href={request.githubPrUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 hover:bg-muted/80 transition-colors"
                                >
                                    <GitPullRequest className="h-3.5 w-3.5" />
                                    <span>PR #{request.githubPrNumber}</span>
                                </a>
                            )}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>By: {request.requestedBy}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>

                    {currentDesignPhase?.content && (
                        <div className="space-y-2 rounded-md border p-3">
                            <h4 className="text-sm font-medium">
                                {request.status === 'product_design' ? 'Product Design' : 'Technical Design'}
                            </h4>
                            <div className="prose prose-sm max-w-none text-muted-foreground">
                                <pre className="whitespace-pre-wrap text-sm">
                                    {currentDesignPhase.content.slice(0, 500)}
                                    {currentDesignPhase.content.length > 500 && '...'}
                                </pre>
                            </div>
                            {currentDesignPhase.iterations > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Iteration: {currentDesignPhase.iterations}
                                </p>
                            )}
                        </div>
                    )}

                    {request.comments && request.comments.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">
                                Comments ({request.comments.length})
                            </h4>
                            <div className="space-y-2">
                                {request.comments.slice(-3).map((comment) => (
                                    <div
                                        key={comment.id}
                                        className={`rounded-md border p-2 text-sm ${
                                            comment.isAdmin ? 'bg-muted' : ''
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="font-medium">{comment.authorName}</span>
                                            {comment.isAdmin && (
                                                <span className="rounded bg-primary/10 px-1 text-primary">
                                                    Admin
                                                </span>
                                            )}
                                            <span>
                                                {new Date(comment.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="mt-1">{comment.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {request.adminNotes && (
                        <div className="space-y-2 rounded-md border border-dashed p-3">
                            <h4 className="text-sm font-medium text-muted-foreground">
                                Admin Notes (private)
                            </h4>
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                {request.adminNotes}
                            </p>
                        </div>
                    )}
                </CardContent>
            )}

            <ConfirmDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                title="Delete Feature Request"
                description={`Are you sure you want to delete "${request.title}"? This action cannot be undone.`}
                confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                variant="destructive"
                onConfirm={handleDelete}
            />

            {canReviewDesign && currentPhaseType && (
                <DesignReviewPanel
                    request={request}
                    phase={currentPhaseType}
                    design={currentDesignPhase}
                    open={showDesignReview}
                    onOpenChange={setShowDesignReview}
                />
            )}
        </Card>
    );
}
