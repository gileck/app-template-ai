import { Card, CardContent } from '@/client/components/template/ui/card';
import { Wrench } from 'lucide-react';
import { formatNumber, formatPercent } from '@/client/features/template/agent-admin';
import type { ToolReportRow } from '@/apis/template/agent-admin/types';

export function ToolReportTable({ rows }: { rows: ToolReportRow[] }) {
    return (
        <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Tool Reliability
            </h2>
            <Card>
                <CardContent className="p-0">
                    {rows.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-center">
                            <Wrench className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                No tool calls recorded yet.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                        <th className="px-4 py-3 font-medium">Tool</th>
                                        <th className="px-4 py-3 text-right font-medium">Calls</th>
                                        <th className="px-4 py-3 text-right font-medium">Success</th>
                                        <th className="px-4 py-3 text-right font-medium">Wrote</th>
                                        <th className="px-4 py-3 text-right font-medium">Trunc.</th>
                                        <th className="px-4 py-3 text-right font-medium">Incompl.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => {
                                        const healthy = row.results === 0 || row.successRate >= 0.9;
                                        return (
                                            <tr
                                                key={row.name}
                                                className="border-b border-border last:border-b-0"
                                            >
                                                <td className="px-4 py-3 font-mono text-foreground break-words">
                                                    {row.name}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                                                    {formatNumber(row.calls)}
                                                </td>
                                                <td
                                                    className={`px-4 py-3 text-right font-mono tabular-nums ${healthy ? 'text-foreground' : 'text-destructive'}`}
                                                >
                                                    {row.results === 0 ? '—' : formatPercent(row.successRate)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                                                    {formatNumber(row.wrote)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                                                    {formatNumber(row.truncated)}
                                                </td>
                                                <td
                                                    className={`px-4 py-3 text-right font-mono tabular-nums ${row.incomplete > 0 ? 'text-warning' : 'text-muted-foreground'}`}
                                                >
                                                    {formatNumber(row.incomplete)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
