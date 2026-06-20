import { Card, CardContent } from '@/client/components/template/ui/card';
import {
    formatUsd,
    formatTokens,
    formatNumber,
} from '@/client/features/template/agent-admin';
import type { ModelUsageStat } from '@/apis/template/agent-admin/types';

export function ByModelTable({ rows }: { rows: ModelUsageStat[] }) {
    return (
        <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                By Model
            </h2>
            <Card>
                <CardContent className="p-0">
                    {rows.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            No agent turns in this period.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                        <th className="px-4 py-3 font-medium">Model</th>
                                        <th className="px-4 py-3 text-right font-medium">Turns</th>
                                        <th className="px-4 py-3 text-right font-medium">Cost</th>
                                        <th className="px-4 py-3 text-right font-medium">Tokens</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => (
                                        <tr
                                            key={row.modelId}
                                            className="border-b border-border last:border-b-0"
                                        >
                                            <td className="px-4 py-3 font-medium text-foreground break-words">
                                                {row.modelId}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                                                {formatNumber(row.turns)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                                                {formatUsd(row.cost)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                                                {formatTokens(row.inputTokens + row.outputTokens)}
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
