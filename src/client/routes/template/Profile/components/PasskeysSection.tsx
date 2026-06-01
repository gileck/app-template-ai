/**
 * Passkeys management section for the Profile page.
 *
 * Lets a logged-in user enroll a passkey on the current device, see their
 * registered passkeys, and remove them. This is the Phase 1 surface of the
 * passwordless-auth migration — available regardless of AUTH_MODE so users
 * can set up passkeys BEFORE a deployment cuts over to passkey-only login.
 */

import { useState } from 'react';
import { Fingerprint, Trash2, Plus, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ProfileSection } from './ProfileSection';
import { Button } from '@/client/components/template/ui/button';
import { ConfirmDialog } from '@/client/components/template/ui/confirm-dialog';
import { Skeleton } from '@/client/components/template/ui/skeleton';
import { toast } from '@/client/components/template/ui/toast';
import { errorToast } from '@/client/features/template/error-tracking';
import {
    usePasskeys,
    useAddPasskey,
    useDeletePasskey,
    browserSupportsPasskeys,
} from '@/client/features';
import type { PasskeyInfo } from '@/apis/template/auth/types';

function formatWhen(iso?: string): string | null {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return formatDistanceToNow(date, { addSuffix: true });
}

function passkeyLabel(passkey: PasskeyInfo): string {
    return passkey.deviceName?.trim() || 'Passkey';
}

export function PasskeysSection() {
    const supported = browserSupportsPasskeys();
    const { data: passkeys, isLoading } = usePasskeys({ enabled: supported });
    const addPasskey = useAddPasskey();
    const deletePasskey = useDeletePasskey();

    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral confirm-dialog target
    const [pendingDelete, setPendingDelete] = useState<PasskeyInfo | null>(null);

    const handleAdd = () => {
        addPasskey.mutate(undefined, {
            onSuccess: () => toast.success('Passkey added'),
            onError: (error) => errorToast(error.message, error),
        });
    };

    const handleConfirmDelete = () => {
        if (!pendingDelete) return;
        const target = pendingDelete;
        deletePasskey.mutate(
            { credentialId: target.credentialId },
            {
                onSuccess: () => {
                    toast.success('Passkey removed');
                    setPendingDelete(null);
                },
                onError: (error) => {
                    errorToast(error.message, error);
                    setPendingDelete(null);
                },
            }
        );
    };

    return (
        <ProfileSection title="Passkeys" icon={<Fingerprint className="h-5 w-5" />}>
            {!supported ? (
                <div className="px-4 py-3.5 text-sm text-muted-foreground">
                    This browser doesn&apos;t support passkeys.
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between px-4 py-3.5">
                        <p className="text-sm text-muted-foreground pr-3">
                            Sign in with Face ID, Touch ID, or your device PIN — no password needed.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAdd}
                            disabled={addPasskey.isPending}
                            className="shrink-0"
                        >
                            <Plus className="h-4 w-4" />
                            {addPasskey.isPending ? 'Adding…' : 'Add'}
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="px-4 py-3.5 space-y-2">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-5 w-28" />
                        </div>
                    ) : passkeys && passkeys.length > 0 ? (
                        passkeys.map((passkey) => {
                            const added = formatWhen(passkey.createdAt);
                            const used = formatWhen(passkey.lastUsedAt);
                            return (
                                <div
                                    key={passkey.credentialId}
                                    className="flex items-center justify-between px-4 py-3.5 gap-3"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {passkeyLabel(passkey)}
                                                {passkey.backedUp && (
                                                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                                                        synced
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {used ? `Last used ${used}` : added ? `Added ${added}` : 'Registered'}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => setPendingDelete(passkey)}
                                        aria-label={`Remove ${passkeyLabel(passkey)}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })
                    ) : (
                        <div className="px-4 py-3.5 text-sm text-muted-foreground">
                            No passkeys yet. Add one to sign in without a password.
                        </div>
                    )}
                </>
            )}

            <ConfirmDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => !open && setPendingDelete(null)}
                title="Remove passkey?"
                description={
                    pendingDelete
                        ? `"${passkeyLabel(pendingDelete)}" will no longer be able to sign in to your account.`
                        : ''
                }
                confirmText={deletePasskey.isPending ? 'Removing...' : 'Remove'}
                cancelText="Cancel"
                onConfirm={handleConfirmDelete}
                variant="destructive"
            />
        </ProfileSection>
    );
}
