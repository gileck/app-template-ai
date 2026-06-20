import { Collection } from 'mongodb';
import { getDb } from '../../../connection';
import type { MongoUsageAlertBand, MongoUsageAlertState } from './types';

const COLLECTION_NAME = 'mongo_usage_alert';
const SINGLETON_ID = 'singleton' as const;

async function getMongoUsageAlertCollection(): Promise<Collection<MongoUsageAlertState>> {
    const db = await getDb();
    return db.collection<MongoUsageAlertState>(COLLECTION_NAME);
}

export async function getMongoUsageAlertBand(): Promise<MongoUsageAlertBand> {
    const collection = await getMongoUsageAlertCollection();
    const state = await collection.findOne({ _id: SINGLETON_ID });
    return state?.band ?? 'none';
}

export async function setMongoUsageAlertBand(band: MongoUsageAlertBand): Promise<void> {
    const collection = await getMongoUsageAlertCollection();
    await collection.updateOne(
        { _id: SINGLETON_ID },
        {
            $set: { band, updatedAt: new Date() },
            $setOnInsert: { _id: SINGLETON_ID },
        },
        { upsert: true }
    );
}
