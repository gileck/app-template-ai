import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { Label } from '@/client/components/template/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/client/components/template/ui/select';
import { Textarea } from '@/client/components/template/ui/textarea';
import {
    ArrowLeft,
    ChevronRight,
    Database,
    FileJson,
    Loader2,
    Pencil,
    RefreshCw,
    Save,
    Search,
} from 'lucide-react';
import type {
    MongoSerializedValue,
    MongoSerializedObject,
} from '@/apis/template/mongo-explorer/types';
import {
    useMongoCollections,
    useMongoDocument,
    useMongoDocuments,
    useMongoUpdateDocument,
} from './hooks';

const PAGE_SIZE = 25;
const ROOT_PATH = '/admin/mongo-explorer';
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

type DocumentFieldKind = 'objectId' | 'string' | 'number' | 'boolean' | 'date' | 'null' | 'json';

interface DocumentFieldDescriptor {
    key: string;
    kind: DocumentFieldKind;
    value: MongoSerializedValue;
}

interface EditableFieldState {
    kind: DocumentFieldKind;
    inputValue: string;
    error: string | null;
    readOnly: boolean;
}

function formatCountLabel(count: number): string {
    return count.toLocaleString();
}

function isPlainSerializedObject(value: MongoSerializedValue): value is MongoSerializedObject {
    return value !== null && !Array.isArray(value) && typeof value === 'object';
}

function isObjectIdValue(value: MongoSerializedValue): value is MongoSerializedObject & { $oid: string } {
    return isPlainSerializedObject(value) && Object.keys(value).length === 1 && typeof value.$oid === 'string';
}

function isDateValue(value: MongoSerializedValue): value is MongoSerializedObject & { $date: string } {
    return isPlainSerializedObject(value) && Object.keys(value).length === 1 && typeof value.$date === 'string';
}

function getFieldKind(value: MongoSerializedValue): DocumentFieldKind {
    if (isObjectIdValue(value)) {
        return 'objectId';
    }

    if (isDateValue(value)) {
        return 'date';
    }

    if (typeof value === 'string') {
        return 'string';
    }

    if (typeof value === 'number') {
        return 'number';
    }

    if (typeof value === 'boolean') {
        return 'boolean';
    }

    if (value === null) {
        return 'null';
    }

    return 'json';
}

function getFieldDescriptors(document: MongoSerializedObject): DocumentFieldDescriptor[] {
    return Object.entries(document).map(([key, value]) => ({
        key,
        kind: getFieldKind(value),
        value,
    }));
}

