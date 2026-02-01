#!/usr/bin/env npx ts-node
/**
 * Migration script to backfill source field for existing items
 * Run with: npx ts-node scripts/migrate-source-field.ts
 */

import * as dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config({ path: '.env.local' });

async function migrate() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error('MONGO_URI not set');
        process.exit(1);
    }

    const client = new MongoClient(uri);
    await client.connect();

    const dbName = process.env.MONGO_DB_NAME || 'app-template';
    const db = client.db(dbName);

    // Show counts first
    const frTotal = await db.collection('feature-requests').countDocuments();
    const rpTotal = await db.collection('reports').countDocuments();
    console.log('Feature requests total:', frTotal);
    console.log('Reports total:', rpTotal);

    // Backfill feature requests
    const fr = await db.collection('feature-requests').updateMany(
        { source: { $exists: false } },
        { $set: { source: 'ui' } }
    );
    console.log('Feature requests updated:', fr.modifiedCount);

    // Backfill reports
    const rp = await db.collection('reports').updateMany(
        { source: { $exists: false } },
        { $set: { source: 'ui' } }
    );
    console.log('Reports updated:', rp.modifiedCount);

    // Show sample
    const sampleFr = await db.collection('feature-requests').findOne({});
    if (sampleFr) console.log('Sample FR source:', sampleFr.source);
    const sampleRp = await db.collection('reports').findOne({});
    if (sampleRp) console.log('Sample Report source:', sampleRp.source);

    await client.close();
    process.exit(0);
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
