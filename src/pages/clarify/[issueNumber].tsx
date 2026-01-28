/**
 * Clarification Answer Page
 *
 * Standalone Next.js page for answering agent clarification questions.
 * Does NOT load the full app shell - minimal providers only.
 *
 * URL format: /clarify/:issueNumber?token=:token
 */

import { useRouter } from 'next/router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClarifyPage } from '@/client/components/clarify';
import Head from 'next/head';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

// Create a new QueryClient for this standalone page
function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000, // 1 minute
            },
        },
    });
}

export default function ClarifyIssuePage() {
    const router = useRouter();
    const { issueNumber, token } = router.query;

    // Create query client once per page mount
    const [queryClient] = useState(() => makeQueryClient());

    // Show loading while router is hydrating
    if (!router.isReady) {
        return (
            <>
                <Head>
                    <title>Loading... | Clarification</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </Head>
                <div className="min-h-screen bg-background flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </>
        );
    }

    // Validate required parameters
    if (!issueNumber || !token) {
        return (
            <>
                <Head>
                    <title>Invalid Request | Clarification</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </Head>
                <div className="min-h-screen bg-background p-4">
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                            <h1 className="text-lg font-semibold text-destructive">
                                Invalid Request
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Missing required parameters. Please use the link from Telegram.
                            </p>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    const issueNum = Number(issueNumber);
    const tokenStr = String(token);

    // Validate issue number is a valid number
    if (isNaN(issueNum) || issueNum <= 0) {
        return (
            <>
                <Head>
                    <title>Invalid Issue | Clarification</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </Head>
                <div className="min-h-screen bg-background p-4">
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                            <h1 className="text-lg font-semibold text-destructive">
                                Invalid Issue Number
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                The issue number must be a positive integer.
                            </p>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head>
                <title>Issue #{issueNum} | Clarification</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>
            <QueryClientProvider client={queryClient}>
                <div className="min-h-screen bg-background">
                    <ClarifyPage
                        issueNumber={issueNum}
                        token={tokenStr}
                    />
                </div>
            </QueryClientProvider>
        </>
    );
}
