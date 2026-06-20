import { Card, CardContent } from '@/client/components/template/ui/card';
import { Users } from 'lucide-react';
import { useRouter } from '@/client/features';
import { formatUsd, formatNumber } from '@/client/features/template/agent-admin';
import type { TopSpender } from '@/apis/template/agent-admin/types';

export function TopSpendersTable({ rows }: { rows: TopSpender[] }) {
    const { navigate } = useRouter();

    return (
        <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Top Spenders (agent turns)
            </h2>
            <Card>
                <CardContent className="p-0">
                    {rows.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-center">
                            <Users className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                No attributed agent spend yet.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                        <th className="px-4 py-3 font-medium">User</th>
                                        <th className="px-4 py-3 text-right font-medium">Turns</th>
                                        <th className="px-4 py-3 text-right font-medium">Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => (
                                        <tr
                                            key={row.userId}
                                            onClick={() => navigate(`/admin/users/${row.userId}`)}
                                            className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/50"
                                        >
                                            <td className="px-4 py-3 font-medium text-foreground break-words">
                                                {row.username}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                                                {formatNumber(row.turns)}
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
