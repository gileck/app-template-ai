import apiClient from '@/client/utils/apiClient';
import type { CacheResult } from '@/common/cache/types';
import {
    API_GET_DOCUMENT,
    API_LIST_COLLECTIONS,
    API_LIST_DOCUMENTS,
    API_UPDATE_DOCUMENT,
} from './index';
import type {
    GetMongoDocumentRequest,
    GetMongoDocumentResponse,
    ListMongoCollectionsResponse,
    ListMongoDocumentsRequest,
    ListMongoDocumentsResponse,
    UpdateMongoDocumentRequest,
    UpdateMongoDocumentResponse,
} from './types';

export async function listMongoCollections(): Promise<CacheResult<ListMongoCollectionsResponse>> {
    return apiClient.call(API_LIST_COLLECTIONS);
}

export async function listMongoDocuments(
    params: ListMongoDocumentsRequest
): Promise<CacheResult<ListMongoDocumentsResponse>> {
    return apiClient.call(API_LIST_DOCUMENTS, params);
}

export async function getMongoDocument(
    params: GetMongoDocumentRequest
): Promise<CacheResult<GetMongoDocumentResponse>> {
    return apiClient.call(API_GET_DOCUMENT, params);
}

export async function updateMongoDocument(
    params: UpdateMongoDocumentRequest
): Promise<CacheResult<UpdateMongoDocumentResponse>> {
    return apiClient.post(API_UPDATE_DOCUMENT, params);
}
