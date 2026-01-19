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
import type { FeatureRequestClient, FeatureRequestPriority, DesignPhaseType } from '@/apis/feature-requests/types';
import { useUpdatePriority, useDeleteFeatureRequest, useApproveFeatureRequest, useGitHubStatus, useGitHubStatuses, useUpdateGitHubStatus, useUpdateGitHubReviewStatus } from '../hooks';

interface FeatureRequestCardProps {
    request: FeatureRequestClient;
}

const allPriorities: FeatureRequestPriority[] = ['low', 'medium', 'high', 'critical'];

// Priority border colors for left accent
const priorityBorderColors: Record<FeatureRequestPriority, string> = {
    critical: 'border-l-red-500',
    high: 'border-l-orange-500',
    medium: 'border-l-blue-500',
    low: 'border-l-gray-400',
};

export function FeatureRequestCard({ request }: FeatureRequestCardProps) {
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral UI state
    const [isExpanded, setIsExpanded] = useState(false);
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral dialog state
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral dialog state
    const [showDesignReview, setShowDesignReview] = useState(false);

    const updatePriorityMutation = useUpdatePriority();
    const deleteMutation = useDeleteFeatureRequest();
    const approveMutation = useApproveFeatureRequest();

    // Fetch GitHub Project status only if there's a GitHub project item
    const { data: githubStatus, isLoading: isLoadingGitHubStatus } = useGitHubStatus(
        request.githubProjectItemId ? request._id : null,
        !!request.githubProjectItemId
    );

    // Fetch available GitHub statuses and mutation for updating
    const { data: availableStatuses } = useGitHubStatuses();
    const updateGitHubStatusMutation = useUpdateGitHubStatus();
    const updateGitHubReviewStatusMutation = useUpdateGitHubReviewStatus();

    const handlePriorityChange = (priority: FeatureRequestPriority) => {
        updatePriorityMutation.mutate({ requestId: request._id, priority });
    };

    const handleGitHubStatusChange = (status: string) => {
        updateGitHubStatusMutation.mutate({ requestId: request._id, status });
    };

    const handleGitHubReviewStatusChange = (reviewStatus: string) => {
        updateGitHubReviewStatusMutation.mutate({ requestId: request._id, reviewStatus });
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

    // Get priority border color
    const priorityBorderColor = priorityBorderColors[request.priority || 'low'];

    return (
        <Card className={`border-l-4 ${priorityBorderColor} transition-shadow hover:shadow-md`}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                        <CardTitle className="text-lg font-semibold leading-tight">{request.title}</CardTitle>
                        <div className="flex flex-wrap items-center gap-2.5">
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
                                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                                {githubStatus.reviewStatus}
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
                    <div className="flex items-center gap-1.5">
                        {canApprove && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleApprove}
                                disabled={approveMutation.isPending}
                                className="gap-1.5"
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
                                className="gap-1.5"
                            >
                                <Eye className="h-4 w-4" />
                                Review
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="transition-transform"
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
                                {request.githubProjectItemId && availableStatuses?.statuses && (
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>GitHub Status</DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                            {availableStatuses.statuses.map((status) => (
                                                <DropdownMenuItem
                                                    key={status}
                                                    onClick={() => handleGitHubStatusChange(status)}
                                                    disabled={status === githubStatus?.status || updateGitHubStatusMutation.isPending}
                                                >
                                                    {status}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                )}
                                {request.githubProjectItemId && availableStatuses?.reviewStatuses && (
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>GitHub Review Status</DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                            {availableStatuses.reviewStatuses.map((reviewStatus) => (
                                                <DropdownMenuItem
                                                    key={reviewStatus}
                                                    onClick={() => handleGitHubReviewStatusChange(reviewStatus)}
                                                    disabled={reviewStatus === githubStatus?.reviewStatus || updateGitHubReviewStatusMutation.isPending}
                                                >
                                                    {reviewStatus}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                )}
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
                <CardContent className="space-y-5 pt-3 transition-all duration-200">
                    <div className="space-y-2.5">
                        <h4 className="text-sm font-semibold">Description</h4>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                            {request.description}
                        </p>
                    </div>

                    {/* Metadata section with improved styling */}
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1">
                            <User className="h-4 w-4" />
                            <span>{request.requestedBy}</span>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                        </div>
                        {request.page && (
                            <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1">
                                <FileText className="h-4 w-4" />
                                <span>{request.page}</span>
                            </div>
                        )}
                    </div>

                    {/* GitHub Links with enhanced hover states */}
                    {(request.githubIssueUrl || request.githubPrUrl) && (
                        <div className="flex flex-wrap gap-3 text-sm">
                            {request.githubIssueUrl && (
                                <a
                                    href={request.githubIssueUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 transition-colors hover:bg-muted/70"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    <span className="font-medium">Issue #{request.githubIssueNumber}</span>
                                </a>
                            )}
                            {request.githubPrUrl && (
                                <a
                                    href={request.githubPrUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 transition-colors hover:bg-muted/70"
                                >
                                    <GitPullRequest className="h-4 w-4" />
                                    <span className="font-medium">PR #{request.githubPrNumber}</span>
                                </a>
                            )}
                        </div>
                    )}

                    {currentDesignPhase?.content && (
                        <div className="space-y-2.5 rounded-md border bg-muted/30 p-4">
                            <h4 className="text-sm font-semibold">
                                {request.status === 'product_design' ? 'Product Design' : 'Technical Design'}
                            </h4>
                            <div className="prose prose-sm max-w-none text-muted-foreground">
                                <pre className="whitespace-pre-wrap text-sm leading-relaxed">
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
                        <div className="space-y-2.5">
                            <h4 className="text-sm font-semibold">
                                Comments ({request.comments.length})
                            </h4>
                            <div className="space-y-2.5">
                                {request.comments.slice(-3).map((comment) => (
                                    <div
                                        key={comment.id}
                                        className={`rounded-md border p-3 text-sm transition-colors ${
                                            comment.isAdmin ? 'bg-muted/50' : 'bg-card'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="font-semibold">{comment.authorName}</span>
                                            {comment.isAdmin && (
                                                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-primary">
                                                    Admin
                                                </span>
                                            )}
                                            <span>
                                                {new Date(comment.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="mt-1.5 leading-relaxed">{comment.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {request.adminNotes && (
                        <div className="space-y-2.5 rounded-md border border-dashed bg-muted/20 p-4">
                            <h4 className="text-sm font-semibold text-muted-foreground">
                                Admin Notes (private)
                            </h4>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
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