function toDateTimeLocalValue(isoValue: string): string {
    const parsedDate = new Date(isoValue);

    if (Number.isNaN(parsedDate.getTime())) {
        return isoValue;
    }

    const localDate = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(localValue: string): string | null {
    if (!localValue.trim()) {
        return null;
    }

    const parsedDate = new Date(localValue);
    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    return parsedDate.toISOString();
}

function getFieldInputValue(kind: DocumentFieldKind, value: MongoSerializedValue): string {
    switch (kind) {
        case 'objectId':
            return isObjectIdValue(value) ? value.$oid : '';
        case 'date':
            return isDateValue(value) ? toDateTimeLocalValue(value.$date) : '';
        case 'string':
            return typeof value === 'string' ? value : '';
        case 'number':
            return typeof value === 'number' ? String(value) : '';
        case 'boolean':
            return typeof value === 'boolean' ? String(value) : 'false';
        case 'null':
            return '';
        case 'json':
            return JSON.stringify(value, null, 2);
    }
}

function getDefaultInputValueForKind(kind: DocumentFieldKind): string {
    switch (kind) {
        case 'boolean':
            return 'false';
        case 'null':
            return '';
        default:
            return '';
    }
}

function createEditableFieldState(document: MongoSerializedObject): Record<string, EditableFieldState> {
    return Object.fromEntries(
        getFieldDescriptors(document).map((field) => [
            field.key,
            {
                kind: field.kind,
                inputValue: getFieldInputValue(field.kind, field.value),
                error: null,
                readOnly: field.key === '_id',
            },
        ])
    );
}

function parseFieldInput(
    kind: DocumentFieldKind,
    inputValue: string
): { value: MongoSerializedValue | null; error: string | null } {
    switch (kind) {
        case 'objectId': {
            if (!OBJECT_ID_PATTERN.test(inputValue.trim())) {
                return {
                    value: null,
                    error: 'ObjectId must be a 24-character hex string',
                };
            }

            return {
                value: { $oid: inputValue.trim() },
                error: null,
            };
        }
        case 'string':
            return { value: inputValue, error: null };
        case 'number': {
            if (!inputValue.trim()) {
                return { value: null, error: 'Number is required' };
            }

            const parsedNumber = Number(inputValue);
            if (!Number.isFinite(parsedNumber)) {
                return { value: null, error: 'Invalid number' };
            }

            return { value: parsedNumber, error: null };
        }
        case 'boolean': {
            if (inputValue !== 'true' && inputValue !== 'false') {
                return { value: null, error: 'Boolean must be true or false' };
            }

            return { value: inputValue === 'true', error: null };
        }
        case 'null':
            return { value: null, error: null };
        case 'date': {
            const isoDate = fromDateTimeLocalValue(inputValue);
            if (!isoDate) {
                return { value: null, error: 'Invalid date' };
            }

            return {
                value: { $date: isoDate },
                error: null,
            };
        }
        case 'json': {
            try {
                return {
                    value: JSON.parse(inputValue) as MongoSerializedValue,
                    error: null,
                };
            } catch (error) {
                return {
                    value: null,
                    error: error instanceof Error ? error.message : 'Invalid JSON',
                };
            }
        }
    }
}

function getFieldTypeLabel(kind: DocumentFieldKind): string {
    switch (kind) {
        case 'objectId':
            return 'ObjectId';
        case 'string':
            return 'String';
        case 'number':
            return 'Number';
        case 'boolean':
            return 'Boolean';
        case 'null':
            return 'Null';
        case 'date':
            return 'Date';
        case 'json':
            return 'JSON';
    }
}

function isLongString(value: string): boolean {
    return value.includes('\n') || value.length > 120;
}

function isFieldEditable(field: DocumentFieldDescriptor): boolean {
    return field.key !== '_id' && field.kind !== 'json';
}

function canFieldChangeType(field: DocumentFieldDescriptor): boolean {
    return field.kind === 'null';
}

function encodeRouteSegment(value: string): string {
    return encodeURIComponent(value);
}

function decodeRouteSegment(value?: string): string {
    if (!value) {
        return '';
    }

    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function getCollectionPath(collectionName: string): string {
    return `${ROOT_PATH}/${encodeRouteSegment(collectionName)}`;
}

function getDocumentPath(collectionName: string, documentKey: string): string {
    return `${getCollectionPath(collectionName)}/${encodeRouteSegment(documentKey)}`;
}

interface BreadcrumbItem {
    label: string;
    path?: string;
}

function BreadcrumbNav({ items }: { items: BreadcrumbItem[] }) {
    const { navigate } = useRouter();

    return (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {items.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
                    {index > 0 && <ChevronRight className="h-4 w-4" />}
                    {item.path ? (
                        <button
                            type="button"
                            className="min-w-0 break-all rounded px-1 py-0.5 text-left transition-colors hover:bg-muted hover:text-foreground"
                            onClick={() => navigate(item.path!)}
                        >
                            {item.label}
                        </button>
                    ) : (
                        <span className="min-w-0 break-all font-medium text-foreground">{item.label}</span>
                    )}
                </div>
            ))}
        </div>
    );
}

