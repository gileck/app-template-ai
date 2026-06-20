// Soft DB size limit (shared by the client usage UI and the server-side
// Telegram threshold alert). Fixed constant — no per-deployment config.
export const DB_SIZE_LIMIT_BYTES = 500 * 1024 * 1024;

// Usage at or above this percentage of the limit surfaces a warning banner
// and fires the deduped owner alert.
export const DB_SIZE_WARNING_THRESHOLD_PERCENT = 80;

type MongoSerializedPrimitive = string | number | boolean | null;

export interface MongoSerializedObject {
    [key: string]: MongoSerializedValue;
}

export type MongoSerializedValue =
    | MongoSerializedPrimitive
    | MongoSerializedObject
    | MongoSerializedValue[];

export interface MongoExplorerCollectionSummary {
    name: string;
    documentCount: number;
    sizeBytes: number;
}

export interface MongoExplorerDocumentSummary {
    documentKey: string;
    idLabel: string;
    preview: string;
    document: MongoSerializedObject;
}

export interface MongoExplorerPagination {
    page: number;
    pageSize: number;
    totalDocuments: number;
    totalPages: number;
}

export interface ListMongoCollectionsResponse {
    error?: string;
    dbName?: string;
    dbSizeBytes?: number;
    collections?: MongoExplorerCollectionSummary[];
}

export interface ListMongoDocumentsRequest {
    collection: string;
    page?: number;
    pageSize?: number;
}

export interface ListMongoDocumentsResponse {
    error?: string;
    collection?: string;
    documents?: MongoExplorerDocumentSummary[];
    pagination?: MongoExplorerPagination;
}

export interface GetMongoDocumentRequest {
    collection: string;
    documentKey: string;
}

export interface GetMongoDocumentResponse {
    error?: string;
    collection?: string;
    document?: MongoExplorerDocumentSummary;
}

export interface UpdateMongoDocumentRequest {
    collection: string;
    documentKey: string;
    document: MongoSerializedObject;
}

export interface UpdateMongoDocumentResponse {
    error?: string;
    document?: MongoExplorerDocumentSummary;
}

export interface DuplicateMongoDocumentRequest {
    collection: string;
    documentKey: string;
}

export interface DuplicateMongoDocumentResponse {
    error?: string;
    document?: MongoExplorerDocumentSummary;
}

export interface DeleteMongoDocumentRequest {
    collection: string;
    documentKey: string;
}

export interface DeleteMongoDocumentResponse {
    error?: string;
    deletedDocumentKey?: string;
}
