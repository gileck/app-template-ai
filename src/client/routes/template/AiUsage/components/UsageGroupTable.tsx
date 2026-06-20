import { Card, CardContent } from '@/client/components/template/ui/card';
import {
    formatUsd,
    formatTokens,
    formatNumber,
} from '@/client/features/template/agent-admin';
import type { AiUsageGroup } from '@/apis/template/agent-admin/types';

interface UsageGroupTableProps {
    title: string;
    /** Header label for the grouping key column (Model / Provider / Endpoint). */
    keyLabel: string;
    rows: AiUsageGroup[];
}

export function UsageGroupTable({ title, keyLabel, rows }: UsageGroupTableProps) {
    return (
        <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {title}
            </h2>
            <Card>
                <CardContent className="p-0">
                    {rows.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            No usage records yet.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                        <th className="px-4 py-3 font-medium">{keyLabel}</th>
                                        <th className="px-4 py-3 text-right font-medium">Calls</th>
                                        <th className="px-4 py-3 text-right font-medium">Tokens</th>
                                        <th className="px-4 py-3 text-right font-medium">Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => (
                                        <tr
                                            key={row.key}
                                            className="border-b border-border last:border-b-0"
                                        >
                                            <td className="px-4 py-3 font-mono text-foreground break-words">
                                                {row.key}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                                                {formatNumber(row.count)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                                                {formatTokens(row.tokens)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                                                {formatUsd(row.cost)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
