/**
 * Shared helpers for the agent-admin handlers.
 */

import { listAllUsers } from '@/server/database/collections/template/users';
import type { AgentDateRange } from '@/server/database/collections/template/agentConversations/types';

/** Parse optional ISO date strings into a finder date range. Invalid
 *  dates are dropped (treated as absent). */
export function parseRange(req: {
    startDate?: string;
    endDate?: string;
}): AgentDateRange {
    const range: AgentDateRange = {};
    if (req.startDate) {
        const d = new Date(req.startDate);
        if (!Number.isNaN(d.getTime())) range.startDate = d;
    }
    if (req.endDate) {
        const d = new Date(req.endDate);
        if (!Number.isNaN(d.getTime())) range.endDate = d;
    }
    return range;
}

/** userId (string) → username, for resolving names in cross-user views. */
export async function buildUsernameMap(): Promise<Map<string, string>> {
    const users = await listAllUsers();
    const map = new Map<string, string>();
    for (const u of users) {
        map.set(u._id.toString(), u.username);
    }
    return map;
}
