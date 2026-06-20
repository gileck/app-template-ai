/**
 * Admin User Detail ("User 360")
 *
 * Admin-only per-user drill-in consolidating identity, lifecycle, 2FA,
 * passkeys, sessions and AI spend in one place. Reachable at
 * /admin/users/:userId.
 */

import { Loader2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useRouter } from '@/client/features';
import { Button } from '@/client/components/template/ui/button';
import { Card, CardContent } from '@/client/components/template/ui/card';
import { Badge } from '@/client/components/template/ui/badge';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/client/components/template/ui/alert';
import {
    StatCard,
    formatUsd,
    formatNumber,
    formatDateTime,
} from '@/client/features/template/agent-admin';
import type { AdminUserDetail as AdminUserDetailData } from '@/apis/template/admin-users/types';
import { useAdminUserDetail } from './hooks';

export function AdminUserDetail() {
    const { routeParams, navigate } = useRouter();
    const userId = routeParams.userId;
    const { data, isLoading, error } = useAdminUserDetail(userId);

    return (
        <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-20 sm:py-8">
            <Button
                variant="ghost"
                size="sm"
                className="mb-4 min-h-11"
                onClick={() => navigate('/admin/users')}
            >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to users
            </Button>

            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}

            {!isLoading && error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Failed to load user</AlertTitle>
                    <AlertDescription>
                        {error instanceof Error ? error.message : 'Unknown error'}
                    </AlertDescription>
                </Alert>
            )}

            {!isLoading && !error && data && <UserDetailBody user={data} />}
        </div>
    );
}

function UserDetailBody({ user }: { user: AdminUserDetailData }) {
    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground break-words">
                    {user.username}
                </h1>
                {user.isAdmin && <Badge variant="secondary">Admin</Badge>}
                {user.approvalStatus === 'pending' && <Badge variant="outline">Pending</Badge>}
                {user.approvalStatus === 'rejected' && (
                    <Badge variant="destructive">Rejected</Badge>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Agent Spend" value={formatUsd(user.agentSpend.cost)} />
                <StatCard label="Agent Turns" value={formatNumber(user.agentSpend.turns)} />
                <StatCard label="Passkeys" value={formatNumber(user.passkeyCount)} />
                <StatCard label="Sessions" value={formatNumber(user.sessionsTotal)} />
            </div>

            <Card>
                <CardContent className="divide-y divide-border p-0">
                    <InfoRow label="Email" value={user.email ?? '—'} />
                    <InfoRow label="Created" value={formatDateTime(user.createdAt)} />
                    <InfoRow label="Updated" value={formatDateTime(user.updatedAt)} />
                    <InfoRow label="Approved" value={formatDateTime(user.approvedAt)} />
                    <InfoRow label="Last Seen" value={formatDateTime(user.lastSeenAt)} />
                    <InfoRow label="Last Session" value={formatDateTime(user.lastSessionAt)} />
                    <InfoRow
                        label="Two-Factor"
                        value={
                            user.twoFactorEnabled
                                ? `On${user.twoFactorMethod ? ` (${user.twoFactorMethod})` : ''}`
                                : 'Off'
                        }
                    />
                    <InfoRow label="Telegram" value={user.telegramLinked ? 'Linked' : 'Not linked'} />
                </CardContent>
            </Card>

            {user.passkeyCount > 0 && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-success" />
                    {user.passkeyCount} passkey{user.passkeyCount === 1 ? '' : 's'} registered.
                </p>
            )}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-medium text-foreground break-all">{value}</span>
        </div>
    );
}
