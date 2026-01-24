#!/usr/bin/env tsx
import '../src/agents/shared/loadEnv';
import { getProjectManagementAdapter, STATUSES } from '../src/agents/shared';

async function main() {
    const adapter = getProjectManagementAdapter();
    await adapter.init();

    // Find issue #43
    const allItems = await adapter.listItems({});
    const issue43 = allItems.find(item => item.content?.number === 43);
    
    if (!issue43) {
        console.error('Issue #43 not found');
        process.exit(1);
    }

    console.log('Found issue #43:', issue43.content?.title);
    console.log('Current status:', issue43.status);
    console.log('Current phase:', issue43.implementationPhase);
    console.log('Review status:', issue43.reviewStatus);

    // Transition for phase 1/4 → phase 2/4
    console.log('\nTransitioning to phase 2/4...');
    
    // Increment phase
    await adapter.setImplementationPhase(issue43.id, '2/4');
    
    // Move to Ready for development
    await adapter.updateItemStatus(issue43.id, STATUSES.implementation);
    
    // Clear review status
    await adapter.clearItemReviewStatus(issue43.id);
    
    console.log('✅ Issue #43 transitioned successfully');
    console.log('   Status: PR Review → Ready for development');
    console.log('   Phase: 1/4 → 2/4');
    console.log('   Review Status: Cleared');
}

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
