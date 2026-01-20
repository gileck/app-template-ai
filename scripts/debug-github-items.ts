#!/usr/bin/env tsx
/**
 * Debug script to inspect GitHub Projects items and their field values
 *
 * Usage:
 *   yarn tsx scripts/debug-github-items.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { GitHubProjectsAdapter } from '../src/server/project-management/adapters/github';
import { STATUSES } from '../src/server/project-management/config';

async function main() {
    console.log('🔍 Debugging GitHub Projects Items\n');

    const adapter = new GitHubProjectsAdapter();
    await adapter.init();

    console.log(`Fetching all items in status: "${STATUSES.implementation}"\n`);
    const items = await adapter.listItems({
        status: STATUSES.implementation,
        limit: 100
    });

    console.log(`Found ${items.length} total item(s) in "${STATUSES.implementation}" status\n`);
    console.log('='.repeat(80));

    for (const item of items) {
        console.log(`\nItem: ${item.content?.title || 'Untitled'}`);
        console.log(`  ID: ${item.id}`);
        console.log(`  Status: "${item.status}"`);
        console.log(`  Review Status: ${JSON.stringify(item.reviewStatus)} (type: ${typeof item.reviewStatus})`);
        console.log(`  Content Type: ${item.content?.type}`);
        console.log(`  Issue #: ${item.content?.number || 'N/A'}`);
        console.log(`  URL: ${item.content?.url || 'N/A'}`);

        console.log('\n  All Field Values:');
        for (const field of item.fieldValues) {
            console.log(`    - ${field.fieldName}: ${JSON.stringify(field.value)} (type: ${typeof field.value})`);
        }

        console.log('\n  Filter Result:');
        const passesFilter = !item.reviewStatus;
        console.log(`    !item.reviewStatus = ${passesFilter}`);
        if (!passesFilter) {
            console.log(`    ❌ Would be EXCLUDED by filter (reviewStatus is truthy)`);
        } else {
            console.log(`    ✅ Would be INCLUDED by filter (reviewStatus is falsy)`);
        }

        console.log('\n' + '-'.repeat(80));
    }

    console.log(`\n📊 Summary:`);
    console.log(`  Total items in "${STATUSES.implementation}": ${items.length}`);
    const itemsWithEmptyReviewStatus = items.filter(item => !item.reviewStatus);
    console.log(`  Items with empty Review Status: ${itemsWithEmptyReviewStatus.length}`);

    if (itemsWithEmptyReviewStatus.length > 0) {
        console.log(`\n✅ These items WOULD be processed by the agent:`);
        for (const item of itemsWithEmptyReviewStatus) {
            console.log(`  - ${item.content?.title || 'Untitled'} (#${item.content?.number || 'N/A'})`);
        }
    } else {
        console.log(`\n❌ No items would be processed (all have non-empty Review Status)`);
    }

    const itemsWithReviewStatus = items.filter(item => item.reviewStatus);
    if (itemsWithReviewStatus.length > 0) {
        console.log(`\n⚠️  These items are EXCLUDED because Review Status is not empty:`);
        for (const item of itemsWithReviewStatus) {
            console.log(`  - ${item.content?.title || 'Untitled'} (#${item.content?.number || 'N/A'})`);
            console.log(`    Review Status: ${JSON.stringify(item.reviewStatus)}`);
        }
    }
}

main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
