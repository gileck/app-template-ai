import { useUser } from '@/client/features';
import { Card, CardDescription, CardHeader, CardTitle } from '@/client/components/template/ui/card';
import { CheckSquare, Settings, FileText } from 'lucide-react';
import { useRouter } from '@/client/features';

export const Home = () => {
  const user = useUser();
  const { navigate } = useRouter();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          {user ? `Welcome, ${user.username}` : 'Welcome'}
        </h1>
        <p className="text-muted-foreground">
          What would you like to do today?
        </p>
      </div>

      <div className="grid gap-4">
        <Card
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => navigate('/todos')}
        >
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <CheckSquare className="h-8 w-8 text-primary" />
            <div>
              <CardTitle>Todos</CardTitle>
              <CardDescription>Manage your tasks and to-do items</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => navigate('/reports')}
        >
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <CardTitle>Reports</CardTitle>
              <CardDescription>View bug reports and feedback</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => navigate('/settings')}
        >
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <Settings className="h-8 w-8 text-primary" />
            <div>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Configure app preferences</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};
