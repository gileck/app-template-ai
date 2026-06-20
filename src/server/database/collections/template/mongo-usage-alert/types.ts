/**
 * Tracks which DB-usage alert bands the owner has already been notified about,
 * so the Telegram alert fires once per crossing (deduped) instead of on every
 * admin page load. `band` is the highest threshold currently armed:
 *   - 'none'  → usage < 80%, no alert active (re-arms the higher bands).
 *   - 'warn'  → usage has crossed ≥80% and the owner was notified.
 *   - 'over'  → usage has crossed ≥100% and the owner was notified.
 */
export type MongoUsageAlertBand = 'none' | 'warn' | 'over';

export interface MongoUsageAlertState {
    _id: 'singleton';
    band: MongoUsageAlertBand;
    updatedAt: Date;
}
