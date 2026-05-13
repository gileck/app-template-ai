import { Loader2, RotateCcw, ShieldCheck, Square } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/client/components/template/ui/card';
import { Button } from '@/client/components/template/ui/button';
import type { RpcConnectionView } from '@/apis/template/rpc-connections/types';
import { formatRemaining, useNow } from '../utils';
import { MetaList } from './MetaList';

interface Props {
  connection: RpcConnectionView;
  onStop: () => void;
  onRestart: () => void;
  isStopping: boolean;
  isRestarting: boolean;
}

export function ApprovedState({
  connection,
  onStop,
  onRestart,
  isStopping,
  isRestarting,
}: Props) {
  const now = useNow();
  const expiresAtMs = connection.expiresAt ? new Date(connection.expiresAt).getTime() : 0;
  const remaining = expiresAtMs - now;
  const busy = isStopping || isRestarting;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-success">
          <ShieldCheck className="h-5 w-5" />
          Connected
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          RPC calls are permitted. Connection expires in{' '}
          <span className="font-mono">{formatRemaining(remaining)}</span>.
        </p>
        <MetaList connection={connection} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onStop} disabled={busy} className="min-h-11">
            {isStopping ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Stopping…
              </>
            ) : (
              <>
                <Square className="mr-2 h-4 w-4" />
                Stop
              </>
            )}
          </Button>
          <Button onClick={onRestart} disabled={busy} className="min-h-11">
            {isRestarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Restarting…
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                Restart
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