export function MongoExplorer() {
    const { routeParams } = useRouter();
    const collectionName = decodeRouteSegment(routeParams.collectionName);
    const documentKey = decodeRouteSegment(routeParams.documentKey);
    const isCollectionPage = collectionName.length > 0;
    const isDocumentPage = collectionName.length > 0 && documentKey.length > 0;

    const collectionsQuery = useMongoCollections();
    const dbName = collectionsQuery.data?.dbName ?? 'db';

    if (isDocumentPage) {
        return (
            <MongoDocumentPage
                collectionName={collectionName}
                documentKey={documentKey}
                onRefresh={() => {
                    void collectionsQuery.refetch();
                }}
            />
        );
    }

    if (isCollectionPage) {
        return (
            <MongoDocumentsPage
                collectionName={collectionName}
                onRefresh={() => {
                    void collectionsQuery.refetch();
                }}
            />
        );
    }

    return <MongoCollectionsPage dbName={dbName} collectionsQuery={collectionsQuery} />;
}

function MongoCollectionsPage({
    dbName,
    collectionsQuery,
}: {
    dbName: string;
    collectionsQuery: ReturnType<typeof useMongoCollections>;
}) {
    const { navigate } = useRouter();
    const collections = collectionsQuery.data?.collections ?? [];
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
                    <Button key="refresh" variant="outline" onClick={() => void collectionsQuery.refetch()}>
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

                    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        Current database:
                        {' '}
                        <span className="font-mono text-foreground">{dbName}</span>
                    </div>

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
                                                Browse documents
                                            </p>
                                        </div>
                                        <Badge variant="secondary">
                                            {formatCountLabel(collection.documentCount)}
                                        </Badge>
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

function MongoDocumentsPage({
    collectionName,
    onRefresh,
}: {
    collectionName: string;
    onRefresh: () => void;
}) {
    const { navigate } = useRouter();
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral pagination state for the collection document list
    const [page, setPage] = useState(1);

    useEffect(() => {
        setPage(1);
    }, [collectionName]);

    const documentsQuery = useMongoDocuments(
        {
            collection: collectionName,
            page,
            pageSize: PAGE_SIZE,
        },
        collectionName.length > 0
    );
    const documents = documentsQuery.data?.documents ?? [];
    const pagination = documentsQuery.data?.pagination;
    const isLoadingDocuments = documentsQuery.isLoading && !documentsQuery.data;

    return (
        <div className="mx-auto max-w-5xl px-2 py-4 pb-20 sm:px-4 sm:pb-6">
            <PageHeader
                title={collectionName}
                description="Documents in this collection."
                breadcrumbs={[
                    { label: 'db', path: ROOT_PATH },
                    { label: collectionName },
                ]}
                actions={[
                    <Button key="back" variant="outline" onClick={() => navigate(ROOT_PATH)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Collections
                    </Button>,
                    <Button
                        key="refresh"
                        variant="outline"
                        onClick={() => {
                            onRefresh();
                            void documentsQuery.refetch();
                        }}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>,
                ]}
            />

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="text-lg">Documents</CardTitle>
                            <CardDescription>
                                Select a document to open view/edit mode.
                            </CardDescription>
                        </div>
                        {pagination && (
                            <Badge variant="secondary">
                                {formatCountLabel(pagination.totalDocuments)} total
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {documentsQuery.error && (
                        <Alert variant="destructive">
                            <AlertDescription>{documentsQuery.error.message}</AlertDescription>
                        </Alert>
                    )}

                    {isLoadingDocuments ? (
                        <CenteredLoading label="Loading documents" />
                    ) : documents.length === 0 ? (
                        <EmptyState
                            title="No documents in this collection"
                            description="This collection exists, but it does not have any documents yet."
                        />
                    ) : (
                        <div className="space-y-3">
                            {documents.map((document) => (
                                <button
                                    key={document.documentKey}
                                    type="button"
                                    onClick={() => navigate(getDocumentPath(collectionName, document.documentKey))}
                                    className="w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold">
                                                {document.idLabel}
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {document.preview}
                                            </p>
                                        </div>
                                        <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                                Page {pagination.page} of {pagination.totalPages}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page <= 1}
                                    onClick={() => setPage((current) => current - 1)}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page >= pagination.totalPages}
                                    onClick={() => setPage((current) => current + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function MongoDocumentPage({
    collectionName,
    documentKey,
    onRefresh,
}: {
    collectionName: string;
    documentKey: string;
    onRefresh: () => void;
}) {
    const { navigate } = useRouter();
    const documentQuery = useMongoDocument(
        {
            collection: collectionName,
            documentKey,
        },
        collectionName.length > 0 && documentKey.length > 0
    );
    const updateDocumentMutation = useMongoUpdateDocument();
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral field-level editor state for the active document
    const [editableFields, setEditableFields] = useState<Record<string, EditableFieldState>>({});
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral currently edited field key for the document inspector
    const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);

    const document = documentQuery.data ?? null;
    const fieldDescriptors = useMemo(
        () => (document ? getFieldDescriptors(document.document) : []),
        [document]
    );
    const editingField = useMemo(
        () => fieldDescriptors.find((field) => field.key === editingFieldKey) ?? null,
        [editingFieldKey, fieldDescriptors]
    );

    useEffect(() => {
        if (!document) {
            setEditableFields({});
            setEditingFieldKey(null);
            return;
        }

        setEditableFields(createEditableFieldState(document.document));
        setEditingFieldKey(null);
    }, [document?.documentKey, document]);

    const handleBack = () => {
        if (editingFieldKey && !window.confirm('Discard unsaved field changes?')) {
            return;
        }

        navigate(getCollectionPath(collectionName));
    };

    const handleStartFieldEdit = (field: DocumentFieldDescriptor) => {
        if (!document || !isFieldEditable(field)) {
            return;
        }

        if (editingFieldKey && editingFieldKey !== field.key && !window.confirm('Discard unsaved field changes?')) {
            return;
        }

        setEditableFields((current) => ({
            ...current,
            [field.key]: {
                ...(current[field.key] ?? {
                    kind: field.kind,
                    inputValue: getFieldInputValue(field.kind, field.value),
                    error: null,
                    readOnly: field.key === '_id',
                }),
                inputValue: getFieldInputValue(field.kind, field.value),
                error: null,
            },
        }));
        setEditingFieldKey(field.key);
    };

    const handleCancelFieldEdit = () => {
        if (!editingField || !document) {
            setEditingFieldKey(null);
            return;
        }

        if (!window.confirm('Discard unsaved field changes?')) {
            return;
        }

        setEditableFields((current) => ({
            ...current,
            [editingField.key]: {
                ...(current[editingField.key] ?? {
                    kind: editingField.kind,
                    inputValue: '',
                    error: null,
                    readOnly: editingField.key === '_id',
                }),
                inputValue: getFieldInputValue(editingField.kind, editingField.value),
                error: null,
            },
        }));
        setEditingFieldKey(null);
    };

    const handleSaveField = async () => {
        if (!document || !editingField) {
            return;
        }

        const fieldState = editableFields[editingField.key];
        if (!fieldState) {
            return;
        }

        const parsedField = parseFieldInput(fieldState.kind, fieldState.inputValue);
        setEditableFields((current) => ({
            ...current,
            [editingField.key]: {
                ...fieldState,
                error: parsedField.error,
            },
        }));

        if (parsedField.error) {
            return;
        }

        const nextDocument: MongoSerializedObject = {
            ...document.document,
            [editingField.key]: parsedField.value as MongoSerializedValue,
        };

        const updatedDocument = await updateDocumentMutation.mutateAsync({
            collection: collectionName,
            documentKey: document.documentKey,
            document: nextDocument,
        });

        setEditableFields(createEditableFieldState(updatedDocument.document));
        setEditingFieldKey(null);
    };

    return (
        <div className="mx-auto max-w-5xl px-2 py-4 pb-20 sm:px-4 sm:pb-6">
            <PageHeader
                title={document?.idLabel || 'Document'}
                description={editingField ? `Editing ${editingField.key}` : 'View mode'}
                breadcrumbs={[
                    { label: 'db', path: ROOT_PATH },
                    { label: collectionName, path: getCollectionPath(collectionName) },
                    { label: document?.idLabel || 'document' },
                ]}
                actions={[
                    <Button key="back" variant="outline" onClick={handleBack} className="min-w-0">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Documents
                    </Button>,
                    <Button
                        key="refresh"
                        variant="outline"
                        className="min-w-0"
                        onClick={() => {
                            if (editingFieldKey && !window.confirm('Discard unsaved field changes?')) {
                                return;
                            }
                            onRefresh();
                            void documentQuery.refetch();
                        }}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>,
                ]}
            />

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <CardTitle className="break-all text-lg">
                                Document
                            </CardTitle>
                            <CardDescription>
                                Field-by-field viewer with type-specific rendering and per-field editing.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge
                                variant={editingField ? 'default' : 'secondary'}
                                className="max-w-full"
                            >
                                {editingField ? `Editing ${editingField.key}` : 'Viewing'}
                            </Badge>
                            {editingField && (
                                <Button variant="outline" onClick={handleCancelFieldEdit}>
                                    Cancel field edit
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {documentQuery.error && (
                        <Alert variant="destructive">
                            <AlertDescription>{documentQuery.error.message}</AlertDescription>
                        </Alert>
                    )}

                    {documentQuery.isLoading && !document ? (
                        <CenteredLoading label="Loading document" />
                    ) : !document ? (
                        <EmptyState
                            title="Document not found"
                            description="The requested document could not be loaded from this collection."
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                                Route:
                                {' '}
                                <span className="break-all font-mono text-foreground">
                                    db/{collectionName}/{document.idLabel}
                                </span>
                            </div>
                            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                                Schema validation is enforced per field. Non-null values keep their original type. Fields currently set to `null` can be changed to any supported value type from the app.
                            </div>
                            <div className="grid gap-4">
                                {fieldDescriptors.map((field) => (
                                    <DocumentFieldCard
                                        key={field.key}
                                        field={field}
                                        state={editableFields[field.key]}
                                        isEditing={editingFieldKey === field.key}
                                        isLocked={field.key === '_id'}
                                        isEditable={isFieldEditable(field)}
                                        canChangeType={canFieldChangeType(field)}
                                        isBusy={updateDocumentMutation.isPending}
                                        onStartEdit={() => handleStartFieldEdit(field)}
                                        onCancelEdit={handleCancelFieldEdit}
                                        onChangeKind={(nextKind) => {
                                            setEditableFields((current) => ({
                                                ...current,
                                                [field.key]: {
                                                    ...(current[field.key] ?? {
                                                        kind: nextKind,
                                                        inputValue: getDefaultInputValueForKind(nextKind),
                                                        error: null,
                                                        readOnly: field.key === '_id',
                                                    }),
                                                    kind: nextKind,
                                                    inputValue: getDefaultInputValueForKind(nextKind),
                                                    error: null,
                                                },
                                            }));
                                        }}
                                        onChange={(nextInputValue) => {
                                            setEditableFields((current) => ({
                                                ...current,
                                                [field.key]: {
                                                    ...(current[field.key] ?? {
                                                        kind: field.kind,
                                                        inputValue: nextInputValue,
                                                        error: null,
                                                        readOnly: field.key === '_id',
                                                    }),
                                                    inputValue: nextInputValue,
                                                    error: null,
                                                },
                                            }));
                                        }}
                                        onSave={() => void handleSaveField()}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function DocumentFieldCard({
    field,
    state,
    isEditing,
    isLocked,
    isEditable,
    canChangeType,
    isBusy,
    onStartEdit,
    onCancelEdit,
    onChangeKind,
    onChange,
    onSave,
}: {
    field: DocumentFieldDescriptor;
    state?: EditableFieldState;
    isEditing: boolean;
    isLocked: boolean;
    isEditable: boolean;
    canChangeType: boolean;
    isBusy: boolean;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onChangeKind: (nextKind: DocumentFieldKind) => void;
    onChange: (nextInputValue: string) => void;
    onSave: () => void;
}) {
    const effectiveState = state ?? {
        kind: field.kind,
        inputValue: getFieldInputValue(field.kind, field.value),
        error: null,
        readOnly: field.key === '_id',
    };

    return (
        <div className="overflow-hidden rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="break-all text-sm font-semibold">{field.key}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="max-w-full self-start">
                        {getFieldTypeLabel(field.kind)}
                    </Badge>
                    {isLocked ? (
                        <Badge variant="outline" className="max-w-full self-start">
                            locked
                        </Badge>
                    ) : !isEditable ? (
                        <Badge variant="outline" className="max-w-full self-start">
                            view only
                        </Badge>
                    ) : null}
                </div>
            </div>
            {isEditing ? (
                <div className="space-y-3">
                    <FieldEditorInput
                        state={effectiveState}
                        canChangeType={canChangeType}
                        onChangeKind={onChangeKind}
                        onChange={onChange}
                    />
                    {effectiveState.error && (
                        <p className="text-xs text-destructive">{effectiveState.error}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            onClick={onSave}
                            disabled={isBusy}
                        >
                            {isBusy ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Save field
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onCancelEdit}
                            disabled={isBusy}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <FieldValueDisplay kind={field.kind} value={field.value} />
                    {isEditable && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onStartEdit}
                        >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit field
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

function FieldValueDisplay({
    kind,
    value,
}: {
    kind: DocumentFieldKind;
    value: MongoSerializedValue;
}) {
    switch (kind) {
        case 'objectId':
            return (
                <div className="break-all rounded-xl border border-border bg-muted/20 px-3 py-2 font-mono text-sm">
                    {isObjectIdValue(value) ? value.$oid : ''}
                </div>
            );
        case 'string':
            return typeof value === 'string' && isLongString(value) ? (
                <div className="break-words whitespace-pre-wrap rounded-xl border border-border bg-muted/20 px-3 py-3 text-sm leading-6">
                    {value}
                </div>
            ) : (
                <div className="break-words rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm">
                    {typeof value === 'string' ? value : ''}
                </div>
            );
        case 'number':
            return (
                <div className="rounded-xl border border-border bg-muted/20 px-3 py-2 font-mono text-sm">
                    {typeof value === 'number' ? value.toLocaleString() : ''}
                </div>
            );
        case 'boolean':
            return (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-3">
                    <div
                        className={`h-2.5 w-2.5 rounded-full ${
                            value === true ? 'bg-success' : 'bg-muted-foreground'
                        }`}
                    />
                    <span className="font-mono text-sm">{String(value === true)}</span>
                </div>
            );
        case 'null':
            return (
                <div className="rounded-xl border border-dashed border-border bg-muted/10 px-3 py-3 font-mono text-sm text-muted-foreground">
                    null
                </div>
            );
        case 'date': {
            const isoValue = isDateValue(value) ? value.$date : '';
            const parsedDate = new Date(isoValue);

            return (
                <div className="space-y-2 rounded-xl border border-border bg-muted/20 px-3 py-3">
                    <p className="break-words text-sm">
                        {Number.isNaN(parsedDate.getTime())
                            ? isoValue
                            : parsedDate.toLocaleString()}
                    </p>
                    <p className="break-all font-mono text-xs text-muted-foreground">{isoValue}</p>
                </div>
            );
        }
        case 'json':
            return (
                <pre className="overflow-x-auto rounded-xl border border-border bg-muted/20 p-3 text-xs leading-6">
                    {JSON.stringify(value, null, 2)}
                </pre>
            );
    }
}

function FieldEditorInput({
    state,
    canChangeType,
    onChangeKind,
    onChange,
}: {
    state: EditableFieldState;
    canChangeType: boolean;
    onChangeKind: (nextKind: DocumentFieldKind) => void;
    onChange: (nextInputValue: string) => void;
}) {
    const typeSelector = canChangeType ? (
        <div className="space-y-2">
            <Label className="break-all text-sm font-semibold">Value type</Label>
            <Select
                value={state.kind}
                onValueChange={(value) => onChangeKind(value as DocumentFieldKind)}
                disabled={state.readOnly}
            >
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="null">Null</SelectItem>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="objectId">ObjectId</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
            </Select>
        </div>
    ) : null;

    if (state.kind === 'null') {
        return (
            <div className="space-y-3">
                {typeSelector}
                <div className="rounded-xl border border-dashed border-border bg-muted/10 px-3 py-3 font-mono text-sm text-muted-foreground">
                    null
                </div>
            </div>
        );
    }

    if (state.kind === 'string' && isLongString(state.inputValue)) {
        return (
            <div className="space-y-3">
                {typeSelector}
                <Textarea
                    value={state.inputValue}
                    onChange={(event) => onChange(event.target.value)}
                    className="min-h-[8rem]"
                    disabled={state.readOnly}
                />
            </div>
        );
    }

    if (state.kind === 'date') {
        return (
            <div className="space-y-2">
                {typeSelector}
                <Input
                    type="datetime-local"
                    value={state.inputValue}
                    onChange={(event) => onChange(event.target.value)}
                    disabled={state.readOnly}
                />
                {state.inputValue && (
                    <p className="font-mono text-xs text-muted-foreground">
                        {fromDateTimeLocalValue(state.inputValue) ?? 'Invalid date'}
                    </p>
                )}
            </div>
        );
    }

    if (state.kind === 'boolean') {
        return (
            <div className="space-y-2">
                {typeSelector}
                <Label className="break-all text-sm font-semibold">Boolean value</Label>
                <Select
                    value={state.inputValue}
                    onValueChange={onChange}
                    disabled={state.readOnly}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="true">true</SelectItem>
                        <SelectItem value="false">false</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {typeSelector}
            <Label className="break-all text-sm font-semibold">{state.kind === 'objectId' ? 'ObjectId value' : 'Value'}</Label>
            {state.kind === 'json' ? (
                <Textarea
                    value={state.inputValue}
                    onChange={(event) => onChange(event.target.value)}
                    className="min-h-[12rem] font-mono text-xs"
                    spellCheck={false}
                    disabled={state.readOnly}
                />
            ) : (
                <Input
                    type={state.kind === 'number' ? 'number' : 'text'}
                    value={state.inputValue}
                    onChange={(event) => onChange(event.target.value)}
                    disabled={state.readOnly}
                    className={state.kind === 'objectId' ? 'font-mono text-xs sm:text-sm' : undefined}
                    step={state.kind === 'number' ? 'any' : undefined}
                />
            )}
        </div>
    );
}

function PageHeader({
    title,
    description,
    breadcrumbs,
    actions,
}: {
    title: string;
    description: string;
    breadcrumbs: BreadcrumbItem[];
    actions: ReactNode[];
}) {
    return (
        <div className="mb-4 space-y-3">
            <BreadcrumbNav items={breadcrumbs} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                        <h1 className="min-w-0 break-all text-xl font-semibold">{title}</h1>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end [&>*]:flex-1 sm:[&>*]:flex-none">
                    {actions}
                </div>
            </div>
        </div>
    );
}

function CenteredLoading({ label }: { label: string }) {
    return (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {label}
        </div>
    );
}

function EmptyState({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-4 py-12 text-center">
            <FileJson className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-base font-medium">{title}</p>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
        </div>
    );
}
