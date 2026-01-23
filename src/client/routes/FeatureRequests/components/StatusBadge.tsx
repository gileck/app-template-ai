import { Badge } from '@/client/components/ui/badge';
import type { FeatureRequestStatus, FeatureRequestPriority } from '@/apis/feature-requests/types';
import {
    CircleDot,
    Hammer,
    CheckCircle,
    XCircle,
    Archive,
    CheckCircle2,
    Eye,
    AlertTriangle,
    Package,
} from 'lucide-react';

interface StatusBadgeProps {
    status: FeatureRequestStatus;
    clickable?: boolean;
    onClick?: () => void;
}

const statusConfig: Record<
    FeatureRequestStatus,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; icon: React.ReactNode }
> = {
    // Legacy statuses
    new: { label: 'New', variant: 'default', icon: <CircleDot className="h-3 w-3" /> },
    in_progress: { label: 'In Progress', variant: 'warning', icon: <Hammer className="h-3 w-3" /> },
    done: { label: 'Done', variant: 'success', icon: <CheckCircle className="h-3 w-3" /> },
    rejected: { label: 'Rejected', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },

    // New workflow statuses
    backlog: { label: 'Backlog', variant: 'secondary', icon: <Archive className="h-3 w-3" /> },
    proposed: { label: 'Proposed', variant: 'outline', icon: <Package className="h-3 w-3" /> },
    approved: { label: 'Approved', variant: 'success', icon: <CheckCircle2 className="h-3 w-3" /> },
    waiting_for_review: { label: 'Waiting for Review', variant: 'default', icon: <Eye className="h-3 w-3" /> },
    blocked: { label: 'Blocked', variant: 'destructive', icon: <AlertTriangle className="h-3 w-3" /> },
};

const unknownConfig = { label: 'Unknown', variant: 'outline' as const, icon: <CircleDot className="h-3 w-3" /> };

export function StatusBadge({ status, clickable, onClick }: StatusBadgeProps) {
    const config = statusConfig[status] ?? unknownConfig;

    return (
        <Badge
            variant={config.variant}
            className={`gap-1 ${clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            onClick={clickable ? onClick : undefined}
        >
            {config.icon}
            {config.label}
        </Badge>
    );
}

interface PriorityBadgeProps {
    priority?: FeatureRequestPriority;
}

const priorityConfig: Record<
    FeatureRequestPriority,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }
> = {
    low: { label: 'Low', variant: 'secondary' },
    medium: { label: 'Medium', variant: 'default' },
    high: { label: 'High', variant: 'warning' },
    critical: { label: 'Critical', variant: 'destructive' },
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
    if (!priority) return null;

    const config = priorityConfig[priority];

    return (
        <Badge variant={config.variant}>
            {config.label}
        </Badge>
    );
}
