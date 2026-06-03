/**
 * Sensitive Example Page (template demo)
 *
 * The route is gated at the ROUTER level via `requirePasskey` (see
 * `index.project.ts`) — so the page itself is just its content. Navigating here
 * shows a lock screen, and this is revealed only after a fresh passkey assertion
 * (Face ID / Touch ID / device PIN). Stays unlocked for 5 minutes.
 *
 * Requires the user to have a registered passkey (Profile → Passkeys).
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/client/components/template/ui/card';
import { ShieldCheck, KeyRound, CreditCard, FileLock2 } from 'lucide-react';

export function SensitiveExample() {
    return (
        <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 pb-20 sm:py-8">
            <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-success" />
                <h1 className="text-2xl font-bold text-foreground">Sensitive data</h1>
            </div>
            <p className="text-sm text-muted-foreground">
                You verified with your passkey, so this content is now visible. It will re-lock
                after 5 minutes or when you reload the app.
            </p>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        Billing
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                    <p className="text-muted-foreground">Account balance</p>
                    <p className="font-mono text-lg text-foreground">$ 12,480.55</p>
                    <p className="pt-2 text-muted-foreground">Card on file</p>
                    <p className="font-mono text-foreground">•••• •••• •••• 6411</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                        API key
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="break-all font-mono text-sm text-foreground select-all">
                        sk-live-7f3a9c2e1b8d4a6f0e5c9b2d7a1f4e8c
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <FileLock2 className="h-4 w-4 text-muted-foreground" />
                        How this works
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    This route is declared with{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-foreground">
                        requirePasskey
                    </code>{' '}
                    in <code className="rounded bg-muted px-1 py-0.5 text-foreground">index.project.ts</code>,
                    so the router gates it behind a fresh passkey assertion (verified server-side)
                    before rendering. Add{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-foreground">requirePasskey: true</code>{' '}
                    to any route to protect it — or wrap a section in{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-foreground">&lt;PasskeyGuard&gt;</code>{' '}
                    directly.
                </CardContent>
            </Card>
        </div>
    );
}
