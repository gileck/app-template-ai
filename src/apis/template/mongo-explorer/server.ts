export * from './index';

import {
    API_GET_DOCUMENT,
    API_LIST_COLLECTIONS,
    API_LIST_DOCUMENTS,
    API_UPDATE_DOCUMENT,
} from './index';
import { getMongoDocumentHandler } from './handlers/getMongoDocument';
import { listMongoCollectionsHandler } from './handlers/listMongoCollections';
import { listMongoDocumentsHandler } from './handlers/listMongoDocuments';
import { updateMongoDocumentHandler } from './handlers/updateMongoDocument';

export const mongoExplorerApiHandlers = {
    [API_LIST_COLLECTIONS]: { process: listMongoCollectionsHandler },
    [API_LIST_DOCUMENTS]: { process: listMongoDocumentsHandler },
    [API_GET_DOCUMENT]: { process: getMongoDocumentHandler },
    [API_UPDATE_DOCUMENT]: { process: updateMongoDocumentHandler },
};
