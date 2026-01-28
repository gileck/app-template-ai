/**
 * Success State Component
 *
 * Displayed after successfully submitting clarification answers.
 */

import { CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/client/components/ui/card';

interface SuccessStateProps {
    issueNumber: number;
}

export function SuccessState({ issueNumber }: SuccessStateProps) {
    return (
        <Card className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30">
            <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                    <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-green-700 dark:text-green-300">
                            Answer Submitted!
                        </h2>
                        <p className="text-green-600 dark:text-green-400">
                            Your clarification has been posted to Issue #{issueNumber}.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            The agent will continue processing on the next workflow run.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
