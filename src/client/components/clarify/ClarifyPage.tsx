/**
 * Clarify Page Component
 *
 * Main page content for answering agent clarification questions.
 * Fetches clarification data and handles form submission.
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { QuestionAnswer } from '@/apis/clarification/types';
import { getClarification, submitAnswer } from '@/apis/clarification/client';
import { QuestionCard } from './QuestionCard';
import { SuccessState } from './SuccessState';
import { Button } from '@/client/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/client/components/ui/alert';

interface ClarifyPageProps {
    issueNumber: number;
    token: string;
}

export function ClarifyPage({ issueNumber, token }: ClarifyPageProps) {
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral form state for answers, not persisted or shared
    const [answers, setAnswers] = useState<Map<number, QuestionAnswer>>(new Map());
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral UI state for form submission status
    const [submitted, setSubmitted] = useState(false);

    // Fetch clarification data
    const {
        data: clarificationResponse,
        isLoading,
        error: fetchError,
    } = useQuery({
        queryKey: ['clarification', issueNumber, token],
        queryFn: async () => {
            const response = await getClarification({ issueNumber, token });
            if (response.data?.error) {
                throw new Error(response.data.error);
            }
            return response.data;
        },
        staleTime: Infinity, // Don't refetch - clarification won't change
        retry: false,
    });

    // Submit mutation
    const submitMutation = useMutation({
        mutationFn: async () => {
            const answerArray = Array.from(answers.values());
            const response = await submitAnswer({
                issueNumber,
                token,
                answers: answerArray,
            });
            if (response.data?.error) {
                throw new Error(response.data.error);
            }
            return response.data;
        },
        onSuccess: () => {
            setSubmitted(true);
        },
    });

    const handleAnswerChange = (answer: QuestionAnswer) => {
        setAnswers((prev) => {
            const next = new Map(prev);
            next.set(answer.questionIndex, answer);
            return next;
        });
    };

    const handleSubmit = () => {
        submitMutation.mutate();
    };

    // Check if all questions are answered
    const clarification = clarificationResponse?.clarification;
    const allAnswered = clarification?.questions.every(
        (_, index) => answers.has(index)
    ) ?? false;

    // Check if "Other" answers have text
    const otherAnswersValid = Array.from(answers.values()).every(
        (answer) => answer.selectedOption !== 'Other' || (answer.customText?.trim() ?? '').length > 0
    );

    const canSubmit = allAnswered && otherAnswersValid && !submitMutation.isPending;

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Error state
    if (fetchError || clarificationResponse?.error) {
        const errorMessage = fetchError?.message || clarificationResponse?.error || 'Unknown error';
        return (
            <div className="p-4 max-w-2xl mx-auto">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            </div>
        );
    }

    // No clarification found
    if (!clarification) {
        return (
            <div className="p-4 max-w-2xl mx-auto">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Not Found</AlertTitle>
                    <AlertDescription>
                        No clarification request found for issue #{issueNumber}.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Success state
    if (submitted) {
        return (
            <div className="p-4 max-w-2xl mx-auto">
                <SuccessState issueNumber={issueNumber} />
            </div>
        );
    }

    // No parsed questions - show raw content
    if (clarification.questions.length === 0) {
        return (
            <div className="p-4 max-w-2xl mx-auto space-y-4">
                <h1 className="text-xl font-bold">
                    Issue #{issueNumber}: {clarification.issueTitle}
                </h1>
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Unable to Parse Questions</AlertTitle>
                    <AlertDescription>
                        The clarification request could not be parsed into structured questions.
                        Please respond directly on GitHub.
                    </AlertDescription>
                </Alert>
                <div className="bg-muted p-4 rounded-md">
                    <pre className="whitespace-pre-wrap text-sm">
                        {clarification.rawContent}
                    </pre>
                </div>
            </div>
        );
    }

    // Main form
    return (
        <div className="p-4 pb-24 max-w-2xl mx-auto space-y-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-xl font-bold">
                    Issue #{issueNumber}
                </h1>
                <p className="text-muted-foreground">
                    {clarification.issueTitle}
                </p>
            </div>

            {/* Questions */}
            <div className="space-y-4">
                {clarification.questions.map((question, index) => (
                    <QuestionCard
                        key={index}
                        question={question}
                        questionIndex={index}
                        answer={answers.get(index)}
                        onAnswerChange={handleAnswerChange}
                    />
                ))}
            </div>

            {/* Submit error */}
            {submitMutation.error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Submission Failed</AlertTitle>
                    <AlertDescription>
                        {submitMutation.error.message}
                    </AlertDescription>
                </Alert>
            )}

            {/* Submit button (fixed at bottom on mobile) */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t sm:static sm:p-0 sm:bg-transparent sm:border-0">
                <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="w-full"
                    size="lg"
                >
                    {submitMutation.isPending ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        'Submit Answer'
                    )}
                </Button>
                {!allAnswered && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                        Please answer all questions to continue
                    </p>
                )}
            </div>
        </div>
    );
}
