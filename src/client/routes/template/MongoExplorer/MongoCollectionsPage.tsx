import { useDeferredValue, useMemo, useState } from 'react';
import { useRouter } from '@/client/features';
import { Alert, AlertDescription } from '@/client/components/template/ui/alert';
import { Badge } from '@/client/components/template/ui/badge';
import { Button } from '@/client/components/template/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/client/components/template/ui/card';
import { Input } from '@/client/components/template/ui/input';
import { LinearProgress } from '@/client/components/template/ui/linear-progress';
import { AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { useMongoCollections } from './hooks';
import { CenteredLoading } from './components/CenteredLoading';
import { EmptyState } from './components/EmptyState';
import { PageHeader } from './components/PageHeader';
import {
    DB_SIZE_LIMIT_BYTES,
    DB_SIZE_WARNING_THRESHOLD_PERCENT,
    formatBytes,
    formatCountLabel,
    formatLimitPercent,
    getCollectionPath,
} from './utils';

export function MongoCollectionsPage({
    dbName,
    collectionsQuery,
}: {
    dbName: string;
    collectionsQuery: ReturnType<typeof useMongoCollections>;
}) {
    const { navigate } = useRouter();
    const collections = collectionsQuery.data?.collections ?? [];
    const dbSizeBytes = collectionsQuery.data?.dbSizeBytes;
    const usagePercent =
        dbSizeBytes !== undefined
            ? Math.min(100, (dbSizeBytes / DB_SIZE_LIMIT_BYTES) * 100)
            : undefined;
    const isOverLimit = dbSizeBytes !== undefined && dbSizeBytes > DB_SIZE_LIMIT_BYTES;
    const isNearLimit =
        usagePercent !== undefined && usagePercent >= DB_SIZE_WARNING_THRESHOLD_PERCENT;
    const isLoadingCollections = collectionsQuery.isLoading && !collectionsQuery.data;
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral local filter input for the collection list page
    const [collectionQuery, setCollectionQuery] = useState('');
    const deferredCollectionQuery = useDeferredValue(collectionQuery);

    const filteredCollections = useMemo(() => {
        const query = deferredCollectionQuery.trim().toLowerCase();
        if (!query) {
            return collections;
        }

        return collections.filter((collection) =>
            collection.name.toLowerCase().includes(query)
        );
    }, [collections, deferredCollectionQuery]);

    return (
        <div className="mx-auto max-w-5xl px-2 py-4 pb-20 sm:px-4 sm:pb-6">
            <PageHeader
                title="MongoDB Explorer"
                description={`Browse collections in ${dbName}.`}
                breadcrumbs={[{ label: 'db' }]}
                actions={[
                    <Button
                        key="refresh"
                        variant="outline"
                        onClick={() => void collectionsQuery.refetch()}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>,
                ]}
            />

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Collections</CardTitle>
                    <CardDescription>
                        Open a collection to browse its documents.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={collectionQuery}
                            onChange={(event) => setCollectionQuery(event.target.value)}
                            placeholder="Filter collections"
                            className="pl-9"
                        />
                    </div>

                    <div className="space-y-2 rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span>
                                Current database:{' '}
                                <span className="font-mono text-foreground">{dbName}</span>
                            </span>
                            {dbSizeBytes !== undefined && (
                                <span>
                                    <span
                                        className={
                                            isOverLimit
                                                ? 'font-mono text-destructive'
                                                : 'font-mono text-foreground'
                                        }
                                    >
                                        {formatBytes(dbSizeBytes)}
                                    </span>{' '}
                                    / {formatBytes(DB_SIZE_LIMIT_BYTES)} (
                                    {formatLimitPercent(dbSizeBytes)})
                                </span>
                            )}
                        </div>
                        {usagePercent !== undefined && (
                            <LinearProgress
                                value={usagePercent}
                                className={isOverLimit ? '[&>span]:bg-destructive' : undefined}
                            />
                        )}
                    </div>

                    {isNearLimit && dbSizeBytes !== undefined && (
                        <Alert variant={isOverLimit ? 'destructive' : 'warning'}>
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <AlertDescription>
                                    {isOverLimit
                                        ? `Database is over the ${formatBytes(DB_SIZE_LIMIT_BYTES)} limit (${formatLimitPercent(dbSizeBytes)} used).`
                                        : `Database is at ${formatLimitPercent(dbSizeBytes)} of the ${formatBytes(DB_SIZE_LIMIT_BYTES)} limit. Consider cleaning up data.`}
                                </AlertDescription>
                            </div>
                        </Alert>
                    )}

                    {collectionsQuery.error && (
                        <Alert variant="destructive">
                            <AlertDescription>{collectionsQuery.error.message}</AlertDescription>
                        </Alert>
                    )}

                    {isLoadingCollections ? (
                        <CenteredLoading label="Loading collections" />
                    ) : filteredCollections.length === 0 ? (
                        <EmptyState
                            title="No collections found"
                            description={
                                collections.length === 0
                                    ? 'This database does not have any collections yet.'
                                    : 'No collections match the current filter.'
                            }
                        />
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {filteredCollections.map((collection) => (
                                <button
                                    key={collection.name}
                                    type="button"
                                    onClick={() => navigate(getCollectionPath(collection.name))}
                                    className="rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-base font-semibold">
                                                {collection.name}
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {formatCountLabel(collection.documentCount)} docs
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1">
                                            <Badge variant="secondary">
                                                {formatBytes(collection.sizeBytes)}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {formatLimitPercent(collection.sizeBytes)} of limit
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
