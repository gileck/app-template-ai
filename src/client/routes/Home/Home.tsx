import { useUser } from '@/client/features/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/client/components/ui/card';
import { Badge } from '@/client/components/ui/badge';
import { CheckCircle2, User } from 'lucide-react';

export const Home = () => {
  const { data: user, isLoading } = useUser();

  return (
    <div className="w-full p-4 space-y-4">
      <Card className="border-green-500/50 bg-green-500/10">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Preview Auto-Login Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading user info...</p>
          ) : user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{user.name || 'No name'}</span>
                <Badge variant="secondary">{user.email}</Badge>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                You are automatically logged in on this preview deployment!
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">Not logged in</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
