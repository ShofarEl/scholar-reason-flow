import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Database } from 'lucide-react';

const REQUIRED_TABLES = ['profiles', 'subscriptions', 'payment_history', 'trial_usage', 'subscription_usage', 'chats', 'chat_messages'];

export const DatabaseHealth: React.FC = () => {
  const [checking, setChecking] = React.useState(false);
  const [results, setResults] = React.useState<Record<string, boolean | null>>(() =>
    REQUIRED_TABLES.reduce((acc, t) => ({ ...acc, [t]: null }), {})
  );
  const [error, setError] = React.useState<string | null>(null);

  const runChecks = async () => {
    try {
      setChecking(true);
      setError(null);

      const next: Record<string, boolean> = {};
      for (const tbl of REQUIRED_TABLES) {
        // Call the server-side helper we created: table_exists
        const { data, error: rpcError } = await supabase.rpc('table_exists', { tbl_name: tbl });
        if (rpcError) {
          console.error(`Error checking ${tbl}:`, rpcError);
          next[tbl] = false;
        } else {
          // RPC returns boolean in data; guard for array/wrapped result
          const exists = (data === true) || (Array.isArray(data) && data[0] === true);
          next[tbl] = Boolean(exists);
        }
      }

      setResults(next);
    } catch (err: any) {
      console.error('Database health check failed:', err);
      setError(String(err?.message ?? err));
    } finally {
      setChecking(false);
    }
  };

  React.useEffect(() => {
    runChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <CardTitle>Database Health</CardTitle>
        </div>
        <CardDescription>Checks required tables and common schema items</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(results).map(([table, ok]) => (
            <div key={table} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="font-medium">{table}</div>
                <div className="text-sm text-muted-foreground">
                  {ok === null ? 'Pending' : ok ? 'Exists' : 'Missing'}
                </div>
              </div>
              <div>
                {ok === null && <span className="text-sm text-muted-foreground">Checking…</span>}
                {ok === true && <CheckCircle className="text-green-600" />}
                {ok === false && <XCircle className="text-red-600" />}
              </div>
            </div>
          ))}

          {error && <div className="text-destructive text-sm">{error}</div>}

          <div className="flex gap-2 mt-4">
            <Button onClick={runChecks} disabled={checking}>
              {checking ? 'Checking…' : 'Re-run Checks'}
            </Button>
            <Button variant="ghost" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DatabaseHealth;